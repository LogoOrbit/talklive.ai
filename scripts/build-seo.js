#!/usr/bin/env node
/*
 * TalkLive SEO builder.
 * Generates keyword-targeted landing pages, sitemap.xml and an index of
 * internal links from a single data model, so the SEO surface stays
 * consistent and scalable. Run: `npm run build:seo` (or `node scripts/build-seo.js`).
 * Output is written into ./public and committed to the repo.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SITE = 'https://talklive.app';
const PUBLIC = path.join(__dirname, '..', 'public');
// Real localized homepages (public/<code>/index.html) - see scripts/locales.js.
const LOCALES = require('./locales');
// Brand + Offer shape for the app node. See scripts/data/commerce.js for why
// a free web app needs return and shipping fields at all.
const { BRAND, freeOffer } = require('./data/commerce');
const SOCIAL = require('./data/social');
const { languagesAnswer } = require('./data/languages');
const { artImg } = require('./illustrations');
const LANGS = ['en'].concat(LOCALES.map((locale) => locale.code));
const CONTENT_UPDATED = '2026-08-14';
const ORGANIZATION_ID = `${SITE}/#organization`;
const WEBSITE_ID = `${SITE}/#website`;
const APP_ID = `${SITE}/#app`;
const OG_IMAGE = `${SITE}/og-image.png?v=2`;
const LOGO_IMAGE = `${SITE}/favicon-192.png`;
// hreflang cluster for the homepage: x-default + en point at /, every other
// language at its own statically rendered path. Path-based alternates are
// indexable; ?lang= URLs serve identical English HTML and are not.
function homeAlternates(tag) {
  const a = (href, lang) => tag(href, lang);
  return [a(`${SITE}/`, 'x-default'), a(`${SITE}/`, 'en')]
    .concat(LOCALES.map(l => a(`${SITE}/${l.code}/`, l.code)));
}
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- Shared building blocks -------------------------------------------------

function url(slug) { return slug ? `${SITE}/${slug}` : `${SITE}/`; }

/*
 * Internal CTAs carry one constant `utm_source` and nothing else.
 *
 * They used to carry `utm_medium` and a per-page `utm_campaign` as well, which
 * gave every page on the site its own unique query string pointing at `/` and
 * `/chat`: 1,098 distinct crawlable URLs that all render the homepage or the
 * chat app. Each one is a duplicate Google has to fetch, compare and discard
 * against the canonical - that is the "Alternate page with proper canonical
 * tag" pile in Search Console, and it is crawl budget spent on URLs that can
 * never rank while real pages sit in "Discovered - currently not indexed".
 *
 * `utm_source` stays because it is the only tracking parameter anything reads:
 * `server/index.js` counts `acq_seo` / `acq_blog` from it (ACQUISITION_SOURCES).
 * Medium and campaign were written and never read, and so was `lang` - no
 * client code looks at that parameter, the app picks its language from the
 * browser and the stored preference. One source value per cluster keeps the
 * acquisition counters exact and collapses the duplicate set to two URLs.
 */
function appHref(pathname, source) {
  if (!source) return pathname;
  return `${pathname}?utm_source=${encodeURIComponent(source)}`;
}

