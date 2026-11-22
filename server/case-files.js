'use strict';
/*
 * Case files: the evidence behind every warning and ban.
 *
 * A warning or a ban on its own only says WHY in a line ("Auto: asked for
 * money"). The conversation that caused it, the reports that backed it and the
 * rule that fired are what the owner needs to judge an appeal, so each one gets
 * a frozen snapshot taken at the moment it was issued (the live transcript log
 * is a rolling window and the auto-mod's per-person memory fades).
 *
 * A case is { id, ts, kind: 'auto' | 'owner', dry, person, offense, action,
 * evidence, notes }. It points at the warning (action.warningId) and the ban
 * (action.banId); the ban holds the appeal thread, so the dashboard joins all
 * three and the owner sees offense -> evidence -> sanction -> appeal in one place.
 *
 * Kept small on purpose: the whole store is one document that is rewritten on
 * every save, so a case holds at most MAX_LINES conversation lines of
 * LINE_CHARS each. Bans (and the dry-run-free cases around them) are evicted
 * last.
 */
const crypto = require('crypto');

const MAX_CASES = 500;
const MAX_LINES = 24;
const LINE_CHARS = 200;
const MAX_REPORTS = 8;
const MAX_NOTES = 20;
const MAX_PAIRS = 3;
const CONVERSATION_WINDOW_MS = 6 * 3600000;
const REPORT_WINDOW_MS = 30 * 86400000;

const trunc = (s, n) => String(s == null ? '' : s).slice(0, n);

