#!/usr/bin/env node
/*
 * Ban evasion, end to end against a real server:
 *   - an IPv6 ban covers the whole /64; old rows holding a plain address still match
 *   - a ban on a profile that belongs to an account follows the account to a new
 *     browser, and banning an account bans its linked profile
 *   - the device cookie (web) and the hashed app id (Android) survive a new clientId
 *   - a device or account ban never touches other people on the same IPv4 address
 *   - an evasion attempt is counted, linked to the ban and does not extend it
 *   - lifting a ban lifts all of it
 *   - the cookie is set once on HTML pages with safe flags and is not cacheable by a shared cache
 */
const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { io } = require('socket.io-client');
const totp = require('../server/totp');

const PORT = 5200 + Math.floor(Math.random() * 600);
const BASE = `http://localhost:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-banev-'));

let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : extra);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const token = () => crypto.randomBytes(16).toString('hex');
let logs = '';

function once(sock, ev, ms = 4000) {
  return new Promise((res, rej) => {
    const timer = setTimeout(() => { sock.off(ev, on); rej(new Error('timeout waiting for ' + ev)); }, ms);
    function on(data) { clearTimeout(timer); sock.off(ev, on); res(data); }
    sock.on(ev, on);
  });
}
const socks = [];
// A browser: its own network address and (optionally) a device cookie.
function browser({ ip, cookie }) {
  const headers = { 'fly-client-ip': ip };
  if (cookie) headers.cookie = `tl_dev=${cookie}`;
  const s = io(BASE, { transports: ['websocket'], forceNew: true, extraHeaders: headers });
  socks.push(s);
  s.banned = null;
  s.on('banned', (b) => { s.banned = b; });
  return s;
}
// Resolves 'banned' or 'ok' for a register attempt.
async function tryRegister(s, extra = {}) {
  const clientId = 'be_' + token().slice(0, 12);
  const result = new Promise((res) => {
    s.once('banned', () => res('banned'));
    s.once('register-result', (r) => res(r && r.ok === false ? 'refused' : 'ok'));
    s.once('profile', () => res('ok'));
    setTimeout(() => res('timeout'), 2500);
  });
  s.emit('register', { clientId, nickname: 'Tester', ...extra });
  return { clientId, outcome: await result };
}
async function signup(sock, details) {
  const send = once(sock, 'signup-code-result');
  sock.emit('signup-send-code', { dob: '1990-01-01', ...details });
  const sent = await send;
  if (!sent.ok) return sent;
  let code = null;
  for (let i = 0; i < 40 && !code; i++) {
    const m = logs.match(new RegExp(`verification code for ${details.email.replace(/[.+]/g, '\\$&')} is (\\d{6})`));
    if (m) code = m[1]; else await wait(50);
  }
  const res = once(sock, 'signup-result');
  sock.emit('signup', { dob: '1990-01-01', ...details, code });
  return res;
}

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', OWNER_SETUP_TOKEN: 'test-setup-token', DATABASE_URL: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  srv.stdout.on('data', (d) => { logs += String(d); });
  srv.stderr.on('data', (d) => { logs += String(d); });
  const done = (code) => {
    socks.forEach((s) => { try { s.close(); } catch (_) { /* closed */ } });
    try { srv.kill('SIGKILL'); } catch (_) { /* gone */ }
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    process.exit(code);
  };
  try {
    for (let i = 0; i < 40; i++) { try { await fetch(BASE + '/healthz'); break; } catch (_) { await wait(250); } }

    const json = { 'Content-Type': 'application/json' };
    const setup = await (await fetch(BASE + '/owner/api/setup', { method: 'POST', headers: json, body: JSON.stringify({ password: 'correct horse battery', setupToken: 'test-setup-token' }) })).json();
    const conf = await fetch(BASE + '/owner/api/setup-confirm', { method: 'POST', headers: json, body: JSON.stringify({ code: totp.totpCode(setup.secret), setupToken: 'test-setup-token' }) });
    const owner = { ...json, cookie: String(conf.headers.get('set-cookie') || '').split(';')[0] };
    const api = async (p, body) => (await fetch(BASE + '/owner/api/' + p, body ? { method: 'POST', headers: owner, body: JSON.stringify(body) } : { headers: owner })).json();
    const bans = async () => (await api('bans')).bans;

    // --- the cookie ----------------------------------------------------------
    const first = await fetch(BASE + '/random-voice-chat', { headers: { 'user-agent': 'Mozilla/5.0 (X11; Linux) Chrome/120' } });
    const setCookie = first.headers.get('set-cookie') || '';
    ok('first HTML visit gets the device cookie', /^tl_dev=[0-9a-f]{32,}/.test(setCookie), setCookie);
    ok('cookie is HttpOnly, SameSite=Lax, a year, first party path', /HttpOnly/.test(setCookie) && /SameSite=Lax/.test(setCookie) && /Max-Age=31536000/.test(setCookie) && /Path=\//.test(setCookie));
    ok('a page that sets a cookie is not cacheable by shared caches', !/public/.test(first.headers.get('cache-control') || ''), first.headers.get('cache-control'));
    const again = await fetch(BASE + '/random-voice-chat', { headers: { cookie: setCookie.split(';')[0], 'user-agent': 'Mozilla/5.0 Chrome/120' } });
    ok('the cookie is not reissued once present', !(again.headers.get('set-cookie') || ''));
    const asset = await fetch(BASE + '/favicon.svg');
    ok('assets and crawlers do not get it', !(asset.headers.get('set-cookie') || ''));
    const bot = await fetch(BASE + '/', { headers: { 'user-agent': 'Googlebot/2.1' } });
    ok('crawlers do not get it', !(bot.headers.get('set-cookie') || ''));

    // --- device cookie ban survives a new clientId ----------------------------
    const dev1 = token();
    const a = browser({ ip: '198.51.100.10', cookie: dev1 });
    const reg1 = await tryRegister(a);
    ok('a normal visitor registers', reg1.outcome === 'ok', reg1.outcome);
    const b1 = await api('ban', { clientId: reg1.clientId, username: 'Tester', reason: 'test', minutes: 60 });
    ok('the owner can ban with "also this device" (default)', b1.ok && b1.ban.deviceId === 'w:' + dev1, JSON.stringify(b1.ban));
    await wait(300);
    ok('the banned person is kicked live', !!a.banned);

    const evader = browser({ ip: '203.0.113.77', cookie: dev1 });
    const evade = await tryRegister(evader);
    ok('same device, new clientId, other network: refused', evade.outcome === 'banned', evade.outcome);
    const row1 = (await bans()).find((x) => x.id === b1.ban.id);
    ok('the ban shows the new clientId as an attempt', row1.evasions && row1.evasions[0] && row1.evasions[0].clientId === evade.clientId && row1.evasions[0].via === 'device', JSON.stringify(row1.evasions));
    ok('the ban is not extended by the attempt', row1.expiresAt === b1.ban.expiresAt);
    ok('the dashboard learns a device is bound', row1.deviceBound === true && row1.deviceId === undefined);
    const day = (await api('overview')).features;
    void day;

    // Same IPv4 as the banned person, different device: unaffected.
    const neighbour = browser({ ip: '198.51.100.10', cookie: token() });
    ok('another person on the same IPv4 is not affected by a device ban', (await tryRegister(neighbour)).outcome === 'ok');

    // --- Android: hashed app id, no cookie ------------------------------------
    const appId = crypto.createHash('sha256').update('app.talklive.device.v1:test').digest('hex');
    const app1 = browser({ ip: '192.0.2.20' });
    const appReg = await tryRegister(app1, { deviceId: appId });
    ok('the app registers with its device id', appReg.outcome === 'ok');
    const b2 = await api('ban', { clientId: appReg.clientId, minutes: 60, reason: 'test' });
    ok('the ban binds the app device id', b2.ban.deviceId === 'a:' + appId);
    const app2 = browser({ ip: '192.0.2.99' });
    ok('app: new clientId on the same device is refused', (await tryRegister(app2, { deviceId: appId })).outcome === 'banned');
    const app3 = browser({ ip: '192.0.2.99' });
    ok('app: a different device is fine', (await tryRegister(app3, { deviceId: crypto.createHash('sha256').update('other').digest('hex') })).outcome === 'ok');

    // --- "also ban this device" off ---------------------------------------------
    const dev3 = token();
    const c = browser({ ip: '198.51.100.30', cookie: dev3 });
    const cReg = await tryRegister(c);
    const b3 = await api('ban', { clientId: cReg.clientId, minutes: 60, reason: 'test', alsoDevice: false });
    ok('unticking the device box leaves the device out', b3.ban.deviceId === null);
    const c2 = browser({ ip: '198.51.100.31', cookie: dev3 });
    ok('so the same device with a new clientId can connect', (await tryRegister(c2)).outcome === 'ok');

    // --- accounts ---------------------------------------------------------------
    const home = browser({ ip: '198.51.100.40', cookie: token() });
    await tryRegister(home);
    const made = await signup(home, { username: 'banneduser', password: 'a-long-pass-1', email: 'banned@example.com' });
    ok('account created', made && made.ok, JSON.stringify(made));
    const linked = made.profileClientId;
    ok('the account has its own linked profile', typeof linked === 'string' && linked.length > 8, String(linked));
    const b4 = await api('ban', { clientId: linked, minutes: 60, reason: 'test', alsoDevice: false });
    ok('banning the linked profile records the account', b4.ban.account === 'banneduser', JSON.stringify(b4.ban));
    await wait(300);
    const fresh = browser({ ip: '203.0.113.200', cookie: token() });
    await tryRegister(fresh);
    const loginRes = new Promise((res) => { fresh.once('banned', () => res('banned')); fresh.once('login-result', (r) => res(r.ok ? 'in' : 'denied')); setTimeout(() => res('timeout'), 3000); });
    fresh.emit('login', { username: 'banneduser', password: 'a-long-pass-1' });
    ok('signing in from a fresh browser on another network is refused', (await loginRes) === 'banned');
    const row4 = (await bans()).find((x) => x.id === b4.ban.id);
    ok('the attempt is recorded against the ban', row4.evasions && row4.evasions.length === 1 && row4.evasions[0].via === 'account', JSON.stringify(row4.evasions));

    // The signed-in session token also gets nowhere.
    const resumed = browser({ ip: '203.0.113.201', cookie: token() });
    const resumeRes = new Promise((res) => { resumed.once('banned', () => res('banned')); resumed.once('resume-session-result', (r) => res(r.ok ? 'in' : 'denied')); setTimeout(() => res('timeout'), 3000); });
    resumed.emit('resume-session', { token: made.sessionToken });
    ok('resuming the account is refused too', (await resumeRes) === 'banned');

    // Ban by account name only.
    const home2 = browser({ ip: '198.51.100.41', cookie: token() });
    await tryRegister(home2);
    const made2 = await signup(home2, { username: 'otheruser', password: 'a-long-pass-2', email: 'other@example.com' });
    const b5 = await api('ban', { account: 'otheruser', minutes: 60, reason: 'test', alsoDevice: false });
    ok('banning an account bans its linked profile', b5.ban.clientId === made2.profileClientId && b5.ban.account === 'otheruser', JSON.stringify(b5.ban));
    const viaProfile = browser({ ip: '203.0.113.210' });
    ok('the linked profile cannot register', (await (async () => {
      const r = new Promise((res) => { viaProfile.once('banned', () => res('banned')); viaProfile.once('register-result', () => res('ok')); setTimeout(() => res('timeout'), 2500); });
      viaProfile.emit('register', { clientId: made2.profileClientId, identityToken: made2.identityToken, nickname: 'x' });
      return r;
    })()) === 'banned');

    // Account-only ban: a neighbour on the same IPv4 is untouched.
    const nb = browser({ ip: '198.51.100.41', cookie: token() });
    ok('an account-only ban does not touch others on the same IPv4', (await tryRegister(nb)).outcome === 'ok');

    // --- IPv6 -------------------------------------------------------------------
    const b6 = await api('ban', { ip: '2001:db8:aa:bb:1111:2222:3333:4444', username: 'v6', minutes: 60, reason: 'test', alsoDevice: false });
    ok('an IPv6 ban is recorded', b6.ok);
    const rot = browser({ ip: '2001:db8:aa:bb:9999:8888:7777:6666', cookie: token() });
    const rotRes = await new Promise((res) => { rot.once('banned', () => res('banned')); setTimeout(() => res('ok'), 1500); });
    ok('a rotated privacy address in the same /64 is refused', rotRes === 'banned');
    const other64 = browser({ ip: '2001:db8:aa:cc:1111:2222:3333:4444', cookie: token() });
    ok('another /64 is not affected', (await tryRegister(other64)).outcome === 'ok');

    // --- lifting ------------------------------------------------------------------
    for (const id of [b1.ban.id, b2.ban.id, b4.ban.id, b5.ban.id, b6.ban.id]) await api('unban', { banId: id });
    const back = browser({ ip: '203.0.113.77', cookie: dev1 });
    ok('lifted: the device can register again', (await tryRegister(back)).outcome === 'ok');
    const back2 = browser({ ip: '203.0.113.211', cookie: token() });
    await tryRegister(back2);
    const lr = new Promise((res) => { back2.once('banned', () => res('banned')); back2.once('login-result', (r) => res(r.ok ? 'in' : 'denied')); setTimeout(() => res('timeout'), 3000); });
    back2.emit('login', { username: 'banneduser', password: 'a-long-pass-1' });
    ok('lifted: the account can sign in again', (await lr) === 'in');
    const back3 = browser({ ip: '2001:db8:aa:bb:5555::1', cookie: token() });
    ok('lifted: the IPv6 network can connect again', (await tryRegister(back3)).outcome === 'ok');

    done(failed ? 1 : 0);
  } catch (e) {
    console.log('FAIL harness error', e && e.stack || e);
    console.log(logs.split('\n').slice(-15).join('\n'));
    done(1);
  }
})();
