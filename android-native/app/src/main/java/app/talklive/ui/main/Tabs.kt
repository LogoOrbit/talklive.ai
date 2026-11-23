package app.talklive.ui.main

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.wrapContentSize
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Chat
import androidx.compose.material.icons.automirrored.rounded.Chat
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.People
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Tune
import androidx.compose.material.icons.rounded.History
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.People
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.Tune
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import app.talklive.R
import app.talklive.ui.components.PrimaryButton
import app.talklive.ui.theme.BrandTeal
import app.talklive.ui.theme.BrandBlue

enum class MainTab(val label: Int, val icon: ImageVector, val selectedIcon: ImageVector) {
    Talk(R.string.tab_home, Icons.Outlined.Home, Icons.Rounded.Home),
    // Chats is not on the bar: it opens from the Friends screen.
    Chats(R.string.tab_chats, Icons.AutoMirrored.Outlined.Chat, Icons.AutoMirrored.Rounded.Chat),
    Friends(R.string.tab_friends, Icons.Outlined.People, Icons.Rounded.People),
    History(R.string.tab_history, Icons.Outlined.History, Icons.Rounded.History),
    // Filters is an action: it opens the filters sheet rather than a screen.
    Filters(R.string.tab_filters, Icons.Outlined.Tune, Icons.Rounded.Tune),
    Profile(R.string.tab_profile, Icons.Outlined.Person, Icons.Rounded.Person),
    ;

    companion object {
        /** What the bottom bar shows, in order. */
        val bar: List<MainTab> = listOf(Talk, Friends, History, Filters, Profile)
    }
}

@Composable
fun TabBar(
    selected: MainTab,
    onSelect: (MainTab) -> Unit,
    badges: Map<MainTab, Int> = emptyMap(),
    // Profile shows the person's own small avatar instead of an icon; the argument is "selected".
    profileIcon: (@Composable (Boolean) -> Unit)? = null,
) {
    val haptics = LocalHapticFeedback.current
    NavigationBar(containerColor = MaterialTheme.colorScheme.surface, tonalElevation = 0.dp) {
        MainTab.bar.forEach { tab ->
            val on = tab == selected
            NavigationBarItem(
                selected = on,
                onClick = {
                    if (!on) { haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove); app.talklive.sound.Tap.soft() }
                    onSelect(tab)
                },
                icon = {
                    val count = badges[tab] ?: 0
                    BadgedBox(badge = {
                        androidx.compose.animation.AnimatedVisibility(count > 0, enter = androidx.compose.animation.scaleIn(), exit = androidx.compose.animation.scaleOut()) {
                            Badge(containerColor = MaterialTheme.colorScheme.primary) { Text(if (count > 99) "99+" else count.toString()) }
                        }
                    }) {
                        // The avatar is laid out as a 24dp icon like the others (so every label sits on
                        // the same line) and drawn a little larger around its centre.
                        if (tab == MainTab.Profile && profileIcon != null) Box(
                            Modifier.size(24.dp).wrapContentSize(unbounded = true),
                            contentAlignment = Alignment.Center,
                        ) { profileIcon(on) }
                        else BouncyIcon(if (on) tab.selectedIcon else tab.icon, on)
                    }
                },
                label = { Text(stringResource(tab.label), style = MaterialTheme.typography.labelMedium) },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = MaterialTheme.colorScheme.primary,
                    selectedTextColor = MaterialTheme.colorScheme.primary,
                    indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                    unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                ),
            )
        }
    }
}

/** Pops a little when its tab is chosen. */
@Composable
private fun BouncyIcon(icon: ImageVector, selected: Boolean) {
    val scale = remember { Animatable(1f) }
    LaunchedEffect(selected) {
        if (selected) {
            scale.snapTo(0.75f)
            scale.animateTo(1f, spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMedium))
        }
    }
    Icon(icon, contentDescription = null, modifier = Modifier.scale(scale.value))
}

/** Chats and Friends until Phase 2 fills them. */
@Composable
fun EmptyTab(tab: MainTab, onStart: () -> Unit, showTitle: Boolean = true) {
    val (title, body) = when (tab) {
        MainTab.Chats -> R.string.chats_empty_title to R.string.chats_empty_body
        MainTab.History -> R.string.history_empty_title to R.string.history_empty_body
        else -> R.string.friends_empty_title to R.string.friends_empty_body
    }
    Column(
        (if (showTitle) Modifier.fillMaxSize().statusBarsPadding() else Modifier.fillMaxSize()).padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        if (showTitle) {
            Text(
                stringResource(tab.label),
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.align(Alignment.Start).padding(top = 8.dp),
            )
        }
        Spacer(Modifier.weight(1f))
        Box(
            Modifier.size(132.dp).clip(CircleShape)
                .background(Brush.linearGradient(listOf(BrandTeal.copy(alpha = 0.16f), BrandTeal.copy(alpha = 0.16f)))),
            contentAlignment = Alignment.Center,
        ) {
            Box(
                Modifier.size(84.dp).clip(CircleShape).background(Brush.linearGradient(listOf(BrandTeal, BrandTeal))),
                contentAlignment = Alignment.Center,
            ) { Icon(tab.selectedIcon, null, tint = Color.White, modifier = Modifier.size(40.dp)) }
        }
        Spacer(Modifier.height(28.dp))
        Text(stringResource(title), style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onBackground, textAlign = TextAlign.Center)
        Spacer(Modifier.height(8.dp))
        Text(stringResource(body), style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
        Spacer(Modifier.weight(1f))
        PrimaryButton(stringResource(R.string.start_talking), onClick = onStart)
        Spacer(Modifier.height(8.dp))
    }
}
