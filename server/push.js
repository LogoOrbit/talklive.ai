/*
 * TalkLive web push - re-engagement for a site people otherwise visit once.
 *
 * The retention problem this exists to solve: a friendship made on TalkLive is
 * only reachable while both people happen to have the tab open. A friend
 * message sent to someone who closed the tab is stored and shown "next time" -
 * but there is no next time unless something brings them back. Push is that
 * something, and it is the one re-engagement channel available to an anonymous
 * product with no email address and no phone number.
 *
 * Env-gated on a VAPID keypair. Without VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY
 * the module reports `configured: false`, the client never asks for permission,
 * and nothing here runs. Generate a pair with:
 *
 *   node -e "console.log(require('web-push').generateVAPIDKeys())"
 *
 * The keys are per-deployment and permanent: replacing them invalidates every
 * existing subscription silently, so they belong in `fly secrets`, not in a
 * config file that gets regenerated.
 *
 * Deliberately conservative about what is sent. A push notification for an
 * anonymous chat product can land on a lock screen in front of other people, so
 * message *contents* are never included - only who it is from and that there is
 * something waiting.
 */

const webpush = require('web-push');
const { GoogleAuth } = require('google-auth-library');
const store = require('./store');

const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
// Push services require a contactable identity for the sender, so they can
// reach an operator whose deployment starts misbehaving.
const CONTACT = process.env.VAPID_CONTACT || process.env.OWNER_EMAIL || '';

let ready = false;
if (PUBLIC_KEY && PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(CONTACT ? `mailto:${CONTACT}` : 'mailto:info@talklive.app', PUBLIC_KEY, PRIVATE_KEY);
    ready = true;
  } catch (err) {
    console.error('[push] VAPID keys are set but invalid, push disabled:', err.message);
  }
}

// --- Native app push (Firebase Cloud Messaging) -------------------------------
//
// The Android/iOS app (mobile/) registers an FCM token instead of a web push
// subscription. It is stored in the same per-client list, with the endpoint
// `fcm:<token>`, so throttling, the device cap and cleanup are shared.
//
// Env-gated on FCM_SERVICE_ACCOUNT: the Firebase service-account JSON (Firebase
// console > Project settings > Service accounts > Generate new private key),
// either raw or base64-encoded. Without it, app installs simply get no push.
const FCM_PREFIX = 'fcm:';
let fcm = null; // { projectId, auth }
(function initFcm() {
  const raw = process.env.FCM_SERVICE_ACCOUNT || '';
  if (!raw) return;
  try {
    const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    const credentials = JSON.parse(json);
    if (!credentials.project_id || !credentials.client_email || !credentials.private_key) throw new Error('incomplete service account');
    fcm = {
      projectId: credentials.project_id,
      auth: new GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/firebase.messaging'] }),
    };
  } catch (err) {
    console.error('[push] FCM_SERVICE_ACCOUNT is set but unusable, app push disabled:', err.message);
  }
})();

function fcmConfigured() {
  return !!fcm;
}

// Android channels created by the app (mobile/android Notifications.java).
const CHANNEL_FOR_KIND = { call: 'calls', message: 'messages' };

async function sendFcm(token, { title, body, url, tag, kind }) {
  const accessToken = await fcm.auth.getAccessToken();
  const call = kind === 'call';
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${fcm.projectId}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body },
        data: { url: url || '/' },
        android: {
          priority: 'high',
          // A request to talk is stale within a minute; a message can wait.
          ttl: call ? '60s' : '3600s',
          notification: {
            channel_id: CHANNEL_FOR_KIND[kind] || 'messages',
            tag: tag || 'talklive',
            sound: 'default',
            default_vibrate_timings: !call,
          },
        },
        apns: {
          headers: { 'apns-priority': '10', 'apns-collapse-id': String(tag || 'talklive').slice(0, 64) },
          payload: { aps: { sound: 'default' } },
        },
      },
    }),
  });
  if (res.ok) return 'ok';
  const err = await res.json().catch(() => ({}));
  const code = (((err.error || {}).details || []).find((d) => d.errorCode) || {}).errorCode;
  // The app was uninstalled or the token rotated: stop pushing to it.
  if (res.status === 404 || code === 'UNREGISTERED' || code === 'INVALID_ARGUMENT') return 'gone';
  throw Object.assign(new Error(code || `HTTP ${res.status}`), { statusCode: res.status });
}

function configured() {
  return ready;
}

function publicKey() {
  return ready ? PUBLIC_KEY : '';
}

// A person who is mid-call does not need a notification about the chat they are
// already in, and one that arrives while the tab is focused is pure annoyance.
// The caller passes `isOnline` so this stays a pure function of state it can
// see; index.js owns the live socket registry.
const THROTTLE_MS = 5 * 60000;
const lastSent = new Map(); // `${clientId}:${topic}` -> ts

function throttled(clientId, topic) {
  const key = `${clientId}:${topic}`;
  const now = Date.now();
  const last = lastSent.get(key) || 0;
  if (now - last < THROTTLE_MS) return true;
  lastSent.set(key, now);
  return false;
}

setInterval(() => {
  const cutoff = Date.now() - THROTTLE_MS;
  for (const [key, ts] of lastSent) if (ts < cutoff) lastSent.delete(key);
}, 10 * 60000).unref();

/**
 * Send a notification to every device `clientId` has subscribed.
 *
 * `topic` collapses repeats: ten messages from the same friend while the tab is
 * closed is one notification, not ten. Returns the number of devices reached.
 */
async function send(clientId, { topic, title, body, url, tag, kind }) {
  if ((!ready && !fcm) || !clientId) return 0;
  if (throttled(clientId, topic || title)) return 0;
  const subs = store.pushSubscriptions(clientId);
  if (!subs.length) return 0;

  const payload = JSON.stringify({
    title,
    body,
    url: url || '/',
    // Same tag replaces the previous notification instead of stacking, so a
    // returning user sees one current item per topic rather than a wall.
    tag: tag || topic || 'talklive',
  });

  let delivered = 0;
  await Promise.all(subs.map(async (sub) => {
    if (sub.endpoint.startsWith(FCM_PREFIX)) {
      if (!fcm) return;
      try {
        const outcome = await sendFcm(sub.endpoint.slice(FCM_PREFIX.length), { title, body, url, tag: tag || topic, kind });
        if (outcome === 'gone') store.removePushSubscription(clientId, sub.endpoint);
        else delivered += 1;
      } catch (err) {
        console.error('[push] FCM send failed:', err.message);
      }
      return;
    }
    if (!ready) return;
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload, { TTL: 3600 });
      delivered += 1;
    } catch (err) {
      const status = err && err.statusCode;
      // 404/410 mean the push service has permanently dropped this endpoint -
      // the user uninstalled the PWA, cleared site data, or revoked permission.
      // Keeping it would mean pushing to a dead address on every future event.
      if (status === 404 || status === 410) {
        store.removePushSubscription(clientId, sub.endpoint);
      } else {
        console.error('[push] send failed:', status || (err && err.message));
      }
    }
  }));
  return delivered;
}

module.exports = { configured, fcmConfigured, publicKey, send, FCM_PREFIX };
