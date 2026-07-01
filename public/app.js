const socket = io();

// --- DOM refs ---
const orb = document.getElementById('orb');
const orbRings = document.querySelectorAll('#orb .orb-ring');
const statusText = document.getElementById('statusText');
const subText = document.getElementById('subText');
const errorText = document.getElementById('errorText');
const setupErrorText = document.getElementById('setupErrorText');
const onlineCountEl = document.getElementById('onlineCount');
const remoteAudio = document.getElementById('remoteAudio');

const setupPanel = document.getElementById('setupPanel');
const callPanel = document.getElementById('callPanel');
const chatPanel = document.getElementById('chatPanel');

const filtersBtn = document.getElementById('filtersBtn');
const filtersPanel = document.getElementById('filtersPanel');
const filtersOverlay = document.getElementById('filtersOverlay');
const closeFiltersBtn = document.getElementById('closeFiltersBtn');

const termsModal = document.getElementById('termsModal');
const closeTermsBtn = document.getElementById('closeTermsBtn');
const openTermsLink = document.getElementById('openTermsLink');
const openTermsLinkFooter = document.getElementById('openTermsLinkFooter');

const genderGroup = document.getElementById('genderGroup');
const prefGenderGroup = document.getElementById('prefGenderGroup');
const interestTagsEl = document.getElementById('interestTags');
const interestInput = document.getElementById('interestInput');
const autoCallCheckbox = document.getElementById('autoCallCheckbox');
const connectFlash = document.getElementById('connectFlash');

const includeCountrySearch = document.getElementById('includeCountrySearch');
const includeCountryResults = document.getElementById('includeCountryResults');
const includeCountryChips = document.getElementById('includeCountryChips');
const excludeCountrySearch = document.getElementById('excludeCountrySearch');
const excludeCountryResults = document.getElementById('excludeCountryResults');
const excludeCountryChips = document.getElementById('excludeCountryChips');
const saveFiltersBtn = document.getElementById('saveFiltersBtn');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');

const partnerCard = document.getElementById('partnerCard');
const partnerName = document.getElementById('partnerName');
const partnerMeta = document.getElementById('partnerMeta');
const partnerInterests = document.getElementById('partnerInterests');

const startBtn = document.getElementById('startBtn');
const skipBtn = document.getElementById('skipBtn');
const skipLabel = document.querySelector('.call-btn-label-next');
const muteBtn = document.getElementById('muteBtn');
const muteIcon = document.getElementById('muteIcon');
const muteSlash = document.getElementById('muteSlash');
const chatToggleBtn = document.getElementById('chatToggleBtn');
const reportBtn = document.getElementById('reportBtn');
const addFriendBtn = document.getElementById('addFriendBtn');
const stopBtn = document.getElementById('stopBtn');
const primaryControls = document.getElementById('primaryControls');
const autoCallRow = document.getElementById('autoCallRow');

const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn');

const connectionIndicator = document.getElementById('connectionIndicator');
const connectionDot = document.getElementById('connectionDot');
const connectionLabel = document.getElementById('connectionLabel');
const callTimerEl = document.getElementById('callTimer');
const sharedInterestNote = document.getElementById('sharedInterestNote');
const reactionBar = document.getElementById('reactionBar');
const reactionOverlay = document.getElementById('reactionOverlay');

const chatBadge = document.getElementById('chatBadge');
const chatTypingBadge = document.getElementById('chatTypingBadge');
const typingIndicator = document.getElementById('typingIndicator');
const quickGuide = document.getElementById('quickGuide');

const historyBtn = document.getElementById('historyBtn');
const historyModal = document.getElementById('historyModal');
const closeHistoryBtn = document.getElementById('closeHistoryBtn');
const historyList = document.getElementById('historyList');

const friendsBtn = document.getElementById('friendsBtn');
const friendsMsgBadge = document.getElementById('friendsMsgBadge');
const friendsModal = document.getElementById('friendsModal');
const closeFriendsBtn = document.getElementById('closeFriendsBtn');
const friendsList = document.getElementById('friendsList');
const friendRequestsList = document.getElementById('friendRequestsList');
const friendReqCount = document.getElementById('friendReqCount');
const friendsTabs = document.querySelectorAll('.friends-tab');
const friendsListPanel = document.getElementById('friendsListPanel');
const friendRequestsPanel = document.getElementById('friendRequestsPanel');

const notifBtn = document.getElementById('notifBtn');
const notifBadge = document.getElementById('notifBadge');
const notifModal = document.getElementById('notifModal');
const notifWrap = document.querySelector('.notif-wrap');
const closeNotifBtn = document.getElementById('closeNotifBtn');
const notifList = document.getElementById('notifList');

const friendChatModal = document.getElementById('friendChatModal');
const closeFriendChatBtn = document.getElementById('closeFriendChatBtn');
const friendChatTitle = document.getElementById('friendChatTitle');
const friendChatMessages = document.getElementById('friendChatMessages');
const friendChatForm = document.getElementById('friendChatForm');
const friendChatInput = document.getElementById('friendChatInput');

const callBackBanner = document.getElementById('callBackBanner');
const callBackBannerText = document.getElementById('callBackBannerText');
const callBackAcceptBtn = document.getElementById('callBackAcceptBtn');
const callBackDeclineBtn = document.getElementById('callBackDeclineBtn');

const accountBtn = document.getElementById('accountBtn');
const accountModal = document.getElementById('accountModal');
const closeAccountBtn = document.getElementById('closeAccountBtn');
const accountStatus = document.getElementById('accountStatus');
const accountLoggedOut = document.getElementById('accountLoggedOut');
const accountLoggedIn = document.getElementById('accountLoggedIn');
const accountNicknameDisplay = document.getElementById('accountNicknameDisplay');
const accountTabs = document.querySelectorAll('.account-tab');
const loginTab = document.getElementById('loginTab');
const signupTab = document.getElementById('signupTab');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const loginSubmitBtn = document.getElementById('loginSubmitBtn');
const signupUsername = document.getElementById('signupUsername');
const signupPassword = document.getElementById('signupPassword');
const signupNickname = document.getElementById('signupNickname');
const signupSubmitBtn = document.getElementById('signupSubmitBtn');
const logoutBtn = document.getElementById('logoutBtn');
const avatarIcon = document.getElementById('avatarIcon');
const avatarInitial = document.getElementById('avatarInitial');
const settingsNickname = document.getElementById('settingsNickname');
const updateNicknameBtn = document.getElementById('updateNicknameBtn');
const currentPasswordInput = document.getElementById('currentPasswordInput');
const newPasswordInput = document.getElementById('newPasswordInput');
const changePasswordBtn = document.getElementById('changePasswordBtn');

const appSettingsBtn = document.getElementById('appSettingsBtn');
const appSettingsPanel = document.getElementById('appSettingsPanel');
const appSettingsOverlay = document.getElementById('appSettingsOverlay');
const closeAppSettingsBtn = document.getElementById('closeAppSettingsBtn');
const sfxSettingCheckbox = document.getElementById('sfxSettingCheckbox');
const sideAutoCallCheckbox = document.getElementById('sideAutoCallCheckbox');

const MIN_CALL_SECONDS_BEFORE_SKIP = 2;

// --- Theme-matched inline icon set, used instead of emoji everywhere in the UI ---
const ICONS = {
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/></svg>',
  block: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><line x1="5.5" y1="18.5" x2="18.5" y2="5.5"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="4 12 9 17 20 6"/></svg>',
  checkCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polyline points="8 12.5 11 15.5 16 9"/></svg>',
  call: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4a4.2 4.2 0 0 0-4.2 4.2v2.6c0 .8-.3 1.6-.9 2.2l-1.1 1.1c-.5.5-.2 1.5.6 1.5h11.2c.8 0 1.1-1 .6-1.5l-1.1-1.1a3.2 3.2 0 0 1-.9-2.2V8.2A4.2 4.2 0 0 0 12 4z"/><path d="M9.7 18.5a2.4 2.4 0 0 0 4.6 0"/></svg>',
  person: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8.5" r="3.5"/><path d="M4.5 20c0-4.2 3.4-7 7.5-7s7.5 2.8 7.5 7"/></svg>',
};

