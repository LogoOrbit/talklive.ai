'use strict';
/*
 * Owner "Intelligence" tab: pure functions that turn plain data into plain
 * JSON. No store access, no I/O, no timers, so each one is unit tested
 * (scripts/test-insights.js) and cheap: every function is a single O(n) pass
 * over what it is given, and the caller caches the result for minutes.
 *
 *   anomalies(series, now)   hourly metrics vs the same hour of the week
 *   forecast(daily, days)    next-week active users and matches
 *   retention(talkTime, now) weekly cohorts, D1/D7/D30, stickiness
 *   health(m)                one 0-100 score with the weakest part named
 *   trustPanel / modelPanel  summaries from reputation.js / match-model.js
 */

const HOUR = 3600000;
const DAY = 86400000;
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function median(arr) {
  const n = arr.length;
  if (!n) return 0;
  const a = Float64Array.from(arr).sort();
  return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
}

// ---------------------------------------------------------------------------
// 1. Anomalies
// ---------------------------------------------------------------------------

const WARN_Z = 3.5;
const CRIT_Z = 6;
const MIN_HISTORY = 8;

/*
 * Metrics read from each hourly row. `kind` count -> compared as-is; `ratio`
 * -> a 0-1 share, only computed when the denominator is big enough to mean
 * something. `floor` keeps a quiet history (MAD of 0) from making every
 * wobble look huge. `bad` says which direction a person should worry about.
 */
const METRICS = [
  { key: 'connections', label: 'Connections', kind: 'count', floor: 1, get: (r) => num(r.connections) },
  { key: 'newIds', label: 'New IDs', kind: 'count', floor: 1, get: (r) => num(r.newIds != null ? r.newIds : r.uniques) },
  { key: 'searches', label: 'Searches for a partner', kind: 'count', floor: 1, get: (r) => num(r.searches) },
  { key: 'matches', label: 'Matches', kind: 'count', floor: 1, get: (r) => num(r.matches) },
  { key: 'matchesPerConn', label: 'Matches per connection', kind: 'ratio', floor: 0.03, pct: false,
    get: (r) => (num(r.connections) >= 5 && num(r.matches) != null ? r.matches / r.connections : null) },
  { key: 'mediaOk', label: 'Audio success', kind: 'ratio', floor: 0.03, pct: true,
    get: (r) => {
      const ok = num(r.mediaOk); const bad = num(r.mediaFailed);
      return ok != null && bad != null && ok + bad >= 5 ? ok / (ok + bad) : null;
    } },
  { key: 'reports', label: 'Reports', kind: 'count', floor: 1, get: (r) => num(r.reports) },
  { key: 'quickSkip', label: 'Quick-skip share', kind: 'ratio', floor: 0.03, pct: true,
    get: (r) => (num(r.quickSkips) != null && num(r.matches) >= 5 ? r.quickSkips / r.matches : null) },
  { key: 'botMatch', label: 'Quarantined-bot matches', kind: 'count', floor: 1, get: (r) => num(r.botMatch) },
  { key: 'botSearch', label: 'Quarantined-bot searches', kind: 'count', floor: 1, get: (r) => num(r.botSearch) },
  { key: 'botQuarantine', label: 'New bots quarantined', kind: 'count', floor: 1, get: (r) => num(r.botQuarantine) },
  { key: 'talkSeconds', label: 'Talk time', kind: 'count', floor: 30, get: (r) => num(r.talkSeconds) },
];

function whenLabel(t) {
  const d = new Date(t);
  return `${DOW[d.getUTCDay()]} ${String(d.getUTCHours()).padStart(2, '0')}:00 UTC`;
}

function fmtVal(m, v) {
  if (m.pct) return Math.round(v * 100) + '%';
  if (m.kind === 'ratio') return v.toFixed(2);
  return v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10);
}

