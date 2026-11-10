package app.talklive.sound

import android.content.Context
import android.media.AudioAttributes
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
import kotlin.math.sin

/**
 * TalkLive's sound effects, the same recipes as the website (public/app.js
 * SFX): bell-like notes with soft overtones and rising "bubbles", synthesised
 * here rather than shipped as files. Every sound is rendered once at start,
 * written to the cache folder and loaded into a SoundPool, so playing one is a
 * single call with no rendering and no audible delay.
 * On by default; Profile has a switch, like the website's Settings.
 */
@Singleton
class Sounds @Inject constructor(@ApplicationContext private val context: Context) {
    enum class Fx { Tap, Pop, PopSoft, Connect, Hangup, Message, Send, Turn, Move, Win, Invite, FriendAdded }

    /** [hz] for [dur] seconds at [vol], starting at [delay]. voice: b bell, s soft, p pluck, u bubble gliding to [hzTo]. */
    private data class Note(val hz: Double, val dur: Double, val vol: Double, val delay: Double = 0.0, val voice: Char = 'b', val hzTo: Double = 0.0)

    private val prefs = context.getSharedPreferences("ui", Context.MODE_PRIVATE)
    private val _enabled = MutableStateFlow(prefs.getBoolean("sounds", true))
    val enabled: StateFlow<Boolean> = _enabled
    fun setEnabled(on: Boolean) { prefs.edit().putBoolean("sounds", on).apply(); _enabled.value = on }
    private val _vibration = MutableStateFlow(prefs.getBoolean("vibration", true))
    /** Buzz when you connect or get a message. */
    val vibration: StateFlow<Boolean> = _vibration
    fun setVibration(on: Boolean) { prefs.edit().putBoolean("vibration", on).apply(); _vibration.value = on }

    private val watch = android.content.SharedPreferences.OnSharedPreferenceChangeListener { p, k ->
        when (k) { "sounds" -> _enabled.value = p.getBoolean(k, true); "vibration" -> _vibration.value = p.getBoolean(k, true) }
    }.also { prefs.registerOnSharedPreferenceChangeListener(it) }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val pool: android.media.SoundPool = android.media.SoundPool.Builder()
        .setMaxStreams(4)
        .setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
        .build()
    /** Fx -> SoundPool id, filled in as each one finishes loading. */
    private val ready = java.util.concurrent.ConcurrentHashMap<Fx, Int>()
    private val loading = java.util.concurrent.ConcurrentHashMap<Int, Fx>()
    @Volatile private var warmed = false

    private fun notes(fx: Fx): List<Note> = when (fx) {
        Fx.Tap -> listOf(Note(420.0, 0.055, 0.3, voice = 'u', hzTo = 980.0))
        Fx.Pop -> listOf(Note(380.0, 0.075, 0.5, voice = 'u', hzTo = 1150.0))
        Fx.PopSoft -> listOf(Note(520.0, 0.05, 0.34, voice = 'u', hzTo = 1350.0))
        Fx.Connect -> listOf(Note(392.0, 0.14, 0.2), Note(494.0, 0.14, 0.2, 0.07), Note(587.0, 0.38, 0.22, 0.14))
        Fx.Hangup -> listOf(Note(330.0, 0.16, 0.2, voice = 's'), Note(262.0, 0.3, 0.2, 0.13, 's'))
        Fx.Message -> listOf(Note(880.0, 0.09, 0.2), Note(1319.0, 0.3, 0.2, 0.07))
        Fx.Send -> listOf(Note(600.0, 0.05, 0.26, voice = 'u', hzTo = 1250.0))
        Fx.Turn -> listOf(Note(784.0, 0.1, 0.18, voice = 's'), Note(1047.0, 0.2, 0.18, 0.09, 's'))
        Fx.Move -> listOf(Note(700.0, 0.045, 0.22, voice = 'p'))
        Fx.Win -> listOf(Note(523.0, 0.12, 0.2), Note(659.0, 0.12, 0.2, 0.09), Note(784.0, 0.12, 0.2, 0.18), Note(1047.0, 0.42, 0.22, 0.27))
        Fx.Invite -> listOf(Note(587.0, 0.12, 0.2), Note(880.0, 0.28, 0.2, 0.1))
        Fx.FriendAdded -> listOf(Note(587.0, 0.1, 0.18), Note(784.0, 0.1, 0.18, 0.08), Note(988.0, 0.1, 0.18, 0.16), Note(1175.0, 0.4, 0.2, 0.24))
    }