const REACTION_ICONS = {
  like: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>',
  laugh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
  clap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><ellipse cx="8" cy="15" rx="3.2" ry="4.2" fill="currentColor" stroke="none" transform="rotate(-20 8 15)"/><ellipse cx="16" cy="15" rx="3.2" ry="4.2" fill="currentColor" stroke="none" transform="rotate(20 16 15)"/><line x1="12" y1="4" x2="12" y2="7"/><line x1="7.8" y1="5.6" x2="9.4" y2="8"/><line x1="16.2" y1="5.6" x2="14.6" y2="8"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
};

// --- Country code -> flag image (works consistently across all browsers/OSes,
// unlike emoji regional-indicator flags which many platforms, e.g. Windows, render as plain letters) ---
function getFlagImg(code, size = 20) {
  if (!code || code.length !== 2 || code === 'XX') {
    return `<svg class="flag-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><ellipse cx="12" cy="12" rx="4.2" ry="9.5"/><line x1="2.5" y1="12" x2="21.5" y2="12"/></svg>`;
  }
  const cc = code.toLowerCase();
  return `<img class="flag-icon" src="https://flagcdn.com/24x18/${cc}.png" srcset="https://flagcdn.com/48x36/${cc}.png 2x" width="${size}" alt="${code.toUpperCase()}" />`;
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // Open Relay Project — free public TURN fallback for restrictive/cross-country networks.
  // Multiple ports/transports so at least one gets through most firewalls.
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:80?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turns:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
];

const selectedInterests = new Set();
const includeCountries = new Set(); // draft "Interested Countries" — only match these, if any chosen
const excludeCountries = new Set(); // draft "Non Interested Countries" — never match these

let localStream = null;
let pc = null;
let isMuted = false;
let isSearching = false;
let chatOpen = false;
let speakingCheckInterval = null;
let myProfile = null;
let callTimerInterval = null;
let callStartedAt = null;
let skipUnlockTimeout = null;
let currentPartnerInterests = [];
let currentPartner = null;
let callHistory = [];
let accountNickname = localStorage.getItem('talklive_nickname') || null;
let autoCallEnabled = localStorage.getItem('talklive_autocall') !== 'off';
let wasConnected = false;

// --- Friends / notifications / friend chat / call-back state ---
let friendsData = [];        // [{ clientId, username, countryCode, temporary, online }]
let friendRequestsData = []; // [{ clientId, username, countryCode, temporary, ts }]
let notifData = [];          // [{ id, type, ts, ... }]
let activeFriendChatId = null;
const friendChatCache = new Map(); // friendClientId -> [{ from, text, ts }]
let pendingCallBackFrom = null;

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// --- Persistent client id so blocks survive reconnects in this browser ---
function getClientId() {
  let id = localStorage.getItem('talklive_client_id');
  if (!id) {
    id = 'c_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('talklive_client_id', id);
  }
  return id;
}

// --- Pill group (radio-style dot buttons) ---
function initPillGroup(group) {
  group.addEventListener('click', (e) => {
    const pill = e.target.closest('.pill');
    if (!pill) return;
    group.querySelectorAll('.pill').forEach((p) => p.classList.remove('selected'));
    pill.classList.add('selected');
    group.dataset.value = pill.dataset.value;
  });
  // select the first pill by default
  const first = group.querySelector('.pill');
  if (first) first.classList.add('selected');
}

function setPillGroupValue(group, value) {
  group.dataset.value = value;
  group.querySelectorAll('.pill').forEach((p) => p.classList.toggle('selected', p.dataset.value === value));
}

// --- Country multi-select (Interested / Non Interested Countries) ---
// Clicking the search box shows every country alphabetically with a flag icon;
// typing narrows the list. A country can only live in one of the two lists at
// a time, so adding it to one removes it from the other.
const ALL_COUNTRY_ENTRIES = Object.entries(COUNTRIES).sort((a, b) => a[1].localeCompare(b[1]));

function makeCountryMultiSelect(searchInput, resultsEl, chipsEl, set, getOther) {
  function renderChips() {
    chipsEl.innerHTML = '';
    Array.from(set)
      .sort((a, b) => (COUNTRIES[a] || a).localeCompare(COUNTRIES[b] || b))
      .forEach((code) => {
        const chip = document.createElement('span');
        chip.className = 'tag removable';
        chip.innerHTML = `${getFlagImg(code, 16)} ${escapeHtml(COUNTRIES[code] || code)}<span class="tag-remove">&times;</span>`;
        chip.querySelector('.tag-remove').addEventListener('click', () => {
          set.delete(code);
          renderChips();
        });
        chipsEl.appendChild(chip);
      });
  }

  function renderResults(query) {
    const q = query.trim().toLowerCase();
    resultsEl.innerHTML = '';
    const matches = q ? ALL_COUNTRY_ENTRIES.filter(([, name]) => name.toLowerCase().includes(q)) : ALL_COUNTRY_ENTRIES;

    if (matches.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'search-result-empty';
      empty.textContent = 'No matching country';
      resultsEl.appendChild(empty);
    } else {
      matches.forEach(([code, name]) => {
        const item = document.createElement('div');
        item.className = `search-result-item${set.has(code) ? ' selected' : ''}`;
        item.innerHTML = `${set.has(code) ? '✓ ' : ''}${getFlagImg(code)} ${escapeHtml(name)}`;
        item.addEventListener('click', () => {
          if (set.has(code)) {
            set.delete(code);
          } else {
            set.add(code);
            const other = getOther();
            if (other.set.delete(code)) other.renderChips();
          }
          renderChips();
          renderResults(searchInput.value);
        });
        resultsEl.appendChild(item);
      });
    }
    resultsEl.classList.remove('hidden');
  }

  searchInput.addEventListener('input', () => renderResults(searchInput.value));
  searchInput.addEventListener('focus', () => renderResults(searchInput.value));
  renderChips();

  return { renderChips, renderResults, set };
}

const includeCountryWidget = makeCountryMultiSelect(
  includeCountrySearch, includeCountryResults, includeCountryChips, includeCountries,
  () => excludeCountryWidget
);
const excludeCountryWidget = makeCountryMultiSelect(
  excludeCountrySearch, excludeCountryResults, excludeCountryChips, excludeCountries,
  () => includeCountryWidget
);

document.addEventListener('click', (e) => {
  if (!e.target.closest('.country-search-wrap')) {
    includeCountryResults.classList.add('hidden');
    excludeCountryResults.classList.add('hidden');
  }
});

// --- Custom interest tags (free text, no suggestions) ---
function renderInterestTags() {
  interestTagsEl.innerHTML = '';
  selectedInterests.forEach((interest) => {
    const tag = document.createElement('span');
    tag.className = 'tag removable';
    tag.innerHTML = `${interest}<span class="tag-remove">&times;</span>`;
    tag.querySelector('.tag-remove').addEventListener('click', () => {
      selectedInterests.delete(interest);
      renderInterestTags();
    });
    interestTagsEl.appendChild(tag);
  });
}

interestInput.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const value = interestInput.value.trim();
  if (!value) return;
  selectedInterests.add(value);
  interestInput.value = '';
  renderInterestTags();
});

initPillGroup(genderGroup);
initPillGroup(prefGenderGroup);

autoCallCheckbox.checked = autoCallEnabled;
sideAutoCallCheckbox.checked = autoCallEnabled;

