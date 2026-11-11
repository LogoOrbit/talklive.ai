'use strict';
// Online logistic regression: P(good conversation) for a candidate pair.
// Features are bounded, symmetric in (a, b) and built by the pure features().
// Trained with Adagrad + L2 on labels taken at match end. Until MIN_SAMPLES
// it contributes nothing to matching.

const NAMES = [
  'bias', 'lang', 'country', 'region', 'interests', 'trustMin', 'trustMax', 'trustDiff',
  'bothPremium', 'voice', 'hourSin', 'hourCos', 'quickMax', 'quickMin', 'platformSame',
];
const N = NAMES.length;
const LR = 0.05;
const L2 = 1e-4;
const W_CLIP = 4;
const MIN_SAMPLES = 500;
const LOSS_ALPHA = 0.01;
const BUCKETS = 10;
// Score shift: W * (p - baseline), hard-capped. matchScore's typical range is
// about 0-8 (2 per shared interest + 1 language), so 1 point is ~15%.
const SCORE_W = 3;
const MAX_SHIFT = 1;

// Ranking applies only when this many people wait; below it matching is exactly
// the old behaviour. It never excludes a candidate, only reorders them.
const MIN_POOL_FOR_RANKING = 6;
const TIER_PREFER = 1;
// Added to the base score: low-trust pairs preferred, low-with-other avoided,
// plus the (already bounded) model delta. Always finite, never a filter.
function rankAdjust(seekerTier, candTier, modelDelta) {
  let adj = Number.isFinite(modelDelta) ? modelDelta : 0;
  if (seekerTier === 'low' && candTier === 'low') adj += TIER_PREFER;
  else if ((seekerTier === 'low') !== (candTier === 'low')) adj -= TIER_PREFER;
  return adj;
}

let w = new Array(N).fill(0);
let g = new Array(N).fill(1e-8); // Adagrad accumulators
let samples = 0, positives = 0, logLossEma = Math.LN2;
let calN = new Array(BUCKETS).fill(0), calP = new Array(BUCKETS).fill(0), calY = new Array(BUCKETS).fill(0);

const regionOf = (tz) => (typeof tz === 'string' && tz.indexOf('/') > 0 ? tz.slice(0, tz.indexOf('/')) : '');
const num = (x, d = 0) => (Number.isFinite(x) ? x : d);
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

// a, b: profiles ({lang, country, timezone, interests, premium, device|platform}).
// ctx: {trustA, trustB, quickA, quickB, hour (0-23), mode}. `out` optional
// array to fill, so scoring loops reuse one buffer.
function features(a, b, ctx = {}, out = new Array(N)) {
  const ta = clamp01(num(ctx.trustA, 0.8)), tb = clamp01(num(ctx.trustB, 0.8));
  const qa = clamp01(num(ctx.quickA)), qb = clamp01(num(ctx.quickB));
  const ang = (2 * Math.PI * (num(ctx.hour) % 24)) / 24;
  const ra = regionOf(a.timezone), rb = regionOf(b.timezone);
  let shared = 0;
  if (a.interests && b.interests && a.interests.length && b.interests.length) {
    for (let i = 0; i < a.interests.length && i < 10; i++) {
      const x = String(a.interests[i]).toLowerCase();
      for (let j = 0; j < b.interests.length && j < 10; j++) if (String(b.interests[j]).toLowerCase() === x) { shared++; break; }
    }
  }
  const pa = a.platform || a.device, pb = b.platform || b.device;
  out[0] = 1;
  out[1] = a.lang && a.lang === b.lang ? 1 : 0;
  out[2] = a.country && a.country !== 'XX' && a.country === b.country ? 1 : 0;
  out[3] = ra && ra === rb ? 1 : 0;
  out[4] = Math.min(shared, 4) / 4;
  out[5] = Math.min(ta, tb);
  out[6] = Math.max(ta, tb);
  out[7] = Math.abs(ta - tb);
  out[8] = a.premium && b.premium ? 1 : 0;
  out[9] = ctx.mode === 'chat' ? 0 : 1;
  out[10] = Math.sin(ang);
  out[11] = Math.cos(ang);
  out[12] = Math.max(qa, qb);
  out[13] = Math.min(qa, qb);
  out[14] = pa && pa === pb ? 1 : 0;
  return out;
}

