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
const visitorCountEl = document.getElementById('visitorCount');
const brandLiveEl = document.getElementById('brandLive');
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

// Call history. Same button in the header rail, but it opens the same
// right-hand side panel every other list in the app uses. It used to be a
// floating dropdown, which needed its own outside-click handling and its own
// mobile repositioning, and gave the app two shapes for "a list of people".
const historyPanel = document.getElementById('historyPanel');
const historyOverlay = document.getElementById('historyOverlay');
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
const friendProfileCancelBtn = document.getElementById('friendProfileCancelBtn');
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
//
// Both of these refresh the page's scroll lock themselves. They used to leave
// it to the caller, and most callers forgot: closing the friend chat - by its
// X, by the overlay, or with the phone's Back button - left `panel-open` on
// the body, which is `overflow: hidden; touch-action: none`. The panel was
// gone and the landing page underneath it could no longer be scrolled or
// tapped, with nothing on screen to explain why and nothing but a reload to
// clear it. The lock is now derived from what is actually open, in one place,
// every time anything opens or closes.
function openSidePanel(panel, overlay) {
  panel.classList.add('open');
  overlay.classList.remove('hidden');
  updateScrollLock();
}
function closeSidePanel(panel, overlay) {
  panel.classList.remove('open');
  overlay.classList.add('hidden');
  updateScrollLock();
}

const callBackBanner = document.getElementById('callBackBanner');
const callBackBannerText = document.getElementById('callBackBannerText');
const callBackAcceptBtn = document.getElementById('callBackAcceptBtn');
const callBackDeclineBtn = document.getElementById('callBackDeclineBtn');

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
// Settings is a screen now, not a side panel, so there is no overlay and no
// swipe-to-dismiss: you leave it with Back, or with the browser's own back.
const settingsPage = document.getElementById('settingsPage');
const settingsBackBtn = document.getElementById('settingsBackBtn');
const settingsNav = document.getElementById('settingsNav');
const themeGroup = document.getElementById('themeGroup');
const soundToggle = document.getElementById('soundToggle');
const vibrationToggle = document.getElementById('vibrationToggle');
const statusVisibilityToggle = document.getElementById('statusVisibilityToggle');
const messageSeenToggle = document.getElementById('messageSeenToggle');
const sidePanelAuth = document.getElementById('sidePanelAuth');
const sidePanelSignInBtn = document.getElementById('sidePanelSignInBtn');
const sidePanelRegisterBtn = document.getElementById('sidePanelRegisterBtn');
const avatarGrid = document.getElementById('avatarGrid');
const saveAvatarBtn = document.getElementById('saveAvatarBtn');

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
  // alt="" and a hard-failed image is removed, not left as a broken icon with
  // the country's name spilling out of it. flagcdn is a third party, and the
  // networks TalkLive is most used on are exactly the ones that block third
  // parties - so "the flag did not load" has to degrade to no flag at all
  // rather than to a row of alt text shoving every label out of line. The
  // country is already written next to every flag in this app, so nothing is
  // lost when one goes missing.
  return `<img class="flag-icon" src="https://flagcdn.com/24x18/${cc}.png" srcset="https://flagcdn.com/48x36/${cc}.png 2x" width="${size}" height="${Math.round(size * 0.75)}" loading="lazy" decoding="async" alt="" onerror="this.remove()" />`;
}

// --- Avatars: 5 male + 5 female inline-SVG busts. Shown only to yourself
// (left panel) and to your friends (friends list / profile) - never to the
// stranger during a call, so nothing about it can reveal anyone's gender. ---
// Ten gendered busts and every spirit animal. The animals were already drawn
// for the ice-breaker on the landing screen, and they are the thing people
// actually want as a picture of themselves: the busts are five skin/hair
// permutations of the same silhouette, and "which of these five identical men
// am I" is not a choice worth offering on its own.
//
// An animal avatar is stored as `a:<id>` - a prefix, so nothing that already
// parses `m`/`f` can mistake it for a gendered one, and so an unknown animal
// in storage (a rename, an older build) fails a lookup instead of rendering
// something wrong.
const ANIMAL_AVATAR_PREFIX = 'a:';
const AVATAR_IDS = {
  male: ['m1', 'm2', 'm3', 'm4', 'm5'],
  female: ['f1', 'f2', 'f3', 'f4', 'f5'],
  get animal() {
    return (window.TalkLiveAnimals ? window.TalkLiveAnimals.ids : []).map((id) => ANIMAL_AVATAR_PREFIX + id);
  },
};

function isAnimalAvatar(id) {
  return typeof id === 'string' && id.slice(0, 2) === ANIMAL_AVATAR_PREFIX;
}
function animalAvatarId(id) {
  return isAnimalAvatar(id) ? id.slice(2) : null;
}
function validAvatarId(id) {
  if (isAnimalAvatar(id)) {
    return !!(window.TalkLiveAnimals && window.TalkLiveAnimals.has(animalAvatarId(id)));
  }
  return !!AVATAR_STYLES[id];
}
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

// The one place that turns an avatar id into a picture, whichever kind it is.
// Everything that shows a person - the header button, the settings row, the
// friends list, the rail - goes through this, so adding a kind of avatar is a
// change in one function rather than in eight call sites.
function avatarFaceHtml(id, size = 36) {
  const animal = animalAvatarId(id);
  if (animal && window.TalkLiveAnimals && window.TalkLiveAnimals.has(animal)) {
    window.TalkLiveAnimals.installSprite();
    return `<span class="avatar-animal" style="width:${size}px;height:${size}px">${window.TalkLiveAnimals.icon(animal, size)}</span>`;
  }
  if (AVATAR_STYLES[id]) return avatarSvg(id, size);
  return genderIcon(id, size);
}

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
  // An animal avatar is a picture in its own right, not a gender to infer -
  // and the lists that call this are exactly where someone's chosen animal
  // should show up.
  const animal = animalAvatarId(avatarId);
  if (animal && window.TalkLiveAnimals && window.TalkLiveAnimals.has(animal)) {
    window.TalkLiveAnimals.installSprite();
    return `<span class="avatar-animal" style="width:${size}px;height:${size}px">${window.TalkLiveAnimals.icon(animal, size)}</span>`;
  }
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
if (myAvatar && !validAvatarId(myAvatar)) myAvatar = null;
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
// Auto-connect is on unless the person has turned it off. It is what turns
// one call into an evening: without it, every conversation ends on a still
// screen that has to be tapped again, and the tap is where people leave.
//
// `!== 'off'` rather than `=== 'on'` on purpose - a first visit has nothing
// stored, and the default for nothing stored is on. Turning it off is
// remembered, so a deliberate choice survives a reload; it used to be reset
// to off every single time the app opened, which meant the switch never
// stayed where anyone put it.
//
// Shared with /chat through the same key, so the setting means one thing
// across both halves of the product.
let autoCallEnabled = localStorage.getItem('talklive_autocall') !== 'off';
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
// Recent people as the server remembers them (voice and text matches alike),
// newest first: [{ clientId, username, countryCode, mode, ts, online, lastSeen, last }].
// Unlike callHistory it survives a reload, which is exactly when "who was that
// person I liked talking to" gets asked.
let serverHistory = [];
// People this user blocked, newest first: [{ clientId, username, countryCode, avatar, ts }].
let blockedData = [];
// clientId -> timeout, while that person is typing to this user.
const typingFrom = new Map();

// What to say under someone's name: live, when they were last here, or plain
// offline when they hide their status.
function presenceText(p) {
  if (!p) return '';
  if (p.online) return t('online');
  if (p.lastSeen) return t('lastSeen', { time: timeAgo(p.lastSeen) });
  return t('offline');
}

// One line of the newest message in a conversation, for list rows.
function previewText(last) {
  if (!last) return '';
  const body = last.text || (last.gif ? t('gifMessage') : '');
  return last.mine ? t('youSaid', { text: body }) : body;
}

// Keep the list rows' "last message" current between state-syncs, which the
// server only sends when something structural changes.
function noteLastMessage(clientId, last) {
  [friendsData, serverHistory].forEach((list) => {
    const row = list.find((p) => p.clientId === clientId);
    if (row) row.last = last;
  });
}

function lastFromCache(clientId) {
  const cache = friendChatCache.get(clientId);
  const m = cache && cache[cache.length - 1];
  if (!m) return null;
  return { id: m.id, mine: m.from === getClientId(), text: m.text || '', gif: !!m.gif, ts: m.ts, seen: !!m.seen };
}
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
    // Every path that changes this list ends here, so this is the one place
    // the count, the quick-picks and the summary need refreshing from - but
    // not during construction, when half of what the readout reads is still
    // in its temporal dead zone. The first render happens explicitly instead,
    // once everything it depends on exists.
    if (filtersReady) syncFilterReadout();
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

  // One place adds a country, whether it came from the search results or from
  // a quick-pick chip, so the free-tier cap and the "it cannot be in both
  // lists" rule are enforced once rather than at every call site.
  function add(code) {
    if (set.has(code)) { set.delete(code); renderChips(); return true; }
    if (!isPremiumUser && set.size >= freeLimits.countries) {
      showPremiumUpsell(t('premiumCountryLimit', { n: freeLimits.countries }));
      return false;
    }
    set.add(code);
    const other = getOther();
    if (other.set.delete(code)) other.renderChips();
    renderChips();
    return true;
  }

  return { renderChips, renderResults, add, set };
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

// --- The filters readout -----------------------------------------------------
// The panel used to ask four questions in four near-identical boxes and never
// once say what the answers added up to. People put a country in the wrong
// list and then waited for a match that could not come. These three pieces
// say it out loud: a sentence at the top, a count per list, and quick-picks
// so the common case needs no typing.

// Set once everything the readout depends on has been declared. A `var` on
// purpose: it is read by code that runs before this line, and `var` is the one
// declaration that is safely readable before its initialiser.
var filtersReady = false;

// The countries people actually reach for. Not a ranking of anything - just
// the ones that come up most in a random-chat queue, so the first tap is
// usually right there. Anything else is still one search away.
const QUICK_COUNTRIES = ['US', 'GB', 'CA', 'IN', 'PK', 'DE', 'BR', 'PH'];
const QUICK_INTERESTS = ['music', 'gaming', 'movies', 'travel', 'football', 'coding', 'books', 'anime'];

// Everything below looks its elements up on use rather than capturing them in
// consts up here. The country widgets are built ABOVE this point and render
// their chips as they are constructed, and that first render calls straight
// into syncFilterReadout() - so anything declared here with const or let is
// still in its temporal dead zone when it is read, and reading it throws and
// takes the rest of app.js down with it.

function countryListSentence(set) {
  const names = Array.from(set).map(getCountryName);
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return t('joinTwo', { a: names[0], b: names[1] });
  return t('joinMore', { first: names.slice(0, -1).join(', '), last: names[names.length - 1] });
}

// Reads back the draft - what is on screen right now, not what was last
// saved - because the point of it is to check your edit before you commit it.
function syncFilterReadout() {
  const filterSummaryEl = document.getElementById('filterSummary');
  if (!filterSummaryEl) return;
  const includeCountryCountEl = document.getElementById('includeCountryCount');
  const excludeCountryCountEl = document.getElementById('excludeCountryCount');

  const who = prefGenderGroup && prefGenderGroup.dataset.value === 'male' ? t('summaryMen')
    : prefGenderGroup && prefGenderGroup.dataset.value === 'female' ? t('summaryWomen')
    : t('summaryAnyone');
  const only = countryListSentence(includeCountries);
  const never = countryListSentence(excludeCountries);

  let sentence = only ? t('summaryIn', { who, where: only }) : t('summaryAnywhere', { who });
  if (never) sentence += t('summaryExcept', { where: never });
  if (selectedInterests.size > 0) {
    sentence += t('summaryInterests', { interests: Array.from(selectedInterests).join(', ') });
  }
  filterSummaryEl.textContent = sentence;

  const cap = isPremiumUser ? null : freeLimits.countries;
  const countText = (n) => (cap ? t('countOfCap', { n, cap }) : String(n));
  if (includeCountryCountEl) {
    includeCountryCountEl.textContent = includeCountries.size ? countText(includeCountries.size) : '';
    includeCountryCountEl.classList.toggle('is-full', !!cap && includeCountries.size >= cap);
  }
  if (excludeCountryCountEl) {
    excludeCountryCountEl.textContent = excludeCountries.size ? countText(excludeCountries.size) : '';
    excludeCountryCountEl.classList.toggle('is-full', !!cap && excludeCountries.size >= cap);
  }
  renderQuickPicks();
}

function renderQuickPicks() {
  const includeCountryQuickEl = document.getElementById('includeCountryQuick');
  const interestQuickEl = document.getElementById('interestQuick');
  if (includeCountryQuickEl) {
    includeCountryQuickEl.innerHTML = '';
    QUICK_COUNTRIES.filter((code) => !includeCountries.has(code)).forEach((code) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tl-quick-chip';
      btn.dataset.country = code;
      btn.innerHTML = `${getFlagImg(code, 15)} ${escapeHtml(getCountryName(code))}`;
      includeCountryQuickEl.appendChild(btn);
    });
  }
  if (interestQuickEl) {
    interestQuickEl.innerHTML = '';
    QUICK_INTERESTS.filter((i) => !selectedInterests.has(i)).forEach((interest) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tl-quick-chip';
      btn.dataset.interest = interest;
      btn.textContent = `+ ${t('interest_' + interest) === 'interest_' + interest ? interest : t('interest_' + interest)}`;
      interestQuickEl.appendChild(btn);
    });
  }
}

// Delegated from the panel, so the handlers survive every re-render of the
// chip rows without being re-attached.
if (document.getElementById('includeCountryQuick')) {
  document.getElementById('includeCountryQuick').addEventListener('click', (e) => {
    const chip = e.target.closest('.tl-quick-chip');
    if (chip) includeCountryWidget.add(chip.dataset.country);
  });
}
if (document.getElementById('interestQuick')) {
  document.getElementById('interestQuick').addEventListener('click', (e) => {
    const chip = e.target.closest('.tl-quick-chip');
    if (!chip) return;
    selectedInterests.add(chip.dataset.interest);
    renderInterestTags();
  });
}
// The first readout is deliberately NOT here. It reads isPremiumUser and
// freeLimits, which the premium-status block declares near the bottom of this
// file, so it is run from there - after everything it depends on exists.

// --- Custom interest tags (free text, no suggestions) ---
function renderInterestTags() {
  if (filtersReady) syncFilterReadout();
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
prefGenderGroup.addEventListener('click', () => syncFilterReadout());
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

// Lock the main screen's scroll whenever something is open over it, so
// scrolling only happens inside that layer - never the page behind it.
//
// This is the single source of truth for the lock, and it is derived rather
// than tracked: it asks the DOM what is open every time instead of counting
// opens and closes, because a missed decrement here does not show up as a
// scroll bug - it shows up as a landing page that has stopped responding to
// touch entirely, and the only way out of that is a reload. Anything that
// can cover the page belongs in this list.
// Looked up by id rather than through the module's own `const` bindings: this
// runs from every open and close in the file, including ones that fire while
// the script is still evaluating, and a `const` that has not been reached yet
// throws on any mention of it - `typeof` included. An id lookup cannot.
const COVERING_LAYERS = [
  ['chatPanel', 'open'],
  ['friendsDropdown', 'open'],
  ['historyPanel', 'open'],
  ['friendProfileModal', 'open'],
  ['friendChatModal', 'open'],
  ['filtersPanel', 'open'],
  ['navDrawer', '!hidden'],
  ['gameOverlay', '!hidden'],
];
function updateScrollLock() {
  const anyOpen = COVERING_LAYERS.some(([id, test]) => {
    const el = document.getElementById(id);
    if (!el) return false;
    return test === '!hidden' ? !el.classList.contains('hidden') : el.classList.contains(test);
  }) || !!document.querySelector('.modal-overlay:not(.hidden)');
  document.body.classList.toggle('panel-open', anyOpen);
}

function closeHistoryPanel() {
  closeSidePanel(historyPanel, historyOverlay);
  updateScrollLock();
}

// --- Settings, as a screen -------------------------------------------------
// It used to be a side panel: a 380px column stacked on top of the page you
// were trying to use, with the whole thing gone the moment you tapped
// outside it. Settings is not a quick action - it is somewhere you go - so
// the stage swaps the home screen out for it exactly the way a call does,
// at its own URL, in the same tab.
//
// That means the browser's Back button has to work, which is the whole reason
// this pushes a history entry rather than just toggling a class.
let settingsReturnPath = '/';

function settingsIsOpen() {
  return settingsPage && !settingsPage.classList.contains('hidden');
}

function openAppSettings(tab) {
  if (!settingsPage) return;
  // Remember where to go back to: /call if this was opened mid-call, / if not.
  if (!settingsIsOpen()) settingsReturnPath = location.pathname;
  setupPanel.classList.add('hidden');
  callPanel.classList.add('hidden');
  settingsPage.classList.remove('hidden');
  stageEl.classList.add('settings-live');
  if (typeof renderSettingsIdentity === 'function') renderSettingsIdentity();
  // An unsaved face from a previous visit is not a choice you made; the picker
  // opens showing the face you actually wear.
  if (typeof renderAvatarGrid === 'function') {
    pendingAvatar = myAvatar;
    renderAvatarGrid();
  }
  // An explicit section (the account button asking for Profile, a deep link)
  // means "take me there", so on a phone it opens that section rather than
  // the list it lives in. Opening Settings with no section in mind lands on
  // the list, which is where you choose one.
  showSettingsTab(tab || activeSettingsTab, !!tab);
  if (typeof revealSelectedAvatar === 'function') revealSelectedAvatar();
  syncNavCurrent();
  updateScrollLock();
  window.scrollTo({ top: 0 });
  if (location.pathname !== '/settings') {
    history.pushState({ settings: true }, '', '/settings');
  }
}

// `fromHistory` is set when the browser's own Back button brought us here:
// the entry is already gone, so popping another one would skip a page.
function closeAppSettings(fromHistory) {
  if (!settingsIsOpen()) return;
  // Dialogs opened from Settings belong to it; none outlives the screen.
  [accountModal, shopModal, billingModal].forEach((m) => m && closeModal(m));
  settingsPage.classList.add('hidden');
  stageEl.classList.remove('settings-live');
  // Back to whichever screen was underneath - the landing page, or the call
  // that was still running while its settings were being read.
  if (settingsReturnPath === '/call') callPanel.classList.remove('hidden');
  else setupPanel.classList.remove('hidden');
  syncNavCurrent();
  updateScrollLock();
  if (!fromHistory && location.pathname === '/settings') history.back();
}

// Five groups, one on screen at a time. A column of tabs on a desktop; on a
// phone the list itself is the screen, and picking one opens it - the pattern
// every phone settings app uses, because five screens of one thing beats one
// screen of five.
let activeSettingsTab = 'profile';

// `drill` is the difference between "this section is the current one" and
// "the user just asked to open it". On a phone those are two different
// screens, and opening Settings must land on the list - not inside whichever
// section happened to be current, with no way back to the other four.
function showSettingsTab(name, drill) {
  if (!settingsNav) return;
  const known = Array.from(settingsNav.querySelectorAll('[data-settings-tab]'))
    .map((b) => b.dataset.settingsTab);
  if (!known.includes(name)) name = known[0];
  activeSettingsTab = name;
  settingsNav.querySelectorAll('[data-settings-tab]').forEach((btn) => {
    const on = btn.dataset.settingsTab === name;
    btn.classList.toggle('selected', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  document.querySelectorAll('[data-settings-pane]').forEach((pane) => {
    pane.classList.toggle('hidden', pane.dataset.settingsPane !== name);
  });
  // On a phone the nav and the pane are two screens, not two columns.
  if (settingsPage) settingsPage.classList.toggle('is-drilled', !!drill);
}

if (settingsNav) {
  settingsNav.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-settings-tab]');
    if (btn) showSettingsTab(btn.dataset.settingsTab, true);
  });
}

appSettingsBtn.addEventListener('click', () => {
  // A second tap on Settings while it is open goes back, the way tapping the
  // current tab in a tab bar does.
  if (settingsIsOpen()) closeAppSettings();
  else openAppSettings();
});

if (settingsBackBtn) {
  settingsBackBtn.addEventListener('click', () => {
    // On a phone, Back steps out of the section first and out of Settings
    // second - two screens deep means two taps back, not one.
    if (settingsPage.classList.contains('is-drilled') && window.matchMedia('(max-width: 859px)').matches) {
      settingsPage.classList.remove('is-drilled');
      return;
    }
    closeAppSettings();
  });
}

// --- Filters side panel: who you get matched with ---
// The first time the filters open, say plainly what the gender filter matches
// on. Stays up for the rest of that visit; later visits get a clean panel.
const GENDER_NOTE_KEY = 'tl_gender_note_seen';
const genderFilterNote = document.getElementById('genderFilterNote');
let genderNoteShownThisVisit = false;

function openFilters() {
  if (genderFilterNote && !genderNoteShownThisVisit) {
    let seen = false;
    try { seen = localStorage.getItem(GENDER_NOTE_KEY) === '1'; } catch (_) {}
    if (!seen) {
      genderFilterNote.hidden = false;
      genderNoteShownThisVisit = true;
      try { localStorage.setItem(GENDER_NOTE_KEY, '1'); } catch (_) {}
    }
  }
  filtersPanel.classList.add('open');
  filtersOverlay.classList.remove('hidden');
  updateScrollLock();
}

function closeFilters() {
  filtersPanel.classList.remove('open');
  filtersOverlay.classList.add('hidden');
  updateScrollLock();
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
  // Say it out loud. The button going quiet is the state, not the receipt -
  // the friend-profile button next to it has always said "Request sent" and
  // this one left you guessing whether the tap had registered at all.
  showToast(t('friendRequestSent'));
});

