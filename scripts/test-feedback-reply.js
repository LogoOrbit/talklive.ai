#!/usr/bin/env node
/*
 * Owner replies to feedback, end to end against a real server:
 *   - the dashboard lists feedback without exposing clientId/account
 *   - a reply to someone online reaches their open tab at once
 *   - a reply to someone offline waits and appears on their next visit
 *   - it keeps coming back until they dismiss it; only they can dismiss it
 *   - the API refuses an empty reply or an unknown feedback id
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { io } = require('socket.io-client');
const totp = require('../server/totp');

const PORT = 3000 + Math.floor(Math.random() * 2000) + 4000;
const BASE = `http://localhost:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-fbreply-'));

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
// Resolves with every event of this name seen within `ms`.
function collect(sock, ev, ms) {
  const got = [];
  const on = (d) => got.push(d);
  sock.on(ev, on);
  return wait(ms).then(() => { sock.off(ev, on); return got; });
}
function connect(id) {
  const sock = io(BASE, { transports: ['websocket'], forceNew: true });
  sock.emit('register', { clientId: id, nickname: 'Tester' });
  return sock;
}

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
    const setup = await (await fetch(BASE + '/owner/api/setup', { method: 'POST', headers: json, body: JSON.stringify({ password: 'correct horse battery', setupToken: 'test-setup-token' }) })).json();
    const conf = await fetch(BASE + '/owner/api/setup-confirm', { method: 'POST', headers: json, body: JSON.stringify({ code: totp.totpCode(setup.secret), setupToken: 'test-setup-token' }) });
    const cookie = String(conf.headers.get('set-cookie') || '').split(';')[0];
    ok('dashboard session created', conf.ok && cookie.startsWith('tl_owner='));
    const owner = { ...json, cookie };
    const reply = (id, message) => fetch(BASE + `/owner/api/feedback/${id}/reply`, { method: 'POST', headers: owner, body: JSON.stringify({ message }) });
    const list = async () => (await (await fetch(BASE + '/owner/api/feedback', { headers: owner })).json()).feedback;

    ok('reply API needs a dashboard session',
      (await fetch(BASE + '/owner/api/feedback/x/reply', { method: 'POST', headers: json, body: '{}' })).status === 401);
    ok('refuses a reply to unknown feedback', (await reply('nope', 'Thanks!')).status === 404);

    const id = 'c_fb' + Date.now().toString(36);
    let a = connect(id);
    socks.push(a);
    await once(a, 'profile');
    a.emit('feedback', { text: 'Please add dark mode.' });
    await wait(300);
    const fb = (await list()).find((f) => f.text === 'Please add dark mode.');
    ok('feedback is listed as answerable', fb && fb.canReply === true);
    ok('listing does not expose clientId/account', fb && fb.clientId === undefined && fb.account === undefined);
    ok('refuses an empty reply', (await reply(fb.id, ' ')).status === 400);

    // 1. Online: delivered at once.
    const live = once(a, 'feedback-reply');
    const r1 = await (await reply(fb.id, 'Dark mode is on the way!')).json();
    const got1 = await live;
    ok('online person receives it immediately', got1.id === fb.id && got1.message === 'Dark mode is on the way!' && got1.feedback === 'Please add dark mode.');
    ok('API reports it as delivered live', r1.delivered === true);
    ok('payload carries no internal fields', got1.clientId === undefined && got1.account === undefined);

    // 2. Not dismissed: shown again on the next visit.
    a.close();
    await wait(300);
    a = connect(id);
    socks.push(a);
    ok('undismissed reply comes back on the next visit', (await once(a, 'feedback-reply')).id === fb.id);

    // 3. Only the sender can dismiss it.
    const stranger = connect('c_other' + Date.now().toString(36));
    socks.push(stranger);
    await once(stranger, 'profile');
    stranger.emit('feedback-reply-ack', { id: fb.id });
    await wait(300);
    ok('someone else cannot dismiss it', !(await list()).find((f) => f.id === fb.id).reply.seenAt);
    a.emit('feedback-reply-ack', { id: fb.id });
    await wait(300);
    ok('dismissal is recorded as seen', !!(await list()).find((f) => f.id === fb.id).reply.seenAt);

    // 4. Offline: an edited reply is queued and shown on the next visit.
    a.close();
    await wait(300);
    const r2 = await (await reply(fb.id, 'Update: dark mode shipped.')).json();
    ok('offline reply is queued, not delivered', r2.delivered === false && !r2.feedback.reply.deliveredAt);
    a = connect(id);
    socks.push(a);
    const seen = await collect(a, 'feedback-reply', 3800);
    ok('queued reply appears on the next visit', seen.some((r) => r.message === 'Update: dark mode shipped.'));
    a.emit('feedback-reply-ack', { id: fb.id });
    await wait(300);
    a.close();
    await wait(300);
    a = connect(id);
    socks.push(a);
    ok('a dismissed reply does not come back', (await collect(a, 'feedback-reply', 3800)).length === 0);

    const audit = await (await fetch(BASE + '/owner/api/audit', { headers: owner })).json();
    ok('replying is written to the audit log', audit.audit.some((e) => e.action === 'feedback-reply'));
  } catch (err) {
    failed++;
    console.log('FAIL', err.message);
    console.log(logs.join('').slice(-2000));
  }
  console.log(failed ? `${failed} check(s) failed` : 'All feedback reply checks passed');
  done(failed ? 1 : 0);
})();
