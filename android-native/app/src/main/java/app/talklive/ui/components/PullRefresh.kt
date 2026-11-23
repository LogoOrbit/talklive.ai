package app.talklive.ui.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.PullToRefreshDefaults
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalDensity

/**
 * Pull to refresh the way social apps do it: the whole page slides down with the finger, the
 * spinner shows in the gap above it, and the page springs back when released.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SlidePullToRefresh(
    refreshing: Boolean,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit,
) {
    val state = rememberPullToRefreshState()
    val travel = with(LocalDensity.current) { PullToRefreshDefaults.PositionalThreshold.toPx() }
    PullToRefreshBox(isRefreshing = refreshing, onRefresh = onRefresh, modifier = modifier, state = state) {
        Box(
            Modifier.fillMaxSize().graphicsLayer { translationY = state.distanceFraction.coerceIn(0f, 1.4f) * travel },
            content = content,
        )
    }
}

/** A page opened from a list (settings, news, support) slides in from the side instead of popping up. */
@Composable
fun SlideInPage(content: @Composable () -> Unit) {
    val shown = androidx.compose.runtime.remember { androidx.compose.animation.core.MutableTransitionState(false) }.apply { targetState = true }
    androidx.compose.animation.AnimatedVisibility(
        shown,
        enter = androidx.compose.animation.slideInHorizontally(androidx.compose.animation.core.tween(300, easing = androidx.compose.animation.core.FastOutSlowInEasing)) { it / 3 } +
            androidx.compose.animation.fadeIn(androidx.compose.animation.core.tween(220)),
    ) { content() }
}

/** Touch feedback for a tappable row: a ripple plus a slight springy press. */
@Composable
fun Modifier.pressable(onClick: () -> Unit): Modifier {
    val src = androidx.compose.runtime.remember { androidx.compose.foundation.interaction.MutableInteractionSource() }
    val pressed by src.collectIsPressedAsState()
    val sc by androidx.compose.animation.core.animateFloatAsState(
        if (pressed) 0.97f else 1f, androidx.compose.animation.core.spring(dampingRatio = 0.55f, stiffness = 900f), label = "press",
    )
    return this.graphicsLayer { scaleX = sc; scaleY = sc }
        .clickable(interactionSource = src, indication = androidx.compose.material3.ripple(), onClick = onClick)
}
