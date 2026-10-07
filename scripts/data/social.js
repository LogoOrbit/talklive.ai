'use strict';
/*
 * TalkLive's own social profiles - the single source for the Organization
 * `sameAs` list (scripts/build-seo.js, scripts/countries/, scripts/journal/,
 * public/index.html) and the "Follow TalkLive" row that
 * scripts/migrate-social.js adds to every page footer. The same sweep sets
 * `sameAs` on every TalkLive Organization node in every page's JSON-LD.
 *
 * Only accounts TalkLive actually controls belong here: `sameAs` asserts
 * ownership, and a wrong entry tells search engines the wrong thing about who
 * we are. Facebook is the resolved page URL behind the share link.
 */
const EMAIL = 'info@talklive.app';
const X_HANDLE = '@talkliveapp';

const PROFILES = [
  { name: 'Instagram', handle: '@talklive.app', url: 'https://www.instagram.com/talklive.app/' },
  { name: 'Facebook', handle: 'TalkLive', url: 'https://www.facebook.com/people/TalkLive/61591751700039/' },
  { name: 'X', handle: X_HANDLE, url: 'https://x.com/talkliveapp' },
  { name: 'TikTok', handle: '@talkliveapp', url: 'https://www.tiktok.com/@talkliveapp' },
  { name: 'YouTube', handle: '@talkliveapp', url: 'https://www.youtube.com/@talkliveapp' },
  { name: 'Pinterest', handle: '@talklive.app', url: 'https://www.pinterest.com/talklive.app/' },
];

// Profiles that identify the organisation but are not social accounts to
// follow: structured data only, not the footer row.
const LISTINGS = [
  { name: 'Crunchbase', url: 'https://www.crunchbase.com/organization/talklive' },
];

const SAME_AS = PROFILES.concat(LISTINGS).map((p) => p.url);

// Inline styles only: the row lands in a dozen differently styled footers and
// must inherit each one's colour and alignment rather than bring its own.
function footerRow() {
  const links = PROFILES.map((p) => `<a href="${p.url}" rel="me noopener" target="_blank" aria-label="TalkLive on ${p.name} (${p.handle})" style="display:inline-block;margin:2px 7px;color:inherit">${p.name}</a>`).join('');
  return `<nav class="tl-social" data-social aria-label="TalkLive on social media" style="margin:10px 0 0;padding:0 12px;font-size:13px;line-height:1.8"><span style="opacity:.7;margin-right:4px">Follow TalkLive:</span>${links}<a href="mailto:${EMAIL}" style="display:inline-block;margin:2px 7px;color:inherit">${EMAIL}</a></nav>`;
}

module.exports = { EMAIL, X_HANDLE, PROFILES, LISTINGS, SAME_AS, footerRow };
