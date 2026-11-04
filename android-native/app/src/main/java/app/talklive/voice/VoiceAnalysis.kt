package app.talklive.voice

import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.math.sqrt

/**
 * Port of the website's public/voice-gender.js: estimates, on this phone
 * only, whether the person's own voice reads as male or female, from the
 * median pitch (YIN) and formant spacing (LPC). Only the verdict ever leaves
 * the device, and only for people who turned Voice check on. It can confirm
 * the gender someone picked, never override it.
 */
object VoiceGender {
    const val TARGET_RATE = 12000
    const val MIN_VOICED = 80          // ~8 s of voiced speech before any verdict
    const val REPORT_AT = 0.85
    private const val F0_MIN = 60.0
    private const val F0_MAX = 400.0
    private const val YIN_THRESHOLD = 0.15
    private const val MIN_RMS = 0.01
    private const val LPC_ORDER = 12

    data class Verdict(val label: String, val confidence: Double, val decided: Boolean)

    fun decimate(buf: FloatArray, factor: Int): FloatArray {
        val out = FloatArray(buf.size / factor)
        for (i in out.indices) {
            var s = 0f
            for (k in 0 until factor) s += buf[i * factor + k]
            out[i] = s / factor
        }
        return out
    }

    fun yin(x: FloatArray, rate: Double): Double {
        val minTau = (rate / F0_MAX).toInt()
        val maxTau = min((rate / F0_MIN).toInt(), x.size shr 1)
        val w = x.size - maxTau
        val d = DoubleArray(maxTau + 1)
        for (tau in 1..maxTau) {
            var s = 0.0
            for (i in 0 until w) { val diff = x[i] - x[i + tau]; s += diff * diff }
            d[tau] = s
        }
        d[0] = 1.0
        var running = 0.0
        for (tau in 1..maxTau) {
            running += d[tau]
            d[tau] = if (running != 0.0) d[tau] * tau / running else 1.0
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

    fun formants(x: FloatArray, rate: Double): DoubleArray? {
        val n = x.size
        val w = DoubleArray(n) { i ->
            val pre = if (i > 0) x[i] - 0.97 * x[i - 1] else x[i].toDouble()
            pre * (0.54 - 0.46 * cos(2 * PI * i / (n - 1)))
        }
        val r = DoubleArray(LPC_ORDER + 1) { lag -> var s = 0.0; for (i in lag until n) s += w[i] * w[i - lag]; s }
        if (!(r[0] > 0)) return null
        r[0] *= 1.0001
        val a = DoubleArray(LPC_ORDER + 1).also { it[0] = 1.0 }
        var err = r[0]
        for (i in 1..LPC_ORDER) {
            var acc = r[i]
            for (j in 1 until i) acc += a[j] * r[i - j]
            val k = -acc / err
            val prev = a.copyOf()
            for (j in 1 until i) a[j] = prev[j] + k * prev[i - j]
            a[i] = k
            err *= 1 - k * k
            if (err <= 0) return null
        }
        val bins = 256
        val env = DoubleArray(bins) { b ->
            val omega = PI * b / bins
            var re = 0.0; var im = 0.0
            for (j in 0..LPC_ORDER) { re += a[j] * cos(omega * j); im -= a[j] * sin(omega * j) }
            1 / (re * re + im * im)
        }
        val hzPerBin = rate / 2 / bins
        val peaks = ArrayList<Double>(3)
        for (b in 1 until bins - 1) {
            if (peaks.size >= 3) break
            val hz = b * hzPerBin
            if (hz < 200 || hz > 4500) continue
            if (env[b] > env[b - 1] && env[b] >= env[b + 1]) peaks.add(hz)
        }
        if (peaks.size < 3) return null
        val (f1, f2, f3) = peaks
        if (f1 > 1000 || f2 < 700 || f2 > 2800 || f3 < 1800 || f3 > 4000) return null
        return peaks.toDoubleArray()
    }

    fun spacingOf(fs: DoubleArray): Double = fs.withIndex().sumOf { (i, f) -> f / (i + 0.5) } / fs.size

    /** P(female voice): pitch is the strong cue, formant spacing breaks ties. */
    fun classify(f0: Double, spacing: Double): Double {
        val pitchScore = (ln(f0) - ln(160.0)) / 0.12
        val z = if (spacing.isFinite()) 0.75 * pitchScore + 0.25 * ((spacing - 1075) / 60) else pitchScore
        return 1 / (1 + exp(-z))
    }

    fun estimate(f0s: List<Double>, spacings: List<Double>): Verdict? {
        if (f0s.size < MIN_VOICED) return null
        val f0 = median(f0s)
        val spacing = if (spacings.size >= MIN_VOICED / 2) median(spacings) else Double.NaN
        val p = classify(f0, spacing)
        val confidence = max(p, 1 - p)
        return Verdict(if (p >= 0.5) "female" else "male", (confidence * 100).roundToInt() / 100.0, confidence >= REPORT_AT)
    }

    private fun median(l: List<Double>): Double {
        val s = l.sorted(); val m = s.size shr 1
        return if (s.size % 2 == 1) s[m] else (s[m - 1] + s[m]) / 2
    }

    /** Accumulates frames; returns a verdict once confident. */
    class Tracker {
        val f0s = ArrayList<Double>()
        val spacings = ArrayList<Double>()
        fun analyse(frame: FloatArray, rate: Double): Verdict? {
            if (rms(frame) >= MIN_RMS) {
                val f0 = yin(frame, rate)
                if (f0 in F0_MIN..F0_MAX) {
                    f0s.add(f0)
                    formants(frame, rate)?.let { spacings.add(spacingOf(it)) }
                }
            }
            return estimate(f0s, spacings)?.takeIf { it.decided }
        }
    }

    fun rms(frame: FloatArray): Double {
        var s = 0.0
        for (v in frame) s += v * v
        return sqrt(s / max(1, frame.size))
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
