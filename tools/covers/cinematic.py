"""Cinematic profile covers for TalkLive, rendered procedurally at 1280x720.

Every scene is its own composition: a light source, a palette, and layered
depth (far haze -> mid -> near silhouettes). The avatar sits in the centre of
the profile card, so each scene keeps its subject off-centre and its centre
calm. Run: python3 tools/covers/cinematic.py <out_dir>
"""
import sys, os
import numpy as np
from PIL import Image
from lib import *

W, H = 1280, 720


def finish(img, rng, vig=0.35, g=0.016, exposure=1.0):
    img = tonemap(img, exposure)
    vignette(img, vig)
    grain(img, rng, g)
    return img


def mountains(img, rng, base, amp, scale, color, haze=None, haze_t=0.0, sharp=True, soft=1.2, top_light=None):
    prof = (ridge1 if sharp else fbm1)(W, scale, rng)
    y = base - prof * amp
    col = hexc(color)
    if haze is not None:
        col = lerp(col, hexc(haze), haze_t)
    m = fill_below(img, y, col, soft)
    if top_light is not None:  # a lit rim along the ridge line
        yy = np.arange(H)[:, None]
        rim = np.exp(-np.clip(yy - y[None, :], 0, None) / 6.0) * m
        add(img, hexc(top_light), rim * 0.35)
    return y


def fog_band(img, rng, y, thick, color, alpha):
    n = fbm2(W, H, 220, rng, 4)
    yy = np.arange(H)[:, None]
    band = np.exp(-((yy - y) / thick) ** 2) * (0.55 + 0.75 * n)
    screen(img, hexc(color), band * alpha)


def conifers(img, rng, base_y, count, hmin, hmax, color, xs=None):
    yy, xx = coords(img)
    col = hexc(color)
    xs = xs if xs is not None else rng.random(count) * W
    for x in xs:
        x = float(x)
        h = hmin + (hmax - hmin) * rng.random()
        by = base_y[int(min(W - 1, max(0, x)))] if hasattr(base_y, '__len__') else base_y
        top = by - h
        wid = h * (0.22 + 0.06 * rng.random())
        # A tiered conifer: a triangle with ragged tiers.
        t = np.clip((yy - top) / h, 0, 1)
        tier = 0.82 + 0.18 * np.abs(np.sin(t * h / 9.0))
        half = wid * t * tier
        m = (np.abs(xx - x) < half) & (yy > top) & (yy < by + 3)
        img[m] = col
        trunk = (np.abs(xx - x) < max(1.0, wid * 0.06)) & (yy >= by - 2) & (yy < by + 8)
        img[trunk] = col


def skyline(img, rng, base, n, hmin, hmax, wmin, wmax, color, win_colors, win_p=0.3, win=(3, 4), gap=(6, 8)):
    col = hexc(color)
    x = -20
    rects = []
    while x < W + 20:
        bw = int(wmin + (wmax - wmin) * rng.random())
        bh = int(hmin + (hmax - hmin) * rng.random() ** 1.6)
        rects.append((x, base - bh, bw, bh))
        x += bw + int(rng.random() * 6)
    for (x0, y0, bw, bh) in rects:
        x0c, x1c = max(0, x0), min(W, x0 + bw)
        img[max(0, y0):base, x0c:x1c] = col
        # Spires and roof blocks on some towers.
        if rng.random() < 0.25 and bh > hmin * 1.4:
            sx = x0 + bw // 2
            img[max(0, y0 - int(bh * 0.18)):y0, max(0, sx - 1):min(W, sx + 2)] = col
        # Windows.
        for wy in range(y0 + 6, base - 4, gap[1]):
            for wx in range(x0 + 4, x0 + bw - 4, gap[0]):
                if 0 <= wx < W - win[0] and 0 <= wy < H - win[1] and rng.random() < win_p:
                    wc = hexc(win_colors[int(rng.random() * len(win_colors))])
                    img[wy:wy + win[1], wx:wx + win[0]] = lerp(col, wc, 0.55 + 0.45 * rng.random())
    return rects


def reflect(img, horizon, rng, darken=0.55, ripple=6.0, blur_r=2, tint=None):
    top = img[:horizon].copy()
    h = H - horizon
    src = top[::-1][:h]
    if src.shape[0] < h:
        src = np.concatenate([src, np.repeat(src[-1:], h - src.shape[0], 0)])
    out = np.empty_like(src)
    yy = np.arange(h)
    for i in yy:
        amp = ripple * (0.3 + i / h)
        off = (np.sin(i * 0.9 + rng.random() * 6) * amp + (rng.random() - 0.5) * amp).astype(int) if False else int(np.sin(i * 0.7) * amp * rng.random())
        out[i] = np.roll(src[i], off, axis=0)
    out = blur(out, blur_r) * darken
    if tint is not None:
        out = lerp(out, hexc(tint), 0.25)
    img[horizon:] = out
    return img


