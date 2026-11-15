#!/usr/bin/env node
'use strict';
// Runs labelled speech through public/voice-features.js, the same code a
// browser or phone runs, and writes one feature summary per line.
//
//   node scripts/voice/extract.js manifest.jsonl out.jsonl [shard] [shards]
//
// Each recording is decoded to 48 kHz mono (what a microphone delivers), cut
// into the 2048-sample blocks the website takes every 50 ms, and summarised
// over a random stretch of voiced speech. Besides the clean recording, two
// degraded copies are made, so the model learns from the kinds of audio real
// calls have: quiet or loud, hissy, a phone microphone that drops the bass, a
// narrow-band Bluetooth headset.
const fs = require('fs');
const { spawnSync } = require('child_process');
const VF = require('../../public/voice-features.js');

const [manifestPath, outPath, shardArg, shardsArg] = process.argv.slice(2);
if (!manifestPath || !outPath) { console.error('usage: extract.js manifest.jsonl out.jsonl [shard] [shards]'); process.exit(1); }
const shard = Number(shardArg) || 0;
const shards = Number(shardsArg) || 1;

const SR = 48000;
const BLOCK = 2048;
const HOP = SR / 20; // 50 ms, as in voice-gender.js

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function decode(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0 || !r.stdout.length) return null;
  return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.length / 4)).slice();
}

// RBJ cookbook biquads.
function biquad(x, type, fc, gainDb = 0) {
  const w0 = (2 * Math.PI * fc) / SR;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * Math.SQRT1_2);
  let b0; let b1; let b2; let a0; let a1; let a2;
  if (type === 'lp') { b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = b0; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha; }
  else if (type === 'hp') { b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = b0; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha; }
  else { // high shelf
    const A = 10 ** (gainDb / 40);
    const s = 2 * Math.sqrt(A) * alpha;
    b0 = A * ((A + 1) + (A - 1) * cos + s); b1 = -2 * A * ((A - 1) + (A + 1) * cos); b2 = A * ((A + 1) + (A - 1) * cos - s);
    a0 = (A + 1) - (A - 1) * cos + s; a1 = 2 * ((A - 1) - (A + 1) * cos); a2 = (A + 1) - (A - 1) * cos - s;
  }
  const y = new Float32Array(x.length);
  let x1 = 0; let x2 = 0; let y1 = 0; let y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}

function rmsOf(x) {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, x.length));
}

// Level to about -22 dBFS (a call's automatic gain does much the same).
function normalise(x) {
  const r = rmsOf(x);
  if (!r) return x;
  const g = Math.min(0.08 / r, 0.98 / x.reduce((m, v) => Math.max(m, Math.abs(v)), 1e-9));
  const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = x[i] * g;
  return y;
}

function addNoise(x, snrDb, pink, rand) {
  const target = rmsOf(x) / 10 ** (snrDb / 20);
  const noise = new Float32Array(x.length);
  let b0 = 0; let b1 = 0; let b2 = 0;
  for (let i = 0; i < x.length; i++) {
    const w = rand() * 2 - 1;
    if (pink) { // Paul Kellet's economy pink filter
      b0 = 0.99765 * b0 + w * 0.0990460; b1 = 0.96300 * b1 + w * 0.2965164; b2 = 0.57000 * b2 + w * 1.0526913;
      noise[i] = b0 + b1 + b2 + w * 0.1848;
    } else noise[i] = w;
  }
  const g = target / (rmsOf(noise) || 1);
  const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = x[i] + noise[i] * g;
  return y;
}

function degrade(x, rand) {
  let y = x;
  const tags = [];
  const narrow = rand() < 0.3;
  if (narrow) { // Bluetooth / telephone band
    y = biquad(biquad(y, 'hp', 300), 'hp', 300);
    y = biquad(biquad(y, 'lp', 3400), 'lp', 3400);
    tags.push('narrow');
  } else {
    if (rand() < 0.6) { y = biquad(y, 'hp', 80 + rand() * 270); tags.push('hp'); }
    if (rand() < 0.4) { y = biquad(y, 'lp', 3600 + rand() * 3400); tags.push('lp'); }
  }
  if (rand() < 0.5) { y = biquad(y, 'shelf', 1000, rand() * 14 - 7); tags.push('tilt'); }
  if (rand() < 0.65) { y = addNoise(y, 8 + rand() * 27, rand() < 0.6, rand); tags.push('noise'); }
  const gain = 10 ** ((rand() * 22 - 14) / 20);
  const out = new Float32Array(y.length);
  for (let i = 0; i < y.length; i++) out[i] = Math.max(-1, Math.min(1, y[i] * gain));
  return { audio: out, tag: tags.join('+') || 'gain' };
}

function voicedFrames(audio) {
  const frames = [];
  for (let off = 0; off + BLOCK <= audio.length; off += HOP) {
    const fr = VF.analyseFrame(VF.decimate(audio.subarray(off, off + BLOCK), SR), VF.decimatorFor(SR).rate);
    if (fr) frames.push(fr);
  }
  return frames;
}

// A random contiguous stretch of 40-220 voiced frames (2-11 s of voiced
// speech). A device sends 80 or more, so the model is trained on less than it gets.
function windowOf(frames, rand) {
  if (frames.length < 40) return null;
  const k = Math.min(frames.length, 40 + Math.floor(rand() * 181));
  const start = Math.floor(rand() * (frames.length - k + 1));
  return frames.slice(start, start + k);
}

// Written line by line and resumable: a run that is stopped keeps what it
// has, and starting it again skips the recordings already in the output.
const lines = fs.readFileSync(manifestPath, 'utf8').split('\n').filter(Boolean);
const seen = new Set();
if (fs.existsSync(outPath)) {
  for (const line of fs.readFileSync(outPath, 'utf8').split('\n')) {
    const m = /"id":(\d+)/.exec(line);
    if (m) seen.add(Number(m[1]));
  }
}
const out = fs.openSync(outPath, 'a');
let done = 0;
for (let i = 0; i < lines.length; i++) {
  if (i % shards !== shard || seen.has(i)) continue;
  const item = JSON.parse(lines[i]);
  const raw = decode(item.path);
  if (!raw || raw.length < SR * 2) continue;
  const rand = rng(hash(item.path));
  const clean = normalise(raw);
  const variants = [{ audio: clean, tag: 'clean' }, degrade(clean, rand), degrade(clean, rand)];
  let rows = '';
  for (const v of variants) {
    const win = windowOf(voicedFrames(v.audio), rand);
    if (!win) continue;
    const s = VF.summarise(win);
    rows += JSON.stringify({ set: item.set, lab: item.label, spk: item.speaker, aug: v.tag, id: i, n: s.n, f: s.f }) + '\n';
  }
  if (rows) fs.writeSync(out, rows);
  if (++done % 500 === 0) console.error(`[extract ${shard}/${shards}] ${done} files`);
}
fs.closeSync(out);
console.error(`[extract ${shard}/${shards}] finished, ${done} files`);
