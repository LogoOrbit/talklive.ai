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

// <img> for one illustration. Decorative by default (alt=""): the art sits
// next to a heading that already says what the section is about.
function artImg(name, { cls = 'art', alt = '', eager = false } = {}) {
  if (!SIZES[name]) throw new Error(`Unknown illustration: ${name}`);
  const [w, h] = SIZES[name];
  const load = eager ? '' : ' loading="lazy"';
  return `<img class="${cls}" src="/illustrations/${name}.svg" width="${w}" height="${h}" alt="${alt}"${load} decoding="async" />`;
}

module.exports = { artImg };
