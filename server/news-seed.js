// News items TalkLive publishes itself, added once at startup (web and the
// Android app read the same news feed). Each has a fixed id and is remembered
// in store.data.newsSeeded, so deleting one from the dashboard keeps it gone.

const SEEDS = [
  {
    id: 'pnews202611b',
    replaces: ['pnews202611'], // the first, shorter draft

    title: 'What’s new in November',
    tag: 'update',
    createdAt: Date.UTC(2026, 10, 23, 12, 0, 0),
    text: [
      'A lot is new this month on the TalkLive website and in the Android app. Here is what changed, in plain words.',
      '',
      'Meet people and talk',
      '• You can now say who you want to meet. Plus members can choose women or men, and TalkLive keeps that choice instead of dropping it while you wait. While you wait, you see who you are looking for and how many people are online.',
      '• Matching is fairer. People who share your language come first, and new people are paired with friendly partners.',
      '• If a voice call goes quiet, you get a short countdown and a “Still here” button before it ends.',
      '• After a call, tap the heart. If you both like each other, it is a match and you become friends. Plus members can see who liked them.',
      '',
      'Friends and chats',
      '• On Android, friends and chats are now one inbox, like Messenger. Search, see who is online, and open any chat. Press and hold a chat to archive, rename, mute, delete or block.',
      '• Friend requests are easier to answer, and the box no longer closes when you tap outside it.',
      '• You can see when a friend is offline, and when they have left a chat.',
      '• Find a friend by their ID with the new Search button.',
      '• Your recent history is kept for 30 days.',
      '',
      'Your profile',
      '• A new My Profile page with your cover, name, ID, streak, countries and badges. Edit it with a live preview.',
      '• 10 badges, and the top 5 talkers get a special rank badge. You can hide your badges anytime.',
      '• Covers: 6 solid colours, 6 gradients, and animated covers for Plus, including five new 8-bit scenes (Neon City, Retro Drive, Pixel Forest, Star Voyage and Pixel Sea).',
      '• New avatars, including Silver, Gold and Diamond. Plus avatars are for Plus members only.',
      '• Your hours show as simply 12h or 40m. Only real talking counts towards hours, badges, points and streaks.',
      '• On Android you can sign out on this device or on all devices.',
      '',
      'Rewards',
      '• Open the app each day to claim your daily reward. If it is not ready yet, you see a live countdown.',
      '• Levels, points, an invite code and a redeem box are all in one Rewards screen.',
      '',
      'TalkLive News',
      '• News has its own page at talklive.app/news, and in the app. Filter by All, News or Posts, and by tag.',
      '• Like and comment on posts, and reply to other comments. You get a notification when TalkLive replies to you.',
      '• Posts can have photos, and a pinned post shows a pin.',
      '• Double-tap to like works again.',
      '',
      'Look and feel',
      '• On the website, desktop chat can go full screen, and it remembers your choice.',
      '• Fresh blue colours, friendlier game sounds for wins, losses and draws, and an easier-to-read layout.',
      '• Prices show in your own currency, and the Before You Start screen is shorter and easier to read.',
      '• We removed pop-ups that got in your way.',
      '',
      'Safety',
      '• More protection against cheating, fake accounts and abuse.',
      '• Refunds on Google Play are now handled correctly.',
      '',
      'Thank you for talking with us. More is coming in December.',
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
