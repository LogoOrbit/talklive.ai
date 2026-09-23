const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const geoip = require('geoip-lite');
const { OAuth2Client } = require('google-auth-library');
const { generateUsername } = require('./usernames');
// Shared with the browser: public/countries.js exports for Node and defines a
// global when loaded as a plain <script>, so there is one country list, not two.
const { COUNTRIES } = require('../public/countries.js');
const store = require('./store');
const compress = require('./compress');
const billing = require('./billing');
const push = require('./push');
const flags = require('./flags');
const ageAssurance = require('./age-assurance');
const mail = require('./mailer');
const { botLabel, isPrefetch } = require('./bots');
const { createAdmin } = require('./admin');

const app = express();
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
// Client IDs are browser-visible, so they are not an identity proof.  Bind
// them to an HMAC token issued by the server; without this an attacker can
// copy a peer's clientId and hijack social routing/premium state.
// Set from the durable store at boot (see store.ready below) unless the
// environment pins one. It must not change between restarts: the token is an
// HMAC of the clientId, so a fresh secret invalidates every browser's token at
// once, and a browser whose token is refused rotates to a brand-new clientId -
// losing its friends, friend chats and premium in the process. That is why a
// per-process random key made friends "disappear" and show as permanently
// offline after every deploy.
let IDENTITY_SECRET = process.env.IDENTITY_SECRET || crypto.randomBytes(32).toString('hex');
const identityTokens = new Map(); // clientId -> signed token for this process
const identityTokenSeen = new Map(); // clientId -> last registration, for the sweeper below
function signIdentity(clientId) {
  return crypto.createHmac('sha256', IDENTITY_SECRET).update(clientId).digest('hex');
}
function validIdentityToken(clientId, token) {
  return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token)
    && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(signIdentity(clientId)));
}
const server = http.createServer(app);
// Socket.IO configured to prefer a real WebSocket and allow polling only as a
// bootstrap/fallback. The "breaks past ~6-7 concurrent clients" symptom comes
// from connections being stuck on HTTP long-polling: long-polling holds HTTP
// requests open, and proxies/browsers cap concurrent HTTP/1.1 connections per
// host, so the Nth late joiner can never complete its handshake (its socket
// never connects, so it never receives online-count and tap-to-talk is dead).
// WebSockets are not subject to that per-host HTTP connection pool, so allowing
// (and quickly upgrading to) WebSocket removes the ceiling entirely - no
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

// Behind Fly's edge proxy, so trust X-Forwarded-* to detect the real
// protocol and host for canonical redirects below.
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Security headers on every response. The CSP allowlists exactly the external
// origins the app legitimately uses (Google Sign-In, flag images) and blocks
// everything else, so an injected <script src> or exfil
// request to an attacker's host is refused by the browser. frame-ancestors and
// X-Frame-Options stop the site being embedded for clickjacking; nosniff stops
// MIME-confusion attacks. 'unsafe-inline' is required by the existing inline
// scripts/handlers and styles. Adsterra's banner runtime also uses evaluated
// JavaScript, so 'unsafe-eval' is limited to this host-restricted script list.
// The CSP remains defense-in-depth on top of the output-escaping fixes rather
// than the sole XSS barrier.
/*
 * Extra script origins for the backfill ad network, space-separated, e.g.
 *   fly secrets set ADS_SCRIPT_HOSTS='https://fpyf8.com https://*.monetag.com'
 *
 * A network's tag is dropped silently by the browser when its origin is not in
 * script-src, and an unsold slot and a blocked one look identical from the
 * page, so this is the first thing to check when a newly configured backfill
 * earns nothing. It lives in an environment variable because the zone IDs that
 * go with it already do (ADS_CONFIG), so a network can be added or swapped
 * without a deploy. Entries are restricted to https origins - anything else is
 * dropped rather than widening the policy by accident.
 */
const ADS_SCRIPT_HOSTS = String(process.env.ADS_SCRIPT_HOSTS || '')
  .split(/\s+/)
  .filter((h) => /^https:\/\/[A-Za-z0-9*.:-]+$/.test(h));
if (process.env.ADS_SCRIPT_HOSTS && !ADS_SCRIPT_HOSTS.length) {
  console.warn('[ads-config] ADS_SCRIPT_HOSTS set but no valid https origin found; ignoring');
}

const CSP = [
  "default-src 'self'",
  // Adsterra and analytics origins must be allowlisted
  // explicitly or the browser silently drops the ad scripts and the slots stay
  // empty. Ad creatives render inside cross-origin iframes, and their tracking
  // pixels/beacons go to arbitrary ad-exchange hosts, so frame-src/img-src/
  // connect-src need broad https: - script execution on the page itself is
  // still restricted to the named script-src hosts.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com"
    + ' https://delvefencescrewdriver.com https://www.highperformanceformat.com'
    + ' https://*.effectivecpmnetwork.com https://www.googletagmanager.com'
    + ' https://*.gstatic.com'
    + ' https://www.google.com'
    // Google AdSense loader plus the ad/fraud-check scripts it pulls in.
    + ' https://pagead2.googlesyndication.com https://*.googlesyndication.com'
    + ' https://*.doubleclick.net https://*.adtrafficquality.google'
    + ' https://*.googleadservices.com'
    // Google's consent (CMP) message for EEA/UK/CH visitors.
    + ' https://fundingchoicesmessages.google.com'
    + (ADS_SCRIPT_HOSTS.length ? ' ' + ADS_SCRIPT_HOSTS.join(' ') : ''),
  // Google Identity Services injects its own stylesheet from accounts.google.com
  // to render the Sign-In button; without it listed the browser blocks the
  // sheet and the button renders unstyled.
  "style-src 'self' 'unsafe-inline' https://accounts.google.com",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' ws: wss: https:",
  // 'self' covers the srcless about:blank iframes ads.js sandboxes each
  // Adsterra banner tag in; https: covers the creative frames they load.
  "frame-src 'self' https:",
  "media-src 'self' blob:",
  // Both would fall back to default-src 'self' anyway, but stated explicitly so
  // that widening default-src later cannot silently widen where the service
  // worker or the manifest may come from.
  "worker-src 'self'",
  "manifest-src 'self'",
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

// Brotli/gzip every text response. Fly's edge proxy forwards bodies untouched
// and Express compresses nothing on its own, so without this the homepage costs
// a cold visitor ~430 kB of raw transfer (112 kB index.html + 127 kB style.css
// + 192 kB app.js) - by far the largest Core Web Vitals cost on the site, and
// pure waste, since those files compress to roughly a fifth of that. Mounted
// after the security headers (so they are set regardless) but ahead of every
// route and the static middleware, because it works by wrapping res.write /
// res.end and can only capture handlers that run after it.
//
// Socket.IO is unaffected: engine.io handles /socket.io/ at the HTTP server
// level, before Express ever sees the request.
app.use(compress());

// Tiny health check for uptime pingers (cron-job.org / UptimeRobot). Returns a
// few bytes instead of the full homepage, so the pinger doesn't abort with
// "output too large", yet the request still hits the server every few minutes -
// which is what keeps the Supabase database from sleeping. The Fly machine
// itself no longer sleeps (auto_stop_machines is off in fly.toml), so this
// only matters for the database now.
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
// Other domains we own (talklive.xyz, talklive.site) that must funnel into the
// canonical origin. Serving the site on them would be duplicate content
// competing with talklive.app, so they are redirected rather than rendered.
// Platform hostnames (*.fly.dev) deliberately do NOT belong here: Fly's health
// check needs a 200 from /healthz, and a 301 would fail it.
const ALIAS_HOSTS = new Set(
  (process.env.ALIAS_HOSTS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
);

// Consolidate link equity on a single canonical origin: force HTTPS and the
// bare apex domain (drop www) so search engines index exactly one URL per page.
app.use((req, res, next) => {
  if (!ENFORCE_CANONICAL) return next();
  const host = (req.headers.host || '').toLowerCase();
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const wantsWww = host.startsWith('www.');
  const rootHost = wantsWww ? host.slice(4) : host;
  const isCanonicalHost = host === CANONICAL_HOST;
  // Only redirect for our own domains; leave preview/other hosts untouched.
  // An alias domain redirects with or without www, preserving path and query,
  // so a visitor typing talklive.xyz/pricing lands on talklive.app/pricing and
  // every link to an alias credits the canonical origin.
  if (ALIAS_HOSTS.has(rootHost)
    || (wantsWww && rootHost === CANONICAL_HOST)
    || (isCanonicalHost && proto !== 'https')) {
    return res.redirect(301, 'https://' + CANONICAL_HOST + req.originalUrl);
  }
  // Platform hostnames (talklive.fly.dev, *.onrender.com) serve the same pages
  // as the canonical domain, so they are duplicate content if crawled. Keep
  // them reachable for previews and health checks, but keep them out of the
  // index.
  if (!isCanonicalHost && !(wantsWww && host.slice(4) === CANONICAL_HOST)) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }
  next();
});

// Keep one crawlable URL for every static HTML page. Express's `extensions`
// option serves both `/guide` and `/guide.html`, while directory indexes also
// make `/blog/index.html` and `/blog/` equivalent. Redirect only paths that map
// to a real public HTML file, preserve the query string, and reject protocol-
// relative/backslash paths so user input can never turn this into an open
// redirect. Real index directories such as /blog/ and /es/ keep their slash.
function publicFileExists(urlPath) {
  if (typeof urlPath !== 'string' || !urlPath.startsWith('/')
    || urlPath.startsWith('//') || urlPath.includes('\\') || urlPath.includes('\0')) {
    return false;
  }
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch (_) {
    return false;
  }
  if (!decoded.startsWith('/') || decoded.startsWith('//')
    || decoded.includes('\\') || decoded.includes('\0') || decoded.split('/').includes('..')) {
    return false;
  }
  const filePath = path.resolve(PUBLIC_DIR, '.' + decoded);
  const relative = path.relative(PUBLIC_DIR, filePath);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return false;
  try {
    return fs.statSync(filePath).isFile();
  } catch (_) {
    return false;
  }
}

function originalQuery(req) {
  const i = req.originalUrl.indexOf('?');
  return i === -1 ? '' : req.originalUrl.slice(i);
}

app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const pathname = req.path;
  if (!pathname.startsWith('/') || pathname.startsWith('//') || pathname.includes('\\')) return next();

  const host = (req.headers.host || '').toLowerCase();
  if (host === CANONICAL_HOST
    && (pathname === '/landing' || pathname === '/landing/' || pathname === '/landing.html')) {
    return res.redirect(301, '/' + originalQuery(req));
  }

  if (/\/index\.html$/i.test(pathname) && publicFileExists(pathname)) {
    return res.redirect(301, pathname.slice(0, -'index.html'.length) + originalQuery(req));
  }

  if (/\.html$/i.test(pathname) && publicFileExists(pathname)) {
    return res.redirect(301, pathname.slice(0, -'.html'.length) + originalQuery(req));
  }

  if (pathname.length > 1 && pathname.endsWith('/')) {
    const cleanPath = pathname.slice(0, -1);
    // Strip the slash only when nothing else claims the directory form. If BOTH
    // `foo.html` and `foo/index.html` exist, this rule sends /foo/ -> /foo while
    // express.static sends /foo -> /foo/ (a real directory is there), and the
    // two redirects chase each other forever: /countries and /languages were
    // both wholly unreachable, browsers reporting ERR_TOO_MANY_REDIRECTS and
    // crawlers dropping them along with the country and language pages they
    // link to. The directory index is the canonical form when both exist, so
    // leave the slashed URL alone rather than start a loop.
    if (publicFileExists(cleanPath + '.html') && !publicFileExists(pathname + 'index.html')) {
      return res.redirect(301, cleanPath + originalQuery(req));
    }
  }

  next();
});
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// --- Premium (TalkLive Plus) -------------------------------------------------
// Free-tier limits; premium removes all of them.
const FREE_LIMITS = {
  countries: 2, // max countries per preferred/not-preferred list
  friends: 5, // max friends
};
// Premium registry lives in the persistent store (Postgres/file) so grants
// survive restarts and deploys. Grants come from three places now: a Stripe
// subscription (server/billing.js), a referral reward, or a manual grant
// (PREMIUM_CLIENT_IDS / store.setPremium) for testing and support.
const envPremiumClients = new Set(
  (process.env.PREMIUM_CLIENT_IDS || '').split(',').map((s) => s.trim()).filter(Boolean)
);
function isPremium(clientId) {
  return envPremiumClients.has(clientId) || store.isPremiumClient(clientId);
}

// Lets the pricing page (a separate static page) confirm activation.
app.get('/premium-status', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const clientId = String(req.query.clientId || '');
  res.json({
    premium: isPremium(clientId),
    // null when the grant is permanent (manual/env) - the client renders
    // "Plus is active" rather than a renewal date.
    expiresAt: envPremiumClients.has(clientId) ? null : store.premiumExpiry(clientId),
    // The pricing page swaps its "coming soon" card for real buttons based on
    // this, so a deployment with no Stripe keys keeps the honest copy it has
    // today instead of showing a button that cannot charge anyone.
    checkout: billing.configured(),
    plans: billing.plans(),
  });
});

// --- Billing -----------------------------------------------------------------

// Fly terminates TLS at its edge and forwards the real client address in
// X-Forwarded-For, so req.socket.remoteAddress is the proxy on every production
// request. The first entry is the closest thing to the origin address we have.
function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  return ((fwd ? String(fwd).split(',')[0].trim() : req.socket.remoteAddress) || '').replace('::ffff:', '');
}

// A crude fixed-window limiter for the handful of unauthenticated POST routes
// added below. Socket.IO traffic has its own per-socket token bucket (see the
// connection handler); these are plain HTTP and had nothing.
const httpHits = new Map(); // `${route}:${ip}` -> { count, resetAt }
function httpRateLimit(route, max, windowMs) {
  return (req, res, next) => {
    const key = `${route}:${clientIp(req)}`;
    const now = Date.now();
    const rec = httpHits.get(key);
    if (!rec || rec.resetAt <= now) {
      httpHits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (rec.count >= max) return res.status(429).json({ error: 'Too many requests.' });
    rec.count += 1;
    next();
  };
}
// Unbounded growth would be a slow leak on a long-lived process; expired
// windows are dead weight, so sweep them rather than keeping a key per IP
// forever.
setInterval(() => {
  const now = Date.now();
  for (const [key, rec] of httpHits) if (rec.resetAt <= now) httpHits.delete(key);
}, 10 * 60000).unref();

billing.warnIfHalfConfigured();

app.post('/billing/checkout', httpRateLimit('checkout', 10, 60000), express.json({ limit: '2kb' }), async (req, res) => {
  if (!billing.configured()) return res.status(503).json({ error: 'Checkout is not available yet.' });
  const clientId = String((req.body && req.body.clientId) || '');
  const token = String((req.body && req.body.identityToken) || '');
  // The clientId decides who gets premium, so an unproven one would let anyone
  // buy a subscription onto someone else's browser id - or, more usefully to an
  // attacker, discover which ids exist. Same HMAC the socket layer uses.
  if (!clientId || !validIdentityToken(clientId, token)) {
    return res.status(403).json({ error: 'Unrecognised client.' });
  }
  // Age-assurance gate (fix list 3.1). A no-op while the flag is off.
  const ageGate = ageAssurance.check('premium', { clientId, country: lookupGeo(clientIp(req)).country });
  if (!ageGate.ok) return res.status(403).json({ error: ageGate.message, ageCheck: ageGate.reason });
  try {
    const url = await billing.createCheckout({
      clientId,
      plan: String((req.body && req.body.plan) || 'monthly'),
      origin: `https://${CANONICAL_HOST}`,
    });
    store.recordFeature('premium_checkout_start');
    res.json({ url });
  } catch (err) {
    console.error('[billing] checkout failed:', err.message);
    res.status(err.status === 400 ? 400 : 502).json({ error: 'Could not start checkout.' });
  }
});

// Stripe signs the exact bytes it sent, so this route must see the raw body -
// hence express.raw here rather than the express.json used everywhere else.
app.post('/billing/webhook', express.raw({ type: 'application/json', limit: '1mb' }), (req, res) => {
  const event = billing.verifyWebhook(req.body && req.body.toString('utf8'), req.headers['stripe-signature']);
  // A bad signature is either a misconfigured secret or a forgery. Either way
  // Stripe should retry rather than believe it was accepted.
  if (!event) return res.status(400).send('invalid signature');

  const decision = billing.decide(event);
  if (decision.action === 'grant') {
    store.setPremium(decision.clientId, {
      // No period end on the checkout event itself; a day covers the gap until
      // the first invoice arrives (usually seconds later) so a paying customer
      // is never left without what they just bought.
      expiresAt: decision.until || Date.now() + 24 * 60 * 60000,
      lastEvent: decision.reason,
      subscriptionId: decision.subscriptionId || undefined,
      source: 'stripe',
    });
    store.recordFeature('premium_activated');
  } else if (decision.action === 'revoke') {
    store.revokePremium(decision.clientId, { lastEvent: decision.reason });
    store.recordFeature('premium_cancelled');
  }
  // Anything unhandled is still a 200: replying non-2xx makes Stripe retry an
  // event we have deliberately ignored, forever.
  res.json({ received: true });
});

// --- Web push ----------------------------------------------------------------

// Handed to the service worker registration so the browser can build a
// subscription. Public half of the VAPID pair, safe to expose.
app.get('/push/key', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json({ key: push.publicKey(), enabled: push.configured() });
});

app.post('/push/subscribe', httpRateLimit('push', 20, 60000), express.json({ limit: '4kb' }), (req, res) => {
  if (!push.configured()) return res.status(503).json({ error: 'Push is not available.' });
  const { clientId, identityToken, subscription } = req.body || {};
  if (!clientId || !validIdentityToken(String(clientId), String(identityToken || ''))) {
    return res.status(403).json({ error: 'Unrecognised client.' });
  }
  if (!subscription || typeof subscription.endpoint !== 'string' || !/^https:\/\//.test(subscription.endpoint)) {
    return res.status(400).json({ error: 'Invalid subscription.' });
  }
  store.savePushSubscription(String(clientId), {
    endpoint: subscription.endpoint,
    keys: subscription.keys || {},
  }, req.headers['user-agent']);
  store.recordFeature('push_subscribed');
  res.status(204).end();
});

app.post('/push/unsubscribe', httpRateLimit('push', 20, 60000), express.json({ limit: '4kb' }), (req, res) => {
  const { clientId, identityToken, endpoint } = req.body || {};
  if (!clientId || !validIdentityToken(String(clientId), String(identityToken || ''))) {
    return res.status(403).json({ error: 'Unrecognised client.' });
  }
  store.removePushSubscription(String(clientId), String(endpoint || ''));
  res.status(204).end();
});

// Public client ID handed to the browser so it can render the Google Sign-In
// button - safe to expose, it's not a secret.
app.get('/config.js', (req, res) => {
  res.type('application/javascript');
  // Only changes when the deployment's env changes, so let browsers keep it for
  // an hour (and serve it stale for a day while revalidating) instead of
  // re-fetching it on the critical path of every single page view.
  res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  res.send(`window.GOOGLE_CLIENT_ID = ${JSON.stringify(GOOGLE_CLIENT_ID)};\nwindow.TL_FLAGS = ${JSON.stringify(flags.clientFlags())};`);
});

// Small same-origin conversion endpoint. Only a fixed vocabulary is accepted,
// so public traffic cannot create unbounded dashboard keys. These counters are
// deliberately aggregate and contain no message text or personal data.
const GROWTH_EVENTS = new Set([
  'pricing_view',
  'premium_checkout_click',
  'premium_upsell_click',
  'quality_call',
  'share_prompt',
  'share_open',
  'share_success',
  // Call reachability. media_ok vs media_failed is the ratio that says whether
  // a TURN relay is urgently needed: media_failed counts matches that
  // negotiated fine and then carried no audio, which is what happens to users
  // whose network has no direct path. See DEPLOY-TURN.md.
  'call_media_ok',
  'call_media_failed',
  'call_media_blocked_notice',
  // Voice funnel counters. These expose where users drop without recording
  // identity, country, message content or microphone data.
  'call_start_intent',
  'call_mic_denied',
  'call_partner_found',
  // Install and notification funnels. Installed users and push opt-ins are the
  // only two things that bring an anonymous visitor back without an email
  // address, so both are worth measuring separately from the ratio of the two.
  'pwa_install_click',
  'pwa_installed',
  'push_optin',
  // Someone tapped "Notify me" on Premium or the coin shop. The clearest
  // demand signal the app has for a thing that does not exist yet: it is a
  // person asking to be told when it does.
  'premium_notify_click',
  // Progressive disclosure (fix list 2.3). One exposure event per first-time
  // session, per arm, and one event per surface opened within the first two
  // minutes of it. "on" is the flag's arm, "off" is everyone else's first
  // visit, so the two can be compared on the same dashboard.
  'fv_on_session', 'fv_off_session',
  'fv_on_open_friends', 'fv_off_open_friends',
  'fv_on_open_history', 'fv_off_open_history',
  'fv_on_open_shop', 'fv_off_open_shop',
  'fv_on_open_settings', 'fv_off_open_settings',
  'fv_on_open_games', 'fv_off_open_games',
  'fv_on_open_more',
  'fv_on_friend_prompt', 'fv_on_friend_prompt_add',
]);
app.post('/events', express.json({ limit: '2kb' }), (req, res) => {
  const event = req.body && req.body.event;
  if (!GROWTH_EVENTS.has(event)) return res.status(400).json({ error: 'Unknown event.' });
  const fetchSite = String(req.headers['sec-fetch-site'] || 'same-origin');
  if (fetchSite !== 'same-origin' && fetchSite !== 'none') return res.status(403).json({ error: 'Cross-site event rejected.' });
  store.recordFeature(event);
  res.status(204).end();
});

// ICE servers handed to the browser.
//
// STUN is always published. Withholding it (to avoid revealing each peer's
// public IP) only works if a TURN relay is configured to carry the media
// instead; with neither, the browser gathers no usable candidates, the SDP
// handshake still completes, and every call connects in name only - no audio in
// either direction. Operators who need IP privacy configure TURN_URLS with
// either TURN_SHARED_SECRET (short-lived HMAC credentials, coturn's
// `use-auth-secret`) or a static TURN_USERNAME / TURN_CREDENTIAL pair, and set
// TURN_FORCE_RELAY=1 to make the browser use relay candidates exclusively.
//
// STUN reachability is not uniform across the world, and a user whose only STUN
// server is unreachable gathers no server-reflexive candidate at all - which
// looks exactly like a call that connects and then carries no audio.
//
//  - Google's STUN hosts resolve to Google infrastructure, which is blocked
//    outright in mainland China and unreliable in Iran and (increasingly)
//    Russia. Those users previously had no working STUN server whatsoever.
//  - UDP 19302 is a non-standard high port that plenty of corporate, school and
//    mobile-carrier firewalls drop while allowing 80/443.
//
// So the list spans several independent operators and deliberately includes
// endpoints on 3478, 80 and 443. Browsers query them in parallel and use
// whichever answers, so an unreachable entry costs nothing but a timeout on a
// gathering pass that is already happening. This is not a substitute for TURN
// (see DEPLOY-TURN.md) - symmetric NAT still needs a relay - but it removes a
// whole class of "nobody in my country can call" failures.
const PUBLIC_STUN_URLS = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  // Non-Google operators, for networks where Google itself is unreachable.
  'stun:stun.cloudflare.com:3478',
  'stun:stun.cloudflare.com:53',
  'stun:global.stun.twilio.com:3478',
  // Ports 80/443 punch through firewalls that only allow "web" traffic.
  'stun:stun.relay.metered.ca:80',
  'stun:stun.nextcloud.com:443',
];

