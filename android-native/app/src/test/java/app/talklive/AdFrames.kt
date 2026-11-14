@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class, com.github.takahirom.roborazzi.ExperimentalRoborazziApi::class)

package app.talklive

import android.app.Application
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.BottomSheetDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.snapshots.Snapshot
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.swipe
import androidx.test.core.app.ApplicationProvider
import app.talklive.call.CallMode
import app.talklive.call.CallPhase
import app.talklive.call.CallState
import app.talklive.data.IdentityStore
import app.talklive.game.Board
import app.talklive.game.GameKind
import app.talklive.game.GameUi
import app.talklive.game.Stage
import app.talklive.net.OnlinePerson
import app.talklive.net.Partner
import app.talklive.net.TalkSocket
import app.talklive.social.ChatMessage
import app.talklive.social.MsgStatus
import app.talklive.ui.CallScreen
import app.talklive.ui.FriendStatus
import app.talklive.ui.HomeScreen
import app.talklive.ui.TextChatScreen
import app.talklive.ui.main.MainTab
import app.talklive.ui.main.TabBar
import app.talklive.ui.theme.LocalReduceMotion
import app.talklive.ui.theme.TalkLiveTheme
import com.github.takahirom.roborazzi.captureRoboImage
import com.github.takahirom.roborazzi.captureScreenRoboImage
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Frames for the app's video ad: the real screens, dark theme, captured on a
 * paused clock so live animations (search pulse, the call's audio ring, an
 * incoming call, sheets sliding up) and step-by-step states (messages
 * arriving, game moves) come out as real frames of the app.
 * Output: build/adframes/<name>.png (392 x 813 dp app area at 4x).
 *
 *   ./gradlew testDebugUnitTest --tests '*AdFrames*' -Proborazzi.test.record=true
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w392dp-h813dp-xxxhdpi", application = Application::class)
class AdFrames {

    @get:Rule val rule = createComposeRule()

    private val now = System.currentTimeMillis()
    private val out = "build/adframes"

