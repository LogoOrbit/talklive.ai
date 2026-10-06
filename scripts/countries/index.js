'use strict';
/*
 * Country guides at /countries/<slug>.
 *
 * Fourteen countries - the ones that send TalkLive the most people - each with
 * a page written and designed on its own: its own concept, layout, palette and
 * typography, in the manner of the Journal features. Nothing here is a
 * template with a name swapped in. Each module in this folder supplies the
 * whole page body and its CSS; this file only adds what every page must share:
 * the <head> metadata and structured data (WebPage, breadcrumb, FAQ), a thin
 * site bar, the call-to-action links, the FAQ markup, links to the other
 * guides and the legal footer.
 *
 * They are landing pages as well as reading pages, so unlike the Journal they
 * carry "Tap to Talk" / "Tap to Chat" links. Those use ?utm_source=seo, which
 * server/index.js counts as acq_seo.
 *
 * Fonts come from /journal.css (scripts/journal/shared.js), self-hosted
 * because the CSP allows fonts from 'self' only.
 */
const S = require('../journal/shared');

const SLUGS = [
  'india', 'pakistan', 'bangladesh', 'united-states', 'united-kingdom', 'egypt', 'nigeria', 'indonesia',
  'germany', 'saudi-arabia', 'morocco', 'united-arab-emirates', 'canada', 'philippines',
];
const COUNTRIES = SLUGS.map((slug) => require(`./${slug}`));
const SITE = S.SITE;
const OG_IMAGE = `${SITE}/og-image.png?v=2`;

// Structure only. Colour and type belong to each page.
const BASE_CSS = `
.c-bar{display:flex;align-items:center;justify-content:space-between;gap:14px;max-width:1180px;margin:0 auto;padding:12px 20px;font:600 13px/1.2 system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:.02em}
.c-bar a{text-decoration:none}
.c-bar .c-brand{font-weight:700;letter-spacing:.06em}
.c-bar nav{display:flex;gap:16px;flex-wrap:wrap;align-items:center}
.c-bar nav a{opacity:.8}.c-bar nav a:hover{opacity:1;text-decoration:underline}
.c-bar .c-bar-talk{opacity:1;padding:7px 14px;border:1.5px solid currentColor;border-radius:999px}
.c-ctas{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.c-ctas a{display:inline-flex;align-items:center;gap:8px;text-decoration:none}
.c-faq details{border-top:1px solid var(--rule,rgba(0,0,0,.15));padding:14px 0}
.c-faq summary{cursor:pointer;list-style:none}
.c-faq summary::-webkit-details-marker{display:none}
.c-faq summary::after{content:"+";float:right;margin-left:12px}
.c-faq details[open] summary::after{content:"\\2212"}
.c-faq details p{margin:10px 0 0}
.c-guides{max-width:1180px;margin:64px auto 0;padding:0 20px}
.c-guides h2{font:600 12px/1 system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:.16em;text-transform:uppercase;margin:0 0 12px;opacity:.75}
.c-guides ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px 22px;font:500 15px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif}
.c-guides a{text-decoration:none;border-bottom:1px solid currentColor}
@media (max-width:640px){.c-bar{font-size:12px}.c-bar nav{gap:12px;flex-wrap:nowrap}.c-bar nav a:nth-child(1),.c-bar nav a:nth-child(2),.c-bar nav a:nth-child(4){display:none}}
`;

// Straight into a match: /?talk=1 starts the voice flow, /chat?go=1 the text
// one (see scripts/journal/shared.js ctaButtons for why they are nofollow).
const START = { '/': '/?talk=1&amp;utm_source=seo', '/chat': '/chat?go=1&amp;utm_source=seo' };
function cta(href, cls, label) {
  return `<a class="${cls}" href="${START[href] || `${href}?utm_source=seo`}" rel="nofollow">${label}</a>`;
}

const ctx = {
  esc: S.esc,
  ad: S.ad,
  talk: (label) => S.ctaTalk('seo', label),
  chat: (label) => S.ctaChat('seo', label),
  ctas: (talkLabel, chatLabel) => `<div class="c-ctas tl-go-row">${S.ctaTalk('seo', talkLabel)}${S.ctaChat('seo', chatLabel)}</div>`,
};

function faqHtml(c, heading) {
  return `<section class="c-faq" aria-labelledby="faq-h"><h2 id="faq-h">${heading || 'Questions people ask'}</h2>${c.faq
    .map((f) => `<details><summary>${S.esc(f.q)}</summary><p>${S.esc(f.a)}</p></details>`).join('')}</section>`;
}

function guidesHtml(slug) {
  const items = COUNTRIES.filter((c) => c.slug !== slug)
    .map((c) => `<li><a href="/countries/${c.slug}">${S.esc(c.name)}</a></li>`).join('');
  return `<aside class="c-guides" aria-label="Other country guides"><h2>Other country guides</h2><ul>${items}<li><a href="/country-chat-guide">How country matching works</a></li></ul></aside>`
    + '<aside class="c-guides" aria-label="From the Journal"><h2>Read more in the Journal</h2><ul><li><a href="/blog/small-talk-around-the-world">Small Talk Around the World: What to Say, and What Not to Ask</a></li><li><a href="/blog/lonely-after-moving-abroad">New City, No One to Call: Loneliness After Moving Abroad</a></li></ul></aside>';
}

