// Warning notice from the TalkLive team, sent from the owner dashboard about a
// person's behaviour. Loaded on demand by app.js and chat.js the first time the
// server sends 'owner-warning', so it costs nothing on a normal page load.
// It stays up until the person taps "I understand" - that acknowledgement is
// what the dashboard shows as "Seen" - and several queue one after another.
(function () {
  'use strict';
  if (window.TalkLiveWarning) return;
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
    var w = queue.shift();
    var titleId = 'tlw-title-' + w.id;
    el = node('div', 'position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;'
      + 'padding:16px;background:rgba(4,7,16,.72);backdrop-filter:blur(4px)');
    el.setAttribute('role', 'alertdialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', titleId);

    var card = node('div', 'width:100%;max-width:420px;max-height:calc(100dvh - 32px);overflow:auto;border-radius:20px;'
      + 'background:#141828;color:#f2f4ff;border:1px solid rgba(255,197,85,.5);box-shadow:0 20px 60px rgba(0,0,0,.5);'
      + 'padding:22px 20px 18px;font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;text-align:left');
    var head = node('div', 'display:flex;align-items:center;gap:10px;margin-bottom:12px');
    head.appendChild(node('span', 'font-size:26px;line-height:1', '⚠️'));
    var h = node('h2', 'margin:0;font-size:18px;font-weight:800', tr('ownerWarnTitle', 'Warning from the TalkLive team'));
    h.id = titleId;
    head.appendChild(h);
    card.appendChild(head);

    if (w.reason) {
      card.appendChild(node('div', 'display:inline-block;margin-bottom:10px;padding:3px 10px;border-radius:99px;'
        + 'background:rgba(255,197,85,.16);color:#ffc555;font-size:12px;font-weight:700', w.reason));
    }
    card.appendChild(node('p', 'margin:0 0 12px;white-space:pre-wrap;overflow-wrap:anywhere', w.message));
    card.appendChild(node('p', 'margin:0 0 16px;font-size:13px;color:#8a90a8',
      tr('ownerWarnFooter', 'Please follow our community guidelines. Repeated problems can lead to your access being restricted.')));

    var row = node('div', 'display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap');
    var link = node('a', 'color:#00d4ff;font-size:13px;text-decoration:none', tr('ownerWarnGuidelines', 'Community guidelines'));
    link.href = '/community-guidelines.html';
    link.target = '_blank';
    link.rel = 'noopener';
    row.appendChild(link);
    var ok = node('button', 'border:0;border-radius:12px;padding:12px 20px;min-height:44px;font:700 15px system-ui,sans-serif;'
      + 'color:#fff;cursor:pointer;background:linear-gradient(135deg,#6c5ce7,#00d4ff)', tr('ownerWarnOk', 'I understand'));
    ok.type = 'button';
    ok.onclick = function () {
      if (sock) sock.emit('owner-warning-ack', { id: w.id });
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

  function show(socket, w) {
    if (!w || typeof w.id !== 'string' || typeof w.message !== 'string') return;
    sock = socket;
    // The server re-sends unacknowledged warnings on reconnect; show each once.
    if (seen[w.id]) return;
    seen[w.id] = true;
    queue.push(w);
    next();
  }

  window.TalkLiveWarning = { show: show };
})();
