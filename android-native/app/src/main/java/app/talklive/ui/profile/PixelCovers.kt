package app.talklive.ui.profile

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.sin
import kotlin.math.sqrt

/**
 * The 8-bit Plus covers: pixel art on a grid 36 cells tall, 8 frames a second on a
 * 480-frame loop. The website draws the same scenes (public/covers.js, PX), so a
 * cover looks the same on both.
 */
internal const val PX_ROWS = 36
internal const val PX_LOOP = 480

internal val PIXEL_COVER_IDS = listOf("plus:pxcity", "plus:pxdrive", "plus:pxforest", "plus:pxspace", "plus:pxsea")

fun isPixelCover(id: String?) = id != null && id.startsWith("plus:px")

private fun hash(a: Int, b: Int): Float {
    var h = a * 374761393 + b * 668265263
    h = (h xor (h ushr 13)) * 1274126177
    h = h xor (h ushr 16)
    return ((h.toLong() and 0xffffffffL).toDouble() / 4294967296.0).toFloat()
}

private fun mod(a: Int, n: Int) = ((a % n) + n) % n
private fun round(v: Double) = floor(v + 0.5).toInt()
private fun hex(v: Long) = Color(0xFF000000 or v)

/** Draws into cells: x, y, w, h are grid units. */
private class Px(val scope: DrawScope, val cell: Float) {
    fun r(x: Int, y: Int, w: Int, h: Int, c: Color) {
        if (w <= 0 || h <= 0) return
        // A hair of overlap so neighbouring cells never show a seam.
        scope.drawRect(c, Offset(x * cell, y * cell), Size(w * cell + 0.6f, h * cell + 0.6f))
    }
}

private fun Px.bands(colors: List<Color>, y0: Int, rows: Int, cols: Int) {
    val n = colors.size
    for (i in 0 until n) {
        val a = y0 + floor(i * rows.toDouble() / n).toInt()
        val b = y0 + floor((i + 1) * rows.toDouble() / n).toInt()
        r(0, a, cols, b - a, colors[i])
    }
}

private val StarBlue = hex(0xBFE3FF)
private fun Px.stars(cols: Int, rows: Int, t: Int, density: Float, seed: Int) {
    for (y in 0 until rows) for (x in 0 until cols) {
        if (hash(x + seed, y * 7) < density && hash(x, y + (t / 4) * 3 + seed) > 0.25f) r(x, y, 1, 1, if (hash(x, y) < 0.3f) StarBlue else Color.White)
    }
}

private fun Px.disc(cx: Int, cy: Int, rad: Int, color: (Int) -> Color) {
    for (y in cy - rad..cy + rad) {
        val w = floor(sqrt(max(0.0, (rad * rad - (y - cy) * (y - cy)).toDouble())) + 0.3).toInt()
        r(cx - w, y, w * 2 + 1, 1, color(y))
    }
}

/** Paints pixel cover [id] at frame [t] (0 until [PX_LOOP]). */
internal fun DrawScope.pixelCover(id: String, t: Int) {
    val cell = size.height / PX_ROWS
    if (cell <= 0f) return
    val cols = max(12, ceil(size.width / cell).toInt())
    val p = Px(this, cell)
    when (id) {
        "plus:pxdrive" -> p.drive(cols, t)
        "plus:pxforest" -> p.forest(cols, t)
        "plus:pxspace" -> p.space(cols, t)
        "plus:pxsea" -> p.sea(cols, t)
        else -> p.city(cols, t)
    }
}

private fun Px.city(c: Int, t: Int) {
    bands(listOf(hex(0x1B0A3C), hex(0x2A0F55), hex(0x43136B), hex(0x64197A), hex(0x8C2381), hex(0xB8317F)), 0, 24, c)
    stars(c, 12, t, 0.03f, 1)
    val cx = c / 2; val cy = 21; val rad = 9
    for (y in cy - rad..31) {
        if (y >= cy - 2 && mod(y + t / 3, 3) == 0) continue
        val w = floor(sqrt(max(0.0, (rad * rad - (y - cy) * (y - cy)).toDouble())) + 0.3).toInt()
        val f = (y - (cy - rad)) / (2.0 * rad)
        r(cx - w, y, w * 2 + 1, 1, if (f < 0.34) hex(0xFFE66D) else if (f < 0.67) hex(0xFFA24C) else hex(0xFF5F8F))
    }
    val back = hex(0x2B1457)
    val off = t / 2
    for (x in 0 until c) {
        val wc = mod(x + off, 240); val b = wc / 5
        val h = 5 + floor(hash(b, 11) * 10.0).toInt()
        r(x, 32 - h, 1, h, back)
        if (wc % 5 == 2 && hash(b, 3) > 0.5f) r(x, 32 - h - 2, 1, 2, back)
    }
    val front = hex(0x140A2E); val warm = hex(0xFFD36E); val cyan = hex(0x6EF0FF)
    for (x in 0 until c) {
        val wc = mod(x + t, 480); val b = wc / 7; val i = wc % 7
        if (i == 6) continue
        val h = 6 + floor(hash(b, 23) * 13.0).toInt()
        val top = 33 - h
        r(x, top, 1, h, front)
        if (i % 2 == 1) {
            var yy = top + 2
            while (yy < 32) {
                if (hash(b * 13 + i, yy) > 0.45f && hash(b + i, yy * 3 + t / 24) > 0.1f) r(x, yy, 1, 1, if (hash(b, i) > 0.7f) cyan else warm)
                yy += 2
            }
        }
    }
    r(0, 33, c, 3, hex(0x0B0620))
    r(0, 33, c, 1, hex(0xFF3FA4))
}

