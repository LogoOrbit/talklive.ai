package app.talklive.voice

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

data class Playback(val id: String, val progress: Float, val playing: Boolean, val loading: Boolean = false)

/** Plays one voice message at a time, caching the audio on disk. */
@Singleton
class VoicePlayer @Inject constructor(@ApplicationContext private val context: Context) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var player: MediaPlayer? = null
    private var ticker: Job? = null

    private val _state = MutableStateFlow<Playback?>(null)
    val state: StateFlow<Playback?> = _state

    private fun cacheFile(id: String) = File(context.cacheDir, "vn_$id.m4a")

    /** Plays [id], fetching its audio with [load] the first time. Tapping the playing one pauses it. */
    fun toggle(id: String, load: suspend () -> ByteArray?) {
        val cur = _state.value
        val p = player
        if (cur?.id == id && p != null) {
            if (p.isPlaying) { p.pause(); _state.value = cur.copy(playing = false) } else { p.start(); _state.value = cur.copy(playing = true); tick() }
            return
        }
        stop()
        _state.value = Playback(id, 0f, playing = false, loading = true)
        scope.launch {
            val f = cacheFile(id)
            if (!f.exists()) {
                val bytes = kotlinx.coroutines.withContext(Dispatchers.IO) { load() }
                if (bytes == null) { _state.value = null; return@launch }
                f.writeBytes(bytes)
            }
            if (_state.value?.id != id) return@launch
            val mp = MediaPlayer()
            runCatching {
                mp.setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
                mp.setDataSource(f.absolutePath)
                mp.prepare()
                mp.setOnCompletionListener { stop() }
                mp.start()
                player = mp
                _state.value = Playback(id, 0f, playing = true)
                tick()
            }.onFailure { mp.release(); _state.value = null }
        }
    }

    fun stop() {
        ticker?.cancel()
        player?.let { runCatching { it.stop() }; it.release() }
        player = null
        _state.value = null
    }

    private fun tick() {
        ticker?.cancel()
        ticker = scope.launch {
            while (true) {
                val p = player ?: break
                val d = p.duration.coerceAtLeast(1)
                _state.value = _state.value?.copy(progress = p.currentPosition / d.toFloat())
                delay(100)
            }
        }
    }
}
