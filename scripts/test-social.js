// End-to-end check of the social layer: friend requests (mutual, duplicate,
// persisted across a restart), direct chat with a recent match, blocking, and
// the call-back handshake - including that a call-back nobody asked for can
// not be used to force-pair with someone.
//
//   node scripts/test-social.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 5599 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-social-'));

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

// Resolves true if the event arrives within `ms`, false otherwise.
function arrives(sock, ev, ms = 800) {
  return once(sock, ev, ms).then(() => true, () => false);
}

// Latest state-sync seen per socket.
const lastSync = new WeakMap();

function connect(name) {
  const sock = io(BASE, { transports: ['websocket'], forceNew: true });
  sock.on('state-sync', (s) => lastSync.set(sock, s));
  sock.emit('register', { clientId: 'c_social_' + name, nickname: name, gender: 'male' });
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
}

(async () => {
  let srv = startServer();
  const done = (code) => {
    try { srv.kill('SIGKILL'); } catch (_) { /* gone */ }
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    process.exit(code);
  };

  try {
    await waitUp();
    const a = connect('Alpha');
    const b = connect('Bravo');
    const c = connect('Charlie');
    await wait(400);
    const A = 'c_social_Alpha';
    const B = 'c_social_Bravo';
    const C = 'c_social_Charlie';

    await matchPair(a, b);
    a.emit('leave');
    b.emit('leave');
    await wait(200);

    // --- Direct chat with a recent match (not a friend) -------------------
    a.emit('friend-message', { toClientId: B, text: 'hey from history', id: 'h1' });
    await once(b, 'friend-message');
    b.emit('get-friend-chat', { friendClientId: A });
    const hist = await once(b, 'friend-chat-history');
    ok('history partner can load the stored chat', (hist.messages || []).some((m) => m.id === 'h1'), JSON.stringify(hist));

    // --- Rate limit on direct messages -----------------------------------
    let blockedRate = false;
    a.on('chat-blocked', ({ reason }) => { if (reason === 'rate') blockedRate = true; });
    for (let i = 0; i < 14; i++) a.emit('friend-message', { toClientId: B, text: 'spam ' + i });
    await wait(400);
    ok('message flood is rate limited', blockedRate);

    // --- Duplicate friend requests do not stack --------------------------
    a.emit('friend-request', { targetClientId: B });
    await once(a, 'friend-request-result');
    a.emit('friend-request', { targetClientId: B });
    const dup = await once(a, 'friend-request-result');
    ok('second request reports pending', dup.ok && dup.pending, JSON.stringify(dup));
    await wait(200);
    const reqNotifs = (lastSync.get(b).notifications || []).filter((n) => n.type === 'friend_request' && n.fromClientId === A);
    ok('only one friend_request notification', reqNotifs.length === 1, reqNotifs.length);

    // --- Pending request survives a restart ------------------------------
    a.disconnect(); b.disconnect(); c.disconnect();
    await wait(2600); // store debounce is 2s
    srv.kill('SIGTERM');
    await new Promise((r) => srv.once('exit', r));
    srv = startServer();
    await waitUp();
    const a2 = connect('Alpha');
    const b2 = connect('Bravo');
    const c2 = connect('Charlie');
    await wait(600);
    const bSync = lastSync.get(b2) || {};
    ok('pending request survives restart', (bSync.friendRequests || []).some((r) => r.clientId === A), JSON.stringify(bSync.friendRequests));
    ok('request notification survives restart', (bSync.notifications || []).some((n) => n.type === 'friend_request'));
    ok('sender still sees it as pending', ((lastSync.get(a2) || {}).sentRequests || []).some((r) => r.clientId === B));

    // --- Mutual request becomes a friendship -----------------------------
    b2.emit('friend-request', { targetClientId: A });
    const mutual = await once(b2, 'friend-request-result');
    ok('mutual request auto-accepts', mutual.ok && mutual.accepted, JSON.stringify(mutual));
    await wait(200);
    ok('both sides are friends', (lastSync.get(a2).friends || []).some((f) => f.clientId === B)
      && (lastSync.get(b2).friends || []).some((f) => f.clientId === A));
    ok('request notification cleared', !(lastSync.get(b2).notifications || []).some((n) => n.type === 'friend_request'));

    // --- Forged call-back accept cannot force-pair -----------------------
    const forgedMatch = arrives(a2, 'matched', 800);
    c2.emit('call-back-respond', { fromClientId: A, accept: true });
    ok('unrequested call-back accept is refused', !(await forgedMatch));

    // --- Call-back to a stranger is refused ------------------------------
    c2.emit('call-back-request', { targetClientId: A });
    const strangerCb = await once(c2, 'call-back-request-result');
    ok('call-back to someone you never met is refused', strangerCb.ok === false, JSON.stringify(strangerCb));

    // --- Legit call-back, cancel, then accept ----------------------------
    const ring = once(b2, 'call-back-request');
    a2.emit('call-back-request', { targetClientId: B });
    await ring;
    const cancelled = once(b2, 'call-back-cancelled');
    a2.emit('call-back-cancel', { targetClientId: B });
    await cancelled;
    const staleMatch = arrives(a2, 'matched', 800);
    b2.emit('call-back-respond', { fromClientId: A, accept: true });
    ok('cancelled call-back cannot be accepted', !(await staleMatch));

    const ring2 = once(b2, 'call-back-request');
    a2.emit('call-back-request', { targetClientId: B });
    await ring2;
    const both = Promise.all([once(a2, 'matched'), once(b2, 'matched')]);
    b2.emit('call-back-respond', { fromClientId: A, accept: true });
    const [ma, mb] = await both;
    ok('real call-back pairs both sides', ma.callback && mb.callback);
    a2.emit('leave');
    await wait(200);

    // --- Blocking updates the other side live ---------------------------
    const aResync = once(a2, 'state-sync');
    b2.emit('block-friend', { friendClientId: A });
    const aState = await aResync;
    ok('blocked friend sees the friendship end live', !(aState.friends || []).some((f) => f.clientId === B));
    a2.emit('friend-message', { toClientId: B, text: 'still there?' });
    ok('blocked person cannot message', !(await arrives(b2, 'friend-message', 600)));

    console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
    done(failed ? 1 : 0);
  } catch (err) {
    console.error('\nFAIL (threw):', err.message);
    console.error(srv.logs.join('').slice(-2000));
    done(1);
  }
})();