# ----------------------------------------------------------------------------- scenes

def nebula(rng):
    img = grad_v(canvas(W, H), [(0, '#05030f'), (1, '#0b0a1f')])
    yy, xx = coords(img)
    warp = fbm2(W, H, 260, rng, 4)
    n1 = fbm2(W, H, 340, rng, 6)
    n2 = fbm2(W, H, 180, rng, 6)
    # A diagonal cloud band from lower-left to upper-right, avoiding the centre a little.
    band = np.exp(-(((yy - (H * 0.95 - xx * 0.55)) / (H * 0.32)) ** 2))
    cloud = np.clip((n1 + warp * 0.6 - 0.55) * 2.2, 0, 1) * band
    add(img, hexc('#c026d3'), cloud * 0.55)
    add(img, hexc('#22d3ee'), np.clip((n2 - 0.52) * 3, 0, 1) * band * 0.45)
    add(img, hexc('#f97316'), np.clip((n1 * n2 - 0.32) * 4, 0, 1) * band * 0.35)
    # Dark dust lanes cut through the glow.
    dust = np.clip((fbm2(W, H, 120, rng, 5) - 0.5) * 3, 0, 1) * band
    img *= (1 - 0.6 * dust)[..., None]
    stars(img, rng, 2200, bright=0.9)
    stars(img, rng, 40, bright=1.6, size_px=1.3)
    glow(img, W * 0.8, H * 0.22, 60, hexc('#fde68a'), 0.6)
    glow(img, W * 0.8, H * 0.22, 8, hexc('#ffffff'), 1.2)
    return finish(img, rng, 0.45)


def ringed(rng):
    img = grad_v(canvas(W, H), [(0, '#020617'), (1, '#0b1026')])
    stars(img, rng, 1500, bright=0.8)
    yy, xx = coords(img)
    cx, cy, r = W * 0.18, H * 1.25, H * 0.95
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    planet = np.clip((r - d) / 2 + 0.5, 0, 1)
    # Banded surface lit from the upper right.
    lat = (yy - cy) / r
    bands = 0.5 + 0.5 * np.sin(lat * 38 + fbm2(W, H, 90, rng, 4) * 4)
    base = lerp(hexc('#7c2d12'), hexc('#fbbf24'), bands[..., None] * 0.7)
    lx, ly = (xx - cx) / r, (yy - cy) / r
    light = np.clip(0.25 + 1.2 * (lx * 0.6 - ly * 0.8), 0, 1.2)
    img[:] = img * (1 - planet[..., None]) + (base * light[..., None]) * planet[..., None]
    # Atmosphere rim.
    rim = np.exp(-((d - r) / 10) ** 2) * np.clip(lx * 0.6 - ly * 0.8 + 0.4, 0, 1)
    add(img, hexc('#fdba74'), rim * 1.1)
    # Rings: an ellipse band crossing the sky.
    ex = (xx - cx) / (r * 1.9); ey = (yy - (cy - r * 0.15)) / (r * 0.35)
    e = np.sqrt(ex ** 2 + ey ** 2)
    ring = np.exp(-((e - 1.0) / 0.06) ** 2) * (0.6 + 0.4 * np.sin(e * 140))
    behind = (yy > cy - r * 0.15) & (planet > 0.5)
    ring[behind] = 0
    add(img, hexc('#fde7c4'), ring * 0.55)
    # Two moons.
    for (mx, my, mr, c) in [(W * 0.74, H * 0.26, 26, '#cbd5e1'), (W * 0.88, H * 0.46, 11, '#a5b4fc')]:
        dm = np.sqrt((xx - mx) ** 2 + (yy - my) ** 2)
        mm = np.clip((mr - dm) / 1.5 + 0.5, 0, 1)
        shade = np.clip(0.2 + ((mx - xx) / mr) * -0.8 + 0.6, 0.08, 1)
        img[:] = img * (1 - mm[..., None]) + (hexc(c) * shade[..., None]) * mm[..., None]
    return finish(img, rng, 0.4)


