/*
 * End-to-end test of the referral loop, driven entirely through Socket.IO
 * against a real server - the same surface a browser uses.
 *
 * The rule: every 3 invited friends who open the link, create a new
 * email-verified account and have a real conversation earn the inviter 1 hour
 * of Plus. The invited friend gets nothing, and invites from the inviter's own
 * network, or from a network another counted invite already used, never count.
 *
 * Run:
 *   node scripts/test-referral.js      (or: npm run test:referral)
 *
 * It boots its own server against a throwaway DATA_DIR. Networks are faked
 * with the fly-client-ip header, which is how the server reads the address in
 * production. REAL_CONVERSATION_MS shortens the "real conversation" threshold
 * so the test does not hold calls open for a minute. Sign-up codes are read
 * from the server's output (development prints them when SMTP is not set).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 5099 + Math.floor(Math.random() * 300);
const URL = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-referral-'));
const THRESHOLD_MS = 1500;
let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : JSON.stringify(extra));
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 8000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (fn()) return true;
    await wait(100);
  }
  return false;
}

let logs = '';
const server = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
  env: {
    ...process.env,
    PORT: String(PORT),
    DATA_DIR,
    REAL_CONVERSATION_MS: String(THRESHOLD_MS),
    NODE_ENV: 'development',
    SMTP_HOST: '',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', (d) => { logs += String(d); });
server.stderr.on('data', (d) => { logs += String(d); });

function finish(code) {
  try { server.kill('SIGKILL'); } catch (_) { /* already gone */ }
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
  process.exit(code);
}

let seq = 0;
const stamp = Date.now();
const sockets = [];
async function connect(name, ip, referralCode) {
  const socket = io(URL, { transports: ['websocket'], extraHeaders: { 'fly-client-ip': ip } });
  sockets.push(socket);
  const state = { socket, name, clientId: `${name}E2E${stamp}${seq++}`, referral: null, reward: null, premium: null, matched: false };
  socket.on('referral-status', (r) => { state.referral = r; });
  socket.on('referral-reward', (r) => { state.reward = r; state.referral = r; });
  socket.on('premium-status', (p) => { state.premium = p; });
  socket.on('matched', () => { state.matched = true; });
  await until(() => socket.connected);
  socket.emit('register', { clientId: state.clientId, referralCode });
  await until(() => state.referral !== null);
  return state;
}

async function signUp(state) {
  const username = `u${state.name}${seq++}`.slice(0, 24);
  const email = `${username}@example.com`;
  const sent = new Promise((r) => state.socket.once('signup-code-result', r));
  state.socket.emit('signup-send-code', { username, email });
  const r = await sent;
  if (!r.ok) return r;
  let code = '';
  await until(() => {
    const m = new RegExp(`verification code for ${email.replace(/\./g, '\\.')} is (\\d{6})`).exec(logs);
    code = m ? m[1] : '';
    return !!code;
  }, 3000);
  const done = new Promise((res) => state.socket.once('signup-result', res));
  state.socket.emit('signup', { username, password: 'secret123', email, code });
  return done;
}

let strangerIp = 50;
// One real conversation with a fresh stranger (pairs that just parted are
// held apart for a while, so never reuse one).
async function realCall(state, ms = THRESHOLD_MS + 600) {
  const stranger = await connect('stranger', `198.51.${strangerIp++}.7`);
  state.matched = false;
  state.socket.emit('find-partner', { mode: 'talk' });
  await wait(200);
  stranger.socket.emit('find-partner', { mode: 'talk' });
  const matched = await until(() => state.matched && stranger.matched);
  await wait(ms);
  state.socket.emit('leave');
  await wait(600);
  stranger.socket.close();
  return matched;
}

async function refreshOwner(owner) {
  owner.referral = null;
  owner.socket.emit('get-referral-link');
  await until(() => owner.referral !== null);
  return owner.referral;
}

