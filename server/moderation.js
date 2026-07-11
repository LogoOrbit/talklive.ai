// Server-authoritative message moderation.
//
// Every text message (stranger chat + friend chat) passes through
// checkMessage() BEFORE it is delivered or stored. The client-side filters in
// chat.js are UX-only duplicates — nothing the browser says is ever trusted.
//
// Four filter families, in check order:
//   1. illegal  — CSAM-adjacent terms, trafficking, drug/weapon sale
//                 solicitation. Hard block, heavy escalation weight, and the
//                 account is flagged for moderator review.
//   2. spam     — per-user rate limit, repeated identical messages,
//                 character flooding.
//   3. link     — URLs, bare domains, obfuscated "site dot com", plus a
//                 shortener blocklist. Optionally strip-and-allow instead of
//                 blocking (settings.moderation.stripLinks).
//   4. scam     — off-platform contact requests and payment solicitation
//                 (classic romance/crypto-scam precursors).
//
// Escalation: each violation adds severity points to a rolling window stored
// in store.data.moderationState. Crossing the configured thresholds yields
// warn → mute (server refuses their messages) → ban (store.addBan, the same
// persisted ban the report system uses — survives refresh/reconnect).
//
// Every blocked message is logged via store.addModerationEvent for the owner
// dashboard's Moderation tab. Operators can extend the keyword/regex lists at
// runtime from the dashboard (persisted in settings.moderation).
const store = require('./store');

// --- Built-in patterns -------------------------------------------------------
// Applied to a normalized copy of the text (lowercased, common leetspeak
// collapsed) so trivial obfuscation ("s3ll drugs") doesn't slip through.

// Category 1: clearly illegal solicitation. Deliberately narrow phrases —
// false positives here flag real users, so each entry targets solicitation
// wording, not single ambiguous words.
const ILLEGAL_RES = [
  /\b(?:child\s*porn(?:ography)?|c\s*s\s*a\s*m|cp\s*(?:trade|links?|vids?)|loli(?:con)?|jailbait|pre[-\s]?teen\s*(?:pics?|vids?|content)|minors?\s*(?:nudes?|pics?|content)|underage\s*(?:girls?|boys?|pics?|nudes?|content))\b/i,
  /\b(?:human\s*trafficking|sex\s*trafficking|sell(?:ing)?\s*(?:girls?|boys?|people|organs?))\b/i,
  /\b(?:sell(?:ing)?|buy(?:ing)?|got|selling cheap)\s*(?:drugs|coke|cocaine|heroin|meth|fentanyl|mdma|xanax|oxy(?:codone)?|pills)\b/i,
  /\b(?:sell(?:ing)?|buy(?:ing)?)\s*(?:guns?|weapons?|firearms?|glock|ammo)\b/i,
  /\bhire\s*(?:a\s*)?hitman\b/i,
  /\b(?:stolen|fresh)\s*(?:credit\s*)?(?:cards?|cc|fullz)\b|\bcredit\s*card\s*numbers?\b/i,
];

// Category 4a: pushing the conversation off-platform (where scams complete).
const CONTACT_RES = [
  /\b(?:add|dm|message|text|hit)\s*me\s*(?:on|at|up\s*on)\s*(?:whats\s*app|telegram|snap(?:chat)?|insta(?:gram)?|kik|signal|discord|wechat|viber)\b/i,
  /\b(?:my|the)\s*(?:whats\s*app|telegram|snap(?:chat)?|insta(?:gram)?|kik|signal|discord)\s*(?:is|id|handle|number|@)/i,
  /\b(?:whats\s*app|telegram|call)\s*me\s*(?:\+?\d[\d\s-]{7,})\b/i,
  /\bonlyfans\b|\bescort\s*service\b|\bsend\s+nudes\b/i,
];

// Category 4b: payment solicitation / classic scam hooks.
const PAYMENT_RES = [
  /\b(?:cash\s*app|venmo|paypal|zelle|western\s*union|moneygram)\b.{0,40}\b(?:send|pay|transfer|\$|£|€)|\b(?:send|pay|transfer|wire)\b.{0,40}\b(?:cash\s*app|venmo|paypal|zelle|western\s*union|moneygram|money|funds)\b/i,
  /\b(?:gift\s*cards?)\b.{0,40}\b(?:buy|send|codes?|numbers?|for\s+me)\b/i,
  /\binvest\s+(?:in|with)\s+(?:me|crypto|bitcoin|btc|forex|trading)\b|\bguaranteed\s+(?:returns?|profits?)\b|\bdouble\s+your\s+(?:money|crypto|bitcoin)\b/i,
  /\b(?:i|we)\s+(?:need|want)\s+(?:your|ur)\s+(?:bank|card|account)\s*(?:details?|numbers?|info)\b/i,
];

