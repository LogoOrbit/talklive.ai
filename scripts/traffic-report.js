#!/usr/bin/env node
/*
 * Read-only traffic export for investigating a change in visits.
 *
 * Prints one JSON document to stdout: the per-day analytics the owner
 * dashboard is built from (aggregate counts only - no IPs, visitor hashes,
 * accounts or messages), plus Google Search Console clicks by date, page,
 * country, device and query when GSC_CREDENTIALS is set.
 *
 * Runs on the Fly machine through the "Traffic report" workflow, which
 * encrypts the output before it reaches the (public) Actions log:
 *   node /app/scripts/traffic-report.js
 * It never writes: Postgres is read with a single SELECT, the JSON store is
 * read from disk.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const top = (obj, n) => Object.entries(obj || {}).sort((a, b) => b[1] - a[1]).slice(0, n);

async function loadAnalytics() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: url, max: 1, ssl: /localhost|127\.0\.0\.1|sslmode=disable/.test(url) ? false : { rejectUnauthorized: false } });
    try {
      const r = await pool.query(`SELECT doc->'analytics' AS a, updated_at FROM owner_store WHERE id = 1`);
      // Byte sizes of the document's parts (never their contents), to see
      // what makes each save expensive.
      const size = async (sql) => (await pool.query(sql)).rows;
      const sizes = {
        total: await size(`SELECT octet_length(doc::text) AS bytes FROM owner_store WHERE id = 1`),
        topLevel: await size(`SELECT k.key, octet_length(k.value::text) AS bytes FROM owner_store, jsonb_each(doc) k WHERE id = 1 ORDER BY 2 DESC`),
        secondLevel: await size(`SELECT a.key AS parent, b.key, octet_length(b.value::text) AS bytes, CASE WHEN jsonb_typeof(b.value) = 'object' THEN (SELECT count(*) FROM jsonb_object_keys(b.value)) WHEN jsonb_typeof(b.value) = 'array' THEN jsonb_array_length(b.value) END AS items
          FROM owner_store, jsonb_each(doc) a, jsonb_each(CASE WHEN jsonb_typeof(a.value) = 'object' THEN a.value ELSE '{}'::jsonb END) b
          WHERE id = 1 AND a.key <> 'analytics' ORDER BY 3 DESC LIMIT 40`),
        analyticsFields: await size(`SELECT f.key, sum(octet_length(f.value::text)) AS bytes FROM owner_store, jsonb_each(doc->'analytics'->'days') d, jsonb_each(d.value) f WHERE id = 1 GROUP BY 1 ORDER BY 2 DESC`),
        tables: await size(`SELECT relname, pg_total_relation_size(c.oid) AS bytes FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = current_schema() AND c.relkind = 'r' ORDER BY 2 DESC`),
      };
      return { source: 'postgres', updatedAt: r.rows[0] && r.rows[0].updated_at, analytics: (r.rows[0] && r.rows[0].a) || {}, sizes };
    } finally { await pool.end(); }
  }
  const file = path.join(process.env.DATA_DIR || '/data', 'owner-data.json');
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  return { source: file, updatedAt: fs.statSync(file).mtime, analytics: doc.analytics || {} };
}

function summariseDay(key, d) {
  const hours = {};
  for (const [h, b] of Object.entries(d.hours || {})) hours[h] = { v: b.visits || 0, u: b.uniques || 0, b: b.bots || 0, c: b.connections || 0 };
  return {
    day: key,
    visits: d.visits || 0, uniques: d.uniques || 0, bots: d.bots || 0,
    connections: d.connections || 0, matches: d.matches || 0, messages: d.messages || 0,
    newAccounts: d.newAccounts || 0, peakOnline: d.peakOnline || 0, errors: d.errors || 0,
    crawlers: top(d.crawlers, 12), sections: d.sections || {},
    sources: top(d.sources, 25), mediums: d.mediums || {}, landings: top(d.landings, 25),
    sourcePages: top(d.sourcePages, 25), pages: top(d.pages, 30), searchTerms: top(d.searchTerms, 15),
    countries: top(d.countries, 15), features: top(d.features, 60), hours,
  };
}

async function gsc() {
  const raw = (process.env.GSC_CREDENTIALS || '').trim();
  if (!raw) return { configured: false };
  const { JWT } = require('google-auth-library');
  const creds = JSON.parse(raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
  const client = new JWT({ email: creds.client_email, key: creds.private_key, scopes: ['https://www.googleapis.com/auth/webmasters.readonly'] });
  const site = process.env.GSC_SITE_URL || `sc-domain:${process.env.CANONICAL_HOST || 'talklive.app'}`;
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`;
  const day = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  const q = async (dimensions, startDate, endDate, rowLimit = 25000) => {
    try {
      const r = await client.request({ url, method: 'POST', data: { startDate, endDate, dimensions, rowLimit, dataState: 'all' } });
      return (r.data.rows || []).map((x) => [...x.keys, x.clicks, x.impressions, Math.round(x.position * 10) / 10]);
    } catch (e) { return { error: e.message }; }
  };
  const start = day(100), end = day(0);
  const out = { configured: true, site, start, end, columns: 'keys..., clicks, impressions, position' };
  out.byDate = await q(['date'], start, end);
  out.byDatePage = await q(['date', 'page'], start, end);
  out.byDateCountry = await q(['date', 'country'], start, end);
  out.byDateDevice = await q(['date', 'device'], start, end);
  out.windows = {};
  for (const [name, s, e] of [['w1', day(56), day(43)], ['w2', day(42), day(29)], ['w3', day(28), day(15)], ['w4', day(14), day(0)]]) {
    out.windows[name] = { start: s, end: e, query: await q(['query'], s, e, 1000), page: await q(['page'], s, e, 1000) };
  }
  return out;
}

(async () => {
  const { source, updatedAt, analytics, sizes } = await loadAnalytics();
  const days = analytics.days || {};
  const report = {
    generatedAt: new Date().toISOString(),
    store: { source, updatedAt, sizes: sizes || null },
    analyticsKeys: Object.keys(analytics),
    humanSince: analytics.humanSince || null,
    totals: analytics.totals || {},
    days: Object.keys(days).sort().map((k) => summariseDay(k, days[k])),
    gsc: await gsc(),
  };
  process.stdout.write(JSON.stringify(report));
})().catch((e) => { console.error('traffic-report failed:', e.message); process.exit(1); });
