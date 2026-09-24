// What a display name (or a private label for a friend) may contain. Shared by
// the server, which enforces it, and the pages, which say what is wrong before
// anything is sent.
//
// Letters and digits in any script, single spaces, and . _ - ' between them.
// Emoji, symbols, invisible and direction-flipping characters, "fancy font"
// letters and stacked accents (Zalgo) are what broke rows, badges and
// truncation, so they are either normalised away or refused.
(function (root) {
  'use strict';

  const MIN_LEN = 2;
  const MAX_LEN = 20;
  const MAX_MARKS = 3;       // combining marks on one letter (Hindi, Thai... need a few)
  const MAX_REPEAT = 4;      // "aaaaaaaa" -> no

  const INVISIBLE = /[\p{Cc}\p{Cf}\p{Co}\p{Cn}\u034F\u115F\u1160\u3164\uFFA0\uFE00-\uFE0F]/gu;
  const ALLOWED = /^[\p{L}\p{M}\p{N} ._\-']+$/u;
  const ALNUM = /[\p{L}\p{N}]/u;

  // Returns { ok, value, error }. `value` is the cleaned name to store; `error`
  // is an i18n key the page can show (English text lives in i18n.js).
  function check(raw) {
    if (typeof raw !== 'string') return { ok: false, value: '', error: 'nickEmpty' };
    let s = raw.normalize('NFKC')          // 𝓐𝓼𝓪𝓭 / Ａｓａｄ -> Asad
      .replace(INVISIBLE, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!s) return { ok: false, value: '', error: 'nickEmpty' };
    if (!ALLOWED.test(s)) return { ok: false, value: s, error: 'nickBadChars' };
    if (new RegExp(`\\p{M}{${MAX_MARKS + 1},}`, 'u').test(s)) return { ok: false, value: s, error: 'nickBadChars' };
    const chars = Array.from(s);
    const last = chars[chars.length - 1];
    if (!ALNUM.test(chars[0]) || (!ALNUM.test(last) && !/\p{M}/u.test(last))) {
      return { ok: false, value: s, error: 'nickEdges' };
    }
    if (/[ ._\-']{2,}/u.test(s)) return { ok: false, value: s, error: 'nickSeparators' };
    if (new RegExp(`(.)\\1{${MAX_REPEAT},}`, 'u').test(s)) return { ok: false, value: s, error: 'nickRepeat' };
    const letters = chars.filter((c) => ALNUM.test(c)).length;
    if (letters < MIN_LEN) return { ok: false, value: s, error: 'nickTooShort' };
    if (chars.length > MAX_LEN) return { ok: false, value: s, error: 'nickTooLong' };
    return { ok: true, value: s, error: null };
  }

  // Best effort for names that arrive without a person to tell (a name saved
  // before these rules, a Google profile name): keep what is allowed, drop the
  // rest, and give up (empty string) if too little is left.
  function clean(raw) {
    const first = check(raw);
    if (first.ok) return first.value;
    if (typeof raw !== 'string') return '';
    let s = raw.normalize('NFKC').replace(INVISIBLE, '')
      .replace(/[^\p{L}\p{M}\p{N} ._\-']/gu, ' ')
      .replace(new RegExp(`(\\p{M}{${MAX_MARKS}})\\p{M}+`, 'gu'), '$1')
      .replace(new RegExp(`(.)\\1{${MAX_REPEAT},}`, 'gu'), (m, c) => c.repeat(MAX_REPEAT))
      .replace(/\s+/g, ' ')
      .replace(/([ ._\-'])[ ._\-']+/gu, '$1')
      .replace(/^[ ._\-']+/u, '');
    s = Array.from(s).slice(0, MAX_LEN).join('').replace(/[ ._\-']+$/u, '');
    return check(s).ok ? check(s).value : '';
  }

  const api = { check, clean, MIN_LEN, MAX_LEN };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TalkLiveNickname = api;
})(typeof window !== 'undefined' ? window : this);
