// Unit checks for server/engage.js (streak, passport, weekly recap), plus an
// end-to-end check that a real call is counted on the server and sent back.
//
//   node scripts/test-engage.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');
const Engage = require('../server/engage');

let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : JSON.stringify(extra));
};
const DAY = 86400000;
const t0 = Date.UTC(2026, 9, 26, 12); // Monday 26 Oct 2026, noon UTC

// --- Pure logic --------------------------------------------------------------
let r = Engage.noteCall(null, { country: 'JP', seconds: 10, now: t0 });
ok('a call under 30s counts for nothing', !r.bump && !r.stamp && r.rec.streak.count === 0);
r = Engage.noteCall(null, { country: 'JP', seconds: 45, now: t0 });
ok('the first real call starts a streak and stamps the country', r.bump && r.bump.count === 1 && r.stamp && r.stamp.country === 'JP');
let rec = r.rec;
r = Engage.noteCall(rec, { country: 'JP', seconds: 60, now: t0 + 3600000 });
ok('a second call the same day changes neither', !r.bump && !r.stamp);
rec = Engage.noteCall(r.rec, { country: 'BR', seconds: 60, now: t0 + DAY }).rec;
ok('the next day grows the streak', rec.streak.count === 2 && rec.passport.length === 2);
r = Engage.noteCall(rec, { country: 'BR', seconds: 60, now: t0 + 3 * DAY });
ok('one missed day is saved by the weekly streak-saver', r.bump && r.bump.count === 3 && r.bump.saved);
ok('a lapsed streak reads as 0', Engage.view(r.rec, { now: t0 + 7 * DAY }).streak.count === 0);
const v = Engage.view(r.rec, { now: t0 + 7 * DAY });
ok('next week shows last week as the recap', v.prevWeek && v.prevWeek.calls === 4 && v.prevWeek.countries === 2, v.prevWeek);
ok('days follow the person\'s own zone', Engage.dayKey(Date.UTC(2026, 9, 26, 23, 30), 'Asia/Tokyo') === '2026-10-27');
const merged = Engage.merge(null, { streak: { count: 400, last: Engage.dayKey(t0), best: 400 }, passport: ['US', 'XX', 'ZZZ', 'IN'] }, { now: t0 });
ok('a browser\'s own copy is capped when carried over', merged.streak.count === 7 && merged.passport.join() === 'US,IN', merged);
const trusted = Engage.merge(merged, { streak: { count: 30, last: Engage.dayKey(t0) }, passport: ['DE'] }, { trusted: true, now: t0 });
ok('a guest profile moving into an account keeps its real streak', trusted.streak.count === 30 && trusted.passport.length === 3);

// --- End to end ---------------------------------------------------------------
const PORT = 6799 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-engage-'));
const IDENTITY_SECRET = crypto.randomBytes(32).toString('hex');
const sign = (id) => crypto.createHmac('sha256', IDENTITY_SECRET).update(id).digest('hex');
const wait = (ms) => new Promise((res) => setTimeout(res, ms));
function once(sock, ev, ms = 5000) {
  return new Promise((res, rej) => {
    const timer = setTimeout(() => { sock.off(ev, on); rej(new Error('timeout waiting for ' + ev)); }, ms);
    function on(d) { clearTimeout(timer); sock.off(ev, on); res(d); }
    sock.on(ev, on);
  });
}
function connect(name) {
  const clientId = 'c_engage_' + name;
  const sock = io(BASE, { transports: ['websocket'], forceNew: true });
  sock.emit('register', { clientId, username: name, identityToken: sign(clientId), timezone: 'Europe/London' });
  return sock;
}

(async () => {
  const start = () => spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', IDENTITY_SECRET, ENGAGE_GOOD_CALL_SECONDS: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const up = async () => {
    for (let i = 0; i < 60; i++) {
      try { await fetch(BASE + '/healthz'); return; } catch (_) { await wait(250); }
    }
  };
  let srv = start();
  const socks = [];
  try {
    await up();
    const a = connect('A');
    const b = connect('B');
    socks.push(a, b);
    const first = await once(a, 'engage-state');
    ok('register sends the saved state', first && first.streak && first.streak.count === 0, first);
    const merged = once(a, 'engage-state');
    a.emit('engage-merge', { streak: { count: 2, last: Engage.dayKey(Date.now(), 'Europe/London') }, passport: ['FR'] });
    const m = await merged;
    ok('a browser\'s own progress is carried over once', m.merged && m.streak.count === 2 && m.passport.includes('FR'), m);
    const again = once(a, 'engage-state');
    a.emit('engage-merge', { streak: { count: 5, last: Engage.dayKey(Date.now(), 'Europe/London') }, passport: ['IT'] });
    const m2 = await again;
    ok('and only once', m2.streak.count === 2 && !m2.passport.includes('IT'), m2);

    const ma = once(a, 'matched');
    a.emit('find-partner', { mode: 'talk' });
    await wait(150);
    b.emit('find-partner', { mode: 'talk' });
    await ma;
    await wait(1300);
    const update = once(a, 'engage-update');
    b.emit('leave');
    const u = await update.catch(() => null);
    ok('a real call is counted on the server', u && u.state && u.state.streak.doneToday === true, u);

    // A fresh socket for the same profile (another device) sees the same thing.
    a.close();
    await wait(300);
    const a2 = connect('A');
    socks.push(a2);
    const s2 = await once(a2, 'engage-state');
    ok('another device sees the same streak and stamps', s2.streak.count >= 2 && s2.passport.includes('FR'), s2);

    // Saved for good: a restart (a deploy) keeps it.
    socks.forEach((x) => { try { x.close(); } catch (_) { /* closed */ } });
    await wait(300);
    const exited = new Promise((res) => srv.once('exit', res));
    srv.kill('SIGTERM');
    await exited;
    srv = start();
    await up();
    const a3 = connect('A');
    socks.push(a3);
    const s3 = await once(a3, 'engage-state');
    ok('it survives a server restart', s3.streak.count >= 2 && s3.passport.includes('FR') && s3.streak.doneToday, s3);
  } catch (err) {
    console.error(err);
    failed++;
  }
  socks.forEach((s) => { try { s.close(); } catch (_) { /* closed */ } });
  try { srv.kill('SIGKILL'); } catch (_) { /* gone */ }
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
  process.exit(failed ? 1 : 0);
})();
