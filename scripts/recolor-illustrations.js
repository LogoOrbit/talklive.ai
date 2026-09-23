#!/usr/bin/env node
// Recolors unDraw illustrations (https://undraw.co, free under the unDraw
// licence) into the TalkLive palette and writes them to public/illustrations/.
//
// unDraw ships its art for white backgrounds: near-black ink for hair and
// outlines, pale greys for floors and props. Our pages are dark by default
// (seo.css also has a light scheme), so the recolor has to read on both:
//   - the primary colour (currentColor) becomes the brand violet,
//   - unDraw's pink secondary becomes the brand cyan,
//   - near-black ink is lifted to a slate that shows on #0b0f1a and #eef1f9,
//   - pale greys become a translucent muted tone, so props sit quietly on
//     either background instead of glowing on dark.
//
// Usage: node scripts/recolor-illustrations.js <dir-with-undraw-svgs>
// (e.g. the svgs/ folder of the `undraw-svg` npm package). The names to
// export are listed in ILLUSTRATIONS below. Output is then minified with
// `npx svgo --multipass -p 1 -f public/illustrations`.

const fs = require('fs');
const path = require('path');

const ILLUSTRATIONS = require('./data/illustrations.json');

const PRIMARY = '#7c6cf0';
const SECONDARY = '#00d4ff';
const INK_DARK = '#3d4168';
const INK = '#5a5f8c';
const MUTED = '#8a90a8';
const MUTED_OPACITY = '.3';

const INK_DARK_SET = ['#2f2e41', '#2f2e43', '#090814', '#000', '#000000', '#1e1e1e', '#22212f'];
const INK_SET = ['#3f3d56', '#3f3d58', '#535461', '#464a5f', '#444053', '#575a89', '#707070', '#3a3847'];
const GREY_SET = ['#e6e6e6', '#ccc', '#cccccc', '#f2f2f2', '#e4e4e4', '#f0f0f0', '#cacaca', '#e5e5e5',
  '#cbcbcb', '#f1f1f1', '#e2e3e4', '#e6e7e8', '#e0e0e0', '#d6d6e3', '#d0cde1', '#b6b3c5', '#ebebeb',
  '#ddd', '#dddddd', '#d6d6d6', '#e8e8e8', '#efefef', '#f3f3f3', '#e2e2e2', '#dedede', '#d3d3d3',
  '#c6c6c6', '#c4c4c4', '#b3b3b3', '#bfbfbf', '#a8a8a8', '#9e9e9e'];

function recolor(svg) {
  let out = svg.replace(/<\?xml[^>]*\?>/, '');
  out = out.replace(/currentColor/g, PRIMARY);
  out = out.replace(/#ff6584\b/gi, SECONDARY);
  // One element at a time, so a translucent grey never collides with an
  // opacity attribute the element already carries.
  out = out.replace(/<([a-zA-Z]+)(\s[^<>]*?)(\/?)>/g, (tag, name, attrs, selfClose) => {
    for (const prop of ['fill', 'stroke']) {
      attrs = attrs.replace(new RegExp(`(\\s${prop}=")(#[0-9a-fA-F]{3,6})(")`), (m, a, c, b) => {
        const col = c.toLowerCase();
        if (INK_DARK_SET.includes(col)) return a + INK_DARK + b;
        if (INK_SET.includes(col)) return a + INK + b;
        if (GREY_SET.includes(col)) {
          if (new RegExp(`\\s(${prop}-)?opacity=`).test(attrs)) return a + MUTED + b;
          return `${a}${MUTED}${b} ${prop}-opacity="${MUTED_OPACITY}"`;
        }
        return m;
      });
    }
    return `<${name}${attrs}${selfClose}>`;
  });
  return out.trim() + '\n';
}

const src = process.argv[2];
if (!src) {
  console.error('Usage: node scripts/recolor-illustrations.js <dir-with-undraw-svgs>');
  process.exit(1);
}
const outDir = path.join(__dirname, '..', 'public', 'illustrations');
fs.mkdirSync(outDir, { recursive: true });
for (const name of ILLUSTRATIONS) {
  const svg = fs.readFileSync(path.join(src, `${name}.svg`), 'utf8');
  fs.writeFileSync(path.join(outDir, `${name}.svg`), recolor(svg));
}
console.log(`Recolored ${ILLUSTRATIONS.length} illustrations into public/illustrations/.`);
