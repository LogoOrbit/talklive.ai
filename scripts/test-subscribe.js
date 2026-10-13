#!/usr/bin/env node
/*
 * "Get email updates" double opt-in:
 *   - bad addresses, cross-site posts and honeypot hits are refused or ignored
 *   - a sign-up stays pending (and out of the CSV) until the emailed link is opened
 *   - the confirmation link confirms once; a bad token is refused
 *   - signing up again with a confirmed address sends no second email
 *   - the subscribers CSV needs a dashboard session and lists confirmed rows only
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const totp = require('../server/totp');

const PORT = 3000 + Math.floor(Math.random() * 2000) + 4000;
const BASE = `http://localhost:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-subscribe-'));

let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : extra);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', OWNER_SETUP_TOKEN: 'test-setup-token', DATABASE_URL: '', SMTP_USER: '', SMTP_PASS: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const logs = [];
  srv.stdout.on('data', (d) => logs.push(String(d)));
  srv.stderr.on('data', (d) => logs.push(String(d)));
  const done = (code) => {
    try { srv.kill('SIGKILL'); } catch (_) { /* gone */ }
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    process.exit(code);
  };
  const linkFor = (email) => {
    const line = logs.join('').split('\n').reverse().find((l) => l.includes(`[subscribe] confirmation link for ${email}:`));
    return line ? line.split(': ').pop().trim() : null;
  };

  try {
    for (let i = 0; i < 40; i++) {
      try { await fetch(BASE + '/healthz'); break; } catch (_) { await wait(250); }
    }
    const json = { 'Content-Type': 'application/json' };
    const post = (body, headers = {}) => fetch(BASE + '/subscribe', { method: 'POST', headers: { ...json, ...headers }, body: JSON.stringify(body) });

    ok('invalid email refused', (await post({ email: 'not-an-email' })).status === 400);
    ok('cross-site post refused', (await post({ email: 'x@example.com' }, { 'sec-fetch-site': 'cross-site' })).status === 403);
    const hp = await post({ email: 'bot@example.com', website: 'http://spam' });
    ok('honeypot answers ok', hp.status === 200);
    await wait(100);
    ok('honeypot sends no link', !linkFor('bot@example.com'));

    ok('sign-up accepted', (await post({ email: 'Fan@Example.com', source: '/about' })).status === 200);
    await wait(100);
    const link = linkFor('fan@example.com');
    ok('confirmation link issued for the lowercased address', !!link, logs.join(''));

    const setup = await (await fetch(BASE + '/owner/api/setup', { method: 'POST', headers: json, body: JSON.stringify({ password: 'correct horse battery', setupToken: 'test-setup-token' }) })).json();
    const conf = await fetch(BASE + '/owner/api/setup-confirm', { method: 'POST', headers: json, body: JSON.stringify({ code: totp.totpCode(setup.secret), setupToken: 'test-setup-token' }) });
    const owner = { cookie: String(conf.headers.get('set-cookie') || '').split(';')[0] };
    const csv = async () => (await fetch(BASE + '/owner/api/export/subscribers.csv', { headers: owner })).text();

    ok('CSV needs a dashboard session', (await fetch(BASE + '/owner/api/export/subscribers.csv')).status === 401);
    ok('pending sign-up is not exported', !(await csv()).includes('fan@example.com'));
    const counts = (await (await fetch(BASE + '/owner/api/data', { headers: owner })).json()).subscribers;
    ok('data API counts one pending', counts && counts.pending === 1 && counts.confirmed === 0, JSON.stringify(counts));

    ok('bad token refused', (await fetch(BASE + '/subscribe/confirm?t=nope')).status === 410);
    const path1 = new URL(link).pathname + new URL(link).search;
    const page = await fetch(BASE + path1);
    ok('confirmation link confirms', page.status === 200 && (await page.text()).includes('fan@example.com'));
    const out = await csv();
    ok('confirmed sign-up is exported with its source', out.includes('fan@example.com') && out.includes('/about'), out);

    const before = logs.join('').split('[subscribe] confirmation link for fan@example.com').length;
    ok('repeat sign-up still answers ok', (await post({ email: 'fan@example.com' })).status === 200);
    await wait(100);
    ok('repeat sign-up sends no second link', logs.join('').split('[subscribe] confirmation link for fan@example.com').length === before);
  } catch (err) {
    failed++;
    console.log('FAIL unexpected error', err && err.stack);
  }
  console.log(failed ? `\n${failed} failed` : '\nall passed');
  done(failed ? 1 : 0);
})();