// The in-call "Add friend" button reflects what is already true between the
// two of you: a friend, or someone you have asked, is not someone to ask again.
// It used to reset to "Add friend" on every match - call-backs included, which
// are mostly with friends - and tapping it sent a pointless request.
function syncAddFriendBtn() {
  const id = currentPartner && currentPartner.clientId;
  if (!id) return;
  const known = friendsData.some((f) => f.clientId === id)
    || sentRequestsData.some((r) => r.clientId === id);
  if (known) {
    addFriendBtn.classList.add('added');
    addFriendBtn.disabled = true;
  }
}

socket.on('friend-request-result', ({ ok, error, accepted, alreadyFriends }) => {
  if (!ok && error) {
    showError(error);
    // Refused (blocked, restricted, rate-limited): the button went quiet on
    // the tap, so give it back rather than leave it claiming a request exists.
    addFriendBtn.classList.remove('added');
    addFriendBtn.disabled = !(callState === 'connected');
  }
  if (ok && alreadyFriends) showToast(t('alreadyFriendsMsg'));
  // Both sides tapped "Add friend": the server turned the second request into
  // an acceptance, so say so instead of leaving a "Request sent" on screen.
  if (ok && accepted) {
    showToast(t('nowFriends'));
    playFriendAddedSound();
  }
});

// --- Public friend ID -------------------------------------------------------
// Everyone has one: an account's is permanent, a guest's lasts until the app
// is closed. Typing someone's ID finds them so they can be added without
// having met in a random match.
const myFriendIdEl = document.getElementById('myFriendId');
const myFriendIdNote = document.getElementById('myFriendIdNote');
const copyFriendIdBtn = document.getElementById('copyFriendIdBtn');
const shareFriendIdBtn = document.getElementById('shareFriendIdBtn');
const friendIdSearchForm = document.getElementById('friendIdSearchForm');
const friendIdSearchInput = document.getElementById('friendIdSearchInput');
const friendIdResult = document.getElementById('friendIdResult');
let myFriendId = '';
let friendIdFound = null;
let friendIdAddPending = false;

socket.on('friend-id', ({ friendId, temporary } = {}) => {
  if (typeof friendId !== 'string' || !friendId) return;
  myFriendId = friendId;
  myFriendIdEl.textContent = friendId;
  myFriendIdNote.classList.toggle('hidden', !temporary);
  copyFriendIdBtn.disabled = false;
  shareFriendIdBtn.disabled = false;
});

// The link opens TalkLive with this ID already looked up, one tap from
// "Add friend" - so an ID can be posted anywhere (a bio, a group chat).
shareFriendIdBtn.addEventListener('click', async () => {
  if (!myFriendId) return;
  const url = `${location.origin}/add/${encodeURIComponent(myFriendId)}`;
  const text = t('friendIdShareText', { id: myFriendId });
  if (navigator.share) {
    try {
      await navigator.share({ title: 'TalkLive', text, url });
      return;
    } catch (e) {
      if (e && e.name === 'AbortError') return; // the person closed the sheet
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    showToast(t('friendIdLinkCopied'));
  } catch (e) {
    window.prompt(t('friendIdShareText', { id: myFriendId }), url);
  }
});

// Arrived through someone's /add/<ID> link: open Friends with it looked up.
// The search needs a registered socket, so it waits for the first successful
// registration.
let pendingAddFriendId = null;
try { pendingAddFriendId = new URLSearchParams(location.search).get('add'); } catch (e) { /* old browser */ }
if (pendingAddFriendId) {
  pendingAddFriendId = pendingAddFriendId.slice(0, 16);
  history.replaceState(history.state, '', '/');
  friendIdSearchInput.value = pendingAddFriendId;
  const onRegistered = ({ ok } = {}) => {
    if (!ok) return;
    socket.off('register-result', onRegistered);
    openSidePanel(friendsDropdown, friendsOverlay);
    showFriendsTab('friends');
    socket.emit('find-by-friend-id', { friendId: pendingAddFriendId });
  };
  socket.on('register-result', onRegistered);
}

copyFriendIdBtn.addEventListener('click', async () => {
  if (!myFriendId) return;
  try {
    await navigator.clipboard.writeText(myFriendId);
    showToast(t('friendIdCopied'));
  } catch (e) {
    // No clipboard access (insecure context, denied): select it instead.
    const range = document.createRange();
    range.selectNodeContents(myFriendIdEl);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
});

friendIdSearchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const query = friendIdSearchInput.value.trim();
  if (!query) return friendIdSearchInput.focus();
  socket.emit('find-by-friend-id', { friendId: query });
});

function renderFriendIdResult() {
  const user = friendIdFound;
  if (!user) return;
  const relation = relationTo(user.clientId);
  const action = relation === 'friend'
    ? `<button type="button" class="btn btn-secondary" data-act="chat">${escapeHtml(t('chat'))}</button>`
    : relation === 'pending'
      ? `<button type="button" class="btn btn-secondary" disabled>${escapeHtml(t('pending'))}</button>`
      : `<button type="button" class="btn btn-primary" data-act="add">${escapeHtml(t('addFriend'))}</button>`;
  const sub = [user.friendId, user.temporary ? t('friendIdGuest') : '', user.online ? t('online') : '']
    .filter(Boolean).join(' · ');
  friendIdResult.classList.remove('hidden', 'is-error');
  friendIdResult.innerHTML = `${genderIcon(user.avatar, 36)}
    <span class="friend-id-result-who"><strong>${getFlagImg(user.countryCode)} ${escapeHtml(user.username)}</strong><small>${escapeHtml(sub)}</small></span>
    ${action}`;
}

socket.on('find-by-friend-id-result', ({ ok, error, user } = {}) => {
  friendIdFound = ok && user ? user : null;
  if (!friendIdFound) {
    friendIdResult.classList.remove('hidden');
    friendIdResult.classList.add('is-error');
    friendIdResult.textContent = error || '';
    return;
  }
  renderFriendIdResult();
});

friendIdResult.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn || !friendIdFound) return;
  if (btn.dataset.act === 'chat') {
    openUserProfile(personById(friendIdFound.clientId, friendIdFound));
    return;
  }
  btn.disabled = true;
  friendIdAddPending = true;
  socket.emit('friend-request', { targetClientId: friendIdFound.clientId, friendId: friendIdFound.friendId });
});

socket.on('friend-request-result', ({ ok, sent } = {}) => {
  if (!friendIdFound) return;
  if (friendIdAddPending && ok && sent) showToast(t('friendRequestSent'));
  friendIdAddPending = false;
  // The state-sync that follows updates the relation; this re-enables the
  // button when the request was refused.
  renderFriendIdResult();
});

socket.on('state-sync', () => { if (friendIdFound) renderFriendIdResult(); });

let lastFocusedBeforeModal = null;
// Long legal text is not shipped in the page. A .policy-remote[data-policy-src]
// block is filled from that standalone page the first time its dialog opens,
// so the text shown here is always the one published there. If the fetch
// fails the block keeps its link to the page, which is the same text.
function loadPolicyText(modal) {
  modal.querySelectorAll('.policy-remote[data-policy-src]').forEach((slot) => {
    if (slot.dataset.policyState) return;
    slot.dataset.policyState = 'loading';
    fetch(slot.dataset.policySrc, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((html) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const main = doc.querySelector('main');
        if (!main) throw new Error('no <main>');
        // The page's own furniture has no place inside the dialog.
        main.querySelectorAll('h1, .blog-cta, .ad-card, [data-ad], script').forEach((el) => el.remove());
        const frag = document.createDocumentFragment();
        [...main.childNodes].forEach((node) => frag.appendChild(document.importNode(node, true)));
        slot.replaceChildren(frag);
        slot.dataset.policyState = 'loaded';
      })
      .catch(() => { slot.dataset.policyState = ''; });
  });
}

function openModal(modal) {
  modal.classList.remove('hidden');
  loadPolicyText(modal);
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
  updateScrollLock();
}

function closeModal(modal) {
  const wasOpen = !modal.classList.contains('hidden');
  modal.classList.add('hidden');
  if (wasOpen && modal.classList.contains('modal-overlay') && lastFocusedBeforeModal && document.body.contains(lastFocusedBeforeModal)) {
    lastFocusedBeforeModal.focus();
    lastFocusedBeforeModal = null;
  }
  updateScrollLock();
}

openTermsLink.addEventListener('click', () => openModal(termsModal));
openTermsLinkFooter.addEventListener('click', () => openModal(termsModal));
closeTermsBtn.addEventListener('click', () => closeModal(termsModal));

[termsModal, accountModal].forEach((modal) => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal(modal);
  });
});

friendsOverlay.addEventListener('click', () => {
  closeSidePanel(friendsDropdown, friendsOverlay);
  updateScrollLock();
});
friendProfileOverlay.addEventListener('click', () => closeSidePanel(friendProfileModal, friendProfileOverlay));
friendChatOverlay.addEventListener('click', () => {
  closeSidePanel(friendChatModal, friendChatOverlay);
  activeFriendChatId = null;
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  // One press, one layer. This used to close every open thing at once, so
  // Escape out of a friend's chat also shut the friends list behind it and
  // the settings screen behind that - one keystroke and four screens of
  // navigation gone. closeTopmostLayer() is the same precedence the phone's
  // Back button uses, so the two now agree about what "back" means.
  // Declared below this handler, but only ever read here at event time.
  if (!ageConsentModal.classList.contains('hidden')) { dismissAgeConsent(); return; }
  closeTopmostLayer();
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
  renderHeaderAccountFace();
  if (headerLinkProfileBtn) {
    headerLinkProfileBtn.classList.toggle('hidden', !landing || !profileWorthLinking());
  }
}

// The button wears the avatar you actually picked - the animal, or the
// gendered bust - rather than a generic outline of a person. A face you chose
// is the only thing in that corner worth recognising at a glance.
function renderHeaderAccountFace() {
  const face = document.getElementById('headerAccountAvatar');
  const name = document.getElementById('headerAccountName');
  if (face && myAvatar) face.innerHTML = avatarFaceHtml(myAvatar, 30);
  if (name) name.textContent = accountNickname || '';
}

function renderAccountState() {
  // The dialog is two different screens, so it says which one it is. "My
  // Account" over a login form is a title for a page you do not have yet.
  const accountTitle = document.getElementById('accountModalTitle');
  if (accountTitle) accountTitle.textContent = t(accountNickname ? 'myAccount' : 'logInOrSignUp');

  if (accountNickname) {
    accountLoggedOut.classList.add('hidden');
    accountLoggedIn.classList.remove('hidden');
    accountNicknameDisplay.textContent = accountNickname;
    renderRecoveryEmailState();

    // Signed in: the account controls replace the Sign in / Register pair,
    // and the dialog (which only signs in) has nothing left to do.
    sidePanelAuth.classList.add('hidden');
    closeModal(accountModal);
  } else {
    accountLoggedOut.classList.remove('hidden');
    accountLoggedIn.classList.add('hidden');

    sidePanelAuth.classList.remove('hidden');
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
  if (myAvatar) return avatarFaceHtml(myAvatar, size);
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

// Your name is your name, account or not. This field used to grey itself out
// the moment you signed in, sending you to the Account dialog for the one thing
// the settings page is most obviously for; now it edits whichever name you
// actually have - the account nickname if you are signed in, the local one if
// you are not - and Save does the right thing either way.
// The Save name button is only enabled when the field holds a new, non-empty
// name different from what's already saved - so it greys out right after saving.
function currentDisplayName() {
  return accountNickname || tempUsername || '';
}

function syncSaveNameBtn() {
  if (!saveTempNameBtn || !tempUsernameInput) return;
  const val = tempUsernameInput.value.trim();
  saveTempNameBtn.disabled = !(val.length > 0 && val !== currentDisplayName());
}

function renderSettingsIdentity() {
  if (tempUsernameInput && document.activeElement !== tempUsernameInput) {
    tempUsernameInput.value = currentDisplayName();
    tempUsernameInput.disabled = false;
    tempUsernameInput.placeholder = t('tempUsernamePlaceholder');
  }
  syncSaveNameBtn();
}

if (tempUsernameInput) {
  tempUsernameInput.addEventListener('input', syncSaveNameBtn);
  // Enter saves, the same as tapping the button next to it.
  tempUsernameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && saveTempNameBtn && !saveTempNameBtn.disabled) {
      e.preventDefault();
      saveTempNameBtn.click();
    }
  });
}

// Set while a nickname change is in flight from this panel, so the reply lands
// as a toast here instead of a status line in the account dialog nobody opened.
let nicknameSaveFromSettings = false;

