/*
 * Chat Support bubble, loaded on every page by pwa.js.
 *
 * Signed-in users chat straight away (their account email is verified);
 * guests give an email first. Replies come from the owner's dashboard and are
 * shown here, and emailed to the user if they have left the site.
 *
 * Everything renders inside a shadow root so the site's CSS cannot reach it.
 * Open it from anywhere with window.TLSupport.open() or any element carrying
 * data-support-open.
 */
(function () {
  'use strict';
  if (window.TLSupport || /^\/owner/.test(location.pathname)) return;

  var API = '/support/api/';
  var STORE_KEY = 'tl_support';
  var READ_KEY = 'tl_support_read';

  function ls(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch (_) { /* storage blocked */ }
    return null;
  }
  function creds() { try { return JSON.parse(ls(STORE_KEY) || 'null'); } catch (_) { return null; } }
  function sessionToken() { return ls('talklive_session') || undefined; }
  function post(path, body) {
    return fetch(API + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body || {}),
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(j.error || 'Something went wrong. Please try again.'); e.status = r.status; throw e; }
        return j;
      });
    });
  }

  var state = { open: false, conv: null, config: null, sending: false, pollT: null, online: false };

  // --- DOM ------------------------------------------------------------------
  var host = document.createElement('div');
  host.id = 'tl-support';
  host.style.cssText = 'position:fixed;z-index:2147483000;right:0;bottom:0;width:0;height:0';
  var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
  root.innerHTML = '<style>' +
    ':host{all:initial}' +
    '*{box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
    '.w{--bg:#11162a;--bg2:#1a2140;--fg:#eef1f9;--mut:#9aa3b8;--line:rgba(255,255,255,.1);--acc:#4f7cff;--acc2:#7c5cff;--me:#4f7cff;--them:#232b4d;color:var(--fg)}' +
    '.w.light{--bg:#fff;--bg2:#f4f6fb;--fg:#141a2e;--mut:#5d667c;--line:rgba(0,0,0,.1);--them:#eef1f8}' +
    '.fab{position:fixed;right:calc(18px + env(safe-area-inset-right));bottom:calc(var(--lift,0px) + 18px + env(safe-area-inset-bottom));width:56px;height:56px;border-radius:50%;border:0;cursor:pointer;color:#fff;' +
      'background:linear-gradient(135deg,var(--acc),var(--acc2));box-shadow:0 8px 24px rgba(40,60,160,.45);display:flex;align-items:center;justify-content:center;transition:transform .15s}' +
    '.fab:hover{transform:scale(1.06)}.fab:focus-visible{outline:3px solid #fff;outline-offset:2px}' +
    '.fab svg{width:26px;height:26px}.fab .dot{position:absolute;top:4px;right:4px;width:14px;height:14px;border-radius:50%;background:#ff4d6d;border:2px solid #fff;display:none}' +
    '.fab.unread .dot{display:block}.fab.hide{display:none}' +
    '.panel{position:fixed;right:calc(18px + env(safe-area-inset-right));bottom:calc(var(--lift,0px) + 86px + env(safe-area-inset-bottom));width:360px;max-width:calc(100vw - 24px);height:min(560px,calc(100vh - 120px));' +
      'background:var(--bg);border:1px solid var(--line);border-radius:18px;box-shadow:0 18px 50px rgba(0,0,0,.35);display:none;flex-direction:column;overflow:hidden}' +
    '.panel.on{display:flex;animation:pop .16s ease-out}@keyframes pop{from{opacity:0;transform:translateY(8px)}}' +
    '@media (max-width:520px){.panel{inset:0;width:auto;max-width:none;height:auto;border-radius:0;border:0;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}.panel.on~.fab{display:none}}' +
    '.hd{display:flex;align-items:center;gap:10px;padding:14px 14px 12px;background:linear-gradient(135deg,var(--acc),var(--acc2));color:#fff}' +
    '.hd .av{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:18px;flex:none}' +
    '.hd b{display:block;font-size:15px}.hd small{display:flex;align-items:center;gap:6px;font-size:12px;opacity:.9}' +
    '.hd small i{width:8px;height:8px;border-radius:50%;background:#b8c0d8}.hd small i.on{background:#3ddc84}' +
    '.hd .x{margin-left:auto;background:rgba(255,255,255,.15);border:0;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px}' +
    '.view{flex:1;display:flex;flex-direction:column;min-height:0}' +
    '.body{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px;background:var(--bg)}' +
    '.msg{max-width:82%;padding:9px 12px;border-radius:14px;font-size:14px;line-height:1.4;white-space:pre-wrap;word-wrap:break-word}' +
    '.msg.them{align-self:flex-start;background:var(--them);border-bottom-left-radius:4px}' +
    '.msg.me{align-self:flex-end;background:var(--me);color:#fff;border-bottom-right-radius:4px}' +
    '.msg.sys{align-self:center;background:transparent;color:var(--mut);font-size:12.5px;text-align:center;max-width:95%}' +
    '.ts{font-size:10.5px;opacity:.65;margin-top:3px}' +
    '.form{padding:14px;display:flex;flex-direction:column;gap:10px;overflow-y:auto}' +
    '.form p{margin:0;color:var(--mut);font-size:13.5px;line-height:1.45}' +
    'label{font-size:12px;color:var(--mut);display:flex;flex-direction:column;gap:5px}' +
    'input,textarea{width:100%;font-size:15px;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--bg2);color:var(--fg);outline:none}' +
    'input:focus,textarea:focus{border-color:var(--acc)}textarea{resize:none}' +
    '.btn{border:0;border-radius:999px;padding:11px 16px;font-size:14.5px;font-weight:600;color:#fff;background:linear-gradient(135deg,var(--acc),var(--acc2));cursor:pointer}' +
    '.btn:disabled{opacity:.6;cursor:default}' +
    '.err{color:#ff6b81;font-size:13px;min-height:0}' +
    '.who{font-size:12.5px;color:var(--mut);background:var(--bg2);padding:8px 10px;border-radius:10px}' +
    '.cmp{display:flex;gap:8px;padding:10px;border-top:1px solid var(--line);background:var(--bg)}' +
    '.cmp textarea{flex:1;max-height:110px;min-height:42px}' +
    '.cmp .btn{padding:0 16px;flex:none}' +
    '.hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}' +
    '.promo{position:fixed;right:calc(18px + env(safe-area-inset-right));bottom:calc(var(--lift,0px) + 86px + env(safe-area-inset-bottom));width:270px;max-width:calc(100vw - 36px);' +
      'background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:16px;padding:14px 14px 12px;box-shadow:0 14px 40px rgba(0,0,0,.35);display:none;animation:pop .25s ease-out}' +
    '.promo.on{display:block}.promo:after{content:"";position:absolute;right:22px;bottom:-7px;width:12px;height:12px;background:var(--bg);border-right:1px solid var(--line);border-bottom:1px solid var(--line);transform:rotate(45deg)}' +
    '.promo b{display:block;font-size:15px;margin:0 22px 4px 0}.promo p{margin:0 0 10px;font-size:13.5px;line-height:1.45;color:var(--mut)}' +
    '.promo .tag{display:inline-block;font-size:10.5px;font-weight:800;letter-spacing:.06em;color:#fff;background:#ff4d6d;border-radius:99px;padding:2px 7px;margin-bottom:6px}' +
    '.promo .x{position:absolute;top:8px;right:8px;width:28px;height:28px;border:0;border-radius:50%;background:transparent;color:var(--mut);font-size:15px;cursor:pointer}' +
    '.promo .btn{width:100%;padding:9px 14px}' +
    '.fab.pulse:before{content:"";position:absolute;inset:0;border-radius:50%;background:var(--acc);animation:ring 1.8s ease-out infinite;z-index:-1}' +
    '@keyframes ring{from{transform:scale(1);opacity:.6}to{transform:scale(1.7);opacity:0}}' +
    '@media (prefers-reduced-motion:reduce){.fab.pulse:before,.promo{animation:none}}' +
    '.closed{font-size:12.5px;color:var(--mut);text-align:center;padding:6px 10px 0}' +
    '</style>' +
    '<div class="w">' +
      '<div class="panel" role="dialog" aria-modal="false" aria-label="Chat Support">' +
        '<div class="hd"><div class="av" aria-hidden="true">🎧</div><div><b>TalkLive Support</b><small><i></i><span class="st">We reply as soon as we can</span></small></div>' +
        '<button class="x" type="button" aria-label="Close chat">✕</button></div>' +
        '<div class="view"></div>' +
      '</div>' +
      '<div class="promo" role="status"><button class="x" type="button" aria-label="Dismiss">✕</button><span class="tag">NEW</span>' +
        '<b>💬 Chat Support is here</b><p>Questions or problems? Chat with a real person from the TalkLive team. We reply fast.</p>' +
        '<button class="btn" type="button">Chat with us</button></div>' +
      '<button class="fab" type="button" aria-label="Chat with support" title="Chat Support">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/><path d="M8.5 10.5h7M8.5 13.5h4.5"/></svg>' +
        '<span class="dot"></span></button>' +
    '</div>';

  var $ = function (s) { return root.querySelector(s); };
  var fab = $('.fab'), panel = $('.panel'), view = $('.view'), promo = $('.promo');

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function time(ts) {
    var d = new Date(ts), now = new Date();
    var t = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toDateString() === now.toDateString() ? t : d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + t;
  }

  function setStatus() {
    $('.hd small i').className = state.online ? 'on' : '';
    $('.hd .st').textContent = state.online ? 'Online now' : 'We reply as soon as we can';
  }

  // --- Views ----------------------------------------------------------------
  function renderStart() {
    var cfg = state.config || {};
    var acc = cfg.account;
    view.innerHTML =
      '<form class="form" novalidate>' +
        '<p>' + esc(state.online ? cfg.greeting : (cfg.awayMessage || cfg.greeting) || 'Send us a message and we\'ll reply here.') + '</p>' +
        (acc
          ? '<div class="who">Signed in as <b>' + esc(acc.nickname) + '</b>' + (acc.email ? ' · replies also go to ' + esc(acc.email) : '') + '</div>'
          : '<label>Your email <input name="email" type="email" autocomplete="email" inputmode="email" required placeholder="you@example.com" maxlength="254"></label>' +
            '<label>Name (optional) <input name="name" type="text" autocomplete="name" maxlength="60"></label>') +
        '<label>Message <textarea name="text" rows="4" maxlength="2000" required placeholder="How can we help?"></textarea></label>' +
        '<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
        '<div class="err" role="alert"></div>' +
        '<button class="btn" type="submit">Start chat</button>' +
        (acc ? '' : '<p style="font-size:12px">We only use your email to answer you. <a href="/privacy" style="color:inherit">Privacy</a></p>') +
      '</form>';
    var form = view.querySelector('form');
    var first = form.querySelector(acc ? 'textarea' : 'input[name=email]');
    setTimeout(function () { if (state.open) first.focus(); }, 50);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var err = form.querySelector('.err'), btn = form.querySelector('.btn');
      var email = form.email ? form.email.value.trim() : '';
      var text = form.text.value.trim();
      err.textContent = '';
      if (!acc && !/^[^\s@<>]+@[^\s@<>.]+(\.[^\s@<>.]+)+$/.test(email)) { err.textContent = 'Please enter a valid email address.'; form.email.focus(); return; }
      if (text.length < 2) { err.textContent = 'Please write a message.'; form.text.focus(); return; }
      btn.disabled = true; btn.textContent = 'Sending…';
      post('start', {
        email: email, name: form.name ? form.name.value.trim() : '', text: text,
        website: form.website.value, sessionToken: sessionToken(),
        clientId: ls('talklive_client_id') || '', page: location.pathname,
      }).then(function (r) {
        if (!r.id) return;
        ls(STORE_KEY, JSON.stringify({ id: r.id, key: r.key }));
        state.conv = r.conversation;
        markRead();
        renderThread(true);
      }).catch(function (e2) {
        err.textContent = e2.message; btn.disabled = false; btn.textContent = 'Start chat';
      });
    });
  }

  function msgsHtml() {
    var c = state.conv, cfg = state.config || {};
    var html = '<div class="msg sys">' + esc(state.online ? cfg.greeting || '' : cfg.awayMessage || '') + '</div>';
    c.messages.forEach(function (m) {
      html += '<div class="msg ' + (m.from === 'user' ? 'me' : 'them') + '">' + esc(m.text) + '<div class="ts">' + (m.from === 'user' ? '' : 'Support · ') + time(m.ts) + '</div></div>';
    });
    var last = c.messages[c.messages.length - 1];
    if (last && last.from === 'user') {
      html += '<div class="msg sys">' + (state.online ? 'We\'ll reply here shortly.' : 'We\'ll reply here and email you at ' + esc(c.email) + '.') + '</div>';
    }
    return html;
  }

  function renderThread(scroll) {
    var c = state.conv;
    if (!view.querySelector('.body')) {
      view.innerHTML = '<div class="body" aria-live="polite"></div>' +
        (c.status === 'closed' ? '<div class="closed">This chat was marked solved. Send a message to reopen it.</div>' : '') +
        '<form class="cmp"><textarea rows="1" maxlength="2000" placeholder="Write a message…" aria-label="Message"></textarea><button class="btn" type="submit" aria-label="Send">Send</button></form>' +
        '<div class="err" role="alert" style="padding:0 12px 8px"></div>';
      var form = view.querySelector('.cmp'), ta = form.querySelector('textarea');
      ta.addEventListener('input', function () { ta.style.height = 'auto'; ta.style.height = Math.min(110, ta.scrollHeight) + 'px'; });
      ta.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : send(); }
      });
      form.addEventListener('submit', function (e) { e.preventDefault(); send(); });
      setTimeout(function () { if (state.open) ta.focus(); }, 50);
      scroll = true;
    }
    var body = view.querySelector('.body');
    var nearBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 80;
    var html = msgsHtml();
    if (body._html !== html) { body.innerHTML = html; body._html = html; if (nearBottom) scroll = true; }
    if (scroll) body.scrollTop = body.scrollHeight;
  }

  function send() {
    var ta = view.querySelector('.cmp textarea'), err = view.querySelector('.err');
    var text = ta.value.trim();
    if (!text || state.sending) return;
    var c = creds() || {};
    state.sending = true; err.textContent = '';
    post('send', { id: state.conv.id, key: c.key, sessionToken: sessionToken(), text: text }).then(function (r) {
      ta.value = ''; ta.style.height = '';
      state.conv = r.conversation;
      var closedNote = view.querySelector('.closed'); if (closedNote) closedNote.remove();
      renderThread(true);
    }).catch(function (e) {
      err.textContent = e.message;
      if (e.status === 404) forget();
    }).then(function () { state.sending = false; });
  }

  function render() {
    setStatus();
    if (state.conv) renderThread(false);
    else if (state.config) renderStart();
    else view.innerHTML = '<div class="form"><p>Loading…</p></div>';
  }

  // --- Sync -----------------------------------------------------------------
  function lastOwnerTs() {
    var t = 0;
    (state.conv ? state.conv.messages : []).forEach(function (m) { if (m.from === 'owner' && m.ts > t) t = m.ts; });
    return t;
  }
  function markRead() { ls(READ_KEY, String(lastOwnerTs())); updateBadge(); }
  function updateBadge() {
    var unread = !state.open && lastOwnerTs() > Number(ls(READ_KEY) || 0);
    fab.classList.toggle('unread', unread);
    fab.setAttribute('aria-label', unread ? 'Chat with support - new reply' : 'Chat with support');
    layout();
  }
  function forget() { ls(STORE_KEY, null); state.conv = null; render(); }

  function refresh() {
    var c = creds();
    var tok = sessionToken();
    var req;
    if (c && c.id) req = post('thread', { id: c.id, key: c.key, sessionToken: tok });
    else if (tok) req = post('mine', { sessionToken: tok }).then(function (r) { return r.conversation ? { conversation: r.conversation } : null; });
    else return Promise.resolve();
    return req.then(function (r) {
      if (!r) return;
      if (r.conversation) {
        if (!c && r.conversation) ls(STORE_KEY, JSON.stringify({ id: r.conversation.id }));
        state.conv = r.conversation;
      }
      if (typeof r.online === 'boolean') state.online = r.online;
      if (state.open) { markRead(); render(); } else updateBadge();
    }).catch(function (e) { if (e.status === 404 && c) forget(); });
  }

  function schedule() {
    clearTimeout(state.pollT);
    var hasConv = !!(creds() || sessionToken());
    if (!hasConv && !state.open) return;
    var ms = state.open && !document.hidden ? 4000 : 60000;
    state.pollT = setTimeout(function () { refresh().then(schedule, schedule); }, ms);
  }

  function loadConfig() {
    return post('config', { sessionToken: sessionToken() }).then(function (cfg) {
      state.config = cfg; state.online = !!cfg.online;
    }).catch(function () { state.config = state.config || { greeting: 'Send us a message and we\'ll reply here.' }; });
  }

  function open() {
    endPromo();
    state.open = true;
    panel.classList.add('on');
    fab.setAttribute('aria-expanded', 'true');
    render();
    Promise.all([loadConfig(), refresh()]).then(function () { render(); if (state.conv) markRead(); schedule(); });
  }
  function close() {
    state.open = false;
    panel.classList.remove('on');
    fab.setAttribute('aria-expanded', 'false');
    updateBadge();
    schedule();
    fab.focus();
  }

  fab.addEventListener('click', function () { state.open ? close() : open(); });
  $('.hd .x').addEventListener('click', close);
  root.addEventListener('keydown', function (e) { if (e.key === 'Escape' && state.open) close(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && state.open) refresh(); schedule(); });
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest && e.target.closest('[data-support-open]');
    if (!t) return;
    e.preventDefault();
    open();
  });

  // Keep the bubble out of the way during a voice call or a text chat.
  function busy() {
    var call = document.getElementById('callPanel');
    if (call && !call.classList.contains('hidden')) return true;
    var cmp = document.getElementById('composer');
    if (cmp && !cmp.classList.contains('hidden')) return true;
    return false;
  }
  function popupOpen() {
    var els = document.querySelectorAll('.modal-overlay, [role="dialog"][aria-modal="true"]');
    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      if (!e.getClientRects().length) continue;
      // Some popups stay laid out and hide with opacity/visibility instead.
      if (e.checkVisibility && !e.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      var cs = getComputedStyle(e);
      if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
      return true;
    }
    return false;
  }
  // Sit above a bottom tab bar (the app's .tl-nav on phones), and follow the
  // site's light/dark theme.
  var w = $('.w');
  var phone = matchMedia('(max-width: 760px)');
  function layout() {
    // Phones reach the chat from Help (data-support-open); the bubble only
    // appears there to point at an unread reply.
    var b = !state.open && (busy() || (phone.matches && !fab.classList.contains('unread')));
    fab.classList.toggle('hide', b);
    // The callout waits while one of the site's own popups is open.
    var promoOn = !!promoShown && !b && !state.open && !popupOpen();
    if (promoOn && !promoTracked) { promoTracked = true; track('support_promo_view'); }
    promo.classList.toggle('on', promoOn);
    w.classList.toggle('light', document.documentElement.getAttribute('data-theme') === 'light');
    var lift = 0;
    var bars = document.querySelectorAll('.tl-nav, [data-support-avoid]');
    for (var i = 0; i < bars.length; i++) {
      var r = bars[i].getBoundingClientRect();
      if (r.height && r.width > innerWidth / 2 && r.top > innerHeight / 2 && r.bottom >= innerHeight - 2) lift = Math.max(lift, innerHeight - r.top);
    }
    w.style.setProperty('--lift', lift + 'px');
  }
  layout();
  setInterval(layout, 1000);
  addEventListener('resize', layout);

  // --- "New: Chat Support" announcement ---------------------------------------
  // Runs for a window the server sets (2 days from launch). Each visitor sees
  // the callout once; dismissing it or opening the chat ends it for them.
  var PROMO_KEY = 'tl_support_promo';
  var promoUntil = 0, promoShown = false, promoTracked = false;
  function promoLive() { return promoUntil > Date.now() && ls(PROMO_KEY) !== String(promoUntil); }
  function endPromo() {
    if (promoUntil) ls(PROMO_KEY, String(promoUntil));
    promoShown = false;
    promo.classList.remove('on');
    fab.classList.remove('pulse');
    try { window.dispatchEvent(new Event('tl-support-promo')); } catch (_) { /* old browser */ }
  }
  promo.querySelector('.x').addEventListener('click', function () { endPromo(); fab.focus(); });
  function track(event) {
    try { fetch('/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: event }), keepalive: true }).catch(function () {}); } catch (_) { /* ignore */ }
  }
  promo.querySelector('.btn').addEventListener('click', function () { track('support_promo_click'); open(); });
  fetch(API + 'promo', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (r) {
    promoUntil = Number(r.until) || 0;
    try { window.dispatchEvent(new Event('tl-support-promo')); } catch (_) { /* old browser */ }
    if (!promoLive() || state.open) return;
    fab.classList.add('pulse');
    setTimeout(function () { if (promoLive() && !state.open) { promoShown = true; layout(); } }, 2500);
  }).catch(function () { /* no promo */ });

  window.TLSupport = { open: open, close: close, promoLive: promoLive, endPromo: endPromo };
  document.body.appendChild(host);

  // A "Continue the chat" link from a reply email: #support=<id>.<key>
  var m = /[#&]support=([a-f0-9]+)\.([a-f0-9]+)/.exec(location.hash);
  if (m) {
    try { history.replaceState(null, '', location.pathname + location.search); } catch (_) { /* ignore */ }
    post('claim', { id: m[1], key: m[2] }).then(function (r) {
      ls(STORE_KEY, JSON.stringify({ id: r.id, key: r.key }));
      state.conv = r.conversation;
      open();
    }).catch(function () { open(); });
  } else if (/[?&]support=open\b/.test(location.search) || location.hash === '#support') {
    open();
  } else {
    refresh().then(schedule, schedule);
  }
})();
