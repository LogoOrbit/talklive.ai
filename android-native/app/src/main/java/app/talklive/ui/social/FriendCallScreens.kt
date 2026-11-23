package app.talklive.ui.social

import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.StartOffset
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Call
import androidx.compose.material.icons.rounded.CallEnd
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.Mic
import androidx.compose.material.icons.rounded.MicOff
import androidx.compose.material.icons.automirrored.rounded.VolumeUp
import androidx.compose.foundation.gestures.draggable
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import kotlinx.coroutines.launch
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.talklive.R
import app.talklive.social.IncomingCall
import app.talklive.social.OutgoingCall
import app.talklive.ui.animals.AnimalAvatar
import app.talklive.ui.theme.BrandTeal
import app.talklive.ui.theme.Danger
import app.talklive.ui.theme.Success

@Composable
fun IncomingCallScreen(call: IncomingCall, animal: String?, onAccept: () -> Unit, onDecline: () -> Unit) {
    // Ring only until it is answered; then show it is connecting.
    if (!call.answering) Ringer()
    CallCard(
        animal = animal,
        name = call.username,
        status = if (call.answering) stringResource(R.string.connecting_short) + "…"
            else listOfNotNull(flag(call.countryCode), stringResource(R.string.wants_to_talk)).joinToString(" "),
    ) {
        if (call.answering) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                androidx.compose.material3.CircularProgressIndicator(color = Success, strokeWidth = 3.dp, modifier = Modifier.size(44.dp))
                Spacer(Modifier.height(16.dp))
                RoundAction(Icons.Rounded.CallEnd, stringResource(R.string.cancel), Danger, onDecline)
            }
        } else SlideToAnswer(onAccept = onAccept, onDecline = onDecline)
    }
}

/**
 * Slide to answer, like a phone's own call screen: drag the middle button right
 * to answer or left to decline. Tapping either end works too.
 */
@Composable
private fun SlideToAnswer(onAccept: () -> Unit, onDecline: () -> Unit) {
    val haptics = androidx.compose.ui.platform.LocalHapticFeedback.current
    val scope = androidx.compose.runtime.rememberCoroutineScope()
    val drag = androidx.compose.runtime.remember { androidx.compose.animation.core.Animatable(0f) }
    var done by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf(false) }
    val hint = rememberInfiniteTransition(label = "hint")
    val nudge by hint.animateFloat(
        0f, 1f, infiniteRepeatable(tween(1400, easing = LinearEasing), RepeatMode.Restart), label = "nudge",
    )
    androidx.compose.foundation.layout.BoxWithConstraints(
        Modifier.fillMaxWidth().height(84.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)),
        contentAlignment = Alignment.Center,
    ) {
        val thumb = 72.dp
        val density = androidx.compose.ui.platform.LocalDensity.current
        val max = with(density) { ((maxWidth - thumb) / 2 - 6.dp).toPx() }.coerceAtLeast(1f)
        val progress = (drag.value / max).coerceIn(-1f, 1f)
        fun finish(accept: Boolean) {
            if (done) return
            done = true
            haptics.performHapticFeedback(androidx.compose.ui.hapticfeedback.HapticFeedbackType.LongPress)
            scope.launch {
                drag.animateTo(if (accept) max else -max, tween(140))
                if (accept) onAccept() else onDecline()
            }
        }
        // The two ends: decline on the left, answer on the right. They light up as the button nears.
        Row(Modifier.fillMaxWidth().padding(horizontal = 6.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier.size(thumb).clip(CircleShape).background(Danger.copy(alpha = 0.18f + 0.6f * (-progress).coerceAtLeast(0f)))
                    .clickable { finish(false) },
                contentAlignment = Alignment.Center,
            ) { Icon(Icons.Rounded.CallEnd, stringResource(R.string.decline), tint = Color.White, modifier = Modifier.size(30.dp)) }
            Spacer(Modifier.weight(1f))
            Box(
                Modifier.size(thumb).clip(CircleShape).background(Success.copy(alpha = 0.18f + 0.6f * progress.coerceAtLeast(0f)))
                    .clickable { finish(true) },
                contentAlignment = Alignment.Center,
            ) { Icon(Icons.Rounded.Call, stringResource(R.string.accept), tint = Color.White, modifier = Modifier.size(30.dp)) }
        }
        // Little arrows pointing both ways, fading in turn, so it is clear the button slides.
        if (!done && drag.value == 0f) Row(verticalAlignment = Alignment.CenterVertically) {
            Text("‹ ‹", color = Danger.copy(alpha = 1f - nudge), style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.width(thumb + 16.dp))
            Text("› ›", color = Success.copy(alpha = nudge), style = MaterialTheme.typography.titleMedium)
        }
        val thumbColor = when {
            progress > 0.05f -> Success
            progress < -0.05f -> Danger
            else -> Color.White
        }
        Box(
            Modifier
                .offset { androidx.compose.ui.unit.IntOffset(drag.value.toInt(), 0) }
                .size(thumb).clip(CircleShape).background(thumbColor)
                .draggable(
                    orientation = androidx.compose.foundation.gestures.Orientation.Horizontal,
                    enabled = !done,
                    state = androidx.compose.foundation.gestures.rememberDraggableState { d ->
                        scope.launch { drag.snapTo((drag.value + d).coerceIn(-max, max)) }
                    },
                    onDragStopped = {
                        when {
                            drag.value > max * 0.7f -> finish(true)
                            drag.value < -max * 0.7f -> finish(false)
                            else -> drag.animateTo(0f, androidx.compose.animation.core.spring(dampingRatio = 0.6f))
                        }
                    },
                ),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                if (progress < -0.05f) Icons.Rounded.CallEnd else Icons.Rounded.Call, null,
                tint = if (thumbColor == Color.White) Success else Color.White, modifier = Modifier.size(32.dp),
            )
        }
    }
}

