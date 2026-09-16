/* ============================================================================
   TalkLive mobile shell
   ----------------------------------------------------------------------------
   Three tabs, one top bar, a set of bottom sheets.

   This file owns PRESENTATION ONLY. Every piece of state it draws belongs to
   app.js and arrives through TalkLiveShell.sync(); every action it offers is
   an app.js function called by name. Nothing here talks to the server except
   through the socket app.js already owns, and nothing here caches state that
   app.js also holds - a second copy of the truth is how two surfaces start
   disagreeing about who is online.

   Loaded after app.js (see index.html), so every function it calls exists by
   the time anything can be tapped.
   ========================================================================== */

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  // app.js publishes its helpers as plain top-level functions, which makes them
  // properties of window. Going through here means a renamed or missing helper
  // degrades to a no-op instead of throwing inside a render loop.
  function app(name) {
    return typeof window[name] === 'function' ? window[name] : null;
  }
  function callApp(name) {
    var fn = app(name);
    if (!fn) return undefined;
    return fn.apply(null, Array.prototype.slice.call(arguments, 1));
  }
  function T(key, vars) {
    var fn = app('t');
    return fn ? fn(key, vars) : key;
  }
  function esc(s) {
    var fn = app('escapeHtml');
    return fn ? fn(s) : String(s == null ? '' : s);
  }
  function avatarFor(person, size, opts) {
    var fn = app('personAvatar');
    return fn ? fn(person, size, opts || {}) : '';
  }
  function nameOf(person) {
    var fn = app('friendLabel');
    return (fn ? fn(person) : '') || (person && person.username) || '';
  }

  // --- element refs ---------------------------------------------------------
  var tabBar = $('tabBar');
  var setupPanel = $('setupPanel');
  var messagesTab = $('messagesTab');
  var historyTab = $('historyTab');
  var callPanel = $('callPanel');

  var msgFriendsRail = $('msgFriendsRail');
  var msgConvoList = $('msgConvoList');
  var msgRequestsSlot = $('msgRequestsSlot');
  var messagesOnlineLine = $('messagesOnlineLine');
  var historyFeed = $('historyFeed');
  var tabMessagesBadge = $('tabMessagesBadge');

  var sheetOverlay = $('sheetOverlay');
  var animalSheet = $('animalSheet');
  var genderSheet = $('genderSheet');
  var countrySheet = $('countrySheet');
  var notifSheet = $('notifSheet');

  var heroAnimalBtn = $('heroAnimalBtn');
  var heroAnimalArt = $('heroAnimalArt');
  var heroCarousel = $('heroCarousel');
  var heroDots = $('heroDots');
  var heroOnline = $('heroOnline');

  var quickGenderBtn = $('quickGenderBtn');
  var quickGenderLabel = $('quickGenderLabel');
  var quickCountryBtn = $('quickCountryBtn');
  var quickCountryLabel = $('quickCountryLabel');
  var quickCountryIcon = $('quickCountryIcon');

  var topbarMeAvatar = $('topbarMeAvatar');
  var topbarMeBadge = $('topbarMeBadge');

  // The last state app.js handed over, so any surface can redraw itself
  // without asking for a fresh sync.
  var state = { friends: [], requests: [], sent: [], notifs: [], history: [], chats: null, myClientId: '' };

  // --- small shared icons ---------------------------------------------------
  var ICON = {
    chat: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>',
    flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V4.5"/><path d="M5 5.2c4-2 7 2 11 0v8.4c-4 2-7-2-11 0z"/></svg>',
    addFriend: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9.5" cy="8" r="3.6"/><path d="M3.4 20a6.1 6.1 0 0 1 12.2 0"/><path d="M18.5 8.2v5.6M15.7 11h5.6"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="4 12.5 9.5 18 20 6.5"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 1.8"/></svg>',
  };

  /* ==========================================================================
     Tabs
     ====================================================================== */

  var PANES = { voice: setupPanel, messages: messagesTab, history: historyTab };
  var activeTab = 'voice';

  function switchTab(name) {
    if (!PANES[name]) name = 'voice';
    activeTab = name;
    // Deliberately not `.hidden`: app.js owns that class on #setupPanel (it is
    // how the landing screen gives way to the call screen). The shell hides
    // panes with a class of its own so the two can never fight over which of
    // them last set `hidden` - the call screen always wins, as it should.
    Object.keys(PANES).forEach(function (key) {
      var pane = PANES[key];
      if (pane) pane.classList.toggle('tl-hide', key !== name);
    });
    // The voice tab is two surfaces that app.js swaps between - the landing
    // panel and the call panel - so leaving the tab has to take whichever of
    // them is currently up with it.
    if (callPanel) callPanel.classList.toggle('tl-hide', name !== 'voice');
    if (tabBar) {
      Array.prototype.forEach.call(tabBar.querySelectorAll('.tabbar-btn'), function (btn) {
        var on = btn.dataset.tab === name;
        btn.classList.toggle('is-active', on);
        if (on) btn.setAttribute('aria-current', 'page');
        else btn.removeAttribute('aria-current');
      });
    }
    document.body.classList.remove('tl-tab-voice', 'tl-tab-messages', 'tl-tab-history');
    document.body.classList.add('tl-tab-' + name);
    window.scrollTo(0, 0);
  }

  if (tabBar) {
    tabBar.addEventListener('click', function (e) {
      var btn = e.target.closest('.tabbar-btn');
      if (!btn) return;
      switchTab(btn.dataset.tab);
    });
  }

  // The old header buttons and a handful of places inside app.js still open the
  // Friends panel or the History dropdown directly (a friend request landing, a
  // deep link, the post-call "message them" path). Rather than hunt every call
  // site, watch the two elements: whenever something opens them, close them
  // again and show the tab that now holds their content.
  function redirectPanel(el, openClass, invert, tab) {
    if (!el) return;
    new MutationObserver(function () {
      var open = invert ? !el.classList.contains(openClass) : el.classList.contains(openClass);
      if (!open) return;
      if (invert) el.classList.add(openClass); else el.classList.remove(openClass);
      var overlay = $('friendsOverlay');
      if (tab === 'messages' && overlay) overlay.classList.add('hidden');
      document.body.classList.remove('panel-open');
      switchTab(tab);
    }).observe(el, { attributes: true, attributeFilter: ['class'] });
  }
  redirectPanel($('friendsDropdown'), 'open', false, 'messages');
  redirectPanel($('historyDropdown'), 'hidden', true, 'history');

  // A live call is the one thing that takes the whole screen. "Live" is the
  // call state app.js publishes on the main button - not the call panel simply
  // being on screen, which it also is for the post-call "you hung up" view.
  // Getting that wrong strands people on a screen with no tab bar.
  var LIVE_STATES = { searching: 1, connecting: 1, connected: 1, reconnecting: 1 };
  var callMainBtn = $('callMainBtn');
  if (callPanel) {
    var syncCallClass = function () {
      var onCallScreen = !callPanel.classList.contains('hidden');
      var phase = callMainBtn ? callMainBtn.dataset.callState : '';
      var live = onCallScreen && !!LIVE_STATES[phase];
      document.body.classList.toggle('tl-in-call', live);
      // Only a live call pulls you back to the voice tab. The post-call screen
      // is just another thing that tab can show, so reading your messages
      // after hanging up must not bounce you out of them.
      if (live && activeTab !== 'voice') switchTab('voice');
    };
    new MutationObserver(syncCallClass).observe(callPanel, { attributes: true, attributeFilter: ['class'] });
    if (callMainBtn) {
      new MutationObserver(syncCallClass).observe(callMainBtn, { attributes: true, attributeFilter: ['data-call-state'] });
    }
    syncCallClass();
  }

  /* ==========================================================================
     Bottom sheets
     ====================================================================== */

  var openSheet = null;

  function showSheet(sheet) {
    if (!sheet) return;
    if (openSheet && openSheet !== sheet) openSheet.classList.add('hidden');
    openSheet = sheet;
    sheet.classList.remove('hidden');
    sheetOverlay.classList.remove('hidden');
    document.body.classList.add('panel-open');
  }

  function hideSheet() {
    var was = openSheet;
    if (openSheet) openSheet.classList.add('hidden');
    openSheet = null;
    sheetOverlay.classList.add('hidden');
    document.body.classList.remove('panel-open');
    [quickGenderBtn, quickCountryBtn].forEach(function (b) {
      if (b) b.setAttribute('aria-expanded', 'false');
    });
    // The requests list is a single live element, lent to the bell sheet while
    // it is open. Closing the sheet puts it back at the top of Messages.
    if (was === notifSheet) placeRequestsList();
  }

  sheetOverlay.addEventListener('click', hideSheet);
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-sheet-close]')) hideSheet();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openSheet) hideSheet();
  }, true);

  // Drag a sheet down to dismiss it, the way every phone sheet works.
  [animalSheet, genderSheet, countrySheet, notifSheet].forEach(function (sheet) {
    if (!sheet) return;
    var startY = 0;
    var dragging = false;
    sheet.addEventListener('touchstart', function (e) {
      // Only from the grip / header, so scrolling a long list never dismisses.
      if (!e.target.closest('.sheet-grip, .sheet-head')) return;
      startY = e.touches[0].clientY;
      dragging = true;
    }, { passive: true });
    sheet.addEventListener('touchmove', function (e) {
      if (!dragging) return;
      var dy = e.touches[0].clientY - startY;
      if (dy > 70) { dragging = false; hideSheet(); }
    }, { passive: true });
    sheet.addEventListener('touchend', function () { dragging = false; });
  });

  /* ==========================================================================
     Home screen
     ====================================================================== */

  // The home screen's first fold: everything from the hero to the Start button
  // fits between the header and the tab bar, and the rest of the page begins
  // below it. Measured rather than computed from dvh, because the header grows
  // with the safe area, the tab bar with the home indicator, and .stage's
  // padding with the breakpoint - a calc that is 40px out hides the button.
  var stageEl = document.querySelector('.stage');
  function sizeHome() {
    var topbar = document.querySelector('.topbar');
    var top = topbar ? topbar.getBoundingClientRect().height : 56;
    var bar = tabBar ? tabBar.getBoundingClientRect().height : 62;
    var pad = 0;
    if (stageEl) {
      var cs = getComputedStyle(stageEl);
      pad = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    }
    var avail = Math.max(360, window.innerHeight - top - bar - pad);
    document.documentElement.style.setProperty('--tl-home-min', avail + 'px');
  }
  window.addEventListener('resize', sizeHome);
  window.addEventListener('orientationchange', function () { setTimeout(sizeHome, 200); });

  // --- your face ------------------------------------------------------------
  function myPerson() {
    var animals = window.TalkLiveAnimals;
    return {
      clientId: state.myClientId || 'me',
      username: (window.profileDisplayName && window.profileDisplayName()) || 'You',
      animal: animals && animals.stored ? animals.stored() : null,
      avatar: (function () { try { return localStorage.getItem('talklive_avatar'); } catch (e) { return null; } })(),
    };
  }

  function renderMyFaces() {
    var me = myPerson();
    if (topbarMeAvatar) topbarMeAvatar.innerHTML = avatarFor(me, 40);
    if (topbarMeBadge) {
      var signedIn = !!(window.localStorage && localStorage.getItem('talklive_nickname'));
      topbarMeBadge.classList.toggle('hidden', signedIn);
    }
    if (heroAnimalArt) {
      var animals = window.TalkLiveAnimals;
      if (animals && me.animal) {
        heroAnimalArt.innerHTML = animals.icon(me.animal, 132);
      } else {
        // No animal chosen yet: show the picker's own invitation rather than an
        // empty circle, so the first tap is obvious.
        heroAnimalArt.innerHTML = avatarFor(me, 120);
      }
    }
  }

  if (heroAnimalBtn) {
    heroAnimalBtn.addEventListener('click', function () { showSheet(animalSheet); });
  }
  // The picker writes through app.js; redraw the hero whenever it does.
  var animalGrid = $('animalGrid');
  if (animalGrid) {
    animalGrid.addEventListener('click', function () { setTimeout(renderMyFaces, 0); });
  }

  // --- the rotating headline ------------------------------------------------
  var slides = heroCarousel ? heroCarousel.querySelectorAll('.hero-slide') : [];
  var dots = heroDots ? heroDots.querySelectorAll('.hero-dot') : [];
  var slideIndex = 0;
  var slideTimer = null;

  function showSlide(i) {
    if (!slides.length) return;
    slideIndex = (i + slides.length) % slides.length;
    Array.prototype.forEach.call(slides, function (s, n) { s.classList.toggle('is-active', n === slideIndex); });
    Array.prototype.forEach.call(dots, function (d, n) { d.classList.toggle('is-active', n === slideIndex); });
  }

  function startCarousel() {
    stopCarousel();
    if (slides.length < 2) return;
    slideTimer = setInterval(function () { showSlide(slideIndex + 1); }, 5200);
  }
  function stopCarousel() {
    if (slideTimer) { clearInterval(slideTimer); slideTimer = null; }
  }

  if (heroDots) {
    heroDots.addEventListener('click', function (e) {
      var dot = e.target.closest('.hero-dot');
      if (!dot) return;
      showSlide(Number(dot.dataset.slide) || 0);
      startCarousel();
    });
  }
  if (heroCarousel) {
    var swipeX = null;
    heroCarousel.addEventListener('touchstart', function (e) { swipeX = e.touches[0].clientX; }, { passive: true });
    heroCarousel.addEventListener('touchend', function (e) {
      if (swipeX === null) return;
      var dx = e.changedTouches[0].clientX - swipeX;
      swipeX = null;
      if (Math.abs(dx) < 40) return;
      showSlide(slideIndex + (dx < 0 ? 1 : -1));
      startCarousel();
    }, { passive: true });
  }
  // A carousel running behind a hidden tab or a backgrounded tab is pure
  // battery cost for something nobody can see.
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stopCarousel(); else startCarousel();
  });
  startCarousel();

  // --- online count, mirrored out of the header ------------------------------
  var onlineCountEl = $('onlineCount');
  function renderHeroOnline() {
    if (!heroOnline || !onlineCountEl) return;
    var n = onlineCountEl.textContent.trim();
    if (!n || n === '0') { heroOnline.textContent = ''; return; }
    heroOnline.innerHTML = '<span class="hero-online-dot" aria-hidden="true"></span>' + esc(T('onlineNow', { n: n }));
  }
  if (onlineCountEl) {
    new MutationObserver(renderHeroOnline).observe(onlineCountEl, { childList: true, characterData: true, subtree: true });
    renderHeroOnline();
  }

  /* ==========================================================================
     Quick filters: the two selectors above the Start button
     ====================================================================== */

  function filters() {
    return window.TalkLiveFilters || null;
  }

  var GENDER_OPTIONS = [
    { value: 'any', labelKey: 'anyone', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.1"/><path d="M3.6 19a5.4 5.4 0 0 1 10.8 0"/><circle cx="17.2" cy="9" r="2.5"/><path d="M15.7 13.7A4.8 4.8 0 0 1 21 18.4"/></svg>' },
    { value: 'male', labelKey: 'male', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#4aa8ff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="14" r="6"/><path d="M14.5 9.5 20 4"/><polyline points="14.5 4 20 4 20 9.5"/></svg>' },
    { value: 'female', labelKey: 'female', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#ff5fa2" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="9" r="6"/><path d="M12 15v6M9 18h6"/></svg>' },
  ];

  function renderGenderSheet() {
    var body = $('genderSheetBody');
    if (!body) return;
    var f = filters();
    var current = f ? f.get().prefGender : 'any';
    body.innerHTML = GENDER_OPTIONS.map(function (opt) {
      return '<button type="button" class="sheet-option' + (opt.value === current ? ' is-selected' : '')
        + '" data-gender="' + opt.value + '">'
        + '<span class="sheet-option-icon">' + opt.icon + '</span>'
        + '<span class="sheet-option-label">' + esc(T(opt.labelKey)) + '</span>'
        + '<span class="sheet-option-check">' + ICON.check + '</span>'
        + '</button>';
    }).join('');
    // Gender preference is the premium line in this product; say so here
    // instead of letting someone pick and quietly get "Anyone".
    var lock = document.querySelector('.filters-premium-banner');
    var locked = lock && !lock.classList.contains('hidden');
    if (locked) {
      body.insertAdjacentHTML('beforeend',
        '<p class="sheet-note">' + esc(T('filtersPremiumTitle')) + '</p>');
    }
  }

  if ($('genderSheetBody')) {
    $('genderSheetBody').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-gender]');
      if (!btn) return;
      var f = filters();
      if (f) f.setGender(btn.dataset.gender);
      renderGenderSheet();
      renderQuickSelects();
      hideSheet();
    });
  }

  if (quickGenderBtn) {
    quickGenderBtn.addEventListener('click', function () {
      renderGenderSheet();
      quickGenderBtn.setAttribute('aria-expanded', 'true');
      showSheet(genderSheet);
    });
  }

  // --- country sheet ---------------------------------------------------------
  var countryQuery = '';

  function renderCountrySheet() {
    var body = $('countrySheetBody');
    var f = filters();
    if (!body || !f) return;
    var chosen = f.get().includeCountries;
    var q = countryQuery.trim().toLowerCase();
    var all = f.countries();
    var rows = [];

    // "Balanced" is the default and has to be reachable in one tap from the
    // top of the list, not by clearing three chips.
    rows.push('<button type="button" class="sheet-option' + (chosen.length === 0 ? ' is-selected' : '')
      + '" data-country="__any__">'
      + '<span class="sheet-option-icon">🌍</span>'
      + '<span class="sheet-option-label">' + esc(T('balanced')) + '</span>'
      + '<span class="sheet-option-check">' + ICON.check + '</span>'
      + '</button>');

    var list = q
      ? all.filter(function (row) { return row[1].toLowerCase().indexOf(q) !== -1; })
      : // No search yet: the countries already chosen first, then everything.
        chosen.map(function (code) { return [code, f.countryName(code)]; })
          .concat(all.filter(function (row) { return chosen.indexOf(row[0]) === -1; }));

    list.slice(0, 260).forEach(function (row) {
      var on = chosen.indexOf(row[0]) !== -1;
      rows.push('<button type="button" class="sheet-option' + (on ? ' is-selected' : '')
        + '" data-country="' + esc(row[0]) + '">'
        + '<span class="sheet-option-icon">' + f.flag(row[0], 24) + '</span>'
        + '<span class="sheet-option-label">' + esc(row[1]) + '</span>'
        + '<span class="sheet-option-check">' + ICON.check + '</span>'
        + '</button>');
    });

    if (list.length === 0) {
      rows.push('<p class="sheet-note">' + esc(T('noMatchingCountry')) + '</p>');
    }
    body.innerHTML = rows.join('');
  }

  if ($('countrySheetBody')) {
    $('countrySheetBody').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-country]');
      if (!btn) return;
      var f = filters();
      if (!f) return;
      var code = btn.dataset.country;
      if (code === '__any__') {
        f.setCountries([]);
      } else {
        var chosen = f.get().includeCountries;
        var at = chosen.indexOf(code);
        if (at === -1) chosen.push(code); else chosen.splice(at, 1);
        // setCountries refuses (and shows the upsell) past the free cap.
        if (f.setCountries(chosen) === false) return;
      }
      renderCountrySheet();
      renderQuickSelects();
    });
  }
  if ($('countrySheetSearch')) {
    $('countrySheetSearch').addEventListener('input', function (e) {
      countryQuery = e.target.value || '';
      renderCountrySheet();
    });
  }
  if ($('countrySheetDone')) $('countrySheetDone').addEventListener('click', hideSheet);
  if ($('countrySheetMore')) {
    $('countrySheetMore').addEventListener('click', function () {
      hideSheet();
      var f = filters();
      if (f) f.openPanel();
    });
  }
  if (quickCountryBtn) {
    quickCountryBtn.addEventListener('click', function () {
      countryQuery = '';
      if ($('countrySheetSearch')) $('countrySheetSearch').value = '';
      renderCountrySheet();
      quickCountryBtn.setAttribute('aria-expanded', 'true');
      showSheet(countrySheet);
    });
  }

  // The two buttons always read back exactly what matching will use.
  function renderQuickSelects() {
    var f = filters();
    if (!f) return;
    var applied = f.get();

    if (quickGenderLabel) {
      var g = applied.prefGender;
      quickGenderLabel.textContent = g === 'male' ? T('male') : (g === 'female' ? T('female') : T('gender'));
      if (quickGenderBtn) quickGenderBtn.classList.toggle('is-set', g !== 'any');
    }

    if (quickCountryLabel) {
      var cc = applied.includeCountries;
      if (cc.length === 0) {
        quickCountryLabel.textContent = T('balanced');
        if (quickCountryIcon) quickCountryIcon.textContent = '🌍';
      } else if (cc.length === 1) {
        quickCountryLabel.textContent = f.countryName(cc[0]);
        if (quickCountryIcon) quickCountryIcon.innerHTML = f.flag(cc[0], 22);
      } else {
        quickCountryLabel.textContent = T('countriesSelected', { n: cc.length });
        if (quickCountryIcon) quickCountryIcon.innerHTML = f.flag(cc[0], 22);
      }
      if (quickCountryBtn) quickCountryBtn.classList.toggle('is-set', cc.length > 0);
    }
  }

  /* ==========================================================================
     Top bar actions
     ====================================================================== */

  if ($('shopPillBtn')) {
    $('shopPillBtn').addEventListener('click', function () { callApp('openShop'); });
  }
  if ($('inviteBtn')) {
    // The share flow (native share sheet, referral link, copy fallback) already
    // lives in app.js behind this button; the top bar just triggers it.
    $('inviteBtn').addEventListener('click', function () {
      var btn = $('shareTalkLiveBtn');
      if (btn) btn.click();
    });
  }
  if ($('bellBtn')) {
    $('bellBtn').addEventListener('click', function () {
      renderNotifSheet();
      showSheet(notifSheet);
    });
  }

  function renderNotifSheet() {
    var body = $('notifSheetBody');
    if (!body) return;
    var visible = (state.notifs || []).filter(function (n) { return n.type !== 'message'; });
    if (!visible.length) {
      body.innerHTML = '<p class="tab-empty">' + esc(T('noNotifications')) + '</p>';
      return;
    }
    // The requests list is a live element app.js re-renders; show it here
    // rather than copying its markup and letting the two drift apart.
    var list = $('notifList');
    body.innerHTML = '';
    if (list) body.appendChild(list);
  }

  /* ==========================================================================
     Messages tab
     ====================================================================== */

  // Friend requests and call-backs belong at the top of Messages now. The
  // element itself is moved, not cloned, so app.js keeps rendering into it.
  function placeRequestsList() {
    var list = $('notifList');
    if (!list || !msgRequestsSlot) return;
    if (openSheet === notifSheet) return; // it is on loan to the bell sheet
    if (list.parentElement !== msgRequestsSlot) msgRequestsSlot.appendChild(list);
  }

  function lastMessageFor(friend) {
    var best = friend.lastMessage || null;
    var cache = state.chats;
    if (cache && typeof cache.get === 'function') {
      var local = cache.get(friend.clientId);
      if (local && local.length) {
        var m = local[local.length - 1];
        if (!best || (m.ts || 0) >= (best.ts || 0)) {
          best = { from: m.from, text: m.gif ? '' : (m.text || ''), gif: !!m.gif, ts: m.ts || 0 };
        }
      }
    }
    return best;
  }

  function unreadFor(clientId) {
    return (state.notifs || []).filter(function (n) {
      return n.type === 'message' && n.fromClientId === clientId;
    }).length;
  }

  function renderMessagesTab() {
    var friends = state.friends || [];
    var onlineCount = friends.filter(function (f) { return f.online; }).length;

    if (messagesOnlineLine) {
      messagesOnlineLine.textContent = onlineCount === 0
        ? T('noFriendsOnline')
        : (onlineCount === 1 ? T('oneFriendOnline') : T('nFriendsOnline', { n: onlineCount }));
    }

    // --- the rail: friends, whoever is online first ---
    if (msgFriendsRail) {
      if (!friends.length) {
        msgFriendsRail.innerHTML = '<p class="tab-empty">' + esc(T('noFriendsYet')) + '</p>';
      } else {
        var ordered = friends.slice().sort(function (a, b) {
          return (b.online ? 1 : 0) - (a.online ? 1 : 0);
        });
        msgFriendsRail.innerHTML = ordered.map(function (f) {
          return '<div class="friend-card">'
            + '<button type="button" class="friend-card-avatar" data-profile="' + esc(f.clientId) + '" aria-label="' + esc(nameOf(f)) + '">'
            + avatarFor(f, 60, { online: !!f.online }) + '</button>'
            + '<span class="friend-card-name">' + esc(nameOf(f)) + '</span>'
            + '<button type="button" class="friend-card-btn" data-chat="' + esc(f.clientId) + '">'
            + ICON.chat + '<span>' + esc(T('message')) + '</span></button>'
            + '</div>';
        }).join('');
      }
    }

    // --- the conversations ---
    if (msgConvoList) {
      var convos = friends.map(function (f) {
        return { friend: f, last: lastMessageFor(f), unread: unreadFor(f.clientId) };
      }).filter(function (c) {
        return c.last || c.unread > 0;
      }).sort(function (a, b) {
        return ((b.last && b.last.ts) || 0) - ((a.last && a.last.ts) || 0);
      });

      if (!convos.length) {
        msgConvoList.innerHTML = '<p class="tab-empty">' + esc(T('noConversationsYet')) + '</p>';
      } else {
        msgConvoList.innerHTML = convos.map(function (c) {
          var f = c.friend;
          var preview = '';
          if (c.last) {
            var mine = c.last.from === state.myClientId;
            var body = c.last.gif ? T('sentAGif') : c.last.text;
            preview = (mine ? T('youPrefix') + ' ' : '') + body;
          }
          var when = c.last && c.last.ts ? callApp('timeAgo', c.last.ts) : '';
          // Name and time on one line, preview and unread count on the next:
          // the two action buttons need their width, and a name that reads
          // "Four Toast…" is worse than a timestamp that sits above it.
          return '<div class="convo-row">'
            + '<button type="button" class="convo-open" data-chat="' + esc(f.clientId) + '">'
            + avatarFor(f, 48, { online: !!f.online })
            + '<span class="convo-text">'
            + '<span class="convo-line">'
            + '<span class="convo-name">' + esc(nameOf(f)) + '</span>'
            + (when ? '<span class="convo-time">' + esc(when) + '</span>' : '')
            + '</span>'
            + '<span class="convo-line">'
            + '<span class="convo-preview' + (c.unread ? ' is-unread' : '') + '">' + esc(preview) + '</span>'
            + (c.unread ? '<span class="convo-unread">' + c.unread + '</span>' : '')
            + '</span>'
            + '</span></button>'
            + '<span class="convo-side">'
            + '<button type="button" class="convo-action" data-call="' + esc(f.clientId) + '" data-name="' + esc(nameOf(f)) + '" aria-label="' + esc(T('callBack')) + '">' + ICON.phone + '</button>'
            + '<button type="button" class="convo-action" data-chat="' + esc(f.clientId) + '" aria-label="' + esc(T('chat')) + '">' + ICON.chat + '</button>'
            + '</span></div>';
        }).join('');
      }
    }

    placeRequestsList();
    renderBadges();
  }

  if (messagesTab) {
    messagesTab.addEventListener('click', function (e) {
      var chat = e.target.closest('[data-chat]');
      var profile = e.target.closest('[data-profile]');
      var call = e.target.closest('[data-call]');
      if (call) {
        call.classList.add('is-busy');
        callApp('requestCallBack', call.dataset.call, call.dataset.name, { deferUI: true });
      } else if (chat) {
        callApp('openFriendChat', chat.dataset.chat);
      } else if (profile) {
        callApp('openFriendProfile', profile.dataset.profile);
      }
    });
  }
  if ($('msgFriendsHeading')) {
    // "Friends >" expands the rail into a grid showing everyone at once,
    // instead of a strip you have to scroll sideways. Tapping again collapses
    // it. The chevron turns to match, so the control says which way it goes.
    $('msgFriendsHeading').addEventListener('click', function () {
      if (!msgFriendsRail) return;
      var open = msgFriendsRail.classList.toggle('is-expanded');
      this.classList.toggle('is-open', open);
      this.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    $('msgFriendsHeading').setAttribute('aria-expanded', 'false');
  }

  // Unread stays unread until the thread is actually opened - that is what
  // tells the sender their message was seen - so the badges are a pure read of
  // app.js's notification state, never cleared by visiting the tab.
  function renderBadges() {
    var msgs = (state.notifs || []).filter(function (n) { return n.type === 'message'; }).length;
    var other = (state.notifs || []).filter(function (n) { return n.type !== 'message'; }).length;
    if (tabMessagesBadge) {
      tabMessagesBadge.textContent = msgs > 99 ? '99+' : String(msgs);
      tabMessagesBadge.classList.toggle('hidden', msgs === 0);
    }
    var bell = $('bellBadge');
    if (bell) {
      bell.textContent = other > 99 ? '99+' : String(other);
      bell.classList.toggle('hidden', other === 0);
    }
  }

  /* ==========================================================================
     History tab
     ====================================================================== */

  function relationOf(clientId) {
    if ((state.friends || []).some(function (f) { return f.clientId === clientId; })) return 'friend';
    if ((state.requests || []).some(function (r) { return r.clientId === clientId; })) return 'incoming';
    if ((state.sent || []).some(function (r) { return r.clientId === clientId; })) return 'pending';
    return 'stranger';
  }

  function durationLabel(seconds) {
    var s = Math.max(0, Math.round(seconds || 0));
    if (s < 60) return s + 's';
    var m = Math.floor(s / 60);
    var rest = s % 60;
    return m + 'm' + (rest ? ' ' + rest + 's' : '');
  }

  function renderHistoryTab() {
    if (!historyFeed) return;
    var rows = state.history || [];
    if (!rows.length) {
      historyFeed.innerHTML = '<p class="tab-empty">' + esc(T('noHistoryYetCalls')) + '</p>';
      return;
    }
    historyFeed.innerHTML = rows.map(function (e) {
      var rel = e.clientId ? relationOf(e.clientId) : 'stranger';
      var addChip;
      if (rel === 'friend') {
        addChip = '<button type="button" class="history-chip" disabled>' + ICON.check + '<span>' + esc(T('friendAlready')) + '</span></button>';
      } else if (rel === 'pending') {
        addChip = '<button type="button" class="history-chip" disabled>' + ICON.clock + '<span>' + esc(T('requestSent')) + '</span></button>';
      } else if (rel === 'incoming') {
        // They asked first. Offering "Add friend" here would send a second
        // request instead of answering the one already waiting.
        addChip = '<button type="button" class="history-chip is-accept" data-accept="' + esc(e.clientId) + '">'
          + ICON.check + '<span>' + esc(T('confirm')) + '</span></button>';
      } else {
        addChip = '<button type="button" class="history-chip" data-add="' + esc(e.clientId || '') + '">'
          + ICON.addFriend + '<span>' + esc(T('addFriend')) + '</span></button>';
      }
      var meta = [];
      if (e.ts) meta.push('<span>' + esc(callApp('timeAgo', e.ts) || '') + '</span>');
      if (e.durationSeconds) {
        meta.push('<span class="history-card-duration">' + ICON.phone + esc(durationLabel(e.durationSeconds)) + '</span>');
      }
      return '<div class="history-card">'
        + '<button type="button" class="history-card-avatar" data-profile="' + esc(e.clientId || '') + '" aria-label="' + esc(e.username || '') + '">'
        + avatarFor(e, 52, { flag: true }) + '</button>'
        + '<div class="history-card-main">'
        + '<span class="history-card-name">' + esc(e.username || '') + '</span>'
        + '<div class="history-card-actions">'
        + '<button type="button" class="history-chip is-danger" data-report="' + esc(e.clientId || '') + '">'
        + ICON.flag + '<span>' + esc(T('report')) + '</span></button>'
        + addChip
        + '</div></div>'
        + '<div class="history-card-meta">' + meta.join('') + '</div>'
        + '</div>';
    }).join('');
  }

  if (historyTab) {
    historyTab.addEventListener('click', function (e) {
      var add = e.target.closest('[data-add]');
      var accept = e.target.closest('[data-accept]');
      var report = e.target.closest('[data-report]');
      var profile = e.target.closest('[data-profile]');
      if (accept && accept.dataset.accept) {
        if (typeof socket !== 'undefined') {
          socket.emit('friend-request-respond', { fromClientId: accept.dataset.accept, accept: true });
        }
        accept.disabled = true;
      } else if (add && add.dataset.add) {
        if (typeof socket !== 'undefined') socket.emit('friend-request', { targetClientId: add.dataset.add });
        add.disabled = true;
        add.innerHTML = ICON.clock + '<span>' + esc(T('requestSent')) + '</span>';
      } else if (report && report.dataset.report) {
        reportFromHistory(report.dataset.report);
      } else if (profile && profile.dataset.profile) {
        var person = (state.history || []).find(function (h) { return h.clientId === profile.dataset.profile; });
        if (person) callApp('openUserProfile', person);
      }
    });
  }

  function reportFromHistory(clientId) {
    var confirmFn = app('showConfirm');
    var run = function (ok) {
      if (!ok) return;
      if (typeof socket !== 'undefined') socket.emit('report-user', { targetClientId: clientId, reason: 'history' });
      callApp('showToast', T('reportUserSent'));
    };
    if (confirmFn) {
      Promise.resolve(confirmFn({ title: 'report', text: 'confirmReportUser', okKey: 'report' })).then(run);
    } else {
      run(window.confirm(T('confirmReportUser')));
    }
  }

  /* ==========================================================================
     Public surface
     ====================================================================== */

  window.TalkLiveShell = {
    sync: function (next) {
      state = {
        friends: next.friends || [],
        requests: next.requests || [],
        sent: next.sent || [],
        notifs: next.notifs || [],
        history: next.history || [],
        chats: next.chats || null,
        myClientId: next.myClientId || state.myClientId || '',
      };
      renderMessagesTab();
      renderHistoryTab();
      if (openSheet === notifSheet) renderNotifSheet();
    },
    switchTab: switchTab,
    refreshFaces: renderMyFaces,
  };

  // Everyone has a face from their very first second here. The animal used to
  // be opt-in, which meant most people showed up to a call - and in everyone
  // else's history and message list - as a blank disc. One is assigned at
  // random on a first visit; it is stored like any other choice, so the picker
  // still owns it and changing it works exactly as before.
  function ensureAnimal() {
    var animals = window.TalkLiveAnimals;
    if (!animals || !animals.ids || !animals.ids.length) return;
    if (animals.stored()) return;
    var pick = animals.ids[Math.floor(Math.random() * animals.ids.length)];
    var set = app('setMyAnimal');
    if (set) set(pick);
    else animals.store(pick);
  }

  // --- first paint ----------------------------------------------------------
  function boot() {
    sizeHome();
    ensureAnimal();
    renderMyFaces();
    renderQuickSelects();
    renderMessagesTab();
    renderHistoryTab();
    switchTab('voice');
    var f = filters();
    if (f) f.onChange(renderQuickSelects);
    // The settings panel can change your avatar, animal or name; redraw the two
    // places your own face appears when it closes.
    var settings = $('appSettingsPanel');
    if (settings) {
      new MutationObserver(renderMyFaces).observe(settings, { attributes: true, attributeFilter: ['class'] });
    }
    // i18n.js re-translates every [data-i18n] node itself; these three surfaces
    // are built in JS, so they have to be told.
    window.addEventListener('i18n-changed', function () {
      renderQuickSelects();
      renderMessagesTab();
      renderHistoryTab();
      renderHeroOnline();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}());
