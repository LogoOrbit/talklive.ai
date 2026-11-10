// Regional Plus prices and the one-time pass webhook.
//
//   node scripts/test-pricing.js
const pricing = require('../server/pricing');
const billing = require('../server/billing');
const table = require('../server/pricing-table.json');

let failed = 0;
const ok = (name, cond, extra) => { if (!cond) failed++; console.log(cond ? 'PASS' : 'FAIL', name, cond ? '' : JSON.stringify(extra)); };

const us = pricing.forCountry('US');
const india = pricing.forCountry('in');
ok('US is charged in dollars', us.currency === 'USD' && us.monthly.amount === 9.99, us);
ok('India is charged in rupees, far below the US price', india.currency === 'INR' && india.monthly.amount / 84 < 3, india);
ok('an unknown country gets the default price', pricing.forCountry('ZZ').monthly.amount === 9.99);
ok('a low-price country without its own row gets the low dollar price', pricing.forCountry('IR').monthly.amount === 1.99);
ok('a pass too small for a card payment is not sold on the website', india.passes[0].web === false && pricing.stripeAmount('IN', 'pass_1d') === null);
ok('Stripe gets hundredths for rupees', pricing.stripeAmount('IN', 'monthly').unit_amount === 19900);
ok('Stripe gets whole units for yen', pricing.stripeAmount('JP', 'pass_7d').unit_amount === 750);
ok('every row is ordered: day < week < 15 days < month', Object.entries(table.countries).every(([, r]) => r[2] < r[3] && r[3] < r[4] && r[4] < r[1]),
  Object.entries(table.countries).filter(([, r]) => !(r[2] < r[3] && r[3] < r[4] && r[4] < r[1])).map(([k]) => k));
ok('no monthly price is far above the US one in dollars (Europe includes VAT)', Object.entries(table.countries).every(([, r]) => r[1] / r[5] <= 11.5),
  Object.entries(table.countries).filter(([, r]) => r[1] / r[5] > 11.5).map(([k, r]) => [k, (r[1] / r[5]).toFixed(2)]));

const paid = { type: 'checkout.session.completed', data: { object: { mode: 'payment', payment_status: 'paid', metadata: { clientId: 'c_x', pass: 'pass_7d' } } } };
ok('a paid pass is recognised with its days', JSON.stringify(billing.passFromEvent(paid)) === JSON.stringify({ clientId: 'c_x', pass: 'pass_7d', days: 7 }));
ok('an unpaid pass grants nothing', billing.passFromEvent({ ...paid, data: { object: { ...paid.data.object, payment_status: 'unpaid' } } }) === null);
ok('a made-up pass grants nothing', billing.passFromEvent({ ...paid, data: { object: { ...paid.data.object, metadata: { clientId: 'c_x', pass: 'pass_999d' } } } }) === null);
ok('a subscription checkout is not a pass', billing.passFromEvent({ ...paid, data: { object: { mode: 'subscription', metadata: { clientId: 'c_x' } } } }) === null);

