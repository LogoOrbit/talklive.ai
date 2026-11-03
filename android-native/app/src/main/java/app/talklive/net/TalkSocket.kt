package app.talklive.net

import android.util.Log
import app.talklive.BuildConfig
import app.talklive.data.IdentityStore
import io.socket.client.IO
import io.socket.client.Socket
import io.socket.emitter.Emitter
import io.socket.engineio.client.transports.WebSocket
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeout
import org.json.JSONObject
import java.util.Locale
import java.util.TimeZone
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.resume

/**
 * The one Socket.IO connection to the TalkLive server, speaking the same
 * protocol as public/app.js. Registers this device's identity on every
 * (re)connect and turns server messages into [ServerEvent]s.
 */
@Singleton
class TalkSocket(private val identity: IdentityStore, private val privacy: app.talklive.data.PrivacyStore?) {
    @Inject constructor(identity: IdentityStore, privacy: app.talklive.data.PrivacyStore, @Suppress("UNUSED_PARAMETER") marker: InjectMarker) : this(identity, privacy)

    /** Tests build a socket without privacy settings. */
    constructor(identity: IdentityStore) : this(identity, null)


    private val socket: Socket = IO.socket(
        app.talklive.net.ServerConfig.url,
        IO.Options.builder()
            .setTransports(arrayOf(WebSocket.NAME))
            .setReconnection(true)
            .setReconnectionDelay(1_000)
            .setReconnectionDelayMax(10_000)
            .build(),
    )

    private val _connected = MutableStateFlow(false)
    val connected: StateFlow<Boolean> = _connected

    private val _onlineCount = MutableStateFlow<Int?>(null)
    val onlineCount: StateFlow<Int?> = _onlineCount

    /** People who visited in the last 24 hours (the website's header count). */
    private val _visitorCount = MutableStateFlow<Int?>(null)
    val visitorCount: StateFlow<Int?> = _visitorCount

    private val _maintenance = MutableStateFlow<String?>(null)
    /** The site is in maintenance mode: the owner's message. */
    val maintenance: StateFlow<String?> = _maintenance

    private val _warnings = MutableStateFlow<List<OwnerWarning>>(emptyList())
    /** Warnings from the moderators, shown until acknowledged. */
    val warnings: StateFlow<List<OwnerWarning>> = _warnings

    /** Whether the app is in the background, so the server pushes instead of relying on the open socket. */
    @Volatile var hidden = false
        set(value) {
            field = value
            if (socket.connected()) socket.emit("app-visibility", JSONObject().put("hidden", value))
        }

    fun acknowledgeWarning(id: String) {
        _warnings.value = _warnings.value.filterNot { it.id == id }
        socket.emit("owner-warning-ack", JSONObject().put("id", id))
    }

    private val _events = MutableSharedFlow<ServerEvent>(extraBufferCapacity = 128)
    val events: SharedFlow<ServerEvent> = _events

    private var registerFailures = 0

