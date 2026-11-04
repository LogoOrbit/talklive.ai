package app.talklive.call

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.webrtc.AudioTrackSink
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt

/**
 * Live spectrum of the other person's voice, from the decoded remote audio
 * (WebRTC AudioTrackSink). A 1024-point FFT about 30 times a second, folded
 * into [BANDS] log-spaced bands from 80 Hz to 8 kHz, 0..1 each, smoothed so
 * bars rise fast and fall gently. Nothing is recorded or sent.
 */
class Spectrum : AudioTrackSink {
    private val _bands = MutableStateFlow(FloatArray(BANDS))
    val bands: StateFlow<FloatArray> = _bands

    private val window = FloatArray(N)
    private var filled = 0
    private var sinceLast = 0
    private val smooth = FloatArray(BANDS)
    private val hann = FloatArray(N) { (0.5 - 0.5 * cos(2 * PI * it / (N - 1))).toFloat() }
    private val re = FloatArray(N)
    private val im = FloatArray(N)

    override fun onData(data: ByteBuffer, bitsPerSample: Int, sampleRate: Int, channels: Int, frames: Int, timestamp: Long) {
        if (bitsPerSample != 16 || frames <= 0) return
        val s = data.duplicate().order(ByteOrder.nativeOrder()).asShortBuffer()
        val ch = max(1, channels)
        synchronized(this) {
            for (i in 0 until frames) {
                val v = if (i * ch < s.limit()) s.get(i * ch) / 32768f else 0f
                if (filled < N) window[filled++] = v
                else { System.arraycopy(window, 1, window, 0, N - 1); window[N - 1] = v }
            }
            sinceLast += frames
            if (filled < N || sinceLast < sampleRate / 30) return
            sinceLast = 0
            analyse(sampleRate)
        }
    }

    fun reset() = synchronized(this) { filled = 0; smooth.fill(0f); _bands.value = FloatArray(BANDS) }

    private fun analyse(rate: Int) {
        for (i in 0 until N) { re[i] = window[i] * hann[i]; im[i] = 0f }
        fft(re, im)
        val out = FloatArray(BANDS)
        val binHz = rate.toFloat() / N
        for (b in 0 until BANDS) {
            val lo = LOW * (HIGH / LOW).pow(b.toFloat() / BANDS)
            val hi = LOW * (HIGH / LOW).pow((b + 1f) / BANDS)
            val from = max(1, (lo / binHz).toInt())
            val to = min(N / 2 - 1, max(from, (hi / binHz).toInt()))
            var sum = 0f
            for (k in from..to) sum += sqrt(re[k] * re[k] + im[k] * im[k])
            val mag = sum / (to - from + 1)
            // Decibels into 0..1: about -60 dB is silence, 0 dB is loud speech.
            val db = 20f * (ln(mag / (N / 4f) + 1e-6f) / ln(10f))
            val v = ((db + 60f) / 60f).coerceIn(0f, 1f)
            smooth[b] = if (v > smooth[b]) v * 0.7f + smooth[b] * 0.3f else smooth[b] * 0.82f + v * 0.18f
            out[b] = smooth[b]
        }
        _bands.value = out
    }

    companion object {
        const val BANDS = 28
        private const val N = 1024
        private const val LOW = 80f
        private const val HIGH = 8000f

        /** In-place radix-2 FFT. */
        fun fft(re: FloatArray, im: FloatArray) {
            val n = re.size
            var j = 0
            for (i in 1 until n) {
                var bit = n shr 1
                while (j and bit != 0) { j = j xor bit; bit = bit shr 1 }
                j = j xor bit
                if (i < j) { var t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t }
            }
            var len = 2
            while (len <= n) {
                val ang = -2 * PI / len
                val wr = cos(ang).toFloat(); val wi = sin(ang).toFloat()
                var i = 0
                while (i < n) {
                    var cr = 1f; var ci = 0f
                    for (k in 0 until len / 2) {
                        val ar = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci
                        val ai = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr
                        re[i + k + len / 2] = re[i + k] - ar; im[i + k + len / 2] = im[i + k] - ai
                        re[i + k] += ar; im[i + k] += ai
                        val nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr
                    }
                    i += len
                }
                len = len shl 1
            }
        }
    }
}
