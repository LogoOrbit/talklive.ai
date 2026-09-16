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
const brandDot = document.getElementById('brandDot');

const setupPanel = document.getElementById('setupPanel');
const startBtn = document.getElementById('startBtn');
const startChatBtn = document.getElementById('startChatBtn');
const shareTalkLiveBtn = document.getElementById('shareTalkLiveBtn');
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
const gameBtn = document.getElementById('gameBtn');
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
const callTimerEl = document.getElementById('orbTimer');
const orbEmojiFlash = document.getElementById('orbEmojiFlash');
const sharedInterestNote = document.getElementById('sharedInterestNote');
const reactionBar = document.getElementById('reactionBar');
const reactionOverlay = document.getElementById('reactionOverlay');

const chatBadge = document.getElementById('chatBadge');
const typingIndicator = document.getElementById('typingIndicator');

// Every partner search declares which pool it joins. The main app is voice
// only now - text chat lives on its own dedicated page at /chat.
function findPartnerPayload() {
  // The animal rides along with the search itself, so switching it between two
  // calls takes effect on the very next match without waiting for a
  // re-register round trip.
  return { mode: 'talk', animal: myAnimal };
}

// Every search goes through here so one watchdog can tell an acknowledged
// search from a lost one. The server answers 'find-partner' with 'waiting' (or
// 'matched') straight away, so a search with no answer means the request never
// took effect - a socket that reconnected under a new id, a registration that
// had not landed yet - and the UI would otherwise spin forever.
let searchAcked = false;
function emitFindPartner() {
  searchAcked = false;
  // Looking for the next person: whoever dropped is no longer the news.
  if (typeof hidePeerGone === 'function') hidePeerGone();
  socket.emit('find-partner', findPartnerPayload());
}
function markSearchAcked() {
  searchAcked = true;
}
const historyBtn = document.getElementById('historyBtn');
// Lite mode for weak hardware: fewer decorative effects, same features.
try {
  const conn = navigator.connection || {};
  if ((navigator.deviceMemory && navigator.deviceMemory <= 2) ||
      (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) ||
      conn.saveData === true ||
      /(^|-)2g$/.test(conn.effectiveType || '')) {
    document.documentElement.classList.add('perf-lite');
  }
} catch (e) {}

// Shadow under the sticky header only once the page has actually scrolled.
(() => {
  const nav = document.querySelector('.topbar');
  if (!nav) return;
  let stuck = false;
  const onScroll = () => {
    const s = window.scrollY > 4;
    if (s !== stuck) { stuck = s; nav.classList.toggle('is-stuck', s); }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

const historyDropdown = document.getElementById('historyDropdown');
const historyWrap = document.querySelector('.history-wrap');
const closeHistoryBtn = document.getElementById('closeHistoryBtn');
const historyList = document.getElementById('historyList');

const friendsBtn = document.getElementById('friendsBtn');
const friendsMsgBadge = document.getElementById('friendsMsgBadge');
const friendsDropdown = document.getElementById('friendsDropdown');
const friendsOverlay = document.getElementById('friendsOverlay');
const closeFriendsBtn = document.getElementById('closeFriendsBtn');
const friendsList = document.getElementById('friendsList');

const friendProfileModal = document.getElementById('friendProfileModal');
const friendProfileOverlay = document.getElementById('friendProfileOverlay');
const closeFriendProfileBtn = document.getElementById('closeFriendProfileBtn');
const friendProfileAvatar = document.getElementById('friendProfileAvatar');
const friendProfileName = document.getElementById('friendProfileName');
const friendProfileRealName = document.getElementById('friendProfileRealName');
const friendProfileRenameBtn = document.getElementById('friendProfileRenameBtn');
const friendProfileStatus = document.getElementById('friendProfileStatus');
const friendProfileChatBtn = document.getElementById('friendProfileChatBtn');
const friendProfileRemoveBtn = document.getElementById('friendProfileRemoveBtn');
const friendProfileBlockBtn = document.getElementById('friendProfileBlockBtn');
const friendProfileReportBtn = document.getElementById('friendProfileReportBtn');
const friendProfileAddBtn = document.getElementById('friendProfileAddBtn');
const friendProfileAcceptBtn = document.getElementById('friendProfileAcceptBtn');
const friendProfileDeclineBtn = document.getElementById('friendProfileDeclineBtn');
const friendProfilePending = document.getElementById('friendProfilePending');
const peerGoneBanner = document.getElementById('peerGoneBanner');
const peerGoneTitle = document.getElementById('peerGoneTitle');
const peerGoneSub = document.getElementById('peerGoneSub');
const friendChatPresence = document.getElementById('friendChatPresence');
const friendChatPresenceTitle = document.getElementById('friendChatPresenceTitle');
const friendChatPresenceSub = document.getElementById('friendChatPresenceSub');
const settingsProfileRow = document.getElementById('settingsProfileRow');
const settingsProfileAvatar = document.getElementById('settingsProfileAvatar');
const settingsProfileName = document.getElementById('settingsProfileName');
const settingsProfileJoined = document.getElementById('settingsProfileJoined');
const settingsShopRow = document.getElementById('settingsShopRow');
const settingsBillingRow = document.getElementById('settingsBillingRow');
const shopModal = document.getElementById('shopModal');
const closeShopBtn = document.getElementById('closeShopBtn');
const shopGrid = document.getElementById('shopGrid');
const shopBalanceNum = document.getElementById('shopBalanceNum');
const billingModal = document.getElementById('billingModal');
const closeBillingBtn = document.getElementById('closeBillingBtn');
const billingEmailValue = document.getElementById('billingEmailValue');

const notifList = document.getElementById('notifList');

const friendChatModal = document.getElementById('friendChatModal');
const friendChatOverlay = document.getElementById('friendChatOverlay');
const closeFriendChatBtn = document.getElementById('closeFriendChatBtn');
const friendChatTitle = document.getElementById('friendChatTitle');
const friendChatMessages = document.getElementById('friendChatMessages');
const friendChatForm = document.getElementById('friendChatForm');
const friendChatInput = document.getElementById('friendChatInput');

// Reply / emoji / GIF / reaction controllers for the two chat surfaces here.
// Declared up with the DOM refs because both the renderers and the attach calls
// below reference them, and a `let` further down would put every earlier line in
// its temporal dead zone - which throws at load and takes the whole app with it.
let strangerExtras = null;
let friendExtras = null;

// --- Side-panel helpers shared by the Friends / Friend-profile / Friend-chat panels ---
function openSidePanel(panel, overlay) {
  panel.classList.add('open');
  overlay.classList.remove('hidden');
}
function closeSidePanel(panel, overlay) {
  panel.classList.remove('open');
  overlay.classList.add('hidden');
}

const callBackBanner = document.getElementById('callBackBanner');
const callBackBannerText = document.getElementById('callBackBannerText');
const callBackAcceptBtn = document.getElementById('callBackAcceptBtn');
const callBackDeclineBtn = document.getElementById('callBackDeclineBtn');

const myAccountBtn = document.getElementById('myAccountBtn');
// Header auth: the always-visible pair, swapped for one account button when
// signed in. Mirrors the side panel's pair, which stays where it was.
const headerAuth = document.getElementById('headerAuth');
const headerLoginBtn = document.getElementById('headerLoginBtn');
const headerSignupBtn = document.getElementById('headerSignupBtn');
const headerAccountBtn = document.getElementById('headerAccountBtn');
const headerLinkProfileBtn = document.getElementById('headerLinkProfileBtn');
const linkProfileBanner = document.getElementById('linkProfileBanner');
const linkProfileCard = document.getElementById('linkProfileCard');
const linkProfileAvatar = document.getElementById('linkProfileAvatar');
const linkProfileName = document.getElementById('linkProfileName');
const linkProfileCreated = document.getElementById('linkProfileCreated');
const linkProfileFriends = document.getElementById('linkProfileFriends');
const acceptCallsCheckbox = document.getElementById('acceptCallsCheckbox');
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
const signupEmail = document.getElementById('signupEmail');
const signupSubmitBtn = document.getElementById('signupSubmitBtn');
const googleBtnLogin = document.getElementById('googleBtnLogin');
const googleBtnSignup = document.getElementById('googleBtnSignup');
// Declared up here, not next to the Google sign-in code below: applyTheme()
// runs during start-up and calls renderGoogleButtons(), which reads this. A
// `let` further down would still be in its temporal dead zone at that point
// and throw, taking the rest of app.js (every button handler) with it.
let googleReady = false;
const logoutBtn = document.getElementById('logoutBtn');
const settingsNickname = document.getElementById('settingsNickname');
const updateNicknameBtn = document.getElementById('updateNicknameBtn');
const currentPasswordInput = document.getElementById('currentPasswordInput');
const newPasswordInput = document.getElementById('newPasswordInput');
const changePasswordBtn = document.getElementById('changePasswordBtn');
const recoveryEmailInput = document.getElementById('recoveryEmailInput');
const recoveryEmailPassword = document.getElementById('recoveryEmailPassword');
const recoveryEmailState = document.getElementById('recoveryEmailState');
const updateRecoveryEmailBtn = document.getElementById('updateRecoveryEmailBtn');
// Forgot password (email -> OTP -> new password)
const forgotTab = document.getElementById('forgotTab');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const forgotStepEmail = document.getElementById('forgotStepEmail');
const forgotStepCode = document.getElementById('forgotStepCode');
const forgotStepPassword = document.getElementById('forgotStepPassword');
const forgotEmail = document.getElementById('forgotEmail');
const forgotSendBtn = document.getElementById('forgotSendBtn');
const forgotCode = document.getElementById('forgotCode');
const forgotVerifyBtn = document.getElementById('forgotVerifyBtn');
const forgotResendBtn = document.getElementById('forgotResendBtn');
const forgotNewPassword = document.getElementById('forgotNewPassword');
const forgotResetBtn = document.getElementById('forgotResetBtn');
const forgotBackBtn = document.getElementById('forgotBackBtn');

const appSettingsBtn = document.getElementById('appSettingsBtn');
const appSettingsPanel = document.getElementById('appSettingsPanel');
const appSettingsOverlay = document.getElementById('appSettingsOverlay');
const closeAppSettingsBtn = document.getElementById('closeAppSettingsBtn');
const themeGroup = document.getElementById('themeGroup');
const soundToggle = document.getElementById('soundToggle');
const vibrationToggle = document.getElementById('vibrationToggle');
const statusVisibilityToggle = document.getElementById('statusVisibilityToggle');
const messageSeenToggle = document.getElementById('messageSeenToggle');
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
// (left panel) and to your friends (friends list / profile) - never to the
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

// Friends list shows a simple gendered person avatar instead of an avatar
// image: a blue man for male, a pink woman for female, a grey person when the
// gender isn't known. Gender is derived from the chosen avatar id prefix (m*/f*).
function genderIcon(avatarId, size = 30) {
  const g = typeof avatarId === 'string' && (avatarId[0] === 'm' || avatarId[0] === 'f') ? avatarId[0] : null;
  const cls = g === 'm' ? 'gender-male' : (g === 'f' ? 'gender-female' : 'gender-neutral');
  // Filled bust silhouettes: the woman gets a longer-hair outline so the two
  // read differently even at small sizes.
  const man = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="7.4" r="3.9"/><path d="M4.6 20.4c.5-4.3 3.5-6.9 7.4-6.9s6.9 2.6 7.4 6.9a.9.9 0 0 1-.9 1H5.5a.9.9 0 0 1-.9-1z"/></svg>';
  const woman = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.6c-3.4 0-5.6 2.5-5.6 5.8 0 1.9.4 3.3 1 4.4l-.9 2.1a.7.7 0 0 0 .6 1h9.8a.7.7 0 0 0 .6-1l-.9-2.1c.6-1.1 1-2.5 1-4.4 0-3.3-2.2-5.8-5.6-5.8z" opacity="0.55"/><circle cx="12" cy="8" r="3.4"/><path d="M4.9 20.5c.5-4 3.4-6.4 7.1-6.4s6.6 2.4 7.1 6.4a.85.85 0 0 1-.85.95H5.75a.85.85 0 0 1-.85-.95z"/></svg>';
  const person = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="7.4" r="3.9"/><path d="M4.6 20.4c.5-4.3 3.5-6.9 7.4-6.9s6.9 2.6 7.4 6.9a.9.9 0 0 1-.9 1H5.5a.9.9 0 0 1-.9-1z"/></svg>';
  const svg = g === 'm' ? man : (g === 'f' ? woman : person);
  return `<span class="gender-icon ${cls}" style="width:${size}px;height:${size}px" aria-hidden="true">${svg}</span>`;
}

let myAvatar = localStorage.getItem('talklive_avatar');
if (myAvatar && !AVATAR_STYLES[myAvatar]) myAvatar = null;
let avatarCat = myAvatar && myAvatar[0] === 'f' ? 'female' : 'male';

// --- Spirit animal -----------------------------------------------------------
// Unlike the avatar (private, gendered, friends-only) this is the one thing the
// stranger DOES see: it is self-chosen, says nothing about who you are, and
// exists purely so two people who have never spoken have something to open
// with. Artwork and storage live in animals.js, shared with /chat.
const Animals = window.TalkLiveAnimals;
const animalGrid = document.getElementById('animalGrid');
const animalChosenText = document.getElementById('animalChosen');
const partnerAnimalEl = document.getElementById('partnerAnimal');
let myAnimal = Animals ? Animals.stored() : null;

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

// --- Clearly unsafe / illegal solicitations. Mirrors the server's UNSAFE_RE so
// the sender is told locally instead of the message being dropped silently. ---
const UNSAFE_RE = /\b(child\s*porn|cp\s*trade|loli(?:con)?|jailbait|sell(?:ing)?\s+(?:drugs|guns|weapons)|buy\s+(?:drugs|cocaine|heroin|meth|fentanyl)|hire\s*(?:a\s*)?hitman|credit\s*card\s*numbers?|send\s+nudes|onlyfans|escort\s*service|invest\s+in\s+(?:crypto|bitcoin)|gift\s*cards?\s+for)\b/i;
function messageIsUnsafe(text) {
  return UNSAFE_RE.test(String(text || ''));
}

// Static fallback used until (and if) the server's /ice-servers responds.
// STUN only: public "free TURN" endpoints are unreliable and the ones that used
// to sit here no longer exist, so relying on them just produced silent calls.
//
// Spread across independent operators and across ports 3478/80/443 on purpose -
// Google's STUN hosts are blocked outright in mainland China and unreliable in
// Iran and Russia, and UDP 19302 is dropped by many corporate, school and
// carrier firewalls that still pass 80/443. With a single provider those users
// gather no reflexive candidate at all, which presents as a call that connects
// and then stays silent. Mirrors PUBLIC_STUN_URLS in server/index.js.
const FALLBACK_STUN_URLS = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun.cloudflare.com:3478',
  'stun:stun.cloudflare.com:53',
  'stun:global.stun.twilio.com:3478',
  'stun:stun.relay.metered.ca:80',
  'stun:stun.nextcloud.com:443',
];
let ICE_SERVERS = [{ urls: FALLBACK_STUN_URLS.slice() }];

// 'relay' hides both peers' IPs but requires a working TURN server. Forcing it
// without one leaves the browser with zero candidates: the SDP still completes,
// so the UI looked "connected" while no audio could ever flow. Only the server
// may turn it on, and only when it actually publishes a TURN relay.
let ICE_TRANSPORT_POLICY = 'all';

// Pull the authoritative (possibly env-configured, more reliable) TURN list from
// the server as early as possible so the very first call already relays properly.
// startCall() awaits this so the first match never races the fetch and gets
// built with the bare STUN fallback.
// TURN credentials minted by /ice-servers are HMACs that expire after one hour.
// Fetching the list once at page load meant a tab left open longer than that
// started its next call with credentials the relay rejects (TURN 401): the
// relay candidates are gathered, none of them authenticate, and the call
// negotiates and then carries no audio - the exact failure TURN exists to
// prevent, hitting the users who need it most. So the config is refetched
// whenever it is older than the refresh window below.
const ICE_CONFIG_MAX_AGE_MS = 45 * 60 * 1000; // comfortably inside the 1h credential TTL
// A hung request must not block the call forever - startCall() awaits this.
const ICE_FETCH_TIMEOUT_MS = 6000;
let iceConfigFetchedAt = 0;

// The RTCPeerConnection constructor validates every ICE entry and throws
// *synchronously* if one is malformed - a turn: URL with no username/credential
// raises InvalidAccessError, a stun: URL that carries credentials raises
// SyntaxError. That exception aborts call setup before any candidate is
// gathered and before the connect watchdog exists, so the user is left on
// "Connecting…" indefinitely with nothing to recover them. The server already
// filters its own list, but this list arrives over the network from a
// third-party TURN provider, so re-check it here rather than trusting it: one
// bad entry from an upstream API would otherwise break every call on the site.
function sanitiseIceServers(list) {
  const out = [];
  for (const entry of Array.isArray(list) ? list : []) {
    if (!entry || typeof entry !== 'object') continue;
    const urls = [].concat(entry.urls || entry.url || [])
      .map((u) => String(u).trim())
      .filter((u) => /^(stun|stuns|turn|turns):/i.test(u));
    if (!urls.length) continue;
    const relay = urls.filter((u) => /^turns?:/i.test(u));
    const stun = urls.filter((u) => !/^turns?:/i.test(u));
    if (stun.length) out.push({ urls: stun });
    if (relay.length && entry.username && entry.credential) {
      out.push({ urls: relay, username: String(entry.username), credential: String(entry.credential) });
    }
  }
  return out;
}

function applyIceConfig(data) {
  const clean = data && sanitiseIceServers(data.iceServers);
  if (clean && clean.length) {
    ICE_SERVERS = clean;
    iceConfigFetchedAt = Date.now();
  }
  // Re-evaluated on every refresh: a relay that has been removed from the
  // server's config must also drop relay-only, or the browser is left gathering
  // nothing at all.
  ICE_TRANSPORT_POLICY = (data && data.iceTransportPolicy === 'relay' && iceListHasRelay(ICE_SERVERS))
    ? 'relay'
    : 'all';
}

function fetchIceConfig() {
  // AbortSignal.timeout is not everywhere yet; fall back to a plain race.
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), ICE_FETCH_TIMEOUT_MS));
  return Promise.race([
    fetch('/ice-servers', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
    timeout,
  ])
    .then(applyIceConfig)
    .catch(() => { /* keep whatever list we already have */ });
}

let iceConfigReady = fetchIceConfig();

// Called just before a call is set up. Cheap no-op while the cached config is
// still fresh; a refetch once its credentials are near expiry.
function refreshIceConfigIfStale() {
  if (iceConfigFetchedAt && Date.now() - iceConfigFetchedAt < ICE_CONFIG_MAX_AGE_MS) {
    return iceConfigReady;
  }
  iceConfigReady = fetchIceConfig();
  return iceConfigReady;
}

function iceListHasRelay(list) {
  return (list || []).some((s) => []
    .concat(s && s.urls ? s.urls : [])
    .some((u) => /^turns?:/i.test(String(u))));
}

const selectedInterests = new Set();
const includeCountries = new Set(); // draft "Interested Countries" - only match these, if any chosen
const excludeCountries = new Set(); // draft "Non Interested Countries" - never match these

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
// The account's recovery email, as the server last reported it. Cached locally
// only so the My Account panel can show it before the socket reconnects; the
// server is always the authority.
let accountEmail = localStorage.getItem('talklive_email') || '';
// Durable session token: proves the login to the server after every page
// reload / reconnect, so an account is never lost to a refresh or a deploy.
let sessionToken = localStorage.getItem('talklive_session') || null;
let tempUsername = localStorage.getItem('talklive_tempname') || null;
// Always starts unchecked when the app is opened, regardless of last session.
let autoCallEnabled = false;
let wasConnected = false;

// --- Friends / notifications / friend chat / call-back state ---
let friendsData = [];        // [{ clientId, username, nickname, countryCode, temporary, online }]

// What to call a friend. A nickname is a private label this account put on
// them - the friend is never told and keeps their own name everywhere else -
// so every friend-facing surface goes through here rather than reading
// .username directly, and they all change the moment one is set.
function friendLabel(person) {
  if (!person) return '';
  return (person.nickname && person.nickname.trim()) || person.username || '';
}

// The same, for a bare clientId: notifications and call-backs arrive carrying
// whatever name the *server* knows, which is never the private one.
function labelForClientId(clientId, fallback) {
  const friend = friendsData.find((f) => f.clientId === clientId);
  return (friend && friendLabel(friend)) || fallback || '';
}
let friendRequestsData = []; // [{ clientId, username, countryCode, temporary, ts }]
// Requests this user has sent and not heard back from, so a profile can say
// "Pending" rather than offering to ask the same person twice.
let sentRequestsData = [];   // [{ clientId, username, countryCode, avatar, ts }]
// Which set of actions the open profile sheet is showing (see relationTo).
let activeProfileRelation = 'friend';
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
// Voice-call invite deep link: /call?invite=<token>, followed after a partner
// on /chat accepted a call request. Both sides land here with fresh sockets;
// 'voice-invite-join' tells the server who arrived, and it force-pairs the
// two token holders the moment both are present (see joinVoiceInvite below).
let pendingInviteToken = null;
try {
  pendingInviteToken = new URLSearchParams(location.search).get('invite');
} catch (e) { /* very old browser without URLSearchParams - ignore */ }

function getClientId() {
  let id = localStorage.getItem('talklive_client_id');
  if (!id) {
    id = 'c_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('talklive_client_id', id);
    // When this profile came into existence, so the sign-up screen can show
    // what the new account is about to inherit. Only ever set alongside a
    // freshly minted id: profiles from before this existed stay undated rather
    // than claiming to have been created today.
    localStorage.setItem('talklive_profile_created', String(Date.now()));
  }
  return id;
}

// Timestamp this browser's profile was created, or null if it predates the
// bookkeeping above.
function profileCreatedAt() {
  const raw = Number(localStorage.getItem('talklive_profile_created'));
  return Number.isFinite(raw) && raw > 0 ? raw : null;
}

function getIdentityToken() {
  return localStorage.getItem('talklive_identity_token') || '';
}

