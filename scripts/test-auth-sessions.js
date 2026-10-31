// Durable sign-in sessions, end to end against a real server:
//   - sign-up with the emailed code (read from the dev-mode server log)
//   - session tokens are stored hashed, never as the raw token
//   - a token stored the old (raw) way still resumes and is re-keyed on use
//   - changing the password signs out every other device, including sockets
//     that are connected right now, and keeps this device signed in
//   - logout kills the stored token
//
//   node scripts/test-auth-sessions.js
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 7100 + Math.floor(Math.random() * 400);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-sessions-'));
const DATA_FILE = path.join(DATA_DIR, 'owner-data.json');

let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : JSON.stringify(extra));
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');

let srv = null;
let logs = '';
function start() {
  logs = '';
  srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, DATABASE_URL: '', NODE_ENV: 'development', SAVE_DEBOUNCE_MS: '200' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  srv.stdout.on('data', (d) => { logs += d; });
  srv.stderr.on('data', (d) => { logs += d; });
  return (async () => {
    for (let i = 0; i < 60; i++) {
      try { await fetch(BASE + '/healthz'); return; } catch (_) { await wait(250); }
    }
    throw new Error('server did not start');
  })();
}
async function stop() {
  if (!srv) return;
  const exited = new Promise((r) => srv.once('exit', r));
  srv.kill('SIGTERM');
  await Promise.race([exited, wait(8000)]);
  srv = null;
}

const socks = [];
function connect() {
  const s = io(BASE, { transports: ['websocket'], forceNew: true });
  socks.push(s);
  return s;
}
function once(sock, ev, ms = 6000) {
  return new Promise((res, rej) => {
    const timer = setTimeout(() => { sock.off(ev, on); rej(new Error('timeout waiting for ' + ev)); }, ms);
    function on(data) { clearTimeout(timer); sock.off(ev, on); res(data); }
    sock.on(ev, on);
  });
}
function ask(sock, ev, payload, resultEv) {
  const p = once(sock, resultEv);
  sock.emit(ev, payload);
  return p;
}
async function ready(sock) {
  if (!sock.connected) await once(sock, 'connect');
  const clientId = 'sess' + crypto.randomBytes(6).toString('hex');
  await ask(sock, 'register', { clientId, nickname: 'Tester' }, 'register-result');
  return sock;
}

// Sign-up needs the 6-digit code; without SMTP the server prints it.
async function signupWithCode(sock, details) {
  const sent = await ask(sock, 'signup-send-code', details, 'signup-code-result');
  if (!sent.ok) return sent;
  let code = null;
  for (let i = 0; i < 40 && !code; i++) {
    const m = logs.match(new RegExp(`verification code for ${details.email.replace(/[.+]/g, '\\$&')} is (\\d{6})`));
    if (m) code = m[1]; else await wait(50);
  }
  return ask(sock, 'signup', { ...details, code }, 'signup-result');
}

function storedSessions() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')).authSessions || {};
}

