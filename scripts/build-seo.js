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
const { languagesAnswer } = require('./data/languages');
const { pageArt, blogArt, artImg } = require('./illustrations');
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

// Every landing page appears in the global nav/footer so link equity flows
// between them and back to the app. `slug: ''` is the home app.
const NAV = [
  { slug: 'random-voice-chat', label: 'Voice Chat' },
  { slug: 'random-text-chat', label: 'Text Chat' },
  { slug: 'language-exchange', label: 'Language Exchange' },
  { slug: 'practice-english-speaking', label: 'Practice English Speaking' },
  { slug: 'make-friends-online', label: 'Make Friends Online' },
  { slug: 'late-night-chat', label: 'Late Night Chat' },
];

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

function headerHtml(currentSlug) {
  const primary = [
    { slug: 'random-voice-chat', label: 'Voice Chat' },
    { slug: 'random-text-chat', label: 'Text Chat' },
    { slug: 'language-exchange', label: 'Languages' },
    { slug: 'safety', label: 'Safety' },
    { slug: 'resources', label: 'Resources' },
  ];
  const links = primary.filter(n => n.slug !== currentSlug).slice(0, 5)
    .map(n => `<a href="/${n.slug}">${n.label}</a>`).join('');
  return `<header class="site-header">
    <div class="wrap">
      <a class="logo" href="/"><img src="/favicon.svg" width="30" height="30" alt="TalkLive logo" /><span class="logo-name">Talk<span class="logo-live">Live</span></span></a>
      <nav class="nav" aria-label="Primary">${links}</nav>
      <span style="display:inline-flex;gap:8px">
        <a class="btn btn-talk" href="${appHref('/', 'seo')}" style="padding:10px 18px;font-size:15px">🎙 Talk</a>
        <a class="btn btn-chat" href="${appHref('/chat', 'seo')}" style="padding:10px 18px;font-size:15px">💬 Chat</a>
      </span>
    </div>
  </header>`;
}

function footerHtml() {
  const cols = [
    { h: 'Talk', items: NAV.slice(0, 4) },
    { h: 'Discover', items: [
      { slug: 'resources', label: 'Resource Hub' },
      { slug: 'voice-chat-vs-video-chat', label: 'Voice vs Video' },
      { slug: 'languages/', label: 'Languages' },
      { slug: 'regions/south-asia', label: 'South Asia' },
      { slug: 'regions/europe', label: 'Europe' },
      { slug: 'regions/americas', label: 'The Americas' },
      { slug: 'how-it-works', label: 'How It Works' },
      { slug: 'safety', label: 'Safety Center' },
    ] },
  ];
  const colHtml = cols.map(c => `<div><h4>${c.h}</h4><ul>${c.items.map(i => `<li><a href="/${i.slug}">${i.label}</a></li>`).join('')}</ul></div>`).join('');
  return `<footer class="site-footer">
    <div class="wrap">
      <div class="cols">
        <div style="max-width:280px">
          <a class="logo" href="/"><img src="/favicon.svg" width="28" height="28" alt="TalkLive logo" /><span class="logo-name">Talk<span class="logo-live">Live</span></span></a>
          <p style="margin-top:12px">Free one-to-one voice and text conversations with people around the world. Tap to Talk or Tap to Chat - no sign-up, adults 18+, with block and report on every screen.</p>
        </div>
        ${colHtml}
        <div><h4>App</h4><ul>
          <li><a href="/">Open TalkLive</a></li>
          <li><a href="/blog/">Blog</a></li>
          <li><a href="/pricing">Pricing</a></li>
          <li><a href="/about">About</a></li>
          <li><a href="/contact">Contact</a></li>
          <li><a href="/privacy">Privacy Policy</a></li>
          <li><a href="/terms">Terms</a></li>
          <li><a href="/community-guidelines">Community Guidelines</a></li>
          <li><a href="/refund">Refund Policy</a></li>
        </ul></div>
      </div>
      <div class="legal">
        <span>&copy; ${new Date().getFullYear()} TalkLive. All rights reserved.</span>
        <span>Made for people who love to talk. 18+ only.</span>
        <span><a href="/contact">Support</a></span>
      </div>
    </div>
  </footer>`;
}

const PAGE_CLUSTERS = {
  voice: ['random-voice-chat', 'voice-chat-vs-video-chat'],
  text: ['random-text-chat'],
  discovery: ['make-friends-online', 'late-night-chat'],
  language: ['practice-english-speaking', 'language-exchange', 'language-chat-guide', 'country-chat-guide'],
  trust: ['safety', 'how-it-works', 'resources'],
};

function pageCluster(pageModel) {
  if (pageModel && pageModel.cluster) return pageModel.cluster;
  const hit = Object.entries(PAGE_CLUSTERS).find(([, slugs]) => slugs.includes(pageModel && pageModel.slug));
  return hit ? hit[0] : 'discovery';
}

function linkCloud(currentSlug) {
  const current = PAGES.find((pageModel) => pageModel.slug === currentSlug);
  const explicit = current && Array.isArray(current.relatedPages) ? current.relatedPages : [];
  const sameCluster = PAGES
    .filter((pageModel) => pageModel.slug !== currentSlug && pageCluster(pageModel) === pageCluster(current))
    .map((pageModel) => pageModel.slug);
  const fallback = ['resources', 'safety', 'how-it-works', 'random-voice-chat', 'random-text-chat', 'make-friends-online', 'language-exchange'];
  const slugs = [];
  for (const slug of explicit.concat(sameCluster, fallback)) {
    if (!slug || slug === currentSlug || slugs.includes(slug)) continue;
    if (!PAGES.some((pageModel) => pageModel.slug === slug)) continue;
    slugs.push(slug);
    if (slugs.length === 10) break;
  }
  const links = slugs.map((slug) => {
    const model = PAGES.find((pageModel) => pageModel.slug === slug);
    return `<a href="/${slug}">${esc(model.crumb)}</a>`;
  }).join('');
  return `<nav class="link-cloud" aria-label="Related TalkLive guides">${links}</nav>`;
}

