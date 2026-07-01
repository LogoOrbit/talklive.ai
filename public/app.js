const socket = io();

// --- DOM refs ---
const orb = document.getElementById('orb');
const orbRings = document.querySelectorAll('#orb .orb-ring');
const statusText = document.getElementById('statusText');
const subText = document.getElementById('subText');
const errorText = document.getElementById('errorText');
const onlineCountEl = document.getElementById('onlineCount');
const myProfileEl = document.getElementById('myProfile');
const remoteAudio = document.getElementById('remoteAudio');

const setupPanel = document.getElementById('setupPanel');
const callPanel = document.getElementById('callPanel');
const chatPanel = document.getElementById('chatPanel');

const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');

const termsModal = document.getElementById('termsModal');
const closeTermsBtn = document.getElementById('closeTermsBtn');
const openTermsLink = document.getElementById('openTermsLink');
const openTermsLinkFooter = document.getElementById('openTermsLinkFooter');

const genderGroup = document.getElementById('genderGroup');
const prefGenderGroup = document.getElementById('prefGenderGroup');
const languageGroup = document.getElementById('languageGroup');
const prefLanguageGroup = document.getElementById('prefLanguageGroup');
const interestTagsEl = document.getElementById('interestTags');
const interestInput = document.getElementById('interestInput');

const countryAnyPill = document.getElementById('countryAnyPill');
const countrySearch = document.getElementById('countrySearch');
const countryResults = document.getElementById('countryResults');
const countrySelectedPill = document.getElementById('countrySelectedPill');

const partnerCard = document.getElementById('partnerCard');
const partnerName = document.getElementById('partnerName');
const partnerMeta = document.getElementById('partnerMeta');
const partnerInterests = document.getElementById('partnerInterests');

const startBtn = document.getElementById('startBtn');
const skipBtn = document.getElementById('skipBtn');
const muteBtn = document.getElementById('muteBtn');
const audioOutputBtn = document.getElementById('audioOutputBtn');
const chatToggleBtn = document.getElementById('chatToggleBtn');
const reportBtn = document.getElementById('reportBtn');
const stopBtn = document.getElementById('stopBtn');
const primaryControls = document.getElementById('primaryControls');

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
const audioBars = document.querySelectorAll('#audioMeter .audio-bar');

const chatBadge = document.getElementById('chatBadge');
const quickGuide = document.getElementById('quickGuide');

const historyBtn = document.getElementById('historyBtn');
const historyModal = document.getElementById('historyModal');
const closeHistoryBtn = document.getElementById('closeHistoryBtn');
const historyList = document.getElementById('historyList');

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

const MIN_CALL_SECONDS_BEFORE_SKIP = 8;

// --- Country code -> flag emoji (regional indicator symbols) ---
function getFlagEmoji(code) {
  if (!code || code.length !== 2 || code === 'XX') return '🌐';
  const codePoints = code.toUpperCase().split('').map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // Open Relay Project — free public TURN fallback for restrictive networks
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
];

const selectedInterests = new Set();
let selectedCountry = 'any';

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
let audioOutputMode = 'speaker'; // 'speaker' or 'earpiece'
let earpieceDeviceId = null;
const supportsSinkId = typeof remoteAudio.setSinkId === 'function';

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

// --- Country search/select ---
function selectCountry(code, name) {
  selectedCountry = code;
  countryAnyPill.classList.toggle('selected', code === 'any');
  if (code === 'any') {
    countrySelectedPill.classList.add('hidden');
    countrySearch.value = '';
  } else {
    countrySelectedPill.innerHTML = `<span class="pill-dot"></span>${name}`;
    countrySelectedPill.classList.remove('hidden');
    countrySearch.value = '';
  }
  countryResults.classList.add('hidden');
}

