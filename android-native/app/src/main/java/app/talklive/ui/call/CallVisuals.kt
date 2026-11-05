package app.talklive.ui.call

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CallEnd
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.SkipNext
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import app.talklive.R
import app.talklive.ui.theme.Danger
import app.talklive.ui.theme.LocalAccents
import app.talklive.ui.theme.LocalReduceMotion
import app.talklive.ui.theme.Success
import kotlinx.coroutines.delay
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/** Phone tilt, -1..1 on each axis, smoothed; zero when there is no sensor or motion is reduced. */
@Composable
fun rememberTilt(paused: Boolean = false): State<Offset> {
    val ctx = LocalContext.current
    val still = LocalReduceMotion.current || paused
    val tilt = remember { mutableStateOf(Offset.Zero) }
    DisposableEffect(still) {
        val sm = ctx.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
        val sensor = sm?.getDefaultSensor(Sensor.TYPE_GRAVITY) ?: sm?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        if (still || sm == null || sensor == null) return@DisposableEffect onDispose {}
        val l = object : SensorEventListener {
            override fun onSensorChanged(e: SensorEvent) {
                val x = (-e.values[0] / 9.81f).coerceIn(-1f, 1f)
                val y = ((e.values[1] - 6.5f) / 9.81f).coerceIn(-1f, 1f)
                val o = tilt.value
                tilt.value = Offset(o.x + (x - o.x) * 0.12f, o.y + (y - o.y) * 0.12f)
            }
            override fun onAccuracyChanged(s: Sensor?, a: Int) {}
        }
        sm.registerListener(l, sensor, SensorManager.SENSOR_DELAY_GAME)
        onDispose { sm.unregisterListener(l) }
    }
    return tilt
}

/**
 * The call background: soft accent glows that drift with the phone's tilt
 * (parallax), and a gentle green wash that blooms when someone connects.
 */
@Composable
fun CallBackdrop(connected: Boolean, tiltOf: () -> Offset, content: @Composable () -> Unit) {
    val accents = LocalAccents.current
    val green by animateFloatAsState(if (connected) 1f else 0f, tween(900, easing = FastOutSlowInEasing), label = "green")
    // One bright pulse the moment a call connects.
    val burst = remember { Animatable(0f) }
    LaunchedEffect(connected) {
        if (connected) { burst.snapTo(0f); burst.animateTo(1f, tween(1100, easing = FastOutSlowInEasing)) } else burst.snapTo(0f)
    }
    val bg = MaterialTheme.colorScheme.background
    Box(
        Modifier.fillMaxSize().background(bg).drawBehind {
            // Read here, in the draw pass: tilt changes many times a second and
            // only the glow needs redrawing, not the whole call screen.
            val tilt = tiltOf()
            val w = size.width; val h = size.height
            // Far layer: moves least.
            drawCircle(
                Brush.radialGradient(listOf(accents.a.copy(alpha = 0.30f * (1 - green * 0.6f)), Color.Transparent), center = Offset(w * 0.15f + tilt.x * 18f, h * 0.18f + tilt.y * 18f), radius = w * 0.9f),
                radius = w * 0.9f, center = Offset(w * 0.15f + tilt.x * 18f, h * 0.18f + tilt.y * 18f),
            )
            // Near layer: moves most.
            drawCircle(
                Brush.radialGradient(listOf(accents.b.copy(alpha = 0.22f * (1 - green * 0.6f)), Color.Transparent), center = Offset(w * 0.9f + tilt.x * 46f, h * 0.62f + tilt.y * 46f), radius = w * 0.8f),
                radius = w * 0.8f, center = Offset(w * 0.9f + tilt.x * 46f, h * 0.62f + tilt.y * 46f),
            )
            // Connected: a quiet green tint from the middle.
            if (green > 0f) drawRect(Brush.radialGradient(listOf(Success.copy(alpha = 0.22f * green), Success.copy(alpha = 0.06f * green), Color.Transparent), center = Offset(w / 2 + tilt.x * 30f, h * 0.36f), radius = h * 0.75f))
            val b = burst.value
            if (b in 0.001f..0.999f) drawCircle(Success.copy(alpha = 0.35f * (1 - b)), radius = h * 0.9f * b, center = Offset(w / 2, h * 0.36f), style = Stroke(width = 6.dp.toPx() * (1 - b) + 1f))
        },
    ) { content() }
}

/**
 * The other person's voice as bars around their avatar: [bands] values 0..1,
 * mirrored so the ring is symmetrical, in the theme's accent (green once connected).
 */
