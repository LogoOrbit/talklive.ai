'use strict';
/*
 * Builds the TalkLive Journal: /blog/ (front page), the ten articles in
 * scripts/journal/articles/, the /languages/ feature and /journal.css.
 *
 * Called from scripts/build-seo.js. ARTICLES is also what build-seo uses for
 * the sitemap, RSS feed, llms.txt and related-reading links on landing pages.
 */
const fs = require('fs');
const path = require('path');
const S = require('./shared');
const languages = require('./languages');

const ARTICLES = fs.readdirSync(path.join(__dirname, 'articles'))
  .filter(f => f.endsWith('.js')).sort()
  .map(f => require(path.join(__dirname, 'articles', f)));

// Regional features: hand-written, each with its own design. Published at
// /regions/<slug>; there is deliberately no /regions/ hub.
const REGIONS = ['south-asia', 'europe', 'americas'].map(s => require(`./regions/${s}`));

function list(items) {
  if (items.length < 2) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function ctxFor(slug) {
  return { ad: S.ad, esc: S.esc, list, more: S.moreStories(ARTICLES, slug) };
}

function renderArticle(a) {
  const inner = a.body(ctxFor(a.slug));
  return S.page({ ...a, path: `/blog/${a.slug}`, crumb: a.h1, article: true, wordCount: S.words(inner) }, inner);
}

function renderRegion(r) {
  const inner = r.body(ctxFor(r.slug));
  return S.page({ ...r, crumb: r.h1, article: true, wordCount: S.words(inner) }, inner);
}

function renderLanguages() {
  const ctx = { ...ctxFor(null), more: `<aside class="j-more" aria-label="More from the Journal"><h2>Further reading</h2><ul>${ARTICLES
    .filter(a => ['how-to-practise-a-language-by-speaking', 'science-of-talking-to-strangers', 'phone-anxiety-how-to-get-comfortable-talking'].includes(a.slug))
    .map(a => `<li><a href="/blog/${a.slug}">${S.esc(a.h1)}</a></li>`).join('')}</ul></aside>` };
  const inner = languages.body(ctx);
  return S.page({ ...languages.meta, css: languages.css, article: true, wordCount: S.words(inner) }, inner);
}

// The front page: a contents page in the manner of a weekend magazine.
const INDEX_CSS = `
:root{--paper:#fbf9f4;--ink:#141414;--rule:#d8d2c4;--acc:#8a2b1e}
body{font-family:"Source Serif 4",Georgia,serif}
.x-wrap{max-width:1180px;margin:0 auto;padding:0 20px}
.x-flag{text-align:center;padding:46px 0 20px;border-bottom:4px double var(--ink)}
.x-flag h1{font:700 clamp(46px,9vw,112px)/.9 "Playfair Display",serif;margin:0;letter-spacing:-.02em}
.x-flag p{font:400 italic 19px/1.4 "Source Serif 4",serif;margin:16px auto 0;max-width:640px;color:#4a453c}
.x-lead{display:grid;grid-template-columns:1.4fr 1fr;gap:40px;padding:36px 0;border-bottom:1px solid var(--ink)}
.x-lead a{text-decoration:none}
.x-lead .x-big h2{font:700 clamp(32px,4.4vw,52px)/1.05 "Playfair Display",serif;margin:8px 0 14px}
.x-lead .x-big p{font-size:20px;line-height:1.55;margin:0;color:#3d3a33}
.x-tag{font:600 11px/1 "Source Serif 4",serif;letter-spacing:.22em;text-transform:uppercase;color:var(--acc)}
.x-feature{background:#0f1416;color:#efe9df;padding:26px;display:block}
.x-feature h2{font:700 34px/1.05 "Fraunces",serif;margin:10px 0 12px}
.x-feature p{margin:0;color:#cfc8bc;font-size:17px;line-height:1.5}
.x-feature .x-tag{color:#e9a48f}
.x-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:0 36px;padding-top:12px}
.x-item{padding:22px 0;border-bottom:1px solid var(--rule)}
.x-item a{text-decoration:none}
.x-item h3{font:700 23px/1.2 "Playfair Display",serif;margin:8px 0 8px}
.x-item p{margin:0;font-size:16px;line-height:1.55;color:#4a453c}
.x-item a:hover h3,.x-lead a:hover h2{text-decoration:underline;text-decoration-thickness:1px}
.x-about{max-width:680px;margin:48px auto 0;font-size:17px;line-height:1.65;color:#4a453c;text-align:center}
@media (max-width:900px){.x-lead{grid-template-columns:1fr}.x-grid{grid-template-columns:1fr 1fr}}
@media (max-width:600px){.x-grid{grid-template-columns:1fr}}
`;

function renderIndex() {
  const [lead, ...rest] = [ARTICLES.find(a => a.slug === 'science-of-talking-to-strangers')]
    .concat(ARTICLES.filter(a => a.slug !== 'science-of-talking-to-strangers'));
  const inner = `<main id="story" class="x-wrap">
<header class="x-flag"><h1>The Journal</h1><p>Essays, reporting and research on conversation, connection and the strange business of talking to people you have never met.</p></header>
<section class="x-lead">
  <a class="x-big" href="/blog/${lead.slug}"><span class="x-tag">${S.esc(lead.tag)}</span><h2>${S.esc(lead.h1)}</h2><p>${S.esc(lead.description)}</p></a>
  <a class="x-feature" href="/languages/"><span class="x-tag">Feature</span><h2>${S.esc(languages.meta.h1)}</h2><p>${S.esc(languages.meta.description)}</p></a>
</section>
<section class="x-grid" aria-label="All stories">
${rest.map(a => `<article class="x-item"><a href="/blog/${a.slug}"><span class="x-tag">${S.esc(a.tag)}</span><h3>${S.esc(a.h1)}</h3><p>${S.esc(a.description)}</p></a></article>`).join('\n')}
</section>
<section class="x-grid" aria-label="Regions">
${REGIONS.map(r => `<article class="x-item"><a href="${r.path}"><span class="x-tag">${S.esc(r.tag)}</span><h3>${S.esc(r.h1)}</h3><p>${S.esc(r.description)}</p></a></article>`).join('\n')}
</section>
${S.ad()}
<p class="x-about">The Journal is written by the people who build TalkLive. We try to cite our sources, say what the evidence does not show, and leave you with a better question than the one you arrived with.</p>
</main>`;
  return S.page({
    path: '/blog/', title: 'The TalkLive Journal - Essays and Research on Conversation and Connection',
    h1: 'The TalkLive Journal', description: 'Essays, reporting and research on conversation, loneliness, listening, language learning and online safety, from the team behind TalkLive.',
    css: INDEX_CSS, theme: '#fbf9f4', preload: ['playfair-display-latin-700-normal'],
  }, inner);
}

function build() {
  S.write('journal.css', S.journalCss());
  S.write('blog/index.html', renderIndex());
  for (const a of ARTICLES) S.write(`blog/${a.slug}.html`, renderArticle(a));
  S.write('languages/index.html', renderLanguages());
  for (const r of REGIONS) S.write(`${r.path.slice(1)}.html`, renderRegion(r));
  return ARTICLES.length + REGIONS.length + 2;
}

module.exports = { ARTICLES, REGIONS, build, LANGUAGES_META: languages.meta };
