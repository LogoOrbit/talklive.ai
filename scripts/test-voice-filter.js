#!/usr/bin/env node
'use strict';
// End-to-end check of Voice check and the Men / Women filter, against a real
// server process and real sockets:
//
//   - the consent switch (voice-check-set, register, the old voice-gender event)
//   - when a device's summary is accepted: a live voice call at least 3.5 s old,
//     mic not muted, at most three sends per call, a valid summary
//   - status after real speech summaries (scripts/voice/fixtures.json)
//   - the filter: Women / Men with a premium seeker, "Voice-checked only",
//     mismatch, confirmed-first ranking, both sides' filters
//   - matched.filtered / matched.voice and "Not who I filtered for"
//   - retry limit, appeal and the owner's decision, "I am" change limit
//   - the flag off, and account deletion
//
// Tests tagged [model] need the trained model to be strict enough; they fail
// while the thresholds in server/voice-model.json are too tight for the
// fixtures (see scripts/test-voice-gender.js).
//
//   node scripts/test-voice-filter.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');
const totp = require('../server/totp');
const fixtures = require('./voice/fixtures.json');

const PORT = 4300 + Math.floor(Math.random() * 400);
const PORT_OFF = PORT + 500;
const SERVER = path.join(__dirname, '..', 'server', 'index.js');
const IDENTITY_SECRET = crypto.randomBytes(32).toString('hex');
const tokenFor = (id) => crypto.createHmac('sha256', IDENTITY_SECRET).update(id).digest('hex');
// Premium seekers: the gender filter is a Plus feature.
const PREMIUM = ['s1', 's2', 's3', 's4', 'r1', 'r2', 'r3', 'plusany', 'plusboth', 'offseeker'];
const MS_BEFORE_SUMMARY = 3700; // a call must be 3.5 s old before a summary counts

