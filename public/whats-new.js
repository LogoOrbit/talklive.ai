// "What's new" announcement: voice messages. Shown once per browser on the
// main page, a moment after it loads, and never on top of another dialog.
(function () {
  'use strict';

  var KEY = 'tl_whatsnew_voice_v1';
  var tries = 0;

  function seen() {
    try { return !!localStorage.getItem(KEY); } catch (_) { return true; }
  }
  function markSeen() {
    try { localStorage.setItem(KEY, String(Date.now())); } catch (_) { /* storage blocked */ }
  }
  function tr(key, fallback) {
    if (typeof window.t === 'function') {
      var s = window.t(key);
      if (s && s !== key) return s;
    }
    return fallback;
  }
  // Something else asking for attention (age check, a call, another dialog)
  // goes first; the announcement waits its turn.
  function busy() {
    if (document.querySelector('.modal-overlay:not(.hidden), .vn-dialog-overlay, .side-panel.open')) return true;
    if (typeof authPageIsOpen === 'function' && authPageIsOpen()) return true;
    /* global callState */
    return typeof callState !== 'undefined' && callState !== 'idle';
  }

  function show() {
    var overlay = document.createElement('div');
    overlay.className = 'wn-overlay';
    overlay.innerHTML =
      '<div class="wn-card" role="dialog" aria-modal="true" aria-labelledby="wnTitle">'
      + '<div class="wn-sparkles" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>'
      + '<span class="wn-badge">' + tr('wnBadge', 'New') + '</span>'
      + '<h2 id="wnTitle" class="wn-title"></h2>'
      + '<p class="wn-sub"></p>'
      + '<div class="wn-video">'
      + '<video muted loop playsinline autoplay preload="auto" poster="/media/voice-notes-tutorial-poster.jpg" aria-label="">'
      + '<source src="/media/voice-notes-tutorial.webm" type="video/webm">'
      + '<source src="/media/voice-notes-tutorial.mp4" type="video/mp4">'
      + '</video></div>'
      + '<ol class="wn-steps"><li></li><li></li><li></li></ol>'
      + '<button type="button" class="btn btn-primary wn-go"></button>'
      + '</div>';
    overlay.querySelector('.wn-title').textContent = tr('wnTitle', 'Voice messages are here');
    overlay.querySelector('.wn-sub').textContent = tr('wnSub', 'Send voice notes to your friends. They accept first, so every voice note is welcome.');
    overlay.querySelector('video').setAttribute('aria-label', tr('wnVideoLabel', 'How to send a voice message'));
    var steps = overlay.querySelectorAll('.wn-steps li');
    steps[0].textContent = tr('wnStep1', 'Open a chat with a friend');
    steps[1].textContent = tr('wnStep2', 'Tap the mic. They accept once');
    steps[2].textContent = tr('wnStep3', 'Record, send, and listen back');
    var go = overlay.querySelector('.wn-go');
    go.textContent = tr('wnGo', 'Go talk now');
    document.body.appendChild(overlay);
    markSeen();

    var video = overlay.querySelector('video');
    var p = video.play && video.play();
    if (p && p.catch) p.catch(function () { /* autoplay refused: the poster stays */ });
    requestAnimationFrame(function () { requestAnimationFrame(function () { overlay.classList.add('open'); }); });

    function close() {
      document.removeEventListener('keydown', onKey, true);
      overlay.classList.remove('open');
      overlay.classList.add('closing');
      setTimeout(function () { video.pause(); overlay.remove(); }, 320);
    }
    function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
    go.addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey, true);
    go.focus({ preventScroll: true });
  }

  function attempt() {
    if (seen()) return;
    if (busy()) {
      if (++tries < 20) setTimeout(attempt, 3000);
      return;
    }
    show();
  }

  function start() { setTimeout(attempt, 1400); }
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
})();
