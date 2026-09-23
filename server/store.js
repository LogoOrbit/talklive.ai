// Persistent store for the owner dashboard: analytics, reports, bans,
// feedback, errors, accounts registry and admin credentials.
//
// Two backends, picked automatically:
//  - DATABASE_URL set (e.g. Supabase Postgres): the whole document lives in a
//    single jsonb row, and is the only option if the app ever runs on more
//    than one machine.
//  - otherwise: a JSON file under DATA_DIR (defaults to <repo>/data) - zero
//    setup locally. In production this is only durable if DATA_DIR is a real
//    mount: fly.toml sets DATA_DIR=/data and mounts the `talklive_data` volume
//    there (the deploy workflow creates that volume if it is missing), so the
//    file survives deploys. ephemeralStorage() below still checks at boot and
//    says so loudly if /data is ever an ordinary container directory again,
//    because that failure is otherwise completely silent: the server starts,
//    serves users, accepts sign-ups, and destroys them all on the next push.
// Writes are debounced either way so hot paths never block on I/O.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'owner-data.json');
const DATABASE_URL = process.env.DATABASE_URL || '';

// Backend status, surfaced (without secrets) on the /owner login screen so a
// misconfigured database is diagnosable without reading server logs.
const backendStatus = {
  configured: !!DATABASE_URL,   // DATABASE_URL is present
  mode: 'file',                 // 'postgres' once connected, else 'file'
  error: null,                  // last connection error message (no secrets)
  host: null,                   // host:port from the URL, for the operator
  // true when the file backend is writing to storage that does not survive a
  // deploy. Null when the backend is Postgres or the check could not run.
  ephemeral: null,
  dataDir: DATA_DIR,
  // Set to a reason string when the store has latched itself read-only because
  // it could not read the real document. Surfaced so this is visible in the
  // dashboard rather than only in the boot logs, which nobody reads until
  // after the accounts are already gone.
  persistBlocked: null,
};

// Is DATA_DIR a real mount, or just a directory inside the container image?
//
// A mounted volume is a different filesystem, so it reports a different device
// id from the root filesystem. Same device means the directory ships and dies
// with the container - every account, ban, report and the owner's own password
// hash is discarded on the next deploy, and deploys are automatic here.
//
// Reported rather than enforced: refusing to boot would turn a data-durability
// problem into an outage, and the file backend is exactly right in local
// development, where this check is expected to say "ephemeral" and mean
// nothing.
function ephemeralStorage() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    return fs.statSync(DATA_DIR).dev === fs.statSync('/').dev;
  } catch (_) {
    return null; // cannot tell; do not claim either way
  }
}

if (DATABASE_URL) {
  try {
    const u = new URL(DATABASE_URL);
    backendStatus.host = `${u.hostname}:${u.port || '5432'}`;
  } catch (_) { backendStatus.host = 'unparseable'; }
} else {
  // Only meaningful for the file backend; Postgres does not care where
  // DATA_DIR points.
  backendStatus.ephemeral = ephemeralStorage();
}

let pgPool = null;
// DATABASE_URL is set but the database is not answering. The pool is kept (so
// reconnects can use it) and every write is suppressed, because the database
// still holds the real accounts and the local file must not become a second,
// competing copy of them. Declared here so the boot path and the write path
// can both see it regardless of evaluation order.
let pgUnreachable = false;
let pgRetryDelay = 5000;
if (DATABASE_URL) {
  const { Pool } = require('pg');
  pgPool = new Pool({
    connectionString: DATABASE_URL,
    max: 3,
    // Fail fast instead of hanging the whole boot when the host is unreachable.
    connectionTimeoutMillis: 12000,
    idleTimeoutMillis: 30000,
    keepAlive: true,
    // Hosted Postgres (Supabase etc.) requires TLS but presents a cert Node
    // can't always chain; local/dev databases usually have no TLS at all.
    ssl: /localhost|127\.0\.0\.1|sslmode=disable/.test(DATABASE_URL)
      ? false
      : { rejectUnauthorized: false },
  });
  pgPool.on('error', (err) => console.error('[store] pg pool error:', err.message));
}

const MAX_REPORTS = 2000;
const MAX_FEEDBACK = 1000;
const MAX_ERRORS = 1000;
const MAX_AUDIT = 2000;
const MAX_TOPIC_WORDS = 600;
const MAX_DAYS = 120;

function defaults() {
  return {
    admin: null, // { passwordHash, salt, totpSecret, createdAt }
    sessions: [], // { token, createdAt, expiresAt, ip }
    bans: [], // { id, clientId, ip, username, country, city, reason, createdAt, expiresAt, liftedAt }
    reports: [], // { id, ts, reporter, reported, reason, detail, handled }
    feedback: [], // { id, ts, username, country, text }
    errors: [], // { id, ts, source, message, stack, url, username, country, count }
    auditLog: [], // { ts, ip, action, detail }
    transcripts: [], // { ts, pair, from, fromClientId, to, toClientId, country, text, kind }
    accountsRegistry: {}, // usernameLower -> details (analytics metadata)
    // Durable account credentials so signed-in users keep their account across
    // restarts/deploys. usernameLower -> { passwordHash, salt, nickname,
    // googleId, email, createdAt }. googleIndex maps a Google "sub" ->
    // usernameLower, emailIndex a lowercased recovery email -> usernameLower
    // (that index is what "forgot password" looks an account up by).
    accounts: {},
    googleIndex: {},
    emailIndex: {},
    // Pending password-reset OTPs, id -> record. Only used by the file backend;
    // with DATABASE_URL set these live in their own Postgres table instead (see
    // the password-reset section below), because they are short-lived rows with
    // their own expiry and do not belong in the long-lived document.
    passwordResets: {},
    // Long-lived server secrets that must survive a restart, name -> hex string.
    // Today: 'identity', the HMAC key the server signs clientId identity tokens
    // with. Regenerating it on every boot invalidated every browser's token, and
    // a rejected token makes the client rotate to a brand-new clientId - which
    // silently orphans that person's friends, friend chats and premium state.
    secrets: {},
    // Durable login sessions: token -> { u: usernameLower, createdAt, lastSeen }.
    // Lets a signed-in user stay signed in across page reloads, server restarts
    // and deploys (sliding expiry, see SESSION_TTL_MS).
    authSessions: {},
    // Durable social graph - users' "memories": who they added and what they
    // said. friends: clientId -> { friendClientId -> info }. friendChats:
    // pairKey -> [{ from, text, ts }]. blocks: clientId -> [clientId,...].
    // chatHistory: clientId -> [{ clientId, username, countryCode, ts }] - the
    // last few random chat partners, so a user can message someone back after
    // accidentally losing them (kept to the newest 10 per user).
    social: { friends: {}, friendChats: {}, blocks: {}, chatHistory: {}, friendRequests: {}, sentRequests: {}, notifications: {}, lastSeen: {}, blockMeta: {}, chatClears: {} },
    analytics: {
      totals: { visits: 0, connections: 0, matches: 0, messages: 0, reports: 0, accounts: 0, bots: 0 },
      // 'YYYY-MM-DD' (UTC) -> { visits, uniques, uniqueSet, connections, matches,
      // messages, reports, feedback, errors, newAccounts, peakOnline, countries,
      // cities, features, hours, bots, crawlers }. `hours` is '0'..'23' (UTC
      // hour) -> counters, which is what lets the dashboard re-cut a day into
      // any timezone.
      days: {},
      topics: {}, // word -> count (aggregate, anonymous)
      // The first UTC day on which crawler traffic was separated out of
      // `visits`/`uniques` rather than counted as people. Everything before it
      // is humans and bots mixed together, so the dashboard has to say so
      // instead of drawing one continuous line across the change and letting
      // the owner read the step as a collapse in traffic. Written once, by the
      // first visit recorded after the deploy that introduced the split.
      humanSince: null,
    },
    premium: {}, // clientId -> { activatedAt, updatedAt, expiresAt, lastEvent, subscriptionId, revokedAt }
    // Referral graph. `codes` maps a short public code -> the clientId that owns
    // it; `owners` is that owner's running tally; `claims` records who arrived
    // through whose code so a reward is paid exactly once per referred person.
    referrals: { codes: {}, owners: {}, claims: {} },
    // Web push subscriptions: clientId -> [{ endpoint, keys, ua, createdAt,
    // failures }]. Endpoints that a push service rejects as gone are dropped.
    push: {},
    settings: {
      maintenance: { on: false, message: 'TalkLive is under maintenance. We will be back shortly!' },
      banThreshold: 3,
      autoBanMinutes: 30,
      // IANA zone the owner dashboard reports "today"/"yesterday" in. Analytics
      // are always *stored* in UTC hour buckets; this only decides where the
      // day boundary is drawn when they are read back.
      timezone: process.env.REPORT_TZ || 'UTC',
    },
  };
}

