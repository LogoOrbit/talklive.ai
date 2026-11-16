package app.talklive

import app.talklive.call.SdpTune
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SdpTuneTest {
    private val chrome = listOf(
        "v=0", "m=audio 9 UDP/TLS/RTP/SAVPF 111 63 0", "a=mid:0",
        "a=rtpmap:111 opus/48000/2", "a=fmtp:111 minptime=10;useinbandfec=1",
        "a=rtpmap:63 red/48000/2", "a=fmtp:63 111/111", "a=rtpmap:0 PCMU/8000", "",
    ).joinToString("\r\n")

    private fun fmtp(sdp: String, pt: Int) = sdp.split(Regex("\r?\n")).first { it.startsWith("a=fmtp:$pt ") }

    @Test fun tunesOpusAndKeepsTheRest() {
        val out = SdpTune.tuneOpus(chrome)
        val line = fmtp(out, 111)
        assertTrue(line, line.contains("minptime=10"))
        assertEquals(1, Regex("useinbandfec=1").findAll(line).count())
        assertTrue(line.contains("usedtx=1"))
        assertTrue(line.contains("maxaveragebitrate=28000"))
        assertEquals("a=fmtp:63 111/111", fmtp(out, 63))
        assertFalse(Regex("[^\r]\n").containsMatchIn(out))
        assertEquals(out, SdpTune.tuneOpus(out))
    }

    @Test fun addsFmtpWhenMissing() {
        val out = SdpTune.tuneOpus("v=0\na=rtpmap:109 opus/48000/2\na=sendrecv\n")
        assertTrue(out, out.contains("a=rtpmap:109 opus/48000/2\na=fmtp:109 useinbandfec=1;usedtx=1;maxaveragebitrate=28000\n"))
        val noOpus = "v=0\r\na=rtpmap:0 PCMU/8000\r\n"
        assertEquals(noOpus, SdpTune.tuneOpus(noOpus))
    }

    @Test fun matchesTheWebsiteRules() {
        // Same output as public/app.js tuneOpusSdp for the same input (see scripts/test-sdp-tune.js).
        assertEquals("a=fmtp:111 minptime=10;useinbandfec=1;usedtx=1;maxaveragebitrate=28000", fmtp(SdpTune.tuneOpus(chrome), 111))
    }

    @Test fun adaptiveBitrateSteps() {
        var s = SdpTune.BitrateState()
        repeat(2) { s = SdpTune.nextBitrate(s, 0.08f, 100) }
        assertEquals(SdpTune.MAX_BITRATE, s.bitrate)
        s = SdpTune.nextBitrate(s, 0.08f, 100)
        assertEquals(SdpTune.LOW_BITRATE, s.bitrate); assertTrue(s.changed)
        repeat(4) { s = SdpTune.nextBitrate(s, 0f, 80) }
        assertEquals(SdpTune.LOW_BITRATE, s.bitrate)
        s = SdpTune.nextBitrate(s, 0f, 80)
        assertEquals(SdpTune.MAX_BITRATE, s.bitrate); assertTrue(s.changed)
        var w = SdpTune.BitrateState()
        repeat(10) { i -> w = if (i % 2 == 0) SdpTune.nextBitrate(w, 0f, 80) else SdpTune.nextBitrate(w, 0.1f, 80) }
        assertEquals(SdpTune.MAX_BITRATE, w.bitrate)
        var u = SdpTune.BitrateState(bitrate = SdpTune.LOW_BITRATE)
        repeat(10) { u = SdpTune.nextBitrate(u, null, null) }
        assertEquals(SdpTune.LOW_BITRATE, u.bitrate)
    }

    @Test fun restartBackoff() {
        assertEquals(0L, SdpTune.restartDelayMs(0))
        assertEquals(2000L, SdpTune.restartDelayMs(1))
        assertEquals(4000L, SdpTune.restartDelayMs(2))
        assertEquals(8000L, SdpTune.restartDelayMs(3))
        assertEquals(8000L, SdpTune.restartDelayMs(20))
    }
}
