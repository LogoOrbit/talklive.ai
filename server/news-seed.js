// News items TalkLive publishes itself, added once at startup (web and the
// Android app read the same news feed). Each has a fixed id and is remembered
// in store.data.newsSeeded, so deleting one from the dashboard keeps it gone.

const SEEDS = [
  {
    id: 'pnews202611c',
    replaces: ['pnews202611', 'pnews202611b'], // earlier drafts

    title: 'What’s new in November',
    tag: 'update',
    createdAt: Date.UTC(2026, 10, 23, 12, 0, 0),
    text: [
      'Everything we shipped in November, on the website and in the Android app.',
      '',
      'Matching and calls',
      '• Plus members can pick who to meet, women or men. The choice now holds while you wait instead of being dropped after 10 seconds, and you can see how many matching people are online.',
      '• Shared language counts for more when we pair people. New users get matched with people who don’t skip every call.',
      '• If nobody talks on a voice call, you get a 60-second countdown and a “Still here” button before it ends.',
      '• Tap the heart after a call. If they tap it too, you’re friends. Plus members can see who liked them.',
      '',
      'Friends and chats',
      '• Android: friends and chats are now one inbox, like Messenger. Search, see who’s online, and long-press a chat to archive, rename, mute, delete or block.',
      '• Look up a friend by ID with the new Search button.',
      '• The friend request box no longer closes when you tap outside it.',
      '• You can see when a friend is offline, and when they’ve left a chat.',
      '• History keeps the last 30 days.',
      '',
      'Profile',
      '• A new profile page with your cover, name, ID, streak, countries and badges. Editing shows a live preview.',
      '• 10 badges. The top 5 talkers get a rank badge, and you can hide your badges if you’d rather.',
      '• Covers: 6 colours, 6 gradients, and animated ones for Plus, including five new 8-bit scenes (Neon City, Retro Drive, Pixel Forest, Star Voyage, Pixel Sea).',
      '• New Silver, Gold and Diamond avatars.',
      '• Hours now read “12h” or “40m”. Only time spent actually talking counts toward hours, badges, points and streaks.',
      '• Android: you can sign out on this device or on all of them.',
      '',
      'Rewards',
      '• Android: open the app each day to claim your reward. If it isn’t ready, you get a countdown instead of a button that does nothing. Levels, points, your invite code and redeem are all on one screen.',
      '',
      'News',
      '• You’re reading it. Posts have tags, and the Android app lets you filter by All, News or Posts.',
      '• You can like and comment on posts and reply to other comments. If TalkLive replies to yours, you get a notification.',
      '• Posts can have photos. Double-tap to like works again.',
      '',
      'Website',
      '• Desktop chat can go full screen, and it remembers your choice.',
      '• Prices show in your own currency, and the “Before you start” screen is shorter.',
      '• Sounds for losing and drawing a game, a brighter blue, and fewer pop-ups.',
      '',
      'Safety',
      '• Better checks against cheating, fake accounts and abuse. Google Play refunds are now handled properly.',
      '',
      'Found a bug or have an idea? Write to info@talklive.app.',
    ].join('\n'),
  },
];

function seedNews(store) {
  const d = store.data;
  if (!Array.isArray(d.posts)) d.posts = [];
  if (!d.newsSeeded || typeof d.newsSeeded !== 'object') d.newsSeeded = {};
  let changed = false;
  for (const s of SEEDS) {
    if (d.newsSeeded[s.id]) continue;
    d.newsSeeded[s.id] = true;
    changed = true;
    for (const old of s.replaces || []) d.posts = d.posts.filter((p) => p.id !== old);
    if (d.posts.some((p) => p.id === s.id)) continue;
    d.posts.push({
      id: s.id, kind: 'news', title: s.title, tag: s.tag, text: s.text,
      createdAt: s.createdAt, pinned: false,
      reactions: { like: [], love: [], haha: [], wow: [], sad: [] }, comments: [],
    });
  }
  if (changed) store.save();
}

module.exports = { seedNews, SEEDS };
