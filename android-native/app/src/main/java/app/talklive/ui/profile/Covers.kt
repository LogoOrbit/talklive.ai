package app.talklive.ui.profile

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.verticalScroll
import app.talklive.ui.components.fadeBottomEdge
import app.talklive.ui.components.verticalScrollbar
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import app.talklive.R
import app.talklive.ui.components.BrandGradient
import app.talklive.ui.theme.LocalReduceMotion
import kotlin.math.PI
import kotlin.math.floor
import kotlin.math.sin

/** A profile cover on offer (spec 4): its wire id and its name. */
data class CoverDef(val id: String, val name: Int)

val SOLID_COVERS = listOf(
    CoverDef("solid:ocean", R.string.cover_ocean), CoverDef("solid:sky", R.string.cover_sky), CoverDef("solid:mint", R.string.cover_mint),
    CoverDef("solid:sunset", R.string.cover_sunset), CoverDef("solid:rose", R.string.cover_rose), CoverDef("solid:slate", R.string.cover_slate),
)
val GRADIENT_COVERS = listOf(
    CoverDef("grad:dawn", R.string.cover_dawn), CoverDef("grad:lagoon", R.string.cover_lagoon), CoverDef("grad:berry", R.string.cover_berry),
    CoverDef("grad:forest", R.string.cover_forest), CoverDef("grad:peach", R.string.cover_peach), CoverDef("grad:night", R.string.cover_night),
)
val PLUS_COVERS = listOf(
    CoverDef("plus:aurora", R.string.cover_aurora), CoverDef("plus:galaxy", R.string.cover_galaxy), CoverDef("plus:waves", R.string.cover_waves),
    CoverDef("plus:neon", R.string.cover_neon), CoverDef("plus:sakura", R.string.cover_sakura), CoverDef("plus:fireflies", R.string.cover_fireflies),
)
private val ALL_COVERS = (SOLID_COVERS + GRADIENT_COVERS + PLUS_COVERS).map { it.id }.toSet()

fun isPlusCover(id: String?): Boolean = id != null && id.startsWith("plus:")

/** The cover to draw: a Plus cover is dropped while Plus is not active (spec 5); unknown ids draw the default. */
fun effectiveCover(id: String?, plusActive: Boolean): String? =
    id?.takeIf { it in ALL_COVERS && (plusActive || !isPlusCover(it)) }

private fun solidColor(id: String) = when (id) {
    "solid:ocean" -> Color(0xFF0EA5E9)
    "solid:sky" -> Color(0xFF7DD3FC)
    "solid:mint" -> Color(0xFF34D399)
    "solid:sunset" -> Color(0xFFFB923C)
    "solid:rose" -> Color(0xFFF472B6)
    else -> Color(0xFF64748B)
}

private fun gradientBrush(id: String): Brush = Brush.linearGradient(
    when (id) {
        "grad:dawn" -> listOf(Color(0xFFFB7185), Color(0xFFFDBA74), Color(0xFFFDE68A))
        "grad:lagoon" -> listOf(Color(0xFF2DD4BF), Color(0xFF0EA5E9), Color(0xFF6366F1))
        "grad:berry" -> listOf(Color(0xFFEC4899), Color(0xFF9333EA), Color(0xFF4338CA))
        "grad:forest" -> listOf(Color(0xFF86EFAC), Color(0xFF16A34A), Color(0xFF14532D))
        "grad:peach" -> listOf(Color(0xFFFECACA), Color(0xFFFDA4AF), Color(0xFFFB923C))
        else -> listOf(Color(0xFF0F172A), Color(0xFF312E81), Color(0xFF7C3AED))
    },
)

/**
 * A profile cover as a background: solids and gradients are plain, Plus covers
 * are drawn live (one slow loop, read only while drawing, so a frame never
 * recomposes). [animate] false (lists, previews) or reduced motion shows one
 * pretty still frame.
 */
@Composable
fun CoverBackground(cover: String?, modifier: Modifier = Modifier, animate: Boolean = true) {
    val id = cover?.takeIf { it in ALL_COVERS }
    when {
        id == null -> Box(modifier.background(BrandGradient))
        id.startsWith("solid:") -> Box(modifier.background(solidColor(id)))
        id.startsWith("grad:") -> Box(modifier.background(gradientBrush(id)))
        else -> AnimatedCover(id, modifier, animate)
    }
}

