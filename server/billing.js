/*
 * TalkLive billing - Stripe Checkout for TalkLive Plus.
 *
 * Everything here is env-gated. With no STRIPE_SECRET_KEY the module reports
 * `configured: false`, /pricing keeps showing its "coming soon" card, and no
 * route does anything but say so - which is exactly the state the site shipped
 * in, so adding this file cannot change behaviour until keys exist.
 *
 * Deliberately no `stripe` npm dependency. Two calls are needed (create a
 * Checkout Session, read a subscription) plus webhook signature verification;
 * all three are a fetch and an HMAC. A 4MB SDK to save thirty lines is not
 * worth the deploy weight on a 512MB machine that already loads a 154MB geoip
 * database at boot.
 *
 * The identity Stripe carries for us is the browser's persistent `clientId`,
 * passed as `client_reference_id` and mirrored into subscription metadata.
 * That is the same key premium is stored under everywhere else in the app, so
 * a webhook can grant premium without the buyer having an account at all -
 * which matters, because the entire product promise is "no sign-up".
 */

const crypto = require('crypto');

const SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const PRICES = {
  monthly: process.env.STRIPE_PRICE_MONTHLY || '',
  yearly: process.env.STRIPE_PRICE_YEARLY || '',
};
const API = 'https://api.stripe.com/v1';

// Checkout can be created as soon as there is a key and at least one price.
// The webhook secret is checked separately: a deployment that can take money
// but cannot hear back about it is a misconfiguration worth shouting about,
// not one to fail silently.
function configured() {
  return !!(SECRET_KEY && (PRICES.monthly || PRICES.yearly));
}

function plans() {
  return Object.keys(PRICES).filter((k) => PRICES[k]);
}

function warnIfHalfConfigured() {
  if (!configured()) return;
  if (!WEBHOOK_SECRET) {
    console.error('[billing] ============================================================');
    console.error('[billing] STRIPE_SECRET_KEY is set but STRIPE_WEBHOOK_SECRET is NOT.');
    console.error('[billing] Checkout will work and customers will be charged, but no');
    console.error('[billing] payment can ever grant premium - every webhook is rejected.');
    console.error('[billing] Set the signing secret from the Stripe webhook endpoint.');
    console.error('[billing] ============================================================');
  }
}

// Stripe's API is form-encoded, including nested keys as a[b]=c.
function formEncode(obj, prefix = '', out = []) {
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null || value === '') continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === 'object' && !Array.isArray(value)) formEncode(value, name, out);
    else out.push(`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`);
  }
  return out;
}

