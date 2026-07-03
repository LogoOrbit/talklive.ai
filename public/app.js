// Prefer a real WebSocket (falling back to polling only if it can't be
// established) so we never get stuck on HTTP long-polling, which is subject to
// per-host connection limits and breaks late joiners past a handful of
// concurrent clients. Reconnection is enabled so a dropped socket retries.
const socket = io({
  transports: ['websocket', 'polling'],
  upgrade: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 800,
  reconnectionDelayMax: 5000,
});

// --- DOM refs ---
const orb = document.getElementById('orb');
const orbRings = document.querySelectorAll('#orb .orb-ring');
const statusText = document.getElementById('statusText');
const subText = document.getElementById('subText');
const errorText = document.getElementById('errorText');
const setupErrorText = document.getElementById('setupErrorText');
const onlineCountEl = document.getElementById('onlineCount');
const remoteAudio = document.getElementById('remoteAudio');
const netStatus = document.getElementById('netStatus');
const netStatusLabel = document.getElementById('netStatusLabel');

const setupPanel = document.getElementById('setupPanel');
const startBtn = document.getElementById('startBtn');
const callPanel = document.getElementById('callPanel');
const stageEl = document.getElementById('main');
const chatPanel = document.getElementById('chatPanel');
const chatOverlay = document.getElementById('chatOverlay');
const closeChatBtn = document.getElementById('closeChatBtn');

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

const muteBtn = document.getElementById('muteBtn');
const muteIcon = document.getElementById('muteIcon');
const muteSlash = document.getElementById('muteSlash');
const chatToggleBtn = document.getElementById('chatToggleBtn');
const reportBtn = document.getElementById('reportBtn');
const addFriendBtn = document.getElementById('addFriendBtn');
const callMainBtn = document.getElementById('callMainBtn');
const callMainLabel = document.getElementById('callMainLabel');
const autoCallRow = document.getElementById('autoCallRow');
const reassureLine = document.getElementById('reassureLine');
const searchTicker = document.getElementById('searchTicker');
const searchTickerText = document.getElementById('searchTickerText');
const qualityIndicator = document.getElementById('qualityIndicator');
const qualityLabel = document.getElementById('qualityLabel');

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
const typingIndicator = document.getElementById('typingIndicator');
const quickGuide = document.getElementById('quickGuide');

const historyBtn = document.getElementById('historyBtn');
const historyDropdown = document.getElementById('historyDropdown');
const historyWrap = document.querySelector('.history-wrap');
const closeHistoryBtn = document.getElementById('closeHistoryBtn');
const historyList = document.getElementById('historyList');

const friendsBtn = document.getElementById('friendsBtn');
const friendsMsgBadge = document.getElementById('friendsMsgBadge');
const friendsWrap = document.querySelector('.friends-wrap');
const friendsDropdown = document.getElementById('friendsDropdown');
const closeFriendsBtn = document.getElementById('closeFriendsBtn');
const friendsList = document.getElementById('friendsList');

const friendProfileModal = document.getElementById('friendProfileModal');
const closeFriendProfileBtn = document.getElementById('closeFriendProfileBtn');
const friendProfileAvatar = document.getElementById('friendProfileAvatar');
const friendProfileName = document.getElementById('friendProfileName');
const friendProfileStatus = document.getElementById('friendProfileStatus');
const friendProfileChatBtn = document.getElementById('friendProfileChatBtn');
const friendProfileRemoveBtn = document.getElementById('friendProfileRemoveBtn');
const friendProfileBlockBtn = document.getElementById('friendProfileBlockBtn');

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
const googleSignInBtn = document.getElementById('googleSignInBtn');
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
const themeGroup = document.getElementById('themeGroup');
const soundToggle = document.getElementById('soundToggle');
const vibrationToggle = document.getElementById('vibrationToggle');
const statusVisibilityToggle = document.getElementById('statusVisibilityToggle');
const sidePanelAuth = document.getElementById('sidePanelAuth');
const sidePanelSignInBtn = document.getElementById('sidePanelSignInBtn');
const sidePanelRegisterBtn = document.getElementById('sidePanelRegisterBtn');
const avatarCatTabs = document.getElementById('avatarCatTabs');
const avatarGrid = document.getElementById('avatarGrid');

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
  return `<img class="flag-icon" src="https://flagcdn.com/24x18/${cc}.png" srcset="https://flagcdn.com/48x36/${cc}.png 2x" width="${size}" alt="${escapeHtml(getCountryName(code))}" />`;
}

// --- Avatars: 5 male + 5 female inline-SVG busts. Shown only to yourself
// (left panel) and to your friends (friends list / profile) — never to the
// stranger during a call, so nothing about it can reveal anyone's gender. ---
const AVATAR_IDS = { male: ['m1', 'm2', 'm3', 'm4', 'm5'], female: ['f1', 'f2', 'f3', 'f4', 'f5'] };
const AVATAR_STYLES = {
  m1: { bg: '#6c5ce7', skin: '#f2c9a0', hair: '#2f2a26', long: false },
  m2: { bg: '#00a8cc', skin: '#c68642', hair: '#101010', long: false },
  m3: { bg: '#2ed47a', skin: '#8d5524', hair: '#1b1b1b', long: false },
  m4: { bg: '#ff9500', skin: '#ffdbac', hair: '#a55728', long: false },
  m5: { bg: '#e21f3e', skin: '#e0ac69', hair: '#4a4a4a', long: false },
  f1: { bg: '#ff5fa2', skin: '#f2c9a0', hair: '#5a3825', long: true },
  f2: { bg: '#9b59b6', skin: '#c68642', hair: '#101010', long: true },
  f3: { bg: '#00d4ff', skin: '#ffdbac', hair: '#d19a3f', long: true },
  f4: { bg: '#ffb84d', skin: '#8d5524', hair: '#2b1b12', long: true },
  f5: { bg: '#16a34a', skin: '#e0ac69', hair: '#8c2f39', long: true },
};

function avatarSvg(id, size = 36) {
  const a = AVATAR_STYLES[id];
  if (!a) return '';
  const hair = a.long
    ? `<path d="M32 12c-11 0-17 8-17 17v13c0 3 2 5 5 5h4V30h16v17h4c3 0 5-2 5-5V29c0-9-6-17-17-17z" fill="${a.hair}"/>`
    : `<path d="M32 13c-9 0-15 6-15 14 0 2 1 4 2 5 1-6 5-10 13-10s12 4 13 10c1-1 2-3 2-5 0-8-6-14-15-14z" fill="${a.hair}"/>`;
  return `<svg class="avatar-svg" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="32" r="32" fill="${a.bg}"/>
    <path d="M12 56c2-10 10-15 20-15s18 5 20 15a32 32 0 0 1-40 0z" fill="#ffffff" opacity="0.9"/>
    <circle cx="32" cy="29" r="12" fill="${a.skin}"/>
    ${hair}
  </svg>`;
}

// Friends list shows a gender symbol instead of an avatar image: blue ♂ for
// male, pink ♀ for female (rule 17). Gender is derived from the chosen avatar
// id prefix (m*/f*); unknown falls back to a neutral person glyph.
function genderIcon(avatarId, size = 30) {
  const g = typeof avatarId === 'string' && (avatarId[0] === 'm' || avatarId[0] === 'f') ? avatarId[0] : null;
  if (!g) return `<span class="gender-icon gender-neutral" style="font-size:${size}px">${ICONS.person}</span>`;
  const symbol = g === 'm' ? '♂' : '♀';
  const cls = g === 'm' ? 'gender-male' : 'gender-female';
  return `<span class="gender-icon ${cls}" style="font-size:${Math.round(size * 0.9)}px" aria-hidden="true">${symbol}</span>`;
}

let myAvatar = localStorage.getItem('talklive_avatar');
if (myAvatar && !AVATAR_STYLES[myAvatar]) myAvatar = null;
let avatarCat = myAvatar && myAvatar[0] === 'f' ? 'female' : 'male';

// --- No links of any kind in chat. Mirrors the server-side filter. ---
const LINK_RE = new RegExp(
  '(?:[a-z][a-z0-9+.-]*:\\/\\/)'
  + '|(?:\\bwww\\.)'
  + '|(?:\\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.(?:[a-z]{2,})(?:\\/|\\b))'
  + '|(?:\\b\\w+\\s*\\(?\\s*dot\\s*\\)?\\s*(?:com|net|org|io|gg|me|ly|co|xyz|site|online|app|tv|link|live)\\b)',
  'i'
);
function messageHasLink(text) {
  return LINK_RE.test(String(text || ''));
}