function setAutoCallEnabled(value) {
  autoCallEnabled = value;
  localStorage.setItem('talklive_autocall', autoCallEnabled ? 'on' : 'off');
  autoCallCheckbox.checked = autoCallEnabled;
  sideAutoCallCheckbox.checked = autoCallEnabled;
}

autoCallCheckbox.addEventListener('change', () => setAutoCallEnabled(autoCallCheckbox.checked));
sideAutoCallCheckbox.addEventListener('change', () => setAutoCallEnabled(sideAutoCallCheckbox.checked));

// --- Sound effects (small synthesized tones, no audio files needed) ---
let soundEnabled = localStorage.getItem('talklive_sound') !== 'off';
let sfxCtx = null;

function getSfxCtx() {
  if (!sfxCtx) sfxCtx = new (window.AudioContext || window.webkitAudioContext)();
  return sfxCtx;
}

function playTone(freq, duration, type, volume, delay = 0) {
  if (!soundEnabled) return;
  try {
    const ctx = getSfxCtx();
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  } catch (e) {
    // AudioContext may be unavailable; non-critical
  }
}

function playTapSound() { playTone(520, 0.08, 'square', 0.12); }
function playConnectSound() { playTone(660, 0.12, 'sine', 0.18); playTone(880, 0.15, 'sine', 0.18, 0.12); }
function playHangupSound() { playTone(320, 0.2, 'sine', 0.18); playTone(220, 0.25, 'sine', 0.18, 0.15); }
function playMessageSound() { playTone(950, 0.08, 'triangle', 0.15); }

function updateSoundToggleUi() {
  sfxSettingCheckbox.checked = soundEnabled;
}

function setSoundEnabled(value) {
  soundEnabled = value;
  localStorage.setItem('talklive_sound', soundEnabled ? 'on' : 'off');
  updateSoundToggleUi();
}

sfxSettingCheckbox.addEventListener('change', () => setSoundEnabled(sfxSettingCheckbox.checked));
updateSoundToggleUi();

// --- App settings side panel ---
function openAppSettings() {
  appSettingsPanel.classList.add('open');
  appSettingsOverlay.classList.remove('hidden');
}

function closeAppSettings() {
  appSettingsPanel.classList.remove('open');
  appSettingsOverlay.classList.add('hidden');
}

appSettingsBtn.addEventListener('click', openAppSettings);
closeAppSettingsBtn.addEventListener('click', closeAppSettings);
appSettingsOverlay.addEventListener('click', closeAppSettings);

// --- Filters side panel: who you get matched with ---
function openFilters() {
  filtersPanel.classList.add('open');
  filtersOverlay.classList.remove('hidden');
}

function closeFilters() {
  filtersPanel.classList.remove('open');
  filtersOverlay.classList.add('hidden');
}

filtersBtn.addEventListener('click', openFilters);
closeFiltersBtn.addEventListener('click', closeFilters);
filtersOverlay.addEventListener('click', closeFilters);

// --- Applied filters: the panel's controls are a draft; matching only uses
// what was last saved here (persisted so a Save survives a reload). ---
const FILTERS_STORAGE_KEY = 'talklive_filters';
let appliedFilters = { prefGender: 'any', includeCountries: [], excludeCountries: [], interests: [] };

(function loadAppliedFilters() {
  try {
    const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (raw) appliedFilters = Object.assign(appliedFilters, JSON.parse(raw));
  } catch (e) {
    // ignore malformed/missing storage
  }
})();

function syncFilterDraftUiFromApplied() {
  setPillGroupValue(prefGenderGroup, appliedFilters.prefGender);
  includeCountries.clear();
  (appliedFilters.includeCountries || []).forEach((c) => includeCountries.add(c));
  excludeCountries.clear();
  (appliedFilters.excludeCountries || []).forEach((c) => excludeCountries.add(c));
  includeCountryWidget.renderChips();
  excludeCountryWidget.renderChips();
  selectedInterests.clear();
  (appliedFilters.interests || []).forEach((i) => selectedInterests.add(i));
  renderInterestTags();
}

syncFilterDraftUiFromApplied();

saveFiltersBtn.addEventListener('click', () => {
  appliedFilters = {
    prefGender: prefGenderGroup.dataset.value,
    includeCountries: Array.from(includeCountries),
    excludeCountries: Array.from(excludeCountries),
    interests: Array.from(selectedInterests),
  };
  localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(appliedFilters));
  registerProfile();
  closeFilters();
});

clearFiltersBtn.addEventListener('click', () => {
  setPillGroupValue(prefGenderGroup, 'any');
  includeCountries.clear();
  excludeCountries.clear();
  includeCountryWidget.renderChips();
  excludeCountryWidget.renderChips();
  selectedInterests.clear();
  renderInterestTags();
});

// --- Add Friend: sends a real friend request to the current call partner.
// Works the same whether the partner is a temporary (guest) user or signed in —
// friendship is keyed by their persistent clientId either way. ---
addFriendBtn.addEventListener('click', () => {
  if (!currentPartner || !currentPartner.clientId) return;
  if (addFriendBtn.classList.contains('added')) return; // already sent to this partner
  socket.emit('friend-request', { targetClientId: currentPartner.clientId });
  addFriendBtn.classList.add('added');
  addFriendBtn.disabled = true;
});

socket.on('friend-request-result', ({ ok, error }) => {
  if (!ok && error) showError(error);
});

function openModal(modal) {
  modal.classList.remove('hidden');
}

function closeModal(modal) {
  modal.classList.add('hidden');
}

openTermsLink.addEventListener('click', () => openModal(termsModal));
openTermsLinkFooter.addEventListener('click', () => openModal(termsModal));
closeTermsBtn.addEventListener('click', () => closeModal(termsModal));

[termsModal, accountModal, historyModal, friendsModal, friendChatModal].forEach((modal) => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal(modal);
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal(termsModal);
    closeModal(accountModal);
    closeModal(historyModal);
    closeModal(friendsModal);
    closeModal(notifModal);
    closeModal(friendChatModal);
    closeAppSettings();
    closeFilters();
  }
});

// --- Account (in-memory, no DB yet) ---
function renderAccountState() {
  if (accountNickname) {
    accountLoggedOut.classList.add('hidden');
    accountLoggedIn.classList.remove('hidden');
    accountNicknameDisplay.textContent = accountNickname;
    settingsNickname.value = accountNickname;

    avatarIcon.classList.add('hidden');
    avatarInitial.textContent = accountNickname.trim().charAt(0).toUpperCase();
    avatarInitial.classList.remove('hidden');
    accountBtn.classList.add('logged-in');
  } else {
    accountLoggedOut.classList.remove('hidden');
    accountLoggedIn.classList.add('hidden');

    avatarIcon.classList.remove('hidden');
    avatarInitial.classList.add('hidden');
    accountBtn.classList.remove('logged-in');
  }
}

function showAccountStatus(msg, kind) {
  accountStatus.textContent = msg;
  accountStatus.className = `account-status ${kind}`;
  accountStatus.classList.remove('hidden');
}

accountBtn.addEventListener('click', () => {
  closeAppSettings();
  renderAccountState();
  openModal(accountModal);
});
closeAccountBtn.addEventListener('click', () => closeModal(accountModal));

accountTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    accountTabs.forEach((t) => t.classList.remove('selected'));
    tab.classList.add('selected');
    loginTab.classList.toggle('hidden', tab.dataset.tab !== 'login');
    signupTab.classList.toggle('hidden', tab.dataset.tab !== 'signup');
    accountStatus.classList.add('hidden');
  });
});

loginSubmitBtn.addEventListener('click', () => {
  socket.emit('login', { username: loginUsername.value.trim(), password: loginPassword.value });
});

signupSubmitBtn.addEventListener('click', () => {
  socket.emit('signup', {
    username: signupUsername.value.trim(),
    password: signupPassword.value,
    nickname: signupNickname.value.trim(),
  });
});

