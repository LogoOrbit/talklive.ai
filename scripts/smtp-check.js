/*
 * Which SMTP settings can actually sign in? Run on the live machine (the
 * "SMTP check" workflow does this over fly ssh) so it uses the real secrets.
 * Prints only the outcome of each attempt and harmless facts about the
 * password (length, whether it has spaces or non-ASCII characters) - never
 * the password itself. Sends no email.
 */
'use strict';
const nodemailer = require('nodemailer');

const clean = (v) => {
  let s = String(v || '').trim();
  if (s.length >= 2 && ((s[0] === '"' && s.endsWith('"')) || (s[0] === "'" && s.endsWith("'")))) s = s.slice(1, -1).trim();
  return s;
};
const user = clean(process.env.SMTP_USER);
const pass = clean(process.env.SMTP_PASS);
const host = clean(process.env.SMTP_HOST) || 'smtp.gmail.com';

console.log(`user: ${user}`);
console.log(`host: ${host}`);
console.log(`password: ${pass.length} chars, `
  + `spaces inside: ${/\s/.test(pass) ? 'yes' : 'no'}, `
  + `non-ASCII characters: ${/[^\x20-\x7e]/.test(pass) ? 'YES (smart quotes or a stray symbol?)' : 'no'}`);

const attempts = [
  { port: 465, secure: true, authMethod: 'PLAIN' },
  { port: 465, secure: true, authMethod: 'LOGIN' },
  { port: 587, secure: false, authMethod: 'PLAIN' },
  { port: 587, secure: false, authMethod: 'LOGIN' },
];

(async () => {
  for (const a of attempts) {
    const t = nodemailer.createTransport({
      host, port: a.port, secure: a.secure, requireTLS: !a.secure, authMethod: a.authMethod,
      auth: { user, pass }, connectionTimeout: 15000, greetingTimeout: 15000,
    });
    try {
      await t.verify();
      console.log(`OK    port ${a.port} ${a.authMethod}`);
    } catch (err) {
      console.log(`FAIL  port ${a.port} ${a.authMethod}: ${String(err.message).slice(0, 160)}`);
    }
    t.close();
  }
})();