function buildIceServers() {
  const servers = [
    { urls: PUBLIC_STUN_URLS.slice() },
  ];
  const envUrls = (process.env.TURN_URLS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const turnSharedSecret = process.env.TURN_SHARED_SECRET || '';
  if (envUrls.length && turnSharedSecret) {
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    const username = `${expiry}:${crypto.randomBytes(8).toString('hex')}`;
    const credential = crypto.createHmac('sha1', turnSharedSecret).update(username).digest('base64');
    servers.push({ urls: envUrls, username, credential });
  } else if (envUrls.length && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
    servers.push({
      urls: envUrls,
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL,
    });
  }
  return servers;
}

// --- Managed TURN providers --------------------------------------------------
//
// TURN_URLS above assumes the operator runs (or rents) a relay and knows its
// hostnames. That is the flexible path, not the fast one, and until a relay
// exists *somewhere* the app simply does not work for the large share of users
// behind symmetric NAT - most mobile carriers, and effectively every corporate,
// school and campus network. Those users see a call negotiate and then stay
// silent, which is the single biggest "the app is broken in my country" report.
//
// So the two managed providers with a free tier and a global anycast footprint
// are supported directly: set two secrets, get a relay everywhere, no host to
// operate. Credentials from both are short-lived and minted server-side, so
// they are never long-lived shared passwords sitting in the page.
//
//  - Cloudflare Realtime TURN: TURN_KEY_ID + TURN_KEY_API_TOKEN
//  - Metered:                  METERED_SUBDOMAIN + METERED_API_KEY
//
// Both are additive: whatever TURN_URLS provides is still published alongside,
// so a self-hosted relay and a managed one can back each other up.
const PROVIDER_TTL_SECONDS = 3600;
// Refresh before the credentials actually expire. A client that fetched at the
// last second still has to survive a whole call on them.
const PROVIDER_REFRESH_MARGIN_MS = 10 * 60 * 1000;
// /ice-servers is on the critical path of starting a call - the browser awaits
// it. A provider having a bad day must cost a moment, never the call.
const PROVIDER_TIMEOUT_MS = 4000;

let providerCache = null; // { servers, expiresAt }
let providerInFlight = null;

function normaliseIceEntries(raw) {
  // Cloudflare answers with a single object, Metered with an array. Keep only
  // entries that carry a usable urls field, and only the three keys the
  // RTCPeerConnection constructor reads - a provider echoing anything else back
  // must not end up in the page.
  const list = Array.isArray(raw) ? raw : [raw];
  const out = [];
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const urls = [].concat(entry.urls || entry.url || [])
      .map((u) => String(u).trim())
      .filter((u) => /^(stun|stuns|turn|turns):/i.test(u));
    if (!urls.length) continue;
    const username = entry.username ? String(entry.username) : '';
    const credential = entry.credential ? String(entry.credential) : '';
    // RTCPeerConnection's constructor is strict about credentials, and it throws
    // *synchronously* on a bad entry - which kills the whole call setup before a
    // single candidate is gathered and before the connect watchdog is armed, so
    // the caller sits on "Connecting…" forever. Two rules the browser enforces:
    //
    //  - a turn:/turns: URL with no username or credential  -> InvalidAccessError
    //  - a stun:/stuns: URL that carries a username/credential -> SyntaxError
    //
    // A provider whose key is wrong, whose free quota is exhausted, or that is
    // mid-incident can answer 200 with exactly the first shape (empty-string
    // credentials on real turn URLs), so this is not hypothetical: one bad entry
    // from an upstream API breaks every call for every user on the site. Split
    // the entry by scheme and drop what the browser would reject.
    const relayUrls = urls.filter((u) => /^turns?:/i.test(u));
    const stunUrls = urls.filter((u) => !/^turns?:/i.test(u));
    if (stunUrls.length) out.push({ urls: stunUrls });
    if (relayUrls.length) {
      if (username && credential) out.push({ urls: relayUrls, username, credential });
      else console.warn('[turn] dropping relay entry with no credentials:', relayUrls.join(','));
    }
  }
  return out;
}

async function fetchJson(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    const res = await fetch(url, Object.assign({ signal: controller.signal }, options));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchCloudflareTurn() {
  const keyId = process.env.TURN_KEY_ID || process.env.CLOUDFLARE_TURN_KEY_ID || '';
  const token = process.env.TURN_KEY_API_TOKEN || process.env.CLOUDFLARE_TURN_API_TOKEN || '';
  if (!keyId || !token) return [];
  const data = await fetchJson(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: PROVIDER_TTL_SECONDS }),
    },
  );
  return normaliseIceEntries(data && data.iceServers);
}

async function fetchMeteredTurn() {
  const subdomain = process.env.METERED_SUBDOMAIN || '';
  const apiKey = process.env.METERED_API_KEY || '';
  if (!subdomain || !apiKey) return [];
  const data = await fetchJson(
    `https://${encodeURIComponent(subdomain)}.metered.live/api/v1/turn/credentials?apiKey=${encodeURIComponent(apiKey)}`,
  );
  return normaliseIceEntries(data);
}

function managedTurnConfigured() {
  return Boolean(
    (process.env.TURN_KEY_ID || process.env.CLOUDFLARE_TURN_KEY_ID)
    || (process.env.METERED_SUBDOMAIN && process.env.METERED_API_KEY),
  );
}

// Credentials are per-deployment, not per-user, so one set is fetched and shared
// until it nears expiry. Without this every page load would hit the provider's
// API, which is both rate-limited and slower than the call can afford.
function getManagedTurnServers() {
  if (!managedTurnConfigured()) return Promise.resolve([]);
  const now = Date.now();
  if (providerCache && providerCache.expiresAt - PROVIDER_REFRESH_MARGIN_MS > now) {
    return Promise.resolve(providerCache.servers);
  }
  if (providerInFlight) return providerInFlight;

  providerInFlight = Promise.all([
    fetchCloudflareTurn().catch((err) => {
      console.warn('[turn] Cloudflare TURN credentials unavailable:', err.message);
      return [];
    }),
    fetchMeteredTurn().catch((err) => {
      console.warn('[turn] Metered TURN credentials unavailable:', err.message);
      return [];
    }),
  ]).then(([cloudflare, metered]) => {
    const servers = cloudflare.concat(metered);
    if (servers.length) {
      providerCache = { servers, expiresAt: Date.now() + PROVIDER_TTL_SECONDS * 1000 };
      return servers;
    }
    // Every provider failed. Stale-but-unexpired credentials still relay media,
    // and a relay that might work beats no relay at all; only once they are
    // genuinely expired is it honest to drop them.
    if (providerCache && providerCache.expiresAt > Date.now()) return providerCache.servers;
    providerCache = null;
    return [];
  }).finally(() => {
    providerInFlight = null;
  });

  return providerInFlight;
}

function hasRelay(servers) {
  return servers.some((s) => [].concat(s.urls || []).some((u) => /^turns?:/i.test(String(u))));
}

// Said at boot, not on failure, because the operator is looking at the logs
// then. A deployment with no relay works fine for the developer testing it at
// home and fails for a large share of real users - the gap this warning closes.
function warnIfNoRelay() {
  if (hasRelay(buildIceServers()) || managedTurnConfigured()) {
    getManagedTurnServers().then((servers) => {
      if (managedTurnConfigured() && !servers.length) {
        console.warn('[turn] managed TURN is configured but returned no relay - check the credentials.');
      }
    }).catch(() => { /* already logged */ });
    return;
  }
  console.warn(
    '[turn] No TURN relay configured. Calls will fail for users behind symmetric NAT '
    + '(most mobile carriers, corporate/school networks). See DEPLOY-TURN.md.',
  );
}

app.get('/ice-servers', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const iceServers = buildIceServers();
  // A provider outage must degrade to STUN + any static TURN, never to an error
  // page: the browser treats a failed fetch as "keep the bare STUN fallback".
  let managed = [];
  try {
    managed = await getManagedTurnServers();
  } catch (err) {
    console.warn('[turn] managed TURN lookup failed:', err.message);
  }
  const all = iceServers.concat(managed);
  // Relay-only is only ever safe to ask for when a relay actually exists.
  const relayOnly = process.env.TURN_FORCE_RELAY === '1' && hasRelay(all);
  res.json({ iceServers: all, iceTransportPolicy: relayOnly ? 'relay' : 'all' });
});

// sendFile bypasses the static middleware, so page shells served this way need
// the same revalidate-always policy it applies to every other HTML file.
function sendPage(res, file) {
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.sendFile(path.join(__dirname, '..', 'public', file));
}

// Screens inside the single-page shell serve `public/index.html` byte for
// byte, canonical included - so to a crawler they are duplicates of the
// homepage that resolve to it, which is the "Alternate page with proper
// canonical tag" bucket in Search Console. The canonical already tells Google
// which URL wins; `noindex` keeps it from spending a crawl on them at all.
// The header is the only way to say so, since the shell is one shared file.
function sendAppShell(res, file) {
  res.setHeader('X-Robots-Tag', 'noindex, follow');
  sendPage(res, file);
}

// The three app-screen routes (/call, /chat, /settings) used to be registered
// here. They are further down now, below maintenance mode and the visit
// counter, because being above both meant they were exempt from both: turning
// maintenance on left the whole app reachable at /chat, and no page view of
// any of them was ever counted.

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
  res.setHeader('Retry-After', '3600');
  res.status(503).type('html').send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>TalkLive - Maintenance</title><meta name="robots" content="noindex"><style>body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:#0d0d0d;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;min-height:100dvh;text-align:center;padding:24px;padding-left:calc(24px + env(safe-area-inset-left));padding-right:calc(24px + env(safe-area-inset-right))}h1{font-size:2rem;margin:.4em 0}.orb{width:72px;height:72px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#6da7ec,#184f95);margin:0 auto 18px;animation:p 2s ease-in-out infinite}@keyframes p{50%{transform:scale(1.08);opacity:.85}}p{color:#c3c2b7;max-width:420px;margin:0 auto;line-height:1.5}</style></head><body><div><div class="orb"></div><h1>We&rsquo;ll be right back</h1><p>${store.data.settings.maintenance.message.replace(/</g, '&lt;')}</p></div></body></html>`);
});

/*
 * Count page visits.
 *
 * Three things were wrong with how this used to work, and all three pushed the
 * owner's traffic numbers in directions that had nothing to do with people.
 *
 * 1. It only counted `/` and single-segment paths (`/^\/[a-z0-9-]+$/`). That
 *    silently excluded every page below the root: all 32 blog posts, 45
 *    country pages, 17 language pages, 114 city pages, the hub indexes, and
 *    all 16 localized homepages (`/es/`, `/hi/`, `/ur/` - they keep their
 *    trailing slash, which the regex rejects). Roughly three quarters of the
 *    indexed site reported zero traffic forever. A site whose entire content
 *    arm is invisible cannot tell "the blog is growing" from "nothing is
 *    happening", and a shift of search traffic from the root pages into the
 *    long tail - the normal outcome of the SEO work in this repo - reads on
 *    the dashboard as a decline.
 *
 * 2. It counted before routing, so a 404 and a 301 were both "visits". The
 *    301s mattered: `/foo.html` -> `/foo` and `/foo/` -> `/foo` each counted
 *    the redirect and then the page, double-counting every crawler that
 *    followed a legacy URL.
 *
 * 3. It made no distinction between a person and a crawler. See
 *    server/bots.js - on a site with a submitted sitemap and IndexNow pings,
 *    crawlers are a large share of HTML requests and arrive from hundreds of
 *    IPs, so they inflate `uniques` hardest of all. Removing the 1,098
 *    duplicate internal URLs in scripts/migrate-internal-utm.js cut a large
 *    block of Googlebot re-fetches of `/` - which, counted as people, looks
 *    exactly like losing visitors.
 *
 * So: count on `finish`, only a 200 that actually returned HTML, at any depth,
 * and put crawlers in their own bucket.
 */
const ACQUISITION_SOURCES = new Set([
  'member_share', 'seo', 'blog', 'google', 'bing', 'reddit', 'youtube',
  'tiktok', 'instagram', 'facebook', 'x', 'producthunt', 'app',
]);

/*
 * Which part of the site a URL belongs to. Now that pages below the root are
 * counted at all, this is what makes them legible: "blog is up, country pages
 * are flat" is an answer, where one undifferentiated visit total is not.
 *
 * Mirrors the clusters in scripts/build-seo.js so the dashboard's sections and
 * Search Console's per-sitemap coverage can be read side by side.
 */
const LOCALE_SECTION_RE = /^\/(ar|bn|de|es|fa|fr|hi|id|it|ja|ko|pt|ru|tr|ur|zh)(\/|$)/;
function pageSection(pathname) {
  if (pathname === '/' || pathname === '/landing') return 'home';
  if (LOCALE_SECTION_RE.test(pathname)) return 'localized home';
  if (pathname.startsWith('/blog')) return 'blog';
  if (pathname.startsWith('/countries')) return 'country pages';
  if (pathname.startsWith('/cities')) return 'city pages';
  if (pathname.startsWith('/languages')) return 'language pages';
  if (pathname.startsWith('/guides')) return 'guides';
  if (pathname === '/chat' || pathname === '/call' || pathname === '/settings') return 'app';
  return 'landing pages';
}

// A path whose last segment carries a file extension other than .html. Checked
// before anything else is done, so the ~15 asset requests behind every page
// view cost one regex instead of a listener and a user-agent classification.
// The bound reaches 12 so `site.webmanifest` is caught; no HTML page in
// public/ has a dot in its slug, so nothing real is excluded by it.
const ASSET_PATH_RE = /\.(?!html?$)[a-z0-9]{1,12}$/i;

app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  if (req.path.startsWith('/owner') || req.path.startsWith('/socket.io/')) return next();
  if (ASSET_PATH_RE.test(req.path)) return next();

  // Captured now because Express rewrites req.url as it routes, and the socket
  // the IP is read from may be gone by the time `finish` fires. Headers are
  // not rewritten, so the user-agent work can wait until we know it is needed.
  const ip = clientIp(req);
  const headers = req.headers;
  const pathname = req.path;
  const source = String(req.query.utm_source || '').toLowerCase();
  const invited = req.query.ref === 'invite';

  res.on('finish', () => {
    // Only a page that was actually delivered. This is what keeps redirects,
    // 404s and the maintenance 503 out, and - because it tests the response's
    // own content type rather than the request's `Accept` - it needs no path
    // pattern to tell a page from an asset or a JSON endpoint.
    if (res.statusCode !== 200) return;
    if (!/^text\/html/i.test(String(res.getHeader('Content-Type') || ''))) return;

    // Classified here rather than above: this is the first point at which we
    // know the request was a page view worth attributing to someone.
    const crawler = botLabel(headers['user-agent']);
    if (crawler || isPrefetch(headers)) {
      store.recordVisit(ip, null, null, crawler || 'Browser prefetch');
      return;
    }

    const geo = lookupGeo(ip);
    store.recordVisit(ip, geo.countryName, geo.city);
    store.recordSection(pageSection(pathname));
    if (ACQUISITION_SOURCES.has(source)) store.recordFeature(`acq_${source}`);
    if (invited) store.recordFeature('invite_arrival');
  });

  next();
});

// --- App screens -------------------------------------------------------------
// Below maintenance mode and the visit counter on purpose, so they obey both.

// The voice-call screen is its own URL (reached via history.replaceState once
// the user taps Talk) but shares the main single-page shell.
app.get('/call', (req, res) => {
  sendAppShell(res, 'index.html');
});

// The text-chat app is a genuinely separate, lightweight page - no voice/WebRTC
// code is loaded here at all, so the two sub-apps can never bleed into each
// other and it stays fast on weak phones.
app.get('/chat', (req, res) => {
  sendPage(res, 'chat.html');
});

// Settings is a screen inside the same single-page shell, at its own URL, so
// a reload or a bookmark lands back on it rather than 404ing. app.js opens the
// screen when it sees this path (see the deep-link block at the bottom of it).
app.get('/settings', (req, res) => {
  sendAppShell(res, 'index.html');
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

// ads.txt. An ads.txt that exists but lists nobody is the worst of both
// worlds: crawlers read it as "no seller is authorised to sell this
// inventory", so programmatic demand stops bidding and the CPM collapses.
// public/ads.txt was emptied during the AdSense -> Adsterra switch and never
// refilled, so it is served from ADS_TXT (the lines Adsterra shows under
// Websites -> ads.txt, newline or "|" separated) and 404s while that is unset,
// which demand partners treat as "no ads.txt" rather than "nobody authorised".
// The AdSense seller line is always listed; ADS_TXT adds any other networks.
const ADSENSE_ADS_TXT = 'google.com, pub-6368797323385379, DIRECT, f08c47fec0942fa0';
const ADS_TXT = [...new Set([ADSENSE_ADS_TXT, ...(process.env.ADS_TXT || '').split(/[|\n]/)]
  .map((line) => line.trim())
  .filter(Boolean))]
  .join('\n');
app.get('/ads.txt', (req, res) => {
  res.type('text').set('Cache-Control', 'public, max-age=3600').send(ADS_TXT + '\n');
});

// --- Ad density config -------------------------------------------------------
//
// public/ads.js reads its density and behaviour from here rather than having
// them compiled into 282 pages of markup. The committed defaults live in
// public/ads-config.json; ADS_CONFIG (a JSON object) is merged over the top.
//
// The point of the env layer is that ad density is the setting most likely to
// need changing on evidence, and changing it should not mean editing a
// generator, rebuilding every page, and waiting on a deploy. `fly secrets set
// ADS_CONFIG='{"maxSlotsPerPage":2}'` restarts the machine with the new value
// and touches no code. Setting {"enabled":false} is the kill switch if a
// creative ever misbehaves.
//
// Defaults are read once at boot and the env is parsed once. A malformed
// ADS_CONFIG is logged and ignored rather than thrown: bad JSON in an
// environment variable must not take the site down, and falling back to the
// committed defaults is always safe.
const ADS_CONFIG_DEFAULTS = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(PUBLIC_DIR, 'ads-config.json'), 'utf8'));
  } catch (err) {
    console.warn('[ads-config] public/ads-config.json is missing or invalid:', err.message);
    return {};
  }
})();

const ADS_CONFIG = (() => {
  const merged = { ...ADS_CONFIG_DEFAULTS };
  if (!process.env.ADS_CONFIG) return merged;
  try {
    const override = JSON.parse(process.env.ADS_CONFIG);
    if (!override || typeof override !== 'object' || Array.isArray(override)) {
      throw new Error('ADS_CONFIG must be a JSON object');
    }
    // One level deep, so {"types":{"native":false}} replaces the whole types
    // object rather than merging into it. Shallow is the predictable choice
    // here: a partial types object would silently leave formats enabled that
    // the operator thought they had listed exhaustively.
    Object.assign(merged, override);
  } catch (err) {
    console.warn('[ads-config] ignoring malformed ADS_CONFIG:', err.message);
  }
  return merged;
})();

app.get('/ads-config.json', (req, res) => {
  // Short cache: this is the one file an operator changes to react to a bad
  // day's revenue or a misbehaving creative, and a long TTL would leave stale
  // densities in browser caches for hours after the fix.
  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
  res.json(ADS_CONFIG);
});

// --- GIF search (Giphy) ------------------------------------------------------
//
// Was Tenor until Google shut that API down to external developers on
// 2026-06-30. Giphy is where the rest of the industry landed, and the shape of
// the integration is unchanged: same /api/gifs endpoint, same trimmed payload,
// so only this block and the URL allowlist below knew the difference.
//
// Proxied rather than called from the browser for three reasons: the API key
// never ships to the client, every response is cached here so a hundred people
// typing "lol" cost one upstream call, and we hand the client a trimmed payload
// (two URLs and a size) instead of Giphy's ~8 kB-per-result JSON - which is what
// keeps the picker usable on a slow phone.
//
// Without GIPHY_API_KEY the feature reports itself disabled and the clients hide
// the GIF button entirely, so an unconfigured deploy shows no dead UI.
const GIPHY_KEY = process.env.GIPHY_API_KEY || '';
// "g" is Giphy's most restrictive rating. On a product that pairs strangers
// anonymously this is not a preference, it is the only defensible default.
const GIPHY_RATING = 'g';
const GIF_LIMIT = 18;
// Longer than it would otherwise need to be, because a Giphy beta key allows
// only 100 calls an hour: the cache is what turns that into a usable feature
// rather than a quota that runs out mid-evening.
const GIF_CACHE_TTL = 30 * 60 * 1000;
const GIF_CACHE_MAX = 500;
const gifCache = new Map(); // key -> { expires, body }

// A stale entry is kept rather than dropped: when the hourly budget below is
// spent, yesterday's results for a query beat an empty grid.
function gifCacheGet(key, allowStale) {
  const hit = gifCache.get(key);
  if (!hit) return null;
  if (!allowStale && hit.expires < Date.now()) return null;
  // Refresh LRU position so popular searches survive eviction.
  gifCache.delete(key);
  gifCache.set(key, hit);
  return hit.body;
}

function gifCacheSet(key, body) {
  gifCache.set(key, { expires: Date.now() + GIF_CACHE_TTL, body });
  while (gifCache.size > GIF_CACHE_MAX) gifCache.delete(gifCache.keys().next().value);
}

// Giphy's free tier is 100 calls/hour for the whole key, not per user. Going
// over does not degrade politely - it starts returning errors - so we spend at
// most GIPHY_HOURLY_BUDGET and serve stale cache after that. Raise it once the
// key is upgraded to production.
const GIPHY_HOURLY_BUDGET = Number(process.env.GIPHY_HOURLY_BUDGET || 90);
let upstreamWindow = 0;
let upstreamCalls = 0;
function upstreamBudgetOk() {
  const hour = Math.floor(Date.now() / 3600000);
  if (hour !== upstreamWindow) { upstreamWindow = hour; upstreamCalls = 0; }
  return upstreamCalls < GIPHY_HOURLY_BUDGET;
}

// Per-IP sliding window. The picker debounces and caches client-side, so a real
// user never comes close to this; a script hammering it does.
const gifRate = new Map(); // ip -> { start, n }
function gifRateOk(ip) {
  const now = Date.now();
  let rl = gifRate.get(ip);
  if (!rl || now - rl.start > 60000) { rl = { start: now, n: 0 }; gifRate.set(ip, rl); }
  return ++rl.n <= 40;
}
setInterval(() => {
  const cutoff = Date.now() - 120000;
  for (const [ip, rl] of gifRate) if (rl.start < cutoff) gifRate.delete(ip);
}, 120000).unref();

// Trim a Giphy result to what the picker actually renders: a small preview for
// the grid and a bubble-sized GIF for the message. fixed_width is ~200px wide,
// which is exactly the width the bubble caps at - sending the original would
// push multi-megabyte files at phones for no visible gain. Anything missing a
// usable rendition is dropped rather than rendered as a broken tile.
function giphyItem(r) {
  const im = (r && r.images) || {};
  const full = im.fixed_width || im.downsized || im.original;
  const preview = im.fixed_width_small || im.preview_gif || full;
  if (!full || !full.url || !preview || !preview.url) return null;
  return {
    url: full.url,
    preview: preview.url,
    w: Number(full.width) || 0,
    h: Number(full.height) || 0,
    alt: String(r.title || '').slice(0, 80),
  };
}

// Overridable so the proxy can be pointed at a local mock in tests; there is no
// reason to set it in production.
const GIPHY_BASE = process.env.GIPHY_API_BASE || 'https://api.giphy.com/v1/gifs/';

async function giphyFetch(endpoint, params) {
  const url = new URL(GIPHY_BASE + endpoint);
  url.searchParams.set('api_key', GIPHY_KEY);
  url.searchParams.set('rating', GIPHY_RATING);
  url.searchParams.set('limit', String(GIF_LIMIT));
  url.searchParams.set('bundle', 'messaging_non_clips');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  // A stuck upstream must not hold a socket open: give up and let the client
  // show "no results" rather than spinning forever.
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 6000);
  upstreamCalls++;
  try {
    const resp = await fetch(url, { signal: ctl.signal });
    if (!resp.ok) throw new Error('giphy ' + resp.status);
    const json = await resp.json();
    return { results: (json.data || []).map(giphyItem).filter(Boolean) };
  } finally {
    clearTimeout(timer);
  }
}

app.get('/api/gifs/config', (req, res) => {
  // Short enough that turning the key on reaches existing visitors in minutes
  // rather than the next hour, which is what an operator expects after setting
  // a secret and redeploying.
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ enabled: !!GIPHY_KEY });
});

app.get('/api/gifs', async (req, res) => {
  if (!GIPHY_KEY) return res.status(503).json({ enabled: false, results: [] });
  if (!gifRateOk(clientIp(req))) return res.status(429).json({ results: [] });
  const q = String(req.query.q || '').trim().slice(0, 50);
  // Locale only ever reaches Giphy as a language tag we recognise, never raw
  // query input.
  const lang = /^[a-z]{2}$/.test(String(req.query.lang || '')) ? String(req.query.lang) : 'en';
  const key = (q ? 's:' + q.toLowerCase() : 'trending') + '|' + lang;
  const cached = gifCacheGet(key, false);
  if (cached) {
    res.set('Cache-Control', 'public, max-age=600');
    return res.json(cached);
  }
  // Out of upstream budget: stale results, or an empty grid, but never a burst
  // of calls that gets the key rate-limited for everyone.
  if (!upstreamBudgetOk()) {
    const stale = gifCacheGet(key, true);
    res.set('Cache-Control', 'public, max-age=120');
    return res.json(stale || { results: [] });
  }
  try {
    const body = q
      ? await giphyFetch('search', { q, lang })
      : await giphyFetch('trending', {});
    gifCacheSet(key, body);
    res.set('Cache-Control', 'public, max-age=600');
    res.json(body);
  } catch (err) {
    console.warn('[gifs] lookup failed:', err.message);
    const stale = gifCacheGet(key, true);
    if (stale) return res.json(stale);
    res.status(502).json({ results: [] });
  }
});

