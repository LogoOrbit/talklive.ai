# Original 34 s bed for the TalkLive ad: 120 BPM, A minor (Am-F-C-G), house-pop.
# 0-3 s hook (filtered groove), 3-6 s tension (filter opening), 6-8 s build (roll + riser),
# 8 s DROP, 16 s arp joins, 24 s full, 30 s final hit, ring-out to 34 s.
import sys
import numpy as np
from scipy.signal import lfilter, fftconvolve, butter, sosfilt

SR = 48000
DUR = 34.0
BPM = 120.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT
N = int(SR * DUR)
rng = np.random.default_rng(7)

def t_of(n):
    return np.arange(n) / SR

def place(buf, sig, at, gain=1.0):
    i = int(round(at * SR))
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i] * gain

def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)

def polyblep_saw(freq, n, phase0=0.0):
    t = np.arange(n)
    dt = freq / SR
    ph = (phase0 + dt * t) % 1.0
    y = 2.0 * ph - 1.0
    m = ph < dt
    x = ph[m] / dt
    y[m] -= x + x - x * x - 1.0
    m = ph > 1.0 - dt
    x = (ph[m] - 1.0) / dt
    y[m] -= x * x + x + x + 1.0
    return y

def lowpass(x, fc, q=0.707):
    w = 2 * np.pi * fc / SR
    a = np.sin(w) / (2 * q)
    b0 = (1 - np.cos(w)) / 2; b1 = 1 - np.cos(w); b2 = b0
    a0 = 1 + a; a1 = -2 * np.cos(w); a2 = 1 - a
    return lfilter([b0 / a0, b1 / a0, b2 / a0], [1, a1 / a0, a2 / a0], x)

def sweep_lowpass(x, fc_curve, block=256, q=0.8):
    """Lowpass with a time-varying cutoff (fc_curve: per-sample Hz)."""
    y = np.zeros_like(x)
    z = np.zeros(2)
    for s in range(0, len(x), block):
        e = min(len(x), s + block)
        fc = float(np.clip(fc_curve[s], 40, SR * 0.45))
        w = 2 * np.pi * fc / SR
        a = np.sin(w) / (2 * q)
        b = np.array([(1 - np.cos(w)) / 2, 1 - np.cos(w), (1 - np.cos(w)) / 2]) / (1 + a)
        aa = np.array([1, -2 * np.cos(w) / (1 + a), (1 - a) / (1 + a)])
        y[s:e], z = lfilter(b, aa, x[s:e], zi=z)
    return y

def highpass_sos(x, fc, order=2):
    return sosfilt(butter(order, fc, 'highpass', fs=SR, output='sos'), x)

def bandpass_sos(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], 'bandpass', fs=SR, output='sos'), x)

# ---------- drums ----------
def kick():
    n = int(0.45 * SR); t = t_of(n)
    f = 46 + 120 * np.exp(-t / 0.032)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / 0.17) + 0.35 * np.sin(2 * np.pi * 155 * t) * np.exp(-t / 0.03)
    click = bandpass_sos(rng.standard_normal(n), 1500, 6000) * np.exp(-t / 0.004) * 0.35
    return np.tanh(1.6 * (body + click)) * 0.9

def clap():
    n = int(0.35 * SR); t = t_of(n)
    noise = bandpass_sos(rng.standard_normal(n), 900, 3800)
    env = np.zeros(n)
    for k, d in enumerate([0.0, 0.011, 0.022]):
        i = int(d * SR); env[i:] += np.exp(-(t[: n - i]) / 0.007) * (0.8 if k < 2 else 1.0)
    env += np.exp(-np.maximum(t - 0.025, 0) / 0.11) * (t > 0.025) * 0.55
    return noise * env * 0.55

def hat(open_=False):
    n = int((0.22 if open_ else 0.06) * SR); t = t_of(n)
    x = highpass_sos(rng.standard_normal(n), 7500, 4)
    return x * np.exp(-t / (0.09 if open_ else 0.018)) * (0.16 if open_ else 0.12)

def snare():
    n = int(0.18 * SR); t = t_of(n)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05) * 0.5
    nz = bandpass_sos(rng.standard_normal(n), 1200, 8000) * np.exp(-t / 0.06)
    return (tone + nz) * 0.5

