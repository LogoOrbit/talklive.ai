'use strict';
/*
 * Every landing page and hub outside the Journal and the country guides:
 * /talk-to-strangers, /random-voice-chat, /random-text-chat, /safety,
 * /how-it-works and the rest listed in SLUGS.
 *
 * Like the country guides, each is written and designed on its own (its own
 * concept, layout, palette and type) rather than poured into the landing-page
 * template, and each answers a different question so none is a keyword
 * variant of another. They share the country guides' renderer
 * (scripts/countries/index.js): head, structured data, site bar, FAQ and
 * footer.
 *
 * AdSense: one ad slot at most, always below substantial content. Pages with
 * `noAds` carry no ad code at all: /talk-to-someone (beside crisis-line
 * information) and the navigation hubs (resources, languages, countries),
 * since ads are not allowed on screens used mainly for navigation.
 */
const S = require('../journal/shared');
const { render } = require('../countries');

const SLUGS = [
  'talk-to-strangers', 'random-voice-chat', 'random-text-chat', 'anonymous-chat', 'random-call',
  'talk-to-someone', 'late-night-chat', 'make-friends-online', 'practice-english-speaking',
  'language-exchange', 'voice-chat-vs-video-chat', 'omegle-alternative',
  'how-it-works', 'safety', 'language-chat-guide', 'country-chat-guide', 'resources',
];
const TOPICS = SLUGS.map((slug) => require(`./${slug}`));

// Journal pieces that go deeper on each guide's question. Contextual links
// from the guides that already rank are how new articles get found.
const READING = {
  'talk-to-strangers': ['science-of-talking-to-strangers', 'how-to-end-a-conversation', 'introvert-guide-to-talking-to-strangers'],
  'random-voice-chat': ['why-a-call-beats-texting', 'phone-anxiety-how-to-get-comfortable-talking'],
  'random-text-chat': ['why-a-call-beats-texting', 'how-to-spot-a-bot-or-scam-in-random-chat'],
  'random-call': ['why-a-call-beats-texting', 'phone-anxiety-how-to-get-comfortable-talking'],
  'anonymous-chat': ['why-talking-to-strangers-feels-easier', 'how-to-spot-a-bot-or-scam-in-random-chat'],
  'talk-to-someone': ['loneliness-what-actually-helps', 'why-am-i-so-bored', 'lonely-after-moving-abroad'],
  'late-night-chat': ['why-am-i-so-bored', 'loneliness-what-actually-helps'],
  'make-friends-online': ['lonely-after-moving-abroad', 'introvert-guide-to-talking-to-strangers', 'what-to-talk-about-with-a-stranger'],
  'practice-english-speaking': ['how-to-practise-a-language-by-speaking', 'small-talk-around-the-world'],
  'language-exchange': ['small-talk-around-the-world', 'how-to-practise-a-language-by-speaking'],
  'language-chat-guide': ['small-talk-around-the-world', 'how-to-practise-a-language-by-speaking'],
  'country-chat-guide': ['small-talk-around-the-world', 'lonely-after-moving-abroad'],
  'omegle-alternative': ['what-happened-to-omegle', 'how-to-spot-a-bot-or-scam-in-random-chat'],
  'voice-chat-vs-video-chat': ['why-a-call-beats-texting', 'phone-anxiety-how-to-get-comfortable-talking'],
  'safety': ['how-to-spot-a-bot-or-scam-in-random-chat', 'how-to-end-a-conversation'],
  'how-it-works': ['how-random-matchmaking-works', 'how-to-end-a-conversation'],
};

function readingFor(slug) {
  const { ARTICLES } = require('../journal');
  const picks = (READING[slug] || []).map((s) => ARTICLES.find((a) => a.slug === s)).filter(Boolean);
  if (!picks.length) return '';
  return `<aside class="c-guides" aria-label="From the Journal"><h2>Read more in the Journal</h2><ul>${picks
    .map((a) => `<li><a href="/blog/${a.slug}">${S.esc(a.h1)}</a></li>`).join('')}</ul></aside>`;
}

function asideFor(slug) {
  const items = TOPICS.filter((t) => t.slug !== slug)
    .map((t) => `<li><a href="/${t.slug}">${S.esc(t.name)}</a></li>`).join('');
  return `${readingFor(slug)}<aside class="c-guides" aria-label="Other guides"><h2>More guides</h2><ul>${items}</ul></aside>`;
}

function build() {
  for (const t of TOPICS) S.write(`${t.slug}.html`, render({ ...t, path: `/${t.slug}`, crumbs: [] }, asideFor(t.slug)));
  return TOPICS.length;
}

module.exports = { build, TOPICS, SLUGS };
