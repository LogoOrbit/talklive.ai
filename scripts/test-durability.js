/*
 * The store is one document, and that document is every account, every
 * friendship, every friend chat and every login session. These checks are
 * about the ways that document can be destroyed by accident rather than by
 * intent - a bad read, a corrupt file, a database that is briefly unreachable.
 *
 * Each case runs the real store in a child process against a temp DATA_DIR,
 * because the behaviour being tested happens at module load and latches for
 * the life of the process.
 *
 *   node scripts/test-durability.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const STORE = path.join(__dirname, '..', 'server', 'store.js');
let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond ? '' : (extra === undefined ? '' : JSON.stringify(extra)));
};

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tl-durability-'));
}

// Run a snippet with `store` already required and awaited. Returns stdout.
function inStore(dir, body, env = {}) {
  const src = `
    const store = require(${JSON.stringify(STORE)});
    (async () => {
      await store.ready;
      ${body}
      // An idle database pool keeps a process alive for its idle timeout;
      // the snippet is done, so leave now rather than wait it out.
      process.exit(0);
    })().catch((e) => { console.error('THREW', e.message); process.exit(3); });
  `;
  return execFileSync(process.execPath, ['-e', src], {
    env: { ...process.env, DATA_DIR: dir, ...env },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const DATA = (dir) => path.join(dir, 'owner-data.json');

// An account document that stands in for "everything a real user has".
function seed(dir) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA(dir), JSON.stringify({
    accounts: { ada: { passwordHash: 'x', salt: 'y', nickname: 'Ada', createdAt: 1 } },
    social: {
      friends: { 'client-a': { 'client-b': { username: 'Bob' } } },
      friendChats: { 'client-a|client-b': [{ from: 'client-a', text: 'hello', ts: 1 }] },
      blocks: {}, chatHistory: {},
    },
  }));
}

function accountsOf(file) {
  return Object.keys(JSON.parse(fs.readFileSync(file, 'utf8')).accounts || {});
}

// --- 1. A corrupt file is never overwritten by an empty one -----------------
{
  const dir = tmpDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA(dir), '{"accounts":{"ada":'); // truncated mid-write

  // Write something, then exit the way the server does. The old code would
  // have saved an empty document straight over the top.
  inStore(dir, `store.recordConnection(); store.persistNow();`);

  const quarantined = fs.readdirSync(dir).filter((n) => n.includes('.corrupt-'));
  ok('a corrupt file is quarantined, not deleted', quarantined.length === 1, fs.readdirSync(dir));
  ok('the quarantined copy still holds the original bytes',
    quarantined.length === 1 && fs.readFileSync(path.join(dir, quarantined[0]), 'utf8') === '{"accounts":{"ada":');
  // The one that matters: the old store wrote an empty document straight over
  // the damaged file, so the bytes that might have been salvaged were gone.
  ok('no empty document is written in its place', !fs.existsSync(DATA(dir)), fs.readdirSync(dir));
}

// --- 2. A corrupt file is recovered from the newest good backup -------------
{
  const dir = tmpDir();
  seed(dir);
  // A real snapshot, taken the way the store takes them.
  inStore(dir, `store.persistNow();`);
  const backups = path.join(dir, 'backups');
  ok('a snapshot is taken alongside the live file',
    fs.existsSync(backups) && fs.readdirSync(backups).length === 1, fs.existsSync(backups) ? fs.readdirSync(backups) : 'no backups dir');

  // Now destroy the live file and boot again.
  fs.writeFileSync(DATA(dir), 'not json at all');
  const out = inStore(dir, `
    console.log(JSON.stringify({
      accounts: Object.keys(store.data.accounts),
      friends: Object.keys(store.data.social.friends),
      chats: Object.keys(store.data.social.friendChats),
    }));
  `);
  const got = JSON.parse(out.trim().split('\n').pop());
  ok('accounts come back from the backup', got.accounts.includes('ada'), got);
  ok('friends come back from the backup', got.friends.includes('client-a'), got);
  ok('friend chats come back from the backup', got.chats.includes('client-a|client-b'), got);
  ok('the recovered document is written back as the live file',
    fs.existsSync(DATA(dir)) && accountsOf(DATA(dir)).includes('ada'));
}

// --- 3. An unreadable (but intact) file is left completely alone ------------
//
// A file that exists but will not open is the case that must be handled most
// conservatively: the contents are very probably fine, and the failure is in
// the reading. Nothing may be moved, replaced or written.
//
// The unreadable path here is a directory rather than a chmod'd file, because
// chmod does nothing when the tests run as root, and EISDIR is raised for
// every user. It exercises the same branch: exists, will not read.
{
  const dir = tmpDir();
  fs.mkdirSync(DATA(dir), { recursive: true });
  const canary = path.join(DATA(dir), 'untouched');
  fs.writeFileSync(canary, 'the real data');

  inStore(dir, `store.recordConnection(); store.persistNow();`);

  ok('an unreadable file is not quarantined',
    fs.readdirSync(dir).every((n) => !n.includes('.corrupt-')), fs.readdirSync(dir));
  ok('an unreadable file is left exactly where it was', fs.existsSync(DATA(dir)));
  ok('nothing inside it is disturbed',
    fs.existsSync(canary) && fs.readFileSync(canary, 'utf8') === 'the real data');
  ok('no replacement document is written', !fs.existsSync(DATA(dir) + '.tmp'), fs.readdirSync(dir));
}

// --- 3b. A blocked store still refuses to write on the way down -------------
//
// SIGTERM is what Fly sends on every deploy. The final flush must obey the
// same rule as every other write, or a shutdown would undo the protection.
{
  const dir = tmpDir();
  fs.mkdirSync(DATA(dir), { recursive: true });
  fs.writeFileSync(path.join(DATA(dir), 'untouched'), 'the real data');

  const src = `
    const store = require(${JSON.stringify(STORE)});
    (async () => {
      await store.ready;
      process.kill(process.pid, 'SIGTERM');
      setTimeout(() => {}, 2000);
    })();
  `;
  let stderr = '';
  try {
    execFileSync(process.execPath, ['-e', src], {
      env: { ...process.env, DATA_DIR: dir }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) { stderr = String(e.stderr || ''); }
  ok('SIGTERM does not write over an unreadable file', fs.statSync(DATA(dir)).isDirectory());
}

// --- 4. A fresh install still works normally --------------------------------
{
  const dir = tmpDir();
  inStore(dir, `store.upsertAccount('grace', { country: 'US' }); store.persistNow();`);
  ok('a first-ever boot writes normally', fs.existsSync(DATA(dir)) && accountsOf(DATA(dir)).length >= 0);
  const doc = JSON.parse(fs.readFileSync(DATA(dir), 'utf8'));
  ok('the new account is on disk', !!doc.accountsRegistry.grace, Object.keys(doc.accountsRegistry));
}

// --- 5. Saved data survives a normal restart --------------------------------
{
  const dir = tmpDir();
  seed(dir);
  const out = inStore(dir, `
    store.saveAccount('ada', { ...store.data.accounts.ada, nickname: 'Ada L' });
    store.persistNow();
    console.log(JSON.stringify(Object.keys(store.data.accounts)));
  `);
  ok('an existing account loads', JSON.parse(out.trim().split('\n').pop()).includes('ada'));
  const out2 = inStore(dir, `console.log(JSON.stringify(store.data.accounts.ada.nickname));`);
  ok('the edit survives a restart', JSON.parse(out2.trim().split('\n').pop()) === 'Ada L');
}

// --- 6. An unreachable database never forks the data into the local file ----
{
  const dir = tmpDir();
  // Port 1 is reserved and nothing listens there, so the connection fails fast.
  const out = inStore(dir, `
    store.upsertAccount('mallory', { country: 'US' });
    store.persistNow();
    console.log(JSON.stringify({ mode: store.backendStatus.mode }));
  `, { DATABASE_URL: 'postgres://u:p@127.0.0.1:1/db' });
  const got = JSON.parse(out.trim().split('\n').pop());
  ok('the backend reports itself unreachable rather than "file"', got.mode === 'postgres-unreachable', got);
  ok('nothing is written to the local file while the database is down', !fs.existsSync(DATA(dir)), fs.readdirSync(dir));
}

// --- 6b. A database outage keeps the site saving, on the mirror --------------
//
// The mirror is written before Postgres on every save, so it is never older
// than the database. When the database cannot be reached, the app serves the
// mirror and keeps saving to it rather than losing everything done meanwhile.
{
  const dir = tmpDir();
  seed(dir);
  const out = inStore(dir, `
    store.saveAccount('carol', { passwordHash: 'z', salt: 'w', nickname: 'Carol', createdAt: 3 });
    store.persistNow();
    console.log(JSON.stringify({ mode: store.backendStatus.mode, accounts: Object.keys(store.data.accounts) }));
  `, { DATABASE_URL: 'postgres://u:p@127.0.0.1:1/db' });
  const got = JSON.parse(out.trim().split('\n').pop());
  ok('an outage serves the copy on the volume', got.mode === 'postgres-offline' && got.accounts.includes('ada'), got);
  ok('and existing users are all still there', got.accounts.includes('ada'), got);
  const doc = JSON.parse(fs.readFileSync(DATA(dir), 'utf8'));
  ok('and new accounts made during the outage are saved to disk', !!doc.accounts.carol, Object.keys(doc.accounts));
  ok('and the saved copy carries a version stamp', !!(doc._meta && doc._meta.lineage && doc._meta.rev >= 1), doc._meta);
}

// --- 7. Switching to Postgres carries the volume's data up with it ----------
//
// Needs a real Postgres. TEST_DATABASE_URL points at a throwaway one; without
// it these are skipped rather than silently counted as passing.
const TEST_DB = process.env.TEST_DATABASE_URL || '';
if (!TEST_DB) {
  console.log('\nSKIP the Postgres cutover checks (set TEST_DATABASE_URL to a scratch database to run them)');
} else {
  const { execFileSync: run } = require('child_process');
  const psql = (sql) => run('psql', [TEST_DB, '-tAc', sql], { encoding: 'utf8' }).trim();
  const reset = () => psql('DROP TABLE IF EXISTS owner_store');
  const pgAccounts = () => psql("SELECT coalesce(count(*),0) FROM jsonb_object_keys((SELECT doc->'accounts' FROM owner_store WHERE id=1))");

  // The real situation: a populated volume and a database holding the empty
  // document a connect-once-never-write leaves behind.
  {
    reset();
    const dir = tmpDir();
    seed(dir);
    const out = inStore(dir, `console.log(JSON.stringify({
      accounts: Object.keys(store.data.accounts),
      friends: Object.keys(store.data.social.friends),
      chats: Object.keys(store.data.social.friendChats),
      seeded: store.backendStatus.seededFromFile,
      mode: store.backendStatus.mode,
    }));`, { DATABASE_URL: TEST_DB });
    const got = JSON.parse(out.trim().split('\n').pop());
    ok('the cutover switches to Postgres', got.mode === 'postgres', got);
    ok('the cutover carries accounts up', got.accounts.includes('ada'), got);
    ok('the cutover carries friends up', got.friends.includes('client-a'), got);
    ok('the cutover carries friend chats up', got.chats.includes('client-a|client-b'), got);
    ok('the cutover says it seeded', got.seeded === true, got);
    ok('the data really is in Postgres', pgAccounts() === '1', pgAccounts());
    ok('the volume keeps a copy (now the live mirror)',
      fs.existsSync(DATA(dir)) && accountsOf(DATA(dir)).includes('ada'));
    ok('and the original file is kept as a snapshot before it is first rewritten',
      fs.existsSync(path.join(dir, 'backups')) && fs.readdirSync(path.join(dir, 'backups')).length >= 1);

    // Restarting must not seed again, and must not re-read the file.
    const out2 = inStore(dir, `console.log(JSON.stringify({ seeded: store.backendStatus.seededFromFile }));`, { DATABASE_URL: TEST_DB });
    ok('a restart does not seed a second time',
      JSON.parse(out2.trim().split('\n').pop()).seeded === false);
  }

  // The dangerous inversion: a stale file must never overwrite a live database.
  {
    const dir = tmpDir();
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA(dir), JSON.stringify({
      accounts: { stale: { nickname: 'Stale' } },
      social: { friends: {}, friendChats: {}, blocks: {}, chatHistory: {} },
      analytics: {},
    }));
    const out = inStore(dir, `console.log(JSON.stringify({
      accounts: Object.keys(store.data.accounts), seeded: store.backendStatus.seededFromFile,
    }));`, { DATABASE_URL: TEST_DB });
    const got = JSON.parse(out.trim().split('\n').pop());
    ok('a stale file never overwrites a populated database',
      got.accounts.includes('ada') && !got.accounts.includes('stale'), got);
    ok('and it does not claim to have seeded', got.seeded === false, got);
  }

  // A fresh install with nothing anywhere, and a corrupt file with an empty
  // database: both must come up cleanly rather than crashing the boot.
  {
    reset();
    const dir = tmpDir();
    const out = inStore(dir, `console.log(JSON.stringify({ mode: store.backendStatus.mode, n: Object.keys(store.data.accounts).length }));`, { DATABASE_URL: TEST_DB });
    const got = JSON.parse(out.trim().split('\n').pop());
    ok('a fresh install with no file starts cleanly on Postgres', got.mode === 'postgres' && got.n === 0, got);

    fs.writeFileSync(DATA(dir), '{"accounts":');
    const out2 = inStore(dir, `console.log(JSON.stringify({ mode: store.backendStatus.mode, seeded: store.backendStatus.seededFromFile }));`, { DATABASE_URL: TEST_DB });
    const got2 = JSON.parse(out2.trim().split('\n').pop());
    ok('an unreadable file does not stop the Postgres boot', got2.mode === 'postgres', got2);
    ok('and an unreadable file is never used as a seed', got2.seeded === false, got2);
    // The mirror is rewritten at that path, so the damaged bytes are moved
    // aside rather than left where the next save would overwrite them.
    const kept = fs.readdirSync(dir).filter((f) => f.includes('.corrupt-'));
    ok('and its bytes are kept aside, not overwritten',
      kept.length === 1 && fs.readFileSync(path.join(dir, kept[0]), 'utf8') === '{"accounts":', fs.readdirSync(dir));
  }

  const pgDoc = () => JSON.parse(psql("SELECT doc::text FROM owner_store WHERE id=1") || 'null');
  const histCount = (kind) => Number(psql(`SELECT count(*) FROM owner_store_history WHERE kind='${kind}'`));

  // Every save lands in both copies, and the database keeps its own history.
  {
    reset(); psql('DROP TABLE IF EXISTS owner_store_history');
    const dir = tmpDir();
    seed(dir);
    inStore(dir, `
      store.saveAccount('dave', { passwordHash: 'q', salt: 'r', nickname: 'Dave', createdAt: 4 });
      store.persistNow();
      await store.whenPersisted();
    `, { DATABASE_URL: TEST_DB });
    const db = pgDoc();
    const disk = JSON.parse(fs.readFileSync(DATA(dir), 'utf8'));
    ok('a save reaches the database', !!db.accounts.dave, Object.keys(db.accounts));
    ok('and the same save reaches the copy on disk', !!disk.accounts.dave, Object.keys(disk.accounts));
    ok('and both copies are the same version', db._meta.rev === disk._meta.rev, [db._meta.rev, disk._meta.rev]);
    ok('the database keeps a history snapshot of its own', histCount('periodic') >= 1, histCount('periodic'));
    ok('the history table is closed to the public API (RLS on)',
      psql("SELECT relrowsecurity FROM pg_class WHERE relname='owner_store_history'") === 't');

    // An outage, then the database comes back: what was saved meanwhile goes up.
    inStore(dir, `
      store.saveAccount('erin', { passwordHash: 'e', salt: 'e', nickname: 'Erin', createdAt: 5 });
      store.persistNow();
    `, { DATABASE_URL: 'postgres://u:p@127.0.0.1:1/db' });
    ok('an outage save is on disk', !!JSON.parse(fs.readFileSync(DATA(dir), 'utf8')).accounts.erin);
    ok('and not yet in the database', !pgDoc().accounts.erin);
    const back = inStore(dir, `console.log(JSON.stringify(Object.keys(store.data.accounts)));`, { DATABASE_URL: TEST_DB });
    ok('when the database is back, the outage saves are served', JSON.parse(back.trim().split('\n').pop()).includes('erin'));
    ok('and pushed up to the database', !!pgDoc().accounts.erin, Object.keys(pgDoc().accounts));
    ok('and nothing from before the outage is lost', !!pgDoc().accounts.ada && !!pgDoc().accounts.dave);
  }

  // Two different histories: nothing is thrown away, and it is said out loud.
  {
    const dir = tmpDir();
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA(dir), JSON.stringify({
      accounts: { other: { nickname: 'Other' } },
      social: { friends: {}, friendChats: {}, blocks: {}, chatHistory: {} },
      analytics: {},
      _meta: { lineage: 'some-other-history', rev: 999 },
    }));
    const before = histCount('conflict');
    const out = inStore(dir, `console.log(JSON.stringify({
      accounts: Object.keys(store.data.accounts), conflict: !!store.backendStatus.conflict,
    }));`, { DATABASE_URL: TEST_DB });
    const got = JSON.parse(out.trim().split('\n').pop());
    ok('a different history never overwrites the database, even with a higher version',
      got.accounts.includes('ada') && !got.accounts.includes('other'), got);
    ok('the conflict is reported', got.conflict === true, got);
    const kept = fs.readdirSync(dir).filter((f) => f.startsWith('owner-data.conflict-'));
    ok('the other history is kept on disk', kept.length === 1 &&
      !!JSON.parse(fs.readFileSync(path.join(dir, kept[0]), 'utf8')).accounts.other, fs.readdirSync(dir));
    ok('and in the database history', histCount('conflict') === before + 1);
  }

  // A second copy of the app writing to the same database is caught, not interleaved.
  {
    const dir = tmpDir();
    const out = inStore(dir, `
      const { execFileSync } = require('child_process');
      execFileSync('psql', [${JSON.stringify(TEST_DB)}, '-tAc',
        "UPDATE owner_store SET doc = jsonb_set(jsonb_set(doc, '{_meta,writer}', '\\"someone-else\\"'), '{_meta,rev}', to_jsonb(((doc->'_meta'->>'rev')::bigint + 50)))"]);
      store.upsertAccount('frank', {});
      store.persistNow();
      await store.whenPersisted();
      console.log(JSON.stringify({ mode: store.backendStatus.mode }));
    `, { DATABASE_URL: TEST_DB });
    const got = JSON.parse(out.trim().split('\n').pop());
    ok('a second writer is detected', got.mode === 'postgres-conflict', got);
    ok('and its data in the database is left alone', pgDoc()._meta.writer === 'someone-else');
    ok('and this process keeps saving to disk', !!JSON.parse(fs.readFileSync(DATA(dir), 'utf8')).accountsRegistry.frank);
  }

  // The wipe guard: a sudden mass drop keeps the previous state first.
  {
    reset(); psql('DROP TABLE IF EXISTS owner_store_history');
    const dir = tmpDir();
    const many = {};
    for (let i = 0; i < 20; i++) many['user' + i] = { nickname: 'U' + i };
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA(dir), JSON.stringify({ accounts: many,
      social: { friends: {}, friendChats: {}, blocks: {}, chatHistory: {} }, analytics: {} }));
    const out = inStore(dir, `
      for (let i = 2; i < 20; i++) delete store.data.accounts['user' + i];
      store.persistNow();
      await store.whenPersisted();
      console.log(JSON.stringify({ shrink: store.backendStatus.lastShrink || null }));
    `, { DATABASE_URL: TEST_DB });
    const got = JSON.parse(out.trim().split('\n').pop());
    ok('a mass drop is flagged', !!got.shrink, got);
    ok('the state before the drop is kept in the database',
      histCount('pre-shrink') === 1 &&
      Number(psql("SELECT count(*) FROM jsonb_object_keys((SELECT doc->'accounts' FROM owner_store_history WHERE kind='pre-shrink' LIMIT 1))")) === 20);
    ok('and the save itself still happened (the site did not stop saving)',
      Object.keys(pgDoc().accounts).length === 2);
  }
  reset();
}

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
