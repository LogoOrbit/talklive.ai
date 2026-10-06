// Audio helpers for the reels: decode with ffmpeg, write WAV, and a small
// synthesised sound-effect kit (no samples to license - every effect is maths).
const { execFileSync } = require('child_process');
const fs = require('fs');
const FF = process.env.FFMPEG || 'ffmpeg';
const SR = 44100, FPS = 30;

function decode(file) {
  const buf = execFileSync(FF, ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 28 });
  return new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
}

function writeWav(file, f32) {
  const b = Buffer.alloc(44 + f32.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + f32.length * 2, 4); b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(f32.length * 2, 40);
  for (let i = 0; i < f32.length; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, f32[i])) * 32767), 44 + i * 2);
  fs.writeFileSync(file, b);
}

// Deterministic noise so every render sounds identical.
let seed = 1;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 * 2 - 1; };

// Each effect returns a Float32Array. dur in seconds, gain ~ peak level.
function synth(type) {
  const mk = (dur, fn) => { const n = Math.round(dur * SR), o = new Float32Array(n); let ph = 0, lp = 0;
    for (let i = 0; i < n; i++) { const t = i / SR, x = i / n; const r = fn(t, x, (f) => { ph += 2 * Math.PI * f / SR; return Math.sin(ph); }, (c) => { lp += c * (rnd() - lp); return lp; }); o[i] = r; } return o; };
  switch (type) {
    case 'whoosh': return mk(.42, (t, x, s, n) => n(.04 + .5 * Math.sin(Math.PI * x)) * Math.sin(Math.PI * x) ** 2 * .9);
    case 'hit': return mk(.45, (t, x, s, n) => (s(90 * Math.exp(-t * 9) + 38) * Math.exp(-t * 7) * .9) + (t < .012 ? rnd() * .5 : 0));
    case 'boom': return mk(1.2, (t, x, s, n) => s(60 * Math.exp(-t * 3) + 28) * Math.exp(-t * 3.2) * .95 + n(.08) * Math.exp(-t * 6) * .6);
    case 'pop': return mk(.09, (t, x, s) => s(500 + 900 * x) * Math.exp(-t * 40) * .5);
    case 'tick': return mk(.03, (t, x, s) => s(2400) * Math.exp(-t * 220) * .45);
    case 'ding': return mk(.9, (t, x, s) => (Math.sin(2 * Math.PI * 1318 * t) + .6 * Math.sin(2 * Math.PI * 1976 * t) + .3 * Math.sin(2 * Math.PI * 2637 * t)) * Math.exp(-t * 5) * .22);
    case 'notif': return mk(.5, (t) => Math.sin(2 * Math.PI * (t < .14 ? 988 : 1319) * t) * Math.exp(-((t < .14 ? t : t - .14)) * 12) * .32);
    case 'glitch': return mk(.28, (t, x) => (Math.floor(t * 900) % 2 ? 1 : -1) * Math.round(rnd() * 3) / 3 * (Math.floor(t * 30) % 2 ? .3 : .08));
    case 'alarm': return mk(.62, (t) => ((t % .3) < .2 ? Math.sign(Math.sin(2 * Math.PI * 740 * t)) * .14 : 0));
    case 'shutter': return mk(.16, (t) => (t < .03 || (t > .08 && t < .11) ? rnd() * .55 : 0));
    case 'scratch': return mk(.3, (t, x, s, n) => n(.6) * Math.abs(Math.sin(2 * Math.PI * 11 * t)) * (1 - x) * .9);
    case 'beep': return mk(1.1, (t, x) => Math.sin(2 * Math.PI * 1000 * t) * Math.min(1, t * 200) * (x > .9 ? (1 - x) * 10 : 1) * .2);
    case 'rise': return mk(.7, (t, x, s, n) => n(.05 + .4 * x) * x * x * .7 + s(200 + 600 * x * x) * x * .08);
    default: throw new Error('sfx ' + type);
  }
}

// Mix [[time, type], ...] into dst (Float32Array) in place.
function mixSfx(dst, events, gain = 1) {
  const cache = {};
  for (const [t, type] of events) {
    const fx = cache[type] || (cache[type] = synth(type)); const o = Math.round(t * SR);
    for (let i = 0; i < fx.length && o + i < dst.length; i++) if (o + i >= 0) dst[o + i] += fx[i] * gain;
  }
}

module.exports = { SR, FPS, decode, writeWav, mixSfx };