@Composable
fun SpectrumRing(bands: () -> FloatArray, active: Boolean, size: Dp, inner: Dp, content: @Composable () -> Unit) {
    val accents = LocalAccents.current
    val color by animateColorAsState(if (active) Success else accents.a, label = "ring")
    // The angle is read in the draw pass only, so the slow turn redraws the bars
    // without recomposing the avatar inside every frame.
    val spinState = if (LocalReduceMotion.current) null else rememberInfiniteTransition(label = "spin")
        .animateFloat(0f, 360f, infiniteRepeatable(tween(40000, easing = LinearEasing)), label = "deg")
    Box(
        Modifier.size(size).drawBehind {
            val spin = spinState?.value ?: 0f
            val b = bands()
            val n = b.size * 2
            val r0 = inner.toPx() / 2 + 6.dp.toPx()
            val maxLen = (this.size.minDimension / 2 - r0 - 4.dp.toPx()).coerceAtLeast(1f)
            val stroke = (2 * PI * r0 / n * 0.55f).toFloat().coerceIn(2f, 9.dp.toPx())
            rotate(spin) {
                for (i in 0 until n) {
                    val v = b[if (i < b.size) i else n - 1 - i]
                    val len = 3.dp.toPx() + maxLen * v
                    val a = (2 * PI * i / n - PI / 2).toFloat()
                    val start = Offset(center.x + cos(a) * r0, center.y + sin(a) * r0)
                    val end = Offset(center.x + cos(a) * (r0 + len), center.y + sin(a) * (r0 + len))
                    drawLine(
                        Brush.linearGradient(listOf(color.copy(alpha = 0.95f), accents.b.copy(alpha = 0.55f)), start, end),
                        start, end, strokeWidth = stroke, cap = StrokeCap.Round,
                    )
                }
            }
        },
        contentAlignment = Alignment.Center,
    ) { content() }
}

/**
 * Auto-connect, as a proper little switch: an infinity mark, a label and a
 * gliding knob. On, the next person is found when someone leaves.
 */
@Composable
fun AutoConnectToggle(on: Boolean, onChange: (Boolean) -> Unit, modifier: Modifier = Modifier) {
    val accents = LocalAccents.current
    val haptics = LocalHapticFeedback.current
    val knob by animateDpAsState(if (on) 18.dp else 0.dp, spring(dampingRatio = 0.6f, stiffness = 500f), label = "knob")
    val track by animateColorAsState(if (on) accents.a else MaterialTheme.colorScheme.surfaceVariant, label = "track")
    Row(
        modifier.clip(CircleShape).background(MaterialTheme.colorScheme.surface.copy(alpha = 0.85f))
            .clickable { haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove); onChange(!on) }
            .padding(start = 12.dp, end = 8.dp, top = 7.dp, bottom = 7.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text("∞", style = MaterialTheme.typography.titleMedium, color = if (on) accents.b else MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.width(6.dp))
        Text(stringResource(R.string.auto_connect), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurface)
        Spacer(Modifier.width(8.dp))
        Box(Modifier.width(38.dp).height(20.dp).clip(CircleShape).background(if (on) Brush.linearGradient(listOf(accents.a, accents.b)) else Brush.linearGradient(listOf(track, track)))) {
            Box(Modifier.padding(start = 2.dp + knob, top = 2.dp).size(16.dp).clip(CircleShape).background(Color.White))
        }
    }
}

enum class MainMode { Searching, Connecting, Live, Confirm }

/**
 * The one big call button, like the website's: it changes shape, colour and
 * meaning with the call. Searching: a soft spinner (tap to stop). Live: red,
 * tap once and it stretches to "Tap again", so nobody skips by accident.
 * The second tap moves to the next person (auto-connect on) or ends the call.
 */
