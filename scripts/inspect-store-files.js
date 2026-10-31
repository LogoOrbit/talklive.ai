/*
 * Read-only census of every copy of the store on the data volume: the live
 * file, anything quarantined or kept from a conflict, and the snapshots.
 * Prints counts and dates only - never contents, since the store holds
 * password hashes and private messages.
 *
 * Runs on the Fly machine:  node /app/scripts/inspect-store-files.js
 * (the "Inspect data volume" workflow does exactly that).
 */
const fs = require('fs');
const path = require('path');

const DIR = process.env.DATA_DIR || '/data';

function files(dir) {
  try {
    return fs.readdirSync(dir).map((n) => path.join(dir, n)).filter((p) => fs.statSync(p).isFile());
  } catch (_) { return []; }
}

const n = (o) => Object.keys(o || {}).length;
const iso = (ms) => (ms ? new Date(ms).toISOString().replace('T', ' ').slice(0, 16) : '-');

function kb(v) { try { return Math.round(Buffer.byteLength(JSON.stringify(v) || '') / 1024); } catch (_) { return -1; } }
function sizesOf(doc) {
  const parts = {};
  for (const [k, v] of Object.entries(doc)) {
    if (k === 'social' || k === 'analytics') {
      for (const [k2, v2] of Object.entries(v || {})) parts[`${k}.${k2}`] = kb(v2);
    } else parts[k] = kb(v);
  }
  return Object.fromEntries(Object.entries(parts).filter(([, n]) => n > 0).sort((x, y) => y[1] - x[1]).slice(0, 25));
}

function census(file) {
  const st = fs.statSync(file);
  const row = { file: path.relative(DIR, file), kb: Math.round(st.size / 1024), modified: iso(st.mtimeMs) };
  let raw;
  try { raw = fs.readFileSync(file, 'utf8'); } catch (e) { return { ...row, error: 'unreadable: ' + e.code }; }
  let doc;
  try { doc = JSON.parse(raw); } catch (_) {
    // Not valid JSON - often a truncated write. A rough count of what is in
    // it anyway says whether it is worth salvaging by hand.
    return { ...row, json: 'INVALID', roughAccounts: (raw.match(/"passwordHash"/g) || []).length,
      roughGoogle: (raw.match(/"googleId":"/g) || []).length };
  }
  const a = doc.analytics || {};
  const days = Object.keys(a.days || {}).sort();
  const created = Object.values(doc.accounts || {}).map((x) => x && x.createdAt).filter(Boolean);
  return {
    ...row,
    accounts: n(doc.accounts),
    google: Object.values(doc.accounts || {}).filter((x) => x && x.googleId).length,
    profiles: n(doc.accountsRegistry),
    peopleWithFriends: n((doc.social || {}).friends),
    friendChats: n((doc.social || {}).friendChats),
    ownerLogin: !!doc.admin,
    visits: (a.totals && a.totals.visits) || 0,
    statDays: days.length,
    firstDay: days[0] || '-',
    lastDay: days[days.length - 1] || '-',
    oldestAccount: created.length ? iso(Math.min(...created)) : '-',
    rev: (doc._meta && doc._meta.rev) || 0,
    // Size of each part in KB (sizes only, never contents), largest first:
    // where the document's weight is, for planning to move parts out of it.
    sizes: sizesOf(doc),
  };
}

const all = [...files(DIR), ...files(path.join(DIR, 'backups'))];
console.log(`store files under ${DIR}: ${all.length}`);
for (const f of all) {
  if (!/owner-data/.test(f)) { console.log(JSON.stringify({ file: path.relative(DIR, f), note: 'not a store file' })); continue; }
  console.log(JSON.stringify(census(f)));
}
