/*
 * End-to-end test of the referral loop, driven entirely through Socket.IO
 * against a running server - the same surface a browser uses, so it exercises
 * the real claim, match, qualify and reward path rather than the store in
 * isolation.
 *
 * Run:
 *   REAL_CONVERSATION_MS=1500 PORT=5099 node server/index.js &
 *   URL=http://localhost:5099 node scripts/test-referral.js
 *
 * REAL_CONVERSATION_MS shortens the "was this a real conversation" threshold so
 * the test does not have to hold a call open for a minute. Everything else is
 * production behaviour.
 */
const { io } = require('socket.io-client');

const URL = process.env.URL || 'http://localhost:5099';
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

(async () => {
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

  // Now a conversation that lasts past the threshold.
  friend.matched = false;
  stranger.matched = false;
  friend.socket.emit('find-partner', { mode: 'talk' });
  await wait(300);
  stranger.socket.emit('find-partner', { mode: 'talk' });
  ok('rematched for the real conversation', await until(() => friend.matched && stranger.matched));

  const threshold = Number(process.env.REAL_CONVERSATION_MS) || 60000;
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
  friend.matched = false;
  stranger.matched = false;
  friend.socket.emit('find-partner', { mode: 'talk' });
  await wait(300);
  stranger.socket.emit('find-partner', { mode: 'talk' });
  await until(() => friend.matched && stranger.matched);
  await wait(threshold + 600);
  friend.socket.emit('leave');
  await wait(1200);
  ok('a referral pays out exactly once', owner.reward === null);

  for (const c of [owner, friend, stranger]) c.socket.close();
  console.log(failed ? `\n${failed} FAILED` : '\nall passed');
  process.exit(failed ? 1 : 0);
})().catch((err) => { console.error('ERR', err); process.exit(1); });