private fun Px.drive(c: Int, t: Int) {
    bands(listOf(hex(0x0D0221), hex(0x1A0538), hex(0x2E0854), hex(0x4B0D6B), hex(0x7A1279)), 0, 20, c)
    stars(c, 10, t, 0.03f, 9)
    val cx = c / 2; val cy = 15; val rad = 10
    for (y in cy - rad..19) {
        if (y >= cy && mod(y + t / 4, 3) == 0) continue
        val w = floor(sqrt(max(0.0, (rad * rad - (y - cy) * (y - cy)).toDouble())) + 0.3).toInt()
        val f = (y - (cy - rad)) / rad.toDouble()
        r(cx - w, y, w * 2 + 1, 1, if (f < 0.4) hex(0xFFD319) else if (f < 0.75) hex(0xFF901F) else hex(0xFF2975))
    }
    val off = t / 4
    val hill = hex(0x2B0F4C); val ridge = hex(0xC03BD6)
    for (x in 0 until c) {
        val wc = mod(x + off, 120)
        val m = 2 + round(3 * (0.5 + 0.5 * sin(2 * PI * 5 * wc / 120)) + 2 * (0.5 + 0.5 * sin(2 * PI * 3 * wc / 120 + 1)))
        r(x, 20 - m, 1, m, hill)
        r(x, 20 - m, 1, 1, ridge)
    }
    r(0, 20, c, 16, hex(0x12002B))
    val ph = (t % 8) / 8.0
    val line = hex(0xFF2BD6)
    for (k in 0 until 12) {
        val ly = 20 + floor((k + ph) * (k + ph) * 0.3).toInt()
        if (ly < 36) r(0, ly, c, 1, line)
    }
    val vline = hex(0xC11FB0)
    for (yy in 21 until 36) {
        val d = yy - 20
        for (j in -12..12) r(cx + round(j * (3 + d * 1.6)), yy, 1, 1, vline)
    }
}

private fun Px.forest(c: Int, t: Int) {
    bands(listOf(hex(0x071327), hex(0x0B1D3A), hex(0x10284D), hex(0x163560), hex(0x1D4370), hex(0x25507C), hex(0x2E5D86)), 0, 30, c)
    stars(c, 14, t, 0.025f, 17)
    val mx = floor(c * 0.78).toInt()
    disc(mx, 7, 4) { hex(0xF4F1C9) }
    val crater = hex(0xD9D4A0)
    r(mx - 2, 6, 1, 1, crater); r(mx + 1, 8, 2, 1, crater); r(mx, 4, 1, 1, crater)
    val backPine = hex(0x123049)
    var off = t / 4
    for (x in 0 until c) {
        val wc = mod(x + off, 120); val b = wc / 6; val i = wc % 6
        val th = 8 + floor(hash(b, 5) * 7.0).toInt()
        val h = th - floor(abs(i - 2.5) * 2.4).toInt()
        if (h > 0) r(x, 31 - h, 1, h, backPine)
    }
    r(0, 31, c, 5, hex(0x081923))
    off = t / 2
    val trunk = hex(0x2A1A10); val pine = hex(0x061620); val needle = hex(0x0D2A36)
    for (x in 0 until c) {
        val wc = mod(x + off, 240); val b = wc / 8; val i = wc % 8
        val th = 12 + floor(hash(b, 29) * 9.0).toInt()
        val h = th - floor(abs(i - 3.5) * 3).toInt()
        if (i == 3 || i == 4) r(x, 33, 1, 3, trunk)
        if (h > 0) r(x, 34 - h, 1, h - 1, pine)
        if (h > 0 && abs(i - 3.5) < 3 && (34 - h + i) % 4 == 0) r(x, 34 - h + 1, 1, 1, needle)
    }
    val glow = hex(0xD9FF6B).copy(alpha = 0.28f); val fly = hex(0xEAFF8F)
    for (n in 0 until 14) {
        val fx = mod(floor(hash(n, 1) * c + t * (hash(n, 2) - 0.5) * 0.5).toInt(), c)
        val fy = 16 + floor(hash(n, 3) * 16 + sin(t * 0.13 + n) * 1.5).toInt()
        if (sin(t * 0.21 + n * 1.7) > -0.2) {
            r(fx - 1, fy, 3, 1, glow); r(fx, fy - 1, 1, 3, glow)
            r(fx, fy, 1, 1, fly)
        }
    }
}

