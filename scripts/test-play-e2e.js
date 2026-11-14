// Google Play purchases end to end, against a fake Google API (PLAY_API_BASE,
// tests only) and the real server:
//
//   passes     verified -> days granted once, consumed; a replay grants
//              nothing; another profile cannot claim the token
//   refunds    a voided-purchase notification for a pass takes its days back,
//              and the refunded token cannot be verified again
//   subs       a subscription is granted; a 'revoked' notification re-checks
//              Google and ends it
//   RTDN auth  a wrong secret, or no Google-signed token when
//              PLAY_RTDN_AUDIENCE is set, is refused (403) and changes nothing
//   identity   a profile that owns a Plus record cannot be taken over by
//              registering its clientId without the identity token
//
//   node scripts/test-play-e2e.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const IDENTITY_SECRET = crypto.randomBytes(32).toString('hex');
const sign = (id) => crypto.createHmac('sha256', IDENTITY_SECRET).update(id).digest('hex');
const accountIdFor = (id) => crypto.createHash('sha256').update(id).digest('hex');
const RTDN_SECRET = 'rtdn-' + crypto.randomBytes(8).toString('hex');
const DAY = 864e5;

let failed = 0;
const ok = (name, cond, extra) => { if (!cond) failed++; console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : JSON.stringify(extra)); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Fake Google Play Developer API -------------------------------------------
const products = new Map(); // token -> { productId, clientId, purchaseState, consumptionState }
const subs = new Map(); // token -> { clientId, state, expiry }
const calls = [];
const google = http.createServer((req, res) => {
  calls.push(req.method + ' ' + req.url);
  const send = (code, body) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body || {})); };
  if (req.headers.authorization !== 'Bearer test-access') return send(401, { error: 'auth' });
  let m = /\/purchases\/products\/([^/]+)\/tokens\/([^/:]+)(:consume)?$/.exec(req.url);
  if (m) {
    const p = products.get(decodeURIComponent(m[2]));
    if (!p || p.productId !== decodeURIComponent(m[1])) return send(404, { error: 'not found' });
    if (m[3]) { p.consumptionState = 1; return send(200, {}); }
    return send(200, { purchaseState: p.purchaseState, consumptionState: p.consumptionState, acknowledgementState: 1, obfuscatedExternalAccountId: accountIdFor(p.clientId), orderId: 'GPA.' + m[2].slice(-6) });
  }
  m = /\/purchases\/subscriptionsv2\/tokens\/([^/:]+)$/.exec(req.url);
  if (m) {
    const s = subs.get(decodeURIComponent(m[1]));
    if (!s) return send(404, {});
    return send(200, { subscriptionState: s.state, acknowledgementState: 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED', lineItems: [{ productId: 'talklive_plus', expiryTime: new Date(s.expiry).toISOString() }], externalAccountIdentifiers: { obfuscatedExternalAccountId: accountIdFor(s.clientId) } });
  }
  if (/:acknowledge$/.test(req.url)) return send(200, {});
  send(404, {});
});

function startServer(extraEnv) {
  const port = 7600 + Math.floor(Math.random() * 600);
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-playe2e-'));
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: {
      ...process.env, PORT: String(port), DATA_DIR: dataDir, DATABASE_URL: '', NODE_ENV: 'development', IDENTITY_SECRET,
      PLAY_API_BASE: `http://127.0.0.1:${google.address().port}/androidpublisher/v3/applications`,
      PLAY_TEST_ACCESS_TOKEN: 'test-access', PLAY_RTDN_SECRET: RTDN_SECRET, ...extraEnv,
    },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let errs = '';
  srv.stderr.on('data', (d) => { errs += d; });
  const base = `http://127.0.0.1:${port}`;
  return {
    base, srv, errs: () => errs,
    ready: async () => { for (let i = 0; i < 60; i++) { try { await fetch(base + '/healthz'); return; } catch (_) { await wait(250); } } },
    stop: () => { srv.kill('SIGKILL'); fs.rmSync(dataDir, { recursive: true, force: true }); },
  };
}

