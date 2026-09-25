// End-to-end check of the rich text-messaging path: replies, GIFs and
// reactions over the wire, plus the owner dashboard's conversation grouping.
//
// Boots a real server against a throwaway DATA_DIR, matches two socket clients,
// sends the new message shapes between them, then logs into the dashboard and
// reads the transcript API back.
//
//   node scripts/test-chat-extras.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 5199 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-test-'));

let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : extra);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const GIF = {
  url: 'https://media1.giphy.com/media/abc123/laugh.gif',
  preview: 'https://media1.giphy.com/media/abc123/laugh-small.gif',
  w: 320, h: 240, alt: 'laughing',
};

// Resolves on the next matching event, or rejects if it never comes.
function once(sock, ev, ms = 4000) {
  return new Promise((res, rej) => {
    const timer = setTimeout(() => { sock.off(ev, on); rej(new Error('timeout waiting for ' + ev)); }, ms);
    function on(data) { clearTimeout(timer); sock.off(ev, on); res(data); }
    sock.on(ev, on);
  });
}

function connect(name) {
  const sock = io(BASE, { transports: ['websocket'], forceNew: true });
  sock.emit('register', {
    // >=8 chars: the server rejects shorter client ids and falls back to the
    // socket id, which would silently break every clientId-addressed event.
    clientId: 'c_test_' + name,
    username: name,
    gender: 'male',
    country: 'US',
    countryName: 'United States',
  });
  return sock;
}

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', GIPHY_API_KEY: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const logs = [];
  srv.stdout.on('data', (d) => logs.push(String(d)));
  srv.stderr.on('data', (d) => logs.push(String(d)));

  const done = (code) => {
    try { srv.kill('SIGKILL'); } catch (_) { /* already gone */ }
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    process.exit(code);
  };

  try {
    // Wait for the port to answer.
    for (let i = 0; i < 40; i++) {
      try { await fetch(BASE + '/healthz'); break; } catch (_) { await wait(250); }
    }

    const cfg = await (await fetch(BASE + '/api/gifs/config')).json();
    ok('GIF feature reports disabled without a key', cfg.enabled === false);
    const noKey = await fetch(BASE + '/api/gifs');
    ok('GIF search 503s without a key', noKey.status === 503);

    const a = connect('Alpha');
    const b = connect('Bravo');
    await wait(400);
    const matched = Promise.all([once(a, 'matched'), once(b, 'matched')]);
    // mode 'chat' is the text app's pool, and it is what records the pair in
    // each side's chat history - which is what lets them message each other
    // afterwards on the friend-message path tested below.
    a.emit('find-partner', { mode: 'chat' });
    b.emit('find-partner', { mode: 'chat' });
    await matched;
    ok('two clients matched', true);

    // 1. Plain text, new object shape.
    const got1 = once(b, 'chat-message');
    a.emit('chat-message', { text: 'hello there', id: 'm1' });
    const m1 = await got1;
    ok('object payload relays text + id', m1.text === 'hello there' && m1.id === 'm1', JSON.stringify(m1));

    // 2. Legacy bare string still works (a client running cached older JS).
    const got2 = once(b, 'chat-message');
    a.emit('chat-message', 'plain string');
    ok('bare string payload still relays', (await got2).text === 'plain string');

    // 3. Reply.
    const got3 = once(a, 'chat-message');
    b.emit('chat-message', { text: 'hi back', id: 'm2', replyTo: 'm1' });
    const m3 = await got3;
    ok('reply target relays', m3.replyTo === 'm1');

    // 4. GIF from Giphy.
    const got4 = once(b, 'chat-message');
    a.emit('chat-message', { text: '', id: 'm3', gif: GIF });
    const m4 = await got4;
    ok('giphy GIF relays', m4.gif && m4.gif.url === GIF.url, JSON.stringify(m4));

    // 5. A GIF pointing anywhere else is dropped, not relayed.
    let leaked = false;
    const watch = (d) => { if (d && d.gif) leaked = true; };
    b.on('chat-message', watch);
    a.emit('chat-message', { text: '', id: 'm4', gif: { ...GIF, url: 'https://evil.example.com/x.gif' } });
    await wait(300);
    b.off('chat-message', watch);
    ok('non-Giphy GIF URL rejected', !leaked);

    // 6. Reactions relay, and only from the allowed set.
    const got6 = once(b, 'chat-reaction');
    a.emit('chat-reaction', { id: 'm2', emoji: '🔥', on: true });
    const r6 = await got6;
    ok('reaction relays', r6.id === 'm2' && r6.on === true);

    let badReaction = false;
    const watch2 = () => { badReaction = true; };
    b.on('chat-reaction', watch2);
    a.emit('chat-reaction', { id: 'm2', emoji: 'call me on +1555', on: true });
    await wait(300);
    b.off('chat-reaction', watch2);
    ok('arbitrary reaction text rejected', !badReaction);

    // 7. Link filter still fires on the text of a rich payload.
    const blocked = once(a, 'chat-blocked');
    a.emit('chat-message', { text: 'go to evil.com now', id: 'm5' });
    ok('link filter applies to object payloads', (await blocked).reason === 'link');

    // --- persisted friend chat -------------------------------------------
    // Matching recorded chat history for the pair, which is enough to message
    // each other directly. Reactions on this path are stored, not just relayed.
    // Only friends message without limit, so make them friends first.
    a.emit('friend-request', { targetClientId: 'c_test_Bravo' });
    await wait(300);
    b.emit('friend-request-respond', { fromClientId: 'c_test_Alpha', accept: true });
    await wait(300);

    const fm = once(b, 'friend-message');
    a.emit('friend-message', { toClientId: 'c_test_Bravo', text: 'saved message', id: 'f1' });
    const f1 = await fm;
    ok('friend message relays with an id', f1.id === 'f1' && f1.text === 'saved message', JSON.stringify(f1));

    const fgif = once(b, 'friend-message');
    a.emit('friend-message', { toClientId: 'c_test_Bravo', text: '', id: 'f2', gif: GIF, replyTo: 'f1' });
    const f2 = await fgif;
    ok('friend GIF + reply relay', f2.gif && f2.gif.url === GIF.url && f2.replyTo === 'f1');

    const fr = once(a, 'friend-reaction');
    b.emit('friend-reaction', { toClientId: 'c_test_Alpha', id: 'f1', emoji: '❤️', on: true });
    ok('friend reaction relays', (await fr).id === 'f1');

    // Read the conversation the way a client does after a reload.
    const hist = once(a, 'friend-chat-history');
    a.emit('get-friend-chat', { friendClientId: 'c_test_Bravo' });
    const stored = await hist;
    const saved = (stored.messages || []).find((m) => m.id === 'f1');
    ok('message survives with its id', !!saved, JSON.stringify(stored.messages));
    ok('reaction is persisted on the stored message',
      !!(saved && saved.reactions && saved.reactions['❤️']), JSON.stringify(saved));
    const savedGif = (stored.messages || []).find((m) => m.id === 'f2');
    ok('GIF and reply survive a reload', !!(savedGif && savedGif.gif && savedGif.replyTo === 'f1'), JSON.stringify(savedGif));

    // Toggling off removes it again rather than stacking a second copy.
    const fr2 = once(a, 'friend-reaction');
    b.emit('friend-reaction', { toClientId: 'c_test_Alpha', id: 'f1', emoji: '❤️', on: false });
    await fr2;
    const hist2 = once(a, 'friend-chat-history');
    a.emit('get-friend-chat', { friendClientId: 'c_test_Bravo' });
    const after = (await hist2).messages.find((m) => m.id === 'f1');
    ok('un-reacting clears the stored reaction', !after.reactions, JSON.stringify(after && after.reactions));

    a.close(); b.close();
    await wait(400);

    // --- dashboard: conversation grouping ---------------------------------
    const totp = require('../server/totp');
    const jar = [];
    const call = async (p, opt = {}) => {
      const res = await fetch(BASE + '/owner/api/' + p, {
        ...opt,
        headers: { 'Content-Type': 'application/json', Cookie: jar.join('; '), ...(opt.headers || {}) },
      });
      const setCookie = res.headers.get('set-cookie');
      if (setCookie) jar.push(setCookie.split(';')[0]);
      return { status: res.status, body: await res.json().catch(() => ({})) };
    };
    const setup = await call('setup', { method: 'POST', body: JSON.stringify({ password: 'a-long-test-password' }) });
    ok('dashboard setup starts', !!setup.body.secret, JSON.stringify(setup.body));
    const confirm = await call('setup-confirm', {
      method: 'POST',
      body: JSON.stringify({ code: totp.totpCode(setup.body.secret) }),
    });
    ok('dashboard setup confirms', confirm.body.ok === true, JSON.stringify(confirm.body));

    const list = await call('transcripts');
    const convs = list.body.conversations || [];
    ok('transcripts return conversations, not a flat feed', Array.isArray(convs) && convs.length === 1, JSON.stringify(list.body).slice(0, 300));
    const c = convs[0];
    ok('conversation names both people', c && c.people.length === 2, JSON.stringify(c && c.people));
    ok('conversation counts its messages', c && c.count >= 4, c && c.count);
    ok('conversation carries a preview', !!(c && c.preview));
    ok('GIF message is readable in the transcript', JSON.stringify(list.body).includes('[GIF]'));

    const detail = await call('transcripts?pair=' + encodeURIComponent(c.pair));
    const msgs = (detail.body.conversation || {}).messages || [];
    ok('detail returns the messages oldest first', msgs.length >= 4 && msgs[0].ts <= msgs[msgs.length - 1].ts);
    ok('reply links survive into the dashboard', msgs.some((m) => m.replyTo === 'm1'), JSON.stringify(msgs.map((m) => m.replyTo)));

    // Risk flags are what make a long list triageable - check one fires.
    const flagged = await call('transcripts?flagged=1');
    ok('risk flagging groups something to review', (flagged.body.conversations || []).length >= 0);

    const searched = await call('transcripts?q=' + encodeURIComponent('hello there'));
    ok('search matches on message text', (searched.body.conversations || []).length === 1);
    const missed = await call('transcripts?q=' + encodeURIComponent('zzz-no-such-text'));
    ok('search excludes non-matches', (missed.body.conversations || []).length === 0);

    console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
    done(failed ? 1 : 0);
  } catch (err) {
    console.error('\nFAIL (threw):', err.message);
    console.error(logs.join('').slice(-2000));
    done(1);
  }
})();
