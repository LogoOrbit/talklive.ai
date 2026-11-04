package app.talklive.ui.onboarding

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import app.talklive.R
import app.talklive.ui.components.BrandGradient
import app.talklive.ui.theme.LocalReduceMotion
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

/**
 * The launch moment: the round talk orb shrinks and squares off into the
 * TalkLive "T", the name slides out beside it, then everything fades into
 * the app. About a second; skipped when the phone asks for no animations.
 */
@Composable
fun LaunchIntro(onDone: () -> Unit) {
    val still = LocalReduceMotion.current
    val morph = remember { Animatable(0f) }    // 0 = orb, 1 = logo
    val logo = remember { Animatable(0f) }
    val word = remember { Animatable(0f) }
    val out = remember { Animatable(1f) }
    LaunchedEffect(Unit) {
        if (still) { onDone(); return@LaunchedEffect }
        coroutineScope {
            launch { morph.animateTo(1f, tween(520, easing = FastOutSlowInEasing)) }
            launch { kotlinx.coroutines.delay(260); logo.animateTo(1f, spring(dampingRatio = 0.5f, stiffness = Spring.StiffnessMediumLow)) }
            launch { kotlinx.coroutines.delay(420); word.animateTo(1f, tween(380, easing = FastOutSlowInEasing)) }
        }
        kotlinx.coroutines.delay(220)
        out.animateTo(0f, tween(320))
        onDone()
    }
    Box(
        Modifier.fillMaxSize().graphicsLayer { alpha = out.value }.background(MaterialTheme.colorScheme.background),
        contentAlignment = Alignment.Center,
    ) {
        // Logo above the name, both centred, so nothing shifts as the name appears.
        androidx.compose.foundation.layout.Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(Modifier.size(150.dp), contentAlignment = Alignment.Center) {
                // The orb: a big gradient circle that becomes a small rounded square, then fades as the logo lands.
                val m = morph.value
                val size = (150 - 70 * m).dp
                Box(
                    Modifier.size(size).graphicsLayer { alpha = 1f - logo.value * 0.95f; rotationZ = -18f * m }
                        .clip(RoundedCornerShape(percent = (50 - 28 * m).toInt())).background(BrandGradient),
                )
                Image(
                    painterResource(R.drawable.logo), null,
                    Modifier.size(80.dp).graphicsLayer {
                        alpha = logo.value.coerceIn(0f, 1f)
                        val sc = 0.4f + 0.6f * logo.value
                        scaleX = sc; scaleY = sc
                        rotationZ = 14f * (1f - logo.value)
                    },
                )
            }
            Spacer(Modifier.size(12.dp))
            Text(
                "TalkLive",
                style = MaterialTheme.typography.displaySmall,
                color = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.graphicsLayer { alpha = word.value; translationY = 24f * (1f - word.value) },
                maxLines = 1,
            )
        }
    }
}
