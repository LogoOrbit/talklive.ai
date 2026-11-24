package app.talklive.ui.game

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.talklive.R
import app.talklive.game.GameKind
import kotlinx.coroutines.delay
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

private const val LOOP_MS = 6000

/**
 * While the other person decides (or the board is on its way): a little board of the game
 * picked plays itself - marks draw in one by one, or lines and boxes fill - while two dots,
 * you and them, chase each other around it. The time waited counts up under the words.
 * Every frame is read in the draw pass only, so nothing recomposes while it moves; with
 * reduced motion it is a still board.
 */
@Composable
fun GameWaiting(kind: GameKind, partnerName: String, starting: Boolean) {
    val reduce = app.talklive.ui.theme.LocalReduceMotion.current
    val t = if (reduce) null else rememberInfiniteTransition(label = "wait")
        .animateFloat(0f, 1f, infiniteRepeatable(tween(LOOP_MS, easing = LinearEasing)), label = "t")
    val accent = MaterialTheme.colorScheme.primary
    val second = app.talklive.ui.theme.LocalAccents.current.b
    val line = MaterialTheme.colorScheme.onSurfaceVariant
    var seconds by remember { mutableIntStateOf(0) }
    LaunchedEffect(Unit) { while (true) { delay(1000); seconds++ } }

    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Canvas(Modifier.size(196.dp)) {
            val p = t?.value ?: 0.62f
            val board = size.minDimension * 0.62f
            val origin = Offset((size.width - board) / 2, (size.height - board) / 2)
            // The orbit: two dots chasing, with fading trails.
            val r = size.minDimension * 0.46f
            val c = center
            drawCircle(line.copy(alpha = 0.12f), r, c, style = Stroke(1.5.dp.toPx()))
            for (k in 0 until 2) {
                val base = p * 2f * PI.toFloat() + k * PI.toFloat()
                val col = if (k == 0) accent else second
                for (tail in 0 until 6) {
                    val a = base - tail * 0.13f
                    drawCircle(col.copy(alpha = (1f - tail / 6f) * 0.8f), (6.dp.toPx()) * (1f - tail * 0.12f), Offset(c.x + r * cos(a), c.y + r * sin(a)))
                }
            }
            // A soft breathing glow behind the board.
            val glow = 0.5f + 0.5f * sin(p * 4f * PI.toFloat())
            drawCircle(accent.copy(alpha = 0.06f + 0.06f * glow), board * 0.72f, c)
            if (kind == GameKind.Dots) dotsGhost(origin, board, p, accent, second, line) else tttGhost(origin, board, p, accent, second, line)
        }
        Spacer(Modifier.height(12.dp))
        // Dots after the words, one more each second.
        val dots = ".".repeat(1 + seconds % 3)
        Text(
            stringResource(if (starting) R.string.game_starting else R.string.game_waiting, partnerName).trimEnd('…', '.') + dots,
            style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground,
        )
        if (!starting) {
            Spacer(Modifier.height(4.dp))
            Text(
                "%d:%02d".format(seconds / 60, seconds % 60),
                style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

/** Tic Tac Toe playing itself: six marks draw in, in turn, then the board clears softly. */
private fun DrawScope.tttGhost(o: Offset, s: Float, p: Float, x: Color, oColor: Color, line: Color) {
    val cell = s / 3f
    val w = 3.dp.toPx()
    for (i in 1..2) {
        drawLine(line.copy(alpha = 0.45f), Offset(o.x + cell * i, o.y), Offset(o.x + cell * i, o.y + s), w, StrokeCap.Round)
        drawLine(line.copy(alpha = 0.45f), Offset(o.x, o.y + cell * i), Offset(o.x + s, o.y + cell * i), w, StrokeCap.Round)
    }
    val moves = intArrayOf(4, 0, 8, 2, 6, 3)
    val fadeOut = if (p > 0.88f) 1f - (p - 0.88f) / 0.12f else 1f
    moves.forEachIndexed { k, at ->
        val start = k * 0.13f
        val prog = ((p - start) / 0.1f).coerceIn(0f, 1f)
        if (prog <= 0f) return@forEachIndexed
        val cx = o.x + cell * (at % 3) + cell / 2
        val cy = o.y + cell * (at / 3) + cell / 2
        val m = cell * 0.28f
        val stroke = 5.dp.toPx()
        if (k % 2 == 0) {
            // An X, its two strokes drawn in one after the other.
            val a = (prog * 2f).coerceAtMost(1f)
            val b = (prog * 2f - 1f).coerceIn(0f, 1f)
            drawLine(x.copy(alpha = fadeOut), Offset(cx - m, cy - m), Offset(cx - m + 2 * m * a, cy - m + 2 * m * a), stroke, StrokeCap.Round)
            if (b > 0f) drawLine(x.copy(alpha = fadeOut), Offset(cx + m, cy - m), Offset(cx + m - 2 * m * b, cy - m + 2 * m * b), stroke, StrokeCap.Round)
        } else {
            // An O, drawn round.
            drawArc(oColor.copy(alpha = fadeOut), -90f, 360f * prog, false, Offset(cx - m, cy - m), Size(2 * m, 2 * m), style = Stroke(stroke, cap = StrokeCap.Round))
        }
    }
}

/** Dots & Boxes playing itself: lines draw in around a box, which then fills, twice. */
private fun DrawScope.dotsGhost(o: Offset, s: Float, p: Float, a: Color, b: Color, line: Color) {
    val n = 3
    val gap = s / n
    val fadeOut = if (p > 0.88f) 1f - (p - 0.88f) / 0.12f else 1f
    // Lines: (from dot, to dot) in drawing order, closing the top-left box then the centre one.
    val edges = listOf(
        intArrayOf(0, 0, 1, 0), intArrayOf(0, 0, 0, 1), intArrayOf(1, 0, 1, 1), intArrayOf(0, 1, 1, 1),
        intArrayOf(1, 1, 2, 1), intArrayOf(2, 1, 2, 2), intArrayOf(1, 1, 1, 2), intArrayOf(1, 2, 2, 2),
    )
    val stroke = 4.dp.toPx()
    edges.forEachIndexed { k, e ->
        val prog = ((p - k * 0.085f) / 0.07f).coerceIn(0f, 1f)
        if (prog <= 0f) return@forEachIndexed
        val col = (if (k < 4) a else b).copy(alpha = fadeOut)
        val from = Offset(o.x + gap * e[0], o.y + gap * e[1])
        val to = Offset(o.x + gap * e[2], o.y + gap * e[3])
        drawLine(col, from, Offset(from.x + (to.x - from.x) * prog, from.y + (to.y - from.y) * prog), stroke, StrokeCap.Round)
    }
    // A closed box fills in its player's colour, with a little pop.
    fun box(col: Int, row: Int, at: Float, color: Color) {
        val fill = ((p - at) / 0.08f).coerceIn(0f, 1f)
        if (fill <= 0f) return
        val pop = 1f + 0.12f * sin(fill * PI.toFloat())
        val inset = gap * 0.14f
        val side = (gap - 2 * inset) * pop
        val cx = o.x + gap * col + gap / 2
        val cy = o.y + gap * row + gap / 2
        rotate(0f, Offset(cx, cy)) {
            drawRoundRect(color.copy(alpha = 0.55f * fill * fadeOut), Offset(cx - side / 2, cy - side / 2), Size(side, side), androidx.compose.ui.geometry.CornerRadius(6.dp.toPx()))
        }
    }
    box(0, 0, 0.36f, a)
    box(1, 1, 0.70f, b)
    // The dots on top.
    for (i in 0..n) for (j in 0..n) drawCircle(line.copy(alpha = 0.85f), 4.dp.toPx(), Offset(o.x + gap * i, o.y + gap * j))
}
