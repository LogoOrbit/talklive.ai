// --- TalkLive message time -------------------------------------------------
// One place that decides what a timestamp looks like, shared by every chat box
// in the product: the in-call stranger chat and friend chat on the call app
// (app.js), and the live chat and friend chat on the text app (chat.js).
//
// Both apps ship their own bubble markup and class names, so this module
// deliberately returns strings and a bare divider node rather than touching any
// list itself - the caller decides where a label goes and what it is called.
//
// Locale comes from the app's own language picker (I18N_STATE) rather than the
// browser, so switching TalkLive to German switches the clock format with it,
// and 12h/24h follows whatever that locale actually uses instead of being
// hard-coded. Plain script, no build step, matching the rest of /public.
(function () {
  'use strict';

  function currentLang() {
    try {
      if (typeof I18N_STATE !== 'undefined' && I18N_STATE && I18N_STATE.lang) return I18N_STATE.lang;
    } catch (e) { /* i18n.js not loaded on this page */ }
    return (typeof navigator !== 'undefined' && navigator.language) || 'en';
  }

  // t() when i18n.js is present, the English fallback otherwise. A key that has
  // no translation comes back as the key itself, which would print "todayLabel"
  // in a bubble - so that case falls through to the fallback too.
  function tr(key, fallback) {
    try {
      if (typeof t === 'function') {
        var s = t(key);
        if (s && s !== key) return s;
      }
    } catch (e) { /* not available */ }
    return fallback;
  }

  // Intl formatters are expensive to build and get used once per message, so
  // each is cached until the language actually changes.
  var cache = {};
  function formatter(kind, options) {
    var lang = currentLang();
    var hit = cache[kind];
    if (hit && hit.lang === lang) return hit.fmt;
    var fmt = null;
    try { fmt = new Intl.DateTimeFormat(lang, options); } catch (e) { fmt = null; }
    cache[kind] = { lang: lang, fmt: fmt };
    return fmt;
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // "4:31 PM" or "16:31", whichever the language uses.
  function time(ts) {
    var d = new Date(ts || Date.now());
    if (isNaN(d.getTime())) return '';
    var fmt = formatter('time', { hour: 'numeric', minute: '2-digit' });
    if (fmt) return fmt.format(d);
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function dayStamp(ts) {
    var d = new Date(ts || Date.now());
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function sameDay(a, b) {
    if (a == null || b == null) return false;
    return dayStamp(a) === dayStamp(b);
  }

  // Whole calendar days between two instants, counted from local midnight so
  // "yesterday" means yesterday's date and not "24 hours ago" - a message sent
  // at 11pm is still yesterday's when you read it at 1am.
  function daysApart(ts, now) {
    var a = new Date(ts), b = new Date(now);
    a.setHours(0, 0, 0, 0);
    b.setHours(0, 0, 0, 0);
    return Math.round((b - a) / 86400000);
  }

  // The separator text every messenger shows above the first message of a day:
  // Today / Yesterday / a weekday inside the last week / a full date beyond it.
  function day(ts, now) {
    var d = new Date(ts || Date.now());
    if (isNaN(d.getTime())) return '';
    var delta = daysApart(d.getTime(), now || Date.now());
    if (delta <= 0) return tr('today', 'Today');
    if (delta === 1) return tr('yesterday', 'Yesterday');
    if (delta < 7) {
      var wd = formatter('weekday', { weekday: 'long' });
      if (wd) return wd.format(d);
    }
    var full = formatter('date', { year: 'numeric', month: 'short', day: 'numeric' });
    if (full) return full.format(d);
    return dayStamp(d.getTime());
  }

  // A ready-made divider row. The caller passes its own class so the call app
  // and the text app can style it in their own stylesheets.
  function dividerNode(ts, className) {
    var row = document.createElement('div');
    row.className = className || 'chat-day-divider';
    row.setAttribute('role', 'separator');
    row.dataset.day = dayStamp(ts);
    var label = document.createElement('span');
    label.textContent = day(ts);
    row.appendChild(label);
    return row;
  }

  window.TalkLiveTime = {
    time: time,
    day: day,
    sameDay: sameDay,
    dayStamp: dayStamp,
    dividerNode: dividerNode,
  };
})();
