// Owner dashboard: authentication (password + Google Authenticator TOTP),
// admin API, email alerts, maintenance mode and the rule-based site conclusion.
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const store = require('./store');
const totp = require('./totp');
const analytics = require('./analytics');

let QRCode = null;
try { QRCode = require('qrcode'); } catch (_) { /* optional */ }
const mail = require('./mailer');

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
        dataDir: b.dataDir,
        // File backend on storage that is not a mounted volume: everything
        // stored is discarded by the next deploy. This is the case that has
        // actually been losing data, and atRisk below used to miss it
        // entirely - it only fired when DATABASE_URL was set and broken, never
        // when it was simply absent.
        ephemeral: b.mode !== 'postgres' && b.ephemeral === true,
        // Data will not survive: either the configured database is unreachable,
        // or the fallback file store is sitting on disposable storage.
        atRisk: (b.configured && b.mode !== 'postgres')
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
        premium: premiumRows().filter((r) => r.status === 'active').length,
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
  const RISK_RULES = [
    ['minor', /\b(?:i(?:'?m| am)|im)\s*(?:only\s*)?(?:1[0-7]|[89])\b|\b(?:1[0-7]|[89])\s*(?:yo|y\/o|years? old)\b|\b(?:what'?s? your |ur |how old)\s*(?:age|are you)\b/i],
    ['sexual', /\b(nudes?|sext(?:ing)?|horny|dick\s*pic|boobs|naked|cam\s*sex|snapchat\s*nudes)\b/i],
    ['contact', /\b(whats\s*app|whatsapp|telegram|snap(?:chat)?|insta(?:gram)?|discord|kik|@[a-z0-9._]{3,}|\+?\d[\d\s().-]{7,}\d)\b/i],
    ['link', /(https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|io|xyz|ru|link|gg|me|app)\b)/i],
    ['money', /\b(bitcoin|crypto|invest(?:ment)?|paypal|cash\s*app|gift\s*card|send\s*money|western\s*union)\b/i],
    ['abuse', /\b(kill\s*your\s*self|kys|nigg|faggot|retard|rape|bitch|whore)\b/i],
  ];
  // Anything in these two is worth looking at first; the rest is context.
  const SEVERE = new Set(['minor', 'sexual', 'abuse']);

  function riskFlags(text) {
    const s = String(text || '');
    const out = [];
    for (const [name, re] of RISK_RULES) if (re.test(s)) out.push(name);
    return out;
  }

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
  router.get('/api/export/:kind', (req, res) => {
    const kind = String(req.params.kind).replace(/\.csv$/i, '');
    let csv = null;
    if (kind === 'accounts') {
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
    } else if (kind === 'daily') {
      const report = activityReport(req);
      csv = toCsv(['day', 'unique_visitors', 'visits', 'connections', 'matches', 'messages', 'peak_online', 'new_accounts', 'reports', 'errors'],
        report.daily.map((d) => [d.day, d.uniques, d.visits, d.connections, d.matches, d.messages, d.peakOnline, d.newAccounts, d.reports, d.errors]));
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
    } else if (kind === 'bans') {
      csv = toCsv(['username', 'client_id', 'ip', 'country', 'city', 'reason', 'created', 'expires', 'lifted'],
        store.data.bans.map((b) => [b.username || '', b.clientId || '', b.ip || '', b.country || '', b.city || '', b.reason || '', isoOr(b.createdAt), isoOr(b.expiresAt), isoOr(b.liftedAt)]));
    } else if (kind === 'reports') {
      csv = toCsv(['when', 'reported', 'reported_country', 'reason', 'detail', 'reporter', 'handled'],
        store.data.reports.map((r) => [isoOr(r.ts), (r.reported || {}).username || '', (r.reported || {}).country || '', r.reason || '', r.detail || '', (r.reporter || {}).username || '', r.handled ? 'yes' : 'no']));
    } else if (kind === 'feedback') {
      csv = toCsv(['when', 'username', 'country', 'text'],
        store.data.feedback.map((f) => [isoOr(f.ts), f.username || '', f.country || '', f.text || '']));
    } else if (kind === 'premium') {
      csv = toCsv(['client_id', 'status', 'source', 'paying', 'permanent', 'activated', 'expires', 'revoked', 'last_event'],
        premiumRows().map((r) => [r.clientId, r.status, r.source, r.paying ? 'yes' : 'no', r.permanent ? 'yes' : 'no', isoOr(r.activatedAt), isoOr(r.expiresAt), isoOr(r.revokedAt), r.lastEvent]));
    }
    if (csv === null) return res.status(404).json({ error: 'Unknown export.' });
    store.audit('export', reqIp(req), `Exported ${kind}.csv`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="talklive-${kind}-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send('\ufeff' + csv);
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
