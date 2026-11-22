'use strict';
/*
 * Voice check: an estimate of whether a person's voice sounds masculine or
 * feminine, used by the gender filter (Men / Women / Anyone).
 *
 * It is an estimate about a voice, not a fact about a person. It is never
 * shown to anyone else, it never changes the gender someone chose, and the
 * person can retry it or ask a human to review it.
 *
 * How the pieces fit:
 *   1. During a voice call, the person's own device summarises a few seconds
 *      of their speech into about 30 numbers (public/voice-features.js; the
 *      Android app has the same code). No audio leaves the device.
 *   2. The server, not the device, turns that summary into a probability with
 *      a model trained on real speech (server/voice-model.json, built by
 *      scripts/voice/). A device can therefore not simply claim a result.
 *   3. Estimates from up to five recent calls are combined. One call is not
 *      enough to say a voice does NOT match: that takes two.
 *   4. The matcher asks eligible() below before pairing someone who filters
 *      by gender with a candidate.
 *
 * What is stored per profile is the estimates themselves (a number and a date
 * per call), retry times, an appeal and how many partners said the filter gave
 * them the wrong person. The summaries are discarded as soon as they are scored.
 */
const crypto = require('crypto');
const MODEL = require('./voice-model.json');

const DAY = 86400000;
const MAX_SESSIONS = 5;
// An estimate older than this no longer counts; the next calls renew it.
const SESSION_TTL_MS = 120 * DAY;
// Per-call evidence. A device sends its first summary at 80 voiced frames
// (about 4 s of voiced speech) and may send a longer one later in the call.
const MIN_FRAMES = 80;
const MAX_FRAMES = 2000;
// A device needs at least 4 s of call to hear 80 frames, so a summary that
// arrives sooner did not come from listening to this call.
const MIN_CALL_MS = 3500;
const MAX_SESSIONS_PER_DAY = 8;
const RETRIES_PER_DAY = 3;
// "Not who I filtered for", from different partners, before a profile has to
// pass the voice check to be matched through a gender filter again.
const DISPUTE_LIMIT = 3;
const DISPUTE_WINDOW_MS = 30 * DAY;
const APPEAL_COOLDOWN_MS = 7 * DAY;
const GENDER_CHANGES_PER_DAY = 2;

const T = MODEL.thresholds;

const sigmoid = (z) => 1 / (1 + Math.exp(-z));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * Checks a device's summary is one voice-features.js could have produced.
 * Returns the cleaned feature list, or null.
 */
function validSummary(s) {
  if (!s || typeof s !== 'object' || s.v !== MODEL.featureVersion) return null;
  const n = Number(s.n);
  if (!Number.isInteger(n) || n < MIN_FRAMES || n > MAX_FRAMES) return null;
  const f = s.f;
  if (!Array.isArray(f) || f.length !== MODEL.mean.length) return null;
  const out = new Array(f.length);
  for (let i = 0; i < f.length; i++) {
    const v = f[i];
    if (v === null) {
      if (!MODEL.optional.includes(i)) return null;
      out[i] = null;
      continue;
    }
    if (typeof v !== 'number' || !Number.isFinite(v)) return null;
    const [lo, hi] = MODEL.range[i];
    if (v < lo || v > hi) return null;
    out[i] = v;
  }
  // Pitch percentiles in order, inside the range the tracker can report.
  if (!(out[1] <= out[0] && out[0] <= out[2])) return null;
  return out;
}

/** Model output for a validated feature list: P(sounds feminine), calibrated. */
function score(features) {
  const x = features.map((v, i) => (v === null ? 0 : (v - MODEL.mean[i]) / MODEL.std[i]));
  let z;
  if (MODEL.hidden) {
    z = MODEL.out.b;
    for (let h = 0; h < MODEL.hidden.length; h++) {
      const unit = MODEL.hidden[h];
      let a = unit.b;
      for (let i = 0; i < x.length; i++) a += unit.w[i] * x[i];
      z += MODEL.out.w[h] * Math.tanh(a);
    }
  } else {
    z = MODEL.out.b;
    for (let i = 0; i < x.length; i++) z += MODEL.out.w[i] * x[i];
  }
  return z * MODEL.calibration.scale + MODEL.calibration.shift;
}

function fresh(rec, now) {
  return rec && Array.isArray(rec.s) ? rec.s.filter((e) => now - e[1] < SESSION_TTL_MS) : [];
}