const post = async (base, url, body, headers = {}) => {
  const r = await fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  let j = null; try { j = await r.json(); } catch (_) { /* empty */ }
  return { status: r.status, json: j };
};
const status = async (base, clientId) => (await fetch(`${base}/premium-status?clientId=${clientId}&identityToken=${sign(clientId)}`)).json();
const rtdn = (n) => ({ message: { data: Buffer.from(JSON.stringify({ packageName: 'app.talklive', ...n })).toString('base64') } });

(async () => {
  await new Promise((r) => google.listen(0, '127.0.0.1', r));
  const S = startServer();
  try {
    await S.ready();
    const A = 'c_play_alice01';
    const B = 'c_play_bob0001';

    // Passes.
    const passTok = 'pass-token-' + crypto.randomBytes(12).toString('hex');
    products.set(passTok, { productId: 'pass_7d', clientId: A, purchaseState: 0, consumptionState: 0 });
    const v1 = await post(S.base, '/billing/play/verify', { clientId: A, identityToken: sign(A), purchaseToken: passTok, productId: 'pass_7d' });
    ok('a 7-day pass is granted', v1.status === 200 && v1.json.premium === true && Math.abs(v1.json.expiresAt - (Date.now() + 7 * DAY)) < 60000, v1);
    ok('the pass is consumed after the grant', products.get(passTok).consumptionState === 1 && calls.some((c) => /pass_7d.*:consume$/.test(c)));
    const v2 = await post(S.base, '/billing/play/verify', { clientId: A, identityToken: sign(A), purchaseToken: passTok, productId: 'pass_7d' });
    ok('replaying the token grants nothing more', v2.status === 200 && v2.json.expiresAt === v1.json.expiresAt, v2.json);
    const v3 = await post(S.base, '/billing/play/verify', { clientId: B, identityToken: sign(B), purchaseToken: passTok, productId: 'pass_7d' });
    ok('another profile cannot claim the pass', v3.status === 403, v3);
    const v4 = await post(S.base, '/billing/play/verify', { clientId: A, identityToken: 'f'.repeat(64), purchaseToken: passTok, productId: 'pass_7d' });
    ok('a wrong identity token is refused', v4.status === 403, v4);

    // RTDN auth.
    const bad = await post(S.base, '/billing/play/rtdn?secret=wrong-' + RTDN_SECRET.slice(6), rtdn({ voidedPurchaseNotification: { purchaseToken: passTok, productType: 2, refundType: 1 } }));
    ok('RTDN with a wrong secret is refused', bad.status === 403, bad.status);
    ok('...and changed nothing', (await status(S.base, A)).premium === true);

    // Refund of the pass.
    const voided = await post(S.base, '/billing/play/rtdn?secret=' + RTDN_SECRET, rtdn({ voidedPurchaseNotification: { purchaseToken: passTok, productType: 2, refundType: 1, orderId: 'GPA.1' } }));
    ok('a voided-pass notification is accepted', voided.status === 204, voided.status);
    ok('a refunded pass takes its days back', (await status(S.base, A)).premium === false);
    products.get(passTok).purchaseState = 0; // even if Google still said "purchased"
    const v5 = await post(S.base, '/billing/play/verify', { clientId: A, identityToken: sign(A), purchaseToken: passTok, productId: 'pass_7d' });
    ok('a refunded pass cannot be verified again', v5.status === 400 && (await status(S.base, A)).premium === false, v5);

    // Two passes, one refunded: the other's days stay.
    const t1 = 'pass-token-' + crypto.randomBytes(12).toString('hex');
    const t2 = 'pass-token-' + crypto.randomBytes(12).toString('hex');
    products.set(t1, { productId: 'pass_15d', clientId: B, purchaseState: 0, consumptionState: 0 });
    products.set(t2, { productId: 'pass_1d', clientId: B, purchaseState: 0, consumptionState: 0 });
    await post(S.base, '/billing/play/verify', { clientId: B, identityToken: sign(B), purchaseToken: t1, productId: 'pass_15d' });
    const both = await post(S.base, '/billing/play/verify', { clientId: B, identityToken: sign(B), purchaseToken: t2, productId: 'pass_1d' });
    await post(S.base, '/billing/play/rtdn?secret=' + RTDN_SECRET, rtdn({ voidedPurchaseNotification: { purchaseToken: t2, productType: 2, refundType: 1 } }));
    const left = await status(S.base, B);
    ok('refunding one of two passes keeps the other\'s days', left.premium === true && Math.abs(left.expiresAt - (both.json.expiresAt - DAY)) < 1000, { left, before: both.json.expiresAt });

    // Subscriptions.
    const C = 'c_play_carol01';
    const subTok = 'sub-token-' + crypto.randomBytes(12).toString('hex');
    subs.set(subTok, { clientId: C, state: 'SUBSCRIPTION_STATE_ACTIVE', expiry: Date.now() + 30 * DAY });
    const sv = await post(S.base, '/billing/play/verify', { clientId: C, identityToken: sign(C), purchaseToken: subTok, productId: 'talklive_plus' });
    ok('a subscription is granted', sv.status === 200 && sv.json.premium === true, sv);
    subs.get(subTok).state = 'SUBSCRIPTION_STATE_REVOKED';
    const rv = await post(S.base, '/billing/play/rtdn?secret=' + RTDN_SECRET, rtdn({ subscriptionNotification: { notificationType: 12, purchaseToken: subTok, subscriptionId: 'talklive_plus' } }));
    ok('a revoked-subscription notification ends Plus', rv.status === 204 && (await status(S.base, C)).premium === false, rv.status);

    // A voided subscription (productType 1) re-checks Google too.
    const D = 'c_play_dave001';
    const subTok2 = 'sub-token-' + crypto.randomBytes(12).toString('hex');
    subs.set(subTok2, { clientId: D, state: 'SUBSCRIPTION_STATE_ACTIVE', expiry: Date.now() + 30 * DAY });
    await post(S.base, '/billing/play/verify', { clientId: D, identityToken: sign(D), purchaseToken: subTok2, productId: 'talklive_plus' });
    subs.get(subTok2).state = 'SUBSCRIPTION_STATE_EXPIRED';
    await post(S.base, '/billing/play/rtdn?secret=' + RTDN_SECRET, rtdn({ voidedPurchaseNotification: { purchaseToken: subTok2, productType: 1, refundType: 1 } }));
    ok('a voided subscription is re-checked and ended', (await status(S.base, D)).premium === false);

    // Identity: Carol still has a Plus record (ended). Registering her
    // clientId without the token must not hand the identity over.
    const sock = io(S.base, { transports: ['websocket'], forceNew: true });
    const reg = await new Promise((r) => { sock.on('connect', () => sock.emit('register', { clientId: C, gender: 'male' })); sock.once('register-result', r); });
    ok('a profile with a Plus record cannot be registered without its token', reg && reg.ok === false && reg.reason === 'unverified', reg);
    sock.close();
    const errs = S.errs();
    ok('no server errors', !/TypeError|ReferenceError/.test(errs), errs.slice(-800));
  } catch (err) {
    console.error(err);
    failed++;
  } finally {
    S.stop();
  }

  // RTDN with OIDC: no bearer token -> refused, even with the right secret.
  const O = startServer({ PLAY_RTDN_AUDIENCE: 'https://talklive.app/billing/play/rtdn' });
  try {
    await O.ready();
    const r1 = await post(O.base, '/billing/play/rtdn?secret=' + RTDN_SECRET, rtdn({ testNotification: { version: '1.0' } }));
    ok('with PLAY_RTDN_AUDIENCE set, the secret alone is not enough', r1.status === 403, r1.status);
    const r2 = await post(O.base, '/billing/play/rtdn', rtdn({ testNotification: { version: '1.0' } }), { Authorization: 'Bearer not.a.jwt' });
    ok('a forged bearer token is refused', r2.status === 403, r2.status);
  } catch (err) {
    console.error(err);
    failed++;
  } finally {
    O.stop();
    google.close();
  }
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
  process.exit(failed ? 1 : 0);
})();
