#!/usr/bin/env node
'use strict';
/*
 * Tests for mini-game analytics: the relay watcher (server/game-tracker.js),
 * what it writes to the store, and the owner report built from it.
 *
 * Run: node scripts/test-games-stats.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-games-'));
delete process.env.DATABASE_URL;

const store = require('../server/store');
const { createGameTracker, isFreshBoard } = require('../server/game-tracker');
const { createAdmin } = require('../server/admin');

let passed = 0;
let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}\n      ${err.stack}`);
  }
}

const profiles = new Map([
  ['sA', { clientId: 'cA', username: 'alice', countryName: 'Pakistan', mode: 'talk' }],
  ['sB', { clientId: 'cB', username: 'bob', countryName: 'India', mode: 'talk' }],
  ['sC', { clientId: 'cC', username: 'carol', countryName: 'Brazil', mode: 'chat' }],
  ['sD', { clientId: 'cD', username: 'dave', countryName: 'Spain', mode: 'chat' }],
]);
const tracker = createGameTracker({ store, profileOf: (sid) => profiles.get(sid) });

const fresh = () => ({ board: Array(9).fill(null), turn: 0, phase: 'move', winner: null, line: null });
const mid = () => ({ board: [0, null, null, null, null, null, null, null, null], turn: 1, phase: 'move', winner: null });
const over = (winner) => ({ board: [0, 0, 0, 1, 1, null, null, null, null], turn: 0, phase: 'over', winner });

function report(range) {
  const admin = createAdmin({ io: null, getRuntime: () => ({}), getLiveCounts: () => ({}), kickBanned() {}, deliverWarning() {}, getLiveGames: () => tracker.live() });
  const layer = admin.router.stack.find((l) => l.route && l.route.path === '/api/games');
  let out = null;
  layer.route.stack[0].handle({ query: { range } }, { json: (x) => { out = x; } });
  return out;
}

(async () => {
  await store.ready;
  console.log('Mini-game stats');

  await test('fresh boards are recognised for both games', () => {
    assert.ok(isFreshBoard(fresh()));
    assert.ok(!isFreshBoard(mid()));
    assert.ok(isFreshBoard({ g: 'dab', h: [null, null], v: [null], boxes: [null], phase: 'move' }));
    assert.ok(!isFreshBoard({ g: 'dab', h: [0, null], v: [null], phase: 'move' }));
  });

  await test('accepted invite, two rounds, then leave', () => {
    tracker.onEvent('sA', 'sB', { type: 'invite', game: 'ttt' });
    assert.strictEqual(tracker.live().pendingInvites, 1);
    tracker.onEvent('sB', 'sA', { type: 'accept', game: 'ttt' });
    tracker.onEvent('sA', 'sB', { type: 'state', state: fresh() }); // A hosts
    tracker.onEvent('sB', 'sA', { type: 'state', state: mid() });
    tracker.onEvent('sA', 'sB', { type: 'state', state: over(0) }); // A wins
    assert.strictEqual(tracker.live().sessions.length, 1);
    tracker.onEvent('sB', 'sA', { type: 'rematch' });
    tracker.onEvent('sA', 'sB', { type: 'state', state: fresh() });
    tracker.onEvent('sB', 'sA', { type: 'state', state: over('draw') });
    tracker.onEvent('sB', 'sA', { type: 'state', state: over('draw') }); // a repeat is not a new result
    tracker.onEvent('sA', 'sB', { type: 'left' });
    assert.strictEqual(tracker.live().sessions.length, 0);
    const a = store.data.games.players.cA.t;
    const b = store.data.games.players.cB.t;
    assert.deepStrictEqual([a.r, a.n, a.w, a.l, a.d, a.sent, a.sAcc], [2, 1, 1, 0, 1, 1, 1]);
    assert.deepStrictEqual([b.r, b.n, b.w, b.l, b.d, b.recv, b.acc], [2, 1, 0, 1, 1, 1, 1]);
    assert.strictEqual(store.data.games.log[0].rounds, 2);
    assert.deepStrictEqual(store.data.games.log[0].score, [1, 0, 1]);
  });

  await test('declined, withdrawn and unanswered invites', () => {
    tracker.onEvent('sC', 'sD', { type: 'invite', game: 'dab' });
    tracker.onEvent('sD', 'sC', { type: 'decline' }); // D says no
    tracker.onEvent('sC', 'sD', { type: 'invite', game: 'dab' });
    tracker.onEvent('sC', 'sD', { type: 'decline' }); // C withdraws
    tracker.onEvent('sC', 'sD', { type: 'invite', game: 'ttt' });
    tracker.onPairEnd('sC', 'sD'); // they part before D answers
    const d = store.data.games.players.cD.t;
    const c = store.data.games.players.cC.t;
    assert.deepStrictEqual([d.recv, d.dec, d.ign, d.acc], [2, 1, 1, 0]);
    assert.deepStrictEqual([c.sent, c.can, c.r], [3, 1, 0]);
  });

  await test('simultaneous invites start a game; pair end closes it', () => {
    tracker.onEvent('sC', 'sD', { type: 'invite', game: 'dab' });
    tracker.onEvent('sD', 'sC', { type: 'invite', game: 'ttt' });
    tracker.onEvent('sD', 'sC', { type: 'state', state: { g: 'dab', h: [null], v: [null], boxes: [null], scores: [0, 0], phase: 'move' } });
    tracker.onEvent('sC', 'sD', { type: 'state', state: { g: 'dab', h: [1], v: [0], boxes: [1], scores: [0, 1], phase: 'over', winner: 1 } });
    tracker.onPairEnd('sC', 'sD');
    const c = store.data.games.players.cC.t;
    const d = store.data.games.players.cD.t;
    assert.strictEqual(c.w, 1); // C was player 1 (D dealt the board)
    assert.strictEqual(d.l, 1);
    assert.strictEqual(store.data.games.players.cC.byGame.dab.r, 1);
  });

  await test('accepted but no board dealt is not a play session', () => {
    const before = store.data.games.log.length;
    tracker.onEvent('sA', 'sB', { type: 'invite', game: 'ttt' });
    tracker.onEvent('sB', 'sA', { type: 'accept', game: 'ttt' });
    tracker.onPairEnd('sA', 'sB');
    assert.strictEqual(store.data.games.log.length, before);
  });

  await test('owner report: players, % played, invite outcomes', () => {
    store.recordTalkTime('cA', 120, {});
    store.recordTalkTime('cB', 120, {});
    store.recordTalkTime('cC', 60, {});
    store.recordTalkTime('cD', 60, {});
    store.recordTalkTime('cE', 60, {}); // talked, never played
    const r = report('today');
    const S = r.summary;
    assert.strictEqual(S.players, 4);
    assert.strictEqual(S.talkers, 5);
    assert.strictEqual(S.playedPct, 80);
    assert.strictEqual(S.rounds, 3);
    assert.strictEqual(S.sessions, 2);
    // invites: A->B accepted x2, C->D declined, withdrawn, ignored, simultaneous accepted
    assert.strictEqual(S.invites, 6);
    assert.strictEqual(S.accepted, 3);
    assert.strictEqual(S.declined, 1);
    assert.strictEqual(S.ignored, 1);
    assert.strictEqual(S.cancelled, 1);
    assert.strictEqual(S.notAccepted, 2);
    assert.strictEqual(S.acceptRate, 60);
    assert.ok(r.rows.find((x) => x.username === 'dave').declined === 1);
    assert.strictEqual(r.daily.length, 30);
    assert.ok(r.byGame.some((g) => g.game === 'dab'));
    assert.ok(r.byMode.some((g) => g.mode === 'chat'));
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
