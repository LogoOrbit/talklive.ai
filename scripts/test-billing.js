process.env.STRIPE_SECRET_KEY = 'sk_test_x';
process.env.STRIPE_PRICE_MONTHLY = 'price_m';
process.env.STRIPE_PRICE_YEARLY = 'price_y';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
const crypto = require('crypto');
const b = require('../server/billing');
let failed = 0;
const ok = (n, c) => { if (!c) failed++; console.log(c ? 'PASS' : 'FAIL', n); };
ok('configured', b.configured());
ok('plans', JSON.stringify(b.plans()) === '["monthly","yearly"]');
function sign(body, t = Math.floor(Date.now() / 1000), secret = 'whsec_test') {
  const v1 = crypto.createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');
  return `t=${t},v1=${v1}`;
}
const body = JSON.stringify({ type: 'checkout.session.completed', data: { object: { client_reference_id: 'cid1', payment_status: 'paid', subscription: 'sub_1' } } });
ok('valid sig', !!b.verifyWebhook(body, sign(body)));
ok('wrong secret rejected', b.verifyWebhook(body, sign(body, undefined, 'whsec_other')) === null);
ok('tampered body rejected', b.verifyWebhook(body + ' ', sign(body)) === null);
ok('replay (old ts) rejected', b.verifyWebhook(body, sign(body, Math.floor(Date.now() / 1000) - 4000)) === null);
ok('missing header rejected', b.verifyWebhook(body, '') === null);
ok('short sig does not throw', b.verifyWebhook(body, 't=1,v1=ab') === null);
const d = (t) => b.decide(JSON.parse(t));
let r = d(body);
ok('checkout -> grant', r.action === 'grant' && r.clientId === 'cid1' && r.until === null);
r = d(JSON.stringify({ type: 'checkout.session.completed', data: { object: { client_reference_id: 'c', payment_status: 'unpaid' } } }));
ok('unpaid checkout ignored', r.action === 'ignore');
const end = Math.floor(Date.now() / 1000) + 2592000;
r = d(JSON.stringify({ type: 'invoice.paid', data: { object: { metadata: { clientId: 'c2' }, lines: { data: [{ period: { end } }] }, subscription: 'sub_2' } } }));
ok('invoice -> grant with period end', r.action === 'grant' && r.until === end * 1000);
r = d(JSON.stringify({ type: 'customer.subscription.updated', data: { object: { id: 's', metadata: { clientId: 'c' }, status: 'active', cancel_at_period_end: true, current_period_end: end } } }));
ok('cancel_at_period_end keeps access', r.action === 'grant' && r.until === end * 1000);
r = d(JSON.stringify({ type: 'customer.subscription.updated', data: { object: { id: 's', metadata: { clientId: 'c' }, status: 'past_due' } } }));
ok('past_due revokes', r.action === 'revoke');
r = d(JSON.stringify({ type: 'customer.subscription.deleted', data: { object: { id: 's', metadata: { clientId: 'c' } } } }));
ok('deleted revokes', r.action === 'revoke');
r = d(JSON.stringify({ type: 'invoice.paid', data: { object: {} } }));
ok('no clientId ignored', r.action === 'ignore');
r = d(JSON.stringify({ type: 'ping', data: { object: { metadata: { clientId: 'c' } } } }));
ok('unknown type ignored', r.action === 'ignore');
ok('form encode nested', b._formEncode({ a: 1, b: { c: 'd e' } }).join('&') === 'a=1&b%5Bc%5D=d%20e');

