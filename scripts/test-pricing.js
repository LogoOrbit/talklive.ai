// Regional Plus prices.
//
//   node scripts/test-pricing.js
const pricing = require('../server/pricing');
const table = require('../server/pricing-table.json');

let failed = 0;
const ok = (name, cond, extra) => { if (!cond) failed++; console.log(cond ? 'PASS' : 'FAIL', name, cond ? '' : JSON.stringify(extra)); };

const us = pricing.forCountry('US');
const india = pricing.forCountry('in');
ok('US is charged in dollars', us.currency === 'USD' && us.monthly.amount === 9.99, us);
ok('India is charged in rupees, far below the US price', india.currency === 'INR' && india.monthly.amount / 84 < 3, india);
ok('an unknown country gets the default price', pricing.forCountry('ZZ').monthly.amount === 9.99);
ok('a low-price country without its own row gets the low dollar price', pricing.forCountry('IR').monthly.amount === 1.99);
ok('every price is a plain amount with a label', [us.monthly, us.yearly, ...us.passes].every((x) => x.amount > 0 && x.label), us);
ok('every row is ordered: day < week < 15 days', Object.entries(table.countries).every(([, r]) => r[2] < r[3] && r[3] < r[4]),
  Object.entries(table.countries).filter(([, r]) => !(r[2] < r[3] && r[3] < r[4])).map(([k]) => k));
// Warning only (Play's own prices): a 15-day pass costing more than a month makes the monthly plan pointless.
const passOverMonth = Object.entries(table.countries).filter(([, r]) => r[4] >= r[1]).map(([k]) => k);
if (passOverMonth.length) console.log('WARN 15-day pass costs at least the monthly plan in:', passOverMonth.join(' '));
ok('no monthly price is far above the US one in dollars (Europe includes VAT)', Object.entries(table.countries).every(([, r]) => r[1] / r[5] <= 11.5),
  Object.entries(table.countries).filter(([, r]) => r[1] / r[5] > 11.5).map(([k, r]) => [k, (r[1] / r[5]).toFixed(2)]));

// The yearly plan: 12 months for the price of 7.
const rows = [['default', table.default], ['low', table.low], ...Object.entries(table.countries)];
const badRatio = rows.filter(([k, r]) => { const y = pricing.yearlyPrice(r[1]); return !(y >= r[1] * 6.5 && y <= r[1] * 7.5); }).map(([k]) => k);
ok('every yearly price is 6.5x to 7.5x the monthly', badRatio.length === 0, badRatio);
const badCountry = Object.keys(table.countries).filter((c) => { const p = pricing.forCountry(c); return p.yearly.amount !== table.countries[c][6] || p.yearly.days !== 365 || p.yearly.id !== 'yearly'; });
ok('forCountry carries the yearly plan from the table for every country', badCountry.length === 0, badCountry);
ok('US yearly is 69.99, per month 5.83, save 42%', us.yearly.amount === 69.99 && us.yearly.perMonthLabel === '$5.83' && us.yearly.savePercent === 42, us.yearly);
ok('India yearly is 1399', india.yearly.amount === 1399 && india.yearly.label === '\u20b91,399', india.yearly);
ok('Pakistan yearly is 4199', pricing.forCountry('PK').yearly.amount === 4199);
ok('yearly ends like the monthly: .99 stays .99, 9 stays 9', pricing.yearlyPrice(9.99) === 69.99 && pricing.yearlyPrice(19.9) === 139.9 && pricing.yearlyPrice(199) === 1399 && pricing.yearlyPrice(4490) === 31490);
ok('Japan yearly is Play\'s 11200', pricing.forCountry('JP').yearly.amount === 11200);
ok('save percent is sane everywhere', Object.keys(table.countries).every((c) => { const v = pricing.forCountry(c).yearly.savePercent; return v >= 30 && v <= 50; }));

// Honest anchors: struck-through figures are computed from real prices, only when truly higher.
ok('US yearly anchor is 12 x 9.99 = 119.88 and matches the saving', us.yearly.compareAt && us.yearly.compareAt.amount === 119.88 && us.yearly.compareAt.savePercent === us.yearly.savePercent && us.yearly.compareAt.label === '$119.88', us.yearly);
ok('US 7-day pass anchor is seven 1-day passes', us.passes[1].compareAt && Math.abs(us.passes[1].compareAt.amount - 13.93) < 1e-9 && us.passes[1].compareAt.savePercent === 64 && us.passes[1].compareAt.basisLabel === 'vs 1-day passes', us.passes[1]);
ok('1-day pass and monthly have no anchor', us.passes[0].compareAt === undefined && us.monthly.compareAt === undefined);
const anchors = [];
for (const c of Object.keys(table.countries)) { const p = pricing.forCountry(c); anchors.push(p.yearly, p.passes[1], p.passes[2]); }
ok('an anchor is only ever present when it is higher than the price', anchors.every((x) => !x.compareAt || (x.compareAt.amount > x.amount && x.compareAt.savePercent >= 1 && x.compareAt.savePercent <= 99)));
ok('yearly anchor equals twelve monthly prices exactly', Object.keys(table.countries).every((c) => { const p = pricing.forCountry(c); return !p.yearly.compareAt || Math.abs(p.yearly.compareAt.amount - p.monthly.amount * 12) < 1e-6; }));
ok('pass anchors equal the 1-day price times the days', Object.keys(table.countries).every((c) => { const p = pricing.forCountry(c); return [[1, 7], [2, 15]].every(([i, d]) => !p.passes[i].compareAt || Math.abs(p.passes[i].compareAt.amount - p.passes[0].amount * d) < 1e-6); }));
ok('a market where the 7-day pass costs a month still never claims a false saving', (() => { const p = pricing.forCountry('AR'); return !p.passes[1].compareAt || p.passes[1].compareAt.amount > p.passes[1].amount; })());
ok('zero-decimal anchor has no decimals', (() => { const a = pricing.forCountry('JP').yearly.compareAt; return !!a && a.amount === 19200 && !/[.,]\d{1,2}$/.test(a.label); })(), pricing.forCountry('JP').yearly);
console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
