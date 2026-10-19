"""Synthesizes the music and sound effects for earphones.html and mixes them with the voiceover.

    python mix_earphones.py <vo_dir> <out.wav>

<vo_dir> holds 00.wav .. 10.wav from make_vo.py. Line times come from vo_timing.json (vo_timing.py),
cue times from events.json (node render-earphones.js events).
Every sound here is generated from scratch: no samples.
"""
import json, sys, os
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve, resample_poly

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
cues = json.load(open(os.path.join(HERE, 'events.json')))
DUR = cues['duration']
N = int(DUR * SR)
rng = np.random.default_rng(11)
BEAT = 0.5
MU = next(e for e in cues['events'] if e['type'] == 'music')
SNAP, BUD_L, START, DROP, END, G0 = MU['snap'], MU['budL'], MU['start'], MU['drop'], MU['end'], MU['grid']
GAP = MU['gap']
VO_AT = [l['at'] for l in json.load(open(os.path.join(HERE, 'vo_timing.json')))]


def T(d): return np.arange(int(d * SR)) / SR
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def filt(x, kind, f, order=2):
    sos = butter(order, f, btype=kind, fs=SR, output='sos')
    return sosfilt(sos, x, axis=0)
def stereo(x, pan=0.0):
    a = (pan + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], axis=1) * np.sqrt(2)
def add(buf, x, t0, g=1.0, pan=0.0):
    if x.ndim == 1: x = stereo(x, pan)
    i = int(round(t0 * SR))
    if i < 0: x, i = x[-i:], 0
    n = min(len(x), len(buf) - i)
    if n > 0: buf[i:i + n] += x[:n] * g
def env(n, a, d):  # attack / exponential decay
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)
def noise(d): return rng.standard_normal(int(d * SR))
def svf_sweep(x, f0, f1, q=0.7, shape=None):
    """Time-varying state-variable band-pass from f0 to f1 (Hz), optional per-sample frequency array."""
    n = len(x); f = shape if shape is not None else np.geomspace(f0, f1, n)
    F = 2 * np.sin(np.pi * np.minimum(f, SR / 6) / SR); low = band = 0.0; out = np.empty(n)
    for i in range(n):
        low += F[i] * band; high = x[i] - low - q * band; band += F[i] * high; out[i] = band
    return out

IR = None
def reverb(x, wet=0.3, length=1.8):
    global IR
    if IR is None:
        n = int(length * SR); t = np.arange(n) / SR
        IR = np.stack([filt(rng.standard_normal(n), 'low', 6000) * np.exp(-t * 3.2) for _ in range(2)], axis=1)
        IR /= np.sqrt((IR ** 2).sum(axis=0))
    if x.ndim == 1: x = stereo(x)
    w = np.stack([fftconvolve(x[:, c], IR[:, c])[:len(x)] for c in range(2)], axis=1)
    return x * (1 - wet) + w * wet

# ---------------- instruments ----------------
def kick():
    t = T(0.45); f = 44 + 120 * np.exp(-t * 32)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    click = filt(noise(0.45), 'high', 3000) * np.exp(-t * 400) * 0.4
    return np.tanh((body + click) * 1.6) * 0.9
def clap():
    t = T(0.35); n = filt(noise(0.35), 'band', [900, 5000])
    e = sum(np.exp(-np.maximum(t - o, 0) * 60) * (t >= o) for o in (0, 0.011, 0.023)) * 0.5 + np.exp(-t * 18) * 0.6 * (t >= 0.023)
    return n * e * 0.55 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.25
def hat(open_=False):
    d = 0.22 if open_ else 0.06; t = T(d)
    return filt(noise(d), 'high', 7500) * np.exp(-t * (14 if open_ else 70)) * (0.32 if open_ else 0.26)
def bass_note(m, d):
    t = T(d); f = hz(m)
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sign(np.sin(2 * np.pi * f * t))
    x = filt(x, 'low', 420) * np.minimum(1, t / 0.005) * np.minimum(1, (d - t) / 0.03)
    return np.tanh(x * 1.3) * 0.5
