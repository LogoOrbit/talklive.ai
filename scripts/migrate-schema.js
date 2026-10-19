'use strict';
/*
 * Completes the merchant-listing fields on every JSON-LD Offer of a Product
 * (or rated app) node in public/, and keeps them off Service offers.
 *
 * scripts/build-seo.js emits the corrected shape itself, so for the pages it
 * still owns this script is a no-op. It exists because three page sets are no
 * longer wired into the builder - the 177-page country/city/language cluster
 * (scripts/geo-pages.js), scripts/pages-extra2.js and scripts/blog-extra2.js
 * are required by nothing, so `npm run build:seo` does not regenerate their
 * output. Those pages ship, Google crawls them, and Search Console counted
 * their offers among the "Merchant listings" warnings. Hand-maintained pages
 * (index.html, pricing.html) carry the same app node and are outside the
 * builder by design.
 *
 * Rather than hand-patching 246 files, this sweeps the built output: parse
 * each ld+json block, fill in only
 * what is missing, and rewrite the file only if something actually changed. It
 * is idempotent, so it stays quiet once the site is correct and catches any
 * page that regresses later.
 *
 * Wiring those three generators back into build-seo.js is NOT the shortcut it
 * looks like. It was tried and measured: the current pageHtml is a generation
 * behind the template those pages were built with, and regenerating strips the
 * visible breadcrumbs, the whole footer link graph and the city cross-links
 * from 177 pages. See "Do not 'fix' the orphaned generators" in SEO.md before
 * touching it.
 *
 * What gets added, and why those values are honest rather than invented, is
 * documented in scripts/data/commerce.js.
 *
 * It also re-types the TalkLive app node. Google (and Semrush, which counts
 * these as "structured data items are invalid") only accepts a
 * SoftwareApplication / WebApplication node that carries `aggregateRating` or
 * `review`, and TalkLive has no rating data to put there (see SEO.md). So an
 * app node without either becomes a `Service`, keeping the app type as
 * `additionalType`: the same facts, in a type with no required rating. A node
 * that does have real ratings is left alone.
 */

const fs = require('fs');
const path = require('path');

const { BRAND, merchantOfferFields } = require('./data/commerce');

const PUBLIC = path.join(__dirname, '..', 'public');

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(full);
    return entry.isFile() && entry.name.endsWith('.html') ? [full] : [];
  });
}

// Fill in an Offer's missing merchant fields. Existing values win - a page
// that already names its own offer URL keeps it.
function completeOffer(offer) {
  if (!offer || typeof offer !== 'object') return false;
  let changed = false;
  for (const [key, value] of Object.entries(merchantOfferFields())) {
    if (offer[key] === undefined) {
      offer[key] = value;
      changed = true;
    }
  }
  return changed;
}

// Anything carrying `offers` is what Google reads as the merchant listing, so
// that is where `brand` has to sit - wherever in the graph it turns up.
const APP_TYPES = ['SoftwareApplication', 'WebApplication', 'MobileApplication'];
const ORGANIZATION = { '@id': 'https://talklive.app/#organization' };
// Kept as they are; every other app-only property is dropped or remapped.
const SERVICE_KEEPS = ['@context', '@id', 'name', 'alternateName', 'url', 'description', 'brand', 'offers', 'audience', 'logo', 'image', 'sameAs', 'termsOfService'];

function appAsService(node) {
  const types = [].concat(node['@type'] || []);
  const appType = types.find((t) => APP_TYPES.includes(t));
  if (!appType || node.aggregateRating || node.review) return false;
  const service = { '@type': 'Service' };
  for (const key of SERVICE_KEEPS) if (node[key] !== undefined) service[key] = node[key];
  service.additionalType = `https://schema.org/${appType}`;
  service.serviceType = 'Random voice and text chat';
  if (node.applicationCategory) service.category = node.applicationCategory;
  service.provider = node.provider || node.publisher || ORGANIZATION;
  service.areaServed = 'Worldwide';
  service.availableChannel = {
    '@type': 'ServiceChannel',
    serviceUrl: node.url || 'https://talklive.app/',
    ...(node.inLanguage ? { availableLanguage: node.inLanguage } : {}),
  };
  for (const key of Object.keys(node)) delete node[key];
  Object.assign(node, service);
  return true;
}

function walk(node) {
  let changed = false;
  if (Array.isArray(node)) {
    for (const item of node) changed = walk(item) || changed;
    return changed;
  }
  if (!node || typeof node !== 'object') return false;
  changed = appAsService(node) || changed;

  if (node.offers) {
    if (node.brand === undefined) {
      node.brand = JSON.parse(JSON.stringify(BRAND));
      changed = true;
    }
    const offers = Array.isArray(node.offers) ? node.offers : [node.offers];
    const types = [].concat(node['@type'] || []);
    if (types.includes('Product') || types.some((t) => APP_TYPES.includes(t))) {
      // A merchant listing: Google wants shipping and returns on its offers.
      for (const offer of offers) changed = completeOffer(offer) || changed;
    } else {
      // A Service is not a merchant listing; the shipping and return blocks
      // were only there for the app node it replaced.
      for (const offer of offers) {
        for (const key of ['hasMerchantReturnPolicy', 'shippingDetails']) {
          if (offer && offer[key] !== undefined) { delete offer[key]; changed = true; }
        }
      }
    }
  }

  for (const value of Object.values(node)) {
    if (value && typeof value === 'object') changed = walk(value) || changed;
  }
  return changed;
}

const LD_BLOCK = /(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g;

let updated = 0;
for (const file of htmlFiles(PUBLIC)) {
  const before = fs.readFileSync(file, 'utf8');
  const after = before.replace(LD_BLOCK, (whole, open, body, close) => {
    let data;
    try {
      data = JSON.parse(body);
    } catch (_) {
      // Not our business to fix malformed JSON-LD; audit-seo.js reports it.
      return whole;
    }
    if (!walk(data)) return whole;
    // Match the block's existing style so the diff stays readable: the
    // generated pages emit one compact line, the hand-written ones are
    // JSON.stringify(x, null, 2).
    const pretty = body.trim().includes('\n');
    const lead = body.match(/^\s*/)[0];
    const tail = body.match(/\s*$/)[0];
    return open + lead + JSON.stringify(data, null, pretty ? 2 : 0) + tail + close;
  });

  if (after !== before) {
    fs.writeFileSync(file, after);
    updated += 1;
  }
}

console.log(`Structured data: completed offers / re-typed app nodes in ${updated} HTML files.`);
