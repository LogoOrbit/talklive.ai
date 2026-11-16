'use strict';
// Pure pieces of the matcher in server/index.js: no sockets, no store, no
// clock of their own (every function takes `now`), so they can be tested and
// simulated in plain Node. index.js owns the queue; this file only answers
// "how much should this candidate's score move" and "how long is the wait".

// --- Fair waiting --------------------------------------------------------------
// A seeker takes the best-scoring waiter. Without aging, someone who shares no
// interests with anyone can be passed over for as long as better-scoring people
// keep arriving. Each second waited adds a little to a waiter's score, capped.
//
// The numbers: one shared interest is worth 2 points, so a waiter with no
// shared interests overtakes a fresh arrival with one after 4s and one with two
// after 8s - shared interests still decide between people who just arrived. The
// cap (25) is above the most a free-tier match can score on interests, language,
// trust and the model together (about 23), so after ~50s at the very worst a
// compatible waiter is first in line for anyone. Plus members' +1000 still wins.
const AGE_POINTS_PER_SEC = 0.5;
const AGE_CAP = 25;
function waitAging(waitedMs) {
  if (!(waitedMs > 0)) return 0;
  return Math.min(AGE_CAP, (waitedMs / 1000) * AGE_POINTS_PER_SEC);
}

// --- Fewer repeated encounters --------------------------------------------------
// The 60s soft hold in index.js stops an immediate reunion, but a few minutes
// later two regulars on a quiet hour kept landing on each other. This remembers
// each person's recent partners (bounded: the last RECENT_MAX, for RECENT_TTL_MS)
// and turns a recent meeting into a ranking penalty that fades linearly to zero.
// Never an exclusion: on a quiet site meeting the same person again beats
// waiting forever, and aging lets a long-waiting repeat partner through.
const RECENT_MAX = 30;
const RECENT_TTL_MS = 60 * 60 * 1000;
// Five shared interests' worth when fresh: someone new is preferred over a
// repeat even when the repeat shares a lot, unless the repeat has waited 20s
// longer than the alternative.
const REPEAT_PENALTY = 10;
const RECENT_MAX_PEOPLE = 50000;

function createRecentPartners({ max = RECENT_MAX, ttlMs = RECENT_TTL_MS, maxPeople = RECENT_MAX_PEOPLE } = {}) {
  const byPerson = new Map(); // clientId -> [{ id, at }] newest last

  function add(a, b, now) {
    let list = byPerson.get(a);
    if (!list) {
      // A hard bound on memory: past it, the least recently refreshed person
      // (Map iteration order = insertion order) is forgotten first.
      if (byPerson.size >= maxPeople) byPerson.delete(byPerson.keys().next().value);
      list = [];
    } else {
      byPerson.delete(a); // re-insert below, so the order tracks recency
    }
    const i = list.findIndex((e) => e.id === b);
    if (i !== -1) list.splice(i, 1);
    list.push({ id: b, at: now });
    while (list.length > max) list.shift();
    byPerson.set(a, list);
  }

  return {
    note(a, b, now) {
      if (!a || !b || a === b) return;
      add(a, b, now);
      add(b, a, now);
    },
    // 0 for someone not met in the window; REPEAT_PENALTY just after a meeting.
    penalty(a, b, now) {
      const list = byPerson.get(a);
      if (!list) return 0;
      for (let i = list.length - 1; i >= 0; i--) {
        if (list[i].id !== b) continue;
        const age = now - list[i].at;
        return age >= ttlMs ? 0 : REPEAT_PENALTY * (1 - Math.max(0, age) / ttlMs);
      }
      return 0;
    },
    metRecently(a, b, now) { return this.penalty(a, b, now) > 0; },
    sweep(now) {
      for (const [k, list] of byPerson) {
        const kept = list.filter((e) => now - e.at < ttlMs);
        if (kept.length) byPerson.set(k, kept); else byPerson.delete(k);
      }
    },
    size() { return byPerson.size; },
    clear() { byPerson.clear(); },
  };
}

