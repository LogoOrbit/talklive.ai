package app.talklive.ui

import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onEach
import androidx.lifecycle.ViewModel
import app.talklive.auth.AuthRepository
import android.content.Context
import app.talklive.call.CallManager
import app.talklive.call.CallMode
import app.talklive.data.Icebreaker
import app.talklive.data.Icebreakers
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import app.talklive.data.IdentityStore
import app.talklive.data.ThemeStore
import app.talklive.net.TalkSocket
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class TalkViewModel @Inject constructor(
    private val calls: CallManager,
    private val socket: TalkSocket,
    private val auth: AuthRepository,
    private val theme: ThemeStore,
    private val identity: IdentityStore,
    private val icebreakers: Icebreakers,
    private val games: app.talklive.game.Games,
    @ApplicationContext context: Context,
) : ViewModel() {
    private val prefs = context.getSharedPreferences("ui", Context.MODE_PRIVATE)
    private val _mode = MutableStateFlow(if (prefs.getString("mode", "talk") == "chat") CallMode.Chat else CallMode.Talk)
    /** What "Start" does on the Talk tab: a voice call or a text chat. */
    val mode: StateFlow<CallMode> = _mode
    val chat = calls.chat
    val reactions = calls.reactions
    val account = auth.account
    val onboarded = auth.onboarded
    val dark = theme.dark
    val animal = identity.animalFlow
    val state = calls.state
    val remoteLevel = calls.remoteLevel
    val voiceBands = calls.voiceBands
    val autoConnect = calls.autoConnect
    fun setAutoConnect(on: Boolean) = calls.setAutoConnect(on)
    val connected = socket.connected
    val elsewhere = socket.elsewhere
    val onlinePeople = socket.onlinePeople
    fun useHere() = socket.useHere()
    /** Today's visitors; the last known number while reconnecting, so Home never flashes "Connecting…". */
    val visitorCount = socket.visitorCount
        .onEach { n -> if (n != null) prefs.edit().putInt("visitors", n).apply() }
        .map { it ?: prefs.getInt("visitors", -1).takeIf { c -> c >= 0 } }
        .stateIn(viewModelScope, kotlinx.coroutines.flow.SharingStarted.Eagerly, prefs.getInt("visitors", -1).takeIf { it >= 0 })
    val warnings = socket.warnings
    val maintenance = socket.maintenance
    fun acknowledgeWarning(id: String) = socket.acknowledgeWarning(id)

    init {
        socket.connect()
    }

    fun start() = calls.start(_mode.value)
    fun setMode(m: CallMode) {
        _mode.value = m
        prefs.edit().putString("mode", m.wire).apply()
    }
    fun sendChat(text: String, replyTo: String? = null) = calls.sendChat(text, replyTo)
    fun sendGif(g: app.talklive.social.Gif) = calls.sendGif(g)
    fun typing() = calls.typing()
    fun reactToMessage(id: String, emoji: String) = calls.reactToMessage(id, emoji)
    fun react(type: String) = calls.react(type)
    suspend fun undoSkip() = calls.undoSkip()
    fun inviteVoice() = calls.inviteVoice()
    fun answerVoiceInvite(accept: Boolean) = calls.answerVoiceInvite(accept)
    fun clearVoiceInviteDeclined() = calls.clearVoiceInviteDeclined()
    fun rate(up: Boolean) = calls.rate(up)
    fun dismissRating() = calls.dismissRating()
    fun dismissMutualHeart() = calls.dismissMutualHeart()
    fun icebreakers(n: Int): List<Icebreaker> = icebreakers.draw(n)
    val game = games.ui
    fun inviteGame(k: app.talklive.game.GameKind) = games.invite(k)
    fun acceptGame() = games.accept()
    fun declineGame() = games.decline()
    fun tapCell(i: Int) = games.tapCell(i)
    fun drawEdge(k: Char, i: Int) = games.drawEdge(k, i)
    fun rematch() = games.rematch()
    fun leaveGame() = games.leave()
    fun next() = calls.next()
    fun end() = calls.end()
    fun toggleMute() = calls.toggleMute()
    fun toggleSpeaker() = calls.toggleSpeaker()
    val noiseSuppression = calls.noiseSuppression
    fun setNoiseSuppression(on: Boolean) = calls.setNoiseSuppression(on)
    fun report(reason: String) = calls.report(reason)
    fun dismissNotice() = calls.dismissNotice()
    fun signOut() = auth.logout()
    fun toggleTheme() = theme.toggle()
    fun setAnimal(id: String) { auth.setAnimal(id) }
}