if (saveTempNameBtn) {
  saveTempNameBtn.addEventListener('click', () => {
    const val = tempUsernameInput.value.trim().slice(0, 24);
    if (!val || val === currentDisplayName()) return;
    vibrate(15);
    if (accountNickname) {
      // Signed in: the account owns the name, so the server has to agree.
      nicknameSaveFromSettings = true;
      saveTempNameBtn.disabled = true;
      socket.emit('update-nickname', { nickname: val });
      return;
    }
    tempUsername = val;
    localStorage.setItem('talklive_tempname', val);
    // Push it to the server for the current/next match.
    registerProfile();
    showToast(t('tempNameSaved'));
    renderSettingsProfileRow();
    renderLinkProfilePrompts();
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

// --- "Still under development" notice ---------------------------------------
// TalkLive is live while it is still being built, and a visitor who meets a
// rough edge with no warning reads it as a broken site rather than an
// unfinished one. So the landing screen says so itself, once per browser, and
// uses the same card to ask for the thing that fixes rough edges fastest: one
// sentence from the person who just hit one.
//
// The box posts through the same `feedback` socket event Settings uses, so
// every suggestion lands in one inbox on the owner dashboard. Bump the version
// below to show a fresh notice to everyone who already dismissed the last one.
const TL_DEV_NOTICE_VERSION = '2026-09';
const TL_DEV_NOTICE_KEY = `talklive_devnotice_${TL_DEV_NOTICE_VERSION}`;

const devNoticeOverlay = document.getElementById('devNoticeOverlay');
const devNoticeForm = document.getElementById('devNoticeForm');
const devNoticeInput = document.getElementById('devNoticeInput');
const devNoticeSend = document.getElementById('devNoticeSend');
const devNoticeSkip = document.getElementById('devNoticeSkip');
const devNoticeCloseBtn = document.getElementById('devNoticeClose');
const devNoticeStatus = document.getElementById('devNoticeStatus');

// Set once the visitor has actually been in a conversation, and called when
// they are back on the landing screen. See the note on the scheduling at the
// bottom of the block below.
let offerDevNotice = () => {};

if (devNoticeOverlay) {
  // Private browsing and blocked site data make localStorage throw on access,
  // not just return null - and a storage error is never a reason to break the
  // landing screen, so both sides are guarded and the notice simply shows.
  const devNoticeSeen = () => {
    try { return localStorage.getItem(TL_DEV_NOTICE_KEY) === '1'; } catch (_) { return false; }
  };
  const rememberDevNotice = () => {
    try { localStorage.setItem(TL_DEV_NOTICE_KEY, '1'); } catch (_) { /* nothing to do */ }
  };

  let devNoticeReturnFocus = null;

  function closeDevNotice() {
    if (devNoticeOverlay.classList.contains('hidden')) return;
    devNoticeOverlay.classList.add('hidden');
    devNoticeOverlay.hidden = true;
    rememberDevNotice();
    if (devNoticeReturnFocus && document.body.contains(devNoticeReturnFocus)) devNoticeReturnFocus.focus();
    devNoticeReturnFocus = null;
  }

  function openDevNotice() {
    // Never over a live conversation: the notice is an introduction, and a
    // card that lands mid-call is an interruption. /call deep links and a
    // reload into a call both take this path.
    if (setupPanel && setupPanel.classList.contains('hidden')) return;
    if (document.querySelector('.modal-overlay:not(.hidden)')) return;
    devNoticeReturnFocus = document.activeElement;
    devNoticeOverlay.hidden = false;
    devNoticeOverlay.classList.remove('hidden');
    // Focus the card itself rather than the close button: a screen reader
    // still lands inside the dialog and Esc still works, but a mouse visitor
    // is not met by a focus ring drawn around the one control that dismisses
    // everything they were just offered.
    const devNoticeCard = document.getElementById('devNotice');
    if (devNoticeCard) devNoticeCard.focus();
  }

  devNoticeCloseBtn.addEventListener('click', closeDevNotice);
  devNoticeSkip.addEventListener('click', closeDevNotice);
  // A click on the backdrop dismisses it; a click inside the card must not,
  // or typing a suggestion would keep closing the box it is being typed into.
  devNoticeOverlay.addEventListener('click', (e) => { if (e.target === devNoticeOverlay) closeDevNotice(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !devNoticeOverlay.classList.contains('hidden')) closeDevNotice();
  });

  devNoticeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = devNoticeInput.value.trim().slice(0, 1000);
    if (!text) {
      devNoticeStatus.className = 'tl-devnotice-status is-error';
      devNoticeStatus.textContent = t('feedbackEmpty');
      devNoticeInput.focus();
      return;
    }
    // `source` tells the operator which surface a suggestion came from; the
    // server ignores fields it does not know, so an older server still logs it.
    socket.emit('feedback', { text, source: 'dev-notice' });
    devNoticeSend.disabled = true;
    devNoticeStatus.className = 'tl-devnotice-status is-done';
    devNoticeStatus.textContent = t('devNoticeThanks');
    vibrate(20);
    // Left on screen just long enough to be read, then the card gets out of
    // the way on its own - nobody should have to dismiss a thank-you.
    setTimeout(closeDevNotice, 1200);
  });

  // It used to open 900ms after the first ever page load - so the very first
  // thing a visitor met was a card apologising for rough edges and asking
  // them to suggest improvements to a product they had not used for one
  // second. It asked the only person on the site with no answer, and it did
  // it by covering the two buttons they came for.
  //
  // It is the same card, asked of someone who now has something to say: it
  // waits for a real conversation, and then for the landing screen, so it
  // never lands over a call or over the gates on the way into one.
  offerDevNotice = () => {
    if (devNoticeSeen()) return;
    setTimeout(openDevNotice, 700);
  };
}

// Set by the first connected conversation of the session. Only somebody who
// has had one is asked what would make TalkLive better.
let hasHadAConversation = false;


// --- Avatar picker: every face and animal in one scrollable grid ---
// A tap used to be the save: the face changed everywhere before you had
// decided it was the one, and a stray tap while scrolling the grid was a new
// face for everyone who knows you. The grid now holds a pending choice and
// Save commits it - the same shape as the name field above it.
let pendingAvatar = myAvatar;

function renderAvatarGrid() {
  if (!avatarGrid) return;
  // Rebuilding empties the grid, which would throw its scroll back to the
  // top on every tap; keep the user where they were.
  const keepScroll = avatarGrid.scrollTop;
  avatarGrid.innerHTML = '';
  AVATAR_IDS.male.concat(AVATAR_IDS.female, AVATAR_IDS.animal).forEach((id) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `avatar-option${pendingAvatar === id ? ' selected' : ''}`;
    btn.dataset.avatar = id;
    const animal = animalAvatarId(id);
    btn.setAttribute('aria-label', animal && window.TalkLiveAnimals
      ? window.TalkLiveAnimals.name(animal)
      : t('avatar'));
    btn.innerHTML = avatarFaceHtml(id, 52)
      + (animal ? `<span class="avatar-option-name">${escapeHtml(window.TalkLiveAnimals.name(animal))}</span>` : '');
    avatarGrid.appendChild(btn);
  });
  avatarGrid.scrollTop = keepScroll;
  syncSaveAvatarBtn();
}

// Opening the picker scrolls your current face into view inside the grid.
function revealSelectedAvatar() {
  if (!avatarGrid) return;
  const sel = avatarGrid.querySelector('.avatar-option.selected');
  avatarGrid.scrollTop = sel ? Math.max(0, sel.offsetTop - 8) : 0;
}

function syncSaveAvatarBtn() {
  if (!saveAvatarBtn) return;
  saveAvatarBtn.disabled = !pendingAvatar || pendingAvatar === myAvatar;
}

avatarGrid.addEventListener('click', (e) => {
  const option = e.target.closest('.avatar-option');
  if (!option) return;
  pendingAvatar = option.dataset.avatar;
  renderAvatarGrid();          // move the tick to the one just picked
  syncSaveAvatarBtn();
  vibrate(8);
});

if (saveAvatarBtn) {
  saveAvatarBtn.addEventListener('click', () => {
    if (!pendingAvatar || pendingAvatar === myAvatar) return;
    myAvatar = pendingAvatar;
    try { localStorage.setItem('talklive_avatar', myAvatar); } catch (err) { /* storage blocked */ }
    // Picking an animal here is picking your spirit animal - the same choice,
    // made from the other picker. Keeping them apart meant the animal on your
    // own profile and the animal the person you called saw could be two
    // different creatures.
    const pickedAnimal = animalAvatarId(myAvatar);
    if (pickedAnimal && Animals && Animals.has(pickedAnimal) && myAnimal !== pickedAnimal) {
      myAnimal = pickedAnimal;
      Animals.store(pickedAnimal);
      document.querySelectorAll('#animalGrid .animal-option, #callAnimalGrid .animal-option, #animalGateGrid .animal-option').forEach((btn) => {
        const on = btn.dataset.animal === pickedAnimal;
        btn.classList.toggle('selected', on);
        btn.setAttribute('aria-checked', on ? 'true' : 'false');
      });
      renderAnimalChoiceLine();
    }
    renderAvatarGrid();
    renderAccountState();
    renderHeaderAccountFace();   // the corner wears it once it is saved
    renderSettingsProfileRow();
    registerProfile(); // pushes the new avatar to the server so friends see it
    showToast(t('avatarSaved'));
    syncSaveAvatarBtn();
    vibrate(15);
  });
}

// --- Spirit animal picker ----------------------------------------------------
// Built once on load, then never rebuilt: selection is a class toggle on two
// buttons (the old one and the new one), so tapping through the row costs no
// layout of the grid and nothing to garbage-collect. One delegated listener
// handles all twelve.
// The picker opens on one row and grows on request. There are twenty animals
// now, and a wall of twenty is a thing to get past on the way to the call
// button rather than a thing to enjoy picking from. The row you land on is
// never missing your own choice: a pick from further down is pulled into it.
const ANIMAL_PREVIEW_COUNT = 7;
let animalPickerExpanded = false;

function animalPreviewIds() {
  const ids = Animals.list.map((a) => a.id).slice(0, ANIMAL_PREVIEW_COUNT);
  if (myAnimal && !ids.includes(myAnimal)) ids[ids.length - 1] = myAnimal;
  return ids;
}

const callAnimalGrid = document.getElementById('callAnimalGrid');

// Drawn in two places - the landing screen and the call screen's More sheet -
// from one list, one storage key and one server call. The call screen always
// shows the whole set: you are waiting, and there is nothing else to get past.
function renderAnimalPicker() {
  paintAnimalPicker(animalGrid, animalPickerExpanded ? null : animalPreviewIds());
  paintAnimalPicker(callAnimalGrid, null);
  // The gate shows the whole set too: it is the one screen whose only job is
  // this choice, so there is nothing to get past and no reason to hide half.
  paintAnimalPicker(document.getElementById('animalGateGrid'), null);
  renderAnimalChoiceLine();
}

