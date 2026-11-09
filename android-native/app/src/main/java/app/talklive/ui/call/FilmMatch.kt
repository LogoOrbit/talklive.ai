package app.talklive.ui.call

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.talklive.R
import app.talklive.ui.theme.BrandTeal
import app.talklive.ui.theme.BrandViolet

/** "You both liked Interstellar" - shown for a few seconds when two people share a favourite. */
@Composable
fun FilmMatchBanner(title: String?, modifier: Modifier = Modifier) {
    var shown by remember { mutableStateOf("") }
    if (title != null) shown = title
    val haptics = LocalHapticFeedback.current
    LaunchedEffect(title) { if (title != null) haptics.performHapticFeedback(HapticFeedbackType.LongPress) }
    AnimatedVisibility(
        visible = title != null,
        modifier = modifier.statusBarsPadding().padding(top = 72.dp, start = 24.dp, end = 24.dp),
        enter = slideInVertically(spring(dampingRatio = 0.6f)) { -it } + fadeIn() + scaleIn(initialScale = 0.9f),
        exit = slideOutVertically { -it } + fadeOut(),
    ) {
        Row(
            Modifier.widthIn(max = 360.dp).shadow(12.dp, RoundedCornerShape(50))
                .clip(RoundedCornerShape(50))
                .background(Brush.horizontalGradient(listOf(BrandTeal, BrandTeal)))
                .padding(horizontal = 18.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            app.talklive.ui.components.SymbolIcon("🎬", 20.dp, tint = androidx.compose.ui.graphics.Color.White)
            Spacer(Modifier.width(10.dp))
            Text(
                stringResource(R.string.film_match, shown),
                color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 14.sp,
                maxLines = 2, overflow = TextOverflow.Ellipsis,
            )
        }
    }
}
