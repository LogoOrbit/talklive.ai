#!/usr/bin/env node
'use strict';
// Trains the voice model from feature summaries (scripts/voice/extract.js)
// and writes server/voice-model.json together with how it scored on speech it
// never saw.
//
//   node scripts/voice/train.js feats-*.jsonl [--out server/voice-model.json]
//
// Three groups, kept apart by who is speaking:
//   train     FLEURS train splits (16 languages) + LibriSpeech dev-clean
//   validate  FLEURS dev splits of languages that have both women and men
//             there + LibriSpeech dev-other: early stopping, calibration,
//             thresholds
//   test      FLEURS test splits of eight languages the model never trained
//             on + LibriSpeech test-clean and test-other (different speakers):
//             reported, never tuned on
// The model is a small neural network (33 inputs, 16 hidden units). A plain
// logistic regression is trained too, as the baseline it has to beat.
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const outPath = outIdx >= 0 ? args.splice(outIdx, 2)[1] : path.join(__dirname, '..', '..', 'server', 'voice-model.json');
if (!args.length) { console.error('usage: train.js feats.jsonl [...] [--out file]'); process.exit(1); }

const FEATURE_VERSION = require('../../public/voice-features.js').VERSION;
const OPTIONAL = [27, 28, 29, 30]; // formant medians: null when too few frames had them
const TEST_LANGS = new Set(['ps_af', 'mr_in', 'it_it', 'ms_my', 'yo_ng', 'th_th', 'am_et', 'sd_in']);

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20261115);
function gauss() { return Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand()); }

// --- Data ------------------------------------------------------------------
const rows = [];
for (const file of args) {
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line) continue;
    const r = JSON.parse(line);
    rows.push({ set: r.set, y: r.lab === 'F' ? 1 : 0, aug: r.aug, n: r.n, f: r.f, key: `${r.set}#${r.id}` });
  }
}

// Which FLEURS dev splits have both genders (a one-gender split would teach
// the model that a language or a microphone is a gender).
const devMix = {};
for (const r of rows) {
  const m = /^fleurs:([^:]+):dev$/.exec(r.set);
  if (m) { devMix[m[1]] = devMix[m[1]] || [0, 0]; devMix[m[1]][r.y]++; }
}
function groupOf(set) {
  if (set === 'libri:dev-clean') return 'train';
  if (set === 'libri:dev-other') return 'val';
  if (set.startsWith('libri:test')) return 'test';
  const [, lang, split] = set.split(':');
  if (TEST_LANGS.has(lang)) return split === 'test' ? 'test' : null;
  if (split === 'train') return 'train';
  if (split === 'dev') {
    const mix = devMix[lang] || [0, 0];
    return Math.min(mix[0], mix[1]) >= 40 ? 'val' : null;
  }
  return null;
}
const groups = { train: [], val: [], test: [] };
for (const r of rows) { const g = groupOf(r.set); if (g) groups[g].push(r); }
for (const g of Object.keys(groups)) {
  const f = groups[g].filter((r) => r.y).length;
  console.log(`${g}: ${groups[g].length} summaries (${f} women, ${groups[g].length - f} men)`);
}

// Standardise on the training set; a missing value becomes the mean (0).
const D = groups.train[0].f.length;
const mean = new Array(D).fill(0);
const std = new Array(D).fill(0);
const lo = new Array(D).fill(Infinity);
const hi = new Array(D).fill(-Infinity);
for (let i = 0; i < D; i++) {
  const vals = groups.train.map((r) => r.f[i]).filter((v) => v !== null);
  mean[i] = vals.reduce((s, v) => s + v, 0) / vals.length;
  std[i] = Math.sqrt(vals.reduce((s, v) => s + (v - mean[i]) ** 2, 0) / vals.length) || 1;
  for (const r of rows) { const v = r.f[i]; if (v !== null) { if (v < lo[i]) lo[i] = v; if (v > hi[i]) hi[i] = v; } }
}
const z = (r) => r.f.map((v, i) => (v === null ? 0 : (v - mean[i]) / std[i]));
for (const g of Object.keys(groups)) for (const r of groups[g]) r.x = z(r);

