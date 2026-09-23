#!/usr/bin/env node
'use strict';
/*
 * Minify the site's JavaScript into build/min/, for the server to serve in
 * place of the readable source.
 *
 * public/ keeps the readable files - they are what gets edited, reviewed and
 * committed. This writes a minified copy of each one to build/min/<same path>
 * plus build/min/manifest.json, which records the SHA-256 of the source each
 * copy was made from. server/minified.js only serves a copy whose recorded
 * hash still matches the file in public/, so a stale build can never ship old
 * code: anything out of date simply falls back to the readable source.
 *
 * Runs in CI before `flyctl deploy` (the workspace, build/ included, is what
 * Fly builds the image from). A deploy made without it serves the readable
 * files, exactly as before. build/ is git-ignored.
 *
 * Only top-level names are kept (terser's default for scripts): the pages load
 * these as classic scripts that share globals - t(), I18N_LANGS, openModal and
 * friends - so renaming those would break the other files.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { minify } = require('terser');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const OUT = path.join(ROOT, 'build', 'min');

// The service worker is left alone: browsers byte-compare it to decide whether
// to update, and it is small.
const SKIP = new Set(['sw.js']);

function jsFiles(dir, rel = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) return ['i18n'].includes(r) ? jsFiles(path.join(dir, e.name), r) : [];
    return e.isFile() && e.name.endsWith('.js') && !SKIP.has(r) ? [r] : [];
  });
}

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  const manifest = {};
  let before = 0;
  let after = 0;
  for (const rel of jsFiles(PUBLIC)) {
    const source = fs.readFileSync(path.join(PUBLIC, rel), 'utf8');
    const result = await minify(source, {
      compress: { passes: 2 },
      mangle: true,
      format: { comments: false },
    });
    if (!result.code || result.code.length >= source.length) continue;
    const dest = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, result.code);
    manifest[rel] = crypto.createHash('sha256').update(source).digest('hex');
    before += Buffer.byteLength(source);
    after += Buffer.byteLength(result.code);
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  const kb = (n) => (n / 1024).toFixed(0);
  console.log(`Minified ${Object.keys(manifest).length} scripts: ${kb(before)} KB -> ${kb(after)} KB (build/min/).`);
})().catch((err) => {
  console.error('[minify] failed:', err.message);
  process.exit(1);
});