function renderCountryResults(query) {
  const q = query.trim().toLowerCase();
  countryResults.innerHTML = '';
  if (!q) {
    countryResults.classList.add('hidden');
    return;
  }
  const matches = Object.entries(COUNTRIES)
    .filter(([, name]) => name.toLowerCase().includes(q))
    .sort((a, b) => a[1].localeCompare(b[1]))
    .slice(0, 8);

  if (matches.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'search-result-empty';
    empty.textContent = 'No matching country';
    countryResults.appendChild(empty);
  } else {
    matches.forEach(([code, name]) => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.textContent = name;
      item.addEventListener('click', () => selectCountry(code, name));
      countryResults.appendChild(item);
    });
  }
  countryResults.classList.remove('hidden');
}

countrySearch.addEventListener('input', () => renderCountryResults(countrySearch.value));
countrySearch.addEventListener('focus', () => renderCountryResults(countrySearch.value));
document.addEventListener('click', (e) => {
  if (!e.target.closest('.country-search-wrap')) {
    countryResults.classList.add('hidden');
  }
});
countryAnyPill.addEventListener('click', () => selectCountry('any', 'Any'));

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
initPillGroup(languageGroup);
initPillGroup(prefLanguageGroup);

function openModal(modal) {
  modal.classList.remove('hidden');
}

function closeModal(modal) {
  modal.classList.add('hidden');
}

settingsBtn.addEventListener('click', () => openModal(settingsModal));
closeSettingsBtn.addEventListener('click', () => closeModal(settingsModal));
saveSettingsBtn.addEventListener('click', () => closeModal(settingsModal));

openTermsLink.addEventListener('click', () => openModal(termsModal));
openTermsLinkFooter.addEventListener('click', () => openModal(termsModal));
closeTermsBtn.addEventListener('click', () => closeModal(termsModal));

[settingsModal, termsModal, accountModal, historyModal].forEach((modal) => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal(modal);
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal(settingsModal);
    closeModal(termsModal);
    closeModal(accountModal);
    closeModal(historyModal);
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
  accountNickname = nickname;
  localStorage.setItem('talklive_nickname', nickname);
  renderAccountState();
  loginUsername.value = '';
  loginPassword.value = '';
  setTimeout(() => closeModal(accountModal), 500);
});

