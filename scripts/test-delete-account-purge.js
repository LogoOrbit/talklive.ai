// Deleting an account must leave nothing of it behind. Real server, real
// sockets: two people sign up, become friends and exchange messages; the
// saved document is then seeded with the other per-profile records a long-lived
// account collects (streak, talk time, push, referral, Plus, ...); one deletes
// their account, and the saved owner-data.json is checked for the clientId, the
// username and the email in every store that keys on them. Reports and bans stay
// (safety records) but must no longer hold the email. An account with a live
// paid subscription keeps its Plus record, stripped of everything else.
//
//   node scripts/test-delete-account-purge.js
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 7600 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-purge-'));
const DATA_FILE = path.join(DATA_DIR, 'owner-data.json');

let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : JSON.stringify(extra));
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

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
const readDoc = () => JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

// Sign-up needs the 6-digit code; without SMTP the server prints it.
async function signup(sock, details) {
  const sent = await ask(sock, 'signup-send-code', { dob: '1990-01-01', ...details }, 'signup-code-result');
  if (!sent.ok) return sent;
  let code = null;
  for (let i = 0; i < 40 && !code; i++) {
    const m = logs.match(new RegExp(`verification code for ${details.email.replace(/[.+]/g, '\\$&')} is (\\d{6})`));
    if (m) code = m[1]; else await wait(50);
  }
  return ask(sock, 'signup', { dob: '1990-01-01', ...details, code }, 'signup-result');
}

// A connected, registered browser that signed up and then took on the
// account's own profile, as the real client does.
async function person(name, email) {
  const sock = connect();
  if (!sock.connected) await once(sock, 'connect');
  const guest = 'purge' + crypto.randomBytes(6).toString('hex');
  await ask(sock, 'register', { clientId: guest, nickname: name }, 'register-result');
  const made = await signup(sock, { username: name, password: 'purge-pass-1', nickname: name, email });
  if (!made.ok) throw new Error('signup failed: ' + JSON.stringify(made));
  const clientId = made.profileClientId;
  sock.emit('register', { clientId, identityToken: made.identityToken, nickname: name });
  await once(sock, 'register-result');
  return { sock, clientId, name };
}

