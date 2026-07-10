const path = require('path');
const crypto = require('crypto');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const geoip = require('geoip-lite');
const { OAuth2Client } = require('google-auth-library');
const { generateUsername } = require('./usernames');
const store = require('./store');
const { createAdmin } = require('./admin');

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

// Security headers on every response. The CSP allowlists exactly the external
// origins the app legitimately uses (Google Sign-In, Paddle checkout, flag
// images) and blocks everything else, so an injected <script src> or exfil
// request to an attacker's host is refused by the browser. frame-ancestors and
// X-Frame-Options stop the site being embedded for clickjacking; nosniff stops
// MIME-confusion attacks. 'unsafe-inline' is required by the existing inline
// scripts/handlers and styles, so the CSP is defense-in-depth on top of the
// output-escaping fixes rather than the sole XSS barrier.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://accounts.google.com https://cdn.paddle.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://flagcdn.com https://*.paddle.com",
  "font-src 'self' data:",
  "connect-src 'self' ws: wss: https://accounts.google.com https://flagcdn.com https://*.paddle.com https://*.paddle.net",
  "frame-src https://accounts.google.com https://*.paddle.com https://*.paddle.net",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'microphone=(self), camera=(), geolocation=(), payment=(self)');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Tiny health check for uptime pingers (cron-job.org / UptimeRobot). Returns a
// few bytes instead of the full homepage, so the pinger doesn't abort with
// "output too large", yet the request still hits the server every few minutes —
// which is what keeps the Render dyno and the Supabase database from sleeping.
// Placed before maintenance mode and analytics so it always answers cheaply and
// never inflates visit counts.
app.get(['/healthz', '/ping'], (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.type('text/plain').send('ok');
});

const PORT = process.env.PORT || 5000;
// Canonical origin used for host/protocol normalization. Override via env.
const CANONICAL_HOST = process.env.CANONICAL_HOST || 'talklive.app';
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

// --- Premium (TalkLive Plus via Paddle) --------------------------------------
// Free-tier limits; premium (paid via Paddle) removes all of them.
const FREE_LIMITS = {
  countries: 3, // max countries per preferred/not-preferred list
  friends: 10, // max friends
  matchDelayMs: 5000, // wait before matching the next person
};
// Premium registry lives in the persistent store (Postgres/file) so paid
// customers survive restarts and deploys. PREMIUM_CLIENT_IDS is an env
// override for testing/manual grants.
const envPremiumClients = new Set(
  (process.env.PREMIUM_CLIENT_IDS || '').split(',').map((s) => s.trim()).filter(Boolean)
);
function isPremium(clientId) {
  return envPremiumClients.has(clientId) || store.isPremiumClient(clientId);
}

const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET || '';

// Verify a Paddle webhook signature (Paddle-Signature: "ts=...;h1=...").
function verifyPaddleSignature(rawBody, header) {
  if (!PADDLE_WEBHOOK_SECRET) {
    // Without a secret we can't authenticate the sender. Accept only outside
    // production (local dev); in production an unsigned webhook would let
    // anyone grant themselves premium with a single curl request.
    return process.env.NODE_ENV !== 'production';
  }
  try {
    const parts = Object.fromEntries(String(header || '').split(';').map((p) => p.split('=')));
    if (!parts.ts || !parts.h1) return false;
    const expected = crypto.createHmac('sha256', PADDLE_WEBHOOK_SECRET)
      .update(`${parts.ts}:${rawBody}`).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.h1));
  } catch (e) {
    return false;
  }
}

// Paddle server webhook: marks the paying browser's clientId as premium the
// moment a transaction completes / subscription activates, and revokes it when
// the subscription is canceled or expires.
app.post('/paddle/webhook', express.raw({ type: '*/*', limit: '256kb' }), (req, res) => {
  const raw = req.body ? req.body.toString('utf8') : '';
  if (!verifyPaddleSignature(raw, req.headers['paddle-signature'])) {
    return res.status(401).json({ ok: false });
  }
  let event;
  try {
    event = JSON.parse(raw);
  } catch (e) {
    return res.status(400).json({ ok: false });
  }
  const type = event.event_type || '';
  const d = event.data || {};
  const custom = d.custom_data || {};
  const clientId = typeof custom.clientId === 'string' ? custom.clientId : null;
  const subscriptionId = d.subscription_id || (type.startsWith('subscription.') ? d.id : null) || null;
  if (clientId) {
    if (['transaction.completed', 'subscription.activated', 'subscription.created', 'subscription.resumed'].includes(type)) {
      store.setPremium(clientId, { lastEvent: type, subscriptionId });
      console.log(`[paddle] premium activated for ${clientId} (${type})`);
      const sock = getSocketByClientId(clientId);
      if (sock) sock.emit('premium-status', { premium: true, limits: FREE_LIMITS });
    } else if (['subscription.canceled', 'subscription.past_due', 'subscription.paused'].includes(type)) {
      store.revokePremium(clientId, { lastEvent: type, subscriptionId });
      console.log(`[paddle] premium revoked for ${clientId} (${type})`);
      const sock = getSocketByClientId(clientId);
      if (sock) sock.emit('premium-status', { premium: false, limits: FREE_LIMITS });
    }
  }
  res.json({ ok: true });
});

// Lets the pricing page (a separate static page) confirm activation.
app.get('/premium-status', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ premium: isPremium(String(req.query.clientId || '')) });
});

