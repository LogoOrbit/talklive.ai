'use strict';
/*
 * Every public URL that has been retired, and where it now lives.
 *
 * Used by server/index.js (301 redirects) and scripts/migrate-retired-links.js
 * (rewrites internal links on disk), so the two cannot disagree.
 *
 *   /countries/*, /cities/*     -> the regional feature that covers them,
 *                                  or /languages/ where none does
 *   /regions/ hub, two regions  -> /blog/ and /languages/
 *   competitor "-alternative"   -> /voice-chat-vs-video-chat
 *   /languages/<slug>           -> its section of the /languages/ feature
 *   retired /blog/ posts        -> the closest surviving Journal article
 *   keyword-variant landings    -> the one page that covers the topic
 *
 * Restored in October 2026 (no longer retired): /talk-to-strangers,
 * /anonymous-chat, /random-call, /talk-to-someone, /omegle-alternative and
 * the eight country guides in scripts/countries/. Retired URLs on the
 * same topic now point at them instead of at a broader page.
 */
const { COUNTRIES } = require('./geo');
const { SLUGS: COUNTRY_SLUGS } = require('../countries');

// Countries covered by one of the three regional features. Every other
// country (and every city in it) points at the /languages/ feature.
const FEATURED = {
  'south-asia': ['india', 'pakistan', 'bangladesh'],
  europe: ['united-kingdom', 'ireland', 'portugal', 'spain', 'france', 'netherlands', 'germany', 'italy', 'sweden', 'norway', 'poland', 'greece', 'romania', 'ukraine', 'turkey', 'russia'],
  americas: ['united-states', 'canada', 'mexico', 'brazil', 'colombia', 'argentina'],
};
const REGION_OF_COUNTRY = {};
for (const [region, list] of Object.entries(FEATURED)) for (const c of list) REGION_OF_COUNTRY[c] = region;
const REGION_OF_CITY = {};
const COUNTRY_OF_CITY = {};
for (const c of COUNTRIES) {
  for (const city of c.cities) {
    REGION_OF_CITY[city.slug] = REGION_OF_COUNTRY[c.slug];
    COUNTRY_OF_CITY[city.slug] = c.slug;
  }
}
const RETIRED_REGIONS = { 'asia-pacific': '/languages/', 'middle-east-africa': '/languages/' };

// Competitor pages, all retired except /omegle-alternative. Omegle's two
// closest relatives (same format, same audience) point at it; the rest at the
// voice-vs-video comparison.
const RETIRED_ALTERNATIVES = [
  'chatspin', 'shagle', 'camsurf', 'chathub', 'azar', 'holla', 'tinychat', 'wakie', 'free4talk',
  'ometv', 'chatroulette', 'monkey-app', 'emerald-chat',
].map((name) => `${name}-alternative`);
const OMEGLE_LIKE = new Set(['ometv-alternative', 'chatroulette-alternative']);

const RETIRED_POSTS = {
  'what-happened-to-chatroulette': 'what-happened-to-omegle',
  'best-time-to-use-random-chat': 'how-random-matchmaking-works',
  'how-anonymous-voice-chat-works': 'how-random-matchmaking-works',
  'how-much-data-does-voice-chat-use': 'how-random-matchmaking-works',
  'why-chat-sites-ask-for-microphone-access': 'how-random-matchmaking-works',
  'first-conversation-mistakes': 'what-to-talk-about-with-a-stranger',
  'getting-skipped-in-random-chat': 'what-to-talk-about-with-a-stranger',
  'how-to-start-a-conversation-with-a-stranger': 'what-to-talk-about-with-a-stranger',
  'how-to-end-a-conversation-politely': 'how-to-be-a-good-listener',
  'how-to-make-friends-online': 'loneliness-what-actually-helps',
  'someone-to-talk-to-at-3am': 'loneliness-what-actually-helps',
  'how-to-sound-good-on-a-voice-call': 'phone-anxiety-how-to-get-comfortable-talking',
  'is-random-chat-legal-and-safe-for-adults': 'how-to-spot-a-bot-or-scam-in-random-chat',
  'is-random-voice-chat-safe-for-women': 'how-to-spot-a-bot-or-scam-in-random-chat',
  'random-chat-safety-tips': 'how-to-spot-a-bot-or-scam-in-random-chat',
  'practice-english-speaking-online-free': 'how-to-practise-a-language-by-speaking',
  'talking-to-strangers-in-another-language': 'how-to-practise-a-language-by-speaking',
  'psychological-benefits-of-talking-to-strangers': 'science-of-talking-to-strangers',
  'random-chat-without-a-camera': 'why-talking-to-strangers-feels-easier',
  'voice-chat-vs-text-chat': 'why-talking-to-strangers-feels-easier',
  'voice-chat-vs-video-chat': 'why-talking-to-strangers-feels-easier',
};
// Landing pages that targeted a keyword variant of a page that already exists
// ("free voice chat" vs "random voice chat"), or promised features TalkLive
// does not have (video, chat rooms). Thin near-duplicates and misleading
// titles are what get a site rejected as low-value content, so each one now
// 301s to the single page that honestly covers the topic.
const RETIRED_PAGES = {
  'random-video-chat': '/voice-chat-vs-video-chat',
  'random-video-call': '/voice-chat-vs-video-chat',
  'stranger-video-call': '/voice-chat-vs-video-chat',
  'text-chat-with-strangers': '/random-text-chat',
  'free-voice-chat': '/random-voice-chat',
  'voice-chat-rooms': '/random-voice-chat',
  'online-chat-rooms': '/random-text-chat',
  'call-random-people': '/random-call',
  'free-online-calls': '/random-call',
  'international-calls': '/random-call',
  'random-chat': '/talk-to-strangers',
  'meet-new-people': '/make-friends-online',
  'someone-to-talk-to': '/talk-to-someone',
  'im-bored': '/random-voice-chat',
  'cant-sleep': '/late-night-chat',
  'chat-without-registration': '/anonymous-chat',
  'pakistani-chat': '/countries/pakistan',
  'omegle-vs-chatroulette': '/omegle-alternative',
  // A comparison list of other apps; the Omegle page is the one that answers it.
  'alternatives': '/omegle-alternative',
  // A hand-kept list of article titles that had since been retired, several
  // pointing at one post under a headline it does not carry. The Journal
  // index is the maintained list.
  'guides': '/blog/',
};

