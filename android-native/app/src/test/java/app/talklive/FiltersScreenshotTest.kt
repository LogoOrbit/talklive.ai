package app.talklive

import android.app.Application
import androidx.compose.ui.test.junit4.createComposeRule
import app.talklive.engage.Filters
import app.talklive.ui.engage.FiltersSheet
import app.talklive.ui.theme.TalkLiveTheme
import com.github.takahirom.roborazzi.captureScreenRoboImage
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** The filters sheet is a bottom sheet (its own window), so the whole screen is captured. */
@OptIn(com.github.takahirom.roborazzi.ExperimentalRoborazziApi::class)
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w400dp-h1400dp-xxhdpi", application = Application::class)
class FiltersScreenshotTest {
    @get:Rule val compose = createComposeRule()

    @Test fun filtersWithVoiceCheck() {
        compose.setContent {
            androidx.compose.runtime.CompositionLocalProvider(app.talklive.ui.theme.LocalReduceMotion provides true) {
                TalkLiveTheme(dark = true) {
                    FiltersSheet(Filters(prefGender = "female", prefVoiceChecked = true), premium = true, onApply = {}, onDismiss = {}, voiceCheck = true)
                }
            }
        }
        compose.waitForIdle()
        captureScreenRoboImage("build/screenshots/34_filters_voice.png")
    }
}
