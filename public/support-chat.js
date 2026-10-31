/*
 * Help & Support panel, loaded on every page by pwa.js.
 *
 * There is no floating bubble. Any element carrying data-support-open (the
 * "Help & Support" menu items) opens the panel on the help centre: searchable
 * answers to the common questions, and only after them a "Chat with Support"
 * button. data-support-open="chat" (the Contact page) goes straight to chat.
 *
 * Chat: signed-in users chat straight away (their account email is verified);
 * guests give an email first. Replies come from the owner's dashboard and are
 * shown here, and emailed to the user if they have left the site. An unread
 * reply puts a dot on every Help & Support entry point.
 *
 * Everything renders inside a shadow root so the site's CSS cannot reach it.
 * Open it with window.TLSupport.open() / open('chat').
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

  var state = { open: false, mode: 'help', conv: null, config: null, sending: false, pollT: null, online: false };

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
    '.panel{position:fixed;right:calc(18px + env(safe-area-inset-right));bottom:calc(var(--lift,0px) + 18px + env(safe-area-inset-bottom));width:380px;max-width:calc(100vw - 24px);height:min(620px,calc(100vh - 40px));' +
      'background:var(--bg);border:1px solid var(--line);border-radius:18px;box-shadow:0 18px 50px rgba(0,0,0,.35);display:none;flex-direction:column;overflow:hidden}' +
    '.panel.on{display:flex;animation:pop .16s ease-out}@keyframes pop{from{opacity:0;transform:translateY(8px)}}' +
    '@media (max-width:520px){.panel{inset:0;width:auto;max-width:none;height:auto;border-radius:0;border:0;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}}' +
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
    '.closed{font-size:12.5px;color:var(--mut);text-align:center;padding:6px 10px 0}' +
    '.hd .bk{background:rgba(255,255,255,.15);border:0;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:18px;line-height:1;flex:none}.hd .bk[hidden]{display:none}' +
    '.help{flex:1;overflow-y:auto;padding:12px 14px 16px;display:flex;flex-direction:column;gap:12px;background:var(--bg)}' +
    '.help .q{width:100%;font-size:15px;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--bg2);color:var(--fg)}' +
    '.help h3{margin:6px 0 2px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--mut)}' +
    '.help details{border:1px solid var(--line);border-radius:12px;background:var(--bg2)}' +
    '.help summary{cursor:pointer;list-style:none;padding:12px 36px 12px 12px;font-size:14.5px;font-weight:600;position:relative;min-height:44px;display:flex;align-items:center}' +
    '.help summary::-webkit-details-marker{display:none}' +
    '.help summary:after{content:"+";position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:18px;color:var(--mut)}' +
    '.help details[open] summary:after{content:"\\2212"}' +
    '.help .a{padding:0 12px 12px;font-size:14px;line-height:1.5;color:var(--fg)}.help .a p{margin:0 0 8px}.help .a p:last-child{margin:0}' +
    '.help .a a{color:var(--acc)}.help .a b{font-weight:600}' +
    '.help .none{color:var(--mut);font-size:14px;text-align:center;padding:8px 0}' +
    '.help .more{margin-top:6px;padding:14px;border-radius:14px;background:var(--bg2);border:1px solid var(--line);text-align:center}' +
    '.help .more b{display:block;font-size:15px;margin-bottom:4px}.help .more p{margin:0 0 10px;font-size:13.5px;color:var(--mut)}' +
    '.help .more .btn{width:100%}' +
    '.help .reply{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;background:var(--acc);color:#fff;font-size:14px;border:0;cursor:pointer;text-align:left;width:100%}' +
    '.help .reply span{flex:1}' +
    '.w.light .hd .bk{background:rgba(255,255,255,.25)}' +
    '</style>' +
    '<div class="w">' +
      '<div class="panel" role="dialog" aria-modal="false" aria-label="Chat Support">' +
        '<div class="hd"><button class="bk" type="button" aria-label="Back to help" hidden>‹</button><div class="av" aria-hidden="true">🎧</div><div><b class="ttl">Help &amp; Support</b><small><i></i><span class="st">Answers to common questions</span></small></div>' +
        '<button class="x" type="button" aria-label="Close chat">✕</button></div>' +
        '<div class="view"></div>' +
      '</div>' +
    '</div>';

  var $ = function (s) { return root.querySelector(s); };
  var panel = $('.panel'), view = $('.view'), backBtn = $('.hd .bk');
  var lastOpener = null;

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

  // --- Help centre --------------------------------------------------------------
  // Answers are written here, not fetched, so they show instantly and offline.
  // HTML in answers is trusted (this file); keep them short and true to the app.
  var FAQ = [
    { t: 'Getting started', q: [
      ['What is TalkLive?', '<p>Free voice and text chat with people around the world. Tap <b>Tap to Talk</b> for a voice call or <b>Tap to Chat</b> for text. You can start without an account. TalkLive is for adults 18+ only.</p>'],
      ['Is TalkLive free?', '<p>Yes. Calls and messages are free. Your mobile plan still counts the data: a voice call uses roughly tens of megabytes an hour, text almost nothing.</p><p>TalkLive Plus adds extras. See <a href="/pricing">Pricing</a> for what is on offer right now.</p>'],
      ['Do I need an account?', '<p>No. Without one, your friends and chats live in this browser only. Clearing it, or switching phones, loses them.</p><p>An account keeps your friends, chats and ID on every device and lets you recover them. Sign up with your email (we send a 6-digit code) or with Google.</p>'],
      ['How do I start a call or skip someone?', '<p>Tap <b>Tap to Talk</b> and allow the microphone. To move on, tap <b>Next</b>. Turn on <b>Auto-connect</b> to be matched with someone new each time a call ends.</p>'],
      ['How do filters work?', '<p>Open <b>Filters</b> to choose countries you prefer or want to avoid (2 of each on the free plan) and a language. The gender filter and more countries come with Plus. Strict filters can mean a longer wait.</p>'],
    ] },
    { t: 'Calls and sound', q: [
      ['My microphone is not working', '<p><b>On a computer:</b> click the lock icon next to the address, set <b>Microphone</b> to <b>Allow</b>, then reload the page.</p><p><b>On a phone:</b> open your browser settings, then Site settings, Microphone, and allow talklive.app. Also allow the microphone for the browser itself in your phone settings.</p><p>Close other apps that may be using the mic (calls, recorders, video apps).</p>'],
      ['I cannot hear the other person (or they cannot hear me)', '<p>Check your volume, that you have not tapped mute, and that headphones or Bluetooth are connected to the right device.</p><p>Some office, school and public Wi-Fi networks block calls. Try mobile data or another network.</p><p>If a call stays silent, TalkLive moves you to someone new automatically after about 20 seconds.</p>'],
      ['It keeps saying "Searching"', '<p>Usually your filters are narrow or few people are online right now. Loosen or turn off filters, or keep the page open: you are matched the moment someone arrives. If nothing changes for a few minutes, reload the page.</p>'],
      ['The call keeps dropping', '<p>That is almost always the network. TalkLive tries to reconnect for 30 seconds, and switching between Wi-Fi and mobile data is handled automatically. Move closer to your Wi-Fi or switch networks.</p>'],
    ] },
    { t: 'Account and sign-in', q: [
      ['I did not get my verification code', '<p>Check your spam and promotions folders, and that the email address is spelled right. A code works for 10 minutes. You can ask for a new one, a few times an hour.</p><p>Or sign up with Google instead.</p>'],
      ['I forgot my password', '<p>On the Log in screen tap <b>Forgot password?</b>, enter your account email, type the 6-digit code we send, and choose a new password. It signs you out everywhere else.</p>'],
      ['How do I change my name, password or email?', '<p>Open <b>Settings</b>, then <b>Profile</b>. You need your current password to change the password or recovery email.</p>'],
      ['My friends and chats are gone', '<p>If you were not signed in, they were stored in that browser, so clearing it or using another device does not show them. If you had an account, log in again with it and everything comes back.</p>'],
      ['How do I delete my account or data?', '<p>Email <a href="mailto:info@talklive.app">info@talklive.app</a> from your account email, or chat with us below, and we will delete it.</p>'],
    ] },
    { t: 'Friends and messages', q: [
      ['How do I add a friend?', '<p>After a call or chat, tap <b>Add friend</b>. You can also share <b>Your ID</b> (in Friends): the other person types it into <b>Add by ID</b> to find you. Once they accept, you can message and call each other any time.</p>'],
      ['My message will not send', '<p>A few reasons:</p><p>• Links cannot be sent, to keep people safe from scams.<br>• If you are not friends yet, you can send one message until they accept your request.<br>• One of you may have blocked the other.</p><p>Messages written while you are offline are sent when you reconnect.</p>'],
      ['How do voice messages work?', '<p>Voice messages are for friends only, and both of you agree first. Tap the mic button in a friend chat to ask.</p>'],
      ['Can I hide that I am online or that I read a message?', '<p>Yes. Online status: <b>Settings</b>, <b>Privacy &amp; Safety</b>, <b>Show my online status to friends</b>. Read receipts: the switch at the top of a friend chat.</p>'],
      ['What is the difference between unfriend and block?', '<p><b>Unfriend</b> removes them from your friends but keeps the conversation. <b>Block</b> stops them messaging, calling or being matched with you. Unblock any time in <b>Settings</b>, <b>Privacy &amp; Safety</b>, <b>Blocked people</b>.</p>'],
    ] },
    { t: 'Safety', q: [
      ['How do I report someone?', '<p>Tap <b>Report</b> on the call or chat screen. The conversation ends at once, and they are not told who reported them. Our team reviews every report.</p>'],
      ['Does TalkLive record calls?', '<p>No. Call audio is never recorded or stored. See the <a href="/safety">Safety Center</a> for what is kept and why.</p>'],
      ['Someone asked for money, photos or my number', '<p>That is a scam or worse. Do not send anything, block them, and report them. TalkLive staff will never ask for your password or payment details in a chat.</p>'],
      ['I was banned. Can I appeal?', '<p>Bans follow reports and break the <a href="/community-guidelines">Community Guidelines</a>. If you think it was a mistake, email <a href="mailto:info@talklive.app">info@talklive.app</a> with your username and what happened.</p>'],
    ] },
    { t: 'Plus and billing', q: [
      ['What does TalkLive Plus include?', '<p>More filters (gender, more countries), no ads, seeing who liked you, undo skip and faster matching. <a href="/pricing">Pricing</a> shows whether it is on sale and the current price.</p>'],
      ['Can I get Plus for free?', '<p>Yes. Share your invite link: every 3 friends who make a verified account with it and have a real conversation earn you 1 hour of Plus.</p>'],
      ['I paid but Plus is not active', '<p>Wait a minute and reload. Plus belongs to the browser you paid on, so open TalkLive there. Still not active? Chat with us below and include your receipt.</p>'],
      ['How do I cancel or get a refund?', '<p>You can cancel any time; Plus stays on until the end of the period you paid for. Your first payment has a 14-day money-back guarantee. Email <a href="mailto:info@talklive.app">info@talklive.app</a> from the address you paid with. Details: <a href="/refund">Refund Policy</a>.</p>'],
    ] },
    { t: 'Notifications and the app', q: [
      ['I do not get notifications', '<p>Allow notifications for talklive.app in your browser settings (the lock icon next to the address, or Site settings on a phone).</p><p><b>iPhone:</b> add TalkLive to your Home Screen (Share button, then Add to Home Screen) and open it from there. iPhones only send web notifications to apps on the Home Screen.</p><p>Muted chats do not notify.</p>'],
      ['Is there an app?', '<p>You can install TalkLive from your browser: use <b>Install</b> or <b>Add to Home Screen</b> in the browser menu. It opens like an app and gets notifications.</p>'],
    ] },
  ];

  function hasUnread() { return lastOwnerTs() > Number(ls(READ_KEY) || 0); }

  function renderHelp() {
    var html = '<div class="help">';
    if (state.conv && hasUnread()) {
      html += '<button type="button" class="reply" data-go="chat"><span>💬 You have a new reply from Support</span><b>Open</b></button>';
    }
    html += '<input class="q" type="search" placeholder="Search help (e.g. microphone, password)" aria-label="Search help" autocomplete="off">';
    FAQ.forEach(function (sec, si) {
      html += '<section data-sec="' + si + '"><h3>' + esc(sec.t) + '</h3>';
      sec.q.forEach(function (qa) {
        html += '<details><summary>' + esc(qa[0]) + '</summary><div class="a">' + qa[1] + '</div></details>';
      });
      html += '</section>';
    });
    html += '<p class="none" hidden>No answers match that. Our team can help.</p>' +
      '<div class="more"><b>Still need help?</b><p>' +
      (state.conv ? 'Your conversation with our team is saved.' : 'Chat with a real person from the TalkLive team.') +
      '</p><button class="btn" type="button" data-go="chat">' + (state.conv ? 'Open my support chat' : 'Chat with Support') + '</button></div></div>';
    view.innerHTML = html;
    var box = view.querySelector('.q');
    box.addEventListener('input', function () {
      var term = box.value.trim().toLowerCase();
      var any = false;
      view.querySelectorAll('section[data-sec]').forEach(function (sec) {
        var shown = 0;
        sec.querySelectorAll('details').forEach(function (d) {
          var hit = !term || d.textContent.toLowerCase().indexOf(term) !== -1;
          d.hidden = !hit;
          if (hit) { shown++; if (term) d.open = true; }
        });
        sec.hidden = !shown;
        if (shown) any = true;
      });
      view.querySelector('.none').hidden = any;
    });
    view.querySelectorAll('[data-go="chat"]').forEach(function (b) {
      b.addEventListener('click', function () { track('support_chat_from_help'); showChat(); });
    });
  }

  // Help is never redrawn while open (it would drop a search in progress);
  // a reply that arrives meanwhile just adds the banner on top.
  function showReplyBanner() {
    if (state.mode !== 'help' || !state.conv || !hasUnread()) return;
    var help = view.querySelector('.help');
    if (!help || help.querySelector('.reply')) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'reply';
    b.innerHTML = '<span>💬 You have a new reply from Support</span><b>Open</b>';
    b.addEventListener('click', function () { track('support_chat_from_help'); showChat(); });
    help.insertBefore(b, help.firstChild);
  }

  function showChat() {
    state.mode = 'chat';
    render();
    if (state.conv) markRead();
  }
  function showHelp() {
    state.mode = 'help';
    render();
  }

  function render() {
    var chat = state.mode === 'chat';
    backBtn.hidden = !chat;
    $('.ttl').textContent = chat ? 'TalkLive Support' : 'Help & Support';
    $('.hd small i').style.display = chat ? '' : 'none';
    if (chat) setStatus();
    else $('.hd .st').textContent = 'Answers to common questions';
    if (!chat) return renderHelp();
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
  // No bubble: an unread reply marks every Help & Support entry point instead.
  function updateBadge() {
    var unread = !(state.open && state.mode === 'chat') && hasUnread();
    var els = document.querySelectorAll('[data-support-open]');
    for (var i = 0; i < els.length; i++) els[i].classList.toggle('tl-support-unread', unread);
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
      if (state.open && state.mode === 'chat') { markRead(); render(); } else { if (state.open) showReplyBanner(); updateBadge(); }
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

  // mode: 'help' (default) or 'chat'.
  function open(mode) {
    endPromo();
    lastOpener = document.activeElement;
    state.open = true;
    state.mode = mode === 'chat' ? 'chat' : 'help';
    panel.classList.add('on');
    render();
    Promise.all([loadConfig(), refresh()]).then(function () {
      if (!state.open) return;
      if (state.mode === 'chat') render(); else showReplyBanner();
      if (state.mode === 'chat' && state.conv) markRead();
      updateBadge();
      schedule();
    });
    setTimeout(function () { var f = view.querySelector('.q'); if (f && state.open && state.mode === 'help' && !matchMedia('(max-width: 760px)').matches) f.focus(); }, 60);
  }
  function close() {
    state.open = false;
    panel.classList.remove('on');
    updateBadge();
    schedule();
    if (lastOpener && lastOpener.focus) { try { lastOpener.focus(); } catch (_) { /* gone */ } }
  }

  backBtn.addEventListener('click', showHelp);
  $('.hd .x').addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && state.open) close(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && state.open) refresh(); schedule(); });
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest && e.target.closest('[data-support-open]');
    if (!t) return;
    e.preventDefault();
    open(t.getAttribute('data-support-open') === 'chat' ? 'chat' : 'help');
  });

  // The unread dot on Help & Support links (they live outside the shadow root).
  var dotCss = document.createElement('style');
  dotCss.textContent = '[data-support-open].tl-support-unread{position:relative}'
    + '[data-support-open].tl-support-unread::after{content:"";position:absolute;top:6px;right:6px;width:9px;height:9px;border-radius:50%;background:#ff4d6d;box-shadow:0 0 0 2px var(--bg,#11162a)}';
  document.head.appendChild(dotCss);

  // Sit above a bottom tab bar (the app's .tl-nav on phones), and follow the
  // site's light/dark theme.
  var w = $('.w');
  function layout() {
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
  setInterval(function () { if (state.open) layout(); }, 1000);
  addEventListener('resize', layout);

  // --- "New: Chat Support" announcement ---------------------------------------
  // The server sets a window (2 days from launch). Only the home-screen chip in
  // engage.js shows it now; opening help ends it for this visitor.
  var PROMO_KEY = 'tl_support_promo';
  var promoUntil = 0;
  function promoLive() { return promoUntil > Date.now() && ls(PROMO_KEY) !== String(promoUntil); }
  function endPromo() {
    if (promoUntil) ls(PROMO_KEY, String(promoUntil));
    try { window.dispatchEvent(new Event('tl-support-promo')); } catch (_) { /* old browser */ }
  }
  function track(event) {
    try { fetch('/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: event }), keepalive: true }).catch(function () {}); } catch (_) { /* ignore */ }
  }
  fetch(API + 'promo', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (r) {
    promoUntil = Number(r.until) || 0;
    try { window.dispatchEvent(new Event('tl-support-promo')); } catch (_) { /* old browser */ }
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
      open('chat');
    }).catch(function () { open('chat'); });
  } else if (/[?&]support=open\b/.test(location.search) || location.hash === '#support') {
    open();
  } else {
    refresh().then(function () { updateBadge(); schedule(); }, schedule);
  }
})();
