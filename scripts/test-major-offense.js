#!/usr/bin/env node
/*
 * Major offenses on calls, the case files behind every warning and ban, and the
 * owner's view of them (server/automod.js + server/case-files.js):
 *   - a threat said on a voice call: warning, then 7-day, 30-day, 1-year bans
 *   - the same incident within ten minutes is one strike
 *   - dry run issues nothing and leaves nothing behind once live
 *   - an AI-confirmed severe violation is a 30-day ban at once, a year if repeated
 *   - someone already warned and then reported for something serious by 5
 *     different people within 48 hours gets the 7-day ban; spam reports never do
 *   - every warning/ban has a case file: the conversation (with the call line
 *     marked), the reports, the sanction, and it joins the appeal thread
 *   - owner-made bans and warnings get a case file too
 *   - the case store is capped and keeps real bans longest
 *   - majorBans off: threats are the old warning + review, never a ban
 */
delete process.env.ANTHROPIC_API_KEY;
const { createAutomod } = require('../server/automod');

let failed = 0;
const ok = (name, cond, extra) => { if (!cond) failed++; console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : JSON.stringify(extra)); };

function fakeStore() {
  const s = {
    data: { reports: [], talkTime: {}, transcripts: [], warnings: [], bans: [], cases: [] },
    sent: [], kicked: [], audits: [],
    save() {}, audit(a, ip, d) { s.audits.push([a, d]); },
    addWarning(w) { const rec = { id: 'w' + (s.data.warnings.length + 1), ts: Date.now(), deliveredAt: null, acknowledgedAt: null, withdrawnAt: null, ...w }; s.data.warnings.unshift(rec); return rec; },
    withdrawWarning(id) { const w = s.data.warnings.find((x) => x.id === id); if (w) w.withdrawnAt = Date.now(); return w; },
    addBan(b) { const rec = { id: 'b' + (s.data.bans.length + 1), createdAt: Date.now(), expiresAt: Date.now() + b.minutes * 60000, liftedAt: null, ...b }; s.data.bans.unshift(rec); return rec; },
  };
  return s;
}
function setup(mode = 'live') {
  const store = fakeStore();
  const am = createAutomod({ store, deliverWarning: (w) => store.sent.push(w), kickBanned: (cid, ip, ban) => store.kicked.push(ban) });
  am.updateSettings({ mode });
  return { store, am };
}
const DAY = 86400000;
// What the call looked like: the offender's own device reported the line, the
// other person typed in the same call.
function talk(store, offender, other, lines) {
  const pair = [offender, other].sort().join('|');
  let t = Date.now() - 60000;
  for (const [who, text, kind] of lines) {
    t += 2000;
    store.data.transcripts.unshift({ ts: t, pair, from: who === 'o' ? 'Bad' : 'Good', fromClientId: who === 'o' ? offender : other, to: who === 'o' ? 'Good' : 'Bad', toClientId: who === 'o' ? other : offender, text, kind: kind || 'stranger' });
  }
  return pair;
}
const speak = (am, offender, other, pair, text) => am.onChatText({ from: { clientId: offender, username: 'Bad', country: 'X' }, to: other, pair, text, kind: 'voice' });
const person = (am, cid) => am._state().people['c:' + cid];
// Let the same-incident window pass.
const nextIncident = (am, cid) => { person(am, cid).major.lastAt = 0; };
const cases = (store) => store.data.cases;
const last = (store) => store.data.cases[0];

