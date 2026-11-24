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
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
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

    private val _historyHidden = MutableStateFlow(0)
    /** Older people met, kept on the server but only listed with Plus. */
    val historyHidden: StateFlow<Int> = _historyHidden

    private val _unread = MutableStateFlow<Map<String, Int>>(emptyMap())
    val unread: StateFlow<Map<String, Int>> = _unread

    val archived: StateFlow<Set<String>> = privacy?.archived ?: MutableStateFlow(emptySet())
    fun setArchived(clientId: String, on: Boolean) { privacy?.setArchived(clientId, on) }
    private val _muted = MutableStateFlow<Set<String>>(emptySet())
    val muted: StateFlow<Set<String>> = _muted

    private val _threads = MutableStateFlow<Map<String, List<ChatMessage>>>(emptyMap())
    val threads: StateFlow<Map<String, List<ChatMessage>>> = _threads

    private val _typing = MutableStateFlow<Set<String>>(emptySet())
    val typing: StateFlow<Set<String>> = _typing

    private val _myFriendId = MutableStateFlow<String?>(null)
    val myFriendId: StateFlow<String?> = _myFriendId

    private val _myBadges = MutableStateFlow<BadgeSet?>(null)
    /** This person's own talk-time badges (spec 3), as the server last reported them. */
    val myBadges: StateFlow<BadgeSet?> = _myBadges

    private val _myCover = MutableStateFlow<String?>(null)
    /** This person's own profile cover (spec 4): the server's effective one, so null once Plus ends. */
    val myCover: StateFlow<String?> = _myCover

    /** Picks a cover. Null on success, else the server's reason (plus, invalid) or "network". */
    suspend fun setCover(cover: String): String? {
        val r = socket.askWith("set-cover", JSONObject().put("cover", cover)) ?: return "network"
        if (!r.optBoolean("ok")) return r.optString("reason").ifBlank { "invalid" }
        _myCover.value = r.optNullableString("cover") ?: cover
        return null
    }

    /** Own cover and badges ride along on state-sync and the registration result when the server sends them. */
    private val _badgesHidden = MutableStateFlow(false)
    /** The owner chose to hide their badges from other people (spec 9); they still see their own. */
    val badgesHidden: StateFlow<Boolean> = _badgesHidden

    /** "Show badges on my profile": true on success. */
    suspend fun setShowBadges(on: Boolean): Boolean {
        val r = socket.askWith("show-badges", JSONObject().put("on", on)) ?: return false
        if (!r.optBoolean("ok")) return false
        _badgesHidden.value = !r.optBoolean("on", on)
        return true
    }

    private fun applyOwn(o: JSONObject) {
        if (o.has("badgesHidden")) _badgesHidden.value = o.optBoolean("badgesHidden")
        if (o.has("badges")) _myBadges.value = BadgeSet.from(o.optJSONObject("badges"))
        if (o.has("cover")) _myCover.value = o.optNullableString("cover")
    }

    private val _incoming = MutableStateFlow<IncomingCall?>(null)
    val incoming: StateFlow<IncomingCall?> = _incoming
    private val _stories = MutableStateFlow<List<StoryPerson>>(emptyList())
    /** Your stories first, then friends with live stories (unseen first). */
    val stories: StateFlow<List<StoryPerson>> = _stories

    private val _callDeclined = MutableSharedFlow<String>(extraBufferCapacity = 8)
    /** A ringing friend call this person turned down (for the call log). */
    val callDeclined: SharedFlow<String> = _callDeclined

    private val _outgoing = MutableStateFlow<OutgoingCall?>(null)
    val outgoing: StateFlow<OutgoingCall?> = _outgoing

    private val _messageEvents = kotlinx.coroutines.flow.MutableSharedFlow<Triple<String, String, String>>(extraBufferCapacity = 16)
    /** (sender id, sender name, preview) for every friend message as it arrives. */
    val messageEvents: kotlinx.coroutines.flow.SharedFlow<Triple<String, String, String>> = _messageEvents
    private val _gates = MutableStateFlow<Map<String, String>>(emptyMap())
    /** The server's latest word on whether a non-friend can be messaged (open, one, accept, request, waiting). */
    val gates: StateFlow<Map<String, String>> = _gates
    private val _disappearing = MutableStateFlow<Map<String, Disappearing>>(emptyMap())
    /** Disappearing messages per conversation (friend clientId -> setting). */
    val disappearing: StateFlow<Map<String, Disappearing>> = _disappearing

    /** Turns disappearing messages on or off for one chat; both people see it in the chat. */
    fun setDisappearing(friendClientId: String, on: Boolean) {
        _disappearing.update { it + (friendClientId to Disappearing(on, byMe = true)) }
        socket.emit("chat-disappearing", JSONObject().put("friendClientId", friendClientId).put("on", on))
    }

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

    private companion object { const val PAGE = 40 }

    /** Faces seen for people (by client id), so a chat opened before the lists load still shows their avatar. */
    private val faces = java.util.concurrent.ConcurrentHashMap<String, String>()
    fun knownFace(clientId: String): String? = faces[clientId]

    private val _likes = MutableStateFlow(LikesSummary())
    /** Likes received (spec 8); [LikesSummary.people] is filled for Plus only. */
    val likes: StateFlow<LikesSummary> = _likes

    private val _liked = MutableStateFlow<Set<String>>(emptySet())
    /** People this phone liked in this session. */
    val liked: StateFlow<Set<String>> = _liked

    private val _likeMatches = MutableSharedFlow<Person>(extraBufferCapacity = 4)
    /** Someone who liked you back: "It's a match!". */
    val likeMatches: SharedFlow<Person> = _likeMatches

    /** Likes someone from recent history or the current partner; a mutual like becomes a match (the server sends like-match). */
    fun likePartner(clientId: String) {
        if (clientId.isBlank() || clientId in _liked.value) return
        _liked.update { it + clientId }
        scope.launch {
            val r = socket.askWith("like-partner", JSONObject().put("clientId", clientId))
            if (r == null || !r.optBoolean("ok")) {
                _liked.update { it - clientId }
                _toasts.tryEmit(UiText.Res(R.string.t_couldnt_send))
            } else if (!r.optBoolean("matched")) _toasts.tryEmit(UiText.Res(R.string.like_sent))
        }
    }

    /** Asks the server how many people liked you (and, for Plus, who). */
    fun refreshLikes() {
        scope.launch {
            val r = socket.ask("likes-summary") ?: return@launch
            _likes.value = LikesSummary(r.optInt("count"), r.optInt("matches"), r.optJSONArray("people").people())
        }
    }

    private val typingJobs = mutableMapOf<String, Job>()
    private var lastTypingSent = 0L
    private val random = SecureRandom()

    init {
        scope.launch {
            identity.switches.drop(1).collect {
                _friends.value = emptyList(); _requests.value = emptyList(); _sent.value = emptySet()
                _history.value = emptyList(); _unread.value = emptyMap(); _threads.value = emptyMap(); _hasOlder.value = emptySet()
                _typing.value = emptySet(); _myFriendId.value = null; _gates.value = emptyMap()
                _voice.value = emptyMap(); _blocked.value = emptyList(); _activity.value = emptyList()
                _muted.value = emptySet(); _myBadges.value = null; _myCover.value = null; _stories.value = emptyList()
                SocialCache.clear()
            }
        }
        socket.on("register-result") { a -> (a.firstOrNull() as? JSONObject)?.let { applyOwn(it) } }
        socket.on("state-sync") { a -> (a.firstOrNull() as? JSONObject)?.let { scope.launch { onStateSync(it) } } }
        // What the app last knew shows at once; the network then brings it up to date.
        scope.launch {
            runCatching { SocialCache.state(identity.clientId)?.let { onStateSync(it, fromCache = true) } }
            runCatching { SocialCache.stories(identity.clientId)?.let { showStories(it) } }
        }
        socket.on("like-match") { a ->
            val o = a.firstOrNull() as? JSONObject ?: return@on
            val who = Person.from(o)
            if (who.clientId.isBlank()) return@on
            scope.launch {
                _likeMatches.emit(if (who.animal == null) who.copy(animal = faces[who.clientId]) else who)
                _likes.update { it.copy(count = (it.count - 1).coerceAtLeast(0), matches = it.matches + 1, people = it.people.filterNot { p -> p.clientId == who.clientId }) }
                // The server made them friends: fetch the lists again.
                refreshLikes()
                runCatching { refresh() }
            }
        }
        socket.on("likes") { a ->
            val o = a.firstOrNull() as? JSONObject ?: return@on
            _likes.update { it.copy(count = o.optInt("count", it.count)) }
            refreshLikes()
        }
        socket.on("friend-id") { a -> (a.firstOrNull() as? JSONObject)?.optNullableString("friendId")?.let { _myFriendId.value = it } }
        socket.on("friend-online") { a ->
            val id = (a.firstOrNull() as? JSONObject)?.optString("clientId") ?: return@on
            scope.launch { _friends.update { list -> list.map { if (it.clientId == id) it.copy(online = true) else it } } }
        }
        socket.on("friend-message") { a -> (a.firstOrNull() as? JSONObject)?.let { scope.launch { onIncomingMessage(it) } } }
        socket.on("friend-message-sent") { a -> (a.firstOrNull() as? JSONObject)?.let { scope.launch { onSent(it) } } }
        socket.on("chat-blocked") { a -> (a.firstOrNull() as? JSONObject)?.let { scope.launch { onBlocked(it) } } }
        socket.on("friend-chat-history") { a -> (a.firstOrNull() as? JSONObject)?.let { scope.launch { onHistory(it) } } }
        socket.on("chat-disappearing") { a ->
            (a.firstOrNull() as? JSONObject)?.let { o ->
                val who = o.optString("friendClientId")
                _disappearing.update { it + (who to Disappearing(o.optBoolean("on"), o.optBoolean("byMe"), o.optNullableString("byName"))) }
            }
        }
        socket.on("friend-messages-expired") { a ->
            (a.firstOrNull() as? JSONObject)?.let { o ->
                val who = o.optString("friendClientId")
                val ids = o.optJSONArray("ids")?.let { arr -> (0 until arr.length()).map { arr.optString(it) }.toSet() }.orEmpty()
                updateThread(who) { list -> list.filterNot { it.id in ids } }
            }
        }
        // Disappearing messages also go on the phone the moment their time is up.
        scope.launch {
            while (true) {
                delay(60_000)
                val now = System.currentTimeMillis()
                if (_threads.value.values.any { l -> l.any { (it.exp ?: Long.MAX_VALUE) <= now } }) {
                    _threads.update { m -> m.mapValues { (_, l) -> l.filterNot { (it.exp ?: Long.MAX_VALUE) <= now } } }
                }
            }
        }
        socket.on("dm-gate") { a ->
            (a.firstOrNull() as? JSONObject)?.let { o ->
                val id = o.optString("clientId"); val g = o.optString("gate")
                if (id.isNotBlank() && g.isNotBlank()) _gates.update { it + (id to g) }
            }
        }
        socket.on("friend-typing") { a -> (a.firstOrNull() as? JSONObject)?.optString("fromClientId")?.let { scope.launch { onTyping(it) } } }
        socket.on("chat-seen") { a ->
            val by = (a.firstOrNull() as? JSONObject)?.optString("byClientId") ?: return@on
            scope.launch { raiseReceipt(by, MsgStatus.Seen) }
        }
        socket.on("friend-message-delivered") { a ->
            val o = a.firstOrNull() as? JSONObject ?: return@on
            scope.launch { raiseReceipt(o.optString("toClientId"), MsgStatus.Delivered, o.optJSONArray("ids").strings().toSet()) }
        }
        socket.on("friend-message-edited") { a ->
            val o = a.firstOrNull() as? JSONObject ?: return@on
            scope.launch {
                updateThread(o.optString("chatWith")) { list ->
                    list.map { if (it.id == o.optString("id")) it.copy(text = o.optString("text"), edited = true) else it }
                }
            }
        }
        // Edits and unsends made while this phone was away, for every cached thread.
        socket.on("friend-changes") { a ->
            val o = a.firstOrNull() as? JSONObject ?: return@on
            val arr = o.optJSONArray("changes") ?: return@on
            scope.launch {
                for (i in 0 until arr.length()) {
                    val c = arr.optJSONObject(i) ?: continue
                    val who = c.optString("friendClientId")
                    val id = c.optString("id")
                    if (who.isBlank() || id.isBlank() || !_threads.value.containsKey(who)) continue
                    when (c.optString("type")) {
                        "deleted" -> updateThread(who) { list -> list.filterNot { it.id == id } }
                        "edited" -> updateThread(who) { list -> list.map { if (it.id == id) it.copy(text = c.optString("text"), edited = true) else it } }
                    }
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
        socket.on("stories-changed") { _ -> refreshStories() }
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
            if (o.optBoolean("ok")) {
                // Ringing on their screen, a notification in their background, or busy.
                val status = when { o.optBoolean("busy") -> "busy"; o.optBoolean("inApp", true) -> "ringing"; else -> "calling" }
                _outgoing.update { it?.copy(status = status) }
                return@on
            }
            _outgoing.value = null
            // Answered a call that is no longer there (they hung up, went offline).
            if (_incoming.value?.answering == true) _incoming.value = null
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
        scope.launch {
            socket.events.collect { e ->
                if (e is ServerEvent.Matched) {
                    _outgoing.value = null; _incoming.value = null
                    e.partner.animal?.let { faces[e.partner.clientId] = it }
                }
            }
        }
        // Messages that were still sending when the connection dropped go again.
        scope.launch {
            socket.events.collect { e ->
                if (e != ServerEvent.Registered) return@collect
                ackedIds.clear()
                refreshLikes()
                refreshStories()
                val since = changesSince
                changesSince = socket.serverNow
                if (since > 0) socket.emit("get-friend-changes", JSONObject().put("since", since))
                resendPending()
                // Whatever arrived, was unsent or was edited while the connection
                // was down is in the stored thread: fetch the open chat's newest
                // page again so it catches up without being reopened.
                openChat?.let { loadThread(it) }
            }
        }
    }

    // --- Friends -----------------------------------------------------------

    fun sendRequest(targetClientId: String, friendId: String? = null) = scope.launch {
        // Shown as "Requested" straight away (undone below if the server says
        // no), so the button reacts on the tap instead of after a round trip.
        val optimistic = friendId == null && targetClientId !in _sent.value
        if (friendId == null && !optimistic) return@launch
        if (optimistic) _sent.update { it + targetClientId }
        val res = request(
            "friend-request",
            JSONObject().put("targetClientId", targetClientId).apply { friendId?.let { put("friendId", it) } },
            "friend-request-result",
        )
        if (res == null) {
            if (optimistic) _sent.update { it - targetClientId }
            _toasts.tryEmit(UiText.Res(R.string.t_request_failed)); return@launch
        }
        when {
            !res.optBoolean("ok") -> {
                if (optimistic) _sent.update { it - targetClientId }
                _toasts.tryEmit(res.optString("error").takeIf { it.isNotBlank() }?.let { UiText.Raw(it) } ?: UiText.Res(R.string.t_request_failed))
            }
            res.optBoolean("accepted") || res.optBoolean("alreadyFriends") -> {
                if (optimistic) _sent.update { it - targetClientId }
                _toasts.tryEmit(UiText.Res(R.string.t_now_friends))
            }
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

    /** Pull to refresh: registers again so the server sends the friends and requests afresh (a reconnect first if the line is down). */
    suspend fun refresh() {
        if (socket.isConnected()) socket.register() else socket.awaitConnected(6_000)
        kotlinx.coroutines.delay(800)
    }

    /** Looks someone up by their friend ID (alex#1234 or G-4RT9KQ). */
    suspend fun find(friendId: String): Result<FoundUser> {
        val res = request("find-by-friend-id", JSONObject().put("friendId", friendId.trim()), "find-by-friend-id-result")
            ?: return Result.failure(Exception("No connection. Try again."))
        if (!res.optBoolean("ok")) return Result.failure(Exception(app.talklive.ui.components.friendlyError(res.optString("error"), "No one has that ID right now.")))
        val u = res.getJSONObject("user")
        return Result.success(
            FoundUser(
                clientId = u.optString("clientId"),
                friendId = u.optString("friendId"),
                username = u.optString("username"),
                countryCode = u.optNullableString("countryCode"),
                animal = animalOf(u.optNullableString("avatar") ?: u.optNullableString("animal")),
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
        if (!res.optBoolean("ok")) return Result.failure(Exception(app.talklive.ui.components.friendlyError(res.optString("error"), "Could not save that ID.")))
        val id = res.optString("friendId")
        _myFriendId.value = id
        return Result.success(id)
    }

    fun person(clientId: String): Person? =
        _friends.value.firstOrNull { it.clientId == clientId } ?: _history.value.firstOrNull { it.clientId == clientId }

    // --- Messages ----------------------------------------------------------

    /**
     * A chat opens on its newest page; older messages are fetched as the reader
     * scrolls up ([loadOlder]). A long conversation costs one small page to open.
     */
    fun loadThread(clientId: String) {
        loadingOlder.remove(clientId)
        // The conversation as last seen shows at once (nothing to wait for); the newest page follows.
        if (_threads.value[clientId].isNullOrEmpty()) scope.launch {
            SocialCache.thread(identity.clientId, clientId)?.let { cached ->
                if (_threads.value[clientId].isNullOrEmpty()) runCatching { onHistory(cached, fromCache = true) }
            }
        }
        socket.emit("get-friend-chat", JSONObject().put("friendClientId", clientId).put("limit", PAGE))
    }

    private val _hasOlder = MutableStateFlow<Set<String>>(emptySet())
    /** Chats with messages older than what is loaded. */
    val hasOlder: StateFlow<Set<String>> = _hasOlder
    private val loadingOlder = mutableSetOf<String>()

    fun loadOlder(clientId: String) {
        if (clientId !in _hasOlder.value || !loadingOlder.add(clientId)) return
        val first = _threads.value[clientId].orEmpty().firstOrNull { it.status != MsgStatus.Sending && it.status != MsgStatus.Failed }
        if (first == null) { loadingOlder.remove(clientId); return }
        socket.emit(
            "get-friend-chat",
            JSONObject().put("friendClientId", clientId).put("limit", PAGE).put("before", first.ts).put("beforeId", first.id),
        )
    }

    fun send(toClientId: String, text: String, replyTo: String? = null) = scope.launch {
        val body = text.trim().take(1000)
        if (body.isEmpty()) return@launch
        val msg = ChatMessage(id = newId(), mine = true, text = body, ts = System.currentTimeMillis(), replyTo = replyTo, status = MsgStatus.Sending, exp = expiryFor(toClientId))
        updateThread(toClientId) { it + msg }
        emitMessage(toClientId, msg)
        // Still not confirmed after 10 s: show it as failed so it can be retried.
        delay(10_000)
        updateThread(toClientId) { list -> list.map { if (it.id == msg.id && it.status == MsgStatus.Sending) it.copy(status = MsgStatus.Failed) else it } }
    }

    /**
     * [send] for a caller that must keep the process alive until the message is
     * really out (a reply typed in a notification while the app was closed):
     * waits for the connection, then for the server's acknowledgement.
     * True once the server has it.
     */
    suspend fun sendAndAwait(toClientId: String, text: String, timeoutMs: Long = 9_000): Boolean {
        val body = text.trim().take(1000)
        if (body.isEmpty()) return false
        val msg = ChatMessage(id = newId(), mine = true, text = body, ts = System.currentTimeMillis(), status = MsgStatus.Sending, exp = expiryFor(toClientId))
        updateThread(toClientId) { it + msg }
        val deadline = System.nanoTime() + timeoutMs * 1_000_000
        fun left() = ((deadline - System.nanoTime()) / 1_000_000).coerceAtLeast(1)
        val sent = socket.awaitConnected(left()) && run {
            emitMessage(toClientId, msg)
            withTimeoutOrNull(left()) {
                _threads.map { m -> m[toClientId]?.firstOrNull { it.id == msg.id }?.status }
                    .first { it == null || it.rank >= MsgStatus.Sent.rank || it == MsgStatus.Failed }
            }?.let { it != MsgStatus.Failed } == true
        }
        if (!sent) updateThread(toClientId) { list -> list.map { if (it.id == msg.id && it.status == MsgStatus.Sending) it.copy(status = MsgStatus.Failed) else it } }
        return sent
    }

    fun sendGif(toClientId: String, gif: Gif) = scope.launch {
        val msg = ChatMessage(id = newId(), mine = true, text = "", ts = System.currentTimeMillis(), gifUrl = gif.url, gif = gif, status = MsgStatus.Sending, exp = expiryFor(toClientId))
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

    /** The bell: tell me when this friend comes online. */
    fun setOnlineAlert(clientId: String, on: Boolean) {
        _friends.update { list -> list.map { if (it.clientId == clientId) it.copy(alert = on) else it } }
        socket.emit("online-alert", JSONObject().put("clientId", clientId).put("on", on))
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

    // --- Stories ------------------------------------------------------------

    fun refreshStories() {
        scope.launch {
            val r = socket.ask("stories-get") ?: return@launch
            if (!r.optBoolean("ok")) return@launch
            val arr = r.optJSONArray("people") ?: return@launch
            SocialCache.saveStories(identity.clientId, arr)
            showStories(arr)
        }
    }

    private fun showStories(arr: JSONArray) {
        run {
            _stories.value = (0 until arr.length()).mapNotNull { arr.optJSONObject(it) }.map { p ->
                val st = p.optJSONArray("stories") ?: JSONArray()
                StoryPerson(
                    clientId = p.optString("clientId"),
                    mine = p.optBoolean("mine"),
                    name = p.optString("name").ifBlank { "Someone" },
                    animal = animalOf(p.optNullableString("avatar")),
                    stories = (0 until st.length()).mapNotNull { st.optJSONObject(it) }.map { s ->
                        val g = s.optJSONArray("gifs") ?: JSONArray()
                        val v = s.optJSONArray("views") ?: JSONArray()
                        Story(
                            id = s.optString("id"), text = s.optString("text"), bg = s.optString("bg", "blue"),
                            gifs = (0 until g.length()).mapNotNull { g.optJSONObject(it) }.map { storyGifFrom(it) },
                            layers = s.optJSONArray("layers")?.let { la -> (0 until la.length()).mapNotNull { la.optJSONObject(it) }.map { StoryLayer.from(it) } }.orEmpty(),
                            ts = s.optLong("ts"), seen = s.optBoolean("seen"),
                            viewers = (0 until v.length()).mapNotNull { v.optJSONObject(it) }.map { o ->
                                StoryViewerInfo(o.optString("clientId"), o.optString("name").ifBlank { "A friend" }, o.optBoolean("liked"), o.optNullableString("reaction"))
                            },
                            liked = s.optBoolean("liked"), likeCount = s.optInt("likeCount"),
                        )
                    },
                )
            }
        }
    }

    private val _storyUpload = MutableStateFlow<StoryUpload?>(null)
    /** The story being posted right now, for the ring around "Your story". */
    val storyUpload: StateFlow<StoryUpload?> = _storyUpload
    private var pendingStory: StoryDraft? = null
    private var uploadJob: Job? = null

    /**
     * Posts in the background so the composer can close at once: waiting for a
     * connection, sent, saved by the server, then seen in the fetched story list.
     * The draft is cleared only once the story is really there.
     */
    fun publishStory(d: StoryDraft) {
        pendingStory = d
        uploadJob?.cancel()
        uploadJob = scope.launch { upload(d) }
    }

    fun retryStory() { pendingStory?.let { publishStory(it) } }

    fun dismissStoryUpload() { if (_storyUpload.value?.stage == StoryUpload.Stage.Failed) _storyUpload.value = null }

    private suspend fun upload(d: StoryDraft) {
        _storyUpload.value = StoryUpload(StoryUpload.Stage.Waiting)
        if (!socket.isConnected() && !socket.awaitConnected(15_000)) {
            _storyUpload.value = StoryUpload(StoryUpload.Stage.Failed, "No connection. Tap to try again.")
            return
        }
        _storyUpload.value = StoryUpload(StoryUpload.Stage.Sending)
        val arr = JSONArray()
        d.gifs.forEach { arr.put(it.json()) }
        val ls = JSONArray()
        d.layers.forEach { ls.put(it.json()) }
        // "text" carries the words too, so apps from before layers still show something.
        val r = socket.askWith("story-post", JSONObject().put("text", d.summary.trim().take(700)).put("bg", d.bg).put("gifs", arr).put("layers", ls))
        if (r == null || !r.optBoolean("ok")) {
            _storyUpload.value = StoryUpload(StoryUpload.Stage.Failed, r?.optString("error")?.ifBlank { null } ?: "Could not post. Tap to try again.")
            return
        }
        _storyUpload.value = StoryUpload(StoryUpload.Stage.Saved)
        val id = r.optString("id")
        // Published once the story list from the server has it.
        repeat(3) {
            val got = socket.ask("stories-get")
            if (got != null && got.optBoolean("ok")) {
                // The list shows the new story before it is called posted, so tapping
                // "Your story" right away opens it (it used to open the editor again).
                got.optJSONArray("people")?.let { SocialCache.saveStories(identity.clientId, it); showStories(it) }
                val mine = got.optJSONArray("people")?.optJSONObject(0)?.optJSONArray("stories")
                val found = mine != null && (0 until mine.length()).any { i -> mine.optJSONObject(i)?.optString("id") == id }
                if (found) {
                    StoryDrafts.clear()
                    pendingStory = null
                    _storyUpload.value = StoryUpload(StoryUpload.Stage.Published)
                    delay(1400)
                    if (_storyUpload.value?.stage == StoryUpload.Stage.Published) _storyUpload.value = null
                    return
                }
            }
            delay(700)
        }
        // Saved on the server even if the list was slow: treat it as posted.
        StoryDrafts.clear(); pendingStory = null
        refreshStories()
        _storyUpload.value = null
    }

    /** Posts a story; null on success, else what to tell the person. */
    suspend fun postStory(text: String, bg: String, gifs: List<StoryGif>): String? {
        val arr = JSONArray()
        gifs.forEach { arr.put(JSONObject().put("url", it.url).put("preview", it.preview).put("w", it.w).put("h", it.h).put("x", it.x.toDouble()).put("y", it.y.toDouble())) }
        val r = socket.askWith("story-post", JSONObject().put("text", text).put("bg", bg).put("gifs", arr))
            ?: return "No connection. Try again."
        if (!r.optBoolean("ok")) return r.optString("error").ifBlank { "Could not post. Try again." }
        refreshStories()
        return null
    }

    fun deleteStory(id: String) {
        scope.launch {
            socket.askWith("story-delete", JSONObject().put("id", id))
            refreshStories()
        }
    }

    /** A heart on a friend's story; shown at once, taken back if the server says no. */
    fun likeStory(ownerId: String, id: String, on: Boolean) {
        fun set(v: Boolean) = _stories.update { list ->
            list.map { p -> if (p.clientId != ownerId) p else p.copy(stories = p.stories.map { if (it.id == id) it.copy(liked = v, seen = true) else it }) }
        }
        set(on)
        scope.launch {
            val r = socket.askWith("story-like", JSONObject().put("clientId", ownerId).put("id", id).put("on", on))
            if (r?.optBoolean("ok") != true) set(!on)
        }
    }

    /** A quick emoji or a written reply to a friend's story: it goes to their inbox. Returns true when sent. */
    suspend fun answerStory(ownerId: String, id: String, emoji: String? = null, text: String? = null): Boolean {
        val payload = JSONObject().put("clientId", ownerId).put("id", id)
        val r = if (emoji != null) socket.askWith("story-react", payload.put("emoji", emoji))
        else socket.askWith("story-reply", payload.put("text", text.orEmpty()))
        val ok = r?.optBoolean("ok") == true
        _toasts.tryEmit(UiText.Res(if (ok) R.string.story_sent else R.string.t_couldnt_send))
        return ok
    }

    fun markStorySeen(ownerId: String, id: String) {
        _stories.update { list ->
            list.map { p -> if (p.clientId != ownerId) p else p.copy(stories = p.stories.map { if (it.id == id) it.copy(seen = true) else it }) }
        }
        socket.emit("story-seen", JSONObject().put("clientId", ownerId).put("id", id))
    }

    // --- Friend calls ------------------------------------------------------

    fun call(person: Person) {
        _outgoing.value = OutgoingCall(person, status = "calling")
        socket.emit("call-back-request", JSONObject().put("targetClientId", person.clientId))
    }

    fun cancelCall() {
        val target = _outgoing.value?.person?.clientId ?: return
        _outgoing.value = null
        socket.emit("call-back-cancel", JSONObject().put("targetClientId", target))
    }

    private var answerTimeout: Job? = null

    fun answer(accept: Boolean) {
        val call = _incoming.value ?: return
        if (call.answering) return
        if (!accept) { _incoming.value = null; _callDeclined.tryEmit(call.fromClientId) }
        else {
            // Show "Connecting…" right away; give up if the call never comes up.
            _incoming.value = call.copy(answering = true)
            answerTimeout?.cancel()
            answerTimeout = scope.launch {
                delay(15_000)
                if (_incoming.value?.let { it.fromClientId == call.fromClientId && it.answering } == true) {
                    _incoming.value = null
                    _toasts.tryEmit(UiText.Res(R.string.t_couldnt_reach))
                }
            }
        }
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

    private fun onStateSync(o: JSONObject, fromCache: Boolean = false) {
        if (!fromCache) SocialCache.saveState(identity.clientId, o)
        applyOwn(o)
        _friends.value = o.optJSONArray("friends").people().keepingReceipts(_friends.value)
        _requests.value = o.optJSONArray("friendRequests").people()
        _sent.value = o.optJSONArray("sentRequests").people().map { it.clientId }.toSet()
        _history.value = o.optJSONArray("chatHistory").people().keepingReceipts(_history.value)
        _historyHidden.value = o.optInt("historyHidden")
        _muted.value = o.optJSONArray("muted").strings().toSet()
        val counts = mutableMapOf<String, Int>()
        val waiting = mutableMapOf<String, MutableList<String>>()
        o.optJSONArray("notifications")?.let { arr ->
            for (i in 0 until arr.length()) {
                val n = arr.optJSONObject(i) ?: continue
                if (n.optString("type") == "message") {
                    val from = n.optString("fromClientId")
                    n.optString("msgId").takeIf { it.isNotBlank() }?.let { waiting.getOrPut(from) { mutableListOf() }.add(it) }
                    if (from.isNotBlank() && from != openChat) counts[from] = (counts[from] ?: 0) + 1
                }
            }
        }
        _unread.value = counts
        if (!fromCache) waiting.forEach { (from, ids) -> ackReceived(from, ids) }
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

    private val ackedIds = java.util.Collections.synchronizedSet(HashSet<String>())
    @Volatile private var changesSince = 0L

    /** Tells the server these friend messages are on this phone; only then do senders see "delivered". */
    private fun ackReceived(from: String, ids: Collection<String>) {
        if (from.isBlank()) return
        if (ackedIds.size > 3000) ackedIds.clear()
        val fresh = ids.filter { it.isNotBlank() && ackedIds.add(it) }.take(200)
        if (fresh.isEmpty()) return
        socket.emit("friend-message-received", JSONObject().put("friendClientId", from).put("ids", JSONArray(fresh)))
    }

    private fun onIncomingMessage(o: JSONObject) {
        val from = o.optString("fromClientId")
        val msg = ChatMessage.from(o, identity.clientId).copy(mine = false)
        ackReceived(from, listOf(msg.id))
        // A new message brings an archived chat back to the list.
        if (from in archived.value) privacy?.setArchived(from, false)
        updateThread(from) { list -> if (list.any { it.id == msg.id }) list else list + msg }
        _typing.update { it - from }
        bumpLast(from, LastMessage(false, msg.text, msg.gifUrl != null, msg.voiceMs != null, msg.ts, false, id = msg.id))
        val who = person(from)?.displayName ?: o.optString("username").ifBlank { "Someone" }
        _messageEvents.tryEmit(Triple(from, who, when { msg.gifUrl != null -> "GIF"; msg.voiceMs != null -> "🎤"; else -> msg.text.take(40) }))
        if (from == openChat) markRead(from) else _unread.update { it + (from to ((it[from] ?: 0) + 1)) }
    }

    private fun onSent(o: JSONObject) {
        val to = o.optString("toClientId")
        val id = o.optString("id")
        val ts = o.optLong("ts")
        updateThread(to) { list -> list.map { if (it.id == id && it.status.rank < MsgStatus.Sent.rank) it.copy(status = MsgStatus.Sent, ts = ts) else it } }
        // A story reply or reaction was sent from the story viewer, not the thread: add it there.
        if (o.optJSONObject("story") != null) updateThread(to) { list ->
            if (list.any { it.id == id }) list else list + ChatMessage.from(o, identity.clientId).copy(mine = true)
        }
        bumpLast(to, LastMessage(true, o.optString("text"), !o.isNull("gif"), !o.isNull("voice"), ts, o.optBoolean("seen"), o.optBoolean("delivered") || o.optBoolean("seen"), id))
        // A resend answered from the stored copy already knows how far it got.
        if (o.optBoolean("seen")) raiseReceipt(to, MsgStatus.Seen, setOf(id))
        else if (o.optBoolean("delivered")) raiseReceipt(to, MsgStatus.Delivered, setOf(id))
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

    private fun onHistory(o: JSONObject, fromCache: Boolean = false) {
        val id = o.optString("friendClientId")
        if (!fromCache && !o.optBoolean("older")) SocialCache.saveThread(identity.clientId, o)
        o.optString("voice").takeIf { it.isNotBlank() }?.let { v -> _voice.update { it + (id to v) } }
        o.optString("gate").takeIf { it.isNotBlank() }?.let { g -> _gates.update { it + (id to g) } }
        o.optJSONObject("disappearing")?.let { d -> _disappearing.update { it + (id to Disappearing(d.optBoolean("on"), d.optBoolean("byMe"))) } }
        val arr = o.optJSONArray("messages") ?: JSONArray()
        val fromServer = (0 until arr.length()).mapNotNull { arr.optJSONObject(it)?.let { m -> ChatMessage.from(m, identity.clientId) } }
        // Paging fields are absent from an older server, which sends the whole thread.
        val paged = o.has("hasMore")
        if (paged) {
            _hasOlder.update { if (o.optBoolean("hasMore")) it + id else it - id }
        }
        if (!fromCache) {
            loadingOlder.remove(id)
            ackReceived(id, fromServer.filter { !it.mine }.map { it.id })
        }
        if (o.optBoolean("older")) {
            // An older page goes in front of what is already loaded.
            updateThread(id) { local -> fromServer.filter { m -> local.none { it.id == m.id } } + local }
            return
        }
        updateThread(id) { local ->
            // Keep messages still on their way; the server copy wins for the rest.
            val pending = local.filter { it.status == MsgStatus.Sending || it.status == MsgStatus.Failed }
                .filter { p -> fromServer.none { it.id == p.id } }
            // A receipt already known never goes back to an older one.
            val known = local.associate { it.id to it.status }
            // The newest page replaces what was loaded for that stretch of time
            // (that is how an unsend or edit made while away reaches this phone);
            // older pages already scrolled back to stay where they are.
            val floor = fromServer.firstOrNull()?.ts
            val older = if (paged && floor != null && _hasOlder.value.contains(id)) {
                local.filter { it.ts < floor && it.status != MsgStatus.Sending && it.status != MsgStatus.Failed && fromServer.none { s -> s.id == it.id } }
            } else emptyList()
            older + fromServer.map { m -> known[m.id]?.takeIf { it.rank > m.status.rank }?.let { m.copy(status = it) } ?: m } + pending
        }
        _threads.value[id]?.lastOrNull()?.takeIf { it.mine && it.status.rank >= MsgStatus.Delivered.rank }
            ?.let { raiseReceipt(id, it.status, setOf(it.id)) }
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
        _friends.update { list -> list.map { if (it.clientId == id) it.copy(last = last.after(it.last)) else it } }
        _history.update { list -> list.map { if (it.clientId == id) it.copy(last = last.after(it.last)) else it } }
    }

    /**
     * Delivered / seen, announced live: raises the matching messages in the
     * thread and the conversation list's last message together, so both screens
     * show the same tick. [ids] null means every message of mine in that chat.
     */
    private fun raiseReceipt(who: String, to: MsgStatus, ids: Set<String>? = null) {
        updateThread(who) { list ->
            list.map { if (it.mine && (ids == null || it.id in ids) && it.status.rank >= MsgStatus.Sent.rank && it.status.rank < to.rank) it.copy(status = to) else it }
        }
        fun List<Person>.raised() = map { p ->
            val l = p.last
            if (p.clientId == who && l != null && (ids == null || l.id in ids || l.id.isBlank())) p.copy(last = l.raised(to)) else p
        }
        _friends.update { it.raised() }
        _history.update { it.raised() }
    }

    /** A fresh list from the server keeps the receipts this phone already knows. */
    private fun List<Person>.keepingReceipts(old: List<Person>): List<Person> {
        val before = old.associate { it.clientId to it.last }
        return map { p -> p.last?.let { l -> p.copy(last = l.after(before[p.clientId])) } ?: p }
    }

    private suspend fun request(event: String, payload: JSONObject, result: String): JSONObject? =
        try { socket.request(event, payload, result) } catch (_: TimeoutCancellationException) { null }

    private fun expiryFor(to: String): Long? =
        if (_disappearing.value[to]?.on == true) System.currentTimeMillis() + 24 * 60 * 60 * 1000L else null

    private fun newId(): String {
        val chars = "abcdefghijklmnopqrstuvwxyz0123456789"
        return "a" + (1..15).map { chars[random.nextInt(chars.length)] }.joinToString("")
    }

    /** People from the server; one whose picture is missing keeps the face seen before, and every face seen is remembered. */
    private fun JSONArray?.people(): List<Person> =
        if (this == null) emptyList() else (0 until length()).mapNotNull { optJSONObject(it)?.let(Person::from) }.map { p ->
            val a = p.animal
            if (a != null) { faces[p.clientId] = a; p } else faces[p.clientId]?.let { p.copy(animal = it) } ?: p
        }

    private fun JSONArray?.strings(): List<String> =
        if (this == null) emptyList() else (0 until length()).map { optString(it) }
}