function short(m, value, usual, dir) {
  if (m.kind === 'ratio') {
    return `${m.label} ${dir === 'up' ? 'rose' : 'fell'} to ${fmtVal(m, value)} (usually ${fmtVal(m, usual)})`;
  }
  const verb = dir === 'up' ? 'above' : 'below';
  if (dir === 'up' && usual > 0 && value / usual >= 2) {
    const x = value / usual;
    return `${m.label} are ${x >= 10 ? Math.round(x) : Math.round(x * 10) / 10}x the usual (${fmtVal(m, value)} vs ${fmtVal(m, usual)})`;
  }
  if (usual > 0) {
    const p = Math.round(Math.abs(value - usual) / usual * 100);
    return `${m.label} are ${p}% ${verb} the usual (${fmtVal(m, value)} vs ${fmtVal(m, usual)})`;
  }
  return `${m.label} are ${fmtVal(m, value)} against a usual ${fmtVal(m, usual)}`;
}

/**
 * series: hourly rows [{ t: hourStartMs, connections, newIds, searches,
 * matches, mediaOk, mediaFailed, reports, quickSkips, botMatch, botSearch,
 * botQuarantine, talkSeconds }]; any field may be missing (that metric is
 * skipped). Judges the latest complete hour before `now`.
 */
function anomalies(series, now = Date.now()) {
  const out = { at: now, hour: null, alerts: [], diagnoses: [], checked: 0, skipped: [] };
  if (!Array.isArray(series) || !series.length) return out;
  const target = Math.floor(now / HOUR) * HOUR - HOUR;
  out.hour = whenLabel(target);
  const how = (t) => { const d = new Date(t); return d.getUTCDay() * 24 + d.getUTCHours(); };
  const targetHow = how(target);
  const targetDow = new Date(target).getUTCDay();
  const weekend = targetDow === 0 || targetDow === 6;
  const targetHour = new Date(target).getUTCHours();
  let cur = null;
  const same = new Map();      // metric key -> same hour-of-week values
  const pooled = new Map();    // fallback: same hour, same weekday/weekend class
  for (const m of METRICS) { same.set(m.key, []); pooled.set(m.key, []); }
  for (const r of series) {
    if (!r || !(r.t < target + HOUR)) continue;
    if (r.t === target) { cur = r; continue; }
    if (r.t > target) continue;
    const d = new Date(r.t);
    const h = d.getUTCHours();
    const isSame = how(r.t) === targetHow;
    const isPool = h === targetHour && ((d.getUTCDay() === 0 || d.getUTCDay() === 6) === weekend);
    if (!isSame && !isPool) continue;
    for (const m of METRICS) {
      const v = m.get(r);
      if (v == null) continue;
      if (isSame) same.get(m.key).push(v);
      if (isPool) pooled.get(m.key).push(v);
    }
  }
  if (!cur) return out;
  const flagged = {};
  for (const m of METRICS) {
    const value = m.get(cur);
    if (value == null) continue;
    let hist = same.get(m.key);
    let basis = when2(target);
    if (hist.length < MIN_HISTORY) { hist = pooled.get(m.key); basis = (weekend ? 'a weekend' : 'a weekday') + ` ${String(targetHour).padStart(2, '0')}:00 UTC`; }
    if (hist.length < MIN_HISTORY) { out.skipped.push(m.key); continue; }
    out.checked++;
    const med = median(hist);
    const mad = median(hist.map((x) => Math.abs(x - med)));
    const scale = Math.max(mad * 1.4826, m.floor, Math.abs(med) * 0.1);
    const z = (value - med) / scale;
    const az = Math.abs(z);
    if (az < WARN_Z) continue;
    const dir = z > 0 ? 'up' : 'down';
    const a = {
      metric: m.key, label: m.label, severity: az >= CRIT_Z ? 'critical' : 'warn', direction: dir,
      z: Math.round(z * 10) / 10, value, usual: med, history: hist.length,
      short: short(m, value, med, dir),
      sentence: short(m, value, med, dir) + ` for ${basis}.`,
    };
    out.alerts.push(a);
    flagged[m.key] = a;
  }
  out.alerts.sort((a, b) => (a.severity === b.severity ? Math.abs(b.z) - Math.abs(a.z) : a.severity === 'critical' ? -1 : 1));
  out.diagnoses = diagnose(flagged, when2(target));
  return out;
}

