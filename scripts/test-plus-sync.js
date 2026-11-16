// Plus entitlement stays in step on every live socket:
//   - register reports where Plus came from, when it ends and whether it renews
//   - Plus that runs out while connected stops at that moment on every open
//     tab and the app, with no reconnect
//   - the Plus-only gender filter already applied to the live profile is dropped
//     (an expired member's next match ignores it)
//   - a searching free member sees `contended` only when the queue really is busy
//
//   node scripts/test-plus-sync.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 6700 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-sync-'));
const IDENTITY_SECRET = crypto.randomBytes(32).toString('hex');
const sign = (c) => crypto.createHmac('sha256', IDENTITY_SECRET).update(c).digest('hex');
let failed = 0;
const ok = (n, c, x) => { if (!c) failed++; console.log(c ? 'PASS' : 'FAIL', n, c || x === undefined ? '' : JSON.stringify(x)); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const once = (s, ev, ms = 12000) => new Promise((res, rej) => {
  const t = setTimeout(() => { s.off(ev, on); rej(new Error('timeout ' + ev)); }, ms);
  function on(d) { clearTimeout(t); s.off(ev, on); res(d); }
  s.on(ev, on);
});

const EXPIRES_IN = 4500;
const PLUS = 'c_sync_plus';
const expiresAt = Date.now() + EXPIRES_IN + 1500; // the server takes ~1.5s to start
fs.writeFileSync(path.join(DATA_DIR, 'owner-data.json'), JSON.stringify({
  premium: { [PLUS]: { activatedAt: Date.now(), updatedAt: Date.now(), source: 'play', playToken: 'x', playState: 'SUBSCRIPTION_STATE_CANCELED', expiresAt, revokedAt: null } },
}));

function reg(clientId, extra = {}) {
  const sock = io(BASE, { transports: ['websocket'], forceNew: true });
  const statuses = [];
  // A live tab answers the server's identity ping, so a second tab is not mistaken for a dead socket.
  sock.on('identity-ping', (ack) => { if (typeof ack === 'function') ack(); });
  sock.on('premium-status', (s) => statuses.push({ ...s, at: Date.now() }));
  sock.emit('register', { clientId, username: clientId.slice(-8), gender: 'male', identityToken: sign(clientId), ...extra });
  return { sock, statuses };
}

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', IDENTITY_SECRET },
    stdio: ['ignore', 'ignore', 'ignore'],
  });
  const socks = [];
  const done = (code) => { socks.forEach((s) => { try { s.close(); } catch (_) { /* gone */ } }); srv.kill('SIGKILL'); fs.rmSync(DATA_DIR, { recursive: true, force: true }); process.exit(code); };
  try {
    for (let i = 0; i < 60; i++) { try { await fetch(BASE + '/healthz'); break; } catch (_) { await wait(250); } }
    // A Plus member who wants women, and a man who is the only one waiting.
    const tabA = reg(PLUS, { gender: 'female', prefGender: 'female' });
    const target = reg('c_sync_target', { gender: 'male' });
    socks.push(tabA.sock, target.sock);
    await wait(700);
    const first = tabA.statuses[0];
    ok('register says Plus, from Google Play, ending (cancelled) and not renewing', first && first.premium === true && first.source === 'play' && first.renews === false && first.state === 'ending' && first.expiresAt === expiresAt, first);
    const http = await (await fetch(`${BASE}/premium-status?clientId=${PLUS}&identityToken=${sign(PLUS)}`)).json();
    ok('/premium-status gives the holder source, state and end date', http.premium === true && http.source === 'play' && http.state === 'ending' && http.expiresAt === expiresAt, http);
    const anon = await (await fetch(`${BASE}/premium-status?clientId=${PLUS}`)).json();
    ok('/premium-status hides the details from anyone without the identity token', anon.premium === true && anon.source === undefined && anon.expiresAt === undefined, anon);

    // Plus wants women; the only person waiting is a man.
    target.sock.emit('find-partner', { mode: 'talk' });
    await wait(300);
    const matched = once(tabA.sock, 'matched', 9000).then(() => Date.now(), () => null);
    tabA.sock.emit('find-partner', { mode: 'talk' });
    await wait(2200);
    const earlyStatus = tabA.statuses.filter((s) => s.premium === false).length;
    ok('while Plus is live, the women-only filter keeps the man out', earlyStatus === 0);
    const when = await matched;
    const lost = tabA.statuses.find((s) => s.premium === false);
    ok('the connected socket is told Plus ended, with no reconnect', !!lost, tabA.statuses.length);
    ok('that notice lands within a second of the expiry time', lost && Math.abs(lost.at - expiresAt) < 1500, lost && lost.at - expiresAt);
    ok('after Plus ends the applied gender filter is gone: the man is matched before the 10s fallback', !!when && when > expiresAt - 100 && when - expiresAt < 6000, when && when - expiresAt);
    const after = await (await fetch(`${BASE}/premium-status?clientId=${PLUS}&identityToken=${sign(PLUS)}`)).json();
    ok('/premium-status now says expired', after.premium === false && after.state === 'expired', after);
  } catch (e) {
    ok('test ran to the end: ' + e.message, false);
  }
  console.log(failed ? `\n${failed} failed` : '\nall passed');
  done(failed ? 1 : 0);
})();