let failed = 0;
let count = 0;
const ok = (name, cond, extra) => {
  count++;
  if (!cond) failed++;
  console.log(cond ? 'ok  ' : 'FAIL', name, cond || extra === undefined ? '' : '- ' + JSON.stringify(extra));
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const socks = [];
const servers = [];
const dirs = [];

function startServer(port, env) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-voicef-'));
  dirs.push(dataDir);
  const log = { text: '' };
  const proc = spawn(process.execPath, [SERVER], {
    env: {
      ...process.env, PORT: String(port), DATA_DIR: dataDir, NODE_ENV: 'development', DATABASE_URL: '',
      PREMIUM_CLIENT_IDS: PREMIUM.map((n) => 'c_vfk_' + n).join(','), IDENTITY_SECRET, OWNER_SETUP_TOKEN: 'test-setup-token',
      SAVE_DEBOUNCE_MS: '200', ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (d) => { log.text += d; });
  proc.stderr.on('data', (d) => { log.text += d; });
  servers.push(proc);
  return { port, base: `http://127.0.0.1:${port}`, dataDir, log, proc };
}
async function ready(srv) {
  for (let i = 0; i < 80; i++) {
    try { await fetch(srv.base + '/healthz'); return; } catch (_) { await wait(250); }
  }
  throw new Error('server did not start');
}

// A registered socket that remembers every voice-check view and every match.
function person(srv, name, profile = {}) {
  const sock = io(srv.base, { transports: ['websocket'], forceNew: true });
  const clientId = 'c_vfk_' + name;
  sock.clientId = clientId;
  sock.views = [];
  sock.matches = [];
  sock.on('voice-check', (v) => sock.views.push(v));
  sock.on('matched', (m) => sock.matches.push({ ...m, at: Date.now() }));
  socks.push(sock);
  const token = new Promise((res) => sock.once('identity-token', res));
  sock.emit('register', { clientId, identityToken: tokenFor(clientId), username: name, lang: 'en', ...profile });
  sock.ready = token.then(() => wait(120)).then(() => sock);
  return sock;
}
const lastView = (s) => s.views[s.views.length - 1] || null;
// Waits for a view (after `from`) that satisfies the test.
async function viewWhere(sock, test, from = 0, ms = 2500) {
  const end = Date.now() + ms;
  for (;;) {
    const hit = sock.views.slice(from).find(test);
    if (hit) return hit;
    if (Date.now() > end) return null;
    await wait(25);
  }
}
async function matchAfter(sock, from, ms) {
  const end = Date.now() + ms;
  for (;;) {
    if (sock.matches.length > from) return sock.matches[from];
    if (Date.now() > end) return null;
    await wait(25);
  }
}
const ask = (sock, ev, payload) => new Promise((res) => {
  const timer = setTimeout(() => res({ timeout: true }), 3000);
  const cb = (r) => { clearTimeout(timer); res(r); };
  if (payload === undefined) sock.emit(ev, cb); else sock.emit(ev, payload, cb);
});
const summary = (which, i = 0) => JSON.parse(JSON.stringify(fixtures[which][i % fixtures[which].length]));

// Two people into a call: the first waits, the second arrives.
async function pair(a, b, mode = 'talk') {
  const na = a.matches.length;
  const nb = b.matches.length;
  a.emit('find-partner', { mode });
  await wait(150);
  b.emit('find-partner', { mode });
  const [ma, mb] = await Promise.all([matchAfter(a, na, 4000), matchAfter(b, nb, 4000)]);
  return ma && mb ? { a: ma, b: mb, at: Math.max(ma.at, mb.at) } : null;
}
const hangUp = async (...list) => { for (const s of list) s.emit('leave'); await wait(250); };
// Someone arrives; true when they were NOT matched within `ms`.
async function staysApart(seeker, arriver, ms = 1400) {
  const from = seeker.matches.length;
  arriver.emit('find-partner', { mode: 'talk' });
  return (await matchAfter(seeker, from, ms)) === null;
}
async function afterCallAge(callAt, ms = MS_BEFORE_SUMMARY) {
  const left = callAt + ms - Date.now();
  if (left > 0) await wait(left);
}

async function ownerSession(srv) {
  const json = { 'Content-Type': 'application/json' };
  const setup = await (await fetch(srv.base + '/owner/api/setup', { method: 'POST', headers: json, body: JSON.stringify({ password: 'correct horse battery', setupToken: 'test-setup-token' }) })).json();
  const conf = await fetch(srv.base + '/owner/api/setup-confirm', { method: 'POST', headers: json, body: JSON.stringify({ code: totp.totpCode(setup.secret), setupToken: 'test-setup-token' }) });
  return { ...json, cookie: String(conf.headers.get('set-cookie') || '').split(';')[0] };
}

async function mainSuite(srv) {
  // Actors. Buddies are plain people who give each call a second party.
  const w1 = person(srv, 'w1', { gender: 'female' });             // confirmed by real speech
  const wearly = person(srv, 'wearly', { gender: 'female' });     // sends too early, then fine
  const wmuted = person(srv, 'wmuted', { gender: 'female' });     // sends while muted
  const wjunk = person(srv, 'wjunk', { gender: 'female' });       // sends junk
  const wmis = person(srv, 'wmis', { gender: 'female' });         // male voice, declared female
  const wmen = person(srv, 'wmen', { gender: 'male' });           // male voice, declared male
  const wchat = person(srv, 'wchat', { gender: 'female' });       // a text chat is not a voice call
  const wnone = person(srv, 'wnone', { gender: 'female' });       // not in any call
  const legacy = person(srv, 'legacy', { gender: 'female', voiceCheck: true });
  const buddies = ['w1', 'wearly', 'wmuted', 'wjunk', 'wmis', 'wmen', 'wchat'].map((n) => person(srv, 'b_' + n, { gender: 'male' }));
  const [b1, bearly, bmuted, bjunk, bmis, bmen, bchat] = buddies;
  const bmis2 = person(srv, 'b_wmis2', { gender: 'male' }); // the same two cannot be paired again right after parting
  const everyone = [bmis2, w1, wearly, wmuted, wjunk, wmis, wmen, wchat, wnone, legacy, ...buddies];
  await Promise.all(everyone.map((s) => s.ready));

  // --- Consent --------------------------------------------------------------
  const first = w1.views[0];
  ok('register is answered with a voice-check view, on by default', first && first.on === true && first.state === 'pending', first);
  ok('the view carries no estimate, only status and counts', first && !('p' in first) && !('confidence' in first) && !('label' in first));
  ok('register with voiceCheck:true turns it on (apps before 3.10)', legacy.views[0] && legacy.views[0].on === true && legacy.views[0].state === 'pending', legacy.views[0]);

  let n = w1.views.length;
  w1.emit('voice-check-set', { on: true });
  let v = await viewWhere(w1, (x) => x.on === true, n);
  ok('voice-check-set {on:true} turns it on and answers with a view', v && v.state === 'pending' && v.calls === 0, v);
  for (const s of [wearly, wmuted, wjunk, wmis, wmen, wchat, wnone]) s.emit('voice-check-set', { on: true });
  await wait(300);

  // Not a boolean: ignored.
  n = w1.views.length;
  w1.emit('voice-check-set', { on: 'yes' });
  w1.emit('voice-check-set', null);
  await wait(300);
  ok('voice-check-set with anything but a boolean is ignored', w1.views.length === n && lastView(w1).on === true);

  // The old voice-gender event is ignored.
  n = legacy.views.length;
  legacy.emit('voice-gender', { label: 'female', confidence: 0.99 });
  legacy.emit('voice-gender', null);
  await wait(300);
  ok('the old voice-gender event is ignored', legacy.views.length === n);
  legacy.emit('voice-check-set', { on: true });
  v = await viewWhere(legacy, () => true, n);
  ok('...and does not confirm anything', v && v.state === 'pending' && v.calls === 0, v);

  // register with voiceCheck:false must not turn it off.
  n = legacy.views.length;
  legacy.emit('register', { clientId: legacy.clientId, identityToken: tokenFor(legacy.clientId), username: 'legacy', gender: 'female', voiceCheck: false });
  v = await viewWhere(legacy, () => true, n);
  ok('register with voiceCheck:false does NOT turn it off', v && v.on === true, v);

  // Turning off deletes estimates; turning on again starts from nothing.
  // (Done on legacy after a call, below.)

  // --- Calls round 1 ---------------------------------------------------------
  const calls = {};
  for (const [subject, buddy, key] of [[w1, b1, 'w1'], [wearly, bearly, 'wearly'], [wmuted, bmuted, 'wmuted'], [wjunk, bjunk, 'wjunk'], [wmis, bmis, 'wmis'], [wmen, bmen, 'wmen']]) {
    calls[key] = await pair(subject, buddy);
  }
  calls.wchat = await pair(wchat, bchat, 'chat');
  ok('every voice call was set up', ['w1', 'wearly', 'wmuted', 'wjunk', 'wmis', 'wmen', 'wchat'].every((k) => calls[k]));
  ok('matched.voice asks a voice-check person for a summary', calls.w1.a.voice === true, calls.w1.a);
  ok('matched.voice asks the other side too, since it is on by default', calls.w1.b.voice === true, calls.w1.b);
  ok('matched.voice is absent in a text chat', calls.wchat.a.voice === undefined, calls.wchat.a);
  ok('matched.filtered is absent when no gender filter chose the partner', calls.w1.a.filtered === undefined && calls.w1.b.filtered === undefined);

  // Too early: rejected, and told to send again.
  n = wearly.views.length;
  wearly.emit('voice-features', summary('female', 0));
  v = await viewWhere(wearly, () => true, n);
  ok('a summary before the call is 3.5 s old is rejected with more/again', v && v.again === true && v.more === true && v.state === 'pending' && v.calls === 0, v);

  // Muted: rejected, and told to send again.
  wmuted.emit('mic-state', true);
  await wait(100);

  // Junk summaries do not count.
  await afterCallAge(calls.wjunk.at);
  n = wjunk.views.length;
  wjunk.emit('voice-features', { v: 1, n: 5, f: [] });
  v = await viewWhere(wjunk, () => true, n);
  ok('an invalid summary is not counted', v && v.calls === 0 && v.state === 'pending' && !v.more, v);

  await afterCallAge(calls.w1.at);
  n = wmuted.views.length;
  wmuted.emit('voice-features', summary('female', 1));
  v = await viewWhere(wmuted, () => true, n);
  ok('a summary while the mic is muted is rejected with more/again', v && v.again === true && v.state === 'pending' && v.calls === 0, v);
  wmuted.emit('mic-state', false);
  await wait(100);
  n = wmuted.views.length;
  wmuted.emit('voice-features', summary('female', 1));
  v = await viewWhere(wmuted, () => true, n);
  ok('after unmuting, the next summary counts and the status is confirmed', v && v.calls === 1 && v.state === 'confirmed', v);

  // Not in a call; text chat; early-then-fine.
  n = wnone.views.length;
  wnone.emit('voice-features', summary('female', 0));
  wchat.emit('voice-features', summary('female', 0));
  await wait(500);
  ok('a summary outside a call is ignored', wnone.views.length === n && lastView(wnone).calls === 0);
  ok('a summary in a text chat is ignored', lastView(wchat).calls === 0 && lastView(wchat).state === 'pending');

  n = wearly.views.length;
  wearly.emit('voice-features', summary('female', 2));
  v = await viewWhere(wearly, () => true, n);
  ok('the second try (call now old enough) is accepted', v && v.calls === 1 && v.state === 'confirmed', v);

  // W1: replace in the same call; the fourth send is ignored.
  n = w1.views.length;
  w1.emit('voice-features', summary('female', 0));
  v = await viewWhere(w1, () => true, n);
  ok('a valid summary in a live voice call is accepted: confirmed', v && v.state === 'confirmed' && v.calls === 1 && !v.more, v);
  n = w1.views.length;
  w1.emit('voice-features', summary('female', 1));
  v = await viewWhere(w1, () => true, n);
  ok('a second summary in the same call replaces the first (still one call)', v && v.calls === 1, v);
  n = w1.views.length;
  w1.emit('voice-features', summary('female', 2));
  v = await viewWhere(w1, () => true, n);
  ok('a third summary is still answered', v && v.calls === 1, v);
  n = w1.views.length;
  w1.emit('voice-features', summary('female', 3));
  await wait(600);
  ok('a fourth summary in one call gets no answer at all', w1.views.length === n);

  // Real speech, male voice, declared male and declared female.
  n = wmen.views.length;
  wmen.emit('voice-features', summary('male', 0));
  v = await viewWhere(wmen, () => true, n);
  ok('[model] a real male voice declared male is confirmed', v && v.state === 'confirmed', v);
  n = wmis.views.length;
  wmis.emit('voice-features', summary('male', 1));
  v = await viewWhere(wmis, () => true, n);
  ok('one call that disagrees is "unclear", never a mismatch', v && v.state === 'unclear' && v.calls === 1, v);

  // Off deletes the estimates, on starts over.
  n = wearly.views.length;
  wearly.emit('voice-check-set', { on: false });
  v = await viewWhere(wearly, (x) => x.on === false, n);
  ok('turning off removes the estimates', v && v.state === 'off' && v.calls === 0, v);
  wearly.emit('voice-check-set', { on: true });
  v = await viewWhere(wearly, (x) => x.on === true, n);
  ok('...and turning on again starts from pending', v && v.state === 'pending' && v.calls === 0, v);

  // Round 2 for the mismatch candidate.
  await hangUp(wmis, bmis, w1, b1, wmen, bmen, wmuted, bmuted, wjunk, bjunk, wchat, bchat, wearly, bearly);
  const second = await pair(wmis, bmis2);
  ok('a second voice call is set up', !!second);
  await afterCallAge(second.at);
  n = wmis.views.length;
  wmis.emit('voice-features', summary('male', 2));
  v = await viewWhere(wmis, () => true, n);
  ok('[model] two calls that confidently disagree with the chosen gender make a mismatch', v && v.state === 'mismatch' && v.calls === 2, v);
  ok('a mismatch is offered the appeal, nothing else changes', v && v.appeal === 'none');
  await hangUp(wmis, bmis2);

  // --- Retry ----------------------------------------------------------------
  const wretry = person(srv, 'wretry', { gender: 'female' });
  await wretry.ready;
  wretry.emit('voice-check-set', { on: false });
  await wait(200);
  let r = await ask(wretry, 'voice-retry');
  ok('voice-retry is refused while Voice check is off', r.ok === false && r.reason === 'off', r);
  wretry.emit('voice-check-set', { on: true });
  await wait(200);
  const left = [];
  for (let i = 0; i < 3; i++) { r = await ask(wretry, 'voice-retry'); left.push(r.ok); }
  ok('three retries a day are allowed', left.every((x) => x === true), left);
  ok('each retry counts down in the view', lastView(wretry).retriesLeft === 0, lastView(wretry));
  r = await ask(wretry, 'voice-retry');
  ok('the fourth retry in 24 h is refused with the time it frees up', r.ok === false && r.reason === 'limit' && r.retryAt > Date.now(), r);
  ok('...and the retry button is disabled by retriesLeft 0', lastView(wretry).retriesLeft === 0);

  // --- "I am" changes -----------------------------------------------------------
  const wheld = person(srv, 'wheld', { gender: 'female' });
  await wheld.ready;
  const reg = (gender) => wheld.emit('register', { clientId: wheld.clientId, identityToken: tokenFor(wheld.clientId), username: 'wheld', gender });
  for (const g of ['male', 'female']) { n = wheld.views.length; reg(g); await viewWhere(wheld, () => true, n); }
  ok('two changes of "I am" in a day are not held', !wheld.views.some((x) => x.genderHeld));
  n = wheld.views.length;
  reg('male');
  v = await viewWhere(wheld, () => true, n);
  ok('a third change in 24 h keeps the earlier choice for matching (genderHeld)', v && v.genderHeld === true, v);
  n = wheld.views.length;
  reg('female');
  v = await viewWhere(wheld, () => true, n);
  ok('asking for the choice that is in force is not a change', v && !v.genderHeld, v);

  // --- Filters ----------------------------------------------------------------
  // A premium seeker filtering Women (not strict).
  const s1 = person(srv, 's1', { gender: 'male', prefGender: 'female' });
  await s1.ready;
  const man = person(srv, 'man', { gender: 'male' });
  const woman = person(srv, 'woman', { gender: 'female' });
  await Promise.all([man.ready, woman.ready]);

  s1.emit('find-partner', { mode: 'talk' });
  await wait(250);
  ok('Women filter: a man is not matched', await staysApart(s1, man), s1.matches.map((m) => m.partner));
  man.close();
  await wait(300);

  const f1 = s1.matches.length;
  woman.emit('find-partner', { mode: 'talk' });
  const mw = await matchAfter(s1, f1, 3000);
  ok('Women filter: a woman is matched', !!mw);
  ok('matched.filtered is true for the side whose own filter chose the partner', mw && mw.filtered === true, mw);
  ok('matched.filtered is absent for the person who was chosen', woman.matches.length && woman.matches[woman.matches.length - 1].filtered === undefined);

  // Feedback: only the filtering side, only once.
  r = await ask(woman, 'gender-feedback');
  ok('the person who was chosen cannot send gender-feedback', r.ok === false, r);
  await hangUp(s1, woman);

  // Premium member with no gender filter: never "filtered".
  const plusany = person(srv, 'plusany', { gender: 'male' });
  await plusany.ready;
  const w3 = person(srv, 'w3', { gender: 'female' });
  await w3.ready;
  const pa = await pair(plusany, w3);
  ok('no gender filter: matched.filtered is absent', pa && pa.a.filtered === undefined && pa.b.filtered === undefined, pa);
  const rr = await ask(plusany, 'gender-feedback');
  ok('gender-feedback without a filter match is refused', rr.ok === false, rr);
  await hangUp(plusany, w3);

  // Both sides' filters apply.
  const plusboth = person(srv, 'plusboth', { gender: 'female', prefGender: 'female' });
  await plusboth.ready;
  s1.emit('find-partner', { mode: 'talk' });
  await wait(200);
  ok("both sides' filters apply: a woman who wants women does not get a man", await staysApart(s1, plusboth));
  plusboth.close();
  s1.emit('leave');
  await wait(300);

  // Mismatch: not through the filter, but an "Anyone" seeker gets them.
  wmis.emit('find-partner', { mode: 'talk' });
  await wait(250);
  const fromS1 = s1.matches.length;
  s1.emit('find-partner', { mode: 'talk' });
  ok('[model] a mismatch candidate is not matched through the Women filter', (await matchAfter(s1, fromS1, 1400)) === null);
  s1.emit('leave');
  await wait(250);
  const anyone = person(srv, 'anyone', { gender: 'male' });
  await anyone.ready;
  const fromAny = anyone.matches.length;
  anyone.emit('find-partner', { mode: 'talk' });
  ok('[model] a mismatch candidate IS matched by an "Anyone" seeker', !!(await matchAfter(anyone, fromAny, 3000)));
  await hangUp(anyone, wmis);

  // Strict: "Voice-checked only".
  const s2 = person(srv, 's2', { gender: 'male', prefGender: 'female', prefVoiceChecked: true });
  await s2.ready;
  const u1 = person(srv, 'u1', { gender: 'female' });
  await u1.ready;
  s2.emit('find-partner', { mode: 'talk' });
  await wait(250);
  ok('"Voice-checked only" skips a woman who has not been checked', await staysApart(s2, u1));
  u1.close();
  await wait(250);
  const fromS2 = s2.matches.length;
  w1.emit('find-partner', { mode: 'talk' });
  const strictMatch = await matchAfter(s2, fromS2, 3000);
  ok('"Voice-checked only" matches a confirmed woman', !!strictMatch && strictMatch.filtered === true, strictMatch);
  await hangUp(s2, w1);

  // A non-premium person cannot filter even if the client says so.
  const free = person(srv, 'freeseeker', { gender: 'male', prefGender: 'female', prefVoiceChecked: true });
  await free.ready;
  const uu = person(srv, 'uu', { gender: 'male' });
  await uu.ready;
  const fm = await pair(free, uu);
  ok('without Plus the gender filter does nothing (and nothing is marked filtered)', fm && fm.a.filtered === undefined && fm.b.filtered === undefined, fm);
  await hangUp(free, uu);

  // Ranking: a confirmed woman before an unchecked one, though the unchecked one waited longer.
  // Both only match French speakers, so they cannot pair with each other.
  const ranked = (name) => person(srv, name, { gender: 'female', prefLang: 'fr' });
  const unchecked = ranked('rank_u');
  const confirmed = ranked('rank_c');
  await Promise.all([unchecked.ready, confirmed.ready]);
  confirmed.emit('voice-check-set', { on: true });
  await wait(200);
  const rankCall = await pair(confirmed, person(srv, 'rank_b', { gender: 'male', lang: 'fr' }));
  await afterCallAge(rankCall.at);
  confirmed.emit('voice-features', summary('female', 0));
  v = await viewWhere(confirmed, (x) => x.state === 'confirmed');
  ok('ranking setup: the second woman is confirmed', !!v, lastView(confirmed));
  await hangUp(confirmed, socks[socks.length - 1]);
  unchecked.emit('find-partner', { mode: 'talk' });
  await wait(200);
  confirmed.emit('find-partner', { mode: 'talk' });
  unchecked.emit('keep-filters');
  confirmed.emit('keep-filters');
  await wait(300);
  const s3 = person(srv, 's3', { gender: 'male', prefGender: 'female', lang: 'fr' });
  await s3.ready;
  const fromS3 = s3.matches.length;
  s3.emit('find-partner', { mode: 'talk' });
  const pick = await matchAfter(s3, fromS3, 3000);
  const pickedConfirmed = pick && pick.partner && pick.partner.clientId === 'c_vfk_rank_c';
  ok('a confirmed woman is picked over an unchecked one that waited longer', !!pickedConfirmed, pick && pick.partner && pick.partner.clientId);
  await hangUp(s3, confirmed, unchecked);

  // --- "Not who I filtered for" --------------------------------------------------
  const target = person(srv, 'target', { gender: 'female' });
  await target.ready;
  const reporters = ['r1', 'r2', 'r3'].map((nm) => person(srv, nm, { gender: 'male', prefGender: 'female' }));
  await Promise.all(reporters.map((s) => s.ready));
  let disputedSeen = null;
  const feedback = [];
  for (let i = 0; i < 3; i++) {
    const rep = reporters[i];
    const from = rep.matches.length;
    const tFrom = target.views.length;
    target.emit('find-partner', { mode: 'talk' });
    await wait(200);
    rep.emit('find-partner', { mode: 'talk' });
    const m = await matchAfter(rep, from, 3000);
    if (!m) { feedback.push('no match ' + i); continue; }
    if (i === 0) ok('a premium Women-filter seeker is matched with the target woman', m.filtered === true, m);
    const first = await ask(rep, 'gender-feedback');
    const again = await ask(rep, 'gender-feedback');
    feedback.push([first.ok, again.ok]);
    if (i === 0) ok('"Not who I filtered for" is accepted once, then refused', first.ok === true && again.ok === false, { first, again });
    await hangUp(rep, target);
    if (i === 2) disputedSeen = await viewWhere(target, (x) => x.disputed === true, tFrom, 2000);
    await wait(100);
  }
  ok('three different premium reporters were accepted', feedback.length === 3 && feedback.every((f) => Array.isArray(f) && f[0] === true), feedback);
  ok('the third distinct report makes the target see "disputed"', !!disputedSeen, lastView(target));

  // Excluded from the filter, still matched by an Anyone seeker.
  const s4 = person(srv, 's4', { gender: 'male', prefGender: 'female' });
  await s4.ready;
  target.emit('find-partner', { mode: 'talk' });
  await wait(250);
  ok('a woman with 3 disputes from different people is excluded from filter matches', await staysApart(target, s4));
  s4.emit('leave');
  await wait(250);
  const anyone2 = person(srv, 'anyone2', { gender: 'male' });
  await anyone2.ready;
  const fromA2 = anyone2.matches.length;
  anyone2.emit('find-partner', { mode: 'talk' });
  ok('...but an "Anyone" seeker still gets her', !!(await matchAfter(anyone2, fromA2, 3000)));
  await hangUp(anyone2, target);

  // --- Appeals ------------------------------------------------------------------
  const owner = await ownerSession(srv);
  const decide = async (clientId, grant) => (await fetch(srv.base + '/owner/api/voice/appeal', { method: 'POST', headers: owner, body: JSON.stringify({ clientId, grant }) })).json();

  r = await ask(target, 'voice-appeal', { note: 'I am a woman' });
  ok('voice-appeal opens one appeal', r.ok === true, r);
  ok('the view says the appeal is open', lastView(target).appeal === 'open', lastView(target));
  r = await ask(target, 'voice-appeal', { note: 'again' });
  ok('a second appeal while one is open is refused', r.ok === false && r.reason === 'open', r);
  const queue = await (await fetch(srv.base + '/owner/api/voice', { headers: owner })).json();
  ok('the owner dashboard lists the appeal', queue.appeals.some((a) => a.clientId === target.clientId && a.gender === 'female'), queue.appeals);
  ok('the dashboard says "sounds", never a gender, about the voice', queue.appeals.every((a) => a.sounds === null || a.sounds === 'feminine' || a.sounds === 'masculine'));
  const tFromV = target.views.length;
  const granted = await decide(target.clientId, true);
  ok('the owner can grant it', granted.ok === true, granted);
  v = await viewWhere(target, (x) => x.state === 'reviewed', tFromV);
  ok('a granted appeal makes the person "reviewed" and clears the dispute', v && v.state === 'reviewed' && v.disputed === false && v.appeal === 'granted', v);
  ok('deciding twice is refused', (await decide(target.clientId, true)).error !== undefined);

  const s2b = person(srv, 'strict2', { gender: 'male', prefGender: 'female', prefVoiceChecked: true });
  await s2b.ready;
  s2b.emit('find-partner', { mode: 'talk' });
  await wait(250);
  const tf = target.matches.length;
  target.emit('find-partner', { mode: 'talk' });
  ok('a reviewed woman passes "Voice-checked only" and the dispute filter', !!(await matchAfter(target, tf, 3000)));
  await hangUp(s2b, target);

  // A declined appeal can be repeated after a week.
  const wdec = person(srv, 'wdec', { gender: 'male' });
  await wdec.ready;
  r = await ask(wdec, 'voice-appeal', {});
  ok('an appeal needs no call, only a chosen gender', r.ok === true, r);
  const declined = await decide(wdec.clientId, false);
  ok('the owner can decline it', declined.ok === true, declined);
  r = await ask(wdec, 'voice-appeal', {});
  ok('a declined appeal cannot be repeated for 7 days', r.ok === false && r.reason === 'recent' && r.retryAt > Date.now() + 6 * 86400000, r);
  const wnogender = person(srv, 'wnogender', {});
  await wnogender.ready;
  r = await ask(wnogender, 'voice-appeal', {});
  ok('no chosen gender, nothing to appeal', r.ok === false && r.reason === 'no-gender', r);

  // The flag, the dashboard counts.
  const stats = await (await fetch(srv.base + '/owner/api/voice', { headers: owner })).json();
  ok('the dashboard counts people by status', stats.enabled === true && stats.counts.on >= 5 && stats.counts.confirmed >= 1, stats.counts);

  return { owner };
}

// Account deletion: the voice record goes with the account.
async function purgeSuite(srv) {
  const sock = io(srv.base, { transports: ['websocket'], forceNew: true });
  socks.push(sock);
  const once = (ev) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout ' + ev)), 6000); sock.once(ev, (d) => { clearTimeout(t); res(d); }); });
  const ask2 = (ev, payload, resultEv) => { const p = once(resultEv); sock.emit(ev, payload); return p; };
  if (!sock.connected) await once('connect');
  await ask2('register', { clientId: 'c_vfk_guest_' + crypto.randomBytes(4).toString('hex'), nickname: 'vfpurge' }, 'register-result');
  const details = { username: 'vfpurge', password: 'purge-pass-1', nickname: 'vfpurge', email: 'vfpurge@example.com', dob: '1990-01-01' };
  const sent = await ask2('signup-send-code', details, 'signup-code-result');
  if (!sent.ok) return ok('account deletion: signup works', false, sent);
  let code = null;
  for (let i = 0; i < 60 && !code; i++) {
    const m = srv.log.text.match(/verification code for vfpurge@example\.com is (\d{6})/);
    if (m) code = m[1]; else await wait(50);
  }
  const made = await ask2('signup', { ...details, code }, 'signup-result');
  if (!made.ok) return ok('account deletion: signup works', false, made);
  sock.emit('register', { clientId: made.profileClientId, identityToken: made.identityToken, nickname: 'vfpurge', gender: 'female' });
  await once('register-result');
  sock.emit('voice-check-set', { on: false });
  await wait(1200);
  const docFile = path.join(srv.dataDir, 'owner-data.json');
  const has = () => { try { return !!(JSON.parse(fs.readFileSync(docFile, 'utf8')).voice || {})[made.profileClientId]; } catch (_) { return null; } };
  ok('account deletion: the voice record is saved before deletion', has() === true, has());
  const gone = once('delete-account-result');
  sock.emit('delete-account', { currentPassword: 'purge-pass-1' });
  const res = await gone;
  await wait(1200);
  ok('account deletion: succeeds', res.ok === true, res);
  ok('account deletion: the voice record is purged', has() === false, has());
}

// The flag off: the filter uses the chosen gender only and every voice event is ignored.
async function flagOffSuite(srv) {
  const seeker = person(srv, 'offseeker', { gender: 'male', prefGender: 'female', prefVoiceChecked: true, voiceCheck: true });
  const woman = person(srv, 'offwoman', { gender: 'female', voiceCheck: true });
  const man = person(srv, 'offman', { gender: 'male' });
  await Promise.all([seeker.ready, woman.ready, man.ready]);
  ok('flag off: no voice-check view on register', seeker.views.length === 0 && woman.views.length === 0);
  seeker.emit('voice-check-set', { on: true });
  const r = await ask(seeker, 'voice-retry');
  await wait(300);
  ok('flag off: voice-check-set and voice-retry are ignored', seeker.views.length === 0 && r.ok === false, r);
  seeker.emit('find-partner', { mode: 'talk' });
  await wait(250);
  ok('flag off: a man is not matched by the Women filter', await staysApart(seeker, man));
  man.close();
  await wait(250);
  const from = seeker.matches.length;
  woman.emit('find-partner', { mode: 'talk' });
  const m = await matchAfter(seeker, from, 3000);
  ok('flag off: the chosen gender alone is enough, even with "Voice-checked only"', !!m, m);
  ok('flag off: matched carries no filtered/voice flags', m && m.filtered === undefined && m.voice === undefined && woman.matches[0].voice === undefined, m);
  await wait(3700);
  woman.emit('voice-features', summary('female', 0));
  await wait(400);
  const fb = await ask(seeker, 'gender-feedback');
  ok('flag off: voice-features and gender-feedback are ignored', woman.views.length === 0 && fb.ok === false, fb);
}

(async () => {
  const main = startServer(PORT, { FEATURE_FLAGS: '{"voiceCheck":true}' });
  // Account deletion gets its own server: the main one has seen many new visitors from this one address.
  const purge = startServer(PORT + 1000, { FEATURE_FLAGS: '{"voiceCheck":true}' });
  const off = startServer(PORT_OFF, { FEATURE_FLAGS: '{"voiceCheck":false}' });
  const done = (code) => {
    socks.forEach((s) => { try { s.close(); } catch (_) { /* closed */ } });
    servers.forEach((p) => { try { p.kill('SIGKILL'); } catch (_) { /* gone */ } });
    dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true }));
    process.exit(code);
  };
  const t0 = Date.now();
  try {
    await Promise.all([ready(main), ready(off), ready(purge)]);
    if (!process.env.ONLY_PURGE) await mainSuite(main);
    await purgeSuite(purge);
    await flagOffSuite(off);
  } catch (e) {
    failed++;
    console.log('FAIL suite stopped:', e.stack || e.message);
  }
  console.log(failed ? `\n${failed} of ${count} checks failed (${((Date.now() - t0) / 1000).toFixed(0)}s)` : `\nAll ${count} checks passed (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  done(failed ? 1 : 0);
})();
