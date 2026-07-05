// Persistent JSON store for the owner dashboard: analytics, reports, bans,
// feedback, errors, accounts registry and admin credentials. Data lives in a
// single JSON file (DATA_DIR env, defaults to <repo>/data) and is written with
// a debounce so hot paths never block on disk I/O.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'owner-data.json');

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
    accountsRegistry: {}, // usernameLower -> details
    analytics: {
      totals: { visits: 0, connections: 0, matches: 0, messages: 0, reports: 0, accounts: 0 },
      days: {}, // 'YYYY-MM-DD' -> { visits, uniques, uniqueSet, connections, matches, messages, reports, feedback, errors, newAccounts, peakOnline, countries, cities, features }
      topics: {}, // word -> count (aggregate, anonymous)
    },
    settings: {
      maintenance: { on: false, message: 'TalkLive is under maintenance. We will be back shortly!' },
      banThreshold: 3,
      autoBanMinutes: 30,
    },
  };
}

let data = defaults();
let saveTimer = null;

function load() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      data = { ...defaults(), ...parsed };
      data.analytics = { ...defaults().analytics, ...(parsed.analytics || {}) };
      data.settings = { ...defaults().settings, ...(parsed.settings || {}) };
    }
  } catch (err) {
    console.error('[store] failed to load, starting fresh:', err.message);
    data = defaults();
  }
}

function persistNow() {
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

// --- Admin / sessions / audit ---

function audit(action, ip, detail) {
  data.auditLog.unshift({ ts: Date.now(), ip: ip || '', action, detail: detail || '' });
  if (data.auditLog.length > MAX_AUDIT) data.auditLog.pop();
  save();
}

load();
process.on('exit', persistNow);

module.exports = {
  get data() { return data; },
  save,
  persistNow,
  dayKey,
  day,
  recordVisit,
  recordConnection,
  recordPeakOnline,
  recordFeature,
  recordTopics,
  addReport,
  reportCountFor,
  addFeedback,
  addError,
  activeBans,
  findActiveBan,
  addBan,
  liftBan,
  upsertAccount,
  audit,
};
