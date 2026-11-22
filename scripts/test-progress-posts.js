/*
 * Points and levels, talk-time badges, covers, Plus faces and owner posts
 * (docs/SPEC-PROFILE-PROGRESS-POSTS.md).
 *
 * Run:  node scripts/test-progress-posts.js   (or: npm run test:progress)
 *
 * The first half is module-level (server/badges.js, progress.js, posts.js with
 * a fake store). The second boots a real server against a throwaway DATA_DIR
 * and drives it over Socket.IO and HTTP. Sign-up codes are read from the
 * server's output (development prints them when SMTP is not set); networks are
 * faked with the fly-client-ip header. The owner's posts are seeded into the
 * data file before the server starts, since writing them needs the dashboard.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const Badges = require('../server/badges');
const Progress = require('../server/progress');
const Posts = require('../server/posts');

let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : JSON.stringify(extra));
};
const crypto = require('crypto');
const SECRET = 'progress-test-secret-' + Date.now();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Badges ------------------------------------------------------------------
{
  const H = 3600;
  ok('no time, no badge', Badges.badgesForSeconds(0).top === null && Badges.badgesForSeconds(0).earned.length === 0);
  ok('just under 1 hour: none', Badges.badgesForSeconds(H - 1).top === null);
  ok('1 hour: b1', Badges.badgesForSeconds(H).top === 'b1');
  ok('12.4 hours: b3, three earned', (() => {
    const b = Badges.badgesForSeconds(12.4 * H);
    return b.top === 'b3' && b.earned.join() === 'b1,b2,b3' && b.hours === 12.4;
  })());
  ok('every threshold flips exactly at its hours', Badges.BADGES.every((b, i) => {
    const below = Badges.badgesForSeconds(b.hours * H - 1);
    const at = Badges.badgesForSeconds(b.hours * H);
    return at.top === b.id && at.earned.length === i + 1 && below.earned.length === i;
  }));
  ok('ten badges, the last at 2500 hours', Badges.BADGES.length === 10 && Badges.BADGES[9].id === 'b10' && Badges.BADGES[9].hours === 2500);
  ok('garbage seconds are zero', Badges.badgesForSeconds(NaN).top === null && Badges.badgesForSeconds(-5).hours === 0);
  const fake = { data: { talkTime: { a: { seconds: 30 * H, username: 'Ann', country: 'UK' }, b: { seconds: 2 * H }, c: { seconds: 10 } } } };
  const view = Badges.dashboardView(fake);
  ok('dashboard lists people by hours with their badge', view.rows.length === 2 && view.rows[0].clientId === 'a' && view.rows[0].top === 'b4', view.rows);
  ok('dashboard counts per badge', view.badges.find((b) => b.id === 'b1').count === 2 && view.badges.find((b) => b.id === 'b4').count === 1);
}

// --- Verified accounts ---------------------------------------------------------
ok('google account is verified', Posts.isVerifiedAccount({ googleId: 'g1' }) && Posts.isVerifiedAccount({ google: { sub: 'x' } }));
ok('signup email (flag absent or true) is verified', Posts.isVerifiedAccount({ email: 'a@b.co' }) && Posts.isVerifiedAccount({ email: 'a@b.co', emailVerified: true }));
ok('unconfirmed email is not verified', !Posts.isVerifiedAccount({ email: 'a@b.co', emailVerified: false }));
ok('no email, no google, or no account is not verified', !Posts.isVerifiedAccount({ passwordHash: 'x' }) && !Posts.isVerifiedAccount(null));

// --- Progress, module level ------------------------------------------------------
{
  ok('levels follow points', Progress.levelOf(0) === 1 && Progress.levelOf(19) === 1 && Progress.levelOf(20) === 2 && Progress.levelOf(500) === 10);
  ok('tiers at 40, 100 and 200', Progress.tierOf(39) === 'none' && Progress.tierOf(40) === 'silver' && Progress.tierOf(100) === 'gold' && Progress.tierOf(200) === 'diamond');
  let t = 1000000;
  const store = { data: { progress: {}, referrals: { codes: { OWNERCODE7: 'owner', OTHERCODE7: 'other' } } }, save() {}, referralCodeFor: () => 'OWNERCODE7' };
  const pr = Progress.createProgress({ store, now: () => t });
  ok('can claim at first', pr.view('u1').canClaim === true && pr.view('u1').points === 0);
  const c1 = pr.claim('u1');
  ok('claim gives 1 point', c1.ok && c1.points === 1);
  const c2 = pr.claim('u1');
  ok('second claim the same day waits', c2.ok === false && c2.reason === 'wait' && c2.nextClaimAt === t + Progress.DAY_MS, c2);
  t += Progress.DAY_MS - 1;
  ok('still waiting a millisecond early', pr.claim('u1').ok === false);
  t += 1;
  ok('claim again after 24 hours', pr.claim('u1').ok === true && pr.view('u1').points === 2);
  store.data.progress.rich = { points: 99, lastClaimAt: 0, redeemedCode: '', invites: [], inviteBatchesPaid: 0 };
  ok('99 points is silver, next gold at 100', pr.view('rich').tier === 'silver' && pr.view('rich').nextTier === 'gold' && pr.view('rich').nextAt === 100);
  ok('special faces unlock by tier', pr.faceUnlocked('rich', 'c:silver_knight') && !pr.faceUnlocked('rich', 'c:gold_phoenix') && !pr.faceUnlocked('u1', 'c:silver_knight'));
  ok('a normal face is not special', !pr.faceUnlocked('rich', 'a:lion'));

  const good = { verified: true, accountCreatedAt: t - 1000, ownerHasAccount: () => true, sameDevice: () => false };
  const code = 'OWNERCODE7';
  ok('redeem needs a verified account', pr.redeem('n1', code, { ...good, verified: false }).reason === 'not-verified');
  ok('redeem needs an account under 7 days old', pr.redeem('n1', code, { ...good, accountCreatedAt: t - 8 * Progress.DAY_MS }).reason === 'too-old');
  ok('unknown code is invalid', pr.redeem('n1', 'NOPE', good).reason === 'invalid' && pr.redeem('n1', 'ZZZZZZZZZ', good).reason === 'invalid');
  ok('own code is refused', pr.redeem('owner', code, good).reason === 'own');
  ok('same network or device is refused', pr.redeem('n1', code, { ...good, sameDevice: () => true }).reason === 'same-device');
  const r1 = pr.redeem('n1', code.toLowerCase(), good);
  ok('a valid redeem gives the redeemer 10', r1.ok && r1.points === 10 && pr.view('n1').redeemed === true, r1);
  ok('the owner waits for 3 redeemers', pr.pointsOf('owner') === 0);
  ok('only one code per person', pr.redeem('n1', 'OTHERCODE7', good).reason === 'used');
  pr.redeem('n2', code, good);
  ok('2 redeemers: still nothing for the owner', pr.pointsOf('owner') === 0);
  pr.redeem('n3', code, good);
  ok('3 redeemers: owner gets 10', pr.pointsOf('owner') === 10 && pr.view('owner').invitesCounted === 3);
  pr.redeem('n4', code, good);
  pr.redeem('n5', code, good);
  ok('4-5 redeemers: still 10', pr.pointsOf('owner') === 10);
  pr.redeem('n6', code, good);
  ok('6 redeemers: 20', pr.pointsOf('owner') === 20);
}

// --- Posts, module level (owner routes with fake express objects) -----------------
{
  const store = { data: { posts: [] }, save() {}, audit() {} };
  const routes = {};
  const r = { get: (p, h) => { routes['GET ' + p] = h; }, post: (p, h) => { routes['POST ' + p] = h; } };
  const posts = Posts.createPosts({
    store, httpRateLimit: () => (req, res, next) => next(), validIdentityToken: () => true,
    isVerifiedClient: () => true, identify: () => ({ name: 'X' }), textCheck: () => null,
  });
  posts.mountOwner(r);
  const call = (route, req) => new Promise((resolve) => {
    const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(b) { resolve({ code: this.statusCode, body: b }); } };
    routes[route]({ params: {}, body: {}, ip: '1.1.1.1', ...req }, res);
  });
  (async () => {
    const empty = await call('POST /api/posts', { body: { text: '  ' } });
    ok('owner cannot publish an empty post', empty.code === 400);
    const a = (await call('POST /api/posts', { body: { text: 'first' } })).body.post;
    await wait(5);
    const b = (await call('POST /api/posts', { body: { text: 'second', image: 'https://x.test/a.png' } })).body.post;
    await wait(5);
    const bad = (await call('POST /api/posts', { body: { text: 'img', image: 'javascript:alert(1)' } })).body.post;
    ok('unsafe image links are dropped', bad.image === null);
    let list = (await call('GET /api/posts', {})).body.posts;
    ok('newest first', list[0].text === 'img' && list[2].id === a.id);
    await call('POST /api/posts/:id/pin', { params: { id: a.id }, body: { pinned: true } });
    list = (await call('GET /api/posts', {})).body.posts;
    ok('pinned goes on top', list[0].id === a.id && list[0].pinned === true);
    await call('POST /api/posts/:id', { params: { id: b.id }, body: { text: 'second, edited' } });
    list = (await call('GET /api/posts', {})).body.posts;
    ok('edit changes the text and stamps editedAt', list.find((p) => p.id === b.id).text === 'second, edited' && list.find((p) => p.id === b.id).editedAt > 0);
    const reply = (await call('POST /api/posts/:id/reply', { params: { id: a.id }, body: { text: 'Thanks!' } })).body.post;
    ok('owner reply is an admin comment from TalkLive', reply.comments[0].admin === true && reply.comments[0].name === 'TalkLive');
    store.data.posts.find((p) => p.id === a.id).comments.push({ id: 'cz', clientId: 'someone1', name: 'S', text: 'hello', ts: 1 });
    await call('POST /api/posts/:id/comments/:cid/hide', { params: { id: a.id, cid: 'cz' }, body: { hidden: true } });
    ok('hidden comments leave the public view but not the owner view',
      Posts.publicPost(store.data.posts.find((p) => p.id === a.id), '').comments.length === 1
      && (await call('GET /api/posts', {})).body.posts.find((p) => p.id === a.id).comments.length === 2);
    await call('POST /api/posts/:id/comments/:cid/delete', { params: { id: a.id, cid: 'cz' } });
    ok('comment can be deleted', store.data.posts.find((p) => p.id === a.id).comments.length === 1);
    await call('POST /api/posts/:id/delete', { params: { id: a.id } });
    ok('post can be deleted', !store.data.posts.some((p) => p.id === a.id));
    await server_tests();
  })().catch((err) => { console.error('ERR', err); finish(1); });
}

// --- Real server -----------------------------------------------------------------
const PORT = 5399 + Math.floor(Math.random() * 300);
const URL = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-progress-'));
let logs = '';
let server = null;
function finish(code) {
  try { if (server) server.kill('SIGKILL'); } catch (_) { /* already gone */ }
  try { fs.rmSync(DATA_DIR, { recursive: true, force: true }); } catch (_) { /* ignore */ }
  process.exit(code);
}
async function until(fn, ms = 8000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (fn()) return true;
    await wait(100);
  }
  return false;
}

