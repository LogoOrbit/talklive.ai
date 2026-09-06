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
    visibleFillTimeoutMs: 6000,
    minViewportHeight: 620,
    // Overwritten by /ads-config.json. Empty here so that if the config never
    // arrives an unfilled slot collapses quietly rather than showing a promo
    // this file had to hard-code.
    fallback: { enabled: false, promos: [] },
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

  // Is any part of the slot on screen right now?
  function isOnScreen(el) {
    try {
      var rect = el.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < (window.innerHeight || 0);
    } catch (err) {
      return false;
    }
  }

  /*
   * A slot has actually put a creative on the page.
   *
   * This is what reveals the card's border, background and "Sponsored" label -
   * see the .ad-card rules in the stylesheets. Until it fires the frame is
   * completely invisible, which is the whole point: an empty labelled panel
   * announcing an advertisement that does not exist is worse than no frame at
   * all, and on a blocked or filtered connection that is what every slot on the
   * page would otherwise be.
   */
  function markFilled(el) {
    el.setAttribute('data-ad-filled', '1');
    var card = el.closest && el.closest('.ad-card');
    if (card) card.setAttribute('data-ad-filled', '1');
    reportFill(el, true);
  }

  /*
   * Give up on a slot and take its space back.
   *
   * This used to keep the reserved space when the slot was on screen, on the
   * grounds that collapsing it is itself a layout shift. That was the wrong
   * trade and it showed: with an ad blocker or a filtered DNS - which is a lot
   * of this audience - the call screen held a 200px empty box under a
   * "Sponsored" label for thirty seconds. A one-off shift is cheaper than a
   * hole in the page, so the slot now always collapses. The fill deadline in
   * pollFill is short while the slot is visible precisely so this happens
   * before the user has settled on it.
   *
   * Before collapsing, though, houseAd gets a chance at the space.
   */
  function hideSlot(el) {
    reportFill(el, false);
    if (houseAd(el)) return;
    el.style.display = 'none';
    var card = el.closest && el.closest('.ad-card');
    if (card) card.style.display = 'none';
  }

  // --- House promos ---------------------------------------------------------

  /*
   * What goes in a slot the ad network never filled.
   *
   * There is no way to make a third-party ad unblockable. Proxying the network
   * through this domain would work for a few weeks until the filter lists catch
   * up, and it is the pattern browsers treat as tracking evasion, so it is not
   * worth the ban risk or the EU exposure. What IS possible is to stop losing
   * the space: a visitor with an ad blocker still reads the page, and one of
   * our own promos in that slot costs nothing and can still convert.
   *
   * These are plain first-party HTML built from strings already in the page's
   * JavaScript. No image, font, script, iframe or beacon of any kind is
   * requested, so there is no network call for a blocker to intercept and no
   * selector a cosmetic filter would target without also hiding real content.
   * That is what makes it durable - not cleverness, just having nothing to
   * block.
   *
   * They are deliberately NOT labelled "Sponsored". These are our own pages;
   * calling them sponsored would be a false disclosure, and the .ad-card
   * chrome stays off so a promo never impersonates a paid placement.
   */
  function promoFor(el) {
    var fb = config.fallback;
    if (!fb || !fb.enabled || !fb.promos || !fb.promos.length) return null;
    // The call and chat screens are "app"; everything else is "content".
    var surface = document.getElementById('callMainBtn') || document.getElementById('viewLive')
      ? 'app' : 'content';
    var pool = fb.promos.filter(function (p) {
      return p && p.href && (!p.where || p.where === 'any' || p.where === surface);
    });
    if (!pool.length) return null;
    // Rotate by slot position so two slots on one page do not show the same
    // promo, and different visits do not always open on the same one.
    var slots = [].slice.call(document.querySelectorAll('[data-ad]'));
    var seed = Math.max(0, slots.indexOf(el)) + Math.floor(Date.now() / 3600000);
    return pool[seed % pool.length];
  }

  function houseAd(el) {
    var promo = promoFor(el);
    if (!promo || el.dataset.adHouse) return false;
    el.dataset.adHouse = '1';

    var external = /^https?:/i.test(promo.href);
    // Built as a string and assigned once. Reading back el.href would return
    // the resolved absolute URL, so appending to it baked the current origin
    // into every internal link.
    var href = promo.href;
    if (!external) {
      // Tagged so the click shows up in analytics as a house promo rather than
      // as ordinary internal navigation.
      href += (href.indexOf('?') === -1 ? '?' : '&')
        + 'utm_source=house&utm_medium=slot&utm_campaign=' + encodeURIComponent(promo.id || 'promo');
    }

    var a = document.createElement('a');
    a.className = 'house-ad';
    a.setAttribute('href', href);
    if (external) {
      // Any off-site promo is a commercial placement whether or not money has
      // changed hands yet, so it carries the disclosure Google asks for.
      a.rel = 'sponsored nofollow noopener';
      a.target = '_blank';
    }

    var icon = document.createElement('span');
    icon.className = 'house-ad-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = promo.icon || '✨';

    var text = document.createElement('span');
    text.className = 'house-ad-text';
    var title = document.createElement('strong');
    title.className = 'house-ad-title';
    title.textContent = promo.title || '';
    var body = document.createElement('span');
    body.className = 'house-ad-body';
    body.textContent = promo.body || '';
    var cta = document.createElement('span');
    cta.className = 'house-ad-cta';
    cta.textContent = promo.cta || '';
    text.appendChild(title);
    text.appendChild(body);
    text.appendChild(cta);

    a.appendChild(icon);
    a.appendChild(text);
    // textContent everywhere above, never innerHTML: the promos come from a
    // config file that an operator edits, and it should not be able to inject
    // markup into every page on the site by accident.
    el.appendChild(a);

    var card = el.closest && el.closest('.ad-card');
    if (card) card.setAttribute('data-ad-house', '1');
    return true;
  }

  /*
   * Report that a slot never filled.
   *
   * There is currently no first-party number for how much of this audience
   * blocks ads, which makes every revenue projection guesswork at the top. One
   * GA4 event per unfilled slot turns that into a measurement: compare
   * ad_slot_unfilled against ad_slot_filled and the block rate falls out.
   */
  function reportFill(el, filled) {
    if (typeof window.gtag !== 'function') return;
    try {
      window.gtag('event', filled ? 'ad_slot_filled' : 'ad_slot_unfilled', {
        ad_format: el.dataset.ad,
        ad_surface: document.getElementById('callMainBtn') || document.getElementById('viewLive')
          ? 'app' : 'content',
      });
    } catch (err) { /* analytics must never break the page */ }
  }

  /*
   * Run `check` until it reports a fill or the deadline passes.
   *
   * Two deadlines, chosen by whether the user can see the slot. Off screen
   * there is nothing to be annoyed by, so a slow mobile connection gets the
   * full budget - an earlier single short deadline threw away real fills, and a
   * hidden slot earns nothing. On screen the budget is much shorter, because
   * every extra second is a second of blank space someone is looking at.
   * Visibility is re-tested each tick, so scrolling a slot into view shortens
   * its deadline immediately.
   */
  function pollFill(el, check, onFill, onGiveUp) {
    var interval = 500;
    var waited = 0;
    var poll = setInterval(function () {
      if (check()) { clearInterval(poll); onFill(); return; }
      waited += interval;
      var budget = isOnScreen(el)
        ? (config.visibleFillTimeoutMs || 6000)
        : (config.fillTimeoutMs || 15000);
      if (waited < budget) return;
      // Swapping a frame out mid-call would move the page under a live
      // conversation, so wait the call out instead.
      if (callIsLive()) return;
      clearInterval(poll);
      onGiveUp();
    }, interval);
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

    pollFill(el,
      function () { return isFilled(frame); },
      function () { markFilled(el); },
      function () {
        el.removeChild(frame);
        var next = (hostIndex || 0) + 1;
        if (next < HOSTS.length) banner(el, size, next);
        else hideSlot(el);
      });
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

    pollFill(el,
      function () { return !!container.childElementCount; },
      function () { markFilled(el); },
      function () {
        var next = (hostIndex || 0) + 1;
        if (next < HOSTS.length) {
          el.removeChild(container);
          el.removeChild(s);
          native(el, next);
        } else {
          hideSlot(el);
        }
      });
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
      //
      // Keyed on .ad-card-app, not .ad-card. Every ad on the site now ships in
      // an .ad-card frame, so matching that would have silently dropped every
      // slot on every landing page whenever the viewport was under 620px tall -
      // which is any phone held in landscape. Only the cards inside the call
      // and chat UI carry the -app modifier.
      if (shortViewport && el.closest && el.closest('.ad-card-app')) { hideSlot(el); continue; }
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
