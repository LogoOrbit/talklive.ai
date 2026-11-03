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

enum class ProfileSheet { Animal, Nickname, Email, Password }

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val auth: AuthRepository,
    private val identity: IdentityStore,
    private val theme: ThemeStore,
) : ViewModel() {
    val account = auth.account
    val animal = identity.animalFlow
    val dark = theme.dark

    var sheet by mutableStateOf<ProfileSheet?>(null); private set
    var busy by mutableStateOf(false); private set
    var error by mutableStateOf<String?>(null); private set
    /** Short confirmation shown after a change saves. */
    var saved by mutableStateOf<String?>(null)

    fun open(s: ProfileSheet) { error = null; sheet = s }
    fun close() { sheet = null; error = null }

    fun setAnimal(id: String) {
        identity.animal = id
        close()
    }

    fun toggleTheme() = theme.toggle()
    fun signOut() = auth.logout()

    fun saveNickname(nick: String) = run("Name updated") { auth.updateNickname(nick) }
    fun saveEmail(email: String, password: String) = run("Recovery email updated") { auth.updateRecoveryEmail(email, password) }
    fun savePassword(current: String, new: String) = run("Password changed") { auth.changePassword(current, new) }

    private fun run(done: String, block: suspend () -> AuthResult) {
        if (busy) return
        busy = true
        error = null
        viewModelScope.launch {
            when (val r = block()) {
                AuthResult.Ok -> { close(); saved = done }
                is AuthResult.Error -> error = r.message
            }
            busy = false
        }
    }
}
