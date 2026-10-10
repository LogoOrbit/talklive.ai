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
const { clientIpFrom, ipBucket } = require('../server/client-ip');

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

// --- Unit: rate-limit buckets ------------------------------------------------
ok('IPv4 is its own bucket', ipBucket('203.0.113.9') === '203.0.113.9');
ok('IPv6 buckets by /64', ipBucket('2001:db8:1:1::1') === '2001:db8:1:1::/64'
  && ipBucket('2001:db8:1:1:aaaa:bbbb:cccc:dddd') === '2001:db8:1:1::/64');
ok('IPv6 leading zeros normalise', ipBucket('2001:0db8:0001:0001::5') === '2001:db8:1:1::/64');
ok('IPv6 short and zoned forms', ipBucket('::1') === '0:0:0:0::/64' && ipBucket('fe80::1%eth0') === 'fe80:0:0:0::/64');
ok('IPv6 with :: inside the prefix', ipBucket('2001:db8::1') === '2001:db8:0:0::/64');

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
    const made = await ask(a, 'signup',
      { username: 'iptestuser', password: 'longenough1', email: 'iptest@example.com' }, 'signup-result');
    ok('an 8+ character password is accepted', made.ok === true, JSON.stringify(made));

    const login = async (from, password) => {
      const s = connectFrom(from);
      socks.push(s);
      await once(s, 'connect');
      return ask(s, 'login', { username: 'iptestuser', password }, 'login-result');
    };
    const fail = async (from, n) => {
      const s = connectFrom(from);
      socks.push(s);
      await once(s, 'connect');
      for (let i = 0; i < n; i++) await ask(s, 'login', { username: 'iptestuser', password: 'wrong-guess' }, 'login-result');
    };
    const locked = (r) => r.ok === false && /Too many/.test(r.error || '');

    // --- Lockout is per address ----------------------------------------------
    await fail('198.51.100.66', 8);
    let res = await login('198.51.100.66', 'longenough1');
    ok('the failing address is locked out', locked(res), JSON.stringify(res));

    // --- IPv6 counts per /64 -------------------------------------------------
    for (let i = 1; i <= 8; i++) await fail(`2001:db8:1:1::${i}`, 1);
    res = await login('2001:db8:1:1::99', 'longenough1');
    ok('rotating addresses inside one IPv6 /64 still locks that /64', locked(res), JSON.stringify(res));
    res = await login('2001:db8:1:2::1', 'longenough1');
    ok('a different /64 is not affected', res.ok === true, JSON.stringify(res));
    res = await login('198.51.100.2', 'longenough1');
    ok('the real owner can still sign in from their own address', res.ok === true, JSON.stringify(res));

    // --- Account-wide cap, and the owner's own network ------------------------
    // 16 failures so far; 24 more from three addresses reach the cap of 40.
    for (const from of ['198.51.100.71', '198.51.100.72', '198.51.100.73']) await fail(from, 8);
    res = await login('198.51.100.150', 'longenough1');
    ok('guesses spread over many addresses lock the account for new addresses', locked(res), JSON.stringify(res));
    res = await login('198.51.100.2', 'longenough1');
    ok('the address the account last signed in from is exempt from that lock', res.ok === true, JSON.stringify(res));

    // --- A completed password reset lifts every lock -------------------------
    const r1 = connectFrom('198.51.100.151');
    socks.push(r1);
    await once(r1, 'connect');
    const forgot = await ask(r1, 'forgot-password', { email: 'iptest@example.com' }, 'forgot-password-result');
    await wait(200);
    const m = [...logs.join('').matchAll(/reset code for iptest@example\.com is (\d{6})/g)].pop();
    const verified = await ask(r1, 'verify-reset-code', { email: 'iptest@example.com', code: m && m[1] }, 'verify-reset-code-result');
    const reset = await ask(r1, 'reset-password', { resetToken: verified.resetToken, newPassword: 'brand-new-pass' }, 'reset-password-result');
    ok('password reset completes while the account is locked', forgot.ok && verified.ok && reset.ok === true, JSON.stringify(reset));
    res = await login('198.51.100.152', 'brand-new-pass');
    ok('after the reset, the new password works from any address', res.ok === true, JSON.stringify(res));
  } catch (err) {
    ok('harness', false, err.message + '\n' + logs.join('').slice(-2000));
  }

  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
  done(failed ? 1 : 0);
})();