function icon(name) {
  const p = {
    bolt: '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15.5 0 18M12 3c-2.5 2.5-2.5 15.5 0 18"/>',
    shield: '<path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3z"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><line x1="12" y1="18" x2="12" y2="22"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 15.5c2.7.4 5 2.2 5 4.5"/>',
    chat: '<path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>',
    next: '<path d="M5 4v16M9 12h11M9 12l4-4M9 12l4 4"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    heart: '<path d="M12 20s-7-4.4-9.2-8.4C1.2 8.5 3 5.5 6 5.5c1.9 0 3.1 1 4 2 0.9-1 2.1-2 4-2 3 0 4.8 3 3.2 6.1C19 15.6 12 20 12 20z"/>',
    phone: '<path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.4 2.4z"/>',
    world: '<circle cx="12" cy="12" r="9"/><path d="M8 4c-1.5 3-1.5 13 0 16M16 4c1.5 3 1.5 13 0 16M3.5 9h17M3.5 15h17"/>',
  };
  return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p[name] || p.chat}</svg>`;
}

// Every landing page is hand-designed, with its own layout and type: the
// topic guides (scripts/topics/) and the country guides (scripts/countries/).
// The shared landing-page template they replaced was retired in October 2026.
const TOPIC_GUIDES = require('./topics');
const COUNTRY_GUIDES = require('./countries');

// --- Journal ----------------------------------------------------------------
// /blog/ is the TalkLive Journal: ten hand-designed long-form articles plus the
// /languages/ feature, built by scripts/journal/. BLOG is their metadata, used
// below for the sitemap, RSS, llms.txt and related-reading cards.
const JOURNAL = require('./journal');
const BLOG = JOURNAL.ARTICLES;

function blogUrl(slug) { return `${SITE}/blog/${slug}`; }

// --- Localized homepages ------------------------------------------------------
// One statically rendered page per language at /<code>/ so search engines in
// each market index native-language content. The app itself still translates
// client-side via ?lang=, which these pages link into.

function languageSwitcher(current) {
  const links = [{ code: '', name: 'English' }].concat(LOCALES)
    .map(l => l.code === current
      ? `<strong>${l.name || 'English'}</strong>`
      : `<a href="/${l.code ? l.code + '/' : ''}" hreflang="${l.code || 'en'}">${l.name || 'English'}</a>`)
    .join(' · ');
  return `<nav class="lang-switcher" aria-label="Languages" style="padding:28px 0;text-align:center;font-size:14px;line-height:2">${links}</nav>`;
}

function localeHome(loc) {
  const canonical = `${SITE}/${loc.code}/`;
  const appVoice = appHref('/', 'seo');
  const appChat = appHref('/chat', 'seo');
  const alternates = homeAlternates((href, lang) => `<link rel="alternate" href="${href}" hreflang="${lang}" />`).join('\n');
  const features = loc.features.map(f => `<div class="card"><div class="ico">${icon(f.icon)}</div><h3>${f.h}</h3><p>${f.p}</p></div>`).join('');
  const steps = loc.steps.map(s => `<div class="step"><h3>${s.h}</h3><p>${s.p}</p></div>`).join('');
  const faqHtml = loc.faq.map(f => `<details><summary>${f.q}</summary><p>${f.a}</p></details>`).join('');
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': ORGANIZATION_ID, name: 'TalkLive', alternateName: ['Talk Live', 'TalkLive App'], url: `${SITE}/`, logo: { '@type': 'ImageObject', url: LOGO_IMAGE, width: 192, height: 192 }, sameAs: SOCIAL.SAME_AS },
      { '@type': 'WebSite', '@id': WEBSITE_ID, name: 'TalkLive', alternateName: ['Talk Live', 'TalkLive App'], url: `${SITE}/`, inLanguage: LANGS, publisher: { '@id': ORGANIZATION_ID } },
      { '@type': 'WebApplication', '@id': APP_ID, name: 'TalkLive', url: `${SITE}/`, applicationCategory: 'CommunicationApplication', operatingSystem: 'Any device with a modern web browser', isAccessibleForFree: true, brand: BRAND, offers: freeOffer(), audience: { '@type': 'PeopleAudience', suggestedMinAge: 18 }, publisher: { '@id': ORGANIZATION_ID } },
      {
        '@type': 'WebPage',
        '@id': `${canonical}#webpage`,
        name: loc.title,
        url: canonical,
        description: loc.description,
        dateModified: loc.updated || CONTENT_UPDATED,
        inLanguage: loc.code,
        isPartOf: { '@id': WEBSITE_ID },
        about: { '@id': APP_ID },
        primaryImageOfPage: { '@type': 'ImageObject', url: OG_IMAGE, width: 1200, height: 630 },
      },
      {
        '@type': 'FAQPage',
        '@id': `${canonical}#faq`,
        inLanguage: loc.code,
        mainEntity: loc.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
    ],
  };
  return `<!DOCTYPE html>
<html lang="${loc.code}" dir="${loc.dir}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<link rel="stylesheet" href="/seo.css?v=20261004cta" />
<title>${esc(loc.title)}</title>
<meta name="description" content="${esc(loc.description)}" />
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
<meta name="theme-color" content="#0b0f1a" />
<meta name="author" content="TalkLive" />
<link rel="canonical" href="${canonical}" />
${alternates}
<meta property="og:type" content="website" />
<meta property="og:site_name" content="TalkLive" />
<meta property="og:title" content="${esc(loc.title)}" />
<meta property="og:description" content="${esc(loc.description)}" />
<meta property="og:url" content="${canonical}" />
<meta property="og:image" content="${OG_IMAGE}" />
<meta property="og:image:secure_url" content="${OG_IMAGE}" />
<meta property="og:image:type" content="image/png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="TalkLive random voice and text chat" />
<meta property="og:locale" content="${loc.ogLocale}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(loc.title)}" />
<meta name="twitter:description" content="${esc(loc.description)}" />
<meta name="twitter:image" content="${OG_IMAGE}" />
<meta name="twitter:image:alt" content="TalkLive random voice and text chat" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/favicon-192.png" />
<link rel="manifest" href="/site.webmanifest" />
<script defer src="/pwa.js?v=20260908pwa"></script>
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
<!-- Every locale already carries a translated skip link in scripts/locales.js;
     this template was the one place still hardcoding the English string, so
     screen-reader users on all 16 translated homepages got an English
     instruction as the first thing they heard. -->
<a class="skip-link" href="#main-content">${loc.skipToContent}</a>
<header class="site-header">
  <div class="wrap">
    <a class="logo" href="/${loc.code}/"><img src="/favicon.svg" width="30" height="30" alt="TalkLive logo" /><span class="logo-name">Talk<span class="logo-live">Live</span></span></a>
    <span class="head-cta" style="display:inline-flex;gap:8px">
      <a class="btn btn-talk" href="${appVoice}" style="padding:10px 18px;font-size:15px">🎙 ${loc.ctaTalk}</a>
      <a class="btn btn-chat" href="${appChat}" style="padding:10px 18px;font-size:15px">💬 ${loc.ctaChat}</a>
    </span>
  </div>
</header>
<main id="main-content">
  <section class="hero">
    <div class="wrap hero-split">
      <div class="hero-copy">
      <h1>${loc.h1}</h1>
      <p class="lede">${loc.lede}</p>
      <div class="cta-row">
        <a class="btn btn-talk" href="${appVoice}">🎙 ${loc.ctaTalk}</a>
        <a class="btn btn-chat" href="${appChat}">💬 ${loc.ctaChat}</a>
      </div>
      <p class="hero-meta">${loc.heroMeta}</p>
      </div>
      <div class="hero-art">${artImg('connected-world', { eager: true })}</div>
    </div>
  </section>
  <section id="features">
    <div class="wrap center">
      <h2>${loc.featuresH}</h2>
      <div class="grid">${features}</div>
    </div>
  </section>
  <section id="how">
    <div class="wrap">
      <h2>${loc.stepsH}</h2>
      <div class="steps">${steps}</div>
    </div>
  </section>
  <section class="faq">
    <div class="wrap">
      <h2>${loc.faqH}</h2>
      <div class="faq-layout"><div>${faqHtml}</div>${artImg('question-answered', { cls: 'art art-faq' })}</div>
    </div>
  </section>
  <div class="wrap">
    <div class="cta-band">
      ${artImg('walking-together', { cls: 'art art-cta' })}
      <h2>${loc.ctaH}</h2>
      <p>${loc.ctaP}</p>
      <div class="cta-row">
        <a class="btn btn-talk" href="${appVoice}">🎙 ${loc.ctaTalk}</a>
        <a class="btn btn-chat" href="${appChat}">💬 ${loc.ctaChat}</a>
      </div>
    </div>
  </div>
  <div class="wrap">${languageSwitcher(loc.code)}</div>
</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="fine">© ${new Date().getFullYear()} TalkLive · <a href="/about">About</a> · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="/community-guidelines">Guidelines</a> · <a href="/contact">Contact</a> · <a href="/safety">Safety</a></div>
  </div>
</footer>
</body>
</html>
`;
}