// The server hands a signing-in device the profile its account is linked to
// (see linkAccountProfile on the server). Adopting it is what makes an account
// worth having: the friends, chats and history made on the first device come
// back on the second one instead of it starting empty. The identity token
// arrives with it, because this browser has never held one for that profile.
//
// Returns true when the identity actually changed, which every caller follows
// with a reload - half the app is already holding the old clientId.
function adoptLinkedProfile(profileClientId, identityToken) {
  if (!profileClientId || profileClientId === getClientId()) return false;
  localStorage.setItem('talklive_client_id', profileClientId);
  if (identityToken) localStorage.setItem('talklive_identity_token', identityToken);
  else localStorage.removeItem('talklive_identity_token');
  // This browser cannot know how old the adopted profile is, and the account
  // is its record from here on.
  localStorage.removeItem('talklive_profile_created');
  return true;
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
            // Free tier: each country list is capped; premium is unlimited.
            if (!isPremiumUser && set.size >= freeLimits.countries) {
              showPremiumUpsell(t('premiumCountryLimit', { n: freeLimits.countries }));
              return;
            }
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

// Explicit Add button - many mobile keyboards have no obvious Enter key.
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
  // Google renders its own button, so it has to be redrawn for the new theme.
  if (typeof renderGoogleButtons === 'function') renderGoogleButtons();
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
    if (ctx.state === 'suspended') ctx.resume();
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
// A bright, instantly recognizable two-note message chime: a quick high "ti"
// that resolves up a fourth into a longer bell "ding". Deliberately crisp and
// high-pitched so it is never confused with the warm, lower friend chime.
function playMessageSound() {
  playTone(1245, 0.06, 'triangle', 0.15);
  playTone(1661, 0.20, 'sine', 0.15, 0.06);
}
// A crisp, tactile "whoosh" for sending - WhatsApp-style rising blip.
function playSendSound() { playTone(660, 0.05, 'sine', 0.14); playTone(990, 0.07, 'sine', 0.13, 0.04); }
// A soft two-note chime for "it's your turn" in the game.
function playTurnSound() { playTone(784, 0.1, 'sine', 0.16); playTone(1046, 0.13, 'sine', 0.15, 0.1); }
// Tic Tac Toe effects: a tick per move, a fanfare on win.
function playMoveSound() { playTone(660, 0.05, 'triangle', 0.13); }
function playWinSound() {
  [523, 659, 784, 1046].forEach((f, i) => playTone(f, 0.16, 'sine', 0.17, i * 0.11));
}
function playInviteSound() { playTone(880, 0.09, 'sine', 0.15); playTone(1174, 0.11, 'sine', 0.14, 0.09); }
// A warm, celebratory three-note rising arpeggio (D5 -> G5 -> D6) in a
// rounder, lower register than the message chime. It "feels" like a reward,
// so a new friend never sounds like an incoming message.
function playFriendAddedSound() {
  playTone(587, 0.11, 'sine', 0.17);
  playTone(784, 0.11, 'sine', 0.16, 0.10);
  playTone(1175, 0.26, 'triangle', 0.15, 0.20);
}

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

// --- Message "Seen" read receipts: opt-in, so turning it off stops both
// sending your own read receipts and showing "Seen" on messages you sent.
// Controlled from two places, kept in sync: the Settings toggle and a small
// button in the chat's top bar. ---
let messageSeenEnabled = localStorage.getItem('talklive_message_seen') !== 'off';
const chatSeenToggleBtn = document.getElementById('chatSeenToggleBtn');

function syncMessageSeenUi() {
  if (messageSeenToggle) messageSeenToggle.checked = messageSeenEnabled;
  if (chatSeenToggleBtn) {
    chatSeenToggleBtn.classList.toggle('is-off', !messageSeenEnabled);
    chatSeenToggleBtn.setAttribute('aria-pressed', messageSeenEnabled ? 'true' : 'false');
  }
}

function setMessageSeenEnabled(value) {
  messageSeenEnabled = value;
  localStorage.setItem('talklive_message_seen', messageSeenEnabled ? 'on' : 'off');
  syncMessageSeenUi();
  // Turning it back on while a chat is open should immediately send a receipt
  // for what I'm looking at, and refresh whether "Seen" shows on my messages.
  if (activeFriendChatId != null) {
    if (messageSeenEnabled && friendChatModal.classList.contains('open')) {
      socket.emit('chat-seen', { friendClientId: activeFriendChatId });
    }
    renderFriendChatMessages();
  }
}

messageSeenToggle.addEventListener('change', () => setMessageSeenEnabled(messageSeenToggle.checked));
if (chatSeenToggleBtn) {
  chatSeenToggleBtn.addEventListener('click', () => setMessageSeenEnabled(!messageSeenEnabled));
}
syncMessageSeenUi();

// Lock the main screen's scroll whenever a side panel (settings or chat) is
// open, so scrolling only happens inside the open panel - never the page behind.
function updateScrollLock() {
  const anyOpen = appSettingsPanel.classList.contains('open')
    || (typeof chatPanel !== 'undefined' && chatPanel && chatPanel.classList.contains('open'))
    || friendsDropdown.classList.contains('open')
    || friendProfileModal.classList.contains('open')
    || friendChatModal.classList.contains('open');
  document.body.classList.toggle('panel-open', anyOpen);
}

// --- App settings side panel ---
function openAppSettings() {
  appSettingsPanel.classList.add('open');
  appSettingsOverlay.classList.remove('hidden');
  if (typeof renderSettingsIdentity === 'function') renderSettingsIdentity();
  updateScrollLock();
}

function closeAppSettings() {
  appSettingsPanel.classList.remove('open');
  appSettingsOverlay.classList.add('hidden');
  updateScrollLock();
}

appSettingsBtn.addEventListener('click', openAppSettings);
closeAppSettingsBtn.addEventListener('click', closeAppSettings);
appSettingsOverlay.addEventListener('click', () => { if (Date.now() < swipeSuppressUntil) return; closeAppSettings(); });

// Swipe to dismiss the settings panel in its own slide-in direction: it enters
// from the left, so a leftward swipe closes it (rightward in RTL layouts).
let settingsTouchStartX = null;
let settingsTouchStartY = null;
appSettingsPanel.addEventListener('touchstart', (e) => {
  settingsTouchStartX = e.touches[0].clientX;
  settingsTouchStartY = e.touches[0].clientY;
}, { passive: true });
appSettingsPanel.addEventListener('touchmove', (e) => {
  if (settingsTouchStartX === null) return;
  const dx = e.touches[0].clientX - settingsTouchStartX;
  const dy = e.touches[0].clientY - settingsTouchStartY;
  const closeDir = document.documentElement.dir === 'rtl' ? 1 : -1;
  // A mostly-horizontal swipe toward the panel's edge, past a threshold → close.
  if (dx * closeDir > 70 && Math.abs(dx) > Math.abs(dy)) {
    settingsTouchStartX = null;
    closeAppSettings();
  }
}, { passive: true });
appSettingsPanel.addEventListener('touchend', () => {
  settingsTouchStartX = null;
  settingsTouchStartY = null;
});

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
// Works the same whether the partner is a temporary (guest) user or signed in -
// friendship is keyed by their persistent clientId either way. ---
addFriendBtn.addEventListener('click', () => {
  if (!currentPartner || !currentPartner.clientId) return;
  if (addFriendBtn.classList.contains('added')) return; // already sent to this partner
  socket.emit('friend-request', { targetClientId: currentPartner.clientId });
  addFriendBtn.classList.add('added');
  addFriendBtn.disabled = true;
});

socket.on('friend-request-result', ({ ok, error, limitReached }) => {
  // limitReached is handled by the premium-upsell listener further down.
  if (!ok && error && !limitReached) showError(error);
});

let lastFocusedBeforeModal = null;
function openModal(modal) {
  modal.classList.remove('hidden');
  // Now that the modal has a layout, Google's button can be rendered at the
  // real form width (it measures 0 while hidden, so it would otherwise keep the
  // fallback size).
  if (modal === accountModal && typeof renderGoogleButtons === 'function') {
    requestAnimationFrame(() => renderGoogleButtons());
  }
  // Move focus into dialogs so keyboard/screen-reader users land inside them,
  // and remember where to return focus on close.
  if (modal.classList.contains('modal-overlay')) {
    lastFocusedBeforeModal = document.activeElement;
    const focusTarget = modal.querySelector('input:not([type="hidden"]):not(:disabled), .btn, button');
    if (focusTarget) focusTarget.focus();
  }
  // On small screens the toolbar dropdowns are position:fixed - anchor them
  // just under their own button so they open correctly at any scroll position
  // now that the header is sticky.
  if (modal.classList.contains('notif-dropdown') && window.matchMedia('(max-width: 480px)').matches) {
    const btn = modal.parentElement ? modal.parentElement.querySelector('button.icon-btn') : null;
    if (btn) {
      const r = btn.getBoundingClientRect();
      const top = Math.round(r.bottom + 8);
      modal.style.top = top + 'px';
      modal.style.maxHeight = Math.max(180, window.innerHeight - top - 16) + 'px';
    }
  } else if (modal.classList.contains('notif-dropdown')) {
    modal.style.top = '';
    modal.style.maxHeight = '';
  }
}

function closeModal(modal) {
  const wasOpen = !modal.classList.contains('hidden');
  modal.classList.add('hidden');
  if (wasOpen && modal.classList.contains('modal-overlay') && lastFocusedBeforeModal && document.body.contains(lastFocusedBeforeModal)) {
    lastFocusedBeforeModal.focus();
    lastFocusedBeforeModal = null;
  }
}

openTermsLink.addEventListener('click', () => openModal(termsModal));
openTermsLinkFooter.addEventListener('click', () => openModal(termsModal));
closeTermsBtn.addEventListener('click', () => closeModal(termsModal));

[termsModal, accountModal].forEach((modal) => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal(modal);
  });
});

friendsOverlay.addEventListener('click', () => closeSidePanel(friendsDropdown, friendsOverlay));
friendProfileOverlay.addEventListener('click', () => closeSidePanel(friendProfileModal, friendProfileOverlay));
friendChatOverlay.addEventListener('click', () => {
  closeSidePanel(friendChatModal, friendChatOverlay);
  activeFriendChatId = null;
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal(termsModal);
    closeModal(accountModal);
    closeModal(historyDropdown);
    closeSidePanel(friendsDropdown, friendsOverlay);
    closeSidePanel(friendProfileModal, friendProfileOverlay);
    closeSidePanel(friendChatModal, friendChatOverlay);
    closeAppSettings();
    closeFilters();
  }
});

// --- Account (persisted server-side; a durable session token in localStorage
// keeps the user signed in across reloads, restarts and deploys) ---
// Header auth belongs to the Tap-to-Talk landing screen only. Once the user is
// on the call screen (/call) the top bar is for the conversation, and signing
// in is still one tap away inside Settings - which is where it lived before.
function onLandingScreen() {
  return callPanel.classList.contains('hidden');
}
function renderHeaderAuthVisibility() {
  const landing = onLandingScreen();
  headerAuth.classList.toggle('hidden', !landing || !!accountNickname);
  headerAccountBtn.classList.toggle('hidden', !landing || !accountNickname);
  if (headerLinkProfileBtn) {
    headerLinkProfileBtn.classList.toggle('hidden', !landing || !profileWorthLinking());
  }
}

function renderAccountState() {
  if (accountNickname) {
    accountLoggedOut.classList.add('hidden');
    accountLoggedIn.classList.remove('hidden');
    accountNicknameDisplay.textContent = accountNickname;
    settingsNickname.value = accountNickname;
    updateNicknameBtn.disabled = true;
    renderRecoveryEmailState();

    // Logged in: swap the Sign in / Register pair for a single My Account button.
    sidePanelSignInBtn.classList.add('hidden');
    sidePanelRegisterBtn.classList.add('hidden');
    myAccountBtn.classList.remove('hidden');
  } else {
    accountLoggedOut.classList.remove('hidden');
    accountLoggedIn.classList.add('hidden');

    sidePanelSignInBtn.classList.remove('hidden');
    sidePanelRegisterBtn.classList.remove('hidden');
    myAccountBtn.classList.add('hidden');
  }
  renderHeaderAuthVisibility();
  renderAvatarGrid();
  renderSettingsIdentity();
  renderLinkProfilePrompts();
  renderSettingsProfileRow();
}

// --- "Keep this profile": linking the anonymous profile to an account -------
// Everything a user builds here - their name, their friends, their chat
// history - hangs off a clientId that exists only in this browser's storage,
// so clearing site data or picking up another phone loses all of it. An
// account is the only way to keep it, and these prompts are how we say so: a
// pill in the header, a banner above the friends list, and a card on the
// sign-up form showing exactly what the new account will inherit.
//
// Shown only while there is something to lose and no account to lose it to.

function profileDisplayName() {
  return accountNickname || tempUsername || (myProfile && myProfile.username) || '';
}

// A profile worth keeping: one that has friends, or a name the user chose.
// Prompting someone who has done neither is nagging, not helping.
function profileWorthLinking() {
  if (accountNickname) return false;
  return friendsData.length > 0 || !!tempUsername;
}

function formatProfileCreated(ts) {
  try {
    return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return new Date(ts).toDateString();
  }
}

function renderLinkProfileCard() {
  if (!linkProfileCard) return;
  // The card describes a profile that is about to be inherited, so it has no
  // place on the sign-up form of someone who is already signed in.
  if (accountNickname) {
    linkProfileCard.classList.add('hidden');
    return;
  }
  linkProfileCard.classList.remove('hidden');
  const name = profileDisplayName();
  linkProfileName.textContent = name || t('linkProfileAnonymous');
  linkProfileAvatar.innerHTML = (myAnimal && typeof Animals !== 'undefined' && Animals)
    ? Animals.icon(myAnimal, 46)
    : genderIcon(myAvatar, 46);
  const created = profileCreatedAt();
  linkProfileCreated.classList.toggle('hidden', !created);
  if (created) linkProfileCreated.textContent = t('linkProfileCreated', { date: formatProfileCreated(created) });
  linkProfileFriends.textContent = friendsData.length === 1
    ? t('linkProfileFriendsOne')
    : t('linkProfileFriends', { count: friendsData.length });
}

function renderLinkProfilePrompts() {
  const show = profileWorthLinking();
  if (headerLinkProfileBtn) {
    // The header pill belongs to the landing screen only - mid-call the top
    // bar is the conversation's, exactly as the sign-in buttons are.
    headerLinkProfileBtn.classList.toggle('hidden', !show || !onLandingScreen());
  }
  if (linkProfileBanner) linkProfileBanner.classList.toggle('hidden', !show);
  renderLinkProfileCard();
}

if (headerLinkProfileBtn) {
  headerLinkProfileBtn.addEventListener('click', () => openAccountModal('signup'));
}
if (linkProfileBanner) {
  linkProfileBanner.addEventListener('click', () => {
    closeSidePanel(friendsDropdown, friendsOverlay);
    openAccountModal('signup');
  });
}

// --- "They dropped out" ----------------------------------------------------
// Someone whose connection died has not rejected you, and often comes straight
// back - so say which of the two happened, in the call and in a friend chat
// alike, instead of leaving the other person staring at a dead screen.

function showPeerGone(name) {
  if (!peerGoneBanner) return;
  peerGoneTitle.textContent = t('peerDisconnected', { name: name || t('stranger') });
  peerGoneSub.textContent = t('peerDisconnectedSub');
  peerGoneBanner.classList.remove('hidden');
}

function hidePeerGone() {
  if (peerGoneBanner) peerGoneBanner.classList.add('hidden');
}

// The friend whose chat is open going offline mid-conversation. Only ever
// shown for that transition: opening a chat with someone who was already
// offline is ordinary, and does not need announcing.
let friendChatWasOnline = false;

function renderFriendChatPresence() {
  if (!friendChatPresence) return;
  if (!activeFriendChatId || !friendChatModal.classList.contains('open')) {
    friendChatPresence.classList.add('hidden');
    return;
  }
  const friend = friendsData.find((f) => f.clientId === activeFriendChatId);
  const online = !!(friend && friend.online);
  if (online) {
    friendChatWasOnline = true;
    friendChatPresence.classList.add('hidden');
    return;
  }
  if (!friendChatWasOnline) return;
  friendChatPresenceTitle.textContent = t('peerDisconnected', { name: friendLabel(friend) || t('stranger') });
  friendChatPresenceSub.textContent = t('peerDisconnectedChatSub');
  friendChatPresence.classList.remove('hidden');
}

// --- Settings rows: who you are, the Shop, and Billing ---------------------

// The avatar this user is wearing: their spirit animal if they picked one,
// otherwise the plain gender silhouette.
function myAvatarIcon(size) {
  return (myAnimal && typeof Animals !== 'undefined' && Animals)
    ? Animals.icon(myAnimal, size)
    : genderIcon(myAvatar, size);
}

function renderSettingsProfileRow() {
  if (!settingsProfileRow) return;
  settingsProfileAvatar.innerHTML = `${myAvatarIcon(40)}<span class="settings-row-online" aria-hidden="true"></span>`;
  settingsProfileName.textContent = profileDisplayName() || t('linkProfileAnonymous');
  const created = profileCreatedAt();
  settingsProfileJoined.textContent = created
    ? t('joinedOn', { date: formatProfileCreated(created) })
    : t(accountNickname ? 'settingsRowAccount' : 'settingsRowGuest');
}

if (settingsProfileRow) {
  // The row is the profile, so it opens the place the profile is edited:
  // the account panel (sign up / sign in, or My Account once signed in).
  settingsProfileRow.addEventListener('click', () => {
    openAccountModal(accountNickname ? 'login' : 'signup');
  });
}

// --- Shop ------------------------------------------------------------------
// Coins and Boosts are not built yet and nothing here can be bought: TalkLive
// is free. The screen exists so the shape of it is visible (and so the price
// of finding that out later is paid now), which is why every card is disabled
// and labelled rather than wired to checkout.
const SHOP_PACKS = [
  { id: 'drop', coins: 500, price: '$4.99', tagKey: 'shopTagEntry' },
  { id: 'stack', coins: 1100, bonus: 150, price: '$9.99', tagKey: 'shopTagValue' },
  { id: 'basket', coins: 2500, bonus: 400, price: '$19.99', tagKey: 'shopTagPopular' },
  { id: 'cache', coins: 4700, bonus: 800, price: '$34.99', tagKey: 'shopTagBest' },
  { id: 'chest', coins: 8800, bonus: 1600, price: '$59.99', tagKey: 'shopTagPower' },
  { id: 'hoard', coins: 16000, bonus: 3500, price: '$99.99', tagKey: 'shopTagMax' },
];

function formatCoins(n) {
  try {
    return n.toLocaleString();
  } catch (e) {
    return String(n);
  }
}

function renderShop() {
  if (!shopGrid) return;
  shopGrid.innerHTML = '';
  SHOP_PACKS.forEach((pack) => {
    const card = document.createElement('div');
    card.className = 'shop-card';
    card.innerHTML = `
      <span class="shop-card-tag">${escapeHtml(t(pack.tagKey))}</span>
      <span class="shop-card-coin" aria-hidden="true"></span>
      <strong class="shop-card-name">${escapeHtml(t('shopPack_' + pack.id))}</strong>
      <span class="shop-card-amount">${escapeHtml(t('shopCoinsAmount', { count: formatCoins(pack.coins) }))}</span>
      ${pack.bonus ? `<span class="shop-card-bonus">${escapeHtml(t('shopBonus', { count: formatCoins(pack.bonus) }))}</span>` : ''}
      <span class="shop-card-price">${escapeHtml(pack.price)}</span>
      <button type="button" class="shop-card-btn" disabled>${escapeHtml(t('comingSoon'))}</button>
    `;
    shopGrid.appendChild(card);
  });
  // No coins exist yet, so the balance is the truth rather than a placeholder.
  if (shopBalanceNum) shopBalanceNum.textContent = '0';
}

function openShop() {
  closeAppSettings();
  renderShop();
  openModal(shopModal);
}

if (settingsShopRow) settingsShopRow.addEventListener('click', openShop);
if (closeShopBtn) closeShopBtn.addEventListener('click', () => closeModal(shopModal));

// --- Billing ---------------------------------------------------------------
function renderBilling() {
  if (!billingEmailValue) return;
  billingEmailValue.textContent = accountEmail || t('billingEmailNone');
}

function openBilling() {
  closeAppSettings();
  renderBilling();
  openModal(billingModal);
}

if (settingsBillingRow) settingsBillingRow.addEventListener('click', openBilling);
if (closeBillingBtn) closeBillingBtn.addEventListener('click', () => closeModal(billingModal));

// --- "Receive incoming calls" ----------------------------------------------
// Off means friends can still message, they just can't ring this device; the
// server refuses their call-back rather than this client silently ignoring it,
// so the caller is told instead of listening to a phone that never rings.
let acceptCallsEnabled = localStorage.getItem('talklive_accept_calls') !== 'off';

function renderAcceptCalls() {
  if (acceptCallsCheckbox) acceptCallsCheckbox.checked = acceptCallsEnabled;
}

if (acceptCallsCheckbox) {
  acceptCallsCheckbox.addEventListener('change', () => {
    acceptCallsEnabled = acceptCallsCheckbox.checked;
    localStorage.setItem('talklive_accept_calls', acceptCallsEnabled ? 'on' : 'off');
    socket.emit('set-call-availability', { accept: acceptCallsEnabled });
    showToast(acceptCallsEnabled ? t('acceptCallsOn') : t('acceptCallsOff'));
    vibrate(15);
  });
}

