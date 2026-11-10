package app.talklive.net

import android.content.Context
import app.talklive.BuildConfig
import dagger.hilt.android.qualifiers.ApplicationContext
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
class IceServerApi @Inject constructor(@ApplicationContext context: Context) {
    private val prefs = context.getSharedPreferences("ui", Context.MODE_PRIVATE)

    private val http = Http.withTimeout(6)

    @Volatile private var cached: IceConfig? = null
    @Volatile private var fetchedAt = 0L

    /**
     * The ICE config, from cache when fresh (see MAX_AGE_MS). It is fetched
     * again while searching, so a call rarely waits on the network for it.
     */
    suspend fun get(maxAgeMs: Long = MAX_AGE_MS): IceConfig {
        val c = cached
        if (c != null && System.currentTimeMillis() - fetchedAt < maxAgeMs) return c
        return fetch()
    }

    /** For a call starting now: a copy up to 8 minutes old still has time left. */
    suspend fun forCall(): IceConfig = get(CALL_MAX_AGE_MS)

    suspend fun fetch(): IceConfig = withContext(Dispatchers.IO) {
        runCatching {
            http.newCall(Request.Builder().url("${app.talklive.net.ServerConfig.url}/ice-servers").build()).execute().use { res ->
                val body = JSONObject(res.body?.string().orEmpty())
                IceConfig(parse(body.optJSONArray("iceServers")), body.optString("iceTransportPolicy") == "relay")
            }
        }.getOrNull()?.takeIf { it.servers.isNotEmpty() }
            ?.also {
                cached = it; fetchedAt = System.currentTimeMillis()
                prefs.edit().putBoolean(RELAY_KEY, it.relayOnly).apply()
            }
            // A failed fetch keeps the last policy we were given, so IP privacy fails closed.
            ?: cached?.copy(relayOnly = prefs.getBoolean(RELAY_KEY, cached!!.relayOnly))
            ?: FALLBACK.copy(relayOnly = prefs.getBoolean(RELAY_KEY, false))
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
        const val RELAY_KEY = "ice_relay_only"
        const val MAX_AGE_MS = 4 * 60 * 1000L
        const val CALL_MAX_AGE_MS = 8 * 60 * 1000L
        val FALLBACK = IceConfig(
            listOf(PeerConnection.IceServer.builder("stun:stun.l.google.com:19302").createIceServer()),
            relayOnly = false,
        )
    }
}
