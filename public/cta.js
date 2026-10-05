// The start-talking component on the Journal, region, language, country and
// topic pages (markup: scripts/journal/shared.js ctaHero / ctaDock).
//
// Three small jobs, all decoration over links that already work without it:
// a live "N online now" line, the bottom dock that appears once the page's own
// block has scrolled away, and a press that feels like a press.
(function () {
  'use strict';

  // --- Live count: real numbers or nothing. ----------------------------------
  var live = document.querySelectorAll('[data-tl-live]');
  if (live.length && window.fetch) {
    fetch('/api/live', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !(d.online > 1)) return;
        var n = d.online >= 1000 ? (Math.floor(d.online / 100) / 10) + 'k' : String(d.online);
        for (var i = 0; i < live.length; i++) {
          var el = live[i];
          el.querySelector('span').textContent = n + (el.classList.contains('tl-dock-live') ? ' online now' : ' people online now');
          el.hidden = false;
        }
      })
      .catch(function () {});
  }

  // --- Dock: on screen from the first paint, stepping aside only while one of
  // the page's own start blocks is in view, so there is never a moment on the
  // page without a way in.
  var dock = document.querySelector('[data-tl-dock]');
  if (dock) {
    var blocks = document.querySelectorAll('.tl-go, .c-ctas');
    var seen = new Set();
    var update = function () {
      var on = seen.size === 0;
      if (on !== dock.classList.contains('is-on')) {
        dock.classList.toggle('is-on', on);
        document.body.classList.toggle('tl-has-dock', on);
      }
    };
    if (blocks.length && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) seen.add(entries[i].target);
          else seen.delete(entries[i].target);
        }
        update();
      }, { threshold: 0.5 });
      for (var j = 0; j < blocks.length; j++) io.observe(blocks[j]);
    } else {
      update();
    }
  }

  // --- Press feel: instant visual + a tiny buzz on phones that allow it. -----
  document.addEventListener('pointerdown', function (e) {
    var b = e.target.closest && e.target.closest('.tl-go-btn');
    if (!b) return;
    b.classList.add('is-press');
    try { if (navigator.vibrate) navigator.vibrate(12); } catch (_) {}
    setTimeout(function () { b.classList.remove('is-press'); }, 220);
  }, { passive: true });
})();