function paintAnimalPicker(grid, limitIds) {
  if (!grid || !Animals) return;
  Animals.installSprite();
  grid.innerHTML = '';
  const shown = limitIds || Animals.list.map((a) => a.id);
  const frag = document.createDocumentFragment();
  shown.forEach((id) => {
    const animal = Animals.get(id);
    if (!animal) return;
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

  // The "More" tile only belongs on a grid that is actually holding something
  // back. The call screen shows the full set, so it never gets one.
  if (limitIds && Animals.list.length > ANIMAL_PREVIEW_COUNT) {
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'animal-option animal-option-more';
    more.dataset.animalMore = '1';
    more.innerHTML = `
      <span class="animal-more-glyph" aria-hidden="true">${animalPickerExpanded ? '&minus;' : '+'}</span>
      <span class="animal-option-name">${escapeHtml(t(animalPickerExpanded ? 'animalLess' : 'animalMore'))}</span>
    `;
    frag.appendChild(more);
  }

  grid.appendChild(frag);
}

// Re-labels the existing buttons (language switch) without touching the icons.
function refreshAnimalLabels() {
  if (!animalGrid) return;
  // A rebuild rather than a relabel: the "More" tile's own label is
  // translated too, and which animals are on screen depends on the choice.
  renderAnimalPicker();
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
  document.querySelectorAll('#animalGrid .animal-option, #callAnimalGrid .animal-option, #animalGateGrid .animal-option').forEach((btn) => {
    const on = btn.dataset.animal === next;
    btn.classList.toggle('selected', on);
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
  });
  // Your animal IS your face. It used to be two separate choices - a private
  // avatar your friends saw and a spirit animal only the stranger saw - so
  // picking a lion left the corner of your own screen showing the grey
  // silhouette of a person you had never chosen. One pick, one face,
  // everywhere: the header, the settings row, the friends list, the profile
  // your friends open, and the card the person you are calling looks at.
  if (next) {
    myAvatar = ANIMAL_AVATAR_PREFIX + next;
    // The settings grid shows a pending pick; this pick is already committed,
    // so it is the pending one too - otherwise Save would offer to undo it.
    pendingAvatar = myAvatar;
    try { localStorage.setItem('talklive_avatar', myAvatar); } catch (e) { /* storage blocked */ }
    renderAvatarGrid();
    renderAccountState();
    renderHeaderAccountFace();
  }
  renderAnimalChoiceLine();
  // The Settings profile row wears this avatar, so it re-renders with it.
  renderSettingsProfileRow();
  registerProfile(); // so a search already queued picks the new animal up
}

if (callAnimalGrid) {
  callAnimalGrid.addEventListener('click', (e) => {
    const option = e.target.closest('.animal-option');
    if (!option || !option.dataset.animal) return;
    vibrate(8);
    setMyAnimal(option.dataset.animal);
  });
}

if (animalGrid) {
  animalGrid.addEventListener('click', (e) => {
    const option = e.target.closest('.animal-option');
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
  // Account changes made in Settings have no dialog to report into.
  if (accountModal.classList.contains('hidden')) {
    if (msg) showToast(msg);
    return;
  }
  accountStatus.textContent = msg;
  accountStatus.className = `account-status ${kind}`;
  accountStatus.classList.remove('hidden');
}

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

// Header auth - the same three destinations as the side panel, one tap from
// anywhere in the app instead of behind the settings menu.
// It opens on top of whatever is on screen, Settings included. Closing
// Settings first used to pop its history entry, and the popstate that
// followed closed this dialog again - the button just dropped you home.
function openAccountModal(tab) {
  // Signed in, the account lives in Settings > Profile, not in a dialog.
  if (accountNickname) { openAppSettings('profile'); return; }
  renderAccountState();
  selectAccountTab(tab);
  openModal(accountModal);
}

headerLoginBtn.addEventListener('click', () => openAccountModal('login'));
headerSignupBtn.addEventListener('click', () => openAccountModal('signup'));
sidePanelSignInBtn.addEventListener('click', () => openAccountModal('login'));
sidePanelRegisterBtn.addEventListener('click', () => openAccountModal('signup'));
// Your face in the corner goes to your profile - not to a dialog on top of
// whatever you were doing. Settings owns the profile now, so this is a
// navigation to /settings with the Profile section open, which is also what
// the URL says afterwards.
headerAccountBtn.addEventListener('click', () => {
  renderAccountState();
  openAppSettings('profile');
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
    // 'outline' on every theme: Google's white pill, the look the site
    // wants. It must stay visible - see the note on .google-btn-slot.
    window.google.accounts.id.renderButton(host, {
      type: 'standard', theme: 'outline', size: 'large',
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
  const fromSettings = nicknameSaveFromSettings;
  nicknameSaveFromSettings = false;
  if (!ok) {
    if (fromSettings) {
      showToast(error || t('statusNicknameUpdated'));
      syncSaveNameBtn();
      return;
    }
    return showAccountStatus(error, 'error');
  }
  accountNickname = nickname;
  localStorage.setItem('talklive_nickname', nickname);
  renderAccountState();
  renderSettingsProfileRow();
  if (fromSettings) showToast(t('tempNameSaved'));
  else showAccountStatus(t('statusNicknameUpdated'), 'success');
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
    renderSentRequests();
    syncFriendsTabCounts();
    // Open where the badge pointed: something to answer (a request, a
    // call-back) wins; otherwise unread messages live under Friends. News
    // alone ("accepted your request") used to pull the panel to Requests and
    // hide the messages the badge was actually counting.
    const answerable = requestRows().some((n) => n.type === 'friend_request' || n.type === 'call_back_request');
    const unseenNews = requestRows().some((n) => needsAttention(n));
    const tab = answerable || (unseenNews && !totalUnreadMessages()) ? 'requests' : 'friends';
    openSidePanel(friendsDropdown, friendsOverlay);
    showFriendsTab(tab);
    updateScrollLock();
  } else {
    closeSidePanel(friendsDropdown, friendsOverlay);
    updateScrollLock();
  }
});
closeFriendsBtn.addEventListener('click', () => {
  closeSidePanel(friendsDropdown, friendsOverlay);
  updateScrollLock();
});

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
  renderRailFriends();
  if (friendsData.length === 0) {
    friendsList.innerHTML = `<p class="tl-empty">${escapeHtml(t('noFriendsYet'))}</p>`;
    return;
  }
  friendsList.innerHTML = '';
  // An inbox, not a phone book: whoever has something unread, then whoever is
  // here right now, then the most recent conversation.
  const lastTs = (f) => (f.last && f.last.ts) || 0;
  const sorted = [...friendsData].sort((a, b) => (
    Number(unreadCountFor(b.clientId) > 0) - Number(unreadCountFor(a.clientId) > 0)
    || Number(!!b.online) - Number(!!a.online)
    || lastTs(b) - lastTs(a)
  ));
  sorted.forEach((f) => {
    const unread = unreadCountFor(f.clientId);
    const typing = typingFrom.has(f.clientId);
    const preview = typing ? t('friendTyping') : previewText(f.last);
    const item = document.createElement('div');
    item.className = 'friend-item';
    item.innerHTML = `
      <button type="button" class="friend-avatar-btn" data-id="${escapeHtml(f.clientId)}" title="${escapeHtml(t('profile'))}" aria-label="${escapeHtml(t('profile'))}">${genderIcon(f.avatar, 30)}</button>
      <div class="friend-item-info friend-row-main" data-id="${escapeHtml(f.clientId)}">
        <span class="friend-item-name">${getFlagImg(f.countryCode)} ${escapeHtml(friendLabel(f))}</span>
        <span class="friend-status-text ${f.online ? 'is-online' : 'is-offline'}">${escapeHtml(presenceText(f))}</span>
        ${unread > 0 ? `<span class="unread-badge">${unread}</span>` : ''}
        ${preview ? `<span class="friend-item-preview${unread > 0 ? ' is-unread' : ''}${typing ? ' is-typing' : ''}">${escapeHtml(preview)}</span>` : ''}
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

// Everything this client knows about someone, from the freshest list that has
// them. A profile opened from a notification, or refreshed by a state-sync,
// used to get a bare { clientId } - a sheet with no name, flag or avatar.
function personById(clientId, fallback) {
  const lists = [friendsData, friendRequestsData, sentRequestsData, historyEntries()];
  for (const list of lists) {
    const hit = list.find((p) => p.clientId === clientId);
    if (hit) return fallback ? { ...fallback, ...hit } : hit;
  }
  return { clientId, ...(fallback || {}) };
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
  // Presence is shown to anyone the server reports it for - friends, and
  // recent people - so "message back" can say whether they are around.
  const hasPresence = relation === 'friend' || 'online' in known || !!known.lastSeen;
  const presence = hasPresence
    ? `<span class="friend-status-text ${online ? 'is-online' : 'is-offline'}">${escapeHtml(presenceText(known))}</span>`
    : '';
  friendProfileStatus.innerHTML = relation === 'friend'
    ? presence
    : `<span class="friend-relation-text">${escapeHtml(t('profileRelation_' + relation))}</span>${presence ? ' · ' + presence : ''}`;

  // "Really <their own name>" - only when this account has renamed them, so a
  // friend you gave a private label to is still identifiable by the name they
  // chose for themselves.
  const renamed = relation === 'friend' && friend && friend.nickname && friend.nickname !== friend.username;
  friendProfileRealName.classList.toggle('hidden', !renamed);
  if (renamed) friendProfileRealName.textContent = t('realName', { name: friend.username });

  // Chat is for anyone the server lets this user message: friends, and
  // recent matches ("message back"). Block is for everyone - it used to be
  // friends-only, so the one person you most wanted gone after a bad call
  // could only be reported, never simply blocked.
  friendProfileChatBtn.classList.toggle('hidden', !canMessage(person.clientId) && !inCallWith(person.clientId));
  friendProfileRenameBtn.classList.toggle('hidden', relation !== 'friend');
  friendProfileRemoveBtn.classList.toggle('hidden', relation !== 'friend');
  document.getElementById('friendProfileManageRow').classList.toggle('hidden', relation !== 'friend');
  friendProfileBlockBtn.classList.remove('hidden');
  friendProfileAddBtn.classList.toggle('hidden', relation !== 'stranger');
  friendProfileAcceptBtn.classList.toggle('hidden', relation !== 'incoming');
  friendProfileDeclineBtn.classList.toggle('hidden', relation !== 'incoming');
  friendProfilePending.classList.toggle('hidden', relation !== 'pending');
  if (friendProfileCancelBtn) friendProfileCancelBtn.classList.toggle('hidden', relation !== 'pending');

  closeSidePanel(friendsDropdown, friendsOverlay);
  openSidePanel(friendProfileModal, friendProfileOverlay);
}

// Whether a direct chat with this person can be opened: friends, and anyone
// among recent people (the server accepts both).
function canMessage(clientId) {
  return friendsData.some((f) => f.clientId === clientId)
    || serverHistory.some((h) => h.clientId === clientId)
    || callHistory.some((h) => h.clientId === clientId);
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
  // The person you are on a call with: their chat is the in-call one.
  if (inCallWith(activeProfileFriendId)) {
    openChatPanel();
    return;
  }
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
  if (friendProfileCancelBtn) friendProfileCancelBtn.classList.remove('hidden');
  activeProfileRelation = 'pending';
  friendProfileStatus.innerHTML = `<span class="friend-relation-text">${escapeHtml(t('profileRelation_pending'))}</span>`;
  // Confirmed by the server's answer below, not assumed: a refused request
  // (limit, block, rate) used to toast "sent" and leave the sheet on Pending.
  profileAddTarget = activeProfileFriendId;
});

let profileAddTarget = null;
socket.on('friend-request-result', ({ ok, sent, error, limitReached } = {}) => {
  const target = profileAddTarget;
  if (!target) return;
  profileAddTarget = null;
  if (ok) {
    if (sent) showToast(t('friendRequestSent'));
    return;
  }
  // limitReached opens the upgrade sheet elsewhere; anything else is said here,
  // where the user is looking, rather than on the call screen behind the sheet.
  if (error && !limitReached) showToast(error);
  if (activeProfileFriendId === target && friendProfileModal.classList.contains('open')) {
    openUserProfile(personById(target, { username: friendProfileName.textContent.trim() }));
  }
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
  const target = activeProfileFriendId;
  const wasFriend = relationTo(target) === 'friend';
  const ok = await showConfirm({ title: 'block', text: wasFriend ? 'confirmBlockFriend' : 'confirmBlockUser', okKey: 'block' });
  if (!ok) return;
  socket.emit('block-friend', { friendClientId: target });
  closeSidePanel(friendProfileModal, friendProfileOverlay);
  // A chat with them may still be open behind the sheet; it is dead now.
  if (activeFriendChatId === target) {
    closeSidePanel(friendChatModal, friendChatOverlay);
    activeFriendChatId = null;
  }
  friendChatCache.delete(target);
  showToast(t('userBlocked'));
});

if (friendProfileCancelBtn) {
  friendProfileCancelBtn.addEventListener('click', () => {
    if (!activeProfileFriendId) return;
    cancelFriendRequest(activeProfileFriendId);
    friendProfileCancelBtn.classList.add('hidden');
    friendProfilePending.classList.add('hidden');
    friendProfileAddBtn.classList.remove('hidden');
    activeProfileRelation = 'stranger';
    friendProfileStatus.innerHTML = `<span class="friend-relation-text">${escapeHtml(t('profileRelation_stranger'))}</span>`;
  });
}

// Take back a request nobody has answered yet. Painted now; the state-sync
// that follows says the same.
function cancelFriendRequest(clientId) {
  socket.emit('cancel-friend-request', { targetClientId: clientId });
  sentRequestsData = sentRequestsData.filter((r) => r.clientId !== clientId);
  renderSentRequests();
  syncFriendsTabCounts();
  showToast(t('friendRequestCancelled'));
}

// --- Blocked people (Settings > Privacy) -----------------------------------
const blockedList = document.getElementById('blockedList');

function renderBlockedList() {
  if (!blockedList) return;
  if (!blockedData.length) {
    blockedList.innerHTML = `<p class="tl-empty">${escapeHtml(t('noBlockedPeople'))}</p>`;
    return;
  }
  blockedList.innerHTML = '';
  blockedData.forEach((b) => {
    const row = document.createElement('div');
    row.className = 'blocked-row';
    const name = b.username || t('someone');
    row.innerHTML = `
      <span class="blocked-row-avatar" aria-hidden="true">${genderIcon(b.avatar, 30)}</span>
      <span class="blocked-row-text">
        <span class="blocked-row-name">${getFlagImg(b.countryCode)} ${escapeHtml(name)}</span>
        ${b.ts ? `<span class="blocked-row-sub">${escapeHtml(timeAgo(b.ts))}</span>` : ''}
      </span>
      <button type="button" class="tl-unblock-btn" data-id="${escapeHtml(b.clientId)}" data-name="${escapeHtml(name)}">${escapeHtml(t('unblock'))}</button>
    `;
    blockedList.appendChild(row);
  });
}

if (blockedList) {
  blockedList.addEventListener('click', async (e) => {
    const btn = e.target.closest('.tl-unblock-btn');
    if (!btn) return;
    const name = btn.dataset.name;
    const ok = await showConfirm({ title: 'unblock', text: 'confirmUnblock', textVars: { name }, okKey: 'unblock', okClass: 'btn-primary' });
    if (!ok) return;
    socket.emit('unblock-user', { targetClientId: btn.dataset.id });
    blockedData = blockedData.filter((b) => b.clientId !== btn.dataset.id);
    renderBlockedList();
    showToast(t('unblocked', { name }));
  });
}

// The friends list starts as skeleton rows (index.html); the first state-sync
// replaces them. If no sync arrives (server hiccup, logged-out edge case),
// fall back to the normal empty state so the shimmer can't sit there forever.
let friendsSynced = false;
setTimeout(() => { if (!friendsSynced) renderFriendsList(); }, 5000);

socket.on('state-sync', ({ friends: friendList, friendRequests: requestList, sentRequests: sentList, notifications: notifList, chatHistory: historyList, blocked } = {}) => {
  friendsSynced = true;
  friendsData = friendList || [];
  friendRequestsData = requestList || [];
  sentRequestsData = sentList || [];
  notifData = notifList || [];
  serverHistory = historyList || [];
  blockedData = blocked || [];
  renderBlockedList();
  renderHistory();
  renderFriendChatStatus();
  renderFriendsList();
  renderNotifications();
  syncAddFriendBtn();
  // A first friend is exactly the moment the profile becomes worth keeping.
  renderLinkProfilePrompts();
  renderFriendChatPresence();
  // An open profile sheet is looking at data that just changed - a pending
  // request may have turned into a friendship while it sat there.
  if (activeProfileFriendId && friendProfileModal.classList.contains('open')) {
    // Blocked from another device, or they blocked this user: nothing left to
    // show, and the sheet's buttons would act on someone out of reach.
    if (blockedData.some((x) => x.clientId === activeProfileFriendId)) {
      closeSidePanel(friendProfileModal, friendProfileOverlay);
    } else {
      openUserProfile(personById(activeProfileFriendId, { username: friendProfileName.textContent.trim() }));
    }
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
  const name = escapeHtml(labelForClientId(n.fromClientId || n.byClientId, n.username));
  switch (n.type) {
    case 'friend_request': return t('notifWantsFriends', { name });
    case 'friend_accepted': return t('notifAccepted', { name });
    case 'call_back_request': return t('notifWantsCallback', { name });
    default: return escapeHtml(t('notification'));
  }
}

function timeAgo(ts) {
  // A row with no timestamp (an old stored request) must not read "20,000 days ago".
  if (!ts) return '';
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
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

// Whether a notification still wants the user. Messages count until read,
// requests and call-backs until answered; "<name> accepted your request" is
// news, and counts only until the Requests tab has been looked at. Every
// accepted request used to sit in the badge until dismissed by hand.
function needsAttention(n) {
  if (n.type === 'friend_accepted') return !n.seen;
  return true;
}

// The Requests tab, built from what is actually pending rather than from the
// inbox alone. A request is its own record on the server; its notification is
// a pointer to it that can be evicted or cleared, which used to leave a
// request nobody could see (and so nobody could answer), or a row for a
// request already answered on another device.
function requestRows() {
  const pending = new Set(friendRequestsData.map((r) => r.clientId));
  const rows = notifData.filter((n) => n.type !== 'message'
    && (n.type !== 'friend_request' || pending.has(n.fromClientId)));
  const shown = new Set(rows.filter((n) => n.type === 'friend_request').map((n) => n.fromClientId));
  friendRequestsData.forEach((r) => {
    if (shown.has(r.clientId)) return;
    rows.push({
      id: 'req:' + r.clientId, type: 'friend_request', fromClientId: r.clientId,
      username: r.username, countryCode: r.countryCode, message: r.message, ts: r.ts || 0,
    });
  });
  return rows.sort((a, b) => (a.ts || 0) - (b.ts || 0));
}

function friendsBadgeCount() {
  return totalUnreadMessages() + requestRows().filter(needsAttention).length;
}

function updateFriendsMsgBadge() {
  const count = friendsBadgeCount();
  friendsMsgBadge.textContent = count > 99 ? '99+' : String(count);
  friendsMsgBadge.classList.toggle('hidden', count === 0);
  showCountOutsidePage(count);
}

// The same count where it can be seen with the page in the background: the
// tab title, and the icon of the installed app. A message that arrived while
// you were in another tab used to leave no trace until you came back.
function showCountOutsidePage(count) {
  const base = document.title.replace(/^\(\d+\+?\)\s*/, '');
  const next = count > 0 ? `(${count > 99 ? '99+' : count}) ${base}` : base;
  if (document.title !== next) document.title = next;
  try {
    if (count > 0 && navigator.setAppBadge) navigator.setAppBadge(count).catch(() => {});
    else if (!count && navigator.clearAppBadge) navigator.clearAppBadge().catch(() => {});
  } catch (_) { /* unsupported */ }
}

// Looking at the Requests tab is what "seen" means for news rows.
function markRequestsSeen() {
  if (!notifData.some((n) => n.type === 'friend_accepted' && !n.seen)) return;
  notifData.forEach((n) => { if (n.type === 'friend_accepted') n.seen = true; });
  socket.emit('mark-notifications-seen');
  updateFriendsMsgBadge();
  syncFriendsTabCounts();
}

// The requests list (friend requests, accepted-friend confirmations, call-back
// requests) lives at the top of the Friends dropdown; new message notifications
// surface as unread badges on the Friends button/list instead.
function renderNotifications() {
  const visible = requestRows();
  notifList.classList.toggle('no-requests', visible.length === 0);

  if (visible.length === 0) {
    notifList.innerHTML = `<p class="tl-empty">${escapeHtml(t('noRequestsYet'))}</p>`;
  } else {
    notifList.innerHTML = '';
    [...visible].reverse().forEach((n) => {
      const item = document.createElement('div');
      item.className = 'notif-item' + (needsAttention(n) ? '' : ' is-seen');
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
  renderSentRequests();
  syncFriendsTabCounts();
}

// --- Requests you sent -----------------------------------------------------
// The other half of the friends story. The client has always known about
// outgoing requests (sentRequestsData, used to decide what a profile sheet
// offers), but nothing ever listed them: you asked someone to be your friend
// and the app then behaved as though you never had.
const sentRequestsList = document.getElementById('sentRequestsList');

function renderSentRequests() {
  if (!sentRequestsList) return;
  if (!sentRequestsData.length) {
    sentRequestsList.innerHTML = `<p class="tl-empty">${escapeHtml(t('noSentRequests'))}</p>`;
    return;
  }
  sentRequestsList.innerHTML = '';
  sentRequestsData.forEach((r) => {
    const item = document.createElement('div');
    item.className = 'tl-sent-item';
    item.dataset.profileId = r.clientId;
    item.innerHTML = `
      <span class="tl-sent-avatar" aria-hidden="true">${genderIcon(r.avatar, 30)}</span>
      <span class="tl-sent-text">
        <span class="tl-sent-name">${getFlagImg(r.countryCode)} ${escapeHtml(r.username || t('stranger'))}</span>
        <span class="tl-sent-sub">${escapeHtml(timeAgo(r.ts))}</span>
      </span>
      <span class="tl-sent-chip">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/></svg>
        ${escapeHtml(t('pending'))}
      </span>
      <button type="button" class="tl-sent-cancel" data-id="${escapeHtml(r.clientId)}" title="${escapeHtml(t('cancelFriendRequest'))}" aria-label="${escapeHtml(t('cancelFriendRequest'))}">${escapeHtml(t('cancelRequest'))}</button>
    `;
    sentRequestsList.appendChild(item);
  });
}

if (sentRequestsList) {
  sentRequestsList.addEventListener('click', (e) => {
    const cancel = e.target.closest('.tl-sent-cancel');
    if (cancel) {
      cancel.disabled = true;
      cancelFriendRequest(cancel.dataset.id);
      return;
    }
    const row = e.target.closest('.tl-sent-item');
    if (!row || !row.dataset.profileId) return;
    const person = sentRequestsData.find((r) => r.clientId === row.dataset.profileId);
    if (person) openUserProfile(person);
  });
}

// --- Friends panel tabs ----------------------------------------------------
const friendsTabs = document.getElementById('friendsTabs');
const friendsTabPanel = document.getElementById('friendsTabPanel');
const requestsTabPanel = document.getElementById('requestsTabPanel');
const friendsTabCount = document.getElementById('friendsTabCount');
const requestsTabCount = document.getElementById('requestsTabCount');

function setTabCount(el, n) {
  if (!el) return;
  el.textContent = n > 99 ? '99+' : String(n);
  el.classList.toggle('hidden', n === 0);
}

function syncFriendsTabCounts() {
  const unreadFromFriends = friendsData.reduce((sum, f) => sum + unreadCountFor(f.clientId), 0);
  // Two numbers side by side on one tab ("Friends 2 2") read as a typo, so
  // while there is something unread the red count stands in for the total.
  setTabCount(friendsTabCount, unreadFromFriends ? 0 : friendsData.length);
  // Red means "waiting on you": requests to answer and news not yet seen.
  // Requests this user sent are waiting on someone else, so they are listed
  // but never counted here.
  setTabCount(requestsTabCount, requestRows().filter(needsAttention).length);
  // The friend count is not an alert, but unread messages are: they get their
  // own red dot on the Friends tab, or a panel opened on Requests hid them.
  if (friendsTabCount) {
    let dot = document.getElementById('friendsTabUnread');
    if (!dot) {
      dot = document.createElement('span');
      dot.id = 'friendsTabUnread';
      dot.className = 'tl-tab-count tl-tab-unread hidden';
      friendsTabCount.after(dot);
    }
    const unread = unreadFromFriends;
    setTabCount(dot, unread);
    dot.setAttribute('aria-label', t('unreadMessagesCount', { n: unread }));
  }
}

function showFriendsTab(name) {
  if (!friendsTabs) return;
  friendsTabs.querySelectorAll('.tl-tab').forEach((tab) => {
    const on = tab.dataset.tab === name;
    tab.classList.toggle('selected', on);
    tab.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  if (friendsTabPanel) friendsTabPanel.classList.toggle('hidden', name !== 'friends');
  if (requestsTabPanel) requestsTabPanel.classList.toggle('hidden', name !== 'requests');
  if (name === 'requests' && friendsDropdown.classList.contains('open')) markRequestsSeen();
}

if (friendsTabs) {
  friendsTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.tl-tab');
    if (tab) showFriendsTab(tab.dataset.tab);
  });
}

notifList.addEventListener('click', (e) => {
  // Anywhere on the row that is not one of its chips opens the profile of the
  // person the notification is about - the chips below keep working as before.
  if (!e.target.closest('.btn-chip')) {
    const row = e.target.closest('.notif-item');
    const notif = row && requestRows().find((n) => (n.fromClientId || n.byClientId) === row.dataset.profileId);
    const person = row && row.dataset.profileId
      ? personById(row.dataset.profileId, notif ? { username: notif.username, countryCode: notif.countryCode } : null)
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
  // Already on screen: the open chat marks it read, so counting it would only
  // flash a badge for a message the user is looking at.
  // A chat left open in a background tab is not being read, so it counts
  // there (tab title, app badge) until the tab is looked at again.
  if (n.type === 'message' && friendChatOnScreen(n.fromClientId)) return;
  notifData.push(n);
  renderNotifications();
  if (n.type === 'call_back_request') {
    showCallBackBanner(n.fromClientId, labelForClientId(n.fromClientId, n.username));
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
function renderFriendChatMessages(opts = {}) {
  const messages = friendChatCache.get(activeFriendChatId) || [];
  const box = friendChatMessages;
  // Every incoming message, receipt and reaction re-renders the thread. Always
  // jumping to the bottom yanked anyone reading back through older messages
  // down to the newest one; only follow the conversation when already there.
  const stick = opts.toBottom || box.scrollHeight - box.scrollTop - box.clientHeight < 80;
  const prevTop = box.scrollTop;
  friendChatMessages.innerHTML = '';
  // The whole list is re-rendered, so every id the controller knows about is
  // stale - drop them before the new bubbles register themselves.
  if (friendExtras) friendExtras.reset();
  if (messages.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'tl-empty';
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
    // My messages carry a delivery tick: faded while on its way, solid once
    // the server has stored it. "Seen" is the label under the thread.
    const meta = appendMessageMeta(el, ts, mine);
    const ticks = meta.querySelector('.chat-msg-ticks');
    if (ticks && !m.pending) ticks.classList.replace('sending', 'sent');
    if (m.pending) el.classList.add('is-pending');
    if (m.failed) el.classList.add('is-failed');
    friendChatMessages.appendChild(el);
    applyGrouping(friendChatMessages, el, mine ? 'me' : 'them', ts);
    if (m.failed) {
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'chat-msg-retry';
      retry.dataset.retryId = m.id;
      retry.textContent = t('msgNotSentRetry');
      friendChatMessages.appendChild(retry);
    }
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
  box.scrollTop = stick ? box.scrollHeight : prevTop;
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
  // The composer belongs to a conversation: text typed to one person used to
  // stay in the box when another chat was opened, and went to the wrong one.
  if (activeFriendChatId && activeFriendChatId !== friendClientId) saveFriendDraft();
  activeFriendChatId = friendClientId;
  friendChatInput.value = friendDrafts.get(friendClientId) || '';
  const friend = friendsData.find((f) => f.clientId === friendClientId);
  // A "message back" chat with a recent match has no friend entry - name it
  // from the call history rather than a bare "Chat".
  const past = friend ? null : historyEntries().find((h) => h.clientId === friendClientId);
  const chatName = friend ? friendLabel(friend) : (past && past.username);
  friendChatTitle.textContent = chatName ? t('chatWith', { name: chatName }) : t('chat');
  closeSidePanel(friendsDropdown, friendsOverlay);
  closeSidePanel(friendProfileModal, friendProfileOverlay);
  openSidePanel(friendChatModal, friendChatOverlay);

  socket.emit('get-friend-chat', { friendClientId });
  socket.emit('mark-messages-read', { friendClientId });
  if (messageSeenEnabled) socket.emit('chat-seen', { friendClientId });
  notifData = notifData.filter((n) => !(n.type === 'message' && n.fromClientId === friendClientId));
  renderNotifications();
  renderFriendChatMessages({ toBottom: true });
  applyFriendChatLock();
  // Whoever is online right now is the baseline; only a drop from here is news.
  friendChatWasOnline = !!(friend && friend.online);
  friendChatPresence.classList.add('hidden');
  renderFriendChatStatus();
  focusComposer(friendChatInput);
}

closeFriendChatBtn.addEventListener('click', () => {
  saveFriendDraft();
  closeSidePanel(friendChatModal, friendChatOverlay);
  activeFriendChatId = null;
});

// --- Per-conversation drafts ------------------------------------------------
const friendDrafts = new Map(); // clientId -> unsent text
function saveFriendDraft() {
  if (!activeFriendChatId) return;
  const text = friendChatInput.value;
  if (text.trim()) friendDrafts.set(activeFriendChatId, text);
  else friendDrafts.delete(activeFriendChatId);
}
friendChatInput.addEventListener('input', saveFriendDraft);

// Whether this person's conversation is actually in front of the user: open,
// and in a tab that is being looked at. Read receipts and "read" markers are
// only honest when it is - a chat left open in a background tab used to tell
// the sender "Seen" for messages nobody had read.
function friendChatOnScreen(clientId) {
  return !!clientId && activeFriendChatId === clientId
    && friendChatModal.classList.contains('open')
    && document.visibilityState === 'visible';
}

// `always` for a message that just landed on screen: its unread marker is
// still on its way. Coming back to the tab only needs to say anything when
// something arrived while it was in the background.
function markActiveChatRead(always) {
  const id = activeFriendChatId;
  if (!friendChatOnScreen(id)) return;
  const unread = notifData.some((n) => n.type === 'message' && n.fromClientId === id);
  if (!always && !unread) return;
  socket.emit('mark-messages-read', { friendClientId: id });
  if (messageSeenEnabled) socket.emit('chat-seen', { friendClientId: id });
  if (unread) {
    notifData = notifData.filter((n) => !(n.type === 'message' && n.fromClientId === id));
    renderNotifications();
  }
}
document.addEventListener('visibilitychange', () => markActiveChatRead(false));

// Who you are talking to, as a profile: add, block and report live there.
const friendChatWho = document.getElementById('friendChatWho');
function openActiveChatProfile() {
  const id = activeFriendChatId;
  if (!id) return;
  closeSidePanel(friendChatModal, friendChatOverlay);
  openUserProfile(personById(id));
}
if (friendChatWho) {
  friendChatWho.addEventListener('click', openActiveChatProfile);
  friendChatWho.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openActiveChatProfile(); }
  });
}

// Clear this conversation - for this user only; the other side keeps theirs.
const friendChatClearBtn = document.getElementById('friendChatClearBtn');
if (friendChatClearBtn) {
  friendChatClearBtn.addEventListener('click', async () => {
    const id = activeFriendChatId;
    if (!id || !(friendChatCache.get(id) || []).length) return;
    const ok = await showConfirm({ title: 'clearChat', text: 'confirmClearChat', okKey: 'clearChat' });
    if (!ok || activeFriendChatId !== id) return;
    socket.emit('clear-friend-chat', { friendClientId: id });
    friendChatCache.set(id, []);
    noteLastMessage(id, null);
    renderFriendChatMessages();
    renderFriendsList();
    renderHistory();
    showToast(t('chatCleared'));
  });
}

// The line under the chat title: "typing…", "Online" or "Last seen 5m ago".
const friendChatStatus = document.getElementById('friendChatStatus');
function renderFriendChatStatus() {
  if (!friendChatStatus) return;
  const id = activeFriendChatId;
  const person = id && (friendsData.find((f) => f.clientId === id) || serverHistory.find((h) => h.clientId === id));
  const typing = !!id && typingFrom.has(id);
  friendChatStatus.textContent = typing ? t('friendTyping') : presenceText(person);
  friendChatStatus.classList.toggle('is-online', !typing && !!(person && person.online));
  friendChatStatus.classList.toggle('is-typing', typing);
}

function setTyping(clientId, on) {
  clearTimeout(typingFrom.get(clientId));
  if (on) typingFrom.set(clientId, setTimeout(() => setTyping(clientId, false), 4000));
  else typingFrom.delete(clientId);
  renderFriendChatStatus();
  renderFriendsList();
}

socket.on('friend-typing', ({ fromClientId } = {}) => {
  if (fromClientId) setTyping(fromClientId, true);
});

let friendTypingThrottle = 0;
friendChatInput.addEventListener('input', () => {
  if (!activeFriendChatId || !friendChatInput.value) return;
  const now = Date.now();
  if (now - friendTypingThrottle < 2000) return;
  friendTypingThrottle = now;
  socket.emit('friend-typing', { toClientId: activeFriendChatId });
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
  unsend: (id) => {
    if (activeFriendChatId) socket.emit('friend-message-delete', { toClientId: activeFriendChatId, id });
  },
}) : null;

socket.on('friend-message-deleted', ({ chatWith, id } = {}) => {
  const cache = friendChatCache.get(chatWith);
  if (cache) {
    friendChatCache.set(chatWith, cache.filter((m) => m.id !== id));
    noteLastMessage(chatWith, lastFromCache(chatWith));
  } else {
    // Never opened this chat here: only the preview can be showing it.
    const row = friendsData.find((f) => f.clientId === chatWith) || serverHistory.find((h) => h.clientId === chatWith);
    if (row && row.last && row.last.id === id) noteLastMessage(chatWith, null);
  }
  if (friendExtras && activeFriendChatId === chatWith) friendExtras.forget(id);
  if (activeFriendChatId === chatWith) renderFriendChatMessages();
  renderFriendsList();
  renderHistory();
});

function friendChatSystemNote(text) {
  const el = document.createElement('div');
  el.className = 'chat-msg system';
  el.textContent = text;
  friendChatMessages.appendChild(el);
  friendChatMessages.scrollTop = friendChatMessages.scrollHeight;
}

// --- Outbox: direct messages the server has not acknowledged yet ------------
// A message is shown the instant it is sent, marked as on its way, and settled
// by the server's 'friend-message-sent'. One that never gets there is marked
// "Not sent" with a retry instead of vanishing, and everything still waiting is
// re-sent when the socket registers again (the server stores each id once).
const friendOutbox = new Map(); // id -> { toClientId, payload, tries, timer }
const FRIEND_SEND_TIMEOUT_MS = 12000;
const FRIEND_SEND_MAX_TRIES = 5;

function newFriendMsgId() {
  return 'm' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function outboxMessage(id) {
  const entry = friendOutbox.get(id);
  const cache = entry && friendChatCache.get(entry.toClientId);
  return cache ? cache.find((m) => m.id === id) : null;
}

function repaintChat(clientId) {
  if (activeFriendChatId === clientId) renderFriendChatMessages();
}

function emitOutbox(id) {
  const entry = friendOutbox.get(id);
  if (!entry) return;
  entry.tries += 1;
  clearTimeout(entry.timer);
  entry.timer = setTimeout(() => markFriendMessageFailed(id), FRIEND_SEND_TIMEOUT_MS);
  socket.emit('friend-message', { toClientId: entry.toClientId, ...entry.payload });
}

function markFriendMessageFailed(id) {
  const entry = friendOutbox.get(id);
  const msg = outboxMessage(id);
  if (!entry || !msg) return;
  clearTimeout(entry.timer);
  msg.pending = false;
  msg.failed = true;
  repaintChat(entry.toClientId);
}

function retryFriendMessage(id) {
  const entry = friendOutbox.get(id);
  const msg = outboxMessage(id);
  if (!entry || !msg) return;
  msg.failed = false;
  msg.pending = true;
  entry.tries = 0;
  repaintChat(entry.toClientId);
  emitOutbox(id);
}

// The server stored it (or already had it): the bubble is real now.
function settleFriendMessage(id) {
  const entry = friendOutbox.get(id);
  if (!entry) return;
  clearTimeout(entry.timer);
  friendOutbox.delete(id);
}

// The server refused it for good: take the bubble back and give the text back
// to the composer, so a link or a typo can be fixed rather than retyped.
function dropFriendMessage(id) {
  const entry = friendOutbox.get(id);
  if (!entry) return null;
  clearTimeout(entry.timer);
  friendOutbox.delete(id);
  const cache = friendChatCache.get(entry.toClientId) || [];
  friendChatCache.set(entry.toClientId, cache.filter((m) => m.id !== id));
  noteLastMessage(entry.toClientId, lastFromCache(entry.toClientId));
  if (activeFriendChatId === entry.toClientId && !friendChatInput.value && entry.payload.text) {
    friendChatInput.value = entry.payload.text;
    saveFriendDraft();
  }
  repaintChat(entry.toClientId);
  renderFriendsList();
  renderHistory();
  return entry;
}

friendChatMessages.addEventListener('click', (e) => {
  const retry = e.target.closest('.chat-msg-retry');
  if (retry) retryFriendMessage(retry.dataset.retryId);
});

// Re-registered after a drop: anything still unacknowledged goes again.
socket.on('register-result', ({ ok } = {}) => {
  if (ok === false) return;
  friendOutbox.forEach((entry, id) => {
    const msg = outboxMessage(id);
    if (msg && msg.failed) { msg.failed = false; msg.pending = true; repaintChat(entry.toClientId); }
    entry.tries = 0;
    emitOutbox(id);
  });
});

function sendFriendMessage(payload) {
  const text = payload.text || '';
  const toClientId = activeFriendChatId;
  if (!toClientId || (!text && !payload.gif)) return false;
  if (text && messageHasLink(text)) {
    friendChatSystemNote(t('errNoLinks'));
    return false;
  }
  if (text && messageIsUnsafe(text)) {
    friendChatSystemNote(t('errUnsafeMessage'));
    return false;
  }
  const id = payload.id || newFriendMsgId();
  const wire = { text, id, replyTo: payload.replyTo || null, gif: payload.gif || null };
  const cache = friendChatCache.get(toClientId) || [];
  cache.push({ from: getClientId(), text, ts: Date.now(), id, replyTo: wire.replyTo, gif: wire.gif, pending: true });
  friendChatCache.set(toClientId, cache);
  friendOutbox.set(id, { toClientId, payload: wire, tries: 0, timer: null });
  noteLastMessage(toClientId, { id, mine: true, text, gif: !!wire.gif, ts: Date.now() });
  friendDrafts.delete(toClientId);
  renderFriendChatMessages({ toBottom: true });
  renderFriendsList();
  renderHistory();
  playSendSound();
  emitOutbox(id);
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
  // A history load that raced this delivery may already hold it.
  if (id && cache.some((m) => m.id === id)) return;
  cache.push({ from: fromClientId, text, ts, id, replyTo, gif });
  friendChatCache.set(fromClientId, cache);
  noteLastMessage(fromClientId, { id, mine: false, text: text || '', gif: !!gif, ts });
  // The message is what they were typing.
  if (typingFrom.has(fromClientId)) setTyping(fromClientId, false);
  else renderFriendsList();
  renderHistory();
  if (activeFriendChatId === fromClientId && friendChatModal.classList.contains('open')) {
    renderFriendChatMessages();
    markActiveChatRead(true);
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
  settleFriendMessage(id);
  const cache = friendChatCache.get(toClientId) || [];
  const mine = id && cache.find((m) => m.id === id);
  if (mine) {
    // The optimistic copy: it is delivered now, stamped with the server's time.
    const changed = mine.pending || mine.failed;
    mine.pending = false;
    mine.failed = false;
    mine.ts = ts || mine.ts;
    if (changed) repaintChat(toClientId);
    return;
  }
  cache.push({ from: getClientId(), text, ts, id, replyTo, gif });
  friendChatCache.set(toClientId, cache);
  noteLastMessage(toClientId, { id, mine: true, text: text || '', gif: !!gif, ts });
  renderFriendsList();
  renderHistory();
  if (activeFriendChatId === toClientId) renderFriendChatMessages();
});

socket.on('friend-chat-history', ({ friendClientId, messages }) => {
  // Anything still on its way is not in the server's copy yet - keep it.
  const stored = messages || [];
  const have = new Set(stored.map((m) => m.id));
  const waiting = (friendChatCache.get(friendClientId) || [])
    .filter((m) => (m.pending || m.failed) && !have.has(m.id));
  stored.forEach((m) => { if (friendOutbox.has(m.id)) settleFriendMessage(m.id); });
  friendChatCache.set(friendClientId, stored.concat(waiting));
  if (activeFriendChatId === friendClientId) renderFriendChatMessages();
});

// --- Recent people ---
// This session's calls (which know how long they lasted) merged with the
// server's memory of recent matches (which survives a reload and includes text
// chats), one row per person, newest first.
function historyEntries() {
  const live = new Map(serverHistory.map((h) => [h.clientId, h]));
  const byId = new Map();
  const out = [];
  [...callHistory].reverse().forEach((e) => {
    if (!e.clientId) { out.push(e); return; }
    if (byId.has(e.clientId)) return;
    const h = live.get(e.clientId);
    const row = h ? { ...h, ...e, ts: Math.max(e.ts || 0, h.ts || 0) } : { ...e };
    byId.set(e.clientId, row);
    out.push(row);
  });
  serverHistory.forEach((h) => {
    if (byId.has(h.clientId)) return;
    byId.set(h.clientId, h);
    out.push(h);
  });
  return out.sort((a, b) => (b.ts || 0) - (a.ts || 0));
}

function historySubline(entry) {
  if (entry.durationSeconds) {
    const mins = Math.floor(entry.durationSeconds / 60);
    const secs = entry.durationSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return entry.ts ? timeAgo(entry.ts) : '';
}

function renderHistory() {
  renderRailHistory();
  const entries = historyEntries();
  if (entries.length === 0) {
    historyList.innerHTML = `<p class="tl-empty">${escapeHtml(t('noCallsYet'))}</p>`;
    return;
  }
  historyList.innerHTML = '';
  entries.forEach((entry) => {
    const item = document.createElement('div');
    item.className = 'history-item';
    const id = escapeHtml(entry.clientId || '');
    const unread = entry.clientId ? unreadCountFor(entry.clientId) : 0;
    const actions = entry.clientId
      ? `<button type="button" class="friend-msg-btn history-msg-btn" data-id="${id}" title="${escapeHtml(t('messageBack'))}" aria-label="${escapeHtml(t('messageBack'))}">${ICONS.chat}${unread ? `<span class="unread-badge">${unread}</span>` : ''}</button>
        <button type="button" class="call-back-btn" data-id="${id}" data-name="${escapeHtml(entry.username)}" title="${escapeHtml(t('callBack'))}" aria-label="${escapeHtml(t('callBack'))}">
          <svg viewBox="0 0 24 24" fill="white" aria-hidden="true"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
        </button>`
      : '';
    const preview = typingFrom.has(entry.clientId) ? t('friendTyping') : previewText(entry.last);
    item.innerHTML = `
      <span class="history-item-main">
        <button type="button" class="history-item-name history-profile-btn" data-id="${id}" title="${escapeHtml(t('openProfile'))}">
          <span class="history-presence${entry.online ? ' is-online' : ''}" aria-hidden="true"></span>
          ${getFlagImg(entry.countryCode)} ${escapeHtml(labelForClientId(entry.clientId, entry.username))}
        </button>
        <span class="history-item-sub">${escapeHtml(preview || historySubline(entry))}</span>
      </span>
      <span class="history-item-right">${actions}</span>
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
    ts: Date.now(),
    durationSeconds,
  });
  renderHistory();
  if (durationSeconds >= 30) trackGrowthEvent('quality_call');
  if (!maybeShowFriendPrompt(currentPartner, durationSeconds)) maybeShowSharePrompt(durationSeconds);
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

historyBtn.addEventListener('click', () => {
  if (historyPanel.classList.contains('open')) { closeHistoryPanel(); return; }
  renderHistory();
  openSidePanel(historyPanel, historyOverlay);
  updateScrollLock();
});
closeHistoryBtn.addEventListener('click', closeHistoryPanel);
historyOverlay.addEventListener('click', closeHistoryPanel);

historyList.addEventListener('click', (e) => {
  // Tapping the name opens who they are (and whether you have already asked
  // to add them); the green button still calls them straight back.
  const msgBtn = e.target.closest('.history-msg-btn');
  if (msgBtn && msgBtn.dataset.id) {
    closeHistoryPanel();
    openFriendChat(msgBtn.dataset.id);
    return;
  }
  const nameBtn = e.target.closest('.history-profile-btn');
  if (nameBtn && nameBtn.dataset.id) {
    const entry = historyEntries().find((h) => h.clientId === nameBtn.dataset.id);
    closeHistoryPanel();
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
  closeHistoryPanel();
  requestCallBack(btn.dataset.id, btn.dataset.name);
});

// Wraps 'register' so we can safely re-send the same payload after a socket
// reconnect (mobile browsers frequently drop/re-open the socket, e.g. when
// backgrounded, without a full page reload). Without re-registering, the
// server's clientId -> socketId map goes stale and friend messages/notifications
// sent to this device silently fail to arrive until the page is reloaded.
let lastRegisterPayload = null;
// True only for the first registration of a brand-new app session (a fresh
// tab or a relaunched app has empty sessionStorage; a reload does not). It
// tells the server a guest's temporary friend ID from the closed session can
// go, instead of being handed back.
let freshAppSession = (() => {
  try {
    const fresh = sessionStorage.getItem('tl_app_session') !== '1';
    sessionStorage.setItem('tl_app_session', '1');
    return fresh;
  } catch (e) { return false; }
})();
function registerClient(payload) {
  lastRegisterPayload = { ...payload, freshSession: false };
  socket.emit('register', { ...payload, freshSession: freshAppSession });
  freshAppSession = false;
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
  // The call screen's button is a pill with its caption inside it, so the
  // same word goes there too. The label below stays for the layouts that
  // still use it, and CSS hides it where the pill is showing.
  const callMainText = document.getElementById('callMainText');
  if (callMainText) callMainText.textContent = t(labelKey);
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
  // More holds report, reactions and auto-call, so it follows the same rule -
  // and it closes when the call does, rather than being left open over a
  // screen where none of it applies any more.
  if (typeof callMoreBtn !== 'undefined' && callMoreBtn) callMoreBtn.disabled = !connected;
  // Published on the panel so the stylesheet can act on it. While there is
  // nobody on the other end, Add friend / Mute / Report are dimmed
  // buttons that do nothing - they take a whole row of a phone screen to say
  // "not yet", and that row is exactly the space the waiting screen needs.
  callPanel.classList.toggle('is-connected', connected);
  if (!connected) setCallMoreOpen(false);
  // The bars only mean anything while there is a voice to draw.
  showCallWave(connected);
  // A live call is its own layout on a short phone: the corner already reads
  // CONNECTED, the timer is running in the orb and the partner's name is on
  // screen, so the "You're connected" line is three ways of saying the same
  // thing and it is the one that gives up its height. ui.css owns the rule;
  // this is only the hook, and it is off in every other state so "Searching",
  // "Connecting" and "Reconnecting" always have somewhere to be said.
  stageEl.classList.toggle('call-connected', connected);
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
  declareAudioSession();
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

// --- Loudspeaker routing -----------------------------------------------------
// A phone treats a live microphone capture as a phone call. Chrome on Android
// switches to the voice-call stream and iOS Safari puts WebKit's audio session
// into "play and record"; on both, the default output route for that mode is
// the receiver - the pinhole earpiece at the top of the handset. So a plain
// <audio> element carrying the remote track plays out of the earpiece, and the
// call is inaudible unless the phone is held against the ear, which is not what
// an audio-only chat room wants.
//
// A Web Audio graph is not a phone call. Audio that reaches
// AudioContext.destination plays on the ordinary media route - the
// loudspeaker - even while the mic is open. So the remote stream is played
// through the context that already analyses it for the orb, and the element is
// muted instead of being the thing you hear.
//
// The element stays attached rather than being torn down: Chrome only produces
// samples from createMediaStreamSource() on a WebRTC stream that is also bound
// to a media element, and it is what we fall back to the moment the graph is
// not actually running.
let speakerSink = null;          // gain node feeding the loudspeaker route
let speakerSource = null;        // the match's stream node, while it feeds that sink
let speakerRouteActive = false;  // true while the graph, not the element, is audible
let speakerRouteGivenUp = false; // this match tried the graph and it did not play

// Tell WebKit what kind of session this is instead of leaving it to infer one
// from the APIs we happen to call (iOS 17+). Declared once, before the first
// capture: flipping the type mid-session is what makes iOS lose the route
// altogether, so this never runs again once a type is set.
function declareAudioSession() {
  try {
    const session = navigator.audioSession;
    if (session && session.type === 'auto') session.type = 'play-and-record';
  } catch (_) { /* pre-iOS-17 and every non-WebKit browser: nothing to declare */ }
}

// Muting the element is only safe while the graph is genuinely running. A
// suspended context - a backgrounded tab, autoplay not yet unlocked by a tap -
// produces no sound at all, and muting against it would turn the call silent
// rather than merely quiet. Re-checked on every state change for that reason.
function syncSpeakerRoute(audioCtx) {
  speakerRouteActive = !!speakerSource && !speakerRouteGivenUp && audioCtx.state === 'running';
  if (remoteAudio) remoteAudio.muted = speakerRouteActive;
}

function routeRemoteToSpeaker(audioCtx, source) {
  try {
    // One sink per context, like the context itself: a node per match would
    // stack gain on every skip and leave the graph louder each time.
    if (!speakerSink || speakerSink.context !== audioCtx) {
      speakerSink = audioCtx.createGain();
      speakerSink.connect(audioCtx.destination);
      // A context that suspends mid-call (backgrounded tab, an incoming phone
      // call) stops playing without telling anyone, so the element has to be
      // handed the call back the moment that happens - and taken off it again
      // when the context comes back.
      audioCtx.onstatechange = () => syncSpeakerRoute(audioCtx);
    }
    // A fresh match gets a fresh verdict: whatever went wrong last time was
    // that call's problem, not a permanent one.
    speakerRouteGivenUp = false;
    speakerSource = source;
    source.connect(speakerSink);
    // Where the context can pick its own output device (Chrome 110+), ask for
    // the system default explicitly - a sink left set by an earlier call would
    // otherwise survive into this one.
    if (typeof audioCtx.setSinkId === 'function') audioCtx.setSinkId('').catch(() => {});
    syncSpeakerRoute(audioCtx);
  } catch (_) {
    // No Web Audio output available: leave the element unmuted and let the
    // earpiece have it. Quiet beats silent.
    releaseSpeakerRoute();
  }
}

// Hand the call back to the <audio> element. The graph has to be disconnected
// as well as un-muted: leaving both playing is the same voice out of the
// earpiece and the speaker a few milliseconds apart.
function releaseSpeakerRoute() {
  speakerRouteGivenUp = true;
  speakerRouteActive = false;
  if (speakerSource && speakerSink) {
    try { speakerSource.disconnect(speakerSink); } catch (_) { /* already detached */ }
  }
  speakerSource = null;
  if (remoteAudio) remoteAudio.muted = false;
}

// Playback can be refused if the tab lost its autoplay permission (a rejected
// play() is silent, not an error the user sees). Retry once on the next tap.
function playRemoteAudio() {
  if (!remoteAudio || !remoteAudio.play) return;
  // Unmuting here would double up on the loudspeaker route once it is live -
  // the same voice out of both the earpiece and the speaker.
  remoteAudio.muted = speakerRouteActive;
  const attempt = remoteAudio.play();
  if (!attempt || !attempt.catch) return;
  attempt.catch(() => {
    const retry = () => {
      document.removeEventListener('pointerdown', retry);
      // The same tap is the gesture a suspended context needs, and the graph is
      // where the loudspeaker route lives - resume it before falling back.
      if (visualizerCtx && visualizerCtx.state === 'suspended') {
        visualizerCtx.resume().then(() => syncSpeakerRoute(visualizerCtx)).catch(() => {});
      }
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
  hasHadAConversation = true;
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

// --- Auto-connect -----------------------------------------------------------
// A mode, not a preference buried in a drawer: it is what turns one call into
// an evening. It sits under the three round buttons as a plain switch, wired
// straight to the checkbox the rest of the app already reads and writes, so
// there is still exactly one source of truth.
if (autoCallCheckbox) {
  autoCallCheckbox.addEventListener('change', () => {
    vibrate(10);
    showToast(t(autoCallCheckbox.checked ? 'autoConnectOnToast' : 'autoConnectOffToast'));
  });
}

// --- The call screen's live waveform ---------------------------------------
// A voice call with a silent screen and a dead call look exactly the same.
// These bars are the proof that something is coming down the wire, and they
// are driven by the analyser monitorRemoteAudio already runs on the remote
// stream - so they cost one more read of numbers computed anyway, and they
// stop the moment that analyser does.
const callWaveEl = document.getElementById('callWave');
const CALL_WAVE_BARS = 28;
let callWaveBars = [];

function buildCallWave() {
  if (!callWaveEl || callWaveBars.length) return;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < CALL_WAVE_BARS; i++) {
    const bar = document.createElement('span');
    bar.className = 'tl-call-wave-bar';
    frag.appendChild(bar);
    callWaveBars.push(bar);
  }
  callWaveEl.appendChild(frag);
}

function drawCallWave(data) {
  if (!callWaveEl || callWaveEl.classList.contains('hidden')) return;
  buildCallWave();
  // The spectrum is bass-heavy, so the bars sample the lower half of it and
  // mirror around the middle - a symmetric shape reads as a voice, a
  // left-loaded one reads as a bar chart.
  const half = Math.ceil(CALL_WAVE_BARS / 2);
  for (let i = 0; i < half; i++) {
    const bin = Math.floor((i / half) * (data.length * 0.55));
    const v = Math.min(1, (data[bin] || 0) / 190);
    const h = Math.round(8 + v * 92);
    if (callWaveBars[half - 1 - i]) callWaveBars[half - 1 - i].style.height = h + '%';
    if (callWaveBars[half + i]) callWaveBars[half + i].style.height = h + '%';
  }
}

function resetCallWave() {
  callWaveBars.forEach((bar) => { bar.style.height = '8%'; });
}

function showCallWave(on) {
  if (!callWaveEl) return;
  buildCallWave();
  callWaveEl.classList.toggle('hidden', !on);
  if (!on) resetCallWave();
}

// --- More ------------------------------------------------------------------
// Report, reactions and auto-call are all things you decide about, not things
// you reach for mid-sentence, so they sit one tap away where an accidental
// tap cannot reach them.
const callMoreBtn = document.getElementById('callMoreBtn');
const callMoreSheet = document.getElementById('callMoreSheet');

function setCallMoreOpen(open) {
  if (!callMoreSheet || !callMoreBtn) return;
  callMoreSheet.classList.toggle('hidden', !open);
  callMoreBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  callMoreBtn.classList.toggle('is-open', open);
  // On a phone the call screen already fills the viewport, so the sheet opens
  // below the fold: the button said "expanded" and nothing appeared to happen.
  // It brings itself into view instead, clearing the tab bar via the
  // scroll-margin set on it in ui.css.
  if (!open || !callMoreSheet.scrollIntoView) return;
  const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  requestAnimationFrame(() => {
    callMoreSheet.scrollIntoView({ block: 'nearest', behavior: still ? 'auto' : 'smooth' });
  });
}

if (callMoreBtn) {
  callMoreBtn.addEventListener('click', () => {
    setCallMoreOpen(callMoreSheet.classList.contains('hidden'));
  });
}

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
    // resume() settles a tick later, and the loudspeaker route may not be muted
    // into the element until it has - so re-sync once it lands rather than
    // reading a state that is still 'suspended'.
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().then(() => syncSpeakerRoute(audioCtx)).catch(() => {});
    }
    // Release the previous match's graph so nodes don't pile up on the shared context.
    if (visualizerSource) {
      try { visualizerSource.disconnect(); } catch (_) { /* already detached */ }
      visualizerSource = null;
    }
    const source = audioCtx.createMediaStreamSource(stream);
    visualizerSource = source;
    // Play the remote voice out of the loudspeaker, not the earpiece.
    routeRemoteToSpeaker(audioCtx, source);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    // Guards the loudspeaker route below - see the check inside the tick.
    let graphEverHeard = false;
    let mutedTicks = 0;

    speakingCheckInterval = setInterval(() => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      const level = Math.min(1, avg / 90); // 0..1 normalized volume

      // Muting the element hands the whole call to the Web Audio graph, so a
      // browser that hands us a live-looking but sample-less source would make
      // the call completely silent. watchMediaFlow() already knows when RTP
      // audio is genuinely arriving; if it is, and the graph has still not seen
      // a single non-zero sample after five seconds, the graph is not playing
      // this call. Give it back to the element - the earpiece is a worse route,
      // not a dead one.
      if (avg > 0) graphEverHeard = true;
      if (speakerRouteActive && mediaConnected && !graphEverHeard) {
        if (++mutedTicks > 50) releaseSpeakerRoute();
      } else {
        mutedTicks = 0;
      }

      orb.classList.toggle('speaking', avg > 12);
      // The bars read the same spectrum the rings do - no second analyser,
      // no second timer, just one more use of numbers already computed.
      drawCallWave(data);

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
    // AudioContext may be unavailable; non-critical. The element is then the
    // only thing that can make sound, so make sure it is not left muted.
    releaseSpeakerRoute();
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
  // The next match re-routes from scratch; leaving the mute flag set would hand
  // it a muted element if the graph fails that time.
  releaseSpeakerRoute();
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
  syncNavCurrent();
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

// Back on the landing screen, by choice, with a conversation behind them:
// the one moment the "what would make this better?" card has a real answer
// to collect, and the one screen it can cover without costing anything.
// Deliberately not inside resetUI() - that also runs on a ban and on
// maintenance, and neither is a moment to ask for suggestions.
function wentHomeFromACall() {
  if (hasHadAConversation) offerDevNotice();
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
    // Signed in: the account's permanent friend ID arrives with the resume.
    signedIn: !!sessionToken,
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
  syncNavCurrent();
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
const closeAgeConsentBtn = document.getElementById('closeAgeConsentBtn');
const CONSENT_KEY = 'talklive_age_consent';

// --- The animal gate -------------------------------------------------------
// Nobody goes into a call faceless. The animal is the only thing the person
// on the other end sees before anyone has said a word, and it was optional -
// so most calls opened with two blanks looking at each other. Asked once,
// answered in one tap, and the tap goes straight on into whatever was being
// started. Whoever connects sees it, because it is the same choice the
// profile avatar is made of.
const animalGateModal = document.getElementById('animalGateModal');
const animalGateGrid = document.getElementById('animalGateGrid');
const closeAnimalGateBtn = document.getElementById('closeAnimalGateBtn');
let afterAnimalGate = null;

// Runs `next` once there is an animal - immediately if there already is one,
// otherwise after the gate has been answered. Returns true when it waited, so
// callers can stop and let the gate drive.
function requireAnimal(next) {
  if (myAnimal || !animalGateModal || !Animals) { next(); return false; }
  afterAnimalGate = next;
  renderAnimalPicker();
  openModal(animalGateModal);
  return true;
}

function closeAnimalGate(run) {
  const next = afterAnimalGate;
  afterAnimalGate = null;
  closeModal(animalGateModal);
  if (run && next) next();
}

if (animalGateGrid) {
  animalGateGrid.addEventListener('click', (e) => {
    const option = e.target.closest('.animal-option');
    if (!option || !option.dataset.animal) return;
    vibrate(8);
    // Never a toggle here: this gate exists to end with an animal chosen, and
    // tapping the already-selected one to clear it would close it with none.
    if (myAnimal !== option.dataset.animal) setMyAnimal(option.dataset.animal);
    // A beat so the tick is visibly on the one just tapped before the panel
    // goes, rather than the tap appearing to skip straight past the question.
    setTimeout(() => closeAnimalGate(true), 180);
  });
}

// "Surprise me" - the same outcome as tapping one, for whoever does not care
// which. It picks, shows the pick for the same beat a tapped one gets, and
// carries on into whatever the gate interrupted.
const animalSurpriseBtn = document.getElementById('animalSurpriseBtn');
if (animalSurpriseBtn) {
  animalSurpriseBtn.addEventListener('click', () => {
    vibrate(8);
    setMyAnimal(Animals.random());
    setTimeout(() => closeAnimalGate(true), 180);
  });
}

// Backing out. Nothing is stored, so it is still a gate next time - but the
// button that opened it has to come back to life, the way the consent gate's
// does, or "Tap to Talk" stays inert until the page is reloaded.
function dismissAnimalGate() {
  closeAnimalGate(false);
  startBtn.disabled = false;
  startBtn.classList.remove('is-connecting');
}
if (closeAnimalGateBtn) closeAnimalGateBtn.addEventListener('click', dismissAnimalGate);
if (animalGateModal) {
  animalGateModal.addEventListener('click', (e) => {
    if (e.target === animalGateModal) dismissAnimalGate();
  });
}

// Start a call from the big button - gated by the one-time age/terms consent,
// then the animal, then mic permission handled in begin().
function startCallFlow() {
  playTapSound();
  clearError();
  trackGrowthEvent('call_start_intent');
  if (localStorage.getItem(CONSENT_KEY) === 'yes') {
    requireAnimal(begin);
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

// --- Press feedback on the two landing cards. -----------------------------
// The CSS press (see .tl-action.is-pressed in ui.css) is driven from here
// rather than left to :active, because :active is the one state touch
// browsers will not commit to: iOS Safari holds it back until it has decided
// the touch is a tap and not the start of a scroll, which is precisely the
// ~100ms the feedback exists to fill. pointerdown fires immediately.
//
// The class is removed on pointerup/cancel/leave and on blur, so a press that
// turns into a scroll, a drag off the card, or a tab switch mid-touch cannot
// strand the card in its pressed state.
(function wireActionPress() {
  const cards = [startBtn, startChatBtn].filter(Boolean);
  if (!cards.length) return;

  const release = (card) => card.classList.remove('is-pressed');

  cards.forEach((card) => {
    card.addEventListener('pointerdown', (ev) => {
      // Primary button only - a right-click or a two-finger touch is not a tap.
      if (ev.button != null && ev.button !== 0) return;
      if (card.disabled || card.classList.contains('is-connecting')) return;
      card.classList.add('is-pressed');
      spawnRipple(card, ev);
    });
    ['pointerup', 'pointercancel', 'pointerleave', 'blur'].forEach((type) => {
      card.addEventListener(type, () => release(card));
    });
    // Keyboard activation gets the same press, briefly, so Enter and Space on
    // a focused card look like what a tap looks like.
    card.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      if (card.classList.contains('is-connecting')) return;
      card.classList.add('is-pressed');
    });
    card.addEventListener('keyup', () => release(card));
  });
})();

// The Tap-to-Talk landing card: same flow as the green Call button, guarded
// against double taps. The ripple and press already fired on pointerdown.
startBtn.addEventListener('click', () => {
  if (startBtn.disabled || startBtn.classList.contains('is-connecting')) return;
  startBtn.classList.remove('is-pressed');
  startBtn.classList.add('is-connecting');
  startCallFlow();
});

ageAgreeBtn.addEventListener('click', () => {
  localStorage.setItem(CONSENT_KEY, 'yes');
  closeModal(ageConsentModal);
  requireAnimal(() => {
    if (pendingInviteToken) joinVoiceInvite();
    else begin();
  });
});

// Backing out of the consent gate. Nothing is stored, so the gate is still a
// gate next time - but the button that opened it has to come back to life.
// It was put into its connecting state on the tap that opened the modal, and
// that state is also what guards against double taps, so leaving it set made
// "Tap to Talk" permanently inert until the page was reloaded.
function dismissAgeConsent() {
  closeModal(ageConsentModal);
  startBtn.disabled = false;
  startBtn.classList.remove('is-connecting');
}

closeAgeConsentBtn.addEventListener('click', dismissAgeConsent);
ageConsentModal.addEventListener('click', (e) => {
  if (e.target === ageConsentModal) dismissAgeConsent();
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
    requireAnimal(joinVoiceInvite);
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
    cancelOutgoingCallBack();
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

// --- The person on the call, as a profile ---------------------------------
// Their name or animal on the call screen and in the in-call chat header opens
// the same profile sheet as everywhere else: add, report and block live there.
function openPartnerProfile() {
  const p = currentPartner;
  if (!p || !p.clientId) return;
  openUserProfile({
    clientId: p.clientId,
    username: p.username,
    countryCode: p.countryCode,
    avatar: p.animal ? ANIMAL_AVATAR_PREFIX + p.animal : null,
  });
}
[chatPeerAvatar, document.getElementById('chatPeer'),
  document.getElementById('partnerAnimal'), document.getElementById('partnerName'),
  document.getElementById('partnerMeta')].forEach((el) => {
  if (!el) return;
  el.addEventListener('click', openPartnerProfile);
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPartnerProfile(); }
  });
});

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
// Put the caret in the box the person is about to type in - on a match, and
// whenever anything with a composer opens. Two details it has to get right,
// both of which used to make a plain .focus() do nothing:
//   - the box is usually revealed in the same tick (the side panels animate in
//     from visibility:hidden, and a hidden element cannot take focus), so the
//     call waits for the frame after the style lands;
//   - a disabled input silently refuses focus, so callers re-enable first.
//
// This used to skip touch devices on the grounds that the keyboard would leap
// up over the conversation. It does not skip them any more: on a chat you
// opened on purpose, or a stranger who has just connected, typing is the
// entire next thing you are going to do, and making everyone tap the box
// first was a tap charged to every single message.
//
// What it will not do is take focus away from something else: if the person
// is already typing somewhere, or a dialog is up over the top, the caret
// stays where it is.
function focusComposer(el) {
  if (!el || el.disabled) return;
  const active = document.activeElement;
  if (active && active !== document.body && active !== el
      && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) return;
  if (document.querySelector('.modal-overlay:not(.hidden)')) return;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (el.disabled) return;
    if (document.querySelector('.modal-overlay:not(.hidden)')) return;
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
  chatPanel.style.bottom = '';
  chatPanel.style.maxHeight = '';
  chatPanel.style.height = '';
  chatPanel.style.top = '';
  updateScrollLock();
}

function scrollChatToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Keep the phone chat sheet clear of the on-screen keyboard. A position:fixed
// panel sits against the window, not the *visual* viewport, so on iOS it stays
// put and the keyboard covers the composer.
//
// This used to stretch the panel to the full visual viewport, which is right
// for a full-screen drawer and wrong for a sheet - it undid the sheet's height
// and put it back over the whole call. So it lifts the sheet by however much
// the keyboard is eating instead, and only caps the height if the sheet no
// longer fits above it.
function syncChatViewport() {
  const vv = window.visualViewport;
  if (!chatOpen || !vv || window.innerWidth > 767) {
    chatPanel.style.bottom = '';
    chatPanel.style.maxHeight = '';
    chatPanel.style.height = '';
    chatPanel.style.top = '';
    return;
  }
  const keyboard = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
  chatPanel.style.bottom = keyboard + 'px';
  // Leave a strip of the call visible above the sheet whatever the keyboard
  // does - that strip is the reason this is a sheet and not a page.
  chatPanel.style.maxHeight = Math.round(vv.height * 0.88) + 'px';
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

// --- Putting the sheet away --------------------------------------------------
// On a phone the chat is a sheet sitting over a live call, and the gesture for
// a sheet is to push it back down - nobody has to be taught that one. The sheet
// tracks the finger the whole way rather than snapping shut at a threshold, so
// a half-hearted drag visibly springs back instead of silently doing nothing.
//
// The drag starts from the grab handle or from the header, never from the
// message list: dragging inside a scrollable list is how you scroll it, and
// the two gestures must not fight.
//
// Wider than 767px the panel is a docked window with nowhere to go, so nothing
// here applies; the old rightward swipe is kept for that case.
function makeSheetDismissable(panel, close) {
  if (!panel) return;
  const CLOSE_AT = 90;      // px dragged down before it stays closed
  const FLICK = 0.5;        // px/ms - a fast flick closes from anywhere
  let startY = null;
  let startX = 0;
  let startT = 0;
  let dy = 0;
  let dragging = false;

  const isSheet = () => window.matchMedia('(max-width: 767px)').matches;
  const fromGrip = (target) => !!(target.closest && target.closest('.tl-sheet-grip, .side-panel-header'));

  function reset() {
    panel.classList.remove('is-dragging');
    panel.style.transform = '';
    startY = null;
    dragging = false;
    dy = 0;
  }

  panel.addEventListener('touchstart', (e) => {
    if (!panel.classList.contains('open')) return;
    startY = e.touches[0].clientY;
    startX = e.touches[0].clientX;
    startT = Date.now();
    dy = 0;
    // A drag only counts from the handle or the header; a button in the header
    // is still a button.
    dragging = isSheet() && fromGrip(e.target) && !e.target.closest('button');
  }, { passive: true });

  panel.addEventListener('touchmove', (e) => {
    if (startY === null) return;
    const y = e.touches[0].clientY;
    const x = e.touches[0].clientX;
    dy = y - startY;

    if (dragging) {
      // Downward only. Pulling up on a sheet that is already at the top has
      // nowhere to go, so it does not move.
      panel.classList.add('is-dragging');
      panel.style.transform = 'translateY(' + Math.max(0, dy) + 'px)';
      return;
    }

    // Docked window: the old mostly-horizontal rightward swipe.
    if (!isSheet() && x - startX > 70 && Math.abs(x - startX) > Math.abs(dy)) {
      startY = null;
      close();
    }
  }, { passive: true });

  function end() {
    if (dragging) {
      const speed = dy / Math.max(1, Date.now() - startT);
      const shouldClose = dy > CLOSE_AT || (dy > 24 && speed > FLICK);
      // Hand the transform back to the stylesheet before deciding, so the
      // sheet animates from where the finger left it either way.
      panel.classList.remove('is-dragging');
      panel.style.transform = '';
      if (shouldClose) close();
    }
    reset();
  }
  panel.addEventListener('touchend', end);
  panel.addEventListener('touchcancel', end);
}

makeSheetDismissable(chatPanel, closeChatPanel);
// The friend chat is the same sheet on a phone, so it puts away the same way.
makeSheetDismissable(friendChatModal, () => {
  closeSidePanel(friendChatModal, friendChatOverlay);
  activeFriendChatId = null;
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
    && !settingsIsOpen()
    && !filtersPanel.classList.contains('open')
    && !friendsDropdown.classList.contains('open')
    && !friendProfileModal.classList.contains('open')
    && !friendChatModal.classList.contains('open')
    && gameOverlay.classList.contains('hidden')
    && !historyPanel.classList.contains('open')
    && !document.querySelector('.modal-overlay:not(.hidden)');
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
socket.on('chat-blocked', ({ reason, scope, id, toClientId } = {}) => {
  if (scope === 'friend' && id && friendOutbox.has(id)) {
    const entry = friendOutbox.get(id);
    // Too fast, usually a backlog flushed on reconnect: wait and go again.
    if (reason === 'rate' && entry.tries < FRIEND_SEND_MAX_TRIES) {
      clearTimeout(entry.timer);
      entry.timer = setTimeout(() => emitOutbox(id), 2500 * entry.tries);
      return;
    }
    dropFriendMessage(id);
    if (activeFriendChatId !== toClientId) return;
  }
  const target = friendChatModal.classList.contains('open') ? friendChatMessages : chatMessages;
  const el = document.createElement('div');
  el.className = 'chat-msg system';
  el.textContent = reason === 'call-required' ? t('errCallRequiredToChat')
    : reason === 'unreachable' ? t('errCantMessage')
    : reason === 'unsafe' ? t('errUnsafeMessage')
    : reason === 'rate' ? t('errSlowDown') : t('errNoLinks');
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
    // The two gates in front of a call leave the Start button in its
    // connecting state, which is also what guards against double taps - so
    // closing one from here has to go through its own dismiss or "Tap to
    // Talk" stays inert until the page is reloaded.
    if (openModalEl === animalGateModal) { dismissAnimalGate(); return true; }
    if (openModalEl === ageConsentModal) { dismissAgeConsent(); return true; }
    closeModal(openModalEl);
    return true;
  }
  if (navDrawer && !navDrawer.classList.contains('hidden')) { setNavDrawerOpen(false); return true; }
  if (!gameOverlay.classList.contains('hidden')) { attemptCloseGame(); return true; }
  if (chatOpen) { closeChatPanel(); return true; }
  if (settingsIsOpen()) { closeAppSettings(); return true; }
  if (filtersPanel.classList.contains('open')) { closeFilters(); return true; }
  if (friendChatModal.classList.contains('open')) { closeSidePanel(friendChatModal, friendChatOverlay); activeFriendChatId = null; return true; }
  if (friendProfileModal.classList.contains('open')) { closeSidePanel(friendProfileModal, friendProfileOverlay); return true; }
  if (friendsDropdown.classList.contains('open')) { closeSidePanel(friendsDropdown, friendsOverlay); updateScrollLock(); return true; }
  if (historyPanel.classList.contains('open')) { closeHistoryPanel(); return true; }
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
  // Settings is a real history entry, so Back leaves it the ordinary way -
  // and it is handled before closeTopmostLayer(), which would otherwise pop a
  // second entry for the same press and skip a page.
  if (settingsIsOpen() && location.pathname !== '/settings') { closeAppSettings(true); return; }
  if (closeTopmostLayer()) { primeBackGuard(); updateScrollLock(); return; }
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
  // Still on the call screen with no call running - a hang-up leaves you here,
  // looking at a green Call button. Back means "out of this screen", so it
  // goes to the Tap-to-Talk landing rather than off the site. Without this the
  // press ate the guard entry silently: the screen did not change, the URL
  // quietly became "/", and the next press left the app from what still looked
  // like the call screen.
  if (!callPanel.classList.contains('hidden')) {
    resetUI();
    wentHomeFromACall();
    primeBackGuard();
    return;
  }
  // Idle on the landing with nothing open - let this back actually leave.
});
primeBackGuard();

// A page restored from the back/forward cache keeps whatever classes it had
// when it was frozen, including a scroll lock belonging to a panel that is no
// longer open. Re-deriving it on restore is the cheap way to never hand
// somebody back a page they cannot scroll.
window.addEventListener('pageshow', updateScrollLock);

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


// --- The nav rail and the activity rail -------------------------------------
// The nav's tool buttons are the real ones - moved out of the header rail, not
// copied - so Friends, History, Filters and Settings need no wiring here; they
// are the same elements their handlers were already bound to. What is new is
// everything that had nowhere to live before: Home, Shop, and the rail.
const navHomeBtn = document.getElementById('navHomeBtn');
const navShopBtn = document.getElementById('navShopBtn');
const railOnlineCountEl = document.getElementById('railOnlineCount');
const railOnlineList = document.getElementById('railOnlineList');
const railHistoryList = document.getElementById('railHistoryList');
const railFriendsList = document.getElementById('railFriendsList');
const railStartBtn = document.getElementById('railStartBtn');

if (navHomeBtn) {
  navHomeBtn.addEventListener('click', () => {
    // Mid-call, Home means "back to the landing screen", which is what the
    // brand lockup already means. Off a call there is nowhere to go, so it is
    // the same no-op scroll-to-top the reference designs give it.
    //
    // It used to do that by setting location.href, which reloads the whole
    // app: a white flash, a dropped socket, a fresh handshake, and every panel
    // and filter in the page thrown away - to move between two screens that
    // are both already in the document. resetUI() is the same trip without
    // leaving the page.
    if (!settingsIsOpen() && callPanel.classList.contains('hidden')) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (settingsIsOpen()) closeAppSettings();
    if (!callPanel.classList.contains('hidden')) {
      const live = callState === 'connected' || callState === 'connecting'
        || callState === 'reconnecting' || callState === 'searching';
      // Never drop a live call on a nav tap without asking - the same question
      // the Back button asks, so the two ways out of a call behave alike.
      if (live) {
        showConfirm({
          title: 'confirmEndCallTitle', text: 'confirmEndCallText',
          okKey: 'hangUp', cancelKey: 'keepTalking', okClass: 'btn-danger',
        }).then((ok) => {
          if (!ok) return;
          socket.emit('leave');
          resetUI();
          wentHomeFromACall();
        });
        return;
      }
      resetUI();
      wentHomeFromACall();
    }
    window.scrollTo({ top: 0 });
  });
}

if (navShopBtn) navShopBtn.addEventListener('click', openShop);

// --- The phone drawer -------------------------------------------------------
// Everything the bottom bar has no room for. It is phone-only: on a desktop
// the nav rail shows all of it outright, and a drawer there would be a door
// in front of an open room.
const navMoreBtn = document.getElementById('navMoreBtn');
const navDrawer = document.getElementById('navDrawer');
const navDrawerOverlay = document.getElementById('navDrawerOverlay');
const closeNavDrawerBtn = document.getElementById('closeNavDrawerBtn');

function setNavDrawerOpen(open) {
  if (!navDrawer) return;
  navDrawer.classList.toggle('hidden', !open);
  navDrawer.classList.toggle('open', open);
  navDrawerOverlay.classList.toggle('hidden', !open);
  // Through updateScrollLock(), never straight onto the body: closing the
  // drawer used to clear the lock outright, which unfroze the page behind
  // whatever else was still open over it.
  updateScrollLock();
  if (open && closeNavDrawerBtn) closeNavDrawerBtn.focus();
}

if (navMoreBtn) {
  navMoreBtn.addEventListener('click', () => setNavDrawerOpen(navDrawer.classList.contains('hidden')));
  closeNavDrawerBtn.addEventListener('click', () => setNavDrawerOpen(false));
  navDrawerOverlay.addEventListener('click', () => setNavDrawerOpen(false));
  // Anything picked in here goes somewhere else, so the drawer closes behind
  // it - a drawer left open over the screen it just opened is a second thing
  // to dismiss. The [data-opens] proxy handler does the navigation itself.
  navDrawer.addEventListener('click', (e) => {
    if (e.target.closest('[data-opens], a')) setNavDrawerOpen(false);
  });
}

// The theme chips write through the same applyTheme() the Settings control
// does, so the two can never disagree about which theme is on.
const drawerThemes = document.getElementById('drawerThemes');
function syncDrawerTheme() {
  if (!drawerThemes) return;
  drawerThemes.querySelectorAll('[data-theme-pick]').forEach((chip) => {
    chip.classList.toggle('selected', chip.dataset.themePick === currentTheme);
  });
}
if (drawerThemes) {
  drawerThemes.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-theme-pick]');
    if (!chip) return;
    applyTheme(chip.dataset.themePick);
    syncDrawerTheme();
    vibrate(8);
  });
  syncDrawerTheme();
}

// --- Progressive disclosure (fix list 2.3, flag: progressiveDisclosure) ------
// A first-time visitor came for one thing: to talk to someone. With the flag
// on, their first session shows the two start actions and a "More" drawer;
// Friends, Call History, Shop and Settings live in the drawer, the rail and the
// Premium card are hidden, and "Add friend" leaves the call controls to come
// back as a prompt after a call that went well. Games were already in-call only
// (the game button appears when a call connects), so they need no change.
//
// Returning visitors, signed-in users and everyone with the flag off see the
// app exactly as before. Either way a first-time session reports which arm it
// was in and which of those surfaces it opened in its first two minutes, as
// fv_on_* / fv_off_* counters on the owner dashboard (server GROWTH_EVENTS).
//
// QA: ?ff=progressiveDisclosure forces the flag on for this browser,
// ?ff=-progressiveDisclosure forces it off, ?ff= clears the override, and
// ?fv=1 treats this session as a first visit.
const FV_FIRST_SEEN_KEY = 'tl_first_seen_at';
const FV_SESSION_KEY = 'tl_fv_session';
const FV_WINDOW_MS = 2 * 60 * 1000;

function featureFlag(name) {
  let override = null;
  try {
    const q = new URLSearchParams(location.search);
    if (q.has('ff')) localStorage.setItem('tl_ff', q.get('ff'));
    override = localStorage.getItem('tl_ff');
  } catch (_) {}
  if (override === name) return true;
  if (override === `-${name}`) return false;
  return !!(window.TL_FLAGS && window.TL_FLAGS[name]);
}

// First visit = this browser had never loaded TalkLive before this session
// started, and nobody is signed in. Decided once per tab session, so a
// reload does not flip someone from "first-time" to "returning" mid-visit.
function isFirstTimeSession() {
  try {
    if (new URLSearchParams(location.search).get('fv') === '1') sessionStorage.setItem(FV_SESSION_KEY, '1');
    const decided = sessionStorage.getItem(FV_SESSION_KEY);
    if (decided !== null) return decided === '1';
    const first = !localStorage.getItem(FV_FIRST_SEEN_KEY) && !localStorage.getItem(CONSENT_KEY)
      && !sessionToken;
    if (!localStorage.getItem(FV_FIRST_SEEN_KEY)) localStorage.setItem(FV_FIRST_SEEN_KEY, String(Date.now()));
    sessionStorage.setItem(FV_SESSION_KEY, first ? '1' : '0');
    return first;
  } catch (_) {
    return false;
  }
}

const fvFirstTime = isFirstTimeSession();
const fvOn = fvFirstTime && featureFlag('progressiveDisclosure');
const fvStartedAt = Date.now();

function fvTrack(what) {
  if (!fvFirstTime) return;
  const name = `fv_${fvOn ? 'on' : 'off'}_${what}`;
  try {
    const sent = JSON.parse(sessionStorage.getItem('tl_fv_sent') || '[]');
    if (sent.includes(name)) return;
    sent.push(name);
    sessionStorage.setItem('tl_fv_sent', JSON.stringify(sent));
  } catch (_) { /* at worst an event is counted twice */ }
  trackGrowthEvent(name);
}

if (fvFirstTime) {
  fvTrack('session');
  [['friendsBtn', 'friends'], ['historyBtn', 'history'], ['navShopBtn', 'shop'],
    ['appSettingsBtn', 'settings'], ['gameBtn', 'games']].forEach(([id, what]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', () => {
      if (Date.now() - fvStartedAt <= FV_WINDOW_MS) fvTrack(`open_${what}`);
    });
  });
}

if (fvOn) {
  document.documentElement.classList.add('tl-fv');
  const addFriendWrap = addFriendBtn.closest('.call-action-wrap');
  if (addFriendWrap) addFriendWrap.classList.add('tl-fv-hide');
  if (navMoreBtn) {
    navMoreBtn.addEventListener('click', () => {
      if (Date.now() - fvStartedAt <= FV_WINDOW_MS) fvTrack('open_more');
    });
  }
}

// "Add friend", asked at the one moment it makes sense: right after a call
// that went well (a minute or more), with someone who is not already a friend.
// Returns true when it took the slot the share prompt would otherwise use.
const FV_GOOD_CALL_SECONDS = 60;
function maybeShowFriendPrompt(partner, durationSeconds) {
  if (!fvOn || durationSeconds < FV_GOOD_CALL_SECONDS) return false;
  if (!partner || !partner.clientId) return false;
  if (friendsData.some((f) => f.clientId === partner.clientId)) return false;
  if (addFriendBtn.classList.contains('added')) return false;
  const target = { clientId: partner.clientId, username: partner.username || '' };
  fvTrack('friend_prompt');
  let card = document.getElementById('friendPromptCard');
  if (card) card.remove();
  card = document.createElement('div');
  card.id = 'friendPromptCard';
  card.className = 'share-prompt';
  card.innerHTML = `
    <h3></h3><p></p>
    <div class="share-prompt-actions">
      <button type="button" class="share-prompt-yes"></button>
      <button type="button" class="share-prompt-no"></button>
    </div>`;
  card.querySelector('h3').textContent = t('fvFriendPromptTitle', { name: target.username || t('stranger') });
  card.querySelector('p').textContent = t('fvFriendPromptBody');
  const yes = card.querySelector('.share-prompt-yes');
  const no = card.querySelector('.share-prompt-no');
  yes.textContent = t('addFriend');
  no.textContent = t('sharePromptLater');
  const dismiss = () => { card.classList.remove('show'); setTimeout(() => card.remove(), 300); };
  no.addEventListener('click', dismiss);
  yes.addEventListener('click', () => {
    dismiss();
    fvTrack('friend_prompt_add');
    socket.emit('friend-request', { targetClientId: target.clientId });
    showToast(t('friendRequestSent'));
  });
  document.body.appendChild(card);
  requestAnimationFrame(() => card.classList.add('show'));
  setTimeout(() => { if (card.isConnected) dismiss(); }, 15000);
  return true;
}

// "See all" on a rail card opens the panel that owns the full list, by
// clicking the nav button that owns the panel - one path into each panel,
// rather than a second copy of its open/close logic living out here.
document.querySelectorAll('[data-opens]').forEach((el) => {
  el.addEventListener('click', () => {
    const target = document.getElementById(el.dataset.opens);
    if (target) target.click();
  });
});

// The rail's green CTA is the hero's voice card, said again at the point where
// someone has just finished reading who is online.
// --- "Notify me" -------------------------------------------------------------
// Premium and the coin shop are announced, not on sale, so the only honest
// button on either card is one that does something today. This one asks for
// push permission through the flow that already exists (pwa.js owns the
// service worker, the VAPID key and the /push/subscribe call), and records the
// interest either way - a browser that refuses notifications still told us
// somebody wanted this.
//
// It never claims more than it did: the button says "we will tell you" only
// once a subscription actually exists.
function markNotified(btn, key) {
  btn.classList.add('is-notified');
  btn.disabled = true;
  const label = btn.querySelector('span');
  if (label) label.textContent = t(key);
}

document.querySelectorAll('[data-notify]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    trackGrowthEvent('premium_notify_click');
    vibrate(15);
    const pwa = window.TalkLivePWA;
    if (!pwa || typeof pwa.askForPush !== 'function' || !('Notification' in window)) {
      // No push on this browser at all. The interest is still recorded, and
      // the button says what actually happened rather than pretending.
      markNotified(btn, 'notifyNoted');
      showToast(t('notifyNotedToast'));
      return;
    }
    try { await pwa.askForPush(); } catch (_) { /* denied or unavailable */ }
    if (Notification.permission === 'granted') {
      markNotified(btn, 'notifyDone');
      showToast(t('notifyDoneToast'));
    } else {
      markNotified(btn, 'notifyNoted');
      showToast(t('notifyNotedToast'));
    }
  });
});

// --- Header search ----------------------------------------------------------
// TalkLive has no feed and no profiles to search through, so a box promising
// "search people, countries or interests" has to mean something concrete. It
// means: narrow the Online now rail to what you typed, and if what you typed
// is a country, offer to go looking there.
const headerSearchForm = document.getElementById('headerSearchForm');
const headerSearchInput = document.getElementById('headerSearchInput');
const headerSearchClear = document.getElementById('headerSearchClear');
let onlineQuery = '';

function matchedCountryCode(query) {
  const q = query.trim().toLowerCase();
  if (q.length < 2 || typeof COUNTRIES !== 'object') return null;
  let exact = null;
  let prefix = null;
  for (const code of Object.keys(COUNTRIES)) {
    const name = String(COUNTRIES[code]).toLowerCase();
    if (name === q) { exact = code; break; }
    if (!prefix && name.startsWith(q)) prefix = code;
  }
  return exact || prefix;
}

if (headerSearchForm) {
  headerSearchInput.addEventListener('input', () => {
    onlineQuery = headerSearchInput.value.trim().toLowerCase();
    headerSearchClear.classList.toggle('hidden', onlineQuery === '');
    renderRailOnline();
  });
  headerSearchClear.addEventListener('click', () => {
    headerSearchInput.value = '';
    onlineQuery = '';
    headerSearchClear.classList.add('hidden');
    renderRailOnline();
    headerSearchInput.focus();
  });
  headerSearchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = matchedCountryCode(headerSearchInput.value);
    if (code) { searchCountry(code, COUNTRIES[code]); return; }
    // Not a country: treat it as an interest, which the filters already take.
    const interest = headerSearchInput.value.trim().slice(0, 40);
    if (!interest) return;
    appliedFilters = Object.assign({}, appliedFilters, { interests: [interest] });
    persistAppliedFilters();
    syncFilterDraftUiFromApplied();
    registerProfile();
    showToast(t('searchInterest', { interest }));
    startBtn.click();
  });
}

function persistAppliedFilters() {
  try { sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(appliedFilters)); } catch (_) { /* private mode */ }
}

// One country, replacing whatever was in the include list: a shortcut, not an
// edit of filters someone sat down and set. Saved the way Save saves, so the
// search that starts next uses it and the Filters panel shows the truth.
function searchCountry(code, countryName) {
  appliedFilters = Object.assign({}, appliedFilters, { includeCountries: [code] });
  persistAppliedFilters();
  syncFilterDraftUiFromApplied();
  registerProfile();
  showToast(t('railFindIn', { country: getCountryName(code) || countryName || code }));
  startBtn.click();
}

if (railStartBtn) railStartBtn.addEventListener('click', () => startBtn.click());

document.querySelectorAll('.js-share-talklive').forEach((el) => {
  el.addEventListener('click', showSharePrompt);
});

// Which section the nav is pointing at. Only Home and "a panel is open" are
// real states today; the panels set their own while they are open.
const tlFrameEl = document.querySelector('.tl-frame');

// Which screen the nav is pointing at, and how wide that screen gets.
function syncNavCurrent() {
  const home = !setupPanel.classList.contains('hidden');
  const onSettings = settingsIsOpen();
  // Anything that is not the home screen gets the whole width. The activity
  // rail is a home-screen thing: a column of "who you talked to before"
  // alongside the person you are talking to now is noise, and so is one
  // beside a settings form.
  if (tlFrameEl) tlFrameEl.classList.toggle('is-call', !home);

  const mark = (btn, on) => {
    if (!btn) return;
    btn.classList.toggle('is-current', on);
    if (on) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  };
  mark(navHomeBtn, home);
  mark(appSettingsBtn, onSettings);
}

// --- The rail's two lists ---------------------------------------------------
// Compact renders of data the panels already hold, so there is no second
// source of truth: both are called from the same place the panel list is.

function renderRailHistory() {
  if (!railHistoryList) return;
  const entries = historyEntries();
  if (entries.length === 0) {
    railHistoryList.innerHTML = `<p class="tl-rail-empty">${escapeHtml(t('railNoCalls'))}</p>`;
    return;
  }
  railHistoryList.innerHTML = '';
  entries.slice(0, 4).forEach((entry) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'tl-rail-row history-profile-btn';
    row.dataset.id = entry.clientId || '';
    row.title = t('openProfile');
    row.innerHTML = `
      <span class="tl-rail-row-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
      </span>
      <span class="tl-rail-row-text">
        <strong>${getFlagImg(entry.countryCode)} ${escapeHtml(entry.username)}</strong>
        <small>${escapeHtml(historySubline(entry))}</small>
      </span>
    `;
    railHistoryList.appendChild(row);
  });
}

