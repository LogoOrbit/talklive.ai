// End-to-end check of the match filters around the random fallback.
//
//   1. an avoided country is never matched, not even after the fallback
//   2. a soft filter (here "Speaks") gives way after the fallback
//   3. "Keep my filters" stops the fallback, and 'waiting' says so
//
//   node scripts/test-filters.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 5999 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-filters-'));

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

// Local test sockets have no geo, so everyone's country is 'XX'.
function connect(name, extra) {
  const sock = io(BASE, { transports: ['websocket'], forceNew: true });
  sock.emit('register', Object.assign({ clientId: 'c_filt_' + name, username: name, gender: 'male', lang: 'en' }, extra));
  return sock;
}

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development' },
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

    // 1. Avoided country survives the fallback.
    const a = connect('Avoider', { excludeCountries: ['XX'] });
    const b = connect('Bystander');
    socks.push(a, b);
    await wait(500);
    a.emit('find-partner', { mode: 'talk' });
    await wait(200);
    b.emit('find-partner', { mode: 'talk' });
    const avoidedMatch = await maybe(a, 'matched', 13000);
    ok('an avoided country is never matched, even past the fallback', avoidedMatch === null);
    a.close(); b.close();
    await wait(500);

    // 2. "Speaks" relaxes after the fallback.
    const c = connect('French', { prefLang: 'fr' });
    const d = connect('English');
    socks.push(c, d);
    await wait(500);
    const firstWait = once(c, 'waiting');
    c.emit('find-partner', { mode: 'talk' });
    const w = await firstWait;
    ok('waiting carries the fallback countdown', typeof w.fallbackInSeconds === 'number' && w.fallbackInSeconds > 0, w);
    d.emit('find-partner', { mode: 'talk' });
    const early = await maybe(c, 'matched', 3000);
    ok('a language filter holds before the fallback', early === null);
    const late = await maybe(c, 'matched', 12000);
    ok('a language filter gives way after the fallback', !!late);
    ok('the partner profile carries its language', late && late.partner && late.partner.lang === 'en', late && late.partner);
    c.close(); d.close();
    await wait(500);

    // 3. Keep my filters.
    const e = connect('Keeper', { prefLang: 'fr' });
    const f = connect('Other');
    socks.push(e, f);
    await wait(500);
    e.emit('find-partner', { mode: 'talk' });
    await wait(300);
    const kept = once(e, 'waiting');
    e.emit('keep-filters');
    const kw = await kept;
    ok('keep-filters stops the countdown', kw.fallbackInSeconds === null && kw.keepingFilters === true, kw);
    f.emit('find-partner', { mode: 'talk' });
    const keptMatch = await maybe(e, 'matched', 13000);
    ok('kept filters are not dropped by the fallback', keptMatch === null);

    // Country counts answer with an object.
    const counts = await new Promise((r) => f.emit('country-counts', r));
    ok('country-counts answers', counts && typeof counts === 'object');
  } catch (err) {
    console.error(err);
    failed++;
  }
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
  done(failed ? 1 : 0);
})();