logoutBtn.addEventListener('click', () => {
  socket.emit('logout');
  accountNickname = null;
  localStorage.removeItem('talklive_nickname');
  renderAccountState();
});

updateNicknameBtn.addEventListener('click', () => {
  socket.emit('update-nickname', { nickname: settingsNickname.value.trim() });
});

changePasswordBtn.addEventListener('click', () => {
  socket.emit('change-password', {
    currentPassword: currentPasswordInput.value,
    newPassword: newPasswordInput.value,
  });
});

socket.on('login-result', ({ ok, nickname, error }) => {
  if (!ok) return showAccountStatus(error, 'error');
  localStorage.setItem('talklive_nickname', nickname);
  showAccountStatus(`Logged in as ${nickname}`, 'success');
  setTimeout(() => location.reload(), 500);
});

socket.on('signup-result', ({ ok, nickname, error }) => {
  if (!ok) return showAccountStatus(error, 'error');
  localStorage.setItem('talklive_nickname', nickname);
  showAccountStatus(`Account created — welcome, ${nickname}!`, 'success');
  setTimeout(() => location.reload(), 500);
});

socket.on('update-nickname-result', ({ ok, nickname, error }) => {
  if (!ok) return showAccountStatus(error, 'error');
  accountNickname = nickname;
  localStorage.setItem('talklive_nickname', nickname);
  renderAccountState();
  showAccountStatus('Nickname updated.', 'success');
});

socket.on('change-password-result', ({ ok, error }) => {
  if (!ok) return showAccountStatus(error, 'error');
  currentPasswordInput.value = '';
  newPasswordInput.value = '';
  showAccountStatus('Password changed.', 'success');
});

// --- Friends ---
friendsBtn.addEventListener('click', () => openModal(friendsModal));
closeFriendsBtn.addEventListener('click', () => closeModal(friendsModal));

friendsTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    friendsTabs.forEach((t) => t.classList.remove('selected'));
    tab.classList.add('selected');
    friendsListPanel.classList.toggle('hidden', tab.dataset.tab !== 'list');
    friendRequestsPanel.classList.toggle('hidden', tab.dataset.tab !== 'requests');
  });
});

function friendBadge(temporary) {
  return `<span class="friend-badge ${temporary ? 'temp' : 'account'}">${temporary ? 'Temporary' : 'Signed in'}</span>`;
}

function renderFriendsList() {
  if (friendsData.length === 0) {
    friendsList.innerHTML = '<p class="history-empty">No friends yet. Tap "Add friend" during a call to send a request.</p>';
    return;
  }
  friendsList.innerHTML = '';
  friendsData.forEach((f) => {
    const unread = unreadCountFor(f.clientId);
    const item = document.createElement('div');
    item.className = 'friend-item';
    item.innerHTML = `
      <div class="friend-item-info">
        <span class="friend-online-dot ${f.online ? 'online' : ''}" title="${f.online ? 'Online' : 'Offline'}"></span>
        <span class="friend-item-name">${getFlagImg(f.countryCode)} ${escapeHtml(f.username)}</span>
        ${friendBadge(f.temporary)}
        ${unread > 0 ? `<span class="unread-badge">${unread}</span>` : ''}
      </div>
      <div class="friend-item-actions">
        <button type="button" class="btn-chip friend-chat-btn" data-id="${f.clientId}" title="Chat">${ICONS.chat} Chat</button>
        <button type="button" class="btn-chip friend-block-btn" data-id="${f.clientId}" title="Block">${ICONS.block} Block</button>
        <button type="button" class="btn-chip friend-remove-btn" data-id="${f.clientId}" title="Remove">${ICONS.close} Remove</button>
      </div>
    `;
    friendsList.appendChild(item);
  });
}

function renderFriendRequests() {
  friendReqCount.textContent = friendRequestsData.length;
  friendReqCount.classList.toggle('hidden', friendRequestsData.length === 0);

  if (friendRequestsData.length === 0) {
    friendRequestsList.innerHTML = '<p class="history-empty">No pending requests.</p>';
    return;
  }
  friendRequestsList.innerHTML = '';
  friendRequestsData.forEach((r) => {
    const item = document.createElement('div');
    item.className = 'friend-item';
    item.innerHTML = `
      <div class="friend-item-info">
        <span class="friend-item-name">${getFlagImg(r.countryCode)} ${escapeHtml(r.username)}</span>
        ${friendBadge(r.temporary)}
      </div>
      <div class="friend-item-actions">
        <button type="button" class="btn-chip btn-chip-accept friend-confirm-btn" data-id="${r.clientId}">${ICONS.check} Confirm</button>
        <button type="button" class="btn-chip friend-dismiss-btn" data-id="${r.clientId}">${ICONS.close} Dismiss</button>
      </div>
    `;
    friendRequestsList.appendChild(item);
  });
}

friendsList.addEventListener('click', (e) => {
  const chatBtn = e.target.closest('.friend-chat-btn');
  const blockBtn = e.target.closest('.friend-block-btn');
  const removeBtn = e.target.closest('.friend-remove-btn');
  const nameArea = e.target.closest('.friend-item-info');
  if (chatBtn) {
    openFriendChat(chatBtn.dataset.id);
  } else if (nameArea && !blockBtn && !removeBtn) {
    const row = nameArea.closest('.friend-item');
    const id = row.querySelector('.friend-chat-btn')?.dataset.id;
    if (id) openFriendChat(id);
  } else if (blockBtn) {
    if (!confirm('Block this friend? They will be removed and you will not be matched with them again.')) return;
    socket.emit('block-friend', { friendClientId: blockBtn.dataset.id });
  } else if (removeBtn) {
    if (!confirm('Remove this friend?')) return;
    socket.emit('remove-friend', { friendClientId: removeBtn.dataset.id });
  }
});

friendRequestsList.addEventListener('click', (e) => {
  const confirmBtn = e.target.closest('.friend-confirm-btn');
  const dismissBtn = e.target.closest('.friend-dismiss-btn');
  if (confirmBtn) {
    socket.emit('friend-request-respond', { fromClientId: confirmBtn.dataset.id, accept: true });
  } else if (dismissBtn) {
    socket.emit('friend-request-respond', { fromClientId: dismissBtn.dataset.id, accept: false });
  }
});

socket.on('state-sync', ({ friends: friendList, friendRequests: requestList, notifications: notifList } = {}) => {
  friendsData = friendList || [];
  friendRequestsData = requestList || [];
  notifData = notifList || [];
  renderFriendsList();
  renderFriendRequests();
  renderNotifications();
});

// --- Notifications bell: dropdown anchored under the icon, not a floating modal ---
notifBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (notifModal.classList.contains('hidden')) openModal(notifModal);
  else closeModal(notifModal);
});
closeNotifBtn.addEventListener('click', () => closeModal(notifModal));
document.addEventListener('click', (e) => {
  // Use composedPath (captured at dispatch time) instead of e.target.closest —
  // action buttons inside the list re-render notifList on click, which detaches
  // the clicked button before this bubbles up, making closest() wrongly report
  // "outside" and close the panel right after Confirm/Dismiss/etc.
  if (!e.composedPath().includes(notifWrap)) closeModal(notifModal);
});

function notifIcon(type) {
  switch (type) {
    case 'friend_request': return ICONS.person;
    case 'friend_accepted': return ICONS.checkCircle;
    case 'call_back_request': return ICONS.call;
    default: return ICONS.bell;
  }
}