function renderRailFriends() {
  if (!railFriendsList) return;
  if (friendsData.length === 0) {
    railFriendsList.innerHTML = `<p class="tl-rail-empty">${escapeHtml(t('railNoFriends'))}</p>`;
    return;
  }
  railFriendsList.innerHTML = '';
  // Online first: the only ones you can do anything with right now.
  [...friendsData]
    .sort((a, b) => Number(!!b.online) - Number(!!a.online))
    .slice(0, 5)
    .forEach((f) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'tl-rail-row friend-avatar-btn';
      row.dataset.id = f.clientId;
      row.title = t('profile');
      row.innerHTML = `
        <span class="tl-rail-row-icon" aria-hidden="true">
          ${genderIcon(f.avatar, 18)}
          <span class="tl-rail-presence${f.online ? ' is-online' : ''}"></span>
        </span>
        <span class="tl-rail-row-text">
          <strong>${getFlagImg(f.countryCode)} ${escapeHtml(friendLabel(f))}</strong>
          <small>${escapeHtml(f.online ? t('online') : t('offline'))}</small>
        </span>
      `;
      railFriendsList.appendChild(row);
    });
}

// The rows carry the same data-id and class the panel rows do, so the profile
// opens the same way from either place.
if (railHistoryList) {
  railHistoryList.addEventListener('click', (e) => {
    const btn = e.target.closest('.history-profile-btn');
    if (!btn || !btn.dataset.id) return;
    // openUserProfile takes a person, not an id - handed the bare id it
    // returned without doing anything, so these rows were dead to the touch.
    const entry = historyEntries().find((h) => h.clientId === btn.dataset.id);
    openUserProfile(entry || { clientId: btn.dataset.id });
  });
}
if (railFriendsList) {
  railFriendsList.addEventListener('click', (e) => {
    const btn = e.target.closest('.friend-avatar-btn');
    if (btn && btn.dataset.id) openFriendProfile(btn.dataset.id);
  });
}

