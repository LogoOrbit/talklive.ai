// Trust score: prior, decay, evidence weights, per-pair cap, tiers, prune, persistence.
//
//   node scripts/test-reputation.js
const rep = require('../server/reputation');

let failed = 0;
const ok = (name, cond, extra) => { if (!cond) failed++; console.log(cond ? 'PASS' : 'FAIL', name, cond ? '' : JSON.stringify(extra)); };
const near = (a, b, e = 1e-3) => Math.abs(a - b) < e;
const DAY = 86400000;
const t0 = 1_700_000_000_000;

rep.reset();
ok('new user scores the prior (0.8)', near(rep.score('c_new', t0), 0.8), rep.score('c_new', t0));
ok('new user is high tier', rep.tier('c_new', t0) === 'high');

// Pure apply: conversation credit
let s = rep.apply(undefined, { type: 'end', ms: 61000 }, t0);
ok('60s conversation +1', near(s[0], 1), s);
s = rep.apply(undefined, { type: 'end', ms: 5 * 60000 }, t0);
ok('5 min conversation +2', near(s[0], 2), s);
s = rep.apply(undefined, { type: 'end', ms: 30000 }, t0);
ok('short non-quick end earns nothing', s[0] === 0 && s[1] === 0, s);
s = rep.apply(undefined, { type: 'end', ms: 3000, self: true }, t0);
ok('self-ending under 6.5s -0.15 and raises quick rate', near(s[1], 0.15) && s[3] > 0, s);
s = rep.apply(undefined, { type: 'end', ms: 3000, self: false }, t0);
ok('being left under 6.5s costs nothing', s[1] === 0, s);
ok('heart +1.5', near(rep.apply(undefined, { type: 'heart' }, t0)[0], 1.5));
ok('friend +2', near(rep.apply(undefined, { type: 'friend' }, t0)[0], 2));
ok('blocked -1', near(rep.apply(undefined, { type: 'blocked' }, t0)[1], 1));
ok('ban -6', near(rep.apply(undefined, { type: 'ban' }, t0)[1], 6));

// Decay: half-life 14 days
s = rep.apply(undefined, { type: 'ban' }, t0);
const later = rep.apply(s, { type: 'heart' }, t0 + 14 * DAY);
ok('evidence halves after 14 days', near(later[1], 3, 0.01) && near(later[0], 1.5, 0.01), later);
rep.reset();
rep.note('c_banned', 'ban', { now: t0 });
const sc0 = rep.score('c_banned', t0), sc14 = rep.score('c_banned', t0 + 14 * DAY), sc60 = rep.score('c_banned', t0 + 60 * DAY);
ok('ban drops to low tier', rep.tier('c_banned', t0) === 'low', sc0);
ok('score recovers with time', sc14 > sc0 && sc60 > sc14 && sc60 > 0.7, [sc0, sc14, sc60]);

// Report weighting by reporter trust
rep.reset();
rep.note('c_trusted', 'heart', { now: t0 });
for (let i = 0; i < 6; i++) rep.note('c_trusted', 'friend', { now: t0 });
rep.note('c_bad', 'ban', { now: t0 });
rep.note('c_t1', 'reported', { reporter: 'c_trusted', now: t0 });
rep.note('c_t2', 'reported', { reporter: 'c_bad', now: t0 });
const pen1 = 0.8 - rep.score('c_t1', t0), pen2 = 0.8 - rep.score('c_t2', t0);
ok('report by trusted reporter hurts more than by low-trust one', pen1 > pen2 * 2, [pen1, pen2]);
rep.note('c_t3', 'reported', { reporter: 'c_t3', now: t0 });
ok('self-report ignored', near(rep.score('c_t3', t0), 0.8));

// Per-pair 24h cap and report-bombing
rep.reset();
let accepted = 0;
for (let i = 0; i < 20; i++) if (rep.note('c_victim', 'reported', { reporter: 'c_bomber', now: t0 + i * 1000 })) accepted++;
ok('one report per reporter-target pair per 24h', accepted === 1, accepted);
ok('the same reporter counts again after 24h', rep.note('c_victim', 'reported', { reporter: 'c_bomber', now: t0 + DAY + 5000 }));
rep.reset();
for (let i = 0; i < 20; i++) rep.note('c_victim', 'reported', { reporter: 'c_r' + i, now: t0 });
ok('many distinct reporters push to low tier', rep.tier('c_victim', t0) === 'low', rep.score('c_victim', t0));

// Tiers
rep.reset();
ok('tier thresholds', rep.tier('c_x') === 'high');
for (let i = 0; i < 8; i++) rep.note('c_mid', 'blocked', { now: t0 });
ok('0.4 <= score < 0.75 is normal or low as computed', ['normal', 'low'].includes(rep.tier('c_mid', t0)));
rep.reset();
rep.note('c_n', 'blocked', { now: t0 }); rep.note('c_n', 'blocked', { now: t0 });
ok('normal tier', rep.tier('c_n', t0) === 'normal', rep.score('c_n', t0));
ok('quick-skip rate rises with repeated quick self-ends', (() => {
  for (let i = 0; i < 10; i++) rep.note('c_q', 'end', { ms: 2000, self: true, now: t0 });
  return rep.quickRate('c_q', t0) > 0.8;
})());

// Summary
const sum = rep.summary(t0);
ok('summary shape', sum.users >= 1 && sum.histogram.length === 10 && Array.isArray(sum.negative), sum);
ok('summary counts negative events', sum.negative.some((e) => e.event === 'blocked'), sum.negative);

// Prune: stale and indistinguishable-from-prior entries
rep.reset();
rep.note('c_old', 'ban', { now: t0 });
rep.note('c_fresh', 'ban', { now: t0 + 60 * DAY });
rep.note('c_zero', 'end', { ms: 30000, now: t0 + 60 * DAY });
const removed = rep.prune(t0 + 61 * DAY);
ok('prune drops stale and prior-equivalent entries', removed === 2 && rep.dump().c_fresh && !rep.dump().c_old && !rep.dump().c_zero, [removed, Object.keys(rep.dump())]);

// Cap
rep.reset();
const big = {};
for (let i = 0; i < rep.MAX_ENTRIES; i++) big['c' + i] = [1, 0, t0 + i, 0];
rep.load(big);
rep.note('c_extra', 'heart', { now: t0 + rep.MAX_ENTRIES + 10 });
const n = Object.keys(rep.dump()).length;
ok('hard cap evicts oldest', n <= rep.MAX_ENTRIES && rep.dump().c_extra && !rep.dump().c0, n);

// Dump / load round trip (JSON)
rep.reset();
rep.note('c_a', 'friend', { now: t0 });
rep.note('c_b', 'ban', { now: t0 });
const before = [rep.score('c_a', t0), rep.score('c_b', t0)];
const json = JSON.parse(JSON.stringify(rep.dump()));
rep.reset();
rep.load(json);
ok('dump/load round trip', near(rep.score('c_a', t0), before[0]) && near(rep.score('c_b', t0), before[1]));
rep.load({ c_bad: 'junk', c_ok: [1, 0, t0, 0] });
ok('load drops malformed entries', !rep.dump().c_bad && rep.dump().c_ok);
ok('prototype keys ignored', rep.note('__proto__', 'ban') === false);

process.exit(failed ? 1 : 0);