function head(c, wordCount) {
  const canonical = `${SITE}${c.path}`;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization', '@id': `${SITE}/#organization`, name: 'TalkLive', url: `${SITE}/`,
        logo: { '@type': 'ImageObject', url: `${SITE}/favicon-192.png`, width: 192, height: 192 },
      },
      {
        '@type': 'WebPage', '@id': `${canonical}#webpage`, url: canonical, name: c.title, description: c.description,
        inLanguage: 'en', datePublished: c.date, dateModified: c.updated || c.date, wordCount,
        about: c.about || { '@type': 'Country', name: c.name },
        isPartOf: { '@id': `${SITE}/#website` }, publisher: { '@id': `${SITE}/#organization` },
        primaryImageOfPage: { '@type': 'ImageObject', url: OG_IMAGE, width: 1200, height: 630 },
      },
      {
        '@type': 'BreadcrumbList', '@id': `${canonical}#breadcrumb`,
        itemListElement: [{ name: 'Home', url: '/' }].concat(c.crumbs || [], [{ name: c.name, url: c.path }])
          .map((crumb, i) => ({ '@type': 'ListItem', position: i + 1, name: crumb.name, item: `${SITE}${crumb.url}` })),
      },
      {
        '@type': 'FAQPage', '@id': `${canonical}#faq`,
        mainEntity: c.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
    ],
  };
  const preloads = (c.preload || []).map((f) => `<link rel="preload" href="/fonts/mag/${f}.woff2" as="font" type="font/woff2" crossorigin />`).join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>${S.esc(c.title)}</title>
<meta name="description" content="${S.esc(c.description)}" />
<meta name="keywords" content="${S.esc(c.keywords)}" />
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
<meta name="theme-color" content="${c.theme}" />
<meta name="author" content="TalkLive" />
<link rel="canonical" href="${canonical}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="TalkLive" />
<meta property="og:title" content="${S.esc(c.title)}" />
<meta property="og:description" content="${S.esc(c.description)}" />
<meta property="og:url" content="${canonical}" />
<meta property="og:image" content="${OG_IMAGE}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="${S.esc(c.h1)}" />
<meta property="og:locale" content="en_US" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${S.esc(c.title)}" />
<meta name="twitter:description" content="${S.esc(c.description)}" />
<meta name="twitter:image" content="${OG_IMAGE}" />
<meta name="twitter:image:alt" content="${S.esc(c.h1)}" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/favicon-192.png" />
<link rel="manifest" href="/site.webmanifest" />
${preloads}
<link rel="stylesheet" href="/journal.css?v=${S.CSS_VERSION}" />
<style>${BASE_CSS}${c.css}${S.ctaVars(c.slug)}</style>
<script defer src="/pwa.js?v=20260908pwa"></script>
<script type="application/ld+json">${JSON.stringify(ld)}</script>
${c.noAds ? '' : `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5162304231095978"
     crossorigin="anonymous"></script>
<script defer src="/ads.js?v=20260923adsense2"></script>
`}</head>`;
}

function bar() {
  return `<a class="skip" href="#story">Skip to the guide</a>
<header class="c-bar">
  <a class="c-brand" href="/">TalkLive</a>
  <nav aria-label="Site"><a href="/random-voice-chat">Voice chat</a><a href="/random-text-chat">Text chat</a><a href="/country-chat-guide">Countries</a><a href="/safety">Safety</a>${cta('/', 'c-bar-talk', 'Talk now')}</nav>
</header>`;
}

function footer(aside) {
  return `${aside}
<footer class="j-foot">
  <nav aria-label="Legal"><a href="/about">About</a><a href="/contact">Contact</a><a href="/privacy">Privacy Policy</a><a href="/terms">Terms</a><a href="/community-guidelines">Community Guidelines</a><a href="/safety">Safety</a><a href="/blog/">Journal</a><a href="/">TalkLive home</a></nav>
  <p>&copy; ${new Date().getFullYear()} TalkLive. Free one-to-one voice and text chat for adults 18+. Nobody's identity, age or location is verified. Corrections: info@talklive.app</p>
</footer>`;
}

/*
 * Renders one hand-designed page. `c.path` is its URL, `c.crumbs` the
 * breadcrumb between Home and the page, `aside` the "other guides" block.
 * `c.noAds` leaves out the ad loader and the ad slot entirely.
 */
function render(c, aside) {
  const pageCtx = { ...ctx, ad: c.noAds ? () => '' : S.ad, faq: (heading) => faqHtml(c, heading) };
  const inner = c.body(pageCtx);
  return `${head(c, S.words(inner))}
<body class="c-page c-${c.slug}">
${bar()}
${inner}
${footer(aside)}
${S.ctaDock('seo')}
</body>
</html>
`;
}

const COUNTRY_CRUMBS = [{ name: 'Countries', url: '/country-chat-guide' }];

function build() {
  for (const c of COUNTRIES) {
    S.write(`countries/${c.slug}.html`, render({ ...c, path: `/countries/${c.slug}`, crumbs: COUNTRY_CRUMBS }, guidesHtml(c.slug)));
  }
  return COUNTRIES.length;
}

module.exports = { build, render, COUNTRIES, SLUGS };
