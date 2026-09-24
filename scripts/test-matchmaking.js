// End-to-end check of the "disconnected without ever getting connected" fix.
//
// Two people whose call never comes up both auto-skip, and the matcher used to
// hand them straight back to each other - so a single dead media path became an
// endless cycle of 20s "Connecting…" screens while other people were online.
// These checks pin the behaviour that stops it:
//
//   1. a pair that parted is not re-matched immediately (a third person is)
//   2. a pair whose call failed is not re-matched even once the random-match
//      fallback has dropped every other filter
//   3. the other side is told the pairing failed, rather than being told a
//      stranger hung up on it
//   4. searches that arrive together are paired by fit (shared interests), not
//      by who tapped first
//
//   node scripts/test-matchmaking.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 5599 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-match-'));

let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : extra);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function once(sock, ev, ms = 5000) {
  return new Promise((res, rej) => {
    const timer = setTimeout(() => { sock.off(ev, on); rej(new Error('timeout waiting for ' + ev)); }, ms);
    function on(data) { clearTimeout(timer); sock.off(ev, on); res(data); }
    sock.on(ev, on);
  });
}

// Resolves with the event payload, or null if it never arrives - for asserting
// that something does NOT happen.
function maybe(sock, ev, ms) {
  return once(sock, ev, ms).catch(() => null);
}

function connect(name, interests) {
  const sock = io(BASE, { transports: ['websocket'], forceNew: true });
  sock.emit('register', {
    clientId: 'c_match_' + name,
    username: name,
    gender: 'male',
    interests,
  });
  return sock;
}

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const logs = [];
  srv.stdout.on('data', (d) => logs.push(String(d)));
  srv.stderr.on('data', (d) => logs.push(String(d)));

  const socks = [];
  const done = (code) => {
    socks.forEach((s) => { try { s.close(); } catch (_) { /* already closed */ } });
    try { srv.kill('SIGKILL'); } catch (_) { /* already gone */ }
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    process.exit(code);
  };

  try {
    for (let i = 0; i < 40; i++) {
      try { await fetch(BASE + '/healthz'); break; } catch (_) { await wait(250); }
    }

    const a = connect('Alpha');
    const b = connect('Bravo');
    const c = connect('Charlie');
    socks.push(a, b, c);
    await wait(500);

    // --- 1. A failed pairing tells the other side the truth -----------------
    let pair = Promise.all([once(a, 'matched'), once(b, 'matched')]);
    a.emit('find-partner', {});
    b.emit('find-partner', {});
    await pair;
    ok('two clients matched', true);

    const bLeft = once(b, 'partner-left');
    a.emit('skip', { failed: true });
    const leftInfo = await bLeft;
    ok('partner-left carries reason "failed" when the call never connected',
      leftInfo && leftInfo.reason === 'failed', JSON.stringify(leftInfo));

    // --- 2. The failed pair is not handed back to each other ----------------
    // Both re-search with nobody else available. The random-match fallback
    // fires after 10s and drops every preference filter - a failed pair must
    // survive even that, so allow well past it before concluding.
    const rematch = maybe(a, 'matched', 14000);
    b.emit('find-partner', {});
    await wait(200);
    a.emit('find-partner', {});
    ok('a failed pair is not re-matched, even past the random fallback',
      (await rematch) === null);

    // --- 3. Someone else is still matchable while that hold stands ----------
    const withCharlie = Promise.all([once(a, 'matched'), once(c, 'matched')]);
    c.emit('find-partner', {});
    const [aGot] = await withCharlie;
    ok('a third person is matched normally while the hold stands',
      aGot && aGot.partner && aGot.partner.clientId === 'c_match_Charlie',
      JSON.stringify(aGot && aGot.partner));

    // --- 4. A voluntary skip gives you someone new first --------------------
    // A fresh pair, so the soft hold is measured on its own rather than on top
    // of the failed hold Alpha and Bravo are already carrying.
    const d = connect('Delta');
    const e = connect('Echo');
    socks.push(d, e);
    await wait(400);
    // Clear every earlier searcher out of the queue so the next pairing can
    // only be Delta+Echo.
    a.emit('leave');
    b.emit('leave');
    c.emit('leave');
    await wait(200);

    const dePair = Promise.all([once(d, 'matched'), once(e, 'matched')]);
    d.emit('find-partner', {});
    e.emit('find-partner', {});
    await dePair;
    const eLeft = once(e, 'partner-left');
    d.emit('skip');
    const eInfo = await eLeft;
    ok('a deliberate skip reports reason "left"', eInfo && eInfo.reason === 'left',
      JSON.stringify(eInfo));

    // Echo re-queues; Delta searches again. With only these two searching, the
    // soft hold delays the reunion but the random fallback (10s) still allows
    // it - nobody is left waiting forever on a quiet site.
    const reunion = maybe(d, 'matched', 4000);
    e.emit('find-partner', {});
    await wait(200);
    d.emit('find-partner', {});
    ok('a voluntary skip is not undone by the very next queue scan',
      (await reunion) === null);
    ok('the random fallback still reunites them rather than stranding anyone',
      (await maybe(d, 'matched', 12000)) !== null);

    // --- 5. Searches arriving together are matched as a batch ---------------
    // Foxtrot and Hotel share interests; Golf shares none. First-fit would pair
    // Foxtrot with whichever arrived before it. The batch round pairs by fit.
    const f = connect('Foxtrot', ['music', 'movies']);
    const g = connect('Golf', ['chess']);
    const h = connect('Hotel', ['Music', 'movies']);
    socks.push(f, g, h);
    await wait(400);
    const fGot = once(f, 'matched');
    g.emit('find-partner', {});
    f.emit('find-partner', {});
    h.emit('find-partner', {});
    const fPartner = (await fGot).partner;
    ok('a batch round pairs the two with shared interests',
      fPartner && fPartner.clientId === 'c_match_Hotel', JSON.stringify(fPartner));

    console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
    done(failed ? 1 : 0);
  } catch (err) {
    console.error('\nFAIL (threw):', err.message);
    console.error(logs.join('').slice(-2000));
    done(1);
  }
})();
