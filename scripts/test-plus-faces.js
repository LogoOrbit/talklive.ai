// No path lets a person without Plus wear (and others see) a Plus face, or a
// special face below its tier (docs/SPEC-PROFILE-PROGRESS-POSTS.md, sections 8 and 10).
// Each way a face can get onto a profile is tried by a free user:
//   - register (never-seen guest, avatar + animal slots, mixed slots, character)
//   - the animal sent with a search (find-partner)
//   - the account's saved face (register while signed in)
//   - login / resume-session results
//   - cloud settings sync (settings-save, returned on the next sign-in)
// A Plus member is checked too, so the test cannot pass by refusing everyone.
//
//   node scripts/test-plus-faces.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 7500 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-plusface-'));
const DATA_FILE = path.join(DATA_DIR, 'owner-data.json');
const SECRET = crypto.randomBytes(32).toString('hex');
const sign = (id) => crypto.createHmac('sha256', SECRET).update(id).digest('hex');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : JSON.stringify(extra));
};
let logs = '';
const socks = [];
function once(sock, ev, ms = 6000) {
  return new Promise((res, rej) => {
    const t = setTimeout(() => { sock.off(ev, on); rej(new Error('timeout ' + ev)); }, ms);
    function on(d) { clearTimeout(t); sock.off(ev, on); res(d); }
    sock.on(ev, on);
  });
}
function connect(clientId, name, extra) {
  const s = io(BASE, { transports: ['websocket'], forceNew: true });
  socks.push(s);
  s.emit('register', { clientId, username: name, gender: 'male', identityToken: sign(clientId), ...extra });
  return s;
}
let seq = 0;
// What a stranger matched with `me` sees of them.
async function seenBy(me, searchOpts) {
  seq++;
  const obs = connect('c_pf_obs_' + seq, 'Obs' + seq);
  await wait(400);
  const seen = once(obs, 'matched');
  me.emit('find-partner', { mode: 'talk', ...(searchOpts || {}) });
  await wait(150);
  obs.emit('find-partner', { mode: 'talk' });
  const m = await seen;
  await wait(1700); // past the hit-and-run window
  me.close(); obs.close();
  await wait(250);
  return m.partner;
}
const faceOf = (p) => [p.avatar, p.animal, p.character].filter(Boolean).join(' ');
const locked = (p) => /lion|raccoon|giraffe|dragon|unicorn|tiger|ninja|detective|warrior|gamer|silver_knight|gold_phoenix|diamond_legend/.test(faceOf(p));

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', DATABASE_URL: '', IDENTITY_SECRET: SECRET, PREMIUM_CLIENT_IDS: 'c_pf_plus_01', SAVE_DEBOUNCE_MS: '200' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  srv.stdout.on('data', (d) => { logs += d; });
  srv.stderr.on('data', (d) => { logs += d; });
  const done = (code) => {
    socks.forEach((s) => { try { s.close(); } catch (_) { /* gone */ } });
    try { srv.kill('SIGKILL'); } catch (_) { /* gone */ }
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    process.exit(code);
  };
  try {
    for (let i = 0; i < 60; i++) { try { await fetch(BASE + '/healthz'); break; } catch (_) { await wait(250); } }

    // --- register ------------------------------------------------------------
    let p = await seenBy(connect('c_pf_free_01', 'Free1', { avatar: 'a:lion', animal: 'lion' }));
    ok('register: a never-seen guest with a Plus animal shows a free face', !locked(p) && /penguin/.test(faceOf(p)), p);
    p = await seenBy(connect('c_pf_free_02', 'Free2', { avatar: 'c:ninja', animal: 'c:ninja' }));
    ok('register: a Plus character shows the free character', !locked(p) && p.avatar === 'c:chef', p);
    p = await seenBy(connect('c_pf_free_03', 'Free3', { avatar: 'c:gold_phoenix', animal: 'c:gold_phoenix' }));
    ok('register: a special face below its tier is not shown', !locked(p), p);
    p = await seenBy(connect('c_pf_free_04', 'Free4', { avatar: 'a:penguin', animal: 'lion' }));
    ok('register: a free avatar with a Plus animal slot leaks nothing', !locked(p), p);
    p = await seenBy(connect('c_pf_free_05', 'Free5', { avatar: 'a:owl', animal: 'owl' }));
    ok('register: a free face is kept', p.avatar === 'a:owl' && p.animal === 'owl', p);

    // --- the animal sent with a search ----------------------------------------
    p = await seenBy(connect('c_pf_free_06', 'Free6', { avatar: 'a:owl', animal: 'owl' }), { animal: 'lion' });
    ok('find-partner: a Plus animal sent with the search is not shown', !locked(p), p);
    p = await seenBy(connect('c_pf_free_07', 'Free7', { avatar: 'a:owl', animal: 'owl' }), { animal: 'dragon' });
    ok('find-partner: nor a second locked animal', !locked(p), p);

    // --- control: Plus really can ---------------------------------------------
    p = await seenBy(connect('c_pf_plus_01', 'Plus1', { avatar: 'a:lion', animal: 'lion' }));
    ok('a Plus member does show a Plus face', p.avatar === 'a:lion', p);

    // --- accounts: saved face, login, resume, cloud settings -------------------
    const g = connect('c_pf_acct_g1', 'Acct');
    await once(g, 'register-result').catch(() => null);
    const sent = once(g, 'signup-code-result');
    g.emit('signup-send-code', { dob: '1990-01-01', username: 'facetest', password: 'face-pass-1', email: 'face@example.com' });
    await sent;
    let code = null;
    for (let i = 0; i < 60 && !code; i++) {
      const m = logs.match(/verification code for face@example\.com is (\d{6})/);
      if (m) code = m[1]; else await wait(50);
    }
    const made = await new Promise((res) => { g.once('signup-result', res); g.emit('signup', { dob: '1990-01-01', username: 'facetest', password: 'face-pass-1', email: 'face@example.com', code }); });
    ok('account created', made.ok === true && made.sessionToken, made);
    const accountCid = made.profileClientId;
    const accountTok = made.identityToken;
    ok('account has its own profile id', typeof accountCid === 'string' && accountCid.length >= 8, made);

    // A signed-in socket registering with a Plus face (the account saves its face).
    const s1 = io(BASE, { transports: ['websocket'], forceNew: true });
    socks.push(s1);
    await once(s1, 'connect');
    s1.emit('register', { clientId: 'c_pf_acct_g2', nickname: 'Acct', identityToken: sign('c_pf_acct_g2') });
    await once(s1, 'register-result').catch(() => null);
    const resumed = await new Promise((res) => { s1.once('resume-session-result', res); s1.emit('resume-session', { token: made.sessionToken }); });
    ok('resume-session works', resumed.ok === true, resumed);
    ok('resume-session result carries no Plus face', !/^(lion|raccoon|giraffe|dragon|unicorn|tiger)$/.test(String(resumed.animal || '')), resumed.animal);
    s1.close();
    const s2 = connect(accountCid, 'Acct', { identityToken: accountTok, avatar: 'a:lion', animal: 'lion' });
    await once(s2, 'register-result').catch(() => null);
    const r2 = await new Promise((res) => { s2.once('resume-session-result', res); s2.emit('resume-session', { token: made.sessionToken }); });
    ok('signed in on the account profile', r2.ok === true, r2);
    s2.emit('register', { clientId: accountCid, nickname: 'Acct', identityToken: accountTok, avatar: 'a:lion', animal: 'lion' });
    await wait(500);
    const seen = await seenBy(s2);
    ok('account register: others do not see the Plus face', !locked(seen), seen);
    await wait(500);
    const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')).accounts.facetest;
    ok('the account record never stores the Plus face', saved && !/^(lion|raccoon|giraffe|dragon|unicorn|tiger)$/.test(String(saved.animal || '')) && saved.animal !== 'a:lion', saved && saved.animal);

    // Cloud settings with face values.
    const s3 = io(BASE, { transports: ['websocket'], forceNew: true });
    socks.push(s3);
    await once(s3, 'connect');
    s3.emit('register', { clientId: 'c_pf_acct_g3', nickname: 'Acct', identityToken: sign('c_pf_acct_g3') });
    await once(s3, 'register-result').catch(() => null);
    const r3 = await new Promise((res) => { s3.once('resume-session-result', res); s3.emit('resume-session', { token: made.sessionToken }); });
    s3.emit('settings-save', { settings: { animal: 'a:lion', avatar: 'c:ninja', face: 'lion', theme: 'dark' }, times: { animal: Date.now(), avatar: Date.now(), face: Date.now(), theme: Date.now() } });
    await wait(500);
    s3.close();
    const s4 = io(BASE, { transports: ['websocket'], forceNew: true });
    socks.push(s4);
    await once(s4, 'connect');
    s4.emit('register', { clientId: 'c_pf_acct_g4', nickname: 'Acct', identityToken: sign('c_pf_acct_g4') });
    await once(s4, 'register-result').catch(() => null);
    const r4 = await new Promise((res) => { s4.once('resume-session-result', res); s4.emit('resume-session', { token: made.sessionToken }); });
    const cloud = r4.settings || {};
    ok('cloud settings: a Plus face is not synced back', cloud.animal === undefined && cloud.avatar === undefined && cloud.face === undefined, cloud);
    ok('cloud settings: ordinary settings still sync', cloud.theme === 'dark', cloud);
    ok('cloud settings: first sign-in result was clean too', !r3.settings || (r3.settings.animal === undefined && r3.settings.avatar === undefined), r3.settings);
    const stored = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')).accountSettings || {};
    ok('cloud settings: nothing locked is stored', !stored.facetest || (stored.facetest.animal === undefined && stored.facetest.face === undefined), stored.facetest);

    // login (password) result
    const s5 = io(BASE, { transports: ['websocket'], forceNew: true });
    socks.push(s5);
    await once(s5, 'connect');
    s5.emit('register', { clientId: 'c_pf_acct_g5', nickname: 'Acct', identityToken: sign('c_pf_acct_g5') });
    await once(s5, 'register-result').catch(() => null);
    const li = await new Promise((res) => { s5.once('login-result', res); s5.emit('login', { username: 'facetest', password: 'face-pass-1' }); });
    ok('login result carries no Plus face', li.ok === true && !/^(lion|raccoon|giraffe|dragon|unicorn|tiger)$/.test(String(li.animal || '')) && !li.settings.animal, [li.animal, li.settings]);
  } catch (err) {
    console.error(err);
    failed++;
  }
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
  done(failed ? 1 : 0);
})();