private const val PERIOD_MS = 24_000
private const val STILL = 0.19f
private const val TAU = (2 * PI).toFloat()

@Composable
private fun AnimatedCover(id: String, modifier: Modifier, animate: Boolean) {
    val reduce = LocalReduceMotion.current
    val phase = if (animate && !reduce) {
        rememberInfiniteTransition(label = "cover")
            .animateFloat(0f, 1f, infiniteRepeatable(tween(PERIOD_MS, easing = LinearEasing)), label = "phase")
    } else null
    Canvas(modifier.clipToBounds()) {
        val p = phase?.value ?: STILL
        when (id) {
            "plus:aurora" -> aurora(p)
            "plus:galaxy" -> galaxy(p)
            "plus:waves" -> waves(p)
            "plus:neon" -> neon(p)
            "plus:sakura" -> sakura(p)
            else -> fireflies(p)
        }
    }
}

// ---- Shared bits -------------------------------------------------------------

private fun wrap(v: Float) = v - floor(v)

/** The same 0..1 number for the same (i, k) every time, so particle layouts are stable across frames. */
private fun rnd(i: Int, k: Int): Float {
    val x = sin(i * 12.9898f + k * 78.233f) * 43758.547f
    return x - floor(x)
}

/** Twinkling stars in the top [span] of the picture; [cycles] twinkles per loop. */
private fun DrawScope.stars(n: Int, seed: Int, p: Float, cycles: Int, span: Float = 1f, tint: Color = Color.White) {
    val w = size.width
    val h = size.height
    for (i in 0 until n) {
        val a = 0.25f + 0.75f * (0.5f + 0.5f * sin(TAU * (p * (cycles + i % 3) + rnd(i, seed))))
        drawCircle(tint.copy(alpha = a), h * (0.006f + 0.010f * rnd(i, seed + 5)), Offset(rnd(i, seed + 1) * w, rnd(i, seed + 2) * h * span))
    }
}

// ---- Aurora: ribbons of green, teal and violet light over a night sky ---------

private fun DrawScope.aurora(p: Float) {
    val w = size.width
    val h = size.height
    drawRect(Brush.verticalGradient(listOf(Color(0xFF030A1C), Color(0xFF0A1B3D), Color(0xFF14315C))))
    stars(30, 1, p, 2, 0.6f)
    val cols = listOf(Color(0xFF34F5A8), Color(0xFF22D3EE), Color(0xFFA78BFA))
    val n = 28
    for (k in 0 until 3) {
        val path = Path()
        val base = h * (0.34f + 0.12f * k)
        for (i in 0..n) {
            val u = i.toFloat() / n
            val y = base + h * 0.10f * sin(TAU * (u * (1.2f + 0.4f * k) + p * (k + 1))) + h * 0.035f * sin(TAU * (u * 3f - p * 2))
            if (i == 0) path.moveTo(0f, y) else path.lineTo(w * u, y)
        }
        // A glow built from three widths of the same ribbon, widest faintest.
        for (pass in 0 until 3) {
            drawPath(path, cols[k].copy(alpha = 0.10f + 0.10f * pass), style = Stroke(h * (0.36f - 0.11f * pass), cap = StrokeCap.Round, join = StrokeJoin.Round))
        }
    }
}

// ---- Galaxy: a slow swirl, drifting nebula and twinkling stars -----------------

