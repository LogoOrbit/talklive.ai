package app.talklive.call

import android.util.Log
import android.content.Context
import app.talklive.data.IdentityStore
import dagger.hilt.android.qualifiers.ApplicationContext
import app.talklive.net.IceServerApi
import app.talklive.net.Partner
import app.talklive.net.ServerEvent
import app.talklive.net.TalkSocket
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import app.talklive.social.ChatMessage
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import org.json.JSONObject
import org.webrtc.IceCandidate
import org.webrtc.PeerConnection
import org.webrtc.SessionDescription
import javax.inject.Inject
import javax.inject.Singleton

sealed interface CallPhase {
    data object Idle : CallPhase
    data class Searching(val etaSeconds: Int? = null) : CallPhase
    data class Connecting(val partner: Partner) : CallPhase
    data class Connected(val partner: Partner, val sinceMs: Long) : CallPhase
}

sealed interface CallNotice {
    data class PartnerLeft(val name: String, val dropped: Boolean) : CallNotice
    data object Banned : CallNotice
    data class CallEnded(val name: String) : CallNotice
    data class Refused(val reason: String) : CallNotice
}

enum class LinkQuality { Good, Fair, Poor }

/** Voice call or text chat with a stranger. */
enum class CallMode(val wire: String) { Talk("talk"), Chat("chat") }

/** "How was it?" after a call ends, answered with thumbs up or down. */
data class RatePrompt(val token: String, val name: String)

/** A reaction to animate on the call screen. */
data class FloatingReaction(val type: String, val mine: Boolean, val id: Long = System.nanoTime())

data class CallState(
    val phase: CallPhase = CallPhase.Idle,
    val muted: Boolean = false,
    val partnerMuted: Boolean = false,
    val speakerOn: Boolean = true,
    val notice: CallNotice? = null,
    /** Media path wobbling (ICE disconnected); WebRTC is trying to recover. */
    val unstable: Boolean = false,
    /** A phone call or another app took the microphone. */
    val onHold: Boolean = false,
    val quality: LinkQuality = LinkQuality.Good,
    /** A call with a friend (started from Friends), not a random match. */
    val friendCall: Boolean = false,
    val mode: CallMode = CallMode.Talk,
    val partnerTyping: Boolean = false,
    /** The stranger switched to another app (text chat). */
    val partnerAway: Boolean = false,
    val heartSent: Boolean = false,
    /** Both sides tapped the heart. */
    val mutualHeart: Boolean = false,
    val ratePrompt: RatePrompt? = null,
    /** The call initiator hosts mini-games (decides the board). */
    val isHost: Boolean = false,
    /** The text-chat partner asked to switch to voice: their name. */
    val voiceInviteFrom: String? = null,
    /** We asked to switch to voice and are waiting. */
    val voiceInviteSent: Boolean = false,
    /** Set when the partner turned down switching to voice. */
    val voiceInviteDeclined: Boolean = false,
)

/**
 * The random voice-call loop: search, match, WebRTC handshake, next, end.
 * Mirrors the call flow in public/app.js so an app user and a website user
 * can be matched with each other. All state changes run on one thread.
 */
