// News items TalkLive publishes itself, added once at startup (web and the
// Android app read the same news feed). Each has a fixed id and is remembered
// in store.data.newsSeeded, so deleting one from the dashboard keeps it gone.

const SEEDS = [
  {
    id: 'pnews202611',
    title: 'What’s new in November',
    tag: 'update',
    createdAt: Date.UTC(2026, 10, 23, 12, 0, 0),
    text: [
      'A lot has landed this month. Here is what’s new on the website and in the Android app.',
      '',
      'On the Android app',
      '• Friends and chats are now one Messenger-style inbox: search, an online-now strip, and every chat in one list. Long-press a chat to archive, rename, mute, delete or block.',
      '• Sign out from Profile, on this device or on all devices.',
      '• A cleaner Profile: banner-style card, a compact badges card with a Visible switch, and a tidier bottom bar.',
      '• TalkLive News has All / News / Posts filters, with a title and a coloured tag on every update.',
      '• Five animated 8-bit covers for Plus: Neon City, Retro Drive, Pixel Forest, Star Voyage and Pixel Sea.',
      '• Daily reward: if it isn’t ready yet, you now see a live countdown.',
      '• New TalkLive avatar on posts and replies.',
      '',
      'On the website',
      '• New News page at talklive.app/news, with tag filters.',
      '• The same five 8-bit covers are on the web too.',
      '• Posts and news can have photos.',
      '• Full-screen chat on desktop, and it remembers your choice.',
      '• Double-tap to like works reliably.',
      '• Like and reply to individual comments. You get a notification when TalkLive replies to yours.',
      '• Gender and filter searches got fairer: a Plus gender choice is no longer dropped while you wait, and you see who you’re looking for and how many are online.',
      '• Clearer pricing in your local currency, and a simpler “Before you start” screen.',
      '',
      'Across both',
      '• Only real, active talking now counts toward your hours, badges, top talkers, points and streak.',
      '• Silence in a voice call ends it after a short countdown, with a “Still here” button.',
      '• Likes: tap the heart after a call. If you both like each other, it’s a match and you become friends.',
      '• Top 5 talkers get a rank badge.',
      '• Fairer matching: shared language comes first, and new people are paired with friendly partners.',
      '• More protection against cheating and abuse, and faster, steadier sign-in.',
      '',
      'Thanks for talking with us. More is on the way in December.',
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
