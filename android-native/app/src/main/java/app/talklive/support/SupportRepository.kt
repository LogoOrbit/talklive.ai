package app.talklive.support

import android.content.Context
import app.talklive.auth.AuthRepository
import app.talklive.data.IdentityStore
import app.talklive.net.ServerConfig
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

data class SupportMessage(val id: String, val fromTeam: Boolean, val text: String, val ts: Long)
data class SupportThread(val messages: List<SupportMessage>, val teamOnline: Boolean)
data class SupportConfig(val online: Boolean, val greeting: String, val awayMessage: String, val email: String?)

/**
 * Chat with the TalkLive team: the same /support/api the website's help
 * bubble uses. Answers come from the owner dashboard (and by email).
 */
@Singleton
class SupportRepository @Inject constructor(
    @ApplicationContext context: Context,
    private val auth: AuthRepository,
    private val identity: IdentityStore,
) {
    private val prefs = context.getSharedPreferences("support", Context.MODE_PRIVATE)
    private val http = app.talklive.net.Http.client

    val hasConversation: Boolean get() = prefs.getString("id", null) != null

    suspend fun config(): SupportConfig? = post("config", JSONObject())?.let {
        SupportConfig(it.optBoolean("online"), it.optString("greeting"), it.optString("awayMessage"), it.optJSONObject("account")?.optString("email"))
    }

    /** First message: opens the conversation. [email] is needed for guests. */
    suspend fun start(text: String, email: String?): Result<SupportThread> {
        val res = post(
            "start",
            JSONObject().put("text", text).put("email", email.orEmpty()).put("clientId", identity.clientId).put("page", "android-app"),
        ) ?: return Result.failure(Exception("No connection. Try again."))
        res.optString("error").takeIf { it.isNotBlank() }?.let { return Result.failure(Exception(app.talklive.ui.components.friendlyError(it))) }
        prefs.edit().putString("id", res.optString("id")).putString("key", res.optString("key")).apply()
        return Result.success(thread(res, online = false))
    }

    suspend fun refresh(): SupportThread? {
        val id = prefs.getString("id", null) ?: run {
            // A signed-in account may have a conversation from another device.
            val mine = post("mine", JSONObject())?.optJSONObject("conversation") ?: return null
            prefs.edit().putString("id", mine.optString("id")).apply()
            return thread(JSONObject().put("conversation", mine), online = false)
        }
        val res = post("thread", JSONObject().put("id", id).put("key", prefs.getString("key", null))) ?: return null
        if (res.has("error")) { prefs.edit().clear().apply(); return null }
        return thread(res, res.optBoolean("online"))
    }

    suspend fun send(text: String): Result<SupportThread> {
        val id = prefs.getString("id", null) ?: return Result.failure(Exception("Start a conversation first."))
        val res = post("send", JSONObject().put("id", id).put("key", prefs.getString("key", null)).put("text", text))
            ?: return Result.failure(Exception("No connection. Try again."))
        res.optString("error").takeIf { it.isNotBlank() }?.let { return Result.failure(Exception(app.talklive.ui.components.friendlyError(it))) }
        return Result.success(thread(res, online = false))
    }

    private fun thread(res: JSONObject, online: Boolean): SupportThread {
        val arr = res.optJSONObject("conversation")?.optJSONArray("messages")
        val list = if (arr == null) emptyList() else (0 until arr.length()).mapNotNull { arr.optJSONObject(it) }.map {
            SupportMessage(it.optString("id"), it.optString("from") != "user", it.optString("text"), it.optLong("ts"))
        }
        return SupportThread(list, online)
    }

    private suspend fun post(path: String, body: JSONObject): JSONObject? = withContext(Dispatchers.IO) {
        auth.sessionToken?.let { body.put("sessionToken", it) }
        runCatching {
            http.newCall(
                Request.Builder().url("${ServerConfig.url}/support/api/$path")
                    .post(body.toString().toRequestBody("application/json".toMediaType())).build(),
            ).execute().use { JSONObject(it.body?.string().orEmpty().ifBlank { "{}" }) }
        }.getOrNull()
    }
}