def aurora(rng):
    img = grad_v(canvas(W, H), [(0, '#01040c'), (0.5, '#041a2c'), (0.62, '#0a2b40'), (1, '#02080f')])
    stars(img, rng, 1300, ymax=0.62, bright=0.8)
    yy, xx = coords(img)
    sky = (yy < H * 0.62)
    for (c, ph, amp, base, strength) in [('#2ee6a6', 0.0, 55, 0.30, 0.75), ('#38bdf8', 2.3, 40, 0.22, 0.45), ('#c084fc', 4.1, 30, 0.14, 0.35)]:
        curve = H * base + np.sin(xx[0] / W * 4.2 + ph) * amp + (fbm1(W, 300, rng) - 0.5) * 80
        dist = yy - curve[None, :]
        # Light hangs above the lower edge and fades upward; the edge itself is soft.
        curtain = np.where(dist < 0, np.exp(dist / (H * 0.16)), np.exp(-dist / 10))
        rays = 0.82 + 0.18 * blur(np.repeat(rng.random((1, W)), H, 0), 3)
        add(img, hexc(c), blur(curtain * rays, 2) * strength * sky)
    horizon = int(H * 0.62)
    y1 = mountains(img, rng, H * 0.62, 140, 320, '#0b1724')
    # Snow catching the aurora on the far slopes.
    snow = np.exp(-np.clip(yy - y1[None, :], 0, None) / 22) * (yy > y1[None, :]) * (yy < horizon)
    add(img, hexc('#5fd3b0'), snow * 0.22)
    mountains(img, rng, H * 0.625, 60, 150, '#050d16', sharp=False)
    reflect(img, horizon, rng, darken=0.45, ripple=4, blur_r=2)
    return finish(img, rng, 0.42)

def misty(rng):
    img = grad_v(canvas(W, H), [(0, '#f5c7a9'), (0.45, '#f8dcc4'), (1, '#c9d6e8')])
    glow(img, W * 0.76, H * 0.36, 160, hexc('#fff1d6'), 0.6)
    glow(img, W * 0.76, H * 0.36, 30, hexc('#ffffff'), 0.9)
    layers = [('#9fb3cf', 0.42, 140, 0.0), ('#7d93b5', 0.52, 120, 0.0), ('#5d7296', 0.63, 110, 0.0), ('#3f5274', 0.75, 120, 0.0), ('#24324d', 0.9, 110, 0.0)]
    for i, (c, b, a, _) in enumerate(layers):
        mountains(img, rng, H * b, a, 360 - i * 40, c, sharp=i % 2 == 0, soft=1.4)
        fog_band(img, rng, H * (b + 0.02), 26 + i * 4, '#f3e6dc', 0.35 - i * 0.04)
    # A few birds, far away.
    for (bx, by) in [(W * 0.66, H * 0.22), (W * 0.69, H * 0.2), (W * 0.715, H * 0.235)]:
        for k in range(-6, 7):
            yb = int(by + abs(k) * -0.5 + (abs(k) ** 1.3) * 0.25)
            img[yb:yb + 2, int(bx + k)] = hexc('#3f4a5f')
    return finish(img, rng, 0.25, 0.012)


def pines(rng):
    img = grad_v(canvas(W, H), [(0, '#d9ead8'), (0.5, '#93b9a2'), (1, '#1d3b30')])
    yy, xx = coords(img)
    ang = np.arctan2(yy + 260, xx + 160)
    shafts = blur((np.clip(np.sin(ang * 22 + 1.3), 0, 1) ** 3)[..., None], 6)[..., 0]
    add(img, hexc('#fff6d5'), shafts * np.clip(1 - yy / (H * 0.9), 0, 1) * 0.28)
    glow(img, -40, -60, 420, hexc('#fff1c7'), 0.35)
    cols = ['#8aa99a', '#6c8f7f', '#4b6e60', '#2f4f43', '#162d25']
    for i, c in enumerate(cols):
        base = np.full(W, H * (0.55 + i * 0.11))
        n = int(26 - i * 3)
        xs = np.sort(rng.random(n) * W)
        conifers(img, rng, base, n, 90 + i * 40, 170 + i * 70, c, xs)
        fog_band(img, rng, H * (0.58 + i * 0.11), 30, '#e8f1e9', 0.36 - i * 0.06)
    return finish(img, rng, 0.38)

