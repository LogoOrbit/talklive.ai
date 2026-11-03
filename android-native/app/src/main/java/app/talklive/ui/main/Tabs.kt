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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Chat
import androidx.compose.material.icons.automirrored.rounded.Chat
import androidx.compose.material.icons.outlined.GraphicEq
import androidx.compose.material.icons.outlined.People
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.rounded.GraphicEq
import androidx.compose.material.icons.rounded.People
import androidx.compose.material.icons.rounded.Person
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
import app.talklive.ui.theme.BrandViolet

enum class MainTab(val label: Int, val icon: ImageVector, val selectedIcon: ImageVector) {
    Talk(R.string.tab_talk, Icons.Outlined.GraphicEq, Icons.Rounded.GraphicEq),
    Chats(R.string.tab_chats, Icons.AutoMirrored.Outlined.Chat, Icons.AutoMirrored.Rounded.Chat),
    Friends(R.string.tab_friends, Icons.Outlined.People, Icons.Rounded.People),
    Profile(R.string.tab_profile, Icons.Outlined.Person, Icons.Rounded.Person),
}

@Composable
fun TabBar(selected: MainTab, onSelect: (MainTab) -> Unit) {
    val haptics = LocalHapticFeedback.current
    NavigationBar(containerColor = MaterialTheme.colorScheme.surface, tonalElevation = 0.dp) {
        MainTab.entries.forEach { tab ->
            val on = tab == selected
            NavigationBarItem(
                selected = on,
                onClick = {
                    if (!on) haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                    onSelect(tab)
                },
                icon = { BouncyIcon(if (on) tab.selectedIcon else tab.icon, on) },
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
fun EmptyTab(tab: MainTab, onStart: () -> Unit) {
    val (title, body) = when (tab) {
        MainTab.Chats -> R.string.chats_empty_title to R.string.chats_empty_body
        else -> R.string.friends_empty_title to R.string.friends_empty_body
    }
    Column(
        Modifier.fillMaxSize().statusBarsPadding().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            stringResource(tab.label),
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.onBackground,
            modifier = Modifier.align(Alignment.Start).padding(top = 8.dp),
        )
        Spacer(Modifier.weight(1f))
        Box(
            Modifier.size(132.dp).clip(CircleShape)
                .background(Brush.linearGradient(listOf(BrandViolet.copy(alpha = 0.16f), BrandTeal.copy(alpha = 0.16f)))),
            contentAlignment = Alignment.Center,
        ) {
            Box(
                Modifier.size(84.dp).clip(CircleShape).background(Brush.linearGradient(listOf(BrandViolet, BrandTeal))),
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
