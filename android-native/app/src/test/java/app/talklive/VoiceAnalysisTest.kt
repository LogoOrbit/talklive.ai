package app.talklive

import app.talklive.voice.ShoutDetector
import app.talklive.voice.VoiceGender
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.sin

/** The Kotlin port must agree with public/voice-gender.js on clear voices. */
class VoiceAnalysisTest {
    private val rate = 48000

    /** A voiced frame: harmonics of f0 with falling amplitude, like a vowel. */
    private fun voice(f0: Double, n: Int = 2048, amp: Double = 0.3, phase: Int = 0) = FloatArray(n) { i ->
        val t = (i + phase).toDouble() / rate
        var s = 0.0
        for (h in 1..12) s += sin(2 * PI * f0 * h * t) / h
        (amp * s / 2).toFloat()
    }

    private fun frame(f0: Double, phase: Int = 0): Pair<FloatArray, Double> {
        val factor = Math.round(rate.toDouble() / VoiceGender.TARGET_RATE).toInt()
        return VoiceGender.decimate(voice(f0, phase = phase), factor) to rate.toDouble() / factor
    }

    @Test fun yinFindsPitch(): Unit {
        for (f0 in listOf(110.0, 150.0, 210.0, 260.0)) {
            val (x, r) = frame(f0)
            val got = VoiceGender.yin(x, r)
            assertTrue("$f0 -> $got", abs(got - f0) / f0 < 0.03)
        }
    }

    @Test fun classifySidesWithPitch(): Unit {
        assertTrue(VoiceGender.classify(115.0, Double.NaN) < 0.1)
        assertTrue(VoiceGender.classify(220.0, Double.NaN) > 0.9)
        assertEquals(0.5, VoiceGender.classify(160.0, 1075.0), 0.01)
    }

    @Test fun noVerdictBeforeEnoughSpeech(): Unit {
        assertNull(VoiceGender.estimate(List(VoiceGender.MIN_VOICED - 1) { 120.0 }, emptyList()))
    }

    @Test fun trackerReachesConfidentVerdicts(): Unit {
        for ((f0, label) in listOf(118.0 to "male", 225.0 to "female")) {
            val t = VoiceGender.Tracker()
            var v: VoiceGender.Verdict? = null
            for (k in 0 until 200) {
                val (x, r) = frame(f0 * (1 + 0.02 * sin(k / 5.0)), phase = k * 4800)
                v = t.analyse(x, r) ?: continue
                break
            }
            assertNotNull("$label never decided", v)
            assertEquals(label, v!!.label)
            assertTrue(v.confidence >= VoiceGender.REPORT_AT)
        }
    }

    @Test fun silenceIsIgnored(): Unit {
        val t = VoiceGender.Tracker()
        repeat(200) { assertNull(t.analyse(FloatArray(512), 12000.0)) }
        assertTrue(t.f0s.isEmpty())
    }

    @Test fun shoutingMustBeSustained(): Unit {
        val d = ShoutDetector()
        assertNull(d.feed(0.5, 0))
        assertNull(d.feed(0.5, 1000))
        assertNull(d.feed(0.1, 1200)) // a dip resets it
        assertNull(d.feed(0.5, 1300))
        assertNull(d.feed(0.5, 2700))
        assertNotNull(d.feed(0.5, 2800))
    }
}