def moonlit_tide(rng):
    img = grad_v(canvas(W, H), [(0, '#030a1c'), (0.58, '#1b2e57'), (0.6, '#2a4676'), (1, '#040b1c')])
    stars(img, rng, 900, ymax=0.55, bright=0.7)
    mx, my = W * 0.22, H * 0.26
    glow(img, mx, my, 240, hexc('#7aa2ff'), 0.35)
    disc(img, mx, my, 46, hexc('#f1f5f9'))
    n = fbm2(W, H, 18, rng, 3)
    d = radial(img, mx, my, 46)
    img[d < 1] *= (0.86 + 0.14 * n[d < 1])[..., None]
    yy, xx = coords(img)
    c = np.clip((fbm2(W, H, 260, rng, 5) - 0.55) * 2.5, 0, 1) * np.exp(-((yy - H * 0.36) / (H * 0.12)) ** 2)
    screen(img, hexc('#9db4e8'), c * 0.5)
    horizon = int(H * 0.6)
    mountains(img, rng, horizon + 1, 34, 140, '#071024', sharp=False)
    # Water: a deep gradient with long swells.
    depth = np.clip((yy - horizon) / (H - horizon), 0, 1)
    water = (yy >= horizon)
    img[water] = lerp(hexc('#16294d'), hexc('#040a18'), depth[water][..., None])
    swell = 0.5 + 0.5 * np.sin(yy * (0.25 + depth * 0.4) * 1.0 + fbm2(W, H, 140, rng, 3) * 8)
    img[water] *= (0.85 + 0.15 * swell[water])[..., None]
    # The moon's path: a widening column of broken glints.
    spread = 18 + np.clip(yy - horizon, 1, None) * 0.55
    path = np.exp(-((xx - mx) / spread) ** 2) * water
    glints = np.clip(np.sin(yy * 1.3 + fbm2(W, H, 6, rng, 2) * 9) * 2 - 1, 0, 1)
    add(img, hexc('#dbe7ff'), path * glints * 0.85 + path * 0.08)
    return finish(img, rng, 0.42)

def dunes(rng):
    img = grad_v(canvas(W, H), [(0, '#241640'), (0.35, '#8f3f6b'), (0.55, '#f08a5d'), (0.62, '#fcd29a'), (1, '#fcd29a')])
    glow(img, W * 0.18, H * 0.55, 170, hexc('#ffd59e'), 0.55)
    disc(img, W * 0.18, H * 0.55, 32, hexc('#fff3d6'))
    yy, xx = coords(img)
    pal = [('#b45f48', '#f2a971'), ('#94463d', '#e08c5c'), ('#6d3033', '#c5694a'), ('#3f1b26', '#8a3d3a')]
    for i, (dark, lit) in enumerate(pal):
        base = H * (0.62 + i * 0.1)
        wave = 0.5 + 0.5 * np.sin(xx[0] / (W * (0.16 - i * 0.02)) + i * 1.7 + (value_noise1(W, 400, rng) - 0.5) * 3)
        prof = base - wave ** 1.6 * (55 + i * 30)
        prof = blur(prof[None, :], 6)[0]
        m = fill_below(img, prof, hexc(dark), 1.0)
        slope = blur(np.gradient(prof)[None, :], 10)[0]
        face = np.clip(-slope * 1.4 + 0.15, 0, 1)[None, :] * np.exp(-np.clip(yy - prof[None, :], 0, None) / 80)
        img[:] = img + (hexc(lit) - hexc(dark)) * (face * m)[..., None]
        add(img, hexc('#ffe0b0'), np.exp(-np.clip(yy - prof[None, :], 0, None) / 2.5) * m * 0.3)
        # Fine wind ripples on the sand.
        rip = 0.5 + 0.5 * np.sin(yy * 0.9 + xx * 0.05 + fbm2(W, H, 60, rng, 2) * 6)
        img *= (1 - 0.035 * rip * m)[..., None]
    return finish(img, rng, 0.35)

def liquid(rng):
    img = grad_v(canvas(W, H), [(0, '#0a0718'), (1, '#140c2e')])
    yy, xx = coords(img)
    x = xx[0] / W
    cols = [('#3b1d6e', '#7c3aed'), ('#1e3a8a', '#38bdf8'), ('#6b21a8', '#f0abfc'), ('#0f766e', '#5eead4'), ('#9d174d', '#fda4af')]
    for i, (dark, light) in enumerate(cols):
        ph = rng.random() * 6
        centre = H * (0.15 + i * 0.18) + np.sin(x * (2.2 + i * 0.4) + ph) * H * 0.12 + np.sin(x * 5.1 + ph * 2) * H * 0.03
        thick = H * (0.05 + 0.03 * np.sin(x * 3 + ph)) + 10
        d = (yy - centre[None, :]) / thick[None, :]
        ribbon = np.clip(1 - np.abs(d), 0, 1)
        # Satin shading across the ribbon, a bright edge on top, a soft shadow beneath.
        across = (d + 1) / 2
        col = lerp(hexc(light), hexc(dark), np.clip(across, 0, 1)[..., None])
        sheen = np.exp(-((d + 0.55) / 0.12) ** 2)
        m = np.clip(ribbon * 6, 0, 1)
        shadow = np.exp(-np.clip(d - 1, 0, None) * 3) * (d > 1)
        img *= (1 - 0.35 * shadow)[..., None]
        img[:] = img * (1 - m[..., None]) + col * m[..., None]
        add(img, hexc('#ffffff'), sheen * m * 0.35)
    return finish(img, rng, 0.45, 0.012)