// --- Lightweight toast for brief confirmations (settings, copy, etc.) ---
let toastTimer = null;
function showToast(msg) {
  let el = document.getElementById('tlToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'tlToast';
    el.className = 'tl-toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// --- Settings: temporary username, categories, feedback ---
const tempUsernameInput = document.getElementById('tempUsernameInput');
const saveTempNameBtn = document.getElementById('saveTempNameBtn');
const settingsAccordion = document.getElementById('settingsAccordion');
const feedbackBtn = document.getElementById('feedbackBtn');
const settingsTermsBtn = document.getElementById('settingsTermsBtn');
const feedbackModal = document.getElementById('feedbackModal');
const closeFeedbackBtn = document.getElementById('closeFeedbackBtn');
const feedbackInput = document.getElementById('feedbackInput');
const feedbackSendBtn = document.getElementById('feedbackSendBtn');

// Show the temporary name in the editor (only when not signed in - a signed-in
// nickname is edited in the Account panel).
// The Save Name button is only enabled when the field holds a new, non-empty
// name different from what's already saved - so it greys out right after saving.
function syncSaveNameBtn() {
  if (!saveTempNameBtn || !tempUsernameInput) return;
  const val = tempUsernameInput.value.trim();
  const changed = val.length > 0 && val !== (tempUsername || '');
  saveTempNameBtn.disabled = !!accountNickname || !changed;
}

function renderSettingsIdentity() {
  if (tempUsernameInput && document.activeElement !== tempUsernameInput) {
    tempUsernameInput.value = accountNickname ? '' : (tempUsername || '');
    tempUsernameInput.disabled = !!accountNickname;
    tempUsernameInput.placeholder = accountNickname ? accountNickname : t('tempUsernamePlaceholder');
  }
  syncSaveNameBtn();
}

if (tempUsernameInput) {
  tempUsernameInput.addEventListener('input', syncSaveNameBtn);
}

if (saveTempNameBtn) {
  saveTempNameBtn.addEventListener('click', () => {
    const val = tempUsernameInput.value.trim().slice(0, 24);
    if (!val || val === tempUsername) return;
    tempUsername = val;
    localStorage.setItem('talklive_tempname', val);
    // Push it to the server for the current/next match.
    registerProfile();
    showToast(t('tempNameSaved'));
    renderSettingsProfileRow();
    renderLinkProfilePrompts();
    vibrate(15);
    // Grey the button out until the name is edited again.
    syncSaveNameBtn();
  });
}

// One-tap expanding accordion categories. Only one open at a time keeps it tidy.
if (settingsAccordion) {
  settingsAccordion.addEventListener('click', (e) => {
    const header = e.target.closest('.acc-header');
    if (!header) return;
    const item = header.parentElement;
    const isOpen = header.getAttribute('aria-expanded') === 'true';
    settingsAccordion.querySelectorAll('.acc-header').forEach((h) => {
      h.setAttribute('aria-expanded', 'false');
      h.parentElement.classList.remove('open');
    });
    if (!isOpen) {
      header.setAttribute('aria-expanded', 'true');
      item.classList.add('open');
    }
  });
  // Reflect the initial aria-expanded state in the classes.
  settingsAccordion.querySelectorAll('.acc-header').forEach((h) => {
    if (h.getAttribute('aria-expanded') === 'true') h.parentElement.classList.add('open');
  });
}

// Feedback for Improvement
if (feedbackBtn) {
  feedbackBtn.addEventListener('click', () => { feedbackInput.value = ''; openModal(feedbackModal); });
  closeFeedbackBtn.addEventListener('click', () => closeModal(feedbackModal));
  feedbackModal.addEventListener('click', (e) => { if (e.target === feedbackModal) closeModal(feedbackModal); });
  feedbackSendBtn.addEventListener('click', () => {
    const text = feedbackInput.value.trim().slice(0, 1000);
    if (!text) { showToast(t('feedbackEmpty')); return; }
    socket.emit('feedback', { text });
    closeModal(feedbackModal);
    showToast(t('feedbackThanks'));
    vibrate(20);
  });
}
if (settingsTermsBtn) settingsTermsBtn.addEventListener('click', () => openModal(termsModal));

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

// --- Spirit animal picker ----------------------------------------------------
// Built once on load, then never rebuilt: selection is a class toggle on two
// buttons (the old one and the new one), so tapping through the row costs no
// layout of the grid and nothing to garbage-collect. One delegated listener
// handles all twelve.
function renderAnimalPicker() {
  if (!animalGrid || !Animals) return;
  Animals.installSprite();
  const frag = document.createDocumentFragment();
  Animals.list.forEach((animal) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `animal-option${myAnimal === animal.id ? ' selected' : ''}`;
    btn.dataset.animal = animal.id;
    btn.style.setProperty('--animal-color', animal.color);
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', myAnimal === animal.id ? 'true' : 'false');
    btn.innerHTML = `${Animals.icon(animal.id, 44)}<span class="animal-option-name">${escapeHtml(Animals.name(animal.id))}</span>`;
    frag.appendChild(btn);
  });
  animalGrid.appendChild(frag);
  renderAnimalChoiceLine();
}

// Re-labels the existing buttons (language switch) without touching the icons.
function refreshAnimalLabels() {
  if (!animalGrid) return;
  animalGrid.querySelectorAll('.animal-option').forEach((btn) => {
    const label = btn.querySelector('.animal-option-name');
    if (label) label.textContent = Animals.name(btn.dataset.animal);
  });
  renderAnimalChoiceLine();
}

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

function setMyAnimal(id) {
  const next = myAnimal === id ? null : id; // tapping the chosen one clears it
  myAnimal = next;
  Animals.store(next);
  animalGrid.querySelectorAll('.animal-option').forEach((btn) => {
    const on = btn.dataset.animal === next;
    btn.classList.toggle('selected', on);
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
  });
  renderAnimalChoiceLine();
  // The Settings profile row wears this avatar, so it re-renders with it.
  renderSettingsProfileRow();
  registerProfile(); // so a search already queued picks the new animal up
}

if (animalGrid) {
  animalGrid.addEventListener('click', (e) => {
    const option = e.target.closest('.animal-option');
    if (!option) return;
    vibrate(8);
    setMyAnimal(option.dataset.animal);
  });
  renderAnimalPicker();
}

// The stranger's animal, shown on their card once the call is actually
// connected (same moment as their name - never before, see revealPartner).
function renderPartnerAnimal(animalId) {
  if (!partnerAnimalEl) return;
  if (!animalId || !Animals || !Animals.has(animalId)) {
    partnerAnimalEl.classList.add('hidden');
    partnerAnimalEl.innerHTML = '';
    return;
  }
  Animals.installSprite();
  const same = myAnimal === animalId;
  partnerAnimalEl.style.setProperty('--animal-color', Animals.color(animalId));
  partnerAnimalEl.innerHTML = `
    <span class="partner-animal-art">${Animals.icon(animalId, 46)}</span>
    <span class="partner-animal-text">
      <span class="partner-animal-label">${escapeHtml(t('partnerAnimalLabel'))}</span>
      <strong class="partner-animal-name">${escapeHtml(Animals.name(animalId))}</strong>
      <span class="partner-animal-trait">${escapeHtml(Animals.trait(animalId))}</span>
      ${same ? `<span class="partner-animal-same">${escapeHtml(t('animalSameMatch', { animal: Animals.name(animalId) }))}</span>` : ''}
    </span>`;
  partnerAnimalEl.classList.remove('hidden');
}

function showAccountStatus(msg, kind) {
  accountStatus.textContent = msg;
  accountStatus.className = `account-status ${kind}`;
  accountStatus.classList.remove('hidden');
}

myAccountBtn.addEventListener('click', () => {
  closeAppSettings();
  renderAccountState();
  openModal(accountModal);
});
closeAccountBtn.addEventListener('click', () => closeModal(accountModal));

function selectAccountTab(which) {
  // Password recovery is reached from the login tab, so that tab stays
  // highlighted while it is open - the user has not left "logging in".
  const highlight = which === 'forgot' ? 'login' : which;
  accountTabs.forEach((tab) => {
    const on = tab.dataset.tab === highlight;
    tab.classList.toggle('selected', on);
  });
  loginTab.classList.toggle('hidden', which !== 'login');
  signupTab.classList.toggle('hidden', which !== 'signup');
  // "forgot" is not one of the two tab buttons: it replaces both panels, and
  // leaves Log In marked as the tab you came from (and go back to).
  forgotTab.classList.toggle('hidden', which !== 'forgot');
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

// Header auth - the same three destinations as the side panel, one tap from
// anywhere in the app instead of behind the settings menu.
function openAccountModal(tab) {
  closeAppSettings();
  renderAccountState();
  selectAccountTab(tab);
  openModal(accountModal);
}

headerLoginBtn.addEventListener('click', () => openAccountModal('login'));
headerSignupBtn.addEventListener('click', () => openAccountModal('signup'));
headerAccountBtn.addEventListener('click', () => {
  closeAppSettings();
  renderAccountState();
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

// Log in and Create Account are the two buttons whose whole job is to talk to
// the server, so they must never look inert. A tap that lands while the socket
// is down used to do nothing at all - socket.io quietly buffers the emit and
// there is no reply to react to - which reads exactly like a broken button.
let accountReplyTimer = null;
function beginAccountRequest(button) {
  if (!socket.connected) {
    showAccountStatus(t('errNoConnection'), 'error');
    return false;
  }
  button.disabled = true;
  clearTimeout(accountReplyTimer);
  accountReplyTimer = setTimeout(() => {
    endAccountRequest();
    showAccountStatus(t('errNoServerReply'), 'error');
  }, 9000);
  return true;
}
function endAccountRequest() {
  clearTimeout(accountReplyTimer);
  accountReplyTimer = null;
  loginSubmitBtn.disabled = false;
  signupSubmitBtn.disabled = false;
}

loginSubmitBtn.addEventListener('click', () => {
  if (!beginAccountRequest(loginSubmitBtn)) return;
  socket.emit('login', { username: loginUsername.value.trim(), password: loginPassword.value });
});

// Marks the field an error is about, so a message like "that email does not
// look valid" points at a box instead of leaving the user to guess which of
// three identical rounded fields it means.
function markInvalidField(input) {
  [signupUsername, signupPassword, signupEmail, loginUsername, loginPassword]
    .forEach((el) => el && el.classList.remove('is-invalid'));
  if (!input) return;
  input.classList.add('is-invalid');
  input.focus();
  input.select && input.select();
}
[signupUsername, signupPassword, signupEmail, loginUsername, loginPassword]
  .forEach((el) => el && el.addEventListener('input', () => el.classList.remove('is-invalid')));

// Creating an account is just username + password - the display name defaults
// to the username and can be changed later in My Account.
signupSubmitBtn.addEventListener('click', () => {
  const username = signupUsername.value.trim();
  // The username box is first and the recovery email last, so an email typed
  // into the first one is the obvious slip - and the server could only answer
  // it with "username may only contain letters, numbers, dot, dash or
  // underscore", which does not explain anything. Say what happened instead.
  if (username.includes('@')) {
    showAccountStatus(t('errUsernameIsEmail'), 'error');
    markInvalidField(signupUsername);
    return;
  }
  if (!beginAccountRequest(signupSubmitBtn)) return;
  socket.emit('signup', {
    username,
    password: signupPassword.value,
    // Optional. Without it the account cannot be recovered, which is exactly
    // what the field under it says.
    email: signupEmail.value.trim(),
  });
});

// --- Sign in / sign up with Google -----------------------------------------
//
// One flow covers both: Google returns a signed ID token, the server verifies
// it and either finds the existing account or creates one on the spot, so the
// same button is "Sign in" for a returning user and "Sign up" for a new one.
// Nothing here trusts the browser - the credential is only ever forwarded, and
// the account is decided server-side from the verified token.
// (googleReady is declared near the top of the file - see the note there.)

function handleGoogleCredential(response) {
  if (!response || !response.credential) return;
  // Reuse the shared in-flight guard so a slow/disconnected socket surfaces the
  // same "no connection" / "no reply" errors as the password buttons.
  if (!beginAccountRequest(signupSubmitBtn)) return;
  loginSubmitBtn.disabled = true;
  showAccountStatus(t('statusSigningIn'), 'info');
  socket.emit('google-auth', { credential: response.credential });
}

// Google only accepts a pixel width, so the button is rendered at the width of
// the form it sits in - a hardcoded 280px left it visibly narrower than the
// inputs and the Create Account button. A hidden modal measures 0, so fall back
// to the panel width and finally to a sane default; Google clamps to 400.
function googleBtnWidth(slot) {
  const measured = Math.round(
    slot.getBoundingClientRect().width ||
    (slot.closest('.modal-body') || {}).clientWidth ||
    0,
  );
  return Math.max(200, Math.min(400, measured || 320));
}

function renderGoogleButtons() {
  if (!googleReady) return;
  const dark = document.documentElement.getAttribute('data-theme') !== 'light';
  [[googleBtnLogin, 'signin_with'], [googleBtnSignup, 'signup_with']].forEach(([slot, text]) => {
    if (!slot) return;
    const width = googleBtnWidth(slot);
    // Keyed on the theme and width, so switching themes re-renders Google's
    // button in matching colours instead of leaving a dark button on a light
    // page, and a resize (or the modal opening at its real width) re-renders it
    // at the new size instead of leaving a stale, mismatched one.
    const key = `${text}:${dark ? 'dark' : 'light'}:${width}`;
    if (slot.dataset.rendered === key) return;
    // Google's button goes in its own host, behind our visible face - blowing
    // away the slot's contents would take the face with it.
    const host = slot.querySelector('.google-btn-real') || slot;
    host.innerHTML = '';
    window.google.accounts.id.renderButton(host, {
      type: 'standard', theme: dark ? 'filled_black' : 'outline', size: 'large',
      text, shape: 'pill', logo_alignment: 'center', width,
    });
    slot.dataset.rendered = key;
  });
}

// The slots have no width until the modal is actually on screen, and the window
// can be resized (or rotated) while it is open.
window.addEventListener('resize', () => renderGoogleButtons());

function initGoogleSignIn() {
  const clientId = window.GOOGLE_CLIENT_ID;
  // No client ID configured (or the Google script was blocked) - leave the
  // blocks hidden and the password forms working exactly as before.
  if (!clientId || !window.google || !window.google.accounts || !window.google.accounts.id) return;
  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: handleGoogleCredential,
    // The user chooses their own account every time rather than being silently
    // signed into whichever Google session the browser happens to hold.
    auto_select: false,
    cancel_on_tap_outside: true,
    ux_mode: 'popup',
  });
  googleReady = true;
  document.querySelectorAll('.google-block').forEach((el) => el.classList.remove('hidden'));
  renderGoogleButtons();
}

// Both /config.js and Google's client are `defer`red, so they are guaranteed to
// have run by DOMContentLoaded; the readyState check covers app.js being loaded
// late (cached/slow) and the load event already having fired.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGoogleSignIn);
} else {
  initGoogleSignIn();
}

socket.on('google-auth-result', ({ ok, nickname, email, error, sessionToken: token, profileClientId, identityToken }) => {
  endAccountRequest();
  if (!ok) {
    // Let the user try a different Google account instead of being stuck with
    // the one the failed attempt remembered.
    if (googleReady) window.google.accounts.id.disableAutoSelect();
    return showAccountStatus(error || t('errGoogleSignIn'), 'error');
  }
  storeLogin(nickname, token, profileClientId, identityToken);
  storeAccountEmail(email);
  showAccountStatus(t('statusLoggedIn', { name: nickname }), 'success');
  setTimeout(reloadPage, 500);
});

// Pressing Enter in any login/signup field submits that form.
[loginUsername, loginPassword].forEach((el) => el.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loginSubmitBtn.click();
}));
[signupUsername, signupPassword, signupEmail].forEach((el) => el.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') signupSubmitBtn.click();
}));

// --- Forgot password: email -> 6-digit code -> new password ---------------
// The reset token is what the server hands back once the code checks out; it
// is what authorizes the final password change, and it lives only in this
// variable (never in storage) so closing the tab ends the attempt.
let resetToken = null;

function showForgotStep(step) {
  forgotStepEmail.classList.toggle('hidden', step !== 'email');
  forgotStepCode.classList.toggle('hidden', step !== 'code');
  forgotStepPassword.classList.toggle('hidden', step !== 'password');
  const focus = { email: forgotEmail, code: forgotCode, password: forgotNewPassword }[step];
  if (focus) setTimeout(() => focus.focus(), 50);
}

function openForgotPassword() {
  resetToken = null;
  forgotCode.value = '';
  forgotNewPassword.value = '';
  // Carry over whatever was typed as the username if it looks like an email -
  // people routinely type their email into the username box.
  if (!forgotEmail.value && loginUsername.value.includes('@')) {
    forgotEmail.value = loginUsername.value.trim();
  }
  selectAccountTab('forgot');
  showForgotStep('email');
}

function requestResetCode() {
  const email = forgotEmail.value.trim();
  if (!email) return showAccountStatus(t('enterEmail'), 'error');
  forgotSendBtn.disabled = true;
  forgotResendBtn.disabled = true;
  showAccountStatus(t('sendingCode'), 'success');
  socket.emit('forgot-password', { email });
}

forgotPasswordLink.addEventListener('click', openForgotPassword);
forgotSendBtn.addEventListener('click', requestResetCode);
forgotResendBtn.addEventListener('click', requestResetCode);

forgotBackBtn.addEventListener('click', () => {
  resetToken = null;
  selectAccountTab('login');
});

// The code is six digits and nothing else; strip anything pasted in with it.
forgotCode.addEventListener('input', () => {
  forgotCode.value = forgotCode.value.replace(/\D/g, '').slice(0, 6);
});

forgotVerifyBtn.addEventListener('click', () => {
  if (forgotCode.value.length !== 6) return showAccountStatus(t('enterCode'), 'error');
  forgotVerifyBtn.disabled = true;
  socket.emit('verify-reset-code', { email: forgotEmail.value.trim(), code: forgotCode.value });
});

forgotResetBtn.addEventListener('click', () => {
  if (!resetToken) return showAccountStatus(t('resetExpired'), 'error');
  if (forgotNewPassword.value.length < 4) return showAccountStatus(t('passwordTooShort'), 'error');
  forgotResetBtn.disabled = true;
  socket.emit('reset-password', { resetToken, newPassword: forgotNewPassword.value });
});

[forgotEmail, forgotCode, forgotNewPassword].forEach((el) => el.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  if (el === forgotEmail) forgotSendBtn.click();
  else if (el === forgotCode) forgotVerifyBtn.click();
  else forgotResetBtn.click();
}));

socket.on('forgot-password-result', ({ ok, message, error }) => {
  forgotSendBtn.disabled = false;
  forgotResendBtn.disabled = false;
  if (!ok) return showAccountStatus(error, 'error');
  showAccountStatus(message || t('codeSent'), 'success');
  showForgotStep('code');
});

socket.on('verify-reset-code-result', ({ ok, resetToken: token, error }) => {
  forgotVerifyBtn.disabled = false;
  if (!ok) return showAccountStatus(error, 'error');
  resetToken = token;
  showAccountStatus(t('codeVerified'), 'success');
  showForgotStep('password');
});

socket.on('reset-password-result', ({ ok, nickname, email, error, sessionToken: token }) => {
  forgotResetBtn.disabled = false;
  if (!ok) return showAccountStatus(error, 'error');
  // The reset signed this device in, so treat it exactly like a login.
  resetToken = null;
  forgotCode.value = '';
  forgotNewPassword.value = '';
  storeLogin(nickname, token);
  storeAccountEmail(email);
  showAccountStatus(t('statusPasswordRestored', { name: nickname }), 'success');
  setTimeout(reloadPage, 800);
});

// --- Recovery email (My Account) ------------------------------------------
function storeAccountEmail(email) {
  accountEmail = email || '';
  if (accountEmail) localStorage.setItem('talklive_email', accountEmail);
  else localStorage.removeItem('talklive_email');
}

function renderRecoveryEmailState() {
  if (!recoveryEmailState) return;
  recoveryEmailState.textContent = accountEmail
    ? t('recoveryEmailSet', { email: accountEmail })
    : t('recoveryEmailMissing');
  recoveryEmailInput.value = accountEmail;
  syncRecoveryEmailBtnState();
}

function syncRecoveryEmailBtnState() {
  const value = recoveryEmailInput.value.trim();
  updateRecoveryEmailBtn.disabled = !value || value === accountEmail;
}

recoveryEmailInput.addEventListener('input', syncRecoveryEmailBtnState);

updateRecoveryEmailBtn.addEventListener('click', () => {
  socket.emit('update-recovery-email', {
    email: recoveryEmailInput.value.trim(),
    // Ignored by the server for accounts that have no password (Google
    // sign-in), required for every other account.
    currentPassword: recoveryEmailPassword.value,
  });
});

socket.on('update-recovery-email-result', ({ ok, email, error }) => {
  if (!ok) return showAccountStatus(error, 'error');
  storeAccountEmail(email);
  recoveryEmailPassword.value = '';
  renderRecoveryEmailState();
  showAccountStatus(t('statusRecoveryEmailSaved'), 'success');
});

logoutBtn.addEventListener('click', () => {
  socket.emit('logout', { token: sessionToken });
  sessionToken = null;
  accountNickname = null;
  storeAccountEmail('');
  localStorage.removeItem('talklive_session');
  localStorage.removeItem('talklive_nickname');
  // Give the logout packet a moment to flush before the page reloads.
  setTimeout(reloadPage, 150);
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

// Persist the login locally (nickname for instant UI, token for the server-side
// session), then reload - the token signs the reloaded page straight back in.
function storeLogin(nickname, token, profileClientId, identityToken) {
  localStorage.setItem('talklive_nickname', nickname);
  if (token) {
    sessionToken = token;
    localStorage.setItem('talklive_session', token);
  }
  // Signing in on a new device: take on the profile the account is linked to.
  // Every caller reloads straight after, which is what this needs.
  adoptLinkedProfile(profileClientId, identityToken);
}

socket.on('login-result', ({ ok, nickname, email, error, sessionToken: token, profileClientId, identityToken }) => {
  endAccountRequest();
  if (!ok) return showAccountStatus(error, 'error');
  storeLogin(nickname, token, profileClientId, identityToken);
  storeAccountEmail(email);
  showAccountStatus(t('statusLoggedIn', { name: nickname }), 'success');
  setTimeout(reloadPage, 500);
});

socket.on('signup-result', ({ ok, nickname, email, error, sessionToken: token, profileClientId, identityToken }) => {
  endAccountRequest();
  if (!ok) {
    showAccountStatus(error, 'error');
    // Point at the field the server is complaining about.
    const about = /email/i.test(error || '') ? signupEmail
      : /password/i.test(error || '') && !/username/i.test(error || '') ? signupPassword
      : /username/i.test(error || '') ? signupUsername
      : null;
    markInvalidField(about);
    return;
  }
  storeLogin(nickname, token, profileClientId, identityToken);
  storeAccountEmail(email);
  showAccountStatus(t('statusAccountCreated', { name: nickname }), 'success');
  setTimeout(reloadPage, 500);
});

// Answer to the silent re-login sent on every (re)connect. Success refreshes
// the signed-in UI; failure (expired/revoked token) cleans up so the app never
// pretends to be signed in when the server disagrees.
socket.on('resume-session-result', ({ ok, nickname, email, profileClientId, identityToken }) => {
  if (ok) {
    // This device signed in elsewhere since it last loaded (or signed in
    // before profiles were linked at all), so it is holding the wrong profile.
    // Reload once on the right one; the guard keeps a server that keeps
    // answering with an unexpected id from turning that into a reload loop.
    if (adoptLinkedProfile(profileClientId, identityToken)) {
      let reloaded = false;
      try { reloaded = sessionStorage.getItem('talklive_profile_adopted') === '1'; } catch (e) { /* private mode */ }
      if (!reloaded) {
        try { sessionStorage.setItem('talklive_profile_adopted', '1'); } catch (e) { /* private mode */ }
        return reloadPage();
      }
    }
    const emailChanged = (email || '') !== accountEmail;
    if (emailChanged) storeAccountEmail(email);
    if (nickname && nickname !== accountNickname) {
      accountNickname = nickname;
      localStorage.setItem('talklive_nickname', nickname);
      renderAccountState();
      registerProfile();
    } else if (emailChanged) {
      renderAccountState();
    }
  } else {
    sessionToken = null;
    accountNickname = null;
    storeAccountEmail('');
    localStorage.removeItem('talklive_session');
    localStorage.removeItem('talklive_nickname');
    renderAccountState();
  }
});

socket.on('update-nickname-result', ({ ok, nickname, error }) => {
  if (!ok) return showAccountStatus(error, 'error');
  accountNickname = nickname;
  localStorage.setItem('talklive_nickname', nickname);
  renderAccountState();
  showAccountStatus(t('statusNicknameUpdated'), 'success');
});

socket.on('change-password-result', ({ ok, error, sessionToken: token }) => {
  if (!ok) return showAccountStatus(error, 'error');
  // Other devices were signed out by the change; this one got a fresh token.
  if (token) {
    sessionToken = token;
    localStorage.setItem('talklive_session', token);
  }
  currentPasswordInput.value = '';
  newPasswordInput.value = '';
  syncPasswordBtnState();
  showAccountStatus(t('statusPasswordChanged'), 'success');
});

// --- Friends: dropdown menu under the header button (not a separate page) ---
friendsBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!friendsDropdown.classList.contains('open')) {
    renderFriendsList();
    openSidePanel(friendsDropdown, friendsOverlay);
  } else {
    closeSidePanel(friendsDropdown, friendsOverlay);
  }
});
closeFriendsBtn.addEventListener('click', () => closeSidePanel(friendsDropdown, friendsOverlay));

