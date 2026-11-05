package app.talklive.push

import android.content.Context
import android.util.Log
import app.talklive.BuildConfig
import app.talklive.data.IdentityStore
import app.talklive.net.ServerEvent
import app.talklive.net.TalkSocket
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Hands this phone's Firebase token to the server (POST /push/native-subscribe)
 * so friend messages, requests and calls reach it while the app is closed.
 * Does nothing in builds without google-services.json.
 */
@Singleton
class PushRegistrar @Inject constructor(
    @ApplicationContext private val context: Context,
    private val identity: IdentityStore,
    socket: TalkSocket,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val prefs = context.getSharedPreferences("push", Context.MODE_PRIVATE)
    private val http = app.talklive.net.Http.client

    val available: Boolean get() = FirebaseApp.getApps(context).isNotEmpty()

    init {
        // Registering (or adopting an account's profile) can change the identity.
        scope.launch { socket.events.collect { if (it == ServerEvent.Registered) refresh() } }
    }

    fun refresh() {
        if (!available) return
        runCatching {
            FirebaseMessaging.getInstance().token.addOnSuccessListener { token -> scope.launch { send(token) } }
        }.onFailure { Log.w(TAG, "no FCM token", it) }
    }

    fun onNewToken(token: String) = scope.launch { send(token, force = true) }

    private fun send(token: String, force: Boolean = false) {
        val idToken = identity.identityToken ?: return
        val key = "${identity.clientId}|$token"
        if (!force && prefs.getString("sent", null) == key) return
        val body = JSONObject()
            .put("clientId", identity.clientId)
            .put("identityToken", idToken)
            .put("token", token)
            .put("platform", "android")
            .toString().toRequestBody("application/json".toMediaType())
        runCatching {
            http.newCall(Request.Builder().url("${app.talklive.net.ServerConfig.url}/push/native-subscribe").post(body).build()).execute().use {
                if (it.isSuccessful) prefs.edit().putString("sent", key).apply() else Log.w(TAG, "subscribe ${it.code}")
            }
        }.onFailure { Log.w(TAG, "subscribe failed", it) }
    }

    private companion object { const val TAG = "Push" }
}
