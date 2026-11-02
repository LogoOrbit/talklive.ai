// Shared branded layout for every email users receive: purple band, logo
// header, white card, optional code box and button, footer. Built from tables
// and inline styles because that is all Gmail, Outlook and Apple Mail agree on.
// Callers pass already-escaped HTML in `body`/`note`; plain values (title,
// code, button label/url, preheader) are escaped here.

const SITE = `https://${process.env.CANONICAL_HOST || 'talklive.app'}`;
const BRAND = '#6c5ce7';
const BRAND_2 = '#00d4ff';
const BRAND_DARK = '#2a1f7a';
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function esc(str) {
  return String(str).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function renderEmail({ preheader = '', title, body = '', code = '', button = null, note = '', contact = 'info@talklive.app' }) {
  const codeBox = code
    ? `<tr><td style="padding:4px 0 20px"><div style="font-size:32px;font-weight:700;letter-spacing:10px;text-align:center;padding:16px;border-radius:10px;background:#f3f1fe;color:${BRAND_DARK};font-family:${FONT}">${esc(code)}</div></td></tr>`
    : '';
  const btn = button
    ? `<tr><td style="padding:4px 0 20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="${BRAND_DARK}" style="border-radius:8px"><a href="${esc(button.url)}" style="display:block;padding:13px 20px;font-family:${FONT};font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px">${esc(button.label)}</a></td></tr></table></td></tr>`
    : '';
  const noteRow = note
    ? `<tr><td style="font-family:${FONT};font-size:13px;line-height:1.5;color:#6b6b76;padding-bottom:16px">${note}</td></tr>`
    : '';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f7">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f7"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;border-radius:14px;background:${BRAND};background-image:linear-gradient(135deg,${BRAND},${BRAND_2})" bgcolor="${BRAND}">
    <tr><td style="padding:28px 28px 20px">
      <a href="${SITE}" style="text-decoration:none"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="padding-right:10px"><img src="${SITE}/favicon-192.png" width="32" height="32" alt="" style="display:block;border-radius:8px;border:0"></td>
        <td style="font-family:${FONT};font-size:18px;font-weight:600;color:#ffffff">TalkLive</td>
      </tr></table></a>
    </td></tr>
    <tr><td style="padding:0 20px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="border-radius:12px">
        <tr><td style="padding:28px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="font-family:${FONT};font-size:20px;font-weight:700;line-height:1.3;color:#1b1b1f;padding-bottom:12px">${esc(title)}</td></tr>
            <tr><td style="font-family:${FONT};font-size:15px;line-height:1.55;color:#3d3d46;padding-bottom:20px">${body}</td></tr>
            ${codeBox}${btn}${noteRow}
            <tr><td style="font-family:${FONT};font-size:13px;color:#6b6b76;padding-top:16px;border-top:1px solid #ececf1">Questions? Contact us at <a href="mailto:${esc(contact)}" style="color:${BRAND};text-decoration:none">${esc(contact)}</a>.</td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
    <tr><td align="center" style="padding:24px 28px 28px;font-family:${FONT};font-size:12px;color:#ffffff">
      <a href="${SITE}" style="color:#ffffff;text-decoration:none">talklive.app</a> · Talk to people around the world
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

module.exports = { renderEmail, esc };
