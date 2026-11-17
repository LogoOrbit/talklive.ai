// Bot check: with Turnstile keys set, a guest cannot search until the server
// has verified a token; a valid token unlocks it, a bad one does not.
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');
const PORT = 5700 + Math.floor(Math.random() * 200), FAKE = PORT + 300;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-test-'));
let failed = 0;
const ok = (n, c, x) => { if (!c) failed++; console.log(c ? 'PASS' : 'FAIL', n, c || x === undefined ? '' : x); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const once = (s, ev, ms = 3000) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout ' + ev)), ms); s.once(ev, (d) => { clearTimeout(t); res(d); }); });
(async () => {
  const fake = http.createServer((req, res) => { let b = ''; req.on('data', (d) => { b += d; }); req.on('end', () => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ success: /response=good/.test(b) })); }); }).listen(FAKE);
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, DATABASE_URL: '', NODE_ENV: 'development', TURNSTILE_SITE_KEY: 'site', TURNSTILE_SECRET: 'secret', TURNSTILE_VERIFY_URL: `http://127.0.0.1:${FAKE}/` },
    stdio: 'ignore',
  });
  const done = (c) => { srv.kill('SIGKILL'); fake.close(); fs.rmSync(DATA_DIR, { recursive: true, force: true }); process.exit(c); };
  try {
    for (let i = 0; i < 40; i++) { try { await fetch(`http://127.0.0.1:${PORT}/healthz`); break; } catch (_) { await wait(250); } }
    const cfg = await (await fetch(`http://127.0.0.1:${PORT}/config.js`)).text();
    ok('config.js publishes the site key', /TURNSTILE_SITE_KEY = "site"/.test(cfg));
    const s = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'], forceNew: true });
    s.emit('register', { clientId: 'c_cap1', username: 'Cap', gender: 'male', country: 'US', countryName: 'United States' });
    await wait(500);
    let need = once(s, 'captcha-required'); s.emit('find-partner', { mode: 'chat' });
    await need; ok('a guest is asked before searching', true);
    let bad = once(s, 'captcha-failed'); s.emit('captcha-token', 'bad');
    await bad; ok('a bad token is refused', true);
    need = once(s, 'captcha-required'); s.emit('find-partner', { mode: 'chat' });
    await need; ok('still asked after a bad token', true);
    const good = once(s, 'captcha-ok'); s.emit('captcha-token', 'good');
    await good; ok('a good token is accepted', true);
    let asked = false; s.once('captcha-required', () => { asked = true; });
    s.emit('find-partner', { mode: 'chat' }); await wait(600);
    ok('no longer asked once passed', !asked);
    s.close();
  } catch (e) { failed++; console.log('FAIL', e.message); }
  console.log(failed ? `\n${failed} failed` : '\nall passed'); done(failed ? 1 : 0);
})();
