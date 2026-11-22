package app.talklive.ui.components

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import app.talklive.R
import app.talklive.ui.theme.GoldText
import app.talklive.ui.theme.LocalReduceMotion

/** Three dots that swell one after the other: "something is happening, wait a moment". */
@Composable
fun PulsingDots(modifier: Modifier = Modifier, color: Color = MaterialTheme.colorScheme.primary, dot: Dp = 8.dp) {
    val still = LocalReduceMotion.current
    val t = rememberInfiniteTransition(label = "dots")
    val a = t.animateFloat(0.35f, 1f, infiniteRepeatable(tween(560, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "d0")
    val b = t.animateFloat(0.35f, 1f, infiniteRepeatable(tween(560, delayMillis = 140, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "d1")
    val c = t.animateFloat(0.35f, 1f, infiniteRepeatable(tween(560, delayMillis = 280, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "d2")
    Row(modifier, horizontalArrangement = Arrangement.spacedBy(dot * 0.75f), verticalAlignment = Alignment.CenterVertically) {
        listOf(a, b, c).forEach { s ->
            Box(
                Modifier.size(dot)
                    .graphicsLayer { val v = if (still) 1f else s.value; scaleX = v; scaleY = v; alpha = v }
                    .clip(CircleShape).background(color),
            )
        }
    }
}

/**
 * A friendly "Connecting..." strip for while the app has no line to the server yet
 * (coming back from the background, a bad network): a sliding progress bar and a
 * line that says to wait, instead of a scary "offline".
 */
@Composable
fun ConnectingBar(modifier: Modifier = Modifier, insets: Boolean = true) {
    Surface(color = MaterialTheme.colorScheme.surface, shadowElevation = 2.dp, modifier = modifier.fillMaxWidth()) {
        Column(Modifier.fillMaxWidth().then(if (insets) Modifier.statusBarsPadding() else Modifier)) {
            LinearProgressIndicator(
                modifier = Modifier.fillMaxWidth().height(3.dp),
                color = MaterialTheme.colorScheme.primary,
                trackColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.18f),
            )
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(stringResource(R.string.connecting_wait), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurface)
                Spacer(Modifier.width(10.dp))
                PulsingDots(dot = 5.dp)
            }
        }
    }
}

/** "[name] went offline - waiting for them..." with a moving indicator and a way out. */
@Composable
fun PartnerOfflineBanner(name: String, onLeave: () -> Unit, modifier: Modifier = Modifier) {
    val gold = GoldText
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surfaceVariant,
        border = BorderStroke(1.dp, gold.copy(alpha = 0.5f)),
        modifier = modifier.fillMaxWidth(),
    ) {
        Column(Modifier.fillMaxWidth()) {
            LinearProgressIndicator(
                modifier = Modifier.fillMaxWidth().height(3.dp),
                color = gold,
                trackColor = gold.copy(alpha = 0.18f),
            )
            Row(Modifier.fillMaxWidth().padding(start = 14.dp, end = 4.dp, top = 6.dp, bottom = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                PulsingDots(color = gold, dot = 7.dp)
                Spacer(Modifier.width(12.dp))
                Text(
                    stringResource(R.string.partner_offline_waiting, name),
                    style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.weight(1f),
                )
                TextButton(onClick = onLeave) { Text(stringResource(R.string.leave), color = app.talklive.ui.theme.DangerText) }
            }
        }
    }
}
