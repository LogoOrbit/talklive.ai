package app.talklive.ui.animals

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.scale
import app.talklive.R
import app.talklive.ui.theme.LocalReduceMotion
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.sin

/**
 * The three faces earned by level, never bought with Plus (spec 1). Like the
 * website's characters they are drawn on a 64 x 64 tile, but in Compose, so they
 * can move: a slow shine over silver armour, a phoenix flapping and flickering,
 * a crystal crown that sparkles. [Animal.icon] is only a placeholder for them.
 */
val SpecialFaces: List<Animal> = listOf(
    Animal("c:silver_knight", "Silver Knight", "Earned at Silver", Color(0xFF64748B), R.drawable.character_knight, special = true),
    Animal("c:gold_phoenix", "Gold Phoenix", "Earned at Gold", Color(0xFFF59E0B), R.drawable.character_knight, special = true),
    Animal("c:diamond_legend", "Diamond Legend", "Earned at Diamond", Color(0xFF38BDF8), R.drawable.character_knight, special = true),
)

/** The tier that unlocks each special face. */
val SPECIAL_TIER: Map<String, String> = mapOf(
    "c:silver_knight" to "silver",
    "c:gold_phoenix" to "gold",
    "c:diamond_legend" to "diamond",
)

fun isSpecialFace(id: String?): Boolean = id != null && id in SPECIAL_TIER

fun tierRank(tier: String?): Int = when (tier) { "silver" -> 1; "gold" -> 2; "diamond" -> 3; else -> 0 }

/** True when [tier] (the account's current one) reaches what [id] needs. */
fun specialUnlocked(id: String, tier: String?): Boolean = tierRank(tier) >= tierRank(SPECIAL_TIER[id])

/** The animals and characters the pickers offer, in order: the free ones first, then the Plus ones (spec 1). */
val PICKER_ANIMALS: List<String> = listOf("cat", "fox", "rabbit", "panda", "dog", "lion", "raccoon", "giraffe", "unicorn", "dragon")
val PICKER_CHARACTERS: List<String> = listOf("c:wizard", "c:queen", "c:pirate", "c:robot", "c:artist", "c:detective", "c:ninja", "c:warrior", "c:gamer", "c:astronaut")

private const val PERIOD_MS = 6000
private const val STILL = 0.12f
private const val TAU = (2 * PI).toFloat()

private fun wrap(v: Float) = v - floor(v)

/** A special face's picture, filling its box; [animate] false (or reduced motion) draws one still frame. */
@Composable
fun SpecialFaceArt(id: String, modifier: Modifier = Modifier, animate: Boolean = true) {
    val reduce = LocalReduceMotion.current
    val phase = if (animate && !reduce) {
        rememberInfiniteTransition(label = "special")
            .animateFloat(0f, 1f, infiniteRepeatable(tween(PERIOD_MS, easing = LinearEasing)), label = "phase")
    } else null
    Canvas(modifier) {
        val k = size.minDimension / 64f
        val p = phase?.value ?: STILL
        scale(k, k, Offset.Zero) {
            when (id) {
                "c:silver_knight" -> silverKnight(p)
                "c:gold_phoenix" -> goldPhoenix(p)
                else -> diamondLegend(p)
            }
        }
    }
}

// ---- Shared helpers (64 x 64 space) ------------------------------------------------------

private fun circle(cx: Float, cy: Float, r: Float) = Path().apply { addOval(Rect(Offset(cx, cy), r)) }

private fun spark(cx: Float, cy: Float, r: Float): Path {
    val p = Path()
    for (i in 0 until 8) {
        val rr = if (i % 2 == 0) r else r * 0.32f
        val a = (-PI / 2 + i * PI / 4).toFloat()
        val x = cx + rr * cos(a)
        val y = cy + rr * sin(a)
        if (i == 0) p.moveTo(x, y) else p.lineTo(x, y)
    }
    p.close()
    return p
}

/** A leaf growing from (px, py) straight up for [len], [wd] wide; rotate the scope to aim it. */
private fun leaf(px: Float, py: Float, len: Float, wd: Float) = Path().apply {
    moveTo(px, py)
    cubicTo(px - wd, py - len * 0.3f, px - wd * 0.7f, py - len * 0.8f, px, py - len)
    cubicTo(px + wd * 0.7f, py - len * 0.8f, px + wd, py - len * 0.3f, px, py)
    close()
}

