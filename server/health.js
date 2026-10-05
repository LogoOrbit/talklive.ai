'use strict';
/*
 * The dashboard's Health tab: four things the rest of the dashboard cannot see.
 *
 *   1. Call quality - round-trip time, packet loss, jitter and relay use, as
 *      measured by each browser during a call (public/app.js reports one
 *      summary per call; server/store.js keeps daily totals).
 *   2. Page speed - Core Web Vitals from Google's PageSpeed Insights API:
 *      real-user (Chrome UX Report) numbers where Google has them, plus a lab
 *      score. Works without a key; PSI_API_KEY raises the quota.
 *   3. Google Analytics - visitors, sessions, engagement and channels from the
 *      GA4 Data API, read with the same service account as Search Console
 *      (GSC_CREDENTIALS) once GA4_PROPERTY_ID is set and the account is added
 *      to the property as a Viewer.
 *   4. Uptime - from UptimeRobot (UPTIMEROBOT_API_KEY, a read-only key), which
 *      checks the site from outside: a server cannot report its own downtime.
 *
 * Every outside call is cached, and failures come back as { error } so one
 * missing service never breaks the tab.
 */
const { JWT } = require('google-auth-library');

const SITE = `https://${process.env.CANONICAL_HOST || 'talklive.app'}`;
const PSI_PAGES = ['/', '/talk-to-strangers', '/random-voice-chat', '/countries/india'];
const PSI_TTL = 12 * 60 * 60 * 1000;
const GA_TTL = 30 * 60 * 1000;
const UPTIME_TTL = 5 * 60 * 1000;

function cached(ttl, fn) {
  let entry = null;
  let pending = null;
  return async (force) => {
    if (!force && entry && Date.now() - entry.at < ttl) return entry.value;
    if (pending) return pending;
    pending = (async () => {
      let value;
      try { value = await fn(); } catch (err) { value = { error: String((err && err.message) || err).slice(0, 300) }; }
      entry = { at: Date.now(), value: { ...value, fetchedAt: new Date().toISOString() } };
      pending = null;
      return entry.value;
    })();
    return pending;
  };
}

async function getJson(url, opts = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeout || 60000);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((body.error && (body.error.message || body.error)) || `HTTP ${res.status}`);
    return body;
  } finally {
    clearTimeout(timer);
  }
}

// --- PageSpeed Insights --------------------------------------------------------

const FIELD = {
  LARGEST_CONTENTFUL_PAINT_MS: 'lcp',
  INTERACTION_TO_NEXT_PAINT: 'inp',
  CUMULATIVE_LAYOUT_SHIFT_SCORE: 'cls',
  EXPERIMENTAL_TIME_TO_FIRST_BYTE: 'ttfb',
  FIRST_CONTENTFUL_PAINT_MS: 'fcp',
};