/** Combined estimate over recent calls: { p, confidence, label, sessions } or null. */
function estimate(rec, now = Date.now()) {
  const sessions = fresh(rec, now);
  if (!sessions.length) return null;
  // Calls by the same person are not independent evidence, so the logits are
  // averaged rather than added: more calls make the estimate steadier, not
  // more extreme.
  const mean = sessions.reduce((sum, e) => sum + e[0], 0) / sessions.length;
  const p = sigmoid(mean);
  return { p, confidence: Math.max(p, 1 - p), label: p >= 0.5 ? 'female' : 'male', sessions: sessions.length };
}

function disputeCount(rec, now) {
  return rec && Array.isArray(rec.d) ? rec.d.filter((e) => now - e[1] < DISPUTE_WINDOW_MS).length : 0;
}

/**
 * Where a profile stands for the gender it declared:
 *   'off'        Voice check is not turned on
 *   'none'       no gender chosen, so there is nothing to compare with
 *   'pending'    on, no usable call yet
 *   'confirmed'  the voice estimate agrees with the chosen gender
 *   'reviewed'   a person on the team reviewed an appeal and confirmed it
 *   'unclear'    the model could not tell (common, and not a problem)
 *   'mismatch'   two or more calls disagree, confidently, with the chosen gender
 */
function status(rec, declared, enabled, now = Date.now()) {
  if (declared !== 'male' && declared !== 'female') return 'none';
  if (rec && rec.manual === declared) return 'reviewed';
  if (!enabled) return 'off';
  const est = estimate(rec, now);
  if (!est) return 'pending';
  if (est.label === declared) return est.confidence >= T.confirm ? 'confirmed' : 'unclear';
  if (est.confidence >= T.mismatch && est.sessions >= 2) return 'mismatch';
  return 'unclear';
}

/** Partners said the filter gave them the wrong person, and no check has cleared it since. */
function disputed(rec, declared, enabled, now = Date.now()) {
  if (disputeCount(rec, now) < DISPUTE_LIMIT) return false;
  const st = status(rec, declared, enabled, now);
  return st !== 'confirmed' && st !== 'reviewed';
}

/**
 * May `candidate` be given to someone filtering for `want`?
 *   strict  the seeker ticked "Voice-checked only"
 */
function eligible(rec, declared, enabled, want, strict, now = Date.now()) {
  if (declared !== want) return false;
  const st = status(rec, declared, enabled, now);
  if (st === 'mismatch') return false;
  if (st === 'confirmed' || st === 'reviewed') return true;
  if (strict) return false;
  return disputeCount(rec, now) < DISPUTE_LIMIT;
}

/** Ranking nudge among eligible candidates: checked voices first. */
function rankBonus(rec, declared, enabled, now = Date.now()) {
  const st = status(rec, declared, enabled, now);
  return st === 'confirmed' || st === 'reviewed' ? 4 : 0;
}

function blank() {
  return { s: [], r: [], d: [] };
}

/**
 * Scores one call's summary and adds it to the record.
 * ctx: { callMs, muted, alreadyThisCall }
 * Returns { ok, rec, more } or { ok: false, reason }.
 */
function addSession(rec, summary, ctx, now = Date.now()) {
  if (ctx.muted) return { ok: false, reason: 'muted' };
  if (!(ctx.callMs >= MIN_CALL_MS)) return { ok: false, reason: 'early' };
  const features = validSummary(summary);
  if (!features) return { ok: false, reason: 'invalid' };
  const next = { ...blank(), ...(rec || {}) };
  next.s = fresh(next, now);
  // The day's calls are counted from their own list: `s` keeps only the last
  // five estimates (and a retry empties it), so it cannot enforce a limit of eight.
  next.q = (next.q || []).filter((t) => now - t < DAY);
  if (!ctx.alreadyThisCall && next.q.length >= MAX_SESSIONS_PER_DAY) return { ok: false, reason: 'limit' };
  const logit = clamp(score(features), -6, 6);
  // A longer summary later in the same call replaces the first one.
  if (ctx.alreadyThisCall && next.s.length) next.s.pop();
  next.s.push([Math.round(logit * 1000) / 1000, now]);
  if (!ctx.alreadyThisCall) next.q.push(now);
  while (next.s.length > MAX_SESSIONS) next.s.shift();
  const p = sigmoid(logit);
  // Worth another, longer listen in this call when this one was unsure.
  return { ok: true, rec: next, more: Math.max(p, 1 - p) < T.confirm && !ctx.alreadyThisCall };
}

/** "Check again": forget the estimates and start over, a few times a day. */
function retry(rec, now = Date.now()) {
  const next = { ...blank(), ...(rec || {}) };
  next.r = (next.r || []).filter((t) => now - t < DAY);
  if (next.r.length >= RETRIES_PER_DAY) return { ok: false, reason: 'limit', retryAt: next.r[0] + DAY };
  next.r.push(now);
  next.s = [];
  return { ok: true, rec: next };
}