function createCaseFiles({ store }) {
  const list = () => {
    if (!Array.isArray(store.data.cases)) store.data.cases = [];
    return store.data.cases;
  };

  // The recent conversation(s) of one person: text chat and the speech lines
  // the speaker's own browser flagged on voice calls, oldest first.
  function conversation(clientIds, partnerIds, triggerText) {
    const ids = new Set(clientIds.filter(Boolean));
    if (!ids.size) return [];
    const since = Date.now() - CONVERSATION_WINDOW_MS;
    const wanted = new Set();
    const rows = [];
    // Pairs are discovered from the transcript itself when no partner is known
    // (an owner ban from the reports table, say): the newest few partners.
    const knownPairs = new Set();
    for (const cid of ids) for (const pid of partnerIds || []) if (pid && pid !== cid) knownPairs.add([cid, pid].sort().join('|'));
    let scanned = 0;
    for (const m of store.data.transcripts || []) {
      if (m.ts < since || ++scanned > 4000) break;
      if (!(m.kind === 'stranger' || m.kind === 'friend' || m.kind === 'moderation')) continue;
      const mine = ids.has(m.fromClientId) || ids.has(m.toClientId);
      if (!mine) continue;
      if (knownPairs.size) { if (!knownPairs.has(m.pair)) continue; }
      else if (!wanted.has(m.pair)) { if (wanted.size >= MAX_PAIRS) continue; wanted.add(m.pair); }
      rows.push(m);
      if (rows.length >= MAX_LINES * 2) break;
    }
    const needle = triggerText ? trunc(triggerText, 60) : '';
    return rows.slice(0, MAX_LINES).reverse().map((m) => ({
      ts: m.ts,
      who: ids.has(m.fromClientId) ? 'offender' : 'other',
      name: trunc(m.from, 40),
      kind: m.kind === 'moderation' ? 'call' : m.kind,
      text: trunc(m.text, LINE_CHARS),
      hit: !!(needle && ids.has(m.fromClientId) && String(m.text || '').includes(needle)) || undefined,
    }));
  }

  function reportsOn(clientIds) {
    const ids = new Set(clientIds.filter(Boolean));
    const since = Date.now() - REPORT_WINDOW_MS;
    const out = [];
    for (const r of store.data.reports || []) {
      if (r.ts < since) break;
      if (!r.reported || !ids.has(r.reported.clientId)) continue;
      out.push({
        id: r.id, ts: r.ts, reason: trunc(r.reason, 40), detail: trunc(r.detail, 300),
        reporter: trunc((r.reporter || {}).username, 40), reporterCountry: trunc((r.reporter || {}).country, 40),
        reporterId: (r.reporter || {}).clientId || null,
      });
      if (out.length >= MAX_REPORTS) break;
    }
    return out;
  }

  /**
   * opts: { kind, dry, person: { key, clientIds, account, username, country, ip },
   *   offense: { category, severity, title, summary, source, text, signals },
   *   action: { type: 'warning' | 'ban' | 'review', strike, minutes, warningId, banId, message },
   *   partnerIds, seconds }
   */
  function open(opts) {
    const person = opts.person || {};
    const clientIds = (person.clientIds || []).filter(Boolean);
    const offense = opts.offense || {};
    const rec = {
      id: crypto.randomUUID(),
      ts: Date.now(),
      kind: opts.kind === 'owner' ? 'owner' : 'auto',
      dry: !!opts.dry,
      person: {
        key: person.key || (person.account ? 'a:' + String(person.account).toLowerCase() : clientIds[0] ? 'c:' + clientIds[clientIds.length - 1] : ''),
        clientId: clientIds[clientIds.length - 1] || null,
        clientIds: clientIds.slice(-5),
        account: person.account ? String(person.account).toLowerCase() : null,
        username: trunc(person.username, 60) || null,
        country: trunc(person.country, 60) || null,
        ip: person.ip || null,
      },
      offense: {
        category: trunc(offense.category, 40) || 'other',
        severity: ['minor', 'major', 'critical'].includes(offense.severity) ? offense.severity : 'minor',
        title: trunc(offense.title, 120),
        summary: trunc(offense.summary, 400),
        source: trunc(offense.source, 40),
        text: trunc(offense.text, 300),
        signals: (offense.signals || []).slice(0, 8).map((s) => trunc(s, 160)),
      },
      action: {
        type: ['warning', 'ban', 'review'].includes((opts.action || {}).type) ? opts.action.type : 'review',
        strike: (opts.action || {}).strike || null,
        minutes: (opts.action || {}).minutes || null,
        warningId: (opts.action || {}).warningId || null,
        banId: (opts.action || {}).banId || null,
        message: trunc((opts.action || {}).message, 600) || null,
      },
      evidence: {
        conversation: conversation(clientIds, opts.partnerIds, offense.text),
        reports: reportsOn(clientIds),
        seconds: opts.seconds == null ? null : Number(opts.seconds) || null,
      },
      notes: [],
    };
    list().unshift(rec);
    prune();
    store.save();
    return rec;
  }

  // Evidence is bulky; when over the cap, drop the oldest case that did not end
  // in a real ban first, then the oldest of all.
  function prune() {
    const cases = list();
    while (cases.length > MAX_CASES) {
      let idx = -1;
      for (let i = cases.length - 1; i >= 0; i--) {
        if (!(cases[i].action.type === 'ban' && !cases[i].dry)) { idx = i; break; }
      }
      cases.splice(idx >= 0 ? idx : cases.length - 1, 1);
    }
  }

  // Later facts about the same case (the warning or ban was issued after the
  // record was opened, a dry run went live, the owner reversed it).
  function patch(id, fields) {
    const c = list().find((x) => x.id === id);
    if (!c) return null;
    if (fields.action) Object.assign(c.action, fields.action);
    if (fields.offense) Object.assign(c.offense, fields.offense);
    store.save();
    return c;
  }

  function addNote(id, text, by) {
    const c = list().find((x) => x.id === id);
    const t = trunc(String(text || '').trim(), 600);
    if (!c || !t) return null;
    c.notes.push({ ts: Date.now(), text: t, by: trunc(by, 40) || 'owner' });
    if (c.notes.length > MAX_NOTES) c.notes.shift();
    store.save();
    return c;
  }

  function dropDry() {
    const before = list().length;
    store.data.cases = list().filter((c) => !c.dry);
    return before - store.data.cases.length;
  }

  // ---- reading ----------------------------------------------------------------

  const banOf = (c) => (c.action.banId ? (store.data.bans || []).find((b) => b.id === c.action.banId) || null : null);
  const warningOf = (c) => (c.action.warningId ? (store.data.warnings || []).find((w) => w.id === c.action.warningId) || null : null);

  function banState(ban, now = Date.now()) {
    if (!ban) return null;
    if (ban.liftedAt) return 'lifted';
    return ban.expiresAt > now ? 'active' : 'expired';
  }
  function warningState(w) {
    if (!w) return null;
    if (w.withdrawnAt) return 'withdrawn';
    if (w.acknowledgedAt) return 'acknowledged';
    return w.deliveredAt ? 'delivered' : 'queued';
  }

  // One line per case for the list.
  function row(c, now = Date.now()) {
    const ban = banOf(c);
    const w = warningOf(c);
    const appeals = ban ? ban.appeals || [] : [];
    return {
      id: c.id, ts: c.ts, kind: c.kind, dry: c.dry,
      person: c.person, offense: { category: c.offense.category, severity: c.offense.severity, title: c.offense.title, source: c.offense.source },
      action: { type: c.action.type, strike: c.action.strike, minutes: c.action.minutes },
      banState: banState(ban, now), warningState: warningState(w),
      appeals: appeals.length, openAppeals: appeals.filter((a) => !a.reply).length,
      lines: c.evidence.conversation.length, reports: c.evidence.reports.length,
    };
  }

  function listRows({ q, filter, limit = 300 } = {}) {
    const now = Date.now();
    const needle = String(q || '').trim().toLowerCase();
    let rows = list().map((c) => row(c, now));
    const counts = {
      total: rows.length,
      auto: rows.filter((r) => r.kind === 'auto' && !r.dry).length,
      owner: rows.filter((r) => r.kind === 'owner').length,
      dry: rows.filter((r) => r.dry).length,
      activeBans: rows.filter((r) => r.banState === 'active').length,
      openAppeals: rows.reduce((n, r) => n + r.openAppeals, 0),
    };
    if (filter === 'auto') rows = rows.filter((r) => r.kind === 'auto' && !r.dry);
    else if (filter === 'owner') rows = rows.filter((r) => r.kind === 'owner');
    else if (filter === 'dry') rows = rows.filter((r) => r.dry);
    else if (filter === 'bans') rows = rows.filter((r) => r.banState === 'active');
    else if (filter === 'appeals') rows = rows.filter((r) => r.appeals > 0);
    if (needle) {
      rows = rows.filter((r) => [r.person.username, r.person.account, r.person.clientId, r.person.country, r.offense.title, r.offense.category]
        .some((v) => v && String(v).toLowerCase().includes(needle)));
    }
    return { cases: rows.slice(0, limit), counts, now };
  }

  // Everything about one case, joined to the live warning, ban and appeals.
  function detail(id) {
    const c = list().find((x) => x.id === id);
    if (!c) return null;
    const now = Date.now();
    const ban = banOf(c);
    const w = warningOf(c);
    const pids = new Set(c.person.clientIds || []);
    const acct = c.person.account;
    const same = (x) => (x.clientId && pids.has(x.clientId)) || (acct && x.account === acct);
    const others = list().filter((x) => x.id !== c.id && (x.person.clientIds || []).some((i) => pids.has(i) || (acct && x.person.account === acct))).slice(0, 25).map((x) => row(x, now));
    let reportsTotal = 0;
    for (const r of store.data.reports || []) if (r.reported && pids.has(r.reported.clientId)) reportsTotal++;
    const safeBan = ban ? (({ deviceId, ...b }) => ({ ...b, deviceBound: !!deviceId }))(ban) : null;
    return {
      case: c, row: row(c, now), ban: safeBan, banState: banState(ban, now), warning: w, warningState: warningState(w),
      history: {
        reportsTotal,
        warnings: (store.data.warnings || []).filter(same).length,
        bans: (store.data.bans || []).filter((b) => (b.clientId && pids.has(b.clientId)) || (acct && b.account === acct)).length,
        otherCases: others,
      },
      now,
    };
  }

  return { open, patch, addNote, dropDry, listRows, detail, conversation, reportsOn, _list: list };
}

module.exports = { createCaseFiles, MAX_CASES, MAX_LINES };
