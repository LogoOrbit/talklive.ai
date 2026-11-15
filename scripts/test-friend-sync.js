// Direct-message history paging and unread truth:
//  - get-friend-chat with a `limit` returns the newest page and a cursor, and
//    `before` walks back through older ones without gaps or repeats;
//  - a client that sends no limit (cached page, Android 3.9.x) still gets the
//    whole stored thread, as before;
//  - an unread marker whose message is gone (unsent, cleared, expired) stops
//    counting, however it went.
//
//   node scripts/test-friend-sync.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 8299 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-fsync-'));

let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : extra);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function once(sock, ev, ms = 4000, pred = () => true) {
  return new Promise((res, rej) => {
    const timer = setTimeout(() => { sock.off(ev, on); rej(new Error('timeout waiting for ' + ev)); }, ms);
    function on(data) {
      if (!pred(data)) return;
      clearTimeout(timer); sock.off(ev, on); res(data);
    }
    sock.on(ev, on);
  });
}
const identityTokens = {};
function connect(name) {
  const sock = io(BASE, { transports: ['websocket'], forceNew: true });
  sock.on('identity-token', ({ clientId, token } = {}) => { identityTokens[clientId] = token; });
  const clientId = 'c_fsync_' + name;
  sock.regPayload = () => ({ clientId, identityToken: identityTokens[clientId], nickname: name, gender: 'male' });
  sock.emit('register', sock.regPayload());
  return sock;
}
function startServer() {
  return spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', GIPHY_API_KEY: '', DISAPPEAR_MS: '1500' },
    stdio: ['ignore', 'ignore', 'ignore'],
  });
}
async function waitUp() {
  for (let i = 0; i < 60; i++) {
    try { await fetch(BASE + '/healthz'); return; } catch (_) { await wait(250); }
  }
  throw new Error('server never came up');
}

(async () => {
  const srv = startServer();
  const done = (code) => {
    try { srv.kill('SIGKILL'); } catch (_) { /* gone */ }
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    process.exit(code);
  };
  const history = async (sock, otherId, extra = {}) => {
    sock.emit('get-friend-chat', { friendClientId: otherId, ...extra });
    return once(sock, 'friend-chat-history');
  };
  try {
    await waitUp();
    const a = connect('Alpha');
    const b = connect('Bravo');
    await wait(400);
    const A = 'c_fsync_Alpha';
    const B = 'c_fsync_Bravo';
    const matched = Promise.all([once(a, 'matched'), once(b, 'matched')]);
    a.emit('find-partner', { mode: 'chat' });
    b.emit('find-partner', { mode: 'chat' });
    await matched;
    a.emit('leave'); b.emit('leave');
    await wait(200);
    a.emit('friend-request', { targetClientId: B });
    await once(a, 'friend-request-result');
    b.emit('friend-request', { targetClientId: A });
    await once(b, 'friend-request-result');

    // --- Paging --------------------------------------------------------------
    const N = 23;
    for (let i = 1; i <= N; i++) {
      const sent = once(a, 'friend-message-sent', 4000, (m) => m.id === 'p' + i);
      a.emit('friend-message', { toClientId: B, text: 'msg ' + i, id: 'p' + i });
      await sent;
      if (i % 8 === 0) await wait(5200); // the per-person send ceiling is 10 per 5 s
    }
    const full = await history(b, A);
    ok('no limit: the whole thread, as before', (full.messages || []).length === N && full.hasMore === undefined, full.messages && full.messages.length);

    const p1 = await history(b, A, { limit: 10 });
    ok('limit: the newest page', p1.messages.length === 10 && p1.messages[9].id === 'p' + N && p1.messages[0].id === 'p' + (N - 9), p1.messages.map((m) => m.id).join());
    ok('limit: says there is more', p1.hasMore === true);
    const p2 = await history(b, A, { limit: 10, before: p1.messages[0].ts, beforeId: p1.messages[0].id });
    ok('before: the page right behind it', p2.messages.length === 10 && p2.messages[9].id === 'p' + (N - 10), p2.messages.map((m) => m.id).join());
    ok('before: marked as an older page', p2.older === true && p2.hasMore === true);
    const p3 = await history(b, A, { limit: 10, before: p2.messages[0].ts, beforeId: p2.messages[0].id });
    ok('before: the last page is short and ends the walk', p3.messages.length === 3 && p3.messages[0].id === 'p1' && p3.hasMore === false, p3.messages.map((m) => m.id).join());
    const all = p3.messages.concat(p2.messages, p1.messages).map((m) => m.id);
    ok('pages join with no gap or repeat', all.length === N && new Set(all).size === N);
    const junk = await history(b, A, { limit: 'x', before: {} });
    ok('malformed paging fields fall back to the whole thread', junk.messages.length === N);
    const big = await history(b, A, { limit: 100000 });
    ok('an oversized limit is capped, not trusted', big.messages.length === N && big.hasMore === false);

    // --- Unread markers follow the message -----------------------------------
    const syncOf = async (sock) => {
      sock.emit('register', sock.regPayload());
      return once(sock, 'state-sync', 4000);
    };
    const unread = (s, from) => (s.notifications || []).filter((n) => n.type === 'message' && n.fromClientId === from).length;
    let s = await syncOf(b);
    ok('unread counts the unseen messages', unread(s, A) >= 1, unread(s, A));
    b.emit('mark-messages-read', { friendClientId: A });
    await once(b, 'state-sync');

    a.emit('chat-disappearing', { friendClientId: B, on: true });
    await once(b, 'chat-disappearing');
    const live = once(b, 'friend-message', 4000, (m) => m.id === 'gone1');
    a.emit('friend-message', { toClientId: B, text: 'poof', id: 'gone1' });
    await live;
    await wait(300);
    s = await syncOf(b);
    ok('a disappearing message is unread while it exists', unread(s, A) === 1, unread(s, A));
    await wait(1800);
    s = await syncOf(b);
    ok('...and stops counting once it has expired', unread(s, A) === 0, unread(s, A));

    a.emit('chat-disappearing', { friendClientId: B, on: false });
    await once(b, 'chat-disappearing');
    const live2 = once(b, 'friend-message', 4000, (m) => m.id === 'unsent1');
    a.emit('friend-message', { toClientId: B, text: 'oops', id: 'unsent1' });
    await live2;
    a.emit('friend-message-delete', { toClientId: B, id: 'unsent1' });
    await once(b, 'friend-message-deleted');
    s = await syncOf(b);
    ok('an unsent message stops counting', unread(s, A) === 0, unread(s, A));

    const live3 = once(b, 'friend-message', 4000, (m) => m.id === 'clr1');
    a.emit('friend-message', { toClientId: B, text: 'before clear', id: 'clr1' });
    await live3;
    b.emit('clear-friend-chat', { friendClientId: A });
    await once(b, 'friend-chat-history');
    s = await syncOf(b);
    ok('clearing the chat clears its unread', unread(s, A) === 0, unread(s, A));
    done(failed ? 1 : 0);
  } catch (err) {
    console.log('FAIL harness', err.message);
    done(1);
  }
})();
