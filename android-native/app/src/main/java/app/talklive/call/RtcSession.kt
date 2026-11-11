package app.talklive.call

import app.talklive.net.IceConfig
import kotlinx.coroutines.suspendCancellableCoroutine
import org.webrtc.AudioTrack
import org.webrtc.DataChannel
import org.webrtc.IceCandidate
import org.webrtc.MediaConstraints
import org.webrtc.MediaStream
import org.webrtc.PeerConnection
import org.webrtc.PeerConnectionFactory
import org.webrtc.RtpReceiver
import org.webrtc.SdpObserver
import org.webrtc.SessionDescription
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/** A snapshot of the call link, read from WebRTC stats a few times a second. */
data class LinkStats(
    val remoteLevel: Float,
    val rttMs: Int?,
    val packetsLost: Long,
    val packetsReceived: Long,
    val jitterMs: Int? = null,
    /** True when audio goes through a TURN relay rather than directly. */
    val relay: Boolean = false,
)

/** One audio-only peer connection to one stranger. */
class RtcSession(
    private val factory: PeerConnectionFactory,
    ice: IceConfig,
    private val listener: Listener,
    /** Live bands of the remote voice; shared so the screen keeps one flow across calls. */
    val spectrum: Spectrum = Spectrum(),
    noiseSuppression: Boolean = true,
) {
    interface Listener {
        fun onLocalCandidate(candidate: IceCandidate)
        fun onConnectionState(state: PeerConnection.PeerConnectionState)
    }

    private fun micSource(ns: Boolean) = factory.createAudioSource(
        MediaConstraints().apply {
            mandatory.add(MediaConstraints.KeyValuePair("googEchoCancellation", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("googNoiseSuppression", ns.toString()))
            mandatory.add(MediaConstraints.KeyValuePair("googAutoGainControl", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("googHighpassFilter", ns.toString()))
        },
    )
    private var audioSource = micSource(noiseSuppression)
    private var localTrack: AudioTrack = factory.createAudioTrack("mic", audioSource)
    private var muted = false
    private var sender: org.webrtc.RtpSender? = null
    private val pendingRemote = mutableListOf<IceCandidate>()
    private var remoteAudio: AudioTrack? = null

    // Relay-only with no relay server would either gather nothing or, if widened, leak IPs.
    private val relayOk = require(!ice.relayOnly || ice.servers.any { s -> s.urls.any { it.startsWith("turn", ignoreCase = true) } }) {
        "relay-only but no relay server"
    }
    private val pc: PeerConnection = requireNotNull(
        factory.createPeerConnection(
            PeerConnection.RTCConfiguration(ice.servers).apply {
                sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN
                iceTransportsType = if (ice.relayOnly) PeerConnection.IceTransportsType.RELAY else PeerConnection.IceTransportsType.ALL
                continualGatheringPolicy = PeerConnection.ContinualGatheringPolicy.GATHER_CONTINUALLY
                bundlePolicy = PeerConnection.BundlePolicy.MAXBUNDLE
                rtcpMuxPolicy = PeerConnection.RtcpMuxPolicy.REQUIRE
            },
            object : PeerConnection.Observer {
                override fun onIceCandidate(c: IceCandidate) = listener.onLocalCandidate(c)
                override fun onConnectionChange(s: PeerConnection.PeerConnectionState) = listener.onConnectionState(s)
                override fun onSignalingChange(s: PeerConnection.SignalingState) {}
                override fun onIceConnectionChange(s: PeerConnection.IceConnectionState) {}
                override fun onIceConnectionReceivingChange(b: Boolean) {}
                override fun onIceGatheringChange(s: PeerConnection.IceGatheringState) {}
                override fun onIceCandidatesRemoved(c: Array<out IceCandidate>) {}
                override fun onAddStream(s: MediaStream) {}
                override fun onRemoveStream(s: MediaStream) {}
                override fun onDataChannel(d: DataChannel) {}
                override fun onRenegotiationNeeded() {}
                override fun onAddTrack(r: RtpReceiver, s: Array<out MediaStream>) {
                    // The other person's voice feeds the live spectrum on the call screen.
                    (r.track() as? AudioTrack)?.let { t -> runCatching { t.addSink(spectrum); remoteAudio = t } }
                }
            },
        ),
    ) { "Could not create peer connection" }

    init {
        sender = pc.addTrack(localTrack, listOf("talklive"))
    }

    /** Noise suppression on or off, live: a fresh mic track replaces the old one, no renegotiation. */
    fun setNoiseSuppression(on: Boolean) = runCatching {
        val oldTrack = localTrack
        val oldSource = audioSource
        audioSource = micSource(on)
        localTrack = factory.createAudioTrack("mic", audioSource).also { it.setEnabled(!muted) }
        sender?.setTrack(localTrack, false)
        oldTrack.dispose(); oldSource.dispose()
    }

    val signalingState: PeerConnection.SignalingState get() = pc.signalingState()

    fun setMuted(muted: Boolean) {
        this.muted = muted
        localTrack.setEnabled(!muted)
    }

    suspend fun createOffer(): SessionDescription {
        val offer = sdp { pc.createOffer(it, audioConstraints()) }
        set { pc.setLocalDescription(it, offer) }
        return offer
    }

    suspend fun acceptOffer(offer: SessionDescription): SessionDescription {
        if (pc.signalingState() != PeerConnection.SignalingState.STABLE) {
            runCatching { set { pc.setLocalDescription(it, SessionDescription(SessionDescription.Type.ROLLBACK, "")) } }
        }
        set { pc.setRemoteDescription(it, offer) }
        flushRemoteCandidates()
        val answer = sdp { pc.createAnswer(it, audioConstraints()) }
        set { pc.setLocalDescription(it, answer) }
        return answer
    }

    suspend fun acceptAnswer(answer: SessionDescription) {
        if (pc.signalingState() != PeerConnection.SignalingState.HAVE_LOCAL_OFFER) return
        set { pc.setRemoteDescription(it, answer) }
        flushRemoteCandidates()
    }

    fun addRemoteCandidate(c: IceCandidate) {
        if (pc.remoteDescription == null) pendingRemote += c else pc.addIceCandidate(c)
    }

    suspend fun stats(): LinkStats = suspendCancellableCoroutine { cont ->
        pc.getStats { report ->
            var level = 0f
            var rtt: Int? = null
            var lost = 0L
            var received = 0L
            var jitter: Int? = null
            var localId: String? = null
            for (st in report.statsMap.values) {
                val m = st.members
                when (st.type) {
                    "inbound-rtp" -> if (m["kind"] == "audio") {
                        (m["audioLevel"] as? Number)?.let { level = it.toFloat() }
                        (m["packetsLost"] as? Number)?.let { lost = it.toLong() }
                        (m["packetsReceived"] as? Number)?.let { received = it.toLong() }
                        (m["jitter"] as? Number)?.let { jitter = (it.toDouble() * 1000).toInt() }
                    }
                    "candidate-pair" -> if (m["state"] == "succeeded" && m["nominated"] == true) {
                        (m["currentRoundTripTime"] as? Number)?.let { rtt = (it.toDouble() * 1000).toInt() }
                        localId = m["localCandidateId"] as? String
                    }
                }
            }
            val relay = localId?.let { report.statsMap[it]?.members?.get("candidateType") == "relay" } ?: false
            if (cont.isActive) cont.resume(LinkStats(level, rtt, lost, received, jitter, relay))
        }
    }

    fun close() {
        runCatching { remoteAudio?.removeSink(spectrum) }
        spectrum.reset()
        runCatching { pc.dispose() }
        runCatching { localTrack.dispose() }
        runCatching { audioSource.dispose() }
    }

    private fun flushRemoteCandidates() {
        pendingRemote.forEach { pc.addIceCandidate(it) }
        pendingRemote.clear()
    }

    private fun audioConstraints() = MediaConstraints().apply {
        mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveAudio", "true"))
        mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveVideo", "false"))
    }

    private suspend fun sdp(block: (SdpObserver) -> Unit): SessionDescription =
        suspendCancellableCoroutine { cont ->
            block(object : SdpObserver {
                override fun onCreateSuccess(d: SessionDescription) = cont.resume(d)
                override fun onCreateFailure(e: String?) = cont.resumeWithException(IllegalStateException(e))
                override fun onSetSuccess() {}
                override fun onSetFailure(e: String?) {}
            })
        }

    private suspend fun set(block: (SdpObserver) -> Unit): Unit =
        suspendCancellableCoroutine { cont ->
            block(object : SdpObserver {
                override fun onCreateSuccess(d: SessionDescription) {}
                override fun onCreateFailure(e: String?) {}
                override fun onSetSuccess() = cont.resume(Unit)
                override fun onSetFailure(e: String?) = cont.resumeWithException(IllegalStateException(e))
            })
        }
}
