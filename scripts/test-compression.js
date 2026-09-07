'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const compress = require('../server/compress');

test('same-size pages with identical static ETags retain their own bodies', async () => {
  const middleware = compress();
  const server = http.createServer((req, res) => middleware(req, res, () => {
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('ETag', 'W/"same-size-and-build-time"');
    res.end((req.url === '/a' ? 'A' : 'B').repeat(2048));
  }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const encoding of ['br', 'gzip', 'identity']) {
      const tags = [];
      for (const path of ['/a', '/b', '/a', '/b']) {
        const response = await fetch(base + path, { headers: { 'Accept-Encoding': encoding } });
        assert.equal(await response.text(), (path === '/a' ? 'A' : 'B').repeat(2048));
        tags.push(response.headers.get('etag'));
      }
      if (encoding !== 'identity') assert.notEqual(tags[0], tags[1]);
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
});
