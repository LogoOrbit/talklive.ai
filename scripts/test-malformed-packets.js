// A malformed packet must never take the server down.
//
// Socket handlers destructure their payload with a default (`({ token } = {})`),
// and a default only covers `undefined`: one `socket.emit('logout', null)` from
// anyone threw, reached the uncaughtException handler and exited the process,
// dropping every call on the site. This sends every event the server listens
// for with a spread of junk payloads, before and after registering, and checks
// the server is still up and still matching people afterwards.
//
//   node scripts/test-malformed-packets.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 5900 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-malformed-'));
const SERVER = path.join(__dirname, '..', 'server', 'index.js');

let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : extra);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const EVENTS = [...new Set(
  [...fs.readFileSync(SERVER, 'utf8').matchAll(/socket\.on\('([a-z-]+)'/g)].map((m) => m[1])
)].filter((e) => e !== 'disconnect' && e !== 'error');

const JUNK = [null, 0, 'x', [], true, { targetClientId: ['a'], friendClientId: {}, toClientId: {}, fromClientId: [1], text: {}, id: [], token: {} }];

function connect() {
  return io(BASE, { transports: ['websocket'], forceNew: true, reconnection: false });
}

// Resolves false instead of hanging when the server has gone.
function opened(s) {
  return new Promise((r) => {
    s.once('connect', () => r(true));
    s.once('connect_error', () => r(false));
    setTimeout(() => r(false), 3000);
  });
}

async function alive() {
  try { return (await fetch(BASE + '/')).status === 200; } catch (_) { return false; }
}

(async () => {
  const srv = spawn(process.execPath, [SERVER], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const logs = [];
  srv.stdout.on('data', (d) => logs.push(String(d)));
  srv.stderr.on('data', (d) => logs.push(String(d)));
  let exited = false;
  srv.on('exit', () => { exited = true; });
  const done = async (code) => {
    srv.kill();
    for (let i = 0; i < 20 && !exited; i++) await wait(100);
    try { fs.rmSync(DATA_DIR, { recursive: true, force: true }); } catch (_) { /* temp dir */ }
    process.exit(code);
  };

  try {
    for (let i = 0; i < 50 && !(await alive()); i++) await wait(200);
    ok('server boots', await alive());
    ok('found the socket events to send', EVENTS.length > 40, EVENTS.length);

    send: for (const registered of [false, true]) {
      for (const junk of JUNK) {
        const s = connect();
        if (!(await opened(s))) break send;
        if (registered) {
          s.emit('register', { clientId: 'c_junk_' + Math.random().toString(36).slice(2, 10) });
          await wait(150);
        }
        for (const ev of EVENTS) {
          if (ev === 'register') continue;
          s.emit(ev, junk, () => {});
          // Under the per-socket rate limit, so every packet reaches its handler.
          await wait(45);
        }
        s.close();
      }
    }
    for (const junk of JUNK) {
      const s = connect();
      if (!(await opened(s))) break;
      s.emit('register', junk);
      await wait(100);
      s.close();
    }
    await wait(500);
    ok('server survives junk on every event', !exited && await alive(), logs.join('').slice(-1500));
    ok('no uncaught exception logged', !/uncaughtException/.test(logs.join('')), logs.join('').slice(-1500));

    // And it still does its job.
    if (exited) { console.log(`\n${failed} check(s) failed`); return done(1); }
    const a = connect(); const b = connect();
    a.emit('register', { clientId: 'c_after_junk_a', gender: 'male' });
    b.emit('register', { clientId: 'c_after_junk_b', gender: 'female' });
    await wait(400);
    const matched = new Promise((r) => { a.once('matched', () => r(true)); setTimeout(() => r(false), 8000); });
    a.emit('find-partner', { mode: 'chat' });
    b.emit('find-partner', { mode: 'chat' });
    ok('two people still get matched afterwards', await matched);
    a.close(); b.close();

    console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
    done(failed ? 1 : 0);
  } catch (err) {
    console.error('\nFAIL (threw):', err.message);
    console.error(logs.join('').slice(-2000));
    done(1);
  }
})();
