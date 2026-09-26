const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
// Google AdSense is the only ad network. This sweep keeps every page in step:
// the AdSense loader in the head, the ads.js slot loader, labelled slots, and
// nothing left over from Adsterra. It runs on the files on disk because most
// of the site (the geo cluster and older batches) is not rebuilt from
// templates - see SEO.md.
const adsVersion = '20260923adsense2';
const ADSENSE_LOADER = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6368797323385379"\n     crossorigin="anonymous"></script>';
const AD_LABEL = 'Advertisement';
// Keep the purchase decision page clean. Showing network ads beside the paid
// plan distracts from the higher-value conversion and undermines "ad-free".
//
// offline.html is here for a different reason: the service worker serves it
// precisely when there is no network, so an ad tag on it can only fail, and it
// must stay self-contained.
const adFreePages = new Set(['pricing.html', 'offline.html']);
// Pages that are only the app - no publisher content for an ad to sit beside -
// so they carry no AdSense loader, which keeps Auto ads off them too.
// index.html is not here: it carries the app and the site's main content, and
// AdSense verification looks for the tag on the homepage.
const appOnlyPages = new Set(['chat.html']);
// No AdSense loader at all: the app-only pages, plus the pages kept ad-free
// above (the offline page cannot load it anyway, and Auto ads on the pricing
// page would contradict the ad-free plan it is selling).
const noLoaderPages = new Set([...appOnlyPages, ...adFreePages]);

// No Google ads on the geo cluster: /countries/, /cities/ and /languages/.
// These pages come from one template and, measured on 5-word shingles in
// <main>, only ~17% (languages) to ~25% (countries) of their text is unique to
// the page; the 113 city pages are already noindexed as thin. AdSense does not
// allow Google ads on low-value or templated content, and one flagged section
// can hold up approval for the whole site. The pages stay published and
// indexed as before - they just carry no ad code and no ad slots.
const NO_AD_DIRS = ['countries', 'cities', 'languages'];
// Same treatment for two short pages that are about the site rather than
// content for a reader: /contact (a list of email addresses) and /refund (a
// policy for a plan that is not on sale). AdSense asks for no ad code on pages
// with little original content.
const NO_AD_PAGES = new Set(['contact.html', 'refund.html']);
function isNoAdPage(file) {
  const rel = path.relative(publicDir, file).split(path.sep);
  if (rel.length === 1) return NO_AD_PAGES.has(rel[0]);
  return NO_AD_DIRS.includes(rel[0]);
}

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
  const noAds = isNoAdPage(file);

  html = html.replace(/<!--([\s\S]*?)-->/g, (comment) =>
    /AdSense|adsbygoogle/i.test(comment) ? '' : comment
  );
  html = html.replace(
    /<ins\b[^>]*class="adsbygoogle"[^>]*><\/ins>\s*<script>\(adsbygoogle = window\.adsbygoogle \|\| \[\]\)\.push\(\{\}\);<\/script>/gi,
    (unit) => `<div data-ad="${/8131758533/.test(unit) ? 'native' : 'leaderboard'}"></div>`
  );
  // Old AdSense loaders only; the current account's head tag stays.
  html = html.replace(/^(?!.*ca-pub-6368797323385379).*pagead2\.googlesyndication\.com.*\r?\n?/gim, '');

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

  // Never turn queue availability into a marketing promise. A random-chat
  // marketplace can only match immediately when a compatible person is
  // actually waiting, and repeating an absolute claim across FAQ schema makes
  // the mismatch especially visible to both users and search engines.
  html = html
    .replace(/Matching is instant for everyone; optional Premium adds advanced filters\.?/gi,
      'Wait time depends on compatible people in the live queue; optional Premium adds advanced filters.')
    .replace(/Matching is instant for everyone; optional Premium adds extra controls\.?/gi,
      'Wait time depends on compatible people in the live queue; optional Premium adds extra controls.')
    .replace(/Matching is instant for everyone\.\.?/gi,
      'Wait time depends on compatible people in the live queue.');

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
      return `<div class="ad-card"><span class="ad-card-label">${AD_LABEL}</span>${match}</div>`;
    }
  );

  // Google allows ads to be labelled "Advertisements" or "Sponsored Links";
  // plain "Sponsored" on a card is replaced with the unambiguous label.
  html = html.replace(/(<span class="ad-card-label"(?: data-i18n="sponsored")?>)Sponsored(<\/span>)/g, `$1${AD_LABEL}$2`);

  // Anything left from Adsterra: its hosts in any tag, and its script tags.
  html = html.replace(/^.*(?:delvefencescrewdriver\.com|highperformanceformat\.com|effectivecpmnetwork\.com).*\r?\n?/gim, '');

  html = html.replace(/^[ \t]+$/gm, '');

  html = html.replace(
    /src=(["'])\/ads\.js(?:\?v=[^"']*)?\1/g,
    `src="/ads.js?v=${adsVersion}"`
  );

  if (!adFreePages.has(path.basename(file)) && !noAds && !/src=["']\/ads\.js\?v=/.test(html)) {
    html = html.replace('</head>', `<script defer src="/ads.js?v=${adsVersion}"></script>\n</head>`);
  }
  // The AdSense loader on every ad-carrying page (site verification and Auto
  // ads need it in the head of each page, not only the homepage).
  if (noAds) {
    // Every slot with its labelled card, any wrapper left empty, and ads.js.
    html = html.replace(/<div class="ad-card"><span class="ad-card-label"[^>]*>[^<]*<\/span><div\b[^>]*\bdata-ad="[^"]*"[^>]*><\/div><\/div>/g, '');
    html = html.replace(/[ \t]*<div class="wrap" style="margin:28px auto(?:;text-align:center)?">\s*<\/div>\r?\n?/g, '');
    html = html.replace(/^.*<script\b[^>]*src=["']\/ads\.js[^"']*["'][^>]*><\/script>.*\r?\n?/gm, '');
  }
  if (noLoaderPages.has(path.basename(file)) || noAds) {
    html = html.replace(/^.*pagead2\.googlesyndication\.com.*\r?\n(?:\s*crossorigin="anonymous"><\/script>\r?\n)?/gim, '');
  } else if (!adFreePages.has(path.basename(file)) && !/ca-pub-6368797323385379/.test(html)) {
    html = html.replace('</head>', `${ADSENSE_LOADER}\n</head>`);
  }

  if (html !== before) {
    fs.writeFileSync(file, html);
    updated += 1;
  }
}

console.log(`Ads: ${updated} HTML files updated (AdSense loader, ads.js, labels).`);
