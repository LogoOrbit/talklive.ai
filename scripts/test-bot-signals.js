// Two ways scripts are kept away from real people, on top of the quick-drop
// quarantine in test-bot-quarantine.js:
//
//   1. a socket with no User-Agent (or an HTTP library's) is matched only with
//      other scripts; two browsers still match each other at once
//   2. a voice client that never answers the WebRTC offer it is sent is
//      quarantined after a few such matches, even though it never ends a match
//      itself; a client that answers is never penalised
//
//   node scripts/test-bot-signals.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 6900 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-botsig-'));
const BROWSER = 'Mozilla/5.0 (Linux; Android 14; SM-A145F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36';

let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : JSON.stringify(extra));
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 3000) => { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await wait(50); } return false; };
const sockets = [];
let seq = 10;

// `answers`: behave like a real voice client and answer an offer at once.
// `offers`: as initiator, send an offer at once.
async function client(name, { ua = BROWSER, answers = true, offers = true } = {}) {
  const headers = { 'fly-client-ip': `198.51.${seq++}.7` };
  if (ua) headers['user-agent'] = ua;
  const sock = io(BASE, { transports: ['websocket'], forceNew: true, extraHeaders: headers });
  sockets.push(sock);
  const st = { sock, matched: 0, initiator: null };
  sock.on('matched', (m) => {
    st.matched += 1;
    st.initiator = !!m.initiator;
    if (m.initiator && offers) sock.emit('signal', { type: 'offer', sdp: { type: 'offer', sdp: 'v=0 fake' } });
  });
  sock.on('signal', (d) => {
    if (d && d.type === 'offer' && answers) sock.emit('signal', { type: 'answer', sdp: { type: 'answer', sdp: 'v=0 fake' } });
  });
  await new Promise((r) => sock.on('connect', r));
  const reg = new Promise((r) => sock.once('register-result', r));
  sock.emit('register', { clientId: 'c_' + name.toLowerCase() + Date.now().toString(36) + seq, nickname: name, gender: 'male' });
  await reg;
  return st;
}

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: {
      ...process.env, PORT: String(PORT), DATA_DIR, DATABASE_URL: '', NODE_ENV: 'development', GIPHY_API_KEY: '',
      QUARANTINE_AUTOMATION_UA: '1', QUARANTINE_SAMPLE: '4', QUARANTINE_LIMIT: '4',
      SILENT_OFFER_MS: '1500', SILENT_ANSWER_MS: '600',
    },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  try {
    for (let i = 0; i < 60; i++) {
      try { await fetch(BASE + '/healthz'); break; } catch (_) { await wait(250); }
    }

    // 1. User-Agent.
    const script = await client('Script', { ua: null });
    const person = await client('Person');
    script.sock.emit('find-partner', { mode: 'talk' });
    await wait(200);
    person.sock.emit('find-partner', { mode: 'talk' });
    await wait(1500);
    ok('a socket with no User-Agent is not matched with a browser', script.matched === 0 && person.matched === 0, { s: script.matched, p: person.matched });
    const script2 = await client('Curl', { ua: 'curl/8.4.0' });
    script2.sock.emit('find-partner', { mode: 'talk' });
    ok('scripts are matched with each other', await until(() => script.matched === 1 && script2.matched === 1));
    const person2 = await client('Person2');
    person2.sock.emit('find-partner', { mode: 'talk' });
    ok('two browsers match each other at once', await until(() => person.matched === 1 && person2.matched === 1));
    for (const s of [script, script2, person, person2]) s.sock.close();
    await wait(300);

    // 2. A side that never answers the offer it is sent.
    const mute = await client('Mute', { answers: false, offers: false });
    for (let round = 0; round < 4; round++) {
      // The real person waits first, so it is the initiator and sends the offer.
      const real = await client('Real' + round);
      real.sock.emit('find-partner', { mode: 'talk' });
      await wait(150);
      mute.sock.emit('find-partner', { mode: 'talk' });
      const paired = await until(() => real.matched === 1 && mute.matched === round + 1, 3000);
      if (!paired) { ok(`round ${round}: paired`, false, { real: real.matched, mute: mute.matched }); break; }
      // The real person gives up after the silence, as the app does.
      await wait(900);
      real.sock.emit('skip');
      await wait(200);
      mute.sock.emit('leave');
      real.sock.close();
      await wait(200);
    }
    ok('the silent client was paired four times', mute.matched === 4, mute.matched);
    const before = mute.matched;
    const real5 = await client('Real5');
    real5.sock.emit('find-partner', { mode: 'talk' });
    await wait(150);
    mute.sock.emit('find-partner', { mode: 'talk' });
    await wait(1500);
    ok('after that the silent client is quarantined from real people', mute.matched === before && real5.matched === 0, { m: mute.matched - before, r: real5.matched });
    mute.sock.close();
    await wait(300);

    // Control: a client that answers, whose partners all skip it after a
    // second, is a person being skipped, not a script.
    const talker = await client('Talker');
    for (let round = 0; round < 4; round++) {
      const real = await client('Skipper' + round);
      real.sock.emit('find-partner', { mode: 'talk' });
      await wait(150);
      talker.sock.emit('find-partner', { mode: 'talk' });
      await until(() => real.matched === 1, 3000);
      await wait(900);
      real.sock.emit('skip');
      await wait(200);
      talker.sock.emit('leave');
      real.sock.close();
      await wait(200);
    }
    const tb = talker.matched;
    const real6 = await client('Real6');
    real6.sock.emit('find-partner', { mode: 'talk' });
    await wait(150);
    talker.sock.emit('find-partner', { mode: 'talk' });
    ok('a client that answers is still matched with real people', await until(() => talker.matched === tb + 1 && real6.matched === 1), { t: talker.matched - tb, r: real6.matched });
  } catch (err) {
    console.error(err);
    failed++;
  } finally {
    sockets.forEach((s) => { try { s.close(); } catch (_) { /* gone */ } });
    srv.kill('SIGKILL');
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
  process.exit(failed ? 1 : 0);
})();
