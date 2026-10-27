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
//   Free trial        a day of Premium after a few real calls (server-side)
//
// Loaded after app.js once the page is up (it is not needed to place a call)
// and reads app.js's globals: socket, t, showToast, isPremiumUser...
// Everything here is kept on this device; only likes and the trial live on the
// server.
// ============================================================================
(function () {
  'use strict';

  // English for the strings below lives here rather than in i18n.js, so it is
  // not in the first page load; other languages carry them in /i18n/<lang>.js.
  var EN = {
    fxTitle: "What's new on TalkLive",
    fxSub: "Fresh this week. Tap one to try it.",
    fxChip: "What's new on TalkLive · Tap to see",
    fxStreak: "Daily streaks",
    fxStreakSub: "Talk 30 seconds a day to keep your 🔥 going.",
    fxPassport: "Country passport",
    fxPassportSub: "Every country you talk to gets a stamp.",
    fxQuestion: "Question of the day",
    fxQuestionSub: "A new opener for everyone, every day.",
    fxLikes: "Who liked you",
    fxLikesSub: "See how many people ❤️ your calls. Premium shows who.",
    fxUndo: "Undo skip",
    fxUndoSub: "Skipped by mistake? Premium brings them back.",
    fxFilms: "Top 3 films on your profile",
    fxFilmsSub: "Show your favourite movies and shows. An easy thing to talk about.",
    fxAvatars: "New movie-character avatars",
    fxAvatarsSub: "Be the wizard, the pirate or the detective. {n} new faces.",
    fxTrial: "24h of Premium, free",
    fxTrialSub: "Have 3 real conversations and it unlocks by itself.",
    fxOpen: "Open",
    fxAdd: "Add mine",
    fxPick: "Pick one",
    fxGotIt: "Let's talk",
    engageAria: "Your TalkLive",
    engageRecap: "Last week: {calls} calls · {countries} countries · longest {minutes} min",
    engageStreakLabel: "day streak",
    engageStreakDone: "Done for today ✓",
    engageStreakDue: "Talk today to keep it",
    engagePassportLabel: "countries",
    engagePassportEmpty: "Talk to someone",
    engageLikesLabel: "liked you",
    engageLikesUnlock: "Unlock 💎",
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
    engageStreakSaved: "🔥 {n}-day streak - saved by your weekly streak-saver",
    engageStreakUp: "🔥 {n}-day streak! Come back tomorrow",
    engageStreakStart: "🔥 Streak started! Talk tomorrow to keep it",
    engageStamp: "{flag} New stamp: {country} ({n} countries)",
    engageQuestionToast: "💬 Today's question: {q}",
    engageMutual: "💞 It's mutual! You both liked this call. Tap to add them as a friend.",
    engageUndoThem: "👋 They came back! Your last chat is back on.",
    engageTrialReason: "You've had {n} great calls, so here are {h} hours of Premium, free. Everything below is unlocked.",
  };
  if (typeof I18N_STRINGS !== 'undefined' && I18N_STRINGS.en) {
    Object.keys(EN).forEach(function (k) { if (!(k in I18N_STRINGS.en)) I18N_STRINGS.en[k] = EN[k]; });
  }

  var KEY = { streak: 'tl_streak', passport: 'tl_passport', week: 'tl_week_stats', whatsNew: 'tl_whats_new_seen', question: 'tl_daily_q_seen' };
  var GOOD_CALL_S = 30;
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
  // The Monday that starts this week, as a day key.
  function weekKey(d) {
    d = d ? new Date(d) : new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return dayKey(d);
  }
  function flag(code) {
    return /^[A-Z]{2}$/.test(code || '') && code !== 'XX'
      ? String.fromCodePoint.apply(null, code.split('').map(function (c) { return 0x1f1a5 + c.charCodeAt(0); })) : '';
  }
  function countryName(code) {
    return (typeof getCountryName === 'function' && getCountryName(code)) || code;
  }

  // --- Streak ---------------------------------------------------------------
  function streak() {
    var s = read(KEY.streak, { count: 0, best: 0, last: '', freezeWeek: '' });
    // Lapsed: show 0 rather than a number that can no longer be kept.
    if (s.last) {
      var gap = dayNum(dayKey()) - dayNum(s.last);
      var freezeLeft = s.freezeWeek !== weekKey();
      if (gap > 2 || (gap === 2 && !freezeLeft)) s.count = 0;
    }
    return s;
  }
  function bumpStreak() {
    var s = read(KEY.streak, { count: 0, best: 0, last: '', freezeWeek: '' });
    var today = dayKey();
    if (s.last === today) return null;
    var gap = s.last ? dayNum(today) - dayNum(s.last) : 0;
    var saved = false;
    if (gap === 1) s.count += 1;
    else if (gap === 2 && s.freezeWeek !== weekKey()) { s.count += 1; s.freezeWeek = weekKey(); saved = true; }
    else s.count = 1;
    s.best = Math.max(s.best || 0, s.count);
    s.last = today;
    write(KEY.streak, s);
    return { count: s.count, saved: saved };
  }

  // --- Passport and weekly stats -------------------------------------------
  function passport() { return read(KEY.passport, { codes: [] }); }
  function stamp(code) {
    if (!code || code === 'XX' || !/^[A-Z]{2}$/.test(code)) return false;
    var p = passport();
    if (p.codes.indexOf(code) !== -1) return false;
    p.codes.push(code);
    write(KEY.passport, p);
    return true;
  }
  function weekStats() {
    var w = read(KEY.week, null);
    var now = weekKey();
    if (!w) w = { week: now, calls: 0, countries: [], longest: 0, prev: null, recapShown: '' };
    if (w.week !== now) {
      // Roll over: last week becomes the recap, only if it was last week.
      var lastWeek = weekKey(new Date(Date.now() - 7 * 86400000));
      w.prev = w.week === lastWeek && w.calls > 0 ? { week: w.week, calls: w.calls, countries: w.countries.length, longest: w.longest } : null;
      w.week = now; w.calls = 0; w.countries = []; w.longest = 0;
      write(KEY.week, w);
    }
    return w;
  }
  function noteWeekCall(code, seconds) {
    var w = weekStats();
    w.calls += 1;
    if (code && code !== 'XX' && w.countries.indexOf(code) === -1) w.countries.push(code);
    w.longest = Math.max(w.longest || 0, seconds);
    write(KEY.week, w);
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
  function todaysQuestion() { return QUESTIONS[dayNum(dayKey()) % QUESTIONS.length]; }

  // --- Landing strip ------------------------------------------------------------
  var strip = null;
  var likes = { count: 0, locked: true, list: [] };

  function buildStrip() {
    var anchor = document.querySelector('#setupPanel .animal-picker');
    if (!anchor || strip) return;
    strip = el('section', 'tl-engage');
    strip.setAttribute('aria-label', t('engageAria'));
    anchor.parentNode.insertBefore(strip, anchor);
    strip.addEventListener('click', onStripClick);
    render();
  }

  function render() {
    if (!strip) return;
    var s = streak();
    var p = passport();
    var w = weekStats();
    var today = s.last === dayKey();
    var html = '';
    if (whatsNewLive()) {
      html += '<button type="button" class="tl-engage-banner tl-engage-news" data-act="whatsnew"><span>✨ ' + esc(t('fxChip')) + '</span>'
        + '<span class="tl-engage-new" aria-hidden="true">NEW</span></button>';
    } else if (w.prev && w.recapShown !== w.prev.week) {
      html += '<div class="tl-engage-banner tl-engage-recap"><span>📊 ' + esc(t('engageRecap', {
        calls: w.prev.calls, countries: w.prev.countries, minutes: Math.max(1, Math.round(w.prev.longest / 60)),
      })) + '</span><button type="button" class="tl-engage-x" data-act="recap" aria-label="' + esc(t('close')) + '">&times;</button></div>';
    }
    html += '<div class="tl-engage-tiles">'
      + '<button type="button" class="tl-engage-tile' + (today ? ' is-done' : (s.count ? ' is-due' : '')) + '" data-act="streak">'
      + '<span class="tl-engage-big">🔥 ' + s.count + '</span>'
      + '<span class="tl-engage-label">' + esc(t('engageStreakLabel')) + '</span>'
      + '<span class="tl-engage-sub">' + esc(today ? t('engageStreakDone') : t('engageStreakDue')) + '</span></button>'
      + '<button type="button" class="tl-engage-tile" data-act="passport">'
      + '<span class="tl-engage-big">🌍 ' + p.codes.length + '</span>'
      + '<span class="tl-engage-label">' + esc(t('engagePassportLabel')) + '</span>'
      + '<span class="tl-engage-sub">' + (p.codes.length ? p.codes.slice(-4).map(flag).join('') : esc(t('engagePassportEmpty'))) + '</span></button>'
      + '<button type="button" class="tl-engage-tile tl-engage-likes" data-act="likes">'
      + '<span class="tl-engage-big">❤️ ' + likes.count + '</span>'
      + '<span class="tl-engage-label">' + esc(t('engageLikesLabel')) + '</span>'
      + '<span class="tl-engage-sub">' + esc(likes.locked ? (likes.count ? t('engageLikesUnlock') : t('engageLikesNone')) : t('engageLikesSee')) + '</span></button>'
      + '</div>'
      + '<div class="tl-engage-q"><small>' + esc(t('engageQuestionLabel')) + '</small><span>' + esc(todaysQuestion()) + '</span></div>';
    strip.innerHTML = html;
  }

  function onStripClick(e) {
    var b = e.target.closest('[data-act]');
    if (!b) return;
    var act = b.dataset.act;
    if (act === 'whatsnew') { openWhatsNew(); return; }
    if (act === 'recap') { var w = weekStats(); w.recapShown = w.prev ? w.prev.week : ''; write(KEY.week, w); render(); return; }
    if (act === 'streak') { showToast(t('engageStreakHow'), 'success'); return; }
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
      ? '<div class="tl-passport-grid">' + p.codes.map(function (c) {
        return '<span class="tl-stamp"><b>' + flag(c) + '</b><small>' + esc(countryName(c)) + '</small></span>';
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
      navigator.clipboard.writeText(text + ' ' + url).then(function () { showToast(t('engageCopied'), 'success'); });
    } catch (_) { /* no clipboard */ }
  }

  function refreshLikes() {
    if (!socket || !socket.connected) return;
    socket.emit('get-likes', function (res) {
      res = res || {};
      likes = { count: res.count || 0, locked: !!res.locked, list: res.list || [] };
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

  function openLikes() {
    if (likes.locked) {
      if (typeof trackGrowthEvent === 'function') trackGrowthEvent('likes_locked_tap');
      showPremiumUpsell(likes.count ? t('engageLikesReason', { n: likes.count }) : t('engageLikesReasonNone'), 'likes');
      return;
    }
    var rows = likes.list.length
      ? '<ul class="tl-likes">' + likes.list.map(function (l) {
        return '<li><span class="tl-likes-who"><b>' + flag(l.countryCode) + ' ' + esc(l.username) + '</b><small>'
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

  // --- What's new ----------------------------------------------------------------
  // The launch announcement: opens by itself once, then stays one tap away on
  // the home screen until WHATS_NEW_UNTIL. Bump WHATS_NEW_ID for the next one.
  var WHATS_NEW_ID = 'wn-2026-10';
  var WHATS_NEW_UNTIL = new Date(2026, 9, 31).getTime(); // through 30 Oct, local
  function whatsNewLive() { return Date.now() < WHATS_NEW_UNTIL; }
  function characterCount() {
    var c = window.TalkLiveCharacters;
    return (c && c.ids && c.ids.length) || 26;
  }

  function openWhatsNew() {
    if (typeof trackGrowthEvent === 'function') trackGrowthEvent('whats_new_open');
    write(KEY.whatsNew, WHATS_NEW_ID);
    var items = [
      ['🎬', 'fxFilms', 'fxFilmsSub', 'profile', 'fxAdd'],
      ['🧙', 'fxAvatars', 'fxAvatarsSub', 'profile', 'fxPick'],
      ['🔥', 'fxStreak', 'fxStreakSub'],
      ['🌍', 'fxPassport', 'fxPassportSub', 'passport', 'fxOpen'],
      ['💬', 'fxQuestion', 'fxQuestionSub'],
      ['❤️', 'fxLikes', 'fxLikesSub', 'likes', 'fxOpen'],
      ['↩️', 'fxUndo', 'fxUndoSub', null, null, true],
      ['🎁', 'fxTrial', 'fxTrialSub'],
    ];
    var list = '<ul class="tl-wn">' + items.map(function (it) {
      return '<li><span class="tl-wn-ico" aria-hidden="true">' + it[0] + '</span>'
        + '<span class="tl-wn-body"><b>' + esc(t(it[1])) + (it[5] ? ' <span class="tl-wn-plus">💎</span>' : '') + '</b>'
        + '<small>' + esc(t(it[2], { n: characterCount() })) + '</small></span>'
        + (it[3] ? '<button type="button" class="tl-wn-go" data-go="' + it[3] + '">' + esc(t(it[4])) + '</button>' : '')
        + '</li>';
    }).join('') + '</ul>';
    var m = dialog('whatsNewModal',
      '<div class="pu-hero" aria-hidden="true"><span class="pu-gem">✨</span></div>'
      + '<div class="pu-title">' + esc(t('fxTitle')) + '</div>'
      + '<p class="pu-reason">' + esc(t('fxSub')) + '</p>' + list
      + '<button type="button" class="pu-cta" data-go="close">' + esc(t('fxGotIt')) + '</button>');
    m.querySelectorAll('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () {
        var go = b.dataset.go;
        closeModal(m);
        if (go === 'profile' && typeof openMyProfile === 'function') openMyProfile();
        else if (go === 'passport') openPassport();
        else if (go === 'likes') openLikes();
      });
    });
  }

  // Once per visitor, on the home screen, when nothing else is in the way.
  function maybeAutoOpenWhatsNew() {
    if (!whatsNewLive() || read(KEY.whatsNew, '') === WHATS_NEW_ID) return;
    setTimeout(function () {
      var onHome = document.getElementById('callPanel') && document.getElementById('callPanel').classList.contains('hidden');
      var busy = document.querySelector('.modal-overlay:not(.hidden)');
      if (onHome && !busy) openWhatsNew();
    }, 2500);
  }

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
          showPremiumUpsell(t('engageUndoReason'), 'undo');
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
    undoBtn.innerHTML = '↩ ' + esc(t('engageUndo')) + (isPremiumUser ? '' : ' <span class="tl-undo-gem">💎</span>');
    undoBtn.classList.remove('hidden');
    clearTimeout(undoTimer);
    undoTimer = setTimeout(hideUndo, UNDO_MS);
  }

  // --- Hooks app.js calls ---------------------------------------------------
  // A call ended: count it if it was a real one.
  function onCall(partner, seconds) {
    if (!partner || seconds < GOOD_CALL_S) return;
    var bump = bumpStreak();
    var fresh = stamp(partner.countryCode);
    noteWeekCall(partner.countryCode, seconds);
    var parts = [];
    if (bump && bump.count > 1) parts.push(t(bump.saved ? 'engageStreakSaved' : 'engageStreakUp', { n: bump.count }));
    else if (bump) parts.push(t('engageStreakStart'));
    if (fresh) parts.push(t('engageStamp', { flag: flag(partner.countryCode), country: countryName(partner.countryCode), n: passport().codes.length }));
    if (parts.length) showToast(parts.join(' · '), 'success');
    render();
  }

  // The partner is on the line: Premium badge, and today's question once a day.
  function onReveal(partner) {
    var nameEl = document.getElementById('partnerName');
    if (nameEl && partner && partner.premium) {
      var b = el('span', 'tl-plus-badge', '💎');
      b.title = 'Premium';
      nameEl.appendChild(b);
    }
    if (read(KEY.question, '') !== dayKey()) {
      write(KEY.question, dayKey());
      setTimeout(function () {
        if (typeof callState === 'undefined' || callState === 'connected') showToast(t('engageQuestionToast', { q: todaysQuestion() }), 'social');
      }, 2500);
    }
  }

  // ---- Server events ------------------------------------------------------------
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
  socket.on('trial-started', function (info) {
    if (typeof trackGrowthEvent === 'function') trackGrowthEvent('trial_started');
    var hours = (info && info.hours) || 24;
    showPremiumUpsell(t('engageTrialReason', { n: (info && info.calls) || 3, h: hours }), 'trial');
  });

  window.TalkLiveEngage = { onCall: onCall, onReveal: onReveal, offerUndo: offerUndo, render: render };
  window.addEventListener('i18n-changed', render);
  buildStrip();
  refreshLikes();
  maybeAutoOpenWhatsNew();
})();
