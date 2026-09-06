#!/usr/bin/env node
'use strict';

/*
 * Adds an ItemList to the three geo hub pages.
 *
 * /countries/, /cities/ and /languages/ are the entry points to the 177-page
 * geo cluster - they list 45, 113 and 16 member pages respectively - and their
 * JSON-LD @graph declared no list at all: WebPage, a two-item BreadcrumbList,
 * FAQPage and HowTo, and nothing describing the one thing the page actually is.
 * /blog/ was already correct (Blog + blogPost[] + CollectionPage); these three
 * were not.
 *
 * The list is read out of the page's own rendered HTML rather than from a data
 * file. That is deliberate and follows the rule SEO.md sets for breadcrumbs:
 * structured data must describe what the visitor can see. Deriving the
 * ItemList from the visible anchors means it cannot claim a member the page
 * does not link to, and cannot drift when the hub's contents change.
 *
 * A sweep rather than a generator change because scripts/geo-pages.js - which
 * built these three files - is one of the orphaned generators that
 * `npm run build:seo` no longer runs. SEO.md records, with measurements, that
 * wiring it back in strips the visible breadcrumb trail and the footer link
 * graph from 177 pages. The files on disk are the source of truth for this
 * cluster, so sitewide schema changes reach it the same way
 * scripts/migrate-schema.js does.
 *
 * Idempotent: a hub that already carries an #itemlist node is skipped.
 */

const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');
const SITE = 'https://talklive.app';

// Each hub, and the URL prefix its member pages share.
const HUBS = [
  { file: 'countries/index.html', prefix: '/countries/', name: 'Countries you can chat with on TalkLive' },
  { file: 'cities/index.html', prefix: '/cities/', name: 'Cities you can chat with on TalkLive' },
  { file: 'languages/index.html', prefix: '/languages/', name: 'Languages you can practise on TalkLive' },
];

function decodeEntities(value) {
  return String(value || '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

/*
 * Member links in document order, deduplicated, taken from <main> only.
 *
 * Scoping to <main> keeps the site footer out of it. The footer repeats a
 * chat-by-country and chat-by-city block on every page, so reading the whole
 * document would produce a list whose order and contents are an artefact of
 * the furniture rather than of the hub.
 */
function memberLinks(html, prefix) {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  const scope = main ? main[1] : html;
  const seen = new Set();
  const items = [];
  const anchor = /<a\b[^>]*\bhref="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchor.exec(scope))) {
    const href = match[1];
    // The hub links to itself from the breadcrumb; a list containing its own
    // page is wrong and Google flags the self-reference.
    if (!href.startsWith(prefix) || href === prefix) continue;
    const name = decodeEntities(match[2].replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
    if (!name || seen.has(href)) continue;
    seen.add(href);
    items.push({ href, name });
  }
  return items;
}

let updated = 0;
let skipped = 0;
for (const hub of HUBS) {
  const file = path.join(PUBLIC, hub.file);
  if (!fs.existsSync(file)) {
    console.warn(`[hub-schema] ${hub.file} is missing - skipping`);
    continue;
  }
  const before = fs.readFileSync(file, 'utf8');
  if (before.includes('#itemlist')) {
    skipped += 1;
    continue;
  }

  const canonical = `${SITE}${hub.prefix}`;
  const items = memberLinks(before, hub.prefix);
  if (!items.length) {
    console.warn(`[hub-schema] ${hub.file} lists no member pages - skipping`);
    continue;
  }

  const itemList = {
    '@type': 'ItemList',
    '@id': `${canonical}#itemlist`,
    name: hub.name,
    // Stated explicitly: the hub groups its members by region or family, not
    // by rank, so claiming an ordering would misdescribe the page.
    itemListOrder: 'https://schema.org/ItemListUnordered',
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      url: `${SITE}${item.href}`,
    })),
  };

  // Insert into the existing @graph and point the WebPage at it, so the list
  // is tied to the page rather than floating as an unattached node.
  const blockPattern = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/i;
  const block = before.match(blockPattern);
  if (!block) {
    console.warn(`[hub-schema] ${hub.file} has no JSON-LD block - skipping`);
    continue;
  }

  let parsed;
  try {
    parsed = JSON.parse(block[1]);
  } catch (err) {
    console.warn(`[hub-schema] ${hub.file} has unparseable JSON-LD - skipping:`, err.message);
    continue;
  }

  const root = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!root || !Array.isArray(root['@graph'])) {
    console.warn(`[hub-schema] ${hub.file} has no @graph - skipping`);
    continue;
  }

  const webPage = root['@graph'].find((node) => node['@type'] === 'WebPage');
  if (webPage && !webPage.mainEntity) webPage.mainEntity = { '@id': itemList['@id'] };
  root['@graph'].push(itemList);

  const html = before.replace(blockPattern,
    `<script type="application/ld+json">${JSON.stringify(parsed)}</script>`);
  fs.writeFileSync(file, html);
  console.log(`[hub-schema] ${hub.file}: ItemList with ${items.length} members`);
  updated += 1;
}

console.log(`Hub schema: added ItemList to ${updated} hub pages (${skipped} already had one).`);
