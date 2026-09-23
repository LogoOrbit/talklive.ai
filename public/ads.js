/*
 * TalkLive ad loader (Google AdSense only).
 *
 * The AdSense loader (pagead2.googlesyndication.com/.../adsbygoogle.js) sits
 * in the <head> of every page, which is what Auto ads and site verification
 * need. This file handles the fixed slots in the page:
 *
 *   <div class="ad-card"><span class="ad-card-label">Advertisement</span>
 *     <div data-ad="leaderboard"></div></div>
 *
 * Slot types: leaderboard, banner, box, skyscraper, native. Each one becomes
 * an AdSense unit when it nears the viewport, using the ad-unit ID configured
 * for its type in /ads-config.json (adsense.slots). A type with no ID
 * configured never loads and its space collapses; Auto ads, configured in the
 * AdSense account, decide placement instead.
 *
 * Rules this file enforces, beyond loading a tag:
 *
 * 1. NO GOOGLE ADS ON APP SCREENS. Slots inside .ad-card-app (the start,
 *    matchmaking, call and chat screens) are never filled. Those screens are
 *    mostly controls and waiting states, which AdSense treats as screens
 *    without publisher content, and an ad beside the call buttons invites
 *    accidental clicks. The CSS hides those cards too.
 * 2. NOT INTERRUPTING A LIVE CONVERSATION. While a call or chat is live,
 *    nothing starts loading or collapses, so nothing moves under a
 *    conversation. See callIsLive.
 * 3. NOT MOVING THE PAGE. Slot space is reserved in CSS before anything loads;
 *    an unfilled slot gives its space up only when no conversation is live.
 * 4. HONEST LABELS. The card's "Advertisement" label and frame only appear
 *    once Google has actually filled the unit, and house promos (our own
 *    pages) are never labelled as ads.
 * 5. READING DENSITY FROM CONFIG, so it can be retuned without a deploy.
 */
