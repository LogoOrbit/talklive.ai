'use strict';
/*
 * What TalkLive Plus costs where: a monthly and a yearly plan and three passes, priced
 * for each market rather than converted from dollars (server/pricing-table.json).
 * The website shows these, Stripe charges them, and the Android app carries
 * the same table for when Google Play cannot list its own prices.
 */
const TABLE = require('./pricing-table.json');

// Stripe takes these in whole units; everything else in hundredths.
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND', 'UGX', 'CLP', 'XAF', 'XOF', 'RWF', 'PYG']);
// A card payment under about half a dollar is refused, and the fixed fee would
// take most of it anyway, so the website sells nothing cheaper than this.
const WEB_MIN_USD = 0.6;
const LOW = new Set(TABLE.lowCountries);
const PASS_DAYS = { pass_1d: 1, pass_7d: 7, pass_15d: 15 };

function row(country) {
  const cc = String(country || '').toUpperCase();
  return TABLE.countries[cc] || (LOW.has(cc) ? TABLE.low : TABLE.default);
}

function format(amount, currency, locale) {
  const digits = ZERO_DECIMAL.has(currency) || Number.isInteger(amount) ? 0 : 2;
  try {
    return new Intl.NumberFormat(locale || 'en', { style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits, currencyDisplay: 'narrowSymbol' }).format(amount);
  } catch (_) {
    return `${currency} ${amount}`;
  }
}

// The yearly plan is 12 months for the price of 7, put on a natural price
// point in the same style as the monthly price (computed, so there is no
// second column to keep in step with the table):
//  - with decimals (9.99, 19.9): keep the ending, round the whole part up;
//  - ending in 9 after any trailing zeros (199, 4490, 7900): keep that 9;
//  - otherwise round to about three digits (1480 -> 10400).
function yearlyPrice(monthly) {
  const raw = monthly * 7;
  if (!Number.isInteger(monthly)) {
    const cents = Math.round(monthly * 100);
    const gap = (100 - (cents % 100)) % 100; // distance up to the next whole unit
    return (Math.ceil((cents * 7 + gap) / 100) * 100 - gap) / 100;
  }
  let zeros = 0;
  let base = monthly;
  while (base >= 10 && base % 10 === 0) { base /= 10; zeros++; }
  const unit = 10 ** zeros;
  if (base % 10 === 9) {
    const step = unit * 10;
    return Math.ceil((raw + unit) / step) * step - unit;
  }
  const digits = String(raw).length;
  const step = 10 ** (digits <= 3 ? digits - 2 : digits - 3);
  return Math.round(raw / step) * step;
}

// Yearly divided by 12, tidied for display: whole units once it is large.
function perMonth(yearly, currency) {
  const m = yearly / 12;
  return ZERO_DECIMAL.has(currency) || m >= 100 ? Math.round(m) : Math.round(m * 100) / 100;
}

// Everything a page needs to show prices for one country.
function forCountry(country) {
  const [currency, monthly, d1, d7, d15, perUsd] = row(country);
  const item = (id, amount, days) => ({ id, days, amount, label: format(amount, currency), web: amount / perUsd >= WEB_MIN_USD });
  const yearly = yearlyPrice(monthly);
  return {
    country: String(country || '').toUpperCase() || 'XX',
    currency,
    monthly: item('monthly', monthly, 30),
    yearly: {
      ...item('yearly', yearly, 365),
      perMonthLabel: format(perMonth(yearly, currency), currency),
      savePercent: Math.round(100 - (yearly * 100) / (monthly * 12)),
    },
    passes: [item('pass_1d', d1, 1), item('pass_7d', d7, 7), item('pass_15d', d15, 15)],
  };
}

// The amount in the unit Stripe wants, or null if this is not sold on the web.
function stripeAmount(country, id) {
  const p = forCountry(country);
  const it = id === 'monthly' ? p.monthly : id === 'yearly' ? p.yearly : p.passes.find((x) => x.id === id);
  if (!it || !it.web) return null;
  return { currency: p.currency.toLowerCase(), unit_amount: Math.round(it.amount * (ZERO_DECIMAL.has(p.currency) ? 1 : 100)), days: it.days, label: it.label };
}

module.exports = { forCountry, stripeAmount, yearlyPrice, perMonth, format, PASS_DAYS, ZERO_DECIMAL };