function notifText(n) {
  switch (n.type) {
    case 'friend_request': return `${escapeHtml(n.username)} wants to be friends`;
    case 'friend_accepted': return `${escapeHtml(n.username)} accepted your friend request`;
    case 'call_back_request': return `${escapeHtml(n.username)} wants to call you back`;
    default: return 'Notification';
  }
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function removeNotifLocal(id) {
  notifData = notifData.filter((n) => n.id !== id);
  renderNotifications();
}

// --- Unread messages live on the Friends button/list instead of the requests bell ---
function unreadCountFor(friendClientId) {
  return notifData.filter((n) => n.type === 'message' && n.fromClientId === friendClientId).length;
}

function totalUnreadMessages() {
  return notifData.filter((n) => n.type === 'message').length;
}

function updateFriendsMsgBadge() {
  const count = totalUnreadMessages();
  friendsMsgBadge.textContent = count;
  friendsMsgBadge.classList.toggle('hidden', count === 0);
}

// The bell/requests dropdown only ever shows actionable requests (friend
// requests, accepted-friend confirmations, call-back requests) — new message
// notifications surface as unread badges on the Friends button/list instead.
function renderNotifications() {
  const visible = notifData.filter((n) => n.type !== 'message');
  notifBadge.textContent = visible.length;
  notifBadge.classList.toggle('hidden', visible.length === 0);

  if (visible.length === 0) {
    notifList.innerHTML = '<p class="history-empty">No requests yet.</p>';
  } else {
    notifList.innerHTML = '';
    [...visible].reverse().forEach((n) => {
      const item = document.createElement('div');
      item.className = 'notif-item';
      let actions = '';
      if (n.type === 'friend_request') {
        actions = `
          <button type="button" class="btn-chip btn-chip-accept notif-confirm-btn" data-id="${n.id}" data-from="${n.fromClientId}">${ICONS.check} Confirm</button>
          <button type="button" class="btn-chip notif-dismiss-btn" data-id="${n.id}" data-from="${n.fromClientId}">${ICONS.close} Dismiss</button>
        `;
      } else if (n.type === 'call_back_request') {
        actions = `
          <button type="button" class="btn-chip btn-chip-accept notif-callback-accept-btn" data-id="${n.id}" data-from="${n.fromClientId}">${ICONS.call} Call back</button>
          <button type="button" class="btn-chip notif-callback-decline-btn" data-id="${n.id}" data-from="${n.fromClientId}">${ICONS.close} Dismiss</button>
        `;
      } else {
        actions = `<button type="button" class="btn-chip notif-clear-btn" data-id="${n.id}">${ICONS.close} Dismiss</button>`;
      }
      item.innerHTML = `
        <div class="notif-item-icon">${notifIcon(n.type)}</div>
        <div class="notif-item-body">
          <div class="notif-item-text">${notifText(n)}</div>
          <div class="notif-item-time">${timeAgo(n.ts)}</div>
          <div class="notif-item-actions">${actions}</div>
        </div>
      `;
      notifList.appendChild(item);
    });
  }

  updateFriendsMsgBadge();
  renderFriendsList();
}

notifList.addEventListener('click', (e) => {
  const confirmBtn = e.target.closest('.notif-confirm-btn');
  const dismissBtn = e.target.closest('.notif-dismiss-btn');
  const clearBtn = e.target.closest('.notif-clear-btn');
  const cbAccept = e.target.closest('.notif-callback-accept-btn');
  const cbDecline = e.target.closest('.notif-callback-decline-btn');

  if (confirmBtn) {
    socket.emit('friend-request-respond', { fromClientId: confirmBtn.dataset.from, accept: true, notificationId: confirmBtn.dataset.id });
    removeNotifLocal(confirmBtn.dataset.id);
  } else if (dismissBtn) {
    socket.emit('friend-request-respond', { fromClientId: dismissBtn.dataset.from, accept: false, notificationId: dismissBtn.dataset.id });
    removeNotifLocal(dismissBtn.dataset.id);
  } else if (clearBtn) {
    socket.emit('clear-notification', { notificationId: clearBtn.dataset.id });
    removeNotifLocal(clearBtn.dataset.id);
  } else if (cbAccept) {
    acceptCallBack(cbAccept.dataset.from);
    removeNotifLocal(cbAccept.dataset.id);
  } else if (cbDecline) {
    socket.emit('call-back-respond', { fromClientId: cbDecline.dataset.from, accept: false });
    removeNotifLocal(cbDecline.dataset.id);
  }
});

socket.on('notification', (n) => {
  notifData.push(n);
  renderNotifications();
  if (n.type === 'call_back_request') {
    showCallBackBanner(n.fromClientId, n.username);
  }
});

// --- Friend-to-friend chat ---
function renderFriendChatMessages() {
  const messages = friendChatCache.get(activeFriendChatId) || [];
  friendChatMessages.innerHTML = '';
  if (messages.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'history-empty';
    empty.textContent = 'No messages yet. Say hi!';
    friendChatMessages.appendChild(empty);
    return;
  }
  messages.forEach((m) => {
    const el = document.createElement('div');
    el.className = `chat-msg ${m.from === getClientId() ? 'me' : 'them'}`;
    el.textContent = m.text;
    friendChatMessages.appendChild(el);
  });
  friendChatMessages.scrollTop = friendChatMessages.scrollHeight;
}

function openFriendChat(friendClientId) {
  activeFriendChatId = friendClientId;
  const friend = friendsData.find((f) => f.clientId === friendClientId);
  friendChatTitle.textContent = friend ? `Chat with ${friend.username}` : 'Chat';
  closeModal(notifModal);
  closeModal(friendsModal);
  openModal(friendChatModal);

  socket.emit('get-friend-chat', { friendClientId });
  socket.emit('mark-messages-read', { friendClientId });
  notifData = notifData.filter((n) => !(n.type === 'message' && n.fromClientId === friendClientId));
  renderNotifications();
  renderFriendChatMessages();
  friendChatInput.focus();
}

closeFriendChatBtn.addEventListener('click', () => {
  closeModal(friendChatModal);
  activeFriendChatId = null;
});

friendChatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = friendChatInput.value.trim();
  if (!text || !activeFriendChatId) return;
  socket.emit('friend-message', { toClientId: activeFriendChatId, text });
  friendChatInput.value = '';
});

socket.on('friend-message', ({ fromClientId, text, ts }) => {
  const cache = friendChatCache.get(fromClientId) || [];
  cache.push({ from: fromClientId, text, ts });
  friendChatCache.set(fromClientId, cache);
  if (activeFriendChatId === fromClientId && !friendChatModal.classList.contains('hidden')) {
    renderFriendChatMessages();
    socket.emit('mark-messages-read', { friendClientId: fromClientId });
  }
});

socket.on('friend-message-sent', ({ toClientId, text, ts }) => {
  const cache = friendChatCache.get(toClientId) || [];
  cache.push({ from: getClientId(), text, ts });
  friendChatCache.set(toClientId, cache);
  if (activeFriendChatId === toClientId) renderFriendChatMessages();
});

socket.on('friend-chat-history', ({ friendClientId, messages }) => {
  friendChatCache.set(friendClientId, messages || []);
  if (activeFriendChatId === friendClientId) renderFriendChatMessages();
});

// --- Call history (session-only, cleared on reload) ---
function renderHistory() {
  if (callHistory.length === 0) {
    historyList.innerHTML = '<p class="history-empty">No calls yet.</p>';
    return;
  }
  historyList.innerHTML = '';
  [...callHistory].reverse().forEach((entry) => {
    const item = document.createElement('div');
    item.className = 'history-item';
    const mins = Math.floor(entry.durationSeconds / 60);
    const secs = entry.durationSeconds % 60;
    const callBackBtn = entry.clientId
      ? `<button type="button" class="call-back-btn" data-id="${entry.clientId}" data-name="${escapeHtml(entry.username)}" title="Call ${escapeHtml(entry.username)} back" aria-label="Call back">
          <svg viewBox="0 0 24 24" fill="white" aria-hidden="true"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
        </button>`
      : '';
    item.innerHTML = `
      <span class="history-item-name">${getFlagImg(entry.countryCode)} ${escapeHtml(entry.username)}</span>
      <span class="history-item-right">
        <span class="history-item-duration">${mins}:${secs.toString().padStart(2, '0')}</span>
        ${callBackBtn}
      </span>
    `;
    historyList.appendChild(item);
  });
}

