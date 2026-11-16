// The screen a banned person sees instead of TalkLive: why, until when, an
// appeal box with the owner's reply, Delete account and Sign out. Loaded on
// demand by app.js and chat.js the first time the server sends 'banned'.
// Nothing else on the page works while it is up.
(function () {
  'use strict';
  if (window.TalkLiveBanned) return;
  var root = null;
  var sock = null;
  var last = null;
  var draft = '';
  var note = '';
  var confirming = false;
  var busy = false;

  function tr(key, vars, fallback) {
    if (typeof t !== 'function') return fallback;
    var s = t(key, vars);
    return s && s !== key ? s : fallback;
  }
  function el(tag, css, text) {
    var n = document.createElement(tag);
    if (css) n.style.cssText = css;
    if (text != null) n.textContent = text;
    return n;
  }
  function light() { return document.documentElement.getAttribute('data-theme') === 'light'; }

  function leave() {
    ['talklive_session', 'talklive_nickname', 'talklive_client_id', 'talklive_identity_token', 'talklive_avatar', 'talklive_animal'].forEach(function (k) {
      try { localStorage.removeItem(k); } catch (e) { /* private mode */ }
    });
    location.href = '/';
  }
  function token() { try { return localStorage.getItem('talklive_session') || null; } catch (e) { return null; } }

  function button(label, bg, color, onclick, border) {
    var b = el('button', 'border:' + (border || '0') + ';border-radius:12px;padding:12px 18px;min-height:44px;font:700 15px system-ui,sans-serif;cursor:pointer;background:' + bg + ';color:' + color, label);
    b.type = 'button';
    b.onclick = onclick;
    return b;
  }

  function render() {
    if (!last) return;
    var L = light();
    var fg = L ? '#141828' : '#f2f4ff';
    var muted = L ? '#566079' : '#a3a9c4';
    var card = L ? '#ffffff' : '#171c30';
    var line = L ? 'rgba(20,24,40,.14)' : 'rgba(255,255,255,.14)';
    var field = L ? '#f3f5fb' : '#0e1220';
    var info = last;
    if (!root) {
      root = el('div', 'position:fixed;inset:0;z-index:2147483000;overflow:auto;-webkit-overflow-scrolling:touch');
      root.id = 'bannedScreen';
      root.setAttribute('role', 'alertdialog');
      root.setAttribute('aria-labelledby', 'bannedTitle');
      document.body.appendChild(root);
    }
    root.style.background = L ? '#eef1f9' : '#0b0f1a';
    root.style.color = fg;
    root.textContent = '';
    var wrap = el('div', 'box-sizing:border-box;max-width:460px;margin:0 auto;padding:max(24px,env(safe-area-inset-top)) 16px 32px;font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif');
    var h = el('h1', 'margin:8px 0 6px;font-size:24px;font-weight:800;text-align:center', tr('banTitle', null, 'Your account is banned'));
    h.id = 'bannedTitle';
    wrap.appendChild(el('div', 'font-size:44px;text-align:center;line-height:1', '⛔'));
    wrap.appendChild(h);
    var when = info.permanent ? tr('banPermanent', null, 'This ban is permanent.')
      : tr('banUntil', { date: new Date(info.until).toLocaleString() }, 'Until ' + new Date(info.until).toLocaleString());
    wrap.appendChild(el('p', 'margin:0 0 14px;text-align:center;color:' + muted, when));
    if (info.reason) {
      wrap.appendChild(el('p', 'margin:0 0 16px;padding:12px 14px;border-radius:14px;background:' + card + ';border:1px solid ' + line + ';overflow-wrap:anywhere',
        tr('banReason', { reason: info.reason }, 'Reason: ' + info.reason)));
    }

    var ap = info.appeal || { state: 'none' };
    var box = el('div', 'padding:16px;border-radius:16px;background:' + card + ';border:1px solid ' + line + ';margin-bottom:14px');
    box.appendChild(el('h2', 'margin:0 0 8px;font-size:17px', tr('banAppealTitle', null, 'Appeal')));
    if (ap.text) box.appendChild(el('p', 'margin:0 0 10px;padding:8px 12px;border-left:3px solid ' + line + ';color:' + muted + ';white-space:pre-wrap;overflow-wrap:anywhere', ap.text));
    if (ap.state === 'answered' && ap.reply) {
      box.appendChild(el('div', 'font-size:12px;font-weight:700;color:' + muted + ';text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px', tr('banAppealReply', null, 'Reply from the TalkLive team')));
      box.appendChild(el('p', 'margin:0 0 10px;white-space:pre-wrap;overflow-wrap:anywhere;font-weight:600', ap.reply));
    }
    if (ap.state === 'open') {
      box.appendChild(el('p', 'margin:0;color:' + muted, tr('banAppealWaiting', null, 'Your appeal is waiting for a reply.')));
    } else if (info.canAppeal) {
      box.appendChild(el('p', 'margin:0 0 8px;color:' + muted, tr('banAppealHint', null, 'If you think this is a mistake, tell us what happened.')));
      var ta = el('textarea', 'box-sizing:border-box;width:100%;min-height:96px;border-radius:12px;padding:10px 12px;font:16px/1.4 system-ui,sans-serif;resize:vertical;background:' + field + ';color:' + fg + ';border:1px solid ' + line);
      ta.maxLength = 1000;
      ta.value = draft;
      ta.oninput = function () { draft = ta.value; };
      ta.setAttribute('aria-label', tr('banAppealTitle', null, 'Appeal'));
      box.appendChild(ta);
      var row = el('div', 'margin-top:10px');
      row.appendChild(button(tr('banAppealSend', null, 'Send appeal'), 'linear-gradient(135deg,#6c5ce7,#00d4ff)', '#fff', sendAppeal));
      box.appendChild(row);
    } else {
      box.appendChild(el('p', 'margin:0;color:' + muted, tr('banAppealLimit', null, 'You have used all your appeals.')));
    }
    if (note) box.appendChild(el('p', 'margin:10px 0 0;color:' + (note.charAt(0) === '!' ? '#ff6b81' : muted), note.replace(/^!/, '')));
    wrap.appendChild(box);

    var signedIn = !!token();
    var acts = el('div', 'display:flex;flex-direction:column;gap:10px');
    if (signedIn && !confirming) {
      acts.appendChild(button(tr('banDelete', null, 'Delete account'), 'transparent', '#ff6b81', function () { confirming = true; note = ''; render(); }, '1px solid #ff6b81'));
    }
    if (signedIn && confirming) {
      var dz = el('div', 'padding:14px;border-radius:16px;background:' + card + ';border:1px solid #ff6b81');
      dz.appendChild(el('p', 'margin:0 0 8px', tr('banDeleteBody', null, 'This deletes your account for good. Enter your password (or DELETE if you use Google).')));
      var pw = el('input', 'box-sizing:border-box;width:100%;border-radius:12px;padding:11px 12px;font:16px system-ui,sans-serif;background:' + field + ';color:' + fg + ';border:1px solid ' + line);
      pw.type = 'password';
      pw.autocomplete = 'current-password';
      pw.id = 'bannedDeletePw';
      dz.appendChild(pw);
      var r2 = el('div', 'display:flex;gap:10px;margin-top:10px;flex-wrap:wrap');
      r2.appendChild(button(tr('banDelete', null, 'Delete account'), '#d93a55', '#fff', function () { deleteAccount(pw.value); }));
      r2.appendChild(button(tr('cancel', null, 'Cancel'), 'transparent', fg, function () { confirming = false; note = ''; render(); }, '1px solid ' + line));
      dz.appendChild(r2);
      acts.appendChild(dz);
    }
    acts.appendChild(button(tr('banSignOut', null, 'Sign out'), 'transparent', fg, signOut, '1px solid ' + line));
    wrap.appendChild(acts);
    root.appendChild(wrap);
  }

  function sendAppeal() {
    var text = (draft || '').trim();
    if (text.length < 10) { note = '!' + tr('banAppealShort', null, 'Please write at least 10 characters.'); render(); return; }
    if (busy) return;
    busy = true;
    sock.emit('ban-appeal', { text: text }, function (res) {
      busy = false;
      if (res && res.ok) { draft = ''; note = tr('banAppealSent', null, 'Appeal sent. The TalkLive team will reply here.'); }
      else note = '!' + (res && res.error === 'limit' ? tr('banAppealLimit', null, 'You have used all your appeals.') : tr('banAppealFail', null, 'Could not send your appeal. Please try again.'));
      render();
    });
  }
  function deleteAccount(pw) {
    if (busy) return;
    busy = true;
    sock.once('delete-account-result', function (res) {
      busy = false;
      if (res && res.ok) return leave();
      note = '!' + ((res && res.error) || tr('banAppealFail', null, 'Please try again.'));
      render();
    });
    sock.emit('delete-account', { currentPassword: pw, confirm: pw });
  }
  function signOut() {
    var done = false;
    var go = function () { if (!done) { done = true; leave(); } };
    sock.once('logout-result', go);
    sock.emit('logout', { token: token() });
    setTimeout(go, 2500);
  }

  function show(socket, info) {
    if (!info) return;
    sock = socket;
    last = info;
    note = '';
    if (!sock.__tlBanBound) {
      sock.__tlBanBound = true;
      sock.on('ban-lifted', function () { location.reload(); });
    }
    render();
  }

  window.addEventListener('i18n-changed', render);
  window.TalkLiveBanned = { show: show };
})();
