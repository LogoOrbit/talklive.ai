// Checks the /api/gifs proxy against a mock Giphy that returns a real-shaped
// payload: that the right rendition is picked, that the response is trimmed to
// what the picker needs, that identical queries are cached rather than re-sent
// upstream, and that the hourly budget degrades to stale cache instead of
// hammering a key that only allows 100 calls an hour.
//
//   node scripts/test-gif-proxy.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

let failed = 0;
const ok = (n, c, x) => { if (!c) failed++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : (x === undefined ? '' : x)); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// One result, shaped the way Giphy's v1 search response actually is - trimmed
// to the renditions the proxy reads, plus one it should ignore.
const giphyResult = (id) => ({
  type: 'gif',
  id,
  title: 'a dancing ' + id,
  images: {
    original: { url: `https://media3.giphy.com/media/${id}/giphy.gif`, width: '480', height: '360', size: '4200000' },
    fixed_width: { url: `https://media3.giphy.com/media/${id}/200w.gif`, width: '200', height: '150' },
    fixed_width_small: { url: `https://media3.giphy.com/media/${id}/100w.gif`, width: '100', height: '75' },
    preview_gif: { url: `https://media3.giphy.com/media/${id}/preview.gif`, width: '90', height: '67' },
  },
});

(async () => {
  let upstreamHits = 0;
  let lastQuery = null;
  const mock = http.createServer((req, res) => {
    upstreamHits++;
    lastQuery = new URL(req.url, 'http://x');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      data: [
        giphyResult('aaa'),
        giphyResult('bbb'),
        // No usable rendition - the proxy must drop it rather than emit a
        // broken tile.
        { type: 'gif', id: 'ccc', title: 'broken', images: {} },
      ],
      pagination: { total_count: 2, count: 3, offset: 0 },
      meta: { status: 200, msg: 'OK' },
    }));
  });
  await new Promise((r) => mock.listen(0, '127.0.0.1', r));
  const mockPort = mock.address().port;

  const PORT = 5600 + Math.floor(Math.random() * 200);
  const BASE = `http://127.0.0.1:${PORT}`;
  const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-gif-'));
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: {
      ...process.env,
      PORT: String(PORT),
      DATA_DIR,
      NODE_ENV: 'development',
      GIPHY_API_KEY: 'test-key',
      GIPHY_API_BASE: `http://127.0.0.1:${mockPort}/v1/gifs/`,
      // Small enough to exhaust deliberately below.
      GIPHY_HOURLY_BUDGET: '2',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const logs = [];
  srv.stdout.on('data', (d) => logs.push(String(d)));
  srv.stderr.on('data', (d) => logs.push(String(d)));

  const done = (code) => {
    try { srv.kill('SIGKILL'); } catch (_) { /* gone */ }
    mock.close();
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    process.exit(code);
  };

  try {
    for (let i = 0; i < 40; i++) {
      try { await fetch(BASE + '/healthz'); break; } catch (_) { await wait(250); }
    }

    const cfg = await (await fetch(BASE + '/api/gifs/config')).json();
    ok('feature reports enabled with a key', cfg.enabled === true);

    // --- trending (no query) ---
    const trending = await (await fetch(BASE + '/api/gifs')).json();
    ok('trending returns results', Array.isArray(trending.results) && trending.results.length === 2,
      JSON.stringify(trending).slice(0, 200));
    ok('the unusable result is dropped', trending.results.length === 2);
    ok('trending hits the trending endpoint', lastQuery.pathname.endsWith('/trending'), lastQuery.pathname);

    const first = trending.results[0];
    ok('picks fixed_width for the bubble, not the multi-MB original',
      first.url === 'https://media3.giphy.com/media/aaa/200w.gif', first.url);
    ok('picks the small rendition for the grid',
      first.preview === 'https://media3.giphy.com/media/aaa/100w.gif', first.preview);
    ok('dimensions come back as numbers', first.w === 200 && first.h === 150, `${first.w}x${first.h}`);
    ok('title becomes the alt text', first.alt === 'a dancing aaa', first.alt);
    ok('response is trimmed to five fields',
      Object.keys(first).sort().join(',') === 'alt,h,preview,url,w', Object.keys(first).join(','));

    // --- the strict rating is always sent ---
    ok('rating=g is always sent upstream', lastQuery.searchParams.get('rating') === 'g');
    ok('the API key never reaches the client', !JSON.stringify(trending).includes('test-key'));

    // --- search ---
    const before = upstreamHits;
    const s1 = await (await fetch(BASE + '/api/gifs?q=cats&lang=en')).json();
    ok('search returns results', s1.results.length === 2);
    ok('search forwards the query', lastQuery.searchParams.get('q') === 'cats', lastQuery.search);
    ok('search calls upstream once', upstreamHits === before + 1, `${upstreamHits} vs ${before}`);

    // --- cache ---
    const cachedHits = upstreamHits;
    const s2 = await (await fetch(BASE + '/api/gifs?q=cats&lang=en')).json();
    ok('an identical query is served from cache', upstreamHits === cachedHits);
    ok('the cached body matches', JSON.stringify(s2) === JSON.stringify(s1));
    const s3 = await (await fetch(BASE + '/api/gifs?q=CATS&lang=en')).json();
    ok('the cache key is case-insensitive', upstreamHits === cachedHits && s3.results.length === 2);

    // --- hourly budget ---
    // Budget is 2 and both have been spent (trending + cats). A new query must
    // not call upstream.
    const spent = upstreamHits;
    const over = await (await fetch(BASE + '/api/gifs?q=dogs&lang=en')).json();
    ok('a new query past the budget does not call upstream', upstreamHits === spent, String(upstreamHits));
    ok('and returns an empty grid rather than an error', Array.isArray(over.results) && over.results.length === 0,
      JSON.stringify(over));
    const stale = await (await fetch(BASE + '/api/gifs?q=cats&lang=en')).json();
    ok('a query already cached still answers past the budget', stale.results.length === 2);

    // --- upstream failure ---
    ok('nothing crashed the server', !logs.join('').includes('Unhandled'), logs.join('').slice(-300));

    console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
    done(failed ? 1 : 0);
  } catch (err) {
    console.error('\nFAIL (threw):', err.message);
    console.error(logs.join('').slice(-1500));
    done(1);
  }
})();
