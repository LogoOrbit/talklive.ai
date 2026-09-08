const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const adsVersion = '20260907safe';
// Keep the purchase decision page clean. Showing network ads beside the paid
// plan distracts from the higher-value conversion and undermines "ad-free".
//
// offline.html is here for a different reason: the service worker serves it
// precisely when there is no network, so an ad tag on it can only fail, and it
// must stay self-contained.
const adFreePages = new Set(['pricing.html', 'offline.html']);

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(fullPath);
    return entry.isFile() && entry.name.endsWith('.html') ? [fullPath] : [];
  });
}

let updated = 0;
for (const file of htmlFiles(publicDir)) {
  const before = fs.readFileSync(file, 'utf8');
  let html = before;

  html = html.replace(/<!--([\s\S]*?)-->/g, (comment) =>
    /AdSense|adsbygoogle/i.test(comment) ? '' : comment
  );
  html = html.replace(
    /<ins\b[^>]*class="adsbygoogle"[^>]*><\/ins>\s*<script>\(adsbygoogle = window\.adsbygoogle \|\| \[\]\)\.push\(\{\}\);<\/script>/gi,
    (unit) => `<div data-ad="${/8131758533/.test(unit) ? 'native' : 'leaderboard'}"></div>`
  );
  html = html.replace(/^.*pagead2\.googlesyndication\.com.*\r?\n?/gim, '');

  // Strip the opaque Adsterra "direct link" that still sat in the footer of
  // every country, city and language page. The intrusive Adsterra formats were
  // removed from the rest of the site a while ago and scripts/audit-seo.js
  // bans this host outright, but nothing ever swept the geo cluster - those
  // pages were outside the sitemap, so the audit never looked at them.
  //
  // It is worth removing on its own merits: a sitewide footer link into an
  // opaque smartlink that redirects wherever the network currently pays best
  // is exactly the pattern that earns a manual action or a Safe Browsing
  // interstitial, and one Safe Browsing flag costs more traffic than this link
  // could ever earn.
  html = html.replace(
    /\s*<span><a href="https?:\/\/delvefencescrewdriver\.com\/[^"]*"[^>]*>Sponsored<\/a><\/span>/gi,
    ''
  );

  // Collapse a run of ad slots that sit back to back with no content between
  // them into the first one.
  //
  // The landing, blog and locale templates in build-seo.js each emitted two
  // slots in a row - in the landing template's case two byte-identical
  // leaderboards, because leaderboardAd() and adSlot('leaderboard') are the
  // same function. Measured before the fix: 271 of 274 pages carried a pair
  // with fewer than 30 characters of visible text between them.
  //
  // Two 728x90s in a row do not earn twice. The network fills the second at a
  // lower rate, the pair reads as an ad wall, and stacking is what Google's
  // page-layout guidance and the Coalition for Better Ads single out - and a
  // Chrome ad-filter flag on a site that lives on organic search would cost
  // far more than the second unit could ever return.
  //
  // The templates are fixed at source, but scripts/geo-pages.js,
  // pages-extra2.js and blog-extra2.js are orphaned (see SEO.md), so 177
  // country/city/language pages plus two later batches ship from disk and no
  // template change reaches them. This sweep is how the fix gets there, and it
  // is why it matches on rendered HTML rather than on a template.
  //
  // Deliberately conservative: it only collapses slots separated by markup and
  // whitespace alone. Any real text between two slots and both are kept.
  //
  // Looped to a fixed point rather than run once. A single global replace
  // consumes both members of a pair and resumes scanning after them, so a run
  // of three slots - which the blog template emitted: leaderboard, leaderboard,
  // native - collapses to two and stops. Repeating until the string stops
  // changing is what makes the result independent of how many slots happened to
  // be stacked. The guard is a safety net against a pattern that could somehow
  // oscillate; in practice this settles in two passes.
  const ADJACENT_SLOTS = /(<div\b[^>]*\bdata-ad="[^"]*"[^>]*>\s*<\/div>(?:\s*<\/div>)*)((?:\s*<div\b[^>]*>)*\s*<div\b[^>]*\bdata-ad="[^"]*"[^>]*>\s*<\/div>(?:\s*<\/div>)*)/gi;
  for (let pass = 0; pass < 10; pass += 1) {
    const collapsed = html.replace(ADJACENT_SLOTS,
      (match, first, second) => (/>[^<>]*[A-Za-z0-9][^<>]*</.test(second) ? match : first));
    if (collapsed === html) break;
    html = collapsed;
  }

  // Put every remaining bare slot inside the labelled .ad-card frame.
  //
  // The generator emits the frame itself now, but the geo cluster (177 pages)
  // and the hand-maintained pages ship from disk and no template change reaches
  // them - so this is the only thing that gets the frame onto most of the site.
  //
  // Two reasons it is worth doing everywhere rather than only where it looks
  // nicest. An unlabelled creative sitting in the page flow is indistinguishable
  // from our own content, which is the thing ad disclosure rules exist to
  // prevent; and ads.js keys its unfilled-slot handling off .ad-card, so a slot
  // without one cannot hide its label or collapse cleanly.
  //
  // Idempotent: a slot already inside a card is left alone. The check looks
  // backwards from the slot rather than parsing, because these files are
  // generated HTML with a known shape and a real parser is not worth a
  // dependency here.
  html = html.replace(
    /<div\b(?![^>]*\bclass="[^"]*ad-card)[^>]*\bdata-ad="([^"]+)"[^>]*>\s*<\/div>/gi,
    (match, type, offset, whole) => {
      const before = whole.slice(Math.max(0, offset - 300), offset);
      // Already framed - the card opens somewhere just above this slot.
      if (/class="[^"]*\bad-card\b/.test(before)) return match;
      return `<div class="ad-card"><span class="ad-card-label">Sponsored</span>${match}</div>`;
    }
  );

  html = html.replace(/^[ \t]+$/gm, '');

  html = html.replace(
    /src=(["'])\/ads\.js(?:\?v=[^"']*)?\1/g,
    `src="/ads.js?v=${adsVersion}"`
  );

  if (!adFreePages.has(path.basename(file)) && !/src=["']\/ads\.js\?v=/.test(html)) {
    html = html.replace('</head>', `<script defer src="/ads.js?v=${adsVersion}"></script>\n</head>`);
  }

  if (html !== before) {
    fs.writeFileSync(file, html);
    updated += 1;
  }
}

console.log(`Migrated ${updated} HTML files to Adsterra-only placements.`);