/**
 * A friend call that is live: their face, their name, the time talked, and
 * mute / speaker / hang up. Private and simple, nothing of the stranger screen.
 */
@Composable
fun FriendCallActiveScreen(
    name: String,
    animal: String?,
    connected: Boolean,
    sinceMs: Long?,
    muted: Boolean,
    speakerOn: Boolean,
    partnerMuted: Boolean,
    remoteLevel: () -> Float,
    onMute: () -> Unit,
    onSpeaker: () -> Unit,
    onEnd: () -> Unit,
) {
    var now by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf(System.currentTimeMillis()) }
    androidx.compose.runtime.LaunchedEffect(sinceMs) {
        while (true) { now = System.currentTimeMillis(); kotlinx.coroutines.delay(1000) }
    }
    val status = if (!connected || sinceMs == null) stringResource(R.string.connecting_short) + "…" else {
        val secs = ((now - sinceMs) / 1000).coerceAtLeast(0)
        if (secs >= 3600) "%d:%02d:%02d".format(secs / 3600, (secs % 3600) / 60, secs % 60) else "%02d:%02d".format(secs / 60, secs % 60)
    }
    val level = remoteLevel().coerceIn(0f, 1f)
    val t = rememberInfiniteTransition(label = "live")
    val breathe by t.animateFloat(0f, 1f, infiniteRepeatable(tween(1800, easing = LinearEasing), RepeatMode.Reverse), label = "b")
    Column(
        Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).clickable(enabled = false) {}
            .statusBarsPadding().navigationBarsPadding().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Rounded.Lock, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(14.dp))
            Spacer(Modifier.width(6.dp))
            Text(stringResource(R.string.private_call), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Spacer(Modifier.weight(1f))
        Box(
            Modifier.size(240.dp).drawBehind {
                val base = 76.dp.toPx()
                val grow = if (connected) level * 0.6f + breathe * 0.08f else breathe * 0.25f
                drawCircle(Success.copy(alpha = 0.10f + 0.15f * level), radius = base * (1.15f + grow))
                drawCircle(Success.copy(alpha = 0.25f), radius = base * (1.05f + grow * 0.5f), style = Stroke(2.dp.toPx()))
            },
            contentAlignment = Alignment.Center,
        ) { AnimalAvatar(animal, name, 144.dp) }
        Spacer(Modifier.height(24.dp))
        Text(name, style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.onBackground)
        Spacer(Modifier.height(6.dp))
        Text(status, style = MaterialTheme.typography.titleMedium, color = if (connected) Success else MaterialTheme.colorScheme.onSurfaceVariant)
        if (partnerMuted) {
            Spacer(Modifier.height(8.dp))
            Text(stringResource(R.string.partner_muted), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Spacer(Modifier.weight(1.4f))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly, verticalAlignment = Alignment.Bottom) {
            ToggleAction(if (muted) Icons.Rounded.MicOff else Icons.Rounded.Mic, stringResource(if (muted) R.string.unmute else R.string.mute), muted, onMute)
            RoundAction(Icons.Rounded.CallEnd, stringResource(R.string.hang_up), Danger, onEnd)
            ToggleAction(Icons.AutoMirrored.Rounded.VolumeUp, stringResource(R.string.speaker), speakerOn, onSpeaker)
        }
    }
}