// --- Emit -------------------------------------------------------------------

let count = 0;

for (const loc of LOCALES) {
  const dir = path.join(PUBLIC, loc.code);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), localeHome(loc));
  count++;
}

// Journal: /blog/, its articles, /languages/ and /journal.css.
const BLOG_DIR = path.join(PUBLIC, 'blog');
count += JOURNAL.build();

// Topic and country guides, each designed on its own.
count += TOPIC_GUIDES.build();
count += COUNTRY_GUIDES.build();

// Sitemap with hreflang alternates for the home + all landing pages.
const latestBlogUpdate = BLOG.reduce((latest, post) => {
  const updated = post.updated || post.date;
  return updated > latest ? updated : latest;
}, CONTENT_UPDATED);
const sitemapUrls = [{ slug: '', priority: '1.0', freq: 'daily', home: true, lastmod: CONTENT_UPDATED }]
  .concat(LOCALES.map(l => ({ slug: `${l.code}/`, priority: '0.9', freq: 'weekly', raw: true, home: true, lastmod: l.updated || CONTENT_UPDATED })))
  .concat(TOPIC_GUIDES.TOPICS.map(t => ({ slug: t.slug, priority: '0.8', freq: 'weekly', lastmod: t.date })))
  .concat(COUNTRY_GUIDES.COUNTRIES.map(c => ({ slug: `countries/${c.slug}`, priority: '0.7', freq: 'monthly', lastmod: c.date })))
  .concat([{ slug: 'blog/', priority: '0.7', freq: 'weekly', raw: true, lastmod: latestBlogUpdate }])
  .concat(BLOG.map(b => ({ slug: `blog/${b.slug}`, priority: '0.6', freq: 'monthly', raw: true, lastmod: b.updated || b.date })))
  .concat([
    { slug: 'pricing', priority: '0.5', freq: 'monthly', raw: true, lastmod: CONTENT_UPDATED },
    { slug: 'about', priority: '0.4', freq: 'yearly', raw: true, lastmod: CONTENT_UPDATED },
    { slug: 'contact', priority: '0.4', freq: 'yearly', raw: true, lastmod: CONTENT_UPDATED },
    { slug: 'privacy', priority: '0.3', freq: 'yearly', raw: true, lastmod: CONTENT_UPDATED },
    { slug: 'terms', priority: '0.3', freq: 'yearly', raw: true, lastmod: CONTENT_UPDATED },
    { slug: 'community-guidelines', priority: '0.3', freq: 'yearly', raw: true, lastmod: CONTENT_UPDATED },
    { slug: 'refund', priority: '0.3', freq: 'yearly', raw: true, lastmod: CONTENT_UPDATED },
  ]);

