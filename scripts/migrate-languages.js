#!/usr/bin/env node
'use strict';

/*
 * Pushes scripts/data/languages.js into every hand-kept file that lists or
 * counts languages, so there is exactly one place to add or remove one.
 *
 * A sweep rather than a template change for the same reason as the other
 * migrate-* scripts: public/index.html, public/i18n.js and the /languages/ hub
 * are files on disk, not build output (see SEO.md). Runs as part of
 * `npm run build:seo`, before migrate-hub-schema.js so the hub's ItemList is
 * rebuilt from the list written here.
 *
 * It also fails the build if the language list and the files that must exist
 * for each language disagree, which is what keeps "supported" honest:
 *   - public/i18n/<code>.js for every non-English language
 *   - a scripts/locales.js entry for every non-English language
 *   - public/languages/<slug>.html for every language
 *     (create a missing one with scripts/add-language-page.js)
 *
 * Idempotent: a second run rewrites nothing.
 */

const fs = require('fs');
const path = require('path');
const { SUPPORTED_LANGUAGES, COUNT, RTL, listNames, languagesAnswer } = require('./data/languages');
const { LANGUAGES: LANGUAGE_CONTENT } = require('./data/geo');
const LOCALES = require('./locales');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const rel = f => path.relative(ROOT, f);

// --- Consistency checks ------------------------------------------------------

const problems = [];
const nonEnglish = SUPPORTED_LANGUAGES.filter(l => l.code !== 'en');
for (const l of nonEnglish) {
  if (!fs.existsSync(path.join(PUBLIC, 'i18n', `${l.code}.js`))) problems.push(`public/i18n/${l.code}.js is missing`);
  if (!LOCALES.some(loc => loc.code === l.code)) problems.push(`scripts/locales.js has no "${l.code}" entry`);
}
for (const loc of LOCALES) {
  if (!SUPPORTED_LANGUAGES.some(l => l.code === loc.code)) problems.push(`scripts/locales.js has "${loc.code}", which scripts/data/languages.js does not list`);
}
for (const l of SUPPORTED_LANGUAGES) {
  if (!LANGUAGE_CONTENT.some(c => c.slug === l.slug)) problems.push(`scripts/data/geo.js LANGUAGES has no "${l.slug}" entry`);
  if (!fs.existsSync(path.join(PUBLIC, 'languages', `${l.slug}.html`))) problems.push(`public/languages/${l.slug}.html is missing (node scripts/add-language-page.js ${l.slug})`);
}
if (problems.length) {
  console.error('[languages] scripts/data/languages.js disagrees with the repo:');
  problems.forEach(p => console.error('  - ' + p));
  process.exit(1);
}

// --- Rewrites ----------------------------------------------------------------

const content = slug => LANGUAGE_CONTENT.find(c => c.slug === slug);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let changed = 0;
function rewrite(file, fn) {
  const abs = path.join(PUBLIC, file);
  const before = fs.readFileSync(abs, 'utf8');
  const after = fn(before);
  if (after !== before) {
    fs.writeFileSync(abs, after);
    changed += 1;
    console.log(`[languages] ${rel(abs)} updated`);
  }
}

// Replace what sits between <!-- langs:NAME --> and <!-- /langs:NAME -->.
function region(html, name, body, file) {
  const re = new RegExp(`(<!-- langs:${name} -->)[\\s\\S]*?(<!-- /langs:${name} -->)`);
  if (!re.test(html)) throw new Error(`${file}: marker <!-- langs:${name} --> not found`);
  return html.replace(re, (_, open, close) => open + body + close);
}

// Same, for a regex that must match exactly once.
function once(html, re, replacement, file) {
  if (!re.test(html)) throw new Error(`${file}: expected ${re} to match`);
  return html.replace(re, replacement);
}

const codes = nonEnglish.map(l => `'${l.code}'`).join(',');
const rtlCheck = RTL.map(l => `lang === '${l.code}'`).join(' || ');

// The head script that preloads the visitor's translation before first paint.
function preloadScript(html, file) {
  html = once(html, /var L = \[[^\]]*\];/, `var L = [${codes}];`, file);
  return once(html, /if \((?:lang === '[a-z]+'(?: \|\| )?)+\) root\.dir = 'rtl';/, `if (${rtlCheck}) root.dir = 'rtl';`, file);
}

// 1. The in-app picker.
rewrite('i18n.js', (js) => {
  const body = SUPPORTED_LANGUAGES
    .map(l => `  ${l.code}: { name: ${JSON.stringify(l.native)}, dir: '${l.dir}' },`)
    .join('\n');
  return once(js, /const I18N_LANGS = \{[\s\S]*?\n\};/, `const I18N_LANGS = {\n${body}\n};`, 'i18n.js');
});

// 2. Homepage and text-chat page.
rewrite('chat.html', html => preloadScript(html, 'chat.html'));
rewrite('index.html', (html) => {
  const f = 'index.html';
  html = preloadScript(html, f);
  html = region(html, 'bullet',
    `<strong>${COUNT} languages</strong> - the whole app is translated, including right-to-left ${listNames(RTL.map(l => l.english))}.`, f);
  html = region(html, 'count', String(COUNT), f);
  html = region(html, 'faq', esc(languagesAnswer()), f);
  html = region(html, 'links', '\n' + SUPPORTED_LANGUAGES
    .map(l => `        <a href="/languages/${l.slug}">${esc(content(l.slug).name)} chat</a>`).join('\n'), f);
  // The JSON-LD twin of the visible FAQ answer.
  return once(html,
    /("name": "What languages does TalkLive support\?", "acceptedAnswer": \{ "@type": "Answer", "text": )"(?:[^"\\]|\\.)*"/,
    (_, head) => head + JSON.stringify(languagesAnswer()), f);
});

// 3. The /languages/ hub: its visible list and every count on it.
rewrite(path.join('languages', 'index.html'), (html) => {
  const f = 'languages/index.html';
  const list = SUPPORTED_LANGUAGES.map((l) => {
    const c = content(l.slug);
    return `<strong><a href="/languages/${l.slug}">${esc(c.name)}</a></strong> (${esc(c.native)}, “${esc(c.hello)}”) - ${esc(c.speakers)}.`;
  }).join('<br />');
  html = once(html, /(<h2>Every language with a practice page<\/h2><p>)[\s\S]*?(<\/p>)/, `$1${list}$2`, f);
  html = html.replace(/\b\d+ languages with real native speakers/g, `${COUNT} languages with real native speakers`);
  return html.replace(/these \d+ pages are about/g, `these ${COUNT} pages are about`);
});

console.log(`Languages: ${COUNT} supported, ${changed} file(s) rewritten.`);
