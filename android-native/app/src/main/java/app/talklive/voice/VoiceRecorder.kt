package app.talklive.voice

import android.content.Context
import android.media.MediaRecorder
import android.os.Build
import java.io.File

/** Records a voice message: mono AAC in an MP4 container (audio/mp4), up to 60 s. */
class VoiceRecorder(private val context: Context) {
    private var recorder: MediaRecorder? = null
    private var file: File? = null
    private var startedAt = 0L

    val elapsedMs: Long get() = if (recorder == null) 0 else System.currentTimeMillis() - startedAt

    fun start(): Boolean = runCatching {
        val f = File.createTempFile("voice", ".m4a", context.cacheDir)
        // Assigned first so cancel() in the failure path deletes it.
        file = f
        val r = if (Build.VERSION.SDK_INT >= 31) MediaRecorder(context) else @Suppress("DEPRECATION") MediaRecorder()
        r.setAudioSource(MediaRecorder.AudioSource.VOICE_RECOGNITION)
        r.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
        r.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
        r.setAudioChannels(1)
        r.setAudioSamplingRate(44_100)
        r.setAudioEncodingBitRate(64_000)
        r.setMaxDuration(MAX_MS.toInt())
        r.setOutputFile(f.absolutePath)
        r.prepare()
        r.start()
        recorder = r; startedAt = System.currentTimeMillis()
        true
    }.getOrElse { cancel(); false }

    /** Stops and returns the audio and its length, or null if too short or failed. */
    fun stop(): Pair<ByteArray, Long>? {
        val r = recorder ?: return null
        val ms = (System.currentTimeMillis() - startedAt).coerceAtMost(MAX_MS)
        val ok = runCatching { r.stop() }.isSuccess
        r.release()
        recorder = null
        val f = file
        file = null
        if (!ok || f == null || ms < 700) { f?.delete(); return null }
        val bytes = f.readBytes()
        f.delete()
        return if (bytes.size in 200..MAX_BYTES) bytes to ms else null
    }

    fun cancel() {
        runCatching { recorder?.stop() }
        recorder?.release()
        recorder = null
        file?.delete()
        file = null
    }

    companion object {
        const val MAX_MS = 60_000L
        private const val MAX_BYTES = 700 * 1024
    }
}
