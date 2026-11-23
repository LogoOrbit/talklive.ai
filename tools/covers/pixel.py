"""Pixel-art profile covers for TalkLive, drawn natively at 256x144.

Nothing here is a filtered photo: every scene is placed pixel by pixel at the
final resolution, then reduced to its own small palette with a 4x4 Bayer
dither, the way 16-bit games shaded skies and water. Apps scale them up with
nearest-neighbour filtering. Run: python3 tools/covers/pixel.py <out_dir>
"""
import sys, os
import numpy as np
from PIL import Image
from lib import hexc, fbm1, fbm2, ridge1, value_noise1

W, H = 256, 144
BAYER = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0 - 0.5)


class Px:
    def __init__(self, palette, rng):
        self.pal = np.array([hexc(c) for c in palette])
        self.img = np.zeros((H, W, 3))
        self.rng = rng
        self.lock = np.zeros((H, W), bool)  # pixels that must keep their exact colour

    def c(self, i):
        return self.pal[i]

    def sky(self, stops):
        ys = np.linspace(0, 1, H)
        for ch in range(3):
            self.img[:, :, ch] = np.interp(ys, [s[0] for s in stops], [self.pal[s[1]][ch] for s in stops])[:, None]

    def rect(self, x, y, w, h, i, lock=True):
        x0, y0, x1, y1 = max(0, int(x)), max(0, int(y)), min(W, int(x + w)), min(H, int(y + h))
        if x1 > x0 and y1 > y0:
            self.img[y0:y1, x0:x1] = self.pal[i]
            if lock:
                self.lock[y0:y1, x0:x1] = True

    def px(self, x, y, i):
        x, y = int(x), int(y)
        if 0 <= x < W and 0 <= y < H:
            self.img[y, x] = self.pal[i]
            self.lock[y, x] = True

    def circle(self, cx, cy, r, i):
        yy, xx = np.mgrid[0:H, 0:W]
        m = (xx - cx + 0.5) ** 2 + (yy - cy + 0.5) ** 2 <= r * r
        self.img[m] = self.pal[i]
        self.lock |= m
        return m

    def below(self, prof, i):
        yy = np.arange(H)[:, None]
        m = yy >= np.round(prof)[None, :]
        self.img[m] = self.pal[i]
        self.lock |= m
        return m

    def stars(self, n, ymax, cols, big=0):
        for _ in range(n):
            x, y = int(self.rng.random() * W), int(self.rng.random() * H * ymax)
            self.px(x, y, cols[int(self.rng.random() * len(cols))])
        for _ in range(big):  # a few four-point sparkles
            x, y = int(self.rng.random() * W), int(4 + self.rng.random() * (H * ymax - 8))
            c = cols[0]
            for dx, dy in [(0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)]:
                self.px(x + dx, y + dy, c)

    def tree(self, x, base, h, i, shade=None):
        """A pixel conifer: stacked tiers, one pixel of shade on the right edge."""
        for k in range(h):
            half = int((k / h) * h * 0.38) + (1 if k % 3 == 2 else 0)
            y = base - h + k
            self.rect(x - half, y, 2 * half + 1, 1, i)
            if shade is not None and half > 1:
                self.px(x + half, y, shade)
        self.rect(x, base, 1, 2, i)

    def windows(self, x, y, w, h, on, off, p, step=(2, 3)):
        for wy in range(int(y) + 2, int(y + h) - 1, step[1]):
            for wx in range(int(x) + 1, int(x + w) - 1, step[0]):
                if self.rng.random() < p:
                    self.px(wx, wy, on[int(self.rng.random() * len(on))])
                elif off is not None:
                    self.px(wx, wy, off)

    def done(self):
        """Quantise to the palette; the dither only touches unlocked (gradient) pixels."""
        img = self.img + np.where(self.lock[..., None], 0, BAYER[np.arange(H)[:, None] % 4, np.arange(W)[None, :] % 4][..., None] * 0.09)
        d = ((img[:, :, None, :] - self.pal[None, None, :, :]) ** 2).sum(-1)
        out = self.pal[d.argmin(-1)]
        return (out * 255 + 0.5).astype(np.uint8)


