// Builds server/tz-country.json: IANA time zone -> ISO country code, from the
// system tzdata (zone.tab, plus the old names browsers still report, such as
// Asia/Calcutta). Used when the IP lookup cannot place someone.
//
//   node scripts/build-tz-country.js
const fs = require('fs');
const path = require('path');

const ZI = '/usr/share/zoneinfo';
const map = {};
for (const line of fs.readFileSync(path.join(ZI, 'zone.tab'), 'utf8').split('\n')) {
  if (!line || line[0] === '#') continue;
  const [cc, , zone] = line.split('\t');
  if (cc && zone) map[zone] = cc;
}
for (const line of fs.readFileSync(path.join(ZI, 'tzdata.zi'), 'utf8').split('\n')) {
  const m = /^L (\S+) (\S+)$/.exec(line);
  if (m && map[m[1]] && !map[m[2]]) map[m[2]] = map[m[1]];
}
const sorted = Object.fromEntries(Object.keys(map).sort().map((k) => [k, map[k]]));
fs.writeFileSync(path.join(__dirname, '..', 'server', 'tz-country.json'), JSON.stringify(sorted) + '\n');
console.log(Object.keys(sorted).length, 'zones');
