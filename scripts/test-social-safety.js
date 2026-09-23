// End-to-end checks for the social layer's safety and continuity rules:
//  - a friend request needs a real connection, and a declined one cannot be
//    re-sent into the same inbox (while the sender still just sees "Pending")
//  - unfriending keeps the conversation reachable from recent people
//  - a resent message id is stored once
//  - call-backs never ring or force-pair the text-only /chat page, and a
//    queued ask accepted while its sender is in another call turns around
//    instead of dropping that call
//
//   node scripts/test-social-safety.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 6200 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-social-safety-'));

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
const id = (name) => 'c_safety_' + name;

function connect(name, extra = {}) {
  const sock = io(BASE, { transports: ['websocket'], forceNew: true });
  sock.on('state-sync', (s) => lastSync.set(sock, s));
  sock.emit('register', { clientId: id(name), nickname: name, gender: 'male', ...extra });
  return sock;
}
const sync = (sock) => lastSync.get(sock) || {};

async function matchPair(a, b, mode = 'chat') {
  const matched = Promise.all([once(a, 'matched'), once(b, 'matched')]);
  a.emit('find-partner', { mode });
  b.emit('find-partner', { mode });
  await matched;
}

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', GIPHY_API_KEY: '', CALL_BACK_LIVE_MS: '300' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const logs = [];
  srv.stdout.on('data', (d) => logs.push(String(d)));
  srv.stderr.on('data', (d) => logs.push(String(d)));
  const done = (code) => {
    try { srv.kill('SIGKILL'); } catch (_) { /* gone */ }
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    process.exit(code);
  };

  try {
    for (let i = 0; i < 60; i++) {
      try { await fetch(BASE + '/healthz'); break; } catch (_) { await wait(250); }
    }
    const a = connect('Ann');
    const b = connect('Ben');
    const z = connect('Zed');
    await wait(400);
    const A = id('Ann'); const B = id('Ben');

    // --- A friend request needs a real connection -------------------------
    z.emit('friend-request', { targetClientId: A });
    const cold = await once(z, 'friend-request-result');
    ok('request to someone never met is refused', cold.ok === false, JSON.stringify(cold));
    ok('refused request never reaches the inbox', !(sync(a).friendRequests || []).some((r) => r.clientId === id('Zed')));

    await matchPair(a, b);
    a.emit('leave'); b.emit('leave');
    await wait(200);

    // --- Declined requests are held -------------------------------------
    a.emit('friend-request', { targetClientId: B });
    await once(a, 'friend-request-result');
    await wait(150);
    ok('request after a match is delivered', (sync(b).friendRequests || []).some((r) => r.clientId === A));
    const bDeclined = once(b, 'state-sync');
    b.emit('friend-request-respond', { fromClientId: A, accept: false });
    await bDeclined;
    await wait(100);
    ok('decline empties their inbox', !(sync(b).friendRequests || []).some((r) => r.clientId === A));
    ok('sender still sees "Pending" after a decline', (sync(a).sentRequests || []).some((r) => r.clientId === B));
    ok('the hold marker never reaches the client', (sync(a).sentRequests || []).every((r) => !('held' in r)));

    a.emit('cancel-friend-request', { targetClientId: B });
    await wait(150);
    const reNotif = arrives(b, 'notification', 600);
    a.emit('friend-request', { targetClientId: B });
    const re = await once(a, 'friend-request-result');
    ok('re-asking after a decline looks sent', re.ok && re.sent, JSON.stringify(re));
    ok('re-asking after a decline is not delivered', !(await reNotif) && !(sync(b).friendRequests || []).some((r) => r.clientId === A));

    // The person who declined changes their mind: one tap makes them friends.
    b.emit('friend-request', { targetClientId: A });
    const change = await once(b, 'friend-request-result');
    ok('decliner asking back makes them friends', change.ok && change.accepted, JSON.stringify(change));
    await wait(150);
    ok('both sides are friends', (sync(a).friends || []).some((f) => f.clientId === B)
      && (sync(b).friends || []).some((f) => f.clientId === A));
    ok('no stale "Pending" is left on either side', !(sync(a).sentRequests || []).length && !(sync(b).sentRequests || []).length);

    // --- A resent message id is stored once -----------------------------
    const first = once(b, 'friend-message');
    a.emit('friend-message', { toClientId: B, text: 'hello friend', id: 'dup1' });
    await first;
    const second = arrives(b, 'friend-message', 500);
    a.emit('friend-message', { toClientId: B, text: 'hello friend', id: 'dup1' });
    ok('a resend is not delivered twice', !(await second));
    // Someone else's id must not be reused for a different message.
    const clash = once(a, 'friend-message');
    b.emit('friend-message', { toClientId: A, text: 'different', id: 'dup1' });
    const clashed = await clash;
    ok('an id collision gets a fresh id', clashed.id && clashed.id !== 'dup1', JSON.stringify(clashed));
    b.emit('get-friend-chat', { friendClientId: A });
    const thread = (await once(b, 'friend-chat-history')).messages || [];
    ok('thread holds each message once', thread.filter((m) => m.id === 'dup1').length === 1 && thread.length === 2, JSON.stringify(thread));

    // --- Unfriending keeps the conversation reachable -------------------
    const bUnfriended = once(b, 'state-sync');
    a.emit('remove-friend', { friendClientId: B });
    const bs = await bUnfriended;
    ok('unfriended side loses the friendship', !(bs.friends || []).some((f) => f.clientId === A));
    ok('unfriended side still finds the conversation', (bs.chatHistory || []).some((h) => h.clientId === A && h.last));
    await wait(100);
    ok('remover still finds the conversation', (sync(a).chatHistory || []).some((h) => h.clientId === B && h.username === 'Ben'));

    // --- Unfriending with no conversation, and news rows ----------------
    // Ann and Ben re-friend (they know each other from history), then Ben is
    // told "accepted", looks at it, and Ann unfriends him.
    b.emit('friend-request', { targetClientId: A });
    await once(b, 'friend-request-result');
    const accepted = once(b, 'notification');
    a.emit('friend-request', { targetClientId: B });
    await once(a, 'friend-request-result');
    const acc = await accepted.catch(() => null);
    // Ben asked first, so Ann's tap is the acceptance and Ben hears about it.
    ok('the requester is told the request was accepted', acc && acc.type === 'friend_accepted', JSON.stringify(acc));
    await wait(200);
    b.emit('mark-notifications-seen');
    await wait(250);
    ok('looking at requests marks accepted-news seen', (sync(b).notifications || []).some((n) => n.type === 'friend_accepted' && n.seen), JSON.stringify(sync(b).notifications));
    a.emit('remove-friend', { friendClientId: B });
    await wait(250);
    const bAfter = sync(b);
    ok('unfriending clears the "accepted" row it contradicts', !(bAfter.notifications || []).some((n) => n.type === 'friend_accepted' && n.byClientId === A));
    ok('both stay in recent people', (bAfter.chatHistory || []).some((h) => h.clientId === A));
    b.emit('friend-request', { targetClientId: A });
    const reAdd = await once(b, 'friend-request-result');
    ok('an ex-friend can ask again', reAdd.ok, JSON.stringify(reAdd));
    a.emit('friend-request-respond', { fromClientId: B, accept: true });
    await wait(200);

    // --- Call-backs and the text-only page ------------------------------
    // Ben moves to /chat (same identity, text surface).
    b.disconnect();
    await wait(200);
    const bChat = connect('Ben', { surface: 'chat' });
    await wait(400);
    const noRing = arrives(bChat, 'call-back-request', 600);
    const inbox = once(bChat, 'notification');
    a.emit('call-back-request', { targetClientId: B });
    const away = await once(a, 'call-back-request-result');
    ok('calling someone on /chat reports "away" at once', away.ok === false && away.reason === 'away', JSON.stringify(away));
    const queuedNotif = await inbox;
    ok('the ask waits in their inbox', queuedNotif.type === 'call_back_request' && queuedNotif.fromClientId === A, JSON.stringify(queuedNotif));
    ok('the text page is not rung', !(await noRing));
    // Ben queued an ask to Ann earlier and is now on /chat: Ann accepting must
    // not force-pair a page that cannot take the call.
    bChat.emit('call-back-request-later', { targetClientId: A });
    await once(bChat, 'call-back-later-result');
    const noMatch = arrives(bChat, 'matched', 800);
    a.emit('call-back-respond', { fromClientId: B, accept: true });
    const turned = await once(a, 'call-back-request-result');
    ok('accepting an ask from someone on /chat turns it around', turned.reason === 'busy-queued', JSON.stringify(turned));
    ok('the /chat page is not force-paired', !(await noMatch));
    await wait(100);

    // --- Queued ask accepted while its sender is in another call --------
    bChat.disconnect();
    await wait(200);
    const b2 = connect('Ben');
    const cat = connect('Cat');
    await wait(400);
    b2.emit('call-back-request-later', { targetClientId: A });
    await once(b2, 'call-back-later-result');
    await matchPair(b2, cat, 'talk');
    await wait(400); // past the (test-shortened) "still ringing" window
    const catDropped = arrives(cat, 'partner-left', 800);
    const banner = once(b2, 'call-back-request');
    a.emit('call-back-respond', { fromClientId: B, accept: true });
    const busy = await once(a, 'call-back-request-result');
    ok('a stale ask accepted mid-call turns around', busy.reason === 'busy-queued', JSON.stringify(busy));
    ok('the caller is offered the call instead', (await banner).fromClientId === A);
    ok('their current call is left alone', !(await catDropped));
    // And the turned-around ask is a real one: answering it connects.
    const pair = Promise.all([once(a, 'matched'), once(b2, 'matched')]);
    b2.emit('call-back-respond', { fromClientId: A, accept: true });
    const [ma, mb] = await pair;
    ok('answering the turned-around ask connects', ma.callback && mb.callback);

    console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
    done(failed ? 1 : 0);
  } catch (err) {
    console.error('\nFAIL (threw):', err.message);
    console.error(logs.join('').slice(-2000));
    done(1);
  }
})();
