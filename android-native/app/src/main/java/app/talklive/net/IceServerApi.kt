package app.talklive.net

import app.talklive.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import org.webrtc.PeerConnection
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

data class IceConfig(val servers: List<PeerConnection.IceServer>, val relayOnly: Boolean)

/** Fetches STUN/TURN servers (with short-lived credentials) from GET /ice-servers. */
@Singleton
class IceServerApi @Inject constructor() {
    private val http = OkHttpClient.Builder()
        .callTimeout(6, TimeUnit.SECONDS)
        .build()

    suspend fun fetch(): IceConfig = withContext(Dispatchers.IO) {
        runCatching {
            http.newCall(Request.Builder().url("${BuildConfig.SERVER_URL}/ice-servers").build()).execute().use { res ->
                val body = JSONObject(res.body?.string().orEmpty())
                IceConfig(parse(body.optJSONArray("iceServers")), body.optString("iceTransportPolicy") == "relay")
            }
        }.getOrNull()?.takeIf { it.servers.isNotEmpty() } ?: FALLBACK
    }

    private fun parse(arr: JSONArray?): List<PeerConnection.IceServer> {
        if (arr == null) return emptyList()
        return (0 until arr.length()).mapNotNull { i ->
            val o = arr.optJSONObject(i) ?: return@mapNotNull null
            val urls = when (val u = o.opt("urls") ?: o.opt("url")) {
                is JSONArray -> (0 until u.length()).map { u.optString(it) }
                is String -> listOf(u)
                else -> return@mapNotNull null
            }.filter { it.isNotBlank() }
            if (urls.isEmpty()) return@mapNotNull null
            PeerConnection.IceServer.builder(urls).apply {
                o.optNullableString("username")?.let { setUsername(it) }
                o.optNullableString("credential")?.let { setPassword(it) }
            }.createIceServer()
        }
    }

    private companion object {
        val FALLBACK = IceConfig(
            listOf(PeerConnection.IceServer.builder("stun:stun.l.google.com:19302").createIceServer()),
            relayOnly = false,
        )
    }
}
