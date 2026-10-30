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
    var prev = state.prevWeek;
    var today = !!s.doneToday;
    var html = '';
    // The Chat Support launch (support-chat.js says whether it is running).
    if (supportPromoLive()) {
      html += '<button type="button" class="tl-engage-banner tl-engage-news" data-act="support"><span>🎧 ' + esc(t('fxSupportChip')) + '</span>'
        + '<span class="tl-engage-new" aria-hidden="true">' + esc(t('fxSupportGo')) + '</span></button>';
    } else if (prev && read(KEY.recap, '') !== prev.week) {
      html += '<div class="tl-engage-banner tl-engage-recap"><span>📊 ' + esc(t('engageRecap', {
        calls: prev.calls, countries: prev.countries, minutes: Math.max(1, Math.round(prev.longest / 60)),
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
    if (act === 'support') {
      if (typeof trackGrowthEvent === 'function') trackGrowthEvent('support_promo_chip');
      if (window.TLSupport) window.TLSupport.open();
      return;
    }
    if (act === 'recap') { write(KEY.recap, state.prevWeek ? state.prevWeek.week : ''); render(); return; }
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
  // A call ended. The server counts it and answers with 'engage-update'; this
  // hook stays for app.js and has nothing left to do on the page.
  function onCall() {}

  // The server's answer to a counted call: new numbers, and what to say.
  function onEngageUpdate(msg) {
    if (!msg) return;
    setState(msg.state);
    var bump = msg.bump;
    var parts = [];
    if (bump && bump.count > 1) parts.push(t(bump.saved ? 'engageStreakSaved' : 'engageStreakUp', { n: bump.count }));
    else if (bump) parts.push(t('engageStreakStart'));
    if (msg.stamp) parts.push(t('engageStamp', { flag: flag(msg.stamp.country), country: countryName(msg.stamp.country), n: msg.stamp.total }));
    if (parts.length) showToast(parts.join(' · '), 'success');
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

  window.TalkLiveEngage = { onCall: onCall, onReveal: onReveal, offerUndo: offerUndo, render: render };
  window.addEventListener('i18n-changed', render);
  buildStrip();
  refreshLikes();
  syncWithServer();
})();
