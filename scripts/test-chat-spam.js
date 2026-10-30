#!/usr/bin/env node
/*
 * Chat spam guard end to end: two strangers in a text chat, one floods.
 *   - normal messages arrive
 *   - a 6th message in 5 seconds is refused with "too fast" and not delivered
 *   - a 3rd identical message is refused and not delivered
 *   - a character wall is refused
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { io } = require('socket.io-client');

const PORT = 3000 + Math.floor(Math.random() * 2000) + 4000;
const BASE = `http://localhost:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-chatspam-'));
let failed = 0;
const ok = (name, cond, extra) => { if (!cond) failed++; console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : JSON.stringify(extra)); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function once(sock, ev, ms = 4000) {
  return new Promise((res, rej) => {
    const timer = setTimeout(() => { sock.off(ev, on); rej(new Error('timeout waiting for ' + ev)); }, ms);
    function on(data) { clearTimeout(timer); sock.off(ev, on); res(data); }
    sock.on(ev, on);
  });
}
function connect(name) {
  const sock = io(BASE, { transports: ['websocket'], forceNew: true });
  sock.emit('register', { clientId: 'c_spam_' + name, username: name, gender: 'male', country: 'US', countryName: 'United States' });
  return sock;
}

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', DATABASE_URL: '' }, stdio: 'ignore',
  });
  const socks = [];
  const done = (code) => { socks.forEach((s) => s.close()); try { srv.kill('SIGKILL'); } catch (_) {} fs.rmSync(DATA_DIR, { recursive: true, force: true }); process.exit(code); };
  try {
    for (let i = 0; i < 40; i++) { try { await fetch(BASE + '/healthz'); break; } catch (_) { await wait(250); } }
    const a = connect('Alpha'); const b = connect('Bravo'); socks.push(a, b);
    await wait(400);
    const matched = Promise.all([once(a, 'matched'), once(b, 'matched')]);
    a.emit('find-partner', { mode: 'chat' }); b.emit('find-partner', { mode: 'chat' });
    await matched;

    const got = []; const blocked = [];
    b.on('chat-message', (m) => got.push(m.text));
    a.on('chat-blocked', (x) => blocked.push(x.reason));

    for (let i = 1; i <= 6; i++) a.emit('chat-message', { text: 'message number ' + i, id: 'f' + i });
    await wait(600);
    ok('first 5 quick messages arrive', got.length === 5, got);
    ok('6th in 5 seconds refused as too fast', blocked[0] === 'rate', blocked);

    await wait(5200);
    got.length = 0; blocked.length = 0;
    for (const t of ['please answer me', 'please answer me', 'please answer me']) { a.emit('chat-message', { text: t }); await wait(1200); }
    ok('two identical messages arrive', got.length === 2, got);
    ok('3rd identical refused', blocked[0] === 'unsafe', blocked);

    await wait(1200);
    a.emit('chat-message', { text: 'heyyyyyyyyyyyyyyyyyyyyyy' });
    await wait(500);
    ok('character wall refused (and that is 3 blocks: muted)', blocked.length === 2 && got.length === 2, { blocked, got });
    a.emit('chat-message', { text: 'sorry' });
    await wait(500);
    ok('muted: next message refused as too fast', blocked[2] === 'rate' && got.length === 2, blocked);
  } catch (err) { failed++; console.log('FAIL', err.message); }
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll chat spam checks passed');
  done(failed ? 1 : 0);
})();
