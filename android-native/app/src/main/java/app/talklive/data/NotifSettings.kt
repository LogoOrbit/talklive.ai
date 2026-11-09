package app.talklive.data

import android.content.Context
import app.talklive.net.TalkSocket
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Which notifications this person wants, like any social app: messages,
 * calls, friend requests, friends coming online. Kept on the phone and sent to
 * the server, which skips pushes that are turned off (pushes are shown by the
 * system, so only the server can hold them back).
 */
@Singleton
class NotifSettings @Inject constructor(@ApplicationContext context: Context, private val socket: TalkSocket) {
    enum class Kind(val key: String) { Messages("messages"), Calls("calls"), Friends("friends"), Online("online") }

    private val prefs = context.getSharedPreferences("notif", Context.MODE_PRIVATE)
    private val _state = MutableStateFlow(Kind.entries.associateWith { prefs.getBoolean(it.key, true) })
    val state: StateFlow<Map<Kind, Boolean>> = _state

    init {
        socket.registerFields.add { it.put("notifPrefs", json()) }
    }

    fun allows(kind: Kind) = _state.value[kind] != false

    fun set(kind: Kind, on: Boolean) {
        prefs.edit().putBoolean(kind.key, on).apply()
        _state.value = _state.value + (kind to on)
        socket.emit("notif-prefs", JSONObject().put("prefs", json()))
    }

    private fun json() = JSONObject().apply { _state.value.forEach { (k, v) -> put(k.key, v) } }
}
