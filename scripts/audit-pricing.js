#!/usr/bin/env node
// Audit of TalkLive Plus prices per country (server/pricing-table.json, which
// mirrors what Google Play charges) and a proposed fix for the passes.
//
// Play prices one-time passes separately from the subscription. Where the
// subscription was set by hand for a market but the passes were converted from
// dollars, a 7-day pass can cost more than a month of Plus (India: a month is
// INR 199, a week INR 470). This lists every such country and proposes pass
// prices derived from the local monthly price instead: 1 day = 20%, 7 days =
// 50%, 15 days = 70% of a month - the same ladder as the US (9.99 -> 1.99 /
// 4.99 / 6.99) - rounded to the market's own price-point style.
//
// Nothing here changes a live price. The proposal is a sheet to review and
// enter in Play Console; once Play charges it, update server/pricing-table.json
// (and the app's LocalPrice table) from Play, as before. Check each proposed
// price against Play's minimum for the currency when entering it.
//
//   node scripts/audit-pricing.js            report
//   node scripts/audit-pricing.js --write    also write android-native/PLAY_PASS_PRICES_PROPOSED.csv
'use strict';
const fs = require('fs');
const path = require('path');
const table = require('../server/pricing-table.json');

const RATIOS = { pass_1d: 0.2, pass_7d: 0.5, pass_15d: 0.7 };
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND', 'UGX', 'CLP', 'XAF', 'XOF', 'RWF', 'PYG']);

// A price in the same style as the monthly one: x.99 stays x.99, a whole
// number ending in 9 stays ending in 9, other whole numbers round to two
// significant digits.
function pricePoint(raw, monthly, currency, above = 0) {
  let p;
  if (!Number.isInteger(monthly) && !ZERO_DECIMAL.has(currency)) {
    // Nearest x.<same cents> to the raw amount; below 5 a month, steps of
    // half a unit (0.49, 0.99, 1.49 ...) so three passes fit under the month.
    const unit = monthly < 5 ? 0.5 : 1;
    const ending = monthly < 5 ? 0.49 : Math.round((monthly % 1) * 100) / 100;
    const base = Math.floor(raw / unit) * unit;
    p = [base - unit, base, base + unit].map((w) => w + ending).filter((x) => x > 0)
      .sort((a, b) => Math.abs(a - raw) - Math.abs(b - raw))[0];
    while (p <= above + 1e-9) p += unit;
    return Math.round(p * 100) / 100;
  }
  const digits = String(Math.round(raw)).length;
  const step = 10 ** Math.max(0, digits - 2);
  p = Math.max(step, Math.round(raw / step) * step);
  if (monthly % 10 === 9 && p >= 10) p -= step >= 10 ? step / 10 : 1;
  while (p <= above) p += step;
  return p;
}

function ladderProblems(m, d1, d7, d15) {
  const out = [];
  if (d15 >= m) out.push('15-day >= month');
  if (d7 >= m) out.push('7-day >= month');
  if (d1 >= m * 0.5) out.push('1-day >= half a month');
  if (!(d1 < d7 && d7 < d15)) out.push('not ordered');
  return out;
}

// Each pass strictly dearer than the shorter one before it.
function propose(row) {
  const [currency, monthly] = row;
  const out = {};
  let prev = 0;
  for (const [id, r] of Object.entries(RATIOS)) prev = out[id] = pricePoint(monthly * r, monthly, currency, prev);
  return out;
}

function audit() {
  const rows = [['(default)', table.default], ['(low-price list)', table.low], ...Object.entries(table.countries)];
  return rows.map(([cc, row]) => {
    const [currency, monthly, d1, d7, d15] = row;
    const problems = ladderProblems(monthly, d1, d7, d15);
    return { cc, currency, monthly, current: { pass_1d: d1, pass_7d: d7, pass_15d: d15 }, problems, proposed: propose(row) };
  });
}

if (require.main === module) {
  const results = audit();
  const bad = results.filter((r) => r.problems.length);
  console.log(`${results.length} price rows, ${bad.length} with a pass ladder that undercuts the monthly plan:\n`);
  for (const r of bad) {
    const c = r.current, p = r.proposed;
    console.log(`${r.cc.padEnd(4)} ${r.currency} month ${r.monthly}: passes ${c.pass_1d} / ${c.pass_7d} / ${c.pass_15d}`
      + `  -> proposed ${p.pass_1d} / ${p.pass_7d} / ${p.pass_15d}   (${r.problems.join(', ')})`);
  }
  if (process.argv.includes('--write')) {
    const out = path.join(__dirname, '..', 'android-native', 'PLAY_PASS_PRICES_PROPOSED.csv');
    const lines = ['country,currency,plus_monthly,current_pass_1d,current_pass_7d,current_pass_15d,proposed_pass_1d,proposed_pass_7d,proposed_pass_15d,problems'];
    for (const r of bad) {
      lines.push([r.cc, r.currency, r.monthly, r.current.pass_1d, r.current.pass_7d, r.current.pass_15d,
        r.proposed.pass_1d, r.proposed.pass_7d, r.proposed.pass_15d, '"' + r.problems.join('; ') + '"'].join(','));
    }
    fs.writeFileSync(out, lines.join('\n') + '\n');
    console.log(`\nwrote ${path.relative(process.cwd(), out)} (${bad.length} rows)`);
  }
}

module.exports = { audit, propose, pricePoint, ladderProblems };
