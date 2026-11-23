// Top-talker rank badges and the "show badges" switch (spec section 9).
//   - top1..top5 go to the 5 people with the most talk time (banned skipped)
//   - the rank badge becomes `top`, `rank` is set, top1..5 are in `earned`
//   - show-badges {on:false} hides badges from OTHERS (badges: null) while the
//     owner still gets their own plus badgesHidden: true
//   - the dashboard view lists the current top 5
//
//   node scripts/test-rank-badges.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');
const Badges = require('../server/badges');

const PORT = 7899 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-rank-'));
const SECRET = crypto.randomBytes(32).toString('hex');
const sign = (id) => crypto.createHmac('sha256', SECRET).update(id).digest('hex');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : JSON.stringify(extra));
};
function once(sock, ev, ms = 5000, pred = () => true) {
  return new Promise((res, rej) => {
    const t = setTimeout(() => { sock.off(ev, on); rej(new Error('timeout ' + ev)); }, ms);
    function on(d) { if (!pred(d)) return; clearTimeout(t); sock.off(ev, on); res(d); }
    sock.on(ev, on);
  });
}

// Pure view first.
{
  const fake = { data: { talkTime: {
    a: { seconds: 7200 * 10 }, b: { seconds: 3600 * 9 }, c: { seconds: 3600 * 8 }, d: { seconds: 3600 * 7 },
    e: { seconds: 3600 * 6 }, f: { seconds: 3600 * 5 }, g: { seconds: 100 }, z: { seconds: 3600 * 99 },
  } } };
  Badges.recomputeRanks(fake, (id) => id === 'z');
  ok('rank 1 is the most talk time, skipped ids excluded', Badges.rankOf('a') === 1 && Badges.rankOf('z') === null);
  ok('only five ranks', Badges.rankOf('e') === 5 && Badges.rankOf('f') === null);
  const b = Badges.badgesFor(fake, 'a');
  ok('a rank badge becomes top and is in earned', b.top === 'top1' && b.rank === 1 && b.earned.includes('top1') && b.earned.includes('b1'), b);
  const f = Badges.badgesFor(fake, 'f');
  ok('unranked keeps the hour badge', f.top === 'b2' && f.rank === null, f);
  const v = Badges.dashboardView(fake);
  ok('dashboard lists the top five in order', v.topFive.length === 5 && v.topFive[0].clientId === 'a' && v.topFive[4].clientId === 'e' && v.topFive[0].id === 'top1', v.topFive);
}

const S = (h) => ({ seconds: h * 3600, calls: 30, lastAt: Date.now(), username: 'p', country: 'India' });
fs.writeFileSync(path.join(DATA_DIR, 'owner-data.json'), JSON.stringify({
  talkTime: {
    c_rank_1: S(500), c_rank_banned: S(400), c_rank_2: S(300), c_rank_3: S(200), c_rank_4: S(100), c_rank_5: S(90), c_rank_6: S(80),
  },
  bans: [{ id: 'b1', clientId: 'c_rank_banned', expiresAt: Date.now() + 86400000, createdAt: Date.now(), reason: 'test' }],
  social: { friends: { c_rank_obs: { c_rank_1: { username: 'One' }, c_rank_6: { username: 'Six' } }, c_rank_1: { c_rank_obs: { username: 'Obs' } } } },
}));

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', DATABASE_URL: '', IDENTITY_SECRET: SECRET },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  const done = (code) => { try { srv.kill('SIGKILL'); } catch (_) { /* gone */ } fs.rmSync(DATA_DIR, { recursive: true, force: true }); process.exit(code); };
  try {
    for (let i = 0; i < 60; i++) { try { await fetch(BASE + '/healthz'); break; } catch (_) { await wait(250); } }
    const connect = (id) => {
      const s = io(BASE, { transports: ['websocket'], forceNew: true });
      s.states = [];
      s.on('state-sync', (st) => s.states.push(st));
      s.emit('register', { clientId: id, nickname: id.slice(5), gender: 'male', identityToken: sign(id) });
      return s;
    };
    const obs = connect('c_rank_obs');
    await once(obs, 'state-sync');
    const row = (id) => obs.states[obs.states.length - 1].friends.find((f) => f.clientId === id) || {};
    const one = row('c_rank_1').badges;
    ok('friend row carries rank 1 as the top badge', one && one.top === 'top1' && one.rank === 1 && one.earned.includes('top1'), one);
    ok('rank 6 is not ranked', row('c_rank_6').badges && row('c_rank_6').badges.rank === null, row('c_rank_6'));

    const banned = connect('c_rank_banned');
    banned.close();

    const p1 = connect('c_rank_1');
    await wait(500);
    const own = p1.states[p1.states.length - 1];
    ok('own state has the rank and badgesHidden false', own.badges.rank === 1 && own.badgesHidden === false, own.badges);

    const ack = await new Promise((res) => p1.emit('show-badges', { on: false }, res));
    ok('show-badges acks', ack.ok === true && ack.on === false, ack);
    const mine = await once(p1, 'badges');
    ok('the owner still sees their badges, flagged hidden', mine.top === 'top1' && mine.badgesHidden === true, mine);
    await wait(400);
    ok('others now get badges: null', obs.states[obs.states.length - 1].friends.find((f) => f.clientId === 'c_rank_1').badges === null);
    const on = await new Promise((res) => p1.emit('show-badges', { on: true }, res));
    ok('turning it back on acks', on.ok === true && on.on === true, on);
    await wait(400);
    const back = obs.states[obs.states.length - 1].friends.find((f) => f.clientId === 'c_rank_1').badges;
    ok('others see badges again', back && back.rank === 1, back);
  } catch (err) {
    console.error(err);
    failed++;
  }
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
  done(failed ? 1 : 0);
})();
