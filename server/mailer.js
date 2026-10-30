// Outbound email, shared by the owner dashboard's alerts and the transactional
// mail real users receive (sign-up and password-reset codes).
//
// Two ways to send, picked by which secrets are set:
//   RESEND_API_KEY  Resend's HTTPS API (resend.com). Sends from MAIL_FROM
//                   (default info@talklive.app), which must be on a domain
//                   verified in Resend. Used first when set.
//   SMTP_USER/PASS  any SMTP server (default Gmail). Sends from SMTP_USER.
//
// Everything is optional: with neither set the module reports itself
// unconfigured and every send resolves to false, so the app runs exactly as
// before on a machine with no mail credentials.
let nodemailer = null;
try { nodemailer = require('nodemailer'); } catch (_) { /* optional */ }

// Secrets pasted into a dashboard often pick up a trailing space, a newline or
// wrapping quotes, and the mail server then rejects a password that is
// otherwise right. Strip all of that.
function cleanSecret(value) {
  let v = String(value || '').trim();
  if (v.length >= 2 && ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'")))) v = v.slice(1, -1).trim();
  return v;
}

const SMTP_USER = cleanSecret(process.env.SMTP_USER);
const SMTP_PASS = cleanSecret(process.env.SMTP_PASS);
const SMTP_HOST = cleanSecret(process.env.SMTP_HOST) || 'smtp.gmail.com';
const SMTP_PORT = Number(cleanSecret(process.env.SMTP_PORT) || 465);
const FROM_NAME = process.env.SMTP_FROM_NAME || 'TalkLive';
const RESEND_API_KEY = cleanSecret(process.env.RESEND_API_KEY);
const MAIL_FROM = cleanSecret(process.env.MAIL_FROM) || 'info@talklive.app';

let transport = null;
if (RESEND_API_KEY) {
  console.log(`[mail] sending as ${MAIL_FROM} via Resend`);
} else if (nodemailer && SMTP_USER && SMTP_PASS) {
  transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    // 465 is TLS from the first byte; 587 and 25 upgrade with STARTTLS.
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  // Enough to check the settings from the logs without printing the password.
  console.log(`[mail] sending as ${SMTP_USER} via ${SMTP_HOST}:${SMTP_PORT} (password ${SMTP_PASS.length} chars)`);
}

function configured() {
  return !!RESEND_API_KEY || !!transport;
}

async function sendViaResend({ to, subject, text, html, fromName, replyTo }) {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${fromName || FROM_NAME} <${MAIL_FROM}>`,
        to: [to],
        subject,
        text,
        ...(html ? { html } : {}),
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) return true;
    console.error(`[mail] Resend refused the email: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
    return false;
  } catch (err) {
    console.error('[mail] Resend send failed:', err.message);
    return false;
  }
}

// Resolves true when the message was handed to the SMTP server, false when
// mail is not configured or the send failed. Never rejects: no caller should
// have to wrap a notification in a try/catch.
async function sendMail({ to, subject, text, html, fromName, replyTo }) {
  if (!to) return false;
  if (RESEND_API_KEY) return sendViaResend({ to, subject, text, html, fromName, replyTo });
  if (!transport) return false;
  try {
    await transport.sendMail({
      from: `"${fromName || FROM_NAME}" <${SMTP_USER}>`,
      to,
      ...(replyTo ? { replyTo } : {}),
      subject,
      text,
      ...(html ? { html } : {}),
    });
    return true;
  } catch (err) {
    console.error('[mail] send failed:', err.message);
    return false;
  }
}

module.exports = { configured, sendMail };
