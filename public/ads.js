/*
 * TalkLive ad loader (Adsterra).
 * Fills placeholder slots lazily so ads never block page render and only
 * load when the slot is near the viewport.
 *
 * Slots (add anywhere in the page body):
 *   <div data-ad="native"></div>       Native banner (blends with content)
 *   <div data-ad="box"></div>          300x250 medium rectangle
 *   <div data-ad="leaderboard"></div>  728x90 on desktop, 320x50 on mobile
 *   <div data-ad="banner"></div>       468x60 on desktop, 320x50 on mobile
 *   <div data-ad="skyscraper"></div>   160x600 on desktop, 160x300 below 1024px
 *
 * Any exact size in BANNERS also works as a slot name, e.g.
 *   <div data-ad="160x600"></div>
 */
(function () {
  'use strict';

  var NATIVE = {
    script: 'https://delvefencescrewdriver.com/b6c7c32837efbcc9a34a0986523c06c5/invoke.js',
    container: 'container-b6c7c32837efbcc9a34a0986523c06c5',
  };

  var BANNERS = {
    '320x50':  { key: '2cb8019064140640529e87ba7bfea884', w: 320, h: 50 },
    '468x60':  { key: '890009febc64ee8cc3ed37e40c0664ea', w: 468, h: 60 },
    '300x250': { key: 'd12fcb01cfece74010f3fd29781e3ce4', w: 300, h: 250 },
    '728x90':  { key: 'bc52532dc8d29f62e8bd95a442953b14', w: 728, h: 90 },
    '160x300': { key: '07074e4c3772083d48e650ea40b449e6', w: 160, h: 300 },
    '160x600': { key: '20e9abfee215ecab6c128da50698bb01', w: 160, h: 600 },
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
    // approved), collapse the slot after a grace period so no empty box shows.
    setTimeout(function () {
      var filled = true;
      try {
        var body = frame.contentWindow.document.body;
        filled = !!(body && (body.childElementCount > 2 || body.querySelector('iframe,img,ins')));
      } catch (err) { /* cross-origin fill: leave the slot as-is */ }
      if (filled) return;
      el.style.display = 'none';
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

  function fill(el) {
    if (el.dataset.adLoaded) return;
    el.dataset.adLoaded = '1';
    var type = el.dataset.ad;
    var wide = window.innerWidth;
    if (type === 'native') native(el);
    else if (type === 'box') banner(el, '300x250');
    else if (type === 'leaderboard') banner(el, wide >= 768 ? '728x90' : '320x50');
    else if (type === 'banner') banner(el, wide >= 520 ? '468x60' : '320x50');
    else if (type === 'skyscraper') banner(el, wide >= 1024 ? '160x600' : '160x300');
    // Any exact size from BANNERS also works, e.g. <div data-ad="160x600">.
    else if (BANNERS[type]) banner(el, type);
  }

  function init() {
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
