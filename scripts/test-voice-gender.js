#!/usr/bin/env node
'use strict';
// Unit tests for Voice check, without a server:
//
//   1. public/voice-features.js, the on-device signal processing: pitch on
//      synthetic vowels at the sample rates browsers use, silence and noise,
//      and the 33-number summary.
//   2. server/voice-check.js, the rules that turn those summaries into a
//      status: validation, per-call limits, averaging, the status table, the
//      gender-filter rules, disputes, retries, appeals and "I am" changes.
//
// The real summaries in scripts/voice/fixtures.json come from held-out speech
// and are regenerated when the model is retrained, so the tests that use them
// assert on outcomes (confirmed / mismatch / unclear), never on probabilities.
// Tests tagged [model] depend on how strict the trained thresholds are.
//
//   node scripts/test-voice-gender.js
const assert = require('assert');
const VF = require('../public/voice-features.js');
const vc = require('../server/voice-check.js');
const fixtures = require('./voice/fixtures.json');

let failed = 0;
let count = 0;
function check(name, fn) {
  count++;
  try {
    fn();
    console.log('ok  ', name);
  } catch (e) {
    failed++;
    console.log('FAIL', name, '-', e.message.split('\n')[0]);
  }
}

// --- 1. voice-features.js ------------------------------------------------------

