package app.talklive.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.material.icons.rounded.*

/*
 * TalkLive's own small illustrations, drawn in code (no emoji): the Plus gem,
 * the streak flame and the invite gift. Each scales cleanly to any size.
 */

private fun DrawScope.path(vararg pts: Pair<Float, Float>): Path = Path().apply {
    val w = size.width; val h = size.height
    pts.forEachIndexed { i, (x, y) -> if (i == 0) moveTo(x * w, y * h) else lineTo(x * w, y * h) }
    close()
}

/** The Plus gem: a cut diamond in ice blue and gold light, with facets. */
@Composable
fun PlusGem(size: Dp, modifier: Modifier = Modifier) {
    Canvas(modifier.size(size)) {
        // Crown (top) and pavilion (bottom) as separate facets.
        drawPath(path(0.22f to 0.14f, 0.78f to 0.14f, 0.98f to 0.38f, 0.02f to 0.38f), Color(0xFF9BE7FF))
        drawPath(path(0.22f to 0.14f, 0.40f to 0.14f, 0.32f to 0.38f, 0.02f to 0.38f), Color(0xFFC9F3FF))
        drawPath(path(0.60f to 0.14f, 0.78f to 0.14f, 0.98f to 0.38f, 0.68f to 0.38f), Color(0xFF6CCFF2))
        drawPath(path(0.40f to 0.14f, 0.60f to 0.14f, 0.68f to 0.38f, 0.32f to 0.38f), Color(0xFFE6FAFF))
        drawPath(path(0.02f to 0.38f, 0.32f to 0.38f, 0.50f to 0.94f), Color(0xFF4FB8E6))
        drawPath(path(0.32f to 0.38f, 0.68f to 0.38f, 0.50f to 0.94f), Color(0xFF7DD7F7))
        drawPath(path(0.68f to 0.38f, 0.98f to 0.38f, 0.50f to 0.94f), Color(0xFF2E9BD0))
        // A gold glint on the table.
        val s = this.size.minDimension
        drawCircle(Color(0xFFFFE08A), radius = s * 0.045f, center = Offset(this.size.width * 0.70f, this.size.height * 0.22f))
    }
}

/**
 * The streak flame. Lit: orange outer flame, golden core. Not lit yet today:
 * the same shape in quiet grey. Broken: grey with a crack.
 */
@Composable
fun StreakFlame(size: Dp, lit: Boolean = true, broken: Boolean = false, modifier: Modifier = Modifier) {
    Canvas(modifier.size(size)) {
        val w = this.size.width; val h = this.size.height
        val outer = Path().apply {
            moveTo(0.50f * w, 0.04f * h)
            cubicTo(0.66f * w, 0.22f * h, 0.88f * w, 0.36f * h, 0.86f * w, 0.62f * h)
            cubicTo(0.84f * w, 0.84f * h, 0.68f * w, 0.97f * h, 0.50f * w, 0.97f * h)
            cubicTo(0.30f * w, 0.97f * h, 0.14f * w, 0.84f * h, 0.14f * w, 0.62f * h)
            cubicTo(0.14f * w, 0.46f * h, 0.24f * w, 0.36f * h, 0.30f * w, 0.28f * h)
            cubicTo(0.32f * w, 0.40f * h, 0.38f * w, 0.46f * h, 0.42f * w, 0.46f * h)
            cubicTo(0.40f * w, 0.30f * h, 0.44f * w, 0.16f * h, 0.50f * w, 0.04f * h)
            close()
        }
        val inner = Path().apply {
            moveTo(0.52f * w, 0.42f * h)
            cubicTo(0.62f * w, 0.54f * h, 0.70f * w, 0.62f * h, 0.68f * w, 0.76f * h)
            cubicTo(0.66f * w, 0.88f * h, 0.58f * w, 0.93f * h, 0.50f * w, 0.93f * h)
            cubicTo(0.40f * w, 0.93f * h, 0.32f * w, 0.86f * h, 0.33f * w, 0.75f * h)
            cubicTo(0.34f * w, 0.64f * h, 0.44f * w, 0.58f * h, 0.52f * w, 0.42f * h)
            close()
        }
        if (lit && !broken) {
            drawPath(outer, Brush.verticalGradient(listOf(Color(0xFFFF8A3D), Color(0xFFE5481E)), 0f, h))
            drawPath(inner, Brush.verticalGradient(listOf(Color(0xFFFFE36E), Color(0xFFFFB43A)), 0.4f * h, h))
        } else {
            drawPath(outer, Color(0xFF8C93A8))
            drawPath(inner, Color(0xFFB7BCCB))
            if (broken) {
                val crack = Path().apply {
                    moveTo(0.54f * w, 0.22f * h); lineTo(0.44f * w, 0.48f * h); lineTo(0.58f * w, 0.60f * h); lineTo(0.46f * w, 0.90f * h)
                }
                drawPath(crack, Color(0xFF1B2033), style = Stroke(width = w * 0.07f, cap = StrokeCap.Round))
            }
        }
    }
}