function recordCallHistory() {
  if (!currentPartner || !callStartedAt) return;
  const durationSeconds = Math.floor((Date.now() - callStartedAt) / 1000);
  if (durationSeconds < 1) return;
  callHistory.push({
    username: currentPartner.username,
    countryCode: currentPartner.countryCode,
    clientId: currentPartner.clientId,
    durationSeconds,
  });
  renderHistory();
}

historyBtn.addEventListener('click', () => {
  renderHistory();
  openModal(historyModal);
});
closeHistoryBtn.addEventListener('click', () => closeModal(historyModal));

historyList.addEventListener('click', (e) => {
  const btn = e.target.closest('.call-back-btn');
  if (!btn || !btn.dataset.id) return;
  closeModal(historyModal);
  requestCallBack(btn.dataset.id, btn.dataset.name);
});

// Wraps 'register' so we can safely re-send the same payload after a socket
// reconnect (mobile browsers frequently drop/re-open the socket, e.g. when
// backgrounded, without a full page reload). Without re-registering, the
// server's clientId -> socketId map goes stale and friend messages/notifications
// sent to this device silently fail to arrive until the page is reloaded.
let lastRegisterPayload = null;
function registerClient(payload) {
  lastRegisterPayload = payload;
  socket.emit('register', payload);
}

registerClient({ clientId: getClientId(), nickname: accountNickname || undefined });
renderAccountState();

socket.on('profile', (profile) => {
  myProfile = profile;
});

// --- State helpers ---
function setState(state) {
  orb.className = `orb ${state}`;
}

// green = connected, orange = searching/reconnecting, red = disconnected/skipped
function setConnection(color, label) {
  connectionIndicator.classList.remove('hidden');
  connectionDot.className = `connection-dot ${color}`;
  connectionLabel.textContent = label;
  const connected = color === 'green';
  chatToggleBtn.disabled = !connected;
  chatInput.disabled = !connected;
  chatSendBtn.disabled = !connected;

  if (connected && !wasConnected) {
    connectFlash.classList.remove('playing');
    // Force reflow so the animation replays every time we (re)connect.
    void connectFlash.offsetWidth;
    connectFlash.classList.add('playing');
    playConnectSound();
  }
  wasConnected = connected;
}

function hideConnection() {
  connectionIndicator.classList.add('hidden');
}

function startCallTimer() {
  callStartedAt = Date.now();
  callTimerEl.classList.remove('hidden');
  clearInterval(callTimerInterval);
  callTimerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - callStartedAt) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    callTimerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
  }, 1000);
}

function stopCallTimer() {
  clearInterval(callTimerInterval);
  callTimerInterval = null;
  callStartedAt = null;
  callTimerEl.classList.add('hidden');
  callTimerEl.textContent = '0:00';
}

let skipCountdownInterval = null;

function lockSkipButton() {
  skipBtn.disabled = true;
  clearTimeout(skipUnlockTimeout);
  clearInterval(skipCountdownInterval);

  const unlockAt = Date.now() + MIN_CALL_SECONDS_BEFORE_SKIP * 1000;

  skipCountdownInterval = setInterval(() => {
    const remaining = Math.max(0, unlockAt - Date.now());
    skipLabel.textContent = (remaining / 1000).toFixed(1) + 's';
    if (remaining <= 0) {
      clearInterval(skipCountdownInterval);
      skipLabel.textContent = 'Next';
    }
  }, 33);

  skipUnlockTimeout = setTimeout(() => {
    skipBtn.disabled = false;
    clearInterval(skipCountdownInterval);
    skipLabel.textContent = 'Next';
  }, MIN_CALL_SECONDS_BEFORE_SKIP * 1000);
}

function unlockSkipButton() {
  clearTimeout(skipUnlockTimeout);
  clearInterval(skipCountdownInterval);
  skipBtn.disabled = false;
  skipLabel.textContent = 'Next';
}

function showReactionFloat(reaction) {
  const el = document.createElement('div');
  el.className = 'reaction-float';
  el.dataset.reaction = reaction;
  el.innerHTML = REACTION_ICONS[reaction] || '';
  el.style.left = `${40 + Math.random() * 20}%`;
  reactionOverlay.appendChild(el);
  setTimeout(() => el.remove(), 1800);
}

reactionBar.addEventListener('click', (e) => {
  const btn = e.target.closest('.reaction-btn');
  if (!btn) return;
  const reaction = btn.dataset.reaction;
  socket.emit('reaction', reaction);
  showReactionFloat(reaction);
});

function showError(msg) {
  const target = setupPanel.classList.contains('hidden') ? errorText : setupErrorText;
  target.textContent = msg;
  target.classList.remove('hidden');
}

function clearError() {
  errorText.classList.add('hidden');
  errorText.textContent = '';
  setupErrorText.classList.add('hidden');
  setupErrorText.textContent = '';
}

function addChatMessage(text, kind) {
  const el = document.createElement('div');
  el.className = `chat-msg ${kind}`;
  el.textContent = text;
  chatMessages.appendChild(el);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function clearChat() {
  chatMessages.innerHTML = '';
  typingIndicator.classList.add('hidden');
  chatTypingBadge.classList.add('hidden');
}

async function getMic() {
  if (localStream) return localStream;
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  });
  return localStream;
}

let connectWatchdog = null;
let iceRestartAttempted = false;

function clearConnectWatchdog() {
  clearTimeout(connectWatchdog);
  connectWatchdog = null;
}

function createPeerConnection(isInitiator) {
  const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS, iceCandidatePoolSize: 10 });

  localStream.getTracks().forEach((track) => peer.addTrack(track, localStream));

  peer.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('signal', { type: 'ice-candidate', candidate: event.candidate });
    }
  };

  peer.ontrack = (event) => {
    remoteAudio.srcObject = event.streams[0];
    setState('connected');
    statusText.textContent = "You're connected";
    subText.textContent = 'Say hi! Tap "Next" to skip, or "Hang Up" to leave.';
    monitorRemoteAudio(event.streams[0]);
    // Receiving the remote track is itself proof of a live connection, even if
    // iceConnectionState hasn't caught up yet (e.g. TURN relay finalizing) —
    // don't let the watchdog treat that lag as a failed connection.
    setConnection('green', 'Connected');
    clearConnectWatchdog();
  };

  // If a call never fully connects (common with flaky free TURN relays across
  // distant networks), automatically move on to a new match instead of getting
  // stuck silently with no audio.
  clearConnectWatchdog();
  iceRestartAttempted = false;
  connectWatchdog = setTimeout(() => {
    const state = peer.iceConnectionState;
    if (state !== 'connected' && state !== 'completed') {
      showError("Couldn't connect to that stranger — finding someone new…");
      performSkip();
    }
  }, 10000);

  peer.oniceconnectionstatechange = () => {
    const iceState = peer.iceConnectionState;
    if (iceState === 'connected' || iceState === 'completed') {
      setConnection('green', 'Connected');
      clearConnectWatchdog();
    } else if (iceState === 'checking') {
      setConnection('orange', 'Connecting');
    } else if (iceState === 'disconnected') {
      setConnection('orange', 'Reconnecting');
    } else if (iceState === 'failed') {
      if (isInitiator && !iceRestartAttempted) {
        iceRestartAttempted = true;
        setConnection('orange', 'Reconnecting');
        peer.createOffer({ iceRestart: true }).then((offer) => {
          return peer.setLocalDescription(offer);
        }).then(() => {
          socket.emit('signal', { type: 'offer', sdp: peer.localDescription });
        }).catch(() => {
          setConnection('red', 'Disconnected');
        });
      } else {
        setConnection('red', 'Disconnected');
      }
    } else if (iceState === 'closed') {
      setConnection('red', 'Disconnected');
      clearConnectWatchdog();
    }
  };

  return peer;
}

