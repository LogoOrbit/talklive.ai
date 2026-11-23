package app.talklive.ui.profile

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.talklive.R
import app.talklive.ui.theme.LocalReduceMotion
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.pow
import kotlin.math.sin

/**
 * A cinematic or pixel-art cover (tools/covers): a picture, and what moves on it.
 * [fx] is the same list the website uses (public/covers.js ART_FX).
 */
@androidx.compose.runtime.Immutable
data class ArtCoverDef(val id: String, val pixel: Boolean, val name: String, val fx: String, val image: Int, val thumb: Int = image)

val ART_COVERS = listOf(
    ArtCoverDef("cin:misty", false, "Misty Ranges", "drift fog:0.6 motes", R.drawable.cover_cin_misty, R.drawable.cover_cin_misty_t),
    ArtCoverDef("cin:pines", false, "Cathedral Pines", "drift motes fog:0.86", R.drawable.cover_cin_pines, R.drawable.cover_cin_pines_t),
    ArtCoverDef("cin:tide", false, "Moonlit Tide", "drift twinkle:0.5 glints:0.62:0.98:0.06:0.4", R.drawable.cover_cin_tide, R.drawable.cover_cin_tide_t),
    ArtCoverDef("cin:peak", false, "Lone Peak", "drift snow", R.drawable.cover_cin_peak, R.drawable.cover_cin_peak_t),
    ArtCoverDef("plus:cin-nebula", false, "Orion Drift", "drift twinkle:1 shoot", R.drawable.cover_cin_nebula, R.drawable.cover_cin_nebula_t),
    ArtCoverDef("plus:cin-ringed", false, "Ringed Horizon", "drift twinkle:1 shoot", R.drawable.cover_cin_ringed, R.drawable.cover_cin_ringed_t),
    ArtCoverDef("plus:cin-aurora", false, "Northern Veil", "drift twinkle:0.55 shoot", R.drawable.cover_cin_aurora, R.drawable.cover_cin_aurora_t),
    ArtCoverDef("plus:cin-dunes", false, "Desert Dusk", "drift dust", R.drawable.cover_cin_dunes, R.drawable.cover_cin_dunes_t),
    ArtCoverDef("plus:cin-silk", false, "Silk Waves", "drift2", R.drawable.cover_cin_silk, R.drawable.cover_cin_silk_t),
    ArtCoverDef("plus:cin-prism", false, "Prism Light", "drift sparkle", R.drawable.cover_cin_prism, R.drawable.cover_cin_prism_t),
    ArtCoverDef("plus:cin-brutalist", false, "Brutalist Dawn", "drift dust", R.drawable.cover_cin_brutalist, R.drawable.cover_cin_brutalist_t),
    ArtCoverDef("plus:cin-skyline", false, "Skyline 2099", "drift twinkle:0.45 traffic", R.drawable.cover_cin_skyline, R.drawable.cover_cin_skyline_t),
    ArtCoverDef("plus:cin-rain", false, "Rain City", "drift rain", R.drawable.cover_cin_rain, R.drawable.cover_cin_rain_t),
    ArtCoverDef("plus:cin-alley", false, "Neon Alley", "drift rain fog:0.6", R.drawable.cover_cin_alley, R.drawable.cover_cin_alley_t),
    ArtCoverDef("plus:cin-isles", false, "Floating Isles", "drift motes", R.drawable.cover_cin_isles, R.drawable.cover_cin_isles_t),
    ArtCoverDef("plus:cin-golden", false, "Golden Sea", "drift glints:0.57:1:0.5:0.95", R.drawable.cover_cin_golden, R.drawable.cover_cin_golden_t),
    ArtCoverDef("plus:cin-eclipse", false, "Eclipse", "drift twinkle:1 shoot", R.drawable.cover_cin_eclipse, R.drawable.cover_cin_eclipse_t),
    ArtCoverDef("pix:voyage", true, "Isle Voyage", "glints:0.68:1:0:1", R.drawable.cover_pix_voyage),
    ArtCoverDef("pix:village", true, "Night Village", "twinkle:0.5 shoot", R.drawable.cover_pix_village),
    ArtCoverDef("pix:hills", true, "Sunset Hills", "motes", R.drawable.cover_pix_hills),
    ArtCoverDef("pix:cabin", true, "Snow Cabin", "snow", R.drawable.cover_pix_cabin),
    ArtCoverDef("plus:pix-metropolis", true, "Neon Metropolis", "twinkle:0.45 traffic", R.drawable.cover_pix_metropolis),
    ArtCoverDef("plus:pix-synth", true, "Synth Horizon", "twinkle:0.4 shoot", R.drawable.cover_pix_synth),
    ArtCoverDef("plus:pix-fireflies", true, "Firefly Woods", "fireflies twinkle:0.3", R.drawable.cover_pix_fireflies),
    ArtCoverDef("plus:pix-planetrise", true, "Planet Rise", "twinkle:1 shoot", R.drawable.cover_pix_planetrise),
    ArtCoverDef("plus:pix-rainstreet", true, "Rain Street", "rain", R.drawable.cover_pix_rainstreet),
    ArtCoverDef("plus:pix-arcade", true, "Arcade Night", "sparkle", R.drawable.cover_pix_arcade),
    ArtCoverDef("plus:pix-peaks", true, "Starry Peaks", "twinkle:0.6 shoot", R.drawable.cover_pix_peaks),
    ArtCoverDef("plus:pix-kingdom", true, "Crystal Kingdom", "twinkle:0.55 sparkle", R.drawable.cover_pix_kingdom),
    ArtCoverDef("plus:pix-oasis", true, "Desert Oasis", "glints:0.78:0.85:0.66:0.88 dust", R.drawable.cover_pix_oasis),
    ArtCoverDef("plus:pix-temple", true, "Cherry Temple", "petals", R.drawable.cover_pix_temple),
    ArtCoverDef("plus:pix-deepsea", true, "Deep Sea", "bubbles", R.drawable.cover_pix_deepsea),
    ArtCoverDef("plus:pix-volcano", true, "Volcano Isle", "embers:0.727:0.32", R.drawable.cover_pix_volcano),
)
val CINEMATIC_COVERS = ART_COVERS.filter { !it.pixel }
val PIXEL_ART_COVERS = ART_COVERS.filter { it.pixel }
private val ART_BY_ID = ART_COVERS.associateBy { it.id }
fun artCover(id: String?): ArtCoverDef? = id?.let { ART_BY_ID[it] }

