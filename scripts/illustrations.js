// Which illustration each generated page carries. The art lives in
// public/illustrations/ (unDraw, recolored by scripts/recolor-illustrations.js).
// build-seo.js asks for a page's art by slug; anything not listed falls back
// by path prefix, then to a general "talking" picture.

const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'public', 'illustrations');

// Intrinsic sizes from each file's viewBox, so every <img> reserves its box
// and the page does not shift when the art arrives.
const SIZES = {};
for (const file of fs.readdirSync(DIR)) {
  if (!file.endsWith('.svg')) continue;
  const m = fs.readFileSync(path.join(DIR, file), 'utf8').match(/viewBox="[\d.-]+[ ,]+[\d.-]+[ ,]+([\d.]+)[ ,]+([\d.]+)"/);
  if (m) SIZES[file.slice(0, -4)] = [Math.round(+m[1]), Math.round(+m[2])];
}

const PAGE_ART = {
  'talk-to-strangers': 'audio-conversation',
  'random-voice-chat': 'talking-on-the-phone',
  'random-text-chat': 'chatting',
  'text-chat-with-strangers': 'online-chat',
  'random-video-chat': 'video-call',
  'random-video-call': 'video-call',
  'stranger-video-call': 'video-call',
  'voice-chat-vs-video-chat': 'video-call',
  'random-call': 'phone-call',
  'call-random-people': 'calling',
  'free-online-calls': 'calling',
  'free-voice-chat': 'conversation',
  'international-calls': 'around-the-world',
  'random-chat': 'quick-chat',
  'anonymous-chat': 'anonymous-feedback',
  'chat-without-registration': 'mobile-app',
  'online-chat-rooms': 'group-chat',
  'voice-chat-rooms': 'online-community',
  'meet-new-people': 'nice-to-meet-you',
  'make-friends-online': 'true-friends',
  'talk-to-someone': 'casual-chat',
  'someone-to-talk-to': 'in-thought',
  'late-night-chat': 'late-at-night',
  'cant-sleep': 'moonlight',
  'im-bored': 'video-games',
  'language-exchange': 'online-learning',
  'practice-english-speaking': 'learning',
  'pakistani-chat': 'connected-world',
  'country-chat-guide': 'world',
  'language-chat-guide': 'continuous-learning',
  'safety': 'security',
  'how-it-works': 'connection',
  'resources': 'reading',
  'alternatives': 'people-search',
  'omegle-vs-chatroulette': 'thoughts',
  'guides/': 'reading',
  'countries/': 'world',
  'cities/': 'city-life',
  'languages/': 'continuous-learning',
};

// Families of templated pages rotate through a few pictures so neighbouring
// pages do not all look identical.
const FAMILIES = {
  'countries/': ['around-the-world', 'world', 'connected-world', 'travel-everywhere', 'travelers'],
  'cities/': ['walk-in-the-city', 'city-life', 'tourist-map', 'travelers'],
  'languages/': ['conversation', 'learning', 'online-learning', 'podcast-listener', 'around-the-world'],
};
const ALTERNATIVE_ART = ['people-search', 'searching', 'walking-together', 'unexpected-friends', 'everywhere-together', 'social-interaction'];

const BLOG_ART = {
  'best-omegle-alternatives': 'people-search',
  'best-random-chat-apps-2026': 'mobile-app',
  'best-time-to-use-random-chat': 'late-at-night',
  'first-conversation-mistakes': 'random-thoughts',
  'getting-skipped-in-random-chat': 'wandering-mind',
  'how-anonymous-voice-chat-works': 'secure-server',
  'how-much-data-does-voice-chat-use': 'no-signal',
  'how-random-matchmaking-works': 'connection',
  'how-to-be-a-good-listener': 'listening',
  'how-to-end-a-conversation-politely': 'walking-together',
  'how-to-make-friends-online': 'add-friends',
  'how-to-practise-a-language-by-speaking': 'online-learning',
  'how-to-sound-good-on-a-voice-call': 'podcast-listener',
  'how-to-spot-a-bot-or-scam-in-random-chat': 'safe',
  'how-to-start-a-conversation-with-a-stranger': 'nice-to-meet-you',
  'is-random-chat-legal-and-safe-for-adults': 'document-ready',
  'is-random-voice-chat-safe-for-women': 'secure-login',
  'is-talklive-safe': 'security',
  'loneliness-what-actually-helps': 'a-moment-to-relax',
  'phone-anxiety-how-to-get-comfortable-talking': 'phone-call',
  'practice-english-speaking-online-free': 'learning',
  'psychological-benefits-of-talking-to-strangers': 'feeling-happy',
  'random-chat-safety-tips': 'mobile-encryption',
  'random-chat-without-a-camera': 'talking-on-the-phone',
  'science-of-talking-to-strangers': 'in-thought',
  'someone-to-talk-to-at-3am': 'night-calls',
  'talking-to-strangers-in-another-language': 'around-the-world',
  'voice-chat-vs-text-chat': 'text-messages',
  'voice-chat-vs-video-chat': 'video-call',
  'what-happened-to-chatroulette': 'thoughts',
  'what-happened-to-omegle': 'going-offline',
  'what-to-talk-about-with-a-stranger': 'conversation',
  'why-chat-sites-ask-for-microphone-access': 'audio-conversation',
  'why-talking-to-strangers-feels-easier': 'unexpected-friends',
};
const TAG_ART = {
  Conversation: 'conversation',
  Guides: 'reading',
  'Language Learning': 'online-learning',
  Languages: 'around-the-world',
  Opinion: 'thoughts',
  Privacy: 'secure-login',
  Psychology: 'in-thought',
  Safety: 'security',
  Technical: 'secure-server',
  Technology: 'connection',
  'Trust & Safety': 'safe',
  Wellbeing: 'mindfulness',
};

function hash(s) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

function pageArt(slug) {
  if (PAGE_ART[slug]) return PAGE_ART[slug];
  for (const prefix of Object.keys(FAMILIES)) {
    if (slug.startsWith(prefix)) {
      const list = FAMILIES[prefix];
      return list[hash(slug) % list.length];
    }
  }
  if (/-alternative$/.test(slug)) return ALTERNATIVE_ART[hash(slug) % ALTERNATIVE_ART.length];
  return 'audio-conversation';
}

function blogArt(post) {
  return BLOG_ART[post.slug] || TAG_ART[post.tag] || 'conversation';
}

// <img> for one illustration. Decorative by default (alt=""): the art sits
// next to a heading that already says what the section is about.
function artImg(name, { cls = 'art', alt = '', eager = false } = {}) {
  if (!SIZES[name]) throw new Error(`Unknown illustration: ${name}`);
  const [w, h] = SIZES[name];
  const load = eager ? '' : ' loading="lazy"';
  return `<img class="${cls}" src="/illustrations/${name}.svg" width="${w}" height="${h}" alt="${alt}"${load} decoding="async" />`;
}

module.exports = { pageArt, blogArt, artImg };
