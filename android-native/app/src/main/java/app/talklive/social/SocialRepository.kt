package app.talklive.social

import app.talklive.R
import app.talklive.data.IdentityStore
import app.talklive.data.UiText
import app.talklive.net.ServerEvent
import app.talklive.net.TalkSocket
import app.talklive.net.optNullableString
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.security.SecureRandom
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Friends, requests, recent people, direct messages and friend calls, kept in
 * sync with the server through the same socket events as the website.
 */
@OptIn(ExperimentalCoroutinesApi::class)
@Singleton
class SocialRepository @Inject constructor(
    private val socket: TalkSocket,
    private val identity: IdentityStore,
    private val privacy: app.talklive.data.PrivacyStore? = null,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default.limitedParallelism(1))

    private val _friends = MutableStateFlow<List<Person>>(emptyList())
    val friends: StateFlow<List<Person>> = _friends

    private val _requests = MutableStateFlow<List<Person>>(emptyList())
    val requests: StateFlow<List<Person>> = _requests

    private val _sent = MutableStateFlow<Set<String>>(emptySet())
    /** People this user asked to be friends and has not heard back from. */
    val sent: StateFlow<Set<String>> = _sent

    private val _history = MutableStateFlow<List<Person>>(emptyList())
    /** People met on calls in the last day, newest first. */
    val history: StateFlow<List<Person>> = _history

    private val _unread = MutableStateFlow<Map<String, Int>>(emptyMap())
    val unread: StateFlow<Map<String, Int>> = _unread

    private val _muted = MutableStateFlow<Set<String>>(emptySet())
    val muted: StateFlow<Set<String>> = _muted

    private val _threads = MutableStateFlow<Map<String, List<ChatMessage>>>(emptyMap())
    val threads: StateFlow<Map<String, List<ChatMessage>>> = _threads

    private val _typing = MutableStateFlow<Set<String>>(emptySet())
    val typing: StateFlow<Set<String>> = _typing

    private val _myFriendId = MutableStateFlow<String?>(null)
    val myFriendId: StateFlow<String?> = _myFriendId

    private val _incoming = MutableStateFlow<IncomingCall?>(null)
    val incoming: StateFlow<IncomingCall?> = _incoming

    private val _outgoing = MutableStateFlow<OutgoingCall?>(null)
    val outgoing: StateFlow<OutgoingCall?> = _outgoing

    private val _gates = MutableStateFlow<Map<String, String>>(emptyMap())
    /** The server's latest word on whether a non-friend can be messaged (open, one, accept, request, waiting). */
    val gates: StateFlow<Map<String, String>> = _gates
    private val _voice = MutableStateFlow<Map<String, String>>(emptyMap())
    /** Voice-message permission per friend: off, sent, received or on. */
    val voice: StateFlow<Map<String, String>> = _voice

    private val _blocked = MutableStateFlow<List<BlockedPerson>>(emptyList())
    val blocked: StateFlow<List<BlockedPerson>> = _blocked

    private val _activity = MutableStateFlow<List<ActivityItem>>(emptyList())
    /** Missed friend calls and accepted requests, newest first. */
    val activity: StateFlow<List<ActivityItem>> = _activity

    private val _toasts = MutableSharedFlow<UiText>(extraBufferCapacity = 8)
    /** Short messages for the user ("Friend request sent"). */
    val toasts: SharedFlow<UiText> = _toasts

    /** The conversation on screen, so its messages do not count as unread. */
    @Volatile var openChat: String? = null
        set(value) {
            field = value
            if (value != null) markRead(value)
        }

    private val typingJobs = mutableMapOf<String, Job>()
    private var lastTypingSent = 0L
    private val random = SecureRandom()

    init {
        socket.on("state-sync") { a -> (a.firstOrNull() as? JSONObject)?.let { scope.launch { onStateSync(it) } } }
        socket.on("friend-id") { a -> (a.firstOrNull() as? JSONObject)?.optNullableString("friendId")?.let { _myFriendId.value = it } }
        socket.on("friend-online") { a ->
            val id = (a.firstOrNull() as? JSONObject)?.optString("clientId") ?: return@on
            scope.launch { _friends.update { list -> list.map { if (it.clientId == id) it.copy(online = true) else it } } }
        }
        socket.on("friend-message") { a -> (a.firstOrNull() as? JSONObject)?.let { scope.launch { onIncomingMessage(it) } } }
        socket.on("friend-message-sent") { a -> (a.firstOrNull() as? JSONObject)?.let { scope.launch { onSent(it) } } }
        socket.on("chat-blocked") { a -> (a.firstOrNull() as? JSONObject)?.let { scope.launch { onBlocked(it) } } }
        socket.on("friend-chat-history") { a -> (a.firstOrNull() as? JSONObject)?.let { scope.launch { onHistory(it) } } }
        socket.on("dm-gate") { a ->
            (a.firstOrNull() as? JSONObject)?.let { o ->
                val id = o.optString("clientId"); val g = o.optString("gate")
                if (id.isNotBlank() && g.isNotBlank()) _gates.update { it + (id to g) }
            }
        }
        socket.on("friend-typing") { a -> (a.firstOrNull() as? JSONObject)?.optString("fromClientId")?.let { scope.launch { onTyping(it) } } }
        socket.on("chat-seen") { a ->
            val by = (a.firstOrNull() as? JSONObject)?.optString("byClientId") ?: return@on
            scope.launch {
                updateThread(by) { list -> list.map { if (it.mine && it.status == MsgStatus.Sent) it.copy(status = MsgStatus.Seen) else it } }
            }
        }
        socket.on("friend-message-edited") { a ->
            val o = a.firstOrNull() as? JSONObject ?: return@on
            scope.launch {
                updateThread(o.optString("chatWith")) { list ->
                    list.map { if (it.id == o.optString("id")) it.copy(text = o.optString("text"), edited = true) else it }
                }
            }
        }
        socket.on("friend-message-deleted") { a ->
            val o = a.firstOrNull() as? JSONObject ?: return@on
            scope.launch { updateThread(o.optString("chatWith")) { list -> list.filterNot { it.id == o.optString("id") } } }
        }
        socket.on("friend-reaction") { a ->
            val o = a.firstOrNull() as? JSONObject ?: return@on
            scope.launch {
                updateThread(o.optString("fromClientId")) { list ->
                    list.map { if (it.id == o.optString("id")) it.copy(theirReaction = if (o.optBoolean("on")) o.optString("emoji") else null) else it }
                }
            }
        }
        socket.on("voice-note-state") { a ->
            val o = a.firstOrNull() as? JSONObject ?: return@on
            val who = o.optString("clientId")
            _voice.update { it + (who to o.optString("state", "off")) }
            when {
                o.optBoolean("accepted") -> _toasts.tryEmit(UiText.Res(R.string.t_voice_on))
                o.optBoolean("declined") -> _toasts.tryEmit(UiText.Res(R.string.t_voice_declined))
            }
        }
        socket.on("unblock-result") { a ->
            val o = a.firstOrNull() as? JSONObject ?: return@on
            if (o.optBoolean("ok")) {
                _blocked.update { list -> list.filterNot { it.clientId == o.optString("targetClientId") } }
                _toasts.tryEmit(if (o.optBoolean("friendRestored")) UiText.Res(R.string.t_unblocked_friend) else UiText.Res(R.string.t_unblocked))
            }
        }
        socket.on("call-back-later-result") { a ->
            val o = a.firstOrNull() as? JSONObject ?: return@on
            _toasts.tryEmit(
                when {
                    o.optBoolean("ok") -> UiText.Res(R.string.t_call_later_ok)
                    o.optString("reason") == "calls-off" -> UiText.Res(R.string.t_calls_off)
                    o.optString("reason") == "rate" -> UiText.Res(R.string.t_asked_recently)
                    else -> UiText.Res(R.string.t_couldnt_send)
                },
            )
        }
        socket.on("notification") { a ->
            val o = a.firstOrNull() as? JSONObject ?: return@on
            toActivity(o)?.let { item -> scope.launch { _activity.update { listOf(item) + it.filterNot { x -> x.id == item.id } } } }
        }
        socket.on("call-back-request") { a ->
            val o = a.firstOrNull() as? JSONObject ?: return@on
            _incoming.value = IncomingCall(o.optString("fromClientId"), o.optString("username").ifBlank { "Someone" }, o.optNullableString("countryCode"))
        }
        socket.on("call-back-cancelled") { a ->
            val from = (a.firstOrNull() as? JSONObject)?.optString("fromClientId")
            if (_incoming.value?.fromClientId == from) _incoming.value = null
        }
        socket.on("call-back-declined") { a ->
            val name = (a.firstOrNull() as? JSONObject)?.optString("username").orEmpty()
            _outgoing.value = null
            _toasts.tryEmit(if (name.isBlank()) UiText.Res(R.string.t_cant_talk) else UiText.Res(R.string.t_name_cant_talk, listOf(name)))
        }
        socket.on("call-back-request-result") { a ->
            val o = a.firstOrNull() as? JSONObject ?: return@on
            if (o.optBoolean("ok")) return@on
            _outgoing.value = null
            _toasts.tryEmit(
                when (o.optString("reason")) {
                    "offline", "away" -> UiText.Res(R.string.t_offline_told)
                    "busy-queued" -> UiText.Res(R.string.t_busy_told)
                    "calls-off" -> UiText.Res(R.string.t_calls_off)
                    "rate" -> UiText.Res(R.string.t_too_many_calls)
                    else -> UiText.Res(R.string.t_couldnt_reach)
                },
            )
        }
        // A friend call that connects arrives as a normal match.
        scope.launch { socket.events.collect { e -> if (e is ServerEvent.Matched) { _outgoing.value = null; _incoming.value = null } } }
        // Messages that were still sending when the connection dropped go again.
        scope.launch { socket.events.collect { e -> if (e == ServerEvent.Registered) resendPending() } }
    }

    // --- Friends -----------------------------------------------------------

    fun sendRequest(targetClientId: String, friendId: String? = null) = scope.launch {
        val res = request(
            "friend-request",
            JSONObject().put("targetClientId", targetClientId).apply { friendId?.let { put("friendId", it) } },
            "friend-request-result",
        )
        if (res == null) { _toasts.tryEmit(UiText.Res(R.string.t_request_failed)); return@launch }
        when {
            !res.optBoolean("ok") -> _toasts.tryEmit(res.optString("error").takeIf { it.isNotBlank() }?.let { UiText.Raw(it) } ?: UiText.Res(R.string.t_request_failed))
            res.optBoolean("accepted") || res.optBoolean("alreadyFriends") -> _toasts.tryEmit(UiText.Res(R.string.t_now_friends))
            else -> {
                _sent.update { it + targetClientId }
                _gates.update { g -> if (g[targetClientId] == "request" || g[targetClientId] == null) g + (targetClientId to "one") else g }
                _toasts.tryEmit(UiText.Res(R.string.t_request_sent))
            }
        }
    }

    /** Takes someone off "People you met today". */
    fun removeFromHistory(clientId: String) {
        _history.update { list -> list.filterNot { it.clientId == clientId } }
        socket.emit("remove-history-entry", JSONObject().put("clientId", clientId))
    }

    fun respond(fromClientId: String, accept: Boolean) = scope.launch {
        _requests.update { list -> list.filterNot { it.clientId == fromClientId } }
        _gates.update { it + (fromClientId to if (accept) "open" else "request") }
        socket.emit("friend-request-respond", JSONObject().put("fromClientId", fromClientId).put("accept", accept))
    }

    fun remove(clientId: String) = scope.launch {
        _friends.update { list -> list.filterNot { it.clientId == clientId } }
        socket.emit("remove-friend", JSONObject().put("friendClientId", clientId))
    }

    fun block(clientId: String) = scope.launch {
        _friends.update { list -> list.filterNot { it.clientId == clientId } }
        _history.update { list -> list.filterNot { it.clientId == clientId } }
        socket.emit("block-friend", JSONObject().put("friendClientId", clientId))
    }

    fun setPinned(clientId: String, pinned: Boolean) = scope.launch {
        _friends.update { list -> list.map { if (it.clientId == clientId) it.copy(pinned = pinned) else it } }
        socket.emit("pin-friend", JSONObject().put("friendClientId", clientId).put("pinned", pinned))
    }

    fun setMuted(clientId: String, muted: Boolean) = scope.launch {
        _muted.update { if (muted) it + clientId else it - clientId }
        socket.emit("mute-chat", JSONObject().put("targetClientId", clientId).put("muted", muted))
    }

    fun rename(clientId: String, nickname: String) = scope.launch {
        _friends.update { list -> list.map { if (it.clientId == clientId) it.copy(nickname = nickname.ifBlank { null }) else it } }
        socket.emit("rename-friend", JSONObject().put("friendClientId", clientId).put("nickname", nickname.trim()))
    }

    /** Looks someone up by their friend ID (asad#1234 or G-4RT9KQ). */
    suspend fun find(friendId: String): Result<FoundUser> {
        val res = request("find-by-friend-id", JSONObject().put("friendId", friendId.trim()), "find-by-friend-id-result")
            ?: return Result.failure(Exception("No connection. Try again."))
        if (!res.optBoolean("ok")) return Result.failure(Exception(res.optString("error").ifBlank { "No one has that ID right now." }))
        val u = res.getJSONObject("user")
        return Result.success(
            FoundUser(
                clientId = u.optString("clientId"),
                friendId = u.optString("friendId"),
                username = u.optString("username"),
                countryCode = u.optNullableString("countryCode"),
                animal = animalOf(u.optNullableString("avatar")),
                isFriend = u.optBoolean("isFriend"),
                pending = u.optBoolean("pending"),
                online = u.optBoolean("online"),
            ),
        )
    }

    fun cancelRequest(targetClientId: String) = scope.launch {
        _sent.update { it - targetClientId }
        socket.emit("cancel-friend-request", JSONObject().put("targetClientId", targetClientId))
    }

    fun report(targetClientId: String, reason: String, detail: String = "") = scope.launch {
        _friends.update { list -> list.filterNot { it.clientId == targetClientId } }
        _history.update { list -> list.filterNot { it.clientId == targetClientId } }
        socket.emit("report-user", JSONObject().put("targetClientId", targetClientId).put("reason", reason).put("detail", detail))
        _toasts.tryEmit(UiText.Res(R.string.t_reported))
    }

    fun unblock(targetClientId: String) {
        socket.emit("unblock-user", JSONObject().put("targetClientId", targetClientId))
    }

    /** Ask an offline friend to call back when they are around. */
    fun callLater(targetClientId: String) {
        socket.emit("call-back-request-later", JSONObject().put("targetClientId", targetClientId))
    }

    fun clearActivity(id: String) = scope.launch {
        _activity.update { list -> list.filterNot { it.id == id } }
        socket.emit("clear-notification", JSONObject().put("notificationId", id))
    }

    fun markActivitySeen() = socket.emit("mark-notifications-seen")

    /** Pick a custom friend ID like anakin#1101 (signed-in accounts). */
    suspend fun setHandle(handle: String): Result<String> {
        val res = request("set-handle", JSONObject().put("handle", handle.trim()), "set-handle-result")
            ?: return Result.failure(Exception("No connection. Try again."))
        if (!res.optBoolean("ok")) return Result.failure(Exception(res.optString("error").ifBlank { "Could not save that ID." }))
        val id = res.optString("friendId")
        _myFriendId.value = id
        return Result.success(id)
    }

    fun person(clientId: String): Person? =
        _friends.value.firstOrNull { it.clientId == clientId } ?: _history.value.firstOrNull { it.clientId == clientId }

    // --- Messages ----------------------------------------------------------

    fun loadThread(clientId: String) {
        socket.emit("get-friend-chat", JSONObject().put("friendClientId", clientId))
    }

    fun send(toClientId: String, text: String, replyTo: String? = null) = scope.launch {
        val body = text.trim().take(1000)
        if (body.isEmpty()) return@launch
        val msg = ChatMessage(id = newId(), mine = true, text = body, ts = System.currentTimeMillis(), replyTo = replyTo, status = MsgStatus.Sending)
        updateThread(toClientId) { it + msg }
        emitMessage(toClientId, msg)
        // Still not confirmed after 10 s: show it as failed so it can be retried.
        delay(10_000)
        updateThread(toClientId) { list -> list.map { if (it.id == msg.id && it.status == MsgStatus.Sending) it.copy(status = MsgStatus.Failed) else it } }
    }

    fun sendGif(toClientId: String, gif: Gif) = scope.launch {
        val msg = ChatMessage(id = newId(), mine = true, text = "", ts = System.currentTimeMillis(), gifUrl = gif.url, gif = gif, status = MsgStatus.Sending)
        updateThread(toClientId) { it + msg }
        emitMessage(toClientId, msg)
        delay(10_000)
        updateThread(toClientId) { list -> list.map { if (it.id == msg.id && it.status == MsgStatus.Sending) it.copy(status = MsgStatus.Failed) else it } }
    }

    fun retry(toClientId: String, id: String) = scope.launch {
        val msg = _threads.value[toClientId]?.firstOrNull { it.id == id } ?: return@launch
        updateThread(toClientId) { list -> list.map { if (it.id == id) it.copy(status = MsgStatus.Sending, failReason = null) else it } }
        emitMessage(toClientId, msg)
    }

    fun edit(toClientId: String, id: String, text: String) = scope.launch {
        val body = text.trim().take(1000)
        if (body.isEmpty()) return@launch
        updateThread(toClientId) { list -> list.map { if (it.id == id) it.copy(text = body, edited = true) else it } }
        socket.emit("friend-message-edit", JSONObject().put("toClientId", toClientId).put("id", id).put("text", body))
    }

    fun delete(toClientId: String, id: String) = scope.launch {
        updateThread(toClientId) { list -> list.filterNot { it.id == id } }
        socket.emit("friend-message-delete", JSONObject().put("toClientId", toClientId).put("id", id))
    }

    fun react(toClientId: String, id: String, emoji: String) = scope.launch {
        var on = true
        updateThread(toClientId) { list ->
            list.map { if (it.id != id) it else { on = it.myReaction != emoji; it.copy(myReaction = if (on) emoji else null) } }
        }
        socket.emit("friend-reaction", JSONObject().put("toClientId", toClientId).put("id", id).put("emoji", emoji).put("on", on))
    }

    /** Clears this user's copy of a conversation. */
    fun clearChat(clientId: String) = scope.launch {
        updateThread(clientId) { emptyList() }
        _friends.update { list -> list.map { if (it.clientId == clientId) it.copy(last = null) else it } }
        socket.emit("clear-friend-chat", JSONObject().put("friendClientId", clientId))
    }

    fun requestVoice(toClientId: String) = socket.emit("voice-note-request", JSONObject().put("toClientId", toClientId))
    fun respondVoice(fromClientId: String, accept: Boolean) = socket.emit("voice-note-respond", JSONObject().put("fromClientId", fromClientId).put("accept", accept))
    fun disableVoice(clientId: String) = socket.emit("voice-note-disable", JSONObject().put("clientId", clientId))

    /** Sends a recorded voice message (AAC in MP4, up to 60 s). */
    fun sendVoice(toClientId: String, audio: ByteArray, ms: Long) = scope.launch {
        val msg = ChatMessage(id = newId(), mine = true, text = "", ts = System.currentTimeMillis(), voiceMs = ms, status = MsgStatus.Sending)
        updateThread(toClientId) { it + msg }
        val res = socket.askWith(
            "friend-voice-note",
            JSONObject().put("toClientId", toClientId).put("audio", audio).put("mime", "audio/mp4").put("ms", ms).put("id", msg.id),
        )
        updateThread(toClientId) { list ->
            list.map {
                if (it.id != msg.id) it
                else if (res?.optBoolean("ok") == true) it.copy(status = MsgStatus.Sent, ts = res.optLong("ts", it.ts), voiceId = res.optJSONObject("voice")?.optString("id"))
                else it.copy(
                    status = MsgStatus.Failed,
                    failReason = when (res?.optString("reason")) {
                        "needs-consent" -> UiText.Res(R.string.f_needs_consent)
                        "friends-only" -> UiText.Res(R.string.f_friends_only)
                        "rate" -> UiText.Res(R.string.f_voice_rate)
                        else -> UiText.Res(R.string.f_couldnt_send)
                    },
                )
            }
        }
    }

    /** The audio of a voice note, as stored by the server. */
    suspend fun fetchVoice(id: String, chatWith: String): ByteArray? {
        val res = socket.askWith("voice-note-get", JSONObject().put("id", id).put("chatWith", chatWith)) ?: return null
        if (!res.optBoolean("ok")) return null
        return res.opt("data") as? ByteArray
    }

    fun typing(toClientId: String) {
        val now = System.currentTimeMillis()
        if (now - lastTypingSent < 3000) return
        lastTypingSent = now
        socket.emit("friend-typing", JSONObject().put("toClientId", toClientId))
    }

    fun markRead(clientId: String) = scope.launch {
        _unread.update { it - clientId }
        socket.emit("mark-messages-read", JSONObject().put("friendClientId", clientId))
        // With read receipts off the badge still clears, but nobody sees "Seen".
        if (privacy?.readReceipts?.value != false) socket.emit("chat-seen", JSONObject().put("friendClientId", clientId))
    }

    // --- Friend calls ------------------------------------------------------

    fun call(person: Person) {
        _outgoing.value = OutgoingCall(person)
        socket.emit("call-back-request", JSONObject().put("targetClientId", person.clientId))
    }

    fun cancelCall() {
        val target = _outgoing.value?.person?.clientId ?: return
        _outgoing.value = null
        socket.emit("call-back-cancel", JSONObject().put("targetClientId", target))
    }

    fun answer(accept: Boolean) {
        val call = _incoming.value ?: return
        if (!accept) _incoming.value = null
        socket.emit("call-back-respond", JSONObject().put("fromClientId", call.fromClientId).put("accept", accept))
    }

    /** Fills the lists directly; used by screenshot tests. */
    fun seedForPreview(
        friends: List<Person> = emptyList(),
        requests: List<Person> = emptyList(),
        history: List<Person> = emptyList(),
        unread: Map<String, Int> = emptyMap(),
        threads: Map<String, List<ChatMessage>> = emptyMap(),
        typing: Set<String> = emptySet(),
    ) {
        _friends.value = friends; _requests.value = requests; _history.value = history
        _unread.value = unread; _threads.value = threads; _typing.value = typing
    }

    // --- Server events -----------------------------------------------------

    private fun onStateSync(o: JSONObject) {
        _friends.value = o.optJSONArray("friends").people()
        _requests.value = o.optJSONArray("friendRequests").people()
        _sent.value = o.optJSONArray("sentRequests").people().map { it.clientId }.toSet()
        _history.value = o.optJSONArray("chatHistory").people()
        _muted.value = o.optJSONArray("muted").strings().toSet()
        val counts = mutableMapOf<String, Int>()
        o.optJSONArray("notifications")?.let { arr ->
            for (i in 0 until arr.length()) {
                val n = arr.optJSONObject(i) ?: continue
                if (n.optString("type") == "message") {
                    val from = n.optString("fromClientId")
                    if (from.isNotBlank() && from != openChat) counts[from] = (counts[from] ?: 0) + 1
                }
            }
        }
        _unread.value = counts
        _blocked.value = o.optJSONArray("blocked")?.let { arr ->
            (0 until arr.length()).mapNotNull { arr.optJSONObject(it) }.map {
                BlockedPerson(it.optString("clientId"), it.optString("username").ifBlank { "Someone" }, it.optBoolean("wasFriend"))
            }
        }.orEmpty()
        _activity.value = o.optJSONArray("notifications")?.let { arr ->
            (0 until arr.length()).mapNotNull { arr.optJSONObject(it)?.let(::toActivity) }.sortedByDescending { it.ts }
        }.orEmpty()
    }

    private fun toActivity(n: JSONObject): ActivityItem? {
        val type = n.optString("type")
        if (type != "call_back_request" && type != "friend_accepted") return null
        val from = n.optString("fromClientId").ifBlank { n.optString("byClientId") }
        return ActivityItem(n.optString("id"), type, from, n.optString("username").ifBlank { "Someone" }, n.optLong("ts"))
    }

    private fun onIncomingMessage(o: JSONObject) {
        val from = o.optString("fromClientId")
        val msg = ChatMessage.from(o, identity.clientId).copy(mine = false)
        updateThread(from) { list -> if (list.any { it.id == msg.id }) list else list + msg }
        _typing.update { it - from }
        bumpLast(from, LastMessage(false, msg.text, msg.gifUrl != null, msg.voiceMs != null, msg.ts, false))
        if (from == openChat) markRead(from) else _unread.update { it + (from to ((it[from] ?: 0) + 1)) }
    }

    private fun onSent(o: JSONObject) {
        val to = o.optString("toClientId")
        val id = o.optString("id")
        val ts = o.optLong("ts")
        updateThread(to) { list -> list.map { if (it.id == id && it.status != MsgStatus.Seen) it.copy(status = MsgStatus.Sent, ts = ts) else it } }
        bumpLast(to, LastMessage(true, o.optString("text"), !o.isNull("gif"), !o.isNull("voice"), ts, false))
    }

    private fun onBlocked(o: JSONObject) {
        if (o.optString("scope") != "friend") return
        val to = o.optString("toClientId")
        val id = o.optNullableString("id") ?: return
        val reason = when (o.optString("reason")) {
            "link" -> UiText.Res(R.string.f_link)
            "unsafe" -> UiText.Res(R.string.f_unsafe)
            "rate" -> UiText.Res(R.string.f_rate)
            "accept-first" -> UiText.Res(R.string.f_accept_first)
            "awaiting-accept", "request-first" -> UiText.Res(R.string.f_request_first)
            else -> UiText.Res(R.string.f_couldnt_send)
        }
        updateThread(to) { list -> list.map { if (it.id == id) it.copy(status = MsgStatus.Failed, failReason = reason) else it } }
    }

    private fun onHistory(o: JSONObject) {
        val id = o.optString("friendClientId")
        o.optString("voice").takeIf { it.isNotBlank() }?.let { v -> _voice.update { it + (id to v) } }
        o.optString("gate").takeIf { it.isNotBlank() }?.let { g -> _gates.update { it + (id to g) } }
        val arr = o.optJSONArray("messages") ?: JSONArray()
        val fromServer = (0 until arr.length()).mapNotNull { arr.optJSONObject(it)?.let { m -> ChatMessage.from(m, identity.clientId) } }
        updateThread(id) { local ->
            // Keep messages still on their way; the server copy wins for the rest.
            val pending = local.filter { it.status == MsgStatus.Sending || it.status == MsgStatus.Failed }
                .filter { p -> fromServer.none { it.id == p.id } }
            fromServer + pending
        }
    }

    private fun onTyping(from: String) {
        _typing.update { it + from }
        typingJobs[from]?.cancel()
        typingJobs[from] = scope.launch {
            delay(4000)
            _typing.update { it - from }
        }
    }

    private fun resendPending() {
        for ((to, list) in _threads.value) {
            list.filter { it.status == MsgStatus.Sending }.forEach { emitMessage(to, it) }
        }
    }

    private fun emitMessage(to: String, msg: ChatMessage) {
        socket.emit(
            "friend-message",
            JSONObject().put("toClientId", to).put("text", msg.text).put("id", msg.id).apply {
                msg.replyTo?.let { put("replyTo", it) }
                msg.gif?.let { put("gif", it.json()) }
            },
        )
    }

    private fun updateThread(id: String, f: (List<ChatMessage>) -> List<ChatMessage>) {
        _threads.update { it + (id to f(it[id].orEmpty())) }
    }

    private fun bumpLast(id: String, last: LastMessage) {
        _friends.update { list -> list.map { if (it.clientId == id) it.copy(last = last) else it } }
        _history.update { list -> list.map { if (it.clientId == id) it.copy(last = last) else it } }
    }

    private suspend fun request(event: String, payload: JSONObject, result: String): JSONObject? =
        try { socket.request(event, payload, result) } catch (_: TimeoutCancellationException) { null }

    private fun newId(): String {
        val chars = "abcdefghijklmnopqrstuvwxyz0123456789"
        return "a" + (1..15).map { chars[random.nextInt(chars.length)] }.joinToString("")
    }

    private fun JSONArray?.people(): List<Person> =
        if (this == null) emptyList() else (0 until length()).mapNotNull { optJSONObject(it)?.let(Person::from) }

    private fun JSONArray?.strings(): List<String> =
        if (this == null) emptyList() else (0 until length()).map { optString(it) }
}