/** A bright band crossing [area] once a turn, idle for the rest, clipped to the shape. */
private fun DrawScope.sweep(area: Path, p: Float, from: Float, to: Float, tint: Color = Color(0x99FFFFFF)) {
    val u = wrap(p * 1f)
    val t = if (u < from) -1f else ((u - from) / (to - from)).coerceIn(0f, 1f)
    if (u < from || u > to) return
    val x = -24f + 112f * t
    clipPath(area) {
        drawRect(
            Brush.linearGradient(0f to Color.Transparent, 0.5f to tint, 1f to Color.Transparent, start = Offset(x, 0f), end = Offset(x + 26f, 26f)),
            Offset.Zero, Size(64f, 64f),
        )
    }
}

// ---- Silver Knight: a great helm with a swaying crimson plume ------------------------------

private fun DrawScope.silverKnight(p: Float) {
    val sway = sin(TAU * p)
    val tile = circle(32f, 32f, 32f)
    drawPath(tile, Brush.radialGradient(listOf(Color(0xFF4B5C7A), Color(0xFF1A2235), Color(0xFF0B1020)), Offset(32f, 24f), 42f))
    // Cold light behind the head.
    drawCircle(Brush.radialGradient(listOf(Color(0x6693C5FD), Color.Transparent), Offset(32f, 30f), 26f), 26f, Offset(32f, 30f), alpha = 0.7f + 0.3f * sin(TAU * p * 2))

    // Pauldrons and breastplate, cut off by the tile.
    clipPath(tile) {
        val shoulders = Path().apply {
            moveTo(2f, 66f); cubicTo(4f, 50f, 16f, 45f, 32f, 45f); cubicTo(48f, 45f, 60f, 50f, 62f, 66f); close()
        }
        drawPath(shoulders, Brush.linearGradient(listOf(Color(0xFF64748B), Color(0xFFE2E8F0), Color(0xFF64748B)), Offset(2f, 50f), Offset(62f, 50f)))
        drawPath(shoulders, Color(0xFFFBBF24), style = Stroke(1.2f))
        // Plate seams and a gold clasp.
        drawLine(Color(0x664A5568), Offset(32f, 47f), Offset(32f, 66f), 1.2f)
        drawLine(Color(0x554A5568), Offset(16f, 49f), Offset(12f, 66f), 1f)
        drawLine(Color(0x554A5568), Offset(48f, 49f), Offset(52f, 66f), 1f)
        drawCircle(Color(0xFFFBBF24), 2.2f, Offset(32f, 55f))
        drawCircle(Color(0xFFFEF3C7), 0.8f, Offset(31.4f, 54.4f))
    }

    // The plume: three overlapping feathers, bending with the breeze.
    val plume = Path().apply {
        moveTo(28f, 13f)
        cubicTo(26f + sway, 2f, 40f + sway * 2f, 0.5f, 51f + sway * 3f, 9f)
        cubicTo(45f + sway * 2f, 8f, 39f + sway, 10f, 36f, 14f)
        close()
    }
    drawPath(plume, Brush.linearGradient(listOf(Color(0xFFFB7185), Color(0xFF991B1B)), Offset(28f, 4f), Offset(51f, 14f)))
    drawPath(
        Path().apply { moveTo(30f, 11f); cubicTo(33f + sway, 5f, 41f + sway * 2f, 4f, 49f + sway * 3f, 9f) },
        Color(0x66FFE4E6), style = Stroke(0.9f, cap = StrokeCap.Round),
    )

    // The helm.
    val helm = Path().apply {
        moveTo(17f, 31f); cubicTo(17f, 18f, 23f, 10f, 32f, 10f); cubicTo(41f, 10f, 47f, 18f, 47f, 31f)
        lineTo(47f, 42f); cubicTo(47f, 45f, 45f, 47f, 42f, 47f); lineTo(22f, 47f); cubicTo(19f, 47f, 17f, 45f, 17f, 42f); close()
    }
    drawPath(helm, Brush.linearGradient(0f to Color(0xFF8E9BB0), 0.35f to Color(0xFFF8FAFC), 0.7f to Color(0xFFB7C2D3), 1f to Color(0xFF6B7890), start = Offset(17f, 20f), end = Offset(47f, 30f)))
    drawPath(helm, Color(0xFF475569), style = Stroke(0.9f))
    // The crest ridge down the middle.
    drawLine(Color(0xFF94A3B8), Offset(32f, 10.6f), Offset(32f, 27f), 2.2f)
    drawLine(Color(0xAAFFFFFF), Offset(31.2f, 11f), Offset(31.2f, 26f), 0.7f)
    // Blue jewel star on the brow.
    drawPath(spark(32f, 19.2f, 3.6f), Brush.linearGradient(listOf(Color(0xFFBAE6FD), Color(0xFF2563EB)), Offset(29f, 16f), Offset(35f, 23f)))
    // The T-shaped visor with two glinting eyes.
    val visor = Path().apply {
        moveTo(20f, 27f); lineTo(44f, 27f); lineTo(44f, 33.5f); lineTo(33.4f, 33.5f); lineTo(33.4f, 42f); lineTo(30.6f, 42f); lineTo(30.6f, 33.5f); lineTo(20f, 33.5f); close()
    }
    drawPath(visor, Color(0xFF0B1220))
    val glint = 0.55f + 0.45f * sin(TAU * p * 3)
    drawCircle(Color(0xFF67E8F9).copy(alpha = glint), 1.2f, Offset(26.5f, 30.3f))
    drawCircle(Color(0xFF67E8F9).copy(alpha = glint), 1.2f, Offset(37.5f, 30.3f))
    // Breathing holes and rivets.
    for ((x, y) in listOf(36.5f to 37f, 39.5f to 37f, 36.5f to 40f, 39.5f to 40f)) drawCircle(Color(0xFF1F2637), 0.85f, Offset(x, y))
    drawCircle(Color(0xFFE2E8F0), 1f, Offset(20.5f, 44f)); drawCircle(Color(0xFFE2E8F0), 1f, Offset(43.5f, 44f))
    drawCircle(Color(0xFFFBBF24), 0.9f, Offset(22.6f, 14.8f)); drawCircle(Color(0xFFFBBF24), 0.9f, Offset(41.4f, 14.8f))
    sweep(helm, p, 0.15f, 0.55f)
}

