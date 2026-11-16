package app.talklive.voice

import kotlin.math.max
import kotlin.math.min

/**
 * Voice features: a line-for-line port of the website's public/voice-features.js,
 * which turns a person's own microphone audio into a short list of numbers
 * describing pitch and timbre, on their device.
 *
 * The server's model was trained on exactly what that file computes, so this
 * port has to give the same numbers, not just similar ones: VoiceAnalysisTest
 * replays signals from scripts/voice/make-parity-fixtures.js and compares
 * every frame and the summary with what the JavaScript produced. Arithmetic is
 * Double throughout and the transcendental functions come from StrictMath
 * (fdlibm, which V8's Math functions also derive from), so the two agree to
 * the last bits or close to it. Change both files together.
 *
 * What leaves the phone is [summarise]'s result: about 30 statistics over a
 * few seconds of voiced speech. It is not audio and speech cannot be rebuilt
 * from it. The server turns it into an estimate and keeps only that.
 */
object VoiceFeatures {
    const val VERSION = 1
    const val TARGET_RATE = 12000
    const val FRAME_SEC = 0.04
    const val FEATURE_COUNT = 33
    private const val NFFT = 1024
    private const val N_MEL = 22
    private const val N_MFCC = 12
    private const val MEL_LO = 100.0
    private const val MEL_HI = 3800.0
    private const val HI_BAND = 5200.0
    private const val F0_MIN = 60.0
    private const val F0_MAX = 400.0
    private const val YIN_THRESHOLD = 0.15
    private const val MIN_RMS = 0.008
    private const val LPC_ORDER = 12
    private const val PI = Math.PI

    /** JavaScript's Math.round: nearest, halves towards +infinity (as Java's). */
    private fun jsRound(v: Double): Long = Math.round(v)

    // --- Resampling ---------------------------------------------------------
    // Windowed-sinc low-pass, then keep every `factor`-th sample. Microphones
    // deliver 44.1 or 48 kHz; everything below works at about 12 kHz.
    class Decimator(val factor: Int, val taps: DoubleArray, val rate: Double)

    private val decimators = java.util.concurrent.ConcurrentHashMap<Long, Decimator>()

    fun decimatorFor(rate: Double): Decimator = decimators.getOrPut(jsRound(rate)) {
        val factor = max(1L, jsRound(rate / TARGET_RATE)).toInt()
        val n = if (factor == 1) 1 else 8 * factor + 1
        val taps = DoubleArray(n)
        if (factor == 1) taps[0] = 1.0
        else {
            val fc = 0.45 / factor // cycles per input sample
            val mid = (n - 1) / 2.0
            var sum = 0.0
            for (i in 0 until n) {
                val x = i - mid
                val sinc = if (x == 0.0) 2 * fc else StrictMath.sin(2 * PI * fc * x) / (PI * x)
                taps[i] = sinc * (0.54 - 0.46 * StrictMath.cos((2 * PI * i) / (n - 1)))
                sum += taps[i]
            }
            for (i in 0 until n) taps[i] /= sum
        }
        Decimator(factor, taps, rate / factor)
    }

    fun decimate(buf: DoubleArray, rate: Double): DoubleArray {
        val d = decimatorFor(rate)
        val taps = d.taps
        val n = taps.size
        val len = max(0, Math.floor((buf.size - n).toDouble() / d.factor).toInt() + 1)
        val out = DoubleArray(len)
        for (i in 0 until len) {
            var s = 0.0
            val base = i * d.factor
            for (k in 0 until n) s += taps[k] * buf[base + k]
            out[i] = s
        }
        return out
    }

    // --- Pitch ---------------------------------------------------------------
    // YIN: cumulative mean normalised difference, first dip under the
    // threshold, parabolic interpolation. Returns Hz, or 0 for unvoiced.
    fun yin(x: DoubleArray, rate: Double): Double {
        val minTau = Math.floor(rate / F0_MAX).toInt()
        val maxTau = min(Math.floor(rate / F0_MIN).toInt(), x.size shr 1)
        if (maxTau <= minTau) return 0.0
        val w = x.size - maxTau
        val d = DoubleArray(maxTau + 1)
        for (tau in 1..maxTau) {
            var s = 0.0
            for (i in 0 until w) {
                val diff = x[i] - x[i + tau]
                s += diff * diff
            }
            d[tau] = s
        }
        d[0] = 1.0
        var running = 0.0
        for (tau in 1..maxTau) {
            running += d[tau]
            d[tau] = if (running != 0.0) (d[tau] * tau) / running else 1.0
        }
        var best = -1
        var tau = minTau
        while (tau <= maxTau) {
            if (d[tau] < YIN_THRESHOLD) {
                while (tau + 1 <= maxTau && d[tau + 1] < d[tau]) tau++
                best = tau
                break
            }
            tau++
        }
        if (best < 0) return 0.0
        val a = if (best > 1) d[best - 1] else d[best]
        val b = d[best]
        val c = if (best + 1 <= maxTau) d[best + 1] else d[best]
        val denom = a - 2 * b + c
        val shift = if (denom != 0.0) (a - c) / (2 * denom) else 0.0
        return rate / (best + max(-1.0, min(1.0, shift)))
    }

