#!/usr/bin/env node
'use strict';

/*
 * Dependency-free audit for generated, indexable SEO pages.
 *
 * The sitemap is the source of truth for which public HTML files are intended
 * to be indexed. This deliberately excludes app-only/noindex shells such as
 * /chat and the alternate landing template while still checking every locale,
 * blog directory, article, resource hub, and policy URL submitted to crawlers.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const SITEMAP = path.join(PUBLIC, 'sitemap.xml');
const SITE_ORIGIN = 'https://talklive.app';

const NON_MARKETING_PATHS = new Set(['/privacy', '/terms', '/refund']);
const BANNED_SPONSORED_HOSTS = ['delvefencescrewdriver.com'];
const DYNAMIC_PAGE_ROUTES = new Set(['/chat', '/call']);
const DYNAMIC_PAGE_PREFIXES = ['/owner'];
const ASSET_EXTENSIONS = new Set([
  '.avif', '.css', '.csv', '.gif', '.ico', '.jpeg', '.jpg', '.js', '.json',
  '.m4a', '.map', '.mp3', '.mp4', '.ogg', '.pdf', '.png', '.svg', '.txt',
  '.wav', '.webm', '.webmanifest', '.webp', '.woff', '.woff2', '.xml', '.zip',
]);

const errors = [];
let checkedLinks = 0;

function report(scope, message) {
  errors.push(`[${scope}] ${message}`);
}

function decodeEntities(value) {
  return String(value || '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function normalizeText(value) {
  return decodeEntities(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseAttributes(tag) {
  const attrs = Object.create(null);
  const body = tag.replace(/^<[^\s>]+\s*/i, '').replace(/\/?>\s*$/i, '');
  const attribute = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = attribute.exec(body))) {
    attrs[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attrs;
}

function openingTags(html, name) {
  return html.match(new RegExp(`<${name}\\b[^>]*>`, 'gi')) || [];
}

function metaContent(html, attribute, expected) {
  const wanted = expected.toLowerCase();
  for (const tag of openingTags(html, 'meta')) {
    const attrs = parseAttributes(tag);
    if (String(attrs[attribute] || '').toLowerCase() === wanted) {
      return normalizeText(attrs.content || '');
    }
  }
  return '';
}

function canonicalHref(html) {
  for (const tag of openingTags(html, 'link')) {
    const attrs = parseAttributes(tag);
    const rel = String(attrs.rel || '').toLowerCase().split(/\s+/);
    if (rel.includes('canonical')) return String(attrs.href || '').trim();
  }
  return '';
}

function titleText(html) {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return match ? normalizeText(match[1]) : '';
}

function visibleMarkup(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, '');
}

function jsonLdBlocks(html) {
  const blocks = [];
  const script = /<script\b[^>]*\btype\s*=\s*(?:"application\/ld\+json"|'application\/ld\+json'|application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = script.exec(html))) blocks.push(match[1].trim());
  return blocks;
}

function containsAggregateRating(value) {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(containsAggregateRating);
  for (const [key, child] of Object.entries(value)) {
    if (key.toLowerCase() === 'aggregaterating') return true;
    if (key === '@type') {
      const types = Array.isArray(child) ? child : [child];
      if (types.some(type => String(type).toLowerCase() === 'aggregaterating')) return true;
    }
    if (containsAggregateRating(child)) return true;
  }
  return false;
}

function safeDecodedPath(pathname, scope) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch (_) {
    report(scope, `malformed URL encoding in path "${pathname}"`);
    return null;
  }
  if (!decoded.startsWith('/') || decoded.startsWith('//') || decoded.includes('\\')
    || decoded.includes('\0') || decoded.split('/').some(part => part === '.' || part === '..')) {
    report(scope, `unsafe path "${pathname}"`);
    return null;
  }
  return decoded;
}

function containedPublicPath(...parts) {
  const candidate = path.resolve(PUBLIC, ...parts);
  const relative = path.relative(PUBLIC, candidate);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return candidate;
}