def prof(rng, base, amp, scale, sharp=False):
    return base - (ridge1 if sharp else fbm1)(W, scale, rng) * amp


# ----------------------------------------------------------------------------- scenes

def neon_metropolis(rng):
    p = Px(['#0b0620', '#1a0f3d', '#2d1b69', '#5b2a86', '#a23e8c', '#f472b6', '#22d3ee', '#fde68a', '#140a2e', '#ffffff', '#3b1f6e'], rng)
    p.sky([(0, 0), (0.45, 1), (0.75, 2), (0.9, 3), (1, 4)])
    p.stars(60, 0.45, [9, 7])
    p.circle(206, 30, 12, 5); p.circle(209, 27, 10, 4)  # a pink crescent planet
    x = 0
    while x < W:  # far towers
        w = 8 + int(rng.random() * 10); h = 30 + int(rng.random() * 45)
        p.rect(x, H - 30 - h, w, h + 30, 10); p.windows(x, H - 30 - h, w, h, [5], None, 0.12)
        x += w + 1
    x = -4
    while x < W:  # near towers with antennas and neon edges
        w = 12 + int(rng.random() * 16); h = 20 + int(rng.random() * 70)
        if 108 < x < 148:
            h = int(h * 0.5)
        p.rect(x, H - h, w, h, 8)
        p.windows(x, H - h, w, h, [7, 6, 5], 0, 0.35)
        p.rect(x, H - h, 1, h, 6 if rng.random() < 0.5 else 5)
        if rng.random() < 0.4:
            p.rect(x + w // 2, H - h - 6, 1, 6, 8); p.px(x + w // 2, H - h - 7, 5)
        x += w + 2
    return p.done()


def synth_horizon(rng):
    p = Px(['#12002a', '#2c0a4d', '#5b0f6b', '#b0267a', '#f2558a', '#ff9e5e', '#ffd36e', '#0c0021', '#36f1cd', '#7b2fbf', '#ffffff'], rng)
    p.sky([(0, 0), (0.3, 1), (0.48, 2), (0.6, 3), (0.66, 4)])
    p.stars(40, 0.4, [10, 8])
    hz = 92
    sun = p.circle(70, 74, 26, 6)
    for i, y in enumerate(range(60, 100, 4)):  # sun stripes
        p.rect(40, y + i // 3, 60, 1 + i // 4, 2)
    p.below(np.array([hz - 6 - 10 * np.exp(-((x - 190) / 26.0) ** 2) - 6 * np.exp(-((x - 230) / 18.0) ** 2) for x in range(W)]), 9)
    p.rect(0, hz, W, H - hz, 7)
    for k in range(1, 12):  # receding grid lines
        y = hz + int((k / 11) ** 2 * (H - hz))
        p.rect(0, y, W, 1, 3 if k < 4 else 4)
    for gx in range(-20, 21):
        for y in range(hz, H):
            t = (y - hz) / (H - hz)
            x = int(W / 2 + gx * (4 + t * 30))
            p.px(x, y, 8 if abs(gx) % 4 == 0 else 3)
    return p.done()


def firefly_woods(rng):
    p = Px(['#071a17', '#0c2b25', '#123a30', '#1d5040', '#2f6b4f', '#0a2320', '#f5f39a', '#c6e66a', '#41806a', '#03100d', '#8fd6a3'], rng)
    p.sky([(0, 9), (0.45, 0), (0.8, 1), (1, 2)])
    p.stars(30, 0.3, [10])
    p.circle(40, 22, 7, 10)
    for layer, (base, col, sh, n, hmin, hmax) in enumerate([(98, 4, 8, 28, 26, 40), (116, 3, 4, 22, 34, 52), (140, 5, 1, 16, 44, 70)]):
        p.below(np.full(W, base), col)
        xs = sorted(rng.random(n) * W)
        for x in xs:
            p.tree(int(x), base, int(hmin + rng.random() * (hmax - hmin)), col, sh)
    for _ in range(40):  # fireflies with a one-pixel halo
        x, y = int(rng.random() * W), int(50 + rng.random() * 90)
        p.px(x, y, 6)
        if rng.random() < 0.5:
            for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
                if 0 <= x + dx < W and 0 <= y + dy < H and not p.lock[y + dy, x + dx]:
                    p.px(x + dx, y + dy, 7)
    return p.done()


def planet_rise(rng):
    p = Px(['#02010a', '#0b0a24', '#1c1446', '#ff8b3d', '#ffd27a', '#b84a2a', '#5a1d26', '#9ad1ff', '#ffffff', '#4a5aa8', '#2a3070'], rng)
    p.sky([(0, 0), (1, 1)])
    p.stars(140, 1.0, [8, 7, 9], big=6)
    yy, xx = np.mgrid[0:H, 0:W]
    cx, cy, r = 40, 170, 90  # a huge planet rising from the lower left
    m = (xx - cx) ** 2 + (yy - cy) ** 2 <= r * r
    band = ((yy - cy + (xx - cx) * 0.25) // 7) % 3
    p.img[m] = np.where((band[m] == 0)[..., None], p.c(3), np.where((band[m] == 1)[..., None], p.c(5), p.c(6)))
    p.lock |= m
    rim = m & ((xx - cx) ** 2 + (yy - cy) ** 2 > (r - 2) ** 2) & (xx > cx - 20)
    p.img[rim] = p.c(4)
    p.circle(188, 36, 9, 9); p.circle(186, 34, 9, 10); p.px(190, 33, 7)  # a small blue moon
    # A little ship heading out, with an engine trail.
    sx, sy = 150, 70
    for dx, dy, c in [(0, 0, 8), (1, 0, 8), (2, 0, 8), (3, 1, 8), (1, 1, 9), (2, 1, 9), (0, 1, 9), (-1, 1, 3), (-2, 1, 4), (1, 2, 9)]:
        p.px(sx + dx, sy + dy, c)
    for k in range(3, 26):
        if k % 2:
            p.px(sx - k, sy + 1 + k // 8, 4 if k < 10 else 3)
    return p.done()


def isle_voyage(rng):
    p = Px(['#5ec8f2', '#9fe0ff', '#e4f7ff', '#1d7fb8', '#0f5a8a', '#0a3d62', '#2e9e57', '#1f6e3f', '#f2d69c', '#ffffff', '#7a4a2a', '#e86a4a'], rng)
    p.sky([(0, 0), (0.6, 1), (0.72, 2)])
    for (cx, cy, w) in [(40, 22, 30), (180, 14, 40), (120, 34, 22)]:  # puffy clouds
        for k in range(w):
            hh = int(6 * np.sin(np.pi * k / w)) + 2
            p.rect(cx + k - w // 2, cy - hh, 1, hh + 2, 9)
    hz = 96
    p.rect(0, hz, W, H - hz, 3)
    for y in range(hz, H):  # water bands getting darker and wider
        if (y - hz) % 5 == 0:
            p.rect(0, y, W, 1, 4 if y < 120 else 5)
    for _ in range(80):
        x, y = int(rng.random() * W), int(hz + 2 + rng.random() * (H - hz - 2))
        p.rect(x, y, 2 + int(rng.random() * 4), 1, 1)
    # Islands with palms.
    for (cx, w, hh) in [(40, 60, 14), (214, 40, 9)]:
        for k in range(w):
            h = int(hh * np.sin(np.pi * k / w) ** 0.6)
            p.rect(cx - w // 2 + k, hz - h, 1, h + 2, 6)
            p.rect(cx - w // 2 + k, hz, 1, 2, 8)
        for t in range(2):
            px_ = cx - 8 + t * 14
            for k in range(12):
                p.px(px_ + k // 5, hz - hh - k + 4, 10)
            for d in (-1, 1):
                for k in range(7):
                    p.px(px_ + 2 + d * k, hz - hh - 8 + abs(k - 3) // 2, 7)
    # A sailing boat off-centre right.
    bx, by = 160, hz + 6
    p.rect(bx, by, 14, 2, 10); p.rect(bx + 1, by + 2, 12, 1, 10)
    for k in range(14):
        p.rect(bx + 6, by - k, 1, 1, 10)
        p.rect(bx + 7, by - k, max(0, 8 - k // 2), 1, 9 if k > 2 else 11)
    return p.done()


def rain_street(rng):
    p = Px(['#070b14', '#0e1726', '#16233a', '#22324f', '#34d1e0', '#f25ca2', '#ffd166', '#5a6b8a', '#0b1220', '#9fb2d1', '#2c2147'], rng)
    p.sky([(0, 0), (0.7, 1), (1, 10)])
    x = 0
    while x < W:
        w = 18 + int(rng.random() * 22); h = 50 + int(rng.random() * 60)
        if 110 < x < 146:
            h = 40
        p.rect(x, 112 - h, w, h, 3 if (x // 7) % 2 else 2)
        p.rect(x, 112 - h, 1, h, 7)
        p.windows(x, 112 - h, w, h, [6, 9], None, 0.18)
        if rng.random() < 0.6:  # a vertical sign
            sx = x + w - 4; c = 4 if rng.random() < 0.5 else 5
            p.rect(sx, 112 - h + 8, 3, 18, c)
            for k in range(3):
                p.px(sx + 1, 112 - h + 10 + k * 5, 0)
        x += w
    p.rect(0, 112, W, H - 112, 8)
    # Reflections of the signs on the wet street, broken into dashes.
    src = p.img[60:112].copy()
    for i, y in enumerate(range(113, H)):
        row = src[-(i * 2 + 1) % src.shape[0]]
        for xx_ in range(0, W):
            if (xx_ + y) % 3 and (np.allclose(row[xx_], p.c(4)) or np.allclose(row[xx_], p.c(5)) or np.allclose(row[xx_], p.c(6))):
                p.img[y, xx_] = row[xx_] * 0.7
                p.lock[y, xx_] = True
    for _ in range(140):  # rain
        x, y = int(rng.random() * W), int(rng.random() * H)
        for k in range(3):
            p.px(x + k // 2, y + k, 9 if k == 0 else 7)
    return p.done()


def arcade_night(rng):
    p = Px(['#0a0612', '#1a0f2b', '#2b1748', '#ff4fa3', '#36e6ff', '#ffe066', '#7cff6b', '#110a1f', '#ffffff', '#3d2465', '#ff8a3d'], rng)
    p.sky([(0, 1), (1, 0)])
    p.rect(0, 0, W, 18, 2)
    for x in range(0, W, 12):  # a strip of marquee lights
        p.px(x + 3, 14, [3, 4, 5][(x // 12) % 3]); p.px(x + 9, 14, 8)
    p.rect(0, 110, W, H - 110, 7)
    for i in range(0, H - 110, 4):  # checker floor
        for x in range(0, W, 8):
            if (x // 8 + i // 4) % 2:
                p.rect(x, 110 + i, 8, 4, 9)
    # A row of cabinets on each side, the middle left open.
    for x in list(range(4, 100, 24)) + list(range(160, W, 24)):
        c = [3, 4, 6, 5, 10][(x // 24) % 5]
        p.rect(x, 40, 18, 70, 2)
        p.rect(x + 2, 44, 14, 6, c)                   # marquee
        p.rect(x + 3, 54, 12, 16, 0)                  # screen
        for k in range(5):                            # something on screen
            p.px(x + 4 + int(rng.random() * 10), 56 + int(rng.random() * 12), [4, 6, 5, 3][k % 4])
        p.rect(x + 2, 72, 14, 4, 9)                   # control panel
        p.px(x + 5, 73, 3); p.px(x + 9, 73, 4); p.px(x + 12, 73, 5)
        p.rect(x + 3, 78, 12, 32, 1)
    return p.done()


def starry_peaks(rng):
    p = Px(['#050817', '#0b1433', '#17245a', '#2c3c7a', '#e9f0ff', '#b8c7f0', '#0d1a3a', '#1e2c58', '#3c4f8f', '#ffffff', '#7a8fd0'], rng)
    p.sky([(0, 0), (0.5, 1), (1, 2)])
    p.stars(160, 0.6, [9, 5, 10], big=8)
    for k in range(60):  # a faint band of the milky way
        x = int(rng.random() * W); y = int(10 + x * 0.25 + (rng.random() - 0.5) * 20)
        p.px(x, y, 10)
    back = prof(rng, 92, 50, 70, sharp=True)
    p.below(back, 3)
    snow = np.arange(H)[:, None] < back[None, :] + 6
    m = (np.arange(H)[:, None] >= np.round(back)[None, :]) & snow
    p.img[m] = p.c(5); p.lock |= m
    p.below(prof(rng, 112, 30, 60, sharp=True), 7)
    p.below(prof(rng, 132, 18, 40), 6)
    return p.done()


def night_village(rng):
    p = Px(['#0a0f24', '#141c3d', '#24305c', '#ffd27a', '#ff9f43', '#3a2a40', '#5b3c48', '#1b2238', '#e8ecff', '#2b3a2e', '#8b5a3c', '#c9d3ff'], rng)
    p.sky([(0, 0), (0.6, 1), (1, 2)])
    p.stars(80, 0.5, [8, 11])
    p.circle(220, 24, 9, 8); p.circle(224, 22, 8, 1)  # crescent moon
    p.below(prof(rng, 100, 16, 80), 9)
    houses = [(10, 22, 16), (40, 18, 14), (66, 26, 20), (150, 20, 16), (176, 28, 22), (210, 22, 16), (236, 18, 13)]
    for (x, w, h) in houses:
        base = 118
        p.rect(x, base - h, w, h, 6)
        for k in range(w // 2 + 2):  # roof
            p.rect(x - 1 + k, base - h - k // 1 // 2 - 1, w + 2 - 2 * k, 1, 5) if w + 2 - 2 * k > 0 else None
        for wx in range(x + 3, x + w - 4, 7):
            p.rect(wx, base - h + 5, 3, 3, 3 if rng.random() < 0.7 else 7)
        p.rect(x + w // 2 - 1, base - 6, 3, 6, 10)
        if rng.random() < 0.6:  # a chimney with smoke
            cx = x + w - 5
            p.rect(cx, base - h - w // 3 - 4, 2, 5, 5)
            for k in range(6):
                p.px(cx + (k % 2), base - h - w // 3 - 6 - k * 2, 11)
    p.rect(0, 118, W, H - 118, 7)
    for x in range(100, 140, 2):  # a lantern-lit path through the middle
        p.px(x, 124 + (x % 4) // 2, 4)
    return p.done()


def crystal_kingdom(rng):
    p = Px(['#1a0b2e', '#2e1452', '#4c1d95', '#8b5cf6', '#c4b5fd', '#22d3ee', '#a5f3fc', '#0f0620', '#f0abfc', '#ffffff', '#3b1a66'], rng)
    p.sky([(0, 0), (0.6, 1), (1, 2)])
    p.stars(70, 0.55, [9, 6])
    hill = np.array([110 - 26 * np.exp(-((x - 200) / 40.0) ** 2) for x in range(W)])
    p.below(hill, 7)
    for x in range(W):
        p.px(x, int(round(hill[x])), 10)
    # A castle on the hill to the right.
    cx = 200
    p.rect(cx - 16, 62, 32, 24, 7)
    for tx in (cx - 18, cx - 4, cx + 10):
        p.rect(tx, 50, 8, 36, 7)
        for k in range(5):
            p.rect(tx + k // 2 + 0, 50 - k, 8 - k, 1, 3)
        p.px(tx + 3, 58, 6); p.px(tx + 4, 58, 6); p.px(tx + 3, 66, 5); p.px(tx + 4, 66, 5)
        p.rect(tx + 3, 44, 1, 6, 4)
    for x in range(cx - 16, cx + 16, 4):
        p.px(x, 61, 1)
    p.rect(cx - 3, 76, 6, 10, 7)
    # Glowing crystals in the foreground.
    for (x, h, c, hl) in [(18, 48, 5, 6), (32, 30, 3, 4), (46, 20, 8, 9), (70, 36, 5, 6), (90, 18, 3, 4), (244, 30, 8, 9)]:
        for k in range(h):
            half = max(0, (h - k) // 4 + (1 if k > h - 4 else 0))
            half = min(half, int(k * 0.5) + 1)
            p.rect(x - half, H - 6 - k, 2 * half + 1, 1, c)
            p.px(x - half, H - 6 - k, hl)
    p.rect(0, H - 6, W, 6, 7)
    return p.done()


def sunset_hills(rng):
    p = Px(['#ff8fab', '#ffb38a', '#ffd88a', '#fff2c2', '#6cc070', '#3f9a50', '#2a6b3a', '#1b4a2a', '#ffffff', '#ffe08a', '#a6d96a'], rng)
    p.sky([(0, 0), (0.4, 1), (0.65, 2), (0.8, 3)])
    p.circle(196, 74, 16, 9)
    for (cx, cy, w) in [(50, 26, 36), (150, 18, 30), (230, 34, 20)]:
        for k in range(w):
            hh = int(5 * np.sin(np.pi * k / w)) + 1
            p.rect(cx + k - w // 2, cy - hh, 1, hh + 1, 8)
            p.px(cx + k - w // 2, cy + 1, 3)
    for i, (base, amp, sc, col, top) in enumerate([(92, 18, 90, 4, 10), (110, 16, 70, 5, 4), (128, 12, 55, 6, 5)]):
        pr = base - (0.5 + 0.5 * np.sin(np.arange(W) / (sc / 3.0) + i * 2)) * amp
        p.below(pr, col)
        for x in range(W):  # a lit crest
            p.px(x, int(round(pr[x])), top)
    p.rect(0, 136, W, 8, 7)
    for x in range(0, W, 9):  # flowers in the front
        p.px(x + int(rng.random() * 5), 133 + int(rng.random() * 3), [8, 9, 0][x % 3])
    return p.done()


def snow_cabin(rng):
    p = Px(['#1b2a4a', '#2c4470', '#5d7ab0', '#dfe9ff', '#ffffff', '#a8bde6', '#3a2a22', '#6b4a33', '#ffcf6e', '#14304a', '#2a5a4a'], rng)
    p.sky([(0, 0), (0.6, 1), (1, 2)])
    p.below(prof(rng, 100, 24, 90), 5)
    p.below(np.full(W, 116), 3)
    for x in [14, 30, 46, 210, 228, 246]:
        p.tree(x, 116, 30 + int(rng.random() * 10), 10, 9)
        for k in range(0, 30, 6):  # snow on the branches
            p.px(x - k // 3, 116 - 30 + k + 2, 4)
    # The cabin, right of centre.
    cx = 176
    p.rect(cx, 96, 28, 20, 7)
    for k in range(16):
        p.rect(cx - 3 + k, 96 - k // 2, 34 - 2 * k, 1, 4) if 34 - 2 * k > 0 else None
    p.rect(cx + 4, 102, 6, 6, 8); p.rect(cx + 18, 102, 6, 6, 8)
    p.rect(cx + 12, 106, 4, 10, 6)
    p.rect(cx + 22, 84, 3, 8, 6)
    for k in range(8):
        p.px(cx + 23 + (k % 2), 82 - k * 2, 5)
    for _ in range(220):
        p.px(rng.random() * W, rng.random() * H, 4 if rng.random() < 0.6 else 5)
    return p.done()


def desert_oasis(rng):
    p = Px(['#ffb26b', '#ffd38c', '#fff0c4', '#e8a35a', '#c9793f', '#9c5530', '#2f8f6a', '#1f6b4e', '#3ab0c8', '#7ad7e8', '#ffffff', '#6b3a22'], rng)
    p.sky([(0, 0), (0.5, 1), (0.75, 2)])
    p.circle(60, 40, 14, 10)
    for i, (base, amp, col) in enumerate([(96, 14, 3), (114, 16, 4), (134, 12, 5)]):
        pr = base - (0.5 + 0.5 * np.sin(np.arange(W) / (26.0 + i * 8) + i)) ** 2 * amp
        p.below(pr, col)
    # The oasis pool, right of centre, with palms.
    for y in range(112, 122):
        half = int(26 * np.sqrt(max(0, 1 - ((y - 117) / 6.0) ** 2)))
        p.rect(196 - half, y, 2 * half, 1, 8 if y < 116 else 9)
    for px_ in (178, 214):
        for k in range(22):
            p.px(px_ + k // 7, 112 - k, 11)
        for d in (-1, 1):
            for k in range(9):
                p.px(px_ + 3 + d * k, 90 + abs(k - 4) // 2, 7 if k % 2 else 6)
    return p.done()


def cherry_temple(rng):
    p = Px(['#ffe3ec', '#ffc2d4', '#ff9bbb', '#e8638f', '#7a2a3a', '#3a1a22', '#c43a3a', '#f2f2f2', '#9ad0a0', '#4a8a5a', '#2a1418', '#ffd27a'], rng)
    p.sky([(0, 0), (0.6, 1), (1, 1)])
    p.circle(60, 40, 18, 7)
    p.below(prof(rng, 110, 12, 80), 9)
    # A pagoda on the right.
    cx = 196
    for t, (w, y) in enumerate([(44, 98), (36, 82), (28, 66), (20, 50)]):
        p.rect(cx - w // 2 + 4, y, w - 8, 12, 6 if t % 2 == 0 else 4)
        p.rect(cx - w // 2, y - 2, w, 2, 5)
        p.px(cx - w // 2 - 1, y - 3, 5); p.px(cx + w // 2, y - 3, 5)
    p.rect(cx, 38, 1, 12, 5)
    p.rect(cx - 2, 104, 5, 6, 10)
    # Blossom trees on the left with falling petals.
    for (tx, h) in [(24, 40), (64, 30), (100, 24)]:
        p.rect(tx, 110 - h, 2, h, 4)
        for _ in range(170):
            a = rng.random() * 2 * np.pi; r = rng.random() ** 0.5 * h * 0.55
            p.px(tx + np.cos(a) * r * 1.3, 110 - h + np.sin(a) * r * 0.8, [1, 2, 3][int(rng.random() * 3)])
    for _ in range(70):
        p.px(rng.random() * W, rng.random() * H, 2)
    p.rect(0, 120, W, H - 120, 9)
    return p.done()


def deep_sea(rng):
    p = Px(['#032a4a', '#04406a', '#0a5a8a', '#0e7aa8', '#5fd3e8', '#bff3ff', '#021a30', '#f27a54', '#ffd166', '#2a8a6a', '#145a48', '#e86ab0'], rng)
    p.sky([(0, 3), (0.4, 2), (0.8, 1), (1, 0)])
    yy, xx = np.mgrid[0:H, 0:W]
    for k in range(4):  # thin light rays from the surface, fading with depth
        x0 = 20 + k * 64
        m = (np.abs(xx - x0 - yy * 0.35) < 1 + yy * 0.02) & (yy < 70 - k * 6) & ((yy * 7 + xx * 3) % 5 < 2)
        p.img[m] = p.c(3 if k % 2 else 2); p.lock |= m
    for _ in range(30):  # bubbles
        x, y = rng.random() * W, rng.random() * H
        p.px(x, y, 5)
    p.below(prof(rng, 128, 16, 60), 6)
    for x in list(range(8, 100, 7)) + list(range(170, W, 7)):  # kelp
        h = 20 + int(rng.random() * 34)
        for k in range(h):
            p.px(x + int(np.sin(k / 4.0 + x) * 1.5), 130 - k, 9 if k % 5 else 10)
    for (fx, fy, c) in [(60, 50, 7), (190, 40, 8), (210, 70, 11), (40, 84, 8)]:  # little fish
        for dx, dy in [(0, 0), (1, 0), (2, 0), (1, -1), (1, 1), (-1, -1), (-1, 1), (3, 0)]:
            p.px(fx + dx, fy + dy, c)
        p.px(fx + 2, fy, 6)
    return p.done()


def volcano_isle(rng):
    p = Px(['#1a0a10', '#3a1020', '#6a1a24', '#b8321f', '#ff6a2a', '#ffb347', '#ffe08a', '#2a1a1a', '#4a2a26', '#120808', '#7a6a6a'], rng)
    p.sky([(0, 0), (0.5, 1), (0.85, 2), (1, 3)])
    yy, xx = np.mgrid[0:H, 0:W]
    cx = 186
    cone = np.array([118 - max(0, 70 - abs(x - cx) * 1.1) for x in range(W)])
    cone = np.maximum(cone, 48)
    p.below(cone, 8)
    for y in range(48, 118):  # lava rivers down the slope
        for s in (-1, 1):
            x = int(cx + s * (y - 48) * 0.5 + np.sin(y / 5.0) * 2)
            p.px(x, y, 4 if y % 3 else 5)
    p.rect(cx - 7, 46, 14, 3, 5)
    for k in range(40):  # ash plume
        p.rect(cx - 4 + int(np.sin(k / 5.0) * 6) - k // 6, 44 - k, 8 + k // 3, 1, 10 if k % 3 else 7)
    for _ in range(30):  # embers
        p.px(cx + (rng.random() - 0.5) * 60, 10 + rng.random() * 40, [5, 6][int(rng.random() * 2)])
    p.rect(0, 118, W, H - 118, 9)
    for x in range(0, W, 3):
        if rng.random() < 0.35:
            p.px(x, 118 + int(rng.random() * 20), 3)
    return p.done()


SCENES = [
    ('metropolis', 'Neon Metropolis', neon_metropolis, 31),
    ('synth', 'Synth Horizon', synth_horizon, 32),
    ('fireflies', 'Firefly Woods', firefly_woods, 33),
    ('planetrise', 'Planet Rise', planet_rise, 34),
    ('voyage', 'Isle Voyage', isle_voyage, 35),
    ('rainstreet', 'Rain Street', rain_street, 36),
    ('arcade', 'Arcade Night', arcade_night, 37),
    ('peaks', 'Starry Peaks', starry_peaks, 38),
    ('village', 'Night Village', night_village, 39),
    ('kingdom', 'Crystal Kingdom', crystal_kingdom, 40),
    ('hills', 'Sunset Hills', sunset_hills, 41),
    ('cabin', 'Snow Cabin', snow_cabin, 42),
    ('oasis', 'Desert Oasis', desert_oasis, 43),
    ('temple', 'Cherry Temple', cherry_temple, 44),
    ('deepsea', 'Deep Sea', deep_sea, 45),
    ('volcano', 'Volcano Isle', volcano_isle, 46),
]

if __name__ == '__main__':
    out = sys.argv[1]
    only = sys.argv[2:] or None
    os.makedirs(out, exist_ok=True)
    for sid, name, fn, seed in SCENES:
        if only and sid not in only:
            continue
        Image.fromarray(fn(np.random.default_rng(seed))).save(os.path.join(out, sid + '.png'), optimize=True)
        print('rendered', sid)