app.use(
  express.static(PUBLIC_DIR, {
    // Serve clean URLs: /talk-to-strangers resolves to talk-to-strangers.html.
    extensions: ['html'],
    setHeaders(res, filePath) {
      if (/\.html$/i.test(filePath)) {
        // HTML changes with deploys - revalidate so updates show up fast.
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      } else if (/\.(css|js|svg|png|jpg|jpeg|webp|ico|woff2?|mp4|webm|m4a|mp3)$/i.test(filePath)) {
        // Assets requested with a ?v= cache buster get a brand new URL on every
        // deploy, so the bytes behind a given URL never change - cache them for
        // a year. Everything else keeps the conservative one-day window.
        const versioned = /[?&]v=/.test(res.req && res.req.url ? res.req.url : '');
        res.setHeader(
          'Cache-Control',
          versioned
            ? 'public, max-age=31536000, immutable'
            : 'public, max-age=86400, stale-while-revalidate=604800'
        );
      } else if (/\.(xml|txt|webmanifest)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }
    },
  })
);

// Friendly 404 for unknown pages: correct status code (so search engines drop
// dead URLs) plus links back into the site instead of Express's plain text.
app.use((req, res) => {
  res.status(404).type('html').send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Page not found - TalkLive</title><meta name="robots" content="noindex"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><style>body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:#0b0f1a;color:#eef1f9;display:flex;align-items:center;justify-content:center;min-height:100vh;min-height:100dvh;text-align:center;padding:24px;padding-left:calc(24px + env(safe-area-inset-left));padding-right:calc(24px + env(safe-area-inset-right))}h1{font-size:2rem;margin:.4em 0}p{color:#9aa3b8;max-width:420px;margin:0 auto 20px;line-height:1.5}a.btn{display:inline-block;background:#4f7cff;color:#fff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:600}a{color:#8fb0ff}nav{margin-top:18px;display:flex;gap:16px;justify-content:center;flex-wrap:wrap;font-size:14px}</style></head><body><div><h1>404 - page not found</h1><p>That page doesn't exist, but thousands of people are online talking right now.</p><a class="btn" href="/">Start Talking Free</a><nav><a href="/talk-to-strangers">Talk to Strangers</a><a href="/random-voice-chat">Random Voice Chat</a><a href="/blog/">Blog</a><a href="/contact">Contact</a></nav></div></body></html>`);
});

// --- State ---
const waitingQueue = []; // socket ids waiting for a partner
const partners = new Map(); // socketId -> partnerSocketId
const profiles = new Map(); // socketId -> { username, country, city, gender, prefGender, includeCountries, excludeCountries, interests, clientId, countryFallbackActive }
const blocks = new Map(); // clientId -> Set<clientId>
// Who each person blocked, as they knew them: clientId -> Map<blockedId,
// { username, countryCode, avatar, ts }>. `blocks` alone is a set of opaque ids,
// which is why blocking used to be forever - there was nothing to list, so
// nothing to undo.
const blockMeta = new Map();
const MAX_BLOCKS = 500;
// "Clear chat" is one-sided: `${clientId}|${pairKey}` -> ts. Messages at or
// before it are hidden from that person only; the other side keeps the thread.
const chatClears = new Map();
const hearts = new Map(); // pairKey ("clientIdA|clientIdB" sorted) -> Set<clientId who hearted>
const reportCooldowns = new Map(); // reporter|target -> last report timestamp

// Pairs that were matched a moment ago and are already apart again.
//
// Nothing used to stop the matcher from handing two people straight back to
// each other: skipping put both of them back in the same short queue, so the
// very next scan paired them again. On a site with a handful of people online
// that is a loop, and it is the loop behind "I keep getting disconnected
// without ever getting connected": two peers whose media path cannot be
// established (both behind symmetric NAT with no relay between them) fail the
// 20s connect watchdog, both auto-skip, and the matcher immediately reunites
// them for another 20s of "Connecting…" - forever, while the site shows plenty
// of other people online.
//
// So a parted pair is held apart for a while. Two strengths, because the two
// cases are not the same:
//  - someone skipped (or the tab closed): a soft hold, so the next match is a
//    new person, but a long wait may still fall back to them.
//  - the call never connected: a hard hold. Re-matching that pair provably
//    cannot produce a working call, so the random-match fallback must not
//    override it either.
const pairCooldowns = new Map(); // pairKey -> { until, failed }
const PAIR_COOLDOWN_MS = 60 * 1000;
// Long enough to break the loop outright, short enough that a genuine change of
// network on either side (cellular to wifi, a VPN switched off) gets another go.
const FAILED_PAIR_COOLDOWN_MS = 10 * 60 * 1000;

function notePairParted(clientIdA, clientIdB, failed) {
  if (!clientIdA || !clientIdB || clientIdA === clientIdB) return;
  const key = pairKey(clientIdA, clientIdB);
  const prev = pairCooldowns.get(key);
  const prevLive = prev && prev.until > Date.now();
  // A pair that has already failed stays "failed" for the rest of the session's
  // hold: one side later leaving voluntarily must not downgrade it.
  const isFailed = !!failed || !!(prevLive && prev.failed);
  const until = Date.now() + (isFailed ? FAILED_PAIR_COOLDOWN_MS : PAIR_COOLDOWN_MS);
  pairCooldowns.set(key, {
    until: prevLive ? Math.max(prev.until, until) : until,
    failed: isFailed,
  });
}

// `soft` false asks only about a hold the random-match fallback may not
// override - i.e. a pair whose call never connected.
function pairOnCooldown(clientIdA, clientIdB, soft) {
  const key = pairKey(clientIdA, clientIdB);
  const rec = pairCooldowns.get(key);
  if (!rec) return false;
  if (rec.until <= Date.now()) {
    pairCooldowns.delete(key);
    return false;
  }
  return soft ? true : rec.failed;
}

// In-chat voice-call invites: a /chat user invites their current text partner
// to a voice call. On accept the server mints a one-time token; both browsers
// navigate to /call?invite=<token> (which creates brand-new sockets) and
// 'voice-invite-join' pairs the two token holders there in talk mode.
const voiceInvites = new Map(); // token -> { clients: [clientIdA, clientIdB], joined: Map<clientId, socketId>, timer }
const VOICE_INVITE_TTL_MS = 2 * 60 * 1000; // plenty for two page loads; then it's dead

// If a search takes longer than this, we drop ALL matching filters for the
// current search (gender + country preferences, everything except blocks) and
// auto-match with any random stranger so nobody waits forever.
const RANDOM_FALLBACK_MS = 10000;
const waitFallbackTimers = new Map(); // socketId -> Timeout

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

// clientId -> false when the user turned off "Receive incoming calls", so
// friends can still message them but cannot ring them. Absent means on.
const callsOpen = new Map();

function acceptsCalls(clientId) {
  return callsOpen.get(clientId) !== false;
}

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
const accounts = new Map(); // username (lowercase) -> { passwordHash, salt, nickname, googleId, email, google }
const socketAuth = new Map(); // socketId -> logged-in username (lowercase)
const googleAccounts = new Map(); // Google "sub" id -> username (lowercase)

// --- Linking an account to the profile that holds the friends --------------
// Credentials and profile are two different things here: the account is a
// username and a password, while friends, friend chats, call history and
// premium all hang off the anonymous clientId the browser generated on its
// first visit. Signing in on a second device used to leave those behind,
// because nothing tied the two together.
//
// So the first sign-in donates this device's profile to the account, and every
// later sign-in is handed that same clientId back (with a fresh identity token,
// since the new device has never held one for it) and adopts it. The link is
// written once and never repointed - see store.setAccountClientId - so signing
// in from a fresh browser can't swap the account's real profile for an empty
// one.
function linkAccountProfile(usernameLower, socketId) {
  const profile = profiles.get(socketId);
  const currentClientId = profile ? profile.clientId : null;
  const linked = store.getAccountClientId(usernameLower)
    || store.setAccountClientId(usernameLower, currentClientId);
  // Nothing linked and nothing to link (the socket authenticated before it
  // registered a profile): leave the browser on the clientId it already has.
  if (!linked || linked === currentClientId) return {};
  return { profileClientId: linked, identityToken: signIdentity(linked) };
}

// Persist the live accounts Map back to the durable store.
function persistAccount(usernameLower) {
  const acc = accounts.get(usernameLower);
  if (acc) store.saveAccount(usernameLower, acc);
}

// --- Friends / notifications / call-back state - all in-memory, keyed by the
// persistent per-browser clientId so it survives reconnects (works for both
// temporary/guest users and signed-in accounts). Resets on server restart.
const clientSockets = new Map(); // clientId -> current socketId, for online lookup
const friends = new Map(); // clientId -> Map<friendClientId, { username, countryCode, temporary }>
const friendRequests = new Map(); // clientId -> Map<fromClientId, { username, countryCode, temporary, ts }>
// The same requests seen from the sender's side: clientId -> Map<targetClientId,
// { username, countryCode, avatar, ts }>. Kept as its own index rather than
// derived, because "have I already asked this person?" is a question the
// profile sheet asks about one person and answering it by scanning every
// recipient's inbox would walk the whole graph.
const sentRequests = new Map();

// Declined requests: `${from}>${to}` -> ts. Declining used to clear the request
// and nothing else, so the sender's button reset to "Add friend" and the same
// person could be asked again, and again - on a stranger app that is a
// harassment channel with a friendly name. For a while after a decline a new
// request is accepted quietly on the sender's side ("Pending", exactly as
// before) and never delivered. The sender is not told they were declined.
const declinedRequests = new Map();
const DECLINE_HOLD_MS = 7 * 24 * 60 * 60000;

function recentlyDeclined(fromClientId, targetClientId) {
  const ts = declinedRequests.get(`${fromClientId}>${targetClientId}`);
  if (!ts) return false;
  if (Date.now() - ts < DECLINE_HOLD_MS) return true;
  declinedRequests.delete(`${fromClientId}>${targetClientId}`);
  return false;
}

function noteSentRequest(fromClientId, targetClientId, info) {
  if (!sentRequests.has(fromClientId)) sentRequests.set(fromClientId, new Map());
  sentRequests.get(fromClientId).set(targetClientId, { ...info, ts: Date.now() });
}

// Drop a request from both indexes at once - they only ever describe the same
// request from the two ends, so they have to go together.
function clearRequestPair(fromClientId, targetClientId) {
  const inbox = friendRequests.get(targetClientId);
  if (inbox) {
    inbox.delete(fromClientId);
    if (!inbox.size) friendRequests.delete(targetClientId);
  }
  const outbox = sentRequests.get(fromClientId);
  if (outbox) {
    outbox.delete(targetClientId);
    if (!outbox.size) sentRequests.delete(fromClientId);
  }
}
const notifications = new Map(); // clientId -> Array<notification>
const friendChats = new Map(); // pairKey -> Array<{ from, text, ts }>
const chatHistory = new Map(); // clientId -> Array<{ clientId, username, countryCode, mode, ts }> (newest last)
// When each person was last connected: clientId -> ts. Only kept for people
// someone could be looking for (friends, recent matches) - see the sweep.
const lastSeen = new Map();

// Voice and text matches both land here, so it is sized for a session of
// skipping: ten was gone after a few minutes of "next", taking with it the one
// person worth calling back.
const MAX_CHAT_HISTORY = 20;
const MAX_NOTIFICATIONS = 50;
// Pending requests and queued notifications older than this are dead weight:
// nobody acts on a month-old "wants to talk".
const SOCIAL_INBOX_TTL_MS = 30 * 24 * 60 * 60000;

// Serialize the live social Maps back to plain JSON and persist them, so users'
// friends and their chat history ("memories") survive restarts. Debounced by
// the store, so calling it on each mutation is cheap.
// Coalesced to one write per event-loop turn: a single friend message touches
// the chat log and the inbox, and serialising the whole graph twice for it was
// pure waste.
let socialWriteQueued = false;
function persistSocial() {
  if (socialWriteQueued) return;
  socialWriteQueued = true;
  setImmediate(() => {
    socialWriteQueued = false;
    writeSocial();
  });
}

function writeSocial() {
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
  const historyObj = {};
  for (const [cid, list] of chatHistory) {
    if (list.length) historyObj[cid] = list;
  }
  const mapOfMaps = (outer) => {
    const obj = {};
    for (const [cid, m] of outer) {
      if (m.size) obj[cid] = Object.fromEntries(m);
    }
    return obj;
  };
  const notifObj = {};
  for (const [cid, list] of notifications) {
    if (list.length) notifObj[cid] = list;
  }
  store.saveSocial({
    friends: friendsObj,
    friendChats: chatsObj,
    blocks: blocksObj,
    chatHistory: historyObj,
    friendRequests: mapOfMaps(friendRequests),
    sentRequests: mapOfMaps(sentRequests),
    notifications: notifObj,
    lastSeen: Object.fromEntries(lastSeen),
    blockMeta: mapOfMaps(blockMeta),
    chatClears: Object.fromEntries(chatClears),
    declinedRequests: Object.fromEntries(declinedRequests),
  });
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
      email: acc.email || null,
      google: acc.google || null,
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
  for (const [cid, list] of Object.entries(social.chatHistory || {})) {
    chatHistory.set(cid, Array.isArray(list) ? list.slice(-MAX_CHAT_HISTORY) : []);
  }
  for (const [cid, m] of Object.entries(social.friendRequests || {})) {
    if (m && typeof m === 'object') friendRequests.set(cid, new Map(Object.entries(m)));
  }
  for (const [cid, m] of Object.entries(social.sentRequests || {})) {
    if (m && typeof m === 'object') sentRequests.set(cid, new Map(Object.entries(m)));
  }
  for (const [cid, list] of Object.entries(social.notifications || {})) {
    if (Array.isArray(list) && list.length) notifications.set(cid, list.slice(-MAX_NOTIFICATIONS));
  }
  for (const [cid, ts] of Object.entries(social.lastSeen || {})) {
    if (typeof ts === 'number') lastSeen.set(cid, ts);
  }
  for (const [cid, m] of Object.entries(social.blockMeta || {})) {
    if (m && typeof m === 'object') blockMeta.set(cid, new Map(Object.entries(m)));
  }
  for (const [key, ts] of Object.entries(social.chatClears || {})) {
    if (typeof ts === 'number') chatClears.set(key, ts);
  }
  for (const [key, ts] of Object.entries(social.declinedRequests || {})) {
    if (typeof ts === 'number') declinedRequests.set(key, ts);
  }
}

function isFriend(a, b) {
  const setA = friends.get(a);
  return !!(setA && setA.has(b));
}

// Record that `owner` just chatted with `partner`, keeping only the newest
// MAX_CHAT_HISTORY unique partners (most recent moved to the end).
function recordChatHistory(ownerClientId, partner) {
  if (!ownerClientId || !partner || !partner.clientId || partner.clientId === ownerClientId) return;
  let list = chatHistory.get(ownerClientId);
  if (!list) { list = []; chatHistory.set(ownerClientId, list); }
  const idx = list.findIndex((e) => e.clientId === partner.clientId);
  if (idx !== -1) list.splice(idx, 1);
  list.push({
    clientId: partner.clientId,
    username: partner.username,
    countryCode: partner.country,
    avatar: partner.avatar || null,
    mode: partner.mode === 'chat' ? 'chat' : 'talk',
    ts: Date.now(),
  });
  while (list.length > MAX_CHAT_HISTORY) list.shift();
}

// A direct conversation with someone who is not a friend lives in "recent
// people" - that list is where it is opened from. Twenty more random matches
// used to push the person out of it, and with them the whole conversation:
// messages to them were silently dropped and the thread could not be loaded.
// Talking keeps the row fresh on both sides, the way a messenger's inbox does.
// Returns true when the row was missing and had to be added back, which is the
// case where the owner's list needs a fresh state-sync to show it.
function touchChatHistory(ownerClientId, otherClientId, fallback) {
  if (!ownerClientId || !otherClientId || ownerClientId === otherClientId) return false;
  if (isFriend(ownerClientId, otherClientId)) return false;
  let list = chatHistory.get(ownerClientId);
  const idx = list ? list.findIndex((e) => e.clientId === otherClientId) : -1;
  let entry = idx !== -1 ? list[idx] : null;
  if (!entry) {
    if (!fallback || !fallback.username) return false;
    entry = {
      clientId: otherClientId,
      username: fallback.username,
      countryCode: fallback.countryCode || '',
      avatar: fallback.avatar || null,
      mode: 'chat',
    };
  } else {
    list.splice(idx, 1);
  }
  if (!list) { list = []; chatHistory.set(ownerClientId, list); }
  list.push({ ...entry, ts: Date.now() });
  while (list.length > MAX_CHAT_HISTORY) list.shift();
  return idx === -1;
}

// What one person knows about another, from the freshest place that has it:
// their live profile, a friendship, a recent match, or a request.
function snapshotOf(clientId, viewerClientId) {
  const sock = getSocketByClientId(clientId);
  const live = sock ? profiles.get(sock.id) : null;
  if (live) return { username: live.username, countryCode: live.country, avatar: live.avatar || null };
  const friend = (friends.get(viewerClientId) || new Map()).get(clientId);
  if (friend) return { username: friend.username, countryCode: friend.countryCode, avatar: friend.avatar || null };
  const past = (chatHistory.get(viewerClientId) || []).find((e) => e.clientId === clientId);
  if (past) return { username: past.username, countryCode: past.countryCode, avatar: past.avatar || null };
  const req = (friendRequests.get(viewerClientId) || new Map()).get(clientId)
    || (sentRequests.get(viewerClientId) || new Map()).get(clientId);
  if (req) return { username: req.username, countryCode: req.countryCode, avatar: req.avatar || null };
  return { username: '', countryCode: '', avatar: null };
}

// The point before which `viewer` has cleared their copy of a conversation.
function clearedAt(viewerClientId, otherClientId) {
  return chatClears.get(`${viewerClientId}|${pairKey(viewerClientId, otherClientId)}`) || 0;
}

function visibleThread(viewerClientId, otherClientId) {
  const list = friendChats.get(pairKey(viewerClientId, otherClientId)) || [];
  const cut = clearedAt(viewerClientId, otherClientId);
  return cut ? list.filter((m) => m.ts > cut) : list;
}

function dropFromChatHistory(ownerClientId, otherClientId) {
  const list = chatHistory.get(ownerClientId);
  if (!list) return;
  const left = list.filter((e) => e.clientId !== otherClientId);
  if (left.length === list.length) return;
  if (left.length) chatHistory.set(ownerClientId, left); else chatHistory.delete(ownerClientId);
}

// Both sides of a fresh pairing remember each other - whether it was a random
// match, an accepted call-back or an in-chat voice invite - so either can
// message, call back, add or report the other afterwards.
function rememberPairing(sockA, profA, sockB, profB) {
  recordChatHistory(profA.clientId, profB);
  recordChatHistory(profB.clientId, profA);
  persistSocial();
  syncClientState(sockA, profA.clientId);
  syncClientState(sockB, profB.clientId);
}

// Re-send state to everyone whose lists show this person - their friends and
// anyone with them among recent matches - so a green dot flips live.
function resyncWatchers(clientId) {
  const seen = new Set();
  for (const [fid] of friends.get(clientId) || new Map()) {
    seen.add(fid);
    const sock = getSocketByClientId(fid);
    if (sock) syncClientState(sock, fid);
  }
  // Only someone connected right now can be shown anything, so walk the
  // online set rather than every history list ever stored: the latter is every
  // user who has ever matched, and this runs on each connect and disconnect.
  for (const otherId of clientSockets.keys()) {
    if (otherId === clientId || seen.has(otherId)) continue;
    const list = chatHistory.get(otherId);
    if (!list || !list.some((e) => e.clientId === clientId)) continue;
    const sock = getSocketByClientId(otherId);
    if (sock) syncClientState(sock, otherId);
  }
}

// The newest stored message between two people, trimmed to what a list row
// needs to show - so a friend list reads like an inbox, not a phone book.
function lastMessageBetween(me, other) {
  const list = friendChats.get(pairKey(me, other));
  const m = list && list[list.length - 1];
  if (!m || m.ts <= clearedAt(me, other)) return null;
  return {
    id: m.id,
    mine: m.from === me,
    text: m.text ? m.text.slice(0, 80) : '',
    gif: !!m.gif,
    ts: m.ts,
    seen: !!m.seen,
  };
}

// Presence as friends see it: live, or when they were last here. Someone who
// hides their status shows neither.
function presenceOf(clientId) {
  if (statusHidden.get(clientId)) return { online: false, lastSeen: null };
  if (clientSockets.has(clientId)) return { online: true, lastSeen: null };
  return { online: false, lastSeen: lastSeen.get(clientId) || null };
}

// True if `b` appears in `a`'s recent chat history (either direction) - used to
// let someone message a past partner back even though they never became friends.
function hasChatHistory(a, b) {
  const la = chatHistory.get(a);
  if (la && la.some((e) => e.clientId === b)) return true;
  const lb = chatHistory.get(b);
  return !!(lb && lb.some((e) => e.clientId === a));
}

