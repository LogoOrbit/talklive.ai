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
class AuthRepository(
    context: Context,
    private val socket: TalkSocket,
    private val identity: IdentityStore,
    prefsName: String,
) {
    @Inject constructor(@ApplicationContext context: Context, socket: TalkSocket, identity: IdentityStore) :
        this(context, socket, identity, "account")

    private val prefs = context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    private val _account = MutableStateFlow(loadAccount())
    val account: StateFlow<Account?> = _account

    /** True once the user has finished onboarding (signed in or chose guest). */
    private val _onboarded = MutableStateFlow(prefs.getBoolean(KEY_ONBOARDED, false))
    val onboarded: StateFlow<Boolean> = _onboarded

    /** The display name sent with the last registration (the server shows it to people you meet). */
    @Volatile private var sentNickname: String? = null

    init {
        // Like the website: registration carries the account's display name, or
        // everyone sees a random guest name instead of the one you chose.
        socket.registerFields.add { o ->
            val nick = _account.value?.nickname?.takeIf { it.isNotBlank() }
            nick?.let { o.put("nickname", it) }
            sentNickname = nick
        }
        scope.launch {
            socket.events.collect { if (it == ServerEvent.Registered) resume() }
        }
    }

    /** Re-register only when the name people see would change (no loop with resume). */
    private fun syncNickname() {
        val nick = _account.value?.nickname?.takeIf { it.isNotBlank() }
        if (nick != sentNickname) socket.register()
    }

    /** The durable session token of a signed-in account, for HTTP APIs. */
    val sessionToken: String? get() = prefs.getString(KEY_TOKEN, null)

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

    suspend fun updateNickname(nickname: String): AuthResult {
        val (r, res) = callRaw("update-nickname", JSONObject().put("nickname", nickname.trim()), "update-nickname-result")
        if (r == AuthResult.Ok) {
            val nick = res.optString("nickname").ifBlank { nickname.trim() }
            prefs.edit().putString(KEY_NICKNAME, nick).apply()
            _account.value = _account.value?.copy(nickname = nick)
            syncNickname()
        }
        return r
    }

    suspend fun changePassword(current: String, new: String): AuthResult =
        callRaw("change-password", JSONObject().put("currentPassword", current).put("newPassword", new), "change-password-result").first

    suspend fun updateRecoveryEmail(email: String, currentPassword: String): AuthResult {
        val (r, _) = callRaw(
            "update-recovery-email",
            JSONObject().put("email", email.trim()).put("currentPassword", currentPassword),
            "update-recovery-email-result",
        )
        if (r == AuthResult.Ok) {
            prefs.edit().putString(KEY_EMAIL, email.trim()).apply()
            _account.value = _account.value?.copy(email = email.trim())
        }
        return r
    }

    /** Password reset, step 1: email a code. */
    suspend fun forgotPassword(email: String): AuthResult =
        callRaw("forgot-password", JSONObject().put("email", email.trim()), "forgot-password-result").first

    /** Step 2: trade the code for a one-time reset token. */
    suspend fun verifyResetCode(email: String, code: String): Pair<AuthResult, String?> {
        val (r, res) = callRaw("verify-reset-code", JSONObject().put("email", email.trim()).put("code", code), "verify-reset-code-result")
        return r to res.optString("resetToken").takeIf { it.isNotBlank() }
    }

    /** Step 3: set the new password; the server signs this device in. */
    suspend fun resetPassword(resetToken: String, newPassword: String): AuthResult =
        call("reset-password", JSONObject().put("resetToken", resetToken).put("newPassword", newPassword), "reset-password-result")

    /** Deletes the account for good. [secret] is the password, or DELETE for a Google-only account. */
    suspend fun deleteAccount(secret: String): AuthResult {
        val (r, _) = callRaw("delete-account", JSONObject().put("currentPassword", secret).put("confirm", secret.trim()), "delete-account-result")
        if (r !is AuthResult.Error) {
            prefs.edit().remove(KEY_TOKEN).remove(KEY_USERNAME).remove(KEY_NICKNAME).remove(KEY_EMAIL).apply()
            _account.value = null
            // The profile went with the account: start fresh as a guest.
            identity.reset()
            socket.register()
        }
        return r
    }

    fun logout() {
        socket.emit("logout", JSONObject().put("token", prefs.getString(KEY_TOKEN, null)))
        prefs.edit().remove(KEY_TOKEN).remove(KEY_USERNAME).remove(KEY_NICKNAME).remove(KEY_EMAIL).apply()
        _account.value = null
    }

    /** The site's public Google web client ID, read from /config.js. */
    suspend fun googleClientId(): String? = withContext(Dispatchers.IO) {
        runCatching {
            OkHttpClient().newCall(Request.Builder().url("${app.talklive.net.ServerConfig.url}/config.js").build()).execute().use {
                Regex("GOOGLE_CLIENT_ID = \"([^\"]+)\"").find(it.body?.string().orEmpty())?.groupValues?.get(1)
            }
        }.getOrNull()
    }

    private suspend fun call(event: String, payload: JSONObject, result: String, signsIn: Boolean = true): AuthResult {
        val (r, res) = callRaw(event, payload, result)
        if (r == AuthResult.Ok && signsIn) onSignedIn(res)
        return r
    }

    private suspend fun callRaw(event: String, payload: JSONObject, result: String): Pair<AuthResult, JSONObject> {
        if (!socket.connected.value) return AuthResult.Error("No connection. Check your internet and try again.") to JSONObject()
        val res = try {
            socket.request(event, payload, result)
        } catch (_: TimeoutCancellationException) {
            return AuthResult.Error("The server did not answer. Please try again.") to JSONObject()
        }
        if (!res.optBoolean("ok")) {
            return AuthResult.Error(res.optString("error").ifBlank { "Something went wrong. Please try again." }) to res
        }
        return AuthResult.Ok to res
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
        // The avatar saved with the account follows it to this device.
        res.optString("animal").takeIf { it.isNotBlank() && it != "null" && it != identity.animal }?.let { identity.animal = it }
        finishOnboarding()
        adoptProfile(res)
        syncNickname()
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
