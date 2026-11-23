package app.talklive.voice

import android.content.Context
import app.talklive.net.TalkSocket
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import org.json.JSONArray
import org.json.JSONObject
import org.webrtc.audio.JavaAudioDeviceModule
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger
import javax.inject.Inject
import javax.inject.Singleton

/**
 * What the server says about this profile's Voice check (server/voice-check.js
 * view()), sent after every registration and every change. Only this person's
 * own device ever gets it.
 *   state   none | off | pending | confirmed | reviewed | unclear | mismatch
 *   appeal  none | open | granted | denied
 */
data class VoiceCheckView(
    val on: Boolean,
    val state: String,
    val disputed: Boolean = false,
    val retriesLeft: Int = 0,
    val appeal: String = "none",
    val calls: Int = 0,
) {
    /** The estimate does not back the gender they picked: offer "Check again". */
    val stuck: Boolean get() = state == "mismatch" || state == "unclear" || disputed
    /** And "Ask a person to review", when it is held against them and no review is open. */
    val canAppeal: Boolean get() = appeal != "open" && (state == "mismatch" || disputed)

    companion object {
        fun from(o: JSONObject) = VoiceCheckView(
            on = o.optBoolean("on"),
            state = o.optString("state", "pending"),
            disputed = o.optBoolean("disputed"),
            retriesLeft = o.optInt("retriesLeft"),
            appeal = o.optString("appeal", "none"),
            calls = o.optInt("calls"),
        )
    }
}

/**
 * Listens to this phone's own microphone during a call (never the partner),
 * through WebRTC's recorded-samples callback, for two things the website also
 * does in the browser:
 *  - Voice check (opt-in): in calls where the server asks for it (`matched`
 *    with `voice`), a summary of about 30 numbers describing this person's own
 *    voice ([VoiceFeatures]), sent as `voice-features`. The server makes the
 *    estimate; the phone never decides anything itself. Same cadence as
 *    public/voice-gender.js: the last 2048 samples every 50 ms, a first summary
 *    at 80 voiced frames, a longer one at 200 if the server asks for `more`.
 *  - Shouting: sustained loud voice, sent as a `moderation-alert`, which the
 *    server logs for moderators. Phones get the same signals as mobile web.
 * No audio is stored or sent.
 */