// Swipe right on the friends panel closes it (it slides in from the right).
let friendsTouchStartX = null;
let friendsTouchStartY = null;
friendsDropdown.addEventListener('touchstart', (e) => {
  friendsTouchStartX = e.touches[0].clientX;
  friendsTouchStartY = e.touches[0].clientY;
}, { passive: true });
friendsDropdown.addEventListener('touchmove', (e) => {
  if (friendsTouchStartX === null) return;
  const dx = e.touches[0].clientX - friendsTouchStartX;
  const dy = e.touches[0].clientY - friendsTouchStartY;
  if (dx > 70 && Math.abs(dx) > Math.abs(dy)) {
    friendsTouchStartX = null;
    closeSidePanel(friendsDropdown, friendsOverlay);
  }
}, { passive: true });
friendsDropdown.addEventListener('touchend', () => {
  friendsTouchStartX = null;
  friendsTouchStartY = null;
});

// Phone glyph shared by the live call button and its offline (greyed) state.
const FRIEND_CALL_SVG = '<svg viewBox="0 0 24 24" fill="white" aria-hidden="true"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>';

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
      <button type="button" class="friend-avatar-btn" data-id="${escapeHtml(f.clientId)}" title="${escapeHtml(t('profile'))}" aria-label="${escapeHtml(t('profile'))}">${genderIcon(f.avatar, 30)}</button>
      <div class="friend-item-info friend-row-main" data-id="${escapeHtml(f.clientId)}">
        <span class="friend-item-name">${getFlagImg(f.countryCode)} ${escapeHtml(friendLabel(f))}</span>
        <span class="friend-status-text ${f.online ? 'is-online' : 'is-offline'}">${escapeHtml(f.online ? t('online') : t('offline'))}</span>
        ${unread > 0 ? `<span class="unread-badge">${unread}</span>` : ''}
      </div>
      <button type="button" class="friend-msg-btn" data-id="${escapeHtml(f.clientId)}" title="${escapeHtml(t('chat'))}" aria-label="${escapeHtml(t('chat'))}">
        ${ICONS.chat}
      </button>
      <button type="button" class="friend-call-btn" data-id="${escapeHtml(f.clientId)}" data-name="${escapeHtml(friendLabel(f))}" title="${escapeHtml(t('callBack'))}" aria-label="${escapeHtml(t('callBack'))}">
        ${FRIEND_CALL_SVG}
      </button>
    `;
    friendsList.appendChild(item);
  });
}

friendsList.addEventListener('click', (e) => {
  const avatarBtn = e.target.closest('.friend-avatar-btn');
  const msgBtn = e.target.closest('.friend-msg-btn');
  const callBtn = e.target.closest('.friend-call-btn');
  const laterBtn = e.target.closest('.friend-call-later-btn');
  const rowMain = e.target.closest('.friend-row-main');
  if (laterBtn) {
    // Queue a call-back request for the offline friend, delivered when they're
    // back online. Reflect it inline so the user knows it went through.
    socket.emit('call-back-request-later', { targetClientId: laterBtn.dataset.id });
    laterBtn.textContent = t('requestSentLater');
    laterBtn.classList.add('sent');
    laterBtn.disabled = true;
  } else if (avatarBtn) {
    openFriendProfile(avatarBtn.dataset.id);
  } else if (msgBtn) {
    openFriendChat(msgBtn.dataset.id);
  } else if (callBtn) {
    // Rule 11: don't dismiss the menu - swap the call icon into an in-place
    // spinner and keep it there until the peer accepts (then we jump to the
    // call screen) or the request fails. If the peer turns out to be offline we
    // keep the panel and grey the button (see call-back-request-result) rather
    // than dropping back to the landing screen. Tapping a greyed button retries.
    startCallbackSpinner(callBtn);
    requestCallBack(callBtn.dataset.id, callBtn.dataset.name, { deferUI: true });
  } else if (rowMain) {
    openFriendChat(rowMain.dataset.id);
  }
});

// Turn a friend's call button into its offline (greyed, red-dotted) state and
// surface a "send request for later" chip. Keeps the friends panel intact so an
// offline callback never bounces the user to the "tap to talk" landing screen.
function markFriendCallOffline(clientId) {
  const btn = friendsList.querySelector(`.friend-call-btn[data-id="${CSS.escape(clientId)}"]`);
  if (!btn) return;
  btn.classList.remove('is-loading');
  btn.classList.add('is-offline');
  btn.disabled = false;
  btn.title = t('friendOffline');
  btn.setAttribute('aria-label', t('friendOffline'));
  btn.innerHTML = `${FRIEND_CALL_SVG}<span class="friend-call-offline-dot" aria-hidden="true"></span>`;
  const item = btn.closest('.friend-item');
  if (item && !item.querySelector('.friend-call-later-btn')) {
    const later = document.createElement('button');
    later.type = 'button';
    later.className = 'friend-call-later-btn';
    later.dataset.id = clientId;
    later.textContent = t('sendRequestLater');
    item.appendChild(later);
  }
}

// --- Friend profile view: avatar, name, status + Remove Friend / Block User ---
let activeProfileFriendId = null;

// Where this user and that one stand, which is what the profile's actions are:
//  'friend'   - chat, report, remove, block
//  'incoming' - they asked: confirm or dismiss
//  'pending'  - this user asked and is waiting: nothing to do but report
//  'stranger' - met in a call, never asked: ask
function relationTo(clientId) {
  if (friendsData.some((f) => f.clientId === clientId)) return 'friend';
  if (friendRequestsData.some((r) => r.clientId === clientId)) return 'incoming';
  if (sentRequestsData.some((r) => r.clientId === clientId)) return 'pending';
  return 'stranger';
}

// One profile sheet for everyone: friends opened from the friends list, and
// people met in a call who are not (yet) friends. Only the actions differ.
function openUserProfile(person) {
  if (!person || !person.clientId) return;
  const relation = relationTo(person.clientId);
  const friend = friendsData.find((f) => f.clientId === person.clientId);
  const known = friend || person;
  activeProfileFriendId = person.clientId;
  activeProfileRelation = relation;
  friendProfileAvatar.innerHTML = genderIcon(known.avatar, 72);
  friendProfileName.innerHTML = `${getFlagImg(known.countryCode)} ${escapeHtml(friendLabel(known))}`;
  const online = !!known.online;
  friendProfileStatus.innerHTML = relation === 'friend'
    ? `<span class="friend-status-text ${online ? 'is-online' : 'is-offline'}">${escapeHtml(online ? t('online') : t('offline'))}</span>`
    : `<span class="friend-relation-text">${escapeHtml(t('profileRelation_' + relation))}</span>`;

  // "Really <their own name>" - only when this account has renamed them, so a
  // friend you gave a private label to is still identifiable by the name they
  // chose for themselves.
  const renamed = relation === 'friend' && friend && friend.nickname && friend.nickname !== friend.username;
  friendProfileRealName.classList.toggle('hidden', !renamed);
  if (renamed) friendProfileRealName.textContent = t('realName', { name: friend.username });

  friendProfileChatBtn.classList.toggle('hidden', relation !== 'friend');
  friendProfileRenameBtn.classList.toggle('hidden', relation !== 'friend');
  friendProfileRemoveBtn.classList.toggle('hidden', relation !== 'friend');
  friendProfileBlockBtn.classList.toggle('hidden', relation !== 'friend');
  friendProfileAddBtn.classList.toggle('hidden', relation !== 'stranger');
  friendProfileAcceptBtn.classList.toggle('hidden', relation !== 'incoming');
  friendProfileDeclineBtn.classList.toggle('hidden', relation !== 'incoming');
  friendProfilePending.classList.toggle('hidden', relation !== 'pending');

  closeSidePanel(friendsDropdown, friendsOverlay);
  openSidePanel(friendProfileModal, friendProfileOverlay);
}

function openFriendProfile(friendClientId) {
  const friend = friendsData.find((f) => f.clientId === friendClientId);
  if (!friend) return;
  openUserProfile(friend);
}

closeFriendProfileBtn.addEventListener('click', () => closeSidePanel(friendProfileModal, friendProfileOverlay));

friendProfileChatBtn.addEventListener('click', () => {
  if (!activeProfileFriendId) return;
  closeSidePanel(friendProfileModal, friendProfileOverlay);
  openFriendChat(activeProfileFriendId);
});

// --- Renaming a friend ----------------------------------------------------
// Purely this account's own label. The server writes it onto this user's copy
// of the friendship only, so the friend is never notified and never sees it;
// clearing the field puts their own name back everywhere.
const renameFriendModal = document.getElementById('renameFriendModal');
const renameFriendInput = document.getElementById('renameFriendInput');
const renameFriendHint = document.getElementById('renameFriendHint');

function openRenameFriend() {
  const friend = friendsData.find((f) => f.clientId === activeProfileFriendId);
  if (!friend) return;
  renameFriendHint.textContent = t('renameFriendHint', { name: friend.username });
  renameFriendInput.value = friend.nickname || '';
  openModal(renameFriendModal);
  requestAnimationFrame(() => { try { renameFriendInput.focus(); renameFriendInput.select(); } catch (e) {} });
}

function commitRenameFriend(nickname) {
  if (!activeProfileFriendId) return;
  const friend = friendsData.find((f) => f.clientId === activeProfileFriendId);
  socket.emit('rename-friend', { friendClientId: activeProfileFriendId, nickname });
  // Paint it locally so the panels behind the modal change with the tap; the
  // state-sync that follows says exactly the same thing.
  if (friend) {
    if (nickname) friend.nickname = nickname;
    else delete friend.nickname;
    renderFriendsList();
    openUserProfile(friend);
  }
  closeModal(renameFriendModal);
  showToast(nickname
    ? t('renameFriendSaved', { name: nickname })
    : t('renameFriendCleared'));
}

friendProfileRenameBtn.addEventListener('click', openRenameFriend);
document.getElementById('renameFriendCloseBtn').addEventListener('click', () => closeModal(renameFriendModal));
document.getElementById('renameFriendSaveBtn').addEventListener('click', () => {
  commitRenameFriend(renameFriendInput.value.trim().slice(0, 24));
});
document.getElementById('renameFriendResetBtn').addEventListener('click', () => commitRenameFriend(''));
renameFriendInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    commitRenameFriend(renameFriendInput.value.trim().slice(0, 24));
  }
});

friendProfileRemoveBtn.addEventListener('click', async () => {
  if (!activeProfileFriendId) return;
  const ok = await showConfirm({ title: 'removeFriend', text: 'confirmRemoveFriend', okKey: 'remove' });
  if (!ok || !activeProfileFriendId) return;
  socket.emit('remove-friend', { friendClientId: activeProfileFriendId });
  closeSidePanel(friendProfileModal, friendProfileOverlay);
});

friendProfileAddBtn.addEventListener('click', () => {
  if (!activeProfileFriendId) return;
  socket.emit('friend-request', { targetClientId: activeProfileFriendId });
  // Flip to Pending immediately rather than waiting for the round trip: the
  // state-sync that follows says the same thing.
  friendProfileAddBtn.classList.add('hidden');
  friendProfilePending.classList.remove('hidden');
  activeProfileRelation = 'pending';
  friendProfileStatus.innerHTML = `<span class="friend-relation-text">${escapeHtml(t('profileRelation_pending'))}</span>`;
  showToast(t('friendRequestSent'));
});

friendProfileAcceptBtn.addEventListener('click', () => {
  if (!activeProfileFriendId) return;
  socket.emit('friend-request-respond', { fromClientId: activeProfileFriendId, accept: true });
  closeSidePanel(friendProfileModal, friendProfileOverlay);
});

friendProfileDeclineBtn.addEventListener('click', () => {
  if (!activeProfileFriendId) return;
  socket.emit('friend-request-respond', { fromClientId: activeProfileFriendId, accept: false });
  closeSidePanel(friendProfileModal, friendProfileOverlay);
});

friendProfileReportBtn.addEventListener('click', async () => {
  if (!activeProfileFriendId) return;
  const ok = await showConfirm({ title: 'report', text: 'confirmReportUser', okKey: 'report' });
  if (!ok || !activeProfileFriendId) return;
  // Reporting someone you are not in a call with: the server records it and
  // blocks the pair, same as an in-call report, without touching any call.
  socket.emit('report-user', { targetClientId: activeProfileFriendId, reason: 'profile' });
  closeSidePanel(friendProfileModal, friendProfileOverlay);
  showToast(t('reportUserSent'));
});

friendProfileBlockBtn.addEventListener('click', async () => {
  if (!activeProfileFriendId) return;
  const ok = await showConfirm({ title: 'block', text: 'confirmBlockFriend', okKey: 'block' });
  if (!ok || !activeProfileFriendId) return;
  socket.emit('block-friend', { friendClientId: activeProfileFriendId });
  closeSidePanel(friendProfileModal, friendProfileOverlay);
});

// The friends list starts as skeleton rows (index.html); the first state-sync
// replaces them. If no sync arrives (server hiccup, logged-out edge case),
// fall back to the normal empty state so the shimmer can't sit there forever.
let friendsSynced = false;
setTimeout(() => { if (!friendsSynced) renderFriendsList(); }, 5000);

socket.on('state-sync', ({ friends: friendList, friendRequests: requestList, sentRequests: sentList, notifications: notifList } = {}) => {
  friendsSynced = true;
  friendsData = friendList || [];
  friendRequestsData = requestList || [];
  sentRequestsData = sentList || [];
  notifData = notifList || [];
  renderFriendsList();
  renderNotifications();
  // A first friend is exactly the moment the profile becomes worth keeping.
  renderLinkProfilePrompts();
  renderFriendChatPresence();
  // An open profile sheet is looking at data that just changed - a pending
  // request may have turned into a friendship while it sat there.
  if (activeProfileFriendId && friendProfileModal.classList.contains('open')) {
    const person = friendsData.find((f) => f.clientId === activeProfileFriendId)
      || friendRequestsData.find((r) => r.clientId === activeProfileFriendId)
      || { clientId: activeProfileFriendId, username: friendProfileName.textContent.trim() };
    openUserProfile(person);
  }
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
  // Someone you have renamed should read as the name you gave them here too,
  // otherwise a notification is the one place their old name resurfaces.
  const name = escapeHtml(labelForClientId(n.fromClientId, n.username));
  switch (n.type) {
    case 'friend_request': return t('notifWantsFriends', { name });
    case 'friend_accepted': return t('notifAccepted', { name });
    case 'call_back_request': return t('notifWantsCallback', { name });
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
  const count = totalUnreadMessages() + notifData.filter((n) => n.type !== 'message').length;
  friendsMsgBadge.textContent = count;
  friendsMsgBadge.classList.toggle('hidden', count === 0);
}

// The requests list (friend requests, accepted-friend confirmations, call-back
// requests) lives at the top of the Friends dropdown; new message notifications
// surface as unread badges on the Friends button/list instead.
function renderNotifications() {
  const visible = notifData.filter((n) => n.type !== 'message');
  notifList.classList.toggle('no-requests', visible.length === 0);

  if (visible.length === 0) {
    notifList.innerHTML = '';
  } else {
    notifList.innerHTML = '';
    [...visible].reverse().forEach((n) => {
      const item = document.createElement('div');
      item.className = 'notif-item';
      let actions = '';
      if (n.type === 'friend_request') {
        actions = `
          <button type="button" class="btn-chip btn-chip-accept notif-confirm-btn" data-id="${n.id}" data-from="${escapeHtml(n.fromClientId)}">${ICONS.check} ${escapeHtml(t('confirm'))}</button>
          <button type="button" class="btn-chip notif-dismiss-btn" data-id="${n.id}" data-from="${escapeHtml(n.fromClientId)}">${ICONS.close} ${escapeHtml(t('dismiss'))}</button>
        `;
      } else if (n.type === 'friend_accepted') {
        actions = `
          <button type="button" class="btn-chip btn-chip-accept notif-open-chat-btn" data-id="${n.id}" data-from="${escapeHtml(n.byClientId)}">${ICONS.chat} ${escapeHtml(t('chat'))}</button>
          <button type="button" class="btn-chip notif-clear-btn" data-id="${n.id}">${ICONS.close} ${escapeHtml(t('dismiss'))}</button>
        `;
      } else if (n.type === 'call_back_request') {
        actions = `
          <button type="button" class="btn-chip btn-chip-accept notif-callback-accept-btn" data-id="${n.id}" data-from="${escapeHtml(n.fromClientId)}">${ICONS.call} ${escapeHtml(t('callBack'))}</button>
          <button type="button" class="btn-chip notif-callback-decline-btn" data-id="${n.id}" data-from="${escapeHtml(n.fromClientId)}">${ICONS.close} ${escapeHtml(t('dismiss'))}</button>
        `;
      } else {
        actions = `<button type="button" class="btn-chip notif-clear-btn" data-id="${n.id}">${ICONS.close} ${escapeHtml(t('dismiss'))}</button>`;
      }
      const profileId = n.fromClientId || n.byClientId || '';
      if (profileId) item.dataset.profileId = profileId;
      item.innerHTML = `
        <div class="notif-item-icon">${notifIcon(n.type)}</div>
        <div class="notif-item-body">
          <div class="notif-item-text">${notifText(n)}${n.message ? `<span class="notif-req-message">“${escapeHtml(n.message)}”</span>` : ''}</div>
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
  // Anywhere on the row that is not one of its chips opens the profile of the
  // person the notification is about - the chips below keep working as before.
  if (!e.target.closest('.btn-chip')) {
    const row = e.target.closest('.notif-item');
    const person = row && row.dataset.profileId
      ? (friendRequestsData.find((r) => r.clientId === row.dataset.profileId)
        || friendsData.find((f) => f.clientId === row.dataset.profileId)
        || { clientId: row.dataset.profileId })
      : null;
    if (person) {
      openUserProfile(person);
      return;
    }
  }
  const confirmBtn = e.target.closest('.notif-confirm-btn');
  const dismissBtn = e.target.closest('.notif-dismiss-btn');
  const clearBtn = e.target.closest('.notif-clear-btn');
  const openChatBtn = e.target.closest('.notif-open-chat-btn');
  const cbAccept = e.target.closest('.notif-callback-accept-btn');
  const cbDecline = e.target.closest('.notif-callback-decline-btn');

  if (openChatBtn) {
    socket.emit('clear-notification', { notificationId: openChatBtn.dataset.id });
    removeNotifLocal(openChatBtn.dataset.id);
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
  if (n.type === 'message') {
    playMessageSound();
    vibrate(20);
  } else if (n.type === 'friend_request' || n.type === 'friend_accepted') {
    // Both a new friend request and a request being accepted mean a friend
    // event - play the distinct friend chime, never the message chime.
    playFriendAddedSound();
    vibrate([20, 40, 20]);
  }
  // The one moment notifications are self-evidently useful: this user now has
  // someone who can reach them, and every message after this one arrives while
  // the tab is closed unless they say yes. Asking here rather than on page load
  // is the difference between an opt-in and a permanent denial.
  if ((n.type === 'friend_accepted' || n.type === 'message') && window.TalkLivePWA) {
    window.TalkLivePWA.askForPush(n.type);
  }
});

// --- Friend-to-friend chat ---
function renderFriendChatMessages() {
  const messages = friendChatCache.get(activeFriendChatId) || [];
  friendChatMessages.innerHTML = '';
  // The whole list is re-rendered, so every id the controller knows about is
  // stale - drop them before the new bubbles register themselves.
  if (friendExtras) friendExtras.reset();
  if (messages.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'history-empty';
    empty.textContent = t('noMessagesYet');
    friendChatMessages.appendChild(empty);
    return;
  }
  const myId = getClientId();
  messages.forEach((m) => {
    const mine = m.from === myId;
    const ts = m.ts || Date.now();
    // A stored chat can span weeks, so this is where day separators earn their
    // keep: "Yesterday" above the first message of yesterday, a weekday name
    // for the past week, a date beyond that.
    appendDayDivider(friendChatMessages, ts);
    const el = document.createElement('div');
    el.className = `chat-msg ${mine ? 'me' : 'them'}`;
    el.dataset.ts = String(ts);
    if (m.text) {
      const body = document.createElement('span');
      body.className = 'chat-msg-text';
      body.textContent = m.text;
      el.appendChild(body);
    }
    // Delivery ticks are the friend chat's own business (it has real "seen"
    // state below), so the bubble only carries the time.
    appendMessageMeta(el, ts, false);
    friendChatMessages.appendChild(el);
    applyGrouping(friendChatMessages, el, mine ? 'me' : 'them', ts);
    if (friendExtras) {
      friendExtras.decorate(el, {
        id: m.id, mine, text: m.text, replyTo: m.replyTo, gif: m.gif,
        reactions: m.reactions, myClientId: myId,
      });
    }
  });
  // "Seen" label under the most recent message I sent, once the recipient
  // has viewed the conversation (and only if I've opted into read receipts).
  if (messageSeenEnabled) {
    const lastMine = [...messages].reverse().find((m) => m.from === getClientId());
    if (lastMine && lastMine.seen) {
      const seenEl = document.createElement('div');
      seenEl.className = 'chat-seen-label';
      seenEl.textContent = t('seen');
      friendChatMessages.appendChild(seenEl);
    }
  }
  friendChatMessages.scrollTop = friendChatMessages.scrollHeight;
}

// Whether a live (accepted) call is in progress with this friend. Kept so the
// composer can auto-focus during a call - but chatting no longer requires it.
function inCallWith(clientId) {
  return callState === 'connected' && currentPartner && currentPartner.clientId === clientId;
}

// Friend chat is always open now: you can message an added friend any time,
// whether or not you're on a call with them. Offline messages are stored and
// delivered (with a notification) when they come back.
function applyFriendChatLock() {
  friendChatInput.disabled = false;
  friendChatInput.placeholder = t('typeMessage');
  friendChatForm.classList.remove('locked');
}

function openFriendChat(friendClientId) {
  activeFriendChatId = friendClientId;
  const friend = friendsData.find((f) => f.clientId === friendClientId);
  friendChatTitle.textContent = friend ? t('chatWith', { name: friendLabel(friend) }) : t('chat');
  closeSidePanel(friendsDropdown, friendsOverlay);
  closeSidePanel(friendProfileModal, friendProfileOverlay);
  openSidePanel(friendChatModal, friendChatOverlay);

  socket.emit('get-friend-chat', { friendClientId });
  socket.emit('mark-messages-read', { friendClientId });
  if (messageSeenEnabled) socket.emit('chat-seen', { friendClientId });
  notifData = notifData.filter((n) => !(n.type === 'message' && n.fromClientId === friendClientId));
  renderNotifications();
  renderFriendChatMessages();
  applyFriendChatLock();
  // Whoever is online right now is the baseline; only a drop from here is news.
  friendChatWasOnline = !!(friend && friend.online);
  friendChatPresence.classList.add('hidden');
  focusComposer(friendChatInput);
}

closeFriendChatBtn.addEventListener('click', () => {
  closeSidePanel(friendChatModal, friendChatOverlay);
  activeFriendChatId = null;
});

// Same extras as stranger chat. Reactions here are persisted server-side, so
// they survive a reload for both people rather than living only in the session.
friendExtras = window.TalkLiveChatExtras ? window.TalkLiveChatExtras.attach({
  form: friendChatForm,
  input: friendChatInput,
  messages: friendChatMessages,
  msgSelector: '.chat-msg',
  send: sendFriendMessage,
  react: (id, emoji, on) => {
    if (!activeFriendChatId) return;
    socket.emit('friend-reaction', { toClientId: activeFriendChatId, id, emoji, on });
    cacheReaction(activeFriendChatId, getClientId(), id, emoji, on);
  },
}) : null;