// Category 3: links. Any protocol, www-prefix, bare domain.tld, or
// "example dot com" obfuscation (moved here from index.js, unchanged).
const LINK_RE = new RegExp(
  '(?:[a-z][a-z0-9+.-]*:\\/\\/)' // any protocol://
  + '|(?:\\bwww\\.)'
  + '|(?:\\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.(?:[a-z]{2,})(?:\\/|\\b))' // bare domain.tld
  + '|(?:\\b\\w+\\s*\\(?\\s*dot\\s*\\)?\\s*(?:com|net|org|io|gg|me|ly|co|xyz|site|online|app|tv|link|live)\\b)',
  'i'
);

// URL shorteners get their own reason so the dashboard shows intent to hide
// the destination — a strong phishing signal even where links are allowed.
const SHORTENERS = [
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'is.gd', 'cutt.ly', 'rb.gy',
  'shorturl.at', 'tiny.cc', 'rebrand.ly', 'ow.ly', 'buff.ly', 't.ly', 'v.gd',
  's.id', 'lnkd.in', 'shorte.st', 'adf.ly',
];

// Spam limits (category 2).
const SPAM = {
  windowMs: 5000, maxPerWindow: 8,   // rate: humans don't send 8+ msgs in 5s
  repeatCount: 3, repeatWindowMs: 60000, // 3 identical messages inside a minute
  floodRunLength: 12,                // "aaaaaaaaaaaa…" runs
  floodMinLen: 30, floodMaxUniqueRatio: 0.12, // long message, almost no variety
};

// Severity points per category, fed into the escalation window.
const SEVERITY = { illegal: 4, scam: 2, link: 1, spam: 1 };

function escalationConfig() {
  const m = (store.data.settings.moderation || {});
  return {
    windowHours: 24, warnAt: 2, muteAt: 4, banAt: 8,
    muteMinutes: 10, banMinutes: 60,
    ...(m.escalation || {}),
  };
}

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[@]/g, 'a').replace(/[$]/g, 's').replace(/[!]/g, 'i')
    .replace(/[0]/g, 'o').replace(/[3]/g, 'e').replace(/[1]/g, 'i')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsLink(text) {
  return LINK_RE.test(String(text || ''));
}

function containsShortener(text) {
  const t = String(text || '').toLowerCase();
  return SHORTENERS.some((d) => t.includes(d));
}

