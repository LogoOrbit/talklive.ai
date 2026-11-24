// News items TalkLive publishes itself, added once at startup (web and the
// Android app read the same news feed). Each has a fixed id and is remembered
// in store.data.newsSeeded, so deleting one from the dashboard keeps it gone.

const SEEDS = [
  {
    id: 'pnews20261124',
    title: 'What’s new: November 24',
    tag: 'update',
    createdAt: Date.UTC(2026, 10, 24, 18, 0, 0),
    text: [
      'Everything new today, on the website and in the Android app.',
      '',
      'Stories (new)',
      '• Post stories with text, emoji and GIFs you can move, resize, rotate, duplicate and delete, with more font styles and colours.',
      '• Only friends can see them, and they disappear after 24 hours.',
      '• Like, react to or reply to a story. Replies and reactions go to your inbox.',
      '• Swipe up on your story to see who viewed it, and delete it anytime.',
      '• Drafts save as you type, and Back asks before discarding.',
      '• A ring around your avatar shows whether your story is posting, posted or failed (tap to retry).',
      '',
      'Friends and calls',
      '• Play games with your friends, with an animated waiting screen while they decide.',
      '• New call log on the Friends screen: incoming, outgoing, missed and declined calls, with talk time and a call-back button. Call logs are kept for 3 months.',
      '• Slide to answer or decline incoming calls, with a “Connecting…” state after you accept.',
      '• Friend calls open on their own private call screen, with a live audio spectrum when calling and receiving.',
      '• A friend call that can’t connect now ends, instead of searching for a stranger.',
      '• Fixed chats with a friend suddenly switching to a random stranger.',
      '• Likes are now a small heart button in the Friends header, and the badge clears once you’ve seen them.',
      '',
      'Chats',
      '• On laptops and desktops, hover over any message to see a small toolbar. Reply starts a reply in one click, and ⋯ opens reactions, Copy, Edit and Unsend. Works in voice and text chat.',
      '• Phones and tablets are unchanged: swipe right to reply, long-press for the menu.',
      '• Tap a quoted reply to jump to the original message.',
      '• Double-tap to like messages now works reliably on the website.',
      '• Chats and stories load faster.',
      '',
      'Profile and avatars',
      '• Animals and characters redesigned as detailed 2D art, each with its own animation, and smoother to scroll.',
      '• 10 new faces, including fantasy creatures. New faces are for Plus members; everyone can preview them.',
      '• 33 new animated covers: 17 cinematic and 16 pixel-art scenes, with rain, snow, stars, fireflies and glinting water. The cover picker is grouped by style.',
      '• Anyone without a chosen avatar gets an animal instead of a letter.',
      '',
      'History',
      '• Calls show as a horizontal row, and chats as a list.',
      '',
      'Settings and notifications',
      '• New “Keep running in background” option, so calls and messages still arrive after you clear the app.',
      '• A reminder if you haven’t opened TalkLive in a day (at most once a day).',
      '• Settings respond to taps with touch feedback, and Back from the Plus page returns you to where you were.',
      '• Android: smoother on high-refresh-rate screens. When a new version is out, the app asks you to update before continuing.',
      '',
      'Safety',
      '• Someone you report can’t be matched with you again for at least a week.',
      '• Accounts that may belong to people under 18 are reviewed. Until the review is done, they can only send text and can’t add or message friends.',
      '• We can limit someone’s friend requests for a day up to a year, without a full ban.',
      '• Ban appeals get a clearer response.',
      '',
      'Fixes',
      '• Android: news loads again, and Home shows your posts when you scroll.',
      '• The friends list no longer disappears while scrolling.',
      '• Long names like “Definitely Not Pigeons” are no longer cut off.',
      '• Spacing fixed in the bottom bar and the cover picker.',
      '• Faster, more reliable saving of account and payment changes.',
      '',
      'Found a bug or have an idea? Write to info@talklive.app.',
    ].join('\n'),
  },
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
