// End-to-end checks for the newer social pieces: pinning and muting (and that
// both survive a restart), the quiet window on "<friend> is online", resent
// direct messages being confirmed rather than dropped, refusals naming the
// conversation they belong to, and in-chat voice invites only being
// answerable when one was actually sent.
//
//   node scripts/test-social-extras.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 5999 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-social-x-'));
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
  const clientId = 'c_socx_' + name;
  sock.emit('register', { clientId, identityToken: identityTokens[clientId], nickname: name, gender: 'male' });
  return sock;
}

function startServer() {
  return spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: {
      ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', GIPHY_API_KEY: '',
      FRIEND_ONLINE_QUIET_MS: String(QUIET_MS),
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
  let srv = startServer();
  const done = (code) => {
    try { srv.kill('SIGKILL'); } catch (_) { /* gone */ }
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    process.exit(code);
  };

  try {
    await waitUp();
    const A = 'c_socx_Alpha';
    const B = 'c_socx_Bravo';
    const C = 'c_socx_Charlie';
    const a = connect('Alpha');
    let b = connect('Bravo');
    const c = connect('Charlie');
    await wait(400);

    // --- Voice invites -----------------------------------------------------
    await matchPair(a, b, 'chat');
    const forged = arrives(a, 'voice-invite-accepted', 700);
    b.emit('voice-invite-respond', { accept: true });
    ok('an invite nobody sent cannot be accepted', !(await forged));
    const forgedNo = arrives(a, 'voice-invite-declined', 700);
    b.emit('voice-invite-respond', { accept: false });
    ok('an invite nobody sent cannot be declined either', !(await forgedNo));

    const invited = once(b, 'voice-invite');
    a.emit('voice-invite');
    await invited;
    const accA = once(a, 'voice-invite-accepted');
    const accB = once(b, 'voice-invite-accepted');
    b.emit('voice-invite-respond', { accept: true });
    const [ta, tb] = await Promise.all([accA, accB]);
    ok('a real invite is accepted on both sides', ta.token && ta.token === tb.token);
    const replay = arrives(a, 'voice-invite-accepted', 700);
    b.emit('voice-invite-respond', { accept: true });
    ok('an answered invite cannot be answered twice', !(await replay));

    a.emit('leave');
    b.emit('leave');
    await wait(200);

    // --- Become friends ------------------------------------------------------
    a.emit('friend-request', { targetClientId: B });
    await once(b, 'notification');
    const becameFriends = once(a, 'state-sync');
    b.emit('friend-request-respond', { fromClientId: A, accept: true });
    await becameFriends;
    await wait(150);
    ok('friendship formed', ((lastSync.get(a) || {}).friends || []).some((f) => f.clientId === B));

    // --- Pin -----------------------------------------------------------------
    const pinSync = once(a, 'state-sync');
    a.emit('pin-friend', { friendClientId: B, pinned: true });
    await pinSync;
    ok('a pinned friend comes back pinned', ((lastSync.get(a) || {}).friends || []).find((f) => f.clientId === B).pinned === true);
    ok('pinning is private to the one who pinned',
      !(((lastSync.get(b) || {}).friends || []).find((f) => f.clientId === A) || {}).pinned);
    const strangerPin = arrives(a, 'state-sync', 500);
    a.emit('pin-friend', { friendClientId: C, pinned: true });
    ok('someone who is not a friend cannot be pinned', !(await strangerPin));

    // --- Mute ----------------------------------------------------------------
    const muteSync = once(b, 'state-sync');
    b.emit('mute-chat', { targetClientId: A, muted: true });
    await muteSync;
    ok('a muted chat is listed as muted', ((lastSync.get(b) || {}).muted || []).includes(A));
    const notif = once(b, 'notification');
    a.emit('friend-message', { toClientId: B, text: 'still here?', id: 'mx1' });
    ok('a muted chat still delivers and counts as unread', (await notif).msgId === 'mx1');

    // --- Resends are confirmed, not swallowed ---------------------------------
    await wait(300);
    const resent = once(a, 'friend-message-sent');
    a.emit('friend-message', { toClientId: B, text: 'still here?', id: 'mx1' });
    ok('a resent message is confirmed again', (await resent).id === 'mx1');
    const dupDelivered = arrives(b, 'friend-message', 500);
    ok('...without being delivered twice', !(await dupDelivered));

    // --- Refusals name their conversation -------------------------------------
    await wait(300);
    const refused = once(a, 'chat-blocked');
    a.emit('friend-message', { toClientId: B, text: 'see www.example.com', id: 'mx2' });
    const r = await refused;
    ok('a refused direct message says who it was for', r.reason === 'link' && r.toClientId === B, JSON.stringify(r));

    // --- "<friend> is online" is quiet after a blip ----------------------------
    b.disconnect();
    await wait(300);
    const blipToast = arrives(a, 'friend-online', 700);
    b = connect('Bravo');
    ok('coming back from a blip does not announce again', !(await blipToast));
    await wait(200);
    b.disconnect();
    await wait(QUIET_MS + 300);
    const realToast = arrives(a, 'friend-online', 1500);
    b = connect('Bravo');
    ok('coming back after a real absence is announced', await realToast);
    await wait(300);

    // --- Unmute / restart ------------------------------------------------------
    b.emit('mute-chat', { targetClientId: C, muted: true });
    await wait(300);
    a.close(); b.close(); c.close();
    await wait(1500); // let the debounced store write land
    srv.kill('SIGTERM');
    await new Promise((r) => srv.once('exit', r));
    srv = startServer();
    await waitUp();
    const a2 = connect('Alpha');
    const b2 = connect('Bravo');
    await Promise.all([once(a2, 'state-sync'), once(b2, 'state-sync')]);
    await wait(200);
    ok('pins survive a restart', ((lastSync.get(a2) || {}).friends || []).find((f) => f.clientId === B).pinned === true);
    const mutedAfter = (lastSync.get(b2) || {}).muted || [];
    ok('mutes survive a restart', mutedAfter.includes(A) && mutedAfter.includes(C), JSON.stringify(mutedAfter));
    const unmuteSync = once(b2, 'state-sync');
    b2.emit('mute-chat', { targetClientId: A, muted: false });
    await unmuteSync;
    ok('unmuting takes a chat off the list', !((lastSync.get(b2) || {}).muted || []).includes(A));
    a2.close(); b2.close();

    console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
    done(failed ? 1 : 0);
  } catch (err) {
    console.error(err);
    done(1);
  }
})();
