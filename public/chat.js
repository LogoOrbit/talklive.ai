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
  var connectedFrom = $('connectedFrom');
  var meName = $('meName');
  var meFlag = $('meFlag');
  var reportBtn = $('reportBtn');
  var addFriendBtn = $('addFriendBtn');
  var typingEl = $('typing');
  var onlineCount = $('onlineCount');

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
  function vibrate(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

  // --- State ---
  var myProfile = null;
  var currentPartner = null;
  var searching = false;
  var partnerHere = false;

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
    if (name !== 'search') stopSearchLines();
  }

  function syncMe() {
    var name = accountNickname || tempUsername || (myProfile && myProfile.username) || t('you');
    meName.textContent = name;
    meFlag.innerHTML = myProfile && myProfile.countryCode ? getFlagImg(myProfile.countryCode, 18) : '';
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

  startBtn.addEventListener('click', function () { vibrate(10); requestStart(); });
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
    input.value = '';
    input.focus();
  });
  input.addEventListener('input', function () {
    if (typingThrottle) return;
    socket.emit('typing');
    typingThrottle = setTimeout(function () { typingThrottle = null; }, 1500);
  });

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
  // Socket events
  // ---------------------------------------------------------------------------
  socket.on('connect', register);

  socket.on('profile', function (p) {
    myProfile = { username: p.username, country: p.country, countryCode: p.countryCode };
    syncMe();
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
    connectedFrom.innerHTML = escapeHtml(t('chatPartnerFrom', {
      country: getCountryName(data.partner.countryCode) || data.partner.country || t('somewhere'),
    })) + ' ' + getFlagImg(data.partner.countryCode, 20);
    showView('live');
    addMessage(t('chatSystemMatched', {
      name: data.partner.username,
      country: getCountryName(data.partner.countryCode) || data.partner.country || '',
    }), 'system');
    input.focus();
  });

  socket.on('waiting', function () { /* still searching — keep the search view */ });
  socket.on('match-delay', function () { /* brief free-tier pause — search view stays */ });
  socket.on('random-fallback', function () { /* server widened the net; nothing to do */ });

  socket.on('chat-message', function (data) {
    var text = data && data.text ? String(data.text) : '';
    if (!text) return;
    addMessage(text, 'them');
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
  });

  socket.on('partner-left', function () {
    partnerHere = false;
    typingEl.classList.add('hidden');
    reportBtn.classList.add('hidden');
    addFriendBtn.classList.add('hidden');
    input.disabled = true;
    addMessage(t('chatStageLeft'), 'system');
  });
  // re-enable the input on the next match
  socket.on('matched', function () { input.disabled = false; });

  socket.on('banned', function (data) {
    stage.innerHTML = '<div class="chat-blocked-full"><h1>' + escapeHtml(t('bannedTitle')) + '</h1><p>' + escapeHtml(t('bannedBody')) + '</p></div>';
  });
  socket.on('maintenance', function (data) {
    stage.innerHTML = '<div class="chat-blocked-full"><h1>' + escapeHtml(t('maintenanceTitle')) + '</h1><p>' + escapeHtml((data && data.message) || t('maintenanceBody')) + '</p></div>';
  });

  // Keep the identity fresh whenever i18n re-renders (e.g. language change).
  window.addEventListener('i18n-changed', function () {
    syncMe();
    if (!nextArmed) nextBtn.querySelector('span').textContent = t('chatNext');
  });

  // --- Boot: land straight on the single "Start chatting" button. ---
  syncMe();
  goStart();
})();
