// Housekeeping: guests who left long ago are dropped from the heavy sections,
// while accounts, Plus members, recent players and every analytics total stay.
//
//   node scripts/test-store-compact.js
const fs = require('fs');
const os = require('os');
const path = require('path');
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-compact-'));
const store = require('../server/store');

let failed = 0;
const ok = (name, cond, extra) => { if (!cond) failed++; console.log(cond ? 'PASS' : 'FAIL', name, cond ? '' : JSON.stringify(extra)); };
const DAY = 86400000;
const now = Date.now();
const d = store.data;
const dayAgo = (n) => new Date(now - n * DAY).toISOString().slice(0, 10);

d.accounts = { alice: { clientId: 'c_alice' } };
d.premium = { c_plus: { activatedAt: 1 } };

// talk time
d.talkTime = {
  c_old_guest: { seconds: 100, calls: 2, lastAt: now - 30 * DAY, days: {} },
  c_regular_guest: { seconds: 9000, calls: 80, lastAt: now - 30 * DAY, days: {} },
  c_recent_guest: { seconds: 50, calls: 1, lastAt: now - 2 * DAY, days: {} },
  c_alice: { seconds: 50, calls: 1, lastAt: now - 200 * DAY, days: {} },
  c_plus: { seconds: 50, calls: 1, lastAt: now - 200 * DAY, days: {} },
  c_stale_days: { seconds: 1, calls: 40, lastAt: now, days: {} },
};
for (let i = 0; i < 45; i++) d.talkTime.c_stale_days.days[dayAgo(i)] = { s: 1, n: 1 };
store.pruneTalkTime();
ok('old guest with few calls dropped', !d.talkTime.c_old_guest);
ok('regular guest kept', !!d.talkTime.c_regular_guest);
ok('recent guest kept', !!d.talkTime.c_recent_guest);
ok('account kept however old', !!d.talkTime.c_alice);
ok('plus member kept however old', !!d.talkTime.c_plus);
ok('per-day detail capped at 30 days', Object.keys(d.talkTime.c_stale_days.days).length === 30);

// engage
d.engage = {
  c_old: { streak: { last: dayAgo(100), count: 1 } },
  c_new: { streak: { last: dayAgo(3), count: 4 } },
  c_alice: { streak: { last: dayAgo(300), count: 1 } },
  c_nodate: {},
};
store.pruneEngage();
ok('ended guest streak dropped', !d.engage.c_old);
ok('current streak kept', !!d.engage.c_new);
ok('account streak kept', !!d.engage.c_alice);
ok('record with no date kept', !!d.engage.c_nodate);

// games
d.games = { log: [], players: {
  c_g_old: { lastAt: now - 90 * DAY, t: { sent: 1 }, days: {} },
  c_g_keen: { lastAt: now - 90 * DAY, t: { sent: 40 }, days: { [dayAgo(90)]: { s: 1 }, [dayAgo(5)]: { s: 1 } } },
} };
store.pruneGames();
ok('one-off old game guest dropped', !d.games.players.c_g_old);
ok('keen player kept, all-time counters intact', d.games.players.c_g_keen && d.games.players.c_g_keen.t.sent === 40);
ok('keen player old day detail dropped, recent kept', d.games.players.c_g_keen && !d.games.players.c_g_keen.days[dayAgo(90)] && !!d.games.players.c_g_keen.days[dayAgo(5)]);

// analytics
const pages = {}; for (let i = 0; i < 50; i++) pages['/p' + i] = 50 - i;
d.analytics.days = {
  [dayAgo(100)]: { visits: 500, uniques: 300, pages: { ...pages }, searchTerms: { a: 1, b: 'x' }, uniqueSet: { h1: 1 }, hours: { 3: { visits: 2 } } },
  [dayAgo(2)]: { visits: 50, uniques: 30, pages: { ...pages }, uniqueSet: { h1: 1 }, hours: {} },
};
store.compactAnalytics();
const old = d.analytics.days[dayAgo(100)];
const recent = d.analytics.days[dayAgo(2)];
ok('old day keeps its totals and hours', old.visits === 500 && old.uniques === 300 && old.hours[3].visits === 2);
ok('old day keeps only the top of long lists', Object.keys(old.pages).length === 12 && old.pages['/p0'] === 50);
ok('mixed-value list is left alone', Object.keys(old.searchTerms).length === 2);
ok('recent day untouched', Object.keys(recent.pages).length === 50 && recent.uniqueSet.h1 === 1);

// compactStore runs everything and is safe to repeat
const again = store.compactStore();
ok('second run finds nothing more to do', !again.talkTime && !again.engage && !again.games && !again.analyticsDays, again);

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
