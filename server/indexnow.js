/*
 * IndexNow integration — pushes every URL in sitemap.xml to search engines
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

function sitemapUrls() {
  const xml = fs.readFileSync(path.join(__dirname, '..', 'public', 'sitemap.xml'), 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
}

// Submits the full URL list in one POST. Errors are logged and swallowed —
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
    console.log(`[indexnow] submitted ${urlList.length} urls — HTTP ${res.statusCode}`);
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