def prism(rng):
    img = grad_v(canvas(W, H), [(0, '#0a0a12'), (1, '#12121f')])
    yy, xx = coords(img)
    # A beam from the left splitting into a spectrum to the right of a prism (off-centre right).
    px, py = W * 0.7, H * 0.5
    beam = np.exp(-((yy - (py + (xx - px) * 0.05)) / 3) ** 2) * (xx < px)
    add(img, hexc('#ffffff'), beam * 0.9)
    spec = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#06b6d4', '#6366f1', '#a855f7']
    for i, c in enumerate(spec):
        slope = -0.25 + i * 0.075
        cy = py + (xx - px) * slope
        width = 4 + (xx - px) * 0.05
        b = np.exp(-((yy - cy) / np.maximum(width, 1)) ** 2) * (xx > px)
        add(img, hexc(c), b * 0.55)
    tri = (yy > py - 90 + np.abs(xx - px) * 1.7) & (yy < py + 70)
    img[tri] = lerp(img[tri], hexc('#a5b4fc'), 0.18)
    edge = tri & ~((yy > py - 86 + np.abs(xx - px) * 1.7) & (yy < py + 66))
    img[edge] = lerp(img[edge], hexc('#e0e7ff'), 0.7)
    # Floating glass panes catching the colour.
    for _ in range(9):
        cx, cy, s = rng.random() * W * 0.45, rng.random() * H, 40 + rng.random() * 90
        m = (np.abs(xx - cx) + np.abs(yy - cy) * 1.4 < s)
        img[m] = lerp(img[m], hexc(spec[int(rng.random() * 7)]), 0.07)
    glow(img, px, py, 50, hexc('#ffffff'), 0.4)
    return finish(img, rng, 0.45)


def brutalist(rng):
    img = grad_v(canvas(W, H), [(0, '#2a4a5e'), (0.45, '#d58f5a'), (0.7, '#f3c28d'), (1, '#f6d4a8')])
    yy, xx = coords(img)
    glow(img, W * 0.08, H * 0.62, 260, hexc('#ffd6a0'), 0.55)
    layers = [(0.75, 0.62, '#9b7c6c', '#c9a083'), (0.86, 0.35, '#6b5248', '#a8806a'), (1.0, 0.0, '#3a2c28', '#7a5a4b')]
    for depth, haze, shadow, lit in layers:
        x = -40
        while x < W + 40:
            w_ = 110 + rng.random() * 200
            h_ = (160 + rng.random() * 330) * (0.55 + 0.45 * depth)
            if abs(x + w_ / 2 - W / 2) < 170 and depth == 1.0:
                h_ *= 0.4
            y0 = H * depth - h_
            front = (xx >= x) & (xx < x + w_) & (yy >= y0) & (yy < H * depth + 4)
            # Low sun from the left: the left face is lit, the rest in shadow.
            litw = w_ * (0.18 + 0.1 * rng.random())
            img[front] = hexc(shadow)
            lf = front & (xx < x + litw)
            img[lf] = hexc(lit)
            # Horizontal slab lines and deep window slots.
            for wy in np.arange(y0 + 22, H * depth, 30 + 8 * rng.random()):
                slot = front & (xx >= x + litw + 8) & (xx < x + w_ - 8) & (yy >= wy) & (yy < wy + 6)
                img[slot] = lerp(hexc(shadow), hexc('#120c0a'), 0.6)
            x += w_ + 10 + rng.random() * 40
        if haze:
            blend(img, hexc('#f0b98a'), np.full((H, W), haze * 0.35) * (yy < H * depth))
    fog_band(img, rng, H * 0.9, 50, '#f3c9a0', 0.22)
    ground = yy > H * 0.93
    img[ground] = lerp(hexc('#3a2c28'), hexc('#1c1412'), np.clip((yy[ground] - H * 0.93) / (H * 0.07), 0, 1)[..., None])
    return finish(img, rng, 0.35, 0.02)

