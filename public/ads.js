/*
 * TalkLive ad loader (Adsterra).
 * Fills placeholder slots lazily so ads never block page render and only
 * load when the slot is near the viewport.
 *
 * Slots (add anywhere in the page body):
 *   <div data-ad="native"></div>       Native banner (blends with content)
 *   <div data-ad="box"></div>          300x250 medium rectangle
 *   <div data-ad="leaderboard"></div>  728x90 on desktop, 320x50 on mobile
 *
 * Page-level units (no slot markup — see GLOBAL below) attach themselves to
 * the document and render on every page that loads this file.
 */
(function () {
  'use strict';

  var NATIVE = {
    script: 'https://delvefencescrewdriver.com/b6c7c32837efbcc9a34a0986523c06c5/invoke.js',
    container: 'container-b6c7c32837efbcc9a34a0986523c06c5',
  };

  // Page-level Adsterra tags. These position themselves and need no container,
  // so they are loaded once per page rather than per slot. Deliberately
  // deferred until after load so they never compete with first render or with
  // getUserMedia when a call starts.
  var GLOBAL = [
    // SocialBar_1
    'https://delvefencescrewdriver.com/6c/cc/ce/6cccce7190388ac7a53bb4b9de9f8dc8.js',
    // Popunder_1
    'https://delvefencescrewdriver.com/fa/38/fb/fa38fb28ffa2c8d07cad01e1dd8c3f1c.js',
  ];

  // A-Ads (a-ads.com) fallback for banner slots Adsterra leaves unfilled.
  // Create a free ad unit at https://a-ads.com (no approval needed) and put
  // its numeric ID here; leave '' to simply hide unfilled slots instead.
  var AADS_ID = '2448073';

  var BANNERS = {
    '320x50':  { key: '2cb8019064140640529e87ba7bfea884', w: 320, h: 50 },
    '300x250': { key: 'd12fcb01cfece74010f3fd29781e3ce4', w: 300, h: 250 },
    '728x90':  { key: 'bc52532dc8d29f62e8bd95a442953b14', w: 728, h: 90 },
  };

  // Adsterra banner tags use document.write, so each one is sandboxed in
  // its own same-origin iframe instead of being injected into the page.
  function banner(el, size) {
    var b = BANNERS[size];
    var frame = document.createElement('iframe');
    frame.width = b.w;
    frame.height = b.h;
    // Transparent background so an unfilled slot shows the page behind it
    // instead of an ugly white block.
    frame.style.cssText = 'border:0;display:block;margin:0 auto;max-width:100%;overflow:hidden;background:transparent;color-scheme:light';
    frame.setAttribute('scrolling', 'no');
    frame.setAttribute('loading', 'lazy');
    frame.setAttribute('allowtransparency', 'true');
    frame.title = 'Advertisement';
    el.appendChild(frame);
    var doc = frame.contentWindow.document;
    doc.open();
    doc.write(
      '<!DOCTYPE html><html><head><base target="_top"></head>' +
      '<body style="margin:0;padding:0;overflow:hidden;background:transparent">' +
      '<script>atOptions={key:"' + b.key + '",format:"iframe",height:' + b.h + ',width:' + b.w + ',params:{}};<\/script>' +
      '<script src="https://delvefencescrewdriver.com/' + b.key + '/invoke.js"><\/script>' +
      '</body></html>'
    );
    doc.close();

    // If the network returns nothing (no inventory, ad blocker, domain not
    // approved), fall back to an A-Ads unit (100% fill) when configured, or
    // collapse the slot after a grace period so no empty box shows.
    setTimeout(function () {
      var filled = true;
      try {
        var body = frame.contentWindow.document.body;
        filled = !!(body && (body.childElementCount > 2 || body.querySelector('iframe,img,ins')));
      } catch (err) { /* cross-origin fill: leave the slot as-is */ }
      if (filled) return;
      if (AADS_ID) {
        frame.src = 'https://acceptable.a-ads.com/' + AADS_ID + '/?size=' + b.w + 'x' + b.h;
        frame.setAttribute('data-aa', AADS_ID);
      } else {
        el.style.display = 'none';
      }
    }, 6000);
  }

  function native(el) {
    var container = document.createElement('div');
    container.id = NATIVE.container;
    el.appendChild(container);
    var s = document.createElement('script');
    s.async = true;
    s.setAttribute('data-cfasync', 'false');
    s.src = NATIVE.script;
    el.appendChild(s);

    // Collapse if the native container never gets populated.
    setTimeout(function () {
      if (!container.childElementCount) el.style.display = 'none';
    }, 4000);
  }

  // Loads the page-level tags exactly once, after the page has settled.
  function loadGlobal() {
    if (window.__talkliveGlobalAds) return;
    window.__talkliveGlobalAds = true;
    GLOBAL.forEach(function (src) {
      var s = document.createElement('script');
      s.async = true;
      s.setAttribute('data-cfasync', 'false');
      s.src = src;
      (document.body || document.documentElement).appendChild(s);
    });
  }

  function fill(el) {
    if (el.dataset.adLoaded) return;
    el.dataset.adLoaded = '1';
    var type = el.dataset.ad;
    if (type === 'native') native(el);
    else if (type === 'box') banner(el, '300x250');
    else if (type === 'leaderboard') banner(el, window.innerWidth >= 768 ? '728x90' : '320x50');
  }

  function init() {
    // Before the slot check below — page-level tags run on every page,
    // including ones that carry no slot markup at all.
    if (document.readyState === 'complete') loadGlobal();
    else window.addEventListener('load', loadGlobal);

    var slots = document.querySelectorAll('[data-ad]');
    if (!slots.length) return;
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { io.unobserve(e.target); fill(e.target); }
        });
      }, { rootMargin: '400px' });
      slots.forEach(function (el) { io.observe(el); });
    } else {
      slots.forEach(fill);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