function when2(t) {
  const d = new Date(t);
  return `${DOW[d.getUTCDay()]} ${String(d.getUTCHours()).padStart(2, '0')}:00`;
}

const lc = (t) => t.charAt(0).toLowerCase() + t.slice(1);

/** Combine co-occurring anomalies into a named, plain-language diagnosis. */
function diagnose(f, when) {
  const up = (k) => f[k] && f[k].direction === 'up';
  const down = (k) => f[k] && f[k].direction === 'down';
  const list = [];
  const botSignal = up('newIds') || up('searches') || up('botSearch') || up('botMatch') || up('botQuarantine');
  const qualityDown = down('matchesPerConn') || down('mediaOk');
  if (botSignal && (qualityDown || down('talkSeconds'))) {
    const lead = up('newIds') ? f.newIds : up('searches') ? f.searches : (f.botSearch || f.botMatch || f.botQuarantine);
    const q = down('mediaOk') ? f.mediaOk : (f.matchesPerConn || f.talkSeconds);
    const sev = lead.severity === 'critical' || q.severity === 'critical' ? 'critical' : 'warn';
    list.push({
      name: 'bot-wave', title: 'Likely bot wave', severity: sev,
      sentence: `${lead.short} for ${when} while ${lc(q.short)}. This pattern matches an automated/bot wave.`,
    });
  }
  const conn = f.connections;
  const mediaOrMatchDown = down('matches') || down('mediaOk') || down('matchesPerConn');
  if (!list.length && !conn && mediaOrMatchDown) {
    const a = f.mediaOk || f.matches || f.matchesPerConn;
    list.push({
      name: 'outage', title: 'Possible connectivity problem', severity: a.severity,
      sentence: `Visitors are still arriving as usual, but ${lc(a.short)} for ${when}. This looks like a connectivity or matching problem, not a drop in interest.`,
    });
  }
  if (up('connections') && up('matches') && !qualityDown && !down('talkSeconds')) {
    list.push({
      name: 'organic-spike', title: 'Organic spike', severity: 'warn',
      sentence: `Connections and matches are both well above the usual for ${when}${up('talkSeconds') ? ', and people are talking longer' : ''}, with quality steady. This looks like genuine interest.`,
    });
  }
  if (down('connections') && !list.some((d) => d.name === 'outage')) {
    list.push({
      name: 'drop-off', title: 'Drop-off in visitors', severity: f.connections.severity,
      sentence: `${f.connections.sentence} Fewer people are arriving than usual.`,
    });
  }
  return list;
}

// ---------------------------------------------------------------------------
// 2. Forecast
// ---------------------------------------------------------------------------

const dayNum = (key) => Math.floor(Date.parse(key + 'T00:00:00Z') / DAY);

/**
 * Seasonal-naive with day-of-week factors plus a damped linear trend, over
 * the last 8 weeks. daily: [{ day:'YYYY-MM-DD', dau, matches }] sorted old to
 * new, the last entry being a complete day. Returns, per metric, `days`
 * points { day, point, low, high } (low/high: about an 80% range from the
 * spread of past misses), or { insufficient: true } below 14 days.
 */
