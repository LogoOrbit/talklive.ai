'use strict';
/*
 * Serves the minified scripts scripts/minify-assets.js writes to build/min/.
 *
 * A minified copy is served only when build/min/manifest.json says it was made
 * from exactly the bytes now in public/ (SHA-256). Anything else - no build
 * step, a stale build, a file edited since - falls through to the readable
 * source in public/, which is what was served before this existed.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function loadMinified(publicDir, minDir) {
  const valid = new Map(); // "app.js" -> absolute path of the minified copy
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(minDir, 'manifest.json'), 'utf8'));
  } catch (_) {
    return valid;
  }
  for (const [rel, hash] of Object.entries(manifest)) {
    try {
      const source = fs.readFileSync(path.join(publicDir, rel));
      const current = crypto.createHash('sha256').update(source).digest('hex');
      const min = path.join(minDir, rel);
      if (current === hash && fs.existsSync(min)) valid.set(rel, min);
    } catch (_) { /* source gone - skip */ }
  }
  return valid;
}

// Express middleware. `setHeaders` is the same function express.static uses,
// so caching behaves identically for the minified and readable files.
function minifiedScripts(publicDir, minDir, setHeaders) {
  const files = loadMinified(publicDir, minDir);
  if (files.size) console.log(`[minified] serving ${files.size} minified script(s) from ${path.relative(process.cwd(), minDir) || minDir}`);
  return (req, res, next) => {
    if (!files.size || (req.method !== 'GET' && req.method !== 'HEAD')) return next();
    let rel;
    try { rel = decodeURIComponent(req.path).replace(/^\/+/, ''); } catch (_) { return next(); }
    const file = files.get(rel);
    if (!file) return next();
    res.type('application/javascript');
    if (setHeaders) setHeaders(res, file);
    // cacheControl: false keeps the Cache-Control setHeaders chose.
    res.sendFile(file, { cacheControl: false }, (err) => { if (err && !res.headersSent) next(); });
  };
}

module.exports = { minifiedScripts, loadMinified };
