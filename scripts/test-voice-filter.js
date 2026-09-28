// End-to-end check of the "Voice-checked only" gender filter:
//
//   1. a woman who has not been voice-checked is not matched to a seeker who
//      asked for voice-checked women only
//   2. a voice-gender verdict from someone who never opted in is ignored
//   3. a verdict that disagrees with the chosen gender does not count
//   4. once an opted-in woman's own device confirms her voice, she is matched
//
//   node scripts/test-voice-filter.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 5999 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-voice-'));
// Known secret, so the premium seeker can show the token a premium identity
// needs to register (see identityHasState in server/index.js).
const IDENTITY_SECRET = crypto.randomBytes(32).toString('hex');
const tokenFor = (id) => crypto.createHmac('sha256', IDENTITY_SECRET).update(id).digest('hex');

let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : extra);
};
const socks = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const maybe = (sock, ev, ms) => new Promise((res) => {
  const timer = setTimeout(() => { sock.off(ev, on); res(null); }, ms);
  function on(data) { clearTimeout(timer); sock.off(ev, on); res(data); }
  sock.on(ev, on);
});

// Resolves once the server has built the profile (it answers with an
// identity token), so a search can never race ahead of registration.
function connect(name, profile) {
  const sock = io(BASE, { transports: ['websocket'], forceNew: true });
  const ready = new Promise((res) => sock.once('identity-token', res));
  const clientId = 'c_vg_' + name;
  sock.emit('register', { clientId, identityToken: tokenFor(clientId), username: name, ...profile });
  socks.push(sock);
  return ready.then(() => sock);
}

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', PREMIUM_CLIENT_IDS: 'c_vg_seeker', IDENTITY_SECRET, FEATURE_FLAGS: '{"voiceCheck":true}' },
    stdio: ['ignore', 'ignore', 'ignore'],
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

    // One candidate in the queue at a time, so candidates cannot pair with
    // each other. All waits stay well inside the 10s random fallback.
    const seeker = await connect('seeker', { gender: 'male', prefGender: 'female', prefVoiceChecked: true });
    const optedOut = await connect('optedout', { gender: 'female' });
    await wait(500);

    seeker.emit('find-partner', {});
    await wait(200);
    let m = maybe(seeker, 'matched', 2000);
    optedOut.emit('find-partner', {});
    ok('an unchecked woman is not matched to a voice-checked-only seeker', (await m) === null);

    m = maybe(seeker, 'matched', 2000);
    optedOut.emit('voice-gender', { label: 'female', confidence: 0.95 });
    await wait(100);
    optedOut.emit('find-partner', {});
    ok('a verdict from someone who did not opt in is ignored', (await m) === null);
    optedOut.close();
    await wait(300);

    // In real use the verdict lands during a call, before the next search.
    const mismatched = await connect('mismatched', { gender: 'female', voiceCheck: true });
    await wait(500);
    m = maybe(seeker, 'matched', 2000);
    mismatched.emit('voice-gender', { label: 'male', confidence: 0.9 });
    await wait(100);
    mismatched.emit('find-partner', {});
    ok('a voice that does not agree with the chosen gender is not voice-checked', (await m) === null);
    mismatched.close();
    await wait(300);

    const optedIn = await connect('optedin', { gender: 'female', voiceCheck: true });
    await wait(500);
    m = maybe(seeker, 'matched', 3000);
    optedIn.emit('voice-gender', { label: 'female', confidence: 0.92 });
    await wait(100);
    optedIn.emit('find-partner', {});
    ok('an opted-in, voice-confirmed woman is matched', (await m) !== null);
  } catch (e) {
    failed++;
    console.log('FAIL', e.message);
  }
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
  done(failed ? 1 : 0);
})();