function sendFriendMessage(payload) {
  const text = payload.text || '';
  if (!activeFriendChatId || (!text && !payload.gif)) return false;
  if (text && messageHasLink(text)) {
    const el = document.createElement('div');
    el.className = 'chat-msg system';
    el.textContent = t('errNoLinks');
    friendChatMessages.appendChild(el);
    friendChatMessages.scrollTop = friendChatMessages.scrollHeight;
    return false;
  }
  socket.emit('friend-message', {
    toClientId: activeFriendChatId,
    text,
    id: payload.id,
    replyTo: payload.replyTo,
    gif: payload.gif,
  });
  return true;
}

friendChatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = friendChatInput.value.trim();
  if (!text || !activeFriendChatId) return;
  const sent = friendExtras
    ? friendExtras.compose(text)
    : sendFriendMessage({ text, id: null, replyTo: null });
  if (sent === false) return;
  friendChatInput.value = '';
});

// The friend-chat panel re-renders from friendChatCache on every incoming
// message and read receipt, so a reaction that only exists as a painted chip
// disappears the moment anything else arrives. Both directions write through
// to the cache here.
function cacheReaction(chatClientId, byClientId, id, emoji, on) {
  const cache = friendChatCache.get(chatClientId);
  const msg = cache && cache.find((m) => m.id === id);
  if (!msg) return;
  const reactions = msg.reactions || (msg.reactions = {});
  const who = reactions[emoji] || [];
  if (on) {
    if (who.indexOf(byClientId) === -1) reactions[emoji] = who.concat(byClientId);
  } else {
    const left = who.filter((c) => c !== byClientId);
    if (left.length) reactions[emoji] = left; else delete reactions[emoji];
  }
}

socket.on('friend-reaction', ({ fromClientId, id, emoji, on } = {}) => {
  cacheReaction(fromClientId, fromClientId, id, emoji, on);
  if (friendExtras && activeFriendChatId === fromClientId) {
    friendExtras.remoteReaction(id, emoji, on);
  }
});

socket.on('friend-message', ({ fromClientId, text, ts, id, replyTo, gif }) => {
  const cache = friendChatCache.get(fromClientId) || [];
  cache.push({ from: fromClientId, text, ts, id, replyTo, gif });
  friendChatCache.set(fromClientId, cache);
  if (activeFriendChatId === fromClientId && friendChatModal.classList.contains('open')) {
    renderFriendChatMessages();
    socket.emit('mark-messages-read', { friendClientId: fromClientId });
    if (messageSeenEnabled) socket.emit('chat-seen', { friendClientId: fromClientId });
  }
});

socket.on('chat-seen', ({ byClientId, ts } = {}) => {
  const cache = friendChatCache.get(byClientId);
  if (!cache) return;
  const myId = getClientId();
  cache.forEach((m) => {
    if (m.from === myId && (!m.ts || m.ts <= ts)) m.seen = true;
  });
  if (activeFriendChatId === byClientId) renderFriendChatMessages();
});

socket.on('friend-message-sent', ({ toClientId, text, ts, id, replyTo, gif }) => {
  const cache = friendChatCache.get(toClientId) || [];
  cache.push({ from: getClientId(), text, ts, id, replyTo, gif });
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
      ? `<button type="button" class="call-back-btn" data-id="${escapeHtml(entry.clientId)}" data-name="${escapeHtml(entry.username)}" title="${escapeHtml(t('callBack'))}" aria-label="${escapeHtml(t('callBack'))}">
          <svg viewBox="0 0 24 24" fill="white" aria-hidden="true"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
        </button>`
      : '';
    item.innerHTML = `
      <button type="button" class="history-item-name history-profile-btn" data-id="${escapeHtml(entry.clientId || '')}" title="${escapeHtml(t('openProfile'))}">${getFlagImg(entry.countryCode)} ${escapeHtml(entry.username)}</button>
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
  if (durationSeconds >= 30) trackGrowthEvent('quality_call');
  maybeShowSharePrompt(durationSeconds);
}

// --- Post-call share prompt -------------------------------------------------
// After a real call (30+ seconds) nudge the user to invite friends. Shown at
// most once per 24h so it never becomes nagging.
const SHARE_PROMPT_KEY = 'tl_share_prompt_at';
// Personalised when the server has issued this user a referral code, so the
// invite is attributable and can pay both sides. Falls back to the plain
// tracked link when it has not (the code is minted on demand, and the first
// open of the share sheet can win the race with the round trip).
function shareUrl() {
  if (myReferral.code) {
    return `https://talklive.app/?ref=${encodeURIComponent(myReferral.code)}`
      + '&utm_source=member_share&utm_medium=referral&utm_campaign=invite';
  }
  return 'https://talklive.app/?ref=invite&utm_source=member_share&utm_medium=referral&utm_campaign=invite';
}

function trackGrowthEvent(event) {
  fetch('/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event }),
    keepalive: true,
  }).catch(() => {});
}

function maybeShowSharePrompt(durationSeconds) {
  if (durationSeconds < 30) return;
  try {
    const last = Number(localStorage.getItem(SHARE_PROMPT_KEY) || 0);
    if (Date.now() - last < 24 * 60 * 60 * 1000) return;
    localStorage.setItem(SHARE_PROMPT_KEY, String(Date.now()));
  } catch (_) { return; }
  showSharePrompt();
}

function showSharePrompt() {
  trackGrowthEvent('share_prompt');
  // Mint this user's code (a no-op after the first time) so the link they are
  // about to share is attributable. Asking only here keeps the store free of a
  // code for every visitor who never opens the share sheet.
  socket.emit('get-referral-link');
  let card = document.getElementById('sharePromptCard');
  if (card) card.remove();
  card = document.createElement('div');
  card.id = 'sharePromptCard';
  card.className = 'share-prompt';
  card.innerHTML = `
    <h3></h3><p></p><p class="share-prompt-reward" id="referralStats"></p>
    <div class="share-prompt-actions">
      <button type="button" class="share-prompt-yes"></button>
      <button type="button" class="share-prompt-no"></button>
    </div>`;
  card.querySelector('h3').textContent = t('sharePromptTitle');
  card.querySelector('p').textContent = t('sharePromptBody')
    + ' ' + t('referralIncentive').replace('{days}', String(myReferral.rewardDays || 7));
  renderReferralStats();
  const yes = card.querySelector('.share-prompt-yes');
  const no = card.querySelector('.share-prompt-no');
  yes.textContent = t('sharePromptBtn');
  no.textContent = t('sharePromptLater');
  const dismiss = () => { card.classList.remove('show'); setTimeout(() => card.remove(), 300); };
  no.addEventListener('click', dismiss);
  yes.addEventListener('click', async () => {
    dismiss();
    trackGrowthEvent('share_open');
    const payload = { title: 'TalkLive', text: t('shareText'), url: shareUrl() };
    if (navigator.share) {
      try {
        await navigator.share(payload);
        trackGrowthEvent('share_success');
      } catch (_) { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(`${payload.text} ${payload.url}`);
        trackGrowthEvent('share_success');
        showToast(t('shareLinkCopied'));
      } catch (_) {}
    }
  });
  document.body.appendChild(card);
  requestAnimationFrame(() => card.classList.add('show'));
  setTimeout(() => { if (card.isConnected) dismiss(); }, 15000);
}

if (shareTalkLiveBtn) shareTalkLiveBtn.addEventListener('click', showSharePrompt);

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
  // Tapping the name opens who they are (and whether you have already asked
  // to add them); the green button still calls them straight back.
  const nameBtn = e.target.closest('.history-profile-btn');
  if (nameBtn && nameBtn.dataset.id) {
    const entry = callHistory.find((h) => h.clientId === nameBtn.dataset.id);
    closeModal(historyDropdown);
    openUserProfile({
      clientId: nameBtn.dataset.id,
      username: entry ? entry.username : '',
      countryCode: entry ? entry.countryCode : '',
      avatar: entry ? entry.avatar : null,
    });
    return;
  }
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

// --- Referrals ---------------------------------------------------------------
//
// The invite code arrives in ?ref= on the landing URL, but the person who
// clicked has no clientId until they register - and they may land on a
// marketing page and click through to the app first. So the code is parked in
// localStorage on arrival (public/pwa.js does that, since it loads on every
// page) and handed to the server at registration. The server pays nothing at
// that point: the reward is settled only after the invited person has had a
// real conversation.
const REFERRAL_PENDING_KEY = 'tl_ref_code';
let myReferral = { code: '', joined: 0, qualified: 0, rewardDays: 7 };

function takePendingReferralCode() {
  try {
    return localStorage.getItem(REFERRAL_PENDING_KEY) || '';
  } catch (_) {
    return '';
  }
}

registerClient({
  clientId: getClientId(),
  identityToken: getIdentityToken(),
  nickname: accountNickname || undefined,
  avatar: myAvatar || undefined,
  hideStatus: !statusVisible,
  referralCode: takePendingReferralCode() || undefined,
});
renderAccountState();

socket.on('referral-status', (info = {}) => {
  myReferral = { ...myReferral, ...info };
  // The code has been handed over and either counted or rejected; keeping it
  // would re-send it on every reconnect for the life of this browser.
  if (myReferral.code) { try { localStorage.removeItem(REFERRAL_PENDING_KEY); } catch (_) {} }
  renderReferralStats();
});

socket.on('referral-reward', (info = {}) => {
  myReferral = { ...myReferral, ...info };
  renderReferralStats();
  showToast(t('referralRewardToast').replace('{days}', String(info.days || 7)));
});

// Shown on the invite card so the loop is visible: people share far more when
// they can see the invite actually landed.
function renderReferralStats() {
  const el = document.getElementById('referralStats');
  if (!el) return;
  if (!myReferral.joined) { el.textContent = ''; return; }
  el.textContent = t('referralStats')
    .replace('{joined}', String(myReferral.joined))
    .replace('{qualified}', String(myReferral.qualified || 0));
}

socket.on('profile', (profile) => {
  myProfile = profile;
});

socket.on('identity-token', ({ clientId, token } = {}) => {
  if (clientId === getClientId() && typeof token === 'string' && /^[a-f0-9]{64}$/.test(token)) {
    localStorage.setItem('talklive_identity_token', token);
    if (lastRegisterPayload) lastRegisterPayload.identityToken = token;
  }
});

// public/pwa.js loads on every page and has no socket of its own, so it reads
// the signed identity through here rather than duplicating the storage keys.
// Both values are needed: the server refuses a push subscription or a checkout
// for a clientId whose token does not verify.
window.TalkLiveIdentity = function () {
  return { clientId: getClientId(), identityToken: getIdentityToken() };
};

// The server drops a search request from a socket that has no profile yet, so
// re-register and let the search watchdog re-enter the queue once it lands.
socket.on('needs-register', () => {
  if (lastRegisterPayload) socket.emit('register', lastRegisterPayload);
});

// The server now refuses a registration only while this identity is actively
// held by another live socket - typically this same person in a second tab, or
// a socket of ours the server has not yet noticed is dead. Rotating the local
// identity there would be a disaster: a new clientId is a new person, so the
// friends, friend chats, call history and premium attached to the old one are
// orphaned. So retry the same identity a few times first, and only rotate if it
// truly stays claimed.
// The server asks the socket that currently holds this identity to prove it is
// still alive before handing the identity to anyone else. Answering is the
// whole contract.
socket.on('identity-ping', (ack) => { if (typeof ack === 'function') ack(); });

// Whichever copy of the app the user is actually looking at should own the
// identity; a tab sitting in the background waits its turn rather than kicking
// the foreground one and starting a fight neither wins. Rate-limited so two
// visible windows on a desktop settle instead of trading it forever.
let lastTakeoverAt = 0;
let takeoverPending = false;
function claimIdentityWhenVisible() {
  if (takeoverPending || !lastRegisterPayload) return;
  const claim = () => {
    takeoverPending = false;
    if (document.visibilityState !== 'visible') return watchForVisible();
    if (Date.now() - lastTakeoverAt < 10000) return;
    lastTakeoverAt = Date.now();
    if (socket.connected) socket.emit('register', { ...lastRegisterPayload, takeover: true });
  };
  const watchForVisible = () => {
    takeoverPending = true;
    document.addEventListener('visibilitychange', function onVis() {
      if (document.visibilityState !== 'visible') return;
      document.removeEventListener('visibilitychange', onVis);
      takeoverPending = false;
      claim();
    });
  };
  if (document.visibilityState === 'visible') { takeoverPending = true; setTimeout(claim, 600); }
  else watchForVisible();
}

let identityRetries = 0;
socket.on('register-result', ({ ok, reason } = {}) => {
  if (ok !== false) { identityRetries = 0; return; }
  if (!lastRegisterPayload) return;
  // Another live copy of the app holds this identity - not a stuck client, so
  // retrying on a timer would only spin.
  if (reason === 'active-elsewhere') {
    identityRetries = 0;
    claimIdentityWhenVisible();
    return;
  }
  if (identityRetries < 4) {
    identityRetries += 1;
    setTimeout(() => {
      if (socket.connected && lastRegisterPayload) socket.emit('register', lastRegisterPayload);
    }, 1500 * identityRetries);
    return;
  }
  // Genuinely stuck: a client that can never register is worse than a new one.
  identityRetries = 0;
  localStorage.removeItem('talklive_client_id');
  localStorage.removeItem('talklive_identity_token');
  lastRegisterPayload.clientId = getClientId();
  lastRegisterPayload.identityToken = '';
  socket.emit('register', lastRegisterPayload);
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

// --- Network status: the brand dot next to "TalkLive" turns green when the
// internet + socket are healthy, red the moment either drops. ---
let socketConnected = false;
function refreshNetStatus() {
  const online = socketConnected && (typeof navigator.onLine === 'undefined' || navigator.onLine);
  brandDot.classList.toggle('is-online', online);
  brandDot.classList.toggle('is-offline', !online);
  brandDot.setAttribute('title', t(online ? 'netOnline' : 'netOffline'));
}
window.addEventListener('online', refreshNetStatus);
window.addEventListener('offline', refreshNetStatus);

// Tapping the "TalkLive" brand reloads the app (a clean way back to a fresh
// start from anywhere - search, an active call, or a game).
const brandHome = document.getElementById('brandHome');
// The logo goes home. From /call that is a real navigation back to the landing
// page; on the landing page itself there is nowhere to go, so it reloads as
// before. The unload warning is left in place deliberately - if a call is live,
// the browser asks before dropping it.
if (brandHome) {
  brandHome.addEventListener('click', () => {
    if (location.pathname !== '/') { location.href = '/'; return; }
    reloadPage();
  });
}

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
// reconnecting · disconnected - each maps to one of the four button modes. ---
let callState = 'idle';

function setCallState(state) {
  callState = state;
  const connected = state === 'connected';
  // Leaving the connected state cancels any pending "are you sure?".
  if (!connected) clearHangupConfirm();
  // Call state gates friend-chat DMs - keep an open chat's composer in sync.
  if (activeFriendChatId && friendChatModal.classList.contains('open')) applyFriendChatLock();

  // Published on the button so ads.js can tell searching apart from the other
  // states that share the 'loading' button mode. Searching is a still screen
  // with a waiting user; connecting and reconnecting belong to the call.
  callMainBtn.dataset.callState = state;

  let mode;
  if (connected) mode = hangupConfirm ? 'confirm' : 'hangup';
  else if (state === 'searching' || state === 'connecting' || state === 'reconnecting') mode = 'loading';
  else mode = 'call';
  setButtonMode(mode);

  // Mute / add-friend / report stay the same size always, but only work during
  // a live call - dimmed and disabled otherwise.
  muteBtn.disabled = !connected;
  addFriendBtn.disabled = !connected || addFriendBtn.classList.contains('added');
  reportBtn.disabled = !connected;
  // The Tic Tac Toe game needs a live partner.
  gameBtn.disabled = !connected;
  gameBtn.classList.toggle('nav-btn-off', !connected);
  reassureLine.classList.toggle('hidden', !connected);

  if (state === 'searching') startSearchTicker();
  else stopSearchTicker();
  if (!connected) stopQualityMonitor();
  // Nudge the user toward the game only while a call is live.
  if (typeof scheduleGameNudge === 'function') {
    if (connected) scheduleGameNudge();
    else stopGameNudge();
  }
  if (typeof syncChatHeader === 'function') syncChatHeader();
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
  // Longer dwell so users have time to actually read each tip (was 4s).
  tickerInterval = setInterval(() => {
    tickerIdx += 1;
    renderTickerItem();
  }, 9000);
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
      // wake lock denied (low battery, unsupported) - non-critical
    }
  } else if (!want && wakeLock) {
    try { wakeLock.release(); } catch (e) { /* already released */ }
    wakeLock = null;
  }
}

document.addEventListener('visibilitychange', () => {
  // The OS drops wake locks when the tab is backgrounded - re-acquire on return.
  if (document.visibilityState === 'visible') syncWakeLock();
});

// Colour milestones: the orb warms up the longer a call lasts, with a brief
// emoji flash at each one so the moment feels rewarding. Ordered longest-first
// so the highest reached milestone wins.
const CALL_MILESTONES = [
  { at: 3600, cls: 'phase-pink', emoji: '😍' },
  { at: 1800, cls: 'phase-orange', emoji: '😉' },
  { at: 600, cls: 'phase-purple', emoji: '😎' },
];
let lastMilestoneIdx = -1; // index into CALL_MILESTONES that's currently applied

function flashOrbEmoji(emoji) {
  if (!orbEmojiFlash) return;
  orbEmojiFlash.textContent = emoji;
  orbEmojiFlash.classList.remove('playing');
  void orbEmojiFlash.offsetWidth; // restart the animation
  orbEmojiFlash.classList.add('playing');
}

function applyCallPhase(elapsed) {
  // Find the highest milestone we've reached (CALL_MILESTONES is longest-first).
  let idx = CALL_MILESTONES.findIndex((m) => elapsed >= m.at);
  if (idx === lastMilestoneIdx) return;
  orb.classList.remove('phase-purple', 'phase-orange', 'phase-pink');
  // Only flash + play a chime when advancing to a *new, longer* milestone.
  const advancing = idx !== -1 && (lastMilestoneIdx === -1 || idx < lastMilestoneIdx);
  if (idx !== -1) {
    orb.classList.add(CALL_MILESTONES[idx].cls);
    if (advancing) {
      flashOrbEmoji(CALL_MILESTONES[idx].emoji);
      playTurnSound();
      vibrate([30, 40, 30]);
    }
  }
  lastMilestoneIdx = idx;
}

function startCallTimer() {
  callStartedAt = Date.now();
  lastMilestoneIdx = -1;
  orb.classList.remove('phase-purple', 'phase-orange', 'phase-pink');
  callTimerEl.classList.remove('hidden');
  clearInterval(callTimerInterval);
  const tick = () => {
    const elapsed = Math.floor((Date.now() - callStartedAt) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    callTimerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    applyCallPhase(elapsed);
  };
  tick();
  callTimerInterval = setInterval(tick, 1000);
}

function stopCallTimer() {
  clearInterval(callTimerInterval);
  callTimerInterval = null;
  callStartedAt = null;
  lastMilestoneIdx = -1;
  orb.classList.remove('phase-purple', 'phase-orange', 'phase-pink');
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

// --- Message time: every bubble is stamped, every new day gets a separator ---
// The stranger chat is a relay, so a message carries the server's timestamp
// (meta.ts) and only falls back to this browser's clock when it does not - two
// phones with two wrong clocks should still agree on the order of a
// conversation they are both in.
const Clock = () => window.TalkLiveTime || null;

// Drops a "Today / Yesterday / Monday / 4 Mar" row above the first message of
// a day. The last stamp is read off the list itself rather than held in a
// variable, so it survives clearChat(), a re-render, and messages arriving out
// of order relative to a panel being rebuilt.
function appendDayDivider(container, ts, className) {
  const clock = Clock();
  if (!clock) return;
  const rows = container.querySelectorAll('[data-day]');
  const last = rows.length ? rows[rows.length - 1].dataset.day : null;
  const stamp = clock.dayStamp(ts);
  if (last === stamp) return;
  container.appendChild(clock.dividerNode(ts, className || 'chat-day-divider'));
}

// The small time (and, for my own messages, the delivery ticks) that sits in
// the bottom corner of a bubble.
function appendMessageMeta(el, ts, withTicks) {
  const clock = Clock();
  const meta = document.createElement('span');
  meta.className = 'chat-msg-meta';
  const time = document.createElement('span');
  time.className = 'chat-msg-time';
  time.textContent = clock ? clock.time(ts) : '';
  // The full date is only ever a hover/long-press away.
  try { time.title = new Date(ts).toLocaleString(); } catch (e) { /* invalid date */ }
  meta.appendChild(time);
  if (withTicks) {
    const ticks = document.createElement('span');
    ticks.className = 'chat-msg-ticks sending';
    ticks.innerHTML = '<svg viewBox="0 0 16 11" aria-hidden="true"><path d="M11.1.6 4.9 8.4 1.9 5.4.5 6.8l4.4 4.4L12.5 2z"/><path d="M15.6.6 9.4 8.4l-.9-.9-1 1.3 1.9 1.9L17 2z"/></svg>';
    meta.appendChild(ticks);
  }
  el.appendChild(meta);
  return meta;
}

// Consecutive messages from the same side within a few minutes are one turn in
// the conversation, so they tuck together instead of each floating alone.
const GROUP_WINDOW_MS = 3 * 60 * 1000;
function applyGrouping(container, el, kind, ts) {
  const prev = el.previousElementSibling;
  if (!prev || !prev.classList.contains('chat-msg')) return;
  if (!prev.classList.contains(kind) || kind === 'system') return;
  const prevTs = Number(prev.dataset.ts);
  if (prevTs && ts - prevTs > GROUP_WINDOW_MS) return;
  el.classList.add('is-grouped');
}

// Returns the created element so the caller can transition its delivery state
// (WhatsApp-style: sending → sent). Uses a transform/opacity entrance animation
// that stays on the compositor for a smooth 60fps pop with no layout jank.
function addChatMessage(text, kind, meta) {
  const ts = (meta && meta.ts) || Date.now();
  if (kind !== 'system') appendDayDivider(chatMessages, ts);
  const el = document.createElement('div');
  // Sent messages get the punchy "pop" keyframe; received/system slide in.
  el.className = `chat-msg ${kind}` + (kind === 'me' ? ' chat-msg-pop' : ' chat-msg-enter');
  el.dataset.ts = String(ts);
  const bubble = document.createElement('span');
  bubble.className = 'chat-msg-text';
  bubble.textContent = text;
  el.appendChild(bubble);
  if (kind !== 'system') appendMessageMeta(el, ts, kind === 'me');
  setChatEmptyVisible(false);
  // Quote, GIF and reaction row, when the message carries them. After the ticks
  // so a GIF renders below the delivery state rather than shoving it down.
  if (meta && strangerExtras) {
    strangerExtras.decorate(el, {
      id: meta.id, mine: kind === 'me', text, replyTo: meta.replyTo, gif: meta.gif,
    });
  }
  chatMessages.appendChild(el);
  applyGrouping(chatMessages, el, kind, ts);
  if (kind !== 'me') {
    // Double rAF so the enter animation is guaranteed to run from its start frame.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => el.classList.remove('chat-msg-enter'));
    });
  }
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return el;
}

