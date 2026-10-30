#!/usr/bin/env node
/*
 * server/automod.js: warnings only for genuine-looking reports, never a ban.
 *   - dry run logs but sends nothing; live sends warnings
 *   - each reporter counts once; reporters on one network count once
 *   - a reporter filing many reports counts for little
 *   - a busy user with a normal report rate is left alone
 *   - final warning needs new reports; the top of the ladder is review, not a ban
 *   - slurs in chat count; owner "clear" lowers reporter trust
 */
delete process.env.ANTHROPIC_API_KEY;
const { createAutomod } = require('../server/automod');

let failed = 0;
const ok = (name, cond, extra) => { if (!cond) failed++; console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : JSON.stringify(extra)); };

function fakeStore() {
  const s = {
    data: { reports: [], talkTime: {}, transcripts: [], warnings: [], bans: [] },
    sent: [], bans: [],
    save() {}, audit() {},
    addWarning(w) { const rec = { id: 'w' + (s.data.warnings.length + 1), ...w }; s.data.warnings.push(rec); return rec; },
    withdrawWarning(id) { const w = s.data.warnings.find((x) => x.id === id); if (w) w.withdrawnAt = Date.now(); return w; },
    addBan(b) { s.bans.push(b); return { ...b, expiresAt: Date.now() + 60000 }; },
  };
  return s;
}
function setup(mode) {
  const store = fakeStore();
  const am = createAutomod({ store, deliverWarning: (w) => store.sent.push(w), kickBanned: () => {} });
  am.updateSettings({ mode });
  return { store, am };
}
let n = 0;
function report(am, target, reporterId, ip) {
  am.onReport({ reportId: 'r' + (++n), reporter: { clientId: reporterId, ip: ip || '10.0.0.' + n }, reported: { clientId: target, username: target }, reason: 'harassment', detail: '', seconds: 60 });
}
const person = (am, cid) => am._state().people['c:' + cid];
const evalNow = (am, cid) => am._evaluate(person(am, cid));
const actions = (am) => am._state().log.map((l) => l.action);

