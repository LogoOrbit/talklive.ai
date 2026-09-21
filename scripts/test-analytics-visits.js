#!/usr/bin/env node
'use strict';
/*
 * Tests for visitor counting: who counts as a person, and which pages count.
 *
 * Both halves used to be wrong in ways nobody could see from the dashboard -
 * crawlers counted as visitors, and every page below the root counted as
 * nothing at all - so they are pinned here. The false-positive cases in
 * `HUMANS` matter most: a device name misread as a bot deletes a real visitor
 * from the only record of them, and the phones listed are ones this site's
 * biggest audiences actually use.
 *
 * Run: node scripts/test-analytics-visits.js
 */

const assert = require('assert');
const { isBotUserAgent, isPrefetch, isNonHumanRequest, botLabel } = require('../server/bots');
const analytics = require('../server/analytics');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}\n      ${err.message}`);
  }
}

// --- Real browser user agents. Every one of these is a person. ---------------
const HUMANS = [
  // Desktop
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0',
  // Mobile - the shapes that actually show up from India, Pakistan, Bangladesh,
  // Indonesia and Nigeria, which is where this site's traffic comes from.
  'Mozilla/5.0 (Linux; Android 13; SM-A135F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 11; Redmi Note 9 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 12; Infinix X6819) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 10; TECNO KE5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  // The trap: CUBOT is a real budget Android brand. A naive /bot/ match would
  // have silently erased every one of these visitors.
  'Mozilla/5.0 (Linux; Android 12; CUBOT_NOTE_21) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 10; CUBOT NOTE 20) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
  // In-app browsers: a person inside someone else's app is still a person.
  'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36 Instagram 340.0.0.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Snapchat/12.90.0.44',
  'Mozilla/5.0 (Linux; Android 12; RMX3231) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/122.0.0.0 Mobile Safari/537.36 Viber/20.4.0',
  'Mozilla/5.0 (Linux; Android 11; vivo 1904) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/470.0.0.35.109;]',
];

// --- Crawlers, and the label each should report. ----------------------------
const BOTS = [
  ['Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', 'Google'],
  ['Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/W.X.Y.Z Safari/537.36', 'Google'],
  ['Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/W.X.Y.Z Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', 'Google'],
  ['Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)', 'Bing'],
  ['Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)', 'OpenAI'],
  ['Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)', 'Anthropic'],
  ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/W.X.Y.Z Safari/537.36; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot', 'Perplexity'],
  ['Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)', 'SEO tools'],
  ['Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)', 'SEO tools'],
  ['facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)', 'Social preview'],
  ['Twitterbot/1.0', 'Social preview'],
  ['WhatsApp/2.23.20.0 A', 'Social preview'],
  ['Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)', 'Yandex'],
  ['Mozilla/5.0 (compatible; Bytespider; spider-feedback@bytedance.com)', 'Other AI'],
  ['curl/8.4.0', 'Script / HTTP client'],
  ['python-requests/2.31.0', 'Script / HTTP client'],
  ['Go-http-client/2.0', 'Script / HTTP client'],
  ['Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/126.0.0.0 Safari/537.36', 'Headless browser'],
  ['Mozilla/5.0 (compatible; UptimeRobot/2.0; http://www.uptimerobot.com/)', 'Uptime monitor'],
  // The long tail: follows the convention without being on the list.
  ['Mozilla/5.0 (compatible; SomeNewIndexerBot/1.4; +http://example.com/bot)', 'Other bot'],
  ['SomeNewIndexerBot/1.4', 'Other bot'],
];

console.log('\nBot classification');
test('every real browser user agent is treated as a person', () => {
  for (const ua of HUMANS) {
    assert.strictEqual(isBotUserAgent(ua), false, `misread as a bot: ${ua}`);
    assert.strictEqual(botLabel(ua), null, `got a bot label for: ${ua}`);
  }
});

test('every crawler is caught and labelled', () => {
  for (const [ua, label] of BOTS) {
    assert.strictEqual(isBotUserAgent(ua), true, `missed: ${ua}`);
    assert.strictEqual(botLabel(ua), label, `${ua}\n      expected ${label}, got ${botLabel(ua)}`);
  }
});

test('a missing or stub user agent counts as non-human', () => {
  assert.strictEqual(isBotUserAgent(''), true);
  assert.strictEqual(isBotUserAgent(undefined), true);
  assert.strictEqual(isBotUserAgent('-'), true);
  assert.strictEqual(botLabel(''), 'Unknown client');
});

console.log('\nSpeculative navigation');
test('prefetch and prerender headers are not visits', () => {
  assert.strictEqual(isPrefetch({ 'sec-purpose': 'prefetch;anonymous-client-ip' }), true);
  assert.strictEqual(isPrefetch({ 'sec-purpose': 'prefetch;prerender' }), true);
  assert.strictEqual(isPrefetch({ purpose: 'prefetch' }), true);
  assert.strictEqual(isPrefetch({ 'x-moz': 'prefetch' }), true);
  assert.strictEqual(isPrefetch({}), false);
  assert.strictEqual(isPrefetch({ 'user-agent': HUMANS[0] }), false);
});

test('a real navigation by a real browser is a visit', () => {
  assert.strictEqual(isNonHumanRequest({ 'user-agent': HUMANS[0] }), false);
  assert.strictEqual(isNonHumanRequest({ 'user-agent': HUMANS[0], 'sec-purpose': 'prefetch' }), true);
  assert.strictEqual(isNonHumanRequest({ 'user-agent': BOTS[0][0] }), true);
});

// --- Which URLs are countable page views ------------------------------------
//
// The old rule was `path === '/' || /^\/[a-z0-9-]+$/`, which excluded every
// page below the root - roughly three quarters of the indexed site. These are
// the paths that must count now, taken from the real sitemap.
console.log('\nPage coverage');

const LOCALE_SECTION_RE = /^\/(ar|bn|de|es|fa|fr|hi|id|it|ja|ko|pt|ru|tr|ur|zh)(\/|$)/;
function pageSection(pathname) {
  if (pathname === '/' || pathname === '/landing') return 'home';
  if (LOCALE_SECTION_RE.test(pathname)) return 'localized home';
  if (pathname.startsWith('/blog')) return 'blog';
  if (pathname.startsWith('/countries')) return 'country pages';
  if (pathname.startsWith('/cities')) return 'city pages';
  if (pathname.startsWith('/languages')) return 'language pages';
  if (pathname.startsWith('/guides')) return 'guides';
  if (pathname === '/chat' || pathname === '/call' || pathname === '/settings') return 'app';
  return 'landing pages';
}

const OLD_RULE = (p) => p === '/' || /^\/[a-z0-9-]+$/i.test(p);

test('pages the old rule dropped are now attributed to a section', () => {
  const cases = [
    ['/blog/', 'blog'],
    ['/blog/how-to-make-friends-online', 'blog'],
    ['/countries/india', 'country pages'],
    ['/countries/', 'country pages'],
    ['/languages/spanish', 'language pages'],
    ['/cities/karachi', 'city pages'],
    ['/guides/voice-chat', 'guides'],
    ['/hi/', 'localized home'],
    ['/ur/', 'localized home'],
    ['/es/', 'localized home'],
  ];
  for (const [p, section] of cases) {
    assert.strictEqual(OLD_RULE(p), false, `${p} was already counted - this case no longer proves anything`);
    assert.strictEqual(pageSection(p), section, `${p} -> ${pageSection(p)}, expected ${section}`);
  }
});

test('root-level pages keep the section they always deserved', () => {
  assert.strictEqual(pageSection('/'), 'home');
  assert.strictEqual(pageSection('/landing'), 'home');
  assert.strictEqual(pageSection('/talk-to-strangers'), 'landing pages');
  assert.strictEqual(pageSection('/omegle-alternative'), 'landing pages');
  assert.strictEqual(pageSection('/chat'), 'app');
  assert.strictEqual(pageSection('/call'), 'app');
  assert.strictEqual(pageSection('/settings'), 'app');
});

test('the asset fast-path skips assets and no real page', () => {
  // Mirrors ASSET_PATH_RE in server/index.js. It runs before anything else on
  // every GET, so a page wrongly matched here is never counted at all.
  const ASSET_PATH_RE = /\.(?!html?$)[a-z0-9]{1,12}$/i;
  const pages = ['/', '/blog/', '/blog/how-to-make-friends-online', '/countries/india',
    '/languages/spanish', '/cities/karachi', '/hi/', '/ur/', '/talk-to-strangers',
    '/chat', '/call', '/settings', '/talk-to-strangers.html'];
  const assets = ['/style.css', '/app.js', '/favicon.svg', '/sitemap.xml', '/og-image.png',
    '/robots.txt', '/site.webmanifest', '/favicon-192.png', '/blog/feed.xml'];
  for (const p of pages) assert.strictEqual(ASSET_PATH_RE.test(p), false, `page treated as an asset: ${p}`);
  for (const p of assets) assert.strictEqual(ASSET_PATH_RE.test(p), true, `asset not skipped: ${p}`);

  // The guard's safety rests on this: no HTML page slug contains a dot.
  const fs = require('fs');
  const path = require('path');
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
  const dotted = walk(path.join(__dirname, '..', 'public'))
    .filter((f) => f.endsWith('.html'))
    .map((f) => path.basename(f, '.html'))
    .filter((slug) => slug.includes('.'));
  assert.deepStrictEqual(dotted, [], 'a page slug now contains a dot; the asset guard would drop it');
});

test('a locale code is only a locale at the start of the path', () => {
  // /id is Indonesian, but /identity-check would not be.
  assert.strictEqual(pageSection('/id'), 'localized home');
  assert.strictEqual(pageSection('/identity-check'), 'landing pages');
  assert.strictEqual(pageSection('/italy-chat'), 'landing pages');
});

// --- The report still balances with the new counter in it -------------------
console.log('\nReport folding');
test('crawler hits fold into local days like every other metric', () => {
  assert.ok(analytics.HOUR_METRICS.includes('bots'), 'bots must be an hour metric to be timezone-cut');
  const days = {
    '2026-09-20': {
      visits: 10, uniques: 6, bots: 40, connections: 4, matches: 2, messages: 9,
      reports: 0, errors: 0, newAccounts: 0, peakOnline: 5,
      hours: {
        2: { visits: 4, uniques: 3, bots: 25, connections: 2, matches: 1, messages: 4, peakOnline: 3 },
        18: { visits: 6, uniques: 3, bots: 15, connections: 2, matches: 1, messages: 5, peakOnline: 5 },
      },
    },
  };
  // Karachi is UTC+05:00, so 02:00 UTC is the same local day and 18:00 UTC is
  // 23:00 local - both land on 2026-09-20.
  const local = analytics.foldToLocalDays(days, 'Asia/Karachi');
  const d = local.get('2026-09-20');
  assert.strictEqual(d.visits, 10);
  assert.strictEqual(d.bots, 40, 'crawler hits must survive the timezone re-cut');
  assert.strictEqual(d.hours[7].bots, 25, '02:00 UTC is 07:00 in Karachi');
  assert.strictEqual(d.hours[23].bots, 15, '18:00 UTC is 23:00 in Karachi');

  const report = analytics.buildReport(days, 'Asia/Karachi', Date.UTC(2026, 8, 21, 16, 39));
  assert.strictEqual(report.yesterday.bots, 40);
  assert.strictEqual(report.yesterday.visits, 10);
  assert.ok('bots' in report.yesterdaySoFar, 'the like-for-like window must carry bots too');
});

test('a day with no bot counter reads as zero rather than NaN', () => {
  // Every day recorded before this change has no `bots` field at all.
  const legacy = {
    '2026-09-01': {
      visits: 100, uniques: 50, connections: 10, matches: 5, messages: 20,
      reports: 0, errors: 0, newAccounts: 0, peakOnline: 8,
      hours: { 12: { visits: 100, uniques: 50, connections: 10, matches: 5, messages: 20, peakOnline: 8 } },
    },
  };
  const report = analytics.buildReport(legacy, 'UTC', Date.UTC(2026, 8, 2, 12, 0));
  assert.strictEqual(report.yesterday.bots, 0);
  assert.strictEqual(report.last7.bots, 0);
  assert.ok(Number.isFinite(report.last7.bots));
});

// --- The words the owner actually reads -------------------------------------
//
// The dashboard's summary is where a number becomes a conclusion, and the
// conclusion that prompted this whole change ("Unique visitors are down 12%
// week-over-week") was drawn across a definition change. These pin that it
// cannot happen again.
console.log('\nDashboard summary');

const store = require('../server/store');
const { generateConclusion } = require('../server/admin');

// 21 days ending 2026-09-21. `humanSince` splits them: before it, visits are
// humans+bots together; after it, humans only with bots counted separately.
function fixture(humanSince) {
  const days = {};
  for (let i = 0; i < 21; i++) {
    const k = new Date(Date.UTC(2026, 8, 1) + i * 86400000).toISOString().slice(0, 10);
    const split = humanSince && k >= humanSince;
    days[k] = {
      visits: split ? 60 : 200, uniques: split ? 40 : 120, bots: split ? 300 : 0,
      connections: 20, matches: 3, messages: 50, reports: 2, feedback: 0,
      errors: 1, newAccounts: 1, peakOnline: 12,
      countries: { India: 50 }, cities: { Delhi: 10 }, features: { chat_message: 40 },
      crawlers: split ? { Google: 200, 'SEO tools': 60, OpenAI: 40 } : {},
      sections: { home: 20, blog: 15, 'country pages': 10, 'landing pages': 15 },
      hours: {
        12: {
          visits: split ? 60 : 200, uniques: split ? 40 : 120, bots: split ? 300 : 0,
          connections: 20, matches: 3, messages: 50, peakOnline: 12,
        },
      },
    };
  }
  return days;
}

const NOW = Date.UTC(2026, 8, 21, 16, 39);
const RUNTIME = { online: 7, inCall: 0, waiting: 1, uptimeSeconds: 3600, memoryMB: 240 };

function summaryFor(humanSince) {
  store.data.analytics.days = fixture(humanSince);
  store.data.analytics.humanSince = humanSince;
  const report = analytics.buildReport(store.data.analytics.days, 'Asia/Karachi', NOW);
  return generateConclusion(RUNTIME, report).summary.join('\n');
}

test('a week straddling the change is not reported as a collapse in traffic', () => {
  // 2026-09-15 is inside the previous 7-day window, so the two weeks are not
  // like-for-like: one counts bots as people and the other does not.
  const text = summaryFor('2026-09-15');
  assert.ok(!/Traffic is declining/.test(text), 'claimed a decline across a definition change:\n' + text);
  assert.ok(/exclude search-engine crawlers/.test(text), 'did not explain the change:\n' + text);
  assert.ok(!/Unique visitors are (up|down)/.test(text), 'compared uniques across the change:\n' + text);
  assert.ok(/unique human visitors in the last 7 days/.test(text), 'did not state the human number:\n' + text);
});

test('once both weeks are measured the same way, trends are reported again', () => {
  // Counted the new way for the whole window, so a comparison is honest.
  const text = summaryFor('2026-09-01');
  assert.ok(/Traffic is stable|Traffic is growing|Traffic is declining/.test(text), 'stopped reporting a trend:\n' + text);
  assert.ok(/Unique visitors are (up|down)/.test(text), 'stopped reporting uniques:\n' + text);
});

test('crawler volume is reported as crawlers, never as audience', () => {
  const text = summaryFor('2026-09-01');
  assert.ok(/Crawlers and bots made \d+ page requests/.test(text), 'no crawler line:\n' + text);
  assert.ok(/never as visitors/.test(text), 'did not say crawlers are excluded:\n' + text);
  assert.ok(/Google \(\d+\)/.test(text), 'did not name the busiest crawler:\n' + text);
});

test('the summary says which part of the site people landed on', () => {
  const text = summaryFor('2026-09-01');
  assert.ok(/Where people landed this week/.test(text), 'no section breakdown:\n' + text);
  assert.ok(/blog \(\d+\)/.test(text), 'the blog is still invisible:\n' + text);
});

test('a site with no bot data yet reads exactly as it did before', () => {
  const text = summaryFor(null);
  assert.ok(/Traffic is stable/.test(text), 'lost the trend line on legacy data:\n' + text);
  assert.ok(!/Crawlers and bots/.test(text), 'invented a crawler line with no crawler data:\n' + text);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