private fun DrawScope.galaxy(p: Float) {
    val w = size.width
    val h = size.height
    val c = Offset(w * 0.62f, h * 0.5f)
    drawRect(Brush.radialGradient(listOf(Color(0xFF3B1A78), Color(0xFF140A3A), Color(0xFF05030F)), c, w * 0.8f))
    val swirl = Brush.sweepGradient(
        0f to Color.Transparent, 0.12f to Color(0x80C4B5FD), 0.3f to Color.Transparent,
        0.55f to Color(0x66F472B6), 0.78f to Color.Transparent, 1f to Color.Transparent,
        center = c,
    )
    rotate(p * 360f, c) { drawCircle(swirl, h * 0.95f, c) }
    val breathe = 0.5f + 0.5f * sin(TAU * p * 2)
    val n1 = Offset(w * 0.2f, h * 0.7f)
    drawCircle(Brush.radialGradient(listOf(Color(0x80F472B6), Color.Transparent), n1, h * 1.0f), h * 1.0f, n1, 0.45f + 0.55f * breathe)
    val n2 = Offset(w * 0.9f, h * 0.15f)
    drawCircle(Brush.radialGradient(listOf(Color(0x8038BDF8), Color.Transparent), n2, h * 0.8f), h * 0.8f, n2, 0.9f - 0.5f * breathe)
    stars(70, 3, p, 3)
    // The galaxy's bright core.
    drawCircle(Brush.radialGradient(listOf(Color(0xCCFFF1C9), Color(0x55FBCFE8), Color.Transparent), c, h * 0.22f), h * 0.22f, c)
    // One shooting star each loop.
    val u = wrap(p * 2)
    if (u < 0.1f) {
        val t = u / 0.1f
        val x = w * (0.95f - 0.5f * t)
        val y = h * (0.06f + 0.4f * t)
        drawLine(Brush.linearGradient(listOf(Color.White, Color.Transparent), Offset(x, y), Offset(x + w * 0.12f, y - h * 0.22f)), Offset(x, y), Offset(x + w * 0.12f, y - h * 0.22f), h * 0.012f, StrokeCap.Round, alpha = 1f - t)
    }
}

// ---- Waves: layers of sea rolling under a pale sun --------------------------------

private fun DrawScope.waves(p: Float) {
    val w = size.width
    val h = size.height
    drawRect(Brush.verticalGradient(listOf(Color(0xFF7DD3FC), Color(0xFFE0F2FE))))
    drawCircle(Brush.radialGradient(listOf(Color(0xFFFFF7D6), Color(0x00FFF7D6)), Offset(w * 0.8f, h * 0.3f), h * 0.4f), h * 0.4f, Offset(w * 0.8f, h * 0.3f))
    drawCircle(Color(0xFFFEF3C7), h * 0.13f, Offset(w * 0.8f, h * 0.3f))
    val cols = listOf(Color(0xFF38BDF8), Color(0xFF0EA5E9), Color(0xFF0284C7), Color(0xFF075985))
    val n = 30
    for (k in 0 until 4) {
        val path = Path()
        val base = h * (0.46f + 0.15f * k)
        val amp = h * (0.05f + 0.012f * k)
        val dir = if (k % 2 == 0) 1 else -1
        for (i in 0..n) {
            val u = i.toFloat() / n
            val y = base + amp * sin(TAU * (u * (1.4f + 0.5f * k) + dir * p * (k + 1)))
            if (i == 0) path.moveTo(0f, y) else path.lineTo(w * u, y)
        }
        path.lineTo(w, h); path.lineTo(0f, h); path.close()
        drawPath(path, cols[k].copy(alpha = 0.88f))
    }
}

// ---- Neon: a synthwave sun over a rushing grid --------------------------------------

private fun DrawScope.neon(p: Float) {
    val w = size.width
    val h = size.height
    val hz = h * 0.52f
    drawRect(Brush.verticalGradient(listOf(Color(0xFF12002E), Color(0xFF3A0F6E), Color(0xFF12002E)), startY = 0f, endY = hz))
    val sunC = Offset(w / 2, hz - h * 0.02f)
    drawCircle(Brush.radialGradient(listOf(Color(0x66FF2E93), Color.Transparent), sunC, h * 0.55f), h * 0.55f, sunC)
    drawCircle(Brush.verticalGradient(listOf(Color(0xFFFFE66D), Color(0xFFFF2E93)), startY = hz - h * 0.34f, endY = hz), h * 0.3f, sunC)
    // Slits cut into the lower sun.
    for (i in 0 until 4) drawRect(Color(0xFF1A0640), Offset(w / 2 - h * 0.3f, hz - h * 0.02f - i * h * 0.05f), Size(h * 0.6f, h * (0.006f + 0.006f * (3 - i))))
    drawRect(Color(0xFF0B0220), Offset(0f, hz), Size(w, h - hz))
    val pink = Color(0xFFFF2E93)
    val cyan = Color(0xFF22D3EE)
    drawLine(pink.copy(alpha = 0.35f), Offset(0f, hz), Offset(w, hz), h * 0.03f)
    drawLine(pink, Offset(0f, hz), Offset(w, hz), 2f)
    for (i in -12..12) {
        drawLine(pink.copy(alpha = 0.85f), Offset(w / 2 + i * w * 0.012f, hz), Offset(w / 2 + i * w * 0.15f, h), 1.6f)
    }
    for (j in 0 until 9) {
        val t = (j + wrap(p * 3)) / 9f
        val y = hz + (h - hz) * t * t
        drawLine(cyan.copy(alpha = 0.2f + 0.7f * t), Offset(0f, y), Offset(w, y), 1f + 2f * t)
    }
}