    // --- Spectrum ------------------------------------------------------------
    // In-place radix-2 FFT of NFFT points.
    private val fftCos = DoubleArray(NFFT / 2) { i -> StrictMath.cos((2 * PI * i) / NFFT) }
    private val fftSin = DoubleArray(NFFT / 2) { i -> StrictMath.sin((2 * PI * i) / NFFT) }

    private fun fft(re: DoubleArray, im: DoubleArray) {
        val n = NFFT
        var j = 0
        for (i in 1 until n) {
            var bit = n shr 1
            while (j and bit != 0) { j = j xor bit; bit = bit shr 1 }
            j = j xor bit
            if (i < j) {
                var t = re[i]; re[i] = re[j]; re[j] = t
                t = im[i]; im[i] = im[j]; im[j] = t
            }
        }
        var size = 2
        while (size <= n) {
            val half = size shr 1
            val step = n / size
            var start = 0
            while (start < n) {
                for (k in 0 until half) {
                    val wr = fftCos[k * step]
                    val wi = -fftSin[k * step]
                    val a = start + k
                    val b = a + half
                    val tr = re[b] * wr - im[b] * wi
                    val ti = re[b] * wi + im[b] * wr
                    re[b] = re[a] - tr; im[b] = im[a] - ti
                    re[a] += tr; im[a] += ti
                }
                start += size
            }
            size = size shl 1
        }
    }

    private fun hzToMel(hz: Double) = 2595 * StrictMath.log10(1 + hz / 700)
    private fun melToHz(mel: Double) = 700 * (StrictMath.pow(10.0, mel / 2595) - 1)

    /** Triangular mel filters for one sample rate, and the bins of the speech and high bands. */
    private class MelBank(val first: IntArray, val weights: Array<DoubleArray>, val bandLo: Int, val bandHi: Int, val topHi: Int)

    private val melBanks = java.util.concurrent.ConcurrentHashMap<Long, MelBank>()

    private fun melBankFor(rate: Double): MelBank = melBanks.getOrPut(jsRound(rate)) {
        val lo = hzToMel(MEL_LO)
        val hi = hzToMel(MEL_HI)
        val edges = DoubleArray(N_MEL + 2) { m -> melToHz(lo + ((hi - lo) * m) / (N_MEL + 1)) }
        val hzPerBin = rate / NFFT
        val first = IntArray(N_MEL)
        val weights = Array(N_MEL) { m ->
            val a = edges[m]
            val b = edges[m + 1]
            val c = edges[m + 2]
            val f = max(1, Math.ceil(a / hzPerBin).toInt())
            val last = min(NFFT / 2 - 1, Math.floor(c / hzPerBin).toInt())
            first[m] = f
            DoubleArray(max(0, last - f + 1)) { idx ->
                val hz = (f + idx) * hzPerBin
                if (hz <= b) (hz - a) / (b - a) else (c - hz) / (c - b)
            }
        }
        MelBank(
            first, weights,
            bandLo = Math.ceil(MEL_LO / hzPerBin).toInt(),
            bandHi = Math.floor(MEL_HI / hzPerBin).toInt(),
            topHi = min(NFFT / 2 - 1, Math.floor(HI_BAND / hzPerBin).toInt()),
        )
    }

    private val dct = Array(N_MFCC) { c0 ->
        val c = c0 + 1
        DoubleArray(N_MEL) { m -> StrictMath.cos((PI * c * (m + 0.5)) / N_MEL) }
    }

    /** MFCC 1-12 and the high-band energy ratio of one frame. */
    class Spectral(val mfcc: DoubleArray, val hiRatio: Double)

