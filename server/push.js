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
async function send(clientId, { topic, title, body, url, tag }) {
  if (!ready || !clientId) return 0;
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

module.exports = { configured, publicKey, send };
