// End-to-end check of the Plus gender preference and the honesty of a
// filtered wait. Each case runs against a fresh server so nothing (cooldowns,
// hearts, queues) leaks from one case into the next.
//
//   1. a Plus "women only" search is never matched with a man, not even past
//      the 10s random fallback, and 'waiting' says who it waits for and how
//      many people the filter allows
//   2. the same search matches a woman the moment one searches
//   3. a free account cannot use the gender preference (the server ignores it)
//   4. the preference survives a dropped socket (reconnect + re-search)
//   5. a mutual heart from an earlier call does not override it
//   6. "Undo skip" cannot bring back someone outside it
//   7. a free country filter gives way after the fallback and says so
//      ('random-fallback' carries what was relaxed); a Plus one does not
//   8. counts update while a filtered search waits ('filter-pool')
//
//   node scripts/test-gender-filter.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');
const { io } = require('socket.io-client');

const IDENTITY_SECRET = crypto.randomBytes(32).toString('hex');
const sign = (clientId) => crypto.createHmac('sha256', IDENTITY_SECRET).update(clientId).digest('hex');
const PLUS = ['c_gf_plus', 'c_gf_plus2'];

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
const maybe = (sock, ev, ms) => once(sock, ev, ms).catch(() => null);

async function withServer(fn) {
  const port = 6300 + Math.floor(Math.random() * 600);
  const base = `http://127.0.0.1:${port}`;
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-gender-'));
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, DATABASE_URL: '', NODE_ENV: 'development', PREMIUM_CLIENT_IDS: PLUS.join(','), IDENTITY_SECRET },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let errs = '';
  srv.stderr.on('data', (d) => { errs += d; });
  const socks = [];
  const connect = (clientId, extra = {}) => {
    const sock = io(base, { transports: ['websocket'], forceNew: true });
    const payload = Object.assign({ clientId, username: clientId.slice(5), gender: 'male', lang: 'en' }, extra);
    if (PLUS.includes(clientId)) payload.identityToken = sign(clientId);
    sock.on('connect', () => sock.emit('register', payload));
    socks.push(sock);
    return once(sock, 'register-result').then(() => sock);
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
    if (/TypeError|ReferenceError/.test(errs)) { failed++; console.log('FAIL server error output:\n' + errs.slice(-2000)); }
  }
}