private val ShipArt = listOf(".##....", "#####..", "#######", "#####..", ".##....")

private fun Px.space(c: Int, t: Int) {
    bands(listOf(hex(0x05010F), hex(0x0A0420), hex(0x120830), hex(0x160A3A), hex(0x120830), hex(0x0A0420), hex(0x05010F)), 0, 36, c)
    val speeds = intArrayOf(4, 2, 1); val dens = floatArrayOf(0.02f, 0.012f, 0.007f)
    val colors = listOf(hex(0x5A5F8A), hex(0xA7B4FF), Color.White)
    for (k in 0 until 3) {
        val w = PX_LOOP / speeds[k]; val off = t / speeds[k]
        for (y in 0 until 36) for (x in 0 until c) {
            val wc = mod(x + off, w)
            if (hash(wc + k * 1000, y * 31 + k) < dens[k]) r(x, y, if (k == 2) 2 else 1, 1, colors[k])
        }
    }
    val pcx = floor(c * 0.24).toInt(); val pcy = 18; val pr = 8
    val ringBack = hex(0xF6D6A8); val ringShade = hex(0xE9C08C)
    for (rx in -15..15) { val ry = pcy + round(rx * 0.28); if (rx < 0) r(pcx + rx, ry, 1, 2, ringBack) }
    disc(pcx, pcy, pr) { yy ->
        val f = (yy - (pcy - pr)) / (2.0 * pr)
        if (f < 0.3) hex(0xF2A65A) else if (f < 0.55) hex(0xE08A52) else if (f < 0.8) hex(0xC9604A) else hex(0x9E4A4A)
    }
    r(pcx - 4, pcy - 5, 3, 1, hex(0xF7C28A))
    for (rx in -15..15) { val ry = pcy + round(rx * 0.28); if (rx >= 0 || abs(rx) > pr) r(pcx + rx, ry, 1, 2, if (rx > pr) ringBack else ringShade) }
    val sx = floor(c * 0.64).toInt(); val sy = 15 + round(sin(t * 0.2) * 1.5)
    val hull = hex(0xCFD8FF)
    for (row in ShipArt.indices) for (col in 0 until 7) if (ShipArt[row][col] == '#') r(sx + col, sy + row, 1, 1, hull)
    r(sx + 4, sy + 2, 1, 1, hex(0x6EF0FF))
    r(sx - 1, sy + 1, 1, 3, if (t % 2 == 1) hex(0xFFB347) else hex(0xFF5E3A))
    val longFlame = t % 3 == 0
    r(sx - 2 - (if (longFlame) 1 else 0), sy + 2, 1 + (if (longFlame) 1 else 0), 1, hex(0xFFD36E))
}

private fun Px.sea(c: Int, t: Int) {
    bands(listOf(hex(0x2D6CDF), hex(0x4A86E8), hex(0x6FA3EF), hex(0x9BC1F3), hex(0xFFC9A6)), 0, 20, c)
    disc(floor(c * 0.8).toInt(), 12, 4) { hex(0xFFE08A) }
    val shade = hex(0xDBE8FF)
    var off = t / 4
    for (x in 0 until c) {
        val wc = mod(x + off, 120); val cid = wc / 30; val i = wc % 30
        if (hash(cid, 7) < 0.25f) continue
        val y0 = 2 + floor(hash(cid, 8) * 8.0).toInt(); val len = 10 + floor(hash(cid, 9) * 12.0).toInt()
        if (i >= len) continue
        if (i > 2 && i < len - 3) r(x, y0, 1, 1, Color.White)
        r(x, y0 + 1, 1, 1, Color.White)
        if (i > 0 && i < len - 1) r(x, y0 + 2, 1, 1, shade)
    }
    bands(listOf(hex(0x1B6FD1), hex(0x1862BD), hex(0x1556A8), hex(0x124A93), hex(0x0F3F80)), 20, 16, c)
    val sunx = floor(c * 0.8).toInt(); val glitter = hex(0xFFE9A8)
    var gy = 21
    while (gy < 32) {
        if (hash(gy, t / 3) > 0.3f) r(sunx - 2 + floor(hash(gy, t) * 5.0).toInt(), gy, 2, 1, glitter)
        gy += 2
    }
    off = t / 2
    val crest = hex(0xBFE3FF)
    var yy = 21
    while (yy < 36) {
        for (x in 0 until c) {
            val wc = mod(x + (if (yy % 2 == 1) off else -off) + yy * 7, 240)
            if (hash(wc, yy) < 0.07f) r(x, yy, 2, 1, crest)
        }
        yy += 3
    }
    val bx = floor(c * 0.34).toInt(); val by = 20 + (t / 6) % 2
    for (s in 0 until 6) r(bx + 5, by - 7 + s, s + 1, 1, Color.White)
    r(bx + 4, by - 8, 1, 8, hex(0x3E2714))
    r(bx, by, 10, 1, hex(0x7A4A24))
    r(bx + 1, by + 1, 8, 1, hex(0x5B3A1E))
}