// The yearly plan: 12 months for the price of 7.
const rows = [['default', table.default], ['low', table.low], ...Object.entries(table.countries)];
const badRatio = rows.filter(([k, r]) => { const y = pricing.yearlyPrice(r[1]); return !(y >= r[1] * 6.5 && y <= r[1] * 7.5); }).map(([k]) => k);
ok('every yearly price is 6.5x to 7.5x the monthly', badRatio.length === 0, badRatio);
const badCountry = Object.keys(table.countries).filter((c) => { const p = pricing.forCountry(c); return p.yearly.amount !== pricing.yearlyPrice(p.monthly.amount) || p.yearly.days !== 365 || p.yearly.id !== 'yearly'; });
ok('forCountry carries the yearly plan for every country', badCountry.length === 0, badCountry);
ok('US yearly is 69.99, per month 5.83, save 42%', us.yearly.amount === 69.99 && us.yearly.perMonthLabel === '$5.83' && us.yearly.savePercent === 42, us.yearly);
ok('India yearly is 1399', india.yearly.amount === 1399 && india.yearly.label === '\u20b91,399', india.yearly);
ok('Pakistan yearly is 4199', pricing.forCountry('PK').yearly.amount === 4199);
ok('yearly ends like the monthly: .99 stays .99, 9 stays 9', pricing.yearlyPrice(9.99) === 69.99 && pricing.yearlyPrice(19.9) === 139.9 && pricing.yearlyPrice(199) === 1399 && pricing.yearlyPrice(4490) === 31490);
ok('yen yearly is a round 10400', pricing.forCountry('JP').yearly.amount === 10400);
ok('Stripe gets hundredths for yearly rupees', pricing.stripeAmount('IN', 'yearly').unit_amount === 139900 && pricing.stripeAmount('IN', 'yearly').days === 365);
ok('Stripe gets whole units for yearly yen', pricing.stripeAmount('JP', 'yearly').unit_amount === 10400);
ok('Stripe gets hundredths for yearly dollars', pricing.stripeAmount('US', 'yearly').unit_amount === 6999 && pricing.stripeAmount('US', 'yearly').currency === 'usd');
ok('save percent is sane everywhere', Object.keys(table.countries).every((c) => { const v = pricing.forCountry(c).yearly.savePercent; return v >= 38 && v <= 46; }));

// A yearly invoice grants a year, from Stripe's own period end.
const NOW = 1_800_000_000_000;
const yearEnd = Math.floor((NOW + 365 * 86400000) / 1000);
const yearInvoice = { type: 'invoice.paid', data: { object: { metadata: { clientId: 'c_y' }, subscription: 'sub_y', lines: { data: [{ period: { end: yearEnd } }] } } } };
const yd = billing.decide(yearInvoice);
const ystep = billing.nextPremium(null, yd, NOW, NOW);
ok('a yearly invoice grants about 365 days', yd.action === 'grant' && ystep.op === 'set' && Math.round((ystep.info.expiresAt - NOW) / 86400000) === 365, ystep);
const yrenew = billing.nextPremium({ source: 'stripe', expiresAt: NOW + 86400000, subscriptionId: 'sub_y', stripeEventAt: NOW - 1000 }, yd, NOW, NOW);
ok('a yearly renewal replaces the old end, not a day', yrenew.op === 'set' && yrenew.info.expiresAt === yearEnd * 1000, yrenew);

// The Stripe call for a yearly plan: a yearly recurring price at the local amount.
(async () => {
  const sent = [];
  const realFetch = global.fetch;
  global.fetch = async (url, opts) => { sent.push(String(opts.body)); return { ok: true, json: async () => ({ url: 'https://checkout.example/s' }) }; };
  try {
    await billing.createCheckout({ clientId: 'c_y', plan: 'yearly', origin: 'https://x.test', country: 'IN' });
    const form = new URLSearchParams(sent[0]);
    ok('yearly checkout is a yearly subscription at the rupee price',
      form.get('mode') === 'subscription' && form.get('line_items[0][price_data][recurring][interval]') === 'year' &&
      form.get('line_items[0][price_data][unit_amount]') === '139900' && form.get('line_items[0][price_data][currency]') === 'inr' &&
      form.get('line_items[0][price_data][product_data][name]') === 'TalkLive Plus (yearly)', sent[0]);
    await billing.createCheckout({ clientId: 'c_y', plan: 'monthly', origin: 'https://x.test', country: 'IN' });
    ok('monthly checkout is still monthly', new URLSearchParams(sent[1]).get('line_items[0][price_data][recurring][interval]') === 'month');
    let bad = null;
    await billing.createCheckout({ clientId: 'c_y', plan: 'constructor', origin: 'https://x.test', country: 'IN' }).catch((e) => { bad = e; });
    ok('an unknown plan is refused', bad && bad.status === 400);
  } finally {
    global.fetch = realFetch;
  }
  console.log(failed ? `\n${failed} failed` : '\nall passed');
  process.exit(failed ? 1 : 0);
})();
