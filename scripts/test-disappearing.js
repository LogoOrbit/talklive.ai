// Disappearing messages: either friend turns them on, both are told, new
// messages carry an expiry and are gone from the chat once it passes;
// turning it off stops stamping new ones.
//
//   node scripts/test-disappearing.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 5999 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-disappear-'));
const QUIET_MS = 1500;

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
const arrives = (sock, ev, ms = 800) => once(sock, ev, ms).then(() => true, () => false);

const lastSync = new WeakMap();
// The signed identity token each clientId was issued, sent back on every
// later register exactly as a browser does - an identity that owns anything
// is not handed over without it.
const identityTokens = {};
function rememberToken(sock) {
  sock.on('identity-token', ({ clientId, token } = {}) => { identityTokens[clientId] = token; });
}

function connect(name) {
  const sock = io(BASE, { transports: ['websocket'], forceNew: true });
  sock.on('state-sync', (s) => lastSync.set(sock, s));
  rememberToken(sock);
  const clientId = 'c_dis_' + name;
  sock.emit('register', { clientId, identityToken: identityTokens[clientId], nickname: name, gender: 'male' });
  return sock;
}

function startServer() {
  return spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: {
      ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', GIPHY_API_KEY: '',
      FRIEND_ONLINE_QUIET_MS: String(QUIET_MS), DISAPPEAR_MS: '1500',
    },
    stdio: ['ignore', 'ignore', 'ignore'],
  });
}

async function waitUp() {
  for (let i = 0; i < 60; i++) {
    try { await fetch(BASE + '/healthz'); return; } catch (_) { await wait(250); }
  }
  throw new Error('server never came up');
}

async function matchPair(a, b, mode = 'chat') {
  const matched = Promise.all([once(a, 'matched'), once(b, 'matched')]);
  a.emit('find-partner', { mode });
  b.emit('find-partner', { mode });
  await matched;
}

(async () => {
  const srv = startServer();
  const done = (code) => {
    try { srv.kill('SIGKILL'); } catch (_) { /* gone */ }
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    process.exit(code);
  };
  try {
    await waitUp();
    const A = 'c_dis_Alpha';
    const B = 'c_dis_Bravo';
    const a = connect('Alpha');
    const b = connect('Bravo');
    await wait(400);
    await matchPair(a, b, 'chat');
    a.emit('leave');
    b.emit('leave');
    await wait(200);
    a.emit('friend-request', { targetClientId: B });
    await once(b, 'notification');
    const became = once(a, 'state-sync');
    b.emit('friend-request-respond', { fromClientId: A, accept: true });
    await became;
    await wait(150);

    const toldA = once(a, 'chat-disappearing');
    const toldB = once(b, 'chat-disappearing');
    a.emit('chat-disappearing', { friendClientId: B, on: true });
    const [ea, eb] = await Promise.all([toldA, toldB]);
    ok('turner is told it is on, by them', ea.on === true && ea.byMe === true, ea);
    ok('friend is told it is on, by the other', eb.on === true && eb.byMe === false && eb.friendClientId === A, eb);

    const got = once(b, 'friend-message');
    a.emit('friend-message', { toClientId: B, text: 'vanishing hello', id: 'm1' });
    const m = await got;
    ok('new message carries an expiry', Number(m.exp) > Date.now(), m);

    const hist = once(a, 'friend-chat-history');
    a.emit('get-friend-chat', { friendClientId: B });
    const h1 = await hist;
    ok('history says disappearing is on', h1.disappearing && h1.disappearing.on === true, h1.disappearing);
    ok('message is there before expiry', (h1.messages || []).some((x) => x.text === 'vanishing hello'));

    await wait(1800);
    const hist2 = once(a, 'friend-chat-history');
    a.emit('get-friend-chat', { friendClientId: B });
    const h2 = await hist2;
    ok('message is gone after expiry', !(h2.messages || []).some((x) => x.text === 'vanishing hello'), h2.messages);

    const off = once(a, 'chat-disappearing');
    b.emit('chat-disappearing', { friendClientId: A, on: false });
    ok('either friend can turn it off', (await off).on === false);
    const got2 = once(b, 'friend-message');
    a.emit('friend-message', { toClientId: B, text: 'stays', id: 'm2' });
    ok('messages after turning off do not expire', !(await got2).exp);

    done(failed ? 1 : 0);
  } catch (e) {
    console.log('FAIL', e.message);
    done(1);
  }
})();
