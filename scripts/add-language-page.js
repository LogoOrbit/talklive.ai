#!/usr/bin/env node
'use strict';
/*
 * Write public/languages/<slug>.html for a language that has no page yet.
 *
 * The geo cluster's generator (scripts/geo-pages.js) is orphaned - its renderer
 * is a generation behind the HTML on disk, and SEO.md explains why it must not
 * be wired back into the build. So a new language page is made the same way a
 * human would: take an existing page on disk as the template, and swap every
 * piece of text the generator produced for the template language with the text
 * it produces for the new one. Site furniture (header, footer link graph,
 * breadcrumbs, schema) is kept exactly as the on-disk template has it.
 *
 * Refuses to write if any mention of the template language survives, so a
 * half-translated page can never ship.
 *
 *   node scripts/add-language-page.js <new-slug> [template-slug]
 */
const fs = require('fs');
const path = require('path');
const { GEO_PAGES } = require('./geo-pages');

const [slug, templateSlug = 'urdu'] = process.argv.slice(2);
if (!slug) { console.error('usage: add-language-page.js <slug> [template-slug]'); process.exit(1); }

const DIR = path.join(__dirname, '..', 'public', 'languages');
const out = path.join(DIR, `${slug}.html`);
if (fs.existsSync(out)) { console.log(`${path.relative(process.cwd(), out)} already exists`); process.exit(0); }

const from = GEO_PAGES.find(p => p.slug === `languages/${templateSlug}`);
const to = GEO_PAGES.find(p => p.slug === `languages/${slug}`);
if (!from || !to) throw new Error(`no generator descriptor for ${!from ? templateSlug : slug}`);

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const escJson = s => JSON.stringify(String(s)).slice(1, -1);

// Pair up every string leaf of the two descriptors by path.
const pairs = [];
(function walk(a, b) {
  if (typeof a === 'string' && typeof b === 'string') { if (a !== b) pairs.push([a, b]); return; }
  if (a && b && typeof a === 'object') for (const k of Object.keys(a)) if (k in b) walk(a[k], b[k]);
})(from, to);
// Longest first, so a sentence is replaced before any phrase inside it.
pairs.sort((x, y) => y[0].length - x[0].length);

let html = fs.readFileSync(path.join(DIR, `${templateSlug}.html`), 'utf8');
for (const [a, b] of pairs) {
  for (const [ea, eb] of [[a, b], [esc(a), esc(b)], [escJson(a), escJson(b)]]) {
    if (ea && html.includes(ea)) html = html.split(ea).join(eb);
  }
}
// URLs and the remaining bare names (nav labels, schema names).
const fromLang = from.crumb, toLang = to.crumb;
html = html.split(`/languages/${templateSlug}`).join(`/languages/${slug}`);

// Anything left that still names the template language inside <main> or <head>
// is text the generator did not produce and this script cannot translate.
const scope = html.replace(/<footer[\s\S]*<\/footer>/, '').replace(/<nav[^>]*aria-label="[^"]*"[\s\S]*?<\/nav>/g, '');
const leftovers = scope.match(new RegExp(`[^.<>]{0,60}\\b${fromLang}\\b[^.<>]{0,60}`, 'g')) || [];
if (leftovers.length) {
  console.error(`Refusing to write ${slug}.html - ${leftovers.length} untranslated mention(s) of ${fromLang}:`);
  leftovers.slice(0, 20).forEach(l => console.error('  - ' + l.trim()));
  process.exit(1);
}
fs.writeFileSync(out, html);
console.log(`wrote ${path.relative(process.cwd(), out)} from ${templateSlug}.html (${pairs.length} strings swapped to ${toLang})`);
