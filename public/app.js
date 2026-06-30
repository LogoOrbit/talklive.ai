const socket = io();

const orb = document.getElementById('orb');
const statusText = document.getElementById('statusText');
const subText = document.getElementById('subText');
const errorText = document.getElementById('errorText');
const onlineCountEl = document.getElementById('onlineCount');
const remoteAudio = document.getElementById('remoteAudio');

const startBtn = document.getElementById('startBtn');
const skipBtn = document.getElementById('skipBtn');
const muteBtn = document.getElementById('muteBtn');
const stopBtn = document.getElementById('stopBtn');

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

let localStream = null;
let pc = null;
let isMuted = false;
let isSearching = false;
let speakingCheckInterval = null;

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

  peer.onconnectionstatechange = () => {
    if (['failed', 'disconnected', 'closed'].includes(peer.connectionState)) {
      // handled by partner-left / skip flows
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
      if (avg > 12) {
        orb.classList.add('speaking');
      } else {
        orb.classList.remove('speaking');
      }
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
}

function resetUI() {
  teardownPeer();
  isSearching = false;
  setState('idle');
  statusText.textContent = 'Tap start to talk to a random stranger';
  subText.textContent = 'Audio only · No sign up · No registration';
  startBtn.classList.remove('hidden');
  skipBtn.classList.add('hidden');
  muteBtn.classList.add('hidden');
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

  isSearching = true;
  setState('waiting');
  statusText.textContent = 'Looking for someone to talk to…';
  subText.textContent = 'Hang tight, this only takes a moment';

  startBtn.classList.add('hidden');
  skipBtn.classList.remove('hidden');
  muteBtn.classList.remove('hidden');
  stopBtn.classList.remove('hidden');

  socket.emit('find-partner');
}

startBtn.addEventListener('click', begin);

skipBtn.addEventListener('click', () => {
  teardownPeer();
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

muteBtn.addEventListener('click', () => {
  if (!localStream) return;
  isMuted = !isMuted;
  localStream.getAudioTracks().forEach((t) => (t.enabled = !isMuted));
  muteBtn.classList.toggle('muted', isMuted);
  muteBtn.textContent = isMuted ? '🔇' : '🎤';
  socket.emit('mic-state', isMuted);
});

socket.on('online-count', (count) => {
  onlineCountEl.textContent = count;
});

socket.on('waiting', () => {
  setState('waiting');
  statusText.textContent = 'Looking for someone to talk to…';
});

socket.on('matched', async ({ initiator }) => {
  setState('connected');
  statusText.textContent = 'Connecting…';
  await startCall(initiator);
});

socket.on('signal', (data) => {
  handleSignal(data);
});

socket.on('partner-left', () => {
  teardownPeer();
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

socket.on('disconnect', () => {
  showError('Connection lost. Reconnecting…');
});

socket.on('connect', () => {
  clearError();
});