// Every training language and both genders pull equally: weight by 1 / (how
// many summaries share this row's set and label).
const cell = {};
for (const r of groups.train) { const k = `${r.set}|${r.y}`; cell[k] = (cell[k] || 0) + 1; }
const cells = Object.keys(cell).length;
for (const r of groups.train) r.w = groups.train.length / (cells * cell[`${r.set}|${r.y}`]);

// --- Models ----------------------------------------------------------------
const sigmoid = (v) => 1 / (1 + Math.exp(-v));
const H = 16;

function initNet(hidden) {
  const p = { hidden: [], out: { w: [], b: 0 } };
  if (!hidden) { p.out.w = new Array(D).fill(0); return p; }
  for (let h = 0; h < hidden; h++) p.hidden.push({ w: Array.from({ length: D }, () => gauss() * Math.sqrt(1 / D)), b: 0 });
  p.out.w = Array.from({ length: hidden }, () => gauss() * Math.sqrt(1 / hidden));
  return p;
}
function forward(p, x, acts) {
  if (!p.hidden.length) { let s = p.out.b; for (let i = 0; i < D; i++) s += p.out.w[i] * x[i]; return s; }
  let s = p.out.b;
  for (let h = 0; h < p.hidden.length; h++) {
    const u = p.hidden[h];
    let a = u.b;
    for (let i = 0; i < D; i++) a += u.w[i] * x[i];
    const t = Math.tanh(a);
    if (acts) acts[h] = t;
    s += p.out.w[h] * t;
  }
  return s;
}
function flat(p) {
  const v = [];
  for (const u of p.hidden) { v.push(...u.w, u.b); }
  v.push(...p.out.w, p.out.b);
  return v;
}
function unflat(p, v) {
  let k = 0;
  for (const u of p.hidden) { for (let i = 0; i < D; i++) u.w[i] = v[k++]; u.b = v[k++]; }
  for (let i = 0; i < p.out.w.length; i++) p.out.w[i] = v[k++];
  p.out.b = v[k++];
}
function nll(p, data) {
  let s = 0;
  for (const r of data) { const q = sigmoid(forward(p, r.x)); s -= r.y ? Math.log(q + 1e-12) : Math.log(1 - q + 1e-12); }
  return s / data.length;
}
function accuracy(p, data) {
  let ok = 0;
  for (const r of data) if ((forward(p, r.x) >= 0 ? 1 : 0) === r.y) ok++;
  return ok / data.length;
}

function train(hidden, { epochs = 60, lr = 0.003, l2 = 1e-3, batch = 64 } = {}) {
  const p = initNet(hidden);
  let theta = flat(p);
  const m = new Array(theta.length).fill(0);
  const v = new Array(theta.length).fill(0);
  let step = 0;
  let best = { loss: Infinity, theta: theta.slice(), epoch: 0 };
  const data = groups.train.slice();
  const acts = new Array(hidden || 0);
  for (let epoch = 1; epoch <= epochs; epoch++) {
    for (let i = data.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [data[i], data[j]] = [data[j], data[i]]; }
    for (let start = 0; start < data.length; start += batch) {
      const grad = new Array(theta.length).fill(0);
      const end = Math.min(data.length, start + batch);
      for (let b = start; b < end; b++) {
        const r = data[b];
        // Small input jitter: summaries of the same voice differ by about this much.
        const x = r.x.map((val) => val + gauss() * 0.05);
        const err = (sigmoid(forward(p, x, acts)) - r.y) * r.w;
        let k = 0;
        if (hidden) {
          for (let h = 0; h < hidden; h++) {
            const dh = err * p.out.w[h] * (1 - acts[h] * acts[h]);
            for (let i = 0; i < D; i++) grad[k++] += dh * x[i];
            grad[k++] += dh;
          }
          for (let h = 0; h < hidden; h++) grad[k++] += err * acts[h];
        } else {
          for (let i = 0; i < D; i++) grad[k++] += err * x[i];
        }
        grad[k] += err;
      }
      step++;
      const n = end - start;
      for (let k = 0; k < theta.length; k++) {
        const g = grad[k] / n + l2 * theta[k];
        m[k] = 0.9 * m[k] + 0.1 * g;
        v[k] = 0.999 * v[k] + 0.001 * g * g;
        theta[k] -= (lr * (m[k] / (1 - 0.9 ** step))) / (Math.sqrt(v[k] / (1 - 0.999 ** step)) + 1e-8);
      }
      unflat(p, theta);
    }
    const loss = nll(p, groups.val);
    if (loss < best.loss) best = { loss, theta: theta.slice(), epoch };
    else if (epoch - best.epoch >= 8) break;
  }
  unflat(p, best.theta);
  return { p, epoch: best.epoch, valLoss: best.loss };
}

