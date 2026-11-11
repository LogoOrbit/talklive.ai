package app.talklive.ui.animals

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.drawscope.translate
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.sin

// Plus members' character avatars stand in a themed, slowly moving scene: the
// app's version of public/avatar-scenes.css, one scene per character, drawn
// behind the art (CharacterBare) and clipped to the avatar circle by the caller.
//
// Cost model: one Canvas-style draw per avatar (drawWithCache), one infinite
// transition per avatar, and the phase is read only in the draw lambda, so a
// frame never recomposes anything. Brushes, paths and particle tables are built
// once per size in the cache block; a frame only moves them with transforms, so
// nothing is allocated while it runs. The whole scene is one loop of PERIOD_MS
// and every layer repeats a whole number of times in it, so it never jumps.

private const val PERIOD_MS = 24_000
// A pretty frame of the loop, used for small avatars and reduced motion.
private const val STILL = 0.19f
private const val TAU = (2 * PI).toFloat()

private typealias SceneArt = DrawScope.(Float) -> Unit

/**
 * Draws [id]'s scene behind the content. A still picture when [animate] is
 * false (small avatars, or the user asked for less motion); ids without a scene
 * draw nothing.
 */
@Composable
fun Modifier.characterScene(id: String, animate: Boolean): Modifier {
    val phase = if (animate) {
        rememberInfiniteTransition(label = "scene")
            .animateFloat(0f, 1f, infiniteRepeatable(tween(PERIOD_MS, easing = LinearEasing)), label = "phase")
    } else null
    return drawWithCache {
        val art = sceneArt(id, size.minDimension)
        onDrawBehind { art?.invoke(this, phase?.value ?: STILL) }
    }
}

private fun sceneArt(id: String, s: Float): SceneArt? = when (id) {
    "c:astronaut" -> astronaut(s)
    "c:knight" -> knight(s)
    "c:queen" -> gold(s, Color(0xFF831843), Color(0xFFDB2777), Color(0xFF9D174D))
    "c:king" -> gold(s, Color(0xFF422006), Color(0xFFB8860B), Color(0xFF6B4A08))
    "c:wizard" -> wizard(s)
    "c:pirate" -> pirate(s)
    "c:detective" -> detective(s)
    "c:hero" -> hero(s)
    "c:cowboy" -> cowboy(s)
    "c:robot" -> robot(s)
    "c:vampire" -> vampire(s)
    "c:ninja" -> ninja(s)
    else -> null
}

// ---- Shared pieces ---------------------------------------------------------

private fun wrap(v: Float) = v - floor(v)

/** Same 0..1 number for the same (i, k) every time: particle tables are stable across redraws. */
private fun rnd(i: Int, k: Int): Float {
    val x = sin(i * 12.9898f + k * 78.233f) * 43758.547f
    return x - floor(x)
}

private class Dots(val n: Int, seed: Int) {
    val x = FloatArray(n) { rnd(it, seed) }
    val y = FloatArray(n) { rnd(it, seed + 7) }
    val r = FloatArray(n) { 0.55f + rnd(it, seed + 13) * 0.9f }
}

/** Round particles drifting by (dx, dy) fractions of the avatar, wrapping around; y spans [top, top + span]. */
private fun DrawScope.dots(
    d: Dots, color: Color, radius: Float, dx: Float, dy: Float,
    top: Float = 0f, span: Float = 1f, twinkle: Float = 0f, p: Float = 0f,
) {
    val w = size.width
    val h = size.height
    for (i in 0 until d.n) {
        val a = if (twinkle > 0f) 0.3f + 0.7f * (0.5f + 0.5f * sin(TAU * (p * twinkle + d.x[i]))) else 1f
        drawCircle(
            color, radius * d.r[i],
            Offset(wrap(d.x[i] + dx) * w, (top + wrap(d.y[i] + dy) * span) * h), a,
        )
    }
}

/** A soft round gradient (built once, centred on the origin) placed and squashed per frame. */
private fun DrawScope.soft(brush: Brush, r: Float, cx: Float, cy: Float, sy: Float = 1f, alpha: Float = 1f) {
    translate(cx, cy) { scale(1f, sy, Offset.Zero) { drawCircle(brush, r, Offset.Zero, alpha) } }
}

private fun glow(c: Color, r: Float) = Brush.radialGradient(listOf(c, Color.Transparent), Offset.Zero, r)

