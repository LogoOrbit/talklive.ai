// --- TalkLive i18n ---------------------------------------------------------
// Lightweight translation layer: a dictionary per language plus a tiny t()
// helper. Static HTML is translated via data-i18n / data-i18n-placeholder /
// data-i18n-aria / data-i18n-title attributes; dynamic strings in app.js call
// t() directly. Language is auto-detected from the browser on first visit,
// can be changed with the picker in the top bar, and is remembered in
// localStorage. RTL languages flip the whole page via <html dir="rtl">.

const I18N_LANGS = {
  en: { name: 'English', dir: 'ltr' },
  es: { name: 'Español', dir: 'ltr' },
  pt: { name: 'Português', dir: 'ltr' },
  fr: { name: 'Français', dir: 'ltr' },
  de: { name: 'Deutsch', dir: 'ltr' },
  ru: { name: 'Русский', dir: 'ltr' },
  tr: { name: 'Türkçe', dir: 'ltr' },
  ar: { name: 'العربية', dir: 'rtl' },
  hi: { name: 'हिन्दी', dir: 'ltr' },
  ur: { name: 'اردو', dir: 'rtl' },
  id: { name: 'Bahasa Indonesia', dir: 'ltr' },
  zh: { name: '中文', dir: 'ltr' },
};

