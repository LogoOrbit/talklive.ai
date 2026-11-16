// Links to social and messaging profiles are allowed in chat. People move
// good conversations to Instagram, Snapchat, WhatsApp and the like, and
// that is their call. Every other link stays blocked: a link to a random
// website is how phishing and scams reach strangers.
//
// stripSocialLinks() removes the allowed links from a message, so the link
// checks that follow only see what is left. It is shared by the server
// (server/index.js, guard-policy.js, moderation-tags.js) and both web chats,
// so every place agrees on what an allowed link is.
//
// It only removes a link when the host is exactly one of the sites below (a
// bare host, "www." or "m."), so "instagram.com.evil.ru", "l.instagram.com"
// and "instagram.com@evil.com" are not allowed. The path may hold a profile
// name (dots allowed: "instagram.com/john.doe"), and the query may hold share
// tracking, but a dot in the query stops the match: anything like
// "facebook.com/l.php?u=evil.com" leaves "evil.com" behind, and that is
// still blocked. There is no lookbehind on purpose: old Safari refuses to
// parse a script that has one.
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SocialLinks = api;
})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : null), function () {
  'use strict';

  const HOSTS = [
    'instagram.com', 'instagr.am', 'wa.me', 'whatsapp.com', 't.me', 'telegram.me', 'snapchat.com',
    'tiktok.com', 'facebook.com', 'fb.com', 'fb.me', 'm.me', 'messenger.com', 'x.com', 'twitter.com',
    'threads.net', 'threads.com', 'youtube.com', 'youtu.be', 'linkedin.com', 'discord.gg', 'discord.com',
    'reddit.com', 'pinterest.com', 'twitch.tv', 'vk.com', 'line.me', 'signal.me', 'viber.com', 'bsky.app',
    'tumblr.com',
  ];

  const host = HOSTS.map((h) => h.replace(/\./g, '\\.')).join('|');
  // 1 = what came before (kept), then: optional scheme, optional www./m.,
  // an allowed host that ends there, a path, a query without dots, a fragment.
  const RE = new RegExp(
    '(^|[^a-z0-9.@-])'
    + '(?:https?:\\/\\/)?(?:www\\.|m\\.|web\\.|mobile\\.)?'
    + '(?:' + host + ')'
    + '(?![a-z0-9@:%-]|\\.[a-z0-9])'
    + '(?:\\/[\\w.~\\-@+%$!*,;=]*)*'
    + '(?:\\?[\\w~\\-@+%$!*,;=&\\/]*)?'
    + '(?:#[\\w\\-]*)?'
    // The link must end here. If the next character would have continued a
    // URL (a dot in the query, a "://" in the path), nothing is removed, so
    // the whole thing is still seen by the link check.
    + '(?![\\w.~\\-@+%$!*,;=&\\/?#:])',
    'gi'
  );

  function stripSocialLinks(text) {
    return String(text || '').replace(RE, '$1 ');
  }

  return { HOSTS, stripSocialLinks };
});
