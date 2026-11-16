// The Plus upgrade-moment policy (public/plus-moments.js), mirrored by
// PlusMoments.kt and its PlusMomentsTest. Keep both test files in step.
//
//   node scripts/test-plus-moments.js
const pm = require('../public/plus-moments.js');
const { eventNames } = require('../server/plus-moments');

let failed = 0;
const ok = (n, c, x) => { if (!c) failed++; console.log(c ? 'PASS' : 'FAIL', n, c || x === undefined ? '' : JSON.stringify(x)); };
const DAY = 864e5; const H = 36e5;
const T0 = Date.UTC(2026, 10, 1, 12);

// A person with enough history: second session, three finished calls.
function veteran(now) {
  let s = pm.touch(pm.fresh(), now - 3 * DAY);
  s = pm.touch(s, now - DAY);
  for (let i = 0; i < 3; i++) s = pm.finishedCall(s, 120);
  return s;
}
const good = { goodCall: true, likedCount: 2, contended: true, waitedSec: 30 };

// Sessions and finished calls
let s = pm.touch(pm.fresh(), T0);
ok('the first visit is session 1', s.sessions === 1);
s = pm.touch(s, T0 + 10 * 60000);
ok('coming back within 30 minutes is the same session', s.sessions === 1);
s = pm.touch(s, T0 + 2 * H);
ok('coming back after a long gap is a new session', s.sessions === 2);
ok('a 5-second call is not a finished call', pm.finishedCall(pm.fresh(), 5).calls === 0);
ok('a 15-second call is a finished call', pm.finishedCall(pm.fresh(), 15).calls === 1);

// Restrictions
ok('a restriction shows even in a first session', pm.decide(pm.touch(pm.fresh(), T0), 'restrict', { key: 'gender' }, T0).ok);
ok('a restriction is not capped by earlier prompts', (() => { let v = veteran(T0); for (let i = 0; i < 5; i++) v = pm.shown(v, 'good', T0 - i * 1000); return pm.decide(v, 'restrict', { key: 'gender' }, T0).ok; })());
ok('the same restriction is not repeated after a dismissal this session', !pm.decide(veteran(T0), 'restrict', { key: 'gender', dismissed: ['restrict:gender'] }, T0).ok);
ok('a different restriction still shows', pm.decide(veteran(T0), 'restrict', { key: 'countries', dismissed: ['restrict:gender'] }, T0).ok);

// Never over a call, never to members
for (const m of ['restrict', 'search', 'good', 'liked', 'pass']) {
  ok(`${m}: never while a call is connecting or connected`, !pm.decide(veteran(T0), m, { ...good, inCall: true, key: 'x' }, T0).ok);
  ok(`${m}: never for a Plus member`, !pm.decide(veteran(T0), m, { ...good, premium: true, key: 'x' }, T0).ok);
}

// Proactive gating
ok('no proactive prompt in the first session', pm.decide(pm.finishedCall(pm.finishedCall(pm.finishedCall(pm.touch(pm.fresh(), T0), 60), 60), 60), 'good', good, T0).why === 'first-session');
{
  let v = pm.touch(pm.touch(pm.fresh(), T0 - 2 * DAY), T0);
  v = pm.finishedCall(pm.finishedCall(v, 60), 60);
  ok('no proactive prompt before the third finished call', pm.decide(v, 'good', good, T0).why === 'few-calls');
  v = pm.finishedCall(v, 60);
  ok('after two sessions and three calls a good moment may show', pm.decide(v, 'good', good, T0).ok);
}
ok('good needs a good call', pm.decide(veteran(T0), 'good', { goodCall: false }, T0).why === 'not-a-good-call');
ok('liked needs someone who liked you', pm.decide(veteran(T0), 'liked', { likedCount: 0 }, T0).why === 'nobody-liked' && pm.decide(veteran(T0), 'liked', { likedCount: 3 }, T0).ok);
ok('search needs a busy queue and a 20 second wait', pm.decide(veteran(T0), 'search', { contended: false, waitedSec: 60 }, T0).why === 'not-waiting-long'
  && pm.decide(veteran(T0), 'search', { contended: true, waitedSec: 10 }, T0).why === 'not-waiting-long'
  && pm.decide(veteran(T0), 'search', { contended: true, waitedSec: 20 }, T0).ok);

// Frequency caps
{
  let v = veteran(T0);
  v = pm.shown(v, 'good', T0);
  ok('one proactive prompt per 24 hours', pm.decide(v, 'liked', good, T0 + 23 * H).why === 'day-cap');
  ok('another is allowed after 24 hours', pm.decide(v, 'liked', good, T0 + 25 * H).ok);
  v = pm.shown(v, 'liked', T0 + 25 * H);
  v = pm.shown(v, 'good', T0 + 50 * H);
  ok('three in a week is the limit', pm.decide(v, 'liked', good, T0 + 75 * H).why === 'week-cap');
  ok('the week window rolls forward', pm.decide(v, 'liked', good, T0 + 8 * DAY).ok);
}

// Same moment not repeated after dismissal this session
ok('a dismissed moment is not repeated in the session', pm.decide(veteran(T0), 'liked', { ...good, dismissed: ['liked'] }, T0).why === 'dismissed-this-session');

// Pass: only after two dismissals of the subscription, then a cooldown
{
  let v = veteran(T0);
  ok('no pass offer before the subscription was dismissed twice', pm.decide(v, 'pass', {}, T0).why === 'subscription-not-dismissed-twice');
  v = pm.dismissed(v, 'good');
  ok('one dismissal is not enough', !pm.decide(v, 'pass', {}, T0).ok);
  v = pm.dismissed(v, 'restrict');
  ok('two dismissals (any subscription prompt) unlock the pass offer', pm.decide(v, 'pass', {}, T0).ok);
  v = pm.shown(v, 'pass', T0);
  ok('showing the pass resets the count and starts a 14 day cooldown', v.subDismiss === 0 && v.lastPassAt === T0);
  v = pm.dismissed(pm.dismissed(v, 'liked'), 'liked');
  ok('the pass is not offered again within 14 days', !pm.decide(v, 'pass', {}, T0 + 3 * DAY + 2 * H).ok);
  ok('dismissing the pass itself does not count against the subscription', pm.dismissed(pm.fresh(), 'pass').subDismiss === 0);
  ok('the pass can return after the cooldown', pm.decide(v, 'pass', {}, T0 + 15 * DAY).ok);
}

// best(): most relevant first
ok('best prefers a good call, then likes, then the pass', pm.best(veteran(T0), () => good, T0) === 'good'
  && pm.best(veteran(T0), () => ({ ...good, goodCall: false }), T0, ['good', 'liked', 'pass']) === 'liked');
ok('best is null when nothing is due', pm.best(veteran(T0), () => ({}), T0) === null);

// Analytics names are all known to the server
const known = new Set(eventNames());
ok('every moment event name is accepted by the server', ['restrict', 'search', 'good', 'liked', 'pass'].every((m) => ['view', 'dismiss', 'tap'].every((a) => known.has(pm.eventName(m, a, false)) && known.has(pm.eventName(m, a, true)))));
ok('state survives a JSON round trip', JSON.stringify(pm.touch(JSON.parse(JSON.stringify(veteran(T0))), T0)) === JSON.stringify(pm.touch(veteran(T0), T0)));

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