// Only English ships inline; other languages live in /i18n/<lang>.js and are
// fetched on demand by setLanguage(), cutting ~90% of this file for most visitors.
const I18N_STRINGS = {
  en: {
    "sharePromptTitle": "Enjoyed that call?",
    "sharePromptBody": "TalkLive gets better with more people online. Invite a friend to join the conversation.",
    "sharePromptBtn": "Share TalkLive",
    "sharePromptLater": "Not now",
    "shareText": "Talk to a stranger, right now — free anonymous voice chat, no video, no sign-up.",
    "shareLinkCopied": "Link copied — send it to a friend!",
    "appTitle": "TalkLive — Talk to Strangers",
    "skipToContent": "Skip to main content",
    "menuAria": "Open settings menu",
    "online": "Online",
    "onlineAria": "Number of people online now",
    "historyAria": "Call history",
    "friendsAria": "Friends and messages",
    "requests": "Requests",
    "filtersAria": "Match filters",
    "close": "Close",
    "language": "Language",
    "settings": "Settings",
    "account": "Account",
    "soundEffects": "Sound effects",
    "autoCall": "Auto call",
    "iAm": "I am",
    "preferNotSay": "Prefer not to say",
    "male": "Male",
    "female": "Female",
    "filters": "Filters",
    "matchMeWith": "Match me with",
    "anyone": "Anyone",
    "wantCountries": "Countries I want to talk to",
    "avoidCountries": "Countries I don't want",
    "searchCountry": "Search country…",
    "noMatchingCountry": "No matching country",
    "interests": "Interests",
    "optional": "(optional)",
    "interestPlaceholder": "Type an interest…",
    "add": "Add",
    "save": "Save",
    "clear": "Clear",
    "tapToTalk": "Tap to Talk",
    "startAria": "Start a call with a random person",
    "tapToChat": "Tap to Chat",
    "startChatAria": "Start a text chat with a random person",
    "chooseYourVibe": "How do you want to meet someone?",
    "tapTalkCaption": "Live voice call · mic on",
    "tapChatCaption": "Anonymous text chat · no mic",
    "statusChatSearching": "Looking for someone to chat with…",
    "statusChatConnected": "You're chatting with {name}",
    "subChatSayHi": "Say hi! Messages are live and never stored after the chat ends.",
    "statusChatEnded": "Stranger left the chat",
    "statusYouLeftChat": "You left the chat",
    "statusReadyToChat": "Ready to chat — tap the button to meet someone new",
    "subTapChat": "Tap the button whenever you're ready to chat",
    "chatSystemMatched": "You're now chatting with {name} from {country} — say hi! 👋",
    "chatSystemLeft": "The stranger left the chat. Tap the green button to meet someone new.",
    "chatStartTitle": "Chat with a stranger",
    "chatStartSub": "Anonymous · worldwide · free",
    "chatStartBtn": "Start chatting",
    "chatSearch1": "Scanning the globe…",
    "chatSearch2": "Someone out there is looking too…",
    "chatSearch3": "Crossing time zones…",
    "chatSearch4": "Almost there — say hi when they land!",
    "chatConnectedWord": "Connected",
    "chatPartnerFrom": "Partner from {country}",
    "somewhere": "somewhere",
    "chatNext": "Next",
    "chatNextSure": "Sure?",
    "chatStageLeft": "The stranger left. Tap Next to meet someone new.",
    "chatLinkBlocked": "Links can't be sent here — it keeps everyone safe from scams.",
    "bannedTitle": "Access paused",
    "bannedBody": "Your access has been temporarily suspended. Please try again later.",
    "maintenanceTitle": "Back in a moment",
    "maintenanceBody": "TalkLive is under quick maintenance. Please check back shortly.",
    "voiceCall": "Voice call",
    "chatBotWarning": "⚠️ This user looks like a bot or spammer. Don't share personal info — tap Next to move on.",
    "errUnsafeMessage": "That message can't be sent — it looks unsafe or against our rules.",
    "friendReqTitle": "Add friend",
    "friendReqTo": "Send a friend request to",
    "friendReqMsgPh": "Optional message — remind them who you are…",
    "friendReqSend": "Send request",
    "friendReqSentMsg": "Friend request sent to {name} ✓",
    "voicePromoText": "🎙️ Enjoying the chats? Hear a real voice — try a free TalkLive voice call!",
    "voicePromoCta": "Try a voice call",
    "consentPrefix": "By tapping Call you agree to our",
    "termsLink": "Terms & Community Guidelines",
    "or": "or",
    "logIn": "Log In",
    "signUp": "Sign Up",
    "username": "Username",
    "password": "Password",
    "chooseUsername": "Choose a username",
    "choosePassword": "Choose a password",
    "nicknameShown": "Nickname (shown to others)",
    "createAccount": "Create Account",
    "accountHint": "Your account is saved permanently — you stay signed in on this device and can log in from anywhere.",
    "signedInAs": "Signed in as",
    "accountSettings": "Account Settings",
    "myAccount": "My Account",
    "nickname": "Nickname",
    "updateNickname": "Update Nickname",
    "changePassword": "Change Password",
    "currentPassword": "Current password",
    "newPassword": "New password",
    "logOut": "Log Out",
    "statusSignedIn": "Signed in as {name}",
    "statusLoggedIn": "Logged in as {name}",
    "statusAccountCreated": "Account created — welcome, {name}!",
    "statusNicknameUpdated": "Nickname updated.",
    "statusPasswordChanged": "Password changed.",
    "callHistory": "Call History",
    "historyHint": "This session only — it clears when you close or reload the page. Tap the green button to call someone back if they're online.",
    "noCallsYet": "No calls yet.",
    "callBack": "Call back",
    "friendOffline": "Offline — tap to retry",
    "friendWentOffline": "They’re offline right now.",
    "sendRequestLater": "Send request for later",
    "requestSentLater": "Request sent ✓",
    "errCallRequiredToChat": "Start a call to chat — texting unlocks once your call connects.",
    "chatLockedHint": "Call to unlock chat",
    "friends": "Friends",
    "myFriends": "My Friends",
    "noFriendsYet": "No friends yet. Tap \"Add friend\" during a call to send a request.",
    "noPendingRequests": "No pending requests.",
    "temporary": "Temporary",
    "signedInBadge": "Signed in",
    "chat": "Chat",
    "block": "Block",
    "remove": "Remove",
    "confirm": "Confirm",
    "dismiss": "Dismiss",
    "confirmBlockFriend": "Block this friend? They will be removed and you will not be matched with them again.",
    "confirmRemoveFriend": "Remove this friend?",
    "offline": "Offline",
    "profile": "Profile",
    "removeFriend": "Remove Friend",
    "blockUser": "Block User",
    "call": "Call",
    "statusReadyToTalk": "Ready to talk — tap Call to meet someone new",
    "statusYouLeft": "You hung up",
    "subTapCall": "Tap the green Call button whenever you are ready",
    "statusConnectingRandom": "Connecting to someone random…",
    "reassureLine": "Don't feel bad if someone skips you or hangs up — it happens to everyone, just move on to the next chat.",
    "connectionQuality": "Connection quality",
    "qualityExcellent": "Excellent",
    "qualityGood": "Good",
    "qualityFair": "Fair",
    "qualityPoor": "Poor",
    "errNoLinks": "Links are not allowed in chat — no URLs of any kind.",
    "tickerOnlineNow": "{n} people online right now",
    "funFact1": "Fun fact: your voice sounds deeper to you than to everyone else — your skull adds bass.",
    "funFact2": "Fun fact: laughing is contagious even over audio — you are 30x more likely to laugh with company.",
    "funFact3": "Fun fact: there are over 7,000 languages spoken in the world today.",
    "funFact4": "Fun fact: the average person speaks about 16,000 words per day.",
    "funFact5": "Fun fact: humans can recognize a familiar voice in less than half a second.",
    "funFact6": "Fun fact: \"hello\" only became a greeting after the telephone was invented.",
    "icebreaker1": "Icebreaker: ask what the weather is like where they are.",
    "icebreaker2": "Icebreaker: \"What is the best thing that happened to you this week?\"",
    "icebreaker3": "Icebreaker: ask what food their country is famous for.",
    "icebreaker4": "Icebreaker: \"Night owl or early bird?\"",
    "icebreaker5": "Icebreaker: ask what music they have on repeat right now.",
    "icebreaker6": "Icebreaker: \"If you could visit any country tomorrow, where would you go?\"",
    "tip1": "Tip: use headphones to avoid echo and sound way better.",
    "tip2": "Tip: add interests in Filters to meet people who like what you like.",
    "tip3": "Tip: tap \"Add friend\" during a great call to keep in touch.",
    "tip4": "Tip: keep the Enable box checked and we will keep connecting you automatically.",
    "signIn": "Sign in",
    "register": "Register",
    "appSettings": "App Settings",
    "darkMode": "Dark mode",
    "theme": "Theme",
    "themeDark": "Dark",
    "themeLight": "Light",
    "themeOcean": "Ocean",
    "themeSunset": "Sunset",
    "soundNotifications": "Sound notifications",
    "vibration": "Vibration",
    "showOnlineStatus": "Show my online status to friends",
    "avatar": "Avatar",
    "avatarHint": "Your avatar is shown to you and your friends only — strangers never see it during a call.",
    "updatePassword": "Update Password",
    "chatWith": "Chat with {name}",
    "typeMessage": "Type a message…",
    "send": "Send",
    "noMessagesYet": "No messages yet. Say hi!",
    "strangerTyping": "Stranger is typing",
    "seen": "Seen",
    "messageSeen": "Read receipts (Seen)",
    "readReceipts": "Read Receipts",
    "readOurBlog": "📖 Read our blog",
    "blogCtaText": "Want a lighter read?",
    "blogCtaSub": "Tips and stories about meeting new people are on our blog.",
    "beforeYouStart": "Before You Start",
    "mustBe18": "You must be 18 years or older to use TalkLive.",
    "byContinuing": "By continuing, you agree to our",
    "consentSuffix": ", including the rules on respectful behavior and reporting/bans.",
    "iAgree": "I AGREE",
    "agreeToTerms": "I have read and agree to the Terms & Conditions.",
    "termsEnglishNote": "The full rules below are provided in English.",
    "statusIdle": "Tap the green button to talk to a random person",
    "subIdle": "Voice only · No sign up needed",
    "statusSearching": "Looking for someone to talk to…",
    "subHangTight": "Hang tight, this only takes a moment",
    "subUsuallyMatches": "Usually matches in about {s}s",
    "subCountryFallback": "Not many people online in your chosen countries — connecting you with anyone.",
    "statusConnectingTo": "Connecting to someone in {country}…",
    "statusCallingBack": "Calling {name} back…",
    "subRematched": "You both liked your last chat — you're reconnected!",
    "statusConnected": "You're connected",
    "subSayHi": "Say hi! Tap \"Hang Up\" to leave, or check Enable to auto-connect next.",
    "subStrangerMuted": "The other person muted their microphone",
    "statusFindingNew": "Finding a new person…",
    "statusReconnecting": "Connection dropped — reconnecting…",
    "statusReconnectFailed": "Couldn’t reconnect. Finding someone new…",
    "statusReported": "Reported. Finding someone new…",
    "statusStrangerLeft": "The other person left. Finding someone new…",
    "statusCalling": "Calling {name}…",
    "statusConnecting": "Connecting…",
    "subWaitingAccept": "Waiting for them to accept…",
    "connSearching": "Searching",
    "connConnecting": "Connecting",
    "connConnected": "Connected",
    "connReconnecting": "Reconnecting",
    "connDisconnected": "Disconnected",
    "connSkipped": "Skipped",
    "connReported": "Reported",
    "connCalling": "Calling",
    "connFriendEnded": "Call ended",
    "statusFriendEnded": "Your friend ended the call.",
    "statusPartnerHungUp": "Your partner hung up.",
    "convoGuideTitle": "How to have a great talk",
    "convoTip1": "Smile before you start talking — it changes your voice.",
    "convoTip2": "Ask simple questions first, like where they're from.",
    "convoTip3": "Be respectful and kind to everyone you meet.",
    "convoTip4": "Listen carefully and let them finish speaking.",
    "convoTip5": "Don't worry if someone skips you — it's completely normal.",
    "convoTip6": "Relax and have fun meeting new people.",
    "bannerTitle": "Someone new is always waiting",
    "bannerSubtitle": "Free, friendly voice chats with real people worldwide.",
    "reportTitle": "Report this person",
    "reportSubtitle": "Pick a reason. This ends the call and blocks them from matching with you again.",
    "reportReasonSpam": "Spam",
    "reportReasonAbuse": "Abuse",
    "reportReasonHarassment": "Harassment",
    "reportReasonFake": "Fake Profile",
    "reportReasonInappropriate": "Inappropriate Behavior",
    "reportReasonNudity": "Nudity",
    "reportReasonHate": "Hate Speech",
    "reportReasonUnderage": "Underage",
    "reportReasonScammer": "Scammer",
    "reportReasonOther": "Other",
    "reportCustomLabel": "Add details (optional)",
    "reportCustomPlaceholder": "Describe what happened…",
    "reportSubmit": "Report & End Call",
    "reportSent": "Thanks — the report was sent and the call ended.",
    "reportPickReason": "Please pick a reason first.",
    "tempUsername": "Your name",
    "tempUsernamePlaceholder": "Your display name",
    "saveName": "Save name",
    "tempNameSaved": "Display name updated.",
    "feedback": "Feedback for Improvement",
    "feedbackTitle": "Feedback for Improvement",
    "feedbackSubtitle": "Tell us what to improve. We read every message.",
    "feedbackPlaceholder": "Your suggestion…",
    "feedbackSend": "Send Feedback",
    "feedbackThanks": "Thank you! Your feedback was sent.",
    "feedbackEmpty": "Please write something first.",
    "catProfile": "My Gender",
    "catApp": "App Settings",
    "catPrivacy": "Privacy & Safety",
    "catAbout": "Help & About",
    "invitePartnerToPlay": "Invite your partner to play",
    "acceptAndPlay": "Accept & Play",
    "tttEndConfirmTitle": "End this game?",
    "tttEndConfirmText": "Are you sure you want to end this game?",
    "continuePlaying": "Continue Playing",
    "endGame": "End Game",
    "tttPartnerLeft": "Your partner left the game.",
    "tttPartnerHungUp": "Your partner hung up.",
    "tttActThinking": "thinking…",
    "you": "You",
    "callSwitchTitle": "Switch calls?",
    "callSwitchText": "You are on a call. Accepting will end it and connect you to {name}.",
    "callSwitchConfirm": "End & Switch",
    "callbackCooldown": "Please wait {s}s before calling back again.",
    "confirmEndCallTitle": "End the call?",
    "confirmEndCallText": "Going back will end your current call. Are you sure?",
    "keepTalking": "Keep Talking",
    "hangUp": "Hang Up",
    "hangUpSure": "Sure?",
    "netOnline": "You are online",
    "netOffline": "You are offline — check your internet",
    "next": "Next",
    "enableAutoCall": "Enable — keep connecting me to new people",
    "mute": "Mute",
    "addFriend": "Add friend",
    "report": "Report",
    "playTtt": "Play Tic Tac Toe",
    "playGames": "Play a game",
    "gamesTitle": "Games",
    "gamePickPrompt": "Pick a game to challenge {name}!",
    "gameTtt": "Tic Tac Toe",
    "gameTttDesc": "Classic 3×3 — three in a row wins",
    "gameDab": "Dots & Boxes",
    "gameDabDesc": "Draw lines, close boxes, score points",
    "gameInvited": "{name} wants to play {game}",
    "dabYourTurn": "Your turn — draw a line",
    "dabBoxes": "Boxes",
    "invitePlay": "Invite to Tic Tac Toe",
    "cancel": "Cancel",
    "rematch": "Rematch",
    "tttIdlePrompt": "Challenge {name} to a game of Tic Tac Toe!",
    "tttInviteSent": "Waiting for {name} to accept…",
    "tttInvited": "{name} wants to play Tic Tac Toe",
    "tttDeclined": "{name} declined the game",
    "tttConnectFirst": "Connect with someone first to play together.",
    "tttYourTurn": "Your turn — tap a square",
    "tttTheirTurn": "{name}'s turn",
    "tttYouWin": "You win! 🎉",
    "tttTheyWin": "{name} wins 🏆",
    "tttDraw": "It's a draw!",
    "tttNewGame": "New game — tap a square to start!",
    "bothLike": "Both of you like {list}",
    "reactLike": "Send a thumbs up",
    "reactLaugh": "Send a laugh",
    "reactClap": "Send applause",
    "reactHeart": "Send a heart",
    "errMicBlocked": "Microphone access is blocked for this site. Click the padlock/camera icon in your browser's address bar, allow the microphone, then reload the page.",
    "errNoMic": "No microphone was found. Please connect a microphone and try again.",
    "errMicBusy": "Your microphone is already in use by another app or tab. Close it and try again.",
    "errMicRequired": "Microphone access is required to use TalkLive.",
    "errCouldntConnect": "Couldn't connect to that person — finding someone new…",
    "errBanned": "You have been banned after repeated reports.",
    "errConnLost": "Connection lost. Reconnecting…",
    "errAutoCallOff": "The other person left. Auto Call is off — tap the green button to find someone new.",
    "errFinishCall": "Hang up or finish your current call before calling someone back.",
    "errFinishBeforeAccept": "Finish your current call before accepting a call back.",
    "errMicCallback": "Microphone access is required to call back.",
    "errMicAccept": "Microphone access is required to accept the call.",
    "errOffline": "That person isn't online right now. Try again later.",
    "errBusy": "That person is currently on another call.",
    "errBlocked": "You can no longer contact this person.",
    "errCallbackFailed": "Could not start the call back.",
    "errDeclined": "{name} declined the call back.",
    "confirmReport": "Report and block this person? You will not be matched with them again.",
    "notifWantsFriends": "{name} wants to be friends",
    "notifAccepted": "{name} accepted your friend request",
    "notifWantsCallback": "{name} wants to call you back",
    "notification": "Notification",
    "noRequestsYet": "No requests yet.",
    "accept": "Accept",
    "decline": "Decline",
    "justNow": "just now",
    "minAgo": "{n}m ago",
    "hourAgo": "{n}h ago",
    "dayAgo": "{n}d ago",
    "guideRespect": "Be respectful. Treat others the way you want to be treated.",
    "guideNoSexual": "No sexual content, hate, threats, or harassment.",
    "guide18": "You must be 18 or older to use this site.",
    "guideReport": "Report anyone who breaks the rules. Reports instantly end the call, block that person, and repeated reports can lead to a ban.",
    "guideReportShort": "Report anyone who breaks the rules — it can lead to a ban.",
    "guideHeadphones": "Use headphones to prevent echo and improve call quality.",
    "guideMute": "You can mute your microphone anytime.",
    "guideChat": "Use the chat button to send text messages during a call.",
    "footerText": "Be respectful. You may be paired with anyone in the world. Voice only — no video, no recording. 18+ only.",
    "privacyPolicy": "Privacy Policy",
    "premiumBadge": "💎 Premium",
    "filtersPremiumTitle": "Filters are a Premium feature",
    "filtersPremiumText": "Free plan: up to 3 countries per list. Gender filter locked.",
    "pricingLink": "Pricing & Premium",
    "aboutLink": "About TalkLive",
    "contactLink": "Contact Us",
    "termsPageLink": "Terms & Conditions",
    "refundLink": "Refund Policy",
    "upgradeLink": "Upgrade to unlock all features",
    "upgradeCta": "UPGRADE",
    "freeLimitsHint": "Free plan: up to 3 countries per list, gender filter locked.",
    "premiumUpsellTitle": "TalkLive Premium",
    "premiumUpsellGo": "View Pricing",
    "premiumGenderLocked": "The gender filter is a Premium feature.",
    "premiumCountryLimit": "The free plan allows up to {n} countries per list.",
    "premiumFriendLimit": "The free plan allows up to {n} friends.",
    "subFreeDelay": "Free plan: matching in about {s}s — Premium matches instantly",
    "friendOnlineToast": "{name} from {country} is online",
    "friendOnlineToastNoCountry": "{name} is online",
    "micPromptTitle": "Allow microphone access",
    "micPromptBody": "TalkLive needs your microphone to connect the voice call. Your browser will ask for permission next — audio is live only and never recorded.",
    "micPromptOk": "Got it"
  },
};
window.I18N_STRINGS = I18N_STRINGS;

