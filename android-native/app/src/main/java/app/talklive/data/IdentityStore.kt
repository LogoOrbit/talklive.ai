package app.talklive.data

import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * This device's TalkLive identity: the same pair the website keeps in
 * localStorage (`talklive_client_id` / `talklive_identity_token`). The server
 * signs the token; without it a clientId that owns friends or history is
 * refused, so both must survive app restarts.
 */
@Singleton
class IdentityStore(context: Context, name: String) {
    @Inject constructor(@ApplicationContext context: Context) : this(context, "identity")

    private val prefs = context.getSharedPreferences(name, Context.MODE_PRIVATE)

    val clientId: String
        get() = prefs.getString(KEY_CLIENT_ID, null) ?: newClientId()

    var identityToken: String?
        get() = prefs.getString(KEY_TOKEN, null)
        set(value) = prefs.edit().putString(KEY_TOKEN, value).apply()

    private val _animal = MutableStateFlow(prefs.getString(KEY_ANIMAL, null))
    val animalFlow: StateFlow<String?> = _animal

    var animal: String?
        get() = _animal.value
        set(value) {
            prefs.edit().putString(KEY_ANIMAL, value).apply()
            _animal.value = value
        }

    /** Switches to the profile an account owns, so its friends and history follow it to this phone. */
    fun adopt(clientId: String, token: String) {
        val changed = prefs.getString(KEY_CLIENT_ID, null) != clientId
        prefs.edit().putString(KEY_CLIENT_ID, clientId).putString(KEY_TOKEN, token).apply()
        if (changed) _switches.value++
    }

    private val _switches = MutableStateFlow(0)
    /** Bumps whenever this device moves to a different profile, so cached friends, chats and Plus can be dropped. */
    val switches: StateFlow<Int> = _switches

    /** Starts a fresh identity, for when the server cannot verify this one. */
    fun reset() {
        prefs.edit().remove(KEY_CLIENT_ID).remove(KEY_TOKEN).apply()
        _switches.value++
    }

    private fun newClientId(): String {
        // Server accepts /^[A-Za-z0-9_-]{8,64}$/.
        val id = "a_" + UUID.randomUUID().toString().replace("-", "")
        prefs.edit().putString(KEY_CLIENT_ID, id).apply()
        return id
    }

    private companion object {
        const val KEY_CLIENT_ID = "client_id"
        const val KEY_TOKEN = "identity_token"
        const val KEY_ANIMAL = "animal"
    }
}
