package app.talklive.posts

import app.talklive.data.IdentityStore
import app.talklive.net.Http
import app.talklive.net.ServerConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.withContext
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

val REACTION_TYPES = listOf("like", "love", "haha", "wow", "sad")

data class PostComment(val id: String, val name: String, val avatar: String?, val text: String, val ts: Long, val admin: Boolean)

data class Post(
    val id: String,
    val text: String,
    val image: String?,
    val createdAt: Long,
    val counts: Map<String, Int>,
    val total: Int,
    val mine: String?,
    val commentCount: Int,
    val comments: List<PostComment>,
    val pinned: Boolean = false,
    /** "news" for TalkLive News (has a title and a tag), "post" otherwise. */
    val kind: String = "post",
    val title: String? = null,
    /** update, feature, upcoming, fix or event (news only). */
    val tag: String? = null,
)

data class PostsState(
    val posts: List<Post> = emptyList(),
    val canComment: Boolean = false,
    val loading: Boolean = false,
    val error: Boolean = false,
    val loaded: Boolean = false,
)

/**
 * TalkLive's own posts (spec 7). Loaded only when asked (the news screen opens, or Home once per app
 * open): no background polling.
 */
@Singleton
class PostsRepository @Inject constructor(private val identity: IdentityStore) {
    private val http = Http.withTimeout(12)
    private val _state = MutableStateFlow(PostsState())
    val state: StateFlow<PostsState> = _state

    @Volatile private var fetchedOnce = false

    /** Home: fetch once per app open; later calls are free. */
    suspend fun loadOnce() { if (!fetchedOnce) load() }

    suspend fun load() {
        fetchedOnce = true
        _state.update { it.copy(loading = true, error = false) }
        val result = withContext(Dispatchers.IO) {
            runCatching {
                val url = "${ServerConfig.url}/api/posts".toHttpUrl().newBuilder()
                    .addQueryParameter("clientId", identity.clientId)
                    .addQueryParameter("identityToken", identity.identityToken ?: "")
                    .build()
                http.newCall(Request.Builder().url(url).build()).execute().use { res ->
                    if (!res.isSuccessful) error("http ${res.code}")
                    JSONObject(res.body?.string().orEmpty())
                }
            }.getOrNull()
        }
        if (result == null) {
            _state.update { it.copy(loading = false, error = !it.loaded) }
            return
        }
        val arr = result.optJSONArray("posts")
        val posts = if (arr == null) emptyList() else (0 until arr.length()).mapNotNull { arr.optJSONObject(it)?.let(::parsePost) }
        _state.value = PostsState(posts, result.optBoolean("canComment"), loading = false, error = false, loaded = true)
    }

    /** One reaction per person: the same type again removes it. Shown at once, undone if the server refuses. */
    suspend fun react(postId: String, type: String?): Boolean {
        val before = _state.value.posts.firstOrNull { it.id == postId } ?: return false
        replace(postId) { p ->
            val counts = p.counts.toMutableMap()
            p.mine?.let { counts[it] = ((counts[it] ?: 1) - 1).coerceAtLeast(0) }
            type?.let { counts[it] = (counts[it] ?: 0) + 1 }
            p.copy(mine = type, counts = counts, total = counts.values.sum())
        }
        val res = post("/api/posts/$postId/react", JSONObject().put("type", type ?: JSONObject.NULL))
        if (res == null) { replace(postId) { before }; return false }
        parsePost(res.optJSONObject("post") ?: res)?.let { fresh -> replace(postId) { fresh.copy(comments = if (fresh.comments.isEmpty()) it.comments else fresh.comments) } }
        return true
    }

    /** Returns null when posted, else the reason: verify, rate, blocked or error. */
    suspend fun comment(postId: String, text: String): String? {
        val res = post("/api/posts/$postId/comments", JSONObject().put("text", text)) ?: return "error"
        if (!res.optBoolean("ok")) return res.optString("reason").ifBlank { "error" }
        res.optJSONObject("comment")?.let(::parseComment)?.let { c ->
            replace(postId) { it.copy(comments = it.comments + c, commentCount = it.commentCount + 1) }
        }
        return null
    }

    private fun replace(id: String, f: (Post) -> Post) =
        _state.update { s -> s.copy(posts = s.posts.map { if (it.id == id) f(it) else it }) }

    private suspend fun post(path: String, extra: JSONObject): JSONObject? = withContext(Dispatchers.IO) {
        runCatching {
            val body = extra.put("clientId", identity.clientId).put("identityToken", identity.identityToken ?: "")
                .toString().toRequestBody("application/json".toMediaType())
            http.newCall(Request.Builder().url("${ServerConfig.url}$path").post(body).build()).execute().use { res ->
                val text = res.body?.string().orEmpty()
                // A refused comment answers with a reason in the body; keep it.
                if (text.isBlank()) null else JSONObject(text)
            }
        }.getOrNull()
    }

    private fun parsePost(o: JSONObject): Post? {
        val id = o.optString("id").ifBlank { return null }
        val c = o.optJSONObject("counts")
        val counts = REACTION_TYPES.associateWith { c?.optInt(it) ?: 0 }
        val arr = o.optJSONArray("comments")
        val comments = if (arr == null) emptyList() else (0 until arr.length()).mapNotNull { arr.optJSONObject(it)?.let(::parseComment) }
        return Post(
            id = id,
            text = o.optString("text"),
            image = o.optString("image").takeIf { it.isNotBlank() && it != "null" }?.let { if (it.startsWith("/")) ServerConfig.url + it else it },
            createdAt = o.optLong("createdAt"),
            counts = counts,
            total = c?.optInt("total", counts.values.sum()) ?: counts.values.sum(),
            mine = if (o.isNull("mine")) null else o.optString("mine").takeIf { it.isNotBlank() },
            commentCount = o.optInt("commentCount", comments.size),
            comments = comments,
            pinned = o.optBoolean("pinned"),
            kind = o.optString("kind").ifBlank { "post" },
            title = if (o.isNull("title")) null else o.optString("title").takeIf { it.isNotBlank() },
            tag = if (o.isNull("tag")) null else o.optString("tag").takeIf { it.isNotBlank() },
        )
    }

    private fun parseComment(o: JSONObject) = PostComment(
        id = o.optString("id"),
        name = o.optString("name").ifBlank { "TalkLive" },
        avatar = if (o.isNull("avatar")) null else o.optString("avatar").takeIf { it.isNotBlank() },
        text = o.optString("text"),
        ts = o.optLong("ts"),
        admin = o.optBoolean("admin"),
    )
}