const I18N_STATE = {
  lang: 'en',
};

function i18nDetectLang() {
  // An explicit ?lang= / ?hl= query param wins — this is what the hreflang
  // alternates in the sitemap and page <head> point at, so search engines and
  // shared links land directly on the right language.
  try {
    const qs = new URLSearchParams(window.location.search);
    const q = (qs.get('lang') || qs.get('hl') || '').toLowerCase().split('-')[0];
    if (q && I18N_LANGS[q]) return q;
  } catch (e) { /* URLSearchParams unavailable — fall through */ }
  const saved = localStorage.getItem('talklive_lang');
  if (saved && I18N_LANGS[saved]) return saved;
  const candidates = navigator.languages || [navigator.language || 'en'];
  for (const c of candidates) {
    const base = String(c).toLowerCase().split('-')[0];
    if (I18N_LANGS[base]) return base;
  }
  return 'en';
}

function t(key, vars) {
  const dict = I18N_STRINGS[I18N_STATE.lang] || I18N_STRINGS.en;
  let s = dict[key] != null ? dict[key] : (I18N_STRINGS.en[key] != null ? I18N_STRINGS.en[key] : key);
  if (vars) {
    for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  }
  return s;
}

// Localized country name (falls back to the English list in countries.js).
let i18nRegionNames = null;
function getCountryName(code) {
  if (!code || code === 'XX') return typeof COUNTRIES !== 'undefined' && COUNTRIES[code] ? COUNTRIES[code] : (code || '');
  try {
    if (!i18nRegionNames) i18nRegionNames = new Intl.DisplayNames([I18N_STATE.lang], { type: 'region' });
    const name = i18nRegionNames.of(code.toUpperCase());
    if (name && name !== code.toUpperCase()) return name;
  } catch (e) {
    // Intl.DisplayNames unavailable or bad code — fall back below.
  }
  return (typeof COUNTRIES !== 'undefined' && COUNTRIES[code]) || code;
}