// --- Online now -------------------------------------------------------------
// A sample of who is in the queue, as the server publishes it: the random
// username, the country, the avatar and animal they picked for strangers to
// see - the same things a match reveals the moment you connect. Nobody who
// turned their status off is in it, and nobody mid-call.
//
// Tapping a row is not "call this person": TalkLive matches at random and
// there is no way to dial someone. It searches their country instead, which
// is the real thing the list makes possible.
let onlinePeople = [];

function filteredOnlinePeople() {
  if (!onlineQuery) return onlinePeople;
  return onlinePeople.filter((p) => [p.username, p.country, p.countryCode]
    .some((v) => String(v || '').toLowerCase().includes(onlineQuery)));
}

function renderRailOnline() {
  if (!railOnlineList) return;
  const people = filteredOnlinePeople();
  if (people.length === 0) {
    railOnlineList.innerHTML = `<p class="tl-rail-empty">${escapeHtml(t(onlineQuery ? 'railNoMatch' : 'railNoOne'))}</p>`;
    return;
  }
  railOnlineList.innerHTML = '';
  people.slice(0, 8).forEach((person) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'tl-rail-row tl-rail-person';
    row.dataset.country = person.countryCode || '';
    row.dataset.countryName = person.country || '';
    // A country the server could not place comes back as "Unknown"/"XX" -
    // no place is better than a wrong one. Named in the visitor's language.
    const placed = person.countryCode && person.countryCode !== 'XX' && person.country !== 'Unknown'
      ? (getCountryName(person.countryCode) || person.country || '') : '';
    row.title = placed ? t('railFindIn', { country: placed }) : '';
    const face = (person.animal && Animals && Animals.has(person.animal))
      ? Animals.icon(person.animal, 22)
      : genderIcon(person.avatar, 18);
    const genderLabel = person.gender === 'male' ? t('male')
      : person.gender === 'female' ? t('female')
      : '';
    const meta = [genderLabel, placed].filter(Boolean).join(' · ') || t('railSomewhere');
    row.innerHTML = `
      <span class="tl-rail-row-icon" aria-hidden="true">
        ${face}
        <span class="tl-rail-presence is-online"></span>
      </span>
      <span class="tl-rail-row-text">
        <strong>${getFlagImg(person.countryCode)} ${escapeHtml(person.username)}</strong>
        <small>${escapeHtml(meta)}</small>
      </span>
      <span class="tl-rail-row-go" aria-hidden="true">
        ${person.waiting
          ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>'}
      </span>
    `;
    railOnlineList.appendChild(row);
  });
}

