/*
 * TalkLive payment log - one small entry per Plus purchase, renewal and cancel,
 * for the owner Plus tab (server/plus-stats.js). Plus is sold only through
 * Google Play (server/play-billing.js); the earlier Stripe checkout is gone, but
 * its premium records stay valid until they expire and still count as paid.
 */

// Nothing stored a payment as an event, only the current premium record. This
// wraps the store calls every purchase, renewal and cancel already goes
// through, and appends one small entry per money event to store.data.paymentLog
// (capped, oldest dropped). It changes no behaviour: the original call runs
// first and a logging failure is swallowed. Called once from admin.js.
const PAYMENT_LOG_MAX = 5000;
const DAY = 86400000;
let nameToCode = null;
function countryCode(c) {
  const v = String(c || '').trim();
  if (/^[A-Za-z]{2}$/.test(v)) return v.toUpperCase();
  if (!v) return '';
  if (!nameToCode) {
    nameToCode = new Map();
    try {
      const dn = new Intl.DisplayNames(['en'], { type: 'region' });
      for (let a = 65; a <= 90; a++) for (let b = 65; b <= 90; b++) {
        const cc = String.fromCharCode(a, b);
        const n = dn.of(cc);
        if (n && n !== cc) nameToCode.set(n.toLowerCase(), cc);
      }
    } catch (_) { /* no Intl region names: country stays a name */ }
  }
  return nameToCode.get(v.toLowerCase()) || '';
}

function installPaymentLog(store) {
  if (store._paymentLogInstalled) return;
  store._paymentLogInstalled = true;
  const plusStats = require('./plus-stats');
  function push(clientId, kind, plan, source, expiresAt) {
    const raw = (store.data.talkTime && store.data.talkTime[clientId] && store.data.talkTime[clientId].country) || '';
    const cc = countryCode(raw);
    const price = kind === 'cancelled' ? null : plusStats.listPrice(cc, plan);
    const log = store.data.paymentLog || (store.data.paymentLog = []);
    log.push({
      t: Date.now(), clientId, kind, plan, source, country: cc || String(raw).slice(0, 40) || '',
      currency: price ? price.currency : '', amount: price ? price.amount : 0, usd: price ? price.usd : 0,
      expiresAt: expiresAt || null,
    });
    if (log.length > PAYMENT_LOG_MAX) log.splice(0, log.length - PAYMENT_LOG_MAX);
  }
  const paidSource = (src) => src === 'stripe' || src === 'play' || src === 'play-pass';
  const wrap = (name, fn) => {
    const orig = store[name];
    if (typeof orig !== 'function') return;
    store[name] = function (clientId, arg, info) {
      let before = null;
      try { const e = store.data.premium[clientId]; before = e ? { expiresAt: e.expiresAt || 0, revokedAt: e.revokedAt || null } : null; } catch (_) { /* ignore */ }
      const out = orig.apply(this, arguments);
      try { fn(clientId, arg, info, before); } catch (_) { /* logging must never break a purchase */ }
      return out;
    };
  };
  const hasPrior = (clientId) => (store.data.paymentLog || []).some((e) => e.clientId === clientId && e.kind !== 'cancelled');
  // Subscription charge (Play active): only when the period moved forward.
  wrap('setPremium', (clientId, info, _x, before) => {
    if (!info || (info.source !== 'play' && info.source !== 'play-pass')) return;
    const exp = info.expiresAt || 0;
    if (info.lastEvent === 'play:pass') {
      const from = Math.max(Date.now(), before ? before.expiresAt : 0);
      const days = Math.round((exp - from) / DAY);
      const plan = days >= 11 ? 'pass_15d' : days >= 4 ? 'pass_7d' : 'pass_1d';
      return push(clientId, 'new', plan, 'play', exp);
    }
    if (!exp || (before && !before.revokedAt && exp <= before.expiresAt + 3600000)) return;
    const plan = exp - Date.now() > 200 * DAY ? 'yearly' : 'monthly';
    push(clientId, hasPrior(clientId) ? 'renewed' : 'new', plan, 'play', exp);
  });
  wrap('revokePremium', (clientId, info, _x, before) => {
    const e = store.data.premium[clientId];
    if (!e || !paidSource(e.source) || (before && before.revokedAt)) return;
    const prior = (store.data.paymentLog || []).findLast((x) => x.clientId === clientId && x.kind !== 'cancelled');
    push(clientId, 'cancelled', (prior && prior.plan) || 'monthly', e.source === 'stripe' ? 'stripe' : 'play', e.expiresAt);
  });
}

module.exports = { installPaymentLog };