// --- Page template ----------------------------------------------------------

// Ad slots used throughout generated pages; public/ads.js fills them with Google AdSense units.
//
// Every slot ships inside the labelled .ad-card frame the app screens use, so
// an ad reads as part of the product rather than as something dropped onto it,
// and it is always marked as advertising rather than left to look like our own
// recommendation. ads.js hides the whole card when a slot goes unfilled off
// screen, so a "Sponsored" label is never stranded above an empty box.
//
// The label text is plain rather than data-i18n: these pages do not load
// i18n.js, so an i18n key here would never be substituted.
function adSlot(type) {
  return `<div class="wrap"><div class="ad-card"><span class="ad-card-label">Advertisement</span><div data-ad="${type}"></div></div></div>`;
}

// Responsive leaderboard: 728x90 on desktop, 320x50 on mobile.
function leaderboardAd() { return adSlot('leaderboard'); }

// Native recommendation-style unit near the end of long-form content.
function nativeAd() { return adSlot('native'); }

// Side-by-side comparison table for "X alternative" pages. Tables like this
// are the format Google most often lifts into a featured snippet for
// "<competitor> vs" and "<competitor> alternative" queries, and they give the
// page something genuinely useful that the competitor's own site will not say.
function compareHtml(c) {
  if (!c) return '';
  const rows = c.rows.map(r =>
    `<tr><th scope="row">${r.label}</th><td>${r.them}</td><td class="us">${r.us}</td></tr>`).join('');
  return `<section id="compare">
    <div class="wrap">
      <h2>${esc(c.h)}</h2>
      <p class="section-intro">${c.intro}</p>
      <div class="table-scroll">
        <table class="compare">
          <thead><tr><th scope="col">&nbsp;</th><th scope="col">${esc(c.them)}</th><th scope="col">TalkLive</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="table-hint">Swipe the table sideways to see the TalkLive column →</p>
    </div>
  </section>`;
}

// Blog posts surfaced on a landing page. An explicit `posts` list wins;
// otherwise posts are dealt out round-robin from the page's position in
// PAGES, so every article picks up inbound links instead of the first three
// hogging them all.
function relatedPostsHtml(p, index) {
  const picked = (p.posts || []).map(s => BLOG.find(b => b.slug === s)).filter(Boolean);
  const stopWords = new Set(['about', 'after', 'anonymous', 'best', 'chat', 'free', 'from', 'have', 'into', 'online', 'random', 'talklive', 'that', 'their', 'this', 'voice', 'with', 'your']);
  const terms = (p.title + ' ' + p.description + ' ' + p.h1 + ' ' + pageCluster(p))
    .toLowerCase().match(/[a-z]{4,}/g) || [];
  const wanted = new Set(terms.filter((term) => !stopWords.has(term)));
  const auto = BLOG.filter((post) => !picked.includes(post)).map((post) => {
    const haystack = `${post.h1} ${post.description} ${post.tag}`.toLowerCase();
    const score = [...wanted].reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
    return { post, score };
  }).sort((a, b) => b.score - a.score || b.post.date.localeCompare(a.post.date))
    .map((entry) => entry.post);
  const items = picked.concat(auto).slice(0, 3).map(b =>
    `<a class="card card-with-art" href="/blog/${b.slug}" style="display:block;text-decoration:none;color:inherit">
      <div class="card-art">${artImg(blogArt(b))}</div>
      <p style="margin:0 0 8px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;opacity:.7">${esc(b.tag)}</p>
      <h3 style="margin:0 0 10px">${esc(b.h1)}</h3><p>${esc(b.description)}</p></a>`).join('');
  return `<section>
    <div class="wrap">
      <h2>Read more from the TalkLive blog</h2>
      <div class="grid">${items}</div>
      <p style="margin-top:18px"><a href="/blog/">Browse all articles →</a></p>
    </div>
  </section>`;
}