// --- Honest wait estimate ------------------------------------------------------
// "Usually matches in about Ns" used to be 12/sqrt(online), which has nothing to
// do with how long anyone actually waited. This keeps the last WAIT_SAMPLES real
// waits per pool (talk/chat), and answers with their median when there are
// enough recent ones; otherwise the caller's formula stands.
const WAIT_SAMPLES = 50;
const WAIT_MAX_AGE_MS = 15 * 60 * 1000;
const WAIT_MIN_SAMPLES = 5;

function createWaitStats({ samples = WAIT_SAMPLES, maxAgeMs = WAIT_MAX_AGE_MS, minSamples = WAIT_MIN_SAMPLES } = {}) {
  const pools = new Map(); // pool -> [{ s, at }]
  return {
    add(pool, seconds, now) {
      if (!(seconds >= 0) || !Number.isFinite(seconds)) return;
      const list = pools.get(pool) || [];
      list.push({ s: seconds, at: now });
      while (list.length > samples) list.shift();
      pools.set(pool, list);
    },
    // Median of the recent waits, or null with too little data.
    median(pool, now) {
      const recent = (pools.get(pool) || []).filter((e) => now - e.at <= maxAgeMs).map((e) => e.s);
      if (recent.length < minSamples) return null;
      recent.sort((x, y) => x - y);
      const mid = recent.length >> 1;
      return recent.length % 2 ? recent[mid] : (recent[mid - 1] + recent[mid]) / 2;
    },
    count(pool, now) { return (pools.get(pool) || []).filter((e) => now - e.at <= maxAgeMs).length; },
    clear() { pools.clear(); },
  };
}

// --- Rate limit for skip / find-partner ----------------------------------------
// A token bucket per socket: a burst of SEARCH_BURST, refilled at
// SEARCH_PER_SEC. A person hammering Next listens for at least a moment between
// taps and never empties it; a script spinning the matcher does, quickly.
const SEARCH_BURST = 20;
const SEARCH_PER_SEC = 1;
function createTokenBucket({ burst = SEARCH_BURST, perSec = SEARCH_PER_SEC } = {}, now = 0) {
  let tokens = burst;
  let last = now;
  return {
    take(t) {
      tokens = Math.min(burst, tokens + Math.max(0, t - last) / 1000 * perSec);
      last = t;
      if (tokens < 1) return false;
      tokens -= 1;
      return true;
    },
    // Seconds until one more action would be allowed.
    retryIn() { return tokens >= 1 ? 0 : Math.ceil((1 - tokens) / perSec); },
  };
}

// --- Invariants ------------------------------------------------------------------
// What must hold between the waiting queue and the partner map at any quiet
// moment. Used by tests (via a debug route that only exists when
// MATCH_INVARIANTS=1), never logged in production.
//   - nobody is queued twice
//   - nobody is both queued and paired
//   - every partner link is symmetric and never points at oneself
//   - (optionally) nothing queued or paired belongs to a socket that is gone
function checkInvariants({ queue, partners, alive }) {
  const problems = [];
  const seen = new Set();
  for (const id of queue) {
    if (seen.has(id)) problems.push({ kind: 'queued-twice', id });
    seen.add(id);
    if (partners.has(id)) problems.push({ kind: 'queued-and-paired', id });
    if (alive && !alive(id)) problems.push({ kind: 'ghost-in-queue', id });
  }
  for (const [a, b] of partners) {
    if (a === b) problems.push({ kind: 'self-paired', id: a });
    if (partners.get(b) !== a) problems.push({ kind: 'asymmetric', id: a, partner: b, back: partners.get(b) || null });
    if (alive && !alive(a)) problems.push({ kind: 'ghost-paired', id: a });
  }
  return problems;
}

module.exports = {
  AGE_POINTS_PER_SEC, AGE_CAP, waitAging,
  RECENT_MAX, RECENT_TTL_MS, REPEAT_PENALTY, createRecentPartners,
  WAIT_SAMPLES, WAIT_MAX_AGE_MS, WAIT_MIN_SAMPLES, createWaitStats,
  SEARCH_BURST, SEARCH_PER_SEC, createTokenBucket,
  checkInvariants,
};
