/*
 * TalkLive Plus bought in the Android app through Google Play.
 *
 * The app never decides who is premium. After a purchase (and on every app
 * start, to restore) it sends the Play purchase token to
 * POST /billing/play/verify, and this module asks Google's Play Developer API
 * what that token really is (purchases.subscriptionsv2.get). Renewals,
 * cancellations, refunds and holds arrive as Real-time Developer Notifications
 * (Pub/Sub push to POST /billing/play/rtdn); each one is re-checked with the
 * API rather than trusted.
 *
 * Configuration (Fly secrets):
 *   PLAY_SERVICE_ACCOUNT  base64 of a Google Cloud service-account JSON key that
 *                         has "View financial data" + "Manage orders and
 *                         subscriptions" in Play Console > Users and permissions.
 *   PLAY_PACKAGE_NAME     optional, defaults to app.talklive.
 *   PLAY_RTDN_SECRET      a random string; the Pub/Sub push URL must end in
 *                         ?secret=<it>, so nobody else can trigger re-checks.
 *
 * Without PLAY_SERVICE_ACCOUNT the endpoints answer 503 and nothing changes.
 */
'use strict';

const crypto = require('crypto');

const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';

// Subscription states that still entitle the buyer, up to the expiry time.
// CANCELED means "will not renew", not "refunded": access runs to expiry.
const ENTITLED = new Set([
  'SUBSCRIPTION_STATE_ACTIVE',
  'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
  'SUBSCRIPTION_STATE_CANCELED',
]);
// States that end access now.
const ENDED = new Set([
  'SUBSCRIPTION_STATE_EXPIRED',
  'SUBSCRIPTION_STATE_ON_HOLD',
  'SUBSCRIPTION_STATE_PAUSED',
  'SUBSCRIPTION_STATE_REVOKED',
]);

/** What the app sets as obfuscatedAccountId, so a token can be tied to its buyer. */
function accountIdFor(clientId) {
  return crypto.createHash('sha256').update(String(clientId)).digest('hex').slice(0, 64);
}

/** Purchase tokens are long opaque strings from Google. */
function validToken(t) {
  return typeof t === 'string' && t.length >= 20 && t.length <= 4096 && /^[A-Za-z0-9._:-]+$/.test(t);
}

/** Reads the parts of a SubscriptionPurchaseV2 this server cares about. */
function summarise(sub) {
  if (!sub || typeof sub !== 'object') return null;
  const items = Array.isArray(sub.lineItems) ? sub.lineItems : [];
  let expiryMs = 0;
  let productId = '';
  for (const li of items) {
    const t = Date.parse(li && li.expiryTime);
    if (Number.isFinite(t) && t > expiryMs) { expiryMs = t; productId = li.productId || productId; }
  }
  const ext = sub.externalAccountIdentifiers || {};
  return {
    state: String(sub.subscriptionState || ''),
    expiryMs,
    productId,
    acknowledged: sub.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
    accountId: ext.obfuscatedExternalAccountId || '',
    orderId: sub.latestOrderId || '',
    linkedPurchaseToken: sub.linkedPurchaseToken || '',
    test: !!sub.testPurchase,
  };
}

/**
 * Turns a summarised subscription into a premium decision:
 *   { action: 'grant', until } | { action: 'revoke' } | { action: 'ignore', reason }
 */
function decide(s, now = Date.now()) {
  if (!s) return { action: 'ignore', reason: 'no subscription' };
  if (ENTITLED.has(s.state) && s.expiryMs > now) return { action: 'grant', until: s.expiryMs };
  if (ENDED.has(s.state) || (ENTITLED.has(s.state) && s.expiryMs <= now)) return { action: 'revoke' };
  return { action: 'ignore', reason: `state ${s.state || 'unknown'}` };
}

