// Owner dashboard: authentication (password + Google Authenticator TOTP),
// admin API, email alerts, maintenance mode and the rule-based site conclusion.
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const store = require('./store');
const totp = require('./totp');
const analytics = require('./analytics');
const audience = require('./audience');
const modTags = require('./moderation-tags');
const { createAgent } = require('./ai-agent');

let QRCode = null;
try { QRCode = require('qrcode'); } catch (_) { /* optional */ }
const mail = require('./mailer');
const searchConsole = require('./search-console');
const health = require('./health');

const SESSION_HOURS = 12;
const OWNER_EMAIL = process.env.OWNER_EMAIL || '';

// --- Email alerts (shared SMTP transport, see mailer.js) ---
const emailThrottle = new Map(); // key -> last sent ts
function sendAlertEmail(kind, subject, text) {
  if (!mail.configured() || !OWNER_EMAIL) return;
  // At most one email per kind per 10 minutes so a burst can't flood the inbox.
  const last = emailThrottle.get(kind) || 0;
  if (Date.now() - last < 10 * 60000) return;
  emailThrottle.set(kind, Date.now());
  mail.sendMail({
    to: OWNER_EMAIL,
    subject: `[TalkLive] ${subject}`,
    text,
    fromName: 'TalkLive Dashboard',
  });
}

// --- Auth helpers ---
// Async so the ~100ms key derivation runs on libuv's thread pool instead of the
// event loop this process shares with every live call's WebRTC signalling.
function hashPassword(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err);
      else resolve(derived.toString('hex'));
    });
  });
}

// Forgotten owner password: set OWNER_RESET to any new value and restart. The
// login is wiped once, so /owner shows first-run setup again; the value is
// remembered (hashed) so later restarts with the same value change nothing.
function applyOwnerReset() {
  const value = process.env.OWNER_RESET;
  if (!value) return;
  const tag = crypto.createHash('sha256').update(value).digest('hex');
  if (!store.data.secrets) store.data.secrets = {};
  if (store.data.secrets.ownerReset === tag) return;
  store.data.secrets.ownerReset = tag;
  store.data.admin = null;
  store.data.sessions = [];
  store.audit('owner_reset', '', 'Owner login cleared by OWNER_RESET');
  store.persistNow();
  console.warn('[owner] OWNER_RESET: login cleared - open /owner now to set a new password and authenticator.');
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

function createSession(ip) {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  store.data.sessions.push({ token, createdAt: now, expiresAt: now + SESSION_HOURS * 3600000, ip });
  // Prune expired sessions.
  store.data.sessions = store.data.sessions.filter((s) => s.expiresAt > now);
  store.save();
  return token;
}

function validSession(req) {
  const cookies = String(req.headers.cookie || '');
  const match = cookies.match(/(?:^|;\s*)tl_owner=([a-f0-9]{64})/);
  if (!match) return false;
  const now = Date.now();
  return store.data.sessions.some((s) => s.expiresAt > now && safeEqual(s.token, match[1]));
}

// Brute-force protection: 5 attempts per 15 minutes per IP, then lockout.
const loginAttempts = new Map();
function rateLimited(ip) {
  const rec = loginAttempts.get(ip);
  if (!rec) return false;
  if (Date.now() - rec.first > 15 * 60000) { loginAttempts.delete(ip); return false; }
  return rec.count >= 5;
}
function noteFailedLogin(ip) {
  const rec = loginAttempts.get(ip) || { first: Date.now(), count: 0 };
  rec.count += 1;
  loginAttempts.set(ip, rec);
  if (rec.count === 5) {
    store.audit('login_lockout', ip, 'Too many failed dashboard login attempts');
    sendAlertEmail('lockout', 'Security: dashboard login lockout', `IP ${ip} was locked out after 5 failed dashboard login attempts.`);
  }
}

function reqIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  return ((fwd ? String(fwd).split(',')[0].trim() : req.socket.remoteAddress) || '').replace('::ffff:', '');
}

// The timezone the dashboard cuts its days on. Owner-configurable; everything
// is still *stored* in UTC hour buckets (see analytics.js).
function reportTimezone(req) {
  const asked = req && req.query ? req.query.tz : null;
  return analytics.normalizeTimezone(asked, store.data.settings.timezone || 'UTC');
}

function activityReport(req) {
  return analytics.buildReport(store.data.analytics.days, reportTimezone(req));
}

// --- Subscription rows -------------------------------------------------------
// Read-only projection of store.data.premium. A grant with no expiresAt is
// permanent (that is what every grant made before billing existed looks like),
// a revoked one is dead, and everything else lives or lapses on its own clock -
// the same rules store.isPremiumClient() applies, spelled out for display.
function premiumRows() {
  const now = Date.now();
  return Object.entries(store.data.premium || {}).map(([clientId, p]) => {
    const status = p.revokedAt ? 'revoked'
      : (p.expiresAt && p.expiresAt <= now) ? 'expired'
        : 'active';
    return {
      clientId,
      status,
      permanent: status === 'active' && !p.expiresAt,
      source: p.source || (p.subscriptionId ? 'stripe' : 'unknown'),
      activatedAt: p.activatedAt || null,
      updatedAt: p.updatedAt || null,
      expiresAt: p.expiresAt || null,
      revokedAt: p.revokedAt || null,
      lastEvent: p.lastEvent || '',
      paying: !!p.subscriptionId,
    };
  }).sort((a, b) => (b.updatedAt || b.activatedAt || 0) - (a.updatedAt || a.activatedAt || 0));
}

