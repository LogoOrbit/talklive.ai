#!/usr/bin/env node
/*
 * New-feature usage on the owner dashboard (/owner/api/new-features) and the
 * call reaction guard:
 *   - streak / passport numbers are distinct people from saved records
 *   - hearts already in "Who liked you" count as people from the first load
 *   - only the four call reactions are relayed, and a flood is cut off
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { io } = require('socket.io-client');
const totp = require('../server/totp');

const PORT = 3000 + Math.floor(Math.random() * 2000) + 4000;
const BASE = `http://localhost:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-newfeat-'));

let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : extra);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function once(sock, ev, ms = 5000) {
  return new Promise((res, rej) => {
    const timer = setTimeout(() => { sock.off(ev, on); rej(new Error('timeout waiting for ' + ev)); }, ms);
    function on(data) { clearTimeout(timer); sock.off(ev, on); res(data); }
    sock.on(ev, on);
  });
}
function connect(name) {
  const sock = io(BASE, { transports: ['websocket'], forceNew: true });
  sock.emit('register', { clientId: 'c_test_' + name, username: name, gender: 'male' });
  return sock;
}

const today = new Date().toISOString().slice(0, 10);
const now = Date.now();
fs.writeFileSync(path.join(DATA_DIR, 'owner-data.json'), JSON.stringify({
  engage: {
    a: { streak: { count: 3, best: 3, last: today, freezeWeek: '' }, passport: ['US', 'IN', 'PK', 'BR', 'DE'], week: {}, merged: false },
    b: { streak: { count: 1, best: 1, last: '2026-01-01', freezeWeek: '2026-01-01' }, passport: ['US'], week: {}, merged: false },
    c: { streak: { count: 0, best: 0, last: '', freezeWeek: '' }, passport: [], week: {}, merged: false },
  },
  likes: { a: [{ from: 'x', username: 'X', country: 'US', at: now }, { from: 'y', username: 'Y', country: 'IN', at: now }], b: [{ from: 'x', username: 'X', country: 'US', at: now }] },
}));

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', OWNER_SETUP_TOKEN: 'test-setup-token', DATABASE_URL: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const logs = [];
  srv.stdout.on('data', (d) => logs.push(String(d)));
  srv.stderr.on('data', (d) => logs.push(String(d)));
  const socks = [];
  const done = (code) => {
    socks.forEach((s) => { try { s.close(); } catch (_) { /* closed */ } });
    try { srv.kill('SIGKILL'); } catch (_) { /* gone */ }
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    process.exit(code);
  };

  try {
    for (let i = 0; i < 40; i++) {
      try { await fetch(BASE + '/healthz'); break; } catch (_) { await wait(250); }
    }
    const json = { 'Content-Type': 'application/json' };
    ok('needs a dashboard session', (await fetch(BASE + '/owner/api/new-features')).status === 401);
    const setup = await (await fetch(BASE + '/owner/api/setup', { method: 'POST', headers: json, body: JSON.stringify({ password: 'correct horse battery', setupToken: 'test-setup-token' }) })).json();
    const conf = await fetch(BASE + '/owner/api/setup-confirm', { method: 'POST', headers: json, body: JSON.stringify({ code: totp.totpCode(setup.secret), setupToken: 'test-setup-token' }) });
    const owner = { ...json, cookie: String(conf.headers.get('set-cookie') || '').split(';')[0] };
    const get = async () => (await fetch(BASE + '/owner/api/new-features', { headers: owner })).json();

    const r = await get();
    ok('streak people', r.streak.people === 3 && r.streak.any === 2 && r.streak.d3 === 1 && r.streak.best === 3, r.streak);
    ok('alive streak', r.streak.alive === 1 && r.streak.today === 1 && r.streak.saved === 1, r.streak);
    ok('passport people', r.passport.any === 2 && r.passport.c5 === 1 && r.passport.stamps === 6 && r.passport.max === 5, r.passport);
    ok('top stamped country', r.passport.top[0][0] === 'US' && r.passport.top[0][1] === 2, r.passport.top);
    ok('likes', r.likes.liked === 2 && r.likes.likers === 2 && r.likes.heartSenders === 2, r.likes);
    ok('event rows', Array.isArray(r.events) && r.events.some((e) => e.key === 'undo_skip'));

    const a = connect('Alpha');
    const b = connect('Bravo');
    socks.push(a, b);
    await wait(300);
    const matched = Promise.all([once(a, 'matched'), once(b, 'matched')]);
    a.emit('find-partner', { mode: 'chat' });
    b.emit('find-partner', { mode: 'chat' });
    await matched;

    const got = [];
    b.on('reaction', (x) => got.push(x));
    a.emit('reaction', 'x'.repeat(5000));
    a.emit('reaction', { evil: 1 });
    a.emit('reaction', 'heart');
    await wait(300);
    ok('only known reactions relayed', got.length === 1 && got[0] === 'heart', got.map((x) => String(x).slice(0, 20)));
    for (let i = 0; i < 40; i++) a.emit('reaction', 'clap');
    await wait(400);
    ok('reaction flood cut off', got.length <= 12, got.length);

    const r2 = await (await fetch(BASE + '/owner/api/new-features?fresh=' + Date.now(), { headers: owner })).json();
    const hearts = r2.events.find((e) => e.key === 'heart_reaction');
    ok('heart sender counted as a person', r2.likes.heartSenders === 3 && hearts.people === 3, [r2.likes.heartSenders, hearts.people]);
  } catch (err) {
    failed++;
    console.log('FAIL', err.message);
    console.log(logs.join('').slice(-2000));
  }
  console.log(failed ? `\n${failed} failed` : '\nAll passed');
  done(failed ? 1 : 0);
})();