def crash(dur=2.4):
    n = int(dur * SR); t = t_of(n)
    x = highpass_sos(rng.standard_normal(n), 5000, 2)
    return x * np.exp(-t / 0.75) * 0.32

def boom():
    n = int(1.6 * SR); t = t_of(n)
    f = 34 + 70 * np.exp(-t / 0.08)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.tanh(2.0 * np.sin(ph) * np.exp(-t / 0.55)) * 0.9

# ---------- tonal ----------
PROG = [  # (bass root midi, chord midi notes) per bar: Am F C G
    (33, [57, 60, 64, 69]),  # A1 | A3 C4 E4 A4
    (29, [57, 60, 65, 69]),  # F1 | A3 C4 F4 A4
    (36, [55, 60, 64, 67]),  # C2 | G3 C4 E4 G4
    (31, [55, 59, 62, 67]),  # G1 | G3 B3 D4 G4
]

def supersaw(freq, n, detunes=(-14, -7, 0, 7, 14)):
    out = np.zeros(n)
    for c in detunes:
        out += polyblep_saw(freq * 2 ** (c / 1200), n, rng.random())
    return out / len(detunes)

def adsr(n, a=0.005, d=0.1, s=0.7, r=0.05):
    env = np.ones(n) * s
    ia, idd, ir = int(a * SR), int(d * SR), int(r * SR)
    ia = max(ia, 1)
    env[:ia] = np.linspace(0, 1, ia)
    if idd > 0:
        env[ia: ia + idd] = np.linspace(1, s, min(idd, max(0, n - ia)))
    if ir > 0 and n > ir:
        env[-ir:] *= np.linspace(1, 0, ir)
    return env

def bass_note(m, dur):
    n = int(dur * SR); t = t_of(n)
    f = midi(m)
    x = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t) + 0.45 * polyblep_saw(f, n)
    x = lowpass(x, 1100)
    return np.tanh(1.4 * x) * adsr(n, 0.004, 0.08, 0.75, 0.04) * 0.55

def stab(notes, dur, bright=5200):
    n = int(dur * SR); t = t_of(n)
    x = sum(supersaw(midi(m), n) for m in notes) / len(notes)
    env_f = 1300 + bright * np.exp(-t / 0.08)
    x = sweep_lowpass(x, env_f, block=128, q=1.1)
    return x * adsr(n, 0.003, 0.09, 0.35, 0.05) * 0.9

def pad(notes, dur):
    n = int(dur * SR)
    x = sum(supersaw(midi(m), n) for m in notes) / len(notes)
    x = lowpass(x, 3200, 0.6)
    return x * adsr(n, 0.06, 0.3, 0.8, 0.25) * 0.45

def arp_note(m, dur):
    n = int(dur * SR); t = t_of(n)
    f = midi(m)
    x = np.sign(np.sin(2 * np.pi * f * t)) * 0.5 + 0.5 * np.sin(2 * np.pi * f * t)
    x = lowpass(x, 4500)
    return x * np.exp(-t / 0.09) * 0.3

def noise_riser(dur):
    n = int(dur * SR); t = t_of(n)
    x = rng.standard_normal(n)
    fc = 300 * (16000 / 300) ** (t / dur)
    x = sweep_lowpass(x, fc, block=256, q=2.0)
    x = highpass_sos(x, 200)
    return x * (t / dur) ** 2.2 * 0.5

# ---------- arrangement ----------
drums = np.zeros(N); bass = np.zeros(N); chords = np.zeros(N); padb = np.zeros(N); arp = np.zeros(N); fx = np.zeros(N)
K, C, CH, OH, SN = kick(), clap(), hat(False), hat(True), snare()

