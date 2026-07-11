// Persistent store for the owner dashboard: analytics, reports, bans,
// feedback, errors, accounts registry and admin credentials.
//
// Two backends, picked automatically:
//  - DATABASE_URL set (e.g. Supabase Postgres): the whole document lives in a
//    single jsonb row and survives Render free-tier deploys/restarts.
//  - otherwise: a JSON file under DATA_DIR (defaults to <repo>/data) — zero
//    setup locally, ephemeral on Render's free plan.
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
};

if (DATABASE_URL) {
  try {
    const u = new URL(DATABASE_URL);
    backendStatus.host = `${u.hostname}:${u.port || '5432'}`;
  } catch (_) { backendStatus.host = 'unparseable'; }
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
    // googleId, createdAt }. googleIndex maps a Google "sub" -> usernameLower.
    accounts: {},
    googleIndex: {},
    // Durable login sessions: token -> { u: usernameLower, createdAt, lastSeen }.
    // Lets a signed-in user stay signed in across page reloads, server restarts
    // and deploys (sliding expiry, see SESSION_TTL_MS).
    authSessions: {},
    // Durable social graph — users' "memories": who they added and what they
    // said. friends: clientId -> { friendClientId -> info }. friendChats:
    // pairKey -> [{ from, text, ts }]. blocks: clientId -> [clientId,...].
    social: { friends: {}, friendChats: {}, blocks: {} },
    analytics: {
      totals: { visits: 0, connections: 0, matches: 0, messages: 0, reports: 0, accounts: 0 },
      days: {}, // 'YYYY-MM-DD' -> { visits, uniques, uniqueSet, connections, matches, messages, reports, feedback, errors, newAccounts, peakOnline, countries, cities, features }
      topics: {}, // word -> count (aggregate, anonymous)
    },
    premium: {}, // clientId -> { activatedAt, updatedAt, lastEvent, subscriptionId, revokedAt }
    // Flagged/blocked message log for the dashboard's Moderation tab.
    moderationLog: [], // { id, ts, clientId, username, country, kind, category, reason, level, points, text }
    // Per-user escalation state: clientId -> { events: [{ts,severity,category}], warns, mutedUntil, flagged, flaggedAt }
    moderationState: {},
    settings: {
      maintenance: { on: false, message: 'TalkLive is under maintenance. We will be back shortly!' },
      banThreshold: 3,
      autoBanMinutes: 30,
      // Operator-tunable moderation config (edited from the dashboard).
      moderation: {
        customBlocklist: [], // extra blocked substrings (checked on normalized text)
        customRegex: [],     // extra blocked regex sources (case-insensitive)
        stripLinks: false,   // true: deliver messages with links removed instead of blocking
        escalation: { windowHours: 24, warnAt: 2, muteAt: 4, banAt: 8, muteMinutes: 10, banMinutes: 60 },
      },
    },
  };
}

let data = defaults();
let saveTimer = null;

function applyParsed(parsed) {
  data = { ...defaults(), ...parsed };
  data.analytics = { ...defaults().analytics, ...(parsed.analytics || {}) };
  data.settings = { ...defaults().settings, ...(parsed.settings || {}) };
  // Nested settings objects need their own merge so a saved doc from before a
  // feature existed still gets that feature's defaults.
  const modDefaults = defaults().settings.moderation;
  const parsedMod = (parsed.settings && parsed.settings.moderation) || {};
  data.settings.moderation = {
    ...modDefaults,
    ...parsedMod,
    escalation: { ...modDefaults.escalation, ...(parsedMod.escalation || {}) },
  };
  data.moderationLog = parsed.moderationLog || [];
  data.moderationState = parsed.moderationState || {};
  data.social = { ...defaults().social, ...(parsed.social || {}) };
  data.accounts = parsed.accounts || {};
  data.googleIndex = parsed.googleIndex || {};
  data.authSessions = parsed.authSessions || {};
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
  const res = await pgPool.query('SELECT doc FROM owner_store WHERE id = 1');
  if (res.rows.length) applyParsed(res.rows[0].doc);
  backendStatus.mode = 'postgres';
  backendStatus.error = null;
  console.log('[store] using Postgres backend (DATABASE_URL) —', backendStatus.host);
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
    };
    // Trim old days so the file never grows unbounded.
    const keys = Object.keys(data.analytics.days).sort();
    while (keys.length > MAX_DAYS) {
      delete data.analytics.days[keys.shift()];
    }
  }
  return data.analytics.days[key];
}

