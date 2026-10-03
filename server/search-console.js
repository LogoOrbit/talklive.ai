'use strict';
/*
 * Google Search Console: what people searched on Google before they clicked
 * through to TalkLive.
 *
 * Google does not pass the search query to the site it sends someone to - the
 * referrer is just "https://www.google.com/" - so the only place those
 * keywords exist is Search Console. This reads them through the Search
 * Console API (searchAnalytics.query) for the owner dashboard.
 *
 * Setup (see README, "Search keywords"):
 *   GSC_CREDENTIALS  the service account's JSON key, raw or base64-encoded
 *   GSC_SITE_URL     the Search Console property, default sc-domain:<CANONICAL_HOST>
 * and add the service account's email as a user on that property.
 *
 * Without credentials everything here reports `configured: false` and the
 * dashboard shows the setup steps instead.
 */
const { JWT } = require('google-auth-library');

const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const CACHE_MS = 3 * 60 * 60 * 1000; // Search Console updates a few times a day
const SITE_URL = process.env.GSC_SITE_URL || `sc-domain:${process.env.CANONICAL_HOST || 'talklive.app'}`;

function readCredentials() {
  const raw = (process.env.GSC_CREDENTIALS || '').trim();
  if (!raw) return null;
  try {
    const json = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    const creds = JSON.parse(json);
    if (!creds.client_email || !creds.private_key) throw new Error('missing client_email or private_key');
    return creds;
  } catch (err) {
    console.warn('[search-console] GSC_CREDENTIALS is not a valid service-account key:', err.message);
    return null;
  }
}

const creds = readCredentials();
const client = creds ? new JWT({ email: creds.client_email, key: creds.private_key, scopes: [SCOPE] }) : null;

const cache = new Map(); // days -> { at, data } | { at, error }
let lastError = null;

function isoDay(d) { return d.toISOString().slice(0, 10); }

async function query(body) {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`;
  const res = await client.request({ url, method: 'POST', data: { dataState: 'all', ...body } });
  return (res.data && res.data.rows) || [];
}

function row(r) {
  return {
    keys: r.keys || [],
    clicks: r.clicks || 0,
    impressions: r.impressions || 0,
    ctr: r.ctr || 0,
    position: r.position || 0,
  };
}

async function fetchReport(days) {
  const end = new Date();
  const start = new Date(end.getTime() - (days - 1) * 86400000);
  const range = { startDate: isoDay(start), endDate: isoDay(end) };
  const [totals, queries, pages, queryPages, countries, devices] = await Promise.all([
    query({ ...range }),
    query({ ...range, dimensions: ['query'], rowLimit: 100 }),
    query({ ...range, dimensions: ['page'], rowLimit: 50 }),
    query({ ...range, dimensions: ['query', 'page'], rowLimit: 100 }),
    query({ ...range, dimensions: ['country'], rowLimit: 20 }),
    query({ ...range, dimensions: ['device'], rowLimit: 5 }),
  ]);
  const site = `https://${process.env.CANONICAL_HOST || 'talklive.app'}`;
  const shortPage = (u) => (u && u.startsWith(site) ? u.slice(site.length) || '/' : u);
  return {
    range,
    totals: totals[0] ? row(totals[0]) : { clicks: 0, impressions: 0, ctr: 0, position: 0 },
    queries: queries.map(row).map((r) => ({ ...r, query: r.keys[0] })),
    pages: pages.map(row).map((r) => ({ ...r, page: shortPage(r.keys[0]) })),
    queryPages: queryPages.map(row).map((r) => ({ ...r, query: r.keys[0], page: shortPage(r.keys[1]) })),
    countries: countries.map(row).map((r) => ({ ...r, country: String(r.keys[0] || '').toUpperCase() })),
    devices: devices.map(row).map((r) => ({ ...r, device: r.keys[0] })),
  };
}

function status() {
  return {
    configured: !!client,
    site: SITE_URL,
    serviceAccount: creds ? creds.client_email : null,
    lastError,
  };
}

async function report(days = 28) {
  days = Math.min(480, Math.max(1, Math.round(Number(days) || 28)));
  if (!client) return { ...status() };
  const hit = cache.get(days);
  if (hit && Date.now() - hit.at < (hit.error ? 5 * 60 * 1000 : CACHE_MS)) {
    return hit.error ? { ...status(), error: hit.error } : { ...status(), ...hit.data, cachedAt: hit.at };
  }
  try {
    const data = await fetchReport(days);
    lastError = null;
    cache.set(days, { at: Date.now(), data });
    return { ...status(), ...data, cachedAt: Date.now() };
  } catch (err) {
    const apiMsg = err && err.response && err.response.data && err.response.data.error && err.response.data.error.message;
    lastError = String(apiMsg || (err && err.message) || err).slice(0, 300);
    cache.set(days, { at: Date.now(), error: lastError });
    console.warn('[search-console] query failed:', lastError);
    return { ...status(), error: lastError };
  }
}

module.exports = { report, status };
