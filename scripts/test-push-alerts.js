// Push alerts for someone who turned notifications on:
//  - a friend message reaches them while they are away;
//  - a friend calling while they are offline rings their phone;
//  - one of the people they talk to most coming online is pushed, once.
//
//   node scripts/test-push-alerts.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');
const webpush = require('web-push');

const PORT = 6599 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-push-'));
const SENT_LOG = path.join(DATA_DIR, 'sent.jsonl');
const STUB = path.join(DATA_DIR, 'stub.js');
const FCM_LOG = path.join(DATA_DIR, 'fcm.jsonl');

// Replaces the real push service: every send is written to SENT_LOG.
fs.writeFileSync(STUB, `
const fs = require('fs');
const webpush = require(${JSON.stringify(require.resolve('web-push'))});
webpush.sendNotification = async (sub, payload) => {
  fs.appendFileSync(${JSON.stringify(SENT_LOG)}, JSON.stringify({ endpoint: sub.endpoint, ...JSON.parse(payload) }) + '\\n');
  return { statusCode: 201 };
};
// Firebase: no token exchange, and the send is written to FCM_LOG.
require(${JSON.stringify(require.resolve('google-auth-library'))}).GoogleAuth.prototype.getAccessToken = async () => 'stub-token';
const realFetch = global.fetch;
global.fetch = async (url, opts) => {
  if (!String(url).startsWith('https://fcm.googleapis.com/')) return realFetch(url, opts);
  fs.appendFileSync(${JSON.stringify(FCM_LOG)}, JSON.parse(opts.body).message ? opts.body + '\\n' : '');
  return { ok: true, status: 200, json: async () => ({}) };
};
`);

let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : extra);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function once(sock, ev, ms = 4000) {
  return new Promise((res, rej) => {
    const timer = setTimeout(() => rej(new Error('timeout waiting for ' + ev)), ms);
    sock.once(ev, (data) => { clearTimeout(timer); res(data); });
  });
}

const identityTokens = {};
function connect(name) {
  const sock = io(BASE, { transports: ['websocket'], forceNew: true });
  sock.on('identity-token', ({ clientId, token } = {}) => { identityTokens[clientId] = token; });
  const clientId = 'c_push_' + name;
  sock.emit('register', { clientId, identityToken: identityTokens[clientId], nickname: name, gender: 'male' });
  return sock;
}

function sentTo(endpoint) {
  if (!fs.existsSync(SENT_LOG)) return [];
  return fs.readFileSync(SENT_LOG, 'utf8').trim().split('\n').filter(Boolean)
    .map((l) => JSON.parse(l)).filter((p) => p.endpoint === endpoint);
}

async function subscribe(clientId, endpoint) {
  const ecdh = require('crypto').createECDH('prime256v1');
  ecdh.generateKeys();
  const res = await fetch(BASE + '/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId,
      identityToken: identityTokens[clientId],
      subscription: {
        endpoint,
        keys: { p256dh: ecdh.getPublicKey('base64url'), auth: require('crypto').randomBytes(16).toString('base64url') },
      },
    }),
  });
  return res.status;
}

