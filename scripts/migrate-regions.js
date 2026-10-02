'use strict';
/*
 * Rewrites internal links to retired URLs across every public/**.html.
 *
 * The country and city pages were merged into /regions/ (see
 * scripts/region-pages.js) and the thinner "X alternative" pages into
 * /alternatives. The server 301s the old URLs, but internal links should point
 * at the real page rather than make every visitor and crawler take a redirect.
 * Most of the pages that link to them are hand-maintained or come from
 * orphaned generators (SEO.md), so they are fixed here rather than at source.
 *
 * - list items and link-cloud entries that only linked to one city, country or
 *   retired alternative are removed outright: fifty links to the same regional
 *   page would be noise, not navigation;
 * - "Chat by country" + "Chat by city" pairs collapse into one "Chat by region";
 * - any link left in running prose is retargeted at its region or hub.
 *
 * Idempotent: on a migrated site it reports 0 files.
 */
const fs = require('fs');
const path = require('path');
const { REGION_OF_COUNTRY, REGION_OF_CITY } = require('./region-pages');

const PUBLIC = path.join(__dirname, '..', 'public');
const RETIRED_ALT = '(?:chatspin|shagle|camsurf|chathub|azar|holla|tinychat|wakie|free4talk)-alternative';
// A link to one city, country or retired alternative page (not the hubs).
const MEMBER = `/(?:(?:countries|cities)/[a-z0-9-]+|${RETIRED_ALT})`;

function target(href) {
  let m = /^\/countries\/([a-z0-9-]+)$/.exec(href);
  if (m) return REGION_OF_COUNTRY[m[1]] ? `/regions/${REGION_OF_COUNTRY[m[1]]}` : '/regions/';
  m = /^\/cities\/([a-z0-9-]+)$/.exec(href);
  if (m) return REGION_OF_CITY[m[1]] ? `/regions/${REGION_OF_CITY[m[1]]}` : '/regions/';
  if (/^\/(countries|cities)\/?$/.test(href)) return '/regions/';
  if (new RegExp(`^/${RETIRED_ALT}$`).test(href)) return '/alternatives';
  return null;
}

function migrate(html) {
  let out = html;
  // Whole list items / standalone link lines that exist only to link a member.
  out = out.replace(new RegExp(`<li>\\s*<a href="${MEMBER}"[^>]*>[^<]*</a>\\s*</li>`, 'g'), '');
  out = out.replace(new RegExp(`^[ \\t]*<a href="${MEMBER}"[^>]*>[^<]*</a>[ \\t]*\\r?\\n`, 'gm'), '');
  // Link clouds: adjacent anchors with no text between them.
  out = out.replace(new RegExp(`(</a>|<div class="link-cloud">|<nav[^>]*>)\\s*<a href="${MEMBER}"[^>]*>[^<]*</a>(?=\\s*(<a |</div>|</nav>))`, 'g'), '$1');
  // Hub pair -> one regional link.
  out = out.replace(/<a href="\/countries\/">[^<]*<\/a>\s*<a href="\/cities\/">[^<]*<\/a>/g, '<a href="/regions/">Chat by region</a>');
  out = out.replace(/<li><a href="\/countries\/">[^<]*<\/a><\/li>\s*<li><a href="\/cities\/">[^<]*<\/a><\/li>/g, '<li><a href="/regions/">Chat by region</a></li>');
  out = out.replace(/<li><a href="\/cities\/">[^<]*<\/a><\/li>/g, '');
  // Anything left is in prose: keep the words, retarget the link.
  out = out.replace(/href="(\/(?:countries|cities)(?:\/[a-z0-9-]*)?|\/[a-z0-9-]+-alternative)"/g, (all, href) => {
    const to = target(href);
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
console.log(`migrate-regions: rewrote retired links in ${changed} HTML files`);