(async () => {
  try {
    await start();
    const A = await person('purgeaaa', 'purge-a@example.com');
    const B = await person('purgebbb', 'purge-b@example.com');

    // Met in a chat, became friends, talked.
    const matched = Promise.all([once(A.sock, 'matched'), once(B.sock, 'matched')]);
    A.sock.emit('find-partner', { mode: 'chat' });
    B.sock.emit('find-partner', { mode: 'chat' });
    await matched;
    A.sock.emit('leave');
    B.sock.emit('leave');
    await wait(200);
    A.sock.emit('friend-request', { targetClientId: B.clientId, message: 'hello there' });
    await once(A.sock, 'friend-request-result');
    B.sock.emit('friend-request-respond', { fromClientId: A.clientId, accept: true });
    await wait(400);
    A.sock.emit('friend-message', { toClientId: B.clientId, text: 'secret one', id: 'm1' });
    await once(B.sock, 'friend-message');
    B.sock.emit('friend-message', { toClientId: A.clientId, text: 'secret two', id: 'm2' });
    await once(A.sock, 'friend-message');
    await wait(500);

    let doc = readDoc();
    const accA = doc.accounts.purgeaaa;
    const accB = doc.accounts.purgebbb;
    ok('both accounts are stored with their profiles', accA && accB && accA.clientId === A.clientId && accB.clientId === B.clientId);
    const pair = [A.clientId, B.clientId].sort().join('|');
    ok('the friendship and its thread are stored', (doc.social.friends[B.clientId] || {})[A.clientId]
      && (doc.social.friendChats[pair] || []).length >= 2, doc.social.friends);

    // --- Seed what a long-lived profile would also have ----------------------
    A.sock.close();
    B.sock.close();
    await stop();
    doc = readDoc();
    const FUTURE = Date.now() + 30 * 864e5;
    const AE = 'purge-a@example.com';
    const BE = 'purge-b@example.com';
    for (const [c, u] of [[A.clientId, 'purgeaaa'], [B.clientId, 'purgebbb']]) {
      doc.engage[c] = { streak: { count: 3 }, goodCalls: 2 };
      doc.talkTime[c] = { username: u, seconds: 400, calls: 3, days: {} };
      doc.msgCounts.users[c] = { u, s: 1, f: 2, t: Date.now() };
      doc.favFilms[c] = [{ t: 'movie', id: '1', title: 'Film' }];
      doc.push[c] = [{ endpoint: 'https://push.example/' + c, keys: {}, createdAt: Date.now(), failures: 0 }];
      doc.notifPrefs[c] = { messages: false };
      doc.accountSettings[u] = { theme: 'dark' };
      doc.accountsRegistry[u] = { username: u, createdAt: Date.now() };
      doc.referrals.codes['CODE' + u.slice(5, 8).toUpperCase()] = c;
      doc.referrals.owners[c] = { code: 'CODE' + u.slice(5, 8).toUpperCase(), joined: 0, verified: 0, rewards: 0 };
      doc.referrals.claims[c] = { code: 'XXXX', owner: 'someone-else', ts: Date.now() };
    }
    doc.likes[A.clientId] = [{ from: B.clientId, username: 'purgebbb', at: Date.now() }];
    doc.likes[B.clientId] = [{ from: A.clientId, username: 'purgeaaa', at: Date.now() }];
    doc.premium[A.clientId] = { activatedAt: 1, updatedAt: 1, expiresAt: FUTURE, source: 'manual', lastEvent: 'manual:grant' };
    doc.premium[B.clientId] = {
      activatedAt: 1, updatedAt: 1, expiresAt: FUTURE, source: 'stripe', subscriptionId: 'sub_keepme', lastEvent: 'x',
      note: 'personal detail', revokedAt: null,
    };
    doc.reports.unshift({ id: 'rep-1', ts: Date.now(), reason: 'spam', detail: 'wrote from ' + AE.toUpperCase(),
      reporter: { clientId: 'someone-else', username: 'x' }, reported: { clientId: A.clientId, username: 'purgeaaa', email: AE } });
    doc.bans.unshift({ id: 'ban-1', clientId: A.clientId, ip: '9.9.9.9', username: 'purgeaaa', reason: 'abuse ' + AE,
      createdAt: Date.now(), expiresAt: FUTURE, liftedAt: null });
    doc.subscribers[AE] = { email: AE, status: 'confirmed' };
    fs.writeFileSync(DATA_FILE, JSON.stringify(doc));

    // --- Delete A ------------------------------------------------------------
    await start();
    const a2 = connect();
    if (!a2.connected) await once(a2, 'connect');
    await ask(a2, 'register', { clientId: 'purge' + crypto.randomBytes(6).toString('hex'), nickname: 'x' }, 'register-result');
    const login = await ask(a2, 'login', { username: 'purgeaaa', password: 'purge-pass-1' }, 'login-result');
    ok('A can sign in before deleting', login.ok === true, login);
    const gone = await ask(a2, 'delete-account', { currentPassword: 'purge-pass-1' }, 'delete-account-result');
    ok('the account is deleted', gone.ok === true, gone);
    await wait(700);
    a2.close();
    await stop();

    // --- Inspect the saved document -------------------------------------------
    doc = readDoc();
    const needles = [A.clientId, 'purgeaaa', AE];
    const holds = (value) => {
      const text = JSON.stringify(value === undefined ? null : value).toLowerCase();
      return needles.filter((n) => text.includes(n.toLowerCase()));
    };
    const stores = {
      accounts: doc.accounts, accountsRegistry: doc.accountsRegistry, accountSettings: doc.accountSettings,
      premium: doc.premium, engage: doc.engage, talkTime: doc.talkTime, 'msgCounts.users': doc.msgCounts.users,
      likes: doc.likes, favFilms: doc.favFilms, push: doc.push, notifPrefs: doc.notifPrefs,
      emailIndex: doc.emailIndex, googleIndex: doc.googleIndex, referrals: doc.referrals, subscribers: doc.subscribers,
      authSessions: doc.authSessions, social: doc.social, contactCapture: doc.contactCapture,
    };
    for (const [name, value] of Object.entries(stores)) {
      ok(`${name} holds nothing of the deleted account`, holds(value).length === 0, holds(value));
    }
    ok('the friend thread with them is gone', !(doc.social.friendChats[pair]));
    ok("B's friends no longer list A", !((doc.social.friends[B.clientId] || {})[A.clientId]));
    ok('B is untouched', doc.accounts.purgebbb && doc.engage[B.clientId] && doc.talkTime[B.clientId]);

    ok('the report is kept', doc.reports.some((r) => r.id === 'rep-1'));
    ok('the ban is kept', doc.bans.some((b) => b.id === 'ban-1'));
    ok('but neither still holds the email', !JSON.stringify(doc.reports).toLowerCase().includes(AE)
      && !JSON.stringify(doc.bans).toLowerCase().includes(AE));

    // --- A paid subscription keeps its record, minus everything else ---------
    await start();
    const b3 = connect();
    if (!b3.connected) await once(b3, 'connect');
    await ask(b3, 'register', { clientId: 'purge' + crypto.randomBytes(6).toString('hex'), nickname: 'y' }, 'register-result');
    await ask(b3, 'login', { username: 'purgebbb', password: 'purge-pass-1' }, 'login-result');
    ok('B deletes too', (await ask(b3, 'delete-account', { currentPassword: 'purge-pass-1' }, 'delete-account-result')).ok === true);
    await wait(700);
    b3.close();
    await stop();
    doc = readDoc();
    const kept = doc.premium[B.clientId];
    ok('a live paid subscription keeps its Plus record', kept && kept.subscriptionId === 'sub_keepme' && kept.expiresAt === FUTURE, kept);
    ok('...without other fields', kept && !('note' in kept), kept);
    ok('B has no account, email, streak or talk time left', !doc.accounts.purgebbb && !doc.emailIndex[BE]
      && !doc.engage[B.clientId] && !doc.talkTime[B.clientId] && !doc.push[B.clientId], doc.emailIndex);
  } catch (err) {
    failed++;
    console.log('FAIL', err.message);
  } finally {
    socks.forEach((s) => { try { s.close(); } catch (_) { /* gone */ } });
    await stop();
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }
  console.log(failed ? `${failed} FAILED` : 'all passed');
  process.exit(failed ? 1 : 0);
})();
