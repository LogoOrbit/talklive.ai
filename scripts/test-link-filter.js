#!/usr/bin/env node
'use strict';
// Chat link filter: usernames with dots pass, links in any disguise do not,
// and TalkLive's own site and email addresses are allowed.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const src = fs.readFileSync(path.join(__dirname, '..', 'server', 'index.js'), 'utf8');
const a = src.indexOf('const LINK_RE');
const b = src.indexOf('function containsLink');
// eslint-disable-next-line no-eval
const containsLink = eval(`${src.slice(a, b)}${src.slice(b, src.indexOf('}', b) + 1)}; containsLink`);
const pass = ['asad.123', 'asadsyed.director', 'add me asadsyed.director pls', 'https://talklive.app/pricing',
  'www.talklive.app', 'support@talklive.app', 'I am fine. com on', 'its 10.30 now', 'version 2.0.1', 'hello'];
const block = ['google.com', 'google . com', 'google[.]com', 'google(dot)com', 'google。com', 'shop.director/abc',
  '192.168.1.1', 'a@gmail.com', 't.me/xyz', 'wa.me/923', 'bit.ly/x', 'discord.gg/abc', 'https://evil.com',
  'talklive.app.evil.com', 'site.pk'];
for (const t of pass) assert.strictEqual(containsLink(t), false, `should pass: ${t}`);
for (const t of block) assert.strictEqual(containsLink(t), true, `should block: ${t}`);
console.log('All checks passed');
