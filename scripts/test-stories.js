// Stories: friends see each other's text + GIF stories for 24 hours; strangers do not.

//
//   node scripts/test-stories.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 7599 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-stories-'));
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
function connect(id, name) {
  const s = io(BASE, { transports: ['websocket'], forceNew: true });
  s.on('state-sync', (st) => { s.lastState = st; });
  s.emit('register', { clientId: id, nickname: name, gender: 'male', identityToken: sign(id) });
  return s;
}
// The server sends a fresh state-sync after a match; keep the latest per socket.

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', DATABASE_URL: '', IDENTITY_SECRET: SECRET },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  const done = (code) => { try { srv.kill('SIGKILL'); } catch (_) { /* gone */ } fs.rmSync(DATA_DIR, { recursive: true, force: true }); process.exit(code); };
  try {
    for (let i = 0; i < 60; i++) { try { await fetch(BASE + '/healthz'); break; } catch (_) { await wait(250); } }
    const A = 'c_story_aaaa1';
    const B = 'c_story_bbbb2';
    const C = 'c_story_cccc3';
    const a = connect(A, 'Ann');
    const b = connect(B, 'Ben');
    const c = connect(C, 'Cy');
    await wait(400);

    // A and B become friends through a mutual like after a chat.
    const m = Promise.all([once(a, 'matched'), once(b, 'matched')]);
    a.emit('find-partner', { mode: 'chat' });
    b.emit('find-partner', { mode: 'chat' });
    await m;
    await ask(a, 'like-partner', { clientId: B });
    await ask(b, 'like-partner', { clientId: A });
    await wait(300);

    const empty = await ask(a, 'story-post', { text: '   ' });
    ok('an empty story is refused', empty.ok === false, empty);
    const link = await ask(a, 'story-post', { text: 'see https://spam.example' });
    ok('a link is refused', link.ok === false, link);

    const changed = once(b, 'stories-changed');
    const gif = { url: 'https://media.giphy.com/media/abc/giphy.gif', preview: 'https://media.giphy.com/media/abc/200.gif', w: 200, h: 150, x: 0.3, y: 0.7 };
    const bad = { url: 'https://evil.example/x.gif' };
    const posted = await ask(a, 'story-post', { text: 'Hello friends 👋🔥', bg: 'purple', gifs: [gif, gif, bad] });
    ok('a story posts', posted.ok === true && typeof posted.id === 'string', posted);
    await changed;
    ok('friends are told a story changed', true);

    const feedB = await ask(b, 'stories-get');
    const annB = feedB.people.find((p) => p.clientId === A);
    ok('a friend sees the story', annB && annB.stories.length === 1 && annB.stories[0].text === 'Hello friends 👋🔥', feedB);
    ok('only allowed GIFs are kept, with their place', annB && annB.stories[0].gifs.length === 2 && annB.stories[0].gifs[0].x === 0.3, annB && annB.stories[0].gifs);
    ok('unseen at first', annB && annB.stories[0].seen === false, annB);
    ok('the colour is kept', annB && annB.stories[0].bg === 'purple', annB);

    const feedC = await ask(c, 'stories-get');
    ok('a stranger does not see it', !feedC.people.some((p) => p.clientId === A), feedC);

    const told = once(a, 'stories-changed');
    b.emit('story-seen', { clientId: A, id: posted.id });
    await told;
    const feedB2 = await ask(b, 'stories-get');
    ok('seen after viewing', feedB2.people.find((p) => p.clientId === A).stories[0].seen === true, feedB2);
    const feedA = await ask(a, 'stories-get');
    const mine = feedA.people[0];
    ok('own stories come first with viewers', mine.mine === true && mine.stories[0].views.length === 1 && mine.stories[0].views[0].clientId === B, mine);

    const del = await ask(a, 'story-delete', { id: posted.id });
    ok('the author can delete it', del.ok === true, del);
    const feedB3 = await ask(b, 'stories-get');
    ok('gone for friends after delete', !feedB3.people.some((p) => p.clientId === A), feedB3);

    a.close(); b.close(); c.close();
  } catch (e) {
    failed++;
    console.log('FAIL exception', e.message);
  }
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
  done(failed ? 1 : 0);
})();
