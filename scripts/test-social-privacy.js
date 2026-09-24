// End-to-end check that privacy switches and identities hold:
// - "appear offline" leaves no last-seen behind, even across a restart
// - "no incoming calls" still refuses call-backs while the person is away,
//   across a restart
// - a clientId alone (every match is sent the partner's) cannot be used to
//   register as someone and read their friends and messages
//
//   node scripts/test-social-privacy.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 6200 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-privacy-'));

let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : extra);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function once(sock, ev, ms = 4000) {
  return new Promise((res, rej) => {
    const timer = setTimeout(() => { sock.off(ev, on); rej(new Error('timeout waiting for ' + ev)); }, ms);
    function on(data) { clearTimeout(timer); sock.off(ev, on); res(data); }
    sock.on(ev, on);
  });
}

const lastSync = new WeakMap();
const sync = (s) => lastSync.get(s) || {};
// Tokens are remembered and sent back, as a browser does.
const identityTokens = {};

function connect(name) {
  const sock = io(BASE, { transports: ['websocket'], forceNew: true });
  sock.on('state-sync', (s) => lastSync.set(sock, s));
  sock.on('identity-token', ({ clientId, token } = {}) => { identityTokens[clientId] = token; });
  const clientId = 'c_priv_' + name;
  sock.emit('register', { clientId, identityToken: identityTokens[clientId], nickname: name, gender: 'male' });
  return sock;
}

function startServer() {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', GIPHY_API_KEY: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  srv.logs = [];
  srv.stdout.on('data', (d) => srv.logs.push(String(d)));
  srv.stderr.on('data', (d) => srv.logs.push(String(d)));
  return srv;
}

async function waitUp() {
  for (let i = 0; i < 60; i++) {
    try { await fetch(BASE + '/healthz'); return; } catch (_) { await wait(250); }
  }
  throw new Error('server never came up');
}

async function matchPair(a, b) {
  const matched = Promise.all([once(a, 'matched'), once(b, 'matched')]);
  a.emit('find-partner', { mode: 'chat' });
  b.emit('find-partner', { mode: 'chat' });
  await matched;
  a.emit('leave');
  b.emit('leave');
  await wait(150);
}

const A = 'c_priv_Alpha';
const B = 'c_priv_Bravo';
const D = 'c_priv_Delta';

(async () => {
  let srv = startServer();
  const done = (code) => {
    try { srv.kill('SIGKILL'); } catch (_) { /* gone */ }
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    process.exit(code);
  };

  try {
    await waitUp();
    let a = connect('Alpha');
    const b = connect('Bravo');
    const d = connect('Delta');
    await wait(400);
    await matchPair(a, b);
    await matchPair(a, d);
    a.emit('friend-message', { toClientId: B, text: 'private words', id: 'p1' });
    await once(b, 'friend-message');

    // --- Appear offline, no incoming calls --------------------------------
    d.emit('set-status-visibility', { hidden: true });
    d.emit('set-call-availability', { accept: false });
    await wait(200);
    d.disconnect();
    await wait(300);
    const dRow = (sync(a).chatHistory || []).find((h) => h.clientId === D) || {};
    ok('hidden user leaves no last seen', dRow.online === false && !dRow.lastSeen, JSON.stringify(dRow));

    // --- Across a restart ---------------------------------------------------
    a.disconnect(); b.disconnect();
    await wait(2600); // store debounce is 2s
    srv.kill('SIGTERM');
    await new Promise((r) => srv.once('exit', r));
    srv = startServer();
    await waitUp();
    a = connect('Alpha');
    await wait(700);
    const dAfter = (sync(a).chatHistory || []).find((h) => h.clientId === D) || {};
    ok('hidden user still has no last seen after a restart', dAfter.online === false && !dAfter.lastSeen, JSON.stringify(dAfter));
    a.emit('call-back-request-later', { targetClientId: D });
    const later = await once(a, 'call-back-later-result');
    ok('calls-off holds while away, across a restart', later.ok === false && later.reason === 'calls-off', JSON.stringify(later));
    a.disconnect();
    await wait(300);

    // --- A clientId alone does not open someone's account -----------------
    const thief = io(BASE, { transports: ['websocket'], forceNew: true });
    let stolen = null;
    thief.on('state-sync', (x) => { stolen = x; });
    thief.emit('register', { clientId: A, nickname: 'Mallory' });
    const refused = await once(thief, 'register-result');
    ok('an owned identity is refused without its token', refused.ok === false && refused.reason === 'unverified', JSON.stringify(refused));
    thief.emit('get-friend-chat', { friendClientId: B });
    await wait(300);
    ok('and nothing of theirs is sent', !stolen);
    thief.disconnect();
    const fresh = io(BASE, { transports: ['websocket'], forceNew: true });
    fresh.emit('register', { clientId: 'c_priv_never_used_1', nickname: 'New' });
    ok('a never-used identity needs no token', (await once(fresh, 'register-result')).ok === true);
    fresh.disconnect();
    const owner = connect('Alpha');
    ok('the real owner, with the token, still gets in', (await once(owner, 'register-result')).ok === true);
    owner.disconnect();

    console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
    done(failed ? 1 : 0);
  } catch (err) {
    console.error('\nFAIL (threw):', err.message);
    console.error(srv.logs.join('').slice(-2000));
    done(1);
  }
})();