let seq = 0;
const stamp = Date.now();
const sockets = [];
async function connect(name, ip, extra = {}) {
  const socket = io(URL, { transports: ['websocket'], extraHeaders: { 'fly-client-ip': ip } });
  sockets.push(socket);
  const st = { socket, name, clientId: `${name}PP${stamp}${seq++}`, token: '', sync: null, look: null, premium: null, progress: null, friendId: '', tokens: 0 };
  socket.on('identity-token', (d) => { if (d && d.token) { st.tokens++; st.token = d.token; if (d.clientId) st.clientId = d.clientId; } });
  socket.on('state-sync', (d) => { st.sync = d; });
  socket.on('profile-look', (d) => { st.look = d; });
  socket.on('premium-status', (d) => { st.premium = d; });
  socket.on('progress', (d) => { st.progress = d; });
  socket.on('friend-id', (d) => { if (d && d.friendId) st.friendId = d.friendId; });
  await until(() => socket.connected);
  await register(st, extra);
  return st;
}
async function register(st, extra = {}) {
  const had = st.token;
  const n = st.tokens;
  st.socket.emit('register', { clientId: st.clientId, identityToken: had || undefined, ...extra });
  await until(() => st.tokens > n);
}
const ack = (st, event, payload) => new Promise((resolve) => {
  if (payload === undefined) st.socket.emit(event, resolve); else st.socket.emit(event, payload, resolve);
});