let data = defaults();
let saveTimer = null;

function applyParsed(parsed) {
  data = { ...defaults(), ...parsed };
  data.analytics = { ...defaults().analytics, ...(parsed.analytics || {}) };
  data.settings = { ...defaults().settings, ...(parsed.settings || {}) };
  data.social = { ...defaults().social, ...(parsed.social || {}) };
  data.referrals = { ...defaults().referrals, ...(parsed.referrals || {}) };
  data.push = parsed.push || {};
  data.accounts = parsed.accounts || {};
  data.googleIndex = parsed.googleIndex || {};
  data.authSessions = parsed.authSessions || {};
  data.passwordResets = parsed.passwordResets || {};
  data.secrets = parsed.secrets || {};
  // Rebuild the email index from the accounts themselves rather than trusting
  // the stored copy: accounts written before recovery emails existed have no
  // index entry, and a rebuild keeps the two from ever drifting apart.
  data.emailIndex = {};
  for (const [usernameLower, acc] of Object.entries(data.accounts)) {
    if (acc && acc.email) data.emailIndex[String(acc.email).toLowerCase()] = usernameLower;
  }
}

// --- Never overwrite what we failed to read ---------------------------------
//
// The store is one document, and that document is every account, every
// friendship, every friend chat and every login session. Losing it is not a
// degraded service, it is the end of everybody's history - so the rule here is
// that the only thing allowed to destroy data is a deliberate write of data we
// actually loaded. A read that went wrong never gets to.
//
// When the document cannot be read or cannot be parsed, the old code logged a
// line and did `data = defaults()`. Two seconds later the first ordinary save
// wrote that empty document over the real one: a truncated file, a half-second
// of I/O trouble or a full disk turned into permanent, silent, total loss.
// Now a failed load quarantines the unreadable file, tries the rotating
// backups newest-first, and - if nothing can be recovered - latches the store
// into a state where it refuses to persist at all, so whatever is still on
// that disk stays there for a human to look at.
let persistBlocked = null;
function blockPersist(reason) {
  if (persistBlocked) return;
  persistBlocked = reason;
  backendStatus.persistBlocked = reason;
  console.error('[store] ============================================================');
  console.error('[store] REFUSING TO WRITE:', reason);
  console.error('[store] The store could not be read, so what is in memory is NOT');
  console.error('[store] the real data. Saving it would overwrite accounts, friends');
  console.error('[store] and chats with an empty document. Writes are disabled until');
  console.error('[store] the next restart. Look in', DATA_DIR, 'for the quarantined');
  console.error('[store] file and the backups/ directory, then restore one by hand.');
  console.error('[store] ============================================================');
}

const BACKUP_DIR = path.join(DATA_DIR, 'backups');
// Ten snapshots on a 6-hour cadence is a little over two days of history: long
// enough that damage introduced by a bad deploy is still recoverable after a
// weekend, small enough to be free on a 1GB volume.
const BACKUP_KEEP = 10;
const BACKUP_EVERY_MS = 6 * 60 * 60 * 1000;
let lastBackupAt = 0;

// Newest first, so recovery tries the least-stale snapshot before older ones.
function backupFiles() {
  try {
    return fs.readdirSync(BACKUP_DIR)
      .filter((n) => n.startsWith('owner-data.') && n.endsWith('.json'))
      .sort()
      .reverse()
      .map((n) => path.join(BACKUP_DIR, n));
  } catch (_) { return []; }
}

// A snapshot of the last known-good document. Taken from the file that was
// just written rather than from `data`, so a snapshot is always a copy of
// something that already survived a full serialize + atomic rename.
function writeBackup() {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.copyFileSync(DATA_FILE, path.join(BACKUP_DIR, `owner-data.${stamp}.json`));
    for (const old of backupFiles().slice(BACKUP_KEEP)) {
      try { fs.unlinkSync(old); } catch (_) { /* a stuck file is not worth failing over */ }
    }
    lastBackupAt = Date.now();
  } catch (err) {
    // A snapshot that cannot be taken must never break the write that
    // triggered it - the live file is the thing that matters.
    console.error('[store] backup failed:', err.message);
  }
}

// Move a file we could not read out of the way under a name that says what it
// is, so the next boot starts clean instead of hitting the same failure, and
// nothing is deleted. Returns the new path, or null if even this failed.
function quarantine(file, why) {
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dest = `${file}.${why}-${stamp}`;
    fs.renameSync(file, dest);
    console.error('[store] moved the unreadable file to', dest);
    return dest;
  } catch (err) {
    console.error('[store] could not quarantine', file + ':', err.message);
    return null;
  }
}

// Try each snapshot newest-first. Returns the one that loaded, or null.
function restoreFromBackup() {
  for (const file of backupFiles()) {
    try {
      applyParsed(JSON.parse(fs.readFileSync(file, 'utf8')));
      console.error('[store] RECOVERED from backup:', file);
      return file;
    } catch (err) {
      console.error('[store] backup unusable, trying older:', file, '-', err.message);
    }
  }
  return null;
}

function loadFile() {
  let raw;
  try {
    // Nothing there at all is the ordinary first-ever boot, not a failure:
    // there is no data to lose, so an empty document is the right answer and
    // writing is safe.
    if (!fs.existsSync(DATA_FILE)) return;
    raw = fs.readFileSync(DATA_FILE, 'utf8');
  } catch (err) {
    // The file exists but would not open. It is very probably intact, so it is
    // the one thing we must not touch - no quarantine, no restore, no writes.
    console.error('[store] could not read', DATA_FILE + ':', err.message);
    blockPersist(`cannot read ${DATA_FILE}: ${err.message}`);
    return;
  }

  try {
    applyParsed(JSON.parse(raw));
    return;
  } catch (err) {
    console.error('[store] data file is unreadable:', err.message);
  }

  // Parsed as garbage. Keep the evidence, then fall back through the snapshots.
  quarantine(DATA_FILE, 'corrupt');
  if (restoreFromBackup()) {
    // Recovered: let the restored document be written back out as the live
    // file, so the next boot is an ordinary one.
    persistNow();
    return;
  }

  // Corrupt and nothing to restore from. Serve what we can, save nothing.
  data = defaults();
  blockPersist(`${DATA_FILE} was corrupt and no usable backup was found`);
}

// --- Two copies, always ------------------------------------------------------
//
// With DATABASE_URL set there are two copies of the store at every moment:
// the Postgres row (off this machine) and a mirror file on the volume (on
// this machine). Every save writes the mirror first and Postgres second, so
// the mirror is never older than the database. Either one can be lost
// outright - the volume, or the whole Supabase project - and the other still
// holds everyone's accounts, friends and chats.
//
// That ordering is also what lets the site keep working through a database
// outage. When Postgres cannot be reached, the mirror is a faithful copy of
// what was last in it, so the app serves from the mirror and keeps saving to
// it, and pushes the result up when the database comes back. It used to do
// neither: first it forked into a stale file, then (briefly) it refused to
// save anything at all. Both lost data.
//
// Which copy is newer is never guessed. Every save stamps `_meta`:
//   lineage - random id born with the store and kept forever, so two copies
//             can tell whether they are versions of the same history at all
//   rev     - increments on every save within a lineage
//   writer  - this process, so a second copy of the app writing to the same
//             database is noticed instead of silently interleaved
// A copy only ever replaces another when it is provably a later version of
// the same history. Anything else is a conflict, and a conflict destroys
// nothing: the side not being served is preserved as a file and as a history
// row, and the owner dashboard says so.

const WRITER = crypto.randomBytes(8).toString('hex');
const newLineage = () => crypto.randomBytes(12).toString('hex');
const metaOf = (doc) => (doc && typeof doc === 'object' && doc._meta) || {};
const revOf = (doc) => Number(metaOf(doc).rev) || 0;
const lineageOf = (doc) => metaOf(doc).lineage || null;

let runningOnMirror = false;  // Postgres unreachable; serving and saving the mirror
let pgConflict = false;       // another writer touched the row; stop writing to it
let pgConfirmedRev = 0;       // the rev we know is in Postgres right now
let mirrorBlocked = false;    // the mirror path exists but cannot be read; never write it
const pgLive = () => !!pgPool && !pgUnreachable;

