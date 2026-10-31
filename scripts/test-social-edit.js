// End-to-end checks for editing a direct message, and for a call-back being
// cancelled after it was queued for later.
//
//   node scripts/test-social-edit.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 7299 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-social-edit-'));

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
const arrives = (sock, ev, ms = 700) => once(sock, ev, ms).then(() => true, () => false);

const lastSync = new WeakMap();
// A returning clientId has to bring back the identity token it was issued.
const identityTokens = {};
function connect(name) {
  const sock = io(BASE, { transports: ['websocket'], forceNew: true });
  sock.on('state-sync', (s) => lastSync.set(sock, s));
  sock.on('identity-token', ({ clientId, token } = {}) => { identityTokens[clientId] = token; });
  const clientId = 'c_sedit_' + name;
  sock.emit('register', { clientId, identityToken: identityTokens[clientId], nickname: name, gender: 'male' });
  return sock;
}

async function waitUp() {
  for (let i = 0; i < 60; i++) {
    try { await fetch(BASE + '/healthz'); return; } catch (_) { await wait(250); }
  }
  throw new Error('server never came up');
}

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', GIPHY_API_KEY: '' },
    stdio: ['ignore', 'ignore', 'ignore'],
  });
  const done = (code) => {
    try { srv.kill('SIGKILL'); } catch (_) { /* gone */ }
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    process.exit(code);
  };
  try {
    await waitUp();
    const A = 'c_sedit_Alpha';
    const B = 'c_sedit_Bravo';
    const a = connect('Alpha');
    const b = connect('Bravo');
    await wait(400);

    // Meet, then become friends.
    const matched = Promise.all([once(a, 'matched'), once(b, 'matched')]);
    a.emit('find-partner', { mode: 'chat' });
    b.emit('find-partner', { mode: 'chat' });
    await matched;
    a.emit('leave'); b.emit('leave');
    await wait(200);
    a.emit('friend-request', { targetClientId: B });
    await once(b, 'notification');
    b.emit('friend-request-respond', { fromClientId: A, accept: true });
    await wait(300);

    // --- Edit ---------------------------------------------------------------
    const got = once(b, 'friend-message');
    a.emit('friend-message', { toClientId: B, text: 'helo', id: 'me1' });
    await got;
    const editedA = once(a, 'friend-message-edited');
    const editedB = once(b, 'friend-message-edited');
    a.emit('friend-message-edit', { toClientId: B, id: 'me1', text: 'hello' });
    const [ea, eb] = await Promise.all([editedA, editedB]);
    ok('the author sees the edit', ea.text === 'hello' && ea.edited && !ea.refused, JSON.stringify(ea));
    ok('the friend sees the edit', eb.text === 'hello' && eb.chatWith === A, JSON.stringify(eb));
    const hist = once(b, 'friend-chat-history');
    b.emit('get-friend-chat', { friendClientId: A });
    const h = await hist;
    const stored = h.messages.find((m) => m.id === 'me1');
    ok('the edit is stored', stored && stored.text === 'hello' && stored.edited, JSON.stringify(stored));

    const notTheirs = arrives(a, 'friend-message-edited');
    const notTheirsB = arrives(b, 'friend-message-edited');
    b.emit('friend-message-edit', { toClientId: A, id: 'me1', text: 'hacked' });
    ok('only the author can edit', !(await notTheirs) && !(await notTheirsB));

    const linkRefused = once(a, 'friend-message-edited');
    const linkToB = arrives(b, 'friend-message-edited');
    a.emit('friend-message-edit', { toClientId: B, id: 'me1', text: 'see www.example.com' });
    const lr = await linkRefused;
    ok('an edit with a link is refused and the stored text comes back', lr.refused === 'link' && lr.text === 'hello', JSON.stringify(lr));
    ok('a refused edit never reaches the friend', !(await linkToB));

    // --- Call-back cancel after queueing for later ---------------------------
    b.disconnect();
    await wait(300);
    const later = once(a, 'call-back-later-result');
    a.emit('call-back-request-later', { targetClientId: B });
    ok('a call-back is queued for an offline friend', (await later).ok === true);
    a.emit('call-back-cancel', { targetClientId: B });
    await wait(300);
    const b2 = connect('Bravo');
    await wait(800);
    const rows = ((lastSync.get(b2) || {}).notifications || []).filter((n) => n.type === 'call_back_request');
    ok('a cancelled call-back leaves no row in their inbox', rows.length === 0, JSON.stringify(rows));

    a.close(); b2.close();
  } catch (err) {
    console.error(err);
    failed++;
  }
  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  done(failed ? 1 : 0);
})();
