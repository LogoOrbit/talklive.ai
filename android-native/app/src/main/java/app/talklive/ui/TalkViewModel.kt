package app.talklive.ui

import androidx.lifecycle.ViewModel
import app.talklive.auth.AuthRepository
import app.talklive.call.CallManager
import app.talklive.net.TalkSocket
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class TalkViewModel @Inject constructor(
    private val calls: CallManager,
    private val socket: TalkSocket,
    private val auth: AuthRepository,
) : ViewModel() {
    val account = auth.account
    val onboarded = auth.onboarded
    val state = calls.state
    val connected = socket.connected
    val onlineCount = socket.onlineCount

    init {
        socket.connect()
    }

    fun start() = calls.start()
    fun next() = calls.next()
    fun end() = calls.end()
    fun toggleMute() = calls.toggleMute()
    fun toggleSpeaker() = calls.toggleSpeaker()
    fun report(reason: String) = calls.report(reason)
    fun dismissNotice() = calls.dismissNotice()
    fun signOut() = auth.logout()
}
