package app.talklive.e2e

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import app.talklive.auth.AuthRepository
import app.talklive.auth.AuthResult
import app.talklive.call.AudioRouter
import app.talklive.call.CallManager
import app.talklive.call.CallMode
import app.talklive.call.CallPhase
import app.talklive.call.RtcFactory
import app.talklive.data.IdentityStore
import app.talklive.net.IceServerApi
import app.talklive.net.ServerConfig
import app.talklive.net.ServerEvent
import app.talklive.net.TalkSocket
import app.talklive.social.MsgStatus
import app.talklive.social.SocialRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.util.concurrent.CopyOnWriteArrayList

/**
 * End to end: the app's own networking, call, social and account classes
 * against a real local TalkLive server. Two (or three) "phones" in one JVM.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35], application = Application::class)
class ServerE2ETest {
    private lateinit var server: LocalServer
    private val clients = mutableListOf<Client>()
    private val ctx get() = ApplicationProvider.getApplicationContext<Application>()

    inner class Client(name: String, withCalls: Boolean = false) {
        val identity = IdentityStore(ctx, "id_$name")
        val socket = TalkSocket(identity)
        val social = SocialRepository(socket, identity)
        val auth = AuthRepository(ctx, socket, identity, "acc_$name")
        val calls = if (withCalls) CallManager(socket, IceServerApi(), RtcFactory(ctx), AudioRouter(ctx), identity, ctx) else null
        val events = CopyOnWriteArrayList<ServerEvent>()

        init {
            CoroutineScope(Dispatchers.Default).launch { socket.events.collect { events += it } }
            socket.connect()
            waitFor("$name registers") { identity.identityToken }
            waitFor("$name gets a friend ID") { social.myFriendId.value }
            clients += this
        }
    }

    @Before fun setUp() {
        server = LocalServer()
        ServerConfig.url = server.url
    }

    @After fun tearDown() {
        server.close()
    }

    private fun <T : Any> waitFor(what: String, timeoutMs: Long = 15_000, f: () -> T?): T {
        val end = System.currentTimeMillis() + timeoutMs
        while (System.currentTimeMillis() < end) {
            runCatching(f).getOrNull()?.let { if (it != false) return it }
            Thread.sleep(50)
        }
        throw AssertionError("timed out waiting: $what\n--- server log ---\n${server.logTail()}")
    }

    private fun check(what: String, f: () -> Boolean) = waitFor(what) { f().takeIf { it } }

    @Test fun registers_and_gets_identity() {
        val a = Client("a")
        assertTrue(a.identity.identityToken!!.matches(Regex("^[a-f0-9]{64}$")))
        assertNotNull(a.socket.visitorCount.value ?: waitFor("visitor count") { a.socket.visitorCount.value })
    }

    @Test fun text_chat_messages_typing_reactions_next() {
        val a = Client("a", withCalls = true)
        val b = Client("b", withCalls = true)
        a.calls!!.start(CallMode.Chat)
        b.calls!!.start(CallMode.Chat)
        check("both matched") {
            a.calls.state.value.phase is CallPhase.Connected && b.calls.state.value.phase is CallPhase.Connected
        }
        val bOnA = (a.calls.state.value.phase as CallPhase.Connected).partner
        assertEquals(b.identity.clientId, bOnA.clientId)
        assertEquals(CallMode.Chat, a.calls.state.value.mode)

        a.calls.typing()
        check("typing reaches b") { b.calls.state.value.partnerTyping }

        a.calls.sendChat("hello from the app")
        val got = waitFor("b receives message") { b.calls.chat.value.firstOrNull { it.text == "hello from the app" } }
        assertTrue(!got.mine)

        b.calls.reactToMessage(got.id, "❤️")
        check("reaction reaches a") { a.calls.chat.value.any { it.mine && it.theirReaction == "❤️" } }

        // A link is refused by the server and shown as not sent.
        a.calls.sendChat("visit example.com now")
        check("link marked failed") { a.calls.chat.value.lastOrNull { it.mine }?.status == MsgStatus.Failed }

        // Next: both end up searching or rematched with each other again, never stuck connected to a ghost.
        a.calls.next()
        check("a moves on") { a.calls.state.value.phase !is CallPhase.Idle }
        a.calls.end()
        check("a idle") { a.calls.state.value.phase is CallPhase.Idle }
    }

    @Test fun friend_request_messages_seen_and_friend_call(): Unit = runBlocking {
        val a = Client("a", withCalls = true)
        val b = Client("b", withCalls = true)
        // Meet first: the server only lets people who know each other connect.
        a.calls!!.start(CallMode.Chat)
        b.calls!!.start(CallMode.Chat)
        check("matched") { a.calls.state.value.phase is CallPhase.Connected && b.calls.state.value.phase is CallPhase.Connected }

        a.social.sendRequest(b.identity.clientId)
        check("b sees the request") { b.social.requests.value.any { it.clientId == a.identity.clientId } }
        check("a sees it as sent") { b.identity.clientId in a.social.sent.value }
        b.social.respond(a.identity.clientId, true)
        check("a has b as friend") { a.social.friends.value.any { it.clientId == b.identity.clientId } }
        check("b has a as friend") { b.social.friends.value.any { it.clientId == a.identity.clientId } }
        a.calls.end(); b.calls.end()
        check("both idle") { a.calls.state.value.phase is CallPhase.Idle && b.calls.state.value.phase is CallPhase.Idle }

        // Direct message: delivered, confirmed, then seen when b opens it.
        a.social.send(b.identity.clientId, "hey friend")
        check("b receives the DM") { b.social.threads.value[a.identity.clientId]?.any { it.text == "hey friend" && !it.mine } == true }
        check("a's copy confirmed") { a.social.threads.value[b.identity.clientId]?.any { it.text == "hey friend" && it.status == MsgStatus.Sent } == true }
        check("b has it unread") { (b.social.unread.value[a.identity.clientId] ?: 0) > 0 }
        b.social.openChat = a.identity.clientId
        check("unread cleared") { (b.social.unread.value[a.identity.clientId] ?: 0) == 0 }
        check("a sees it seen") { a.social.threads.value[b.identity.clientId]?.any { it.text == "hey friend" && it.status == MsgStatus.Seen } == true }

        // Typing in a DM.
        b.social.typing(a.identity.clientId)
        check("a sees b typing") { b.identity.clientId in a.social.typing.value }

        // History reload keeps the conversation.
        a.social.loadThread(b.identity.clientId)
        check("thread reloaded") { a.social.threads.value[b.identity.clientId]?.any { it.text == "hey friend" } == true }

        // Pin and rename are reflected locally.
        a.social.setPinned(b.identity.clientId, true)
        a.social.rename(b.identity.clientId, "Bestie")
        check("pinned + renamed") { a.social.friends.value.first { it.clientId == b.identity.clientId }.let { it.pinned && it.displayName == "Bestie" } }

        // Friend ID lookup.
        val found = a.social.find(b.social.myFriendId.value!!).getOrThrow()
        assertEquals(b.identity.clientId, found.clientId)
        assertTrue(found.isFriend)

        // Friend call: rings on b; declining tells a.
        val bPerson = a.social.friends.value.first { it.clientId == b.identity.clientId }
        a.social.call(bPerson)
        check("b is ringing") { b.social.incoming.value?.fromClientId == a.identity.clientId }
        b.social.answer(false)
        check("a told it was declined") { a.social.outgoing.value == null }
    }

    @Test fun friend_call_accept_connects_both() {
        // Socket-level clients (no call engine: WebRTC needs a real device).
        val a = Client("a")
        val b = Client("b")
        val c = Client("c", withCalls = true) // only used to make a and b meet
        a.socket.emit("find-partner", org.json.JSONObject().put("mode", "chat"))
        b.socket.emit("find-partner", org.json.JSONObject().put("mode", "chat"))
        check("a and b matched") { a.events.any { it is ServerEvent.Matched } && b.events.any { it is ServerEvent.Matched } }
        a.social.sendRequest(b.identity.clientId)
        check("request") { b.social.requests.value.isNotEmpty() }
        b.social.respond(a.identity.clientId, true)
        check("friends") { a.social.friends.value.isNotEmpty() }
        a.socket.emit("leave"); b.socket.emit("leave")
        a.events.clear(); b.events.clear()

        a.social.call(a.social.friends.value.first())
        check("b rings") { b.social.incoming.value != null }
        b.social.answer(true)
        check("both matched as a friend call") {
            a.events.any { it is ServerEvent.Matched && it.callback } && b.events.any { it is ServerEvent.Matched && it.callback }
        }
        check("ringing screens cleared") { a.social.outgoing.value == null && b.social.incoming.value == null }
        assertTrue(c.identity.identityToken != null)
    }

    @Test fun signup_login_profile_and_password_reset(): Unit = runBlocking {
        val email = "android.e2e.${System.nanoTime()}@example.com"
        val user = "droid${(1000..9999).random()}"
        val a = Client("a")
        assertEquals(AuthResult.Ok, a.auth.sendSignupCode(user, email))
        val code = waitFor("signup code in server log") { server.findInLog(Regex("verification code for ${Regex.escape(email)} is (\\d{6})")) }
        // Wrong code first.
        assertTrue(a.auth.signup(user, email, "secret123", "000000") is AuthResult.Error || code == "000000")
        assertEquals(AuthResult.Ok, a.auth.signup(user, email, "secret123", code))
        assertEquals(user, a.auth.account.value?.username)

        assertEquals(AuthResult.Ok, a.auth.updateNickname("Droid Tester"))
        assertEquals("Droid Tester", a.auth.account.value?.nickname)
        assertEquals(AuthResult.Ok, a.auth.changePassword("secret123", "secret456"))

        // Another phone logs in with the new password (by email).
        val b = Client("b")
        assertTrue(b.auth.login(email, "wrong-pass") is AuthResult.Error)
        assertEquals(AuthResult.Ok, b.auth.login(email, "secret456"))
        assertEquals("Droid Tester", b.auth.account.value?.nickname)

        // Forgot password on a third phone.
        val c = Client("c")
        assertEquals(AuthResult.Ok, c.auth.forgotPassword(email))
        val reset = waitFor("reset code in server log") { server.findInLog(Regex("reset code for ${Regex.escape(email)} is (\\d{6})")) }
        val (verified, token) = c.auth.verifyResetCode(email, reset)
        assertEquals(AuthResult.Ok, verified)
        assertEquals(AuthResult.Ok, c.auth.resetPassword(token!!, "secret789"))
        assertEquals(user, c.auth.account.value?.username)

        // Signing out forgets the session.
        c.auth.logout()
        assertEquals(null, c.auth.account.value)
    }
}