(async () => {
  const vapid = webpush.generateVAPIDKeys();
  const srv = spawn(process.execPath, ['-r', STUB, path.join(__dirname, '..', 'server', 'index.js')], {
    env: {
      ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', GIPHY_API_KEY: '',
      FCM_SERVICE_ACCOUNT: JSON.stringify({ project_id: 'tl-test', client_email: 'x@tl-test.iam.gserviceaccount.com', private_key: 'unused' }),
      VAPID_PUBLIC_KEY: vapid.publicKey, VAPID_PRIVATE_KEY: vapid.privateKey, FRIEND_ONLINE_QUIET_MS: '200',
    },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  const done = (code) => {
    try { srv.kill('SIGKILL'); } catch (_) { /* gone */ }
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    process.exit(code);
  };
  try {
    for (let i = 0; ; i++) {
      try { await fetch(BASE + '/healthz'); break; } catch (_) { if (i > 60) throw new Error('server never came up'); await wait(250); }
    }
    const A = 'c_push_Alpha';
    const B = 'c_push_Bravo';
    const B_ENDPOINT = 'https://push.example/bravo';
    let a = connect('Alpha');
    let b = connect('Bravo');
    await wait(400);

    const matched = Promise.all([once(a, 'matched'), once(b, 'matched')]);
    a.emit('find-partner', { mode: 'chat' });
    b.emit('find-partner', { mode: 'chat' });
    await matched;
    a.emit('leave'); b.emit('leave');
    await wait(200);
    a.emit('friend-request', { targetClientId: B });
    await once(a, 'friend-request-result');
    b.emit('friend-request', { targetClientId: A });
    await once(b, 'friend-request-result');
    for (let i = 0; i < 3; i++) a.emit('friend-message', { toClientId: B, text: 'hi ' + i, id: 'warm' + i });
    await wait(300);

    ok('subscribe accepted', (await subscribe(B, B_ENDPOINT)) === 204);

    // Bravo rings the bell on Alpha: tell me when they come online.
    b.emit('online-alert', { clientId: A, on: true });
    await wait(200);
    // Bravo leaves; everything below happens while they are away.
    b.disconnect();
    await wait(300);

    a.emit('friend-message', { toClientId: B, text: 'you there?', id: 'away1' });
    await wait(300);
    ok('message pushed', sentTo(B_ENDPOINT).some((p) => /Alpha messaged you/.test(p.title)), sentTo(B_ENDPOINT));

    // The Android app: a direct message arrives as data only (no notification
    // block), carrying the sender's name and a text preview, and a quick
    // second and third message from the same friend still go out.
    const FCM_TOKEN = 'fcm-token-bravo-0123456789abcdef';
    const nativeRes = await fetch(BASE + '/push/native-subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: B, identityToken: identityTokens[B], token: FCM_TOKEN, platform: 'android' }),
    });
    ok('native subscribe accepted', nativeRes.status === 204, nativeRes.status);
    const filler = ['are', 'you', 'around', 'later', 'today', 'for', 'a', 'quick', 'chat', 'about', 'the', 'weekend', 'plans', 'we', 'made', 'before', 'because', 'I', 'forgot', 'what', 'time', 'works', 'best', 'for', 'everyone'];
    for (let i = 0; i < 3; i++) a.emit('friend-message', { toClientId: B, text: `fcm line ${i} ${filler.slice(i).join(' ')} ${filler.slice(0, i + 2).join(' ')}`, id: 'fcm' + i });
    a.emit('friend-message', { toClientId: B, text: '', gif: { url: 'https://media.giphy.com/media/abc/giphy.gif', preview: 'https://media.giphy.com/media/abc/200.gif', w: 200, h: 200, alt: 'g' }, id: 'fcmgif' });
    await wait(600);
    const fcmSent = fs.existsSync(FCM_LOG) ? fs.readFileSync(FCM_LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l).message) : [];
    const first = fcmSent[0] || {};
    ok('app message is data-only', fcmSent.length >= 3 && !first.notification && first.token === FCM_TOKEN, fcmSent);
    ok('data carries kind, sender, id and url', first.data && first.data.kind === 'message' && first.data.fromClientId === A
      && first.data.fromName === 'Alpha' && first.data.msgId === 'fcm0' && first.data.url === `/?open=chat&with=${A}`, first.data);
    ok('preview is the first 120 characters', first.data && first.data.preview.length === 120 && first.data.preview.startsWith('fcm line 0'), first.data);
    ok('android message is high priority', first.android && first.android.priority === 'high' && !first.android.notification);
    ok('each message in a burst is sent', fcmSent.filter((m) => m.data && /^fcm[012]$/.test(m.data.msgId)).length === 3, fcmSent.map((m) => m.data && m.data.msgId));
    ok('a GIF says GIF', fcmSent.some((m) => m.data && m.data.msgId === 'fcmgif' && m.data.preview === 'GIF'), fcmSent.map((m) => m.data));
    ok('web push still has no message text', sentTo(B_ENDPOINT).every((p) => !/fcm line/.test(p.body)));

    const calling = once(a, 'call-back-request-result');
    a.emit('call-back-request', { targetClientId: B });
    const res = await calling;
    await wait(300);
    ok('caller told peer is offline', res.reason === 'offline', res);
    ok('call pushed', sentTo(B_ENDPOINT).some((p) => p.title === 'Alpha is calling you' && /open=chat/.test(p.url)), sentTo(B_ENDPOINT));

    // Alpha goes away and comes back: Bravo asked to be told.
    a.disconnect();
    await wait(400);
    a = connect('Alpha');
    await wait(500);
    const online = sentTo(B_ENDPOINT).filter((p) => p.title === 'Alpha is online');
    ok('bell: online pushed', online.length === 1, sentTo(B_ENDPOINT));
    ok('online push opens the chat', online[0] && online[0].url === `/?open=chat&with=${A}`);

    // Again shortly after: still one alert.
    a.disconnect();
    await wait(400);
    a = connect('Alpha');
    await wait(500);
    ok('online push not repeated', sentTo(B_ENDPOINT).filter((p) => p.title === 'Alpha is online').length === 1);

    // Bravo back and looking at the tab: the in-app toast covers it, no push.
    b = connect('Bravo');
    await wait(300);
    a.disconnect();
    await wait(400);
    const before = sentTo(B_ENDPOINT).length;
    a = connect('Alpha');
    await wait(500);
    ok('no push while the tab is open', sentTo(B_ENDPOINT).length === before);

    a.disconnect(); b.disconnect();
    console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
    done(failed ? 1 : 0);
  } catch (err) {
    console.error(err);
    done(1);
  }
})();