async function stripeRequest(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      // Stripe pins behaviour to the account's default version otherwise, so a
      // dashboard-side version bump could change response shapes under us.
      'Stripe-Version': '2024-06-20',
    },
    body: body ? formEncode(body).join('&') : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (json.error && json.error.message) || `Stripe ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return json;
}

/**
 * Create a Checkout Session and return its hosted URL.
 *
 * `clientId` is the browser's persistent id - the key premium is stored under.
 * It travels as client_reference_id (present on checkout.session.completed) and
 * as subscription metadata (present on every later invoice and cancellation),
 * because the two event families do not carry the same fields and we need the
 * id in both.
 */
async function createCheckout({ clientId, plan, origin }) {
  const price = PRICES[plan];
  if (!price) throw Object.assign(new Error('Unknown plan.'), { status: 400 });
  if (!clientId) throw Object.assign(new Error('Missing client id.'), { status: 400 });
  const session = await stripeRequest('POST', '/checkout/sessions', {
    mode: 'subscription',
    'line_items[0][price]': price,
    'line_items[0][quantity]': 1,
    client_reference_id: clientId,
    // Stripe emails the receipt; nothing here needs an address, and asking for
    // one costs conversions on an anonymous product.
    billing_address_collection: 'auto',
    allow_promotion_codes: 'true',
    subscription_data: { metadata: { clientId, plan } },
    metadata: { clientId, plan },
    success_url: `${origin}/pricing?checkout=success`,
    cancel_url: `${origin}/pricing?checkout=cancelled`,
  });
  return session.url;
}

/**
 * Verify a Stripe webhook signature.
 *
 * Requires the exact bytes Stripe sent, so the route must be mounted with a raw
 * body parser - JSON.parse + re-stringify reorders keys and the HMAC no longer
 * matches. The timestamp check is what stops a captured request from being
 * replayed later; without it a single observed "subscription created" call
 * could be resent forever.
 */
function verifyWebhook(rawBody, signatureHeader, toleranceSeconds = 300) {
  if (!WEBHOOK_SECRET) return null;
  const parts = String(signatureHeader || '').split(',').reduce((acc, part) => {
    const [k, v] = part.split('=');
    if (k === 't') acc.t = v;
    if (k === 'v1') acc.v1.push(v);
    return acc;
  }, { t: null, v1: [] });
  if (!parts.t || !parts.v1.length) return null;
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(parts.t));
  if (!Number.isFinite(age) || age > toleranceSeconds) return null;
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(`${parts.t}.${rawBody}`, 'utf8')
    .digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');
  const match = parts.v1.some((candidate) => {
    const buf = Buffer.from(candidate, 'utf8');
    // timingSafeEqual throws on a length mismatch, so guard before comparing.
    return buf.length === expectedBuf.length && crypto.timingSafeEqual(buf, expectedBuf);
  });
  if (!match) return null;
  try {
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
}

// The clientId can arrive in three shapes depending on which event fired.
function clientIdFromEvent(object) {
  return (
    (object && object.client_reference_id) ||
    (object && object.metadata && object.metadata.clientId) ||
    (object && object.subscription_details && object.subscription_details.metadata && object.subscription_details.metadata.clientId) ||
    ''
  );
}

/**
 * Turn a verified webhook event into a premium decision.
 *
 * Returns { action: 'grant'|'revoke'|'ignore', clientId, until, reason }.
 *
 * `until` is Stripe's own current_period_end, not a locally computed date, and
 * it is what makes cancellation correct without any cron: a cancelled
 * subscription simply stops sending renewals, so the last granted period runs
 * out on its own. The explicit revoke path is only for a subscription that
 * ends early (a refund, a dispute, a delete from the dashboard).
 */
function decide(event) {
  const object = (event && event.data && event.data.object) || {};
  const clientId = clientIdFromEvent(object);
  const type = event && event.type;
  if (!clientId) return { action: 'ignore', reason: `${type}: no clientId` };

  switch (type) {
    // Fires the moment the buyer pays. Grants a short window immediately so
    // premium is live before the first invoice event lands - a user who has
    // just paid must not have to wait or refresh to see it.
    case 'checkout.session.completed':
      if (object.payment_status && object.payment_status !== 'paid') {
        return { action: 'ignore', clientId, reason: 'checkout not paid' };
      }
      return { action: 'grant', clientId, until: null, reason: 'checkout completed', subscriptionId: object.subscription || null };

    // The authoritative renewal signal. Every successful charge extends the
    // grant to the end of the period Stripe just billed for.
    case 'invoice.paid':
    case 'invoice.payment_succeeded': {
      const line = (object.lines && object.lines.data && object.lines.data[0]) || {};
      const end = (line.period && line.period.end) || object.period_end || 0;
      return {
        action: 'grant',
        clientId,
        until: end ? end * 1000 : null,
        reason: 'invoice paid',
        subscriptionId: object.subscription || null,
      };
    }

    case 'customer.subscription.updated': {
      // An active subscription flagged cancel_at_period_end is NOT revoked -
      // the user paid for the rest of the period and keeps it. Only a status
      // that is no longer good ends access.
      const good = object.status === 'active' || object.status === 'trialing';
      if (!good) return { action: 'revoke', clientId, reason: `subscription ${object.status}`, subscriptionId: object.id };
      return {
        action: 'grant',
        clientId,
        until: object.current_period_end ? object.current_period_end * 1000 : null,
        reason: `subscription ${object.status}`,
        subscriptionId: object.id,
      };
    }

    case 'customer.subscription.deleted':
      return { action: 'revoke', clientId, reason: 'subscription deleted', subscriptionId: object.id };

    default:
      return { action: 'ignore', clientId, reason: `unhandled ${type}` };
  }
}

module.exports = {
  configured,
  plans,
  plansConfigured: PRICES,
  warnIfHalfConfigured,
  webhookConfigured: () => !!WEBHOOK_SECRET,
  createCheckout,
  verifyWebhook,
  decide,
  // exported for tests
  _formEncode: formEncode,
};
