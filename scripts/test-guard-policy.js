#!/usr/bin/env node
/*
 * Site rules (server/guard-policy.js) and how auto-mod and TalkGuard apply them:
 *   - sexual chat and friendly slang are allowed
 *   - money: warning, final warning, then a ban; a burst of lines is one ask;
 *     a copy-pasted money request is banned at once
 *   - links / picture requests: a warning, at most one per 12 hours
 *   - suicide baiting and threats: warning + urgent review; drugs: warning,
 *     review on the second
 *   - the rules run while the report ladder is off, and not in dry run
 *   - TalkGuard answers its queue by the rules and leaves insults/slurs/contacts
 */
const { classify } = require('../server/guard-policy');
const { createAutomod } = require('../server/automod');
const { createTalkGuard } = require('../server/talkguard');

let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : JSON.stringify(extra));
};

function fakeStore() {
  const s = {
    data: { bans: [], warnings: [], talkTime: {}, automod: { settings: { mode: 'off' } } },
    save() {}, persistNow() {}, audit() {},
    addWarning(w) { const r = { id: 'w' + s.data.warnings.length, ...w }; s.data.warnings.push(r); return r; },
    addBan(b) { const r = { id: 'b' + s.data.bans.length, expiresAt: Date.now() + b.minutes * 60000, ...b }; s.data.bans.push(r); return r; },
    withdrawWarning() {},
  };
  return s;
}

// --- classify ---
const expect = {
  'Can u send me ur pic': 'spam', 'send me 500 rs': 'spam', 'check my site cheapdeals.shop': 'spam',
  'selling weed dm': 'spam', 'kys': 'abuse', 'I will kill you': 'abuse',
  'I want to fuck you': 'sexual', 'I am horny': 'sexual',
  'nigga wassup': null, 'bitch please lol': null, 'WhatsApp me': null,
  'Okay baby': 'fine', 'I want to kill myself': 'fine', 'Young brother': 'fine', 'Fuck no': 'skip',
};
for (const [t, want] of Object.entries(expect)) ok(`classify "${t}" -> ${want}`, classify(t) === want, classify(t));

// --- auto-mod ---
const store = fakeStore();
const kicked = [];
const am = createAutomod({ store, deliverWarning() {}, kickBanned: (cid) => kicked.push(cid), talkguard: null });
const from = (id) => ({ clientId: id, username: 'u_' + id, country: 'X' });
const say = (id, to, text) => am.onChatText({ from: from(id), to, pair: [id, to].sort().join('|'), text, kind: 'chat' });
const warnsFor = (id) => store.data.warnings.filter((w) => w.clientId === id);

say('a', 'x', 'I want to fuck you so bad');
say('a', 'x', 'bitch please nigga');
ok('sexual chat and slang: no warning (ladder off)', warnsFor('a').length === 0);

say('m', 'x', 'send me money please');
say('m', 'x', 'just 500 rs'); // same chat, same burst: one ask
ok('money: first ask is a warning, a burst counts once', warnsFor('m').length === 1, warnsFor('m'));
say('m', 'y', 'can you send me money on paypal');
ok('money: second ask is a final warning', warnsFor('m').length === 2 && /Final warning/.test(warnsFor('m')[1].message));
say('m', 'z', 'pay me 10 dollars');
ok('money: third ask is a 7-day ban', store.data.bans.length === 1 && store.data.bans[0].clientId === 'm' && Math.round((store.data.bans[0].expiresAt - Date.now()) / 86400000) === 7);
ok('money: ban kicks the device', kicked.includes('m'));

am.onPattern({ clientId: 'c', username: 'copy', text: 'send me money on easypaisa 03001234567', partners: 6 });
ok('copy-pasted money request: banned at once', store.data.bans.some((b) => b.clientId === 'c'));

say('l', 'x', 'follow me at www.example.com');
say('l', 'y', 'www.example.com again');
ok('link: one warning per 12 hours', warnsFor('l').length === 1);
say('p', 'x', 'send your pic');
ok('picture request: warning', warnsFor('p').length === 1);

say('h', 'x', 'just kys');
const h = am._state().people['c:h'];
ok('suicide baiting: warning + urgent review', warnsFor('h').length === 1 && h.review && h.review.status === 'open' && h.review.severe);
say('d', 'x', 'selling weed dm me');
ok('drugs: first is a warning only', warnsFor('d').length === 1 && !(am._state().people['c:d'].review));
say('d', 'y', 'coke for sale');
ok('drugs: second goes to review', am._state().people['c:d'].review && am._state().people['c:d'].review.status === 'open');

say('s', 'x', 'I want to kill myself');
ok('someone saying they are suicidal is not punished', warnsFor('s').length === 0);

am.onChatText({ from: from('v'), to: 'x', pair: 'v|x', text: 'send me money', kind: 'voice' });
ok('speech transcripts never trigger the rules', warnsFor('v').length === 0);

store.data.automod.settings.mode = 'dryrun';
say('r', 'x', 'send me money');
ok('dry run: nobody is warned', warnsFor('r').length === 0);
store.data.automod.settings.mode = 'off';
am.updateSettings({ policy: false });
say('q', 'x', 'send me money');
ok('rules switched off: nothing happens', warnsFor('q').length === 0);

// --- TalkGuard answers its queue ---
const gs = fakeStore();
gs.data.talkguard = {
  examples: [{ t: 'Okay baby', y: { abuse: 0, sexual: 0, spam: 1 }, ts: 1, by: 'owner' }],
  candidates: ['send your pic', 'I am so horny', 'Okay baby', 'Young brother', 'bitch please', 'WhatsApp me', 'Fuck no', 'kys']
    .map((t, i) => ({ id: 'c' + i, t, ts: Date.now(), scores: {} })),
};
const tg = createTalkGuard({ store: gs });
const res = tg.applyPolicy();
const left = gs.data.talkguard.candidates.map((c) => c.t).sort();
ok('queue: rules answer what they settle', JSON.stringify(left) === JSON.stringify(['WhatsApp me', 'bitch please']), left);
const ex = (t) => gs.data.talkguard.examples.find((e) => e.t === t);
ok('queue: picture request learned as spam', ex('send your pic') && ex('send your pic').y.spam === 1 && ex('send your pic').by === 'policy');
ok('queue: sexual chat learned as sexual, not fine', ex('I am so horny') && ex('I am so horny').y.sexual === 1);
ok('queue: a rule never overrides the owner', ex('Okay baby').by === 'owner' && ex('Okay baby').y.spam === 1);
ok('queue: counts reported', res.answered === 6 && res.left === 2, res);

console.log(failed ? `\n${failed} check(s) failed` : '\nAll guard policy checks passed');
process.exit(failed ? 1 : 0);