function buildSitemap() {
  const head = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">';
  const body = sitemapUrls.map(u => {
    const loc = u.raw ? `${SITE}/${u.slug}` : url(u.slug);
    // Only the homepage cluster carries hreflang alternates - every member of
    // the cluster (/, /es/, /ru/, …) lists the full set, as Google requires.
    const alts = u.home
      ? homeAlternates((href, lang) => `\n    <xhtml:link rel="alternate" hreflang="${lang}" href="${href}"/>`).join('')
      : '';
    return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.freq}</changefreq>\n    <priority>${u.priority}</priority>${alts}\n  </url>`;
  }).join('\n');
  return `${head}\n${body}\n</urlset>\n`;
}
/*
 * Sweep every indexable page actually present in ./public into the sitemap.
 *
 * sitemapUrls above only knows about the page sets this file builds. The
 * country/city/language cluster (scripts/geo-pages.js, 177 pages) and two
 * later page/blog batches are generated elsewhere and were never added to it,
 * so 189 of the site's 274 pages - every city and country page among them -
 * appeared in no sitemap that anything submitted. The stale sitemap-*.xml
 * files that did list them are referenced by nothing at all: robots.txt points
 * only at sitemap.xml. Those pages were left to be found by internal links or
 * not at all.
 *
 * Deriving the list from disk rather than from a hand-maintained array is the
 * point: it is the drift itself that caused this, so any page that ships is
 * now submitted whether or not this script was the thing that wrote it.
 */
function canonicalUrlForFile(absFile) {
  let rel = path.relative(PUBLIC, absFile).split(path.sep).join('/');
  if (!rel.endsWith('.html')) return null;
  rel = rel.slice(0, -'.html'.length);
  // Directory indexes keep their trailing slash; everything else is extensionless.
  if (rel === 'index') return `${SITE}/`;
  if (rel.endsWith('/index')) return `${SITE}/${rel.slice(0, -'index'.length)}`;
  return `${SITE}/${rel}`;
}

// Pages that must never be submitted. chat.html carries a noindex robots tag,
// and landing.html is only ever served on the marketing subdomain.
const SITEMAP_EXCLUDE = new Set(['chat.html', 'landing.html']);

function walkHtml(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, out);
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

/*
 * lastmod ledger.
 *
 * scripts/seo-lastmod.json records, per URL, a hash of the page's meaningful
 * content and the date that content last changed. Nothing read it and nothing
 * ever wrote it, so every entry was frozen at one date and the sitemap
 * declared 256 of 272 pages last modified on the same day - including pages
 * untouched for months. Crawlers use lastmod to decide what to revisit and
 * discount a signal that is provably wrong, so a stale ledger is worse than
 * none: it spends the site's credibility on nothing.
 *
 * The hash deliberately ignores the parts of a page that change on every
 * build without the content changing - asset cache-buster versions and the
 * ad markup scripts/migrate-ads.js rewrites afterwards. Without that,
 * every page would look modified on every deploy, which is the same lie in
 * the opposite direction.
 */
const LEDGER_PATH = path.join(__dirname, 'seo-lastmod.json');
// Bumped when the hashing rules change. An entry written by an older version
// is re-hashed but keeps its recorded date, so changing the algorithm never
// backdates or forward-dates a page it cannot actually vouch for.
// v3: the fingerprint now also normalizes away internal-link tracking
// parameters, so removing them from 192 pages of CTAs re-hashes the site
// without dating it to the day of the cleanup.
const LEDGER_VERSION = 3;
const TODAY = new Date().toISOString().slice(0, 10);

let LASTMOD = {};
try {
  LASTMOD = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
} catch (_) {
  LASTMOD = {};
}

function contentFingerprint(html) {
  const normalized = html
    // Infrastructure script tags: the ad loader and the PWA/service-worker
    // registration. Neither is page content, and adding or reversioning one
    // must not restamp `lastmod` on all 169 pages the same day - that tells
    // search engines everything was rewritten when nothing was, which is the
    // exact signal a site should not send.
    .replace(/<script\b[^>]*\bsrc=["'][^"']*(?:ads|pwa)\.js[^"']*["'][^>]*><\/script>/gi, '')
    // The sitewide social-profile footer row and twitter:site tag
    // (scripts/migrate-social.js): site furniture, not page content.
    .replace(/<nav class="tl-social"[^>]*>[\s\S]*?<\/nav>/g, '')
    .replace(/<meta name="twitter:site"[^>]*>/g, '')
    // The Organization's sameAs list: one entity fact repeated on every page,
    // not a change to what any page says.
    .replace(/,?\s*"sameAs"\s*:\s*\[[^\]]*\]/g, '')
    // The Consent Mode default scripts/migrate-analytics.js adds to the
    // analytics tag - infrastructure, not content.
    .replace(/\s*gtag\('consent', 'default'[\s\S]*?gtag\('set', 'ads_data_redaction', true\);/g, '')
    // Empty ad slots, inserted and moved by scripts/migrate-ads.js.
    .replace(/<div\b[^>]*\bdata-ad=[^>]*>\s*<\/div>/gi, '')
    // Cache-buster query strings: ?v=20260828fix is not a content change.
    .replace(/([?&])v=[^"'&\s>]*/g, '$1v=')
    // Tracking parameters on internal links. Dropping `utm_medium`,
    // `utm_campaign` and `lang` from 277 pages of CTAs (see
    // scripts/migrate-internal-utm.js) removes duplicate crawl targets; it
    // does not change a word of what the page says, so it must not restamp
    // `lastmod` any more than the ad or PWA tags do. Normalizing both the
    // tagged and the untagged form to the same string keeps every date put.
    .replace(/([?&]|&amp;)(?:utm_[a-z_]+|lang|interest)=[^"'&\s>]*/gi, '$1')
    .replace(/\?(?:&amp;|&)+/g, '?')
    .replace(/(?:&amp;|&)+(?=&amp;|&)/g, '')
    .replace(/[?&](?:&amp;)*(?=["'\s>])/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

/*
 * The checked-in city pages predate this generator and promise city-level
 * matching even though the product only filters by country. Keep the URLs
 * available (and their links followable) while preventing a doorway-page
 * footprint from being submitted for indexing. This build-time migration is
 * intentionally idempotent and can be removed when city matching or verified
 * first-party city data makes the pages genuinely useful search destinations.
 */
function noindexUnsupportedCityPages() {
  const cityDir = path.join(PUBLIC, 'cities');
  if (!fs.existsSync(cityDir)) return 0;
  let changed = 0;
  for (const entry of fs.readdirSync(cityDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.html') || entry.name === 'index.html') continue;
    const file = path.join(cityDir, entry.name);
    const before = fs.readFileSync(file, 'utf8');
    const after = before.replace(
      /<meta name="robots" content="[^"]*" \/>/i,
      '<meta name="robots" content="noindex, follow" />'
    );
    if (after !== before) {
      fs.writeFileSync(file, after);
      changed++;
    }
  }
  return changed;
}

// Re-hash every indexable page and advance only the dates that earned it.
function refreshLastmodLedger() {
  const seen = new Set();
  for (const file of walkHtml(PUBLIC)) {
    const rel = path.relative(PUBLIC, file).split(path.sep).join('/');
    if (SITEMAP_EXCLUDE.has(rel)) continue;
    const html = fs.readFileSync(file, 'utf8');
    if (/<meta[^>]+name=["']robots["'][^>]*noindex/i.test(html)) continue;
    const loc = canonicalUrlForFile(file);
    if (!loc) continue;
    const key = loc.slice(SITE.length) || '/';
    seen.add(key);

    const hash = contentFingerprint(html);
    const prev = LASTMOD[key];
    if (!prev) {
      // Genuinely new page.
      LASTMOD[key] = { hash, date: TODAY, v: LEDGER_VERSION };
    } else if (prev.v !== LEDGER_VERSION) {
      // Written by an older hashing scheme. Its hash cannot be compared with
      // ours, so adopt the new hash but keep the recorded date rather than
      // claiming the whole site changed the day the algorithm did.
      LASTMOD[key] = { hash, date: prev.date, v: LEDGER_VERSION };
    } else if (prev.hash !== hash) {
      LASTMOD[key] = { hash, date: TODAY, v: LEDGER_VERSION };
    }
  }
  // Retire URLs that no longer exist, so the ledger cannot grow forever or
  // resurrect a date for a page that has been deleted.
  for (const key of Object.keys(LASTMOD)) {
    if (!seen.has(key)) delete LASTMOD[key];
  }
  const sorted = {};
  for (const key of Object.keys(LASTMOD).sort()) sorted[key] = LASTMOD[key];
  LASTMOD = sorted;
  fs.writeFileSync(LEDGER_PATH, JSON.stringify(sorted, null, 2) + '\n');
  return sorted;
}

// The date to publish for a URL: what the ledger can actually vouch for,
// falling back to the page's declared date only when it is not tracked.
function lastmodFor(loc, declared) {
  const key = loc.slice(SITE.length) || '/';
  return (LASTMOD[key] && LASTMOD[key].date) || declared || CONTENT_UPDATED;
}

function extraSitemapEntries(existingLocs) {
  const entries = [];
  for (const file of walkHtml(PUBLIC)) {
    const rel = path.relative(PUBLIC, file).split(path.sep).join('/');
    if (SITEMAP_EXCLUDE.has(rel)) continue;
    // A page that opts out of indexing must not be advertised in the sitemap.
    const html = fs.readFileSync(file, 'utf8');
    if (/<meta[^>]+name=["']robots["'][^>]*noindex/i.test(html)) continue;
    const loc = canonicalUrlForFile(file);
    if (!loc || existingLocs.has(loc)) continue;
    existingLocs.add(loc);
    // lastmod comes from the content-hash ledger when the page is tracked
    // there, so an untouched page keeps an honest date instead of claiming to
    // change on every build.
    const key = loc.slice(SITE.length) || '/';
    const tracked = LASTMOD[key] && LASTMOD[key].date;
    entries.push({
      loc,
      lastmod: tracked || CONTENT_UPDATED,
      freq: 'weekly',
      // Hubs outrank their members; blog posts sit below both.
      priority: loc.endsWith('/') ? '0.7' : '0.6',
    });
  }
  return entries.sort((a, b) => a.loc.localeCompare(b.loc));
}

/*
 * Which child sitemap a URL belongs in.
 *
 * Search Console reports index coverage per submitted sitemap and nothing
 * else, so one flat sitemap can only ever answer "266 of 272 indexed" - never
 * which cluster is being dropped. That distinction is the whole reason to
 * split: the programmatic country and city pages are the ones Google is most
 * likely to judge thin, and they need to be watchable on their own rather
 * than averaged in with the hand-written landing pages.
 *
 * Classification is by URL path, not by which generator produced the page, so
 * the 177 geo pages that ship from disk without a live generator (see
 * SEO.md, "Do not fix the orphaned generators") land in the right cluster too.
 */
const LOCALE_HOMES = new Set(LOCALES.map(l => `/${l.code}/`));
const MAIN_PATHS = new Set(['/', '/pricing', '/about', '/contact', '/privacy', '/terms', '/community-guidelines', '/refund']);

function sitemapCluster(loc) {
  const p = loc.slice(SITE.length) || '/';
  if (p.startsWith('/countries')) return 'countries';
  if (p.startsWith('/cities')) return 'cities';
  if (p.startsWith('/languages')) return 'languages';
  if (p.startsWith('/regions')) return 'regions';
  if (p.startsWith('/blog')) return 'blog';
  if (MAIN_PATHS.has(p) || LOCALE_HOMES.has(p)) return 'main';
  return 'pages';
}

// Declaration order in the index, most important cluster first.
const SITEMAP_CLUSTERS = ['main', 'pages', 'countries', 'regions', 'languages', 'blog'];

/*
 * Every indexable URL as a {loc, lastmod, xml} record, from both sources: the
 * page sets this script builds and the sweep of everything else on disk.
 */
function collectSitemapEntries() {
  const seen = new Set();
  const entries = sitemapUrls.map(u => {
    const loc = u.raw ? `${SITE}/${u.slug}` : url(u.slug);
    seen.add(loc);
    const lastmod = lastmodFor(loc, u.lastmod);
    const alts = u.home
      ? homeAlternates((href, lang) => `\n    <xhtml:link rel="alternate" hreflang="${lang}" href="${href}"/>`).join('')
      : '';
    return {
      loc,
      lastmod,
      xml: `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${u.freq}</changefreq>\n    <priority>${u.priority}</priority>${alts}\n  </url>`,
    };
  });
  for (const u of extraSitemapEntries(seen)) {
    const lastmod = lastmodFor(u.loc, u.lastmod);
    entries.push({
      loc: u.loc,
      lastmod,
      xml: `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${u.freq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
    });
  }
  return entries;
}