def pad_chord(ms, d):
    t = T(d); x = np.zeros((len(t), 2))
    for m in ms:
        for k, det in enumerate((-0.09, -0.03, 0.03, 0.09)):
            f = hz(m) * 2 ** (det / 12); ph = rng.random() * 2 * np.pi
            saw = 2 * ((f * t + ph / (2 * np.pi)) % 1) - 1
            x[:, k % 2] += saw
    x = filt(x, 'low', 2200) / (len(ms) * 2)
    a = np.minimum(1, t / 0.25) * np.minimum(1, (d - t) / 0.3)
    return x * a[:, None] * 0.35
def pluck(m, d=0.45, bright=1.0):
    t = T(d); f = hz(m); x = np.zeros_like(t)
    for k in range(1, 14):
        if f * k > 16000: break
        x += (1 / k) * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (6 + k * 2.6 / bright))
    return x * np.minimum(1, t / 0.002) * 0.22
def bell(m, d=1.2, ratio=3.5, idx=2.2):
    t = T(d); f = hz(m)
    return np.sin(2 * np.pi * f * t + idx * np.exp(-t * 4) * np.sin(2 * np.pi * f * ratio * t)) * np.exp(-t * 3.2) * np.minimum(1, t / 0.003) * 0.3

# ---------------- music ----------------
PROG = [  # (pad voicing, bass root, arp/lead tones) per 2s bar; bars start at G0 + 2k
    ([53, 57, 60, 64, 67], 41, [65, 69, 72, 76, 79]),   # Fmaj9
    ([52, 57, 60, 64, 67], 45, [64, 69, 72, 76, 79]),   # Am7
    ([50, 53, 57, 60, 64], 38, [62, 65, 69, 72, 76]),   # Dm9
    ([53, 57, 58, 62, 65], 46, [65, 70, 74, 77, 81]),   # Bbmaj7
]
LEAD = [[(0, 69), (1, 72), (1.5, 77), (2.5, 76)], [(0, 76), (1, 72), (1.5, 69), (2.5, 67)],
        [(0, 77), (1, 76), (1.5, 74), (2.5, 69)], [(0, 74), (1, 72), (1.5, 69), (2.5, 65)]]
def bars(t0, t1):
    b = int(np.floor((t0 - G0) / 2))
    while G0 + 2 * b < t1:
        yield b, G0 + 2 * b; b += 1

hookpad = np.zeros((N, 2)); groove = np.zeros((N, 2)); drums = np.zeros((N, 2)); lead = np.zeros((N, 2))
kicks = []
K, C, HC, HO = kick(), clap(), hat(), hat(True)
for b, s in bars(-2, DUR):
    pad, root, tones = PROG[b % 4]
    if s < START: add(hookpad, pad_chord(pad, 2.3), s, 1.0)
    if START - 0.5 <= s < END: add(groove, pad_chord(pad, 2.2), s, 0.9)
    for beat in range(4):
        tb = s + beat * BEAT
        if tb < START - 0.01 or tb >= END: continue
        if GAP[0] - 0.01 <= tb < GAP[1] - 0.01: continue  # gap before the drop
        add(drums, K, tb, 1.0); kicks.append(tb)
        if beat in (1, 3): add(drums, C, tb, 0.8, 0.05)
        add(drums, HO, tb + 0.25, 0.7, 0.25)
        if tb >= SNAP:
            add(drums, HC, tb, 0.6, -0.3); add(drums, HC, tb + 0.125, 0.45, -0.3); add(drums, HC, tb + 0.375, 0.45, -0.3)
        for e in (0.25,):  # off-beat bass
            add(groove, bass_note(root + (12 if beat == 3 else 0), 0.22), tb + e, 1.0)
    # arpeggio after the headphones go on
    if s + 2 > SNAP and s < DUR - 0.5:
        pat = [0, 1, 2, 3, 4, 3, 2, 1, 0, 2, 4, 2, 1, 3, 4, 3]
        for i, k in enumerate(pat):
            tn = s + i * 0.125
            if tn < SNAP or tn >= DUR - 0.6: continue
            slow = tn >= END
            if slow and i % 2: continue
            add(lead if tn >= DROP else groove, pluck(tones[k], 0.5 if not slow else 0.9), tn, 0.55, -0.35 + 0.7 * (i % 2))
    # lead bell in the world / good time / outro
    if DROP <= s + 2 and s < END:
        for off, m in LEAD[b % 4]:
            tn = s + off * BEAT
            if DROP <= tn < END: add(lead, bell(m + 12, 1.0), tn, 0.5, 0.15)
