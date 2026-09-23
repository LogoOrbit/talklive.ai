/*
 * One-off: copy the JSON store from the Fly volume into Postgres.
 *
 * The app reads one of two backends and never both (server/store.js): with
 * DATABASE_URL set, Postgres is the only store and DATA_DIR is ignored
 * entirely. So switching a running site over is not just setting the variable
 * - whatever is already in Postgres becomes the whole world the moment it is
 * set, and an empty row there means every existing account, friendship and
 * chat disappears from the app. This moves the data first.
 *
 *   DATABASE_URL=postgres://... node scripts/migrate-to-postgres.js <file>
 *
 * Refuses to run if that would lose accounts - pass --force only when you have
 * read the numbers it prints and meant it. Counts are printed; contents never
 * are, because the document holds password hashes and private messages.
 */
const fs = require('fs');

const FORCE = process.argv.includes('--force');
const DRY = process.argv.includes('--dry-run');
const file = process.argv.slice(2).find((a) => !a.startsWith('--'));
const DATABASE_URL = process.env.DATABASE_URL || '';

function die(msg) {
  console.error('ERROR: ' + msg);
  process.exit(1);
}

if (!file) die('give the path to owner-data.json as the first argument');
if (!DATABASE_URL) die('DATABASE_URL is not set');

// What the document is made of, counted the same way on both sides so the
// before/after comparison is meaningful.
function census(doc) {
  const keys = (o) => Object.keys(o || {}).length;
  const social = doc.social || {};
  return {
    accounts: keys(doc.accounts),
    authSessions: keys(doc.authSessions),
    peopleWithFriends: keys(social.friends),
    friendChats: keys(social.friendChats),
    chatHistories: keys(social.chatHistory),
    blocks: keys(social.blocks),
    premium: keys(doc.premium),
    pushSubscribers: keys(doc.push),
    secrets: keys(doc.secrets),
    bans: (doc.bans || []).length,
  };
}

const show = (label, c) => {
  console.log(`\n${label}`);
  for (const [k, v] of Object.entries(c)) console.log(`  ${k.padEnd(18)} ${v}`);
};

(async () => {
  let source;
  try {
    source = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    die(`could not read ${file}: ${err.message}`);
  }
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    die('that file is not a store document');
  }
  // A store document always has these. Their absence means the wrong file, and
  // writing the wrong file into Postgres is the failure this script exists to
  // avoid rather than cause.
  for (const k of ['accounts', 'social', 'analytics']) {
    if (!(k in source)) die(`that file has no "${k}" - it is not a TalkLive store document`);
  }

  const from = census(source);
  show(`SOURCE  ${file}`, from);

  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 20000,
    ssl: /localhost|127\.0\.0\.1|sslmode=disable/.test(DATABASE_URL) ? false : { rejectUnauthorized: false },
  });

  try {
    // Same shape server/store.js creates, so the app finds what it expects.
    await pool.query(
      'CREATE TABLE IF NOT EXISTS owner_store (id int PRIMARY KEY, doc jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())'
    );

    const res = await pool.query('SELECT doc, updated_at FROM owner_store WHERE id = 1');
    const existing = res.rows.length ? res.rows[0].doc : null;
    const to = existing ? census(existing) : null;

    if (to) {
      show(`DESTINATION  (last written ${res.rows[0].updated_at.toISOString()})`, to);
    } else {
      console.log('\nDESTINATION  empty - no row yet');
    }

    // The check that matters: never trade real accounts for fewer.
    const losing = to
      ? Object.keys(from).filter((k) => to[k] > from[k])
      : [];
    if (losing.length && !FORCE) {
      console.error('\nREFUSING: the destination already holds more than the source here:');
      for (const k of losing) console.error(`  ${k}: destination ${to[k]} > source ${from[k]}`);
      console.error('\nCopying now would lose that. Check you exported the right file.');
      console.error('Pass --force only if you have read these numbers and meant it.');
      process.exit(2);
    }

    if (DRY) {
      console.log('\nDRY RUN - nothing written.');
      return;
    }

    await pool.query(
      'INSERT INTO owner_store (id, doc, updated_at) VALUES (1, $1, now()) ON CONFLICT (id) DO UPDATE SET doc = $1, updated_at = now()',
      [JSON.stringify(source)]
    );

    // Read it back rather than trusting the write: this is the one moment the
    // data exists in exactly one new place and nobody has checked it landed.
    const after = await pool.query('SELECT doc FROM owner_store WHERE id = 1');
    const verified = census(after.rows[0].doc);
    show('WRITTEN AND READ BACK', verified);

    const mismatch = Object.keys(from).filter((k) => from[k] !== verified[k]);
    if (mismatch.length) die('read-back does not match the source: ' + mismatch.join(', '));

    console.log('\nOK - Postgres now holds the same store. Set DATABASE_URL on the app to switch it over.');
  } finally {
    await pool.end();
  }
})().catch((err) => die(err.message));
