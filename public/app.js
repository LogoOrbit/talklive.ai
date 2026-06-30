const socket = io();

// --- DOM refs ---
const orb = document.getElementById('orb');
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
const chatToggleBtn = document.getElementById('chatToggleBtn');
const reportBtn = document.getElementById('reportBtn');
const stopBtn = document.getElementById('stopBtn');

const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');

const connectionIndicator = document.getElementById('connectionIndicator');
const connectionDot = document.getElementById('connectionDot');
const connectionLabel = document.getElementById('connectionLabel');

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

[settingsModal, termsModal].forEach((modal) => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal(modal);
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal(settingsModal);
    closeModal(termsModal);
  }
});

socket.emit('register', { clientId: getClientId() });

socket.on('profile', (profile) => {
  myProfile = profile;
  myProfileEl.textContent = `${profile.username} · ${profile.city}, ${profile.country}`;
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
}

function hideConnection() {
  connectionIndicator.classList.add('hidden');
}

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
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  return localStream;
}

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
    subText.textContent = 'Say hi! Tap "Next Stranger" to skip.';
    monitorRemoteAudio(event.streams[0]);
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

    speakingCheckInterval = setInterval(() => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      orb.classList.toggle('speaking', avg > 12);
    }, 150);
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
  clearInterval(speakingCheckInterval);
  orb.classList.remove('speaking');
  if (pc) {
    pc.onicecandidate = null;
    pc.ontrack = null;
    pc.close();
    pc = null;
  }
  remoteAudio.srcObject = null;
  partnerCard.classList.add('hidden');
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
  chatToggleBtn.classList.add('hidden');
  reportBtn.classList.add('hidden');
  stopBtn.classList.add('hidden');
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
    prefCountry: selectedCountry,
    interests: Array.from(selectedInterests),
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
  chatToggleBtn.classList.remove('hidden');
  reportBtn.classList.remove('hidden');
  stopBtn.classList.remove('hidden');

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
  if (chatOpen) chatInput.focus();
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

socket.on('waiting', () => {
  setState('waiting');
  setConnection('orange', 'Searching');
  statusText.textContent = 'Looking for someone to talk to…';
});

socket.on('matched', async ({ initiator, partner }) => {
  setState('connected');
  setConnection('orange', 'Connecting');
  statusText.textContent = 'Connecting…';

  partnerName.textContent = partner.username;
  const genderLabel = partner.gender && partner.gender !== 'unspecified'
    ? ` · ${partner.gender[0].toUpperCase()}${partner.gender.slice(1)}`
    : '';
  partnerMeta.textContent = `${partner.city}, ${partner.country}${genderLabel}`;

  partnerInterests.innerHTML = '';
  (partner.interests || []).forEach((i) => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = i;
    partnerInterests.appendChild(tag);
  });
  partnerCard.classList.remove('hidden');

  await startCall(initiator);
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
  subText.textContent = muted ? 'Stranger muted their mic' : 'Say hi! Tap "Next Stranger" to skip.';
});

socket.on('chat-message', ({ text }) => {
  addChatMessage(text, 'them');
});

socket.on('disconnect', () => {
  showError('Connection lost. Reconnecting…');
  if (isSearching) setConnection('red', 'Disconnected');
});

socket.on('connect', () => {
  clearError();
  if (isSearching) setConnection('orange', 'Reconnecting');
});
