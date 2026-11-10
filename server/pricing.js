'use strict';
/*
 * What TalkLive Plus costs where: one monthly plan and three passes, priced
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

// Everything a page needs to show prices for one country.
function forCountry(country) {
  const [currency, monthly, d1, d7, d15, perUsd] = row(country);
  const item = (id, amount, days) => ({ id, days, amount, label: format(amount, currency), web: amount / perUsd >= WEB_MIN_USD });
  return {
    country: String(country || '').toUpperCase() || 'XX',
    currency,
    monthly: item('monthly', monthly, 30),
    passes: [item('pass_1d', d1, 1), item('pass_7d', d7, 7), item('pass_15d', d15, 15)],
  };
}

// The amount in the unit Stripe wants, or null if this is not sold on the web.
function stripeAmount(country, id) {
  const p = forCountry(country);
  const it = id === 'monthly' ? p.monthly : p.passes.find((x) => x.id === id);
  if (!it || !it.web) return null;
  return { currency: p.currency.toLowerCase(), unit_amount: Math.round(it.amount * (ZERO_DECIMAL.has(p.currency) ? 1 : 100)), days: it.days, label: it.label };
}

module.exports = { forCountry, stripeAmount, format, PASS_DAYS, ZERO_DECIMAL };
