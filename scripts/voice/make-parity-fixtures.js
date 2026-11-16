#!/usr/bin/env node
'use strict';
// Writes the fixtures that hold the Android port of the voice features
// (android-native/.../voice/VoiceFeatures.kt) to the same numbers as
// public/voice-features.js, so a phone and a browser feed the server's model
// identical summaries for the same sound.
//
//   node scripts/voice/make-parity-fixtures.js
//
// Each case is a synthetic voice: a glottal pulse train with jitter and a slow
// pitch glide, through three formant resonators, with pauses and a little
// noise, at a microphone rate the phones and browsers really use (48000,
// 44100, 16000 Hz). It is fed to the tracker exactly as voice-gender.js does:
// the last 2048 samples, every 50 ms.
//
// The Kotlin test rebuilds every signal from the parameters written here, so
// the generator only uses + - * / on doubles and a 32-bit LCG: those give the
// same bits on the JVM and in V8. The two values that need cos/exp (each
// resonator's feedback coefficients) are computed here once and written to
// the file, and the test uses them as given.
const fs = require('fs');
const path = require('path');
const VF = require('../../public/voice-features.js');

const OUT = path.join(__dirname, '..', '..', 'android-native', 'app', 'src', 'test', 'resources', 'voice-parity.json');
const BLOCK = 2048;
const FRAMES_KEPT = 30; // per-frame values written for the first voiced frames

// Numerical Recipes' LCG; uniform in [0, 1).
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function resonator(fc, rate) {
  const bw = 80 + fc * 0.04;
  const r = Math.exp((-Math.PI * bw) / rate);
  return [2 * r * Math.cos((2 * Math.PI * fc) / rate), -r * r];
}

// One case: { rate, seed, segments: [{ f0, glide, seconds, pause, formants }] }
// where `formants` is filled in with [c1, c2] pairs for this rate.
function synth(c) {
  const rand = lcg(c.seed);
  const parts = [];
  let total = 0;
  for (const seg of c.segments) {
    const n = Math.floor(c.rate * seg.seconds);
    const src = new Float64Array(n);
    let phase = 0;
    let jit = 0;
    for (let i = 0; i < n; i++) {
      // Pitch glides linearly across the segment (intonation); each glottal
      // period gets its own small random jitter.
      const f = seg.f0 * (1 + seg.glide * (i / n - 0.5)) * (1 + jit);
      phase += f / c.rate;
      if (phase >= 1) {
        phase -= 1;
        src[i] = 1;
        jit = (rand() - 0.5) * 0.02;
      }
    }
    let y = src;
    for (const [c1, c2] of seg.coefs) {
      const out = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        const p1 = i > 0 ? out[i - 1] : 0;
        const p2 = i > 1 ? out[i - 2] : 0;
        out[i] = y[i] + c1 * p1 + c2 * p2;
      }
      y = out;
    }
    parts.push(y);
    total += n;
    const gap = Math.floor(c.rate * seg.pause);
    parts.push(new Float64Array(gap));
    total += gap;
  }
  const x = new Float64Array(total);
  let off = 0;
  for (const p of parts) { x.set(p, off); off += p.length; }
  let peak = 0;
  for (let i = 0; i < total; i++) peak = Math.max(peak, Math.abs(x[i]));
  // Microphone samples are 32-bit floats, in the browser and on the phone.
  const out = new Float32Array(total);
  for (let i = 0; i < total; i++) out[i] = (x[i] / peak) * c.level + (rand() - 0.5) * c.noise;
  return out;
}

const VOICES = {
  male: [
    { f0: 112, glide: 0.18, seconds: 3.1, pause: 0.45, formants: [520, 1480, 2480] },
    { f0: 104, glide: -0.12, seconds: 2.6, pause: 0.3, formants: [640, 1180, 2400] },
    { f0: 121, glide: 0.25, seconds: 3.4, pause: 0.6, formants: [330, 2100, 2650] },
    { f0: 98, glide: -0.2, seconds: 3.0, pause: 0.2, formants: [480, 1300, 2500] },
  ],
  female: [
    { f0: 212, glide: 0.2, seconds: 3.1, pause: 0.45, formants: [600, 1750, 2900] },
    { f0: 196, glide: -0.15, seconds: 2.6, pause: 0.3, formants: [760, 1400, 2850] },
    { f0: 231, glide: 0.22, seconds: 3.4, pause: 0.6, formants: [380, 2450, 3100] },
    { f0: 188, glide: -0.18, seconds: 3.0, pause: 0.2, formants: [560, 1550, 2950] },
  ],
  // A hum through one low resonance: voiced, but without three clear
  // formants, so the summary's formant statistics come out null.
  hum: [
    { f0: 150, glide: 0.1, seconds: 3.2, pause: 0.3, formants: [300] },
    { f0: 140, glide: -0.1, seconds: 3.2, pause: 0.3, formants: [350] },
  ],
};

const cases = [];
let seed = 20261115;
for (const rate of [48000, 44100, 16000]) {
  for (const voice of Object.keys(VOICES)) {
    const segments = VOICES[voice].map((s) => ({ ...s, coefs: s.formants.map((fc) => resonator(fc, rate)) }));
    const c = { name: `${voice}-${rate}`, rate, seed: seed++, level: 0.3, noise: 0.004, segments };
    const signal = synth(c);
    const step = rate / 20; // 50 ms
    const tracker = VF.createTracker();
    let voicedFlags = '';
    let first = null; // the summary sent at 80 voiced frames, as in a call
    for (let off = 0; off + BLOCK <= signal.length; off += step) {
      const voiced = tracker.push(signal.subarray(off, off + BLOCK), rate);
      voicedFlags += voiced ? '1' : '0';
      if (!first && tracker.voiced === 80) first = tracker.summary();
    }
    if (!first) throw new Error(`${c.name}: never reached 80 voiced frames`);
    const frames = tracker.frames().slice(0, FRAMES_KEPT).map((fr) => ({
      f0: fr.f0, mfcc: Array.from(fr.mfcc), hiRatio: fr.hiRatio, formants: fr.formants,
    }));
    cases.push({
      name: c.name, rate, seed: c.seed, level: c.level, noise: c.noise,
      segments: segments.map(({ f0, glide, seconds, pause, coefs }) => ({ f0, glide, seconds, pause, coefs })),
      samples: signal.length, blocks: voicedFlags.length, voiced: voicedFlags,
      frames, first, summary: tracker.summary(),
    });
    console.log(`${c.name}: ${tracker.voiced}/${voicedFlags.length} voiced, F0 median ${(100 * 2 ** first.f[0]).toFixed(1)} Hz, formants ${first.f.slice(27, 30).join('/')}`);
  }
}

// The resonator coefficients must come out of this file bit for bit: the
// Kotlin test reads them back with Double.parseDouble, which inverts JSON.stringify.
fs.writeFileSync(OUT, JSON.stringify({
  about: 'Expected voice features for synthetic voices, from public/voice-features.js. Written by scripts/voice/make-parity-fixtures.js; checked by VoiceAnalysisTest.',
  featureVersion: VF.VERSION,
  block: BLOCK,
  cases,
}) + '\n');
console.log(`wrote ${path.relative(process.cwd(), OUT)}`);