# drum fill into the first downbeat, and the final chord
for i in range(8): add(drums, C, START - 0.5 + i * 0.0625, 0.15 + 0.08 * i, 0.05)
add(groove, pad_chord(PROG[0][0] + [72], DUR - END), END, 1.4)
for i, m in enumerate([65, 69, 72, 76, 81]): add(lead, bell(m, 2.6, 2.0, 1.2), END + i * 0.05, 0.4, -0.4 + 0.2 * i)
add(drums, K, END, 1.0)

# sidechain pump on pad + bass
sc = np.ones(N); tt = np.arange(N) / SR
for k in kicks:
    i = int(k * SR); n = min(int(0.3 * SR), N - i); sc[i:i + n] = np.minimum(sc[i:i + n], 1 - 0.55 * np.exp(-np.arange(n) / SR / 0.09))
groove *= sc[:, None]
groove = reverb(groove, 0.22) + drums
lead = reverb(lead, 0.35)

# muffled until the headphones go on, then it opens up
muff = filt(groove.mean(axis=1, keepdims=True).repeat(2, axis=1), 'low', 750, 4) * 1.15
mid = filt(groove, 'low', 2600, 2)
x = np.clip((tt - (BUD_L - 0.15)) / (SNAP - BUD_L + 0.15), 0, 1)
wm, wd, wf = (1 - x) ** 2, 2 * x * (1 - x), x ** 2
wf[tt >= SNAP] = 1; wm[tt >= SNAP] = 0; wd[tt >= SNAP] = 0
music = muff * wm[:, None] * 0.75 + mid * wd[:, None] * 0.9 + groove * wf[:, None]
hp_dull = filt(hookpad, "low", 520, 2) * 3.0
BEST = next(e['t'] for e in cues['events'] if e['type'] == 'burst')
bright = np.clip((tt - BEST) / 0.2, 0, 1)[:, None]
music += hp_dull * (1 - bright) + reverb(hookpad, 0.4) * bright * 0.9
music += lead
fade = np.clip((DUR - tt) / 1.4, 0, 1) ** 1.5
music *= fade[:, None]

# ---------------- sound effects ----------------
sfx = np.zeros((N, 2))
def whoosh(d=0.45, f0=300, f1=4000, g=0.5, up=False):
    n = int(d * SR); u = np.linspace(0, 1, n)
    f = f0 * (f1 / f0) ** (u if up else np.sin(u * np.pi) ** 0.8)
    x = svf_sweep(noise(d), 0, 0, 0.5, f) * np.sin(u * np.pi) ** 1.6
    return x / (np.abs(x).max() + 1e-9) * g
def impact(g=1.0, sub=48):
    t = T(1.6); f = sub + 60 * np.exp(-t * 20)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.4)
    n = filt(noise(1.6), 'low', 1800) * np.exp(-t * 7) * 0.5
    return reverb(np.tanh((s + n) * 1.4) * g, 0.25)
def sparkle(d=0.8, n=18, lo=84, hi=100, g=0.25):
    out = np.zeros(int((d + 0.8) * SR))
    for i in range(n):
        o = int(rng.random() * d * SR); b = bell(rng.integers(lo, hi), 0.6, 2.0, 1.0)
        out[o:o + len(b)] += b * (0.4 + 0.6 * rng.random())
    return reverb(out * g, 0.4)
def click(f=2500, d=0.03, g=0.3):
    t = T(d); return (filt(noise(d), 'band', [f * 0.6, f * 1.6]) * np.exp(-t * 300) + np.sin(2 * np.pi * f * 0.4 * t) * np.exp(-t * 200) * 0.5) * g
def pop(f0=300, f1=900, d=0.09, g=0.4):
    t = T(d); f = f0 + (f1 - f0) * (1 - np.exp(-t * 60))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 40) * np.minimum(1, t / 0.002) * g
def riser(d, g=0.5):
    n = int(d * SR); u = np.linspace(0, 1, n)
    nz = svf_sweep(noise(d), 0, 0, 0.4, 400 * (25 ** u)) * u ** 2
    t = T(d); f = 180 * (6 ** u); saw = (2 * ((np.cumsum(f) / SR) % 1) - 1) * u ** 2.5 * 0.15
    x = nz / (np.abs(nz).max() + 1e-9) * 0.6 + filt(saw, 'low', 3000)
    return reverb(x * g, 0.3)
