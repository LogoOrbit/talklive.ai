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

const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_NAME = process.env.SMTP_FROM_NAME || 'TalkLive';

let transport = null;
if (nodemailer && SMTP_USER && SMTP_PASS) {
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

function configured() {
  return !!transport;
}

// Resolves true when the message was handed to the SMTP server, false when
// mail is not configured or the send failed. Never rejects: no caller should
// have to wrap a notification in a try/catch.
async function sendMail({ to, subject, text, html, fromName }) {
  if (!transport || !to) return false;
  try {
    await transport.sendMail({
      from: `"${fromName || FROM_NAME}" <${SMTP_USER}>`,
      to,
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
