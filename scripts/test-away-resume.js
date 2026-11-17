// A text chat survives one side switching apps long enough for its socket to
// drop: the other side is told "offline", messages sent meanwhile are kept,
// and both sides hear "back online" when it returns. Returning after the
// chat ended is told so instead of being left on a dead chat.
//
//   node scripts/test-away-resume.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 5600 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-test-'));
let failed = 0;
const ok = (name, cond, extra) => { if (!cond) failed++; console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : extra); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function once(sock, ev, ms = 4000) {
  return new Promise((res, rej) => {
    const timer = setTimeout(() => { sock.off(ev, on); rej(new Error('timeout waiting for ' + ev)); }, ms);
    function on(data) { clearTimeout(timer); sock.off(ev, on); res(data); }
    sock.on(ev, on);
  });
}
const tokens = {};
function connect(name, extra = {}) {
  const sock = io(BASE, { transports: ['websocket'], forceNew: true, reconnection: false });
  sock.on('identity-token', (d) => { if (d && d.token) tokens[name] = d.token; });
  sock.on('register-result', (d) => { if (d && d.identityToken) tokens[name] = d.identityToken; });
  sock.emit('register', { clientId: 'c_test_' + name.toLowerCase(), username: name, gender: 'male', country: 'US', countryName: 'United States', identityToken: tokens[name] || '', ...extra });
  return sock;
}
async function pair(a, b) {
  const m = Promise.all([once(a, 'matched'), once(b, 'matched')]);
  a.emit('find-partner', { mode: 'chat' });
  b.emit('find-partner', { mode: 'chat' });
  return (await m)[0];
}

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', CHAT_AWAY_DROP_MS: '3000' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = ''; srv.stdout.on('data', (d) => { log += d; }); srv.stderr.on('data', (d) => { log += d; });
  const done = (code) => { try { srv.kill('SIGKILL'); } catch (_) {} fs.rmSync(DATA_DIR, { recursive: true, force: true }); process.exit(code); };
  try {
    for (let i = 0; i < 40; i++) { try { await fetch(BASE + '/healthz'); break; } catch (_) { await wait(250); } }
    let a = connect('Away');
    const b = connect('Waiter');
    await wait(500);
    const m = await pair(a, b);
    a.emit('chat-away', { away: true });
    await once(b, 'partner-away');

    // The phone kills the socket while in the background.
    const offline = once(b, 'partner-away');
    a.io.engine.close();
    const off = await offline;
    ok('the other side is told "offline"', off.away === true && off.offline === true, off);

    b.emit('chat-message', { text: 'are you still there?' });
    await wait(300);

    // Back, on a new socket, with the same identity and the pair it was in.
    const back = once(b, 'partner-away');
    a = connect('Away', { pairId: m.pairId });
    const keptP = once(a, 'chat-message');
    const resumed = await once(a, 'call-resumed');
    ok('the chat is handed back', resumed && resumed.pairId === m.pairId, resumed);
    const kept = await keptP;
    ok('a message sent while offline arrives', kept && kept.text === 'are you still there?', kept);
    ok('the other side hears "back online"', (await back).away === false);

    const live = once(b, 'chat-message');
    a.emit('chat-message', { text: 'yes, back' });
    ok('the chat works again', (await live).text === 'yes, back');

    // Gone past the hold: the returning page is told the chat ended.
    a.emit('chat-away', { away: true });
    await wait(200);
    const left = once(b, 'partner-left', 14000);
    a.io.engine.close();
    await left;
    ok('the other side is released once the hold runs out', true);
    a = connect('Away', { pairId: m.pairId });
    const told = await once(a, 'partner-left');
    a.close(); b.close();
    ok('coming back too late says the chat ended', told && told.reason === 'away', told);
  } catch (e) {
    failed++; console.log('FAIL', e.message); console.log(log.split('\n').slice(-20).join('\n'));
  }
  console.log(failed ? `\n${failed} failed` : '\nall passed');
  done(failed ? 1 : 0);
})();
