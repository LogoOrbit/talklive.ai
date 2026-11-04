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

  // Built from strings: a \p{...} literal is a syntax error in browsers older
  // than ~2018, which stopped this whole file (and the name check) loading.
  // There the page check is skipped and the server, which always has it,
  // still enforces the rules.
  let unicodeOk = true;
  function re(src, flags) {
    try { return new RegExp(src, flags); } catch (_) { unicodeOk = false; return null; }
  }
  const INVISIBLE = re('[\\p{Cc}\\p{Cf}\\p{Co}\\p{Cn}\\u034F\\u115F\\u1160\\u3164\\uFFA0\\uFE00-\\uFE0F]', 'gu');
  const ALLOWED = re("^[\\p{L}\\p{M}\\p{N} ._\\-']+$", 'u');
  const ALNUM = re('[\\p{L}\\p{N}]', 'u');
  const MARK = re('\\p{M}', 'u');
  const NOT_ALLOWED = re("[^\\p{L}\\p{M}\\p{N} ._\\-']", 'gu');

  // Names that are hateful, sexual, or pretend to be staff. Checked on a folded
  // copy (lower case, accents and look-alike digits removed), so "Führer",
  // "H1tler" and "f.u.c.k" are caught. Long words match anywhere; short ones
  // only as a whole word, so "Essex", "analyst" and "Dickens" stay fine.
  const BLOCK_ANYWHERE = ['nigger', 'nigga', 'faggot', 'hitler', 'fuhrer', 'fuehrer', 'rapist', 'onlyfans', 'pedophile', 'paedophile', 'motherfucker', 'fucker', 'fucking', 'kkk', 'heilhitler', 'siegheil', 'whitepower'];
  const BLOCK_WORD = ['nazi', 'nazis', 'fuck', 'fuk', 'shit', 'cunt', 'bitch', 'whore', 'slut', 'dick', 'cock', 'pussy', 'penis', 'vagina', 'boobs', 'tits', 'nude', 'nudes', 'porn', 'sex', 'sexy', 'horny', 'rape', 'pedo', 'paedo', 'retard', 'kike', 'spic', 'chink', 'tranny', 'cum', 'anal', 'admin', 'moderator', 'mod', 'talklive', 'staff', 'support'];
  function fold(t) {
    return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't').replace(/\$/g, 's').replace(/@/g, 'a');
  }
  function offensive(name) {
    const f = fold(name);
    const squashed = f.replace(/[^a-z]/g, '');
    if (BLOCK_ANYWHERE.some((w) => squashed.includes(w))) return true;
    const words = f.split(/[^a-z]+/).filter(Boolean);
    if (words.some((w) => BLOCK_WORD.includes(w))) return true;
    // "f.u.c.k" or "f u c k": single letters run together.
    const singles = f.split(/[^a-z]+/).filter(Boolean);
    if (singles.length >= 3 && singles.every((w) => w.length === 1) && BLOCK_WORD.includes(singles.join(''))) return true;
    return false;
  }

  // Returns { ok, value, error }. `value` is the cleaned name to store; `error`
  // is an i18n key the page can show (English text lives in i18n.js).
  function check(raw) {
    if (typeof raw !== 'string') return { ok: false, value: '', error: 'nickEmpty' };
    if (!unicodeOk) {
      const t = raw.replace(/\s+/g, ' ').trim();
      return t ? { ok: true, value: t.slice(0, MAX_LEN), error: null } : { ok: false, value: '', error: 'nickEmpty' };
    }
    let s = raw.normalize('NFKC')          // 𝓐𝓼𝓪𝓭 / Ａｓａｄ -> Asad
      .replace(INVISIBLE, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!s) return { ok: false, value: '', error: 'nickEmpty' };
    if (!ALLOWED.test(s)) return { ok: false, value: s, error: 'nickBadChars' };
    if (new RegExp(`\\p{M}{${MAX_MARKS + 1},}`, 'u').test(s)) return { ok: false, value: s, error: 'nickBadChars' };
    const chars = Array.from(s);
    const last = chars[chars.length - 1];
    if (!ALNUM.test(chars[0]) || (!ALNUM.test(last) && !MARK.test(last))) {
      return { ok: false, value: s, error: 'nickEdges' };
    }
    if (/[ ._\-']{2,}/u.test(s)) return { ok: false, value: s, error: 'nickSeparators' };
    if (new RegExp(`(.)\\1{${MAX_REPEAT},}`, 'u').test(s)) return { ok: false, value: s, error: 'nickRepeat' };
    const letters = chars.filter((c) => ALNUM.test(c)).length;
    if (letters < MIN_LEN) return { ok: false, value: s, error: 'nickTooShort' };
    if (chars.length > MAX_LEN) return { ok: false, value: s, error: 'nickTooLong' };
    if (offensive(s)) return { ok: false, value: s, error: 'nickNotAllowed' };
    return { ok: true, value: s, error: null };
  }

  // Best effort for names that arrive without a person to tell (a name saved
  // before these rules, a Google profile name): keep what is allowed, drop the
  // rest, and give up (empty string) if too little is left.
  function clean(raw) {
    const first = check(raw);
    if (first.ok) return first.value;
    if (typeof raw !== 'string' || !unicodeOk) return '';
    let s = raw.normalize('NFKC').replace(INVISIBLE, '')
      .replace(NOT_ALLOWED, ' ')
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