// Posts that answered a product question go to the product page.
const RETIRED_POST_PAGES = {
  'is-talklive-safe': '/safety',
  'best-omegle-alternatives': '/omegle-alternative',
  'best-random-chat-apps-2026': '/omegle-alternative',
};

/*
 * Where a retired path now lives, or null if the path is not retired.
 * Accepts the path with or without a trailing .html or /index.
 */
function retiredTarget(pathname) {
  const p = String(pathname || '').replace(/\.html$/i, '').replace(/\/index$/i, '/');
  let m = /^\/([a-z0-9-]+)\/?$/i.exec(p);
  if (m && RETIRED_PAGES[m[1].toLowerCase()]) return RETIRED_PAGES[m[1].toLowerCase()];

  m = /^\/([a-z0-9-]+-alternative)$/i.exec(p);
  if (m && RETIRED_ALTERNATIVES.includes(m[1].toLowerCase())) {
    return OMEGLE_LIKE.has(m[1].toLowerCase()) ? '/omegle-alternative' : '/voice-chat-vs-video-chat';
  }

  m = /^\/(countries|cities)(?:\/([a-z0-9-]*))?\/?$/i.exec(p);
  if (m) {
    const kind = m[1].toLowerCase();
    const slug = (m[2] || '').toLowerCase();
    // A restored country guide is live, not retired: only its trailing-slash
    // spelling redirects, to the canonical URL.
    if (kind === 'countries' && COUNTRY_SLUGS.includes(slug)) {
      return /\/$/.test(p) ? `/countries/${slug}` : null;
    }
    if (!slug) return '/country-chat-guide';
    const country = kind === 'countries' ? slug : COUNTRY_OF_CITY[slug];
    if (COUNTRY_SLUGS.includes(country)) return `/countries/${country}`;
    const region = kind === 'countries' ? REGION_OF_COUNTRY[slug] : REGION_OF_CITY[slug];
    return region ? `/regions/${region}` : '/languages/';
  }

  // The /regions/ hub and two of the five regional pages were retired.
  if (/^\/regions\/?$/i.test(p)) return '/blog/';
  m = /^\/regions\/([a-z0-9-]+)\/?$/i.exec(p);
  if (m && RETIRED_REGIONS[m[1].toLowerCase()]) return RETIRED_REGIONS[m[1].toLowerCase()];

  m = /^\/languages\/([a-z0-9-]+)\/?$/i.exec(p);
  if (m) return `/languages/#${m[1].toLowerCase()}`;
  if (/^\/languages$/i.test(p)) return '/languages/';

  m = /^\/blog\/([a-z0-9-]+)\/?$/i.exec(p);
  if (m) {
    const slug = m[1].toLowerCase();
    if (RETIRED_POST_PAGES[slug]) return RETIRED_POST_PAGES[slug];
    if (RETIRED_POSTS[slug]) return `/blog/${RETIRED_POSTS[slug]}`;
  }
  return null;
}

module.exports = { retiredTarget, RETIRED_ALTERNATIVES, RETIRED_POSTS, RETIRED_PAGES };