function clearChat() {
  chatMessages.innerHTML = '';
  if (strangerExtras) strangerExtras.reset();
  syncChatEmpty();
  typingIndicator.classList.add('hidden');
  if (typeof setChatUnread === 'function') setChatUnread(0);
}

async function getMic() {
  if (localStream) {
    // A track can end while the stream object stays alive (device unplugged, an
    // incoming phone call, a mobile tab suspended). Reusing it sends silence for
    // the rest of the session - the classic "they can't hear me" report.
    if (localStream.getAudioTracks().some((t) => t.readyState === 'live')) return localStream;
    localStream.getTracks().forEach((t) => { try { t.stop(); } catch (_) { /* already gone */ } });
    localStream = null;
  }
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

// How long a match may sit on "Connecting…" before we give up and find someone
// else. Armed at match time rather than at peer-creation time: everything
// between the two - re-acquiring the mic, refreshing the TURN credentials,
// constructing the RTCPeerConnection, building the offer - can reject or simply
// never settle, and until this timer exists nothing recovers the user from that.
// It used to be armed inside createPeerConnection(), i.e. only once the risky
// part had already succeeded, so a failure there left the call screen frozen on
// "Connecting to someone in …" with no watchdog, no error and no way forward
// short of a reload.
const CONNECT_WATCHDOG_MS = 20000;

// An exception we catch never reaches the global handler, so route it to the
// same reporter by hand rather than losing it.
function reportClientError(where, err) {
  try {
    console.error('[talklive]', where, err);
    if (typeof reportError === 'function') {
      reportError(`${where}: ${(err && err.message) || err}`, err && err.stack);
    }
  } catch (_) { /* never let reporting break the call */ }
}

function armConnectWatchdog() {
  clearConnectWatchdog();
  connectWatchdog = setTimeout(() => {
    connectWatchdog = null;
    if (!mediaConnected) noteMediaFailure();
  }, CONNECT_WATCHDOG_MS);
}

function clearReconnectDeadline() {
  clearTimeout(reconnectDeadline);
  reconnectDeadline = null;
}

// Automatically move to the next available match. Used by skip, the initial
// connect watchdog, and the 30s reconnect deadline.
//
// `failed` tells the server this match never became a working call, so it keeps
// the two of us apart instead of handing us straight back to each other - which
// is what turned one dead media path into an endless cycle of 20s "Connecting…"
// screens. Read before teardownPeer(), which clears mediaConnected.
function autoNextMatch(statusKey, failed) {
  const neverConnected = failed === undefined ? !mediaConnected : !!failed;
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
  socket.emit('skip', neverConnected ? { failed: true } : {});
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

// ICE restart, throttled so it can retry (every 5s) without spamming offers.
// Both peers may call this; offer glare is resolved politely in handleSignal.
let lastIceRestartAt = 0;
function attemptIceRestart(peer) {
  const now = Date.now();
  if (now - lastIceRestartAt < 5000) return;
  lastIceRestartAt = now;
  peer.createOffer({ iceRestart: true })
    .then((offer) => peer.setLocalDescription(offer))
    .then(() => socket.emit('signal', { type: 'offer', sdp: peer.localDescription }))
    .catch(() => { /* the reconnect window will auto-advance if this fails */ });
}

// Playback can be refused if the tab lost its autoplay permission (a rejected
// play() is silent, not an error the user sees). Retry once on the next tap.
function playRemoteAudio() {
  if (!remoteAudio || !remoteAudio.play) return;
  remoteAudio.muted = false;
  const attempt = remoteAudio.play();
  if (!attempt || !attempt.catch) return;
  attempt.catch(() => {
    const retry = () => {
      document.removeEventListener('pointerdown', retry);
      if (remoteAudio.srcObject) remoteAudio.play().catch(() => {});
    };
    document.addEventListener('pointerdown', retry, { once: true });
  });
}

// A match that negotiates fine and then carries no audio means this user has no
// working network path to the other side. One is bad luck; a run of them is a
// network that needs a TURN relay to get through (see DEPLOY-TURN.md). Counting
// them tells the operator how big that population actually is, and tells the
// user why skipping forever is not helping them.
let consecutiveMediaFailures = 0;
// Two, not three: each failure costs the user a full 20s watchdog before we
// move on, and one failure really can just be the other person's network. Two
// in a row is a strong enough signal to be worth explaining after ~40s rather
// than leaving them cycling through strangers in silence.
const MEDIA_FAILURES_BEFORE_NOTICE = 2;

function noteMediaFailure() {
  consecutiveMediaFailures += 1;
  trackGrowthEvent('call_media_failed');
  if (consecutiveMediaFailures === MEDIA_FAILURES_BEFORE_NOTICE) {
    // Say it once per run of failures, not on every subsequent match.
    showError(t('errNetworkBlocksCalls'));
    trackGrowthEvent('call_media_blocked_notice');
  }
  autoNextMatch('statusFindingNew');
}

// --- Real media confirmation -------------------------------------------------
// The only trustworthy proof that a call works is inbound audio bytes actually
// arriving. Everything the UI calls "connected" hangs off this.
let mediaFlowInterval = null;
let mediaFlowStartedAt = 0;
let lastInboundBytes = 0;
let sawInboundReport = false;

function stopMediaFlowWatch() {
  clearInterval(mediaFlowInterval);
  mediaFlowInterval = null;
}

function confirmMediaFlowing() {
  if (mediaConnected) return;
  mediaConnected = true;
  // A working call disproves the "your network blocks calls" notice, so retract
  // it rather than leaving a stale warning over a live conversation.
  if (consecutiveMediaFailures >= MEDIA_FAILURES_BEFORE_NOTICE) clearError();
  consecutiveMediaFailures = 0;
  trackGrowthEvent('call_media_ok');
  stopMediaFlowWatch();
  revealPartner();
  setState('connected');
  setCallState('connected');
  setStatusText('statusConnected');
  setSubTextFading('subSayHi');
  setConnection('green', 'connConnected');
  clearConnectWatchdog();
  clearReconnectDeadline();
  startQualityMonitor();
}

function watchMediaFlow(peer) {
  stopMediaFlowWatch();
  mediaFlowStartedAt = Date.now();
  lastInboundBytes = 0;
  sawInboundReport = false;
  mediaFlowInterval = setInterval(async () => {
    if (pc !== peer) return stopMediaFlowWatch();
    if (mediaConnected) return stopMediaFlowWatch();
    let stats;
    try {
      stats = await peer.getStats();
    } catch (e) {
      return; // transient; the connect watchdog still guards the call
    }
    if (pc !== peer || mediaConnected) return stopMediaFlowWatch();

    let bytes = null;
    stats.forEach((r) => {
      if (r.type === 'inbound-rtp' && (r.kind === 'audio' || r.mediaType === 'audio')) {
        bytes = Math.max(bytes || 0, r.bytesReceived || 0);
      }
    });
    if (bytes !== null) sawInboundReport = true;
    if (bytes !== null && bytes > 0 && bytes > lastInboundBytes) return confirmMediaFlowing();
    if (bytes !== null) lastInboundBytes = bytes;

    const iceUp = peer.iceConnectionState === 'connected' || peer.iceConnectionState === 'completed';
    const elapsed = Date.now() - mediaFlowStartedAt;
    // Fallback for browsers that never expose inbound-rtp audio stats: once ICE
    // is up and has stayed up, take that as connected rather than hanging.
    if (iceUp && !sawInboundReport && elapsed > 5000) return confirmMediaFlowing();
    // ICE agreed a path but nothing is arriving on it - a stale/half-open relay
    // pair. Re-gather instead of waiting out the watchdog in silence.
    if (iceUp && sawInboundReport && elapsed > 8000) attemptIceRestart(peer);
  }, 500);
}

function createPeerConnection(isInitiator) {
  // ICE_TRANSPORT_POLICY is 'relay' only when the server published a real TURN
  // relay (relay-only hides both peers' IPs); otherwise 'all', so host/STUN
  // candidates can still form a working path instead of none at all.
  // Last line of defence behind sanitiseIceServers(): if the constructor still
  // rejects the list, fall back to bare STUN instead of throwing out of the
  // whole call setup. A STUN-only call fails for some networks; a thrown
  // constructor failed for everyone, silently.
  let peer;
  try {
    peer = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceTransportPolicy: ICE_TRANSPORT_POLICY,
      iceCandidatePoolSize: 0,
    });
  } catch (e) {
    peer = new RTCPeerConnection({
      iceServers: [{ urls: FALLBACK_STUN_URLS.slice() }],
      iceTransportPolicy: 'all',
      iceCandidatePoolSize: 0,
    });
  }
  // A brand-new peer has no remote description yet, so start a fresh candidate
  // buffer (see handleSignal). Never carry candidates across connections.
  pendingCandidates = [];

  // startCall() guarantees a stream, but a teardown (ban, maintenance, an
  // abandoned call-back) can null it out between the match and this call. A
  // peer with no tracks is still better than a TypeError that kills the whole
  // handler and leaves the UI stuck on "connecting".
  if (localStream) {
    localStream.getTracks().forEach((track) => peer.addTrack(track, localStream));
  } else {
    // No mic: still negotiate an audio m-line. Without one the offer carries no
    // media at all and the call is silent in BOTH directions; with it we can at
    // least hear the other side.
    try { peer.addTransceiver('audio', { direction: 'recvonly' }); } catch (e) { /* older browsers */ }
  }
  // Force every audio transceiver that has a local track to send+receive.
  // Without this, a race where a track is briefly absent can leave a "recvonly"
  // transceiver, which silently produces one-way audio.
  peer.getTransceivers().forEach((tr) => {
    if (!tr.sender || !tr.sender.track) return;
    try { tr.direction = 'sendrecv'; } catch (e) { /* direction is read-only pre-negotiation on old builds */ }
  });

  peer.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('signal', { type: 'ice-candidate', candidate: event.candidate });
    }
  };

  peer.ontrack = (event) => {
    // ontrack fires as soon as the remote SDP is applied - long before ICE has
    // agreed a candidate pair and any audio actually flows. Treating it as
    // "connected" was what left calls sitting on a green indicator in silence,
    // with the connect watchdog cancelled so they never even moved on. Attach
    // the stream here, but wait for real inbound audio before saying connected.
    remoteAudio.srcObject = event.streams[0];
    playRemoteAudio();
    monitorRemoteAudio(event.streams[0]);
    watchMediaFlow(peer);
  };

  // If a call never fully connects (common with flaky TURN relays across distant
  // networks), move on to a new match instead of stalling silently. The timer is
  // already running from match time; restart it here so the peer gets the full
  // window rather than whatever the mic/TURN setup left of it.
  clearReconnectDeadline();
  iceRestartAttempted = false;
  mediaConnected = false;
  // The 5s ICE-restart throttle is per-call, not global. Left carrying over, a
  // restart late in one call silently suppressed the first restart of the next
  // one - so a brand-new call that stalled had to wait out the full watchdog
  // instead of re-gathering straight away.
  lastIceRestartAt = 0;
  armConnectWatchdog();

  peer.oniceconnectionstatechange = () => {
    // Only the live call may drive the call UI. A connection we have already
    // moved on from - or one whose events land after the user hung up and
    // started searching again - must not repaint the search screen as
    // "reconnecting" or arm a recovery window for a call that is over.
    if (pc !== peer || callState === 'idle' || callState === 'searching') return;
    const iceState = peer.iceConnectionState;
    if (iceState === 'connected' || iceState === 'completed') {
      clearReconnectDeadline();
      iceRestartAttempted = false;
      // A live transport is not yet a working call: keep the connect watchdog
      // armed until watchMediaFlow() sees audio actually arriving. Restarting
      // the watcher also covers a recovery where ontrack never fires again.
      if (mediaConnected) setConnection('green', 'connConnected');
      else if (!mediaFlowInterval) watchMediaFlow(peer);
    } else if (iceState === 'checking') {
      if (!mediaConnected) setConnection('orange', 'connConnecting');
    } else if (iceState === 'disconnected' || iceState === 'failed') {
      // Peer degraded or (temporarily) went away - try to recover for 30s.
      setConnection('orange', 'connReconnecting');
      if (mediaConnected) setStatusText('statusReconnecting');
      startReconnectWindow();
      // The initiator (impolite peer) restarts immediately. The answerer only
      // restarts if it's still broken a few seconds later - this covers the case
      // where the initiator's own network dropped and its restart never sent,
      // while glare between the two restarts is handled politely in handleSignal.
      if (isInitiator) {
        attemptIceRestart(peer);
      } else {
        setTimeout(() => {
          if (pc === peer && (peer.iceConnectionState === 'disconnected' || peer.iceConnectionState === 'failed')) {
            attemptIceRestart(peer);
          }
        }, 3000);
      }
    } else if (iceState === 'closed') {
      setConnection('red', 'connDisconnected');
      clearConnectWatchdog();
    }
  };

  return peer;
}

let visualizerCtx = null;
let visualizerSource = null;

function monitorRemoteAudio(stream) {
  clearInterval(speakingCheckInterval);
  try {
    // One context for the whole session. Browsers cap concurrent AudioContexts
    // (~6 in Chrome), and creating a fresh one per match used to hit that cap
    // after a handful of skips, which broke audio handling from then on.
    if (!visualizerCtx || visualizerCtx.state === 'closed') {
      visualizerCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const audioCtx = visualizerCtx;
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    // Release the previous match's graph so nodes don't pile up on the shared context.
    if (visualizerSource) {
      try { visualizerSource.disconnect(); } catch (_) { /* already detached */ }
      visualizerSource = null;
    }
    const source = audioCtx.createMediaStreamSource(stream);
    visualizerSource = source;
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

// Bumped for every match and every teardown. startCall() awaits the mic and the
// TURN list, and either await can outlive the match that started it (a mic
// permission prompt nobody answers, a hung fetch). Without this check the late
// continuation would build a peer connection for a call the user has already
// been moved on from, quietly hijacking the next match's `pc`.
let callGeneration = 0;

async function startCall(initiator, generation) {
  const stale = () => generation !== undefined && generation !== callGeneration;
  // Re-acquire the mic if a teardown released it (or its track died) while we
  // were being matched, so the call starts with audio instead of silence.
  try { await getMic(); } catch (_) { /* fall through: peer negotiates recvonly */ }
  if (stale()) return;
  // Never build a peer before the server's TURN list has landed - the static
  // fallback is STUN-only and cannot cross a symmetric NAT. Also refreshes the
  // list if its TURN credentials are close to expiring.
  try { await refreshIceConfigIfStale(); } catch (_) { /* fallback list stands */ }
  if (stale()) return;
  pc = createPeerConnection(initiator);
  try { if (window.Moderation) window.Moderation.start(localStream, socket); } catch (_) { /* never break the call */ }
  if (initiator) {
    const peer = pc;
    const offer = await peer.createOffer();
    if (stale() || pc !== peer) return;
    await peer.setLocalDescription(offer);
    if (stale() || pc !== peer) return;
    socket.emit('signal', { type: 'offer', sdp: offer });
  }
  await flushPendingSignals();
}

// Signals that arrived before this side finished building its peer connection.
// The other peer starts offering the moment the server matches us, which can be
// before our getUserMedia / ICE-config await resolves; dropping that offer left
// the call negotiating forever with no audio.
let pendingSignals = [];

async function flushPendingSignals() {
  const queued = pendingSignals;
  pendingSignals = [];
  for (const data of queued) await handleSignal(data);
}

// ICE candidates that arrived before the remote description was set. Adding a
// candidate with no remote description throws and the candidate is lost - the
// classic cause of one-way audio across high-latency (international) links,
// where trickled candidates routinely race ahead of the offer/answer SDP. We
// buffer them and flush once the remote description lands.
let pendingCandidates = [];

async function flushPendingCandidates() {
  if (!pc || !pc.remoteDescription) return;
  const queued = pendingCandidates;
  pendingCandidates = [];
  for (const cand of queued) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(cand));
    } catch (e) {
      // ignore individual bad/stale candidates
    }
  }
}

async function handleSignal(data) {
  if (!pc) {
    // Only buffer while a match is actually being set up (currentPartner is set
    // by 'matched' and cleared by teardownPeer), so a straggler from the last
    // call can never be replayed into the next one.
    if (data && currentPartner && pendingSignals.length < 64) pendingSignals.push(data);
    return;
  }
  try {
    if (data.type === 'offer') {
      // Glare: an offer arrived while we have our own outstanding offer (both
      // sides fired an ICE restart). The impolite peer (call initiator) keeps
      // its own offer and ignores theirs; the polite peer rolls back and accepts.
      if (pc.signalingState !== 'stable') {
        if (amCallInitiator) return;
        try {
          await Promise.all([
            pc.setLocalDescription({ type: 'rollback' }),
            pc.setRemoteDescription(new RTCSessionDescription(data.sdp)),
          ]);
        } catch (e) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        }
      } else {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      }
      await flushPendingCandidates();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('signal', { type: 'answer', sdp: answer });
    } else if (data.type === 'answer') {
      // Ignore a stray/duplicate answer that arrives when we're not expecting
      // one (e.g. after an ICE-restart glare) - applying it would throw.
      if (pc.signalingState !== 'have-local-offer') return;
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      await flushPendingCandidates();
    } else if (data.type === 'ice-candidate') {
      if (!data.candidate) return;
      if (pc.remoteDescription && pc.remoteDescription.type) {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } else {
        pendingCandidates.push(data.candidate);
      }
    }
  } catch (e) {
    // A single failed signal step shouldn't kill the call; the connect
    // watchdog / 30s reconnect window will recover or advance if needed.
  }
}

function teardownPeer() {
  try { if (window.Moderation) window.Moderation.stop(); } catch (_) { /* never break teardown */ }
  recordCallHistory();
  // Invalidate any startCall() still sitting on an await for this call, so it
  // cannot finish building a peer after the call it belongs to is gone.
  callGeneration += 1;
  currentPartner = null;
  clearConnectWatchdog();
  clearReconnectDeadline();
  pendingCandidates = [];
  pendingSignals = [];
  mediaConnected = false;
  stopMediaFlowWatch();
  clearInterval(speakingCheckInterval);
  orb.classList.remove('speaking');
  orb.classList.remove('muted-remote');
  orbRings.forEach((ring) => {
    ring.style.transform = '';
    ring.style.opacity = '';
    ring.style.borderColor = '';
  });
  if (pc) {
    // Detach every handler, not just two of them. close() itself fires no
    // events, so this is not what caused a stale indicator - but each handler
    // is a closure over this connection (and, via `peer`, its transceivers and
    // stats), so leaving four of them attached kept the whole closed
    // RTCPeerConnection reachable from the DOM-adjacent event machinery for as
    // long as the object lived. Over a long session of skipping, that is one
    // retained peer connection per stranger.
    pc.onicecandidate = null;
    pc.ontrack = null;
    pc.oniceconnectionstatechange = null;
    pc.onconnectionstatechange = null;
    pc.onicegatheringstatechange = null;
    pc.onsignalingstatechange = null;
    pc.onnegotiationneeded = null;
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
  hidePeerGone();
  isSearching = false;
  clearHangupConfirm();
  setCallState('idle');
  setState('idle');
  setStatusText('statusIdle');
  setSubText('subIdle');
  // Back to the Tap-to-Talk landing URL, without adding a history entry.
  if (location.pathname === '/call' || location.pathname === '/chat') {
    history.replaceState(history.state, '', '/');
  }
  callPanel.classList.add('hidden');
  setupPanel.classList.remove('hidden');
  // Back on the landing screen, so the header's Log In / Sign Up returns.
  renderHeaderAuthVisibility();
  stageEl.classList.remove('call-live');
  startBtn.disabled = false;
  startBtn.classList.remove('is-connecting');
  closeChatPanel();
  clearChat();
  hideConnection();
  // Game + chat need a live partner; the rest of the toolbar (settings,
  // history, friends, filters) stays available on every screen.
  chatToggleBtn.classList.add('hidden');
  gameBtn.classList.add('hidden');
  if (typeof resetGame === 'function') resetGame();
}

// Return the single button to green "Call" (idle) on the persistent call screen.
// Used both after a manual hang-up and when the other side ends the call.
function goIdleOnCallScreen(statusKey) {
  isSearching = false;
  teardownPeer();
  clearChat();
  closeChatPanel();
  clearHangupConfirm();
  if (typeof resetGame === 'function') resetGame();
  setCallState('idle');
  setState('idle');
  hideConnection();
  setStatusText(statusKey || 'statusReadyToTalk');
  setSubText('subTapCall');
}

function registerProfile() {
  registerClient({
    clientId: getClientId(),
    identityToken: getIdentityToken(),
    gender: genderGroup.dataset.value,
    prefGender: appliedFilters.prefGender,
    includeCountries: appliedFilters.includeCountries,
    excludeCountries: appliedFilters.excludeCountries,
    interests: appliedFilters.interests,
    nickname: accountNickname || tempUsername || undefined,
    avatar: myAvatar || undefined,
    animal: myAnimal || undefined,
    hideStatus: !statusVisible,
    acceptCalls: acceptCallsEnabled,
  });
}

// Move from the Tap-to-Talk landing to the call screen and reveal the toolbar
// + big chat button. Safe to call repeatedly (e.g. on each new match).
function enterCallUI() {
  closeChatPanel();
  // Reflect the live screen as its own URL without adding a history entry, so
  // the existing back-button guard stack is untouched.
  if (location.pathname !== '/call') {
    history.replaceState(history.state, '', '/call');
  }
  setupPanel.classList.add('hidden');
  callPanel.classList.remove('hidden');
  stageEl.classList.add('call-live');
  chatToggleBtn.classList.remove('hidden');
  appSettingsBtn.classList.remove('hidden');
  historyBtn.classList.remove('hidden');
  friendsBtn.classList.remove('hidden');
  filtersBtn.classList.remove('hidden');
  gameBtn.classList.remove('hidden');
  // Auth is the one header control the call screen drops.
  renderHeaderAuthVisibility();
}

let beginInFlight = false;
const MIC_EXPLAINED_KEY = 'talklive_mic_explained';
async function begin() {
  if (beginInFlight) return;
  beginInFlight = true;
  startBtn.disabled = true;
  clearError();
  // One-time explainer before the browser's mic prompt so the permission
  // request doesn't come out of nowhere (biggest drop-off point on first use).
  if (!localStream && !localStorage.getItem(MIC_EXPLAINED_KEY)) {
    const proceed = await showConfirm({
      title: 'micPromptTitle', text: 'micPromptBody',
      okKey: 'micPromptOk', okClass: 'btn-primary',
    });
    if (!proceed) {
      beginInFlight = false;
      startBtn.disabled = false;
      startBtn.classList.remove('is-connecting');
      setButtonMode('call');
      return;
    }
    localStorage.setItem(MIC_EXPLAINED_KEY, 'yes');
  }
  try {
    await getMic();
  } catch (e) {
    trackGrowthEvent('call_mic_denied');
    beginInFlight = false;
    startBtn.disabled = false;
    startBtn.classList.remove('is-connecting');
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

  emitFindPartner();
}

const ageConsentModal = document.getElementById('ageConsentModal');
const ageAgreeBtn = document.getElementById('ageAgreeBtn');
const ageAgreeCheckbox = document.getElementById('ageAgreeCheckbox');
const CONSENT_KEY = 'talklive_age_consent';

// Start a call from the big button - gated by the one-time age/terms consent,
// then mic permission handled in begin().
function startCallFlow() {
  playTapSound();
  clearError();
  trackGrowthEvent('call_start_intent');
  if (localStorage.getItem(CONSENT_KEY) === 'yes') {
    begin();
  } else {
    ageAgreeCheckbox.checked = false;
    ageAgreeBtn.disabled = true;
    openModal(ageConsentModal);
  }
}

ageAgreeCheckbox.addEventListener('change', () => {
  ageAgreeBtn.disabled = !ageAgreeCheckbox.checked;
});

// --- Landing "Tap to Talk" feedback: ripple + press + connecting spinner so
// the user gets instant confirmation and can't fire off repeated taps. ---
function spawnRipple(el, ev) {
  const rect = el.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = (ev && ev.clientX != null ? ev.clientX : rect.left + rect.width / 2) - rect.left;
  const y = (ev && ev.clientY != null ? ev.clientY : rect.top + rect.height / 2) - rect.top;
  const ripple = document.createElement('span');
  ripple.className = 'tap-ripple';
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = (x - size / 2) + 'px';
  ripple.style.top = (y - size / 2) + 'px';
  el.appendChild(ripple);
  setTimeout(() => ripple.remove(), 650);
}

// The Tap-to-Talk landing orb: same flow as the green Call button, with
// immediate visual feedback and guarded against double taps.
startBtn.addEventListener('click', (ev) => {
  if (startBtn.disabled || startBtn.classList.contains('is-connecting')) return;
  spawnRipple(startBtn, ev);
  startBtn.classList.add('is-connecting');
  startCallFlow();
});

ageAgreeBtn.addEventListener('click', () => {
  localStorage.setItem(CONSENT_KEY, 'yes');
  closeModal(ageConsentModal);
  if (pendingInviteToken) joinVoiceInvite();
  else begin();
});

// Accepting a voice-call invite from /chat: same consent + mic setup as a
// normal call, but instead of joining the random-match queue we hand the
// invite token to the server, which pairs us with whoever holds the other
// half the moment they arrive too.
let joinInviteInFlight = false;
async function joinVoiceInvite() {
  if (joinInviteInFlight || !pendingInviteToken) return;
  joinInviteInFlight = true;
  clearError();
  try {
    await getMic();
  } catch (e) {
    joinInviteInFlight = false;
    if (e.name === 'NotAllowedError' || e.name === 'SecurityError') showError(t('errMicBlocked'));
    else if (e.name === 'NotFoundError') showError(t('errNoMic'));
    else if (e.name === 'NotReadableError') showError(t('errMicBusy'));
    else showError(t('errMicRequired'));
    return;
  }
  joinInviteInFlight = false;

  registerProfile();
  isSearching = true;
  enterCallUI();
  setCallState('searching');
  setState('waiting');
  setConnection('orange', 'connConnecting');
  setStatusText('statusConnecting');
  setSubText(null);

  socket.emit('voice-invite-join', { token: pendingInviteToken });
}

// Kick off the invite flow as soon as we can - same one-time age gate as any
// other call, otherwise straight in (a mic prompt on load needs no fresh
// user gesture, unlike autoplay).
if (pendingInviteToken) {
  if (localStorage.getItem(CONSENT_KEY) === 'yes') {
    joinVoiceInvite();
  } else {
    ageAgreeCheckbox.checked = false;
    ageAgreeBtn.disabled = true;
    openModal(ageConsentModal);
  }
}

// Keep searching for a new person (used after a hang-up when auto-call is on).
// The old call has to be torn down before the new search starts. Leaving it up
// left the ex-partner's card, running timer and reaction bar on screen, and its
// still-attached ICE handler then saw the peer go away a moment later and
// painted "Connection dropped - reconnecting…" (plus a pointless 30s recovery
// window and ICE restart) over a search that was already under way.
function findNextPerson(statusKey) {
  clearError();
  teardownPeer();
  clearChat();
  closeChatPanel();
  clearHangupConfirm();
  if (typeof resetGame === 'function') resetGame();
  isSearching = true;
  setCallState('searching');
  setState('waiting');
  setConnection('orange', 'connSearching');
  setStatusText(statusKey || 'statusSearching');
  setSubText('subHangTight');
  emitFindPartner();
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
    // Green "Call" - begin a new search.
    startCallFlow();
  }
});

