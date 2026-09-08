// Persistent store for the owner dashboard: analytics, reports, bans,
// feedback, errors, accounts registry and admin credentials.
//
// Two backends, picked automatically:
//  - DATABASE_URL set (e.g. Supabase Postgres): the whole document lives in a
//    single jsonb row, and is the only option if the app ever runs on more
//    than one machine.
//  - otherwise: a JSON file under DATA_DIR (defaults to <repo>/data) - zero
//    setup locally. In production this is only durable if DATA_DIR is a real
//    mount. fly.toml sets DATA_DIR=/data but deliberately declares no
//    [mounts] block (a mount that does not exist blocks every deploy until
//    someone runs `fly volumes create` from the CLI), so on the live app /data
//    is an ordinary directory inside the container and every deploy discards
//    it. ephemeralStorage() below detects exactly that and the app says so
//    loudly at boot, because the failure is otherwise completely silent: the
//    server starts, serves users, accepts sign-ups, and destroys them all on
//    the next push.
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
    // googleId, createdAt }. googleIndex maps a Google "sub" -> usernameLower.
    accounts: {},
    googleIndex: {},
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

module.exports = {
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