(async () => {
  // 1 + 2 + 8. Plus women-only: never a man, honest wait, a woman matches.
  await withServer(async (connect) => {
    const plus = await connect('c_gf_plus', { prefGender: 'female' });
    const man = await connect('c_gf_man', { gender: 'male' });
    const firstWait = once(plus, 'waiting');
    plus.emit('find-partner', { mode: 'talk' });
    const w = await firstWait;
    ok('waiting names the gender the search is held to', w.gender === 'female', w);
    ok('waiting has no fallback countdown for a gender-only search', w.fallbackInSeconds === null, w);
    ok('waiting reports nobody matching online', w.pool && w.pool.online === 0 && w.pool.searching === 0, w);
    const fellBack = maybe(plus, 'random-fallback', 13000);
    man.emit('find-partner', { mode: 'talk' });
    const wrong = await maybe(plus, 'matched', 13000);
    ok('a Plus women-only search is never matched with a man, even past the fallback', wrong === null, wrong && wrong.partner);
    ok('no "connecting you with anyone" notice for a gender-only search', (await fellBack) === null);

    // 8. A woman comes online (idle): the count goes up while waiting.
    const poolUpdate = maybe(plus, 'filter-pool', 8000);
    const woman = await connect('c_gf_woman', { gender: 'female' });
    const pu = await poolUpdate;
    ok('filter-pool counts a matching person who comes online', pu && pu.online === 1, pu);

    const matched = once(plus, 'matched', 6000);
    woman.emit('find-partner', { mode: 'talk' });
    const m = await matched;
    ok('the women-only search matches a woman', m && m.partner && m.partner.clientId === 'c_gf_woman', m && m.partner);
  });

  // 3. Free accounts cannot filter by gender.
  await withServer(async (connect) => {
    const free = await connect('c_gf_free', { prefGender: 'female' });
    const man = await connect('c_gf_man2', { gender: 'male' });
    const w = once(free, 'waiting');
    free.emit('find-partner', { mode: 'talk' });
    const fw = await w;
    ok('a free search is not held to a gender', fw.gender === null && fw.pool === null, fw);
    const matched = maybe(free, 'matched', 4000);
    man.emit('find-partner', { mode: 'talk' });
    ok('a free gender preference is ignored by the server', !!(await matched));
  });

  // 4. Reconnect: a new socket for the same person keeps the preference.
  await withServer(async (connect) => {
    let plus = await connect('c_gf_plus', { prefGender: 'female' });
    plus.emit('find-partner', { mode: 'talk' });
    await once(plus, 'waiting');
    plus.close();
    await wait(300);
    plus = await connect('c_gf_plus', { prefGender: 'female' });
    const w = once(plus, 'waiting');
    plus.emit('find-partner', { mode: 'talk' });
    ok('a reconnected search is still held to the gender', (await w).gender === 'female');
    const man = await connect('c_gf_man3', { gender: 'male' });
    man.emit('find-partner', { mode: 'talk' });
    ok('a reconnected women-only search is not matched with a man past the fallback', (await maybe(plus, 'matched', 12000)) === null);
  });

  // 5. A mutual heart does not override a gender preference set afterwards.
  await withServer(async (connect) => {
    let plus = await connect('c_gf_plus');
    const man = await connect('c_gf_man4', { gender: 'male' });
    plus.emit('find-partner', { mode: 'talk' });
    await once(plus, 'waiting');
    const both = Promise.all([once(plus, 'matched'), once(man, 'matched')]);
    man.emit('find-partner', { mode: 'talk' });
    await both;
    plus.emit('reaction', 'heart');
    man.emit('reaction', 'heart');
    await wait(400);
    plus.emit('leave');
    await wait(300);
    // Save "women only" (a re-register) and search again; the hearted man searches too.
    plus.emit('register', { clientId: 'c_gf_plus', username: 'plus', gender: 'male', lang: 'en', prefGender: 'female', identityToken: sign('c_gf_plus') });
    await once(plus, 'register-result');
    plus.emit('find-partner', { mode: 'talk' });
    await wait(200);
    man.emit('find-partner', { mode: 'talk' });
    ok('a mutual heart does not override a gender preference', (await maybe(plus, 'matched', 12000)) === null);
  });

  // 6. Undo skip: works as before without a preference, refused outside one.
  await withServer(async (connect) => {
    const plus = await connect('c_gf_plus');
    const man = await connect('c_gf_man5', { gender: 'male' });
    const pair = async () => {
      plus.emit('find-partner', { mode: 'talk' });
      await once(plus, 'waiting');
      const both = Promise.all([once(plus, 'matched'), once(man, 'matched')]);
      man.emit('find-partner', { mode: 'talk' });
      await both;
    };
    await pair();
    const left = once(man, 'partner-left');
    plus.emit('skip');
    await left;
    man.emit('find-partner', { mode: 'talk' });
    await wait(400);
    const undo = await new Promise((r) => plus.emit('undo-skip', r));
    ok('undo skip works without a gender preference (control)', undo && undo.ok === true, undo);
  });
  await withServer(async (connect) => {
    const plus = await connect('c_gf_plus');
    const man = await connect('c_gf_man6', { gender: 'male' });
    plus.emit('find-partner', { mode: 'talk' });
    await once(plus, 'waiting');
    const both = Promise.all([once(plus, 'matched'), once(man, 'matched')]);
    man.emit('find-partner', { mode: 'talk' });
    await both;
    const left2 = once(man, 'partner-left');
    plus.emit('skip');
    await left2;
    man.emit('find-partner', { mode: 'talk' });
    plus.emit('register', { clientId: 'c_gf_plus', username: 'plus', gender: 'male', lang: 'en', prefGender: 'female', identityToken: sign('c_gf_plus') });
    await once(plus, 'register-result');
    const undo2 = await new Promise((r) => plus.emit('undo-skip', r));
    ok('undo skip cannot bring back someone outside the gender preference', undo2 && undo2.ok === false, undo2);
  });

  // 7. Countries: free gives way (announced), Plus is kept.
  await withServer(async (connect) => {
    const free = await connect('c_gf_free2', { includeCountries: ['JP'] });
    const other = await connect('c_gf_other', { gender: 'female' });
    const w = once(free, 'waiting');
    free.emit('find-partner', { mode: 'talk' });
    const fw = await w;
    ok('a free country filter shows the countdown', typeof fw.fallbackInSeconds === 'number' && fw.fallbackInSeconds > 0, fw);
    const fb = maybe(free, 'random-fallback', 13000);
    other.emit('find-partner', { mode: 'talk' });
    const fbData = await fb;
    ok('the fallback says which filters gave way', fbData && Array.isArray(fbData.relaxed) && fbData.relaxed.includes('countries'), fbData);
    ok('a free country filter gives way after the fallback', !!(await maybe(free, 'matched', 6000)));
  });
  await withServer(async (connect) => {
    const plus = await connect('c_gf_plus2', { includeCountries: ['JP'] });
    const other = await connect('c_gf_other2', { gender: 'female' });
    const w = once(plus, 'waiting');
    plus.emit('find-partner', { mode: 'talk' });
    const pw = await w;
    ok('a Plus country filter is kept by default', pw.fallbackInSeconds === null && pw.keepingFilters === true, pw);
    other.emit('find-partner', { mode: 'talk' });
    ok('a Plus country filter is not dropped by the fallback', (await maybe(plus, 'matched', 13000)) === null);
  });

  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
  process.exit(failed ? 1 : 0);
})();
