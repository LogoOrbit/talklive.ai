// End-to-end checks for friend voice messages: friends only, off until the
// other friend accepts a request, the clip only readable by the two people in
// the chat, deleted on unsend, and consent + audio surviving a restart.
//
//   node scripts/test-voice-notes.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 6300 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-voice-'));

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
const call = (sock, ev, payload) => sock.timeout(8000).emitWithAck(ev, payload);

const identityTokens = {};
function connect(name) {
  const sock = io(BASE, { transports: ['websocket'], forceNew: true });
  sock.on('identity-token', ({ clientId, token } = {}) => { identityTokens[clientId] = token; });
  const clientId = 'c_vn_' + name;
  sock.emit('register', { clientId, identityToken: identityTokens[clientId], nickname: name, gender: 'male' });
  return sock;
}

function startServer() {
  return spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', GIPHY_API_KEY: '', DATABASE_URL: '' },
    stdio: ['ignore', 'ignore', 'ignore'],
  });
}

async function waitUp() {
  for (let i = 0; i < 60; i++) {
    try { await fetch(BASE + '/healthz'); return; } catch (_) { await wait(250); }
  }
  throw new Error('server never came up');
}

async function matchPair(a, b) {
  const matched = Promise.all([once(a, 'matched'), once(b, 'matched')]);
  a.emit('find-partner', { mode: 'chat' });
  b.emit('find-partner', { mode: 'chat' });
  await matched;
}

const clip = (n = 4000) => Buffer.alloc(n, 7);
const voiceFiles = () => {
  try { return fs.readdirSync(path.join(DATA_DIR, 'voice-notes')); } catch (_) { return []; }
};