// Platt scaling on the validation logits: z' = scale * z + shift.
function calibrate(p) {
  let scale = 1;
  let shift = 0;
  const zs = groups.val.map((r) => [forward(p, r.x), r.y]);
  for (let it = 0; it < 2000; it++) {
    let gs = 0;
    let gb = 0;
    for (const [zv, y] of zs) { const e = sigmoid(scale * zv + shift) - y; gs += e * zv; gb += e; }
    scale -= (0.05 * gs) / zs.length;
    shift -= (0.05 * gb) / zs.length;
  }
  return { scale: Math.round(scale * 10000) / 10000, shift: Math.round(shift * 10000) / 10000 };
}

function report(p, cal, data) {
  const res = data.map((r) => {
    const q = sigmoid(forward(p, r.x) * cal.scale + cal.shift);
    return { r, q, conf: Math.max(q, 1 - q), ok: (q >= 0.5 ? 1 : 0) === r.y };
  });
  const acc = (list) => (list.length ? list.filter((e) => e.ok).length / list.length : null);
  const pct = (v) => (v === null ? null : Math.round(v * 1000) / 10);
  const by = (fn) => {
    const m = {};
    for (const e of res) { const k = fn(e); if (k === null) continue; (m[k] = m[k] || []).push(e); }
    return Object.fromEntries(Object.entries(m).sort().map(([k, list]) => [k, { n: list.length, accuracy: pct(acc(list)) }]));
  };
  const atConf = (t) => {
    const kept = res.filter((e) => e.conf >= t);
    return { share: pct(kept.length / res.length), accuracy: pct(acc(kept)) };
  };
  // Expected calibration error over ten confidence bins.
  let ece = 0;
  for (let b = 0; b < 10; b++) {
    const bin = res.filter((e) => e.conf >= 0.5 + b * 0.05 && e.conf < 0.55 + b * 0.05 + (b === 9 ? 1e-9 : 0));
    if (bin.length) ece += (bin.length / res.length) * Math.abs(acc(bin) - bin.reduce((s, e) => s + e.conf, 0) / bin.length);
  }
  return {
    n: res.length,
    accuracy: pct(acc(res)),
    women: pct(acc(res.filter((e) => e.r.y === 1))),
    men: pct(acc(res.filter((e) => e.r.y === 0))),
    calibrationError: Math.round(ece * 1000) / 10,
    byCondition: by((e) => (e.r.aug === 'clean' ? 'clean' : e.r.aug.includes('narrow') ? 'narrow-band' : e.r.aug.includes('noise') ? 'noisy' : 'filtered')),
    byLength: by((e) => (e.r.n < 80 ? 'under 80 frames' : e.r.n < 140 ? '80-139 frames' : '140+ frames')),
    bySet: by((e) => e.r.set),
    atConfidence: { 0.8: atConf(0.8), 0.9: atConf(0.9), 0.95: atConf(0.95), 0.98: atConf(0.98) },
    _res: res,
  };
}