@Singleton
class MicMonitor(
    context: Context,
    private val socket: TalkSocket,
    prefsName: String,
) : JavaAudioDeviceModule.SamplesReadyCallback {
    @Inject constructor(@ApplicationContext context: Context, socket: TalkSocket) : this(context, socket, "voice_check")

    private val prefs = context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)

    // The switch lives on the server, so it follows the account between the
    // website and the app; the saved copy only covers the moment before the
    // server answers.
    private val _enabled = MutableStateFlow(prefs.getBoolean("on", true))
    val enabled: StateFlow<Boolean> = _enabled
    private val _view = MutableStateFlow<VoiceCheckView?>(null)
    /** The server's latest view of this profile's Voice check; null until it has said. */
    val view: StateFlow<VoiceCheckView?> = _view
    private val _genderHeld = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    /** "I am" was changed too often today; matching keeps the earlier choice until tomorrow. */
    val genderHeld: SharedFlow<Unit> = _genderHeld

    // A switch flipped while offline (or before registering) can reach the
    // server before it knows who this is, and be dropped. Until a view agrees
    // with it, say it again.
    @Volatile private var wanted: Boolean? = null

    init {
        // A male/female verdict older versions worked out on the phone. The
        // server ignores it now, so it should not linger here either.
        prefs.edit().remove("label").remove("confidence").apply()
        socket.on("voice-check") { args -> (args.firstOrNull() as? JSONObject)?.let(::onView) }
    }

    fun setEnabled(on: Boolean) {
        prefs.edit().putBoolean("on", on).apply()
        _enabled.value = on
        wanted = on
        if (!on) { _view.value = null; stopListening() }
        socket.emit("voice-check-set", JSONObject().put("on", on))
    }

    private fun onView(o: JSONObject) {
        val v = VoiceCheckView.from(o)
        val w = wanted
        if (w != null && v.on != w) {
            socket.emit("voice-check-set", JSONObject().put("on", w))
            return
        }
        wanted = null
        prefs.edit().putBoolean("on", v.on).apply()
        _enabled.value = v.on
        _view.value = v
        if (!v.on) stopListening()
        if (o.optBoolean("more")) more(o.optBoolean("again"))
        if (o.optBoolean("genderHeld")) _genderHeld.tryEmit(Unit)
    }

    /** "Check again": the server forgets its estimates. The reply is `{ok, reason?, retryAt?}`, or null offline. */
    suspend fun retry(): JSONObject? = socket.ask("voice-retry")

    /** "Ask a person to review". The reply is `{ok, reason?}`, or null offline. */
    suspend fun appeal(): JSONObject? = socket.askWith("voice-appeal", JSONObject())

    /** Previews and screenshots: a view as the server would send it. */
    internal fun seedForPreview(v: VoiceCheckView) { _enabled.value = v.on; _view.value = v }

    // --- Listening -------------------------------------------------------------

    @Volatile private var active = false
    @Volatile private var muted = false
    // Set while this call's voice summary is still being collected, so the
    // audio thread does nothing extra in every other call.
    @Volatile private var listening = false
    private val shout = ShoutDetector()
    private var lastShoutAlert = 0L

    // Audio thread: the latest BLOCK samples, and samples since the last block was taken.
    private val window = FloatArray(BLOCK)
    private var filled = 0
    private var sinceBlock = 0
    @Volatile private var resetWindow = false

    // Analysis runs on its own thread, never on WebRTC's audio thread, and only
    // that thread touches the fields below. A new call bumps the generation so
    // blocks still queued from the last call are dropped.
    private val worker = Executors.newSingleThreadExecutor { r -> Thread(r, "voice-check").apply { isDaemon = true } }
    private val generation = AtomicInteger()
    private var tracker: VoiceFeatures.Tracker? = null
    private var target = 0
    private var startedAt = 0L

    /** A call's audio is up. [voice]: the server asked this phone for a voice summary in this call. */
    fun start(voice: Boolean = false) {
        val gen = generation.incrementAndGet()
        spoken.set(0)
        val collect = voice && _enabled.value
        resetWindow = true
        listening = collect
        active = true
        worker.execute {
            if (gen != generation.get()) return@execute
            tracker = if (collect) VoiceFeatures.Tracker() else null
            target = FIRST
            startedAt = System.currentTimeMillis()
        }
    }

    fun stop() {
        active = false
        stopListening()
    }

    fun setMuted(m: Boolean) { muted = m }

    private val spoken = AtomicInteger()

    /** Milliseconds of this phone's own speech since the last call to this, 0..10000 (muted time never counts). */
    fun takeSpokenMs(): Int = spoken.getAndSet(0).coerceIn(0, 10_000)

    private fun stopListening() {
        listening = false
        val gen = generation.incrementAndGet()
        worker.execute { if (gen == generation.get()) { tracker = null; target = 0 } }
    }

    /**
     * The server asked for more: either it could not tell from the first
     * summary (send the longer one), or that summary could not be used -
     * `again` - because it came too early or while muted (send a fresh one
     * after a little more speech).
     */
    private fun more(again: Boolean) {
        val gen = generation.get()
        worker.execute {
            if (gen != generation.get()) return@execute
            val t = tracker ?: return@execute
            target = if (again) minOf(SECOND, t.voiced + 20) else SECOND
        }
    }

    override fun onWebRtcAudioRecordSamplesReady(samples: JavaAudioDeviceModule.AudioSamples) {
        if (!active) return
        if (muted) {
            // Nothing said while muted counts, and no block may straddle it.
            filled = 0; sinceBlock = 0
            return
        }
        val rate = samples.sampleRate
        val channels = samples.channelCount.coerceAtLeast(1)
        val shorts = ByteBuffer.wrap(samples.data).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer()
        val n = shorts.remaining() / channels
        val chunk = FloatArray(n) { shorts.get(it * channels) / 32768f }
        val now = System.currentTimeMillis()
        // Shouting, on every ~10 ms chunk.
        var sq = 0.0
        for (v in chunk) sq += v * v
        // Speech time for the anti-cheat reports: chunks above a quiet threshold count.
        if (Math.sqrt(sq / maxOf(1, n)) > SPEECH_RMS) spoken.addAndGet((n * 1000L / maxOf(1, rate)).toInt())
        shout.feed(Math.sqrt(sq / maxOf(1, n)), now)?.let { r ->
            if (now - lastShoutAlert > 60_000) {
                lastShoutAlert = now
                socket.emit("moderation-alert", JSONObject().put("type", "shouting").put("detail", "sustained RMS %.2f".format(r)).put("transcript", ""))
            }
        }
        if (!listening) return
        if (resetWindow) { resetWindow = false; filled = 0; sinceBlock = 0 }
        // Keep the last BLOCK samples (~43 ms at 48 kHz), as the website's analyser does.
        if (n >= BLOCK) chunk.copyInto(window, 0, n - BLOCK, n)
        else {
            System.arraycopy(window, n, window, 0, BLOCK - n)
            chunk.copyInto(window, BLOCK - n)
        }
        filled = minOf(BLOCK, filled + n)
        sinceBlock += n
        // One block every 50 ms of audio, like the website's 50 ms timer.
        val step = rate / 20
        if (filled < BLOCK || sinceBlock < step) return
        sinceBlock = if (sinceBlock >= 2 * step) 0 else sinceBlock - step
        val block = window.copyOf()
        val gen = generation.get()
        worker.execute { analyse(block, rate.toDouble(), gen) }
    }

    private fun analyse(block: FloatArray, rate: Double, gen: Int) {
        if (gen != generation.get()) return
        val t = tracker ?: return
        if (System.currentTimeMillis() - startedAt > MAX_RUN_MS) { tracker = null; listening = false; return }
        t.push(block, rate)
        if (target == 0 || t.voiced < target) return
        val summary = t.summary() ?: return
        val last = target == SECOND
        target = 0 // wait for the server's `more` before sending again
        if (_enabled.value) socket.emit("voice-features", summary.toJson())
        if (last) { tracker = null; listening = false }
    }

    companion object {
        const val BLOCK = 2048
        /** Chunk loudness (RMS of -1..1 samples, about -36 dBFS) above which a 10 ms chunk counts as speech. */
        const val SPEECH_RMS = 0.016
        /** Voiced frames in the first summary (~4 s of voiced speech), and in the longer one. */
        const val FIRST = 80
        const val SECOND = 200
        /** Give up quietly after 3 minutes of call. */
        const val MAX_RUN_MS = 3 * 60_000L

        /** The `voice-features` payload: `{v, n, f}`, with JSON null for values not measured. */
        fun VoiceFeatures.Summary.toJson(): JSONObject =
            JSONObject().put("v", v).put("n", n).put("f", JSONArray().apply { f.forEach { put(it ?: JSONObject.NULL) } })
    }
}
