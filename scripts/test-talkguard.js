#!/usr/bin/env node
/*
 * TalkGuard (server/talkguard.js + public/talkguard.js), behaviour patterns
 * (server/patterns.js) and how auto-mod uses them:
 *   - the model separates clear abuse / sexual / spam from ordinary chat
 *   - the served int8 weights score like the trained ones
 *   - a label from the owner changes how it scores
 *   - a confident model hit is half a strike; slurs said on a call count
 *   - copy-pasted spam to 5 strangers is a strike; a copy-pasted greeting is not
 */
delete process.env.ANTHROPIC_API_KEY;
const core = require('../public/talkguard');
const { createTalkGuard } = require('../server/talkguard');
const { createPatterns } = require('../server/patterns');
const { createAutomod } = require('../server/automod');

let failed = 0;
const ok = (name, cond, extra) => { if (!cond) failed++; console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : JSON.stringify(extra)); };

function fakeStore() {
  const s = {
    data: { reports: [], talkTime: {}, transcripts: [], warnings: [] }, sent: [],
    save() {}, audit() {},
    addWarning(w) { const rec = { id: 'w' + (s.data.warnings.length + 1), ...w }; s.data.warnings.push(rec); return rec; },
    withdrawWarning() {}, addBan() { return {}; },
  };
  return s;
}

(async () => {
  const store = fakeStore();
  const tg = createTalkGuard({ store });

  // 1. separates the obvious cases
  const abusive = ['you are a worthless loser', 'kill urself', 'k y s', 'go back to your country you monkey'];
  const sexual = ['send nudes', 'are you horny'];
  const spam = ['join my telegram for crypto signals', 'send me money on cash app'];
  const fine = ['hi where are you from', 'this is fucking awesome', 'i hate mondays', 'how old are you', 'you sound cute', 'that joke killed me'];
  ok('abuse detected', abusive.every((t) => tg.score(t).abuse >= 0.8), abusive.map((t) => tg.score(t).abuse.toFixed(2)));
  ok('sexual detected', sexual.every((t) => tg.score(t).sexual >= 0.8));
  ok('spam detected', spam.every((t) => tg.score(t).spam >= 0.6), spam.map((t) => tg.score(t).spam.toFixed(2)));
  ok('ordinary chat is not flagged', fine.every((t) => { const s = tg.score(t); return s.abuse < 0.6 && s.sexual < 0.6 && s.spam < 0.6; }),
    fine.map((t) => tg.score(t)));

  // 2. browser and server agree (same file, same int8 weights)
  const browserModel = core.decode(JSON.parse(JSON.stringify(tg.modelJson())));
  const t = 'you are such a pathetic idiot';
  ok('served model scores like the server', Math.abs(core.scoreWith(browserModel, t).abuse - tg.score(t).abuse) < 1e-6);
  ok('model download is small', JSON.stringify(tg.modelJson()).length < 90000, JSON.stringify(tg.modelJson()).length);

  // 3. owner labels change it
  const probe = 'shut up';
  const before = tg.score(probe).abuse;
  for (const v of ['shut up', 'shut up haha', 'omg shut up', 'shut up thats so cool']) tg.addExample(v, 'fine', 'owner');
  tg.retrain();
  ok('learns from owner labels', tg.score(probe).abuse < before - 0.2, [before, tg.score(probe).abuse]);
  ok('kind "you are such a" is fine', tg.score('you are such a sweet person').abuse < 0.6, tg.score('you are such a sweet person'));

  // 4. auto-mod: model hit = half strike, voice slur = full strike
  const am = createAutomod({ store, deliverWarning: (w) => store.sent.push(w), kickBanned() {}, talkguard: tg });
  am.updateSettings({ mode: 'live' });
  am.onChatText({ from: { clientId: 'M1', username: 'm1' }, to: 'p1', pair: 'a', text: 'you are a worthless pathetic loser', kind: 'chat' });
  const ev = am._state().people['c:M1'].events[0];
  ok('confident model hit counts half', ev.type === 'model' && ev.weight === 0.5, ev);
  am.onChatText({ from: { clientId: 'M2', username: 'm2' }, to: 'p1', pair: 'b', text: 'i will kill you', kind: 'voice' });
  const ev2 = am._state().people['c:M2'].events[0];
  ok('threat on a call counts fully', ev2.type === 'voice' && ev2.weight === 1, ev2);
  am.onChatText({ from: { clientId: 'M3', username: 'm3' }, to: 'p1', pair: 'c', text: 'haha you are crazy', kind: 'chat' });
  ok('ordinary message adds nothing', !am._state().people['c:M3']);
  ok('flagged messages wait in the teach queue', tg.summary().candidates.some((c) => c.t.includes('worthless')));

  // 5. patterns
  const pt = createPatterns({ talkguard: tg, onSpam: (x) => am.onPattern(x), isFlagged: () => false });
  for (let i = 0; i < 5; i++) pt.onMessage({ from: 'S1', to: 'u' + i, text: 'join my telegram for crypto signals now', username: 's1' });
  for (let i = 0; i < 5; i++) pt.onMessage({ from: 'S2', to: 'u' + i, text: 'hey how are you doing today', username: 's2' });
  const sum = pt.summary();
  ok('copy-paste spam found', sum.copyPaste.some((x) => x.clientId === 'S1' && x.spammy));
  ok('copy-paste greeting shown only', sum.copyPaste.some((x) => x.clientId === 'S2' && !x.spammy));
  ok('spam pattern is a strike', am._state().people['c:S1'] && am._state().people['c:S1'].events[0].type === 'pattern');
  ok('greeting is not a strike', !am._state().people['c:S2']);
  for (let i = 0; i < 20; i++) pt.onPairEnd({ left: 'F1', leftName: 'f1', seconds: i < 18 ? 2 : 60 });
  ok('fast-skipped user listed', pt.summary().fastSkipped.some((x) => x.clientId === 'F1' && x.pct === 90));
  for (let i = 0; i < 9; i++) pt.onConnect({ ip: '9.9.9.9', clientId: 'dev' + i });
  ok('crowded IP listed (masked)', pt.summary().crowdedIps.some((x) => x.devices === 9 && x.ip === '9.9.x.x'));

  console.log(failed ? `${failed} failed` : 'All TalkGuard checks passed');
  process.exit(failed ? 1 : 0);
})();
