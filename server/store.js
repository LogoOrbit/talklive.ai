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
const docJson = require('./doc-json');

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
let schemaReady = false;
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
    // { id, ts, username, country, text, clientId, account, reply }; reply is
    // the owner's answer: { text, ts, deliveredAt, seenAt } (see setFeedbackReply).
    feedback: [],
    // Owner-sent behaviour warnings, newest first: { id, ts, clientId, account,
    // username, country, reason, message, deliveredAt, acknowledgedAt,
    // withdrawnAt }. Re-shown on every visit until the person acknowledges it.
    warnings: [],
    errors: [], // { id, ts, source, message, stack, url, username, country, count }
    auditLog: [], // { ts, ip, action, detail }
    transcripts: [], // { ts, pair, from, fromClientId, to, toClientId, country, text, kind }
    // Transcripts not yet confirmed in the chat_transcripts table (Postgres
    // only; see addTranscript). Kept in the document so they survive a restart.
    transcriptQueue: [],
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
    social: { friends: {}, friendChats: {}, blocks: {}, chatHistory: {}, friendRequests: {}, sentRequests: {}, notifications: {}, lastSeen: {}, blockMeta: {}, chatClears: {}, declinedRequests: {}, mutedChats: {}, privacy: {}, voiceConsent: {} },
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
    // Cumulative talk time per person, for the owner's "who talks most" view:
    // clientId -> { username, country, seconds, calls, longest, lastAt,
    // days: { 'YYYY-MM-DD': { s, n } } }. `days` keeps the last TALK_DAYS so the
    // dashboard can re-cut the totals to today / 7 / 30 days.
    talkTime: {},
    // Mini-game analytics (see server/game-tracker.js). players: clientId ->
    // { username, country, firstAt, lastAt, t, days: { 'YYYY-MM-DD': t },
    // byGame: { ttt|dab: { r, s } } } where t is the counter set in
    // GAME_FIELDS. log: the newest finished game sessions, newest first.
    games: { players: {}, log: [] },
    // "Save contact info I share" (Settings > Privacy), opt-in per profile:
    // clientId -> { on, at }. Only the current choice is kept; turning it off
    // also deletes everything captured for that person.
    contactConsent: {},
    // Contact details found in the chat messages of people who opted in, for
    // the owner dashboard's Data tab: clientId -> { username, country,
    // updatedAt, items: [{ type, value, source, firstAt, lastAt, count }] }.
    contactCapture: {},
    // "Top 3 films" on a person's profile: clientId -> [{ t: 'movie'|'tv', id,
    // title, year, p }], where p is a TMDB poster path (the image itself is
    // served by TMDB's CDN, never by us). Titles and posters are resolved on
    // the server from TMDB, never taken from the client.
    favFilms: {},
    settings: {
      maintenance: { on: false, message: 'TalkLive is under maintenance. We will be back shortly!' },
      // The "still under development" strip on / and /chat, switched from the
      // dashboard. `since` changes on every switch-on, so visitors who closed
      // the last one see it again.
      devBanner: { on: true, since: 0 },
      // Site-wide switches on the dashboard's Settings tab. Read through
      // siteModes() in server/index.js, which fills in any key missing here.
      //   announce       owner-written strip at the top of / and /chat
      //   signupsPaused  no new accounts (password or Google); logins still work
      //   membersOnly    raid shield: only logged-in accounts can be matched
      //   voicePaused    voice calls off, text chat still matches
      modes: {
        announce: { on: false, text: '', since: 0 },
        signupsPaused: false,
        membersOnly: false,
        voicePaused: false,
      },
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
// Public friend ID -> usernameLower. Rebuilt from the accounts on every load.
let friendIdIndex = new Map();
// Chosen account IDs ("asad#1234", lowercase) -> usernameLower, and the
// profile (clientId) each account owns -> usernameLower, so anyone's public
// ID can be shown next to them. Both derived from the accounts, never stored.
let handleIndex = new Map();
let clientIdIndex = new Map();

function applyParsed(parsed) {
  data = { ...defaults(), ...parsed };
  data.transcriptQueue = Array.isArray(parsed.transcriptQueue) ? parsed.transcriptQueue : [];
  // A freshly loaded document holds its transcripts itself until they are
  // confirmed in the table again (syncTranscripts).
  transcriptsInTable = false;
  data.analytics = { ...defaults().analytics, ...(parsed.analytics || {}) };
  data.settings = { ...defaults().settings, ...(parsed.settings || {}) };
  data.social = { ...defaults().social, ...(parsed.social || {}) };
  data.referrals = { ...defaults().referrals, ...(parsed.referrals || {}) };
  data.push = parsed.push || {};
  data.talkTime = parsed.talkTime || {};
  data.games = { players: {}, log: [], ...(parsed.games || {}) };
  data.accounts = parsed.accounts || {};
  data.googleIndex = parsed.googleIndex || {};
  data.authSessions = parsed.authSessions || {};
  data.passwordResets = parsed.passwordResets || {};
  data.secrets = parsed.secrets || {};
  // Contact capture is opt-in: drop anything not backed by an explicit "on"
  // (e.g. data captured while it briefly defaulted to on).
  data.contactConsent = parsed.contactConsent || {};
  data.contactCapture = parsed.contactCapture || {};
  data.favFilms = parsed.favFilms || {};
  for (const [id, c] of Object.entries(data.contactConsent)) {
    if (!c || c.on !== true) delete data.contactConsent[id];
  }
  for (const id of Object.keys(data.contactCapture)) {
    if (!data.contactConsent[id]) delete data.contactCapture[id];
  }
  // Rebuild the email index from the accounts themselves rather than trusting
  // the stored copy: accounts written before recovery emails existed have no
  // index entry, and a rebuild keeps the two from ever drifting apart.
  data.emailIndex = {};
  for (const [usernameLower, acc] of Object.entries(data.accounts)) {
    if (acc && acc.email) data.emailIndex[String(acc.email).toLowerCase()] = usernameLower;
  }
  // Same for the public friend IDs: derived from the accounts, never stored.
  friendIdIndex = new Map();
  handleIndex = new Map();
  clientIdIndex = new Map();
  for (const [usernameLower, acc] of Object.entries(data.accounts)) {
    if (acc && acc.friendId) friendIdIndex.set(acc.friendId, usernameLower);
    if (acc && acc.handle) handleIndex.set(String(acc.handle).toLowerCase(), usernameLower);
    if (acc && acc.clientId) clientIdIndex.set(acc.clientId, usernameLower);
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
  // What already exists, in one cheap catalog read. ALTER TABLE ... ENABLE ROW
  // LEVEL SECURITY and ADD COLUMN take an exclusive lock even when there is
  // nothing to change, so on a slow database a fresh boot queued behind the
  // previous process's in-flight query and every other query queued behind
  // it (2026-10-02). Statements whose effect is already in place are skipped.
  const st = (await pgPool.query(`SELECT
    (SELECT coalesce(json_object_agg(c.relname, c.relrowsecurity), '{}'::json) FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = current_schema() AND c.relkind = 'r') AS tables,
    (SELECT coalesce(json_agg(c.relname), '[]'::json) FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = current_schema() AND c.relkind = 'i') AS indexes,
    (SELECT count(*) FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'voice_notes'
        AND column_name IN ('from_name', 'to_client', 'to_name', 'transcript', 'tags'))::int AS vn_cols`)).rows[0];
  const tables = st.tables || {};
  const indexes = new Set(st.indexes || []);
  const enableRls = async (t) => {
    if (tables[t] === true) return;
    try { await pgPool.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`); } catch (_) { /* not the owner */ }
  };
  const createIndex = async (name, sql) => {
    if (!indexes.has(name)) await pgPool.query(sql);
  };
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
  for (const t of ['owner_store', 'owner_store_history']) await enableRls(t);
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
  await createIndex('password_resets_email_idx', 'CREATE INDEX IF NOT EXISTS password_resets_email_idx ON password_resets (email)');
  await createIndex('password_resets_token_idx', 'CREATE INDEX IF NOT EXISTS password_resets_token_idx ON password_resets (token_hash)');
  // Reset codes are as sensitive as the store: closed to Supabase's public API
  // like the other tables (the server's own login owns the table).
  await enableRls('password_resets');
  // Friend voice notes: binary clips kept out of the document, which is
  // rewritten whole on every save. Additive only - a failure here disables
  // voice notes and must never be the reason the store fails to connect.
  try {
    await pgPool.query(`CREATE TABLE IF NOT EXISTS voice_notes (
      id text PRIMARY KEY,
      pair text NOT NULL,
      from_client text NOT NULL,
      mime text NOT NULL,
      duration_ms integer NOT NULL,
      bytes bytea NOT NULL,
      created_at bigint NOT NULL
    )`);
    // Moderation metadata, added after the table first shipped. ADD COLUMN IF
    // NOT EXISTS only ever adds; it never touches rows already stored.
    if (st.vn_cols < 5) await pgPool.query(`ALTER TABLE voice_notes
      ADD COLUMN IF NOT EXISTS from_name text,
      ADD COLUMN IF NOT EXISTS to_client text,
      ADD COLUMN IF NOT EXISTS to_name text,
      ADD COLUMN IF NOT EXISTS transcript text,
      ADD COLUMN IF NOT EXISTS tags jsonb`);
    await createIndex('voice_notes_created_idx', 'CREATE INDEX IF NOT EXISTS voice_notes_created_idx ON voice_notes (created_at DESC)');
    await enableRls('voice_notes');
  } catch (err) {
    console.error('[store] voice_notes table unavailable:', err.message);
  }
  // Text-chat transcripts: the largest part of the document (5000 messages,
  // ~1.6MB) and the one that changes on every chat message. Additive only - if
  // this fails, transcripts simply stay in the document as before.
  try {
    await pgPool.query(`CREATE TABLE IF NOT EXISTS chat_transcripts (
      id text PRIMARY KEY,
      ts bigint NOT NULL,
      doc jsonb NOT NULL
    )`);
    await createIndex('chat_transcripts_ts_idx', 'CREATE INDEX IF NOT EXISTS chat_transcripts_ts_idx ON chat_transcripts (ts DESC)');
    await enableRls('chat_transcripts');
  } catch (err) {
    console.error('[store] chat_transcripts table unavailable:', err.message);
  }
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

// Anything at all worth keeping, including the owner's side: isEmptyDoc plus
// the dashboard - login, visitor stats, reports, feedback, errors.
function hasAnything(doc) {
  if (!isEmptyDoc(doc)) return true;
  const a = (doc && doc.analytics) || {};
  return !!(doc && (doc.admin
    || (a.totals && a.totals.visits > 0)
    || Object.keys(a.days || {}).length
    || (doc.reports || []).length
    || (doc.feedback || []).length
    || (doc.errors || []).length));
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
  // Our side is only nothing if it has no owner dashboard either - an owner
  // login, visitor stats, reports and feedback are data too, and a store
  // holding only those must still win over an empty database rather than be
  // replaced by it.
  if (!hasAnything(local)) return 'use-pg';
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
// Set when boot stops waiting for a database that connects but does not answer
// (see ready below). The boot attempt may still finish later; it must then
// change nothing, because the server is already serving the mirror and the
// retry loop owns reconciling the two copies.
let bootAbandoned = false;
// The server does not listen until this resolves, so every second here is a
// second of outage on each deploy. A full connect from Fly (iad) to Supabase
// (ap-south-1) with a ~5MB document can take a minute, and waiting 60s on
// 2026-10-01 meant ~60s of downtime per deploy. The mirror on the volume is
// written before Postgres on every save (single machine), so it is never
// behind: boot on it quickly and let the background reconnect push it up.
const PG_BOOT_TIMEOUT_MS = Number(process.env.PG_BOOT_TIMEOUT_MS) || 10000;
// With no copy on the volume (a new machine, a new region) there is nothing
// to serve but an empty store, which is worse than waiting: wait for the
// database much longer. Fly's deploy health wait is 5 minutes.
const PG_BOOT_TIMEOUT_NO_COPY_MS = Number(process.env.PG_BOOT_TIMEOUT_NO_COPY_MS) || 4 * 60 * 1000;

async function connectPg(atBoot) {
  const giveUpIfAbandoned = () => {
    if (atBoot && bootAbandoned) throw new Error('boot stopped waiting for the database');
  };
  // Which database user and which schema the unqualified table names below
  // resolve to. They depend on the login in DATABASE_URL: a role with its own
  // search_path reads and writes a different owner_store from the default
  // `postgres` login, in the same database, with nothing to say so. That is
  // how a month of data sat in talklive_private while public looked empty.
  const who = await pgPool.query('SELECT current_user AS u, current_schema() AS s');
  backendStatus.dbUser = who.rows[0].u;
  backendStatus.dbSchema = who.rows[0].s;
  console.log(`[store] database login ${backendStatus.dbUser}, schema ${backendStatus.dbSchema}`);
  // A dozen statements, some taking table locks: once per process is enough,
  // not once per reconnect attempt against a database that is already slow.
  if (!schemaReady) {
    await ensureSchema();
    schemaReady = true;
  }
  const local = atBoot ? bootLocal() : (runningOnMirror ? data : null);
  // Read the version stamp first. When the database holds an older version of
  // the same history - the usual case after an outage or a restart - that is
  // all the decision needs, and the ~12MB document is not downloaded at all.
  const metaRes = await pgPool.query(`SELECT doc->'_meta' AS meta FROM owner_store WHERE id = 1`);
  giveUpIfAbandoned();
  const pgMeta = metaRes.rows.length ? (metaRes.rows[0].meta || {}) : null;
  let pgDoc;
  let verdict;
  if (pgMeta && hasAnything(local) && pgMeta.lineage && pgMeta.lineage === lineageOf(local)
      && revOf(local) > (Number(pgMeta.rev) || 0)) {
    verdict = 'push-local';
  } else {
    const res = await pgPool.query('SELECT doc FROM owner_store WHERE id = 1');
    giveUpIfAbandoned();
    pgDoc = res.rows.length ? res.rows[0].doc : null;
    verdict = decide(pgDoc, local);
  }
  const n = (o) => Object.keys(o || {}).length;

  backendStatus.seededFromFile = false;
  // The version this call leaves in Postgres. While the app is serving the
  // mirror it keeps saving during the awaits below, which moves `data` on, so
  // checks must compare against what was sent, not against `data`.
  let confirmedRev = 0;

  if (verdict === 'push-local') {
    if (atBoot) applyParsed(local);
    stampMeta();
    const sent = JSON.stringify(data);
    confirmedRev = revOf(data);
    const counts = {
      accounts: n(data.accounts),
      friends: n((data.social || {}).friends),
      chats: n((data.social || {}).friendChats),
      sessions: n(data.authSessions),
    };
    await pgPool.query(
      'INSERT INTO owner_store (id, doc, updated_at) VALUES (1, $1, now()) ON CONFLICT (id) DO UPDATE SET doc = $1, updated_at = now()',
      [sent]
    );
    // Read it back: this is the one moment the data exists in a place nobody
    // has checked yet. The version stamp is enough to prove the write landed.
    const back = await pgPool.query(`SELECT doc->'_meta'->>'rev' AS rev FROM owner_store WHERE id = 1`);
    giveUpIfAbandoned();
    if (!back.rows.length || Number(back.rows[0].rev) !== confirmedRev) {
      throw new Error('wrote the store to Postgres but read back a different version');
    }
    // pgDoc is only fetched when the version stamp could not decide alone.
    const fresh = pgDoc !== undefined && isEmptyDoc(pgDoc);
    backendStatus.seededFromFile = fresh;
    console.log('[store] ------------------------------------------------------------');
    console.log(fresh
      ? `[store] FIRST RUN ON POSTGRES - copied the store up from ${DATA_FILE}`
      : '[store] Postgres was behind the mirror - brought it up to date');
    console.log('[store]  accounts:', counts.accounts,
      '· people with friends:', counts.friends,
      '· friend chats:', counts.chats,
      '· logged-in sessions:', counts.sessions);
    console.log('[store] ------------------------------------------------------------');
  } else if (verdict === 'conflict') {
    await pgHistory('conflict', local);
    giveUpIfAbandoned();
    preserveConflict(local, 'the mirror and the database hold different histories');
    applyParsed(pgDoc);
  } else {
    applyParsed(pgDoc || {});
  }

  pgConfirmedRev = confirmedRev || revOf(data);
  pgUnreachable = false;
  runningOnMirror = false;
  pgConflict = false;
  backendStatus.mode = 'postgres';
  backendStatus.error = null;
  // From here the mirror holds the database copy, plus any saves made while
  // the push above was in flight; the next save sends those up.
  writeMirror();
  if (revOf(data) !== pgConfirmedRev) save();
  if (!(!atBoot && verdict !== 'push-local')) syncTranscripts();
  console.log('[store] using Postgres backend (DATABASE_URL) -', backendStatus.host,
    '- mirrored to', DATA_FILE);

  // A reconnect that swapped in the database copy leaves index.js holding the
  // accounts and social graph it loaded at boot from the other copy, and the
  // next save writes those back over what was just loaded. On 2026-10-01 that
  // replaced 775 people's friends with the 4 made during the outage. Every
  // in-memory view is built at boot, so boot again: exit non-zero and Fly
  // restarts the machine, which then loads the database copy everywhere.
  if (!atBoot && verdict !== 'push-local') {
    restarting = true;
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    if (pgTimer) { clearTimeout(pgTimer); pgTimer = null; }
    console.error('[store] the database copy replaced the one being served -',
      'restarting so the whole app reloads from it');
    setImmediate(() => process.exit(1));
  }
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

// Routine saves serialize only the friend chats and match histories that
// changed (server/doc-json.js) and write the file in the background; every
// FULL_SAVE_EVERY_MS, and on every explicit save (admin actions, shutdown,
// crash, reconnect), the whole document is serialized fresh and written
// synchronously, exactly as before.
const FULL_SAVE_EVERY_MS = 60 * 1000;
let lastFullSaveAt = 0;
let socialCaches = null;
function serializeData(full) {
  if (full || !socialCaches) lastFullSaveAt = Date.now();
  const s = docJson.serialize(data, 'social', socialCaches, full || !socialCaches);
  if (socialCaches) {
    const misses = socialCaches.friendChats.misses + socialCaches.chatHistory.misses;
    if (misses && misses !== backendStatus.saveCacheMisses) {
      console.error('[store] fast save reused', misses, 'stale chat list(s) - a full save corrected them; a change is not being tracked');
    }
    backendStatus.saveCacheMisses = misses;
  }
  return s;
}

// Every mirror write takes a sequence number, and a file only replaces the
// live one if nothing newer has been renamed into place first - so a slow
// background write can never put an older document over a newer one.
let mirrorPrimed = false;
let mirrorSeq = 0;
let mirrorDoneSeq = 0;
let mirrorBusy = false;
let mirrorAgain = false;
function writeMirror(shrinking, background) {
  if (mirrorBlocked) return false;
  const full = !background || Date.now() - lastFullSaveAt >= FULL_SAVE_EVERY_MS;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    // Whatever was on disk before this process first writes is kept as a
    // snapshot - it may be a store from an earlier life of the app - and so
    // is the previous state ahead of any save the wipe guard flagged.
    if ((!mirrorPrimed || shrinking) && fs.existsSync(DATA_FILE)) writeBackup();
    if (!mirrorPrimed) {
      // Half-written background files left by a hard kill.
      const base = path.basename(DATA_FILE) + '.tmp-';
      for (const f of fs.readdirSync(DATA_DIR)) {
        if (f.startsWith(base)) fs.unlink(path.join(DATA_DIR, f), () => {});
      }
    }
    mirrorPrimed = true;
    if (background && !shrinking) {
      // One background write at a time; a save that lands meanwhile is
      // written once this one finishes, with whatever `data` is by then.
      if (mirrorBusy) { mirrorAgain = true; return true; }
      const seq = ++mirrorSeq;
      const tmp = `${DATA_FILE}.tmp-${process.pid}-${seq}`;
      const payload = serializeData(full);
      mirrorBusy = true;
      fs.promises.writeFile(tmp, payload)
        .then(() => {
          if (seq > mirrorDoneSeq) {
            fs.renameSync(tmp, DATA_FILE);
            mirrorDoneSeq = seq;
            if (Date.now() - lastBackupAt >= BACKUP_EVERY_MS) writeBackup();
          } else {
            fs.unlink(tmp, () => {});
          }
        })
        .catch((err) => {
          console.error('[store] failed to save to disk:', err.message);
          fs.unlink(tmp, () => {});
        })
        .finally(() => {
          mirrorBusy = false;
          if (mirrorAgain) { mirrorAgain = false; save(); }
        });
      return true;
    }
    const seq = ++mirrorSeq;
    const tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, serializeData(true));
    fs.renameSync(tmp, DATA_FILE);
    mirrorDoneSeq = seq;
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

// Every Postgres save rewrites the whole document (megabytes, plus WAL), so
// routine saves reach Postgres at most this often; the mirror on disk still
// takes every one. Boot pushes a newer mirror up, so a hard kill inside the
// window loses nothing. Explicit persistNow() calls (admin actions, shutdown,
// crash) still write through immediately.
//
// 15 minutes, not 1: each save sends the whole document (~12MB of JSON) out of
// Fly, and in September 2026 that was 874GB of egress - $17.49 of a $21.36
// bill. Every change still lands on the volume within seconds, shutdown still
// sends a final save, and boot pushes a newer volume copy up, so this only
// matters if the volume itself is destroyed.
const PG_SAVE_EVERY_MS = Math.max(0, Number(process.env.PG_SAVE_EVERY_MS) || 15 * 60 * 1000);
let lastPgSaveAt = 0;
let pgTimer = null;
function persistPgThrottled() {
  if (pgTimer) return;
  const wait = lastPgSaveAt + PG_SAVE_EVERY_MS - Date.now();
  if (wait <= 0) { lastPgSaveAt = Date.now(); persistPg(); return; }
  pgTimer = setTimeout(() => {
    pgTimer = null;
    lastPgSaveAt = Date.now();
    if (pgLive()) persistPg();
  }, wait);
  pgTimer.unref?.();
}

// Nothing is written until the store has loaded. Until then `data` is the
// empty default document, and code that runs during a slow boot (timers,
// module setup) used to save it over the mirror - on 2026-10-01 that left the
// volume holding an empty store while Postgres hung. Changes made before the
// load are discarded by the load anyway.
let storeLoaded = false;
let saveAfterLoad = false;
// Set when this process is about to exit to reload from the database; nothing
// it holds in memory may be written after that.
let restarting = false;

function persistNow(throttlePg) {
  // Everything is being written now, so a debounced save already queued has
  // nothing left to do.
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (restarting) return;
  if (!storeLoaded) { saveAfterLoad = true; return; }
  if (!throttlePg && pgTimer) { clearTimeout(pgTimer); pgTimer = null; }
  // The load failed, so `data` is not the real document. Writing it is exactly
  // the destructive act this guard exists to prevent.
  if (persistBlocked) return;
  // DATABASE_URL set, database unreachable, and no mirror to serve from: what
  // is in memory is not anybody's data, so it goes nowhere.
  if (pgPool && pgUnreachable && !runningOnMirror) return;
  materializeSocial();
  stampMeta();
  const shrinking = checkShrink();
  if (shrinking) pendingShrinkSnapshot = true;
  writeMirror(shrinking, throttlePg);
  if (!pgLive()) return;
  if (throttlePg && !shrinking) persistPgThrottled();
  else { lastPgSaveAt = Date.now(); persistPg(); }
}

function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    persistNow(true);
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
      // Traffic attribution (server/traffic.js): path -> human page views,
      // and for arrivals from outside the site: source, medium, landing page,
      // "source → page", and search term (+ "term → page") when one is known.
      pages: {},
      sources: {},
      mediums: {},
      landings: {},
      sourcePages: {},
      searchTerms: {},
      termPages: {},
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
      if (d && d.peopleSet) delete d.peopleSet;
      if (d && d.registeredSet) delete d.registeredSet;
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

// Distinct keys a day may hold per traffic map. Paths, referring domains and
// search terms all come from requests, so each map is capped; anything past
// the cap is counted under "(other)" rather than dropped or left to grow.
const TRAFFIC_KEY_CAP = { pages: 300, sources: 150, mediums: 20, landings: 300, sourcePages: 400, searchTerms: 400, termPages: 400 };

function bumpTraffic(d, field, key) {
  if (!key) return;
  if (!d[field]) d[field] = {};
  const map = d[field];
  if (map[key] === undefined && Object.keys(map).length >= (TRAFFIC_KEY_CAP[field] || 300)) key = '(other)';
  map[key] = (map[key] || 0) + 1;
}

// One human page view of `path` (every page, not only arrivals).
function recordPageView(path) {
  bumpTraffic(day(), 'pages', path);
  save();
}

/*
 * One arrival from outside the site (see server/traffic.js): which source and
 * medium sent the visitor, the page they landed on, and the search term when
 * the referrer carried one. Aggregate counts only - nothing about who.
 */
function recordArrival({ source, medium, term, path }) {
  const d = day();
  bumpTraffic(d, 'sources', source);
  bumpTraffic(d, 'mediums', medium);
  bumpTraffic(d, 'landings', path);
  bumpTraffic(d, 'sourcePages', `${source} \u2192 ${path}`);
  if (term) {
    bumpTraffic(d, 'searchTerms', term);
    bumpTraffic(d, 'termPages', `${term} \u2192 ${path}`);
  }
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

// A signed-in account seen today, counted once per UTC day (the Daily log's
// "registered" column). Only a hash of the username is kept, and only for the
// last UNIQUE_SET_DAYS days.
function recordSignedIn(usernameLower) {
  if (!usernameLower) return;
  const d = day();
  const set = d.registeredSet || (d.registeredSet = {});
  const h = crypto.createHash('sha256').update('talklive-rg:' + usernameLower).digest('hex').slice(0, 12);
  if (set[h]) return;
  set[h] = 1;
  d.registered = (d.registered || 0) + 1;
  save();
}

// --- Audience & experience (see server/audience.js) ---------------------------

const MAX_INTEREST_KEYS = 200;

function emptyPeople() {
  return { n: 0, gender: {}, age: {}, cross: {}, device: {}, os: {}, browser: {}, lang: {}, lifecycle: {}, interests: {} };
}

function emptyCalls() {
  return { n: 0, s: 0, len: {}, pairs: {}, waitN: 0, waitS: 0, wait: {}, abandonN: 0, abandonS: 0, up: 0, down: 0, rateLen: {}, seg: { gender: {}, age: {} } };
}

function bump(obj, key, by = 1) {
  obj[key] = (obj[key] || 0) + by;
  if (obj[key] <= 0) delete obj[key];
}

/**
 * Count a person once per UTC day for the audience breakdown. `info` is
 * { gender, age, device, os, browser, lang, lifecycle, interests }, already
 * normalised. A person who changes gender or age group later the same day is
 * moved, not double-counted: the day's set remembers what they were counted as.
 */
function recordPerson(clientId, info) {
  if (!clientId) return;
  const d = day();
  const p = d.people || (d.people = emptyPeople());
  const set = d.peopleSet || (d.peopleSet = {});
  const h = crypto.createHash('sha256').update('talklive-pp:' + clientId).digest('hex').slice(0, 12);
  const key = info.gender + '|' + info.age;
  const prev = set[h];
  if (prev === key) return;
  if (prev) {
    const [pg, pa] = prev.split('|');
    bump(p.gender, pg, -1); bump(p.age, pa, -1); bump(p.cross, prev, -1);
  } else {
    p.n += 1;
    for (const f of ['device', 'os', 'browser', 'lang', 'lifecycle']) if (info[f]) bump(p[f], info[f]);
    for (const i of info.interests || []) {
      if (p.interests[i] || Object.keys(p.interests).length < MAX_INTEREST_KEYS) bump(p.interests, i);
    }
  }
  set[h] = key;
  bump(p.gender, info.gender); bump(p.age, info.age); bump(p.cross, key);
  save();
}

function dayCalls() {
  const d = day();
  return d.calls || (d.calls = emptyCalls());
}

/*
 * Call quality, as each browser measured it during a voice call (see
 * reportCallQuality in public/app.js): sums for averages, plus a three-way
 * verdict per call. Daily, like everything else here, and anonymous.
 */
function recordCallQuality({ rttMs, lossPct, jitterMs, poorShare, relay }) {
  const d = day();
  const q = d.quality || (d.quality = { n: 0, rtt: 0, rttN: 0, loss: 0, jit: 0, jitN: 0, relay: 0, good: 0, fair: 0, poor: 0 });
  q.n += 1;
  if (rttMs != null) { q.rtt += rttMs; q.rttN += 1; }
  q.loss += lossPct;
  if (jitterMs != null) { q.jit += jitterMs; q.jitN += 1; }
  if (relay) q.relay += 1;
  const verdict = poorShare > 0.25 || lossPct > 5 || (rttMs != null && rttMs > 500) ? 'poor'
    : (lossPct > 2 || (rttMs != null && rttMs > 300) ? 'fair' : 'good');
  q[verdict] += 1;
  save();
}

function callQualityReport(days = 30) {
  const keys = Object.keys(data.analytics.days).sort().slice(-days);
  const sum = { n: 0, rtt: 0, rttN: 0, loss: 0, jit: 0, jitN: 0, relay: 0, good: 0, fair: 0, poor: 0 };
  const daily = [];
  for (const k of keys) {
    const q = data.analytics.days[k].quality;
    if (!q) continue;
    for (const f of Object.keys(sum)) sum[f] += q[f] || 0;
    daily.push({ day: k, calls: q.n, poorPct: q.n ? Math.round((q.poor / q.n) * 1000) / 10 : 0, rttMs: q.rttN ? Math.round(q.rtt / q.rttN) : null, lossPct: q.n ? Math.round((q.loss / q.n) * 100) / 100 : 0 });
  }
  return {
    days,
    calls: sum.n,
    avgRttMs: sum.rttN ? Math.round(sum.rtt / sum.rttN) : null,
    avgLossPct: sum.n ? Math.round((sum.loss / sum.n) * 100) / 100 : null,
    avgJitterMs: sum.jitN ? Math.round(sum.jit / sum.jitN) : null,
    relayPct: sum.n ? Math.round((sum.relay / sum.n) * 1000) / 10 : null,
    verdicts: { good: sum.good, fair: sum.fair, poor: sum.poor },
    daily,
  };
}

/**
 * One finished conversation. `sides` is [{ gender, age }, { gender, age }];
 * each participant's segment gets the call, so "how long do women's calls
 * last" can be read straight off the day.
 */
function recordCallEnd({ seconds, lenBucket, pair, sides, real }) {
  const c = dayCalls();
  c.n += 1;
  c.s += seconds;
  bump(c.len, lenBucket);
  bump(c.pairs, pair);
  for (const s of sides || []) {
    for (const [dim, k] of [['gender', s.gender], ['age', s.age]]) {
      const seg = c.seg[dim][k] || (c.seg[dim][k] = { n: 0, s: 0, real: 0, up: 0, down: 0 });
      seg.n += 1;
      seg.s += seconds;
      if (real) seg.real += 1;
    }
  }
  save();
}

// How long a person waited in the queue before being matched.
function recordWait(seconds, bucket) {
  const c = dayCalls();
  c.waitN += 1;
  c.waitS += seconds;
  bump(c.wait, bucket);
  save();
}

// A search that ended with the person leaving before anyone was found.
function recordQueueAbandon(seconds) {
  const c = dayCalls();
  c.abandonN += 1;
  c.abandonS += seconds;
  save();
}

// A post-call thumbs up/down, attributed to the rater's segment and the
// length of the call it was about.
function recordRating(up, { gender, age, lenBucket }) {
  const c = dayCalls();
  const f = up ? 'up' : 'down';
  c[f] += 1;
  const rl = c.rateLen[lenBucket] || (c.rateLen[lenBucket] = { up: 0, down: 0 });
  rl[f] += 1;
  for (const [dim, k] of [['gender', gender], ['age', age]]) {
    const seg = c.seg[dim][k] || (c.seg[dim][k] = { n: 0, s: 0, real: 0, up: 0, down: 0 });
    seg[f] += 1;
  }
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
//
// With DATABASE_URL set they live in the chat_transcripts table instead of the
// document, which is rewritten whole on every save: at 5000 messages they were
// a third of it, and the part that changed with every chat message.
// `data.transcripts` stays the newest-first list the owner dashboard reads; in
// table mode it is a non-enumerable cache, so the document never serializes
// it. A new message waits in `data.transcriptQueue` (which is saved) until the
// table has it. Row ids are derived from the message, so a retried insert can
// never duplicate one.
const MAX_TRANSCRIPT = 5000;
const MAX_TRANSCRIPT_QUEUE = 5000;
// --- Contact capture (opt-in) -----------------------------------------------
// See contactConsent / contactCapture in defaults(). Nothing is captured for a
// profile without a current "on" consent, and withdrawing it erases the data.
const MAX_CAPTURED_PER_USER = 100;

function hasContactConsent(clientId) {
  const c = clientId && data.contactConsent[clientId];
  return !!(c && c.on);
}

function setContactConsent(clientId, on) {
  if (!clientId) return;
  if (on) data.contactConsent[clientId] = { on: true, at: Date.now() };
  else {
    delete data.contactConsent[clientId];
    delete data.contactCapture[clientId];
  }
  save();
}

// --- Favourite films --------------------------------------------------------
function getFavFilms(clientId) {
  return (clientId && data.favFilms[clientId]) || [];
}

function setFavFilms(clientId, films) {
  if (!clientId) return;
  if (films && films.length) data.favFilms[clientId] = films;
  else delete data.favFilms[clientId];
  save();
}

// items: [{ type, value }] from contact-capture.js. Returns how many were new.
function recordContacts(clientId, meta, items, source) {
  if (!hasContactConsent(clientId) || !items || !items.length) return 0;
  const now = Date.now();
  let rec = data.contactCapture[clientId];
  if (!rec) rec = data.contactCapture[clientId] = { username: '', country: '', updatedAt: now, items: [] };
  if (meta.username) rec.username = meta.username;
  if (meta.country) rec.country = meta.country;
  rec.updatedAt = now;
  let added = 0;
  for (const { type, value } of items) {
    const hit = rec.items.find((x) => x.type === type && x.value === value);
    if (hit) { hit.lastAt = now; hit.count++; continue; }
    rec.items.unshift({ type, value, source: source || 'chat', firstAt: now, lastAt: now, count: 1 });
    added++;
  }
  if (rec.items.length > MAX_CAPTURED_PER_USER) rec.items.length = MAX_CAPTURED_PER_USER;
  save();
  return added;
}

// Removes one captured item, or (no type/value) everything for that person.
function deleteCapturedContact(clientId, type, value) {
  const rec = data.contactCapture[clientId];
  if (!rec) return false;
  if (!type) delete data.contactCapture[clientId];
  else {
    const before = rec.items.length;
    rec.items = rec.items.filter((x) => !(x.type === type && x.value === value));
    if (rec.items.length === before) return false;
    if (!rec.items.length) delete data.contactCapture[clientId];
  }
  save();
  return true;
}

let transcriptsInTable = false;
let transcriptAdds = 0;
function addTranscript(entry) {
  const row = { ts: Date.now(), ...entry };
  transcriptAdds += 1;
  data.transcripts.unshift(row);
  if (data.transcripts.length > MAX_TRANSCRIPT) data.transcripts.pop();
  if (transcriptsInTable) {
    data.transcriptQueue.push(row);
    if (data.transcriptQueue.length > MAX_TRANSCRIPT_QUEUE) data.transcriptQueue.shift();
    scheduleTranscriptFlush();
  }
  save();
}

const transcriptId = (row) => 't' + crypto.createHash('sha1').update(JSON.stringify(row)).digest('hex').slice(0, 24);

async function insertTranscriptRows(rows) {
  if (!rows.length) return;
  const payload = rows.map((r) => ({ id: transcriptId(r), ts: Number(r.ts) || 0, doc: r }));
  await pgPool.query(
    `INSERT INTO chat_transcripts (id, ts, doc)
     SELECT e->>'id', (e->>'ts')::bigint, e->'doc' FROM jsonb_array_elements($1::jsonb) e
     ON CONFLICT (id) DO NOTHING`,
    [JSON.stringify(payload)]
  );
}

// Move whatever the document holds into the table, then serve the table's
// newest messages. Runs after every successful connect; a no-op once done.
let transcriptSync = null;
function syncTranscripts() {
  if (!pgLive() || transcriptsInTable || restarting) return Promise.resolve();
  if (transcriptSync) return transcriptSync;
  transcriptSync = (async () => {
    const docRef = data;
    const addsBefore = transcriptAdds;
    const legacy = data.transcripts.slice();
    const queued = data.transcriptQueue.slice();
    await insertTranscriptRows([...legacy, ...queued]);
    const res = await pgPool.query(
      `SELECT doc FROM chat_transcripts ORDER BY ts DESC, id DESC LIMIT ${MAX_TRANSCRIPT}`
    );
    // The document was replaced while this ran (a reconnect swapped it, and
    // the process is restarting): leave the new one alone.
    if (data !== docRef || restarting) return;
    // Messages that arrived during the awaits are at the front of the list
    // and not in the table yet.
    const arrived = data.transcripts.slice(0, Math.min(transcriptAdds - addsBefore, data.transcripts.length));
    const done = new Set(queued);
    data.transcriptQueue = data.transcriptQueue.filter((r) => !done.has(r)).concat(arrived);
    const list = [...arrived, ...res.rows.map((r) => r.doc)].slice(0, MAX_TRANSCRIPT);
    Object.defineProperty(data, 'transcripts', { value: list, writable: true, enumerable: false, configurable: true });
    transcriptsInTable = true;
    console.log(`[store] chat transcripts are in their own table (${list.length} loaded`
      + (legacy.length ? `, ${legacy.length} moved out of the document` : '') + ')');
    // The next save writes the document without them.
    if (legacy.length) save();
    if (data.transcriptQueue.length) scheduleTranscriptFlush();
  })().catch((err) => {
    console.error('[store] chat transcripts stay in the document for now:', err.message);
  }).finally(() => { transcriptSync = null; });
  return transcriptSync;
}

let transcriptFlushTimer = null;
let transcriptFlushing = false;
let lastTranscriptPruneAt = 0;
function scheduleTranscriptFlush(delay = 1000) {
  if (transcriptFlushTimer) return;
  transcriptFlushTimer = setTimeout(flushTranscripts, delay);
  transcriptFlushTimer.unref?.();
}
async function flushTranscripts() {
  transcriptFlushTimer = null;
  if (transcriptFlushing || !transcriptsInTable || restarting) return;
  if (!pgLive()) { if (data.transcriptQueue.length) scheduleTranscriptFlush(30000); return; }
  const batch = data.transcriptQueue.slice(0, 500);
  if (!batch.length) return;
  transcriptFlushing = true;
  let retry = 1000;
  try {
    await insertTranscriptRows(batch);
    const done = new Set(batch);
    // Dropped from the saved queue by the next ordinary save; if that never
    // comes, a re-insert after restart is a no-op thanks to the ids.
    data.transcriptQueue = data.transcriptQueue.filter((r) => !done.has(r));
    if (Date.now() - lastTranscriptPruneAt > 10 * 60 * 1000) {
      lastTranscriptPruneAt = Date.now();
      await pgPool.query(`DELETE FROM chat_transcripts WHERE ts < (
        SELECT ts FROM chat_transcripts ORDER BY ts DESC OFFSET ${MAX_TRANSCRIPT - 1} LIMIT 1)`);
    }
  } catch (err) {
    console.error('[store] chat transcript insert failed (kept for retry):', err.message);
    retry = 30000;
  } finally {
    transcriptFlushing = false;
    if (data.transcriptQueue.length) scheduleTranscriptFlush(retry);
  }
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

// clientId -> report count in one pass, for callers that need the count of
// many users at once (the dashboard's online list and report table) and would
// otherwise rescan every report per row.
function reportCounts() {
  const out = new Map();
  for (const r of data.reports) {
    const id = r.reported && r.reported.clientId;
    if (id) out.set(id, (out.get(id) || 0) + 1);
  }
  return out;
}

// The people reported most often since `since` (ms epoch, 0 = all on record),
// one row per reported clientId, most reports first. Reports are stored newest
// first, so the first one seen for a person normally carries their latest name.
function topReported({ since = 0, limit = 100 } = {}) {
  const byId = new Map();
  for (const r of data.reports) {
    if (r.ts < since) continue;
    const t = r.reported;
    if (!t || !t.clientId) continue;
    let row = byId.get(t.clientId);
    if (!row) {
      row = {
        clientId: t.clientId, username: t.username || '', country: t.country || '', city: t.city || '', ip: t.ip || '',
        count: 0, open: 0, lastTs: r.ts, firstTs: r.ts, reasons: {}, reporters: new Set(), latestDetail: '',
      };
      byId.set(t.clientId, row);
    }
    row.count += 1;
    if (!r.handled) row.open += 1;
    row.firstTs = Math.min(row.firstTs, r.ts);
    row.lastTs = Math.max(row.lastTs, r.ts);
    if (!row.ip && t.ip) row.ip = t.ip;
    const reason = r.reason || 'Other';
    row.reasons[reason] = (row.reasons[reason] || 0) + 1;
    if (r.reporter && r.reporter.clientId) row.reporters.add(r.reporter.clientId);
    if (!row.latestDetail && r.detail) row.latestDetail = r.detail;
  }
  return [...byId.values()]
    .map((row) => ({ ...row, reporters: row.reporters.size, reasons: Object.entries(row.reasons).sort((a, b) => b[1] - a[1]) }))
    .sort((a, b) => b.count - a.count || b.reporters - a.reporters || b.lastTs - a.lastTs)
    .slice(0, limit);
}

// Mark every open report against one person handled; returns how many changed.
function markReportsHandledFor(clientId) {
  let n = 0;
  for (const r of data.reports) {
    if (!r.handled && r.reported && r.reported.clientId === clientId) { r.handled = true; n += 1; }
  }
  if (n) save();
  return n;
}

function addFeedback(entry) {
  const rec = { id: crypto.randomUUID(), ts: Date.now(), ...entry };
  data.feedback.unshift(rec);
  if (data.feedback.length > MAX_FEEDBACK) data.feedback.pop();
  day().feedback += 1;
  save();
  return rec;
}

// --- Feedback replies ---------------------------------------------------
// The owner answers a feedback message from the dashboard. Like a warning it is
// shown to the sender immediately if they are online, otherwise on their next
// visit, until they dismiss it. Feedback sent before replies existed carries no
// clientId/account and cannot be answered.
const REPLY_TTL_MS = 30 * 86400000;

function setFeedbackReply(id, text) {
  const f = data.feedback.find((x) => x.id === id);
  if (!f || (!f.clientId && !f.account)) return null;
  f.reply = { text, ts: Date.now(), deliveredAt: null, seenAt: null };
  save();
  return f;
}

function pendingFeedbackRepliesFor(clientId, account) {
  const acct = account ? String(account).toLowerCase() : null;
  const cutoff = Date.now() - REPLY_TTL_MS;
  return data.feedback.filter((f) => f.reply && !f.reply.seenAt && f.reply.ts > cutoff
    && ((clientId && f.clientId === clientId) || (acct && f.account === acct))).reverse();
}

function markFeedbackReplyDelivered(id) {
  const f = data.feedback.find((x) => x.id === id);
  if (f && f.reply && !f.reply.deliveredAt) { f.reply.deliveredAt = Date.now(); save(); }
  return f || null;
}

// Only the person who sent the feedback can dismiss the reply.
function acknowledgeFeedbackReply(id, clientId, account) {
  const acct = account ? String(account).toLowerCase() : null;
  const f = data.feedback.find((x) => x.id === id);
  if (!f || !f.reply || f.reply.seenAt) return null;
  if (!((clientId && f.clientId === clientId) || (acct && f.account === acct))) return null;
  f.reply.seenAt = Date.now();
  if (!f.reply.deliveredAt) f.reply.deliveredAt = f.reply.seenAt;
  save();
  return f;
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

// --- Owner warnings ---------------------------------------------------------
const MAX_WARNINGS = 2000;
// A warning nobody has seen after this long is stale; it stops being shown.
const WARNING_TTL_MS = 30 * 86400000;

function addWarning({ clientId, account, username, country, reason, message }) {
  if (!Array.isArray(data.warnings)) data.warnings = [];
  const rec = {
    id: crypto.randomUUID(),
    ts: Date.now(),
    clientId: clientId || null,
    account: account ? String(account).toLowerCase() : null,
    username: username || null,
    country: country || null,
    reason: reason || null,
    message,
    deliveredAt: null,
    acknowledgedAt: null,
    withdrawnAt: null,
  };
  data.warnings.unshift(rec);
  if (data.warnings.length > MAX_WARNINGS) data.warnings.length = MAX_WARNINGS;
  save();
  return rec;
}

// Warnings still waiting to be acknowledged by this person, oldest first so
// they are read in the order they were sent. Matches the device (clientId) and,
// when signed in, the account - so a warning follows someone to a new device.
function pendingWarningsFor(clientId, account) {
  const acct = account ? String(account).toLowerCase() : null;
  const cutoff = Date.now() - WARNING_TTL_MS;
  return (data.warnings || []).filter((w) => !w.acknowledgedAt && !w.withdrawnAt && w.ts > cutoff
    && ((clientId && w.clientId === clientId) || (acct && w.account === acct))).reverse();
}

function markWarningDelivered(id) {
  const w = (data.warnings || []).find((x) => x.id === id);
  if (w && !w.deliveredAt) { w.deliveredAt = Date.now(); save(); }
  return w || null;
}

// Only the person it was addressed to can acknowledge it.
function acknowledgeWarning(id, clientId, account) {
  const acct = account ? String(account).toLowerCase() : null;
  const w = (data.warnings || []).find((x) => x.id === id);
  if (!w || w.acknowledgedAt) return null;
  if (!((clientId && w.clientId === clientId) || (acct && w.account === acct))) return null;
  w.acknowledgedAt = Date.now();
  if (!w.deliveredAt) w.deliveredAt = w.acknowledgedAt;
  save();
  return w;
}

function withdrawWarning(id) {
  const w = (data.warnings || []).find((x) => x.id === id);
  if (!w || w.acknowledgedAt || w.withdrawnAt) return null;
  w.withdrawnAt = Date.now();
  save();
  return w;
}

function warningCountFor(clientId, account) {
  const acct = account ? String(account).toLowerCase() : null;
  return (data.warnings || []).filter((w) => !w.withdrawnAt
    && ((clientId && w.clientId === clientId) || (acct && w.account === acct))).length;
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
    // The public ID others search to add this account (see
    // ensureAccountFriendId). Like clientId, never carried by the in-memory
    // accounts Map, so it is always kept from the previous record.
    friendId: previous.friendId || null,
    // The chosen, editable public ID ("asad#1234") - see setAccountHandle.
    handle: previous.handle || null,
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
  clientIdIndex.set(clientId, key);
  save();
  return clientId;
}

// --- Public friend IDs ------------------------------------------------------
// A short code (e.g. "K7MX29QP") that is this account's forever, so people can
// find and add each other without having met in a random match. Assigned
// lazily the first time the account is used, and never changed afterwards.

function getAccountFriendId(usernameLower) {
  const acc = data.accounts[String(usernameLower || '').toLowerCase()];
  return (acc && acc.friendId) || null;
}

// The account's friend ID, minting one with `generate` if it has none yet.
// `isTaken(id)` lets the caller reserve IDs that live outside the store too.
function ensureAccountFriendId(usernameLower, generate, isTaken = () => false) {
  const key = String(usernameLower || '').toLowerCase();
  const acc = data.accounts[key];
  if (!acc) return null;
  if (acc.friendId) return acc.friendId;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const id = generate();
    if (friendIdIndex.has(id) || isTaken(id)) continue;
    acc.friendId = id;
    friendIdIndex.set(id, key);
    save();
    return id;
  }
  return null;
}

// --- Chosen account IDs ("name#1234") ------------------------------------
// Every account has one, unique across accounts (compared without case). It
// is minted from the nickname on first use and can be changed by its owner to
// any free one; the old one is released the moment it changes.
function getAccountHandle(usernameLower) {
  const acc = data.accounts[String(usernameLower || '').toLowerCase()];
  return (acc && acc.handle) || null;
}

function ensureAccountHandle(usernameLower, generate) {
  const key = String(usernameLower || '').toLowerCase();
  const acc = data.accounts[key];
  if (!acc) return null;
  if (acc.handle) return acc.handle;
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const handle = String(generate(attempt) || '').toLowerCase();
    if (!handle || handleIndex.has(handle)) continue;
    acc.handle = handle;
    handleIndex.set(handle, key);
    save();
    return handle;
  }
  return null;
}

// Returns { ok: true, handle } or { ok: false, taken: true }.
function setAccountHandle(usernameLower, handle) {
  const key = String(usernameLower || '').toLowerCase();
  const acc = data.accounts[key];
  const next = String(handle || '').toLowerCase();
  if (!acc || !next) return { ok: false };
  const owner = handleIndex.get(next);
  if (owner && owner !== key) return { ok: false, taken: true };
  if (acc.handle && acc.handle !== next) handleIndex.delete(String(acc.handle).toLowerCase());
  acc.handle = next;
  handleIndex.set(next, key);
  save();
  return { ok: true, handle: next };
}

function isHandleTaken(handle) {
  return handleIndex.has(String(handle || '').toLowerCase());
}

function findUsernameByHandle(handle) {
  return handleIndex.get(String(handle || '').toLowerCase()) || null;
}

function findUsernameByClientId(clientId) {
  return clientIdIndex.get(clientId) || null;
}

function findUsernameByFriendId(friendId) {
  return friendIdIndex.get(friendId) || null;
}

function isAccountFriendId(friendId) {
  return friendIdIndex.has(friendId);
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

// --- Voice notes -------------------------------------------------------------
//
// Friend voice-note audio. Postgres table when DATABASE_URL is set, otherwise
// one file per clip under DATA_DIR/voice-notes. The chat message itself only
// carries { id, ms, mime }; the clip is fetched on demand. With DATABASE_URL
// set but unreachable, nothing is written locally - same rule as the document.
const VOICE_DIR = path.join(DATA_DIR, 'voice-notes');
const voiceFile = (id) => path.join(VOICE_DIR, id.replace(/[^a-zA-Z0-9_-]/g, '') + '.bin');

async function saveVoiceNote({ id, pair, from, fromName, to, toName, mime, durationMs, bytes, transcript, tags }) {
  const now = Date.now();
  if (pgPool) {
    if (!pgLive()) throw new Error('database unavailable');
    await pgPool.query(
      `INSERT INTO voice_notes (id, pair, from_client, from_name, to_client, to_name, mime, duration_ms, bytes, transcript, tags, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT (id) DO NOTHING`,
      [id, pair, from, fromName || null, to || null, toName || null, mime, durationMs, bytes, transcript || null, JSON.stringify(tags || null), now]
    );
    return;
  }
  await fs.promises.mkdir(VOICE_DIR, { recursive: true });
  const meta = { pair, from, fromName, to, toName, mime, durationMs, transcript: transcript || '', tags: tags || null, createdAt: now };
  await fs.promises.writeFile(voiceFile(id), Buffer.concat([Buffer.from(JSON.stringify(meta) + '\n'), bytes]));
}

// File backend: the JSON header line of one clip, without reading the audio.
async function readVoiceHeader(file) {
  let fh;
  try {
    fh = await fs.promises.open(file, 'r');
    const buf = Buffer.alloc(16384);
    const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
    const nl = buf.subarray(0, bytesRead).indexOf(10);
    return nl === -1 ? null : JSON.parse(buf.subarray(0, nl).toString());
  } catch (_) {
    return null;
  } finally {
    if (fh) await fh.close().catch(() => {});
  }
}

// Newest first, metadata only (no audio), for the owner dashboard.
async function listVoiceNotes(limit = 300) {
  const shape = (r) => ({
    id: r.id, pair: r.pair, from: r.from, fromName: r.fromName || '', to: r.to || '', toName: r.toName || '',
    mime: r.mime, ms: Number(r.durationMs) || 0, transcript: r.transcript || '', tags: r.tags || null, ts: Number(r.createdAt) || 0,
  });
  if (pgPool) {
    if (!pgLive()) return [];
    const res = await pgPool.query(
      `SELECT id, pair, from_client, from_name, to_client, to_name, mime, duration_ms, transcript, tags, created_at
       FROM voice_notes ORDER BY created_at DESC LIMIT $1`, [limit]);
    return res.rows.map((r) => shape({
      id: r.id, pair: r.pair, from: r.from_client, fromName: r.from_name, to: r.to_client, toName: r.to_name,
      mime: r.mime, durationMs: r.duration_ms, transcript: r.transcript, tags: r.tags, createdAt: r.created_at,
    }));
  }
  let names = [];
  try { names = (await fs.promises.readdir(VOICE_DIR)).filter((n) => n.endsWith('.bin')); } catch (_) { return []; }
  const rows = [];
  for (const n of names) {
    const meta = await readVoiceHeader(path.join(VOICE_DIR, n));
    if (meta) rows.push(shape({ ...meta, id: n.slice(0, -4) }));
  }
  return rows.sort((a, b) => b.ts - a.ts).slice(0, limit);
}

async function setVoiceNoteTags(id, tags) {
  if (pgPool) {
    if (!pgLive()) return;
    await pgPool.query('UPDATE voice_notes SET tags = $2 WHERE id = $1', [id, JSON.stringify(tags)]);
    return;
  }
  let raw;
  try { raw = await fs.promises.readFile(voiceFile(id)); } catch (_) { return; }
  const nl = raw.indexOf(10);
  if (nl === -1) return;
  const meta = JSON.parse(raw.subarray(0, nl).toString());
  meta.tags = tags;
  await fs.promises.writeFile(voiceFile(id), Buffer.concat([Buffer.from(JSON.stringify(meta) + '\n'), raw.subarray(nl + 1)]));
}

async function getVoiceNote(id) {
  if (pgPool) {
    if (!pgLive()) return null;
    const res = await pgPool.query('SELECT pair, mime, bytes FROM voice_notes WHERE id = $1', [id]);
    return res.rows.length ? { pair: res.rows[0].pair, mime: res.rows[0].mime, bytes: res.rows[0].bytes } : null;
  }
  let raw;
  try { raw = await fs.promises.readFile(voiceFile(id)); } catch (_) { return null; }
  const nl = raw.indexOf(10);
  if (nl === -1) return null;
  try {
    const meta = JSON.parse(raw.subarray(0, nl).toString());
    return { pair: meta.pair, mime: meta.mime, bytes: raw.subarray(nl + 1) };
  } catch (_) { return null; }
}

// Only ever touches voice_notes rows: called when a voice message leaves its
// thread (unsent, or pushed out by the per-thread message cap).
async function deleteVoiceNotes(ids) {
  const list = (ids || []).filter((id) => typeof id === 'string' && id);
  if (!list.length) return;
  if (pgPool) {
    if (!pgLive()) return;
    await pgPool.query('DELETE FROM voice_notes WHERE id = ANY($1::text[])', [list]);
    return;
  }
  await Promise.all(list.map((id) => fs.promises.unlink(voiceFile(id)).catch(() => {})));
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

// --- Talk time -----------------------------------------------------------------

const TALK_DAYS = 30;

// Add one finished conversation of `seconds` to `clientId`'s running total.
function recordTalkTime(clientId, seconds, info = {}) {
  if (!clientId || !(seconds > 0)) return;
  const now = Date.now();
  let rec = data.talkTime[clientId];
  if (!rec) rec = data.talkTime[clientId] = { seconds: 0, calls: 0, longest: 0, days: {} };
  if (info.username) rec.username = String(info.username).slice(0, 40);
  if (info.country) rec.country = String(info.country).slice(0, 60);
  rec.seconds += seconds;
  rec.calls += 1;
  rec.longest = Math.max(rec.longest || 0, seconds);
  rec.lastAt = now;
  const days = rec.days || (rec.days = {});
  const key = dayKey(now);
  const d = days[key] || (days[key] = { s: 0, n: 0 });
  d.s += seconds;
  d.n += 1;
  const keys = Object.keys(days).sort();
  while (keys.length > TALK_DAYS) delete days[keys.shift()];
  save();
}

// --- Mini games --------------------------------------------------------------

const GAME_DAYS = 30;
const MAX_GAME_LOG = 300;
// Per-person counters. s: seconds played, r: rounds, n: sessions that got to a
// board, w/l/d: finished rounds won/lost/drawn, sent: invites sent, sAcc: sent
// invites that were accepted, recv: invites received, acc/dec/ign: received
// invites accepted / declined / never answered, can: own invites withdrawn.
const GAME_FIELDS = ['s', 'r', 'n', 'w', 'l', 'd', 'sent', 'sAcc', 'recv', 'acc', 'dec', 'ign', 'can'];

function emptyGameCounters() {
  const t = {};
  for (const f of GAME_FIELDS) t[f] = 0;
  return t;
}

function gamePlayer(p, now) {
  const players = data.games.players;
  let rec = players[p.clientId];
  if (!rec) rec = players[p.clientId] = { firstAt: now, t: emptyGameCounters(), days: {}, byGame: {} };
  if (p.username) rec.username = String(p.username).slice(0, 40);
  if (p.country) rec.country = String(p.country).slice(0, 60);
  return rec;
}

// Add `delta` to a player's all-time and today's counters.
function bumpGamePlayer(p, delta, now) {
  const rec = gamePlayer(p, now);
  const key = dayKey(now);
  const days = rec.days || (rec.days = {});
  const d = days[key] || (days[key] = emptyGameCounters());
  for (const [f, v] of Object.entries(delta)) {
    if (!v) continue;
    rec.t[f] = (rec.t[f] || 0) + v;
    d[f] = (d[f] || 0) + v;
  }
  const keys = Object.keys(days).sort();
  while (keys.length > GAME_DAYS) delete days[keys.shift()];
  return rec;
}

function dayGames() {
  const d = day();
  return d.games || (d.games = { inv: 0, acc: 0, dec: 0, ign: 0, can: 0, waitMs: 0, sess: 0, rounds: 0, fin: 0, draws: 0, secs: 0, byGame: {}, byMode: {} });
}

function gameSlot(obj, key) {
  return obj[key] || (obj[key] = { inv: 0, acc: 0, sess: 0, rounds: 0, secs: 0 });
}

// One invite, settled: accepted | declined | ignored | cancelled.
function recordGameInvite({ game, mode, from, to, outcome, waitMs }) {
  const now = Date.now();
  const g = dayGames();
  const slot = gameSlot(g.byGame, game);
  const m = gameSlot(g.byMode, mode);
  g.inv += 1; slot.inv += 1; m.inv += 1;
  if (outcome === 'accepted') { g.acc += 1; slot.acc += 1; m.acc += 1; g.waitMs += Math.max(0, Math.min(waitMs || 0, 600000)); }
  else if (outcome === 'declined') g.dec += 1;
  else if (outcome === 'cancelled') g.can += 1;
  else g.ign += 1;
  bumpGamePlayer(from, { sent: 1, sAcc: outcome === 'accepted' ? 1 : 0, can: outcome === 'cancelled' ? 1 : 0 }, now);
  if (outcome !== 'cancelled') {
    bumpGamePlayer(to, { recv: 1, acc: outcome === 'accepted' ? 1 : 0, dec: outcome === 'declined' ? 1 : 0, ign: outcome === 'ignored' ? 1 : 0 }, now);
  }
  save();
}

// One game session between a pair, ended. players[0] is the host (player 0 in
// the game state); rounds is [{ ms, winner: 0|1|'draw'|null, finished }].
function recordGameSession({ game, mode, players, startedAt, sessionMs, rounds }) {
  if (!rounds || !rounds.length) return; // accepted, but no board was ever dealt
  const now = Date.now();
  const seconds = Math.round(rounds.reduce((a, r) => a + r.ms, 0) / 1000);
  const finished = rounds.filter((r) => r.finished);
  const draws = finished.filter((r) => r.winner === 'draw').length;
  const g = dayGames();
  g.sess += 1; g.rounds += rounds.length; g.fin += finished.length; g.draws += draws; g.secs += seconds;
  for (const slot of [gameSlot(g.byGame, game), gameSlot(g.byMode, mode)]) {
    slot.sess += 1; slot.rounds += rounds.length; slot.secs += seconds;
  }
  players.forEach((p, i) => {
    const w = finished.filter((r) => r.winner === i).length;
    const rec = bumpGamePlayer(p, { s: seconds, r: rounds.length, n: 1, w, l: finished.length - w - draws, d: draws }, now);
    rec.lastAt = now;
    const bg = rec.byGame[game] || (rec.byGame[game] = { r: 0, s: 0 });
    bg.r += rounds.length;
    bg.s += seconds;
  });
  const wins = [0, 1].map((i) => finished.filter((r) => r.winner === i).length);
  data.games.log.unshift({
    ts: now,
    startedAt,
    game,
    mode,
    seconds,
    sessionSeconds: Math.round((sessionMs || 0) / 1000),
    rounds: rounds.length,
    finished: finished.length,
    score: [wins[0], wins[1], draws],
    players: players.map((p) => ({ clientId: p.clientId, username: String(p.username || '').slice(0, 40), country: String(p.country || '').slice(0, 60) })),
  });
  if (data.games.log.length > MAX_GAME_LOG) data.games.log.length = MAX_GAME_LOG;
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
// The social graph is serialized when the store is actually written, not on
// every change. index.js used to rebuild the whole graph as plain objects each
// time anything social happened - once per event-loop turn - so a burst of
// three hundred disconnects serialized every friendship and history list three
// hundred times, on the same thread that relays live calls. Now a change only
// marks the graph dirty; the (debounced) write asks for it once.
let socialProvider = null;
let socialDirty = false;
// `tracked` names the TrackedMaps behind social.friendChats and
// social.chatHistory, which lets routine saves skip the lists that did not
// change (see writeMirror).
function setSocialProvider(fn, tracked) {
  socialProvider = fn;
  socialCaches = tracked && tracked.friendChats && tracked.chatHistory
    ? { friendChats: docJson.listCache(tracked.friendChats), chatHistory: docJson.listCache(tracked.chatHistory) }
    : null;
}
function markSocialDirty() {
  socialDirty = true;
  save();
}
function materializeSocial() {
  if (!socialDirty || !socialProvider) return;
  socialDirty = false;
  assignSocial(socialProvider());
}

function saveSocial(social) {
  assignSocial(social);
  save();
}

function assignSocial(social) {
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
    // Declined friend requests, so a decline still holds after a deploy.
    declinedRequests: social.declinedRequests || {},
    // Conversations each person muted, so a deploy does not start ringing again.
    mutedChats: social.mutedChats || {},
    // "Appear offline" and "no incoming calls", so both still hold while the
    // person is away after a deploy.
    privacy: social.privacy || {},
    // Which friend pairs agreed to voice messages.
    voiceConsent: social.voiceConsent || {},
  };
}

// --- Admin / sessions / audit ---

function audit(action, ip, detail) {
  data.auditLog.unshift({ ts: Date.now(), ip: ip || '', action, detail: detail || '' });
  if (data.auditLog.length > MAX_AUDIT) data.auditLog.pop();
  save();
}

// --- One-off restore: friends and friend chats lost on 2026-10-01 ------------
//
// After the Supabase outage the reconnect bug above wrote a near-empty social
// graph over the real one. The volume's snapshot from 10:58 UTC, taken just
// before an empty boot overwrote the mirror, is the last copy that has it.
// Merge it into the current graph once - entries made since are kept, so
// nobody loses a friend added after the outage - and record that it ran so
// later boots never merge again (re-merging would resurrect unfriends and
// deleted messages). The source is copied out of the rotating backups first,
// because every boot pushes the oldest backup out.
const RESTORE_ID = 'social-2026-10-01';
const RESTORE_FROM = path.join(BACKUP_DIR, 'owner-data.2026-10-01T10-58-47-307Z.json');
const RESTORE_KEEP = path.join(DATA_DIR, 'restore-source-social-2026-10-01.json');

const MAX_RESTORED_CHAT = 200;
const MAX_RESTORED_HISTORY = 20;
const MAX_RESTORED_NOTIFICATIONS = 50;

// Pure: the current graph wins wherever both have an entry.
function mergeSocial(cur, old) {
  cur = cur || {};
  old = old || {};
  const out = { ...old, ...cur };
  const obj = (o) => (o && typeof o === 'object' && !Array.isArray(o) ? o : {});
  const mapOfMaps = (k) => {
    const res = { ...obj(old[k]) };
    for (const [id, m] of Object.entries(obj(cur[k]))) res[id] = { ...obj(res[id]), ...obj(m) };
    return res;
  };
  const latest = (k) => {
    const res = { ...obj(old[k]) };
    for (const [id, v] of Object.entries(obj(cur[k]))) {
      res[id] = typeof res[id] === 'number' && typeof v === 'number' ? Math.max(res[id], v) : v;
    }
    return res;
  };
  const curWins = (k) => ({ ...obj(old[k]), ...obj(cur[k]) });
  const lists = (k, keyOf, cap) => {
    const res = {};
    for (const id of new Set([...Object.keys(obj(old[k])), ...Object.keys(obj(cur[k]))])) {
      const seen = new Map();
      for (const e of [...(obj(old[k])[id] || []), ...(obj(cur[k])[id] || [])]) {
        if (e && typeof e === 'object') seen.set(keyOf(e), e); // later (current) wins
      }
      const merged = [...seen.values()].sort((a, b) => (Number(a.ts) || 0) - (Number(b.ts) || 0));
      if (merged.length) res[id] = merged.slice(-cap);
    }
    return res;
  };
  const sets = (k) => {
    const res = {};
    for (const id of new Set([...Object.keys(obj(old[k])), ...Object.keys(obj(cur[k]))])) {
      const u = [...new Set([...(obj(old[k])[id] || []), ...(obj(cur[k])[id] || [])])];
      if (u.length) res[id] = u;
    }
    return res;
  };

  out.friends = mapOfMaps('friends');
  out.friendChats = lists('friendChats', (m) => m.id || `${m.ts}|${m.from}|${m.text}`, MAX_RESTORED_CHAT);
  out.blocks = sets('blocks');
  out.chatHistory = lists('chatHistory', (e) => e.clientId, MAX_RESTORED_HISTORY);
  out.friendRequests = mapOfMaps('friendRequests');
  out.sentRequests = mapOfMaps('sentRequests');
  out.notifications = lists('notifications', (n) => n.id || JSON.stringify(n), MAX_RESTORED_NOTIFICATIONS);
  out.lastSeen = latest('lastSeen');
  out.blockMeta = mapOfMaps('blockMeta');
  out.chatClears = latest('chatClears');
  out.declinedRequests = latest('declinedRequests');
  out.mutedChats = sets('mutedChats');
  out.privacy = curWins('privacy');
  out.voiceConsent = curWins('voiceConsent');
  // A request between two people who are friends now is already answered.
  for (const k of ['friendRequests', 'sentRequests']) {
    for (const [cid, m] of Object.entries(out[k])) {
      for (const other of Object.keys(m)) {
        if (out.friends[cid] && out.friends[cid][other]) delete m[other];
      }
      if (!Object.keys(m).length) delete out[k][cid];
    }
  }
  return out;
}

function restoreSocialOnce() {
  if (persistBlocked || (pgPool && pgUnreachable && !runningOnMirror)) return;
  if (data.restores && data.restores[RESTORE_ID]) return;
  let src = null;
  let srcFile = null;
  for (const f of [RESTORE_KEEP, RESTORE_FROM]) {
    try { src = JSON.parse(fs.readFileSync(f, 'utf8')); srcFile = f; break; } catch (_) { /* next */ }
  }
  if (!src) return;
  try {
    if (srcFile !== RESTORE_KEEP) fs.copyFileSync(srcFile, RESTORE_KEEP);
  } catch (err) {
    console.error('[store] restore: could not keep a copy of the source:', err.message);
  }
  if (lineageOf(src) && lineageOf(data) && lineageOf(src) !== lineageOf(data)) {
    console.error('[store] restore: the snapshot belongs to a different store history - skipped');
    return;
  }
  const before = census(data);
  data.social = mergeSocial(data.social, src.social);
  data.restores = { ...(data.restores || {}), [RESTORE_ID]: { at: Date.now(), from: path.basename(RESTORE_FROM), rev: revOf(src) } };
  const after = census(data);
  console.log('[store] restored the social graph from', path.basename(RESTORE_FROM),
    `- people with friends ${before.friends} -> ${after.friends}, friend chats ${before.chats} -> ${after.chats}`);
  save();
}

// Resolves once data is loaded; the server waits on this before listening so
// requests never see a half-initialized store.
const ready = (async () => {
  if (pgPool) {
    try {
      // The pool's connect timeout covers a database that is down, not one
      // that accepts the connection and then takes minutes per query (an
      // exhausted Supabase IO budget). Without a deadline the server never
      // listens, Fly's health check fails and the deploy is rolled out dead.
      const haveCopy = !!bootLocal() && !mirrorBlocked;
      const bootWait = haveCopy ? PG_BOOT_TIMEOUT_MS : PG_BOOT_TIMEOUT_NO_COPY_MS;
      const bootStart = Date.now();
      // With a copy to fall back on, one attempt; without one, keep trying
      // until the deadline - a refused connection fails fast, and serving an
      // empty store would be worse than waiting.
      const attempt = (async () => {
        for (;;) {
          try {
            return await connectPg(true);
          } catch (err) {
            if (haveCopy || bootAbandoned || Date.now() - bootStart > bootWait - 3000) throw err;
            console.error('[store] no copy on this volume and the database is not answering yet - retrying:', err.message);
            await new Promise((r) => setTimeout(r, 3000));
          }
        }
      })();
      let timer;
      const deadline = new Promise((_, reject) => {
        timer = setTimeout(() => {
          bootAbandoned = true;
          reject(new Error(`no answer from the database within ${bootWait / 1000}s`));
        }, bootWait);
      });
      attempt.catch((err) => {
        if (bootAbandoned) console.error('[store] abandoned boot attempt ended:', err.message);
      });
      try {
        await Promise.race([attempt, deadline]);
      } finally {
        clearTimeout(timer);
      }
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
  storeLoaded = true;
  restoreSocialOnce();
  // The baseline the wipe guard compares the first save against.
  lastCensus = census(data);
  if (saveAfterLoad) save();
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
      // Up to 5 minutes: the app serves the volume copy meanwhile, and a
      // struggling database recovers faster without a reconnect every minute.
      pgRetryDelay = Math.min(pgRetryDelay * 2, 5 * 60 * 1000);
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
const SHUTDOWN_PG_WAIT_MS = Number(process.env.SHUTDOWN_PG_WAIT_MS) || 25000;
async function flushAndExit(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  // Same rule on the way out as on every other write: a document we never
  // successfully loaded must not be the last thing written over a good one.
  if (persistBlocked || (pgPool && pgUnreachable && !runningOnMirror)) {
    fs.writeSync(2, `[store] ${signal}: not saving - ${persistBlocked || 'no copy of the store is loaded'}\n`);
    process.exit(0);
  }
  try {
    persistNow();
    // The mirror already has everything; this is for the database copy, which
    // a machine in another region (or one whose volume is lost) starts from.
    // Must stay under fly.toml's kill_timeout.
    let done = false;
    await Promise.race([pgChain.then(() => { done = true; }), new Promise((r) => setTimeout(r, SHUTDOWN_PG_WAIT_MS))]);
    // "final save done" is what move-region.yml waits for before it destroys
    // this machine, so it is only ever logged when Postgres has the store.
    // Written synchronously: console output to a pipe can be lost on exit.
    fs.writeSync(1, (!pgLive() || pgConflict
      ? `[store] ${signal}: not connected to the database - only the copy on the volume has the latest`
      : done
        ? `[store] ${signal}: final save done`
        : `[store] ${signal}: database save still running after ${SHUTDOWN_PG_WAIT_MS / 1000}s - the copy on the volume has it`) + '\n');
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

// The dashboard's site modes, with any key a saved copy predates filled in.
function siteModes() {
  const saved = data.settings.modes || {};
  return { ...defaults().settings.modes, ...saved, announce: { ...defaults().settings.modes.announce, ...(saved.announce || {}) } };
}

// What the browser is told on connect and on every change.
function publicModes() {
  const m = siteModes();
  return { announce: m.announce, membersOnly: !!m.membersOnly, voicePaused: !!m.voicePaused, signupsPaused: !!m.signupsPaused };
}

module.exports = {
  siteModes,
  publicModes,
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
  recordPageView,
  recordArrival,
  recordConnection,
  recordPeakOnline,
  recordFeature,
  recordTalkTime,
  recordGameInvite,
  recordGameSession,
  GAME_FIELDS,
  recordPerson,
  recordSignedIn,
  recordCallEnd,
  recordCallQuality,
  callQualityReport,
  recordWait,
  recordQueueAbandon,
  recordRating,
  recordTopics,
  addTranscript,
  hasContactConsent,
  getFavFilms,
  setFavFilms,
  setContactConsent,
  recordContacts,
  deleteCapturedContact,
  addReport,
  reportCountFor,
  reportCounts,
  topReported,
  markReportsHandledFor,
  addFeedback,
  setFeedbackReply,
  pendingFeedbackRepliesFor,
  markFeedbackReplyDelivered,
  acknowledgeFeedbackReply,
  addError,
  activeBans,
  findActiveBan,
  addBan,
  addWarning,
  pendingWarningsFor,
  markWarningDelivered,
  acknowledgeWarning,
  withdrawWarning,
  warningCountFor,
  liftBan,
  upsertAccount,
  saveAccount,
  getAccountClientId,
  setAccountClientId,
  getAccountFriendId,
  ensureAccountFriendId,
  findUsernameByFriendId,
  getAccountHandle,
  ensureAccountHandle,
  setAccountHandle,
  isHandleTaken,
  findUsernameByHandle,
  findUsernameByClientId,
  isAccountFriendId,
  findUsernameByEmail,
  startPasswordReset,
  findPasswordReset,
  notePasswordResetFailure,
  deletePasswordReset,
  markPasswordResetVerified,
  consumePasswordResetToken,
  purgePasswordResets,
  saveVoiceNote,
  getVoiceNote,
  listVoiceNotes,
  setVoiceNoteTags,
  deleteVoiceNotes,
  createAuthSession,
  getAuthSessionUser,
  deleteAuthSession,
  deleteAuthSessionsForUser,
  saveSocial,
  setSocialProvider,
  markSocialDirty,
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