socket.on('signup-result', ({ ok, nickname, error }) => {
  if (!ok) return showAccountStatus(error, 'error');
  accountNickname = nickname;
  localStorage.setItem('talklive_nickname', nickname);
  renderAccountState();
  signupUsername.value = '';
  signupPassword.value = '';
  signupNickname.value = '';
  setTimeout(() => closeModal(accountModal), 500);
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
    item.innerHTML = `
      <span class="history-item-name">${getFlagEmoji(entry.countryCode)} ${entry.username}</span>
      <span class="history-item-duration">${mins}:${secs.toString().padStart(2, '0')}</span>
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
    durationSeconds,
  });
  renderHistory();
}

historyBtn.addEventListener('click', () => {
  renderHistory();
  openModal(historyModal);
});
closeHistoryBtn.addEventListener('click', () => closeModal(historyModal));

socket.emit('register', { clientId: getClientId(), nickname: accountNickname || undefined });
renderAccountState();

socket.on('profile', (profile) => {
  myProfile = profile;
  myProfileEl.textContent = `${profile.username} · ${getFlagEmoji(profile.countryCode)} ${profile.city}, ${profile.country}`;
  myProfileEl.classList.remove('hidden');
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

function lockSkipButton() {
  skipBtn.disabled = true;
  clearTimeout(skipUnlockTimeout);
  skipUnlockTimeout = setTimeout(() => {
    skipBtn.disabled = false;
  }, MIN_CALL_SECONDS_BEFORE_SKIP * 1000);
}

function unlockSkipButton() {
  clearTimeout(skipUnlockTimeout);
  skipBtn.disabled = false;
}

function showReactionFloat(emoji) {
  const el = document.createElement('div');
  el.className = 'reaction-float';
  el.textContent = emoji;
  el.style.left = `${40 + Math.random() * 20}%`;
  reactionOverlay.appendChild(el);
  setTimeout(() => el.remove(), 1800);
}

reactionBar.addEventListener('click', (e) => {
  const btn = e.target.closest('.reaction-btn');
  if (!btn) return;
  const emoji = btn.dataset.emoji;
  socket.emit('reaction', emoji);
  showReactionFloat(emoji);
});

function showError(msg) {
  errorText.textContent = msg;
  errorText.classList.remove('hidden');
}

function clearError() {
  errorText.classList.add('hidden');
  errorText.textContent = '';
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
  try {
    await detectEarpieceDevice();
  } catch (e) {
    // Never let output-device detection block the actual call from starting.
  }
  return localStream;
}

// --- Speaker / earpiece output toggle ---
// Only works where the browser supports HTMLMediaElement.setSinkId (Chrome/Edge on
// Android and desktop). Not supported on iOS Safari — the button hides there.
async function detectEarpieceDevice() {
  if (!supportsSinkId) {
    audioOutputBtn.classList.add('hidden');
    return;
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const earpiece = devices.find(
      (d) => d.kind === 'audiooutput' && /earpiece|receiver/i.test(d.label)
    );
    earpieceDeviceId = earpiece ? earpiece.deviceId : null;
  } catch (e) {
    earpieceDeviceId = null;
  }
}

async function applyAudioOutput() {
  if (!supportsSinkId) return;
  try {
    if (audioOutputMode === 'earpiece' && earpieceDeviceId) {
      await remoteAudio.setSinkId(earpieceDeviceId);
    } else {
      await remoteAudio.setSinkId('');
    }
  } catch (e) {
    // Some browsers reject setSinkId depending on device state; non-critical.
  }
}

audioOutputBtn.addEventListener('click', async () => {
  audioOutputMode = audioOutputMode === 'speaker' ? 'earpiece' : 'speaker';
  await applyAudioOutput();
  if (audioOutputMode === 'earpiece') {
    audioOutputBtn.textContent = '📱';
    audioOutputBtn.title = 'Switch to speaker';
    if (!earpieceDeviceId) {
      showError('Earpiece mode isn\'t available on this device/browser — staying on speaker.');
      audioOutputMode = 'speaker';
      audioOutputBtn.textContent = '🔊';
      audioOutputBtn.title = 'Switch to earpiece';
    }
  } else {
    audioOutputBtn.textContent = '🔊';
    audioOutputBtn.title = 'Switch to earpiece';
  }
});

function createPeerConnection() {
  const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });

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
    applyAudioOutput();
  };

  peer.oniceconnectionstatechange = () => {
    const iceState = peer.iceConnectionState;
    if (iceState === 'connected' || iceState === 'completed') {
      setConnection('green', 'Connected');
    } else if (iceState === 'checking') {
      setConnection('orange', 'Connecting');
    } else if (iceState === 'disconnected') {
      setConnection('orange', 'Reconnecting');
    } else if (iceState === 'failed' || iceState === 'closed') {
      setConnection('red', 'Disconnected');
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

    const bucketSize = Math.floor(data.length / audioBars.length);
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

      audioBars.forEach((bar, i) => {
        const bucket = data.slice(i * bucketSize, (i + 1) * bucketSize);
        const bucketAvg = bucket.reduce((a, b) => a + b, 0) / (bucket.length || 1);
        const height = Math.max(4, Math.min(18, Math.round((bucketAvg / 255) * 18)));
        bar.style.height = `${height}px`;
        bar.style.opacity = bucketAvg > 8 ? '1' : '0.35';
      });
    }, 100);
  } catch (e) {
    // AudioContext may be unavailable; non-critical
  }
}

async function startCall(initiator) {
  pc = createPeerConnection();
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
  chatPanel.classList.add('hidden');
  chatOpen = false;
  clearChat();
  hideConnection();
  skipBtn.classList.add('hidden');
  muteBtn.classList.add('hidden');
  audioOutputBtn.classList.add('hidden');
  chatToggleBtn.classList.add('hidden');
  reportBtn.classList.add('hidden');
  primaryControls.classList.add('hidden');
  quickGuide.classList.remove('hidden');
}

async function begin() {
  clearError();
  try {
    await getMic();
  } catch (e) {
    showError('Microphone access is required to use TalkLive.');
    return;
  }

  socket.emit('register', {
    clientId: getClientId(),
    gender: genderGroup.dataset.value,
    prefGender: prefGenderGroup.dataset.value,
    language: languageGroup.dataset.value,
    prefLanguage: prefLanguageGroup.dataset.value,
    prefCountry: selectedCountry,
    interests: Array.from(selectedInterests),
    nickname: accountNickname || undefined,
  });

  isSearching = true;
  setupPanel.classList.add('hidden');
  callPanel.classList.remove('hidden');
  setState('waiting');
  setConnection('orange', 'Searching');
  statusText.textContent = 'Looking for someone to talk to…';
  subText.textContent = 'Hang tight, this only takes a moment';

  skipBtn.classList.remove('hidden');
  muteBtn.classList.remove('hidden');
  if (supportsSinkId) audioOutputBtn.classList.remove('hidden');
  chatToggleBtn.classList.remove('hidden');
  reportBtn.classList.remove('hidden');
  primaryControls.classList.remove('hidden');
  quickGuide.classList.add('hidden');

  socket.emit('find-partner');
}

startBtn.addEventListener('click', begin);

skipBtn.addEventListener('click', () => {
  teardownPeer();
  clearChat();
  setState('waiting');
  setConnection('red', 'Skipped');
  statusText.textContent = 'Finding a new stranger…';
  subText.textContent = 'Hang tight, this only takes a moment';
  socket.emit('skip');
  setTimeout(() => setConnection('orange', 'Searching'), 600);
});

stopBtn.addEventListener('click', () => {
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
  muteBtn.textContent = isMuted ? '🔇' : '🎤';
  socket.emit('mic-state', isMuted);
});

chatToggleBtn.addEventListener('click', () => {
  chatOpen = !chatOpen;
  chatPanel.classList.toggle('hidden', !chatOpen);
  if (chatOpen) {
    chatInput.focus();
    chatBadge.classList.add('hidden');
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

socket.on('matched', async ({ initiator, partner, rematched }) => {
  setState('connected');
  setConnection('orange', 'Connecting');
  statusText.textContent = `Connecting to someone in ${partner.country}…`;
  subText.textContent = rematched ? "You both liked your last chat — you're reconnected!" : '';

  currentPartner = partner;
  partnerName.textContent = partner.username;
  const genderLabel = partner.gender && partner.gender !== 'unspecified'
    ? ` · ${partner.gender[0].toUpperCase()}${partner.gender.slice(1)}`
    : '';
  partnerMeta.textContent = `${getFlagEmoji(partner.countryCode)} ${partner.city}, ${partner.country}${genderLabel}`;

  partnerInterests.innerHTML = '';
  currentPartnerInterests = partner.interests || [];
  currentPartnerInterests.forEach((i) => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = i;
    partnerInterests.appendChild(tag);
  });
  partnerCard.classList.remove('hidden');

  const shared = currentPartnerInterests.filter((i) => selectedInterests.has(i));
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

socket.on('reaction', (emoji) => {
  showReactionFloat(emoji);
});

socket.on('banned', () => {
  showError('You have been banned after repeated reports.');
  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }
  resetUI();
});

socket.on('signal', (data) => {
  handleSignal(data);
});

socket.on('partner-left', () => {
  teardownPeer();
  clearChat();
  if (isSearching) {
    setState('waiting');
    setConnection('red', 'Disconnected');
    statusText.textContent = 'Stranger disconnected. Finding someone new…';
    subText.textContent = 'Hang tight, this only takes a moment';
    socket.emit('find-partner');
    setTimeout(() => setConnection('orange', 'Searching'), 600);
  }
});

socket.on('partner-mic-state', (muted) => {
  subText.textContent = muted ? 'Stranger muted their mic' : 'Say hi! Tap "Next" to skip, or "Hang Up" to leave.';
});

socket.on('chat-message', ({ text }) => {
  addChatMessage(text, 'them');
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
});
