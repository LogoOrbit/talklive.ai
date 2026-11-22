package app.talklive.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.ScrollState
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * A thin scrollbar on the right edge while the content is taller than the screen,
 * so people can see there is more below. Put it BEFORE `verticalScroll(state)` in the
 * modifier chain (it then draws over the visible window, not the whole content).
 */
fun Modifier.verticalScrollbar(state: ScrollState, color: Color = Color.Unspecified, thickness: Dp = 4.dp): Modifier = composed {
    val tint = if (color == Color.Unspecified) MaterialTheme.colorScheme.onSurfaceVariant else color
    // Brighter while moving, still visible when resting.
    val alpha by animateFloatAsState(if (state.isScrollInProgress) 0.85f else 0.4f, tween(250), label = "scrollbar")
    drawWithContent {
        drawContent()
        val max = state.maxValue
        if (max > 0 && max != Int.MAX_VALUE) {
            val view = size.height
            val thumb = (view * view / (view + max)).coerceAtLeast(36.dp.toPx())
            val y = (view - thumb) * (state.value.toFloat() / max)
            val w = thickness.toPx()
            drawRoundRect(
                color = tint.copy(alpha = alpha),
                topLeft = Offset(size.width - w - 2.dp.toPx(), y),
                size = Size(w, thumb),
                cornerRadius = CornerRadius(w / 2f),
            )
        }
    }
}