// --- Report dialog: quick reasons + optional custom detail ---
const reportModal = document.getElementById('reportModal');
const closeReportBtn = document.getElementById('closeReportBtn');
const reportReasons = document.getElementById('reportReasons');
const reportCustomInput = document.getElementById('reportCustomInput');
const reportSubmitBtn = document.getElementById('reportSubmitBtn');
let selectedReportReason = null;

function openReportModal() {
  selectedReportReason = null;
  reportReasons.querySelectorAll('.report-reason').forEach((b) => b.classList.remove('selected'));
  reportCustomInput.value = '';
  openModal(reportModal);
}

reportBtn.addEventListener('click', () => {
  if (callState !== 'connected') return;
  openReportModal();
});
closeReportBtn.addEventListener('click', () => closeModal(reportModal));
reportModal.addEventListener('click', (e) => { if (e.target === reportModal) closeModal(reportModal); });

reportReasons.addEventListener('click', (e) => {
  const btn = e.target.closest('.report-reason');
  if (!btn) return;
  reportReasons.querySelectorAll('.report-reason').forEach((b) => b.classList.toggle('selected', b === btn));
  selectedReportReason = btn.dataset.reason;
});

reportSubmitBtn.addEventListener('click', () => {
  if (!selectedReportReason) { showError(t('reportPickReason')); return; }
  const detail = reportCustomInput.value.trim().slice(0, 300);
  closeModal(reportModal);
  teardownPeer();
  clearChat();
  isSearching = true;
  setCallState('searching');
  setState('waiting');
  setConnection('red', 'connReported');
  setStatusText('statusReported');
  socket.emit('report', { reason: selectedReportReason, detail });
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

// --- Unread message badge on the chat button ---
let chatUnread = 0;
function setChatUnread(n) {
  chatUnread = n;
  if (n > 0) {
    chatBadge.textContent = n > 99 ? '99+' : String(n);
    chatBadge.classList.remove('hidden');
    // Replay the little pop each time the count changes.
    chatBadge.style.animation = 'none';
    void chatBadge.offsetWidth;
    chatBadge.style.animation = '';
  } else {
    chatBadge.classList.add('hidden');
  }
}

// --- Chat peer header: partner name + flag + online/offline while on a call ---
const chatPeerAvatar = document.getElementById('chatPeerAvatar');
const chatPeerName = document.getElementById('chatPeerName');
const chatPeerFlag = document.getElementById('chatPeerFlag');
const chatPeerStatus = document.getElementById('chatPeerStatus');
const chatPeerStatusText = document.getElementById('chatPeerStatusText');
function syncChatHeader() {
  if (currentPartner && callState === 'connected') {
    chatPeerName.textContent = currentPartner.username;
    chatPeerFlag.innerHTML = getFlagImg(currentPartner.countryCode, 22);
    chatPeerStatus.classList.remove('hidden', 'is-offline');
    chatPeerStatus.classList.add('is-online');
    chatPeerStatusText.textContent = t('online');
  } else if (currentPartner && (callState === 'reconnecting' || callState === 'connecting')) {
    chatPeerName.textContent = currentPartner.username;
    chatPeerFlag.innerHTML = getFlagImg(currentPartner.countryCode, 22);
    chatPeerStatus.classList.remove('hidden', 'is-online');
    chatPeerStatus.classList.add('is-offline');
    chatPeerStatusText.textContent = t('offline');
  } else {
    chatPeerName.textContent = t('chat');
    chatPeerFlag.innerHTML = '';
    chatPeerStatus.classList.add('hidden');
  }
  // The stranger's spirit animal, next to their name. It is the one thing
  // either of you knows about the other, and it is already on the call screen -
  // repeating it here is what turns the panel header from the word "Chat" into
  // a person.
  const animalId = currentPartner && currentPartner.animal;
  const hasAnimal = !!(animalId && typeof Animals !== 'undefined' && Animals.has(animalId));
  if (chatPeerAvatar) {
    chatPeerAvatar.classList.toggle('hidden', !hasAnimal);
    if (hasAnimal) {
      Animals.installSprite();
      chatPeerAvatar.innerHTML = Animals.icon(animalId, 26);
    } else {
      chatPeerAvatar.innerHTML = '';
    }
  }
  syncChatEmpty();
}

// --- The empty chat -------------------------------------------------------
// A blank panel is the worst thing to open: it says nothing about who is on
// the other end and gives you no reason to type. This one names them, shows
// their animal, and hands over four openers that send on tap.
// Looked up on demand rather than held in a const: addChatMessage and
// clearChat both reach for this block, and either can run before this point in
// the file has executed.
function setChatEmptyVisible(show) {
  const box = document.getElementById('chatEmpty');
  if (!box) return;
  box.classList.toggle('hidden', !show);
  // The placeholder and the message list are both flex:1 siblings, so the
  // empty list has to be taken out of the flow or it keeps half the panel and
  // pushes the placeholder off centre. A class rather than :has(), which the
  // older Android WebViews a lot of this traffic arrives on do not support.
  if (box.parentNode) box.parentNode.classList.toggle('is-empty', show);
}

function syncChatEmpty() {
  const box = document.getElementById('chatEmpty');
  if (!box) return;
  // Only ever stands in for messages that are not there yet.
  if (chatMessages.querySelector('.chat-msg')) { setChatEmptyVisible(false); return; }
  const name = (currentPartner && currentPartner.username) || '';
  document.getElementById('chatEmptyTitle').textContent = name
    ? t('chatEmptyTitle', { name })
    : t('noMessagesYet');
  const avatar = document.getElementById('chatEmptyAvatar');
  const animalId = currentPartner && currentPartner.animal;
  if (animalId && typeof Animals !== 'undefined' && Animals.has(animalId)) {
    Animals.installSprite();
    avatar.innerHTML = Animals.icon(animalId, 54);
    avatar.classList.remove('hidden');
  } else {
    avatar.innerHTML = '';
    avatar.classList.add('hidden');
  }
  // Openers only make sense while there is somebody to send them to.
  document.getElementById('chatEmptyChips').classList.toggle('hidden', !currentPartner);
  setChatEmptyVisible(true);
}

document.getElementById('chatEmptyChips').addEventListener('click', (e) => {
  const chip = e.target.closest('.chat-ice-chip');
  if (!chip) return;
  const text = t(chip.dataset.ice);
  // Through the same path a typed message takes, so a starter carries the same
  // id, reply state, sound and delivery ticks as anything else.
  if (strangerExtras) strangerExtras.compose(text);
  else sendStrangerChat(text);
});

// Put the caret in the box the person is about to type in when a panel with a
// composer opens. Deferred a frame because these panels animate in from
// visibility:hidden and a hidden element cannot take focus, and skipped on
// touch: there the only effect is the on-screen keyboard popping up over the
// messages, forcing the user to dismiss it just to read.
function focusComposer(el) {
  if (!el || el.disabled) return;
  if (window.matchMedia && !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (el.disabled) return;
    try { el.focus({ preventScroll: true }); } catch (err) { el.focus(); }
  }));
}

// --- Chat panel: slides in from the right; swipe right to close. ---
function openChatPanel() {
  chatOpen = true;
  chatPanel.classList.add('open');
  chatOverlay.classList.remove('hidden');
  setChatUnread(0);
  focusComposer(chatInput);
  scrollChatToBottom();
  if (typeof syncChatViewport === 'function') syncChatViewport();
  updateScrollLock();
}

function closeChatPanel() {
  chatOpen = false;
  chatPanel.classList.remove('open');
  chatOverlay.classList.add('hidden');
  chatPanel.style.height = '';
  chatPanel.style.top = '';
  updateScrollLock();
}

function scrollChatToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Keep the full-screen mobile chat sheet sized to the *visual* viewport so the
// on-screen keyboard can never cover the input or the latest messages. On iOS a
// position:fixed panel otherwise stays at full window height behind the keyboard.
function syncChatViewport() {
  const vv = window.visualViewport;
  if (!chatOpen || !vv || window.innerWidth > 767) {
    chatPanel.style.height = '';
    chatPanel.style.top = '';
    return;
  }
  chatPanel.style.height = vv.height + 'px';
  chatPanel.style.top = vv.offsetTop + 'px';
  scrollChatToBottom();
}
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', syncChatViewport);
  window.visualViewport.addEventListener('scroll', syncChatViewport);
}
// When the user taps the input, wait for the keyboard, then keep the newest
// messages in view.
chatInput.addEventListener('focus', () => {
  setTimeout(() => { syncChatViewport(); scrollChatToBottom(); }, 250);
});
chatInput.addEventListener('blur', () => {
  setTimeout(syncChatViewport, 100);
});

chatToggleBtn.addEventListener('click', () => {
  if (chatOpen) closeChatPanel();
  else openChatPanel();
});
closeChatBtn.addEventListener('click', closeChatPanel);
chatOverlay.addEventListener('click', () => { if (Date.now() < swipeSuppressUntil) return; closeChatPanel(); });

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

// --- Edge swipes on the call screen: swipe left → open chat (slides in from
// the right), swipe right → open settings (slides in from the left). Decided at
// touchend from start/end deltas with passive listeners and no preventDefault,
// so vertical scrolling is never interfered with. ---
let swipeStartX = null;
let swipeStartY = null;
let swipeStartT = 0;
// A short window after an edge-swipe during which overlay clicks are ignored, so
// the post-touch ghost click can't immediately re-close the panel we just opened.
let swipeSuppressUntil = 0;
function panelsAreClosed() {
  return !chatOpen
    && !appSettingsPanel.classList.contains('open')
    && !filtersPanel.classList.contains('open')
    && !friendsDropdown.classList.contains('open')
    && !friendProfileModal.classList.contains('open')
    && !friendChatModal.classList.contains('open')
    && gameOverlay.classList.contains('hidden')
    && !document.querySelector('.modal-overlay:not(.hidden)')
    && !document.querySelector('.notif-dropdown:not(.hidden)');
}
document.addEventListener('touchstart', (e) => {
  if (e.touches.length !== 1) { swipeStartX = null; return; }
  // Only active on the call screen (where the chat/settings buttons live) and
  // when nothing else is open, so it never fights another gesture.
  if (!stageEl.classList.contains('call-live') || !panelsAreClosed()) { swipeStartX = null; return; }
  swipeStartX = e.touches[0].clientX;
  swipeStartY = e.touches[0].clientY;
  swipeStartT = Date.now();
}, { passive: true });
document.addEventListener('touchend', (e) => {
  if (swipeStartX === null) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - swipeStartX;
  const dy = t.clientY - swipeStartY;
  const dt = Date.now() - swipeStartT;
  swipeStartX = null;
  // A deliberate, mostly-horizontal, reasonably quick flick.
  if (dt > 700) return;
  if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
  if (!panelsAreClosed()) return;
  // Suppress the ghost click the browser fires ~300ms after touchend at the
  // release point - without this it lands on the freshly-opened panel's overlay
  // and immediately closes it again.
  if (dx < 0) {
    if (!chatToggleBtn.classList.contains('hidden')) { swipeSuppressUntil = Date.now() + 700; openChatPanel(); }
  } else {
    if (!appSettingsBtn.classList.contains('hidden')) { swipeSuppressUntil = Date.now() + 700; openAppSettings(); }
  }
}, { passive: true });

// --- Periodic "come play" nudge: while on a live call and the game isn't
// open, wiggle the game button every 20-30s to invite the user to play. ---
let gameNudgeTimer = null;
function scheduleGameNudge() {
  clearTimeout(gameNudgeTimer);
  const delay = 20000 + Math.random() * 10000; // 20-30s
  gameNudgeTimer = setTimeout(() => {
    const overlayOpen = !gameOverlay.classList.contains('hidden');
    // Don't nudge if the game's open, or an "it's your move" badge already shows.
    if (callState === 'connected' && !overlayOpen && !gameBtn.disabled
        && !gameBtnBadge.classList.contains('is-move')) {
      gameBtn.classList.remove('game-nudge');
      void gameBtn.offsetWidth;
      gameBtn.classList.add('game-nudge');
      setTimeout(() => gameBtn.classList.remove('game-nudge'), 1200);
    }
    scheduleGameNudge();
  }, delay);
}
function stopGameNudge() {
  clearTimeout(gameNudgeTimer);
  gameNudgeTimer = null;
  gameBtn.classList.remove('game-nudge');
}

// =====================================================================
// Mini-games (Tic Tac Toe, Dots & Boxes) with whoever you're on a call with.
// The games themselves live in games.js, shared with the /chat page; this is
// only the wiring - which socket, who hosts, and how the call screen sounds.
// The host is the call initiator, so exactly one side builds the board.
// =====================================================================
const gameBtnBadge = document.getElementById('gameBtnBadge');
const gameOverlay = document.getElementById('gameOverlay');

let amCallInitiator = false;

const GAME_SOUNDS = {
  move: playMoveSound,
  turn: playTurnSound,
  win: playWinSound,
  lose: playHangupSound,
  invite: playInviteSound,
};

const games = window.TalkLiveGames ? window.TalkLiveGames.attach({
  socket,
  gameBtn,
  isConnected: () => callState === 'connected',
  isHost: () => amCallInitiator,
  partnerName: () => (currentPartner ? currentPartner.username : ''),
  myName: () => (myProfile && myProfile.username ? myProfile.username : ''),
  vibrate,
  openModal,
  closeModal,
  sound: (kind) => { const fn = GAME_SOUNDS[kind]; if (fn) fn(); },
}) : null;

// Thin wrappers so the rest of app.js reads the same as it did before the
// games moved into their own file.
function resetGame() { if (games) games.reset(); }
function markGamePartnerGone() { if (games) games.partnerGone(); }
function attemptCloseGame() { return games ? games.attemptClose() : true; }
function gameIsInProgress() { return !!games && (games.isPlaying() || games.isNegotiating()); }


// Shared send path for both the in-call side panel and the /chat page.
// Blocks links (mirrors the server) and clearly unsafe content before it
// ever leaves the device.
function sendStrangerChat(text, meta) {
  const gif = meta && meta.gif;
  if (!text && !gif) return false;
  if (text && messageHasLink(text)) {
    addChatMessage(t('errNoLinks'), 'system');
    return false;
  }
  if (text && messageIsUnsafe(text)) {
    addChatMessage(t('errUnsafeMessage'), 'system');
    return false;
  }
  const el = addChatMessage(text, 'me', meta);
  playSendSound();
  vibrate(15);
  socket.emit('chat-message', {
    text,
    id: meta ? meta.id : null,
    replyTo: meta ? meta.replyTo : null,
    gif: gif || null,
  });
  // Optimistic WhatsApp-style delivery: mark "sent" on the next tick once the
  // message has left the client (the relay is fire-and-forget server-side).
  const ticks = el.querySelector('.chat-msg-ticks');
  if (ticks) setTimeout(() => ticks.classList.replace('sending', 'sent'), 220);
  return true;
}

// Emoji picker, Giphy GIFs, reply-to and reactions for the in-call stranger
// panel. Everything it owns is built the first time it is opened, so a caller
// who never taps the buttons pays for two of them and nothing else.
strangerExtras = window.TalkLiveChatExtras ? window.TalkLiveChatExtras.attach({
  form: chatForm,
  input: chatInput,
  messages: chatMessages,
  msgSelector: '.chat-msg',
  send: (payload) => sendStrangerChat(payload.text || '', payload),
  react: (id, emoji, on) => socket.emit('chat-reaction', { id, emoji, on }),
}) : null;

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  const sent = strangerExtras ? strangerExtras.compose(text) : sendStrangerChat(text);
  if (sent === false) return;
  chatInput.value = '';
  chatInput.focus();
});

socket.on('chat-reaction', ({ id, emoji, on } = {}) => {
  if (strangerExtras) strangerExtras.remoteReaction(id, emoji, on);
});

