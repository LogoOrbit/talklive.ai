const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const geoip = require('geoip-lite');
const { generateUsername } = require('./usernames');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '..', 'public')));

// --- State ---
const waitingQueue = []; // socket ids waiting for a partner
const partners = new Map(); // socketId -> partnerSocketId
const profiles = new Map(); // socketId -> { username, country, city, gender, prefGender, prefCountry, interests, clientId }
const blocks = new Map(); // clientId -> Set<clientId>

function getClientIp(socket) {
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  const ip = (forwarded ? forwarded.split(',')[0].trim() : socket.handshake.address) || '';
  return ip.replace('::ffff:', '');
}

function lookupGeo(ip) {
  const geo = geoip.lookup(ip);
  if (!geo) return { country: 'XX', countryName: 'Unknown', city: 'Unknown' };
  return {
    country: geo.country || 'XX',
    countryName: geo.country || 'Unknown',
    city: geo.city || 'Unknown',
  };
}

function broadcastOnlineCount() {
  io.emit('online-count', io.engine.clientsCount);
}

function clearFromQueue(socketId) {
  const idx = waitingQueue.indexOf(socketId);
  if (idx !== -1) waitingQueue.splice(idx, 1);
}

function isBlockedPair(clientIdA, clientIdB) {
  const setA = blocks.get(clientIdA);
  if (setA && setA.has(clientIdB)) return true;
  const setB = blocks.get(clientIdB);
  if (setB && setB.has(clientIdA)) return true;
  return false;
}

function blockPair(clientIdA, clientIdB) {
  if (!blocks.has(clientIdA)) blocks.set(clientIdA, new Set());
  blocks.get(clientIdA).add(clientIdB);
}

function disconnectPartner(socketId) {
  const partnerId = partners.get(socketId);
  if (!partnerId) return null;
  partners.delete(socketId);
  partners.delete(partnerId);
  const partnerSocket = io.sockets.sockets.get(partnerId);
  if (partnerSocket) {
    partnerSocket.emit('partner-left');
  }
  return partnerId;
}

function publicProfile(p) {
  return {
    username: p.username,
    country: p.countryName,
    countryCode: p.country,
    city: p.city,
    gender: p.gender,
    interests: p.interests,
  };
}

// Returns true if candidate's profile satisfies seeker's filters, and vice versa.
function mutuallyCompatible(seeker, candidate) {
  if (isBlockedPair(seeker.clientId, candidate.clientId)) return false;

  if (seeker.prefGender && seeker.prefGender !== 'any' && candidate.gender !== seeker.prefGender) {
    return false;
  }
  if (candidate.prefGender && candidate.prefGender !== 'any' && seeker.gender !== candidate.prefGender) {
    return false;
  }
  if (seeker.prefCountry && seeker.prefCountry !== 'any' && candidate.country !== seeker.prefCountry) {
    return false;
  }
  if (candidate.prefCountry && candidate.prefCountry !== 'any' && seeker.country !== candidate.prefCountry) {
    return false;
  }
  return true;
}

function sharedInterestCount(a, b) {
  const setB = new Set(b.interests || []);
  return (a.interests || []).filter((i) => setB.has(i)).length;
}

function findBestMatch(socketId) {
  const seeker = profiles.get(socketId);
  if (!seeker) return -1;

  let bestIdx = -1;
  let bestScore = -1;

  for (let i = 0; i < waitingQueue.length; i++) {
    const candidateId = waitingQueue[i];
    const candidate = profiles.get(candidateId);
    if (!candidate || !io.sockets.sockets.get(candidateId)) continue;
    if (!mutuallyCompatible(seeker, candidate)) continue;

    const score = sharedInterestCount(seeker, candidate);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function tryMatch(socketId) {
  disconnectPartner(socketId);
  clearFromQueue(socketId);

  const seekerSocket = io.sockets.sockets.get(socketId);
  if (!seekerSocket) return;

  const matchIdx = findBestMatch(socketId);

  if (matchIdx !== -1) {
    const partnerId = waitingQueue.splice(matchIdx, 1)[0];
    const partnerSocket = io.sockets.sockets.get(partnerId);
    if (!partnerSocket) return tryMatch(socketId);

    partners.set(socketId, partnerId);
    partners.set(partnerId, socketId);

    const seekerProfile = profiles.get(socketId);
    const partnerProfile = profiles.get(partnerId);

    partnerSocket.emit('matched', { initiator: true, partner: publicProfile(seekerProfile) });
    seekerSocket.emit('matched', { initiator: false, partner: publicProfile(partnerProfile) });
  } else {
    waitingQueue.push(socketId);
    seekerSocket.emit('waiting');
  }
}

io.on('connection', (socket) => {
  const ip = getClientIp(socket);
  const geo = lookupGeo(ip);

  socket.on('register', (data = {}) => {
    const clientId = data.clientId || socket.id;
    profiles.set(socket.id, {
      clientId,
      username: generateUsername(),
      country: geo.country,
      countryName: geo.countryName,
      city: geo.city,
      gender: data.gender || 'unspecified',
      prefGender: data.prefGender || 'any',
      prefCountry: data.prefCountry || 'any',
      interests: Array.isArray(data.interests) ? data.interests.slice(0, 10) : [],
    });

    socket.emit('profile', {
      username: profiles.get(socket.id).username,
      country: geo.countryName,
      countryCode: geo.country,
      city: geo.city,
    });
  });

  broadcastOnlineCount();

  socket.on('find-partner', () => {
    if (!profiles.has(socket.id)) return;
    tryMatch(socket.id);
  });

  socket.on('skip', () => {
    disconnectPartner(socket.id);
    tryMatch(socket.id);
  });

  socket.on('leave', () => {
    disconnectPartner(socket.id);
    clearFromQueue(socket.id);
  });

  socket.on('report', () => {
    const partnerId = partners.get(socket.id);
    const seeker = profiles.get(socket.id);
    const partner = partnerId ? profiles.get(partnerId) : null;
    if (seeker && partner) {
      blockPair(seeker.clientId, partner.clientId);
      console.log(`[report] ${seeker.username} reported ${partner.username}`);
    }
    disconnectPartner(socket.id);
    tryMatch(socket.id);
  });

  // WebRTC signaling relay — only forwarded to the current partner
  socket.on('signal', (data) => {
    const partnerId = partners.get(socket.id);
    if (partnerId) {
      io.to(partnerId).emit('signal', data);
    }
  });

  socket.on('mic-state', (muted) => {
    const partnerId = partners.get(socket.id);
    if (partnerId) {
      io.to(partnerId).emit('partner-mic-state', muted);
    }
  });

  socket.on('chat-message', (text) => {
    const partnerId = partners.get(socket.id);
    if (partnerId && typeof text === 'string' && text.trim()) {
      io.to(partnerId).emit('chat-message', { text: text.slice(0, 1000) });
    }
  });

  socket.on('disconnect', () => {
    disconnectPartner(socket.id);
    clearFromQueue(socket.id);
    profiles.delete(socket.id);
    broadcastOnlineCount();
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`TalkLive server running on port ${PORT}`);
});
