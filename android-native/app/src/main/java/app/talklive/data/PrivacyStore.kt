package app.talklive.data

import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * The privacy switches the website keeps in localStorage: whether friends see
 * you online, and whether friends may call you. Sent with every registration
 * (the device's copy wins, as on the web) and on every change.
 */
@Singleton
class PrivacyStore(context: Context, name: String) {
    @Inject constructor(@ApplicationContext context: Context) : this(context, "privacy")

    private val prefs = context.getSharedPreferences(name, Context.MODE_PRIVATE)

    private val _hideStatus = MutableStateFlow(prefs.getBoolean("hide_status", false))
    val hideStatus: StateFlow<Boolean> = _hideStatus

    private val _acceptCalls = MutableStateFlow(prefs.getBoolean("accept_calls", true))
    val acceptCalls: StateFlow<Boolean> = _acceptCalls

    private val _readReceipts = MutableStateFlow(prefs.getBoolean("read_receipts", true))
    /** Read receipts: whether people see "Seen" when you have read their messages. */
    val readReceipts: StateFlow<Boolean> = _readReceipts
    fun setReadReceipts(v: Boolean) { prefs.edit().putBoolean("read_receipts", v).apply(); _readReceipts.value = v }

    private val _archived = MutableStateFlow(prefs.getStringSet("archived", emptySet()).orEmpty().toSet())
    /** Chats moved out of the list (kept on this phone; a new message brings one back). */
    val archived: StateFlow<Set<String>> = _archived
    fun setArchived(clientId: String, on: Boolean) {
        val next = if (on) _archived.value + clientId else _archived.value - clientId
        prefs.edit().putStringSet("archived", next).apply(); _archived.value = next
    }

    fun setHideStatus(v: Boolean) { prefs.edit().putBoolean("hide_status", v).apply(); _hideStatus.value = v }
    fun setAcceptCalls(v: Boolean) { prefs.edit().putBoolean("accept_calls", v).apply(); _acceptCalls.value = v }
}
