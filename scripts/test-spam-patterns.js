#!/usr/bin/env node
/*
 * server/patterns.js behaviour signals (counting, not reading), and how
 * automod receives them:
 *   - the same or a near-identical long message to 8+ people in an hour
 *   - a brand-new identity whose first message in 3+ chats was a link
 *   - friend-request and voice-note spraying
 * Each raises a counter for the dashboard and a pattern event for review; none
 * of it can warn or ban by itself. Ordinary openers and established people are left alone.
 */
delete process.env.ANTHROPIC_API_KEY;
const { createPatterns } = require('../server/patterns');
const { createAutomod } = require('../server/automod');

let failed = 0;
const ok = (name, cond, extra) => { if (!cond) failed++; console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : JSON.stringify(extra)); };

function rig(opts = {}) {
  const spam = [];
  const counts = {};
  const p = createPatterns({
    talkguard: null,
    onSpam: (x) => spam.push(x),
    isFlagged: () => false,
    isLink: opts.isLink || ((t) => /https?:\/\/|\b[a-z0-9-]+\.(?:com|xyz|ly)\b/i.test(t)),
    isNewIdentity: opts.isNewIdentity || (() => true),
    count: (n) => { counts[n] = (counts[n] || 0) + 1; },
  });
  return { p, spam, counts };
}
const WORDS = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel', 'india', 'juliet'];
const send = (p, from, n, text) => { for (let i = 0; i < n; i++) p.onMessage({ from, to: 'to' + i, text: typeof text === 'function' ? text(i) : text, username: from }); };

// Same text
{
  const { p, spam, counts } = rig();
  const long = 'hey there, I am new here and looking for someone to talk to about music and movies';
  send(p, 'a', 7, long);
  ok('7 recipients is not enough', spam.length === 0);
  send(p, 'a', 9, long);
  const sp = spam.filter((x) => x.kind === 'same-text');
  ok('8 different people raises one same-text signal', sp.length === 1 && sp[0].partners >= 8, spam);
  ok('and a dashboard counter', counts.spam_same_text === 1, counts);
}
{
  const { p, spam } = rig();
  send(p, 'b', 20, (i) => `Hey there ${i}, I am NEW here!! and looking for someone to talk to about music and movies :)`);
  ok('changed numbers, case and punctuation still count as one message', spam.some((x) => x.kind === 'same-text'), spam);
}
{
  const { p, spam } = rig();
  send(p, 'c', 20, (i) => `hey there I am new here and looking for someone to talk to about music and ${i % 2 ? 'movies' : 'films'} tonight`);
  ok('a slightly reworded copy is near-identical', spam.some((x) => x.kind === 'same-text'), spam);
}
{
  const { p, spam } = rig();
  send(p, 'd', 30, 'hi how are you');
  send(p, 'd', 30, 'hello, where are you from?');
  ok('short ordinary openers are left alone', spam.length === 0, spam);
  send(p, 'e', 12, (i) => ['tell me about your day', 'what music do you like these days', 'do you have any pets at home', 'what is your favourite food in the world', 'where would you travel if you could go anywhere', 'what did you study at school or university', 'which language do you speak at home with family', 'do you like football or cricket more', 'have you seen any good movies lately my friend', 'what do you do on weekends when you are free', 'are you a morning person or a night owl really', 'what is the best trip you have ever taken so far'][i]);
  ok('twelve different long messages are left alone', spam.length === 0, spam);
}
{
  const { p, spam } = rig();
  send(p, 'f', 10, 'مرحبا أنا جديد هنا وأبحث عن شخص للتحدث معه عن الموسيقى والأفلام والحياة');
  ok('copy-paste in a non-Latin script is counted too', spam.some((x) => x.kind === 'same-text'), spam);
}