(function () {
  'use strict';

  var CLIENT = 'ca-pub-6368797323385379';

  // Mirrors public/ads-config.json. Used verbatim if the fetch fails.
  var config = {
    enabled: true,
    maxSlotsPerPage: 3,
    types: { native: true, leaderboard: true, banner: true, box: true, skyscraper: true },
    pauseDuringCall: true,
    lazyRootMargin: '100px',
    fillTimeoutMs: 15000,
    visibleFillTimeoutMs: 8000,
    adsense: { client: CLIENT, slots: {} },
    // Overwritten by /ads-config.json; empty here so a failed fetch collapses
    // an unfilled slot rather than showing a promo hard-coded in this file.
    fallback: { enabled: false, promos: [] },
  };

  function loadConfig(done) {
    if (!window.fetch) { done(); return; }
    var settled = false;
    function finish() { if (!settled) { settled = true; done(); } }
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

  // "banner" is a leaderboard at a smaller breakpoint and shares its switch.
  function typeEnabled(type) {
    var family = type === 'banner' ? 'leaderboard' : type;
    return !config.types || (config.types[family] !== false && config.types[type] !== false);
  }

  function unitIdFor(type) {
    var slots = (config.adsense && config.adsense.slots) || {};
    return slots[type] || slots['default'] || '';
  }

  // --- Live conversation detection -----------------------------------------
  //
  // Read from DOM state app.js and chat.js already maintain:
  //   / and /call : #callMainBtn data-mode ("hangup"/"confirm" = call up;
  //                 "loading" = live unless data-call-state is "searching").
  //   /chat       : #viewLive loses .hidden while a text chat runs.
  function callIsLive() {
    if (config.pauseDuringCall === false) return false;
    var btn = document.getElementById('callMainBtn');
    if (btn) {
      var mode = btn.dataset ? btn.dataset.mode : btn.getAttribute('data-mode');
      if (mode === 'hangup' || mode === 'confirm') return true;
      if (mode === 'loading') {
        var state = btn.dataset ? btn.dataset.callState : btn.getAttribute('data-call-state');
        return state !== 'searching';
      }
    }
    var live = document.getElementById('viewLive');
    return !!(live && !live.classList.contains('hidden'));
  }

  // Slots that became visible during a conversation wait here and load when it
  // ends; slots that gave up mid-call keep their space until then.
  var deferred = [];
  var pendingCollapse = [];

  function releaseDeferred() {
    if (document.hidden || callIsLive()) return;
    var collapsing = pendingCollapse;
    pendingCollapse = [];
    collapsing.forEach(collapse);
    var pending = deferred;
    deferred = [];
    pending.forEach(fill);
  }

  function watchCallState() {
    document.addEventListener('visibilitychange', releaseDeferred);
    if (!window.MutationObserver) return;
    var targets = [document.getElementById('callMainBtn'), document.getElementById('viewLive')]
      .filter(Boolean);
    if (!targets.length) return;
    var observer = new MutationObserver(releaseDeferred);
    targets.forEach(function (el) {
      observer.observe(el, { attributes: true, attributeFilter: ['class', 'data-mode', 'data-call-state'] });
    });
  }

  // --- Slot lifecycle -------------------------------------------------------

  function isOnScreen(el) {
    try {
      var rect = el.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < (window.innerHeight || 0);
    } catch (err) {
      return false;
    }
  }

  function card(el) {
    return el.closest ? el.closest('.ad-card') : null;
  }

  // Google put a creative in the unit: reveal the card's frame and label.
  function markFilled(el) {
    el.setAttribute('data-ad-filled', '1');
    var c = card(el);
    if (c) c.setAttribute('data-ad-filled', '1');
    report(el, true);
  }

  function collapse(el) {
    el.style.display = 'none';
    var c = card(el);
    if (c) c.style.display = 'none';
  }

  // Give up on a slot: one of our own promos takes the space if there is one,
  // otherwise it collapses - but never while a conversation is live.
  function hideSlot(el) {
    if (el.dataset.adDone) return;
    el.dataset.adDone = '1';
    if (houseAd(el)) return;
    if (callIsLive()) { pendingCollapse.push(el); return; }
    collapse(el);
  }

  function report(el, filled) {
    if (typeof window.gtag !== 'function') return;
    try {
      window.gtag('event', filled ? 'ad_slot_filled' : 'ad_slot_unfilled', {
        ad_format: el.dataset.ad || 'unknown',
        ad_network: 'adsense',
      });
    } catch (_) { /* analytics must never break ads */ }
  }

  // --- House promos -----------------------------------------------------------
  //
  // Our own pages, as plain first-party HTML, in a slot Google did not fill.
  // Deliberately NOT labelled as an advertisement - they are our content - and
  // the .ad-card chrome stays off so a promo never impersonates a paid unit.
  function promoFor(el) {
    var fb = config.fallback;
    if (!fb || !fb.enabled || !fb.promos || !fb.promos.length) return null;
    var surface = document.getElementById('callMainBtn') || document.getElementById('viewLive')
      ? 'app' : 'content';
    var pool = fb.promos.filter(function (p) {
      return p && p.href && (!p.where || p.where === 'any' || p.where === surface);
    });
    if (!pool.length) return null;
    var slots = [].slice.call(document.querySelectorAll('[data-ad]'));
    var seed = Math.max(0, slots.indexOf(el)) + Math.floor(Date.now() / 3600000);
    return pool[seed % pool.length];
  }

  function houseAd(el) {
    var promo = promoFor(el);
    if (!promo || el.dataset.adHouse) return false;
    el.dataset.adHouse = '1';
    var href = promo.href;
    if (!/^https?:/i.test(href)) {
      href += (href.indexOf('?') === -1 ? '?' : '&')
        + 'utm_source=house&utm_medium=slot&utm_campaign=' + encodeURIComponent(promo.id || 'promo');
    }
    while (el.firstChild) el.removeChild(el.firstChild);
    var a = document.createElement('a');
    a.className = 'house-ad';
    a.setAttribute('href', href);
    if (/^https?:/i.test(promo.href)) {
      // An off-site promo is a commercial placement, so it carries the
      // disclosure Google asks for.
      a.rel = 'sponsored nofollow noopener';
      a.target = '_blank';
    }
    var icon = document.createElement('span');
    icon.className = 'house-ad-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = promo.icon || '\u2728';
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
    // textContent only: the promos come from an operator-edited config file.
    el.appendChild(a);
    var c = card(el);
    if (c) c.setAttribute('data-ad-house', '1');
    return true;
  }

  // --- AdSense units ---------------------------------------------------------

  // The unit shape per slot type. Responsive units sized to the reserved space.
  var FORMATS = {
    leaderboard: 'horizontal',
    banner: 'horizontal',
    box: 'rectangle',
    skyscraper: 'vertical',
    native: 'auto',
  };

  function adsenseUnit(el, type, unitId) {
    var ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', (config.adsense && config.adsense.client) || CLIENT);
    ins.setAttribute('data-ad-slot', unitId);
    ins.setAttribute('data-ad-format', FORMATS[type] || 'auto');
    ins.setAttribute('data-full-width-responsive', 'true');
    el.appendChild(ins);
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      hideSlot(el);
      return;
    }
    // Google marks the unit data-ad-status="filled" or "unfilled" once it has
    // decided. Until then the card stays invisible.
    var waited = 0;
    var interval = 500;
    var poll = setInterval(function () {
      if (document.hidden) return;
      var status = ins.getAttribute('data-ad-status');
      if (status === 'filled') { clearInterval(poll); markFilled(el); return; }
      if (status === 'unfilled') { clearInterval(poll); report(el, false); hideSlot(el); return; }
      waited += interval;
      var budget = isOnScreen(el)
        ? (config.visibleFillTimeoutMs || 8000)
        : (config.fillTimeoutMs || 15000);
      if (waited < budget) return;
      clearInterval(poll);
      // No verdict from Google. A frame that did render counts as filled.
      if (ins.querySelector && ins.querySelector('iframe')) { markFilled(el); return; }
      report(el, false);
      hideSlot(el);
    }, interval);
  }

  var loaded = 0;

  function fill(el) {
    if (el.dataset.adLoaded || el.dataset.adDone) return;
    if (document.hidden || callIsLive()) {
      if (deferred.indexOf(el) === -1) deferred.push(el);
      return;
    }
    var type = el.dataset.ad;
    var unitId = unitIdFor(type);
    // No unit configured for this type: the slot is not in use, so it gives
    // its space back (no house promo) and Auto ads handle placement instead.
    if (!unitId) { el.dataset.adDone = '1'; if (callIsLive()) pendingCollapse.push(el); else collapse(el); return; }
    if (loaded >= (config.maxSlotsPerPage || 0)) { hideSlot(el); return; }
    loaded++;
    el.dataset.adLoaded = '1';
    adsenseUnit(el, type, unitId);
  }

  // --- Init -----------------------------------------------------------------

  function eligible() {
    var slots = [].slice.call(document.querySelectorAll('[data-ad]'));
    var kept = [];
    for (var i = 0; i < slots.length; i++) {
      var el = slots[i];
      // Rule 1: never on an app screen, whatever the config says.
      if (el.closest && el.closest('.ad-card-app')) { el.dataset.adDone = '1'; collapse(el); continue; }
      if (!config.enabled || !typeEnabled(el.dataset.ad)) { hideSlot(el); continue; }
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
      }, { rootMargin: config.lazyRootMargin || '100px' });
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