const URLSET_HEAD = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">';

/*
 * Writes the six child sitemaps and the <sitemapindex> at /sitemap.xml, and
 * deletes any sitemap-*.xml this build did not just write.
 *
 * That last part matters: a stale child sitemap listing URLs that now 301 is
 * worse than no sitemap, because it teaches the crawler that this site's
 * sitemaps cannot be trusted. Deriving the file list from the URLs and then
 * sweeping whatever is left means the split cannot drift the way the previous
 * hand-maintained sitemap-*.xml files did.
 *
 * robots.txt keeps pointing at /sitemap.xml alone - submitting the index is
 * how a crawler discovers all six. server/indexnow.js already follows an index
 * one level down into its children before submitting, so IndexNow keeps
 * pushing page URLs rather than six sitemap URLs.
 */
function writeSitemaps() {
  const entries = collectSitemapEntries();
  const byCluster = new Map(SITEMAP_CLUSTERS.map(name => [name, []]));
  for (const entry of entries) byCluster.get(sitemapCluster(entry.loc)).push(entry);

  const written = new Set();
  const indexed = [];
  for (const name of SITEMAP_CLUSTERS) {
    const group = byCluster.get(name);
    // An empty cluster is not listed at all. Submitting a sitemap with zero
    // URLs is reported as an error in Search Console.
    if (!group.length) continue;
    const file = `sitemap-${name}.xml`;
    fs.writeFileSync(
      path.join(PUBLIC, file),
      `${URLSET_HEAD}\n${group.map(e => e.xml).join('\n')}\n</urlset>\n`
    );
    written.add(file);
    // The index's lastmod for a child is the newest lastmod inside it, so a
    // single changed page marks exactly one child as worth refetching.
    indexed.push({ file, lastmod: group.reduce((a, e) => (e.lastmod > a ? e.lastmod : a), group[0].lastmod) });
  }

  fs.writeFileSync(path.join(PUBLIC, 'sitemap.xml'),
    '<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + indexed.map(s => `  <sitemap>\n    <loc>${SITE}/${s.file}</loc>\n    <lastmod>${s.lastmod}</lastmod>\n  </sitemap>`).join('\n')
    + '\n</sitemapindex>\n');

  for (const stale of fs.readdirSync(PUBLIC)) {
    if (/^sitemap-.+\.xml$/.test(stale) && !written.has(stale)) {
      fs.unlinkSync(path.join(PUBLIC, stale));
    }
  }
  return { total: entries.length, children: indexed.length };
}

