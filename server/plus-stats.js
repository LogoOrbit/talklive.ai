'use strict';
/*
 * Owner "Plus" tab: pure aggregation over the premium records and the payment
 * log (store.data.paymentLog, written by billing.js). No store access here, so
 * it is unit tested (scripts/test-plus-stats.js). Money is ESTIMATED: the log
 * records the list price for the buyer's country at the time, converted to USD
 * with the perUsd rate in pricing-table.json, not what the card was charged.
 */
const TABLE = require('./pricing-table.json');

const DAY = 86400000;
const PAID = new Set(['stripe', 'play', 'play-pass']);
const PASS_PLANS = ['pass_1d', 'pass_7d', 'pass_15d'];
const PLAN_COLUMN = { monthly: 1, pass_1d: 2, pass_7d: 3, pass_15d: 4 };
const LOW = new Set(TABLE.lowCountries || []);

function tableRow(cc) {
  const c = String(cc || '').toUpperCase();
  return TABLE.countries[c] || (LOW.has(c) ? TABLE.low : TABLE.default);
}

/** List price in the buyer's currency plus its USD estimate. Yearly is 7 months. */
function listPrice(cc, plan) {
  const row = tableRow(cc);
  const [currency, monthly, , , , perUsd] = row;
  let amount;
  if (plan === 'yearly') amount = monthly * 7;
  else if (PLAN_COLUMN[plan]) amount = row[PLAN_COLUMN[plan]];
  else return null;
  return { currency, amount, usd: perUsd ? Math.round(amount / perUsd * 100) / 100 : 0 };
}

const planKind = (p) => (p === 'monthly' || p === 'yearly' ? 'subscription' : 'pass');

/** Mask an email or username for display: "a***@example.com". */
function mask(s) {
  const v = String(s || '');
  const at = v.indexOf('@');
  if (at > 0) return v[0] + '***' + v.slice(at);
  return v.length > 3 ? v.slice(0, 2) + '***' : v;
}

/**
 * premium: store.data.premium. log: payment log, oldest first. Returns the
 * tiles for the tab; `empty` is true when there is nothing paid to show.
 */
function summarize({ premium, log, now = Date.now(), activeAccounts30 = 0 }) {
  const entries = Array.isArray(log) ? log : [];
  // Latest payment per person, to know what plan and country an active record is.
  const last = new Map();
  for (const e of entries) if (e.kind !== 'cancelled') last.set(e.clientId, e);

  const active = { total: 0, monthly: 0, yearly: 0, passes: { pass_1d: 0, pass_7d: 0, pass_15d: 0 }, stripe: 0, play: 0, unknownPlan: 0 };
  let free = 0; let plusAll = 0; let mrr = 0;
  const exp = { in7: 0, expired7: 0, expired30: 0 };
  for (const cid in premium || {}) {
    const p = premium[cid];
    if (!p) continue;
    const live = !p.revokedAt && (!p.expiresAt || p.expiresAt > now);
    if (live) plusAll++;
    const paid = PAID.has(p.source) || (!p.source && p.subscriptionId);
    if (!paid) { if (live) free++; continue; }
    if (live) {
      active.total++;
      const src = p.source === 'stripe' || (!p.source && p.subscriptionId) ? 'stripe' : 'play';
      active[src]++;
      const l = last.get(cid);
      let plan = l && l.plan;
      if (!plan) plan = p.source === 'play-pass' ? 'pass_7d' : 'monthly';
      if (!l) active.unknownPlan++;
      if (plan === 'monthly') { active.monthly++; mrr += (l ? l.usd : (listPrice('', 'monthly') || {}).usd) || 0; }
      else if (plan === 'yearly') { active.yearly++; mrr += ((l ? l.usd : (listPrice('', 'yearly') || {}).usd) || 0) / 12; }
      else if (active.passes[plan] !== undefined) active.passes[plan]++;
      if (p.expiresAt && p.expiresAt - now < 7 * DAY) exp.in7++;
    } else if (!p.revokedAt && p.expiresAt) {
      if (now - p.expiresAt < 7 * DAY) exp.expired7++;
      if (now - p.expiresAt < 30 * DAY) exp.expired30++;
    }
  }
  const ev = { d7: { new: 0, renewed: 0, cancelled: 0 }, d30: { new: 0, renewed: 0, cancelled: 0 } };
  let revenue30 = 0; let revenueAll = 0;
  const byCountry = new Map();
  for (const e of entries) {
    const age = now - e.t;
    if (e.kind === 'new' || e.kind === 'renewed') revenueAll += e.usd || 0;
    if (age > 30 * DAY || age < 0) continue;
    ev.d30[e.kind] = (ev.d30[e.kind] || 0) + 1;
    if (age <= 7 * DAY) ev.d7[e.kind] = (ev.d7[e.kind] || 0) + 1;
    if (e.kind === 'new' || e.kind === 'renewed') {
      revenue30 += e.usd || 0;
      const c = e.country || 'Unknown';
      const r = byCountry.get(c) || { country: c, usd: 0, payments: 0 };
      r.usd += e.usd || 0; r.payments++;
      byCountry.set(c, r);
    }
  }
  const r2 = (n) => Math.round(n * 100) / 100;
  const top = [...byCountry.values()].sort((a, b) => b.usd - a.usd).slice(0, 10).map((r) => ({ ...r, usd: r2(r.usd) }));
  return {
    empty: entries.length === 0 && active.total === 0,
    active, freePlus: free, plusAll, activeAccounts30,
    conversion: activeAccounts30 > 0 ? Math.round(plusAll / activeAccounts30 * 1000) / 10 : null,
    events: ev, expiring: exp,
    mrrUsd: r2(mrr), revenue30Usd: r2(revenue30), revenueLoggedUsd: r2(revenueAll),
    byCountry: top, logged: entries.length,
    note: 'Estimated from list prices converted to USD, not from card receipts.',
  };
}

/** Case-insensitive paging over rows: `hay(row)` gives the searchable text. */
function page(rows, { q = '', page: pg = 1, size = 50 } = {}, hay) {
  const needle = String(q || '').trim().toLowerCase();
  size = Math.min(200, Math.max(1, Number(size) || 50));
  const total = needle ? rows.filter((r) => hay(r).toLowerCase().includes(needle)).length : rows.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const p = Math.min(pages, Math.max(1, Number(pg) || 1));
  const out = [];
  let seen = 0;
  const from = (p - 1) * size;
  for (const r of rows) {
    if (needle && !hay(r).toLowerCase().includes(needle)) continue;
    if (seen >= from && out.length < size) out.push(r);
    seen++;
    if (out.length >= size) break;
  }
  return { rows: out, total, page: p, pages, size };
}

module.exports = { summarize, listPrice, planKind, mask, page, PAID, PASS_PLANS };
