/*
 * Ensure every page in ./public loads the PWA bootstrap (public/pwa.js).
 *
 * Why this is a sweep and not a template edit: the public surface is generated
 * by several scripts, and two of those page sets - the 177-page
 * country/city/language cluster and the later page/blog batches - are committed
 * artifacts that `npm run build:seo` does not rewrite. Editing the templates in
 * build-seo.js therefore reaches only some of the site, and the pages it misses
 * are exactly the long tail that most search traffic lands on.
 *
 * pwa.js has to run everywhere for two reasons:
 *
 *  - It captures the ?ref= referral code. A shared invite link usually lands on
 *    a marketing or city page, not on the app, so a code captured only by the
 *    app is a code lost on most arrivals.
 *  - It registers the service worker, which is what makes the site installable.
 *    Installability is evaluated on the page the visitor is actually looking at.
 *
 * Idempotent: a page that already has the tag is skipped, so this is safe to
 * run on every build (and it is - see the build:seo script).
 */
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const pwaVersion = '20260908pwa';
const TAG = `<script defer src="/pwa.js?v=${pwaVersion}"></script>`;

// The offline page is served by the service worker precisely when there is no
// network, and must stay entirely self-contained. Registering the worker from
// inside it would also be circular.
const skipPages = new Set(['offline.html']);

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(fullPath);
    return entry.isFile() && entry.name.endsWith('.html') ? [fullPath] : [];
  });
}

let updated = 0;
let skipped = 0;
for (const file of htmlFiles(publicDir)) {
  if (skipPages.has(path.basename(file))) continue;
  let html = fs.readFileSync(file, 'utf8');

  // Already tagged - by this sweep, by a template, or by hand. Matching on the
  // path rather than the exact tag means a differently versioned tag is
  // rewritten rather than duplicated.
  if (html.includes('/pwa.js')) {
    const before = html;
    html = html.replace(/<script\b[^>]*\bsrc=["']\/pwa\.js[^"']*["'][^>]*><\/script>/i, TAG);
    if (html !== before) {
      fs.writeFileSync(file, html);
      updated += 1;
    } else {
      skipped += 1;
    }
    continue;
  }

  // No closing head means this is not a page shell; leave it alone rather than
  // guessing where a script belongs.
  if (!html.includes('</head>')) {
    skipped += 1;
    continue;
  }

  // After the manifest link where there is one, so the PWA-related tags stay
  // together; otherwise at the end of the head.
  const manifest = '<link rel="manifest" href="/site.webmanifest" />';
  html = html.includes(manifest)
    ? html.replace(manifest, `${manifest}\n${TAG}`)
    : html.replace('</head>', `${TAG}\n</head>`);

  fs.writeFileSync(file, html);
  updated += 1;
}

console.log(`PWA: tagged ${updated} HTML files (${skipped} unchanged).`);
