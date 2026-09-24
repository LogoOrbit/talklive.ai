// End-to-end check of public friend IDs: guests get a temporary "G-" ID that
// is retired when a new app session starts, accounts get a permanent 8-char ID
// that survives a restart, and an ID is enough to find and add someone.
//
//   node scripts/test-friend-id.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 6199 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-friendid-'));

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

const lastSync = new WeakMap();

// The signed identity token each clientId was issued, sent back on every
// later register exactly as a browser does - an identity that owns anything
// is not handed over without it.
const identityTokens = {};
function rememberToken(sock) {
  sock.on('identity-token', ({ clientId, token } = {}) => { identityTokens[clientId] = token; });
}

// Connects and registers; resolves with the socket and the ID it was given.
async function connect(clientId, extra = {}) {
  const sock = io(BASE, { transports: ['websocket'], forceNew: true });
  sock.on('state-sync', (s) => lastSync.set(sock, s));
  rememberToken(sock);
  const idEvent = once(sock, 'friend-id');
  sock.emit('register', { clientId, identityToken: identityTokens[clientId], nickname: clientId, gender: 'male', ...extra });
  if (extra.sessionToken) sock.emit('resume-session', { token: extra.sessionToken });
  return { sock, id: await idEvent };
}

async function search(sock, friendId) {
  const res = once(sock, 'find-by-friend-id-result');
  sock.emit('find-by-friend-id', { friendId });
  return res;
}

function startServer() {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', GIPHY_API_KEY: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  srv.logs = [];
  srv.stdout.on('data', (d) => srv.logs.push(String(d)));
  srv.stderr.on('data', (d) => srv.logs.push(String(d)));
  return srv;
}

async function waitUp() {
  for (let i = 0; i < 60; i++) {
    try { await fetch(BASE + '/healthz'); return; } catch (_) { await wait(250); }
  }
  throw new Error('server never came up');
}

