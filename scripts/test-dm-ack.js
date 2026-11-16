// Device acknowledgement and change catch-up for direct messages.
//  - a client that registers caps:['ack'] is "delivered" only after it sends
//    friend-message-received; one that does not (older apps, cached pages)
//    keeps the old behaviour and is delivered when the socket got it;
//  - an edit or unsend made while a person was away reaches them on reconnect
//    for every thread (get-friend-changes), not only the open one.
//
//   node scripts/test-dm-ack.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 7899 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-dmack-'));

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
const arrives = (sock, ev, ms = 800, pred) => once(sock, ev, ms, pred).then(() => true, () => false);

// The signed identity token each clientId was issued, sent back on every
// later register exactly as a browser does - an identity that owns anything
// is not handed over without it.
const identityTokens = {};
function rememberToken(sock) {
  sock.on('identity-token', ({ clientId, token } = {}) => { identityTokens[clientId] = token; });
}

function connect(name, { register = true, ack = false } = {}) {
  const sock = io(BASE, { transports: ['websocket'], forceNew: true });
  rememberToken(sock);
  const clientId = 'c_ack_' + name;
  sock.regPayload = { clientId, identityToken: identityTokens[clientId], nickname: name, gender: 'male', ...(ack ? { caps: ['ack'] } : {}) };
  if (register) sock.emit('register', sock.regPayload);
  return sock;
}

function startServer() {
  return spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', GIPHY_API_KEY: '' },
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
  // The newest message as the conversation list shows it, from a fresh state-sync.
  try {
    await waitUp();
    let a = connect('Alpha', { ack: true });
    let b = connect('Bravo', { ack: true });
    let c = connect('Cleo');
    await wait(500);
    const A = 'c_ack_Alpha';
    const B = 'c_ack_Bravo';
    const C = 'c_ack_Cleo';
    const befriend = async (x, xid, y, yid) => {
      const m = Promise.all([once(x, 'matched'), once(y, 'matched')]);
      x.emit('find-partner', { mode: 'chat' });
      y.emit('find-partner', { mode: 'chat' });
      await m;
      x.emit('leave'); y.emit('leave');
      await wait(200);
      x.emit('friend-request', { targetClientId: yid });
      await once(x, 'friend-request-result');
      y.emit('friend-request', { targetClientId: xid });
      await once(y, 'friend-request-result');
    };
    await befriend(a, A, b, B);
    await befriend(a, A, c, C);

    // --- Ack-capable recipient: delivered only after it acks ----------------
    let early = false;
    const onDel = (e) => { if ((e.ids || []).includes('k1')) early = true; };
    a.on('friend-message-delivered', onDel);
    const sent = once(a, 'friend-message-sent', 4000, (m) => m.id === 'k1');
    a.emit('friend-message', { toClientId: B, text: 'hi', id: 'k1' });
    ok('ack device: the send reply says not delivered yet', (await sent).delivered === false);
    await wait(400);
    ok('ack device: no delivered before the ack', !early);
    const del = once(a, 'friend-message-delivered', 4000, (e) => (e.ids || []).includes('k1'));
    b.emit('friend-message-received', { friendClientId: A, ids: ['k1'] });
    ok('ack device: delivered after the ack', (await del).toClientId === B);
    a.off('friend-message-delivered', onDel);
    a.emit('get-friend-chat', { friendClientId: B });
    let h = await once(a, 'friend-chat-history');
    ok('ack device: thread reports delivered', h.messages.find((m) => m.id === 'k1').delivered === true);
    // An ack for someone else's message, or an unknown id, changes nothing.
    b.emit('friend-message-received', { friendClientId: A, ids: ['nope', 5, null] });
    a.emit('friend-message', { toClientId: B, text: 'second', id: 'k2' });
    await once(a, 'friend-message-sent', 4000, (m) => m.id === 'k2');
    a.emit('friend-message-received', { friendClientId: B, ids: ['k2'] });
    await wait(300);
    a.emit('get-friend-chat', { friendClientId: B });
    h = await once(a, 'friend-chat-history');
    ok('ack from the sender side does not deliver', !h.messages.find((m) => m.id === 'k2').delivered);

    // --- Legacy recipient: old behaviour ------------------------------------
    const legacy = once(a, 'friend-message-sent', 4000, (m) => m.id === 'l1');
    a.emit('friend-message', { toClientId: C, text: 'hello legacy', id: 'l1' });
    ok('legacy device: delivered at once, never acks', (await legacy).delivered === true);

    // --- Offline ack-capable recipient: reconnect alone is not delivery -----
    b.disconnect();
    await wait(300);
    a.emit('friend-message', { toClientId: B, text: 'while away', id: 'k3' });
    await once(a, 'friend-message-sent', 4000, (m) => m.id === 'k3');
    let gotDel = false;
    const onDel3 = (e) => { if ((e.ids || []).includes('k3')) gotDel = true; };
    a.on('friend-message-delivered', onDel3);
    b = connect('Bravo', { ack: true });
    await wait(600);
    ok('ack device: connecting is not delivery', !gotDel);
    b.emit('friend-message-received', { friendClientId: A, ids: ['k3'] });
    await wait(400);
    ok('ack device: acking the catch-up delivers it', gotDel);
    a.off('friend-message-delivered', onDel3);

    // --- Edit and unsend while away, for threads that are not open ----------
    c.disconnect();
    c = connect('Cleo');
    const since = (await once(c, 'register-result')).now;
    ok('register-result carries the server time', typeof since === 'number' && since > 0);
    await wait(200);
    c.disconnect();
    b.disconnect();
    await wait(300);
    a.emit('friend-message', { toClientId: C, text: 'typo hre', id: 'e1' });
    a.emit('friend-message', { toClientId: C, text: 'oops wrong chat', id: 'd1' });
    a.emit('friend-message', { toClientId: B, text: 'also typo', id: 'e2' });
    await wait(400);
    a.emit('friend-message-edit', { toClientId: C, id: 'e1', text: 'typo here' });
    a.emit('friend-message-delete', { toClientId: C, id: 'd1' });
    a.emit('friend-message-edit', { toClientId: B, id: 'e2', text: 'also fixed' });
    await wait(500);
    c = connect('Cleo', { register: false });
    const changes = once(c, 'friend-changes');
    c.emit('register', c.regPayload);
    await once(c, 'register-result');
    c.emit('get-friend-changes', { since });
    const got = await changes;
    const byId = Object.fromEntries(got.changes.map((x) => [x.id, x]));
    ok('away: the edit arrives', byId.e1 && byId.e1.type === 'edited' && byId.e1.text === 'typo here' && byId.e1.friendClientId === A, JSON.stringify(got));
    ok('away: the unsend arrives', byId.d1 && byId.d1.type === 'deleted' && byId.d1.friendClientId === A, JSON.stringify(got));
    ok('away: other people\'s threads are not leaked', !byId.e2);
    ok('away: a reply carries a new cursor', got.ts >= since);
    c.emit('get-friend-changes', { since: got.ts });
    ok('away: nothing new after the cursor', (await once(c, 'friend-changes')).changes.length === 0);
    b = connect('Bravo', { ack: true });
    await once(b, 'register-result');
    const gb = once(b, 'friend-changes');
    b.emit('get-friend-changes', { since });
    ok('away: the other thread gets its own edit', (await gb).changes.some((x) => x.id === 'e2' && x.text === 'also fixed'));
    c.emit('get-friend-changes', { since: 'x' });
    c.emit('get-friend-changes', {});
    await wait(200);
    done(failed ? 1 : 0);
  } catch (e) {
    console.log('FAIL', e.message);
    done(1);
  }
})();
