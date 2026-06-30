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

const genderSelect = document.getElementById('genderSelect');
const prefGenderSelect = document.getElementById('prefGenderSelect');
const prefCountrySelect = document.getElementById('prefCountrySelect');
const interestTagsEl = document.getElementById('interestTags');

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

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // Open Relay Project — free public TURN fallback for restrictive networks
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
];

const INTEREST_OPTIONS = [
  'Music', 'Gaming', 'Movies', 'Sports', 'Travel', 'Books', 'Tech',
  'Food', 'Art', 'Fitness', 'Anime', 'Languages',
];

const selectedInterests = new Set();

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

// --- Setup panel population ---
function populateCountries() {
  const entries = Object.entries(COUNTRIES).sort((a, b) => a[1].localeCompare(b[1]));
  for (const [code, name] of entries) {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = name;
    prefCountrySelect.appendChild(opt);
  }
}

function populateInterests() {
  for (const interest of INTEREST_OPTIONS) {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = interest;
    tag.addEventListener('click', () => {
      if (selectedInterests.has(interest)) {
        selectedInterests.delete(interest);
        tag.classList.remove('selected');
      } else {
        selectedInterests.add(interest);
        tag.classList.add('selected');
      }
    });
    interestTagsEl.appendChild(tag);
  }
}

populateCountries();
populateInterests();

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
    gender: genderSelect.value,
    prefGender: prefGenderSelect.value,
    prefCountry: prefCountrySelect.value,
    interests: Array.from(selectedInterests),
  });

  isSearching = true;
  setupPanel.classList.add('hidden');
  callPanel.classList.remove('hidden');
  setState('waiting');
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
  statusText.textContent = 'Finding a new stranger…';
  subText.textContent = 'Hang tight, this only takes a moment';
  socket.emit('skip');
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
  statusText.textContent = 'Reported. Finding someone new…';
  socket.emit('report');
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
  statusText.textContent = 'Looking for someone to talk to…';
});

socket.on('matched', async ({ initiator, partner }) => {
  setState('connected');
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
    statusText.textContent = 'Stranger disconnected. Finding someone new…';
    subText.textContent = 'Hang tight, this only takes a moment';
    socket.emit('find-partner');
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
});

socket.on('connect', () => {
  clearError();
});
