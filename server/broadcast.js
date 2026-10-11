// Promotional email to every account email on file, sent through Resend.
//
// Separate from mailer.js on purpose: that transport is the Gmail SMTP box used
// for owner alerts and password resets, and bulk mail through it would get the
// account rate-limited or flagged. Resend sends from info@talklive.app (the
// domain must be verified in Resend) and is built for this.
//
// Recipients are account emails only (Google sign-in or recovery email). Emails
// typed in chat (the Data tab's "shared emails") are never mailed: those people
// gave them to a stranger, not to us. Every message carries a one-click
// unsubscribe, and anyone who used it is skipped by every later send.
const crypto = require('crypto');
const store = require('./store');

const API_KEY = process.env.RESEND_API_KEY || '';
const FROM = process.env.BROADCAST_FROM || 'TalkLive <info@talklive.app>';
const HOST = process.env.CANONICAL_HOST || 'talklive.app';
const BATCH = 100; // Resend's per-request maximum for /emails/batch
const BATCH_GAP_MS = 600; // stays under Resend's default 2 requests/second

// The campaign this build sends. A new campaign id is a fresh send to everyone;
// the same id never mails one address twice, so a retry after a crash or a
// second click only reaches whoever was missed.
const CAMPAIGN = {
  id: 'comeback-2026-10',
  subject: 'Someone new is waiting to talk to you 👋',
};

function configured() {
  return !!API_KEY;
}

function secret() {
  return store.getOrCreateSecret('unsubscribe');
}

function unsubToken(email) {
  return crypto.createHmac('sha256', secret()).update(String(email).toLowerCase()).digest('hex').slice(0, 32);
}

function validUnsubToken(email, token) {
  const want = Buffer.from(unsubToken(email));
  const got = Buffer.from(String(token || ''));
  return want.length === got.length && crypto.timingSafeEqual(want, got);
}

function unsubUrl(email) {
  return `https://${HOST}/unsubscribe?e=${encodeURIComponent(email)}&t=${unsubToken(email)}`;
}

function optOuts() {
  if (!store.data.emailOptOut) store.data.emailOptOut = {};
  return store.data.emailOptOut;
}

function optOut(email) {
  optOuts()[String(email).toLowerCase()] = Date.now();
  store.save();
}

function campaignLog() {
  if (!store.data.broadcasts) store.data.broadcasts = {};
  if (!store.data.broadcasts[CAMPAIGN.id]) {
    store.data.broadcasts[CAMPAIGN.id] = { subject: CAMPAIGN.subject, sent: {}, failed: 0, startedAt: null, finishedAt: null };
  }
  return store.data.broadcasts[CAMPAIGN.id];
}

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