    /** Renders and loads every sound ahead of time, so the first one is instant. */
    fun warm() {
        if (warmed) return
        warmed = true
        pool.setOnLoadCompleteListener { _, id, status -> if (status == 0) loading.remove(id)?.let { ready[it] = id } }
        scope.launch {
            runCatching {
                val dir = java.io.File(context.cacheDir, "sfx$VERSION").apply { mkdirs() }
                for (fx in Fx.values()) {
                    val f = java.io.File(dir, fx.name + ".wav")
                    if (!f.exists() || f.length() < 100) writeWav(f, render(notes(fx)))
                    val id = pool.load(f.absolutePath, 1)
                    loading[id] = fx
                }
            }
        }
    }

    /** Plays at once. Before the sounds have loaded (the first moments after launch) it stays quiet. */
    fun play(fx: Fx) {
        if (!_enabled.value) return
        if (!warmed) { warm(); return }
        ready[fx]?.let { pool.play(it, 1f, 1f, 1, 0, 1f) }
    }

    companion object {
        const val RATE = 44100
        /** Bump when a recipe changes, so the cached files are rendered again. */
        private const val VERSION = 2

        /** Mixes the notes exactly as the website's sfxRender does. */
        private fun render(notes: List<Note>): ShortArray {
            val total = notes.maxOf { it.delay + it.dur } + 0.02
            val out = FloatArray((total * RATE).toInt() + 1)
            for (nt in notes) {
                val start = (nt.delay * RATE).toInt()
                val n = (nt.dur * RATE).toInt()
                var ph = 0.0
                for (i in 0 until n) {
                    val t = i.toDouble() / RATE
                    val hz = if (nt.voice == 'u') nt.hz + (nt.hzTo - nt.hz) * (1 - exp(-t / (nt.dur * 0.35))) else nt.hz
                    ph += 2 * PI * hz / RATE
                    val w = when (nt.voice) {
                        'b' -> sin(ph) + 0.38 * sin(2 * ph) * exp(-t * 18) + 0.16 * sin(3.01 * ph) * exp(-t * 30)
                        'p' -> 2 / PI * kotlin.math.asin(sin(ph))
                        else -> sin(ph) + 0.15 * sin(2 * ph)
                    }
                    // 3 ms attack so nothing clicks; bells ring out, the rest fade faster.
                    val env = minOf(1.0, i / (0.003 * RATE)) * exp(-t * (if (nt.voice == 'b') 6.9 else 5.0) / nt.dur)
                    out[start + i] += (w * nt.vol * env).toFloat()
                }
            }
            val peak = out.maxOf { abs(it) }.coerceAtLeast(1f)
            return ShortArray(out.size) { (out[it] / peak * 32767 * 0.95f).toInt().toShort() }
        }

        /** 16-bit mono PCM as a WAV file, which is what SoundPool loads. */
        private fun writeWav(file: java.io.File, pcm: ShortArray) {
            val data = java.nio.ByteBuffer.allocate(44 + pcm.size * 2).order(java.nio.ByteOrder.LITTLE_ENDIAN)
            data.put("RIFF".toByteArray()).putInt(36 + pcm.size * 2).put("WAVE".toByteArray())
            data.put("fmt ".toByteArray()).putInt(16).putShort(1).putShort(1).putInt(RATE).putInt(RATE * 2).putShort(2).putShort(16)
            data.put("data".toByteArray()).putInt(pcm.size * 2)
            for (v in pcm) data.putShort(v)
            file.writeBytes(data.array())
        }
    }
}

/**
 * The app-wide tap sound, reachable from any composable without plumbing:
 * buttons, tabs and switches call [pop] or [soft].
 */
object Tap {
    @Volatile var sounds: Sounds? = null
    fun pop() { sounds?.play(Sounds.Fx.Pop) }
    fun soft() { sounds?.play(Sounds.Fx.PopSoft) }
}
