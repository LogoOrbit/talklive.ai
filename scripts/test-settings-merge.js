// Account settings: each value goes whichever way is newer, so an older copy
// from another device can never wipe a newer choice.
//
//   node scripts/test-settings-merge.js
const fs = require('fs');
const os = require('os');
const path = require('path');
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-settings-'));
const store = require('../server/store');

let failed = 0;
const ok = (name, cond, extra) => { if (!cond) failed++; console.log(cond ? 'PASS' : 'FAIL', name, cond ? '' : JSON.stringify(extra)); };

const u = 'merge_user';
store.mergeAccountSettings(u, { theme: 'dark', sounds: true }, { theme: 1000, sounds: 1000 });
let s = store.getAccountSettings(u);
ok('first save kept', s.theme === 'dark' && s.sounds === true, s);

store.mergeAccountSettings(u, { theme: 'light' }, { theme: 500 });
ok('older copy does not overwrite', store.getAccountSettings(u).theme === 'dark', store.getAccountSettings(u));

store.mergeAccountSettings(u, { theme: 'light' }, { theme: 2000 });
ok('newer change wins', store.getAccountSettings(u).theme === 'light', store.getAccountSettings(u));

store.mergeAccountSettings(u, { sounds: false });
ok('untimed value never replaces a saved one', store.getAccountSettings(u).sounds === true, store.getAccountSettings(u));

store.mergeAccountSettings(u, { vibration: false });
s = store.getAccountSettings(u);
ok('untimed value fills a missing setting', s.vibration === false, s);
store.mergeAccountSettings(u, { vibration: true }, { vibration: 5 });
ok('any stamped change beats an untimed fill', store.getAccountSettings(u).vibration === true, store.getAccountSettings(u));

store.mergeAccountSettings(u, { theme: 'x'.repeat(200) }, { theme: 9e12 });
ok('invalid value ignored', store.getAccountSettings(u).theme === 'light', store.getAccountSettings(u));
ok('times stored', store.getAccountSettings(u)._t && store.getAccountSettings(u)._t.theme === 2000, store.getAccountSettings(u));

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
