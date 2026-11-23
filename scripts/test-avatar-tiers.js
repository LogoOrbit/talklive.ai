// Free accounts may wear only the basic avatars (3 animals, 3 characters);
// everything else is Plus. Checks the server side of that:
//
//   1. a free user can pick a free avatar
//   2. a free user cannot switch to a locked one
//   3. a free user wearing a Plus avatar is given a free one (Plus ended); special
//      faces need their tier
//   4. a Plus user can pick anything
//
//   node scripts/test-avatar-tiers.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 6699 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-faces-'));
const IDENTITY_SECRET = crypto.randomBytes(32).toString('hex');
const sign = (clientId) => crypto.createHmac('sha256', IDENTITY_SECRET).update(clientId).digest('hex');

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

let seq = 0;
const socks = [];
function connect(clientId, name, extra) {
  const sock = io(BASE, { transports: ['websocket'], forceNew: true });
  socks.push(sock);
  sock.emit('register', Object.assign({ clientId, username: name, gender: 'male', identityToken: sign(clientId) }, extra));
  return sock;
}

// Registers `clientId` with `face` ("a:owl" avatar + bare animal id, or a
// character) and reports what a stranger who is matched with them sees.
async function seenAs(clientId, face) {
  const extra = face.startsWith('c:') ? { avatar: face, animal: face } : { avatar: face, animal: face.slice(2) };
  seq++;
  const me = connect(clientId, 'Face' + seq, extra);
  const other = connect('c_face_obs' + seq, 'Obs' + seq);
  await wait(400);
  const seen = once(other, 'matched');
  me.emit('find-partner', { mode: 'talk' });
  await wait(150);
  other.emit('find-partner', { mode: 'talk' });
  const m = await seen;
  // Stay past the hit-and-run window, or reusing one client for every check
  // reads as a bot that keeps flashing in and out of matches.
  await wait(1700);
  me.close();
  other.close();
  await wait(250);
  return m.partner.avatar;
}

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', IDENTITY_SECRET, PREMIUM_CLIENT_IDS: 'c_face_plus' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
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

    // 1-2. A new free user starts on a basic face and cannot move to a locked one.
    ok('a free user can pick a free animal', await seenAs('c_face_free', 'a:owl') === 'a:owl');
    ok('a free user can switch between free faces', await seenAs('c_face_free', 'c:doctor') === 'c:doctor');
    const refused = await seenAs('c_face_free', 'a:dragon');
    ok('a free user cannot switch to a locked animal', refused !== 'a:dragon', refused);
    ok('...and keeps the face they had', refused === 'c:doctor', refused);
    const refusedChar = await seenAs('c_face_free', 'c:vampire');
    ok('a free user cannot switch to a locked character', refusedChar === 'c:doctor', refusedChar);

    // 3. Plus faces only last while Plus does: a free account wearing one is
    // moved to a free face of the same kind.
    const swapped = await seenAs('c_face_old', 'a:tiger');
    ok('a Plus face on a free account is replaced by a free one', swapped === 'a:penguin', swapped);
    ok('...and they can then pick another free face', await seenAs('c_face_old', 'a:wolf') === 'a:wolf');
    const swappedChar = await seenAs('c_face_old2', 'c:ninja');
    ok('a Plus character is replaced by a free character', swappedChar === 'c:chef', swappedChar);
    const special = await seenAs('c_face_free', 'c:silver_knight');
    ok('a special face is refused before its tier', special !== 'c:silver_knight' && special === 'c:doctor', special);

    // 4. Plus can pick anything.
    ok('Plus can pick a locked animal', await seenAs('c_face_plus', 'a:unicorn') === 'a:unicorn');
    ok('Plus can pick a locked character', await seenAs('c_face_plus', 'c:vampire') === 'c:vampire');
  } catch (err) {
    console.error(err);
    failed++;
  }
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
  done(failed ? 1 : 0);
})();
