#!/usr/bin/env node
'use strict';
// Checks public/voice-gender.js against synthetic vowels: a glottal pulse
// train at a given F0 through three formant resonators, analysed exactly as
// the browser does (48 kHz frames of 2048, decimated to 12 kHz).
const assert = require('assert');
const VG = require('../public/voice-gender.js');

const SR = 48000;

function synthVowel(f0, formantsHz, seconds, jitter = 0.01) {
  const n = Math.floor(SR * seconds);
  const src = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const f = f0 * (1 + jitter * Math.sin((2 * Math.PI * 5 * i) / SR)); // light vibrato
    phase += f / SR;
    if (phase >= 1) { phase -= 1; src[i] = 1; }
  }
  let y = src;
  for (const fc of formantsHz) {
    const bw = 80 + fc * 0.04;
    const r = Math.exp((-Math.PI * bw) / SR);
    const c1 = 2 * r * Math.cos((2 * Math.PI * fc) / SR);
    const c2 = -r * r;
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) out[i] = y[i] + c1 * (out[i - 1] || 0) + c2 * (out[i - 2] || 0);
    y = out;
  }
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(y[i]));
  for (let i = 0; i < n; i++) y[i] = (y[i] / peak) * 0.3 + (Math.random() - 0.5) * 0.004;
  return y;
}

function run(f0, formantsHz) {
  const signal = synthVowel(f0, formantsHz, 12);
  const factor = 4;
  const rate = SR / factor;
  const f0s = [];
  const spacings = [];
  for (let off = 0; off + 2048 <= signal.length; off += SR / 10) {
    const frame = VG._decimate(signal.subarray(off, off + 2048), factor);
    const p = VG._yin(frame, rate);
    if (p) f0s.push(p);
    const fs = VG._formants(frame, rate);
    if (fs) spacings.push(fs.reduce((s, f, i) => s + f / (i + 0.5), 0) / fs.length);
  }
  return { f0s, spacings, result: VG.estimate(f0s, spacings) };
}

const cases = [
  { name: 'typical male', f0: 115, fm: [500, 1500, 2500], want: 'male' },
  { name: 'low male', f0: 95, fm: [480, 1450, 2450], want: 'male' },
  { name: 'typical female', f0: 210, fm: [580, 1720, 2880], want: 'female' },
  { name: 'high female', f0: 240, fm: [600, 1800, 3000], want: 'female' },
];
for (const c of cases) {
  const { f0s, spacings, result } = run(c.f0, c.fm);
  const medF0 = f0s.slice().sort((a, b) => a - b)[f0s.length >> 1];
  assert.ok(Math.abs(medF0 - c.f0) / c.f0 < 0.05, `${c.name}: pitch ${medF0.toFixed(1)} vs ${c.f0}`);
  assert.ok(result && result.decided, `${c.name}: no confident verdict (${JSON.stringify(result)})`);
  assert.strictEqual(result.label, c.want, `${c.name}: got ${result.label}`);
  console.log(`ok  ${c.name}: F0 ${medF0.toFixed(0)} Hz, ${spacings.length} formant frames -> ${result.label} (${result.confidence})`);
}

// A voice in the overlap zone must not produce a confident verdict on pitch
// alone - the check stays silent rather than guess.
const ambiguous = VG.estimate(new Array(100).fill(160), []);
assert.ok(!ambiguous.decided, 'ambiguous 160 Hz voice should not be decided');
console.log('ok  ambiguous 160 Hz voice stays undecided');

// Too little speech: no verdict at all.
assert.strictEqual(VG.estimate(new Array(10).fill(120), []), null);
console.log('ok  too little speech gives no verdict');