private const val TAU = (2 * PI).toFloat()

/** One moving thing on a cover: its kind, its numbers ("glints:0.6:1"), and its particles. */
private class Fx(val kind: String, val a: List<Float>, val p: List<FloatArray>)

private fun makeFx(token: String, id: String, pixel: Boolean): Fx? {
    val parts = token.split(":")
    val kind = parts[0]
    val n = when (kind) {
        "twinkle" -> if (pixel) 36 else 80; "rain" -> if (pixel) 70 else 200; "snow" -> if (pixel) 60 else 130
        "fireflies" -> 22; "petals" -> if (pixel) 26 else 40; "bubbles" -> if (pixel) 22 else 30; "embers" -> if (pixel) 22 else 34
        "glints" -> if (pixel) 30 else 70; "motes" -> if (pixel) 16 else 34; "dust" -> if (pixel) 18 else 40
        "sparkle" -> if (pixel) 10 else 16; "traffic" -> if (pixel) 6 else 9; "fog" -> 4; "shoot" -> 1
        else -> return null
    }
    val r = kotlin.random.Random((id + kind).hashCode())
    // x, y, speed, phase, k
    return Fx(kind, parts.drop(1).mapNotNull { it.toFloatOrNull() }, List(n) { floatArrayOf(r.nextFloat(), r.nextFloat(), 0.5f + r.nextFloat(), r.nextFloat() * TAU, r.nextFloat()) })
}

