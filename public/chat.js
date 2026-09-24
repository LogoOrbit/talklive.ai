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
  // Signed in on the main app: the same durable session signs this page in
  // too. Without it a signed-in user chatted here under a random name, and
  // anyone they added saw them as a guest.
  var sessionToken = localStorage.getItem('talklive_session') || null;
  var accountNickname = sessionToken ? (localStorage.getItem('talklive_nickname') || null) : null;
  // First registration of a brand-new app session (see registerClient in
  // app.js): lets the server retire a guest's temporary friend ID.
  var freshAppSession = (function () {
    try {
      var fresh = sessionStorage.getItem('tl_app_session') !== '1';
      sessionStorage.setItem('tl_app_session', '1');
      return fresh;
    } catch (e) { return false; }
  })();
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
  var visitorCount = $('visitorCount');
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
  // On unless it has been turned off. Same key and same default as the voice
  // app, so "auto" means one thing across both halves of the product: when a
  // conversation ends, the next one starts without being asked for.
  var autoNext = localStorage.getItem(AUTO_NEXT_KEY) !== 'off';
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
    // The landing scrolls; a conversation does not. The page was locked at
    // `overflow: hidden` in every state, which is right once you are chatting
    // - only the message list should move - but on the start screen it meant
    // everything past the fold was unreachable. On an 820px phone that was
    // the bottom half of this page's only ad: rendered, never scrollable to,
    // and impossible for anyone to see in full.
    document.body.classList.toggle('page-scrolls', name === 'start');

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
  // A long wait gets the truth instead of "Almost there" on a loop: it is
  // quiet, the search carries on by itself, and one more person online is
  // exactly what would end it.
  var QUIET_AFTER_MS = 20000;
  var quietTimer = null, quietHint = null;
  function hideQuietHint() {
    clearTimeout(quietTimer); quietTimer = null;
    if (quietHint) quietHint.classList.add('hidden');
  }
  function showQuietHint() {
    stopSearchLines(true);
    searchLine.textContent = t('chatQuietTitle');
    if (!quietHint) {
      quietHint = document.createElement('div');
      quietHint.className = 'search-quiet';
      quietHint.innerHTML = '<p></p><button type="button" class="search-quiet-share"></button>';
      quietHint.querySelector('button').addEventListener('click', function () {
        var url = location.origin + '/chat';
        if (navigator.share) { navigator.share({ title: 'TalkLive', url: url }).catch(function () {}); return; }
        if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { socialToast(t('shareLinkCopied')); }).catch(function () {});
      });
      searchLine.after(quietHint);
    }
    quietHint.querySelector('p').textContent = t('chatQuietBody');
    quietHint.querySelector('button').textContent = t('railInviteCta');
    quietHint.classList.remove('hidden');
  }
  function stopSearchLines(keepQuiet) {
    clearInterval(searchTimer); searchTimer = null;
    if (!keepQuiet) hideQuietHint();
  }
  // `lead` is shown first, in place of the opening line: the reason this
  // search started, when it was not the user's own tap.
  function startSearchLines(lead) {
    searchIdx = 0;
    searchLine.textContent = lead || t(SEARCH_KEYS[0]);
    stopSearchLines();
    searchTimer = setInterval(function () {
      searchIdx = (searchIdx + 1) % SEARCH_KEYS.length;
      searchLine.textContent = t(SEARCH_KEYS[searchIdx]);
    }, 2600);
    quietTimer = setTimeout(showQuietHint, QUIET_AFTER_MS);
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
    hideIcebreakers();
    awayLine = null;
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

  // The picker opens on one row and grows on request, the same as the voice
  // app's. All twenty at once is a wall roughly 400px tall between the Start
  // button and everything under it - on a phone that pushed this page's only
  // ad to y=940 on an 820px screen, where nobody ever saw it, and made the
  // ice-breaker feel like a form to fill in before you were allowed to chat.
  //
  // The row you land on is never missing your own choice: a pick from further
  // down is pulled into it.
  var ANIMAL_PREVIEW_COUNT = 7;
  var animalPickerExpanded = false;

  function animalPreviewIds() {
    var ids = Animals.list.map(function (a) { return a.id; }).slice(0, ANIMAL_PREVIEW_COUNT);
    if (myAnimal && ids.indexOf(myAnimal) === -1) ids[ids.length - 1] = myAnimal;
    return ids;
  }

  function renderAnimalPicker() {
    if (!animalGrid || !Animals) return;
    Animals.installSprite();
    animalGrid.innerHTML = '';
    var shown = animalPickerExpanded
      ? Animals.list.map(function (a) { return a.id; })
      : animalPreviewIds();
    var frag = document.createDocumentFragment();
    shown.forEach(function (id) {
      var animal = Animals.get(id);
      if (!animal) return;
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

    if (Animals.list.length > ANIMAL_PREVIEW_COUNT) {
      var more = document.createElement('button');
      more.type = 'button';
      more.className = 'animal-option animal-option-more';
      more.dataset.animalMore = '1';
      more.innerHTML = '<span class="animal-more-glyph" aria-hidden="true">'
        + (animalPickerExpanded ? '&minus;' : '+') + '</span>'
        + '<span class="animal-option-name">'
        + escapeHtml(t(animalPickerExpanded ? 'animalLess' : 'animalMore'))
        + '</span>';
      frag.appendChild(more);
    }

    animalGrid.appendChild(frag);
    renderAnimalChoiceLine();
  }

  function refreshAnimalLabels() {
    if (!animalGrid || !Animals) return;
    renderAnimalPicker();
  }

  function setMyAnimal(id) {
    var next = myAnimal === id ? null : id; // tapping the chosen one clears it
    myAnimal = next;
    Animals.store(next);
    var options = document.querySelectorAll('#animalGrid .animal-option, #animalGateGrid .animal-option');
    for (var i = 0; i < options.length; i++) {
      var on = options[i].dataset.animal === next;
      options[i].classList.toggle('selected', on);
      options[i].setAttribute('aria-checked', on ? 'true' : 'false');
    }
    renderAnimalChoiceLine();
    renderMyFace();
    register(); // so the server has it even before the next search goes out
  }

  // --- The animal gate ------------------------------------------------------
  // The whole set, in a panel of its own, shown once before the first chat.
  // The picker on the start view holds seven back behind a "More" tile because
  // it is something to get past on the way to the button; here the choice is
  // the only thing on screen, so there is nothing to hold back.
  var animalGateGrid = $('animalGateGrid');
  function paintAnimalGate() {
    if (!animalGateGrid || !Animals) return;
    Animals.installSprite();
    animalGateGrid.innerHTML = '';
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
    animalGateGrid.appendChild(frag);
  }

  if (animalGrid) {
    animalGrid.addEventListener('click', function (ev) {
      var option = ev.target.closest('.animal-option');
      if (!option) return;
      vibrate(8);
      if (option.dataset.animalMore) {
        animalPickerExpanded = !animalPickerExpanded;
        renderAnimalPicker();
        return;
      }
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
      // This page is text only: it must not be rung or force-paired for a
      // voice call-back, which it has no way to answer.
      surface: 'chat',
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
      // The picture chosen in Settings > Profile, so /chat shows the same face.
      avatar: localStorage.getItem('talklive_avatar') || undefined,
      // Kept with every register, as the call app does, so the choice survives
      // a reconnect instead of quietly reverting to visible.
      hideStatus: localStorage.getItem('talklive_status_visible') === 'off',
      signedIn: !!sessionToken,
      freshSession: freshAppSession,
    });
    freshAppSession = false;
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

  function goSearch(firstTime, lead) {
    searching = true;
    partnerHere = false;
    if (games) games.reset();
    showView('search');
    startSearchLines(lead);
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
  var animalModal = $('animalModal');
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
  function openAnimalGate() {
    paintAnimalGate();
    openModal(animalModal);
  }
  function openRulesGate() {
    openModal(consentModal);
  }
  // The gate asks the question once; the answer may legitimately be "no
  // answer". `myGender` alone cannot tell those apart - '' is both "never
  // asked" and "prefer not to say" - so what is recorded here is that the
  // question has been put, not what came back.
  var GENDER_ASKED_KEY = 'talklive_gender_asked';
  function genderAnswered() {
    return !!myGender || localStorage.getItem(GENDER_ASKED_KEY) === 'yes';
  }

  // Gender, then the animal, then the rules. The animal sits in the middle
  // because it is the other half of "who is the person on the other end about
  // to meet" - and it is the half they actually see.
  function requestStart() {
    if (!genderAnswered()) { openGenderGate(); return; }
    if (!myAnimal && animalModal && Animals) { openAnimalGate(); return; }
    if (localStorage.getItem(CONSENT_KEY) !== 'yes') { openRulesGate(); return; }
    goSearch(true);
  }

  if (animalGateGrid) {
    animalGateGrid.addEventListener('click', function (ev) {
      var option = ev.target.closest('.animal-option');
      if (!option || !option.dataset.animal) return;
      vibrate(10);
      // Never a toggle here: this gate exists to end with one chosen, and
      // tapping the selected one to clear it would close it with none.
      if (myAnimal !== option.dataset.animal) setMyAnimal(option.dataset.animal);
      refreshAnimalLabels(); // the start view's picker wears it too
      // A beat so the tick is visibly on the one just tapped before the panel
      // swaps, rather than the tap appearing to skip past the question.
      setTimeout(function () {
        closeModal(animalModal);
        if (localStorage.getItem(CONSENT_KEY) === 'yes') goSearch(true);
        else openRulesGate();
      }, 180);
    });
  }

  // "Surprise me" - the same outcome as tapping one of the twenty, for
  // whoever does not care which. Same storage, same beat, same next step.
  var animalSurpriseBtn = $('animalSurpriseBtn');
  if (animalSurpriseBtn) {
    animalSurpriseBtn.addEventListener('click', function () {
      vibrate(10);
      setMyAnimal(Animals.random());
      refreshAnimalLabels();
      setTimeout(function () {
        closeModal(animalModal);
        if (localStorage.getItem(CONSENT_KEY) === 'yes') goSearch(true);
        else openRulesGate();
      }, 180);
    });
  }

  genderGateOptions.addEventListener('click', function (e) {
    var opt = e.target.closest('.gate-option');
    if (!opt) return;
    vibrate(10);
    myGender = opt.dataset.value;
    localStorage.setItem('talklive_gender', myGender);
    localStorage.setItem(GENDER_ASKED_KEY, 'yes'); // "prefer not to say" is an answer
    setGenderGateValue(myGender);
    // No register() here: every path out of this handler ends in goSearch(true),
    // which registers with the new gender itself.
    // A beat so the choice is visibly selected before the panel swaps, rather
    // than the tap appearing to skip straight past the question.
    setTimeout(function () {
      closeModal(genderModal);
      if (!myAnimal && animalModal && Animals) { openAnimalGate(); return; }
      if (localStorage.getItem(CONSENT_KEY) === 'yes') goSearch(true);
      else openRulesGate();
    }, 180);
  });

  consentBackBtn.addEventListener('click', function () {
    closeModal(consentModal);
    // Back goes to the step actually before this one, which is the animal
    // once there is a gender - sending it to the gender gate made Back skip
    // a screen and re-ask a question already answered.
    if (genderAnswered() && animalModal && Animals) openAnimalGate();
    else openGenderGate();
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
    if (myProfileSheet && myProfileSheet.classList.contains('open')) { closeMyProfile(); return; }
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
  // It used to skip touch devices on the grounds that the keyboard would leap
  // up over the conversation. It does not any more: on a chat you opened on
  // purpose, or a stranger who has just connected, typing is the entire next
  // thing you are going to do, and making everyone tap the box first was a
  // tap charged to every single message.
  //
  // What it will not do is take focus away from something else: if the person
  // is already typing somewhere, or a dialog is up over the top, the caret
  // stays where it is.
  function focusComposer(el) {
    if (!el || el.disabled) return;
    var active = document.activeElement;
    if (active && active !== document.body && active !== el
        && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) return;
    if (document.querySelector('.modal-overlay:not(.hidden)')) return;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (el.disabled) return;
        if (document.querySelector('.modal-overlay:not(.hidden)')) return;
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
    hideIcebreakers();
    return true;
  }

  // --- Break the ice --------------------------------------------------------
  // A new stranger and an empty box is where most chats die. A row of ready-made
  // questions (icebreakers.js) goes under the "you're now chatting with" line
  // and one tap sends it. It stands down once you have said something; the 💡
  // in the composer brings back a fresh batch at any point.
  var Icebreakers = window.TalkLiveIcebreakers || null;
  var icebreakBtn = $('icebreakBtn');
  var icebreakCard = null;
  if (icebreakBtn && !Icebreakers) icebreakBtn.classList.add('hidden');

  function hideIcebreakers() {
    if (icebreakCard && icebreakCard.parentNode) icebreakCard.parentNode.removeChild(icebreakCard);
    icebreakCard = null;
    if (icebreakBtn) icebreakBtn.classList.remove('on');
  }

  function fillIcebreakers(list) {
    list.innerHTML = '';
    Icebreakers.draw(5).forEach(function (q) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'icebreak-chip';
      var emoji = document.createElement('span');
      emoji.className = 'icebreak-emoji';
      emoji.setAttribute('aria-hidden', 'true');
      emoji.textContent = q.emoji;
      var text = document.createElement('span');
      text.textContent = q.text;
      chip.appendChild(emoji);
      chip.appendChild(text);
      chip.addEventListener('click', function () {
        vibrate(10);
        if (extras) extras.compose(q.text);
        else deliver({ text: q.text, id: null, replyTo: null });
      });
      list.appendChild(chip);
    });
  }

  function showIcebreakers() {
    if (!Icebreakers || !partnerHere) return;
    hideIcebreakers();
    var card = document.createElement('div');
    card.className = 'icebreak';
    var head = document.createElement('div');
    head.className = 'icebreak-head';
    var title = document.createElement('span');
    title.textContent = t('icebreakTitle');
    var shuffleBtn = document.createElement('button');
    shuffleBtn.type = 'button';
    shuffleBtn.className = 'icebreak-shuffle';
    shuffleBtn.textContent = '🔀 ' + t('icebreakShuffle');
    head.appendChild(title);
    head.appendChild(shuffleBtn);
    var list = document.createElement('div');
    list.className = 'icebreak-list';
    shuffleBtn.addEventListener('click', function () { vibrate(8); fillIcebreakers(list); });
    fillIcebreakers(list);
    card.appendChild(head);
    card.appendChild(list);
    msgs.appendChild(card);
    icebreakCard = card;
    if (icebreakBtn) icebreakBtn.classList.add('on');
    msgs.scrollTop = msgs.scrollHeight;
  }

  if (icebreakBtn) {
    icebreakBtn.addEventListener('click', function () {
      vibrate(8);
      if (icebreakCard) hideIcebreakers(); else showIcebreakers();
    });
  }

  // --- Leaving the app mid-chat ----------------------------------------------
  // Switching apps or locking the phone does not close the socket, and the
  // server only notices once the pings stop (up to ~85s) - so the stranger sat
  // typing into a chat nobody was reading. Say it as it happens instead: the
  // server relays 'chat-away' to them and ends the chat if this tab stays
  // hidden, and a page that is actually going away leaves outright.
  function reportAway() {
    if (partnerHere) socket.emit('chat-away', { away: document.visibilityState === 'hidden' });
  }
  document.addEventListener('visibilitychange', reportAway);
  // Separately, tell the server whether anyone is looking at this tab, so a
  // friend's message that lands while it is in the background also reaches
  // the phone's notification tray.
  function reportVisibility() {
    if (socket.connected) socket.emit('app-visibility', { hidden: document.visibilityState === 'hidden' });
  }
  document.addEventListener('visibilitychange', reportVisibility);
  window.addEventListener('pagehide', function () {
    if (partnerHere || searching) socket.emit('leave');
  });

  var awayLine = null;
  socket.on('partner-away', function (data) {
    if (!partnerHere) return;
    var name = (currentPartner && currentPartner.username) || t('stranger');
    if (data && data.away) {
      typingEl.classList.add('hidden');
      if (!awayLine || !awayLine.parentNode) awayLine = addMessage(' ', 'system system-warn');
      awayLine.textContent = t('chatPartnerAway', { name: name });
      msgs.scrollTop = msgs.scrollHeight;
    } else if (awayLine) {
      awayLine.textContent = t('chatPartnerBack', { name: name });
      awayLine.className = 'msg system';
      awayLine = null;
    }
  });

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
    // Say what actually happened once the server answers: it may have become a
    // friendship on the spot (they had asked too), or been refused.
    awaitingFriendResult = currentPartner.username;
  });
  var awaitingFriendResult = null;
  socket.on('friend-request-result', function (res) {
    if (!awaitingFriendResult || !res) return;
    var name = awaitingFriendResult;
    awaitingFriendResult = null;
    if (res.ok && res.accepted) addMessage(t('nowFriends'), 'system');
    else if (res.ok && res.alreadyFriends) addMessage(t('alreadyFriendsMsg'), 'system');
    else if (res.ok && res.pending) addMessage(t('friendReqPendingMsg'), 'system');
    else if (res.ok) addMessage(t('friendReqSentMsg', { name: name }), 'system');
    else {
      addFriendBtn.classList.remove('sent');
      addFriendBtn.disabled = false;
      addMessage(res.error || t('friendReqFailed'), 'system');
    }
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
    // The friend chat can be closed from anywhere (another panel opening,
    // Escape), not just its own button. Leaving the id set meant every later
    // message from that friend was marked read and counted nowhere - the
    // badge stayed empty for messages nobody had seen.
    if (panel === friendChatPanel) activeFriendChatId = null;
  }
  function closeAllPanels() {
    if (settingsPanel) closePanel(settingsPanel, settingsOverlay);
    closePanel(friendsPanel, friendsOverlay);
    closePanel(friendChatPanel, friendChatOverlay);
    closePanel(historyPanel, historyOverlay);
  }

  // --- Settings & profile: one of each, shared with the call app ---
  // The gear opens THE Settings panel - the same one the landing page and a
  // call open (public/settings-panel.js), same keys, same values. "All
  // settings" and your face go to the full Settings screen and your profile,
  // which live on the landing page.
  function leaveChatFor(url) {
    closeAllPanels();
    if (!partnerHere) { location.href = url; return; }
    askConfirm({
      title: t('leaveChatTitle'),
      text: t('leaveChatForSettings'),
      ok: t('leaveChatOk'),
      danger: false,
    }, function () { location.href = url; });
  }
  var settingsPanel = $('settingsPanel');
  var settingsOverlay = $('settingsPanelOverlay');
  var quickSettings = null;
  // Fetched when the page is idle (or on the first tap), not with the page
  // itself, which has a size budget to stay inside.
  var settingsPanelLoading = null;
  function loadSettingsPanel(done, failed) {
    if (window.TalkLiveSettingsPanel) { done(); return; }
    if (!settingsPanelLoading) {
      settingsPanelLoading = [];
      var s = document.createElement('script');
      s.src = '/settings-panel.js?v=20260924redesign';
      s.async = true;
      s.onload = function () {
        // Opens once settings.css (which the script injects) has arrived.
        window.TalkLiveSettingsPanel.ready.then(function () {
          var q = settingsPanelLoading; settingsPanelLoading = null; q.forEach(function (c) { c[0](); });
        });
      };
      s.onerror = function () { var q = settingsPanelLoading; settingsPanelLoading = null; q.forEach(function (c) { c[1](); }); };
      document.head.appendChild(s);
    }
    settingsPanelLoading.push([done, failed || function () {}]);
  }
  window.addEventListener('load', function () {
    var later = window.requestIdleCallback || function (fn) { setTimeout(fn, 1500); };
    later(function () {
      loadSettingsPanel(function () {});
      // The display-name rules only check a name before it is sent (the
      // server enforces them either way), so they can arrive late too.
      if (!window.TalkLiveNickname) {
        var n = document.createElement('script');
        n.src = '/nickname-rules.js?v=20260924nick';
        n.async = true;
        document.head.appendChild(n);
      }
    });
  });
  $('chatSettingsBtn').addEventListener('click', function () {
    vibrate(10);
    var wasOpen = settingsPanel.classList.contains('open');
    closeAllPanels();
    if (wasOpen) return;
    if (!window.TalkLiveSettingsPanel) {
      loadSettingsPanel(function () { $('chatSettingsBtn').click(); }, function () { leaveChatFor('/settings?from=chat'); });
      return;
    }
    if (!quickSettings && window.TalkLiveSettingsPanel) {
      quickSettings = window.TalkLiveSettingsPanel.mount($('quickSettings'), {
        profileFace: function (size) {
          return window.TalkLiveSocial ? window.TalkLiveSocial.face(localStorage.getItem('talklive_avatar'), size, myAnimal) : '';
        },
        profileName: function () { return accountNickname || tempUsername || (myProfile && myProfile.username) || ''; },
        profileSub: function () { return t(accountNickname ? 'settingsRowAccount' : 'settingsRowGuest'); },
        openProfile: function () { openMyProfile(); },
        openAll: function () { leaveChatFor('/settings?from=chat'); },
        saveName: function (value) {
          if (accountNickname) {
            // Signed in: the account owns the name.
            socket.emit('update-nickname', { nickname: value });
            return;
          }
          tempUsername = value;
          localStorage.setItem('talklive_tempname', value);
          register(); // so the server picks up the new display name
        },
        onGender: function (g) { myGender = g; register(); },
        onTheme: function (theme) { currentTheme = theme; },
        onSound: function (on) { soundEnabled = on; },
        onVibration: function (on) { vibrationEnabled = on; },
        onStatusVisible: function (on) { socket.emit('set-status-visibility', { hidden: !on }); },
        onMessageSeen: function (on) {
          messageSeenEnabled = on;
          syncSeenToggleUi();
          if (on && activeFriendChatId) socket.emit('chat-seen', { friendClientId: activeFriendChatId });
        },
        toast: function (msg) { socialToast(msg); },
      });
    }
    if (quickSettings) quickSettings.render();
    openPanel(settingsPanel, settingsOverlay);
  });
  $('settingsPanelClose').addEventListener('click', function () { closePanel(settingsPanel, settingsOverlay); });
  settingsOverlay.addEventListener('click', function () { closePanel(settingsPanel, settingsOverlay); });
  socket.on('update-nickname-result', function (res) {
    if (!res) return;
    if (!res.ok) { socialToast(res.errorKey ? t(res.errorKey) : (res.error || '')); return; }
    accountNickname = res.nickname;
    localStorage.setItem('talklive_nickname', res.nickname);
    if (quickSettings) quickSettings.render();
    register();
  });
  var myFaceBtn = $('myFaceBtn');
  function renderMyFace() {
    if (!myFaceBtn) return;
    var avatar = localStorage.getItem('talklive_avatar');
    myFaceBtn.innerHTML = '<span class="nav-account-avatar" aria-hidden="true">' +
      (window.TalkLiveSocial ? window.TalkLiveSocial.face(avatar, 30, myAnimal) : '') + '</span>';
  }
  renderMyFace();
  // Your face opens your profile in a sheet over whatever is on screen - the
  // chat and any call carry on underneath. Only "More profile settings" goes
  // to the landing page's full profile (and asks first mid-chat).
  var myProfileSheet = null;
  function closeMyProfile() {
    if (!myProfileSheet) return;
    myProfileSheet.classList.remove('open');
    setTimeout(function () { if (!myProfileSheet.classList.contains('open')) myProfileSheet.classList.remove('shown'); }, 280);
  }
  function openMyProfile() {
    closeAllPanels();
    if (!myProfileSheet) {
      myProfileSheet = document.createElement('div');
      myProfileSheet.className = 'my-profile';
      myProfileSheet.innerHTML =
        '<div class="my-profile-backdrop"></div>' +
        '<section class="my-profile-sheet" role="dialog" aria-modal="true" aria-labelledby="myProfileName" tabindex="-1">' +
          '<div class="my-profile-grab" aria-hidden="true"></div>' +
          '<button type="button" class="my-profile-close" data-act="close">&times;</button>' +
          '<div class="my-profile-face"></div><h2 id="myProfileName" class="my-profile-name"></h2><p class="my-profile-sub"></p>' +
          '<div class="my-profile-id"><span class="my-profile-id-label"></span><strong class="my-profile-id-value"></strong>' +
            '<button type="button" class="btn btn-secondary" data-act="copy"></button><button type="button" class="btn btn-primary" data-act="share"></button></div>' +
          '<div class="my-profile-actions"><button type="button" class="btn btn-secondary" data-act="edit"></button><button type="button" class="btn btn-secondary" data-act="more"></button></div>' +
        '</section>';
      document.body.appendChild(myProfileSheet);
      myProfileSheet.addEventListener('click', function (e) {
        if (e.target.classList.contains('my-profile-backdrop')) return closeMyProfile();
        var b = e.target.closest('[data-act]');
        var act = b && b.dataset.act;
        if (act === 'close') closeMyProfile();
        else if (act === 'copy') copyFriendIdBtn.click();
        else if (act === 'share') shareFriendIdBtn.click();
        else if (act === 'edit') { closeMyProfile(); $('chatSettingsBtn').click(); }
        else if (act === 'more') { closeMyProfile(); leaveChatFor('/?open=profile&from=chat'); }
      });
      // Drag it down to put it away, as a phone sheet does.
      var sheet = myProfileSheet.querySelector('.my-profile-sheet');
      var startY = null;
      var dy = 0;
      sheet.addEventListener('touchstart', function (e) { startY = e.touches[0].clientY; dy = 0; }, { passive: true });
      sheet.addEventListener('touchmove', function (e) {
        if (startY === null) return;
        dy = Math.max(0, e.touches[0].clientY - startY);
        sheet.style.transform = dy ? 'translateY(' + dy + 'px)' : '';
      }, { passive: true });
      sheet.addEventListener('touchend', function () {
        startY = null;
        sheet.style.transform = '';
        if (dy > 90) closeMyProfile();
      });
    }
    var q = function (s) { return myProfileSheet.querySelector(s); };
    q('.my-profile-face').innerHTML = window.TalkLiveSocial ? window.TalkLiveSocial.face(localStorage.getItem('talklive_avatar'), 84, myAnimal) : '';
    q('.my-profile-name').textContent = accountNickname || tempUsername || (myProfile && myProfile.username) || t('you');
    q('.my-profile-sub').textContent = t('friends') + ': ' + friendsState.friends.length;
    q('.my-profile-id-label').textContent = t('yourFriendId');
    q('.my-profile-id-value').textContent = myFriendId || '…';
    q('[data-act="copy"]').textContent = t('copyFriendId');
    q('[data-act="share"]').textContent = t('shareFriendId');
    q('[data-act="edit"]').textContent = t('settings');
    q('[data-act="more"]').textContent = t('moreProfileSettings');
    q('.my-profile-close').setAttribute('aria-label', t('close'));
    myProfileSheet.classList.add('shown');
    requestAnimationFrame(function () { requestAnimationFrame(function () { myProfileSheet.classList.add('open'); }); });
    try { q('.my-profile-sheet').focus({ preventScroll: true }); } catch (e) {}
  }
  if (myFaceBtn) {
    myFaceBtn.addEventListener('click', function () {
      vibrate(10);
      openMyProfile();
    });
  }
  // Back from /settings restores this page from the back/forward cache with
  // yesterday's preferences and a socket that was cut; start it fresh instead.
  window.addEventListener('pageshow', function (e) { if (e.persisted) location.reload(); });

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
  var historyState = []; // [{ clientId, username, countryCode, online, lastSeen, last, ts }]
  var typingFrom = {};   // clientId -> timeout, while they are typing to me

  function timeAgo(ts) {
    var sec = Math.floor((Date.now() - ts) / 1000);
    if (sec < 60) return t('justNow');
    var m = Math.floor(sec / 60);
    if (m < 60) return t('minAgo', { n: m });
    var h = Math.floor(m / 60);
    if (h < 24) return t('hourAgo', { n: h });
    return t('dayAgo', { n: Math.floor(h / 24) });
  }

  // "Online", "Last seen 5m ago", or plain offline for someone hiding status.
  function presenceText(p) {
    if (!p) return '';
    if (p.online) return t('online');
    if (p.lastSeen) return t('lastSeen', { time: timeAgo(p.lastSeen) });
    return t('offline');
  }

  function previewText(last) {
    if (!last) return '';
    var body = last.text || (last.gif ? t('gifMessage') : '');
    return last.mine ? t('youSaid', { text: body }) : body;
  }

  // The status line of a row: typing beats the last message, which beats
  // presence - the same order every messenger uses.
  function statusLine(p) {
    if (typingFrom[p.clientId]) return { text: t('friendTyping'), cls: ' is-typing' };
    var preview = previewText(p.last);
    if (preview) return { text: preview, cls: unreadCountFor(p.clientId) ? ' is-unread' : '' };
    return { text: presenceText(p), cls: '' };
  }

  function noteLastMessage(clientId, last) {
    [friendsState.friends, historyState].forEach(function (list) {
      list.forEach(function (p) { if (p.clientId === clientId) p.last = last; });
    });
  }

  function findPerson(clientId) {
    return friendsState.friends.filter(function (f) { return f.clientId === clientId; })[0]
      || historyState.filter(function (h) { return h.clientId === clientId; })[0]
      || null;
  }

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
    if (nickname && window.TalkLiveNickname) {
      var nick = window.TalkLiveNickname.check(nickname);
      if (!nick.ok) { socialToast(t(nick.error)); renameFriendInput.focus(); return; }
      nickname = nick.value;
    }
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
    commitRenameFriend(renameFriendInput.value.trim());
  });
  $('renameFriendResetBtn').addEventListener('click', function () { commitRenameFriend(''); });
  renameFriendInput.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    commitRenameFriend(renameFriendInput.value.trim());
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
        '<button type="button" class="tl-sent-avatar row-face" data-profile="' + escapeHtml(r.clientId) + '" aria-label="' + escapeHtml(t('openProfile')) + '">' + faceHtml(r, 30) + '</button>' +
        '<span class="tl-sent-text">' +
        '<span class="tl-sent-name">' + escapeHtml(r.username || '-') + ' ' + getFlagImg(r.countryCode, 14) + '</span>' +
        '</span>' +
        '<span class="tl-sent-chip">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/></svg>' +
        escapeHtml(t('pending')) + '</span>' +
        '<button type="button" class="tl-sent-cancel">' + escapeHtml(t('cancelRequest')) + '</button>';
      var cancelBtn = row.querySelector('.tl-sent-cancel');
      cancelBtn.setAttribute('aria-label', t('cancelFriendRequest'));
      cancelBtn.addEventListener('click', function () {
        cancelBtn.disabled = true;
        socket.emit('cancel-friend-request', { targetClientId: r.clientId });
      });
      sentRequestsList.appendChild(row);
    });
  }

  // The count where it can be seen with the tab in the background: its title,
  // and the installed app's icon.
  function showCountOutsidePage(count) {
    var base = document.title.replace(/^\(\d+\+?\)\s*/, '');
    var next = count > 0 ? '(' + (count > 99 ? '99+' : count) + ') ' + base : base;
    if (document.title !== next) document.title = next;
    try {
      if (count > 0 && navigator.setAppBadge) navigator.setAppBadge(count).catch(function () {});
      else if (!count && navigator.clearAppBadge) navigator.clearAppBadge().catch(function () {});
    } catch (e) { /* unsupported */ }
  }

  // A small, polite toast for social news. This page never said a word when a
  // request arrived, was accepted, or someone asked for a call - the only
  // trace was a number changing on a button.
  var socialToastEl = null;
  function socialToast(text) {
    if (!text) return;
    if (!socialToastEl) {
      socialToastEl = document.createElement('div');
      socialToastEl.className = 'social-toast';
      socialToastEl.setAttribute('role', 'status');
      socialToastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(socialToastEl);
    }
    socialToastEl.textContent = text;
    socialToastEl.classList.add('show');
    clearTimeout(socialToast._t);
    socialToast._t = setTimeout(function () { socialToastEl.classList.remove('show'); }, 3200);
  }

  function renderFriends() {
    // Header badge: pending requests + unread friend messages.
    var unread = friendsState.notifications.filter(function (n) { return n.type === 'message'; }).length;
    var badgeCount = friendsState.requests.length + unread;
    friendsBadge.textContent = badgeCount > 99 ? '99+' : String(badgeCount);
    friendsBadge.classList.toggle('hidden', badgeCount === 0);
    showCountOutsidePage(badgeCount);

    setTabCount(friendsTabCount, friendsState.friends.length);
    // Red means waiting on you, as in the call app. Requests this user sent
    // are waiting on someone else: listed below, never counted as an alert.
    setTabCount(requestsTabCount, friendsState.requests.length);
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
        '<button type="button" class="friend-avatar row-face" data-profile="' + escapeHtml(r.clientId) + '" aria-label="' + escapeHtml(t('openProfile')) + '">' + faceHtml(r, 30) + '</button>' +
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
    ensureFriendsSearch();
    if (!friendsState.friends.length) {
      // "during a call" is the call app's wording; here you add someone while
      // you are chatting with them.
      friendsList.innerHTML = '<p class="tl-empty">' + escapeHtml(t('noFriendsYetChat')) + '</p>';
      return;
    }
    // Pinned first, then unread, then who is here now, then the most recent
    // conversation - the same order as the call app.
    var lastTs = function (p) { return (p.last && p.last.ts) || 0; };
    var sorted = friendsState.friends.slice().sort(function (a, b) {
      return (Number(!!b.pinned) - Number(!!a.pinned))
        || (Number(unreadCountFor(b.clientId) > 0) - Number(unreadCountFor(a.clientId) > 0))
        || (Number(!!b.online) - Number(!!a.online))
        || (lastTs(b) - lastTs(a));
    });
    if (friendsFilter) {
      sorted = sorted.filter(function (f) {
        return [friendLabel(f), f.username].some(function (x) { return String(x || '').toLowerCase().indexOf(friendsFilter) !== -1; });
      });
      if (!sorted.length) {
        friendsList.innerHTML = '<p class="tl-empty">' + escapeHtml(t('noFriendsMatch')) + '</p>';
        return;
      }
    }
    sorted.forEach(function (f) {
      var row = document.createElement('div');
      row.className = 'friend-row';
      var unreadN = unreadCountFor(f.clientId);
      var line = statusLine(f);
      row.innerHTML =
        '<button type="button" class="friend-avatar row-face" data-profile="' + escapeHtml(f.clientId) + '" aria-label="' + escapeHtml(t('openProfile')) + '">' + faceHtml(f, 30) + '</button>' +
        '<span class="friend-main"><span class="friend-name">' + escapeHtml(friendLabel(f) || '-') + ' ' + getFlagImg(f.countryCode, 14) +
        (f.pinned ? '<span class="row-flag" aria-label="' + escapeHtml(t('unpinFriend')) + '">' + PIN_ICON + '</span>' : '') +
        (mutedChats.indexOf(f.clientId) !== -1 ? '<span class="row-flag">' + MUTE_ON + '</span>' : '') + '</span>' +
        '<span class="friend-status' + (f.online ? '' : ' is-offline') + line.cls + '"><span class="online-dot"></span><span class="friend-status-text">' + escapeHtml(line.text) + '</span></span></span>' +
        '<span class="friend-actions">' +
        '<button type="button" class="mini-btn" data-act="chat" title="' + escapeHtml(t('chat')) + '" aria-label="' + escapeHtml(t('chat')) + '"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>' +
        (unreadN ? '<span class="notif-badge">' + unreadN + '</span>' : '') + '</button>' +
        '<button type="button" class="mini-btn mini-call" data-act="call" title="' + escapeHtml(t('callBack')) + '" aria-label="' + escapeHtml(t('callBack')) + '">' + ICON.call + '</button>' +
        '</span>';
      row.querySelector('[data-act="chat"]').addEventListener('click', function () { openFriendChat(f); });
      row.querySelector('[data-act="call"]').addEventListener('click', function () { profileAction('call', f.clientId); });
      row.querySelector('.friend-main').addEventListener('click', function () { openFriendChat(f); });
      friendsList.appendChild(row);
    });
  }

  var PIN_ICON = '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M15 3l6 6-3 1-4 4 .5 4.5L13 20l-3.5-3.5L4 22l-.5-.5L9 16l-3.5-3.5L7 11l4.5.5 4-4z"/></svg>';
  // Filter box, once the list is long enough to need one (as in the call app).
  var friendsFilter = '';
  var friendsSearch = null;
  function ensureFriendsSearch() {
    var need = friendsState.friends.length >= 6;
    if (!friendsSearch && need) {
      var wrap = document.createElement('div');
      wrap.className = 'friends-search';
      friendsSearch = document.createElement('input');
      friendsSearch.type = 'search';
      friendsSearch.className = 'friends-search-input';
      friendsSearch.maxLength = 40;
      friendsSearch.autocomplete = 'off';
      friendsSearch.addEventListener('input', function () {
        friendsFilter = friendsSearch.value.trim().toLowerCase();
        renderFriends();
      });
      wrap.appendChild(friendsSearch);
      friendsList.parentNode.insertBefore(wrap, friendsList);
    }
    if (!friendsSearch) return;
    friendsSearch.placeholder = t('searchFriends');
    friendsSearch.setAttribute('aria-label', t('searchFriends'));
    friendsSearch.parentNode.classList.toggle('hidden', !need);
    if (!need && friendsFilter) { friendsFilter = ''; friendsSearch.value = ''; }
  }

  // Any face in the friends, requests and history lists opens that profile.
  document.addEventListener('click', function (e) {
    var face = e.target.closest && e.target.closest('.row-face[data-profile]');
    if (!face) return;
    e.stopPropagation();
    openProfile(face.dataset.profile);
  });

  var mutedChats = [];
  // People this user blocked, and the way back: unblocking a friend brings
  // them back with the whole conversation (the call app lists these in
  // Settings; this page has no Settings of its own for it).
  var blockedState = [];
  var blockedWrap = null;
  function renderBlocked() {
    if (!blockedWrap) {
      blockedWrap = document.createElement('details');
      blockedWrap.className = 'blocked-section';
      blockedWrap.innerHTML = '<summary></summary><div class="blocked-list"></div>';
      requestsTabPanel.appendChild(blockedWrap);
      blockedWrap.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-unblock]');
        if (!btn) return;
        var b = blockedState.filter(function (x) { return x.clientId === btn.dataset.unblock; })[0];
        if (!b) return;
        var name = b.username || t('someone');
        askConfirm({
          title: t('unblock'),
          text: t(b.wasFriend ? 'confirmUnblockFriend' : 'confirmUnblock', { name: name }),
          ok: t('unblock'),
          danger: false,
        }, function () {
          socket.emit('unblock-user', { targetClientId: b.clientId });
          blockedState = blockedState.filter(function (x) { return x.clientId !== b.clientId; });
          renderBlocked();
          socialToast(t(b.wasFriend ? 'unblockedFriend' : 'unblocked', { name: name }));
        });
      });
    }
    blockedWrap.querySelector('summary').textContent = t('blockedPeople') + (blockedState.length ? ' (' + blockedState.length + ')' : '');
    var list = blockedWrap.querySelector('.blocked-list');
    if (!blockedState.length) {
      list.innerHTML = '<p class="tl-empty">' + escapeHtml(t('noBlockedPeople')) + '</p>';
      return;
    }
    list.innerHTML = blockedState.map(function (b) {
      return '<div class="friend-row"><span class="friend-avatar">' + faceHtml(b, 30) + '</span>' +
        '<span class="friend-main"><span class="friend-name">' + escapeHtml(b.username || t('someone')) + ' ' + getFlagImg(b.countryCode, 14) + '</span></span>' +
        '<span class="friend-actions"><button type="button" class="btn btn-secondary btn-sm" data-unblock="' + escapeHtml(b.clientId) + '">' + escapeHtml(t('unblock')) + '</button></span></div>';
    }).join('');
  }

  socket.on('state-sync', function (data) {
    data = data || {};
    friendsState.friends = data.friends || [];
    friendsState.requests = data.friendRequests || [];
    friendsState.sent = data.sentRequests || [];
    friendsState.notifications = data.notifications || [];
    historyState = data.chatHistory || [];
    mutedChats = data.muted || [];
    blockedState = data.blocked || [];
    renderFriends();
    renderHistory();
    renderFriendChatStatus();
    renderBlocked();
    if (activeFriendChatId) renderChatHeadTools();
    if (profileId) {
      // Blocked from elsewhere: nothing left to act on.
      if (blockedState.some(function (b) { return b.clientId === profileId; })) closeProfile();
      else renderProfile();
    }
    if (friendIdFound) renderFriendIdResult();
  });

  // --- Public friend ID (same card as the call app's friends panel) --------
  var myFriendIdEl = $('myFriendId');
  var myFriendIdNote = $('myFriendIdNote');
  var copyFriendIdBtn = $('copyFriendIdBtn');
  var shareFriendIdBtn = $('shareFriendIdBtn');
  var friendIdSearchForm = $('friendIdSearchForm');
  var friendIdSearchInput = $('friendIdSearchInput');
  var friendIdResult = $('friendIdResult');
  var myFriendId = '';
  var friendIdFound = null;
  var friendIdAddPending = false;

  function friendIdNotice(text) {
    friendIdFound = null;
    friendIdResult.classList.remove('hidden');
    friendIdResult.classList.add('is-error');
    friendIdResult.textContent = text || '';
  }

  socket.on('friend-id', function (data) {
    if (!data || typeof data.friendId !== 'string' || !data.friendId) return;
    myFriendId = data.friendId;
    myFriendIdEl.textContent = data.friendId;
    if (myProfileSheet) myProfileSheet.querySelector('.my-profile-id-value').textContent = data.friendId;
    myFriendIdNote.classList.toggle('hidden', !data.temporary);
    copyFriendIdBtn.disabled = false;
    shareFriendIdBtn.disabled = false;
    renderIdEdit(!!data.editable);
  });

  // An account's ID ("asad#1234") is its own to change, to any ID nobody else
  // has - the same control as the call app's Profile.
  var idEdit = null;
  function renderIdEdit(editable) {
    if (!editable) { if (idEdit) idEdit.classList.add('hidden'); return; }
    if (!idEdit) {
      idEdit = document.createElement('form');
      idEdit.className = 'friend-id-search id-edit';
      idEdit.setAttribute('autocomplete', 'off');
      idEdit.innerHTML = '<input type="text" maxlength="21" spellcheck="false" autocapitalize="none" placeholder="name#1234">' +
        '<button type="submit" class="btn btn-secondary"></button><p class="id-edit-note"></p>';
      var card = myFriendIdEl.closest('.friend-id-card');
      card.insertBefore(idEdit, friendIdSearchForm);
      if (window.TalkLiveSocial) window.TalkLiveSocial.maskIdInput(idEdit.querySelector('input'));
      idEdit.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = idEdit.querySelector('input').value.trim();
        if (!v || v.toLowerCase() === myFriendId.toLowerCase()) return;
        if (!socket.connected) { idEditError(t('errNoConnection')); return; }
        idEdit.querySelector('button').disabled = true;
        socket.emit('set-handle', { handle: v });
        clearTimeout(idEditTimer);
        idEditTimer = setTimeout(function () { idEditError(t('errNoServerReply')); }, 10000);
      });
    }
    idEdit.classList.remove('hidden');
    var input = idEdit.querySelector('input');
    if (document.activeElement !== input) input.value = myFriendId;
    input.setAttribute('aria-label', t('yourFriendId'));
    idEdit.querySelector('button').textContent = t('saveId');
    idEdit.querySelector('button').disabled = false;
    var note = idEdit.querySelector('.id-edit-note');
    note.classList.remove('is-error');
    note.textContent = t('idHint');
  }
  // A lost reply used to leave the button greyed out with no word why.
  var idEditTimer = null;
  function idEditError(text) {
    clearTimeout(idEditTimer);
    if (!idEdit) return;
    var note = idEdit.querySelector('.id-edit-note');
    idEdit.querySelector('button').disabled = false;
    note.classList.add('is-error');
    note.textContent = text;
  }
  socket.on('set-handle-result', function (r) {
    clearTimeout(idEditTimer);
    if (!idEdit || !r) return;
    idEdit.querySelector('button').disabled = false;
    if (r.ok) {
      if (!r.unchanged) socialToast(t('idSaved', { id: r.friendId }));
      return;
    }
    idEditError(r.error || '');
  });

  function copyText(text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { window.prompt('', text); });
    } else {
      window.prompt('', text);
    }
  }

  copyFriendIdBtn.addEventListener('click', function () {
    if (!myFriendId) return;
    copyText(myFriendId, function () { friendIdNotice(t('friendIdCopied')); });
  });

  shareFriendIdBtn.addEventListener('click', function () {
    if (!myFriendId) return;
    var url = location.origin + '/add/' + encodeURIComponent(myFriendId);
    var text = t('friendIdShareText', { id: myFriendId });
    var fallback = function () { copyText(text + ' ' + url, function () { friendIdNotice(t('friendIdLinkCopied')); }); };
    if (navigator.share) {
      navigator.share({ title: 'TalkLive', text: text, url: url }).catch(function (e) {
        if (!e || e.name !== 'AbortError') fallback();
      });
    } else {
      fallback();
    }
  });

  friendIdSearchForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var query = friendIdSearchInput.value.trim();
    if (!query) return friendIdSearchInput.focus();
    socket.emit('find-by-friend-id', { friendId: query });
  });

  function friendIdRelation(clientId) {
    var has = function (list) { return list.some(function (p) { return p.clientId === clientId; }); };
    if (has(friendsState.friends)) return 'friend';
    if (has(friendsState.requests)) return 'incoming';
    if (has(friendsState.sent)) return 'pending';
    return 'stranger';
  }

  function renderFriendIdResult() {
    var user = friendIdFound;
    if (!user) return;
    var relation = friendIdRelation(user.clientId);
    // Same actions as on the main app: someone who already asked gets Accept
    // (it used to offer a second "Add friend"), a request you sent can be
    // taken back.
    var btn = function (act, cls, key) {
      return '<button type="button" class="btn ' + cls + '" data-act="' + act + '">' + escapeHtml(t(key)) + '</button>';
    };
    var action = relation === 'friend' ? btn('chat', 'btn-secondary', 'message')
      : relation === 'incoming' ? btn('accept', 'btn-primary', 'acceptRequest')
        : relation === 'pending' ? btn('cancel', 'btn-secondary', 'cancelRequest')
          : btn('add', 'btn-primary', 'addFriend');
    var status = relation === 'friend' ? t('profileRelation_friend')
      : relation === 'pending' ? t('profileRelation_pending')
        : relation === 'incoming' ? t('profileRelation_incoming') : '';
    var sub = [user.friendId, status, user.temporary ? t('friendIdGuest') : '', user.online ? t('online') : '']
      .filter(Boolean).join(' · ');
    friendIdResult.classList.remove('hidden', 'is-error');
    friendIdResult.innerHTML = '<span class="friend-id-result-who"><strong>' + getFlagImg(user.countryCode) + ' '
      + escapeHtml(user.username) + '</strong><small>' + escapeHtml(sub) + '</small></span>' + action;
  }

  socket.on('find-by-friend-id-result', function (res) {
    if (!res || !res.ok || !res.user) return friendIdNotice((res && res.error) || '');
    friendIdFound = res.user;
    renderFriendIdResult();
  });

  friendIdResult.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-act]');
    if (!btn || !friendIdFound) return;
    if (btn.dataset.act === 'chat') {
      var friend = friendsState.friends.filter(function (f) { return f.clientId === friendIdFound.clientId; })[0];
      if (friend) openFriendChat(friend);
      return;
    }
    btn.disabled = true;
    if (btn.dataset.act === 'accept') {
      socket.emit('friend-request-respond', { fromClientId: friendIdFound.clientId, accept: true });
      return;
    }
    if (btn.dataset.act === 'cancel') {
      socket.emit('cancel-friend-request', { targetClientId: friendIdFound.clientId });
      return;
    }
    friendIdAddPending = true;
    socket.emit('friend-request', { targetClientId: friendIdFound.clientId, friendId: friendIdFound.friendId });
  });

  socket.on('friend-request-result', function (res) {
    if (!friendIdAddPending || !friendIdFound) return;
    friendIdAddPending = false;
    if (res && !res.ok && res.error) {
      renderFriendIdResult();
      var note = document.createElement('small');
      note.className = 'friend-id-note';
      note.textContent = res.error;
      friendIdResult.querySelector('.friend-id-result-who').appendChild(note);
      return;
    }
    renderFriendIdResult();
  });
  // Live badge updates: message notifications arrive alone (friend-request
  // ones come with a full state-sync), so track them locally too.
  socket.on('notification', function (n) {
    if (!n) return;
    if (n.type === 'message' && friendChatOnScreen(n.fromClientId)) return; // already reading it
    friendsState.notifications.push(n);
    var who = friendLabel(findPerson(n.fromClientId || n.byClientId)) || n.username || t('someone');
    // A conversation muted on either page stays quiet on both.
    if (n.type === 'message') { if (mutedChats.indexOf(n.fromClientId) === -1) { soundReceive(); vibrate(20); } }
    else if (n.type === 'friend_request' || n.type === 'friend_accepted') vibrate([20, 40, 20]);
    if (n.type === 'friend_request') socialToast(t('notifWantsFriends', { name: who }));
    else if (n.type === 'friend_accepted') socialToast(t('notifAccepted', { name: who }));
    else if (n.type === 'call_back_request') socialToast(t('callbackOnVoice', { name: who }));
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

  // A friend you renamed reads by that name here too.
  function historyLabel(h) {
    var f = friendsState.friends.filter(function (x) { return x.clientId === h.clientId; })[0];
    return friendLabel(f) || h.username || '';
  }

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
      var line = statusLine(h);
      row.innerHTML =
        '<button type="button" class="friend-avatar row-face" data-profile="' + escapeHtml(h.clientId) + '" aria-label="' + escapeHtml(t('openProfile')) + '">' + faceHtml(h, 30) + '</button>' +
        '<span class="friend-main"><span class="friend-name">' + escapeHtml(historyLabel(h) || '-') + ' ' + getFlagImg(h.countryCode, 14) + '</span>' +
        '<span class="friend-status' + (h.online ? '' : ' is-offline') + line.cls + '"><span class="online-dot"></span><span class="friend-status-text">' + escapeHtml(line.text) + '</span></span></span>' +
        '<span class="friend-actions">' +
        '<button type="button" class="mini-btn" data-act="chat" title="' + escapeHtml(t('messageBack')) + '" aria-label="' + escapeHtml(t('messageBack')) + '"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>' +
        (unreadN ? '<span class="notif-badge">' + unreadN + '</span>' : '') + '</button>' +
        '<button type="button" class="mini-btn mini-call" data-act="call" title="' + escapeHtml(t('callBack')) + '" aria-label="' + escapeHtml(t('callBack')) + '">' + ICON.call + '</button>' +
        '</span>';
      row.querySelector('[data-act="call"]').addEventListener('click', function () { profileAction('call', h.clientId); });
      var openIt = function () { openFriendChat({ clientId: h.clientId, username: h.username }); };
      row.querySelector('[data-act="chat"]').addEventListener('click', openIt);
      row.querySelector('.friend-main').addEventListener('click', openIt);
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
    // Only while my message is the newest: after their reply the label would
    // sit under their bubble, and the reply already says it was read.
    var all = friendChatMsgs.querySelectorAll('.msg');
    var last = all[all.length - 1];
    if (!last || !last.classList.contains('me')) return;
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
    if (meta && meta.id) el.dataset.cxId = meta.id;
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
    send: function (payload) { return sendFriendMessage(payload); },
    react: function (id, emoji, on) {
      if (!activeFriendChatId) return;
      socket.emit('friend-reaction', { toClientId: activeFriendChatId, id: id, emoji: emoji, on: on });
    },
    unsend: function (id) {
      if (activeFriendChatId) socket.emit('friend-message-delete', { toClientId: activeFriendChatId, id: id });
    },
  }) : null;

  // --- Sending: shown at once, settled by the server -------------------------
  // A direct message appears the instant it is sent, faded while on its way,
  // and is settled by 'friend-message-sent'. One that never gets there is
  // marked "Not sent" with a retry instead of vanishing, and anything still
  // waiting goes again once the socket registers (the server stores an id once).
  var friendOutbox = {}; // id -> { toClientId, payload, tries, timer }
  var FRIEND_SEND_TIMEOUT_MS = 12000;
  var FRIEND_SEND_MAX_TRIES = 5;
  var friendDrafts = {}; // clientId -> unsent text

  function msgNode(id) {
    if (!id) return null;
    return friendChatMsgs.querySelector('[data-cx-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
  }
  function paintOutboxState(id, state) {
    var node = msgNode(id);
    if (!node) return;
    node.classList.toggle('is-pending', state === 'pending');
    node.classList.toggle('is-failed', state === 'failed');
    var retry = node.nextElementSibling;
    if (retry && retry.classList.contains('msg-retry')) retry.remove();
    if (state === 'failed') {
      retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'msg-retry';
      retry.setAttribute('data-retry-id', id);
      retry.textContent = t('msgNotSentRetry');
      node.parentNode.insertBefore(retry, node.nextSibling);
    }
  }
  function emitOutbox(id) {
    var entry = friendOutbox[id];
    if (!entry) return;
    entry.tries += 1;
    entry.failed = false;
    clearTimeout(entry.timer);
    entry.timer = setTimeout(function () {
      if (!friendOutbox[id]) return;
      friendOutbox[id].failed = true;
      paintOutboxState(id, 'failed');
    }, FRIEND_SEND_TIMEOUT_MS);
    var wire = { toClientId: entry.toClientId };
    for (var k in entry.payload) wire[k] = entry.payload[k];
    socket.emit('friend-message', wire);
  }
  function retryFriendMessage(id) {
    if (!friendOutbox[id]) return;
    friendOutbox[id].tries = 0;
    paintOutboxState(id, 'pending');
    emitOutbox(id);
  }
  function settleFriendMessage(id) {
    var entry = friendOutbox[id];
    if (!entry) return;
    clearTimeout(entry.timer);
    delete friendOutbox[id];
    paintOutboxState(id, 'sent');
  }
  // Refused for good: take the bubble back and give the text back to the
  // composer, so a link or a typo can be fixed rather than retyped.
  function dropFriendMessage(id) {
    var entry = friendOutbox[id];
    if (!entry) return;
    clearTimeout(entry.timer);
    delete friendOutbox[id];
    var node = msgNode(id);
    if (node) {
      var retry = node.nextElementSibling;
      if (retry && retry.classList.contains('msg-retry')) retry.remove();
      if (friendExtras) friendExtras.forget(id);
      node.remove();
    }
    if (entry.toClientId === activeFriendChatId && !friendChatInput.value && entry.payload.text) {
      friendChatInput.value = entry.payload.text;
      friendDrafts[entry.toClientId] = entry.payload.text;
    }
  }
  friendChatMsgs.addEventListener('click', function (e) {
    var retry = e.target.closest && e.target.closest('.msg-retry');
    if (retry) retryFriendMessage(retry.getAttribute('data-retry-id'));
  });

  function sendFriendMessage(payload) {
    var toClientId = activeFriendChatId;
    var text = (payload.text || '').slice(0, 1000);
    if (!toClientId || (!text && !payload.gif)) return false;
    if (text && LINK_RE.test(text)) { friendSystemNote(t('chatLinkBlocked')); return false; }
    if (text && UNSAFE_RE.test(text)) { friendSystemNote(t('errUnsafeMessage')); return false; }
    var id = payload.id || ('m' + Math.random().toString(36).slice(2, 10));
    var wire = { text: text, id: id, replyTo: payload.replyTo || null, gif: payload.gif || null };
    var ts = Date.now();
    appendFriendMsg(text, 'me', { id: id, replyTo: wire.replyTo, gif: wire.gif, ts: ts });
    paintOutboxState(id, 'pending');
    friendOutbox[id] = { toClientId: toClientId, payload: wire, tries: 0, timer: null };
    delete friendDrafts[toClientId];
    noteLastMessage(toClientId, { id: id, mine: true, text: text, gif: !!wire.gif, ts: ts });
    renderFriends();
    renderHistory();
    emitOutbox(id);
    return true;
  }

  function friendSystemNote(text) {
    var el = document.createElement('div');
    el.className = 'msg system';
    el.textContent = text;
    friendChatMsgs.appendChild(el);
    friendChatMsgs.scrollTop = friendChatMsgs.scrollHeight;
  }

  // Whether this conversation is in front of the user: open, in a tab being
  // looked at. A chat left open in a background tab used to send "Seen" for
  // messages nobody had read.
  function friendChatOnScreen(clientId) {
    return !!clientId && clientId === activeFriendChatId
      && friendChatPanel.classList.contains('open')
      && document.visibilityState === 'visible';
  }
  function markActiveChatRead(always) {
    var id = activeFriendChatId;
    if (!friendChatOnScreen(id)) return;
    var unread = friendsState.notifications.some(function (n) {
      return n.type === 'message' && n.fromClientId === id;
    });
    if (!always && !unread) return;
    socket.emit('mark-messages-read', { friendClientId: id });
    if (messageSeenEnabled) socket.emit('chat-seen', { friendClientId: id });
    if (unread) {
      friendsState.notifications = friendsState.notifications.filter(function (n) {
        return !(n.type === 'message' && n.fromClientId === id);
      });
      renderFriends();
      renderHistory();
    }
  }
  document.addEventListener('visibilitychange', function () { markActiveChatRead(false); });

  // --- Header status: typing / online / last seen --------------------------
  var friendChatStatus = $('friendChatStatus');
  function renderFriendChatStatus() {
    if (!friendChatStatus) return;
    var id = activeFriendChatId;
    var typing = !!(id && typingFrom[id]);
    var person = id ? findPerson(id) : null;
    friendChatStatus.textContent = typing ? t('friendTyping') : presenceText(person);
    friendChatStatus.classList.toggle('is-online', !typing && !!(person && person.online));
    friendChatStatus.classList.toggle('is-typing', typing);
  }

  function setTyping(clientId, on) {
    clearTimeout(typingFrom[clientId]);
    if (on) typingFrom[clientId] = setTimeout(function () { setTyping(clientId, false); }, 4000);
    else delete typingFrom[clientId];
    renderFriendChatStatus();
    renderFriends();
    renderHistory();
  }
  socket.on('friend-typing', function (data) {
    if (data && data.fromClientId) setTyping(data.fromClientId, true);
  });
  var friendTypingAt = 0;
  friendChatInput.addEventListener('input', function () {
    if (activeFriendChatId) {
      if (friendChatInput.value.trim()) friendDrafts[activeFriendChatId] = friendChatInput.value;
      else delete friendDrafts[activeFriendChatId];
    }
    if (!activeFriendChatId || !friendChatInput.value) return;
    var now = Date.now();
    if (now - friendTypingAt < 2000) return;
    friendTypingAt = now;
    socket.emit('friend-typing', { toClientId: activeFriendChatId });
  });

  socket.on('friend-message-deleted', function (data) {
    if (!data || !data.chatWith) return;
    var p = findPerson(data.chatWith);
    if (p && p.last && p.last.id === data.id) noteLastMessage(data.chatWith, null);
    if (data.chatWith === activeFriendChatId) {
      var node = friendChatMsgs.querySelector('[data-cx-id="' + (window.CSS && CSS.escape ? CSS.escape(data.id) : data.id) + '"]');
      if (friendExtras) friendExtras.forget(data.id);
      if (node) node.remove();
      renderSeenLabel();
    }
    renderFriends();
    renderHistory();
  });

  function openFriendChat(friend) {
    activeFriendChatId = friend.clientId;
    // Each conversation keeps its own unsent text: it used to stay in the box
    // when another chat was opened, and went to the wrong person.
    friendChatInput.value = friendDrafts[friend.clientId] || '';
    // Just their name in the header, as a messenger shows it.
    $('friendChatTitle').textContent = friendLabel(friend) || t('chat');
    renderChatHeadTools();
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
    renderFriendChatStatus();
    focusComposer(friendChatInput);
  }
  function closeFriendChat() {
    activeFriendChatId = null;
    closePanel(friendChatPanel, friendChatOverlay);
  }
  $('friendChatCloseBtn').addEventListener('click', closeFriendChat);

  // Two taps, like Remove: blocking ends the friendship and the conversation
  // for good (until unblocked from the call app's Settings > Privacy).
  var friendChatBlockBtn = $('friendChatBlockBtn');
  var Social = window.TalkLiveSocial;
  function faceHtml(p, size) {
    p = p || {};
    return Social ? Social.face(p.avatar, size, p.animal) : '';
  }

  // One confirmation dialog for everything that is hard to take back in the
  // moment - block, remove, report, unblock. Built on first use, and raised
  // above the side panels it is usually opened from.
  var confirmBox = null;
  var confirmCb = null;
  function askConfirm(o, onOk) {
    if (!confirmBox) {
      confirmBox = document.createElement('div');
      confirmBox.className = 'modal-overlay modal-top hidden';
      confirmBox.innerHTML =
        '<div class="modal-box" role="alertdialog" aria-modal="true" aria-labelledby="askTitle" aria-describedby="askText">' +
          '<div class="modal-header"><h2 id="askTitle"></h2>' +
          '<button type="button" class="modal-close" data-act="cancel">&times;</button></div>' +
          '<div class="modal-body"><p id="askText"></p>' +
          '<div class="modal-actions">' +
            '<button type="button" class="btn btn-secondary" data-act="cancel"></button>' +
            '<button type="button" class="btn" data-act="ok"></button>' +
          '</div></div></div>';
      document.body.appendChild(confirmBox);
      confirmBox.addEventListener('click', function (e) {
        // A tap on the dim backdrop counts as Cancel.
        var btn = e.target.closest('[data-act]');
        var act = e.target === confirmBox ? 'cancel' : (btn && btn.dataset.act);
        if (!act) return;
        closeModal(confirmBox);
        var cb = confirmCb;
        confirmCb = null;
        if (act === 'ok' && cb) cb();
      });
    }
    confirmCb = onOk;
    $('askTitle').textContent = o.title;
    $('askText').textContent = o.text;
    confirmBox.querySelector('.modal-close').setAttribute('aria-label', t('cancel'));
    confirmBox.querySelector('[data-act="cancel"].btn').textContent = t('cancel');
    var ok = confirmBox.querySelector('[data-act="ok"]');
    ok.textContent = o.ok;
    ok.className = 'btn ' + (o.danger === false ? 'btn-primary' : 'btn-danger');
    openModal(confirmBox);
    vibrate(15);
    confirmBox.querySelector('.btn-secondary').focus();
  }

  // Whoever this page knows as `clientId`, from the freshest list that has them.
  function personFor(clientId) {
    var pick = function (list) { return list.filter(function (x) { return x.clientId === clientId; })[0]; };
    var live = currentPartner && currentPartner.clientId === clientId
      ? { clientId: clientId, username: currentPartner.username, countryCode: currentPartner.countryCode, animal: currentPartner.animal }
      : null;
    var hit = pick(friendsState.friends) || pick(friendsState.requests) || pick(friendsState.sent) || pick(historyState);
    if (hit && live) return Object.assign({}, live, hit);
    return hit || live || { clientId: clientId };
  }
  function relationOf(clientId) {
    var has = function (list) { return list.some(function (x) { return x.clientId === clientId; }); };
    if (has(friendsState.friends)) return 'friend';
    if (has(friendsState.requests)) return 'incoming';
    if (has(friendsState.sent)) return 'pending';
    return 'stranger';
  }
  function isLivePartner(clientId) {
    return !!(partnerHere && currentPartner && currentPartner.clientId === clientId);
  }
  function canCall(clientId) {
    return relationOf(clientId) === 'friend' || historyState.some(function (h) { return h.clientId === clientId; });
  }

  function openBlockConfirm(target) {
    var p = personFor(target);
    var name = friendLabel(p) || p.username || t('someone');
    askConfirm({
      title: t('blockNamed', { name: name }),
      text: t(relationOf(target) === 'friend' ? 'confirmBlockFriend' : 'confirmBlockUser'),
      ok: t('block'),
    }, function () { doBlock(target); });
  }
  function doBlock(target) {
    // Blocking the stranger in the live chat ends that chat too.
    if (partnerHere && currentPartner && currentPartner.clientId === target) {
      socket.emit('leave');
      onPartnerLeft({ reason: 'blocked' });
    }
    socket.emit('block-friend', { friendClientId: target });
    if (activeFriendChatId === target) closeFriendChat();
    closeProfile();
    socialToast(t('userBlocked'));
  }
  if (friendChatBlockBtn) {
    friendChatBlockBtn.addEventListener('click', function () {
      if (activeFriendChatId) openBlockConfirm(activeFriendChatId);
    });
  }

  // --- Profile sheet --------------------------------------------------------
  // The same sheet the call app has: who someone is, where you stand with
  // them, and every action - message, call, add, rename, pin, mute, remove,
  // report, block. Opened by tapping anyone's face or name, anywhere.
  var profileBox = null;
  var profileId = null;
  var ICON = {
    chat: '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>',
    call: '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>',
  };
  function psBtn(act, label, cls, icon) {
    return '<button type="button" class="btn ' + (cls || 'btn-secondary') + '" data-act="' + act + '">' + (icon || '') + '<span>' + escapeHtml(label) + '</span></button>';
  }
  function closeProfile() {
    if (profileBox) closeModal(profileBox);
    profileId = null;
  }
  function openProfile(clientId) {
    if (!clientId) return;
    if (!profileBox) {
      profileBox = document.createElement('div');
      profileBox.className = 'modal-overlay modal-top hidden';
      profileBox.innerHTML =
        '<div class="modal-box profile-sheet" role="dialog" aria-modal="true" aria-labelledby="psName">' +
          '<div class="modal-header"><span></span><button type="button" class="modal-close" data-act="close">&times;</button></div>' +
          '<div class="modal-body"><div class="ps-face"></div><h2 id="psName" class="ps-name"></h2>' +
          '<p class="ps-id hidden"></p><p class="ps-real hidden"></p><p class="ps-status"></p>' +
          '<div class="ps-row ps-main"></div><div class="ps-row ps-manage"></div><div class="ps-row ps-safety"></div></div></div>';
      document.body.appendChild(profileBox);
      profileBox.addEventListener('click', function (e) {
        if (e.target === profileBox) return closeProfile();
        var btn = e.target.closest('[data-act]');
        if (btn && profileId) profileAction(btn.dataset.act, profileId);
      });
    }
    profileId = clientId;
    renderProfile();
    openModal(profileBox);
  }
  function renderProfile() {
    if (!profileBox || !profileId) return;
    var id = profileId;
    var p = personFor(id);
    var rel = relationOf(id);
    var friend = rel === 'friend' ? p : null;
    var live = isLivePartner(id);
    profileBox.querySelector('.ps-face').innerHTML = faceHtml(p, 72);
    profileBox.querySelector('.ps-name').innerHTML = getFlagImg(p.countryCode, 18) + ' ' + escapeHtml(friendLabel(p) || p.username || t('someone'));
    // Their public ID, with a copy button.
    var idLine = profileBox.querySelector('.ps-id');
    idLine.classList.toggle('hidden', !p.friendId);
    if (p.friendId) {
      idLine.innerHTML = '<span>' + escapeHtml(t('idLabel')) + '</span><strong>' + escapeHtml(p.friendId) + '</strong>' +
        '<button type="button" data-act="copyid">' + escapeHtml(t('copyFriendId')) + '</button>';
    }
    var real = profileBox.querySelector('.ps-real');
    var renamed = friend && friend.nickname && friend.nickname !== friend.username;
    real.classList.toggle('hidden', !renamed);
    if (renamed) real.textContent = t('realName', { name: friend.username });
    var presence = ('online' in p || p.lastSeen) ? presenceText(p) : '';
    var status = rel === 'friend' ? presence : t('profileRelation_' + rel) + (presence ? ' · ' + presence : '');
    profileBox.querySelector('.ps-status').textContent = status;
    profileBox.querySelector('.modal-close').setAttribute('aria-label', t('close'));

    var muted = mutedChats.indexOf(id) !== -1;
    var main = '';
    if (!live && (friend || historyState.some(function (h) { return h.clientId === id; }))) main += psBtn('chat', t('chat'), 'btn-primary', ICON.chat);
    if (canCall(id)) main += psBtn('call', t('call'), 'btn-call', ICON.call);
    if (rel === 'stranger') main += psBtn('add', t('addFriend'), 'btn-primary');
    if (rel === 'incoming') main += psBtn('accept', t('accept'), 'btn-primary') + psBtn('decline', t('decline'));
    if (rel === 'pending') main += '<span class="ps-pending">' + escapeHtml(t('pending')) + '</span>' + psBtn('cancel', t('cancelRequest'));
    var manage = '';
    if (friend) {
      manage += psBtn('rename', t('renameFriend'));
      manage += psBtn('pin', t(friend.pinned ? 'unpinFriend' : 'pinFriend'));
    }
    if (rel !== 'stranger' || historyState.some(function (h) { return h.clientId === id; })) {
      manage += psBtn('mute', t(muted ? 'unmuteChat' : 'muteChat'));
    }
    if (friend) manage += psBtn('remove', t('removeFriend'));
    profileBox.querySelector('.ps-main').innerHTML = main;
    profileBox.querySelector('.ps-manage').innerHTML = manage;
    profileBox.querySelector('.ps-safety').innerHTML = psBtn('report', t('report'), 'btn-ghost') + psBtn('block', t('blockUser'), 'btn-ghost btn-ghost-danger');
  }
  function profileAction(act, id) {
    var p = personFor(id);
    var name = friendLabel(p) || p.username || t('someone');
    switch (act) {
      case 'close': closeProfile(); break;
      case 'copyid': if (p.friendId) copyText(p.friendId, function () { socialToast(t('idCopiedTheirs')); }); break;
      case 'chat': closeProfile(); openFriendChat({ clientId: id, username: p.username }); break;
      case 'call':
        // Voice lives in the call app: it opens there, already ringing them.
        location.href = '/?open=call&with=' + encodeURIComponent(id);
        break;
      case 'add':
        if (isLivePartner(id)) { closeProfile(); addFriendBtn.click(); break; }
        socket.emit('friend-request', { targetClientId: id });
        friendsState.sent.push({ clientId: id, username: p.username, countryCode: p.countryCode, ts: Date.now() });
        socialToast(t('friendRequestSent'));
        renderFriends();
        renderProfile();
        break;
      case 'accept':
      case 'decline':
        socket.emit('friend-request-respond', { fromClientId: id, accept: act === 'accept' });
        closeProfile();
        break;
      case 'cancel':
        socket.emit('cancel-friend-request', { targetClientId: id });
        friendsState.sent = friendsState.sent.filter(function (r) { return r.clientId !== id; });
        socialToast(t('friendRequestCancelled'));
        renderFriends();
        renderProfile();
        break;
      case 'rename': closeProfile(); openRenameFriend(p); break;
      case 'pin':
        socket.emit('pin-friend', { friendClientId: id, pinned: !p.pinned });
        if (p.pinned) delete p.pinned; else p.pinned = true;
        renderFriends();
        renderProfile();
        break;
      case 'mute':
        var nowMuted = mutedChats.indexOf(id) === -1;
        socket.emit('mute-chat', { targetClientId: id, muted: nowMuted });
        mutedChats = nowMuted ? mutedChats.concat(id) : mutedChats.filter(function (x) { return x !== id; });
        socialToast(t(nowMuted ? 'chatMuted' : 'chatUnmuted'));
        renderFriends();
        renderProfile();
        renderChatHeadTools();
        break;
      case 'remove':
        askConfirm({ title: t('removeFriend'), text: t('confirmRemoveFriend'), ok: t('remove') }, function () {
          socket.emit('remove-friend', { friendClientId: id });
          closeProfile();
        });
        break;
      case 'report':
        if (isLivePartner(id)) { closeProfile(); openReport(); break; }
        askConfirm({ title: t('report'), text: t('confirmReportUser'), ok: t('report') }, function () {
          socket.emit('report-user', { targetClientId: id, reason: 'profile' });
          if (activeFriendChatId === id) closeFriendChat();
          closeProfile();
          socialToast(t('reportUserSent'));
        });
        break;
      case 'block': openBlockConfirm(id); break;
    }
  }

  // The friend chat's header: their face and name open the profile; mute and
  // clear sit beside block, as in the call app.
  var chatHeadWho = friendChatPanel.querySelector('.chat-head-who');
  var chatHeadAv = document.createElement('button');
  chatHeadAv.type = 'button';
  chatHeadAv.className = 'chat-head-av';
  if (chatHeadWho) {
    chatHeadWho.before(chatHeadAv);
    chatHeadWho.setAttribute('role', 'button');
    chatHeadWho.tabIndex = 0;
    chatHeadWho.style.cursor = 'pointer';
    chatHeadWho.addEventListener('click', function () { openProfile(activeFriendChatId); });
    chatHeadWho.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProfile(activeFriendChatId); }
    });
  }
  chatHeadAv.addEventListener('click', function () { openProfile(activeFriendChatId); });
  var chatMuteBtn = document.createElement('button');
  chatMuteBtn.type = 'button';
  chatMuteBtn.className = 'chat-block-btn chat-mute-btn';
  chatMuteBtn.addEventListener('click', function () { if (activeFriendChatId) profileAction('mute', activeFriendChatId); });
  var chatClearBtn = document.createElement('button');
  chatClearBtn.type = 'button';
  chatClearBtn.className = 'chat-block-btn';
  chatClearBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>';
  chatClearBtn.addEventListener('click', function () {
    var id = activeFriendChatId;
    if (!id) return;
    askConfirm({ title: t('clearChat'), text: t('confirmClearChat'), ok: t('clearChat') }, function () {
      socket.emit('clear-friend-chat', { friendClientId: id });
      if (activeFriendChatId === id) friendChatMsgs.innerHTML = '';
      noteLastMessage(id, null);
      renderFriends();
      renderHistory();
      socialToast(t('chatCleared'));
    });
  });
  if (friendChatBlockBtn) {
    friendChatBlockBtn.before(chatMuteBtn);
    friendChatBlockBtn.before(chatClearBtn);
  }
  var MUTE_ON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M22 9l-6 6M16 9l6 6"/></svg>';
  var MUTE_OFF = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>';
  function renderChatHeadTools() {
    var id = activeFriendChatId;
    chatHeadAv.innerHTML = id ? faceHtml(personFor(id), 34) : '';
    chatHeadAv.setAttribute('aria-label', t('openProfile'));
    var muted = !!id && mutedChats.indexOf(id) !== -1;
    chatMuteBtn.innerHTML = muted ? MUTE_ON : MUTE_OFF;
    chatMuteBtn.classList.toggle('is-muted', muted);
    chatMuteBtn.title = t(muted ? 'unmuteChat' : 'muteChat');
    chatMuteBtn.setAttribute('aria-label', chatMuteBtn.title);
    chatClearBtn.title = t('clearChat');
    chatClearBtn.setAttribute('aria-label', t('clearChat'));
  }

  // Faces beside their messages: the friend's picture in a friend chat, the
  // stranger's spirit animal in the live one. Both open the profile.
  if (Social) {
    Social.attachMessageAvatars(friendChatMsgs, {
      selector: '.msg', them: 'them',
      person: function () {
        var p = activeFriendChatId ? personFor(activeFriendChatId) : {};
        return { avatar: p.avatar, animal: p.animal, name: friendLabel(p) || p.username };
      },
      open: function () { openProfile(activeFriendChatId); },
    });
    Social.attachMessageAvatars(msgs, {
      selector: '.msg', them: 'them',
      person: function () {
        return currentPartner ? { animal: currentPartner.animal, name: currentPartner.username } : {};
      },
      open: function () { if (currentPartner && currentPartner.clientId) openProfile(currentPartner.clientId); },
    });
  }

  friendChatOverlay.addEventListener('click', closeFriendChat);

  // The name in the top bar opens the profile of whoever you are talking to.
  function openPartnerProfile() {
    if (currentPartner && currentPartner.clientId) openProfile(currentPartner.clientId);
  }
  topPartner.addEventListener('click', openPartnerProfile);
  topPartner.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPartnerProfile(); }
  });

  friendChatForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = friendChatInput.value.trim();
    if (!text || !activeFriendChatId) return;
    if (friendExtras) {
      if (friendExtras.compose(text) === false) return;
    } else if (sendFriendMessage({ text: text }) === false) {
      return;
    }
    friendChatInput.value = '';
    friendChatInput.focus();
  });

  socket.on('friend-chat-history', function (data) {
    if (!data || data.friendClientId !== activeFriendChatId) return;
    friendChatMsgs.innerHTML = '';
    if (friendExtras) friendExtras.reset();
    var stored = {};
    (data.messages || []).forEach(function (m) {
      stored[m.id] = true;
      appendFriendMsg(m.text, m.from === activeFriendChatId ? 'them' : 'me', m);
      if (m.seen && m.from !== activeFriendChatId) {
        friendSeenTs[activeFriendChatId] = Math.max(friendSeenTs[activeFriendChatId] || 0, m.ts || Date.now());
      }
    });
    // Messages still on their way are not in the server's copy yet - keep them.
    Object.keys(friendOutbox).forEach(function (id) {
      var entry = friendOutbox[id];
      if (entry.toClientId !== activeFriendChatId) return;
      if (stored[id]) { settleFriendMessage(id); return; }
      appendFriendMsg(entry.payload.text, 'me', { id: id, replyTo: entry.payload.replyTo, gif: entry.payload.gif });
      paintOutboxState(id, entry.failed ? 'failed' : 'pending');
    });
    renderSeenLabel();
  });
  function onScreen(id) {
    return !!(id && friendChatMsgs.querySelector('[data-cx-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]'));
  }
  socket.on('friend-message-sent', function (data) {
    if (!data) return;
    settleFriendMessage(data.id);
    if (data.toClientId === activeFriendChatId && onScreen(data.id)) return;
    noteLastMessage(data.toClientId, { id: data.id, mine: true, text: data.text || '', gif: !!data.gif, ts: data.ts });
    if (data.toClientId === activeFriendChatId) appendFriendMsg(data.text, 'me', data);
    renderFriends();
    renderHistory();
  });
  socket.on('friend-message', function (data) {
    if (!data || (data.fromClientId === activeFriendChatId && onScreen(data.id))) return;
    noteLastMessage(data.fromClientId, { id: data.id, mine: false, text: data.text || '', gif: !!data.gif, ts: data.ts });
    if (typingFrom[data.fromClientId]) setTyping(data.fromClientId, false);
    else { renderFriends(); renderHistory(); }
    if (data.fromClientId === activeFriendChatId) {
      appendFriendMsg(data.text, 'them', data);
      soundReceive();
      markActiveChatRead(true);
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
    if (sessionToken) socket.emit('resume-session', { token: sessionToken });
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

  socket.on('resume-session-result', function (res) {
    if (!res) return;
    if (!res.ok) {
      // Expired or revoked: stop pretending to be signed in, as the call app does.
      sessionToken = null;
      accountNickname = null;
      localStorage.removeItem('talklive_session');
      localStorage.removeItem('talklive_nickname');
      return;
    }
    // Signed in on another device first: take on the account's profile (its
    // friends and chats), once, exactly like the call app.
    if (res.profileClientId && res.profileClientId !== getClientId()) {
      var reloaded = false;
      try { reloaded = sessionStorage.getItem('talklive_profile_adopted') === '1'; } catch (e) { /* private mode */ }
      if (!reloaded) {
        try { sessionStorage.setItem('talklive_profile_adopted', '1'); } catch (e) { /* private mode */ }
        localStorage.setItem('talklive_client_id', res.profileClientId);
        if (res.identityToken) localStorage.setItem('talklive_identity_token', res.identityToken);
        else localStorage.removeItem('talklive_identity_token');
        localStorage.removeItem('talklive_profile_created');
        location.reload();
        return;
      }
    }
    if (res.nickname && res.nickname !== accountNickname) {
      accountNickname = res.nickname;
      localStorage.setItem('talklive_nickname', res.nickname);
      register();
    }
  });

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
    if (!res || res.ok !== false) {
      identityRetries = 0;
      if (document.visibilityState === 'hidden') reportVisibility();
      // Re-registered after a drop: anything still unacknowledged goes again.
      Object.keys(friendOutbox).forEach(function (id) {
        friendOutbox[id].tries = 0;
        paintOutboxState(id, 'pending');
        emitOutbox(id);
      });
      return;
    }
    if (res.reason === 'active-elsewhere') {
      identityRetries = 0;
      claimIdentityWhenVisible();
      return;
    }
    // Unprovable and owned: retrying cannot help, so start fresh now.
    if (res.reason === 'unverified') identityRetries = 4;
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
  socket.on('visitor-count', function (n) {
    if (!visitorCount) return;
    var next = formatVisitors(n);
    if (visitorCount.textContent === next) return;
    visitorCount.textContent = next;
    if (liveCount) liveCount.classList.remove('is-waiting');
    visitorCount.classList.remove('is-bump');
    void visitorCount.offsetWidth;
    visitorCount.classList.add('is-bump');
  });

  // 1240 visitors is a wider number than the capsule has room for; 1.2k is not.
  function formatVisitors(n) {
    var v = Number(n) || 0;
    if (v < 1000) return String(v);
    if (v < 10000) return (Math.floor(v / 100) / 10).toFixed(1).replace(/\.0$/, '') + 'k';
    return Math.floor(v / 1000) + 'k';
  }

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
    if (icebreakBtn) icebreakBtn.disabled = false;
    showIcebreakers();
    // Matched while this tab is in the background: tell them straight away.
    if (document.visibilityState === 'hidden') reportAway();
    focusComposer(input);
  });

  socket.on('waiting', function () { searchAcked = true; });
  socket.on('random-fallback', function () { /* server widened the net; nothing to do */ });

  socket.on('chat-message', function (data) {
    if (!data) return;
    var text = data.text ? String(data.text) : '';
    if (!text && !data.gif) return;
    // The message IS the end of the typing. Without this the indicator sat
    // under the bubble it had just announced for the rest of its 3s timeout,
    // so every single message left a "Stranger is typing..." lying about what
    // was happening.
    typingEl.classList.add('hidden');
    clearTimeout(typingHideTimer);
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
    if (data && data.scope === 'friend' && data.id && friendOutbox[data.id]) {
      var entry = friendOutbox[data.id];
      // Too fast, usually a backlog flushed on reconnect: wait and go again.
      if (reason === 'rate' && entry.tries < FRIEND_SEND_MAX_TRIES) {
        clearTimeout(entry.timer);
        entry.timer = setTimeout(function () { emitOutbox(data.id); }, 2500 * entry.tries);
        return;
      }
      dropFriendMessage(data.id);
      if (data.toClientId !== activeFriendChatId) return;
    }
    var text = reason === 'link' ? t('chatLinkBlocked')
      : reason === 'rate' ? t('errSlowDown')
      : reason === 'unreachable' ? t('errCantMessage')
      : t('errUnsafeMessage');
    // A refused direct message belongs in the direct chat it was typed in, not
    // in the stranger conversation behind it.
    if (activeFriendChatId && (reason === 'unreachable' || friendChatPanel.classList.contains('open'))) {
      var el = document.createElement('div');
      el.className = 'msg system';
      el.textContent = text;
      friendChatMsgs.appendChild(el);
      friendChatMsgs.scrollTop = friendChatMsgs.scrollHeight;
      return;
    }
    addMessage(text, 'system');
  });

  socket.on('partner-left', onPartnerLeft);
  function onPartnerLeft(info) {
    var reason = info && info.reason;
    var name = (info && info.username) || (currentPartner && currentPartner.username) || t('stranger');
    partnerHere = false;
    hideIcebreakers();
    awayLine = null;
    if (icebreakBtn) icebreakBtn.disabled = true;
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
    if (reason === 'blocked') {
      // This user blocked the person they were chatting with, from the
      // friends panel. Stay put rather than searching on: they may want to
      // report, or simply take a breath.
      addMessage(t('userBlocked'), 'system system-warn');
    } else if (reason === 'away') {
      // We were the one who left the app for too long. Not auto-searching: a
      // match made while nobody is looking would just leave the next stranger
      // waiting the same way.
      addMessage(t('chatYouAwayEnded'), 'system system-warn');
    } else if (autoNext) {
      // Keep going straight into a new search - no need to wait for a tap on Next.
      // The conversation vanishes, so say why: without this the screen just
      // flipped to "Scanning the globe…" mid-sentence with no word of it.
      clearMessages();
      clearNextConfirm();
      goSearch(false, t('statusChatEnded'));
    } else {
      addMessage(reason === 'disconnected' ? t('chatPartnerDropped', { name: name }) : t('chatStageLeft'), 'system system-warn');
    }
  }
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

  // ...unless the visitor has already pressed a button that said it would
  // start one. "Tap to Chat" on the home screen sends ?go=1, and landing on a
  // second screen with a second button after that made the first button a
  // lie - the commonest reason someone taps once, sees another page, and
  // leaves. The gates it goes through are unchanged; only the extra press of
  // a button already pressed is gone.
  try {
    if (new URLSearchParams(location.search).get('go') === '1') {
      // The query string has done its job - keep it out of Back and out of
      // anything the visitor might bookmark or share.
      history.replaceState(history.state, '', '/chat');
      initAudio();
      requestStart();
    }
  } catch (err) { /* URLSearchParams unavailable - the start button still works */ }
})();
