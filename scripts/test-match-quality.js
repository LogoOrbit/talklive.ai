// Match quality: fair waiting, fewer repeat encounters, an honest wait
// estimate, the gender filter as a promise, queue invariants under churn,
// rate-limited searching, and a call surviving a brief socket drop.
//
//   1. pure helpers in server/match-queue.js
//   2. a seeded simulation of 40 searchers, old ranking vs new, so the
//      improvement is measured rather than asserted (numbers are printed)
//   3. end to end against a real server:
//      - a Men/Women filter is not dropped by the fallback; 'waiting' and
//        'search-status' say so; 'widen-search' drops it for this search only
//      - a mutual heart and "Undo skip" cannot bypass a gender filter
//      - a script spinning skip is refused with 'searchTooFast'; a person
//        tapping Next twice a second is not
//      - random find/skip/leave/disconnect churn leaves every socket in at
//        most one state and every partner link symmetric
//      - a socket that drops mid-call and comes back resumes the same call
//
//   node scripts/test-match-quality.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');
const MQ = require('../server/match-queue');

let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : JSON.stringify(extra));
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// --- 1. Pure helpers -----------------------------------------------------------
function unitTests() {
  ok('aging is zero for no wait', MQ.waitAging(0) === 0 && MQ.waitAging(-5) === 0);
  ok('aging grows with seconds waited', MQ.waitAging(4000) === 2 && MQ.waitAging(8000) === 4);
  ok('aging is capped', MQ.waitAging(10 * 60 * 1000) === MQ.AGE_CAP);

  const rp = MQ.createRecentPartners({ max: 3, ttlMs: 1000, maxPeople: 4 });
  rp.note('a', 'b', 0);
  ok('a fresh repeat gets the full penalty, both ways', rp.penalty('a', 'b', 0) === MQ.REPEAT_PENALTY && rp.penalty('b', 'a', 0) === MQ.REPEAT_PENALTY);
  ok('the penalty fades with time', rp.penalty('a', 'b', 500) === MQ.REPEAT_PENALTY / 2);
  ok('and is gone after the window', rp.penalty('a', 'b', 1000) === 0);
  ok('strangers carry no penalty', rp.penalty('a', 'z', 0) === 0);
  for (const x of ['c', 'd', 'e']) rp.note('a', x, 10);
  ok('memory per person is bounded', rp.penalty('a', 'b', 10) === 0 && rp.penalty('a', 'e', 10) > 0);
  for (const x of ['p', 'q', 'r', 's', 't']) rp.note(x + '1', x + '2', 20);
  ok('memory across people is bounded', rp.size() <= 4, rp.size());
  rp.sweep(5000);
  ok('sweep drops expired memories', rp.size() === 0);

  const ws = MQ.createWaitStats({ samples: 5, maxAgeMs: 1000, minSamples: 3 });
  ok('no estimate without data', ws.median('talk', 0) === null);
  [4, 1, 9].forEach((s) => ws.add('talk', s, 0));
  ok('median of real waits', ws.median('talk', 0) === 4);
  ok('pools are separate', ws.median('chat', 0) === null);
  [2, 2, 2, 2].forEach((s) => ws.add('talk', s, 0));
  ok('only the last N count', ws.median('talk', 0) === 2);
  ok('old waits age out', ws.median('talk', 2000) === null);

  const tb = MQ.createTokenBucket({ burst: 3, perSec: 1 }, 0);
  ok('bucket allows a burst', tb.take(0) && tb.take(0) && tb.take(0));
  ok('then refuses', !tb.take(0) && tb.retryIn() >= 1);
  ok('and refills over time', tb.take(1000));

  const partners = new Map([['a', 'b'], ['b', 'a'], ['c', 'd']]);
  const probs = MQ.checkInvariants({ queue: ['x', 'x', 'a'], partners });
  const kinds = probs.map((p) => p.kind).sort();
  ok('invariants catch duplicates, queued+paired and one-way links',
    kinds.includes('queued-twice') && kinds.includes('queued-and-paired') && kinds.includes('asymmetric'), kinds);
  ok('a clean state has no problems', MQ.checkInvariants({ queue: ['x'], partners: new Map([['a', 'b'], ['b', 'a']]) }).length === 0);
}

