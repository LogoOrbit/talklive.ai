const path = require('path');
const crypto = require('crypto');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const geoip = require('geoip-lite');
const { OAuth2Client } = require('google-auth-library');
const { generateUsername } = require('./usernames');

const app = express();
const server = http.createServer(app);
// Socket.IO configured to prefer a real WebSocket and allow polling only as a
// bootstrap/fallback. The "breaks past ~6-7 concurrent clients" symptom comes
// from connections being stuck on HTTP long-polling: long-polling holds HTTP
// requests open, and proxies/browsers cap concurrent HTTP/1.1 connections per
// host, so the Nth late joiner can never complete its handshake (its socket
// never connects, so it never receives online-count and tap-to-talk is dead).
// WebSockets are not subject to that per-host HTTP connection pool, so allowing
// (and quickly upgrading to) WebSocket removes the ceiling entirely — no
// hardcoded limit was involved. pingTimeout is generous for flaky mobile links.
const io = new Server(server, {
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
  pingInterval: 25000,
  pingTimeout: 60000,
  maxHttpBufferSize: 1e6,
  perMessageDeflate: false,
});

// Node's default is unlimited, but make it explicit so no environment default
// silently caps concurrent sockets.
server.maxConnections = Infinity;

// Behind Render/Replit's proxy, so trust X-Forwarded-* to detect the real
// protocol and host for canonical redirects below.
app.set('trust proxy', 1);
app.disable('x-powered-by');

const PORT = process.env.PORT || 5000;
// Canonical origin used for host/protocol normalization. Override via env.
const CANONICAL_HOST = process.env.CANONICAL_HOST || 'talklive.ai';
const ENFORCE_CANONICAL = process.env.ENFORCE_CANONICAL !== 'off' && process.env.NODE_ENV === 'production';

// Consolidate link equity on a single canonical origin: force HTTPS and the
// bare apex domain (drop www) so search engines index exactly one URL per page.
app.use((req, res, next) => {
  if (!ENFORCE_CANONICAL) return next();
  const host = (req.headers.host || '').toLowerCase();
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const wantsWww = host.startsWith('www.');
  const isCanonicalHost = host === CANONICAL_HOST;
  // Only redirect for our own domain; leave preview/other hosts untouched.
  if ((wantsWww && host.slice(4) === CANONICAL_HOST) || (isCanonicalHost && proto !== 'https')) {
    return res.redirect(301, 'https://' + CANONICAL_HOST + req.originalUrl);
  }
  next();
});
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Public client ID handed to the browser so it can render the Google Sign-In
// button — safe to expose, it's not a secret.
app.get('/config.js', (req, res) => {
  res.type('application/javascript');
  res.send(`window.GOOGLE_CLIENT_ID = ${JSON.stringify(GOOGLE_CLIENT_ID)};`);
});

// ICE servers handed to the browser. Operators can plug in a real, reliable
// TURN service via env (TURN_URLS as a comma list + TURN_USERNAME/TURN_CREDENTIAL,
// or TURN_METERED_KEY for metered.ca). Cross-country calls behind symmetric NAT
// require a working TURN relay in BOTH directions — STUN alone silently produces
// one-way audio — so we always ship a broad set of relay endpoints (UDP + TCP +
// TLS/443) as a fallback and let the browser pick whichever pierces the firewall.
function buildIceServers() {
  const servers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];
  const envUrls = (process.env.TURN_URLS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (envUrls.length && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
    servers.push({
      urls: envUrls,
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL,
    });
  }
  // Open Relay Project (metered.ca) free TURN — UDP/TCP/TLS across ports so at
  // least one transport survives restrictive firewalls in either direction.
  const relayUser = process.env.OPENRELAY_USERNAME || 'openrelayproject';
  const relayCred = process.env.OPENRELAY_CREDENTIAL || 'openrelayproject';
  servers.push(
    { urls: 'turn:openrelay.metered.ca:80', username: relayUser, credential: relayCred },
    { urls: 'turn:openrelay.metered.ca:80?transport=tcp', username: relayUser, credential: relayCred },
    { urls: 'turn:openrelay.metered.ca:443', username: relayUser, credential: relayCred },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: relayUser, credential: relayCred },
    { urls: 'turns:openrelay.metered.ca:443?transport=tcp', username: relayUser, credential: relayCred },
  );
  return servers;
}