(async () => {
  try {
    await start();
    const a = await ready(connect());
    const made = await signupWithCode(a, { username: 'sessuser', password: 'first-pass-1', email: 'sess@example.com' });
    ok('sign-up with the emailed code succeeds', made.ok === true && /^[a-f0-9]{64}$/.test(made.sessionToken || ''), made);
    const token = made.sessionToken;
    await wait(600);
    let stored = storedSessions();
    ok('the raw session token is not in the store', !(token in stored) && !JSON.stringify(stored).includes(token));
    ok('the store holds its hash instead', ('h:' + sha(token)) in stored);

    const b = await ready(connect());
    const resumed = await ask(b, 'resume-session', { token }, 'resume-session-result');
    ok('a second device resumes with the token', resumed.ok === true, resumed);

    // --- Legacy raw keys keep working and are re-keyed -------------------------
    await stop();
    const doc = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    doc.authSessions[token] = doc.authSessions['h:' + sha(token)];
    delete doc.authSessions['h:' + sha(token)];
    fs.writeFileSync(DATA_FILE, JSON.stringify(doc));
    await start();
    const c = await ready(connect());
    const legacy = await ask(c, 'resume-session', { token }, 'resume-session-result');
    ok('a token stored the old way still resumes', legacy.ok === true, legacy);
    await wait(600);
    stored = storedSessions();
    ok('and is re-keyed to its hash on use', !(token in stored) && ('h:' + sha(token)) in stored);

    // --- Password change signs out live sockets elsewhere ---------------------
    const d = await ready(connect());
    ok('device D resumes', (await ask(d, 'resume-session', { token }, 'resume-session-result')).ok === true);
    const kicked = once(d, 'resume-session-result');
    const changed = await ask(c, 'change-password', { currentPassword: 'first-pass-1', newPassword: 'second-pass-2' }, 'change-password-result');
    ok('password change succeeds and issues a new token', changed.ok === true && changed.sessionToken && changed.sessionToken !== token, changed);
    const kick = await kicked.catch(() => null);
    ok('the other connected device is told it is signed out', kick && kick.ok === false, kick);
    const nick = await ask(d, 'update-nickname', { nickname: 'Hijacker' }, 'update-nickname-result');
    ok('and can no longer act as the account', nick.ok === false, nick);
    const mine = await ask(c, 'update-nickname', { nickname: 'StillMe' }, 'update-nickname-result');
    ok('the device that changed it stays signed in', mine.ok === true, mine);
    const e = await ready(connect());
    ok('the old token no longer resumes', (await ask(e, 'resume-session', { token }, 'resume-session-result')).ok === false);
    ok('the new token resumes', (await ask(e, 'resume-session', { token: changed.sessionToken }, 'resume-session-result')).ok === true);

    // --- Password change revokes the account's identity token ----------------
    const accountId = legacy.profileClientId;
    const oldIdentity = legacy.identityToken;
    ok('resume hands back the account profile and its identity token', !!accountId && /^[a-f0-9]{64}$/.test(oldIdentity || ''), legacy);
    const thief = connect();
    await once(thief, 'connect');
    const stolen = await ask(thief, 'register', { clientId: accountId, identityToken: oldIdentity, nickname: 'x' }, 'register-result');
    ok('the identity token from before the change is refused', stolen.ok === false && stolen.reason === 'unverified', stolen);
    const h = await ready(connect());
    const fresh = await ask(h, 'resume-session', { token: changed.sessionToken }, 'resume-session-result');
    ok('signing in again hands out a different identity token', fresh.ok && fresh.identityToken && fresh.identityToken !== oldIdentity, fresh);
    const owner = connect();
    await once(owner, 'connect');
    const back = await ask(owner, 'register', { clientId: accountId, identityToken: fresh.identityToken, nickname: 'x' }, 'register-result');
    ok('and that new token proves the identity', back.ok === true, back);
    owner.close();

    // --- Logout kills the stored token ----------------------------------------
    e.emit('logout', { token: changed.sessionToken });
    await wait(300);
    const f = await ready(connect());
    ok('a logged-out token no longer resumes', (await ask(f, 'resume-session', { token: changed.sessionToken }, 'resume-session-result')).ok === false);

    // --- Login with the new password -----------------------------------------
    const g = await ready(connect());
    const login = await ask(g, 'login', { username: 'sessuser', password: 'second-pass-2' }, 'login-result');
    ok('login with the new password works', login.ok === true, login);
    const oldLogin = await ask(g, 'login', { username: 'sessuser', password: 'first-pass-1' }, 'login-result');
    ok('the old password is refused', oldLogin.ok === false);
  } catch (err) {
    ok('harness', false, err.message);
  } finally {
    socks.forEach((s) => { try { s.close(); } catch (_) { /* closed */ } });
    await stop();
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
    process.exit(failed ? 1 : 0);
  }
})();