    init {
        socket.on(Socket.EVENT_CONNECT) {
            _connected.value = true
            register()
        }
        socket.on(Socket.EVENT_DISCONNECT) { _connected.value = false }
        socket.on("register-result") { args -> onRegisterResult(args.firstObject()) }
        socket.on("identity-token") { args ->
            val o = args.firstObject() ?: return@on
            val token = o.optString("token")
            if (o.optString("clientId") == identity.clientId && TOKEN_RE.matches(token)) {
                identity.identityToken = token
            }
        }
        socket.on("online-count") { args ->
            when (val v = args.firstOrNull()) {
                is Number -> _onlineCount.value = v.toInt()
                is JSONObject -> v.optInt("count", -1).takeIf { it >= 0 }?.let { _onlineCount.value = it }
            }
        }
        socket.on("visitor-count") { args ->
            (args.firstOrNull() as? Number)?.let { _visitorCount.value = it.toInt() }
        }
        socket.on("needs-register") {
            register()
            _events.tryEmit(ServerEvent.NeedsRegister)
        }
        socket.on("waiting") { args ->
            val o = args.firstObject()
            val eta = o?.takeUnless { it.isNull("estimatedSeconds") }?.optInt("estimatedSeconds")
            _events.tryEmit(ServerEvent.Waiting(eta))
        }
        socket.on("matched") { args ->
            val o = args.firstObject() ?: return@on
            _events.tryEmit(
                ServerEvent.Matched(o.optBoolean("initiator"), Partner.from(o.optJSONObject("partner")), o.optBoolean("callback"), o.optString("mode", "talk")),
            )
        }
        socket.on("signal") { args -> args.firstObject()?.let { _events.tryEmit(ServerEvent.Signal(it)) } }
        socket.on("partner-left") { args ->
            val o = args.firstObject()
            _events.tryEmit(ServerEvent.PartnerLeft(o?.optString("reason") ?: "left", o?.optString("username").orEmpty()))
        }
        socket.on("partner-mic-state") { args ->
            _events.tryEmit(ServerEvent.PartnerMic(args.firstOrNull() == true))
        }
        socket.on("search-refused") { args ->
            _events.tryEmit(ServerEvent.SearchRefused(args.firstObject()?.optString("reason").orEmpty()))
        }
        socket.on("banned") { _events.tryEmit(ServerEvent.Banned) }
        socket.on("maintenance") { args -> _maintenance.value = args.firstObject()?.optString("message")?.ifBlank { "TalkLive is down for maintenance." } ?: "TalkLive is down for maintenance." }
        socket.on("owner-warning") { args ->
            val o = args.firstObject() ?: return@on
            val w = OwnerWarning(o.optString("id"), o.optString("reason"), o.optString("message"))
            if (w.id.isNotBlank() && _warnings.value.none { it.id == w.id }) _warnings.value = _warnings.value + w
        }
        socket.on("chat-message") { args ->
            val o = args.firstObject() ?: return@on
            _events.tryEmit(
                ServerEvent.StrangerMessage(
                    id = o.optNullableString("id") ?: "s${System.nanoTime()}",
                    text = o.optString("text"),
                    gifUrl = o.optJSONObject("gif")?.optNullableString("url"),
                    replyTo = o.optNullableString("replyTo"),
                    ts = o.optLong("ts", System.currentTimeMillis()),
                ),
            )
        }
        socket.on("typing") { _events.tryEmit(ServerEvent.StrangerTyping) }
        socket.on("voice-invite") { args -> _events.tryEmit(ServerEvent.VoiceInvite(args.firstObject()?.optString("username").orEmpty())) }
        socket.on("voice-invite-accepted") { args -> args.firstObject()?.optString("token")?.let { _events.tryEmit(ServerEvent.VoiceInviteAccepted(it)) } }
        socket.on("voice-invite-declined") { args -> _events.tryEmit(ServerEvent.VoiceInviteDeclined(args.firstObject()?.optString("username").orEmpty())) }
        socket.on("game") { args -> args.firstObject()?.let { _events.tryEmit(ServerEvent.Game(it)) } }
        socket.on("chat-reaction") { args ->
            val o = args.firstObject() ?: return@on
            _events.tryEmit(ServerEvent.StrangerReaction(o.optString("id"), o.optString("emoji"), o.optBoolean("on")))
        }
        socket.on("partner-away") { args -> _events.tryEmit(ServerEvent.PartnerAway(args.firstObject()?.optBoolean("away") == true)) }
        socket.on("reaction") { args -> (args.firstOrNull() as? String)?.let { _events.tryEmit(ServerEvent.Reaction(it)) } }
        socket.on("mutual-heart") { args -> _events.tryEmit(ServerEvent.MutualHeart(Partner.from(args.firstObject()?.optJSONObject("partner")))) }
        socket.on("rate-prompt") { args ->
            val o = args.firstObject() ?: return@on
            _events.tryEmit(ServerEvent.RatePrompt(o.optString("t"), o.optInt("s")))
        }
        socket.on("chat-blocked") { args ->
            val o = args.firstObject() ?: return@on
            if (o.optString("scope") != "friend") _events.tryEmit(ServerEvent.StrangerChatBlocked(o.optString("reason")))
        }
    }

