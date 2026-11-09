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
    /** When each setting was last changed on this phone (ms). Newer always wins; nothing is ever wiped by an older copy. */
    private val times = context.getSharedPreferences("cloud_t", Context.MODE_PRIVATE)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    @Volatile private var signedIn = false
    @Volatile private var applying = false
    private val dirty = java.util.concurrent.ConcurrentHashMap.newKeySet<String>()
    private var pending: Job? = null

    // Held as fields: SharedPreferences only keeps weak references to listeners.
    private val listeners = files.map { (file, prefs) ->
        val l = SharedPreferences.OnSharedPreferenceChangeListener { _, key ->
            if (applying) return@OnSharedPreferenceChangeListener
            val spec = specs.firstOrNull { it.file == file && it.key == key } ?: return@OnSharedPreferenceChangeListener
            // A choice made on this phone: stamp it, and send just that one.
            times.edit().putLong(spec.cloud, System.currentTimeMillis()).apply()
            dirty.add(spec.cloud)
            if (signedIn) pushSoon()
        }
        prefs.registerOnSharedPreferenceChangeListener(l)
        l
    }

    private fun valueOf(s: Spec): Any? {
        val p = files.getValue(s.file)
        if (!p.contains(s.key)) return null
        return when (s.kind) { Kind.Str -> p.getString(s.key, null); Kind.Bool -> p.getBoolean(s.key, false) }
    }

    private fun push(keys: Collection<String>) {
        if (keys.isEmpty()) return
        val settings = JSONObject(); val ts = JSONObject()
        for (s in specs) {
            if (s.cloud !in keys) continue
            val v = valueOf(s) ?: continue
            settings.put(s.cloud, v)
            ts.put(s.cloud, times.getLong(s.cloud, 1L).coerceAtLeast(1L))
        }
        if (settings.length() > 0) socket.emit("settings-save", JSONObject().put("settings", settings).put("times", ts))
    }

    private fun pushSoon() {
        pending?.cancel()
        pending = scope.launch {
            delay(600)
            val keys = dirty.toList(); dirty.clear()
            push(keys)
        }
    }

    /**
     * A sign-in: each setting goes whichever way is newer. The account's copy
     * is used only where it was changed more recently than this phone's; this
     * phone's newer choices are sent up. Nothing is reset or wiped.
     */
    fun onSignedIn(cloud: JSONObject?) {
        signedIn = true
        val cloudT = cloud?.optJSONObject("_t")
        val upload = mutableListOf<String>()
        applying = true
        try {
            for (s in specs) {
                val local = times.getLong(s.cloud, 0L)
                val remote = cloudT?.optLong(s.cloud, 0L) ?: 0L
                if (cloud != null && cloud.has(s.cloud) && remote > local) {
                    val e = files.getValue(s.file).edit()
                    when (s.kind) {
                        Kind.Str -> e.putString(s.key, cloud.optString(s.cloud))
                        Kind.Bool -> e.putBoolean(s.key, cloud.optBoolean(s.cloud))
                    }
                    e.commit()
                    times.edit().putLong(s.cloud, remote).apply()
                } else if (valueOf(s) != null && (local > remote || cloud == null || !cloud.has(s.cloud))) {
                    upload += s.cloud
                }
            }
        } finally { applying = false }
        push(upload + dirty.toList().also { dirty.clear() })
    }

    fun onSignedOut() { signedIn = false; pending?.cancel() }
}