async function signUp(st) {
  const username = `u${st.name}${seq++}`.slice(0, 24);
  const email = `${username}@example.com`;
  const sent = new Promise((r) => st.socket.once('signup-code-result', r));
  st.socket.emit('signup-send-code', { dob: '1990-01-01', username, email });
  const r = await sent;
  if (!r.ok) return r;
  let code = '';
  await until(() => {
    const m = new RegExp(`verification code for ${email.replace(/\./g, '\\.')} is (\\d{6})`).exec(logs);
    code = m ? m[1] : '';
    return !!code;
  }, 3000);
  const done = new Promise((res) => st.socket.once('signup-result', res));
  st.socket.emit('signup', { dob: '1990-01-01', username, password: 'secret123', email, code });
  const res = await done;
  if (res.ok && res.profileClientId) {
    st.clientId = res.profileClientId;
    const n = st.tokens;
    st.socket.emit('register', { clientId: res.profileClientId, identityToken: res.identityToken });
    await until(() => st.tokens > n);
  }
  return res;
}

const api = (p, opts = {}) => fetch(URL + p, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } })
  .then(async (r) => ({ code: r.status, body: await r.json().catch(() => ({})) }));

async function server_tests() {
  // Seed two owner posts before the server first reads its data.
  const now = Date.now();
  const mk = (id, text, extra) => ({ id, text, createdAt: now - 1000, pinned: false, reactions: { like: [], love: [], haha: [], wow: [], sad: [] }, comments: [], ...extra });
  fs.writeFileSync(path.join(DATA_DIR, 'owner-data.json'), JSON.stringify({
    // A Plus cover left behind on someone whose Plus has ended.
    covers: { lapsedcover0001: 'plus:aurora' },
    posts: [mk('pseed1', 'Welcome to TalkLive'), mk('pseed2', 'Pinned news', { pinned: true, createdAt: now - 5000, comments: [{ id: 'chid', clientId: 'x', name: 'Hidden', text: 'secret', ts: 1, hidden: true }, { id: 'cadm', clientId: '', name: 'TalkLive', text: 'hi from us', ts: 2, admin: true }] })],
  }));
  server = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PREMIUM_CLIENT_IDS: 'envplusclient01', IDENTITY_SECRET: SECRET, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', SMTP_HOST: '', RESEND_API_KEY: '', SMTP_USER: '', SMTP_PASS: '', DATABASE_URL: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (d) => { logs += String(d); });
  server.stderr.on('data', (d) => { logs += String(d); });
  for (let i = 0; i < 60; i++) {
    try { await fetch(URL + '/healthz'); break; } catch (_) { await wait(250); }
  }

  // --- Guest progress ---------------------------------------------------------
  const guest = await connect('guest', '203.0.113.10');
  const g0 = await ack(guest, 'progress-get');
  ok('progress-get: shape', g0 && g0.points === 0 && g0.level === 1 && g0.tier === 'none' && g0.nextTier === 'silver' && g0.nextAt === 40 && g0.canClaim === true && g0.code === '' && g0.redeemed === false && g0.invitesCounted === 0, g0);
  const c1 = await ack(guest, 'progress-claim');
  ok('claim gives a point', c1.ok === true && c1.points === 1 && c1.canClaim === false, c1);
  const c2 = await ack(guest, 'progress-claim');
  ok('claim twice in a day is refused with the next time', c2.ok === false && c2.reason === 'wait' && c2.nextClaimAt > Date.now(), c2);
  ok('server pushes progress after a claim', await until(() => guest.progress && guest.progress.points === 1, 3000), guest.progress);
  const gr = await ack(guest, 'progress-redeem', { code: 'ABCDEFG' });
  ok('a guest cannot redeem', gr.ok === false && gr.reason === 'not-verified', gr);

  // --- Accounts, codes and redeeming --------------------------------------------
  const owner = await connect('owner', '10.1.1.5');
  ok('owner signs up with an emailed code', (await signUp(owner)).ok === true);
  const o0 = await ack(owner, 'progress-get');
  ok('a signed-in account has a code', /^[A-Z0-9]{7}$/.test(o0.code || ''), o0);
  const own = await ack(owner, 'progress-redeem', { code: o0.code });
  ok('own code is refused', own.ok === false && own.reason === 'own', own);
  const bogus = await ack(owner, 'progress-redeem', { code: 'ZZZZZZZ' });
  ok('unknown code is invalid', bogus.ok === false && bogus.reason === 'invalid', bogus);

  const same = await connect('samenet', '10.1.1.77');
  ok('same-network friend signs up', (await signUp(same)).ok === true);
  const sr = await ack(same, 'progress-redeem', { code: o0.code });
  ok('a code from the same network is refused', sr.ok === false && sr.reason === 'same-device', sr);

  const friends = [];
  for (let i = 0; i < 3; i++) {
    const f = await connect('friend' + i, `10.${20 + i}.0.1`);
    ok(`friend ${i + 1} signs up`, (await signUp(f)).ok === true);
    const r = await ack(f, 'progress-redeem', { code: o0.code.toLowerCase() });
    ok(`friend ${i + 1} redeems for +10`, r.ok === true && r.points === 10, r);
    friends.push(f);
  }
  const again = await ack(friends[0], 'progress-redeem', { code: o0.code });
  ok('a second redeem is refused', again.ok === false && again.reason === 'used', again);
  const after = await ack(owner, 'progress-get');
  ok('owner earns 10 for every 3 redeemers', after.points === 10 && after.invitesCounted === 3, after);
  ok('owner is pushed the new points', await until(() => owner.progress && owner.progress.points === 10, 3000), owner.progress);

  // --- Special faces -----------------------------------------------------------
  await register(owner, { animal: 'c:silver_knight', avatar: 'c:silver_knight' });
  ok('a special face is refused before its tier', !owner.look && !/silver_knight/.test(JSON.stringify(owner.sync || {})) , owner.look);
  const claimed = await ack(owner, 'progress-claim');
  ok('owner can claim too', claimed.ok === true && claimed.points === 11);

  // --- Covers ------------------------------------------------------------------
  const free = await ack(owner, 'set-cover', { cover: 'grad:dawn' });
  ok('free cover accepted', free.ok === true && free.cover === 'grad:dawn', free);
  const plus = await ack(owner, 'set-cover', { cover: 'plus:aurora' });
  ok('Plus cover refused without Plus', plus.ok === false && plus.reason === 'plus', plus);
  const bad = await ack(owner, 'set-cover', { cover: 'grad:nope' });
  ok('unknown cover is invalid', bad.ok === false && bad.reason === 'invalid', bad);
  ok('the refused cover did not replace the free one', await (async () => {
    owner.sync = null;
    owner.socket.emit('register', { clientId: owner.clientId, identityToken: owner.token });
    await until(() => owner.sync !== null);
    return owner.sync.cover === 'grad:dawn';
  })(), owner.sync && owner.sync.cover);
  ok('own state carries badges and cover', owner.sync && owner.sync.badges && owner.sync.badges.top === null && Array.isArray(owner.sync.badges.earned) && owner.sync.badges.hours === 0, owner.sync && owner.sync.badges);

  // --- A Plus face without Plus is replaced -----------------------------------
  // (A person the server has never seen is taken as already wearing what they send.)
  const pf = await connect('plusface', '10.50.0.1', { animal: 'panda', avatar: 'a:panda' });
  ok('Plus face is replaced by a free one', await until(() => pf.look && pf.look.reason === 'plus-ended', 3000) && pf.look.face === 'a:lion', pf.look);
  ok('premium-status reports the face the server shows', pf.premium && pf.premium.face === 'a:lion' && pf.premium.cover === null, pf.premium);
  await register(pf, { animal: 'fox', avatar: 'a:fox' });
  ok('a free face stays', pf.premium && pf.premium.face === 'a:fox', pf.premium);

  // --- Plus covers follow Plus ---------------------------------------------------
  const plusUser = await connect('envplus', '10.55.0.1');
  plusUser.socket.close();
  const pu = io(URL, { transports: ['websocket'], extraHeaders: { 'fly-client-ip': '10.55.0.2' } });
  sockets.push(pu);
  await until(() => pu.connected);
  let puReg = null;
  pu.on('register-result', (d) => { puReg = d; });
  const plusToken = crypto.createHmac('sha256', SECRET).update('envplusclient01').digest('hex');
  let puStatus = null;
  pu.on('premium-status', (d) => { puStatus = d; });
  pu.emit('register', { clientId: 'envplusclient01', identityToken: plusToken, animal: 'panda', avatar: 'a:panda' });
  await until(() => puReg !== null);
  const pc = await ack({ socket: pu }, 'set-cover', { cover: 'plus:aurora' });
  ok('Plus keeps its Plus face', puStatus && puStatus.premium === true && puStatus.face === 'a:panda', puStatus);
  ok('Plus cover accepted with Plus', pc.ok === true && pc.cover === 'plus:aurora', pc);
  const lapsed = io(URL, { transports: ['websocket'], extraHeaders: { 'fly-client-ip': '10.55.0.3' } });
  sockets.push(lapsed);
  let lapsedSync = null;
  lapsed.on('state-sync', (d) => { lapsedSync = d; });
  await until(() => lapsed.connected);
  let lapsedReg = null;
  lapsed.on('register-result', (d) => { lapsedReg = d; });
  lapsed.emit('register', { clientId: 'lapsedcover0001' });
  await until(() => lapsedReg !== null);
  await until(() => lapsedSync !== null);
  ok('a Plus cover is reported as null once Plus is gone', lapsedSync.cover === null, lapsedSync.cover);

  // --- Friend rows -------------------------------------------------------------
  const a = await connect('rowa', '10.60.0.1');
  ok('rowa signs up', (await signUp(a)).ok === true);
  const b = await connect('rowb', '10.61.0.1');
  ok('rowb signs up', (await signUp(b)).ok === true);
  const bFriendId = (await until(() => b.friendId !== '', 4000)) ? b.friendId : null;
  if (bFriendId) {
    const found = await new Promise((res) => {
      a.socket.once('find-by-friend-id-result', res);
      a.socket.emit('find-by-friend-id', { friendId: bFriendId });
    });
    ok('find-by-friend-id carries badges and cover', found.ok === true && found.user.badges && found.user.badges.top === null && found.user.cover === null, found);
  } else {
    ok('rowb has a friend id', false, bFriendId);
  }

  // --- Posts over HTTP -----------------------------------------------------------
  const anon = await api('/api/posts');
  ok('posts list is public, pinned first, hidden comments left out', anon.code === 200 && anon.body.posts.length === 2 && anon.body.posts[0].id === 'pseed2' && anon.body.posts[0].commentCount === 1 && anon.body.posts[0].comments[0].admin === true, anon.body);
  ok('anonymous visitors cannot comment', anon.body.canComment === false);
  const mine = await api(`/api/posts?clientId=${encodeURIComponent(owner.clientId)}&identityToken=${owner.token}`);
  ok('a verified account can comment', mine.body.canComment === true, mine.body);

  const noToken = await api('/api/posts/pseed1/react', { method: 'POST', body: JSON.stringify({ clientId: guest.clientId, type: 'like' }) });
  ok('reacting needs a valid identity', noToken.code === 401, noToken);
  const react = (st, type) => api('/api/posts/pseed1/react', { method: 'POST', body: JSON.stringify({ clientId: st.clientId, identityToken: st.token, type }) });
  const r1 = await react(guest, 'like');
  ok('a guest may react', r1.code === 200 && r1.body.counts.like === 1 && r1.body.counts.total === 1 && r1.body.mine === 'like', r1);
  const r2 = await react(guest, 'love');
  ok('one reaction per person: it moves', r2.body.counts.like === 0 && r2.body.counts.love === 1 && r2.body.counts.total === 1 && r2.body.mine === 'love', r2.body);
  await react(owner, 'love');
  const r3 = await react(guest, null);
  ok('null removes it', r3.body.counts.love === 1 && r3.body.mine === null && r3.body.counts.total === 1, r3.body);
  const r4 = await react(guest, 'bogus');
  ok('unknown reaction type is refused', r4.code === 400, r4);

  const comment = (st, text) => api('/api/posts/pseed1/comments', { method: 'POST', body: JSON.stringify({ clientId: st.clientId, identityToken: st.token, text }) });
  const gc = await comment(guest, 'hello there');
  ok('a guest cannot comment', gc.code === 403 && gc.body.reason === 'verify', gc);
  const oc = await comment(owner, 'Nice update');
  ok('a verified account can comment', oc.code === 200 && oc.body.ok === true && oc.body.comment.text === 'Nice update' && oc.body.comment.name, oc);
  const link = await comment(owner, 'visit scam-site.com now');
  ok('links are blocked like in chat', link.code === 422 && link.body.reason === 'blocked', link);
  const long = await comment(owner, 'x '.repeat(260));
  ok('over 500 characters is refused', long.code === 400, long);
  let last = null;
  for (let i = 0; i < 6; i++) last = await comment(owner, `comment number ${i} is here`);
  ok('comments are rate limited per person', last.code === 429 && last.body.reason === 'rate', last);
  const view = await api('/api/posts');
  const p1 = view.body.posts.find((p) => p.id === 'pseed1');
  ok('comment counts update', p1.commentCount >= 2 && p1.comments[0].text === 'Nice update', p1);

  // --- The dashboard routes are not public -------------------------------------
  const adm = await api('/owner/api/posts');
  ok('owner posts API needs the dashboard login', adm.code === 401, adm);
  const adm2 = await api('/owner/api/badges');
  ok('owner badges API needs the dashboard login', adm2.code === 401, adm2);

  for (const s of sockets) s.close();
  console.log(failed ? `\n${failed} FAILED` : '\nall passed');
  finish(failed ? 1 : 0);
}
