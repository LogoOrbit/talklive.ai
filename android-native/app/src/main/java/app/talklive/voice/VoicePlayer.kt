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
import kotlinx.coroutines.withContext
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

    init {
        scope.launch(Dispatchers.IO) { pruneCache() }
    }

    private fun cacheFile(id: String) = File(context.cacheDir, "vn_$id.m4a")

    /** Keeps the voice cache under [MAX_CACHE_BYTES], dropping the oldest files first. */
    private fun pruneCache() = runCatching {
        val files = context.cacheDir.listFiles { f -> f.name.startsWith("vn_") } ?: return@runCatching
        // Nothing is being written yet at startup, so leftover .tmp files are from a crash.
        files.filter { it.name.endsWith(".tmp") }.forEach { it.delete() }
        val cached = files.filter { it.name.endsWith(".m4a") }.sortedBy { it.lastModified() }
        var total = cached.sumOf { it.length() }
        for (f in cached) {
            if (total <= MAX_CACHE_BYTES) break
            val len = f.length()
            if (f.delete()) total -= len
        }
    }

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
            val ready = withContext(Dispatchers.IO) {
                if (f.exists()) return@withContext true
                val bytes = load() ?: return@withContext false
                // Write to a temp name and rename, so a crash mid-write never leaves a
                // truncated file that a later tap would trust as a cache hit.
                val tmp = File(f.parentFile, f.name + ".tmp")
                runCatching { tmp.writeBytes(bytes) }.isSuccess && (tmp.renameTo(f) || run { tmp.delete(); false })
            }
            if (!ready) { if (_state.value?.id == id) _state.value = null; return@launch }
            if (_state.value?.id != id) return@launch
            val mp = MediaPlayer()
            runCatching {
                mp.setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
                mp.setDataSource(f.absolutePath)
                withContext(Dispatchers.IO) { mp.prepare() }
                // Another message was tapped (or stop() called) while preparing.
                if (_state.value?.id != id) { mp.release(); return@launch }
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

    private companion object {
        const val MAX_CACHE_BYTES = 20L * 1024 * 1024
    }
}
