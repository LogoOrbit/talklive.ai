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

// Connects and registers; resolves with the socket and the ID it was given.
async function connect(clientId, extra = {}) {
  const sock = io(BASE, { transports: ['websocket'], forceNew: true });
  sock.on('state-sync', (s) => lastSync.set(sock, s));
  const idEvent = once(sock, 'friend-id');
  sock.emit('register', { clientId, nickname: clientId, gender: 'male', ...extra });
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
    ok('account ID is permanent and 8 characters', aSigned.id.temporary === false && /^[A-Z2-9]{8}$/.test(accountId), JSON.stringify(aSigned.id));
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

    aAfter.sock.disconnect();
    c.sock.disconnect();
  } catch (err) {
    failed++;
    console.log('FAIL', err.message);
    console.log(srv.logs.join('').slice(-2000));
  }
  console.log(failed ? `\n${failed} failure(s)` : '\nall passed');
  done(failed ? 1 : 0);
})();