// ---- Astronaut: drifting stars over a slow nebula ---------------------------
private fun astronaut(s: Float): SceneArt {
    val bg1 = Brush.radialGradient(listOf(Color(0x8C7C3AED), Color.Transparent), Offset(s * 0.28f, s * 0.72f), s * 0.58f)
    val bg2 = Brush.radialGradient(listOf(Color(0x800E74BE), Color.Transparent), Offset(s * 0.78f, s * 0.26f), s * 0.55f)
    val nebula = glow(Color(0x61D946EF), s * 0.62f)
    val stars = Dots(26, 1)
    val star = Color(0xFFF1F5FF)
    return { p ->
        drawRect(Color(0xFF070A22))
        drawRect(bg1)
        drawRect(bg2)
        val breathe = 0.5f + 0.5f * sin(TAU * p * 2)
        soft(nebula, s * 0.62f, s * 0.5f, s * 0.5f, 1f, 0.45f + 0.55f * breathe)
        dots(stars, star, s * 0.011f, -p, 0f, twinkle = 3f, p = p)
    }
}

// ---- Knight: castle-banner red with rising embers ---------------------------
private fun knight(s: Float): SceneArt {
    val base = Brush.verticalGradient(0f to Color(0xFF991B1B), 1f to Color(0xFF450A0A), startY = 0f, endY = s)
    val near = Dots(14, 3)
    val far = Dots(9, 5)
    return { p ->
        drawRect(base)
        for (i in 0 until 6) drawRect(Color(0x24000000), Offset((i * 2 * 0.09f) * s, 0f), Size(s * 0.09f, s))
        dots(near, Color(0xFFFB923C), s * 0.017f, 0f, -p * 3, twinkle = 4f, p = p)
        dots(far, Color(0xFFFDE68A), s * 0.012f, 0f, -p * 2)
    }
}

// ---- Queen and King: gold shimmer sweep and sparkles ------------------------
private fun gold(s: Float, c1: Color, c2: Color, c3: Color): SceneArt {
    val base = Brush.linearGradient(0f to c1, 0.48f to c2, 1f to c3, start = Offset.Zero, end = Offset(s, s))
    val band = Brush.linearGradient(
        0f to Color.Transparent, 0.34f to Color.Transparent, 0.5f to Color(0x99FFF4C4), 0.66f to Color.Transparent, 1f to Color.Transparent,
        start = Offset(0f, 0f), end = Offset(s, s * 0.35f),
    )
    val sparks = Dots(9, 11)
    return { p ->
        drawRect(base)
        // Idle for most of each 6s turn, then one pass across the face.
        val u = wrap(p * 4)
        val t = if (u < 0.45f) 0f else (u - 0.45f) / 0.55f
        translate(-s + 2 * s * t, 0f) { drawRect(band, Offset.Zero, Size(s, s)) }
        dots(sparks, Color.White, s * 0.014f, 0f, 0f, twinkle = 7f, p = p)
    }
}

// ---- Wizard: purple swirl with floating sparkles ----------------------------
private fun wizard(s: Float): SceneArt {
    val base = Brush.radialGradient(listOf(Color(0xFF6D3FD6), Color(0xFF2A1466)), Offset(s / 2, s / 2), s * 0.72f)
    val swirl = Brush.sweepGradient(
        0f to Color.Transparent, 0.12f to Color(0x80C4B5FD), 0.3f to Color.Transparent,
        0.55f to Color(0x57F472B6), 0.78f to Color.Transparent, 1f to Color.Transparent,
        center = Offset(s / 2, s / 2),
    )
    val sparks = Dots(12, 17)
    return { p ->
        drawRect(base)
        rotate(p * 360f, Offset(s / 2, s / 2)) { drawCircle(swirl, s * 0.8f, Offset(s / 2, s / 2)) }
        dots(sparks, Color(0xFFFDE68A), s * 0.014f, 0f, -p * 2, twinkle = 5f, p = p)
    }
}

// ---- Pirate: sea under a warm sky, two bands of waves -----------------------
private fun wavePath(s: Float, base: Float, amp: Float): Path {
    val len = s * 0.5f
    return Path().apply {
        moveTo(0f, base)
        var x = 0f
        while (x <= s + len) { lineTo(x, base + amp * sin(TAU * x / len)); x += len / 12f }
        lineTo(s + len, s)
        lineTo(0f, s)
        close()
    }
}