// Lowest confidence at which validation answers are right at least `target`
// of the time, searched on a grid and kept inside [min, max].
function thresholdFor(res, target, min, max) {
  for (let t = min; t <= max + 1e-9; t += 0.01) {
    const kept = res.filter((e) => e.conf >= t);
    if (kept.length && kept.filter((e) => e.ok).length / kept.length >= target) return Math.round(t * 100) / 100;
  }
  return max;
}

const lr = train(0, { epochs: 80, lr: 0.01, l2: 1e-3 });
const net = train(H, { epochs: 120, lr: 0.003, l2: 2e-3 });
const lrCal = calibrate(lr.p);
const netCal = calibrate(net.p);
const lrVal = report(lr.p, lrCal, groups.val);
const netVal = report(net.p, netCal, groups.val);
console.log(`logistic regression: val accuracy ${lrVal.accuracy}%, loss ${lr.valLoss.toFixed(4)} (epoch ${lr.epoch})`);
console.log(`neural network (${H} hidden): val accuracy ${netVal.accuracy}%, loss ${net.valLoss.toFixed(4)} (epoch ${net.epoch})`);

// The network ships only if it is actually better on held-back speakers.
const useNet = net.valLoss < lr.valLoss;
const chosen = useNet ? net.p : lr.p;
const cal = useNet ? netCal : lrCal;
const val = useNet ? netVal : lrVal;
const test = report(chosen, cal, groups.test);
const baseline = report(useNet ? lr.p : net.p, useNet ? lrCal : netCal, groups.test);

const thresholds = {
  // "Confirmed": right 99% of the time on validation.
  confirm: thresholdFor(val._res, 0.99, 0.8, 0.97),
  // "Does not match": right 99.7% of the time, and the server still asks for two calls.
  mismatch: thresholdFor(val._res, 0.997, 0.9, 0.995),
};
const strip = (r) => { const { _res, ...rest } = r; return rest; };
const round = (v) => Math.round(v * 100000) / 100000;

const model = {
  about: 'TalkLive voice model: P(a voice sounds feminine) from the summary in public/voice-features.js. Built by scripts/voice/train.js; do not edit by hand.',
  featureVersion: FEATURE_VERSION,
  trainedAt: new Date().toISOString().slice(0, 10),
  kind: useNet ? `neural network, ${H} hidden units (tanh)` : 'logistic regression',
  data: {
    train: 'Google FLEURS train splits (16 languages, balanced sample) + LibriSpeech dev-clean; each recording also as two degraded copies (noise, filtering, narrow-band)',
    validation: 'FLEURS dev splits with both genders + LibriSpeech dev-other',
    test: 'FLEURS test splits of 8 languages never trained on (ps, mr, it, ms, yo, th, am, sd) + LibriSpeech test-clean and test-other',
    counts: Object.fromEntries(Object.entries(groups).map(([g, list]) => [g, list.length])),
  },
  mean: mean.map(round),
  std: std.map(round),
  optional: OPTIONAL,
  // Widest values seen in any recording, with a margin: a summary outside is not speech.
  range: lo.map((v, i) => { const span = (hi[i] - v) || 1; return [round(v - span * 0.5), round(hi[i] + span * 0.5)]; }),
  hidden: useNet ? chosen.hidden.map((u) => ({ w: u.w.map(round), b: round(u.b) })) : null,
  out: { w: chosen.out.w.map(round), b: round(chosen.out.b) },
  calibration: cal,
  thresholds,
  metrics: { validation: strip(val), test: strip(test), otherModelTestAccuracy: baseline.accuracy },
};
fs.writeFileSync(outPath, JSON.stringify(model, null, 1) + '\n');
console.log(`\nchosen: ${model.kind}; thresholds ${JSON.stringify(thresholds)}`);
console.log('TEST (never tuned on):', JSON.stringify(strip(test), null, 1));
console.log(`wrote ${outPath}`);
