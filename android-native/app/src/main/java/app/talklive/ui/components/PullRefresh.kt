package app.talklive.ui.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.PullToRefreshDefaults
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.Composable
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
