'use strict';
/*
 * The five topic guides restored in October 2026 - /talk-to-strangers,
 * /anonymous-chat, /random-call, /talk-to-someone and /omegle-alternative.
 *
 * Like the country guides, each is written and designed on its own (its own
 * concept, layout, palette and type) rather than poured into the landing-page
 * template, and each answers a different question so none is a keyword
 * variant of another. They share the country guides' renderer
 * (scripts/countries/index.js): head, structured data, site bar, FAQ and
 * footer.
 *
 * AdSense: one ad slot at most, always below substantial content, and none at
 * all on /talk-to-someone, which sits beside crisis-line information.
 */
const S = require('../journal/shared');
const { render } = require('../countries');

const SLUGS = ['talk-to-strangers', 'anonymous-chat', 'random-call', 'talk-to-someone', 'omegle-alternative'];
const TOPICS = SLUGS.map((slug) => require(`./${slug}`));

function asideFor(slug) {
  const items = TOPICS.filter((t) => t.slug !== slug)
    .map((t) => `<li><a href="/${t.slug}">${S.esc(t.name)}</a></li>`).join('');
  return `<aside class="c-guides" aria-label="Other guides"><h2>More guides</h2><ul>${items}<li><a href="/country-chat-guide">Guides by country</a></li><li><a href="/safety">Safety Center</a></li></ul></aside>`;
}

function build() {
  for (const t of TOPICS) S.write(`${t.slug}.html`, render({ ...t, path: `/${t.slug}`, crumbs: [] }, asideFor(t.slug)));
  return TOPICS.length;
}

module.exports = { build, TOPICS, SLUGS };
