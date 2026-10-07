/*
 * Adds TalkLive's social profiles to every page in ./public:
 *
 *  - a "Follow TalkLive" row at the end of the page footer, and
 *  - <meta name="twitter:site"> next to the existing twitter:card tag, and
 *  - `sameAs` on every TalkLive Organization node in the page's JSON-LD,
 *    including hand-maintained pages and nested nodes (mainEntity, publisher).
 *
 * A sweep rather than a template edit for the reason in scripts/migrate-pwa.js:
 * several page sets ship from disk with no live generator, and the
 * hand-maintained pages (index, about, contact, pricing...) have no template.
 * The profiles themselves live in scripts/data/social.js.
 *
 * Idempotent: an existing row or tag is replaced, never duplicated, so a
 * changed profile list reaches every page on the next build.
 */
const fs = require('fs');
const path = require('path');
const { footerRow, X_HANDLE, SAME_AS } = require('./data/social');

const publicDir = path.join(__dirname, '..', 'public');
// The offline page must stay self-contained; the app shell's in-call screens
// have no site footer.
const skipPages = new Set(['offline.html']);
const ROW = footerRow();
const META = `<meta name="twitter:site" content="${X_HANDLE}" />`;

// TalkLive itself, not e.g. the "TalkLive Journal" author node.
function isTalkLiveOrg(node) {
  const types = [].concat(node['@type'] || []);
  return types.includes('Organization')
    && (node.name === 'TalkLive' || /talklive\.app\/#organization$/.test(node['@id'] || ''));
}

function setSameAs(node) {
  if (Array.isArray(node)) return node.some(setSameAs);
  if (!node || typeof node !== 'object') return false;
  let changed = false;
  if (isTalkLiveOrg(node) && JSON.stringify(node.sameAs) !== JSON.stringify(SAME_AS)) {
    node.sameAs = SAME_AS;
    changed = true;
  }
  for (const value of Object.values(node)) if (setSameAs(value)) changed = true;
  return changed;
}

// Rewrites a JSON-LD block only when its sameAs is missing or stale, keeping
// the block's compact or indented layout.
function updateJsonLd(html) {
  return html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g, (whole, open, body, close) => {
    let data;
    try { data = JSON.parse(body); } catch { return whole; }
    if (!setSameAs(data)) return whole;
    if (!/\n\s*"/.test(body)) return `${open}${JSON.stringify(data)}${close}`;
    // A hand-formatted block that already lists sameAs: swap only the array,
    // so the rest of the hand layout is left alone.
    const swapped = body.replace(/("sameAs"\s*:\s*)\[[^\]]*\]/g, `$1${JSON.stringify(SAME_AS)}`);
    try { if (!setSameAs(JSON.parse(swapped))) return `${open}${swapped}${close}`; } catch { /* fall through */ }
    return `${open}\n${JSON.stringify(data, null, 2)}\n${close}`;
  });
}

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(full);
    return entry.isFile() && entry.name.endsWith('.html') ? [full] : [];
  });
}

let updated = 0;
for (const file of htmlFiles(publicDir)) {
  if (skipPages.has(path.basename(file))) continue;
  const before = fs.readFileSync(file, 'utf8');
  let html = before.replace(/\n*<nav class="tl-social"[^>]*>[\s\S]*?<\/nav>\n?/g, '');
  html = html.replace(/\s*<meta name="twitter:site"[^>]*>/g, '');

  const end = html.lastIndexOf('</footer>');
  if (end !== -1) html = `${html.slice(0, end)}${ROW}\n${html.slice(end)}`;
  html = html.replace(/(<meta name="twitter:card"[^>]*>)/, `$1\n${META}`);
  html = updateJsonLd(html);

  if (html !== before) {
    fs.writeFileSync(file, html);
    updated += 1;
  }
}
console.log(`Social: ${updated} HTML file(s) updated.`);
