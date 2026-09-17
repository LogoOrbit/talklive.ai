// ============================================================================
// TalkLive - dedicated text-chat app (/chat).
//
// This page is its OWN sub-app: no voice, no WebRTC, no call code. It speaks
// the same Socket.IO matchmaking protocol as the main app but only the small
// text-chat subset of it, so it stays light and loads fast on weak phones.
// i18n (t / getCountryName / applyI18n) and the country list come from the
// shared i18n.js + countries.js; everything else lives right here.
// ============================================================================
(function () {
  'use strict';

  var socket = io();

  // Forward uncaught errors on this page to the owner dashboard. /chat is a
  // separate sub-app from the main one, and until this was added it reported
  // nothing at all - bugs here were simply invisible in the Errors tab.
  if (window.TalkLiveErrors) window.TalkLiveErrors.install(function () { return socket; });

  // --- Persistent identity (matches the main app's keys so a returning user
  // keeps the same client id / chosen name across both pages). ---
  function getClientId() {
    var id = localStorage.getItem('talklive_client_id');
    if (!id) {
      id = 'c_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('talklive_client_id', id);
      // When this profile came into existence, so Settings can say how long it
      // has been around. Same key the call app writes, and only ever set
      // alongside a freshly minted id.
      localStorage.setItem('talklive_profile_created', String(Date.now()));
    }
    return id;
  }
  var tempUsername = localStorage.getItem('talklive_tempname') || null;
  var accountNickname = null; // set if a logged-in session exists elsewhere
  var CONSENT_KEY = 'talklive_age_consent';

  // --- DOM ---
  var $ = function (id) { return document.getElementById(id); };
  // Resolved once. Every caller used to re-query it and dereference the result
  // blind, so a markup change turned into a TypeError mid-conversation.
  var topbar = document.querySelector('.topbar');
  var brandDot = $('brandDot');
  var stage = $('chatStage');
  var viewStart = $('viewStart');
  var viewSearch = $('viewSearch');
  var viewLive = $('viewLive');
  var composer = $('composer');
  var input = $('msgInput');
  var msgs = $('msgs');
  var startBtn = $('startBtn');
  var cancelBtn = $('cancelBtn');
  var nextBtn = $('nextBtn');
  var searchLine = $('searchLine');
  var reportBtn = $('reportBtn');
  var addFriendBtn = $('addFriendBtn');
  var typingEl = $('typing');
  var onlineCount = $('onlineCount');
  var liveCount = $('liveCount');
  var autoBtn = $('autoBtn');
  var topDefault = $('topDefault');
  var topPartner = $('topPartner');
  var animalGrid = $('animalGrid');
  var animalChosenText = $('animalChosen');
  var topPartnerAnimal = $('topPartnerAnimal');

  // --- Shared preferences (same localStorage keys as the call app, so the
  // theme/name/sound choices follow the user between both sub-apps). ---
  var THEMES = ['dark', 'light', 'ocean', 'sunset'];
  var currentTheme = localStorage.getItem('talklive_theme');
  if (THEMES.indexOf(currentTheme) === -1) currentTheme = 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);
  var soundEnabled = localStorage.getItem('talklive_sound') !== 'off';
  var vibrationEnabled = localStorage.getItem('talklive_vibration') !== 'off';
  var myGender = localStorage.getItem('talklive_gender') || '';

  // Preferred partner. Stored in the same sessionStorage blob the call app
  // uses for its filters, so a choice made on either page holds for the tab
  // and neither page clobbers the other's country/interest filters.
  var FILTERS_KEY = 'talklive_filters';
  function readFilters() {
    try { return JSON.parse(sessionStorage.getItem(FILTERS_KEY)) || {}; } catch (e) { return {}; }
  }
  var myPrefGender = readFilters().prefGender || 'any';
  function savePrefGender(value) {
    myPrefGender = value;
    var filters = readFilters();
    filters.prefGender = value;
    try { sessionStorage.setItem(FILTERS_KEY, JSON.stringify(filters)); } catch (e) {}
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function getFlagImg(code, size) {
    size = size || 20;
    if (!code || code.length !== 2 || code === 'XX') {
      return '<svg class="flag-icon" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><ellipse cx="12" cy="12" rx="4.2" ry="9.5"/><line x1="2.5" y1="12" x2="21.5" y2="12"/></svg>';
    }
    var cc = code.toLowerCase();
    // alt="" plus a self-removing onerror: flagcdn is a third party, and the
    // networks this app is most used on are the ones that block third
    // parties. A flag that fails has to leave nothing behind rather than a
    // broken icon with a country name spilling out of it - the country is
    // written next to every flag here anyway. Same rule as app.js.
    return '<img class="flag-icon" src="https://flagcdn.com/24x18/' + cc + '.png" srcset="https://flagcdn.com/48x36/' + cc
      + '.png 2x" width="' + size + '" height="' + Math.round(size * 0.75)
      + '" loading="lazy" decoding="async" alt="" onerror="this.remove()" />';
  }
  function vibrate(ms) { try { if (vibrationEnabled && navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

  // --- Sound effects: tiny synthesized blips (no audio files, CSP-safe, work
  // offline). Built with the Web Audio API. The context can only start after a
  // user gesture, so we lazily create/resume it on the first tap. ---
  var audioCtx = null;
  function initAudio() {
    try {
      if (!audioCtx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (AC) audioCtx = new AC();
      }
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) { audioCtx = null; }
  }
  // A short two-note blip. freqs = [start, end] Hz; type = wave; vol = 0..1.
  function playBlip(freqs, dur, vol) {
    if (!audioCtx || !soundEnabled) return;
    try {
      var now = audioCtx.currentTime;
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqs[0], now);
      osc.frequency.exponentialRampToValueAtTime(freqs[1], now + dur);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(vol, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(now); osc.stop(now + dur + 0.02);
    } catch (e) {}
  }
  // Outgoing: a light upward tick. Incoming: a soft lower "pop". Connect: a
  // friendly two-step chime.
  function soundSend() { playBlip([520, 880], 0.09, 0.05); }
  function soundReceive() { playBlip([680, 440], 0.12, 0.06); }
  function soundConnect() { playBlip([440, 660], 0.1, 0.05); setTimeout(function () { playBlip([660, 880], 0.12, 0.05); }, 90); }

  // --- State ---
  var myProfile = null;
  var currentPartner = null;
  var searching = false;
  var partnerHere = false;

  // Auto: keep searching automatically when a partner disconnects. Shares the
  // same storage key as the voice app's "keep connecting me" checkbox, so the
  // preference is consistent across both sub-apps.
  var AUTO_NEXT_KEY = 'talklive_autocall';
  var autoNext = localStorage.getItem(AUTO_NEXT_KEY) === 'on';
  function setAutoNext(on, announce) {
    autoNext = on;
    localStorage.setItem(AUTO_NEXT_KEY, autoNext ? 'on' : 'off');
    autoBtn.classList.toggle('active', autoNext);
    autoBtn.setAttribute('aria-pressed', autoNext ? 'true' : 'false');
    if (announce && partnerHere) addMessage(t(autoNext ? 'chatAutoOn' : 'chatAutoOff'), 'system');
  }
  setAutoNext(autoNext);
  autoBtn.addEventListener('click', function () { vibrate(10); setAutoNext(!autoNext, true); });

  // ---------------------------------------------------------------------------
  // Views: start → search → live. Only one is visible at a time.
  // ---------------------------------------------------------------------------
  function showView(name) {
    // Move focus out of whatever is about to be hidden.
    //
    // Pressing "Start chatting" hides #viewStart while the button that was
    // clicked still has focus, and marking an element aria-hidden while a
    // descendant is focused hides a focused control from assistive technology.
    // Chrome refuses to apply the attribute at all in that case and logs
    // "Blocked aria-hidden on an element because its descendant retained
    // focus", so without this the hidden views are never actually hidden from
    // a screen reader.
    var focused = document.activeElement;
    if (focused && focused !== document.body) {
      var leaving = [viewStart, viewSearch, viewLive, composer].some(function (view) {
        return view && view.contains(focused) && !(name === 'start' && view === viewStart)
          && !(name === 'search' && view === viewSearch)
          && !(name === 'live' && (view === viewLive || view === composer));
      });
      if (leaving) focused.blur();
    }

    [[viewStart, 'start'], [viewSearch, 'search'], [viewLive, 'live']].forEach(function (entry) {
      var active = name === entry[1];
      entry[0].classList.toggle('hidden', !active);
      entry[0].setAttribute('aria-hidden', active ? 'false' : 'true');
    });
    var live = name === 'live';
    composer.classList.toggle('hidden', !live);
    composer.setAttribute('aria-hidden', live ? 'false' : 'true');
    var connected = name === 'live' && partnerHere;
    reportBtn.classList.toggle('hidden', !connected);
    addFriendBtn.classList.toggle('hidden', !connected);
    // Mini-games need a live partner, same as Report and Add friend.
    if (gameBtn) gameBtn.classList.toggle('hidden', !connected);
    autoBtn.classList.toggle('hidden', name === 'start');
    // While connected the header shows who you're talking to (name + country
    // + flag); idle shows the online counter next to the TalkLive brand.
    topDefault.classList.toggle('hidden', connected);
    topPartner.classList.toggle('hidden', !connected);
    if (topbar) topbar.classList.toggle('connected', connected);
    if (name !== 'search') stopSearchLines();
  }

  // Rotating one-liners under the searching animation.
  var SEARCH_KEYS = ['chatSearch1', 'chatSearch2', 'chatSearch3', 'chatSearch4'];
  var searchTimer = null, searchIdx = 0;
  function stopSearchLines() { clearInterval(searchTimer); searchTimer = null; }
  function startSearchLines() {
    searchIdx = 0;
    searchLine.textContent = t(SEARCH_KEYS[0]);
    stopSearchLines();
    searchTimer = setInterval(function () {
      searchIdx = (searchIdx + 1) % SEARCH_KEYS.length;
      searchLine.textContent = t(SEARCH_KEYS[searchIdx]);
    }, 2600);
  }

  // ---------------------------------------------------------------------------
  // Messages
  // ---------------------------------------------------------------------------
  // `meta` carries the rich parts of a message - its id, the message it replies
  // to, an attached GIF. System lines pass none and stay a plain text node.
  // --- Message time ------------------------------------------------------
  // Same rules as the call app: every bubble carries the time it was sent, and
  // a "Today / Yesterday / Monday / 4 Mar" row marks where one day ends. The
  // stranger relay stamps a message server-side (one clock both sides agree
  // on); anything without a stamp falls back to this browser's.
  var GROUP_WINDOW_MS = 3 * 60 * 1000;

  function clock() { return window.TalkLiveTime || null; }

  function appendDayDivider(container, ts) {
    var c = clock();
    if (!c) return;
    var rows = container.querySelectorAll('[data-day]');
    var last = rows.length ? rows[rows.length - 1].dataset.day : null;
    if (last === c.dayStamp(ts)) return;
    container.appendChild(c.dividerNode(ts, 'day-divider'));
  }

  function appendMsgTime(el, ts) {
    var c = clock();
    var span = document.createElement('span');
    span.className = 'msg-time';
    span.textContent = c ? c.time(ts) : '';
    try { span.title = new Date(ts).toLocaleString(); } catch (e) {}
    el.appendChild(span);
  }

  // Consecutive messages from the same side inside a few minutes read as one
  // turn, so they tuck together instead of each floating on its own.
  function applyGrouping(el, who, ts) {
    var prev = el.previousElementSibling;
    if (!prev || !prev.classList.contains('msg')) return;
    if (!prev.classList.contains(who) || who === 'system') return;
    var prevTs = Number(prev.dataset.ts);
    if (prevTs && ts - prevTs > GROUP_WINDOW_MS) return;
    el.classList.add('is-grouped');
  }

  function addMessage(text, who, meta) {
    var ts = (meta && meta.ts) || Date.now();
    if (who !== 'system') appendDayDivider(msgs, ts);
    var el = document.createElement('div');
    el.className = 'msg ' + who;
    el.dataset.ts = String(ts);
    if (text) {
      // The text lives in its own span once a bubble can also hold a quote, a
      // GIF and a reaction row - otherwise they cannot be stacked.
      var body = document.createElement('span');
      body.className = 'msg-text';
      body.textContent = text;
      el.appendChild(body);
    }
    if (who !== 'system') appendMsgTime(el, ts);
    msgs.appendChild(el);
    applyGrouping(el, who, ts);
    if (meta && extras) {
      extras.decorate(el, {
        id: meta.id,
        mine: who === 'me',
        text: text,
        replyTo: meta.replyTo,
        gif: meta.gif,
      });
    }
    msgs.scrollTop = msgs.scrollHeight;
    return el;
  }
  function clearMessages() {
    msgs.innerHTML = '';
    if (extras) extras.reset();
  }
  // Turns a markup string into a single node without an innerHTML assignment on
  // a live element (used for the inline animal glyph in a system line).
  function htmlToNode(html) {
    var box = document.createElement('span');
    box.className = 'msg-animal-glyph';
    box.innerHTML = html;
    return box;
  }

  // Bot heuristic: the same line repeated back-to-back is the classic spam
  // signature - warn once so the user just taps Next.
  var UNSAFE_RE = /\b(child\s*porn|cp\s*trade|loli(?:con)?|jailbait|sell(?:ing)?\s+(?:drugs|guns|weapons)|buy\s+(?:drugs|cocaine|heroin|meth|fentanyl)|hire\s*(?:a\s*)?hitman|credit\s*card\s*numbers?|send\s+nudes|onlyfans|escort\s*service)\b/i;
  var LINK_RE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|io|xyz|ru|link|gg)\b)/i;
  var lastIn = '', repeat = 0, botWarned = false;
  function checkIncoming(text) {
    if (text === lastIn) repeat++; else { lastIn = text; repeat = 0; }
    if (!botWarned && (repeat >= 2 || UNSAFE_RE.test(text))) {
      botWarned = true;
      addMessage(t('chatBotWarning'), 'system');
    }
  }

  // ---------------------------------------------------------------------------
  // Spirit animal
  //
  // The same twelve animals, the same localStorage key and the same SVG sprite
  // as the voice app - pick one here and the call page already knows it. The
  // grid is built once; selecting is two class toggles, so tapping through the
  // row costs no rebuild and no reflow of the page behind it.
  // ---------------------------------------------------------------------------
  var Animals = window.TalkLiveAnimals;
  var myAnimal = Animals ? Animals.stored() : null;

  function renderAnimalChoiceLine() {
    if (!animalChosenText) return;
    if (!myAnimal) {
      animalChosenText.textContent = t('animalNoneChosen');
      animalChosenText.classList.remove('is-chosen');
      return;
    }
    animalChosenText.textContent = t('animalChosen', {
      animal: Animals.name(myAnimal),
      trait: Animals.trait(myAnimal),
    });
    animalChosenText.classList.add('is-chosen');
  }

  function renderAnimalPicker() {
    if (!animalGrid || !Animals) return;
    Animals.installSprite();
    var frag = document.createDocumentFragment();
    Animals.list.forEach(function (animal) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'animal-option' + (myAnimal === animal.id ? ' selected' : '');
      btn.dataset.animal = animal.id;
      btn.style.setProperty('--animal-color', animal.color);
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', myAnimal === animal.id ? 'true' : 'false');
      btn.innerHTML = Animals.icon(animal.id, 44)
        + '<span class="animal-option-name">' + escapeHtml(Animals.name(animal.id)) + '</span>';
      frag.appendChild(btn);
    });
    animalGrid.appendChild(frag);
    renderAnimalChoiceLine();
  }

  function refreshAnimalLabels() {
    if (!animalGrid || !Animals) return;
    var names = animalGrid.querySelectorAll('.animal-option');
    for (var i = 0; i < names.length; i++) {
      var label = names[i].querySelector('.animal-option-name');
      if (label) label.textContent = Animals.name(names[i].dataset.animal);
    }
    renderAnimalChoiceLine();
  }

  function setMyAnimal(id) {
    var next = myAnimal === id ? null : id; // tapping the chosen one clears it
    myAnimal = next;
    Animals.store(next);
    var options = animalGrid.querySelectorAll('.animal-option');
    for (var i = 0; i < options.length; i++) {
      var on = options[i].dataset.animal === next;
      options[i].classList.toggle('selected', on);
      options[i].setAttribute('aria-checked', on ? 'true' : 'false');
    }
    renderAnimalChoiceLine();
    register(); // so the server has it even before the next search goes out
  }

  if (animalGrid) {
    animalGrid.addEventListener('click', function (ev) {
      var option = ev.target.closest('.animal-option');
      if (!option) return;
      vibrate(8);
      setMyAnimal(option.dataset.animal);
    });
    renderAnimalPicker();
  }

  // The stranger's animal, next to their name in the top bar.
  function renderTopPartnerAnimal(animalId) {
    if (!topPartnerAnimal) return;
    if (!animalId || !Animals || !Animals.has(animalId)) {
      topPartnerAnimal.classList.add('hidden');
      topPartnerAnimal.innerHTML = '';
      return;
    }
    Animals.installSprite();
    topPartnerAnimal.innerHTML = Animals.icon(animalId, 22);
    topPartnerAnimal.title = Animals.name(animalId) + ' - ' + Animals.trait(animalId);
    topPartnerAnimal.classList.remove('hidden');
  }

  // ---------------------------------------------------------------------------
  // Flow control
  // ---------------------------------------------------------------------------
  // takeover: this tab is the one the user is looking at, so the server should
  // move the identity here even if another tab still answers for it.
  function register(takeover) {
    socket.emit('register', {
      takeover: !!takeover,
      clientId: getClientId(),
      // Both pages share one client id, and the server binds that id to a
      // signed token the first time it sees it. Registering without the token
      // was rejected as an identity clash, which left this socket with no
      // profile at all - so /chat searched forever for anyone who had already
      // used the voice page in the same browser, and again on every reconnect.
      identityToken: localStorage.getItem('talklive_identity_token') || '',
      nickname: accountNickname || tempUsername || undefined,
      gender: myGender || undefined,
      prefGender: myPrefGender,
      animal: myAnimal || undefined,
      // Kept with every register, as the call app does, so the choice survives
      // a reconnect instead of quietly reverting to visible.
      hideStatus: localStorage.getItem('talklive_status_visible') === 'off',
    });
  }

  // Every search goes through here so the watchdog below can tell an
  // acknowledged search from one the server never received. 'find-partner' is
  // answered immediately with 'waiting' or 'matched'; silence means the request
  // did not take effect (a socket that reconnected under a new id, a
  // registration that had not landed yet) and the search view would spin
  // forever.
  var searchAcked = false;
  function emitFindPartner() {
    searchAcked = false;
    // The animal travels with the search, so switching it between two chats
    // applies to the very next match without a re-register round trip.
    socket.emit('find-partner', { mode: 'chat', animal: myAnimal });
  }

  function goSearch(firstTime) {
    searching = true;
    partnerHere = false;
    if (games) games.reset();
    showView('search');
    startSearchLines();
    if (firstTime) register();
    emitFindPartner();
  }

  // Deliberately does not re-send an acknowledged search: 'find-partner' resets
  // the server's random-match fallback, so re-asserting a healthy search would
  // keep pushing the fallback out of reach.
  setInterval(function () {
    if (!searchAcked && searching && !partnerHere && socket.connected) emitFindPartner();
  }, 4000);

  function goStart() {
    searching = false;
    partnerHere = false;
    if (games) games.reset();
    if (location.pathname !== '/chat') history.replaceState(history.state, '', '/chat');
    showView('start');
  }

  // Entry gate before the first ever search: gender, then the house rules.
  // Both steps are once per browser - gender because it is stored like every
  // other profile choice (the settings panel edits it afterwards), the rules
  // because agreeing to them is recorded under CONSENT_KEY.
  var genderModal = $('genderModal');
  var genderGateOptions = $('genderGateOptions');
  var consentModal = $('consentModal');
  var consentAgreeBtn = $('consentAgreeBtn');
  var consentBackBtn = $('consentBackBtn');

  function setGenderGateValue(value) {
    genderGateOptions.querySelectorAll('.gate-option').forEach(function (opt) {
      opt.setAttribute('aria-checked', opt.dataset.value === value ? 'true' : 'false');
    });
  }
  function openGenderGate() {
    setGenderGateValue(myGender);
    openModal(genderModal);
  }
  function openRulesGate() {
    openModal(consentModal);
  }
  function requestStart() {
    if (!myGender) { openGenderGate(); return; }
    if (localStorage.getItem(CONSENT_KEY) !== 'yes') { openRulesGate(); return; }
    goSearch(true);
  }

  genderGateOptions.addEventListener('click', function (e) {
    var opt = e.target.closest('.gate-option');
    if (!opt) return;
    vibrate(10);
    myGender = opt.dataset.value;
    localStorage.setItem('talklive_gender', myGender);
    setGenderGateValue(myGender);
    setPillValue(genderGroup, myGender); // keep the settings panel in step
    // No register() here: every path out of this handler ends in goSearch(true),
    // which registers with the new gender itself.
    // A beat so the choice is visibly selected before the panel swaps, rather
    // than the tap appearing to skip straight past the question.
    setTimeout(function () {
      closeModal(genderModal);
      if (localStorage.getItem(CONSENT_KEY) === 'yes') goSearch(true);
      else openRulesGate();
    }, 180);
  });

  consentBackBtn.addEventListener('click', function () {
    closeModal(consentModal);
    openGenderGate();
  });
  consentAgreeBtn.addEventListener('click', function () {
    localStorage.setItem(CONSENT_KEY, 'yes');
    closeModal(consentModal);
    goSearch(true);
  });

  // The logo is the way back to the landing page - it is the one mark on the
  // screen everyone already treats as "home". It used to point at /chat and
  // reload the page instead, which left people stuck inside the chat app.
  // A plain link does the job, so middle-click and long-press work too.

  // --- Preferred partner, on the start view only ----------------------------
  // It lives inside #viewStart, so searching or connecting hides it with the
  // rest of that view - there is nothing extra to hide by hand. Male/Female
  // are a Premium filter the server drops on the free tier, so a free tap is
  // sent to /pricing instead of quietly selecting a filter that does nothing.
  var prefGenderGroup = $('prefGenderGroup');
  var prefPremiumHint = $('prefPremiumHint');
  var isPremiumUser = false;

  function setPrefCards(value) {
    prefGenderGroup.dataset.value = value;
    prefGenderGroup.querySelectorAll('.pref-card').forEach(function (card) {
      card.setAttribute('aria-pressed', card.dataset.value === value ? 'true' : 'false');
    });
  }
  setPrefCards(myPrefGender);

  prefGenderGroup.addEventListener('click', function (e) {
    var card = e.target.closest('.pref-card');
    if (!card) return;
    vibrate(10);
    if (!isPremiumUser && card.dataset.value !== 'any') {
      prefPremiumHint.classList.remove('hidden');
      return;
    }
    prefPremiumHint.classList.add('hidden');
    savePrefGender(card.dataset.value);
    setPrefCards(myPrefGender);
    register(); // the preference is part of the profile, so push it now
  });

  socket.on('premium-status', function (data) {
    isPremiumUser = !!(data && data.premium);
    // The bolt badges mark what the free tier cannot use, so they go away
    // once it can.
    document.querySelectorAll('.premium-lock').forEach(function (el) {
      el.classList.toggle('hidden', isPremiumUser);
    });
    if (isPremiumUser) prefPremiumHint.classList.add('hidden');
  });

  startBtn.addEventListener('click', function () { vibrate(10); initAudio(); requestStart(); });
  cancelBtn.addEventListener('click', function () {
    socket.emit('leave');
    goStart();
  });

  // Next: two-tap confirm (first tap arms, second skips).
  var nextArmed = false, nextTimer = null;
  function clearNextConfirm() {
    nextArmed = false;
    clearTimeout(nextTimer); nextTimer = null;
    nextBtn.classList.remove('confirm');
    nextBtn.querySelector('span').textContent = t('chatNext');
  }
  nextBtn.addEventListener('click', function () {
    vibrate(15);
    if (!nextArmed) {
      nextArmed = true;
      nextBtn.classList.add('confirm');
      nextBtn.querySelector('span').textContent = t('chatNextSure');
      clearTimeout(nextTimer);
      nextTimer = setTimeout(clearNextConfirm, 3500);
      return;
    }
    clearNextConfirm();
    clearMessages();
    goSearch(false);
    socket.emit('skip');
  });

  // Desktop: Esc taps Next (or closes whatever modal is open, standard behavior).
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' && e.key !== 'Esc') return;
    var openModalEl = document.querySelector('.modal-overlay:not(.hidden)');
    if (openModalEl) { closeModal(openModalEl); return; }
    var openPanelEl = document.querySelector('.side-panel.open');
    if (openPanelEl) { closeAllPanels(); return; }
    if (!composer.classList.contains('hidden')) {
      e.preventDefault();
      nextBtn.click();
    }
  });

  // Composer
  var typingThrottle = null;

  // Put the caret in the box the person is about to type in - on a match, and
  // whenever a panel with its own composer opens. Two details it has to get
  // right, both of which used to make a plain .focus() do nothing:
  //   - the box is usually revealed in the same tick (the side panels animate
  //     in from visibility:hidden, and a hidden element cannot take focus), so
  //     the call waits for the frame after the style lands;
  //   - a disabled input silently refuses focus, so callers re-enable first.
  // Skipped on touch, where the only effect is the on-screen keyboard leaping
  // up over the conversation before you've read a word of it.
  function focusComposer(el) {
    if (!el || el.disabled) return;
    if (window.matchMedia && !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (el.disabled) return;
        try { el.focus({ preventScroll: true }); } catch (err) { el.focus(); }
      });
    });
  }

  // Emoji, GIFs, replies and reactions. Attached once; everything it owns is
  // built on first use, so the cost to a user who only types is four DOM nodes.
  var extras = window.TalkLiveChatExtras ? window.TalkLiveChatExtras.attach({
    form: composer,
    input: input,
    messages: msgs,
    msgSelector: '.msg',
    send: deliver,
    react: function (id, emoji, on) {
      socket.emit('chat-reaction', { id: id, emoji: emoji, on: on });
    },
  }) : null;

  // The one path every outgoing stranger message takes, typed or picked. Returns
  // false when the message was refused, which tells the extras controller to
  // keep the reply context so the user can fix and resend.
  function deliver(payload) {
    if (!partnerHere) return false;
    var text = payload.text || '';
    if (!text && !payload.gif) return false;
    if (text && LINK_RE.test(text)) { addMessage(t('chatLinkBlocked'), 'system'); return false; }
    if (text && UNSAFE_RE.test(text)) { addMessage(t('chatBotWarning'), 'system'); return false; }
    socket.emit('chat-message', {
      text: text.slice(0, 1000),
      id: payload.id,
      replyTo: payload.replyTo,
      gif: payload.gif,
    });
    addMessage(text, 'me', payload);
    soundSend();
    return true;
  }

  composer.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    var sent = extras ? extras.compose(text) : deliver({ text: text, id: null, replyTo: null });
    // compose() returns the payload it built; deliver() reports success itself.
    if (sent === false) return;
    input.value = '';
    input.focus();
  });

  socket.on('chat-reaction', function (data) {
    if (!data || !extras) return;
    extras.remoteReaction(data.id, data.emoji, data.on);
  });
  input.addEventListener('input', function () {
    if (typingThrottle) return;
    socket.emit('typing');
    typingThrottle = setTimeout(function () { typingThrottle = null; }, 1500);
  });

  // Mobile: when the on-screen keyboard opens/closes the visual viewport
  // resizes; keep the page pinned to the top and the latest message in view
  // instead of relying on the browser's own (unreliable) scroll-into-view.
  function pinToLatest() {
    window.scrollTo(0, 0);
    msgs.scrollTop = msgs.scrollHeight;
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', pinToLatest);
  }
  input.addEventListener('focus', function () { setTimeout(pinToLatest, 60); });

  // ---------------------------------------------------------------------------
  // Report (reuses the shared server report flow, which auto-rematches).
  // ---------------------------------------------------------------------------
  var reportModal = $('reportModal');
  var reportReasons = $('reportReasons');
  var reportDetail = $('reportDetail');
  var selectedReason = null;
  function openReport() {
    selectedReason = null;
    reportReasons.querySelectorAll('.report-reason').forEach(function (b) { b.classList.remove('selected'); });
    reportDetail.value = '';
    openModal(reportModal);
  }
  reportBtn.addEventListener('click', function () { if (partnerHere) openReport(); });
  reportReasons.addEventListener('click', function (e) {
    var btn = e.target.closest('.report-reason');
    if (!btn) return;
    reportReasons.querySelectorAll('.report-reason').forEach(function (b) { b.classList.toggle('selected', b === btn); });
    selectedReason = btn.dataset.reason;
  });
  $('reportSubmitBtn').addEventListener('click', function () {
    if (!selectedReason) { flashSearchNote(t('reportPickReason')); return; }
    var detail = reportDetail.value.trim().slice(0, 300);
    closeModal(reportModal);
    socket.emit('report', { reason: selectedReason, detail: detail });
    clearMessages();
    goSearch(false);
  });
  $('reportCloseBtn').addEventListener('click', function () { closeModal(reportModal); });
  reportModal.addEventListener('click', function (e) { if (e.target === reportModal) closeModal(reportModal); });

  // ---------------------------------------------------------------------------
  // Add friend
  // ---------------------------------------------------------------------------
  var friendModal = $('friendModal');
  var friendUsername = $('friendUsername');
  var friendMessage = $('friendMessage');
  addFriendBtn.addEventListener('click', function () {
    if (!currentPartner || !currentPartner.clientId) return;
    if (addFriendBtn.classList.contains('sent')) return;
    friendUsername.textContent = currentPartner.username;
    friendMessage.value = '';
    openModal(friendModal);
  });
  $('friendSendBtn').addEventListener('click', function () {
    if (!currentPartner || !currentPartner.clientId) return;
    var message = friendMessage.value.trim().slice(0, 200);
    socket.emit('friend-request', { targetClientId: currentPartner.clientId, message: message || undefined });
    addFriendBtn.classList.add('sent');
    addFriendBtn.disabled = true;
    closeModal(friendModal);
    addMessage(t('friendReqSentMsg', { name: currentPartner.username }), 'system');
  });
  $('friendCancelBtn').addEventListener('click', function () { closeModal(friendModal); });
  $('friendCloseBtn').addEventListener('click', function () { closeModal(friendModal); });
  friendModal.addEventListener('click', function (e) { if (e.target === friendModal) closeModal(friendModal); });

  // ---------------------------------------------------------------------------
  // Voice call invites - incoming only.
  //
  // /chat no longer offers a way to start a call: the bar's filled phone button
  // is gone, and with it the whole outgoing flow. What stays is the answering
  // half, because a partner still running the previously cached version of this
  // page can send an invite, and an invite that cannot be answered would look
  // to them like being ignored. Accepting still takes both sides to the voice
  // app together, paired by a one-time token.
  // ---------------------------------------------------------------------------
  var callIncomingModal = $('callIncomingModal'); // shown to the invited side

  socket.on('voice-invite', function (data) {
    if (!partnerHere) return; // stray/late event from a chat we already left
    vibrate([0, 40, 60, 40]);
    $('callIncomingName').textContent = (data && data.username) || t('somewhere');
    openModal(callIncomingModal);
  });
  $('callDeclineBtn').addEventListener('click', function () {
    socket.emit('voice-invite-respond', { accept: false });
    closeModal(callIncomingModal);
  });
  $('callAcceptBtn').addEventListener('click', function () {
    socket.emit('voice-invite-respond', { accept: true });
    closeModal(callIncomingModal);
    $('callAcceptBtn').disabled = true;
  });

  // Only ever reaches a page that sent an invite, which this one no longer
  // does - kept so the server has no listener-less event to reason about.
  socket.on('voice-invite-declined', function () {
    addMessage(t('callInviteDeclined'), 'system');
  });
  // Both sides of an accepted invite get this, the accepting one included, so
  // this is still the handler that carries a user out of a call they said yes to.
  socket.on('voice-invite-accepted', function (data) {
    var token = data && data.token;
    if (!token) return;
    location.href = '/call?invite=' + encodeURIComponent(token);
  });

  // Tiny toast under the search line for transient errors.
  function flashSearchNote(text) {
    var note = $('reportNote');
    if (!note) return;
    note.textContent = text;
    note.classList.remove('hidden');
    clearTimeout(flashSearchNote._t);
    flashSearchNote._t = setTimeout(function () { note.classList.add('hidden'); }, 2500);
  }

  // --- Modal helpers ---
  function openModal(m) { m.classList.remove('hidden'); document.body.classList.add('modal-open'); }
  function closeModal(m) { m.classList.add('hidden'); if (!document.querySelector('.modal-overlay:not(.hidden)')) document.body.classList.remove('modal-open'); }

  // ---------------------------------------------------------------------------
  // Mini-games (Tic Tac Toe, Dots & Boxes) - the same games.js the call screen
  // uses, over the same relayed 'game' event. The call app makes the caller the
  // host; a text chat has no initiator, so the two clientIds pick one
  // deterministically - both sides compare the same pair and agree.
  // ---------------------------------------------------------------------------
  var gameBtn = $('gameBtn');
  var games = (window.TalkLiveGames && gameBtn) ? window.TalkLiveGames.attach({
    socket: socket,
    gameBtn: gameBtn,
    isConnected: function () { return partnerHere; },
    isHost: function () {
      if (!currentPartner || !currentPartner.clientId) return false;
      return String(getClientId()) < String(currentPartner.clientId);
    },
    partnerName: function () { return currentPartner ? currentPartner.username : ''; },
    myName: function () { return myProfile && myProfile.username ? myProfile.username : ''; },
    vibrate: vibrate,
    openModal: openModal,
    closeModal: closeModal,
    sound: function (kind) {
      initAudio();
      if (kind === 'move') playBlip([520, 760], 0.07, 0.05);
      else if (kind === 'turn') playBlip([660, 990], 0.11, 0.06);
      else if (kind === 'win') { playBlip([660, 990], 0.12, 0.06); setTimeout(function () { playBlip([880, 1320], 0.16, 0.06); }, 110); }
      else if (kind === 'lose') playBlip([420, 240], 0.22, 0.05);
      else if (kind === 'invite') playBlip([880, 1170], 0.1, 0.05);
    },
  }) : null;

  // The games menu item opens the overlay; the menu closes behind it.
  if (gameBtn) {
    gameBtn.addEventListener('click', function () {
      if (!partnerHere || !games) return;
      initAudio();
      games.open(); // the menu closes itself on click
    });
  }

  // ---------------------------------------------------------------------------
  // Side panels (settings / friends / friend chat) - the nav features shared
  // with the call app. Each panel slides in over its own overlay.
  // ---------------------------------------------------------------------------
  function openPanel(panel, overlay) {
    panel.inert = false;
    panel.setAttribute('aria-hidden', 'false');
    panel.classList.add('open');
    overlay.classList.remove('hidden');
  }
  function closePanel(panel, overlay) {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    panel.inert = true;
    overlay.classList.add('hidden');
  }
  function closeAllPanels() {
    closePanel(settingsPanel, settingsOverlay);
    closePanel(friendsPanel, friendsOverlay);
    closePanel(friendChatPanel, friendChatOverlay);
    closePanel(historyPanel, historyOverlay);
  }

  // --- Settings ---
  var settingsPanel = $('settingsPanel');
  var settingsOverlay = $('settingsOverlay');
  var tempNameInput = $('tempNameInput');
  var genderGroup = $('genderGroup');
  var themeGroup = $('themeGroup');
  var langSelect = $('langSelect');
  var soundToggle = $('soundToggle');
  var vibrationToggle = $('vibrationToggle');

  // The row at the top of Settings is you: avatar, name, and when this profile
  // came into existence. Same row, same wording as the call app.
  var settingsProfileRow = $('settingsProfileRow');
  function renderSettingsProfileRow() {
    if (!settingsProfileRow) return;
    var name = accountNickname || tempUsername || (myProfile && myProfile.username) || '';
    var icon = (myAnimal && Animals && Animals.has(myAnimal)) ? Animals.icon(myAnimal, 40) : '';
    $('settingsProfileAvatar').innerHTML =
      (icon || escapeHtml((name || '?').charAt(0).toUpperCase())) +
      '<span class="settings-row-online" aria-hidden="true"></span>';
    $('settingsProfileName').textContent = name || t('linkProfileAnonymous');
    var created = Number(localStorage.getItem('talklive_profile_created'));
    $('settingsProfileJoined').textContent = (created > 0)
      ? t('joinedOn', { date: formatProfileCreated(created) })
      : t(accountNickname ? 'settingsRowAccount' : 'settingsRowGuest');
  }
  function formatProfileCreated(ts) {
    try {
      return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return new Date(ts).toDateString();
    }
  }

  // The account screens (sign in, register, My Account, Shop, Billing) live on
  // the landing page. /chat hands over to them rather than carrying a second
  // copy of the whole account stack.
  function goLanding(query) { location.href = '/' + (query || ''); }
  if (settingsProfileRow) {
    settingsProfileRow.addEventListener('click', function () {
      goLanding('?open=account&tab=' + (accountNickname ? 'login' : 'signup'));
    });
  }
  if ($('settingsShopRow')) $('settingsShopRow').addEventListener('click', function () { goLanding('?open=shop'); });
  if ($('settingsBillingRow')) $('settingsBillingRow').addEventListener('click', function () { goLanding('?open=billing'); });

  // Accordion: one tap opens a category, and only one stays open at a time.
  var settingsAccordion = $('settingsAccordion');
  if (settingsAccordion) {
    settingsAccordion.querySelectorAll('.acc-header').forEach(function (header) {
      var item = header.parentNode;
      if (header.getAttribute('aria-expanded') === 'true') item.classList.add('open');
      header.addEventListener('click', function () {
        var open = !item.classList.contains('open');
        settingsAccordion.querySelectorAll('.acc-item').forEach(function (other) {
          other.classList.remove('open');
          other.querySelector('.acc-header').setAttribute('aria-expanded', 'false');
        });
        item.classList.toggle('open', open);
        header.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
  }

  $('chatSettingsBtn').addEventListener('click', function () {
    vibrate(10);
    closeAllPanels();
    tempNameInput.value = tempUsername || (myProfile && myProfile.username) || '';
    renderSettingsProfileRow();
    openPanel(settingsPanel, settingsOverlay);
  });
  $('settingsCloseBtn').addEventListener('click', function () { closePanel(settingsPanel, settingsOverlay); });
  settingsOverlay.addEventListener('click', function () { closePanel(settingsPanel, settingsOverlay); });

  $('tempNameSaveBtn').addEventListener('click', function () {
    var name = tempNameInput.value.trim().slice(0, 24);
    if (!name) return;
    tempUsername = name;
    localStorage.setItem('talklive_tempname', name);
    register(); // re-register so the server picks up the new display name
  });

  function setPillValue(group, value) {
    group.querySelectorAll('.pill').forEach(function (p) {
      p.classList.toggle('selected', p.dataset.value === value);
    });
  }
  genderGroup.addEventListener('click', function (e) {
    var pill = e.target.closest('.pill');
    if (!pill) return;
    myGender = pill.dataset.value === myGender ? '' : pill.dataset.value; // tap again to clear
    localStorage.setItem('talklive_gender', myGender);
    setPillValue(genderGroup, myGender);
    register();
  });
  setPillValue(genderGroup, myGender);

  themeGroup.addEventListener('click', function (e) {
    var pill = e.target.closest('.pill');
    if (!pill) return;
    currentTheme = THEMES.indexOf(pill.dataset.value) !== -1 ? pill.dataset.value : 'dark';
    localStorage.setItem('talklive_theme', currentTheme);
    document.documentElement.setAttribute('data-theme', currentTheme);
    setPillValue(themeGroup, currentTheme);
  });
  setPillValue(themeGroup, currentTheme);

  // Language dropdown, built from the shared i18n language table.
  (function buildLangSelect() {
    if (typeof I18N_LANGS === 'undefined') { langSelect.parentNode.removeChild(langSelect); return; }
    Object.keys(I18N_LANGS).forEach(function (code) {
      var opt = document.createElement('option');
      opt.value = code;
      opt.textContent = I18N_LANGS[code].name;
      langSelect.appendChild(opt);
    });
    langSelect.value = (typeof I18N_STATE !== 'undefined' && I18N_STATE.lang) || 'en';
    langSelect.addEventListener('change', function () { setLanguage(langSelect.value); });
  })();

  soundToggle.checked = soundEnabled;
  soundToggle.addEventListener('change', function () {
    soundEnabled = soundToggle.checked;
    localStorage.setItem('talklive_sound', soundEnabled ? 'on' : 'off');
  });
  vibrationToggle.checked = vibrationEnabled;
  vibrationToggle.addEventListener('change', function () {
    vibrationEnabled = vibrationToggle.checked;
    localStorage.setItem('talklive_vibration', vibrationEnabled ? 'on' : 'off');
  });

  // Privacy & Safety. Both preferences are shared with the call app - same
  // storage keys, same server events - so a choice made on either page holds
  // on the other.
  var statusVisibilityToggle = $('statusVisibilityToggle');
  var statusVisible = localStorage.getItem('talklive_status_visible') !== 'off';
  if (statusVisibilityToggle) {
    statusVisibilityToggle.checked = statusVisible;
    statusVisibilityToggle.addEventListener('change', function () {
      statusVisible = statusVisibilityToggle.checked;
      localStorage.setItem('talklive_status_visible', statusVisible ? 'on' : 'off');
      socket.emit('set-status-visibility', { hidden: !statusVisible });
    });
  }

  // --- Friends panel: requests + friend list, kept in sync by 'state-sync'. ---
  var friendsPanel = $('friendsPanel');
  var friendsOverlay = $('friendsOverlay');
  var friendsBadge = $('friendsBadge');
  var requestsList = $('requestsList');
  var friendsList = $('friendsList');
  var friendsState = { friends: [], requests: [], sent: [], notifications: [] };
  var friendsTabs = $('friendsTabs');
  var friendsTabPanel = $('friendsTabPanel');
  var requestsTabPanel = $('requestsTabPanel');
  var friendsTabCount = $('friendsTabCount');
  var requestsTabCount = $('requestsTabCount');
  var sentRequestsList = $('sentRequestsList');
  var historyState = []; // [{ clientId, username, countryCode, online, ts }]

  function setTabCount(el, n) {
    if (!el) return;
    el.textContent = n > 99 ? '99+' : String(n);
    el.classList.toggle('hidden', n === 0);
  }

  function showFriendsTab(name) {
    if (!friendsTabs) return;
    friendsTabs.querySelectorAll('.tl-tab').forEach(function (tab) {
      var on = tab.dataset.tab === name;
      tab.classList.toggle('selected', on);
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    if (friendsTabPanel) friendsTabPanel.classList.toggle('hidden', name !== 'friends');
    if (requestsTabPanel) requestsTabPanel.classList.toggle('hidden', name !== 'requests');
  }

  if (friendsTabs) {
    friendsTabs.addEventListener('click', function (e) {
      var tab = e.target.closest('.tl-tab');
      if (tab) showFriendsTab(tab.dataset.tab);
    });
  }

  $('friendsBtn').addEventListener('click', function () {
    vibrate(10);
    closeAllPanels();
    // If someone has asked to be your friend, that is why you tapped Friends.
    showFriendsTab(friendsState.requests.length ? 'requests' : 'friends');
    openPanel(friendsPanel, friendsOverlay);
  });
  $('friendsCloseBtn').addEventListener('click', function () { closePanel(friendsPanel, friendsOverlay); });
  friendsOverlay.addEventListener('click', function () { closePanel(friendsPanel, friendsOverlay); });

  function unreadCountFor(clientId) {
    var n = 0;
    friendsState.notifications.forEach(function (notif) {
      if (notif.type === 'message' && notif.fromClientId === clientId) n++;
    });
    return n;
  }

  // What to call a friend. A nickname is this account's own private label for
  // them - the friend is never told and keeps their own name - so every
  // friend-facing surface reads it through here instead of .username.
  function friendLabel(f) {
    if (!f) return '';
    return (f.nickname && f.nickname.trim()) || f.username || '';
  }

  // --- Renaming a friend ---------------------------------------------------
  // The nickname is written onto this account's copy of the friendship only,
  // so the friend is never notified and keeps their own name; clearing the
  // field puts it back everywhere.
  var renameFriendModal = $('renameFriendModal');
  var renameFriendInput = $('renameFriendInput');
  var renameTargetId = null;

  function openRenameFriend(friend) {
    if (!friend) return;
    renameTargetId = friend.clientId;
    $('renameFriendHint').textContent = t('renameFriendHint', { name: friend.username });
    renameFriendInput.value = friend.nickname || '';
    openModal(renameFriendModal);
    requestAnimationFrame(function () {
      try { renameFriendInput.focus(); renameFriendInput.select(); } catch (e) {}
    });
  }

  function commitRenameFriend(nickname) {
    if (!renameTargetId) return;
    socket.emit('rename-friend', { friendClientId: renameTargetId, nickname: nickname });
    // Paint it now so the list behind the modal changes with the tap; the
    // state-sync that follows says the same thing.
    var friend = friendsState.friends.filter(function (f) { return f.clientId === renameTargetId; })[0];
    if (friend) {
      if (nickname) friend.nickname = nickname;
      else delete friend.nickname;
      renderFriends();
    }
    closeModal(renameFriendModal);
    renameTargetId = null;
  }

  $('renameFriendCloseBtn').addEventListener('click', function () { closeModal(renameFriendModal); });
  $('renameFriendSaveBtn').addEventListener('click', function () {
    commitRenameFriend(renameFriendInput.value.trim().slice(0, 24));
  });
  $('renameFriendResetBtn').addEventListener('click', function () { commitRenameFriend(''); });
  renameFriendInput.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    commitRenameFriend(renameFriendInput.value.trim().slice(0, 24));
  });

  // Requests you sent. The server ships them with every state-sync and the
  // client has always had them; nothing ever listed them, so asking someone to
  // be your friend left no trace anywhere in the UI.
  function renderSentRequests() {
    if (!sentRequestsList) return;
    if (!friendsState.sent.length) {
      sentRequestsList.innerHTML = '<p class="tl-empty">' + escapeHtml(t('noSentRequests')) + '</p>';
      return;
    }
    sentRequestsList.innerHTML = '';
    friendsState.sent.forEach(function (r) {
      var row = document.createElement('div');
      row.className = 'tl-sent-item';
      row.innerHTML =
        '<span class="tl-sent-avatar" aria-hidden="true">' + escapeHtml((r.username || '?').charAt(0)) + '</span>' +
        '<span class="tl-sent-text">' +
        '<span class="tl-sent-name">' + escapeHtml(r.username || '-') + ' ' + getFlagImg(r.countryCode, 14) + '</span>' +
        '</span>' +
        '<span class="tl-sent-chip">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/></svg>' +
        escapeHtml(t('pending')) + '</span>';
      sentRequestsList.appendChild(row);
    });
  }

  function renderFriends() {
    // Header badge: pending requests + unread friend messages.
    var unread = friendsState.notifications.filter(function (n) { return n.type === 'message'; }).length;
    var badgeCount = friendsState.requests.length + unread;
    friendsBadge.textContent = String(badgeCount);
    friendsBadge.classList.toggle('hidden', badgeCount === 0);

    setTabCount(friendsTabCount, friendsState.friends.length);
    setTabCount(requestsTabCount, friendsState.requests.length + friendsState.sent.length);
    renderSentRequests();

    // Each list says what it is and how many are in it. Without the headings a
    // pending request sat above "No friends yet" with nothing to say which was
    // which, and an accepted friend appeared as one unlabelled row.
    requestsList.innerHTML = '';
    if (!friendsState.requests.length) {
      requestsList.innerHTML = '<p class="tl-empty">' + escapeHtml(t('noRequestsYet')) + '</p>';
    }
    friendsState.requests.forEach(function (r) {
      var row = document.createElement('div');
      row.className = 'request-row';
      row.innerHTML =
        '<span class="friend-avatar" aria-hidden="true">' + escapeHtml((r.username || '?').charAt(0)) + '</span>' +
        '<span class="friend-main"><span class="friend-name">' + escapeHtml(r.username || '-') + ' ' + getFlagImg(r.countryCode, 14) + '</span>' +
        (r.message ? '<span class="request-note">' + escapeHtml(r.message) + '</span>' : '') + '</span>' +
        '<span class="friend-actions">' +
        '<button type="button" class="mini-btn accept" data-accept="1" title="' + escapeHtml(t('accept')) + '" aria-label="' + escapeHtml(t('accept')) + '"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12.5 10 18.5 20 6.5"/></svg></button>' +
        '<button type="button" class="mini-btn danger" data-accept="0" title="' + escapeHtml(t('decline')) + '" aria-label="' + escapeHtml(t('decline')) + '"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></button>' +
        '</span>';
      row.querySelectorAll('.mini-btn').forEach(function (b) {
        b.addEventListener('click', function () {
          socket.emit('friend-request-respond', { fromClientId: r.clientId, accept: b.dataset.accept === '1' });
        });
      });
      requestsList.appendChild(row);
    });

    friendsList.innerHTML = '';
    if (!friendsState.friends.length) {
      // "during a call" is the call app's wording; here you add someone while
      // you are chatting with them.
      friendsList.innerHTML = '<p class="tl-empty">' + escapeHtml(t('noFriendsYetChat')) + '</p>';
      return;
    }
    friendsState.friends.forEach(function (f) {
      var row = document.createElement('div');
      row.className = 'friend-row';
      var unreadN = unreadCountFor(f.clientId);
      row.innerHTML =
        '<span class="friend-avatar" aria-hidden="true">' + escapeHtml((friendLabel(f) || '?').charAt(0)) + '</span>' +
        '<span class="friend-main"><span class="friend-name">' + escapeHtml(friendLabel(f) || '-') + ' ' + getFlagImg(f.countryCode, 14) + '</span>' +
        '<span class="friend-status' + (f.online ? '' : ' is-offline') + '"><span class="online-dot"></span>' + escapeHtml(t(f.online ? 'online' : 'offline')) + '</span></span>' +
        '<span class="friend-actions">' +
        '<button type="button" class="mini-btn" data-act="chat" title="' + escapeHtml(t('chat')) + '" aria-label="' + escapeHtml(t('chat')) + '"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>' +
        (unreadN ? '<span class="notif-badge">' + unreadN + '</span>' : '') + '</button>' +
        '<button type="button" class="mini-btn" data-act="rename" title="' + escapeHtml(t('renameFriend')) + '" aria-label="' + escapeHtml(t('renameFriend')) + '"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5V20z"/><line x1="14.5" y1="6.5" x2="17.5" y2="9.5"/></svg></button>' +
        '<button type="button" class="mini-btn danger" data-act="remove" title="' + escapeHtml(t('removeFriend')) + '" aria-label="' + escapeHtml(t('removeFriend')) + '"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg></button>' +
        '</span>';
      row.querySelector('[data-act="chat"]').addEventListener('click', function () { openFriendChat(f); });
      row.querySelector('[data-act="rename"]').addEventListener('click', function () { openRenameFriend(f); });
      row.querySelector('[data-act="remove"]').addEventListener('click', function () {
        socket.emit('remove-friend', { friendClientId: f.clientId });
      });
      friendsList.appendChild(row);
    });
  }

  socket.on('state-sync', function (data) {
    data = data || {};
    friendsState.friends = data.friends || [];
    friendsState.requests = data.friendRequests || [];
    friendsState.sent = data.sentRequests || [];
    friendsState.notifications = data.notifications || [];
    historyState = data.chatHistory || [];
    renderFriends();
    renderHistory();
  });
  // Live badge updates: message notifications arrive alone (friend-request
  // ones come with a full state-sync), so track them locally too.
  socket.on('notification', function (n) {
    if (!n) return;
    if (n.type === 'message' && n.fromClientId === activeFriendChatId) return; // already reading it
    friendsState.notifications.push(n);
    renderFriends();
    renderHistory();
  });

  // --- Chat history: the last people you talked to at random, so you can
  // message back someone you lost. Populated by 'state-sync'. Text only -
  // deliberately no call-back button here. ---
  var historyPanel = $('historyPanel');
  var historyOverlay = $('historyOverlay');
  var historyList = $('historyList');

  $('historyBtn').addEventListener('click', function () {
    vibrate(10);
    closeAllPanels();
    renderHistory();
    openPanel(historyPanel, historyOverlay);
  });
  $('historyCloseBtn').addEventListener('click', function () { closePanel(historyPanel, historyOverlay); });
  historyOverlay.addEventListener('click', function () { closePanel(historyPanel, historyOverlay); });

  function renderHistory() {
    historyList.innerHTML = '';
    if (!historyState.length) {
      historyList.innerHTML = '<p class="list-empty">' + escapeHtml(t('noHistoryYet')) + '</p>';
      return;
    }
    historyState.forEach(function (h) {
      var row = document.createElement('div');
      row.className = 'friend-row';
      var unreadN = unreadCountFor(h.clientId);
      row.innerHTML =
        '<span class="friend-avatar" aria-hidden="true">' + escapeHtml((h.username || '?').charAt(0)) + '</span>' +
        '<span class="friend-main"><span class="friend-name">' + escapeHtml(h.username || '-') + ' ' + getFlagImg(h.countryCode, 14) + '</span>' +
        '<span class="friend-status' + (h.online ? '' : ' is-offline') + '"><span class="online-dot"></span>' + escapeHtml(t(h.online ? 'online' : 'offline')) + '</span></span>' +
        '<span class="friend-actions">' +
        '<button type="button" class="mini-btn" data-act="chat" title="' + escapeHtml(t('messageBack')) + '" aria-label="' + escapeHtml(t('messageBack')) + '"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>' +
        (unreadN ? '<span class="notif-badge">' + unreadN + '</span>' : '') + '</button>' +
        '</span>';
      row.querySelector('[data-act="chat"]').addEventListener('click', function () {
        openFriendChat({ clientId: h.clientId, username: h.username });
      });
      historyList.appendChild(row);
    });
  }

  // --- Friend chat: persistent one-to-one chat, same protocol as the call app. ---
  var friendChatPanel = $('friendChatPanel');
  var friendChatOverlay = $('friendChatOverlay');
  var friendChatMsgs = $('friendChatMsgs');
  var friendChatForm = $('friendChatForm');
  var friendChatInput = $('friendChatInput');
  var activeFriendChatId = null;

  // --- Read receipts ("Seen"), same opt-in as the call app and stored under
  // the same key, so the choice follows the user between /call and /chat.
  // Off means: send no receipts, and show no "Seen" on messages I sent.
  var messageSeenEnabled = localStorage.getItem('talklive_message_seen') !== 'off';
  var chatSeenToggleBtn = $('chatSeenToggleBtn');
  // ts of the partner's last read receipt per friend, so "Seen" survives a
  // re-render of the thread.
  var friendSeenTs = {};

  // The same preference has two controls - the switch in Settings and the
  // toggle in the friend-chat header - so both are redrawn together.
  var messageSeenToggle = $('messageSeenToggle');
  function syncSeenToggleUi() {
    if (messageSeenToggle) messageSeenToggle.checked = messageSeenEnabled;
    if (!chatSeenToggleBtn) return;
    chatSeenToggleBtn.classList.toggle('is-off', !messageSeenEnabled);
    chatSeenToggleBtn.setAttribute('aria-pressed', messageSeenEnabled ? 'true' : 'false');
  }
  if (messageSeenToggle) {
    messageSeenToggle.addEventListener('change', function () {
      messageSeenEnabled = messageSeenToggle.checked;
      try { localStorage.setItem('talklive_message_seen', messageSeenEnabled ? 'on' : 'off'); } catch (e) {}
      syncSeenToggleUi();
      if (messageSeenEnabled && activeFriendChatId) socket.emit('chat-seen', { friendClientId: activeFriendChatId });
    });
  }
  if (chatSeenToggleBtn) {
    chatSeenToggleBtn.addEventListener('click', function () {
      messageSeenEnabled = !messageSeenEnabled;
      try { localStorage.setItem('talklive_message_seen', messageSeenEnabled ? 'on' : 'off'); } catch (e) {}
      syncSeenToggleUi();
      // Turning it back on while a chat is open sends a receipt for what is on
      // screen right now, and brings my own "Seen" line back.
      if (activeFriendChatId) {
        if (messageSeenEnabled) socket.emit('chat-seen', { friendClientId: activeFriendChatId });
        renderSeenLabel();
      }
    });
  }
  syncSeenToggleUi();

  // "Seen" under the newest message I sent, once the other side has read the
  // conversation. One label, always the last child of the thread.
  function renderSeenLabel() {
    var existing = friendChatMsgs.querySelector('.chat-seen-label');
    if (existing) existing.remove();
    if (!messageSeenEnabled || !activeFriendChatId) return;
    var seenTs = friendSeenTs[activeFriendChatId];
    if (!seenTs) return;
    var mine = friendChatMsgs.querySelectorAll('.msg.me');
    var last = mine[mine.length - 1];
    if (!last) return;
    var sentAt = Number(last.dataset.ts || 0);
    if (sentAt && sentAt > seenTs) return;
    var label = document.createElement('div');
    label.className = 'chat-seen-label';
    label.textContent = t('seen');
    friendChatMsgs.appendChild(label);
    friendChatMsgs.scrollTop = friendChatMsgs.scrollHeight;
  }

  function appendFriendMsg(text, who, meta) {
    var ts = (meta && meta.ts) || Date.now();
    // A stored friend chat can span weeks, which is where day separators earn
    // their keep.
    appendDayDivider(friendChatMsgs, ts);
    var el = document.createElement('div');
    el.className = 'msg ' + who;
    el.dataset.ts = String(ts);
    if (text) {
      var body = document.createElement('span');
      body.className = 'msg-text';
      body.textContent = text;
      el.appendChild(body);
    }
    appendMsgTime(el, ts);
    friendChatMsgs.appendChild(el);
    applyGrouping(el, who, ts);
    if (meta && friendExtras) {
      friendExtras.decorate(el, {
        id: meta.id,
        mine: who === 'me',
        text: text,
        replyTo: meta.replyTo,
        gif: meta.gif,
        reactions: meta.reactions,
        myClientId: getClientId(),
      });
    }
    renderSeenLabel();
    friendChatMsgs.scrollTop = friendChatMsgs.scrollHeight;
  }

  // Friend chats get the same extras as stranger chat, plus persisted
  // reactions - the server stores those, so they survive a reload on both sides.
  var friendExtras = window.TalkLiveChatExtras ? window.TalkLiveChatExtras.attach({
    form: friendChatForm,
    input: friendChatInput,
    messages: friendChatMsgs,
    msgSelector: '.msg',
    send: function (payload) {
      if (!activeFriendChatId) return false;
      if (!payload.text && !payload.gif) return false;
      socket.emit('friend-message', {
        toClientId: activeFriendChatId,
        text: (payload.text || '').slice(0, 1000),
        id: payload.id,
        replyTo: payload.replyTo,
        gif: payload.gif,
      });
      return true;
    },
    react: function (id, emoji, on) {
      if (!activeFriendChatId) return;
      socket.emit('friend-reaction', { toClientId: activeFriendChatId, id: id, emoji: emoji, on: on });
    },
  }) : null;

  function openFriendChat(friend) {
    activeFriendChatId = friend.clientId;
    $('friendChatTitle').textContent = friendLabel(friend)
      ? t('chatWith', { name: friendLabel(friend) })
      : t('chat');
    friendChatMsgs.innerHTML = '';
    if (friendExtras) friendExtras.reset();
    closePanel(friendsPanel, friendsOverlay);
    openPanel(friendChatPanel, friendChatOverlay);
    socket.emit('get-friend-chat', { friendClientId: friend.clientId });
    socket.emit('mark-messages-read', { friendClientId: friend.clientId });
    if (messageSeenEnabled) socket.emit('chat-seen', { friendClientId: friend.clientId });
    // Clear this friend's unread notifications locally so badges update now.
    friendsState.notifications = friendsState.notifications.filter(function (n) {
      return !(n.type === 'message' && n.fromClientId === friend.clientId);
    });
    renderFriends();
    renderHistory();
    focusComposer(friendChatInput);
  }
  function closeFriendChat() {
    activeFriendChatId = null;
    closePanel(friendChatPanel, friendChatOverlay);
  }
  $('friendChatCloseBtn').addEventListener('click', closeFriendChat);
  friendChatOverlay.addEventListener('click', closeFriendChat);

  friendChatForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = friendChatInput.value.trim();
    if (!text || !activeFriendChatId) return;
    if (friendExtras) {
      if (friendExtras.compose(text) === false) return;
    } else {
      socket.emit('friend-message', { toClientId: activeFriendChatId, text: text.slice(0, 1000) });
    }
    friendChatInput.value = '';
    friendChatInput.focus();
  });

  socket.on('friend-chat-history', function (data) {
    if (!data || data.friendClientId !== activeFriendChatId) return;
    friendChatMsgs.innerHTML = '';
    if (friendExtras) friendExtras.reset();
    (data.messages || []).forEach(function (m) {
      appendFriendMsg(m.text, m.from === activeFriendChatId ? 'them' : 'me', m);
      if (m.seen && m.from !== activeFriendChatId) {
        friendSeenTs[activeFriendChatId] = Math.max(friendSeenTs[activeFriendChatId] || 0, m.ts || Date.now());
      }
    });
    renderSeenLabel();
  });
  socket.on('friend-message-sent', function (data) {
    if (data && data.toClientId === activeFriendChatId) appendFriendMsg(data.text, 'me', data);
  });
  socket.on('friend-message', function (data) {
    if (!data) return;
    if (data.fromClientId === activeFriendChatId) {
      appendFriendMsg(data.text, 'them', data);
      soundReceive();
      socket.emit('mark-messages-read', { friendClientId: data.fromClientId });
      if (messageSeenEnabled) socket.emit('chat-seen', { friendClientId: data.fromClientId });
    }
    // Badges refresh via the state-sync the server sends with the notification.
  });
  socket.on('chat-seen', function (data) {
    if (!data || !data.byClientId) return;
    friendSeenTs[data.byClientId] = data.ts || Date.now();
    if (data.byClientId === activeFriendChatId) renderSeenLabel();
  });

  socket.on('friend-reaction', function (data) {
    if (!data || !friendExtras) return;
    if (data.fromClientId !== activeFriendChatId) return;
    friendExtras.remoteReaction(data.id, data.emoji, data.on);
  });

  // ---------------------------------------------------------------------------
  // Socket events
  // ---------------------------------------------------------------------------
  // The server queue is keyed by socket id, so a dropped socket takes the
  // search with it. Re-register, then re-enter the queue once the server
  // confirms this socket carries a profile again - without that, anyone whose
  // socket blipped mid-search (phone backgrounded, network switch, a deploy)
  // sat in the search view forever on a search the server had never heard of.
  socket.on('connect', function () {
    register();
    socketConnected = true;
    refreshNetStatus();
    // Clearing the ack is what restarts the search: the watchdog re-sends
    // 'find-partner' a moment later, once the register above has landed and the
    // new socket has a profile to search with.
    if (searching && !partnerHere) searchAcked = false;
  });

  // --- Network status --------------------------------------------------------
  // The dot on the TalkLive mark is green while the internet and the socket are
  // both healthy and red the moment either drops - the same indicator, wired the
  // same way, as the voice app (see refreshNetStatus in app.js). Without this
  // the dot was decoration on /chat and a live signal on /, which is worse than
  // either on its own.
  var socketConnected = false;
  function refreshNetStatus() {
    if (!brandDot) return;
    var online = socketConnected && (typeof navigator.onLine === 'undefined' || navigator.onLine);
    brandDot.classList.toggle('is-online', online);
    brandDot.classList.toggle('is-offline', !online);
    brandDot.setAttribute('title', t(online ? 'netOnline' : 'netOffline'));
  }
  window.addEventListener('online', refreshNetStatus);
  window.addEventListener('offline', refreshNetStatus);

  socket.on('disconnect', function () {
    socketConnected = false;
    refreshNetStatus();
  });

  socket.on('needs-register', register);

  socket.on('identity-token', function (data) {
    if (data && data.clientId === getClientId() && typeof data.token === 'string'
      && /^[a-f0-9]{64}$/.test(data.token)) {
      localStorage.setItem('talklive_identity_token', data.token);
    }
  });

  // Same reasoning as the call app: a refusal now means "this identity is live
  // somewhere else right now", and rotating the clientId would orphan this
  // person's friends, friend chats and history. Retry first, rotate last.
  // Answering this is how the server tells a live tab from a dead socket before
  // moving the identity; see the register handler in server/index.js.
  socket.on('identity-ping', function (ack) { if (typeof ack === 'function') ack(); });

  // The tab being looked at claims the identity; a background tab waits.
  var lastTakeoverAt = 0;
  function claimIdentityWhenVisible() {
    function claim() {
      if (document.visibilityState !== 'visible') return watchForVisible();
      if (Date.now() - lastTakeoverAt < 10000) return;
      lastTakeoverAt = Date.now();
      if (socket.connected) register(true);
    }
    function watchForVisible() {
      document.addEventListener('visibilitychange', function onVis() {
        if (document.visibilityState !== 'visible') return;
        document.removeEventListener('visibilitychange', onVis);
        claim();
      });
    }
    if (document.visibilityState === 'visible') setTimeout(claim, 600);
    else watchForVisible();
  }

  var identityRetries = 0;
  socket.on('register-result', function (res) {
    if (!res || res.ok !== false) { identityRetries = 0; return; }
    if (res.reason === 'active-elsewhere') {
      identityRetries = 0;
      claimIdentityWhenVisible();
      return;
    }
    if (identityRetries < 4) {
      identityRetries += 1;
      setTimeout(function () { if (socket.connected) register(); }, 1500 * identityRetries);
      return;
    }
    identityRetries = 0;
    localStorage.removeItem('talklive_client_id');
    localStorage.removeItem('talklive_identity_token');
    register();
  });

  socket.on('profile', function (p) {
    myProfile = { username: p.username, country: p.country, countryCode: p.countryCode };
  });

  // The capsule leaves its waiting state the moment a real number arrives, and
  // the number itself is re-animated on every change so the badge reads as
  // live. Restarting the animation needs the class off, a reflow, then on -
  // re-adding a class the element already has does nothing.
  socket.on('online-count', function (n) {
    if (!onlineCount) return;
    var next = String(n);
    if (onlineCount.textContent === next) return;
    onlineCount.textContent = next;
    if (liveCount) liveCount.classList.remove('is-waiting');
    onlineCount.classList.remove('is-bump');
    void onlineCount.offsetWidth;
    onlineCount.classList.add('is-bump');
  });

  socket.on('matched', function (data) {
    if (data.mode && data.mode !== 'chat') return; // safety: ignore stray voice matches
    searchAcked = true;
    currentPartner = data.partner;
    partnerHere = true;
    // Before anything else: a disabled input cannot take focus, and the box is
    // left disabled when a chat ends. It used to be re-enabled by a second
    // 'matched' listener further down, which ran after the focus call below
    // and so cost you a click into the box on every single match.
    input.disabled = false;
    botWarned = false; lastIn = ''; repeat = 0;
    addFriendBtn.classList.remove('sent');
    addFriendBtn.disabled = false;
    clearMessages();
    // Top bar: partner name + country with its flag.
    // When the geo lookup found nothing the server sends 'XX' / 'Unknown'.
    // Neither is a place, and a line reading "Unknown" under someone's name
    // says less than no line at all - so the whole row stands down.
    var known = !!data.partner.countryCode && data.partner.countryCode !== 'XX';
    var countryName = known ? (getCountryName(data.partner.countryCode) || data.partner.country || '') : '';
    $('topPartnerName').textContent = data.partner.username;
    $('topPartnerCountry').textContent = countryName;
    $('topPartnerFlag').innerHTML = countryName ? getFlagImg(data.partner.countryCode, 16) : '';
    showView('live');
    soundConnect();
    // "You're now chatting with X from Pakistan 🇵🇰" - the flag image goes right
    // after the country name inside the system line, so it's built as DOM.
    var line = addMessage(countryName
      ? t('chatSystemMatched', { name: data.partner.username, country: countryName })
      : t('chatSystemMatchedNoCountry', { name: data.partner.username }), 'system');
    var html = escapeHtml(line.textContent);
    if (countryName && data.partner.countryCode && data.partner.countryCode !== 'XX') {
      html = html.replace(escapeHtml(countryName), escapeHtml(countryName) + ' ' + getFlagImg(data.partner.countryCode, 15));
    }
    line.innerHTML = html;
    renderTopPartnerAnimal(data.partner.animal);
    // A ready-made opener: their animal, what it says about them, and a nudge
    // to ask about it. Both picking the same one is worth its own line.
    if (data.partner.animal && Animals && Animals.has(data.partner.animal)) {
      var animalLine = addMessage(t('chatAnimalLine', {
        name: data.partner.username,
        animal: Animals.name(data.partner.animal),
        trait: Animals.trait(data.partner.animal),
      }), 'system system-animal');
      animalLine.insertBefore(
        htmlToNode(Animals.icon(data.partner.animal, 20)),
        animalLine.firstChild
      );
      if (myAnimal === data.partner.animal) {
        addMessage(t('animalSameMatch', { animal: Animals.name(myAnimal) }), 'system system-animal-match');
      }
      msgs.scrollTop = msgs.scrollHeight;
    }
    focusComposer(input);
  });

  socket.on('waiting', function () { searchAcked = true; });
  socket.on('random-fallback', function () { /* server widened the net; nothing to do */ });

  socket.on('chat-message', function (data) {
    if (!data) return;
    var text = data.text ? String(data.text) : '';
    if (!text && !data.gif) return;
    addMessage(text, 'them', { id: data.id, replyTo: data.replyTo, gif: data.gif, ts: data.ts });
    soundReceive();
    if (text) checkIncoming(text);
  });

  var typingHideTimer = null;
  socket.on('typing', function () {
    if (!partnerHere) return;
    typingEl.classList.remove('hidden');
    clearTimeout(typingHideTimer);
    typingHideTimer = setTimeout(function () { typingEl.classList.add('hidden'); }, 3000);
  });

  socket.on('chat-blocked', function (data) {
    var reason = data && data.reason;
    addMessage(reason === 'link' ? t('chatLinkBlocked') : t('errUnsafeMessage'), 'system');
  });

  socket.on('partner-left', function () {
    partnerHere = false;
    // Surface the drop on an open board (grey it out) instead of yanking it away.
    if (games) { if (games.isPlaying() || games.isNegotiating()) games.partnerLeft(); else games.reset(); }
    typingEl.classList.add('hidden');
    reportBtn.classList.add('hidden');
    addFriendBtn.classList.add('hidden');
    topDefault.classList.remove('hidden');
    topPartner.classList.add('hidden');
    renderTopPartnerAnimal(null); // never let the last stranger's animal linger
    if (topbar) topbar.classList.remove('connected');
    input.disabled = true;
    closeModal(callIncomingModal);
    if (autoNext) {
      // Keep going straight into a new search - no need to wait for a tap on Next.
      clearMessages();
      clearNextConfirm();
      goSearch(false);
    } else {
      addMessage(t('chatStageLeft'), 'system system-warn');
    }
  });
  // (The input is re-enabled at the top of the 'matched' handler above, where
  // it happens before the focus call rather than after it.)

  socket.on('banned', function (data) {
    stage.innerHTML = '<div class="chat-blocked-full"><h1>' + escapeHtml(t('bannedTitle')) + '</h1><p>' + escapeHtml(t('bannedBody')) + '</p></div>';
  });
  socket.on('maintenance', function (data) {
    stage.innerHTML = '<div class="chat-blocked-full"><h1>' + escapeHtml(t('maintenanceTitle')) + '</h1><p>' + escapeHtml((data && data.message) || t('maintenanceBody')) + '</p></div>';
  });

  // Keep translated bits fresh whenever i18n re-renders (e.g. language change).
  window.addEventListener('i18n-changed', function () {
    if (!nextArmed) nextBtn.querySelector('span').textContent = t('chatNext');
    refreshAnimalLabels();
    if (currentPartner) renderTopPartnerAnimal(currentPartner.animal);
  });

  // --- Overflow menu -------------------------------------------------------
  // Auto and Call stay in the bar; History, Friends, Add friend and Report
  // live in here with their names spelled out. Report and Add friend are
  // still shown/hidden by setStage(), which just makes them appear or
  // disappear as rows.
  var moreBtn = $('moreBtn'), topMenu = $('topMenu'), moreDot = $('moreDot');

  function closeMenu() {
    if (topMenu.classList.contains('hidden')) return;
    topMenu.classList.add('hidden');
    moreBtn.setAttribute('aria-expanded', 'false');
  }
  function openMenu() {
    topMenu.classList.remove('hidden');
    moreBtn.setAttribute('aria-expanded', 'true');
  }

  moreBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    vibrate(10);
    if (topMenu.classList.contains('hidden')) openMenu(); else closeMenu();
  });
  // Any choice dismisses the menu; each item keeps its own click handler.
  topMenu.addEventListener('click', closeMenu);
  document.addEventListener('click', function (e) {
    if (!topMenu.contains(e.target) && !moreBtn.contains(e.target)) closeMenu();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.key === 'Esc') closeMenu();
  });

  // Unread messages sit on the Friends row inside the closed menu, so mirror
  // that state onto the button as a dot - otherwise folding Friends away
  // would silently hide notifications.
  function syncMoreDot() {
    moreDot.classList.toggle('hidden', friendsBadge.classList.contains('hidden'));
  }
  new MutationObserver(syncMoreDot).observe(friendsBadge, {
    attributes: true, attributeFilter: ['class'],
  });
  syncMoreDot();

  // --- Boot: land straight on the single "Start chatting" button. ---
  goStart();
})();
