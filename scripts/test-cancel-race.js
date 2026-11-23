// A Cancel that crosses a pairing on the wire must not leave the person they
// never saw in either side's Call History. A pairing that was kept (the call
// went on past the race window) still is remembered.
//
//   node scripts/test-cancel-race.js
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 5599 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-cancel-'));
let failed = 0;
const ok = (name, cond, extra) => { if (!cond) failed++; console.log(cond ? 'PASS' : 'FAIL', name, cond ? '' : (extra || '')); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function once(sock, ev, ms = 5000) {
  return new Promise((res, rej) => {
    const timer = setTimeout(() => { sock.off(ev, on); rej(new Error('timeout ' + ev)); }, ms);
    function on(d) { clearTimeout(timer); sock.off(ev, on); res(d); }
    sock.on(ev, on);
  });
}
const latest = {};
function connect(name) {
  const sock = io(BASE, { transports: ['websocket'], forceNew: true });
  sock.on('state-sync', (s) => { latest[name] = s; });
  sock.emit('register', { clientId: 'c_cr_' + name, username: name, gender: 'male' });
  return sock;
}
const historyOf = (name) => ((latest[name] && latest[name].chatHistory) || []).map((h) => h.clientId);

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', DATABASE_URL: '' },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  const socks = [];
  try {
    for (let i = 0; i < 80; i++) { try { await fetch(BASE + '/healthz'); break; } catch (_) { await wait(250); } }
    const a = connect('Ann');
    const b = connect('Bob');
    const c = connect('Cat');
    socks.push(a, b, c);
    await wait(600);

    // Ann's Cancel lands right after the server paired her.
    let pair = Promise.all([once(a, 'matched'), once(b, 'matched')]);
    b.emit('find-partner', { mode: 'chat' });
    await wait(100);
    a.emit('find-partner', { mode: 'chat' });
    await pair;
    a.emit('leave', { cancelled: true });
    await wait(800);
    ok('cancelled pairing is not in the canceller\'s history', !historyOf('Ann').includes('c_cr_Bob'), historyOf('Ann'));
    ok('cancelled pairing is not in the partner\'s history', !historyOf('Bob').includes('c_cr_Ann'), historyOf('Bob'));

    // A conversation that lasted past the race window is kept. (A third
    // person: a pair that just parted is held apart for a while.)
    pair = Promise.all([once(a, 'matched'), once(c, 'matched')]);
    c.emit('find-partner', { mode: 'chat' });
    await wait(100);
    a.emit('find-partner', { mode: 'chat' });
    await pair;
    await wait(2500);
    a.emit('leave');
    await wait(800);
    const row = (latest.Ann.chatHistory || []).find((h) => h.clientId === 'c_cr_Cat');
    ok('a real conversation is remembered', !!row, historyOf('Ann'));
    ok('on both sides', historyOf('Cat').includes('c_cr_Ann'), historyOf('Cat'));
  } catch (e) {
    ok('no exception', false, e.message);
  } finally {
    socks.forEach((s) => s.close());
    srv.kill('SIGKILL');
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }
  console.log(failed ? `\n${failed} failed` : '\nAll checks passed');
  process.exit(failed ? 1 : 0);
})();
