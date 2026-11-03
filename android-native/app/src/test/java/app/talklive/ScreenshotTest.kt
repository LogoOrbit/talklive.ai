package app.talklive

import android.app.Application
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.test.core.app.ApplicationProvider
import app.talklive.auth.AuthRepository
import app.talklive.call.CallPhase
import app.talklive.call.CallState
import app.talklive.data.IdentityStore
import app.talklive.net.Partner
import app.talklive.net.TalkSocket
import app.talklive.ui.CallScreen
import app.talklive.ui.HomeScreen
import app.talklive.ui.TextChatScreen
import app.talklive.ui.FriendStatus
import app.talklive.ui.MutualHeartOverlay
import app.talklive.ui.RateCard
import androidx.compose.foundation.layout.padding
import androidx.compose.ui.unit.dp
import app.talklive.ui.onboarding.AuthViewModel
import app.talklive.ui.onboarding.ChooseScreen
import app.talklive.ui.onboarding.LoginScreen
import app.talklive.ui.onboarding.SignupScreen
import app.talklive.ui.onboarding.SignupStep
import app.talklive.ui.onboarding.WelcomeScreen
import app.talklive.ui.theme.TalkLiveTheme
import com.github.takahirom.roborazzi.captureRoboImage
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** Renders each screen to build/screenshots so the UI can be reviewed without a device. */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w400dp-h860dp-xxhdpi", application = Application::class)
class ScreenshotTest {

    private fun vm(): AuthViewModel {
        val ctx = ApplicationProvider.getApplicationContext<Application>()
        val identity = IdentityStore(ctx)
        val socket = TalkSocket(identity)
        return AuthViewModel(AuthRepository(ctx, socket, identity))
    }

