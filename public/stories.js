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
    + '.tl-st-frame{position:relative;width:100vw;height:100vh;height:100dvh;overflow:hidden;border-radius:0;color:#fff;container-type:inline-size}'
    + '.tl-st-layer{position:absolute;max-width:82cqw;text-align:center;font-family:inherit;font-size:7.5cqw;font-weight:800;line-height:1.2;white-space:pre-wrap;word-break:break-word;text-shadow:0 3px 10px rgba(0,0,0,.3);pointer-events:none;transform-origin:center}'
    + '.tl-st-layer.emoji{font-size:17cqw;text-shadow:none;line-height:1}.tl-st-layer.pill{text-shadow:none;border-radius:12px;padding:6px 12px}'
    + '.tl-st-layer.f-serif{font-family:Georgia,"Times New Roman",serif;font-style:italic;font-weight:700}.tl-st-layer.f-mono{font-family:"Courier New",ui-monospace,monospace;font-weight:700}'
    + '.tl-st-layer.f-hand{font-family:"Segoe Script","Brush Script MT","Comic Sans MS",cursive;font-weight:500;font-size:9cqw}.tl-st-layer.f-heavy{font-weight:900;letter-spacing:-.02em;font-size:8.2cqw}'
    + '.tl-st-layer.f-neon{font-weight:700}.tl-st-layer.f-outline{font-weight:900;text-shadow:none}.tl-st-layer.f-retro{font-family:Georgia,serif;font-style:italic;font-weight:900;text-shadow:4px 4px 0 rgba(0,0,0,.8)}'
    + '.tl-st-ed .tl-st-stage{position:absolute;inset:0;z-index:1;touch-action:none}.tl-st-ed .tl-st-layer,.tl-st-ed .tl-st-gif{pointer-events:auto;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none}'
    + '.tl-st-ed .sel{outline:1.5px dashed #fffa;outline-offset:6px;border-radius:8px}.tl-st-hint{position:absolute;left:10%;right:10%;top:45%;text-align:center;font-size:clamp(17px,5cqw,24px);font-weight:800;opacity:.75;pointer-events:none;z-index:1}'
    + '.tl-st-guide{position:absolute;display:none;background:#fffc;z-index:2;pointer-events:none}.tl-st-guide.v{left:50%;top:0;bottom:0;width:1.5px}.tl-st-guide.h{top:50%;left:0;right:0;height:1.5px}'
    + '.tl-st-bin{position:absolute;left:50%;bottom:calc(24px + env(safe-area-inset-bottom));width:60px;height:60px;margin-left:-30px;border-radius:50%;background:#0006;border:2px solid #fff;display:none;place-items:center;z-index:4;transition:transform .15s,background .15s;pointer-events:none}'
    + '.tl-st-bin.on{display:grid}.tl-st-bin.over{background:#ef4444;transform:scale(1.25)}'
    + '.tl-st-edrow{display:flex;align-items:center;gap:8px}.tl-st-edtop .tl-st-tool{width:42px;height:42px}.tl-st-tool:disabled{opacity:.35;cursor:default}'
    + '.tl-st-type{position:absolute;inset:0;z-index:7;background:#0009;display:flex;flex-direction:column;padding:12px 12px calc(12px + env(safe-area-inset-bottom))}'
    + '.tl-st-typebar{display:flex;align-items:center;gap:8px}.tl-st-chip{min-width:40px;height:40px;border-radius:10px;border:0;background:#fff3;color:#fff;font:inherit;font-weight:800;padding:0 10px;cursor:pointer}.tl-st-chip.on{background:#fff;color:#111}'
    + '.tl-st-typearea{flex:1;display:flex;align-items:center;justify-content:center;position:relative;min-height:120px}'
    + '.tl-st-typein{width:82%;background:transparent;border:0;outline:0;resize:none;color:#fff;font-family:inherit;font-weight:800;line-height:1.2;text-align:center;border-radius:12px;padding:6px 12px;font-size:7.5cqw}'
    + '.tl-st-typein.f-serif{font-family:Georgia,serif;font-style:italic;font-weight:700}.tl-st-typein.f-mono{font-family:"Courier New",monospace}.tl-st-typein.f-hand{font-family:"Segoe Script","Brush Script MT",cursive;font-weight:500}.tl-st-typein.f-heavy{font-weight:900;text-transform:uppercase}.tl-st-typein.f-retro{font-family:Georgia,serif;font-style:italic;font-weight:900}'
    + '.tl-st-size{position:absolute;left:-58px;top:50%;width:150px;transform:rotate(-90deg);accent-color:#fff}'
    + '.tl-st-fonts,.tl-st-colors{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:6px 0}.tl-st-fonts::-webkit-scrollbar,.tl-st-colors::-webkit-scrollbar{display:none}'
    + '.tl-st-font{flex:none;border:0;border-radius:12px;background:#fff3;color:#fff;padding:8px 14px;font-size:15px;cursor:pointer;position:static;transform:none;max-width:none;text-shadow:none}.tl-st-font.on{background:#fff;color:#111}'
    + '.tl-st-font.f-serif{font-family:Georgia,serif;font-style:italic}.tl-st-font.f-mono{font-family:"Courier New",monospace}.tl-st-font.f-hand{font-family:"Segoe Script","Brush Script MT",cursive}.tl-st-font.f-heavy{font-weight:900;text-transform:uppercase}.tl-st-font.f-neon{text-shadow:0 0 8px #22d3ee}.tl-st-font.f-outline{-webkit-text-stroke:1px currentColor;color:transparent}.tl-st-font.f-retro{font-family:Georgia,serif;font-style:italic;font-weight:900}'
    + '.tl-st-col{flex:none;width:30px;height:30px;border-radius:50%;border:2px solid #fff;cursor:pointer}.tl-st-col.on{transform:scale(1.18)}'
    + '.m-pulse{animation:tlStPulse 1.3s ease-in-out infinite alternate}@keyframes tlStPulse{to{transform:scale(1.09)}}'
    + '.m-wiggle{animation:tlStWig 1.3s ease-in-out infinite alternate}@keyframes tlStWig{from{transform:rotate(-6deg)}to{transform:rotate(6deg)}}'
    + '.m-float{animation:tlStFloat 1.3s ease-in-out infinite alternate}@keyframes tlStFloat{to{transform:translateY(-8px)}}'
    + '.m-pop{animation:tlStPopIn 2.6s linear infinite}@keyframes tlStPopIn{0%{transform:scale(.6)}12%{transform:scale(1.18)}25%,100%{transform:scale(1)}}'
    + '.m-rainbow{animation:tlStHue 3s linear infinite}@keyframes tlStHue{to{filter:hue-rotate(360deg)}}'
    + '@media (min-width:700px){.tl-st-frame{border-radius:18px;height:min(92dvh,calc(100vw * 16 / 9));width:calc(min(92dvh,calc(100vw * 16 / 9)) * 9 / 16)}}'
    + '.tl-st-text{position:absolute;left:8%;right:8%;top:50%;transform:translateY(-50%);text-align:center;font-family:inherit;font-size:clamp(22px,7vmin,34px);font-weight:800;line-height:1.25;white-space:pre-wrap;word-break:break-word;text-shadow:0 2px 12px rgba(0,0,0,.25);pointer-events:none}'
    + '.tl-st-gif{position:absolute;width:40%;transform:translate(-50%,-50%);border-radius:10px;touch-action:none;user-select:none;-webkit-user-drag:none}'
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
    + '.tl-st-prog{position:absolute;left:-3px;top:-3px;width:68px;height:68px;transform:rotate(-90deg);pointer-events:none;overflow:visible}'
    + '.tl-st-prog circle{fill:none;stroke-width:3}.tl-st-prog .trk{stroke:var(--line,rgba(255,255,255,.18))}'
    + '.tl-st-prog .bar{stroke:var(--accent,#2a6fe8);stroke-linecap:round;transition:stroke-dashoffset .65s cubic-bezier(.2,.8,.2,1),stroke .3s}'
    + '.tl-st-prog.failed .bar{stroke:#ef4444}.tl-st-prog.done .bar{stroke:url(#tlStGrad)}'
    + '.tl-st-prog .spin{stroke:rgba(255,255,255,.75);stroke-linecap:round;transform-origin:34px 34px;animation:tlStSpin 1.4s linear infinite}'
    + '@keyframes tlStSpin{to{transform:rotate(360deg)}}'
    + '.tl-st-item.failed .tl-st-name{color:#ef4444}.tl-st-plus.retry{background:#ef4444}'
    + '@media (prefers-reduced-motion:reduce){.tl-st-prog .bar{transition:none}.tl-st-prog .spin{display:none}}'
    + '.tl-st-confirm{position:absolute;inset:0;z-index:9;background:rgba(0,0,0,.6);display:grid;place-items:center;padding:20px}'
    + '.tl-st-confirm>div{background:var(--bg-2,#141a2b);color:var(--text,#f2f4ff);border-radius:20px;padding:22px 20px 16px;max-width:320px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.5)}'
    + '.tl-st-confirm h3{margin:0 0 6px;font-size:18px}.tl-st-confirm p{margin:0 0 16px;opacity:.75;font-size:14px;line-height:1.4}'
    + '.tl-st-confirm .row{display:flex;flex-direction:column;gap:8px}.tl-st-confirm button{border:0;border-radius:12px;padding:12px;font:inherit;font-weight:800;cursor:pointer}'
    + '.tl-st-confirm .keep{background:var(--accent,#2a6fe8);color:#fff}.tl-st-confirm .drop{background:transparent;color:#ef4444}'
    + '.tl-st-list{position:absolute;left:0;right:0;bottom:0;max-height:60%;overflow:auto;z-index:6;background:#111827f5;border-radius:18px 18px 0 0;padding:14px;animation:tlStUp .22s ease-out}.tl-st-list h3{margin:0 0 10px;font-size:16px}.tl-st-list>div{padding:6px 0;opacity:.95;display:flex;align-items:center;gap:10px}'
    + '.tl-st-list .tl-st-av{width:34px;height:34px;border-radius:50%;overflow:hidden;display:grid;place-items:center;flex:none}.tl-st-list .nm{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tl-st-list .rx{font-size:20px}.tl-st-list .hv{color:#ff3b5c}'
    + '@keyframes tlStUp{from{transform:translateY(40%);opacity:0}to{transform:none;opacity:1}}'
    + '.tl-st-up{display:flex;flex-direction:column;align-items:center;line-height:1}.tl-st-up b{font-size:11px;opacity:.8}'
    + '.tl-st-reply{position:absolute;left:0;right:0;bottom:0;z-index:4;padding:10px 12px calc(12px + env(safe-area-inset-bottom));background:linear-gradient(#0000,#000b)}'
    + '.tl-st-rrow{display:flex;gap:8px;align-items:center}.tl-st-rin{flex:1;min-width:0;border:1px solid #fffb;border-radius:999px;background:#0003;color:#fff;font:inherit;padding:11px 16px;outline:0}.tl-st-rin::placeholder{color:#fffc}'
    + '.tl-st-heart,.tl-st-send{border:0;background:none;color:#fff;font-size:28px;line-height:1;cursor:pointer;padding:4px 6px;transition:transform .2s}.tl-st-heart.on{color:#ff3b5c;transform:scale(1.12)}.tl-st-send{font-size:15px;font-weight:800}'
    + '.tl-st-quick{display:none;justify-content:space-around;margin-bottom:10px}.tl-st-reply.open .tl-st-quick{display:flex}.tl-st-quick button{border:0;background:none;font-size:30px;cursor:pointer;padding:4px;transition:transform .15s}.tl-st-quick button:hover{transform:scale(1.2)}'
    + '.tl-st-pop{position:absolute;left:50%;top:50%;z-index:7;font-size:96px;transform:translate(-50%,-50%) scale(.2);opacity:0;animation:tlStPop .8s ease-out;pointer-events:none;color:#ff3b5c}'
    + '@keyframes tlStPop{30%{transform:translate(-50%,-50%) scale(1.1);opacity:1}70%{opacity:1}to{transform:translate(-50%,-60%) scale(1);opacity:0}}'
    + '.tl-st-toast{position:absolute;left:50%;bottom:90px;transform:translateX(-50%);z-index:8;background:#fff;color:#111;padding:8px 14px;border-radius:999px;font-weight:700;font-size:14px}';
  var STORY_REACTIONS = ['😂', '😮', '😍', '😢', '👏', '🔥', '🎉', '💯'];

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

  // --- drafts: kept on this device until posted or discarded ----------------
  var DRAFT_KEY = 'tl_story_draft';
  function loadDraft() {
    try { var d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); return d && ((d.text && d.text.trim()) || (d.gifs && d.gifs.length)) ? d : null; } catch (e) { return null; }
  }
  function saveDraft(d) {
    try { if (!d.text.trim() && !d.gifs.length) localStorage.removeItem(DRAFT_KEY); else localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch (e) { /* storage blocked */ }
  }
  function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* storage blocked */ } }

  // --- posting: the ring around "Your story" follows the real steps ---------
  //   waiting (no connection yet) -> sending (asked the server) -> saved (it
  //   answered) -> published (it is in the fetched list) | failed (tap to retry).
  var STAGE_P = { waiting: 0.08, sending: 0.45, saved: 0.85, published: 1, failed: 1 };
  var upload = null, lastP = 0;
  function setUpload(u) { upload = u; render(); }
  function waitConnected(ms) {
    return new Promise(function (res) {
      if (S.connected) { res(true); return; }
      var tm = setTimeout(function () { S.off('connect', on); res(false); }, ms);
      function on() { clearTimeout(tm); S.off('connect', on); setTimeout(function () { res(true); }, 700); }
      S.on('connect', on);
    });
  }
  function publish(data) {
    setUpload({ stage: 'waiting', data: data });
    waitConnected(15000).then(function (ok) {
      if (!ok) { setUpload({ stage: 'failed', data: data, error: tr('storyNoConnection', 'No connection') }); return; }
      setUpload({ stage: 'sending', data: data });
      ask('story-post', { text: String(data.text || '').trim(), bg: data.bg, gifs: data.gifs, layers: data.layers || [] }).then(function (r) {
        if (!r || !r.ok) { setUpload({ stage: 'failed', data: data, error: (r && r.error) || tr('storyFailed', 'Could not post. Try again.') }); return; }
        setUpload({ stage: 'saved', data: data });
        var id = r.id;
        ask('stories-get').then(function (f) {
          if (f && f.ok) people = f.people || [];
          var me = people.find(function (p) { return p.mine; });
          var there = !!(me && me.stories.some(function (st) { return st.id === id; }));
          clearDraft();
          setUpload({ stage: 'published', data: data, there: there });
          setTimeout(function () { if (upload && upload.stage === 'published') { upload = null; lastP = 0; render(); } }, 1400);
        });
      });
    });
  }
  function progressSvg() {
    if (!upload) return '';
    var C = 2 * Math.PI * 31, p = STAGE_P[upload.stage] || 0;
    var busy = upload.stage === 'waiting' || upload.stage === 'sending' || upload.stage === 'saved';
    var cls = upload.stage === 'failed' ? ' failed' : upload.stage === 'published' ? ' done' : '';
    var svg = '<svg class="tl-st-prog' + cls + '" viewBox="0 0 68 68" aria-hidden="true">'
      + '<defs><linearGradient id="tlStGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f59e0b"/><stop offset=".5" stop-color="#ec4899"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs>'
      + '<circle class="trk" cx="34" cy="34" r="31"/>'
      + '<circle class="bar" cx="34" cy="34" r="31" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - lastP)).toFixed(1) + '" data-to="' + (C * (1 - p)).toFixed(1) + '"/>'
      + (busy ? '<circle class="spin" cx="34" cy="34" r="31" stroke-dasharray="22 ' + (C - 22).toFixed(1) + '"/>' : '')
      + '</svg>';
    lastP = p;
    return svg;
  }

  function render() {
    var r = ensureRow();
    if (!r) return;
    r.innerHTML = '';
    var me = people.find(function (p) { return p.mine; });
    var meHas = me && me.stories.length;
    var failed = upload && upload.stage === 'failed';
    var busy = upload && !failed && upload.stage !== 'published';
    var mine = el('button', 'tl-st-item' + (failed ? ' failed' : ''));
    mine.type = 'button';
    var label = !upload ? tr('yourStory', 'Your story') : failed ? tr('storyNotPosted', 'Not posted') : upload.stage === 'published' ? tr('storyPosted', 'Posted') : tr('storyPosting', 'Posting…');
    mine.innerHTML = '<span class="tl-st-ring ' + (upload ? 'none' : meHas ? 'seen' : 'none') + '">' + progressSvg() + '<span class="tl-st-av">' + face(me && me.avatar, 56) + '</span>'
      + (busy ? '' : '<span class="tl-st-plus' + (failed ? ' retry' : '') + '">' + (failed ? '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/></svg>' : '+') + '</span>') + '</span>'
      + '<span class="tl-st-name">' + esc(label) + '</span>';
    if (failed) mine.title = upload.error || '';
    mine.addEventListener('click', function () {
      if (failed) { publish(upload.data); return; }
      if (busy) return;
      if (meHas) openViewer(people.indexOf(me), 0); else openComposer();
    });
    // The ring moves from where it was to the new step.
    requestAnimationFrame(function () {
      var bar = mine.querySelector('.tl-st-prog .bar');
      if (bar) bar.setAttribute('stroke-dashoffset', bar.getAttribute('data-to'));
    });
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

  var GRADS = { 'g:sunset': ['#f97316', '#ec4899'], 'g:ocean': ['#06b6d4', '#3b82f6'], 'g:candy': ['#f472b6', '#a855f7'], 'g:aurora': ['#22c55e', '#06b6d4', '#a855f7'], 'g:gold': ['#fde68a', '#f59e0b'] };
  var FONTS = { serif: 1, mono: 1, hand: 1, heavy: 1, neon: 1, outline: 1, retro: 1 };
  var MOTIONS = { type: 1, pulse: 1, wiggle: 1, float: 1, pop: 1, rainbow: 1 };
  // Words typed on letter by letter, held, then typed again - while the story is open.
  function typeOn(node, text) {
    var i = 0;
    (function step() {
      if (!node.isConnected) return;
      node.textContent = text.slice(0, i);
      if (i < text.length) { i++; setTimeout(step, 55); } else setTimeout(function () { i = 0; step(); }, 2400);
    })();
  }
  function lightColor(h) {
    var n = parseInt(h.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.6;
  }
  // Where a GIF, word or emoji sits: its centre, size and turn.
  function place(node, o) {
    node.style.left = (o.x * 100) + '%';
    node.style.top = (o.y * 100) + '%';
    node.style.transform = 'translate(-50%,-50%) rotate(' + (+o.r || 0) + 'deg) scale(' + (+o.s || 1) + ')';
  }
  // A GIF: its small preview at once (often already loaded by the picker), then the full
  // GIF once it has arrived - never a blank space while it loads.
  function gifEl(g) {
    var w = el('div', 'tl-st-gif');
    place(w, g);
    var img = document.createElement('img');
    img.alt = 'GIF'; img.loading = 'eager'; img.draggable = false;
    img.src = g.preview || g.url;
    if (g.preview && g.preview !== g.url) {
      var full = new Image();
      full.onload = function () { img.src = g.url; };
      full.src = g.url;
    }
    w.appendChild(img);
    return w;
  }
  // Words or an emoji in their style, colour, alignment and (when watched) motion.
  function layerEl(l, animate) {
    var d = el('div', 'tl-st-layer' + (l.t === 'emoji' ? ' emoji' : '') + (l.b ? ' pill' : ''));
    d.textContent = l.text;
    place(d, l);
    if (l.t === 'text') {
      var grad = GRADS[l.c];
      var c = grad ? grad[0] : (/^#[0-9a-f]{6}$/i.test(l.c || '') ? l.c : '#ffffff');
      var paint = grad ? 'linear-gradient(90deg,' + grad.join(',') + ')' : c;
      if (l.f && FONTS[l.f]) d.className += ' f-' + l.f;
      if (l.a === 'left' || l.a === 'right') d.style.textAlign = l.a;
      if (l.b) { d.style.background = paint; d.style.color = lightColor(c) ? '#111111' : '#ffffff'; }
      else if (l.f === 'neon') { d.style.color = '#ffffff'; d.style.textShadow = '0 0 6px ' + c + ',0 0 18px ' + c + ',0 0 32px ' + c; }
      else if (l.f === 'outline') { d.style.color = 'transparent'; d.style.webkitTextStroke = '0.045em ' + c; }
      else if (grad) {
        // A gradient fill: a text-shadow would paint over it, so the shadow becomes a filter.
        d.style.backgroundImage = paint; d.style.webkitBackgroundClip = 'text'; d.style.backgroundClip = 'text'; d.style.color = 'transparent';
        d.style.textShadow = 'none';
        d.style.filter = l.f === 'retro' ? 'drop-shadow(4px 4px 0 rgba(0,0,0,.8))' : 'drop-shadow(0 3px 8px rgba(0,0,0,.3))';
      }
      else d.style.color = c;
      if (l.f === 'heavy') d.textContent = String(l.text).toUpperCase();
    }
    // Motions: type on, pulse, wiggle, float, pop, rainbow (still under reduced motion).
    if (animate && l.m && MOTIONS[l.m] && !(window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches)) {
      var inner = document.createElement('span');
      inner.className = 'tl-st-mo m-' + l.m;
      inner.style.display = 'inline-block';
      while (d.firstChild) inner.appendChild(d.firstChild);
      d.appendChild(inner);
      if (l.m === 'type') typeOn(inner, d.textContent);
      // Rainbow words: a rainbow fill whose colours keep turning (emoji just shift hue).
      if (l.m === 'rainbow' && l.t === 'text' && !l.b && l.f !== 'outline') {
        inner.style.backgroundImage = 'linear-gradient(90deg,#f43f5e,#f59e0b,#22c55e,#3b82f6,#a855f7)';
        inner.style.webkitBackgroundClip = 'text'; inner.style.backgroundClip = 'text'; inner.style.color = 'transparent';
      }
    }
    return d;
  }
  function storyNode(s) {
    var frame = el('div', 'tl-st-frame');
    frame.style.background = BGS[s.bg] || BGS.blue;
    (s.gifs || []).forEach(function (g) { frame.appendChild(gifEl(g)); });
    // Words and emoji placed, sized and turned anywhere (newer stories); sizes follow the
    // story's width (cqw), so it looks the same as on the phone that made it.
    var layers = s.layers || [];
    layers.forEach(function (l) { frame.appendChild(layerEl(l, true)); });
    if (!layers.length && s.text) frame.appendChild(el('div', 'tl-st-text')).textContent = s.text;
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
      function toast(text) {
        var t = el('div', 'tl-st-toast', esc(text));
        frame.appendChild(t);
        setTimeout(function () { t.remove(); }, 1600);
      }
      function viewersList() {
        if (frame.querySelector('.tl-st-list')) return;
        paused = true;
        var views = s.views || [];
        var head = esc(tr('storySeenBy', 'Seen by')) + ' · ' + views.length + (s.likeCount ? ' &nbsp;<span class="hv">♥</span> ' + s.likeCount : '');
        var list = el('div', 'tl-st-list', '<h3>' + head + '</h3>');
        if (!views.length) list.appendChild(el('div', '', esc(tr('storyNoViews', 'No one yet'))));
        views.forEach(function (v) {
          var row = el('div', '', '<span class="tl-st-av">' + face(v.avatar || null, 34) + '</span><span class="nm">' + esc(v.name || tr('aFriend', 'A friend')) + '</span>'
            + (v.reaction ? '<span class="rx">' + esc(v.reaction) + '</span>' : '') + (v.liked ? '<span class="hv">♥</span>' : ''));
          list.appendChild(row);
        });
        list.addEventListener('click', function () { list.remove(); paused = false; });
        frame.appendChild(list);
      }
      var reply = null, input = null;
      function like(on) {
        s.liked = on;
        if (reply) reply.querySelector('.tl-st-heart').classList.toggle('on', on);
        if (reply) reply.querySelector('.tl-st-heart').textContent = on ? '♥' : '♡';
        if (on) { var pop = el('div', 'tl-st-pop', '♥'); frame.appendChild(pop); setTimeout(function () { pop.remove(); }, 850); }
        ask('story-like', { clientId: p.clientId, id: s.id, on: on }).then(function (r) { if (!r || !r.ok) { s.liked = !on; show(); } });
      }
      function openReply() { if (!reply) return; reply.classList.add('open'); paused = true; input.focus(); }
      function sent(r) {
        toast(r && r.ok ? tr('storySent', 'Sent to their inbox') : tr('couldntSend', 'Could not send'));
        if (reply) reply.classList.remove('open');
        if (input) { input.value = ''; input.blur(); }
        paused = false;
      }
      if (p.mine) {
        var foot = el('div', 'tl-st-foot');
        var views = (s.views || []);
        var vb = el('button', 'tl-st-views tl-st-up');
        vb.type = 'button';
        vb.innerHTML = '<b>⌃</b><span>👁 ' + esc(tr('storyViews', '{n} views', { n: views.length })) + (s.likeCount ? ' · <span style="color:#ff3b5c">♥</span> ' + s.likeCount : '') + '</span>';
        vb.addEventListener('click', viewersList);
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
      } else {
        // A friend's story: reply, react or like, as on Instagram. Replies and
        // reactions go to their inbox with a preview of this story.
        reply = el('div', 'tl-st-reply');
        var quick = el('div', 'tl-st-quick');
        STORY_REACTIONS.forEach(function (e) {
          var b = el('button', '', e);
          b.type = 'button';
          b.addEventListener('click', function (ev) { ev.stopPropagation(); ask('story-react', { clientId: p.clientId, id: s.id, emoji: e }).then(sent); });
          quick.appendChild(b);
        });
        reply.appendChild(quick);
        var row = el('div', 'tl-st-rrow');
        input = el('input', 'tl-st-rin');
        input.type = 'text'; input.maxLength = 1000; input.enterKeyHint = 'send';
        input.placeholder = tr('storyReplyTo', 'Reply to {name}…', { name: p.name });
        var heart = el('button', 'tl-st-heart' + (s.liked ? ' on' : ''), s.liked ? '♥' : '♡');
        heart.type = 'button'; heart.setAttribute('aria-label', tr('storyLike', 'Like'));
        var send = el('button', 'tl-st-send', esc(tr('send', 'Send')));
        send.type = 'button'; send.style.display = 'none';
        function doSend() {
          var t = input.value.trim();
          if (!t) return;
          ask('story-reply', { clientId: p.clientId, id: s.id, text: t }).then(sent);
        }
        input.addEventListener('focus', function () { reply.classList.add('open'); paused = true; });
        input.addEventListener('input', function () { var has = !!input.value.trim(); send.style.display = has ? '' : 'none'; heart.style.display = has ? 'none' : ''; });
        input.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Enter') doSend(); if (e.key === 'Escape') { input.blur(); reply.classList.remove('open'); paused = false; } });
        input.addEventListener('blur', function () { if (!input.value.trim()) setTimeout(function () { if (document.activeElement !== input) { reply.classList.remove('open'); paused = false; } }, 200); });
        heart.addEventListener('click', function () { like(!s.liked); });
        send.addEventListener('click', doSend);
        ['pointerdown', 'pointerup'].forEach(function (ev) { reply.addEventListener(ev, function (e) { e.stopPropagation(); }); });
        row.appendChild(input); row.appendChild(heart); row.appendChild(send);
        reply.appendChild(row);
        frame.appendChild(reply);
        // Double tap likes, as on Instagram.
        frame.addEventListener('dblclick', function (e) { if (!reply.contains(e.target) && !s.liked) like(true); });
      }
      // Swipe up: your own story shows who saw it; a friend's opens the reply box. Swipe down closes.
      var y0 = null;
      frame.addEventListener('touchstart', function (e) { y0 = e.touches[0].clientY; }, { passive: true });
      frame.addEventListener('touchend', function (e) {
        if (y0 == null) return;
        var dy = e.changedTouches[0].clientY - y0;
        y0 = null;
        if (dy < -70) { if (p.mine) viewersList(); else openReply(); }
        else if (dy > 120 && !(reply && reply.classList.contains('open'))) close();
      });
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
  // Like the app's: tap to write, then move words, emoji and GIFs with a finger or the
  // mouse; pinch (touch or trackpad) or the mouse wheel sizes them, two fingers or
  // Shift+wheel turn them; tap words to change them; drop anything on the bin (or press
  // Delete) to remove it; hold to duplicate; Undo / Redo (Ctrl+Z / Ctrl+Y). Eight type
  // styles, colours and gradients, alignment, a size slider and motions.
  var TEXT_COLORS = ['#ffffff', '#111111', '#facc15', '#ef4444', '#3b82f6', '#22c55e', '#ec4899', '#a855f7', '#f97316'];
  var FONT_LIST = ['classic', 'serif', 'mono', 'hand', 'heavy', 'neon', 'outline', 'retro'];
  var FONT_NAMES = { classic: 'Classic', serif: 'Elegant', mono: 'Typewriter', hand: 'Handwritten', heavy: 'Loud', neon: 'Neon', outline: 'Outline', retro: 'Retro' };
  var MOTION_LIST = ['none', 'type', 'pulse', 'wiggle', 'float', 'pop', 'rainbow'];
  var MOTION_NAMES = { none: 'Still', type: 'Type on', pulse: 'Pulse', wiggle: 'Wiggle', float: 'Float', pop: 'Pop', rainbow: 'Rainbow' };
  var EMOJI_PICKS = EMOJIS;

  function openComposer() {
    var m = modal();
    var draft = loadDraft();
    var bg = draft && BGS[draft.bg] ? draft.bg : BG_KEYS[Math.floor(Math.random() * BG_KEYS.length)];
    var seq = 0;
    function nid() { seq++; return 'i' + seq + '_' + Date.now().toString(36); }
    var gifs = [], layers = [];
    if (draft) {
      (draft.gifs || []).forEach(function (g) {
        if (gifs.length < MAX_GIFS && g && g.url && !gifs.some(function (x) { return x.url === g.url; })) {
          gifs.push({ id: nid(), url: g.url, preview: g.preview, w: g.w, h: g.h, x: +g.x || 0.5, y: +g.y || 0.4, s: +g.s || 1, r: +g.r || 0 });
        }
      });
      (draft.layers || []).forEach(function (l) { if (l && l.text) layers.push(Object.assign({}, l, { id: nid() })); });
      // A draft from before layers: its words become one text in the middle.
      if (draft.text && String(draft.text).trim() && !(draft.layers || []).length) layers.push({ id: nid(), t: 'text', text: String(draft.text).slice(0, 300), x: 0.5, y: 0.45, s: 1, r: 0, c: '#ffffff' });
    }
    function strip(o) { var c = Object.assign({}, o); delete c.id; return c; }
    function keep() { saveDraft({ text: '', bg: bg, gifs: gifs.map(strip), layers: layers.map(strip) }); }
    function isEmpty() { return !gifs.length && !layers.length; }

    // Undo / Redo: the whole story before each change.
    var undoS = [], redoS = [];
    function snapshot() { return JSON.stringify({ bg: bg, gifs: gifs, layers: layers }); }
    function record() { undoS.push(snapshot()); if (undoS.length > 40) undoS.shift(); redoS = []; syncHistory(); }
    function restore(sv) { var o = JSON.parse(sv); bg = o.bg; gifs = o.gifs; layers = o.layers; frame.style.background = BGS[bg]; syncSwatches(); paint(); keep(); }
    function undo() { if (!undoS.length) return; redoS.push(snapshot()); restore(undoS.pop()); syncHistory(); }
    function redo() { if (!redoS.length) return; undoS.push(snapshot()); restore(redoS.pop()); syncHistory(); }

    // Back (browser or phone), Esc and the X all ask before anything is lost.
    var pushed = false, closed = false;
    try { history.pushState({ tlStory: 1 }, ''); pushed = true; } catch (e) { /* no history */ }
    function onPop() { if (closed) return; pushed = false; requestClose(); }
    function onKey(e) {
      if (typing) { if (e.key === 'Escape') { e.preventDefault(); finishText(); } return; }
      if (e.key === 'Escape') { e.preventDefault(); requestClose(); return; }
      var mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (mod && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); redo(); return; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected && !picker) { e.preventDefault(); record(); removeItem(selected); keep(); paint(); }
    }
    window.addEventListener('popstate', onPop);
    document.addEventListener('keydown', onKey);
    function done() {
      closed = true;
      window.removeEventListener('popstate', onPop);
      document.removeEventListener('keydown', onKey);
      if (pushed) { pushed = false; try { history.back(); } catch (e) { /* fine */ } }
      closeModal(m);
    }
    function repush() { if (!pushed) { try { history.pushState({ tlStory: 1 }, ''); pushed = true; } catch (e) { /* fine */ } } }
    function requestClose() {
      if (typing) { finishText(); repush(); return; }
      if (picker) { closePicker(); repush(); return; }
      if (isEmpty()) { clearDraft(); done(); return; }
      if (frame.querySelector('.tl-st-confirm')) return;
      var c = el('div', 'tl-st-confirm', '<div><h3>' + esc(tr('storyLeaveTitle', 'Discard this story?')) + '</h3><p>' + esc(tr('storyLeaveBody', 'Your story is not posted yet. Keep editing, or discard it.')) + '</p>'
        + '<div class="row"><button type="button" class="keep">' + esc(tr('storyKeepEditing', 'Continue editing')) + '</button><button type="button" class="drop">' + esc(tr('storyDiscard', 'Discard story')) + '</button></div></div>');
      c.querySelector('.keep').addEventListener('click', function () { c.remove(); repush(); });
      c.querySelector('.drop').addEventListener('click', function () { clearDraft(); done(); });
      frame.appendChild(c);
      c.querySelector('.keep').focus();
    }

    var frame = el('div', 'tl-st-frame tl-st-ed');
    frame.style.background = BGS[bg];
    var stage = el('div', 'tl-st-stage');
    var hint = el('div', 'tl-st-hint', esc(tr('storyTapToWrite', 'Tap to write, or add emoji and GIFs. Drag to move, pinch or scroll to resize, hold to copy.')));
    var guideV = el('div', 'tl-st-guide v'), guideH = el('div', 'tl-st-guide h');
    var bin = el('div', 'tl-st-bin', '<svg viewBox="0 0 24 24" width="26" height="26" fill="#fff" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4zm-3 6h12l-1 12H7z"/></svg>');
    frame.appendChild(stage); frame.appendChild(hint); frame.appendChild(guideV); frame.appendChild(guideH); frame.appendChild(bin);

    var top = el('div', 'tl-st-top tl-st-edtop');
    var x = el('button', 'tl-st-close', '&times;');
    x.type = 'button'; x.setAttribute('aria-label', tr('close', 'Close'));
    x.addEventListener('click', function () { requestClose(); });
    function toolBtn(label, title, fn) { var b = el('button', 'tl-st-tool', label); b.type = 'button'; b.title = title; b.setAttribute('aria-label', title); b.addEventListener('click', fn); return b; }
    var undoBtn = toolBtn('↶', tr('storyUndo', 'Undo'), undo);
    var redoBtn = toolBtn('↷', tr('storyRedo', 'Redo'), redo);
    function syncHistory() { undoBtn.disabled = !undoS.length; redoBtn.disabled = !redoS.length; }
    var row = el('div', 'tl-st-edrow');
    row.appendChild(x); row.appendChild(undoBtn); row.appendChild(redoBtn);
    var sp = el('span'); sp.style.flex = '1'; row.appendChild(sp);
    row.appendChild(toolBtn('Aa', tr('storyAddText', 'Add text'), function () { editText(null); }));
    row.appendChild(toolBtn('😊', tr('emoji', 'Emoji'), function () { openEmoji(); }));
    row.appendChild(toolBtn('GIF', 'GIF', function () { openGifs(); }));
    top.appendChild(row);
    frame.appendChild(top);

    var foot = el('div', 'tl-st-foot');
    var sw = el('div', 'tl-st-sw');
    function syncSwatches() { Array.prototype.forEach.call(sw.children, function (c) { c.classList.toggle('on', c.getAttribute('aria-label') === bg); }); }
    BG_KEYS.forEach(function (k) {
      var b = el('button', k === bg ? 'on' : '');
      b.type = 'button';
      b.style.background = BGS[k];
      b.setAttribute('aria-label', k);
      b.addEventListener('click', function () { if (k === bg) return; record(); bg = k; frame.style.background = BGS[k]; syncSwatches(); keep(); });
      sw.appendChild(b);
    });
    var post = el('button', 'tl-st-btn primary', esc(tr('storyPost', 'Post')));
    post.type = 'button';
    foot.appendChild(sw); foot.appendChild(post);
    frame.appendChild(foot);
    m.appendChild(frame);
    syncHistory();

    function flash(msg) {
      var e = el('div', 'tl-st-err'); e.textContent = msg;
      frame.appendChild(e);
      setTimeout(function () { e.remove(); }, 2600);
    }

    // --- the things on the story ---
    var selected = null, typing = null;
    function itemOf(id) { return layers.filter(function (l) { return l.id === id; })[0] || gifs.filter(function (g) { return g.id === id; })[0] || null; }
    function nodeOf(id) { return stage.querySelector('[data-id="' + id + '"]'); }
    function removeItem(id) {
      layers = layers.filter(function (l) { return l.id !== id; });
      gifs = gifs.filter(function (g) { return g.id !== id; });
      if (selected === id) selected = null;
    }
    function bringFront(id) {
      var i = layers.findIndex(function (l) { return l.id === id; });
      if (i >= 0 && i < layers.length - 1) layers.push(layers.splice(i, 1)[0]);
      var j = gifs.findIndex(function (g) { return g.id === id; });
      if (j >= 0 && j < gifs.length - 1) gifs.push(gifs.splice(j, 1)[0]);
    }
    function paint() {
      stage.innerHTML = '';
      gifs.forEach(function (g) { var n = gifEl(g); n.dataset.id = g.id; if (g.id === selected) n.classList.add('sel'); stage.appendChild(n); });
      layers.forEach(function (l) {
        if (typing && typing.id === l.id) return;
        var n = layerEl(l, true); n.dataset.id = l.id; if (l.id === selected) n.classList.add('sel'); stage.appendChild(n);
      });
      hint.style.display = isEmpty() && !typing ? '' : 'none';
    }
    function duplicate(id) {
      var it = itemOf(id);
      if (!it) return;
      if (!it.t && gifs.length >= MAX_GIFS) { flash(tr('storyMaxGifs', 'Up to {n} GIFs', { n: MAX_GIFS })); return; }
      record();
      var copy = Object.assign({}, it, { id: nid(), x: Math.min(1, it.x + 0.05), y: Math.min(1, it.y + 0.05) });
      if (it.t) layers.push(copy); else gifs.push(copy);
      selected = copy.id;
      keep(); paint();
      if (navigator.vibrate) navigator.vibrate(20);
    }

    // --- one gesture system: what is under the first finger moves; a second finger anywhere sizes and turns it ---
    var pts = {}, active = null, moved = false, recorded = false, longT = null, longDone = false, start = null, last = null;
    var overBin = false;
    function rect() { return frame.getBoundingClientRect(); }
    function pair() {
      var ids = Object.keys(pts);
      var a = pts[ids[0]], b = pts[ids[1]];
      return { d: Math.hypot(b.x - a.x, b.y - a.y) || 1, ang: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
    }
    function snapTo(it) {
      var nv = Math.abs(it.x - 0.5) < 0.015, nh = Math.abs(it.y - 0.5) < 0.012;
      if (nv) it.x = 0.5; if (nh) it.y = 0.5;
      guideV.style.display = nv ? 'block' : 'none'; guideH.style.display = nh ? 'block' : 'none';
      var ob = it.y > 0.84 && Math.abs(it.x - 0.5) < 0.16;
      if (ob !== overBin) { overBin = ob; bin.classList.toggle('over', ob); if (ob && navigator.vibrate) navigator.vibrate(15); }
    }
    function beginMove() { if (!recorded) { record(); recorded = true; } moved = true; bin.classList.add('on'); clearTimeout(longT); }
    stage.addEventListener('pointerdown', function (e) {
      if (typing) return;
      try { stage.setPointerCapture(e.pointerId); } catch (_) { /* fine */ }
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      var n = Object.keys(pts).length;
      if (n === 1) {
        var hit = e.target.closest && e.target.closest('[data-id]');
        active = hit ? hit.dataset.id : null;
        moved = false; recorded = false; longDone = false; start = null; last = { x: e.clientX, y: e.clientY };
        if (active) {
          selected = active; bringFront(active);
          var node = nodeOf(active); if (node) { stage.appendChild(node); Array.prototype.forEach.call(stage.children, function (c) { c.classList.toggle('sel', c === node); }); }
          longT = setTimeout(function () { if (!moved && active) { longDone = true; duplicate(active); } }, 550);
        }
      } else if (n === 2) {
        if (!active) active = selected;
        clearTimeout(longT);
        var it = itemOf(active);
        if (it) { var p = pair(); start = { d: p.d, ang: p.ang, cx: p.cx, cy: p.cy, s: it.s || 1, r: it.r || 0, x: it.x, y: it.y }; }
      }
    });
    stage.addEventListener('pointermove', function (e) {
      if (!pts[e.pointerId]) return;
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      var it = active && itemOf(active);
      if (!it) return;
      var R = rect();
      var n = Object.keys(pts).length;
      if (n >= 2 && start) {
        var p = pair();
        beginMove();
        it.s = Math.min(5, Math.max(0.3, start.s * p.d / start.d));
        it.r = ((start.r + p.ang - start.ang + 540) % 360) - 180;
        it.x = Math.min(1, Math.max(0, start.x + (p.cx - start.cx) / R.width));
        it.y = Math.min(1, Math.max(0, start.y + (p.cy - start.cy) / R.height));
      } else if (n === 1) {
        var dx = e.clientX - last.x, dy = e.clientY - last.y;
        if (!moved && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 6) return;
        beginMove();
        it.x = Math.min(1, Math.max(0, it.x + dx / R.width));
        it.y = Math.min(1, Math.max(0, it.y + dy / R.height));
        last = { x: e.clientX, y: e.clientY };
      }
      snapTo(it);
      var node = nodeOf(it.id); if (node) place(node, it);
    });
    function up(e) {
      delete pts[e.pointerId];
      var n = Object.keys(pts).length;
      if (n === 1) { var k = Object.keys(pts)[0]; last = { x: pts[k].x, y: pts[k].y }; start = null; return; }
      if (n > 0) return;
      clearTimeout(longT);
      bin.classList.remove('on'); guideV.style.display = 'none'; guideH.style.display = 'none';
      if (moved) {
        if (overBin && active) { removeItem(active); if (navigator.vibrate) navigator.vibrate(25); }
        overBin = false; bin.classList.remove('over');
        keep(); paint();
      } else if (!longDone) {
        var it = active && itemOf(active);
        if (it && it.t === 'text') editText(it);
        else if (!active) { if (picker) closePicker(); else editText(null); }
      }
      active = null;
    }
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    // Mouse and trackpad: the wheel (or a trackpad pinch) sizes what is selected; Shift turns it.
    var wheelT = null;
    stage.addEventListener('wheel', function (e) {
      var it = selected && itemOf(selected);
      if (!it) return;
      e.preventDefault();
      if (!wheelT) record();
      clearTimeout(wheelT); wheelT = setTimeout(function () { wheelT = null; keep(); }, 400);
      if (e.shiftKey) it.r = ((it.r + (e.deltaY > 0 ? 6 : -6) + 540) % 360) - 180;
      else it.s = Math.min(5, Math.max(0.3, it.s * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015))));
      var node = nodeOf(it.id); if (node) place(node, it);
    }, { passive: false });

    // --- writing: its own layer, everything above the keyboard ---
    function editText(l) {
      closePicker();
      typing = l ? Object.assign({}, l) : { id: nid(), t: 'text', text: '', x: 0.5, y: 0.42, s: 1, r: 0, c: '#ffffff', f: 'classic', a: 'center', m: 'none' };
      typing.f = typing.f || 'classic'; typing.a = typing.a || 'center'; typing.m = typing.m || 'none';
      var isNew = !l;
      paint();
      var ov = el('div', 'tl-st-type');
      var bar = el('div', 'tl-st-typebar');
      var hl = el('button', 'tl-st-chip', 'A'); hl.type = 'button'; hl.title = tr('storyHighlight', 'Highlight');
      var al = el('button', 'tl-st-chip', '≡'); al.type = 'button'; al.title = tr('storyAlign', 'Alignment');
      var mo = el('button', 'tl-st-chip', ''); mo.type = 'button'; mo.title = tr('storyMotion', 'Motion');
      var dn = el('button', 'tl-st-btn primary', esc(tr('done', 'Done'))); dn.type = 'button';
      var spc = el('span'); spc.style.flex = '1';
      bar.appendChild(hl); bar.appendChild(al); bar.appendChild(mo); bar.appendChild(spc); bar.appendChild(dn);
      var area = el('div', 'tl-st-typearea');
      var ta = document.createElement('textarea');
      ta.className = 'tl-st-typein'; ta.maxLength = 300; ta.rows = 2; ta.value = typing.text;
      ta.placeholder = tr('storyPlaceholder', 'Type something…');
      area.appendChild(ta);
      var size = document.createElement('input');
      size.type = 'range'; size.min = '0.5'; size.max = '3'; size.step = '0.05'; size.value = String(typing.s || 1);
      size.className = 'tl-st-size'; size.setAttribute('aria-label', tr('storySize', 'Size'));
      area.appendChild(size);
      var fonts = el('div', 'tl-st-fonts');
      FONT_LIST.forEach(function (f) {
        var b = el('button', 'tl-st-font f-' + f, esc(tr('storyFont_' + f, FONT_NAMES[f]))); b.type = 'button'; b.dataset.f = f;
        b.addEventListener('click', function () { typing.f = f; sync(); });
        fonts.appendChild(b);
      });
      var colors = el('div', 'tl-st-colors');
      TEXT_COLORS.concat(Object.keys(GRADS)).forEach(function (c) {
        var b = el('button', 'tl-st-col'); b.type = 'button'; b.dataset.c = c;
        b.style.background = GRADS[c] ? 'linear-gradient(135deg,' + GRADS[c].join(',') + ')' : c;
        b.addEventListener('click', function () { typing.c = c; sync(); });
        colors.appendChild(b);
      });
      ov.appendChild(bar); ov.appendChild(area); ov.appendChild(fonts); ov.appendChild(colors);
      frame.appendChild(ov);
      function sync() {
        var grad = GRADS[typing.c];
        var c = grad ? grad[0] : typing.c;
        ta.className = 'tl-st-typein f-' + typing.f;
        ta.style.textAlign = typing.a;
        ta.style.fontSize = (7.5 * (+typing.s || 1)) + 'cqw';
        if (typing.b) { ta.style.background = grad ? 'linear-gradient(90deg,' + grad.join(',') + ')' : c; ta.style.color = lightColor(c) ? '#111111' : '#ffffff'; }
        else { ta.style.background = 'transparent'; ta.style.color = typing.f === 'neon' ? '#ffffff' : c; }
        ta.style.textShadow = typing.f === 'neon' ? '0 0 6px ' + c + ',0 0 18px ' + c : '';
        hl.classList.toggle('on', !!typing.b);
        al.textContent = typing.a === 'left' ? '⇤' : typing.a === 'right' ? '⇥' : '≡';
        mo.textContent = '✦ ' + tr('storyMotion_' + typing.m, MOTION_NAMES[typing.m]);
        mo.classList.toggle('on', typing.m !== 'none');
        Array.prototype.forEach.call(fonts.children, function (b) { b.classList.toggle('on', b.dataset.f === typing.f); });
        Array.prototype.forEach.call(colors.children, function (b) { b.classList.toggle('on', b.dataset.c === typing.c); });
      }
      hl.addEventListener('click', function () { typing.b = !typing.b; sync(); });
      al.addEventListener('click', function () { typing.a = typing.a === 'center' ? 'left' : typing.a === 'left' ? 'right' : 'center'; sync(); });
      mo.addEventListener('click', function () { typing.m = MOTION_LIST[(MOTION_LIST.indexOf(typing.m) + 1) % MOTION_LIST.length]; sync(); });
      size.addEventListener('input', function () { typing.s = +size.value; sync(); });
      ta.addEventListener('input', function () { typing.text = ta.value; });
      dn.addEventListener('click', function () { finishText(); });
      area.addEventListener('pointerdown', function (e) { if (e.target === area) finishText(); });
      typing.ov = ov; typing.isNew = isNew;
      sync();
      setTimeout(function () { ta.focus(); }, 30);
    }
    function finishText() {
      if (!typing) return;
      var t = typing, text = String(t.text || '').trim().slice(0, 300);
      if (t.ov) t.ov.remove();
      var clean = { id: t.id, t: 'text', text: text, x: t.x, y: t.y, s: +t.s || 1, r: +t.r || 0, c: t.c || '#ffffff' };
      if (t.b) clean.b = true;
      if (t.f && t.f !== 'classic') clean.f = t.f;
      if (t.a && t.a !== 'center') clean.a = t.a;
      if (t.m && t.m !== 'none') clean.m = t.m;
      var i = layers.findIndex(function (l) { return l.id === t.id; });
      typing = null;
      if (text || i >= 0) {
        var before = i >= 0 ? JSON.stringify(layers[i]) : '';
        if (before !== JSON.stringify(clean)) record();
        if (!text) layers.splice(i, 1);
        else if (i >= 0) layers[i] = clean;
        else layers.push(clean);
        selected = text ? clean.id : null;
        keep();
      }
      paint();
    }

    // --- emoji and GIFs ---
    var picker = null;
    function closePicker() { if (picker) { picker.remove(); picker = null; } }
    function openEmoji() {
      if (picker) { closePicker(); return; }
      picker = el('div', 'tl-st-pick');
      var grid = el('div', 'tl-st-emo');
      EMOJI_PICKS.forEach(function (e) {
        var b = el('button'); b.type = 'button'; b.textContent = e;
        b.addEventListener('click', function () {
          record();
          var l = { id: nid(), t: 'emoji', text: e, x: 0.35 + Math.random() * 0.3, y: 0.3 + Math.random() * 0.3, s: 1, r: 0 };
          layers.push(l); selected = l.id;
          keep(); closePicker(); paint();
        });
        grid.appendChild(b);
      });
      picker.appendChild(grid);
      frame.appendChild(picker);
    }
    var lastGifPick = 0;
    function addGif(g) {
      var now = Date.now();
      // One pick is one GIF: a quick second tap, or the same GIF again, adds nothing.
      if (now - lastGifPick < 800) return;
      lastGifPick = now;
      if (gifs.some(function (x) { return x.url === g.url; })) { closePicker(); return; }
      if (gifs.length >= MAX_GIFS) { flash(tr('storyMaxGifs', 'Up to {n} GIFs', { n: MAX_GIFS })); return; }
      record();
      var item = { id: nid(), url: g.url, preview: g.preview, w: g.w, h: g.h, x: 0.5, y: 0.4, s: 1, r: 0 };
      gifs.push(item); selected = item.id;
      keep(); closePicker(); paint();
    }
    function openGifs() {
      if (picker) { closePicker(); return; }
      picker = el('div', 'tl-st-pick');
      var q = document.createElement('input');
      q.placeholder = tr('searchGifs', 'Search GIFs');
      var grid = el('div', 'tl-st-grid');
      picker.appendChild(q); picker.appendChild(grid);
      frame.appendChild(picker);
      var s2 = 0;
      function load() {
        var my = ++s2;
        var lang = (document.documentElement.lang || 'en').slice(0, 2);
        fetch('/api/gifs?lang=' + encodeURIComponent(lang) + (q.value.trim() ? '&q=' + encodeURIComponent(q.value.trim()) : ''))
          .then(function (r) { return r.ok ? r.json() : { results: [] }; })
          .then(function (j) {
            if (my !== s2 || !picker) return;
            grid.innerHTML = '';
            var list = (j && j.results) || [];
            if (!list.length) grid.appendChild(el('div', '', esc(tr('noGifs', 'No GIFs found'))));
            list.forEach(function (g) {
              var im = document.createElement('img'); im.src = g.preview; im.alt = g.alt || 'GIF'; im.loading = 'lazy';
              im.addEventListener('click', function () { addGif(g); });
              grid.appendChild(im);
            });
          }).catch(function () { /* offline */ });
      }
      var deb = null;
      q.addEventListener('input', function () { clearTimeout(deb); deb = setTimeout(load, 300); });
      load();
      q.focus();
    }

    post.addEventListener('click', function () {
      if (typing) finishText();
      if (isEmpty()) { flash(tr('storyEmpty', 'Write something or add a GIF')); return; }
      // The words go along as plain text too, so older apps still show something.
      var summary = layers.filter(function (l) { return l.t === 'text'; }).map(function (l) { return l.text; }).join('\n').slice(0, MAX_TEXT);
      var data = { text: summary, bg: bg, gifs: gifs.map(strip), layers: layers.map(strip) };
      saveDraft(data);
      done();
      publish(data);
    });
    paint();
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
