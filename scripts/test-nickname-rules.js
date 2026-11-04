// Display-name rules (public/nickname-rules.js): characters, length, and the
// word filter for hateful, sexual and staff-impersonating names.
//
//   node scripts/test-nickname-rules.js
const Nick = require('../public/nickname-rules.js');

let failed = 0;
const ok = (n, c) => { if (!c) failed++; console.log(c ? 'PASS' : 'FAIL', n); };

for (const name of ['Asad', 'Kenji', 'Mohammed Ali', 'Essex Boy', 'Analyst Ana', 'Dickens', 'Sussex', 'Scunthorpe', 'Cocktail', 'Title', 'José', 'Анна', '佐藤']) {
  ok(`allowed: ${name}`, Nick.check(name).ok);
}
for (const name of ['Führer', 'Fuehrer', 'H1tler', 'Nazi', 'nigga', 'f.u.c.k', 'Sexy Girl', 'Porn Star', 'TalkLive Support', 'Admin', 'Moderator', 'onlyfans gal', 'retard']) {
  const r = Nick.check(name);
  ok(`refused: ${name}`, !r.ok && r.error === 'nickNotAllowed');
}
ok('other rules still come first', Nick.check('a').error === 'nickTooShort');

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
