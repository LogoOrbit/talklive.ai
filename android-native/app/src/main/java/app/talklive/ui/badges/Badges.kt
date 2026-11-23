package app.talklive.ui.badges

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.ui.graphics.lerp
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
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

/** The five top-talker badges (spec 9): held by the people with the most call time. [BadgeDef.hours] is unused. */
val RANK_BADGES: List<BadgeDef> = listOf(
    BadgeDef("top1", R.string.badge_top1, 0),
    BadgeDef("top2", R.string.badge_top2, 0),
    BadgeDef("top3", R.string.badge_top3, 0),
    BadgeDef("top4", R.string.badge_top4, 0),
    BadgeDef("top5", R.string.badge_top5, 0),
)

fun isRankBadge(id: String?): Boolean = id != null && id.length == 4 && id.startsWith("top")

fun badgeDef(id: String?): BadgeDef? = BADGES.firstOrNull { it.id == id } ?: RANK_BADGES.firstOrNull { it.id == id }

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
            .animateFloat(0f, 1f, infiniteRepeatable(tween(if (isRankBadge(id)) 2600 else 3600 + (id.hashCode() and 7) * 240, easing = LinearEasing)), label = "shine")
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
                val p = phase.value
                clipPath(outline) {
                    // Idle for the first third of each turn, then one bright metallic band from corner to corner.
                    val t = if (p < 0.34f) -1f else (p - 0.34f) / 0.66f
                    if (t >= 0f) {
                        val x = -50f + 200f * t
                        drawRect(
                            Brush.linearGradient(
                                0f to Color.Transparent, 0.35f to Color(0x55FFFFFF), 0.5f to Color(0xCCFFFFFF), 0.65f to Color(0x55FFFFFF), 1f to Color.Transparent,
                                start = Offset(x, 0f), end = Offset(x + 46f, 46f),
                            ),
                            Offset.Zero, Size(100f, 100f),
                        )
                    }
                }
                // Little four-point sparkles that twinkle at the edge, each on its own beat.
                val spots = if (isRankBadge(id)) listOf(Offset(22f, 20f), Offset(80f, 28f), Offset(70f, 80f), Offset(24f, 74f), Offset(50f, 10f)) else listOf(Offset(22f, 20f), Offset(80f, 28f), Offset(70f, 80f))
                spots.forEachIndexed { i, o ->
                    val u = (p * 2f + i * 0.31f) % 1f
                    val a = if (u < 0.22f) kotlin.math.sin(u / 0.22f * Math.PI.toFloat()) else 0f
                    if (a > 0.02f) drawPath(sparkle(o.x, o.y, 3f + 7f * a), Color.White.copy(alpha = a))
                }
            }
        }
    }
}

/** A thin four-point sparkle. */
private fun sparkle(cx: Float, cy: Float, r: Float): Path = Path().apply {
    moveTo(cx, cy - r); lineTo(cx + r * 0.22f, cy - r * 0.22f); lineTo(cx + r, cy); lineTo(cx + r * 0.22f, cy + r * 0.22f)
    lineTo(cx, cy + r); lineTo(cx - r * 0.22f, cy + r * 0.22f); lineTo(cx - r, cy); lineTo(cx - r * 0.22f, cy - r * 0.22f); close()
}

/** The badge shown beside a name: nothing when there is none. */
@Composable
fun TopBadge(badges: BadgeSet?, size: Dp = 18.dp, modifier: Modifier = Modifier) {
    val id = badges?.top ?: return
    if (badgeDef(id) == null) return
    var open by remember { mutableStateOf(false) }
    BadgeMedal(id, size, modifier.clickable { open = true }, animate = false)
    if (open) BadgeDetailSheet(id, badges) { open = false }
}

