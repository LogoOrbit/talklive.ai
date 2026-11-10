package app.talklive.ui

import app.talklive.ui.components.tapOnce
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import app.talklive.ui.animals.AnimalAvatar
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material.icons.rounded.Close
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.automirrored.rounded.Chat
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.DarkMode
import androidx.compose.material.icons.rounded.LightMode
import androidx.compose.material.icons.rounded.Mic
import androidx.compose.material.icons.rounded.Tune
import androidx.compose.material3.IconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import app.talklive.R
import app.talklive.ui.components.BrandGradient
import app.talklive.ui.components.PrimaryButton
import app.talklive.ui.theme.BrandTeal
import app.talklive.ui.theme.BrandViolet
import app.talklive.ui.theme.Success
import java.text.NumberFormat
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.foundation.border
import androidx.compose.ui.unit.sp

@Composable
fun HomeScreen(
    connected: Boolean,
    visitors: Int?,
    animal: String?,
    name: String?,
    dark: Boolean,
    onStart: () -> Unit,
    onToggleTheme: () -> Unit,
    onProfile: () -> Unit,
    mode: app.talklive.call.CallMode = app.talklive.call.CallMode.Talk,
    onMode: (app.talklive.call.CallMode) -> Unit = {},
    engage: app.talklive.engage.Engage? = null,
    filtersActive: Int = 0,
    onStreak: () -> Unit = {},
    onFilters: () -> Unit = {},
    premium: Boolean = true,
    onPlus: () -> Unit = {},
    online: List<app.talklive.net.OnlinePerson> = emptyList(),
    onFindIn: (String) -> Unit = {},
    autoConnect: Boolean = true,
    onAutoConnect: (Boolean) -> Unit = {},
    ring: Boolean = false,
    // A small, dismissible card after a good call: the per-day price to show, or null for none.
    plusCard: String? = null,
    onPlusCard: () -> Unit = {},
    onPlusCardClose: () -> Unit = {},
) {
    Column(Modifier.fillMaxSize().statusBarsPadding().padding(horizontal = 24.dp, vertical = 16.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Image(painterResource(R.drawable.logo), null, Modifier.size(32.dp))
            Spacer(Modifier.size(10.dp))
            Text("TalkLive", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onBackground)
            Spacer(Modifier.weight(1f))
            if (!premium) {
                Row(
                    Modifier.clip(CircleShape).background(app.talklive.ui.components.BrandGradient).tapOnce(windowMs = 700, onClick = onPlus).padding(horizontal = 10.dp, vertical = 5.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    app.talklive.ui.components.PlusGem(14.dp)
                    Spacer(Modifier.width(5.dp))
                    Text("Plus", color = androidx.compose.ui.graphics.Color.White, style = MaterialTheme.typography.labelMedium, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
                }
                Spacer(Modifier.width(6.dp))
            }
            app.talklive.ui.engage.StreakChip(engage, onStreak)
            IconButton(onClick = onToggleTheme) {
                Icon(
                    if (dark) Icons.Rounded.LightMode else Icons.Rounded.DarkMode,
                    contentDescription = stringResource(if (dark) R.string.light_mode else R.string.dark_mode),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            app.talklive.ui.components.PlusRing(premium || ring, 36.dp, alive = premium) {
                AnimalAvatar(animal, name, 36.dp, Modifier.clip(CircleShape).clickable(onClick = onProfile))
            }
        }

        // The orb takes whatever height is left and shrinks to fit it, so on a
        // short phone the buttons below never get squeezed.
        // The orb starts a conversation too: the biggest thing on screen should do something.
        androidx.compose.foundation.layout.BoxWithConstraints(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
            val fit = (maxHeight / 230.dp).coerceIn(0.45f, 1f)
            // Never disabled: a tap while reconnecting starts as soon as the line is back.
            Box(Modifier.clip(CircleShape).tapOnce(windowMs = 700, onClick = onStart)) {
                MicOrb(mode == app.talklive.call.CallMode.Chat, fit)
            }
        }
        Spacer(Modifier.height(12.dp))
        Text(
            stringResource(R.string.tagline),
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.onBackground,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(16.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
            Surface(shape = CircleShape, color = MaterialTheme.colorScheme.surface) {
                Row(Modifier.padding(horizontal = 14.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    // "Connecting…" only if it is really taking a while; a quick reconnect is invisible.
                    var slow by remember { mutableStateOf(false) }
                    LaunchedEffect(connected) { slow = false; if (!connected) { kotlinx.coroutines.delay(3000); slow = true } }
                    Box(Modifier.size(8.dp).clip(CircleShape).background(if (connected) Success else MaterialTheme.colorScheme.outline))
                    Spacer(Modifier.size(8.dp))
                    Text(
                        when {
                            visitors != null && !slow -> pluralStringResource(R.plurals.visitors_today, visitors, NumberFormat.getIntegerInstance().format(visitors))
                            else -> stringResource(R.string.connecting_server)
                        },
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
        Spacer(Modifier.height(18.dp))
        val placed = online.filter { it.countryCode != null }
        if (placed.size >= 3) OnlineNow(placed, enabled = connected, onFindIn = onFindIn)
        else HowItWorks(mode == app.talklive.call.CallMode.Chat)
        if (plusCard != null && !premium) {
            Spacer(Modifier.height(14.dp))
            Surface(shape = androidx.compose.foundation.shape.RoundedCornerShape(16.dp), color = MaterialTheme.colorScheme.surface, modifier = Modifier.fillMaxWidth()) {
                Row(Modifier.padding(start = 16.dp, top = 4.dp, bottom = 4.dp, end = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(stringResource(R.string.home_plus_card, plusCard), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
                    androidx.compose.material3.TextButton(onClick = onPlusCard) { Text(stringResource(R.string.nudge_see_plus)) }
                    IconButton(onClick = onPlusCardClose) {
                        Icon(androidx.compose.material.icons.Icons.Rounded.Close, stringResource(R.string.home_plus_card_close), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
        Spacer(Modifier.height(22.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.weight(1f)) { ModeSwitch(mode, onMode) }
            Spacer(Modifier.width(10.dp))
            Surface(onClick = onFilters, shape = CircleShape, color = if (filtersActive > 0) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface, modifier = Modifier.size(48.dp)) {
                Box(contentAlignment = Alignment.Center) {
                    androidx.compose.material3.BadgedBox(badge = {
                        if (filtersActive > 0) androidx.compose.material3.Badge(containerColor = MaterialTheme.colorScheme.primary) { Text(filtersActive.toString()) }
                    }) { Icon(androidx.compose.material.icons.Icons.Rounded.Tune, androidx.compose.ui.res.stringResource(R.string.filters), tint = MaterialTheme.colorScheme.primary) }
                }
            }
        }
        // Auto-connect is set here, before a call, so the call screen stays clean.
        Box(Modifier.fillMaxWidth().padding(top = 12.dp), contentAlignment = Alignment.Center) {
            app.talklive.ui.call.AutoConnectToggle(autoConnect, onAutoConnect)
        }
        Spacer(Modifier.height(12.dp))
        PrimaryButton(
            text = stringResource(if (mode == app.talklive.call.CallMode.Chat) R.string.start_chatting else R.string.start_talking),
            onClick = onStart,
            icon = if (mode == app.talklive.call.CallMode.Chat) Icons.AutoMirrored.Rounded.Chat else Icons.Rounded.Mic,
        )
    }
}

/** A few people online right now; tapping one looks for someone in their country. */
@Composable
private fun OnlineNow(people: List<app.talklive.net.OnlinePerson>, enabled: Boolean, onFindIn: (String) -> Unit) {
    Column(Modifier.fillMaxWidth()) {
        Text(
            stringResource(R.string.online_now),
            style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(start = 4.dp, bottom = 8.dp),
        )
        androidx.compose.foundation.lazy.LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp), contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 4.dp)) {
            items(people.take(8).size) { i ->
                val p = people[i]
                Column(
                    Modifier.width(60.dp).clip(androidx.compose.foundation.shape.RoundedCornerShape(12.dp))
                        .clickable(enabled = enabled) { p.countryCode?.let(onFindIn) },
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Box {
                        AnimalAvatar(p.animal, p.name, 48.dp)
                        Box(Modifier.align(Alignment.BottomEnd).size(12.dp).clip(CircleShape).background(MaterialTheme.colorScheme.background).padding(2.dp).clip(CircleShape).background(Success))
                    }
                    Spacer(Modifier.height(4.dp))
                    Text(
                        listOfNotNull(app.talklive.ui.social.flag(p.countryCode), p.name.substringBefore(' ')).joinToString(" "),
                        style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onBackground,
                        maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                    )
                }
            }
        }
    }
}

/** Three plain steps, so anyone knows what happens: numbers on a thin line, nothing that looks tappable. */
@Composable
private fun HowItWorks(text: Boolean) {
    val steps = listOf(
        stringResource(R.string.how_1),
        stringResource(if (text) R.string.how_2_text else R.string.how_2),
        stringResource(R.string.how_3),
    )
    val accents = app.talklive.ui.theme.LocalAccents.current
    val line = MaterialTheme.colorScheme.outline
    Row(Modifier.fillMaxWidth().padding(horizontal = 4.dp), verticalAlignment = Alignment.Top) {
        steps.forEachIndexed { i, label ->
            Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                Box(Modifier.fillMaxWidth().height(24.dp), contentAlignment = Alignment.Center) {
                    // The connector runs behind the numbers.
                    Row(Modifier.fillMaxWidth()) {
                        Box(Modifier.weight(1f).height(1.dp).align(Alignment.CenterVertically).background(if (i == 0) androidx.compose.ui.graphics.Color.Transparent else line))
                        Box(Modifier.weight(1f).height(1.dp).align(Alignment.CenterVertically).background(if (i == steps.lastIndex) androidx.compose.ui.graphics.Color.Transparent else line))
                    }
                    Box(
                        Modifier.size(24.dp).clip(CircleShape).background(MaterialTheme.colorScheme.background)
                            .border(1.5.dp, androidx.compose.ui.graphics.Brush.linearGradient(listOf(accents.a, accents.b)), CircleShape),
                        contentAlignment = Alignment.Center,
                    ) { Text("${i + 1}", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onBackground) }
                }
                Spacer(Modifier.height(6.dp))
                Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center, maxLines = 2)
            }
        }
    }
}

/** The breathing mic: soft halo rings behind a gradient disc. */
@Composable
private fun MicOrb(text: Boolean = false, fit: Float = 1f) {
    val t = rememberInfiniteTransition(label = "orb")
    val halo by t.animateFloat(0.9f, 1.15f, infiniteRepeatable(tween(1600), RepeatMode.Reverse), label = "halo")
    Box(contentAlignment = Alignment.Center) {
        Box(
            Modifier.size(220.dp * fit).scale(halo).clip(CircleShape)
                .background(Brush.radialGradient(listOf(BrandTeal.copy(alpha = 0.18f), BrandTeal.copy(alpha = 0.0f)))),
        )
        Box(Modifier.size(160.dp * fit).clip(CircleShape).background(BrandViolet.copy(alpha = 0.10f)))
        Box(
            Modifier.size(112.dp * fit).clip(CircleShape).background(BrandGradient),
            contentAlignment = Alignment.Center,
        ) {
            androidx.compose.animation.Crossfade(text, label = "orb-icon") { t ->
                Icon(if (t) Icons.AutoMirrored.Rounded.Chat else Icons.Rounded.Mic, null, tint = Color.White, modifier = Modifier.size(52.dp * fit))
            }
        }
    }
}

/** Voice or Text, with a pill that slides between them. */
@Composable
private fun ModeSwitch(mode: app.talklive.call.CallMode, onMode: (app.talklive.call.CallMode) -> Unit) {
    val haptics = androidx.compose.ui.platform.LocalHapticFeedback.current
    val modes = app.talklive.call.CallMode.entries
    androidx.compose.foundation.layout.BoxWithConstraints(
        Modifier.fillMaxWidth().height(48.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surface).padding(4.dp),
    ) {
        val w = maxWidth / modes.size
        val x by androidx.compose.animation.core.animateDpAsState(
            w * modes.indexOf(mode), androidx.compose.animation.core.spring(dampingRatio = 0.75f, stiffness = 500f), label = "pill",
        )
        Box(Modifier.offset(x = x).width(w).fillMaxHeight().clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer))
        Row(Modifier.fillMaxSize()) {
            modes.forEach { m ->
                val on = m == mode
                Row(
                    Modifier.weight(1f).fillMaxHeight().clip(CircleShape).clickable {
                        if (!on) haptics.performHapticFeedback(androidx.compose.ui.hapticfeedback.HapticFeedbackType.TextHandleMove)
                        app.talklive.sound.Tap.soft(); onMode(m)
                    },
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        if (m == app.talklive.call.CallMode.Chat) Icons.AutoMirrored.Rounded.Chat else Icons.Rounded.Mic, null,
                        Modifier.size(18.dp),
                        tint = if (on) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(Modifier.size(8.dp))
                    Text(
                        stringResource(if (m == app.talklive.call.CallMode.Chat) R.string.mode_text else R.string.mode_voice),
                        style = MaterialTheme.typography.labelLarge,
                        color = if (on) app.talklive.ui.theme.AccentText else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}
