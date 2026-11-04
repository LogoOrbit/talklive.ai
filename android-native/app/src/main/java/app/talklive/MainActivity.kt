package app.talklive

import android.graphics.Color
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.runtime.getValue
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.runtime.setValue
import app.talklive.data.ThemeStore
import app.talklive.ui.TalkLiveRoot
import app.talklive.ui.theme.TalkLiveTheme
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    @Inject lateinit var themeStore: ThemeStore

    @Inject lateinit var engage: app.talklive.engage.EngageRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        handle(intent)
        setContent {
            val theme by themeStore.theme.collectAsStateWithLifecycle()
            val dark = theme.isDark
            LaunchedEffect(theme) {
                val bars = if (dark) SystemBarStyle.dark(Color.TRANSPARENT)
                else SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT)
                enableEdgeToEdge(bars, bars)
                window.decorView.setBackgroundColor(when (theme) { app.talklive.ui.theme.AppTheme.Light -> 0xFFE3E7F1.toInt(); app.talklive.ui.theme.AppTheme.Ocean -> 0xFF03151F.toInt(); app.talklive.ui.theme.AppTheme.Sunset -> 0xFF1A0B14.toInt(); else -> 0xFF0B0F1A.toInt() })
            }
            TalkLiveTheme(theme) {
                // Tablets and unfolded phones: keep the app a comfortable column, centred.
                androidx.compose.foundation.layout.Box(
                    Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
                    contentAlignment = androidx.compose.ui.Alignment.TopCenter,
                ) {
                    androidx.compose.foundation.layout.Box(
                        Modifier.fillMaxHeight().widthIn(max = 720.dp),
                    ) { TalkLiveRoot() }
                    // The logo morph, once per launch (not on rotation).
                    var intro by androidx.compose.runtime.saveable.rememberSaveable { androidx.compose.runtime.mutableStateOf(savedInstanceState == null) }
                    if (intro) app.talklive.ui.onboarding.LaunchIntro { intro = false }
                }
            }
        }
    }

    override fun onNewIntent(intent: android.content.Intent) {
        super.onNewIntent(intent)
        handle(intent)
    }

    /** Shortcuts start a call or chat; a talklive.app/?ref=CODE link is a referral. */
    private fun handle(intent: android.content.Intent?) {
        when (intent?.action) {
            "app.talklive.START_TALK" -> app.talklive.data.LaunchActions.pending.value = app.talklive.data.LaunchActions.Action.Talk
            "app.talklive.START_CHAT" -> app.talklive.data.LaunchActions.pending.value = app.talklive.data.LaunchActions.Action.Chat
        }
        intent?.data?.getQueryParameter("ref")?.takeIf { it.matches(Regex("^[A-Za-z0-9]{3,16}$")) }?.let { engage.setReferral(it) }
    }
}

