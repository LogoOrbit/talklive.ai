// Illustrations for the localized homepages. The art lives in
// public/illustrations/ (unDraw, recolored by scripts/recolor-illustrations.js).

const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'public', 'illustrations');

// Intrinsic sizes from each file's viewBox, so every <img> reserves its box
// and the page does not shift when the art arrives.
const SIZES = {};
for (const file of fs.readdirSync(DIR)) {
  if (!file.endsWith('.svg')) continue;
  const m = fs.readFileSync(path.join(DIR, file), 'utf8').match(/viewBox="[\d.-]+[ ,]+[\d.-]+[ ,]+([\d.]+)[ ,]+([\d.]+)"/);
  if (m) SIZES[file.slice(0, -4)] = [Math.round(+m[1]), Math.round(+m[2])];
}

// <img> for one illustration. Pass a short description in the page's
// language as `alt`; scripts/audit-seo.js fails a page with an empty one.
function artImg(name, { cls = 'art', alt = '', eager = false } = {}) {
  if (!SIZES[name]) throw new Error(`Unknown illustration: ${name}`);
  const escAlt = String(alt).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const [w, h] = SIZES[name];
  const load = eager ? '' : ' loading="lazy"';
  return `<img class="${cls}" src="/illustrations/${name}.svg" width="${w}" height="${h}" alt="${escAlt}"${load} decoding="async" />`;
}

module.exports = { artImg };