function forecastMetric(vals, lastDay, days) {
  const n = vals.length;
  const dowOf = (i) => (((lastDay - (n - 1 - i)) % 7) + 11) % 7; // 1970-01-01 was a Thursday (4)
  const sum = new Array(7).fill(0); const cnt = new Array(7).fill(0);
  let total = 0;
  for (let i = 0; i < n; i++) { sum[dowOf(i)] += vals[i]; cnt[dowOf(i)]++; total += vals[i]; }
  const mean = total / n;
  if (!(mean > 0)) return { insufficient: true };
  const factor = sum.map((s, d) => (cnt[d] && s > 0 ? s / cnt[d] / mean : 1));
  const y = vals.map((v, i) => v / factor[dowOf(i)]);
  // Least-squares line over the last 28 deseasonalised days.
  const m = Math.min(28, n);
  let sx = 0; let sy = 0; let sxy = 0; let sxx = 0;
  for (let k = 0; k < m; k++) { const x = k; const yy = y[n - m + k]; sx += x; sy += yy; sxy += x * yy; sxx += x * x; }
  const den = m * sxx - sx * sx;
  const slope = den ? (m * sxy - sx * sy) / den : 0;
  const icpt = (sy - slope * sx) / m;
  const level = icpt + slope * (m - 1);
  // Residuals of the same model on its own fit, for the band.
  const res = [];
  for (let k = 0; k < m; k++) res.push(vals[n - m + k] - (icpt + slope * k) * factor[dowOf(n - m + k)]);
  const rmed = median(res);
  const sigma = 1.4826 * median(res.map((r) => Math.abs(r - rmed)));
  const PHI = 0.9;
  const out = [];
  let damp = 0; let pw = 1;
  for (let h = 1; h <= days; h++) {
    pw *= PHI; damp += pw;
    const d = lastDay + h;
    const dow = (((d % 7) + 11) % 7);
    const point = Math.max(0, (level + slope * damp) * factor[dow]);
    const band = 1.28 * sigma * Math.sqrt(1 + h / 14);
    out.push({
      day: new Date(d * DAY).toISOString().slice(0, 10),
      point: Math.round(point), low: Math.max(0, Math.round(point - band)), high: Math.round(point + band),
    });
  }
  return { points: out };
}

function forecast(dailySeries, days = 7, hourly) {
  const res = { days, activeUsers: { insufficient: true }, matches: { insufficient: true }, peakHour: null, basisDays: 0 };
  if (!Array.isArray(dailySeries)) return res;
  const rows = dailySeries.slice(-56);
  res.basisDays = rows.length;
  if (rows.length >= 14) {
    const last = dayNum(rows[rows.length - 1].day);
    // Fill gaps with 0 so day-of-week alignment holds.
    const byDay = new Map(rows.map((r) => [dayNum(r.day), r]));
    const first = dayNum(rows[0].day);
    const dau = []; const mt = [];
    for (let d = first; d <= last; d++) {
      const r = byDay.get(d) || {};
      dau.push(r.dau || 0); mt.push(r.matches || 0);
    }
    res.activeUsers = forecastMetric(dau, last, days);
    res.matches = forecastMetric(mt, last, days);
  }
  if (Array.isArray(hourly) && hourly.length) {
    const sums = new Array(24).fill(0); const cnt = new Array(24).fill(0);
    for (const r of hourly) {
      const v = num(r.connections);
      if (v == null) continue;
      const h = new Date(r.t).getUTCHours();
      sums[h] += v; cnt[h]++;
    }
    let best = -1; let bestAvg = 0;
    for (let h = 0; h < 24; h++) if (cnt[h] && sums[h] / cnt[h] > bestAvg) { bestAvg = sums[h] / cnt[h]; best = h; }
    if (best >= 0) res.peakHour = { hourUtc: best, avgConnections: Math.round(bestAvg * 10) / 10 };
  }
  return res;
}

// ---------------------------------------------------------------------------
// 3. Retention
// ---------------------------------------------------------------------------

const MAX_USERS = 50000;

/**
 * talkTime: { clientId: { days: { 'YYYY-MM-DD': { s, n } } } } (the store's
 * own shape; only 30 days are kept, so D30 is mostly unknown and the cohorts
 * are approximate: someone active before the window looks "new" on their
 * first day inside it). One pass over at most MAX_USERS users.
 */
