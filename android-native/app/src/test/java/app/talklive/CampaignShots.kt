@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import androidx.test.core.app.ApplicationProvider
import app.talklive.call.CallMode
import app.talklive.call.CallPhase
import app.talklive.call.CallState
import app.talklive.data.IdentityStore
import app.talklive.net.OnlinePerson
import app.talklive.net.Partner
import app.talklive.net.TalkSocket
import app.talklive.social.ChatMessage
import app.talklive.social.LastMessage
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
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.ParameterizedRobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Store-campaign screens: the real composables on a 20:9 phone, in the dark
 * and the light theme. The app area is 392 x 813 dp at 4x: an 871 dp screen
 * less the status bar (36 dp) and gesture bar (22 dp), which the campaign
 * build draws around it. The test clock is paused, so endless animations
 * (the Plus ring, live avatars) are captured as a still frame.
 * Output: build/campaign/<name>-<dark|light>.png
 *
 *   ./gradlew testDebugUnitTest --tests '*CampaignShots*' -Proborazzi.test.record=true
 */
@RunWith(ParameterizedRobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w392dp-h813dp-xxxhdpi", application = Application::class)
class CampaignShots(private val dark: Boolean) {

    companion object {
        @JvmStatic
        @ParameterizedRobolectricTestRunner.Parameters(name = "dark={0}")
        fun themes() = listOf(arrayOf<Any>(true), arrayOf<Any>(false))
    }

    @get:Rule val rule = createComposeRule()

    private val now = System.currentTimeMillis()

    private fun shot(name: String, content: @Composable () -> Unit) {
        rule.mainClock.autoAdvance = false
        rule.setContent {
            CompositionLocalProvider(LocalReduceMotion provides true) {
                TalkLiveTheme(dark = dark) {
                    Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) { content() }
                }
            }
        }
        rule.mainClock.advanceTimeBy(2_500)
        rule.onRoot().captureRoboImage("build/campaign/$name-${if (dark) "dark" else "light"}.png")
    }

    /** A main tab, with the bottom bar as MainScreen lays it out. */
    @Composable
    private fun Tab(tab: MainTab, badges: Map<MainTab, Int> = emptyMap(), content: @Composable () -> Unit) {
        Scaffold(
            containerColor = MaterialTheme.colorScheme.background,
            bottomBar = { TabBar(selected = tab, onSelect = {}, badges = badges) },
        ) { pad -> Box(Modifier.fillMaxSize().padding(bottom = pad.calculateBottomPadding())) { content() } }
    }

    /** As ModalBottomSheet draws it over the call: the scrim, then the sheet with its handle. */
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

    private val socialVms = HashMap<String, app.talklive.ui.social.SocialViewModel>()
    private fun socialVm(key: String, seed: app.talklive.social.SocialRepository.() -> Unit) = socialVms.getOrPut(key) {
        val ctx = ApplicationProvider.getApplicationContext<Application>()
        val identity = IdentityStore(ctx)
        val repo = app.talklive.social.SocialRepository(TalkSocket(identity), identity)
        repo.seed()
        app.talklive.ui.social.SocialViewModel(repo, app.talklive.voice.VoicePlayer(ctx))
    }

    private fun person(id: String, name: String, cc: String, animal: String, online: Boolean, mode: String = "talk", mins: Long = 30, secs: Int = 0, last: LastMessage? = null) =
        app.talklive.social.Person(id, name, null, cc, animal, "$name#1234".lowercase(), online, now - mins * 60_000, last,
            mode = mode, durationSeconds = secs, ts = now - mins * 60_000)

    private val online = listOf(
        OnlinePerson("Kenji", "JP", "Japan", "panda", emptyList(), false),
        OnlinePerson("Lucía", "ES", "Spain", "rabbit", emptyList(), true),
        OnlinePerson("Amara", "NG", "Nigeria", "lion", emptyList(), false),
        OnlinePerson("Mateus", "BR", "Brazil", "owl", emptyList(), false),
        OnlinePerson("Priya", "IN", "India", "cat", emptyList(), true),
        OnlinePerson("Jonas", "DE", "Germany", "wolf", emptyList(), false),
    )
    private val engage = app.talklive.engage.Engage(
        app.talklive.engage.Streak(6, 9, true, freezesLeft = 1), listOf("ES", "JP", "BR", "IN", "NG", "DE", "CA", "MX"), app.talklive.engage.Week(27, 11, 1840),
    )

    @Test fun home() = shot("home") {
        Tab(MainTab.Talk) {
            HomeScreen(true, 1633, "fox", "Sam", false, {}, {}, {}, engage = engage, premium = false, online = online)
        }
    }

    @Test fun homeText() = shot("home_text") {
        Tab(MainTab.Talk) {
            HomeScreen(true, 1633, "fox", "Sam", false, {}, {}, {}, mode = CallMode.Chat, engage = engage, premium = false, online = online)
        }
    }

    private val caller = Partner("c_1", "Priya", "India", "IN", "cat", false, "Asia/Kolkata", "en", listOf("music", "travel", "movies"))
    private val bands = FloatArray(28) { i -> (0.14f + 0.34f * kotlin.math.sin(i / 2.6).toFloat().let { it * it }).coerceIn(0f, 1f) }

    @Composable
    private fun LiveCall(sinceMs: Long) = CallScreen(
        CallState(phase = CallPhase.Connected(caller, sinceMs)), true, "fox", { 0.35f },
        onNext = {}, onEnd = {}, onMute = {}, onSpeaker = {}, onReport = {}, bands = { bands },
    )

    @Test fun call() = shot("call") { LiveCall(now - 247_000) }

    @Test fun searching() = shot("searching") {
        CallScreen(CallState(phase = CallPhase.Searching(4)), true, "fox", { 0f }, onNext = {}, onEnd = {}, onMute = {}, onSpeaker = {}, onReport = {})
    }

    private val texter = Partner("c_2", "Kenji", "Japan", "JP", "panda", false, "Asia/Tokyo", "en", listOf("anime", "music", "travel"))

    @Test fun textChat() = shot("text_chat") {
        TextChatScreen(
            state = CallState(phase = CallPhase.Connected(texter, now - 400_000), mode = CallMode.Chat),
            messages = listOf(
                ChatMessage("1", false, "Hey! Where are you from? 👋", now - 300_000),
                ChatMessage("2", true, "Lisbon! You?", now - 280_000),
                ChatMessage("3", false, "Osaka 🇯🇵 I've always wanted to visit Portugal", now - 240_000, myReaction = "😍"),
                ChatMessage("4", true, "You'd love it. What song is stuck in your head?", now - 200_000),
                ChatMessage("5", false, "A Ghibli soundtrack, all day long 🎶", now - 120_000),
            ),
            myAnimal = "fox", friendStatus = FriendStatus.None,
            icebreakers = { emptyList() },
            onSend = { _, _ -> }, onTyping = {}, onReact = { _, _ -> }, onAddFriend = {}, onReport = {}, onNext = {}, onEnd = {},
        )
    }

    @Test fun friends() = shot("friends") {
        Tab(MainTab.Friends, badges = mapOf(MainTab.Chats to 2, MainTab.Friends to 1)) {
            app.talklive.ui.social.FriendsScreen(socialVm("friends") {
                seedForPreview(
                    friends = listOf(
                        person("a", "Sofia", "ES", "dolphin", true),
                        person("b", "Kenji", "JP", "panda", true),
                        person("c", "Amara", "NG", "owl", false, mins = 95),
                        person("d", "Mateus", "BR", "lion", false, mins = 300),
                        person("e", "Priya", "IN", "cat", false, mins = 1440),
                    ),
                    requests = listOf(person("f", "Lucas", "CA", "penguin", true)),
                    history = listOf(
                        person("g", "Noor", "AE", "deer", true, mode = "talk", secs = 1260),
                        person("i", "Hiro", "JP", "koala", false, mode = "talk", secs = 540, mins = 50),
                        person("h", "Elif", "TR", "rabbit", false, mode = "chat", mins = 60),
                        person("j", "Chloé", "FR", "fox", true, mode = "chat", mins = 75),
                    ),
                )
            }, {}, {})
        }
    }

    @Test fun voiceNotes() = shot("voice_notes") {
        val vm = socialVm("voice") {
            seedForPreview(
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
        }
        app.talklive.ui.social.ChatScreen(vm, "a") {}
    }

    @Test fun chats() = shot("chats") {
        Tab(MainTab.Chats, badges = mapOf(MainTab.Chats to 3, MainTab.Friends to 1)) {
            app.talklive.ui.social.ChatsScreen(socialVm("chats") {
                seedForPreview(
                    friends = listOf(
                        person("a", "Sofia", "ES", "dolphin", true, mins = 1, last = LastMessage(false, "Same time tomorrow?", false, false, now - 60_000, true)),
                        person("b", "Kenji", "JP", "panda", true, mins = 20, last = LastMessage(true, "Haha that was so fun", false, false, now - 1_200_000, true)),
                        person("c", "Amara", "NG", "owl", false, mins = 95, last = LastMessage(false, "", false, true, now - 5_700_000, true)),
                        person("d", "Mateus", "BR", "lion", false, mins = 300, last = LastMessage(true, "Boa noite! 🌙", false, false, now - 18_000_000, true)),
                    ),
                    unread = mapOf("a" to 2, "c" to 1),
                )
            }, {}, {})
        }
    }

    @Test fun incoming() = shot("incoming") {
        app.talklive.ui.social.IncomingCallScreen(app.talklive.social.IncomingCall("a", "Sofia", "ES"), "dolphin", {}, {})
    }

    @Test fun game() = shot("game") {
        Sheet({ LiveCall(now - 412_000) }) {
            val b = app.talklive.game.Board(app.talklive.game.GameKind.TicTacToe, cells = listOf(0, null, 1, null, 0, null, 1, null, null), turn = 0)
            app.talklive.ui.game.GameContent(
                app.talklive.game.GameUi(app.talklive.game.Stage.Playing, app.talklive.game.GameKind.TicTacToe, b, 0),
                "Priya", {}, {}, { _, _ -> }, {}, {},
            )
        }
    }

    @Test fun gamePicker() = shot("game_picker") {
        Sheet({ LiveCall(now - 130_000) }) {
            app.talklive.ui.game.GameContent(app.talklive.game.GameUi(), "Priya", {}, {}, { _, _ -> }, {}, {})
        }
    }

    @Test fun animals() = shot("animals") { app.talklive.ui.animals.AnimalSetupScreen("fox") {} }

    @Test fun plus() = shot("plus") {
        app.talklive.ui.engage.PlusContent(
            app.talklive.engage.Premium(false, null, false), signedIn = true, myAnimal = "fox", myName = "Sam",
            state = app.talklive.billing.BillingState.Ready(
                listOf(
                    app.talklive.billing.PlusPlan("monthly", "$9.99", "P1M", "a", null),
                    app.talklive.billing.PlusPlan("yearly", "$69.99", "P1Y", "b", null),
                ),
                listOf(
                    app.talklive.billing.PlusPass("pass_1d", 1, "$1.99", 0), app.talklive.billing.PlusPass("pass_7d", 7, "$4.99", 0),
                    app.talklive.billing.PlusPass("pass_15d", 15, "$6.99", 0),
                ),
            ),
            busy = false, onSignIn = {}, onBuy = {}, onRestore = {}, onManage = {},
        )
    }

    @Config(qualifiers = "w392dp-h2400dp-xxxhdpi")
    @Test fun plusTall() = shot("plus_tall") {
        app.talklive.ui.engage.PlusContent(
            app.talklive.engage.Premium(false, null, false), signedIn = true, myAnimal = "fox", myName = "Sam",
            state = app.talklive.billing.BillingState.Ready(
                listOf(
                    app.talklive.billing.PlusPlan("monthly", "$9.99", "P1M", "a", null),
                    app.talklive.billing.PlusPlan("yearly", "$69.99", "P1Y", "b", null),
                ),
            ),
            busy = false, onSignIn = {}, onBuy = {}, onRestore = {}, onManage = {},
        )
    }
}