function retriesLeft(rec, now = Date.now()) {
  const used = rec && Array.isArray(rec.r) ? rec.r.filter((t) => now - t < DAY).length : 0;
  return Math.max(0, RETRIES_PER_DAY - used);
}

/** A partner who was matched through a gender filter says it was the wrong person. */
function addDispute(rec, reporterId, now = Date.now()) {
  const next = { ...blank(), ...(rec || {}) };
  const who = crypto.createHash('sha256').update(String(reporterId)).digest('hex').slice(0, 12);
  next.d = (next.d || []).filter((e) => now - e[1] < DISPUTE_WINDOW_MS && e[0] !== who);
  next.d.push([who, now]);
  if (next.d.length > 20) next.d.shift();
  // Estimates from before the complaints no longer vouch for this profile:
  // only calls after this moment can clear it.
  if (next.d.length >= DISPUTE_LIMIT) next.s = [];
  return next;
}

/** Ask a person on the team to look at it. One open appeal at a time. */
function openAppeal(rec, declared, note, now = Date.now()) {
  if (declared !== 'male' && declared !== 'female') return { ok: false, reason: 'no-gender' };
  const next = { ...blank(), ...(rec || {}) };
  const a = next.appeal;
  if (a && a.state === 'open') return { ok: false, reason: 'open' };
  if (a && a.state === 'denied' && now - (a.decidedAt || 0) < APPEAL_COOLDOWN_MS) {
    return { ok: false, reason: 'recent', retryAt: a.decidedAt + APPEAL_COOLDOWN_MS };
  }
  next.appeal = { state: 'open', at: now, gender: declared, note: String(note || '').slice(0, 500) };
  return { ok: true, rec: next };
}

/** The owner's decision on an appeal. Granting confirms the gender the person chose. */
function decideAppeal(rec, grant, now = Date.now()) {
  if (!rec || !rec.appeal || rec.appeal.state !== 'open') return null;
  const next = { ...rec, appeal: { ...rec.appeal, state: grant ? 'granted' : 'denied', decidedAt: now } };
  if (grant) { next.manual = rec.appeal.gender; next.d = []; }
  return next;
}

/**
 * Changing "I am" is free, but not as a way to chase whichever filter is
 * busy: after a couple of changes in a day the earlier choice stays in force
 * for matching until tomorrow. `entry` is { g, t: [change times] } for this
 * profile (kept in memory by the caller). Returns { gender, entry, held }.
 */
function declare(entry, wanted, now = Date.now()) {
  const known = wanted === 'male' || wanted === 'female';
  if (!entry || !entry.g) return { gender: wanted, entry: { g: known ? wanted : '', t: [], at: now }, held: false };
  const t = entry.t.filter((ts) => now - ts < DAY);
  if (wanted === entry.g) return { gender: wanted, entry: { g: entry.g, t, at: now }, held: false };
  if (t.length >= GENDER_CHANGES_PER_DAY) return { gender: entry.g, entry: { g: entry.g, t, at: now }, held: true };
  t.push(now);
  return { gender: wanted, entry: { g: known ? wanted : entry.g, t, at: now }, held: false };
}

/** What the person's own device is told. Nothing here goes to anyone else. */
function view(rec, declared, enabled, now = Date.now()) {
  const a = rec && rec.appeal;
  return {
    on: !!enabled,
    state: status(rec, declared, enabled, now),
    disputed: disputed(rec, declared, enabled, now),
    retriesLeft: retriesLeft(rec, now),
    appeal: a ? a.state : 'none',
    calls: fresh(rec, now).length,
    minFrames: MIN_FRAMES,
    featureVersion: MODEL.featureVersion,
  };
}

/** True when there is nothing worth keeping (so the store entry can go). */
function empty(rec, now = Date.now()) {
  if (!rec) return true;
  // On is the default, so only an explicit "off" is worth keeping on its own.
  return rec.on !== false && !fresh(rec, now).length && !rec.manual && !rec.appeal
    && !disputeCount(rec, now) && !(rec.r || []).some((t) => now - t < DAY);
}

module.exports = {
  MODEL, MIN_FRAMES, MIN_CALL_MS, DISPUTE_LIMIT, RETRIES_PER_DAY,
  validSummary, score, estimate, status, disputed, eligible, rankBonus,
  addSession, retry, retriesLeft, addDispute, openAppeal, decideAppeal, declare, view, empty,
};
