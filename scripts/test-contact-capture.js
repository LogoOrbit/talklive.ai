#!/usr/bin/env node
/*
 * Opt-in contact capture and the dashboard's Data tab:
 *   - the extractor finds emails, phones and social handles, and skips noise
 *   - nothing is captured from someone who has not opted in
 *   - after opting in, only the sender's own messages are captured
 *   - the Data tab, CSV and per-user JSON show it; delete removes it
 *   - opting out erases everything captured
 *   - the Data API needs a dashboard session
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { io } = require('socket.io-client');
const totp = require('../server/totp');
const { extractContacts } = require('../server/contact-capture');

const PORT = 3000 + Math.floor(Math.random() * 2000) + 4000;
const BASE = `http://localhost:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-contacts-'));

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
function connect(name) {
  const sock = io(BASE, { transports: ['websocket'], forceNew: true });
  sock.emit('register', { clientId: 'c_test_' + name, username: name, gender: 'male' });
  return sock;
}

// --- Extractor ---------------------------------------------------------------
const has = (text, type, value) => extractContacts(text).some((c) => c.type === type && c.value === value);
ok('email', has('mail me at John.Doe@Example.com', 'email', 'john.doe@example.com'));
ok('phone with separators', has('call 0300 1234567', 'phone', '03001234567'));
ok('international phone', has('+1 (555) 123-4567', 'phone', '+15551234567'));
ok('instagram keyword', has('my insta is @cool.cat', 'instagram', 'cool.cat'));
ok('snapchat keyword', has('snap: cool_guy99', 'snapchat', 'cool_guy99'));
ok('telegram link', has('t.me/someone', 'telegram', 'someone'));
ok('bare @handle', has('follow @travel_life', 'handle', 'travel_life'));
ok('plain chat finds nothing', extractContacts('hi how are you, I am 25 and live in 2 cities').length === 0);
ok('dates are not phones', extractContacts('born 2001-05-12').length === 0);
ok('ordinary words after a platform are not handles', extractContacts('fb is not good').length === 0);

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', OWNER_SETUP_TOKEN: 'test-setup-token', DATABASE_URL: '' },
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
    const json = { 'Content-Type': 'application/json' };
    ok('Data API needs a dashboard session', (await fetch(BASE + '/owner/api/data')).status === 401);
    const setup = await (await fetch(BASE + '/owner/api/setup', { method: 'POST', headers: json, body: JSON.stringify({ password: 'correct horse battery', setupToken: 'test-setup-token' }) })).json();
    const conf = await fetch(BASE + '/owner/api/setup-confirm', { method: 'POST', headers: json, body: JSON.stringify({ code: totp.totpCode(setup.secret), setupToken: 'test-setup-token' }) });
    const owner = { ...json, cookie: String(conf.headers.get('set-cookie') || '').split(';')[0] };
    const rows = async () => (await (await fetch(BASE + '/owner/api/data', { headers: owner })).json()).rows;
    const rowOf = async (name) => (await rows()).find((r) => r.clientId === 'c_test_' + name);

    const a = connect('Alpha');
    const b = connect('Bravo');
    socks.push(a, b);
    const st = await once(a, 'contact-consent');
    ok('consent is off by default', st.on === false);
    await wait(300);
    const matched = Promise.all([once(a, 'matched'), once(b, 'matched')]);
    a.emit('find-partner', { mode: 'chat' });
    b.emit('find-partner', { mode: 'chat' });
    await matched;

    // Emails are links to the chat filter, so these are refused - capture
    // still runs on what an opted-in person typed.
    let got = once(a, 'chat-blocked');
    a.emit('chat-message', { text: 'before opt-in: early@example.com', id: 'm1' });
    await got;
    await wait(200);
    ok('nothing captured without consent', !(await rowOf('Alpha')));

    a.emit('set-contact-consent', { on: true });
    ok('opt-in confirmed', (await once(a, 'contact-consent')).on === true);

    got = once(a, 'chat-blocked');
    a.emit('chat-message', { text: 'my insta is @alpha.cat, mail alpha@example.com, call +44 7700 900123', id: 'm2' });
    await got;
    got = once(b, 'chat-blocked');
    b.emit('chat-message', { text: 'mine is bravo@example.com', id: 'm3' });
    await got;
    await wait(200);

    const ra = await rowOf('Alpha');
    const vals = ra ? ra.contacts.map((c) => c.type + ':' + c.value).sort() : [];
    ok('captures the opted-in sender\'s details', JSON.stringify(vals) === JSON.stringify(['email:alpha@example.com', 'instagram:alpha.cat', 'phone:+447700900123']), vals);
    ok('earlier message stays uncaptured', !vals.includes('email:early@example.com'));
    ok('the partner (not opted in) is not captured', !(await rowOf('Bravo')));
    ok('consent shows on the row', ra && ra.consent && ra.consent.on === true);

    const csv = await (await fetch(BASE + '/owner/api/export/contacts.csv', { headers: owner })).text();
    ok('contacts CSV lists them', csv.includes('alpha@example.com') && csv.includes('+447700900123'));
    const userCsv = await (await fetch(BASE + '/owner/api/export/user-data.csv', { headers: owner })).text();
    ok('user-data CSV lists them', userCsv.includes('instagram:alpha.cat'));
    const one = await fetch(BASE + '/owner/api/data/user/c_test_Alpha.json', { headers: owner });
    const oneJson = await one.json();
    ok('per-user JSON download', one.ok && oneJson.contacts.length === 3 && /attachment/.test(one.headers.get('content-disposition')));

    const del = await fetch(BASE + '/owner/api/data/delete', { method: 'POST', headers: owner, body: JSON.stringify({ clientId: 'c_test_Alpha', type: 'phone', value: '+447700900123' }) });
    ok('delete one item', del.ok && (await rowOf('Alpha')).contacts.length === 2);

    a.emit('set-contact-consent', { on: false });
    ok('opt-out confirmed', (await once(a, 'contact-consent')).on === false);
    await wait(200);
    ok('opt-out erases captured data', !(await rowOf('Alpha')));
  } catch (err) {
    failed++;
    console.log('FAIL', err.message);
    console.log(logs.join('').slice(-2000));
  }
  console.log(failed ? `\n${failed} failed` : '\nAll passed');
  done(failed ? 1 : 0);
})();