// Re-hash the pages before the sitemaps are written, so every lastmod they
// publish is one the ledger can actually account for.
const noindexedCities = noindexUnsupportedCityPages();
refreshLastmodLedger();
const { total: sitemapTotal, children: sitemapChildren } = writeSitemaps();

// RSS feed for the blog - enables autodiscovery, feed readers and syndication.
function buildRss() {
  const items = [...BLOG].sort((a, b) => b.date.localeCompare(a.date)).map(b => `  <item>
    <title>${esc(b.h1)}</title>
    <link>${blogUrl(b.slug)}</link>
    <guid isPermaLink="true">${blogUrl(b.slug)}</guid>
    <pubDate>${new Date(b.date + 'T12:00:00Z').toUTCString()}</pubDate>
    <category>${esc(b.tag)}</category>
    <description>${esc(b.description)}</description>
  </item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>TalkLive Blog</title>
  <link>${SITE}/blog/</link>
  <atom:link href="${SITE}/blog/feed.xml" rel="self" type="application/rss+xml"/>
  <description>Guides and research on talking to strangers, voice chat, language practice and online safety - from the team behind TalkLive.</description>
  <language>en</language>
  <lastBuildDate>${new Date(latestBlogUpdate + 'T12:00:00Z').toUTCString()}</lastBuildDate>
${items}
</channel>
</rss>
`;
}
fs.writeFileSync(path.join(BLOG_DIR, 'feed.xml'), buildRss());

// llms.txt - a curated site map for AI assistants and answer engines
// (ChatGPT, Perplexity, Claude, Gemini), which increasingly send users to
// sites they can summarize accurately. https://llmstxt.org
function buildLlmsTxt() {
  const posts = BLOG.map(b => `- [${b.h1}](${blogUrl(b.slug)}): ${b.description}`).join('\n');
  return `# TalkLive

> TalkLive (${SITE}) is a browser-based random chat service for adults, offering one-to-one voice calls and text chat. Core matching is free and does not require an account. Voice uses encrypted WebRTC over a TURN relay in production and is not recorded or stored by TalkLive. Typed messages and related context may be retained for a limited rolling period as described in the Privacy Policy.

Key facts: voice-only or text-only modes; optional country and interest preferences do not guarantee a specific match; matching is instant for everyone; optional Premium is announced but not yet available for purchase; no video chat; 18+ policy; leave, block and report controls. Participant identity, age, location and intent are not verified.

## Common uses
- Talking to someone new by voice without a camera, phone number or app install (works in any mobile or desktop browser).
- Practising spoken English (or another language) with real people: see [Practice English Speaking](${SITE}/practice-english-speaking) and [Language Exchange](${SITE}/language-exchange).
- A free, voice-first [Omegle alternative](${SITE}/omegle-alternative) for adults, with text chat for people who prefer typing.
- Late-night conversation when friends are asleep: see [Late Night Chat](${SITE}/late-night-chat).
- Keeping in touch with people you click with through the built-in Friends feature, without exchanging phone numbers.

## Who uses TalkLive (as of October 2026)
- Visitors from about 170 countries in a typical month. The largest groups are from India, the United States, Pakistan, China, Egypt, Bangladesh, the United Kingdom, Nigeria, Germany and Saudi Arabia.
- About 70% of visitors are on a phone. Most conversations are in English; Chinese, Arabic, French, Spanish, Russian and German are the next most common interface languages.
- Matching prefers people with shared interests and then people using the same interface language, but never makes anyone wait for a match.
- Text chat is used more than voice; mini games (Tic Tac Toe, Dots & Boxes), reactions, GIFs and a friends list are built in.

## Main pages
- [TalkLive app](${SITE}/): Start a random voice or text chat instantly.

## Official accounts
${SOCIAL.PROFILES.map(p => `- ${p.name} (${p.handle}): ${p.url}`).join('\n')}
- Email: ${SOCIAL.EMAIL}

## Guides
${TOPIC_GUIDES.TOPICS.map(t => `- [${t.name}](${SITE}/${t.slug}): ${t.description}`).join('\n')}

## Country guides
${COUNTRY_GUIDES.COUNTRIES.map(c => `- [${c.name}](${SITE}/countries/${c.slug}): ${c.description}`).join('\n')}

## Languages
The app UI and a localized homepage are available in: English plus ${LOCALES.map(l => `[${l.name}](${SITE}/${l.code}/)`).join(', ')}.

## Regional and language features
${JOURNAL.REGIONS.map(r => `- [${r.h1}](${SITE}${r.path}): ${r.description}`).join('\n')}
- [${JOURNAL.LANGUAGES_META.h1}](${SITE}/languages/): ${JOURNAL.LANGUAGES_META.description}

## Blog
${posts}

## Policies
- [About](${SITE}/about)
- [Pricing](${SITE}/pricing)
- [Privacy](${SITE}/privacy)
- [Terms](${SITE}/terms)
- [Contact](${SITE}/contact)
`;
}
fs.writeFileSync(path.join(PUBLIC, 'llms.txt'), buildLlmsTxt());

// IndexNow ownership key file (served at /<key>.txt) - lets us push URL
// updates straight to Bing/Yandex/Seznam/Naver. See server/indexnow.js.
const { KEY: INDEXNOW_KEY, RETIRED_KEYS } = require('../server/indexnow');
// Remove only the keys explicitly listed as retired in server/indexnow.js.
// An earlier version of this deleted every hex-named .txt at the root that
// was not the current key, which would have silently destroyed a second key
// file added on purpose - IndexNow allows many keys per host, which is how
// you delegate submission to an agency or a second tool without sharing your
// own. Retiring a key is a deliberate edit to that list, never a side effect
// of running a build.
for (const retired of RETIRED_KEYS) {
  const stale = path.join(PUBLIC, `${retired}.txt`);
  if (retired !== INDEXNOW_KEY && fs.existsSync(stale)) fs.unlinkSync(stale);
}
fs.writeFileSync(path.join(PUBLIC, `${INDEXNOW_KEY}.txt`), INDEXNOW_KEY + '\n');

console.log(`Built ${count} landing pages + sitemap.xml (index of ${sitemapChildren} sitemaps, ${sitemapTotal} urls) + blog/feed.xml + llms.txt + indexnow key; ${noindexedCities} unsupported city pages set to noindex.`);
