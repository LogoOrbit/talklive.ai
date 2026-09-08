/*
 * TalkLive PWA + referral capture. Loads on every page (marketing pages
 * included), so it is deliberately small, dependency-free and does nothing that
 * could interfere with a page's own scripts.
 *
 * Four jobs:
 *
 * 1. Capture ?ref= on arrival. A referral click usually lands on a marketing
 *    page, not the app, and the visitor has no clientId until they register -
 *    so the code is parked in localStorage here and read by app.js later.
 * 2. Register the service worker, which is what makes the site installable and
 *    what receives push notifications.
 * 3. Offer "Add to home screen" - but only to someone who has come back, never
 *    on a first visit. A first-time visitor has not decided they want this yet,
 *    and the prompt is spendable exactly once.
 * 4. Ask for notification permission - and only after the user has a reason to
 *    say yes. See maybeAskForPush.
 *
 * The order matters: an install/notification prompt shown too early is not just
 * ignored, it is *denied*, and a denial is close to permanent. So both are
 * gated on evidence the person actually wants the product.
 */
(function () {
  'use strict';

  var VISIT_KEY = 'tl_visits';
  var INSTALL_DISMISSED_KEY = 'tl_install_dismissed_at';
  var PUSH_ASKED_KEY = 'tl_push_asked_at';
  var REF_KEY = 'tl_ref_code';

  function readLS(key, fallback) {
    try { var v = localStorage.getItem(key); return v === null ? fallback : v; } catch (_) { return fallback; }
  }
  function writeLS(key, value) {
    try { localStorage.setItem(key, value); } catch (_) {}
  }

  // --- 1. Referral capture ---------------------------------------------------

  try {
    var ref = new URLSearchParams(location.search).get('ref');
    // 'invite' is the legacy untracked value used by older shared links; it
    // names no owner, so storing it would only stop a real code arriving later.
    if (ref && ref !== 'invite' && /^[A-Z0-9]{4,16}$/i.test(ref)) {
      // First code wins for the life of this browser, matching the server's
      // first-claim-wins rule - otherwise the last link someone clicked would
      // silently reassign credit for a user who arrived through someone else.
      if (!readLS(REF_KEY, '')) writeLS(REF_KEY, ref.toUpperCase());
    }
  } catch (_) {}

  // --- 2. Service worker -----------------------------------------------------

  var swReady = null;
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    // After load, not during: registration competes with the page's own
    // resources otherwise, and this is never on the critical path.
    window.addEventListener('load', function () {
      swReady = navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () { return null; });
    });
  } else if ('serviceWorker' in navigator && location.hostname === 'localhost') {
    window.addEventListener('load', function () {
      swReady = navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () { return null; });
    });
  }

  var visits = Number(readLS(VISIT_KEY, '0')) || 0;
  visits += 1;
  writeLS(VISIT_KEY, String(visits));

  // --- 3. Install prompt -----------------------------------------------------

  var deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', function (e) {
    // Suppress Chrome's own mini-infobar so the prompt can be shown at a moment
    // the user is receptive rather than the moment the page loads.
    e.preventDefault();
    deferredPrompt = e;
    maybeShowInstallCard();
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    removeCard('tlInstallCard');
    track('pwa_installed');
  });

  function maybeShowInstallCard() {
    if (!deferredPrompt) return;
    // Second visit onwards only. Someone who has come back once has shown more
    // intent than any first-visit heuristic can.
    if (visits < 2) return;
    var dismissed = Number(readLS(INSTALL_DISMISSED_KEY, '0')) || 0;
    if (Date.now() - dismissed < 14 * 24 * 60 * 60 * 1000) return;
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return;

    showCard({
      id: 'tlInstallCard',
      title: text('installTitle', 'Add TalkLive to your home screen'),
      body: text('installBody', 'One tap to open, and it works like an app.'),
      confirm: text('installBtn', 'Install'),
      dismiss: text('installLater', 'Not now'),
      onConfirm: function () {
        var prompt = deferredPrompt;
        deferredPrompt = null;
        if (!prompt) return;
        track('pwa_install_click');
        prompt.prompt();
      },
      onDismiss: function () { writeLS(INSTALL_DISMISSED_KEY, String(Date.now())); },
    });
  }

  // --- 4. Push permission ----------------------------------------------------

  /**
   * Ask for notification permission - called by app.js only after the user has
   * done something that makes notifications obviously useful (adding a friend,
   * or being sent a message). Never on page load: a permission prompt with no
   * context is denied, and Chrome's denials do not expire.
   */
  function maybeAskForPush(reason) {
    if (!('Notification' in window) || !('PushManager' in window)) return;
    if (Notification.permission !== 'default') return;
    var asked = Number(readLS(PUSH_ASKED_KEY, '0')) || 0;
    if (Date.now() - asked < 30 * 24 * 60 * 60 * 1000) return;

    fetch('/push/key').then(function (r) { return r.json(); }).then(function (cfg) {
      if (!cfg || !cfg.enabled || !cfg.key) return;
      showCard({
        id: 'tlNotifyCard',
        title: text('notifyTitle', 'Get notified when a friend messages'),
        body: text('notifyBody', 'We will only notify you about friend messages and call-backs. Never marketing.'),
        confirm: text('notifyBtn', 'Turn on'),
        dismiss: text('notifyLater', 'No thanks'),
        onConfirm: function () {
          writeLS(PUSH_ASKED_KEY, String(Date.now()));
          // The browser's own dialog only appears after this soft prompt, so a
          // "no thanks" here costs nothing and can be asked again later.
          subscribe(cfg.key, reason);
        },
        onDismiss: function () { writeLS(PUSH_ASKED_KEY, String(Date.now())); },
      });
    }).catch(function () {});
  }

  function urlBase64ToUint8Array(base64) {
    var padding = '='.repeat((4 - (base64.length % 4)) % 4);
    var raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  function subscribe(vapidKey, reason) {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then(function (reg) {
      return reg.pushManager.subscribe({
        // Chrome refuses a subscription without this: every push must result in
        // a visible notification, which is exactly what we do.
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }).then(function (sub) {
      var ids = window.TalkLiveIdentity && window.TalkLiveIdentity();
      if (!ids || !ids.clientId || !ids.identityToken) return;
      return fetch('/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: ids.clientId,
          identityToken: ids.identityToken,
          subscription: sub.toJSON(),
        }),
      }).then(function () {
        track('push_optin');
      });
    }).catch(function () { /* denied, or no push service - nothing to do */ });
  }

  // --- Shared card UI --------------------------------------------------------

  function text(key, fallback) {
    try {
      return (typeof window.t === 'function' && window.t(key) !== key) ? window.t(key) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function track(event) {
    // Only the fixed vocabulary the server accepts; anything else is a 400 and
    // deliberately not retried.
    fetch('/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: event }),
      keepalive: true,
    }).catch(function () {});
  }

  function removeCard(id) {
    var el = document.getElementById(id);
    if (el) el.remove();
  }

  function showCard(opts) {
    if (document.getElementById(opts.id)) return;
    var card = document.createElement('div');
    card.id = opts.id;
    card.className = 'pwa-prompt';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-live', 'polite');

    var h = document.createElement('h3');
    h.textContent = opts.title;
    var p = document.createElement('p');
    p.textContent = opts.body;
    var actions = document.createElement('div');
    actions.className = 'pwa-prompt-actions';
    var yes = document.createElement('button');
    yes.type = 'button';
    yes.className = 'pwa-prompt-yes';
    yes.textContent = opts.confirm;
    var no = document.createElement('button');
    no.type = 'button';
    no.className = 'pwa-prompt-no';
    no.textContent = opts.dismiss;

    // textContent everywhere above rather than innerHTML: none of this is
    // user-supplied today, but a prompt built by string concatenation is how it
    // stops being true later.
    actions.appendChild(no);
    actions.appendChild(yes);
    card.appendChild(h);
    card.appendChild(p);
    card.appendChild(actions);

    function close() {
      card.classList.remove('show');
      setTimeout(function () { card.remove(); }, 300);
    }
    no.addEventListener('click', function () { close(); if (opts.onDismiss) opts.onDismiss(); });
    yes.addEventListener('click', function () { close(); if (opts.onConfirm) opts.onConfirm(); });

    document.body.appendChild(card);
    requestAnimationFrame(function () { card.classList.add('show'); });
  }

  // app.js calls this once the user has done something that makes push worth
  // asking about.
  window.TalkLivePWA = {
    askForPush: maybeAskForPush,
    promptInstall: maybeShowInstallCard,
    visits: function () { return visits; },
  };
}());
