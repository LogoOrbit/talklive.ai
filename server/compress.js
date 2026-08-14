'use strict';
/*
 * Response compression — Brotli with a gzip fallback.
 *
 * Fly's edge proxy passes bodies through untouched, and Express ships no
 * compression of its own, so before this middleware existed every byte went
 * out raw: 122 kB of style.css, 189 kB of app.js and a 112 kB homepage on
 * every cold visit. That is the single largest Core Web Vitals cost on the
 * site and it is pure transfer waste — the same bytes compress to roughly a
 * fifth of that.
 *
 * Implemented on `zlib` rather than the `compression` package on purpose:
 * zlib is built into Node (no dependency, no lockfile churn on a repo that
 * deploys straight from `npm ci`) and it can speak Brotli, which `compression`
 * still cannot. Brotli beats gzip by another ~15-20% on HTML and CSS.
 *
 * Responses are buffered and compressed on `end` rather than streamed. Every
 * compressible asset here is well under a megabyte, buffering keeps the
 * Content-Length/ETag bookkeeping honest, and the compressed result is cached
 * so a repeat hit on a static file costs a map lookup instead of a Brotli run.
 */
const zlib = require('zlib');

// Only text-shaped bodies benefit. Images, audio, video and fonts are already
// compressed formats; running them through Brotli burns CPU to add bytes.
const COMPRESSIBLE = /^(?:text\/|application\/(?:json|javascript|xml|rss\+xml|atom\+xml|manifest\+json|ld\+json|xhtml\+xml)|image\/svg\+xml)/i;

// Below roughly a packet's worth of payload, framing overhead cancels out any
// saving and can make the response bigger.
const MIN_BYTES = 1024;

const BROTLI_OPTS = (size) => ({
  params: {
    // 5 is the knee of the curve for text: within ~2% of the ratio at 11 for a
    // small fraction of the CPU. 11 on a shared-cpu-1x machine would add tens
    // of milliseconds of TTFB to every uncached response.
    [zlib.constants.BROTLI_PARAM_QUALITY]: 5,
    [zlib.constants.BROTLI_PARAM_SIZE_HINT]: size,
  },
});

/*
 * Compressed-body cache for static assets.
 *
 * Keyed by ETag + encoding, so it is automatically correct across deploys: the
 * static middleware derives ETags from size and mtime, so a changed file gets a
 * new key and the stale entry simply ages out. Only responses that carry a
 * strong-ish validator are cached, which in practice means files on disk and
 * never per-user dynamic output.
 *
 * Bounded by total bytes rather than entry count — one 200 kB bundle should
 * not be worth the same as a 2 kB fragment. On overflow the whole map is
 * dropped rather than evicted one by one; the working set here is a few dozen
 * files, so a full rebuild is rare and costs a handful of compressions.
 */
const cache = new Map();
let cacheBytes = 0;
const CACHE_MAX_BYTES = 8 * 1024 * 1024;

function cacheGet(key) {
  return key ? cache.get(key) : undefined;
}

function cacheSet(key, buf) {
  if (!key) return;
  if (cacheBytes + buf.length > CACHE_MAX_BYTES) {
    cache.clear();
    cacheBytes = 0;
  }
  cache.set(key, buf);
  cacheBytes += buf.length;
}

// Pick the best encoding the client actually asked for. `Accept-Encoding: *`
// counts as "anything", which is what curl and some proxies send.
function negotiate(header) {
  const accept = String(header || '').toLowerCase();
  if (!accept) return null;
  if (/\bbr\b/.test(accept) || accept.includes('*')) return 'br';
  if (/\bgzip\b/.test(accept)) return 'gzip';
  return null;
}

function compressSync(encoding, buf) {
  return encoding === 'br'
    ? zlib.brotliCompressSync(buf, BROTLI_OPTS(buf.length))
    : zlib.gzipSync(buf, { level: 6 });
}

