/*
 * When TalkLive Plus may be offered, and how often. The same rules run on the
 * website (this file) and in the Android app (PlusMoments.kt); both are tested
 * against the same cases (scripts/test-plus-moments.js, PlusMomentsTest.kt).
 *
 * Moments:
 *   restrict  someone just touched a locked feature. Never capped: they asked.
 *   search    waiting a while in a busy queue: one quiet line, "matched first".
 *   good      after a call that went well (rated up, or a mutual heart).
 *   liked     people liked you (the real count from get-likes).
 *   pass      the one-day pass, for people who turned the subscription down twice.
 *
 * Policy for the proactive ones (search, good, liked, pass):
 *   - never in a first session, nor before the third finished call
 *   - at most one per 24 hours and three per 7 days
 *   - never while a call is connecting or connected, never for Plus members
 *   - the same moment is not repeated in the same session after a dismissal
 * A restriction is also never shown over a call or to a member, and never
 * repeated in a session after a dismissal, but is not counted against the caps.
 *
 * This file is loaded after the page is idle; nothing here is needed to talk.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PlusMoments = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var DAY = 864e5;
  var CAPS = {
    sessionGapMs: 30 * 60 * 1000, // a new session starts after 30 minutes away
    minSessions: 2,
    minCalls: 3,
    perDay: 1,
    perWeek: 3,
    passAfterDismissals: 2,
    passCooldownMs: 14 * DAY,
    searchAfterSec: 20,
    callMinSec: 15, // a call counts as finished once it was connected this long
  };
  var PROACTIVE = { search: 1, good: 1, liked: 1, pass: 1 };
  // When several are due at once, the most relevant wins.
  var ORDER = ['good', 'liked', 'pass', 'search'];

  function fresh() { return { v: 1, sessions: 0, calls: 0, lastSeen: 0, shown: [], subDismiss: 0, lastPassAt: 0 }; }
  function copy(s) { return JSON.parse(JSON.stringify(Object.assign(fresh(), s || {}))); }

  // Call whenever the page or app is opened or comes back to the front.
  function touch(st, now) {
    var s = copy(st);
    if (!s.lastSeen || now - s.lastSeen > CAPS.sessionGapMs) s.sessions += 1;
    s.lastSeen = now;
    return s;
  }
  // A call that was connected for at least callMinSec seconds.
  function finishedCall(st, seconds) {
    var s = copy(st);
    if (seconds >= CAPS.callMinSec) s.calls += 1;
    return s;
  }

  // Why a proactive prompt may not be shown now, or null.
  function blocked(st, now) {
    var s = copy(st);
    if (s.sessions < CAPS.minSessions) return 'first-session';
    if (s.calls < CAPS.minCalls) return 'few-calls';
    var day = s.shown.filter(function (t) { return now - t < DAY; }).length;
    if (day >= CAPS.perDay) return 'day-cap';
    var week = s.shown.filter(function (t) { return now - t < 7 * DAY; }).length;
    if (week >= CAPS.perWeek) return 'week-cap';
    return null;
  }

  // ctx: premium, inCall, key (restrict: which feature), dismissed (array of
  // moments or restrict keys dismissed this session), waitedSec, contended,
  // likedCount, goodCall.
  function decide(st, moment, ctx, now) {
    ctx = ctx || {};
    if (ctx.premium) return { ok: false, why: 'member' };
    if (ctx.inCall) return { ok: false, why: 'in-call' };
    var gone = ctx.dismissed || [];
    if (moment === 'restrict') {
      return gone.indexOf('restrict:' + (ctx.key || '')) >= 0 ? { ok: false, why: 'dismissed-this-session' } : { ok: true };
    }
    if (!PROACTIVE[moment]) return { ok: false, why: 'unknown' };
    if (gone.indexOf(moment) >= 0) return { ok: false, why: 'dismissed-this-session' };
    var why = blocked(st, now);
    if (why) return { ok: false, why: why };
    var s = copy(st);
    if (moment === 'search' && !(ctx.contended && ctx.waitedSec >= CAPS.searchAfterSec)) return { ok: false, why: 'not-waiting-long' };
    if (moment === 'liked' && !(ctx.likedCount > 0)) return { ok: false, why: 'nobody-liked' };
    if (moment === 'good' && !ctx.goodCall) return { ok: false, why: 'not-a-good-call' };
    if (moment === 'pass') {
      if (s.subDismiss < CAPS.passAfterDismissals) return { ok: false, why: 'subscription-not-dismissed-twice' };
      if (now - s.lastPassAt < CAPS.passCooldownMs) return { ok: false, why: 'pass-cooldown' };
    }
    return { ok: true };
  }

  // The first of `moments` (default: all, most relevant first) that may show.
  function best(st, ctxFor, now, moments) {
    var list = moments || ORDER;
    for (var i = 0; i < list.length; i++) {
      var d = decide(st, list[i], ctxFor(list[i]), now);
      if (d.ok) return list[i];
    }
    return null;
  }

  // Record that a prompt was put on screen.
  function shown(st, moment, now) {
    var s = copy(st);
    if (!PROACTIVE[moment]) return s;
    s.shown = s.shown.filter(function (t) { return now - t < 7 * DAY; }).concat([now]);
    // Offering the pass starts the count of subscription dismissals afresh.
    if (moment === 'pass') { s.lastPassAt = now; s.subDismiss = 0; }
    return s;
  }
  // Record a dismissal. Turning down a subscription offer counts towards the pass offer.
  function dismissed(st, moment) {
    var s = copy(st);
    if (moment !== 'pass') s.subDismiss += 1;
    return s;
  }
  function eventName(moment, action, app) { return 'plus_' + (app ? 'app_' : '') + moment + '_' + action; }

  var api = { CAPS: CAPS, fresh: fresh, touch: touch, finishedCall: finishedCall, blocked: blocked, decide: decide, best: best, shown: shown, dismissed: dismissed, eventName: eventName };

  // ---- Browser part -------------------------------------------------------------
  if (typeof window === 'undefined' || typeof document === 'undefined') return api;
  var KEY = 'tl_plus_moments';
  var state = fresh();
  var gone = []; // dismissed this session (restrict:<key> or a moment name)
  function load() { try { state = copy(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (_) { state = fresh(); } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) { /* storage blocked */ } }
  function track(moment, action) {
    if (typeof trackGrowthEvent === 'function') trackGrowthEvent(eventName(moment, action, false));
  }
  function tr(key, vars, fallback) {
    if (typeof t !== 'function') return fallback;
    var s = t(key, vars);
    return s && s !== key ? s : fallback;
  }
  function inCall() { return typeof callState !== 'undefined' && (callState === 'connecting' || callState === 'connected' || callState === 'reconnecting'); }
  function member() { return typeof isPremiumUser !== 'undefined' && !!isPremiumUser; }
  function ctx(extra) { return Object.assign({ premium: member(), inCall: inCall(), dismissed: gone }, extra || {}); }

  // Restriction prompts: app.js asks before opening the Plus dialog.
  api.allowRestrict = function (key) { return decide(state, 'restrict', ctx({ key: key }), Date.now()).ok; };
  api.restrictShown = function (key) { track('restrict', 'view'); };
  api.restrictDismissed = function (key) {
    gone.push('restrict:' + key);
    state = dismissed(state, 'restrict'); save(); track('restrict', 'dismiss');
  };
  api.restrictTapped = function () { track('restrict', 'tap'); };

  var css = '.tl-pm{display:flex;align-items:center;gap:10px;margin:10px 0;padding:10px 12px;border-radius:14px;border:1px solid rgba(242,193,78,.55);background:rgba(242,193,78,.1);color:var(--text,inherit);font-size:14px;line-height:1.35}'
    + '.tl-pm>span{flex:1;min-width:0}.tl-pm a{color:inherit;font-weight:800;text-decoration:underline;text-underline-offset:2px;white-space:nowrap}'
    + '.tl-pm button{flex:none;min-width:44px;min-height:44px;border:0;border-radius:99px;background:transparent;color:inherit;font-size:18px;cursor:pointer}'
    + '.tl-pm-line{margin:6px 0 0;padding:0;border:0;background:none;justify-content:center;font-size:13px;color:var(--muted,inherit)}';
  var styled = false;
  function ensureStyle() { if (styled) return; styled = true; var s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); }

  // One quiet, dismissible element; `where` places it, `href` is the Plus page.
  function card(moment, text, cta, cls, place) {
    ensureStyle();
    var el = document.createElement('div');
    el.className = 'tl-pm ' + (cls || '');
    el.setAttribute('role', 'note');
    var span = document.createElement('span');
    span.textContent = text + ' ';
    if (cta) {
      var a = document.createElement('a');
      a.href = '/pricing?utm_source=app&utm_medium=' + moment;
      a.textContent = cta;
      a.addEventListener('click', function () { track(moment, 'tap'); });
      span.appendChild(a);
    }
    var x = document.createElement('button');
    x.type = 'button'; x.textContent = '×';
    x.setAttribute('aria-label', tr('close', null, 'Close'));
    x.addEventListener('click', function () { el.remove(); gone.push(moment); state = dismissed(state, moment); save(); track(moment, 'dismiss'); });
    el.appendChild(span); el.appendChild(x);
    place(el);
    state = shown(state, moment, Date.now()); save(); track(moment, 'view');
    return el;
  }
  var homeEl = null;
  function clearHome() { if (homeEl) { homeEl.remove(); homeEl = null; } }
  function offerHome(extra, prices) {
    if (homeEl || inCall() || member()) return;
    var c = Object.assign({ goodCall: false, likedCount: 0 }, extra);
    var m = best(state, function () { return ctx(c); }, Date.now(), ['good', 'liked', 'pass']);
    if (!m) return;
    var text; var cta;
    if (m === 'liked') { text = tr('plusMomentLiked', { n: c.likedCount }, c.likedCount + ' people liked you.'); cta = tr('plusMomentLikedCta', null, 'See who with Plus'); }
    else if (m === 'good') { text = tr('plusMomentGood', null, 'That sounded like a good one.'); cta = tr('plusMomentGoodCta', null, 'See what Plus adds'); }
    else {
      text = tr('plusMomentPass', { price: (prices && prices.pass) || '' }, 'Not ready for a subscription? Try Plus for a day.');
      cta = tr('plusMomentPassCta', null, 'See passes');
    }
    homeEl = card(m, text, cta, '', function (el) { var h = document.getElementById('tlEngage'); if (h && h.parentNode) h.parentNode.insertBefore(el, h); else document.body.appendChild(el); });
  }
  var likedCount = 0; var lastGood = false; var passPrice = '';
  function refreshHome() { offerHome({ likedCount: likedCount, goodCall: lastGood }, { pass: passPrice }); }

  // While searching: "Plus members are matched first", once, after a real wait, in a busy queue.
  var searchEl = null; var searchTimer = null; var waitStart = 0; var contended = false;
  function clearSearch() { clearTimeout(searchTimer); searchTimer = null; waitStart = 0; if (searchEl) { searchEl.remove(); searchEl = null; } }
  function maybeSearchLine() {
    if (searchEl || !waitStart) return;
    var c = ctx({ contended: contended, waitedSec: (Date.now() - waitStart) / 1000 });
    if (!decide(state, 'search', c, Date.now()).ok) return;
    searchEl = card('search', tr('plusMomentSearch', null, 'Plus members are matched first.'), tr('plusMomentSearchCta', null, 'Learn more'), 'tl-pm-line', function (el) {
      var sub = document.getElementById('subText'); if (sub && sub.parentNode) sub.parentNode.insertBefore(el, sub.nextSibling);
    });
  }

  function init() {
    load();
    state = touch(state, Date.now()); save();
    if (typeof socket === 'undefined') return;
    var callAt = 0; var hearted = false; var lastSecs = 0;
    socket.on('waiting', function (d) {
      contended = !!(d && d.contended);
      if (!waitStart) { waitStart = Date.now(); searchTimer = setInterval(function () { if (typeof callState !== 'undefined' && callState === 'idle') clearSearch(); else maybeSearchLine(); }, 2500); }
      maybeSearchLine();
    });
    socket.on('matched', function () { clearSearch(); clearHome(); callAt = Date.now(); hearted = false; });
    socket.on('mutual-heart', function () { hearted = true; });
    function ended() {
      clearSearch();
      if (callAt) { lastSecs = (Date.now() - callAt) / 1000; state = finishedCall(state, lastSecs); save(); }
      callAt = 0;
      lastGood = hearted;
      setTimeout(refreshHome, 1500);
    }
    socket.on('partner-left', ended);
    window.addEventListener('tl-call-ended', ended);
    // A thumbs-up after a call of five minutes or more is a good call too.
    window.addEventListener('tl-call-rated', function (e) {
      if (e.detail === 'up' && lastSecs >= 300) { lastGood = true; refreshHome(); }
    });
    function likes() {
      if (member() || !socket.connected) return;
      socket.emit('get-likes', function (r) { likedCount = r && r.locked ? r.count || 0 : 0; refreshHome(); });
    }
    socket.on('connect', function () { setTimeout(likes, 4000); });
    socket.on('premium-status', function () { if (member()) { clearHome(); clearSearch(); } });
    fetch('/pricing.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (p) {
      if (p && p.passes && p.passes[0]) passPrice = p.passes[0].label;
    }).catch(function () { /* no price, the line just omits it */ });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { state = touch(state, Date.now()); save(); } });
    setTimeout(function () { likes(); refreshHome(); }, 6000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  return api;
});