def rumble(d, lp=160, g=0.25, hum=0):
    t = T(d); x = filt(np.cumsum(noise(d)) * 0.02, 'low', lp, 2); x -= filt(x, 'low', 20, 1)
    if hum: x = x + 0.15 * np.sin(2 * np.pi * hum * t) * (1 + 0.3 * np.sin(2 * np.pi * 7 * t))
    x /= np.abs(x).max() + 1e-9
    return x * np.minimum(1, t / 0.3) * np.minimum(1, (d - t) / 0.3) * g
def crickets(d, g=0.06):
    t = T(d); gate = (np.sin(2 * np.pi * 28 * t) > 0.3) * (np.sin(2 * np.pi * 1.6 * t) > 0)
    return np.sin(2 * np.pi * 4600 * t) * filt(gate.astype(float), 'low', 300) * g

def S(*xs):
    out = np.zeros(max(len(x) for x in xs))
    for x in xs: out[:len(x)] += x
    return out

ticks = 0
for e in cues['events']:
    t0, ty = e['t'], e['type']
    if ty == 'boom': add(sfx, impact(0.9, 42), t0)
    elif ty == 'tick': add(sfx, S(click(3200, 0.04, 0.22 if e.get('soft') else 0.45), click(1400, 0.02, 0.1)), t0, 1, 0.15)
    elif ty == 'riser': add(sfx, riser(e['dur'], 0.45), t0)
    elif ty == 'burst': add(sfx, impact(0.6, 60), t0); add(sfx, sparkle(0.6, 22, 86, 103, 0.35), t0)
    elif ty in ('whoosh', 'swoosh'): add(sfx, whoosh(0.5 if ty == 'whoosh' else 0.6, 250, 3500, 0.35), t0 - 0.05, 1, -0.3 + 0.6 * (ticks % 2)); ticks += 1
    elif ty == 'whooshUp': add(sfx, whoosh(0.45, 200, 2500, 0.3, up=True), t0)
    elif ty == 'ambBus': add(sfx, rumble(e['dur'], 140, 0.22, 55), t0)
    elif ty == 'ambCar': add(sfx, rumble(e['dur'], 380, 0.16), t0)
    elif ty == 'ambNight': add(sfx, stereo(crickets(e['dur']), -0.5), t0); add(sfx, stereo(crickets(e['dur'] - 0.3) * 0.7, 0.5), t0 + 0.3)
    elif ty == 'fall': add(sfx, whoosh(e['dur'], 1800, 300, 0.18, up=True), t0)
    elif ty == 'snap':
        add(sfx, pop(160, 80, 0.2, 0.6), t0); add(sfx, sparkle(0.35, 10, 88, 100, 0.25), t0 + 0.05)
    elif ty == 'key': add(sfx, S(click(2200 + 900 * rng.random(), 0.025, 0.28), pop(380, 260, 0.03, 0.12)), t0, 1, -0.1 + 0.2 * rng.random())
    elif ty == 'enter': add(sfx, S(click(1600, 0.04, 0.4), pop(300, 180, 0.05, 0.2)), t0)
    elif ty == 'load': add(sfx, pop(600, 900, 0.12, 0.25), t0); add(sfx, pop(900, 1200, 0.12, 0.2), t0 + 0.08)
    elif ty == 'tap': add(sfx, S(click(1800, 0.03, 0.55), pop(500, 250, 0.08, 0.45)), t0)
    elif ty == 'connect':
        for i, m in enumerate((84, 88, 91, 96)): add(sfx, reverb(bell(m, 1.0, 2.0, 1.4), 0.3), t0 + i * 0.07, 0.6, -0.3 + 0.2 * i)
    elif ty == 'riserShort': add(sfx, riser(e['dur'], 0.4), t0)
    elif ty == 'drop': add(sfx, impact(1.0, 40), t0); add(sfx, sparkle(0.4, 12, 84, 98, 0.25), t0)
    elif ty == 'ping':
        m = [84, 86, 88, 91, 93, 96, 98][int(t0 * 10) % 7]
        b = bell(m, 0.8, 2.0, 1.5) * 0.7; p = pop(700, 1300, 0.05, 0.2); b[:len(p)] += p
        add(sfx, reverb(b, 0.35), t0, 0.7, -0.6 + 1.2 * rng.random())
    elif ty == 'pop': add(sfx, pop(250, 750, 0.12, 0.45), t0, 1, [-0.5, 0.5, -0.5, 0.5][e['n']])
    elif ty == 'confetti': add(sfx, sparkle(0.9, 30, 88, 106, 0.3), t0)
    elif ty == 'bubble': add(sfx, pop(800 + 60 * e['n'], 1300 + 60 * e['n'], 0.06, 0.18), t0, 1, -0.6 + 0.17 * e['n'])
    elif ty == 'caseOpen': add(sfx, S(click(1200, 0.05, 0.5), pop(220, 120, 0.12, 0.35)), t0)
    elif ty == 'budFly': add(sfx, whoosh(e['dur'], 600, 3500, 0.16, up=True), t0, 1, 0.0)
    elif ty == 'budIn': add(sfx, S(click(3000, 0.03, 0.55), pop(900, 500, 0.05, 0.25)), t0, 1, -0.5 if t0 < SNAP - 0.05 else 0.5)
    elif ty == 'logo': add(sfx, impact(0.5, 55), t0); add(sfx, sparkle(0.7, 16, 84, 100, 0.3), t0); add(sfx, riser(0.4, 0.15)[::-1].copy(), t0 - 0.4)
    elif ty == 'cta': add(sfx, pop(300, 900, 0.12, 0.4), t0); add(sfx, reverb(S(bell(84, 1.2, 2.0, 1.2), bell(91, 1.2, 2.0, 1.2)), 0.3), t0 + 0.04, 0.6)
    elif ty == 'shine':
        for i in range(6): add(sfx, bell(96 + i * 2, 0.4, 2.0, 0.8), t0 + i * 0.04, 0.25, -0.5 + 0.2 * i)