function hashIp(ip) {
  return crypto.createHash('sha256').update('talklive-uv:' + ip).digest('hex').slice(0, 12);
}

// --- Analytics recording ---

function recordVisit(ip, countryName, city) {
  const d = day();
  d.visits += 1;
  data.analytics.totals.visits += 1;
  const h = hashIp(ip || 'unknown');
  if (!d.uniqueSet[h]) {
    d.uniqueSet[h] = 1;
    d.uniques += 1;
  }
  if (countryName) d.countries[countryName] = (d.countries[countryName] || 0) + 1;
  if (city && city !== 'Unknown') d.cities[city] = (d.cities[city] || 0) + 1;
  save();
}

function recordConnection() {
  day().connections += 1;
  data.analytics.totals.connections += 1;
  save();
}

function recordPeakOnline(count) {
  const d = day();
  if (count > d.peakOnline) {
    d.peakOnline = count;
    save();
  }
}

function recordFeature(name) {
  const d = day();
  d.features[name] = (d.features[name] || 0) + 1;
  if (name === 'match') { d.matches += 1; data.analytics.totals.matches += 1; }
  if (name === 'chat_message') { d.messages += 1; data.analytics.totals.messages += 1; }
  save();
}

const STOPWORDS = new Set(('the and you your for that this with have from what like just are was but not they them then when where will can could would there here how who whom about into over under again very really much many some any all been being were is it its our out off did does doing had has more most other only own same than too she he his her hers him himself herself they their theirs myself yourself hello okay yeah yes no nope maybe dont cant wont didnt doesnt im ive ill youre youve thats whats going want know think good time talk talking say said tell')
  .split(/\s+/));

// Aggregate, anonymous topic keywords — never stores who said what or full text.
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

// --- Moderation (flagged/blocked messages) ---

const MAX_MODERATION = 2000;
function addModerationEvent(entry) {
  const rec = { id: crypto.randomUUID(), ts: Date.now(), ...entry };
  data.moderationLog.unshift(rec);
  if (data.moderationLog.length > MAX_MODERATION) data.moderationLog.pop();
  save();
  return rec;
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

// --- Premium subscriptions (activated via the Paddle webhook) ---

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

function revokePremium(clientId, info = {}) {
  const existing = data.premium[clientId];
  if (!existing) return null;
  Object.assign(existing, info, { revokedAt: Date.now(), updatedAt: Date.now() });
  save();
  return existing;
}

function isPremiumClient(clientId) {
  const rec = data.premium[clientId];
  return !!(rec && !rec.revokedAt);
}

// --- Durable accounts (credentials) ---

// Persist (or update) an account's credentials. Called on signup, Google
// account creation, nickname change and password change so a signed-in user's
// login keeps working after a restart or deploy.
function saveAccount(usernameLower, account) {
  data.accounts[usernameLower] = {
    passwordHash: account.passwordHash || null,
    salt: account.salt || null,
    nickname: account.nickname || '',
    googleId: account.googleId || null,
    createdAt: (data.accounts[usernameLower] && data.accounts[usernameLower].createdAt) || Date.now(),
  };
  if (account.googleId) data.googleIndex[account.googleId] = usernameLower;
  save();
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

// --- Durable social graph ("memories": friends + friend chats + blocks) ---
// index.js holds the live Maps; these take the already-serialized plain objects
// and persist them (debounced), keeping the store the single source of truth.
function saveSocial(social) {
  data.social = {
    friends: social.friends || {},
    friendChats: social.friendChats || {},
    blocks: social.blocks || {},
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
      console.error('[store] to the ephemeral file store — data will NOT survive restarts');
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

// 'exit' never fires for SIGTERM/SIGINT — and SIGTERM is exactly what Render
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

module.exports = {
  get data() { return data; },
  get backendStatus() { return backendStatus; },
  ready,
  save,
  persistNow,
  dayKey,
  day,
  recordVisit,
  recordConnection,
  recordPeakOnline,
  recordFeature,
  recordTopics,
  addTranscript,
  addModerationEvent,
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
  createAuthSession,
  getAuthSessionUser,
  deleteAuthSession,
  deleteAuthSessionsForUser,
  saveSocial,
  setPremium,
  revokePremium,
  isPremiumClient,
  audit,
};