def skyline2099(rng):
    img = grad_v(canvas(W, H), [(0, '#060418'), (0.55, '#1e1150'), (0.8, '#7a2d82'), (1, '#c2477a')])
    stars(img, rng, 600, ymax=0.5, bright=0.6)
    glow(img, W * 0.82, H * 0.2, 40, hexc('#fca5a5'), 0.5)
    skyline(img, rng, int(H * 0.86), 0, 120, 330, 30, 70, '#24104a', ['#f0abfc', '#93c5fd'], 0.08, (2, 3), (6, 8))
    blend(img, hexc('#b14aa0'), np.full((H, W), 0.18))
    skyline(img, rng, int(H * 1.0), 0, 160, 470, 40, 110, '#0b0720', ['#22d3ee', '#f472b6', '#fde68a'], 0.22, (3, 4), (7, 9))
    yy, xx = coords(img)
    # Flying traffic: light trails across the sky.
    for _ in range(6):
        y0 = H * (0.2 + rng.random() * 0.35); k = (rng.random() - 0.5) * 0.08
        x0, x1 = rng.random() * W * 0.4, W * (0.6 + rng.random() * 0.4)
        line = np.exp(-((yy - (y0 + (xx - x0) * k)) / 1.2) ** 2) * ((xx > x0) & (xx < x1)) * ((xx - x0) / (x1 - x0))
        add(img, hexc(['#22d3ee', '#f472b6'][int(rng.random() * 2)]), line * 0.9)
    fog_band(img, rng, H * 0.9, 60, '#ff7ab6', 0.18)
    return finish(img, rng, 0.42)


def rain_city(rng):
    img = grad_v(canvas(W, H), [(0, '#0b1220'), (0.6, '#1b2a3f'), (1, '#0a0f18')])
    horizon = int(H * 0.68)
    skyline(img, rng, horizon, 0, 120, 340, 30, 90, '#101a2a', ['#fde68a', '#fca5a5', '#93c5fd'], 0.2, (3, 4), (7, 9))
    # Fog over the towers.
    fog_band(img, rng, H * 0.45, 120, '#5b7290', 0.35)
    yy, xx = coords(img)
    # Out-of-focus street lights (bokeh) near the bottom.
    for _ in range(70):
        bx, by = rng.random() * W, H * (0.55 + rng.random() * 0.4)
        if abs(bx - W / 2) < 140 and by < H * 0.75:
            continue
        r = 6 + rng.random() * 22
        c = hexc(['#fbbf24', '#f87171', '#fde68a', '#93c5fd'][int(rng.random() * 4)])
        d = radial(img, bx, by, r)
        add(img, c, np.clip(1.15 - d, 0, 1) ** 0.7 * 0.18)
    reflect(img, horizon, rng, darken=0.6, ripple=3, blur_r=4)
    # Rain streaks.
    rain = np.zeros((H, W))
    for _ in range(1600):
        x, y, l = rng.random() * W, rng.random() * H, 10 + rng.random() * 26
        for k in range(int(l)):
            yi, xi = int(y + k), int(x + k * 0.18)
            if 0 <= yi < H and 0 <= xi < W:
                rain[yi, xi] += 0.12
    add(img, hexc('#cbd5e1'), blur(rain, 1) * 0.9)
    return finish(img, rng, 0.45)


