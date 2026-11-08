package app.talklive.ui.components

import androidx.compose.foundation.gestures.snapping.rememberSnapFlingBehavior
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlin.math.abs

/**
 * A drum you flick: momentum, snapping onto each value with a tick, the centre
 * row sharp and large, the rows around it shrinking, fading and blurring away.
 * Numbers use tabular figures so every value keeps the same width.
 */
@Composable
fun WheelPicker(
    items: List<String>,
    selected: Int,
    onSelected: (Int) -> Unit,
    modifier: Modifier = Modifier,
    rowHeight: Dp = 46.dp,
    visibleRows: Int = 5,
) {
    val state = rememberLazyListState(initialFirstVisibleItemIndex = selected.coerceIn(0, (items.size - 1).coerceAtLeast(0)))
    val fling = rememberSnapFlingBehavior(state)
    val haptics = LocalHapticFeedback.current
    val rowPx = with(LocalDensity.current) { rowHeight.toPx() }
    val pad = rowHeight * (visibleRows / 2)
    // The row nearest the middle, while scrolling.
    val centre by remember {
        derivedStateOf { state.firstVisibleItemIndex + if (state.firstVisibleItemScrollOffset > rowPx / 2) 1 else 0 }
    }
    LaunchedEffect(state) {
        snapshotFlow { centre }.distinctUntilChanged().collect {
            haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
            onSelected(it.coerceIn(0, items.lastIndex))
        }
    }
    // Follow the value when it is changed from outside (another wheel clamped it).
    LaunchedEffect(selected) {
        if (selected != centre && !state.isScrollInProgress) state.animateScrollToItem(selected.coerceIn(0, items.lastIndex))
    }
    Box(modifier.height(rowHeight * visibleRows), contentAlignment = Alignment.Center) {
        LazyColumn(
            state = state,
            flingBehavior = fling,
            contentPadding = PaddingValues(vertical = pad),
            modifier = Modifier.fillMaxWidth(),
        ) {
            itemsIndexed(items) { i, label ->
                // How far this row is from the middle, in rows (0 = selected).
                val dist by remember {
                    derivedStateOf {
                        val info = state.layoutInfo.visibleItemsInfo.firstOrNull { it.index == i }
                        if (info == null) 3f else {
                            val mid = (state.layoutInfo.viewportStartOffset + state.layoutInfo.viewportEndOffset) / 2f
                            abs((info.offset + info.size / 2f) - mid) / rowPx
                        }
                    }
                }
                Box(
                    Modifier.fillMaxWidth().height(rowHeight)
                        .graphicsLayer {
                            val d = dist.coerceAtMost(2.5f)
                            alpha = (1f - d * 0.33f).coerceAtLeast(0.12f)
                            val sc = 1f - d * 0.08f
                            scaleX = sc; scaleY = sc
                        }
                        .blur((dist.coerceAtMost(2.5f) * 1.6f).dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        label,
                        textAlign = TextAlign.Center,
                        fontSize = 22.sp,
                        fontWeight = if (dist < 0.5f) FontWeight.SemiBold else FontWeight.Normal,
                        style = MaterialTheme.typography.titleLarge.copy(fontFeatureSettings = "tnum", letterSpacing = 0.sp),
                        color = MaterialTheme.colorScheme.onBackground,
                    )
                }
            }
        }
    }
}