// Static fallback used until (and if) the server's /ice-servers responds.
let ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:80?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turns:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
];

// Pull the authoritative (possibly env-configured, more reliable) TURN list from
// the server as early as possible so the very first call already relays properly.
fetch('/ice-servers')
  .then((r) => (r.ok ? r.json() : null))
  .then((data) => {
    if (data && Array.isArray(data.iceServers) && data.iceServers.length) {
      ICE_SERVERS = data.iceServers;
    }
  })
  .catch(() => { /* keep the static fallback */ });

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
// Always starts unchecked when the app is opened, regardless of last session.
let autoCallEnabled = false;
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
    group.querySelectorAll('.pill').forEach((p) => {
      p.classList.remove('selected');
      p.setAttribute('aria-pressed', 'false');
    });
    pill.classList.add('selected');
    pill.setAttribute('aria-pressed', 'true');
    group.dataset.value = pill.dataset.value;
  });
  // select the first pill by default
  group.querySelectorAll('.pill').forEach((p, i) => {
    p.classList.toggle('selected', i === 0);
    p.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
  });
}

function setPillGroupValue(group, value) {
  group.dataset.value = value;
  group.querySelectorAll('.pill').forEach((p) => {
    const on = p.dataset.value === value;
    p.classList.toggle('selected', on);
    p.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}

// --- Country multi-select (Interested / Non Interested Countries) ---
// Clicking the search box shows every country alphabetically with a flag icon;
// typing narrows the list. A country can only live in one of the two lists at
// a time, so adding it to one removes it from the other.
// Country names come from getCountryName() (Intl.DisplayNames), so the list is
// shown, searched, and sorted in the user's own language; the English name from
// countries.js still matches as a search fallback.
function getCountryEntries() {
  return Object.keys(COUNTRIES)
    .map((code) => [code, getCountryName(code)])
    .sort((a, b) => a[1].localeCompare(b[1], I18N_STATE.lang));
}

function makeCountryMultiSelect(searchInput, resultsEl, chipsEl, set, getOther) {
  function renderChips() {
    chipsEl.innerHTML = '';
    Array.from(set)
      .sort((a, b) => getCountryName(a).localeCompare(getCountryName(b), I18N_STATE.lang))
      .forEach((code) => {
        const chip = document.createElement('span');
        chip.className = 'tag removable';
        chip.innerHTML = `${getFlagImg(code, 16)} ${escapeHtml(getCountryName(code))}<span class="tag-remove" role="button" tabindex="0" aria-label="${escapeHtml(t('remove'))}">&times;</span>`;
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
    const matches = q
      ? getCountryEntries().filter(([code, name]) =>
          name.toLowerCase().includes(q) || (COUNTRIES[code] || '').toLowerCase().includes(q))
      : getCountryEntries();

    if (matches.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'search-result-empty';
      empty.textContent = t('noMatchingCountry');
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
    tag.innerHTML = `${escapeHtml(interest)}<span class="tag-remove" role="button" tabindex="0" aria-label="${escapeHtml(t('remove'))}">&times;</span>`;
    tag.querySelector('.tag-remove').addEventListener('click', () => {
      selectedInterests.delete(interest);
      renderInterestTags();
    });
    interestTagsEl.appendChild(tag);
  });
}

function addInterestFromInput() {
  const value = interestInput.value.trim();
  if (!value) return;
  selectedInterests.add(value);
  interestInput.value = '';
  renderInterestTags();
}

interestInput.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  addInterestFromInput();
});

// Explicit Add button — many mobile keyboards have no obvious Enter key.
document.getElementById('addInterestBtn').addEventListener('click', addInterestFromInput);

initPillGroup(genderGroup);
initPillGroup(prefGenderGroup);
initPillGroup(themeGroup);

autoCallCheckbox.checked = autoCallEnabled;

function setAutoCallEnabled(value) {
  autoCallEnabled = value;
  localStorage.setItem('talklive_autocall', autoCallEnabled ? 'on' : 'off');
  autoCallCheckbox.checked = autoCallEnabled;
  syncWakeLock();
}

autoCallCheckbox.addEventListener('change', () => setAutoCallEnabled(autoCallCheckbox.checked));

// --- Themes: dark (default), light, plus accent themes. ---
const THEMES = ['dark', 'light', 'ocean', 'sunset'];
let currentTheme = localStorage.getItem('talklive_theme');
if (!THEMES.includes(currentTheme)) currentTheme = 'dark';

function applyTheme(theme) {
  if (!THEMES.includes(theme)) theme = 'dark';
  currentTheme = theme;
  localStorage.setItem('talklive_theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
  setPillGroupValue(themeGroup, theme);
}

themeGroup.addEventListener('click', (e) => {
  if (e.target.closest('.pill')) applyTheme(themeGroup.dataset.value);
});

applyTheme(currentTheme);

// --- Vibration setting (used for connect/message haptics on supporting devices) ---
let vibrationEnabled = localStorage.getItem('talklive_vibration') !== 'off';
vibrationToggle.checked = vibrationEnabled;
vibrationToggle.addEventListener('change', () => {
  vibrationEnabled = vibrationToggle.checked;
  localStorage.setItem('talklive_vibration', vibrationEnabled ? 'on' : 'off');
});

function vibrate(pattern) {
  if (vibrationEnabled && navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch (e) { /* unsupported */ }
  }
}

// --- Online-status visibility: hides your status from your added friends only.
// Never affects the global online-user count. ---
let statusVisible = localStorage.getItem('talklive_status_visible') !== 'off';
statusVisibilityToggle.checked = statusVisible;
statusVisibilityToggle.addEventListener('change', () => {
  statusVisible = statusVisibilityToggle.checked;
  localStorage.setItem('talklive_status_visible', statusVisible ? 'on' : 'off');
  socket.emit('set-status-visibility', { hidden: !statusVisible });
});

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
// A crisp, tactile "whoosh" for sending — WhatsApp-style rising blip.
function playSendSound() { playTone(660, 0.05, 'sine', 0.14); playTone(990, 0.07, 'sine', 0.13, 0.04); }

function updateSoundToggleUi() {
  soundToggle.checked = soundEnabled;
}

function setSoundEnabled(value) {
  soundEnabled = value;
  localStorage.setItem('talklive_sound', soundEnabled ? 'on' : 'off');
  updateSoundToggleUi();
}

soundToggle.addEventListener('change', () => setSoundEnabled(soundToggle.checked));
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
// what was last saved here. Uses sessionStorage (not localStorage) so a
// reload keeps the saved filters, but closing the tab/browser clears them. ---
const FILTERS_STORAGE_KEY = 'talklive_filters';
let appliedFilters = { prefGender: 'any', includeCountries: [], excludeCountries: [], interests: [] };

(function loadAppliedFilters() {
  try {
    const raw = sessionStorage.getItem(FILTERS_STORAGE_KEY);
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
  sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(appliedFilters));
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

[termsModal, accountModal, friendProfileModal, friendChatModal].forEach((modal) => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal(modal);
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal(termsModal);
    closeModal(accountModal);
    closeModal(historyDropdown);
    closeModal(friendsDropdown);
    closeModal(friendProfileModal);
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
    updateNicknameBtn.disabled = true;

    // Chosen avatar replaces the default account circle in the left panel;
    // fall back to the nickname initial until one is picked.
    if (myAvatar) {
      avatarIcon.classList.add('hidden');
      avatarInitial.innerHTML = avatarSvg(myAvatar, 36);
      avatarInitial.classList.remove('hidden');
    } else {
      avatarIcon.classList.add('hidden');
      avatarInitial.textContent = accountNickname.trim().charAt(0).toUpperCase();
      avatarInitial.classList.remove('hidden');
    }
    accountBtn.classList.add('logged-in');
    sidePanelAuth.classList.add('hidden');
  } else {
    accountLoggedOut.classList.remove('hidden');
    accountLoggedIn.classList.add('hidden');

    avatarIcon.classList.remove('hidden');
    avatarInitial.classList.add('hidden');
    accountBtn.classList.remove('logged-in');
    sidePanelAuth.classList.remove('hidden');
  }
  renderAvatarGrid();
}

// --- Avatar picker: male/female category, 5 avatars each ---
function renderAvatarGrid() {
  if (!avatarGrid) return;
  avatarGrid.innerHTML = '';
  AVATAR_IDS[avatarCat].forEach((id) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `avatar-option${myAvatar === id ? ' selected' : ''}`;
    btn.dataset.avatar = id;
    btn.setAttribute('aria-label', t('avatar'));
    btn.innerHTML = avatarSvg(id, 52);
    avatarGrid.appendChild(btn);
  });
}

avatarCatTabs.addEventListener('click', (e) => {
  const tab = e.target.closest('.avatar-cat');
  if (!tab) return;
  avatarCat = tab.dataset.cat;
  avatarCatTabs.querySelectorAll('.avatar-cat').forEach((c) => c.classList.toggle('selected', c === tab));
  renderAvatarGrid();
});

avatarGrid.addEventListener('click', (e) => {
  const option = e.target.closest('.avatar-option');
  if (!option) return;
  myAvatar = option.dataset.avatar;
  localStorage.setItem('talklive_avatar', myAvatar);
  renderAccountState();
  registerProfile(); // pushes the new avatar to the server so friends see it
});

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

function selectAccountTab(which) {
  accountTabs.forEach((tab) => {
    const on = tab.dataset.tab === which;
    tab.classList.toggle('selected', on);
  });
  loginTab.classList.toggle('hidden', which !== 'login');
  signupTab.classList.toggle('hidden', which !== 'signup');
  accountStatus.classList.add('hidden');
}

accountTabs.forEach((tab) => {
  tab.addEventListener('click', () => selectAccountTab(tab.dataset.tab));
});

// Left side panel: Sign in / Register shortcuts at the bottom
sidePanelSignInBtn.addEventListener('click', () => {
  closeAppSettings();
  renderAccountState();
  selectAccountTab('login');
  openModal(accountModal);
});

sidePanelRegisterBtn.addEventListener('click', () => {
  closeAppSettings();
  renderAccountState();
  selectAccountTab('signup');
  openModal(accountModal);
});

// "Update nickname" only becomes active once the nickname was actually edited.
settingsNickname.addEventListener('input', () => {
  const value = settingsNickname.value.trim();
  updateNicknameBtn.disabled = !value || value === (accountNickname || '');
});

// "Update password" only becomes active once the password form is filled in.
function syncPasswordBtnState() {
  changePasswordBtn.disabled = !(currentPasswordInput.value && newPasswordInput.value);
}
currentPasswordInput.addEventListener('input', syncPasswordBtnState);
newPasswordInput.addEventListener('input', syncPasswordBtnState);
syncPasswordBtnState();

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

// --- Sign Up / Log In with Google ---
let googleReady = false;

function handleGoogleCredential(response) {
  socket.emit('google-auth', { credential: response.credential });
}

function initGoogleSignIn() {
  if (googleReady || !window.GOOGLE_CLIENT_ID || !window.google || !window.google.accounts) return;
  googleReady = true;
  window.google.accounts.id.initialize({
    client_id: window.GOOGLE_CLIENT_ID,
    callback: handleGoogleCredential,
  });
  window.google.accounts.id.renderButton(googleSignInBtn, {
    type: 'standard',
    theme: 'filled_black',
    size: 'large',
    text: 'continue_with',
    shape: 'pill',
    width: 280,
  });
}

if (googleSignInBtn && window.GOOGLE_CLIENT_ID) {
  const gsiScript = document.createElement('script');
  gsiScript.src = 'https://accounts.google.com/gsi/client';
  gsiScript.async = true;
  gsiScript.defer = true;
  gsiScript.onload = initGoogleSignIn;
  document.head.appendChild(gsiScript);
} else if (googleSignInBtn) {
  googleSignInBtn.classList.add('hidden');
}

socket.on('google-auth-result', ({ ok, nickname, error }) => {
  if (!ok) return showAccountStatus(error, 'error');
  localStorage.setItem('talklive_nickname', nickname);
  showAccountStatus(t('statusSignedIn', { name: nickname }), 'success');
  setTimeout(() => location.reload(), 500);
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
  showAccountStatus(t('statusLoggedIn', { name: nickname }), 'success');
  setTimeout(() => location.reload(), 500);
});

socket.on('signup-result', ({ ok, nickname, error }) => {
  if (!ok) return showAccountStatus(error, 'error');
  localStorage.setItem('talklive_nickname', nickname);
  showAccountStatus(t('statusAccountCreated', { name: nickname }), 'success');
  setTimeout(() => location.reload(), 500);
});

socket.on('update-nickname-result', ({ ok, nickname, error }) => {
  if (!ok) return showAccountStatus(error, 'error');
  accountNickname = nickname;
  localStorage.setItem('talklive_nickname', nickname);
  renderAccountState();
  showAccountStatus(t('statusNicknameUpdated'), 'success');
});

socket.on('change-password-result', ({ ok, error }) => {
  if (!ok) return showAccountStatus(error, 'error');
  currentPasswordInput.value = '';
  newPasswordInput.value = '';
  syncPasswordBtnState();
  showAccountStatus(t('statusPasswordChanged'), 'success');
});

// --- Friends: dropdown menu under the header button (not a separate page) ---
friendsBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (friendsDropdown.classList.contains('hidden')) {
    renderFriendsList();
    openModal(friendsDropdown);
  } else {
    closeModal(friendsDropdown);
  }
});
closeFriendsBtn.addEventListener('click', () => closeModal(friendsDropdown));
document.addEventListener('click', (e) => {
  if (!e.composedPath().includes(friendsWrap)) closeModal(friendsDropdown);
});

// Each row: online/offline dot + flag + username on the left (tap → chat box),
// small green call button on the right. Tapping the avatar opens the profile view.
function renderFriendsList() {
  if (friendsData.length === 0) {
    friendsList.innerHTML = `<p class="history-empty">${escapeHtml(t('noFriendsYet'))}</p>`;
    return;
  }
  friendsList.innerHTML = '';
  friendsData.forEach((f) => {
    const unread = unreadCountFor(f.clientId);
    const item = document.createElement('div');
    item.className = 'friend-item';
    item.innerHTML = `
      <button type="button" class="friend-avatar-btn" data-id="${f.clientId}" title="${escapeHtml(t('profile'))}" aria-label="${escapeHtml(t('profile'))}">${genderIcon(f.avatar, 30)}</button>
      <div class="friend-item-info friend-row-main" data-id="${f.clientId}">
        <span class="friend-online-dot ${f.online ? 'online' : ''}" title="${escapeHtml(f.online ? t('online') : t('offline'))}"></span>
        <span class="friend-item-name">${getFlagImg(f.countryCode)} ${escapeHtml(f.username)}</span>
        ${unread > 0 ? `<span class="unread-badge">${unread}</span>` : ''}
      </div>
      <button type="button" class="friend-call-btn" data-id="${f.clientId}" data-name="${escapeHtml(f.username)}" title="${escapeHtml(t('callBack'))}" aria-label="${escapeHtml(t('callBack'))}">
        <svg viewBox="0 0 24 24" fill="white" aria-hidden="true"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
      </button>
    `;
    friendsList.appendChild(item);
  });
}

friendsList.addEventListener('click', (e) => {
  const avatarBtn = e.target.closest('.friend-avatar-btn');
  const callBtn = e.target.closest('.friend-call-btn');
  const rowMain = e.target.closest('.friend-row-main');
  if (avatarBtn) {
    openFriendProfile(avatarBtn.dataset.id);
  } else if (callBtn) {
    // Rule 11: don't dismiss the menu — swap the call icon into an in-place
    // spinner and keep it there until the peer accepts (then we jump to the
    // call screen) or the request fails (then we restore the icon).
    startCallbackSpinner(callBtn);
    requestCallBack(callBtn.dataset.id, callBtn.dataset.name, { deferUI: true });
  } else if (rowMain) {
    openFriendChat(rowMain.dataset.id);
  }
});

// --- Friend profile view: avatar, name, status + Remove Friend / Block User ---
let activeProfileFriendId = null;

function openFriendProfile(friendClientId) {
  const friend = friendsData.find((f) => f.clientId === friendClientId);
  if (!friend) return;
  activeProfileFriendId = friendClientId;
  friendProfileAvatar.innerHTML = genderIcon(friend.avatar, 72);
  friendProfileName.innerHTML = `${getFlagImg(friend.countryCode)} ${escapeHtml(friend.username)}`;
  friendProfileStatus.innerHTML = `<span class="friend-online-dot ${friend.online ? 'online' : ''}"></span> ${escapeHtml(friend.online ? t('online') : t('offline'))}`;
  closeModal(friendsDropdown);
  openModal(friendProfileModal);
}

closeFriendProfileBtn.addEventListener('click', () => closeModal(friendProfileModal));

friendProfileChatBtn.addEventListener('click', () => {
  if (!activeProfileFriendId) return;
  closeModal(friendProfileModal);
  openFriendChat(activeProfileFriendId);
});

friendProfileRemoveBtn.addEventListener('click', () => {
  if (!activeProfileFriendId || !confirm(t('confirmRemoveFriend'))) return;
  socket.emit('remove-friend', { friendClientId: activeProfileFriendId });
  closeModal(friendProfileModal);
});

friendProfileBlockBtn.addEventListener('click', () => {
  if (!activeProfileFriendId || !confirm(t('confirmBlockFriend'))) return;
  socket.emit('block-friend', { friendClientId: activeProfileFriendId });
  closeModal(friendProfileModal);
});

socket.on('state-sync', ({ friends: friendList, friendRequests: requestList, notifications: notifList } = {}) => {
  friendsData = friendList || [];
  friendRequestsData = requestList || [];
  notifData = notifList || [];
  renderFriendsList();
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
    case 'friend_request': return t('notifWantsFriends', { name: escapeHtml(n.username) });
    case 'friend_accepted': return t('notifAccepted', { name: escapeHtml(n.username) });
    case 'call_back_request': return t('notifWantsCallback', { name: escapeHtml(n.username) });
    default: return escapeHtml(t('notification'));
  }
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return t('justNow');
  const m = Math.floor(s / 60);
  if (m < 60) return t('minAgo', { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('hourAgo', { n: h });
  return t('dayAgo', { n: Math.floor(h / 24) });
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
    notifList.innerHTML = `<p class="history-empty">${escapeHtml(t('noRequestsYet'))}</p>`;
  } else {
    notifList.innerHTML = '';
    [...visible].reverse().forEach((n) => {
      const item = document.createElement('div');
      item.className = 'notif-item';
      let actions = '';
      if (n.type === 'friend_request') {
        actions = `
          <button type="button" class="btn-chip btn-chip-accept notif-confirm-btn" data-id="${n.id}" data-from="${n.fromClientId}">${ICONS.check} ${escapeHtml(t('confirm'))}</button>
          <button type="button" class="btn-chip notif-dismiss-btn" data-id="${n.id}" data-from="${n.fromClientId}">${ICONS.close} ${escapeHtml(t('dismiss'))}</button>
        `;
      } else if (n.type === 'friend_accepted') {
        actions = `
          <button type="button" class="btn-chip btn-chip-accept notif-open-chat-btn" data-id="${n.id}" data-from="${n.byClientId}">${ICONS.chat} ${escapeHtml(t('chat'))}</button>
          <button type="button" class="btn-chip notif-clear-btn" data-id="${n.id}">${ICONS.close} ${escapeHtml(t('dismiss'))}</button>
        `;
      } else if (n.type === 'call_back_request') {
        actions = `
          <button type="button" class="btn-chip btn-chip-accept notif-callback-accept-btn" data-id="${n.id}" data-from="${n.fromClientId}">${ICONS.call} ${escapeHtml(t('callBack'))}</button>
          <button type="button" class="btn-chip notif-callback-decline-btn" data-id="${n.id}" data-from="${n.fromClientId}">${ICONS.close} ${escapeHtml(t('dismiss'))}</button>
        `;
      } else {
        actions = `<button type="button" class="btn-chip notif-clear-btn" data-id="${n.id}">${ICONS.close} ${escapeHtml(t('dismiss'))}</button>`;
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
  const openChatBtn = e.target.closest('.notif-open-chat-btn');
  const cbAccept = e.target.closest('.notif-callback-accept-btn');
  const cbDecline = e.target.closest('.notif-callback-decline-btn');

  if (openChatBtn) {
    socket.emit('clear-notification', { notificationId: openChatBtn.dataset.id });
    removeNotifLocal(openChatBtn.dataset.id);
    closeModal(notifModal);
    openFriendChat(openChatBtn.dataset.from);
  } else if (confirmBtn) {
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
    empty.textContent = t('noMessagesYet');
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
  friendChatTitle.textContent = friend ? t('chatWith', { name: friend.username }) : t('chat');
  closeModal(notifModal);
  closeModal(friendsDropdown);
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
  if (messageHasLink(text)) {
    const el = document.createElement('div');
    el.className = 'chat-msg system';
    el.textContent = t('errNoLinks');
    friendChatMessages.appendChild(el);
    friendChatMessages.scrollTop = friendChatMessages.scrollHeight;
    return;
  }
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
    historyList.innerHTML = `<p class="history-empty">${escapeHtml(t('noCallsYet'))}</p>`;
    return;
  }
  historyList.innerHTML = '';
  [...callHistory].reverse().forEach((entry) => {
    const item = document.createElement('div');
    item.className = 'history-item';
    const mins = Math.floor(entry.durationSeconds / 60);
    const secs = entry.durationSeconds % 60;
    const callBackBtn = entry.clientId
      ? `<button type="button" class="call-back-btn" data-id="${entry.clientId}" data-name="${escapeHtml(entry.username)}" title="${escapeHtml(t('callBack'))}" aria-label="${escapeHtml(t('callBack'))}">
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

historyBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const willOpen = historyDropdown.classList.contains('hidden');
  if (willOpen) {
    renderHistory();
    openModal(historyDropdown);
  } else {
    closeModal(historyDropdown);
  }
});
closeHistoryBtn.addEventListener('click', () => closeModal(historyDropdown));
document.addEventListener('click', (e) => {
  if (!e.composedPath().includes(historyWrap)) closeModal(historyDropdown);
});

historyList.addEventListener('click', (e) => {
  const btn = e.target.closest('.call-back-btn');
  if (!btn || !btn.dataset.id) return;
  closeModal(historyDropdown);
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

registerClient({
  clientId: getClientId(),
  nickname: accountNickname || undefined,
  avatar: myAvatar || undefined,
  hideStatus: !statusVisible,
});
renderAccountState();

socket.on('profile', (profile) => {
  myProfile = profile;
});

// --- State helpers ---
function setState(state) {
  orb.className = `orb ${state}`;
}

// green = connected, orange = searching/reconnecting, red = disconnected/skipped.
// The label argument is an i18n key so the indicator re-renders on language change.
let lastConn = null;
function setConnection(color, labelKey) {
  lastConn = { color, labelKey };
  connectionIndicator.classList.remove('hidden');
  connectionDot.className = `connection-dot ${color}`;
  connectionLabel.textContent = t(labelKey);
  const connected = color === 'green';
  // The chat button opens the panel any time; only the input is gated on a live
  // call so you can't type into the void before a stranger is connected.
  chatInput.disabled = !connected;
  chatSendBtn.disabled = !connected;

  if (connected && !wasConnected) {
    connectFlash.classList.remove('playing');
    // Force reflow so the animation replays every time we (re)connect.
    void connectFlash.offsetWidth;
    connectFlash.classList.add('playing');
    playConnectSound();
    vibrate([40, 60, 40]);
  }
  wasConnected = connected;
}

function hideConnection() {
  connectionIndicator.classList.add('hidden');
}

// --- Live network status indicator (top bar): green "Online" when the
// internet + socket are healthy, red "Offline" the moment either drops. ---
let socketConnected = false;
function refreshNetStatus() {
  const online = socketConnected && (typeof navigator.onLine === 'undefined' || navigator.onLine);
  netStatus.classList.toggle('is-online', online);
  netStatus.classList.toggle('is-offline', !online);
  netStatusLabel.textContent = t(online ? 'online' : 'offline');
  netStatus.setAttribute('title', t(online ? 'netOnline' : 'netOffline'));
}
window.addEventListener('online', refreshNetStatus);
window.addEventListener('offline', refreshNetStatus);

// --- The single Call button and its four visual modes ---
//   'call'    green phone   → tap to start searching
//   'loading' spinner       → searching / connecting, tap to cancel
//   'hangup'  red           → connected, tap to hang up
//   'confirm' yellow        → "are you sure?", tap again to actually hang up
let hangupConfirm = false;
let hangupConfirmTimer = null;

function clearHangupConfirm() {
  hangupConfirm = false;
  clearTimeout(hangupConfirmTimer);
  hangupConfirmTimer = null;
}

function setButtonMode(mode) {
  callMainBtn.classList.remove('is-call', 'is-loading', 'is-hangup', 'is-confirm');
  callMainBtn.classList.add('is-' + mode);
  callMainBtn.dataset.mode = mode;
  const labelKey = mode === 'hangup' ? 'hangUp'
    : mode === 'confirm' ? 'hangUpSure'
    : mode === 'loading' ? 'connSearching'
    : 'call';
  callMainLabel.textContent = t(labelKey);
  callMainLabel.className = 'action-label call-main-label is-' + mode;
  callMainBtn.setAttribute('aria-label', t(labelKey));
}

// --- Call screen button states: idle · searching · connecting · connected ·
// reconnecting · disconnected — each maps to one of the four button modes. ---
let callState = 'idle';

function setCallState(state) {
  callState = state;
  const connected = state === 'connected';
  // Leaving the connected state cancels any pending "are you sure?".
  if (!connected) clearHangupConfirm();

  let mode;
  if (connected) mode = hangupConfirm ? 'confirm' : 'hangup';
  else if (state === 'searching' || state === 'connecting' || state === 'reconnecting') mode = 'loading';
  else mode = 'call';
  setButtonMode(mode);

  // Mute / add-friend / report stay the same size always, but only work during
  // a live call — dimmed and disabled otherwise.
  muteBtn.disabled = !connected;
  addFriendBtn.disabled = !connected || addFriendBtn.classList.contains('added');
  reportBtn.disabled = !connected;
  reassureLine.classList.toggle('hidden', !connected);

  if (state === 'searching') startSearchTicker();
  else stopSearchTicker();
  if (!connected) stopQualityMonitor();
  syncWakeLock();
}

// --- Searching entertainment ticker: rotates fun facts, icebreakers, tips and
// a live online counter every few seconds so waiting never feels like dead air. ---
const TICKER_KEYS = [
  'funFact1', 'icebreaker1', 'tip1', 'funFact2', 'icebreaker2', 'tip2',
  'funFact3', 'icebreaker3', 'tip3', 'funFact4', 'icebreaker4', 'tip4',
  'funFact5', 'icebreaker5', 'funFact6', 'icebreaker6',
];
let lastOnlineCount = 0;
let tickerInterval = null;
let tickerIdx = 0;

function renderTickerItem() {
  // Every 4th slot shows the live "X people online now" counter.
  const text = tickerIdx % 4 === 3
    ? t('tickerOnlineNow', { n: lastOnlineCount })
    : t(TICKER_KEYS[(tickerIdx - Math.floor(tickerIdx / 4)) % TICKER_KEYS.length]);
  searchTickerText.classList.remove('ticker-fade-in');
  void searchTickerText.offsetWidth; // restart the fade animation
  searchTickerText.textContent = text;
  searchTickerText.classList.add('ticker-fade-in');
}

function startSearchTicker() {
  searchTicker.classList.remove('hidden');
  renderTickerItem();
  clearInterval(tickerInterval);
  tickerInterval = setInterval(() => {
    tickerIdx += 1;
    renderTickerItem();
  }, 4000);
}

function stopSearchTicker() {
  clearInterval(tickerInterval);
  tickerInterval = null;
  searchTicker.classList.add('hidden');
}

// --- Live connection quality indicator (RTT + packet loss via WebRTC stats) ---
let qualityInterval = null;
let lastQualityStats = null;

function setQualityLevel(level) {
  qualityIndicator.dataset.level = String(level);
  qualityLabel.textContent = level >= 4 ? t('qualityExcellent')
    : level === 3 ? t('qualityGood')
    : level === 2 ? t('qualityFair')
    : t('qualityPoor');
}

function startQualityMonitor() {
  stopQualityMonitor();
  qualityIndicator.classList.remove('hidden');
  setQualityLevel(3);
  qualityInterval = setInterval(async () => {
    if (!pc) return;
    try {
      const stats = await pc.getStats();
      let rtt = null;
      let lost = 0;
      let received = 0;
      stats.forEach((r) => {
        if (r.type === 'candidate-pair' && r.state === 'succeeded' && r.currentRoundTripTime != null) {
          rtt = r.currentRoundTripTime;
        }
        if (r.type === 'inbound-rtp' && r.kind === 'audio') {
          lost = r.packetsLost || 0;
          received = r.packetsReceived || 0;
        }
      });
      let lossRate = 0;
      if (lastQualityStats) {
        const dLost = Math.max(0, lost - lastQualityStats.lost);
        const dRecv = Math.max(0, received - lastQualityStats.received);
        lossRate = dLost + dRecv > 0 ? dLost / (dLost + dRecv) : 0;
      }
      lastQualityStats = { lost, received };

      let level = 4;
      if (rtt != null) {
        if (rtt > 0.5) level = 1;
        else if (rtt > 0.3) level = Math.min(level, 2);
        else if (rtt > 0.15) level = Math.min(level, 3);
      }
      if (lossRate > 0.08) level = 1;
      else if (lossRate > 0.03) level = Math.min(level, 2);
      else if (lossRate > 0.01) level = Math.min(level, 3);
      setQualityLevel(level);
    } catch (e) {
      // getStats can fail transiently while the connection is torn down
    }
  }, 2000);
}

function stopQualityMonitor() {
  clearInterval(qualityInterval);
  qualityInterval = null;
  lastQualityStats = null;
  qualityIndicator.classList.add('hidden');
}

// --- Screen wake lock: while auto-connect is enabled and we're searching or
// talking, keep the device awake so the loop never silently stops. ---
let wakeLock = null;

async function syncWakeLock() {
  const want = autoCallEnabled && (callState === 'searching' || callState === 'connected');
  if (want && !wakeLock && navigator.wakeLock) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch (e) {
      // wake lock denied (low battery, unsupported) — non-critical
    }
  } else if (!want && wakeLock) {
    try { wakeLock.release(); } catch (e) { /* already released */ }
    wakeLock = null;
  }
}

document.addEventListener('visibilitychange', () => {
  // The OS drops wake locks when the tab is backgrounded — re-acquire on return.
  if (document.visibilityState === 'visible') syncWakeLock();
});

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

// The separate Skip/Next button was removed in favour of the single Call
// button, so these are now no-ops kept only so existing call sites still work.
function lockSkipButton() {}
function unlockSkipButton() {}

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
  // On the Tap-to-Talk landing the callPanel is hidden, so surface errors there.
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

let subTextFadeTimer = null;

// Status/sub texts take i18n keys (+ optional vars) instead of raw strings and
// remember what they last showed, so switching language re-renders them live.
let lastStatusMsg = null;
let lastSubMsg = null;

function setStatusText(key, vars) {
  lastStatusMsg = key ? { key, vars } : null;
  statusText.textContent = key ? t(key, vars) : '';
}

// Every subText update goes through here so a pending fade-out from an
// earlier message can never fire on top of unrelated, newer text.
function setSubText(key, vars) {
  clearTimeout(subTextFadeTimer);
  subTextFadeTimer = null;
  subText.classList.remove('sub-text-fade-out');
  lastSubMsg = key ? { key, vars } : null;
  subText.textContent = key ? t(key, vars) : '';
}

function setSubTextFading(key, vars, delayMs = 5000) {
  setSubText(key, vars);
  subTextFadeTimer = setTimeout(() => {
    subText.classList.add('sub-text-fade-out');
    // Actually clear the text once the CSS fade completes. Relying on opacity
    // alone left the message stuck on screen on mobile browsers that skip the
    // transition while the tab/screen is inactive.
    subTextFadeTimer = setTimeout(() => {
      if (lastSubMsg && lastSubMsg.key === key) {
        lastSubMsg = null;
        subText.textContent = '';
        subText.classList.remove('sub-text-fade-out');
      }
    }, 1400);
  }, delayMs);
}

// Returns the created element so the caller can transition its delivery state
// (WhatsApp-style: sending → sent). Uses a transform/opacity entrance animation
// that stays on the compositor for a smooth 60fps pop with no layout jank.
function addChatMessage(text, kind) {
  const el = document.createElement('div');
  el.className = `chat-msg ${kind} chat-msg-enter`;
  const bubble = document.createElement('span');
  bubble.className = 'chat-msg-text';
  bubble.textContent = text;
  el.appendChild(bubble);
  if (kind === 'me') {
    const ticks = document.createElement('span');
    ticks.className = 'chat-msg-ticks sending';
    ticks.innerHTML = '<svg viewBox="0 0 16 11" aria-hidden="true"><path d="M11.1.6 4.9 8.4 1.9 5.4.5 6.8l4.4 4.4L12.5 2z"/><path d="M15.6.6 9.4 8.4l-.9-.9-1 1.3 1.9 1.9L17 2z"/></svg>';
    el.appendChild(ticks);
  }
  chatMessages.appendChild(el);
  // Double rAF so the enter animation is guaranteed to run from its start frame.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.classList.remove('chat-msg-enter'));
  });
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return el;
}

function clearChat() {
  chatMessages.innerHTML = '';
  typingIndicator.classList.add('hidden');
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

let connectWatchdog = null;      // initial "never connected" timeout
let reconnectDeadline = null;    // 30s window to recover a dropped call
let iceRestartAttempted = false;
let mediaConnected = false;      // true once we've actually received remote audio

// Poor connection / dropped peer handling: give the call up to 30s to recover
// (rules 15 & 16) before automatically moving on to the next person.
const RECONNECT_WINDOW_MS = 30000;

function clearConnectWatchdog() {
  clearTimeout(connectWatchdog);
  connectWatchdog = null;
}

function clearReconnectDeadline() {
  clearTimeout(reconnectDeadline);
  reconnectDeadline = null;
}

// Automatically move to the next available match. Used by skip, the initial
// connect watchdog, and the 30s reconnect deadline.
function autoNextMatch(statusKey) {
  clearConnectWatchdog();
  clearReconnectDeadline();
  teardownPeer();
  clearChat();
  isSearching = true;
  setCallState('searching');
  setState('waiting');
  setConnection('red', 'connDisconnected');
  setStatusText(statusKey || 'statusFindingNew');
  setSubText('subHangTight');
  socket.emit('skip');
  setTimeout(() => { if (isSearching && callState === 'searching') setConnection('orange', 'connSearching'); }, 600);
}

// Kick off (or restart) the 30s recovery window. If the connection is still not
// healthy when it elapses, auto-advance to the next match.
function startReconnectWindow() {
  if (reconnectDeadline) return; // already counting down
  reconnectDeadline = setTimeout(() => {
    reconnectDeadline = null;
    if (pc && (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed')) return;
    autoNextMatch('statusReconnectFailed');
  }, RECONNECT_WINDOW_MS);
}

function attemptIceRestart(peer) {
  if (iceRestartAttempted) return;
  iceRestartAttempted = true;
  peer.createOffer({ iceRestart: true })
    .then((offer) => peer.setLocalDescription(offer))
    .then(() => socket.emit('signal', { type: 'offer', sdp: peer.localDescription }))
    .catch(() => { /* the reconnect window will auto-advance if this fails */ });
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
    // Some mobile browsers need an explicit play() once a user gesture primed audio.
    remoteAudio.play && remoteAudio.play().catch(() => {});
    mediaConnected = true;
    revealPartner();
    setState('connected');
    setCallState('connected');
    setStatusText('statusConnected');
    setSubTextFading('subSayHi');
    monitorRemoteAudio(event.streams[0]);
    // Receiving the remote track is itself proof of a live connection, even if
    // iceConnectionState hasn't caught up yet (e.g. TURN relay finalizing).
    setConnection('green', 'connConnected');
    clearConnectWatchdog();
    clearReconnectDeadline();
    startQualityMonitor();
  };

  // If a call never fully connects (common with flaky free TURN relays across
  // distant networks), move on to a new match instead of stalling silently.
  clearConnectWatchdog();
  clearReconnectDeadline();
  iceRestartAttempted = false;
  mediaConnected = false;
  connectWatchdog = setTimeout(() => {
    if (!mediaConnected) autoNextMatch('statusFindingNew');
  }, 15000);

  peer.oniceconnectionstatechange = () => {
    const iceState = peer.iceConnectionState;
    if (iceState === 'connected' || iceState === 'completed') {
      setConnection('green', 'connConnected');
      clearConnectWatchdog();
      clearReconnectDeadline();
      iceRestartAttempted = false;
    } else if (iceState === 'checking') {
      if (!mediaConnected) setConnection('orange', 'connConnecting');
    } else if (iceState === 'disconnected') {
      // Peer degraded or (temporarily) went away — try to recover for 30s.
      setConnection('orange', 'connReconnecting');
      if (mediaConnected) setStatusText('statusReconnecting');
      startReconnectWindow();
      if (isInitiator) attemptIceRestart(peer);
    } else if (iceState === 'failed') {
      setConnection('orange', 'connReconnecting');
      if (mediaConnected) setStatusText('statusReconnecting');
      startReconnectWindow();
      if (isInitiator) attemptIceRestart(peer);
    } else if (iceState === 'closed') {
      setConnection('red', 'connDisconnected');
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
  clearReconnectDeadline();
  mediaConnected = false;
  clearInterval(speakingCheckInterval);
  orb.classList.remove('speaking');
  orb.classList.remove('muted-remote');
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
  stopQualityMonitor();
  stopCallTimer();
  lockSkipButton();
}

// Full reset back to the Tap-to-Talk landing (used after a ban / abandoned
// callback, and whenever the user has no live call to return to).
function resetUI() {
  teardownPeer();
  isSearching = false;
  clearHangupConfirm();
  setCallState('idle');
  setState('idle');
  setStatusText('statusIdle');
  setSubText('subIdle');
  callPanel.classList.add('hidden');
  setupPanel.classList.remove('hidden');
  stageEl.classList.remove('call-live');
  startBtn.disabled = false;
  closeChatPanel();
  clearChat();
  hideConnection();
  // Toolbar + chat button belong to the call screen only.
  chatToggleBtn.classList.add('hidden');
  appSettingsBtn.classList.add('hidden');
  historyBtn.classList.add('hidden');
  friendsBtn.classList.add('hidden');
  notifBtn.classList.add('hidden');
  accountBtn.classList.add('hidden');
  filtersBtn.classList.add('hidden');
}

// Return the single button to green "Call" (idle) on the persistent call screen.
// Used both after a manual hang-up and when the other side ends the call.
function goIdleOnCallScreen(statusKey) {
  isSearching = false;
  teardownPeer();
  clearChat();
  closeChatPanel();
  clearHangupConfirm();
  setCallState('idle');
  setState('idle');
  hideConnection();
  setStatusText(statusKey || 'statusReadyToTalk');
  setSubText('subTapCall');
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
    avatar: myAvatar || undefined,
    hideStatus: !statusVisible,
  });
}

// Move from the Tap-to-Talk landing to the call screen and reveal the toolbar
// + big chat button. Safe to call repeatedly (e.g. on each new match).
function enterCallUI() {
  closeChatPanel();
  setupPanel.classList.add('hidden');
  callPanel.classList.remove('hidden');
  stageEl.classList.add('call-live');
  chatToggleBtn.classList.remove('hidden');
  appSettingsBtn.classList.remove('hidden');
  historyBtn.classList.remove('hidden');
  friendsBtn.classList.remove('hidden');
  notifBtn.classList.remove('hidden');
  accountBtn.classList.remove('hidden');
  filtersBtn.classList.remove('hidden');
}

let beginInFlight = false;
async function begin() {
  if (beginInFlight) return;
  beginInFlight = true;
  startBtn.disabled = true;
  clearError();
  try {
    await getMic();
  } catch (e) {
    beginInFlight = false;
    startBtn.disabled = false;
    setButtonMode('call');
    if (e.name === 'NotAllowedError' || e.name === 'SecurityError') {
      showError(t('errMicBlocked'));
    } else if (e.name === 'NotFoundError') {
      showError(t('errNoMic'));
    } else if (e.name === 'NotReadableError') {
      showError(t('errMicBusy'));
    } else {
      showError(t('errMicRequired'));
    }
    return;
  }
  beginInFlight = false;

  registerProfile();

  isSearching = true;
  enterCallUI();
  setCallState('searching');
  setState('waiting');
  setConnection('orange', 'connSearching');
  setStatusText('statusSearching');
  setSubText('subHangTight');

  socket.emit('find-partner');
}

const ageConsentModal = document.getElementById('ageConsentModal');
const openTermsFromConsent = document.getElementById('openTermsFromConsent');
const ageAgreeBtn = document.getElementById('ageAgreeBtn');
const CONSENT_KEY = 'talklive_age_consent';

// Start a call from the green "Call" button — gated by the one-time age/terms
// consent, then mic permission (handled in begin()).
function startCallFlow() {
  playTapSound();
  clearError();
  if (localStorage.getItem(CONSENT_KEY) === 'yes') {
    begin();
  } else {
    openModal(ageConsentModal);
  }
}

openTermsFromConsent.addEventListener('click', () => openModal(termsModal));

// The Tap-to-Talk landing orb: same flow as the green Call button.
startBtn.addEventListener('click', startCallFlow);

ageAgreeBtn.addEventListener('click', () => {
  localStorage.setItem(CONSENT_KEY, 'yes');
  closeModal(ageConsentModal);
  begin();
});

// Keep searching for a new person (used after a hang-up when auto-call is on).
function findNextPerson(statusKey) {
  clearError();
  isSearching = true;
  setCallState('searching');
  setState('waiting');
  setConnection('orange', 'connSearching');
  setStatusText(statusKey || 'statusSearching');
  setSubText('subHangTight');
  socket.emit('find-partner');
}

// The single Call button, four modes:
//   call    → start searching
//   loading → cancel the current search
//   hangup  → ask "are you sure?" (yellow), call stays live
//   confirm → actually hang up; then re-search if the checkbox is checked
callMainBtn.addEventListener('click', () => {
  const mode = callMainBtn.dataset.mode;

  if (mode === 'confirm') {
    // Second press confirms the hang-up.
    clearHangupConfirm();
    playHangupSound();
    socket.emit('leave');
    if (autoCallEnabled) {
      findNextPerson('statusFindingNew');
    } else {
      goIdleOnCallScreen('statusYouLeft');
    }
  } else if (mode === 'hangup') {
    // First press → yellow "are you sure?". The call is still live; auto-revert
    // to red after a few seconds so a stray tap doesn't strand the button.
    hangupConfirm = true;
    setButtonMode('confirm');
    clearTimeout(hangupConfirmTimer);
    hangupConfirmTimer = setTimeout(() => {
      if (hangupConfirm && callState === 'connected') {
        hangupConfirm = false;
        setButtonMode('hangup');
      }
    }, 4000);
  } else if (mode === 'loading') {
    // Cancel an in-progress search/connection.
    socket.emit('leave');
    goIdleOnCallScreen();
  } else {
    // Green "Call" — begin a new search.
    startCallFlow();
  }
});

reportBtn.addEventListener('click', () => {
  if (!confirm(t('confirmReport'))) return;
  teardownPeer();
  clearChat();
  isSearching = true;
  setCallState('searching');
  setState('waiting');
  setConnection('red', 'connReported');
  setStatusText('statusReported');
  socket.emit('report');
  setTimeout(() => setConnection('orange', 'connSearching'), 600);
});

muteBtn.addEventListener('click', () => {
  if (!localStream) return;
  isMuted = !isMuted;
  localStream.getAudioTracks().forEach((t) => (t.enabled = !isMuted));
  muteBtn.classList.toggle('muted', isMuted);
  muteBtn.setAttribute('aria-pressed', isMuted ? 'true' : 'false');
  muteSlash.classList.toggle('hidden', !isMuted);
  orb.classList.toggle('muted-self', isMuted);
  socket.emit('mic-state', isMuted);
});

// --- Chat panel: slides in from the right; swipe right to close. ---
function openChatPanel() {
  chatOpen = true;
  chatPanel.classList.add('open');
  chatOverlay.classList.remove('hidden');
  chatBadge.classList.add('hidden');
  if (!chatInput.disabled) setTimeout(() => chatInput.focus(), 60);
  scrollChatToBottom();
}

function closeChatPanel() {
  chatOpen = false;
  chatPanel.classList.remove('open');
  chatOverlay.classList.add('hidden');
}

function scrollChatToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

chatToggleBtn.addEventListener('click', () => {
  if (chatOpen) closeChatPanel();
  else openChatPanel();
});
closeChatBtn.addEventListener('click', closeChatPanel);
chatOverlay.addEventListener('click', closeChatPanel);

// Swipe right on the panel closes it (matches the slide-in direction).
let chatTouchStartX = null;
let chatTouchStartY = null;
chatPanel.addEventListener('touchstart', (e) => {
  chatTouchStartX = e.touches[0].clientX;
  chatTouchStartY = e.touches[0].clientY;
}, { passive: true });
chatPanel.addEventListener('touchmove', (e) => {
  if (chatTouchStartX === null) return;
  const dx = e.touches[0].clientX - chatTouchStartX;
  const dy = e.touches[0].clientY - chatTouchStartY;
  // Mostly-horizontal rightward swipe past a threshold → close.
  if (dx > 70 && Math.abs(dx) > Math.abs(dy)) {
    chatTouchStartX = null;
    closeChatPanel();
  }
}, { passive: true });
chatPanel.addEventListener('touchend', () => {
  chatTouchStartX = null;
  chatTouchStartY = null;
});

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  if (messageHasLink(text)) {
    addChatMessage(t('errNoLinks'), 'system');
    return;
  }
  const el = addChatMessage(text, 'me');
  playSendSound();
  vibrate(15);
  socket.emit('chat-message', text);
  // Optimistic WhatsApp-style delivery: mark "sent" on the next tick once the
  // message has left the client (the relay is fire-and-forget server-side).
  const ticks = el.querySelector('.chat-msg-ticks');
  if (ticks) setTimeout(() => ticks.classList.replace('sending', 'sent'), 220);
  chatInput.value = '';
  chatInput.focus();
});

// Server-side link filter rejected a message we let through — surface it.
socket.on('chat-blocked', () => {
  const target = friendChatModal.classList.contains('hidden') ? chatMessages : friendChatMessages;
  const el = document.createElement('div');
  el.className = 'chat-msg system';
  el.textContent = t('errNoLinks');
  target.appendChild(el);
  target.scrollTop = target.scrollHeight;
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
  clearTimeout(typingHideTimeout);
  typingHideTimeout = setTimeout(() => {
    typingIndicator.classList.add('hidden');
  }, 3000);
});

// --- Socket events ---
socket.on('online-count', (count) => {
  lastOnlineCount = count;
  onlineCountEl.textContent = count;
});

socket.on('waiting', ({ estimatedSeconds, predicted } = {}) => {
  setState('waiting');
  setConnection('orange', 'connSearching');
  // Predicted match preview, e.g. "Connecting to someone in Japan…", based on
  // who's online right now — shown before the actual connection completes.
  if (predicted && predicted.countryCode && predicted.countryCode !== 'XX') {
    setStatusText('statusConnectingTo', { country: getCountryName(predicted.countryCode) || predicted.country });
  } else {
    setStatusText('statusSearching');
  }
  if (estimatedSeconds) setSubText('subUsuallyMatches', { s: estimatedSeconds });
  else setSubText('subHangTight');
});

// After ~10s of waiting the server drops every filter and auto-matches with
// any random stranger instead of leaving the user stuck.
socket.on('random-fallback', () => {
  setStatusText('statusConnectingRandom');
  setSubText('subCountryFallback');
});

socket.on('matched', async ({ initiator, partner, rematched, callback }) => {
  // A deferred-UI callback (rule 11) is on the friends menu with a spinner —
  // now that the peer accepted, restore the icon and enter the call screen.
  restoreCallbackSpinner();
  if (typeof friendsDropdown !== 'undefined') closeModal(friendsDropdown);
  enterCallUI();

  // Never let a mute from a previous call silently carry into a new one.
  if (isMuted) {
    isMuted = false;
    if (localStream) localStream.getAudioTracks().forEach((t) => (t.enabled = true));
    muteBtn.classList.remove('muted');
    muteSlash.classList.add('hidden');
    orb.classList.remove('muted-self');
    socket.emit('mic-state', false);
  }

  // State: 'connecting' — a peer was found but the media path is NOT yet
  // established. Deliberately keep "You're connected" and the stranger's
  // username hidden until ontrack confirms a real connection (rule 3).
  setState('waiting');
  setCallState('connecting');
  setConnection('orange', 'connConnecting');
  if (callback) setStatusText('statusCallingBack', { name: partner.username });
  else setStatusText('statusConnectingTo', { country: getCountryName(partner.countryCode) || partner.country });
  if (rematched) setSubText('subRematched');
  else setSubText(null);

  // Stash everything needed to reveal the partner once media actually flows.
  currentPartner = partner;
  currentPartnerInterests = partner.interests || [];
  partnerCard.classList.add('hidden');
  sharedInterestNote.classList.add('hidden');
  reactionBar.classList.add('hidden');

  lockSkipButton();

  await startCall(initiator);
});

// Populate + reveal the stranger's card only once the connection is confirmed.
function revealPartner() {
  const partner = currentPartner;
  if (!partner) return;
  addFriendBtn.classList.remove('added');
  addFriendBtn.disabled = false;
  partnerName.textContent = partner.username;
  // Country/flag only — never show anything gendered about the stranger.
  partnerMeta.innerHTML = getFlagImg(partner.countryCode);

  partnerInterests.innerHTML = '';
  currentPartnerInterests.forEach((i) => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = i;
    partnerInterests.appendChild(tag);
  });
  partnerCard.classList.remove('hidden');

  const shared = currentPartnerInterests.filter((i) => (appliedFilters.interests || []).includes(i));
  if (shared.length > 0) {
    sharedInterestNote.textContent = t('bothLike', { list: shared.join(', ') });
    sharedInterestNote.classList.remove('hidden');
  } else {
    sharedInterestNote.classList.add('hidden');
  }

  reactionBar.classList.remove('hidden');
  if (!callStartedAt) startCallTimer();
}

socket.on('reaction', (reaction) => {
  showReactionFloat(reaction);
});

socket.on('banned', () => {
  showError(t('errBanned'));
  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }
  resetUI();
});

// --- Call back: re-connect directly with someone from Call History ---
function showCallBackBanner(fromClientId, username) {
  pendingCallBackFrom = fromClientId;
  callBackBannerText.innerHTML = `${ICONS.call} ${t('notifWantsCallback', { name: escapeHtml(username) })}`;
  callBackBanner.classList.remove('hidden');
}

function hideCallBackBanner() {
  callBackBanner.classList.add('hidden');
  pendingCallBackFrom = null;
}

// In-place spinner for the friends-list call icon (rule 11).
let activeCallbackSpinner = null;
function startCallbackSpinner(btn) {
  if (activeCallbackSpinner) restoreCallbackSpinner();
  activeCallbackSpinner = { btn, html: btn.innerHTML };
  btn.classList.add('is-loading');
  btn.disabled = true;
  btn.innerHTML = '<span class="callback-spinner" aria-label="Connecting…"></span>';
}
function restoreCallbackSpinner() {
  if (!activeCallbackSpinner) return;
  const { btn, html } = activeCallbackSpinner;
  btn.classList.remove('is-loading');
  btn.disabled = false;
  btn.innerHTML = html;
  activeCallbackSpinner = null;
}

async function requestCallBack(targetClientId, targetUsername, opts = {}) {
  if (isSearching) {
    restoreCallbackSpinner();
    showError(t('errFinishCall'));
    return;
  }
  clearError();
  try {
    await getMic();
  } catch (e) {
    restoreCallbackSpinner();
    showError(t('errMicCallback'));
    return;
  }

  registerProfile();
  isSearching = true;
  // deferUI keeps us on the friends menu with the spinner until the peer
  // accepts; the call screen is entered from the 'matched' handler instead.
  if (!opts.deferUI) {
    enterCallUI();
    setCallState('searching');
    setState('waiting');
    setConnection('orange', 'connCalling');
    setStatusText('statusCalling', { name: targetUsername });
    setSubText('subWaitingAccept');
  }

  socket.emit('call-back-request', { targetClientId });
}

async function acceptCallBack(fromClientId) {
  if (isSearching) {
    socket.emit('call-back-respond', { fromClientId, accept: false });
    showError(t('errFinishBeforeAccept'));
    return;
  }
  clearError();
  try {
    await getMic();
  } catch (e) {
    socket.emit('call-back-respond', { fromClientId, accept: false });
    showError(t('errMicAccept'));
    return;
  }

  registerProfile();
  isSearching = true;
  enterCallUI();
  setCallState('searching');
  setState('waiting');
  setConnection('orange', 'connConnecting');
  setStatusText('statusConnecting');
  setSubText(null);

  socket.emit('call-back-respond', { fromClientId, accept: true });
}

function abandonCallBack() {
  restoreCallbackSpinner();
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
  if (reason === 'offline') showError(t('errOffline'));
  else if (reason === 'busy') showError(t('errBusy'));
  else if (reason === 'blocked') showError(t('errBlocked'));
  else showError(t('errCallbackFailed'));
});

socket.on('call-back-declined', ({ username }) => {
  abandonCallBack();
  showError(t('errDeclined', { name: username }));
});

socket.on('signal', (data) => {
  handleSignal(data);
});

socket.on('partner-left', () => {
  playHangupSound();
  teardownPeer();
  clearChat();
  if (isSearching && autoCallEnabled) {
    // Auto-connect enabled: immediately keep connecting to new people, no
    // confirmation ever — this loop only stops when the user stops it.
    setCallState('searching');
    setState('waiting');
    setConnection('red', 'connDisconnected');
    setStatusText('statusStrangerLeft');
    setSubText('subHangTight');
    socket.emit('find-partner');
    setTimeout(() => setConnection('orange', 'connSearching'), 600);
  } else if (isSearching) {
    // Other side hung up with auto-connect off: back to the initial
    // Call + Skip state — no lingering Hang Up button.
    socket.emit('leave');
    goIdleOnCallScreen('statusStrangerLeft');
  }
});

socket.on('partner-mic-state', (muted) => {
  orb.classList.toggle('muted-remote', muted);
  if (muted) {
    setSubText('subStrangerMuted');
  } else {
    setSubTextFading('subSayHi');
  }
});

socket.on('chat-message', ({ text }) => {
  addChatMessage(text, 'them');
  playMessageSound();
  vibrate(20);
  if (!chatOpen) {
    chatBadge.classList.remove('hidden');
  } else {
    scrollChatToBottom();
  }
});

socket.on('disconnect', () => {
  socketConnected = false;
  refreshNetStatus();
  showError(t('errConnLost'));
  if (isSearching) setConnection('red', 'connDisconnected');
});

socket.on('connect', () => {
  socketConnected = true;
  refreshNetStatus();
  clearError();
  if (isSearching) setConnection('orange', 'connReconnecting');
  // Re-register on every (re)connect so the server always has a live socket
  // for this clientId, and so friends/notifications resync after being offline.
  if (lastRegisterPayload) socket.emit('register', lastRegisterPayload);
  // Mobile browsers drop the socket when backgrounded/screen off. With
  // auto-connect on, silently resume the search loop instead of stalling.
  if (isSearching && callState !== 'connected' && autoCallEnabled) {
    socket.emit('find-partner');
  }
});

// --- Language switching: re-render every dynamic (JS-generated) piece of UI.
// Static HTML is handled by applyI18n() in i18n.js via data-i18n attributes;
// this covers text that was set from JS with t() and needs a fresh render.
window.addEventListener('i18n-changed', () => {
  if (lastStatusMsg) statusText.textContent = t(lastStatusMsg.key, lastStatusMsg.vars);
  if (lastSubMsg) subText.textContent = t(lastSubMsg.key, lastSubMsg.vars);
  if (lastConn) connectionLabel.textContent = t(lastConn.labelKey);
  // Re-render the single Call button's label in its current mode.
  setButtonMode(callMainBtn.dataset.mode || 'call');
  refreshNetStatus();

  renderNotifications(); // also re-renders the friends list + badges
  renderHistory();
  includeCountryWidget.renderChips();
  excludeCountryWidget.renderChips();
  renderInterestTags();

  if (activeFriendChatId) {
    const friend = friendsData.find((f) => f.clientId === activeFriendChatId);
    friendChatTitle.textContent = friend ? t('chatWith', { name: friend.username }) : t('chat');
    renderFriendChatMessages();
  }
});

// Initial state: the Tap-to-Talk landing, a green idle Call button ready for
// when the call screen opens, and an unchecked auto-call checkbox.
autoCallCheckbox.checked = autoCallEnabled;
setCallState('idle');
setState('idle');
setStatusText('statusIdle');
setSubText('subIdle');
refreshNetStatus();
