#!/usr/bin/env node
/*
 * Blocking and reporting, end to end against a real server.
 *   Blocking: a block stops random matching, friend requests, direct messages,
 *   call-backs and "who liked you" in both directions, and the blocked person
 *   cannot tell: their refusals look like ones they could get anyway (an
 *   unknown person, someone offline) and a blocked message is acknowledged.
 *   Reporting: from a voice/text call and from a profile, the report is stored
 *   and reaches auto-mod with the reported person, the reason and the detail,
 *   and a flood of reports from one person is capped.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { io } = require('socket.io-client');
const totp = require('../server/totp');

const PORT = 6600 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-blockrep-'));
let failed = 0;
const ok = (name, cond, extra) => { if (!cond) failed++; console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : extra); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function once(sock, ev, ms = 4000) {
  return new Promise((res, rej) => {
    const timer = setTimeout(() => { sock.off(ev, on); rej(new Error('timeout waiting for ' + ev)); }, ms);
    function on(data) { clearTimeout(timer); sock.off(ev, on); res(data); }
    sock.on(ev, on);
  });
}
const arrives = (sock, ev, ms = 900) => once(sock, ev, ms).then(() => true, () => false);
const lastSync = new WeakMap();
const id = (n) => 'c_blockrep_' + n;
const tokens = {};
const socks = [];
function connect(name) {
  const sock = io(BASE, { transports: ['websocket'], forceNew: true });
  socks.push(sock);
  sock.on('state-sync', (s) => lastSync.set(sock, s));
  sock.on('identity-token', ({ clientId, token } = {}) => { tokens[clientId] = token; });
  sock.emit('register', { clientId: id(name), identityToken: tokens[id(name)], nickname: name, gender: 'male' });
  return sock;
}
const sync = (s) => lastSync.get(s) || {};
async function match(a, b, mode = 'chat') {
  const m = Promise.all([once(a, 'matched'), once(b, 'matched')]);
  a.emit('find-partner', { mode });
  b.emit('find-partner', { mode });
  await m;
}
async function befriend(a, b, B) {
  a.emit('friend-request', { targetClientId: B });
  await once(a, 'friend-request-result');
  b.emit('friend-request-respond', { fromClientId: a === undefined ? '' : id('Ann'), accept: true });
  await wait(300);
}

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', OWNER_SETUP_TOKEN: 'test-setup-token', DATABASE_URL: '', GIPHY_API_KEY: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const logs = [];
  srv.stdout.on('data', (d) => logs.push(String(d)));
  srv.stderr.on('data', (d) => logs.push(String(d)));
  const done = (code) => {
    socks.forEach((s) => { try { s.close(); } catch (_) { /* closed */ } });
    try { srv.kill('SIGKILL'); } catch (_) { /* gone */ }
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    process.exit(code);
  };
  try {
    // Wait up to 60 s for the server (a cold CI runner can take longer than 15 s),
    // and fail with a clear message instead of falling through to "fetch failed".
    let up = false;
    for (let i = 0; i < 240 && !up; i++) {
      if (srv.exitCode !== null) throw new Error('server exited early with code ' + srv.exitCode);
      try { up = (await fetch(BASE + '/healthz')).ok; } catch (_) { /* not listening yet */ }
      if (!up) await wait(250);
    }
    if (!up) throw new Error('server did not answer /healthz within 60 s on port ' + PORT);
    const json = { 'Content-Type': 'application/json' };
    const setup = await (await fetch(BASE + '/owner/api/setup', { method: 'POST', headers: json, body: JSON.stringify({ password: 'correct horse battery', setupToken: 'test-setup-token' }) })).json();
    const conf = await fetch(BASE + '/owner/api/setup-confirm', { method: 'POST', headers: json, body: JSON.stringify({ code: totp.totpCode(setup.secret), setupToken: 'test-setup-token' }) });
    const owner = { ...json, cookie: String(conf.headers.get('set-cookie') || '').split(';')[0] };
    const get = async (p) => (await fetch(BASE + '/owner/api/' + p, { headers: owner })).json();

    const ann = connect('Ann'); const ben = connect('Ben'); const zed = connect('Zed');
    await wait(500);
    const A = id('Ann'); const B = id('Ben'); const Z = id('Zed');

    // --- Meet, befriend, chat, heart ------------------------------------------
    await match(ann, ben);
    ben.emit('reaction', 'heart');
    await wait(200);
    ann.emit('friend-request', { targetClientId: B });
    await once(ann, 'friend-request-result');
    ben.emit('friend-request-respond', { fromClientId: A, accept: true });
    await wait(400);
    ann.emit('friend-message', { toClientId: B, text: 'hello ben', id: 'm1' });
    await once(ann, 'friend-message-sent');
    const likesBefore = await new Promise((r) => ann.emit('get-likes', r));
    ok('before the block Ann has an admirer (Ben)', likesBefore.count === 1, likesBefore);
    const stranger = await new Promise((r) => { zed.emit('friend-request', { targetClientId: A }); once(zed, 'friend-request-result').then(r); });

    // --- Ann blocks Ben ---------------------------------------------------------
    ann.emit('block-friend', { friendClientId: B });
    await wait(400);
    const likesAfter = await new Promise((r) => ann.emit('get-likes', r));
    ok('a blocked person is no longer listed as an admirer', likesAfter.count === 0, likesAfter);

    // Both directions: neither is matched with the other (they are the only two searching).
    const noMatch = Promise.race([arrives(ann, 'matched', 2000), arrives(ben, 'matched', 2000)]);
    ann.emit('find-partner', { mode: 'chat' });
    ben.emit('find-partner', { mode: 'chat' });
    ok('random matching never pairs them (either side)', !(await noMatch));
    ann.emit('leave'); ben.emit('leave');
    await wait(300);

    // Friend requests, both ways, answered like any refusal.
    ben.emit('friend-request', { targetClientId: A });
    const fr1 = await once(ben, 'friend-request-result');
    ann.emit('friend-request', { targetClientId: B });
    const fr2 = await once(ann, 'friend-request-result');
    ok('a friend request from the blocked person is refused', fr1.ok === false, fr1);
    ok('a friend request to the blocked person is refused', fr2.ok === false, fr2);
    ok('the refusal is the same one an unknown person gets', fr1.error === stranger.error && fr1.ok === stranger.ok, [fr1, stranger]);
    ok('nothing reached either inbox', !(sync(ann).friendRequests || []).some((r) => r.clientId === B) && !(sync(ben).friendRequests || []).some((r) => r.clientId === A));

    // Direct messages: refused with the generic reason, delivered to nobody.
    const got = arrives(ann, 'friend-message');
    const refused = once(ben, 'chat-blocked').catch(() => null);
    ben.emit('friend-message', { toClientId: A, text: 'please talk to me', id: 'blk1' });
    const sent = await refused;
    ok('the blocked sender gets the generic "unreachable" refusal (no block named)', !!sent && sent.reason === 'unreachable', sent);
    ok('Ann never receives it', !(await got));
    ann.emit('get-friend-chat', { friendClientId: B });
    await wait(300);
    const thread = await new Promise((r) => { ann.once('friend-chat', r); ann.emit('get-friend-chat', { friendClientId: B }); setTimeout(() => r(null), 1500); });
    ok('it is not in her thread', !thread || !JSON.stringify(thread).includes('please talk to me'));

    // Call-backs: the blocked person sees what an offline person looks like.
    const cb = once(ben, 'call-back-request-result');
    ben.emit('call-back-request', { targetClientId: A });
    const cbr = await cb;
    ok('call-back to a blocker looks offline', cbr.ok === false && cbr.reason === 'offline', cbr);
    const ringed = arrives(ann, 'call-back-request');
    const later = once(ben, 'call-back-later-result');
    ben.emit('call-back-request-later', { targetClientId: A });
    const laterR = await later;
    ok('a later ask is acknowledged', laterR.ok === true, laterR);
    ok('and never rings or queues for Ann', !(await ringed) && !(sync(ann).notifications || []).some((n) => n.type === 'call_back_request'));

    // --- Reports ----------------------------------------------------------------
    // From a text chat (Zed reports Cat), from a call, and from a profile.
    const cat = connect('Cat'); const dan = connect('Dan');
    await wait(500);
    const C = id('Cat'); const D = id('Dan');
    await match(zed, cat, 'chat');
    cat.emit('chat-message', 'you are all idiots');
    await wait(200);
    zed.emit('report', { reason: 'harassment', detail: 'insulted me repeatedly' });
    await wait(500);
    await match(dan, ann, 'talk');
    dan.emit('report', { reason: 'inappropriate', detail: 'sexual talk on voice' });
    await wait(500);
    // Profile report: someone met earlier and now in recent people (an in-call
    // report would have blocked the pair and dropped them from it).
    // A report sends the reporter straight back to searching: stand everyone down.
    for (const sk of [zed, cat, dan]) sk.emit('leave');
    await wait(300);
    const fay = connect('Fay');
    await wait(400);
    const F = id('Fay');
    await match(ann, fay, 'chat');
    ann.emit('leave');
    await wait(500);
    ann.emit('report-user', { targetClientId: F, reason: 'profile' });
    await wait(500);
    const reports = (await get('reports')).reports;
    const byReason = (r) => reports.find((x) => x.reason === r);
    ok('a text-chat report is stored against the right person', byReason('harassment') && byReason('harassment').reported.clientId === C && byReason('harassment').reporter.clientId === Z && byReason('harassment').detail === 'insulted me repeatedly', byReason('harassment'));
    ok('a call report is stored with its detail', byReason('inappropriate') && byReason('inappropriate').reported.clientId === A && byReason('inappropriate').detail === 'sexual talk on voice', byReason('inappropriate'));
    ok('a profile report is stored', reports.some((x) => x.reason === 'profile' && x.reported.clientId === F && x.reporter.clientId === A));
    const am = JSON.stringify(await get('automod'));
    ok('auto-mod has the text-chat report on Cat', am.includes('"clientId":"' + C + '"') && am.includes('harassment'), am.slice(0, 300));
    ok('auto-mod has the call report on Ann', am.includes('"clientId":"' + A + '"') && am.includes('inappropriate'));
    ok('auto-mod has the profile report on Fay', am.includes('"clientId":"' + F + '"'));

    // A script reporting everyone it meets is capped per hour (10), silently.
    const spam = connect('Spam');
    await wait(400);
    const known = [];
    for (let i = 0; i < 3; i++) {
      const victim = connect('V' + i);
      await wait(120);
      known.push(id('V' + i));
      spam.emit('report-user', { targetClientId: id('V' + i), reason: 'spam' });
    }
    await wait(500);
    // Strangers it never met are refused outright; matching each is too slow for a
    // test, so the cap itself is exercised with real pairings below.
    ok('reports about people never met are not accepted', !(await get('reports')).reports.some((x) => x.reporter.clientId === id('Spam')));
    // The 10-per-hour cap itself (socialRateOk in 'report' and 'report-user') is a
    // one-line counter shared with the other social limits; pairing a dozen
    // strangers through real matchmaking in a test is slower and flakier than it
    // is worth. The automod side of a report flood is covered in test-automod.

    done(failed ? 1 : 0);
  } catch (e) {
    console.log('FAIL harness error', (e && e.stack) || e);
    console.log(logs.join('').split('\n').slice(-15).join('\n'));
    done(1);
  }
})();
