// Everyone gets a country: when the IP lookup cannot place someone (here a
// loopback address, which no database knows), the browser's time zone does,
// then the region in its language.
//
//   node scripts/test-country-fallback.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

let failed = 0;
const ok = (n, c, x) => { if (!c) failed++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : (x === undefined ? '' : x)); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function once(sock, ev, ms = 4000) {
  return new Promise((res, rej) => {
    const timer = setTimeout(() => { sock.off(ev, on); rej(new Error('timeout waiting for ' + ev)); }, ms);
    function on(data) { clearTimeout(timer); sock.off(ev, on); res(data); }
    sock.on(ev, on);
  });
}

(async () => {
  const PORT = 6500 + Math.floor(Math.random() * 200);
  const BASE = `http://127.0.0.1:${PORT}`;
  const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-country-'));
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development' },
    stdio: 'ignore',
  });
  const socks = [];
  const done = (code) => {
    socks.forEach((s) => s.close());
    try { srv.kill('SIGKILL'); } catch (_) { /* gone */ }
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    process.exit(code);
  };
  async function profileFor(clientId, extra, headers) {
    const sock = io(BASE, { transports: ['websocket'], forceNew: true, extraHeaders: headers || {} });
    socks.push(sock);
    const p = once(sock, 'profile');
    sock.emit('register', { clientId, nickname: clientId.slice(2, 10), gender: 'male', ...extra });
    return p;
  }
  try {
    for (let i = 0; i < 40; i++) {
      try { await fetch(BASE + '/healthz'); break; } catch (_) { await wait(250); }
    }
    const tz = await profileFor('c_countrytz01', { timezone: 'Asia/Calcutta' });
    ok('an unplaceable IP takes its country from the time zone', tz.countryCode === 'IN' && tz.country === 'India', JSON.stringify(tz));
    const lang = await profileFor('c_countrylang1', { timezone: 'Etc/UTC' }, { 'accept-language': 'en-GB,en;q=0.9' });
    ok('then from the browser language region', lang.countryCode === 'GB', JSON.stringify(lang));
    const none = await profileFor('c_countrynone1', {});
    ok('no hint at all still registers', none.countryCode === 'XX', JSON.stringify(none));
    done(failed ? 1 : 0);
  } catch (err) {
    console.error(err);
    done(1);
  }
})();
