#!/usr/bin/env node
/*
 * Chat Support, end to end against a real server:
 *   - a guest must give a valid email; the honeypot is ignored silently
 *   - the guest's key reads and continues their thread; a wrong key does not
 *   - the owner sees it, the overview counts it as waiting, and replies
 *   - the reply shows in the guest's thread; solving and reopening work
 *   - owner API needs a dashboard session; settings save and show in /config
 *   - the widget script is loaded by pwa.js
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const totp = require('../server/totp');

const PORT = 3000 + Math.floor(Math.random() * 2000) + 4000;
const BASE = `http://localhost:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-support-'));

let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : JSON.stringify(extra));
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', OWNER_SETUP_TOKEN: 'test-setup-token', DATABASE_URL: '', RESEND_API_KEY: '', SMTP_USER: '', SMTP_PASS: '' },
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

  try {
    for (let i = 0; i < 40; i++) {
      try { await fetch(BASE + '/healthz'); break; } catch (_) { await wait(250); }
    }
    const json = { 'Content-Type': 'application/json' };
    const pub = async (p, body) => {
      const r = await fetch(BASE + '/support/api/' + p, { method: 'POST', headers: json, body: JSON.stringify(body || {}) });
      return { status: r.status, body: await r.json().catch(() => ({})) };
    };

    ok('rejects a missing email', (await pub('start', { text: 'Help please' })).status === 400);
    ok('rejects a bad email', (await pub('start', { email: 'nope@', text: 'Help please' })).status === 400);
    ok('rejects an empty message', (await pub('start', { email: 'a@b.co', text: ' ' })).status === 400);
    const hp = await pub('start', { email: 'bot@spam.co', text: 'Buy now', website: 'x' });
    ok('honeypot gets a quiet OK and no conversation', hp.status === 200 && !hp.body.id);

    const start = await pub('start', { email: 'Guest@Example.com', name: 'Sam', text: 'I cannot hear my partner.', page: '/call' });
    ok('guest starts a chat', start.status === 200 && start.body.id && start.body.key, start.body);
    ok('email stored lowercased', start.body.conversation && start.body.conversation.email === 'guest@example.com');
    const { id, key } = start.body;

    ok('wrong key is refused', (await pub('thread', { id, key: 'deadbeef' })).status === 404);
    const sent = await pub('send', { id, key, text: 'It started today.' });
    ok('guest sends a follow-up', sent.status === 200 && sent.body.conversation.messages.length === 2);

    // Owner side
    const setup = await (await fetch(BASE + '/owner/api/setup', { method: 'POST', headers: json, body: JSON.stringify({ password: 'correct horse battery', setupToken: 'test-setup-token' }) })).json();
    const conf = await fetch(BASE + '/owner/api/setup-confirm', { method: 'POST', headers: json, body: JSON.stringify({ code: totp.totpCode(setup.secret), setupToken: 'test-setup-token' }) });
    const cookie = String(conf.headers.get('set-cookie') || '').split(';')[0];
    const owner = { ...json, cookie };
    const oget = async (p) => (await fetch(BASE + '/owner/api/' + p, { headers: owner })).json();
    const opost = (p, body) => fetch(BASE + '/owner/api/' + p, { method: 'POST', headers: owner, body: JSON.stringify(body || {}) });

    ok('owner API needs a session', (await fetch(BASE + '/owner/api/support', { headers: json })).status === 401);
    const list = await oget('support');
    const row = list.conversations.find((c) => c.id === id);
    ok('owner sees the conversation as waiting with 2 unread', row && row.waiting && row.unread === 2 && !row.verified, row);
    ok('owner list hides the key', row && row.keyHashes === undefined);
    const ov = await oget('overview');
    ok('overview counts 1 waiting', ov.counts && ov.counts.supportWaiting === 1, ov.counts);

    const full = await oget('support/' + id);
    ok('opening the thread marks it read', full.conversation && full.conversation.messages.length === 2);
    ok('unread cleared', (await oget('support')).conversations.find((c) => c.id === id).unread === 0);

    ok('empty reply refused', (await opost(`support/${id}/reply`, { message: '  ' })).status === 400);
    const rep = await opost(`support/${id}/reply`, { message: 'Try another browser, please.' });
    ok('owner replies', rep.ok);
    const thread = await pub('thread', { id, key });
    const last = thread.body.conversation.messages.slice(-1)[0];
    ok('reply shows in the guest thread', last && last.from === 'owner' && last.text === 'Try another browser, please.');
    ok('no longer waiting after reply', (await oget('overview')).counts.supportWaiting === 0);

    await opost(`support/${id}/status`, { status: 'closed' });
    ok('owner marks it solved', (await pub('thread', { id, key })).body.conversation.status === 'closed');
    await pub('send', { id, key, text: 'Still broken.' });
    ok('a new user message reopens it', (await pub('thread', { id, key })).body.conversation.status === 'open');

    const saved = await opost('support-settings', { away: true, awayMessage: 'Back at 9am.', quickReplies: ['One', '', 'Two'] });
    const sj = await saved.json();
    ok('settings save and drop blank quick replies', saved.ok && sj.settings.quickReplies.length === 2);
    const cfg = await pub('config', {});
    ok('config shows away + message', cfg.body.online === false && cfg.body.awayMessage === 'Back at 9am.');

    ok('claim with a bad email link is refused', (await pub('claim', { id, key: 'abc' })).status === 404);
    ok('cross-site POST rejected', (await fetch(BASE + '/support/api/config', { method: 'POST', headers: { ...json, 'sec-fetch-site': 'cross-site' }, body: '{}' })).status === 403);

    const pwa = await (await fetch(BASE + '/pwa.js')).text();
    ok('pwa.js loads the support widget', pwa.includes('/support-chat.js?v='));
    ok('widget script is served', (await fetch(BASE + '/support-chat.js')).ok);

    const promo1 = await (await fetch(BASE + '/support/api/promo')).json();
    ok('launch announcement starts itself for ~2 days', promo1.until > Date.now() + 47 * 3600000 && promo1.until <= Date.now() + 48 * 3600000, promo1);
    const promo2 = await (await fetch(BASE + '/support/api/promo')).json();
    ok('announcement window stays fixed', promo2.until === promo1.until);
    ok('owner can stop it', (await opost('support-promo', { hours: 0 })).ok && (await (await fetch(BASE + '/support/api/promo')).json()).until === 0);
    ok('owner can rerun it', (await opost('support-promo', { hours: 48 })).ok && (await (await fetch(BASE + '/support/api/promo')).json()).until > Date.now());
    ok('promo events are accepted', (await fetch(BASE + '/events', { method: 'POST', headers: json, body: JSON.stringify({ event: 'support_promo_view' }) })).status === 204);

    const del = await opost(`support/${id}/delete`);
    ok('owner deletes the conversation', del.ok && (await pub('thread', { id, key })).status === 404);
  } catch (err) {
    failed++;
    console.log('FAIL', err.stack || err);
    console.log(logs.join('').slice(-3000));
  }
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll support checks passed');
  done(failed ? 1 : 0);
})();
