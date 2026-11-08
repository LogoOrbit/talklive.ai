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
import androidx.compose.foundation.layout.size
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
import androidx.compose.animation.graphics.res.animatedVectorResource
import androidx.compose.animation.graphics.vector.AnimatedImageVector
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

    private fun shot(name: String, dark: Boolean = true, content: @Composable () -> Unit) =
        captureRoboImage("build/screenshots/$name.png") {
            androidx.compose.runtime.CompositionLocalProvider(app.talklive.ui.theme.LocalReduceMotion provides true) { TalkLiveTheme(dark = dark) {
                Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) { content() } }
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
    // A short phone, with room taken by the bottom bar: buttons keep their size.
    @Config(qualifiers = "w360dp-h560dp-xxhdpi")
    @Test fun homeShort() = shot("07c_home_short", dark = true) {
        val P = { n: String, c: String, a: String -> app.talklive.net.OnlinePerson(n, c, null, a, emptyList(), false) }
        HomeScreen(true, 3412, "fox", "Sam", true, {}, {}, {}, online = listOf(P("Aardvark", "US", "wolf"), P("段造台", "CN", "wolf"), P("zxz", "CN", "dolphin"), P("Daisy", "US", "deer"), P("Mateo", "AR", "fox")))
    }
    @Test fun homeDark() = shot("07b_home_dark", dark = true) {
        val P = { n: String, c: String, cn: String, a: String, i: List<String>, w: Boolean -> app.talklive.net.OnlinePerson(n, c, cn, a, i, w) }
        HomeScreen(true, 3412, "fox", "Sam", true, {}, {}, {}, online = listOf(
            P("Kenji Ito", "JP", "Japan", "panda", emptyList(), false), P("Lucía", "ES", "Spain", "fox", emptyList(), true),
            P("Amara", "NG", "Nigeria", "lion", emptyList(), false), P("Mateus", "BR", "Brazil", "owl", emptyList(), false),
            P("Priya", "IN", "India", "cat", emptyList(), true), P("Jonas", "DE", "Germany", "wolf", emptyList(), false),
        ))
    }
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
            vm = app.talklive.ui.profile.ProfileViewModel(app.talklive.voice.MicMonitor(ctx, socket).let { mic -> app.talklive.call.CallManager(socket, app.talklive.net.IceServerApi(), app.talklive.call.RtcFactory(ctx, mic), app.talklive.call.AudioRouter(ctx), identity, ctx, mic) }, AuthRepository(ctx, socket, identity), identity, app.talklive.data.ThemeStore(ctx), app.talklive.sound.Sounds(ctx), app.talklive.data.PrivacyStore(ctx), socket, app.talklive.social.SocialRepository(socket, identity)),
            engageVm = app.talklive.ui.engage.EngageViewModel(app.talklive.engage.EngageRepository(ctx, socket), app.talklive.voice.MicMonitor(ctx, socket)),
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
                friends = listOf(p("a", "Sofia", "ES", "fox", true).copy(alert = true), p("b", "Kenji", "JP", "panda", false).copy(usualFrom = 14, usualTo = 17), p("c", "Amara", "NG", "owl", true)),
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
    private fun plusShot() = @Composable {
        androidx.compose.foundation.layout.Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
            app.talklive.ui.engage.PlusContent(
                app.talklive.engage.Premium(false, null, false), signedIn = true, myAnimal = "fox", myName = "Sam",
                state = app.talklive.billing.BillingState.Ready(listOf(
                    app.talklive.billing.PlusPlan("monthly", "$4.99", "P1M", "a", null),
                    app.talklive.billing.PlusPlan("yearly", "$35.99", "P1Y", "b", "P7D"),
                )),
                busy = false, onSignIn = {}, onBuy = {}, onRestore = {}, onManage = {},
            )
        }
    }
    @Test fun callLive() = shot("33_call_live") {
        val bands = FloatArray(28) { i -> (0.25f + 0.6f * kotlin.math.sin(i / 3.0).toFloat().let { it * it }).coerceIn(0f, 1f) }
        CallScreen(CallState(phase = CallPhase.Connected(partner, now)), true, "fox", { 0.3f }, onNext = {}, onEnd = {}, onMute = {}, onSpeaker = {}, onReport = {}, bands = { bands })
    }

    // Every blinking Plus avatar must load (a broken one would only crash at runtime).
    @OptIn(androidx.compose.animation.graphics.ExperimentalAnimationGraphicsApi::class)
    @Test fun liveAvatars() = shot("40_live_avatars") {
        androidx.compose.foundation.layout.FlowRow {
            app.talklive.ui.animals.LiveAvatars.values.forEachIndexed { i, id ->
                androidx.compose.foundation.Image(
                    androidx.compose.animation.graphics.res.rememberAnimatedVectorPainter(
                        AnimatedImageVector.animatedVectorResource(id), i % 2 == 1,
                    ),
                    null, Modifier.padding(2.dp).size(44.dp),
                )
            }
        }
    }
    private fun plusPage(state: app.talklive.billing.BillingState) = @Composable {
        app.talklive.ui.engage.PlusContent(
            app.talklive.engage.Premium(false, null, false), signedIn = true, myAnimal = "lion", myName = "Sam",
            state = state, busy = false, onSignIn = {}, onBuy = {}, onRestore = {}, onManage = {},
        )
    }
    @Config(qualifiers = "w400dp-h2400dp-xxhdpi")
    @Test fun plusUnavailableTall() = shot("41_plus_unavailable") { plusPage(app.talklive.billing.BillingState.Unavailable)() }
    @Config(qualifiers = "w400dp-h2400dp-xxhdpi")
    @Test fun plusReadyTall() = shot("42_plus_ready") {
        plusPage(app.talklive.billing.BillingState.Ready(
            listOf(app.talklive.billing.PlusPlan("monthly", "$10.00", "P1M", "a", null)),
            listOf(app.talklive.billing.PlusPass("pass_1d", 1, "$2.00", 0), app.talklive.billing.PlusPass("pass_7d", 7, "$5.00", 0), app.talklive.billing.PlusPass("pass_15d", 15, "$7.00", 0)),
        ))()
    }
    @Test fun start() = shot("50_start") { app.talklive.ui.onboarding.StartScreen({}, {}) }
    @Test fun age() = shot("51_age") { app.talklive.ui.onboarding.AgeScreen({}) {} }
    @Test fun methods() = shot("52_methods") { app.talklive.ui.onboarding.MethodsScreen(vm(), {}, {}, {}, true) }
    @Test fun plus() = shot("30_plus") { plusShot()() }
    @Config(qualifiers = "de-w400dp-h860dp-xxhdpi")
    @Test fun plusGerman() = shot("31_plus_de") { plusShot()() }
    @Config(qualifiers = "ja-w400dp-h860dp-xxhdpi")
    @Test fun homeJapanese() = shot("32_home_ja") { HomeScreen(true, 3412, "fox", "Sam", false, {}, {}, {}) }
    @Config(qualifiers = "ar-w400dp-h860dp-xxhdpi")
    @Test fun homeArabic() = shot("28_home_ar") { HomeScreen(true, 3412, "fox", "Sam", false, {}, {}, {}) }
    @Config(qualifiers = "hi-w400dp-h860dp-xxhdpi")
    @Test fun chooseHindi() = shot("29_choose_hi") { ChooseScreen(vm(), {}, {}, null) }
    @Test fun searching() = shot("08_searching") {
        CallScreen(CallState(phase = CallPhase.Searching(4)), true, "fox", { 0f }, onNext = {}, onEnd = {}, onMute = {}, onSpeaker = {}, onReport = {})
    }
    @Test fun inCall() = shot("09_in_call") {
        CallScreen(CallState(phase = CallPhase.Connected(partner, System.currentTimeMillis() - 83_000)), true, "fox", { 0.2f }, onNext = {}, onEnd = {}, onMute = {}, onSpeaker = {}, onReport = {})
    }
}