private fun pirate(s: Float): SceneArt {
    val sky = Brush.verticalGradient(0f to Color(0xFF7DD3FC), 0.62f to Color(0xFFFDE68A), 1f to Color(0xFFFDE68A), startY = 0f, endY = s)
    val back = wavePath(s, s * 0.80f, s * 0.03f)
    val front = wavePath(s, s * 0.88f, s * 0.035f)
    val len = s * 0.5f
    return { p ->
        drawRect(sky)
        translate(-(1f - wrap(p * 4)) * len, 0f) { drawPath(back, Color(0xFF155E75)) }
        translate(-wrap(p * 3) * len, 0f) { drawPath(front, Color(0xFF0E7490)) }
    }
}

// ---- Detective: drifting fog under a street lamp ----------------------------
private fun detective(s: Float): SceneArt {
    val base = Brush.verticalGradient(0f to Color(0xFF475569), 1f to Color(0xFF1E293B), startY = 0f, endY = s)
    val lamp = Brush.radialGradient(listOf(Color(0x66FBBF24), Color.Transparent), Offset(s * 0.18f, s * 0.14f), s * 0.42f)
    val fog = glow(Color(0x6BE2E8F0), s * 0.45f)
    return { p ->
        drawRect(base)
        drawRect(lamp)
        // Banks of fog drift across and fade at the edges, so each one loops unseen.
        for (k in 0 until 2) {
            val a = wrap(p + 0.5f * k)
            soft(fog, s * 0.45f, (a * 1.4f - 0.2f) * s, s * (0.68f - 0.12f * k), 0.5f, sin(PI.toFloat() * a))
        }
        val back = wrap(0.3f - p * 2)
        soft(fog, s * 0.45f, (back * 1.4f - 0.2f) * s, s * 0.32f, 0.45f, 0.8f * sin(PI.toFloat() * back))
    }
}

// ---- Superhero: radial speed lines and a pulse -------------------------------
private fun hero(s: Float): SceneArt {
    val base = Brush.radialGradient(
        0f to Color(0xFFFDE047), 0.38f to Color(0xFFF97316), 1f to Color(0xFFB91C1C),
        center = Offset(s / 2, s / 2), radius = s * 0.72f,
    )
    val pulse = glow(Color.White, s * 0.5f)
    val cx = s / 2
    val cs = FloatArray(30) { cos(TAU * it / 30f) }
    val sn = FloatArray(30) { sin(TAU * it / 30f) }
    val r0 = s * 0.28f
    val r1 = s * 0.85f
    return { p ->
        drawRect(base)
        // Whole turns of one ray (12 degrees), so the lines never visibly jump.
        rotate(p * 60f, Offset(cx, cx)) {
            for (i in 0 until 30) {
                drawLine(Color(0x4DFFFFFF), Offset(cx + cs[i] * r0, cx + sn[i] * r0), Offset(cx + cs[i] * r1, cx + sn[i] * r1), s * 0.022f)
            }
        }
        val u = wrap(p * 9)
        translate(cx, cx) { scale(0.5f + 0.85f * u, Offset.Zero) { drawCircle(pulse, s * 0.5f, Offset.Zero, 0.7f * (1f - u)) } }
    }
}

// ---- Cowboy: sunset over the desert, blowing dust ----------------------------
private fun cowboy(s: Float): SceneArt {
    val sky = Brush.verticalGradient(
        0f to Color(0xFF6D28D9), 0.46f to Color(0xFFF97316), 0.63f to Color(0xFFFCD34D),
        0.635f to Color(0xFFA16207), 1f to Color(0xFF78350F), startY = 0f, endY = s,
    )
    val sun = Brush.radialGradient(listOf(Color(0xE6FEF3C7), Color(0x80FED7AA), Color.Transparent), Offset(s / 2, s * 0.62f), s * 0.34f)
    val dust = Dots(16, 23)
    val haze = glow(Color(0x6BFED7AA), s * 0.4f)
    return { p ->
        drawRect(sky)
        drawRect(sun)
        dots(dust, Color(0xCCFED7AA), s * 0.013f, p * 3, 0f, top = 0.5f, span = 0.5f)
        val drift = wrap(-p * 2)
        soft(haze, s * 0.4f, drift * 1.4f * s - s * 0.2f, s * 0.82f, 0.4f, sin(PI.toFloat() * drift))
    }
}