// One row per distinct account email: { email, name }.
function recipients() {
  const out = new Map();
  const skip = optOuts();
  for (const [key, a] of Object.entries(store.data.accountsRegistry || {})) {
    const cred = (store.data.accounts || {})[key] || {};
    const g = cred.google || {};
    const email = String(g.email || cred.email || a.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email) || skip[email] || out.has(email)) continue;
    const name = g.givenName || a.nickname || a.username || key;
    out.set(email, { email, name: String(name).slice(0, 40) });
  }
  return [...out.values()];
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function render({ email, name }) {
  const link = (path, content) => `https://${HOST}${path}?utm_source=email&utm_medium=email&utm_campaign=${CAMPAIGN.id}&utm_content=${content}`;
  const voice = link('/random-voice-chat', 'voice');
  const text = link('/random-text-chat', 'text');
  const home = link('/', 'cta');
  const unsub = unsubUrl(email);
  const hi = name ? `Hey ${esc(name)},` : 'Hey,';
  const html = `<!doctype html><html><body style="margin:0;background:#0b0f1a;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#eef1f9">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0f1a"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#131a2b;border-radius:18px">
<tr><td style="padding:32px 28px 8px">
<div style="font-size:22px;font-weight:800;letter-spacing:-.3px">Talk<span style="color:#4f7cff">Live</span></div>
<h1 style="font-size:26px;line-height:1.25;margin:22px 0 12px">Someone new is online right now.</h1>
<p style="font-size:16px;line-height:1.6;color:#c6cde0;margin:0 0 14px">${hi}</p>
<p style="font-size:16px;line-height:1.6;color:#c6cde0;margin:0 0 14px">It's been a while. Right now there are people on TalkLive from all over the world, waiting for a good conversation. One tap and you're talking: no profile to fill in, no swiping.</p>
<ul style="font-size:15px;line-height:1.7;color:#c6cde0;padding-left:20px;margin:0 0 22px">
<li><b style="color:#eef1f9">Voice chat</b> with a random stranger, anywhere in the world</li>
<li><b style="color:#eef1f9">Text chat</b> if you'd rather type than talk</li>
<li><b style="color:#eef1f9">Mini-games</b> to break the ice mid-conversation</li>
<li>Practise a language with a native speaker</li>
</ul>
</td></tr>
<tr><td align="center" style="padding:0 28px 10px">
<a href="${home}" style="display:inline-block;background:#4f7cff;color:#fff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 34px;border-radius:999px">Start talking now</a>
</td></tr>
<tr><td align="center" style="padding:6px 28px 28px;font-size:14px;color:#9aa3b8">
<a href="${voice}" style="color:#8fb0ff">Voice chat</a> &nbsp;·&nbsp; <a href="${text}" style="color:#8fb0ff">Text chat</a>
</td></tr>
<tr><td style="padding:0 28px 28px;font-size:15px;line-height:1.6;color:#c6cde0">Your next great conversation is one tap away. See you there.<br><br>- Asad, founder of TalkLive</td></tr>
</table>
<p style="font-size:12px;line-height:1.6;color:#6b7489;max-width:520px;margin:18px auto 0">You're getting this because you have a TalkLive account with this email. <a href="${unsub}" style="color:#6b7489">Unsubscribe</a> from TalkLive emails.</p>
</td></tr></table></body></html>`;
  const plain = `${name ? `Hey ${name},` : 'Hey,'}

It's been a while. Right now there are people on TalkLive from all over the world, waiting for a good conversation. One tap and you're talking: no profile to fill in, no swiping.

- Voice chat with a random stranger, anywhere in the world
- Text chat if you'd rather type than talk
- Mini-games to break the ice mid-conversation
- Practise a language with a native speaker

Start talking now: ${home}

Your next great conversation is one tap away. See you there.
- Asad, founder of TalkLive

You're getting this because you have a TalkLive account with this email.
Unsubscribe: ${unsub}`;
  return {
    from: FROM,
    to: [email],
    subject: CAMPAIGN.subject,
    html,
    text: plain,
    headers: {
      'List-Unsubscribe': `<${unsub}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };
}

async function resend(path, body) {
  const res = await fetch(`https://api.resend.com${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || `Resend HTTP ${res.status}`);
  return json;
}

async function sendTest(to) {
  if (!configured()) throw new Error('RESEND_API_KEY is not set.');
  if (!EMAIL_RE.test(String(to || ''))) throw new Error('Enter a valid email address.');
  const msg = render({ email: String(to).toLowerCase(), name: 'there' });
  msg.subject = `[Test] ${msg.subject}`;
  await resend('/emails', msg);
}

let running = null; // { total, done, failed, error }

function status() {
  const log = campaignLog();
  const all = recipients();
  return {
    configured: configured(),
    from: FROM,
    campaign: CAMPAIGN.id,
    subject: CAMPAIGN.subject,
    recipients: all.length,
    pending: all.filter((r) => !log.sent[r.email]).length,
    sent: Object.keys(log.sent).length,
    optedOut: Object.keys(optOuts()).length,
    startedAt: log.startedAt,
    finishedAt: log.finishedAt,
    running,
  };
}

// Starts the send in the background and returns at once; progress is read
// back through status().
function startSend() {
  if (!configured()) throw new Error('RESEND_API_KEY is not set.');
  if (running && !running.finished) throw new Error('A send is already running.');
  const log = campaignLog();
  const todo = recipients().filter((r) => !log.sent[r.email]);
  if (!todo.length) throw new Error('Everyone on the list has already been sent this campaign.');
  running = { total: todo.length, done: 0, failed: 0, error: null, finished: false };
  log.startedAt = log.startedAt || Date.now();
  (async () => {
    for (let i = 0; i < todo.length; i += BATCH) {
      const chunk = todo.slice(i, i + BATCH);
      try {
        await resend('/emails/batch', chunk.map(render));
        const now = Date.now();
        for (const r of chunk) log.sent[r.email] = now;
        running.done += chunk.length;
      } catch (err) {
        running.failed += chunk.length;
        log.failed += chunk.length;
        running.error = err.message;
        console.error('[broadcast] batch failed:', err.message);
        // A rejected key or unverified domain fails every batch the same way.
        if (/api key|domain|not verified|forbidden|unauthori/i.test(err.message)) break;
      }
      store.save();
      if (i + BATCH < todo.length) await new Promise((r) => setTimeout(r, BATCH_GAP_MS));
    }
    log.finishedAt = Date.now();
    running.finished = true;
    store.save();
  })();
  return running;
}

module.exports = { configured, status, startSend, sendTest, render, recipients, validUnsubToken, optOut, CAMPAIGN };
