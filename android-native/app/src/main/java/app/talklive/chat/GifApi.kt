package app.talklive.chat

import app.talklive.net.ServerConfig
import app.talklive.social.Gif
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.net.URLEncoder
import java.util.Locale
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

/** The website's GIF search (server /api/gifs, Giphy behind it). */
@Singleton
class GifApi @Inject constructor() {
    private val http = OkHttpClient.Builder().callTimeout(10, TimeUnit.SECONDS).build()
    private val cache = HashMap<String, List<Gif>>()
    @Volatile private var enabled: Boolean? = null

    /** False when the server has no Giphy key: then the app shows no GIF button. */
    suspend fun available(): Boolean = enabled ?: withContext(Dispatchers.IO) {
        runCatching { get("${ServerConfig.url}/api/gifs/config")?.optBoolean("enabled") == true }.getOrDefault(false).also { enabled = it }
    }

    /** Trending when [query] is blank. */
    suspend fun search(query: String): List<Gif> = withContext(Dispatchers.IO) {
        val q = query.trim().take(50)
        val lang = Locale.getDefault().language.takeIf { it.length == 2 } ?: "en"
        val key = "$q|$lang"
        cache[key]?.let { return@withContext it }
        val url = "${ServerConfig.url}/api/gifs?lang=$lang" + if (q.isNotEmpty()) "&q=" + URLEncoder.encode(q, "UTF-8") else ""
        val list = runCatching {
            val arr = get(url)?.optJSONArray("results") ?: return@runCatching emptyList()
            (0 until arr.length()).mapNotNull { arr.optJSONObject(it) }.mapNotNull { o ->
                val u = o.optString("url").takeIf { it.startsWith("https://") } ?: return@mapNotNull null
                Gif(u, o.optString("preview").ifBlank { u }, o.optInt("w"), o.optInt("h"), o.optString("alt").take(80))
            }
        }.getOrDefault(emptyList())
        if (list.isNotEmpty()) cache[key] = list
        list
    }

    private fun get(url: String): JSONObject? =
        http.newCall(Request.Builder().url(url).build()).execute().use { if (it.isSuccessful) JSONObject(it.body?.string().orEmpty()) else null }
}