// ---- Gold Phoenix: wings, flame crest and tail, with rising embers -----------------------------

private fun DrawScope.goldPhoenix(p: Float) {
    val flap = sin(TAU * p)
    val pulse = 0.5f + 0.5f * sin(TAU * p * 2)
    val tile = circle(32f, 32f, 32f)
    drawPath(tile, Brush.radialGradient(listOf(Color(0xFF9A3412), Color(0xFF431407), Color(0xFF1C0A05)), Offset(32f, 34f), 42f))
    drawCircle(Brush.radialGradient(listOf(Color(0xAAFDE047), Color.Transparent), Offset(32f, 34f), 30f), 30f, Offset(32f, 34f), alpha = 0.55f + 0.45f * pulse)

    val px = 32f
    val py = 40f
    // Tail: three long feathers hanging below, shimmering in length.
    val tails = listOf(Triple(158f, 22f, 0f), Triple(202f, 22f, 1f), Triple(180f, 26f, 2f))
    for ((ang, len, k) in tails) {
        val l = len * (1f + 0.05f * sin(TAU * (p * 3 + k / 3f)))
        rotate(ang, Offset(px, py)) {
            drawPath(leaf(px, py, l, 4.2f), Brush.linearGradient(listOf(Color(0xFFFBBF24), Color(0xFFDC2626)), Offset(px, py), Offset(px, py - l)))
        }
    }
    // Wings: five feathers a side, flapping a little.
    val angles = floatArrayOf(112f, 90f, 68f, 47f, 28f)
    val lens = floatArrayOf(27f, 30f, 29f, 25f, 21f)
    for (side in 0 until 2) {
        val sgn = if (side == 0) -1f else 1f
        for (i in 0 until 5) {
            val a = sgn * (angles[i] + flap * 4f * (1f - i * 0.12f))
            rotate(a, Offset(px, py)) {
                val c1 = if (i < 3) Color(0xFFEF4444) else Color(0xFFF97316)
                val c2 = if (i < 3) Color(0xFF7F1D1D) else Color(0xFFFBBF24)
                drawPath(leaf(px, py, lens[i], 5.2f), Brush.linearGradient(listOf(c2, c1), Offset(px, py), Offset(px, py - lens[i])))
                drawLine(Color(0x55FFF7ED), Offset(px, py - 2f), Offset(px, py - lens[i] * 0.85f), 0.6f)
            }
        }
    }
    // Chest and head.
    drawOval(Brush.linearGradient(listOf(Color(0xFFFDE68A), Color(0xFFD97706)), Offset(24f, 30f), Offset(40f, 56f)), Offset(24f, 31f), Size(16f, 24f))
    for (i in 0 until 3) {
        val y = 44f + i * 4.2f
        drawPath(Path().apply { moveTo(28.5f, y); quadraticTo(32f, y + 2.6f, 35.5f, y) }, Color(0x77B45309), style = Stroke(0.9f, cap = StrokeCap.Round))
    }
    drawCircle(Brush.linearGradient(listOf(Color(0xFFFEF08A), Color(0xFFF59E0B)), Offset(24f, 25f), Offset(40f, 42f)), 9f, Offset(32f, 34f))
    // Flame crest.
    val crest = listOf(Triple(-20f, 11f, 0f), Triple(0f, 15f, 1f), Triple(20f, 11f, 2f))
    for ((ang, len, k) in crest) {
        val l = len * (1f + 0.12f * sin(TAU * (p * 4 + k / 3f)))
        rotate(ang, Offset(32f, 28f)) {
            drawPath(leaf(32f, 28f, l, 3.6f), Brush.linearGradient(listOf(Color(0xFFFEF08A), Color(0xFFEF4444)), Offset(32f, 28f), Offset(32f, 28f - l)))
        }
    }
    // Eyes and beak.
    for (ex in listOf(28.4f, 35.6f)) {
        drawCircle(Color(0xFF1F2637), 1.7f, Offset(ex, 33.2f))
        drawCircle(Color.White.copy(alpha = 0.92f), 0.6f, Offset(ex + 0.6f, 32.5f))
    }
    val beak = Path().apply { moveTo(29.4f, 36.6f); lineTo(34.6f, 36.6f); lineTo(32f, 43f); close() }
    drawPath(beak, Brush.linearGradient(listOf(Color(0xFFFB923C), Color(0xFFC2410C)), Offset(32f, 36f), Offset(32f, 43f)))
    drawLine(Color(0x66FFEDD5), Offset(32f, 37.4f), Offset(32f, 41f), 0.6f)
    // Embers lifting off.
    for (i in 0 until 7) {
        val seed = (i * 0.137f + 0.05f) % 1f
        val u = wrap(seed + p * (1 + i % 2))
        val x = 10f + 44f * ((i * 0.381f + 0.1f) % 1f) + 2.2f * sin(TAU * (p * 2 + seed))
        val y = 62f - 56f * u
        drawCircle(Color(0xFFFDE047).copy(alpha = (1f - u) * 0.9f), 0.7f + 0.8f * (1f - u), Offset(x, y))
    }
    sweep(tile, p, 0.0f, 0.4f, Color(0x33FFF7D6))
}