app.get('/ice-servers', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ iceServers: buildIceServers() });
});

// Redirect the raw SEO landing files (e.g. /talk-to-strangers.html) to their
// clean, canonical URLs (/talk-to-strangers) so only one version is indexed.
app.get(/^\/([a-z0-9-]+)\.html$/i, (req, res, next) => {
  const name = req.params[0];
  if (name === 'index' || name === 'privacy') return next();
  res.redirect(301, '/' + name);
});

app.use(
  express.static(path.join(__dirname, '..', 'public'), {
    // Serve clean URLs: /talk-to-strangers resolves to talk-to-strangers.html.
    extensions: ['html'],
    setHeaders(res, filePath) {
      if (/\.html$/i.test(filePath)) {
        // HTML changes with deploys — revalidate so updates show up fast.
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      } else if (/\.(css|js|svg|png|jpg|jpeg|webp|ico|woff2?)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      } else if (/\.(xml|txt|webmanifest)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }
    },
  })
);

// --- State ---
const waitingQueue = []; // socket ids waiting for a partner
const partners = new Map(); // socketId -> partnerSocketId
const profiles = new Map(); // socketId -> { username, country, city, gender, prefGender, includeCountries, excludeCountries, interests, clientId, countryFallbackActive }
const blocks = new Map(); // clientId -> Set<clientId>
const hearts = new Map(); // pairKey ("clientIdA|clientIdB" sorted) -> Set<clientId who hearted>
const reportCounts = new Map(); // clientId -> number of times reported

// If a search takes longer than this, we drop ALL matching filters for the
// current search (gender + country preferences, everything except blocks) and
// auto-match with any random stranger so nobody waits forever.
const RANDOM_FALLBACK_MS = 10000;
const waitFallbackTimers = new Map(); // socketId -> Timeout

// clientId -> true when the user chose to hide their online status from their
// added friends. Never affects the global online-user count.
const statusHidden = new Map();

function clearWaitFallbackTimer(socketId) {
  const timer = waitFallbackTimers.get(socketId);
  if (timer) {
    clearTimeout(timer);
    waitFallbackTimers.delete(socketId);
  }
}

// In-memory accounts only — resets on server restart. Good enough until a real DB is added.
const accounts = new Map(); // username (lowercase) -> { passwordHash, salt, nickname, googleId }
const socketAuth = new Map(); // socketId -> logged-in username (lowercase)
const googleAccounts = new Map(); // Google "sub" id -> username (lowercase)

// --- Friends / notifications / call-back state — all in-memory, keyed by the
// persistent per-browser clientId so it survives reconnects (works for both
// temporary/guest users and signed-in accounts). Resets on server restart.
const clientSockets = new Map(); // clientId -> current socketId, for online lookup
const friends = new Map(); // clientId -> Map<friendClientId, { username, countryCode, temporary }>
const friendRequests = new Map(); // clientId -> Map<fromClientId, { username, countryCode, temporary, ts }>
const notifications = new Map(); // clientId -> Array<notification>
const friendChats = new Map(); // pairKey -> Array<{ from, text, ts }>

function isFriend(a, b) {
  const setA = friends.get(a);
  return !!(setA && setA.has(b));
}

function addFriendPair(clientIdA, infoA, clientIdB, infoB) {
  if (!friends.has(clientIdA)) friends.set(clientIdA, new Map());
  if (!friends.has(clientIdB)) friends.set(clientIdB, new Map());
  friends.get(clientIdA).set(clientIdB, infoB);
  friends.get(clientIdB).set(clientIdA, infoA);
}

function removeFriendPair(clientIdA, clientIdB) {
  const a = friends.get(clientIdA);
  if (a) a.delete(clientIdB);
  const b = friends.get(clientIdB);
  if (b) b.delete(clientIdA);
}

