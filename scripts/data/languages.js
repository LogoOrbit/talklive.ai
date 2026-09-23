'use strict';
/*
 * The one list of languages TalkLive supports.
 *
 * Everything that states a language count or lists languages reads from here,
 * so the numbers cannot drift apart again (the homepage bullet said 17, its
 * FAQ listed 12, the international-calls FAQ said twelve and the directory had
 * 16):
 *
 *   - public/i18n.js        I18N_LANGS, the in-app language picker
 *   - public/index.html,    the head script that preloads the visitor's
 *     public/chat.html      translation file
 *   - public/index.html     "why people choose" bullet, both FAQ answers and
 *                           the chat-by-language links
 *   - scripts/build-seo.js  generated FAQ answers
 *   - scripts/geo-pages.js  the /languages/ directory (content per language
 *                           lives in scripts/data/geo.js; the build fails if a
 *                           language here has no directory entry there)
 *   - scripts/locales.js    localized homepages (every non-English code here
 *                           must have one; checked by the build)
 *
 * The browser files are rewritten by scripts/sync-languages.js, which runs as
 * part of `npm run build:seo`. To add a language: add it here, add
 * public/i18n/<code>.js, a locales.js entry and a geo.js LANGUAGES entry, then
 * run the build.
 */

const SUPPORTED_LANGUAGES = [
  { code: 'en', native: 'English', english: 'English', dir: 'ltr', slug: 'english' },
  { code: 'es', native: 'Español', english: 'Spanish', dir: 'ltr', slug: 'spanish' },
  { code: 'pt', native: 'Português', english: 'Portuguese', dir: 'ltr', slug: 'portuguese' },
  { code: 'fr', native: 'Français', english: 'French', dir: 'ltr', slug: 'french' },
  { code: 'de', native: 'Deutsch', english: 'German', dir: 'ltr', slug: 'german' },
  { code: 'ru', native: 'Русский', english: 'Russian', dir: 'ltr', slug: 'russian' },
  { code: 'tr', native: 'Türkçe', english: 'Turkish', dir: 'ltr', slug: 'turkish' },
  { code: 'ar', native: 'العربية', english: 'Arabic', dir: 'rtl', slug: 'arabic' },
  { code: 'fa', native: 'فارسی', english: 'Persian', dir: 'rtl', slug: 'persian' },
  { code: 'hi', native: 'हिन्दी', english: 'Hindi', dir: 'ltr', slug: 'hindi' },
  { code: 'bn', native: 'বাংলা', english: 'Bengali', dir: 'ltr', slug: 'bengali' },
  { code: 'ur', native: 'اردو', english: 'Urdu', dir: 'rtl', slug: 'urdu' },
  { code: 'id', native: 'Bahasa Indonesia', english: 'Indonesian', dir: 'ltr', slug: 'indonesian' },
  { code: 'it', native: 'Italiano', english: 'Italian', dir: 'ltr', slug: 'italian' },
  { code: 'ja', native: '日本語', english: 'Japanese', dir: 'ltr', slug: 'japanese' },
  { code: 'ko', native: '한국어', english: 'Korean', dir: 'ltr', slug: 'korean' },
  { code: 'zh', native: '中文', english: 'Chinese', dir: 'ltr', slug: 'chinese' },
];

const COUNT = SUPPORTED_LANGUAGES.length;
const RTL = SUPPORTED_LANGUAGES.filter(l => l.dir === 'rtl');

// "A, B and C"
function listNames(names) {
  if (names.length < 2) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

// The sentence every FAQ uses, so they cannot disagree.
function languagesAnswer() {
  return `TalkLive is available in ${COUNT} languages: ${listNames(SUPPORTED_LANGUAGES.map(l => l.english))}. `
    + `Right-to-left languages (${listNames(RTL.map(l => l.english))}) are fully supported.`;
}

module.exports = { SUPPORTED_LANGUAGES, COUNT, RTL, listNames, languagesAnswer };