// --- nextPremium: out-of-order and duplicate webhook deliveries ------------
{
  const now = 1_800_000_000_000;
  const month = now + 30 * 86400000;
  const grant = (until, sub = 'sub_1', reason = 'invoice paid') => ({ action: 'grant', clientId: 'c', until, reason, subscriptionId: sub });
  const revoke = (sub = 'sub_1') => ({ action: 'revoke', clientId: 'c', reason: 'subscription deleted', subscriptionId: sub });
  const stripeRec = { source: 'stripe', expiresAt: month, subscriptionId: 'sub_1', stripeEventAt: now - 1000 };

  let s = b.nextPremium(null, grant(null, 'sub_1', 'checkout completed'), now - 5000, now);
  ok('first checkout grants a day', s.op === 'set' && s.info.expiresAt === now + 86400000 && s.info.source === 'stripe');
  s = b.nextPremium(stripeRec, grant(null, 'sub_1', 'checkout completed'), now, now);
  ok('late checkout does not cut a paid month to a day', s.op === 'set' && s.info.expiresAt === month, s.info);
  s = b.nextPremium(stripeRec, grant(month + 1000), now, now);
  ok('renewal extends', s.op === 'set' && s.info.expiresAt === month + 1000);
  s = b.nextPremium(stripeRec, revoke(), now - 5000, now);
  ok('event older than the last applied is skipped', s.op === 'skip' && s.reason === 'stale event');
  s = b.nextPremium(stripeRec, revoke('sub_old'), now, now);
  ok('deleting an old subscription keeps the current one', s.op === 'skip' && s.reason === 'different subscription');
  s = b.nextPremium(stripeRec, revoke('sub_1'), now, now);
  ok('deleting the current subscription revokes', s.op === 'revoke');
  s = b.nextPremium({ expiresAt: null, activatedAt: 1 }, revoke('sub_1'), now, now);
  ok('Stripe never revokes a manual grant', s.op === 'skip' && s.reason === 'not a Stripe grant');
  s = b.nextPremium({ source: 'referral', expiresAt: now + 1000 }, revoke('sub_1'), now, now);
  ok('Stripe never revokes a referral grant', s.op === 'skip');
  s = b.nextPremium({ activatedAt: 1 }, grant(month), now, now);
  ok('a permanent grant stays permanent and keeps its source', s.op === 'set' && !('expiresAt' in s.info) && !('source' in s.info));
  s = b.nextPremium({ ...stripeRec, revokedAt: now - 10, expiresAt: now + 5 }, grant(month, 'sub_2'), now, now);
  ok('a new subscription after a revoke grants its own period', s.op === 'set' && s.info.expiresAt === month && s.info.subscriptionId === 'sub_2');
  s = b.nextPremium(null, { action: 'ignore', reason: 'x' }, now, now);
  ok('ignored decision is skipped', s.op === 'skip');
  ok('fresh event id is not processed', !b.alreadyProcessed('evt_1'));
  b.markProcessed('evt_1');
  ok('processed event id is remembered', b.alreadyProcessed('evt_1'));
}

// --- End to end: webhook against a real server -----------------------------
async function webhookE2E() {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const { spawn } = require('child_process');
  const PORT = 6400 + Math.floor(Math.random() * 400);
  const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-billing-'));
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, DATABASE_URL: '', NODE_ENV: 'development' },
    stdio: 'ignore',
  });
  const base = `http://127.0.0.1:${PORT}`;
  try {
    for (let i = 0; i < 60; i++) {
      try { await fetch(base + '/healthz'); break; } catch (_) { await new Promise((r) => setTimeout(r, 250)); }
    }
    const nowS = Math.floor(Date.now() / 1000);
    const end = nowS + 30 * 86400;
    let n = 0;
    const post = async (type, object, created) => {
      const body = JSON.stringify({ id: `evt_${++n}`, type, created, data: { object } });
      const r = await fetch(base + '/billing/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Stripe-Signature': sign(body) }, body });
      return r.status;
    };
    const status = async () => (await fetch(base + '/premium-status?clientId=e2e-client-1')).json();
    const bad = await fetch(base + '/billing/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Stripe-Signature': 't=1,v1=00' }, body: '{}' });
    ok('e2e: bad signature is a 400', bad.status === 400);
    await post('invoice.paid', { metadata: { clientId: 'e2e-client-1' }, subscription: 'sub_new', lines: { data: [{ period: { end } }] } }, nowS);
    await post('checkout.session.completed', { client_reference_id: 'e2e-client-1', payment_status: 'paid', subscription: 'sub_new' }, nowS);
    let st = await status();
    ok('e2e: invoice then late checkout keeps the full month', st.premium && st.expiresAt === end * 1000, st);
    await post('customer.subscription.deleted', { id: 'sub_old', metadata: { clientId: 'e2e-client-1' } }, nowS + 1);
    st = await status();
    ok('e2e: deleting an old subscription keeps Plus', st.premium === true);
    await post('customer.subscription.deleted', { id: 'sub_new', metadata: { clientId: 'e2e-client-1' } }, nowS + 2);
    st = await status();
    ok('e2e: deleting the current subscription ends Plus', st.premium === false);
  } finally {
    srv.kill('SIGKILL');
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }
}

(async () => {
  try { await webhookE2E(); } catch (err) { ok('e2e webhook harness', false, err.message); }
  // An inherited key is not a plan: refused locally, never sent to Stripe.
  let status = null;
  try { await b.createCheckout({ clientId: 'c', plan: 'constructor', origin: 'https://x' }); } catch (err) { status = err.status; }
  ok('inherited key is not a plan', status === 400);
  console.log(failed ? `\n${failed} FAILED` : '\nall passed');
  process.exit(failed ? 1 : 0);
})();
