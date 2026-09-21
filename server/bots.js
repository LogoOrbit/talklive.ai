'use strict';
/*
 * Is this request a person, or a crawler?
 *
 * Why this file exists: until now every HTML fetch was counted as a "visit"
 * and every distinct IP behind one as a "unique visitor", with no distinction
 * between a human and Googlebot. On a 169-page site that is submitted to
 * Search Console, pinged through IndexNow and linked from a blog, crawler
 * traffic is not a rounding error - it is routinely the majority of HTML
 * requests, and it arrives from hundreds of distinct IPs, so it inflates
 * `uniques` even harder than it inflates `visits`.
 *
 * The practical damage is that the owner's traffic graph moves for reasons
 * that have nothing to do with people. A crawl-budget swing, a fresh sitemap,
 * an SEO tool someone pointed at the domain, or - as happened here - removing
 * 1,098 duplicate internal URLs that Googlebot had been dutifully re-fetching
 * (see scripts/migrate-internal-utm.js), all read on the dashboard as
 * "visitors up" or "visitors down". A number that moves for reasons you cannot
 * act on is worse than no number: it prompts action in response to noise.
 *
 * So: classify, count both, and keep them apart.
 *
 * Deliberately user-agent based and nothing more. Reverse-DNS verification of
 * Googlebot is the rigorous method, but it costs a DNS round trip on the
 * request path and its failure mode - a slow or broken resolver - is to stall
 * page delivery. A crawler that forges a browser UA to evade this is counted
 * as a person, which is exactly what happens today; everything that identifies
 * itself honestly, which is every crawler that matters for SEO, is caught.
 *
 * The bias throughout is against false positives. Miscounting a crawler as a
 * person overstates a number; miscounting a person as a crawler deletes a real
 * visitor from the only record there is of them. That is why no bare "bot"
 * token appears in the list below: CUBOT is a budget Android brand with real
 * market share in India, Pakistan and Nigeria - this site's three biggest
 * audiences - and a naive /bot/ would have quietly erased every one of those
 * visitors from the dashboard.
 */

