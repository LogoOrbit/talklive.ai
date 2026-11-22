// ============================================================================
// TalkLive - likes and matches (docs/SPEC-PROFILE-PROGRESS-POSTS.md section 8).
//
//   After a call or chat ends a small heart prompt asks "Enjoyed talking to X?".
//   A like is private until the other person likes you back; then both get
//   `like-match` and see "It's a match!" with Call again / Message.
//   "N people liked you" shows as a chip on the home page: Plus sees who,
//   everyone else sees blurred faces and "See who with Plus".
//
//   like-partner { clientId }  -> ack { ok, matched }
//   likes-summary              -> ack { count, matches, people:[{clientId,username,avatar,ts}] }
//   push `likes` { count }, push `like-match` { clientId, username, avatar, cover, badges }
//
// Loaded after the page is up (engage.js). Needs the page's globals: socket, t.
// If the server has no likes yet, nothing here shows.
// ============================================================================
(function () {
  'use strict';
  if (window.TalkLiveLikes || typeof socket === 'undefined') return;
  var S = socket;

  function tr(key, fallback, vars) {
    var s = fallback;
    if (typeof t === 'function') { var v = t(key, vars); if (v && v !== key) return v; }
    return vars ? s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }) : s;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function face(avatar, size) {
    try { if (typeof avatarFaceHtml === 'function' && avatar) return avatarFaceHtml(avatar, size); } catch (e) { /* fall through */ }
    return '<svg viewBox="0 0 32 32" width="' + size + '" height="' + size + '" aria-hidden="true"><circle cx="16" cy="16" r="16" fill="#2a3550"/><circle cx="16" cy="13" r="5" fill="#cfe0ff"/><path d="M6.500 27c.4-5 4.300-8 9.500-8s9.100 3 9.500 8A15.900 15.900 0 0 1 16 32a15.900 15.900 0 0 1-9.500-5z" fill="#cfe0ff"/></svg>';
  }
  var HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.500s-8-4.900-8-10.700A4.600 4.600 0 0 1 12 7a4.600 4.600 0 0 1 8 2.800c0 5.800-8 10.700-8 10.700z" fill="currentColor"/></svg>';

  // Who this browser already liked (so the button reads "Liked").
  var liked = {};
  try { liked = JSON.parse(localStorage.getItem('tl_liked') || '{}') || {}; } catch (e) { liked = {}; }
  function remember(id) {
    liked[id] = Date.now();
    var keys = Object.keys(liked);
    if (keys.length > 200) keys.sort(function (a, b) { return liked[a] - liked[b]; }).slice(0, keys.length - 200).forEach(function (k) { delete liked[k]; });
    try { localStorage.setItem('tl_liked', JSON.stringify(liked)); } catch (e) { /* storage blocked */ }
  }

  var CSS = '.tl-lk-pill{position:fixed;left:50%;bottom:calc(92px + env(safe-area-inset-bottom));transform:translate(-50%,16px);opacity:0;z-index:1700;display:flex;align-items:center;gap:10px;max-width:calc(100vw - 24px);padding:8px 8px 8px 10px;border-radius:999px;background:rgba(20,24,40,.96);color:#f2f4ff;border:1px solid rgba(255,255,255,.14);box-shadow:0 12px 34px rgba(0,0,0,.4);font:600 14px/1.25 inherit;transition:opacity .22s,transform .22s}'
    + '.tl-lk-pill.in{opacity:1;transform:translate(-50%,0)}.tl-lk-pill .tl-lk-av{width:34px;height:34px;border-radius:50%;overflow:hidden;flex:none;display:grid;place-items:center}.tl-lk-pill span.tl-lk-q{min-width:0;overflow:hidden;text-overflow:ellipsis}'
    + '.tl-lk-x{border:0;background:none;color:inherit;opacity:.6;font-size:18px;cursor:pointer;padding:0 8px}'
    + '.tl-lk-btn{display:inline-flex;align-items:center;gap:6px;border:0;border-radius:999px;padding:9px 16px;font:inherit;font-weight:800;color:#fff;cursor:pointer;background:linear-gradient(135deg,#ff4f8b,#ff7a59);box-shadow:0 6px 16px -6px rgba(255,79,139,.7);transition:transform .15s}'
    + '.tl-lk-btn svg{width:17px;height:17px}.tl-lk-btn:active{transform:scale(.94)}.tl-lk-btn.is-on{background:rgba(255,255,255,.12);box-shadow:none;color:#ff7aa6;cursor:default}.tl-lk-btn.is-on svg{animation:tlLkPop .5s}'
    + '@keyframes tlLkPop{0%{transform:scale(.4)}60%{transform:scale(1.5)}100%{transform:scale(1)}}'
    + '.tl-lk-modal{position:fixed;inset:0;z-index:3100;display:grid;place-items:center;padding:16px;background:rgba(5,7,15,.72);opacity:0;transition:opacity .2s;overflow:hidden}.tl-lk-modal.in{opacity:1}'
    + '.tl-lk-card{position:relative;width:min(360px,100%);padding:30px 22px 22px;border-radius:26px;text-align:center;background:var(--bg-2,#141a2b);color:var(--text,#f2f4ff);border:1px solid var(--line,rgba(255,255,255,.12));box-shadow:0 30px 80px rgba(0,0,0,.55);transform:scale(.9);transition:transform .35s cubic-bezier(.34,1.56,.64,1);overflow:hidden}'
    + '.tl-lk-modal.in .tl-lk-card{transform:none}.tl-lk-card:before{content:"";position:absolute;inset:-40% -20% auto;height:80%;background:radial-gradient(closest-side,rgba(255,79,139,.4),transparent);pointer-events:none}'
    + '.tl-lk-card h2{position:relative;margin:14px 0 6px;font-size:26px;letter-spacing:-.02em;background:linear-gradient(135deg,#ff4f8b,#ffb347);-webkit-background-clip:text;background-clip:text;color:transparent}'
    + '.tl-lk-card p{position:relative;margin:0 0 18px;color:var(--muted,#8a90a8);font-size:15px}'
    + '.tl-lk-faces{position:relative;display:flex;align-items:center;justify-content:center;height:92px}.tl-lk-faces .tl-lk-f{width:84px;height:84px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:var(--bg-glow,#1d2540);box-shadow:0 0 0 4px var(--bg-2,#141a2b),0 10px 26px rgba(0,0,0,.4)}'
    + '.tl-lk-faces .tl-lk-f:first-child{transform:translateX(10px) rotate(-6deg);animation:tlLkL .6s .1s both cubic-bezier(.34,1.56,.64,1)}.tl-lk-faces .tl-lk-f:last-child{transform:translateX(-10px) rotate(6deg);animation:tlLkR .6s .1s both cubic-bezier(.34,1.56,.64,1)}'
    + '@keyframes tlLkL{from{transform:translateX(-90px) rotate(-30deg);opacity:0}}@keyframes tlLkR{from{transform:translateX(90px) rotate(30deg);opacity:0}}'
    + '.tl-lk-heart{position:relative;z-index:2;width:38px;height:38px;margin:0 -8px;color:#ff4f8b;filter:drop-shadow(0 4px 10px rgba(255,79,139,.6));animation:tlLkBeat 1.1s .5s infinite}.tl-lk-heart svg{width:100%;height:100%}'
    + '@keyframes tlLkBeat{0%,100%{transform:scale(1)}30%{transform:scale(1.25)}60%{transform:scale(.95)}}'
    + '.tl-lk-actions{position:relative;display:flex;gap:10px}.tl-lk-actions button{flex:1;border:0;border-radius:14px;padding:13px 10px;font:inherit;font-weight:800;font-size:15px;cursor:pointer}'
    + '.tl-lk-actions .a{color:#fff;background:linear-gradient(135deg,#2a6fe8,#00a8cc)}.tl-lk-actions .b{color:var(--text,#f2f4ff);background:rgba(255,255,255,.1)}'
    + '.tl-lk-later{position:relative;margin-top:12px;border:0;background:none;color:var(--muted,#8a90a8);font:inherit;font-size:13px;cursor:pointer}'
    + '.tl-lk-conf{position:absolute;inset:0;pointer-events:none;overflow:hidden}.tl-lk-conf i{position:absolute;bottom:-20px;width:14px;height:14px;color:#ff4f8b;opacity:0;animation:tlLkUp 2.4s ease-out forwards}.tl-lk-conf i svg{width:100%;height:100%}'
    + '@keyframes tlLkUp{0%{opacity:0;transform:translateY(0) scale(.5)}15%{opacity:.9}100%{opacity:0;transform:translateY(-360px) scale(1.2) rotate(30deg)}}'
    + '.tl-lk-list{position:relative;margin:0 0 16px;padding:0;list-style:none;display:grid;gap:8px;text-align:start;max-height:260px;overflow:auto}.tl-lk-list li{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:14px;background:rgba(255,255,255,.06);cursor:pointer}'
    + '.tl-lk-list .tl-lk-f{width:38px;height:38px;border-radius:50%;overflow:hidden;flex:none;display:grid;place-items:center}.tl-lk-list strong{font-size:15px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
    + '.tl-lk-blur{position:relative;display:flex;justify-content:center;margin:0 0 16px}.tl-lk-blur .tl-lk-f{width:56px;height:56px;border-radius:50%;overflow:hidden;margin-inline-start:-10px;filter:blur(7px) saturate(1.3);box-shadow:0 0 0 3px var(--bg-2,#141a2b);display:grid;place-items:center}.tl-lk-blur .tl-lk-f:first-child{margin-inline-start:0}'
    + '.tl-lk-x2{position:absolute;top:8px;inset-inline-end:10px;z-index:3;width:32px;height:32px;border:0;border-radius:50%;background:transparent;color:var(--muted,#8a90a8);font-size:22px;cursor:pointer}'
    + '.tl-lk-profile{width:100%;margin-top:8px}'
    + '@media (prefers-reduced-motion:reduce){.tl-lk-pill,.tl-lk-modal,.tl-lk-card{transition:none}.tl-lk-heart,.tl-lk-faces .tl-lk-f,.tl-lk-btn.is-on svg{animation:none}.tl-lk-conf{display:none}}';
  (function () { var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); })();

  // --- Sending a like --------------------------------------------------------
  function sendLike(id, btn, done) {
    if (!id || liked[id]) { if (done) done({ ok: true }); return; }
    if (btn) btn.disabled = true;
    var settled = false;
    function fin(r) {
      if (settled) return;
      settled = true;
      if (r && r.ok) {
        remember(id);
        if (btn) { btn.classList.add('is-on'); btn.disabled = true; btn.innerHTML = HEART + '<span>' + esc(tr('likedBtn', 'Liked')) + '</span>'; }
      } else if (btn) {
        btn.disabled = false;
        if (typeof showToast === 'function') showToast(tr('likeFailed', 'Could not send your like. Try again.'), 'warn');
      }
      if (done) done(r);
    }
    try { S.emit('like-partner', { clientId: id }, fin); } catch (e) { fin(null); }
    setTimeout(function () { fin(null); }, 8000);
  }
  function likeButton(id) {
    var on = !!liked[id];
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'tl-lk-btn' + (on ? ' is-on' : '');
    b.innerHTML = HEART + '<span>' + esc(tr(on ? 'likedBtn' : 'likeBtn', on ? 'Liked' : 'Like')) + '</span>';
    b.disabled = on;
    b.addEventListener('click', function () { sendLike(id, b, function () { schedulePillHide(1800); }); });
    return b;
  }

  // --- The post-call prompt --------------------------------------------------
  var last = null;          // the person on the line now: { clientId, username, avatar, at }
  var pill = null;
  var pillTimer = null;
  function hidePill() {
    clearTimeout(pillTimer);
    if (!pill) return;
    var n = pill; pill = null;
    n.classList.remove('in');
    setTimeout(function () { n.remove(); }, 250);
  }
  function schedulePillHide(ms) { clearTimeout(pillTimer); pillTimer = setTimeout(hidePill, ms); }
  function showPill(p) {
    hidePill();
    if (liked[p.clientId]) return;
    pill = document.createElement('div');
    pill.className = 'tl-lk-pill';
    pill.setAttribute('role', 'group');
    pill.innerHTML = '<span class="tl-lk-av">' + face(p.avatar, 34) + '</span><span class="tl-lk-q">'
      + esc(tr('likeAsk', 'Enjoyed talking to {name}?', { name: p.username || tr('stranger', 'this person') })) + '</span>';
    pill.appendChild(likeButton(p.clientId));
    var x = document.createElement('button');
    x.type = 'button'; x.className = 'tl-lk-x'; x.setAttribute('aria-label', tr('close', 'Close')); x.innerHTML = '&times;';
    x.addEventListener('click', hidePill);
    pill.appendChild(x);
    document.body.appendChild(pill);
    requestAnimationFrame(function () { if (pill) pill.classList.add('in'); });
    schedulePillHide(14000);
  }
  function ended() {
    var p = last;
    last = null;
    if (p && p.clientId && Date.now() - p.at > 10000) showPill(p);
  }
  S.on('matched', function (d) {
    var p = d && d.partner;
    hidePill();
    last = p && p.clientId ? { clientId: p.clientId, username: p.username, avatar: p.avatar || (p.animal ? 'a:' + p.animal : (p.character ? 'c:' + p.character : null)), at: Date.now() } : null;
  });
  S.on('partner-left', ended);
  // Hanging up or skipping yourself.
  var origEmit = S.emit;
  S.emit = function (ev) {
    if ((ev === 'leave' || ev === 'skip') && last) ended();
    return origEmit.apply(this, arguments);
  };

  // --- On someone's profile ---------------------------------------------------
  function decorateProfile(person, eligible) {
    var host = document.querySelector('#friendProfileModal .profile-actions-main');
    if (!host) return;
    var old = document.getElementById('tlLikeProfileBtn');
    if (old) old.remove();
    if (!person || !person.clientId || !eligible || person.clientId === (typeof clientId !== 'undefined' ? clientId : '')) return;
    var b = likeButton(person.clientId);
    b.id = 'tlLikeProfileBtn';
    host.appendChild(b);
  }

  // --- It's a match! ----------------------------------------------------------
  var modal = null;
  function closeModal() {
    if (!modal) return;
    var n = modal; modal = null;
    n.classList.remove('in');
    setTimeout(function () { n.remove(); }, 220);
    document.removeEventListener('keydown', onKey, true);
  }
  function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); closeModal(); } }
  function openModal(html, wire) {
    closeModal();
    modal = document.createElement('div');
    modal.className = 'tl-lk-modal';
    modal.innerHTML = '<div class="tl-lk-card" role="dialog" aria-modal="true">' + html + '</div>';
    modal.addEventListener('click', function (e) { if (e.target === modal || e.target.closest('[data-close]')) closeModal(); });
    document.body.appendChild(modal);
    document.addEventListener('keydown', onKey, true);
    requestAnimationFrame(function () { if (modal) modal.classList.add('in'); });
    if (wire) wire(modal);
  }
  function confetti() {
    var out = '';
    for (var i = 0; i < 14; i++) out += '<i style="left:' + (Math.round(Math.random() * 92) + 2) + '%;animation-delay:' + (Math.random() * 0.9).toFixed(2) + 's;color:' + (i % 3 ? '#ff4f8b' : '#ffb347') + '">' + HEART + '</i>';
    return '<span class="tl-lk-conf" aria-hidden="true">' + out + '</span>';
  }
  function myFace() {
    var a = null;
    try { a = typeof myAvatar !== 'undefined' ? myAvatar : null; } catch (e) { a = null; }
    return face(a, 84);
  }
  S.on('like-match', function (m) {
    if (!m || !m.clientId) return;
    hidePill();
    remember(m.clientId);
    var name = m.username || tr('stranger', 'this person');
    var canCall = typeof requestCallBack === 'function';
    var canMsg = typeof openFriendChat === 'function';
    openModal(confetti() + '<div class="tl-lk-faces"><span class="tl-lk-f">' + myFace() + '</span><span class="tl-lk-heart">' + HEART + '</span><span class="tl-lk-f">' + face(m.avatar, 84) + '</span></div>'
      + '<h2>' + esc(tr('matchTitle', "It's a match!")) + '</h2><p>' + esc(tr('matchSub', "You and {name} liked each other. You're friends now.", { name: name })) + '</p>'
      + '<div class="tl-lk-actions">' + (canCall ? '<button type="button" class="a" data-act="call">' + esc(tr('matchCall', 'Call again')) + '</button>' : '')
      + (canMsg ? '<button type="button" class="b" data-act="msg">' + esc(tr('matchMsg', 'Message')) + '</button>' : '') + '</div>'
      + '<button type="button" class="tl-lk-later" data-close>' + esc(tr('close', 'Close')) + '</button>', function (el) {
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-act]');
        if (!b) return;
        closeModal();
        if (b.dataset.act === 'call') requestCallBack(m.clientId, name);
        else openFriendChat(m.clientId);
      });
    });
    refresh();
  });

  // --- "N people liked you" ---------------------------------------------------
  var summary = { count: 0, matches: 0, people: [] };
  function refresh() {
    try {
      S.emit('likes-summary', function (r) {
        if (!r || typeof r !== 'object' || typeof r.count !== 'number') return;
        summary = { count: r.count, matches: r.matches || 0, people: Array.isArray(r.people) ? r.people : [] };
        window.dispatchEvent(new CustomEvent('tl-likes'));
      });
    } catch (e) { /* an older server has no likes */ }
  }
  S.on('likes', function (d) {
    if (d && typeof d.count === 'number') { summary.count = d.count; window.dispatchEvent(new CustomEvent('tl-likes')); refresh(); }
  });
  S.on('connect', function () { setTimeout(refresh, 800); });
  S.on('state-sync', function () { setTimeout(refresh, 300); });
  if (S.connected) setTimeout(refresh, 800);

  function chip() {
    if (!summary.count) return '';
    return '<button type="button" class="tl-chip tl-chip-likes" data-act="likes">' + HEART + '<span>'
      + esc(tr('likesChip', '{n} liked you', { n: summary.count })) + '</span></button>';
  }
  function openLikes() {
    var plus = typeof isPremiumUser !== 'undefined' && isPremiumUser;
    var head = '<button type="button" class="tl-lk-x2" data-close aria-label="' + esc(tr('close', 'Close')) + '">&times;</button>'
      + '<div class="tl-lk-heart" style="margin:0 auto;animation:none;position:relative">' + HEART + '</div>'
      + '<h2>' + esc(tr('likesPeople', '{n} people liked you', { n: summary.count })) + '</h2>';
    if (plus && summary.people.length) {
      openModal(head + '<ul class="tl-lk-list">' + summary.people.map(function (p) {
        return '<li data-id="' + esc(p.clientId) + '"><span class="tl-lk-f">' + face(p.avatar, 38) + '</span><strong>' + esc(p.username || tr('stranger', 'Someone')) + '</strong></li>';
      }).join('') + '</ul>', function (el) {
        el.addEventListener('click', function (e) {
          var li = e.target.closest('li[data-id]');
          if (!li || typeof openUserProfile !== 'function') return;
          var p = summary.people.filter(function (x) { return x.clientId === li.dataset.id; })[0];
          closeModal();
          if (p) openUserProfile({ clientId: p.clientId, username: p.username, avatar: p.avatar });
        });
      });
      return;
    }
    var faces = ['a:cat', 'a:fox', 'c:wizard', 'a:panda', 'a:rabbit'].slice(0, Math.max(2, Math.min(5, summary.count)));
    openModal(head + '<div class="tl-lk-blur" aria-hidden="true">' + faces.map(function (a) { return '<span class="tl-lk-f">' + face(a, 56) + '</span>'; }).join('') + '</div>'
      + '<p>' + esc(tr('likesPlusSub', 'Plus shows you who they are.')) + '</p>'
      + '<div class="tl-lk-actions"><button type="button" class="a" data-act="plus">' + esc(tr('likesPlusSee', 'See who with Plus')) + '</button></div>', function (el) {
      el.addEventListener('click', function (e) {
        if (!e.target.closest('[data-act="plus"]')) return;
        closeModal();
        if (typeof showPremiumUpsell === 'function') showPremiumUpsell(tr('likesPeople', '{n} people liked you', { n: summary.count }), 'general');
      });
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-act="likes"]');
    if (b && b.classList.contains('tl-chip-likes')) openLikes();
  });

  window.TalkLiveLikes = { chip: chip, open: openLikes, decorateProfile: decorateProfile, count: function () { return summary.count; } };
  window.dispatchEvent(new CustomEvent('tl-likes'));
})();