(async () => {
  for (let i = 0; i < 60; i++) {
    try { await fetch(URL + '/healthz'); break; } catch (_) { await wait(250); }
  }

  // --- Sign-up needs a verified email ------------------------------------
  const noCode = await connect('nocode', '203.0.113.9');
  const missing = await new Promise((r) => {
    noCode.socket.once('signup-result', r);
    noCode.socket.emit('signup', { username: 'nocodeuser', password: 'secret123', email: 'nocode@example.com' });
  });
  ok('sign-up without a code is refused', missing.ok === false, missing);
  const noEmail = await new Promise((r) => {
    noCode.socket.once('signup-code-result', r);
    noCode.socket.emit('signup-send-code', { username: 'noemailuser' });
  });
  ok('sign-up without an email is refused', noEmail.ok === false, noEmail);
  const sent = await new Promise((r) => {
    noCode.socket.once('signup-code-result', r);
    noCode.socket.emit('signup-send-code', { username: 'wrongcode', email: 'wrong@example.com' });
  });
  ok('a code is sent for valid details', sent.ok === true, sent);
  const wrong = await new Promise((r) => {
    noCode.socket.once('signup-result', r);
    noCode.socket.emit('signup', { username: 'wrongcode', password: 'secret123', email: 'wrong@example.com', code: '000000' });
  });
  ok('a wrong code is refused', wrong.ok === false && wrong.errorKey === 'signupCode', wrong);

  // --- The inviter -------------------------------------------------------
  const owner = await connect('owner', '10.1.1.5');
  ok('a fresh user has no code until they ask', owner.referral.code === '');
  const ownerAcc = await signUp(owner);
  ok('inviter signs up with an emailed code', ownerAcc.ok === true, ownerAcc);
  const code = (await refreshOwner(owner)).code;
  ok('code is minted on demand', /^[A-Z0-9]{7}$/.test(code || ''));
  ok('progress starts at 0 of 3', owner.referral.progress === 0 && owner.referral.needed === 3, owner.referral);

  // --- Invites that must not count ---------------------------------------
  // Opened the link and talked, but never made an account.
  const lurker = await connect('lurker', '10.9.0.1', code);
  ok('lurker had a real call', await realCall(lurker));
  // Signed up, but from the inviter's own network.
  const sameNet = await connect('samenet', '10.1.1.77', code);
  ok('same-network friend signs up', (await signUp(sameNet)).ok === true);
  ok('same-network friend had a real call', await realCall(sameNet));
  // Signed up, but only ever skipped instantly.
  const skipper = await connect('skipper', '10.8.0.1', code);
  ok('skipper signs up', (await signUp(skipper)).ok === true);
  ok('skipper was matched', await realCall(skipper, 100));
  ok('none of those count', (await refreshOwner(owner)).verified === 0, owner.referral);

  // --- Real friends ------------------------------------------------------
  const f1 = await connect('friendone', '10.2.0.1', code);
  ok('friend 1 signs up', (await signUp(f1)).ok === true);
  ok('friend 1 had a real call', await realCall(f1));
  ok('friend 1 counts', (await refreshOwner(owner)).verified === 1, owner.referral);
  ok('the invited friend gets no Plus', !(f1.premium && f1.premium.premium), f1.premium);

  // Same /24 as friend 1: one person on one network, not a new friend.
  const f1Twin = await connect('friendtwin', '10.2.0.99', code);
  ok('a second account from friend 1\'s network signs up', (await signUp(f1Twin)).ok === true);
  ok('it had a real call', await realCall(f1Twin));
  ok('a repeat network does not count', (await refreshOwner(owner)).verified === 1, owner.referral);

  const f2 = await connect('friendtwo', '10.3.0.1', code);
  ok('friend 2 signs up', (await signUp(f2)).ok === true);
  ok('friend 2 had a real call', await realCall(f2));
  ok('2 of 3, no reward yet', owner.reward === null && (await refreshOwner(owner)).progress === 2, owner.referral);

  const f3 = await connect('friendthree', '10.4.0.1', code);
  ok('friend 3 signs up', (await signUp(f3)).ok === true);
  ok('friend 3 had a real call', await realCall(f3));
  ok('inviter is told about the reward', await until(() => owner.reward !== null, 5000));
  ok('the reward is 1 hour', owner.reward && owner.reward.hours === 1, owner.reward);
  await until(() => owner.premium && owner.premium.premium === true, 4000);
  ok('inviter has Plus', owner.premium && owner.premium.premium === true, owner.premium);
  const left = owner.premium && owner.premium.expiresAt - Date.now();
  ok('and it lasts about an hour', left > 55 * 60000 && left <= 60 * 60000, left);

  // Another call from a counted friend must not count again.
  owner.reward = null;
  ok('friend 3 had another call', await realCall(f3));
  ok('a friend counts exactly once', owner.reward === null && (await refreshOwner(owner)).verified === 3, owner.referral);

  for (const s of sockets) s.close();
  console.log(failed ? `\n${failed} FAILED` : '\nall passed');
  finish(failed ? 1 : 0);
})().catch((err) => { console.error('ERR', err); finish(1); });
