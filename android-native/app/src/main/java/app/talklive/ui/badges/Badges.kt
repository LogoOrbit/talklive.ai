package app.talklive.ui.badges

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathOperation
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import app.talklive.R
import app.talklive.social.BadgeSet
import app.talklive.ui.theme.LocalReduceMotion
import kotlin.math.cos
import kotlin.math.sin

/** One of the ten talk-time badges (spec 3). [hours] is the total call time that earns it. */
data class BadgeDef(val id: String, val name: Int, val hours: Int)

val BADGES: List<BadgeDef> = listOf(
    BadgeDef("b1", R.string.badge_b1, 1),
    BadgeDef("b2", R.string.badge_b2, 5),
    BadgeDef("b3", R.string.badge_b3, 10),
    BadgeDef("b4", R.string.badge_b4, 25),
    BadgeDef("b5", R.string.badge_b5, 50),
    BadgeDef("b6", R.string.badge_b6, 100),
    BadgeDef("b7", R.string.badge_b7, 250),
    BadgeDef("b8", R.string.badge_b8, 500),
    BadgeDef("b9", R.string.badge_b9, 1000),
    BadgeDef("b10", R.string.badge_b10, 2500),
)

fun badgeDef(id: String?): BadgeDef? = BADGES.firstOrNull { it.id == id }

// ---- Public pieces ---------------------------------------------------------

/**
 * A miniature medal with a soft shine that sweeps across it every few seconds.
 * [earned] false draws it in muted greys (the locked ones on the shelf). The
 * artwork is its own static layer, so only the thin shine layer redraws a frame.
 */
@Composable
fun BadgeMedal(id: String, size: Dp, modifier: Modifier = Modifier, earned: Boolean = true, animate: Boolean = true) {
    val reduce = LocalReduceMotion.current
    val phase = if (animate && earned && !reduce) {
        rememberInfiniteTransition(label = "medal")
            .animateFloat(0f, 1f, infiniteRepeatable(tween(4200 + (id.hashCode() and 7) * 260, easing = LinearEasing)), label = "shine")
    } else null
    val outline = remember(id) { outlineOf(id) }
    Box(modifier.size(size)) {
        Canvas(Modifier.fillMaxSize()) {
            val k = this.size.minDimension / 100f
            scale(k, k, Offset.Zero) { drawMedal(id, earned) }
        }
        if (phase != null) Canvas(Modifier.fillMaxSize()) {
            val k = this.size.minDimension / 100f
            scale(k, k, Offset.Zero) {
                clipPath(outline) {
                    // Idle for the first half of each turn, then one bright band from corner to corner.
                    val p = phase.value
                    val t = if (p < 0.5f) -1f else (p - 0.5f) / 0.5f
                    if (t >= 0f) {
                        val x = -40f + 180f * t
                        drawRect(
                            Brush.linearGradient(
                                0f to Color.Transparent, 0.5f to Color(0x99FFFFFF), 1f to Color.Transparent,
                                start = Offset(x, 0f), end = Offset(x + 38f, 38f),
                            ),
                            Offset.Zero, Size(100f, 100f),
                        )
                    }
                }
            }
        }
    }
}

/** The badge shown beside a name: nothing when there is none. */
@Composable
fun TopBadge(badges: BadgeSet?, size: Dp = 18.dp, modifier: Modifier = Modifier) {
    val id = badges?.top ?: return
    if (badgeDef(id) == null) return
    BadgeMedal(id, size, modifier, animate = false)
}

/** The top badge with its name, as a small pill. */
@Composable
fun TopBadgePill(badges: BadgeSet?, modifier: Modifier = Modifier) {
    val def = badgeDef(badges?.top) ?: return
    Surface(shape = RoundedCornerShape(50), color = MaterialTheme.colorScheme.surface, modifier = modifier) {
        Row(Modifier.padding(start = 4.dp, end = 10.dp, top = 3.dp, bottom = 3.dp), verticalAlignment = Alignment.CenterVertically) {
            BadgeMedal(def.id, 22.dp)
            Spacer(Modifier.width(6.dp))
            Text(stringResource(def.name), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurface)
        }
    }
}

