// Owner dashboard: authentication (password + Google Authenticator TOTP),
// admin API, email alerts, maintenance mode and the rule-based site conclusion.
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const store = require('./store');
const totp = require('./totp');
const analytics = require('./analytics');

let nodemailer = null;
try { nodemailer = require('nodemailer'); } catch (_) { /* optional */ }
let QRCode = null;
try { QRCode = require('qrcode'); } catch (_) { /* optional */ }

const SESSION_HOURS = 12;
const OWNER_EMAIL = process.env.OWNER_EMAIL || '';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';

// --- Email alerts (Gmail SMTP app password) ---
let mailer = null;
if (nodemailer && SMTP_USER && SMTP_PASS) {
  mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

const emailThrottle = new Map(); // key -> last sent ts
function sendAlertEmail(kind, subject, text) {
  if (!mailer || !OWNER_EMAIL) return;
  // At most one email per kind per 10 minutes so a burst can't flood the inbox.
  const last = emailThrottle.get(kind) || 0;
  if (Date.now() - last < 10 * 60000) return;
  emailThrottle.set(kind, Date.now());
  mailer.sendMail({
    from: `"TalkLive Dashboard" <${SMTP_USER}>`,
    to: OWNER_EMAIL,
    subject: `[TalkLive] ${subject}`,
    text,
  }).catch((err) => console.error('[mail] send failed:', err.message));
}

// --- Auth helpers ---
function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
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

  if (prevVisits > 0) {
    const change = Math.round(((visits - prevVisits) / prevVisits) * 100);
    if (change >= 10) lines.push(`Traffic is growing: visits are up ${change}% versus the previous week (${visits} vs ${prevVisits}).`);
    else if (change <= -10) { lines.push(`Traffic is declining: visits are down ${Math.abs(change)}% versus the previous week (${visits} vs ${prevVisits}). Consider promotion or SEO work.`); health = 'warning'; }
    else lines.push(`Traffic is stable week-over-week (${visits} visits in the last 7 days).`);
  } else {
    lines.push(`${visits} visits recorded in the last 7 days.`);
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
  const sorted = Object.entries(features).sort((a, b) => b[1] - a[1]);
  if (sorted.length) {
    lines.push(`Most used feature: "${sorted[0][0]}" (${sorted[0][1]}×). Least used: "${sorted[sorted.length - 1][0]}" (${sorted[sorted.length - 1][1]}×).`);
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
  if (report.changeVsLastWeek.uniques !== null) {
    lines.push(`Unique visitors are ${report.changeVsLastWeek.uniques >= 0 ? 'up' : 'down'} ${Math.abs(report.changeVsLastWeek.uniques)}% week-over-week (${report.last7.uniques} vs ${report.prev7.uniques}).`);
  }

  lines.push(`Right now: ${runtime.online} user(s) online, today's peak was ${today.peakOnline} (day measured in ${report.timezone}, ${report.offset}).`);

  return { health, summary: lines };
}

// --- Module wiring ---
function createAdmin({ io, getRuntime, kickBanned }) {
  const router = express.Router();
  router.use(express.json({ limit: '64kb' }));

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
        // File mode while DATABASE_URL is set = data will be lost on restart.
        atRisk: b.configured && b.mode !== 'postgres',
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
    pendingSetup = { passwordHash: hashPassword(password, salt), salt, totpSecret: secret };
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

  router.post('/api/login', (req, res) => {
    const ip = reqIp(req);
    if (rateLimited(ip)) return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
    const admin = store.data.admin;
    if (!admin) return res.status(400).json({ error: 'Dashboard not set up yet.' });
    const { password, code } = req.body || {};
    const passOk = password && safeEqual(hashPassword(password, admin.salt), admin.passwordHash);
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
    }));
    const today = report.today;
    const agg = (field) => keys.reduce((acc, k) => {
      for (const [name, n] of Object.entries(days[k][field] || {})) acc[name] = (acc[name] || 0) + n;
      return acc;
    }, {});
    const topics = Object.entries(store.data.analytics.topics).sort((a, b) => b[1] - a[1]).slice(0, 30);
    res.json({
      runtime,
      timezone: report.timezone,
      offset: report.offset,
      todayWindow: report.todayWindow,
      yesterdayWindow: report.yesterdayWindow,
      today: { day: today.day, visits: today.visits, uniques: today.uniques, connections: today.connections, matches: today.matches, peakOnline: today.peakOnline },
      yesterday: { day: report.yesterday.day, visits: report.yesterday.visits, uniques: report.yesterday.uniques, connections: report.yesterday.connections, matches: report.yesterday.matches, peakOnline: report.yesterday.peakOnline },
      yesterdaySoFar: report.yesterdaySoFar,
      changeVsYesterday: report.changeVsYesterday,
      totals: store.data.analytics.totals,
      series,
      countries: Object.entries(agg('countries')).sort((a, b) => b[1] - a[1]).slice(0, 15),
      cities: Object.entries(agg('cities')).sort((a, b) => b[1] - a[1]).slice(0, 15),
      features: Object.entries(agg('features')).sort((a, b) => b[1] - a[1]),
      topics,
      conclusion: generateConclusion(runtime, report),
      maintenance: store.data.settings.maintenance,
      counts: {
        reports: store.data.reports.length,
        unhandledReports: store.data.reports.filter((r) => !r.handled).length,
        errors: store.data.errors.length,
        feedback: store.data.feedback.length,
        activeBans: store.activeBans().length,
        accounts: Object.keys(store.data.accountsRegistry).length,
      },
    });
  });

  router.get('/api/online', (req, res) => {
    res.json({ users: getRuntime().users });
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

  router.post('/api/timezone', (req, res) => {
    const tz = (req.body || {}).timezone;
    if (!analytics.isValidTimezone(tz)) return res.status(400).json({ error: 'Unknown timezone.' });
    store.data.settings.timezone = tz;
    store.audit('timezone', reqIp(req), `Report timezone set to ${tz}`);
    store.persistNow();
    res.json({ ok: true, timezone: tz });
  });

  router.get('/api/reports', (req, res) => {
    const withCounts = store.data.reports.slice(0, 300).map((r) => ({
      ...r,
      totalReportsOnUser: r.reported ? store.reportCountFor(r.reported.clientId) : 0,
      activeBan: r.reported ? !!store.findActiveBan(r.reported.clientId, r.reported.ip) : false,
    }));
    res.json({ reports: withCounts });
  });

  router.post('/api/reports/:id/handled', (req, res) => {
    const rec = store.data.reports.find((r) => r.id === req.params.id);
    if (rec) { rec.handled = true; store.save(); }
    res.json({ ok: true });
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
    res.json({ feedback: store.data.feedback.slice(0, 300) });
  });

  router.get('/api/accounts', (req, res) => {
    const accounts = Object.entries(store.data.accountsRegistry)
      .map(([key, a]) => ({ key, ...a }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    res.json({ accounts });
  });

  // Chat transcripts, filterable by username/clientId substring, grouped into
  // conversations client-side.
  router.get('/api/transcripts', (req, res) => {
    const q = String(req.query.q || '').toLowerCase();
    let list = store.data.transcripts;
    if (q) {
      list = list.filter((m) => (m.from || '').toLowerCase().includes(q)
        || (m.to || '').toLowerCase().includes(q)
        || (m.fromClientId || '').toLowerCase().includes(q)
        || (m.text || '').toLowerCase().includes(q));
    }
    res.json({ messages: list.slice(0, 500), total: store.data.transcripts.length });
  });

  router.get('/api/audit', (req, res) => {
    res.json({ audit: store.data.auditLog.slice(0, 300) });
  });

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

  return { router, sendAlertEmail };
}

module.exports = { createAdmin, sendAlertEmail };
