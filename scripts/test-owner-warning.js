#!/usr/bin/env node
/*
 * Owner warnings, end to end against a real server:
 *   - a warning to someone online reaches their open tab at once
 *   - a warning to someone offline waits and appears on their next visit
 *   - it keeps coming back until they acknowledge it, then never again
 *   - only the person it was sent to can acknowledge it
 *   - a withdrawn warning is never shown
 *   - the dashboard API refuses a warning with no target or no message
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { io } = require('socket.io-client');
const totp = require('../server/totp');

const PORT = 3000 + Math.floor(Math.random() * 2000) + 4000;
const BASE = `http://localhost:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-warn-'));

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

    // Dashboard session: first-run setup, confirmed with a real TOTP code.
    const json = { 'Content-Type': 'application/json' };
    const setup = await (await fetch(BASE + '/owner/api/setup', { method: 'POST', headers: json, body: JSON.stringify({ password: 'correct horse battery', setupToken: 'test-setup-token' }) })).json();
    const conf = await fetch(BASE + '/owner/api/setup-confirm', { method: 'POST', headers: json, body: JSON.stringify({ code: totp.totpCode(setup.secret), setupToken: 'test-setup-token' }) });
    const cookie = String(conf.headers.get('set-cookie') || '').split(';')[0];
    ok('dashboard session created', conf.ok && cookie.startsWith('tl_owner='));
    const owner = { ...json, cookie };
    const warn = (body) => fetch(BASE + '/owner/api/warn', { method: 'POST', headers: owner, body: JSON.stringify(body) });
    const list = async () => (await (await fetch(BASE + '/owner/api/warnings', { headers: owner })).json()).warnings;

    ok('refuses a warning with no target', (await warn({ message: 'Please behave.' })).status === 400);
    ok('refuses a warning with no message', (await warn({ clientId: 'c_x', message: ' ' })).status === 400);
    ok('warnings API needs a dashboard session',
      (await fetch(BASE + '/owner/api/warn', { method: 'POST', headers: json, body: '{}' })).status === 401);

    const id = 'c_warned' + Date.now().toString(36);

    // 1. Online: delivered to the open tab straight away.
    let a = connect(id);
    socks.push(a);
    await once(a, 'profile');
    const live = once(a, 'owner-warning');
    const r1 = await (await warn({ clientId: id, username: 'Tester', reason: 'Harassment or abuse', message: 'Please be respectful.' })).json();
    const got1 = await live;
    ok('online person receives it immediately', got1.id === r1.warning.id && got1.message === 'Please be respectful.' && got1.reason === 'Harassment or abuse');
    ok('API reports it as delivered live', r1.delivered === true);
    ok('payload carries no internal fields', got1.clientId === undefined && got1.account === undefined);

    // 2. Not acknowledged: it comes back on the next visit.
    a.close();
    await wait(300);
    a = connect(id);
    socks.push(a);
    const again = await once(a, 'owner-warning');
    ok('unacknowledged warning is shown again on the next visit', again.id === r1.warning.id);

    // 3. Only the addressee can acknowledge it.
    const stranger = connect('c_other' + Date.now().toString(36));
    socks.push(stranger);
    await once(stranger, 'profile');
    stranger.emit('owner-warning-ack', { id: r1.warning.id });
    await wait(300);
    ok('someone else cannot acknowledge it', !(await list()).find((w) => w.id === r1.warning.id).acknowledgedAt);

    a.emit('owner-warning-ack', { id: r1.warning.id });
    await wait(300);
    ok('acknowledgement is recorded', !!(await list()).find((w) => w.id === r1.warning.id).acknowledgedAt);

    // 4. Offline: queued, then shown on the next visit.
    a.close();
    await wait(300);
    const r2 = await (await warn({ clientId: id, username: 'Tester', message: 'Second warning: no spam.' })).json();
    ok('offline warning is queued, not delivered', r2.delivered === false && !r2.warning.deliveredAt);
    a = connect(id);
    socks.push(a);
    const seen = await collect(a, 'owner-warning', 3800);
    ok('queued warning appears on the next visit', seen.some((w) => w.id === r2.warning.id));
    ok('the acknowledged one does not come back', !seen.some((w) => w.id === r1.warning.id));
    ok('marked delivered once shown', !!(await list()).find((w) => w.id === r2.warning.id).deliveredAt);

    // 5. Withdrawn before they come back: never shown.
    a.close();
    await wait(300);
    const r3 = await (await warn({ clientId: id, message: 'This one gets withdrawn.' })).json();
    const wd = await fetch(BASE + `/owner/api/warnings/${r3.warning.id}/withdraw`, { method: 'POST', headers: owner });
    ok('withdraw succeeds', wd.ok);
    a = connect(id);
    socks.push(a);
    const after = await collect(a, 'owner-warning', 3800);
    ok('withdrawn warning is never shown', !after.some((w) => w.id === r3.warning.id));

    // 6. History for one person, as the send dialog asks for it.
    const hist = await (await fetch(BASE + `/owner/api/warnings?clientId=${id}`, { headers: owner })).json();
    ok('per-person history lists all three', hist.warnings.length === 3);
    const audit = await (await fetch(BASE + '/owner/api/audit', { headers: owner })).json();
    ok('sending is written to the audit log', audit.audit.some((e) => e.action === 'warn'));
  } catch (err) {
    failed++;
    console.log('FAIL', err.message);
    console.log(logs.join('').slice(-2000));
  }
  console.log(failed ? `${failed} check(s) failed` : 'All warning checks passed');
  done(failed ? 1 : 0);
})();