function sitemapUrlToFile(url, scope) {
  const decoded = safeDecodedPath(url.pathname, scope);
  if (decoded === null) return null;
  const relative = decoded.replace(/^\/+/, '');
  if (decoded === '/') return path.join(PUBLIC, 'index.html');
  if (decoded.endsWith('/')) return containedPublicPath(relative, 'index.html');
  return containedPublicPath(relative + '.html');
}

function routeHasPage(pathname, scope) {
  const decoded = safeDecodedPath(pathname, scope);
  if (decoded === null) return false;
  if (decoded === '/') return true;
  if (DYNAMIC_PAGE_ROUTES.has(decoded)) return true;
  if (DYNAMIC_PAGE_PREFIXES.some(prefix => decoded === prefix || decoded.startsWith(prefix + '/'))) return true;

  const extension = path.posix.extname(decoded).toLowerCase();
  if (ASSET_EXTENSIONS.has(extension)) return true;

  const relative = decoded.replace(/^\/+/, '');
  const candidates = [];
  if (decoded.endsWith('/')) {
    candidates.push(containedPublicPath(relative, 'index.html'));
  } else if (extension === '.html') {
    candidates.push(containedPublicPath(relative));
  } else {
    candidates.push(containedPublicPath(relative + '.html'));
    // Accept /blog and /es as well as their canonical slash forms. Express
    // redirects real directories to /blog/ and /es/ at runtime.
    candidates.push(containedPublicPath(relative, 'index.html'));
  }
  return candidates.some(file => file && fs.existsSync(file) && fs.statSync(file).isFile());
}

function auditInternalLinks(html, pageScope) {
  const seen = new Set();
  for (const tag of openingTags(visibleMarkup(html), 'a')) {
    const href = String(parseAttributes(tag).href || '').trim();
    if (!href || href.startsWith('#') || href.startsWith('?') || href.startsWith('//')) continue;
    if (!href.startsWith('/')) continue; // mailto:, tel:, data:, and external/relative URLs

    let target;
    try {
      target = new URL(href, SITE_ORIGIN);
    } catch (_) {
      report(pageScope, `invalid internal link "${href}"`);
      continue;
    }
    if (target.origin !== SITE_ORIGIN) continue;
    if (target.pathname === '/') continue; // app home, including query/hash CTAs
    if (DYNAMIC_PAGE_ROUTES.has(target.pathname)) continue;
    if (DYNAMIC_PAGE_PREFIXES.some(prefix => target.pathname === prefix || target.pathname.startsWith(prefix + '/'))) continue;

    const key = target.pathname;
    if (seen.has(key)) continue;
    seen.add(key);
    const extension = path.posix.extname(target.pathname).toLowerCase();
    if (ASSET_EXTENSIONS.has(extension)) continue;

    checkedLinks += 1;
    if (!routeHasPage(target.pathname, pageScope)) {
      report(pageScope, `root-relative page link does not resolve: "${href}"`);
    }
  }
}

function normalizedAbsoluteUrl(value) {
  try {
    return new URL(value, SITE_ORIGIN).href;
  } catch (_) {
    return '';
  }
}

