'use strict';

// Pulls contact details (emails, phone numbers, social handles) out of a chat
// message. Only ever run on messages from people who switched on "Save contact
// info I share" in Settings (see store.hasContactConsent); the results feed the
// owner dashboard's Data tab. Pure and synchronous so it can sit on the message
// path and be unit-tested on its own.

const MAX_PER_MESSAGE = 10;

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
// Digits with the usual separators. Validated by digit count afterwards.
const PHONE_RE = /(?:\+|\b00)?\d[\d\s().-]{5,22}\d/g;

// Profile links, platform -> pattern whose first group is the handle.
const URL_PATTERNS = [
  ['instagram', /(?:instagram\.com|instagr\.am)\/([A-Za-z0-9._]{2,30})/gi],
  ['snapchat', /snapchat\.com\/add\/([A-Za-z0-9._-]{2,30})/gi],
  ['telegram', /(?:t\.me|telegram\.me)\/([A-Za-z0-9_]{3,32})/gi],
  ['whatsapp', /wa\.me\/(\+?\d{7,15})/gi],
  ['tiktok', /tiktok\.com\/@([A-Za-z0-9._]{2,30})/gi],
  ['twitter', /(?:twitter\.com|x\.com)\/([A-Za-z0-9_]{2,15})/gi],
  ['facebook', /(?:facebook\.com|fb\.com|fb\.me)\/([A-Za-z0-9.]{3,50})/gi],
  ['discord', /discord(?:\.gg|app\.com\/invite|\.com\/invite)\/([A-Za-z0-9-]{2,32})/gi],
];

// "my insta is @name", "snap: name", "discord - name#1234". Short or ambiguous
// platform words ("x", "line", "signal") are left out: they are ordinary words
// far more often than they introduce a handle.
const PLATFORMS = {
  instagram: 'instagram', insta: 'instagram', ig: 'instagram',
  snapchat: 'snapchat', snap: 'snapchat',
  telegram: 'telegram', tg: 'telegram',
  discord: 'discord',
  tiktok: 'tiktok',
  twitter: 'twitter',
  facebook: 'facebook', fb: 'facebook',
  kik: 'kik',
  wechat: 'wechat',
  whatsapp: 'whatsapp',
  viber: 'viber',
  skype: 'skype',
  reddit: 'reddit',
};
const KEYWORD_RE = new RegExp(
  '\\b(' + Object.keys(PLATFORMS).join('|') + ')\\b[\\s:=\\-]*'
  + '(?:(?:is|me|id|name|username|user|handle|account|acc|at|on|add)\\b[\\s:=\\-]*){0,3}'
  + '(@?[A-Za-z0-9._#-]{2,32})',
  'gi'
);
// Words that follow a platform name in normal speech and are not a handle.
const NOT_A_HANDLE = new Set([
  'the', 'and', 'you', 'too', 'me', 'is', 'it', 'now', 'please', 'pls', 'bro', 'lol', 'ok', 'okay',
  'yes', 'no', 'not', 'or', 'if', 'so', 'but', 'my', 'your', 'ur', 'u', 'there', 'here', 'then',
  'later', 'only', 'also', 'app', 'account', 'acc', 'dm', 'dms', 'chat', 'call', 'message', 'msg',
  'to', 'for', 'with', 'what', 'whats', 'do', 'have', 'has', 'id', 'name', 'username', 'handle',
]);

// A bare "@name" with no platform word in front of it.
const AT_HANDLE_RE = /(?:^|[\s(])@([A-Za-z0-9._]{3,30})\b/g;

function digitsOf(s) {
  return String(s).replace(/\D/g, '');
}

function normalizePhone(raw) {
  const trimmed = String(raw).trim();
  const digits = digitsOf(trimmed);
  if (digits.length < 8 || digits.length > 15) return null;
  // Dates ("2026-10-06", "06/10/2026") have the right digit count but aren't numbers.
  if (/^\d{1,4}[./-]\d{1,2}[./-]\d{1,4}$/.test(trimmed)) return null;
  // A run of one repeated digit is padding or a joke, not a number.
  if (/^(\d)\1+$/.test(digits)) return null;
  // A short bare number ("12345678 reasons") is usually just a number.
  if (/^\d+$/.test(trimmed) && digits.length < 10) return null;
  if (trimmed.startsWith('+')) return '+' + digits;
  if (trimmed.startsWith('00')) return '+' + digits.slice(2);
  return digits;
}

function cleanHandle(h) {
  const v = String(h || '').replace(/^@/, '').replace(/[.\-_]+$/, '');
  if (v.length < 2) return null;
  if (NOT_A_HANDLE.has(v.toLowerCase())) return null;
  // All digits: that is a phone number, and the phone pass already has it.
  if (/^[\d.#-]+$/.test(v)) return null;
  return v;
}

/**
 * Returns [{ type, value }] for every contact detail in `text`, deduplicated,
 * at most MAX_PER_MESSAGE. `type` is 'email', 'phone', or a platform name
 * ('instagram', 'snapchat', ... or 'handle' for a bare @name).
 */
function extractContacts(text) {
  let s = String(text || '').slice(0, 2000);
  if (!s.trim()) return [];
  const out = [];
  const seen = new Set();
  const add = (type, value) => {
    if (!value || out.length >= MAX_PER_MESSAGE) return;
    const key = type + ':' + value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ type, value });
  };

  for (const m of s.matchAll(EMAIL_RE)) add('email', m[0].toLowerCase());
  // Emails out of the way so their local parts don't read as @handles or numbers.
  s = s.replace(EMAIL_RE, ' ');

  for (const [type, re] of URL_PATTERNS) {
    for (const m of s.matchAll(re)) {
      if (type === 'whatsapp') { const p = normalizePhone(m[1]); if (p) add('phone', p); continue; }
      const h = cleanHandle(m[1]);
      if (h) add(type, type === 'discord' ? h : h.toLowerCase());
    }
    s = s.replace(re, ' ');
  }

  for (const m of s.matchAll(KEYWORD_RE)) {
    const h = cleanHandle(m[2]);
    if (h) add(PLATFORMS[m[1].toLowerCase()], h.toLowerCase());
  }
  const handled = new Set(out.map((x) => x.value.toLowerCase()));

  for (const m of s.matchAll(PHONE_RE)) {
    const p = normalizePhone(m[0]);
    if (p) add('phone', p);
  }

  for (const m of s.matchAll(AT_HANDLE_RE)) {
    const h = cleanHandle(m[1]);
    if (h && !handled.has(h.toLowerCase())) add('handle', h.toLowerCase());
  }
  return out;
}

module.exports = { extractContacts };
