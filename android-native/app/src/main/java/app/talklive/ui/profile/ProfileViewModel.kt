package app.talklive.ui.profile

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.talklive.auth.AuthRepository
import app.talklive.auth.AuthResult
import app.talklive.data.IdentityStore
import app.talklive.data.ThemeStore
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class ProfileSheet { Delete, Edit, Animal, Nickname, Email, Password, Blocked, FriendId }

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val calls: app.talklive.call.CallManager,
    private val auth: AuthRepository,
    private val identity: IdentityStore,
    private val themeStore: ThemeStore,
    private val soundFx: app.talklive.sound.Sounds,
    private val privacy: app.talklive.data.PrivacyStore,
    private val socket: app.talklive.net.TalkSocket,
    private val social: app.talklive.social.SocialRepository,
    val notif: app.talklive.data.NotifSettings,
) : ViewModel() {
    val hideStatus = privacy.hideStatus
    val autoConnect = calls.autoConnect
    fun setAutoConnect(on: Boolean) = calls.setAutoConnect(on)
    val speakerDefault = calls.speakerDefault
    fun setSpeakerDefault(on: Boolean) = calls.setSpeakerDefault(on)
    val contactConsent = socket.contactConsent
    fun setContactConsent(on: Boolean) = socket.setContactConsent(on)
    val acceptCalls = privacy.acceptCalls
    val blocked = social.blocked
    val myFriendId = social.myFriendId

    fun setHideStatus(v: Boolean) {
        privacy.setHideStatus(v)
        socket.emit("set-status-visibility", org.json.JSONObject().put("hidden", v))
    }

    fun setAcceptCalls(v: Boolean) {
        privacy.setAcceptCalls(v)
        socket.emit("set-call-availability", org.json.JSONObject().put("accept", v))
    }

    fun unblock(id: String) = social.unblock(id)

    fun saveFriendId(handle: String) {
        if (busy) return
        busy = true; error = null
        viewModelScope.launch {
            val r = social.setHandle(handle)
            busy = false
            r.onSuccess { confirmThenClose("Friend ID updated") }.onFailure { error = it.message }
            busy = false
        }
    }
    val account = auth.account
    val animal = identity.animalFlow
    val dark = themeStore.dark
    val theme = themeStore.theme
    fun setTheme(t: app.talklive.ui.theme.AppTheme) = themeStore.set(t)

    var sheet by mutableStateOf<ProfileSheet?>(null); private set
    var busy by mutableStateOf(false); private set
    var error by mutableStateOf<String?>(null); private set
    /** Short confirmation shown after a change saves. */
    var saved by mutableStateOf<String?>(null)
    /** True for a moment after a save succeeds, so the button can show a check before the sheet closes. */
    var justDone by mutableStateOf(false); private set

    private suspend fun confirmThenClose(msg: String) {
        justDone = true
        kotlinx.coroutines.delay(650)
        justDone = false
        close(); saved = msg
    }

    fun open(s: ProfileSheet) { error = null; sheet = s }
    fun close() { sheet = null; error = null }
    fun clearError() { error = null }

    fun setAnimal(id: String) {
        auth.setAnimal(id)
        close()
    }

    fun toggleTheme() = themeStore.toggle()
    val sounds = soundFx.enabled
    val vibration = soundFx.vibration
    fun setVibration(on: Boolean) = soundFx.setVibration(on)
    val readReceipts = privacy.readReceipts
    fun setReadReceipts(on: Boolean) = privacy.setReadReceipts(on)
    fun setSounds(on: Boolean) { soundFx.setEnabled(on); if (on) soundFx.play(app.talklive.sound.Sounds.Fx.Message) }
    /** True while the server confirms the sign-out ("Signing out…"). */
    var signingOut by androidx.compose.runtime.mutableStateOf(false)
        private set
    fun signOut(allDevices: Boolean = false, onDone: () -> Unit = {}) {
        if (signingOut) return
        signingOut = true
        run {
            viewModelScope.launch {
                val started = System.currentTimeMillis()
                auth.signOut(allDevices)
                // Long enough to read, never longer than the work.
                val left = 900 - (System.currentTimeMillis() - started)
                if (left > 0) kotlinx.coroutines.delay(left)
                signingOut = false
                onDone()
            }
        }
    }
    fun deleteAccount(secret: String) = run("Account deleted") { auth.deleteAccount(secret) }

    fun saveNickname(nick: String) = run("Name updated") { auth.updateNickname(nick) }
    fun saveEmail(email: String, password: String) = run("Recovery email updated") { auth.updateRecoveryEmail(email, password) }
    fun savePassword(current: String, new: String) = run("Password changed") { auth.changePassword(current, new) }

    private fun run(done: String, block: suspend () -> AuthResult) {
        if (busy) return
        busy = true
        error = null
        viewModelScope.launch {
            when (val r = block()) {
                AuthResult.Ok -> { busy = false; confirmThenClose(done) }
                is AuthResult.Error -> error = r.message
            }
            busy = false
        }
    }
}
