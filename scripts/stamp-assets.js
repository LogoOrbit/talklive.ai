#!/usr/bin/env node
'use strict';
/*
 * Keep every ?v= cache-buster equal to a hash of the file it points at.
 *
 *   npm run stamp           rewrite the stamps
 *   npm run check:stamps    exit 1 if any stamp is out of date (runs in `npm test`)
 *
 * The server sends anything requested with ?v= as `immutable` for a year, so
 * the stamp is the only thing that ever makes a browser fetch a changed file.
 * Typed by hand, stamps went wrong in two ways: a file was edited without its
 * stamp being changed (visitors kept the old code for a year), and the same
 * file was linked under different stamps on different pages (downloaded twice,
 * and one of the pages could be left on an old copy).
 *
 * A stamp here is the first 10 hex characters of the file's SHA-256, so it
 * changes exactly when the file does and is the same wherever it is written.
 * A script that names other stamped files changes when they do, so this runs
 * until nothing moves.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const REF = /([A-Za-z0-9_.\/-]+\.(?:css|js|svg|png|jpe?g|webp|avif|ico|woff2?|mp3|m4a|ogg|mp4|webm))\?v=([A-Za-z0-9]+)/g;

function walk(dir, test, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, test, out);
    else if (test.test(e.name)) out.push(p);
  }
  return out;
}

// Everything that writes a stamp: the pages and scripts themselves, and the
// generators that write pages.
const holders = [
  ...walk(PUBLIC, /\.(html|js|css|webmanifest)$/),
  ...walk(path.join(ROOT, 'scripts'), /\.js$/).filter((f) => !/[\\/](test-[^\\/]*|stamp-assets|check-bundle-size)\.js$/.test(f)),
];

// Served from node_modules by a route (server/index.js), not from public/.
const ALIASES = { '/vendor/socket.io.min.js': path.join(ROOT, 'node_modules/socket.io/client-dist/socket.io.min.js') };

// A page names its files relative to itself; a script names them relative to
// whichever page loaded it, and every page that does sits at the site root.
function resolve(holder, ref) {
  if (ALIASES[ref]) return fs.existsSync(ALIASES[ref]) ? ALIASES[ref] : null;
  const inPublicHtml = holder.startsWith(PUBLIC) && holder.endsWith('.html');
  const base = ref.startsWith('/') || !inPublicHtml ? PUBLIC : path.dirname(holder);
  const file = path.normalize(path.join(base, ref));
  return file.startsWith(PUBLIC) && fs.existsSync(file) && fs.statSync(file).isFile() ? file : null;
}

const text = new Map(holders.map((f) => [f, fs.readFileSync(f, 'utf8')]));
const original = new Map(text);
const read = (file) => (text.has(file) ? Buffer.from(text.get(file)) : fs.readFileSync(file));
const stampOf = (file) => crypto.createHash('sha256').update(read(file)).digest('hex').slice(0, 10);

let stale = new Map();
for (let pass = 0; ; pass++) {
  if (pass > 12) {
    console.error('stamp-assets: stamps never settle - two stamped files name each other.');
    process.exit(2);
  }
  const stamps = new Map();
  let moved = false;
  for (const [holder, source] of text) {
    const next = source.replace(REF, (whole, ref, was) => {
      const file = resolve(holder, ref);
      if (!file) return whole;
      if (!stamps.has(file)) stamps.set(file, stampOf(file));
      const now = stamps.get(file);
      if (now === was) return whole;
      stale.set(`${path.relative(ROOT, holder)} -> ${ref}`, true);
      return `${ref}?v=${now}`;
    });
    if (next !== source) { text.set(holder, next); moved = true; }
  }
  if (!moved) break;
}

const changed = [...text].filter(([f, s]) => s !== original.get(f));
if (process.argv.includes('--check')) {
  if (!changed.length) { console.log('ok   every ?v= stamp matches its file'); process.exit(0); }
  const list = [...stale.keys()];
  console.error(`FAIL ${list.length} out-of-date ?v= stamp(s) in ${changed.length} file(s). Run: npm run stamp`);
  for (const line of list.slice(0, 20)) console.error('     ' + line);
  if (list.length > 20) console.error(`     ... and ${list.length - 20} more`);
  process.exit(1);
}
for (const [f, s] of changed) fs.writeFileSync(f, s);
console.log(changed.length ? `Stamped ${changed.length} file(s).` : 'Every stamp already matches.');