    private fun shot(name: String, dark: Boolean = false, content: @Composable () -> Unit) =
        captureRoboImage("build/screenshots/$name.png") {
            TalkLiveTheme(dark = dark) {
                Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) { content() }
            }
        }

    private val partner = Partner("c_1", "Sofia", "Spain", "ES", "fox", false)

    @Test fun welcome() = shot("01_welcome") { WelcomeScreen(onDone = {}) }
    @Test fun choose() = shot("02_choose") { ChooseScreen(vm(), {}, {}, null) }
    @Test fun signupEmail() = shot("03_signup_email") { SignupScreen(vm().apply { email = "sam@example.com" }, {}) }
    @Test fun signupAccount() = shot("04_signup_account") {
        SignupScreen(vm().apply { email = "sam@example.com"; username = "sam_talks"; password = "secret123"; step = SignupStep.Account }, {})
    }
    @Test fun signupCode() = shot("05_signup_code") {
        SignupScreen(vm().apply { email = "sam@example.com"; code = "4821"; step = SignupStep.Code }, {})
    }
    @Test fun login() = shot("06_login") { LoginScreen(vm(), {}, {}) }
    @Test fun home() = shot("07_home") { HomeScreen(true, 3412, "fox", "Sam", false, {}, {}, {}) }
    @Test fun homeDark() = shot("07b_home_dark", dark = true) { HomeScreen(true, 3412, "fox", "Sam", true, {}, {}, {}) }
    @Test fun animals() = shot("10_animals") { app.talklive.ui.animals.AnimalSetupScreen("owl") {} }
    @Test fun chatsEmpty() = shot("11_chats") { app.talklive.ui.main.EmptyTab(app.talklive.ui.main.MainTab.Chats, onStart = {}) }
    @Test fun reconnecting() = shot("12_reconnecting") {
        CallScreen(CallState(phase = CallPhase.Connected(partner, System.currentTimeMillis()), onHold = true), false, "fox", { 0f }, onNext = {}, onEnd = {}, onMute = {}, onSpeaker = {}, onReport = {})
    }
    @Test fun loginDark() = shot("06b_login_dark", dark = true) { LoginScreen(vm(), {}, {}) }
    @Test fun profile() = shot("13_profile") {
        val ctx = ApplicationProvider.getApplicationContext<Application>()
        val identity = IdentityStore(ctx).apply { animal = "owl" }
        val socket = TalkSocket(identity)
        app.talklive.ui.profile.ProfileScreen(
            onSignIn = {},
            vm = app.talklive.ui.profile.ProfileViewModel(AuthRepository(ctx, socket, identity), identity, app.talklive.data.ThemeStore(ctx), app.talklive.data.PrivacyStore(ctx), socket, app.talklive.social.SocialRepository(socket, identity)),
            engageVm = app.talklive.ui.engage.EngageViewModel(app.talklive.engage.EngageRepository(ctx, socket)),
        )
    }
    private fun socialVm(seed: app.talklive.social.SocialRepository.() -> Unit = {}): app.talklive.ui.social.SocialViewModel {
        val ctx = ApplicationProvider.getApplicationContext<Application>()
        val identity = IdentityStore(ctx)
        val repo = app.talklive.social.SocialRepository(TalkSocket(identity), identity)
        repo.seed()
        return app.talklive.ui.social.SocialViewModel(repo, app.talklive.voice.VoicePlayer(ctx))
    }

    private val now = System.currentTimeMillis()
    private fun p(id: String, name: String, cc: String, animal: String, online: Boolean, last: String? = null, mine: Boolean = false, mins: Long = 5) =
        app.talklive.social.Person(id, name, null, cc, animal, "$name#1234".lowercase(), online, now - 3_600_000,
            last?.let { app.talklive.social.LastMessage(mine, it, false, false, now - mins * 60_000, true) })

    @Test fun friends() = shot("14_friends") {
        app.talklive.ui.social.FriendsScreen(socialVm {
            seedForPreview(
                friends = listOf(p("a", "Sofia", "ES", "fox", true), p("b", "Kenji", "JP", "panda", false), p("c", "Amara", "NG", "owl", true)),
                requests = listOf(p("d", "Lucas", "BR", "dolphin", true)),
                history = listOf(p("e", "Mia", "DE", "cat", true), p("f", "Omar", "EG", "lion", false)),
            )
        }, {}, {})
    }
    @Test fun chats() = shot("15_chats") {
        app.talklive.ui.social.ChatsScreen(socialVm {
            seedForPreview(
                friends = listOf(
                    p("a", "Sofia", "ES", "fox", true, "Haha that was so fun, talk tomorrow?", mins = 2),
                    p("b", "Kenji", "JP", "panda", false, "See you!", mine = true, mins = 90),
                ),
                unread = mapOf("a" to 2),
            )
        }, {}, {})
    }
    @Test fun chat() = shot("16_chat") {
        val vm = socialVm {
            seedForPreview(
                friends = listOf(p("a", "Sofia", "ES", "fox", true)),
                threads = mapOf("a" to listOf(
                    app.talklive.social.ChatMessage("1", false, "Hey! It was great talking earlier 😄", now - 600_000),
                    app.talklive.social.ChatMessage("2", true, "Same! Your Spanish tips were gold", now - 540_000),
                    app.talklive.social.ChatMessage("3", true, "Want to practise again tonight?", now - 530_000),
                    app.talklive.social.ChatMessage("4", false, "Yes! 8pm my time?", now - 300_000, replyTo = "3"),
                    app.talklive.social.ChatMessage("5", true, "Perfect, I'll call you", now - 60_000, status = app.talklive.social.MsgStatus.Seen),
                )),
                typing = setOf("a"),
            )
        }
        app.talklive.ui.social.ChatScreen(vm, "a") {}
    }
    @Test fun incoming() = shot("17_incoming") {
        app.talklive.ui.social.IncomingCallScreen(app.talklive.social.IncomingCall("a", "Sofia", "ES"), "fox", {}, {})
    }
    private val chatPartner = Partner("c_2", "Kenji", "Japan", "JP", "panda", false, "Asia/Tokyo", "en", listOf("anime", "music", "travel"))
    private fun chatScreen(msgs: List<app.talklive.social.ChatMessage>, typing: Boolean = false) =
        @androidx.compose.runtime.Composable {
            TextChatScreen(
                state = CallState(phase = CallPhase.Connected(chatPartner, now), mode = app.talklive.call.CallMode.Chat, partnerTyping = typing),
                messages = msgs, myAnimal = "fox", friendStatus = FriendStatus.None,
                icebreakers = { n -> listOf(app.talklive.data.Icebreaker("🎧", "What song is stuck in your head?"), app.talklive.data.Icebreaker("🍕", "Best pizza topping, go."), app.talklive.data.Icebreaker("🌍", "Where in the world are you?")).take(n) },
                onSend = { _, _ -> }, onTyping = {}, onReact = { _, _ -> }, onAddFriend = {}, onReport = {}, onNext = {}, onEnd = {},
            )
        }
    @Test fun textChatNew() = shot("18_text_new") { chatScreen(emptyList())() }
    @Test fun textChat() = shot("19_text_chat") {
        chatScreen(listOf(
            app.talklive.social.ChatMessage("1", true, "What song is stuck in your head?", now - 90_000),
            app.talklive.social.ChatMessage("2", false, "Haha, a Ghibli soundtrack, all day long", now - 60_000, theirReaction = null, myReaction = "😂"),
            app.talklive.social.ChatMessage("3", false, "And yours?", now - 50_000),
        ), typing = true)()
    }
    @Test fun homeText() = shot("20_home_text") {
        HomeScreen(true, 3412, "fox", "Sam", false, {}, {}, {}, mode = app.talklive.call.CallMode.Chat)
    }
    @Test fun mutualHeart() = shot("21_match") {
        Box(Modifier.fillMaxSize()) {
            CallScreen(CallState(phase = CallPhase.Connected(partner, now)), true, "fox", { 0.2f }, onNext = {}, onEnd = {}, onMute = {}, onSpeaker = {}, onReport = {})
            MutualHeartOverlay("Sofia", true, {}, {})
        }
    }
    @Test fun rate() = shot("22_rate") {
        Box(Modifier.fillMaxSize(), contentAlignment = androidx.compose.ui.Alignment.BottomCenter) {
            RateCard("Sofia", {}, {}, Modifier.padding(16.dp))
        }
    }
    @Test fun gameTtt() = shot("23_game_ttt") {
        val b = app.talklive.game.Board(app.talklive.game.GameKind.TicTacToe, cells = listOf(0, null, 1, null, 0, null, 1, null, null), turn = 0)
        app.talklive.ui.game.GameContent(app.talklive.game.GameUi(app.talklive.game.Stage.Playing, app.talklive.game.GameKind.TicTacToe, b, 0), "Sofia", {}, {}, { _, _ -> }, {}, {})
    }
    @Test fun gameDots() = shot("24_game_dots") {
        var b = app.talklive.game.Board(app.talklive.game.GameKind.Dots)
        with(app.talklive.game.Board) {
            for ((p, k, i) in listOf(Triple(0, 'h', 0), Triple(1, 'h', 4), Triple(0, 'v', 0), Triple(1, 'v', 1), Triple(1, 'h', 9), Triple(0, 'v', 7))) b = b.dabMove(p, k, i) ?: b
        }
        app.talklive.ui.game.GameContent(app.talklive.game.GameUi(app.talklive.game.Stage.Playing, app.talklive.game.GameKind.Dots, b, 1), "Sofia", {}, {}, { _, _ -> }, {}, {})
    }
    @Test fun gamePicker() = shot("25_game_picker") {
        app.talklive.ui.game.GameContent(app.talklive.game.GameUi(), "Sofia", {}, {}, { _, _ -> }, {}, {})
    }
    @Test fun homeStreak() = shot("26_home_streak") {
        HomeScreen(true, 3412, "fox", "Sam", false, {}, {}, {},
            engage = app.talklive.engage.Engage(app.talklive.engage.Streak(6, 9, true), listOf("ES", "JP", "BR", "DE"), app.talklive.engage.Week(12, 5, 640)),
            filtersActive = 2)
    }
    @Test fun voiceChat() = shot("27_voice_chat") {
        val vm = socialVm {
            seedForPreview(
                friends = listOf(p("a", "Sofia", "ES", "fox", true)),
                threads = mapOf("a" to listOf(
                    app.talklive.social.ChatMessage("1", false, "", now - 600_000, voiceMs = 14_000, voiceId = "v1"),
                    app.talklive.social.ChatMessage("2", true, "Haha love that", now - 500_000, edited = true, theirReaction = "❤️"),
                    app.talklive.social.ChatMessage("3", true, "", now - 60_000, voiceMs = 6_000, voiceId = "v2", status = app.talklive.social.MsgStatus.Seen),
                )),
            )
        }
        app.talklive.ui.social.ChatScreen(vm, "a") {}
    }
    @Test fun searching() = shot("08_searching") {
        CallScreen(CallState(phase = CallPhase.Searching(4)), true, "fox", { 0f }, onNext = {}, onEnd = {}, onMute = {}, onSpeaker = {}, onReport = {})
    }
    @Test fun inCall() = shot("09_in_call") {
        CallScreen(CallState(phase = CallPhase.Connected(partner, System.currentTimeMillis() - 83_000)), true, "fox", { 0.2f }, onNext = {}, onEnd = {}, onMute = {}, onSpeaker = {}, onReport = {})
    }
}
