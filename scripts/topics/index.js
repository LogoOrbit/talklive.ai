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

function asideFor(slug) {
  const items = TOPICS.filter((t) => t.slug !== slug)
    .map((t) => `<li><a href="/${t.slug}">${S.esc(t.name)}</a></li>`).join('');
  return `<aside class="c-guides" aria-label="Other guides"><h2>More guides</h2><ul>${items}</ul></aside>`;
}

function build() {
  for (const t of TOPICS) S.write(`${t.slug}.html`, render({ ...t, path: `/${t.slug}`, crumbs: [] }, asideFor(t.slug)));
  return TOPICS.length;
}

module.exports = { build, TOPICS, SLUGS };