    fun spectral(x: DoubleArray, rate: Double): Spectral {
        val re = DoubleArray(NFFT)
        val im = DoubleArray(NFFT)
        val n = min(x.size, NFFT)
        for (i in 0 until n) re[i] = x[i] * (0.54 - 0.46 * StrictMath.cos((2 * PI * i) / (n - 1)))
        fft(re, im)
        val half = NFFT / 2
        val power = DoubleArray(half) { k -> re[k] * re[k] + im[k] * im[k] }
        val bank = melBankFor(rate)
        val logMel = DoubleArray(N_MEL)
        for (m in 0 until N_MEL) {
            val w = bank.weights[m]
            val f = bank.first[m]
            var s = 0.0
            for (k in w.indices) s += w[k] * power[f + k]
            logMel[m] = StrictMath.log(s + 1e-10)
        }
        val mfcc = DoubleArray(N_MFCC)
        for (c in 0 until N_MFCC) {
            var s = 0.0
            for (m in 0 until N_MEL) s += dct[c][m] * logMel[m]
            mfcc[c] = s
        }
        var band = 0.0
        var top = 0.0
        for (k in bank.bandLo..bank.bandHi) band += power[k]
        for (k in bank.bandHi + 1..bank.topHi) top += power[k]
        return Spectral(mfcc, StrictMath.log10((top + 1e-12) / (band + 1e-12)))
    }

    // --- Formants --------------------------------------------------------------
    // LPC by autocorrelation + Levinson-Durbin, then the envelope 1/|A(e^jw)|
    // sampled on a grid; its first three peaks in speech range are F1-F3.
    fun formants(x: DoubleArray, rate: Double): DoubleArray? {
        val n = x.size
        val w = DoubleArray(n)
        for (i in 0 until n) {
            val pre = if (i != 0) x[i] - 0.97 * x[i - 1] else x[i]
            w[i] = pre * (0.54 - 0.46 * StrictMath.cos((2 * PI * i) / (n - 1)))
        }
        val r = DoubleArray(LPC_ORDER + 1)
        for (lag in 0..LPC_ORDER) {
            var s = 0.0
            for (i in lag until n) s += w[i] * w[i - lag]
            r[lag] = s
        }
        if (!(r[0] > 0)) return null
        r[0] *= 1.0001 // tiny white-noise floor keeps the recursion stable
        val a = DoubleArray(LPC_ORDER + 1)
        val prev = DoubleArray(LPC_ORDER + 1)
        a[0] = 1.0
        var err = r[0]
        for (i in 1..LPC_ORDER) {
            var acc = r[i]
            for (j in 1 until i) acc += a[j] * r[i - j]
            val k = -acc / err
            a.copyInto(prev)
            for (j in 1 until i) a[j] = prev[j] + k * prev[i - j]
            a[i] = k
            err *= 1 - k * k
            if (err <= 0) return null
        }
        val bins = 256
        val env = DoubleArray(bins)
        for (b in 0 until bins) {
            val omega = (PI * b) / bins
            var re = 0.0
            var im = 0.0
            for (j in 0..LPC_ORDER) {
                re += a[j] * StrictMath.cos(omega * j)
                im -= a[j] * StrictMath.sin(omega * j)
            }
            env[b] = 1 / (re * re + im * im)
        }
        val hzPerBin = rate / 2 / bins
        val peaks = ArrayList<Double>(3)
        var b = 1
        while (b < bins - 1 && peaks.size < 3) {
            val hz = b * hzPerBin
            if (hz >= 200 && hz <= 4500 && env[b] > env[b - 1] && env[b] >= env[b + 1]) peaks.add(hz)
            b++
        }
        if (peaks.size < 3) return null
        val f1 = peaks[0]
        val f2 = peaks[1]
        val f3 = peaks[2]
        if (f1 > 1000 || f2 < 700 || f2 > 2800 || f3 < 1800 || f3 > 4000) return null
        return peaks.toDoubleArray()
    }

    // Uniform-tube model: F_i = (2i - 1) * c / 4L, so F_i / (i - 0.5) = c / 2L
    // is the formant spacing, inversely proportional to vocal-tract length.
    fun spacingOf(fs: DoubleArray): Double {
        var s = 0.0
        for (i in fs.indices) s += fs[i] / (i + 0.5)
        return s / fs.size
    }

    fun rms(x: DoubleArray, n: Int = x.size): Double {
        var s = 0.0
        for (i in 0 until n) s += x[i] * x[i]
        return Math.sqrt(s / max(1, n))
    }

    /** One analysed frame of voiced speech. [formants] is null when they were not clear. */
    class Frame(val f0: Double, val mfcc: DoubleArray, val hiRatio: Double, val formants: DoubleArray?)

    /**
     * One 40 ms frame at [rate] (already near 12 kHz). Null when it is not
     * voiced speech: too quiet, or no clear pitch.
     */
    fun analyseFrame(x: DoubleArray, rate: Double): Frame? {
        val n = min(x.size, jsRound(FRAME_SEC * rate).toInt())
        val frame = if (n == x.size) x else x.copyOf(n)
        if (rms(frame) < MIN_RMS) return null
        val f0 = yin(frame, rate)
        if (!(f0 >= F0_MIN && f0 <= F0_MAX)) return null
        val sp = spectral(frame, rate)
        return Frame(f0, sp.mfcc, sp.hiRatio, formants(frame, rate))
    }

