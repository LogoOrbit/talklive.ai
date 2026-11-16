#!/usr/bin/env node
'use strict';
// server/text-normalize.js: the one folding step every text check runs after.
//   - disguised web addresses fold to a plain one the link filter already knows
//   - invisible and bidi characters are removed from shown text, but emoji survive
//   - ordinary sentences in the app's languages come out unchanged
// The link decision itself (what is allowed) lives in server/index.js; this
// checks it through the filter as it is today, plus the extra international
// check, so a regression in either shows up here. It makes no claim about
// social handles or contact swaps, which are allowed.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { stripInvisible, normalizeForChecks, hasInternationalAddress } = require('../server/text-normalize');

const { stripSocialLinks } = require('../public/social-links.js');
const src = fs.readFileSync(path.join(__dirname, '..', 'server', 'index.js'), 'utf8');
const a = src.indexOf('const LINK_RE');
const b = src.indexOf('function containsLink');
const textNorm = require('../server/text-normalize');
// eslint-disable-next-line no-eval
const containsLink = eval(`${src.slice(a, b)}${src.slice(b, src.indexOf('\n}\n', b) + 2)}; containsLink`);
// The real filter: it folds the text itself.
const blocked = (t) => containsLink(t);

let failed = 0;
const ok = (name, cond, extra) => { if (!cond) failed++; console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : JSON.stringify(extra)); };

// Folding results
const folds = {
  'hxxp://evil[.]com/x': 'http://evil.com/x',
  'hxxps://evil.com': 'https://evil.com',
  'h t t p s : / / evil.com': 'https://evil.com',
  'evil[dot]com': 'evil.com',
  'evil (dot) com': 'evil.com',
  'evil d0t com': 'evil.com',
  'evil dot com': 'evil.com',
  'evil(.)com': 'evil.com',
  'evil。com': 'evil.com',
  'ｅｖｉｌ．ｃｏｍ': 'evil.com',
  'goo​gle.com': 'google.com',
  'goo‍gle.com': 'google.com',
  '‮google.com': 'google.com',
  'gооgle.com': 'google.com', // Cyrillic о
  'gοοgle.com': 'google.com', // Greek ο
  'gõõgle.com': 'google.com',
  'evil . com': 'evil.com',
};
for (const [input, want] of Object.entries(folds)) ok('folds ' + JSON.stringify(input), normalizeForChecks(input) === want, normalizeForChecks(input));

// Disguised links are still caught end to end.
const links = ['hxxp://evil[.]com/x', 'evil[dot]com', 'evil (dot) com', 'evil d0t com', 'ｅｖｉｌ．ｃｏｍ', 'goo​gle.com', 'gооgle.com/offer',
  'visit gõõgle.com now', 'xn--80ak6aa92e.com', 'xn--e1afmkfd.xn--p1ai', 'пример.рф', 'пример.онлайн', 'сайт.сайт', '例子.中国', 'h t t p s : / / evil . com', 'bit.ly/3abc', 'tinyurl.com/x', '203.0.113.7/x', '‮google.com', 'free​gift​.com',
  'click here: hxxps://wallet-verify[.]xyz/claim'];
for (const t of links) ok('still a link: ' + t, blocked(t));

// Social profile links stay allowed when typed in disguise; look-alike hosts do not.
for (const t of ['hxxps://instagram[.]com/john.doe', 'insta\u200Bgram.com/john.doe', '\uFF49\uFF4E\uFF53\uFF54\uFF41\uFF47\uFF52\uFF41\uFF4D.com/john.doe', 'wa[dot]me/923001234567', 't.me/some_name']) ok('social link allowed in disguise: ' + t, !blocked(t));
for (const t of ['instagram.com.evil.ru', 'hxxp://instagram[.]com.evil[.]ru/x', 'l.instagram.com/?u=evil.com', 'facebook.com/l.php?u=evil.com', 'onlyfans[.]com/x']) ok('look-alike or redirect host still blocked: ' + t, blocked(t));

// Ordinary sentences (several scripts) are never rewritten or flagged.
const sentences = ['hello how are you', 'I am from Lahore. Com on, say something', 'its 10.30 now', 'version 2.0.1', 'dot the i and cross the t', 'I dot my i-s',
  'Привет, как дела? Мне нравится музыка.', 'Γεια σου, τι κάνεις; Είμαι από την Αθήνα.', 'مرحبا كيف حالك؟ أنا من القاهرة', 'नमस्ते, आप कैसे हैं? मैं दिल्ली से हूँ।',
  '你好，你从哪里来？我喜欢音乐。', 'こんにちは、お元気ですか？音楽が好きです。', '안녕하세요, 어디서 오셨어요?', 'olá, tudo bem? eu sou do Brasil.', 'café au lait, señor, über, naïve', 'Hola, ¿de dónde eres? Me encanta el fútbol.',
  'merhaba nasılsın? Ben İstanbuldan', 'selam, kya haal hai bhai', 'I am 25 y.o. from the U.K. lol', 'e.g. music, i.e. pop', 'Mr. Smith', 'ok.thanks', '3.5 stars', '10/10'];
for (const t of sentences) {
  ok('sentence passes: ' + t, !blocked(t), blocked(t));
  ok('sentence unchanged by stripInvisible: ' + t, stripInvisible(t) === t);
}
// Mixed-script folding never rewrites a pure Cyrillic or Greek word.
ok('pure Cyrillic is kept', normalizeForChecks('сообщение') === 'сообщение');
ok('pure Greek is kept', normalizeForChecks('καλημέρα') === 'καλημέρα');
ok('Hindi marks are kept', normalizeForChecks('हूँ') === 'हूँ'.normalize('NFC'));

// Shown text: only the spoofing characters go, emoji sequences stay whole.
ok('bidi override removed from shown text', stripInvisible('abc‮def‬') === 'abcdef');
ok('zero-width space removed from shown text', stripInvisible('a​b‌c⁠d﻿') === 'abcd');
const family = '\u{1F468}‍\u{1F469}‍\u{1F467}';
ok('emoji joiners are kept in shown text', stripInvisible('hi ' + family) === 'hi ' + family);
ok('flags and skin tones are kept', stripInvisible('\u{1F1F5}\u{1F1F0} \u{1F44D}\u{1F3FD}') === '\u{1F1F5}\u{1F1F0} \u{1F44D}\u{1F3FD}');
ok('tag characters removed', stripInvisible('a\u{E0041}\u{E0042}b') === 'ab');
ok('null and numbers do not throw', stripInvisible(null) === '' && normalizeForChecks(undefined) === '' && normalizeForChecks(12) === '12');

console.log(failed ? `${failed} failed` : 'All text-normalize checks passed');
process.exit(failed ? 1 : 0);