// ---- Sakura: blossom branch and falling petals ------------------------------------------

private fun DrawScope.sakura(p: Float) {
    val w = size.width
    val h = size.height
    drawRect(Brush.verticalGradient(listOf(Color(0xFFFFE4EE), Color(0xFFFBB6CE), Color(0xFFE6A3D6))))
    drawCircle(Brush.radialGradient(listOf(Color(0x99FFFFFF), Color.Transparent), Offset(w * 0.75f, h * 0.2f), h * 0.7f), h * 0.7f, Offset(w * 0.75f, h * 0.2f))
    // The branch, swaying a touch.
    val sway = h * 0.012f * sin(TAU * p * 2)
    val branch = Path().apply {
        moveTo(-w * 0.02f, h * 0.22f)
        cubicTo(w * 0.12f, h * 0.10f + sway, w * 0.26f, h * 0.30f - sway, w * 0.46f, h * 0.07f + sway)
    }
    drawPath(branch, Color(0xFF6B3F2A), style = Stroke(h * 0.04f, cap = StrokeCap.Round))
    val spots = listOf(0.10f to 0.19f, 0.22f to 0.19f, 0.30f to 0.17f, 0.38f to 0.10f, 0.45f to 0.075f, 0.16f to 0.13f)
    for ((bx, by) in spots) {
        val c = Offset(w * bx, h * by + sway)
        for (k in 0 until 5) {
            val a = TAU * k / 5f
            drawCircle(Color(0xFFFFC2DA), h * 0.034f, Offset(c.x + h * 0.034f * kotlin.math.cos(a), c.y + h * 0.034f * sin(a)))
        }
        drawCircle(Color(0xFFFFF1F6), h * 0.022f, c)
        drawCircle(Color(0xFFF472B6), h * 0.008f, c)
    }
    val petal = Color(0xFFFF9EC4)
    for (i in 0 until 26) {
        val s = 0.7f + rnd(i, 3) * 0.8f
        val y = wrap(rnd(i, 2) + p * (1 + i % 3)) * (h * 1.2f) - h * 0.1f
        val x = wrap(rnd(i, 1) + 0.05f * sin(TAU * (p * (2 + i % 3) + rnd(i, 6)))) * w
        val u = h * 0.012f * s
        rotate(360f * (p * (1 + i % 2) + rnd(i, 4)), Offset(x, y)) {
            drawOval(petal.copy(alpha = 0.55f + 0.4f * rnd(i, 5)), Offset(x - u * 1.6f, y - u), Size(u * 3.2f, u * 2f))
        }
    }
}

// ---- Fireflies: warm sparks blinking over a dark meadow -----------------------------------

