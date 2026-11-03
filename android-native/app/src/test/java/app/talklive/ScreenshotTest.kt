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
    @Test fun home() = shot("07_home") { HomeScreen(true, 1284, "Sam", {}, {}, {}) }
    @Test fun homeDark() = shot("07b_home_dark", dark = true) { HomeScreen(true, 1284, "Sam", {}, {}, {}, dark = true) }
    @Test fun searching() = shot("08_searching") {
        CallScreen(CallState(phase = CallPhase.Searching(4)), {}, {}, {}, {}, {})
    }
    @Test fun inCall() = shot("09_in_call") {
        CallScreen(CallState(phase = CallPhase.Connected(partner, System.currentTimeMillis() - 83_000)), {}, {}, {}, {}, {})
    }
}
