// ============================================================================
// TalkLive - reasons to come back, and the Premium perks built on them.
//
//   Daily streak      a call of 30s+ each day; one free streak-saver a week
//   Country passport  every country you have talked to, shareable
//   Today's question  one opener for everyone, every day
//   Weekly recap      last week's calls, countries and longest call
//   Who liked you     how many hearted you; Premium sees who, and calls back
//   Undo skip         Premium brings back the person just skipped
//   It's mutual       both hearted the call: one tap to add a friend
//   Invite friends    3 friends sign up through your link: 1 hour of Plus
//
// Loaded after app.js once the page is up (it is not needed to place a call)
// and reads app.js's globals: socket, t, showToast, isPremiumUser...
// Streak, passport, weekly stats and likes live on the server, with
// the profile; this device only remembers what it has already shown.
// ============================================================================
(function () {
  'use strict';

  // English for the strings below lives here rather than in i18n.js, so it is
  // not in the first page load; other languages carry them in /i18n/<lang>.js.
  var EN = {
    fxSupportChip: "New: Chat Support is here",
    fxSupportGo: "Chat now",
    engageAria: "Your TalkLive",
    engageRecap: "Last week: {calls} calls · {countries} countries · longest {minutes} min",
    engageStreakLabel: "day streak",
    engageStreakDone: "Done for today ✓",
    engageStreakDue: "Talk today to keep it",
    engagePassportLabel: "countries",
    engagePassportEmpty: "Talk to someone",
    engageLikesLabel: "liked you",
    engageLikesUnlock: "Unlock ",
    engageLikesNone: "No likes yet",
    engageLikesSee: "See who",
    engageQuestionLabel: "Today's question",
    engageStreakHow: "Talk to someone for 30 seconds every day to grow your streak. Miss a day? You get one free streak-saver a week.",
    engagePassportEmptyLong: "Every country you talk to gets a stamp. Have a 30-second call to collect your first one.",
    engagePassportTitle: "{n} countries",
    engagePassportSub: "Your passport: every country you have talked to.",
    engagePassportShare: "Share my passport",
    engagePassportShareText: "I've talked to people in {n} countries on TalkLive {flags} Come talk to me:",
    engageCopied: "Link copied",
    engageAgoMin: "{n} min ago",
    engageAgoHour: "{n} h ago",
    engageAgoDay: "{n} d ago",
    engageLikesReason: "{n} people liked you this month. See who they are and call them back.",
    engageLikesReasonNone: "When someone taps ❤️ on your call, they show up here.",
    engageOnline: "Online",
    engageCallBack: "Call",
    engageLikesTitle: "{n} people liked you",
    engageLikesSub: "Tap Call to ring someone who is online now.",
    engageUndoReason: "Skipped by mistake? Premium brings them back.",
    engageUndoBusy: "They already found someone else.",
    engageUndoExpired: "Too late to undo that one.",
    engageUndo: "Undo skip",
    engageStreakSaved: "{n}-day streak - saved by your weekly streak-saver",
    engageStreakUp: "{n}-day streak! Come back tomorrow",
    engageStreakStart: "Streak started! Talk tomorrow to keep it",
    engageStamp: "{flag} New stamp: {country} ({n} countries)",
    engageQuestionToast: "Today's question: {q}",
    presOnline: "Online now",
    presActive: "Active {time}",
    presUsual: "Usually online {from}–{to}",
    bellOn: "You'll be told when {name} comes online",
    bellOff: "Online alerts off for {name}",
    bellTitle: "Tell me when they're online",
    ntfOffTitle: "Get notified when friends message, call or come online",
    ntfTurnOn: "Turn on",
    ntfBlocked: "Notifications are blocked in this browser.",
    ntfHow: "How to fix",
    ntfOn: "Notifications are on",
    ntfTest: "Send a test",
    ntfTestSent: "Test sent. Check your notifications.",
    ntfTestNone: "Nothing arrived? Allow notifications for talklive.app in your browser settings.",
    ntfIos: "On iPhone, add TalkLive to your Home Screen to get notifications.",
    ntfIosHow: "Show me",
    ntfHelpTitle: "Turn on notifications",
    ntfHelpChrome: "Chrome / Edge: tap the or ⓘ next to the address, then Notifications → Allow.",
    ntfHelpSamsung: "Samsung Internet: ⋮ menu → Settings → Sites and downloads → Notifications → allow talklive.app.",
    ntfHelpFirefox: "Firefox: tap the next to the address, then clear the Notifications block.",
    ntfHelpSafari: "iPhone Safari: tap Share → Add to Home Screen, open TalkLive from there, then turn on notifications.",
    ntfHelpReload: "Then reload this page.",
    ntfFirstFriend: "Want to know when {name} messages or comes online?",
    restoreOk: "Streak restored: {n} days. Talk today to keep it going.",
    restoreNo: "This streak can't be restored right now.",
    restoreAsk: "Your {n}-day streak broke. Plus can bring it back.",
    callOffline: "{name} is offline right now. Tap to ask them to call you back, or ring the to know when they're online.",
    awayTitle: "While you were away",
    awayMsg: "{name} sent {n} message(s)",
    awayCall: "{name} wanted to talk",
    awayReply: "Reply",
    awayCall2: "Call back",
    plusFreezes: "{n} Plus streak freezes left this month.",
    plusFreezesFree: "Plus gives you 2 streak freezes a month.",
    plusFrozen: "{n}-day streak kept by a Plus freeze",
    plusMember: "Plus member",
    plusPriceHint: "Plus is {price} a month, about {perDay} a day.",
    plusTrialTitle: "A day of Plus, on us",
    plusTrialBody: "Thanks for being part of TalkLive. For the next 24 hours you have a gold name, legendary avatars, every filter, your full history and more. Enjoy!",
    plusTrialOk: "Let's go",
    likesFrom: "Someone from {where} liked you",
    likesMore: "and {n} more",
    likesSeeWho: "See who liked you",
    historyLocked: "{n} more people you met. See them all with Plus.",
    nudgeCall: "Great call! With Plus you never lose anyone you met.",
    nudgeHeart: "You both tapped ❤️! Plus keeps everyone you meet in your history.",
    engageMutual: "It's mutual! You both liked this call. Tap to add them as a friend.",
    engageUndoThem: "They came back! Your last chat is back on.",
  };
  if (typeof I18N_STRINGS !== 'undefined' && I18N_STRINGS.en) {
    Object.keys(EN).forEach(function (k) { if (!(k in I18N_STRINGS.en)) I18N_STRINGS.en[k] = EN[k]; });
  }

  var KEY = { streak: 'tl_streak', passport: 'tl_passport', server: 'tl_engage_state', recap: 'tl_recap_seen', question: 'tl_daily_q_seen' };
  var UNDO_MS = 15000;

  function read(k, d) {
    try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (_) { return d; }
  }
  function write(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* storage blocked */ }
  }
  function esc(s) { return typeof escapeHtml === 'function' ? escapeHtml(String(s)) : String(s); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  // Local calendar days, so a streak follows the person's own midnight.
  function dayKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function dayNum(key) {
    var p = key.split('-');
    return Math.round(new Date(+p[0], +p[1] - 1, +p[2]).getTime() / 86400000);
  }
  function flag(code) {
    return /^[A-Z]{2}$/.test(code || '') && code !== 'XX'
      ? String.fromCodePoint.apply(null, code.split('').map(function (c) { return 0x1f1a5 + c.charCodeAt(0); })) : '';
  }
  // A flag picture: emoji flags are blank letters on Windows ("IN"). If the
  // image is blocked, the two-letter code shows in its place.
  function flagImg(code, w) {
    if (!/^[A-Z]{2}$/.test(code || '') || code === 'XX') return '';
    var cc = code.toLowerCase();
    return '<span class="tl-flag" data-cc="' + code + '" style="width:' + w + 'px;height:' + Math.round(w * 0.75) + 'px">'
      + '<img src="https://flagcdn.com/w80/' + cc + '.png" srcset="https://flagcdn.com/w160/' + cc + '.png 2x" alt="" '
      + 'width="' + w + '" height="' + Math.round(w * 0.75) + '" loading="lazy" decoding="async" '
      + 'onerror="this.parentNode.classList.add(\'is-failed\');this.remove()"></span>';
  }
  function countryName(code) {
    return (typeof getCountryName === 'function' && getCountryName(code)) || code;
  }

  // --- Streak, passport and week: kept on the server ------------------------
  // The server counts real calls and saves the result with the profile, so it
  // follows a signed-in person to every device and lasts for good. This keeps
  // its last answer for an instant first paint; a browser's own pre-server
  // progress (KEY.streak / KEY.passport) is handed over once and then dropped.
  var state = read(KEY.server, null) || { streak: { count: 0, best: 0, doneToday: false }, passport: [], prevWeek: null };
  function setState(next) {
    if (!next || !next.streak) return;
    state = next;
    write(KEY.server, next);
    render();
  }
  function streak() { return state.streak; }
  function passport() { return { codes: state.passport || [] }; }

  function legacyProgress() {
    var s = read(KEY.streak, null);
    var p = read(KEY.passport, null);
    if (!s && !p) return {};
    return { streak: s || undefined, passport: (p && p.codes) || [] };
  }
  function syncWithServer() {
    if (!socket || !socket.connected) return;
    socket.emit('engage-merge', legacyProgress());
  }

  // --- Today's question ------------------------------------------------------
  var QUESTIONS = [
    '🍜 What food from your country should everyone try?', '🎵 What song would you play to a stranger?',
    '✈️ Where would you go tomorrow if you could?', '😂 What made you laugh this week?',
    '🏠 What is your city famous for?', '📚 What is something you learned recently?',
    '🎬 What movie do you recommend to everyone?', '🌅 Morning person or night owl?',
    '🗣️ Teach me one word in your language.', '🎮 What game could you play forever?',
    '🍕 Pineapple on pizza: yes or no?', '🎯 What is one goal you have this year?',
    '🐾 Do you have a pet? Tell me about it.', '🌍 What surprises visitors to your country?',
    '☕ Tea or coffee, and how do you take it?', '🎤 What is your go-to karaoke song?',
    '🏆 What is something you are proud of?', '📺 What show are you watching right now?',
    '🧳 Best trip you have ever taken?', '⚽ What sport do people love where you live?',
    '🎂 How do people celebrate birthdays where you are?', '🌦️ What is the weather like there right now?',
    '💼 What would be your dream job?', '🎨 What hobby would you pick up if you had time?',
    '🛍️ What is one thing you bought that was worth it?', '🌙 What do you do to relax at night?',
    '🎉 What is the best festival in your country?', '🍦 Favourite dessert of all time?',
    '📱 Which app do you use the most?', '🚀 Would you go to space if you could?',
    '🤝 What is a small thing that makes your day better?',
  ];
  // The questions are written with a leading emoji; the page shows the words only.
  function todaysQuestion() { return QUESTIONS[dayNum(dayKey()) % QUESTIONS.length].replace(/^[^A-Za-z0-9"'(]+/, ''); }

  // --- Landing strip ------------------------------------------------------------
  var strip = null;
  var likes = { count: 0, locked: true, list: [] };

  function buildStrip() {
    var anchor = document.querySelector('#setupPanel .animal-picker');
    if (!anchor || strip) return;
    // index.html reserves the slot so filling it does not shift the page.
    strip = document.getElementById('tlEngage');
    if (!strip) {
      strip = el('section', 'tl-engage');
      anchor.parentNode.insertBefore(strip, anchor);
    }
    strip.setAttribute('aria-label', t('engageAria'));
    strip.addEventListener('click', onStripClick);
    render();
  }

  function render() {
    if (!strip) return;
    var s = streak();
    var p = passport();
    var prev = state.prevWeek;
    var today = !!s.doneToday;
    var html = '';
    // The Chat Support launch (support-chat.js says whether it is running).
    if (supportPromoLive()) {
      html += '<button type="button" class="tl-engage-banner tl-engage-news" data-act="support"><span><i class="ti ti-headset" aria-hidden="true"></i> ' + esc(t('fxSupportChip')) + '</span>'
        + '<span class="tl-engage-new" aria-hidden="true">' + esc(t('fxSupportGo')) + '</span></button>';
    } else if (prev && read(KEY.recap, '') !== prev.week) {
      html += '<div class="tl-engage-banner tl-engage-recap"><span>📊 ' + esc(t('engageRecap', {
        calls: prev.calls, countries: prev.countries, minutes: Math.max(1, Math.round(prev.longest / 60)),
      })) + '</span><button type="button" class="tl-engage-x" data-act="recap" aria-label="' + esc(t('close')) + '">&times;</button></div>';
    }
    // Someone who has not talked to anyone yet has three zeros to look at; the
    // tiles appear with their first streak day, country or like.
    var fresh = !s.count && !s.lost && !p.codes.length && !likes.count;
    if (!fresh) html += '<div class="tl-engage-tiles">'
      + '<button type="button" class="tl-engage-tile' + (today ? ' is-done' : (s.count ? ' is-due' : '')) + '" data-act="streak">'
      + '<span class="tl-engage-big"><i class="ti ti-flame" aria-hidden="true"></i> ' + s.count + '</span>'
      + '<span class="tl-engage-label">' + esc(t('engageStreakLabel')) + '</span>'
      + '<span class="tl-engage-sub">' + esc(today ? t('engageStreakDone') : t('engageStreakDue')) + '</span></button>'
      + '<button type="button" class="tl-engage-tile" data-act="passport">'
      + '<span class="tl-engage-big"><i class="ti ti-globe" aria-hidden="true"></i> ' + p.codes.length + '</span>'
      + '<span class="tl-engage-label">' + esc(t('engagePassportLabel')) + '</span>'
      + '<span class="tl-engage-sub tl-engage-flags">' + (p.codes.length ? p.codes.slice(-4).map(function (c) { return flagImg(c, 20); }).join('') : esc(t('engagePassportEmpty'))) + '</span></button>'
      + '<button type="button" class="tl-engage-tile tl-engage-likes" data-act="likes">'
      + '<span class="tl-engage-big"><i class="ti ti-heart" aria-hidden="true"></i> ' + likes.count + '</span>'
      + '<span class="tl-engage-label">' + esc(t('engageLikesLabel')) + '</span>'
      + '<span class="tl-engage-sub">' + esc(likes.locked ? (likes.count ? t('engageLikesUnlock') : t('engageLikesNone')) : t('engageLikesSee')) + '</span></button>'
      + '</div>';
    html += '<div class="tl-engage-q"><small>' + esc(t('engageQuestionLabel')) + '</small><span>' + esc(todaysQuestion()) + '</span></div>';
    strip.innerHTML = html;
  }

  function onStripClick(e) {
    var b = e.target.closest('[data-act]');
    if (!b) return;
    var act = b.dataset.act;
    if (act === 'support') {
      if (typeof trackGrowthEvent === 'function') trackGrowthEvent('support_promo_chip');
      if (window.TLSupport) window.TLSupport.open();
      return;
    }
    if (act === 'recap') { write(KEY.recap, state.prevWeek ? state.prevWeek.week : ''); render(); return; }
    if (act === 'streak') {
      // A streak that just broke: Plus brings it back (same rule as the app).
      var lost = state.streak && state.streak.lost;
      if (state.streak && !state.streak.count && lost && lost.restorable && lost.count >= 2) {
        if (!isPremiumUser) { plusUpsell(t('restoreAsk', { n: lost.count }), 'streak'); return; }
        socket.emit('streak-restore', function (r) {
          showToast(r && r.ok ? t('restoreOk', { n: r.count || lost.count }) : t('restoreNo'), r && r.ok ? 'success' : 'social');
        });
        return;
      }
      var fz = state.streak && state.streak.freezesLeft;
      showToast(t('engageStreakHow') + ' ' + (typeof fz === 'number' ? t('plusFreezes', { n: fz }) : t('plusFreezesFree')), 'success');
      return;
    }
    if (act === 'passport') { openPassport(); return; }
    if (act === 'likes') openLikes();
  }

  // --- Small dialogs (built on demand, styled like the Premium card) --------
  function dialog(id, inner) {
    var m = document.getElementById(id);
    if (!m) {
      m = el('div', 'modal-overlay hidden');
      m.id = id;
      m.addEventListener('click', function (e) {
        if (e.target === m || e.target.closest('.pu-close')) closeModal(m);
      });
      document.body.appendChild(m);
    }
    m.innerHTML = '<div class="pu-box tl-engage-dialog" role="dialog" aria-modal="true" tabindex="-1">'
      + '<button type="button" class="pu-close" aria-label="' + esc(t('close')) + '">&times;</button>' + inner + '</div>';
    openModal(m);
    // Focus the dialog, not its close button, so it opens without a focus ring.
    m.firstChild.focus({ preventScroll: true });
    return m;
  }

  function openPassport() {
    var p = passport();
    var grid = p.codes.length
      ? '<div class="tl-passport-grid">' + p.codes.map(function (c, i) {
        // Each stamp sits at its own slight tilt and lands one after another.
        var tilt = ((c.charCodeAt(0) * 7 + c.charCodeAt(1) * 3) % 9) - 4;
        return '<span class="tl-stamp' + (i === p.codes.length - 1 ? ' is-newest' : '') + '" style="--tilt:' + tilt + 'deg;--i:' + Math.min(i, 20) + '">'
          + flagImg(c, 44) + '<small>' + esc(countryName(c)) + '</small></span>';
      }).join('') + '</div>'
      : '<p class="pu-reason">' + esc(t('engagePassportEmptyLong')) + '</p>';
    var m = dialog('passportModal',
      '<div class="pu-hero" aria-hidden="true"><span class="pu-gem tl-gem-green">🌍</span></div>'
      + '<div class="pu-title">' + esc(t('engagePassportTitle', { n: p.codes.length })) + '</div>'
      + '<p class="pu-reason">' + esc(t('engagePassportSub')) + '</p>' + grid
      + (p.codes.length ? '<button type="button" class="pu-cta" data-share>↗ ' + esc(t('engagePassportShare')) + '</button>' : ''));
    var share = m.querySelector('[data-share]');
    if (share) share.addEventListener('click', function () { sharePassport(p.codes); });
  }

  function sharePassport(codes) {
    var url = typeof shareUrl === 'function' ? shareUrl() : 'https://talklive.app/';
    var text = t('engagePassportShareText', { n: codes.length, flags: codes.slice(0, 12).map(flag).join('') });
    if (typeof trackGrowthEvent === 'function') trackGrowthEvent('passport_share');
    if (navigator.share) {
      navigator.share({ title: 'TalkLive', text: text, url: url }).catch(function () { /* dismissed */ });
      return;
    }
    try {
      navigator.clipboard.writeText(text + ' ' + url).then(function () { showToast(t('engageCopied'), 'success'); }, function () { /* permission denied */ });
    } catch (_) { /* no clipboard */ }
  }

  function refreshLikes() {
    if (!socket || !socket.connected) return;
    socket.emit('get-likes', function (res) {
      res = res || {};
      likes = { count: res.count || 0, locked: !!res.locked, list: res.list || [], countries: res.countries || [] };
      render();
    });
  }

  function ago(ts) {
    var m = Math.max(1, Math.round((Date.now() - ts) / 60000));
    if (m < 60) return t('engageAgoMin', { n: m });
    var h = Math.round(m / 60);
    if (h < 24) return t('engageAgoHour', { n: h });
    return t('engageAgoDay', { n: Math.round(h / 24) });
  }

  // The local Plus price, from /pricing.json once: "Plus is $9.99 a month, about $0.33 a day."
  var pricingCache = null; var pricingReq = null;
  function loadPricing() {
    if (pricingCache) return Promise.resolve(pricingCache);
    if (!pricingReq) {
      pricingReq = fetch('/pricing.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
        if (j && j.monthly && j.monthly.amount > 0 && j.currency) pricingCache = j; else pricingReq = null;
        return pricingCache;
      }).catch(function () { pricingReq = null; return null; });
    }
    return pricingReq;
  }
  function priceHint() {
    var p = pricingCache;
    if (!p) return '';
    try {
      var perDay = new Intl.NumberFormat(undefined, { style: 'currency', currency: p.currency }).format(p.monthly.amount / 30);
      return t('plusPriceHint', { price: p.monthly.label, perDay: perDay });
    } catch (_) { return ''; }
  }
  // The Plus dialog with the price added to its reason line, once the price is known.
  function plusUpsell(message, perk) {
    showPremiumUpsell(message + (priceHint() ? ' ' + priceHint() : ''), perk);
    if (pricingCache) return;
    loadPricing().then(function () {
      var line = priceHint(); var r = document.getElementById('puReason');
      if (line && r && r.textContent === message) r.textContent = message + ' ' + line;
    });
  }

  function openLikes() {
    if (likes.locked) {
      if (typeof trackGrowthEvent === 'function') trackGrowthEvent('likes_locked_tap');
      if (!likes.count) { plusUpsell(t('engageLikesReasonNone'), 'likes'); return; }
      // A teaser: real likes, one row each with the country, names hidden.
      var shown = likes.countries.slice(0, 5);
      if (!shown.length) shown = [''];
      var tm = dialog('likesModal',
        '<div class="pu-hero" aria-hidden="true"><span class="pu-gem tl-gem-pink">❤️</span></div>'
        + '<div class="pu-title">' + esc(t('engageLikesTitle', { n: likes.count })) + '</div>'
        + '<ul class="tl-likes">' + shown.map(function (c) {
          return '<li><span class="tl-likes-who"><b><span class="tl-blur-av">?</span>' + esc(t('likesFrom', { where: c ? flag(c) + ' ' + countryName(c) : '🌍' })) + '</b></span>🔒</li>';
        }).join('') + '</ul>'
        + (likes.count > shown.length ? '<p class="pu-reason">' + esc(t('likesMore', { n: likes.count - shown.length })) + '</p>' : '')
        + '<button type="button" class="pu-cta tl-see-who">' + esc(t('likesSeeWho')) + '</button>'
        + '<p class="pu-reason tl-price-hint" style="display:none"></p>');
      var hintEl = tm.querySelector('.tl-price-hint');
      loadPricing().then(function () { var line = priceHint(); if (line && hintEl) { hintEl.textContent = line; hintEl.style.display = ''; } });
      var go = tm.querySelector('.tl-see-who');
      if (go) go.addEventListener('click', function () { closeModal(tm); plusUpsell(t('engageLikesReason', { n: likes.count }), 'likes'); });
      return;
    }
    var rows = likes.list.length
      ? '<ul class="tl-likes">' + likes.list.map(function (l) {
        return '<li><span class="tl-likes-who"><b>' + flagImg(l.countryCode, 18) + ' ' + esc(l.username) + '</b><small>'
          + (l.online ? '<i class="tl-dot"></i>' + esc(t('engageOnline')) + ' · ' : '') + esc(ago(l.at)) + '</small></span>'
          + (l.online ? '<button type="button" class="tl-likes-call" data-call="' + esc(l.clientId) + '" data-name="' + esc(l.username) + '">📞 ' + esc(t('engageCallBack')) + '</button>' : '')
          + '</li>';
      }).join('') + '</ul>'
      : '<p class="pu-reason">' + esc(t('engageLikesReasonNone')) + '</p>';
    var m = dialog('likesModal',
      '<div class="pu-hero" aria-hidden="true"><span class="pu-gem tl-gem-pink">❤️</span></div>'
      + '<div class="pu-title">' + esc(t('engageLikesTitle', { n: likes.count })) + '</div>'
      + '<p class="pu-reason">' + esc(t('engageLikesSub')) + '</p>' + rows);
    m.querySelectorAll('[data-call]').forEach(function (b) {
      b.addEventListener('click', function () {
        closeModal(m);
        if (typeof requestCallBack === 'function') requestCallBack(b.dataset.call, b.dataset.name);
      });
    });
  }

  // --- Chat Support launch chip --------------------------------------------------
  // support-chat.js owns the announcement window; this only mirrors it on the
  // home screen and repaints when it starts or ends.
  function supportPromoLive() { return !!(window.TLSupport && window.TLSupport.promoLive && window.TLSupport.promoLive()); }
  window.addEventListener('tl-support-promo', function () { render(); });

  // --- Undo skip ----------------------------------------------------------------
  var undoBtn = null;
  var undoTimer = null;
  function hideUndo() {
    clearTimeout(undoTimer);
    if (undoBtn) undoBtn.classList.add('hidden');
  }
  function offerUndo() {
    var anchor = document.getElementById('subText');
    if (!anchor) return;
    if (!undoBtn) {
      undoBtn = el('button', 'tl-undo-skip hidden');
      undoBtn.type = 'button';
      undoBtn.addEventListener('click', function () {
        hideUndo();
        if (!isPremiumUser) {
          plusUpsell(t('engageUndoReason'), 'undo');
          return;
        }
        socket.emit('undo-skip', function (res) {
          if (res && res.ok) return;
          var why = res && res.reason;
          showToast(t(why === 'busy' ? 'engageUndoBusy' : why === 'premium' ? 'engageUndoReason' : 'engageUndoExpired'), 'warn');
        });
      });
      anchor.parentNode.insertBefore(undoBtn, anchor.nextSibling);
    }
    undoBtn.innerHTML = '↩ ' + esc(t('engageUndo')) + (isPremiumUser ? '' : ' <i class="ti ti-gem" aria-hidden="true"></i>');
    undoBtn.classList.remove('hidden');
    clearTimeout(undoTimer);
    undoTimer = setTimeout(hideUndo, UNDO_MS);
  }

  // --- Hooks app.js calls ---------------------------------------------------
  // A call ended: count it if it was a real one.
  // A call ended. The server counts it and answers with 'engage-update'; this
  // hook stays for app.js and has nothing left to do on the page.
  function onCall() {}

  // The server's answer to a counted call: new numbers, and what to say.
  function onEngageUpdate(msg) {
    if (!msg) return;
    setState(msg.state);
    var bump = msg.bump;
    var parts = [];
    if (bump && bump.count > 1) parts.push(t(bump.frozen ? 'plusFrozen' : bump.saved ? 'engageStreakSaved' : 'engageStreakUp', { n: bump.count }));
    else if (bump) parts.push(t('engageStreakStart'));
    if (msg.stamp) parts.push(t('engageStamp', { flag: flag(msg.stamp.country), country: countryName(msg.stamp.country), n: msg.stamp.total }));
    if (parts.length) showToast(parts.join(' · '), 'success');
  }

  // The partner is on the line: Premium badge, and today's question once a day.
  function onReveal(partner) {
    var nameEl = document.getElementById('partnerName');
    if (nameEl) nameEl.classList.toggle('tl-plus-name', !!(partner && partner.premium));
    // Plus members' faces come alive, as in the app.
    var face = document.getElementById('partnerAnimal');
    if (face) face.classList.toggle('tl-plus-alive', !!(partner && partner.premium));
    if (nameEl && partner && partner.premium) {
      var b = el('span', 'tl-plus-tag', '<i class="ti ti-gem" aria-hidden="true"></i> Plus');
      nameEl.appendChild(b);
      plusEntrance();
    }
    if (read(KEY.question, '') !== dayKey()) {
      write(KEY.question, dayKey());
      setTimeout(function () {
        if (typeof callState === 'undefined' || callState === 'connected') showToast(t('engageQuestionToast', { q: todaysQuestion() }), 'social');
      }, 2500);
    }
  }

  // ---- Server events ------------------------------------------------------------
  socket.on('engage-state', function (next) {
    setState(next);
    // Handed over: the browser's own copy is no longer the truth.
    if (next && next.merged) {
      try { localStorage.removeItem(KEY.streak); localStorage.removeItem(KEY.passport); localStorage.removeItem('tl_week_stats'); } catch (_) { /* storage blocked */ }
    }
  });
  socket.on('engage-update', onEngageUpdate);
  socket.on('connect', function () { setTimeout(syncWithServer, 800); });

  socket.on('mutual-heart', function () {
    var add = document.getElementById('addFriendBtn');
    showToast(t('engageMutual'), 'success', function () {
      if (add && !add.disabled) add.click();
    });
    if (typeof vibrate === 'function') vibrate([20, 40, 20, 40, 20]);
  });
  socket.on('matched', function (m) {
    hideUndo();
    if (m && m.undo === 'them') setTimeout(function () { showToast(t('engageUndoThem'), 'social'); }, 1500);
  });
  socket.on('premium-status', function () { setTimeout(refreshLikes, 300); });
  socket.on('connect', function () { setTimeout(refreshLikes, 1500); });

  // ---- Plus touches ---------------------------------------------------------
  (function style() {
    var css = '.tl-plus-name{background:linear-gradient(90deg,#ffe08a,#f2c14e,#d97706,#f2c14e);-webkit-background-clip:text;background-clip:text;color:transparent!important;font-weight:800}'
      + '.tl-plus-tag{margin-left:6px;font-size:11px;padding:1px 7px;border-radius:99px;border:1px solid rgba(245,196,81,.6);color:#f5c451;background:rgba(245,196,81,.14);-webkit-text-fill-color:#f5c451;vertical-align:middle}'
      + '.tl-plus-sweep{position:fixed;inset:0;pointer-events:none;z-index:60;background:linear-gradient(110deg,transparent 30%,rgba(245,196,81,.28) 45%,rgba(255,243,196,.4) 50%,rgba(245,196,81,.28) 55%,transparent 70%);background-size:250% 100%;animation:tl-sweep 1.1s linear forwards}'
      + '.tl-plus-pill{position:fixed;top:110px;left:50%;transform:translateX(-50%);z-index:61;padding:8px 16px;border-radius:99px;border:1px solid #f5c451;background:rgba(0,0,0,.6);color:#f5c451;font-weight:800;animation:tl-pill 2.6s ease forwards;pointer-events:none}'
      + '@keyframes tl-sweep{from{background-position:120% 0}to{background-position:-30% 0}}'
      + '@keyframes tl-pill{0%{opacity:0;transform:translate(-50%,-8px) scale(.8)}12%{opacity:1;transform:translate(-50%,0) scale(1)}85%{opacity:1}100%{opacity:0}}'
      + '.tl-blur-av{display:inline-grid;place-items:center;width:30px;height:30px;margin-right:10px;border-radius:50%;background:linear-gradient(135deg,rgba(245,196,81,.6),rgba(124,92,255,.5));color:#fff}'
      + '.tl-locked-row{display:block;width:100%;margin:8px 0;padding:12px 14px;border-radius:14px;border:1px solid rgba(245,196,81,.45);background:rgba(245,196,81,.1);color:inherit;text-align:left;cursor:pointer;font:inherit}'
      + '.tl-plus-alive{position:relative;overflow:hidden;border-radius:50%;animation:tl-alive 4.6s ease-in-out infinite}'
      + '.tl-plus-alive::after{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 35%,rgba(255,243,196,.55) 50%,transparent 65%);background-size:300% 100%;animation:tl-shine 4.6s linear infinite;pointer-events:none}'
      + '@keyframes tl-alive{0%,78%,100%{transform:none}82%{transform:rotate(-7deg)}86%{transform:rotate(5deg)}90%{transform:rotate(-2deg) translateY(-2px)}94%{transform:translateY(0)}}'
      + '@keyframes tl-shine{0%,70%{background-position:130% 0}90%,100%{background-position:-30% 0}}'
      + '@media (prefers-reduced-motion:reduce){.tl-plus-sweep,.tl-plus-pill{animation:none;display:none}.tl-plus-alive,.tl-plus-alive::after{animation:none}}';
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  })();

  function plusEntrance() {
    var sw = el('div', 'tl-plus-sweep'); var pill = el('div', 'tl-plus-pill', esc(t('plusMember')));
    document.body.appendChild(sw); document.body.appendChild(pill);
    setTimeout(function () { sw.remove(); pill.remove(); }, 2800);
  }

  // The free Plus day the server gives an account after its 3rd good call.
  socket.on('plus-trial', function () {
    var m = dialog('plusTrialModal',
      '<div class="pu-hero" aria-hidden="true"><span class="pu-gem">🎁</span></div>'
      + '<div class="pu-title">' + esc(t('plusTrialTitle')) + '</div>'
      + '<p class="pu-reason">' + esc(t('plusTrialBody')) + '</p>'
      + '<button type="button" class="pu-cta tl-trial-ok">' + esc(t('plusTrialOk')) + '</button>');
    var ok = m.querySelector('.tl-trial-ok');
    if (ok) ok.addEventListener('click', function () { closeModal(m); });
  });

  // Gold names for Plus friends, and the "more with Plus" history row.
  var plusIds = {};
  var historyHidden = 0;
  socket.on('state-sync', function (st) {
    st = st || {};
    plusIds = {};
    (st.friends || []).concat(st.chatHistory || []).forEach(function (p) { if (p && p.premium) plusIds[p.clientId] = 1; });
    historyHidden = st.historyHidden || 0;
    setTimeout(function () { goldFriends(); lockedHistory(); }, 0);
  });
  function goldFriends() {
    document.querySelectorAll('.friend-row-main[data-id], .history-item [data-id]').forEach(function (n) {
      if (!plusIds[n.dataset.id]) return;
      var label = n.querySelector('.friend-item-label, .history-name, strong');
      if (label) label.classList.add('tl-plus-name');
    });
  }
  function lockedHistory() {
    var list = document.getElementById('historyList');
    if (!list) return;
    var old = list.querySelector('.tl-locked-row');
    if (old) old.remove();
    if (!historyHidden || isPremiumUser) return;
    var row = el('button', 'tl-locked-row', esc(t('historyLocked', { n: historyHidden })));
    row.type = 'button';
    row.addEventListener('click', function () { plusUpsell(t('historyLocked', { n: historyHidden }), 'history'); });
    list.appendChild(row);
  }
  ['renderFriendsList', 'renderHistory'].forEach(function (name) {
    var orig = window[name];
    if (typeof orig !== 'function') return;
    window[name] = function () { var r = orig.apply(this, arguments); goldFriends(); if (name === 'renderHistory') lockedHistory(); return r; };
  });

  // Only five animals and five characters are free (TalkLiveAnimals.FREE_FACES,
  // mirrored by the server); every other face is Plus.
  var FACE_BTN = '.animal-option[data-avatar], .avatar-option[data-avatar]';
  function isPlusFace(id) { return /^[ac]:/.test(id) && !window.TalkLiveAnimals.isFree(id); }
  // The invite reward unlocks one legendary face: the first one picked.
  var look = null;
  socket.on('premium-status', function (st) { look = st && st.look ? st.look : null; markFaces(); });
  // The face already worn stays selectable: nobody loses the avatar they had.
  function faceOk(id) { return isPremiumUser || id === myAvatar || (look && (!look.face || look.face === id)); }
  function markFaces() {
    document.querySelectorAll(FACE_BTN).forEach(function (b) {
      if (!isPlusFace(b.dataset.avatar)) return;
      b.classList.add('tl-plus-face');
      b.dataset.lock = faceOk(b.dataset.avatar) ? '💎' : '🔒';
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest(FACE_BTN);
    if (!b || !isPlusFace(b.dataset.avatar) || faceOk(b.dataset.avatar)) return;
    e.stopPropagation(); e.preventDefault();
    plusUpsell(t('plusMember'), 'avatars');
  }, true);
  if (typeof window.renderAnimalPicker === 'function') {
    var origPicker = window.renderAnimalPicker;
    window.renderAnimalPicker = function () { var r = origPicker.apply(this, arguments); markFaces(); return r; };
  }
  if (typeof window.renderAvatarGrid === 'function') {
    var origGrid = window.renderAvatarGrid;
    window.renderAvatarGrid = function () { var r = origGrid.apply(this, arguments); markFaces(); return r; };
  }
  markFaces();
  socket.on('premium-status', function () { setTimeout(function () { markFaces(); lockedHistory(); }, 0); });

  // A gentle Plus hint after a call that clearly went well (10+ minutes, or
  // both tapped the heart): at most once a day, quiet for 3 days if ignored.
  var callStart = 0; var hearted = false;
  socket.on('matched', function () { callStart = Date.now(); hearted = false; });
  socket.on('mutual-heart', function () { hearted = true; });
  socket.on('partner-left', function () { afterCall(); });
  window.addEventListener('tl-call-ended', afterCall);
  function afterCall() {
    if (!callStart || isPremiumUser) { callStart = 0; return; }
    var secs = (Date.now() - callStart) / 1000; var h = hearted;
    callStart = 0;
    var now = Date.now();
    if (now - (read('tl_nudge_at', 0) || 0) < 864e5 || now < (read('tl_nudge_snooze', 0) || 0)) return;
    if (secs < 600 && !h) return;
    write('tl_nudge_at', now);
    write('tl_nudge_snooze', now + 3 * 864e5);
    setTimeout(function () {
      showToast(t(h ? 'nudgeHeart' : 'nudgeCall'), 'success', function () { write('tl_nudge_snooze', 0); plusUpsell(t(h ? 'nudgeHeart' : 'nudgeCall'), 'history'); });
    }, 1500);
  }

  // ---- Friends: clear status, usual hours, online bell -----------------------
  var friendsById = {};
  socket.on('state-sync', function (st) {
    st = st || {};
    var before = Object.keys(friendsById).length;
    friendsById = {};
    (st.friends || []).forEach(function (f) { if (f && f.clientId) friendsById[f.clientId] = f; });
    notifs = st.notifications || notifs;
    setTimeout(decorateFriends, 0);
    // First friend: the best moment to offer notifications.
    var list = st.friends || [];
    if (before === 0 && list.length === 1 && pushState() === 'off' && !read('tl_ntf_first', 0)) {
      write('tl_ntf_first', 1);
      setTimeout(function () { showToast(t('ntfFirstFriend', { name: list[0].username || '' }), 'social', enableNotifications); }, 1200);
    }
    maybeAway();
  });
  function hourLabel(utcHour) {
    var d = new Date(); d.setUTCHours(utcHour, 0, 0, 0);
    try { return d.toLocaleTimeString([], { hour: 'numeric' }); } catch (_) { return String(d.getHours()); }
  }
  function statusLine(f) {
    if (f.online) return '<span class="tl-pres is-on">' + esc(t('presOnline')) + '</span>';
    var parts = [];
    if (f.lastSeen && typeof timeAgo === 'function') parts.push(t('presActive', { time: timeAgo(f.lastSeen) }));
    if (f.usual) parts.push(t('presUsual', { from: hourLabel(f.usual.from), to: hourLabel(f.usual.to) }));
    return parts.length ? '<span class="tl-pres">' + esc(parts.join(' · ')) + '</span>' : '';
  }
  function decorateFriends() {
    document.querySelectorAll('#friendsList .friend-row-main[data-id]').forEach(function (row) {
      var f = friendsById[row.dataset.id];
      if (!f) return;
      var old = row.querySelector('.tl-pres-line'); if (old) old.remove();
      var line = el('span', 'friend-item-line tl-pres-line', statusLine(f));
      row.appendChild(line);
      var item = row.parentElement;
      if (item && !item.querySelector('.tl-bell')) {
        var bell = el('button', 'tl-bell', '');
        bell.type = 'button';
        bell.title = t('bellTitle'); bell.setAttribute('aria-label', t('bellTitle'));
        bell.dataset.id = f.clientId;
        var msg = item.querySelector('.friend-msg-btn');
        item.insertBefore(bell, msg || null);
      }
      var b = item && item.querySelector('.tl-bell');
      if (b) { b.textContent = f.alert ? '🔔' : '🔕'; b.classList.toggle('is-on', !!f.alert); }
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.tl-bell');
    if (!b) return;
    e.stopPropagation(); e.preventDefault();
    var f = friendsById[b.dataset.id]; if (!f) return;
    var on = !f.alert; f.alert = on; decorateFriends();
    socket.emit('online-alert', { clientId: f.clientId, on: on });
    showToast(t(on ? 'bellOn' : 'bellOff', { name: f.username || '' }), 'success');
    if (on && pushState() !== 'on') setTimeout(enableNotifications, 600);
  }, true);
  if (typeof window.renderFriendsList === 'function') {
    var origFriends = window.renderFriendsList;
    window.renderFriendsList = function () { var r = origFriends.apply(this, arguments); decorateFriends(); renderNotifyBar(); return r; };
  }

  // ---- Browser notifications: a visible switch, help, and a test ------------
  function isIos() { return /iphone|ipad|ipod/i.test(navigator.userAgent); }
  function standalone() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone; }
  function pushState() {
    if (!('Notification' in window) || !('PushManager' in window)) return isIos() && !standalone() ? 'ios' : 'none';
    return Notification.permission === 'granted' ? 'on' : Notification.permission === 'denied' ? 'blocked' : 'off';
  }
  function enableNotifications() {
    if (pushState() === 'blocked') return showHelp();
    if (pushState() === 'ios') return showHelp();
    if (!window.TalkLivePush) return;
    window.TalkLivePush.enable('friends').then(function () { renderNotifyBar(); });
  }
  function showHelp() {
    dialog('ntfHelp', '<div class="pu-hero" aria-hidden="true"><span class="pu-gem">🔔</span></div>'
      + '<div class="pu-title">' + esc(t('ntfHelpTitle')) + '</div><ol class="tl-ntf-steps">'
      + ['ntfHelpChrome', 'ntfHelpSamsung', 'ntfHelpFirefox', 'ntfHelpSafari'].map(function (k) { return '<li>' + esc(t(k)) + '</li>'; }).join('')
      + '</ol><p class="pu-reason">' + esc(t('ntfHelpReload')) + '</p>');
  }
  function renderNotifyBar() {
    var list = document.getElementById('friendsList');
    if (!list) return;
    var bar = document.getElementById('tlNotifyBar');
    var state = pushState();
    if (state === 'none') { if (bar) bar.remove(); return; }
    if (!bar) { bar = el('div', 'tl-notify-bar'); bar.id = 'tlNotifyBar'; list.parentNode.insertBefore(bar, list); }
    var html;
    if (state === 'on') html = '<span>✅ ' + esc(t('ntfOn')) + '</span><button type="button" data-ntf="test">' + esc(t('ntfTest')) + '</button>';
    else if (state === 'blocked') html = '<span>' + esc(t('ntfBlocked')) + '</span><button type="button" data-ntf="help">' + esc(t('ntfHow')) + '</button>';
    else if (state === 'ios') html = '<span>📱 ' + esc(t('ntfIos')) + '</span><button type="button" data-ntf="help">' + esc(t('ntfIosHow')) + '</button>';
    else html = '<span>🔔 ' + esc(t('ntfOffTitle')) + '</span><button type="button" data-ntf="on" class="is-primary">' + esc(t('ntfTurnOn')) + '</button>';
    bar.innerHTML = html;
    bar.classList.toggle('is-on', state === 'on');
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-ntf]');
    if (!b) return;
    var a = b.dataset.ntf;
    if (a === 'on') enableNotifications();
    else if (a === 'help') showHelp();
    else if (a === 'test') socket.emit('push-test', function (r) { showToast(t(r && r.sent ? 'ntfTestSent' : 'ntfTestNone'), r && r.sent ? 'success' : 'social'); });
  });
  // Already allowed: re-register, so notifications follow this browser's profile.
  socket.on('connect', function () { setTimeout(function () { if (pushState() === 'on' && window.TalkLivePush) window.TalkLivePush.enable('refresh'); }, 4000); });
  renderNotifyBar();

  // ---- While you were away ----------------------------------------------------
  var notifs = [];
  var hiddenAt = 0;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { hiddenAt = Date.now(); write('tl_away_since', hiddenAt); }
    else if (hiddenAt && Date.now() - hiddenAt > 10 * 60000) { awaySince = hiddenAt; awayShown = false; }
  });
  var awaySince = read('tl_away_since', 0) || 0;
  if (Date.now() - awaySince < 10 * 60000) awaySince = 0;
  var awayShown = false;
  function maybeAway() {
    if (awayShown || !awaySince || document.hidden) return;
    var since = awaySince;
    var rows = {};
    notifs.forEach(function (n) {
      if (!n || !n.ts || n.ts < since || !n.fromClientId) return;
      if (n.type !== 'message' && n.type !== 'call_back_request') return;
      var r = rows[n.fromClientId] || (rows[n.fromClientId] = { id: n.fromClientId, name: n.username || '', msgs: 0, call: false });
      if (n.type === 'message') r.msgs++; else r.call = true;
    });
    var list = Object.keys(rows).map(function (k) { return rows[k]; });
    awayShown = true;
    write('tl_away_since', 0);
    if (!list.length) return;
    var m = dialog('awayModal', '<div class="pu-title">' + esc(t('awayTitle')) + '</div><ul class="tl-likes">'
      + list.slice(0, 6).map(function (r) {
        return '<li><span class="tl-likes-who"><b>' + esc(r.name) + '</b><small>'
          + esc(r.call ? t('awayCall', { name: r.name }) : t('awayMsg', { name: r.name, n: r.msgs })) + '</small></span>'
          + '<button type="button" class="tl-likes-call" data-away="' + (r.call ? 'call' : 'reply') + '" data-id="' + esc(r.id) + '" data-name="' + esc(r.name) + '">'
          + esc(r.call ? '📞 ' + t('awayCall2') : '💬 ' + t('awayReply')) + '</button></li>';
      }).join('') + '</ul>');
    m.querySelectorAll('[data-away]').forEach(function (b) {
      b.addEventListener('click', function () {
        closeModal(m);
        if (b.dataset.away === 'call' && typeof requestCallBack === 'function') requestCallBack(b.dataset.id, b.dataset.name);
        else if (typeof openFriendChat === 'function') openFriendChat(b.dataset.id);
      });
    });
  }

  (function presenceStyle() {
    var st = document.createElement('style');
    st.textContent = '.tl-pres{font-size:12px;color:var(--muted,#8a90a8)}.tl-pres.is-on{color:#22c55e;font-weight:600}'
      + '.tl-pres.is-on::before{content:"";display:inline-block;width:7px;height:7px;margin-right:5px;border-radius:50%;background:#22c55e;vertical-align:middle}'
      + '.tl-bell{background:none;border:0;font-size:17px;cursor:pointer;opacity:.55;padding:6px}.tl-bell.is-on{opacity:1}'
      + '.tl-notify-bar{display:flex;align-items:center;gap:10px;justify-content:space-between;margin:0 0 10px;padding:10px 12px;border-radius:14px;background:rgba(124,92,255,.12);font-size:13px}'
      + '.tl-notify-bar.is-on{background:rgba(34,197,94,.08)}.tl-notify-bar button{flex:none;border:0;border-radius:99px;padding:7px 12px;font:inherit;font-weight:700;cursor:pointer;background:rgba(255,255,255,.1);color:inherit}'
      + '.tl-notify-bar button.is-primary{background:#7c5cff;color:#fff}.tl-ntf-steps{text-align:left;padding-left:18px;line-height:1.5;font-size:14px}.tl-ntf-steps li{margin:6px 0}';
    document.head.appendChild(st);
  })();

  // Calling a friend who is offline: say so first; tapping the note asks
  // them to call back (what the button used to do straight away).
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#friendsList .friend-call-btn');
    if (!b || b.dataset.offlineOk) return;
    var f = friendsById[b.dataset.id];
    if (!f || f.online) return;
    e.stopPropagation(); e.preventDefault();
    showToast(t('callOffline', { name: f.username || b.dataset.name || '' }), 'social', function () {
      b.dataset.offlineOk = '1'; b.click(); delete b.dataset.offlineOk;
    });
  }, true);

  // Swipe a pop-up away, sideways or up.
  (function swipeToast() {
    var sx = 0, sy = 0, dx = 0, dy = 0, el = null;
    document.addEventListener('touchstart', function (e) {
      el = e.target.closest && e.target.closest('#tlToast');
      if (!el) return;
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; dx = dy = 0;
    }, { passive: true });
    document.addEventListener('touchmove', function (e) {
      if (!el) return;
      dx = e.touches[0].clientX - sx; dy = Math.min(0, e.touches[0].clientY - sy);
      el.style.transform = 'translate(calc(-50% + ' + dx + 'px),' + dy + 'px)';
      el.style.opacity = String(Math.max(0, 1 - Math.abs(dx) / 220 + dy / 120));
    }, { passive: true });
    document.addEventListener('touchend', function () {
      if (!el) return;
      var gone = Math.abs(dx) > 80 || dy < -40;
      if (gone) el.classList.remove('show');
      var t0 = el; setTimeout(function () { t0.style.transform = ''; t0.style.opacity = ''; }, gone ? 250 : 0);
      el = null;
    });
  })();

  window.TalkLiveEngage = { onCall: onCall, onReveal: onReveal, offerUndo: offerUndo, render: render,
    openPassport: openPassport, openLikes: openLikes,
    passportCount: function () { return (state.passport || []).length; } };
  window.addEventListener('i18n-changed', render);
  buildStrip();
  refreshLikes();
  syncWithServer();
})();
