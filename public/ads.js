/*
 * TalkLive ad loader (Adsterra).
 *
 * Fills placeholder slots lazily so ads never block page render and only load
 * when the slot is near the viewport.
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
 *
 * Three things this file is responsible for beyond loading a tag:
 *
 * 1. NOT MOVING THE PAGE. Every slot's dimensions are reserved in CSS before
 *    anything loads (the [data-ad] block mirrored in seo.css, style.css and
 *    chat.css), and this file must not do anything that changes a slot's size
 *    once the user can see it. That includes collapsing an unfilled one - see
 *    hideSlot.
 * 2. NOT INTERRUPTING A LIVE CONVERSATION. While a call or chat is live,
 *    nothing starts loading, retries, or collapses. Ads already on screen stay
 *    exactly as they are, so a twenty-minute call is twenty minutes of
 *    stationary page. See callIsLive.
 * 3. READING ITS DENSITY FROM CONFIG. Slot counts and per-format switches come
 *    from /ads-config.json at runtime, not from the markup, so they can be
 *    retuned without rebuilding 282 pages. See config.
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

  // --- Config ---------------------------------------------------------------

  // Mirrors public/ads-config.json. Used verbatim if the fetch fails, so a
  // network blip or a bad deploy degrades to sane density rather than to no
  // ads at all - or, worse, to every slot on the page filling at once.
  var config = {
    enabled: true,
    maxSlotsPerPage: 3,
    types: { native: true, leaderboard: true, banner: true, box: true, skyscraper: true },
    pauseDuringCall: true,
    lazyRootMargin: '400px',
    fillTimeoutMs: 15000,
    minViewportHeight: 620,
  };

  function loadConfig(done) {
    if (!window.fetch) { done(); return; }
    var settled = false;
    function finish() { if (!settled) { settled = true; done(); } }
    // Never let a slow config request hold the ads hostage. After a second the
    // defaults above are good enough, and a slot that loads late earns nothing.
    var timer = setTimeout(finish, 1000);
    fetch('/ads-config.json', { credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (json) {
        if (json && typeof json === 'object') {
          for (var k in config) {
            if (Object.prototype.hasOwnProperty.call(json, k)) config[k] = json[k];
          }
        }
      })
      .catch(function () { /* defaults stand */ })
      .then(function () { clearTimeout(timer); finish(); });
  }

  function typeEnabled(type) {
    // An exact size like "160x600" is governed by the family it belongs to.
    var family = type;
    if (BANNERS[type]) family = type === '300x250' ? 'box' : (/^160x/.test(type) ? 'skyscraper' : 'banner');
    return !config.types || config.types[family] !== false;
  }

  // --- Live conversation detection -----------------------------------------

  /*
   * True while the user is in a live voice call or text chat.
   *
   * Read entirely out of DOM state that app.js and chat.js already maintain -
   * nothing here writes to the page's own state, and no signalling or WebRTC
   * code is touched. Two independent signals, one per sub-app:
   *
   *   /  and /call : #callMainBtn carries data-mode, set by setButtonMode() in
   *                  app.js. "hangup" and "confirm" both mean a call is up;
   *                  "loading" is searching and "call" is idle.
   *   /chat        : #viewLive loses its .hidden class while a text chat runs.
   *
   * If neither element exists - every landing page, blog post and geo page -
   * there is no conversation to interrupt and this is always false.
   */
  function callIsLive() {
    if (!config.pauseDuringCall) return false;
    var btn = document.getElementById('callMainBtn');
    if (btn) {
      var mode = btn.dataset ? btn.dataset.mode : btn.getAttribute('data-mode');
      if (mode === 'hangup' || mode === 'confirm') return true;
    }
    var live = document.getElementById('viewLive');
    if (live && !live.classList.contains('hidden')) return true;
    return false;
  }

  // Slots that were ready to fill when a conversation started. They wait here
  // rather than being dropped, so the impression is served the moment the call
  // ends instead of being lost.
  var deferred = [];

  function releaseDeferred() {
    if (callIsLive() || !deferred.length) return;
    var pending = deferred;
    deferred = [];
    pending.forEach(fill);
  }

  /*
   * Watch for the conversation ending.
   *
   * A MutationObserver on the two signal elements rather than a poll: it fires
   * on the same tick the class or attribute changes, costs nothing while
   * nothing changes, and needs no cooperation from app.js.
   */
  function watchCallState() {
    if (!window.MutationObserver) return;
    var targets = [document.getElementById('callMainBtn'), document.getElementById('viewLive')]
      .filter(Boolean);
    if (!targets.length) return;
    var observer = new MutationObserver(releaseDeferred);
    targets.forEach(function (el) {
      observer.observe(el, { attributes: true, attributeFilter: ['class', 'data-mode'] });
    });
  }

  // --- Slot lifecycle -------------------------------------------------------

  /*
   * Collapse an unfilled slot - but only when doing so cannot move anything the
   * user is looking at.
   *
   * The old version always hid the slot. With dimensions now reserved in CSS
   * that would be a layout shift in its own right: a 250px box vanishing under
   * someone's cursor moves every element below it, which is exactly the CLS the
   * reservation exists to prevent. So a slot that is on screen keeps its
   * reserved space and only loses the "Sponsored" label; a slot still off
   * screen collapses as before, because nothing visible moves.
   */
  function hideSlot(el) {
    var visible = false;
    try {
      var rect = el.getBoundingClientRect();
      visible = rect.bottom > 0 && rect.top < (window.innerHeight || 0);
    } catch (err) { /* treat as off screen */ }

    var card = el.closest && el.closest('.ad-card');
    if (visible) {
      el.setAttribute('data-ad-unfilled', '1');
      if (card) card.setAttribute('data-ad-unfilled', '1');
      return;
    }
    el.style.display = 'none';
    if (card) card.style.display = 'none';
  }

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
    if (!doc) { hideSlot(el); return; }
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
    // after every host has had its full budget does the slot give up, so no
    // empty box is left behind when there is genuinely no inventory.
    var interval = 1500;
    var limit = Math.max(2, Math.round((config.fillTimeoutMs || 15000) / interval));
    var checks = 0;
    var poll = setInterval(function () {
      checks += 1;
      if (isFilled(frame)) { clearInterval(poll); return; }
      if (checks < limit) return;
      // Swapping the frame out mid-call would move the page. Wait it out; the
      // observer calls back through here once the conversation ends.
      if (callIsLive()) return;
      clearInterval(poll);
      el.removeChild(frame);
      var next = (hostIndex || 0) + 1;
      if (next < HOSTS.length) banner(el, size, next);
      else hideSlot(el);
    }, interval);
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

    var interval = 1500;
    var limit = Math.max(2, Math.round((config.fillTimeoutMs || 15000) / interval / 1.25));
    var checks = 0;
    var poll = setInterval(function () {
      checks += 1;
      if (container.childElementCount) { clearInterval(poll); return; }
      if (checks < limit) return;
      if (callIsLive()) return;
      clearInterval(poll);
      var next = (hostIndex || 0) + 1;
      if (next < HOSTS.length) {
        el.removeChild(container);
        el.removeChild(s);
        native(el, next);
      } else {
        hideSlot(el);
      }
    }, interval);
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

  /*
   * The size a slot will resolve to.
   *
   * Kept as its own function because the CSS reservation has to agree with it
   * exactly - the [data-ad] min-height rules encode the same three breakpoints,
   * and if the two ever disagree the page shifts by the difference.
   */
  function sizeFor(type, el) {
    var w = slotWidth(el);
    if (type === 'box') return '300x250';
    if (type === 'leaderboard') return w >= 744 ? '728x90' : (w >= 484 ? '468x60' : '320x50');
    if (type === 'banner') return w >= 484 ? '468x60' : '320x50';
    if (type === 'skyscraper') return window.innerWidth >= 1024 ? '160x600' : '160x300';
    return BANNERS[type] ? type : null;
  }

  function fill(el) {
    if (el.dataset.adLoaded) return;
    var type = el.dataset.ad;

    // Held back rather than dropped: the slot fills the moment the call ends.
    if (callIsLive()) {
      if (deferred.indexOf(el) === -1) deferred.push(el);
      return;
    }

    el.dataset.adLoaded = '1';
    if (type === 'native') { native(el, 0); return; }
    var size = sizeFor(type, el);
    if (size) banner(el, size, 0);
  }

  // --- Init -----------------------------------------------------------------

  /*
   * Which slots are allowed to load on this page.
   *
   * Density is enforced here, in document order, rather than by removing slots
   * from the HTML. That keeps one lever - maxSlotsPerPage in the config - able
   * to thin every page on the site at once, and it means the slots that survive
   * are the ones highest up the document, which are also the ones most likely
   * to be seen.
   */
  function eligible() {
    var slots = [].slice.call(document.querySelectorAll('[data-ad]'));
    if (!config.enabled) return [];

    var shortViewport = (window.innerHeight || 0) < (config.minViewportHeight || 0);
    var kept = [];
    for (var i = 0; i < slots.length; i++) {
      var el = slots[i];
      if (!typeEnabled(el.dataset.ad)) { hideSlot(el); continue; }
      // In-app slots on a short screen would leave the call or chat UI mostly
      // advertisement, so they are dropped before anything loads.
      if (shortViewport && el.closest && el.closest('.ad-card, .chat-live-ad')) { hideSlot(el); continue; }
      if (kept.length >= (config.maxSlotsPerPage || 0)) { hideSlot(el); continue; }
      kept.push(el);
    }
    return kept;
  }

  function init() {
    var slots = eligible();
    if (!slots.length) return;
    watchCallState();
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { io.unobserve(e.target); fill(e.target); }
        });
      }, { rootMargin: config.lazyRootMargin || '400px' });
      slots.forEach(function (el) { io.observe(el); });
    } else {
      slots.forEach(fill);
    }
  }

  function start() { loadConfig(init); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