if (railOnlineList) {
  railOnlineList.addEventListener('click', (e) => {
    const row = e.target.closest('.tl-rail-person');
    if (!row || !row.dataset.country) return;
    searchCountry(row.dataset.country, row.dataset.countryName);
  });
}

// First paint. Every list is empty on a fresh visit, and an empty card that
// says nothing reads as a card that failed to load - so they are rendered once
// here rather than only when their first row arrives. After this they refresh
// from renderHistory() / renderFriendsList(), including on a language change.
renderRailOnline();
renderRailHistory();
renderRailFriends();

// --- Socket events ---
socket.on('online-people', (people) => {
  onlinePeople = Array.isArray(people) ? people : [];
  renderRailOnline();
});

socket.on('online-count', (count) => {
  lastOnlineCount = count;
  if (railOnlineCountEl) railOnlineCountEl.textContent = count;
});

// Visitors in the last 24 hours, not people online this second: a live count
// on a quiet minute says "two online" and reads as a dead site, where the day's
// footfall is both truer to the traffic and stable enough to be worth showing.
socket.on('visitor-count', (count) => {
  if (visitorCountEl) visitorCountEl.textContent = formatVisitorCount(count);
  // The lockup's live line ships as a grey dot and an em dash - "0 visitors" on
  // first paint reads as "nobody is here". The first real count lights it up.
  if (brandLiveEl) brandLiveEl.classList.remove('is-waiting');
});

