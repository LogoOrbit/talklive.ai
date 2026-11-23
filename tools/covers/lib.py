"""Shared drawing helpers for the TalkLive cover renderer (numpy, float RGB 0..1)."""
import numpy as np

def hexc(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)])

def canvas(w, h):
    return np.zeros((h, w, 3))

def grad_v(img, stops):
    """Vertical gradient. stops: [(t, '#hex'), ...] with t in 0..1 from top."""
    h = img.shape[0]
    ys = np.linspace(0, 1, h)
    ts = [s[0] for s in stops]
    for c in range(3):
        vals = [hexc(s[1])[c] for s in stops]
        img[:, :, c] = np.interp(ys, ts, vals)[:, None]
    return img

def lerp(a, b, t):
    return a + (b - a) * t

# --- noise -------------------------------------------------------------------
def _smooth(t):
    return t * t * (3 - 2 * t)

def value_noise2(w, h, scale, rng):
    gw, gh = int(w / scale) + 3, int(h / scale) + 3
    g = rng.random((gh, gw))
    ys = np.arange(h) / scale
    xs = np.arange(w) / scale
    y0 = np.floor(ys).astype(int); x0 = np.floor(xs).astype(int)
    fy = _smooth(ys - y0)[:, None]; fx = _smooth(xs - x0)[None, :]
    a = g[y0][:, x0]; b = g[y0][:, x0 + 1]; c = g[y0 + 1][:, x0]; d = g[y0 + 1][:, x0 + 1]
    return lerp(lerp(a, b, fx), lerp(c, d, fx), fy)

def fbm2(w, h, scale, rng, octaves=5, gain=0.5):
    out = np.zeros((h, w)); amp = 1.0; tot = 0
    for _ in range(octaves):
        out += value_noise2(w, h, max(scale, 1.0), rng) * amp
        tot += amp; amp *= gain; scale /= 2
    return out / tot

def value_noise1(n, scale, rng):
    g = rng.random(int(n / scale) + 3)
    xs = np.arange(n) / scale
    x0 = np.floor(xs).astype(int); f = _smooth(xs - x0)
    return lerp(g[x0], g[x0 + 1], f)

def fbm1(n, scale, rng, octaves=6, gain=0.5):
    out = np.zeros(n); amp = 1.0; tot = 0
    for _ in range(octaves):
        out += value_noise1(n, max(scale, 1.0), rng) * amp
        tot += amp; amp *= gain; scale /= 2
    return out / tot

def ridge1(n, scale, rng, octaves=6):
    """Sharper mountain-like profile (ridged)."""
    out = np.zeros(n); amp = 1.0; tot = 0
    for _ in range(octaves):
        v = value_noise1(n, max(scale, 1.0), rng)
        out += (1 - np.abs(v * 2 - 1)) * amp
        tot += amp; amp *= 0.5; scale /= 2
    return out / tot

# --- compositing -------------------------------------------------------------
def blend(img, color, mask):
    m = np.clip(mask, 0, 1)[..., None]
    img[:] = img * (1 - m) + np.asarray(color) * m
    return img

def add(img, color, mask):
    img[:] = img + np.asarray(color) * np.clip(mask, 0, None)[..., None]
    return img

def screen(img, color, mask):
    c = np.asarray(color) * np.clip(mask, 0, 1)[..., None]
    img[:] = 1 - (1 - img) * (1 - c)
    return img

def coords(img):
    h, w = img.shape[:2]
    return np.mgrid[0:h, 0:w].astype(float)  # yy, xx

def radial(img, cx, cy, r):
    yy, xx = coords(img)
    return np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / r

def glow(img, cx, cy, r, color, strength=1.0, power=2.0):
    d = radial(img, cx, cy, r)
    add(img, color, strength * np.exp(-d ** power))
    return img

def disc(img, cx, cy, r, color, soft=1.5):
    d = radial(img, cx, cy, 1.0)
    m = np.clip((r - d) / soft + 0.5, 0, 1)
    blend(img, color, m)
    return m

def fill_below(img, profile_y, color, soft=1.0):
    """Fill everything below a per-column y profile."""
    h = img.shape[0]
    yy = np.arange(h)[:, None]
    m = np.clip((yy - profile_y[None, :]) / soft + 0.5, 0, 1)
    blend(img, color, m)
    return m

def stars(img, rng, n, ymax=1.0, bright=1.0, tint=None, size_px=1.0):
    h, w = img.shape[:2]
    xs = rng.random(n) * w; ys = rng.random(n) * h * ymax
    mags = rng.random(n) ** 6 * bright
    for x, y, m in zip(xs, ys, mags):
        col = np.array(tint if tint is not None else [1, 1, 1]) * (0.85 + 0.15 * rng.random(3))
        r = size_px * (0.6 + 2.2 * m)
        x0, x1 = int(max(0, x - r * 4)), int(min(w, x + r * 4 + 1))
        y0, y1 = int(max(0, y - r * 4)), int(min(h, y + r * 4 + 1))
        if x1 <= x0 or y1 <= y0:
            continue
        yy, xx = np.mgrid[y0:y1, x0:x1]
        d2 = ((xx - x) ** 2 + (yy - y) ** 2) / (r * r)
        img[y0:y1, x0:x1] += col * (0.25 + m) * np.exp(-d2 * 1.8)[..., None]
    return img

def vignette(img, strength=0.35):
    h, w = img.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    img *= (1 - strength * np.clip(d - 0.55, 0, None) ** 1.5)[..., None]
    return img

def grain(img, rng, amount=0.018):
    img += (rng.random(img.shape[:2]) - 0.5)[..., None] * amount
    return img

def tonemap(img, exposure=1.0):
    """Soft highlight roll-off so glows bloom instead of clipping hard."""
    x = img * exposure
    return np.where(x < 0.8, x, 0.8 + (1 - np.exp(-(x - 0.8) * 5)) * 0.2)

def blur_h(a, r):
    if r <= 0:
        return a
    k = np.exp(-np.linspace(-2, 2, 2 * r + 1) ** 2); k /= k.sum()
    pad = np.pad(a, [(0, 0), (r, r)] + [(0, 0)] * (a.ndim - 2), mode='edge')
    out = np.zeros_like(a)
    for i, kv in enumerate(k):
        out += kv * pad[:, i:i + a.shape[1]]
    return out

def blur(a, r):
    if r <= 0:
        return a
    b = blur_h(a, r)
    return np.swapaxes(blur_h(np.swapaxes(b, 0, 1), r), 0, 1)

def to_u8(img):
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)
