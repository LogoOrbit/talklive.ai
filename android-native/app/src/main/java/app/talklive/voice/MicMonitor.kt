package app.talklive.voice

import android.content.Context
import app.talklive.net.TalkSocket
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.json.JSONObject
import org.webrtc.audio.JavaAudioDeviceModule
import java.nio.ByteBuffer
import java.nio.ByteOrder
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Listens to this phone's own microphone during a call (never the partner),
 * through WebRTC's recorded-samples callback, for two things the website also
 * does in the browser:
 *  - Voice check (opt-in): a male/female verdict, sent once as `voice-gender`.
 *  - Shouting: sustained loud voice, sent as a `moderation-alert`, which the
 *    server logs for moderators. Phones get the same signals as mobile web.
 * No audio is stored or sent.
 */
@Singleton
class MicMonitor @Inject constructor(
    @ApplicationContext context: Context,
    private val socket: TalkSocket,
) : JavaAudioDeviceModule.SamplesReadyCallback {
    private val prefs = context.getSharedPreferences("voice_check", Context.MODE_PRIVATE)

    init { socket.registerFields.add(::registerFields) }

    private val _enabled = MutableStateFlow(prefs.getBoolean("on", false))
    val enabled: StateFlow<Boolean> = _enabled
    private val _result = MutableStateFlow(prefs.getString("label", null))
    /** "male" / "female" once decided, while Voice check is on. */
    val result: StateFlow<String?> = _result

    fun setEnabled(on: Boolean) {
        prefs.edit().putBoolean("on", on).apply { if (!on) remove("label").remove("confidence") }.apply()
        _enabled.value = on
        if (!on) _result.value = null
        socket.register()
    }

    /** Extra registration fields: the server keeps the verdict for this connection only. */
    fun registerFields(o: JSONObject) {
        if (!_enabled.value) return
        o.put("voiceCheck", true)
        _result.value?.let { o.put("voiceGender", JSONObject().put("label", it).put("confidence", prefs.getFloat("confidence", 0.9f).toDouble())) }
    }

    @Volatile private var active = false
    @Volatile private var muted = false
    private var tracker: VoiceGender.Tracker? = null
    private val shout = ShoutDetector()
    private var lastShoutAlert = 0L
    private var startedAt = 0L
    private var window = FloatArray(0)
    private var filled = 0
    private var lastTick = 0L

    fun start() {
        synchronized(this) {
            tracker = if (_enabled.value && _result.value == null) VoiceGender.Tracker() else null
            startedAt = System.currentTimeMillis(); filled = 0; lastTick = 0
            active = true
        }
    }

    fun stop() { active = false }
    fun setMuted(m: Boolean) { muted = m }

    override fun onWebRtcAudioRecordSamplesReady(samples: JavaAudioDeviceModule.AudioSamples) {
        if (!active || muted) return
        val rate = samples.sampleRate
        val channels = samples.channelCount.coerceAtLeast(1)
        val shorts = ByteBuffer.wrap(samples.data).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer()
        val n = shorts.remaining() / channels
        val chunk = FloatArray(n) { shorts.get(it * channels) / 32768f }
        val now = System.currentTimeMillis()
        synchronized(this) {
            // Shouting, on every ~10 ms chunk.
            shout.feed(VoiceGender.rms(chunk), now)?.let { r ->
                if (now - lastShoutAlert > 60_000) {
                    lastShoutAlert = now
                    socket.emit("moderation-alert", JSONObject().put("type", "shouting").put("detail", "sustained RMS %.2f".format(r)).put("transcript", ""))
                }
            }
            val t = tracker ?: return
            if (now - startedAt > 3 * 60_000) { tracker = null; return }
            // Keep the last 2048 samples (~43 ms at 48 kHz, as on the web), analyse every 100 ms.
            if (window.size != 2048) { window = FloatArray(2048); filled = 0 }
            if (n >= window.size) { chunk.copyInto(window, 0, n - window.size, n); filled = window.size }
            else {
                System.arraycopy(window, n, window, 0, window.size - n)
                chunk.copyInto(window, window.size - n)
                filled = minOf(window.size, filled + n)
            }
            if (filled < window.size || now - lastTick < 100) return
            lastTick = now
            val factor = maxOf(1, Math.round(rate.toDouble() / VoiceGender.TARGET_RATE).toInt())
            val verdict = t.analyse(VoiceGender.decimate(window, factor), rate.toDouble() / factor) ?: return
            tracker = null
            if (!_enabled.value) return
            prefs.edit().putString("label", verdict.label).putFloat("confidence", verdict.confidence.toFloat()).apply()
            _result.value = verdict.label
            socket.emit("voice-gender", JSONObject().put("label", verdict.label).put("confidence", verdict.confidence))
        }
    }
}
