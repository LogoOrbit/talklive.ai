package app.talklive.call

/**
 * Pure call-tuning rules, the same as the website's (public/app.js, the
 * <sdp-tune> block), so an app user and a browser user tune a call alike.
 *
 * Opus as WebRTC negotiates it by default is tuned for music on a good link.
 * The fmtp parameters in OUR description tell the OTHER side how to send to us:
 *  - useinbandfec=1: a low-bitrate copy of the previous frame rides along, so
 *    a lost packet is rebuilt instead of heard as a gap
 *  - usedtx=1: almost nothing is sent during silence
 *  - maxaveragebitrate: plenty for one voice, small enough for 3G
 * Our own sending is capped separately (RtpSender parameters), whatever the
 * other side's SDP says.
 */
object SdpTune {
    const val MAX_BITRATE = 28_000
    const val LOW_BITRATE = 16_000
    const val ICE_RESTART_MAX = 6

    private val rtpmapRe = Regex("^a=rtpmap:(\\d+) opus/48000", RegexOption.IGNORE_CASE)
    private val fmtpRe = Regex("^a=fmtp:(\\d+) (.*)$")

    fun tuneOpus(sdp: String, fec: Boolean = true, dtx: Boolean = true, maxAverageBitrate: Int = MAX_BITRATE): String {
        if (sdp.isEmpty()) return sdp
        val eol = if (sdp.contains("\r\n")) "\r\n" else "\n"
        val lines = sdp.split(eol)
        val opus = lines.mapNotNull { rtpmapRe.find(it)?.groupValues?.get(1) }.toSet()
        if (opus.isEmpty()) return sdp
        val withFmtp = lines.mapNotNull { fmtpRe.find(it)?.groupValues?.get(1) }.toSet()
        val want = linkedMapOf("useinbandfec" to if (fec) "1" else "0", "usedtx" to if (dtx) "1" else "0")
        if (maxAverageBitrate > 0) want["maxaveragebitrate"] = maxAverageBitrate.toString()
        fun params(rest: String): String {
            val kept = rest.split(';').map { it.trim() }.filter { it.isNotEmpty() }
                .filter { kv -> kv.substringBefore('=').trim().lowercase() !in want }
            return (kept + want.map { "${it.key}=${it.value}" }).joinToString(";")
        }
        val out = ArrayList<String>(lines.size + 2)
        for (l in lines) {
            val f = fmtpRe.find(l)
            if (f != null && f.groupValues[1] in opus) { out += "a=fmtp:${f.groupValues[1]} ${params(f.groupValues[2])}"; continue }
            out += l
            val r = rtpmapRe.find(l)
            // An Opus payload with no fmtp line at all gets one, right after its rtpmap.
            if (r != null && r.groupValues[1] !in withFmtp) out += "a=fmtp:${r.groupValues[1]} ${params("")}"
        }
        return out.joinToString(eol)
    }

    data class BitrateState(val bitrate: Int = MAX_BITRATE, val bad: Int = 0, val good: Int = 0, val changed: Boolean = false)

    /**
     * One step of the adaptive send bitrate from a ~2 s sample of how our audio
     * arrives at the other side (loss 0..1, round trip ms; null when unknown).
     * Three bad samples in a row drop to [LOW_BITRATE]; five good ones restore.
     */
    fun nextBitrate(st: BitrateState, loss: Float?, rttMs: Int?): BitrateState {
        val bad = (loss != null && loss >= 0.05f) || (rttMs != null && rttMs >= 400)
        val good = !bad && (loss == null || loss < 0.02f) && (rttMs == null || rttMs < 250) && (loss != null || rttMs != null)
        var s = st.copy(bad = if (bad) st.bad + 1 else 0, good = if (good) st.good + 1 else 0, changed = false)
        if (s.bitrate != LOW_BITRATE && s.bad >= 3) s = s.copy(bitrate = LOW_BITRATE, bad = 0, changed = true)
        else if (s.bitrate != MAX_BITRATE && s.good >= 5) s = s.copy(bitrate = MAX_BITRATE, good = 0, changed = true)
        return s
    }

    /** Minimum gap before ICE restart number [count] of one call: at once, then 2 s, 4 s, 8 s, 8 s... */
    fun restartDelayMs(count: Int): Long = if (count <= 0) 0L else minOf(2000L shl (count - 1).coerceAtMost(8), 8000L)
}
