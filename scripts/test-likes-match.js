// Likes = mutual match (spec section 8): like-partner, like-match (both become
// friends), likes-summary counts, the `likes` push, and Plus-only people list.
//
//   node scripts/test-likes-match.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 7599 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-likes-'));
const SECRET = crypto.randomBytes(32).toString('hex');
const sign = (id) => crypto.createHmac('sha256', SECRET).update(id).digest('hex');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : JSON.stringify(extra));
};
function once(sock, ev, ms = 5000) {
  return new Promise((res, rej) => {
    const t = setTimeout(() => { sock.off(ev, on); rej(new Error('timeout ' + ev)); }, ms);
    function on(d) { clearTimeout(t); sock.off(ev, on); res(d); }
    sock.on(ev, on);
  });
}
const ask = (sock, ev, payload) => new Promise((res) => (payload === undefined ? sock.emit(ev, res) : sock.emit(ev, payload, res)));
function connect(id, name) {
  const s = io(BASE, { transports: ['websocket'], forceNew: true });
  s.on('state-sync', (st) => { s.lastState = st; });
  s.emit('register', { clientId: id, nickname: name, gender: 'male', identityToken: sign(id) });
  return s;
}
// The server sends a fresh state-sync after a match; keep the latest per socket.
const isFriend = async (sock, id) => !!sock.lastState && sock.lastState.friends.some((f) => f.clientId === id);

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', DATABASE_URL: '', IDENTITY_SECRET: SECRET },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  const done = (code) => { try { srv.kill('SIGKILL'); } catch (_) { /* gone */ } fs.rmSync(DATA_DIR, { recursive: true, force: true }); process.exit(code); };
  try {
    for (let i = 0; i < 60; i++) { try { await fetch(BASE + '/healthz'); break; } catch (_) { await wait(250); } }
    const A = 'c_like_aaaa1';
    const B = 'c_like_bbbb2';
    const C = 'c_like_cccc3';
    const a = connect(A, 'Ann');
    const b = connect(B, 'Ben');
    const c = connect(C, 'Cy');
    await wait(400);

    // A stranger is not likeable.
    const stranger = await ask(a, 'like-partner', { clientId: C });
    ok('like-partner refuses someone not met', stranger.ok === false && stranger.reason === 'not-recent', stranger);

    const m = Promise.all([once(a, 'matched'), once(b, 'matched')]);
    a.emit('find-partner', { mode: 'chat' });
    b.emit('find-partner', { mode: 'chat' });
    await m;

    // A likes B: not matched yet; B is told the count changed.
    const bLikes = once(b, 'likes');
    const r1 = await ask(a, 'like-partner', { clientId: B });
    ok('first like is not a match', r1.ok === true && r1.matched === false, r1);
    const push = await bLikes;
    ok('the likes push carries the count', push.count === 1, push);
    const again = await ask(a, 'like-partner', { clientId: B });
    ok('liking twice is idempotent', again.ok === true && again.matched === false, again);
    const sumB = await ask(b, 'likes-summary');
    ok('summary counts the waiting like', sumB.count === 1 && sumB.matches === 0, sumB);
    ok('a non-Plus person gets no people list', Array.isArray(sumB.people) && sumB.people.length === 0, sumB);

    // B likes back: both get like-match and are friends.
    const mA = once(a, 'like-match');
    const mB = once(b, 'like-match');
    const r2 = await ask(b, 'like-partner', { clientId: A });
    ok('the second like matches', r2.ok === true && r2.matched === true, r2);
    const [ma, mb] = await Promise.all([mA, mB]);
    ok('A hears like-match about B', ma.clientId === B && ma.username === 'Ben' && !!ma.avatar && 'badges' in ma && 'cover' in ma, ma);
    ok('B hears like-match about A', mb.clientId === A && mb.username === 'Ann' && !!mb.avatar, mb);
    await wait(200);
    ok('they are friends now (A side)', await isFriend(a, B) === true);
    ok('they are friends now (B side)', await isFriend(b, A) === true);
    const sumA = await ask(a, 'likes-summary');
    const sumB2 = await ask(b, 'likes-summary');
    ok('a matched like no longer counts as waiting', sumA.count === 0 && sumA.matches === 1 && sumB2.count === 0 && sumB2.matches === 1, [sumA, sumB2]);

    // Blocked pairs cannot like.
    a.emit('leave'); b.emit('leave');
    const mc = Promise.all([once(a, 'matched'), once(c, 'matched')]);
    a.emit('find-partner', { mode: 'chat' });
    c.emit('find-partner', { mode: 'chat' });
    await mc;
    a.emit('block-friend', { friendClientId: C });
    await wait(300);
    const blocked = await ask(c, 'like-partner', { clientId: A });
    ok('a blocked pair cannot like', blocked.ok === false, blocked);
  } catch (err) {
    console.error(err);
    failed++;
  }
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
  done(failed ? 1 : 0);
})();