private fun DrawScope.fireflies(p: Float) {
    val w = size.width
    val h = size.height
    drawRect(Brush.verticalGradient(listOf(Color(0xFF031511), Color(0xFF0A2A22), Color(0xFF0F3A2B))))
    drawCircle(Brush.radialGradient(listOf(Color(0x33D9F99D), Color.Transparent), Offset(w * 0.2f, h * 0.2f), h * 0.6f), h * 0.6f, Offset(w * 0.2f, h * 0.2f))
    // Grass in front.
    val grass = Path()
    val blades = 26
    grass.moveTo(0f, h)
    for (i in 0..blades) {
        val x = w * i / blades
        val top = h * (0.80f - 0.12f * rnd(i, 9))
        grass.lineTo(x - w * 0.012f, h)
        grass.lineTo(x + w * 0.004f * sin(TAU * (p * 2 + rnd(i, 8))), top)
        grass.lineTo(x + w * 0.012f, h)
    }
    grass.lineTo(w, h); grass.close()
    for (i in 0 until 30) {
        val x = (rnd(i, 1) + 0.05f * sin(TAU * (p * (1 + i % 3) + rnd(i, 3)))) * w
        val y = (0.2f + 0.65f * rnd(i, 2) + 0.06f * sin(TAU * (p * (2 + i % 2) + rnd(i, 4)))) * h
        val blink = 0.5f + 0.5f * sin(TAU * (p * (2 + i % 4) + rnd(i, 5)))
        val a = blink * blink * blink
        val c = Offset(x, y)
        drawCircle(Brush.radialGradient(listOf(Color(0xFFD9F99D).copy(alpha = 0.75f * a), Color.Transparent), c, h * 0.09f), h * 0.09f, c)
        drawCircle(Color(0xFFFEF9C3).copy(alpha = 0.35f + 0.65f * a), h * 0.012f, c)
    }
    drawPath(grass, Color(0xFF03110C))
}

// ---- Picker -----------------------------------------------------------------------------------

/** All cover choices in three groups; Plus covers carry a lock and ask for Plus when it is not active. */
@OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
@Composable
fun CoverPicker(current: String?, plus: Boolean, onPick: (String) -> Unit, onLocked: () -> Unit, modifier: Modifier = Modifier) {
    // Two rows and a half-visible third, faded out at the bottom, with a scrollbar: more is clearly below.
    val scroll = androidx.compose.foundation.rememberScrollState()
    Column(
        modifier.fillMaxWidth().height(236.dp)
            .verticalScrollbar(scroll, thickness = 5.dp)
            .fadeBottomEdge(scroll)
            .verticalScroll(scroll),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        CoverGroup(R.string.cover_group_colors, SOLID_COVERS, current, plus, onPick, onLocked)
        CoverGroup(R.string.cover_group_gradients, GRADIENT_COVERS, current, plus, onPick, onLocked)
        CoverGroup(R.string.cover_group_plus, PLUS_COVERS, current, plus, onPick, onLocked)
        Spacer(Modifier.height(30.dp))
    }
}

@OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
@Composable
private fun CoverGroup(title: Int, covers: List<CoverDef>, current: String?, plus: Boolean, onPick: (String) -> Unit, onLocked: () -> Unit) {
    Column {
        Text(stringResource(title), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(bottom = 6.dp))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            covers.forEach { c ->
                val locked = isPlusCover(c.id) && !plus
                val on = c.id == current
                Column(Modifier.width(92.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(
                        Modifier.fillMaxWidth().height(58.dp).clip(RoundedCornerShape(14.dp))
                            .border(if (on) 2.5.dp else 1.dp, if (on) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(14.dp))
                            .clickable { app.talklive.sound.Tap.soft(); if (locked) onLocked() else onPick(c.id) },
                    ) {
                        // Only the chosen live cover moves; the rest are a still frame, so the picker stays light.
                        CoverBackground(c.id, Modifier.fillMaxSize(), animate = on && !locked)
                        if (locked) Box(
                            Modifier.align(Alignment.TopEnd).padding(5.dp).size(20.dp).clip(CircleShape).background(Color(0xFFF2C14E)),
                            contentAlignment = Alignment.Center,
                        ) { Icon(Icons.Rounded.Lock, null, tint = Color(0xFF2B1D00), modifier = Modifier.size(12.dp)) }
                        if (on) Box(
                            Modifier.align(Alignment.BottomEnd).padding(5.dp).size(20.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary),
                            contentAlignment = Alignment.Center,
                        ) { Icon(Icons.Rounded.Check, null, tint = Color.White, modifier = Modifier.size(13.dp)) }
                    }
                    Text(
                        stringResource(c.name), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface,
                        textAlign = TextAlign.Center, maxLines = 1, modifier = Modifier.padding(top = 3.dp),
                    )
                }
            }
        }
    }
}

