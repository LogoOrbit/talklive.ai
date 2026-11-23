/*
 * The one Plus popup. TalkLive Plus is sold only in the Android app, so every
 * locked thing on the website (Plus faces, covers, filters, themes, likes,
 * history, pricing buttons) ends here: "Get TalkLive Plus in the Android app",
 * three benefits, a Google Play button and "Not now". It never applies the
 * locked item - callers just call open() and stop.
 *
 * Lazy-loaded by window.tlPlusPopup() (app.js / chat.js); also callable
 * directly as window.TalkLivePlusPopup.open().
 */
(function () {
  'use strict';
  if (window.TalkLivePlusPopup) return;

  var PLAY_URL = 'https://play.google.com/store/apps/details?id=app.talklive';
  var STYLE_ID = 'tl-plus-popup-css';
  var root = null;
  var lastFocus = null;

  var CSS = [
    '.tlpp{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,18,.62);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;transition:opacity .18s ease}',
    '.tlpp.is-open{opacity:1}',
    '.tlpp[hidden]{display:none}',
    '.tlpp-box{position:relative;width:100%;max-width:360px;box-sizing:border-box;padding:26px 22px 18px;border-radius:22px;text-align:center;font-family:var(--font-sans,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif);background:var(--tlpp-bg,#161b2e);color:var(--text,#f2f4ff);border:1px solid var(--line,rgba(255,255,255,.12));box-shadow:0 24px 70px rgba(0,0,0,.5);transform:translateY(10px) scale(.97);transition:transform .2s cubic-bezier(.22,1,.36,1)}',
    '.tlpp.is-open .tlpp-box{transform:none}',
    '[data-theme="light"] .tlpp-box{--tlpp-bg:#fff}',
    '.tlpp-icon{display:block;width:68px;height:68px;margin:0 auto 14px;border-radius:17px;box-shadow:0 8px 24px rgba(42,111,232,.35)}',
    '.tlpp-title{margin:0 0 14px;font-size:21px;font-weight:800;letter-spacing:-.02em;line-height:1.2;text-wrap:balance}',
    '.tlpp-list{list-style:none;margin:0 0 18px;padding:0;display:grid;gap:9px;text-align:start}',
    '.tlpp-list li{display:flex;align-items:center;gap:10px;font-size:14.5px;line-height:1.35}',
    '.tlpp-list svg{flex:none;width:20px;height:20px;padding:3px;box-sizing:border-box;border-radius:50%;background:rgba(46,212,122,.16);color:var(--green,#2ed47a)}',
    '.tlpp-play{display:flex;align-items:center;justify-content:center;gap:9px;width:100%;min-height:48px;box-sizing:border-box;padding:12px 18px;border-radius:999px;background:var(--accent,#2a6fe8);color:#fff;font-weight:700;font-size:15.5px;text-decoration:none;transition:transform .12s ease,opacity .12s ease}',
    '.tlpp-play:hover{opacity:.92}.tlpp-play:active{transform:scale(.97)}',
    '.tlpp-play svg{width:18px;height:18px;flex:none}',
    '.tlpp-close{display:block;width:100%;margin-top:6px;min-height:44px;background:none;border:0;color:var(--muted,#8a90a8);font:inherit;font-size:14px;font-weight:600;cursor:pointer;border-radius:12px}',
    '.tlpp-close:hover{color:var(--text,#f2f4ff)}',
    '.tlpp-play:focus-visible,.tlpp-close:focus-visible{outline:2px solid var(--accent-2,#00d4ff);outline-offset:2px}',
    '@media (prefers-reduced-motion:reduce){.tlpp,.tlpp-box{transition:none}}'
  ].join('\n');

  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var PLAY = '<svg viewBox="0 0 24 26" aria-hidden="true" focusable="false"><path fill="#00d7fe" d="M1.1.6C.8.9.6 1.4.6 2v22c0 .6.2 1.1.5 1.4l.1.1L13.5 13.2v-.3L1.2.5z"/><path fill="#ffce00" d="M17.6 17.3l-4.1-4.1v-.3l4.1-4.1.1.1 4.9 2.8c1.4.8 1.4 2.1 0 2.9l-4.9 2.8z"/><path fill="#f3314c" d="M17.7 17.2L13.5 13 1.1 25.4c.5.5 1.2.5 2.1.1l14.5-8.3"/><path fill="#00f076" d="M17.7 8.8L3.2.5C2.3 0 1.6.1 1.1.6L13.5 13l4.2-4.2z"/></svg>';

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  function tr(key, fallback) {
    try {
      var d = window.TalkLiveI18n;
      if (d && typeof d.t === 'function') { var v = d.t(key); if (v && v !== key) return v; }
    } catch (e) { /* fall back to English */ }
    return fallback;
  }

  function build() {
    if (!document.getElementById(STYLE_ID)) {
      var st = document.createElement('style');
      st.id = STYLE_ID;
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    root = document.createElement('div');
    root.className = 'tlpp';
    root.hidden = true;
    root.innerHTML =
      '<div class="tlpp-box" role="dialog" aria-modal="true" aria-labelledby="tlppTitle">' +
        '<img class="tlpp-icon" src="/favicon-192.png" width="68" height="68" alt="" decoding="async">' +
        '<h2 class="tlpp-title" id="tlppTitle">' + esc(tr('plusAppTitle', 'Get TalkLive Plus in the Android app')) + '</h2>' +
        '<ul class="tlpp-list">' +
          '<li>' + CHECK + '<span>' + esc(tr('plusAppB1', 'Choose who you meet: gender and more countries')) + '</span></li>' +
          '<li>' + CHECK + '<span>' + esc(tr('plusAppB2', 'All avatars, covers and themes')) + '</span></li>' +
          '<li>' + CHECK + '<span>' + esc(tr('plusAppB3', 'See who liked you, no ads')) + '</span></li>' +
        '</ul>' +
        '<a class="tlpp-play" href="' + PLAY_URL + '" target="_blank" rel="noopener">' + PLAY + '<span>' + esc(tr('plusAppPlay', 'Get it on Google Play')) + '</span></a>' +
        '<button type="button" class="tlpp-close">' + esc(tr('plusAppNotNow', 'Not now')) + '</button>' +
      '</div>';
    document.body.appendChild(root);
    root.addEventListener('click', function (e) {
      if (e.target === root || e.target.closest('.tlpp-close')) close();
    });
    root.querySelector('.tlpp-play').addEventListener('click', function () {
      try { if (typeof window.trackGrowthEvent === 'function') window.trackGrowthEvent('premium_upsell_click'); } catch (e) { /* analytics only */ }
    });
    document.addEventListener('keydown', function (e) {
      if (!root || root.hidden) return;
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
      else if (e.key === 'Tab') {
        var f = root.querySelectorAll('a[href],button');
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }, true);
  }

  function open() {
    if (!root) build();
    if (!root.hidden) return;
    lastFocus = document.activeElement;
    root.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(function () { root.classList.add('is-open'); });
    try { window.dispatchEvent(new CustomEvent('tl-plus-popup', { detail: { open: true } })); } catch (e) { /* older engines */ }
    var b = root.querySelector('.tlpp-play');
    if (b) b.focus({ preventScroll: true });
  }

  function close() {
    if (!root || root.hidden) return;
    root.classList.remove('is-open');
    root.hidden = true;
    document.documentElement.style.overflow = '';
    try { if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); } catch (e) { /* element gone */ }
  }

  window.TalkLivePlusPopup = { open: open, close: close, url: PLAY_URL };
})();