function sigmoid(z) { return 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z)))); }
function raw(x) { let z = 0; for (let i = 0; i < N; i++) z += w[i] * x[i]; return sigmoid(z); }
const baseline = () => (samples ? positives / samples : 0.5);
const ready = () => samples >= MIN_SAMPLES;

// Neutral (the baseline rate) until warmed up.
function predict(a, b, ctx) {
  if (!ready()) return baseline();
  return raw(features(a, b, ctx));
}

// Bounded score shift for matching; exactly 0 during cold start.
function adjust(a, b, ctx, buf) {
  if (!ready()) return 0;
  const d = SCORE_W * (raw(features(a, b, ctx, buf)) - baseline());
  return d > MAX_SHIFT ? MAX_SHIFT : d < -MAX_SHIFT ? -MAX_SHIFT : d;
}

function learn(x, y) {
  if (!x || x.length !== N || (y !== 0 && y !== 1)) return false;
  const p = raw(x);
  const eps = 1e-12;
  const loss = -(y * Math.log(p + eps) + (1 - y) * Math.log(1 - p + eps));
  logLossEma = samples === 0 ? loss : logLossEma + LOSS_ALPHA * (loss - logLossEma);
  const k = Math.min(BUCKETS - 1, Math.floor(p * BUCKETS));
  calN[k]++; calP[k] += p; calY[k] += y;
  const err = p - y;
  for (let i = 0; i < N; i++) {
    const grad = err * x[i] + (i === 0 ? 0 : L2 * w[i]);
    g[i] += grad * grad;
    let nw = w[i] - (LR * grad) / Math.sqrt(g[i]);
    if (nw > W_CLIP) nw = W_CLIP; else if (nw < -W_CLIP) nw = -W_CLIP;
    w[i] = nw;
  }
  samples++;
  positives += y;
  return true;
}

function summary() {
  const weights = {};
  NAMES.forEach((n, i) => { weights[n] = Math.round(w[i] * 1000) / 1000; });
  const calibration = calN.map((n, i) => ({ bucket: i, n, predicted: n ? calP[i] / n : null, actual: n ? calY[i] / n : null }));
  return { samples, ready: ready(), logLossEma, baseline: baseline(), weights, calibration };
}

function dump() {
  return { v: 1, w: w.slice(), g: g.slice(), samples, positives, logLossEma, calN: calN.slice(), calP: calP.slice(), calY: calY.slice() };
}

function reset() {
  w = new Array(N).fill(0); g = new Array(N).fill(1e-8);
  samples = 0; positives = 0; logLossEma = Math.LN2;
  calN = new Array(BUCKETS).fill(0); calP = new Array(BUCKETS).fill(0); calY = new Array(BUCKETS).fill(0);
}

function load(o) {
  reset();
  if (!o || o.v !== 1 || !Array.isArray(o.w) || o.w.length !== N) return false;
  const arr = (a, len, def) => (Array.isArray(a) && a.length === len && a.every(Number.isFinite) ? a.slice() : new Array(len).fill(def));
  w = arr(o.w, N, 0).map((x) => Math.max(-W_CLIP, Math.min(W_CLIP, x)));
  g = arr(o.g, N, 1e-8);
  samples = Math.max(0, Math.floor(num(o.samples)));
  positives = Math.min(samples, Math.max(0, num(o.positives)));
  logLossEma = num(o.logLossEma, Math.LN2);
  calN = arr(o.calN, BUCKETS, 0); calP = arr(o.calP, BUCKETS, 0); calY = arr(o.calY, BUCKETS, 0);
  return true;
}

// Label at match end: 1 = good, 0 = bad, null = ignore.
function label(ms, positive) {
  if (positive || ms >= 60000) return 1;
  if (ms < 15000) return 0;
  return null;
}

module.exports = { MIN_POOL_FOR_RANKING, TIER_PREFER, rankAdjust, NAMES, N, features, predict, adjust, learn, summary, dump, load, reset, label, ready, baseline, MIN_SAMPLES, SCORE_W, MAX_SHIFT, W_CLIP };