function addFriendPair(clientIdA, infoA, clientIdB, infoB) {
  if (!friends.has(clientIdA)) friends.set(clientIdA, new Map());
  if (!friends.has(clientIdB)) friends.set(clientIdB, new Map());
  friends.get(clientIdA).set(clientIdB, infoB);
  friends.get(clientIdB).set(clientIdA, infoA);
  // A friendship answers every request between the two, in either direction.
  // Clearing only the one that was accepted left the other side's own ask
  // behind, so a friend's profile could still read "Pending".
  clearRequestPair(clientIdA, clientIdB);
  clearRequestPair(clientIdB, clientIdA);
  declinedRequests.delete(`${clientIdA}>${clientIdB}`);
  declinedRequests.delete(`${clientIdB}>${clientIdA}`);
  removeNotificationsWhere(clientIdA, (n) => n.type === 'friend_request' && n.fromClientId === clientIdB);
  removeNotificationsWhere(clientIdB, (n) => n.type === 'friend_request' && n.fromClientId === clientIdA);
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

// What a web push says for each in-app notification type. Deliberately no
// message text: an anonymous chat product's notifications land on lock screens
// in front of other people, and "Ana: <the actual message>" is not something to
// put there. Returning null means "worth queueing in-app, not worth waking a
// phone for".
function pushCopyFor(notif) {
  switch (notif.type) {
    case 'message':
      return { topic: `msg:${notif.fromClientId}`, title: `${notif.username} messaged you`, body: 'Open TalkLive to read it.', url: '/?open=friends' };
    case 'friend_request':
      return { topic: `req:${notif.fromClientId}`, title: `${notif.username} wants to be friends`, body: 'Tap to accept or decline.', url: '/?open=friends' };
    case 'friend_accepted':
      return { topic: `acc:${notif.byClientId}`, title: `${notif.username} accepted your friend request`, body: 'Say hello - you can message them any time.', url: '/?open=friends' };
    case 'call_back_request':
      return { topic: `call:${notif.fromClientId}`, title: `${notif.username} wants to talk`, body: 'They asked you to call back.', url: '/?open=friends' };
    default:
      return null;
  }
}

function pushNotification(clientId, notif) {
  if (!notifications.has(clientId)) notifications.set(clientId, []);
  const list = notifications.get(clientId);
  const full = { id: crypto.randomUUID(), ts: Date.now(), ...notif };
  list.push(full);
  // Over the cap, drop the oldest unread-message marker first. Evicting purely
  // by age let one chatty friend push a pending friend request or call-back
  // out of the inbox before it was ever seen - and a message marker only
  // drives a badge count, while the chat itself is stored separately.
  while (list.length > MAX_NOTIFICATIONS) {
    const idx = list.findIndex((n) => n.type === 'message');
    list.splice(idx === -1 ? 0 : idx, 1);
  }
  persistSocial();
  const targetSocket = getSocketByClientId(clientId);
  if (targetSocket) {
    targetSocket.emit('notification', full);
    // Someone with the tab open has already been told. Sending a system
    // notification on top of the in-app one is the fastest way to get push
    // permission revoked.
    return full;
  }
  const copy = pushCopyFor(full);
  // Fire and forget: a slow push service must never hold up the sender's
  // socket handler. Failures are logged inside push.send.
  if (copy) push.send(clientId, copy).catch(() => {});
  return full;
}

function removeNotification(clientId, notificationId) {
  const list = notifications.get(clientId);
  if (!list) return;
  const idx = list.findIndex((n) => n.id === notificationId);
  if (idx !== -1) {
    list.splice(idx, 1);
    persistSocial();
  }
}

// Remove every notification in clientId's inbox that matches `pred`. Returns
// whether anything went, so callers know whether a re-sync is worth sending.
function removeNotificationsWhere(clientId, pred) {
  const list = notifications.get(clientId);
  if (!list) return false;
  const remaining = list.filter((n) => !pred(n));
  if (remaining.length === list.length) return false;
  if (remaining.length) notifications.set(clientId, remaining);
  else notifications.delete(clientId);
  persistSocial();
  return true;
}

// Who the notification is about, whichever field the type carries it in.
function notifSubject(n) {
  return n.fromClientId || n.byClientId || null;
}

// Two people with any standing connection: friends, or a recent random match
// on either side's history. The bar for anything addressed by clientId alone
// (call-backs, direct chat) - without it, a clientId seen once is enough to
// ring or message someone forever.
function knowsEachOther(a, b) {
  return isFriend(a, b) || hasChatHistory(a, b) || friendChats.has(pairKey(a, b));
}

// Per-client sliding budget for social actions that reach another person
// (friend requests, call-backs, direct messages). Keyed by clientId rather
// than socket so reconnecting does not reset it.
const socialRate = new Map(); // `${action}|${clientId}` -> { start, n }
function socialRateOk(action, clientId, max, windowMs) {
  const key = `${action}|${clientId}`;
  const now = Date.now();
  let rl = socialRate.get(key);
  if (!rl || now - rl.start > windowMs) { rl = { start: now, n: 0, windowMs }; socialRate.set(key, rl); }
  return ++rl.n <= max;
}

// Call-back asks that are still waiting for an answer: target -> Map<from, ts>.
// 'call-back-respond' only pairs two people when the one being paired actually
// asked for it - otherwise any client could name any online clientId and be
// force-connected to them, dropping whatever call they were in.
const pendingCallBacks = new Map();
const CALL_BACK_TTL_MS = SOCIAL_INBOX_TTL_MS;

function notePendingCallBack(fromClientId, targetClientId) {
  if (!pendingCallBacks.has(targetClientId)) pendingCallBacks.set(targetClientId, new Map());
  pendingCallBacks.get(targetClientId).set(fromClientId, Date.now());
}

// Returns when the ask was made, or 0 when there is none (or it expired).
function takePendingCallBack(fromClientId, targetClientId) {
  const m = pendingCallBacks.get(targetClientId);
  const ts = m && m.get(fromClientId);
  if (!ts) return 0;
  m.delete(fromClientId);
  if (!m.size) pendingCallBacks.delete(targetClientId);
  return Date.now() - ts < CALL_BACK_TTL_MS ? ts : 0;
}

// An ask the caller is still ringing out on. The client gives up after 45s;
// anything older was queued for later and the caller has since moved on.
// Overridable so an end-to-end test need not wait a minute; production never sets it.
const CALL_BACK_LIVE_MS = Number(process.env.CALL_BACK_LIVE_MS) || 60 * 1000;

// Whether this socket's page can take a voice call right now. /chat is text
// only: it ignores voice matches and has no call-back banner, so ringing or
// force-pairing it left the other person on "Connecting…" until the watchdog
// gave up and held the pair apart as a failed connection.
function canTakeCall(profile) {
  return !!profile && profile.surface !== 'chat';
}

// Keep the name, avatar and country friends see for this person current. The
// friend entry is a snapshot taken when the friendship began, so a later
// nickname change or new avatar never reached anyone's list. The private
// label a friend gave them (`nickname`) is theirs and is left alone.
function refreshFriendSnapshots(clientId, profile) {
  if (!profile) return;
  let changed = false;
  for (const [fid] of friends.get(clientId) || new Map()) {
    const entry = (friends.get(fid) || new Map()).get(clientId);
    if (!entry) continue;
    if (profile.username && entry.username !== profile.username) { entry.username = profile.username; changed = true; }
    if (profile.avatar && entry.avatar !== profile.avatar) { entry.avatar = profile.avatar; changed = true; }
    if (profile.country && profile.country !== 'XX' && entry.countryCode !== profile.country) { entry.countryCode = profile.country; changed = true; }
  }
  if (changed) persistSocial();
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
    // Friends who hid their status always appear offline to friends - this
    // only masks the per-friend indicator, never the global online count.
    ...presenceOf(fid),
    last: lastMessageBetween(clientId, fid),
  }));
  const requestList = Array.from((friendRequests.get(clientId) || new Map()).entries()).map(([fid, info]) => ({
    clientId: fid,
    ...info,
  }));
  // Recent random-chat partners (newest first), each carrying a live online
  // flag so the history panel can show who's around to message back right now.
  const historyList = Array.from(chatHistory.get(clientId) || [])
    .slice()
    .reverse()
    .map((e) => ({
      clientId: e.clientId,
      username: e.username,
      countryCode: e.countryCode,
      avatar: liveAvatarFor(e.clientId, e.avatar),
      mode: e.mode || 'chat',
      ts: e.ts,
      ...presenceOf(e.clientId),
      last: lastMessageBetween(clientId, e.clientId),
    }));
  // Who this user has asked and not heard back from, so a profile can say
  // "Pending" instead of offering to send the same request twice.
  const sentList = Array.from((sentRequests.get(clientId) || new Map()).entries()).map(([fid, info]) => {
    const { held, ...rest } = info;
    return { clientId: fid, ...rest, online: clientSockets.has(fid) && !statusHidden.get(fid) };
  });
  // Only the people this user blocked - never who blocked them, which would
  // tell a blocked person exactly who shut them out.
  const metaMap = blockMeta.get(clientId) || new Map();
  const blockedList = Array.from(blocks.get(clientId) || [])
    .map((bid) => ({ clientId: bid, ...(metaMap.get(bid) || {}) }))
    .sort((a, b) => (b.ts || 0) - (a.ts || 0));
  socket.emit('state-sync', {
    friends: friendList,
    friendRequests: requestList,
    sentRequests: sentList,
    notifications: notifications.get(clientId) || [],
    chatHistory: historyList,
    blocked: blockedList,
  });
}

function pairKey(a, b) {
  return [a, b].sort().join('|');
}

// No links of any kind are allowed in chat - protocols, www-prefixed hosts,
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

// Clearly illegal / scam content is blocked in stranger chat (mirrors the
// client-side filter) so the text pool stays legally safe.
const UNSAFE_RE = /\b(child\s*porn|cp\s*trade|loli(?:con)?|jailbait|sell(?:ing)?\s+(?:drugs|guns|weapons)|buy\s+(?:drugs|cocaine|heroin|meth|fentanyl)|hire\s*(?:a\s*)?hitman|credit\s*card\s*numbers?|send\s+nudes|onlyfans|escort\s*service|invest\s+in\s+(?:crypto|bitcoin)|gift\s*cards?\s+for)\b/i;

// --- Rich message parts: ids, replies, GIFs, reactions ----------------------
//
// A chat message used to be a bare string on the wire. It is now either that
// (older clients still in someone's cache) or an object, so every reader below
// goes through readChatPayload rather than trusting the shape.
const MSG_ID_RE = /^[A-Za-z0-9_-]{1,24}$/;
// GIFs may only ever point at Giphy's own CDN (media0-4.giphy.com, i.giphy.com
// and friends). The picker gets its URLs from our proxy, so anything else
// arriving here is a client that has been tampered with trying to make us relay
// an arbitrary remote image.
const GIF_URL_RE = /^https:\/\/(?:[a-z0-9-]+\.)*giphy\.com\/[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%-]+$/i;
// The reaction set is fixed. An open emoji field is a free text channel that
// bypasses every filter above it.
const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
const REACTION_SET = new Set(REACTIONS);

function cleanMsgId(v) {
  return typeof v === 'string' && MSG_ID_RE.test(v) ? v : null;
}

function cleanGif(g) {
  if (!g || typeof g !== 'object') return null;
  const url = String(g.url || '');
  const preview = String(g.preview || url);
  if (url.length > 400 || preview.length > 400) return null;
  if (!GIF_URL_RE.test(url) || !GIF_URL_RE.test(preview)) return null;
  const dim = (v) => Math.min(800, Math.max(0, Math.round(Number(v) || 0)));
  return { url, preview, w: dim(g.w), h: dim(g.h), alt: String(g.alt || '').slice(0, 80) };
}

// Normalizes both wire shapes into one record. Returns null for anything that
// carries neither text nor a GIF - there is nothing to deliver.
function readChatPayload(raw) {
  const obj = typeof raw === 'string' ? { text: raw } : raw;
  if (!obj || typeof obj !== 'object') return null;
  const text = typeof obj.text === 'string' ? obj.text.trim().slice(0, 1000) : '';
  const gif = cleanGif(obj.gif);
  if (!text && !gif) return null;
  return { text, gif, id: cleanMsgId(obj.id), replyTo: cleanMsgId(obj.replyTo) };
}

// What the owner dashboard stores for a GIF-only message, so moderation sees
// something meaningful instead of an empty row.
function transcriptText(msg) {
  if (msg.text) return msg.text;
  return '[GIF] ' + (msg.gif.alt || msg.gif.url);
}
// Reported client errors that are not our code and not actionable: browser
// extensions injecting into the page, in-app webviews tearing down their JS
// bridge, opaque cross-origin script errors and autoplay-policy rejections.
// Keep in sync with NOISE in public/error-reporter.js.
const ERROR_NOISE = [
  /metamask/i,
  /ethereum|web3|solana|phantom|coinbase.?wallet/i,
  /Java object is gone/i,
  /webkit\.messageHandlers/i,
  /^Script error\.?$/i,
  /ResizeObserver loop/i,
  /The (play method|request) is not allowed by the user agent/i,
  /The fetching process for the media resource was aborted/i,
  /play\(\) request was interrupted/i,
  /extension:\/\//i,
];

// socket.id -> { start, n } sliding 5s window for the chat bot-flood guard.
const chatRate = new Map();
// Same shape, separate budget for reactions - a tap is not a message.
const reactRate = new Map();

// scrypt is deliberately expensive (~80-100ms here). The synchronous form runs
// that on the event loop, which this process shares with every live call's
// signalling - so a burst of logins froze matchmaking, chat and ICE relaying for
// everyone. The async form hands the work to libuv's thread pool instead, so
// hashing costs one worker thread rather than the whole server.
function hashPassword(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err);
      else resolve(derived.toString('hex'));
    });
  });
}

async function createAccount(username, password, nickname, email) {
  const salt = crypto.randomBytes(16).toString('hex');
  accounts.set(username.toLowerCase(), {
    passwordHash: await hashPassword(password, salt),
    salt,
    nickname,
    email: email || null,
  });
  persistAccount(username.toLowerCase());
}

// --- Recovery email --------------------------------------------------------
// An account is username + password; the email is optional and exists for one
// purpose only - proving you own the account when the password is gone. It is
// never shown to other users and never used for marketing.
//
// Deliberately permissive: this only has to reject text that is obviously not
// an address. A stricter regex would bounce real addresses, and the address is
// verified for real the moment the account holder reads a code sent to it.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

function normalizeEmail(value) {
  if (typeof value !== 'string') return '';
  const email = value.trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) return '';
  return email;
}

// --- Password reset by emailed OTP -----------------------------------------
// Flow: request a code -> enter the 6 digits -> choose a new password. The
// middle step hands out a short-lived token so the last step never has to
// resend the code, and the codes/tokens themselves are stored only as hashes
// (Supabase Postgres in production, see store.js).
const RESET_CODE_TTL_MS = 10 * 60000;   // how long an emailed code is good for
const RESET_TOKEN_TTL_MS = 15 * 60000;  // how long the verified step lasts
const RESET_MAX_ATTEMPTS = 5;           // wrong codes before the code dies
// Requesting a code is unauthenticated and sends mail, so it is throttled on
// both sides: per address (an inbox cannot be used as a mailbomb target) and
// per IP (one host cannot spray requests across many addresses).
const RESET_LIMIT_EMAIL = 3;
const RESET_LIMIT_IP = 15;
const RESET_WINDOW_MS = 60 * 60000;
const resetRequests = new Map(); // "ip:<ip>" | "email:<addr>" -> { first, count }

function resetThrottled(ip, email) {
  const now = Date.now();
  for (const [key, limit] of [[`ip:${ip}`, RESET_LIMIT_IP], [`email:${email}`, RESET_LIMIT_EMAIL]]) {
    const rec = resetRequests.get(key);
    if (!rec) continue;
    if (now - rec.first > RESET_WINDOW_MS) { resetRequests.delete(key); continue; }
    if (rec.count >= limit) return true;
  }
  return false;
}

function noteResetRequest(ip, email) {
  const now = Date.now();
  for (const key of [`ip:${ip}`, `email:${email}`]) {
    const rec = resetRequests.get(key);
    if (!rec || now - rec.first > RESET_WINDOW_MS) resetRequests.set(key, { first: now, count: 1 });
    else rec.count += 1;
  }
}

// Six digits, uniformly distributed. Math.random() would be both biased and
// predictable, and this value is the only thing standing between a stranger
// and someone's account.
function generateOtp() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

