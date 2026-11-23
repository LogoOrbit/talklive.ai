// Every payload that shows another person carries their CURRENT face, even
// when that person is offline and the stored friend/history row has none
// (the Android bug: profile sheets and chat headers showed only an initial).
// Also checks the boot migration of Plus faces for people without Plus.
//
//   node scripts/test-avatar-visible.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 7199 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-avvis-'));
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
const FREE = new Set(['a:cat', 'a:fox', 'a:panda', 'a:rabbit', 'a:dog', 'c:wizard', 'c:pirate', 'c:robot', 'c:queen', 'c:artist']);

const now = Date.now();
fs.writeFileSync(path.join(DATA_DIR, 'owner-data.json'), JSON.stringify({
  accounts: {
    alice: { nickname: 'Alice', animal: 'lion', clientId: 'c_av_alice' }, // Plus face, no Plus
    carol: { nickname: 'Carol', animal: 'c:artist', clientId: 'c_av_carol' },
    dave: { nickname: 'Dave', animal: 'c:ninja', clientId: 'c_av_dave' }, // Plus character
  },
  heldFace: { c_av_guestplus: 'a:giraffe' },
  social: {
    friends: {
      c_av_bob: {
        c_av_alice: { username: 'Alice' }, // saved row without any avatar
        c_av_carol: { username: 'Carol', avatar: null },
        c_av_guest: { username: 'Gus' }, // never picked a face
        c_av_guestplus: { username: 'Gia', avatar: 'a:giraffe' },
        c_av_dave: { username: 'Dave', avatar: 'c:ninja' },
      },
    },
    chatHistory: { c_av_bob: [{ clientId: 'c_av_carol', username: 'Carol', countryCode: 'IN', mode: 'chat', ts: now }] },
  },
}));

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', DATABASE_URL: '', IDENTITY_SECRET: SECRET },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  const done = (code) => { try { srv.kill('SIGKILL'); } catch (_) { /* gone */ } fs.rmSync(DATA_DIR, { recursive: true, force: true }); process.exit(code); };
  try {
    for (let i = 0; i < 60; i++) { try { await fetch(BASE + '/healthz'); break; } catch (_) { await wait(250); } }
    const bob = io(BASE, { transports: ['websocket'], forceNew: true });
    const sync = once(bob, 'state-sync');
    bob.emit('register', { clientId: 'c_av_bob', username: 'Bob', gender: 'male', identityToken: sign('c_av_bob') });
    const st = await sync;
    const row = (id) => st.friends.find((f) => f.clientId === id) || {};
    ok('offline friend with an account face shows the migrated free face', row('c_av_alice').avatar === 'a:cat', row('c_av_alice'));
    ok('offline friend with a saved account face and an empty row shows it', row('c_av_carol').avatar === 'c:artist', row('c_av_carol'));
    ok('a friend who never picked a face still has a free one', FREE.has(row('c_av_guest').avatar), row('c_av_guest'));
    ok('a guest wearing a Plus face without Plus is shown a free face', FREE.has(row('c_av_guestplus').avatar) && row('c_av_guestplus').avatar.startsWith('a:'), row('c_av_guestplus'));
    ok('a stored Plus character row is rewritten', row('c_av_dave').avatar === 'c:wizard', row('c_av_dave'));
    ok('history rows carry the face', (st.chatHistory[0] || {}).avatar === 'c:artist', st.chatHistory);

    const fid = row('c_av_carol').friendId;
    const found = once(bob, 'find-by-friend-id-result');
    bob.emit('find-by-friend-id', { friendId: fid });
    const r = await found;
    ok('find-by-friend-id carries the face', r.ok && r.user.avatar === 'c:artist', r);

    // Live: a registered partner sends no avatar at all -> still a face.
    const eve = io(BASE, { transports: ['websocket'], forceNew: true });
    eve.emit('register', { clientId: 'c_av_eve', username: 'Eve', gender: 'female', identityToken: sign('c_av_eve') });
    await wait(300);
    const m = Promise.all([once(bob, 'matched'), once(eve, 'matched')]);
    bob.emit('find-partner', { mode: 'chat' });
    eve.emit('find-partner', { mode: 'chat' });
    const [mb] = await m;
    ok('matched partner payload carries a face', !!mb.partner.avatar && FREE.has(mb.partner.avatar), mb.partner);
    bob.close(); eve.close();

    await wait(3000); // debounced save
    const saved = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'owner-data.json'), 'utf8'));
    ok('stored account face is rewritten by the boot migration', saved.accounts.alice.animal === 'cat' && saved.accounts.dave.animal === 'c:wizard', saved.accounts);
    ok('the chosen Plus face is remembered for when Plus returns', saved.plusFaces && saved.plusFaces.c_av_alice && saved.plusFaces.c_av_alice.face === 'a:lion', saved.plusFaces);
    ok('migration leaves free faces alone', saved.accounts.carol.animal === 'c:artist', saved.accounts.carol);
  } catch (err) {
    console.error(err);
    failed++;
  }
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
  done(failed ? 1 : 0);
})();
