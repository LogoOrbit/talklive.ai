#!/usr/bin/env node
'use strict';
// Ban appeal decisions: reply, lift, change length, plus the extras
// (friend restriction, age review), all from one call.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-appealdec-'));
delete process.env.DATABASE_URL;
const store = require('../server/store');
const { createAdmin } = require('../server/admin');

const pushed = [];
const admin = createAdmin({ io: null, getRuntime: () => ({}), getLiveCounts: () => ({}), kickBanned() {}, deliverWarning() {}, pushBanUpdate: (b) => pushed.push(b.id), onAgeDecision() {}, onFriendRestriction() {} });
const layer = admin.router.stack.find((l) => l.route && l.route.path === '/api/bans/:id/appeals/:aid/reply');
function call(banId, aid, body) {
  let status = 200, out;
  const res = { status(n) { status = n; return res; }, json(x) { out = x; return res; } };
  layer.route.stack[0].handle({ params: { id: banId, aid }, body, headers: {}, ip: '1.1.1.1', socket: {} }, res);
  return { status, out };
}
function mk(clientId) {
  const ban = store.addBan({ clientId, username: 'Kash', reason: 'Possible minor', minutes: 7 * 1440 });
  const a = store.addBanAppeal(ban.id, 'I am over 18 honestly');
  return { ban, aid: (a && a.id) || ban.appeals[ban.appeals.length - 1].id };
}
let failed = 0;
function test(name, fn) { try { fn(); console.log('PASS', name); } catch (e) { failed++; console.log('FAIL', name, e.message); } }

test('reply only leaves the ban alone', () => {
  const { ban, aid } = mk('k1');
  assert.equal(call(ban.id, aid, { message: 'We are checking', action: 'reply' }).status, 200);
  assert.equal(ban.liftedAt, null);
});
test('lift lifts it', () => {
  const { ban, aid } = mk('k2');
  call(ban.id, aid, { message: 'Welcome back', action: 'lift' });
  assert.ok(ban.liftedAt);
});
test('change sets a new length from now', () => {
  const { ban, aid } = mk('k3');
  call(ban.id, aid, { message: 'Shortened', action: 'change', minutes: 1440 });
  assert.ok(Math.abs(ban.expiresAt - Date.now() - 86400000) < 5000);
  assert.equal(call(ban.id, aid, { message: 'x1', action: 'change', minutes: 5 }).status, 400);
});
test('lift + friend restriction + age review in one go', () => {
  const { ban, aid } = mk('k4');
  const r = call(ban.id, aid, { message: 'Back, with limits', action: 'lift', restrictDays: 14, ageReview: true });
  assert.equal(r.status, 200);
  assert.ok(ban.liftedAt);
  assert.ok(store.activeFriendRestriction('k4', null));
  assert.equal(store.ageCaseGet('k4').state, 'open');
});
test('bad input changes nothing', () => {
  const { ban, aid } = mk('k5');
  assert.equal(call(ban.id, aid, { message: 'x', action: 'lift' }).status, 400);
  assert.equal(call(ban.id, aid, { message: 'long enough', action: 'lift', restrictDays: 999 }).status, 400);
  assert.equal(ban.liftedAt, null);
  assert.equal(store.activeFriendRestriction('k5', null), null);
});

fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true });
if (failed) { console.log(failed + ' failed'); process.exit(1); }
console.log('all passed'); process.exit(0);