// History inside the database. Free Supabase projects have no restorable
// backups of their own, so without this the Postgres copy is a single
// version with no past. Kept on the same cadence as the volume snapshots.
const PG_HISTORY_EVERY_MS = 6 * 60 * 60 * 1000;
const PG_HISTORY_BUDGET_BYTES = 150 * 1024 * 1024; // of a 500MB free database
let lastPgHistoryAt = 0;

async function ensureSchema() {
  await pgPool.query(
    'CREATE TABLE IF NOT EXISTS owner_store (id int PRIMARY KEY, doc jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())'
  );
  await pgPool.query(`CREATE TABLE IF NOT EXISTS owner_store_history (
    id bigserial PRIMARY KEY,
    taken_at timestamptz NOT NULL DEFAULT now(),
    kind text NOT NULL,
    rev bigint,
    doc jsonb NOT NULL
  )`);
  // Same exposure as owner_store: reachable only over the server's own
  // connection. RLS on with no policies closes it to Supabase's public API,
  // and it holds password hashes and private messages, so that matters.
  // Best effort: a role that is not the owner cannot ALTER, and that must
  // never be the reason the store fails to connect.
  for (const t of ['owner_store', 'owner_store_history']) {
    try { await pgPool.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`); } catch (_) { /* see above */ }
  }
  // Password-reset OTPs get a real table instead of a corner of the document:
  // they are written and deleted constantly, expire on their own schedule, and
  // rewriting the whole document for each one would be wasteful. Created here
  // (rather than as a checked-in migration) for the same reason owner_store is
  // - the app is deployed straight from git with no migration step.
  await pgPool.query(`CREATE TABLE IF NOT EXISTS password_resets (
    id text PRIMARY KEY,
    username text NOT NULL,
    email text NOT NULL,
    code_hash text NOT NULL,
    token_hash text,
    attempts integer NOT NULL DEFAULT 0,
    expires_at bigint NOT NULL,
    token_expires_at bigint,
    used_at bigint,
    created_at bigint NOT NULL
  )`);
  await pgPool.query('CREATE INDEX IF NOT EXISTS password_resets_email_idx ON password_resets (email)');
  await pgPool.query('CREATE INDEX IF NOT EXISTS password_resets_token_idx ON password_resets (token_hash)');
}

// Copy a document into owner_store_history. `sql` form copies the live row
// server-side (no re-upload); `doc` form stores something we hold in memory.
async function pgHistory(kind, doc) {
  if (doc) {
    await pgPool.query('INSERT INTO owner_store_history (kind, rev, doc) VALUES ($1, $2, $3)',
      [kind, revOf(doc), JSON.stringify(doc)]);
  } else {
    await pgPool.query(`INSERT INTO owner_store_history (kind, rev, doc)
      SELECT $1, COALESCE((doc->'_meta'->>'rev')::bigint, 0), doc FROM owner_store WHERE id = 1`, [kind]);
  }
}

async function prunePgHistory(docBytes) {
  // As many periodic snapshots as fit the budget, never fewer than four and
  // never more than a week's worth. Conflict and pre-shrink copies are the
  // ones someone may need to look at by hand, so they are kept for 90 days.
  const keep = Math.max(4, Math.min(28, Math.floor(PG_HISTORY_BUDGET_BYTES / Math.max(docBytes, 1))));
  await pgPool.query(`DELETE FROM owner_store_history WHERE kind = 'periodic' AND id NOT IN (
    SELECT id FROM owner_store_history WHERE kind = 'periodic' ORDER BY id DESC LIMIT $1)`, [keep]);
  await pgPool.query(`DELETE FROM owner_store_history WHERE kind <> 'periodic' AND taken_at < now() - interval '90 days'`);
}

// "Nothing anyone would miss." Analytics and settings do not count: a document
// holding only counters and defaults is what a database that has been
// connected to but never really used looks like, and treating that as data
// worth keeping is what would block a carry-over.
function isEmptyDoc(doc) {
  if (!doc || typeof doc !== 'object') return true;
  const n = (o) => Object.keys(o || {}).length;
  const social = doc.social || {};
  return n(doc.accounts) === 0
    && n(doc.accountsRegistry) === 0
    && n(social.friends) === 0
    && n(social.friendChats) === 0
    && n(social.chatHistory) === 0
    && n(doc.authSessions) === 0
    && n(doc.premium) === 0
    && n(doc.push) === 0
    && (doc.bans || []).length === 0;
}

// The copy on the volume, for the Postgres path. A file that parses as garbage
// is moved aside with its bytes intact and the newest usable snapshot is used
// instead; a file that exists but cannot be read at all is left strictly
// alone, and the mirror is never written over it for the life of the process.
function readLocalDoc() {
  let raw;
  try {
    if (!fs.existsSync(DATA_FILE)) return null;
    raw = fs.readFileSync(DATA_FILE, 'utf8');
  } catch (err) {
    console.error('[store] the mirror at', DATA_FILE, 'exists but cannot be read:', err.message);
    console.error('[store] it will not be touched or written for the life of this process.');
    mirrorBlocked = true;
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error('[store] the mirror at', DATA_FILE, 'is not valid JSON:', err.message);
    quarantine(DATA_FILE, 'corrupt');
    for (const file of backupFiles()) {
      try {
        const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
        console.error('[store] using the newest usable snapshot instead:', file);
        return doc;
      } catch (_) { /* try the next older one */ }
    }
    return null;
  }
}

// Read the volume's copy once per boot. connectPg may have read it already
// before failing, and reading it again after a quarantine would find nothing.
let localDocMemo;
function bootLocal() {
  if (localDocMemo === undefined) localDocMemo = readLocalDoc();
  return localDocMemo;
}

// What to do with the database's copy and ours. Pure, so it can be reasoned
// about (and tested) without a database.
//   'use-pg'     the database copy is the one to serve
//   'push-local' ours is a later version of the same history, or the database
//                has nothing - send ours up
//   'conflict'   both hold real data and neither is provably newer
function decide(pgDoc, local) {
  if (isEmptyDoc(local)) return 'use-pg';
  if (isEmptyDoc(pgDoc)) return 'push-local';
  const lp = lineageOf(pgDoc);
  const ll = lineageOf(local);
  if (lp && ll && lp === ll) return revOf(local) > revOf(pgDoc) ? 'push-local' : 'use-pg';
  return 'conflict';
}

// Keep the side we are not serving, in both places a person could find it.
function preserveConflict(doc, reason) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(DATA_DIR, `owner-data.conflict-${stamp}.json`);
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(doc));
  } catch (err) {
    console.error('[store] could not write the conflict copy to disk:', err.message);
  }
  backendStatus.conflict = { at: new Date().toISOString(), reason, file };
  console.error('[store] ============================================================');
  console.error('[store] TWO DIFFERENT COPIES OF THE STORE:', reason);
  console.error('[store] Serving the database copy. The other one has been kept at');
  console.error('[store]  ', file);
  console.error('[store] and in owner_store_history (kind = conflict). Nothing was');
  console.error('[store] deleted; merge them by hand if the other copy has anything new.');
  console.error('[store] ============================================================');
  return file;
}

// Connect, decide which copy wins, and leave both copies identical. Used at
// boot (local = the mirror on disk) and on reconnect after an outage (local =
// what this process has been serving from the mirror meanwhile).
async function connectPg(atBoot) {
  await ensureSchema();
  const res = await pgPool.query('SELECT doc FROM owner_store WHERE id = 1');
  const pgDoc = res.rows.length ? res.rows[0].doc : null;
  const local = atBoot ? bootLocal() : (runningOnMirror ? data : null);
  const verdict = decide(pgDoc, local);
  const n = (o) => Object.keys(o || {}).length;

  backendStatus.seededFromFile = false;

  if (verdict === 'push-local') {
    if (atBoot) applyParsed(local);
    stampMeta();
    await pgPool.query(
      'INSERT INTO owner_store (id, doc, updated_at) VALUES (1, $1, now()) ON CONFLICT (id) DO UPDATE SET doc = $1, updated_at = now()',
      [JSON.stringify(data)]
    );
    // Read it back: this is the one moment the data exists in a place nobody
    // has checked yet.
    const back = await pgPool.query('SELECT doc FROM owner_store WHERE id = 1');
    const got = back.rows[0] && back.rows[0].doc;
    if (revOf(got) !== revOf(data)) throw new Error('wrote the store to Postgres but read back a different version');
    const fresh = isEmptyDoc(pgDoc);
    backendStatus.seededFromFile = fresh;
    console.log('[store] ------------------------------------------------------------');
    console.log(fresh
      ? `[store] FIRST RUN ON POSTGRES - copied the store up from ${DATA_FILE}`
      : '[store] Postgres was behind the mirror - brought it up to date');
    console.log('[store]  accounts:', n(got.accounts),
      '· people with friends:', n((got.social || {}).friends),
      '· friend chats:', n((got.social || {}).friendChats),
      '· logged-in sessions:', n(got.authSessions));
    console.log('[store] ------------------------------------------------------------');
  } else if (verdict === 'conflict') {
    await pgHistory('conflict', local);
    preserveConflict(local, 'the mirror and the database hold different histories');
    applyParsed(pgDoc);
  } else {
    applyParsed(pgDoc || {});
  }

  pgConfirmedRev = revOf(data);
  pgUnreachable = false;
  runningOnMirror = false;
  pgConflict = false;
  backendStatus.mode = 'postgres';
  backendStatus.error = null;
  // From here the mirror is exactly the database copy again.
  writeMirror();
  console.log('[store] using Postgres backend (DATABASE_URL) -', backendStatus.host,
    '- mirrored to', DATA_FILE);
}

// --- Wipe guard ---------------------------------------------------------------
//
// A save that would suddenly drop a large share of accounts or conversations
// is far more likely to be a bug than a hundred people deleting themselves in
// two seconds. It is not refused - refusing would stop the site saving, which
// loses data too - but the copy about to be overwritten is kept first, on
// disk and in the database, so whatever caused it can be undone.
let lastCensus = null;
let pendingShrinkSnapshot = false;
function census(doc) {
  const n = (o) => Object.keys(o || {}).length;
  const social = doc.social || {};
  return { accounts: n(doc.accounts), friends: n(social.friends), chats: n(social.friendChats) };
}
function bigDrop(before, after) {
  return before - after >= Math.max(5, Math.ceil(before * 0.2));
}
function checkShrink() {
  const now = census(data);
  const prev = lastCensus;
  lastCensus = now;
  if (!prev) return false;
  const hit = ['accounts', 'friends', 'chats'].filter((k) => bigDrop(prev[k], now[k]));
  if (!hit.length) return false;
  const detail = hit.map((k) => `${k} ${prev[k]} -> ${now[k]}`).join(', ');
  backendStatus.lastShrink = { at: new Date().toISOString(), detail };
  console.error('[store] LARGE DROP ON SAVE:', detail, '- keeping a copy of the previous state first.');
  return true;
}

function stampMeta() {
  const m = metaOf(data);
  data._meta = {
    lineage: m.lineage || newLineage(),
    rev: (Number(m.rev) || 0) + 1,
    writer: WRITER,
    savedAt: Date.now(),
  };
}

let mirrorPrimed = false;
function writeMirror(shrinking) {
  if (mirrorBlocked) return false;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    // Whatever was on disk before this process first writes is kept as a
    // snapshot - it may be a store from an earlier life of the app - and so
    // is the previous state ahead of any save the wipe guard flagged.
    if ((!mirrorPrimed || shrinking) && fs.existsSync(DATA_FILE)) writeBackup();
    mirrorPrimed = true;
    const tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data));
    fs.renameSync(tmp, DATA_FILE);
  } catch (err) {
    console.error('[store] failed to save to disk:', err.message);
    return false;
  }
  if (Date.now() - lastBackupAt >= BACKUP_EVERY_MS) writeBackup();
  return true;
}

// One Postgres write at a time; a save that lands while one is in flight is
// folded into the next, which serializes whatever `data` is by then.
let pgChain = Promise.resolve();
let pgQueued = false;
function persistPg() {
  if (pgQueued) return;
  pgQueued = true;
  pgChain = pgChain.then(async () => {
    pgQueued = false;
    if (!pgLive() || pgConflict) return;
    const payload = JSON.stringify(data);
    const rev = revOf(data);
    try {
      if (pendingShrinkSnapshot) {
        pendingShrinkSnapshot = false;
        await pgHistory('pre-shrink');
      }
      // Only overwrite a row that is ours: last written by this process, or no
      // newer than the version we last confirmed. Anything else means a second
      // copy of the app is writing too, and interleaving two of them would
      // silently lose whichever wrote first.
      const r = await pgPool.query(
        `INSERT INTO owner_store (id, doc, updated_at) VALUES (1, $1, now())
         ON CONFLICT (id) DO UPDATE SET doc = $1, updated_at = now()
         WHERE owner_store.doc->'_meta'->>'writer' = $3
            OR COALESCE((owner_store.doc->'_meta'->>'rev')::bigint, 0) <= $2`,
        [payload, pgConfirmedRev, WRITER]
      );
      if (r.rowCount === 0) {
        pgConflict = true;
        backendStatus.mode = 'postgres-conflict';
        backendStatus.conflict = { at: new Date().toISOString(), reason: 'another process wrote to the database' };
        console.error('[store] ============================================================');
        console.error('[store] Another copy of the app has written to the database. This');
        console.error('[store] process has stopped writing there and keeps saving to', DATA_FILE);
        console.error('[store] Both copies are intact. Run one machine only, then restart.');
        console.error('[store] ============================================================');
        return;
      }
      pgConfirmedRev = rev;
      if (Date.now() - lastPgHistoryAt >= PG_HISTORY_EVERY_MS) {
        lastPgHistoryAt = Date.now();
        await pgHistory('periodic');
        await prunePgHistory(payload.length);
      }
    } catch (err) {
      // The mirror already has this save; the next one retries Postgres.
      console.error('[store] pg save failed (kept on disk):', err.message);
    }
  });
}

function persistNow() {
  // Everything is being written now, so a debounced save already queued has
  // nothing left to do.
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  // The load failed, so `data` is not the real document. Writing it is exactly
  // the destructive act this guard exists to prevent.
  if (persistBlocked) return;
  // DATABASE_URL set, database unreachable, and no mirror to serve from: what
  // is in memory is not anybody's data, so it goes nowhere.
  if (pgPool && pgUnreachable && !runningOnMirror) return;
  stampMeta();
  const shrinking = checkShrink();
  if (shrinking) pendingShrinkSnapshot = true;
  writeMirror(shrinking);
  if (pgLive()) persistPg();
}

function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    persistNow();
  }, 2000);
}

function dayKey(ts = Date.now()) {
  return new Date(ts).toISOString().slice(0, 10);
}

// Per-visitor hashes are only needed to dedupe *today's* uniques; keeping them
// for every retained day is what made the document large. Days older than this
// keep their `uniques` count and drop the set behind it.
const UNIQUE_SET_DAYS = 2;

function newHour() {
  return { visits: 0, uniques: 0, connections: 0, matches: 0, messages: 0, peakOnline: 0, bots: 0 };
}

function day(ts = Date.now()) {
  const key = dayKey(ts);
  if (!data.analytics.days[key]) {
    data.analytics.days[key] = {
      visits: 0,
      uniques: 0,
      uniqueSet: {},
      connections: 0,
      matches: 0,
      messages: 0,
      reports: 0,
      feedback: 0,
      errors: 0,
      newAccounts: 0,
      peakOnline: 0,
      countries: {},
      cities: {},
      features: {},
      hours: {},
      // Crawler traffic, kept beside the human numbers rather than inside
      // them. `bots` is the hit count; `crawlers` is label -> hits, so a swing
      // can be attributed ("Google is crawling less") instead of merely noted.
      bots: 0,
      crawlers: {},
      // Section name -> human page views, so traffic to the blog, the country
      // pages and the localized homepages is visible as itself rather than
      // folded into one site-wide total.
      sections: {},
    };
    // Trim old days so the file never grows unbounded.
    const keys = Object.keys(data.analytics.days).sort();
    while (keys.length > MAX_DAYS) {
      delete data.analytics.days[keys.shift()];
    }
    // Drop the visitor-hash sets of days we'll never dedupe against again.
    for (const k of keys.slice(0, Math.max(0, keys.length - UNIQUE_SET_DAYS))) {
      const d = data.analytics.days[k];
      if (d && d.uniqueSet && Object.keys(d.uniqueSet).length) d.uniqueSet = {};
    }
  }
  const d = data.analytics.days[key];
  if (!d.hours) d.hours = {}; // day record written before hourly buckets existed
  return d;
}

// The hour bucket (UTC) a timestamp belongs to, inside its day record.
function hour(ts = Date.now()) {
  const d = day(ts);
  const h = String(new Date(ts).getUTCHours());
  if (!d.hours[h]) d.hours[h] = newHour();
  return d.hours[h];
}

function hashIp(ip) {
  return crypto.createHash('sha256').update('talklive-uv:' + ip).digest('hex').slice(0, 12);
}

// --- Analytics recording ---

/**
 * Record one page view.
 *
 * `crawler` is the label from server/bots.js when the request came from a
 * crawler, prefetcher or script, and null when it came from a person. Crawler
 * hits are counted in their own bucket and deliberately kept out of `visits`,
 * `uniques` and the geo maps: a crawl-budget swing is not a change in
 * audience, and letting one move the visitor graph is what made that graph
 * impossible to act on. See server/bots.js for the full reasoning.
 */
function recordVisit(ip, countryName, city, crawler = null) {
  const d = day();
  const hr = hour();

  if (crawler) {
    d.bots = (d.bots || 0) + 1;
    hr.bots = (hr.bots || 0) + 1;
    data.analytics.totals.bots = (data.analytics.totals.bots || 0) + 1;
    if (!d.crawlers) d.crawlers = {};
    d.crawlers[crawler] = (d.crawlers[crawler] || 0) + 1;
    // No geo for a crawler: Googlebot's datacentre is not an audience, and
    // letting it into `countries` is how "your biggest audience is the United
    // States" ends up meaning "Mountain View re-crawled you".
    save();
    return;
  }

  // First human visit after the split shipped: stamp the day, so the dashboard
  // can mark where the definition of "visitor" changed rather than let the
  // step be read as a fall in traffic.
  if (!data.analytics.humanSince) data.analytics.humanSince = dayKey();

  d.visits += 1;
  hr.visits += 1;
  data.analytics.totals.visits += 1;
  const h = hashIp(ip || 'unknown');
  if (!d.uniqueSet[h]) {
    d.uniqueSet[h] = 1;
    d.uniques += 1;
    // Per-hour uniques = visitors first seen in that hour, so the hours of a
    // day sum back to the day's unique count.
    hr.uniques += 1;
  }
  if (countryName) d.countries[countryName] = (d.countries[countryName] || 0) + 1;
  if (city && city !== 'Unknown') d.cities[city] = (d.cities[city] || 0) + 1;
  save();
}

/**
 * Which part of the site a human page view landed on ('blog', 'country
 * pages', 'home', ...). Kept separate from `features` because features are
 * things a user *did* and this is where they *were*; mixing them would put
 * "blog" in the same ranking as "chat_message" and make both harder to read.
 */
function recordSection(name) {
  if (!name) return;
  const d = day();
  if (!d.sections) d.sections = {};
  d.sections[name] = (d.sections[name] || 0) + 1;
  save();
}

/**
 * Distinct visitors over the trailing 24 hours, for the home screen's live
 * counter. Rolling, not "today": a calendar day resets to a near-zero number
 * just after UTC midnight, which reads as an empty site to anyone visiting
 * then. Summing the last 24 hour buckets (this hour plus the previous 23,
 * crossing the day boundary) always covers a full day of traffic.
 *
 * `uniques` is per-hour first-seen, so the buckets sum without double-counting
 * within an hour. A visitor spanning two hours is counted once per UTC day,
 * because the dedupe set is per-day - close enough for a display counter, and
 * it never inflates the way raw page views would.
 */
function visitorsLast24h(ts = Date.now()) {
  let total = 0;
  for (let back = 0; back < 24; back++) {
    const t = ts - back * 3600000;
    const d = data.analytics.days[dayKey(t)];
    if (!d || !d.hours) continue;
    const hr = d.hours[String(new Date(t).getUTCHours())];
    if (hr) total += hr.uniques || 0;
  }
  return total;
}

function recordConnection() {
  day().connections += 1;
  hour().connections += 1;
  data.analytics.totals.connections += 1;
  save();
}

function recordPeakOnline(count) {
  const d = day();
  const hr = hour();
  let changed = false;
  if (count > d.peakOnline) { d.peakOnline = count; changed = true; }
  if (count > hr.peakOnline) { hr.peakOnline = count; changed = true; }
  if (changed) save();
}

function recordFeature(name) {
  const d = day();
  d.features[name] = (d.features[name] || 0) + 1;
  if (name === 'match') { d.matches += 1; hour().matches += 1; data.analytics.totals.matches += 1; }
  if (name === 'chat_message') { d.messages += 1; hour().messages += 1; data.analytics.totals.messages += 1; }
  save();
}

const STOPWORDS = new Set(('the and you your for that this with have from what like just are was but not they them then when where will can could would there here how who whom about into over under again very really much many some any all been being were is it its our out off did does doing had has more most other only own same than too she he his her hers him himself herself they their theirs myself yourself hello okay yeah yes no nope maybe dont cant wont didnt doesnt im ive ill youre youve thats whats going want know think good time talk talking say said tell')
  .split(/\s+/));

// Aggregate, anonymous topic keywords - never stores who said what or full text.
function recordTopics(text) {
  const words = String(text || '').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/);
  const topics = data.analytics.topics;
  let changed = false;
  for (const w of words) {
    if (w.length < 4 || w.length > 20 || STOPWORDS.has(w)) continue;
    topics[w] = (topics[w] || 0) + 1;
    changed = true;
  }
  if (changed) {
    const keys = Object.keys(topics);
    if (keys.length > MAX_TOPIC_WORDS) {
      // Drop the rarest words to keep the map bounded.
      keys.sort((a, b) => topics[a] - topics[b]);
      for (const k of keys.slice(0, keys.length - MAX_TOPIC_WORDS)) delete topics[k];
    }
    save();
  }
}

// Full text-chat transcripts, kept for owner moderation (disclosed in the
// privacy policy). Voice is peer-to-peer and never passes through the server.
const MAX_TRANSCRIPT = 5000;
function addTranscript(entry) {
  data.transcripts.unshift({ ts: Date.now(), ...entry });
  if (data.transcripts.length > MAX_TRANSCRIPT) data.transcripts.pop();
  save();
}

// --- Reports / feedback / errors ---

function addReport(entry) {
  const rec = { id: crypto.randomUUID(), ts: Date.now(), handled: false, ...entry };
  data.reports.unshift(rec);
  if (data.reports.length > MAX_REPORTS) data.reports.pop();
  const d = day();
  d.reports += 1;
  data.analytics.totals.reports += 1;
  save();
  return rec;
}

function reportCountFor(clientId) {
  return data.reports.filter((r) => r.reported && r.reported.clientId === clientId).length;
}

function addFeedback(entry) {
  const rec = { id: crypto.randomUUID(), ts: Date.now(), ...entry };
  data.feedback.unshift(rec);
  if (data.feedback.length > MAX_FEEDBACK) data.feedback.pop();
  day().feedback += 1;
  save();
  return rec;
}

function addError(entry) {
  // Collapse duplicates (same source+message) into a counter.
  const existing = data.errors.find((e) => e.source === entry.source && e.message === entry.message);
  if (existing) {
    existing.count += 1;
    existing.ts = Date.now();
    save();
    return existing;
  }
  const rec = { id: crypto.randomUUID(), ts: Date.now(), count: 1, ...entry };
  data.errors.unshift(rec);
  if (data.errors.length > MAX_ERRORS) data.errors.pop();
  day().errors += 1;
  save();
  return rec;
}

// --- Bans ---

function activeBans() {
  const now = Date.now();
  return data.bans.filter((b) => !b.liftedAt && b.expiresAt > now);
}

function findActiveBan(clientId, ip) {
  const now = Date.now();
  return data.bans.find((b) => !b.liftedAt && b.expiresAt > now
    && ((clientId && b.clientId === clientId) || (ip && b.ip && b.ip === ip))) || null;
}

function addBan({ clientId, ip, username, country, city, reason, minutes }) {
  const rec = {
    id: crypto.randomUUID(),
    clientId: clientId || null,
    ip: ip || null,
    username: username || 'Unknown',
    country: country || '',
    city: city || '',
    reason: reason || 'unspecified',
    createdAt: Date.now(),
    expiresAt: Date.now() + Math.max(1, minutes) * 60000,
    liftedAt: null,
  };
  data.bans.unshift(rec);
  if (data.bans.length > 1000) data.bans.pop();
  save();
  return rec;
}

function liftBan(banId) {
  const ban = data.bans.find((b) => b.id === banId);
  if (ban && !ban.liftedAt) {
    ban.liftedAt = Date.now();
    save();
    return ban;
  }
  return null;
}

// --- Accounts registry (persists account metadata across restarts) ---

function upsertAccount(usernameLower, details) {
  const existing = data.accountsRegistry[usernameLower];
  if (!existing) {
    data.accountsRegistry[usernameLower] = { createdAt: Date.now(), ...details };
    day().newAccounts += 1;
    data.analytics.totals.accounts += 1;
  } else {
    Object.assign(existing, details, { lastSeen: Date.now() });
  }
  save();
}

// --- Premium subscriptions ---
//
// A grant carries an optional `expiresAt` (epoch ms). Without one it is
// permanent, which is what every grant made before billing existed looks like -
// so old records keep working untouched. With one it lapses on its own, which
// is what a cancelled Stripe subscription, a referral reward and an
// ad-for-a-pass grant all need: nothing has to run a sweeper for a user to stop
// being premium, because the check is evaluated at read time.

function setPremium(clientId, info = {}) {
  const existing = data.premium[clientId];
  data.premium[clientId] = {
    activatedAt: existing ? existing.activatedAt : Date.now(),
    ...existing,
    ...info,
    revokedAt: null,
    updatedAt: Date.now(),
  };
  save();
  return data.premium[clientId];
}

// Extend a grant by `days` from whichever is later: now, or the time it would
// otherwise have lapsed. Stacking rewards must never *shorten* an existing
// subscription, and a reward earned two weeks after the last one expired must
// not be backdated into the past.
function extendPremium(clientId, days, info = {}) {
  const ms = Math.max(0, Number(days) || 0) * 24 * 60 * 60000;
  if (!ms) return data.premium[clientId] || null;
  const existing = data.premium[clientId];
  const active = existing && !existing.revokedAt;
  // A permanent grant (no expiresAt) must stay permanent - adding days to it
  // would silently convert it into one that lapses.
  if (active && !existing.expiresAt) return existing;
  const base = active && existing.expiresAt > Date.now() ? existing.expiresAt : Date.now();
  return setPremium(clientId, { ...info, expiresAt: base + ms });
}

function revokePremium(clientId, info = {}) {
  const existing = data.premium[clientId];
  if (!existing) return null;
  Object.assign(existing, info, { revokedAt: Date.now(), updatedAt: Date.now() });
  save();
  return existing;
}

function isPremiumClient(clientId) {
  const rec = data.premium[clientId];
  if (!rec || rec.revokedAt) return false;
  if (rec.expiresAt && rec.expiresAt <= Date.now()) return false;
  return true;
}

// null = premium is permanent or absent; a number = epoch ms it lapses at.
// The client uses this to show "Plus until 4 March" and to stop asking the
// server for status until then.
function premiumExpiry(clientId) {
  const rec = data.premium[clientId];
  if (!rec || rec.revokedAt || !rec.expiresAt) return null;
  return rec.expiresAt;
}

// --- Durable accounts (credentials) ---

// Persist (or update) an account's credentials. Called on signup, Google
// account creation, nickname change and password change so a signed-in user's
// login keeps working after a restart or deploy.
function saveAccount(usernameLower, account) {
  const previous = data.accounts[usernameLower] || {};
  const email = account.email ? String(account.email).toLowerCase() : null;
  // A changed recovery email must release the old address, or the old one keeps
  // resolving to this account and password-reset codes go to whoever used to
  // own it.
  if (previous.email && previous.email !== email) {
    delete data.emailIndex[String(previous.email).toLowerCase()];
  }
  data.accounts[usernameLower] = {
    passwordHash: account.passwordHash || null,
    salt: account.salt || null,
    nickname: account.nickname || '',
    googleId: account.googleId || null,
    email,
    // The Google profile the user consented to share (name, verified email,
    // avatar, locale, workspace domain). Null for password accounts, and kept
    // from the previous record if this write did not carry a fresh copy.
    google: account.google || previous.google || null,
    // The anonymous profile (clientId) this account owns: friends, chat
    // history and premium all hang off it, so binding it to the account is
    // what lets a sign-in on a second device pick the same profile back up.
    // Never written from the in-memory accounts Map (which does not carry it),
    // so always keep whatever the previous record had unless this write
    // explicitly replaces it.
    clientId: account.clientId || previous.clientId || null,
    createdAt: previous.createdAt || Date.now(),
  };
  if (account.googleId) data.googleIndex[account.googleId] = usernameLower;
  if (email) data.emailIndex[email] = usernameLower;
  save();
}

// --- Account <-> profile link ----------------------------------------------
// An account is credentials; a profile (clientId) is everything the person
// actually cares about - friends, friend chats, call history, premium. They
// used to be unrelated, so signing in on a new device handed you an empty
// profile. These two bind them: the first device to sign in donates its
// profile, and every later sign-in is handed that same clientId back.

// The clientId an account is linked to, or null if it never got one.
function getAccountClientId(usernameLower) {
  const acc = data.accounts[String(usernameLower || '').toLowerCase()];
  return (acc && acc.clientId) || null;
}

// Link an account to a profile. Refuses to overwrite an existing link: the
// first profile is the one that holds the friends, and quietly repointing the
// account at a fresh device's empty profile would lose them.
function setAccountClientId(usernameLower, clientId) {
  const key = String(usernameLower || '').toLowerCase();
  const acc = data.accounts[key];
  if (!acc || !clientId || acc.clientId) return acc ? acc.clientId || null : null;
  acc.clientId = clientId;
  save();
  return clientId;
}

// Which account, if any, a recovery email belongs to. Returns usernameLower.
function findUsernameByEmail(email) {
  if (typeof email !== 'string' || !email) return null;
  return data.emailIndex[email.trim().toLowerCase()] || null;
}

// --- Durable login sessions ------------------------------------------------
// Sliding one-year expiry: any resume refreshes lastSeen, so active users are
// never logged out; only tokens untouched for a year are pruned.
const SESSION_TTL_MS = 365 * 24 * 60 * 60000;
const MAX_SESSIONS_PER_USER = 20;

function pruneAuthSessions() {
  const now = Date.now();
  for (const [token, s] of Object.entries(data.authSessions)) {
    if (!s || now - (s.lastSeen || s.createdAt || 0) > SESSION_TTL_MS) {
      delete data.authSessions[token];
    }
  }
}

function createAuthSession(usernameLower) {
  pruneAuthSessions();
  // Cap sessions per user (oldest first) so one account can't grow unbounded.
  const mine = Object.entries(data.authSessions)
    .filter(([, s]) => s.u === usernameLower)
    .sort((a, b) => (a[1].lastSeen || 0) - (b[1].lastSeen || 0));
  while (mine.length >= MAX_SESSIONS_PER_USER) {
    delete data.authSessions[mine.shift()[0]];
  }
  const token = crypto.randomBytes(32).toString('hex');
  data.authSessions[token] = { u: usernameLower, createdAt: Date.now(), lastSeen: Date.now() };
  save();
  return token;
}

// Returns the usernameLower for a valid token (refreshing its expiry), or null.
function getAuthSessionUser(token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return null;
  const s = data.authSessions[token];
  if (!s) return null;
  if (Date.now() - (s.lastSeen || s.createdAt || 0) > SESSION_TTL_MS) {
    delete data.authSessions[token];
    save();
    return null;
  }
  s.lastSeen = Date.now();
  save();
  return s.u;
}

function deleteAuthSession(token) {
  if (typeof token === 'string' && data.authSessions[token]) {
    delete data.authSessions[token];
    save();
  }
}

// Invalidate every session of a user (e.g. after a password change), optionally
// keeping one token (the device that made the change) signed in.
function deleteAuthSessionsForUser(usernameLower, exceptToken) {
  let changed = false;
  for (const [token, s] of Object.entries(data.authSessions)) {
    if (s.u === usernameLower && token !== exceptToken) {
      delete data.authSessions[token];
      changed = true;
    }
  }
  if (changed) save();
}

// --- Password reset (email OTP) ---------------------------------------------
//
// One pending reset per email address at a time: asking for a new code
// replaces the old one, so a resend can never leave two valid codes alive.
//
// Nothing here stores a secret in the clear. The six-digit code and the token
// handed out after it is verified are both kept as SHA-256 hashes, exactly like
// a password hash: a leaked database row is not enough to take over an account.
// Rows carry their own expiry and are deleted on use, and purgePasswordResets()
// sweeps up whatever was abandoned.
//
// Two backends, same rule as everything else here: a Postgres table when
// DATABASE_URL points at one (Supabase in production), otherwise a corner of
// the JSON document.

function normalizeReset(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    codeHash: row.code_hash !== undefined ? row.code_hash : row.codeHash,
    tokenHash: row.token_hash !== undefined ? row.token_hash : row.tokenHash,
    attempts: Number(row.attempts || 0),
    expiresAt: Number(row.expires_at !== undefined ? row.expires_at : row.expiresAt),
    tokenExpiresAt: Number(
      (row.token_expires_at !== undefined ? row.token_expires_at : row.tokenExpiresAt) || 0
    ),
    usedAt: Number((row.used_at !== undefined ? row.used_at : row.usedAt) || 0),
    createdAt: Number((row.created_at !== undefined ? row.created_at : row.createdAt) || 0),
  };
}

// Drop everything expired or already spent. Cheap, so it runs on the way into
// every reset request rather than on a timer.
async function purgePasswordResets() {
  const now = Date.now();
  if (pgLive()) {
    try {
      await pgPool.query(
        'DELETE FROM password_resets WHERE used_at IS NOT NULL OR (expires_at < $1 AND (token_expires_at IS NULL OR token_expires_at < $1))',
        [now]
      );
    } catch (err) {
      console.error('[store] password reset purge failed:', err.message);
    }
    return;
  }
  let changed = false;
  for (const [id, r] of Object.entries(data.passwordResets)) {
    const rec = normalizeReset(r);
    if (!rec || rec.usedAt || (rec.expiresAt < now && (!rec.tokenExpiresAt || rec.tokenExpiresAt < now))) {
      delete data.passwordResets[id];
      changed = true;
    }
  }
  if (changed) save();
}

// Replaces any pending reset for this email and returns the new record's id.
async function startPasswordReset({ username, email, codeHash, ttlMs }) {
  const emailLower = String(email).toLowerCase();
  const now = Date.now();
  const id = crypto.randomBytes(16).toString('hex');
  const expiresAt = now + ttlMs;
  await purgePasswordResets();
  if (pgLive()) {
    await pgPool.query('DELETE FROM password_resets WHERE email = $1', [emailLower]);
    await pgPool.query(
      `INSERT INTO password_resets (id, username, email, code_hash, attempts, expires_at, created_at)
       VALUES ($1, $2, $3, $4, 0, $5, $6)`,
      [id, username, emailLower, codeHash, expiresAt, now]
    );
    return { id, expiresAt };
  }
  for (const [key, r] of Object.entries(data.passwordResets)) {
    if (r && String(r.email).toLowerCase() === emailLower) delete data.passwordResets[key];
  }
  data.passwordResets[id] = {
    id, username, email: emailLower, codeHash, tokenHash: null,
    attempts: 0, expiresAt, tokenExpiresAt: 0, usedAt: 0, createdAt: now,
  };
  save();
  return { id, expiresAt };
}

// The live, unexpired, unspent reset for an email, or null.
async function findPasswordReset(email) {
  const emailLower = String(email || '').toLowerCase();
  if (!emailLower) return null;
  const now = Date.now();
  if (pgLive()) {
    const res = await pgPool.query(
      'SELECT * FROM password_resets WHERE email = $1 AND used_at IS NULL AND expires_at > $2 ORDER BY created_at DESC LIMIT 1',
      [emailLower, now]
    );
    return res.rows.length ? normalizeReset(res.rows[0]) : null;
  }
  const rows = Object.values(data.passwordResets)
    .map(normalizeReset)
    .filter((r) => r && r.email === emailLower && !r.usedAt && r.expiresAt > now)
    .sort((a, b) => b.createdAt - a.createdAt);
  return rows[0] || null;
}

// Counts one wrong code and returns the new attempt total.
async function notePasswordResetFailure(id) {
  if (pgLive()) {
    const res = await pgPool.query(
      'UPDATE password_resets SET attempts = attempts + 1 WHERE id = $1 RETURNING attempts',
      [id]
    );
    return res.rows.length ? Number(res.rows[0].attempts) : 0;
  }
  const rec = data.passwordResets[id];
  if (!rec) return 0;
  rec.attempts = Number(rec.attempts || 0) + 1;
  save();
  return rec.attempts;
}

async function deletePasswordReset(id) {
  if (pgLive()) {
    await pgPool.query('DELETE FROM password_resets WHERE id = $1', [id]);
    return;
  }
  if (data.passwordResets[id]) {
    delete data.passwordResets[id];
    save();
  }
}

// The right code was entered: retire it and attach the short-lived token that
// authorizes the actual password change.
async function markPasswordResetVerified(id, tokenHash, tokenTtlMs) {
  const tokenExpiresAt = Date.now() + tokenTtlMs;
  if (pgLive()) {
    await pgPool.query(
      'UPDATE password_resets SET token_hash = $1, token_expires_at = $2, code_hash = $3, attempts = 0 WHERE id = $4',
      [tokenHash, tokenExpiresAt, 'consumed', id]
    );
    return tokenExpiresAt;
  }
  const rec = data.passwordResets[id];
  if (!rec) return tokenExpiresAt;
  rec.tokenHash = tokenHash;
  rec.tokenExpiresAt = tokenExpiresAt;
  rec.codeHash = 'consumed'; // the OTP itself can never be replayed
  rec.attempts = 0;
  save();
  return tokenExpiresAt;
}

// Spends a verified reset token exactly once and returns whose account it was.
async function consumePasswordResetToken(tokenHash) {
  const now = Date.now();
  if (pgLive()) {
    // The UPDATE ... RETURNING is the single-use guarantee: two requests racing
    // with the same token both match the row, but only the first one finds it
    // unused, so only the first gets a row back.
    const res = await pgPool.query(
      `UPDATE password_resets SET used_at = $1
       WHERE token_hash = $2 AND used_at IS NULL AND token_expires_at > $1
       RETURNING username, email`,
      [now, tokenHash]
    );
    return res.rows.length ? { username: res.rows[0].username, email: res.rows[0].email } : null;
  }
  const rec = Object.values(data.passwordResets)
    .map(normalizeReset)
    .find((r) => r && r.tokenHash && r.tokenHash === tokenHash && !r.usedAt && r.tokenExpiresAt > now);
  if (!rec) return null;
  delete data.passwordResets[rec.id];
  save();
  return { username: rec.username, email: rec.email };
}

// --- Referrals ---------------------------------------------------------------
//
// A referral is only worth paying for once the invited person has actually had
// a conversation, so a claim starts unqualified and is settled later by
// qualifyReferral(). That ordering is the whole anti-abuse design: opening the
// link, or opening it in fifty incognito windows, earns nothing.

// Ambiguous glyphs are left out so a code read aloud on a call, or typed from a
// screenshot, cannot land on the wrong one.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function referralCodeFor(clientId) {
  if (!clientId) return '';
  const owner = data.referrals.owners[clientId];
  if (owner && owner.code) return owner.code;
  let code = '';
  for (let attempt = 0; attempt < 20; attempt++) {
    const bytes = crypto.randomBytes(7);
    code = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
    if (!data.referrals.codes[code]) break;
    code = '';
  }
  if (!code) return '';
  data.referrals.codes[code] = clientId;
  data.referrals.owners[clientId] = { code, joined: 0, qualified: 0, rewardedDays: 0, createdAt: Date.now() };
  save();
  return code;
}

function referralStats(clientId) {
  const owner = data.referrals.owners[clientId];
  return {
    code: (owner && owner.code) || '',
    joined: (owner && owner.joined) || 0,
    qualified: (owner && owner.qualified) || 0,
    rewardedDays: (owner && owner.rewardedDays) || 0,
  };
}

// Record that `clientId` arrived through `code`. Returns the owner's clientId
// when the claim is new and legitimate, else null.
function claimReferral(clientId, code) {
  if (!clientId || !code) return null;
  const owner = data.referrals.codes[String(code).toUpperCase()];
  // Self-referral is the obvious exploit: share your own link, open it, repeat.
  if (!owner || owner === clientId) return null;
  // First claim wins. Re-attributing an existing user to whoever last sent them
  // a link would let anyone farm rewards off people who already use the site.
  if (data.referrals.claims[clientId]) return null;
  data.referrals.claims[clientId] = { code: String(code).toUpperCase(), owner, ts: Date.now(), qualified: false };
  const rec = data.referrals.owners[owner];
  if (rec) rec.joined += 1;
  save();
  return owner;
}

// Settle a claim once the invited person has had a real conversation. Returns
// { owner, referred } the first time, null afterwards, so the caller pays each
// reward exactly once.
function qualifyReferral(clientId) {
  const claim = data.referrals.claims[clientId];
  if (!claim || claim.qualified) return null;
  claim.qualified = true;
  claim.qualifiedAt = Date.now();
  const rec = data.referrals.owners[claim.owner];
  if (rec) rec.qualified += 1;
  save();
  return { owner: claim.owner, referred: clientId };
}

function noteReferralReward(clientId, days) {
  const rec = data.referrals.owners[clientId];
  if (!rec) return;
  rec.rewardedDays = (rec.rewardedDays || 0) + days;
  save();
}

// --- Web push subscriptions --------------------------------------------------

const MAX_PUSH_PER_CLIENT = 5;

function savePushSubscription(clientId, sub, ua) {
  if (!clientId || !sub || !sub.endpoint) return;
  const list = data.push[clientId] || (data.push[clientId] = []);
  const existing = list.find((s) => s.endpoint === sub.endpoint);
  if (existing) {
    existing.keys = sub.keys;
    existing.failures = 0;
    existing.lastSeen = Date.now();
  } else {
    list.push({ endpoint: sub.endpoint, keys: sub.keys, ua: String(ua || '').slice(0, 120), createdAt: Date.now(), failures: 0 });
    // One person can legitimately have a phone, a laptop and a tablet
    // subscribed. Past that, the oldest is almost certainly a device they no
    // longer use, and an unbounded list would be pushed to forever.
    if (list.length > MAX_PUSH_PER_CLIENT) list.splice(0, list.length - MAX_PUSH_PER_CLIENT);
  }
  save();
}

function pushSubscriptions(clientId) {
  return (data.push[clientId] || []).slice();
}

function removePushSubscription(clientId, endpoint) {
  const list = data.push[clientId];
  if (!list) return;
  const next = list.filter((s) => s.endpoint !== endpoint);
  if (next.length) data.push[clientId] = next;
  else delete data.push[clientId];
  save();
}

function pushSubscriberCount() {
  return Object.keys(data.push).length;
}

// --- Durable social graph ("memories": friends + friend chats + blocks) ---
// index.js holds the live Maps; these take the already-serialized plain objects
// and persist them (debounced), keeping the store the single source of truth.
function saveSocial(social) {
  data.social = {
    friends: social.friends || {},
    friendChats: social.friendChats || {},
    blocks: social.blocks || {},
    chatHistory: social.chatHistory || {},
    // Pending requests and the in-app inbox (unread messages, call-back asks)
    // have to survive a deploy too: deploys are automatic on push, and losing
    // them made a friend request sent before one silently vanish.
    friendRequests: social.friendRequests || {},
    sentRequests: social.sentRequests || {},
    notifications: social.notifications || {},
    // Written by index.js all along but never kept here, so every friend's
    // "last seen" went blank on each deploy.
    lastSeen: social.lastSeen || {},
    // Who each person blocked, by name, so the block list can say who it is.
    blockMeta: social.blockMeta || {},
    // "Clear chat" is per person: the thread stays for the other side.
    chatClears: social.chatClears || {},
  };
  save();
}

// --- Admin / sessions / audit ---

function audit(action, ip, detail) {
  data.auditLog.unshift({ ts: Date.now(), ip: ip || '', action, detail: detail || '' });
  if (data.auditLog.length > MAX_AUDIT) data.auditLog.pop();
  save();
}

// Resolves once data is loaded; the server waits on this before listening so
// requests never see a half-initialized store.
const ready = (async () => {
  if (pgPool) {
    try {
      await connectPg(true);
    } catch (err) {
      backendStatus.error = String(err.message || err);
      pgUnreachable = true;
      // The database cannot be reached. The mirror on this volume is a copy
      // of what was last in it (every save writes the mirror first), so serve
      // it and keep saving to it, and push up when the database answers.
      // Without a usable mirror nothing here is anybody's real data, so
      // nothing is saved at all - see persistNow.
      const local = bootLocal();
      if (local && !mirrorBlocked) {
        applyParsed(local);
        runningOnMirror = true;
        backendStatus.mode = 'postgres-offline';
      } else {
        backendStatus.mode = 'postgres-unreachable';
      }
      console.error('[store] ============================================================');
      console.error('[store] DATABASE_URL is set but the database could not be reached.');
      console.error(runningOnMirror
        ? `[store] Serving and saving the copy in ${DATA_FILE}; it is pushed up`
        : '[store] There is no usable copy on this machine either, so NOTHING');
      console.error(runningOnMirror
        ? '[store] to the database automatically when it comes back.'
        : '[store] will be saved until the database answers. Retrying.');
      console.error('[store] Host:', backendStatus.host);
      console.error('[store] Reason:', backendStatus.error);
      console.error('[store] ============================================================');
      retryPg();
    }
  } else {
    loadFile();
  }
  // The baseline the wipe guard compares the first save against.
  lastCensus = census(data);
})();

// Reconnect attempts, backing off to a minute. connectPg decides which copy
// is newer, pushes the mirror up if it is, and leaves both identical.
function retryPg() {
  setTimeout(async () => {
    if (!pgUnreachable || !pgPool) return;
    try {
      await connectPg(false);
      backendStatus.persistBlocked = null;
      lastCensus = census(data);
      console.log('[store] the database is back - both copies are in step again.');
    } catch (err) {
      backendStatus.error = String(err.message || err);
      pgRetryDelay = Math.min(pgRetryDelay * 2, 60000);
      retryPg();
    }
  }, pgRetryDelay).unref();
}

// A plain exit cannot wait for the network, but the mirror is synchronous.
process.on('exit', () => { if (!shuttingDown && saveTimer) persistNow(); });

// 'exit' never fires for SIGTERM/SIGINT - and SIGTERM is exactly what Fly
// sends on every deploy/restart. Flush any debounced write before going down
// so a signup seconds before a deploy is never lost: the mirror first (it is
// instant), then wait for Postgres, but not past Fly's kill timeout.
let shuttingDown = false;
async function flushAndExit(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  // Same rule on the way out as on every other write: a document we never
  // successfully loaded must not be the last thing written over a good one.
  if (persistBlocked || (pgPool && pgUnreachable && !runningOnMirror)) {
    console.error(`[store] ${signal}: not saving -`, persistBlocked || 'no copy of the store is loaded');
    process.exit(0);
  }
  try {
    persistNow();
    await Promise.race([pgChain, new Promise((r) => setTimeout(r, 4000))]);
  } catch (err) {
    console.error(`[store] final save on ${signal} failed:`, err.message);
  }
  process.exit(0);
}
process.on('SIGTERM', () => flushAndExit('SIGTERM'));
process.on('SIGINT', () => flushAndExit('SIGINT'));

// A persistent random secret, created once and reused for the life of the
// store. Callers read it after `ready`.
function getOrCreateSecret(name) {
  if (!data.secrets) data.secrets = {};
  if (!data.secrets[name]) {
    data.secrets[name] = crypto.randomBytes(32).toString('hex');
    save();
  }
  return data.secrets[name];
}

module.exports = {
  // Resolves when every save queued so far has reached the database (or
  // failed and been kept on disk). Shutdown uses the same chain.
  whenPersisted: () => pgChain,
  getOrCreateSecret,
  get data() { return data; },
  get backendStatus() { return backendStatus; },
  ready,
  save,
  persistNow,
  dayKey,
  day,
  hour,
  recordVisit,
  visitorsLast24h,
  recordSection,
  recordConnection,
  recordPeakOnline,
  recordFeature,
  recordTopics,
  addTranscript,
  addReport,
  reportCountFor,
  addFeedback,
  addError,
  activeBans,
  findActiveBan,
  addBan,
  liftBan,
  upsertAccount,
  saveAccount,
  getAccountClientId,
  setAccountClientId,
  findUsernameByEmail,
  startPasswordReset,
  findPasswordReset,
  notePasswordResetFailure,
  deletePasswordReset,
  markPasswordResetVerified,
  consumePasswordResetToken,
  purgePasswordResets,
  createAuthSession,
  getAuthSessionUser,
  deleteAuthSession,
  deleteAuthSessionsForUser,
  saveSocial,
  setPremium,
  extendPremium,
  revokePremium,
  isPremiumClient,
  premiumExpiry,
  referralCodeFor,
  referralStats,
  claimReferral,
  qualifyReferral,
  noteReferralReward,
  savePushSubscription,
  pushSubscriptions,
  removePushSubscription,
  pushSubscriberCount,
  audit,
};
