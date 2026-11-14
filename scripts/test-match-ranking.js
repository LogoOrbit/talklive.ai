// How compatible candidates are ranked (server/index.js matchScore and
// newcomerPreference). Each case runs on a fresh server.
//
//   1. a shared language beats Plus priority: a seeker is matched with the
//      free waiter who speaks their language, not the Plus one who does not
//   2. between two equally good waiters, the Plus one is still picked first
//   3. a newcomer is matched with someone who does not habitually skip within
//      seconds, even when the habitual skipper has waited longer
//
//   node scripts/test-match-ranking.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');
const { io } = require('socket.io-client');

const IDENTITY_SECRET = crypto.randomBytes(32).toString('hex');
const sign = (clientId) => crypto.createHmac('sha256', IDENTITY_SECRET).update(clientId).digest('hex');
const PLUS = ['c_rank_plus'];

let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : JSON.stringify(extra));
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function once(sock, ev, ms = 5000) {
  return new Promise((res, rej) => {
    const timer = setTimeout(() => { sock.off(ev, on); rej(new Error('timeout waiting for ' + ev)); }, ms);
    function on(data) { clearTimeout(timer); sock.off(ev, on); res(data === undefined ? true : data); }
    sock.on(ev, on);
  });
}

async function withServer(fn) {
  const port = 7300 + Math.floor(Math.random() * 500);
  const base = `http://127.0.0.1:${port}`;
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-rank-'));
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, DATABASE_URL: '', NODE_ENV: 'development', PREMIUM_CLIENT_IDS: PLUS.join(','), IDENTITY_SECRET },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  const socks = [];
  const connect = async (clientId, extra = {}) => {
    const sock = io(base, { transports: ['websocket'], forceNew: true });
    const payload = Object.assign({ clientId, gender: 'male', lang: 'en' }, extra);
    if (PLUS.includes(clientId)) payload.identityToken = sign(clientId);
    // A re-register on a live identity must carry its token, like a browser.
    sock.on('identity-token', (t) => { if (t && t.token) sock.idToken = t.token; });
    sock.reregister = (extra2) => sock.emit('register', Object.assign({ clientId, identityToken: sock.idToken }, extra2));
    sock.on('connect', () => sock.emit('register', payload));
    socks.push(sock);
    await once(sock, 'register-result');
    return sock;
  };
  try {
    for (let i = 0; i < 60; i++) {
      try { await fetch(base + '/healthz'); break; } catch (_) { await wait(250); }
    }
    await fn(connect);
  } catch (err) {
    console.error(err);
    failed++;
  } finally {
    socks.forEach((s) => { try { s.close(); } catch (_) { /* gone */ } });
    srv.kill('SIGKILL');
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
}

(async () => {
  // 1. Language over Plus. Two women wait; the Plus one only wants men, which
  // keeps the two apart. A man who speaks Urdu searches.
  await withServer(async (connect) => {
    const plus = await connect('c_rank_plus', { gender: 'female', lang: 'en', prefGender: 'male' });
    const urdu = await connect('c_rank_urdu', { gender: 'female', lang: 'ur' });
    plus.emit('find-partner', { mode: 'talk' });
    await once(plus, 'waiting');
    await wait(100);
    urdu.emit('find-partner', { mode: 'talk' });
    const urduWait = await Promise.race([once(urdu, 'waiting'), once(urdu, 'matched').then(() => 'matched')]);
    ok('setup: the two waiters did not match each other', urduWait !== 'matched', urduWait);
    await wait(200);
    const seeker = await connect('c_rank_seeker', { lang: 'ur', gender: 'male' });
    const m = once(seeker, 'matched');
    seeker.emit('find-partner', { mode: 'talk' });
    const got = await m;
    ok('a shared language beats Plus priority', got.partner && got.partner.clientId === 'c_rank_urdu', got.partner && got.partner.clientId);
  });

  // 2. Plus first among equals.
  await withServer(async (connect) => {
    const free = await connect('c_rank_free', { gender: 'female', lang: 'en' });
    const plus = await connect('c_rank_plus', { gender: 'female', lang: 'en', prefGender: 'male' });
    // Women who only want men cannot match each other: the free one is held
    // apart by the Plus one's filter.
    free.emit('find-partner', { mode: 'talk' });
    await once(free, 'waiting');
    await wait(100);
    plus.emit('find-partner', { mode: 'talk' });
    await once(plus, 'waiting');
    await wait(200);
    const seeker = await connect('c_rank_man', { gender: 'male', lang: 'en' });
    const m = once(seeker, 'matched');
    seeker.emit('find-partner', { mode: 'talk' });
    const got = await m;
    ok('between equals, the Plus waiter is picked first', got.partner && got.partner.clientId === 'c_rank_plus', got.partner && got.partner.clientId);
  });

  // 3. Newcomer protection.
  await withServer(async (connect) => {
    // The habitual skipper: matched and ends within a second, three times.
    const skipper = await connect('c_rank_skipper', { gender: 'female' });
    for (let i = 0; i < 3; i++) {
      const other = await connect('c_rank_victim' + i, { gender: 'female' });
      other.emit('find-partner', { mode: 'talk' });
      await once(other, 'waiting');
      const m = once(skipper, 'matched');
      skipper.emit('find-partner', { mode: 'talk' });
      await m;
      await wait(150);
      skipper.emit('leave');
      other.emit('leave');
      other.close();
      await wait(150);
    }
    // Both wait, kept apart by a "speaks" filter they both keep and that the
    // newcomer meets.
    const good = await connect('c_rank_good', { gender: 'female' });
    skipper.reregister({ gender: 'female', lang: 'en', prefLang: 'xx' });
    ok('setup: re-register accepted', (await once(skipper, 'register-result')).ok === true);
    good.reregister({ gender: 'female', lang: 'en', prefLang: 'xx' });
    await once(good, 'register-result');
    skipper.emit('find-partner', { mode: 'talk' });
    await once(skipper, 'waiting');
    skipper.emit('keep-filters');
    await wait(300);
    good.emit('find-partner', { mode: 'talk' });
    await once(good, 'waiting');
    good.emit('keep-filters');
    await wait(200);
    const newcomer = await connect('c_rank_newcomer', { gender: 'male', lang: 'xx' });
    const m = once(newcomer, 'matched');
    newcomer.emit('find-partner', { mode: 'talk' });
    const got = await m;
    ok('a newcomer is matched with someone who does not habitually skip', got.partner && got.partner.clientId === 'c_rank_good', got.partner && got.partner.clientId);
  });

  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
  process.exit(failed ? 1 : 0);
})();
