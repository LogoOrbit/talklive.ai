// Stories: a short post that friends can see for 24 hours, like the circles at
// the top of WhatsApp, Messenger or Instagram, but with no photos - written text
// on a colour, with emoji and any number of GIFs (up to MAX_GIFS) placed on it.
//
//   store.data.stories = { [clientId]: [{ id, text, bg, gifs: [{ url, preview, w, h, x, y }],
//     ts, name, avatar, views: [clientId] }] }
//
// Only friends see a story (and never across a block). The author sees who viewed it.

const crypto = require('crypto');

const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_TEXT = 700;
const MAX_GIFS = 6;
const MAX_ACTIVE = 30;
const BACKGROUNDS = ['blue', 'purple', 'pink', 'orange', 'green', 'teal', 'dark', 'sunset', 'ocean', 'berry'];

function createStories({ store, cleanGif, friendIdsOf, isBlockedPair, checkText }) {
  // Looked up each time: the store's data object is replaced when it loads.
  const all = () => {
    if (!store.data.stories || typeof store.data.stories !== 'object') store.data.stories = {};
    return store.data.stories;
  };

  function live(list, now = Date.now()) {
    return (list || []).filter((s) => now - s.ts < TTL_MS);
  }

  // Drops expired stories; returns true when anything went.
  function prune() {
    const now = Date.now();
    let changed = false;
    for (const cid of Object.keys(all())) {
      const kept = live(all()[cid], now);
      if (kept.length !== all()[cid].length) changed = true;
      if (kept.length) all()[cid] = kept; else delete all()[cid];
    }
    if (changed) store.save();
    return changed;
  }

  function clamp01(v) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.5;
  }

  /** Validates and saves a new story. Returns { ok, story } or { ok: false, error }. */
  function post(author, raw) {
    if (!raw || typeof raw !== 'object') return { ok: false, error: 'Nothing to post.' };
    const text = typeof raw.text === 'string'
      ? raw.text.replace(/\r\n/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, MAX_TEXT)
      : '';
    const gifs = (Array.isArray(raw.gifs) ? raw.gifs : []).slice(0, MAX_GIFS).map((g) => {
      const c = cleanGif(g);
      return c ? { url: c.url, preview: c.preview, w: c.w, h: c.h, x: clamp01(g.x), y: clamp01(g.y) } : null;
    }).filter(Boolean);
    if (!text && !gifs.length) return { ok: false, error: 'Write something or add a GIF.' };
    if (text && checkText) {
      const bad = checkText(author.clientId, text);
      if (bad) return { ok: false, error: bad };
    }
    const list = live(all()[author.clientId]);
    if (list.length >= MAX_ACTIVE) return { ok: false, error: 'You have posted a lot today. Try again later.' };
    const story = {
      id: 's' + crypto.randomBytes(6).toString('hex'),
      text,
      bg: BACKGROUNDS.includes(raw.bg) ? raw.bg : 'blue',
      gifs,
      ts: Date.now(),
      name: String(author.name || 'Someone').slice(0, 40),
      avatar: author.avatar || null,
      views: [],
    };
    list.push(story);
    all()[author.clientId] = list;
    store.save();
    return { ok: true, story };
  }

  function remove(clientId, id) {
    const list = all()[clientId];
    if (!list) return false;
    const kept = list.filter((s) => s.id !== id);
    if (kept.length === list.length) return false;
    if (kept.length) all()[clientId] = kept; else delete all()[clientId];
    store.save();
    return true;
  }

  function markSeen(viewer, ownerId, id) {
    if (viewer === ownerId) return false;
    const s = live(all()[ownerId]).find((x) => x.id === id);
    if (!s || !canSee(viewer, ownerId)) return false;
    if (!s.views.includes(viewer)) {
      s.views.push(viewer);
      if (s.views.length > 500) s.views = s.views.slice(-500);
      store.save();
      return true;
    }
    return false;
  }

  function canSee(viewer, ownerId) {
    if (viewer === ownerId) return true;
    if (isBlockedPair(viewer, ownerId)) return false;
    return friendIdsOf(viewer).includes(ownerId);
  }

  function shape(s, viewer, ownerId, nameOf) {
    const mine = viewer === ownerId;
    const out = { id: s.id, text: s.text, bg: s.bg, gifs: s.gifs, ts: s.ts, seen: mine || s.views.includes(viewer) };
    if (mine) out.views = s.views.map((cid) => ({ clientId: cid, name: nameOf ? nameOf(cid) : null }));
    return out;
  }

  /**
   * What `viewer` sees: their own stories first, then each friend with a live
   * story, unseen ones first, newest first.
   * `faceOf(cid, saved)` gives the live face, `nameOf(cid)` a friend's display name.
   */
  function feed(viewer, { faceOf, nameOf } = {}) {
    prune();
    const out = [];
    const mine = live(all()[viewer]);
    const ids = friendIdsOf(viewer).filter((fid) => !isBlockedPair(viewer, fid));
    const people = [viewer, ...ids];
    for (const cid of people) {
      const list = live(all()[cid]);
      if (cid !== viewer && !list.length) continue;
      const last = list[list.length - 1];
      out.push({
        clientId: cid,
        mine: cid === viewer,
        name: (cid !== viewer && nameOf && nameOf(cid)) || (last && last.name) || 'Someone',
        avatar: faceOf ? faceOf(cid, last && last.avatar) : (last && last.avatar) || null,
        stories: list.map((s) => shape(s, viewer, cid, nameOf)),
      });
    }
    const [me, ...rest] = out;
    rest.sort((a, b) => {
      const ua = a.stories.some((s) => !s.seen) ? 1 : 0;
      const ub = b.stories.some((s) => !s.seen) ? 1 : 0;
      if (ua !== ub) return ub - ua;
      return b.stories[b.stories.length - 1].ts - a.stories[a.stories.length - 1].ts;
    });
    if (!mine.length && me) me.stories = [];
    return me ? [me, ...rest] : rest;
  }

  return { post, remove, markSeen, feed, prune, canSee, TTL_MS, MAX_GIFS, MAX_TEXT, BACKGROUNDS };
}

module.exports = { createStories };
