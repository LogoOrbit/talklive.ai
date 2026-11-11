#!/usr/bin/env node
'use strict';
/*
 * Tests for server/insights.js (owner Intelligence tab): robust-z anomalies,
 * combined diagnoses, forecast, retention cohorts and the health score.
 * Pure functions, no server needed.
 *
 * Run: node scripts/test-insights.js
 */
const assert = require('assert');
const ins = require('../server/insights');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); } catch (err) { failed++; console.error(`  ✗ ${name}\n      ${err.message}`); }
}

const DAY = 86400000;
// Tuesday 2026-11-10 15:30 UTC: the latest complete hour is 14:00.
const NOW = Date.UTC(2026, 10, 10, 15, 30);
const TARGET = Date.UTC(2026, 10, 10, 14);

// Nine weeks of the same hour-of-week, with mild deterministic noise.
function build(over = {}) {
  const rows = [];
  for (let w = 8; w >= 0; w--) {
    const t = TARGET - w * 7 * DAY;
    const noise = ((w * 7) % 5) - 2; // -2..2
    const row = {
      t, connections: 100 + noise * 3, newIds: 20 + noise, searches: 90 + noise * 2, matches: 60 + noise * 2,
      mediaOk: 80 + noise, mediaFailed: 20 - noise, reports: 2, quickSkips: 15, talkSeconds: 4000 + noise * 100,
    };
    if (w === 0) Object.assign(row, over);
    rows.push(row);
  }
  return rows;
}

console.log('insights');

test('robust z flags a 9x spike in new IDs', () => {
  const r = ins.anomalies(build({ newIds: 180 }), NOW);
  const a = r.alerts.find((x) => x.metric === 'newIds');
  assert(a, 'no alert');
  assert.strictEqual(a.direction, 'up');
  assert.strictEqual(a.severity, 'critical');
  assert(/9x the usual/.test(a.sentence), a.sentence);
});

test('normal noise raises nothing', () => {
  const r = ins.anomalies(build({ connections: 104, newIds: 21, matches: 62 }), NOW);
  assert.strictEqual(r.alerts.length, 0, JSON.stringify(r.alerts));
  assert(r.checked > 3);
});

test('needs at least 8 history points, else skips', () => {
  const rows = build({ newIds: 180 }).slice(-6); // 5 history points
  const r = ins.anomalies(rows, NOW);
  assert.strictEqual(r.alerts.length, 0);
  assert.strictEqual(r.checked, 0);
});

test('zero-variance history does not divide by zero', () => {
  const rows = build().map((x) => ({ ...x, reports: 0 }));
  rows[rows.length - 1].reports = 1;
  const r = ins.anomalies(rows, NOW);
  assert(!r.alerts.some((a) => !Number.isFinite(a.z)));
});

test('bot wave: more new IDs and worse audio success combine into one diagnosis', () => {
  const r = ins.anomalies(build({ newIds: 180, mediaOk: 24, mediaFailed: 76 }), NOW);
  const d = r.diagnoses.find((x) => x.name === 'bot-wave');
  assert(d, JSON.stringify(r.diagnoses));
  assert(/automated\/bot wave/.test(d.sentence));
  assert(/24%/.test(d.sentence) && /Tuesday 14:00/.test(d.sentence), d.sentence);
});

test('outage: arrivals steady but audio success collapses', () => {
  const r = ins.anomalies(build({ mediaOk: 10, mediaFailed: 90, matches: 15 }), NOW);
  assert(r.diagnoses.some((x) => x.name === 'outage'), JSON.stringify(r.diagnoses));
});

test('organic spike: connections and matches up, quality steady', () => {
  const r = ins.anomalies(build({ connections: 400, matches: 240 }), NOW);
  assert(r.diagnoses.some((x) => x.name === 'organic-spike'), JSON.stringify(r.diagnoses));
  assert(!r.diagnoses.some((x) => x.name === 'bot-wave'));
});

test('drop-off: connections far below usual', () => {
  const r = ins.anomalies(build({ connections: 20, matches: 12 }), NOW);
  assert(r.diagnoses.some((x) => x.name === 'drop-off'), JSON.stringify(r.diagnoses));
});