def bar_at(s):
    return int(s // BAR)

# Hook + tension (0-6 s): the groove plays, filtered; opens up from 3 s.
# Build (6-8 s): roll + riser, kick drops at 7 s. Drop at 8 s.
nbars = int(np.ceil(DUR / BAR))
for b in range(nbars):
    t0 = b * BAR
    root, notes = PROG[b % 4]
    for q in range(4):
        tb = t0 + q * BEAT
        if tb >= 30.0 + 1e-6:  # drums stop after the CTA hit
            continue
        in_build = 6.0 <= tb < 8.0
        if not (7.0 <= tb < 8.0):
            place(drums, K, tb, 1.0 if tb >= 8.0 else 0.85)
        if q in (1, 3) and not in_build:
            place(drums, C, tb, 1.0 if tb >= 8.0 else 0.7)
        if tb >= 8.0 or tb < 6.0:
            place(drums, OH, tb + BEAT / 2, 0.9 if tb >= 8.0 else 0.6)
            for s16 in range(4):
                if s16 == 2:
                    continue
                vel = [1.0, 0.55, 0.0, 0.7][s16]
                place(drums, CH, tb + s16 * BEAT / 4, vel * (1.0 if tb >= 16.0 else 0.75))
        # house bass on the off-beats
        if tb < 30.0 and not (7.0 <= tb < 8.0):
            place(bass, bass_note(root + 12, BEAT * 0.45), tb + BEAT / 2, 1.0)
            if tb >= 8.0 and q == 3:
                place(bass, bass_note(root + 24, BEAT * 0.2), tb + BEAT * 0.75, 0.45)
    # chord stabs: syncopated pattern (16ths): 0, 3, 6, 10, 12
    if t0 < 30.0:
        for s16 in (0, 3, 6, 10, 12):
            ts = t0 + s16 * BEAT / 4
            if 7.5 <= ts < 8.0:
                continue
            place(chords, stab(notes, BEAT * 0.42), ts, 0.95 if s16 == 0 else 0.75)
    # pad under everything from the drop
    if 8.0 <= t0 < 30.0:
        place(padb, pad(notes, BAR), t0, 1.0)
    # arp from 16 s: 16ths over chord tones
    if 16.0 <= t0 < 30.0:
        tones = [notes[0] + 12, notes[1] + 12, notes[2] + 12, notes[3] + 12, notes[2] + 12, notes[1] + 12, notes[3], notes[2]]
        for s16 in range(16):
            place(arp, arp_note(tones[s16 % len(tones)], BEAT / 4), t0 + s16 * BEAT / 4, 1.0 if s16 % 4 == 0 else 0.7)

# Build: snare roll accelerating 6-8 s.
tt = 6.0
while tt < 7.92:
    prog = (tt - 6.0) / 2.0
    step = BEAT / 2 if prog < 0.5 else (BEAT / 4 if prog < 0.8 else BEAT / 8)
    place(drums, SN, tt, 0.35 + 0.65 * prog)
    tt += step
place(fx, noise_riser(2.0), 6.0, 1.0)
# Drop: boom + crash. CTA: big hit at 30 s and final chord.
place(fx, boom(), 8.0, 0.9); place(fx, crash(), 8.0, 1.0)
place(fx, stab(PROG[0][1], 0.5, 6000), 0.0, 0.55); place(fx, K, 0.0, 0.6)
place(fx, boom(), 30.0, 0.8); place(fx, crash(3.5), 30.0, 1.0); place(drums, K, 30.0, 1.0)
final = pad(PROG[0][1] + [45], 3.6) * 1.6
place(padb, final, 30.0, 1.0)
place(chords, stab(PROG[0][1], 0.6, 5000), 30.0, 1.0)

# Filter on the music (not fx) during hook/tension/build: muffled -> open.
music_t = t_of(N)
fc = np.where(music_t < 3.0, 2400.0,
     np.where(music_t < 6.0, 2400.0 * (6000 / 2400) ** ((music_t - 3.0) / 3.0),
     np.where(music_t < 8.0, 6000.0 * (16000 / 6000) ** ((music_t - 6.0) / 2.0), 20000.0)))

# Sidechain pump from the kick after the drop.
duck = np.ones(N)
for b in range(nbars):
    for q in range(4):
        tb = b * BAR + q * BEAT
        if 8.0 <= tb < 30.0:
            i = int(tb * SR); n = int(0.35 * SR)
            seg = 1 - 0.6 * np.exp(-t_of(n) / 0.09)
            duck[i: i + n] = np.minimum(duck[i: i + n], seg[: len(duck[i: i + n])])

def stereo_widen(x, ms=0.011):
    d = int(ms * SR)
    l = x.copy(); r = np.concatenate([np.zeros(d), x[:-d]])
    return l, r

# Reverb IR (stereo, decorrelated).
def ir(rt=1.5):
    n = int(rt * SR); t = t_of(n)
    e = np.exp(-6.9 * t / rt)
    l = lowpass(rng.standard_normal(n), 6000) * e
    r = lowpass(rng.standard_normal(n), 6000) * e
    return l / np.sqrt(np.sum(l ** 2)), r / np.sqrt(np.sum(r ** 2))
IRL, IRR = ir()

tonal = (chords * 0.55 + padb * 0.5 + arp * 0.6) * 3.0
tonal = sweep_lowpass(tonal, fc, block=512, q=0.7) * duck
bassf = sweep_lowpass(bass, np.minimum(fc, 20000), block=512, q=0.7) * np.where(music_t >= 8.0, duck ** 0.5, 1.0)
drm = sweep_lowpass(drums, np.maximum(fc, 600), block=512, q=0.7)

tl, tr = stereo_widen(tonal)
send = (chords * 0.3 + arp * 0.5 + padb * 0.2) * 3.0
rev_l = fftconvolve(send, IRL)[:N] * 0.35
rev_r = fftconvolve(send, IRR)[:N] * 0.35
clap_send = fftconvolve(drums * 0.15, IRL)[:N]

# Section dynamics: the intro sits back, the build climbs, the drop lands.
sec = np.interp(music_t, [0, 2.99, 3.0, 6.0, 7.9, 8.0, 34.0], [0.72, 0.72, 0.74, 0.84, 0.9, 1.0, 1.0])
L = (drm * 0.9 + bassf * 0.95 + tl + rev_l + clap_send * 0.3) * sec + fx
R = (drm * 0.9 + bassf * 0.95 + tr + rev_r + clap_send * 0.3) * sec + fx
mix = np.stack([L, R], 1)
mix = highpass_sos(mix.T, 35).T

def rbj(kind, f0, gain_db, q=0.707):
    A = 10 ** (gain_db / 40); w = 2 * np.pi * f0 / SR; c = np.cos(w); sn = np.sin(w); al = sn / (2 * q)
    if kind == 'peak':
        b = [1 + al * A, -2 * c, 1 - al * A]; a = [1 + al / A, -2 * c, 1 - al / A]
    elif kind == 'lowshelf':
        sq = 2 * np.sqrt(A) * al
        b = [A * ((A + 1) - (A - 1) * c + sq), 2 * A * ((A - 1) - (A + 1) * c), A * ((A + 1) - (A - 1) * c - sq)]
        a = [(A + 1) + (A - 1) * c + sq, -2 * ((A - 1) + (A + 1) * c), (A + 1) + (A - 1) * c - sq]
    else:  # highshelf
        sq = 2 * np.sqrt(A) * al
        b = [A * ((A + 1) + (A - 1) * c + sq), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - sq)]
        a = [(A + 1) - (A - 1) * c + sq, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - sq]
    return np.array(b) / a[0], np.array(a) / a[0]

# Mastering EQ for phone speakers: less sub, more presence.
for kind, f0, g, q in [('lowshelf', 120, -6.0, 0.7), ('peak', 3000, 4.0, 0.8), ('highshelf', 9000, 1.0, 0.7)]:
    b, a = rbj(kind, f0, g, q)
    mix = lfilter(b, a, mix, axis=0)

# Gentle bus glue: RMS compressor + soft clip.
env = np.sqrt(lfilter([0.002], [1, -0.998], np.mean(mix ** 2, 1)) + 1e-9)
thr = 0.32
gain = np.where(env > thr, (thr / env) ** 0.25, 1.0)
mix = mix * gain[:, None]
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
# fade the very end
fade = np.ones(N); fl = int(1.2 * SR); fade[-fl:] = np.linspace(1, 0, fl) ** 2
mix *= fade[:, None]
mix /= np.max(np.abs(mix)) + 1e-9
mix *= 0.89
out = sys.argv[1] if len(sys.argv) > 1 else 'music.wav'
import wave
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('wrote', out, DUR, 's')
