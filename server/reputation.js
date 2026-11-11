'use strict';
// Per-client trust score in [0,1], built from decayed positive (a) and negative
// (b) evidence: score = (a + A0) / (a + b + A0 + B0). New clients start near
// 0.8 (prior 4:1), so nobody is punished for being new. Evidence halves every
// 14 days, applied lazily when a record is read or updated.
//
// State per client is a 4-element array [a, b, lastTs, quickRate] kept in one
// plain object so it can live directly in store.data.reputation and be saved
// with everything else (load() adopts the object, it does not copy it).

const A0 = 4;
const B0 = 1;
const HALF_LIFE_MS = 14 * 864e5;
const STALE_MS = 60 * 864e5;
const MAX_ENTRIES = 200000;
const PAIR_CAP_MS = 24 * 3600 * 1000;
const QUICK_END_MS = 6500;
const REAL_MS = 60 * 1000;
const LONG_MS = 5 * 60 * 1000;
const TIER_HIGH = 0.75;
const TIER_LOW = 0.4;
const QUICK_ALPHA = 0.2;

const EVIDENCE = {
  convo: 1, convoLong: 2, heart: 1.5, friend: 2,
  quick: 0.15, reportBase: 3, blocked: 1, ban: 6,
};
const NEGATIVE = new Set(['quick', 'reported', 'blocked', 'ban', 'age']);
const PAIR_CAPPED = new Set(['reported', 'heart', 'friend']);

let users = {};
let size = 0;
const pairSeen = new Map(); // 'type|from|to' -> ts, in memory only
const negCounts = Object.create(null);

function decayFactor(dt) {
  return dt > 0 ? Math.pow(2, -dt / HALF_LIFE_MS) : 1;
}
const r3 = (x) => Math.round(x * 1000) / 1000;
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const rawScore = (a, b) => (a + A0) / (a + b + A0 + B0);

// Pure. Returns a new state with the event applied after decaying to `now`.
// event: { type, ms?, self?, reporterTrust? }
function apply(state, event, now) {
  let a = 0, b = 0, q = 0;
  if (state) {
    const f = decayFactor(now - (state[2] || now));
    a = (state[0] || 0) * f; b = (state[1] || 0) * f; q = (state[3] || 0) * f;
  }
  const t = event && event.type;
  if (t === 'end') {
    const ms = Number(event.ms) || 0;
    if (ms >= LONG_MS) a += EVIDENCE.convoLong;
    else if (ms >= REAL_MS) a += EVIDENCE.convo;
    if (event.self) {
      if (ms < QUICK_END_MS) { b += EVIDENCE.quick; q += QUICK_ALPHA * (1 - q); }
      else q -= QUICK_ALPHA * q;
    }
  } else if (t === 'heart') a += EVIDENCE.heart;
  else if (t === 'friend') a += EVIDENCE.friend;
  else if (t === 'reported') {
    const rt = typeof event.reporterTrust === 'number' ? clamp01(event.reporterTrust) : rawScore(0, 0);
    b += EVIDENCE.reportBase * rt;
  } else if (t === 'blocked') b += EVIDENCE.blocked;
  else if (t === 'ban' || t === 'age') b += EVIDENCE.ban;
  return [r3(a), r3(b), now, r3(q)];
}

function validCid(cid) {
  return typeof cid === 'string' && cid.length >= 1 && cid.length <= 64
    && cid !== '__proto__' && cid !== 'constructor' && cid !== 'prototype';
}

function score(cid, now = Date.now()) {
  const s = validCid(cid) ? users[cid] : null;
  if (!s) return rawScore(0, 0);
  const f = decayFactor(now - s[2]);
  return rawScore(s[0] * f, s[1] * f);
}

function tier(cid, now) {
  const s = score(cid, now);
  return s >= TIER_HIGH ? 'high' : s < TIER_LOW ? 'low' : 'normal';
}

function quickRate(cid, now = Date.now()) {
  const s = validCid(cid) ? users[cid] : null;
  return s ? (s[3] || 0) * decayFactor(now - s[2]) : 0;
}

function evictOldest() {
  const entries = Object.entries(users).sort((x, y) => x[1][2] - y[1][2]);
  const drop = Math.max(size - Math.floor(MAX_ENTRIES * 0.9), 0);
  for (let i = 0; i < drop; i++) delete users[entries[i][0]];
  size -= drop;
}

function note(cid, event, extra = {}) {
  if (!validCid(cid)) return false;
  const now = typeof extra.now === 'number' ? extra.now : Date.now();
  const ev = { type: event, ms: extra.ms, self: extra.self, reporterTrust: extra.reporterTrust };
  if (event === 'reported' && extra.reporter) {
    if (extra.reporter === cid) return false;
    ev.reporterTrust = score(extra.reporter, now);
  }
  const from = extra.from || extra.reporter;
  if (from && PAIR_CAPPED.has(event)) {
    const key = event + '|' + from + '|' + cid;
    const seen = pairSeen.get(key);
    if (seen && now - seen < PAIR_CAP_MS) return false;
    pairSeen.set(key, now);
    if (pairSeen.size > 50000) {
      for (const [k, ts] of pairSeen) if (now - ts >= PAIR_CAP_MS) pairSeen.delete(k);
      if (pairSeen.size > 50000) pairSeen.clear();
    }
  }
  const prev = users[cid];
  const next = apply(prev, ev, now);
  if (!prev) size++;
  users[cid] = next;
  if (NEGATIVE.has(event)) negCounts[event] = (negCounts[event] || 0) + 1;
  if (event === 'end' && extra.self && extra.ms < QUICK_END_MS) negCounts.quick = (negCounts.quick || 0) + 1;
  if (size > MAX_ENTRIES) evictOldest();
  return true;
}

function prune(now = Date.now()) {
  let removed = 0;
  for (const cid of Object.keys(users)) {
    const s = users[cid];
    const f = decayFactor(now - s[2]);
    if (now - s[2] > STALE_MS || (s[0] * f < 0.05 && s[1] * f < 0.05 && (s[3] || 0) * f < 0.05)) {
      delete users[cid];
      removed++;
    }
  }
  size -= removed;
  return removed;
}

function load(obj) {
  users = obj && typeof obj === 'object' ? obj : {};
  size = 0;
  for (const cid of Object.keys(users)) {
    const s = users[cid];
    if (!Array.isArray(s) || s.length < 3 || !Number.isFinite(s[2])) delete users[cid];
    else size++;
  }
  return users;
}
const attached = (obj) => users === obj;
const dump = () => users;

function summary(now = Date.now()) {
  const histogram = new Array(10).fill(0);
  let sum = 0, n = 0, low = 0, high = 0;
  for (const cid of Object.keys(users)) {
    const sc = score(cid, now);
    histogram[Math.min(9, Math.floor(sc * 10))]++;
    sum += sc; n++;
    if (sc < TIER_LOW) low++; else if (sc >= TIER_HIGH) high++;
  }
  const negative = Object.entries(negCounts).map(([event, count]) => ({ event, count })).sort((x, y) => y.count - x.count);
  return { users: n, mean: n ? r3(sum / n) : r3(rawScore(0, 0)), histogram, low, high, negative };
}

function reset() { users = {}; size = 0; pairSeen.clear(); for (const k of Object.keys(negCounts)) delete negCounts[k]; }

module.exports = {
  apply, score, tier, quickRate, note, summary, load, dump, prune, attached, reset,
  A0, B0, HALF_LIFE_MS, STALE_MS, MAX_ENTRIES, PAIR_CAP_MS, QUICK_END_MS, TIER_HIGH, TIER_LOW, EVIDENCE,
};
