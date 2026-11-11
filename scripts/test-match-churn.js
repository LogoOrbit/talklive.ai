// A client that drops match after match within seconds of being paired is
// paused from matching, so it stops spoiling everyone else's calls, while
// people who behave keep matching normally.
//
//   node scripts/test-match-churn.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 6500 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-churn-'));

let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : extra);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const sockets = [];

let ipSeq = 10;
async function client(name) {
  const sock = io(BASE, { transports: ['websocket'], forceNew: true, extraHeaders: { 'fly-client-ip': `198.51.${ipSeq++}.9` } });
  sockets.push(sock);
  const st = { sock, matched: 0 };
  sock.on('matched', () => { st.matched += 1; });
  await new Promise((r) => sock.on('connect', r));
  const reg = new Promise((r) => sock.once('register-result', r));
  sock.emit('register', { clientId: `${name}x${Date.now()}${ipSeq}`, nickname: name, gender: 'male' });
  await reg;
  return st;
}
const until = async (fn, ms = 3000) => { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await wait(50); } return false; };

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', GIPHY_API_KEY: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const logs = [];
  srv.stdout.on('data', (d) => logs.push(String(d)));
  srv.stderr.on('data', (d) => logs.push(String(d)));
  try {
    await until(() => logs.join('').includes('running on port'), 15000);

    const bad = await client('dropper');
    // Six quick drops in a row: matched with a fresh person, gone at once.
    let drops = 0;
    for (let i = 0; i < 6; i++) {
      const before = bad.matched;
      bad.sock.emit('find-partner', { mode: 'talk' });
      await wait(150);
      const good = await client('good' + i);
      good.sock.emit('find-partner', { mode: 'talk' });
      if (await until(() => bad.matched > before)) { drops++; bad.sock.emit('leave'); }
      await wait(100);
      good.sock.emit('leave');
    }
    ok('the dropper was matched and dropped six times', drops === 6, drops);

    // Now paused: a new person searching is not handed to the dropper.
    const before = bad.matched;
    bad.sock.emit('find-partner', { mode: 'talk' });
    await wait(150);
    const a = await client('fresh-a');
    a.sock.emit('find-partner', { mode: 'talk' });
    await wait(800);
    ok('a paused dropper is not matched with anyone', bad.matched === before && a.matched === 0, { bad: bad.matched - before, a: a.matched });

    // People who behave still find each other straight away.
    const b = await client('fresh-b');
    b.sock.emit('find-partner', { mode: 'talk' });
    ok('two well-behaved people match normally', await until(() => a.matched === 1 && b.matched === 1));
  } catch (err) {
    failed++;
    console.log('FAIL', err.message);
  } finally {
    sockets.forEach((s) => s.close());
    // Wait for the server to exit first: a save still in progress re-created
    // files in the folder and the delete failed the run.
    await new Promise((r) => { srv.once('exit', r); srv.kill(); setTimeout(r, 3000); });
    try { fs.rmSync(DATA_DIR, { recursive: true, force: true }); } catch (_) { /* best effort */ }
    process.exit(failed ? 1 : 0);
  }
})();
