package app.talklive.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

private val Gold = listOf(Color(0xFFFFE08A), Color(0xFFF2C14E), Color(0xFFD97706), Color(0xFFFFF3C4), Color(0xFFF2C14E), Color(0xFFFFE08A))

/**
 * Plus members' avatars: a slowly turning gold ring with a soft breathing
 * glow, so they stand out everywhere their face appears. Nothing for others.
 */
@Composable
fun PlusRing(active: Boolean, size: Dp, modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    if (!active) { Box(modifier, contentAlignment = Alignment.Center) { content() }; return }
    val still = app.talklive.ui.theme.LocalReduceMotion.current
    val t = rememberInfiniteTransition(label = "plus")
    // Read in draw/layer lambdas only, so the turning ring never recomposes the avatar.
    val spin = t.animateFloat(0f, if (still) 0f else 360f, infiniteRepeatable(tween(3200, easing = LinearEasing)), label = "spin")
    val glow = t.animateFloat(0.35f, if (still) 0.35f else 0.7f, infiniteRepeatable(tween(1400), RepeatMode.Reverse), label = "glow")
    val ring = (size.value * 0.06f).coerceIn(2f, 5f).dp
    Box(modifier.size(size + ring * 4), contentAlignment = Alignment.Center) {
        Canvas(Modifier.size(size + ring * 4)) {
            drawCircle(Brush.radialGradient(listOf(Color(0xFFF2C14E).copy(alpha = glow.value * 0.55f), Color.Transparent)))
        }
        Canvas(Modifier.size(size + ring * 2).graphicsLayer { rotationZ = spin.value }) {
            drawCircle(Brush.sweepGradient(Gold), style = Stroke(width = ring.toPx()))
        }
        Box(Modifier.padding(ring), contentAlignment = Alignment.Center) { content() }
    }
}