// A glottal pulse train through three resonators: a stand-in for a sustained
// vowel, with a light vibrato so the pitch is not perfectly steady.
function synthVowel(rate, f0, formantsHz, seconds) {
  const n = Math.floor(rate * seconds);
  let y = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    phase += (f0 * (1 + 0.01 * Math.sin((2 * Math.PI * 5 * i) / rate))) / rate;
    if (phase >= 1) { phase -= 1; y[i] = 1; }
  }
  for (const fc of formantsHz) {
    const r = Math.exp((-Math.PI * (80 + fc * 0.04)) / rate);
    const c1 = 2 * r * Math.cos((2 * Math.PI * fc) / rate);
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

// Feeds a signal to a tracker the way voice-gender.js does: a 2048-sample
// block every 50 ms.
function listen(signal, rate) {
  const tracker = VF.createTracker();
  const hop = Math.round(rate * 0.05);
  for (let off = 0; off + 2048 <= signal.length; off += hop) tracker.push(signal.subarray(off, off + 2048), rate);
  return tracker;
}

for (const rate of [48000, 44100, 16000]) {
  for (const f0 of [110, 150, 210, 260]) {
    check(`pitch ${f0} Hz at ${rate} Hz sampling is within 3%`, () => {
      const t = listen(synthVowel(rate, f0, [450 + f0, 1500, 2500], 4), rate);
      assert.ok(t.voiced >= 60, `only ${t.voiced} voiced frames`);
      const s = t.summary();
      const median = 100 * 2 ** s.f[0];
      assert.ok(Math.abs(median - f0) / f0 < 0.03, `median pitch ${median.toFixed(1)} Hz`);
    });
  }
}

check('silence produces no voiced frames and no summary', () => {
  const t = listen(new Float32Array(48000 * 3), 48000);
  assert.strictEqual(t.voiced, 0);
  assert.strictEqual(t.summary(), null);
});

check('quiet room noise produces no voiced frames', () => {
  const noise = new Float32Array(48000 * 3).map(() => (Math.random() - 0.5) * 0.004);
  assert.strictEqual(listen(noise, 48000).voiced, 0);
});

check('loud white noise produces almost no voiced frames', () => {
  const noise = new Float32Array(48000 * 3).map(() => (Math.random() - 0.5) * 0.5);
  const t = listen(noise, 48000);
  assert.ok(t.voiced <= t.seen * 0.05, `${t.voiced} of ${t.seen} blocks counted as voiced`);
});

check('a 6 s vowel at 48 kHz gives at least 80 voiced frames at 50 ms hops', () => {
  const t = listen(synthVowel(48000, 140, [550, 1550, 2550], 6), 48000);
  assert.ok(t.voiced >= 80, `${t.voiced} voiced frames`);
  assert.ok(t.seen >= 100);
});

check('summarise returns { v, n, f } with 33 entries', () => {
  const t = listen(synthVowel(48000, 180, [600, 1700, 2700], 5), 48000);
  const s = t.summary();
  assert.strictEqual(s.v, VF.VERSION);
  assert.strictEqual(s.n, t.voiced);
  assert.strictEqual(s.f.length, 33);
  assert.strictEqual(VF.FEATURE_COUNT, 33);
  assert.ok(s.f.every((v) => v === null || Number.isFinite(v)));
});

check('pitch percentiles are ordered (10th <= median <= 90th)', () => {
  const s = listen(synthVowel(48000, 160, [550, 1600, 2600], 5), 48000).summary();
  assert.ok(s.f[1] <= s.f[0] && s.f[0] <= s.f[2], JSON.stringify(s.f.slice(0, 3)));
});

check('a real vowel gives formant entries and a plausible spacing', () => {
  const s = listen(synthVowel(48000, 120, [500, 1500, 2500], 5), 48000).summary();
  assert.ok(s.f[27] !== null && s.f[28] !== null && s.f[29] !== null && s.f[30] !== null, JSON.stringify(s.f.slice(27, 32)));
  assert.ok(s.f[30] > 0.8 && s.f[30] < 1.4, `spacing ${s.f[30]} kHz`);
});

check('summarise leaves the formant entries null when too few frames have formants', () => {
  const frame = (formants) => ({ f0: 120, mfcc: new Float64Array(12), hiRatio: -2, formants });
  const none = VF.summarise(new Array(30).fill(0).map(() => frame(null)));
  assert.deepStrictEqual(none.f.slice(27, 31), [null, null, null, null]);
  assert.strictEqual(none.f[31], 0);
  // 6 of 40 is under both the 10-frame floor and the 15% share.
  const few = VF.summarise(new Array(40).fill(0).map((_, i) => frame(i < 6 ? [500, 1500, 2500] : null)));
  assert.deepStrictEqual(few.f.slice(27, 31), [null, null, null, null]);
  const enough = VF.summarise(new Array(40).fill(0).map((_, i) => frame(i < 14 ? [500, 1500, 2500] : null)));
  assert.ok(enough.f.slice(27, 31).every((v) => v !== null));
  assert.ok(Math.abs(enough.f[31] - 14 / 40) < 1e-3);
});

check('summarise of no frames is null', () => {
  assert.strictEqual(VF.summarise([]), null);
});

check('a summary of a synthetic vowel passes the server validation shape rules', () => {
  const s = listen(synthVowel(48000, 130, [520, 1520, 2520], 6), 48000).summary();
  // Synthetic vowels are not speech, so a value may fall outside the range
  // real speech covers; only the shape is checked here.
  assert.strictEqual(s.f.length, vc.MODEL.mean.length);
  assert.strictEqual(s.v, vc.MODEL.featureVersion);
});

// --- 2. server/voice-check.js --------------------------------------------------

const DAY = 86400000;
const NOW = 1_800_000_000_000;
const T = vc.MODEL.thresholds;
const call = (extra) => ({ callMs: 6000, muted: false, alreadyThisCall: false, ...extra });
const fix = (which, i = 0) => JSON.parse(JSON.stringify(fixtures[which][i]));
const logit = (p) => Math.log(p / (1 - p));
// A record with hand-made estimates, so status rules are tested independent of the model.
const recWith = (logits, extra) => ({ on: true, s: logits.map((z, i) => [z, NOW - i * 1000]), r: [], d: [], ...extra });
const STRONG_F = logit((1 + T.mismatch) / 2);
const STRONG_M = -STRONG_F;

check('the fixtures are valid summaries', () => {
  for (const k of ['female', 'male', 'unclear']) {
    assert.ok(fixtures[k].length >= 2, k);
    for (const s of fixtures[k]) assert.ok(vc.validSummary(s), k);
  }
});

check('validSummary accepts a real summary and returns the features', () => {
  const out = vc.validSummary(fix('female'));
  assert.strictEqual(out.length, 33);
});

check('validSummary accepts null in the optional (formant) slots', () => {
  const s = fix('female');
  for (const i of vc.MODEL.optional) s.f[i] = null;
  assert.ok(vc.validSummary(s));
});

check('validSummary rejects junk, the wrong version, the wrong length and few frames', () => {
  assert.strictEqual(vc.validSummary(null), null);
  assert.strictEqual(vc.validSummary('x'), null);
  assert.strictEqual(vc.validSummary({}), null);
  assert.strictEqual(vc.validSummary({ ...fix('female'), v: vc.MODEL.featureVersion + 1 }), null);
  const short = fix('female'); short.f.pop();
  assert.strictEqual(vc.validSummary(short), null);
  const long = fix('female'); long.f.push(0);
  assert.strictEqual(vc.validSummary(long), null);
  assert.strictEqual(vc.validSummary({ ...fix('female'), n: vc.MIN_FRAMES - 1 }), null);
  assert.ok(vc.validSummary({ ...fix('female'), n: vc.MIN_FRAMES }));
  assert.strictEqual(vc.validSummary({ ...fix('female'), n: 2001 }), null);
  assert.strictEqual(vc.validSummary({ ...fix('female'), n: 100.5 }), null);
  assert.strictEqual(vc.validSummary({ ...fix('female'), f: 'nope' }), null);
});

check('validSummary rejects non-finite, non-numeric and out-of-range values', () => {
  for (const bad of [NaN, Infinity, -Infinity, '1.2', {}, true]) {
    const s = fix('female'); s.f[5] = bad;
    assert.strictEqual(vc.validSummary(s), null, String(bad));
  }
  const hi = fix('female'); hi.f[3] = vc.MODEL.range[3][1] + 1;
  assert.strictEqual(vc.validSummary(hi), null);
  const lo = fix('female'); lo.f[4] = vc.MODEL.range[4][0] - 1;
  assert.strictEqual(vc.validSummary(lo), null);
});

check('validSummary rejects null in a slot that is not optional', () => {
  const s = fix('female'); s.f[10] = null;
  assert.strictEqual(vc.validSummary(s), null);
  const p = fix('female'); p.f[0] = null;
  assert.strictEqual(vc.validSummary(p), null);
});

check('validSummary rejects pitch percentiles out of order', () => {
  const s = fix('female');
  const [med, p10, p90] = [s.f[0], s.f[1], s.f[2]];
  s.f[1] = p90; s.f[2] = p10; s.f[0] = med;
  assert.strictEqual(vc.validSummary(s), null);
});

check('addSession scores a valid call and stores [logit, time]', () => {
  const out = vc.addSession({ on: true }, fix('female'), call(), NOW);
  assert.ok(out.ok);
  assert.strictEqual(out.rec.s.length, 1);
  assert.strictEqual(out.rec.s[0][1], NOW);
  assert.ok(out.rec.s[0][0] > 0);
  assert.strictEqual(out.rec.on, true);
});

check('addSession refuses a muted call, a call under 3.5 s, and an invalid summary', () => {
  assert.deepStrictEqual(vc.addSession({ on: true }, fix('female'), call({ muted: true }), NOW), { ok: false, reason: 'muted' });
  assert.strictEqual(vc.addSession({ on: true }, fix('female'), call({ callMs: vc.MIN_CALL_MS - 1 }), NOW).reason, 'early');
  assert.strictEqual(vc.addSession({ on: true }, fix('female'), call({ callMs: undefined }), NOW).reason, 'early');
  assert.ok(vc.addSession({ on: true }, fix('female'), call({ callMs: vc.MIN_CALL_MS }), NOW).ok);
  assert.strictEqual(vc.addSession({ on: true }, { v: 1, n: 5, f: [] }, call(), NOW).reason, 'invalid');
});

check('addSession does not change the record it was given', () => {
  const rec = { on: true, s: [[1, NOW - 1000]], r: [], d: [] };
  const copy = JSON.stringify(rec);
  vc.addSession(rec, fix('female'), call(), NOW);
  assert.strictEqual(JSON.stringify(rec), copy);
});

check('addSession keeps the five most recent calls', () => {
  let rec = { on: true };
  for (let i = 0; i < 7; i++) {
    const out = vc.addSession(rec, fix('female'), call(), NOW + i * 60000);
    assert.ok(out.ok);
    rec = out.rec;
  }
  assert.strictEqual(rec.s.length, 5);
  assert.strictEqual(rec.s[0][1], NOW + 2 * 60000);
});

check('addSession limits how many calls count in one day, even when old estimates roll off', () => {
  let rec = { on: true };
  let accepted = 0;
  let last;
  for (let i = 0; i < 12; i++) {
    last = vc.addSession(rec, fix('female'), call(), NOW + i * 1000);
    if (last.ok) { accepted++; rec = last.rec; }
  }
  assert.strictEqual(accepted, 8, 'accepts exactly 8 calls a day');
  assert.strictEqual(last.reason, 'limit');
  // The next day it works again.
  assert.ok(vc.addSession(rec, fix('female'), call(), NOW + DAY + 5000).ok);
});

check('a second summary in the same call replaces the first, and does not use up the daily limit', () => {
  const first = vc.addSession({ on: true }, fix('male'), call(), NOW);
  const second = vc.addSession(first.rec, fix('female'), call({ alreadyThisCall: true }), NOW + 8000);
  assert.ok(second.ok);
  assert.strictEqual(second.rec.s.length, 1);
  assert.ok(second.rec.s[0][0] > 0, 'the later (female) summary is the one kept');
  assert.strictEqual(second.more, false, 'no third listen is requested');
});

check('addSession asks to keep listening only when the first summary was unsure', () => {
  const unsure = vc.addSession({ on: true }, fix('unclear'), call(), NOW);
  assert.strictEqual(unsure.more, true);
  const sure = vc.addSession({ on: true }, fix('female'), call(), NOW);
  assert.strictEqual(sure.more, false);
  const unsureAgain = vc.addSession(unsure.rec, fix('unclear'), call({ alreadyThisCall: true }), NOW + 1);
  assert.strictEqual(unsureAgain.more, false);
});

check('estimate is null with no calls and averages the logits otherwise', () => {
  assert.strictEqual(vc.estimate(null, NOW), null);
  assert.strictEqual(vc.estimate({ s: [] }, NOW), null);
  const est = vc.estimate(recWith([2, 4]), NOW);
  assert.ok(Math.abs(est.p - 1 / (1 + Math.exp(-3))) < 1e-9);
  assert.strictEqual(est.label, 'female');
  assert.strictEqual(est.sessions, 2);
  assert.strictEqual(vc.estimate(recWith([-1]), NOW).label, 'male');
});

check('more calls make an estimate steadier, not more extreme', () => {
  const one = vc.estimate(recWith([2]), NOW).confidence;
  const three = vc.estimate(recWith([2, 2, 2]), NOW).confidence;
  assert.ok(Math.abs(one - three) < 1e-9);
});

check('estimates expire after 120 days', () => {
  const edge = { on: true, s: [[3, NOW - 119 * DAY]] };
  assert.ok(vc.estimate(edge, NOW));
  const old = { on: true, s: [[3, NOW - 121 * DAY]] };
  assert.strictEqual(vc.estimate(old, NOW), null);
  assert.strictEqual(vc.status(old, 'female', true, NOW), 'pending');
  assert.strictEqual(vc.view(old, 'female', true, NOW).calls, 0);
});

check('status: off, none, pending', () => {
  assert.strictEqual(vc.status(recWith([STRONG_F]), 'female', false, NOW), 'off');
  assert.strictEqual(vc.status(recWith([STRONG_F]), 'unspecified', true, NOW), 'none');
  assert.strictEqual(vc.status(recWith([STRONG_F]), '', true, NOW), 'none');
  assert.strictEqual(vc.status(null, 'female', false, NOW), 'off');
  assert.strictEqual(vc.status(null, 'male', true, NOW), 'pending');
  assert.strictEqual(vc.status({ on: true, s: [] }, 'male', true, NOW), 'pending');
});

check('status: confirmed needs confidence at the confirm threshold', () => {
  assert.strictEqual(vc.status(recWith([logit((1 + T.confirm) / 2)]), 'female', true, NOW), 'confirmed');
  assert.strictEqual(vc.status(recWith([-logit((1 + T.confirm) / 2)]), 'male', true, NOW), 'confirmed');
  assert.strictEqual(vc.status(recWith([logit(T.confirm - 0.02)]), 'female', true, NOW), 'unclear');
});

check('status: a disagreeing voice is unclear after one call and mismatch after two', () => {
  assert.strictEqual(vc.status(recWith([STRONG_M]), 'female', true, NOW), 'unclear');
  assert.strictEqual(vc.status(recWith([STRONG_M, STRONG_M]), 'female', true, NOW), 'mismatch');
  assert.strictEqual(vc.status(recWith([STRONG_F, STRONG_F]), 'male', true, NOW), 'mismatch');
  // Two calls that disagree with each other average out to unclear.
  assert.strictEqual(vc.status(recWith([STRONG_M, STRONG_F]), 'female', true, NOW), 'unclear');
  // Disagreeing but not confidently is unclear, however many calls.
  assert.strictEqual(vc.status(recWith([-1, -1, -1]), 'female', true, NOW), 'unclear');
});

check('status: a granted review is "reviewed" for the gender chosen at appeal time only', () => {
  const rec = recWith([STRONG_M, STRONG_M], { manual: 'female' });
  assert.strictEqual(vc.status(rec, 'female', true, NOW), 'reviewed');
  assert.notStrictEqual(vc.status(rec, 'male', true, NOW), 'reviewed');
  assert.strictEqual(vc.status({ on: true, manual: 'female', s: [] }, 'male', true, NOW), 'pending');
});

check('[model] real female voice summaries are confirmed for a woman', () => {
  for (const s of fixtures.female) {
    const out = vc.addSession({ on: true }, s, call(), NOW);
    assert.strictEqual(vc.status(out.rec, 'female', true, NOW), 'confirmed');
    assert.strictEqual(vc.status(out.rec, 'male', true, NOW), 'unclear', 'one call is never a mismatch');
  }
});

check('[model] real male voice summaries are confirmed for a man', () => {
  for (const s of fixtures.male) {
    const out = vc.addSession({ on: true }, s, call(), NOW);
    assert.strictEqual(vc.status(out.rec, 'male', true, NOW), 'confirmed', `p(female) ${vc.estimate(out.rec, NOW).p.toFixed(4)}`);
    assert.strictEqual(vc.status(out.rec, 'female', true, NOW), 'unclear', 'one call is never a mismatch');
  }
});

check('[model] two opposite calls (male voices, declared female) give a mismatch', () => {
  let rec = { on: true };
  rec = vc.addSession(rec, fixtures.male[0], call(), NOW).rec;
  assert.strictEqual(vc.status(rec, 'female', true, NOW), 'unclear');
  rec = vc.addSession(rec, fixtures.male[1], call(), NOW + 60000).rec;
  const est = vc.estimate(rec, NOW + 60000);
  assert.strictEqual(vc.status(rec, 'female', true, NOW + 60000), 'mismatch', `male confidence ${est.confidence.toFixed(4)} vs mismatch threshold ${T.mismatch}`);
});

check('[model] two opposite calls (female voices, declared male) give a mismatch', () => {
  let rec = { on: true };
  rec = vc.addSession(rec, fixtures.female[0], call(), NOW).rec;
  rec = vc.addSession(rec, fixtures.female[1], call(), NOW + 60000).rec;
  const est = vc.estimate(rec, NOW + 60000);
  assert.strictEqual(vc.status(rec, 'male', true, NOW + 60000), 'mismatch', `female confidence ${est.confidence.toFixed(4)} vs mismatch threshold ${T.mismatch}`);
});

check('[model] voices the model cannot call are never confirmed and never a mismatch', () => {
  let rec = { on: true };
  for (let i = 0; i < fixtures.unclear.length; i++) rec = vc.addSession(rec, fixtures.unclear[i], call(), NOW + i * 1000).rec;
  for (const g of ['male', 'female']) assert.strictEqual(vc.status(rec, g, true, NOW + 5000), 'unclear');
});

check('eligible: only people who chose that gender', () => {
  const rec = recWith([STRONG_F]);
  assert.strictEqual(vc.eligible(rec, 'female', true, 'female', false, NOW), true);
  assert.strictEqual(vc.eligible(rec, 'female', true, 'male', false, NOW), false);
  assert.strictEqual(vc.eligible(null, 'unspecified', true, 'female', false, NOW), false);
});

check('eligible: unchecked people pass a normal filter, not a strict one', () => {
  for (const rec of [null, { on: false }, { on: true, s: [] }, recWith([0.2])]) {
    assert.strictEqual(vc.eligible(rec, 'female', !!(rec && rec.on), 'female', false, NOW), true);
    assert.strictEqual(vc.eligible(rec, 'female', !!(rec && rec.on), 'female', true, NOW), false);
  }
});

check('eligible: a mismatch is never matched, strict or not', () => {
  const rec = recWith([STRONG_M, STRONG_M]);
  assert.strictEqual(vc.eligible(rec, 'female', true, 'female', false, NOW), false);
  assert.strictEqual(vc.eligible(rec, 'female', true, 'female', true, NOW), false);
});

check('eligible: confirmed and reviewed pass a strict filter', () => {
  assert.strictEqual(vc.eligible(recWith([STRONG_F]), 'female', true, 'female', true, NOW), true);
  assert.strictEqual(vc.eligible({ on: true, s: [], manual: 'female' }, 'female', true, 'female', true, NOW), true);
});

check('rankBonus: confirmed and reviewed go first, nobody else gets a bonus', () => {
  assert.ok(vc.rankBonus(recWith([STRONG_F]), 'female', true, NOW) > 0);
  assert.ok(vc.rankBonus({ on: true, s: [], manual: 'male' }, 'male', true, NOW) > 0);
  assert.strictEqual(vc.rankBonus(null, 'female', false, NOW), 0);
  assert.strictEqual(vc.rankBonus({ on: true, s: [] }, 'female', true, NOW), 0);
  assert.strictEqual(vc.rankBonus(recWith([0.3]), 'female', true, NOW), 0);
  assert.strictEqual(vc.rankBonus(recWith([STRONG_M, STRONG_M]), 'female', true, NOW), 0);
});

check('retry clears the estimates and allows three a day', () => {
  let rec = recWith([STRONG_F]);
  for (let i = 0; i < vc.RETRIES_PER_DAY; i++) {
    assert.strictEqual(vc.retriesLeft(rec, NOW + i), vc.RETRIES_PER_DAY - i);
    const out = vc.retry(rec, NOW + i);
    assert.ok(out.ok);
    assert.deepStrictEqual(out.rec.s, []);
    rec = out.rec;
  }
  const blocked = vc.retry(rec, NOW + 10);
  assert.strictEqual(blocked.ok, false);
  assert.strictEqual(blocked.reason, 'limit');
  assert.strictEqual(blocked.retryAt, NOW + DAY, 'free again 24 h after the oldest retry');
  assert.strictEqual(vc.retriesLeft(rec, NOW + 10), 0);
  assert.ok(vc.retry(rec, NOW + DAY + 5).ok);
});

check('a retry does not reset the daily call limit', () => {
  let rec = { on: true };
  for (let i = 0; i < 8; i++) rec = vc.addSession(rec, fix('female'), call(), NOW + i * 1000).rec;
  rec = vc.retry(rec, NOW + 9000).rec;
  assert.strictEqual(vc.addSession(rec, fix('female'), call(), NOW + 10000).reason, 'limit');
});

check('disputes: the same reporter counts once', () => {
  let rec = null;
  for (let i = 0; i < 5; i++) rec = vc.addDispute(rec, 'client-A', NOW + i);
  assert.strictEqual(rec.d.length, 1);
  assert.strictEqual(vc.disputed(rec, 'female', true, NOW + 10), false);
  assert.ok(!JSON.stringify(rec).includes('client-A'), 'reporters are stored hashed');
});

check('disputes: three different reporters make the profile disputed and clear its estimates', () => {
  let rec = recWith([logit(0.9)]);
  rec = vc.addDispute(rec, 'A', NOW);
  rec = vc.addDispute(rec, 'B', NOW + 1);
  assert.strictEqual(vc.disputed(rec, 'female', true, NOW + 2), false);
  assert.strictEqual(rec.s.length, 1, 'two complaints are not enough to forget the estimates');
  rec = vc.addDispute(rec, 'C', NOW + 2);
  assert.strictEqual(vc.disputed(rec, 'female', true, NOW + 3), true);
  assert.deepStrictEqual(rec.s, []);
  assert.strictEqual(vc.eligible(rec, 'female', true, 'female', false, NOW + 3), false);
  assert.strictEqual(vc.view(rec, 'female', true, NOW + 3).disputed, true);
});

check('disputes age out after 30 days', () => {
  let rec = null;
  for (const who of ['A', 'B', 'C']) rec = vc.addDispute(rec, who, NOW);
  assert.strictEqual(vc.disputed(rec, 'female', true, NOW + 29 * DAY), true);
  assert.strictEqual(vc.disputed(rec, 'female', true, NOW + 31 * DAY), false);
});

check('[model] a later confirming call clears a disputed profile', () => {
  let rec = { on: true };
  for (const who of ['A', 'B', 'C']) rec = vc.addDispute(rec, who, NOW);
  assert.strictEqual(vc.disputed(rec, 'female', true, NOW), true);
  rec = vc.addSession(rec, fixtures.female[0], call(), NOW + 1000).rec;
  assert.strictEqual(vc.status(rec, 'female', true, NOW + 1000), 'confirmed');
  assert.strictEqual(vc.disputed(rec, 'female', true, NOW + 1000), false);
  assert.strictEqual(vc.eligible(rec, 'female', true, 'female', false, NOW + 1000), true);
});

check('a review also clears a dispute, and a call that does not confirm does not', () => {
  let rec = { on: true };
  for (const who of ['A', 'B', 'C']) rec = vc.addDispute(rec, who, NOW);
  rec = vc.addSession(rec, fixtures.unclear[0], call(), NOW + 1000).rec;
  assert.strictEqual(vc.disputed(rec, 'female', true, NOW + 1000), true);
  rec = vc.openAppeal(rec, 'female', '', NOW + 2000).rec;
  rec = vc.decideAppeal(rec, true, NOW + 3000);
  assert.strictEqual(vc.disputed(rec, 'female', true, NOW + 3000), false);
  assert.strictEqual(vc.eligible(rec, 'female', true, 'female', true, NOW + 3000), true);
});

check('appeals: need a chosen gender, one open at a time, note is trimmed to 500 characters', () => {
  assert.strictEqual(vc.openAppeal(null, 'unspecified', '', NOW).reason, 'no-gender');
  const a = vc.openAppeal(null, 'female', 'x'.repeat(900), NOW);
  assert.ok(a.ok);
  assert.strictEqual(a.rec.appeal.state, 'open');
  assert.strictEqual(a.rec.appeal.gender, 'female');
  assert.strictEqual(a.rec.appeal.note.length, 500);
  assert.strictEqual(vc.openAppeal(a.rec, 'female', '', NOW + 1).reason, 'open');
  assert.strictEqual(vc.view(a.rec, 'female', true, NOW).appeal, 'open');
});

check('appeals: granting confirms the gender chosen when the appeal was opened', () => {
  const opened = vc.openAppeal(recWith([STRONG_M, STRONG_M]), 'female', '', NOW).rec;
  const granted = vc.decideAppeal(opened, true, NOW + 1000);
  assert.strictEqual(granted.manual, 'female');
  assert.strictEqual(granted.appeal.state, 'granted');
  assert.strictEqual(vc.status(granted, 'female', true, NOW + 1000), 'reviewed');
  assert.strictEqual(vc.view(granted, 'female', true, NOW + 1000).state, 'reviewed');
  assert.notStrictEqual(vc.status(granted, 'male', true, NOW + 1000), 'reviewed');
  assert.strictEqual(vc.decideAppeal(granted, true, NOW + 2000), null, 'nothing left to decide');
  assert.strictEqual(vc.decideAppeal(null, true, NOW), null);
});

check('appeals: a declined one may be repeated after 7 days, not before', () => {
  const opened = vc.openAppeal({ on: true }, 'male', '', NOW).rec;
  const denied = vc.decideAppeal(opened, false, NOW + 1000);
  assert.strictEqual(denied.appeal.state, 'denied');
  assert.ok(!denied.manual);
  const early = vc.openAppeal(denied, 'male', '', NOW + 6 * DAY);
  assert.strictEqual(early.ok, false);
  assert.strictEqual(early.reason, 'recent');
  assert.strictEqual(early.retryAt, NOW + 1000 + 7 * DAY);
  assert.ok(vc.openAppeal(denied, 'male', '', NOW + 1000 + 7 * DAY + 1).ok);
});

check('declare: the first choice is taken, and two changes a day are allowed', () => {
  let d = vc.declare(null, 'male', NOW);
  assert.deepStrictEqual([d.gender, d.held], ['male', false]);
  d = vc.declare(d.entry, 'female', NOW + 1000);
  assert.deepStrictEqual([d.gender, d.held], ['female', false]);
  d = vc.declare(d.entry, 'male', NOW + 2000);
  assert.deepStrictEqual([d.gender, d.held], ['male', false]);
});

check('declare: a third change within 24 h keeps the earlier choice', () => {
  let d = vc.declare(null, 'male', NOW);
  d = vc.declare(d.entry, 'female', NOW + 1000);
  d = vc.declare(d.entry, 'male', NOW + 2000);
  d = vc.declare(d.entry, 'female', NOW + 3000);
  assert.deepStrictEqual([d.gender, d.held], ['male', true]);
  d = vc.declare(d.entry, 'female', NOW + 4000);
  assert.deepStrictEqual([d.gender, d.held], ['male', true], 'still held on retry');
  d = vc.declare(d.entry, 'male', NOW + 5000);
  assert.deepStrictEqual([d.gender, d.held], ['male', false], 'asking for the held choice is fine');
});

check('declare: changes older than 24 h no longer count', () => {
  let d = vc.declare(null, 'male', NOW);
  d = vc.declare(d.entry, 'female', NOW + 1000);
  d = vc.declare(d.entry, 'male', NOW + 2000);
  d = vc.declare(d.entry, 'female', NOW + DAY + 3000);
  assert.deepStrictEqual([d.gender, d.held], ['female', false]);
});

check('declare: registering again with the same gender is never a change', () => {
  let d = vc.declare(null, 'female', NOW);
  for (let i = 1; i < 10; i++) d = vc.declare(d.entry, 'female', NOW + i);
  assert.deepStrictEqual([d.gender, d.held], ['female', false]);
  d = vc.declare(d.entry, 'male', NOW + 100);
  assert.deepStrictEqual([d.gender, d.held], ['male', false]);
});

check('declare: first registration without a gender does not lock anything in', () => {
  let d = vc.declare(null, 'unspecified', NOW);
  assert.strictEqual(d.gender, 'unspecified');
  d = vc.declare(d.entry, 'female', NOW + 1);
  assert.deepStrictEqual([d.gender, d.held], ['female', false]);
});

check('view: what the person\'s own device is told', () => {
  const v = vc.view(recWith([STRONG_F, STRONG_F]), 'female', true, NOW);
  assert.deepStrictEqual(Object.keys(v).sort(), ['appeal', 'calls', 'disputed', 'featureVersion', 'minFrames', 'on', 'retriesLeft', 'state'].sort());
  assert.strictEqual(v.on, true);
  assert.strictEqual(v.state, 'confirmed');
  assert.strictEqual(v.calls, 2);
  assert.strictEqual(v.retriesLeft, vc.RETRIES_PER_DAY);
  assert.strictEqual(v.appeal, 'none');
  assert.strictEqual(v.minFrames, vc.MIN_FRAMES);
  assert.strictEqual(vc.view(null, 'female', false, NOW).state, 'off');
  assert.strictEqual(vc.view(null, 'female', false, NOW).on, false);
  assert.strictEqual(vc.view({ on: true }, 'unspecified', true, NOW).state, 'none');
  assert.ok(!('p' in v) && !('confidence' in v) && !('label' in v), 'the estimate itself is never sent');
});

check('empty: a record is kept only while it still says something', () => {
  assert.strictEqual(vc.empty(null, NOW), true);
  // On is the default, so a bare "on" says nothing and a bare "off" does.
  assert.strictEqual(vc.empty({ on: true, s: [], r: [], d: [] }, NOW), true);
  assert.strictEqual(vc.empty({ on: false, s: [], r: [], d: [] }, NOW), false);
  assert.strictEqual(vc.empty({ on: true, s: [[1, NOW]], r: [], d: [] }, NOW), false);
  assert.strictEqual(vc.empty({ on: true, s: [[1, NOW - 200 * DAY]], r: [], d: [] }, NOW), true);
  assert.strictEqual(vc.empty({ on: true, s: [], r: [NOW - 1000], d: [] }, NOW), false);
  assert.strictEqual(vc.empty({ on: true, s: [], r: [], d: [], manual: 'male' }, NOW), false);
  assert.strictEqual(vc.empty({ on: true, s: [], r: [], d: [], appeal: { state: 'open' } }, NOW), false);
  assert.strictEqual(vc.empty(vc.addDispute(null, 'A', NOW), NOW), false);
  assert.strictEqual(vc.empty(vc.addDispute(null, 'A', NOW - 31 * DAY), NOW), true);
});

console.log(failed ? `\n${failed} of ${count} checks failed` : `\nAll ${count} checks passed`);
process.exit(failed ? 1 : 0);
