/* TalkLive page loader.

   A full-screen curtain that hides the flash of unstyled content on first paint
   and gives instant feedback while navigating between pages.

   Timing matters a lot here: the curtain is opaque and covers the whole
   viewport, so every millisecond it stays up is a millisecond of blank screen
   in Largest Contentful Paint and Speed Index. It is therefore torn down as
   soon as the page's own stylesheets have applied - the only thing it exists to
   hide - rather than waiting for `load` (which trails behind analytics, ad
   iframes and the socket.io client) or for the app scripts to finish parsing. */
(function () {
  var HARD_CAP_MS = 1500; // never let the curtain gate the paint for longer

  /* Two modes.
   *
   * Default (the app shells at / and /chat): show the curtain immediately on
   * load. Those pages build their UI in JavaScript, so there genuinely is an
   * unstyled/unbuilt moment worth hiding.
   *
   * nav-only (every SEO landing page, blog post and localized homepage): do
   * not show a curtain on load at all, and keep the click handler that shows
   * one while navigating away. Those pages arrive fully rendered from the
   * server with a single stylesheet, so there is no flash to hide - an opaque
   * full-viewport overlay could only ever delay the paint it was covering.
   * Combined with `defer` on the tag, this takes the script off the critical
   * rendering path for ~260 pages while keeping the navigation feedback.
   */
  var self = document.currentScript;
  var navOnly = !!(self && self.getAttribute('data-mode') === 'nav-only');

  var css =
    '#tl-page-loader{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;' +
    'background:#0b0f1a;opacity:1;transition:opacity .2s ease;pointer-events:all}' +
    '#tl-page-loader.tl-hide{opacity:0;pointer-events:none}' +
    '#tl-page-loader .tl-spinner{width:44px;height:44px;border-radius:50%;border:3px solid rgba(23,201,100,.25);' +
    'border-top-color:#17c964;animation:tl-spin .8s linear infinite;will-change:transform}' +
    '@keyframes tl-spin{to{transform:rotate(360deg)}}' +
    '@media (prefers-reduced-motion: reduce){#tl-page-loader .tl-spinner{animation:none;border-top-color:rgba(23,201,100,.7)}}';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var overlay = document.createElement('div');
  overlay.id = 'tl-page-loader';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = '<div class="tl-spinner"></div>';
  // In nav-only mode the curtain starts hidden, so appending it costs nothing
  // visually and it is ready the moment a link is clicked.
  if (navOnly) overlay.className = 'tl-hide';
  document.documentElement.appendChild(overlay);

  function hide() {
    overlay.classList.add('tl-hide');
  }

  // True once every non-disabled stylesheet in the document has applied. A
  // cross-origin sheet still exposes `.sheet` when it loads (only `cssRules` is
  // walled off), so testing for existence is enough.
  function stylesReady() {
    var links = document.querySelectorAll('link[rel~="stylesheet"]');
    for (var i = 0; i < links.length; i++) {
      if (links[i].disabled) continue;
      try {
        if (!links[i].sheet) return false;
      } catch (e) {
        return false;
      }
    }
    return true;
  }

  // Poll per frame rather than per timer: the check is trivial, and this lands
  // on the first frame where the real UI is able to paint correctly styled.
  var raf = window.requestAnimationFrame
    ? window.requestAnimationFrame.bind(window)
    : function (fn) { return setTimeout(fn, 16); };

  function tick() {
    if (!document.body || !stylesReady()) {
      raf(tick);
      return;
    }
    // Give the styled markup one frame to paint underneath before fading out,
    // so the curtain never lifts on a half-painted page.
    raf(hide);
  }

  // None of the teardown machinery is needed when the curtain was never shown.
  if (!navOnly) {
    raf(tick);
    // Backstops, in case a stylesheet never resolves (blocked request, offline).
    setTimeout(hide, HARD_CAP_MS);
    document.addEventListener('DOMContentLoaded', hide);
    window.addEventListener('load', hide);
  }

  document.addEventListener(
    'click',
    function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#' || /^(mailto:|tel:|javascript:)/i.test(href)) return;
      var url;
      try {
        url = new URL(href, window.location.href);
      } catch (err) {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.href.split('#')[0] === window.location.href.split('#')[0]) return;
      overlay.classList.remove('tl-hide');
    },
    true
  );

  window.addEventListener('pageshow', function (e) {
    if (e.persisted) hide();
  });
})();