/** The invite gift: a teal box, a gold ribbon and bow. */
@Composable
fun GiftIcon(size: Dp, modifier: Modifier = Modifier) {
    Canvas(modifier.size(size)) {
        val w = this.size.width; val h = this.size.height
        val r = CornerRadius(w * 0.08f, w * 0.08f)
        drawRoundRect(Color(0xFF14B8A6), topLeft = Offset(0.12f * w, 0.42f * h), size = Size(0.76f * w, 0.50f * h), cornerRadius = r)
        drawRoundRect(Color(0xFF2DD4BF), topLeft = Offset(0.06f * w, 0.30f * h), size = Size(0.88f * w, 0.16f * h), cornerRadius = r)
        drawRect(Color(0xFFF5C451), topLeft = Offset(0.44f * w, 0.30f * h), size = Size(0.12f * w, 0.62f * h))
        // Bow: two loops.
        drawOval(Color(0xFFF5C451), topLeft = Offset(0.24f * w, 0.10f * h), size = Size(0.26f * w, 0.22f * h), style = Stroke(width = w * 0.07f))
        drawOval(Color(0xFFF5C451), topLeft = Offset(0.50f * w, 0.10f * h), size = Size(0.26f * w, 0.22f * h), style = Stroke(width = w * 0.07f))
    }
}

/** A small round chip size for icons next to text. */
val IconInline: Dp = 14.dp

/** Material icon for each symbol the UI used to show as emoji. Flags and unknown text fall through as text. */
private val SymbolIcons: Map<String, androidx.compose.ui.graphics.vector.ImageVector> by lazy {
    val I = androidx.compose.material.icons.Icons.Rounded
    mapOf(
        "🤝" to I.Handshake,
        "💸" to I.MoneyOff, "🔁" to I.Replay, "🛡️" to I.Shield, "🔕" to I.NotificationsOff,
        "🚫" to I.Block, "🔒" to I.Lock, "🚩" to I.Flag, "🔞" to I.VerifiedUser,
        "🙈" to I.VisibilityOff, "💾" to I.Storage, "💳" to I.CreditCard, "🌍" to I.Public,
        "🕒" to I.Schedule, "💬" to I.Translate, "✨" to I.AutoAwesome, "🧊" to I.AcUnit,
        "🎯" to I.Interests, "💜" to I.Favorite, "🎮" to I.SportsEsports, "🔳" to I.GridOn,
        "❌⭕" to I.Tag, "🎬" to I.Movie, "⚡" to I.Bolt, "💡" to I.Lightbulb, "🎲" to I.Casino,
        "👨" to I.Male, "👩" to I.Female, "🙂" to I.SentimentSatisfied, "👍" to I.ThumbUp,
        "👎" to I.ThumbDown, "🏳️" to I.Flag,
    )
}

/** Draws [symbol] as a crisp icon in the theme's accent; a country flag stays as text. */
@Composable
fun SymbolIcon(symbol: String, size: Dp = 22.dp, tint: Color = Color.Unspecified, modifier: Modifier = Modifier) {
    val v = SymbolIcons[symbol]
    if (v == null) {
        androidx.compose.material3.Text(symbol, fontSize = androidx.compose.ui.unit.TextUnit(size.value * 0.8f, androidx.compose.ui.unit.TextUnitType.Sp), modifier = modifier)
    } else {
        androidx.compose.material3.Icon(
            v, null, modifier = modifier.size(size),
            tint = if (tint == Color.Unspecified) androidx.compose.material3.MaterialTheme.colorScheme.primary else tint,
        )
    }
}
