package app.talklive.data

import android.content.Context
import android.content.SharedPreferences
import app.talklive.net.TalkSocket
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONObject

/**
 * Settings that belong to the account, not the phone: saved to the server
 * whenever they change while signed in, and put back on every sign-in, on any
 * device. The same names are used by the website.
 */
class CloudSettings(
    private val context: Context,
    private val socket: TalkSocket,
) {
    private enum class Kind { Str, Bool }
    private data class Spec(val cloud: String, val file: String, val key: String, val kind: Kind)

    private val specs = listOf(
        Spec("theme", "ui", "theme", Kind.Str),
        Spec("sounds", "ui", "sounds", Kind.Bool),
        Spec("vibration", "ui", "vibration", Kind.Bool),
        Spec("autoConnect", "ui", "auto_connect", Kind.Bool),
        Spec("speakerDefault", "ui", "speaker_default", Kind.Bool),
        Spec("hideStatus", "privacy", "hide_status", Kind.Bool),
        Spec("acceptCalls", "privacy", "accept_calls", Kind.Bool),
        Spec("readReceipts", "privacy", "read_receipts", Kind.Bool),
    )
    private val files = specs.map { it.file }.distinct().associateWith { context.getSharedPreferences(it, Context.MODE_PRIVATE) }
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    @Volatile private var signedIn = false
    @Volatile private var applying = false
    private var pending: Job? = null

    // Held as fields: SharedPreferences only keeps weak references to listeners.
    private val listeners = files.map { (file, prefs) ->
        val l = SharedPreferences.OnSharedPreferenceChangeListener { _, key ->
            if (!applying && signedIn && specs.any { it.file == file && it.key == key }) pushSoon()
        }
        prefs.registerOnSharedPreferenceChangeListener(l)
        l
    }

    private fun snapshot(): JSONObject = JSONObject().apply {
        for (s in specs) {
            val p = files.getValue(s.file)
            if (!p.contains(s.key)) continue
            when (s.kind) {
                Kind.Str -> p.getString(s.key, null)?.let { put(s.cloud, it) }
                Kind.Bool -> put(s.cloud, p.getBoolean(s.key, false))
            }
        }
    }

    private fun pushSoon() {
        pending?.cancel()
        pending = scope.launch {
            delay(600)
            socket.emit("settings-save", JSONObject().put("settings", snapshot()))
        }
    }

    /** A sign-in: the account's saved settings replace the phone's; a new account takes the phone's. */
    fun onSignedIn(cloud: JSONObject?) {
        signedIn = true
        if (cloud == null || cloud.length() == 0) { pushSoon(); return }
        applying = true
        try {
            for (s in specs) {
                if (!cloud.has(s.cloud)) continue
                val e = files.getValue(s.file).edit()
                when (s.kind) {
                    Kind.Str -> e.putString(s.key, cloud.optString(s.cloud))
                    Kind.Bool -> e.putBoolean(s.key, cloud.optBoolean(s.cloud))
                }
                e.commit()
            }
        } finally { applying = false }
    }

    fun onSignedOut() { signedIn = false; pending?.cancel() }
}
