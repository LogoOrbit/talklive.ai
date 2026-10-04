#!/usr/bin/env node
'use strict';
/*
 * Tests for traffic attribution (server/traffic.js): which visits count as
 * arrivals, which source and medium they get, which search terms are read
 * from a referrer - and, end to end against a running server, that arrivals
 * land in the day record the dashboard's Traffic tab reads.
 *
 * Run: node scripts/test-traffic.js
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const { classifyArrival, isRepeatArrival, normalizePath } = require('../server/traffic');

let passed = 0;
let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}\n      ${err.message}`);
  }
}

const OWN = new Set(['talklive.app', 'talklive.xyz']);
const c = (referer, query) => classifyArrival({ referer, ownHosts: OWN, query: query || {} });

(async () => {
  console.log('classifyArrival');
  await test('Google (any country domain) is search, with no term', () => {
    assert.deepStrictEqual(c('https://www.google.com/'), { source: 'Google', medium: 'search', term: '' });
    assert.strictEqual(c('https://www.google.com.pk/').source, 'Google');
    assert.strictEqual(c('android-app://com.google.android.googlequicksearchbox/').source, 'Google');
  });
  await test('engines that pass the query give the term, lowercased', () => {
    assert.strictEqual(c('https://www.bing.com/search?q=Random+Voice+Chat').term, 'random voice chat');
    assert.strictEqual(c('https://yandex.ru/search/?text=talk%20to%20strangers').term, 'talk to strangers');
    assert.strictEqual(c('https://www.baidu.com/s?wd=voice%20chat').term, 'voice chat');
    assert.strictEqual(c('https://search.yahoo.com/search?p=omegle').term, 'omegle');
  });
  await test('own hosts (and www.) are navigation, not arrivals', () => {
    assert.strictEqual(c('https://talklive.app/random-call'), null);
    assert.strictEqual(c('https://www.talklive.app/'), null);
    assert.strictEqual(c('https://talklive.xyz/'), null);
  });
  await test('internal utm tags without a referrer are navigation', () => {
    assert.strictEqual(c('', { utm_source: 'seo' }), null);
    assert.strictEqual(c('', { utm_source: 'blog' }), null);
    assert.strictEqual(c('', { utm_source: 'app' }), null);
  });
  await test('installed app, campaigns, AI and direct', () => {
    assert.strictEqual(c('', { utm_source: 'pwa' }).medium, 'app');
    assert.deepStrictEqual(c('', { utm_source: 'reddit', utm_term: 'Omegle Alternative' }),
      { source: 'Reddit', medium: 'campaign', term: 'omegle alternative' });
    assert.deepStrictEqual(c('', { utm_source: 'chatgpt.com' }), { source: 'ChatGPT', medium: 'ai', term: '' });
    assert.strictEqual(c('https://gemini.google.com/app').source, 'Gemini');
    assert.deepStrictEqual(c(''), { source: 'Direct', medium: 'direct', term: '' });
  });
  await test('social and unknown sites', () => {
    assert.strictEqual(c('https://l.facebook.com/l.php').source, 'Facebook');
    assert.strictEqual(c('https://t.co/abc').source, 'X (Twitter)');
    assert.deepStrictEqual(c('https://www.someblog.example/post'), { source: 'someblog.example', medium: 'referral', term: '' });
  });
  await test('junk terms are dropped', () => {
    assert.strictEqual(c('https://www.bing.com/search?q=' + 'x'.repeat(200)).term, '');
    assert.strictEqual(c('https://www.bing.com/search?q=https%3A%2F%2Fevil.example').term, '');
  });

  console.log('helpers');
  await test('normalizePath folds .html and /index', () => {
    assert.strictEqual(normalizePath('/Random-Call.html'), '/random-call');
    assert.strictEqual(normalizePath('/blog/index'), '/blog/');
    assert.strictEqual(normalizePath('/'), '/');
  });
  await test('a reload within 30 minutes is not a second arrival', () => {
    const t0 = 1e12;
    assert.strictEqual(isRepeatArrival('ip1', '/x', t0), false);
    assert.strictEqual(isRepeatArrival('ip1', '/x', t0 + 60000), true);
    assert.strictEqual(isRepeatArrival('ip1', '/y', t0 + 60000), false);
    assert.strictEqual(isRepeatArrival('ip1', '/x', t0 + 60000 + 31 * 60000), false);
  });

  console.log('end to end');
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-traffic-'));
  const port = 5000 + Math.floor(Math.random() * 900) + 100;
  const server = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, DATABASE_URL: '' },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  const UA = 'Mozilla/5.0 (Linux; Android 13; SM-A135F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36';
  const get = (p, headers) => new Promise((resolve) => {
    http.get({ host: '127.0.0.1', port, path: p, headers: { 'user-agent': UA, accept: 'text/html', ...headers } }, (res) => {
      res.resume(); res.on('end', () => resolve(res.statusCode));
    }).on('error', () => resolve(0));
  });
  try {
    for (let i = 0; i < 60 && (await get('/healthz')) === 0; i++) await new Promise((r) => setTimeout(r, 250));
    await get('/random-voice-chat', { referer: 'https://www.google.com/', 'x-forwarded-for': '203.0.113.1' });
    await get('/random-voice-chat', { referer: 'https://www.google.com/', 'x-forwarded-for': '203.0.113.1' }); // reload
    await get('/random-text-chat', { referer: 'https://www.bing.com/search?q=random+text+chat', 'x-forwarded-for': '203.0.113.2' });
    await get('/', { 'x-forwarded-for': '203.0.113.3' });
    await get('/chat?utm_source=seo', { referer: `http://127.0.0.1:${port}/random-voice-chat`, 'x-forwarded-for': '203.0.113.1' });
    server.kill('SIGTERM');
    await new Promise((r) => server.on('exit', r));
    const doc = JSON.parse(fs.readFileSync(path.join(dataDir, 'owner-data.json'), 'utf8'));
    const day = doc.analytics.days[new Date().toISOString().slice(0, 10)] || {};
    await test('arrivals are recorded by source, landing page and term', () => {
      assert.strictEqual((day.sources || {}).Google, 1, JSON.stringify(day.sources));
      assert.strictEqual(day.sources.Bing, 1);
      assert.strictEqual(day.sources.Direct, 1);
      assert.strictEqual(day.landings['/random-voice-chat'], 1);
      assert.strictEqual(day.searchTerms['random text chat'], 1);
      assert.strictEqual(day.sourcePages['Google → /random-voice-chat'], 1);
      assert.strictEqual(day.mediums.search, 2);
    });
    await test('internal navigation counts as a page view, not an arrival', () => {
      assert.strictEqual(day.pages['/chat'], 1);
      assert.strictEqual(day.landings['/chat'], undefined);
      assert.strictEqual(day.pages['/random-voice-chat'], 2);
    });
  } finally {
    if (server.exitCode === null) server.kill('SIGKILL');
    fs.rmSync(dataDir, { recursive: true, force: true });
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
