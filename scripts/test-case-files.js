#!/usr/bin/env node
/*
 * Case files end to end against a real server: a threat said on a call becomes
 * a warning, then a ban, and the owner sees all of it under /owner:
 *   - the speaker's device reports what it heard ('moderation-alert'); the
 *     person gets the warning live, then the 7-day ban on the second offense
 *   - GET /api/cases lists both, GET /api/cases/:id has the conversation (the
 *     call line marked as the trigger), the sanction and, after the person
 *     appeals, the appeal thread; the owner's reply and lifting the ban show up
 *   - a ban or warning made by hand gets a case file too
 *   - notes can be added; an unknown case is a 404
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { io } = require('socket.io-client');
const totp = require('../server/totp');

const PORT = 6900 + Math.floor(Math.random() * 400);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-cases-'));
let failed = 0;
const ok = (name, cond, extra) => { if (!cond) failed++; console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : JSON.stringify(extra)); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function once(sock, ev, ms = 5000) {
  return new Promise((res, rej) => {
    const timer = setTimeout(() => { sock.off(ev, on); rej(new Error('timeout waiting for ' + ev)); }, ms);
    function on(data) { clearTimeout(timer); sock.off(ev, on); res(data); }
    sock.on(ev, on);
  });
}
const ack = (s, ev, data) => new Promise((res) => s.emit(ev, data, res));
const socks = [];
function connect(clientId, name) {
  const sock = io(BASE, { transports: ['websocket'], forceNew: true });
  socks.push(sock);
  sock.emit('register', { clientId, nickname: name, gender: 'male' });
  return sock;
}

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', OWNER_SETUP_TOKEN: 'test-setup-token', DATABASE_URL: '', ANTHROPIC_API_KEY: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const logs = [];
  srv.stdout.on('data', (d) => logs.push(String(d)));
  srv.stderr.on('data', (d) => logs.push(String(d)));
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
    const call = async (p, body) => { const r = await fetch(BASE + '/owner/api/' + p, body ? { method: 'POST', headers: owner, body: JSON.stringify(body) } : { headers: owner }); return { status: r.status, body: await r.json().catch(() => ({})) }; };
    const api = async (p, body) => (await call(p, body)).body;

    ok('owner is signed in', (await call('cases')).status === 200);
    ok('no cases yet', (await api('cases')).cases.length === 0);
    await api('automod/settings', { mode: 'live' });

    // A call: the speaker's own device reports a threat it heard.
    const bad = connect('cf_bad_0001', 'Badguy');
    const good = connect('cf_good_0001', 'Goodguy');
    await wait(300);
    const matched = Promise.all([once(bad, 'matched'), once(good, 'matched')]);
    bad.emit('find-partner', { mode: 'chat' });
    good.emit('find-partner', { mode: 'chat' });
    await matched;
    good.emit('chat-message', { text: 'hey, what are you doing?' });
    bad.emit('chat-message', { text: 'nothing much' });
    await wait(300);

    const warned = once(bad, 'owner-warning');
    bad.emit('moderation-alert', { type: 'keyword', detail: 'threat', transcript: 'i will kill you' });
    const w = await warned.catch(() => null);
    ok('they get the warning live, saying it is serious', w && /Serious rule break/.test(w.message || w.text || JSON.stringify(w)), w);
    await wait(300);
    let list = await api('cases');
    ok('a case file exists for the warning', list.cases.length === 1 && list.cases[0].action.type === 'warning' && list.cases[0].offense.category === 'threat' && list.cases[0].kind === 'auto', list.cases);
    let d = await api('cases/' + list.cases[0].id);
    ok('it holds the chat from the call, with the offender marked', d.case.evidence.conversation.some((l) => l.who === 'other' && /what are you doing/.test(l.text)) && d.case.evidence.conversation.some((l) => l.who === 'offender'), d.case.evidence.conversation);
    ok('the call line is marked as the trigger', d.case.evidence.conversation.some((l) => l.kind === 'call' && l.hit), d.case.evidence.conversation);
    ok('and links the warning it caused', d.warning && d.warning.id === d.case.action.warningId && d.warningState !== 'withdrawn', d);

    // Second offense: the 7-day ban.
    const banned = once(bad, 'banned');
    bad.emit('moderation-alert', { type: 'model', detail: 'self-harm bait', transcript: 'go kill yourself' });
    const bn = await banned.catch(() => null);
    ok('the second offense is a ban, shown on their screen', bn && bn.until > Date.now() + 6 * 864e5 && bn.until < Date.now() + 8 * 864e5 && /Auto:/.test(bn.reason), bn);
    await wait(300);
    list = await api('cases');
    ok('two cases, newest first, the ban linked', list.cases.length === 2 && list.cases[0].action.type === 'ban' && list.cases[0].banState === 'active', list.cases.map((c) => [c.action.type, c.banState]));
    ok('the list counts the active ban', list.counts.activeBans === 1 && list.counts.auto === 2);
    d = await api('cases/' + list.cases[0].id);
    ok('the ban case shows the sanction and their history', d.ban && d.banState === 'active' && d.history.warnings === 1 && d.history.otherCases.length === 1 && !('deviceId' in d.ban), d.history);
    ok('the ban case holds the second line as the trigger', d.case.evidence.conversation.some((l) => l.kind === 'call' && l.hit && /kill yourself/.test(l.text)), d.case.evidence.conversation);

    // Appeal and answer.
    const appealed = await ack(bad, 'ban-appeal', { text: 'It was a joke, I am sorry about that.' });
    ok('they can appeal', appealed.ok === true, appealed);
    list = await api('cases?filter=appeals');
    ok('the case shows needing a reply', list.cases.length === 1 && list.cases[0].openAppeals === 1 && list.counts.openAppeals === 1, list);
    d = await api('cases/' + list.cases[0].id);
    ok('the appeal text is in the case', d.ban.appeals.length === 1 && /joke/.test(d.ban.appeals[0].text));
    const reply = await api(`bans/${d.ban.id}/appeals/${d.ban.appeals[0].id}/reply`, { message: 'Ok. First and last time.', action: 'lift' });
    ok('the owner answers and lifts it', reply.ok === true && reply.lifted === true, reply);
    d = await api('cases/' + d.case.id);
    ok('the case shows the reply and the lifted ban', d.banState === 'lifted' && d.ban.appeals[0].reply === 'Ok. First and last time.', d.ban);

    // By hand: warn and ban from the dashboard.
    await api('warn', { clientId: 'cf_good_0001', username: 'Goodguy', message: 'Please keep things friendly.', reason: 'rude' });
    await api('ban', { clientId: 'cf_good_0001', username: 'Goodguy', minutes: 60, reason: 'testing' });
    list = await api('cases?filter=owner');
    ok('a warning and a ban made by hand have case files', list.cases.length === 2 && list.cases.some((c) => c.action.type === 'ban' && c.banState === 'active') && list.cases.some((c) => c.action.type === 'warning'), list.cases);
    const manual = await api('cases/' + list.cases.find((c) => c.action.type === 'ban').id);
    ok('with the chat from that call saved', manual.case.evidence.conversation.length >= 2, manual.case.evidence);

    // Notes, search, unknown.
    const note = await api('cases/' + d.case.id + '/note', { text: 'Apology felt real.' });
    ok('notes can be added', note.ok && note.notes.length === 1);
    ok('search finds the user', (await api('cases?q=badguy')).cases.length === 2 && (await api('cases?q=zzz')).cases.length === 0);
    ok('an unknown case is a 404', (await call('cases/does-not-exist')).status === 404);
    ok('the cases survive in the saved store', (await api('cases')).cases.length === 4);
  } catch (err) {
    failed++;
    console.log('FAIL exception', err && err.stack || err);
    console.log(logs.join('').slice(-1500));
  }
  console.log(failed ? `\n${failed} failed` : '\nAll case-file checks passed');
  done(failed ? 1 : 0);
})();
