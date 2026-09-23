#!/usr/bin/env node
'use strict';
/*
 * Fails when a page's initial JavaScript or CSS outgrows its budget.
 *
 * "Initial" means every same-origin <script src> and <link rel="stylesheet">
 * in the page's HTML - what a first visit downloads before anything is
 * clicked. Third-party tags (Google, ad networks) are excluded because this
 * repo does not control their size. Sizes are gzipped, which is what the
 * server sends (see server/compress.js).
 *
 * Budgets live in scripts/bundle-budget.json. They were set from the measured
 * size after the modal/legal-text split, plus a little headroom; raise one
 * deliberately in the same PR that needs it, never to make CI green.
 *
 *   node scripts/check-bundle-size.js            check against budgets
 *   node scripts/check-bundle-size.js --report   print sizes only
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const BUDGETS = require('./bundle-budget.json');
const reportOnly = process.argv.includes('--report');

// Served by the server rather than from public/. null = generated per request
// and a few bytes long (the Google client ID), so not counted.
const VIRTUAL = {
  '/config.js': null,
  '/socket.io/socket.io.js': path.join(ROOT, 'node_modules/socket.io/client-dist/socket.io.js'),
  '/socket.io/socket.io.min.js': path.join(ROOT, 'node_modules/socket.io/client-dist/socket.io.min.js'),
};

function localFile(ref, pageDir) {
  if (/^(https?:)?\/\//i.test(ref) || ref.startsWith('data:')) return null;
  const clean = ref.split(/[?#]/)[0];
  if (clean in VIRTUAL) return VIRTUAL[clean] || false;
  const abs = clean.startsWith('/') ? path.join(PUBLIC, clean) : path.join(pageDir, clean);
  return fs.existsSync(abs) ? abs : null;
}

const gz = file => zlib.gzipSync(fs.readFileSync(file), { level: 6 }).length;
const kb = n => Math.round(n / 102.4) / 10;

let failed = false;
for (const [page, budget] of Object.entries(BUDGETS.pages)) {
  const file = path.join(PUBLIC, page);
  const html = fs.readFileSync(file, 'utf8')
    // Commented-out tags are not loaded.
    .replace(/<!--[\s\S]*?-->/g, '');
  const dir = path.dirname(file);
  const totals = { js: 0, css: 0 };
  const seen = new Set();
  const missing = [];
  for (const m of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/gi)) {
    const f = localFile(m[1], dir);
    if (f === null && !/^(https?:)?\/\//i.test(m[1]) && !m[1].startsWith('data:')) missing.push(m[1]);
    if (f && !seen.has(f)) { seen.add(f); totals.js += gz(f); }
  }
  for (const m of html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*>/gi)) {
    const href = (m[0].match(/\bhref="([^"]+)"/) || [])[1];
    if (!href) continue;
    const f = localFile(href, dir);
    if (f && !seen.has(f)) { seen.add(f); totals.css += gz(f); }
  }
  const htmlGz = zlib.gzipSync(fs.readFileSync(file), { level: 6 }).length;
  const rows = [['js', totals.js, budget.jsKb], ['css', totals.css, budget.cssKb], ['html', htmlGz, budget.htmlKb]];
  for (const [kind, bytes, limitKb] of rows) {
    const over = limitKb !== undefined && kb(bytes) > limitKb;
    if (over && !reportOnly) failed = true;
    console.log(`${over ? 'OVER' : 'ok  '} ${page.padEnd(22)} ${kind.padEnd(4)} ${String(kb(bytes)).padStart(6)} KB gz`
      + (limitKb !== undefined ? ` / budget ${limitKb} KB` : ''));
  }
  if (missing.length) {
    console.log(`     ${page}: local script(s) not found: ${missing.join(', ')}`);
    if (!reportOnly) failed = true;
  }
}
if (failed) {
  console.error('\nBundle budget exceeded. Shrink the payload, or raise the budget in scripts/bundle-budget.json deliberately in this PR.');
  process.exit(1);
}
