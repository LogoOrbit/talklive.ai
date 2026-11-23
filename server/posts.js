// Owner posts with reactions and comments (docs/SPEC-PROFILE-PROGRESS-POSTS.md,
// section 7). The home page shows them in a "From TalkLive" feed; the owner
// writes and moderates them from the dashboard's Posts tab.
//
//   store.data.posts = [{ id, text, image?, createdAt, editedAt?, pinned,
//     reactions: { like:[cid], love:[cid], haha:[cid], wow:[cid], sad:[cid] },
//     comments: [{ id, clientId, name, avatar, handle, text, ts, admin?, hidden?,
//       liked? (the owner liked it), replyTo?, replyToName? (an owner reply to one comment) }] }]
//
// Anyone with a valid identity token may react. Only a signed-in account whose
// email is verified (or that signed in with Google) may comment, and comments
// pass the same checks as chat.

const crypto = require('crypto');
const express = require('express');

const REACTION_TYPES = ['like', 'love', 'haha', 'wow', 'sad'];
const MAX_TEXT = 4000;
const MAX_COMMENT = 500;
const MAX_POSTS = 200;
const MAX_COMMENTS = 1000;
const PUBLIC_COMMENTS = 50;
const COMMENTS_PER_MINUTE = 5;

// An account counts as verified when it signed in with Google, or its email was
// confirmed with a code (signup confirms it; `emailVerified: false` marks an
// address typed in later and never confirmed, absent means confirmed).
function isVerifiedAccount(acc) {
  if (!acc) return false;
  if (acc.googleId || acc.google) return true;
  return !!acc.email && acc.emailVerified !== false;
}

const newId = (prefix) => prefix + crypto.randomBytes(6).toString('hex');

function cleanText(v, max) {
  return typeof v === 'string' ? v.replace(/\r\n/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max) : '';
}
// Images are links only (never data: URIs): https or a path on this site.
function cleanImage(v) {
  if (typeof v !== 'string') return '';
  const s = v.trim();
  if (s.length > 500) return '';
  return /^https:\/\/[^\s"'<>]+$/i.test(s) || /^\/[A-Za-z0-9_\-./%]+$/.test(s) ? s : '';
}

function counts(post) {
  const c = {};
  let total = 0;
  for (const t of REACTION_TYPES) {
    c[t] = ((post.reactions && post.reactions[t]) || []).length;
    total += c[t];
  }
  c.total = total;
  return c;
}
function mineOf(post, clientId) {
  if (!clientId) return null;
  return REACTION_TYPES.find((t) => ((post.reactions && post.reactions[t]) || []).includes(clientId)) || null;
}
const visible = (post) => (post.comments || []).filter((c) => !c.hidden);
// `faceOf(clientId, stored)`: the comment author's face as it is NOW (a Plus
// face stored with an old comment is shown as the free one once Plus is gone).
function publicComment(c, faceOf) {
  const avatar = faceOf && c.clientId ? faceOf(c.clientId, c.avatar || null) : (c.avatar || null);
  const out = { id: c.id, name: c.name || '', avatar: avatar || null, handle: c.handle || '', text: c.text, ts: c.ts };
  if (c.admin) out.admin = true;
  if (c.liked) out.liked = true;
  if (c.replyTo) { out.replyTo = c.replyTo; out.replyToName = c.replyToName || ''; }
  return out;
}
function publicPost(post, clientId, faceOf) {
  const vis = visible(post);
  return {
    id: post.id,
    text: post.text,
    image: post.image || null,
    createdAt: post.createdAt,
    editedAt: post.editedAt || null,
    pinned: !!post.pinned,
    counts: counts(post),
    mine: mineOf(post, clientId),
    commentCount: vis.length,
    comments: vis.slice(-PUBLIC_COMMENTS).map((c) => publicComment(c, faceOf)),
  };
}
function ownerPost(post) {
  return {
    id: post.id,
    text: post.text,
    image: post.image || null,
    createdAt: post.createdAt,
    editedAt: post.editedAt || null,
    pinned: !!post.pinned,
    counts: counts(post),
    commentCount: (post.comments || []).length,
    hiddenCount: (post.comments || []).filter((c) => c.hidden).length,
    comments: (post.comments || []).map((c) => ({ ...c })),
  };
}
const order = (list) => list.slice().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.createdAt - a.createdAt);

