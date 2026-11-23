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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.rounded.SportsEsports
import androidx.compose.material.icons.automirrored.rounded.Chat
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.foundation.interaction.collectIsPressedAsState
import app.talklive.social.IncomingCall
import app.talklive.social.OutgoingCall
import app.talklive.ui.animals.AnimalAvatar
import app.talklive.ui.theme.BrandTeal
import app.talklive.ui.theme.Danger
import app.talklive.ui.theme.Success

@Composable
fun IncomingCallScreen(call: IncomingCall, animal: String?, onAccept: () -> Unit, onDecline: () -> Unit, onQuickReply: ((String) -> Unit)? = null) {
    // Ring only until it is answered; then show it is connecting.
    if (!call.answering) Ringer()
    CallCard(
        animal = animal,
        name = call.username,
        status = if (call.answering) stringResource(R.string.connecting_short) + "…"
            else listOfNotNull(flag(call.countryCode), stringResource(R.string.wants_to_talk)).joinToString(" "),
        quickReplies = if (call.answering || onQuickReply == null) null else listOf(
            stringResource(R.string.call_reply_busy), stringResource(R.string.call_reply_later), stringResource(R.string.call_reply_text),
        ),
        onQuickReply = { text -> onQuickReply?.invoke(text); onDecline() },
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
 * A friend call that is live: a slowly moving backdrop in their colour, their face inside the
 * live spectrum of their voice, the time talked and the line quality, and big springy controls:
 * mute, speaker, hang up, plus a message or a game without leaving the call.
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
    bands: () -> FloatArray = { FloatArray(0) },
    onMessage: (() -> Unit)? = null,
    onGame: (() -> Unit)? = null,
) {
    var now by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf(System.currentTimeMillis()) }
    androidx.compose.runtime.LaunchedEffect(sinceMs) {
        while (true) { now = System.currentTimeMillis(); kotlinx.coroutines.delay(1000) }
    }
    val status = if (!connected || sinceMs == null) stringResource(R.string.connecting_short) + "…" else {
        val secs = ((now - sinceMs) / 1000).coerceAtLeast(0)
        if (secs >= 3600) "%d:%02d:%02d".format(secs / 3600, (secs % 3600) / 60, secs % 60) else "%02d:%02d".format(secs / 60, secs % 60)
    }
    val tint = app.talklive.ui.animals.animalById(animal)?.color ?: BrandTeal
    Box(Modifier.fillMaxSize().clickable(enabled = false) {}) {
        CallBackdrop(tint, level = remoteLevel)
        Column(
            Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().padding(horizontal = 28.dp, vertical = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Row(
                Modifier.clip(CircleShape).background(Color.White.copy(alpha = 0.12f)).padding(horizontal = 12.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Rounded.Lock, null, tint = Color.White, modifier = Modifier.size(13.dp))
                Spacer(Modifier.width(6.dp))
                Text(stringResource(R.string.private_call), style = MaterialTheme.typography.labelMedium, color = Color.White)
                Spacer(Modifier.width(8.dp))
                LinePulse(connected)
            }
            Spacer(Modifier.weight(1f))
            app.talklive.ui.call.SpectrumRing(bands = bands, active = connected, size = 300.dp, inner = 156.dp) {
                AnimalAvatar(animal, name, 150.dp)
            }
            Spacer(Modifier.height(22.dp))
            Text(name, style = MaterialTheme.typography.headlineMedium, color = Color.White, maxLines = 1)
            Spacer(Modifier.height(6.dp))
            androidx.compose.animation.AnimatedContent(status, label = "status") { st ->
                Text(st, style = MaterialTheme.typography.titleMedium, color = if (connected) Color(0xFF8CF5B8) else Color.White.copy(alpha = 0.75f))
            }
            androidx.compose.animation.AnimatedVisibility(partnerMuted) {
                Row(Modifier.padding(top = 10.dp).clip(CircleShape).background(Color.Black.copy(alpha = 0.25f)).padding(horizontal = 12.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.MicOff, null, tint = Color.White, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(stringResource(R.string.partner_muted), style = MaterialTheme.typography.labelLarge, color = Color.White)
                }
            }
            Spacer(Modifier.weight(1.2f))
            if (onMessage != null || onGame != null) {
                Row(Modifier.fillMaxWidth().padding(bottom = 22.dp), horizontalArrangement = Arrangement.Center) {
                    onMessage?.let { GlassChip(Icons.AutoMirrored.Rounded.Chat, stringResource(R.string.message), it) }
                    if (onMessage != null && onGame != null) Spacer(Modifier.width(12.dp))
                    onGame?.let { GlassChip(Icons.Rounded.SportsEsports, stringResource(R.string.play_game), it) }
                }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly, verticalAlignment = Alignment.Bottom) {
                ToggleAction(if (muted) Icons.Rounded.MicOff else Icons.Rounded.Mic, stringResource(if (muted) R.string.unmute else R.string.mute), muted, onMute)
                RoundAction(Icons.Rounded.CallEnd, stringResource(R.string.hang_up), Danger, onEnd)
                ToggleAction(Icons.AutoMirrored.Rounded.VolumeUp, stringResource(R.string.speaker), speakerOn, onSpeaker)
            }
        }
    }
}

/** Three little bars that fill as the line comes up, like a signal meter. */
@Composable
private fun LinePulse(connected: Boolean) {
    val t = rememberInfiniteTransition(label = "line")
    val p by t.animateFloat(0f, 1f, infiniteRepeatable(tween(900, easing = LinearEasing)), label = "p")
    Row(verticalAlignment = Alignment.Bottom) {
        repeat(3) { i ->
            val on = if (connected) true else ((p * 3).toInt() >= i)
            Box(Modifier.padding(horizontal = 1.dp).width(3.dp).height((5 + i * 3).dp).clip(RoundedCornerShape(1.dp))
                .background(if (on) (if (connected) Color(0xFF8CF5B8) else Color.White) else Color.White.copy(alpha = 0.3f)))
        }
    }
}

/**
 * The call's backdrop: the friend's colour, deepened, with two soft lights that drift and
 * swell with their voice. Everything is read in the draw pass, so a frame recomposes nothing.
 */
@Composable
private fun CallBackdrop(tint: Color, level: () -> Float = { 0f }) {
    val t = rememberInfiniteTransition(label = "bg")
    val a by t.animateFloat(0f, 1f, infiniteRepeatable(tween(9000, easing = LinearEasing), RepeatMode.Reverse), label = "a")
    val b by t.animateFloat(0f, 1f, infiniteRepeatable(tween(13000, easing = LinearEasing), RepeatMode.Reverse), label = "b")
    val deep = androidx.compose.ui.graphics.lerp(tint, Color(0xFF070A14), 0.72f)
    val mid = androidx.compose.ui.graphics.lerp(tint, Color(0xFF070A14), 0.35f)
    Box(
        Modifier.fillMaxSize().drawBehind {
            drawRect(androidx.compose.ui.graphics.Brush.verticalGradient(listOf(mid, deep, Color(0xFF05070E))))
            val lv = level().coerceIn(0f, 1f)
            val r1 = size.minDimension * (0.55f + 0.12f * lv)
            val c1 = androidx.compose.ui.geometry.Offset(size.width * (0.2f + 0.6f * a), size.height * (0.28f + 0.1f * b))
            drawCircle(androidx.compose.ui.graphics.Brush.radialGradient(listOf(tint.copy(alpha = 0.45f), Color.Transparent), c1, r1), r1, c1)
            val r2 = size.minDimension * 0.5f
            val c2 = androidx.compose.ui.geometry.Offset(size.width * (0.85f - 0.5f * b), size.height * (0.72f - 0.12f * a))
            drawCircle(androidx.compose.ui.graphics.Brush.radialGradient(listOf(Color(0xFF7C5CFF).copy(alpha = 0.28f), Color.Transparent), c2, r2), r2, c2)
        },
    )
}

/** A see-through pill button that springs when pressed. */
@Composable
private fun GlassChip(icon: ImageVector, label: String, onClick: () -> Unit) {
    val src = androidx.compose.runtime.remember { androidx.compose.foundation.interaction.MutableInteractionSource() }
    val pressed by src.collectIsPressedAsState()
    val sc by androidx.compose.animation.core.animateFloatAsState(if (pressed) 0.92f else 1f, androidx.compose.animation.core.spring(dampingRatio = 0.5f, stiffness = 700f), label = "chip")
    Row(
        Modifier.graphicsLayer { scaleX = sc; scaleY = sc }.clip(CircleShape).background(Color.White.copy(alpha = 0.14f))
            .clickable(interactionSource = src, indication = androidx.compose.material3.ripple(), onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, null, tint = Color.White, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(8.dp))
        Text(label, style = MaterialTheme.typography.labelLarge, color = Color.White)
    }
}

@Composable
private fun ToggleAction(icon: ImageVector, label: String, on: Boolean, onClick: () -> Unit) {
    val src = androidx.compose.runtime.remember { androidx.compose.foundation.interaction.MutableInteractionSource() }
    val pressed by src.collectIsPressedAsState()
    val sc by androidx.compose.animation.core.animateFloatAsState(if (pressed) 0.88f else 1f, androidx.compose.animation.core.spring(dampingRatio = 0.45f, stiffness = 700f), label = "t")
    val bg by androidx.compose.animation.animateColorAsState(if (on) Color.White else Color.White.copy(alpha = 0.16f), label = "bg")
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            Modifier.size(66.dp).graphicsLayer { scaleX = sc; scaleY = sc }.clip(CircleShape).background(bg)
                .clickable(interactionSource = src, indication = androidx.compose.material3.ripple(), onClick = onClick),
            contentAlignment = Alignment.Center,
        ) { Icon(icon, label, tint = if (on) Color(0xFF0B0F1A) else Color.White, modifier = Modifier.size(28.dp)) }
        Spacer(Modifier.height(8.dp))
        Text(label, style = MaterialTheme.typography.labelLarge, color = Color.White)
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

/** Calling or being called: their colour moving behind them, rings pulsing out, a gentle bob. */
@Composable
private fun CallCard(
    animal: String?, name: String, status: String,
    quickReplies: List<String>? = null, onQuickReply: (String) -> Unit = {},
    actions: @Composable () -> Unit,
) {
    val tint = app.talklive.ui.animals.animalById(animal)?.color ?: BrandTeal
    val t = rememberInfiniteTransition(label = "ring")
    val rings = (0 until 3).map { i ->
        t.animateFloat(0f, 1f, infiniteRepeatable(tween(2100, easing = LinearEasing), RepeatMode.Restart, StartOffset(i * 700)), label = "r$i")
    }
    val bob by t.animateFloat(-5f, 5f, infiniteRepeatable(tween(1600), RepeatMode.Reverse), label = "bob")
    val dots by t.animateFloat(0f, 3.99f, infiniteRepeatable(tween(1500, easing = LinearEasing)), label = "dots")
    Box(Modifier.fillMaxSize().clickable(enabled = false) {}) {
        CallBackdrop(tint)
        Column(
            Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().padding(28.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Row(Modifier.clip(CircleShape).background(Color.White.copy(alpha = 0.12f)).padding(horizontal = 12.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.Lock, null, tint = Color.White, modifier = Modifier.size(13.dp))
                Spacer(Modifier.width(6.dp))
                Text(stringResource(R.string.private_call), style = MaterialTheme.typography.labelMedium, color = Color.White)
            }
            Spacer(Modifier.weight(1f))
            Box(
                Modifier.size(280.dp).graphicsLayer { translationY = bob.dp.toPx() }.drawBehind {
                    val base = 78.dp.toPx()
                    rings.forEach { r ->
                        val v = r.value
                        drawCircle(tint.copy(alpha = (1f - v) * 0.22f), radius = base + (size.minDimension / 2 - base) * v)
                        drawCircle(Color.White.copy(alpha = (1f - v) * 0.5f), radius = base + (size.minDimension / 2 - base) * v, style = Stroke(1.5.dp.toPx()))
                    }
                },
                contentAlignment = Alignment.Center,
            ) { AnimalAvatar(animal, name, 150.dp) }
            Spacer(Modifier.height(22.dp))
            Text(name, style = MaterialTheme.typography.headlineMedium, color = Color.White, maxLines = 1)
            Spacer(Modifier.height(6.dp))
            Text(status.trimEnd('…', '.') + ".".repeat(dots.toInt()), style = MaterialTheme.typography.bodyLarge, color = Color.White.copy(alpha = 0.8f))
            Spacer(Modifier.weight(1.2f))
            quickReplies?.let { list ->
                androidx.compose.foundation.lazy.LazyRow(
                    Modifier.fillMaxWidth().padding(bottom = 18.dp), horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
                ) {
                    items(list.size) { i -> GlassChip(Icons.AutoMirrored.Rounded.Chat, list[i]) { onQuickReply(list[i]) } }
                }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) { actions() }
        }
    }
}

@Composable
private fun RoundAction(icon: ImageVector, label: String, color: Color, onClick: () -> Unit) {
    val src = androidx.compose.runtime.remember { androidx.compose.foundation.interaction.MutableInteractionSource() }
    val pressed by src.collectIsPressedAsState()
    val sc by androidx.compose.animation.core.animateFloatAsState(if (pressed) 0.88f else 1f, androidx.compose.animation.core.spring(dampingRatio = 0.45f, stiffness = 700f), label = "r")
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            Modifier.size(76.dp).graphicsLayer { scaleX = sc; scaleY = sc }.clip(CircleShape).background(color)
                .clickable(interactionSource = src, indication = androidx.compose.material3.ripple(color = Color.White), onClick = onClick),
            contentAlignment = Alignment.Center,
        ) { Icon(icon, label, tint = Color.White, modifier = Modifier.size(34.dp)) }
        Spacer(Modifier.height(8.dp))
        Text(label, style = MaterialTheme.typography.labelLarge, color = Color.White)
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