@OptIn(ExperimentalCoroutinesApi::class)
@Singleton
class CallManager @Inject constructor(
    private val socket: TalkSocket,
    private val iceApi: IceServerApi,
    private val rtc: RtcFactory,
    private val audio: AudioRouter,
    private val identity: IdentityStore,
    @ApplicationContext private val context: Context,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default.limitedParallelism(1))

    private val _state = MutableStateFlow(CallState())
    val state: StateFlow<CallState> = _state

    /** The stranger's voice level, 0..1, for the speaking ring. Separate so it can update often. */
    private val _remoteLevel = MutableStateFlow(0f)
    val remoteLevel: StateFlow<Float> = _remoteLevel
    private var statsJob: Job? = null

    /** Messages in the current text chat with a stranger. */
    private val _chat = MutableStateFlow<List<ChatMessage>>(emptyList())
    val chat: StateFlow<List<ChatMessage>> = _chat

    private val _reactions = MutableSharedFlow<FloatingReaction>(extraBufferCapacity = 16)
    val reactions: SharedFlow<FloatingReaction> = _reactions

    private var typingJob: Job? = null
    /** True while the server re-pairs a text chat as a voice call. */
    private var switchingToVoice = false
    private var lastTypingSent = 0L
    private var lastPartnerName = "them"

    private var session: RtcSession? = null
    private var initiator = false
    private var matchId = 0
    private var watchdog: Job? = null
    private val pendingSignals = mutableListOf<JSONObject>()

    init {
        scope.launch { socket.events.collect(::onEvent) }
        // A phone call takes the mic: hold this call (mic off) until it ends.
        scope.launch {
            audio.focusLost.collect { lost ->
                if (_state.value.phase == CallPhase.Idle) return@collect
                _state.update { it.copy(onHold = lost) }
                session?.setMuted(lost || _state.value.muted)
                socket.emit("mic-state", lost || _state.value.muted)
            }
        }
        // Plugging in or pairing a headset moves the call to it.
        scope.launch {
            audio.headset.drop(1).collect { connected ->
                if (_state.value.phase == CallPhase.Idle) return@collect
                val speaker = !connected
                audio.setSpeaker(speaker)
                _state.update { it.copy(speakerOn = speaker) }
            }
        }
        // After a reconnect the server has forgotten our search (and our call):
        // start searching again so a network blip never strands the user.
        scope.launch {
            socket.connected.drop(1).filter { it }.collect {
                val st = _state.value
                when {
                    st.phase == CallPhase.Idle -> Unit
                    // A friend call cannot be resumed by searching: end it.
                    st.friendCall && st.phase !is CallPhase.Searching -> {
                        teardown()
                        audio.stop()
                        val name = (st.phase as? CallPhase.Connected)?.partner?.username ?: (st.phase as? CallPhase.Connecting)?.partner?.username
                        _state.update { CallState(speakerOn = it.speakerOn, mode = it.mode, notice = CallNotice.CallEnded(name ?: "Your friend")) }
                    }
                    else -> { teardown(); search() }
                }
            }
        }
    }

    fun start(mode: CallMode = CallMode.Talk) = scope.launch {
        if (_state.value.phase != CallPhase.Idle) return@launch
        _state.update { it.copy(notice = null, muted = false, mode = mode) }
        if (mode == CallMode.Talk) audio.start(_state.value.speakerOn)
        search()
    }

    // --- Text chat ---------------------------------------------------------

    fun sendChat(text: String, replyTo: String? = null) = scope.launch {
        val body = text.trim().take(1000)
        if (body.isEmpty() || _state.value.phase !is CallPhase.Connected) return@launch
        val id = "a" + java.lang.Long.toString(System.nanoTime(), 36).takeLast(14)
        _chat.update { it + ChatMessage(id, mine = true, text = body, ts = System.currentTimeMillis(), replyTo = replyTo) }
        socket.emit("chat-message", JSONObject().put("text", body).put("id", id).apply { replyTo?.let { put("replyTo", it) } })
    }

    fun typing() {
        val now = System.currentTimeMillis()
        if (now - lastTypingSent < 2500) return
        lastTypingSent = now
        socket.emit("typing")
    }

    fun reactToMessage(id: String, emoji: String) = scope.launch {
        var on = true
        _chat.update { list ->
            list.map {
                if (it.id != id) it else {
                    on = it.myReaction != emoji
                    it.copy(myReaction = if (on) emoji else null)
                }
            }
        }
        socket.emit("chat-reaction", JSONObject().put("id", id).put("emoji", emoji).put("on", on))
    }

    // --- Voice call extras -------------------------------------------------

    /** like / laugh / clap / heart. */
    fun react(type: String) = scope.launch {
        if (_state.value.phase !is CallPhase.Connected) return@launch
        socket.emit("reaction", type)
        _reactions.tryEmit(FloatingReaction(type, mine = true))
        if (type == "heart") _state.update { it.copy(heartSent = true) }
    }

    fun rate(up: Boolean) = scope.launch {
        val p = _state.value.ratePrompt ?: return@launch
        socket.emit("rate-call", JSONObject().put("t", p.token).put("v", if (up) "up" else "down"))
        _state.update { it.copy(ratePrompt = null) }
    }

    /** The app went to the background or came back: a text-chat partner is told. */
    fun appVisible(visible: Boolean) = scope.launch {
        if (_state.value.mode == CallMode.Chat && _state.value.phase is CallPhase.Connected) {
            socket.emit("chat-away", JSONObject().put("away", !visible))
        }
    }

    /** Ask the text-chat partner to switch to a voice call. */
    fun inviteVoice() = scope.launch {
        if (_state.value.phase !is CallPhase.Connected || _state.value.mode != CallMode.Chat) return@launch
        socket.emit("voice-invite")
        _state.update { it.copy(voiceInviteSent = true, voiceInviteDeclined = false) }
    }

    fun answerVoiceInvite(accept: Boolean) = scope.launch {
        _state.update { it.copy(voiceInviteFrom = null) }
        socket.emit("voice-invite-respond", JSONObject().put("accept", accept))
    }

    fun clearVoiceInviteDeclined() = _state.update { it.copy(voiceInviteDeclined = false) }

    /** Plus: bring back the person just skipped, if they are still free. Returns null on success, else why not. */
    suspend fun undoSkip(): String? {
        val res = socket.ask("undo-skip") ?: return "gone"
        return if (res.optBoolean("ok")) null else res.optString("reason", "gone")
    }

    fun dismissRating() = _state.update { it.copy(ratePrompt = null) }
    fun dismissMutualHeart() = _state.update { it.copy(mutualHeart = false) }

    fun next() = scope.launch {
        if (_state.value.phase == CallPhase.Idle) return@launch
        teardown()
        socket.emit("skip")
        _state.update { it.copy(friendCall = false) }
        setPhase(CallPhase.Searching())
    }

    fun end() = scope.launch {
        teardown()
        socket.emit("leave")
        audio.stop()
        _state.update { CallState(speakerOn = it.speakerOn, mode = it.mode, ratePrompt = it.ratePrompt) }
    }

    fun report(reason: String) = scope.launch {
        if (_state.value.phase !is CallPhase.Connected && _state.value.phase !is CallPhase.Connecting) return@launch
        teardown()
        // The server blocks the pair and finds us someone new.
        socket.emit("report", JSONObject().put("reason", reason))
        setPhase(CallPhase.Searching())
    }

    fun toggleMute() = scope.launch {
        val muted = !_state.value.muted
        session?.setMuted(muted || _state.value.onHold)
        socket.emit("mic-state", muted)
        _state.update { it.copy(muted = muted) }
    }

    fun toggleSpeaker() = scope.launch {
        val on = !_state.value.speakerOn
        audio.setSpeaker(on)
        _state.update { it.copy(speakerOn = on) }
    }

    fun dismissNotice() = _state.update { it.copy(notice = null) }

    private fun search() {
        // Get everything a call needs ready while we wait for a match, so the
        // handshake can start the instant one arrives.
        scope.launch(Dispatchers.IO) { runCatching { iceApi.get() } }
        scope.launch(Dispatchers.Default) { runCatching { rtc.factory } }
        setPhase(CallPhase.Searching())
        socket.emit("find-partner", searchOpts())
    }

    private fun resetPartnerState() {
        typingJob?.cancel()
        _state.update { it.copy(partnerTyping = false, partnerAway = false, heartSent = false, mutualHeart = false) }
    }

    private suspend fun onEvent(e: ServerEvent) {
        val phase = _state.value.phase
        when (e) {
            is ServerEvent.Waiting -> if (phase is CallPhase.Searching) setPhase(CallPhase.Searching(e.estimatedSeconds))
            ServerEvent.NeedsRegister -> if (phase is CallPhase.Searching) {
                delay(800)
                socket.emit("find-partner", searchOpts())
            }
            is ServerEvent.Matched -> when {
                phase != CallPhase.Idle -> onMatched(e)
                // A friend call connects from idle: bring the call up.
                e.callback -> {
                    runCatching { CallService.start(context) }
                    _state.update { it.copy(notice = null, muted = false) }
                    audio.start(_state.value.speakerOn)
                    onMatched(e)
                }
            }
            is ServerEvent.Signal -> onSignal(e.data)
            is ServerEvent.PartnerMic -> _state.update { it.copy(partnerMuted = e.muted) }
            is ServerEvent.PartnerLeft -> if (!switchingToVoice && (phase is CallPhase.Connecting || phase is CallPhase.Connected)) {
                teardown()
                if (_state.value.friendCall) {
                    audio.stop()
                    _state.update { CallState(speakerOn = it.speakerOn, notice = CallNotice.CallEnded(e.username.ifBlank { "Your friend" })) }
                } else {
                    _state.update { it.copy(notice = CallNotice.PartnerLeft(e.username.ifBlank { "Stranger" }, e.reason != "left")) }
                    search()
                }
            }
            is ServerEvent.SearchRefused -> {
                teardown()
                audio.stop()
                _state.update { CallState(speakerOn = it.speakerOn, notice = CallNotice.Refused(e.reason)) }
            }
            ServerEvent.Banned -> {
                teardown()
                audio.stop()
                _state.update { CallState(notice = CallNotice.Banned) }
            }
            ServerEvent.Registered -> Unit
            is ServerEvent.StrangerMessage -> if (phase is CallPhase.Connected) {
                _chat.update { list ->
                    if (list.any { it.id == e.id }) list
                    else list + ChatMessage(e.id, mine = false, text = e.text, ts = e.ts, replyTo = e.replyTo, gifUrl = e.gifUrl)
                }
                typingJob?.cancel()
                _state.update { it.copy(partnerTyping = false) }
            }
            ServerEvent.StrangerTyping -> if (phase is CallPhase.Connected) {
                _state.update { it.copy(partnerTyping = true) }
                typingJob?.cancel()
                typingJob = scope.launch { delay(3500); _state.update { it.copy(partnerTyping = false) } }
            }
            is ServerEvent.StrangerReaction -> _chat.update { list ->
                list.map { if (it.id == e.id) it.copy(theirReaction = if (e.on) e.emoji else null) else it }
            }
            is ServerEvent.PartnerAway -> _state.update { it.copy(partnerAway = e.away) }
            is ServerEvent.Reaction -> if (phase is CallPhase.Connected) _reactions.tryEmit(FloatingReaction(e.type, mine = false))
            is ServerEvent.MutualHeart -> _state.update { it.copy(mutualHeart = true) }
            is ServerEvent.RatePrompt -> if (e.seconds >= 20) _state.update { it.copy(ratePrompt = RatePrompt(e.token, lastPartnerName)) }
            is ServerEvent.Game -> Unit
            is ServerEvent.VoiceInvite -> if (phase is CallPhase.Connected) _state.update { it.copy(voiceInviteFrom = e.username.ifBlank { "They" }) }
            is ServerEvent.VoiceInviteDeclined -> _state.update { it.copy(voiceInviteSent = false, voiceInviteDeclined = true) }
            is ServerEvent.VoiceInviteAccepted -> {
                // Both sides join with the token; the server re-pairs us as a voice call.
                switchingToVoice = true
                runCatching { CallService.start(context) }
                audio.start(_state.value.speakerOn)
                _state.update { it.copy(mode = CallMode.Talk, voiceInviteSent = false, voiceInviteFrom = null) }
                socket.emit("voice-invite-join", JSONObject().put("token", e.token))
                scope.launch { delay(15_000); switchingToVoice = false }
            }
            is ServerEvent.StrangerChatBlocked -> _chat.update { list ->
                // Mark the latest of our messages that has not been answered as not delivered.
                val i = list.indexOfLast { it.mine }
                if (i < 0) list else list.toMutableList().also {
                    it[i] = it[i].copy(status = app.talklive.social.MsgStatus.Failed, failReason = blockedText(e.reason))
                }
            }
        }
    }

    private fun blockedText(reason: String) = when (reason) {
        "link" -> "Links can't be sent"
        "unsafe" -> "This message isn't allowed"
        "rate", "flood" -> "You're sending messages too fast"
        else -> "Couldn't send"
    }

    private suspend fun onMatched(m: ServerEvent.Matched) {
        teardown()
        val id = ++matchId
        initiator = m.initiator
        switchingToVoice = false
        lastPartnerName = m.partner.username
        resetPartnerState()
        _chat.value = emptyList()
        _state.update {
            it.copy(partnerMuted = false, notice = null, friendCall = m.callback, ratePrompt = null, isHost = m.initiator,
                voiceInviteFrom = null, voiceInviteSent = false, voiceInviteDeclined = false)
        }
        // A text chat has no audio to set up: it is live the moment it matches.
        if (m.mode == "chat") {
            _state.update { it.copy(mode = CallMode.Chat) }
            setPhase(CallPhase.Connected(m.partner, System.currentTimeMillis()))
            return
        }
        _state.update { it.copy(mode = CallMode.Talk) }
        setPhase(CallPhase.Connecting(m.partner))

        val ice = iceApi.get()
        if (id != matchId) return // skipped while fetching
        val s = runCatching { RtcSession(rtc.factory, ice, object : RtcSession.Listener {
            override fun onLocalCandidate(candidate: IceCandidate) {
                socket.emit(
                    "signal",
                    JSONObject().put("type", "ice-candidate").put(
                        "candidate",
                        JSONObject()
                            .put("candidate", candidate.sdp)
                            .put("sdpMid", candidate.sdpMid)
                            .put("sdpMLineIndex", candidate.sdpMLineIndex),
                    ),
                )
            }

            override fun onConnectionState(state: PeerConnection.PeerConnectionState) {
                scope.launch { if (id == matchId) onConnectionState(state, m.partner) }
            }
        }) }.getOrElse {
            // WebRTC could not start on this device right now: move on rather than crash.
            Log.w(TAG, "peer connection failed", it)
            failAndRetry()
            return
        }
        session = s
        val silent = _state.value.muted || _state.value.onHold
        s.setMuted(silent)
        if (silent) socket.emit("mic-state", true)

        watchdog = scope.launch {
            delay(CONNECT_TIMEOUT_MS)
            if (id == matchId && _state.value.phase is CallPhase.Connecting) failAndRetry()
        }

        runCatching {
            if (initiator) socket.emit("signal", sdpJson(s.createOffer()))
            pendingSignals.toList().also { pendingSignals.clear() }.forEach { onSignal(it) }
        }.onFailure { Log.w(TAG, "handshake failed", it); failAndRetry() }
    }

    private suspend fun onSignal(data: JSONObject) {
        val s = session
        if (s == null) {
            if (_state.value.phase is CallPhase.Connecting && pendingSignals.size < 64) pendingSignals += data
            return
        }
        runCatching {
            when (data.optString("type")) {
                "offer" -> {
                    // Glare: the call initiator keeps its own outstanding offer.
                    if (initiator && s.signalingState != PeerConnection.SignalingState.STABLE) return
                    val sdp = data.getJSONObject("sdp").getString("sdp")
                    val answer = s.acceptOffer(SessionDescription(SessionDescription.Type.OFFER, sdp))
                    socket.emit("signal", sdpJson(answer))
                }
                "answer" -> s.acceptAnswer(
                    SessionDescription(SessionDescription.Type.ANSWER, data.getJSONObject("sdp").getString("sdp")),
                )
                "ice-candidate" -> {
                    val c = data.optJSONObject("candidate") ?: return
                    s.addRemoteCandidate(IceCandidate(c.optString("sdpMid", "0"), c.optInt("sdpMLineIndex", 0), c.getString("candidate")))
                }
            }
        }.onFailure { Log.w(TAG, "bad signal ${data.optString("type")}", it) }
    }

    private suspend fun onConnectionState(state: PeerConnection.PeerConnectionState, partner: Partner) {
        when (state) {
            PeerConnection.PeerConnectionState.CONNECTED -> {
                watchdog?.cancel()
                _state.update { it.copy(unstable = false) }
                if (_state.value.phase !is CallPhase.Connected) {
                    setPhase(CallPhase.Connected(partner, System.currentTimeMillis()))
                    startStats()
                }
            }
            PeerConnection.PeerConnectionState.DISCONNECTED -> _state.update { it.copy(unstable = true) }
            PeerConnection.PeerConnectionState.FAILED -> failAndRetry()
            else -> Unit
        }
    }

    /** Media never flowed: tell the server so it keeps this pair apart, then search again. */
    private fun failAndRetry() {
        teardown()
        socket.emit("skip", JSONObject().put("failed", true))
        setPhase(CallPhase.Searching())
    }

    /** Polls WebRTC stats: voice level for the ring, round-trip time and loss for the quality dot. */
    private fun startStats() {
        statsJob?.cancel()
        val s = session ?: return
        statsJob = scope.launch {
            var lastLost = 0L
            var lastReceived = 0L
            var tick = 0
            while (true) {
                val st = runCatching { s.stats() }.getOrNull()
                if (st != null) {
                    _remoteLevel.value = if (_state.value.partnerMuted) 0f else st.remoteLevel
                    // Quality every ~2 s, from loss and round trip over that window.
                    if (++tick % 8 == 0) {
                        val dl = st.packetsLost - lastLost
                        val dr = st.packetsReceived - lastReceived
                        lastLost = st.packetsLost
                        lastReceived = st.packetsReceived
                        val loss = if (dl + dr > 0) dl.toFloat() / (dl + dr) else 0f
                        val rtt = st.rttMs ?: 0
                        val q = when {
                            loss > 0.08f || rtt > 600 -> LinkQuality.Poor
                            loss > 0.02f || rtt > 300 -> LinkQuality.Fair
                            else -> LinkQuality.Good
                        }
                        _state.update { it.copy(quality = q) }
                    }
                }
                delay(250)
            }
        }
    }

    private fun teardown() {
        statsJob?.cancel()
        statsJob = null
        _remoteLevel.value = 0f
        _state.update { it.copy(unstable = false, quality = LinkQuality.Good) }
        matchId++
        watchdog?.cancel()
        watchdog = null
        pendingSignals.clear()
        session?.close()
        session = null
    }

    private fun searchOpts() = JSONObject().put("mode", _state.value.mode.wire).apply { identity.animal?.let { put("animal", it) } }

    private fun setPhase(p: CallPhase) = _state.update { it.copy(phase = p) }

    private fun sdpJson(d: SessionDescription): JSONObject {
        val type = d.type.canonicalForm()
        return JSONObject().put("type", type).put("sdp", JSONObject().put("type", type).put("sdp", d.description))
    }

    private companion object {
        const val TAG = "CallManager"
        const val CONNECT_TIMEOUT_MS = 20_000L
    }
}
