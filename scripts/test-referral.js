/*
 * End-to-end test of the referral loop, driven entirely through Socket.IO
 * against a real server - the same surface a browser uses, so it exercises the
 * real claim, match, qualify and reward path rather than the store in
 * isolation.
 *
 * Run:
 *   node scripts/test-referral.js      (or: npm run test:referral)
 *
 * It boots its own server against a throwaway DATA_DIR, exactly like
 * test-matchmaking.js. It used to expect one to be started by hand, so the npm
 * script failed on the first assertion for anyone who did not read this header.
 * Point it at a server you started yourself with URL=http://localhost:5099.
 *
 * REAL_CONVERSATION_MS shortens the "was this a real conversation" threshold so
 * the test does not have to hold a call open for a minute. Everything else is
 * production behaviour.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const OWN_PORT = 5099 + Math.floor(Math.random() * 300);
const URL = process.env.URL || `http://127.0.0.1:${OWN_PORT}`;
// Only boot a server when the caller did not point us at one.
const BOOT_OWN_SERVER = !process.env.URL;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-referral-'));
const THRESHOLD_MS = Number(process.env.REAL_CONVERSATION_MS) || 1500;
let failed = 0;
const ok = (name, cond) => { if (!cond) failed++; console.log(cond ? 'PASS' : 'FAIL', name); };

function connect(clientId) {
  const socket = io(URL, { transports: ['websocket'] });
  const state = { socket, clientId, referral: null, reward: null, premium: null, matched: false, left: false, token: undefined };
  // The server refuses a re-registration that does not present the token it
  // issued, so hold on to it the way the browser client does.
  socket.on('identity-token', ({ token } = {}) => { state.token = token; });
  socket.on('referral-status', (r) => { state.referral = r; });
  socket.on('referral-reward', (r) => { state.reward = r; });
  socket.on('premium-status', (p) => { state.premium = p; });
  socket.on('matched', () => { state.matched = true; });
  socket.on('partner-left', () => { state.left = true; });
  return state;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 8000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (fn()) return true;
    await wait(100);
  }
  return false;
}

let server = null;
function bootServer() {
  if (!BOOT_OWN_SERVER) return;
  server = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: {
      ...process.env,
      PORT: String(OWN_PORT),
      DATA_DIR,
      REAL_CONVERSATION_MS: String(THRESHOLD_MS),
      NODE_ENV: 'development',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // Swallowed rather than inherited: a passing run should print assertions, not
  // the server's boot banner.
  server.stdout.on('data', () => {});
  server.stderr.on('data', () => {});
}

function finish(code) {
  if (server) { try { server.kill('SIGKILL'); } catch (_) { /* already gone */ } }
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
  process.exit(code);
}

(async () => {
  bootServer();
  for (let i = 0; i < 40; i++) {
    try { await fetch(URL + '/healthz'); break; } catch (_) { await wait(250); }
  }
  const stamp = Date.now();
  const owner = connect(`ownerE2E${stamp}`);
  const friend = connect(`friendE2E${stamp}`);
  const stranger = connect(`strangerE2E${stamp}`);

  ok('all three clients connected', await until(() =>
    owner.socket.connected && friend.socket.connected && stranger.socket.connected));

  owner.socket.emit('register', { clientId: owner.clientId });
  ok('registering returns referral status', await until(() => owner.referral !== null));
  ok('a fresh user has no code until they ask', owner.referral.code === '');

  owner.socket.emit('get-referral-link');
  await until(() => owner.referral && owner.referral.code);
  const code = owner.referral.code;
  ok('code is minted on demand', /^[A-Z0-9]{7}$/.test(code || ''));

  // Self-referral must earn nothing, even though the code is valid.
  owner.socket.emit('register', { clientId: owner.clientId, identityToken: owner.token, referralCode: code });
  await wait(400);
  ok('self-referral is not counted', owner.referral.joined === 0);

  friend.socket.emit('register', { clientId: friend.clientId, referralCode: code });
  ok('invited user registers', await until(() => friend.referral !== null));

  owner.socket.emit('get-referral-link');
  ok('owner sees the join', await until(() => owner.referral && owner.referral.joined === 1));
  ok('the join has not qualified yet', owner.referral.qualified === 0);
  ok('clicking a link alone grants no premium',
    friend.premium && friend.premium.premium === false);

  // A conversation that ends immediately must not pay out.
  stranger.socket.emit('register', { clientId: stranger.clientId });
  await wait(300);
  friend.socket.emit('find-partner', { mode: 'talk' });
  await wait(300);
  stranger.socket.emit('find-partner', { mode: 'talk' });
  ok('invited user got matched', await until(() => friend.matched && stranger.matched));
  friend.socket.emit('skip');
  await wait(600);
  owner.socket.emit('get-referral-link');
  await wait(400);
  ok('an instant skip does not qualify', owner.referral.qualified === 0);
  ok('no reward for an instant skip', owner.reward === null);

  // Now a conversation that lasts past the threshold - with someone new.
  //
  // Not with the same stranger: a pair that just parted is deliberately held
  // apart for a minute (see PAIR_COOLDOWN_MS), so asking these two to rematch
  // asks the matcher to break the rule the matchmaking test pins down. This
  // check was failing for exactly that reason, and the referral loop does not
  // care who the second conversation is with.
  const secondPartner = connect(`secondE2E${stamp}`);
  ok('a second stranger connected', await until(() => secondPartner.socket.connected));
  secondPartner.socket.emit('register', { clientId: secondPartner.clientId });
  await wait(300);
  friend.matched = false;
  friend.socket.emit('find-partner', { mode: 'talk' });
  await wait(300);
  secondPartner.socket.emit('find-partner', { mode: 'talk' });
  ok('matched for the real conversation', await until(() => friend.matched && secondPartner.matched));

  const threshold = THRESHOLD_MS;
  await wait(threshold + 600);
  friend.socket.emit('leave');

  ok('owner is told about the reward', await until(() => owner.reward !== null, 5000));
  ok('reward is a number of days', owner.reward && owner.reward.days > 0);
  ok('owner sees the qualified count', owner.reward.qualified === 1);

  // Both sides must be premium now - and must have been told without having to
  // reload, since the grant happened mid-session.
  await until(() => owner.premium && owner.premium.premium === true, 4000);
  ok('inviter is premium', owner.premium && owner.premium.premium === true);
  ok('inviter premium expires (it is a reward, not a permanent grant)',
    owner.premium && typeof owner.premium.expiresAt === 'number');
  await until(() => friend.premium && friend.premium.premium === true, 4000);
  ok('invited user is premium too', friend.premium && friend.premium.premium === true);

  // A second qualifying call from the same invited user must not pay again.
  owner.reward = null;
  const thirdPartner = connect(`thirdE2E${stamp}`);
  thirdPartner.socket.emit('register', { clientId: thirdPartner.clientId });
  await wait(300);
  friend.matched = false;
  friend.socket.emit('find-partner', { mode: 'talk' });
  await wait(300);
  thirdPartner.socket.emit('find-partner', { mode: 'talk' });
  ok('matched for a second qualifying call', await until(() => friend.matched && thirdPartner.matched));
  await wait(threshold + 600);
  friend.socket.emit('leave');
  await wait(1200);
  ok('a referral pays out exactly once', owner.reward === null);

  for (const c of [owner, friend, stranger, secondPartner, thirdPartner]) c.socket.close();
  console.log(failed ? `\n${failed} FAILED` : '\nall passed');
  finish(failed ? 1 : 0);
})().catch((err) => { console.error('ERR', err); finish(1); });