private fun frac(v: Float) = v - floor(v)

/**
 * Draws the effects on a virtual frame (256x144 for pixel art, 1280x720 for
 * paintings) mapped onto the cover the way ContentScale.Crop maps the picture.
 */
private fun DrawScope.drawFx(list: List<Fx>, t: Float, pixel: Boolean) {
    val vw = if (pixel) 256f else 1280f
    val vh = if (pixel) 144f else 720f
    val s = max(size.width / vw, size.height / vh)
    val ox = (size.width - vw * s) / 2
    val oy = (size.height - vh * s) / 2
    val u = if (pixel) 1f else 2f
    fun dot(x: Float, y: Float, sz: Float, c: Color) {
        if (pixel) drawRect(c, Offset(ox + floor(x) * s, oy + floor(y) * s), Size(sz * s, sz * s))
        else drawCircle(c, sz * u * s, Offset(ox + x * s, oy + y * s))
    }
    fun line(x0: Float, y0: Float, x1: Float, y1: Float, c: Color, w: Float) =
        drawLine(c, Offset(ox + x0 * s, oy + y0 * s), Offset(ox + x1 * s, oy + y1 * s), w * s)
    val white = Color.White
    for (fx in list) {
        val a0 = fx.a.getOrNull(0); val a1 = fx.a.getOrNull(1); val a2 = fx.a.getOrNull(2); val a3 = fx.a.getOrNull(3)
        when (fx.kind) {
            "twinkle" -> for (q in fx.p) {
                val a = sin(t * (0.8f + q[2] * 1.6f) + q[3]); if (a < 0.25f) continue
                val x = q[0] * vw; val y = q[1] * vh * (a0 ?: 1f)
                dot(x, y, if (pixel) 1f else 0.7f + a * 0.6f, white.copy(alpha = a * 0.9f))
                if (a > 0.93f && q[4] < 0.35f) {
                    val c = white.copy(alpha = ((a - 0.9f) * 6).coerceIn(0f, 1f))
                    if (pixel) { dot(x - 1, y, 1f, c); dot(x + 1, y, 1f, c); dot(x, y - 1, 1f, c); dot(x, y + 1, 1f, c) }
                    else { line(x - 4 * u, y, x + 4 * u, y, c, 0.6f * u); line(x, y - 4 * u, x, y + 4 * u, c, 0.6f * u) }
                }
            }
            "shoot" -> {
                val cyc = floor(t / 7f); val ph = t / 7f - cyc
                if (ph <= 0.14f) {
                    val rr = kotlin.random.Random((cyc * 7919 + 13).toInt())
                    val sx = (0.3f + rr.nextFloat() * 0.65f) * vw; val sy = rr.nextFloat() * vh * 0.35f
                    val pr = ph / 0.14f; val hx = sx - pr * vw * 0.35f; val hy = sy + pr * vh * 0.22f
                    if (pixel) for (i in 0 until 14) dot(hx + i, hy - i * 0.6f, 1f, white.copy(alpha = 1 - i / 14f))
                    else {
                        val len = 140 * u
                        drawLine(
                            Brush.linearGradient(listOf(white.copy(alpha = 1 - pr), Color.Transparent), Offset(ox + hx * s, oy + hy * s), Offset(ox + (hx + len) * s, oy + (hy - len * 0.6f) * s)),
                            Offset(ox + hx * s, oy + hy * s), Offset(ox + (hx + len) * s, oy + (hy - len * 0.6f) * s), 1.4f * u * s,
                        )
                    }
                }
            }
            "rain" -> for (q in fx.p) {
                val y = (frac(q[1] + t * (0.9f + q[2] * 0.7f)) * 1.1f - 0.05f) * vh
                val x = (q[0] * vw + y * 0.2f) % vw
                if (pixel) { dot(x, y, 1f, if (q[4] < 0.5f) Color(0xFF9FB2D1) else Color(0xFF5A6B8A)); dot(x + 0.5f, y + 1, 1f, Color(0xFF5A6B8A)) }
                else line(x, y, x + 4 * u, y + (14 + q[4] * 16) * u, Color(0x52CDDCF0), 1.1f * u)
            }
            "snow" -> for (q in fx.p) {
                val y = frac(q[1] + t * 0.05f * q[2]) * vh; val x = (q[0] + sin(t * 0.7f + q[3]) * 0.012f) * vw
                dot(x, y, if (pixel) 1f else 0.8f + q[4] * 1.6f, white.copy(alpha = 0.55f + q[4] * 0.45f))
            }
            "fireflies" -> for (q in fx.p) {
                val a = max(0f, sin(t * (1 + q[2]) + q[3])); if (a < 0.1f) continue
                val x = (q[0] + sin(t * 0.3f * q[2] + q[3]) * 0.04f) * vw; val y = (0.4f + q[1] * 0.55f + cos(t * 0.25f + q[3]) * 0.03f) * vh
                dot(x, y, 1f, Color(0xFFF5F39A).copy(alpha = a))
                val hc = Color(0xFFC6E66A).copy(alpha = a * 0.45f)
                if (pixel) { dot(x - 1, y, 1f, hc); dot(x + 1, y, 1f, hc); dot(x, y - 1, 1f, hc); dot(x, y + 1, 1f, hc) }
                else drawCircle(hc, 4 * u * s, Offset(ox + x * s, oy + y * s))
            }
            "petals" -> fx.p.forEachIndexed { i, q ->
                val x = frac(q[0] + t * 0.025f * q[2]) * vw; val y = frac(q[1] + t * 0.045f * q[2]) * vh
                val c = listOf(Color(0xFFFF9BBB), Color(0xFFFFC2D4), Color(0xFFE8638F))[i % 3]
                dot(x, y, if (pixel) 1f else 2f, c)
                if (pixel && sin(t * 3 + q[3]) > 0) dot(x + 1, y, 1f, c)
            }
            "bubbles" -> for (q in fx.p) {
                val y = (1 - frac(q[1] + t * 0.05f * q[2])) * vh; val x = (q[0] + sin(t * 1.2f + q[3]) * 0.01f) * vw
                if (pixel) dot(x, y, if (q[4] < 0.3f) 2f else 1f, Color(0xFFBFF3FF))
                else drawCircle(Color(0x99BFF3FF), (1.5f + q[4] * 3) * u * s, Offset(ox + x * s, oy + y * s), style = androidx.compose.ui.graphics.drawscope.Stroke(u * s))
            }
            "embers" -> for (q in fx.p) {
                val life = frac(t * 0.18f * q[2] + q[4])
                val x = ((a0 ?: 0.5f) + (q[0] - 0.5f) * 0.18f * life + sin(t * 2 + q[3]) * 0.006f) * vw
                val y = ((a1 ?: 0.4f) - life * 0.4f) * vh
                dot(x, y, if (pixel) 1f else 1.2f, (if (q[4] < 0.5f) Color(0xFFFFB347) else Color(0xFFFFE08A)).copy(alpha = 1 - life))
            }
            "glints" -> for (q in fx.p) {
                val a = max(0f, sin(t * (1.5f + q[2] * 2) + q[3])).pow(4); if (a < 0.05f) continue
                val y0 = a0 ?: 0.6f; val y1 = a1 ?: 1f; val x0 = a2 ?: 0f; val x1 = a3 ?: 1f
                val x = (x0 + q[0] * (x1 - x0)) * vw; val y = (y0 + q[1] * (y1 - y0)) * vh
                val c = Color(0xFFFFF4D6).copy(alpha = a * if (pixel) 1f else 0.6f)
                if (pixel) drawRect(c, Offset(ox + floor(x) * s, oy + floor(y) * s), Size((2 + (q[4] * 3).toInt()) * s, s))
                else drawRect(c, Offset(ox + x * s, oy + y * s), Size((3 + q[4] * 8) * u * s, 1.4f * u * s))
            }
            "motes", "dust" -> for (q in fx.p) {
                val sp = if (fx.kind == "dust") 0.03f else 0.008f
                val x = frac(q[0] + t * sp * q[2]) * vw; val y = (q[1] + sin(t * 0.4f + q[3]) * 0.02f) * vh
                val a = 0.25f + 0.35f * (0.5f + 0.5f * sin(t + q[3]))
                dot(x, y, if (pixel) 1f else 1 + q[4] * 1.5f, (if (fx.kind == "dust") Color(0xFFFFD6A0) else Color(0xFFFFFAE1)).copy(alpha = a))
            }
            "sparkle" -> for (q in fx.p) {
                val a = max(0f, sin(t * (1.2f + q[2]) + q[3])).pow(10); if (a < 0.1f) continue
                val x = q[0] * vw; val y = q[1] * vh; val c = white.copy(alpha = a)
                if (pixel) { dot(x, y, 1f, c); if (a > 0.5f) { dot(x - 1, y, 1f, c); dot(x + 1, y, 1f, c); dot(x, y - 1, 1f, c); dot(x, y + 1, 1f, c) } }
                else { val z = (3 + q[4] * 6) * u * a; line(x - z, y, x + z, y, c, u); line(x, y - z, x, y + z, c, u) }
            }
            "traffic" -> for (q in fx.p) {
                val dir = if (q[4] < 0.5f) 1f else -1f
                val x = frac(q[0] + t * 0.04f * q[2] * dir) * vw; val y = (0.18f + q[1] * 0.3f) * vh
                val c = if (q[4] < 0.5f) Color(0xFF22D3EE) else Color(0xFFF472B6)
                if (pixel) { dot(x, y, 2f, c); dot(x - dir * 2, y, 1f, c.copy(alpha = 0.5f)) }
                else drawLine(
                    Brush.horizontalGradient(listOf(c, Color.Transparent), ox + x * s, ox + (x - dir * 40 * u) * s),
                    Offset(ox + x * s, oy + y * s), Offset(ox + (x - dir * 40 * u) * s, oy + y * s), 1.6f * u * s,
                )
            }
            "fog" -> if (!pixel) for (q in fx.p) {
                val x = (frac((q[0] + t * 0.006f * q[2]) / 1.4f) * 1.4f - 0.2f) * vw
                val y = (a0 ?: 0.6f) * vh + (q[1] - 0.5f) * vh * 0.12f
                val r = (0.25f + q[4] * 0.25f) * vw
                drawOval(
                    Brush.radialGradient(listOf(Color(0x1AFFFFFF), Color.Transparent), Offset(ox + x * s, oy + y * s), r * s),
                    Offset(ox + (x - r) * s, oy + (y - r * 0.25f) * s), Size(2 * r * s, 0.5f * r * s),
                )
            }
        }
    }
}

