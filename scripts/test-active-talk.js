// Active-talk anti-cheat and silence auto-end (docs/SPEC-PROFILE-PROGRESS-POSTS.md, section 10).
//   - both sides send voice-activity -> active seconds counted (talkTime.active)
//   - one side silent (0 ms) -> 0 active seconds
//   - a side that sends nothing earns 0 and the call is never auto-ended
//   - bad payloads (wrong pairId, non-numbers) earn nothing
//   - both sides reporting silence -> silence-warning, then partner-left {reason:'silence'}
//   - still-here cancels the warning (silence-cleared) and the call carries on
//   - records from before the cutover keep their total as talkTime.base (badges stay)
//
// Timings are shortened with env overrides.
//
//   node scripts/test-active-talk.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');
const crypto = require('crypto');
const totp = require('../server/totp');
const SECRET = crypto.randomBytes(32).toString('hex');
const sign = (id) => crypto.createHmac('sha256', SECRET).update(id).digest('hex');

const PORT = 8200 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-active-'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : JSON.stringify(extra));
};
function once(sock, ev, ms = 6000) {
  return new Promise((res, rej) => {
    const t = setTimeout(() => { sock.off(ev, on); rej(new Error('timeout ' + ev)); }, ms);
    function on(d) { clearTimeout(t); sock.off(ev, on); res(d); }
    sock.on(ev, on);
  });
}
function maybe(sock, ev, ms) { return once(sock, ev, ms).catch(() => null); }

// A person who talked before the cutover: no base/active fields yet.
fs.writeFileSync(path.join(DATA_DIR, 'owner-data.json'), JSON.stringify({
  talkTime: { c_at_old: { seconds: 7200, calls: 12, longest: 900, lastAt: Date.now(), username: 'Oldtimer', country: 'India', days: {} } },
}));

const socks = [];
function connect(id) {
  const s = io(BASE, { transports: ['websocket'], forceNew: true });
  socks.push(s);
  s.events = [];
  for (const ev of ['silence-warning', 'silence-cleared', 'partner-left']) s.on(ev, (d) => s.events.push({ ev, d, at: Date.now() }));
  s.emit('register', { clientId: id, username: id.slice(5), gender: 'male', identityToken: sign(id) });
  return s;
}
// Two sockets matched with each other; resolves { a, b, pairId }.
async function pair(idA, idB) {
  const a = connect(idA);
  const b = connect(idB);
  await wait(400);
  const ma = once(a, 'matched');
  const mb = once(b, 'matched');
  a.emit('find-partner', { mode: 'talk' });
  await wait(100);
  b.emit('find-partner', { mode: 'talk' });
  const [m] = await Promise.all([ma, mb]);
  return { a, b, pairId: m.pairId };
}
// Sends reports every `every` ms until stop() is called.
function reporter(sock, pairId, spokeMs, every = 250) {
  const t = setInterval(() => sock.emit('voice-activity', { pairId, spokeMs }), every);
  return () => clearInterval(t);
}

