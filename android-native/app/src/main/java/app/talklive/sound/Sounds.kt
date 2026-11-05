package app.talklive.sound

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.exp
import kotlin.math.ln
import kotlin.math.sin

/**
 * The website's sound effects (public/app.js playTone and friends): short
 * synthesised tones, same notes and timings, rendered once and cached.
 * On by default; Profile has a switch, like the website's Settings.
 */
@Singleton
class Sounds @Inject constructor(@ApplicationContext context: Context) {
    enum class Fx { Tap, Connect, Hangup, Message, Send, Turn, Move, Win, Invite, FriendAdded }

    private data class Tone(val freq: Double, val dur: Double, val wave: Char, val vol: Double, val delay: Double = 0.0)

    private val prefs = context.getSharedPreferences("ui", Context.MODE_PRIVATE)
    private val _enabled = MutableStateFlow(prefs.getBoolean("sounds", true))
    val enabled: StateFlow<Boolean> = _enabled
    fun setEnabled(on: Boolean) { prefs.edit().putBoolean("sounds", on).apply(); _enabled.value = on }
    private val _vibration = MutableStateFlow(prefs.getBoolean("vibration", true))
    /** Buzz when you connect or get a message. */
    val vibration: StateFlow<Boolean> = _vibration
    fun setVibration(on: Boolean) { prefs.edit().putBoolean("vibration", on).apply(); _vibration.value = on }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val cache = HashMap<Fx, ShortArray>()

    private fun tones(fx: Fx): List<Tone> = when (fx) {
        Fx.Tap -> listOf(Tone(520.0, 0.08, 'q', 0.12))
        Fx.Connect -> listOf(Tone(660.0, 0.12, 's', 0.18), Tone(880.0, 0.15, 's', 0.18, 0.12))
        Fx.Hangup -> listOf(Tone(320.0, 0.2, 's', 0.18), Tone(220.0, 0.25, 's', 0.18, 0.15))
        Fx.Message -> listOf(Tone(1245.0, 0.06, 't', 0.15), Tone(1661.0, 0.20, 's', 0.15, 0.06))
        Fx.Send -> listOf(Tone(660.0, 0.05, 's', 0.14), Tone(990.0, 0.07, 's', 0.13, 0.04))
        Fx.Turn -> listOf(Tone(784.0, 0.1, 's', 0.16), Tone(1046.0, 0.13, 's', 0.15, 0.1))
        Fx.Move -> listOf(Tone(660.0, 0.05, 't', 0.13))
        Fx.Win -> listOf(523.0, 659.0, 784.0, 1046.0).mapIndexed { i, f -> Tone(f, 0.16, 's', 0.17, i * 0.11) }
        Fx.Invite -> listOf(Tone(880.0, 0.09, 's', 0.15), Tone(1174.0, 0.11, 's', 0.14, 0.09))
        Fx.FriendAdded -> listOf(Tone(587.0, 0.11, 's', 0.17), Tone(784.0, 0.11, 's', 0.16, 0.10), Tone(1175.0, 0.26, 't', 0.15, 0.20))
    }

    fun play(fx: Fx) {
        if (!_enabled.value) return
        scope.launch {
            runCatching {
                val pcm = cache.getOrPut(fx) { render(tones(fx)) }
                val track = AudioTrack.Builder()
                    .setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
                    .setAudioFormat(AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_16BIT).setSampleRate(RATE).setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build())
                    .setTransferMode(AudioTrack.MODE_STATIC)
                    .setBufferSizeInBytes(pcm.size * 2)
                    .build()
                track.write(pcm, 0, pcm.size)
                track.setNotificationMarkerPosition(pcm.size - 1)
                track.setPlaybackPositionUpdateListener(object : AudioTrack.OnPlaybackPositionUpdateListener {
                    override fun onMarkerReached(t: AudioTrack) { t.release() }
                    override fun onPeriodicNotification(t: AudioTrack) {}
                })
                track.play()
            }
        }
    }

    companion object {
        const val RATE = 44100

        /** Mixes oscillators with an exponential fade to silence, as the Web Audio graph does. */
        private fun render(tones: List<Tone>): ShortArray {
            val total = tones.maxOf { it.delay + it.dur + 0.02 }
            val out = FloatArray((total * RATE).toInt() + 1)
            for (t in tones) {
                val start = (t.delay * RATE).toInt()
                val n = (t.dur * RATE).toInt()
                val k = ln(t.vol / 0.0001) / n
                for (i in 0 until n) {
                    val ph = 2 * PI * t.freq * i / RATE
                    val w = when (t.wave) {
                        'q' -> if (sin(ph) >= 0) 1.0 else -1.0
                        't' -> 2 / PI * kotlin.math.asin(sin(ph))
                        else -> sin(ph)
                    }
                    // 3 ms attack so the start does not click.
                    val attack = minOf(1.0, i / (0.003 * RATE))
                    out[start + i] += (w * t.vol * exp(-k * i) * attack).toFloat()
                }
            }
            val peak = out.maxOf { abs(it) }.coerceAtLeast(1f)
            return ShortArray(out.size) { (out[it] / peak.coerceAtLeast(1f) * 32767 * 0.9f).toInt().toShort() }
        }
    }
}
