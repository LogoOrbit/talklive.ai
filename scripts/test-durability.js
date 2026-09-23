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

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