// --- 2. Simulation: old ranking vs new ------------------------------------------
// A small model of the server's matcher: a searcher takes the best-scoring
// compatible waiter, nobody is offered back to someone they parted from in the
// last 60s, and a sweep every 3s lets waiters pick among each other (oldest
// first in the new ordering, queue order in the old). Scores are 2 per shared
// interest, exactly as matchScore(); the new ranking adds waitAging() and
// subtracts the recent-partner penalty, exactly as findBestMatch() does.
//
// The queue only backs up when waiters cannot take each other, which on the
// real site is what filters do. So the 40 are two sides - 28 who can only
// meet one of the 12 others (as a gender filter does) - and the 28 queue up
// while each of the 12 picks among them. Ten of the 28 share no interests.
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function simulate(fair, seed = 7) {
  const rnd = mulberry32(seed);
  const TOPICS = ['music', 'games', 'films', 'travel', 'sport', 'books', 'food', 'art'];
  const N = 40;
  const people = [];
  for (let i = 0; i < N; i++) {
    // A quarter share nothing with anyone; the rest pick 1-3 common topics.
    const k = i < 10 ? 0 : 1 + Math.floor(rnd() * 3);
    const set = new Set();
    while (set.size < k) set.add(TOPICS[Math.floor(rnd() * 4)]); // 4 popular topics
    people.push({ id: 'p' + i, side: i < 28 ? 'a' : 'b', interests: [...set], state: 'idle', next: Math.floor(rnd() * 60), since: 0, passed: 0 });
  }
  const recent = MQ.createRecentPartners();
  const parted = new Map(); // pair -> time parted (60s soft hold)
  const key = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
  const queue = [];
  const waits = [];
  let matches = 0; let repeats10 = 0; let repeats60 = 0; let maxPassed = 0;
  const lastMet = new Map();
  const shared = (a, b) => a.interests.filter((x) => b.interests.includes(x)).length;
  const compatible = (a, b, t) => a !== b && a.side !== b.side && !(parted.has(key(a.id, b.id)) && t - parted.get(key(a.id, b.id)) < 60);

  function pick(seeker, t) {
    let best = -1; let bestScore = -Infinity;
    for (let i = 0; i < queue.length; i++) {
      const c = queue[i];
      if (!compatible(seeker, c, t)) continue;
      let score = shared(seeker, c) * 2;
      if (fair) score += MQ.waitAging((t - c.since) * 1000) - recent.penalty(seeker.id, c.id, t * 1000);
      if (score > bestScore) { bestScore = score; best = i; }
    }
    return best;
  }
  function pair(a, b, t) {
    // Everyone compatible with `a` who waited longer than `b` was passed over.
    for (const c of queue) {
      if (c !== b && c.since < b.since && compatible(a, c, t)) { c.passed += 1; maxPassed = Math.max(maxPassed, c.passed); }
    }
    queue.splice(queue.indexOf(b), 1);
    for (const p of [a, b]) {
      waits.push(t - p.since);
      p.state = 'talking'; p.passed = 0;
      p.next = t + 20 + Math.floor(rnd() * 160);
    }
    const k = key(a.id, b.id);
    if (lastMet.has(k)) { if (t - lastMet.get(k) <= 600) repeats10++; if (t - lastMet.get(k) <= 3600) repeats60++; }
    lastMet.set(k, t);
    recent.note(a.id, b.id, t * 1000);
    a.partner = b; b.partner = a;
    matches++;
  }
  function search(p, t) {
    p.state = 'searching'; p.since = t;
    const i = pick(p, t);
    if (i === -1) queue.push(p); else pair(p, queue[i], t);
  }

  for (let t = 0; t < 2 * 3600; t++) {
    for (const p of people) {
      if (p.state === 'idle' && t >= p.next) search(p, t);
      else if (p.state === 'talking' && t >= p.next && p.partner) {
        const q = p.partner;
        parted.set(key(p.id, q.id), t);
        p.partner = q.partner = null;
        // Both go back to searching after a short pause.
        p.state = 'idle'; p.next = t + Math.floor(rnd() * 10);
        q.state = 'idle'; q.next = t + Math.floor(rnd() * 10);
      }
    }
    if (t % 3 === 0) {
      const order = fair ? [...queue].sort((x, y) => x.since - y.since) : [...queue];
      for (const p of order) {
        if (!queue.includes(p)) continue;
        queue.splice(queue.indexOf(p), 1);
        const i = pick(p, t);
        if (i === -1) queue.splice(0, 0, p); else pair(p, queue[i], t);
      }
      // Queue order is arrival order; restore it after the pass.
      queue.sort((x, y) => x.since - y.since);
    }
  }
  // Still waiting at the end counts too: a starved waiter never gets a match to record.
  for (const p of queue) waits.push(7200 - p.since);
  waits.sort((x, y) => x - y);
  return {
    matches,
    maxWait: waits[waits.length - 1],
    p95Wait: waits[Math.floor(waits.length * 0.95)],
    maxPassedOver: maxPassed,
    repeat10: +(repeats10 / matches).toFixed(3),
    repeat60: +(repeats60 / matches).toFixed(3),
  };
}