def neon_alley(rng):
    img = grad_v(canvas(W, H), [(0, '#05020c'), (0.5, '#1a0b2e'), (1, '#07030f')])
    yy, xx = coords(img)
    vx, vy = W * 0.5, H * 0.52
    # Two walls of towers receding to a vanishing point, the street between them.
    t = np.clip(np.abs(xx - vx) / (W * 0.5), 0, 1)
    wall_top = vy - t * H * 0.95
    wall = (yy > wall_top) & (yy < vy + t * H * 0.55) & (np.abs(xx - vx) > W * 0.06)
    img[wall] = lerp(hexc('#0d0718'), hexc('#1a0f2c'), (1 - t[wall])[..., None])
    # Lit windows in perspective rows.
    for row in np.linspace(0.05, 0.9, 16):
        yrow = vy - t * H * 0.95 * row
        win = (np.abs(yy - yrow) < 1.2 + t * 2.5) & wall & (np.sin(xx * (0.6 / (t + 0.08))) > 0.65) & (rng.random((H, W)) > 0.4)
        img[win] = lerp(img[win], hexc('#fbcfe8'), 0.35)
    # Vertical neon tubes on both walls, bigger as they come closer.
    for side in (-1, 1):
        for k in range(7):
            tt = 0.25 + k * 0.11 + rng.random() * 0.04
            sx = vx + side * tt * W * 0.5
            top, bot = vy - tt * H * 0.7, vy - tt * H * 0.15
            c = hexc(['#f0abfc', '#22d3ee', '#fb7185', '#a3e635', '#facc15'][int(rng.random() * 5)])
            tube = (np.abs(xx - sx) < 1.5 + tt * 5) & (yy > top) & (yy < bot)
            img[tube] = c
            glow(img, sx, (top + bot) / 2, 30 + tt * 90, c * 0.7, 0.55)
    # A haze of pink and cyan down the street.
    glow(img, vx, vy, 160, hexc('#a855f7'), 0.35)
    glow(img, vx + 60, vy - 30, 90, hexc('#22d3ee'), 0.2)
    horizon = int(vy + H * 0.08)
    reflect(img, horizon, rng, darken=0.5, ripple=5, blur_r=3)
    fog_band(img, rng, H * 0.62, 70, '#c084fc', 0.18)
    return finish(img, rng, 0.5)

def floating_isles(rng):
    img = grad_v(canvas(W, H), [(0, '#8ea2f0'), (0.5, '#f4c6e0'), (1, '#fde3b0')])
    glow(img, W * 0.8, H * 0.27, 150, hexc('#ffffff'), 0.45)
    disc(img, W * 0.8, H * 0.27, 68, hexc('#fff7ed'))
    yy, xx = coords(img)
    sea = np.clip((fbm2(W, H, 200, rng, 5) - 0.42) * 2.6, 0, 1) * np.clip((yy - H * 0.62) / (H * 0.3), 0, 1)
    screen(img, hexc('#ffffff'), sea * 0.85)
    isles = [(W * 0.14, H * 0.42, 150, 0.0), (W * 0.37, H * 0.7, 80, 0.4), (W * 0.6, H * 0.58, 55, 0.6), (W * 0.93, H * 0.63, 120, 0.2)]
    for (cx, cy, s, far) in isles:
        xs = xx[0]
        span = np.clip(1 - ((xs - cx) / s) ** 2, 0, 1)
        top_y = cy - s * 0.1 - span * s * 0.08 + (fbm1(W, 25, rng) - 0.5) * s * 0.08
        under = cy + s * 0.9 * span ** 0.7 * (0.75 + 0.5 * fbm1(W, 18, rng))
        on = span > 0
        body = (yy > top_y[None, :]) & (yy < under[None, :]) & on[None, :]
        depth = np.clip((yy - top_y[None, :]) / (s * 0.9), 0, 1)
        rock = lerp(lerp(hexc('#8a6a7c'), hexc('#3b2a3f'), depth[..., None]), hexc('#c7b8f0'), far)
        img[body] = rock[body]
        cap = (yy > top_y[None, :] - 1) & (yy < top_y[None, :] + s * 0.07) & on[None, :]
        img[cap] = lerp(hexc('#3f9b5a'), hexc('#c7b8f0'), far)
        # Small trees on the bigger islands.
        if s > 100:
            tx = cx + (rng.random(4) - 0.5) * s * 1.1
            base = top_y.copy()
            conifers(img, rng, base, 4, s * 0.16, s * 0.3, '#2c6e45' if far < 0.3 else '#a9a0d8', tx)
        fall_x = int(min(W - 1, cx + s * 0.35))
        fall = np.exp(-((xx - fall_x) / 3) ** 2) * (yy > top_y[fall_x]) * np.exp(-np.clip(yy - under[fall_x], 0, None) / 120) * 0.5
        screen(img, hexc('#ffffff'), fall * (1 - far))
    return finish(img, rng, 0.25, 0.012)

def lone_peak(rng):
    img = grad_v(canvas(W, H), [(0, '#1e293b'), (0.65, '#64748b'), (1, '#e2e8f0')])
    yy, xx = coords(img)
    disc(img, W * 0.82, H * 0.2, 14, hexc('#f8fafc'))
    glow(img, W * 0.82, H * 0.2, 60, hexc('#cbd5e1'), 0.25)
    px = W * 0.24
    prof = H * 0.86 - np.clip(1 - np.abs(xx[0] - px) / (W * 0.32), 0, 1) ** 1.6 * H * 0.55 - fbm1(W, 30, rng) * 8
    m = fill_below(img, prof, hexc('#0f172a'), 1.2)
    lit = np.clip((px - xx) / (W * 0.3), 0, 1) * m * np.exp(-np.clip(yy - prof[None, :], 0, None) / 90)
    add(img, hexc('#94a3b8'), lit * 0.35)
    fill_below(img, np.full(W, H * 0.9), hexc('#0b1220'), 1.0)
    return finish(img, rng, 0.25, 0.01)


