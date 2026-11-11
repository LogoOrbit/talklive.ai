// Receipts on direct messages: sent, then delivered when the recipient's device
// has it, then seen when they open the chat. What the live events announce is
// what a later state-sync (the conversation list) and thread fetch report, and
// the state never goes back to an earlier one.
//
//   node scripts/test-dm-receipts.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 7899 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-receipts-'));

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

function connect(name, { register = true } = {}) {
  const sock = io(BASE, { transports: ['websocket'], forceNew: true });
  rememberToken(sock);
  const clientId = 'c_rcpt_' + name;
  sock.regPayload = { clientId, identityToken: identityTokens[clientId], nickname: name, gender: 'male' };
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
  const listRow = async (sock, otherId) => {
    const sync = await once(sock, 'state-sync', 4000, (s) => (s.friends || []).some((f) => f.clientId === otherId));
    return sync.friends.find((f) => f.clientId === otherId).last;
  };
  const thread = async (sock, otherId, id) => {
    sock.emit('get-friend-chat', { friendClientId: otherId });
    const h = await once(sock, 'friend-chat-history');
    return (h.messages || []).find((m) => m.id === id);
  };
  try {
    await waitUp();
    let a = connect('Alpha');
    let b = connect('Bravo');
    await wait(400);
    const A = 'c_rcpt_Alpha';
    const B = 'c_rcpt_Bravo';

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

    // --- Recipient online: delivered straight away -------------------------
    const liveAck = once(a, 'friend-message-sent', 4000, (m) => m.id === 'live1');
    a.emit('friend-message', { toClientId: B, text: 'hello there', id: 'live1' });
    ok('a message to an online friend is acknowledged as delivered', (await liveAck).delivered === true);

    // --- Recipient offline: sent, not delivered ----------------------------
    b.disconnect();
    await wait(300);
    const sentAck = once(a, 'friend-message-sent', 4000, (m) => m.id === 'm1');
    a.emit('friend-message', { toClientId: B, text: 'are you there', id: 'm1' });
    const ack = await sentAck;
    ok('a message to an offline friend is sent, not delivered', ack.delivered === false, JSON.stringify(ack));
    let msg = await thread(a, B, 'm1');
    ok('the thread says neither delivered nor seen', msg && !msg.delivered && !msg.seen, JSON.stringify(msg));

    // --- Recipient connects: delivered -------------------------------------
    const deliveredEv = once(a, 'friend-message-delivered', 4000, (e) => (e.ids || []).includes('m1'));
    b = connect('Bravo');
    const ev = await deliveredEv.catch(() => null);
    ok('the sender hears it was delivered when the recipient connects', !!ev && ev.toClientId === B, JSON.stringify(ev));
    msg = await thread(a, B, 'm1');
    ok('a thread fetch reports delivered', msg && msg.delivered === true && !msg.seen, JSON.stringify(msg));
    // A fresh connection by the sender (the list is built from state-sync).
    a.disconnect();
    await wait(200);
    a = connect('Alpha');
    let last = await listRow(a, B);
    ok('the list reports delivered, not seen', last && last.mine && last.delivered === true && last.seen === false, JSON.stringify(last));

    // --- Recipient reads: seen ---------------------------------------------
    const seenEv = once(a, 'chat-seen', 4000);
    b.emit('chat-seen', { friendClientId: A });
    ok('the sender hears it was seen', (await seenEv).byClientId === B);
    msg = await thread(a, B, 'm1');
    ok('a thread fetch reports seen (and delivered)', msg && msg.seen === true && msg.delivered === true, JSON.stringify(msg));
    a.disconnect();
    await wait(200);
    a = connect('Alpha');
    last = await listRow(a, B);
    ok('a fresh list still reports seen', last && last.seen === true && last.delivered === true, JSON.stringify(last));

    // --- Never backwards ----------------------------------------------------
    // The recipient reconnecting, and the sender fetching again, must not
    // bring an earlier state back.
    b.disconnect();
    await wait(300);
    b = connect('Bravo');
    await wait(400);
    msg = await thread(a, B, 'm1');
    ok('seen survives the recipient reconnecting', msg && msg.seen === true && msg.delivered === true, JSON.stringify(msg));
    a.emit('friend-message', { toClientId: B, text: 'a second one', id: 'm2' });
    await once(a, 'friend-message-sent', 4000, (m) => m.id === 'm2');
    msg = await thread(a, B, 'm1');
    ok('an older message stays seen when a newer one is sent', msg && msg.seen === true, JSON.stringify(msg));
    const newer = await thread(a, B, 'm2');
    ok('the newer message starts at delivered, not seen', newer && newer.delivered === true && !newer.seen, JSON.stringify(newer));

    // --- Read receipts off: delivered, never seen ---------------------------
    // (the viewer simply does not send chat-seen)
    a.emit('friend-message', { toClientId: B, text: 'and a third', id: 'm3' });
    await once(a, 'friend-message-sent', 4000, (m) => m.id === 'm3');
    b.emit('mark-messages-read', { friendClientId: A });
    await wait(300);
    msg = await thread(a, B, 'm3');
    ok('clearing the badge alone does not mark seen', msg && msg.delivered === true && !msg.seen, JSON.stringify(msg));

    [a, b].forEach((s) => s.disconnect());
  } catch (e) {
    console.error(e);
    failed++;
  }
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
  done(failed ? 1 : 0);
})();
