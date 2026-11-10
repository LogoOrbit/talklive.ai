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

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
