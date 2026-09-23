// Delivery guarantees for direct messages:
//  - a message sent before the socket has (re)registered is held and delivered
//    once it does, instead of being silently dropped;
//  - a resend of a stored message is acknowledged with the stored copy;
//  - every refusal names the message it refuses.
//
//   node scripts/test-social-delivery.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 6199 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-delivery-'));

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

function connect(name, { register = true } = {}) {
  const sock = io(BASE, { transports: ['websocket'], forceNew: true });
  sock.regPayload = { clientId: 'c_deliv_' + name, nickname: name, gender: 'male' };
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
  try {
    await waitUp();
    const a = connect('Alpha');
    const b = connect('Bravo');
    await wait(400);
    const A = 'c_deliv_Alpha';
    const B = 'c_deliv_Bravo';

    // Meet, so the two may message each other.
    const matched = Promise.all([once(a, 'matched'), once(b, 'matched')]);
    a.emit('find-partner', { mode: 'chat' });
    b.emit('find-partner', { mode: 'chat' });
    await matched;
    a.emit('leave'); b.emit('leave');
    await wait(200);

    // --- Sent before register: held, then delivered ----------------------
    a.disconnect();
    await wait(300);
    const a2 = connect('Alpha', { register: false });
    const got = once(b, 'friend-message', 4000, (m) => m.id === 'early1');
    const acked = once(a2, 'friend-message-sent', 4000, (m) => m.id === 'early1');
    a2.emit('friend-message', { toClientId: B, text: 'typed while offline', id: 'early1' });
    await wait(300);
    a2.emit('register', a2.regPayload);
    ok('a message sent before register is delivered', await got.then(() => true, () => false));
    ok('and acknowledged to the sender', await acked.then(() => true, () => false));

    // --- A resend is acknowledged with the stored copy --------------------
    const reAck = once(a2, 'friend-message-sent', 2000, (m) => m.id === 'early1');
    const reDelivered = arrives(b, 'friend-message', 700, (m) => m.id === 'early1');
    a2.emit('friend-message', { toClientId: B, text: 'typed while offline', id: 'early1' });
    ok('a resend is acknowledged', await reAck.then(() => true, () => false));
    ok('a resend is not delivered twice', !(await reDelivered));
    b.emit('get-friend-chat', { friendClientId: A });
    const hist = await once(b, 'friend-chat-history');
    ok('the thread holds it once', (hist.messages || []).filter((m) => m.id === 'early1').length === 1);

    // --- Refusals name the message ----------------------------------------
    const linkRefusal = once(a2, 'chat-blocked', 2000);
    a2.emit('friend-message', { toClientId: B, text: 'see example.com', id: 'link1' });
    const lr = await linkRefusal;
    ok('a refusal names the message', lr.id === 'link1' && lr.toClientId === B && lr.scope === 'friend' && lr.reason === 'link', JSON.stringify(lr));

    const c = connect('Charlie');
    await wait(300);
    const unreach = once(c, 'chat-blocked', 2000);
    c.emit('friend-message', { toClientId: A, text: 'hi', id: 'cold1' });
    const ur = await unreach;
    ok('an unreachable refusal names the message', ur.id === 'cold1' && ur.reason === 'unreachable', JSON.stringify(ur));

    // --- Held events do not outlive a socket that never registers ---------
    const d = connect('Delta', { register: false });
    d.emit('friend-message', { toClientId: B, text: 'never registered', id: 'ghost1' });
    ok('an unregistered socket delivers nothing', !(await arrives(b, 'friend-message', 800, (m) => m.id === 'ghost1')));
    d.disconnect();

    [a2, b, c].forEach((s) => s.disconnect());
  } catch (e) {
    console.error(e);
    failed++;
  }
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
  done(failed ? 1 : 0);
})();
