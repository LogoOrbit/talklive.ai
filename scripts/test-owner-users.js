#!/usr/bin/env node
/*
 * The dashboard's Users tab (/owner/api/users):
 *   - needs a dashboard session
 *   - guests show only with ?who=all, and only once they did something
 *   - messages each person sent are counted, per sender
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { io } = require('socket.io-client');
const totp = require('../server/totp');

const PORT = 3000 + Math.floor(Math.random() * 2000) + 4000;
const BASE = `http://localhost:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-users-'));

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
    ok('Users API needs a dashboard session', (await fetch(BASE + '/owner/api/users')).status === 401);
    const setup = await (await fetch(BASE + '/owner/api/setup', { method: 'POST', headers: json, body: JSON.stringify({ password: 'correct horse battery', setupToken: 'test-setup-token' }) })).json();
    const conf = await fetch(BASE + '/owner/api/setup-confirm', { method: 'POST', headers: json, body: JSON.stringify({ code: totp.totpCode(setup.secret), setupToken: 'test-setup-token' }) });
    const owner = { ...json, cookie: String(conf.headers.get('set-cookie') || '').split(';')[0] };
    const users = async (who) => (await (await fetch(BASE + '/owner/api/users' + (who ? '?who=' + who : ''), { headers: owner })).json());

    const first = await users();
    ok('accounts view answers', Array.isArray(first.rows));

    const a = connect('Alpha');
    const b = connect('Bravo');
    socks.push(a, b);
    await wait(300);
    const matched = Promise.all([once(a, 'matched'), once(b, 'matched')]);
    a.emit('find-partner', { mode: 'chat' });
    b.emit('find-partner', { mode: 'chat' });
    await matched;

    for (let i = 0; i < 3; i++) {
      const got = once(b, 'chat-message');
      a.emit('chat-message', { text: 'hello there ' + i, id: 'ma' + i });
      await got;
    }
    const got = once(a, 'chat-message');
    b.emit('chat-message', { text: 'hi back', id: 'mb0' });
    await got;
    await wait(200);

    ok('guests stay out of the accounts view', !(await users()).rows.some((r) => r.clientId === 'c_test_Alpha'));
    const all = await users('all');
    const ra = all.rows.find((r) => r.clientId === 'c_test_Alpha');
    const rb = all.rows.find((r) => r.clientId === 'c_test_Bravo');
    ok('active guests show with who=all', ra && rb, all.rows.map((r) => r.clientId));
    ok('messages counted per sender', ra && ra.messages === 3 && ra.strangerMessages === 3 && rb && rb.messages === 1, [ra && ra.messages, rb && rb.messages]);
    ok('online flag', ra && ra.online === true);
    ok('row carries profile and activity fields', ra && ['username', 'email', 'friends', 'calls', 'talkSeconds', 'avatar'].every((k) => k in ra));
  } catch (err) {
    failed++;
    console.log('FAIL', err.message);
    console.log(logs.join('').slice(-2000));
  }
  console.log(failed ? `\n${failed} failed` : '\nAll passed');
  done(failed ? 1 : 0);
})();