    /** Listens for any server event; used by the feature repositories. */
    fun on(event: String, handler: (Array<out Any?>) -> Unit) {
        socket.on(event) { args -> handler(args) }
    }

    fun connect() {
        if (!socket.connected()) socket.connect()
    }

    fun emit(event: String, payload: Any? = null) {
        if (payload == null) socket.emit(event) else socket.emit(event, payload)
    }

    /**
     * Emits [event] and waits for the server's [result] event, the request /
     * response pattern the auth events use (`login` -> `login-result`).
     */
    suspend fun request(event: String, payload: JSONObject, result: String, timeoutMs: Long = 15_000): JSONObject =
        withTimeout(timeoutMs) {
            suspendCancellableCoroutine { cont ->
                val listener = object : Emitter.Listener {
                    override fun call(vararg args: Any?) {
                        socket.off(result, this)
                        if (cont.isActive) cont.resume(args.firstOrNull() as? JSONObject ?: JSONObject())
                    }
                }
                socket.on(result, listener)
                cont.invokeOnCancellation { socket.off(result, listener) }
                socket.emit(event, payload)
            }
        }

    /** Emits [event] and waits for the server's acknowledgement callback. */
    suspend fun ask(event: String, timeoutMs: Long = 10_000): JSONObject? = runCatching {
        withTimeout(timeoutMs) {
            suspendCancellableCoroutine { cont ->
                socket.emit(event, arrayOf(), io.socket.client.Ack { args ->
                    if (cont.isActive) cont.resume(args.firstOrNull() as? JSONObject ?: JSONObject())
                })
            }
        }
    }.getOrNull()

    /** Emits [event] with [payload] and waits for the acknowledgement callback. */
    suspend fun askWith(event: String, payload: JSONObject, timeoutMs: Long = 20_000): JSONObject? = runCatching {
        withTimeout(timeoutMs) {
            suspendCancellableCoroutine { cont ->
                socket.emit(event, arrayOf<Any>(payload), io.socket.client.Ack { args ->
                    if (cont.isActive) cont.resume(args.firstOrNull() as? JSONObject ?: JSONObject())
                })
            }
        }
    }.getOrNull()

    /** Extra fields for registration (match filters). */
    @Volatile var registerExtras: () -> JSONObject? = { null }

    /** Sends the registration again, e.g. after the spirit animal changed. */
    fun register(takeover: Boolean = false) {
        if (!socket.connected()) return
        val payload = JSONObject().apply {
            put("clientId", identity.clientId)
            identity.identityToken?.let { put("identityToken", it) }
            identity.animal?.let { put("animal", it) }
            put("timezone", TimeZone.getDefault().id)
            put("lang", Locale.getDefault().language)
            put("surface", "call")
            privacy?.let { put("hideStatus", it.hideStatus.value); put("acceptCalls", it.acceptCalls.value) }
            if (takeover) put("takeover", true)
            registerExtras()?.let { extra -> extra.keys().forEach { k -> put(k, extra.get(k)) } }
        }
        socket.emit("register", payload)
    }

    private fun onRegisterResult(o: JSONObject?) {
        if (o == null || o.optBoolean("ok", true)) {
            registerFailures = 0
            if (hidden) socket.emit("app-visibility", JSONObject().put("hidden", true))
            _events.tryEmit(ServerEvent.Registered)
            return
        }
        Log.w(TAG, "register refused: ${o.optString("error")}")
        registerFailures++
        // The server could not verify this identity, or it is stuck: start a
        // fresh one rather than never being able to talk.
        if (o.optString("reason") == "unverified" || registerFailures > 3) {
            identity.reset()
            registerFailures = 0
            register()
        } else {
            register(takeover = true)
        }
    }

    private fun Array<out Any?>.firstObject(): JSONObject? = firstOrNull() as? JSONObject

    /** Lets Hilt tell its constructor apart from the test one. */
    class InjectMarker @Inject constructor()

    private companion object {
        const val TAG = "TalkSocket"
        val TOKEN_RE = Regex("^[a-f0-9]{64}$")
    }
}
