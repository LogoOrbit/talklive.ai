// Match-quality model: learns, stays bounded, round-trips.
//
//   node scripts/test-match-model.js
const m = require('../server/match-model');

let failed = 0;
const ok = (name, cond, extra) => { if (!cond) failed++; console.log(cond ? 'PASS' : 'FAIL', name, cond ? '' : JSON.stringify(extra)); };

// Deterministic PRNG
let seed = 12345;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

const mk = (over = {}) => ({ lang: 'en', country: 'US', timezone: 'America/New_York', interests: [], premium: false, device: 'mobile', ...over });
const ctx = (over = {}) => ({ trustA: 0.8, trustB: 0.8, quickA: 0, quickB: 0, hour: 12, mode: 'talk', ...over });

m.reset();
const a = mk(), b = mk({ lang: 'fr', country: 'FR', timezone: 'Europe/Paris' });
const f = m.features(a, mk(), ctx());
ok('feature vector size and bounds', f.length === m.N && f.every((v) => Number.isFinite(v) && v >= -1 && v <= 1), f);
const fab = m.features(a, b, ctx({ trustA: 0.9, trustB: 0.3, quickA: 0.1, quickB: 0.6 }));
const fba = m.features(b, a, ctx({ trustA: 0.3, trustB: 0.9, quickA: 0.6, quickB: 0.1 }));
ok('features symmetric in the pair', JSON.stringify(fab) === JSON.stringify(fba), [fab, fba]);

// Cold start: neutral, no score shift
ok('cold start predict is neutral (baseline)', m.predict(a, b, ctx()) === 0.5);
ok('cold start adjust is zero', m.adjust(a, b, ctx(), new Array(m.N)) === 0);

// Synthetic separable signal: shared language + country and high trust => good.
function sample() {
  const same = rnd() < 0.5;
  const x = mk({ lang: same ? 'en' : 'de', country: same ? 'US' : 'DE' });
  const c = ctx({ trustA: 0.4 + rnd() * 0.6, trustB: 0.4 + rnd() * 0.6, quickA: rnd() * 0.5, quickB: rnd() * 0.5, hour: Math.floor(rnd() * 24) });
  const good = same && Math.min(c.trustA, c.trustB) > 0.55;
  const y = rnd() < (good ? 0.9 : 0.1) ? 1 : 0;
  return { f: m.features(x, mk(), c), y, same, c, x };
}
const first = []; const last = [];
for (let i = 0; i < 6000; i++) {
  const s = sample();
  const p0 = m.summary().logLossEma;
  m.learn(s.f, s.y);
  if (i === 40) first.push(p0);
}
const sum = m.summary();
ok('samples counted', sum.samples === 6000, sum.samples);
ok('log-loss drops below the 0.693 chance level', sum.logLossEma < 0.58, sum.logLossEma);
ok('baseline is the observed positive rate', sum.baseline > 0.2 && sum.baseline < 0.6, sum.baseline);
ok('weights clipped to [-4, 4]', Object.values(sum.weights).every((v) => Math.abs(v) <= 4), sum.weights);
ok('calibration has 10 buckets', sum.calibration.length === 10 && sum.calibration.reduce((n, c) => n + c.n, 0) === 6000);

// Ordering: a pair that shares language/country with trusted users outranks one that does not
const goodC = ctx({ trustA: 0.9, trustB: 0.9 }), badC = ctx({ trustA: 0.9, trustB: 0.9 });
const pGood = m.predict(mk(), mk(), goodC);
const pBad = m.predict(mk(), mk({ lang: 'de', country: 'DE', timezone: 'Europe/Berlin' }), badC);
ok('predict ordering follows the signal', pGood > pBad + 0.3, [pGood, pBad]);

// Bounded influence
const buf = new Array(m.N);
let maxShift = 0;
for (let i = 0; i < 500; i++) {
  const s = sample();
  maxShift = Math.max(maxShift, Math.abs(m.adjust(s.x, mk(), s.c, buf)));
}
ok('score shift never exceeds MAX_SHIFT', maxShift <= m.MAX_SHIFT + 1e-9 && maxShift > 0, maxShift);
ok('shift favours the better pair', m.adjust(mk(), mk(), goodC, buf) > m.adjust(mk(), mk({ lang: 'de', country: 'DE', timezone: 'Europe/Berlin' }), badC, buf));

// Hostile extremes keep weights clipped
for (let i = 0; i < 3000; i++) m.learn(new Array(m.N).fill(1), 1);
ok('weights stay clipped under extreme updates', Object.values(m.summary().weights).every((v) => Math.abs(v) <= 4));

// Labels
ok('label: >=60s good', m.label(61000, false) === 1);
ok('label: heart/friend good', m.label(10000, true) === 1);
ok('label: <15s bad', m.label(14000, false) === 0);
ok('label: in between ignored', m.label(30000, false) === null);

// Dump / load round trip
const j = JSON.parse(JSON.stringify(m.dump()));
const pBefore = m.predict(mk(), mk(), goodC), nBefore = m.summary().samples;
m.reset();
ok('reset returns to cold', m.summary().samples === 0 && m.predict(mk(), mk(), goodC) === 0.5);
m.load(j);
ok('dump/load round trip', m.summary().samples === nBefore && Math.abs(m.predict(mk(), mk(), goodC) - pBefore) < 1e-9);
ok('load rejects garbage', m.load({ v: 1, w: [1, 2] }) === false && m.summary().samples === 0);

// Ranking is a preference only: same selection loop as findBestMatch.
// cands: [{tier, base, delta}]; returns chosen index, -1 only if there are none.
function pick(seekerTier, cands, pool, enabled) {
  let best = -1, bs = -Infinity;
  const ranked = enabled && pool >= m.MIN_POOL_FOR_RANKING;
  cands.forEach((c, i) => {
    const sc = c.base + (ranked ? m.rankAdjust(seekerTier, c.tier, c.delta) : 0);
    if (sc > bs) { bs = sc; best = i; }
  });
  return best;
}
const hi = { tier: 'high', base: 0, delta: 0.9 }, lo = { tier: 'low', base: 0, delta: -0.9 };
ok('(a) two waiting users, high vs low, match at once', pick('high', [lo], 2, true) === 0 && pick('low', [hi], 2, true) === 0);
const small = [{ tier: 'low', base: 0, delta: -0.5 }, { tier: 'high', base: 0, delta: 0.8 }];
ok('(b) small pool picks exactly what the old code picks', pick('high', small, 5, true) === pick('high', small, 5, false));
const big = [{ tier: 'high', base: 0, delta: -0.4 }, { tier: 'low', base: 0, delta: 0.1 }, { tier: 'low', base: 0, delta: 0.6 }];
ok('(c) large pool prefers same-tier and higher-predicted', pick('low', big, 8, true) === 2 && pick('low', big, 8, false) === 0);
let never = true;
for (let n = 1; n < 12; n++) for (const t of ['low', 'normal', 'high']) {
  const cs = Array.from({ length: n }, (_, i) => ({ tier: ['low', 'normal', 'high'][i % 3], base: i % 2, delta: (i % 5) / 5 - 0.4 }));
  if ((pick(t, cs, n, false) === -1) !== (pick(t, cs, n, true) === -1)) never = false;
}
ok('(d) ranking never defers or removes a match that exists without it', never);

process.exit(failed ? 1 : 0);