if (!fs.existsSync(SITEMAP)) {
  report('sitemap', 'public/sitemap.xml is missing; run npm run build:seo first');
} else {
  const xml = fs.readFileSync(SITEMAP, 'utf8');
  const locations = [...xml.matchAll(/<loc>\s*([\s\S]*?)\s*<\/loc>/gi)]
    .map(match => decodeEntities(match[1]).trim())
    .filter(Boolean);

  if (locations.length === 0) report('sitemap', 'contains no <loc> URLs');

  const seenSitemapUrls = new Set();
  const canonicalOwners = new Map();
  const titleOwners = new Map();

  for (const location of locations) {
    const scope = `sitemap:${location}`;
    let url;
    try {
      url = new URL(location);
    } catch (_) {
      report(scope, 'is not a valid absolute URL');
      continue;
    }

    if (url.origin !== SITE_ORIGIN) report(scope, `must use canonical origin ${SITE_ORIGIN}`);
    if (url.search || url.hash) report(scope, 'must not contain a query string or fragment');
    if (/\.html$/i.test(url.pathname)) report(scope, 'must use a clean URL without .html');
    if (seenSitemapUrls.has(url.href)) report(scope, 'is duplicated in the sitemap');
    seenSitemapUrls.add(url.href);

    const file = sitemapUrlToFile(url, scope);
    if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      report(scope, `does not map to a generated HTML file${file ? ` (${path.relative(ROOT, file)})` : ''}`);
      continue;
    }

    const relativeFile = path.relative(ROOT, file).replace(/\\/g, '/');
    const pageScope = relativeFile;
    const html = fs.readFileSync(file, 'utf8');
    const markup = visibleMarkup(html);

    const title = titleText(html);
    if (!title) report(pageScope, 'missing non-empty <title>');

    const canonical = canonicalHref(html);
    if (!canonical) {
      report(pageScope, 'missing rel="canonical"');
    } else {
      const normalizedCanonical = normalizedAbsoluteUrl(canonical);
      if (!normalizedCanonical) {
        report(pageScope, `invalid canonical URL "${canonical}"`);
      } else if (normalizedCanonical !== url.href) {
        report(pageScope, `canonical does not match sitemap URL (${normalizedCanonical} !== ${url.href})`);
      }
    }

    const description = metaContent(html, 'name', 'description');
    if (!description) report(pageScope, 'missing non-empty meta description');

    const robots = metaContent(html, 'name', 'robots').toLowerCase();
    if (robots.split(/[\s,]+/).includes('noindex')) report(pageScope, 'sitemap page is marked noindex');

    const h1Count = (markup.match(/<h1\b[^>]*>/gi) || []).length;
    if (h1Count !== 1) report(pageScope, `expected exactly one H1, found ${h1Count}`);

    if (!NON_MARKETING_PATHS.has(url.pathname)) {
      const requiredSocialMetadata = [
        ['Open Graph image', metaContent(html, 'property', 'og:image')],
        ['Open Graph image alt', metaContent(html, 'property', 'og:image:alt')],
        ['Twitter image', metaContent(html, 'name', 'twitter:image')],
        ['Twitter image alt', metaContent(html, 'name', 'twitter:image:alt')],
      ];
      for (const [label, value] of requiredSocialMetadata) {
        if (!value) report(pageScope, `missing non-empty ${label} metadata`);
      }
    }

    const lowerHtml = html.toLowerCase();
    for (const host of BANNED_SPONSORED_HOSTS) {
      if (lowerHtml.includes(host)) report(pageScope, `contains banned opaque sponsored host ${host}`);
    }

    const blocks = jsonLdBlocks(html);
    for (let i = 0; i < blocks.length; i += 1) {
      let data;
      try {
        data = JSON.parse(blocks[i]);
      } catch (error) {
        report(pageScope, `JSON-LD block ${i + 1} is invalid: ${error.message}`);
        continue;
      }
      if (containsAggregateRating(data)) {
        report(pageScope, `JSON-LD block ${i + 1} contains forbidden AggregateRating markup`);
      }
    }

    if (canonical) {
      const canonicalKey = normalizedAbsoluteUrl(canonical).toLowerCase();
      if (canonicalKey) {
        const owner = canonicalOwners.get(canonicalKey);
        if (owner) report(pageScope, `canonical duplicates ${owner}: ${canonical}`);
        else canonicalOwners.set(canonicalKey, pageScope);
      }
    }
    if (title) {
      const titleKey = title.toLowerCase();
      const owner = titleOwners.get(titleKey);
      if (owner) report(pageScope, `title duplicates ${owner}: "${title}"`);
      else titleOwners.set(titleKey, pageScope);
    }

    auditInternalLinks(html, pageScope);
  }

  if (errors.length === 0) {
    console.log(`SEO audit passed: ${locations.length} sitemap pages and ${checkedLinks} unique internal page links checked.`);
  }
}

if (errors.length > 0) {
  const unique = [...new Set(errors)].sort();
  console.error(`SEO audit failed with ${unique.length} issue${unique.length === 1 ? '' : 's'}:`);
  for (const error of unique) console.error(`- ${error}`);
  process.exitCode = 1;
}

