package app.talklive

import android.app.Application
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import app.talklive.billing.BillingState
import app.talklive.billing.PlusIntro
import app.talklive.billing.PlusPass
import app.talklive.billing.PlusPlan
import app.talklive.engage.Premium
import app.talklive.ui.engage.PlusContent
import app.talklive.ui.engage.PlusReason
import app.talklive.ui.engage.PlusWhy
import app.talklive.ui.theme.LocalReduceMotion
import app.talklive.ui.theme.TalkLiveTheme
import com.github.takahirom.roborazzi.captureRoboImage
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** Renders the Plus page in its states (build/screenshots/60_* ...) so they can be looked at in light, dark and right-to-left. */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w360dp-h2600dp-xxhdpi", application = Application::class)
class PlusSheetShotTest {
    private fun shot(name: String, dark: Boolean = true, content: @Composable () -> Unit) =
        captureRoboImage("build/screenshots/$name.png") {
            CompositionLocalProvider(LocalReduceMotion provides true) {
                TalkLiveTheme(dark = dark) { Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) { content() } }
            }
        }

    private val monthly = PlusPlan("plus-monthly", "$9.99", "P1M", "m", null, 9_990_000, "USD")
    private val yearly = PlusPlan("plus-yearly", "$69.99", "P1Y", "y", null, 69_990_000, "USD")
    private val passes = listOf(
        PlusPass("pass_1d", 1, "$1.99", 1_990_000, "USD"),
        PlusPass("pass_7d", 7, "$4.99", 4_990_000, "USD"),
        PlusPass("pass_15d", 15, "$6.99", 6_990_000, "USD"),
    )
    private val ready = BillingState.Ready(listOf(monthly, yearly), passes)

    @Composable private fun page(
        state: BillingState, premium: Premium = Premium(false, null, false), pending: Boolean = false,
        why: PlusWhy = PlusWhy(PlusReason.GenderFilter), signedIn: Boolean = true,
    ) = PlusContent(
        premium, signedIn, state, busy = false, myAnimal = "lion", myName = "Sam",
        onSignIn = {}, onBuy = {}, onRestore = {}, onManage = {}, why = why, pending = pending,
    )

    @Test fun readyDark() = shot("60_plus_ready_dark") { page(ready) }
    @Test fun readyLight() = shot("61_plus_ready_light", dark = false) { page(ready) }
    @Config(qualifiers = "ar-ldrtl-w360dp-h2600dp-xxhdpi")
    @Test fun readyRtl() = shot("62_plus_ready_rtl") { page(ready) }
    @Config(qualifiers = "w360dp-h2600dp-xxhdpi")
    @Test fun trialAndIntro() = shot("63_plus_intro") {
        page(BillingState.Ready(listOf(
            monthly.copy(intro = PlusIntro("$0.99", 990_000, "P1M", 1)),
            yearly.copy(intro = PlusIntro("Free", 0, "P7D", 1), trial = "P7D"),
        ), passes), why = PlusWhy(PlusReason.Countries))
    }
    @Test fun pending() = shot("64_plus_pending") { page(ready, pending = true) }
    @Test fun activeSubscription() = shot("65_plus_active") {
        page(ready, Premium(true, 1_800_000_000_000, false, true, source = "play", renews = true, state = "active"))
    }
    @Test fun activeCancelled() = shot("66_plus_active_ending") {
        page(ready, Premium(true, 1_800_000_000_000, false, true, source = "play", renews = false, state = "ending"))
    }
    @Test fun loading() = shot("67_plus_loading") { page(BillingState.Loading) }
    @Test fun unavailable() = shot("68_plus_unavailable") { page(BillingState.Unavailable) }
    @Config(qualifiers = "w360dp-h640dp-xxhdpi")
    @Test fun smallPhone() = shot("69_plus_small_phone") { page(ready, why = PlusWhy(PlusReason.Priority)) }
}