(async () => {
  let srv = startServer();
  const done = (code) => {
    try { srv.kill('SIGKILL'); } catch (_) { /* gone */ }
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    process.exit(code);
  };

  try {
    await waitUp();
    const A = 'c_vn_Alpha';
    const B = 'c_vn_Bravo';
    const a = connect('Alpha');
    const b = connect('Bravo');
    const c = connect('Charlie');
    await wait(400);

    // --- Not friends: never ------------------------------------------------
    await matchPair(a, b);
    a.emit('leave'); b.emit('leave');
    await wait(200);
    let res = await call(a, 'friend-voice-note', { toClientId: B, id: 'mvn1', mime: 'audio/webm', ms: 2000, audio: clip() });
    ok('a stranger cannot send a voice message', res && res.ok === false && res.reason === 'friends-only', JSON.stringify(res));

    a.emit('friend-request', { targetClientId: B });
    await once(b, 'notification');
    const became = once(a, 'state-sync');
    b.emit('friend-request-respond', { fromClientId: A, accept: true });
    await became;
    await wait(150);

    // --- Friends, but not agreed yet -----------------------------------------
    res = await call(a, 'friend-voice-note', { toClientId: B, id: 'mvn2', mime: 'audio/webm', ms: 2000, audio: clip() });
    ok('a friend cannot send before the other accepts', res && res.reason === 'needs-consent', JSON.stringify(res));

    const sentA = once(a, 'voice-note-state');
    const gotB = once(b, 'voice-note-state');
    a.emit('voice-note-request', { toClientId: B });
    const [sa, sb] = await Promise.all([sentA, gotB]);
    ok('the asker sees "sent"', sa.clientId === B && sa.state === 'sent');
    ok('the friend sees "received"', sb.clientId === A && sb.state === 'received');

    const selfAnswer = once(a, 'voice-note-state', 600).then(() => true, () => false);
    a.emit('voice-note-respond', { fromClientId: B, accept: true });
    ok('the asker cannot accept their own request', !(await selfAnswer));
    res = await call(a, 'friend-voice-note', { toClientId: B, id: 'mvn3', mime: 'audio/webm', ms: 2000, audio: clip() });
    ok('a pending request does not allow sending', res && res.reason === 'needs-consent');

    const onA = once(a, 'voice-note-state');
    const onB = once(b, 'voice-note-state');
    b.emit('voice-note-respond', { fromClientId: A, accept: true });
    const [oa, ob] = await Promise.all([onA, onB]);
    ok('accepting turns it on for both', oa.state === 'on' && ob.state === 'on' && oa.accepted === true);

    // --- Sending, receiving, fetching ----------------------------------------
    res = await call(a, 'friend-voice-note', { toClientId: B, id: 'mvn4', mime: 'video/mp4', ms: 2000, audio: clip() });
    ok('an unsupported format is refused', res && res.reason === 'invalid');
    res = await call(a, 'friend-voice-note', { toClientId: B, id: 'mvn4', mime: 'audio/webm', ms: 2000, audio: clip(800 * 1024) });
    ok('an oversized clip is refused', res && res.ok === false, JSON.stringify(res && res.reason));

    const incoming = once(b, 'friend-message');
    const audio = Buffer.from(Array.from({ length: 5000 }, (_, i) => i % 251));
    res = await call(a, 'friend-voice-note', { toClientId: B, id: 'mvn5', mime: 'audio/webm;codecs=opus', ms: 3200, audio });
    ok('a voice message is stored once agreed', res && res.ok && res.voice && /^v[a-f0-9]{24}$/.test(res.voice.id), JSON.stringify(res));
    const msg = await incoming;
    ok('the friend receives it live', msg.id === 'mvn5' && msg.voice && msg.voice.id === res.voice.id && msg.voice.ms === 3200);
    const noteId = res.voice.id;

    const again = await call(a, 'friend-voice-note', { toClientId: B, id: 'mvn5', mime: 'audio/webm', ms: 3200, audio });
    ok('a resend is answered with the stored copy', again && again.ok && again.voice.id === noteId);
    ok('and is stored only once', voiceFiles().length === 1, voiceFiles().join(','));

    let got = await call(b, 'voice-note-get', { id: noteId, chatWith: A });
    ok('the recipient can fetch the audio', got && got.ok && Buffer.from(got.data).equals(audio) && got.mime === 'audio/webm');
    got = await call(a, 'voice-note-get', { id: noteId, chatWith: B });
    ok('the sender can fetch it too', got && got.ok);
    got = await call(c, 'voice-note-get', { id: noteId, chatWith: A });
    ok('nobody else can fetch it', got && got.ok === false);

    const hist = once(b, 'friend-chat-history');
    b.emit('get-friend-chat', { friendClientId: A });
    const h = await hist;
    ok('history carries the voice state and the message', h.voice === 'on' && h.messages.some((m) => m.voice && m.voice.id === noteId));

    // --- Restart: consent and audio persist --------------------------------
    await wait(2500);
    a.close(); b.close(); c.close();
    srv.kill('SIGTERM');
    await new Promise((r) => srv.once('exit', r));
    srv = startServer();
    await waitUp();
    const a2 = connect('Alpha');
    const b2 = connect('Bravo');
    await Promise.all([once(a2, 'state-sync'), once(b2, 'state-sync')]);
    const hist2 = once(a2, 'friend-chat-history');
    a2.emit('get-friend-chat', { friendClientId: B });
    ok('consent survives a restart', (await hist2).voice === 'on');
    got = await call(b2, 'voice-note-get', { id: noteId, chatWith: A });
    ok('audio survives a restart', got && got.ok && Buffer.from(got.data).equals(audio));

    // --- Unsend deletes the clip ---------------------------------------------
    const deleted = once(b2, 'friend-message-deleted');
    a2.emit('friend-message-delete', { toClientId: B, id: 'mvn5' });
    await deleted;
    await wait(200);
    got = await call(b2, 'voice-note-get', { id: noteId, chatWith: A });
    ok('an unsent voice message is gone', got && got.ok === false);
    ok('and its file is deleted', voiceFiles().length === 0, voiceFiles().join(','));

    // --- Turning off, and unfriending ----------------------------------------
    const offA = once(a2, 'voice-note-state');
    b2.emit('voice-note-disable', { clientId: A });
    ok('either friend can turn it off', (await offA).state === 'off');
    a2.emit('voice-note-request', { toClientId: B });
    await once(b2, 'voice-note-state');
    b2.emit('voice-note-respond', { fromClientId: A, accept: true });
    await once(a2, 'voice-note-state');
    const unfriended = once(a2, 'state-sync');
    b2.emit('remove-friend', { friendClientId: A });
    await unfriended;
    res = await call(a2, 'friend-voice-note', { toClientId: B, id: 'mvn6', mime: 'audio/webm', ms: 2000, audio: clip() });
    ok('unfriending ends it', res && res.reason === 'friends-only');
    a2.close(); b2.close();

    console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
    done(failed ? 1 : 0);
  } catch (err) {
    console.error(err);
    done(1);
  }
})();