# ---------------- voiceover ----------------
vo = np.zeros(N)
vdir = sys.argv[1]
for i, t0 in enumerate(VO_AT):
    a, sr = sf.read(os.path.join(vdir, f'{i:02d}.wav'))
    if a.ndim > 1: a = a.mean(axis=1)
    a = resample_poly(a, SR, sr)
    a = filt(a, 'high', 85, 2)
    a = a + 0.35 * filt(a, 'high', 3500, 2)            # a little presence
    a = a / (np.sqrt(np.mean(a[np.abs(a) > 0.01] ** 2)) + 1e-9) * 0.2   # same loudness for every line
    a = np.tanh(a * 1.6) / 1.6                            # gentle compression
    i0 = int(t0 * SR); n = min(len(a), N - i0); vo[i0:i0 + n] += a[:n]
vo_st = reverb(vo, 0.06, 0.6) * 1.6

# duck music under the voice
e = np.abs(vo); sm = np.zeros(N); a_att, a_rel = np.exp(-1 / (0.01 * SR)), np.exp(-1 / (0.25 * SR)); s = 0.0
for i in range(0, N, 48):
    v = e[i:i + 48].max(); s = a_att * s + (1 - a_att) * v if v > s else a_rel * s + (1 - a_rel) * v; sm[i:i + 48] = s
duck = 1 - 0.6 * np.clip(sm / 0.25, 0, 1)
MUSIC_G = 0.95
mix = music * duck[:, None] * MUSIC_G + sfx * 0.7 + vo_st
mix = filt(mix, 'high', 25, 2)
peak = np.abs(mix).max(); mix = np.tanh(mix / peak * 1.4) / np.tanh(1.4) * 0.95
sf.write(sys.argv[2], mix.astype(np.float32), SR, subtype='FLOAT')
print('wrote', sys.argv[2], 'peak before limit', round(float(peak), 3))
if os.environ.get('STEMS'):
    for name, x in (('music', music * duck[:, None] * MUSIC_G), ('sfx', sfx * 0.7), ('vo', vo_st)):
        sf.write(os.path.join(os.environ['STEMS'], name + '.wav'), (x / peak).astype(np.float32), SR, subtype='FLOAT')