/**
 * An art cover, alive: the painting drifts slowly like a camera move and its
 * effects play on top; pixel art steps at 8 frames a second on its own grid.
 * [animate] false (lists) or reduced motion shows the still picture.
 */
@Composable
fun ArtCover(def: ArtCoverDef, modifier: Modifier = Modifier, animate: Boolean = true) {
    val live = animate && !LocalReduceMotion.current
    val time: State<Float>? = if (live) {
        rememberInfiniteTransition(label = "art").animateFloat(0f, 3600f, infiniteRepeatable(tween(3_600_000, easing = LinearEasing)), label = "t")
    } else null
    val fx = remember(def.id) { def.fx.split(" ").mapNotNull { makeFx(it, def.id, def.pixel) } }
    val drift = when { def.pixel -> 0f; "drift2" in def.fx -> 2f; "drift" in def.fx -> 1f; else -> 0f }
    Box(modifier.clipToBounds()) {
        Image(
            painterResource(if (live || def.pixel) def.image else def.thumb), contentDescription = null,
            contentScale = ContentScale.Crop,
            filterQuality = if (def.pixel) FilterQuality.None else FilterQuality.Medium,
            modifier = Modifier.fillMaxSize().graphicsLayer {
                if (drift > 0f && time != null) {
                    // Ease back and forth over 38s (26s for the stronger drift), never a hard jump.
                    val period = if (drift > 1f) 26f else 38f
                    val ph = (time.value % (2 * period)) / period
                    val e = (1 - cos((if (ph > 1) 2 - ph else ph) * PI.toFloat())) / 2
                    val strong = drift > 1f
                    val sc = if (strong) 1.10f + 0.08f * e else 1.06f + 0.07f * e
                    scaleX = sc; scaleY = sc
                    translationX = (if (strong) -0.03f + 0.06f * e else -0.016f + 0.032f * e) * size.width
                    translationY = (if (strong) 0.01f - 0.03f * e else 0.006f - 0.018f * e) * size.height
                }
            },
        )
        if (time != null && fx.isNotEmpty()) Canvas(Modifier.fillMaxSize()) {
            val t = if (def.pixel) floor(time.value * 8f) / 8f else time.value
            drawFx(fx, t, def.pixel)
        }
    }
}