def golden_sea(rng):
    img = grad_v(canvas(W, H), [(0, '#1e1b4b'), (0.3, '#7c2d5a'), (0.5, '#f97316'), (0.56, '#fde68a'), (1, '#1e1b4b')])
    yy, xx = coords(img)
    horizon = int(H * 0.56)
    sx = W * 0.72
    glow(img, sx, horizon, 240, hexc('#fb923c'), 0.6)
    disc(img, sx, horizon - 6, 40, hexc('#fff1c1'))
    # Layered cloud banks lit from below.
    for (cy, th, c) in [(0.18, 30, '#f472b6'), (0.3, 22, '#fdba74'), (0.42, 14, '#fde68a')]:
        band = np.exp(-((yy - H * cy) / th) ** 2) * np.clip((fbm2(W, H, 200, rng, 5) - 0.45) * 3, 0, 1)
        add(img, hexc(c), band * 0.45)
        img *= (1 - band * 0.25)[..., None]
    img[horizon:] = 0
    reflect_src = img.copy()
    img[:horizon] = reflect_src[:horizon]
    img = img
    reflect(img, horizon, rng, darken=0.55, ripple=12, blur_r=1)
    path = np.exp(-((xx - sx) / (20 + (yy - horizon) * 0.6)) ** 2) * (yy > horizon)
    add(img, hexc('#ffd28a'), path * ((rng.random((H, W)) > 0.8) * 0.8 + 0.2))
    return finish(img, rng, 0.4)


def eclipse(rng):
    img = grad_v(canvas(W, H), [(0, '#000000'), (1, '#05060a')])
    stars(img, rng, 1400, bright=0.7)
    cx, cy = W * 0.76, H * 0.4
    yy, xx = coords(img)
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    ang = np.arctan2(yy - cy, xx - cx)
    streamers = 0.6 + 0.4 * np.sin(ang * 14 + fbm2(W, H, 60, rng, 3) * 6)
    corona = np.exp(-np.clip(d - 70, 0, None) / 45) * streamers
    add(img, hexc('#e0e7ff'), corona * 0.9)
    add(img, hexc('#f0abfc'), np.exp(-((d - 72) / 3) ** 2) * 0.8)
    m = np.clip((70 - d) / 1.5 + 0.5, 0, 1)
    img *= (1 - m)[..., None]
    # The faint landscape below, lit only by the corona.
    mountains(img, rng, H * 0.9, 90, 260, '#05060c', top_light='#6366f1')
    return finish(img, rng, 0.35)


SCENES = [
    # id, name, function, seed
    ('nebula', 'Orion Drift', nebula, 11),
    ('ringed', 'Ringed Horizon', ringed, 12),
    ('aurora', 'Northern Veil', aurora, 13),
    ('misty', 'Misty Ranges', misty, 14),
    ('pines', 'Cathedral Pines', pines, 15),
    ('tide', 'Moonlit Tide', moonlit_tide, 16),
    ('dunes', 'Desert Dusk', dunes, 17),
    ('silk', 'Silk Waves', liquid, 18),
    ('prism', 'Prism Light', prism, 19),
    ('brutalist', 'Brutalist Dawn', brutalist, 20),
    ('skyline', 'Skyline 2099', skyline2099, 21),
    ('rain', 'Rain City', rain_city, 22),
    ('alley', 'Neon Alley', neon_alley, 23),
    ('isles', 'Floating Isles', floating_isles, 24),
    ('peak', 'Lone Peak', lone_peak, 25),
    ('golden', 'Golden Sea', golden_sea, 26),
    ('eclipse', 'Eclipse', eclipse, 27),
]

if __name__ == '__main__':
    out = sys.argv[1]
    only = sys.argv[2:] or None
    os.makedirs(out, exist_ok=True)
    for sid, name, fn, seed in SCENES:
        if only and sid not in only:
            continue
        rng = np.random.default_rng(seed)
        img = fn(rng)
        Image.fromarray(to_u8(img)).save(os.path.join(out, sid + '.png'))
        print('rendered', sid)
