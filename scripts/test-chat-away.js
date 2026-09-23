// End-to-end check of "stranger left the app": a text-chat tab going to the
// background is announced to the other side at once, coming back is too, and
// a tab that stays hidden past CHAT_AWAY_DROP_MS ends the chat for both.
//
//   node scripts/test-chat-away.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 5599 + Math.floor(Math.random() * 300);
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

function connect(name) {
  const sock = io(BASE, { transports: ['websocket'], forceNew: true });
  sock.emit('register', {
    clientId: 'c_test_' + name, username: name, gender: 'male', country: 'US', countryName: 'United States',
  });
  return sock;
}

async function pair(a, b) {
  const matched = Promise.all([once(a, 'matched'), once(b, 'matched')]);
  a.emit('find-partner', { mode: 'chat' });
  b.emit('find-partner', { mode: 'chat' });
  await matched;
}

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', CHAT_AWAY_DROP_MS: '800' },
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
    const a = connect('Away');
    const b = connect('Waiter');
    await wait(400);
    await pair(a, b);
    ok('two clients matched', true);

    let got = once(b, 'partner-away');
    a.emit('chat-away', { away: true });
    ok('going to the background is relayed', (await got).away === true);

    got = once(b, 'partner-away');
    a.emit('chat-away', { away: false });
    ok('coming back is relayed', (await got).away === false);

    // Came back in time: the chat must survive past the drop window.
    let ended = false;
    const onLeft = () => { ended = true; };
    b.on('partner-left', onLeft);
    await wait(1200);
    b.off('partner-left', onLeft);
    ok('returning in time keeps the chat', !ended);

    const bLeft = once(b, 'partner-left');
    const aLeft = once(a, 'partner-left');
    a.emit('chat-away', { away: true });
    const [bInfo, aInfo] = await Promise.all([bLeft, aLeft]);
    ok('stranger told the away user disconnected', bInfo.reason === 'disconnected' && !!bInfo.username, JSON.stringify(bInfo));
    ok('away user told the chat ended because of them', aInfo.reason === 'away', JSON.stringify(aInfo));

    a.close(); b.close();
  } catch (err) {
    failed++;
    console.log('FAIL', err.message);
  }
  console.log(failed ? `\n${failed} failed` : '\nall passed');
  done(failed ? 1 : 0);
})();