function page(p, index) {
  const canonical = url(p.slug);
  const features = p.features.map(f => `<div class="card"><div class="ico">${icon(f.icon)}</div><h3>${f.h}</h3><p>${f.p}</p></div>`).join('');
  const steps = p.steps.map(s => `<div class="step"><h3>${s.h}</h3><p>${s.p}</p></div>`).join('');
  const proseHtml = p.prose.map(b => b.h ? `<h2>${b.h}</h2>${b.body.map(x => `<p>${x}</p>`).join('')}` : b.body.map(x => `<p>${x}</p>`).join('')).join('');
  const faqHtml = p.faq.map(f => `<details><summary>${f.q}</summary><p>${f.a}</p></details>`).join('');

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': ORGANIZATION_ID,
        name: 'TalkLive',
        alternateName: ['Talk Live', 'TalkLive App'],
        url: `${SITE}/`,
        logo: { '@type': 'ImageObject', url: LOGO_IMAGE, width: 192, height: 192 },
        email: 'info@talklive.app',
      },
      {
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        name: 'TalkLive',
        alternateName: ['Talk Live', 'TalkLive App'],
        url: `${SITE}/`,
        inLanguage: LANGS,
        publisher: { '@id': ORGANIZATION_ID },
      },
      {
        '@type': 'WebApplication',
        '@id': APP_ID,
        name: 'TalkLive',
        url: `${SITE}/`,
        applicationCategory: 'CommunicationApplication',
        operatingSystem: 'Any device with a modern web browser',
        browserRequirements: 'JavaScript; microphone permission is required only for voice calls',
        isAccessibleForFree: true,
        brand: BRAND,
        offers: freeOffer(),
        inLanguage: LANGS,
        audience: { '@type': 'PeopleAudience', suggestedMinAge: 18 },
        publisher: { '@id': ORGANIZATION_ID },
      },
      {
        '@type': 'WebPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: p.title,
        description: p.description,
        dateModified: p.updated || CONTENT_UPDATED,
        inLanguage: 'en',
        isPartOf: { '@id': WEBSITE_ID },
        about: { '@id': APP_ID },
        primaryImageOfPage: { '@type': 'ImageObject', url: OG_IMAGE, width: 1200, height: 630 },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonical}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: p.crumb, item: canonical },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${canonical}#faq`,
        mainEntity: p.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
      {
        '@type': 'HowTo',
        '@id': `${canonical}#how`,
        name: p.stepsH,
        description: p.stepsIntro,
        step: p.steps.map((s, i) => ({
          '@type': 'HowToStep', position: i + 1, name: s.h, text: s.p, url: `${canonical}#how`,
        })),
      },
    ],
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<link rel="stylesheet" href="/seo.css?v=20260923art" />
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description)}" />
<meta name="robots" content="${p.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}" />
<meta name="theme-color" content="#0b0f1a" />
<meta name="author" content="TalkLive" />
<link rel="canonical" href="${canonical}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="TalkLive" />
<meta property="og:title" content="${esc(p.title)}" />
<meta property="og:description" content="${esc(p.description)}" />
<meta property="og:url" content="${canonical}" />
<meta property="og:image" content="${OG_IMAGE}" />
<meta property="og:image:secure_url" content="${OG_IMAGE}" />
<meta property="og:image:type" content="image/png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="TalkLive - free one-to-one voice calls and text chat with people worldwide" />
<meta property="og:locale" content="en_US" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(p.title)}" />
<meta name="twitter:description" content="${esc(p.description)}" />
<meta name="twitter:image" content="${OG_IMAGE}" />
<meta name="twitter:image:alt" content="TalkLive voice and text chat" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/favicon-192.png" />
<link rel="manifest" href="/site.webmanifest" />
<script defer src="/pwa.js?v=20260908pwa"></script>
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5162304231095978"
     crossorigin="anonymous"></script>
</head>
<body>
<a class="skip-link" href="#main-content">Skip to main content</a>
${headerHtml(p.slug)}
<main id="main-content">
  <section class="hero">
    <div class="wrap hero-split">
      <div class="hero-copy">
      <span class="eyebrow"><span class="dot"></span> ${p.eyebrow}</span>
      <h1>${p.h1}</h1>
      <p class="lede">${p.lede}</p>
      <div class="cta-row">
        <a class="btn btn-talk" href="${appHref('/', 'seo')}">🎙 ${p.cta}</a>
        <a class="btn btn-chat" href="${appHref('/chat', 'seo')}">💬 ${p.ctaChat || 'Tap to Chat'}</a>
        <a class="btn btn-ghost" href="#how">How it works</a>
      </div>
      <p class="hero-meta">Core matching is free · Ad-supported · No sign-up required · Voice &amp; text · Adults 18+ · Leave any time</p>
      </div>
      <div class="hero-art">${artImg(pageArt(p.slug), { eager: true })}</div>
    </div>
  </section>

  <section id="features">
    <div class="wrap center">
      <h2>${p.featuresH}</h2>
      <p class="section-intro">${p.featuresIntro}</p>
      <div class="grid">${features}</div>
    </div>
  </section>

  <section id="how">
    <div class="wrap">
      <h2>${p.stepsH}</h2>
      <p class="section-intro">${p.stepsIntro}</p>
      <div class="steps">${steps}</div>
    </div>
  </section>

  ${compareHtml(p.compare)}

  <section>
    <div class="wrap prose">${proseHtml}</div>
  </section>

  ${adSlot('native')}

  <section class="faq">
    <div class="wrap">
      <h2>Frequently asked questions</h2>
      <div class="faq-layout"><div>${faqHtml}</div>${artImg('question-answered', { cls: 'art art-faq' })}</div>
    </div>
  </section>

  ${leaderboardAd()}

  ${relatedPostsHtml(p, index)}

  <section>
    <div class="wrap">
      <h2>Explore more ways to connect</h2>
      <p class="section-intro">TalkLive is one app with many ways to meet people. Jump into whichever fits your mood.</p>
      ${linkCloud(p.slug)}
    </div>
  </section>

  <div class="wrap">
    <div class="cta-band">
      ${artImg('walking-together', { cls: 'art art-cta' })}
      <h2>${p.ctaBandH}</h2>
      <p>${p.ctaBandP}</p>
      <div class="cta-row">
        <a class="btn btn-talk" href="${appHref('/', 'seo')}">🎙 ${p.cta}</a>
        <a class="btn btn-chat" href="${appHref('/chat', 'seo')}">💬 ${p.ctaChat || 'Tap to Chat'}</a>
      </div>
    </div>
  </div>

  ${nativeAd()}
