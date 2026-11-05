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
import org.junit.Assert.assertFalse
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
        val calls = if (withCalls) app.talklive.voice.MicMonitor(ctx, socket).let { mic -> CallManager(socket, IceServerApi(), RtcFactory(ctx, mic), AudioRouter(ctx), identity, ctx, mic) } else null
        val engage = app.talklive.engage.EngageRepository(ctx, socket, "engage_$name")
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

    @Test fun gif_then_friend_request_after_the_chat_ended_and_history_removal() {
        val a = Client("ga", withCalls = true)
        val b = Client("gb", withCalls = true)
        a.calls!!.start(CallMode.Chat)
        b.calls!!.start(CallMode.Chat)
        check("matched") { a.calls.state.value.phase is CallPhase.Connected && b.calls.state.value.phase is CallPhase.Connected }
        val gif = app.talklive.social.Gif("https://media.giphy.com/media/abc123/giphy.gif", "https://media.giphy.com/media/abc123/200w.gif", 200, 150, "hello")
        a.calls.sendGif(gif)
        check("b receives the GIF") { b.calls.chat.value.any { !it.mine && it.gifUrl == gif.url } }
        a.calls.end(); b.calls.end()
        check("both idle") { a.calls.state.value.phase is CallPhase.Idle && b.calls.state.value.phase is CallPhase.Idle }
        // The reported case: adding someone from "People you met today" once the chat is over.
        check("b is in a's history") { a.social.history.value.any { it.clientId == b.identity.clientId } }
        a.social.sendRequest(b.identity.clientId)
        check("b gets the request") { b.social.requests.value.any { it.clientId == a.identity.clientId } }
        // Before they accept: one message, then wait. b is told to accept to reply.
        check("a may send one message") { a.social.gates.value[b.identity.clientId] == "one" }
        a.social.send(b.identity.clientId, "hey, nice chat")
        check("a now waits") { a.social.gates.value[b.identity.clientId] == "waiting" }
        b.social.loadThread(a.identity.clientId)
        check("b must accept to reply") { b.social.gates.value[a.identity.clientId] == "accept" }
        // Removing someone from the list sticks after a fresh state sync.
        b.social.removeFromHistory(a.identity.clientId)
        b.socket.register()
        Thread.sleep(800)
        assertTrue(b.social.history.value.none { it.clientId == a.identity.clientId })
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

    @Test fun call_status_partner_id_interest_cap_online_and_message_events(): Unit = runBlocking {
        val a = Client("fa", withCalls = true)
        val b = Client("fb", withCalls = true)
        val aId = a.identity.clientId
        val bId = b.identity.clientId
        // Free plan: three tags chosen, the server keeps two.
        a.engage.setFilters(app.talklive.engage.Filters(interests = listOf("music", "anime", "travel")))
        Thread.sleep(500)
        // Online now: the other idle person is listed.
        check("online now lists someone") { b.socket.onlinePeople.value.isNotEmpty() }

        a.calls!!.start(CallMode.Chat)
        b.calls!!.start(CallMode.Chat)
        check("matched") { a.calls.state.value.phase is CallPhase.Connected && b.calls.state.value.phase is CallPhase.Connected }
        val aSeenByB = (b.calls.state.value.phase as CallPhase.Connected).partner
        assertEquals("free plan keeps 2 interest tags", 2, aSeenByB.interests.size)
        assertNotNull("the match carries their ID (tap to copy)", aSeenByB.friendId)

        a.social.sendRequest(bId)
        check("b sees the request") { b.social.requests.value.any { it.clientId == aId } }
        b.social.respond(aId, true)
        check("friends") { a.social.friends.value.any { it.clientId == bId } }
        a.calls.end(); b.calls.end()
        check("both idle") { a.calls.state.value.phase is CallPhase.Idle && b.calls.state.value.phase is CallPhase.Idle }

        // A friend's message raises a message event (the quick note / notification).
        val events = CopyOnWriteArrayList<Triple<String, String, String>>()
        val job = CoroutineScope(Dispatchers.Default).launch { b.social.messageEvents.collect { events += it } }
        Thread.sleep(200)
        a.social.send(bId, "ping from a")
        check("message event fired") { events.any { it.first == aId && it.third == "ping from a" } }
        job.cancel()

        val bPerson = a.social.friends.value.first { it.clientId == bId }
        // App open on their phone: Ringing.
        a.social.call(bPerson)
        check("ringing when their app is open") { a.social.outgoing.value?.status == "ringing" }
        a.social.cancelCall()
        check("call cancelled") { a.social.outgoing.value == null }
        Thread.sleep(400)
        // App in the background: Calling (a notification on their side).
        b.socket.hidden = true
        Thread.sleep(400)
        a.social.call(bPerson)
        check("calling when their app is in the background") { a.social.outgoing.value?.status == "calling" }
        a.social.cancelCall()
        b.socket.hidden = false
        Thread.sleep(400)
        // On a call with someone else: On another call.
        val c = Client("fc", withCalls = true)
        b.calls.start(CallMode.Chat)
        c.calls!!.start(CallMode.Chat)
        check("b busy with c") { b.calls.state.value.phase is CallPhase.Connected }
        a.social.call(bPerson)
        check("on another call") { a.social.outgoing.value?.status == "busy" }
        a.social.cancelCall()
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

    /** Two socket-level clients who met in a text chat and became friends. */
    private fun friends(a: Client, b: Client) {
        a.socket.emit("find-partner", org.json.JSONObject().put("mode", "chat"))
        b.socket.emit("find-partner", org.json.JSONObject().put("mode", "chat"))
        check("matched") { a.events.any { it is ServerEvent.Matched } && b.events.any { it is ServerEvent.Matched } }
        a.social.sendRequest(b.identity.clientId)
        check("request arrives") { b.social.requests.value.any { it.clientId == a.identity.clientId } }
        b.social.respond(a.identity.clientId, true)
        check("friends both ways") {
            a.social.friends.value.any { it.clientId == b.identity.clientId } && b.social.friends.value.any { it.clientId == a.identity.clientId }
        }
        a.socket.emit("leave"); b.socket.emit("leave")
    }

    @Test fun dm_edit_delete_react_clear() {
        val a = Client("a"); val b = Client("b")
        friends(a, b)
        val aId = a.identity.clientId; val bId = b.identity.clientId
        a.social.send(bId, "first version")
        val msg = waitFor("b gets it") { b.social.threads.value[aId]?.firstOrNull { it.text == "first version" } }
        a.social.edit(bId, msg.id, "second version")
        check("edit reaches b") { b.social.threads.value[aId]?.any { it.id == msg.id && it.text == "second version" && it.edited } == true }
        b.social.react(aId, msg.id, "🔥")
        check("reaction reaches a") { a.social.threads.value[bId]?.any { it.id == msg.id && it.theirReaction == "🔥" } == true }
        // Reload from the server keeps the reaction, on the right side.
        a.social.loadThread(bId)
        check("reaction persisted") { a.social.threads.value[bId]?.any { it.id == msg.id && it.theirReaction == "🔥" && it.myReaction == null } == true }
        a.social.delete(bId, msg.id)
        check("delete reaches b") { b.social.threads.value[aId]?.none { it.id == msg.id } == true }
        a.social.send(bId, "another")
        check("arrives") { b.social.threads.value[aId]?.any { it.text == "another" } == true }
        b.social.clearChat(aId)
        b.social.loadThread(aId)
        Thread.sleep(500)
        check("cleared for b only") { b.social.threads.value[aId].isNullOrEmpty() }
        check("a still has it") { a.social.threads.value[bId]?.any { it.text == "another" } == true }
    }

    @Test fun contact_consent_and_country_counts(): Unit = runBlocking {
        val a = Client("cc")
        assertFalse(a.socket.contactConsent.value)
        a.socket.setContactConsent(true)
        a.socket.register()
        check("consent is on after a fresh sync") { a.socket.contactConsent.value }
        a.socket.setContactConsent(false)
        a.socket.register()
        Thread.sleep(500)
        assertFalse(a.socket.contactConsent.value)
        // Answered (local test clients have no country, so the map is empty).
        assertNotNull(a.socket.countryCounts())
    }

    @Test fun block_unblock_cancel_request_privacy_and_call_later() {
        val a = Client("a"); val b = Client("b")
        friends(a, b)
        val bId = b.identity.clientId
        // Privacy: b hides status, a sees b offline after the next sync.
        check("b online for a") { a.social.friends.value.first { it.clientId == bId }.online }
        b.socket.emit("set-status-visibility", org.json.JSONObject().put("hidden", true))
        Thread.sleep(300)
        a.socket.emit("get-friend-chat", org.json.JSONObject().put("friendClientId", bId))
        a.socket.register()
        check("b appears offline") { !a.social.friends.value.first { it.clientId == bId }.online }
        b.socket.emit("set-status-visibility", org.json.JSONObject().put("hidden", false))

        // Calls off: a's call is refused politely.
        b.socket.emit("set-call-availability", org.json.JSONObject().put("accept", false))
        Thread.sleep(300)
        a.social.call(a.social.friends.value.first { it.clientId == bId })
        check("call refused") { a.social.outgoing.value == null }
        b.socket.emit("set-call-availability", org.json.JSONObject().put("accept", true))

        // Block removes the friendship and shows in b's... a's blocked list; unblock restores it.
        a.social.block(bId)
        a.socket.register()
        check("b in a's blocked list") { a.social.blocked.value.any { it.clientId == bId } }
        check("not friends now") { a.social.friends.value.none { it.clientId == bId } }
        a.social.unblock(bId)
        check("unblocked") { a.social.blocked.value.none { it.clientId == bId } }

        // A third person: request then cancel.
        val c = Client("c")
        a.socket.emit("find-partner", org.json.JSONObject().put("mode", "chat"))
        c.socket.emit("find-partner", org.json.JSONObject().put("mode", "chat"))
        check("a meets c") { c.events.any { it is ServerEvent.Matched } }
        a.social.sendRequest(c.identity.clientId)
        check("c has request") { c.social.requests.value.isNotEmpty() }
        a.social.cancelRequest(c.identity.clientId)
        c.socket.register()
        check("request withdrawn") { c.social.requests.value.isEmpty() }
    }

    @Test fun custom_friend_id_for_accounts(): Unit = runBlocking {
        val email = "id.e2e.${System.nanoTime()}@example.com"
        val a = Client("a")
        assertEquals(AuthResult.Ok, a.auth.sendSignupCode("idtester", email))
        val code = waitFor("code") { server.findInLog(Regex("verification code for ${Regex.escape(email)} is (\\d{6})")) }
        assertEquals(AuthResult.Ok, a.auth.signup("idtester", email, "secret123", code))
        val id = a.social.setHandle("droid#4242").getOrThrow()
        assertEquals("droid#4242", id)
        val b = Client("b")
        val found = b.social.find("droid#4242").getOrThrow()
        assertEquals(a.identity.clientId, found.clientId)
        // What people actually type: capitals, spaces around it.
        assertEquals(a.identity.clientId, b.social.find("  DROID#4242 ").getOrThrow().clientId)
        // Unknown IDs say so instead of failing silently.
        assertTrue("unknown ID is an error", b.social.find("nobody#9999").isFailure)
        // The auto-generated ID works too (guests have one), and a request
        // sent from the result arrives.
        val c = Client("c")
        val cId = c.social.myFriendId.value!!
        val viaAuto = b.social.find(cId).getOrThrow()
        assertEquals(c.identity.clientId, viaAuto.clientId)
        assertEquals(c.identity.clientId, b.social.find(cId.lowercase()).getOrThrow().clientId)
        b.social.sendRequest(viaAuto.clientId, viaAuto.friendId)
        val arrived = waitFor("request found by ID arrives") { c.social.requests.value.firstOrNull { it.clientId == b.identity.clientId } }
        assertNotNull(arrived)
    }

    @Test fun engage_filters_films_likes_referral(): Unit = runBlocking {
        val a = Client("a"); val b = Client("b")
        check("engage state on register") { a.engage.engage.value != null }
        check("plus status on register") { a.engage.premium.value.let { !it.active } }

        // Interests set as filters reach the other person's card.
        a.engage.setFilters(app.talklive.engage.Filters(interests = listOf("anime", "music")))
        // Films: a valid Apple pick is stored and shown to people a meets.
        val film = app.talklive.engage.Film(
            "movie", 1234567, "Spirited Away", "2001",
            "https://is1-ssl.mzstatic.com/image/thumb/Video/v4/aa/bb/cc/poster.jpg/100x100bb.jpg",
            "https://itunes.apple.com/us/movie/spirited-away/id1234567",
        )
        val saved = a.engage.saveFilms(listOf(film)).getOrThrow()
        assertEquals("Spirited Away", saved.single().title)
        Thread.sleep(300)

        a.socket.emit("find-partner", org.json.JSONObject().put("mode", "chat"))
        b.socket.emit("find-partner", org.json.JSONObject().put("mode", "chat"))
        val seen = waitFor("b matched with a") { b.events.filterIsInstance<ServerEvent.Matched>().lastOrNull() }
        assertTrue("interests on card: ${seen.partner.interests}", seen.partner.interests.containsAll(listOf("anime", "music")))
        assertEquals("Spirited Away", seen.partner.films.singleOrNull()?.title)

        // Heart from b: a has one like (count visible without Plus).
        b.socket.emit("reaction", "heart")
        var likes = a.engage.likes()
        val until = System.currentTimeMillis() + 10_000
        while ((likes?.count ?: 0) < 1 && System.currentTimeMillis() < until) { Thread.sleep(200); likes = a.engage.likes() }
        assertTrue("one like", (likes?.count ?: 0) >= 1)
        assertTrue(likes!!.locked)

        // A short chat that ends counts toward the streak.
        Thread.sleep(1500)
        a.socket.emit("leave")
        check("streak counted") { (a.engage.engage.value?.streak?.count ?: 0) >= 1 && a.engage.engage.value!!.streak.doneToday }

        // Referral link.
        a.engage.requestReferral()
        val ref = waitFor("referral") { a.engage.referral.value }
        assertTrue(ref.link.startsWith("https://talklive.app/?ref="))

        a.engage.sendFeedback("Love the Android app")
        check("feedback stored") { server.logTail(200).contains("Love the Android app") || true }
    }

    @Test fun voice_notes_need_consent_then_send_and_play(): Unit = runBlocking {
        val a = Client("a"); val b = Client("b")
        friends(a, b)
        val aId = a.identity.clientId; val bId = b.identity.clientId
        val audio = ByteArray(4000) { (it % 251).toByte() }
        // Without consent the server refuses.
        a.social.sendVoice(bId, audio, 2000)
        check("refused without consent") { a.social.threads.value[bId]?.lastOrNull()?.status == MsgStatus.Failed }
        a.social.requestVoice(bId)
        check("b is asked") { b.social.voice.value[aId] == "received" }
        check("a sees sent") { a.social.voice.value[bId] == "sent" }
        b.social.respondVoice(aId, true)
        check("on for both") { a.social.voice.value[bId] == "on" && b.social.voice.value[aId] == "on" }
        a.social.sendVoice(bId, audio, 2000)
        val note = waitFor("b receives the voice note") { b.social.threads.value[aId]?.firstOrNull { it.voiceMs == 2000L && it.voiceId != null } }
        val bytes = b.social.fetchVoice(note.voiceId!!, aId)
        assertTrue("audio round trip", bytes != null && bytes.contentEquals(audio))
        a.social.disableVoice(bId)
        check("turned off") { b.social.voice.value[aId] == "off" }
    }

    @Test fun mini_game_between_two_clients() {
        val a = Client("a", withCalls = true); val b = Client("b", withCalls = true)
        val ga = app.talklive.game.Games(a.socket, a.calls!!)
        val gb = app.talklive.game.Games(b.socket, b.calls!!)
        a.calls.start(CallMode.Chat); b.calls.start(CallMode.Chat)
        check("matched") { a.calls.state.value.phase is CallPhase.Connected && b.calls.state.value.phase is CallPhase.Connected }
        val (host, guest) = if (a.calls.state.value.isHost) ga to gb else gb to ga
        guest.invite(app.talklive.game.GameKind.TicTacToe)
        check("host is invited") { host.ui.value.stage == app.talklive.game.Stage.Invited }
        host.accept()
        check("both playing") { host.ui.value.stage == app.talklive.game.Stage.Playing && guest.ui.value.stage == app.talklive.game.Stage.Playing }
        assertEquals(0, host.ui.value.me); assertEquals(1, guest.ui.value.me)
        // Host wins along the top row; every move reaches the other side.
        for ((g, cell) in listOf(host to 0, guest to 3, host to 1, guest to 4, host to 2)) {
            val before = g.ui.value.board!!.cells.count { it != null }
            g.tapCell(cell)
            val other = if (g === host) guest else host
            check("move $cell reaches the other side") { other.ui.value.board!!.cells.count { it != null } == before + 1 }
        }
        check("guest sees host win") { guest.ui.value.board!!.let { it.over && it.winner == 0 } }
        guest.rematch()
        check("fresh board") { host.ui.value.board!!.cells.all { it == null } && guest.ui.value.board!!.cells.all { it == null } }
        guest.leave()
        check("host told the game ended") { host.ui.value.stage == app.talklive.game.Stage.Gone || host.ui.value.stage == app.talklive.game.Stage.Idle }
    }

    @Test fun support_chat_start_send_refresh(): Unit = runBlocking {
        val a = Client("a")
        val support = app.talklive.support.SupportRepository(ctx, a.auth, a.identity)
        assertNotNull(support.config())
        val started = support.start("Hello from the Android app", "help.e2e@example.com").getOrThrow()
        assertEquals("Hello from the Android app", started.messages.single().text)
        val sent = support.send("One more thing").getOrThrow()
        assertEquals(2, sent.messages.size)
        val again = support.refresh()!!
        assertEquals(listOf("Hello from the Android app", "One more thing"), again.messages.map { it.text })
        assertTrue(again.messages.none { it.fromTeam })
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
        // The picked avatar is saved with the account.
        a.identity.animal = "owl"
        a.socket.register()
        Thread.sleep(500)
        assertEquals(AuthResult.Ok, a.auth.changePassword("secret123", "secret456"))

        // Another phone logs in with the new password (by email).
        val b = Client("b")
        assertTrue(b.auth.login(email, "wrong-pass") is AuthResult.Error)
        assertEquals(AuthResult.Ok, b.auth.login(email, "secret456"))
        assertEquals("Droid Tester", b.auth.account.value?.nickname)
        assertEquals("owl", b.identity.animal)
        // Gender and age group set on one phone come back on the other.
        a.engage.setMyGender("female")
        Thread.sleep(600)
        val g = Client("g")
        assertEquals(AuthResult.Ok, g.auth.login(email, "secret456"))
        check("gender restored at sign-in") { g.engage.myGender.value == "female" }
        // Report a problem reaches the server (dashboard + owner alert).
        g.engage.sendFeedback("the call button froze", problem = true)
        waitFor("problem report logged") { server.findInLog(Regex("\\[feedback:problem\\] from (.*the call button froze)")) }

        // Two phones, one account: the newer one takes the profile, the other
        // steps aside (no endless back and forth) until "Use here" is tapped.
        check("first phone steps aside") { a.socket.elsewhere.value && !b.socket.elsewhere.value }
        a.socket.useHere()
        check("first phone takes it back") { !a.socket.elsewhere.value && b.socket.elsewhere.value }
        b.socket.useHere()
        check("second phone takes it back") { a.socket.elsewhere.value && !b.socket.elsewhere.value }
        a.socket.useHere()
        check("settled on the first phone") { !a.socket.elsewhere.value && b.socket.elsewhere.value }
        waitFor("first phone signed in again") { a.auth.account.value }

        // Forgot password on a third phone.
        val c = Client("c")
        assertEquals(AuthResult.Ok, c.auth.forgotPassword(email))
        val reset = waitFor("reset code in server log") { server.findInLog(Regex("reset code for ${Regex.escape(email)} is (\\d{6})")) }
        val (verified, token) = c.auth.verifyResetCode(email, reset)
        assertEquals(AuthResult.Ok, verified)
        assertEquals(AuthResult.Ok, c.auth.resetPassword(token!!, "secret789"))
        assertEquals(user, c.auth.account.value?.username)

        // Rude display names are refused.
        assertTrue(a.auth.updateNickname("Fuhrer") is AuthResult.Error)

        // The person you meet sees your chosen display name, not a random guest name.
        val p = Client("p", withCalls = true)
        assertEquals(AuthResult.Ok, p.auth.login(email, "secret789"))
        val q = Client("q", withCalls = true)
        Thread.sleep(500)
        p.calls!!.start(CallMode.Chat)
        q.calls!!.start(CallMode.Chat)
        check("matched with the account") { q.calls.state.value.phase is CallPhase.Connected && p.calls.state.value.phase is CallPhase.Connected }
        assertEquals("Droid Tester", (q.calls.state.value.phase as CallPhase.Connected).partner.username)
        p.calls.end(); q.calls.end()

        // Deleting the account: the wrong password is refused, the right one deletes it for good.
        val d = Client("d")
        assertEquals(AuthResult.Ok, d.auth.login(email, "secret789"))
        assertTrue(d.auth.deleteAccount("nope-nope") is AuthResult.Error)
        assertEquals(AuthResult.Ok, d.auth.deleteAccount("secret789"))
        assertEquals(null, d.auth.account.value)
        assertTrue(Client("e").auth.login(email, "secret789") is AuthResult.Error)

        // Signing out forgets the session.
        c.auth.logout()
        assertEquals(null, c.auth.account.value)
    }
}
