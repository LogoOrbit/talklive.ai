# Sound design for the ad, mixed over the music bed -> mix.wav (48 kHz stereo).
import numpy as np, wave
from scipy.signal import butter, sosfilt
SR = 48000
rng = np.random.default_rng(3)

def read(path):
    w = wave.open(path); x = np.frombuffer(w.readframes(w.getnframes()), '<i2').reshape(-1, w.getnchannels()) / 32768
    return x if x.shape[1] == 2 else np.repeat(x, 2, 1)

def t_(d): return np.arange(int(d * SR)) / SR
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'bandpass', fs=SR, output='sos'), x)
def st(x, pan=0.0):
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    return np.stack([x * l * 1.414, x * r * 1.414], 1)

def tap():
    t = t_(0.06)
    x = np.sin(2 * np.pi * 1900 * t) * np.exp(-t / 0.010) * 0.5 + np.sin(2 * np.pi * 260 * t) * np.exp(-t / 0.018) * 0.6
    return st(x * 1.0)
def pop(f0=520, f1=1150, d=0.11, g=0.6):
    t = t_(d); f = f0 + (f1 - f0) * (1 - np.exp(-t / 0.018))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.045)
    return st(x * g)
def swish(d=0.16, lo=1800, hi=7000, g=0.35, pan=0.0):
    t = t_(d); n = rng.standard_normal(len(t))
    x = bp(n, lo, hi) * np.sin(np.pi * t / d) ** 2
    return st(x * g, pan)
def whoosh(d=0.38, g=0.32, up=False):
    t = t_(d); n = rng.standard_normal(len(t)); y = np.zeros_like(n)
    blk = 512
    for i in range(0, len(n), blk):
        k = i / len(n); fc = (700 + 3200 * k) if up else (900 + 2600 * np.sin(np.pi * k))
        y[i:i + blk] = bp(n[i:i + blk + 0], fc * 0.6, min(fc * 1.6, 20000))
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5
    x = y * env * g
    pan = np.linspace(-0.6, 0.6, len(t))
    return np.stack([x * np.cos((pan + 1) * np.pi / 4) * 1.414, x * np.sin((pan + 1) * np.pi / 4) * 1.414], 1)
def thud(g=0.8):
    t = t_(0.35); f = 48 + 70 * np.exp(-t / 0.03)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.12) + bp(rng.standard_normal(len(t)), 800, 4000) * np.exp(-t / 0.006) * 0.3
    return st(np.tanh(1.5 * x) * g)
def chime():
    out = np.zeros((int(0.8 * SR), 2))
    for i, f in enumerate([659.25, 880.0]):
        t = t_(0.7)
        x = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2.0 * t) + 0.12 * np.sin(2 * np.pi * f * 2.76 * t)) * np.exp(-t / 0.22) * np.minimum(1, t / 0.004)
        a = int(i * 0.075 * SR); out[a:a + len(t)] += st(x * 0.32, -0.2 + 0.4 * i)
    return out
def sparkle():
    out = np.zeros((int(0.7 * SR), 2))
    for k in range(9):
        f = rng.uniform(2400, 5200); d0 = rng.uniform(0, 0.4); t = t_(0.18)
        x = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.05) * 0.16
        a = int(d0 * SR); out[a:a + len(t)] += st(x, rng.uniform(-0.8, 0.8))
    return out
def tick():
    t = t_(0.03); return st(np.sin(2 * np.pi * 3600 * t) * np.exp(-t / 0.006) * 0.6)

music = read('music.wav') * 0.9
N = len(music)
fx = np.zeros_like(music)
def at(time, s, g=1.0, fade_out_at=None):
    i = int(time * SR); j = min(N, i + len(s)); seg = s[: j - i].copy() * g
    if fade_out_at is not None:
        k = int((fade_out_at - time) * SR)
        if 0 < k < len(seg):
            f = int(0.12 * SR); seg[k:] = 0; seg[max(0, k - f):k] *= np.linspace(1, 0, min(f, k))[:, None]
    fx[i:j] += seg