// --- CSV ---------------------------------------------------------------------
// A leading =, +, - or @ makes a spreadsheet treat the cell as a formula, so a
// username like "=cmd()" would execute on open. Prefixing with an apostrophe
// keeps the text visible and inert.
function csvCell(v) {
  if (v === null || v === undefined) return '';
  let out = String(v);
  if (/^[=+\-@]/.test(out)) out = "'" + out;
  return /[",\n\r]/.test(out) ? '"' + out.replace(/"/g, '""') + '"' : out;
}
function toCsv(headers, rows) {
  return [headers.join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\r\n') + '\r\n';
}
const isoOr = (ts) => (ts ? new Date(ts).toISOString() : '');

// --- ZIP ---------------------------------------------------------------------
// Minimal ZIP writer (deflate, no zip64) for the "download everything" export,
// so it needs no dependency. files: [{ name, data: Buffer }].
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function zipFiles(files) {
  const zlib = require('zlib');
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, 'utf8');
    const body = zlib.deflateRawSync(f.data);
    const crc = crc32(f.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(f.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(f.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, name, body);
    centrals.push(central, name);
    offset += local.length + name.length + body.length;
  }
  const cdSize = centrals.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cdSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

// --- Feature ranking -----------------------------------------------------------
// store.recordFeature() counts every tracked event: product features, but also
// plumbing (searches, logins, acquisition sources, billing steps, password
// resets, media health). Ranking all of it together put "chat_search" above
// the features people actually choose to use. Only what a user would call a
// feature is ranked, under a readable name, with related events folded in.
const PRODUCT_FEATURES = [
  ['Voice calls', ['match']],
  ['Text chat', ['chat_match']],
  ['Friends', ['friend_request', 'friend_id_search']],
  ['Call back & voice invites', ['call_back', 'voice_invite']],
  ['Reactions', ['reaction', 'heart_reaction', 'chat_reaction']],
  ['GIFs', ['chat_gif']],
  ['Replies', ['chat_reply']],
  ['Mini games', ['mini_game']],
  ['Animal avatars', ['animal_picked']],
  ['Sharing', ['share_open']],
];
function rankFeatures(raw) {
  return PRODUCT_FEATURES
    .map(([label, keys]) => [label, keys.reduce((n, k) => n + (raw[k] || 0), 0)])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
}

// --- Rule-based "AI" conclusion over the last 7 days of real metrics ---
// `report` is an analytics.buildReport() result, so "the last 7 days" means
// seven of the owner's local days - not seven UTC days.
function generateConclusion(runtime, report) {
  const days = store.data.analytics.days;
  const keys = Object.keys(days).sort();
  const last7Days = report.daily.slice(-7);

  const visits = report.last7.visits;
  const prevVisits = report.prev7.visits;
  const matches = report.last7.matches;
  const connections = report.last7.connections;
  const reports = report.last7.reports;
  const errors = report.last7.errors;
  const today = report.today;
  const last7 = keys.slice(-7).map((k) => days[k]); // country/feature maps are per UTC day

  const lines = [];
  let health = 'good';

  /*
   * Crawler traffic used to be counted as people (see server/bots.js). Days
   * recorded before the split are humans and bots added together, so putting
   * one of them next to a human-only week produces a "traffic collapsed"
   * reading out of a change in bookkeeping. `humanSince` is the first day
   * counted the new way; while either comparison window still reaches behind
   * it, say so instead of reporting a trend that is not there.
   */
  const humanSince = store.data.analytics.humanSince || null;
  const prevWeekStart = report.daily.length >= 14 ? report.daily[report.daily.length - 14].day : null;
  const weekComparable = !humanSince || !prevWeekStart || prevWeekStart >= humanSince;

  if (!weekComparable) {
    lines.push(`Visitor counts now exclude search-engine crawlers and bots; days before ${humanSince} still include them. Week-over-week traffic comparisons become meaningful again from ${analytics.addDays(humanSince, 14)}.`);
    lines.push(`${visits} human visits in the last 7 days${report.last7.bots ? `, plus ${report.last7.bots} crawler page views` : ''}.`);
  } else if (prevVisits > 0) {
    const change = Math.round(((visits - prevVisits) / prevVisits) * 100);
    if (change >= 10) lines.push(`Traffic is growing: visits are up ${change}% versus the previous week (${visits} vs ${prevVisits}).`);
    else if (change <= -10) { lines.push(`Traffic is declining: visits are down ${Math.abs(change)}% versus the previous week (${visits} vs ${prevVisits}). Consider promotion or SEO work.`); health = 'warning'; }
    else lines.push(`Traffic is stable week-over-week (${visits} visits in the last 7 days).`);
  } else {
    lines.push(`${visits} visits recorded in the last 7 days.`);
  }

  // Crawlers, as their own story. A crawl-budget swing is worth knowing about
  // - it is an early signal about indexing - but it is not an audience, and
  // reading it as one is what sent this dashboard chasing a decline that never
  // happened to a single person.
  if (report.last7.bots) {
    const topCrawlers = Object.entries(last7.reduce((acc, d) => {
      for (const [c, n] of Object.entries(d.crawlers || {})) acc[c] = (acc[c] || 0) + n;
      return acc;
    }, {})).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const share = Math.round((report.last7.bots / Math.max(1, report.last7.bots + visits)) * 100);
    lines.push(`Crawlers and bots made ${report.last7.bots} page requests this week (${share}% of all HTML traffic)${topCrawlers.length ? ` - mostly ${topCrawlers.map(([c, n]) => `${c} (${n})`).join(', ')}` : ''}. They are counted separately and never as visitors.`);
    if (report.prev7.bots && weekComparable) {
      const botChange = Math.round(((report.last7.bots - report.prev7.bots) / report.prev7.bots) * 100);
      if (Math.abs(botChange) >= 25) {
        lines.push(`Crawl volume is ${botChange > 0 ? 'up' : 'down'} ${Math.abs(botChange)}% week-over-week (${report.last7.bots} vs ${report.prev7.bots}). A sustained fall is worth checking in Search Console; it does not affect how many people visited.`);
      }
    }
  }

  // Where the people actually landed. The site is 169 indexable pages and
  // three quarters of them sit below the root; before this was recorded, a
  // shift of search traffic into the long tail was indistinguishable from
  // losing traffic altogether.
  const sections = Object.entries(last7.reduce((acc, d) => {
    for (const [s, n] of Object.entries(d.sections || {})) acc[s] = (acc[s] || 0) + n;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]);
  if (sections.length > 1) {
    lines.push(`Where people landed this week: ${sections.slice(0, 4).map(([s, n]) => `${s} (${n})`).join(', ')}.`);
  }

  if (connections > 0) {
    const matchRate = Math.round((matches / Math.max(1, connections)) * 100);
    if (matchRate < 30) { lines.push(`Only ${matchRate}% of connected users end up in a call - users may be waiting too long for a match. More concurrent users or looser default filters would help.`); health = 'warning'; }
    else lines.push(`${matchRate}% of connected users get matched into a call - matchmaking is working well.`);
  }

  const topCountry = Object.entries(last7.reduce((acc, d) => {
    for (const [c, n] of Object.entries(d.countries || {})) acc[c] = (acc[c] || 0) + n;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1])[0];
  if (topCountry) lines.push(`Your biggest audience this week is ${topCountry[0]}.`);

  if (reports > 10) { lines.push(`${reports} user reports this week is high - review the Reports tab and consider bans.`); health = health === 'good' ? 'warning' : health; }
  else if (reports > 0) lines.push(`${reports} user report(s) this week - normal levels, but worth a look.`);
  else lines.push('No user reports this week - the community is behaving well.');

  if (errors > 5) { lines.push(`${errors} distinct error events were logged this week. Check the Errors tab - recurring errors hurt user experience.`); health = 'serious'; }
  else if (errors > 0) lines.push(`${errors} error event(s) logged this week - low, but keep an eye on the Errors tab.`);
  else lines.push('No errors logged this week - the app is running cleanly.');

  const features = last7.reduce((acc, d) => {
    for (const [f, n] of Object.entries(d.features || {})) acc[f] = (acc[f] || 0) + n;
    return acc;
  }, {});
  const sorted = rankFeatures(features);
  if (sorted.length) {
    lines.push(`Top features this week: ${sorted.slice(0, 3).map(([f, n]) => `${f} (${n}×)`).join(', ')}.`);
  }

  // Yesterday vs. the same slice of today, so a "we're down" reading is never
  // just an artefact of the day being half over.
  const y = report.yesterdaySoFar;
  lines.push(`Yesterday (${report.yesterdayWindow}): ${report.yesterday.visits} visits, ${report.yesterday.uniques} unique visitors, peak of ${report.yesterday.peakOnline} online at once.`);
  if (y.visits || today.visits) {
    const delta = today.visits - y.visits;
    const dir = delta > 0 ? `ahead by ${delta}` : delta < 0 ? `behind by ${Math.abs(delta)}` : 'exactly level';
    lines.push(`So far today (${y.hoursElapsed}h in) you're ${dir} versus the same point yesterday (${today.visits} vs ${y.visits} visits).`);
  }

  const busiest = last7Days.reduce((best, d) => (d.peakOnline > (best ? best.peakOnline : -1) ? d : best), null);
  if (busiest && busiest.peakOnline) lines.push(`Busiest day of the week: ${busiest.day}, peaking at ${busiest.peakOnline} users online at once.`);
  // Same caveat as the visits comparison above: a week of people measured
  // against a week of people-plus-crawlers is not a trend.
  if (report.changeVsLastWeek.uniques !== null && weekComparable) {
    lines.push(`Unique visitors are ${report.changeVsLastWeek.uniques >= 0 ? 'up' : 'down'} ${Math.abs(report.changeVsLastWeek.uniques)}% week-over-week (${report.last7.uniques} vs ${report.prev7.uniques}).`);
  } else if (report.last7.uniques) {
    lines.push(`${report.last7.uniques} unique human visitors in the last 7 days. Week-over-week comparison resumes once both weeks exclude crawlers.`);
  }

  lines.push(`Right now: ${runtime.online} user(s) online, today's peak was ${today.peakOnline} (day measured in ${report.timezone}, ${report.offset}).`);

  return { health, summary: lines };
}

// --- Module wiring ---
function createAdmin({ io, getRuntime, getLiveCounts, kickBanned, deliverWarning, deliverFeedbackReply, getLiveGames }) {
  const router = express.Router();
  router.use(express.json({ limit: '64kb' }));

  // --- Live stream (Server-Sent Events) ---------------------------------------
  // One shared 1s ticker for every open dashboard tab. It only writes when the
  // numbers actually change, plus a comment line every 20s so proxies keep the
  // connection open. Stops itself when the last tab goes away.
  const MAX_STREAMS = 20;
  const streams = new Set();
  let streamTimer = null;
  let lastCounts = '';
  let lastWriteAt = 0;
  let lastAuthCheck = 0;

  function streamTick() {
    if (!streams.size) {
      clearInterval(streamTimer);
      streamTimer = null;
      lastCounts = '';
      return;
    }
    const now = Date.now();
    // A session can expire or be logged out while its stream is open.
    if (now - lastAuthCheck > 60000) {
      lastAuthCheck = now;
      for (const s of streams) {
        if (!validSession(s.req)) { streams.delete(s); s.res.end(); }
      }
    }
    const counts = JSON.stringify(getLiveCounts());
    if (counts !== lastCounts) {
      lastCounts = counts;
      lastWriteAt = now;
      const frame = `data: ${counts.slice(0, -1)},"ts":${now}}\n\n`;
      for (const s of streams) s.res.write(frame);
    } else if (now - lastWriteAt > 20000) {
      lastWriteAt = now;
      for (const s of streams) s.res.write(': ping\n\n');
    }
  }

  // Hardened headers for everything under /owner.
  router.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
  });

  // First-run setup: only available while no admin exists.
  router.get('/api/status', (req, res) => {
    const b = store.backendStatus;
    res.json({
      setupDone: !!store.data.admin,
      authed: validSession(req),
      // Backend health, so a misconfigured DB is visible on the login screen
      // without needing server logs. No secrets - host only, never the URL.
      storage: {
        configured: b.configured,
        mode: b.mode,
        host: b.host,
        error: b.error,
        dataDir: b.dataDir,
        // File backend on storage that is not a mounted volume: everything
        // stored is discarded by the next deploy. This is the case that has
        // actually been losing data, and atRisk below used to miss it
        // entirely - it only fired when DATABASE_URL was set and broken, never
        // when it was simply absent.
        ephemeral: b.mode !== 'postgres' && b.ephemeral === true,
        // Data will not survive: either the configured database is unreachable,
        // or the fallback file store is sitting on disposable storage.
        // The database is unreachable but the server is serving and saving the
        // copy on the Fly volume, which it pushes up when the database is back.
        // Nothing is being lost, so this is a notice, not an alarm.
        offline: b.mode === 'postgres-offline',
        atRisk: (b.configured && b.mode !== 'postgres' && b.mode !== 'postgres-offline')
          || (b.mode !== 'postgres' && b.ephemeral === true),
      },
    });
  });

  router.post('/api/setup', async (req, res) => {
    if (store.data.admin) return res.status(403).json({ error: 'Setup already completed.' });
    const { password } = req.body || {};
    if (!password || password.length < 10) {
      return res.status(400).json({ error: 'Password must be at least 10 characters.' });
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const secret = totp.generateSecret();
    // Held pending until the first correct code confirms the authenticator scan.
    pendingSetup = { passwordHash: await hashPassword(password, salt), salt, totpSecret: secret };
    const url = totp.otpauthURL(secret, OWNER_EMAIL || 'owner', 'TalkLive Dashboard');
    let qr = null;
    if (QRCode) qr = await QRCode.toDataURL(url, { margin: 1, width: 220 });
    res.json({ ok: true, secret, otpauth: url, qr });
  });

  let pendingSetup = null;
  router.post('/api/setup-confirm', (req, res) => {
    if (store.data.admin) return res.status(403).json({ error: 'Setup already completed.' });
    if (!pendingSetup) return res.status(400).json({ error: 'Run setup first.' });
    const { code } = req.body || {};
    if (!totp.verifyCode(pendingSetup.totpSecret, code)) {
      return res.status(401).json({ error: 'Wrong code. Check your authenticator app and try again.' });
    }
    store.data.admin = { ...pendingSetup, createdAt: Date.now() };
    pendingSetup = null;
    store.audit('setup', reqIp(req), 'Dashboard admin created');
    store.persistNow();
    const token = createSession(reqIp(req));
    res.setHeader('Set-Cookie', `tl_owner=${token}; HttpOnly; Path=/owner; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
    res.json({ ok: true });
  });

  router.post('/api/login', async (req, res) => {
    const ip = reqIp(req);
    if (rateLimited(ip)) return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
    const admin = store.data.admin;
    if (!admin) return res.status(400).json({ error: 'Dashboard not set up yet.' });
    const { password, code } = req.body || {};
    const passOk = typeof password === 'string' && !!password
      && safeEqual(await hashPassword(password, admin.salt), admin.passwordHash);
    const codeOk = totp.verifyCode(admin.totpSecret, code);
    if (!passOk || !codeOk) {
      noteFailedLogin(ip);
      store.audit('login_failed', ip, passOk ? 'bad TOTP code' : 'bad password');
      return res.status(401).json({ error: 'Invalid password or authenticator code.' });
    }
    loginAttempts.delete(ip);
    store.audit('login', ip, 'Dashboard login');
    const token = createSession(ip);
    res.setHeader('Set-Cookie', `tl_owner=${token}; HttpOnly; Path=/owner; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
    res.json({ ok: true });
  });

  router.post('/api/logout', (req, res) => {
    const cookies = String(req.headers.cookie || '');
    const match = cookies.match(/(?:^|;\s*)tl_owner=([a-f0-9]{64})/);
    if (match) store.data.sessions = store.data.sessions.filter((s) => !safeEqual(s.token, match[1]));
    store.save();
    res.setHeader('Set-Cookie', 'tl_owner=; HttpOnly; Path=/owner; Max-Age=0');
    res.json({ ok: true });
  });

  // Everything below requires a valid session.
  router.use('/api', (req, res, next) => {
    if (!validSession(req)) return res.status(401).json({ error: 'Not authenticated.' });
    next();
  });

  // Reports are rebuilt from the whole store on every poll, and each open
  // dashboard tab polls on its own. Identical GETs within a few seconds share
  // one answer; any write (ban, delete, settings...) clears it so actions
  // show up at once. Streams, audio and exports are never cached.
  const REPORT_TTL = 5000;
  const reportCache = new Map();
  router.use('/api', (req, res, next) => {
    if (req.method !== 'GET') { reportCache.clear(); return next(); }
    if (/^\/(live\/stream|status|export\/|voice-notes\/.+\/audio)/.test(req.path)) return next();
    const key = req.originalUrl;
    const hit = reportCache.get(key);
    if (hit && Date.now() - hit.at < REPORT_TTL) return res.json(hit.body);
    const json = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode === 200) {
        if (reportCache.size > 200) reportCache.clear();
        reportCache.set(key, { at: Date.now(), body });
      }
      return json(body);
    };
    next();
  });

  // Summing 30 days of per-country/city/feature maps was the most expensive
  // part of the Overview (tens of thousands of keys, every 12s poll). Only
  // today's UTC day is still being written, so the other 29 are summed once
  // and cached until the day rolls over; today is added on top each time.
  let aggCache = { sig: '', fields: {} };
  function aggregateDays(days, keys, field) {
    const done = keys.slice(0, -1);
    const sig = done.join(',');
    if (aggCache.sig !== sig) aggCache = { sig, fields: {} };
    let base = aggCache.fields[field];
    if (!base) {
      base = new Map();
      for (const k of done) {
        for (const [name, n] of Object.entries(days[k][field] || {})) base.set(name, (base.get(name) || 0) + n);
      }
      aggCache.fields[field] = base;
    }
    const out = Object.fromEntries(base);
    const last = keys[keys.length - 1];
    if (last) for (const [name, n] of Object.entries(days[last][field] || {})) out[name] = (out[name] || 0) + n;
    return out;
  }

  router.get('/api/overview', (req, res) => {
    const runtime = getRuntime();
    const days = store.data.analytics.days;
    const keys = Object.keys(days).sort().slice(-30);
    // The traffic chart and the tiles are cut on the owner's local day, so
    // "today" on the dashboard is the same day the owner is living in.
    const report = activityReport(req);
    const series = report.daily.map((d) => ({
      day: d.day, visits: d.visits, uniques: d.uniques, connections: d.connections, matches: d.matches,
      messages: d.messages, reports: d.reports, errors: d.errors, peakOnline: d.peakOnline, newAccounts: d.newAccounts,
      bots: d.bots,
    }));
    const today = report.today;
    const agg = (field) => aggregateDays(days, keys, field);
    const topics = Object.entries(store.data.analytics.topics).sort((a, b) => b[1] - a[1]).slice(0, 30);
    res.json({
      // Everyone online, with IPs, is the Live tab's job; the Overview only
      // needs the counts, so don't ship (and serialise) the whole list here.
      runtime: { ...runtime, users: undefined },
      timezone: report.timezone,
      offset: report.offset,
      todayWindow: report.todayWindow,
      yesterdayWindow: report.yesterdayWindow,
      today: { day: today.day, visits: today.visits, uniques: today.uniques, connections: today.connections, matches: today.matches, peakOnline: today.peakOnline, bots: today.bots },
      yesterday: { day: report.yesterday.day, visits: report.yesterday.visits, uniques: report.yesterday.uniques, connections: report.yesterday.connections, matches: report.yesterday.matches, peakOnline: report.yesterday.peakOnline, bots: report.yesterday.bots },
      yesterdaySoFar: report.yesterdaySoFar,
      changeVsYesterday: report.changeVsYesterday,
      totals: store.data.analytics.totals,
      series,
      countries: Object.entries(agg('countries')).sort((a, b) => b[1] - a[1]).slice(0, 15),
      cities: Object.entries(agg('cities')).sort((a, b) => b[1] - a[1]).slice(0, 15),
      features: rankFeatures(agg('features')),
      // Human page views by area of the site, and crawler hits by crawler.
      // Both are new: before this the dashboard could see neither.
      sections: Object.entries(agg('sections')).sort((a, b) => b[1] - a[1]),
      crawlers: Object.entries(agg('crawlers')).sort((a, b) => b[1] - a[1]).slice(0, 15),
      // The day visitor counts stopped including crawlers, so the UI can mark
      // the discontinuity rather than draw one misleading line across it.
      humanSince: store.data.analytics.humanSince || null,
      topics,
      conclusion: generateConclusion(runtime, report),
      maintenance: store.data.settings.maintenance,
      devBanner: store.data.settings.devBanner,
      counts: {
        reports: store.data.reports.length,
        unhandledReports: store.data.reports.filter((r) => !r.handled).length,
        errors: store.data.errors.length,
        feedback: store.data.feedback.length,
        activeBans: store.activeBans().length,
        accounts: Object.keys(store.data.accountsRegistry).length,
        premium: premiumRows().filter((r) => r.status === 'active').length,
      },
    });
  });

  router.get('/api/online', (req, res) => {
    const runtime = getRuntime();
    res.json({ users: runtime.users, live: runtime.live });
  });

  router.get('/api/live/stream', (req, res) => {
    if (streams.size >= MAX_STREAMS) return res.status(429).json({ error: 'Too many open dashboard streams.' });
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Accel-Buffering', 'no');
    req.socket.setTimeout(0);
    const client = { req, res };
    streams.add(client);
    // First frame immediately, so the page never shows a blank counter.
    res.write(`retry: 3000\ndata: ${JSON.stringify({ ...getLiveCounts(), ts: Date.now() })}\n\n`);
    req.on('close', () => streams.delete(client));
    if (!streamTimer) streamTimer = setInterval(streamTick, 1000);
  });

  // Activity reports: today (hour by hour), yesterday, the last 30 days and the
  // last 8 weeks - all cut on the owner's timezone rather than on UTC.
  router.get('/api/activity', (req, res) => {
    const report = activityReport(req);
    res.json({
      ...report,
      runtime: getRuntime(),
      savedTimezone: store.data.settings.timezone || 'UTC',
      // Flagged so the UI can say which days predate hourly recording and
      // therefore couldn't be re-cut precisely on the local day boundary.
      estimatedDays: report.daily.filter((d) => d.estimated).map((d) => d.day),
    });
  });

  // Audience (gender, age group, device, language, new vs returning) and
  // experience (wait, give-ups, call length, pairings, ratings) over the last
  // 1, 7 or 30 UTC days, plus a live breakdown of who is connected now.
  function audienceReport(req) {
    const range = [1, 7, 30].includes(Number(req.query.range)) ? Number(req.query.range) : 7;
    return audience.buildReport(store.data.analytics.days, range, getRuntime().users);
  }
  router.get('/api/audience', (req, res) => {
    res.json(audienceReport(req));
  });

  // Visits and activity between any two local times ("7am to 7am the next
  // day"), or a run of such days starting at a chosen hour.
  router.get('/api/window', (req, res) => {
    const tz = String(req.query.tz || store.data.settings.timezone || 'UTC');
    const shifted = analytics.shiftedDays(store.data.analytics.days, { tz, startHour: req.query.startHour, count: req.query.count });
    if (!req.query.preset && !req.query.from && !req.query.to) return res.json({ shifted });
    const report = analytics.windowReport(store.data.analytics.days, {
      from: String(req.query.from || ''), to: String(req.query.to || ''), tz,
      preset: req.query.preset ? String(req.query.preset) : '', startHour: req.query.startHour,
    });
    if (report.error) return res.status(400).json({ error: report.error });
    res.json({ ...report, shifted });
  });

  router.post('/api/timezone', (req, res) => {
    const tz = (req.body || {}).timezone;
    if (!analytics.isValidTimezone(tz)) return res.status(400).json({ error: 'Unknown timezone.' });
    store.data.settings.timezone = tz;
    store.audit('timezone', reqIp(req), `Report timezone set to ${tz}`);
    store.persistNow();
    res.json({ ok: true, timezone: tz });
  });

  router.get('/api/reports', (req, res) => {
    const counts = store.reportCounts();
    // ?user=<clientId> returns every report on that one person, not just the
    // newest 300, so the "Most reported" drill-down shows their full record.
    const user = typeof req.query.user === 'string' ? req.query.user : '';
    // ?status=open|handled filters before the 300 cap so older handled
    // reports are still reachable.
    const status = req.query.status;
    let source = user
      ? store.data.reports.filter((r) => r.reported && r.reported.clientId === user)
      : store.data.reports;
    if (status === 'handled') source = source.filter((r) => r.handled);
    else if (status === 'open') source = source.filter((r) => !r.handled);
    if (!user) source = source.slice(0, 300);
    const withCounts = source.map((r) => ({
      ...r,
      totalReportsOnUser: r.reported ? counts.get(r.reported.clientId) || 0 : 0,
      activeBan: r.reported ? !!store.findActiveBan(r.reported.clientId, r.reported.ip) : false,
    }));
    // Leaderboard of the most-reported people over the chosen window (days,
    // 0 = everything on record), with their ban state for one-click action.
    const days = Math.max(0, Math.min(Number(req.query.days) || 0, 3650));
    const since = days ? Date.now() - days * 86400000 : 0;
    const top = store.topReported({ since, limit: 100 }).map((u) => ({
      ...u,
      activeBan: !!store.findActiveBan(u.clientId, u.ip),
    }));
    const reasons = new Map();
    for (const r of store.data.reports) {
      if (r.ts < since) continue;
      const k = r.reason || 'Other';
      reasons.set(k, (reasons.get(k) || 0) + 1);
    }
    res.json({
      reports: withCounts,
      total: store.data.reports.length,
      open: store.data.reports.filter((r) => !r.handled).length,
      handled: store.data.reports.filter((r) => r.handled).length,
      top,
      days,
      reasons: [...reasons.entries()].sort((a, b) => b[1] - a[1]),
    });
  });

  router.post('/api/reports/:id/handled', (req, res) => {
    const rec = store.data.reports.find((r) => r.id === req.params.id);
    if (!rec) return res.status(404).json({ error: 'Report not found.' });
    rec.handled = true;
    store.save();
    res.json({ ok: true });
  });

  router.post('/api/reports/user/:clientId/handled', (req, res) => {
    const n = store.markReportsHandledFor(req.params.clientId);
    store.audit('reports', reqIp(req), `Marked ${n} report(s) on ${req.params.clientId} handled`);
    res.json({ ok: true, handled: n });
  });

  router.get('/api/bans', (req, res) => {
    res.json({ bans: store.data.bans.slice(0, 300), now: Date.now() });
  });

  router.post('/api/ban', (req, res) => {
    const { clientId, ip, username, country, city, reason, minutes } = req.body || {};
    if (!clientId && !ip) return res.status(400).json({ error: 'clientId or ip required.' });
    const mins = Math.min(Math.max(Number(minutes) || 30, 30), 5 * 365 * 24 * 60); // 30 min .. 5 years
    const ban = store.addBan({ clientId, ip, username, country, city, reason, minutes: mins });
    store.audit('ban', reqIp(req), `Banned ${username || clientId || ip} for ${mins} min - ${reason || 'no reason'}`);
    kickBanned(clientId, ip, ban);
    res.json({ ok: true, ban });
  });

  // Send one person a warning about their behaviour. It appears in the app as a
  // notice they must acknowledge - immediately if they are online, otherwise on
  // their next visit. Nothing is blocked; a ban is still the separate step.
  router.post('/api/warn', (req, res) => {
    const b = req.body || {};
    const clientId = typeof b.clientId === 'string' ? b.clientId.slice(0, 100) : '';
    const account = typeof b.account === 'string' ? b.account.slice(0, 100) : '';
    const message = String(b.message || '').trim().slice(0, 600);
    const reason = String(b.reason || '').trim().slice(0, 80);
    if (!clientId && !account) return res.status(400).json({ error: 'Pick a user to warn.' });
    if (message.length < 5) return res.status(400).json({ error: 'Write the warning message (at least 5 characters).' });
    const w = store.addWarning({
      clientId, account,
      username: String(b.username || '').slice(0, 60),
      country: String(b.country || '').slice(0, 60),
      reason, message,
    });
    const sentTo = deliverWarning ? deliverWarning(w) : 0;
    store.audit('warn', reqIp(req), `Warned ${w.username || clientId || account}${reason ? ` (${reason})` : ''}${sentTo ? ' - delivered live' : ' - queued for next visit'}`);
    res.json({ ok: true, warning: w, delivered: sentTo > 0 });
  });

  // Every warning, newest first, or one person's history when clientId /
  // account is given (the send dialog shows it before you write another).
  router.get('/api/warnings', (req, res) => {
    const clientId = String(req.query.clientId || '');
    const account = String(req.query.account || '').toLowerCase();
    let list = store.data.warnings || [];
    if (clientId || account) list = list.filter((w) => (clientId && w.clientId === clientId) || (account && w.account === account));
    res.json({ warnings: list.slice(0, 500), total: list.length });
  });

  router.post('/api/warnings/:id/withdraw', (req, res) => {
    const w = store.withdrawWarning(req.params.id);
    if (!w) return res.status(404).json({ error: 'Already acknowledged, withdrawn or not found.' });
    store.audit('warn_withdraw', reqIp(req), `Withdrew warning to ${w.username || w.clientId || w.account}`);
    res.json({ ok: true });
  });

  router.post('/api/unban', (req, res) => {
    const ban = store.liftBan((req.body || {}).banId);
    if (!ban) return res.status(404).json({ error: 'Ban not found or already lifted.' });
    store.audit('unban', reqIp(req), `Lifted ban on ${ban.username || ban.clientId || ban.ip}`);
    res.json({ ok: true });
  });

  router.get('/api/errors', (req, res) => {
    res.json({ errors: store.data.errors.slice(0, 300) });
  });

  // Errors are collapsed by message and never expire on their own, so a bug
  // fixed weeks ago keeps sitting at the top of the tab. Let the owner clear
  // one (or all) and see whether it comes back.
  router.post('/api/errors/dismiss', (req, res) => {
    const { id, all } = req.body || {};
    if (all) {
      const n = store.data.errors.length;
      store.data.errors = [];
      store.audit('errors_cleared', reqIp(req), `Cleared ${n} error record(s)`);
    } else {
      const before = store.data.errors.length;
      store.data.errors = store.data.errors.filter((e) => e.id !== id);
      if (store.data.errors.length === before) return res.status(404).json({ error: 'Error not found.' });
    }
    store.persistNow();
    res.json({ ok: true, remaining: store.data.errors.length });
  });

  router.get('/api/feedback', (req, res) => {
    // clientId/account stay server-side; the dashboard only needs to know
    // whether a reply is possible.
    res.json({
      feedback: store.data.feedback.slice(0, 300).map(({ clientId, account, ...f }) => ({ ...f, canReply: !!(clientId || account) })),
    });
  });

  // Reply to one feedback message. Shown in the app to whoever sent it - now if
  // they are online, otherwise on their next visit. Replying again replaces it.
  router.post('/api/feedback/:id/reply', (req, res) => {
    const text = String((req.body || {}).message || '').trim().slice(0, 1000);
    if (text.length < 2) return res.status(400).json({ error: 'Write the reply first.' });
    const f = store.setFeedbackReply(req.params.id, text);
    if (!f) return res.status(404).json({ error: 'Feedback not found, or sent before replies were supported.' });
    const sentTo = deliverFeedbackReply ? deliverFeedbackReply(f) : 0;
    store.audit('feedback-reply', reqIp(req), `Replied to feedback from ${f.username || 'unknown'}${sentTo ? ' - delivered live' : ' - queued for next visit'}`);
    const { clientId, account, ...out } = f;
    res.json({ ok: true, feedback: { ...out, canReply: true }, delivered: sentTo > 0 });
  });

  router.get('/api/accounts', (req, res) => {
    const accounts = Object.entries(store.data.accountsRegistry)
      .map(([key, a]) => {
        // The credentials record holds the Google profile the user consented to
        // share; the registry holds the analytics metadata. The dashboard wants
        // both on one row, so join them here (credentials win - they are
        // refreshed on every Google sign-in), and never leak the password hash.
        const cred = (store.data.accounts || {})[key] || {};
        const g = cred.google || null;
        return {
          key,
          ...a,
          clientId: cred.clientId || a.clientId || null,
          email: (g && g.email) || cred.email || a.email || null,
          google: g && {
            id: g.sub || null,
            email: g.email || null,
            emailVerified: !!g.emailVerified,
            name: g.name || null,
            givenName: g.givenName || null,
            familyName: g.familyName || null,
            picture: g.picture || null,
            locale: g.locale || null,
            hostedDomain: g.hostedDomain || null,
            linkedAt: g.linkedAt || null,
            lastSignInAt: g.lastSignInAt || null,
          },
        };
      })
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    res.json({ accounts });
  });

  // --- Chat transcripts -----------------------------------------------------
  //
  // Reading chat for quality is a conversation-level job, not a message-level
  // one: a flat feed of the newest 500 lines from 200 different pairs cannot be
  // read at all. So the store is folded into conversations here, each one
  // scored, and the client asks for the messages of a single conversation only
  // when it opens it. That keeps the list response a few kB no matter how much
  // is stored, which is what makes the tab usable on a phone.

  // Patterns worth an operator's attention, cheapest and most specific first.
  // These are triage hints for a human, never an automated action - so they are
  // deliberately broad, and a false positive costs one glance.
  // Shared with voice-message tagging, see moderation-tags.js.
  const { SEVERE, riskFlags } = modTags;

  // Folds the flat transcript store into conversations, newest activity first.
  // `store.data.transcripts` is newest-first and capped at 5000, so this is a
  // single pass over a bounded list.
  function buildConversations() {
    const byPair = new Map();
    for (const m of store.data.transcripts) {
      const key = m.pair || `${m.fromClientId}|${m.toClientId}`;
      let c = byPair.get(key);
      if (!c) {
        c = {
          pair: key,
          kind: m.kind || 'stranger',
          country: m.country || '',
          count: 0,
          start: m.ts,
          end: m.ts,
          // clientId -> display name, so a conversation knows both sides even
          // when only one of them ever sent anything.
          people: new Map(),
          senders: new Set(),
          flags: new Set(),
          severe: 0,
          // The store is newest-first, so the message that creates the
          // conversation is its most recent one - seed the preview from it here
          // rather than waiting for a later message to beat c.end, which by
          // construction none of them can.
          preview: String(m.text || '').slice(0, 120),
          messages: [],
        };
        byPair.set(key, c);
      }
      const flags = riskFlags(m.text);
      for (const f of flags) {
        c.flags.add(f);
        if (SEVERE.has(f)) c.severe++;
      }
      c.count++;
      if (m.ts > c.end) { c.end = m.ts; c.preview = String(m.text || '').slice(0, 120); }
      if (m.ts < c.start) c.start = m.ts;
      if (m.fromClientId) { c.people.set(m.fromClientId, m.from); c.senders.add(m.fromClientId); }
      if (m.toClientId) if (!c.people.has(m.toClientId)) c.people.set(m.toClientId, m.to);
      if (!c.country && m.country) c.country = m.country;
      c.messages.push({
        ts: m.ts,
        from: m.from,
        fromClientId: m.fromClientId,
        text: m.text,
        flags,
        id: m.msgId || null,
        replyTo: m.replyTo || null,
      });
    }
    return byPair;
  }

  // The list row: everything needed to decide whether to open it, and nothing
  // else. Message bodies stay behind the detail request.
  function conversationMeta(c) {
    const people = [...c.people.entries()].map(([clientId, name]) => ({
      clientId, name: name || clientId, spoke: c.senders.has(clientId),
    }));
    return {
      pair: c.pair,
      kind: c.kind,
      country: c.country,
      count: c.count,
      start: c.start,
      end: c.end,
      people,
      flags: [...c.flags],
      severe: c.severe,
      preview: c.preview,
      // A conversation only one side ever spoke in is the signature of a bot,
      // a scraper, or someone who got ignored - all worth seeing at a glance.
      oneSided: c.senders.size < 2,
    };
  }

  router.get('/api/transcripts', (req, res) => {
    const q = String(req.query.q || '').toLowerCase().trim();
    const pair = String(req.query.pair || '');
    const byPair = buildConversations();

    // Detail view: one conversation, oldest message first so it reads top down.
    if (pair) {
      const c = byPair.get(pair);
      if (!c) return res.status(404).json({ error: 'not found' });
      const meta = conversationMeta(c);
      meta.messages = c.messages.slice().reverse();
      return res.json({ conversation: meta });
    }

    let list = [...byPair.values()];
    if (q) {
      list = list.filter((c) => {
        for (const [clientId, name] of c.people) {
          if (clientId.toLowerCase().includes(q) || String(name || '').toLowerCase().includes(q)) return true;
        }
        return c.messages.some((m) => String(m.text || '').toLowerCase().includes(q));
      });
    }
    const kind = String(req.query.kind || '');
    if (kind === 'friend' || kind === 'stranger') list = list.filter((c) => c.kind === kind);
    if (req.query.flagged === '1') list = list.filter((c) => c.flags.size > 0);

    const sort = String(req.query.sort || 'recent');
    if (sort === 'longest') list.sort((a, b) => b.count - a.count || b.end - a.end);
    else if (sort === 'risk') list.sort((a, b) => (b.severe - a.severe) || (b.flags.size - a.flags.size) || (b.end - a.end));
    else list.sort((a, b) => b.end - a.end);

    res.json({
      total: store.data.transcripts.length,
      conversations: list.slice(0, 250).map(conversationMeta),
      matched: list.length,
    });
  });

  // Friend voice messages, newest first, with their transcript and triage
  // tags. Audio is fetched per clip, only when the owner presses play.
  router.get('/api/voice-notes', async (req, res) => {
    try {
      const q = String(req.query.q || '').toLowerCase().trim();
      const all = await store.listVoiceNotes(500);
      let list = all;
      if (req.query.flagged === '1') list = list.filter((n) => n.tags && n.tags.flags && n.tags.flags.length);
      if (q) {
        list = list.filter((n) => [n.fromName, n.toName, n.from, n.to, n.transcript,
          ...((n.tags && n.tags.topics) || []), ...((n.tags && n.tags.flags) || [])]
          .some((v) => String(v || '').toLowerCase().includes(q)));
      }
      const flagged = all.filter((n) => n.tags && n.tags.flags && n.tags.flags.length).length;
      const severe = (n) => ((n.tags && n.tags.flags) || []).some((f) => SEVERE.has(f));
      if (req.query.sort === 'risk') list = list.slice().sort((a, b) => (severe(b) - severe(a)) || (b.ts - a.ts));
      res.json({
        total: all.length,
        flagged,
        matched: list.length,
        ai: modTags.aiConfigured(),
        notes: list.slice(0, 200).map((n) => ({ ...n, severe: severe(n) })),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  const listenLog = new Map(); // id -> ts, so replays and range requests log once
  router.get('/api/voice-notes/:id/audio', async (req, res) => {
    const id = String(req.params.id || '');
    if (!/^v[a-f0-9]{24}$/.test(id)) return res.status(404).json({ error: 'not found' });
    try {
      const rec = await store.getVoiceNote(id);
      if (!rec) return res.status(404).json({ error: 'not found' });
      // Listening to someone's voice message is logged, like any other
      // moderation action.
      const last = listenLog.get(id) || 0;
      if (Date.now() - last > 10 * 60000) {
        listenLog.set(id, Date.now());
        store.audit('voice_listen', reqIp(req), id);
      }
      res.setHeader('Content-Type', rec.mime || 'audio/webm');
      res.setHeader('Content-Length', rec.bytes.length);
      res.end(rec.bytes);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Talk time per person, re-cut to a range: all | today | 7d | 30d.
  function talkTimeRows(range) {
    const days = range === 'today' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : 0;
    const since = days ? store.dayKey(Date.now() - (days - 1) * 86400000) : '';
    const rows = [];
    for (const [clientId, r] of Object.entries(store.data.talkTime || {})) {
      let seconds = r.seconds || 0;
      let calls = r.calls || 0;
      if (days) {
        seconds = 0; calls = 0;
        for (const [k, d] of Object.entries(r.days || {})) if (k >= since) { seconds += d.s || 0; calls += d.n || 0; }
      }
      if (!calls) continue;
      const key = store.findUsernameByClientId(clientId);
      const acc = key ? (store.data.accountsRegistry[key] || {}) : null;
      rows.push({
        clientId,
        username: r.username || (acc && acc.username) || clientId,
        account: acc ? (acc.username || key) : null,
        country: r.country || '',
        seconds,
        calls,
        avg: Math.round(seconds / calls),
        longest: r.longest || 0,
        lastAt: r.lastAt || 0,
      });
    }
    return rows.sort((a, b) => b.seconds - a.seconds);
  }

  router.get('/api/talktime', (req, res) => {
    res.json({ rows: talkTimeRows(String(req.query.range || 'all')) });
  });

  // --- Daily log: one row per UTC day, from every counter the store keeps ------
  // Newer counters (calls, games, signed-in users) didn't exist on the oldest
  // days; those cells fall back to the closest older counter and are listed in
  // `est` so the dashboard can mark them as estimates.
  function dailyRows() {
    const days = store.data.analytics.days || {};
    // Talk time per day from the per-person records (last 30 days). Each call
    // is recorded once per side, so the sum is halved.
    const talkByDay = {};
    for (const rec of Object.values(store.data.talkTime || {})) {
      for (const [k, d] of Object.entries(rec.days || {})) talkByDay[k] = (talkByDay[k] || 0) + (d.s || 0) / 2;
    }
    // Every day from the first record to today, so a day with no traffic shows
    // as a zero row instead of silently missing from the list.
    const keys = [];
    const first = Object.keys(days).sort()[0];
    for (let t = Date.now(); first && store.dayKey(t) >= first; t -= 86400000) keys.push(store.dayKey(t));
    const rows = [];
    for (const key of keys) {
      const d = days[key] || {};
      const f = d.features || {};
      const est = [];
      const visits = d.visits || 0;
      const uniques = Math.min(d.uniques || 0, visits);
      const life = (d.people && d.people.lifecycle) || {};
      let registered = d.registered;
      if (registered === undefined) {
        registered = (f.login || 0) + (f.google_signin || 0) + (f.signup || 0);
        if (registered) est.push('registered');
      }
      let calls = d.calls ? d.calls.n : undefined;
      if (calls === undefined) {
        calls = (f.conversation_real || 0) + (f.conversation_brief || 0) || (d.matches || 0) + (f.chat_match || 0);
        if (calls) est.push('calls');
      }
      let talkSeconds = d.calls ? d.calls.s : undefined;
      if (talkSeconds === undefined) {
        talkSeconds = Math.round(talkByDay[key] || 0);
        if (talkSeconds) est.push('talk');
      }
      let games = d.games ? d.games.sess : undefined;
      if (games === undefined) {
        games = f.mini_game || 0;
        if (games) est.push('games');
      }
      rows.push({
        day: key,
        visits,
        uniques,
        repeat: visits - uniques,
        registered,
        people: (d.people && d.people.n) || 0,
        newPeople: life.new || 0,
        returningPeople: (life['1-7d'] || 0) + (life['8-30d'] || 0) + (life['30d+'] || 0),
        talkSeconds,
        calls,
        messages: d.messages || 0,
        clicks: Object.values(f).reduce((a, v) => a + (v || 0), 0),
        games,
        voiceNotes: f.chat_voice || 0,
        signups: d.newAccounts || 0,
        peakOnline: d.peakOnline || 0,
        est,
      });
    }
    return rows;
  }

  router.get('/api/daily', (req, res) => {
    res.json({ rows: dailyRows(), today: store.dayKey() });
  });

  // --- Mini games: who played, for how long, and who turned invites down ------
  const GAME_NAMES = { ttt: 'Tic Tac Toe', dab: 'Dots & Boxes' };
  function rangeDays(range) {
    const n = range === 'today' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : 0;
    if (!n) return null; // all time
    const out = [];
    for (let i = n - 1; i >= 0; i--) out.push(store.dayKey(Date.now() - i * 86400000));
    return out;
  }
  function gameCounters(rec, days) {
    if (!days) return rec.t || {};
    const t = {};
    for (const k of days) {
      const d = rec.days && rec.days[k];
      if (d) for (const f of store.GAME_FIELDS) t[f] = (t[f] || 0) + (d[f] || 0);
    }
    return t;
  }
  function gameRows(range) {
    const days = rangeDays(range);
    const rows = [];
    for (const [clientId, rec] of Object.entries((store.data.games || {}).players || {})) {
      const t = gameCounters(rec, days);
      if (!t.r && !t.sent && !t.recv) continue;
      const key = store.findUsernameByClientId(clientId);
      const acc = key ? (store.data.accountsRegistry[key] || {}) : null;
      const bg = rec.byGame || {};
      const fav = Object.keys(bg).sort((a, b) => (bg[b].r || 0) - (bg[a].r || 0))[0] || '';
      const fin = (t.w || 0) + (t.l || 0) + (t.d || 0);
      rows.push({
        clientId,
        username: rec.username || (acc && acc.username) || clientId,
        account: acc ? (acc.username || key) : null,
        country: rec.country || '',
        seconds: t.s || 0,
        sessions: t.n || 0,
        rounds: t.r || 0,
        wins: t.w || 0,
        losses: t.l || 0,
        draws: t.d || 0,
        winRate: fin ? Math.round((t.w || 0) / fin * 100) : null,
        invitesSent: t.sent || 0,
        sentAccepted: t.sAcc || 0,
        invitesReceived: t.recv || 0,
        accepted: t.acc || 0,
        declined: t.dec || 0,
        ignored: t.ign || 0,
        withdrawn: t.can || 0,
        favorite: fav ? (GAME_NAMES[fav] || fav) : '',
        firstAt: rec.firstAt || 0,
        lastAt: rec.lastAt || 0,
      });
    }
    return rows.sort((a, b) => b.seconds - a.seconds || b.rounds - a.rounds);
  }
  function gamesReport(range) {
    const days = rangeDays(range);
    const allDays = store.data.analytics.days || {};
    const keys = days || Object.keys(allDays).sort();
    const sum = { inv: 0, acc: 0, dec: 0, ign: 0, can: 0, waitMs: 0, sess: 0, rounds: 0, fin: 0, draws: 0, secs: 0 };
    const byGame = {};
    const byMode = {};
    const addSlot = (to, from) => {
      for (const [k, v] of Object.entries(from || {})) {
        const o = to[k] || (to[k] = { inv: 0, acc: 0, sess: 0, rounds: 0, secs: 0 });
        for (const f of Object.keys(o)) o[f] += v[f] || 0;
      }
    };
    for (const k of keys) {
      const g = allDays[k] && allDays[k].games;
      if (!g) continue;
      for (const f of Object.keys(sum)) sum[f] += g[f] || 0;
      addSlot(byGame, g.byGame);
      addSlot(byMode, g.byMode);
    }
    const rows = gameRows(range);
    const players = rows.filter((r) => r.rounds > 0).length;
    const talkers = talkTimeRows(range).length;
    const pct = (a, b) => (b ? Math.round(a / b * 1000) / 10 : 0);
    // Daily trend over the last 30 days, with unique players per day.
    const trendKeys = rangeDays('30d');
    const playersPerDay = {};
    for (const rec of Object.values((store.data.games || {}).players || {})) {
      for (const [k, d] of Object.entries(rec.days || {})) if (d.r) playersPerDay[k] = (playersPerDay[k] || 0) + 1;
    }
    const daily = trendKeys.map((k) => {
      const g = (allDays[k] && allDays[k].games) || {};
      return { day: k, invites: g.inv || 0, accepted: g.acc || 0, declined: g.dec || 0, ignored: g.ign || 0, sessions: g.sess || 0, rounds: g.rounds || 0, seconds: g.secs || 0, players: playersPerDay[k] || 0 };
    });
    const since = days ? Date.parse(days[0] + 'T00:00:00Z') : 0;
    const log = ((store.data.games || {}).log || []).filter((x) => x.ts >= since).slice(0, 100)
      .map((x) => ({ ...x, gameName: GAME_NAMES[x.game] || x.game }));
    const notAccepted = sum.dec + sum.ign;
    return {
      range,
      summary: {
        players,
        talkers,
        playedPct: Math.min(100, pct(players, talkers)),
        sessions: sum.sess,
        rounds: sum.rounds,
        finished: sum.fin,
        draws: sum.draws,
        seconds: sum.secs,
        invites: sum.inv,
        accepted: sum.acc,
        declined: sum.dec,
        ignored: sum.ign,
        cancelled: sum.can,
        notAccepted,
        answered: sum.inv - sum.can,
        acceptRate: pct(sum.acc, sum.inv - sum.can),
        declineRate: pct(notAccepted, sum.inv - sum.can),
        avgAcceptWait: sum.acc ? Math.round(sum.waitMs / sum.acc / 1000) : 0,
        avgSession: sum.sess ? Math.round(sum.secs / sum.sess) : 0,
        avgRound: sum.rounds ? Math.round(sum.secs / sum.rounds) : 0,
        roundsPerSession: sum.sess ? Math.round(sum.rounds / sum.sess * 10) / 10 : 0,
        avgPerPlayer: players ? Math.round(rows.reduce((a, r) => a + r.seconds, 0) / players) : 0,
      },
      byGame: Object.entries(byGame).map(([k, v]) => ({ game: k, name: GAME_NAMES[k] || k, ...v, acceptRate: pct(v.acc, v.inv), avgRound: v.rounds ? Math.round(v.secs / v.rounds) : 0 })),
      byMode: Object.entries(byMode).map(([k, v]) => ({ mode: k, name: k === 'chat' ? 'Text chat' : 'Voice call', ...v, acceptRate: pct(v.acc, v.inv) })),
      daily,
      live: typeof getLiveGames === 'function' ? getLiveGames() : { sessions: [], pendingInvites: 0 },
      log,
      rows,
    };
  }

  /*
   * Traffic: where visitors came from, the page they landed on, and the search
   * terms known for them (server/traffic.js), over UTC days. ?range=today|7d|
   * 30d|90d. Search Console keywords are a separate call (/api/search-console)
   * because they come from Google and take a moment.
   */
  const TRAFFIC_MEDIUMS = ['search', 'ai', 'social', 'referral', 'campaign', 'app', 'direct'];
  function trafficReport(range) {
    const days = store.data.analytics.days;
    const n = { today: 1, '7d': 7, '30d': 30, '90d': 90 }[range] || 30;
    const keys = Object.keys(days).sort().slice(-n);
    const sum = (field) => {
      const out = {};
      for (const k of keys) for (const [name, v] of Object.entries(days[k][field] || {})) out[name] = (out[name] || 0) + v;
      return Object.entries(out).sort((a, b) => b[1] - a[1]);
    };
    const tracked = Object.keys(days).sort().find((k) => days[k].sources && Object.keys(days[k].sources).length);
    const mediums = sum('mediums');
    return {
      range: range in { today: 1, '7d': 1, '30d': 1, '90d': 1 } ? range : '30d',
      since: tracked || null,
      arrivals: mediums.reduce((a, [, v]) => a + v, 0),
      pageViews: sum('pages').reduce((a, [, v]) => a + v, 0),
      mediums,
      sources: sum('sources'),
      landings: sum('landings'),
      pages: sum('pages'),
      sourcePages: sum('sourcePages').slice(0, 100),
      searchTerms: sum('searchTerms').slice(0, 200),
      termPages: sum('termPages').slice(0, 200),
      daily: keys.map((k) => {
        const m = days[k].mediums || {};
        const row = { day: k };
        for (const x of TRAFFIC_MEDIUMS) row[x] = m[x] || 0;
        return row;
      }),
    };
  }

  router.get('/api/traffic', (req, res) => {
    res.json(trafficReport(String(req.query.range || '30d')));
  });

  router.get('/api/search-console', async (req, res) => {
    res.json(await searchConsole.report(req.query.days));
  });

  // Health tab: call quality, page speed, Google Analytics and uptime
  // (server/health.js). ?refresh=1 bypasses the caches.
  router.get('/api/health', async (req, res) => {
    res.json(await health.report(store, { refresh: req.query.refresh === '1' }));
  });

  router.get('/api/games', (req, res) => {
    res.json(gamesReport(String(req.query.range || '7d')));
  });

  // Subscriptions, referrals and push reach - all read from existing records,
  // nothing here writes or removes anything.
  router.get('/api/premium', (req, res) => {
    const rows = premiumRows();
    const now = Date.now();
    const active = rows.filter((r) => r.status === 'active');
    const bySource = {};
    for (const r of active) bySource[r.source] = (bySource[r.source] || 0) + 1;
    const owners = Object.entries(store.data.referrals.owners || {}).map(([clientId, o]) => ({
      clientId, code: o.code, joined: o.joined || 0, qualified: o.qualified || 0,
      rewardedDays: o.rewardedDays || 0, createdAt: o.createdAt || null,
    }));
    const claims = Object.values(store.data.referrals.claims || {});
    const days = store.data.analytics.days;
    const dayKeys = Object.keys(days).sort().slice(-30);
    res.json({
      rows: rows.slice(0, 500),
      totals: {
        all: rows.length,
        active: active.length,
        permanent: active.filter((r) => r.permanent).length,
        paying: active.filter((r) => r.paying).length,
        expired: rows.filter((r) => r.status === 'expired').length,
        revoked: rows.filter((r) => r.status === 'revoked').length,
        expiringIn7Days: active.filter((r) => r.expiresAt && r.expiresAt - now < 7 * 86400000).length,
      },
      bySource: Object.entries(bySource).sort((a, b) => b[1] - a[1]),
      activations: dayKeys.map((k) => ({
        day: k,
        activated: (days[k].features || {}).premium_activated || 0,
        cancelled: (days[k].features || {}).premium_cancelled || 0,
      })),
      referrals: {
        codes: Object.keys(store.data.referrals.codes || {}).length,
        joined: owners.reduce((a, o) => a + o.joined, 0),
        qualified: owners.reduce((a, o) => a + o.qualified, 0),
        rewardedDays: owners.reduce((a, o) => a + o.rewardedDays, 0),
        pendingClaims: claims.filter((c) => !c.qualified).length,
        top: owners.filter((o) => o.joined).sort((a, b) => b.qualified - a.qualified || b.joined - a.joined).slice(0, 15),
      },
      accounts: Object.keys(store.data.accountsRegistry).length,
      push: {
        subscribers: store.pushSubscriberCount(),
        endpoints: Object.values(store.data.push || {}).reduce((a, l) => a + (l ? l.length : 0), 0),
      },
    });
  });

  // One box that looks everywhere: accounts, live users, bans, reports,
  // feedback and chat messages. Purely a read.
  router.get('/api/search', (req, res) => {
    const q = String(req.query.q || '').trim().toLowerCase();
    if (q.length < 2) return res.json({ q, groups: [] });
    const hit = (...vals) => vals.some((v) => String(v || '').toLowerCase().includes(q));
    const groups = [];
    const push = (kind, label, items) => { if (items.length) groups.push({ kind, label, items }); };

    push('accounts', 'Accounts', Object.entries(store.data.accountsRegistry)
      .filter(([key, a]) => hit(key, a.username, a.nickname, a.country, a.city, a.ip, a.email, a.fullName))
      .slice(0, 12)
      .map(([key, a]) => ({
        title: a.username || key,
        sub: [a.fullName || a.nickname, a.email, a.country, a.method === 'google' ? 'Google' : 'Password'].filter(Boolean).join(' · '),
        ts: a.createdAt || null,
      })));

    const runtime = getRuntime();
    push('live', 'Online now', runtime.users
      .filter((u) => hit(u.username, u.account, u.clientId, u.country, u.city, u.ip))
      .slice(0, 12)
      .map((u) => ({
        title: u.username,
        sub: [u.country, u.inCall ? 'in call' : u.waiting ? 'waiting' : 'idle'].filter(Boolean).join(' · '),
        ts: null,
      })));

    push('bans', 'Bans', store.data.bans
      .filter((b) => hit(b.username, b.clientId, b.ip, b.reason, b.country))
      .slice(0, 12)
      .map((b) => ({
        title: b.username || b.clientId || b.ip,
        sub: `${b.reason || 'no reason'} · ${b.liftedAt ? 'lifted' : b.expiresAt > Date.now() ? 'active' : 'expired'}`,
        ts: b.createdAt || null,
      })));

    push('reports', 'Reports', store.data.reports
      .filter((r) => hit(r.reported && r.reported.username, r.reporter && r.reporter.username, r.reason, r.detail))
      .slice(0, 12)
      .map((r) => ({
        title: (r.reported && r.reported.username) || 'unknown',
        sub: `${r.reason || ''}${r.handled ? ' · handled' : ' · NEW'}`,
        ts: r.ts || null,
      })));

    push('feedback', 'Feedback', store.data.feedback
      .filter((f) => hit(f.username, f.text, f.country))
      .slice(0, 8)
      .map((f) => ({ title: f.username || 'anonymous', sub: String(f.text || '').slice(0, 90), ts: f.ts || null })));

    push('chats', 'Chat messages', store.data.transcripts
      .filter((m) => hit(m.from, m.to, m.text, m.fromClientId))
      .slice(0, 12)
      .map((m) => ({ title: `${m.from} → ${m.to}`, sub: String(m.text || '').slice(0, 90), ts: m.ts || null })));

    res.json({ q, groups });
  });

  // CSV downloads. Every one is a projection of records that stay exactly where
  // they are - exporting never mutates or clears anything.
  function buildCsv(kind, req) {
    let csv = null;
    if (kind === 'overview') {
      // Everything the Overview tab shows, flattened to metric/key/value.
      const days = store.data.analytics.days;
      const keys = Object.keys(days).sort().slice(-30);
      const agg = (field) => aggregateDays(days, keys, field);
      const rows = [];
      for (const [k, v] of Object.entries(store.data.analytics.totals || {})) rows.push(['total_all_time', k, v]);
      rows.push(['count', 'accounts', Object.keys(store.data.accountsRegistry).length]);
      rows.push(['count', 'premium_active', premiumRows().filter((r) => r.status === 'active').length]);
      rows.push(['count', 'active_bans', store.activeBans().length]);
      rows.push(['count', 'reports', store.data.reports.length]);
      rows.push(['count', 'unhandled_reports', store.data.reports.filter((r) => !r.handled).length]);
      rows.push(['count', 'feedback', store.data.feedback.length]);
      rows.push(['count', 'errors', store.data.errors.length]);
      for (const [k, v] of Object.entries(agg('countries')).sort((a, b) => b[1] - a[1])) rows.push(['country_visits_30d', k, v]);
      for (const [k, v] of Object.entries(agg('cities')).sort((a, b) => b[1] - a[1])) rows.push(['city_visits_30d', k, v]);
      for (const [k, v] of rankFeatures(agg('features'))) rows.push(['feature_use_30d', k, v]);
      for (const [k, v] of Object.entries(agg('sections')).sort((a, b) => b[1] - a[1])) rows.push(['site_section_views_30d', k, v]);
      for (const [k, v] of Object.entries(agg('crawlers')).sort((a, b) => b[1] - a[1])) rows.push(['crawler_hits_30d', k, v]);
      for (const [k, v] of Object.entries(store.data.analytics.topics || {}).sort((a, b) => b[1] - a[1])) rows.push(['chat_topic', k, v]);
      csv = toCsv(['metric', 'key', 'value'], rows);
    } else if (kind === 'traffic-daily') {
      const t = trafficReport(String(req.query.range || '90d'));
      csv = toCsv(['day_utc', ...TRAFFIC_MEDIUMS], t.daily.map((d) => [d.day, ...TRAFFIC_MEDIUMS.map((m) => d[m])]));
    } else if (kind === 'accounts') {
      csv = toCsv(['username', 'nickname', 'method', 'email', 'email_verified', 'google_id', 'full_name',
        'given_name', 'family_name', 'avatar_url', 'google_locale', 'workspace_domain', 'google_linked',
        'country', 'city', 'ip', 'created', 'last_seen'],
        Object.entries(store.data.accountsRegistry)
          .sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0))
          .map(([key, a]) => {
            const cred = (store.data.accounts || {})[key] || {};
            const g = cred.google || {};
            return [a.username || key, a.nickname || '', a.method || '',
              g.email || cred.email || a.email || '', g.email ? (g.emailVerified ? 'yes' : 'no') : '',
              g.sub || '', g.name || '', g.givenName || '', g.familyName || '', g.picture || '',
              g.locale || '', g.hostedDomain || '', isoOr(g.linkedAt),
              a.country || '', a.city || '', a.ip || '', isoOr(a.createdAt), isoOr(a.lastSeen)];
          }));
    } else if (kind === 'traffic') {
      const t = trafficReport(String(req.query.range || '30d'));
      const rows = [];
      for (const [k, v] of t.sources) rows.push(['source', k, v]);
      for (const [k, v] of t.landings) rows.push(['landing_page', k, v]);
      for (const [k, v] of t.sourcePages) rows.push(['source_to_page', k, v]);
      for (const [k, v] of t.searchTerms) rows.push(['search_term', k, v]);
      for (const [k, v] of t.pages) rows.push(['page_views', k, v]);
      csv = toCsv(['kind', 'name', 'count'], rows);
    } else if (kind === 'daily') {
      const report = activityReport(req);
      csv = toCsv(['day', 'unique_visitors', 'visits', 'crawler_hits', 'connections', 'matches', 'messages', 'peak_online', 'new_accounts', 'reports', 'errors'],
        report.daily.map((d) => [d.day, d.uniques, d.visits, d.bots, d.connections, d.matches, d.messages, d.peakOnline, d.newAccounts, d.reports, d.errors]));
    } else if (kind === 'countries') {
      const days = store.data.analytics.days;
      const keys = Object.keys(days).sort().slice(-30);
      const agg = {};
      for (const k of keys) for (const [c, n] of Object.entries(days[k].countries || {})) agg[c] = (agg[c] || 0) + n;
      const accByCountry = {};
      for (const a of Object.values(store.data.accountsRegistry)) {
        const c = (a.country || '').trim() || 'Unknown';
        accByCountry[c] = (accByCountry[c] || 0) + 1;
      }
      const names = Array.from(new Set([...Object.keys(agg), ...Object.keys(accByCountry)]));
      csv = toCsv(['country', 'visits_30d', 'accounts'],
        names.sort((a, b) => (agg[b] || 0) - (agg[a] || 0)).map((c) => [c, agg[c] || 0, accByCountry[c] || 0]));
    } else if (kind === 'audience') {
      const r = audienceReport(req);
      const rows = [];
      for (const g of r.people.gender) rows.push(['gender', g.key, g.n, g.pct]);
      for (const a of r.people.age) rows.push(['age_group', a.key, a.n, a.pct]);
      for (const x of r.people.cross) r.people.ageKeys.forEach((a, i) => rows.push(['gender_x_age', x.gender + ' ' + a, x.cells[i], '']));
      for (const l of r.people.lifecycle) rows.push(['new_vs_returning', l.key, l.n, l.pct]);
      for (const [k, n] of r.people.device) rows.push(['device', k, n, '']);
      for (const [k, n] of r.people.os) rows.push(['os', k, n, '']);
      for (const [k, n] of r.people.browser) rows.push(['browser', k, n, '']);
      for (const [k, n] of r.people.lang) rows.push(['language', k, n, '']);
      for (const b of r.experience.length) rows.push(['call_length', b.key, b.n, b.pct]);
      for (const b of r.experience.wait) rows.push(['wait_time', b.key, b.n, b.pct]);
      for (const b of r.experience.pairs) rows.push(['pairing', b.key, b.n, b.pct]);
      for (const s of r.experience.byGender) rows.push(['avg_call_seconds_by_gender', s.key, s.avgSeconds, s.satisfaction == null ? '' : s.satisfaction]);
      for (const s of r.experience.byAge) rows.push(['avg_call_seconds_by_age', s.key, s.avgSeconds, s.satisfaction == null ? '' : s.satisfaction]);
      rows.push(['ratings', 'thumbs_up', r.experience.up, r.experience.satisfaction == null ? '' : r.experience.satisfaction]);
      rows.push(['ratings', 'thumbs_down', r.experience.down, '']);
      csv = toCsv(['metric', 'key', 'value', 'percent'], rows);
    } else if (kind === 'bans') {
      csv = toCsv(['username', 'client_id', 'ip', 'country', 'city', 'reason', 'created', 'expires', 'lifted'],
        store.data.bans.map((b) => [b.username || '', b.clientId || '', b.ip || '', b.country || '', b.city || '', b.reason || '', isoOr(b.createdAt), isoOr(b.expiresAt), isoOr(b.liftedAt)]));
    } else if (kind === 'reports') {
      csv = toCsv(['when', 'reported', 'reported_country', 'reason', 'detail', 'reporter', 'handled'],
        store.data.reports.map((r) => [isoOr(r.ts), (r.reported || {}).username || '', (r.reported || {}).country || '', r.reason || '', r.detail || '', (r.reporter || {}).username || '', r.handled ? 'yes' : 'no']));
    } else if (kind === 'feedback') {
      csv = toCsv(['when', 'username', 'country', 'text'],
        store.data.feedback.map((f) => [isoOr(f.ts), f.username || '', f.country || '', f.text || '']));
    } else if (kind === 'talktime') {
      csv = toCsv(['username', 'account', 'client_id', 'country', 'talk_seconds', 'conversations', 'avg_seconds', 'longest_seconds', 'last_talked'],
        talkTimeRows(String(req.query.range || 'all')).map((r) => [r.username, r.account || '', r.clientId, r.country, r.seconds, r.calls, r.avg, r.longest, isoOr(r.lastAt)]));
    } else if (kind === 'daily-log') {
      csv = toCsv(['day_utc', 'visits', 'unique_visitors', 'repeat_visits', 'registered_users', 'app_people', 'new_people', 'returning_people', 'talk_seconds', 'calls', 'messages', 'clicks', 'games', 'voice_notes', 'signups', 'peak_online', 'estimated'],
        dailyRows().map((r) => [r.day, r.visits, r.uniques, r.repeat, r.registered, r.people, r.newPeople, r.returningPeople, r.talkSeconds, r.calls, r.messages, r.clicks, r.games, r.voiceNotes, r.signups, r.peakOnline, r.est.join(' ')]));
    } else if (kind === 'games') {
      csv = toCsv(['username', 'account', 'client_id', 'country', 'play_seconds', 'sessions', 'rounds', 'wins', 'losses', 'draws', 'win_rate', 'invites_sent', 'sent_accepted', 'invites_received', 'accepted', 'declined', 'ignored', 'withdrawn', 'favorite_game', 'last_played'],
        gameRows(String(req.query.range || 'all')).map((r) => [r.username, r.account || '', r.clientId, r.country, r.seconds, r.sessions, r.rounds, r.wins, r.losses, r.draws, r.winRate === null ? '' : r.winRate, r.invitesSent, r.sentAccepted, r.invitesReceived, r.accepted, r.declined, r.ignored, r.withdrawn, r.favorite, isoOr(r.lastAt)]));
    } else if (kind === 'premium') {
      csv = toCsv(['client_id', 'status', 'source', 'paying', 'permanent', 'activated', 'expires', 'revoked', 'last_event'],
        premiumRows().map((r) => [r.clientId, r.status, r.source, r.paying ? 'yes' : 'no', r.permanent ? 'yes' : 'no', isoOr(r.activatedAt), isoOr(r.expiresAt), isoOr(r.revokedAt), r.lastEvent]));
    }
    return csv;
  }

  // Every dataset in one ZIP of clean CSVs, at the widest range each report
  // supports, plus a README describing each file.
  const BUNDLE = [
    ['01-daily-log', 'daily-log', {}, 'One row per UTC day, full history: visits, uniques, people, calls, talk time, messages, games, signups, peak online. "estimated" lists cells derived from older counters.'],
    ['02-daily-activity', 'daily', {}, 'Last 30 days cut on the dashboard timezone: visitors, crawler hits, connections, matches, messages, reports, errors.'],
    ['03-overview', 'overview', {}, 'All-time totals, current counts, and last-30-day breakdowns (countries, cities, features, site sections, crawlers, chat topics).'],
    ['04-traffic-sources', 'traffic', { range: '90d' }, 'Last 90 days: sources, landing pages, source->page, search terms, page views.'],
    ['05-traffic-daily', 'traffic-daily', { range: '90d' }, 'Last 90 days: arrivals per day by medium (search, ai, social, referral, campaign, app, direct).'],
    ['06-countries', 'countries', {}, 'Visits per country (last 30 days) and registered accounts per country.'],
    ['07-audience', 'audience', { range: '30' }, 'Last 30 days: gender, age, device, OS, browser, language, new vs returning, call length, wait time, ratings.'],
    ['08-talk-time', 'talktime', { range: 'all' }, 'Per person, all time: talk seconds, conversations, average and longest call.'],
    ['09-games', 'games', { range: 'all' }, 'Per player, all time: play time, sessions, rounds, results, invites.'],
    ['10-accounts', 'accounts', {}, 'Registered accounts with sign-in method, location and timestamps. Contains personal data.'],
    ['11-subscriptions', 'premium', {}, 'Plus subscriptions: status, source, activation and expiry.'],
    ['12-reports', 'reports', {}, 'User reports with reason and handled state.'],
    ['13-bans', 'bans', {}, 'Bans with reason, expiry and lift time.'],
    ['14-feedback', 'feedback', {}, 'User feedback messages.'],
  ];

  router.get('/api/export/all.zip', (req, res) => {
    const stamp = new Date().toISOString();
    const files = [];
    const readme = [`TalkLive dashboard export`, `Generated: ${stamp}`, `Timezone for "daily-activity": ${reportTimezone(req)}`,
      `All timestamps are ISO 8601 UTC. CSVs are UTF-8 with BOM, comma-separated, one header row.`, ``, `Files:`];
    for (const [name, kind, query, about] of BUNDLE) {
      const csv = buildCsv(kind, { query: { ...req.query, ...query } });
      if (csv === null) continue;
      files.push({ name: `${name}.csv`, data: Buffer.from('﻿' + csv, 'utf8') });
      readme.push(`  ${name}.csv - ${about}`);
    }
    files.unshift({ name: 'README.txt', data: Buffer.from(readme.join('\r\n') + '\r\n', 'utf8') });
    store.audit('export', reqIp(req), 'Exported all dashboard data (zip)');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="talklive-data-${stamp.slice(0, 10)}.zip"`);
    res.send(zipFiles(files));
  });

  router.get('/api/export/:kind', (req, res) => {
    const kind = String(req.params.kind).replace(/\.csv$/i, '');
    const csv = buildCsv(kind, req);
    if (csv === null) return res.status(404).json({ error: 'Unknown export.' });
    store.audit('export', reqIp(req), `Exported ${kind}.csv`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="talklive-${kind}-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send('\ufeff' + csv);
  });

  router.get('/api/audit', (req, res) => {
    res.json({ audit: store.data.auditLog.slice(0, 300) });
  });

  // --- AI agent ---------------------------------------------------------------
  // The agent's tools are this router's own endpoints, run in-process with the
  // asking owner's cookie - so they pass the same session check, validation and
  // audit logging as a click in the dashboard. Reads go anywhere but the
  // streams and exports; writes only to the moderation endpoints below, and
  // only after the owner approves each one in the chat (see ai-agent.js).
  const AI_READ_BLOCK = /^(ai\/|live\/stream|export\/)/;
  const AI_WRITE_ALLOW = /^(reports\/[^/]+\/handled|reports\/user\/[^/]+\/handled|ban|unban|warn|warnings\/[^/]+\/withdraw|errors\/dismiss|maintenance)$/;
  function callApi(method, pathQuery, body, req) {
    return new Promise((resolve) => {
      const u = new URL('/api/' + pathQuery, 'http://local');
      const sub = u.pathname.slice(5);
      const allowed = method === 'GET' ? !AI_READ_BLOCK.test(sub) : AI_WRITE_ALLOW.test(sub);
      if (!allowed) return resolve({ status: 403, body: { error: 'Not available to the agent.' } });
      const fake = {
        method,
        url: u.pathname + u.search,
        headers: { cookie: req.headers.cookie || '', 'x-forwarded-for': req.headers['x-forwarded-for'] || '' },
        query: Object.fromEntries(u.searchParams),
        // Pre-parsed, so express.json() leaves it alone.
        body: body || {},
        _body: true,
        socket: req.socket,
        connection: req.socket,
        on() {},
      };
      let status = 200;
      let done = false;
      const finish = (b) => { if (!done) { done = true; resolve({ status, body: b }); } };
      const res = {
        headersSent: false,
        setHeader() {}, getHeader() {}, removeHeader() {},
        status(c) { status = c; return res; },
        json: finish,
        send: (b) => finish(typeof b === 'string' ? { text: b } : b),
        end: () => finish(null),
        write() { return true; },
        sendFile: () => finish(null),
      };
      router.handle(fake, res, (err) => { status = err ? 500 : 404; finish({ error: err ? err.message : 'Not found' }); });
    });
  }
  const agent = createAgent({
    callApi,
    ownerTimezone: (tz) => reportTimezone({ query: { tz } }),
    audit: (req, detail) => store.audit('ai_action', reqIp(req), detail),
  });
  router.get('/api/ai/status', (req, res) => res.json(agent.status()));
  router.post('/api/ai/chat', (req, res) => { agent.chat(req, res); });
  router.post('/api/ai/reset', (req, res) => { agent.reset((req.body || {}).conversationId); res.json({ ok: true }); });

  router.post('/api/maintenance', (req, res) => {
    const { on, message } = req.body || {};
    store.data.settings.maintenance.on = !!on;
    if (typeof message === 'string' && message.trim()) {
      store.data.settings.maintenance.message = message.trim().slice(0, 300);
    }
    store.audit('maintenance', reqIp(req), on ? 'Maintenance mode ON' : 'Maintenance mode OFF');
    store.persistNow();
    if (on) io.emit('maintenance', { message: store.data.settings.maintenance.message });
    res.json({ ok: true, maintenance: store.data.settings.maintenance });
  });

  router.post('/api/dev-banner', (req, res) => {
    const on = !!(req.body || {}).on;
    const prev = store.data.settings.devBanner || {};
    store.data.settings.devBanner = { on, since: on ? Date.now() : prev.since || 0 };
    store.audit('dev_banner', reqIp(req), on ? 'Development notice ON' : 'Development notice OFF');
    store.persistNow();
    io.emit('devBanner', store.data.settings.devBanner);
    res.json({ ok: true, devBanner: store.data.settings.devBanner });
  });

  return { router, sendAlertEmail };
}

// `generateConclusion` is exported for scripts/test-analytics-visits.js: the
// summary it writes is the one place the dashboard states a trend in words, so
// it is worth being able to assert on those words directly rather than only
// through an authenticated HTTP round trip.
module.exports = { createAdmin, sendAlertEmail, generateConclusion, applyOwnerReset };
