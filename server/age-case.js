'use strict';
// Age disputes: a person flagged as a possible minor says they are 18+, and a
// moderator decides from evidence. No third party is involved, so nothing here
// PROVES an age. It keeps a defensible record and fails safe:
//
//   open        flagged; restricted until a moderator decides
//   restricted  moderator confirmed the flag; stays restricted
//   cleared     moderator found the evidence did not support the flag
//
// A claim ("I am 18+") is recorded but never lifts anything by itself.
// A cleared person is flagged again by new evidence (flag() reopens the case).

const MAX_EVIDENCE = 30;
const MAX_CLAIMS = 10;
const MAX_DECISIONS = 50;
const MIN_REASON = 10;

const clip = (v, n) => String(v == null ? '' : v).trim().slice(0, n);

function empty(clientId) {
  return { clientId, username: '', account: null, state: 'open', openedAt: 0, updatedAt: 0, evidence: [], claims: [], decisions: [] };
}

// Flag a person (or add evidence to an existing case). Reopens a cleared case.
function flag(rec, { clientId, username, account, source, reason, now = Date.now() } = {}) {
  const r = rec ? { ...rec } : empty(clientId);
  if (!r.clientId) r.clientId = clientId;
  if (username) r.username = clip(username, 60);
  if (account) r.account = clip(account, 100);
  const text = clip(reason, 400);
  if (text) r.evidence = [...r.evidence, { at: now, source: clip(source || 'moderator', 30), text }].slice(-MAX_EVIDENCE);
  if (!rec) r.openedAt = now;
  if (r.state === 'cleared') r.state = 'open';
  r.updatedAt = now;
  return r;
}

// Their own statement. Recorded as a claim only; it never changes the state.
function addClaim(rec, text, { source = 'user', now = Date.now() } = {}) {
  const t = clip(text, 500);
  if (!rec || !t) return null;
  return { ...rec, claims: [...rec.claims, { at: now, source: clip(source, 30), text: t }].slice(-MAX_CLAIMS), updatedAt: now };
}

// A moderator's decision: 'restrict' (confirm the flag) or 'clear'.
function decide(rec, { outcome, reason, by = 'owner', now = Date.now() } = {}) {
  if (!rec) return { ok: false, error: 'No such case.' };
  if (outcome !== 'restrict' && outcome !== 'clear') return { ok: false, error: 'Pick restrict or clear.' };
  const why = clip(reason, 500);
  if (why.length < MIN_REASON) return { ok: false, error: `Write the reason (at least ${MIN_REASON} characters).` };
  const state = outcome === 'restrict' ? 'restricted' : 'cleared';
  const decisions = [...rec.decisions, { at: now, by: clip(by, 60), outcome, reason: why }].slice(-MAX_DECISIONS);
  return { ok: true, rec: { ...rec, state, decisions, updatedAt: now } };
}

// Restricted while open (fail safe) and after confirmation.
function isRestricted(rec) {
  return !!rec && (rec.state === 'open' || rec.state === 'restricted');
}

module.exports = { empty, flag, addClaim, decide, isRestricted, MIN_REASON };