function monitorRemoteAudio(stream) {
  clearInterval(speakingCheckInterval);
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    speakingCheckInterval = setInterval(() => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      const level = Math.min(1, avg / 90); // 0..1 normalized volume
      orb.classList.toggle('speaking', avg > 12);

      // Drive the background rings from live audio amplitude, not a fixed loop.
      orbRings.forEach((ring, i) => {
        const scale = 1 + level * (0.5 + i * 0.25);
        ring.style.transform = `scale(${scale})`;
        ring.style.opacity = String(Math.max(0.15, 0.7 - level * 0.1 - i * 0.15) * (0.4 + level));
        ring.style.borderColor = level > 0.15
          ? 'rgba(0, 212, 255, 0.6)'
          : 'rgba(108, 92, 231, 0.35)';
      });

    }, 100);
  } catch (e) {
    // AudioContext may be unavailable; non-critical
  }
}

async function startCall(initiator) {
  pc = createPeerConnection(initiator);
  if (initiator) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('signal', { type: 'offer', sdp: offer });
  }
}

async function handleSignal(data) {
  if (!pc) return;
  if (data.type === 'offer') {
    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('signal', { type: 'answer', sdp: answer });
  } else if (data.type === 'answer') {
    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
  } else if (data.type === 'ice-candidate') {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (e) {
      // ignore late candidates
    }
  }
}

function teardownPeer() {
  recordCallHistory();
  currentPartner = null;
  clearConnectWatchdog();
  clearInterval(speakingCheckInterval);
  orb.classList.remove('speaking');
  orbRings.forEach((ring) => {
    ring.style.transform = '';
    ring.style.opacity = '';
    ring.style.borderColor = '';
  });
  if (pc) {
    pc.onicecandidate = null;
    pc.ontrack = null;
    pc.close();
    pc = null;
  }
  remoteAudio.srcObject = null;
  partnerCard.classList.add('hidden');
  sharedInterestNote.classList.add('hidden');
  reactionBar.classList.add('hidden');
  stopCallTimer();
  lockSkipButton();
}

function resetUI() {
  teardownPeer();
  isSearching = false;
  setState('idle');
  statusText.textContent = 'Tap start to talk to a random stranger';
  subText.textContent = 'Audio only · No sign up · No registration';
  callPanel.classList.add('hidden');
  setupPanel.classList.remove('hidden');
  startBtn.disabled = false;
  chatPanel.classList.add('hidden');
  chatOpen = false;
  clearChat();
  hideConnection();
  skipBtn.classList.add('hidden');
  muteBtn.classList.add('hidden');
  chatToggleBtn.classList.add('hidden');
  reportBtn.classList.add('hidden');
  addFriendBtn.classList.add('hidden');
  primaryControls.classList.add('hidden');
  autoCallRow.classList.add('hidden');
  quickGuide.classList.remove('hidden');
  appSettingsBtn.classList.add('hidden');
  historyBtn.classList.add('hidden');
  friendsBtn.classList.add('hidden');
  notifBtn.classList.add('hidden');
  accountBtn.classList.add('hidden');
  filtersBtn.classList.add('hidden');
}

function registerProfile() {
  registerClient({
    clientId: getClientId(),
    gender: genderGroup.dataset.value,
    prefGender: appliedFilters.prefGender,
    includeCountries: appliedFilters.includeCountries,
    excludeCountries: appliedFilters.excludeCountries,
    interests: appliedFilters.interests,
    nickname: accountNickname || undefined,
  });
}

function enterCallUI() {
  setupPanel.classList.add('hidden');
  callPanel.classList.remove('hidden');
  skipBtn.classList.remove('hidden');
  muteBtn.classList.remove('hidden');
  chatToggleBtn.classList.remove('hidden');
  reportBtn.classList.remove('hidden');
  addFriendBtn.classList.remove('hidden');
  primaryControls.classList.remove('hidden');
  autoCallRow.classList.remove('hidden');
  quickGuide.classList.add('hidden');
  appSettingsBtn.classList.remove('hidden');
  historyBtn.classList.remove('hidden');
  friendsBtn.classList.remove('hidden');
  notifBtn.classList.remove('hidden');
  accountBtn.classList.remove('hidden');
  filtersBtn.classList.remove('hidden');
}

async function begin() {
  if (startBtn.disabled) return;
  startBtn.disabled = true;
  clearError();
  try {
    await getMic();
  } catch (e) {
    startBtn.disabled = false;
    if (e.name === 'NotAllowedError' || e.name === 'SecurityError') {
      showError('Microphone access is blocked for this site. Click the padlock/camera icon in your browser\'s address bar, allow the microphone, then reload the page.');
    } else if (e.name === 'NotFoundError') {
      showError('No microphone was found. Please connect a microphone and try again.');
    } else if (e.name === 'NotReadableError') {
      showError('Your microphone is already in use by another app or tab. Close it and try again.');
    } else {
      showError('Microphone access is required to use TalkLive.');
    }
    return;
  }

  registerProfile();

  isSearching = true;
  enterCallUI();
  setState('waiting');
  setConnection('orange', 'Searching');
  statusText.textContent = 'Looking for someone to talk to…';
  subText.textContent = 'Hang tight, this only takes a moment';

  socket.emit('find-partner');
}

const ageConsentModal = document.getElementById('ageConsentModal');
const openTermsFromConsent = document.getElementById('openTermsFromConsent');
const ageAgreeBtn = document.getElementById('ageAgreeBtn');
const CONSENT_KEY = 'talklive_age_consent';

startBtn.addEventListener('click', () => {
  playTapSound();
  if (localStorage.getItem(CONSENT_KEY) === 'yes') {
    begin();
  } else {
    openModal(ageConsentModal);
  }
});

openTermsFromConsent.addEventListener('click', () => openModal(termsModal));

ageAgreeBtn.addEventListener('click', () => {
  localStorage.setItem(CONSENT_KEY, 'yes');
  closeModal(ageConsentModal);
  begin();
});

function performSkip() {
  teardownPeer();
  clearChat();
  setState('waiting');
  setConnection('red', 'Skipped');
  statusText.textContent = 'Finding a new stranger…';
  subText.textContent = 'Hang tight, this only takes a moment';
  socket.emit('skip');
  setTimeout(() => setConnection('orange', 'Searching'), 600);
}

skipBtn.addEventListener('click', performSkip);

stopBtn.addEventListener('click', () => {
  playHangupSound();
  socket.emit('leave');
  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }
  resetUI();
});

reportBtn.addEventListener('click', () => {
  if (!confirm('Report and block this stranger? You will not be matched with them again.')) return;
  teardownPeer();
  clearChat();
  setState('waiting');
  setConnection('red', 'Reported');
  statusText.textContent = 'Reported. Finding someone new…';
  socket.emit('report');
  setTimeout(() => setConnection('orange', 'Searching'), 600);
});

muteBtn.addEventListener('click', () => {
  if (!localStream) return;
  isMuted = !isMuted;
  localStream.getAudioTracks().forEach((t) => (t.enabled = !isMuted));
  muteBtn.classList.toggle('muted', isMuted);
  muteSlash.classList.toggle('hidden', !isMuted);
  socket.emit('mic-state', isMuted);
});

chatToggleBtn.addEventListener('click', () => {
  chatOpen = !chatOpen;
  chatPanel.classList.toggle('hidden', !chatOpen);
  if (chatOpen) {
    chatInput.focus();
    chatBadge.classList.add('hidden');
    chatTypingBadge.classList.add('hidden');
  }
});

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  addChatMessage(text, 'me');
  socket.emit('chat-message', text);
  chatInput.value = '';
});

