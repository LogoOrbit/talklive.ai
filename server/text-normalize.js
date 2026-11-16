// One normalisation step for every text check (links, spam repeats, contact
// asks), so a filter sees what a person reads, not what the sender typed to get
// past it. Case-by-case regexes lose that race: each new trick (a zero-width
// space inside "google", a Cyrillic "о", "hxxp", "[dot]") needs another rule.
// Folding the text first means the filters stay simple.
//
// Two functions with different jobs:
//   stripInvisible(text)      for text that is STORED and SHOWN: removes bidi
//                             controls and zero-width characters (spoofing and
//                             filter bypass) and nothing else. It keeps the
//                             zero-width joiner and variation selectors that
//                             emoji sequences need.
//   normalizeForChecks(text)  for text that is only INSPECTED: a folded copy
//                             (compatibility forms, look-alike letters inside
//                             mixed-script words, spelled-out dots and
//                             protocols). Never shown to anyone, so it may be
//                             lossy. Ordinary sentences in any script come out
//                             unchanged apart from case-insensitive folding.
//
// It makes no decision about what is allowed; the callers do.

// Bidi controls (LRM/RLM/ALM, embeddings, overrides, isolates), zero-width
// space/non-joiner/word-joiner/BOM, soft hyphen, the combining grapheme joiner,
// Hangul and Braille fillers, Mongolian vowel separator, invisible math
// operators and the Tags block. U+200D (joiner) and U+FE0F are kept for emoji.
const INVISIBLE_KEEP_JOINER = /[\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180E\u200B\u200C\u200E\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\u2800\u3164\uFEFF\uFFA0\uFFF9-\uFFFB]|\uDB40[\uDC00-\uDC7F]/g;
// For checks the joiner goes too: "goo\u200Dgle.com" must read as google.com.
const INVISIBLE_ALL = new RegExp(INVISIBLE_KEEP_JOINER.source + '|[\\u200D\\uFE00-\\uFE0F\\u20E3]', 'g');

function stripInvisible(text) {
  return String(text == null ? '' : text).replace(INVISIBLE_KEEP_JOINER, '');
}

// Look-alikes of Latin letters in Cyrillic and Greek. Only applied inside a
// word that already mixes in real Latin letters ("gооgle" with Cyrillic о), so
// a Russian or Greek sentence is never rewritten.
const LOOKALIKE = {
  '\u0430': 'a', '\u0435': 'e', '\u043E': 'o', '\u0440': 'p', '\u0441': 'c', '\u0443': 'y', '\u0445': 'x', '\u0456': 'i', '\u0458': 'j',
  '\u0455': 's', '\u04BB': 'h', '\u0501': 'd', '\u051B': 'q', '\u051D': 'w', '\u043A': 'k', '\u043C': 'm', '\u043D': 'h', '\u0442': 't', '\u0432': 'b',
  '\u0410': 'a', '\u0412': 'b', '\u0415': 'e', '\u041A': 'k', '\u041C': 'm', '\u041D': 'h', '\u041E': 'o', '\u0420': 'p', '\u0421': 'c', '\u0422': 't', '\u0425': 'x', '\u0423': 'y',
  '\u03B1': 'a', '\u03BF': 'o', '\u03C1': 'p', '\u03BD': 'v', '\u03C5': 'u', '\u03B9': 'i', '\u03BA': 'k', '\u03C7': 'x', '\u03C4': 't', '\u03B5': 'e',
  '\u0391': 'a', '\u0392': 'b', '\u0395': 'e', '\u0396': 'z', '\u0397': 'h', '\u0399': 'i', '\u039A': 'k', '\u039C': 'm', '\u039D': 'n', '\u039F': 'o', '\u03A1': 'p', '\u03A4': 't', '\u03A5': 'y', '\u03A7': 'x',
  // Letterlike symbols and the dotless i that NFKC leaves alone.
  '\u0131': 'i', '\u2113': 'l',
};
const LOOKALIKE_RE = new RegExp('[' + Object.keys(LOOKALIKE).join('') + ']', 'g');
const HAS_LATIN = /[A-Za-z]/;
const HAS_FOREIGN = /[\u0370-\u03FF\u0400-\u052F]/;

function foldMixedScriptWords(s) {
  return s.replace(/[^\s]+/g, (word) => {
    if (!HAS_LATIN.test(word) || !HAS_FOREIGN.test(word)) return word;
    return word.replace(LOOKALIKE_RE, (c) => LOOKALIKE[c]);
  });
}

