// ============================================================================
// TalkLive — dedicated text-chat app (/chat).
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

  // --- Persistent identity (matches the main app's keys so a returning user
  // keeps the same client id / chosen name across both pages). ---
  function getClientId() {
    var id = localStorage.getItem('talklive_client_id');
    if (!id) {
      id = 'c_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('talklive_client_id', id);
    }
    return id;
  }
  var tempUsername = localStorage.getItem('talklive_tempname') || null;
  var accountNickname = null; // set if a logged-in session exists elsewhere
  var CONSENT_KEY = 'talklive_age_consent';

  // --- DOM ---
  var $ = function (id) { return document.getElementById(id); };
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
  var autoBtn = $('autoBtn');
  var topDefault = $('topDefault');
  var topPartner = $('topPartner');
  var voiceCallBtn = $('voiceCallBtn');

  // --- Shared preferences (same localStorage keys as the call app, so the
  // theme/name/sound choices follow the user between both sub-apps). ---
  var THEMES = ['dark', 'light', 'ocean', 'sunset'];
  var currentTheme = localStorage.getItem('talklive_theme');
  if (THEMES.indexOf(currentTheme) === -1) currentTheme = 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);
  var soundEnabled = localStorage.getItem('talklive_sound') !== 'off';
  var vibrationEnabled = localStorage.getItem('talklive_vibration') !== 'off';
  var myGender = localStorage.getItem('talklive_gender') || '';

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
    return '<img class="flag-icon" src="https://flagcdn.com/24x18/' + cc + '.png" srcset="https://flagcdn.com/48x36/' + cc + '.png 2x" width="' + size + '" alt="' + escapeHtml(getCountryName(code)) + '" />';
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
    viewStart.classList.toggle('hidden', name !== 'start');
    viewSearch.classList.toggle('hidden', name !== 'search');
    viewLive.classList.toggle('hidden', name !== 'live');
    composer.classList.toggle('hidden', name !== 'live');
    var connected = name === 'live' && partnerHere;
    reportBtn.classList.toggle('hidden', !connected);
    addFriendBtn.classList.toggle('hidden', !connected);
    autoBtn.classList.toggle('hidden', name === 'start');
    // While connected the header shows who you're talking to (name + country
    // + flag); idle shows the online counter next to the TalkLive brand.
    topDefault.classList.toggle('hidden', connected);
    topPartner.classList.toggle('hidden', !connected);
    document.querySelector('.topbar').classList.toggle('connected', connected);
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
  function addMessage(text, who) {
    var el = document.createElement('div');
    el.className = 'msg ' + who;
    el.textContent = text;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
    return el;
  }
  function clearMessages() { msgs.innerHTML = ''; }

  // Bot heuristic: the same line repeated back-to-back is the classic spam
  // signature — warn once so the user just taps Next.
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
  // Flow control
  // ---------------------------------------------------------------------------
  function register() {
    socket.emit('register', {
      clientId: getClientId(),
      nickname: accountNickname || tempUsername || undefined,
      gender: myGender || undefined,
    });
  }

  function goSearch(firstTime) {
    searching = true;
    partnerHere = false;
    showView('search');
    startSearchLines();
    if (firstTime) register();
    socket.emit('find-partner', { mode: 'chat' });
  }

  function goStart() {
    searching = false;
    partnerHere = false;
    if (location.pathname !== '/chat') history.replaceState(history.state, '', '/chat');
    showView('start');
  }

  // Age/terms gate before the first ever search (once per browser).
  var consentModal = $('consentModal');
  var consentCheckbox = $('consentCheckbox');
  var consentAgreeBtn = $('consentAgreeBtn');
  function requestStart() {
    if (localStorage.getItem(CONSENT_KEY) === 'yes') { goSearch(true); return; }
    consentCheckbox.checked = false;
    consentAgreeBtn.disabled = true;
    openModal(consentModal);
  }
  consentCheckbox.addEventListener('change', function () {
    consentAgreeBtn.disabled = !consentCheckbox.checked;
  });
  consentAgreeBtn.addEventListener('click', function () {
    localStorage.setItem(CONSENT_KEY, 'yes');
    closeModal(consentModal);
    goSearch(true);
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
  composer.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text || !partnerHere) return;
    if (LINK_RE.test(text)) { addMessage(t('chatLinkBlocked'), 'system'); return; }
    if (UNSAFE_RE.test(text)) { addMessage(t('chatBotWarning'), 'system'); return; }
    socket.emit('chat-message', text.slice(0, 1000));
    addMessage(text, 'me');
    soundSend();
    input.value = '';
    input.focus();
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
  // Voice call: the phone icon never navigates away silently. Tapping it sends
  // your current partner a "wants to call you" popup; only once THEY accept
  // does either browser leave for the voice app — and both land there
  // together, paired up automatically via a one-time invite token.
  // ---------------------------------------------------------------------------
  var callModal = $('callModal');       // "Calling… waiting for them to accept"
  var callIncomingModal = $('callIncomingModal'); // shown to the invited side

  var inviteOutTimer = null;
  function clearOutgoingInvite() {
    clearTimeout(inviteOutTimer);
    inviteOutTimer = null;
    closeModal(callModal);
  }
  voiceCallBtn.addEventListener('click', function () {
    if (!partnerHere) return;
    vibrate(10);
    socket.emit('voice-invite');
    openModal(callModal);
    // No response within 20s (e.g. they never notice the popup) — stop waiting.
    clearTimeout(inviteOutTimer);
    inviteOutTimer = setTimeout(function () {
      closeModal(callModal);
      addMessage(t('callInviteNoAnswer'), 'system');
    }, 20000);
  });
  $('callCancelBtn').addEventListener('click', function () { clearOutgoingInvite(); });
  $('callCloseBtn').addEventListener('click', function () { clearOutgoingInvite(); });
  callModal.addEventListener('click', function (e) { if (e.target === callModal) clearOutgoingInvite(); });

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

  socket.on('voice-invite-declined', function () {
    clearOutgoingInvite();
    addMessage(t('callInviteDeclined'), 'system');
  });
  socket.on('voice-invite-accepted', function (data) {
    clearOutgoingInvite();
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
  // Side panels (settings / friends / friend chat) — the nav features shared
  // with the call app. Each panel slides in over its own overlay.
  // ---------------------------------------------------------------------------
  function openPanel(panel, overlay) { panel.classList.add('open'); overlay.classList.remove('hidden'); }
  function closePanel(panel, overlay) { panel.classList.remove('open'); overlay.classList.add('hidden'); }
  function closeAllPanels() {
    closePanel(settingsPanel, settingsOverlay);
    closePanel(friendsPanel, friendsOverlay);
    closePanel(friendChatPanel, friendChatOverlay);
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

  $('chatSettingsBtn').addEventListener('click', function () {
    vibrate(10);
    closeAllPanels();
    tempNameInput.value = tempUsername || (myProfile && myProfile.username) || '';
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

  // --- Friends panel: requests + friend list, kept in sync by 'state-sync'. ---
  var friendsPanel = $('friendsPanel');
  var friendsOverlay = $('friendsOverlay');
  var friendsBadge = $('friendsBadge');
  var requestsList = $('requestsList');
  var friendsList = $('friendsList');
  var friendsState = { friends: [], requests: [], notifications: [] };

  $('friendsBtn').addEventListener('click', function () {
    vibrate(10);
    closeAllPanels();
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

  function renderFriends() {
    // Header badge: pending requests + unread friend messages.
    var unread = friendsState.notifications.filter(function (n) { return n.type === 'message'; }).length;
    var badgeCount = friendsState.requests.length + unread;
    friendsBadge.textContent = String(badgeCount);
    friendsBadge.classList.toggle('hidden', badgeCount === 0);

    requestsList.innerHTML = '';
    friendsState.requests.forEach(function (r) {
      var row = document.createElement('div');
      row.className = 'request-row';
      row.innerHTML =
        '<span class="friend-avatar" aria-hidden="true">' + escapeHtml((r.username || '?').charAt(0)) + '</span>' +
        '<span class="friend-main"><span class="friend-name">' + escapeHtml(r.username || '—') + ' ' + getFlagImg(r.countryCode, 14) + '</span>' +
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
      friendsList.innerHTML = '<p class="list-empty">' + escapeHtml(t('noFriendsYet')) + '</p>';
      return;
    }
    friendsState.friends.forEach(function (f) {
      var row = document.createElement('div');
      row.className = 'friend-row';
      var unreadN = unreadCountFor(f.clientId);
      row.innerHTML =
        '<span class="friend-avatar" aria-hidden="true">' + escapeHtml((f.username || '?').charAt(0)) + '</span>' +
        '<span class="friend-main"><span class="friend-name">' + escapeHtml(f.username || '—') + ' ' + getFlagImg(f.countryCode, 14) + '</span>' +
        '<span class="friend-status' + (f.online ? '' : ' is-offline') + '"><span class="online-dot"></span>' + escapeHtml(t(f.online ? 'online' : 'offline')) + '</span></span>' +
        '<span class="friend-actions">' +
        '<button type="button" class="mini-btn" data-act="chat" title="' + escapeHtml(t('chat')) + '" aria-label="' + escapeHtml(t('chat')) + '"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>' +
        (unreadN ? '<span class="notif-badge">' + unreadN + '</span>' : '') + '</button>' +
        '<button type="button" class="mini-btn danger" data-act="remove" title="' + escapeHtml(t('removeFriend')) + '" aria-label="' + escapeHtml(t('removeFriend')) + '"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg></button>' +
        '</span>';
      row.querySelector('[data-act="chat"]').addEventListener('click', function () { openFriendChat(f); });
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
    friendsState.notifications = data.notifications || [];
    renderFriends();
  });
  // Live badge updates: message notifications arrive alone (friend-request
  // ones come with a full state-sync), so track them locally too.
  socket.on('notification', function (n) {
    if (!n) return;
    if (n.type === 'message' && n.fromClientId === activeFriendChatId) return; // already reading it
    friendsState.notifications.push(n);
    renderFriends();
  });

  // --- Friend chat: persistent one-to-one chat, same protocol as the call app. ---
  var friendChatPanel = $('friendChatPanel');
  var friendChatOverlay = $('friendChatOverlay');
  var friendChatMsgs = $('friendChatMsgs');
  var friendChatForm = $('friendChatForm');
  var friendChatInput = $('friendChatInput');
  var activeFriendChatId = null;

  function appendFriendMsg(text, who) {
    var el = document.createElement('div');
    el.className = 'msg ' + who;
    el.textContent = text;
    friendChatMsgs.appendChild(el);
    friendChatMsgs.scrollTop = friendChatMsgs.scrollHeight;
  }

  function openFriendChat(friend) {
    activeFriendChatId = friend.clientId;
    $('friendChatTitle').textContent = friend.username || t('chat');
    friendChatMsgs.innerHTML = '';
    closePanel(friendsPanel, friendsOverlay);
    openPanel(friendChatPanel, friendChatOverlay);
    socket.emit('get-friend-chat', { friendClientId: friend.clientId });
    socket.emit('mark-messages-read', { friendClientId: friend.clientId });
    // Clear this friend's unread notifications locally so badges update now.
    friendsState.notifications = friendsState.notifications.filter(function (n) {
      return !(n.type === 'message' && n.fromClientId === friend.clientId);
    });
    renderFriends();
    friendChatInput.focus();
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
    socket.emit('friend-message', { toClientId: activeFriendChatId, text: text.slice(0, 1000) });
    friendChatInput.value = '';
    friendChatInput.focus();
  });

  socket.on('friend-chat-history', function (data) {
    if (!data || data.friendClientId !== activeFriendChatId) return;
    friendChatMsgs.innerHTML = '';
    (data.messages || []).forEach(function (m) {
      appendFriendMsg(m.text, m.from === activeFriendChatId ? 'them' : 'me');
    });
  });
  socket.on('friend-message-sent', function (data) {
    if (data && data.toClientId === activeFriendChatId) appendFriendMsg(data.text, 'me');
  });
  socket.on('friend-message', function (data) {
    if (!data) return;
    if (data.fromClientId === activeFriendChatId) {
      appendFriendMsg(data.text, 'them');
      soundReceive();
      socket.emit('mark-messages-read', { friendClientId: data.fromClientId });
    }
    // Badges refresh via the state-sync the server sends with the notification.
  });

  // ---------------------------------------------------------------------------
  // Socket events
  // ---------------------------------------------------------------------------
  socket.on('connect', register);

  socket.on('profile', function (p) {
    myProfile = { username: p.username, country: p.country, countryCode: p.countryCode };
  });

  socket.on('online-count', function (n) {
    if (onlineCount) onlineCount.textContent = String(n);
  });

  socket.on('matched', function (data) {
    if (data.mode && data.mode !== 'chat') return; // safety: ignore stray voice matches
    currentPartner = data.partner;
    partnerHere = true;
    botWarned = false; lastIn = ''; repeat = 0;
    addFriendBtn.classList.remove('sent');
    addFriendBtn.disabled = false;
    clearMessages();
    // Top bar: partner name + country with its flag.
    var countryName = getCountryName(data.partner.countryCode) || data.partner.country || '';
    $('topPartnerName').textContent = data.partner.username;
    $('topPartnerCountry').textContent = countryName;
    $('topPartnerFlag').innerHTML = getFlagImg(data.partner.countryCode, 16);
    showView('live');
    soundConnect();
    // "You're now chatting with X from Pakistan 🇵🇰" — the flag image goes right
    // after the country name inside the system line, so it's built as DOM.
    var line = addMessage(t('chatSystemMatched', {
      name: data.partner.username,
      country: countryName,
    }), 'system');
    var html = escapeHtml(line.textContent);
    if (countryName && data.partner.countryCode && data.partner.countryCode !== 'XX') {
      html = html.replace(escapeHtml(countryName), escapeHtml(countryName) + ' ' + getFlagImg(data.partner.countryCode, 15));
    }
    line.innerHTML = html;
    input.focus();
  });

  socket.on('waiting', function () { /* still searching — keep the search view */ });
  socket.on('match-delay', function () { /* brief free-tier pause — search view stays */ });
  socket.on('random-fallback', function () { /* server widened the net; nothing to do */ });

  socket.on('chat-message', function (data) {
    var text = data && data.text ? String(data.text) : '';
    if (!text) return;
    addMessage(text, 'them');
    soundReceive();
    checkIncoming(text);
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
    // Server-side escalation feedback — the server enforces this; the local
    // filters above are only instant UX.
    if (data && data.level === 'mute' && data.mutedUntil) {
      var mins = Math.max(1, Math.ceil((data.mutedUntil - Date.now()) / 60000));
      addMessage('You have been temporarily muted for ' + mins + ' minute' + (mins === 1 ? '' : 's') + ' due to repeated violations.', 'system');
    } else if (data && data.level === 'warn') {
      addMessage('Warning: further violations will result in a temporary mute or ban.', 'system');
    }
  });

  socket.on('partner-left', function () {
    partnerHere = false;
    typingEl.classList.add('hidden');
    reportBtn.classList.add('hidden');
    addFriendBtn.classList.add('hidden');
    topDefault.classList.remove('hidden');
    topPartner.classList.add('hidden');
    document.querySelector('.topbar').classList.remove('connected');
    input.disabled = true;
    clearOutgoingInvite();
    closeModal(callIncomingModal);
    if (autoNext) {
      // Keep going straight into a new search — no need to wait for a tap on Next.
      clearMessages();
      clearNextConfirm();
      goSearch(false);
    } else {
      addMessage(t('chatStageLeft'), 'system system-warn');
    }
  });
  // re-enable the input on the next match
  socket.on('matched', function () { input.disabled = false; });

  socket.on('banned', function (data) {
    stage.innerHTML = '<div class="chat-blocked-full"><h1>' + escapeHtml(t('bannedTitle')) + '</h1><p>' + escapeHtml(t('bannedBody')) + '</p></div>';
  });
  socket.on('maintenance', function (data) {
    stage.innerHTML = '<div class="chat-blocked-full"><h1>' + escapeHtml(t('maintenanceTitle')) + '</h1><p>' + escapeHtml((data && data.message) || t('maintenanceBody')) + '</p></div>';
  });

  // Keep translated bits fresh whenever i18n re-renders (e.g. language change).
  window.addEventListener('i18n-changed', function () {
    if (!nextArmed) nextBtn.querySelector('span').textContent = t('chatNext');
  });

  // --- Boot: land straight on the single "Start chatting" button. ---
  goStart();
})();
