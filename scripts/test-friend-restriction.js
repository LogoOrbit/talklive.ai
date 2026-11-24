#!/usr/bin/env node
'use strict';
// Friend restrictions: timed, per person, lifted by the owner, never a ban.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-frrestrict-'));
delete process.env.DATABASE_URL;
const store = require('../server/store');

let failed = 0;
function test(name, fn) {
  try { fn(); console.log('PASS', name); } catch (e) { failed++; console.log('FAIL', name, e.message); }
}

test('a restriction applies to that person only, for the chosen days', () => {
  const r = store.addFriendRestriction({ clientId: 'c1', username: 'Sam', reason: 'spam requests', days: 7 });
  assert.ok(Math.abs(r.expiresAt - r.createdAt - 7 * 86400000) < 1000);
  assert.equal(store.activeFriendRestriction('c1', null).id, r.id);
  assert.equal(store.activeFriendRestriction('c2', null), null);
});

test('days are clamped to 1..365', () => {
  assert.equal(Math.round((store.addFriendRestriction({ clientId: 'c3', days: 0 }).expiresAt - Date.now()) / 86400000), 1);
  assert.equal(Math.round((store.addFriendRestriction({ clientId: 'c4', days: 9999 }).expiresAt - Date.now()) / 86400000), 365);
});

test('lifting ends it, and an expired one is not active', () => {
  const r = store.addFriendRestriction({ clientId: 'c5', days: 3 });
  assert.ok(store.liftFriendRestriction(r.id));
  assert.equal(store.activeFriendRestriction('c5', null), null);
  assert.equal(store.liftFriendRestriction(r.id), null, 'cannot lift twice');
  const old = store.addFriendRestriction({ clientId: 'c6', days: 1 });
  old.expiresAt = Date.now() - 1;
  assert.equal(store.activeFriendRestriction('c6', null), null);
});

test('it is not a ban', () => {
  store.addFriendRestriction({ clientId: 'c7', days: 5 });
  assert.equal(store.activeBans().some((b) => b.clientId === 'c7'), false);
});

test('it matches by account too', () => {
  store.addFriendRestriction({ account: 'Alex', days: 2 });
  assert.ok(store.activeFriendRestriction('anything', 'alex'));
});

fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true });
if (failed) { console.log(failed + ' failed'); process.exit(1); }
console.log('all passed'); process.exit(0);
