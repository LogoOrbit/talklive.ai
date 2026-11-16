#!/usr/bin/env node
'use strict';
// Chat link filter: usernames with dots pass, links in any disguise do not,
// and TalkLive's own site and email addresses are allowed. Links to social
// profiles (Instagram, WhatsApp, Snapchat...) pass too, but only when the host
// really is that site: look-alike hosts and redirects stay blocked.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const src = fs.readFileSync(path.join(__dirname, '..', 'server', 'index.js'), 'utf8');
const a = src.indexOf('const LINK_RE');
const b = src.indexOf('function containsLink');
// eslint-disable-next-line no-eval
const { stripSocialLinks } = require('../public/social-links.js'); // eslint-disable-line no-unused-vars
const containsLink = eval(`${src.slice(a, b)}${src.slice(b, src.indexOf('}', b) + 1)}; containsLink`);
const pass = ['asad.123', 'asadsyed.director', 'add me asadsyed.director pls', 'https://talklive.app/pricing',
  'www.talklive.app', 'support@talklive.app', 'I am fine. com on', 'its 10.30 now', 'version 2.0.1', 'hello',
  // Social profiles and handles.
  't.me/xyz', 'wa.me/923001234567', 'discord.gg/abc', 'instagram.com/john.doe', 'https://www.instagram.com/john_doe/?igsh=abc123',
  'my snap is snapchat.com/add/johnny, add me', 'tiktok.com/@john.doe', 'm.facebook.com/john', 'https://youtu.be/abc?t=30',
  'my insta is @john.doe and my snap is johnny22', 'add me on whatsapp 0300 1234567', 'what is your instagram?'];
const block = ['google.com', 'google . com', 'google[.]com', 'google(dot)com', 'google。com', 'shop.director/abc',
  '192.168.1.1', 'a@gmail.com', 'bit.ly/x', 'https://evil.com',
  'talklive.app.evil.com', 'site.pk',
  // Not really a social site: look-alikes, redirects, userinfo tricks.
  'instagram.com.evil.ru/x', 'https://l.instagram.com/?u=evil.com', 'instagram.com@evil.com', 'evilinstagram.com/x',
  'facebook.com/l.php?u=evil.com', 'instagram.com/x?u=http%3A%2F%2Fevil.com', 'instagram.com/a://evil.com',
  'https://instagram.com/x?redirect=evil.com/pay', 'instagram.com/foo and evil.com', 'wa.me.evil.com/1',
  'instagram[dot]com/x', 'onlyfans.com/me', 'linktr.ee/someone', 'bit.ly/ig'];
for (const t of pass) assert.strictEqual(containsLink(t), false, `should pass: ${t}`);
for (const t of block) assert.strictEqual(containsLink(t), true, `should block: ${t}`);
console.log('All checks passed');
