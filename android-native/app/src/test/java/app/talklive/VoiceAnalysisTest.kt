package app.talklive

import android.app.Application
import app.talklive.voice.MicMonitor.Companion.toJson
import app.talklive.voice.ShoutDetector
import app.talklive.voice.VoiceFeatures
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import kotlin.math.abs
import kotlin.math.max

/**
 * The phone must feed the server's voice model the same numbers as the
 * website: VoiceFeatures.kt is checked against public/voice-features.js on the
 * synthetic voices in voice-parity.json (scripts/voice/make-parity-fixtures.js).
 * Robolectric only for org.json.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35], application = Application::class)
class VoiceAnalysisTest {

    private val parity: JSONObject by lazy {
        JSONObject(javaClass.classLoader!!.getResourceAsStream("voice-parity.json")!!.bufferedReader().readText())
    }

    /** The generator's LCG (Numerical Recipes), uniform in [0, 1). */
    private class Lcg(seed: Long) {
        private var s = seed and 0xFFFFFFFFL
        fun next(): Double { s = (s * 1664525L + 1013904223L) and 0xFFFFFFFFL; return s / 4294967296.0 }
    }

    /** synth() from make-parity-fixtures.js, step for step. */
    private fun synth(c: JSONObject): FloatArray {
        val rate = c.getInt("rate").toDouble()
        val rand = Lcg(c.getLong("seed"))
        val parts = ArrayList<DoubleArray>()
        val segs = c.getJSONArray("segments")
        for (s in 0 until segs.length()) {
            val seg = segs.getJSONObject(s)
            val f0 = seg.getDouble("f0")
            val glide = seg.getDouble("glide")
            val n = Math.floor(rate * seg.getDouble("seconds")).toInt()
            var y = DoubleArray(n)
            var phase = 0.0
            var jit = 0.0
            for (i in 0 until n) {
                val f = f0 * (1 + glide * (i.toDouble() / n - 0.5)) * (1 + jit)
                phase += f / rate
                if (phase >= 1) {
                    phase -= 1
                    y[i] = 1.0
                    jit = (rand.next() - 0.5) * 0.02
                }
            }
            val coefs = seg.getJSONArray("coefs")
            for (k in 0 until coefs.length()) {
                val c1 = coefs.getJSONArray(k).getDouble(0)
                val c2 = coefs.getJSONArray(k).getDouble(1)
                val out = DoubleArray(n)
                for (i in 0 until n) {
                    val p1 = if (i > 0) out[i - 1] else 0.0
                    val p2 = if (i > 1) out[i - 2] else 0.0
                    out[i] = y[i] + c1 * p1 + c2 * p2
                }
                y = out
            }
            parts += y
            parts += DoubleArray(Math.floor(rate * seg.getDouble("pause")).toInt())
        }
        val x = DoubleArray(parts.sumOf { it.size })
        var off = 0
        for (p in parts) { p.copyInto(x, off); off += p.size }
        var peak = 0.0
        for (v in x) peak = max(peak, abs(v))
        val level = c.getDouble("level")
        val noise = c.getDouble("noise")
        return FloatArray(x.size) { i -> ((x[i] / peak) * level + (rand.next() - 0.5) * noise).toFloat() }
    }

    private fun close(what: String, want: Double, got: Double) {
        val tol = 1e-6 * max(abs(want), abs(got)) + 1e-12
        assertTrue("$what: want $want, got $got", abs(want - got) <= tol)
    }

    private fun assertSummary(what: String, want: JSONObject, got: VoiceFeatures.Summary) {
        assertEquals("$what v", want.getInt("v"), got.v)
        assertEquals("$what n", want.getInt("n"), got.n)
        val f = want.getJSONArray("f")
        assertEquals("$what length", f.length(), got.f.size)
        for (i in 0 until f.length()) {
            if (f.isNull(i)) { assertNull("$what f[$i]", got.f[i]); continue }
            val g = got.f[i]
            assertNotNull("$what f[$i] missing", g)
            // Both sides round to 4 decimals; a last-bit difference may tip one rounding.
            assertTrue("$what f[$i]: want ${f.getDouble(i)}, got $g", abs(f.getDouble(i) - g!!) <= 2e-4)
        }
    }

    @Test fun matchesTheWebsiteOnEveryFixture(): Unit {
        val cases = parity.getJSONArray("cases")
        assertTrue(cases.length() >= 6)
        val block = parity.getInt("block")
        for (ci in 0 until cases.length()) {
            val c = cases.getJSONObject(ci)
            val name = c.getString("name")
            val rate = c.getInt("rate")
            val signal = synth(c)
            assertEquals("$name samples", c.getInt("samples"), signal.size)
            val t = VoiceFeatures.Tracker()
            val voiced = StringBuilder()
            var first: VoiceFeatures.Summary? = null
            var off = 0
            while (off + block <= signal.size) {
                voiced.append(if (t.push(signal.copyOfRange(off, off + block), rate.toDouble())) '1' else '0')
                if (first == null && t.voiced == 80) first = t.summary()
                off += rate / 20
            }
            // The same blocks must count as voiced speech, one for one.
            assertEquals("$name voiced blocks", c.getString("voiced"), voiced.toString())
            val frames = c.getJSONArray("frames")
            for (i in 0 until frames.length()) {
                val want = frames.getJSONObject(i)
                val got = t.frames()[i]
                close("$name frame $i f0", want.getDouble("f0"), got.f0)
                close("$name frame $i hiRatio", want.getDouble("hiRatio"), got.hiRatio)
                val mfcc = want.getJSONArray("mfcc")
                for (k in 0 until mfcc.length()) close("$name frame $i mfcc$k", mfcc.getDouble(k), got.mfcc[k])
                if (want.isNull("formants")) assertNull("$name frame $i formants", got.formants)
                else {
                    val fm = want.getJSONArray("formants")
                    assertNotNull("$name frame $i formants missing", got.formants)
                    assertEquals(fm.length(), got.formants!!.size)
                    for (k in 0 until fm.length()) close("$name frame $i F${k + 1}", fm.getDouble(k), got.formants!![k])
                }
            }
            assertSummary("$name first", c.getJSONObject("first"), first!!)
            assertSummary("$name final", c.getJSONObject("summary"), t.summary()!!)
        }
    }

    @Test fun silenceIsIgnored(): Unit {
        val t = VoiceFeatures.Tracker()
        repeat(100) { assertFalse(t.push(FloatArray(2048), 48000.0)) }
        // Very quiet hiss is not speech either.
        repeat(100) { k -> assertFalse(t.push(FloatArray(2048) { i -> if ((i + k) % 2 == 0) 0.002f else -0.002f }, 48000.0)) }
        assertEquals(0, t.voiced)
        assertEquals(200, t.seen)
        assertNull(t.summary())
    }

    private fun frame(f0: Double, formants: DoubleArray?) =
        VoiceFeatures.Frame(f0, DoubleArray(12) { it * 0.5 + f0 / 100 }, -3.0, formants)

    @Test fun summaryShapeAndPayload(): Unit {
        val frames = List(80) { i -> frame(100.0 + i, doubleArrayOf(500.0, 1500.0, 2500.0)) }
        val s = VoiceFeatures.summarise(frames)!!
        assertEquals(VoiceFeatures.VERSION, s.v)
        assertEquals(80, s.n)
        assertEquals(33, s.f.size)
        assertTrue(s.f.all { it != null })
        assertEquals(1.0, s.f[31]!!, 0.0)
        assertEquals(0.5, s.f[27]!!, 1e-9)
        val json = s.toJson()
        assertEquals(1, json.getInt("v"))
        assertEquals(80, json.getInt("n"))
        assertEquals(33, json.getJSONArray("f").length())
    }

    @Test fun formantStatsAreNullWhenFewFramesHadThem(): Unit {
        // 9 of 100 frames with formants: under both the 10-frame floor and 15 %.
        val frames = List(100) { i -> frame(180.0, if (i < 9) doubleArrayOf(600.0, 1700.0, 2900.0) else null) }
        val s = VoiceFeatures.summarise(frames)!!
        for (i in 27..30) assertNull("f[$i]", s.f[i])
        assertEquals(0.09, s.f[31]!!, 1e-12)
        // Sent as JSON null, which the server accepts for those positions only.
        val f: JSONArray = s.toJson().getJSONArray("f")
        for (i in 27..30) assertTrue(f.isNull(i))
        assertFalse(f.isNull(26))
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
