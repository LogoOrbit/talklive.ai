// End-to-end check of the discovery and reconnect data the client builds on:
// history rows remember how long the last conversation lasted and how many
// times two people have met, interests match regardless of case, and the
// "Online now" list carries a few interests so it can be searched.
//
//   node scripts/test-discovery.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 6599 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-discovery-'));

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

const lastSync = new WeakMap();
const lastOnline = new WeakMap();

async function connect(clientId, extra = {}) {
  const sock = io(BASE, { transports: ['websocket'], forceNew: true });
  sock.on('state-sync', (s) => lastSync.set(sock, s));
  sock.on('online-people', (l) => lastOnline.set(sock, l));
  const registered = once(sock, 'register-result');
  sock.emit('register', { clientId, nickname: clientId, gender: 'male', ...extra });
  await registered;
  return sock;
}

async function match(a, b, ms = 16000) {
  const both = Promise.all([once(a, 'matched', ms), once(b, 'matched', ms)]);
  a.emit('find-partner', { mode: 'talk' });
  b.emit('find-partner', { mode: 'talk' });
  return both;
}

function historyRow(sock, clientId) {
  return ((lastSync.get(sock) || {}).chatHistory || []).find((h) => h.clientId === clientId);
}

async function until(fn, ms = 3000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (fn()) return true;
    await wait(50);
  }
  return !!fn();
}

function startServer() {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', GIPHY_API_KEY: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  srv.logs = [];
  srv.stdout.on('data', (d) => srv.logs.push(String(d)));
  srv.stderr.on('data', (d) => srv.logs.push(String(d)));
  return srv;
}

async function waitUp() {
  for (let i = 0; i < 60; i++) {
    try { await fetch(BASE + '/healthz'); return; } catch (_) { await wait(250); }
  }
  throw new Error('server never came up');
}

(async () => {
  const srv = startServer();
  const done = (code) => {
    try { srv.kill('SIGKILL'); } catch (_) { /* gone */ }
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    process.exit(code);
  };

  try {
    await waitUp();

    const a = await connect('c_disc_alpha', {
      interests: ['Music', ' music ', 'Anime', '', 42, 'visit spam.example.com', 'call 0300 1234567', 'onlyfans'],
    });
    const b = await connect('c_disc_bravo', { interests: ['music', 'travel'] });

    // --- Online now carries interests, cleaned ---------------------------
    ok('online list includes interests (trimmed, case-deduped, links/numbers/unsafe dropped)', await until(() => {
      const me = (lastOnline.get(b) || []).find((p) => p.username === 'c_disc_alpha');
      return me && JSON.stringify(me.interests) === JSON.stringify(['Music', 'Anime']);
    }), JSON.stringify(lastOnline.get(b)));

    // --- First meeting ---------------------------------------------------
    const [ma] = await match(a, b);
    ok('matched partner carries cleaned interests', JSON.stringify(ma.partner.interests) === JSON.stringify(['music', 'travel']),
      JSON.stringify(ma.partner.interests));
    await until(() => historyRow(a, 'c_disc_bravo'));
    ok('history row starts at met 1', (historyRow(a, 'c_disc_bravo') || {}).met === 1, JSON.stringify(historyRow(a, 'c_disc_bravo')));
    await wait(1200);
    a.emit('leave');
    ok('ending the call records its length on both sides', await until(() => (historyRow(a, 'c_disc_bravo') || {}).durationSeconds >= 1
      && (historyRow(b, 'c_disc_alpha') || {}).durationSeconds >= 1), JSON.stringify([historyRow(a, 'c_disc_bravo'), historyRow(b, 'c_disc_alpha')]));

    // --- Second meeting (after the soft cooldown's random fallback) ------
    b.emit('leave');
    await match(a, b);
    ok('meeting again counts', await until(() => (historyRow(a, 'c_disc_bravo') || {}).met === 2
      && (historyRow(b, 'c_disc_alpha') || {}).met === 2), JSON.stringify(historyRow(a, 'c_disc_bravo')));

    // A connection that never came up is not a conversation.
    const before = (historyRow(a, 'c_disc_bravo') || {}).durationSeconds;
    await wait(2200);
    a.emit('skip', { failed: true });
    await wait(400);
    ok('a failed connection does not overwrite the last call length',
      (historyRow(a, 'c_disc_bravo') || {}).durationSeconds === before, JSON.stringify(historyRow(a, 'c_disc_bravo')));
    a.emit('leave');
    b.emit('leave');

    // --- Friending from history still works ------------------------------
    const res = once(a, 'friend-request-result');
    a.emit('friend-request', { targetClientId: 'c_disc_bravo' });
    ok('someone met can be added from history', (await res).sent === true);

    a.disconnect();
    b.disconnect();
  } catch (err) {
    failed++;
    console.log('FAIL', err.message);
    console.log(srv.logs.join('').slice(-2000));
  }
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
  done(failed ? 1 : 0);
})();
