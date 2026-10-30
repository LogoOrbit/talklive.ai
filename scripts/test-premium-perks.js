// End-to-end check of the engagement and Premium features on the server:
//
//   1. a heart from each side tells both "it's mutual"
//   2. "who liked you" is a count for free users and a list for Premium
//   3. Premium "Undo skip" brings back the person just skipped
//   4. "Undo skip" is refused for free users
//   5. real conversations alone never unlock Premium (there is no free trial)
//
//   node scripts/test-premium-perks.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 6399 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-perks-'));
const IDENTITY_SECRET = crypto.randomBytes(32).toString('hex');
const sign = (clientId) => crypto.createHmac('sha256', IDENTITY_SECRET).update(clientId).digest('hex');

let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : extra);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function once(sock, ev, ms = 5000) {
  return new Promise((res, rej) => {
    const timer = setTimeout(() => { sock.off(ev, on); rej(new Error('timeout waiting for ' + ev)); }, ms);
    function on(data) { clearTimeout(timer); sock.off(ev, on); res(data); }
    sock.on(ev, on);
  });
}
const maybe = (sock, ev, ms) => once(sock, ev, ms).catch(() => null);
const ask = (sock, ev) => new Promise((r) => sock.emit(ev, r));

function connect(name, extra) {
  const clientId = 'c_perk_' + name;
  const sock = io(BASE, { transports: ['websocket'], forceNew: true });
  sock.emit('register', Object.assign({ clientId, username: name, gender: 'male', identityToken: sign(clientId) }, extra));
  return sock;
}

// `queued` is already searching (a skip re-queues), so only `other` asks.
async function pairWithQueued(other, queued) {
  const mo = once(other, 'matched');
  const mq = once(queued, 'matched');
  other.emit('find-partner', { mode: 'talk' });
  return Promise.all([mo, mq]);
}

async function pair(a, b) {
  const ma = once(a, 'matched');
  const mb = once(b, 'matched');
  a.emit('find-partner', { mode: 'talk' });
  await wait(150);
  b.emit('find-partner', { mode: 'talk' });
  return Promise.all([ma, mb]);
}

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: {
      ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', IDENTITY_SECRET,
      PREMIUM_CLIENT_IDS: 'c_perk_Plus', REAL_CONVERSATION_MS: '300',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const socks = [];
  const done = (code) => {
    socks.forEach((s) => { try { s.close(); } catch (_) { /* already closed */ } });
    try { srv.kill('SIGKILL'); } catch (_) { /* already gone */ }
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    process.exit(code);
  };

  try {
    for (let i = 0; i < 40; i++) {
      try { await fetch(BASE + '/healthz'); break; } catch (_) { await wait(250); }
    }

    const plus = connect('Plus');
    const free = connect('Free');
    socks.push(plus, free);
    await wait(500);

    // 1 + 2. Hearts, mutual, who liked you.
    await pair(plus, free);
    const mutualPlus = maybe(plus, 'mutual-heart', 3000);
    const mutualFree = maybe(free, 'mutual-heart', 3000);
    free.emit('reaction', 'heart');
    await wait(200);
    plus.emit('reaction', 'heart');
    const [mp, mf] = await Promise.all([mutualPlus, mutualFree]);
    ok('a heart from each side is mutual for both', !!(mp && mf));
    ok('the mutual notice says who', mp && mp.partner && mp.partner.clientId === 'c_perk_Free', mp);

    const plusLikes = await ask(plus, 'get-likes');
    ok('Premium sees who liked them', plusLikes.list && plusLikes.list[0] && plusLikes.list[0].clientId === 'c_perk_Free', plusLikes);
    const freeLikes = await ask(free, 'get-likes');
    ok('free users see a count, not names', freeLikes.locked === true && freeLikes.count === 1 && !freeLikes.list, freeLikes);

    // Hearted pairs are reunited on sight, so the rest uses people who have not.
    free.close();
    await wait(300);

    // 3. Premium undo skip. The skipped person keeps searching.
    const skippee = connect('Skippee');
    socks.push(skippee);
    await wait(500);
    // Plus is back in the queue after the last call; pair it with Skippee.
    plus.emit('skip');
    await wait(200);
    const [first] = await pairWithQueued(skippee, plus).catch(() => [null]);
    ok('Premium and the next person are paired', !!first);
    await wait(400);
    const skippeeLeft = once(skippee, 'partner-left');
    plus.emit('skip');
    await skippeeLeft;
    skippee.emit('find-partner', { mode: 'talk' });
    await wait(300);
    const back = once(skippee, 'matched');
    const undo = await ask(plus, 'undo-skip');
    ok('Premium can undo a skip', undo && undo.ok === true, undo);
    const backMsg = await back.catch(() => null);
    ok('the skipped person is brought back', backMsg && backMsg.partner.clientId === 'c_perk_Plus' && backMsg.undo === 'them', backMsg);
    ok('the partner profile carries the Premium badge', backMsg && backMsg.partner.premium === true, backMsg && backMsg.partner);

    // 4. Free cannot undo.
    const newbie = connect('Newbie');
    socks.push(newbie);
    await wait(500);
    skippee.close();
    await wait(300);
    plus.emit('skip');
    await wait(200);
    const [nm] = await pairWithQueued(newbie, plus).catch(() => [null]);
    ok('a free user is paired', !!nm);
    const plusLeft = once(plus, 'partner-left');
    newbie.emit('skip');
    await plusLeft;
    const freeUndo = await ask(newbie, 'undo-skip');
    ok('free users cannot undo a skip', freeUndo && freeUndo.ok === false && freeUndo.reason === 'premium', freeUndo);

    // 5. No free trial: several real calls in a row unlock nothing.
    const trialUser = connect('Skippee2');
    socks.push(trialUser);
    await wait(500);
    newbie.close();
    await wait(300);
    const trial = maybe(trialUser, 'trial-started', 4000);
    // Two different people: a voluntary parting keeps a pair apart for a while.
    const buddy = connect('Buddy');
    socks.push(buddy);
    await wait(500);
    for (const other of [plus, buddy]) {
      other.emit('find-partner', { mode: 'talk' });
      await wait(200);
      await pairWithQueued(trialUser, other).catch(() => null);
      await wait(450);
      const left = once(trialUser, 'partner-left');
      other.emit('skip');
      await left.catch(() => null);
      other.emit('leave');
      await wait(300);
    }
    const t = await trial;
    ok('real calls do not start a free trial', !t, t);
    const likesNow = await ask(trialUser, 'get-likes');
    ok('Premium perks stay locked', likesNow && likesNow.locked, likesNow);
  } catch (err) {
    console.error(err);
    failed++;
  }
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
  done(failed ? 1 : 0);
})();