async function psiPage(path, strategy) {
  const q = new URLSearchParams({ url: SITE + path, strategy, category: 'performance' });
  if (process.env.PSI_API_KEY) q.set('key', process.env.PSI_API_KEY);
  const r = await getJson(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${q}`, { timeout: 90000 });
  const field = {};
  const src = (r.loadingExperience && r.loadingExperience.metrics) || {};
  for (const [k, name] of Object.entries(FIELD)) {
    if (src[k]) field[name] = { p75: src[k].percentile, rating: String(src[k].category || '').toLowerCase() };
  }
  const audits = (r.lighthouseResult && r.lighthouseResult.audits) || {};
  const lab = (id) => (audits[id] ? audits[id].numericValue : null);
  return {
    path,
    strategy,
    score: r.lighthouseResult ? Math.round((r.lighthouseResult.categories.performance.score || 0) * 100) : null,
    fieldOverall: r.loadingExperience ? String(r.loadingExperience.overall_category || '').toLowerCase() || null : null,
    field,
    lab: { lcp: lab('largest-contentful-paint'), cls: lab('cumulative-layout-shift'), tbt: lab('total-blocking-time'), fcp: lab('first-contentful-paint') },
  };
}

const psiRun = cached(PSI_TTL, async () => {
  const jobs = PSI_PAGES.flatMap((path) => ['mobile', 'desktop'].map((strategy) =>
    psiPage(path, strategy).catch((err) => ({ path, strategy, error: String(err.message || err).slice(0, 200) }))));
  return { pages: await Promise.all(jobs), keyed: Boolean(process.env.PSI_API_KEY) };
});

// PageSpeed takes up to a minute, so it never holds up the tab: the first
// request starts it in the background and the page polls until it lands.
let psiLast = null;
let psiBusy = false;
function pageSpeed(force) {
  if (!psiBusy && (force || !psiLast || Date.now() - Date.parse(psiLast.fetchedAt) > PSI_TTL)) {
    psiBusy = true;
    psiRun(force).then((v) => { psiLast = v; }).finally(() => { psiBusy = false; });
  }
  return psiLast ? { ...psiLast, running: psiBusy } : { running: true, pages: [] };
}

// --- Google Analytics 4 Data API ---------------------------------------------

function gaClient() {
  const raw = (process.env.GA_CREDENTIALS || process.env.GSC_CREDENTIALS || '').trim();
  if (!raw || !process.env.GA4_PROPERTY_ID) return null;
  try {
    const creds = JSON.parse(raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
    return { email: creds.client_email, jwt: new JWT({ email: creds.client_email, key: creds.private_key, scopes: ['https://www.googleapis.com/auth/analytics.readonly'] }) };
  } catch (_) {
    return null;
  }
}
const ga = gaClient();

async function gaReport(body, realtime) {
  const id = process.env.GA4_PROPERTY_ID;
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(id)}:${realtime ? 'runRealtimeReport' : 'runReport'}`;
  const res = await ga.jwt.request({ url, method: 'POST', data: body });
  return res.data || {};
}
const rows = (r) => (r.rows || []).map((x) => ({ d: (x.dimensionValues || []).map((v) => v.value), m: (x.metricValues || []).map((v) => Number(v.value)) }));

const analytics = cached(GA_TTL, async () => {
  const range = [{ startDate: '28daysAgo', endDate: 'yesterday' }];
  const metrics = ['activeUsers', 'newUsers', 'sessions', 'engagementRate', 'averageSessionDuration', 'screenPageViewsPerSession'].map((name) => ({ name }));
  const [totals, daily, channels, pages, realtime] = await Promise.all([
    gaReport({ dateRanges: range, metrics }),
    gaReport({ dateRanges: range, dimensions: [{ name: 'date' }], metrics: [{ name: 'activeUsers' }, { name: 'sessions' }], orderBys: [{ dimension: { dimensionName: 'date' } }] }),
    gaReport({ dateRanges: range, dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'sessions' }, { name: 'engagementRate' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 10 }),
    gaReport({ dateRanges: range, dimensions: [{ name: 'landingPage' }], metrics: [{ name: 'sessions' }, { name: 'engagementRate' }, { name: 'averageSessionDuration' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 15 }),
    gaReport({ metrics: [{ name: 'activeUsers' }] }, true).catch(() => ({})),
  ]);
  const t = rows(totals)[0];
  return {
    totals: t ? { users: t.m[0], newUsers: t.m[1], sessions: t.m[2], engagementRate: t.m[3], avgSession: t.m[4], pagesPerSession: t.m[5] } : null,
    daily: rows(daily).map((r) => ({ date: r.d[0], users: r.m[0], sessions: r.m[1] })),
    channels: rows(channels).map((r) => ({ channel: r.d[0], sessions: r.m[0], engagementRate: r.m[1] })),
    pages: rows(pages).map((r) => ({ page: r.d[0], sessions: r.m[0], engagementRate: r.m[1], avgSession: r.m[2] })),
    realtimeUsers: rows(realtime)[0] ? rows(realtime)[0].m[0] : null,
  };
});

// --- UptimeRobot ----------------------------------------------------------------

const UPTIME_STATUS = { 0: 'paused', 1: 'not checked yet', 2: 'up', 8: 'seems down', 9: 'down' };

const uptime = cached(UPTIME_TTL, async () => {
  const body = new URLSearchParams({
    api_key: process.env.UPTIMEROBOT_API_KEY, format: 'json',
    custom_uptime_ratios: '1-7-30', response_times: '1', response_times_limit: '48', logs: '1', logs_limit: '10',
  });
  const r = await getJson('https://api.uptimerobot.com/v2/getMonitors', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body, timeout: 20000,
  });
  if (r.stat !== 'ok') throw new Error((r.error && r.error.message) || 'UptimeRobot refused the request');
  return {
    monitors: (r.monitors || []).map((m) => {
      const [d1, d7, d30] = String(m.custom_uptime_ratio || '').split('-').map(Number);
      return {
        name: m.friendly_name,
        url: m.url,
        status: UPTIME_STATUS[m.status] || String(m.status),
        uptime: { d1, d7, d30 },
        avgResponseMs: Math.round(Number(m.average_response_time) || 0) || null,
        incidents: (m.logs || []).filter((l) => l.type === 1).map((l) => ({ at: new Date(l.datetime * 1000).toISOString(), minutes: Math.round((l.duration || 0) / 60), reason: (l.reason && l.reason.detail) || '' })),
      };
    }),
  };
});

// --- Report --------------------------------------------------------------------

async function report(store, { refresh } = {}) {
  const [psi, gaData, up] = await Promise.all([
    Promise.resolve(pageSpeed(refresh)),
    ga ? analytics(refresh) : Promise.resolve(null),
    process.env.UPTIMEROBOT_API_KEY ? uptime(refresh) : Promise.resolve(null),
  ]);
  return {
    callQuality: store.callQualityReport(30),
    pageSpeed: psi,
    analytics: ga ? { configured: true, serviceAccount: ga.email, property: process.env.GA4_PROPERTY_ID, ...gaData }
      : { configured: false, serviceAccount: gaServiceAccount() },
    uptime: up ? { configured: true, ...up } : { configured: false },
  };
}

function gaServiceAccount() {
  try {
    const raw = (process.env.GA_CREDENTIALS || process.env.GSC_CREDENTIALS || '').trim();
    return JSON.parse(raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')).client_email || null;
  } catch (_) { return null; }
}

module.exports = { report };
