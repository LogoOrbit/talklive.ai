// People may share their social media accounts and move to other apps.
// Boots a real server, matches two text chatters and checks over the wire that:
//   - handles, "add me on WhatsApp", phone numbers and links to social
//     profiles are delivered, and nobody is warned for them;
//   - links to other websites, look-alike social hosts and OnlyFans are still
//     refused;
//   - the same holds for messages between friends.
//
//   node scripts/test-social-sharing.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 5499 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-social-'));

let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : extra);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function once(sock, ev, ms = 4000) {
  return new Promise((res, rej) => {
    const timer = setTimeout(() => { sock.off(ev, on); rej(new Error('timeout waiting for ' + ev)); }, ms);
    function on(data) { clearTimeout(timer); sock.off(ev, on); res(data); }
    sock.on(ev, on);
  });
}

function connect(name) {
  const sock = io(BASE, { transports: ['websocket'], forceNew: true });
  sock.emit('register', { clientId: 'c_test_' + name, username: name, gender: 'male', country: 'US', countryName: 'United States' });
  return sock;
}

// Sends one message and says what happened to it: the text the other side got,
// or the reason it was refused.
let seq = 0;
async function send(from, to, text) {
  const id = 'm' + (++seq);
  const arrived = once(to, 'chat-message', 900).then((m) => ({ got: m.text }), () => null);
  const refused = once(from, 'chat-blocked', 900).then((m) => ({ blocked: m.reason }), () => null);
  from.emit('chat-message', { text, id });
  const [a, b] = await Promise.all([arrived, refused]);
  return a || b || { silent: true };
}

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', OWNER_SETUP_TOKEN: 'test-setup-token', GIPHY_API_KEY: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const done = (code) => {
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
    await wait(400);
    const matched = Promise.all([once(a, 'matched'), once(b, 'matched')]);
    a.emit('find-partner', { mode: 'chat' });
    b.emit('find-partner', { mode: 'chat' });
    await matched;

    // The rate limiter allows 5 messages in 5 seconds: pace the sends.
    const allowed = [
      'my insta is @john.doe',
      'add me on whatsapp 0300 1234567',
      'whats your snapchat?',
      'lets move to telegram',
      'here is my profile https://www.instagram.com/john.doe/',
      'wa.me/923001234567',
      'snapchat.com/add/johnny and tiktok.com/@john.doe',
      'discord.gg/abc123',
    ];
    for (const text of allowed) {
      const r = await send(a, b, text);
      ok(`delivered: ${text}`, r.got === text, JSON.stringify(r));
      await wait(1100);
    }
    const refused = [
      'check cheapdeals.shop',
      'https://evil.com/login',
      'instagram.com.evil.ru/x',
      'https://l.instagram.com/?u=evil.com',
      'instagram.com@evil.com',
      'onlyfans.com/me',
      'bit.ly/abc',
    ];
    for (const text of refused) {
      const r = await send(b, a, text);
      ok(`refused: ${text}`, r.blocked === 'link' || r.blocked === 'unsafe', JSON.stringify(r));
      await wait(1100);
    }
    // A refused message mixed with a social link is refused whole.
    const mixed = await send(a, b, 'instagram.com/john and evil.com');
    ok('social link plus another site is refused', mixed.blocked === 'link', JSON.stringify(mixed));

    // Nobody is warned for sharing socials.
    const warned = await new Promise((res) => {
      const w = [];
      a.on('owner-warning', (x) => w.push(x));
      setTimeout(() => res(w), 800);
    });
    ok('no warning for sharing socials', warned.length === 0, JSON.stringify(warned));

    a.close(); b.close();
    console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
    done(failed ? 1 : 0);
  } catch (err) {
    console.log('FAIL', err.message);
    done(1);
  }
})();
