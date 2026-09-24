// Load check for the social layer: 2,000 seeded users (friends in a ring, full
// recent-people lists), 300 live sockets messaging, asking and dropping at
// once. Prints delivery counts and how long the server's event loop stalls.
//
//   npm run test:social-load
const fs = require('fs'); const os = require('os'); const path = require('path');
const { spawn } = require('child_process');
const REPO = path.join(__dirname, '..', '..');
const { io } = require(REPO + '/node_modules/socket.io-client');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const N = 2000, LIVE = 300;
const id = (i) => 'c_load_' + String(i).padStart(6, '0');
const pk = (a, b) => [a, b].sort().join('|');
const now = Date.now();
const friends = {}, hist = {};
for (let i = 0; i < N; i++) {
  friends[id(i)] = {};
  for (const d of [1, 2]) {
    const j = (i + d) % N, k = (i - d + N) % N;
    for (const o of [j, k]) friends[id(i)][id(o)] = { username: 'U' + o, countryCode: 'US', temporary: true };
  }
  hist[id(i)] = Array.from({ length: 20 }, (_, x) => ({ clientId: id((i + 10 + x) % N), username: 'U' + ((i + 10 + x) % N), countryCode: 'US', mode: 'chat', ts: now - x * 1000 }));
}
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-load-'));
fs.writeFileSync(path.join(dir, 'owner-data.json'), JSON.stringify({ social: { friends, chatHistory: hist, friendChats: {}, notifications: {}, friendRequests: {}, sentRequests: {}, blocks: {}, lastSeen: {}, blockMeta: {}, chatClears: {} } }));
const PORT = 6899;
const srv = spawn(process.execPath, [REPO + '/server/index.js'], { env: { ...process.env, PORT: String(PORT), DATA_DIR: dir, NODE_ENV: 'development', IDENTITY_SECRET: 'social-load-secret' }, stdio: ['ignore', 'pipe', 'pipe'] });
const logs = []; srv.stderr.on('data', (d) => logs.push(String(d)));
(async () => {
  const base = `http://127.0.0.1:${PORT}`;
  for (let i = 0; i < 80; i++) { try { await fetch(base + '/healthz'); break; } catch (_) { await wait(250); } }
  const t0 = Date.now();
  const socks = [];
  for (let i = 0; i < LIVE; i++) {
    const s = io(base, { transports: ['websocket'], forceNew: true });
    s.got = 0; s.notifs = 0; s.syncs = 0;
    s.on('friend-message', () => s.got++);
    s.on('notification', (n) => { if (n.type === 'message') s.notifs++; });
    s.on('state-sync', () => s.syncs++);
    // Seeded identities own friends, so each signs in with its token.
    const token = require('crypto').createHmac('sha256', 'social-load-secret').update(id(i)).digest('hex');
    s.emit('register', { clientId: id(i), identityToken: token, nickname: 'U' + i });
    socks.push(s);
    if (i % 50 === 0) await wait(50);
  }
  await wait(1500);
  console.log('connect 300 (with presence fan-out):', Date.now() - t0, 'ms; syncs received', socks.reduce((a, s) => a + s.syncs, 0));
  // Ping latency while idle.
  const lat = async () => { const t = Date.now(); await fetch(base + '/healthz'); return Date.now() - t; };
  console.log('idle healthz ms', await lat());
  // Every live bot messages its +1 friend 5 times (some are offline -> stored).
  const t1 = Date.now();
  let lats = [];
  const pinger = setInterval(async () => lats.push(await lat()), 50);
  for (let r = 0; r < 5; r++) {
    socks.forEach((s, i) => s.emit('friend-message', { toClientId: id((i + 1) % N), text: 'hello ' + r, id: `m${i}_${r}` }));
    await wait(1100); // stay under the 10 per 5s rate limit
  }
  await wait(1000);
  clearInterval(pinger);
  const delivered = socks.reduce((a, s) => a + s.got, 0);
  const expected = (LIVE - 1) * 5; // bot 0..298 target 1..299 live; 299 targets 300 (offline)
  console.log('messages delivered live', delivered, 'expected', expected, 'in', Date.now() - t1, 'ms; max healthz latency under load', Math.max(...lats), 'ms');
  console.log('unread notifications live', socks.reduce((a, s) => a + s.notifs, 0));
  // Friend request storm: every bot asks its +10 history person.
  const t2 = Date.now();
  let res = 0;
  socks.forEach((s) => s.once('friend-request-result', (r) => { if (r.ok) res++; }));
  socks.forEach((s, i) => s.emit('friend-request', { targetClientId: id((i + 10) % N) }));
  await wait(2500);
  console.log('friend requests ok', res, '/', LIVE, 'in', Date.now() - t2, 'ms');
  // Mass disconnect (presence fan-out to watchers).
  const t3 = Date.now();
  socks.forEach((s) => s.disconnect());
  await wait(500);
  console.log('mass disconnect settled; healthz', await lat(), 'ms (', Date.now() - t3, 'ms)');
  const bad = delivered !== expected || res !== LIVE;
  console.log(bad ? 'FAIL' : 'PASS', 'social load');
  console.log('errors:', logs.join('').slice(-800) || 'none');
  srv.kill('SIGKILL'); fs.rmSync(dir, { recursive: true, force: true }); process.exit(bad ? 1 : 0);
})();
