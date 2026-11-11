#!/usr/bin/env node
'use strict';
/*
 * Tests for server/plus-stats.js (owner Plus tab) and the payment log wrapper
 * in server/billing.js. Pure functions, no server needed.
 *
 * Run: node scripts/test-plus-stats.js
 */
const assert = require('assert');
const ps = require('../server/plus-stats');
const billing = require('../server/billing');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); } catch (err) { failed++; console.error(`  ✗ ${name}\n      ${err.message}`); }
}
const DAY = 86400000;
const NOW = Date.UTC(2026, 10, 10, 12);

console.log('plus-stats');

test('empty store gives the empty state, not zeros', () => {
  const s = ps.summarize({ premium: {}, log: [], now: NOW });
  assert.strictEqual(s.empty, true);
  assert.strictEqual(s.conversion, null);
});

test('active split by plan and source, free Plus kept apart', () => {
  const premium = {
    a: { source: 'stripe', subscriptionId: 's1', expiresAt: NOW + 20 * DAY },
    b: { source: 'stripe', subscriptionId: 's2', expiresAt: NOW + 3 * DAY },
    c: { source: 'play', expiresAt: NOW + 300 * DAY },
    d: { source: 'play-pass', expiresAt: NOW + 2 * DAY },
    e: { source: 'referral', expiresAt: NOW + 2 * DAY },
    f: { source: 'stripe', expiresAt: NOW - 2 * DAY },
    g: { source: 'stripe', revokedAt: NOW - DAY, expiresAt: NOW + DAY },
  };
  const log = [
    { t: NOW - 10 * DAY, clientId: 'a', kind: 'new', plan: 'monthly', source: 'stripe', country: 'US', usd: 10 },
    { t: NOW - 5 * DAY, clientId: 'c', kind: 'new', plan: 'yearly', source: 'play', country: 'DE', usd: 60 },
    { t: NOW - 1 * DAY, clientId: 'd', kind: 'new', plan: 'pass_7d', source: 'play', country: 'DE', usd: 3 },
  ];
  const s = ps.summarize({ premium, log, now: NOW, activeAccounts30: 100 });
  assert.strictEqual(s.active.total, 4);
  assert.strictEqual(s.active.monthly, 2); // b has no log entry: assumed monthly
  assert.strictEqual(s.active.yearly, 1);
  assert.strictEqual(s.active.passes.pass_7d, 1);
  assert.strictEqual(s.active.stripe, 2);
  assert.strictEqual(s.active.play, 2);
  assert.strictEqual(s.freePlus, 1);
  assert.strictEqual(s.expiring.in7, 2); // b and d
  assert.strictEqual(s.expiring.expired7, 1); // f
  assert.strictEqual(s.plusAll, 5);
  assert.strictEqual(s.conversion, 5);
  assert.strictEqual(s.events.d7.new, 2);
  assert.strictEqual(s.events.d30.new, 3);
  assert.strictEqual(s.revenue30Usd, 73);
  assert.deepStrictEqual(s.byCountry.map((c) => c.country), ['DE', 'US']);
  assert(s.mrrUsd >= 15 && s.mrrUsd < 40, s.mrrUsd); // 10 + 60/12 + a monthly list price
});

test('events outside the window are not counted', () => {
  const log = [{ t: NOW - 40 * DAY, clientId: 'x', kind: 'renewed', plan: 'monthly', source: 'stripe', country: 'US', usd: 10 }];
  const s = ps.summarize({ premium: {}, log, now: NOW });
  assert.strictEqual(s.events.d30.renewed || 0, 0);
  assert.strictEqual(s.revenue30Usd, 0);
  assert.strictEqual(s.empty, false);
});

test('list prices convert to USD and yearly is seven months', () => {
  const m = ps.listPrice('US', 'monthly'); const y = ps.listPrice('US', 'yearly');
  assert(m.usd > 0 && Math.abs(y.amount - m.amount * 7) < 1e-9);
  assert.strictEqual(ps.listPrice('US', 'nope'), null);
});

test('paging: 50 a page, search is server side', () => {
  const rows = Array.from({ length: 120 }, (_, i) => ({ id: i, s: i % 2 ? 'odd' : 'even' }));
  const p1 = ps.page(rows, { page: 1 }, (r) => r.s);
  assert.strictEqual(p1.rows.length, 50); assert.strictEqual(p1.pages, 3); assert.strictEqual(p1.total, 120);
  const p3 = ps.page(rows, { page: 3 }, (r) => r.s);
  assert.strictEqual(p3.rows.length, 20);
  const odd = ps.page(rows, { q: 'ODD', page: 2 }, (r) => r.s);
  assert.strictEqual(odd.total, 60); assert.strictEqual(odd.rows.length, 10);
  assert.strictEqual(ps.page(rows, { page: 99 }, (r) => r.s).page, 3);
});

test('masking hides most of an email', () => {
  assert.strictEqual(ps.mask('jane.doe@example.com'), 'j***@example.com');
});

test('payment log wrapper records renewals, passes and cancels, capped at 5000', () => {
  const store = {
    data: { premium: {}, talkTime: { u1: { country: 'Germany' } } },
    setPremium(id, info) { this.data.premium[id] = { ...this.data.premium[id], ...info, revokedAt: null }; },
    extendPremium(id, ms, info) { this.data.premium[id] = { ...info, expiresAt: Date.now() + ms }; },
    revokePremium(id) { this.data.premium[id].revokedAt = Date.now(); },
  };
  billing.installPaymentLog(store);
  store.setPremium('u1', { source: 'stripe', lastEvent: 'checkout completed', expiresAt: Date.now() + DAY });
  assert.strictEqual((store.data.paymentLog || []).length, 0);
  store.setPremium('u1', { source: 'stripe', lastEvent: 'invoice paid', expiresAt: Date.now() + 30 * DAY });
  store.setPremium('u1', { source: 'stripe', lastEvent: 'invoice paid', expiresAt: Date.now() + 30 * DAY }); // replay: same period
  assert.strictEqual(store.data.paymentLog.length, 1);
  assert.strictEqual(store.data.paymentLog[0].kind, 'new');
  assert.strictEqual(store.data.paymentLog[0].country, 'DE');
  store.setPremium('u1', { source: 'stripe', lastEvent: 'invoice paid', expiresAt: Date.now() + 61 * DAY });
  assert.strictEqual(store.data.paymentLog[1].kind, 'renewed');
  store.extendPremium('u2', 7 * DAY, { source: 'stripe', lastEvent: 'pass:pass_7d' });
  assert.strictEqual(store.data.paymentLog[2].plan, 'pass_7d');
  store.extendPremium('u3', 7 * DAY, { source: 'referral', lastEvent: 'x' });
  assert.strictEqual(store.data.paymentLog.length, 3);
  store.revokePremium('u1', {});
  assert.strictEqual(store.data.paymentLog[3].kind, 'cancelled');
  for (let i = 0; i < 5100; i++) store.extendPremium('p' + i, DAY, { source: 'stripe', lastEvent: 'pass:pass_1d' });
  assert.strictEqual(store.data.paymentLog.length, 5000);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