// ---- Robot: scanning grid and a circuit pulse --------------------------------
private fun robot(s: Float): SceneArt {
    val base = Brush.verticalGradient(0f to Color(0xFF0B2233), 1f to Color(0xFF07131F), startY = 0f, endY = s)
    val scan = Brush.verticalGradient(
        0f to Color.Transparent, 0.5f to Color(0x8022D3EE), 1f to Color.Transparent, startY = 0f, endY = s * 0.3f,
    )
    return { p ->
        drawRect(base)
        val line = Color(0xFF22D3EE).copy(alpha = 0.13f + 0.1f * (0.5f + 0.5f * sin(TAU * p * 6)))
        for (i in 1 until 8) {
            val v = s * i / 8f
            drawLine(line, Offset(v, 0f), Offset(v, s), 1f)
            drawLine(line, Offset(0f, v), Offset(s, v), 1f)
        }
        translate(0f, -s * 0.3f + wrap(p * 8) * s * 1.4f) { drawRect(scan, Offset.Zero, Size(s, s * 0.3f)) }
    }
}

// ---- Vampire: night sky, glowing moon, drifting bats --------------------------
private fun vampire(s: Float): SceneArt {
    val sky = Brush.verticalGradient(0f to Color(0xFF2E1065), 0.62f to Color(0xFF4C1D95), 1f to Color(0xFF7F1D1D), startY = 0f, endY = s)
    val moon = Brush.radialGradient(
        0f to Color(0xFFFEF9C3), 0.07f to Color(0xFFFEF08A), 0.14f to Color(0x47FEF08A), 0.34f to Color.Transparent,
        center = Offset(s * 0.78f, s * 0.2f), radius = s,
    )
    val halo = glow(Color(0x80FEF9C3), s * 0.3f)
    val bat = Path().apply {
        moveTo(14f, 4f); lineTo(16f, 6f); quadraticTo(21f, 0f, 28f, 2f); quadraticTo(24f, 4f, 24f, 9f)
        quadraticTo(21f, 6f, 19f, 10f); lineTo(14f, 13f); lineTo(9f, 10f); quadraticTo(7f, 6f, 4f, 9f)
        quadraticTo(4f, 4f, 0f, 2f); quadraticTo(7f, 0f, 12f, 6f); close()
    }
    val ink = Color(0xFF0B0618)
    return { p ->
        drawRect(sky)
        drawRect(moon)
        soft(halo, s * 0.3f, s * 0.78f, s * 0.2f, 1f, 0.45f + 0.55f * (0.5f + 0.5f * sin(TAU * p * 4)))
        val flap = 0.65f + 0.35f * abs(sin(TAU * p * 60))
        for (k in 0 until 2) {
            val w = s * (0.15f - 0.04f * k) / 28f
            val x = s * 1.2f - wrap(p * (2 + k) + 0.5f * k) * s * 1.5f
            val y = s * (0.24f + 0.34f * k) + s * 0.02f * sin(TAU * p * (24 + 6 * k))
            translate(x, y) { scale(w, w * flap, Offset.Zero) { drawPath(bat, ink) } }
        }
    }
}

// ---- Ninja: dark night with falling leaves and a flash of steel ---------------
private fun ninja(s: Float): SceneArt {
    val base = Brush.verticalGradient(0f to Color(0xFF111827), 1f to Color(0xFF020617), startY = 0f, endY = s)
    val moon = glow(Color(0x5994A3B8), s * 0.3f)
    val leaves = Dots(11, 29)
    val green = Color(0xFF65A30D)
    return { p ->
        drawRect(base)
        soft(moon, s * 0.3f, s * 0.8f, s * 0.18f)
        val fall = p * 2
        for (i in 0 until leaves.n) {
            val x = (leaves.x[i] + 0.03f * sin(TAU * (p * 6 + leaves.y[i]))) * s
            val y = wrap(leaves.y[i] + fall) * s
            rotate(40f * sin(TAU * (p * 4 + leaves.x[i])), Offset(x, y)) {
                drawOval(green.copy(alpha = 0.55f + 0.4f * leaves.r[i] / 1.45f), Offset(x - s * 0.02f, y - s * 0.01f), Size(s * 0.04f, s * 0.02f))
            }
        }
        // One quick diagonal slash every 8s.
        val u = wrap(p * 3)
        if (u in 0.90f..0.97f) {
            val t = (u - 0.90f) / 0.07f
            val a = 1f - abs(2f * t - 1f)
            val o = (t - 0.5f) * s * 0.2f
            drawLine(Color.White.copy(alpha = 0.9f * a), Offset(s * 0.1f + o, s * 0.2f), Offset(s * 0.9f + o, s * 0.8f), s * 0.014f)
        }
    }
}