(async () => {
  const env = {
    ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', DATABASE_URL: '', OWNER_SETUP_TOKEN: 'tok-active',
    VOICE_ACTIVITY_MIN_GAP_MS: '100', SILENCE_FIRST_MS: '1500', SILENCE_GAP_MS: '1500', SILENCE_GRACE_MS: '900', RANK_REFRESH_MS: '200', IDENTITY_SECRET: SECRET,
  };
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], { env, stdio: ['ignore', 'ignore', 'inherit'] });
  const done = (code) => {
    socks.forEach((s) => { try { s.close(); } catch (_) { /* gone */ } });
    try { srv.kill('SIGKILL'); } catch (_) { /* gone */ }
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    process.exit(code);
  };
  try {
    for (let i = 0; i < 60; i++) { try { await fetch(BASE + '/healthz'); break; } catch (_) { await wait(250); } }
    const json = { 'Content-Type': 'application/json' };
    const setup = await (await fetch(BASE + '/owner/api/setup', { method: 'POST', headers: json, body: JSON.stringify({ password: 'correct horse battery', setupToken: 'tok-active' }) })).json();
    const conf = await fetch(BASE + '/owner/api/setup-confirm', { method: 'POST', headers: json, body: JSON.stringify({ code: totp.totpCode(setup.secret), setupToken: 'tok-active' }) });
    const owner = { ...json, cookie: String(conf.headers.get('set-cookie') || '').split(';')[0] };
    // The dashboard caches GETs briefly; a fresh query string skips it.
    let nonce = 0;
    const rows = async () => Object.fromEntries(((await (await fetch(BASE + '/owner/api/talktime?range=all&n=' + (nonce++), { headers: owner })).json()).rows || []).map((r) => [r.clientId, r]));

    // --- cutover: an old record keeps its whole total as base ----------------
    let r = await rows();
    ok('pre-cutover total is kept as base and counts', r.c_at_old && r.c_at_old.base === 7200 && r.c_at_old.active === 7200 && r.c_at_old.seconds === 7200, r.c_at_old);
    const badges = await (await fetch(BASE + '/owner/api/badges?n=1', { headers: owner })).json();
    ok('its badge is kept (2h = at least First Words)', badges.rows.some((x) => x.clientId === 'c_at_old' && x.earned >= 1 && x.hours === 2), badges.rows);

    // --- 1. both sides active ------------------------------------------------
    {
      const { a, b, pairId } = await pair('c_at_a1_xx', 'c_at_b1_xx');
      const sa = reporter(a, pairId, 5000);
      const sb = reporter(b, pairId, 5000);
      await wait(4200);
      sa(); sb();
      a.close();
      await wait(600);
      r = await rows();
      ok('both sides speaking -> active seconds counted', r.c_at_a1_xx && r.c_at_a1_xx.active >= 3 && r.c_at_a1_xx.active <= r.c_at_a1_xx.seconds, r.c_at_a1_xx);
      ok('...for both people, equally', r.c_at_b1_xx && r.c_at_b1_xx.active === r.c_at_a1_xx.active, [r.c_at_a1_xx, r.c_at_b1_xx]);
      ok('...and nothing from before the cutover', r.c_at_a1_xx.base === 0, r.c_at_a1_xx);
      b.close();
    }

    // --- 2. one side silent --------------------------------------------------
    {
      const { a, b, pairId } = await pair('c_at_a2_xx', 'c_at_b2_xx');
      const sa = reporter(a, pairId, 6000);
      const sb = reporter(b, pairId, 0);
      await wait(3500);
      sa(); sb();
      a.close();
      await wait(600);
      r = await rows();
      ok('one side silent -> 0 active seconds for both', r.c_at_a2_xx && r.c_at_a2_xx.seconds >= 3 && r.c_at_a2_xx.active === 0 && r.c_at_b2_xx.active === 0, [r.c_at_a2_xx, r.c_at_b2_xx]);
      b.close();
    }

    // --- 3. no reports at all: earns nothing, is never auto-ended ------------
    {
      const { a, b } = await pair('c_at_a3_xx', 'c_at_b3_xx');
      await wait(3800);
      ok('no voice-activity -> no silence warning (old clients are never auto-ended)', a.events.length === 0 && b.events.length === 0, a.events);
      a.close();
      await wait(600);
      r = await rows();
      ok('no reports -> 0 active seconds', r.c_at_a3_xx && r.c_at_a3_xx.seconds >= 3 && r.c_at_a3_xx.active === 0 && r.c_at_b3_xx.active === 0, r.c_at_a3_xx);
      b.close();
    }

    // --- 4. one side never reports: not auto-ended ---------------------------
    {
      const { a, b, pairId } = await pair('c_at_a4_xx', 'c_at_b4_xx');
      const sa = reporter(a, pairId, 0);
      await wait(3800);
      sa();
      ok('only one side reporting -> no silence warning', a.events.length === 0 && b.events.length === 0, a.events);
      a.close(); b.close();
      await wait(300);
    }

    // --- 5. bad reports earn nothing -----------------------------------------
    {
      const { a, b, pairId } = await pair('c_at_a5_xx', 'c_at_b5_xx');
      const sa = reporter(a, pairId, 8000);
      const bad = setInterval(() => {
        b.emit('voice-activity', { pairId: 'nope', spokeMs: 8000 });
        b.emit('voice-activity', { pairId, spokeMs: '8000' });
        b.emit('voice-activity', { pairId, spokeMs: NaN });
        b.emit('voice-activity', 'junk');
        b.emit('voice-activity', null);
      }, 200);
      await wait(3500);
      sa(); clearInterval(bad);
      a.close();
      await wait(600);
      r = await rows();
      ok('wrong pairId / non-number / junk reports earn nothing', r.c_at_a5_xx && r.c_at_a5_xx.active === 0 && r.c_at_b5_xx.active === 0, [r.c_at_a5_xx, r.c_at_b5_xx]);
      b.close();
    }

    // --- 6. rate limit: a flood is not extra credit ---------------------------
    {
      const { a, b, pairId } = await pair('c_at_a6_xx', 'c_at_b6_xx');
      const flood = setInterval(() => { for (let i = 0; i < 20; i++) { a.emit('voice-activity', { pairId, spokeMs: 10000 }); b.emit('voice-activity', { pairId, spokeMs: 10000 }); } }, 150);
      await wait(3500);
      clearInterval(flood);
      a.close();
      await wait(600);
      r = await rows();
      ok('flooding reports cannot credit more than the call lasted', r.c_at_a6_xx && r.c_at_a6_xx.active <= r.c_at_a6_xx.seconds, r.c_at_a6_xx);
      b.close();
    }

    // --- 7. silence: warning, then the call ends -------------------------------
    {
      const { a, b, pairId } = await pair('c_at_a7_xx', 'c_at_b7_xx');
      const sa = reporter(a, pairId, 0);
      const sb = reporter(b, pairId, 0);
      const w = await Promise.all([maybe(a, 'silence-warning', 5000), maybe(b, 'silence-warning', 5000)]);
      ok('both sides get silence-warning { endsInMs }', w[0] && w[1] && w[0].endsInMs === 900 && w[1].endsInMs === 900, w);
      const left = await Promise.all([maybe(a, 'partner-left', 4000), maybe(b, 'partner-left', 4000)]);
      sa(); sb();
      ok('then both get partner-left { reason: silence }', left[0] && left[1] && left[0].reason === 'silence' && left[1].reason === 'silence', left);
      await wait(400);
      r = await rows();
      ok('a silent call earns 0 active seconds', r.c_at_a7_xx && r.c_at_a7_xx.active === 0, r.c_at_a7_xx);
      a.close(); b.close();
    }

    // --- 8. still-here cancels it ---------------------------------------------
    {
      const { a, b, pairId } = await pair('c_at_a8_xx', 'c_at_b8_xx');
      const sa = reporter(a, pairId, 0);
      const sb = reporter(b, pairId, 0);
      await Promise.all([once(a, 'silence-warning', 5000), once(b, 'silence-warning', 5000)]);
      const cleared = Promise.all([once(a, 'silence-cleared', 2000), once(b, 'silence-cleared', 2000)]);
      b.emit('still-here');
      const c = await cleared.catch(() => null);
      ok('still-here from one side -> silence-cleared to both', !!c);
      // The grace period is 900 ms: well past it, and the call is still up.
      await wait(1100);
      ok('...and the call carries on', !a.events.some((e) => e.ev === 'partner-left') && !b.events.some((e) => e.ev === 'partner-left'), a.events);
      sa(); sb();
      a.close(); b.close();
      await wait(300);
    }

    // --- 9. speech clears the warning too -------------------------------------
    {
      const { a, b, pairId } = await pair('c_at_a9_xx', 'c_at_b9_xx');
      const sa = reporter(a, pairId, 0);
      const sb = reporter(b, pairId, 0);
      await Promise.all([once(a, 'silence-warning', 5000), once(b, 'silence-warning', 5000)]);
      sa();
      const cleared = Promise.all([once(a, 'silence-cleared', 2000), once(b, 'silence-cleared', 2000)]);
      const talk = reporter(a, pairId, 3000);
      const c = await cleared.catch(() => null);
      talk(); sb();
      ok('speech from either side -> silence-cleared to both', !!c);
      a.close(); b.close();
      await wait(300);
    }
  } catch (err) {
    console.error(err);
    failed++;
  }
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
  done(failed ? 1 : 0);
})();