// deps:
//   store                         the shared store
//   httpRateLimit(route,max,ms)   express middleware factory (index.js)
//   validIdentityToken(cid, tok)  identity check (index.js)
//   isVerifiedClient(cid)         signed-in account with Google or a verified email
//   identify(cid)                 { name, avatar, handle } shown beside a comment
//   textCheck(cid, text)          null to allow, or a reason string to refuse
//   isBanned(cid)                 true for a banned profile (cannot react or comment)
//   resolveAvatar(cid, stored)    the author's current, allowed face
//   notifyReply(cid, info)        tell a commenter the owner replied ({ postId, commentId, text })
function createPosts({ store, httpRateLimit, validIdentityToken, isVerifiedClient, identify, textCheck, isBanned, resolveAvatar, notifyReply, now = () => Date.now() }) {
  const list = () => {
    if (!Array.isArray(store.data.posts)) store.data.posts = [];
    return store.data.posts;
  };
  const find = (id) => list().find((p) => p.id === id) || null;
  const identityOk = (clientId, token) => typeof clientId === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(clientId)
    && typeof token === 'string' && validIdentityToken(clientId, token);

  // clientId -> [ts] of recent comments (5 a minute).
  const commentTimes = new Map();
  function commentRateOk(clientId) {
    const t = now();
    const recent = (commentTimes.get(clientId) || []).filter((x) => t - x < 60000);
    if (recent.length >= COMMENTS_PER_MINUTE) { commentTimes.set(clientId, recent); return false; }
    recent.push(t);
    commentTimes.set(clientId, recent);
    if (commentTimes.size > 5000) for (const [k, v] of commentTimes) if (!v.some((x) => t - x < 60000)) commentTimes.delete(k);
    return true;
  }

  const router = express.Router();
  router.use(express.json({ limit: '4kb' }));

  router.get('/', httpRateLimit('posts-list', 120, 60000), (req, res) => {
    const clientId = String(req.query.clientId || '');
    const known = identityOk(clientId, String(req.query.identityToken || ''));
    const cid = known ? clientId : '';
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      posts: order(list()).map((p) => publicPost(p, cid, resolveAvatar)),
      canComment: !!cid && !!isVerifiedClient(cid),
    });
  });

  router.post('/:id/react', httpRateLimit('posts-react', 60, 60000), (req, res) => {
    const b = req.body || {};
    if (!identityOk(b.clientId, b.identityToken)) return res.status(401).json({ ok: false, reason: 'identity' });
    const post = find(req.params.id);
    if (!post) return res.status(404).json({ ok: false, reason: 'missing' });
    if (isBanned && isBanned(b.clientId)) return res.status(403).json({ ok: false, reason: 'banned' });
    const type = b.type === null || b.type === undefined ? null : String(b.type);
    if (type !== null && !REACTION_TYPES.includes(type)) return res.status(400).json({ ok: false, reason: 'invalid' });
    if (!post.reactions) post.reactions = {};
    for (const t of REACTION_TYPES) {
      const l = post.reactions[t] || (post.reactions[t] = []);
      const at = l.indexOf(b.clientId);
      if (at !== -1) l.splice(at, 1);
    }
    if (type) post.reactions[type].push(b.clientId);
    store.save();
    res.json(publicPost(post, b.clientId, resolveAvatar));
  });

  router.post('/:id/comments', httpRateLimit('posts-comment', 30, 60000), (req, res) => {
    const b = req.body || {};
    if (!identityOk(b.clientId, b.identityToken)) return res.status(401).json({ ok: false, reason: 'identity' });
    const post = find(req.params.id);
    if (!post) return res.status(404).json({ ok: false, reason: 'missing' });
    if (isBanned && isBanned(b.clientId)) return res.status(403).json({ ok: false, reason: 'banned' });
    if (!isVerifiedClient(b.clientId)) return res.status(403).json({ ok: false, reason: 'verify' });
    const text = cleanText(b.text, MAX_COMMENT + 1);
    if (!text || text.length > MAX_COMMENT) return res.status(400).json({ ok: false, reason: 'invalid' });
    // The same words twice in a row on one post are spam, not a conversation.
    const mine = (post.comments || []).filter((c) => c.clientId === b.clientId).slice(-1)[0];
    if (mine && mine.text === text) return res.status(409).json({ ok: false, reason: 'duplicate' });
    if (!commentRateOk(b.clientId)) return res.status(429).json({ ok: false, reason: 'rate' });
    if (textCheck && textCheck(b.clientId, text)) return res.status(422).json({ ok: false, reason: 'blocked' });
    const who = identify(b.clientId) || {};
    const comment = {
      id: newId('c'),
      clientId: b.clientId,
      name: String(who.name || '').slice(0, 40),
      avatar: who.avatar || null,
      handle: String(who.handle || '').slice(0, 40),
      text,
      ts: now(),
    };
    if (!post.comments) post.comments = [];
    post.comments.push(comment);
    while (post.comments.length > MAX_COMMENTS) post.comments.shift();
    store.save();
    res.json({ ok: true, comment: publicComment(comment, resolveAvatar), commentCount: visible(post).length });
  });

  // --- Owner API (mounted inside the authenticated /owner/api router) --------
  function mountOwner(r) {
    const audit = (req, what, detail) => { try { store.audit(what, req.ip || '', detail); } catch (_) { /* audit is best effort */ } };
    const bad = (res, error, code = 400) => res.status(code).json({ ok: false, error });

    r.get('/api/posts', (req, res) => {
      res.json({ posts: order(list()).map(ownerPost), reactionTypes: REACTION_TYPES });
    });

    r.post('/api/posts', (req, res) => {
      const b = req.body || {};
      const text = cleanText(b.text, MAX_TEXT);
      const image = cleanImage(b.image);
      if (!text && !image) return bad(res, 'A post needs some text or an image.');
      if (list().length >= MAX_POSTS) return bad(res, 'Too many posts. Delete an old one first.');
      const post = {
        id: newId('p'), text, createdAt: now(), pinned: b.pinned === true,
        reactions: Object.fromEntries(REACTION_TYPES.map((t) => [t, []])), comments: [],
      };
      if (image) post.image = image;
      list().push(post);
      store.save();
      audit(req, 'post_create', post.id);
      res.json({ ok: true, post: ownerPost(post) });
    });

    r.post('/api/posts/:id', (req, res) => {
      const post = find(req.params.id);
      if (!post) return bad(res, 'No such post.', 404);
      const b = req.body || {};
      const text = b.text !== undefined ? cleanText(b.text, MAX_TEXT) : post.text;
      const image = b.image !== undefined ? cleanImage(b.image) : (post.image || '');
      if (!text && !image) return bad(res, 'A post needs some text or an image.');
      if (b.text !== undefined || b.image !== undefined) { post.text = text; post.editedAt = now(); }
      if (image) post.image = image; else delete post.image;
      if (b.pinned !== undefined) post.pinned = b.pinned === true;
      store.save();
      audit(req, 'post_edit', post.id);
      res.json({ ok: true, post: ownerPost(post) });
    });

    r.post('/api/posts/:id/pin', (req, res) => {
      const post = find(req.params.id);
      if (!post) return bad(res, 'No such post.', 404);
      post.pinned = (req.body || {}).pinned !== false;
      store.save();
      res.json({ ok: true, post: ownerPost(post) });
    });

    r.post('/api/posts/:id/delete', (req, res) => {
      const i = list().findIndex((p) => p.id === req.params.id);
      if (i === -1) return bad(res, 'No such post.', 404);
      list().splice(i, 1);
      store.save();
      audit(req, 'post_delete', req.params.id);
      res.json({ ok: true });
    });

    r.post('/api/posts/:id/comments/:cid/hide', (req, res) => {
      const post = find(req.params.id);
      const c = post && (post.comments || []).find((x) => x.id === req.params.cid);
      if (!c) return bad(res, 'No such comment.', 404);
      c.hidden = (req.body || {}).hidden !== false;
      if (!c.hidden) delete c.hidden;
      store.save();
      res.json({ ok: true, post: ownerPost(post) });
    });

    r.post('/api/posts/:id/comments/:cid/delete', (req, res) => {
      const post = find(req.params.id);
      const i = post ? (post.comments || []).findIndex((x) => x.id === req.params.cid) : -1;
      if (i === -1) return bad(res, 'No such comment.', 404);
      post.comments.splice(i, 1);
      store.save();
      audit(req, 'post_comment_delete', `${post.id}/${req.params.cid}`);
      res.json({ ok: true, post: ownerPost(post) });
    });

    // The owner likes (or unlikes) one comment; shown as "Liked by TalkLive".
    r.post('/api/posts/:id/comments/:cid/like', (req, res) => {
      const post = find(req.params.id);
      const c = post && (post.comments || []).find((x) => x.id === req.params.cid);
      if (!c) return bad(res, 'No such comment.', 404);
      if ((req.body || {}).liked === false) delete c.liked; else c.liked = true;
      store.save();
      res.json({ ok: true, post: ownerPost(post) });
    });

    // A reply from "TalkLive" itself, shown with an Admin badge. `replyTo` (a
    // comment id) makes it a reply to that one comment.
    r.post('/api/posts/:id/reply', (req, res) => {
      const post = find(req.params.id);
      if (!post) return bad(res, 'No such post.', 404);
      const b = req.body || {};
      const text = cleanText(b.text, MAX_COMMENT);
      if (!text) return bad(res, 'Write a reply first.');
      if (!post.comments) post.comments = [];
      const reply = { id: newId('c'), clientId: '', name: 'TalkLive', avatar: null, handle: 'talklive', text, ts: now(), admin: true };
      if (b.replyTo) {
        const target = post.comments.find((x) => x.id === b.replyTo);
        if (!target) return bad(res, 'No such comment.', 404);
        reply.replyTo = target.id;
        reply.replyToName = target.admin ? 'TalkLive' : String(target.name || '').slice(0, 40);
      }
      post.comments.push(reply);
      store.save();
      const target = reply.replyTo && post.comments.find((x) => x.id === reply.replyTo);
      if (target && !target.admin && target.clientId && notifyReply) {
        try { notifyReply(target.clientId, { postId: post.id, commentId: reply.id, text: text.slice(0, 120) }); } catch (_) { /* a failed notice never fails the reply */ }
      }
      audit(req, 'post_reply', post.id);
      res.json({ ok: true, post: ownerPost(post) });
    });
  }

  return { router, mountOwner };
}

module.exports = { createPosts, isVerifiedAccount, REACTION_TYPES, publicPost, counts };
