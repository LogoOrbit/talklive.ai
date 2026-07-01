const path = require('path');
const crypto = require('crypto');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const geoip = require('geoip-lite');
const { generateUsername } = require('./usernames');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 5000;

app.use(express.static(path.join(__dirname, '..', 'public')));

// --- State ---
const waitingQueue = []; // socket ids waiting for a partner
const partners = new Map(); // socketId -> partnerSocketId
const profiles = new Map(); // socketId -> { username, country, city, gender, prefGender, prefCountry, language, prefLanguage, interests, clientId }
const blocks = new Map(); // clientId -> Set<clientId>
const hearts = new Map(); // pairKey ("clientIdA|clientIdB" sorted) -> Set<clientId who hearted>
const reportCounts = new Map(); // clientId -> number of times reported

// In-memory accounts only — resets on server restart. Good enough until a real DB is added.
const accounts = new Map(); // username (lowercase) -> { passwordHash, salt, nickname }
const socketAuth = new Map(); // socketId -> logged-in username (lowercase)

function pairKey(a, b) {
  return [a, b].sort().join('|');
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function createAccount(username, password, nickname) {
  const salt = crypto.randomBytes(16).toString('hex');
  accounts.set(username.toLowerCase(), {
    passwordHash: hashPassword(password, salt),
    salt,
    nickname,
  });
}

function verifyAccount(username, password) {
  const account = accounts.get(username.toLowerCase());
  if (!account) return null;
  const hash = hashPassword(password, account.salt);
  if (hash !== account.passwordHash) return null;
  return account;
}

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
    language: p.language,
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
  if (seeker.prefLanguage && seeker.prefLanguage !== 'any' && candidate.language !== seeker.prefLanguage) {
    return false;
  }
  if (candidate.prefLanguage && candidate.prefLanguage !== 'any' && seeker.language !== candidate.prefLanguage) {
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

  // Prioritize reconnecting with a recent match if both hearted each other last time.
  for (let i = 0; i < waitingQueue.length; i++) {
    const candidateId = waitingQueue[i];
    const candidate = profiles.get(candidateId);
    if (!candidate || !io.sockets.sockets.get(candidateId)) continue;
    if (isBlockedPair(seeker.clientId, candidate.clientId)) continue;
    const key = pairKey(seeker.clientId, candidate.clientId);
    const heartSet = hearts.get(key);
    if (heartSet && heartSet.has(seeker.clientId) && heartSet.has(candidate.clientId)) {
      return i;
    }
  }

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

function estimatedWaitSeconds() {
  const online = io.engine.clientsCount || 1;
  return Math.max(2, Math.min(20, Math.round(12 / Math.sqrt(online))));
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
    const key = pairKey(seekerProfile.clientId, partnerProfile.clientId);
    const rematched = hearts.has(key) && hearts.get(key).size === 2;
    hearts.delete(key);

    partnerSocket.emit('matched', { initiator: true, partner: publicProfile(seekerProfile), rematched });
    seekerSocket.emit('matched', { initiator: false, partner: publicProfile(partnerProfile), rematched });
  } else {
    waitingQueue.push(socketId);
    seekerSocket.emit('waiting', { estimatedSeconds: estimatedWaitSeconds() });
  }
}

io.on('connection', (socket) => {
  const ip = getClientIp(socket);
  const geo = lookupGeo(ip);

  socket.on('signup', ({ username, password, nickname } = {}) => {
    if (!username || !password || !nickname || username.length < 3 || password.length < 4) {
      return socket.emit('signup-result', { ok: false, error: 'Username/password too short (min 3/4 chars).' });
    }
    if (accounts.has(username.toLowerCase())) {
      return socket.emit('signup-result', { ok: false, error: 'That username is already taken.' });
    }
    createAccount(username, password, nickname.slice(0, 24));
    socketAuth.set(socket.id, username.toLowerCase());
    socket.emit('signup-result', { ok: true, username, nickname: nickname.slice(0, 24) });
  });

  socket.on('login', ({ username, password } = {}) => {
    const account = verifyAccount(username || '', password || '');
    if (!account) {
      return socket.emit('login-result', { ok: false, error: 'Invalid username or password.' });
    }
    socketAuth.set(socket.id, (username || '').toLowerCase());
    socket.emit('login-result', { ok: true, username, nickname: account.nickname });
  });

  socket.on('logout', () => {
    socketAuth.delete(socket.id);
  });

  socket.on('update-nickname', ({ nickname } = {}) => {
    const authedUsername = socketAuth.get(socket.id);
    if (!authedUsername) return socket.emit('update-nickname-result', { ok: false, error: 'Not logged in.' });
    if (!nickname || !nickname.trim()) {
      return socket.emit('update-nickname-result', { ok: false, error: 'Nickname cannot be empty.' });
    }
    const account = accounts.get(authedUsername);
    account.nickname = nickname.trim().slice(0, 24);
    const profile = profiles.get(socket.id);
    if (profile) profile.username = account.nickname;
    socket.emit('update-nickname-result', { ok: true, nickname: account.nickname });
  });

  socket.on('change-password', ({ currentPassword, newPassword } = {}) => {
    const authedUsername = socketAuth.get(socket.id);
    if (!authedUsername) return socket.emit('change-password-result', { ok: false, error: 'Not logged in.' });
    if (!verifyAccount(authedUsername, currentPassword || '')) {
      return socket.emit('change-password-result', { ok: false, error: 'Current password is incorrect.' });
    }
    if (!newPassword || newPassword.length < 4) {
      return socket.emit('change-password-result', { ok: false, error: 'New password must be at least 4 characters.' });
    }
    const account = accounts.get(authedUsername);
    const salt = crypto.randomBytes(16).toString('hex');
    account.passwordHash = hashPassword(newPassword, salt);
    account.salt = salt;
    socket.emit('change-password-result', { ok: true });
  });

  socket.on('register', (data = {}) => {
    const clientId = data.clientId || socket.id;
    profiles.set(socket.id, {
      clientId,
      username: data.nickname ? data.nickname.slice(0, 24) : generateUsername(),
      country: geo.country,
      countryName: geo.countryName,
      city: geo.city,
      gender: data.gender || 'unspecified',
      prefGender: data.prefGender || 'any',
      prefCountry: data.prefCountry || 'any',
      language: data.language || 'english',
      prefLanguage: data.prefLanguage || 'any',
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
      const count = (reportCounts.get(partner.clientId) || 0) + 1;
      reportCounts.set(partner.clientId, count);
      console.log(`[report] ${seeker.username} reported ${partner.username} (total reports: ${count})`);
      if (count >= 3) {
        console.log(`[ban] ${partner.username} auto-banned after ${count} reports`);
        const partnerSocket = io.sockets.sockets.get(partnerId);
        if (partnerSocket) {
          partnerSocket.emit('banned');
          partnerSocket.disconnect(true);
        }
      }
    }
    disconnectPartner(socket.id);
    tryMatch(socket.id);
  });

  socket.on('reaction', (emoji) => {
    const partnerId = partners.get(socket.id);
    const seeker = profiles.get(socket.id);
    const partner = partnerId ? profiles.get(partnerId) : null;
    if (!partnerId || !seeker || !partner || typeof emoji !== 'string') return;
    io.to(partnerId).emit('reaction', emoji);

    if (emoji === '❤️') {
      const key = pairKey(seeker.clientId, partner.clientId);
      if (!hearts.has(key)) hearts.set(key, new Set());
      hearts.get(key).add(seeker.clientId);
    }
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

  socket.on('typing', () => {
    const partnerId = partners.get(socket.id);
    if (partnerId) {
      io.to(partnerId).emit('typing');
    }
  });

  socket.on('disconnect', () => {
    disconnectPartner(socket.id);
    clearFromQueue(socket.id);
    profiles.delete(socket.id);
    socketAuth.delete(socket.id);
    broadcastOnlineCount();
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`TalkLive server running on port ${PORT}`);
});
