// A report keeps the pair apart in random matching for a week, even after an unblock.

//
//   node scripts/test-report-avoid.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 7599 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-repav-'));
const SECRET = crypto.randomBytes(32).toString('hex');
const sign = (id) => crypto.createHmac('sha256', SECRET).update(id).digest('hex');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : JSON.stringify(extra));
};
function once(sock, ev, ms = 5000) {
  return new Promise((res, rej) => {
    const t = setTimeout(() => { sock.off(ev, on); rej(new Error('timeout ' + ev)); }, ms);
    function on(d) { clearTimeout(t); sock.off(ev, on); res(d); }
    sock.on(ev, on);
  });
}
const ask = (sock, ev, payload) => new Promise((res) => (payload === undefined ? sock.emit(ev, res) : sock.emit(ev, payload, res)));
function connect(id, name, deviceId) {
  const s = io(BASE, { transports: ['websocket'], forceNew: true });
  s.on('state-sync', (st) => { s.lastState = st; });
  s.emit('register', { clientId: id, nickname: name, gender: 'male', identityToken: sign(id), deviceId: deviceId || ('dev-' + id) });
  return s;
}
// The server sends a fresh state-sync after a match; keep the latest per socket.


(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', DATABASE_URL: '', IDENTITY_SECRET: SECRET, TRUST_TIERS: '0', MATCH_MODEL: '0' },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  const done = (code) => { try { srv.kill('SIGKILL'); } catch (_) { /* gone */ } fs.rmSync(DATA_DIR, { recursive: true, force: true }); process.exit(code); };
  try {
    for (let i = 0; i < 60; i++) { try { await fetch(BASE + '/healthz'); break; } catch (_) { await wait(250); } }
    const A = 'c_repav_aaaa1', B = 'c_repav_bbbb2';
    const a = connect(A, 'Ann');
    const b = connect(B, 'Ben');
    await wait(400);
    const m = Promise.all([once(a, 'matched'), once(b, 'matched')]);
    a.emit('find-partner', { mode: 'chat' });
    b.emit('find-partner', { mode: 'chat' });
    await m;
    ok('the two meet first', true);
    a.emit('report', { reason: 'harassment', detail: 'test' });
    await wait(400);
    // B comes back as a brand-new profile on the same phone (a reinstall, say).
    b.close();
    const b2 = connect('c_repav_bnew9', 'Ben2', 'dev-' + B);
    await wait(400);
    a.emit('stop-search');
    await wait(200);
    const again = once(a, 'matched', 3500).then(() => true, () => false);
    a.emit('find-partner', { mode: 'chat' });
    b2.emit('find-partner', { mode: 'chat' });
    ok('after a report they are not matched again, even on a new profile', (await again) === false);
    b2.emit('stop-search');
    // Control: the same steps without a report do bring two people back together.
    const D = 'c_repav_dddd4', E = 'c_repav_eeee5';
    const d = connect(D, 'Dee'); const e2 = connect(E, 'Eli');
    await wait(400);
    a.emit('stop-search');
    await wait(200);
    const m2 = Promise.all([once(d, 'matched'), once(e2, 'matched')]);
    d.emit('find-partner', { mode: 'chat' }); e2.emit('find-partner', { mode: 'chat' });
    await m2;
    e2.emit('find-partner', { mode: 'talk' });
    await wait(400);
    d.emit('stop-search'); d.emit('skip');
    await wait(300);
    const back = once(d, 'matched', 3500).then(() => true, () => false);
    d.emit('find-partner', { mode: 'chat' }); e2.emit('find-partner', { mode: 'chat' });
    ok('control: without a report the same two can meet again', await back);
    d.close(); e2.close();
    const C = 'c_repav_cccc3';
    const c = connect(C, 'Cy');
    await wait(300);
    const withC = once(c, 'matched', 6000).then(() => true, () => false);
    a.emit('find-partner', { mode: 'chat' });
    c.emit('find-partner', { mode: 'chat' });
    ok('both can still meet other people', await withC);
    a.close(); b2.close(); c.close();
  } catch (e) {
    failed++;
    console.log('FAIL exception', e.message);
  }
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
  done(failed ? 1 : 0);
})();
