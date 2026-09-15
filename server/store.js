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
    social: { friends: {}, friendChats: {}, blocks: {}, chatHistory: {} },
    analytics: {
      totals: { visits: 0, connections: 0, matches: 0, messages: 0, reports: 0, accounts: 0 },
      // 'YYYY-MM-DD' (UTC) -> { visits, uniques, uniqueSet, connections, matches,
      // messages, reports, feedback, errors, newAccounts, peakOnline, countries,
      // cities, features, hours }. `hours` is '0'..'23' (UTC hour) -> counters,
      // which is what lets the dashboard re-cut a day into any timezone.
      days: {},
      topics: {}, // word -> count (aggregate, anonymous)
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

function loadFile() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      applyParsed(JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')));
    }
  } catch (err) {
    console.error('[store] failed to load file, starting fresh:', err.message);
    data = defaults();
  }
}

async function loadPg() {
  await pgPool.query(
    'CREATE TABLE IF NOT EXISTS owner_store (id int PRIMARY KEY, doc jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())'
  );
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
  const res = await pgPool.query('SELECT doc FROM owner_store WHERE id = 1');
  if (res.rows.length) applyParsed(res.rows[0].doc);
  backendStatus.mode = 'postgres';
  backendStatus.error = null;
  console.log('[store] using Postgres backend (DATABASE_URL) -', backendStatus.host);
}

let pgWriting = false;
let pgDirty = false;
function persistPg() {
  // Serialize writes: if one is in flight, mark dirty and rewrite after.
  if (pgWriting) { pgDirty = true; return; }
  pgWriting = true;
  pgPool.query(
    'INSERT INTO owner_store (id, doc, updated_at) VALUES (1, $1, now()) ON CONFLICT (id) DO UPDATE SET doc = $1, updated_at = now()',
    [JSON.stringify(data)]
  ).catch((err) => console.error('[store] pg save failed:', err.message))
    .finally(() => {
      pgWriting = false;
      if (pgDirty) { pgDirty = false; persistPg(); }
    });
}

function persistNow() {
  if (pgPool) return persistPg();
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data));
    fs.renameSync(tmp, DATA_FILE);
  } catch (err) {
    console.error('[store] failed to save:', err.message);
  }
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
  return { visits: 0, uniques: 0, connections: 0, matches: 0, messages: 0, peakOnline: 0 };
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

function recordVisit(ip, countryName, city) {
  const d = day();
  const hr = hour();
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
    createdAt: previous.createdAt || Date.now(),
  };
  if (account.googleId) data.googleIndex[account.googleId] = usernameLower;
  if (email) data.emailIndex[email] = usernameLower;
  save();
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
  if (pgPool) {
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
  if (pgPool) {
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
  if (pgPool) {
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
  if (pgPool) {
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
  if (pgPool) {
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
  if (pgPool) {
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
  if (pgPool) {
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
      await loadPg();
    } catch (err) {
      backendStatus.mode = 'file';
      backendStatus.error = String(err.message || err);
      console.error('[store] ============================================================');
      console.error('[store] DATABASE_URL is set but the connection FAILED. Falling back');
      console.error('[store] to the ephemeral file store - data will NOT survive restarts');
      console.error('[store] until this is fixed. Host:', backendStatus.host);
      console.error('[store] Reason:', backendStatus.error);
      console.error('[store] ============================================================');
      pgPool = null;
      loadFile();
    }
  } else {
    loadFile();
  }
})();

process.on('exit', () => { if (!pgPool) persistNow(); });

// 'exit' never fires for SIGTERM/SIGINT - and SIGTERM is exactly what Fly
// sends on every deploy/restart. Flush any debounced write before going down
// so a signup seconds before a deploy is never lost.
let shuttingDown = false;
async function flushAndExit(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  try {
    if (pgPool) {
      await pgPool.query(
        'INSERT INTO owner_store (id, doc, updated_at) VALUES (1, $1, now()) ON CONFLICT (id) DO UPDATE SET doc = $1, updated_at = now()',
        [JSON.stringify(data)]
      );
    } else {
      persistNow();
    }
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