function retention(talkTime, now = Date.now()) {
  const out = { sample: { users: 0, total: 0, sampled: false, cap: MAX_USERS }, cohorts: [], stickiness: null, windowDays: 0 };
  if (!talkTime || typeof talkTime !== 'object') return out;
  const today = Math.floor(now / DAY);
  const lastDone = today - 1; // the latest complete day
  const total = Object.keys(talkTime).length;
  out.sample.total = total;
  const stride = total > MAX_USERS ? total / MAX_USERS : 1;
  out.sample.sampled = stride > 1;
  const cache = new Map();
  const dn = (k) => { let v = cache.get(k); if (v === undefined) { v = dayNum(k); cache.set(k, v); } return v; };
  const windowStart = today - 29;
  // Week start = Monday. Cohort map: weekStart -> counters.
  const weekOf = (d) => d - (((d + 3) % 7)); // 1970-01-01 Thursday: (d+3)%7 = 0 on Monday
  const cohorts = new Map();
  let i = 0; let next = 0; let used = 0;
  for (const id in talkTime) {
    if (i++ < next) continue;
    next += stride; // fractional stride keeps an even sample
    const rec = talkTime[id];
    if (!rec || !rec.days) continue;
    used++;
    let first = Infinity; let any = false;
    for (const k in rec.days) {
      const d = dn(k);
      if (!(rec.days[k] && rec.days[k].s > 0)) continue;
      any = true;
      if (d < first) first = d;
    }
    if (!any) continue;
    // Only cohorts that start inside the window are complete enough to show.
    const wk = weekOf(first);
    if (wk < windowStart) continue;
    let c = cohorts.get(wk);
    if (!c) { c = { size: 0, e1: 0, r1: 0, e7: 0, r7: 0, e30: 0, r30: 0 }; cohorts.set(wk, c); }
    c.size++;
    const has = (off, slack) => {
      for (let s = -slack; s <= slack; s++) {
        const r = rec.days[new Date((first + off + s) * DAY).toISOString().slice(0, 10)];
        if (r && r.s > 0) return true;
      }
      return false;
    };
    if (first + 1 <= lastDone) { c.e1++; if (has(1, 0)) c.r1++; }
    if (first + 8 <= lastDone) { c.e7++; if (has(7, 1)) c.r7++; }
    if (first + 31 <= lastDone) { c.e30++; if (has(30, 1)) c.r30++; }
  }
  out.sample.users = used;
  const rate = (r, e) => (e >= 3 ? Math.round(r / e * 1000) / 10 : null);
  const keys = [...cohorts.keys()].sort((a, b) => a - b).slice(-8);
  out.cohorts = keys.map((wk) => {
    const c = cohorts.get(wk);
    return {
      weekStart: new Date(wk * DAY).toISOString().slice(0, 10), size: c.size,
      d1: rate(c.r1, c.e1), d7: rate(c.r7, c.e7), d30: rate(c.r30, c.e30),
    };
  });
  out.windowDays = 30;
  return out;
}

/** DAU/MAU (average of the last 7 complete days over people active in the last 30), same sampling cap. */
function stickiness(talkTime, now = Date.now()) {
  if (!talkTime || typeof talkTime !== 'object') return null;
  const today = Math.floor(now / DAY);
  const total = Object.keys(talkTime).length;
  const stride = total > MAX_USERS ? total / MAX_USERS : 1;
  const cache = new Map();
  const dn = (k) => { let v = cache.get(k); if (v === undefined) { v = dayNum(k); cache.set(k, v); } return v; };
  let mau = 0; let dauSum = 0; let i = 0; let next = 0;
  for (const id in talkTime) {
    if (i++ < next) continue;
    next += stride;
    const rec = talkTime[id];
    if (!rec || !rec.days) continue;
    let active30 = false;
    for (const k in rec.days) {
      if (!(rec.days[k] && rec.days[k].s > 0)) continue;
      const d = dn(k);
      if (d >= today - 30 && d <= today - 1) { active30 = true; if (d >= today - 7) dauSum++; }
    }
    if (active30) mau++;
  }
  if (!mau) return null;
  const dau = dauSum / 7;
  return { dau: Math.round(dau * stride), mau: Math.round(mau * stride), ratio: Math.round(dau / mau * 1000) / 10 };
}

// ---------------------------------------------------------------------------
// 4. Health score
// ---------------------------------------------------------------------------