    private fun show(still: Boolean = true, content: @Composable () -> Unit) {
        rule.mainClock.autoAdvance = false
        rule.setContent {
            CompositionLocalProvider(LocalReduceMotion provides still) {
                TalkLiveTheme(dark = true) {
                    Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) { content() }
                }
            }
        }
    }

    /** Change state from the test thread and let the next frame pick it up. */
    private fun set(block: () -> Unit) {
        rule.runOnUiThread(block)
        Snapshot.sendApplyNotifications()
    }

    private fun snap(name: String, advanceMs: Long = 0, screen: Boolean = false) {
        if (advanceMs > 0) rule.mainClock.advanceTimeBy(advanceMs)
        if (screen) captureScreenRoboImage("$out/$name.png") else rule.onRoot().captureRoboImage("$out/$name.png")
    }

    @Composable
    private fun Tab(tab: MainTab, badges: Map<MainTab, Int> = emptyMap(), content: @Composable () -> Unit) {
        Scaffold(
            containerColor = MaterialTheme.colorScheme.background,
            bottomBar = { TabBar(selected = tab, onSelect = {}, badges = badges) },
        ) { pad -> Box(Modifier.fillMaxSize().padding(bottom = pad.calculateBottomPadding())) { content() } }
    }

    @Composable
    private fun Sheet(behind: @Composable () -> Unit, sheet: @Composable () -> Unit) {
        Box(Modifier.fillMaxSize()) {
            behind()
            Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.scrim.copy(alpha = 0.32f)))
            Column(
                Modifier.align(Alignment.BottomCenter).fillMaxWidth()
                    .clip(BottomSheetDefaults.ExpandedShape).background(MaterialTheme.colorScheme.background),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                BottomSheetDefaults.DragHandle()
                sheet()
            }
        }
    }

    private val online = listOf(
        OnlinePerson("Kenji", "JP", "Japan", "panda", emptyList(), false),
        OnlinePerson("Lucía", "ES", "Spain", "rabbit", emptyList(), true),
        OnlinePerson("Amara", "NG", "Nigeria", "lion", emptyList(), false),
        OnlinePerson("Mateus", "BR", "Brazil", "owl", emptyList(), false),
        OnlinePerson("Priya", "IN", "India", "cat", emptyList(), true),
        OnlinePerson("Jonas", "DE", "Germany", "wolf", emptyList(), false),
    )
    private val passport = listOf("CA", "ID", "JP", "IN", "PK", "BR", "US", "PH", "TR", "NL", "BD", "ES", "IE", "IT", "ET", "NG", "MA", "NZ", "EG", "AU", "MX", "KR")
    private val engage = app.talklive.engage.Engage(
        app.talklive.engage.Streak(6, 9, true, freezesLeft = 1), passport, app.talklive.engage.Week(27, 11, 1840),
    )

    @Composable
    private fun Home() = Tab(MainTab.Talk) {
        HomeScreen(true, 1633, "fox", "Sam", false, {}, {}, {}, engage = engage, premium = false, online = online)
    }

    @Test fun home() {
        show { Home() }
        snap("home", 2_500)
    }

    @Test fun searching() {
        show(still = false) {
            CallScreen(CallState(phase = CallPhase.Searching(4)), true, "fox", { 0f }, onNext = {}, onEnd = {}, onMute = {}, onSpeaker = {}, onReport = {})
        }
        rule.mainClock.advanceTimeBy(400)
        for (k in 0 until 30) snap("searching_%02d".format(k), 33)
    }

    private val caller = Partner("c_1", "Priya", "India", "IN", "cat", false, "Asia/Kolkata", "en", listOf("music", "travel", "movies"))

    /** The call's live audio ring, as a voice moves it. */
    private fun band(i: Int, k: Int): Float {
        val wave = kotlin.math.sin(i / 2.6 + k * 0.42).toFloat()
        val pulse = 0.55f + 0.45f * kotlin.math.sin(k * 0.61 + i * 0.37).toFloat()
        return (0.12f + 0.42f * wave * wave * pulse).coerceIn(0f, 1f)
    }

    @Test fun call() {
        val f = mutableIntStateOf(0)
        show(still = false) {
            val k = f.intValue
            // Since = "now" less the time to show, so the timer reads 0:07, then 0:08.
            val since = System.currentTimeMillis() - (7_000L + k * 1000L / 30)
            CallScreen(
                CallState(phase = CallPhase.Connected(caller, since)), true, "fox", { 0.35f },
                onNext = {}, onEnd = {}, onMute = {}, onSpeaker = {}, onReport = {},
                bands = { FloatArray(28) { i -> band(i, k) } },
            )
        }
        rule.mainClock.advanceTimeBy(300)
        for (k in 0 until 45) {
            set { f.intValue = k }
            snap("call_%02d".format(k), 33)
        }
    }

    private val texter = Partner("c_2", "Kenji", "Japan", "JP", "panda", false, "Asia/Tokyo", "en", listOf("anime", "music", "travel"))

    @Test fun text() {
        val all = listOf(
            ChatMessage("1", false, "Hey! Where are you from? 👋", now - 300_000),
            ChatMessage("2", true, "Lisbon! You?", now - 280_000),
            ChatMessage("3", false, "Osaka 🇯🇵 I've always wanted to visit Portugal", now - 240_000),
            ChatMessage("4", true, "You'd love it. What song is stuck in your head?", now - 200_000),
            ChatMessage("5", false, "A Ghibli soundtrack, all day long 🎶", now - 120_000),
        )
        val n = mutableIntStateOf(0)
        val typing = mutableStateOf(false)
        show {
            TextChatScreen(
                state = CallState(phase = CallPhase.Connected(texter, now - 400_000), mode = CallMode.Chat, partnerTyping = typing.value),
                messages = all.take(n.intValue), myAnimal = "fox", friendStatus = FriendStatus.None, icebreakers = { emptyList() },
                onSend = { _, _ -> }, onTyping = {}, onReact = { _, _ -> }, onAddFriend = {}, onReport = {}, onNext = {}, onEnd = {},
            )
        }
        snap("text_0", 1_500)
        val steps = listOf(1 to false, 1 to true, 2 to false, 2 to true, 3 to false, 4 to false, 4 to true, 5 to false)
        steps.forEachIndexed { i, (count, t) ->
            set { n.intValue = count; typing.value = t }
            snap("text_${i + 1}", 600)
        }
    }

    @Test fun game() {
        val step = mutableIntStateOf(0)
        val moves = listOf(0 to 0, 1 to 2, 0 to 4, 1 to 6, 0 to 8)
        show {
            val s = step.intValue
            val cells = MutableList<Int?>(9) { null }
            moves.take(s).forEach { (p, c) -> cells[c] = p }
            val won = s == moves.size
            val b = Board(GameKind.TicTacToe, cells = cells, turn = s % 2, over = won, winner = if (won) 0 else null, line = if (won) listOf(0, 4, 8) else null)
            Sheet({
                CallScreen(
                    CallState(phase = CallPhase.Connected(caller, now - 412_000)), true, "fox", { 0.3f },
                    onNext = {}, onEnd = {}, onMute = {}, onSpeaker = {}, onReport = {}, bands = { FloatArray(28) { i -> band(i, 3) } },
                )
            }) {
                app.talklive.ui.game.GameContent(GameUi(Stage.Playing, GameKind.TicTacToe, b, 0), "Priya", {}, {}, { _, _ -> }, {}, {})
            }
        }
        snap("game_0", 1_500)
        for (s in 1..moves.size) {
            set { step.intValue = s }
            snap("game_$s", 600)
        }
    }

    private fun person(id: String, name: String, cc: String, animal: String, online: Boolean, mode: String = "talk", mins: Long = 30, secs: Int = 0) =
        app.talklive.social.Person(id, name, null, cc, animal, "$name#1234".lowercase(), online, now - mins * 60_000, null,
            mode = mode, durationSeconds = secs, ts = now - mins * 60_000)

    @Test fun friends() {
        val ctx = ApplicationProvider.getApplicationContext<Application>()
        val identity = IdentityStore(ctx)
        val repo = app.talklive.social.SocialRepository(TalkSocket(identity), identity)
        val vm = app.talklive.ui.social.SocialViewModel(repo, app.talklive.voice.VoicePlayer(ctx))
        val friends = listOf(
            person("a", "Sofia", "ES", "dolphin", true), person("b", "Kenji", "JP", "panda", true),
            person("c", "Amara", "NG", "owl", false, mins = 95), person("d", "Mateus", "BR", "lion", false, mins = 300),
        )
        val history = listOf(
            person("g", "Noor", "AE", "deer", true, secs = 1260), person("i", "Hiro", "JP", "koala", false, secs = 540, mins = 50),
            person("h", "Elif", "TR", "rabbit", false, mode = "chat", mins = 60), person("j", "Chloé", "FR", "fox", true, mode = "chat", mins = 75),
        )
        val lucas = person("f", "Lucas", "CA", "penguin", true)
        repo.seedForPreview(friends = friends, requests = listOf(lucas), history = history)
        show { Tab(MainTab.Friends, badges = mapOf(MainTab.Friends to 1)) { app.talklive.ui.social.FriendsScreen(vm, {}, {}) } }
        snap("friends_0", 1_500)
        set { repo.seedForPreview(friends = listOf(lucas) + friends, requests = emptyList(), history = history) }
        snap("friends_1", 600)
    }

    @Test fun incoming() {
        show(still = false) { app.talklive.ui.social.IncomingCallScreen(app.talklive.social.IncomingCall("a", "Sofia", "ES"), "dolphin", {}, {}) }
        rule.mainClock.advanceTimeBy(400)
        for (k in 0 until 30) snap("incoming_%02d".format(k), 33)
    }

    @Test fun voiceNotes() {
        val ctx = ApplicationProvider.getApplicationContext<Application>()
        val identity = IdentityStore(ctx)
        val repo = app.talklive.social.SocialRepository(TalkSocket(identity), identity)
        val vm = app.talklive.ui.social.SocialViewModel(repo, app.talklive.voice.VoicePlayer(ctx))
        repo.seedForPreview(
            friends = listOf(person("a", "Sofia", "ES", "dolphin", true)),
            threads = mapOf("a" to listOf(
                ChatMessage("1", false, "How did the interview go?? 👀", now - 3_400_000),
                ChatMessage("2", true, "I GOT IT 🎉", now - 3_300_000),
                ChatMessage("3", false, "", now - 3_250_000, voiceMs = 21_000, voiceId = "v0"),
                ChatMessage("4", true, "Couldn't have done it without our practice calls", now - 3_100_000, theirReaction = "❤️"),
                ChatMessage("5", false, "Okay you HAVE to hear this 😂", now - 720_000),
                ChatMessage("6", false, "", now - 700_000, voiceMs = 14_000, voiceId = "v1"),
                ChatMessage("7", true, "", now - 560_000, voiceMs = 9_000, voiceId = "v2"),
                ChatMessage("8", false, "Same time tomorrow?", now - 180_000),
                ChatMessage("9", true, "Deal. I'll call you 📞", now - 60_000, status = MsgStatus.Seen),
            )),
        )
        show { app.talklive.ui.social.ChatScreen(vm, "a") {} }
        snap("voice_notes", 2_000)
    }

    @Test fun animals() {
        val pick = mutableStateOf("fox")
        show { key(pick.value) { app.talklive.ui.animals.AnimalSetupScreen(pick.value) {} } }
        snap("animals_fox", 1_500)
        for (a in listOf("owl", "panda", "cat", "lion", "dolphin")) {
            set { pick.value = a }
            snap("animals_$a", 400)
        }
    }

    @Test fun passport() {
        show {
            Home()
            app.talklive.ui.engage.StreakSheet(engage, onDismiss = {})
        }
        snap("passport_00", 16, screen = true)
        for (k in 1..14) snap("passport_%02d".format(k), 33, screen = true)
        snap("passport_end", 1_500, screen = true)
        // Swipe the sheet up, as a person would, to see the whole passport.
        rule.onNodeWithText("Passport", substring = true).performTouchInput { swipe(center, androidx.compose.ui.geometry.Offset(center.x, center.y - 1800f), 220) }
        for (k in 0 until 16) snap("passport_up_%02d".format(k), 33, screen = true)
        snap("passport_full", 1_500, screen = true)
    }

    @Test fun filters() {
        show {
            Home()
            app.talklive.ui.engage.FiltersSheet(
                app.talklive.engage.Filters(interests = listOf("music", "gaming"), includeCountries = listOf("JP", "BR")),
                premium = false, onApply = {}, onDismiss = {},
            )
        }
        snap("filters_00", 16, screen = true)
        for (k in 1..14) snap("filters_%02d".format(k), 33, screen = true)
        snap("filters_end", 1_500, screen = true)
    }
}