    private fun quantile(sorted: DoubleArray, q: Double): Double {
        if (sorted.isEmpty()) return Double.NaN
        val pos = (sorted.size - 1) * q
        val lo = Math.floor(pos).toInt()
        val hi = Math.ceil(pos).toInt()
        return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
    }

    private fun round4(v: Double): Double = jsRound(v * 10000) / 10000.0

    /** What a device sends: version, number of voiced frames, FEATURE_COUNT values (null = not measured). */
    class Summary(val v: Int, val n: Int, val f: Array<Double?>)

    // log2 the way V8 computes it is not in the JVM; ln(x)/ln(2) is within an
    // ulp or two, far inside what the 4-decimal rounding below keeps.
    private val LN2 = StrictMath.log(2.0)
    private fun log2(x: Double) = StrictMath.log(x) / LN2

    /**
     * Summary of a run of voiced frames. Layout:
     *   0-2    log2(F0 / 100 Hz): median, 10th and 90th percentile
     *   3-14   mean of MFCC 1-12
     *   15-26  standard deviation of MFCC 1-12
     *   27-29  median F1, F2, F3 in kHz (null when too few frames had clear formants)
     *   30     median formant spacing in kHz (null likewise)
     *   31     share of voiced frames with clear formants
     *   32     mean log10 of energy above 3.8 kHz relative to the speech band
     */
    fun summarise(frames: List<Frame>): Summary? {
        val k = frames.size
        if (k == 0) return null
        val f = arrayOfNulls<Double>(FEATURE_COUNT)
        val logF0 = DoubleArray(k) { log2(frames[it].f0 / 100) }.also { it.sort() }
        f[0] = quantile(logF0, 0.5)
        f[1] = quantile(logF0, 0.1)
        f[2] = quantile(logF0, 0.9)
        for (c in 0 until N_MFCC) {
            var sum = 0.0
            for (i in 0 until k) sum += frames[i].mfcc[c]
            val mean = sum / k
            var sq = 0.0
            for (i in 0 until k) { val d = frames[i].mfcc[c] - mean; sq += d * d }
            f[3 + c] = mean
            f[15 + c] = Math.sqrt(sq / k)
        }
        val withFormants = frames.mapNotNull { it.formants }
        // Formant medians mean little over a handful of frames.
        if (withFormants.size >= max(10.0, k * 0.15)) {
            for (j in 0 until 3) {
                f[27 + j] = quantile(DoubleArray(withFormants.size) { withFormants[it][j] }.also { it.sort() }, 0.5) / 1000
            }
            f[30] = quantile(DoubleArray(withFormants.size) { spacingOf(withFormants[it]) }.also { it.sort() }, 0.5) / 1000
        }
        f[31] = withFormants.size.toDouble() / k
        var hi = 0.0
        for (i in 0 until k) hi += frames[i].hiRatio
        f[32] = hi / k
        return Summary(VERSION, k, Array(FEATURE_COUNT) { i -> f[i]?.let(::round4) })
    }

    /**
     * Collects voiced frames from raw microphone blocks.
     *   push(block, rate)  one block of about 43 ms at the microphone's rate
     *   summary()          the features so far, or null
     */
    class Tracker {
        private val frames = ArrayList<Frame>()
        var seen = 0; private set
        val voiced: Int get() = frames.size

        fun push(block: DoubleArray, rate: Double): Boolean {
            seen++
            val d = decimatorFor(rate)
            val fr = analyseFrame(decimate(block, rate), d.rate) ?: return false
            frames += fr
            return true
        }

        /** Microphone samples arrive as 32-bit floats, as in the browser. */
        fun push(block: FloatArray, rate: Double): Boolean = push(DoubleArray(block.size) { block[it].toDouble() }, rate)

        fun summary(): Summary? = summarise(frames)
        fun frames(): List<Frame> = frames
        fun reset() { frames.clear(); seen = 0 }
    }
}

/** Port of public/moderation.js's loudness monitor: sustained shouting on your own mic. */
class ShoutDetector(private val threshold: Double = 0.28, private val sustainMs: Long = 1500) {
    private var loudSince = 0L
    /** Returns the RMS when this frame completes a sustained shout, else null. */
    fun feed(rms: Double, now: Long): Double? {
        if (rms >= threshold) {
            if (loudSince == 0L) loudSince = now
            else if (now - loudSince >= sustainMs) { loudSince = 0L; return rms }
        } else loudSince = 0L
        return null
    }
}
