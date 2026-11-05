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
    private val http = app.talklive.net.Http.withTimeout(10)
    private val cache = java.util.concurrent.ConcurrentHashMap<String, List<Gif>>()
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
                Gif(u, lighter(o.optString("preview").ifBlank { u }), o.optInt("w"), o.optInt("h"), o.optString("alt").take(80))
            }
        }.getOrDefault(emptyList())
        if (list.isNotEmpty()) cache[key] = list
        list
    }

    /** What is already loaded for [query], so the panel can show it at once. */
    fun cached(query: String): List<Gif>? {
        val lang = Locale.getDefault().language.takeIf { it.length == 2 } ?: "en"
        return cache["${query.trim().take(50)}|$lang"]
    }

    /** Loads trending GIFs and their first previews ahead of time, so the panel opens filled. */
    suspend fun warm(context: android.content.Context) {
        if (!available()) return
        val loader = coil.Coil.imageLoader(context)
        search("").take(10).forEach { g ->
            loader.enqueue(coil.request.ImageRequest.Builder(context).data(g.preview).build())
        }
    }

    // Giphy serves the same animation as WebP at roughly half the size; phones
    // from Android 9 play animated WebP, older ones keep the GIF.
    private fun lighter(url: String): String =
        if (android.os.Build.VERSION.SDK_INT >= 28) url.replace(Regex("\\.gif(?=\\?|$)"), ".webp") else url

    private fun get(url: String): JSONObject? =
        http.newCall(Request.Builder().url(url).build()).execute().use { if (it.isSuccessful) JSONObject(it.body?.string().orEmpty()) else null }
}