function applyI18n() {
  const lang = I18N_STATE.lang;
  const meta = I18N_LANGS[lang] || I18N_LANGS.en;
  document.documentElement.lang = lang;
  document.documentElement.dir = meta.dir;
  document.title = t('appTitle');

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria));
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
  });

  window.dispatchEvent(new CustomEvent('i18n-changed', { detail: { lang } }));
}

// Non-English dictionaries load on demand from /i18n/<lang>.js. Until the file
// arrives t() falls back to English, then the UI re-translates once it lands.
const I18N_VERSION = '20260710b';
const i18nLoading = {};
window.__i18nLangLoaded = function (lang) {
  delete i18nLoading[lang];
  if (I18N_STATE.lang === lang) applyI18n();
};
function loadLangFile(lang) {
  if (I18N_STRINGS[lang] || i18nLoading[lang]) return;
  i18nLoading[lang] = true;
  const s = document.createElement('script');
  s.src = '/i18n/' + lang + '.js?v=' + I18N_VERSION;
  s.async = true;
  s.onerror = () => { delete i18nLoading[lang]; };
  document.head.appendChild(s);
}

function setLanguage(lang) {
  if (!I18N_LANGS[lang]) lang = 'en';
  I18N_STATE.lang = lang;
  i18nRegionNames = null;
  localStorage.setItem('talklive_lang', lang);
  const select = document.getElementById('langSelect');
  if (select && select.value !== lang) select.value = lang;
  if (lang !== 'en') loadLangFile(lang);
  applyI18n();
}

(function initI18n() {
  const select = document.getElementById('langSelect');
  if (select) {
    Object.keys(I18N_LANGS).forEach((code) => {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = I18N_LANGS[code].name;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => setLanguage(select.value));
  }
  setLanguage(i18nDetectLang());
})();