function simulationTests() {
  const seeds = [7, 11, 23];
  const before = seeds.map((s) => simulate(false, s));
  const after = seeds.map((s) => simulate(true, s));
  const avg = (rows, k) => +(rows.reduce((n, r) => n + r[k], 0) / rows.length).toFixed(3);
  const sum = (rows) => ({
    matches: avg(rows, 'matches'), maxWait: Math.max(...rows.map((r) => r.maxWait)), p95Wait: avg(rows, 'p95Wait'),
    maxPassedOver: Math.max(...rows.map((r) => r.maxPassedOver)), repeat10: avg(rows, 'repeat10'), repeat60: avg(rows, 'repeat60'),
  });
  const b = sum(before); const a = sum(after);
  console.log('SIM before (no aging, no memory):', JSON.stringify(b));
  console.log('SIM after  (aging + recent-partner penalty):', JSON.stringify(a));
  ok('fair waiting: nobody compatible is passed over as often', a.maxPassedOver < b.maxPassedOver, { before: b.maxPassedOver, after: a.maxPassedOver });
  ok('fair waiting: the longest wait is no longer', a.maxWait <= b.maxWait, { before: b.maxWait, after: a.maxWait });
  ok('fewer repeat encounters within 10 minutes', a.repeat10 < b.repeat10, { before: b.repeat10, after: a.repeat10 });
  ok('matching throughput is not worse', a.matches >= b.matches * 0.97, { before: b.matches, after: a.matches });
}

// --- 3. End to end --------------------------------------------------------------
const PORT = 7100 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-quality-'));
const IDENTITY_SECRET = crypto.randomBytes(32).toString('hex');
const sign = (clientId) => crypto.createHmac('sha256', IDENTITY_SECRET).update(clientId).digest('hex');
const sockets = [];
let ipSeq = 1;

function once(sock, ev, ms = 5000) {
  return new Promise((res, rej) => {
    const timer = setTimeout(() => { sock.off(ev, on); rej(new Error('timeout waiting for ' + ev)); }, ms);
    function on(data) { clearTimeout(timer); sock.off(ev, on); res(data === undefined ? true : data); }
    sock.on(ev, on);
  });
}
const maybe = (sock, ev, ms) => once(sock, ev, ms).catch(() => null);

// Every client on its own address, so per-IP limits never couple the tests.
async function client(clientId, extra = {}, opts = {}) {
  const sock = io(BASE, { transports: ['websocket'], forceNew: true, reconnection: !!opts.reconnect, reconnectionDelay: 200, extraHeaders: { 'fly-client-ip': `203.0.${Math.floor(ipSeq / 200)}.${(ipSeq++ % 200) + 1}` } });
  sockets.push(sock);
  const payload = { clientId, nickname: clientId.slice(-8), gender: 'male', lang: 'en', identityToken: sign(clientId), ...extra };
  sock.on('connect', () => sock.emit('register', payload));
  await once(sock, 'register-result', 8000);
  sock.payload = payload;
  return sock;
}
async function invariants() {
  const r = await fetch(BASE + '/__match-invariants');
  return r.json();
}