@Composable
fun MainCallButton(
    phaseLive: Boolean,
    connecting: Boolean,
    autoConnect: Boolean,
    onNext: () -> Unit,
    onEnd: () -> Unit,
) {
    val haptics = LocalHapticFeedback.current
    val accents = LocalAccents.current
    var confirm by remember { mutableStateOf(false) }
    LaunchedEffect(confirm) { if (confirm) { delay(2600); confirm = false } }
    LaunchedEffect(phaseLive) { confirm = false }
    val mode = when {
        !phaseLive && !connecting -> MainMode.Searching
        connecting -> MainMode.Connecting
        confirm -> MainMode.Confirm
        else -> MainMode.Live
    }
    // One size in every state (searching, live, confirm): only colour and label change.
    val width = 200.dp
    val color by animateColorAsState(
        when (mode) { MainMode.Searching -> accents.a; MainMode.Connecting -> Color(0xFFF5A623); else -> Danger },
        tween(350), label = "c",
    )
    val source = remember { MutableInteractionSource() }
    val pressed by source.collectIsPressedAsState()
    val scale by animateFloatAsState(if (pressed) 0.92f else 1f, spring(dampingRatio = 0.5f, stiffness = 700f), label = "s")
    // Confirm: a draining countdown around the edge.
    val countdown = remember { Animatable(1f) }
    LaunchedEffect(mode) { if (mode == MainMode.Confirm) { countdown.snapTo(1f); countdown.animateTo(0f, tween(2600, easing = LinearEasing)) } }
    Box(
        Modifier.scale(scale).width(width).height(56.dp)
            .graphicsLayer { shadowElevation = 14f; shape = RoundedCornerShape(34.dp); clip = true }
            .background(Brush.linearGradient(listOf(color, color.copy(alpha = 0.78f))))
            .drawBehind {
                if (mode == MainMode.Confirm) drawRoundRect(
                    Color.White.copy(alpha = 0.18f), size = size.copy(width = size.width * countdown.value),
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(34.dp.toPx()),
                )
            }
            .clickable(source, indication = null) {
                haptics.performHapticFeedback(HapticFeedbackType.LongPress)
                app.talklive.sound.Tap.pop()
                when (mode) {
                    MainMode.Searching, MainMode.Connecting -> onEnd()
                    MainMode.Live -> confirm = true
                    MainMode.Confirm -> { confirm = false; if (autoConnect) onNext() else onEnd() }
                }
            },
        contentAlignment = Alignment.Center,
    ) {
        AnimatedContent(
            targetState = mode,
            transitionSpec = { (fadeIn(tween(200)) + scaleIn(initialScale = 0.7f)) togetherWith (fadeOut(tween(120)) + scaleOut(targetScale = 0.7f)) },
            label = "content",
        ) { m ->
            when (m) {
                MainMode.Live -> Icon(Icons.Rounded.CallEnd, stringResource(R.string.end), tint = Color.White, modifier = Modifier.size(28.dp))
                else -> Row(verticalAlignment = Alignment.CenterVertically) {
                    when (m) {
                        MainMode.Searching, MainMode.Connecting -> CircularProgressIndicator(Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
                        else -> Icon(if (autoConnect) Icons.Rounded.SkipNext else Icons.Rounded.CallEnd, null, tint = Color.White)
                    }
                    Spacer(Modifier.width(10.dp))
                    Text(
                        stringResource(
                            when (m) {
                                MainMode.Searching -> R.string.tap_to_stop
                                MainMode.Connecting -> R.string.connecting_short
                                else -> if (autoConnect) R.string.tap_again_next else R.string.tap_again_end
                            },
                        ),
                        color = Color.White, style = MaterialTheme.typography.labelLarge,
                        maxLines = 1, softWrap = false,
                    )
                }
            }
        }
    }
}

/** A small round control in the glass bar above the main button. */
@Composable
fun BarButton(icon: ImageVector, label: String, active: Boolean = false, enabled: Boolean = true, tint: Color? = null, onClick: () -> Unit) {
    val haptics = LocalHapticFeedback.current
    val accents = LocalAccents.current
    val source = remember { MutableInteractionSource() }
    val pressed by source.collectIsPressedAsState()
    val scale by animateFloatAsState(if (pressed) 0.86f else 1f, spring(dampingRatio = 0.5f, stiffness = 700f), label = "s")
    Box(
        Modifier.scale(scale).size(54.dp).clip(CircleShape)
            .background(
                when {
                    active -> Brush.linearGradient(listOf(accents.a, accents.b))
                    else -> Brush.linearGradient(listOf(Color.White.copy(alpha = 0.06f), Color.White.copy(alpha = 0.06f)))
                },
            )
            .clickable(source, indication = null, enabled = enabled) { haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove); app.talklive.sound.Tap.soft(); onClick() },
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            icon, label,
            tint = when { !enabled -> MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f); active -> Color.White; tint != null -> tint; else -> MaterialTheme.colorScheme.onSurface },
            modifier = Modifier.size(24.dp),
        )
    }
}

/** A close (leave) button for the top corner. */
@Composable
fun LeaveButton(onClick: () -> Unit) {
    Box(
        Modifier.size(40.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surface.copy(alpha = 0.85f)).clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) { Icon(Icons.Rounded.Close, stringResource(R.string.end), tint = MaterialTheme.colorScheme.onSurface, modifier = Modifier.size(20.dp)) }
}