/*
 * Each component maps linearly onto 0-100 between a "bad" and a "good"
 * threshold (clamped), and the score is their plain average over the
 * components we have data for.
 *   audio success   <= 50% -> 0     >= 90% -> 100
 *   median match    <= 15s -> 0     >= 90s -> 100
 *   quick-skip      >= 60% -> 0     <= 15% -> 100   (left within seconds)
 *   report rate     >= 5 per 100 matches -> 0   <= 0.5 -> 100
 */
const HEALTH_PARTS = [
  { key: 'audioSuccess', label: 'Audio success', bad: 0.5, good: 0.9, hint: 'calls that connected with sound' },
  { key: 'medianMatchSec', label: 'Median match length', bad: 15, good: 90, hint: 'how long a typical conversation lasts' },
  { key: 'quickSkipShare', label: 'Quick-skip share', bad: 0.6, good: 0.15, hint: 'matches ended within seconds' },
  { key: 'reportRate', label: 'Report rate', bad: 0.05, good: 0.005, hint: 'reports per match' },
];

function health(m) {
  const out = { score: null, weakest: null, components: [] };
  if (!m || typeof m !== 'object') return out;
  let sum = 0;
  for (const p of HEALTH_PARTS) {
    const v = num(m[p.key]);
    if (v == null) continue;
    let s = (v - p.bad) / (p.good - p.bad) * 100;
    s = Math.max(0, Math.min(100, s));
    out.components.push({ key: p.key, label: p.label, hint: p.hint, value: v, score: Math.round(s) });
    sum += s;
  }
  if (!out.components.length) return out;
  out.score = Math.round(sum / out.components.length);
  out.weakest = out.components.reduce((a, b) => (b.score < a.score ? b : a)).key;
  return out;
}

/** Median of each person's average call length over the last 7 complete days (sampled). */
function medianCallSeconds(talkTime, now = Date.now()) {
  if (!talkTime) return null;
  const today = Math.floor(now / DAY);
  const total = Object.keys(talkTime).length;
  const stride = total > MAX_USERS ? total / MAX_USERS : 1;
  const vals = [];
  let i = 0; let next = 0;
  for (const id in talkTime) {
    if (i++ < next) continue;
    next += stride;
    const rec = talkTime[id];
    if (!rec || !rec.days) continue;
    let s = 0; let n = 0;
    for (const k in rec.days) {
      const d = Math.floor(Date.parse(k + 'T00:00:00Z') / DAY);
      if (d >= today - 7 && d < today && rec.days[k]) { s += rec.days[k].s || 0; n += rec.days[k].n || 0; }
    }
    if (n >= 1) vals.push(s / n);
  }
  return vals.length >= 5 ? Math.round(median(vals)) : null;
}

// ---------------------------------------------------------------------------
// 5. Trust and model panels (modules written elsewhere; may not exist yet)
// ---------------------------------------------------------------------------

function trustPanel() {
  try {
    const s = require('./reputation').summary();
    if (!s || !Array.isArray(s.histogram) || !(s.users > 0)) return null;
    return { users: s.users, mean: s.mean, histogram: s.histogram.slice(0, 10), low: s.low, high: s.high };
  } catch (_) { return null; }
}

function modelPanel() {
  try {
    const s = require('./match-model').summary();
    if (!s || !(s.samples > 0)) return null;
    const entries = Object.entries(s.weights || {}).filter(([, v]) => typeof v === 'number');
    entries.sort((a, b) => b[1] - a[1]);
    const top = entries.filter(([, v]) => v > 0).slice(0, 3).map(([name, weight]) => ({ name, weight }));
    const bottom = entries.filter(([, v]) => v < 0).slice(-3).reverse().map(([name, weight]) => ({ name, weight }));
    return {
      samples: s.samples, logLossEma: s.logLossEma, baseline: s.baseline,
      positive: top, negative: bottom,
      calibration: (s.calibration || []).slice(0, 20).map((c) => ({ p: c.p, actual: c.actual, n: c.n })),
    };
  } catch (_) { return null; }
}

module.exports = {
  anomalies, diagnose, forecast, retention, stickiness, health, medianCallSeconds, trustPanel, modelPanel,
  robust: { median },
};
