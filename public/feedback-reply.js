// Reply from the TalkLive team to feedback this person sent, written in the
// owner dashboard. Loaded on demand by app.js and chat.js the first time the
// server sends 'feedback-reply', so it costs nothing on a normal page load.
// It stays until the person taps "Got it" - that is what the dashboard shows as
// "Seen" - and several queue one after another.
(function () {
  'use strict';
  if (window.TalkLiveFeedbackReply) return;
  var queue = [];
  var seen = {};
  var el = null;
  var sock = null;

  function tr(key, fallback) {
    if (typeof t !== 'function') return fallback;
    var s = t(key);
    return s && s !== key ? s : fallback;
  }

  function node(tag, css, text) {
    var n = document.createElement(tag);
    if (css) n.style.cssText = css;
    if (text != null) n.textContent = text;
    return n;
  }

  function next() {
    if (el || !queue.length) return;
    var r = queue.shift();
    var titleId = 'tlfr-title-' + r.id;
    el = node('div', 'position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;'
      + 'padding:16px;background:rgba(4,7,16,.72);backdrop-filter:blur(4px)');
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', titleId);

    var card = node('div', 'width:100%;max-width:420px;max-height:calc(100dvh - 32px);overflow:auto;border-radius:20px;'
      + 'background:#141828;color:#f2f4ff;border:1px solid rgba(0,212,255,.45);box-shadow:0 20px 60px rgba(0,0,0,.5);'
      + 'padding:22px 20px 18px;font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;text-align:left');
    var head = node('div', 'display:flex;align-items:center;gap:10px;margin-bottom:12px');
    head.appendChild(node('span', 'font-size:26px;line-height:1', '💬'));
    var h = node('h2', 'margin:0;font-size:18px;font-weight:800', tr('fbReplyTitle', 'The TalkLive team replied to your feedback'));
    h.id = titleId;
    head.appendChild(h);
    card.appendChild(head);

    if (r.feedback) {
      card.appendChild(node('div', 'margin:0 0 4px;font-size:12px;font-weight:700;color:#8a90a8;text-transform:uppercase;letter-spacing:.04em',
        tr('fbReplyYou', 'You wrote')));
      card.appendChild(node('p', 'margin:0 0 14px;padding:8px 12px;border-left:3px solid rgba(138,144,168,.5);color:#b8bdd4;'
        + 'font-size:14px;white-space:pre-wrap;overflow-wrap:anywhere;max-height:120px;overflow:auto', r.feedback));
    }
    card.appendChild(node('p', 'margin:0 0 16px;white-space:pre-wrap;overflow-wrap:anywhere', r.message));

    var row = node('div', 'display:flex;justify-content:flex-end');
    var ok = node('button', 'border:0;border-radius:12px;padding:12px 20px;min-height:44px;font:700 15px system-ui,sans-serif;'
      + 'color:#fff;cursor:pointer;background:linear-gradient(135deg,#6c5ce7,#00d4ff)', tr('fbReplyOk', 'Got it'));
    ok.type = 'button';
    ok.onclick = function () {
      if (sock) sock.emit('feedback-reply-ack', { id: r.id });
      el.remove();
      el = null;
      next();
    };
    row.appendChild(ok);
    card.appendChild(row);
    el.appendChild(card);
    document.body.appendChild(el);
    ok.focus();
  }

  function show(socket, r) {
    if (!r || typeof r.id !== 'string' || typeof r.message !== 'string') return;
    sock = socket;
    // The server re-sends unseen replies on reconnect; a reply edited in the
    // dashboard arrives with a new ts and is shown again.
    var key = r.id + ':' + r.ts;
    if (seen[key]) return;
    seen[key] = true;
    queue.push(r);
    next();
  }

  window.TalkLiveFeedbackReply = { show: show };
})();
