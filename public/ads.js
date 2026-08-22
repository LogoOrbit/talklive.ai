/*
 * TalkLive ad loader (Adsterra).
 * Fills placeholder slots lazily so ads never block page render and only
 * load when the slot is near the viewport.
 *
 * Slots (add anywhere in the page body):
 *   <div data-ad="native"></div>       Native banner (blends with content)
 *   <div data-ad="box"></div>          300x250 medium rectangle
 *   <div data-ad="leaderboard"></div>  Widest banner the slot can actually fit
 *   <div data-ad="banner"></div>       468x60 where it fits, 320x50 below that
 *   <div data-ad="skyscraper"></div>   160x600 on desktop, 160x300 below 1024px
 *
 * Any exact size in BANNERS also works as a slot name, e.g.
 *   <div data-ad="160x600"></div>
 */
(function () {
  'use strict';

  // Adsterra serves the same tags from several hosts. The first is the one the
  // dashboard hands out; the second is Adsterra's long-standing banner origin
  // and is tried only when the first never renders (DNS filter, blocklist,
  // network hiccup) - without it those visitors are simply worth nothing.
  // Both are allowlisted in the script-src CSP in server/index.js.
  var HOSTS = [
    'https://delvefencescrewdriver.com',
    'https://www.highperformanceformat.com',
  ];

  var NATIVE = {
    path: '/b6c7c32837efbcc9a34a0986523c06c5/invoke.js',
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

  // True once the tag has put something in the frame. A cross-origin document
  // means a creative already took the frame over, which also counts as filled.
  function isFilled(frame) {
    try {
      var body = frame.contentWindow && frame.contentWindow.document.body;
      if (!body) return false;
      return body.childElementCount > 2 || !!body.querySelector('iframe,img,ins,a');
    } catch (err) {
      return true;
    }
  }

  // Adsterra banner tags use document.write, so each one is sandboxed in
  // its own same-origin iframe instead of being injected into the page.
  function banner(el, size, hostIndex) {
    var b = BANNERS[size];
    var host = HOSTS[hostIndex || 0];
    var frame = document.createElement('iframe');
    frame.width = b.w;
    frame.height = b.h;
    // Transparent background so an unfilled slot shows the page behind it
    // instead of an ugly white block.
    frame.style.cssText = 'border:0;display:block;margin:0 auto;max-width:100%;overflow:hidden;background:transparent;color-scheme:light';
    frame.setAttribute('scrolling', 'no');
    frame.setAttribute('allowtransparency', 'true');
    frame.title = 'Advertisement';
    el.appendChild(frame);
    var doc = frame.contentWindow && frame.contentWindow.document;
    if (!doc) { el.style.display = 'none'; return; }
    doc.open();
    doc.write(
      '<!DOCTYPE html><html><head><base target="_top"></head>' +
      '<body style="margin:0;padding:0;overflow:hidden;background:transparent">' +
      '<script>atOptions={key:"' + b.key + '",format:"iframe",height:' + b.h + ',width:' + b.w + ',params:{}};<\/script>' +
      '<script src="' + host + '/' + b.key + '/invoke.js"><\/script>' +
      '</body></html>'
    );
    doc.close();

    // Poll rather than judge once: a single short deadline threw away real
    // fills on slow mobile connections, and a hidden slot earns nothing. Only
    // after every host has had ~15s does the slot collapse, so no empty box
    // is left behind when there is genuinely no inventory.
    var checks = 0;
    var poll = setInterval(function () {
      checks += 1;
      if (isFilled(frame)) { clearInterval(poll); return; }
      if (checks < 10) return;
      clearInterval(poll);
      el.removeChild(frame);
      var next = (hostIndex || 0) + 1;
      if (next < HOSTS.length) banner(el, size, next);
      else el.style.display = 'none';
    }, 1500);
  }

  function native(el, hostIndex) {
    var host = HOSTS[hostIndex || 0];
    var container = document.createElement('div');
    container.id = NATIVE.container;
    el.appendChild(container);
    var s = document.createElement('script');
    s.async = true;
    s.setAttribute('data-cfasync', 'false');
    s.src = host + NATIVE.path;
    el.appendChild(s);

    var checks = 0;
    var poll = setInterval(function () {
      checks += 1;
      if (container.childElementCount) { clearInterval(poll); return; }
      if (checks < 8) return;
      clearInterval(poll);
      var next = (hostIndex || 0) + 1;
      if (next < HOSTS.length) {
        el.removeChild(container);
        el.removeChild(s);
        native(el, next);
      } else {
        el.style.display = 'none';
      }
    }, 1500);
  }

  // The width the slot can really give an ad. Sizing off window.innerWidth
  // pushed a 728x90 into containers barely half that wide, and the iframe was
  // then clipped by max-width - a creative nobody could see and an impression
  // that paid nothing.
  function slotWidth(el) {
    var w = el.clientWidth || Math.round(el.getBoundingClientRect().width) || 0;
    var node = el.parentElement;
    while (!w && node) {
      w = node.clientWidth;
      node = node.parentElement;
    }
    return w || window.innerWidth || 320;
  }

  function fill(el) {
    if (el.dataset.adLoaded) return;
    el.dataset.adLoaded = '1';
    var type = el.dataset.ad;
    var w = slotWidth(el);
    if (type === 'native') native(el, 0);
    else if (type === 'box') banner(el, '300x250', 0);
    else if (type === 'leaderboard') banner(el, w >= 744 ? '728x90' : (w >= 484 ? '468x60' : '320x50'), 0);
    else if (type === 'banner') banner(el, w >= 484 ? '468x60' : '320x50', 0);
    else if (type === 'skyscraper') banner(el, window.innerWidth >= 1024 ? '160x600' : '160x300', 0);
    // Any exact size from BANNERS also works, e.g. <div data-ad="160x600">.
    else if (BANNERS[type]) banner(el, type, 0);
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
