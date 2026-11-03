package app.talklive.data

import android.content.Context
import app.talklive.BuildConfig
import app.talklive.net.ServerEvent
import app.talklive.net.TalkSocket
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import org.json.JSONObject

/**
 * Saves an uncaught crash to disk and sends it to the server's error log
 * (the dashboard's Errors tab, same `client-error` event as the website) the
 * next time the app connects.
 */
object CrashReporter {
    private const val PREFS = "crash"

    fun install(context: Context) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val previous = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, e ->
            runCatching {
                prefs.edit()
                    .putString("message", "${e.javaClass.simpleName}: ${e.message}".take(400))
                    .putString("stack", e.stackTraceToString().take(4000))
                    .commit()
            }
            previous?.uncaughtException(thread, e)
        }
    }

    fun sendPending(context: Context, socket: TalkSocket) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val message = prefs.getString("message", null) ?: return
        CoroutineScope(SupervisorJob() + Dispatchers.Default).launch {
            socket.events.first { it == ServerEvent.Registered }
            socket.emit(
                "client-error",
                JSONObject()
                    .put("message", "[android ${BuildConfig.VERSION_NAME}] $message")
                    .put("stack", prefs.getString("stack", ""))
                    .put("url", "android://app"),
            )
            prefs.edit().clear().apply()
        }
    }
}
