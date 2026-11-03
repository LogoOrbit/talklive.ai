package app.talklive.auth

import android.content.Context
import app.talklive.BuildConfig
import app.talklive.data.IdentityStore
import app.talklive.net.ServerEvent
import app.talklive.net.TalkSocket
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

data class Account(val username: String, val nickname: String, val email: String)

sealed interface AuthResult {
    data object Ok : AuthResult
    data class Error(val message: String) : AuthResult
}

/**
 * Accounts: email sign-up with a 6-digit code, password log-in, Google, and
 * silent resume with the saved session token on every (re)connect. Uses the
 * same socket events as the website, so one account works on both.
 */
@Singleton
class AuthRepository @Inject constructor(
    @ApplicationContext context: Context,
    private val socket: TalkSocket,
    private val identity: IdentityStore,
) {
    private val prefs = context.getSharedPreferences("account", Context.MODE_PRIVATE)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    private val _account = MutableStateFlow(loadAccount())
    val account: StateFlow<Account?> = _account

    /** True once the user has finished onboarding (signed in or chose guest). */
    private val _onboarded = MutableStateFlow(prefs.getBoolean(KEY_ONBOARDED, false))
    val onboarded: StateFlow<Boolean> = _onboarded

    init {
        scope.launch {
            socket.events.collect { if (it == ServerEvent.Registered) resume() }
        }
    }

    fun finishOnboarding() {
        prefs.edit().putBoolean(KEY_ONBOARDED, true).apply()
        _onboarded.value = true
    }

    suspend fun login(user: String, password: String): AuthResult =
        call("login", JSONObject().put("username", user.trim()).put("password", password), "login-result")

    suspend fun sendSignupCode(username: String, email: String): AuthResult =
        call(
            "signup-send-code",
            JSONObject().put("username", username.trim()).put("email", email.trim()),
            "signup-code-result",
            signsIn = false,
        )

    suspend fun signup(username: String, email: String, password: String, code: String): AuthResult =
        call(
            "signup",
            JSONObject().put("username", username.trim()).put("email", email.trim()).put("password", password).put("code", code),
            "signup-result",
        )

    suspend fun google(idToken: String): AuthResult =
        call("google-auth", JSONObject().put("credential", idToken), "google-auth-result")

    fun logout() {
        socket.emit("logout", JSONObject().put("token", prefs.getString(KEY_TOKEN, null)))
        prefs.edit().remove(KEY_TOKEN).remove(KEY_USERNAME).remove(KEY_NICKNAME).remove(KEY_EMAIL).apply()
        _account.value = null
    }

    /** The site's public Google web client ID, read from /config.js. */
    suspend fun googleClientId(): String? = withContext(Dispatchers.IO) {
        runCatching {
            OkHttpClient().newCall(Request.Builder().url("${BuildConfig.SERVER_URL}/config.js").build()).execute().use {
                Regex("GOOGLE_CLIENT_ID = \"([^\"]+)\"").find(it.body?.string().orEmpty())?.groupValues?.get(1)
            }
        }.getOrNull()
    }

    private suspend fun call(event: String, payload: JSONObject, result: String, signsIn: Boolean = true): AuthResult {
        if (!socket.connected.value) return AuthResult.Error("No connection. Check your internet and try again.")
        val res = try {
            socket.request(event, payload, result)
        } catch (_: TimeoutCancellationException) {
            return AuthResult.Error("The server did not answer. Please try again.")
        }
        if (!res.optBoolean("ok")) return AuthResult.Error(res.optString("error").ifBlank { "Something went wrong. Please try again." })
        if (signsIn) onSignedIn(res)
        return AuthResult.Ok
    }

    private fun onSignedIn(res: JSONObject) {
        val acc = Account(
            username = res.optString("username"),
            nickname = res.optString("nickname").ifBlank { res.optString("username") },
            email = res.optString("email"),
        )
        prefs.edit()
            .apply { res.optString("sessionToken").takeIf { it.isNotBlank() }?.let { putString(KEY_TOKEN, it) } }
            .putString(KEY_USERNAME, acc.username)
            .putString(KEY_NICKNAME, acc.nickname)
            .putString(KEY_EMAIL, acc.email)
            .apply()
        _account.value = acc
        finishOnboarding()
        adoptProfile(res)
    }

    private suspend fun resume() {
        val token = prefs.getString(KEY_TOKEN, null) ?: return
        val res = runCatching { socket.request("resume-session", JSONObject().put("token", token), "resume-session-result") }
            .getOrNull() ?: return
        if (res.optBoolean("ok")) {
            onSignedIn(res.put("sessionToken", token))
        } else {
            // Session revoked or expired: keep the app usable as a guest.
            prefs.edit().remove(KEY_TOKEN).apply()
            _account.value = null
        }
    }

    private fun adoptProfile(res: JSONObject) {
        val id = res.optString("profileClientId")
        val token = res.optString("identityToken")
        if (id.isNotBlank() && token.isNotBlank() && id != identity.clientId) {
            identity.adopt(id, token)
            socket.register()
        }
    }

    private fun loadAccount(): Account? {
        val u = prefs.getString(KEY_USERNAME, null) ?: return null
        if (prefs.getString(KEY_TOKEN, null) == null) return null
        return Account(u, prefs.getString(KEY_NICKNAME, u) ?: u, prefs.getString(KEY_EMAIL, "") ?: "")
    }

    private companion object {
        const val KEY_TOKEN = "session_token"
        const val KEY_USERNAME = "username"
        const val KEY_NICKNAME = "nickname"
        const val KEY_EMAIL = "email"
        const val KEY_ONBOARDED = "onboarded"
    }
}
