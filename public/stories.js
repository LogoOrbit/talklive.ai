// ============================================================================
// TalkLive - Stories. Friends post a story (written text on a colour, emoji,
// and GIFs placed anywhere on it, no photos) that their friends can see for
// 24 hours, like the circles at the top of WhatsApp, Messenger or Instagram.
//
//   stories-get              -> ack { ok, people: [{ clientId, mine, name, avatar,
//                                 stories: [{ id, text, bg, gifs:[{url,preview,w,h,x,y}], ts, seen, views? }] }] }
//   story-post { text, bg, gifs } -> ack { ok, id } | { ok:false, error }
//   story-delete { id }      -> ack { ok }
//   story-seen { clientId, id }
//   push `stories-changed`   -> refresh the row
//
// Loaded by engage.js. Needs the page's globals: socket (and t, avatarFaceHtml when present).
// ============================================================================
(function () {
  'use strict';
  if (window.TalkLiveStories || typeof socket === 'undefined') return;
  var S = socket;
  var MAX_GIFS = 6;
  var MAX_TEXT = 700;
  var STORY_MS = 6000;
  var BGS = {
    blue: 'linear-gradient(160deg,#2a6fe8,#1d3f9e)',
    purple: 'linear-gradient(160deg,#8b5cf6,#4c1d95)',
    pink: 'linear-gradient(160deg,#ec4899,#9d174d)',
    orange: 'linear-gradient(160deg,#f97316,#b45309)',
    green: 'linear-gradient(160deg,#22c55e,#166534)',
    teal: 'linear-gradient(160deg,#14b8a6,#0f766e)',
    dark: 'linear-gradient(160deg,#1f2937,#030712)',
    sunset: 'linear-gradient(160deg,#fb7185,#f59e0b)',
    ocean: 'linear-gradient(160deg,#06b6d4,#4f46e5)',
    berry: 'linear-gradient(160deg,#db2777,#7c3aed)',
  };
  var BG_KEYS = Object.keys(BGS);
  var EMOJIS = '😀 😂 🤣 😊 😍 😘 😎 🤩 🥳 😇 🤗 🤔 😴 😭 😡 🤯 😱 🥺 😏 🙄 👋 👍 👏 🙌 🙏 💪 🤝 ✌️ 🤞 👀 ❤️ 🧡 💛 💚 💙 💜 🖤 💔 💕 💯 ✨ ⭐ 🔥 🎉 🎊 🎁 🎂 🍕 🍔 ☕ 🍺 ⚽ 🏀 🎮 🎵 🎧 🎤 📷 ✈️ 🚀 🌍 🌙 ☀️ 🌈 🌸 🌹 🐶 🐱 🦊 🐼 🦁 🐸 🦋 👻 💀 🤖 👽 💩'.split(' ');

  function tr(key, fallback, vars) {
    if (typeof t === 'function') { var v = t(key, vars); if (v && v !== key) return v; }
    return vars ? fallback.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }) : fallback;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function face(avatar, size) {
    try { if (typeof avatarFaceHtml === 'function' && avatar) return avatarFaceHtml(avatar, size); } catch (e) { /* fall through */ }
    return '<svg viewBox="0 0 32 32" width="' + size + '" height="' + size + '" aria-hidden="true"><circle cx="16" cy="16" r="16" fill="#2a3550"/><circle cx="16" cy="13" r="5" fill="#cfe0ff"/><path d="M6.500 27c.4-5 4.300-8 9.500-8s9.100 3 9.500 8A15.900 15.900 0 0 1 16 32a15.900 15.900 0 0 1-9.500-5z" fill="#cfe0ff"/></svg>';
  }
  function ago(ts) {
    var m = Math.max(0, Math.round((Date.now() - ts) / 60000));
    if (m < 1) return tr('storyJustNow', 'just now');
    if (m < 60) return tr('storyMinutes', '{n}m', { n: m });
    return tr('storyHours', '{n}h', { n: Math.round(m / 60) });
  }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  var CSS = ''
    + '.tl-st-row{display:flex;gap:14px;overflow-x:auto;padding:4px 2px 12px;margin-bottom:6px;scrollbar-width:none}.tl-st-row::-webkit-scrollbar{display:none}'
    + '.tl-st-item{flex:none;width:68px;display:flex;flex-direction:column;align-items:center;gap:5px;border:0;background:none;color:var(--text,#f2f4ff);font-family:inherit;font-size:12px;font-weight:600;line-height:1.2;cursor:pointer;padding:0}'
    + '.tl-st-ring{position:relative;width:62px;height:62px;border-radius:50%;padding:3px;background:linear-gradient(135deg,#f59e0b,#ec4899,#8b5cf6)}'
    + '.tl-st-ring.seen{background:var(--line,rgba(255,255,255,.18))}.tl-st-ring.none{background:transparent}'
    + '.tl-st-ring .tl-st-av{width:100%;height:100%;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:var(--bg-2,#141a2b);border:2px solid var(--bg-2,#141a2b);box-sizing:border-box}'
    + '.tl-st-ring .tl-st-av svg,.tl-st-ring .tl-st-av img{width:100%;height:100%}'
    + '.tl-st-plus{position:absolute;right:-1px;bottom:-1px;width:22px;height:22px;border-radius:50%;background:#2a6fe8;color:#fff;display:grid;place-items:center;font-size:17px;font-weight:800;border:2px solid var(--bg-2,#141a2b)}'
    + '.tl-st-name{max-width:68px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
    + '.tl-st-modal{position:fixed;inset:0;z-index:3200;background:#000;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s}.tl-st-modal.in{opacity:1}'
    + '.tl-st-frame{position:relative;width:100vw;height:100vh;height:100dvh;overflow:hidden;border-radius:0;color:#fff}'
    + '@media (min-width:700px){.tl-st-frame{border-radius:18px;height:min(92dvh,calc(100vw * 16 / 9));width:calc(min(92dvh,calc(100vw * 16 / 9)) * 9 / 16)}}'
    + '.tl-st-text{position:absolute;left:8%;right:8%;top:50%;transform:translateY(-50%);text-align:center;font-family:inherit;font-size:clamp(22px,7vmin,34px);font-weight:800;line-height:1.25;white-space:pre-wrap;word-break:break-word;text-shadow:0 2px 12px rgba(0,0,0,.25);pointer-events:none}'
    + '.tl-st-gif{position:absolute;width:38%;transform:translate(-50%,-50%);border-radius:10px;touch-action:none;user-select:none;-webkit-user-drag:none}'
    + '.tl-st-gif img{width:100%;display:block;border-radius:10px;pointer-events:none}'
    + '.tl-st-gif .tl-st-gx{position:absolute;top:-10px;right:-10px;width:26px;height:26px;border-radius:50%;border:0;background:#000c;color:#fff;font-size:16px;cursor:pointer}'
    + '.tl-st-top{position:absolute;left:0;right:0;top:0;padding:10px 12px;background:linear-gradient(#0008,#0000);z-index:3}'
    + '.tl-st-bars{display:flex;gap:4px;margin-bottom:10px}.tl-st-bar{flex:1;height:3px;border-radius:2px;background:#fff5;overflow:hidden}.tl-st-bar i{display:block;height:100%;width:0;background:#fff}'
    + '.tl-st-who{display:flex;align-items:center;gap:10px;font-weight:700}.tl-st-who .tl-st-av{width:34px;height:34px;border-radius:50%;overflow:hidden;display:grid;place-items:center}.tl-st-who small{opacity:.75;font-weight:500}'
    + '.tl-st-close{margin-left:auto;border:0;background:none;color:#fff;font-size:30px;line-height:1;cursor:pointer;padding:0 4px}'
    + '.tl-st-tap{position:absolute;top:70px;bottom:70px;width:35%;z-index:2;cursor:pointer}.tl-st-tap.l{left:0}.tl-st-tap.r{right:0}'
    + '.tl-st-foot{position:absolute;left:0;right:0;bottom:0;padding:12px 14px calc(12px + env(safe-area-inset-bottom));display:flex;gap:10px;align-items:center;background:linear-gradient(#0000,#0009);z-index:3}'
    + '.tl-st-btn{border:0;border-radius:999px;padding:10px 16px;font:inherit;font-weight:800;cursor:pointer;background:#fff2;color:#fff}.tl-st-btn.primary{background:#fff;color:#111}.tl-st-btn:disabled{opacity:.5;cursor:default}'
    + '.tl-st-views{font-size:13px;opacity:.9;cursor:pointer;border:0;background:none;color:#fff;font-weight:700}'
    + '.tl-st-edit{position:absolute;left:6%;right:6%;top:50%;transform:translateY(-50%);z-index:1;background:transparent;border:0;outline:0;resize:none;color:#fff;text-align:center;font-family:inherit;font-size:clamp(22px,7vmin,34px);font-weight:800;line-height:1.25;min-height:2.5em;max-height:60%}'
    + '.tl-st-edit::placeholder{color:#fffa}'
    + '.tl-st-tools{position:absolute;right:10px;top:60px;z-index:3;display:flex;flex-direction:column;gap:10px}'
    + '.tl-st-tool{width:44px;height:44px;border-radius:50%;border:0;background:#0006;color:#fff;font-family:inherit;font-size:13px;font-weight:800;line-height:1;cursor:pointer;display:grid;place-items:center}'
    + '.tl-st-sw{display:flex;gap:8px;flex:1;overflow-x:auto;scrollbar-width:none}.tl-st-sw button{flex:none;width:28px;height:28px;border-radius:50%;border:2px solid #fff6;cursor:pointer}.tl-st-sw button.on{border-color:#fff;transform:scale(1.15)}'
    + '.tl-st-pick{position:absolute;left:0;right:0;bottom:0;max-height:55%;z-index:5;background:#111827f2;border-radius:18px 18px 0 0;padding:12px;display:flex;flex-direction:column;gap:10px}'
    + '.tl-st-pick input{border:0;border-radius:12px;padding:11px 14px;background:#fff1;color:#fff;font:inherit;outline:0}'
    + '.tl-st-grid{overflow-y:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.tl-st-grid img{width:100%;height:90px;object-fit:cover;border-radius:8px;cursor:pointer;background:#fff1}'
    + '.tl-st-emo{overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(40px,1fr));gap:4px}.tl-st-emo button{border:0;background:none;font-size:26px;cursor:pointer;padding:4px;border-radius:8px}.tl-st-emo button:hover{background:#fff1}'
    + '.tl-st-err{position:absolute;left:50%;top:70px;transform:translateX(-50%);z-index:6;background:#dc2626;color:#fff;padding:8px 14px;border-radius:999px;font-weight:700;font-size:14px}'
    + '.tl-st-list{position:absolute;left:0;right:0;bottom:0;max-height:50%;overflow:auto;z-index:6;background:#111827f5;border-radius:18px 18px 0 0;padding:14px}.tl-st-list h3{margin:0 0 10px;font-size:16px}.tl-st-list div{padding:6px 0;opacity:.9}';

  function injectCss() {
    if (document.getElementById('tl-st-css')) return;
    var s = document.createElement('style');
    s.id = 'tl-st-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  var people = [];
  var row = null;

  function ask(ev, payload) {
    return new Promise(function (res) {
      var done = false;
      var tm = setTimeout(function () { if (!done) { done = true; res(null); } }, 8000);
      var cb = function (r) { if (done) return; done = true; clearTimeout(tm); res(r); };
      if (payload === undefined) S.emit(ev, cb); else S.emit(ev, payload, cb);
    });
  }

  function refresh() {
    return ask('stories-get').then(function (r) {
      if (r && r.ok) { people = r.people || []; render(); }
    });
  }

  function ensureRow() {
    if (row && document.body.contains(row)) return row;
    var anchor = document.querySelector('#friendsDropdown .friend-id-card') || document.querySelector('.friend-id-card');
    if (!anchor) return null;
    row = el('div', 'tl-st-row');
    row.setAttribute('aria-label', tr('stories', 'Stories'));
    anchor.parentNode.insertBefore(row, anchor);
    return row;
  }

  function render() {
    var r = ensureRow();
    if (!r) return;
    r.innerHTML = '';
    var me = people.find(function (p) { return p.mine; });
    var meHas = me && me.stories.length;
    var mine = el('button', 'tl-st-item');
    mine.type = 'button';
    mine.innerHTML = '<span class="tl-st-ring ' + (meHas ? 'seen' : 'none') + '"><span class="tl-st-av">' + face(me && me.avatar, 56) + '</span><span class="tl-st-plus">+</span></span>'
      + '<span class="tl-st-name">' + esc(tr('yourStory', 'Your story')) + '</span>';
    mine.addEventListener('click', function () { if (meHas) openViewer(people.indexOf(me), 0); else openComposer(); });
    r.appendChild(mine);
    people.forEach(function (p, i) {
      if (p.mine || !p.stories.length) return;
      var unseen = p.stories.some(function (s) { return !s.seen; });
      var b = el('button', 'tl-st-item');
      b.type = 'button';
      b.innerHTML = '<span class="tl-st-ring' + (unseen ? '' : ' seen') + '"><span class="tl-st-av">' + face(p.avatar, 56) + '</span></span>'
        + '<span class="tl-st-name">' + esc(p.name) + '</span>';
      b.addEventListener('click', function () {
        var first = p.stories.findIndex(function (s) { return !s.seen; });
        openViewer(i, first < 0 ? 0 : first);
      });
      r.appendChild(b);
    });
  }

  function storyNode(s) {
    var frame = el('div', 'tl-st-frame');
    frame.style.background = BGS[s.bg] || BGS.blue;
    (s.gifs || []).forEach(function (g) {
      var w = el('div', 'tl-st-gif');
      w.style.left = (g.x * 100) + '%';
      w.style.top = (g.y * 100) + '%';
      var img = document.createElement('img');
      img.src = g.url; img.alt = 'GIF'; img.loading = 'eager';
      w.appendChild(img);
      frame.appendChild(w);
    });
    if (s.text) frame.appendChild(el('div', 'tl-st-text')).textContent = s.text;
    return frame;
  }

  function modal() {
    injectCss();
    var m = el('div', 'tl-st-modal');
    m.setAttribute('role', 'dialog');
    document.body.appendChild(m);
    requestAnimationFrame(function () { m.classList.add('in'); });
    return m;
  }
  function closeModal(m) {
    m.classList.remove('in');
    setTimeout(function () { if (m.parentNode) m.parentNode.removeChild(m); }, 200);
  }

  // --- viewer --------------------------------------------------------------
  function openViewer(pi, si) {
    var m = modal();
    var timer = null, raf = null, start = 0, paused = false, elapsed = 0;
    function stop() { clearTimeout(timer); cancelAnimationFrame(raf); }
    function close() { stop(); document.removeEventListener('keydown', onKey); closeModal(m); }
    function onKey(e) { if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') next(); else if (e.key === 'ArrowLeft') prev(); }
    document.addEventListener('keydown', onKey);
    function next() {
      var p = people[pi];
      if (si < p.stories.length - 1) { si++; show(); return; }
      // The next friend with a story (own stories are not chained into friends').
      for (var j = pi + 1; j < people.length; j++) {
        if (!people[j].mine && people[j].stories.length && !p.mine) { pi = j; si = 0; show(); return; }
      }
      close();
    }
    function prev() { if (si > 0) { si--; show(); } else { elapsed = 0; show(); } }
    function show() {
      stop();
      var p = people[pi];
      var s = p && p.stories[si];
      if (!s) { close(); return; }
      if (!p.mine && !s.seen) { s.seen = true; S.emit('story-seen', { clientId: p.clientId, id: s.id }); render(); }
      m.innerHTML = '';
      var frame = storyNode(s);
      var top = el('div', 'tl-st-top');
      var bars = el('div', 'tl-st-bars');
      p.stories.forEach(function (_, k) {
        var b = el('div', 'tl-st-bar', '<i></i>');
        if (k < si) b.firstChild.style.width = '100%';
        bars.appendChild(b);
      });
      top.appendChild(bars);
      var who = el('div', 'tl-st-who', '<span class="tl-st-av">' + face(p.avatar, 34) + '</span><span>' + esc(p.mine ? tr('yourStory', 'Your story') : p.name) + ' <small>' + esc(ago(s.ts)) + '</small></span>');
      var x = el('button', 'tl-st-close', '&times;');
      x.type = 'button'; x.setAttribute('aria-label', tr('close', 'Close'));
      x.addEventListener('click', close);
      who.appendChild(x);
      top.appendChild(who);
      frame.appendChild(top);
      var l = el('div', 'tl-st-tap l'); l.addEventListener('click', prev);
      var r = el('div', 'tl-st-tap r'); r.addEventListener('click', next);
      frame.appendChild(l); frame.appendChild(r);
      // Hold anywhere to pause, like the apps.
      frame.addEventListener('pointerdown', function () { paused = true; });
      frame.addEventListener('pointerup', function () { paused = false; });
      frame.addEventListener('pointerleave', function () { paused = false; });
      if (p.mine) {
        var foot = el('div', 'tl-st-foot');
        var views = (s.views || []);
        var vb = el('button', 'tl-st-views');
        vb.type = 'button';
        vb.textContent = '👁 ' + tr('storyViews', '{n} views', { n: views.length });
        vb.addEventListener('click', function () {
          paused = true;
          var list = el('div', 'tl-st-list', '<h3>' + esc(tr('storySeenBy', 'Seen by')) + '</h3>');
          if (!views.length) list.appendChild(el('div', '', esc(tr('storyNoViews', 'No one yet'))));
          views.forEach(function (v) { list.appendChild(el('div', '', esc(v.name || tr('aFriend', 'A friend')))); });
          list.addEventListener('click', function () { list.remove(); paused = false; });
          frame.appendChild(list);
        });
        foot.appendChild(vb);
        var sp = el('span'); sp.style.flex = '1'; foot.appendChild(sp);
        var add = el('button', 'tl-st-btn', esc(tr('storyAdd', 'Add')));
        add.type = 'button';
        add.addEventListener('click', function () { close(); openComposer(); });
        var del = el('button', 'tl-st-btn', esc(tr('delete', 'Delete')));
        del.type = 'button';
        del.addEventListener('click', function () {
          ask('story-delete', { id: s.id }).then(function () {
            p.stories.splice(si, 1);
            render();
            if (!p.stories.length) close(); else { si = Math.min(si, p.stories.length - 1); show(); }
          });
        });
        foot.appendChild(add); foot.appendChild(del);
        frame.appendChild(foot);
      }
      m.appendChild(frame);
      var bar = bars.children[si].firstChild;
      elapsed = 0; start = performance.now();
      var last = start;
      (function tick(now) {
        if (paused) { last = now; raf = requestAnimationFrame(tick); return; }
        elapsed += now - last; last = now;
        bar.style.width = Math.min(100, (elapsed / STORY_MS) * 100) + '%';
        if (elapsed >= STORY_MS) { next(); return; }
        raf = requestAnimationFrame(tick);
      })(start);
    }
    show();
  }

  // --- composer ------------------------------------------------------------
  function openComposer() {
    var m = modal();
    var bg = BG_KEYS[Math.floor(Math.random() * BG_KEYS.length)];
    var gifs = [];
    var frame = el('div', 'tl-st-frame');
    frame.style.background = BGS[bg];
    var top = el('div', 'tl-st-top');
    var who = el('div', 'tl-st-who', '<span>' + esc(tr('newStory', 'New story')) + '</span>');
    var x = el('button', 'tl-st-close', '&times;');
    x.type = 'button'; x.setAttribute('aria-label', tr('close', 'Close'));
    x.addEventListener('click', function () { closeModal(m); });
    who.appendChild(x);
    top.appendChild(who);
    frame.appendChild(top);
    var ta = document.createElement('textarea');
    ta.className = 'tl-st-edit';
    ta.maxLength = MAX_TEXT;
    ta.rows = 3;
    ta.placeholder = tr('storyPlaceholder', 'Type something…');
    frame.appendChild(ta);

    var tools = el('div', 'tl-st-tools');
    var emoBtn = el('button', 'tl-st-tool', '😊'); emoBtn.type = 'button'; emoBtn.title = tr('emoji', 'Emoji');
    var gifBtn = el('button', 'tl-st-tool', 'GIF'); gifBtn.type = 'button'; gifBtn.title = 'GIF';
    tools.appendChild(emoBtn); tools.appendChild(gifBtn);
    frame.appendChild(tools);

    var foot = el('div', 'tl-st-foot');
    var sw = el('div', 'tl-st-sw');
    BG_KEYS.forEach(function (k) {
      var b = el('button', k === bg ? 'on' : '');
      b.type = 'button';
      b.style.background = BGS[k];
      b.setAttribute('aria-label', k);
      b.addEventListener('click', function () {
        bg = k; frame.style.background = BGS[k];
        Array.prototype.forEach.call(sw.children, function (c) { c.classList.toggle('on', c === b); });
      });
      sw.appendChild(b);
    });
    var post = el('button', 'tl-st-btn primary', esc(tr('storyPost', 'Post')));
    post.type = 'button';
    foot.appendChild(sw); foot.appendChild(post);
    frame.appendChild(foot);
    m.appendChild(frame);
    setTimeout(function () { ta.focus(); }, 50);

    function flash(msg) {
      var e = el('div', 'tl-st-err'); e.textContent = msg;
      frame.appendChild(e);
      setTimeout(function () { e.remove(); }, 2600);
    }

    // A GIF on the story: drag to place, × to remove.
    function placeGif(g) {
      if (gifs.length >= MAX_GIFS) { flash(tr('storyMaxGifs', 'Up to {n} GIFs', { n: MAX_GIFS })); return; }
      var item = { url: g.url, preview: g.preview, w: g.w, h: g.h, x: 0.3 + Math.random() * 0.4, y: 0.25 + Math.random() * 0.5 };
      gifs.push(item);
      var w = el('div', 'tl-st-gif');
      w.style.left = (item.x * 100) + '%'; w.style.top = (item.y * 100) + '%';
      var img = document.createElement('img'); img.src = g.url; img.alt = 'GIF';
      var rm = el('button', 'tl-st-gx', '&times;'); rm.type = 'button';
      rm.addEventListener('click', function (e) { e.stopPropagation(); gifs.splice(gifs.indexOf(item), 1); w.remove(); });
      w.appendChild(img); w.appendChild(rm);
      w.addEventListener('pointerdown', function (e) {
        if (e.target === rm) return;
        e.preventDefault();
        w.setPointerCapture(e.pointerId);
        var rect = frame.getBoundingClientRect();
        function move(ev) {
          item.x = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
          item.y = Math.min(1, Math.max(0, (ev.clientY - rect.top) / rect.height));
          w.style.left = (item.x * 100) + '%'; w.style.top = (item.y * 100) + '%';
        }
        function up() { w.removeEventListener('pointermove', move); w.removeEventListener('pointerup', up); }
        w.addEventListener('pointermove', move);
        w.addEventListener('pointerup', up);
      });
      frame.insertBefore(w, ta);
    }

    var picker = null;
    function closePicker() { if (picker) { picker.remove(); picker = null; } }
    emoBtn.addEventListener('click', function () {
      if (picker) { closePicker(); return; }
      picker = el('div', 'tl-st-pick');
      var grid = el('div', 'tl-st-emo');
      EMOJIS.forEach(function (e) {
        var b = el('button'); b.type = 'button'; b.textContent = e;
        b.addEventListener('click', function () {
          var at = ta.selectionStart == null ? ta.value.length : ta.selectionStart;
          ta.value = (ta.value.slice(0, at) + e + ta.value.slice(ta.selectionEnd || at)).slice(0, MAX_TEXT);
          ta.selectionStart = ta.selectionEnd = at + e.length;
        });
        grid.appendChild(b);
      });
      picker.appendChild(grid);
      frame.appendChild(picker);
    });
    gifBtn.addEventListener('click', function () {
      if (picker) { closePicker(); return; }
      picker = el('div', 'tl-st-pick');
      var q = document.createElement('input');
      q.placeholder = tr('searchGifs', 'Search GIFs');
      var grid = el('div', 'tl-st-grid');
      picker.appendChild(q); picker.appendChild(grid);
      frame.appendChild(picker);
      var seq = 0;
      function load() {
        var my = ++seq;
        var lang = (document.documentElement.lang || 'en').slice(0, 2);
        fetch('/api/gifs?lang=' + encodeURIComponent(lang) + (q.value.trim() ? '&q=' + encodeURIComponent(q.value.trim()) : ''))
          .then(function (r) { return r.ok ? r.json() : { results: [] }; })
          .then(function (j) {
            if (my !== seq || !picker) return;
            grid.innerHTML = '';
            var list = (j && j.results) || [];
            if (!list.length) grid.appendChild(el('div', '', esc(tr('noGifs', 'No GIFs found'))));
            list.forEach(function (g) {
              var im = document.createElement('img'); im.src = g.preview; im.alt = g.alt || 'GIF'; im.loading = 'lazy';
              im.addEventListener('click', function () { placeGif(g); closePicker(); });
              grid.appendChild(im);
            });
          }).catch(function () { /* offline */ });
      }
      var deb = null;
      q.addEventListener('input', function () { clearTimeout(deb); deb = setTimeout(load, 300); });
      load();
      q.focus();
    });

    post.addEventListener('click', function () {
      var text = ta.value.trim();
      if (!text && !gifs.length) { flash(tr('storyEmpty', 'Write something or add a GIF')); return; }
      post.disabled = true;
      ask('story-post', { text: text, bg: bg, gifs: gifs }).then(function (r) {
        post.disabled = false;
        if (!r || !r.ok) { flash((r && r.error) || tr('storyFailed', 'Could not post. Try again.')); return; }
        closeModal(m);
        refresh();
      });
    });
  }

  S.on('stories-changed', function () { refresh(); });
  S.on('connect', function () { setTimeout(refresh, 800); });
  // The first sync after registering: the server knows who this is by then.
  var synced = false;
  S.on('state-sync', function () { if (!synced) { synced = true; refresh(); } });
  injectCss();
  if (S.connected) refresh(); else setTimeout(refresh, 1500);
  window.TalkLiveStories = { refresh: refresh, compose: openComposer };
})();