# The app's own sounds (res/raw), decoded once.
import os, subprocess
RAW = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../android-native/app/src/main/res/raw')
for n in ('tl_message', 'tl_friend', 'tl_ring'):
    if not os.path.exists(n + '.wav'):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(RAW, n + '.ogg'), '-ar', '48000', '-ac', '2', n + '.wav'], check=True)
msg, friend, ring = read('tl_message.wav'), read('tl_friend.wav'), read('tl_ring.wav')
# Hook
at(0.30, tap()); at(0.42, whoosh(0.3, 0.22, up=True)); at(1.50, chime()); at(1.50, whoosh(0.3, 0.25))
# Problem: pops per line, swishes for the strikes, a whoosh out.
for k in range(4): at(3.25 + 0.5 * k, pop(480 + 40 * k, 1100 + 60 * k))
for k in range(4): at(5.25 + 0.07 * k, swish(0.13, pan=-0.4 + 0.25 * k))
at(5.68, whoosh(0.32, 0.3))
# Punchline words land.
for k in range(3): at(6.0 + 0.5 * k, thud(0.55 + 0.1 * k))
# Reveal chips.
for k in range(3): at(9.0 + 0.2 * k, pop(600, 1300, g=0.5))
# Feature cuts.
at(10.0, whoosh(0.34, 0.34, up=True)); at(10.45, whoosh(0.4, 0.16))
for c in [12.0, 14.0, 16.0, 18.0, 20.0, 22.0, 24.0, 26.0, 28.0]: at(c - 0.05, whoosh(0.28, 0.2))
for tt in [12.15, 13.05, 13.80]: at(tt, msg, 0.8)
for tt in [12.45, 13.35]: at(tt, pop(700, 1500, 0.09, 0.45))
for tt in [14.30, 14.90, 15.50]: at(tt, pop(560, 1200, 0.1, 0.55))
for tt in [14.60, 15.20]: at(tt, pop(420, 900, 0.1, 0.4))
at(15.50, sparkle(), 1.0); at(15.52, chime(), 0.7)
at(16.68, tap()); at(16.85, friend, 0.9)
at(18.0, ring, 1.0, fade_out_at=19.9); at(19.55, tap())
for tt in [22.28, 22.61, 22.95, 23.28, 23.61]: at(tt, tap(), 0.8); at(tt + 0.02, tick())
at(24.0, whoosh(0.3, 0.22, up=True)); at(26.0, whoosh(0.3, 0.22, up=True)); at(26.72, swish(0.22, 900, 4000, 0.3))
at(30.45, pop(500, 1300, 0.14, 0.6))
for tt in [31.6, 33.1]: at(tt, tap())

# Duck the music under the moments that need to be heard.
duck = np.zeros(N)
for t0, t1, db in [(1.48, 2.1, -3), (12.1, 14.0, -3), (15.45, 16.1, -3), (16.8, 17.7, -4), (18.0, 19.9, -6), (19.5, 19.8, -2)]:
    a, b = int(t0 * SR), int(t1 * SR)
    duck[a:b] = np.minimum(duck[a:b], db)
# smooth (30 ms attack / 150 ms release) via one-pole filters both ways
from scipy.signal import lfilter
k = np.exp(-1 / (0.06 * SR))
sm = lfilter([1 - k], [1, -k], duck); sm = lfilter([1 - k], [1, -k], sm[::-1])[::-1]
music = music * (10 ** (sm / 20))[:, None]
mixd = music + fx * 0.85
peak = np.max(np.abs(mixd)); mixd = mixd / max(peak, 1e-9) * 0.97
with wave.open('mix.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mixd * 32767).astype('<i2').tobytes())
print('mix.wav', len(mixd) / SR, 's, peak was', round(peak, 3))