/** The top badge with its name, as a small pill. */
@Composable
fun TopBadgePill(badges: BadgeSet?, modifier: Modifier = Modifier) {
    val def = badgeDef(badges?.top) ?: return
    var open by remember { mutableStateOf(false) }
    if (open) BadgeDetailSheet(def.id, badges) { open = false }
    Surface(shape = RoundedCornerShape(50), color = MaterialTheme.colorScheme.surface, modifier = modifier.clickable { open = true }) {
        Row(Modifier.padding(start = 4.dp, end = 10.dp, top = 3.dp, bottom = 3.dp), verticalAlignment = Alignment.CenterVertically) {
            BadgeMedal(def.id, 22.dp)
            Spacer(Modifier.width(6.dp))
            Text(stringResource(def.name), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurface)
        }
    }
}

/** All ten badges in one row that scrolls sideways: earned ones lit, the rest greyed. Tap one for its details. */
@Composable
fun BadgeShelf(badges: BadgeSet?, modifier: Modifier = Modifier) {
    val earned = badges?.earned.orEmpty().toSet()
    val hours = badges?.hours ?: 0.0
    var detail by remember { mutableStateOf<String?>(null) }
    LazyRow(modifier, horizontalArrangement = Arrangement.spacedBy(10.dp), contentPadding = PaddingValues(horizontal = 2.dp)) {
        items(RANK_BADGES.filter { it.id in earned } + BADGES, key = { it.id }) { b ->
            val has = b.id in earned
            Column(Modifier.width(68.dp).clickable { detail = b.id }, horizontalAlignment = Alignment.CenterHorizontally) {
                BadgeMedal(b.id, 56.dp, earned = has)
                Spacer(Modifier.size(4.dp))
                Text(
                    stringResource(b.name), style = MaterialTheme.typography.labelSmall, textAlign = TextAlign.Center, maxLines = 2,
                    fontWeight = if (has) FontWeight.SemiBold else FontWeight.Normal,
                    color = if (has) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    if (has || isRankBadge(b.id)) stringResource(R.string.badge_earned) else stringResource(R.string.badge_to_go, hoursLeftText(b.hours, hours)),
                    style = MaterialTheme.typography.labelSmall, textAlign = TextAlign.Center, maxLines = 2,
                    color = if (has) app.talklive.ui.theme.AccentText else MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
    detail?.let { BadgeDetailSheet(it, badges) { detail = null } }
}

/** A badge's details: big shiny art, its name, the hours it needs, and whether it is earned or how far off it is. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BadgeDetailSheet(id: String, badges: BadgeSet?, onDismiss: () -> Unit) {
    val def = badgeDef(id) ?: run { onDismiss(); return }
    val has = id in badges?.earned.orEmpty()
    val hours = badges?.hours ?: 0.0
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = MaterialTheme.colorScheme.background,
    ) {
        Column(
            Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 24.dp).padding(bottom = 28.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            BadgeMedal(id, 140.dp, earned = has, animate = true)
            Spacer(Modifier.height(14.dp))
            Text(stringResource(def.name), style = MaterialTheme.typography.headlineSmall, color = MaterialTheme.colorScheme.onBackground)
            Spacer(Modifier.height(4.dp))
            Text(
                if (isRankBadge(id)) stringResource(R.string.badge_rank_desc, id.removePrefix("top").toInt())
                else androidx.compose.ui.res.pluralStringResource(R.plurals.badge_needs_hours, def.hours, def.hours),
                style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(12.dp))
            Surface(shape = RoundedCornerShape(50), color = if (has) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface) {
                Text(
                    if (has) stringResource(R.string.badge_earned) else if (isRankBadge(id)) stringResource(R.string.badge_rank_locked) else stringResource(R.string.badge_to_go, hoursLeftText(def.hours, hours)),
                    style = MaterialTheme.typography.labelLarge,
                    color = if (has) app.talklive.ui.theme.AccentText else MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                )
            }
        }
    }
}

/** Whole hours rounded down ("12h"); under an hour, minutes ("40m"). Never "1.0h". */
fun hoursText(hours: Double): String {
    val h = Math.floor(hours.coerceAtLeast(0.0)).toInt()
    return if (h >= 1) "${h}h" else "${(hours.coerceAtLeast(0.0) * 60 + 1e-6).toInt()}m"
}

/** What is left to earn a badge, rounded up: "3h" or "25m". */
fun hoursLeftText(need: Int, have: Double): String {
    val left = (need - have).coerceAtLeast(0.0)
    return if (left >= 1) "${Math.ceil(left).toInt()}h" else "${Math.ceil(left * 60).toInt().coerceAtLeast(1)}m"
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
    // Top talkers: gold, silver, bronze, then platinum blue.
    "top1" -> Look(Color(0xFFFFF4B0), Color(0xFFB8860B), Color(0xFFFFD43B), Color(0xFFC77D0A), Color(0xFF6B4300), Color(0xFFFFFBE0))
    "top2" -> Look(Color(0xFFFFFFFF), Color(0xFF6B7686), Color(0xFFDDE3EC), Color(0xFF8E9AAB), Color(0xFF3B4556), Color(0xFFFFFFFF))
    "top3" -> Look(Color(0xFFFFD2A6), Color(0xFF8A4A1C), Color(0xFFD9904F), Color(0xFF93511F), Color(0xFF4F2609), Color(0xFFFFE9D2))
    "top4" -> Look(Color(0xFFE0F4FF), Color(0xFF3E7DB8), Color(0xFF8FD0F5), Color(0xFF3C86C8), Color(0xFF123B66), Color(0xFFFFFFFF))
    "top5" -> Look(Color(0xFFD6ECFF), Color(0xFF4B6FB5), Color(0xFF7FB6F0), Color(0xFF4568B8), Color(0xFF172F66), Color(0xFFF2FAFF))
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
    "top1", "top2", "top3", "top4", "top5" -> starPath(50f, 50f, 49f, 42f, 16)
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
    // A metal look: bright, dark, bright and dark bands across the rim.
    val hi = lerp(rimA, Color.White, if (earned) 0.7f else 0.35f)
    drawPath(outline, Brush.linearGradient(0f to rimA, 0.22f to hi, 0.42f to rimB, 0.66f to lerp(rimA, hi, 0.5f), 0.86f to rimB, 1f to rimA, start = Offset(6f, 0f), end = Offset(94f, 100f)))
    // Face, a little smaller than the rim, with its own gradient and a fine inner line.
    scale(0.8f, Offset(50f, 50f)) {
        drawPath(outline, Brush.linearGradient(0f to faceA, 0.35f to lerp(faceA, Color.White, if (earned) 0.32f else 0.15f), 0.6f to faceB, 1f to lerp(faceB, faceA, 0.4f), start = Offset(20f, 8f), end = Offset(80f, 96f)))
        drawPath(outline, hi.copy(alpha = 0.75f), style = Stroke(1.8f))
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
        "top1", "top2", "top3", "top4", "top5" -> {
            // A crown over the rank: one pip per place (the #1 crown also carries a gem on every point).
            val n = id.removePrefix("top").toInt()
            val crown = Path().apply {
                moveTo(26f, 60f); lineTo(24f, 32f); lineTo(38f, 46f); lineTo(50f, 25f); lineTo(62f, 46f); lineTo(76f, 32f); lineTo(74f, 60f); close()
            }
            drawPath(crown, Brush.linearGradient(listOf(accent, lerp(accent, rimB, 0.35f)), Offset(26f, 25f), Offset(74f, 62f)))
            drawRoundRect(accent, Offset(26f, 60f), Size(48f, 9f), CornerRadius(3f))
            drawRoundRect(ink.copy(alpha = 0.35f), Offset(26f, 63f), Size(48f, 1.6f), CornerRadius(1f))
            val gem = if (earned) Color(0xFFFF4D6D) else Color(0xFF8A8F9C)
            for ((x, y) in listOf(24f to 32f, 50f to 25f, 76f to 32f)) drawCircle(gem, if (n == 1) 4.2f else 3.2f, Offset(x, y))
            drawCircle(if (earned) Color(0xFF4DD2FF) else Color(0xFF9AA0AD), 3f, Offset(50f, 51f))
            for (i in 0 until n) drawPath(starPath(50f + (i - (n - 1) / 2f) * 9f, 79f, 4f, 1.6f, 4), accent)
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
