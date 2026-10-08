// End-to-end check of the "same personality" flag on 'matched': set only when
// both people wear the same personality avatar, and never leaking a partner's
// avatar otherwise.
//
//   node scripts/test-twin-match.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 5499 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-test-'));

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

function connect(name, avatar, animal) {
  const sock = io(BASE, { transports: ['websocket'], forceNew: true });
  sock.emit('register', {
    clientId: 'c_test_' + name,
    username: name,
    gender: 'male',
    country: 'US',
    countryName: 'United States',
    avatar,
    animal,
  });
  return sock;
}

async function pair(nameA, avatarA, nameB, avatarB) {
  const a = connect(nameA, avatarA, 'wolf');
  const b = connect(nameB, avatarB, 'wolf');
  await wait(300);
  const gotA = once(a, 'matched');
  const gotB = once(b, 'matched');
  a.emit('find-partner', { mode: 'chat', animal: 'wolf' });
  b.emit('find-partner', { mode: 'chat', animal: 'wolf' });
  const [ma, mb] = await Promise.all([gotA, gotB]);
  a.close(); b.close();
  await wait(200);
  return [ma, mb];
}

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', GIPHY_API_KEY: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const done = (code) => {
    try { srv.kill('SIGKILL'); } catch (_) { /* already gone */ }
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    process.exit(code);
  };

  try {
    for (let i = 0; i < 40; i++) {
      try { await fetch(BASE + '/healthz'); break; } catch (_) { await wait(250); }
    }

    let [ma, mb] = await pair('Alpha', 'c:wizard', 'Bravo', 'c:wizard');
    ok('same personality flagged for the first person', ma.samePersonality === 'wizard', ma.samePersonality);
    ok('same personality flagged for the second person', mb.samePersonality === 'wizard', mb.samePersonality);
    ok('same animal still visible to both', ma.partner.animal === 'wolf' && mb.partner.animal === 'wolf');
    ok('partner avatar itself is not sent', !('avatar' in ma.partner));

    [ma, mb] = await pair('Charlie', 'c:wizard', 'Delta', 'c:pirate');
    ok('different personalities are not flagged', ma.samePersonality == null && mb.samePersonality == null);

    [ma, mb] = await pair('Echo', 'm1', 'Foxtrot', 'm1');
    ok('basic avatars are not a personality', ma.samePersonality == null && mb.samePersonality == null);
  } catch (e) {
    failed++;
    console.log('FAIL', e.message);
  }
  console.log(failed ? `\n${failed} failed` : '\nall passed');
  done(failed ? 1 : 0);
})();