// ---- Diamond Legend: a crystal crown, ice-blue cape and a brooch gem --------------------------------

private fun DrawScope.diamondLegend(p: Float) {
    val tile = circle(32f, 32f, 32f)
    drawPath(tile, Brush.radialGradient(listOf(Color(0xFF3B2F8F), Color(0xFF191660), Color(0xFF0A0A2E)), Offset(32f, 28f), 42f))
    drawCircle(Brush.radialGradient(listOf(Color(0x7738BDF8), Color.Transparent), Offset(32f, 22f), 24f), 24f, Offset(32f, 22f), alpha = 0.6f + 0.4f * sin(TAU * p * 2))

    clipPath(tile) {
        // Cape with a fur collar.
        val cape = Path().apply { moveTo(4f, 68f); cubicTo(6f, 54f, 17f, 49f, 32f, 49f); cubicTo(47f, 49f, 58f, 54f, 60f, 68f); close() }
        drawPath(cape, Brush.verticalGradient(listOf(Color(0xFF93C5FD), Color(0xFF1D4ED8)), startY = 48f, endY = 66f))
        var x = 13f
        while (x <= 51f) {
            drawCircle(Color(0xFFF0F9FF), 3.3f, Offset(x, 50.4f + 0.8f * sin(x)))
            x += 5.4f
        }
        // The brooch: a brilliant-cut diamond.
        val gem = Path().apply { moveTo(26f, 55f); lineTo(29.5f, 51.5f); lineTo(34.5f, 51.5f); lineTo(38f, 55f); lineTo(32f, 63f); close() }
        drawPath(gem, Brush.linearGradient(listOf(Color(0xFFE0F2FE), Color(0xFF22D3EE)), Offset(26f, 51f), Offset(38f, 63f)))
        val e = Color(0x88FFFFFF)
        drawLine(e, Offset(26f, 55f), Offset(38f, 55f), 0.7f)
        drawLine(e, Offset(29.5f, 51.5f), Offset(30.5f, 55f), 0.6f); drawLine(e, Offset(34.5f, 51.5f), Offset(33.5f, 55f), 0.6f)
        drawLine(e, Offset(30.5f, 55f), Offset(32f, 63f), 0.6f); drawLine(e, Offset(33.5f, 55f), Offset(32f, 63f), 0.6f)
    }

    // Face with silver side-locks.
    val face = Path().apply {
        moveTo(20f, 26f); lineTo(44f, 26f); lineTo(44f, 35f); cubicTo(44f, 43f, 39f, 48.5f, 32f, 48.5f); cubicTo(25f, 48.5f, 20f, 43f, 20f, 35f); close()
    }
    drawPath(face, Brush.verticalGradient(listOf(Color(0xFFFFE0C8), Color(0xFFF0B591)), startY = 26f, endY = 48f))
    drawPath(Path().apply { moveTo(20f, 26f); lineTo(20f, 41f); quadraticTo(23.5f, 34f, 25f, 27f); close() }, Color(0xFFE2E8F0))
    drawPath(Path().apply { moveTo(44f, 26f); lineTo(44f, 41f); quadraticTo(40.5f, 34f, 39f, 27f); close() }, Color(0xFFE2E8F0))
    // Eyes with ice-blue irises, brows and a calm smile.
    for (ex in listOf(26.8f, 37.2f)) {
        drawCircle(Color(0xFF1F2637), 1.9f, Offset(ex, 35.6f))
        drawCircle(Color(0xFF38BDF8), 1.0f, Offset(ex, 35.9f))
        drawCircle(Color.White.copy(alpha = 0.92f), 0.6f, Offset(ex + 0.7f, 34.9f))
        drawLine(Color(0xFF94A3B8), Offset(ex - 2.6f, 32.2f), Offset(ex + 2.6f, 31.7f), 0.9f, StrokeCap.Round)
    }
    drawPath(Path().apply { moveTo(28.6f, 42.2f); quadraticTo(32f, 45.2f, 35.4f, 42.2f) }, Color(0xFF9A3412), style = Stroke(1.1f, cap = StrokeCap.Round))
    drawCircle(Color(0x33FB7185), 2.4f, Offset(24.6f, 40f)); drawCircle(Color(0x33FB7185), 2.4f, Offset(39.4f, 40f))

    // The crystal crown.
    val crown = Path().apply {
        moveTo(16.5f, 27f); lineTo(16.5f, 12f); lineTo(24.5f, 19.5f); lineTo(32f, 6.5f); lineTo(39.5f, 19.5f); lineTo(47.5f, 12f); lineTo(47.5f, 27f); close()
    }
    drawPath(crown, Brush.verticalGradient(listOf(Color(0xFFF0F9FF), Color(0xFF7DD3FC), Color(0xFF0EA5E9)), startY = 6f, endY = 27f))
    drawPath(crown, Color(0xFF0369A1), style = Stroke(0.8f))
    val f = Color(0x88FFFFFF)
    drawLine(f, Offset(24.5f, 19.5f), Offset(24.5f, 27f), 0.7f); drawLine(f, Offset(32f, 6.5f), Offset(32f, 27f), 0.7f); drawLine(f, Offset(39.5f, 19.5f), Offset(39.5f, 27f), 0.7f)
    drawLine(Color(0xFFFFFFFF), Offset(16.5f, 24.5f), Offset(47.5f, 24.5f), 1.4f)
    for ((gx, gy) in listOf(16.5f to 12f, 32f to 6.5f, 47.5f to 12f)) {
        drawCircle(Color(0xFF0EA5E9), 2.5f, Offset(gx, gy))
        drawCircle(Color.White, 1.6f, Offset(gx, gy))
    }
    sweep(crown, p, 0.1f, 0.5f)

    // Sparkles breathing in and out around the head.
    val spots = listOf(Offset(9f, 14f), Offset(55f, 17f), Offset(8f, 41f), Offset(56f, 38f), Offset(48f, 57f))
    for (i in spots.indices) {
        val tw = 0.5f + 0.5f * sin(TAU * (p * (2 + i % 2) + i * 0.21f))
        drawPath(spark(spots[i].x, spots[i].y, 1.6f + 2.6f * tw), Color(0xFFE0F2FE).copy(alpha = 0.35f + 0.65f * tw))
    }
}