// 1_240 visitors is a wider number than the lockup has room for; 1.2k is not.
function formatVisitorCount(count) {
  const n = Number(count) || 0;
  if (n < 1000) return String(n);
  if (n < 10000) return (Math.floor(n / 100) / 10).toFixed(1).replace(/\.0$/, '') + 'k';
  return Math.floor(n / 1000) + 'k';
}

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
  clearOutgoingCallBack();
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
  // No country when the geo lookup found nothing: the server sends 'XX' /
  // 'Unknown', and "Connecting to someone in Unknown…" is worse than just
  // saying we are connecting.
  else if (partner.countryCode && partner.countryCode !== 'XX') {
    setStatusText('statusConnectingTo', { country: getCountryName(partner.countryCode) || partner.country });
  } else setStatusText('statusConnecting');
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
  syncAddFriendBtn();
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

// The call-back this user is ringing out on, if any. It used to spin forever
// when nobody answered, and cancelling left the other side's banner offering
// a call nobody was waiting on.
const CALLBACK_RING_MS = 45000;
let outgoingCallBack = null; // { targetClientId, timer }

function clearOutgoingCallBack() {
  if (!outgoingCallBack) return;
  clearTimeout(outgoingCallBack.timer);
  outgoingCallBack = null;
}

// Take the ask back on the server (and so off their screen).
function cancelOutgoingCallBack() {
  if (!outgoingCallBack) return;
  socket.emit('call-back-cancel', { targetClientId: outgoingCallBack.targetClientId });
  clearOutgoingCallBack();
}

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

  clearOutgoingCallBack();
  outgoingCallBack = {
    targetClientId,
    timer: setTimeout(() => {
      if (!outgoingCallBack || outgoingCallBack.targetClientId !== targetClientId) return;
      cancelOutgoingCallBack();
      if (activeCallbackSpinner) {
        isSearching = false;
        if (localStream) {
          localStream.getTracks().forEach((tr) => tr.stop());
          localStream = null;
        }
        restoreCallbackSpinner();
      } else {
        abandonCallBack();
      }
      showToast(t('callbackNoAnswer'));
    }, CALLBACK_RING_MS),
  };
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
  showCallBackBanner(fromClientId, labelForClientId(fromClientId, username));
});

// The caller hung up before we answered: stop offering the call.
socket.on('call-back-cancelled', ({ fromClientId } = {}) => {
  if (pendingCallBackFrom === fromClientId) hideCallBackBanner();
  notifData = notifData.filter((n) => !(n.type === 'call_back_request' && n.fromClientId === fromClientId));
  renderNotifications();
});

socket.on('call-back-request-result', ({ ok, reason }) => {
  if (ok) return;
  clearOutgoingCallBack();
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
    } else if (reason === 'away') {
      showToast(t('callbackAway'));
    } else if (reason === 'calls-off') {
      showToast(t('friendCallsOff'));
    } else if (reason === 'blocked') {
      showError(t('errBlocked'));
    } else if (reason === 'rate') {
      showError(t('errCallbackRate'));
    } else {
      showError(t('errCallbackFailed'));
    }
    return;
  }
  abandonCallBack();
  // Not failures: the ask is waiting in their inbox, so say that rather than
  // painting it red.
  if (reason === 'away') { showToast(t('callbackAway')); return; }
  if (reason === 'busy-queued') { showToast(t('callbackBusyQueued')); return; }
  if (reason === 'offline') showError(t('errOffline'));
  else if (reason === 'calls-off') showError(t('friendCallsOff'));
  else if (reason === 'busy') showError(t('errBusy'));
  else if (reason === 'blocked') showError(t('errBlocked'));
  else if (reason === 'rate') showError(t('errCallbackRate'));
  else if (reason === 'expired') showError(t('errCallbackExpired'));
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
    : reason === 'rate' ? t('errCallbackRate')
    : t('errCallbackFailed'));
});

socket.on('call-back-declined', ({ username }) => {
  clearOutgoingCallBack();
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
  // Their message is the end of their typing. Left alone, the indicator ran
  // on under the bubble it had just announced until its own 3s timeout.
  typingIndicator.classList.add('hidden');
  clearTimeout(typingHideTimeout);
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
  renderRailOnline();
  renderAccountState(); // the account dialog's title depends on being signed in
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
} else if (location.pathname === '/settings') {
  // Landed on /settings directly - a bookmark, a reload, a shared link. The
  // URL is already right, so the screen is opened in place without pushing a
  // second entry, and Back leaves for the home screen.
  history.replaceState({ settings: true }, '', '/settings');
  openAppSettings();
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
  if (params.get('open') === 'friends' || params.get('open') === 'requests') {
    openSidePanel(friendsDropdown, friendsOverlay);
    showFriendsTab(params.get('open') === 'requests' ? 'requests' : 'friends');
    history.replaceState(history.state, '', '/');
  }
  // A message notification opens that conversation. The lists that say who
  // this user may message arrive with the first state-sync, so it waits for
  // that (once) rather than opening a chat the server would refuse.
  const chatWith = params.get('open') === 'chat' ? params.get('with') : null;
  if (chatWith && /^[A-Za-z0-9_-]{8,64}$/.test(chatWith)) {
    history.replaceState(history.state, '', '/');
    const openWhenKnown = () => {
      if (canMessage(chatWith)) openFriendChat(chatWith);
      else {
        openSidePanel(friendsDropdown, friendsOverlay);
        showFriendsTab('friends');
      }
    };
    if (friendsSynced) openWhenKnown();
    else socket.once('state-sync', () => setTimeout(openWhenKnown, 0));
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
// when the call screen opens, and the auto-connect control showing whatever
// the setting actually is - which, unless it has been turned off, is on.
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
let freeLimits = { countries: 2 };

// Now that the free limits and the premium flag exist, the filters panel can
// say what it is set to. From here on every change refreshes it (see the note
// in renderChips); this is just the first paint.
filtersReady = true;
syncFilterReadout();

socket.on('premium-status', ({ premium, limits } = {}) => {
  isPremiumUser = !!premium;
  if (limits) {
    freeLimits = {
      countries: limits.countries || 2,
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

// --- "James from UK is online" - friend came online notification -------------
socket.on('friend-online', ({ clientId, username, countryCode, country } = {}) => {
  // Same 'XX' / 'Unknown' guard as the match line: no place is better than a
  // placeholder, and the toast already has a no-country wording.
  const where = (countryCode && countryCode !== 'XX') ? (getCountryName(countryCode) || country || '') : '';
  // A friend you renamed comes online under the name you gave them.
  const name = labelForClientId(clientId, username);
  showToast(where ? t('friendOnlineToast', { name, country: where }) : t('friendOnlineToastNoCountry', { name }));
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

