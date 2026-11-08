package app.talklive.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

val PlusGold = Color(0xFFF5C451)
private val GoldText = Brush.linearGradient(listOf(Color(0xFFFFE08A), Color(0xFFF2C14E), Color(0xFFD97706), Color(0xFFF2C14E)))

/** A name, in gold for Plus members, so everyone they meet can tell. */
@Composable
fun PlusName(
    name: String,
    premium: Boolean,
    style: TextStyle,
    modifier: Modifier = Modifier,
    color: Color = MaterialTheme.colorScheme.onBackground,
    textAlign: TextAlign? = null,
    maxLines: Int = 1,
    overflow: TextOverflow = TextOverflow.Ellipsis,
) {
    Text(
        name,
        modifier = modifier,
        style = if (premium) style.copy(brush = GoldText, fontWeight = FontWeight.Bold) else style.copy(color = color),
        textAlign = textAlign,
        maxLines = maxLines,
        overflow = overflow,
    )
}

/** The small "💎 Plus" tag next to a Plus member's name. */
@Composable
fun PlusTag(modifier: Modifier = Modifier) {
    Text(
        "💎 Plus",
        modifier = modifier
            .background(PlusGold.copy(alpha = 0.14f), RoundedCornerShape(50))
            .border(1.dp, PlusGold.copy(alpha = 0.55f), RoundedCornerShape(50))
            .padding(horizontal = 8.dp, vertical = 2.dp),
        color = PlusGold, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, maxLines = 1,
    )
}

/**
 * When a Plus member connects: a gold light sweeps across the screen and
 * "💎 Plus member" appears for a moment. [key] changes per person met.
 */
@Composable
fun PlusEntrance(key: Any?, premium: Boolean, modifier: Modifier = Modifier) {
    var show by remember { mutableStateOf(false) }
    val still = app.talklive.ui.theme.LocalReduceMotion.current
    val sweep = remember { Animatable(-0.4f) }
    LaunchedEffect(key, premium) {
        show = false
        if (key == null || !premium || still) return@LaunchedEffect
        show = true
        sweep.snapTo(-0.4f)
        sweep.animateTo(1.4f, tween(1100, easing = LinearEasing))
        kotlinx.coroutines.delay(1600)
        show = false
    }
    Box(modifier.fillMaxSize()) {
        if (show) Canvas(Modifier.fillMaxSize()) {
            val x = size.width * sweep.value
            drawRect(
                Brush.linearGradient(
                    listOf(Color.Transparent, PlusGold.copy(alpha = 0.28f), Color(0xFFFFF3C4).copy(alpha = 0.4f), PlusGold.copy(alpha = 0.28f), Color.Transparent),
                    start = Offset(x - size.width * 0.35f, 0f), end = Offset(x + size.width * 0.35f, size.height),
                ),
            )
        }
        AnimatedVisibility(
            show, modifier = Modifier.align(Alignment.TopCenter).padding(top = 120.dp),
            enter = scaleIn(spring(dampingRatio = 0.5f), initialScale = 0.6f) + fadeIn(), exit = fadeOut(),
        ) {
            Text(
                "💎  Plus member",
                modifier = Modifier.background(Color.Black.copy(alpha = 0.55f), RoundedCornerShape(50))
                    .border(1.dp, PlusGold, RoundedCornerShape(50)).padding(horizontal = 16.dp, vertical = 8.dp),
                style = TextStyle(brush = GoldText, fontWeight = FontWeight.Bold, fontSize = 15.sp),
            )
        }
    }
}