// The endings that make "name dot X" a web address. Kept to the same short
// list the link filter itself uses for spelled-out dots, so "i dot com" is the
// only phrase that changes meaning and ordinary uses of the word "dot" do not.
const TLDS = 'com|net|org|io|co|me|app|gg|ly|xyz|info|biz|tv|live|site|online|link|store|shop|club|top|vip|pro|dev|ai|to|cc|ws|fm|us|uk|ca|au|in|pk|ru|de|fr|br|es|it|nl|jp|cn|kr|tr|xxx|sex|porn|cam';
const DOT_WORD_RE = new RegExp('([a-z0-9])\\s*(?:[\\[({<]\\s*(?:dot|d0t|punkt|punto|point)\\s*[\\])}>]|\\s(?:dot|d0t)\\s)\\s*(?=(?:' + TLDS + ')\\b)', 'gi');
// "google[.]com", "google(.)com", "google{.}com", "google . com" (only with a TLD after it)
const BRACKET_DOT_RE = new RegExp('([a-z0-9])\\s*(?:\\[\\s*\\.\\s*\\]|\\(\\s*\\.\\s*\\)|\\{\\s*\\.\\s*\\}|<\\s*\\.\\s*>)\\s*(?=[a-z0-9])', 'gi');
const SPACED_DOT_RE = new RegExp('([a-z0-9])\\s+[.\\u3002\\uFF0E\\u2024\\u00B7\\u30FB]\\s+(?=(?:' + TLDS + ')\\b)', 'gi');
const IDEOGRAPHIC_DOT_RE = /([a-z0-9])\s*[\u3002\u2024\u00B7\u30FB\u2E31]\s*(?=[a-z0-9])/gi;
// "hxxp://", "h**p://", "h t t p s : / /", "http[:]//"
const PROTOCOL_RE = /\bh(?:xx|\*\*|\s*t\s*t)\s*p(\s*s)?\s*(?:\[\s*:\s*\]|:)\s*\/\s*\/\s*/gi;
const FTP_RE = /\bf(?:xx|tt)p\s*:\s*\/\s*\/\s*/gi;

function normalizeForChecks(text) {
  let s = String(text == null ? '' : text);
  if (!s) return '';
  s = s.normalize('NFKC');                 // full-width, circled and mathematical letters; ellipsis; ㎑ ...
  s = s.replace(INVISIBLE_ALL, '');        // zero-width and bidi controls, joiner, keycap marks
  // Accents on Latin letters ("gõõgle.com") only; other scripts keep their marks.
  s = s.normalize('NFD').replace(/([A-Za-z])[\u0300-\u036F]+/g, '$1').normalize('NFC');
  s = foldMixedScriptWords(s);
  s = s.replace(PROTOCOL_RE, (m, ssl) => 'http' + (ssl ? 's' : '') + '://').replace(FTP_RE, 'ftp://');
  s = s.replace(BRACKET_DOT_RE, '$1.').replace(IDEOGRAPHIC_DOT_RE, '$1.');
  s = s.replace(DOT_WORD_RE, '$1.').replace(SPACED_DOT_RE, '$1.');
  return s;
}

// Web addresses the link filter's ASCII endings miss: punycode labels and
// internationalised endings. The filter ORs this in after normalising.
const IDN_TLDS = '\\u0440\\u0444|\\u0443\\u043A\\u0440|\\u043E\\u043D\\u043B\\u0430\\u0439\\u043D|\\u0441\\u0430\\u0439\\u0442|\\u043A\\u043E\\u043C|\\u4E2D\\u56FD|\\u7F51\\u7EDC|\\u516C\\u53F8|\\u0627\\u0644\\u0633\\u0639\\u0648\\u062F\\u064A\\u0629|\\u0645\\u0635\\u0631|\\u092D\\u093E\\u0930\\u0924|\\u30B3\\u30E0|\\uD55C\\uAD6D';
const EXTRA_LINK_RE = new RegExp('(?:\\bxn--[a-z0-9-]{2,}\\.[a-z0-9-]{2,}|[\\p{L}\\p{N}][\\p{L}\\p{N}-]*\\.(?:' + IDN_TLDS + ')(?![\\p{L}\\p{N}]))', 'iu');
function hasInternationalAddress(text) {
  return EXTRA_LINK_RE.test(normalizeForChecks(text));
}

module.exports = { stripInvisible, normalizeForChecks, hasInternationalAddress, INVISIBLE_KEEP_JOINER };