function hashToken(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

// The nickname is user-supplied and goes into an HTML email body.
function escapeHtmlText(str) {
  return String(str).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function otpEmail(nickname, code) {
  const minutes = Math.round(RESET_CODE_TTL_MS / 60000);
  const text = [
    `Hi ${nickname},`,
    '',
    `Your TalkLive password reset code is: ${code}`,
    '',
    `It expires in ${minutes} minutes and can be used once.`,
    'If you did not ask to reset your password, you can ignore this email - your password has not changed.',
    '',
    '- TalkLive',
  ].join('\n');
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1b1b1f">
      <h2 style="margin:0 0 8px;font-size:20px">Reset your TalkLive password</h2>
      <p style="margin:0 0 20px;color:#55555f">Hi ${escapeHtmlText(nickname)}, use this code to set a new password.</p>
      <div style="font-size:34px;font-weight:700;letter-spacing:10px;text-align:center;padding:18px;border-radius:12px;background:#f3f2f8">${code}</div>
      <p style="margin:20px 0 0;color:#55555f">The code expires in ${minutes} minutes and can be used once.</p>
      <p style="margin:12px 0 0;color:#8a8a94;font-size:13px">Didn't ask for this? Ignore this email - your password has not changed.</p>
    </div>`;
  return { text, html };
}

// Per-IP signup throttle: at most a handful of new accounts per IP per hour so
// a script can't mass-create accounts to flood storage or evade bans.
const SIGNUP_LIMIT = 5;
const SIGNUP_WINDOW_MS = 60 * 60000;
const signupAttempts = new Map(); // ip -> { first, count }
// Usernames whose account is mid-creation (password still hashing). Held only
// for the duration of one scrypt call so a racing signup cannot claim the name.
const pendingSignups = new Set();
// Same idea for recovery emails: two signups racing on one address would both
// pass the uniqueness check and the second would quietly take the address off
// the first, leaving an account whose reset codes go somewhere else.
const pendingEmails = new Set();
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

// Per-username and per-IP login throttle. Signup was already rate limited but
// login was not, and the socket token bucket still allows ~25 events/second -
// roughly 1,500 password guesses a minute per socket, with no cap on sockets.
// That is enough to brute-force a 4-character password, which is the minimum
// this app accepts.
//
// The two thresholds are deliberately very different. A per-account limit can
// be strict, because 8 wrong passwords for one username is already abnormal.
// A per-IP limit cannot: a large share of this app's users share one public
// address behind a university, office or mobile-carrier CGNAT, so a strict IP
// rule would let any one person's fumbled logins lock every other user on that
// network out of their account. The IP ceiling is therefore set high enough to
// be invisible to shared networks while still stopping one host from spraying
// thousands of guesses across many accounts.
const LOGIN_LIMIT_USER = 8;
const LOGIN_LIMIT_IP = 60;
const LOGIN_WINDOW_MS = 15 * 60000;
const LOGIN_LOCKOUT_MS = 15 * 60000;
const loginAttempts = new Map(); // "ip:<ip>" | "user:<name>" -> { first, count, until }

function loginLockedOut(ip, usernameLower) {
  const now = Date.now();
  for (const key of [`ip:${ip}`, `user:${usernameLower}`]) {
    const rec = loginAttempts.get(key);
    if (rec && rec.until && rec.until > now) return true;
  }
  return false;
}

function noteLoginFailure(ip, usernameLower) {
  const now = Date.now();
  for (const [key, limit] of [[`ip:${ip}`, LOGIN_LIMIT_IP], [`user:${usernameLower}`, LOGIN_LIMIT_USER]]) {
    let rec = loginAttempts.get(key);
    if (!rec || now - rec.first > LOGIN_WINDOW_MS) rec = { first: now, count: 0, until: 0 };
    rec.count += 1;
    if (rec.count >= limit) rec.until = now + LOGIN_LOCKOUT_MS;
    loginAttempts.set(key, rec);
  }
}

function noteLoginSuccess(ip, usernameLower) {
  loginAttempts.delete(`ip:${ip}`);
  loginAttempts.delete(`user:${usernameLower}`);
}

async function verifyAccount(username, password) {
  const account = accounts.get(username.toLowerCase());
  if (!account || !account.passwordHash) return null;
  const hash = await hashPassword(password, account.salt);
  // Compare in constant time. A plain !== short-circuits at the first differing
  // byte, so response latency leaks how much of the hash an attacker has
  // matched. Both sides are fixed-length hex here, so the lengths always agree.
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(account.passwordHash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
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

// Everything the ID token carries about the person, kept exactly as Google
// signed it. These are the fields covered by the scopes the user ticks in the
// Google consent screen ("openid email profile") and nothing more - if they
// decline a scope the claim is simply absent and stays null here. Stored so the
// owner dashboard can show a real profile (name, verified email, avatar,
// locale, workspace domain) instead of just "signed in with Google".
function googleProfileFrom(payload) {
  const str = (v, max = 200) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
  return {
    sub: str(payload.sub, 64),
    email: normalizeEmail(payload.email) || null,
    emailVerified: payload.email_verified === true,
    name: str(payload.name, 120),
    givenName: str(payload.given_name, 60),
    familyName: str(payload.family_name, 60),
    picture: str(payload.picture, 500),
    locale: str(payload.locale, 20),
    // Google Workspace domain, only present for managed accounts.
    hostedDomain: str(payload.hd, 120),
    issuer: str(payload.iss, 100),
    // When Google itself authenticated them, and when we last saw a token.
    authTime: typeof payload.iat === 'number' ? payload.iat * 1000 : null,
    linkedAt: Date.now(),
    lastSignInAt: Date.now(),
  };
}

// Verifies a Google ID token and finds-or-creates the account it belongs to.
async function findOrCreateGoogleAccount(idToken) {
  const ticket = await googleClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email_verified) {
    throw new Error('Could not verify Google account.');
  }

  const profile = googleProfileFrom(payload);
  const googleId = payload.sub;
  // Google already verified this address, so it doubles as the recovery email
  // and the account can be recovered even if the user never signs in with
  // Google again. Skipped if another account already claims the address.
  const googleEmail = normalizeEmail(payload.email);
  let username = googleAccounts.get(googleId);

  if (!username) {
    username = uniqueUsernameFromBase((payload.email || 'user').split('@')[0]);
    const nickname = (payload.name || username).slice(0, 24);
    accounts.set(username.toLowerCase(), {
      passwordHash: null,
      salt: null,
      nickname,
      googleId,
      email: googleEmail && !store.findUsernameByEmail(googleEmail) ? googleEmail : null,
      google: profile,
    });
    googleAccounts.set(googleId, username.toLowerCase());
    persistAccount(username.toLowerCase());
  } else {
    const existing = accounts.get(username);
    if (existing) {
      // Refresh the profile on every sign-in: the person may have changed their
      // Google name or avatar, and `linkedAt` must keep the original link date.
      existing.google = { ...profile, linkedAt: (existing.google && existing.google.linkedAt) || profile.linkedAt };
      if (!existing.email && googleEmail && !store.findUsernameByEmail(googleEmail)) {
        existing.email = googleEmail;
      }
      persistAccount(username);
    }
  }

  return { username, account: accounts.get(username.toLowerCase()), profile };
}

function getClientIp(socket) {
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  const ip = (forwarded ? forwarded.split(',')[0].trim() : socket.handshake.address) || '';
  return ip.replace('::ffff:', '');
}

function lookupGeo(ip) {
  const geo = geoip.lookup(ip);
  if (!geo) return { country: 'XX', countryName: 'Unknown', city: 'Unknown' };
  const code = geo.country || 'XX';
  return {
    country: code,
    // geoip-lite only returns the two-letter code. This used to be stored as
    // the country *name* verbatim, so the owner dashboard, the analytics
    // "top countries" table and every report/feedback alert email read "NP"
    // instead of "Nepal". Resolve it through the shared list, and keep the code
    // as the last resort for anything ISO has assigned since.
    countryName: COUNTRIES[code] || code || 'Unknown',
    city: geo.city || 'Unknown',
  };
}

function sanitizeAvatar(value) {
  if (typeof value !== 'string') return null;
  if (/^[mf][1-5]$/.test(value)) return value;
  if (value.slice(0, 2) === 'a:' && ANIMAL_IDS.has(value.slice(2))) return value;
  return null;
}

function broadcastOnlineCount() {
  io.emit('online-count', io.engine.clientsCount);
  broadcastVisitorCount();
  broadcastOnlinePeople();
}

// --- Visitors in the last 24 hours -----------------------------------------
// What the header lockup shows. It walks 24 hour buckets, so it is computed at
// most once a minute and reused: connects and disconnects can arrive in bursts
// and this number moves far too slowly to be worth recomputing per event.
let visitorCountCache = { at: 0, value: 0 };
const VISITOR_COUNT_TTL = 60000;

function visitorCount() {
  const now = Date.now();
  if (now - visitorCountCache.at < VISITOR_COUNT_TTL) return visitorCountCache.value;
  visitorCountCache = { at: now, value: store.visitorsLast24h(now) };
  return visitorCountCache.value;
}

let lastVisitorCountSent = -1;
function broadcastVisitorCount() {
  const count = visitorCount();
  if (count === lastVisitorCountSent) return;
  lastVisitorCountSent = count;
  io.emit('visitor-count', count);
}
// The count also moves while nobody connects or disconnects (a visit that
// never opens a socket, an hour bucket ageing out), so it is refreshed on its
// own tick rather than only on socket churn.
setInterval(broadcastVisitorCount, VISITOR_COUNT_TTL).unref();

// --- Who is online, for the home screen's "Online now" rail -----------------
// The rail needs more than a number: a page that says "412 online" and shows
// nothing else is asking to be taken on trust. What it lists is exactly what
// a match already reveals about someone the moment you connect - the random
// username they were given, their country, and the avatar and spirit animal
// they picked for strangers to see. No city, no clientId, nothing that
// identifies a person or lets one be singled out and called.
//
// Three rules it holds to:
//   1. Anyone who turned their status off in Settings is not in it. That
//      switch already means "do not show me as online" and this is the most
//      literal reading of it there is.
//   2. Anyone mid-call is not in it. They are not reachable, and who is
//      talking to whom right now is nobody else's business.
//   3. It is capped and it is a sample, not a directory: the cap is small
//      enough that the list can never be walked to enumerate the user base.
const ONLINE_PEOPLE_CAP = 24;

function onlinePeopleList() {
  const out = [];
  for (const [socketId, p] of profiles) {
    if (out.length >= ONLINE_PEOPLE_CAP) break;
    if (partners.has(socketId)) continue;              // mid-call
    if (statusHidden.get(p.clientId)) continue;        // "appear offline"
    out.push({
      username: p.username,
      countryCode: p.country,
      country: p.countryName,
      gender: p.gender || 'unspecified',
      avatar: p.avatar || null,
      animal: p.animal || null,
      waiting: waitingQueue.includes(socketId),
    });
  }
  return out;
}

// Coalesced: connects, disconnects, matches and hang-ups all move this list,
// and on a busy server that is a great many events per second for a rail that
// nobody is reading more than once a second.
// Every connect, disconnect, match and hang-up moves this list, and chasing
// each of those call sites is how one gets missed. Instead it is recomputed on
// a slow tick and sent only when it actually differs from what was last sent,
// so an idle server emits nothing at all and a busy one emits at most once a
// tick regardless of the churn underneath.
let lastOnlinePeopleJson = '';
function broadcastOnlinePeople() {
  const list = onlinePeopleList();
  const json = JSON.stringify(list);
  if (json === lastOnlinePeopleJson) return;
  lastOnlinePeopleJson = json;
  io.emit('online-people', list);
}
setInterval(broadcastOnlinePeople, 4000).unref();

// Push the current count straight to one freshly-connected socket so a late
// joiner always gets correct initial state immediately, independent of the
// broadcast (initial-state sync, not just incremental updates).
function sendOnlineCountTo(socket) {
  socket.emit('online-count', io.engine.clientsCount);
  socket.emit('visitor-count', visitorCount());
  socket.emit('online-people', onlinePeopleList());
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
  // Snapshot before anything below forgets who they were.
  const who = snapshotOf(clientIdB, clientIdA);
  if (!blocks.has(clientIdA)) blocks.set(clientIdA, new Set());
  blocks.get(clientIdA).add(clientIdB);
  if (!blockMeta.has(clientIdA)) blockMeta.set(clientIdA, new Map());
  blockMeta.get(clientIdA).set(clientIdB, { ...who, ts: Date.now() });
  // A friend request either way is dead the moment one of them blocks: leaving
  // it would keep the blocker's inbox showing someone they refused, and leave
  // the other side looking at a "Pending" that can never be answered.
  clearRequestPair(clientIdA, clientIdB);
  clearRequestPair(clientIdB, clientIdA);
  // Same for anything already sitting in either inbox: a blocked person's
  // unread messages, request or call-back ask must not linger as a badge.
  removeNotificationsWhere(clientIdA, (n) => notifSubject(n) === clientIdB);
  removeNotificationsWhere(clientIdB, (n) => notifSubject(n) === clientIdA);
  const pa = pendingCallBacks.get(clientIdA);
  if (pa) pa.delete(clientIdB);
  const pb = pendingCallBacks.get(clientIdB);
  if (pb) pb.delete(clientIdA);
  // And from each other's recent-people list: "message back" and "call back"
  // offering someone you just blocked is an invitation to undo the block.
  dropFromChatHistory(clientIdA, clientIdB);
  dropFromChatHistory(clientIdB, clientIdA);
  persistSocial();
}

// A conversation this long is one both people chose to stay in - long enough to
// separate a real chat from the rapid-fire skipping that fills the first minute
// of most sessions. It is the bar a referral has to clear to pay out, and the
// bar for counting a "real" conversation in analytics.
// Overridable so an end-to-end test does not have to hold a call open for a
// full minute; production never sets it.
const REAL_CONVERSATION_MS = Number(process.env.REAL_CONVERSATION_MS) || 60000;
// Days of Plus each side gets when an invited person has their first real
// conversation. Both sides on purpose: rewarding only the inviter makes the
// link feel like spam to the person receiving it.
const REFERRAL_REWARD_DAYS = 7;

// Pay out a referral once - and only once - for the person who was invited.
// Called at the end of their first real conversation, never when they merely
// open the link, so opening it in fifty tabs earns nothing.
function settleReferral(clientId) {
  if (!clientId) return;
  const settled = store.qualifyReferral(clientId);
  if (!settled) return;
  store.extendPremium(settled.owner, REFERRAL_REWARD_DAYS, { source: 'referral', lastEvent: 'referred a user' });
  store.noteReferralReward(settled.owner, REFERRAL_REWARD_DAYS);
  store.extendPremium(settled.referred, REFERRAL_REWARD_DAYS, { source: 'referral', lastEvent: 'joined via invite' });
  store.recordFeature('referral_qualified');
  // The inviter is usually not the person on the call that just ended, so tell
  // whichever of their sockets is connected rather than replying to this one.
  for (const [sid, profile] of profiles) {
    if (profile.clientId !== settled.owner) continue;
    const sock = io.sockets.sockets.get(sid);
    if (sock) sock.emit('referral-reward', { days: REFERRAL_REWARD_DAYS, ...store.referralStats(settled.owner) });
  }
  // Premium was only read at registration, so without this both sides stay on a
  // stale `premium: false` - the filters they were just given stay locked until
  // they happen to reload. Push the new state to every socket either of them
  // has open.
  emitPremiumStatus(settled.owner);
  emitPremiumStatus(settled.referred);
}

// Re-send premium state to every live socket belonging to a clientId. Used
// whenever a grant changes outside registration (a referral reward now; a
// Stripe webhook is the same shape of event, though that user is usually on the
// Stripe-hosted page rather than connected at the time).
function emitPremiumStatus(clientId) {
  for (const [sid, profile] of profiles) {
    if (profile.clientId !== clientId) continue;
    const sock = io.sockets.sockets.get(sid);
    if (!sock) continue;
    sock.emit('premium-status', {
      premium: isPremium(clientId),
      expiresAt: envPremiumClients.has(clientId) ? null : store.premiumExpiry(clientId),
      limits: FREE_LIMITS,
      checkout: billing.configured(),
      plans: billing.plans(),
    });
  }
}

// Close out a live pairing, recording how long it actually lasted.
//
// Duration was not tracked before, so "did anyone have a real conversation" was
// invisible: the dashboard counted matches, and a match that both sides skipped
// in two seconds counted the same as a twenty-minute call. It is also what
// makes a referral payable, so it has to be measured server-side - a client
// could otherwise just claim it.
// `opts.failed` marks a pairing that never became a working call, so the pair is
// held apart hard (see pairCooldowns) and the other side is told the truth: it
// was a connection that never came up, not a stranger who hung up on them.
function disconnectPartner(socketId, opts = {}) {
  const partnerId = partners.get(socketId);
  if (!partnerId) return null;
  partners.delete(socketId);
  partners.delete(partnerId);

  const profile = profiles.get(socketId);
  const partnerProfile = profiles.get(partnerId);
  const startedAt = (profile && profile.matchedAt) || (partnerProfile && partnerProfile.matchedAt) || 0;
  if (startedAt) {
    const ms = Date.now() - startedAt;
    store.recordFeature(ms >= REAL_CONVERSATION_MS ? 'conversation_real' : 'conversation_brief');
    if (ms >= REAL_CONVERSATION_MS) {
      if (profile) settleReferral(profile.clientId);
      if (partnerProfile) settleReferral(partnerProfile.clientId);
    }
  }
  if (profile) profile.matchedAt = 0;
  if (partnerProfile) partnerProfile.matchedAt = 0;

  if (profile && partnerProfile) {
    notePairParted(profile.clientId, partnerProfile.clientId, opts.failed);
  }

  const partnerSocket = io.sockets.sockets.get(partnerId);
  if (partnerSocket) {
    // "They hung up" and "their connection died" are different things to be
    // told: one is a decision about you, the other is a phone that went into a
    // tunnel. The name rides along so the other side can say who it was.
    partnerSocket.emit('partner-left', {
      reason: opts.failed ? 'failed' : (opts.dropped ? 'disconnected' : 'left'),
      username: profile ? profile.username : '',
    });
  }
  return partnerId;
}

// The 12 spirit animals a user can pick (public/animals.js holds the artwork).
// Validated as an allowlist rather than a length check: the id is echoed to the
// other user's browser and used to build a DOM id, so only these values ever
// leave the server.
const ANIMAL_IDS = new Set([
  'lion', 'tiger', 'wolf', 'fox', 'cat', 'dog',
  'bear', 'panda', 'rabbit', 'owl', 'penguin', 'dolphin',
  'elephant', 'koala', 'monkey', 'frog', 'deer', 'turtle', 'horse', 'eagle',
]);
function sanitizeAnimal(value) {
  return typeof value === 'string' && ANIMAL_IDS.has(value) ? value : null;
}

// Deliberately excludes gender (and avatar, which is gendered): nothing shown
// during a call should reveal the stranger's gender - it should only become
// apparent through conversation. The spirit animal is safe to include: it is
// self-chosen, says nothing about who you are, and exists purely to give two
// strangers something to open with.
function publicProfile(p) {
  return {
    clientId: p.clientId,
    username: p.username,
    country: p.countryName,
    countryCode: p.country,
    city: p.city,
    interests: p.interests,
    animal: p.animal || null,
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
  // random fallback below - dropping it would put a mic-less chatter in a call.
  if ((seeker.mode || 'talk') !== (candidate.mode || 'talk')) return false;

  // A pair whose last call never connected is a hard gate, like a block: there
  // is no filter to relax that would make that media path work, so handing them
  // back to each other only costs both of them another failed connect.
  if (pairOnCooldown(seeker.clientId, candidate.clientId, false)) return false;

  // After a long wait either side falls back to "match me with anyone random":
  // every preference filter is dropped, only blocks still apply.
  if (seeker.randomFallbackActive || candidate.randomFallbackActive) return true;

  // Just parted voluntarily - give them someone new first. Soft, so the random
  // fallback above can still reunite them rather than leave anyone waiting on a
  // near-empty site.
  if (pairOnCooldown(seeker.clientId, candidate.clientId, true)) return false;

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

// Drop queue entries whose socket is gone or whose profile was cleared. These
// used to be skipped on every scan but never removed, so a queue could fill up
// with corpses that made the waiting list look busy while nobody was matchable.
function pruneQueue() {
  for (let i = waitingQueue.length - 1; i >= 0; i--) {
    const id = waitingQueue[i];
    if (!profiles.get(id) || !io.sockets.sockets.get(id)) {
      waitingQueue.splice(i, 1);
      clearWaitFallbackTimer(id);
    }
  }
}

function findBestMatch(socketId) {
  const seeker = profiles.get(socketId);
  if (!seeker) return -1;
  pruneQueue();

  // Prioritize reconnecting with a recent match if both hearted each other last time.
  for (let i = 0; i < waitingQueue.length; i++) {
    const candidateId = waitingQueue[i];
    const candidate = profiles.get(candidateId);
    if (!candidate || !io.sockets.sockets.get(candidateId)) continue;
    if (isBlockedPair(seeker.clientId, candidate.clientId)) continue;
    // A mutual heart may override the preference filters, but never the two
    // hard gates. Mode is one of them: this path used to skip it entirely, so a
    // pair who hearted each other on a voice call and later queued for text
    // chat (or the reverse) could be matched across pools - dropping a mic-less
    // chatter into a call, which is precisely what mutuallyCompatible() calls
    // out as something that must not happen. Self-matching (the same browser in
    // two tabs) is the other.
    if (candidate.clientId === seeker.clientId) continue;
    if ((seeker.mode || 'talk') !== (candidate.mode || 'talk')) continue;
    // A mutual heart cannot fix a media path that does not exist either.
    if (pairOnCooldown(seeker.clientId, candidate.clientId, false)) continue;
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

    // Stamped on both sides so disconnectPartner can measure how long the
    // conversation actually lasted, whichever side ends it.
    seekerProfile.matchedAt = Date.now();
    partnerProfile.matchedAt = seekerProfile.matchedAt;

    const mode = seekerProfile.mode || 'talk';
    store.recordFeature(mode === 'chat' ? 'chat_match' : 'match');
    partnerSocket.emit('matched', { initiator: true, partner: publicProfile(seekerProfile), rematched, mode });
    seekerSocket.emit('matched', { initiator: false, partner: publicProfile(partnerProfile), rematched, mode });

    // Remember each other so either side can message back, call back, add or
    // report later. This used to happen for text matches only, which left every
    // voice-call partner unknown to the server: calling one back from the call
    // history, messaging them, or reporting them from their profile was refused.
    rememberPairing(seekerSocket, seekerProfile, partnerSocket, partnerProfile);
  } else {
    waitingQueue.push(socketId);
    const seekerProfile = profiles.get(socketId);
    if (seekerProfile) seekerProfile.queuedAt = Date.now();
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

// Matching used to be driven purely by two events: somebody new arriving, and a
// per-socket fallback timer firing. Miss both - a timer lost because the socket
// re-entered the queue by another path, two waiters queued a moment apart who
// only became compatible once one of them hit the fallback - and a pair could
// sit in the same short queue indefinitely while the site showed people online.
// This pass costs nothing on a queue of a few dozen and makes the queue
// self-healing: prune the dead, apply any overdue fallback, and re-run matching
// for everyone still waiting.
const QUEUE_SWEEP_MS = 3000;
function sweepQueue() {
  pruneQueue();
  for (const socketId of [...waitingQueue]) {
    // Matched by an earlier iteration of this same pass.
    if (!waitingQueue.includes(socketId)) continue;
    const p = profiles.get(socketId);
    if (!p) continue;
    if (!p.randomFallbackActive && p.queuedAt && Date.now() - p.queuedAt >= RANDOM_FALLBACK_MS) {
      clearWaitFallbackTimer(socketId);
      p.randomFallbackActive = true;
      const sock = io.sockets.sockets.get(socketId);
      if (sock) sock.emit('random-fallback');
    }
    if (findBestMatch(socketId) !== -1) tryMatch(socketId);
  }
}
setInterval(sweepQueue, QUEUE_SWEEP_MS).unref?.();

// Best guess at who the seeker will get, so the client can show a live
// "Connecting to someone in Japan…" style message before the match completes.
function predictedMatch(socketId) {
  const seeker = profiles.get(socketId);
  if (!seeker) return null;
  const candidates = [];
  for (const [sid, p] of profiles) {
    if (sid === socketId || p.clientId === seeker.clientId) continue;
    if (isBlockedPair(seeker.clientId, p.clientId)) continue;
    if (pairOnCooldown(seeker.clientId, p.clientId, false)) continue;
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
  socket.on('error', () => { /* rate-limited or malformed packet - ignore */ });

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

  // Age-assurance gate for account, friends and premium features (fix list
  // 3.1). Answers { ok: true } while the ageAssurance flag is off.
  const ageGate = (feature) => {
    const p = profiles.get(socket.id);
    return ageAssurance.check(feature, { clientId: p && p.clientId, country: p && p.country });
  };

  socket.on('signup', async ({ username, password, nickname, email } = {}) => {
    const gate = ageGate('account');
    if (!gate.ok) return socket.emit('signup-result', { ok: false, error: gate.message, ageCheck: gate.reason });
    if (typeof username !== 'string' || typeof password !== 'string'
      || !username || !password || username.length < 3 || password.length < 4) {
      return socket.emit('signup-result', { ok: false, error: 'Username/password too short (min 3/4 chars).' });
    }
    // The recovery email is optional, but if something was typed it has to be
    // a usable address - silently dropping a typo would leave the account
    // unrecoverable exactly when it matters.
    const signupEmail = normalizeEmail(email);
    if (typeof email === 'string' && email.trim() && !signupEmail) {
      return socket.emit('signup-result', { ok: false, error: 'That email address does not look valid.' });
    }
    if (signupEmail && (store.findUsernameByEmail(signupEmail) || pendingEmails.has(signupEmail))) {
      return socket.emit('signup-result', { ok: false, error: 'That email is already used by another account.' });
    }
    // Nickname is optional - creating an account is just username + password,
    // and the display name defaults to the username (changeable later).
    nickname = (typeof nickname === 'string' && nickname.trim()) ? nickname.trim() : username;
    if (!/^[A-Za-z0-9_.-]{3,24}$/.test(username)) {
      return socket.emit('signup-result', { ok: false, error: 'Username may only contain letters, numbers, dot, dash or underscore (3-24 chars).' });
    }
    if (signupThrottled(ip)) {
      return socket.emit('signup-result', { ok: false, error: 'Too many accounts created from this network. Please try again later.' });
    }
    if (accounts.has(username.toLowerCase()) || pendingSignups.has(username.toLowerCase())) {
      return socket.emit('signup-result', { ok: false, error: 'That username is already taken.' });
    }
    noteSignup(ip);
    // Hashing yields the event loop, so two racing signups for the same name
    // would both pass the check above and the second would overwrite the first.
    // Reserve the name synchronously, before the first await.
    pendingSignups.add(username.toLowerCase());
    if (signupEmail) pendingEmails.add(signupEmail);
    try {
      await createAccount(username, password, nickname.slice(0, 24), signupEmail);
    } finally {
      pendingSignups.delete(username.toLowerCase());
      if (signupEmail) pendingEmails.delete(signupEmail);
    }
    // The socket can go away while scrypt runs on the thread pool; emitting to a
    // dead socket is harmless but persisting a session for it is pointless work.
    if (!io.sockets.sockets.has(socket.id)) return;
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
    socket.emit('signup-result', {
      ok: true,
      username,
      nickname: nickname.slice(0, 24),
      email: signupEmail || '',
      // The brand-new account adopts the profile this browser has been using,
      // so the friends made before signing up stay put.
      ...linkAccountProfile(username.toLowerCase(), socket.id),
      // Durable session token: the browser stores it and stays signed in
      // across page reloads, server restarts and deploys.
      sessionToken: store.createAuthSession(username.toLowerCase()),
    });
  });

  socket.on('login', async ({ username, password } = {}) => {
    if (typeof username !== 'string') username = '';
    if (typeof password !== 'string') password = '';
    const usernameLower = username.toLowerCase();
    if (loginLockedOut(ip, usernameLower)) {
      return socket.emit('login-result', { ok: false, error: 'Too many failed attempts. Please try again in 15 minutes.' });
    }
    const account = await verifyAccount(username, password);
    if (!account) {
      noteLoginFailure(ip, usernameLower);
      return socket.emit('login-result', { ok: false, error: 'Invalid username or password.' });
    }
    noteLoginSuccess(ip, usernameLower);
    if (!io.sockets.sockets.has(socket.id)) return;
    socketAuth.set(socket.id, (username || '').toLowerCase());
    store.recordFeature('login');
    store.upsertAccount((username || '').toLowerCase(), {
      username, nickname: account.nickname, country: geo.countryName, city: geo.city, ip, lastSeen: Date.now(),
    });
    socket.emit('login-result', {
      ok: true,
      username,
      nickname: account.nickname,
      email: account.email || '',
      sessionToken: store.createAuthSession((username || '').toLowerCase()),
      // Hands this device the account's profile, so a sign-in on a new phone
      // arrives with the same friends and history as the old one.
      ...linkAccountProfile((username || '').toLowerCase(), socket.id),
    });
  });

  // Silent re-login with the durable session token the browser saved. Runs on
  // every page load / reconnect so an account is never "lost" to a reload,
  // server restart or deploy.
  socket.on('resume-session', ({ token } = {}) => {
    const usernameLower = store.getAuthSessionUser(token);
    const account = usernameLower ? accounts.get(usernameLower) : null;
    if (!account) {
      return socket.emit('resume-session-result', { ok: false });
    }
    socketAuth.set(socket.id, usernameLower);
    store.upsertAccount(usernameLower, {
      nickname: account.nickname, country: geo.countryName, city: geo.city, ip, lastSeen: Date.now(),
    });
    socket.emit('resume-session-result', {
      ok: true,
      username: usernameLower,
      nickname: account.nickname,
      email: account.email || '',
      ...linkAccountProfile(usernameLower, socket.id),
    });
  });

  socket.on('logout', ({ token } = {}) => {
    socketAuth.delete(socket.id);
    // Kill the durable session too, so the token in localStorage (or a stolen
    // copy of it) can't silently sign back in.
    store.deleteAuthSession(token);
  });

  socket.on('google-auth', async ({ credential } = {}) => {
    const gate = ageGate('account');
    if (!gate.ok) return socket.emit('google-auth-result', { ok: false, error: gate.message, ageCheck: gate.reason });
    if (!GOOGLE_CLIENT_ID) {
      return socket.emit('google-auth-result', { ok: false, error: 'Google Sign-In is not configured on this server.' });
    }
    if (!credential || typeof credential !== 'string') {
      return socket.emit('google-auth-result', { ok: false, error: 'Missing Google credential.' });
    }
    try {
      const { username, account, profile } = await findOrCreateGoogleAccount(credential);
      socketAuth.set(socket.id, username.toLowerCase());
      store.recordFeature('google_signin');
      store.upsertAccount(username.toLowerCase(), {
        username, nickname: account.nickname, method: 'google', country: geo.countryName, city: geo.city, ip, lastSeen: Date.now(),
        // The consented profile, mirrored into the analytics registry so the
        // dashboard's accounts table has it without a second lookup.
        email: profile.email || account.email || null,
        emailVerified: profile.emailVerified,
        fullName: profile.name,
        givenName: profile.givenName,
        familyName: profile.familyName,
        picture: profile.picture,
        locale: profile.locale,
        hostedDomain: profile.hostedDomain,
        googleId: profile.sub,
      });
      socket.emit('google-auth-result', {
        ok: true,
        username,
        nickname: account.nickname,
        email: account.email || '',
        sessionToken: store.createAuthSession(username.toLowerCase()),
        ...linkAccountProfile(username.toLowerCase(), socket.id),
      });
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
    if (profile) {
      profile.username = account.nickname;
      refreshFriendSnapshots(profile.clientId, profile);
      for (const [fid] of friends.get(profile.clientId) || new Map()) {
        const friendSocket = getSocketByClientId(fid);
        if (friendSocket) syncClientState(friendSocket, fid);
      }
    }
    socket.emit('update-nickname-result', { ok: true, nickname: account.nickname });
  });

  socket.on('change-password', async ({ currentPassword, newPassword } = {}) => {
    const authedUsername = socketAuth.get(socket.id);
    if (!authedUsername) return socket.emit('change-password-result', { ok: false, error: 'Not logged in.' });
    if (typeof currentPassword !== 'string') currentPassword = '';
    // Guessing the current password is a login by another name, so it is bound
    // by the same lockout - otherwise a hijacked session becomes an unmetered
    // oracle for the account's password.
    if (loginLockedOut(ip, authedUsername)) {
      return socket.emit('change-password-result', { ok: false, error: 'Too many failed attempts. Please try again in 15 minutes.' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 4) {
      return socket.emit('change-password-result', { ok: false, error: 'New password must be at least 4 characters.' });
    }
    if (!(await verifyAccount(authedUsername, currentPassword))) {
      noteLoginFailure(ip, authedUsername);
      return socket.emit('change-password-result', { ok: false, error: 'Current password is incorrect.' });
    }
    noteLoginSuccess(ip, authedUsername);
    const account = accounts.get(authedUsername);
    if (!account) return socket.emit('change-password-result', { ok: false, error: 'Not logged in.' });
    const salt = crypto.randomBytes(16).toString('hex');
    account.passwordHash = await hashPassword(newPassword, salt);
    account.salt = salt;
    persistAccount(authedUsername);
    // A password change signs out every other device; this one gets a fresh
    // durable token so it stays logged in.
    store.deleteAuthSessionsForUser(authedUsername, null);
    socket.emit('change-password-result', { ok: true, sessionToken: store.createAuthSession(authedUsername) });
  });

  // Set or change the address password-reset codes are sent to. Changing it is
  // as good as owning the account, so an account that has a password must
  // prove it here; an account created through Google has none to prove.
  socket.on('update-recovery-email', async ({ email, currentPassword } = {}) => {
    const authedUsername = socketAuth.get(socket.id);
    if (!authedUsername) return socket.emit('update-recovery-email-result', { ok: false, error: 'Not logged in.' });
    const account = accounts.get(authedUsername);
    if (!account) return socket.emit('update-recovery-email-result', { ok: false, error: 'Not logged in.' });

    const next = normalizeEmail(email);
    if (!next) return socket.emit('update-recovery-email-result', { ok: false, error: 'That email address does not look valid.' });

    const owner = store.findUsernameByEmail(next);
    if (owner && owner !== authedUsername) {
      return socket.emit('update-recovery-email-result', { ok: false, error: 'That email is already used by another account.' });
    }

    if (account.passwordHash) {
      if (loginLockedOut(ip, authedUsername)) {
        return socket.emit('update-recovery-email-result', { ok: false, error: 'Too many failed attempts. Please try again in 15 minutes.' });
      }
      if (!(await verifyAccount(authedUsername, typeof currentPassword === 'string' ? currentPassword : ''))) {
        noteLoginFailure(ip, authedUsername);
        return socket.emit('update-recovery-email-result', { ok: false, error: 'Current password is incorrect.' });
      }
      noteLoginSuccess(ip, authedUsername);
    }

    const live = accounts.get(authedUsername);
    if (!live) return socket.emit('update-recovery-email-result', { ok: false, error: 'Not logged in.' });
    // Re-check after the password hash: another account could have claimed the
    // address while scrypt was running.
    const ownerNow = store.findUsernameByEmail(next);
    if (ownerNow && ownerNow !== authedUsername) {
      return socket.emit('update-recovery-email-result', { ok: false, error: 'That email is already used by another account.' });
    }
    live.email = next;
    persistAccount(authedUsername);
    socket.emit('update-recovery-email-result', { ok: true, email: next });
  });

  // Step 1 of "forgot password": email in, six-digit code out.
  //
  // The reply is deliberately the same whether or not the address belongs to
  // an account. Saying "no account with that email" would turn this into a
  // free membership oracle for any address someone cares to type, and this is
  // an anonymous chat product where that leak is the whole privacy promise.
  socket.on('forgot-password', async ({ email } = {}) => {
    const address = normalizeEmail(email);
    const generic = {
      ok: true,
      message: 'If that email is on an account, a 6-digit code is on its way. It expires in 10 minutes.',
    };
    if (!address) {
      return socket.emit('forgot-password-result', { ok: false, error: 'Please enter a valid email address.' });
    }
    // Without SMTP credentials there is no way to deliver a code. In
    // development that would make the whole flow untestable, so the code goes
    // to the server console instead - never in production, where NODE_ENV is
    // set by both the Dockerfile and fly.toml.
    if (!mail.configured() && process.env.NODE_ENV === 'production') {
      return socket.emit('forgot-password-result', {
        ok: false,
        error: 'Password reset by email is not available on this server right now.',
      });
    }
    if (resetThrottled(ip, address)) {
      return socket.emit('forgot-password-result', {
        ok: false,
        error: 'Too many reset requests. Please wait a while before trying again.',
      });
    }
    noteResetRequest(ip, address);

    const usernameLower = store.findUsernameByEmail(address);
    const account = usernameLower ? accounts.get(usernameLower) : null;
    if (!account) return socket.emit('forgot-password-result', generic);

    try {
      const code = generateOtp();
      await store.startPasswordReset({
        username: usernameLower,
        email: address,
        codeHash: hashToken(code),
        ttlMs: RESET_CODE_TTL_MS,
      });
      const { text, html } = otpEmail(account.nickname || usernameLower, code);
      let sent = false;
      if (mail.configured()) {
        sent = await mail.sendMail({
          to: address,
          subject: `${code} is your TalkLive password reset code`,
          text,
          html,
        });
      } else {
        console.log(`[forgot-password] SMTP not configured; reset code for ${address} is ${code}`);
        sent = true;
      }
      if (!sent) {
        return socket.emit('forgot-password-result', {
          ok: false,
          error: 'We could not send the email just now. Please try again in a few minutes.',
        });
      }
      store.recordFeature('password_reset_request');
    } catch (err) {
      console.error('[forgot-password] failed:', err.message);
      return socket.emit('forgot-password-result', {
        ok: false,
        error: 'Something went wrong starting the reset. Please try again.',
      });
    }
    socket.emit('forgot-password-result', generic);
  });

  // Step 2: check the code and hand back a short-lived token for step 3, so the
  // new password is not sent in the same message as the code.
  socket.on('verify-reset-code', async ({ email, code } = {}) => {
    const address = normalizeEmail(email);
    const digits = typeof code === 'string' ? code.replace(/\D/g, '') : '';
    const invalid = { ok: false, error: 'That code is not valid or has expired. Request a new one.' };
    if (!address || digits.length !== 6) {
      return socket.emit('verify-reset-code-result', { ok: false, error: 'Enter the 6-digit code from your email.' });
    }
    try {
      const pending = await store.findPasswordReset(address);
      if (!pending || pending.codeHash === 'consumed') {
        return socket.emit('verify-reset-code-result', invalid);
      }
      const a = Buffer.from(hashToken(digits), 'hex');
      const b = Buffer.from(pending.codeHash, 'hex');
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        const attempts = await store.notePasswordResetFailure(pending.id);
        // A six-digit code is only 20 bits; without a hard attempt cap it is
        // guessable inside the ten minutes it stays alive.
        if (attempts >= RESET_MAX_ATTEMPTS) {
          await store.deletePasswordReset(pending.id);
          return socket.emit('verify-reset-code-result', {
            ok: false,
            error: 'Too many wrong codes. Please request a new one.',
          });
        }
        return socket.emit('verify-reset-code-result', {
          ok: false,
          error: `Incorrect code. ${RESET_MAX_ATTEMPTS - attempts} attempt(s) left.`,
        });
      }
      const resetToken = crypto.randomBytes(32).toString('hex');
      await store.markPasswordResetVerified(pending.id, hashToken(resetToken), RESET_TOKEN_TTL_MS);
      socket.emit('verify-reset-code-result', { ok: true, resetToken });
    } catch (err) {
      console.error('[verify-reset-code] failed:', err.message);
      socket.emit('verify-reset-code-result', { ok: false, error: 'Something went wrong. Please try again.' });
    }
  });

  // Step 3: spend the token, set the new password, and sign this device in.
  socket.on('reset-password', async ({ resetToken, newPassword } = {}) => {
    if (typeof newPassword !== 'string' || newPassword.length < 4) {
      return socket.emit('reset-password-result', { ok: false, error: 'New password must be at least 4 characters.' });
    }
    if (typeof resetToken !== 'string' || !/^[a-f0-9]{64}$/.test(resetToken)) {
      return socket.emit('reset-password-result', { ok: false, error: 'This reset has expired. Please start again.' });
    }
    try {
      const claim = await store.consumePasswordResetToken(hashToken(resetToken));
      if (!claim) {
        return socket.emit('reset-password-result', { ok: false, error: 'This reset has expired. Please start again.' });
      }
      const usernameLower = claim.username;
      const account = accounts.get(usernameLower);
      if (!account) {
        return socket.emit('reset-password-result', { ok: false, error: 'That account no longer exists.' });
      }
      const salt = crypto.randomBytes(16).toString('hex');
      account.passwordHash = await hashPassword(newPassword, salt);
      account.salt = salt;
      persistAccount(usernameLower);
      // Whoever knew the old password (and any stale session anywhere) loses
      // access: a reset only means anything if it ends every other session.
      store.deleteAuthSessionsForUser(usernameLower, null);
      // The failed-login lockout would otherwise keep the real owner out with
      // the password they just chose.
      noteLoginSuccess(ip, usernameLower);
      store.recordFeature('password_reset_complete');
      if (!io.sockets.sockets.has(socket.id)) return;
      socketAuth.set(socket.id, usernameLower);
      store.upsertAccount(usernameLower, {
        nickname: account.nickname, country: geo.countryName, city: geo.city, ip, lastSeen: Date.now(),
      });
      socket.emit('reset-password-result', {
        ok: true,
        username: usernameLower,
        nickname: account.nickname,
        email: account.email || '',
        sessionToken: store.createAuthSession(usernameLower),
      });
    } catch (err) {
      console.error('[reset-password] failed:', err.message);
      socket.emit('reset-password-result', { ok: false, error: 'Something went wrong. Please try again.' });
    }
  });

  socket.on('register', async (data = {}) => {
    // Only accept well-formed client IDs: they are echoed back to other users'
    // browsers inside HTML attributes (friends list, notifications), so an
    // arbitrary string here would be a stored-XSS vector.
    const rawClientId = typeof data.clientId === 'string' ? data.clientId : '';
    const clientId = /^[A-Za-z0-9_-]{8,64}$/.test(rawClientId) ? rawClientId : socket.id;
    const identityToken = typeof data.identityToken === 'string' ? data.identityToken : '';
    const tokenOk = !!identityToken && validIdentityToken(clientId, identityToken);
    // A wrong or missing token is only a hijack attempt when the identity is
    // *currently in use* by a live socket. Otherwise it is the ordinary case of
    // a browser whose token predates a secret change or was never stored, and
    // refusing it is far more destructive than the attack it guards against:
    // both clients respond to a refusal by throwing away their clientId, which
    // orphans that person's friends, friend chats, history and premium. So
    // refuse only a contested identity, and re-issue a token otherwise.
    if (!tokenOk && clientSockets.has(clientId) && io.sockets.sockets.get(clientSockets.get(clientId))) {
      return socket.emit('register-result', { ok: false, error: 'Client identity is already active.' });
    }
    // Captured before the identity takeover below, which clears the old entry:
    // otherwise every reconnect looked like a fresh login and re-fired the
    // "James is online" notification to all of this user's friends.
    const wasOffline = !clientSockets.has(clientId);
    const existingSocketId = clientSockets.get(clientId);
    if (existingSocketId && existingSocketId !== socket.id
      && io.sockets.sockets.has(existingSocketId)) {
      // A dropped socket is not noticed until the ping timeout expires - up to
      // pingInterval + pingTimeout (85s) later - so a phone that backgrounded
      // for a moment, switched networks, or rode out a deploy reconnects while
      // the server still believes the dead socket is live. Refusing that
      // registration was the single biggest cause of "searching forever":
      // profiles.set() below never ran, so the new socket had no profile, and
      // every 'find-partner' it sent afterwards silently no-opped. The user sat
      // in the search UI indefinitely while the online count still counted them.
      //
      // Anyone presenting a valid signed identity token is the same user, so
      // hand the identity to the live socket and drop the stale one instead of
      // turning the newcomer away.
      //
      // But "the same user" covers two very different situations, and taking
      // the identity in the wrong one is what made buttons look dead: a phone
      // reconnecting after its old socket died (take over - the old socket is
      // never coming back), and the same person with the app open in a second
      // tab (do not - kicking the other tab just makes it reconnect and kick
      // this one straight back, and whichever tab is losing that exchange has a
      // socket that keeps dropping, so everything it sends is silently buffered
      // and every button in it does nothing).
      //
      // Asking the incumbent to answer a ping tells the two apart exactly: a
      // dead socket cannot reply. An older client that does not know the ping
      // also cannot, so it is treated as dead - which is simply the behaviour
      // this had before.
      const incumbent = io.sockets.sockets.get(existingSocketId);
      const incumbentAlive = (tokenOk && incumbent && !data.takeover)
        ? await new Promise((resolve) => {
          let settled = false;
          const done = (alive) => { if (!settled) { settled = true; resolve(alive); } };
          try {
            incumbent.timeout(2000).emit('identity-ping', (err) => done(!err));
          } catch (_) { done(false); }
          setTimeout(() => done(false), 2500);
        })
        : false;

      if (!tokenOk || incumbentAlive) {
        // `reason` lets the client say something true instead of retrying into
        // a loop: the foreground tab re-registers with takeover, the background
        // one waits until it is looked at again.
        return socket.emit('register-result', {
          ok: false,
          error: 'Client identity is already active.',
          reason: incumbentAlive ? 'active-elsewhere' : 'contested',
        });
      }

      const stale = io.sockets.sockets.get(existingSocketId);
      if (stale) {
        disconnectPartner(existingSocketId);
        clearFromQueue(existingSocketId);
        clearWaitFallbackTimer(existingSocketId);
        profiles.delete(existingSocketId);
        stale.disconnect(true);
      }
      clientSockets.delete(clientId);
    }
    const issuedIdentityToken = signIdentity(clientId);
    identityTokens.set(clientId, issuedIdentityToken);
    identityTokenSeen.set(clientId, Date.now());
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
      // `m1`-`f5` are the gendered busts; `a:<animal>` is a spirit-animal
      // avatar, validated against the same list the picker is built from so a
      // client cannot store an animal that does not exist.
      avatar: sanitizeAvatar(data.avatar),
      animal: sanitizeAnimal(data.animal),
      // Which page this socket lives on. /chat is text only, and call-backs
      // must not ring or force-pair it (see canTakeCall).
      surface: data.surface === 'chat' ? 'chat' : 'call',
    });
    clientSockets.set(clientId, socket.id);
    if (typeof data.hideStatus === 'boolean') statusHidden.set(clientId, data.hideStatus);
    if (typeof data.acceptCalls === 'boolean') callsOpen.set(clientId, data.acceptCalls);

    socket.emit('profile', {
      username: profiles.get(socket.id).username,
      country: geo.countryName,
      countryCode: geo.country,
      city: geo.city,
    });

    socket.emit('premium-status', {
      premium,
      expiresAt: envPremiumClients.has(clientId) ? null : store.premiumExpiry(clientId),
      limits: FREE_LIMITS,
      checkout: billing.configured(),
      plans: billing.plans(),
    });
    socket.emit('identity-token', { clientId, token: issuedIdentityToken });

    // Referrals. The code travels in ?ref= on the landing URL and is held in the
    // browser until registration, because the person clicking the link has no
    // clientId until then. Claiming only records the attribution - the reward is
    // paid later, once they have had a real conversation (see settleReferral).
    const inviteCode = typeof data.referralCode === 'string' ? data.referralCode.slice(0, 16) : '';
    if (inviteCode) {
      const owner = store.claimReferral(clientId, inviteCode);
      if (owner) store.recordFeature('referral_claimed');
    }
    socket.emit('referral-status', {
      ...store.referralStats(clientId),
      rewardDays: REFERRAL_REWARD_DAYS,
    });
    // Positive acknowledgement, not just the failure case: a client that was
    // mid-search when its socket dropped needs to know the new socket carries a
    // profile again before it re-enters the queue.
    socket.emit('register-result', { ok: true });
    refreshFriendSnapshots(clientId, profiles.get(socket.id));
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
      }
      // Flip the dot on for friends and for anyone who has them in their
      // recent matches, so "message back" shows them online.
      resyncWatchers(clientId);
    }
  });

  // Codes are minted on demand rather than for every visitor: the overwhelming
  // majority of people never open the share panel, and a code per anonymous
  // visit would grow the store without ever being used.
  socket.on('get-referral-link', () => {
    const profile = profiles.get(socket.id);
    if (!profile) return;
    const code = store.referralCodeFor(profile.clientId);
    if (!code) return;
    socket.emit('referral-status', {
      ...store.referralStats(profile.clientId),
      rewardDays: REFERRAL_REWARD_DAYS,
    });
  });

  // Give the just-connected client its initial count right away, then tell
  // everyone (including it) the new total.
  sendOnlineCountTo(socket);
  broadcastOnlineCount();

  socket.on('find-partner', (opts = {}) => {
    const profile = profiles.get(socket.id);
    if (!profile) {
      // No profile means registration never completed on this socket (it raced
      // ahead of 'register', or an identity clash refused it). Dropping the
      // search on the floor left the user watching the search animation with
      // nothing happening on the server. Tell them to register again so the
      // client can retry instead of hanging.
      socket.emit('needs-register');
      return;
    }
    // Banned users can never connect to anyone until the ban is lifted.
    const ban = store.findActiveBan(profile.clientId, ip);
    if (ban) {
      socket.emit('banned', { until: ban.expiresAt, reason: ban.reason });
      socket.disconnect(true);
      return;
    }
    let mode = (opts && opts.mode === 'chat') ? 'chat' : 'talk';
    // Restricted profile (fix list 3.1, age-band signal): text-only. Only ever
    // set when the ageBandSignal flag is on and a signal reported an under-18
    // band, so this is dead code until then.
    const restrictions = ageAssurance.restrictionsFor(profile.clientId);
    if (restrictions && !restrictions.voice && mode === 'talk') {
      socket.emit('age-restricted', { feature: 'voice' });
      mode = 'chat';
    }

    // The client re-sends its search when one goes unanswered (a socket that
    // reconnected, a registration that had not landed). If this socket is
    // already queued in the same pool, that request is a duplicate: re-running
    // tryMatch() for it would pull it out of the queue, push it to the back and
    // reset the random-match fallback clock, so a client re-asserting a healthy
    // search would keep starving itself. Just re-send the waiting state.
    if (waitingQueue.includes(socket.id) && (profile.mode || 'talk') === mode) {
      socket.emit('waiting', {
        estimatedSeconds: estimatedWaitSeconds(),
        predicted: predictedMatch(socket.id),
      });
      return;
    }

    // Which pool this search joins: 'talk' (voice call) or 'chat' (text only).
    // Sticky on the profile so skip/auto-next re-searches stay in the same pool.
    profile.mode = mode;
    // The spirit animal rides along with every search, so picking a different
    // one mid-session applies to the very next match without a re-register
    // round trip. `null` (nothing picked) is a valid value, hence the
    // property check rather than a truthiness one.
    if (Object.prototype.hasOwnProperty.call(opts, 'animal')) {
      const animal = sanitizeAnimal(opts.animal);
      if (animal !== profile.animal) {
        profile.animal = animal;
        if (animal) store.recordFeature('animal_picked');
      }
    }
    store.recordFeature(profile.mode === 'chat' ? 'chat_search' : 'search');
    // A fresh, explicit search starts with the full set of filters again.
    profile.randomFallbackActive = false;
    tryMatch(socket.id);
  });

  socket.on('skip', (opts = {}) => {
    // The client emits 'skip' both for a deliberate "next stranger" tap and for
    // an involuntary advance - a call whose media never arrived, a reconnect
    // that ran out of time. Only the latter says anything about the pair, and
    // it says a lot: keep the two of them apart instead of looping them
    // through the same dead connection.
    const failed = !!(opts && opts.failed);
    disconnectPartner(socket.id, { failed });
    const profile = profiles.get(socket.id);
    if (profile) profile.randomFallbackActive = false;
    // Everyone skips straight to the next stranger. The free tier used to be
    // held back ~5s here, which cost far more than it earned: the client also
    // emits 'skip' for involuntary advances (a call whose media never arrived,
    // a failed reconnect), so the people the delay punished hardest were the
    // ones whose calls were already failing - a 20s watchdog and then another
    // 5s of dead air before they could even try again.
    tryMatch(socket.id);
  });

  // Personal online-status visibility: hides this user's status only from
  // their added friends. Never affects the global online-user count.
  socket.on('set-status-visibility', ({ hidden } = {}) => {
    const profile = profiles.get(socket.id);
    if (!profile) return;
    statusHidden.set(profile.clientId, !!hidden);
    // Re-sync everyone who sees this user's dot - friends and recent matches -
    // so going invisible (or coming back) shows up live.
    resyncWatchers(profile.clientId);
  });

  // "Receive incoming calls": when off, friends can still message but their
  // call-backs are refused instead of ringing this device.
  socket.on('set-call-availability', ({ accept } = {}) => {
    const profile = profiles.get(socket.id);
    if (!profile) return;
    callsOpen.set(profile.clientId, accept !== false);
  });

  socket.on('leave', () => {
    disconnectPartner(socket.id);
    clearFromQueue(socket.id);
    clearWaitFallbackTimer(socket.id);
  });

  socket.on('report', (payload = {}) => {
    const partnerId = partners.get(socket.id);
    const seeker = profiles.get(socket.id);
    const partner = partnerId ? profiles.get(partnerId) : null;
    const reason = typeof payload.reason === 'string' ? payload.reason.slice(0, 40) : 'unspecified';
    const detail = typeof payload.detail === 'string' ? payload.detail.slice(0, 300) : '';
    if (seeker && partner) {
      const reportKey = `${seeker.clientId}|${partner.clientId}`;
      const now = Date.now();
      if (now - (reportCooldowns.get(reportKey) || 0) < 24 * 60 * 60 * 1000) {
        disconnectPartner(socket.id);
        return tryMatch(socket.id);
      }
      reportCooldowns.set(reportKey, now);
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
      console.log(`[report] ${seeker.username} reported ${partner.username} - reason: ${reason}${detail ? ` - "${detail}"` : ''} (total reports: ${totalReports})`);
      // No email alert for user reports: they arrive far too often to be useful
      // in an inbox. Every report is still recorded above and reviewable in the
      // owner dashboard at /owner.
      // Auto-ban after the configured threshold - a real persisted ban (default
      // 30 minutes) so they can't reconnect by refreshing. The owner can extend
      // or lift it from the dashboard.
      const distinctReporters = new Set((store.data.reports || [])
        .filter((r) => r.reported && r.reported.clientId === partner.clientId)
        .map((r) => r.reporter && r.reporter.clientId)
        .filter(Boolean));
      if (totalReports >= (store.data.settings.banThreshold || 3)
        && distinctReporters.size >= (store.data.settings.banThreshold || 3)
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

  // Reporting someone you are not currently in a call with (from their profile
  // in the friends panel). Same record, same cooldown and same mutual block as
  // an in-call report - it just has no call to end, so it never touches
  // matchmaking. Reports are only accepted about people this user actually
  // knows: an arbitrary clientId would let anyone file reports against
  // strangers they picked out of thin air.
  socket.on('report-user', ({ targetClientId, reason, detail } = {}) => {
    const me = profiles.get(socket.id);
    targetClientId = validId(targetClientId);
    if (!me || !targetClientId || targetClientId === me.clientId) return;
    // Anyone with a standing connection, or who sent this user a request: the
    // profile sheet offers Report on all of them.
    const known = (friends.get(me.clientId) || new Map()).get(targetClientId)
      || (chatHistory.get(me.clientId) || []).find((h) => h.clientId === targetClientId)
      || (friendRequests.get(me.clientId) || new Map()).get(targetClientId)
      || (knowsEachOther(me.clientId, targetClientId) ? {} : null);
    if (!known) return;
    const reportKey = `${me.clientId}|${targetClientId}`;
    const now = Date.now();
    if (now - (reportCooldowns.get(reportKey) || 0) < 24 * 60 * 60 * 1000) return;
    reportCooldowns.set(reportKey, now);
    // Same outcome as blocking them from this screen: the friendship goes and
    // the pair is blocked, which is what "you will also stop seeing each
    // other" in the confirmation promises.
    removeFriendPair(me.clientId, targetClientId);
    blockPair(me.clientId, targetClientId);
    const targetSocketId = clientSockets.get(targetClientId);
    const targetSocket = targetSocketId ? io.sockets.sockets.get(targetSocketId) : null;
    const targetProfile = targetSocketId ? profiles.get(targetSocketId) : null;
    store.recordFeature('report');
    store.addReport({
      reporter: { clientId: me.clientId, username: me.username, country: me.countryName, city: me.city },
      reported: {
        clientId: targetClientId,
        username: (targetProfile && targetProfile.username) || known.username || '',
        country: (targetProfile && targetProfile.countryName) || '',
        city: (targetProfile && targetProfile.city) || '',
        ip: targetSocket ? getClientIp(targetSocket) : null,
      },
      reason: typeof reason === 'string' ? reason.slice(0, 40) : 'profile',
      detail: typeof detail === 'string' ? detail.slice(0, 300) : '',
    });
    console.log(`[report] ${me.username} reported ${targetClientId} from a profile (total reports: ${store.reportCountFor(targetClientId)})`);
    syncClientState(socket, me.clientId);
    // The other side's friends list has lost someone too.
    if (targetSocket) syncClientState(targetSocket, targetClientId);
  });

  // User-submitted product feedback. Logged for the operator; kept lightweight
  // (no storage layer yet) but rate-limited implicitly by being a manual action.
  socket.on('feedback', (payload = {}) => {
    const text = typeof payload.text === 'string' ? payload.text.trim().slice(0, 1000) : '';
    if (!text) return;
    const p = profiles.get(socket.id);
    const who = p ? `${p.username} (${p.country})` : socket.id;
    // Which surface it was sent from - Settings, or the landing screen's
    // "still under development" notice. Both land in the same dashboard list;
    // the tag is what makes "what do first-time visitors say" answerable.
    const source = payload.source === 'dev-notice' ? 'dev-notice' : 'settings';
    console.log(`[feedback:${source}] from ${who}: ${text}`);
    store.recordFeature('feedback');
    store.addFeedback({ username: p ? p.username : 'Unknown', country: p ? p.countryName : '', city: p ? p.city : '', text, source });
    // No email alert for user feedback, same as user reports above: it is
    // recorded and reviewable in the owner dashboard at /owner instead.
  });

  // Client-side JS errors reported by the browser for the Errors dashboard tab.
  socket.on('client-error', (payload = {}) => {
    const message = typeof payload.message === 'string' ? payload.message.slice(0, 400) : '';
    if (!message) return;
    // Same filter as public/error-reporter.js. Repeated here because app.js is
    // served immutable for a year: browsers still running a cached copy from
    // before that filter existed would otherwise keep filling the Errors tab
    // with browser-extension and in-app-webview noise.
    if (ERROR_NOISE.some((re) => re.test(message))) return;
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
      const set = hearts.get(key);
      set.add(seeker.clientId);
      // Stamped so the sweeper can retire it. A heart is only consumed if the
      // pair actually meets again; without an expiry, every one-sided heart
      // that never got reciprocated stayed in memory for the process's life.
      set.ts = Date.now();
    }
  });

  // WebRTC signaling relay - only forwarded to the current partner
  socket.on('signal', (data) => {
    const partnerId = partners.get(socket.id);
    if (!partnerId || partners.get(partnerId) !== socket.id) return;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'offer' || data.type === 'answer') {
      if (!data.sdp || typeof data.sdp !== 'object'
        || data.sdp.type !== data.type || typeof data.sdp.sdp !== 'string'
        || data.sdp.sdp.length > 32768) return;
    } else if (data.type === 'ice-candidate') {
      if (!data.candidate || typeof data.candidate !== 'object'
        || typeof data.candidate.candidate !== 'string'
        || data.candidate.candidate.length > 8192) return;
    } else return;
    io.to(partnerId).emit('signal', data);
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
        text: `[${type}] ${detailStr}${transcriptStr ? ` - "${transcriptStr}"` : ''}`,
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

  socket.on('chat-message', (raw) => {
    const partnerId = partners.get(socket.id);
    if (!partnerId) return;
    const msg = readChatPayload(raw);
    if (!msg) return;
    // A GIF carries a giphy.com URL by definition, so the link filter only
    // applies to what the user actually typed.
    if (msg.text && containsLink(msg.text)) {
      return socket.emit('chat-blocked', { reason: 'link' });
    }
    if (msg.text && UNSAFE_RE.test(msg.text)) {
      return socket.emit('chat-blocked', { reason: 'unsafe' });
    }
    // Bot-flood guard: humans don't send 8+ messages in 5 seconds.
    const now = Date.now();
    let rl = chatRate.get(socket.id);
    if (!rl || now - rl.start > 5000) { rl = { start: now, n: 0 }; chatRate.set(socket.id, rl); }
    if (++rl.n > 8) return;
    store.recordFeature('chat_message');
    if (msg.gif) store.recordFeature('chat_gif');
    if (msg.replyTo) store.recordFeature('chat_reply');
    if (msg.text) store.recordTopics(msg.text);
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
        text: transcriptText(msg),
        msgId: msg.id || undefined,
        replyTo: msg.replyTo || undefined,
      });
    }
    // The server's clock is the only one both sides agree on, so it stamps the
    // message rather than letting each browser date it by its own (often
    // wrong, sometimes wildly wrong) local time.
    io.to(partnerId).emit('chat-message', {
      text: msg.text, id: msg.id, replyTo: msg.replyTo, gif: msg.gif, ts: now,
    });
  });

  // Reactions on a stranger message. Pure relay: the pair is live, both sides
  // hold the same message list in memory, and nothing is worth persisting once
  // the call ends.
  socket.on('chat-reaction', ({ id, emoji, on } = {}) => {
    const partnerId = partners.get(socket.id);
    const msgId = cleanMsgId(id);
    if (!partnerId || !msgId || !REACTION_SET.has(emoji)) return;
    // Tapping a reaction is cheap for a human and cheaper for a script, so it
    // gets its own budget rather than eating into the message allowance.
    const now = Date.now();
    let rl = reactRate.get(socket.id);
    if (!rl || now - rl.start > 5000) { rl = { start: now, n: 0 }; reactRate.set(socket.id, rl); }
    if (++rl.n > 25) return;
    if (on) store.recordFeature('chat_reaction');
    io.to(partnerId).emit('chat-reaction', { id: msgId, emoji, on: !!on });
  });

  socket.on('typing', () => {
    const partnerId = partners.get(socket.id);
    if (partnerId) {
      io.to(partnerId).emit('typing');
    }
  });

  // Mini-game (Tic Tac Toe) relay - forwards game events to the current partner only.
  socket.on('game', (data) => {
    const partnerId = partners.get(socket.id);
    if (partnerId && data && typeof data === 'object') {
      if (data.type === 'invite') store.recordFeature('mini_game');
      io.to(partnerId).emit('game', data);
    }
  });

  // --- Friends ---
  socket.on('friend-request', ({ targetClientId, message } = {}) => {
    const me = profiles.get(socket.id);
    targetClientId = validId(targetClientId);
    if (!me || !targetClientId || targetClientId === me.clientId) return;
    const gate = ageGate('friends');
    if (!gate.ok) return socket.emit('friend-request-result', { ok: false, error: gate.message, ageCheck: gate.reason });
    // A restricted recipient cannot be added either.
    if (ageAssurance.isRestricted(targetClientId)) {
      return socket.emit('friend-request-result', { ok: false, error: 'Unable to send friend request.' });
    }
    store.recordFeature('friend_request');
    if (isBlockedPair(me.clientId, targetClientId)) {
      return socket.emit('friend-request-result', { ok: false, error: 'Unable to send friend request.' });
    }
    // Same bar as messaging and call-backs: only someone this user has actually
    // met (a match, a conversation, a request from them). A clientId on its own
    // must not be enough to land in somebody's inbox.
    const inboxReq = (friendRequests.get(me.clientId) || new Map()).get(targetClientId);
    if (!inboxReq && !knowsEachOther(me.clientId, targetClientId)) {
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

    // They already asked me: this is an answer, not a second question. Two
    // people tapping "Add friend" on each other used to leave two pending
    // requests that each side had to accept separately.
    // A request of theirs this user declined earlier and that is being held on
    // their side counts too: asking them now is the change of mind it waits for.
    const heldReq = (sentRequests.get(targetClientId) || new Map()).get(me.clientId);
    const theirRequest = inboxReq || (heldReq && heldReq.held ? heldReq : null);
    if (theirRequest) {
      if (atFriendLimit(targetClientId)) {
        return socket.emit('friend-request-result', { ok: false, error: 'Their friend list is full.' });
      }
      let theirInfo;
      if (inboxReq) {
        theirInfo = { username: inboxReq.username, countryCode: inboxReq.countryCode, temporary: inboxReq.temporary, avatar: inboxReq.avatar };
      } else {
        const theirSock = getSocketByClientId(targetClientId);
        theirInfo = { ...snapshotOf(targetClientId, me.clientId), temporary: !(theirSock && socketAuth.get(theirSock.id)) };
      }
      addFriendPair(me.clientId, myInfo, targetClientId, theirInfo);
      pushNotification(targetClientId, { type: 'friend_accepted', byClientId: me.clientId, username: myInfo.username });
      const theirSocket = getSocketByClientId(targetClientId);
      if (theirSocket) syncClientState(theirSocket, targetClientId);
      syncClientState(socket, me.clientId);
      return socket.emit('friend-request-result', { ok: true, accepted: true });
    }

    // Asking again while the first request is still pending is a no-op, not a
    // fresh notification - otherwise repeated taps stack the same request in
    // their inbox.
    const alreadyPending = (sentRequests.get(me.clientId) || new Map()).has(targetClientId);
    if (alreadyPending) {
      return socket.emit('friend-request-result', { ok: true, sent: true, pending: true });
    }
    if (!socialRateOk('friend-request', me.clientId, 20, 10 * 60000)) {
      return socket.emit('friend-request-result', { ok: false, rateLimited: true, error: 'Too many friend requests. Try again in a few minutes.' });
    }
    // They said no a moment ago: this looks sent from here and goes nowhere.
    if (recentlyDeclined(me.clientId, targetClientId)) {
      noteSentRequest(me.clientId, targetClientId, { ...snapshotOf(targetClientId, me.clientId), held: true });
      persistSocial();
      syncClientState(socket, me.clientId);
      return socket.emit('friend-request-result', { ok: true, sent: true });
    }

    // Optional intro message ("remind them who you are") - links stripped,
    // capped, and only ever shown to the recipient. Kept on the request itself
    // too, not just the notification, so the requests list can show it.
    const intro = (typeof message === 'string' && !containsLink(message) && !UNSAFE_RE.test(message))
      ? message.trim().slice(0, 200) : '';
    if (!friendRequests.has(targetClientId)) friendRequests.set(targetClientId, new Map());
    const reqEntry = { ...myInfo, ts: Date.now() };
    if (intro) reqEntry.message = intro;
    friendRequests.get(targetClientId).set(me.clientId, reqEntry);
    // Asked while they were offline (from recent people): their live profile
    // is not there to read, so fall back to what this user knows of them -
    // otherwise the "You asked" list showed a nameless "Stranger".
    noteSentRequest(me.clientId, targetClientId, snapshotOf(targetClientId, me.clientId));

    pushNotification(targetClientId, {
      type: 'friend_request',
      fromClientId: me.clientId,
      username: myInfo.username,
      countryCode: myInfo.countryCode,
      temporary: myInfo.temporary,
      message: intro || undefined,
    });

    const targetSocket = getSocketByClientId(targetClientId);
    if (targetSocket) syncClientState(targetSocket, targetClientId);

    syncClientState(socket, me.clientId);
    socket.emit('friend-request-result', { ok: true, sent: true });
  });

  socket.on('friend-request-respond', ({ fromClientId, accept, notificationId } = {}) => {
    const me = profiles.get(socket.id);
    fromClientId = validId(fromClientId);
    if (!me || !fromClientId) return;
    if (accept) {
      const gate = ageGate('friends');
      if (!gate.ok) return socket.emit('friend-request-result', { ok: false, error: gate.message, ageCheck: gate.reason });
    }
    const reqMap = friendRequests.get(me.clientId);
    const req = reqMap && reqMap.get(fromClientId);
    if (!req) {
      // Nothing pending (already answered on another device, or cleared by a
      // block): still drop the stale notification so the row goes away.
      if (removeNotificationsWhere(me.clientId, (n) => n.type === 'friend_request' && n.fromClientId === fromClientId)) {
        syncClientState(socket, me.clientId);
      }
      return;
    }

    // Limits are checked before the request is consumed: hitting the cap used
    // to delete the request anyway, so upgrading could not bring it back.
    if (accept && atFriendLimit(me.clientId)) {
      syncClientState(socket, me.clientId);
      return socket.emit('friend-request-result', { ok: false, limitReached: true, error: `Free plan allows up to ${FREE_LIMITS.friends} friends. Upgrade to add unlimited friends.` });
    }
    // The requester may have filled up their own list since sending the request.
    if (accept && atFriendLimit(fromClientId)) {
      syncClientState(socket, me.clientId);
      return socket.emit('friend-request-result', { ok: false, error: 'Their friend list is full.' });
    }
    const outboxEntry = (sentRequests.get(fromClientId) || new Map()).get(me.clientId);
    clearRequestPair(fromClientId, me.clientId);
    if (notificationId) removeNotification(me.clientId, notificationId);
    removeNotificationsWhere(me.clientId, (n) => n.type === 'friend_request' && n.fromClientId === fromClientId);
    if (!accept) {
      // Their side keeps reading "Pending", as any messenger does: a button
      // that snaps back to "Add friend" is both a tell and an invitation to
      // ask again. The hold stops a re-ask from reaching this inbox.
      declinedRequests.set(`${fromClientId}>${me.clientId}`, Date.now());
      if (outboxEntry) {
        if (!sentRequests.has(fromClientId)) sentRequests.set(fromClientId, new Map());
        sentRequests.get(fromClientId).set(me.clientId, { ...outboxEntry, held: true });
      }
      store.recordFeature('friend_request_decline');
    }
    persistSocial();
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
      socket.emit('friend-request-result', { ok: true, accepted: true });
    }

    syncClientState(socket, me.clientId);
    const fromSocket = getSocketByClientId(fromClientId);
    if (fromSocket) syncClientState(fromSocket, fromClientId);
  });

  socket.on('remove-friend', ({ friendClientId } = {}) => {
    const me = profiles.get(socket.id);
    friendClientId = validId(friendClientId);
    if (!me || !friendClientId || !isFriend(me.clientId, friendClientId)) return;
    // Snapshots first: once the friendship is gone, so is what each knew of
    // the other.
    const them = snapshotOf(friendClientId, me.clientId);
    const mine = snapshotOf(me.clientId, friendClientId);
    removeFriendPair(me.clientId, friendClientId);
    store.recordFeature('friend_remove');
    // Unfriending is not blocking. The conversation is still there and either
    // side may still write in it, but it used to be listed only under Friends -
    // so it vanished from both screens with no way to open it again. It moves
    // to recent people instead, the way a messenger keeps the thread.
    if (friendChats.has(pairKey(me.clientId, friendClientId))) {
      touchChatHistory(me.clientId, friendClientId, them);
      touchChatHistory(friendClientId, me.clientId, mine);
      persistSocial();
    }
    syncClientState(socket, me.clientId);
    const friendSocket = getSocketByClientId(friendClientId);
    if (friendSocket) syncClientState(friendSocket, friendClientId);
  });

  // Rename a friend. The nickname is written only onto *this* user's copy of
  // the friendship, so it is a private label: the friend is never told, never
  // sees it, and keeps whatever name they chose for themselves. Clearing it
  // (empty string) falls back to their own name everywhere.
  socket.on('rename-friend', ({ friendClientId, nickname } = {}) => {
    const me = profiles.get(socket.id);
    friendClientId = validId(friendClientId);
    if (!me || !friendClientId) return;
    const mine = friends.get(me.clientId);
    const info = mine && mine.get(friendClientId);
    if (!info) return; // not a friend of theirs - nothing to label
    const clean = typeof nickname === 'string' ? nickname.trim().slice(0, 24) : '';
    if (clean) info.nickname = clean;
    else delete info.nickname;
    persistSocial();
    store.recordFeature('friend_rename');
    syncClientState(socket, me.clientId);
  });

  socket.on('block-friend', ({ friendClientId } = {}) => {
    const me = profiles.get(socket.id);
    friendClientId = validId(friendClientId);
    if (!me || !friendClientId || friendClientId === me.clientId) return;
    // Anyone can be blocked from their profile - a friend, a recent match or
    // someone who sent a request - but the list has a ceiling so a scripted
    // client cannot grow it without bound.
    const mine = blocks.get(me.clientId);
    if (mine && mine.size >= MAX_BLOCKS && !mine.has(friendClientId)) return;
    store.recordFeature('block');
    removeFriendPair(me.clientId, friendClientId);
    blockPair(me.clientId, friendClientId);
    syncClientState(socket, me.clientId);
    // Their list has lost a friend and any pending request between the two is
    // gone - without this they kept seeing the friendship until a reload.
    const friendSocket = getSocketByClientId(friendClientId);
    if (friendSocket) syncClientState(friendSocket, friendClientId);
  });

  // Undo a block from Settings > Privacy. Only lifts this user's side: if the
  // other person blocked them too, that block still stands. The friendship and
  // history the block removed are not restored - unblocking makes them
  // reachable again, it does not pretend nothing happened.
  socket.on('unblock-user', ({ targetClientId } = {}) => {
    const me = profiles.get(socket.id);
    targetClientId = validId(targetClientId);
    if (!me || !targetClientId) return;
    const mine = blocks.get(me.clientId);
    if (!mine || !mine.delete(targetClientId)) return;
    if (!mine.size) blocks.delete(me.clientId);
    const meta = blockMeta.get(me.clientId);
    if (meta) {
      meta.delete(targetClientId);
      if (!meta.size) blockMeta.delete(me.clientId);
    }
    persistSocial();
    store.recordFeature('unblock');
    syncClientState(socket, me.clientId);
  });

  // Take back a friend request that has not been answered yet. The request
  // leaves their inbox too, so a tap on "Confirm" there cannot resurrect it.
  socket.on('cancel-friend-request', ({ targetClientId } = {}) => {
    const me = profiles.get(socket.id);
    targetClientId = validId(targetClientId);
    if (!me || !targetClientId) return;
    const pending = (sentRequests.get(me.clientId) || new Map()).has(targetClientId)
      || (friendRequests.get(targetClientId) || new Map()).has(me.clientId);
    if (!pending) return syncClientState(socket, me.clientId);
    clearRequestPair(me.clientId, targetClientId);
    removeNotificationsWhere(targetClientId,
      (n) => n.type === 'friend_request' && n.fromClientId === me.clientId);
    persistSocial();
    store.recordFeature('friend_request_cancel');
    syncClientState(socket, me.clientId);
    const targetSocket = getSocketByClientId(targetClientId);
    if (targetSocket) syncClientState(targetSocket, targetClientId);
  });

  // "Clear chat": hides everything so far from this user only. The other
  // person keeps their copy - wiping someone else's history is not a thing a
  // messenger lets you do (unsend is the per-message tool for that).
  socket.on('clear-friend-chat', ({ friendClientId } = {}) => {
    const me = profiles.get(socket.id);
    friendClientId = validId(friendClientId);
    if (!me || !friendClientId) return;
    const key = pairKey(me.clientId, friendClientId);
    const list = friendChats.get(key);
    if (!list || !list.length) return;
    chatClears.set(`${me.clientId}|${key}`, list[list.length - 1].ts);
    removeNotificationsWhere(me.clientId, (n) => n.type === 'message' && n.fromClientId === friendClientId);
    persistSocial();
    store.recordFeature('chat_clear');
    socket.emit('friend-chat-history', { friendClientId, messages: [] });
    syncClientState(socket, me.clientId);
  });

  // --- Friend-to-friend chat (separate from the ephemeral in-call chat) ---
  socket.on('friend-message', (payload = {}) => {
    const me = profiles.get(socket.id);
    const toClientId = validId(payload && payload.toClientId);
    const parsed = readChatPayload(payload);
    if (!me || !toClientId || !parsed || toClientId === me.clientId) return;
    if (!ageGate('friends').ok || ageAssurance.isRestricted(toClientId)) return;
    // Friends can always message; so can two people who recently chatted at
    // random (the "message back from history" path), even without a friendship.
    // Refusals are said out loud: the composer had already cleared, so a
    // silent drop looked like a message that was sent and never answered.
    if (!knowsEachOther(me.clientId, toClientId) || isBlockedPair(me.clientId, toClientId)) {
      return socket.emit('chat-blocked', { reason: 'unreachable', toClientId });
    }
    // Friends can message each other any time - no call required. If the friend
    // is offline the message is still stored and a notification is queued, so it
    // reaches them the next time they come online.
    if (parsed.text && containsLink(parsed.text)) {
      return socket.emit('chat-blocked', { reason: 'link' });
    }
    if (parsed.text && UNSAFE_RE.test(parsed.text)) {
      return socket.emit('chat-blocked', { reason: 'unsafe' });
    }
    // Direct messages are stored and notified, so a flood costs the recipient
    // far more than one in a live chat does. Same human-speed ceiling.
    if (!socialRateOk('friend-message', me.clientId, 10, 5000)) {
      return socket.emit('chat-blocked', { reason: 'rate' });
    }
    const trimmed = parsed.text;
    // Ids are chosen by the client, and are what replies, reactions and unsend
    // point at. One already in the thread is either a resend of the same
    // message (a flaky connection) - stored once, not twice - or a collision,
    // which must not make two messages answer to one id.
    let msgId = parsed.id;
    if (msgId) {
      const dup = (friendChats.get(pairKey(me.clientId, toClientId)) || []).find((m) => m.id === msgId);
      if (dup && dup.from === me.clientId && dup.text === trimmed) return;
      if (dup) msgId = null;
    }
    const friendInfo = (friends.get(me.clientId) || new Map()).get(toClientId);
    store.addTranscript({
      kind: 'friend',
      pair: pairKey(me.clientId, toClientId),
      from: me.username,
      fromClientId: me.clientId,
      to: friendInfo ? friendInfo.username : toClientId,
      toClientId,
      country: me.countryName,
      text: transcriptText(parsed),
      msgId: msgId || undefined,
      replyTo: parsed.replyTo || undefined,
    });
    const key = pairKey(me.clientId, toClientId);
    if (!friendChats.has(key)) friendChats.set(key, []);
    // Stored ids are what replies and reactions point at after a reload, so a
    // client that sent none gets one here rather than an unaddressable message.
    const msg = {
      from: me.clientId,
      text: trimmed,
      ts: Date.now(),
      id: msgId || 'm' + crypto.randomBytes(6).toString('hex'),
    };
    if (parsed.replyTo) msg.replyTo = parsed.replyTo;
    if (parsed.gif) msg.gif = parsed.gif;
    const list = friendChats.get(key);
    list.push(msg);
    if (list.length > 200) list.shift();
    // Not friends: keep the conversation in both people's recent list.
    let mineAdded = false;
    let theirsAdded = false;
    if (!isFriend(me.clientId, toClientId)) {
      mineAdded = touchChatHistory(me.clientId, toClientId, snapshotOf(toClientId, me.clientId));
      theirsAdded = touchChatHistory(toClientId, me.clientId, { username: me.username, countryCode: me.country, avatar: me.avatar });
    }
    persistSocial();
    if (parsed.gif) store.recordFeature('chat_gif');
    if (parsed.replyTo) store.recordFeature('chat_reply');

    const wire = {
      fromClientId: me.clientId,
      text: trimmed,
      ts: msg.ts,
      id: msg.id,
      replyTo: msg.replyTo || null,
      gif: msg.gif || null,
    };
    const targetSocket = getSocketByClientId(toClientId);
    if (targetSocket) {
      targetSocket.emit('friend-message', wire);
      if (theirsAdded) syncClientState(targetSocket, toClientId);
    }
    if (mineAdded) syncClientState(socket, me.clientId);

    pushNotification(toClientId, {
      type: 'message',
      fromClientId: me.clientId,
      username: me.username,
      text: trimmed || '[GIF]',
      msgId: msg.id,
    });

    socket.emit('friend-message-sent', {
      toClientId, text: trimmed, ts: msg.ts, id: msg.id, replyTo: msg.replyTo || null, gif: msg.gif || null,
    });
  });

  // Reactions on a stored friend message. Unlike stranger reactions these are
  // persisted, so they survive a reload on both sides - a reaction that vanishes
  // when you reopen the chat reads as a bug.
  socket.on('friend-reaction', ({ toClientId, id, emoji, on } = {}) => {
    const me = profiles.get(socket.id);
    toClientId = validId(toClientId);
    const msgId = cleanMsgId(id);
    if (!me || !toClientId || !msgId || !REACTION_SET.has(emoji)) return;
    if (!knowsEachOther(me.clientId, toClientId) || isBlockedPair(me.clientId, toClientId)) return;
    const now = Date.now();
    let rl = reactRate.get(socket.id);
    if (!rl || now - rl.start > 5000) { rl = { start: now, n: 0 }; reactRate.set(socket.id, rl); }
    if (++rl.n > 25) return;

    const list = friendChats.get(pairKey(me.clientId, toClientId));
    const msg = list && list.find((m) => m.id === msgId);
    if (!msg) return;
    // reactions: emoji -> array of clientIds, so each side can tell its own
    // reaction from the other's and toggle only its own.
    if (!msg.reactions) msg.reactions = {};
    const who = msg.reactions[emoji] || [];
    const has = who.indexOf(me.clientId) !== -1;
    if (on && !has) msg.reactions[emoji] = who.concat(me.clientId);
    else if (!on && has) {
      const left = who.filter((c) => c !== me.clientId);
      if (left.length) msg.reactions[emoji] = left; else delete msg.reactions[emoji];
    } else return;
    if (!Object.keys(msg.reactions).length) delete msg.reactions;
    persistSocial();
    if (on) store.recordFeature('chat_reaction');

    const targetSocket = getSocketByClientId(toClientId);
    if (targetSocket) {
      targetSocket.emit('friend-reaction', { fromClientId: me.clientId, id: msgId, emoji, on: !!on });
    }
  });

  // Unsend: the author takes a stored message back. It goes from the thread on
  // both sides and from the recipient's unread count. The moderation transcript
  // keeps it - unsending is for regret, not for erasing evidence.
  socket.on('friend-message-delete', ({ toClientId, id } = {}) => {
    const me = profiles.get(socket.id);
    toClientId = validId(toClientId);
    const msgId = cleanMsgId(id);
    if (!me || !toClientId || !msgId) return;
    const key = pairKey(me.clientId, toClientId);
    const list = friendChats.get(key);
    const idx = list ? list.findIndex((m) => m.id === msgId && m.from === me.clientId) : -1;
    if (idx === -1) return;
    list.splice(idx, 1);
    if (!list.length) friendChats.delete(key);
    const unreadGone = removeNotificationsWhere(toClientId,
      (n) => n.type === 'message' && n.fromClientId === me.clientId && n.msgId === msgId);
    persistSocial();
    store.recordFeature('chat_unsend');
    socket.emit('friend-message-deleted', { chatWith: toClientId, id: msgId });
    const targetSocket = getSocketByClientId(toClientId);
    if (targetSocket) {
      targetSocket.emit('friend-message-deleted', { chatWith: me.clientId, id: msgId });
      if (unreadGone) syncClientState(targetSocket, toClientId);
    }
  });

  // "typing…" in a direct chat. Relayed only between people who could message
  // each other anyway, and never faster than a human types.
  socket.on('friend-typing', ({ toClientId } = {}) => {
    const me = profiles.get(socket.id);
    toClientId = validId(toClientId);
    if (!me || !toClientId || toClientId === me.clientId) return;
    const now = Date.now();
    if (me.lastFriendTypingAt && now - me.lastFriendTypingAt < 1000) return;
    me.lastFriendTypingAt = now;
    if (!knowsEachOther(me.clientId, toClientId) || isBlockedPair(me.clientId, toClientId)) return;
    if (statusHidden.get(me.clientId)) return; // appearing offline means not typing either
    const targetSocket = getSocketByClientId(toClientId);
    if (targetSocket) targetSocket.emit('friend-typing', { fromClientId: me.clientId });
  });

  socket.on('get-friend-chat', ({ friendClientId } = {}) => {
    const me = profiles.get(socket.id);
    friendClientId = validId(friendClientId);
    // Same bar as sending: a "message back" conversation with a recent match
    // is stored like any other, so it has to be loadable too - otherwise the
    // chat opened empty and every earlier message looked lost.
    if (!me || !friendClientId || !knowsEachOther(me.clientId, friendClientId)) return;
    if (isBlockedPair(me.clientId, friendClientId)) return;
    socket.emit('friend-chat-history', { friendClientId, messages: visibleThread(me.clientId, friendClientId) });
  });

  socket.on('mark-messages-read', ({ friendClientId } = {}) => {
    const me = profiles.get(socket.id);
    friendClientId = validId(friendClientId);
    // Deliberately not gated on isFriend(): messages also arrive from people in
    // the chat-history "message back" list, and from someone who has since been
    // removed as a friend. Gating on friendship left those notifications in the
    // store forever - the client hid the badge locally, and the next state-sync
    // or reload brought the same unread count straight back.
    if (!me || !friendClientId) return;
    const list = notifications.get(me.clientId);
    if (!list) return;
    const remaining = list.filter((n) => !(n.type === 'message' && n.fromClientId === friendClientId));
    if (remaining.length === list.length) return;
    notifications.set(me.clientId, remaining);
    persistSocial();
    // Push the truth back: the badge is rendered from state-sync, so without
    // this the count only looks cleared until the next sync.
    syncClientState(socket, me.clientId);
  });

  // Read receipts: when I (the viewer) open a chat, mark every message the
  // friend sent me as seen and persist it, so the sender still sees "Seen"
  // after reopening the chat or reconnecting - not just while both are live.
  socket.on('chat-seen', ({ friendClientId } = {}) => {
    const me = profiles.get(socket.id);
    friendClientId = validId(friendClientId);
    if (!me || !friendClientId || !knowsEachOther(me.clientId, friendClientId)) return;
    if (isBlockedPair(me.clientId, friendClientId)) return;
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
    if (!me || !targetClientId || targetClientId === me.clientId) return;
    store.recordFeature('call_back');
    if (isBlockedPair(me.clientId, targetClientId) || !knowsEachOther(me.clientId, targetClientId)) {
      return socket.emit('call-back-request-result', { ok: false, reason: 'blocked' });
    }
    if (!socialRateOk('call-back', me.clientId, 6, 60000)) {
      return socket.emit('call-back-request-result', { ok: false, reason: 'rate' });
    }
    if (!acceptsCalls(targetClientId)) {
      // Deliberately not "offline": they are here, they just aren't taking
      // calls, and queueing one for later would ring them anyway.
      return socket.emit('call-back-request-result', { ok: false, reason: 'calls-off' });
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

    // One ask at a time per pair: a retry replaces the queued notification
    // rather than stacking another "wants to talk" row.
    removeNotificationsWhere(targetClientId, (n) => n.type === 'call_back_request' && n.fromClientId === me.clientId);
    notePendingCallBack(me.clientId, targetClientId);
    // Online, but on the text-only page, which has no ringing banner: the
    // caller used to ring into silence for 45s. Leave the ask in their inbox
    // and tell the caller the truth straight away.
    if (!canTakeCall(profiles.get(targetSocketId))) {
      pushNotification(targetClientId, {
        type: 'call_back_request',
        fromClientId: me.clientId,
        username: me.username,
        countryCode: me.country,
      });
      return socket.emit('call-back-request-result', { ok: false, reason: 'away', queued: true });
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

  // Queue a call-back request for an offline peer ("send request for later").
  // Stored as a notification and delivered when they next come online; if they
  // happen to be online right now it's delivered live too.
  socket.on('call-back-request-later', ({ targetClientId } = {}) => {
    const me = profiles.get(socket.id);
    targetClientId = validId(targetClientId);
    if (!me || !targetClientId || targetClientId === me.clientId) return;
    if (isBlockedPair(me.clientId, targetClientId) || !knowsEachOther(me.clientId, targetClientId)) {
      return socket.emit('call-back-later-result', { ok: false, reason: 'blocked', targetClientId });
    }
    if (!acceptsCalls(targetClientId)) {
      return socket.emit('call-back-later-result', { ok: false, reason: 'calls-off', targetClientId });
    }
    if (!socialRateOk('call-back', me.clientId, 6, 60000)) {
      return socket.emit('call-back-later-result', { ok: false, reason: 'rate', targetClientId });
    }
    removeNotificationsWhere(targetClientId, (n) => n.type === 'call_back_request' && n.fromClientId === me.clientId);
    notePendingCallBack(me.clientId, targetClientId);
    pushNotification(targetClientId, {
      type: 'call_back_request',
      fromClientId: me.clientId,
      username: me.username,
      countryCode: me.country,
    });
    const targetSocket = getSocketByClientId(targetClientId);
    if (targetSocket && canTakeCall(profiles.get(targetSocket.id))) {
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

    // Only an ask that is actually pending can be answered. Without this, any
    // client could "accept" a call-back nobody made and be force-paired with
    // whichever online clientId it named. A queued ask sitting in this inbox
    // counts too - the in-memory index does not outlive a restart, the inbox does.
    const queued = (notifications.get(me.clientId) || [])
      .some((n) => n.type === 'call_back_request' && n.fromClientId === fromClientId);
    const askedAt = takePendingCallBack(fromClientId, me.clientId);
    const wasAsked = !!askedAt || queued;
    removeNotificationsWhere(me.clientId, (n) => n.type === 'call_back_request' && n.fromClientId === fromClientId);

    const requesterSocketId = clientSockets.get(fromClientId);
    const requesterSocket = requesterSocketId ? io.sockets.sockets.get(requesterSocketId) : null;

    if (!accept) {
      if (wasAsked && requesterSocket) requesterSocket.emit('call-back-declined', { byClientId: me.clientId, username: me.username });
      return;
    }

    if (!wasAsked || isBlockedPair(me.clientId, fromClientId)) {
      return socket.emit('call-back-request-result', { ok: false, reason: 'expired' });
    }
    const requesterProfile = requesterSocket ? profiles.get(requesterSocketId) : null;
    if (!requesterSocket || !requesterProfile) {
      return socket.emit('call-back-request-result', { ok: false, reason: 'offline' });
    }

    // The ask may be hours old - queued while this user was away. By now the
    // person who made it may be deep in another call, or on the text-only
    // page. Force-pairing them then dropped the call they were in, or left
    // this side on "Connecting…" to a page that ignores voice matches. So only
    // a caller who is still ringing (or free) is connected; otherwise the ask
    // turns around and they get "<name> is free to talk", theirs to answer.
    const requesterPartner = partners.get(requesterSocketId);
    const stillRinging = !!askedAt && Date.now() - askedAt < CALL_BACK_LIVE_MS;
    const requesterBusy = !!requesterPartner && requesterPartner !== socket.id && !stillRinging;
    if (!canTakeCall(requesterProfile) || requesterBusy) {
      removeNotificationsWhere(fromClientId, (n) => n.type === 'call_back_request' && n.fromClientId === me.clientId);
      notePendingCallBack(me.clientId, fromClientId);
      pushNotification(fromClientId, {
        type: 'call_back_request',
        fromClientId: me.clientId,
        username: me.username,
        countryCode: me.country,
      });
      if (canTakeCall(requesterProfile)) {
        requesterSocket.emit('call-back-request', { fromClientId: me.clientId, username: me.username, countryCode: me.country });
      }
      store.recordFeature('call_back_turned');
      return socket.emit('call-back-request-result', { ok: false, reason: 'busy-queued' });
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

    const key = pairKey(me.clientId, requesterProfile.clientId);
    hearts.delete(key);
    me.matchedAt = Date.now();
    requesterProfile.matchedAt = me.matchedAt;

    // Call-backs are always voice calls, whatever pool either side was in.
    me.mode = 'talk';
    requesterProfile.mode = 'talk';
    requesterSocket.emit('matched', { initiator: true, partner: publicProfile(me), rematched: false, callback: true, mode: 'talk' });
    socket.emit('matched', { initiator: false, partner: publicProfile(requesterProfile), rematched: false, callback: true, mode: 'talk' });
    rememberPairing(socket, me, requesterSocket, requesterProfile);
  });

  // The caller gave up before an answer: take the ask back, so the other side's
  // banner and inbox row stop offering a call nobody is waiting on.
  socket.on('call-back-cancel', ({ targetClientId } = {}) => {
    const me = profiles.get(socket.id);
    targetClientId = validId(targetClientId);
    if (!me || !targetClientId) return;
    const m = pendingCallBacks.get(targetClientId);
    if (!m || !m.delete(me.clientId)) return;
    if (!m.size) pendingCallBacks.delete(targetClientId);
    removeNotificationsWhere(targetClientId, (n) => n.type === 'call_back_request' && n.fromClientId === me.clientId);
    const targetSocket = getSocketByClientId(targetClientId);
    if (targetSocket) {
      targetSocket.emit('call-back-cancelled', { fromClientId: me.clientId });
      syncClientState(targetSocket, targetClientId);
    }
  });

  // --- In-chat voice-call invites ------------------------------------------
  // 1) Inviter (on /chat, mid-conversation) taps the phone icon → the current
  //    partner gets a popup.
  socket.on('voice-invite', () => {
    const me = profiles.get(socket.id);
    const partnerId = partners.get(socket.id);
    if (!me || !partnerId) return;
    // Throttle: one invite per 5s per socket so the popup can't be spammed.
    const now = Date.now();
    if (me.lastVoiceInviteAt && now - me.lastVoiceInviteAt < 5000) return;
    me.lastVoiceInviteAt = now;
    const partnerSocket = io.sockets.sockets.get(partnerId);
    if (!partnerSocket) return;
    partnerSocket.emit('voice-invite', { username: me.username, countryCode: me.country });
  });

  // 2) Invitee answers the popup. Decline → tell the inviter. Accept → mint a
  //    one-time rendezvous token and send it to BOTH sides; each browser then
  //    navigates to /call?invite=<token>.
  socket.on('voice-invite-respond', ({ accept } = {}) => {
    const me = profiles.get(socket.id);
    const partnerId = partners.get(socket.id);
    if (!me || !partnerId) return;
    const partnerSocket = io.sockets.sockets.get(partnerId);
    const partnerProfile = profiles.get(partnerId);
    if (!partnerSocket || !partnerProfile) return;
    if (!accept) {
      partnerSocket.emit('voice-invite-declined', { username: me.username });
      return;
    }
    const token = 'vi_' + crypto.randomBytes(12).toString('hex');
    const invite = { clients: [me.clientId, partnerProfile.clientId], joined: new Map() };
    invite.timer = setTimeout(() => voiceInvites.delete(token), VOICE_INVITE_TTL_MS);
    voiceInvites.set(token, invite);
    store.recordFeature('voice_invite');
    socket.emit('voice-invite-accepted', { token });
    partnerSocket.emit('voice-invite-accepted', { token });
  });

  // 3) Both land on /call with the token (fresh sockets). First arrival waits;
  //    the second one triggers a force-pair in talk mode, exactly like an
  //    accepted call-back.
  socket.on('voice-invite-join', ({ token } = {}) => {
    const me = profiles.get(socket.id);
    if (!me || typeof token !== 'string' || !/^vi_[a-f0-9]{24}$/.test(token)) return;
    const invite = voiceInvites.get(token);
    if (!invite || !invite.clients.includes(me.clientId)) return;
    invite.joined.set(me.clientId, socket.id);

    const otherClientId = invite.clients.find((c) => c !== me.clientId);
    const otherSocketId = invite.joined.get(otherClientId);
    const otherSocket = otherSocketId ? io.sockets.sockets.get(otherSocketId) : null;
    if (!otherSocket) return; // first one here - wait for the partner

    clearTimeout(invite.timer);
    voiceInvites.delete(token);

    for (const id of [socket.id, otherSocketId]) {
      disconnectPartner(id);
      clearFromQueue(id);
      clearWaitFallbackTimer(id);
    }
    partners.set(socket.id, otherSocketId);
    partners.set(otherSocketId, socket.id);

    const otherProfile = profiles.get(otherSocketId);
    hearts.delete(pairKey(me.clientId, otherProfile.clientId));
    me.matchedAt = Date.now();
    otherProfile.matchedAt = me.matchedAt;
    me.mode = 'talk';
    otherProfile.mode = 'talk';
    otherSocket.emit('matched', { initiator: true, partner: publicProfile(me), rematched: false, callback: true, mode: 'talk' });
    socket.emit('matched', { initiator: false, partner: publicProfile(otherProfile), rematched: false, callback: true, mode: 'talk' });
    rememberPairing(socket, me, otherSocket, otherProfile);
  });

  socket.on('disconnect', () => {
    // The socket went away rather than the user pressing anything, so tell
    // whoever they were talking to exactly that.
    disconnectPartner(socket.id, { dropped: true });
    clearFromQueue(socket.id);
    clearWaitFallbackTimer(socket.id);
    const profile = profiles.get(socket.id);
    if (profile && clientSockets.get(profile.clientId) === socket.id) {
      clientSockets.delete(profile.clientId);
      if (friends.has(profile.clientId) || chatHistory.has(profile.clientId)) {
        lastSeen.set(profile.clientId, Date.now());
        persistSocial();
      }
      // Flip this user's green dot off in friends' lists and in anyone's
      // "message back" panel right away.
      resyncWatchers(profile.clientId);
    }
    profiles.delete(socket.id);
    socketAuth.delete(socket.id);
    // Keyed by socket.id, which is never reused - without this the chat-flood
    // counter accumulates one entry per socket that ever sent a message and is
    // never reclaimed.
    chatRate.delete(socket.id);
    reactRate.delete(socket.id);
    broadcastOnlineCount();
  });
});

// --- Periodic sweep of short-lived bookkeeping ----------------------------
//
// These maps are keyed by clientId, IP or pair - none of which have a
// disconnect hook that can retire them - and every one of them only ever grew.
// On a single 512MB machine that is a slow leak with a hard ending: the app
// already idles around 218MB and OOM-restarted in a loop when it was given
// 256MB, so an unbounded map is a crash, not just untidiness.
//
// Each entry below is either time-stamped or tied to a live socket, so a sweep
// every 10 minutes reclaims them safely. Unref'd so it never holds the process
// open on shutdown.
const IDENTITY_TOKEN_TTL_MS = 7 * 24 * 60 * 60000; // a returning browser re-registers well inside a week
const HEART_TTL_MS = 60 * 60000;                   // a "talk again" wish is stale after an hour
const REPORT_COOLDOWN_TTL_MS = 24 * 60 * 60000;    // matches the cooldown the report handler enforces

function sweepEphemeralState() {
  const now = Date.now();

  // Identity tokens: drop any whose browser has neither registered recently nor
  // has a live socket. A returning user simply gets a freshly signed token.
  for (const [clientId, seenAt] of identityTokenSeen) {
    if (now - seenAt < IDENTITY_TOKEN_TTL_MS || clientSockets.has(clientId)) continue;
    identityTokenSeen.delete(clientId);
    identityTokens.delete(clientId);
  }
  // Any token with no seen-at record at all predates this bookkeeping.
  for (const clientId of identityTokens.keys()) {
    if (!identityTokenSeen.has(clientId) && !clientSockets.has(clientId)) identityTokens.delete(clientId);
  }

  for (const [key, rec] of signupAttempts) {
    if (now - rec.first > SIGNUP_WINDOW_MS) signupAttempts.delete(key);
  }
  for (const [key, rec] of loginAttempts) {
    if (now - rec.first > LOGIN_WINDOW_MS && (!rec.until || rec.until < now)) loginAttempts.delete(key);
  }
  for (const [key, rec] of resetRequests) {
    if (now - rec.first > RESET_WINDOW_MS) resetRequests.delete(key);
  }
  // Expired reset codes are already unusable; this only stops the table from
  // accumulating dead rows on a server nobody is resetting passwords on.
  store.purgePasswordResets().catch(() => { /* swept again next pass */ });
  for (const [key, rec] of hearts) {
    if (now - (rec.ts || 0) > HEART_TTL_MS) hearts.delete(key);
  }
  for (const [key, ts] of reportCooldowns) {
    if (now - ts > REPORT_COOLDOWN_TTL_MS) reportCooldowns.delete(key);
  }
  // Pair holds carry their own expiry; this only reclaims the ones no matcher
  // pass happened to look at again.
  for (const [key, rec] of pairCooldowns) {
    if (!rec || rec.until <= now) pairCooldowns.delete(key);
  }
  // Status visibility is a per-client preference with no expiry, but it only
  // matters while the client is online or is somebody's friend.
  for (const clientId of statusHidden.keys()) {
    if (clientSockets.has(clientId) || friends.has(clientId)) continue;
    statusHidden.delete(clientId);
  }
  // Rate-limit records for sockets that are already gone.
  for (const socketId of chatRate.keys()) {
    if (!io.sockets.sockets.has(socketId)) chatRate.delete(socketId);
  }
  for (const socketId of reactRate.keys()) {
    if (!io.sockets.sockets.has(socketId)) reactRate.delete(socketId);
  }
  for (const [key, rl] of socialRate) {
    if (now - rl.start > rl.windowMs) socialRate.delete(key);
  }
  for (const [target, m] of pendingCallBacks) {
    for (const [from, ts] of m) {
      if (now - ts > CALL_BACK_TTL_MS) m.delete(from);
    }
    if (!m.size) pendingCallBacks.delete(target);
  }
  // Month-old requests and inbox rows: expire them on both indexes together.
  let socialChanged = false;
  for (const [target, inbox] of friendRequests) {
    for (const [from, req] of inbox) {
      if (now - (req.ts || 0) > SOCIAL_INBOX_TTL_MS) { clearRequestPair(from, target); socialChanged = true; }
    }
  }
  // Outbox rows with no inbox row behind them (a request held after a
  // decline) expire on their own clock.
  for (const [from, outbox] of sentRequests) {
    for (const [target, req] of outbox) {
      if (now - (req.ts || 0) > SOCIAL_INBOX_TTL_MS) { clearRequestPair(from, target); socialChanged = true; }
    }
  }
  for (const [key, ts] of declinedRequests) {
    if (now - ts > DECLINE_HOLD_MS) { declinedRequests.delete(key); socialChanged = true; }
  }
  for (const [cid, list] of notifications) {
    const fresh = list.filter((n) => now - (n.ts || 0) <= SOCIAL_INBOX_TTL_MS);
    if (fresh.length === list.length) continue;
    socialChanged = true;
    if (fresh.length) notifications.set(cid, fresh); else notifications.delete(cid);
  }
  for (const cid of lastSeen.keys()) {
    if (friends.has(cid) || chatHistory.has(cid)) continue;
    lastSeen.delete(cid);
    socialChanged = true;
  }
  // A clear marker outlives its purpose once the thread itself is gone.
  for (const key of chatClears.keys()) {
    if (friendChats.has(key.slice(key.indexOf('|') + 1))) continue;
    chatClears.delete(key);
    socialChanged = true;
  }
  if (socialChanged) persistSocial();
}

const sweepTimer = setInterval(sweepEphemeralState, 10 * 60000);
if (sweepTimer.unref) sweepTimer.unref();

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

/*
 * Say plainly, at every boot, when nothing being stored will survive a deploy.
 *
 * With no DATABASE_URL the store falls back to a JSON file under DATA_DIR.
 * fly.toml points that at /data but mounts no volume there, so on the live app
 * it is an ordinary directory inside the container: every account, ban, report
 * and the owner dashboard's own password hash is destroyed by the next deploy -
 * and deploys are automatic on push. Until now the only trace was a cheerful
 * "[accounts] restored 0 account(s) from the store", which reads like a fresh
 * install rather than the third time this month the users were deleted.
 *
 * This warns; it does not refuse to boot. Halting would convert a durability
 * problem into an outage, and the file backend is entirely correct in local
 * development - which is why the warning is limited to production.
 */
function warnIfStorageIsEphemeral() {
  if (process.env.NODE_ENV !== 'production') return;
  const status = store.backendStatus;
  if (status.mode === 'postgres') return;

  // Warn only when the data is genuinely at risk: either the configured
  // database is unreachable, or the file store is on disposable storage. A
  // file backend on a properly mounted volume is a supported setup and must
  // not be shouted about - a warning that fires when nothing is wrong is one
  // nobody reads the day something is.
  const dbBroken = status.configured && status.mode !== 'postgres';
  if (!dbBroken && status.ephemeral !== true) {
    if (status.ephemeral === null) {
      console.warn(`[storage] could not confirm whether ${status.dataDir} is a mounted volume; assuming it is.`);
    }
    return;
  }

  const detail = status.ephemeral === true
    ? `DATA_DIR (${status.dataDir}) is not a mounted volume - it lives inside the container image.`
    : `DATA_DIR (${status.dataDir}) is the fallback while the database is unreachable.`;
  const configured = status.configured
    ? `DATABASE_URL is set but the connection failed${status.error ? ` (${status.error})` : ''}, so the file backend is in use.`
    : 'DATABASE_URL is not set, so the file backend is in use.';

  console.error(
    '\n[storage] ****  STORED DATA WILL NOT SURVIVE THE NEXT DEPLOY  ****\n'
    + `[storage] ${configured}\n`
    + `[storage] ${detail}\n`
    + `[storage] Currently holding ${accounts.size} account(s), `
    + `${store.data.reports.length} report(s), ${store.activeBans().length} active ban(s).\n`
    + '[storage] Fix: set DATABASE_URL (see CODEX-HANDOFF.md) or mount a Fly volume at that path.\n'
  );

  // One email, so this is visible to the owner without reading boot logs.
  // sendAlertEmail is throttled per topic and is a no-op when SMTP is unset.
  admin.sendAlertEmail(
    'ephemeral-storage',
    'TalkLive: stored data is being lost on every deploy',
    `${configured}\n${detail}\n\n`
    + `The server is running normally, but everything it stores - accounts, bans, `
    + `reports, feedback and the dashboard's own password - is discarded the next `
    + `time the app deploys, which happens automatically on every push to main.\n\n`
    + `Currently holding ${accounts.size} account(s), ${store.data.reports.length} report(s), `
    + `${store.activeBans().length} active ban(s).\n\n`
    + `Fix: set DATABASE_URL to the Supabase connection string (see CODEX-HANDOFF.md, `
    + `task 2) so the data lives in Postgres instead.\n\n`
    + `Dashboard: https://${CANONICAL_HOST}/owner`
  );
}

// Wait for the store (Postgres or file) to load before accepting traffic so
// bans, maintenance mode and admin credentials apply from the first request.
store.ready.then(() => {
  // Durable identity secret before anything can register.
  if (!process.env.IDENTITY_SECRET) IDENTITY_SECRET = store.getOrCreateSecret('identity');
  // Restore durable accounts + social graph before accepting traffic so
  // returning users can log in and see their friends/chats immediately.
  hydrateFromStore();
  console.log(`[accounts] restored ${accounts.size} account(s) from the store`);
  warnIfStorageIsEphemeral();
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`TalkLive server running on port ${PORT}`);
    warnIfNoRelay();
    // Tell the IndexNow network (Bing/Yandex/Seznam/Naver) about every URL in
    // the sitemap shortly after each production boot, so fresh deploys get
    // crawled within minutes. Local dev skips it to avoid noise.
    if (process.env.NODE_ENV === 'production') {
      setTimeout(() => { try { require('./indexnow').ping(); } catch (e) { console.warn('[indexnow]', e.message); } }, 60000);
    }
  });
});
