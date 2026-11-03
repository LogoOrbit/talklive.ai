package app.talklive.ui.social

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.talklive.social.FoundUser
import app.talklive.social.Person
import app.talklive.social.SocialRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

/** One row in the Chats list. */
data class Conversation(val person: Person, val unread: Int, val typing: Boolean, val muted: Boolean, val isFriend: Boolean)

@HiltViewModel
class SocialViewModel @Inject constructor(
    private val repo: SocialRepository,
    private val player: app.talklive.voice.VoicePlayer,
) : ViewModel() {
    val voice = repo.voice
    val playback = player.state
    fun requestVoice(id: String) = repo.requestVoice(id)
    fun respondVoice(id: String, accept: Boolean) = repo.respondVoice(id, accept)
    fun disableVoice(id: String) = repo.disableVoice(id)
    fun sendVoice(to: String, audio: ByteArray, ms: Long) = repo.sendVoice(to, audio, ms)
    fun play(chatWith: String, voiceId: String) = player.toggle(voiceId) { repo.fetchVoice(voiceId, chatWith) }
    override fun onCleared() { player.stop() }

    val friends = repo.friends
    val requests = repo.requests
    val sent = repo.sent
    val history = repo.history
    val unread = repo.unread
    val typing = repo.typing
    val threads = repo.threads
    val muted = repo.muted
    val myFriendId = repo.myFriendId
    val incoming = repo.incoming
    val outgoing = repo.outgoing
    val toasts = repo.toasts

    /** Friends, then people met recently, sorted by the latest message. */
    val conversations: StateFlow<List<Conversation>> = combine(
        repo.friends, repo.history, repo.unread, repo.typing, repo.muted,
    ) { friends, history, unread, typing, muted ->
        val friendIds = friends.map { it.clientId }.toSet()
        val all = friends.filter { it.last != null } + history.filter { it.clientId !in friendIds && it.last != null }
        all.sortedByDescending { it.last?.ts ?: 0 }
            .map { Conversation(it, unread[it.clientId] ?: 0, it.clientId in typing, it.clientId in muted, it.clientId in friendIds) }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val totalUnread: StateFlow<Int> = combine(repo.unread, repo.muted) { u, m -> u.filterKeys { it !in m }.values.sum() }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    fun person(id: String): Person? = repo.person(id)
    fun sendRequest(id: String, friendId: String? = null) = repo.sendRequest(id, friendId)
    fun respond(id: String, accept: Boolean) = repo.respond(id, accept)
    fun remove(id: String) = repo.remove(id)
    fun block(id: String) = repo.block(id)
    fun setPinned(id: String, pinned: Boolean) = repo.setPinned(id, pinned)
    fun setMuted(id: String, muted: Boolean) = repo.setMuted(id, muted)
    fun rename(id: String, name: String) = repo.rename(id, name)
    suspend fun find(friendId: String): Result<FoundUser> = repo.find(friendId)

    fun openChat(id: String?) {
        repo.openChat = id
        if (id != null) repo.loadThread(id)
    }
    fun send(to: String, text: String, replyTo: String?) = repo.send(to, text, replyTo)
    fun retry(to: String, id: String) = repo.retry(to, id)
    fun typing(to: String) = repo.typing(to)
    fun edit(to: String, id: String, text: String) = repo.edit(to, id, text)
    fun delete(to: String, id: String) = repo.delete(to, id)
    fun react(to: String, id: String, emoji: String) = repo.react(to, id, emoji)
    fun clearChat(id: String) = repo.clearChat(id)
    fun report(id: String, reason: String) = repo.report(id, reason)
    fun cancelRequest(id: String) = repo.cancelRequest(id)
    fun callLater(id: String) = repo.callLater(id)
    val blocked = repo.blocked
    val activity = repo.activity
    fun unblock(id: String) = repo.unblock(id)
    fun clearActivity(id: String) = repo.clearActivity(id)
    fun markActivitySeen() = repo.markActivitySeen()
    suspend fun setHandle(h: String) = repo.setHandle(h)

    fun call(p: Person) = repo.call(p)
    fun cancelCall() = repo.cancelCall()
    fun answer(accept: Boolean) = repo.answer(accept)
}
