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

    @Volatile private var cached: IceConfig? = null
    @Volatile private var fetchedAt = 0L

    /**
     * The ICE config, from cache when fresh (see MAX_AGE_MS). It is fetched
     * again while searching, so a call rarely waits on the network for it.
     */
    suspend fun get(): IceConfig {
        val c = cached
        if (c != null && System.currentTimeMillis() - fetchedAt < MAX_AGE_MS) return c
        return fetch()
    }

    suspend fun fetch(): IceConfig = withContext(Dispatchers.IO) {
        runCatching {
            http.newCall(Request.Builder().url("${app.talklive.net.ServerConfig.url}/ice-servers").build()).execute().use { res ->
                val body = JSONObject(res.body?.string().orEmpty())
                IceConfig(parse(body.optJSONArray("iceServers")), body.optString("iceTransportPolicy") == "relay")
            }
        }.getOrNull()?.takeIf { it.servers.isNotEmpty() }
            ?.also { cached = it; fetchedAt = System.currentTimeMillis() }
            ?: cached ?: FALLBACK
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
            listOf(urls to o)
        }.flatMap { list ->
            list.flatMap { (urls, o) ->
                val user = o.optNullableString("username")
                val pass = o.optNullableString("credential")
                val stun = urls.filter { it.startsWith("stun", ignoreCase = true) }
                val turn = urls.filter { it.startsWith("turn", ignoreCase = true) }
                buildList {
                    if (stun.isNotEmpty()) add(PeerConnection.IceServer.builder(stun).createIceServer())
                    // A relay without credentials only makes WebRTC fail.
                    if (turn.isNotEmpty() && user != null && pass != null) {
                        add(PeerConnection.IceServer.builder(turn).setUsername(user).setPassword(pass).createIceServer())
                    }
                }
            }
        }
    }

    private companion object {
        // The server may hand out credentials with only ~10 minutes left (it
        // refreshes them 10 minutes before they expire), so a copy is only
        // trusted for 4 minutes. Keeping them 45 minutes meant calls behind
        // mobile/office NAT tried an expired relay and never connected.
        const val MAX_AGE_MS = 4 * 60 * 1000L
        val FALLBACK = IceConfig(
            listOf(PeerConnection.IceServer.builder("stun:stun.l.google.com:19302").createIceServer()),
            relayOnly = false,
        )
    }
}