// Public client ID handed to the browser so it can render the Google Sign-In
// button — safe to expose, it's not a secret.
app.get('/config.js', (req, res) => {
  res.type('application/javascript');
  res.send(
    `window.GOOGLE_CLIENT_ID = ${JSON.stringify(GOOGLE_CLIENT_ID)};`
    + `window.PADDLE_CLIENT_TOKEN = ${JSON.stringify(process.env.PADDLE_CLIENT_TOKEN || '')};`
    + `window.PADDLE_PRICE_ID = ${JSON.stringify(process.env.PADDLE_PRICE_ID || '')};`
    + `window.PADDLE_ENV = ${JSON.stringify(process.env.PADDLE_ENV || 'production')};`
  );
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

// The call and chat screens are their own URLs (reached via
// history.replaceState once the user taps Talk or Chat), but they're still the
// same single-page app — serve the same shell so a direct hit/refresh works.
app.get(['/call', '/chat'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Redirect the raw SEO landing files (e.g. /talk-to-strangers.html) to their
// clean, canonical URLs (/talk-to-strangers) so only one version is indexed.
app.get(/^\/([a-z0-9-]+)\.html$/i, (req, res, next) => {
  const name = req.params[0];
  if (name === 'index') return next();
  res.redirect(301, '/' + name);
});

// --- Owner dashboard, analytics & maintenance mode ---------------------------

// Runtime snapshot handed to the dashboard: everything live, straight from memory.
function getRuntime() {
  const users = [];
  for (const [sid, p] of profiles) {
    const sock = io.sockets.sockets.get(sid);
    if (!sock) continue;
    users.push({
      clientId: p.clientId,
      username: p.username,
      country: p.countryName,
      countryCode: p.country,
      city: p.city,
      gender: p.gender,
      ip: getClientIp(sock),
      inCall: partners.has(sid),
      waiting: waitingQueue.includes(sid),
      account: socketAuth.get(sid) || null,
      premium: isPremium(p.clientId),
      reports: store.reportCountFor(p.clientId),
    });
  }
  return {
    online: io.engine.clientsCount,
    inCall: partners.size,
    waiting: waitingQueue.length,
    users,
    uptimeSeconds: Math.round(process.uptime()),
    memoryMB: Math.round(process.memoryUsage().rss / 1048576),
  };
}

// Force-disconnect a freshly banned user so a ban takes effect instantly.
function kickBanned(clientId, ip, ban) {
  for (const [sid, p] of profiles) {
    const sock = io.sockets.sockets.get(sid);
    if (!sock) continue;
    if ((clientId && p.clientId === clientId) || (ip && getClientIp(sock) === ip)) {
      sock.emit('banned', { until: ban.expiresAt, reason: ban.reason });
      sock.disconnect(true);
    }
  }
}

const admin = createAdmin({ io, getRuntime, kickBanned });
app.use('/owner', admin.router);

// Maintenance mode: when on, every non-dashboard page gets a friendly 503.
app.use((req, res, next) => {
  if (!store.data.settings.maintenance.on) return next();
  if (req.path.startsWith('/owner')) return next();
  if (/\.(css|js|svg|png|ico|webmanifest|xml|txt)$/i.test(req.path)) return next();
  res.status(503).type('html').send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TalkLive — Maintenance</title><style>body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:#0d0d0d;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px}h1{font-size:2rem;margin:.4em 0}.orb{width:72px;height:72px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#6da7ec,#184f95);margin:0 auto 18px;animation:p 2s ease-in-out infinite}@keyframes p{50%{transform:scale(1.08);opacity:.85}}p{color:#c3c2b7;max-width:420px;margin:0 auto;line-height:1.5}</style></head><body><div><div class="orb"></div><h1>We&rsquo;ll be right back</h1><p>${store.data.settings.maintenance.message.replace(/</g, '&lt;')}</p></div></body></html>`);
});

// Count page visits (HTML navigations only, not assets) with geo attribution.
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/owner')
    && (req.path === '/' || /^\/[a-z0-9-]+$/i.test(req.path))
    && String(req.headers.accept || '').includes('text/html')) {
    const fwd = req.headers['x-forwarded-for'];
    const ip = ((fwd ? String(fwd).split(',')[0].trim() : req.socket.remoteAddress) || '').replace('::ffff:', '');
    const geo = lookupGeo(ip);
    store.recordVisit(ip, geo.countryName, geo.city);
  }
  next();
});

// Marketing landing page on its own subdomain (e.g. start.talklive.app or
// www.talklive.app pointed here via LANDING_HOST). The root of that host
// serves the landing page; the main app stays on the canonical host. The
// page is also always reachable at /landing on any host.
const LANDING_HOST = (process.env.LANDING_HOST || '').toLowerCase();
app.get('/', (req, res, next) => {
  const host = (req.headers.host || '').toLowerCase();
  if (LANDING_HOST && host === LANDING_HOST) {
    return res.sendFile(path.join(__dirname, '..', 'public', 'landing.html'));
  }
  next();
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

// Friendly 404 for unknown pages: correct status code (so search engines drop
// dead URLs) plus links back into the site instead of Express's plain text.
app.use((req, res) => {
  res.status(404).type('html').send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found — TalkLive</title><meta name="robots" content="noindex"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><style>body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:#0b0f1a;color:#eef1f9;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px}h1{font-size:2rem;margin:.4em 0}p{color:#9aa3b8;max-width:420px;margin:0 auto 20px;line-height:1.5}a.btn{display:inline-block;background:#4f7cff;color:#fff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:600}a{color:#8fb0ff}nav{margin-top:18px;display:flex;gap:16px;justify-content:center;flex-wrap:wrap;font-size:14px}</style></head><body><div><h1>404 — page not found</h1><p>That page doesn't exist, but thousands of people are online talking right now.</p><a class="btn" href="/">Start Talking Free</a><nav><a href="/talk-to-strangers">Talk to Strangers</a><a href="/random-voice-chat">Random Voice Chat</a><a href="/blog/">Blog</a><a href="/contact">Contact</a></nav></div></body></html>`);
});

// --- State ---
const waitingQueue = []; // socket ids waiting for a partner
const partners = new Map(); // socketId -> partnerSocketId
const profiles = new Map(); // socketId -> { username, country, city, gender, prefGender, includeCountries, excludeCountries, interests, clientId, countryFallbackActive }
const blocks = new Map(); // clientId -> Set<clientId>
const hearts = new Map(); // pairKey ("clientIdA|clientIdB" sorted) -> Set<clientId who hearted>

// If a search takes longer than this, we drop ALL matching filters for the
// current search (gender + country preferences, everything except blocks) and
// auto-match with any random stranger so nobody waits forever.
const RANDOM_FALLBACK_MS = 10000;
const waitFallbackTimers = new Map(); // socketId -> Timeout

// Free-tier "next person" delay: non-premium users wait ~5s before the next
// search actually starts. Premium users match instantly.
const matchDelayTimers = new Map(); // socketId -> Timeout

function clearMatchDelayTimer(socketId) {
  const timer = matchDelayTimers.get(socketId);
  if (timer) {
    clearTimeout(timer);
    matchDelayTimers.delete(socketId);
  }
}

function friendCount(clientId) {
  const map = friends.get(clientId);
  return map ? map.size : 0;
}

function atFriendLimit(clientId) {
  return !isPremium(clientId) && friendCount(clientId) >= FREE_LIMITS.friends;
}

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

// Accounts are held in memory for fast access but are also written through to
// the persistent store (Postgres/file), so a signed-in user keeps their account
// across restarts and deploys. socketAuth stays in-memory (per-connection).
const accounts = new Map(); // username (lowercase) -> { passwordHash, salt, nickname, googleId }
const socketAuth = new Map(); // socketId -> logged-in username (lowercase)
const googleAccounts = new Map(); // Google "sub" id -> username (lowercase)

// Persist the live accounts Map back to the durable store.
function persistAccount(usernameLower) {
  const acc = accounts.get(usernameLower);
  if (acc) store.saveAccount(usernameLower, acc);
}

// --- Friends / notifications / call-back state — all in-memory, keyed by the
// persistent per-browser clientId so it survives reconnects (works for both
// temporary/guest users and signed-in accounts). Resets on server restart.
const clientSockets = new Map(); // clientId -> current socketId, for online lookup
const friends = new Map(); // clientId -> Map<friendClientId, { username, countryCode, temporary }>
const friendRequests = new Map(); // clientId -> Map<fromClientId, { username, countryCode, temporary, ts }>
const notifications = new Map(); // clientId -> Array<notification>
const friendChats = new Map(); // pairKey -> Array<{ from, text, ts }>

// Serialize the live social Maps back to plain JSON and persist them, so users'
// friends and their chat history ("memories") survive restarts. Debounced by
// the store, so calling it on each mutation is cheap.
function persistSocial() {
  const friendsObj = {};
  for (const [cid, m] of friends) {
    if (m.size) friendsObj[cid] = Object.fromEntries(m);
  }
  const chatsObj = {};
  for (const [key, list] of friendChats) {
    if (list.length) chatsObj[key] = list;
  }
  const blocksObj = {};
  for (const [cid, set] of blocks) {
    if (set.size) blocksObj[cid] = Array.from(set);
  }
  store.saveSocial({ friends: friendsObj, friendChats: chatsObj, blocks: blocksObj });
}

// Load durable accounts + social graph from the store into the in-memory Maps
// on boot, before the server starts accepting connections.
function hydrateFromStore() {
  for (const [usernameLower, acc] of Object.entries(store.data.accounts || {})) {
    accounts.set(usernameLower, {
      passwordHash: acc.passwordHash || null,
      salt: acc.salt || null,
      nickname: acc.nickname || '',
      googleId: acc.googleId || null,
    });
  }
  for (const [googleId, usernameLower] of Object.entries(store.data.googleIndex || {})) {
    googleAccounts.set(googleId, usernameLower);
  }
  const social = store.data.social || {};
  for (const [cid, m] of Object.entries(social.friends || {})) {
    friends.set(cid, new Map(Object.entries(m)));
  }
  for (const [key, list] of Object.entries(social.friendChats || {})) {
    friendChats.set(key, Array.isArray(list) ? list : []);
  }
  for (const [cid, arr] of Object.entries(social.blocks || {})) {
    blocks.set(cid, new Set(arr));
  }
}

function isFriend(a, b) {
  const setA = friends.get(a);
  return !!(setA && setA.has(b));
}

function addFriendPair(clientIdA, infoA, clientIdB, infoB) {
  if (!friends.has(clientIdA)) friends.set(clientIdA, new Map());
  if (!friends.has(clientIdB)) friends.set(clientIdB, new Map());
  friends.get(clientIdA).set(clientIdB, infoB);
  friends.get(clientIdB).set(clientIdA, infoA);
  persistSocial();
}

function removeFriendPair(clientIdA, clientIdB) {
  const a = friends.get(clientIdA);
  if (a) a.delete(clientIdB);
  const b = friends.get(clientIdB);
  if (b) b.delete(clientIdA);
  persistSocial();
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
  persistAccount(username.toLowerCase());
}

// Per-IP signup throttle: at most a handful of new accounts per IP per hour so
// a script can't mass-create accounts to flood storage or evade bans.
const SIGNUP_LIMIT = 5;
const SIGNUP_WINDOW_MS = 60 * 60000;
const signupAttempts = new Map(); // ip -> { first, count }
function signupThrottled(ip) {
  const rec = signupAttempts.get(ip);
  if (!rec) return false;
  if (Date.now() - rec.first > SIGNUP_WINDOW_MS) { signupAttempts.delete(ip); return false; }
  return rec.count >= SIGNUP_LIMIT;
}
function noteSignup(ip) {
  const rec = signupAttempts.get(ip) || { first: Date.now(), count: 0 };
  rec.count += 1;
  signupAttempts.set(ip, rec);
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
    persistAccount(username.toLowerCase());
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
  persistSocial();
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
  // Never match a user with themselves (e.g. two tabs of the same browser).
  if (seeker.clientId === candidate.clientId) return false;
  if (isBlockedPair(seeker.clientId, candidate.clientId)) return false;

  // Tap to Talk and Tap to Chat are separate pools: a voice caller must never
  // land in a text chat and vice versa. Mode is a hard gate that survives the
  // random fallback below — dropping it would put a mic-less chatter in a call.
  if ((seeker.mode || 'talk') !== (candidate.mode || 'talk')) return false;

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

    const mode = seekerProfile.mode || 'talk';
    store.recordFeature(mode === 'chat' ? 'chat_match' : 'match');
    partnerSocket.emit('matched', { initiator: true, partner: publicProfile(seekerProfile), rematched, mode });
    seekerSocket.emit('matched', { initiator: false, partner: publicProfile(partnerProfile), rematched, mode });
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
    if ((seeker.mode || 'talk') !== (p.mode || 'talk')) continue;
    candidates.push(p);
  }
  if (candidates.length === 0) return null;
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return { countryCode: pick.country, country: pick.countryName };
}


// Reject non-string / malformed ids coming off the wire before they're used as
// Map keys or echoed to other clients.
function validId(id) {
  return typeof id === 'string' && id.length >= 1 && id.length <= 64 ? id : null;
}

io.on('connection', (socket) => {
  const ip = getClientIp(socket);
  const geo = lookupGeo(ip);

  // Per-socket event rate limiter (token bucket): a hostile or buggy client
  // can otherwise emit unlimited events and flood the server, spam friend
  // requests/notifications, or drown real traffic. High-frequency signalling
  // events (WebRTC 'signal', 'typing', 'game') are exempt from the strict cap
  // but still bounded generously so normal calls are never throttled.
  const RATE = { tokens: 40, last: Date.now() };
  const REFILL_PER_SEC = 25;
  const BURST_EXEMPT = new Set(['signal', 'typing', 'game', 'mic-state', 'reaction']);
  socket.use((packet, next) => {
    const now = Date.now();
    RATE.tokens = Math.min(120, RATE.tokens + ((now - RATE.last) / 1000) * REFILL_PER_SEC);
    RATE.last = now;
    const event = Array.isArray(packet) ? packet[0] : '';
    const cost = BURST_EXEMPT.has(event) ? 0.2 : 1;
    if (RATE.tokens < cost) {
      return next(new Error('rate-limited'));
    }
    RATE.tokens -= cost;
    next();
  });
  // Swallow rate-limit errors quietly instead of disconnecting on the first
  // over-limit event, so a brief burst just drops packets rather than the call.
  socket.on('error', () => { /* rate-limited or malformed packet — ignore */ });

  // Maintenance mode: only the owner dashboard stays live.
  if (store.data.settings.maintenance.on) {
    socket.emit('maintenance', { message: store.data.settings.maintenance.message });
    socket.disconnect(true);
    return;
  }

  // Banned by IP: refuse service entirely until the ban expires or is lifted.
  const ipBan = store.findActiveBan(null, ip);
  if (ipBan) {
    socket.emit('banned', { until: ipBan.expiresAt, reason: ipBan.reason });
    socket.disconnect(true);
    return;
  }

  store.recordConnection();
  store.recordPeakOnline(io.engine.clientsCount);

  socket.on('signup', ({ username, password, nickname } = {}) => {
    if (typeof username !== 'string' || typeof password !== 'string' || typeof nickname !== 'string'
      || !username || !password || !nickname.trim() || username.length < 3 || password.length < 4) {
      return socket.emit('signup-result', { ok: false, error: 'Username/password too short (min 3/4 chars).' });
    }
    if (!/^[A-Za-z0-9_.-]{3,24}$/.test(username)) {
      return socket.emit('signup-result', { ok: false, error: 'Username may only contain letters, numbers, dot, dash or underscore (3–24 chars).' });
    }
    if (signupThrottled(ip)) {
      return socket.emit('signup-result', { ok: false, error: 'Too many accounts created from this network. Please try again later.' });
    }
    if (accounts.has(username.toLowerCase())) {
      return socket.emit('signup-result', { ok: false, error: 'That username is already taken.' });
    }
    noteSignup(ip);
    createAccount(username, password, nickname.slice(0, 24));
    socketAuth.set(socket.id, username.toLowerCase());
    store.recordFeature('signup');
    store.upsertAccount(username.toLowerCase(), {
      username,
      nickname: nickname.slice(0, 24),
      method: 'password',
      country: geo.countryName,
      city: geo.city,
      ip,
      lastSeen: Date.now(),
    });
    socket.emit('signup-result', { ok: true, username, nickname: nickname.slice(0, 24) });
  });

  socket.on('login', ({ username, password } = {}) => {
    if (typeof username !== 'string') username = '';
    if (typeof password !== 'string') password = '';
    const account = verifyAccount(username, password);
    if (!account) {
      return socket.emit('login-result', { ok: false, error: 'Invalid username or password.' });
    }
    socketAuth.set(socket.id, (username || '').toLowerCase());
    store.recordFeature('login');
    store.upsertAccount((username || '').toLowerCase(), {
      username, nickname: account.nickname, country: geo.countryName, city: geo.city, ip, lastSeen: Date.now(),
    });
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
      store.recordFeature('google_signin');
      store.upsertAccount(username.toLowerCase(), {
        username, nickname: account.nickname, method: 'google', country: geo.countryName, city: geo.city, ip, lastSeen: Date.now(),
      });
      socket.emit('google-auth-result', { ok: true, username, nickname: account.nickname });
    } catch (err) {
      console.error('[google-auth] verification failed:', err.message);
      socket.emit('google-auth-result', { ok: false, error: 'Google sign-in failed. Please try again.' });
    }
  });

  socket.on('update-nickname', ({ nickname } = {}) => {
    const authedUsername = socketAuth.get(socket.id);
    if (!authedUsername) return socket.emit('update-nickname-result', { ok: false, error: 'Not logged in.' });
    if (typeof nickname !== 'string' || !nickname.trim()) {
      return socket.emit('update-nickname-result', { ok: false, error: 'Nickname cannot be empty.' });
    }
    const account = accounts.get(authedUsername);
    account.nickname = nickname.trim().slice(0, 24);
    persistAccount(authedUsername);
    const profile = profiles.get(socket.id);
    if (profile) profile.username = account.nickname;
    socket.emit('update-nickname-result', { ok: true, nickname: account.nickname });
  });

  socket.on('change-password', ({ currentPassword, newPassword } = {}) => {
    const authedUsername = socketAuth.get(socket.id);
    if (!authedUsername) return socket.emit('change-password-result', { ok: false, error: 'Not logged in.' });
    if (typeof currentPassword !== 'string') currentPassword = '';
    if (!verifyAccount(authedUsername, currentPassword)) {
      return socket.emit('change-password-result', { ok: false, error: 'Current password is incorrect.' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 4) {
      return socket.emit('change-password-result', { ok: false, error: 'New password must be at least 4 characters.' });
    }
    const account = accounts.get(authedUsername);
    const salt = crypto.randomBytes(16).toString('hex');
    account.passwordHash = hashPassword(newPassword, salt);
    account.salt = salt;
    persistAccount(authedUsername);
    socket.emit('change-password-result', { ok: true });
  });

  socket.on('register', (data = {}) => {
    // Only accept well-formed client IDs: they are echoed back to other users'
    // browsers inside HTML attributes (friends list, notifications), so an
    // arbitrary string here would be a stored-XSS vector.
    const rawClientId = typeof data.clientId === 'string' ? data.clientId : '';
    const clientId = /^[A-Za-z0-9_-]{8,64}$/.test(rawClientId) ? rawClientId : socket.id;
    // Banned by persistent clientId: refuse until the ban expires or is lifted.
    const ban = store.findActiveBan(clientId, ip);
    if (ban) {
      socket.emit('banned', { until: ban.expiresAt, reason: ban.reason });
      socket.disconnect(true);
      return;
    }
    const premium = isPremium(clientId);
    // Free-tier caps enforced server-side: gender preference and country lists
    // beyond the free limit are premium-only.
    const countryCap = premium ? 50 : FREE_LIMITS.countries;
    const sanitizeCountryList = (list) => (Array.isArray(list) ? list.filter((c) => typeof c === 'string').slice(0, countryCap) : []);
    const wasOffline = !clientSockets.has(clientId);
    profiles.set(socket.id, {
      clientId,
      username: (typeof data.nickname === 'string' && data.nickname.trim())
        ? data.nickname.trim().slice(0, 24)
        : generateUsername(),
      country: geo.country,
      countryName: geo.countryName,
      city: geo.city,
      gender: data.gender || 'unspecified',
      prefGender: premium ? (data.prefGender || 'any') : 'any',
      includeCountries: sanitizeCountryList(data.includeCountries),
      excludeCountries: sanitizeCountryList(data.excludeCountries),
      randomFallbackActive: false,
      mode: 'talk',
      interests: Array.isArray(data.interests)
        ? data.interests.filter((i) => typeof i === 'string').map((i) => i.slice(0, 40)).slice(0, 10)
        : [],
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

    socket.emit('premium-status', { premium, limits: FREE_LIMITS });
    syncClientState(socket, clientId);

    // "James from UK is online": tell each online friend this user just came
    // online (only on a genuine offline→online transition, and never when the
    // user hides their status). Also re-sync their friend lists so the green
    // dot flips live.
    if (wasOffline && !statusHidden.get(clientId)) {
      const me = profiles.get(socket.id);
      for (const [fid] of friends.get(clientId) || new Map()) {
        const friendSocket = getSocketByClientId(fid);
        if (!friendSocket) continue;
        friendSocket.emit('friend-online', {
          clientId,
          username: me.username,
          countryCode: me.country,
          country: me.countryName,
        });
        syncClientState(friendSocket, fid);
      }
    }
  });

  // Give the just-connected client its initial count right away, then tell
  // everyone (including it) the new total.
  sendOnlineCountTo(socket);
  broadcastOnlineCount();

  socket.on('find-partner', (opts = {}) => {
    const profile = profiles.get(socket.id);
    if (!profile) return;
    // Banned users can never connect to anyone until the ban is lifted.
    const ban = store.findActiveBan(profile.clientId, ip);
    if (ban) {
      socket.emit('banned', { until: ban.expiresAt, reason: ban.reason });
      socket.disconnect(true);
      return;
    }
    // Which pool this search joins: 'talk' (voice call) or 'chat' (text only).
    // Sticky on the profile so skip/auto-next re-searches stay in the same pool.
    profile.mode = (opts && opts.mode === 'chat') ? 'chat' : 'talk';
    store.recordFeature(profile.mode === 'chat' ? 'chat_search' : 'search');
    // A fresh, explicit search starts with the full set of filters again.
    profile.randomFallbackActive = false;
    clearMatchDelayTimer(socket.id);
    tryMatch(socket.id);
  });

  socket.on('skip', () => {
    disconnectPartner(socket.id);
    const profile = profiles.get(socket.id);
    if (profile) profile.randomFallbackActive = false;
    // Premium skips straight to the next stranger; the free tier waits ~5s
    // before the next search begins.
    clearMatchDelayTimer(socket.id);
    if (profile && !isPremium(profile.clientId)) {
      socket.emit('match-delay', { seconds: Math.round(FREE_LIMITS.matchDelayMs / 1000) });
      const timer = setTimeout(() => {
        matchDelayTimers.delete(socket.id);
        if (io.sockets.sockets.get(socket.id)) tryMatch(socket.id);
      }, FREE_LIMITS.matchDelayMs);
      matchDelayTimers.set(socket.id, timer);
      return;
    }
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
    clearMatchDelayTimer(socket.id);
  });

  socket.on('report', (payload = {}) => {
    const partnerId = partners.get(socket.id);
    const seeker = profiles.get(socket.id);
    const partner = partnerId ? profiles.get(partnerId) : null;
    const reason = typeof payload.reason === 'string' ? payload.reason.slice(0, 40) : 'unspecified';
    const detail = typeof payload.detail === 'string' ? payload.detail.slice(0, 300) : '';
    if (seeker && partner) {
      blockPair(seeker.clientId, partner.clientId);
      const partnerSocket = io.sockets.sockets.get(partnerId);
      const reportedIp = partnerSocket ? getClientIp(partnerSocket) : null;
      store.recordFeature('report');
      store.addReport({
        reporter: { clientId: seeker.clientId, username: seeker.username, country: seeker.countryName, city: seeker.city },
        reported: { clientId: partner.clientId, username: partner.username, country: partner.countryName, city: partner.city, ip: reportedIp },
        reason,
        detail,
      });
      const totalReports = store.reportCountFor(partner.clientId);
      console.log(`[report] ${seeker.username} reported ${partner.username} — reason: ${reason}${detail ? ` — "${detail}"` : ''} (total reports: ${totalReports})`);
      admin.sendAlertEmail('report', `New user report against ${partner.username}`,
        `${seeker.username} (${seeker.countryName}) reported ${partner.username} (${partner.countryName}, ${partner.city}).\nReason: ${reason}${detail ? `\nDetail: ${detail}` : ''}\nTotal reports on this user: ${totalReports}\n\nReview at https://${CANONICAL_HOST}/owner`);
      // Auto-ban after the configured threshold — a real persisted ban (default
      // 30 minutes) so they can't reconnect by refreshing. The owner can extend
      // or lift it from the dashboard.
      if (totalReports >= (store.data.settings.banThreshold || 3)
        && !store.findActiveBan(partner.clientId, reportedIp)) {
        const ban = store.addBan({
          clientId: partner.clientId,
          ip: reportedIp,
          username: partner.username,
          country: partner.countryName,
          city: partner.city,
          reason: `Auto-ban after ${totalReports} reports`,
          minutes: store.data.settings.autoBanMinutes || 30,
        });
        console.log(`[ban] ${partner.username} auto-banned after ${totalReports} reports`);
        if (partnerSocket) {
          partnerSocket.emit('banned', { until: ban.expiresAt, reason: ban.reason });
          partnerSocket.disconnect(true);
        }
      }
    }
    disconnectPartner(socket.id);
    tryMatch(socket.id);
  });

  // User-submitted product feedback. Logged for the operator; kept lightweight
  // (no storage layer yet) but rate-limited implicitly by being a manual action.
  socket.on('feedback', (payload = {}) => {
    const text = typeof payload.text === 'string' ? payload.text.trim().slice(0, 1000) : '';
    if (!text) return;
    const p = profiles.get(socket.id);
    const who = p ? `${p.username} (${p.country})` : socket.id;
    console.log(`[feedback] from ${who}: ${text}`);
    store.recordFeature('feedback');
    store.addFeedback({ username: p ? p.username : 'Unknown', country: p ? p.countryName : '', city: p ? p.city : '', text });
    admin.sendAlertEmail('feedback', 'New user feedback',
      `From: ${who}\n\n${text}\n\nReview at https://${CANONICAL_HOST}/owner`);
  });

  // Client-side JS errors reported by the browser for the Errors dashboard tab.
  socket.on('client-error', (payload = {}) => {
    const message = typeof payload.message === 'string' ? payload.message.slice(0, 400) : '';
    if (!message) return;
    const p = profiles.get(socket.id);
    const rec = store.addError({
      source: 'client',
      message,
      stack: typeof payload.stack === 'string' ? payload.stack.slice(0, 1500) : '',
      url: typeof payload.url === 'string' ? payload.url.slice(0, 200) : '',
      username: p ? p.username : 'Unknown',
      country: p ? p.countryName : '',
    });
    if (rec.count >= 10) {
      admin.sendAlertEmail('error', 'Recurring client error on TalkLive',
        `"${message}" has now occurred ${rec.count} times.\nURL: ${rec.url}\n\nReview at https://${CANONICAL_HOST}/owner`);
    }
  });

  socket.on('reaction', (reaction) => {
    const partnerId = partners.get(socket.id);
    const seeker = profiles.get(socket.id);
    const partner = partnerId ? profiles.get(partnerId) : null;
    if (!partnerId || !seeker || !partner || typeof reaction !== 'string') return;
    store.recordFeature(reaction === 'heart' ? 'heart_reaction' : 'reaction');
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

  // Client-side call moderation (moderation.js): keyword / sentiment /
  // shouting triggers detected from the local mic's live transcript. Log the
  // incident to the dashboard transcript store and email the owner (throttled
  // per-kind inside sendAlertEmail). Rate-limited per socket so a hostile
  // client can't spam alerts.
  let lastModerationAlert = 0;
  socket.on('moderation-alert', ({ type, detail, transcript } = {}) => {
    const now = Date.now();
    if (now - lastModerationAlert < 30000) return;
    if (!['keyword', 'sentiment', 'shouting'].includes(type)) return;
    lastModerationAlert = now;
    const me = profiles.get(socket.id);
    const partnerId = partners.get(socket.id);
    const them = partnerId ? profiles.get(partnerId) : null;
    const who = me ? `${me.username} (${me.countryName || '?'})` : socket.id;
    const detailStr = String(detail || '').slice(0, 200);
    const transcriptStr = String(transcript || '').slice(0, 500);
    if (me) {
      store.addTranscript({
        kind: 'moderation',
        pair: them ? pairKey(me.clientId, them.clientId) : me.clientId,
        from: me.username,
        fromClientId: me.clientId,
        to: them ? them.username : '',
        toClientId: them ? them.clientId : '',
        country: me.countryName,
        text: `[${type}] ${detailStr}${transcriptStr ? ` — "${transcriptStr}"` : ''}`,
      });
    }
    admin.sendAlertEmail(`moderation-${type}`, `Moderation alert: ${type} from ${who}`,
      `Type: ${type}\nUser: ${who}\nPartner: ${them ? them.username : 'none'}\nDetail: ${detailStr}\nTranscript: ${transcriptStr || '(n/a)'}\n\nReview at https://${CANONICAL_HOST}/owner`);
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
      const clean = text.trim().slice(0, 1000);
      store.recordFeature('chat_message');
      store.recordTopics(clean);
      const me = profiles.get(socket.id);
      const them = profiles.get(partnerId);
      if (me && them) {
        store.addTranscript({
          kind: 'stranger',
          pair: pairKey(me.clientId, them.clientId),
          from: me.username,
          fromClientId: me.clientId,
          to: them.username,
          toClientId: them.clientId,
          country: me.countryName,
          text: clean,
        });
      }
      io.to(partnerId).emit('chat-message', { text: clean });
    }
  });

  socket.on('typing', () => {
    const partnerId = partners.get(socket.id);
    if (partnerId) {
      io.to(partnerId).emit('typing');
    }
  });

  // Mini-game (Tic Tac Toe) relay — forwards game events to the current partner only.
  socket.on('game', (data) => {
    const partnerId = partners.get(socket.id);
    if (partnerId && data && typeof data === 'object') {
      if (data.type === 'invite') store.recordFeature('mini_game');
      io.to(partnerId).emit('game', data);
    }
  });

  // --- Friends ---
  socket.on('friend-request', ({ targetClientId } = {}) => {
    const me = profiles.get(socket.id);
    targetClientId = validId(targetClientId);
    if (!me || !targetClientId || targetClientId === me.clientId) return;
    store.recordFeature('friend_request');
    if (isBlockedPair(me.clientId, targetClientId)) {
      return socket.emit('friend-request-result', { ok: false, error: 'Unable to send friend request.' });
    }
    if (isFriend(me.clientId, targetClientId)) {
      return socket.emit('friend-request-result', { ok: true, alreadyFriends: true });
    }
    if (atFriendLimit(me.clientId)) {
      return socket.emit('friend-request-result', { ok: false, limitReached: true, error: `Free plan allows up to ${FREE_LIMITS.friends} friends. Upgrade to add unlimited friends.` });
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
    fromClientId = validId(fromClientId);
    if (!me || !fromClientId) return;
    const reqMap = friendRequests.get(me.clientId);
    const req = reqMap && reqMap.get(fromClientId);
    if (!req) return;
    reqMap.delete(fromClientId);
    if (notificationId) removeNotification(me.clientId, notificationId);

    if (accept && atFriendLimit(me.clientId)) {
      syncClientState(socket, me.clientId);
      return socket.emit('friend-request-result', { ok: false, limitReached: true, error: `Free plan allows up to ${FREE_LIMITS.friends} friends. Upgrade to add unlimited friends.` });
    }
    // The requester may have filled up their own list since sending the request.
    if (accept && atFriendLimit(fromClientId)) {
      syncClientState(socket, me.clientId);
      return socket.emit('friend-request-result', { ok: false, error: 'Their friend list is full.' });
    }
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
    friendClientId = validId(friendClientId);
    if (!me || !friendClientId) return;
    removeFriendPair(me.clientId, friendClientId);
    syncClientState(socket, me.clientId);
    const friendSocket = getSocketByClientId(friendClientId);
    if (friendSocket) syncClientState(friendSocket, friendClientId);
  });

  socket.on('block-friend', ({ friendClientId } = {}) => {
    const me = profiles.get(socket.id);
    friendClientId = validId(friendClientId);
    if (!me || !friendClientId) return;
    removeFriendPair(me.clientId, friendClientId);
    blockPair(me.clientId, friendClientId);
    syncClientState(socket, me.clientId);
  });

  // --- Friend-to-friend chat (separate from the ephemeral in-call chat) ---
  socket.on('friend-message', ({ toClientId, text } = {}) => {
    const me = profiles.get(socket.id);
    toClientId = validId(toClientId);
    if (!me || !toClientId || typeof text !== 'string' || !text.trim()) return;
    if (!isFriend(me.clientId, toClientId)) return;
    // Text messaging is call-gated: you can only send a message to someone while
    // you're in a live (accepted) call with them. Outside a call the only way to
    // reach a friend is to call them (or queue a call-back request for later).
    const targetSocketId = clientSockets.get(toClientId);
    if (!targetSocketId || partners.get(socket.id) !== targetSocketId) {
      return socket.emit('chat-blocked', { reason: 'call-required' });
    }
    if (containsLink(text)) {
      return socket.emit('chat-blocked', { reason: 'link' });
    }
    const trimmed = text.trim().slice(0, 1000);
    const friendInfo = (friends.get(me.clientId) || new Map()).get(toClientId);
    store.addTranscript({
      kind: 'friend',
      pair: pairKey(me.clientId, toClientId),
      from: me.username,
      fromClientId: me.clientId,
      to: friendInfo ? friendInfo.username : toClientId,
      toClientId,
      country: me.countryName,
      text: trimmed,
    });
    const key = pairKey(me.clientId, toClientId);
    if (!friendChats.has(key)) friendChats.set(key, []);
    const msg = { from: me.clientId, text: trimmed, ts: Date.now() };
    const list = friendChats.get(key);
    list.push(msg);
    if (list.length > 200) list.shift();
    persistSocial();

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
    friendClientId = validId(friendClientId);
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

  // Read receipts: when I (the viewer) open a chat, mark every message the
  // friend sent me as seen and persist it, so the sender still sees "Seen"
  // after reopening the chat or reconnecting — not just while both are live.
  socket.on('chat-seen', ({ friendClientId } = {}) => {
    const me = profiles.get(socket.id);
    friendClientId = validId(friendClientId);
    if (!me || !friendClientId || !isFriend(me.clientId, friendClientId)) return;
    const key = pairKey(me.clientId, friendClientId);
    const list = friendChats.get(key);
    let changed = false;
    if (list) {
      for (const m of list) {
        if (m.from === friendClientId && !m.seen) { m.seen = true; changed = true; }
      }
      if (changed) persistSocial();
    }
    const targetSocket = getSocketByClientId(friendClientId);
    if (targetSocket) targetSocket.emit('chat-seen', { byClientId: me.clientId, ts: Date.now() });
  });

  socket.on('clear-notification', ({ notificationId } = {}) => {
    const me = profiles.get(socket.id);
    if (!me || !notificationId) return;
    removeNotification(me.clientId, notificationId);
  });

  // --- Call back: re-connect directly with someone from call history ---
  socket.on('call-back-request', ({ targetClientId } = {}) => {
    const me = profiles.get(socket.id);
    targetClientId = validId(targetClientId);
    if (!me || !targetClientId) return;
    store.recordFeature('call_back');
    if (isBlockedPair(me.clientId, targetClientId)) {
      return socket.emit('call-back-request-result', { ok: false, reason: 'blocked' });
    }
    const targetSocketId = clientSockets.get(targetClientId);
    const targetSocket = targetSocketId ? io.sockets.sockets.get(targetSocketId) : null;
    if (!targetSocket) {
      // The peer is offline: don't yank the caller off their screen. Let the
      // client keep its calling-back panel and offer to queue the request for
      // later (delivered as a notification when the peer comes back online).
      return socket.emit('call-back-request-result', { ok: false, reason: 'offline', canQueue: true });
    }
    // Deliver even if the target is currently on a call: they get the banner and
    // can choose to switch (which ends their current call). No 'busy' rejection.

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

  // Queue a call-back request for an offline peer ("send request for later").
  // Stored as a notification and delivered when they next come online; if they
  // happen to be online right now it's delivered live too.
  socket.on('call-back-request-later', ({ targetClientId } = {}) => {
    const me = profiles.get(socket.id);
    targetClientId = validId(targetClientId);
    if (!me || !targetClientId) return;
    if (isBlockedPair(me.clientId, targetClientId)) {
      return socket.emit('call-back-later-result', { ok: false, reason: 'blocked', targetClientId });
    }
    pushNotification(targetClientId, {
      type: 'call_back_request',
      fromClientId: me.clientId,
      username: me.username,
      countryCode: me.country,
    });
    const targetSocket = getSocketByClientId(targetClientId);
    if (targetSocket) {
      targetSocket.emit('call-back-request', {
        fromClientId: me.clientId,
        username: me.username,
        countryCode: me.country,
      });
    }
    socket.emit('call-back-later-result', { ok: true, targetClientId });
  });

  socket.on('call-back-respond', ({ fromClientId, accept } = {}) => {
    const me = profiles.get(socket.id);
    fromClientId = validId(fromClientId);
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

    // Call-backs are always voice calls, whatever pool either side was in.
    me.mode = 'talk';
    requesterProfile.mode = 'talk';
    requesterSocket.emit('matched', { initiator: true, partner: publicProfile(me), rematched: false, callback: true, mode: 'talk' });
    socket.emit('matched', { initiator: false, partner: publicProfile(requesterProfile), rematched: false, callback: true, mode: 'talk' });
  });

  socket.on('disconnect', () => {
    disconnectPartner(socket.id);
    clearFromQueue(socket.id);
    clearWaitFallbackTimer(socket.id);
    clearMatchDelayTimer(socket.id);
    const profile = profiles.get(socket.id);
    if (profile && clientSockets.get(profile.clientId) === socket.id) {
      clientSockets.delete(profile.clientId);
      // Flip this user's green dot off in their friends' lists right away.
      for (const [fid] of friends.get(profile.clientId) || new Map()) {
        const friendSocket = getSocketByClientId(fid);
        if (friendSocket) syncClientState(friendSocket, fid);
      }
    }
    profiles.delete(socket.id);
    socketAuth.delete(socket.id);
    broadcastOnlineCount();
  });
});

// Capture server-side crashes/rejections for the Errors dashboard tab. The
// uncaughtException handler logs + persists, then exits so the process manager
// restarts us in a clean state.
process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection]', err);
  store.addError({ source: 'server', message: String((err && err.message) || err).slice(0, 400), stack: String((err && err.stack) || '').slice(0, 1500), url: '', username: '', country: '' });
  admin.sendAlertEmail('server-error', 'Server error on TalkLive', `Unhandled rejection: ${String((err && err.message) || err)}\n\nReview at https://${CANONICAL_HOST}/owner`);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
  store.addError({ source: 'server', message: String(err.message || err).slice(0, 400), stack: String(err.stack || '').slice(0, 1500), url: '', username: '', country: '' });
  admin.sendAlertEmail('server-error', 'CRITICAL: server crash on TalkLive', `Uncaught exception: ${String(err.message || err)}\n${String(err.stack || '')}\n\nThe server is restarting. Review at https://${CANONICAL_HOST}/owner`);
  store.persistNow();
  process.exit(1);
});

// Wait for the store (Postgres or file) to load before accepting traffic so
// bans, maintenance mode and admin credentials apply from the first request.
store.ready.then(() => {
  // Restore durable accounts + social graph before accepting traffic so
  // returning users can log in and see their friends/chats immediately.
  hydrateFromStore();
  console.log(`[accounts] restored ${accounts.size} account(s) from the store`);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`TalkLive server running on port ${PORT}`);
  });
});