</main>
${footerHtml()}
</body>
</html>
`;
}

// --- Content model ----------------------------------------------------------

const CORE_PAGES = [
  {
    slug: 'random-voice-chat',
    crumb: 'Random Voice Chat',
    eyebrow: 'Audio only',
    title: 'Random Voice Chat - Free, Audio Only, No Camera | TalkLive',
    description: 'Free random voice chat for adults. TalkLive uses audio only - no camera or account required. Match availability varies with the live queue.',
    keywords: 'random voice chat, voice chat, live voice chat, free voice chat, random voice call, audio chat',
    h1: 'Random Voice Chat - Free, Audio Only, No Camera',
    lede: 'Press one button to join the live voice queue and, when another adult is available, talk voice to voice. No video, typing or account is required. Identity, age and location are not verified.',
    cta: 'Start Random Voice Chat',
    featuresH: 'Random voice chat, done right',
    featuresIntro: 'Encrypted WebRTC audio and simple matching make it easy to start a conversation.',
    features: [
      { icon: 'mic', h: 'Real-time audio', p: 'WebRTC carries encrypted voice audio in real time through TalkLive\'s production relay.' },
      { icon: 'bolt', h: 'Simple random matching', p: 'No lobbies to browse. One tap joins the queue; wait time depends on who is online and any filters you set.' },
      { icon: 'shield', h: 'Private by default', p: 'TalkLive does not record or store voice audio. Other participants can still record on their own devices, so share carefully.' },
      { icon: 'next', h: 'Skip anytime', p: 'Tap Next to leave one voice chat and return to the queue for another available match.' },
      { icon: 'globe', h: 'Global voices', p: 'Talk with random people across the world or narrow it to your favorite regions.' },
      { icon: 'chat', h: 'Text alongside voice', p: 'Share a name, link, or word using in-call chat without interrupting the audio.' },
    ],
    stepsH: 'How random voice chat works',
    stepsIntro: 'Voice-only means you focus on the conversation, not on how you look.',
    steps: [
      { h: 'Press Tap to Talk', p: 'Allow your microphone and join the live queue with a single tap.' },
      { h: 'Get matched at random', p: 'TalkLive pairs you with another available person from the live queue.' },
      { h: 'Chat voice to voice', p: 'Speak freely. Mute when you need to, use in-call text for anything you want to type.' },
      { h: 'Next or make a friend', p: 'Loved the chat? Add them as a friend. Otherwise, tap Next for a new voice.' },
    ],
    prose: [
      { h: 'Why voice beats video and text', body: [
        'Random voice chat hits a sweet spot. Text feels slow and easy to fake; video can feel exposing and puts pressure on appearance. Voice keeps things human and warm while protecting your privacy - people relax, open up, and actually enjoy the conversation.',
        'Because TalkLive is audio-only, it also works great on slow connections and older phones. There is no camera to worry about and far less data to burn.' ] },
      { h: 'Built on encrypted real-time audio', body: [
        'TalkLive uses WebRTC for encrypted live audio. Production calls use a TURN relay for reliable connectivity, but TalkLive does not record or store voice audio. A participant can still record what they hear on their own device, so avoid sharing sensitive information.' ] },
      { h: 'Great for language practice', body: [
        'Learners use random voice chat to practice speaking with native and fluent speakers from around the world. A few minutes of real conversation does more for your accent and confidence than an hour of drills.' ] },
    ],
    faq: [
      { q: 'Is TalkLive voice chat free?', a: 'Core random voice matching is free. Wait time and match availability depend on the live queue and any selected filters.' },
      { q: 'Do I need headphones?', a: 'Headphones are recommended because they prevent echo and improve call quality, but they are not required.' },
      { q: 'Is there video?', a: 'No. TalkLive is intentionally audio-only, which keeps it private, low-bandwidth, and pressure-free.' },
      { q: 'Are my calls recorded?', a: 'TalkLive does not record or store voice audio. Another participant can still record on their own device, so do not share sensitive information.' },
      { q: 'Can I use it on mobile data?', a: 'Yes. Voice-only chat uses very little data, so it works well on mobile networks and slower connections.' },
    ],
    ctaBandH: 'Join the live voice queue in one tap',
    ctaBandP: 'Start searching for an available random voice match. Wait time varies with the live queue.',
  },
  {
    slug: 'random-text-chat',
    crumb: 'Random Text Chat',
    eyebrow: 'Text only · no mic',
    title: 'Random Text Chat - Free, No Mic, No Sign-Up | TalkLive',
    description: 'Free one-to-one text chat with people worldwide. Tap to Chat and get paired with someone new in seconds - no mic, no sign-up, adults 18+.',
    keywords: 'random text chat, text chat, free text chat, chat without mic, online text chat',
    h1: 'Random Text Chat - Instant, Private, No Mic',
    lede: 'Not in the mood to talk out loud? Tap to Chat and TalkLive pairs you with someone new for a live, one-to-one text conversation. No microphone, no sign-up, no video - just fast, private messaging with a real person.',
    cta: 'Tap to Talk',
    ctaChat: 'Start Text Chat',
    featuresH: 'Text chat, stripped to the fun part',
    featuresIntro: 'Instant matching and a buttery-smooth chat screen that flies even on low-end phones.',
    features: [
      { icon: 'chat', h: 'Instant text match', p: 'Tap once and you are typing with a random stranger in seconds - no lobbies, no forms.' },
      { icon: 'bolt', h: 'Feather-light', p: 'No audio or video streams. The chat runs smoothly on 1GB phones, old laptops, and 2G-era connections.' },
      { icon: 'lock', h: 'Totally anonymous', p: 'No name, number, or email. You appear as a temporary display name that vanishes when you leave.' },
      { icon: 'shield', h: 'Moderated text', p: 'Typed messages and related context may be retained for a limited rolling period for delivery, safety and moderation.' },
      { icon: 'next', h: 'Next in one tap', p: 'Conversation fizzled? Tap next and a brand-new stranger appears instantly.' },
      { icon: 'mic', h: 'Switch to voice anytime', p: 'Feeling brave? One tap moves you to a live voice call - same app, same stranger pool.' },
    ],
    stepsH: 'How random text chat works',
    stepsIntro: 'From this page to a live conversation takes under five seconds - no permissions needed.',
    steps: [
      { h: 'Open TalkLive', p: 'Works in any browser on any device. Nothing to install, nothing to allow.' },
      { h: 'Tap to Chat', p: 'Press the blue chat button - no microphone or camera permission required.' },
      { h: 'Get matched instantly', p: 'We pair you with a random person who wants to text chat right now.' },
      { h: 'Type, laugh, next', p: 'Chat as long as you like, add a friend, or tap next for someone new.' },
    ],
    prose: [
      { h: 'Sometimes typing beats talking', body: [
        'Voice is great, but there are moments when text wins: you are in a quiet room at 2 a.m., on a bus, at work, or you simply think better with your thumbs. Random text chat gives you the same thrill of meeting a stranger - the new perspectives, the unexpected jokes, the "where are you from?" - without making a sound.',
        'TalkLive treats text as a first-class way to connect. Tap to Chat has its own matching pool, so everyone you meet there wants to type too. Nobody is waiting for you to unmute.' ] },
      { h: 'Built to fly on any device', body: [
        'Because a text chat carries no audio or video stream, TalkLive\'s chat mode is extraordinarily light. It works smoothly on entry-level Android phones, old desktops, and slow connections where video chat apps stutter and die. Messages are relayed instantly over a single lightweight connection.',
        'That makes it perfect for people on limited data plans too - an entire evening of text chat uses less data than a minute of video.' ] },
      { h: 'Anonymous, moderated, 18+', body: [
        'The same safety rails as voice chat apply: everyone is 18 or older, you appear only as a temporary display name, links are blocked automatically, and one tap reports and blocks anyone who misbehaves. Repeated reports lead to automatic bans.' ] },
    ],
    faq: [
      { q: 'Is random text chat on TalkLive free?', a: 'Core random text matching is free and needs no credit card. Optional Premium features are described on the Pricing page.' },
      { q: 'Do I need a microphone?', a: 'No. Tap to Chat is pure text - no microphone or camera permission is ever requested.' },
      { q: 'Will it work on my old phone?', a: 'Yes. Chat mode carries no audio or video, so it runs smoothly even on 1GB devices and slow networks.' },
      { q: 'Are my messages saved?', a: 'Typed messages and related context may be retained for a limited rolling period for delivery, safety and moderation. See the Privacy Policy for current details.' },
      { q: 'Can I switch to a voice call?', a: 'Yes. Tap to Talk any time to join the voice pool - the same app with the same instant matching.' },
    ],
    ctaBandH: 'Someone is ready to chat right now',
    ctaBandP: 'Tap the blue button and say hi - no mic, no sign-up, no waiting.',
  },
  {
    slug: 'practice-english-speaking',
    crumb: 'Practice English Speaking',
    eyebrow: 'Language practice',
    title: 'Practice English Speaking Online - Free | TalkLive',
    description: 'Practice English speaking online free with real people. TalkLive starts live voice conversations in seconds - no classes, no fees, no sign-up.',
    keywords: 'practice english speaking, english speaking practice, practice english online free, english conversation practice, improve spoken english, talk in english online, free english speaking practice app',
    h1: 'Practice English Speaking with Real People - Free',
    lede: 'Speaking with different people can complement structured language study. TalkLive offers free random voice matching, but it does not guarantee a fluent speaker, teacher, language, country or availability.',
    cta: 'Practice Speaking Now',
    ctaChat: 'Practice by Text First',
    featuresH: 'Why learners practice English on TalkLive',
    featuresIntro: 'Real conversations beat drills - and here every conversation is real.',
    features: [
      { icon: 'mic', h: 'Real conversation, instantly', p: 'One tap puts you in a live English conversation. No lesson plans, no scheduling, no tutors to book.' },
      { icon: 'globe', h: 'Every accent on Earth', p: 'Talk with speakers from the US, UK, India, the Philippines and beyond - train your ear on real-world English.' },
      { icon: 'shield', h: 'Mistake-friendly', p: 'Strangers are anonymous and judgment-free. Fumble a sentence, laugh, try again - nobody knows you.' },
      { icon: 'next', h: 'Different conversation partners', p: 'A new match can expose you to different speaking styles, but language level and availability are not guaranteed.' },
      { icon: 'chat', h: 'Warm up by text', p: 'Nervous? Start in Tap to Chat to practice written English, then switch to voice when you are ready.' },
      { icon: 'heart', h: 'Free core matching', p: 'Core random voice matching is free; optional Premium changes filters and the between-call wait, not the need to buy lessons.' },
    ],
    stepsH: 'How to practice English speaking here',
    stepsIntro: 'The method is simple: speak every day, with different people, about real things.',
    steps: [
      { h: 'Tap to Talk', p: 'Open TalkLive in your browser, allow the microphone, and press the green button.' },
      { h: 'Say hello', p: '"Hi! Where are you from?" is a perfect opener - and instant listening practice.' },
      { h: 'Keep it going', p: 'Talk about your day, your city, movies, food. Real topics build real vocabulary.' },
      { h: 'Repeat daily', p: 'Ten minutes a day with new partners beats an hour of drills once a week.' },
    ],
    prose: [
      { h: 'The fastest way to improve is to speak', body: [
        'Most learners spend years on grammar apps and vocabulary lists yet freeze when a real conversation starts. That is because speaking is a skill of its own - it needs live pressure, real reactions, and the small chaos of genuine conversation. TalkLive supplies exactly that, on demand, for free.',
        'Every call is spontaneous: you cannot script it, so your brain learns to build sentences in real time. A few weeks of daily ten-minute conversations does more for spoken fluency than months of silent study.' ] },
      { h: 'No teachers, no judgment - just practice', body: [
        'Speaking a new language in front of people you know is scary; speaking it to an anonymous stranger is not. On TalkLive nobody knows your name or face, so the fear of embarrassment disappears. If a conversation goes badly, tap Next - the next partner never knew.',
        'Many users you meet are learners too, practicing exactly like you, while others are native speakers happy to chat. Both make excellent practice: learners give you confidence, natives give you speed and idiom.' ] },
      { h: 'Tips to get the most out of it', body: [
        'Set a tiny daily habit - one call a day, even five minutes. Ask questions: people love talking about their city and food, and questions keep you listening actively. Do not translate in your head; describe around missing words instead ("the machine for cold food" will get you to "fridge"). And when you meet a great conversation partner, add them as a friend and make it a regular exchange.' ] },
    ],
    faq: [
      { q: 'Is this free English speaking practice?', a: 'Core random voice matching is free, but TalkLive is not a tutoring service and does not guarantee an English speaker, teacher, fluency level or correction.' },
      { q: 'Will I talk to native English speakers?', a: 'You will meet a global mix - native speakers and learners from many countries. Both improve your fluency, and country filters let you steer who you meet.' },
      { q: 'My English is basic. Is that okay?', a: 'Absolutely. Simple conversations are perfect practice, and partners are anonymous strangers - there is no embarrassment. You can also start with text chat to warm up.' },
      { q: 'How often should I practice?', a: 'Short and daily beats long and rare. Ten minutes of real conversation every day produces visible progress within weeks.' },
      { q: 'Do I need an account or an app?', a: 'No. TalkLive runs in any browser with one tap - no sign-up, no download, no booking.' },
    ],
    ctaBandH: 'Fluency is a conversation away',
    ctaBandP: 'Tap to Talk and start practicing English with a real person right now - free.',
  },
  {
    slug: 'make-friends-online',
    crumb: 'Make Friends Online',
    eyebrow: 'Real friendships',
    title: 'Make Friends Online - Find Friends by Voice | TalkLive',
    description: 'Make friends online through real conversations, not profiles. TalkLive matches you with people worldwide for live voice or text chat - free, private, no sign-up.',
    keywords: 'make friends online, how to make friends online, find friends online, online friends app, make new friends, friend finder, apps to make friends, make friends as an adult',
    h1: 'Make Friends Online - Through Real Conversations',
    lede: 'Friendship starts with a conversation, not a profile picture. TalkLive drops you straight into live voice or text chats with people around the world - and when you click with someone, one tap keeps them as a friend.',
    cta: 'Find a New Friend',
    featuresH: 'Why friendships actually form here',
    featuresIntro: 'No swiping, no follower counts, no small-talk graveyards - just live conversation, which is where friendship has always started.',
    features: [
      { icon: 'heart', h: 'Click, then keep', p: 'Great conversation? Both tap Add Friend and you can message and call each other again - no numbers shared.' },
      { icon: 'mic', h: 'Voice builds bonds', p: 'Ten minutes of hearing someone laugh beats ten days of texting. Voice makes friends faster.' },
      { icon: 'globe', h: 'Friends worldwide', p: 'Meet people from dozens of countries - or filter to your region for friends in your timezone.' },
      { icon: 'users', h: 'Shared interests', p: 'Add interests so you get matched with people you already have something to talk about with.' },
      { icon: 'chat', h: 'Message anytime', p: 'Built-in messaging keeps your new friendships alive between calls.' },
      { icon: 'lock', h: 'Private by default', p: 'No phone number, real name or photos required - share personal details only when you are ready.' },
    ],
    stepsH: 'How to make friends on TalkLive',
    stepsIntro: 'From stranger to friend in four steps - usually in a single evening.',
    steps: [
      { h: 'Tap to Talk or Chat', p: 'Join by voice or text. You are matched with a real person in seconds.' },
      { h: 'Let it flow', p: 'Ask where they are from, what their day was like. Real conversations wander - let them.' },
      { h: 'Add as friend', p: 'When it clicks, both of you tap Add Friend. That is the whole ceremony.' },
      { h: 'Stay in touch', p: 'Message and call your friends whenever you are both online. Friendships grow one talk at a time.' },
    ],
    prose: [
      { h: 'Making friends as an adult is hard - online fixes the hardest part', body: [
        'After school and university, the machinery that made friendship easy disappears: no shared classes, no daily proximity, no built-in reasons to talk. Sociologists call the ingredients of friendship proximity, repetition and vulnerability - and adult life quietly removes all three. That is why the average adult finds it genuinely difficult to name a new friend made in the last year.',
        'Online voice chat restores all three ingredients at once. Proximity becomes irrelevant when the whole world is one tap away. Repetition is built in - your friends list means you can talk again tomorrow. And vulnerability comes easier with a voice and no camera: people open up faster when nobody is judging their face, their room, or their outfit.' ] },
      { h: 'Why conversations beat profiles', body: [
        'Friend-finder apps copied dating apps: photos, bios, swiping. But friendship does not work like attraction - you cannot swipe your way into it. You discover a friend by talking, laughing at the same dumb thing, and losing track of time. TalkLive skips the catalogue and starts you at the part that matters: the conversation itself.',
        'It also removes the awkward cold-start. On profile apps, someone has to send the risky first message. Here, you are already mid-conversation the moment you connect.' ] },
      { h: 'From one hello to a circle of friends', body: [
        'Most people\'s first session goes the same way: a few quick skips, one surprisingly good conversation, one Add Friend. Do that a few evenings in a row and you have a small circle of voices from around the world - people to practice languages with, vent to after work, or just share a laugh with at midnight. All without sharing your number or real name until you choose to.' ] },
    ],
    faq: [
      { q: 'Can you genuinely make friends online?', a: 'Yes - research on online friendships shows they can be as meaningful as offline ones. The key is real-time conversation rather than passive scrolling, which is exactly what TalkLive is built around.' },
      { q: 'Is TalkLive a dating app?', a: 'No. TalkLive is for conversation and friendship. There are no dating profiles, photos or swiping - people come here to talk.' },
      { q: 'How do I keep in touch with someone I met?', a: 'Both of you tap Add Friend. After that you can message each other and start voice calls whenever you are both online - no phone numbers needed.' },
      { q: 'Is it free to make friends here?', a: 'Core random matching and the optional friends feature are free. Premium controls are separate; friendship and identity are never guaranteed.' },
      { q: 'What if I am shy?', a: 'Start with text chat - no mic needed. When you are comfortable, try a voice call. Anonymity means there is genuinely nothing to lose; a skip erases any awkward moment forever.' },
    ],
    ctaBandH: 'Your next friend is online right now',
    ctaBandP: 'One tap starts the conversation. The friendship part happens on its own.',
  },
  {
    slug: 'late-night-chat',
    crumb: 'Late Night Chat',
    eyebrow: 'Open all night',
    title: 'Late Night Chat - Talk to Someone Any Hour | TalkLive',
    description: 'Can\'t sleep and need someone to talk to? TalkLive is late night chat with real people worldwide - live voice or text, private and free, at 1am, 3am or any hour.',
    keywords: 'late night chat, talk to someone at night, 3am chat, can\'t sleep need to talk, someone to talk to at 2am, midnight chat, night owls chat',
    h1: 'Late Night Chat - Check the Live Worldwide Queue',
    lede: 'It is 2am, your friends are asleep, and your brain will not switch off. Somewhere on the other side of the planet it is the middle of the afternoon - and TalkLive connects you to that person in one tap, by voice or text.',
    cta: 'Talk to Someone Now',
    featuresH: 'Built for the 3am crowd',
    featuresIntro: 'Because the world is round, TalkLive never has an empty queue - someone is always awake.',
    features: [
      { icon: 'world', h: 'Worldwide time zones', p: 'Your midnight is someone else\'s midday, but the current queue and a successful match are never guaranteed.' },
      { icon: 'mic', h: 'Quiet-friendly', p: 'Whisper-level voice works fine - or switch to silent text chat without waking anyone.' },
      { icon: 'lock', h: 'Anonymous venting', p: 'Say what is actually on your mind to someone with zero connection to your real life.' },
      { icon: 'heart', h: 'Real human comfort', p: 'A live voice at night beats scrolling alone. Loneliness drops the moment someone answers.' },
      { icon: 'next', h: 'No pressure', p: 'Conversation not helping? Next. The right stranger for tonight is one tap away.' },
      { icon: 'shield', h: 'Safe space, 18+', p: 'Moderated, reportable, adults only - late night does not mean lawless.' },
    ],
    stepsH: 'How late night chat works',
    stepsIntro: 'From lying awake to mid-conversation in under thirty seconds.',
    steps: [
      { h: 'Open TalkLive in bed', p: 'Any phone browser works. No install, no account, no lights on.' },
      { h: 'Choose voice or text', p: 'Tap to Talk if you can speak, Tap to Chat if the house is asleep.' },
      { h: 'Meet a fellow night owl', p: 'Get matched with someone awake right now - next door or nine timezones away.' },
      { h: 'Talk until you are tired', p: 'Deep talk, dumb jokes, or background company. End whenever sleep finally shows up.' },
    ],
    prose: [
      { h: 'Why late-night conversations hit different', body: [
        'There is a reason the best conversations of your life happened after midnight. Late at night the social filters drop: nobody performs, nobody rushes, and honesty comes easier. Psychologists note that darkness and anonymity both lower self-consciousness - which is why a 3am talk with a stranger can go deeper in twenty minutes than weeks of daytime small talk.',
        'TalkLive is built for exactly that register. No cameras, no profiles, no history - just a voice in the dark that happens to belong to a real person.' ] },
      { h: 'When you need to talk and everyone is asleep', body: [
        'Sometimes night thoughts are heavy: stress, a breakup, homesickness, or plain loneliness. Talking genuinely helps - saying a worry out loud to another human shrinks it in a way journaling and scrolling never do. A stranger can be the perfect listener precisely because they are outside your life: no judgment, no consequences, no "are you okay?" texts tomorrow.',
        'TalkLive is not a crisis service or a substitute for professional support. If you may be in immediate danger or are considering self-harm, contact local emergency services or a qualified crisis resource in your country instead of relying on a random match.' ] },
      { h: 'Night owls of the world, united', body: [
        'Shift workers, students, new parents and people in other time zones may join late-night queues. Availability changes from moment to moment, and no particular type of participant or match is guaranteed.' ] },
    ],
    faq: [
      { q: 'Is anyone online at 3am?', a: 'People can join from different time zones, but availability depends on the live queue and selected preferences. Open TalkLive to check.' },
      { q: 'Can I chat silently without waking anyone?', a: 'Yes. Tap to Chat is pure text - no microphone, no sound, works perfectly in a dark quiet room.' },
      { q: 'Is late night chat free?', a: 'Core random voice and text matching is free at any hour. Free users have about a five-second between-call wait.' },
      { q: 'Can I use a match to vent?', a: 'You can ask whether the other person is willing to listen, but respect a no and avoid treating a stranger as a counsellor. Do not share identifying or highly sensitive information.' },
      { q: 'What if I am really struggling?', a: 'TalkLive is friendly company, not a crisis line. If you are in distress or having thoughts of self-harm, please contact a professional helpline in your country right away.' },
    ],
    ctaBandH: 'Can\'t sleep? Say hello instead',
    ctaBandP: 'Open the worldwide queue and see whether a suitable voice or text match is available.',
  },
];

// Additional landing pages live in their own module so this file stays
// navigable as the SEO surface grows. Same shape as CORE_PAGES.
const PAGES = CORE_PAGES.concat(require('./pages-extra'), require('./pages-extra2'), require('./search-hubs'));

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
      { '@type': 'Organization', '@id': ORGANIZATION_ID, name: 'TalkLive', alternateName: ['Talk Live', 'TalkLive App'], url: `${SITE}/`, logo: { '@type': 'ImageObject', url: LOGO_IMAGE, width: 192, height: 192 } },
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
<link rel="stylesheet" href="/seo.css?v=20260923art" />
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
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5162304231095978"
     crossorigin="anonymous"></script>
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
    <span style="display:inline-flex;gap:8px">
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
  ${adSlot('native')}
  <section class="faq">
    <div class="wrap">
      <h2>${loc.faqH}</h2>
      <div class="faq-layout"><div>${faqHtml}</div>${artImg('question-answered', { cls: 'art art-faq' })}</div>
    </div>
  </section>
  ${leaderboardAd()}
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

  ${nativeAd()}
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
PAGES.forEach((p, i) => {
  // A slug ending in "/" is a directory hub (regions/ -> regions/index.html).
  const file = path.join(PUBLIC, p.slug.endsWith('/') ? `${p.slug}index.html` : `${p.slug}.html`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, page(p, i));
  count++;
});

for (const loc of LOCALES) {
  const dir = path.join(PUBLIC, loc.code);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), localeHome(loc));
  count++;
}

// Journal: /blog/, its articles, /languages/ and /journal.css.
const BLOG_DIR = path.join(PUBLIC, 'blog');
count += JOURNAL.build();

// Sitemap with hreflang alternates for the home + all landing pages.
const latestBlogUpdate = BLOG.reduce((latest, post) => {
  const updated = post.updated || post.date;
  return updated > latest ? updated : latest;
}, CONTENT_UPDATED);
const sitemapUrls = [{ slug: '', priority: '1.0', freq: 'daily', home: true, lastmod: CONTENT_UPDATED }]
  .concat(LOCALES.map(l => ({ slug: `${l.code}/`, priority: '0.9', freq: 'weekly', raw: true, home: true, lastmod: l.updated || CONTENT_UPDATED })))
  .concat(PAGES.map(p => ({ slug: p.slug, priority: '0.8', freq: 'weekly', lastmod: p.updated || CONTENT_UPDATED })))
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
    .replace(/([?&]|&amp;)(?:utm_[a-z_]+|lang)=[^"'&\s>]*/gi, '$1')
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
const SITEMAP_CLUSTERS = ['main', 'pages', 'regions', 'languages', 'blog'];

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
  const landing = PAGES.map(p => `- [${p.crumb}](${url(p.slug)}): ${p.description}`).join('\n');
  const posts = BLOG.map(b => `- [${b.h1}](${blogUrl(b.slug)}): ${b.description}`).join('\n');
  return `# TalkLive

> TalkLive (${SITE}) is a browser-based random chat service for adults, offering one-to-one voice calls and text chat. Core matching is free and does not require an account. Voice uses encrypted WebRTC over a TURN relay in production and is not recorded or stored by TalkLive. Typed messages and related context may be retained for a limited rolling period as described in the Privacy Policy.

Key facts: voice-only or text-only modes; optional country and interest preferences do not guarantee a specific match; matching is instant for everyone; optional Premium is announced but not yet available for purchase; no video chat; 18+ policy; leave, block and report controls. Participant identity, age, location and intent are not verified.

## Main pages
- [TalkLive app](${SITE}/): Start a random voice or text chat instantly.
${landing}

## Languages
The app UI and a localized homepage are available in: English plus ${LOCALES.map(l => `[${l.name}](${SITE}/${l.code}/)`).join(', ')}.

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