// Matched against a lowercased UA, so every token here is lowercase. Tokens
// ending in `/` or `(` rely on the shape a real UA has at that point, which is
// what keeps them from matching a device name that merely contains the word.
const BOT_PATTERNS = [
  // --- Search engines ------------------------------------------------------
  // `googlebot` also covers googlebot-image/-news/-video; `google-` covers
  // Google-InspectionTool, Google-Extended, Google-Site-Verification and the
  // Read Aloud / Favicon fetchers.
  'googlebot', 'google-', 'adsbot', 'mediapartners', 'feedfetcher',
  'apis-google', 'storebot-google',
  'bingbot', 'bingpreview', 'msnbot', 'adidxbot',
  'yandex', 'baiduspider', 'duckduckbot', 'duckduckgo-favicons',
  'slurp', 'sogou web spider', 'exabot', 'seznambot', 'yeti/', 'petalbot',
  'coccocbot', 'qwantify', 'mojeekbot', 'gigabot',

  // --- Answer engines / AI crawlers ---------------------------------------
  // A growing share of an SEO site's crawl load, and exactly the traffic an
  // owner is most likely to mistake for new human interest.
  'gptbot', 'oai-searchbot', 'chatgpt-user', 'perplexitybot',
  'perplexity-user', 'claudebot', 'claude-web', 'anthropic-ai',
  'applebot', 'ccbot', 'bytespider', 'amazonbot', 'youbot', 'cohere-ai',
  'diffbot', 'img2dataset', 'omgili', 'timpibot', 'meta-externalagent',
  'ai2bot', 'firecrawl',

  // --- SEO / marketing tools ----------------------------------------------
  // These cost crawl budget and bandwidth and are never a visitor.
  'ahrefsbot', 'semrushbot', 'mj12bot', 'majestic', 'dotbot', 'rogerbot',
  'blexbot', 'seokicks', 'sistrix', 'screaming frog', 'serpstatbot',
  'dataforseo', 'barkrowler', 'zoominfobot', 'linkdexbot', 'awariobot',
  'zgrab', 'domainstatsbot',

  // --- Social unfurlers / link previews ------------------------------------
  // One human share can produce a dozen of these as each platform, messenger
  // and preview cache fetches the page. None of them is a page view.
  //
  // In-app browsers are deliberately absent: a Snapchat or Viber in-app
  // browser puts the app's name in the UA of a request a real person made.
  // Only the fetchers that announce themselves as fetchers are listed.
  'facebookexternalhit', 'facebookcatalog', 'facebookbot', 'meta-external',
  'twitterbot', 'linkedinbot', 'pinterest/', 'redditbot', 'slackbot',
  'slack-imgproxy', 'discordbot', 'telegrambot', 'whatsapp/',
  'skypeuripreview', 'vkshare', 'tumblr/', 'embedly', 'quora link preview',
  'outbrain', 'nuzzel', 'bitlybot', 'flipboard proxy',

  // --- Monitors, validators, archivers, feed readers -----------------------
  'uptimerobot', 'pingdom', 'statuscake', 'site24x7', 'newrelicpinger',
  'better uptime', 'betteruptime', 'hetrixtool', 'datadog', 'gtmetrix',
  'lighthouse', 'pagespeed', 'webpagetest', 'w3c_validator', 'validator.nu',
  'archive.org_bot', 'ia_archiver', 'wayback', 'feedly', 'feedbin',
  'newsblur', 'inoreader', 'rssbot',

  // --- Generic HTTP clients and automation ---------------------------------
  // Never a browser someone is sitting in front of.
  'curl/', 'wget', 'python-requests', 'python-urllib', 'aiohttp', 'httpx',
  'go-http-client', 'java/', 'okhttp', 'apache-httpclient', 'axios/',
  'node-fetch', 'got (', 'guzzlehttp', 'libwww-perl', 'lwp::simple',
  'php/', 'ruby/', 'scrapy', 'httrack', 'puppeteer', 'playwright',
  'headlesschrome', 'phantomjs', 'selenium', 'cypress',
];

// One alternation compiled once. Tokens are escaped so `curl/`, `got (` and
// `java/` can stay written the way they appear in a real UA string.
const NAMED_BOT_RE = new RegExp(
  BOT_PATTERNS.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
);

/*
 * The long tail: crawlers that follow the naming convention without being
 * listed above. Two shapes, both anchored so a device name cannot trip them:
 *
 * 1. `SomethingBot/1.2` - the token immediately followed by a version
 *    separator. This is how essentially every self-identifying crawler is
 *    written, and "cubot_x30" or "CUBOT NOTE 20" match neither.
 * 2. ` bot ` / `(crawler;` - the token standing alone between non-letters,
 *    which is how the wordier ones describe themselves.
 */
const GENERIC_BOT_RE = /(?:bot|crawler|spider|scraper|robot)[\/\-](?:\d|v\d)|(?:^|[^a-z_])(?:bot|crawler|spider|scraper|robot)(?:[^a-z_]|$)/;

function isBotUserAgent(ua) {
  const s = String(ua || '').toLowerCase().trim();
  // A browser always sends a User-Agent, and a real one is never this short.
  // An empty or stub UA is a script that did not bother; the rare privacy tool
  // that strips it is far outnumbered by the scanners that never set it.
  if (s.length < 12) return true;
  return NAMED_BOT_RE.test(s) || GENERIC_BOT_RE.test(s);
}

/*
 * Chrome, Safari and Firefox speculatively fetch pages a person has not asked
 * for and may never see: link prefetch, prerender, and the address bar's
 * "preload on likely navigation". They announce themselves in `Sec-Purpose`
 * (and the older `Purpose` / `X-Moz`) precisely so servers can avoid counting
 * them. A prefetch the person does go on to open sends a second, real request
 * without the header, so ignoring these never loses the visit.
 */
