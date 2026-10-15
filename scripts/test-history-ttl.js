#!/usr/bin/env node
// Recent people are kept for 24 hours; a conversation between two people who
// are not friends goes once it has left both their recent lists. Boots the
// server on a seeded store and reads back what it saved.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 5599 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-test-'));
const FILE = path.join(DATA_DIR, 'owner-data.json');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let failed = 0;
function ok(name, cond, detail) {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}`, cond ? '' : JSON.stringify(detail));
  if (!cond) failed += 1;
}

const now = Date.now();
const old = now - 25 * 60 * 60 * 1000;
const row = (clientId, ts) => ({ clientId, username: clientId, countryCode: 'IN', mode: 'chat', ts });
fs.writeFileSync(FILE, JSON.stringify({
  accounts: {},
  social: {
    friends: { c_ann: { c_bob: { username: 'Bob' } }, c_bob: { c_ann: { username: 'Ann' } } },
    friendChats: {
      'c_ann|c_bob': [{ from: 'c_ann', text: 'friends', ts: old }],
      'c_cat|c_dan': [{ from: 'c_cat', text: 'stale strangers', ts: old }],
      'c_eve|c_fox': [{ from: 'c_eve', text: 'fresh strangers', ts: now }],
      'c_gil|c_hal': [{ from: 'c_gil', text: 'requested', ts: old }],
    },
    chatHistory: {
      c_ann: [row('c_bob', old)],
      c_cat: [row('c_dan', old)],
      c_dan: [row('c_cat', old), row('c_zed', now)],
      c_eve: [row('c_fox', now)],
    },
    friendRequests: { c_hal: { c_gil: { username: 'Gil', ts: now } } },
    blocks: {},
  },
}));

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', DATABASE_URL: '' },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  try {
    for (let i = 0; i < 80; i++) {
      try { await fetch(BASE + '/healthz'); break; } catch (_) { await wait(250); }
    }
    await wait(3500); // the 2s debounced save
    const s = JSON.parse(fs.readFileSync(FILE, 'utf8')).social;
    ok('history older than 24h is dropped', !s.chatHistory.c_ann && !s.chatHistory.c_cat, s.chatHistory);
    ok('fresh history rows stay', s.chatHistory.c_dan && s.chatHistory.c_dan.length === 1
      && s.chatHistory.c_dan[0].clientId === 'c_zed' && s.chatHistory.c_eve.length === 1, s.chatHistory);
    ok('friends keep their conversation', !!s.friendChats['c_ann|c_bob'], Object.keys(s.friendChats));
    ok('an unreachable stranger conversation is removed', !s.friendChats['c_cat|c_dan'], Object.keys(s.friendChats));
    ok('a recent stranger conversation stays', !!s.friendChats['c_eve|c_fox'], Object.keys(s.friendChats));
    ok('a pending friend request keeps the conversation', !!s.friendChats['c_gil|c_hal'], Object.keys(s.friendChats));
  } finally {
    srv.kill('SIGTERM');
    await wait(500);
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }
  console.log(failed ? `\n${failed} failed` : '\nAll checks passed');
  process.exit(failed ? 1 : 0);
})();
