#!/usr/bin/env node
/*
 * A banned person can sign in but sees only the banned screen (real server):
 *   - sign-in works and the socket gets 'banned' with the appeal state
 *   - every TalkLive event is ignored (find-partner, friend-message, ...)
 *   - an appeal is stored (10-1000 chars, one open, three per ban) and the owner
 *     is able to answer it; the reply arrives on the socket live
 *   - "reply + lift ban" lets the person back in at once
 *   - delete-account works while banned
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { io } = require('socket.io-client');
const totp = require('../server/totp');

const PORT = 6300 + Math.floor(Math.random() * 500);
const BASE = `http://localhost:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-appeal-'));
let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : extra);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let logs = '';
const socks = [];
function once(sock, ev, ms = 4000) {
  return new Promise((res, rej) => {
    const timer = setTimeout(() => { sock.off(ev, on); rej(new Error('timeout waiting for ' + ev)); }, ms);
    function on(data) { clearTimeout(timer); sock.off(ev, on); res(data); }
    sock.on(ev, on);
  });
}
function browser(ip) {
  const s = io(BASE, { transports: ['websocket'], forceNew: true, extraHeaders: { 'fly-client-ip': ip } });
  socks.push(s);
  s.events = [];
  s.onAny((ev) => s.events.push(ev));
  return s;
}
const ack = (s, ev, data) => new Promise((res) => s.emit(ev, data, res));
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
    const overview = async () => (await api('overview'));

    // An account, then banned while online.
    const home = browser('198.51.100.10');
    home.emit('register', { clientId: 'ap_home_01', nickname: 'Home' });
    await once(home, 'register-result').catch(() => {});
    const made = await signup(home, { username: 'appealer', password: 'a-long-pass-1', email: 'appealer@example.com' });
    ok('account created', made && made.ok, JSON.stringify(made));
    const liveBanned = once(home, 'banned');
    const b = await api('ban', { account: 'appealer', minutes: 600, reason: 'spam', alsoDevice: false });
    const first = await liveBanned.catch(() => null);
    ok('a live person gets the banned state without being disconnected', first && first.appeal.state === 'none' && first.canAppeal === true && first.reason === 'spam', JSON.stringify(first));
    await wait(200);
    ok('the socket stays connected', home.connected);
    home.events.length = 0;

    // Sign in from another browser and network: allowed, banned.
    const other = browser('203.0.113.50');
    const gotBan = once(other, 'banned');
    const lr = once(other, 'login-result');
    other.emit('login', { username: 'appealer', password: 'a-long-pass-1' });
    const login = await lr;
    const ban = await gotBan.catch(() => null);
    ok('a banned account can sign in', login.ok === true && login.banned === true && !!login.sessionToken, JSON.stringify(login));
    ok('and sees the banned state', ban && ban.until > Date.now() && ban.permanent === false, JSON.stringify(ban));

    // Everything else is ignored.
    other.events.length = 0;
    other.emit('register', { clientId: 'ap_other_01', nickname: 'X' });
    other.emit('find-partner', { mode: 'chat' });
    other.emit('friend-message', { to: 'ap_home_01', text: 'hi' });
    other.emit('feedback', { text: 'hello owner' });
    await wait(700);
    const bad = other.events.filter((e) => !['banned', 'register-result'].includes(e));
    ok('other events are ignored', bad.length === 0, bad.join(','));
    ok('a banned socket is not matched or searching', !other.events.includes('matched') && !other.events.includes('searching'));

    // Appeals.
    ok('too short is refused', (await ack(other, 'ban-appeal', { text: 'short' })).ok === false);
    ok('too long is refused', (await ack(other, 'ban-appeal', { text: 'x'.repeat(1001) })).ok === false);
    const sentLive = once(other, 'banned');
    const a1 = await ack(other, 'ban-appeal', { text: '  I did nothing wrong, please check again.  ' });
    ok('an appeal is accepted', a1.ok === true, JSON.stringify(a1));
    const afterSend = await sentLive.catch(() => null);
    ok('state turns to open', afterSend && afterSend.appeal.state === 'open' && afterSend.canAppeal === false);
    ok('a second open appeal is refused', (await ack(other, 'ban-appeal', { text: 'a second appeal at once' })).error === 'open');
    let list = (await api('bans')).bans.find((x) => x.id === b.ban.id);
    ok('the appeal is stored trimmed on the ban', list.appeals.length === 1 && list.appeals[0].text === 'I did nothing wrong, please check again.', JSON.stringify(list.appeals));
    { const c = (await overview()).counts; ok('the dashboard counts it', c.banAppeals === 1, JSON.stringify(c)); }

    // The owner replies; delivered live on both open sockets.
    const live1 = once(other, 'banned');
    const live2 = once(home, 'banned');
    const rr = await api(`bans/${b.ban.id}/appeals/${list.appeals[0].id}/reply`, { message: 'We looked again. The ban stays.', action: 'keep' });
    ok('owner reply accepted', rr.ok === true && rr.lifted === false, JSON.stringify(rr));
    const got1 = await live1.catch(() => null);
    const got2 = await live2.catch(() => null);
    ok('the reply arrives live', got1 && got1.appeal.state === 'answered' && got1.appeal.reply === 'We looked again. The ban stays.');
    ok('on every open screen of the account', got2 && got2.appeal.reply === 'We looked again. The ban stays.');
    ok('the count drops to zero', (await overview()).counts.banAppeals === 0);
    ok('the reply is on the next login too', await (async () => {
      const again = browser('203.0.113.51');
      const g = once(again, 'banned');
      again.emit('resume-session', { token: login.sessionToken });
      const s = await g.catch(() => null);
      return s && s.appeal.state === 'answered' && s.appeal.reply.startsWith('We looked');
    })());

    // Limit: three per ban.
    ok('appeal 2', (await ack(other, 'ban-appeal', { text: 'second appeal, more details here' })).ok === true);
    list = (await api('bans')).bans.find((x) => x.id === b.ban.id);
    await api(`bans/${b.ban.id}/appeals/${list.appeals[1].id}/reply`, { message: 'Still no.' });
    ok('appeal 3', (await ack(other, 'ban-appeal', { text: 'third appeal, last try here' })).ok === true);
    list = (await api('bans')).bans.find((x) => x.id === b.ban.id);
    await api(`bans/${b.ban.id}/appeals/${list.appeals[2].id}/reply`, { message: 'No.' });
    ok('a fourth appeal is refused', (await ack(other, 'ban-appeal', { text: 'fourth appeal, should fail' })).error === 'limit');

    // Reply + lift: back to normal at once.
    const lifted = once(other, 'ban-lifted').then(() => true, () => false);
    const lifted2 = once(home, 'ban-lifted').then(() => true, () => false);
    const rl = await api(`bans/${b.ban.id}/appeals/${list.appeals[2].id}/reply`, { message: 'Sorry, lifted.', action: 'lift' });
    ok('reply and lift', rl.ok && rl.lifted);
    ok('every open screen is told the ban is gone', (await lifted) && (await lifted2));
    const normal = browser('203.0.113.60');
    normal.emit('register', { clientId: 'ap_normal_1', nickname: 'N' });
    const reg = await once(normal, 'register-result').catch(() => null);
    ok('after the lift the account works normally', reg && reg.ok !== false);
    const again2 = browser('203.0.113.61');
    const lr2 = once(again2, 'login-result');
    again2.emit('login', { username: 'appealer', password: 'a-long-pass-1' });
    const l2 = await lr2;
    ok('and signs in without the banned flag', l2.ok && !l2.banned);

    // Delete account while banned.
    const victim = browser('198.51.100.20');
    victim.emit('register', { clientId: 'ap_victim_01', nickname: 'V' });
    await wait(200);
    const vm = await signup(victim, { username: 'doomed', password: 'a-long-pass-2', email: 'doomed@example.com' });
    ok('second account created', vm && vm.ok);
    const vbanned = once(victim, 'banned').catch(() => null);
    const vb = await api('ban', { account: 'doomed', minutes: 600, reason: 'abuse', alsoDevice: false });
    const vban = await vbanned;
    ok('second account banned', !!vban && !!vb.ban);
    const dr = once(victim, 'delete-account-result');
    victim.emit('delete-account', { currentPassword: 'a-long-pass-2' });
    const d = await dr.catch(() => null);
    ok('delete-account works while banned', d && d.ok === true, JSON.stringify(d));
    const probe = browser('203.0.113.70');
    const pl = once(probe, 'login-result');
    probe.emit('login', { username: 'doomed', password: 'a-long-pass-2' });
    ok('the deleted account no longer signs in', (await pl).ok === false);

    done(failed ? 1 : 0);
  } catch (e) {
    console.log('FAIL harness error', (e && e.stack) || e);
    console.log(logs.split('\n').slice(-15).join('\n'));
    done(1);
  }
})();