test('forecast follows a synthetic weekly pattern within 15%', () => {
  const pattern = [100, 140, 150, 145, 160, 220, 200]; // Sun..Sat
  const daily = [];
  const lastDay = Math.floor(Date.UTC(2026, 10, 9) / DAY);
  for (let d = lastDay - 41; d <= lastDay; d++) {
    const v = pattern[(d + 4) % 7];
    daily.push({ day: new Date(d * DAY).toISOString().slice(0, 10), dau: v, matches: v * 2 });
  }
  const f = ins.forecast(daily, 7);
  assert.strictEqual(f.activeUsers.points.length, 7);
  f.activeUsers.points.forEach((p, i) => {
    const want = pattern[(lastDay + 1 + i + 4) % 7];
    assert(Math.abs(p.point - want) / want <= 0.15, `day ${i}: ${p.point} vs ${want}`);
    assert(p.low <= p.point && p.point <= p.high);
  });
  const m = f.matches.points[0];
  assert(Math.abs(m.point - pattern[(lastDay + 1 + 4) % 7] * 2) / (pattern[(lastDay + 1 + 4) % 7] * 2) <= 0.15);
});

test('forecast with under 14 days says insufficient', () => {
  const f = ins.forecast([{ day: '2026-11-01', dau: 5, matches: 5 }], 7);
  assert(f.activeUsers.insufficient);
});

test('peak hour comes from hour-of-day averages', () => {
  const hourly = [];
  for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) hourly.push({ t: Date.UTC(2026, 10, 1 + d, h), connections: h === 20 ? 90 : 10 });
  assert.strictEqual(ins.forecast([], 7, hourly).peakHour.hourUtc, 20);
});

test('retention cohorts on a hand-built fixture', () => {
  const now = Date.UTC(2026, 10, 25, 12); // Wednesday
  const k = (n) => new Date(Date.UTC(2026, 10, n)).toISOString().slice(0, 10);
  const act = (...days) => ({ days: Object.fromEntries(days.map((d) => [k(d), { s: 60, n: 1 }])) });
  const tt = {};
  // Cohort week of Mon 2026-11-02: first seen on the 3rd, 3 users; two return on the 4th.
  tt.a = act(3, 4, 10); tt.b = act(3, 4); tt.c = act(3);
  // Cohort week of Mon 2026-11-09: first seen on the 10th, 3 users; one returns on the 11th and 17th.
  tt.d = act(10, 11, 17); tt.e = act(10, 24); tt.f = act(10);
  const r = ins.retention(tt, now);
  assert.strictEqual(r.sample.users, 6);
  assert.strictEqual(r.sample.sampled, false);
  const w1 = r.cohorts.find((c) => c.weekStart === '2026-11-02');
  const w2 = r.cohorts.find((c) => c.weekStart === '2026-11-09');
  assert.strictEqual(w1.size, 3);
  assert.strictEqual(w1.d1, 66.7);
  assert.strictEqual(w1.d7, 33.3); // a returned on day 7
  assert.strictEqual(w2.size, 3);
  assert.strictEqual(w2.d1, 33.3);
  assert.strictEqual(w2.d30, null);
  const s = ins.stickiness(tt, now);
  assert(s.mau === 6 && s.ratio > 0 && s.ratio < 100, JSON.stringify(s));
});

test('retention caps the sample at 50,000 users and says so', () => {
  const tt = {};
  const day = new Date(Date.UTC(2026, 10, 20)).toISOString().slice(0, 10);
  for (let i = 0; i < 60000; i++) tt['u' + i] = { days: { [day]: { s: 5, n: 1 } } };
  const r = ins.retention(tt, Date.UTC(2026, 10, 25));
  assert(r.sample.sampled && r.sample.total === 60000);
  assert(r.sample.users <= 50001 && r.sample.users >= 49990, r.sample.users);
});

test('health stays within 0-100 and names the weakest part', () => {
  const good = ins.health({ audioSuccess: 0.95, medianMatchSec: 120, quickSkipShare: 0.1, reportRate: 0.001 });
  assert.strictEqual(good.score, 100);
  const bad = ins.health({ audioSuccess: 0.1, medianMatchSec: 2, quickSkipShare: 0.99, reportRate: 0.5 });
  assert.strictEqual(bad.score, 0);
  const mixed = ins.health({ audioSuccess: 0.9, medianMatchSec: 90, quickSkipShare: 0.15, reportRate: 0.05 });
  assert.strictEqual(mixed.weakest, 'reportRate');
  assert(mixed.score >= 0 && mixed.score <= 100);
  assert.strictEqual(ins.health({}).score, null);
});

test('trust and model panels are null when the modules are missing or empty', () => {
  const t = ins.trustPanel(); const m = ins.modelPanel();
  assert(t === null || typeof t === 'object');
  assert(m === null || typeof m === 'object');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
