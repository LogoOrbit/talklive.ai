'use strict';
/*
 * Rewrites internal links to retired URLs across every public/**.html.
 *
 * scripts/data/retired.js lists what was retired and where it lives now; the
 * server 301s those URLs, but internal links should point at the real page
 * rather than send every visitor and crawler through a redirect. Most pages
 * that link to them are hand-maintained or come from orphaned generators
 * (SEO.md), so they are fixed here rather than at source.
 *
 * - list items and link-cloud entries that only linked to one city, country,
 *   language page or retired competitor page are removed outright: fifty links
 *   to the same page would be noise, not navigation;
 * - "Chat by country" + "Chat by city" pairs collapse into "Chat by region";
 * - every other link is retargeted at the page that now holds the content.
 *
 * Idempotent: on a migrated site it reports 0 files.
 */
const fs = require('fs');
const path = require('path');
const { retiredTarget, RETIRED_ALTERNATIVES, RETIRED_PAGES } = require('./data/retired');

const PUBLIC = path.join(__dirname, '..', 'public');
const ALT = `(?:${RETIRED_ALTERNATIVES.concat(Object.keys(RETIRED_PAGES)).join('|')})`;
// A link to one member page whose list entry is better dropped than repointed.
const MEMBER = `/(?:(?:countries|cities|languages)/[a-z0-9-]+|regions/(?:asia-pacific|middle-east-africa)|${ALT})`;

function migrate(html) {
  let out = html;
  // Whole list items / standalone link lines that exist only to link a member.
  out = out.replace(new RegExp(`<li>\\s*<a href="${MEMBER}"[^>]*>[^<]*</a>\\s*</li>`, 'g'), '');
  out = out.replace(new RegExp(`^[ \\t]*<a href="${MEMBER}"[^>]*>[^<]*</a>[ \\t]*\\r?\\n`, 'gm'), '');
  // Link clouds: adjacent anchors with no text between them.
  out = out.replace(new RegExp(`(</a>|<div class="link-cloud">|<nav[^>]*>)\\s*<a href="${MEMBER}"[^>]*>[^<]*</a>(?=\\s*(<a |</div>|</nav>))`, 'g'), '$1');
  // Hub pair -> one regional link.
  out = out.replace(/<a href="\/countries\/">[^<]*<\/a>\s*<a href="\/cities\/">[^<]*<\/a>/g, '');
  out = out.replace(/<li><a href="\/countries\/">[^<]*<\/a><\/li>\s*<li><a href="\/cities\/">[^<]*<\/a><\/li>/g, '');
  // The retired /regions/ hub and its "Chat by region" links.
  out = out.replace(/<li><a href="\/regions\/">[^<]*<\/a><\/li>/g, '');
  out = out.replace(/(<\/a>|<div class="link-cloud">|<nav[^>]*>)\s*<a href="\/regions\/">[^<]*<\/a>/g, '$1');
  out = out.replace(/<li><a href="\/cities\/">[^<]*<\/a><\/li>/g, '');
  // Anything left is in prose: keep the words, retarget the link.
  out = out.replace(/href="(\/[a-z0-9/-]*)"/g, (all, href) => {
    const to = retiredTarget(href);
    return to ? `href="${to}"` : all;
  });
  return out;
}

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(full);
    return entry.isFile() && entry.name.endsWith('.html') ? [full] : [];
  });
}

let changed = 0;
for (const file of htmlFiles(PUBLIC)) {
  const before = fs.readFileSync(file, 'utf8');
  const after = migrate(before);
  if (after !== before) {
    fs.writeFileSync(file, after);
    changed++;
  }
}
console.log(`migrate-retired-links: rewrote retired links in ${changed} HTML files`);
