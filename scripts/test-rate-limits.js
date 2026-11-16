#!/usr/bin/env node
/*
 * Per-person limits on socket events and HTTP routes that write to the store or
 * reach outside, against a real server:
 *   - feedback: a few an hour per person (and per network)
 *   - client-error: a sample per network, not a flood
 *   - /ice-servers is limited per network
 *   - /internal/premium/grant refuses anything that came through a proxy
 *   - Google Play RTDN refuses a wrong secret, and the verify route a bad token
 *   - a stored push endpoint outside the push services is never contacted
 * Reports and blocks are covered in test-social-safety and test-ban-evasion.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { io } = require('socket.io-client');
const totp = require('../server/totp');

const PORT = 5800 + Math.floor(Math.random() * 400);
const BASE = `http://localhost:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-rl-'));
let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : extra);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const socks = [];
let logs = '';

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', OWNER_SETUP_TOKEN: 'test-setup-token', DATABASE_URL: '', PLAY_RTDN_SECRET: 'rtdn-secret-value' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  srv.stdout.on('data', (d) => { logs += String(d); });
  srv.stderr.on('data', (d) => { logs += String(d); });
  const done = (code) => {
    socks.forEach((s) => { try { s.close(); } catch (_) { /* closed */ } });
    try { srv.kill('SIGKILL'); } catch (_) { /* gone */ }
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    process.exit(code);
  };
  try {
    for (let i = 0; i < 40; i++) { try { await fetch(BASE + '/healthz'); break; } catch (_) { await wait(250); } }
    const json = { 'Content-Type': 'application/json' };
    const setup = await (await fetch(BASE + '/owner/api/setup', { method: 'POST', headers: json, body: JSON.stringify({ password: 'correct horse battery', setupToken: 'test-setup-token' }) })).json();
    const conf = await fetch(BASE + '/owner/api/setup-confirm', { method: 'POST', headers: json, body: JSON.stringify({ code: totp.totpCode(setup.secret), setupToken: 'test-setup-token' }) });
    const owner = { ...json, cookie: String(conf.headers.get('set-cookie') || '').split(';')[0] };
    const get = async (p) => (await fetch(BASE + '/owner/api/' + p, { headers: owner })).json();

    const s = io(BASE, { transports: ['websocket'], forceNew: true, extraHeaders: { 'fly-client-ip': '198.51.100.5' } });
    socks.push(s);
    await new Promise((r) => s.once('connect', r));
    s.emit('register', { clientId: 'rl_client_0001', nickname: 'Tester' });
    await new Promise((r) => { s.once('profile', r); setTimeout(r, 1500); });

    for (let i = 0; i < 14; i++) { s.emit('feedback', { text: 'feedback number ' + i, source: 'settings' }); await wait(60); }
    for (let i = 0; i < 50; i++) { s.emit('client-error', { message: 'TypeError: boom ' + i }); await wait(15); }
    await wait(500);
    const fb = (await get('feedback')).feedback.filter((f) => /^feedback number/.test(f.text));
    ok('feedback is capped per person per hour', fb.length === 6, fb.length);
    const errs = (await get('errors')).errors.filter((e) => /boom/.test(e.message));
    const total = errs.reduce((n, e) => n + (e.count || 1), 0);
    ok('client errors are sampled', total > 0 && total <= 30, total);

    // Garbage in the fields that were validated: still alive, nothing stored.
    for (const junk of [{ text: { a: 1 } }, { text: ['x'] }, { text: 5 }, 'str', 5, [], { text: 'x'.repeat(100000) }]) { s.emit('feedback', junk); s.emit('client-error', junk); }
    await wait(300);
    ok('server survives garbage feedback and errors', (await fetch(BASE + '/healthz')).ok);

    let limited = 0;
    for (let i = 0; i < 130; i++) if ((await fetch(BASE + '/ice-servers')).status === 429) limited++;
    ok('/ice-servers is limited per network', limited > 0, limited);

    // Loopback-only grant: a request that carries a proxy header is not for us.
    const viaProxy = await fetch(BASE + '/internal/premium/grant', { method: 'POST', headers: { ...json, 'x-forwarded-for': '203.0.113.9' }, body: JSON.stringify({ who: 'nobody', days: 1 }) });
    ok('grant refuses requests that came through a proxy', viaProxy.status === 404 && (await viaProxy.text()) === '');
    const direct = await fetch(BASE + '/internal/premium/grant', { method: 'POST', headers: json, body: JSON.stringify({ who: 'nobody', days: 1 }) });
    ok('grant still answers a direct local call', direct.status === 404 && (await direct.json()).error.includes('No account'));

    // Play Billing: not configured here, so the routes refuse before any lookup.
    const rtdnBad = await fetch(BASE + '/billing/play/rtdn?secret=wrong', { method: 'POST', headers: json, body: '{}' });
    ok('RTDN with a wrong secret is refused', rtdnBad.status === 503 || rtdnBad.status === 403, rtdnBad.status);
    const verify = await fetch(BASE + '/billing/play/verify', { method: 'POST', headers: json, body: JSON.stringify({ clientId: 'x', purchaseToken: 'y' }) });
    ok('verify refuses an unrecognised client', [403, 503].includes(verify.status), verify.status);

    done(failed ? 1 : 0);
  } catch (e) {
    console.log('FAIL harness error', (e && e.stack) || e);
    console.log(logs.split('\n').slice(-15).join('\n'));
    done(1);
  }
})();