function getSocketByClientId(clientId) {
  const socketId = clientSockets.get(clientId);
  return socketId ? io.sockets.sockets.get(socketId) : null;
}

function pushNotification(clientId, notif) {
  if (!notifications.has(clientId)) notifications.set(clientId, []);
  const list = notifications.get(clientId);
  const full = { id: crypto.randomUUID(), ts: Date.now(), ...notif };
  list.push(full);
  if (list.length > 50) list.shift();
  const targetSocket = getSocketByClientId(clientId);
  if (targetSocket) targetSocket.emit('notification', full);
  return full;
}

function removeNotification(clientId, notificationId) {
  const list = notifications.get(clientId);
  if (!list) return;
  const idx = list.findIndex((n) => n.id === notificationId);
  if (idx !== -1) list.splice(idx, 1);
}

function liveAvatarFor(clientId, fallback) {
  const sock = getSocketByClientId(clientId);
  const profile = sock ? profiles.get(sock.id) : null;
  return (profile && profile.avatar) || fallback || null;
}

function syncClientState(socket, clientId) {
  const friendList = Array.from((friends.get(clientId) || new Map()).entries()).map(([fid, info]) => ({
    clientId: fid,
    ...info,
    avatar: liveAvatarFor(fid, info.avatar),
    // Friends who hid their status always appear offline to friends — this
    // only masks the per-friend indicator, never the global online count.
    online: clientSockets.has(fid) && !statusHidden.get(fid),
  }));
  const requestList = Array.from((friendRequests.get(clientId) || new Map()).entries()).map(([fid, info]) => ({
    clientId: fid,
    ...info,
  }));
  socket.emit('state-sync', {
    friends: friendList,
    friendRequests: requestList,
    notifications: notifications.get(clientId) || [],
  });
}

function pairKey(a, b) {
  return [a, b].sort().join('|');
}

// No links of any kind are allowed in chat — protocols, www-prefixed hosts,
// bare domains with a TLD, or "example dot com" style obfuscation.
const LINK_RE = new RegExp(
  '(?:[a-z][a-z0-9+.-]*:\\/\\/)' // any protocol://
  + '|(?:\\bwww\\.)'
  + '|(?:\\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.(?:[a-z]{2,})(?:\\/|\\b))' // bare domain.tld
  + '|(?:\\b\\w+\\s*\\(?\\s*dot\\s*\\)?\\s*(?:com|net|org|io|gg|me|ly|co|xyz|site|online|app|tv|link|live)\\b)',
  'i'
);

function containsLink(text) {
  return LINK_RE.test(String(text || ''));
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
  if (!account || !account.passwordHash) return null;
  const hash = hashPassword(password, account.salt);
  if (hash !== account.passwordHash) return null;
  return account;
}

function uniqueUsernameFromBase(base) {
  const cleanBase = base.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16) || 'user';
  let candidate = cleanBase;
  let suffix = 1;
  while (accounts.has(candidate.toLowerCase())) {
    candidate = `${cleanBase}${suffix}`;
    suffix += 1;
  }
  return candidate;
}

// Verifies a Google ID token and finds-or-creates the account it belongs to.
async function findOrCreateGoogleAccount(idToken) {
  const ticket = await googleClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email_verified) {
    throw new Error('Could not verify Google account.');
  }

  const googleId = payload.sub;
  let username = googleAccounts.get(googleId);

  if (!username) {
    username = uniqueUsernameFromBase((payload.email || 'user').split('@')[0]);
    const nickname = (payload.name || username).slice(0, 24);
    accounts.set(username.toLowerCase(), {
      passwordHash: null,
      salt: null,
      nickname,
      googleId,
    });
    googleAccounts.set(googleId, username.toLowerCase());
  }

  return { username, account: accounts.get(username.toLowerCase()) };
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