function isPrefetch(headers) {
  const h = headers || {};
  const purpose = String(h['sec-purpose'] || h.purpose || h['x-purpose'] || '').toLowerCase();
  if (purpose.includes('prefetch') || purpose.includes('prerender') || purpose.includes('preview')) return true;
  return String(h['x-moz'] || '').toLowerCase() === 'prefetch';
}

/*
 * The one call sites use: true when this request should be kept out of the
 * human visitor counts. Takes the whole headers object so the prefetch rule
 * and the UA rule live together rather than being re-derived at each caller.
 */
function isNonHumanRequest(headers) {
  return isPrefetch(headers) || isBotUserAgent((headers || {})['user-agent']);
}

/*
 * A coarse label for the crawler, so the dashboard can say *which* crawler's
 * appetite changed rather than only that "bot traffic" moved - the difference
 * between "Google is crawling you less" (act on it) and "an SEO tool ran a
 * site audit on Tuesday" (ignore it). Returns null for anything not
 * recognised as a bot.
 */
const BOT_LABELS = [
  [/googlebot|google-inspectiontool|adsbot|mediapartners|apis-google|storebot-google|feedfetcher/, 'Google'],
  [/bingbot|bingpreview|msnbot|adidxbot/, 'Bing'],
  [/gptbot|oai-searchbot|chatgpt-user/, 'OpenAI'],
  [/claudebot|claude-web|anthropic-ai/, 'Anthropic'],
  [/perplexitybot|perplexity-user/, 'Perplexity'],
  [/applebot/, 'Apple'],
  [/yandex/, 'Yandex'],
  [/baiduspider/, 'Baidu'],
  [/duckduckbot|duckduckgo/, 'DuckDuckGo'],
  [/ahrefsbot|semrushbot|mj12bot|majestic|dotbot|blexbot|serpstatbot|dataforseo|screaming frog|sistrix|rogerbot|seokicks/, 'SEO tools'],
  [/facebookexternalhit|facebookcatalog|facebookbot|meta-external|twitterbot|linkedinbot|pinterest\/|redditbot|slackbot|discordbot|telegrambot|whatsapp\//, 'Social preview'],
  [/uptimerobot|pingdom|statuscake|site24x7|betteruptime|better uptime|hetrixtool|datadog|newrelicpinger/, 'Uptime monitor'],
  [/lighthouse|pagespeed|gtmetrix|webpagetest/, 'Speed test'],
  [/bytespider|amazonbot|ccbot|youbot|cohere-ai|diffbot|ai2bot|timpibot|meta-externalagent|firecrawl|img2dataset|omgili/, 'Other AI'],
  [/archive\.org_bot|ia_archiver|wayback|feedly|feedbin|newsblur|inoreader|rssbot/, 'Archive / feeds'],
  [/curl\/|wget|python-|go-http-client|java\/|okhttp|apache-httpclient|axios\/|node-fetch|got \(|guzzlehttp|libwww-perl|php\/|ruby\/|scrapy|httrack|aiohttp|httpx/, 'Script / HTTP client'],
  [/puppeteer|playwright|headlesschrome|phantomjs|selenium|cypress/, 'Headless browser'],
];

function botLabel(ua) {
  const s = String(ua || '').toLowerCase().trim();
  // Named patterns first, then the catch-alls. The other way round, a short
  // but perfectly identifiable UA - `curl/8.4.0` is ten characters - would be
  // filed as "Unknown client" and lose the one thing it was telling us.
  for (const [re, label] of BOT_LABELS) {
    if (re.test(s)) return label;
  }
  if (!s || s.length < 12) return 'Unknown client';
  return isBotUserAgent(s) ? 'Other bot' : null;
}

module.exports = { isBotUserAgent, isPrefetch, isNonHumanRequest, botLabel };
