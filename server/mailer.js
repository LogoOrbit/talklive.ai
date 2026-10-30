// Outbound email, shared by the owner dashboard's alerts and the transactional
// mail real users receive (password-reset codes).
//
// There used to be one SMTP transport inside admin.js, built for owner alerts
// only. Password recovery needs to mail arbitrary users, and two transports
// against the same Gmail app password would double the connection pool for no
// reason, so the transport lives here and admin.js borrows it.
//
// Everything is optional: with no SMTP_USER/SMTP_PASS the module reports itself
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

let transport = null;
if (nodemailer && SMTP_USER && SMTP_PASS) {
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
  return !!transport;
}

// Resolves true when the message was handed to the SMTP server, false when
// mail is not configured or the send failed. Never rejects: no caller should
// have to wrap a notification in a try/catch.
async function sendMail({ to, subject, text, html, fromName, replyTo }) {
  if (!transport || !to) return false;
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