// 1. dry run: would warn, sends nothing
{
  const { store, am } = setup('dryrun');
  for (const r of ['a', 'b', 'c']) report(am, 'T1', r);
  evalNow(am, 'T1');
  ok('dry run logs a would-be warning', actions(am).includes('warn1') && am._state().log[0].dry === true, actions(am));
  ok('dry run sends nothing', store.sent.length === 0 && store.data.warnings.length === 0);
}
// 2. live: three different reporters -> one warning delivered
{
  const { store, am } = setup('live');
  for (const r of ['a', 'b', 'c']) report(am, 'T2', r);
  evalNow(am, 'T2');
  ok('live sends the first warning', store.sent.length === 1 && person(am, 'T2').level === 1);
  evalNow(am, 'T2');
  ok('no duplicate warning without new reports', store.sent.length === 1);
}
// 3. one reporter many times, or many reporters on one IP -> no warning
{
  const { store, am } = setup('live');
  report(am, 'T3', 'a'); report(am, 'T3', 'a'); report(am, 'T3', 'a');
  report(am, 'T4', 'x', '1.1.1.1'); report(am, 'T4', 'y', '1.1.1.1'); report(am, 'T4', 'z', '1.1.1.1');
  evalNow(am, 'T3'); evalNow(am, 'T4');
  ok('same reporter counts once', person(am, 'T3').level === 0);
  ok('same-network reporters count once', person(am, 'T4').level === 0, person(am, 'T4').events.map((e) => e.weight));
  ok('nothing sent', store.sent.length === 0);
}
// 4. serial reporter counts for little
{
  const { am } = setup('live');
  for (let i = 0; i < 6; i++) report(am, 'V' + i, 'spammer');
  report(am, 'T5', 'spammer'); report(am, 'T5', 'b');
  const w = person(am, 'T5').events.find((e) => e.source === 'spammer').weight;
  ok('serial reporter weight is low', w <= 0.2, w);
}
// 5. busy user with a normal report rate is left alone
{
  const { store, am } = setup('live');
  const today = new Date().toISOString().slice(0, 10);
  store.data.talkTime.T6 = { days: { [today]: { s: 9999, n: 300 } } };
  for (const r of ['a', 'b', 'c', 'd']) report(am, 'T6', r);
  evalNow(am, 'T6');
  ok('busy user not warned for 4 reports in 300 chats', person(am, 'T6').level === 0 && actions(am).includes('skip'));
}
// 6. ladder tops out at review, never a ban
{
  const { store, am } = setup('live');
  const reps = 'abcdefghijklmnop'.split('');
  for (const r of reps.slice(0, 3)) report(am, 'T7', r);
  evalNow(am, 'T7');
  for (const r of reps.slice(3, 7)) report(am, 'T7', r);
  evalNow(am, 'T7');
  ok('final warning after new reports', person(am, 'T7').level === 2 && store.sent.length === 2);
  for (const r of reps.slice(7, 12)) report(am, 'T7', r);
  evalNow(am, 'T7');
  ok('then owner review', person(am, 'T7').review && person(am, 'T7').review.status === 'open');
  ok('no automatic ban', store.bans.length === 0);
  ok('owner can ban from review', am.decide('c:T7', 'ban', { minutes: 1440 }).ok && store.bans.length === 1);
}
// 7. threats typed in chat count once per partner per day
{
  const { am } = setup('live');
  for (const to of ['p1', 'p1', 'p2', 'p3']) am.onChatText({ from: { clientId: 'T8', username: 'T8' }, to, pair: 'x', text: 'kys loser' });
  am.onChatText({ from: { clientId: 'T9', username: 'T9' }, to: 'p1', pair: 'y', text: 'what the hell man' });
  evalNow(am, 'T8');
  // "kys" is suicide baiting under the site rules: a warning and urgent review.
  ok('suicide baiting to 3 partners -> urgent review', person(am, 'T8').level >= 1 && person(am, 'T8').review && person(am, 'T8').review.severe, person(am, 'T8').events.length);
  ok('ordinary swearing ignored', !person(am, 'T9'));
}
// 8. owner clear: reporters trusted less afterwards
{
  const { store, am } = setup('live');
  for (const t of ['A1', 'A2', 'A3']) for (const r of ['g1', 'g2', 'g3']) report(am, t, r);
  for (const t of ['A1', 'A2', 'A3']) { evalNow(am, t); am.decide('c:' + t, 'clear', {}); }
  report(am, 'A4', 'g1');
  const w = person(am, 'A4').events[0].weight;
  ok('cleared reporters count for less', w < 0.5, w);
  ok('clear withdraws the warning', store.data.warnings.every((x) => x.withdrawnAt));
}
// 9. retaliation report
{
  const { am } = setup('live');
  report(am, 'R2', 'R1');
  report(am, 'R1', 'R2');
  const w = person(am, 'R1').events[0].weight;
  ok('report straight back counts for little', w <= 0.3, w);
}

// 10. free chat check (no AI key)
{
  const { am, store } = setup('live');
  const pair = (a, b) => [a, b].sort().join('|');
  const now = Date.now();
  store.data.transcripts = [
    { ts: now, kind: 'stranger', pair: pair('C1', 'q'), fromClientId: 'C1', text: 'send nudes now' },
    ...Array.from({ length: 7 }, (_, i) => ({ ts: now - i - 1, kind: 'stranger', pair: pair('C2', 'q'), fromClientId: 'C2', text: 'hey where are you from ' + i })),
  ];
  report(am, 'C1', 'q');
  report(am, 'C2', 'q');
  ok('flagged chat backs the report', person(am, 'C1').events[0].weight > 1, person(am, 'C1').events[0]);
  ok('clean chat weakens the report', person(am, 'C2').events[0].weight <= 0.5, person(am, 'C2').events[0].weight);
}

console.log(failed ? `${failed} failed` : 'All automod checks passed');
process.exit(failed ? 1 : 0);
