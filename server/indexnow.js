/*
 * IndexNow integration - pushes every URL in sitemap.xml to search engines
 * (Bing, Yandex, Seznam, Naver and everyone else on the IndexNow network)
 * so new/updated pages get crawled within minutes instead of weeks.
 *
 * The key below is public by design: search engines verify ownership by
 * fetching https://talklive.app/<key>.txt, which scripts/build-seo.js emits
 * into ./public. Rotating the key just means changing it here and rebuilding.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const KEY = 'ce0b57a2d6e929d7055a36f1185a7ded';
const HOST = 'talklive.app';

// /sitemap.xml is a <sitemapindex>, so its own <loc> entries are child sitemap
// files rather than pages. Reading it alone would submit six sitemap URLs and
// none of the ~266 pages, which is a silent no-op - so the index is followed
// one level down into the children that actually list pages.
function sitemapUrls() {
  const dir = path.join(__dirname, '..', 'public');
  const root = fs.readFileSync(path.join(dir, 'sitemap.xml'), 'utf8');
  const locs = xml => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);

  if (!/<sitemapindex/i.test(root)) return locs(root);

  const urls = new Set();
  for (const child of locs(root)) {
    const file = path.join(dir, path.basename(new URL(child).pathname));
    // A child listed in the index but missing on disk is a build bug, not a
    // reason to abandon the whole submission.
    try {
      for (const u of locs(fs.readFileSync(file, 'utf8'))) urls.add(u);
    } catch (err) {
      console.warn('[indexnow] skipping child sitemap', child, '-', err.message);
    }
  }
  return [...urls];
}

// Submits the full URL list in one POST. Errors are logged and swallowed -
// indexing pings must never take the app down.
function ping(cb) {
  let urlList;
  try {
    urlList = sitemapUrls();
  } catch (err) {
    console.warn('[indexnow] could not read sitemap:', err.message);
    return cb && cb(err);
  }
  const body = JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: `https://${HOST}/${KEY}.txt`,
    urlList,
  });
  const req = https.request({
    hostname: 'api.indexnow.org',
    path: '/indexnow',
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) },
    timeout: 15000,
  }, res => {
    res.resume();
    console.log(`[indexnow] submitted ${urlList.length} urls - HTTP ${res.statusCode}`);
    cb && cb(null, res.statusCode);
  });
  req.on('error', err => {
    console.warn('[indexnow] ping failed:', err.message);
    cb && cb(err);
  });
  req.on('timeout', () => req.destroy(new Error('timeout')));
  req.end(body);
}

module.exports = { KEY, HOST, ping };