/** A collection of art covers as 16:9 tiles, three to a row; the chosen one gets a ring and a tick. */
@Composable
fun ArtCoverGroup(title: Int, covers: List<ArtCoverDef>, current: String?, plus: Boolean, onPick: (String) -> Unit, onLocked: () -> Unit, previewLocked: Boolean) {
    Column {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 8.dp)) {
            Text(androidx.compose.ui.res.stringResource(title), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurface)
            Spacer(Modifier.size(6.dp))
            Text(androidx.compose.ui.res.stringResource(R.string.cover_animated_note), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
        }
        Column(Modifier.fillMaxWidth().padding(end = 12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            covers.chunked(3).forEach { row ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    row.forEach { c ->
                        val locked = isPlusCover(c.id) && !plus
                        val on = c.id == current
                        Box(
                            Modifier.weight(1f).aspectRatio(16f / 9f).clip(RoundedCornerShape(14.dp))
                                .border(if (on) 2.5.dp else 1.dp, if (on) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(14.dp))
                                .clickable { app.talklive.sound.Tap.soft(); if (locked && !previewLocked) onLocked() else onPick(c.id) },
                        ) {
                            ArtCover(c, Modifier.fillMaxSize(), animate = false)
                            Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Color(0x99000000)))))
                            Text(
                                c.name, color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold, maxLines = 1,
                                modifier = Modifier.align(Alignment.BottomStart).padding(start = 6.dp, bottom = 4.dp, end = 22.dp),
                            )
                            if (locked) Box(
                                Modifier.align(Alignment.TopEnd).padding(5.dp).size(18.dp).clip(CircleShape).background(Color(0xB80A0E1E)),
                                contentAlignment = Alignment.Center,
                            ) { Icon(Icons.Rounded.Lock, null, tint = Color(0xFFFFD166), modifier = Modifier.size(11.dp)) }
                            if (on) Box(
                                Modifier.align(Alignment.BottomEnd).padding(5.dp).size(18.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary),
                                contentAlignment = Alignment.Center,
                            ) { Icon(Icons.Rounded.Check, null, tint = Color.White, modifier = Modifier.size(12.dp)) }
                        }
                    }
                    repeat(3 - row.size) { Spacer(Modifier.weight(1f)) }
                }
            }
        }
    }
}
