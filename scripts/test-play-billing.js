// Google Play subscriptions (server/play-billing.js): reading Google's answer,
// turning it into Plus, never shortening or stealing another grant, the
// Play Developer API calls, and Pub/Sub notifications.
//
//   node scripts/test-play-billing.js
const p = require('../server/play-billing');

let failed = 0;
const ok = (n, c) => { if (!c) failed++; console.log(c ? 'PASS' : 'FAIL', n); };
const DAY = 86400000;
const now = Date.now();
const iso = (ms) => new Date(ms).toISOString();

(async () => {
  // --- summarise ------------------------------------------------------------
  const sub = p.summarise({
    subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
    acknowledgementState: 'ACKNOWLEDGEMENT_STATE_PENDING',
    lineItems: [
      { productId: 'talklive_plus', expiryTime: iso(now + 5 * DAY) },
      { productId: 'talklive_plus', expiryTime: iso(now + 30 * DAY) },
    ],
    externalAccountIdentifiers: { obfuscatedExternalAccountId: p.accountIdFor('cid1') },
    latestOrderId: 'GPA.1',
  });
  ok('latest expiry wins', sub.expiryMs === Date.parse(iso(now + 30 * DAY)));
  ok('product read', sub.productId === 'talklive_plus');
  ok('not yet acknowledged', sub.acknowledged === false);
  ok('account id is a hash of the clientId', sub.accountId === p.accountIdFor('cid1') && sub.accountId.length === 64);
  ok('summarise tolerates junk', p.summarise(null) === null && p.summarise({}).expiryMs === 0);

  // --- decide -----------------------------------------------------------------
  ok('active -> grant until expiry', JSON.stringify(p.decide(sub, now)) === JSON.stringify({ action: 'grant', until: sub.expiryMs }));
  ok('cancelled keeps access to expiry', p.decide({ ...sub, state: 'SUBSCRIPTION_STATE_CANCELED' }, now).action === 'grant');
  ok('grace period keeps access', p.decide({ ...sub, state: 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD' }, now).action === 'grant');
  ok('expired revokes', p.decide({ ...sub, state: 'SUBSCRIPTION_STATE_EXPIRED' }, now).action === 'revoke');
  ok('on hold revokes', p.decide({ ...sub, state: 'SUBSCRIPTION_STATE_ON_HOLD' }, now).action === 'revoke');
  ok('refund (revoked) revokes', p.decide({ ...sub, state: 'SUBSCRIPTION_STATE_REVOKED' }, now).action === 'revoke');
  ok('cancelled past expiry revokes', p.decide({ ...sub, state: 'SUBSCRIPTION_STATE_CANCELED', expiryMs: now - 1 }, now).action === 'revoke');
  ok('pending is ignored', p.decide({ ...sub, state: 'SUBSCRIPTION_STATE_PENDING' }, now).action === 'ignore');

  // --- nextPremium --------------------------------------------------------------
  const grant = { action: 'grant', until: now + 30 * DAY };
  let s = p.nextPremium(null, grant, 'tok-aaaaaaaaaaaaaaaaaaaa', now);
  ok('new grant', s.op === 'set' && s.info.expiresAt === grant.until && s.info.source === 'play' && s.info.playToken.length === 32);
  s = p.nextPremium({ activatedAt: 1 }, grant, 'tok-aaaaaaaaaaaaaaaaaaaa', now);
  ok('permanent grant stays permanent', s.op === 'set' && s.info.expiresAt === undefined && s.info.source === undefined);
  s = p.nextPremium({ source: 'stripe', expiresAt: now + 90 * DAY }, grant, 'tok-aaaaaaaaaaaaaaaaaaaa', now);
  ok('longer Stripe grant is kept', s.op === 'set' && s.info.expiresAt === now + 90 * DAY);
  const mine = p.nextPremium(null, grant, 'tok-aaaaaaaaaaaaaaaaaaaa', now).info;
  s = p.nextPremium({ ...mine, expiresAt: now + 30 * DAY }, { action: 'grant', until: now + 60 * DAY }, 'tok-aaaaaaaaaaaaaaaaaaaa', now);
  ok('renewal extends', s.op === 'set' && s.info.expiresAt === now + 60 * DAY);
  s = p.nextPremium({ ...mine, expiresAt: now + 30 * DAY }, { action: 'revoke' }, 'tok-aaaaaaaaaaaaaaaaaaaa', now);
  ok('refund revokes its own grant', s.op === 'revoke');
  s = p.nextPremium({ ...mine, expiresAt: now + 30 * DAY }, { action: 'revoke' }, 'tok-bbbbbbbbbbbbbbbbbbbb', now);
  ok('another purchase cannot revoke it', s.op === 'skip');
  s = p.nextPremium({ source: 'stripe', expiresAt: now + 30 * DAY }, { action: 'revoke' }, 'tok-aaaaaaaaaaaaaaaaaaaa', now);
  ok('Play never revokes a Stripe grant', s.op === 'skip');
  s = p.nextPremium({ activatedAt: 1 }, { action: 'revoke' }, 'tok-aaaaaaaaaaaaaaaaaaaa', now);
  ok('Play never revokes a manual grant', s.op === 'skip');
  ok('ignore is skipped', p.nextPremium(null, { action: 'ignore', reason: 'x' }, 't').op === 'skip');

  // --- token validation ----------------------------------------------------------
  ok('valid token', p.validToken('abcdefghijklmnopqrstuvwx.AO-J1Oz_123:xyz'));
  ok('short token rejected', !p.validToken('short'));
  ok('odd characters rejected', !p.validToken('a'.repeat(30) + '/../x'));
  ok('non-string rejected', !p.validToken(null));

  // --- API client ------------------------------------------------------------------
  const calls = [];
  const fake = async (url, opts) => {
    calls.push({ url, opts });
    if (url.includes('subscriptionsv2/tokens/')) {
      return { ok: true, status: 200, text: async () => JSON.stringify({ subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE', lineItems: [{ productId: 'talklive_plus', expiryTime: iso(now + DAY) }] }) };
    }
    if (url.endsWith(':acknowledge')) return { ok: true, status: 204, text: async () => '' };
    return { ok: false, status: 404, text: async () => JSON.stringify({ error: { message: 'not found' } }) };
  };
  const api = p.createPlayBilling({ packageName: 'app.talklive', fetchImpl: fake, getAccessToken: async () => 'tok123' });
  ok('configured with a token source', api.configured());
  const looked = await api.lookup('purchase-token-0123456789');
  ok('lookup calls subscriptionsv2', calls[0].url === 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/app.talklive/purchases/subscriptionsv2/tokens/purchase-token-0123456789');
  ok('bearer token sent', calls[0].opts.headers.Authorization === 'Bearer tok123');
  ok('lookup summarised', looked.state === 'SUBSCRIPTION_STATE_ACTIVE' && looked.productId === 'talklive_plus');
  await api.acknowledge('talklive_plus', 'purchase-token-0123456789');
  ok('acknowledge posts to the v1 endpoint', calls[1].opts.method === 'POST' && calls[1].url.endsWith('/purchases/subscriptions/talklive_plus/tokens/purchase-token-0123456789:acknowledge'));
  const bad = p.createPlayBilling({ fetchImpl: async () => ({ ok: false, status: 410, text: async () => '{"error":{"message":"gone"}}' }), getAccessToken: async () => 't' });
  let threw = null;
  try { await bad.lookup('purchase-token-0123456789'); } catch (err) { threw = err; }
  ok('API errors throw with the status', threw && threw.status === 410 && /gone/.test(threw.message));
  ok('not configured without credentials', !p.createPlayBilling({ serviceAccountB64: '' }).configured());

  // --- RTDN ---------------------------------------------------------------------------
  const push = (o) => ({ message: { data: Buffer.from(JSON.stringify(o)).toString('base64') } });
  let n = p.parseRtdn(push({ packageName: 'app.talklive', subscriptionNotification: { notificationType: 2, purchaseToken: 'purchase-token-0123456789', subscriptionId: 'talklive_plus' } }));
  ok('RTDN parsed', n && n.purchaseToken === 'purchase-token-0123456789' && n.type === 2 && n.productId === 'talklive_plus');
  n = p.parseRtdn(push({ packageName: 'app.talklive', testNotification: { version: '1.0' } }));
  ok('test notification has no token', n && !n.purchaseToken && n.test);
  ok('garbage is null', p.parseRtdn({ message: { data: '!!!' } }) === null && p.parseRtdn(null) === null);

  console.log(failed ? `\n${failed} failed` : '\nall passed');
  process.exit(failed ? 1 : 0);
})();