// Link first
{
  const { p, spam, counts } = rig();
  for (let i = 0; i < 3; i++) p.onMessage({ from: 'g', to: 'x' + i, text: 'check https://scam-rewards.xyz now' });
  ok('a new identity opening 3 chats with links is flagged', spam.length === 1 && spam[0].kind === 'link-first' && counts.spam_link_first === 1, spam);
}
{
  const { p, spam } = rig({ isNewIdentity: () => false });
  for (let i = 0; i < 5; i++) p.onMessage({ from: 'h', to: 'x' + i, text: 'https://' + WORDS[i] + '.xyz' });
  ok('an established identity is not flagged', spam.length === 0);
}
{
  const { p, spam } = rig();
  for (let i = 0; i < 5; i++) { p.onMessage({ from: 'i', to: 'x' + i, text: 'hey, how is your day going' }); p.onMessage({ from: 'i', to: 'x' + i, text: 'see https://' + WORDS[i] + '.example.com/a' }); }
  ok('a link after a normal first message is not a funnel', spam.length === 0, spam);
}
{
  const { p, spam } = rig({ isLink: () => false });
  for (let i = 0; i < 5; i++) p.onMessage({ from: 'j', to: 'x' + i, text: 'instagram.com/' + WORDS[i] });
  ok('what the link filter allows (social profile links) never counts', spam.length === 0);
}

// Spraying
{
  const { p, spam, counts } = rig();
  for (let i = 0; i < 14; i++) p.onAction({ kind: 'friend-request', from: 'k', to: 't' + i });
  ok('14 requests in an hour is fine', spam.length === 0);
  for (let i = 0; i < 5; i++) p.onAction({ kind: 'friend-request', from: 'k', to: 't0' });
  ok('asking the same person again does not add up', spam.length === 0);
  p.onAction({ kind: 'friend-request', from: 'k', to: 'tnew' });
  p.onAction({ kind: 'friend-request', from: 'k', to: 'tnew2' });
  ok('15 different people in an hour is spraying, reported once', spam.length === 1 && spam[0].kind === 'friend-request' && counts.spam_friend_spray === 1, spam);
  const { p: p2, spam: s2, counts: c2 } = rig();
  for (let i = 0; i < 12; i++) p2.onAction({ kind: 'voice-note', from: 'v', to: 'r' + i });
  ok('voice notes to 12 different people', s2.length === 1 && s2[0].kind === 'voice-note' && c2.spam_voice_spray === 1, s2);
  p2.onAction({ kind: 'bogus', from: 'v', to: 'r' });
  p2.onAction({});
  p2.onAction(undefined === 1 ? 0 : { kind: 'voice-note' });
  ok('malformed actions are ignored', s2.length === 1);
  ok('the dashboard summary lists the spraying', p.summary().copyPaste.some((x) => x.kind === 'friend-request'));
}

// Automod receives them as review signals, not warnings or bans
{
  const store = {
    data: { reports: [], talkTime: {}, transcripts: [], warnings: [], bans: [] }, sent: [], bans: [],
    save() {}, audit() {},
    addWarning(w) { const rec = { id: 'w' + (store.data.warnings.length + 1), ...w }; store.data.warnings.push(rec); return rec; },
    addBan(b) { store.bans.push(b); return { ...b, expiresAt: Date.now() + 60000 }; },
  };
  const am = createAutomod({ store, deliverWarning: (w) => store.sent.push(w), kickBanned: () => {} });
  am.updateSettings({ mode: 'live' });
  am.onPattern({ clientId: 'z1', username: 'z', text: 'long text', partners: 9, kind: 'same-text' });
  am.onPattern({ clientId: 'z1', username: 'z', text: 'long text', partners: 12, kind: 'same-text' });
  am.onPattern({ clientId: 'z1', username: 'z', text: '', partners: 16, kind: 'friend-request' });
  const person = am._state().people['c:z1'];
  const evs = person.events.filter((e) => e.type === 'pattern');
  ok('one pattern event per kind per day', evs.length === 2, evs.map((e) => e.source));
  ok('each carries half a report\'s weight and a reason', evs.every((e) => e.weight === 0.5 && e.why.length), evs);
  am._evaluate(person);
  ok('they never warn or ban on their own', store.sent.length === 0 && store.bans.length === 0 && store.data.warnings.length === 0);
}

console.log(failed ? `${failed} failed` : 'All spam-pattern checks passed');
process.exit(failed ? 1 : 0);