/** All ten badges: earned ones lit, the rest greyed with the hours still needed. */
@OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
@Composable
fun BadgeShelf(badges: BadgeSet?, modifier: Modifier = Modifier) {
    val earned = badges?.earned.orEmpty().toSet()
    val hours = badges?.hours ?: 0.0
    FlowRow(
        modifier,
        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        BADGES.forEach { b ->
            val has = b.id in earned
            Column(Modifier.width(62.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                BadgeMedal(b.id, 52.dp, earned = has)
                Spacer(Modifier.size(4.dp))
                Text(
                    stringResource(b.name), style = MaterialTheme.typography.labelSmall, textAlign = TextAlign.Center, maxLines = 2,
                    fontWeight = if (has) FontWeight.SemiBold else FontWeight.Normal,
                    color = if (has) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    if (has) stringResource(R.string.badge_earned) else stringResource(R.string.badge_hours_needed, hoursLeft(b.hours, hours)),
                    style = MaterialTheme.typography.labelSmall, textAlign = TextAlign.Center, maxLines = 2,
                    color = if (has) app.talklive.ui.theme.AccentText else MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

private fun hoursLeft(need: Int, have: Double): String {
    val left = (need - have).coerceAtLeast(0.0)
    return if (left < 10) String.format(java.util.Locale.getDefault(), "%.1f", left) else Math.ceil(left).toInt().toString()
}

// ---- Artwork (100 x 100 space) ---------------------------------------------

private class Look(val rimA: Color, val rimB: Color, val faceA: Color, val faceB: Color, val ink: Color, val accent: Color)

private fun lookOf(id: String): Look = when (id) {
    "b1" -> Look(Color(0xFFF0B27A), Color(0xFF8D4F22), Color(0xFFD9895A), Color(0xFF9C5527), Color(0xFF5A2D0E), Color(0xFFFFE6CC))
    "b2" -> Look(Color(0xFF9BE3FF), Color(0xFF1C7BC4), Color(0xFF45B4F0), Color(0xFF1B63B8), Color(0xFF0B3470), Color(0xFFE3F6FF))
    "b3" -> Look(Color(0xFF9CF0C0), Color(0xFF14804F), Color(0xFF34C985), Color(0xFF0F7A4B), Color(0xFF06432A), Color(0xFFFFF5C7))
    "b4" -> Look(Color(0xFFB4B6FF), Color(0xFF3B3AA8), Color(0xFF5B5BE0), Color(0xFF26256F), Color(0xFF14134A), Color(0xFFFFF1B8))
    "b5" -> Look(Color(0xFF8FF1E6), Color(0xFF0E7C86), Color(0xFF29C7C0), Color(0xFF0B6A7C), Color(0xFF063B47), Color(0xFFFFFFFF))
    "b6" -> Look(Color(0xFFFFFFFF), Color(0xFF7B8798), Color(0xFFE3E8F0), Color(0xFF9AA5B5), Color(0xFF4A5568), Color(0xFFFFFFFF))
    "b7" -> Look(Color(0xFFFFF0A6), Color(0xFFB8860B), Color(0xFFFFD84D), Color(0xFFD99A12), Color(0xFF7A4F05), Color(0xFFFFFBE3))
    "b8" -> Look(Color(0xFFE9B8FF), Color(0xFF6A1FA0), Color(0xFF9B3FD6), Color(0xFF4A1275), Color(0xFF2A0846), Color(0xFFFFD84D))
    "b9" -> Look(Color(0xFFFFB0EA), Color(0xFF8A1E9E), Color(0xFFE23FC2), Color(0xFF5B1B9C), Color(0xFF2D0A52), Color(0xFF9DF3FF))
    else -> Look(Color(0xFFFFF3B0), Color(0xFFB77900), Color(0xFF7C6CF0), Color(0xFF0FB3C8), Color(0xFF1A1450), Color(0xFFFFE066))
}

private fun poly(cx: Float, cy: Float, r: Float, n: Int, rot: Float = -90f): Path {
    val p = Path()
    for (i in 0 until n) {
        val a = Math.toRadians((rot + 360.0 * i / n)).toFloat()
        val x = cx + r * cos(a)
        val y = cy + r * sin(a)
        if (i == 0) p.moveTo(x, y) else p.lineTo(x, y)
    }
    p.close()
    return p
}

private fun starPath(cx: Float, cy: Float, ro: Float, ri: Float, n: Int, rot: Float = -90f): Path {
    val p = Path()
    for (i in 0 until n * 2) {
        val r = if (i % 2 == 0) ro else ri
        val a = Math.toRadians((rot + 180.0 * i / n)).toFloat()
        val x = cx + r * cos(a)
        val y = cy + r * sin(a)
        if (i == 0) p.moveTo(x, y) else p.lineTo(x, y)
    }
    p.close()
    return p
}

private fun circlePath(cx: Float, cy: Float, r: Float) = Path().apply { addOval(Rect(Offset(cx, cy), r)) }

private fun shieldPath() = Path().apply {
    moveTo(50f, 3f); lineTo(89f, 14f); lineTo(89f, 50f)
    quadraticTo(89f, 82f, 50f, 98f)
    quadraticTo(11f, 82f, 11f, 50f)
    lineTo(11f, 14f); close()
}

/** The medal's silhouette, also the clip for the shine. */
private fun outlineOf(id: String): Path = when (id) {
    "b1", "b5" -> circlePath(50f, 50f, 46f)
    "b2" -> starPath(50f, 50f, 47f, 42f, 14)
    "b3", "b8" -> shieldPath()
    "b4" -> poly(50f, 50f, 47f, 6)
    "b6" -> starPath(50f, 50f, 48f, 38f, 8)
    "b7" -> starPath(50f, 50f, 47f, 43f, 20)
    "b9" -> starPath(50f, 50f, 48f, 33f, 4)
    else -> starPath(50f, 50f, 48f, 41f, 12)
}

private fun Color.mute(): Color {
    val l = 0.3f * red + 0.59f * green + 0.11f * blue
    return Color(l * 0.85f + 0.12f, l * 0.85f + 0.12f, l * 0.9f + 0.16f, alpha)
}

private fun DrawScope.drawMedal(id: String, earned: Boolean) {
    val raw = lookOf(id)
    fun c(x: Color) = if (earned) x else x.mute()
    val rimA = c(raw.rimA); val rimB = c(raw.rimB); val faceA = c(raw.faceA); val faceB = c(raw.faceB)
    val ink = c(raw.ink); val accent = c(raw.accent)
    val outline = outlineOf(id)
    // Soft drop shadow, then the rim.
    translateShadow(outline)
    drawPath(outline, Brush.linearGradient(listOf(rimA, rimB), Offset(10f, 0f), Offset(90f, 100f)))
    // Face, a little smaller than the rim, with its own gradient and a fine inner line.
    scale(0.8f, Offset(50f, 50f)) {
        drawPath(outline, Brush.linearGradient(listOf(faceA, faceB), Offset(20f, 8f), Offset(80f, 96f)))
        drawPath(outline, rimA.copy(alpha = 0.55f), style = Stroke(1.6f))
    }
    // A gloss on the upper half.
    clipPath(outline) {
        drawOval(Color.White.copy(alpha = if (earned) 0.22f else 0.12f), Offset(14f, -22f), Size(72f, 56f))
    }
    when (id) {
        "b1" -> {
            // A speech bubble with three dots: the first words.
            drawRoundRect(accent, Offset(29f, 32f), Size(42f, 28f), CornerRadius(9f))
            val tail = Path().apply { moveTo(40f, 58f); lineTo(38f, 71f); lineTo(53f, 59f); close() }
            drawPath(tail, accent)
            for (i in 0 until 3) drawCircle(ink, 3.2f, Offset(39f + i * 11f, 46f))
        }
        "b2" -> {
            // Two bubbles talking over each other.
            drawRoundRect(accent, Offset(25f, 28f), Size(34f, 24f), CornerRadius(8f))
            drawPath(Path().apply { moveTo(32f, 50f); lineTo(30f, 60f); lineTo(42f, 51f); close() }, accent)
            drawRoundRect(ink.copy(alpha = 0.9f), Offset(42f, 44f), Size(34f, 24f), CornerRadius(8f))
            drawPath(Path().apply { moveTo(68f, 66f); lineTo(72f, 76f); lineTo(60f, 67f); close() }, ink.copy(alpha = 0.9f))
            for (i in 0 until 3) drawCircle(accent, 2.6f, Offset(50f + i * 8f, 56f))
            drawRoundRect(ink.copy(alpha = 0.55f), Offset(31f, 36f), Size(22f, 3.4f), CornerRadius(2f))
            drawRoundRect(ink.copy(alpha = 0.55f), Offset(31f, 43f), Size(14f, 3.4f), CornerRadius(2f))
        }
        "b3" -> {
            // An open book with a star over it: stories.
            val left = Path().apply { moveTo(50f, 42f); quadraticTo(38f, 35f, 24f, 40f); lineTo(24f, 68f); quadraticTo(38f, 63f, 50f, 70f); close() }
            val right = Path().apply { moveTo(50f, 42f); quadraticTo(62f, 35f, 76f, 40f); lineTo(76f, 68f); quadraticTo(62f, 63f, 50f, 70f); close() }
            drawPath(left, accent); drawPath(right, accent.copy(alpha = 0.88f))
            drawLine(ink.copy(alpha = 0.5f), Offset(50f, 42f), Offset(50f, 70f), 1.6f)
            for (i in 0 until 3) {
                drawLine(ink.copy(alpha = 0.35f), Offset(29f, 47f + i * 6f), Offset(45f, 48f + i * 6f), 1.4f, StrokeCap.Round)
                drawLine(ink.copy(alpha = 0.35f), Offset(55f, 48f + i * 6f), Offset(71f, 47f + i * 6f), 1.4f, StrokeCap.Round)
            }
            drawPath(starPath(50f, 29f, 8f, 3.4f, 5), accent)
        }
        "b4" -> {
            // A crescent moon and stars: late-night talks.
            val moon = Path.combine(PathOperation.Difference, circlePath(45f, 52f, 19f), circlePath(54f, 45f, 16f))
            drawPath(moon, accent)
            drawPath(starPath(66f, 35f, 5.5f, 2.2f, 4), accent)
            drawPath(starPath(72f, 55f, 4f, 1.6f, 4), accent.copy(alpha = 0.85f))
            drawPath(starPath(60f, 68f, 3.2f, 1.3f, 4), accent.copy(alpha = 0.7f))
            drawCircle(accent.copy(alpha = 0.8f), 1.4f, Offset(34f, 32f))
        }
        "b5" -> {
            // A globe with a flight path around it.
            drawCircle(Brush.linearGradient(listOf(Color(0xFF5CC8FF).let { if (earned) it else it.mute() }, Color(0xFF1B6FD1).let { if (earned) it else it.mute() }), Offset(34f, 32f), Offset(66f, 68f)), 20f, Offset(50f, 50f))
            val line = accent.copy(alpha = 0.8f)
            drawOval(line, Offset(41f, 30f), Size(18f, 40f), style = Stroke(1.3f))
            drawLine(line, Offset(30f, 50f), Offset(70f, 50f), 1.3f)
            drawOval(line, Offset(33f, 38f), Size(34f, 24f), style = Stroke(1.2f))
            // Land.
            drawPath(Path().apply { moveTo(40f, 41f); quadraticTo(47f, 36f, 52f, 42f); quadraticTo(47f, 49f, 41f, 46f); close() }, Color(0xFF7BE0A0).let { if (earned) it else it.mute() })
            drawPath(Path().apply { moveTo(55f, 54f); quadraticTo(63f, 52f, 64f, 59f); quadraticTo(58f, 64f, 54f, 60f); close() }, Color(0xFF7BE0A0).let { if (earned) it else it.mute() })
            rotate(-24f, Offset(50f, 50f)) {
                drawOval(accent, Offset(22f, 36f), Size(56f, 28f), style = Stroke(1.8f))
                drawCircle(accent, 3.4f, Offset(78f, 50f))
            }
        }
        "b6" -> {
            // A silver microphone.
            drawRoundRect(accent, Offset(42f, 26f), Size(16f, 30f), CornerRadius(8f))
            for (i in 0 until 4) drawLine(ink.copy(alpha = 0.35f), Offset(42f, 34f + i * 5.5f), Offset(58f, 34f + i * 5.5f), 1.3f)
            drawArc(accent, 0f, 180f, false, Offset(35f, 40f), Size(30f, 26f), style = Stroke(3.2f, cap = StrokeCap.Round))
            drawLine(accent, Offset(50f, 66f), Offset(50f, 73f), 3.2f, StrokeCap.Round)
            drawLine(accent, Offset(41f, 73f), Offset(59f, 73f), 3.2f, StrokeCap.Round)
        }
        "b7" -> {
            // Golden voice: a note framed by laurel leaves.
            for (side in 0 until 2) for (i in 0 until 5) {
                val a = Math.toRadians((100.0 + i * 24.0) * (if (side == 0) 1 else -1) + (if (side == 0) 0.0 else 180.0))
                val x = 50f + 31f * cos(a).toFloat()
                val y = 52f + 31f * sin(a).toFloat()
                rotate(Math.toDegrees(a).toFloat() + 90f, Offset(x, y)) { drawOval(accent.copy(alpha = 0.9f), Offset(x - 2.6f, y - 5.4f), Size(5.2f, 10.8f)) }
            }
            drawOval(accent, Offset(34f, 58f), Size(14f, 10f))
            drawOval(accent, Offset(54f, 54f), Size(14f, 10f))
            drawLine(accent, Offset(46.6f, 62f), Offset(46.6f, 34f), 2.6f)
            drawLine(accent, Offset(66.6f, 58f), Offset(66.6f, 30f), 2.6f)
            drawPath(Path().apply { moveTo(46.6f, 34f); lineTo(66.6f, 30f); lineTo(66.6f, 37f); lineTo(46.6f, 41f); close() }, accent)
        }
        "b8" -> {
            // A crown with jewels over the shield.
            val crown = Path().apply {
                moveTo(29f, 64f); lineTo(27f, 36f); lineTo(40f, 50f); lineTo(50f, 30f); lineTo(60f, 50f); lineTo(73f, 36f); lineTo(71f, 64f); close()
            }
            drawPath(crown, accent)
            drawRoundRect(accent, Offset(29f, 64f), Size(42f, 8f), CornerRadius(2.5f))
            drawRoundRect(ink.copy(alpha = 0.35f), Offset(29f, 66.5f), Size(42f, 1.6f), CornerRadius(1f))
            for ((x, y) in listOf(27f to 36f, 50f to 30f, 73f to 36f)) drawCircle(Color(0xFFFF4D6D).let { if (earned) it else it.mute() }, 3.6f, Offset(x, y))
            drawCircle(Color(0xFF4DD2FF).let { if (earned) it else it.mute() }, 3.2f, Offset(50f, 58f))
            drawCircle(ink.copy(alpha = 0.4f), 1.1f, Offset(40f, 58f)); drawCircle(ink.copy(alpha = 0.4f), 1.1f, Offset(60f, 58f))
        }
        "b9" -> {
            // A faceted crystal with sparks: the mythic gem.
            val gem = Path().apply { moveTo(50f, 24f); lineTo(68f, 41f); lineTo(50f, 77f); lineTo(32f, 41f); close() }
            drawPath(gem, Brush.linearGradient(listOf(accent, accent.copy(alpha = 0.55f)), Offset(34f, 26f), Offset(66f, 76f)))
            val edge = ink.copy(alpha = 0.55f)
            drawLine(edge, Offset(32f, 41f), Offset(68f, 41f), 1.4f)
            drawLine(edge, Offset(50f, 24f), Offset(42f, 41f), 1.2f); drawLine(edge, Offset(50f, 24f), Offset(58f, 41f), 1.2f)
            drawLine(edge, Offset(42f, 41f), Offset(50f, 77f), 1.2f); drawLine(edge, Offset(58f, 41f), Offset(50f, 77f), 1.2f)
            drawPath(Path().apply { moveTo(50f, 24f); lineTo(42f, 41f); lineTo(50f, 41f); close() }, Color.White.copy(alpha = 0.45f))
            drawPath(starPath(72f, 30f, 6f, 1.8f, 4), accent)
            drawPath(starPath(27f, 62f, 4.5f, 1.4f, 4), accent.copy(alpha = 0.85f))
        }
        else -> {
            // TalkLive Icon: the brand orb with its voice bars, ringed by stars.
            for (i in 0 until 8) {
                val a = Math.toRadians(-90.0 + i * 45.0)
                drawPath(starPath(50f + 31f * cos(a).toFloat(), 50f + 31f * sin(a).toFloat(), 3.6f, 1.4f, 4), accent)
            }
            drawCircle(Brush.linearGradient(listOf(faceA, faceB), Offset(32f, 32f), Offset(68f, 68f)), 19f, Offset(50f, 50f))
            drawCircle(accent, 19f, Offset(50f, 50f), style = Stroke(2f))
            val hs = floatArrayOf(8f, 16f, 24f, 16f, 8f)
            for (i in 0 until 5) drawRoundRect(Color.White, Offset(38.5f + i * 5.8f, 50f - hs[i] / 2f), Size(3.4f, hs[i]), CornerRadius(1.7f))
        }
    }
}

private fun DrawScope.translateShadow(outline: Path) {
    scale(1.0f, Offset(50f, 50f)) {
        translate(0f, 2.2f) { drawPath(outline, Color.Black.copy(alpha = 0.22f)) }
    }
}
