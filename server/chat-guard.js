// Chat spam guard for stranger and friend text chat. In memory, per person.
//
//   too fast   more than 5 messages in 5 seconds, or 25 in a minute
//   repeats    the same message (6+ letters) a 3rd time within 2 minutes
//   walls      one character 15+ times in a row ("aaaaaaaaaaaaaaa"), one word
//              8+ times in a row, or a long message made of a handful of
//              characters
//   mute       3 blocked messages within 2 minutes: muted for a minute; each
//              further mute within the hour doubles, up to 10 minutes
//
// check() returns null to let a message through, or { reason } where reason
// is 'rate' (the apps say "You're sending messages too fast") or 'unsafe'
// ("That message can't be sent - it looks unsafe or against our rules").

const RATE_SHORT = { n: 5, ms: 5000 };
const RATE_LONG = { n: 25, ms: 60000 };
const REPEAT_MS = 2 * 60000;
const STRIKES_TO_MUTE = 3;
const STRIKE_MS = 2 * 60000;
const MUTE_MS = 60000;
const MUTE_MAX_MS = 10 * 60000;
const HOUR = 3600000;

const norm = (t) => String(t || '').toLowerCase().replace(/\s+/g, ' ').replace(/[^\p{L}\p{N} ]/gu, '').trim();

function isWall(text) {
  const t = String(text || '');
  if (/(\S)\1{14,}/u.test(t)) return true;
  if (/(?:^|\s)(\S+)(?:\s+\1){7,}(?:\s|$)/iu.test(t)) return true;
  const chars = [...t.replace(/\s/g, '')];
  return chars.length >= 60 && new Set(chars).size <= 4;
}

function createChatGuard({ now = () => Date.now() } = {}) {
  const people = new Map(); // key -> { sent: [ts], texts: [{ k, ts }], strikes: [ts], mutedUntil, mutes: [ts] }

  function rec(key) {
    let r = people.get(key);
    if (!r) people.set(key, r = { sent: [], texts: [], strikes: [], mutedUntil: 0, mutes: [] });
    return r;
  }

  function strike(r, t) {
    r.strikes = r.strikes.filter((s) => t - s < STRIKE_MS);
    r.strikes.push(t);
    if (r.strikes.length >= STRIKES_TO_MUTE) {
      r.mutes = r.mutes.filter((m) => t - m < HOUR);
      const len = Math.min(MUTE_MAX_MS, MUTE_MS * 2 ** r.mutes.length);
      r.mutes.push(t);
      r.mutedUntil = t + len;
      r.strikes = [];
      return len;
    }
    return 0;
  }

  // key: who is sending (their clientId). text may be empty for a GIF.
  // rate: false skips the speed check (friend messages, whose outbox flushes a
  // backlog in a burst after a reconnect and has its own limiter).
  function check(key, text, { rate = true } = {}) {
    if (!key) return null;
    const t = now();
    const r = rec(key);
    if (r.mutedUntil > t) return { reason: 'rate', muted: r.mutedUntil - t };
    r.sent = r.sent.filter((s) => t - s < RATE_LONG.ms);
    const short = r.sent.filter((s) => t - s < RATE_SHORT.ms).length;
    if (rate && (short >= RATE_SHORT.n || r.sent.length >= RATE_LONG.n)) {
      const muted = strike(r, t);
      return { reason: 'rate', why: 'too fast', muted };
    }
    if (text) {
      if (isWall(text)) { r.sent.push(t); return { reason: 'unsafe', why: 'wall', muted: strike(r, t) }; }
      const k = norm(text);
      r.texts = r.texts.filter((x) => t - x.ts < REPEAT_MS);
      // Short replies ("ok", "lol", "haha") are allowed to repeat.
      if (k.length >= 6 && r.texts.filter((x) => x.k === k).length >= 2) {
        r.sent.push(t);
        return { reason: 'unsafe', why: 'repeat', muted: strike(r, t) };
      }
      if (k) { r.texts.push({ k, ts: t }); if (r.texts.length > 10) r.texts.shift(); }
    }
    r.sent.push(t);
    return null;
  }

  function prune() {
    const t = now();
    for (const [k, r] of people) {
      if (r.mutedUntil < t && (!r.sent.length || t - r.sent[r.sent.length - 1] > HOUR) && (!r.mutes.length || t - r.mutes[r.mutes.length - 1] > HOUR)) people.delete(k);
    }
  }
  const timer = setInterval(prune, 10 * 60000);
  if (timer.unref) timer.unref();

  return { check, isWall, _people: people };
}

module.exports = { createChatGuard, isWall };