@Composable
private fun ToggleAction(icon: ImageVector, label: String, on: Boolean, onClick: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            Modifier.size(64.dp).clip(CircleShape)
                .background(if (on) MaterialTheme.colorScheme.onBackground else MaterialTheme.colorScheme.surfaceVariant)
                .clickable(onClick = onClick),
            contentAlignment = Alignment.Center,
        ) { Icon(icon, label, tint = if (on) MaterialTheme.colorScheme.background else MaterialTheme.colorScheme.onSurface, modifier = Modifier.size(28.dp)) }
        Spacer(Modifier.height(8.dp))
        Text(label, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onBackground)
    }
}

@Composable
fun OutgoingCallScreen(call: OutgoingCall, onCancel: () -> Unit) {
    CallCard(
        animal = call.person.animal,
        name = call.person.displayName,
        status = stringResource(
            when (call.status) {
                "ringing" -> R.string.ringing // the app is open on their phone
                "busy" -> R.string.on_another_call
                else -> R.string.calling // a notification on their phone
            },
        ),
    ) { RoundAction(Icons.Rounded.CallEnd, stringResource(R.string.cancel), Danger, onCancel) }
}

@Composable
private fun CallCard(animal: String?, name: String, status: String, actions: @Composable () -> Unit) {
    val t = rememberInfiniteTransition(label = "ring")
    val rings = (0 until 3).map { i ->
        t.animateFloat(0f, 1f, infiniteRepeatable(tween(2000, easing = LinearEasing), RepeatMode.Restart, StartOffset(i * 660)), label = "r$i")
    }
    Column(
        Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).clickable(enabled = false) {}
            .statusBarsPadding().navigationBarsPadding().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.weight(1f))
        Box(
            Modifier.size(260.dp).drawBehind {
                val base = 72.dp.toPx()
                rings.forEach { r ->
                    drawCircle(BrandTeal.copy(alpha = (1f - r.value) * 0.4f), radius = base + (size.minDimension / 2 - base) * r.value, style = Stroke(2.dp.toPx()))
                }
            },
            contentAlignment = Alignment.Center,
        ) { AnimalAvatar(animal, name, 144.dp) }
        Spacer(Modifier.height(24.dp))
        Text(name, style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.onBackground)
        Spacer(Modifier.height(6.dp))
        Text(status, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.weight(1.4f))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) { actions() }
    }
}

@Composable
private fun RoundAction(icon: ImageVector, label: String, color: Color, onClick: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.size(76.dp).clip(CircleShape).background(color).clickable(onClick = onClick), contentAlignment = Alignment.Center) {
            Icon(icon, label, tint = Color.White, modifier = Modifier.size(34.dp))
        }
        Spacer(Modifier.height(8.dp))
        Text(label, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onBackground)
    }
}

/** The phone's ringtone and a vibration pattern while a friend is calling. */
@Composable
private fun Ringer() {
    val context = LocalContext.current
    DisposableEffect(Unit) {
        val ringtone = runCatching {
            RingtoneManager.getRingtone(context, RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE))?.apply {
                audioAttributes = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE).build()
                if (Build.VERSION.SDK_INT >= 28) isLooping = true
                play()
            }
        }.getOrNull()
        val vibrator = if (Build.VERSION.SDK_INT >= 31) {
            context.getSystemService(VibratorManager::class.java)?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Vibrator::class.java)
        }
        runCatching { vibrator?.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 600, 800), 0)) }
        onDispose {
            runCatching { ringtone?.stop() }
            runCatching { vibrator?.cancel() }
        }
    }
}
