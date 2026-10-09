#!/usr/bin/env node
/*
 * Client address and owner-setup hardening, end to end against a real server:
 *   - the address used for limits and bans is the one the proxy added, never
 *     the X-Forwarded-For entry the client typed
 *   - first-time /owner setup needs OWNER_SETUP_TOKEN
 *   - the unauthenticated /owner status hides storage host, error and path
 *   - new passwords need 8 characters
 *   - failed logins lock only the address they came from
 *
 * The server sits behind no proxy here, so each request plays Fly's part by
 * appending its "real" address as the last X-Forwarded-For entry.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { io } = require('socket.io-client');
const totp = require('../server/totp');
const { clientIpFrom } = require('../server/client-ip');

const PORT = 3000 + Math.floor(Math.random() * 2000) + 4000;
const BASE = `http://localhost:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-ip-'));
const SETUP_TOKEN = 'test-setup-token';

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
// A socket arriving from `realIp`, carrying a forged first hop as well.
function connectFrom(realIp) {
  return io(BASE, {
    transports: ['websocket'],
    forceNew: true,
    extraHeaders: { 'X-Forwarded-For': `6.6.6.${Math.floor(Math.random() * 250)}, ${realIp}` },
  });
}
async function ask(sock, ev, payload, reply) {
  const p = once(sock, reply);
  sock.emit(ev, payload);
  return p;
}

// --- Unit: which header is trusted -------------------------------------------
ok('Fly-Client-IP wins over X-Forwarded-For',
  clientIpFrom({ 'fly-client-ip': '203.0.113.5', 'x-forwarded-for': '1.2.3.4, 9.9.9.9' }, '10.0.0.1') === '203.0.113.5');
ok('rightmost X-Forwarded-For entry is used, not the forged first one',
  clientIpFrom({ 'x-forwarded-for': '1.2.3.4, 9.9.9.9' }, '10.0.0.1') === '9.9.9.9');
ok('no proxy headers falls back to the socket address',
  clientIpFrom({}, '::ffff:127.0.0.1') === '127.0.0.1');
ok('empty Fly-Client-IP is ignored',
  clientIpFrom({ 'fly-client-ip': '', 'x-forwarded-for': '5.5.5.5' }, '10.0.0.1') === '5.5.5.5');

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', OWNER_SETUP_TOKEN: SETUP_TOKEN, DATABASE_URL: '' },
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

    // --- Rate limit cannot be dodged by forging the first hop ----------------
    const codes = [];
    for (let i = 0; i < 7; i++) {
      const r = await fetch(BASE + '/contact', {
        method: 'POST',
        headers: { ...json, 'X-Forwarded-For': `10.0.0.${i}, 203.0.113.9` },
        body: JSON.stringify({ name: 'a', email: 'a@example.com', message: 'hello there friend' }),
      });
      codes.push(r.status);
    }
    ok('forged X-Forwarded-For still hits the /contact limit', codes.slice(5).every((c) => c === 429), codes.join(' '));

    // --- Owner status hides storage details before sign-in -------------------
    const status = await (await fetch(BASE + '/owner/api/status')).json();
    ok('unauthenticated status omits host, error and data path',
      status.storage && !('host' in status.storage) && !('error' in status.storage) && !('dataDir' in status.storage),
      JSON.stringify(status.storage));

    // --- Owner setup needs the token -----------------------------------------
    const post = (p, body) => fetch(BASE + '/owner/api/' + p, { method: 'POST', headers: json, body: JSON.stringify(body) });
    let r = await post('setup', { password: 'correct horse battery' });
    ok('setup without a token is refused', r.status === 403);
    r = await post('setup', { password: 'correct horse battery', setupToken: 'wrong' });
    ok('setup with a wrong token is refused', r.status === 403);
    r = await post('setup', { password: 'correct horse battery', setupToken: SETUP_TOKEN });
    const setup = await r.json();
    ok('setup with the token starts', r.status === 200 && !!setup.secret);
    r = await post('setup-confirm', { code: totp.totpCode(setup.secret) });
    ok('setup-confirm without the token is refused', r.status === 403);
    r = await post('setup-confirm', { code: totp.totpCode(setup.secret), setupToken: SETUP_TOKEN });
    ok('setup-confirm with the token completes', r.status === 200);
    r = await post('setup', { password: 'another long password', setupToken: SETUP_TOKEN });
    ok('setup cannot run again once done', r.status === 403);

    // --- Password minimum ----------------------------------------------------
    const a = connectFrom('198.51.100.1');
    socks.push(a);
    await once(a, 'connect');
    const short = await ask(a, 'signup', { username: 'iptestshort', password: 'abcd' }, 'signup-result');
    ok('a 4-character password is refused', short.ok === false, JSON.stringify(short));
    const made = await ask(a, 'signup', { username: 'iptestuser', password: 'longenough1' }, 'signup-result');
    ok('an 8+ character password is accepted', made.ok === true, JSON.stringify(made));

    // --- Lockout is per address ----------------------------------------------
    const attacker = connectFrom('198.51.100.66');
    socks.push(attacker);
    await once(attacker, 'connect');
    for (let i = 0; i < 8; i++) {
      await ask(attacker, 'login', { username: 'iptestuser', password: 'wrong-guess' }, 'login-result');
    }
    const blocked = await ask(attacker, 'login', { username: 'iptestuser', password: 'longenough1' }, 'login-result');
    ok('the failing address is locked out', blocked.ok === false && /Too many/.test(blocked.error || ''), JSON.stringify(blocked));
    const owner = connectFrom('198.51.100.2');
    socks.push(owner);
    await once(owner, 'connect');
    const mine = await ask(owner, 'login', { username: 'iptestuser', password: 'longenough1' }, 'login-result');
    ok('the real owner can still sign in from their own address', mine.ok === true, JSON.stringify(mine));
  } catch (err) {
    ok('harness', false, err.message + '\n' + logs.join('').slice(-2000));
  }

  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
  done(failed ? 1 : 0);
})();