// --- Typing indicator ---
let typingSendThrottle = null;
chatInput.addEventListener('input', () => {
  if (typingSendThrottle) return;
  socket.emit('typing');
  typingSendThrottle = setTimeout(() => {
    typingSendThrottle = null;
  }, 1500);
});

let typingHideTimeout = null;
socket.on('typing', () => {
  typingIndicator.classList.remove('hidden');
  if (!chatOpen) chatTypingBadge.classList.remove('hidden');
  clearTimeout(typingHideTimeout);
  typingHideTimeout = setTimeout(() => {
    typingIndicator.classList.add('hidden');
    chatTypingBadge.classList.add('hidden');
  }, 3000);
});

// --- Socket events ---
socket.on('online-count', (count) => {
  onlineCountEl.textContent = count;
});

socket.on('waiting', ({ estimatedSeconds } = {}) => {
  setState('waiting');
  setConnection('orange', 'Searching');
  statusText.textContent = 'Looking for someone to talk to…';
  subText.textContent = estimatedSeconds
    ? `Usually matches in about ${estimatedSeconds}s`
    : 'Hang tight, this only takes a moment';
});

// Server gives up on the "Interested Countries" filter for this search after a
// long wait and widens the pool to anyone, so the user isn't stuck waiting forever.
socket.on('country-fallback', () => {
  subText.textContent = "Not many people online in your preferred countries — connecting you with anyone.";
});

socket.on('matched', async ({ initiator, partner, rematched, callback }) => {
  // Never let a mute from a previous call silently carry into a new one.
  if (isMuted) {
    isMuted = false;
    if (localStream) localStream.getAudioTracks().forEach((t) => (t.enabled = true));
    muteBtn.classList.remove('muted');
    muteSlash.classList.add('hidden');
    socket.emit('mic-state', false);
  }

  setState('connected');
  setConnection('orange', 'Connecting');
  statusText.textContent = callback ? `Calling ${partner.username} back…` : `Connecting to someone in ${partner.country}…`;
  subText.textContent = rematched ? "You both liked your last chat — you're reconnected!" : '';

  currentPartner = partner;
  addFriendBtn.classList.remove('added');
  addFriendBtn.disabled = false;
  partnerName.textContent = partner.username;
  const rawGender = partner.gender && partner.gender !== 'unspecified' ? partner.gender : '';
  const genderLabel = rawGender ? ` · ${escapeHtml(rawGender[0].toUpperCase() + rawGender.slice(1))}` : '';
  partnerMeta.innerHTML = `${getFlagImg(partner.countryCode)}${genderLabel}`;

  partnerInterests.innerHTML = '';
  currentPartnerInterests = partner.interests || [];
  currentPartnerInterests.forEach((i) => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = i;
    partnerInterests.appendChild(tag);
  });
  partnerCard.classList.remove('hidden');

  const shared = currentPartnerInterests.filter((i) => (appliedFilters.interests || []).includes(i));
  if (shared.length > 0) {
    sharedInterestNote.textContent = `Both of you like ${shared.join(', ')}`;
    sharedInterestNote.classList.remove('hidden');
  } else {
    sharedInterestNote.classList.add('hidden');
  }

  reactionBar.classList.remove('hidden');
  startCallTimer();
  lockSkipButton();

  await startCall(initiator);
});

socket.on('reaction', (reaction) => {
  showReactionFloat(reaction);
});

socket.on('banned', () => {
  showError('You have been banned after repeated reports.');
  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }
  resetUI();
});

// --- Call back: re-connect directly with someone from Call History ---
function showCallBackBanner(fromClientId, username) {
  pendingCallBackFrom = fromClientId;
  callBackBannerText.innerHTML = `${ICONS.call} ${escapeHtml(username)} wants to call you back`;
  callBackBanner.classList.remove('hidden');
}

function hideCallBackBanner() {
  callBackBanner.classList.add('hidden');
  pendingCallBackFrom = null;
}

async function requestCallBack(targetClientId, targetUsername) {
  if (isSearching) {
    showError('Hang up or finish your current call before calling someone back.');
    return;
  }
  clearError();
  try {
    await getMic();
  } catch (e) {
    showError('Microphone access is required to call back.');
    return;
  }

  registerProfile();
  isSearching = true;
  enterCallUI();
  setState('waiting');
  setConnection('orange', 'Calling');
  statusText.textContent = `Calling ${targetUsername}…`;
  subText.textContent = 'Waiting for them to accept…';

  socket.emit('call-back-request', { targetClientId });
}

async function acceptCallBack(fromClientId) {
  if (isSearching) {
    socket.emit('call-back-respond', { fromClientId, accept: false });
    showError('Finish your current call before accepting a call back.');
    return;
  }
  clearError();
  try {
    await getMic();
  } catch (e) {
    socket.emit('call-back-respond', { fromClientId, accept: false });
    showError('Microphone access is required to accept the call.');
    return;
  }

  registerProfile();
  isSearching = true;
  enterCallUI();
  setState('waiting');
  setConnection('orange', 'Connecting');
  statusText.textContent = 'Connecting…';
  subText.textContent = '';

  socket.emit('call-back-respond', { fromClientId, accept: true });
}

function abandonCallBack() {
  isSearching = false;
  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }
  resetUI();
}

callBackAcceptBtn.addEventListener('click', () => {
  if (!pendingCallBackFrom) return;
  const fromClientId = pendingCallBackFrom;
  hideCallBackBanner();
  acceptCallBack(fromClientId);
});

callBackDeclineBtn.addEventListener('click', () => {
  if (!pendingCallBackFrom) return;
  socket.emit('call-back-respond', { fromClientId: pendingCallBackFrom, accept: false });
  hideCallBackBanner();
});

socket.on('call-back-request', ({ fromClientId, username }) => {
  showCallBackBanner(fromClientId, username);
});

socket.on('call-back-request-result', ({ ok, reason }) => {
  if (ok) return;
  abandonCallBack();
  if (reason === 'offline') showError("That person isn't online right now. Try again later.");
  else if (reason === 'busy') showError('That person is currently on another call.');
  else if (reason === 'blocked') showError('You can no longer contact this person.');
  else showError('Could not start the call back.');
});

socket.on('call-back-declined', ({ username }) => {
  abandonCallBack();
  showError(`${username} declined the call back.`);
});

socket.on('signal', (data) => {
  handleSignal(data);
});

socket.on('partner-left', () => {
  playHangupSound();
  teardownPeer();
  clearChat();
  if (isSearching && autoCallEnabled) {
    setState('waiting');
    setConnection('red', 'Disconnected');
    statusText.textContent = 'Stranger disconnected. Finding someone new…';
    subText.textContent = 'Hang tight, this only takes a moment';
    socket.emit('find-partner');
    setTimeout(() => setConnection('orange', 'Searching'), 600);
  } else if (isSearching) {
    socket.emit('leave');
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      localStream = null;
    }
    resetUI();
    showError('Stranger disconnected. Auto Call is off — tap Start to find someone new.');
  }
});

socket.on('partner-mic-state', (muted) => {
  subText.textContent = muted ? 'Stranger muted their mic' : 'Say hi! Tap "Next" to skip, or "Hang Up" to leave.';
});

socket.on('chat-message', ({ text }) => {
  addChatMessage(text, 'them');
  playMessageSound();
  if (!chatOpen) {
    chatBadge.classList.remove('hidden');
  }
});

socket.on('disconnect', () => {
  showError('Connection lost. Reconnecting…');
  if (isSearching) setConnection('red', 'Disconnected');
});

socket.on('connect', () => {
  clearError();
  if (isSearching) setConnection('orange', 'Reconnecting');
  // Re-register on every (re)connect so the server always has a live socket
  // for this clientId, and so friends/notifications resync after being offline.
  if (lastRegisterPayload) socket.emit('register', lastRegisterPayload);
});
