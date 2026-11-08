#!/usr/bin/env node
'use strict';
/*
 * Accounts that ended up sharing one profile (a signed-out device handed its
 * profile to the next account made on it) are split at load: the oldest keeps
 * it, every newer account gets its own.
 *
 * Run: node scripts/test-shared-profiles.js
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-shared-'));
delete process.env.DATABASE_URL;
fs.writeFileSync(path.join(process.env.DATA_DIR, 'owner-data.json'), JSON.stringify({
  accounts: {
    old: { clientId: 'a_shared', createdAt: 1000, email: 'old@example.com' },
    newer: { clientId: 'a_shared', createdAt: 3000, email: 'newer@example.com' },
    mid: { clientId: 'a_shared', createdAt: 2000 },
    alias: { clientId: 'a_shared', createdAt: 500, mergedInto: 'old' },
    solo: { clientId: 'a_solo', createdAt: 100 },
  },
}));

const store = require('../server/store');
try {
  assert.strictEqual(store.getAccountClientId('old'), 'a_shared', 'oldest keeps the profile');
  assert.strictEqual(store.getAccountClientId('alias'), 'a_shared', 'merged alias untouched');
  assert.strictEqual(store.getAccountClientId('solo'), 'a_solo', 'unshared untouched');
  const mid = store.getAccountClientId('mid');
  const newer = store.getAccountClientId('newer');
  assert.ok(/^a_[0-9a-f]{32}$/.test(mid) && /^a_[0-9a-f]{32}$/.test(newer), 'newer accounts get fresh ids');
  assert.notStrictEqual(mid, newer);
  assert.strictEqual(store.findUsernameByClientId('a_shared'), 'old', 'index points at the owner');
  assert.strictEqual(store.findUsernameByClientId(newer), 'newer');
  console.log('All checks passed');
  process.exit(0);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