// Remove anything link-shaped, for the optional strip-and-deliver mode.
function stripLinks(text) {
  return String(text || '')
    .replace(new RegExp(LINK_RE.source, 'gi'), '[link removed]')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Operator-defined additions from the dashboard (settings.moderation).
function customMatch(norm) {
  const m = store.data.settings.moderation || {};
  for (const word of m.customBlocklist || []) {
    if (word && norm.includes(String(word).toLowerCase())) return `blocklist: "${word}"`;
  }
  for (const src of m.customRegex || []) {
    try {
      if (src && new RegExp(src, 'i').test(norm)) return `regex: ${src}`;
    } catch (_) { /* invalid pattern saved earlier — skip */ }
  }
  return null;
}

// --- Per-user spam state (in-memory; resets on restart, which is fine for a
// 5s/60s window) -------------------------------------------------------------
const spamState = new Map(); // clientId -> { win: {start, n}, recent: [{norm, ts}] }

function spamCheck(clientId, norm) {
  const now = Date.now();
  let st = spamState.get(clientId);
  if (!st) { st = { win: { start: now, n: 0 }, recent: [] }; spamState.set(clientId, st); }

  if (now - st.win.start > SPAM.windowMs) st.win = { start: now, n: 0 };
  st.win.n += 1;
  if (st.win.n > SPAM.maxPerWindow) return 'rate limit exceeded';

  st.recent = st.recent.filter((r) => now - r.ts < SPAM.repeatWindowMs);
  const identical = st.recent.filter((r) => r.norm === norm).length;
  st.recent.push({ norm, ts: now });
  if (st.recent.length > 20) st.recent.shift();
  if (norm && identical + 1 >= SPAM.repeatCount) return 'repeated identical message';

  if (new RegExp(`(.)\\1{${SPAM.floodRunLength - 1},}`).test(norm)) return 'character flooding';
  if (norm.length >= SPAM.floodMinLen
    && new Set(norm.replace(/\s/g, '')).size / norm.replace(/\s/g, '').length <= SPAM.floodMaxUniqueRatio) {
    return 'character flooding';
  }
  return null;
}

// --- Escalation state (persisted) --------------------------------------------
function stateFor(clientId) {
  if (!store.data.moderationState[clientId]) {
    store.data.moderationState[clientId] = { events: [], warns: 0, mutedUntil: 0, flagged: false, flaggedAt: 0 };
  }
  return store.data.moderationState[clientId];
}

function isMuted(clientId) {
  const st = store.data.moderationState[clientId];
  return !!(st && st.mutedUntil && st.mutedUntil > Date.now());
}

// Add severity points and decide the consequence. Returns
// { level: 'none'|'warn'|'mute'|'ban', mutedUntil?, ban? }.
function escalate(clientId, profile, severity, category, reason) {
  const cfg = escalationConfig();
  const st = stateFor(clientId);
  const now = Date.now();
  st.events = st.events.filter((e) => now - e.ts < cfg.windowHours * 3600000);
  st.events.push({ ts: now, severity, category });
  const points = st.events.reduce((s, e) => s + e.severity, 0);

  let result = { level: 'none', points };
  if (points >= cfg.banAt) {
    const ban = store.addBan({
      clientId,
      ip: profile.ip || null,
      username: profile.username || 'Unknown',
      country: profile.country || '',
      city: profile.city || '',
      reason: `Auto-ban: ${points} moderation points in ${cfg.windowHours}h (last: ${category} — ${reason})`,
      minutes: cfg.banMinutes,
    });
    st.events = [];
    st.mutedUntil = 0;
    result = { level: 'ban', points, ban };
  } else if (points >= cfg.muteAt) {
    st.mutedUntil = now + cfg.muteMinutes * 60000;
    result = { level: 'mute', points, mutedUntil: st.mutedUntil };
  } else if (points >= cfg.warnAt) {
    st.warns += 1;
    result = { level: 'warn', points };
  }
  store.save();
  return result;
}

function flagAccount(clientId) {
  const st = stateFor(clientId);
  const first = !st.flagged;
  st.flagged = true;
  st.flaggedAt = Date.now();
  store.save();
  return first;
}

function clearFlag(clientId) {
  const st = store.data.moderationState[clientId];
  if (st) { st.flagged = false; store.save(); }
}

// --- Main entry point ---------------------------------------------------------
// profile: { clientId, username, country, city, ip } — used for logging,
// escalation and (on ban) the ban record. kind: 'stranger' | 'friend'.
//
// Returns { ok: true, text } (text possibly link-stripped) or
// { ok: false, category, reason, escalation, flagged }.
function checkMessage(profile, rawText, kind) {
  const text = String(rawText || '').trim().slice(0, 1000);
  const norm = normalize(text);
  const clientId = profile.clientId;
  const settings = store.data.settings.moderation || {};

  if (isMuted(clientId)) {
    return {
      ok: false, category: 'muted', reason: 'user is muted',
      escalation: { level: 'mute', mutedUntil: store.data.moderationState[clientId].mutedUntil },
      flagged: false,
    };
  }

  let category = null;
  let reason = null;
  let flagged = false;

  for (const re of ILLEGAL_RES) {
    if (re.test(norm) || re.test(text)) { category = 'illegal'; reason = 'illegal content solicitation'; break; }
  }
  if (!category) {
    const custom = customMatch(norm);
    if (custom) { category = 'illegal'; reason = custom; }
  }
  if (!category) {
    const spam = spamCheck(clientId, norm);
    if (spam) { category = 'spam'; reason = spam; }
  }
  if (!category && containsShortener(text)) { category = 'link'; reason = 'URL shortener'; }
  if (!category && containsLink(text)) {
    if (settings.stripLinks) {
      const stripped = stripLinks(text);
      if (stripped) return { ok: true, text: stripped, stripped: true };
    }
    category = 'link'; reason = 'link detected';
  }
  if (!category) {
    for (const re of CONTACT_RES) {
      if (re.test(norm) || re.test(text)) { category = 'scam'; reason = 'external contact request'; break; }
    }
  }
  if (!category) {
    for (const re of PAYMENT_RES) {
      if (re.test(norm) || re.test(text)) { category = 'scam'; reason = 'payment solicitation'; break; }
    }
  }

  if (!category) return { ok: true, text };

  if (category === 'illegal') flagged = flagAccount(clientId);

  const escalation = escalate(clientId, profile, SEVERITY[category] || 1, category, reason);
  store.addModerationEvent({
    clientId,
    username: profile.username || 'Unknown',
    country: profile.country || '',
    kind: kind || 'stranger',
    category,
    reason,
    level: escalation.level,
    points: escalation.points,
    text: text.slice(0, 300),
  });
  return { ok: false, category, reason, escalation, flagged };
}

// Fast boolean screen for short auxiliary texts (friend-request intros etc.):
// no logging, no escalation — just "is this deliverable".
function quickScreen(text) {
  const norm = normalize(text);
  if (containsLink(text) || containsShortener(text)) return false;
  for (const re of [...ILLEGAL_RES, ...CONTACT_RES, ...PAYMENT_RES]) {
    if (re.test(norm) || re.test(String(text || ''))) return false;
  }
  return !customMatch(norm);
}

module.exports = {
  checkMessage,
  quickScreen,
  containsLink,
  isMuted,
  clearFlag,
  escalationConfig,
};
