// Scripted clients are quarantined: matched only with each other, never with
// real people, while real people (including those the bots keep leaving) match
// normally.
//
//   node scripts/test-bot-quarantine.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 6500 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-botq-'));

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
  sock.emit('register', { clientId: (name.startsWith('BOT') ? 'c_BoT' : 'c_') + name.toLowerCase().replace(/[^a-z0-9]/g, '') + Date.now().toString(36) + ipSeq, nickname: name, gender: 'male' });
  await reg;
  return st;
}
const until = async (fn, ms = 3000) => { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await wait(50); } return false; };

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', GIPHY_API_KEY: '', QUARANTINE_FOREIGN_IDS: '1', QUARANTINE_SAMPLE: '4', QUARANTINE_LIMIT: '4' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const logs = [];
  srv.stdout.on('data', (d) => logs.push(String(d)));
  srv.stderr.on('data', (d) => logs.push(String(d)));
  try {
    await until(() => logs.join('').includes('running on port'), 15000);

    // An id neither our website nor our app would generate: never meets a real person.
    const bot1 = await client('BOT1');
    const real1 = await client('real1');
    bot1.sock.emit('find-partner', { mode: 'talk' });
    await wait(150);
    real1.sock.emit('find-partner', { mode: 'talk' });
    await wait(800);
    ok('a foreign-id client is not matched with a real person', bot1.matched === 0 && real1.matched === 0, { bot: bot1.matched, real: real1.matched });

    // ...but it still "works": it is matched with others like it, so it sees nothing to adapt to.
    const bot2 = await client('BOT2');
    bot2.sock.emit('find-partner', { mode: 'talk' });
    ok('foreign-id clients are matched with each other', await until(() => bot1.matched === 1 && bot2.matched === 1));

    // The real person waiting is matched as soon as another real person arrives.
    const real2 = await client('real2');
    real2.sock.emit('find-partner', { mode: 'talk' });
    ok('real people still match each other at once', await until(() => real1.matched === 1 && real2.matched === 1));
    real1.sock.emit('leave'); await wait(100);

    // Behaviour: a normal-looking id that ends every match within seconds.
    const dropper = await client('dropper');
    let drops = 0;
    for (let i = 0; i < 4; i++) {
      const before = dropper.matched;
      dropper.sock.emit('find-partner', { mode: 'talk' });
      await wait(120);
      const v = await client('victim' + i);
      v.sock.emit('find-partner', { mode: 'talk' });
      if (await until(() => dropper.matched > before)) { drops++; dropper.sock.emit('leave'); }
      await wait(100);
      v.sock.emit('leave');
    }
    ok('the dropper ended four matches at once', drops === 4, drops);
    const before = dropper.matched;
    dropper.sock.emit('find-partner', { mode: 'talk' });
    await wait(150);
    const real3 = await client('real3');
    real3.sock.emit('find-partner', { mode: 'talk' });
    await wait(800);
    ok('after that the dropper is quarantined from real people', dropper.matched === before && real3.matched === 0, { d: dropper.matched - before, r: real3.matched });
    const bot3 = await client('BOT3');
    bot3.sock.emit('find-partner', { mode: 'talk' });
    ok('and shares a pool with the other quarantined clients', await until(() => dropper.matched === before + 1 && bot3.matched === 1));

    // Someone on the receiving end of quick drops is not punished for them.
    real3.sock.emit('leave'); await wait(100);
    const victim = await client('patient');
    for (let i = 0; i < 5; i++) {
      const b4 = victim.matched;
      victim.sock.emit('find-partner', { mode: 'talk' });
      await wait(120);
      const q = await client('quitter' + i);
      q.sock.emit('find-partner', { mode: 'talk' });
      if (await until(() => victim.matched > b4)) q.sock.emit('leave');
      await wait(150);
    }
    const b5 = victim.matched;
    const real4 = await client('real4');
    victim.sock.emit('find-partner', { mode: 'talk' });
    await wait(120);
    real4.sock.emit('find-partner', { mode: 'talk' });
    ok('a person others keep leaving is still matched normally', await until(() => victim.matched === b5 + 1 && real4.matched === 1), { v: victim.matched - b5, r: real4.matched });
  } catch (err) {
    failed++;
    console.log('FAIL', err.message);
  } finally {
    sockets.forEach((s) => s.close());
    // Wait for the server to exit before deleting its folder: a save still in
    // progress re-created files in it and the delete failed the run.
    await new Promise((r) => { srv.once('exit', r); srv.kill(); setTimeout(r, 3000); });
    try { fs.rmSync(DATA_DIR, { recursive: true, force: true }); } catch (_) { /* best effort */ }
    process.exit(failed ? 1 : 0);
  }
})();