(async () => {
  let srv = startServer();
  const done = (code) => {
    try { srv.kill('SIGKILL'); } catch (_) { /* gone */ }
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    process.exit(code);
  };

  try {
    await waitUp();

    // --- Guests ----------------------------------------------------------
    const a = await connect('c_fid_alpha', { freshSession: true });
    const b = await connect('c_fid_bravo', { freshSession: true });
    ok('guest ID is temporary', a.id.temporary === true, JSON.stringify(a.id));
    ok('guest ID looks like G-XXXXXX with letters and digits',
      /^G-[A-Z2-9]{6}$/.test(a.id.friendId) && /[0-9]/.test(a.id.friendId.slice(2)) && /[A-Z]/.test(a.id.friendId.slice(2)),
      a.id.friendId);
    ok('two guests get different IDs', a.id.friendId !== b.id.friendId);

    const found = await search(a.sock, ` #${b.id.friendId.toLowerCase()} `);
    ok('search by ID finds the guest (case and punctuation ignored)',
      found.ok && found.user.clientId === 'c_fid_bravo' && found.user.temporary, JSON.stringify(found));
    ok('own ID is refused', (await search(a.sock, a.id.friendId)).self === true);
    ok('malformed ID is refused', (await search(a.sock, 'abc')).ok === false);
    ok('unknown ID is not found', (await search(a.sock, 'G-ZZZZZZ')).ok === false);

    // --- Shareable link ------------------------------------------------
    const link = await fetch(`${BASE}/add/${b.id.friendId.toLowerCase()}`, { redirect: 'manual' });
    ok('/add/<id> redirects into the app with the ID', link.status === 302
      && link.headers.get('location') === `/?add=${encodeURIComponent(b.id.friendId)}`, link.headers.get('location'));
    const badLink = await fetch(`${BASE}/add/nope`, { redirect: 'manual' });
    ok('/add/<junk> goes home', badLink.status === 302 && badLink.headers.get('location') === '/');

    // --- Adding by ID without ever having met ----------------------------
    const bGotRequest = once(b.sock, 'state-sync');
    const sent = once(a.sock, 'friend-request-result');
    a.sock.emit('friend-request', { targetClientId: 'c_fid_bravo', friendId: b.id.friendId });
    ok('friend request by ID is sent', (await sent).sent === true);
    await bGotRequest;
    ok('recipient sees the request',
      ((lastSync.get(b.sock) || {}).friendRequests || []).some((r) => r.clientId === 'c_fid_alpha'));

    const strangerRefused = once(a.sock, 'friend-request-result');
    a.sock.emit('friend-request', { targetClientId: 'c_fid_nobody_met' });
    ok('without an ID a stranger still cannot be added', (await strangerRefused).ok === false);

    // --- Friends are unlimited for everyone ------------------------------
    const crowd = [];
    for (let i = 0; i < 7; i++) crowd.push(await connect(`c_fid_crowd_${i}`, { freshSession: true }));
    for (const [i, p] of crowd.entries()) {
      const res = once(a.sock, 'friend-request-result');
      a.sock.emit('friend-request', { targetClientId: `c_fid_crowd_${i}`, friendId: p.id.friendId });
      await res;
      const accepted = once(p.sock, 'friend-request-result');
      p.sock.emit('friend-request', { targetClientId: 'c_fid_alpha' });
      ok(`crowd member ${i} becomes a friend`, (await accepted).accepted === true);
    }
    await wait(300);
    const friendCount = ((lastSync.get(a.sock) || {}).friends || []).filter((f) => f.clientId.startsWith('c_fid_crowd_')).length;
    ok('a free user can have more than 5 friends', friendCount === 7, friendCount);
    crowd.forEach((p) => p.sock.disconnect());

    // --- Guest ID lifetime -----------------------------------------------
    const oldGuestId = b.id.friendId;
    b.sock.disconnect();
    await wait(200);
    const bReload = await connect('c_fid_bravo');
    ok('a reload keeps the guest ID', bReload.id.friendId === oldGuestId, bReload.id.friendId);
    bReload.sock.disconnect();
    await wait(200);
    const bRelaunch = await connect('c_fid_bravo', { freshSession: true });
    ok('a new app session gets a new guest ID', bRelaunch.id.friendId !== oldGuestId);
    ok('the closed session\'s ID no longer resolves', (await search(a.sock, oldGuestId)).ok === false);

    // --- Guest name stability -------------------------------------------
    // 'register' is re-sent on every call start and reconnect. A guest with no
    // nickname must keep the generated name, or the stranger sees one name in
    // the call and another on the friend request.
    const g = io(BASE, { transports: ['websocket'], forceNew: true });
    const firstName = once(g, 'profile');
    const token = once(g, 'identity-token');
    g.emit('register', { clientId: 'c_fid_guestname', gender: 'male' });
    const name1 = (await firstName).username;
    const identityToken = (await token).token;
    const secondName = once(g, 'profile');
    g.emit('register', { clientId: 'c_fid_guestname', identityToken, gender: 'male' });
    const name2 = (await secondName).username;
    ok('a guest keeps its generated name across re-registers', !!name1 && name1 === name2, `${name1} vs ${name2}`);
    g.disconnect();

    // --- Accounts --------------------------------------------------------
    const signedUp = once(a.sock, 'signup-result');
    a.sock.emit('signup', { username: 'fidalpha', password: 'secret123' });
    const account = await signedUp;
    ok('signup works', account.ok, JSON.stringify(account));
    a.sock.disconnect();
    await wait(200);
    const aSigned = await connect('c_fid_alpha', { signedIn: true, sessionToken: account.sessionToken });
    const accountId = aSigned.id.friendId;
    ok('account gets a name#1234 ID it can edit', aSigned.id.temporary === false && aSigned.id.editable === true && /^[a-z0-9_.]{3,20}#\d{4}$/.test(accountId), JSON.stringify(aSigned.id));
    ok('the old guest ID is released on sign-in', (await search(bRelaunch.sock, a.id.friendId)).ok === false);
    const foundAccount = await search(bRelaunch.sock, accountId);
    ok('account is found by its ID', foundAccount.ok && foundAccount.user.clientId === 'c_fid_alpha' && !foundAccount.user.temporary, JSON.stringify(foundAccount));

    // Restart: the account keeps the same ID.
    aSigned.sock.disconnect();
    bRelaunch.sock.disconnect();
    await wait(1500); // let the debounced store write land
    srv.kill('SIGTERM');
    await new Promise((r) => srv.once('exit', r));
    srv = startServer();
    await waitUp();
    const aAfter = await connect('c_fid_alpha', { signedIn: true, sessionToken: account.sessionToken, freshSession: true });
    ok('account ID survives a restart', aAfter.id.friendId === accountId, `${aAfter.id.friendId} vs ${accountId}`);
    const c = await connect('c_fid_charlie', { freshSession: true });
    const offlineFound = await search(c.sock, accountId);
    ok('account is findable after restart', offlineFound.ok && offlineFound.user.clientId === 'c_fid_alpha', JSON.stringify(offlineFound));


    // --- Choosing an ID ----------------------------------------------------
    const setId = async (sock, handle) => { const r = once(sock, 'set-handle-result'); sock.emit('set-handle', { handle }); return r; };
    const guestTry = await setId(c.sock, 'guesty#1111');
    ok('a guest cannot choose an ID', guestTry.ok === false, JSON.stringify(guestTry));
    const chosen = await setId(aAfter.sock, 'Alpha.Wolf#0042');
    ok('an account can choose its ID (stored lowercase)', chosen.ok && chosen.friendId === 'alpha.wolf#0042', JSON.stringify(chosen));
    ok('the new ID finds them', (await search(c.sock, 'ALPHA.WOLF#0042')).ok);
    ok('the old ID no longer does', (await search(c.sock, accountId)).ok === false);
    ok('bad formats are explained', (await setId(aAfter.sock, 'a#1')).ok === false);
    const bSignup = once(c.sock, 'signup-result');
    c.sock.emit('signup', { username: 'fidcharlie', password: 'secret123' });
    const bAcc = await bSignup;
    c.sock.disconnect();
    await wait(200);
    const cSigned = await connect('c_fid_charlie', { signedIn: true, sessionToken: bAcc.sessionToken });
    const clash = await setId(cSigned.sock, 'alpha.wolf#0042');
    ok('someone else\'s ID is refused as already in use', clash.ok === false && clash.taken === true && /already in use/.test(clash.error), JSON.stringify(clash));
    const nameOnly = await setId(cSigned.sock, 'alpha.wolf');
    ok('a name alone gets a free number', nameOnly.ok && /^alpha\.wolf#\d{4}$/.test(nameOnly.friendId) && nameOnly.friendId !== 'alpha.wolf#0042', JSON.stringify(nameOnly));
    const foundChosen = await search(cSigned.sock, 'alpha.wolf#0042');
    ok('search results show the chosen ID', foundChosen.ok && foundChosen.user.friendId === 'alpha.wolf#0042', JSON.stringify(foundChosen));

    aAfter.sock.disconnect();
    cSigned.sock.disconnect();
  } catch (err) {
    failed++;
    console.log('FAIL', err.message);
    console.log(srv.logs.join('').slice(-2000));
  }
  console.log(failed ? `\n${failed} failure(s)` : '\nall passed');
  done(failed ? 1 : 0);
})();
