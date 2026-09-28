// Post-call "How was that conversation?" card. Loaded on demand by app.js and
// chat.js the first time the server sends 'rate-prompt' (after a conversation
// of 20s or more), so it costs nothing on first page load. One tap answers;
// it hides itself after a few seconds, or the moment a new match starts.
(function () {
  'use strict';
  var el = null;
  var timer = null;
  var hooked = null;

  function tr(key, fallback) {
    if (typeof t !== 'function') return fallback;
    var s = t(key);
    return s && s !== key ? s : fallback;
  }

  function hide() {
    clearTimeout(timer);
    if (el) { el.remove(); el = null; }
  }

  function show(socket, d) {
    if (!d || typeof d.t !== 'string') return;
    hide();
    if (hooked !== socket) {
      hooked = socket;
      socket.on('matched', hide);
    }
    el = document.createElement('div');
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', tr('rateQ', 'How was that conversation?'));
    el.style.cssText = 'position:fixed;left:50%;bottom:calc(88px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:9999;'
      + 'display:flex;align-items:center;gap:8px;padding:10px 12px 10px 16px;border-radius:99px;max-width:calc(100vw - 32px);'
      + 'background:rgba(20,24,40,.94);color:#f2f4ff;box-shadow:0 10px 30px rgba(0,0,0,.35);font:600 14px/1.2 inherit;'
      + 'border:1px solid rgba(255,255,255,.12);backdrop-filter:blur(10px)';
    var q = document.createElement('span');
    q.textContent = tr('rateQ', 'How was that conversation?');
    el.appendChild(q);
    [['up', '👍'], ['down', '👎'], ['x', '✕']].forEach(function (o) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = o[1];
      b.setAttribute('aria-label', o[0] === 'up' ? 'Good' : o[0] === 'down' ? 'Bad' : 'Close');
      b.style.cssText = 'border:0;background:rgba(255,255,255,' + (o[0] === 'x' ? '0' : '.1') + ');color:inherit;'
        + 'min-width:40px;height:40px;border-radius:99px;font-size:' + (o[0] === 'x' ? '14px' : '20px') + ';cursor:pointer';
      b.onclick = function () {
        if (o[0] === 'x') return hide();
        socket.emit('rate-call', { t: d.t, v: o[0] });
        q.textContent = tr('rateThanks', 'Thanks for the feedback!');
        el.querySelectorAll('button').forEach(function (x) { x.remove(); });
        clearTimeout(timer);
        timer = setTimeout(hide, 1600);
      };
      el.appendChild(b);
    });
    document.body.appendChild(el);
    timer = setTimeout(hide, 12000);
  }

  window.TalkLiveRate = { show: show, hide: hide };
})();
