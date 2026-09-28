// End-to-end check of the owner dashboard's audience & experience analytics:
// gender / age group / device are counted once per person per day, a finished
// conversation is recorded with its gender pairing and length, both sides get
// a one-shot post-call rating prompt, and a search abandoned before any match
// is counted as a give-up.
//
//   node scripts/test-audience.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');
const audience = require('../server/audience');

const PORT = 5999 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-aud-'));
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

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

function connect(id, ua, profile) {
  const sock = io(BASE, { transports: ['websocket'], forceNew: true, extraHeaders: { 'user-agent': ua, 'accept-language': 'en-GB,en;q=0.9' } });
  sock.emit('register', { clientId: id, ...profile });
  return sock;
}

(async () => {
  // Unit checks for the pure helpers first.
  ok('parseUA: iPhone is mobile iOS Safari', JSON.stringify(audience.parseUA(IPHONE)) === JSON.stringify({ device: 'mobile', os: 'iOS', browser: 'Safari' }));
  ok('parseUA: Windows Chrome is desktop', audience.parseUA(WIN).device === 'desktop' && audience.parseUA(WIN).browser === 'Chrome');
  ok('lifecycleOf: id minted now is new', audience.lifecycleOf('c_abc' + Date.now().toString(36)) === 'new');
  ok('lifecycleOf: id minted 10 days ago is 8-30d', audience.lifecycleOf('c_abc' + (Date.now() - 10 * 86400000).toString(36)) === '8-30d');
  ok('pairKeyOf is order independent', audience.pairKeyOf('male', 'female') === audience.pairKeyOf('female', 'male'));
  ok('normAge rejects junk', audience.normAge('12-17') === 'unspecified' && audience.normAge('25-34') === '25-34');

  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', RATE_MIN_SECONDS: '1', DATABASE_URL: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const logs = [];
  srv.stdout.on('data', (d) => logs.push(String(d)));
  srv.stderr.on('data', (d) => logs.push(String(d)));
  const socks = [];
  const done = (code) => {
    socks.forEach((s) => { try { s.close(); } catch (_) { /* closed */ } });
    try { srv.kill('SIGKILL'); } catch (_) { /* gone */ }
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    process.exit(code);
  };

  try {
    for (let i = 0; i < 40; i++) {
      try { await fetch(BASE + '/healthz'); break; } catch (_) { await wait(250); }
    }
    const newId = (n) => 'c_' + n + Date.now().toString(36);
    const a = connect(newId('aaa'), IPHONE, { gender: 'male', ageGroup: '25-34' });
    const b = connect(newId('bbb'), WIN, { gender: 'female', ageGroup: '18-24' });
    socks.push(a, b);
    await wait(500);

    const pair = Promise.all([once(a, 'matched'), once(b, 'matched')]);
    a.emit('find-partner', {});
    b.emit('find-partner', {});
    await pair;
    ok('two clients matched', true);
    await wait(2200);

    const promptA = once(a, 'rate-prompt', 5000);
    const promptB = once(b, 'rate-prompt', 5000);
    a.emit('leave');
    const [pa, pb] = await Promise.all([promptA, promptB]);
    ok('both sides get a rate prompt after the call', pa && pb && typeof pa.t === 'string' && pa.t !== pb.t);
    a.emit('rate-call', { t: pa.t, v: 'down' });
    b.emit('rate-call', { t: pb.t, v: 'up' });
    b.emit('rate-call', { t: pb.t, v: 'up' }); // second answer must be ignored
    a.emit('rate-call', { t: 'forged', v: 'up' });

    // A third person searches alone and gives up.
    const c = connect(newId('ccc'), WIN, { gender: 'female' });
    socks.push(c);
    await wait(400);
    c.emit('find-partner', {});
    await wait(1200);
    c.emit('leave');
    await wait(3000); // let the throttled save land

    const file = path.join(DATA_DIR, 'owner-data.json');
    const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
    const r = audience.buildReport(doc.analytics.days, 1, []);
    const g = Object.fromEntries(r.people.gender.map((x) => [x.key, x.n]));
    ok('gender counted once per person', g.male === 1 && g.female === 2, JSON.stringify(g));
    ok('age group counted', r.people.age.find((x) => x.key === '25-34').n === 1 && r.people.age.find((x) => x.key === '18-24').n === 1);
    ok('gender x age cross-tab', r.people.cross.find((x) => x.gender === 'male').cells[1] === 1);
    ok('device counted', JSON.stringify(r.people.device) === JSON.stringify([['desktop', 2], ['mobile', 1]]), JSON.stringify(r.people.device));
    ok('lifecycle: fresh ids are new', r.people.lifecycle.find((x) => x.key === 'new').n === 3);
    ok('one conversation recorded', r.experience.calls === 1, r.experience.calls);
    ok('pairing recorded as F-M', r.experience.pairs[0] && r.experience.pairs[0].key === 'F-M');
    ok('ratings: one up, one down, duplicates and forgeries ignored', r.experience.up === 1 && r.experience.down === 1, JSON.stringify([r.experience.up, r.experience.down]));
    ok('female segment has the thumbs up', r.experience.byGender.find((x) => x.key === 'female').satisfaction === 100);
    ok('two waits recorded for the match', r.experience.wait.reduce((s, x) => s + x.n, 0) === 2);
    ok('abandoned search recorded', r.experience.abandoned === 1, r.experience.abandoned);
    ok('insights produced', Array.isArray(r.insights) && r.insights.length > 0);
  } catch (e) {
    failed++;
    console.log('FAIL', e.message);
    console.log(logs.join('').slice(-2000));
  }
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll audience checks passed');
  done(failed ? 1 : 0);
})();