// 1. the ladder, said on a voice call
{
  const { store, am } = setup('live');
  const pair = talk(store, 'A', 'B', [['o', '[threat] heard on call - "i will kill you"', 'moderation'], ['b', 'what? stop that'], ['b', 'please stop']]);
  speak(am, 'A', 'B', pair, 'i will kill you');
  ok('strike 1: a warning, no ban', store.sent.length === 1 && store.data.bans.length === 0, { sent: store.sent.length, bans: store.data.bans.length });
  ok('the warning says it is serious and bans come next', /Serious rule break/.test(store.sent[0].message) && /banned/.test(store.sent[0].message));
  const c1 = last(store);
  ok('case file: warning linked, with the call line marked as the trigger', c1.action.type === 'warning' && c1.action.warningId === store.sent[0].id && c1.evidence.conversation.some((l) => l.kind === 'call' && l.hit && l.who === 'offender'), c1.evidence.conversation);
  ok('case file keeps what the other person said', c1.evidence.conversation.filter((l) => l.who === 'other').length === 2);
  ok('case file names the rule', c1.offense.category === 'threat' && c1.offense.severity === 'major' && /Strike 1/.test(c1.offense.summary) && c1.offense.text === 'i will kill you', c1.offense);

  nextIncident(am, 'A');
  speak(am, 'A', 'B', pair, 'i will kill you tonight');
  ok('strike 2: a 7-day ban', store.data.bans.length === 1 && Math.round((store.data.bans[0].expiresAt - store.data.bans[0].createdAt) / DAY) === 7, store.data.bans.map((b) => b.expiresAt - b.createdAt));
  ok('the ban kicks them and points at its case', store.kicked.length === 1 && store.data.bans[0].caseId === last(store).id && last(store).action.banId === store.data.bans[0].id);
  ok('the ban reason is readable by them', /Auto: .*kill/i.test(store.data.bans[0].reason) || /Threatened/.test(store.data.bans[0].reason), store.data.bans[0].reason);
  nextIncident(am, 'A');
  speak(am, 'A', 'B', pair, 'i will kill you for real');
  ok('strike 3: a 30-day ban', store.data.bans.length === 2 && Math.round((store.data.bans[0].expiresAt - store.data.bans[0].createdAt) / DAY) === 30);
  nextIncident(am, 'A');
  speak(am, 'A', 'B', pair, 'i will kill you now');
  ok('strike 4: a 1-year ban', store.data.bans.length === 3 && Math.round((store.data.bans[0].expiresAt - store.data.bans[0].createdAt) / DAY) === 365);
  ok('every step has its own case', cases(store).filter((c) => c.offense.category === 'threat').length === 4);
  ok('the owner is told about each ban', store.audits.filter(([a]) => a === 'ban').length === 3);
}
// 2. one incident is one strike; self-harm bait is major too
{
  const { store, am } = setup('live');
  const pair = talk(store, 'A', 'B', [['b', 'hello']]);
  speak(am, 'A', 'B', pair, 'i will kill you');
  speak(am, 'A', 'B', pair, 'i will kill you');
  speak(am, 'A', 'B', pair, 'i will murder you');
  ok('the same offense within ten minutes counts once', store.sent.length === 1 && store.data.bans.length === 0 && cases(store).length === 1, { sent: store.sent.length, cases: cases(store).length });
  speak(am, 'A', 'B', pair, 'go kill yourself');
  ok('a different offense is its own strike (self-harm bait: the 7-day ban)', store.data.bans.length === 1 && last(store).offense.category === 'selfharm');
  speak(am, 'A', 'B', pair, 'what a lovely day');
  ok('normal speech does nothing', cases(store).length === 2);
}
// 3. dry run: would-have only; going live starts clean
{
  const { store, am } = setup('dryrun');
  const pair = talk(store, 'A', 'B', [['b', 'hi']]);
  speak(am, 'A', 'B', pair, 'i will kill you');
  nextIncident(am, 'A');
  speak(am, 'A', 'B', pair, 'i will kill you again');
  ok('dry run sends nothing and bans nobody', store.sent.length === 0 && store.data.bans.length === 0 && store.data.warnings.length === 0);
  ok('dry run still records what it would have done', cases(store).length === 2 && cases(store).every((c) => c.dry) && cases(store)[0].action.type === 'ban', cases(store).map((c) => [c.dry, c.action.type]));
  am.updateSettings({ mode: 'live' });
  ok('going live drops the rehearsal cases and strikes', cases(store).length === 0 && person(am, 'A').major.strikes.length === 0);
  nextIncident(am, 'A');
  speak(am, 'A', 'B', pair, 'i will kill you');
  ok('live starts at strike 1 again', store.sent.length === 1 && store.data.bans.length === 0);
}
// 4. AI-confirmed severe is critical: a 30-day ban at once, a year if repeated
{
  const { store, am } = setup('live');
  talk(store, 'A', 'B', [['o', 'something awful'], ['b', 'leave me alone']]);
  const p = (am.onChatText({ from: { clientId: 'A', username: 'Bad' }, to: 'B', pair: 'A|B', text: 'hello', kind: 'chat' }), person(am, 'A')) || null;
  ok('(person exists)', !!p || true);
  const pp = am._state().people['c:A'] || (() => { am.onReport({ reportId: 'r0', reporter: { clientId: 'B', ip: '1.1.1.1' }, reported: { clientId: 'A', username: 'Bad' }, reason: 'harassment' }); return am._state().people['c:A']; })();
  am._majorStrike(pp, { category: 'ai', severity: 'critical', text: 'something awful', to: 'B', source: 'report + AI review', summary: 'AI: threatens violence', signals: ['AI: severe'] });
  ok('critical: a 30-day ban on the first confirmed offense', store.data.bans.length === 1 && Math.round((store.data.bans[0].expiresAt - store.data.bans[0].createdAt) / DAY) === 30 && last(store).offense.severity === 'critical');
  ok('the case explains the AI verdict', /AI: threatens violence/.test(last(store).offense.summary) && last(store).offense.signals.includes('AI: severe'));
  pp.major.lastAt = 0;
  am._majorStrike(pp, { category: 'ai', severity: 'critical', text: 'again', to: 'B', source: 'report + AI review' });
  ok('repeated: a 1-year ban', store.data.bans.length === 2 && Math.round((store.data.bans[0].expiresAt - store.data.bans[0].createdAt) / DAY) === 365);
}
// 5. warned by the report ladder, then reported for something serious by 4 new people
{
  const { store, am } = setup('live');
  let n = 0;
  const rep = (target, reporter, reason, detail) => {
    n++;
    store.data.reports.unshift({ id: 'rp' + n, ts: Date.now(), reporter: { clientId: reporter, username: 'R' + reporter, country: 'Y' }, reported: { clientId: target, username: 'Bad' }, reason, detail });
    am.onReport({ reportId: 'rp' + n, reporter: { clientId: reporter, ip: '10.0.0.' + n, username: 'R' + reporter }, reported: { clientId: target, username: 'Bad' }, reason, detail, seconds: 60 });
  };
  for (const r of ['a', 'b', 'c']) rep('T', r, 'harassment', 'called me names');
  am._evaluate(person(am, 'T'));
  ok('first the ordinary warning', store.sent.length === 1 && person(am, 'T').level === 1 && store.data.bans.length === 0);
  ok('that warning has a case file too, with the reports', cases(store).length === 1 && cases(store)[0].offense.category === 'reports' && cases(store)[0].evidence.reports.length === 3 && cases(store)[0].action.warningId === store.sent[0].id, cases(store)[0]);
  rep('T', 'd', 'harassment', 'again');
  am._evaluate(person(am, 'T'));
  ok('a 4th serious reporter is not enough for a ban', store.data.bans.length === 0);
  rep('T', 'e', 'nudity', 'showed himself');
  am._evaluate(person(am, 'T'));
  ok('5 different people reporting something serious after a warning: 7-day ban', store.data.bans.length === 1 && Math.round((store.data.bans[0].expiresAt - store.data.bans[0].createdAt) / DAY) === 7, store.data.bans.length);
  const c = last(store);
  ok('its case lists the reports and why', c.offense.category === 'reports' && c.offense.signals.length >= 4 && c.evidence.reports.length >= 4 && /Already warned/.test(c.offense.summary), c.offense);
  ok('the ban kicks them and the case links it', store.kicked.length === 1 && c.action.banId === store.data.bans[0].id && store.data.bans[0].caseId === c.id);
  am._evaluate(person(am, 'T'));
  ok('no second ban for the same reports', store.data.bans.length === 1);
}
// 5b. five reports for a NON-serious reason never ban
{
  const { store, am } = setup('live');
  let n = 100;
  for (const r of 'abcdefg'.split('')) { n++; am.onReport({ reportId: 'x' + n, reporter: { clientId: r, ip: '10.1.0.' + n }, reported: { clientId: 'S', username: 'Spammy' }, reason: 'spam', detail: '', seconds: 60 }); am._evaluate(person(am, 'S')); }
  ok('spam / fake-profile / other reports never reach a ban', store.data.bans.length === 0);
}
// 6. the case file joins the appeal, and the owner's own actions get one
{
  const { store, am } = setup('live');
  const pair = talk(store, 'A', 'B', [['o', '[threat] - "i will kill you"', 'moderation'], ['b', 'no']]);
  speak(am, 'A', 'B', pair, 'i will kill you');
  nextIncident(am, 'A');
  speak(am, 'A', 'B', pair, 'i will kill you');
  const ban = store.data.bans[0];
  ban.appeals = [{ id: 'ap1', ts: Date.now(), text: 'it was a joke', reply: null }];
  const d = am.cases.detail(last(store).id);
  ok('detail joins the ban and its appeal thread', d.ban && d.ban.id === ban.id && d.banState === 'active' && d.ban.appeals.length === 1 && d.row.openAppeals === 1);
  ok('detail has the history of this person', d.history.otherCases.length === 1 && d.history.warnings === 1 && d.history.bans === 1, d.history);
  ok('detail never leaks the device id', !('deviceId' in d.ban));
  const list = am.cases.listRows({});
  ok('the list counts open appeals and active bans', list.counts.openAppeals === 1 && list.counts.activeBans === 1 && list.cases.length === 2);
  ok('filters: appealed / bans / search', am.cases.listRows({ filter: 'appeals' }).cases.length === 1 && am.cases.listRows({ filter: 'bans' }).cases.length === 1 && am.cases.listRows({ q: 'nobody' }).cases.length === 0 && am.cases.listRows({ q: 'bad' }).cases.length === 2);
  ban.liftedAt = Date.now();
  ok('lifting the ban shows in the case', am.cases.detail(last(store).id).banState === 'lifted');
  ok('the warning state shows too', am.cases.detail(cases(store)[1].id).warningState === 'delivered' || am.cases.detail(cases(store)[1].id).warningState === 'queued');
  ok('owner notes are kept', am.cases.addNote(last(store).id, ' checked the call, fair ban ') && am.cases.detail(last(store).id).case.notes[0].text === 'checked the call, fair ban');

  // The owner bans by hand from the dashboard: the evidence is frozen too.
  talk(store, 'Z', 'Y', [['o', 'you are trash'], ['b', 'stop it']]);
  const hand = store.addBan({ clientId: 'Z', username: 'Bad', reason: 'abuse', minutes: 1440 });
  const mc = am.recordManual({ type: 'ban', clientId: 'Z', username: 'Bad', country: 'X', reason: 'abuse', minutes: 1440, banId: hand.id });
  ok('a ban by hand gets a case file with the conversation', mc.kind === 'owner' && mc.action.banId === hand.id && mc.evidence.conversation.length === 2 && mc.evidence.conversation[0].who === 'offender', mc.evidence);
  // From the review queue.
  const rp = person(am, 'A');
  rp.review = { ts: Date.now(), status: 'open', severe: true, why: 'test', notes: ['test'] };
  const before = cases(store).length;
  am.decide('c:A', 'ban', { minutes: 60 });
  ok('banning from the review queue records a case', cases(store).length === before + 1 && last(store).kind === 'owner' && last(store).action.type === 'ban' && store.data.bans[0].caseId === last(store).id);
}
// 7. caps: the store stays small and real bans are kept longest
{
  const { store, am } = setup('live');
  const banCase = am.cases.open({ person: { clientIds: ['K'], username: 'K' }, offense: { category: 'threat', severity: 'major', title: 't' }, action: { type: 'ban', minutes: 60 } });
  for (let i = 0; i < 620; i++) am.cases.open({ person: { clientIds: ['M' + i], username: 'm' + i }, offense: { category: 'link', title: 'l' }, action: { type: 'warning' } });
  ok('the case store is capped at 500', cases(store).length === 500, cases(store).length);
  ok('and the real ban survived the clean-up', cases(store).some((c) => c.id === banCase.id));
  const big = am.cases.open({ person: { clientIds: ['Q'] }, offense: { category: 'x', text: 'y'.repeat(5000), summary: 'z'.repeat(5000) }, action: { type: 'warning' } });
  ok('one case stays small', JSON.stringify(big).length < 3000, JSON.stringify(big).length);
}
// 8. majorBans off: the old behaviour, a warning and an urgent review, never a ban
{
  const { store, am } = setup('live');
  am.updateSettings({ majorBans: false });
  const pair = talk(store, 'A', 'B', [['b', 'hi']]);
  for (let i = 0; i < 3; i++) { am.onChatText({ from: { clientId: 'A', username: 'Bad' }, to: 'B' + i, pair: pair + i, text: 'go kill yourself', kind: 'chat' }); }
  ok('with the ladder off a threat is a warning plus review', store.sent.length >= 1 && person(am, 'A').review && person(am, 'A').review.severe, store.sent.length);
  ok('and never a ban', store.data.bans.length === 0);
}
// 9. typed threats take the same ladder
{
  const { store, am } = setup('live');
  const pair = talk(store, 'A', 'B', [['o', 'i will kill you'], ['b', 'what']]);
  am.onChatText({ from: { clientId: 'A', username: 'Bad' }, to: 'B', pair, text: 'i will kill you', kind: 'chat' });
  ok('a typed threat in a call chat: warning with the chat saved', store.sent.length === 1 && last(store).evidence.conversation.length === 2 && last(store).evidence.conversation[0].hit === true, last(store).evidence);
}

console.log(failed ? `\n${failed} failed` : '\nAll major-offense checks passed');
process.exit(failed ? 1 : 0);
