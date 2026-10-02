'use strict';
/*
 * Every public URL that has been retired, and where it now lives.
 *
 * Used by server/index.js (301 redirects) and scripts/migrate-retired-links.js
 * (rewrites internal links on disk), so the two cannot disagree.
 *
 *   /countries/*, /cities/*     -> the regional guide that covers them
 *   competitor "-alternative"   -> /alternatives
 *   /languages/<slug>           -> its section of the /languages/ feature
 *   retired /blog/ posts        -> the closest surviving Journal article
 */
const { REGION_OF_COUNTRY, REGION_OF_CITY } = require('../region-pages');

const RETIRED_ALTERNATIVES = [
  'chatspin', 'shagle', 'camsurf', 'chathub', 'azar', 'holla', 'tinychat', 'wakie', 'free4talk',
  'omegle', 'ometv', 'chatroulette', 'monkey-app', 'emerald-chat',
].map((name) => `${name}-alternative`);

const RETIRED_POSTS = {
  'best-omegle-alternatives': 'what-happened-to-omegle',
  'best-random-chat-apps-2026': 'what-happened-to-omegle',
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
// is-talklive-safe answered a product question, so it goes to the product page.
const RETIRED_POST_PAGES = { 'is-talklive-safe': '/safety' };

/*
 * Where a retired path now lives, or null if the path is not retired.
 * Accepts the path with or without a trailing .html or /index.
 */
function retiredTarget(pathname) {
  const p = String(pathname || '').replace(/\.html$/i, '').replace(/\/index$/i, '/');
  let m = /^\/([a-z0-9-]+-alternative)$/i.exec(p);
  if (m && RETIRED_ALTERNATIVES.includes(m[1].toLowerCase())) return '/alternatives';

  m = /^\/(countries|cities)(?:\/([a-z0-9-]*))?\/?$/i.exec(p);
  if (m) {
    const slug = (m[2] || '').toLowerCase();
    const region = m[1].toLowerCase() === 'countries' ? REGION_OF_COUNTRY[slug] : REGION_OF_CITY[slug];
    return region ? `/regions/${region}` : '/regions/';
  }

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

module.exports = { retiredTarget, RETIRED_ALTERNATIVES, RETIRED_POSTS };