// Server-side link filter rejected a message we let through - surface it.
socket.on('chat-blocked', ({ reason } = {}) => {
  const target = friendChatModal.classList.contains('open') ? friendChatMessages : chatMessages;
  const el = document.createElement('div');
  el.className = 'chat-msg system';
  el.textContent = reason === 'call-required' ? t('errCallRequiredToChat')
    : reason === 'unsafe' ? t('errUnsafeMessage') : t('errNoLinks');
  target.appendChild(el);
  target.scrollTop = target.scrollHeight;
  if (reason === 'call-required') applyFriendChatLock();
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

// --- Reusable confirm dialog ---
const confirmModal = document.getElementById('confirmModal');
const confirmModalTitle = document.getElementById('confirmModalTitle');
const confirmModalText = document.getElementById('confirmModalText');
const confirmOkBtn = document.getElementById('confirmOkBtn');
const confirmCancelBtn = document.getElementById('confirmCancelBtn');
let confirmOnOk = null;
function showConfirm({ title, text, textVars, okKey, cancelKey, okClass }) {
  confirmModalTitle.textContent = t(title);
  confirmModalText.textContent = t(text, textVars);
  confirmOkBtn.textContent = t(okKey);
  confirmCancelBtn.textContent = t(cancelKey || 'cancel');
  confirmOkBtn.className = 'btn ' + (okClass || 'btn-danger');
  openModal(confirmModal);
  return new Promise((resolve) => { confirmOnOk = resolve; });
}
confirmOkBtn.addEventListener('click', () => { closeModal(confirmModal); if (confirmOnOk) { confirmOnOk(true); confirmOnOk = null; } });
confirmCancelBtn.addEventListener('click', () => { closeModal(confirmModal); if (confirmOnOk) { confirmOnOk(false); confirmOnOk = null; } });
confirmModal.addEventListener('click', (e) => {
  if (e.target === confirmModal) { closeModal(confirmModal); if (confirmOnOk) { confirmOnOk(false); confirmOnOk = null; } }
});

// --- Mobile back button: close the topmost open layer instead of exiting the
// app; confirm before ending a live call. Uses a single re-armed history guard
// so every back press while something is open (or a call is live) is caught. ---
function closeTopmostLayer() {
  // A visible generic modal (report, feedback, account, terms, confirm, game-end…)
  const openModalEl = Array.from(document.querySelectorAll('.modal-overlay:not(.hidden)')).pop();
  if (openModalEl) {
    if (openModalEl === confirmModal && confirmOnOk) { confirmOnOk(false); confirmOnOk = null; }
    closeModal(openModalEl);
    return true;
  }
  if (!gameOverlay.classList.contains('hidden')) { attemptCloseGame(); return true; }
  if (chatOpen) { closeChatPanel(); return true; }
  if (appSettingsPanel.classList.contains('open')) { closeAppSettings(); return true; }
  if (filtersPanel.classList.contains('open')) { closeFilters(); return true; }
  if (friendChatModal.classList.contains('open')) { closeSidePanel(friendChatModal, friendChatOverlay); activeFriendChatId = null; return true; }
  if (friendProfileModal.classList.contains('open')) { closeSidePanel(friendProfileModal, friendProfileOverlay); return true; }
  if (friendsDropdown.classList.contains('open')) { closeSidePanel(friendsDropdown, friendsOverlay); return true; }
  const openDropdown = document.querySelector('.notif-dropdown:not(.hidden)');
  if (openDropdown) { openDropdown.classList.add('hidden'); return true; }
  if (!callBackBanner.classList.contains('hidden')) { callBackDeclineBtn.click(); return true; }
  return false;
}

function primeBackGuard() {
  try { history.pushState({ tlGuard: true }, ''); } catch (e) { /* history unavailable */ }
}

let endCallConfirmOpen = false;
window.addEventListener('popstate', async () => {
  // An edge swipe that just opened a panel also fires the browser's back
  // gesture; ignore that trailing popstate so it doesn't re-close the panel.
  if (Date.now() < swipeSuppressUntil) { primeBackGuard(); return; }
  if (closeTopmostLayer()) { primeBackGuard(); return; }
  // On (or entering) a call: never exit silently - confirm ending first.
  const onCall = callState === 'connected' || callState === 'connecting'
    || callState === 'reconnecting' || callState === 'searching';
  if (onCall) {
    primeBackGuard();
    if (endCallConfirmOpen) return;
    endCallConfirmOpen = true;
    const ok = await showConfirm({
      title: 'confirmEndCallTitle', text: 'confirmEndCallText',
      okKey: 'hangUp', cancelKey: 'keepTalking', okClass: 'btn-danger',
    });
    endCallConfirmOpen = false;
    if (ok) {
      socket.emit('leave');
      goIdleOnCallScreen('statusYouLeft');
    }
    return;
  }
  // Idle with nothing open - let a subsequent back actually leave the page.
});
primeBackGuard();

// Guard against an *accidental* tab close, refresh, or navigation away while the
// user is actively engaged - a live/searching call or a game in progress. The
// browser shows its native "Leave site?" prompt; we only arm it when there's
// something to lose, so idle browsing is never nagged.
let suppressUnloadWarning = false;
function reloadPage() {
  suppressUnloadWarning = true;
  location.reload();
}
window.addEventListener('beforeunload', (e) => {
  if (suppressUnloadWarning) return;
  const onCall = callState === 'connected' || callState === 'connecting'
    || callState === 'reconnecting' || callState === 'searching';
  const inGame = !!games && games.isPlaying();
  if (onCall || inGame) {
    e.preventDefault();
    e.returnValue = '';
    return '';
  }
});

// --- Socket events ---
socket.on('online-count', (count) => {
  lastOnlineCount = count;
  onlineCountEl.textContent = count;
});

socket.on('waiting', ({ estimatedSeconds, predicted } = {}) => {
  markSearchAcked();
  setState('waiting');
  setConnection('orange', 'connSearching');
  // Predicted match preview, e.g. "Connecting to someone in Japan…", based on
  // who's online right now - shown before the actual connection completes.
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
  markSearchAcked();
  // A deferred-UI callback (rule 11) is on the friends menu with a spinner -
  // now that the peer accepted, restore the icon and enter the call screen.
  restoreCallbackSpinner();
  hideCallBackBanner();
  // Switching directly from a previous call (e.g. accepting a callback while
  // already connected) - tear the old peer down first so it never leaks.
  if (pc) teardownPeer();
  if (typeof friendsDropdown !== 'undefined') closeSidePanel(friendsDropdown, friendsOverlay);
  enterCallUI();
  // Game mark (X/O) roles are fixed by who initiated the call; clear any old game.
  amCallInitiator = !!initiator;
  if (typeof resetGame === 'function') resetGame();

  // Never let a mute from a previous call silently carry into a new one.
  if (isMuted) {
    isMuted = false;
    if (localStream) localStream.getAudioTracks().forEach((t) => (t.enabled = true));
    muteBtn.classList.remove('muted');
    muteSlash.classList.add('hidden');
    orb.classList.remove('muted-self');
    socket.emit('mic-state', false);
  }

  // State: 'connecting' - a peer was found but the media path is NOT yet
  // established. Deliberately keep "You're connected" and the stranger's
  // username hidden until ontrack confirms a real connection (rule 3).
  setState('waiting');
  setCallState('connecting');
  trackGrowthEvent('call_partner_found');
  setConnection('orange', 'connConnecting');
  if (callback) setStatusText('statusCallingBack', { name: partner.username });
  else setStatusText('statusConnectingTo', { country: getCountryName(partner.countryCode) || partner.country });
  if (rematched) setSubText('subRematched');
  else setSubText(null);

  // Stash everything needed to reveal the partner once media actually flows.
  currentPartner = partner;
  currentPartnerInterests = partner.interests || [];
  partnerCard.classList.add('hidden');
  renderPartnerAnimal(null); // never let the last stranger's animal linger
  sharedInterestNote.classList.add('hidden');
  reactionBar.classList.add('hidden');

  lockSkipButton();

  // Armed before the setup, not after it - see armConnectWatchdog(). Everything
  // below can hang or throw, and this is what guarantees the user moves on.
  armConnectWatchdog();
  const generation = ++callGeneration;
  try {
    await startCall(initiator, generation);
  } catch (e) {
    // Call setup itself failed (a mic that never came back, an ICE list the
    // browser refused, an offer that could not be built). Nothing here is
    // recoverable for this match, and leaving it to the watchdog would cost the
    // user 20s of a frozen screen, so advance now - unless they already moved
    // on themselves, in which case skipping again would jump a match.
    reportClientError('startCall', e);
    if (generation === callGeneration) noteMediaFailure();
  }
});

// Populate + reveal the stranger's card only once the connection is confirmed.
function revealPartner() {
  const partner = currentPartner;
  if (!partner) return;
  addFriendBtn.classList.remove('added');
  addFriendBtn.disabled = false;
  partnerName.textContent = partner.username;
  // Country/flag only - never show anything gendered about the stranger.
  partnerMeta.innerHTML = getFlagImg(partner.countryCode);
  renderPartnerAnimal(partner.animal);

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

socket.on('banned', (info) => {
  if (info && info.until) {
    const mins = Math.max(1, Math.round((info.until - Date.now()) / 60000));
    const human = mins >= 1440 ? `${Math.round(mins / 1440)} day(s)` : mins >= 60 ? `${Math.round(mins / 60)} hour(s)` : `${mins} minute(s)`;
    showError(`${t('errBanned')} (${human} remaining)`);
    socket.io.reconnection(false); // banned: stop auto-reconnect attempts
  } else {
    showError(t('errBanned'));
  }
  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }
  resetUI();
});

socket.on('maintenance', (info) => {
  showError((info && info.message) || 'TalkLive is under maintenance. Please come back soon!');
  socket.io.reconnection(false);
  resetUI();
});

// Report client-side JS errors to the server so the owner dashboard can
// surface the bugs real users are hitting. Shared with /chat - see
// error-reporter.js for what is filtered out and why.
// install() returns its reporter so failures we catch ourselves can still reach
// the dashboard. A swallowed exception in call setup is exactly the kind of bug
// that is invisible without this: the user just sees a call that never starts.
const reportError = window.TalkLiveErrors ? window.TalkLiveErrors.install(() => socket) : null;

// --- Call back: re-connect directly with someone from Call History ---
let pendingCallBackName = null;
function showCallBackBanner(fromClientId, username) {
  pendingCallBackFrom = fromClientId;
  pendingCallBackName = username;
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

// Anti-spam: at most one call-back attempt every 10s.
const CALLBACK_COOLDOWN_MS = 10000;
let lastCallbackAt = 0;

async function requestCallBack(targetClientId, targetUsername, opts = {}) {
  if (isSearching) {
    restoreCallbackSpinner();
    showError(t('errFinishCall'));
    return;
  }
  const waitMs = CALLBACK_COOLDOWN_MS - (Date.now() - lastCallbackAt);
  if (waitMs > 0) {
    restoreCallbackSpinner();
    showToast(t('callbackCooldown', { s: Math.ceil(waitMs / 1000) }));
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
  lastCallbackAt = Date.now();
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
  clearError();
  // If already on a live call, warn that accepting will end it and switch.
  if (callState === 'connected') {
    const name = pendingCallBackName || (currentPartner && currentPartner.username) || t('you');
    const ok = await showConfirm({
      title: 'callSwitchTitle', text: 'callSwitchText', textVars: { name },
      okKey: 'callSwitchConfirm', cancelKey: 'keepTalking', okClass: 'btn-danger',
    });
    if (!ok) { socket.emit('call-back-respond', { fromClientId, accept: false }); return; }
  }
  try {
    await getMic();
  } catch (e) {
    socket.emit('call-back-respond', { fromClientId, accept: false });
    showError(t('errMicAccept'));
    return;
  }

  // Drop whatever we were doing (a live call, or an in-progress search) so we
  // can connect to the incoming caller instantly - even mid-search.
  if (callState === 'connected' || isSearching) {
    socket.emit('leave');
    teardownPeer();
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
  // Deferred (friends-list) callback: keep the friends panel up. On "offline"
  // we grey the button + offer "send request for later"; other failures just
  // restore the green icon. We never resetUI() here, so the user isn't yanked
  // back to the "tap to talk" landing screen.
  if (activeCallbackSpinner) {
    const clientId = activeCallbackSpinner.btn.dataset.id;
    isSearching = false;
    if (localStream) {
      localStream.getTracks().forEach((tr) => tr.stop());
      localStream = null;
    }
    restoreCallbackSpinner();
    if (reason === 'offline') {
      markFriendCallOffline(clientId);
      showToast(t('friendWentOffline'));
    } else if (reason === 'calls-off') {
      showToast(t('friendCallsOff'));
    } else if (reason === 'blocked') {
      showError(t('errBlocked'));
    } else {
      showError(t('errCallbackFailed'));
    }
    return;
  }
  abandonCallBack();
  if (reason === 'offline') showError(t('errOffline'));
  else if (reason === 'calls-off') showError(t('friendCallsOff'));
  else if (reason === 'busy') showError(t('errBusy'));
  else if (reason === 'blocked') showError(t('errBlocked'));
  else showError(t('errCallbackFailed'));
});

socket.on('call-back-later-result', ({ ok, reason, targetClientId }) => {
  if (ok) return;
  const chip = targetClientId && friendsList.querySelector(`.friend-call-later-btn[data-id="${CSS.escape(targetClientId)}"]`);
  if (chip) {
    chip.textContent = t('sendRequestLater');
    chip.classList.remove('sent');
    chip.disabled = false;
  }
  showError(reason === 'blocked' ? t('errBlocked')
    : reason === 'calls-off' ? t('friendCallsOff')
    : t('errCallbackFailed'));
});

socket.on('call-back-declined', ({ username }) => {
  abandonCallBack();
  showError(t('errDeclined', { name: username }));
});

socket.on('signal', (data) => {
  handleSignal(data);
});

socket.on('partner-left', (info) => {
  // Their connection dropped rather than them leaving: say so, by name, and
  // leave the door open instead of declaring the call over.
  const dropped = !!(info && info.reason === 'disconnected') && mediaConnected;
  if (dropped) showPeerGone(info.username || (currentPartner && currentPartner.username));
  // Two very different endings arrive on this event, and treating them alike is
  // why people reported being "disconnected without ever getting connected":
  // the stranger hanging up mid-conversation, and a pairing whose media never
  // came up at all (the other side's connect watchdog fired first, so it moved
  // on before either of us heard anything). The second is not someone ending a
  // call on you - there was no call - so it must not show "your friend ended
  // the call" and must not drop the user out of their search. Read before
  // teardownPeer(), which clears mediaConnected.
  const neverConnected = (info && info.reason === 'failed') || !mediaConnected;
  // A hang-up tone for a call that never had any audio just reads as a bug.
  if (!neverConnected) playHangupSound();
  const wasInGame = gameIsInProgress();
  teardownPeer();
  clearChat();
  // If a game was open, surface it there too (grayscale + red banner handled by
  // markGamePartnerGone) before resetting.
  if (wasInGame && typeof markGamePartnerGone === 'function') markGamePartnerGone();
  else if (typeof resetGame === 'function') resetGame();
  if (!isSearching) return;
  // The pairing never produced a call. The user is still mid-search as far as
  // they are concerned, so carry the search straight on to the next person -
  // regardless of the auto-connect setting, which is about what happens after a
  // conversation ends, not about abandoning a search that never started.
  if (neverConnected) {
    setCallState('searching');
    setState('waiting');
    setConnection('orange', 'connSearching');
    setStatusText('statusFindingNew');
    setSubText('subHangTight');
    emitFindPartner();
    return;
  }
  // The partner ended the call. Show the single red "your friend ended the call"
  // message. Only keep hunting for a new person if auto-connect is on; otherwise
  // stop on the red message so the user isn't yanked into a new search.
  const endedKey = dropped ? 'statusPartnerDropped' : 'statusFriendEnded';
  const connKey = dropped ? 'connPartnerDropped' : 'connFriendEnded';
  if (autoCallEnabled) {
    setCallState('searching');
    setState('waiting');
    setConnection('red', connKey);
    setStatusText(endedKey);
    setSubText(null);
    emitFindPartner();
    setTimeout(() => { if (isSearching && callState === 'searching') setConnection('orange', 'connSearching'); }, 900);
  } else {
    isSearching = false;
    socket.emit('leave');
    setCallState('idle');
    setState('idle');
    setConnection('red', connKey);
    setStatusText(endedKey);
    setSubText(null);
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

socket.on('chat-message', ({ text, id, replyTo, gif, ts } = {}) => {
  if (!text && !gif) return;
  addChatMessage(text || '', 'them', { id, replyTo, gif, ts });
  playMessageSound();
  vibrate(20);
  if (!chatOpen) {
    // Red numeric badge: "1" for the first unread, the running total after.
    setChatUnread(chatUnread + 1);
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

// Search watchdog. Deliberately does NOT re-send an acknowledged search:
// 'find-partner' resets the server's random-match fallback, so re-asserting a
// healthy search would keep pushing the fallback out of reach and make matching
// worse, not better. It only fires for a search the server never answered.
setInterval(() => {
  if (!searchAcked && isSearching && callState === 'searching' && socket.connected) {
    emitFindPartner();
  }
}, 4000);

socket.on('connect', () => {
  socketConnected = true;
  refreshNetStatus();
  clearError();
  if (isSearching) setConnection('orange', 'connReconnecting');
  // Re-register on every (re)connect so the server always has a live socket
  // for this clientId, and so friends/notifications resync after being offline.
  if (lastRegisterPayload) socket.emit('register', lastRegisterPayload);
  // Silently re-authenticate with the durable session token so the account
  // survives page reloads, dropped sockets and server deploys.
  if (sessionToken) socket.emit('resume-session', { token: sessionToken });
  // Mobile browsers drop the socket when backgrounded or when the screen goes
  // off, and a deploy drops every socket at once. The server queue is keyed by
  // socket id, so the old search died with the old socket: without re-entering
  // the queue here the user waits forever on a search the server has never
  // heard of. This used to be gated on auto-connect being on, which is off by
  // default - so most people who lost a socket mid-search simply never matched
  // again. It is not an auto-connect feature: it resumes a search the user
  // started themselves and has not cancelled.
  //
  // Clearing the ack is what actually restarts the search: the watchdog above
  // re-sends 'find-partner' a moment later, by which time the 'register' just
  // emitted has landed and the new socket has a profile to search with.
  if (isSearching && callState !== 'connected') searchAcked = false;
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
  syncChatHeader();

  renderNotifications(); // also re-renders the friends list + badges
  renderHistory();
  includeCountryWidget.renderChips();
  excludeCountryWidget.renderChips();
  renderInterestTags();
  refreshAnimalLabels();
  if (currentPartner && !partnerCard.classList.contains('hidden')) renderPartnerAnimal(currentPartner.animal);

  if (activeFriendChatId) {
    const friend = friendsData.find((f) => f.clientId === activeFriendChatId);
    friendChatTitle.textContent = friend ? t('chatWith', { name: friendLabel(friend) }) : t('chat');
    renderFriendChatMessages();
  }
});

// A direct load of /call (bookmark, refresh, share) has no live session to
// resume - send the URL back to the landing page without adding a history
// entry, so the back button still behaves normally. An invite link is the one
// exception: it's a legitimate fresh entry point, so keep it on /call.
if (location.pathname === '/call' && !pendingInviteToken) {
  history.replaceState(history.state, '', '/');
} else if (pendingInviteToken) {
  history.replaceState(history.state, '', '/call');
}

// Deep link from the SEO landing pages: /?mode=chat sends the visitor straight
// to the dedicated text-chat app.
try {
  const params = new URLSearchParams(location.search);
  if (params.get('mode') === 'chat') {
    location.replace('/chat');
  }
  // Where a push notification and the manifest's Friends shortcut both land.
  // Without this the notification opens the app but not the message that
  // prompted it, which is the whole reason the person tapped.
  if (params.get('open') === 'friends') {
    openSidePanel(friendsDropdown, friendsOverlay);
    history.replaceState(history.state, '', '/');
  }
  // The account screens live here, so /chat's Settings rows link to them
  // rather than the chat app carrying its own copy of the account stack.
  const open = params.get('open');
  if (open === 'account') {
    openAccountModal(params.get('tab') === 'login' ? 'login' : 'signup');
    history.replaceState(history.state, '', '/');
  } else if (open === 'shop') {
    openShop();
    history.replaceState(history.state, '', '/');
  } else if (open === 'billing') {
    openBilling();
    history.replaceState(history.state, '', '/');
  } else if (open === 'feedback' && feedbackModal) {
    if (feedbackInput) feedbackInput.value = '';
    openModal(feedbackModal);
    history.replaceState(history.state, '', '/');
  }
} catch (e) { /* very old browser without URLSearchParams - ignore */ }

// Initial state: the Tap-to-Talk landing, a green idle Call button ready for
// when the call screen opens, and an unchecked auto-call checkbox.
autoCallCheckbox.checked = autoCallEnabled;
renderAcceptCalls();
renderSettingsProfileRow();
setCallState('idle');
setState('idle');
setStatusText('statusIdle');
setSubText('subIdle');
refreshNetStatus();

// --- Premium (TalkLive Plus) -------------------------------------------------
// Free-tier limits arrive from the server with every register; premium users
// (who upgrade via /pricing) get everything unlocked. The server enforces
// all limits - this state only drives the UI.
let isPremiumUser = false;
let freeLimits = { countries: 2, friends: 5 };

socket.on('premium-status', ({ premium, limits } = {}) => {
  isPremiumUser = !!premium;
  if (limits) {
    freeLimits = {
      countries: limits.countries || 2,
      friends: limits.friends || 5,
    };
  }
  updatePremiumUi();
});

function updatePremiumUi() {
  // "👑 Premium" locks/hints show only on the free tier.
  document.querySelectorAll('.premium-lock').forEach((el) => el.classList.toggle('hidden', isPremiumUser));
}
updatePremiumUi();

// Custom in-app dialog (reuses the shared confirm modal) instead of the
// browser's native confirm() popup.
async function showPremiumUpsell(message) {
  confirmModalTitle.textContent = t('premiumUpsellTitle');
  confirmModalText.textContent = message + ' ' + t('premiumComingSoon');
  confirmOkBtn.textContent = t('premiumUpsellGo');
  confirmCancelBtn.textContent = t('cancel');
  confirmOkBtn.className = 'btn btn-save';
  openModal(confirmModal);
  const ok = await new Promise((resolve) => { confirmOnOk = resolve; });
  if (ok) {
    trackGrowthEvent('premium_upsell_click');
    location.href = '/pricing?utm_source=app&utm_medium=upsell&utm_campaign=premium';
  }
}

// Gender preference is premium-only. Intercept taps on Male/Female in the
// capture phase so the pill never flips for free users.
prefGenderGroup.addEventListener('click', (e) => {
  const pill = e.target.closest('.pill');
  if (!pill || isPremiumUser || pill.dataset.value === 'any') return;
  e.stopPropagation();
  e.preventDefault();
  showPremiumUpsell(t('premiumGenderLocked'));
}, true);

// Friend-limit errors from the normal in-call "Add friend" flow.
socket.on('friend-request-result', ({ ok, limitReached } = {}) => {
  if (!ok && limitReached) {
    addFriendBtn.classList.remove('added');
    addFriendBtn.disabled = false;
    showPremiumUpsell(t('premiumFriendLimit', { n: freeLimits.friends }));
  }
});

// --- "James from UK is online" - friend came online notification -------------
socket.on('friend-online', ({ username, countryCode, country } = {}) => {
  const where = getCountryName(countryCode) || country || '';
  showToast(where ? t('friendOnlineToast', { name: username, country: where }) : t('friendOnlineToastNoCountry', { name: username }));
  vibrate([30, 40, 30]);
});

// --- Daily featured blog article: rotates once every 24 hours so the SEO
// section below the app always has a fresh, highlighted read. Deterministic
// on the day-of-year so it's the same pick for everyone on a given day. ---
(function initDailyArticle() {
  const card = document.getElementById('dailyArticleCard');
  const titleEl = document.getElementById('dailyArticleTitle');
  const blurbEl = document.getElementById('dailyArticleBlurb');
  if (!card || !titleEl || !blurbEl) return;

  const ARTICLES = [
    { slug: 'science-of-talking-to-strangers', title: 'The Science of Talking to Strangers (And Why It Makes You Happier)', blurb: 'Research keeps finding the same thing: conversations with strangers boost mood and reduce loneliness.' },
    { slug: 'psychological-benefits-of-talking-to-strangers', title: 'The Psychological Benefits of Talking to Strangers Every Day', blurb: 'How a daily voice chat can lift your mood, ease loneliness, and build real confidence over time.' },
    { slug: 'how-to-start-a-conversation-with-a-stranger', title: 'How to Start a Conversation With a Stranger: 25 Openers That Actually Work', blurb: 'Never freeze at "hello" again - openers, follow-ups and graceful exits that work.' },
    { slug: 'is-talklive-safe', title: 'Is TalkLive Safe? How Our Anonymous Voice Chat Actually Works', blurb: 'A transparent look at what we can see, what we cannot, and how bad actors are handled.' },
    { slug: 'voice-chat-vs-video-chat', title: 'Voice Chat vs Video Chat: Why Audio-Only Wins for Meeting Strangers', blurb: 'Why removing the camera makes stranger chat safer, deeper and less awkward.' },
    { slug: 'practice-english-speaking-online-free', title: 'How to Practice Speaking English Online for Free - With Real Humans', blurb: 'A free 30-day speaking routine using live conversation instead of flashcards.' },
    { slug: 'best-omegle-alternatives', title: 'The 10 Best Omegle Alternatives in 2026', blurb: 'What actually matters in a stranger-chat app in 2026, and how the options compare.' },
  ];

  const dayNumber = Math.floor(Date.now() / 86400000); // whole days since epoch, changes every 24h UTC
  const pick = ARTICLES[dayNumber % ARTICLES.length];

  card.href = `/blog/${pick.slug}`;
  titleEl.textContent = pick.title;
  blurbEl.textContent = pick.blurb;
})();

