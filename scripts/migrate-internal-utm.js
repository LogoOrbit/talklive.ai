#!/usr/bin/env node
/*
 * Strip unread tracking parameters from internal links.
 *
 * Every CTA on the marketing side used to be tagged `utm_source` +
 * `utm_medium` + a per-page `utm_campaign` (plus `lang` on the localized
 * homepages). Because the campaign was the page's own slug, the 277 pages
 * between them linked to 1,098 distinct URLs that all serve `/` or `/chat`.
 * Google crawls them, finds the canonical pointing back at the clean URL and
 * files each one under "Alternate page with proper canonical tag" - a
 * duplicate pile several times the size of the 272-page site, competing for
 * crawl budget with real pages stuck in "Discovered - currently not indexed".
 *
 * UTM is for inbound links from somewhere else. Tagging a site's own internal
 * links also overwrites the visitor's real acquisition source in any analytics
 * that reads them, so the tags actively cost accuracy as well.
 *
 * What survives here is exactly what something reads:
 *
 * - `utm_source`, and only for the values `server/index.js` counts
 *   (ACQUISITION_SOURCES -> `acq_seo`, `acq_blog`, `acq_app`, ...). One
 *   constant value per cluster keeps those counters identical while
 *   collapsing the duplicate set to one URL per path.
 * - every functional parameter - `mode` (app.js opens text chat on
 *   `?mode=chat`), `open`, `tab`, `ref`, `v` cache busters. They are not
 *   tracking and are left untouched.
 *
 * `utm_medium`, `utm_campaign`, any other `utm_*` and `lang` are written by
 * nobody's reader: no client code looks at `lang` at all, and the server only
 * ever inspects `utm_source`.
 *
 * Like the other migrations this is a sweep rather than a template change,
 * because the geo pages and the later page/blog batches ship from disk with no
 * live generator (see SEO.md). It is idempotent: on a swept site it reports
 * `0 HTML files`. `contentFingerprint()` in build-seo.js normalizes these
 * parameters away, so running this does not restamp `lastmod`.
 */

const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');

// Mirrors ACQUISITION_SOURCES in server/index.js - the only utm_source values
// that reach a counter. Anything else is a tag nothing reads.
const RECORDED_SOURCES = new Set([
  'member_share', 'seo', 'blog', 'google', 'bing', 'reddit', 'youtube',
  'tiktok', 'instagram', 'facebook', 'x', 'producthunt', 'app',
]);

const DROPPED_PARAM = /^(?:utm_[a-z_]+|lang)$/i;

function keepParam(name, value) {
  if (!DROPPED_PARAM.test(name)) return true;
  return name.toLowerCase() === 'utm_source' && RECORDED_SOURCES.has(value.toLowerCase());
}

// Rewrites one href. Returns it unchanged unless it is a root-relative link
// carrying a parameter we drop.
function cleanHref(href) {
  if (!href.startsWith('/') || href.startsWith('//')) return href;
  const queryStart = href.indexOf('?');
  if (queryStart === -1) return href;

  const pathname = href.slice(0, queryStart);
  const hashStart = href.indexOf('#', queryStart);
  const query = href.slice(queryStart + 1, hashStart === -1 ? undefined : hashStart);
  const hash = hashStart === -1 ? '' : href.slice(hashStart);

  const kept = query
    .split(/&amp;|&/)
    .filter(Boolean)
    .filter((pair) => {
      const eq = pair.indexOf('=');
      const name = eq === -1 ? pair : pair.slice(0, eq);
      const value = eq === -1 ? '' : pair.slice(eq + 1);
      return keepParam(name, value);
    });

  return pathname + (kept.length ? '?' + kept.join('&amp;') : '') + hash;
}

function walkHtml(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkHtml(full));
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function migrate() {
  let changedFiles = 0;
  let changedLinks = 0;

  for (const file of walkHtml(PUBLIC)) {
    const before = fs.readFileSync(file, 'utf8');
    const after = before.replace(/href=(["'])([^"']*)\1/gi, (match, quote, href) => {
      const cleaned = cleanHref(href);
      if (cleaned === href) return match;
      changedLinks += 1;
      return `href=${quote}${cleaned}${quote}`;
    });
    if (after !== before) {
      fs.writeFileSync(file, after);
      changedFiles += 1;
    }
  }

  console.log(`[internal-utm] cleaned ${changedLinks} link${changedLinks === 1 ? '' : 's'} in ${changedFiles} HTML file${changedFiles === 1 ? '' : 's'}`);
  return changedFiles;
}

if (require.main === module) migrate();

module.exports = { cleanHref, migrate };
