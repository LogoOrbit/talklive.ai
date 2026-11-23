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

    // Instagram-style answers: a heart, a reaction and a reply.
    const liked = await ask(b, 'story-like', { clientId: A, id: posted.id, on: true });
    ok('a friend can like a story', liked.ok === true, liked);
    const feedB4 = await ask(b, 'stories-get');
    ok('the like shows for the friend', feedB4.people.find((p) => p.clientId === A).stories[0].liked === true, feedB4);
    const strangerLike = await ask(c, 'story-like', { clientId: A, id: posted.id, on: true });
    const feedA1 = await ask(a, 'stories-get');
    ok('the author sees who liked it', feedA1.people[0].stories[0].likeCount === 1 && feedA1.people[0].stories[0].views[0].liked === true, feedA1.people[0]);
    ok('a stranger cannot like it', strangerLike.ok === true && feedA1.people[0].stories[0].likeCount === 1);
    const inboxReact = once(a, 'friend-message');
    const reacted = await ask(b, 'story-react', { clientId: A, id: posted.id, emoji: '🔥' });
    ok('a reaction is accepted', reacted.ok === true, reacted);
    const rmsg = await inboxReact;
    ok('the reaction arrives in the inbox with the story', rmsg.text === '🔥' && rmsg.story && rmsg.story.kind === 'react' && rmsg.story.id === posted.id, rmsg);
    const badEmoji = await ask(b, 'story-react', { clientId: A, id: posted.id, emoji: 'x' });
    ok('an unknown reaction is refused', badEmoji.ok === false, badEmoji);
    const inboxReply = once(a, 'friend-message');
    const replied = await ask(b, 'story-reply', { clientId: A, id: posted.id, text: 'Love this!' });
    ok('a reply is accepted', replied.ok === true, replied);
    const ymsg = await inboxReply;
    ok('the reply arrives in the inbox with the story', ymsg.text === 'Love this!' && ymsg.story && ymsg.story.kind === 'reply' && ymsg.story.text === 'Hello friends 👋🔥', ymsg);
    const feedA2 = await ask(a, 'stories-get');
    ok('the viewer list shows the reaction', feedA2.people[0].stories[0].views[0].reaction === '🔥', feedA2.people[0].stories[0].views);
    const unliked = await ask(b, 'story-like', { clientId: A, id: posted.id, on: false });
    const feedA3 = await ask(a, 'stories-get');
    ok('a like can be taken back', unliked.ok && feedA3.people[0].stories[0].likeCount === 0, feedA3.people[0].stories[0]);

    // Layers: text and emoji anywhere, moved, sized and turned.
    const lay = await ask(a, 'story-post', { text: '', bg: 'blue', gifs: [{ ...gif, s: 1.6, r: 12 }], layers: [
      { t: 'text', text: 'Hi there', x: 0.3, y: 0.2, s: 2, r: -15, c: '#facc15', b: true },
      { t: 'emoji', text: '🔥', x: 0.8, y: 0.9, s: 9, r: 400 },
      { t: 'text', text: 'see https://spam.example', x: 0.5, y: 0.5 },
    ] });
    ok('a story with a link in a text layer is refused', lay.ok === false, lay);
    const lay2 = await ask(a, 'story-post', { text: '', bg: 'blue', gifs: [{ ...gif, s: 1.6, r: 12 }], layers: [
      { t: 'text', text: 'Hi there', x: 0.3, y: 0.2, s: 2, r: -15, c: '#facc15', b: true },
      { t: 'emoji', text: '🔥', x: 0.8, y: 0.9, s: 9, r: 400 },
      { t: 'bogus', text: 'x' },
    ] });
    ok('a layered story posts', lay2.ok === true, lay2);
    const fl = await ask(b, 'stories-get');
    const ls = fl.people.find((p) => p.clientId === A).stories.find((x) => x.id === lay2.id);
    ok('layers come back clamped and cleaned', ls && ls.layers.length === 2 && ls.layers[0].c === '#facc15' && ls.layers[0].b === true
      && ls.layers[1].s === 5 && ls.layers[1].r === 180 && ls.gifs[0].s === 1.6 && ls.gifs[0].r === 12, ls);
    await ask(a, 'story-delete', { id: lay2.id });

    // Games with a friend from the chat, no call.
    const gotInvite = once(b, 'friend-game');
    a.emit('friend-game', { toClientId: B, data: { type: 'invite', game: 'ttt' } });
    const inv = await gotInvite;
    ok('a friend game invite reaches the friend', inv.fromClientId === A && inv.data.type === 'invite' && inv.name === 'Ann', inv);
    const strangerBack = once(c, 'friend-game');
    c.emit('friend-game', { toClientId: A, data: { type: 'invite', game: 'ttt' } });
    const sb = await strangerBack;
    ok('a stranger cannot start a friend game', sb.data.type === 'decline', sb);

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
