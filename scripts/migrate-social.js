/*
 * Adds TalkLive's social profiles to every page in ./public:
 *
 *  - a "Follow TalkLive" row at the end of the page footer, and
 *  - <meta name="twitter:site"> next to the existing twitter:card tag.
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
const { footerRow, X_HANDLE } = require('./data/social');

const publicDir = path.join(__dirname, '..', 'public');
// The offline page must stay self-contained; the app shell's in-call screens
// have no site footer.
const skipPages = new Set(['offline.html']);
const ROW = footerRow();
const META = `<meta name="twitter:site" content="${X_HANDLE}" />`;

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
  let html = before.replace(/<nav class="tl-social"[^>]*>[\s\S]*?<\/nav>/g, '');
  html = html.replace(/\s*<meta name="twitter:site"[^>]*>/g, '');

  const end = html.lastIndexOf('</footer>');
  if (end !== -1) html = `${html.slice(0, end)}${ROW}\n${html.slice(end)}`;
  html = html.replace(/(<meta name="twitter:card"[^>]*>)/, `$1\n${META}`);

  if (html !== before) {
    fs.writeFileSync(file, html);
    updated += 1;
  }
}
console.log(`Social: ${updated} HTML file(s) updated.`);