/**
 * The next premium record for a Play decision, with the same guarantees as
 * Stripe's billing.nextPremium: an active grant is never shortened, a
 * permanent (manual) grant stays permanent, and Play only revokes what Play
 * granted (and only for the same purchase).
 *
 * Returns { op: 'set'|'revoke', info } or { op: 'skip', reason }.
 */
function nextPremium(existing, decision, token, now = Date.now()) {
  if (!decision || decision.action === 'ignore') return { op: 'skip', reason: (decision && decision.reason) || 'ignored' };
  const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex').slice(0, 32);
  if (decision.action === 'revoke') {
    if (!existing || existing.revokedAt) return { op: 'skip', reason: 'nothing to revoke' };
    if (existing.source !== 'play') return { op: 'skip', reason: 'not a Play grant' };
    if (existing.playToken && existing.playToken !== tokenHash) return { op: 'skip', reason: 'different purchase' };
    return { op: 'revoke', info: { lastEvent: 'play:ended' } };
  }
  const active = !!existing && !existing.revokedAt && (!existing.expiresAt || existing.expiresAt > now);
  if (active && !existing.expiresAt) return { op: 'set', info: { lastEvent: 'play:active', playToken: tokenHash } };
  let expiresAt = decision.until;
  // A longer grant from somewhere else (Stripe, referral) is kept.
  if (active && existing.source !== 'play') expiresAt = Math.max(expiresAt, existing.expiresAt);
  return { op: 'set', info: { lastEvent: 'play:active', expiresAt, source: 'play', playToken: tokenHash } };
}

/**
 * Google Play Developer API client. `fetchImpl` and `getAccessToken` can be
 * replaced in tests.
 */
function createPlayBilling({
  serviceAccountB64 = process.env.PLAY_SERVICE_ACCOUNT,
  packageName = process.env.PLAY_PACKAGE_NAME || 'app.talklive',
  fetchImpl = (...a) => fetch(...a),
  getAccessToken = null,
} = {}) {
  let tokenFn = getAccessToken;
  if (!tokenFn && serviceAccountB64) {
    try {
      const { GoogleAuth } = require('google-auth-library');
      const credentials = JSON.parse(Buffer.from(serviceAccountB64, 'base64').toString('utf8'));
      const auth = new GoogleAuth({ credentials, scopes: [SCOPE] });
      tokenFn = () => auth.getAccessToken();
    } catch (err) {
      console.error('[play] PLAY_SERVICE_ACCOUNT is not valid base64 JSON:', err.message);
    }
  }

  async function call(method, path, body) {
    const token = await tokenFn();
    const res = await fetchImpl(`${API}/${encodeURIComponent(packageName)}/${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : {}; } catch (_) { /* not JSON */ }
    if (!res.ok) {
      const err = new Error(`Play API ${res.status}: ${(json && json.error && json.error.message) || text.slice(0, 200)}`);
      err.status = res.status;
      throw err;
    }
    return json || {};
  }

  return {
    configured: () => !!tokenFn,
    packageName,
    /** The subscription behind a purchase token, summarised. */
    async lookup(purchaseToken) {
      return summarise(await call('GET', `purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`));
    },
    /** Play refunds purchases not acknowledged within 3 days. */
    async acknowledge(productId, purchaseToken) {
      await call('POST', `purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`, {});
    },
  };
}

/** Parses a Pub/Sub push body carrying a Real-time Developer Notification. */
function parseRtdn(body) {
  try {
    const data = body && body.message && body.message.data;
    if (typeof data !== 'string') return null;
    const n = JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
    const sub = n && n.subscriptionNotification;
    if (!sub || !validToken(sub.purchaseToken)) return { packageName: n && n.packageName, test: !!(n && n.testNotification) };
    return { packageName: n.packageName, purchaseToken: sub.purchaseToken, type: Number(sub.notificationType) || 0, productId: sub.subscriptionId || '' };
  } catch (_) {
    return null;
  }
}

module.exports = { createPlayBilling, summarise, decide, nextPremium, accountIdFor, validToken, parseRtdn, ENTITLED, ENDED };