// Push the current count straight to one freshly-connected socket so a late
// joiner always gets correct initial state immediately, independent of the
// broadcast (initial-state sync, not just incremental updates).
function sendOnlineCountTo(socket) {
  socket.emit('online-count', io.engine.clientsCount);
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

// Deliberately excludes gender (and avatar, which is gendered): nothing shown
// during a call should reveal the stranger's gender — it should only become
// apparent through conversation.
function publicProfile(p) {
  return {
    clientId: p.clientId,
    username: p.username,
    country: p.countryName,
    countryCode: p.country,
    city: p.city,
    interests: p.interests,
  };
}

// "Non Interested Countries" is a hard block. "Interested Countries" narrows
// matches to just those countries. Both are dropped entirely once the
// random-match fallback kicks in (see mutuallyCompatible).
function countryAllowed(prefs, otherCountryCode) {
  if (prefs.excludeCountries && prefs.excludeCountries.includes(otherCountryCode)) return false;
  if (prefs.includeCountries && prefs.includeCountries.length
    && !prefs.includeCountries.includes(otherCountryCode)) {
    return false;
  }
  return true;
}

// Returns true if candidate's profile satisfies seeker's filters, and vice versa.
function mutuallyCompatible(seeker, candidate) {
  if (isBlockedPair(seeker.clientId, candidate.clientId)) return false;

  // After a long wait either side falls back to "match me with anyone random":
  // every preference filter is dropped, only blocks still apply.
  if (seeker.randomFallbackActive || candidate.randomFallbackActive) return true;

  if (seeker.prefGender && seeker.prefGender !== 'any' && candidate.gender !== seeker.prefGender) {
    return false;
  }
  if (candidate.prefGender && candidate.prefGender !== 'any' && seeker.gender !== candidate.prefGender) {
    return false;
  }
  if (!countryAllowed(seeker, candidate.country)) return false;
  if (!countryAllowed(candidate, seeker.country)) return false;
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
  clearWaitFallbackTimer(socketId);

  const seekerSocket = io.sockets.sockets.get(socketId);
  if (!seekerSocket) return;

  const matchIdx = findBestMatch(socketId);

  if (matchIdx !== -1) {
    const partnerId = waitingQueue.splice(matchIdx, 1)[0];
    clearWaitFallbackTimer(partnerId);
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
    const seekerProfile = profiles.get(socketId);
    seekerSocket.emit('waiting', {
      estimatedSeconds: estimatedWaitSeconds(),
      predicted: predictedMatch(socketId),
    });

    if (seekerProfile && !seekerProfile.randomFallbackActive) {
      const timer = setTimeout(() => {
        waitFallbackTimers.delete(socketId);
        const p = profiles.get(socketId);
        if (!p || !waitingQueue.includes(socketId)) return;
        p.randomFallbackActive = true;
        const sock = io.sockets.sockets.get(socketId);
        if (sock) sock.emit('random-fallback');
        tryMatch(socketId);
      }, RANDOM_FALLBACK_MS);
      waitFallbackTimers.set(socketId, timer);
    }
  }
}

// Best guess at who the seeker will get, so the client can show a live
// "Connecting to someone in Japan…" style message before the match completes.
function predictedMatch(socketId) {
  const seeker = profiles.get(socketId);
  if (!seeker) return null;
  const candidates = [];
  for (const [sid, p] of profiles) {
    if (sid === socketId || p.clientId === seeker.clientId) continue;
    if (isBlockedPair(seeker.clientId, p.clientId)) continue;
    candidates.push(p);
  }
  if (candidates.length === 0) return null;
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return { countryCode: pick.country, country: pick.countryName };
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

  socket.on('google-auth', async ({ credential } = {}) => {
    if (!GOOGLE_CLIENT_ID) {
      return socket.emit('google-auth-result', { ok: false, error: 'Google Sign-In is not configured on this server.' });
    }
    if (!credential || typeof credential !== 'string') {
      return socket.emit('google-auth-result', { ok: false, error: 'Missing Google credential.' });
    }
    try {
      const { username, account } = await findOrCreateGoogleAccount(credential);
      socketAuth.set(socket.id, username.toLowerCase());
      socket.emit('google-auth-result', { ok: true, username, nickname: account.nickname });
    } catch (err) {
      console.error('[google-auth] verification failed:', err.message);
      socket.emit('google-auth-result', { ok: false, error: 'Google sign-in failed. Please try again.' });
    }
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
    const sanitizeCountryList = (list) => (Array.isArray(list) ? list.filter((c) => typeof c === 'string').slice(0, 50) : []);
    profiles.set(socket.id, {
      clientId,
      username: data.nickname ? data.nickname.slice(0, 24) : generateUsername(),
      country: geo.country,
      countryName: geo.countryName,
      city: geo.city,
      gender: data.gender || 'unspecified',
      prefGender: data.prefGender || 'any',
      includeCountries: sanitizeCountryList(data.includeCountries),
      excludeCountries: sanitizeCountryList(data.excludeCountries),
      randomFallbackActive: false,
      interests: Array.isArray(data.interests) ? data.interests.slice(0, 10) : [],
      avatar: typeof data.avatar === 'string' && /^[mf][1-5]$/.test(data.avatar) ? data.avatar : null,
    });
    clientSockets.set(clientId, socket.id);
    if (typeof data.hideStatus === 'boolean') statusHidden.set(clientId, data.hideStatus);

    socket.emit('profile', {
      username: profiles.get(socket.id).username,
      country: geo.countryName,
      countryCode: geo.country,
      city: geo.city,
    });

    syncClientState(socket, clientId);
  });

  // Give the just-connected client its initial count right away, then tell
  // everyone (including it) the new total.
  sendOnlineCountTo(socket);
  broadcastOnlineCount();

  socket.on('find-partner', () => {
    const profile = profiles.get(socket.id);
    if (!profile) return;
    // A fresh, explicit search starts with the full set of filters again.
    profile.randomFallbackActive = false;
    tryMatch(socket.id);
  });

  socket.on('skip', () => {
    disconnectPartner(socket.id);
    const profile = profiles.get(socket.id);
    if (profile) profile.randomFallbackActive = false;
    tryMatch(socket.id);
  });

  // Personal online-status visibility: hides this user's status only from
  // their added friends. Never affects the global online-user count.
  socket.on('set-status-visibility', ({ hidden } = {}) => {
    const profile = profiles.get(socket.id);
    if (!profile) return;
    statusHidden.set(profile.clientId, !!hidden);
    // Re-sync everyone who has this user as a friend so their list updates live.
    for (const [fid, map] of friends) {
      if (map.has(profile.clientId)) {
        const friendSocket = getSocketByClientId(fid);
        if (friendSocket) syncClientState(friendSocket, fid);
      }
    }
  });

  socket.on('leave', () => {
    disconnectPartner(socket.id);
    clearFromQueue(socket.id);
    clearWaitFallbackTimer(socket.id);
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

  socket.on('reaction', (reaction) => {
    const partnerId = partners.get(socket.id);
    const seeker = profiles.get(socket.id);
    const partner = partnerId ? profiles.get(partnerId) : null;
    if (!partnerId || !seeker || !partner || typeof reaction !== 'string') return;
    io.to(partnerId).emit('reaction', reaction);

    if (reaction === 'heart') {
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
      if (containsLink(text)) {
        return socket.emit('chat-blocked', { reason: 'link' });
      }
      io.to(partnerId).emit('chat-message', { text: text.slice(0, 1000) });
    }
  });

  socket.on('typing', () => {
    const partnerId = partners.get(socket.id);
    if (partnerId) {
      io.to(partnerId).emit('typing');
    }
  });

  // Mini-game (Ludo) relay — forwards game events to the current partner only.
  socket.on('game', (data) => {
    const partnerId = partners.get(socket.id);
    if (partnerId && data && typeof data === 'object') {
      io.to(partnerId).emit('game', data);
    }
  });

  // --- Friends ---
  socket.on('friend-request', ({ targetClientId } = {}) => {
    const me = profiles.get(socket.id);
    if (!me || !targetClientId || targetClientId === me.clientId) return;
    if (isBlockedPair(me.clientId, targetClientId)) {
      return socket.emit('friend-request-result', { ok: false, error: 'Unable to send friend request.' });
    }
    if (isFriend(me.clientId, targetClientId)) {
      return socket.emit('friend-request-result', { ok: true, alreadyFriends: true });
    }
    const temporary = !socketAuth.get(socket.id);
    const myInfo = { username: me.username, countryCode: me.country, temporary, avatar: me.avatar };

    if (!friendRequests.has(targetClientId)) friendRequests.set(targetClientId, new Map());
    friendRequests.get(targetClientId).set(me.clientId, { ...myInfo, ts: Date.now() });

    pushNotification(targetClientId, {
      type: 'friend_request',
      fromClientId: me.clientId,
      username: myInfo.username,
      countryCode: myInfo.countryCode,
      temporary: myInfo.temporary,
    });

    const targetSocket = getSocketByClientId(targetClientId);
    if (targetSocket) syncClientState(targetSocket, targetClientId);

    socket.emit('friend-request-result', { ok: true, sent: true });
  });

  socket.on('friend-request-respond', ({ fromClientId, accept, notificationId } = {}) => {
    const me = profiles.get(socket.id);
    if (!me || !fromClientId) return;
    const reqMap = friendRequests.get(me.clientId);
    const req = reqMap && reqMap.get(fromClientId);
    if (!req) return;
    reqMap.delete(fromClientId);
    if (notificationId) removeNotification(me.clientId, notificationId);

    if (accept) {
      const temporary = !socketAuth.get(socket.id);
      const myInfo = { username: me.username, countryCode: me.country, temporary, avatar: me.avatar };
      addFriendPair(
        me.clientId, myInfo,
        fromClientId, { username: req.username, countryCode: req.countryCode, temporary: req.temporary, avatar: req.avatar }
      );
      pushNotification(fromClientId, {
        type: 'friend_accepted',
        byClientId: me.clientId,
        username: myInfo.username,
      });
    }

    syncClientState(socket, me.clientId);
    const fromSocket = getSocketByClientId(fromClientId);
    if (fromSocket) syncClientState(fromSocket, fromClientId);
  });

  socket.on('remove-friend', ({ friendClientId } = {}) => {
    const me = profiles.get(socket.id);
    if (!me || !friendClientId) return;
    removeFriendPair(me.clientId, friendClientId);
    syncClientState(socket, me.clientId);
    const friendSocket = getSocketByClientId(friendClientId);
    if (friendSocket) syncClientState(friendSocket, friendClientId);
  });

  socket.on('block-friend', ({ friendClientId } = {}) => {
    const me = profiles.get(socket.id);
    if (!me || !friendClientId) return;
    removeFriendPair(me.clientId, friendClientId);
    blockPair(me.clientId, friendClientId);
    syncClientState(socket, me.clientId);
  });

  // --- Friend-to-friend chat (separate from the ephemeral in-call chat) ---
  socket.on('friend-message', ({ toClientId, text } = {}) => {
    const me = profiles.get(socket.id);
    if (!me || !toClientId || typeof text !== 'string' || !text.trim()) return;
    if (!isFriend(me.clientId, toClientId)) return;
    if (containsLink(text)) {
      return socket.emit('chat-blocked', { reason: 'link' });
    }
    const trimmed = text.trim().slice(0, 1000);
    const key = pairKey(me.clientId, toClientId);
    if (!friendChats.has(key)) friendChats.set(key, []);
    const msg = { from: me.clientId, text: trimmed, ts: Date.now() };
    const list = friendChats.get(key);
    list.push(msg);
    if (list.length > 200) list.shift();

    const targetSocket = getSocketByClientId(toClientId);
    if (targetSocket) targetSocket.emit('friend-message', { fromClientId: me.clientId, text: trimmed, ts: msg.ts });

    pushNotification(toClientId, {
      type: 'message',
      fromClientId: me.clientId,
      username: me.username,
      text: trimmed,
    });

    socket.emit('friend-message-sent', { toClientId, text: trimmed, ts: msg.ts });
  });

  socket.on('get-friend-chat', ({ friendClientId } = {}) => {
    const me = profiles.get(socket.id);
    if (!me || !friendClientId) return;
    const key = pairKey(me.clientId, friendClientId);
    socket.emit('friend-chat-history', { friendClientId, messages: friendChats.get(key) || [] });
  });

  socket.on('mark-messages-read', ({ friendClientId } = {}) => {
    const me = profiles.get(socket.id);
    if (!me || !friendClientId) return;
    const list = notifications.get(me.clientId);
    if (!list) return;
    notifications.set(me.clientId, list.filter((n) => !(n.type === 'message' && n.fromClientId === friendClientId)));
  });

  socket.on('clear-notification', ({ notificationId } = {}) => {
    const me = profiles.get(socket.id);
    if (!me || !notificationId) return;
    removeNotification(me.clientId, notificationId);
  });

  // --- Call back: re-connect directly with someone from call history ---
  socket.on('call-back-request', ({ targetClientId } = {}) => {
    const me = profiles.get(socket.id);
    if (!me || !targetClientId) return;
    if (isBlockedPair(me.clientId, targetClientId)) {
      return socket.emit('call-back-request-result', { ok: false, reason: 'blocked' });
    }
    const targetSocketId = clientSockets.get(targetClientId);
    const targetSocket = targetSocketId ? io.sockets.sockets.get(targetSocketId) : null;
    if (!targetSocket) {
      return socket.emit('call-back-request-result', { ok: false, reason: 'offline' });
    }
    if (partners.has(targetSocketId)) {
      return socket.emit('call-back-request-result', { ok: false, reason: 'busy' });
    }

    targetSocket.emit('call-back-request', {
      fromClientId: me.clientId,
      username: me.username,
      countryCode: me.country,
    });
    pushNotification(targetClientId, {
      type: 'call_back_request',
      fromClientId: me.clientId,
      username: me.username,
      countryCode: me.country,
    });

    socket.emit('call-back-request-result', { ok: true, pending: true });
  });

  socket.on('call-back-respond', ({ fromClientId, accept } = {}) => {
    const me = profiles.get(socket.id);
    if (!me || !fromClientId) return;

    const list = notifications.get(me.clientId);
    if (list) {
      notifications.set(me.clientId, list.filter((n) => !(n.type === 'call_back_request' && n.fromClientId === fromClientId)));
    }

    const requesterSocketId = clientSockets.get(fromClientId);
    const requesterSocket = requesterSocketId ? io.sockets.sockets.get(requesterSocketId) : null;

    if (!accept) {
      if (requesterSocket) requesterSocket.emit('call-back-declined', { byClientId: me.clientId, username: me.username });
      return;
    }

    if (!requesterSocket) {
      return socket.emit('call-back-request-result', { ok: false, reason: 'offline' });
    }

    // Force-pair directly, bypassing the normal matching queue/filters.
    disconnectPartner(socket.id);
    disconnectPartner(requesterSocketId);
    clearFromQueue(socket.id);
    clearFromQueue(requesterSocketId);
    clearWaitFallbackTimer(socket.id);
    clearWaitFallbackTimer(requesterSocketId);

    partners.set(socket.id, requesterSocketId);
    partners.set(requesterSocketId, socket.id);

    const requesterProfile = profiles.get(requesterSocketId);
    const key = pairKey(me.clientId, requesterProfile.clientId);
    hearts.delete(key);

    requesterSocket.emit('matched', { initiator: true, partner: publicProfile(me), rematched: false, callback: true });
    socket.emit('matched', { initiator: false, partner: publicProfile(requesterProfile), rematched: false, callback: true });
  });

  socket.on('disconnect', () => {
    disconnectPartner(socket.id);
    clearFromQueue(socket.id);
    clearWaitFallbackTimer(socket.id);
    const profile = profiles.get(socket.id);
    if (profile && clientSockets.get(profile.clientId) === socket.id) {
      clientSockets.delete(profile.clientId);
    }
    profiles.delete(socket.id);
    socketAuth.delete(socket.id);
    broadcastOnlineCount();
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`TalkLive server running on port ${PORT}`);
});
