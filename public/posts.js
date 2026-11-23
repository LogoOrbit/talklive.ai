// ============================================================================
// TalkLive - "From TalkLive": posts from the team, on the home page
// (docs/SPEC-PROFILE-PROGRESS-POSTS.md section 7).
//
// A Facebook-style card per post: text and image, a reaction bar (like, love,
// haha, wow, sad) with a count per kind and a total, the comment count, the
// comments (the team's replies carry an Admin badge) and a comment box for
// verified accounts - everybody else is asked to sign in with one.
//
// Loaded by app.js the moment the sentinel above the section is scrolled near
// (IntersectionObserver), so the landing page never pays for it. If the server
// has no /api/posts yet, or there is nothing to show, the section stays hidden.
//
//   TalkLivePosts.mount(sectionEl)
//
//   GET  /api/posts?clientId=&identityToken=         -> { posts: [...], canComment }
//   POST /api/posts/:id/react    { clientId, identityToken, type|null } -> post
//   POST /api/posts/:id/comments { clientId, identityToken, text }      -> { ok, comment } | { ok:false, reason }
// ============================================================================
(function (global) {
  'use strict';

  var TYPES = ['like', 'love', 'haha', 'wow', 'sad'];
  var REFRESH_MS = 60000;
  var MAX_COMMENT = 500;

  function tr(key, fallback, vars) {
    var s = fallback;
    if (typeof global.t === 'function') {
      var v = global.t(key, vars);
      if (v && v !== key) return v;
    }
    return vars ? s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }) : s;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function identity() {
    try { if (typeof global.TalkLiveIdentity === 'function') return global.TalkLiveIdentity() || {}; } catch (e) { /* not ready */ }
    return {};
  }
  function safeImage(src) { return typeof src === 'string' && /^(https?:\/\/|\/[^/])/.test(src) ? src : ''; }

  // --- the five reactions, drawn rather than typed as emoji ------------------------
  var ICON = {
    like: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#2a6fe8"/><path d="M7 11h2.500v7H7zM10.500 11l2.500-5c1.200 0 2 .9 1.700 2.200L14.300 10H17.500c1 0 1.700 1 1.400 1.900l-1.300 4.600c-.2.800-.9 1.500-1.800 1.500h-5.800z" fill="#fff"/></svg>',
    love: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#f0476b"/><path d="M12 18.200s-5.500-3.400-5.500-7.200a3 3 0 0 1 5.500-1.600A3 3 0 0 1 17.500 11c0 3.800-5.500 7.200-5.500 7.200z" fill="#fff"/></svg>',
    haha: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#ffc83d"/><path d="M6.500 10c.7-1.200 2-1.200 2.700 0M14.800 10c.7-1.200 2-1.200 2.700 0" stroke="#4a3200" stroke-width="1.500" stroke-linecap="round" fill="none"/><path d="M6.800 13.200h10.400c0 3-2.300 5-5.200 5s-5.200-2-5.200-5z" fill="#4a3200"/><path d="M9 16.800c1.700-1 4.300-1 6 0-.8 1-1.900 1.400-3 1.400s-2.200-.4-3-1.400z" fill="#f0476b"/></svg>',
    wow: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#ffc83d"/><circle cx="8.600" cy="10" r="1.500" fill="#4a3200"/><circle cx="15.400" cy="10" r="1.500" fill="#4a3200"/><ellipse cx="12" cy="16.400" rx="2.300" ry="3" fill="#4a3200"/><path d="M6.500 6.500c.8-.8 2-1 3-.6M17.500 6.500c-.8-.8-2-1-3-.6" stroke="#4a3200" stroke-width="1.200" stroke-linecap="round" fill="none"/></svg>',
    sad: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#ffc83d"/><circle cx="8.600" cy="10.200" r="1.400" fill="#4a3200"/><circle cx="15.400" cy="10.200" r="1.400" fill="#4a3200"/><path d="M8.200 17c1.100-1.500 2.400-2.100 3.800-2.100s2.700.6 3.800 2.100" stroke="#4a3200" stroke-width="1.600" stroke-linecap="round" fill="none"/><path d="M17.600 12.500c.8 1 1.100 1.800.6 2.500-.6.700-1.700.3-1.500-.9z" fill="#5bc0ff"/></svg>',
  };
  var NAME = { like: 'Like', love: 'Love', haha: 'Haha', wow: 'Wow', sad: 'Sad' };
  function typeName(k) { return tr('reaction_' + k, NAME[k]); }
  // The team's avatar: a clean person silhouette on a calm brand-blue disc.
  var LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="tlpg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b4a66"/><stop offset="1" stop-color="#1f2a40"/></linearGradient></defs><circle cx="16" cy="16" r="16" fill="url(#tlpg)"/><circle cx="16" cy="12.500" r="5" fill="#cfe0ff"/><path d="M6.500 27c.4-5.200 4.300-8.300 9.500-8.300s9.100 3.100 9.500 8.300A15.900 15.900 0 0 1 16 32a15.900 15.900 0 0 1-9.500-5z" fill="#cfe0ff"/></svg>';
  // A custom pushpin: domed brand-blue head with a highlight, a collar and a
  // silver needle, tilted like it was just pressed in.
  var PIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><defs>'
    + '<linearGradient id="tlPinHead" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5aa2ff"/><stop offset="1" stop-color="#1f5fd6"/></linearGradient>'
    + '<linearGradient id="tlPinNeedle" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e5e9f0"/><stop offset="1" stop-color="#8b95a7"/></linearGradient></defs>'
    + '<path d="M11.2 14.6 12 22.4l.8-7.8z" fill="url(#tlPinNeedle)"/>'
    + '<path d="M8.2 13.2h7.6c.5 0 .8-.5.6-.9l-1.3-2.4H8.9l-1.3 2.4c-.2.4.1.9.6.9z" fill="#174bb0"/>'
    + '<path d="M9 9.9 8.4 4.6C8.3 3.7 9 3 9.9 3h4.2c.9 0 1.6.7 1.5 1.6L15 9.9z" fill="url(#tlPinHead)"/>'
    + '<path d="M10.3 4.4c.6-.3 1.4-.3 1.9 0l-.4 4.3h-1.2z" fill="#fff" opacity=".45"/></svg>';

  var CSS = '.tl-posts{width:100%;max-width:none;align-self:stretch;box-sizing:border-box;margin:18px auto 0;padding:0;text-align:start;contain:layout}.tl-posts[hidden]{display:none}'
    + '.tl-posts-title{margin:0 0 10px;font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}'
    + '.tl-post{background:var(--bg-2);border:1px solid var(--line);border-radius:16px;margin:0 0 16px;overflow:hidden;color:var(--text);box-shadow:0 6px 24px -14px rgba(0,0,0,.5)}'
    + '.tl-post-head{display:flex;align-items:center;gap:10px;padding:12px 14px 4px}'
    + '.tl-post-av{width:40px;height:40px;flex:none;border-radius:50%;overflow:hidden}.tl-post-av svg{width:100%;height:100%}'
    + '.tl-post-who{display:flex;flex-direction:column;min-width:0}.tl-post-who strong{font-size:15px;display:flex;align-items:center;gap:6px}'
    + '.tl-post-who small{color:var(--muted);font-size:12.5px}'
    + '.tl-post-tag{display:inline-block;padding:1px 7px;border-radius:999px;font-size:10.5px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;color:#fff;background:linear-gradient(135deg,#2a6fe8,#00a8cc)}'
    + '.tl-post-pin{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;margin-inline-start:4px;border-radius:50%;background:rgba(42,111,232,.14);transform:rotate(28deg);filter:drop-shadow(0 1px 1px rgba(0,0,0,.35))}.tl-post-pin svg{width:15px;height:15px}'
    + '.tl-post-text{margin:6px 14px 10px;font-size:15.5px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}'
    + '.tl-post-img{display:block;width:100%;max-height:480px;object-fit:cover;background:var(--bg-glow)}'
    + '.tl-post-stats{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;color:var(--muted);font-size:13.5px}'
    + '.tl-post-reacts{display:flex;align-items:center;flex-wrap:wrap;gap:8px;min-height:22px}'
    + '.tl-post-reacts span{display:inline-flex;align-items:center;gap:3px}.tl-post-reacts svg{width:18px;height:18px}'
    + '.tl-post-total{font-weight:700;color:var(--text)}'
    + '.tl-post-cc{background:none;border:0;padding:0;font:inherit;color:inherit;cursor:pointer}.tl-post-cc:hover{text-decoration:underline}'
    + '.tl-post-bar{position:relative;display:flex;border-top:1px solid var(--line);margin:0 14px}'
    + '.tl-post-act{flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:10px 6px;margin:2px 0;background:none;border:0;border-radius:10px;font:inherit;font-size:14.5px;font-weight:700;color:var(--muted);cursor:pointer}'
    + '.tl-post-act:hover{background:color-mix(in srgb,var(--text) 7%,transparent)}.tl-post-act svg{width:19px;height:19px}'
    + '.tl-post-act.on{color:var(--accent-2)}'
    + '.tl-post-pick{position:absolute;left:0;bottom:calc(100% + 6px);z-index:3;display:flex;gap:4px;padding:6px 8px;border-radius:999px;background:var(--bg-2);border:1px solid var(--line);box-shadow:0 10px 30px rgba(0,0,0,.45);opacity:0;visibility:hidden;transform:translateY(6px) scale(.96);transition:opacity .15s,transform .15s,visibility .15s}'
    + '.tl-post-pick.open{opacity:1;visibility:visible;transform:none}'
    + '.tl-post-pick button{display:flex;flex-direction:column;align-items:center;gap:1px;width:46px;padding:4px 0;background:none;border:0;border-radius:12px;color:var(--muted);font:inherit;font-size:10.5px;cursor:pointer;transition:transform .12s}'
    + '.tl-post-pick button:hover,.tl-post-pick button:focus-visible{transform:translateY(-4px) scale(1.12)}'
    + '.tl-post-pick button.on{background:color-mix(in srgb,var(--accent) 22%,transparent)}.tl-post-pick svg{width:30px;height:30px}'
    + '.tl-post-comments{padding:4px 14px 14px;border-top:1px solid var(--line)}.tl-post-comments[hidden]{display:none}'
    + '.tl-cm{display:flex;gap:9px;margin-top:10px}.tl-cm-av{width:32px;height:32px;flex:none;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:var(--bg-glow)}'
    + '.tl-cm-av svg{width:100%;height:100%}.tl-cm-body{min-width:0;padding:8px 12px;border-radius:16px;background:color-mix(in srgb,var(--text) 7%,transparent)}'
    + '.tl-cm-name{font-size:13px;font-weight:800;display:flex;align-items:center;gap:6px;flex-wrap:wrap}.tl-cm-time{font-weight:500;color:var(--muted);font-size:11.5px}'
    + '.tl-cm-text{margin:2px 0 0;font-size:14.5px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere}'
    + '.tl-cm-re{font-size:12px;color:var(--muted);margin-top:1px}.tl-cm-liked{font-size:12px;color:var(--muted);margin-top:4px}'
    + '.tl-cm.tl-cm-reply{margin-left:41px}'
    + '.tl-post-form{display:flex;gap:8px;align-items:flex-end;margin-top:12px}'
    + '.tl-post-form textarea{flex:1;min-height:40px;max-height:120px;resize:vertical;padding:9px 14px;border-radius:20px;border:1px solid var(--line);background:color-mix(in srgb,var(--text) 6%,transparent);color:var(--text);font:inherit;font-size:14.5px}'
    + '.tl-post-form button{flex:none;padding:10px 16px;border-radius:999px;border:0;font:inherit;font-weight:800;font-size:14px;color:#fff;cursor:pointer;background:linear-gradient(135deg,#2a6fe8,#00a8cc)}'
    + '.tl-post-form button:disabled{opacity:.5;cursor:default}'
    + '.tl-post-note{margin:12px 0 0;padding:10px 14px;border-radius:12px;background:color-mix(in srgb,var(--text) 6%,transparent);font-size:13.5px;color:var(--muted);display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}'
    + '.tl-post-note button{border:0;border-radius:999px;padding:7px 14px;font:inherit;font-weight:800;font-size:13px;color:#fff;cursor:pointer;background:linear-gradient(135deg,#2a6fe8,#00a8cc)}'
    + '.tl-post-err{margin:8px 0 0;font-size:13px;color:var(--danger,#ff5470)}'
    + '@media (prefers-reduced-motion:reduce){.tl-post-pick,.tl-post-pick button{transition:none}}';

  function when(ts) {
    var d = Number(ts);
    if (!d) return '';
    var s = Math.round((Date.now() - d) / 1000);
    if (s < 60) return tr('postJustNow', 'just now');
    try {
      var rtf = new Intl.RelativeTimeFormat(document.documentElement.lang || undefined, { numeric: 'auto', style: 'short' });
      if (s < 3600) return rtf.format(-Math.round(s / 60), 'minute');
      if (s < 86400) return rtf.format(-Math.round(s / 3600), 'hour');
      if (s < 86400 * 7) return rtf.format(-Math.round(s / 86400), 'day');
      return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) { return new Date(d).toLocaleDateString(); }
  }

  // opts.poll === false: load once and never refresh (the call screen).
  function mount(root, opts) {
    if (!root || root.dataset.mounted) return;
    root.dataset.mounted = '1';
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var state = { posts: [], canComment: false, open: {}, pickFor: null };
    var inner = root.querySelector('.tl-posts-inner');
    var pickTimer = null;

    function request(method, url, body) {
      var opts = { method: method, headers: { Accept: 'application/json' }, cache: 'no-store' };
      if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
      return fetch(url, opts).then(function (r) { return r.json().catch(function () { return null; }).then(function (j) { return { status: r.status, body: j }; }); });
    }
    function withId(extra) {
      var id = identity();
      return Object.assign({ clientId: id.clientId || '', identityToken: id.identityToken || '' }, extra || {});
    }

    function faceFor(c) {
      if (c.admin) return '<span class="tl-cm-av">' + LOGO + '</span>';
      var html = '';
      try { if (typeof global.avatarFaceHtml === 'function' && c.avatar) html = global.avatarFaceHtml(c.avatar, 32); } catch (e) { html = ''; }
      return '<span class="tl-cm-av">' + html + '</span>';
    }
    function commentHtml(c) {
      var name = c.admin ? 'TalkLive' : (c.name || tr('someone', 'Someone'));
      return '<div class="tl-cm' + (c.replyTo ? ' tl-cm-reply' : '') + '">' + faceFor(c) + '<div class="tl-cm-body"><div class="tl-cm-name">' + esc(name)
        + (c.admin ? '<span class="tl-post-tag">' + esc(tr('adminBadge', 'Admin')) + '</span>' : '')
        + '<span class="tl-cm-time">' + esc(when(c.ts)) + '</span></div>'
        + (c.replyTo ? '<div class="tl-cm-re">' + esc(tr('postReplyingTo', 'Replying to {name}', { name: c.replyToName || tr('someone', 'Someone') })) + '</div>' : '')
        + '<p class="tl-cm-text">' + esc(c.text) + '</p>'
        + (c.liked ? '<div class="tl-cm-liked">\u2764\ufe0f ' + esc(tr('postLikedByTalkLive', 'Liked by TalkLive')) + '</div>' : '')
        + '</div></div>';
    }

    // Owner replies to one comment sit right under it (and its earlier replies).
    function threaded(list) {
      var ids = {}, kids = {}, out = [];
      list.forEach(function (c) { ids[c.id] = 1; });
      list.forEach(function (c) { if (c.replyTo && ids[c.replyTo]) (kids[c.replyTo] = kids[c.replyTo] || []).push(c); });
      list.forEach(function (c) {
        if (c.replyTo && ids[c.replyTo]) return;
        out.push(c);
        (kids[c.id] || []).forEach(function (k) { out.push(k); });
      });
      return out;
    }

    function postHtml(p) {
      var counts = p.counts || {};
      var total = Number(counts.total) || 0;
      var open = !!state.open[p.id];
      var cc = Number(p.commentCount) || (p.comments ? p.comments.length : 0);
      var img = safeImage(p.image);
      var reacts = TYPES.filter(function (k) { return counts[k] > 0; }).map(function (k) {
        return '<span title="' + esc(typeName(k)) + '">' + ICON[k] + counts[k] + '</span>';
      }).join('');
      var mine = p.mine && ICON[p.mine] ? p.mine : null;
      var comments = threaded(p.comments || []).map(commentHtml).join('');
      var form;
      if (state.canComment) {
        form = '<form class="tl-post-form" data-form="' + esc(p.id) + '"><textarea rows="1" maxlength="' + MAX_COMMENT + '" placeholder="' + esc(tr('postCommentPlaceholder', 'Write a comment...'))
          + '" aria-label="' + esc(tr('postCommentPlaceholder', 'Write a comment...')) + '"></textarea><button type="submit">' + esc(tr('postSend', 'Send')) + '</button></form><p class="tl-post-err" hidden></p>';
      } else {
        form = '<p class="tl-post-note"><span>' + esc(tr('postSignInToComment', 'Sign in with a verified account to comment')) + '</span><button type="button" data-signin="1">'
          + esc(tr('signIn', 'Sign in')) + '</button></p>';
      }
      return '<article class="tl-post" data-post="' + esc(p.id) + '">'
        + '<div class="tl-post-head"><span class="tl-post-av">' + LOGO + '</span><span class="tl-post-who"><strong>TalkLive <span class="tl-post-tag">' + esc(tr('adminBadge', 'Admin')) + '</span>'
        + (p.pinned ? '<span class="tl-post-pin" role="img" title="' + esc(tr('postPinned', 'Pinned')) + '" aria-label="' + esc(tr('postPinned', 'Pinned')) + '">' + PIN + '</span>' : '') + '</strong><small>' + esc(when(p.createdAt)) + '</small></span></div>'
        + (p.text ? '<p class="tl-post-text">' + esc(p.text) + '</p>' : '')
        + (img ? '<img class="tl-post-img" src="' + esc(img) + '" alt="" loading="lazy" decoding="async">' : '')
        + '<div class="tl-post-stats"><div class="tl-post-reacts">' + reacts + (total ? '<span class="tl-post-total">' + total + '</span>' : '') + '</div>'
        + '<button type="button" class="tl-post-cc" data-toggle="' + esc(p.id) + '">' + esc(tr('postComments', '{n} comments', { n: cc })) + '</button></div>'
        + '<div class="tl-post-bar">'
        + '<div class="tl-post-pick' + (state.pickFor === p.id ? ' open' : '') + '" role="group" aria-label="' + esc(tr('postReact', 'React')) + '">'
        + TYPES.map(function (k) {
          return '<button type="button" data-react="' + k + '" class="' + (mine === k ? 'on' : '') + '" aria-label="' + esc(typeName(k)) + '" aria-pressed="' + (mine === k ? 'true' : 'false') + '">' + ICON[k]
            + '<span>' + (counts[k] || 0) + '</span></button>';
        }).join('') + '</div>'
        + '<button type="button" class="tl-post-act' + (mine ? ' on' : '') + '" data-main="' + esc(p.id) + '" aria-haspopup="true">'
        + (mine ? ICON[mine] : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 11h-3v9h3zM7 11l4-7c1.700 0 2.600 1.300 2.200 2.800L12.600 10H19c1.200 0 2 1.100 1.700 2.200l-1.500 6c-.3 1-1.100 1.800-2.200 1.800H7"/></svg>')
        + '<span>' + esc(mine ? typeName(mine) : typeName('like')) + '</span></button>'
        + '<button type="button" class="tl-post-act" data-toggle="' + esc(p.id) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a7.500 7.500 0 0 1-11 6.600L4 20l1.400-4.600A7.500 7.500 0 1 1 20 12z"/></svg><span>'
        + esc(tr('postComment', 'Comment')) + '</span></button></div>'
        + '<div class="tl-post-comments"' + (open ? '' : ' hidden') + '>' + comments + form + '</div></article>';
    }

    function render() {
      if (!state.posts.length) { root.hidden = true; return; }
      root.hidden = false;
      var focus = document.activeElement;
      var keep = null;
      if (focus && focus.tagName === 'TEXTAREA' && inner.contains(focus)) {
        var form = focus.closest('[data-form]');
        keep = { id: form && form.dataset.form, value: focus.value, start: focus.selectionStart };
      }
      inner.innerHTML = '<h2 class="tl-posts-title">' + esc(tr('postsTitle', 'From TalkLive')) + '</h2>' + state.posts.map(postHtml).join('');
      if (keep && keep.id) {
        var ta = inner.querySelector('[data-form="' + CSS_escape(keep.id) + '"] textarea');
        if (ta) { ta.value = keep.value; try { ta.focus({ preventScroll: true }); ta.setSelectionRange(keep.start, keep.start); } catch (e) { /* ignore */ } }
      }
    }
    function CSS_escape(s) { return String(s).replace(/["\\]/g, '\\$&'); }

    function replacePost(updated) {
      if (!updated || !updated.id) return;
      state.posts = state.posts.map(function (p) { return p.id === updated.id ? updated : p; });
    }
    function find(id) { return state.posts.filter(function (p) { return p.id === id; })[0]; }

    function react(id, type) {
      var p = find(id);
      if (!p) return;
      var next = p.mine === type ? null : type;
      // Painted straight away; the server's answer replaces it.
      var counts = Object.assign({}, p.counts || {});
      if (p.mine) counts[p.mine] = Math.max(0, (counts[p.mine] || 0) - 1);
      if (next) counts[next] = (counts[next] || 0) + 1;
      counts.total = TYPES.reduce(function (n, k) { return n + (counts[k] || 0); }, 0);
      var before = p;
      replacePost(Object.assign({}, p, { counts: counts, mine: next }));
      state.pickFor = null;
      render();
      request('POST', '/api/posts/' + encodeURIComponent(id) + '/react', withId({ type: next })).then(function (r) {
        if (r.status === 200 && r.body && r.body.id) replacePost(r.body);
        else replacePost(before);
        render();
      }, function () { replacePost(before); render(); });
    }

    function sendComment(id, form) {
      var ta = form.querySelector('textarea');
      var btn = form.querySelector('button');
      var err = form.nextElementSibling;
      var text = ta.value.trim();
      if (!text) return;
      btn.disabled = true;
      if (err) err.hidden = true;
      request('POST', '/api/posts/' + encodeURIComponent(id) + '/comments', withId({ text: text.slice(0, MAX_COMMENT) })).then(function (r) {
        var b = r.body || {};
        if (b.ok && b.comment) {
          var p = find(id);
          if (p) replacePost(Object.assign({}, p, { comments: (p.comments || []).concat([b.comment]), commentCount: (Number(p.commentCount) || 0) + 1 }));
          render();
          return;
        }
        btn.disabled = false;
        var msg = { verify: tr('postNeedVerify', 'Only verified accounts can comment.'), rate: tr('postRate', 'Slow down a little - try again in a minute.'), blocked: tr('postBlocked', 'That comment cannot be posted.') }[b.reason]
          || tr('postFailed', 'Could not post your comment.');
        if (err) { err.textContent = msg; err.hidden = false; }
      }, function () {
        btn.disabled = false;
        if (err) { err.textContent = tr('postFailed', 'Could not post your comment.'); err.hidden = false; }
      });
    }

    inner.addEventListener('click', function (e) {
      var post = e.target.closest('[data-post]');
      var id = post && post.dataset.post;
      var rbtn = e.target.closest('[data-react]');
      if (rbtn && id) { react(id, rbtn.dataset.react); return; }
      var main = e.target.closest('[data-main]');
      if (main && id) {
        // A tap on the main button likes (or undoes); hover or long-press opens the picker.
        var p = find(id);
        react(id, p && p.mine ? p.mine : 'like');
        return;
      }
      var tg = e.target.closest('[data-toggle]');
      if (tg && id) { state.open[id] = !state.open[id]; state.pickFor = null; render(); return; }
      if (e.target.closest('[data-signin]')) {
        if (typeof global.openAuthPage === 'function') global.openAuthPage('login');
        else location.href = '/login';
      }
    });
    inner.addEventListener('submit', function (e) {
      var form = e.target.closest('[data-form]');
      if (!form) return;
      e.preventDefault();
      sendComment(form.dataset.form, form);
    });
    inner.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && e.target.tagName === 'TEXTAREA') {
        var form = e.target.closest('[data-form]');
        if (form) { e.preventDefault(); sendComment(form.dataset.form, form); }
      }
    });
    // The picker: open on hover (mouse) or a long press (touch), close when the pointer leaves.
    function setPick(id, on) {
      var el = id && inner.querySelector('[data-post="' + CSS_escape(id) + '"] .tl-post-pick');
      if (!el) return;
      el.classList.toggle('open', on);
      state.pickFor = on ? id : null;
    }
    inner.addEventListener('pointerover', function (e) {
      if (e.pointerType === 'touch') return;
      var bar = e.target.closest('.tl-post-bar');
      var post = bar && bar.closest('[data-post]');
      if (!post) return;
      clearTimeout(pickTimer);
      if (e.target.closest('[data-main], .tl-post-pick')) setPick(post.dataset.post, true);
    });
    inner.addEventListener('pointerout', function (e) {
      var post = e.target.closest('[data-post]');
      if (!post || post.contains(e.relatedTarget) && e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.tl-post-bar')) return;
      clearTimeout(pickTimer);
      pickTimer = setTimeout(function () { if (state.pickFor) setPick(state.pickFor, false); }, 250);
    });
    var pressTimer = null;
    inner.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'touch') return;
      var main = e.target.closest('[data-main]');
      if (!main) return;
      var id = main.closest('[data-post]').dataset.post;
      pressTimer = setTimeout(function () { pressTimer = null; setPick(id, true); main.dataset.long = '1'; }, 450);
    });
    ['pointerup', 'pointercancel'].forEach(function (n) {
      inner.addEventListener(n, function () { clearTimeout(pressTimer); });
    });
    inner.addEventListener('click', function (e) {
      var main = e.target.closest('[data-main]');
      if (main && main.dataset.long) { delete main.dataset.long; e.stopImmediatePropagation(); }
    }, true);
    document.addEventListener('click', function (e) {
      if (state.pickFor && !e.target.closest('.tl-post-bar')) setPick(state.pickFor, false);
    });

    var loading = false;
    function load() {
      if (loading) return Promise.resolve();
      loading = true;
      var id = identity();
      var qs = '?clientId=' + encodeURIComponent(id.clientId || '') + '&identityToken=' + encodeURIComponent(id.identityToken || '');
      return request('GET', '/api/posts' + qs).then(function (r) {
        loading = false;
        var b = r.body;
        if (r.status !== 200 || !b || !Array.isArray(b.posts)) return;
        state.posts = b.posts.filter(function (p) { return p && p.id; });
        state.canComment = !!b.canComment;
        render();
      }, function () { loading = false; });
    }
    load();
    // Reactions and comments from other people show up without a reload, while
    // the section is on screen.
    var visible = false;
    if (opts && opts.poll === false) { global.addEventListener('i18n-changed', render); return; }
    if ('IntersectionObserver' in global) {
      new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }).observe(root);
    }
    setInterval(function () {
      if (!document.hidden && visible && !(document.activeElement && document.activeElement.tagName === 'TEXTAREA')) load();
    }, REFRESH_MS);
    // Signing in changes whether comments are open.
    global.addEventListener('i18n-changed', render);
  }

  global.TalkLivePosts = { mount: mount };
}(window));