module.exports = function compress() {
  return function compressMiddleware(req, res, next) {
    const encoding = negotiate(req.headers['accept-encoding']);

    // Range requests are byte offsets into the *identity* representation.
    // Compressing one would hand back bytes that do not correspond to the
    // range asked for, so those pass through untouched.
    if (!encoding || req.method === 'HEAD' || req.headers.range) return next();

    // Tell caches and the CDN that the body varies by encoding even on the
    // paths we end up not compressing — otherwise a proxy can serve a Brotli
    // body to a client that never asked for one.
    res.setHeader('Vary', 'Accept-Encoding');

    const chunks = [];
    let length = 0;
    let passthrough = false;

    const origWrite = res.write.bind(res);
    const origEnd = res.end.bind(res);

    // Decided lazily on first write: the content type and any upstream
    // Content-Encoding are only known once the route has set its headers.
    function shouldSkip() {
      if (res.getHeader('Content-Encoding')) return true;
      if (res.statusCode === 204 || res.statusCode === 304) return true;
      if (!COMPRESSIBLE.test(String(res.getHeader('Content-Type') || ''))) return true;
      // Server-Sent Events and anything else explicitly flushing incrementally
      // must not be held back in a buffer.
      if (res.getHeader('Content-Type') && /event-stream/i.test(String(res.getHeader('Content-Type')))) return true;
      return false;
    }

    function collect(chunk, enc) {
      if (chunk === undefined || chunk === null) return;
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, enc === 'buffer' ? undefined : enc || 'utf8');
      chunks.push(buf);
      length += buf.length;
    }

    res.write = function write(chunk, enc, cb) {
      if (passthrough) return origWrite(chunk, enc, cb);
      if (shouldSkip()) {
        passthrough = true;
        // Anything already buffered has not reached the socket yet, so replay
        // it before the chunk that triggered the bail-out.
        for (const c of chunks) origWrite(c);
        chunks.length = 0;
        return origWrite(chunk, enc, cb);
      }
      collect(chunk, typeof enc === 'string' ? enc : undefined);
      if (typeof enc === 'function') enc(); else if (typeof cb === 'function') cb();
      return true;
    };

    res.end = function end(chunk, enc, cb) {
      if (passthrough) return origEnd(chunk, enc, cb);
      if (typeof chunk === 'function') { cb = chunk; chunk = undefined; enc = undefined; }
      else if (typeof enc === 'function') { cb = enc; enc = undefined; }

      if (shouldSkip()) {
        passthrough = true;
        for (const c of chunks) origWrite(c);
        chunks.length = 0;
        return origEnd(chunk, enc, cb);
      }

      collect(chunk, typeof enc === 'string' ? enc : undefined);

      if (length < MIN_BYTES) {
        passthrough = true;
        for (const c of chunks) origWrite(c);
        return origEnd(undefined, undefined, cb);
      }

      const etag = res.getHeader('ETag');
      const key = etag ? `${encoding}:${etag}` : null;

      let out = cacheGet(key);
      if (!out) {
        try {
          out = compressSync(encoding, Buffer.concat(chunks, length));
        } catch (err) {
          // A compression failure must never cost the user the response.
          passthrough = true;
          for (const c of chunks) origWrite(c);
          return origEnd(undefined, undefined, cb);
        }
        cacheSet(key, out);
      }

      res.setHeader('Content-Encoding', encoding);
      res.setHeader('Content-Length', String(out.length));
      // The entity on the wire is no longer byte-identical to the identity
      // representation, so its validator must differ too, or a cache can serve
      // the compressed body to a client that revalidated the raw one.
      if (etag) {
        const tag = String(etag);
        res.setHeader('ETag', tag.startsWith('W/') ? `W/${tag.slice(2, -1)}-${encoding}"` : `${tag.slice(0, -1)}-${encoding}"`);
      }
      // Byte ranges no longer line up with the identity body.
      res.removeHeader('Content-Range');
      res.setHeader('Accept-Ranges', 'none');

      return origEnd(out, undefined, cb);
    };

    next();
  };
};