async function e2eTests() {
  // a. The gender filter holds past the fallback, and says so.
  const plus = await client('c_q_plus1', { prefGender: 'female' });
  const man = await client('c_q_man1');
  const firstWait = once(plus, 'waiting');
  plus.emit('find-partner', { mode: 'talk' });
  const w = await firstWait;
  ok('waiting says the search is holding out for a gender', w.waitingFor === 'gender' && w.gender === 'female' && w.canWiden === true, w);
  ok('no fallback countdown when only gender is set', w.fallbackInSeconds === null, w);
  let oldFallback = false;
  plus.on('random-fallback', () => { oldFallback = true; });
  const status = maybe(plus, 'search-status', 14000);
  man.emit('find-partner', { mode: 'talk' });
  const st = await status;
  ok('the fallback fires a search-status that keeps the gender', !!st && st.fallback === true && st.waitingFor === 'gender' && st.relaxed.length === 0, st);
  ok('older pages are not told "matching with anyone"', oldFallback === false);
  ok('a gender filter is not dropped by the fallback', (await maybe(plus, 'matched', 1500)) === null);
  const widened = once(plus, 'matched', 4000);
  plus.emit('widen-search');
  const m = await widened.catch(() => null);
  ok('widen-search matches with anyone at once', !!m);
  plus.emit('leave'); man.emit('leave');
  await wait(300);

  // b. A mutual heart cannot bypass a gender filter.
  const h1 = await client('c_q_heart1');
  const h2 = await client('c_q_heart2');
  h1.emit('find-partner', { mode: 'talk' });
  await wait(100);
  const hm = once(h2, 'matched');
  h2.emit('find-partner', { mode: 'talk' });
  await hm;
  await wait(200);
  h1.emit('reaction', 'heart'); h2.emit('reaction', 'heart');
  await wait(300);
  h1.emit('leave'); h2.emit('leave');
  await wait(300);
  // h1 becomes a Plus member filtering for women; h2 is a man.
  const h1b = await client('c_q_heart1', { prefGender: 'female' });
  h1b.emit('find-partner', { mode: 'talk' });
  await wait(200);
  h2.emit('find-partner', { mode: 'talk' });
  ok('a mutual heart does not override a gender filter', (await maybe(h1b, 'matched', 2500)) === null);
  h1b.emit('leave'); h2.emit('leave');
  await wait(300);

  // c. Undo skip cannot bypass a gender filter either.
  const u1 = await client('c_q_undo1');
  const u2 = await client('c_q_undo2');
  u1.emit('find-partner', { mode: 'talk' });
  await wait(100);
  const um = once(u1, 'matched');
  u2.emit('find-partner', { mode: 'talk' });
  await um;
  await wait(200);
  u1.emit('skip');
  await wait(200);
  u2.emit('find-partner', { mode: 'talk' });
  await wait(200);
  // The skipper saves a Men/Women filter mid-search (a re-register), then undoes.
  u1.emit('register', { ...u1.payload, prefGender: 'female' });
  await once(u1, 'register-result');
  const undo = await new Promise((r) => u1.emit('undo-skip', r));
  ok('undo skip refuses someone the gender filter rules out', undo && undo.ok === false && undo.reason === 'busy', undo);
  u1.emit('leave'); u2.emit('leave');

  // d. Re-registering mid-search keeps the pool and the fallback clock.
  const chat = await client('c_q_chat1');
  chat.emit('find-partner', { mode: 'chat' });
  await once(chat, 'waiting');
  chat.emit('register', { ...chat.payload, interests: ['music'] });
  await once(chat, 'register-result');
  const talker = await client('c_q_talk1');
  talker.emit('find-partner', { mode: 'talk' });
  ok('a re-register mid-search does not move a text searcher into the voice pool', (await maybe(talker, 'matched', 1500)) === null);
  chat.emit('leave'); talker.emit('leave');

  // e. Rate limit: a script spinning skip is refused, a person is not.
  const human = await client('c_q_human');
  let humanRefused = false;
  human.on('search-refused', () => { humanRefused = true; });
  for (let i = 0; i < 24; i++) { human.emit('skip'); await wait(400); }
  ok('tapping Next twice a second is never refused', humanRefused === false);
  human.emit('leave');
  const bot = await client('c_q_spinner');
  const refused = maybe(bot, 'search-refused', 3000);
  for (let i = 0; i < 40; i++) bot.emit('skip');
  const r = await refused;
  ok('a script spinning skip is refused with a reason clients show', !!r && r.reason === 'searchTooFast' && r.retryIn >= 1, r);
  bot.emit('leave');

  // f. Churn: random find/skip/leave/disconnect, then check the invariants.
  const N = 24;
  const churners = [];
  for (let i = 0; i < N; i++) churners.push(await client('c_q_churn' + i, { gender: i % 2 ? 'male' : 'female' }));
  const rnd = mulberry32(99);
  const until = Date.now() + 5000;
  let actions = 0;
  while (Date.now() < until) {
    const i = Math.floor(rnd() * churners.length);
    const s = churners[i];
    const x = rnd();
    if (x < 0.45) s.emit('find-partner', { mode: rnd() < 0.8 ? 'talk' : 'chat' });
    else if (x < 0.75) s.emit('skip');
    else if (x < 0.9) s.emit('leave');
    else if (x < 0.95) { s.close(); churners[i] = await client('c_q_churn' + i + 'r' + actions, { gender: 'male' }); }
    else if (x < 0.98) s.emit('register', { ...s.payload, interests: ['music'] });
    else s.emit('undo-skip', () => {});
    actions++;
    await wait(5);
  }
  await wait(3500); // one queue sweep
  const inv = await invariants();
  ok(`after ${actions} random actions every socket is in at most one state, links symmetric`, inv.problems.length === 0, inv);
  churners.forEach((s) => s.close());

  // g. A brief drop mid-call resumes the same call.
  const ra = await client('c_q_resumeA', {}, { reconnect: true });
  const rb = await client('c_q_resumeB');
  ra.emit('find-partner', { mode: 'talk' });
  await wait(100);
  const rm = once(rb, 'matched');
  rb.emit('find-partner', { mode: 'talk' });
  const matched = await rm;
  ok('matched carries a pair id', typeof matched.pairId === 'string' && matched.pairId.length > 0, matched);
  let bLeft = false;
  rb.on('partner-left', () => { bLeft = true; });
  await wait(8500); // a real call, past the first seconds
  const resumed = once(ra, 'call-resumed', 6000);
  const partnerResumed = once(rb, 'partner-resumed', 6000);
  ra.io.engine.close(); // the transport dies; socket.io reconnects on a new socket
  const cr = await resumed.catch(() => null);
  ok('the dropped side gets its call back', !!cr && cr.pairId === matched.pairId, cr);
  ok('the other side is told it resumed', !!(await partnerResumed.catch(() => null)));
  ok('and was never told the partner left', bLeft === false);
  const sig = once(ra, 'signal', 3000);
  rb.emit('signal', { type: 'ice-candidate', candidate: { candidate: 'candidate:1 1 udp 1 127.0.0.1 9 typ host', sdpMid: '0', sdpMLineIndex: 0 } });
  const got = await sig.catch(() => null);
  ok('signals reach the resumed socket, tagged with the pair id', !!got && got.pid === matched.pairId, got);
  const inv2 = await invariants();
  ok('resume leaves the invariants intact', inv2.problems.length === 0 && inv2.parked === 0, inv2);

  // A drop that does not come back ends the call after the grace window.
  const left = once(rb, 'partner-left', 15000);
  ra.io.reconnection(false);
  ra.io.engine.close();
  const pl = await left.catch(() => null);
  ok('a drop that never comes back ends the call as "disconnected"', !!pl && pl.reason === 'disconnected', pl);
}

(async () => {
  unitTests();
  simulationTests();
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, DATABASE_URL: '', NODE_ENV: 'development', MATCH_INVARIANTS: '1', PARK_HOLD_MS: '10000', IDENTITY_SECRET, PREMIUM_CLIENT_IDS: 'c_q_plus1,c_q_heart1,c_q_undo1', GIPHY_API_KEY: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const logs = [];
  srv.stdout.on('data', (d) => logs.push(String(d)));
  srv.stderr.on('data', (d) => logs.push(String(d)));
  try {
    for (let i = 0; i < 60; i++) {
      try { await fetch(BASE + '/healthz'); break; } catch (_) { await wait(250); }
    }
    await e2eTests();
  } catch (err) {
    failed++;
    console.log('FAIL', err.stack || err.message);
    console.log(logs.join('').slice(-3000));
  } finally {
    sockets.forEach((s) => { try { s.close(); } catch (_) { /* gone */ } });
    srv.kill('SIGKILL');
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }
  console.log(failed ? `\n${failed} failed` : '\nall passed');
  process.exit(failed ? 1 : 0);
})();
