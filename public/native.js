/*
 * TalkLive inside the mobile app (mobile/, Capacitor).
 *
 * The app shows this website in a WebView and injects window.Capacitor. Outside
 * the app this file does nothing but define TalkLiveNative.isApp = false, so
 * the rest of the site can ask "am I in the app?" without feature-sniffing.
 *
 * The pages load it only when window.Capacitor says they are in the app (see
 * the inline loader in index.html / chat.html), so browsers never download it.
 * It may run after app.js; app.js waits for the 'tl-native-ready' event.
 *
 * It replaces what a WebView cannot do:
 *  - push:      Firebase notifications instead of web push (WebViews have no
 *               PushManager). The token is posted to /push/native-subscribe.
 *  - calls:     app.js reports the call state; while a call is live the app
 *               runs a foreground service so it survives the user leaving.
 *  - sign-in:   Google blocks its web button in apps, so app.js asks the phone
 *               for a Google ID token and sends it like the web credential.
 *  - links:     talklive.app links opened from elsewhere land on that page.
 */
(function () {
  var cap = window.Capacitor;
  var isApp = !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
  if (!isApp) {
    window.TalkLiveNative = { isApp: false };
    return;
  }

  var plugins = cap.Plugins || {};
  var bridge = plugins.TalkLiveNative;
  var push = plugins.PushNotifications;
  var appPlugin = plugins.App;
  var platform = typeof cap.getPlatform === 'function' ? cap.getPlatform() : 'android';
  document.documentElement.classList.add('tl-app', 'tl-app-' + platform);

  // --- Push ------------------------------------------------------------------

  function identity() {
    var ids = typeof window.TalkLiveIdentity === 'function' ? window.TalkLiveIdentity() : null;
    return ids && ids.clientId && ids.identityToken ? ids : null;
  }

  // The identity is created by app.js after this file runs; wait for it.
  function withIdentity(fn, tries) {
    var ids = identity();
    if (ids) return fn(ids);
    if ((tries || 0) < 60) setTimeout(function () { withIdentity(fn, (tries || 0) + 1); }, 1000);
  }

  function sendToken(token) {
    withIdentity(function (ids) {
      fetch('/push/native-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: ids.clientId, identityToken: ids.identityToken, token: token, platform: platform }),
      }).catch(function () {});
    });
  }

  // prompt=false only refreshes the token when permission was already given;
  // the system dialog appears only at the moments app.js chooses (a friend
  // accepted, a message arrived), same as the website's soft prompt.
  // Firebase must be in the build (google-services.json) and the server must
  // be able to send; otherwise asking for permission would promise nothing.
  var pushReady = null;
  function pushIsReady() {
    if (!pushReady) {
      pushReady = Promise.all([
        bridge ? bridge.pushAvailable().then(function (r) { return !!r.available; }) : Promise.resolve(false),
        fetch('/push/key').then(function (r) { return r.json(); }).then(function (c) { return !!(c && c.app); }),
      ]).then(function (ok) { return ok[0] && ok[1]; }).catch(function () { return false; });
    }
    return pushReady;
  }

  function registerPush(prompt) {
    if (!push) return Promise.resolve(false);
    return pushIsReady().then(function (ready) {
      if (!ready) return false;
      return askAndRegister(prompt);
    });
  }

  function askAndRegister(prompt) {
    return push.checkPermissions().then(function (status) {
      if (status.receive === 'granted') return push.register().then(function () { return true; });
      if (!prompt || status.receive === 'denied') return false;
      return push.requestPermissions().then(function (next) {
        if (next.receive !== 'granted') return false;
        return push.register().then(function () { return true; });
      });
    }).catch(function () { return false; });
  }

  if (push) {
    push.addListener('registration', function (t) { if (t && t.value) sendToken(t.value); });
    // Tapping a notification opens the conversation or request it was about.
    push.addListener('pushNotificationActionPerformed', function (action) {
      var data = (action && action.notification && action.notification.data) || {};
      if (typeof data.url === 'string' && data.url.charAt(0) === '/' && data.url.charAt(1) !== '/') {
        location.href = data.url;
      }
    });
    registerPush(false);
  }

  // --- Links -----------------------------------------------------------------

  if (appPlugin) {
    appPlugin.addListener('appUrlOpen', function (event) {
      try {
        var url = new URL(event.url);
        if (url.hostname === 'talklive.app') location.href = url.pathname + url.search + url.hash;
      } catch (_) { /* not a URL we handle */ }
    });
  }

  // --- API for app.js / pwa.js -------------------------------------------------

  var callActive = false;

  window.TalkLiveNative = {
    isApp: true,
    platform: platform,

    askForPush: function () { return registerPush(true); },

    // app.js setCallState: idle | searching | connecting | connected |
    // reconnecting | disconnected.
    callState: function (state) {
      var active = state === 'connecting' || state === 'connected' || state === 'reconnecting';
      if (active === callActive || !bridge) return;
      callActive = active;
      bridge.setCallActive({ active: active, title: 'On a TalkLive call' }).catch(function () {});
    },

    // Replaces Google's web button (which Google blocks in apps) with one that
    // asks the phone for a Google ID token for the site's own client ID. The
    // server verifies it exactly like the web button's credential.
    mountGoogleButtons: function (slots, onCredential, onError) {
      if (!bridge || !window.GOOGLE_CLIENT_ID) return;
      addGoogleStyles();
      document.querySelectorAll('.google-block').forEach(function (el) { el.classList.remove('hidden'); });
      slots.forEach(function (slot) {
        if (!slot || slot.dataset.native) return;
        slot.dataset.native = '1';
        var host = slot.querySelector('.google-btn-real') || slot;
        host.innerHTML = '';
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'google-btn-native';
        btn.innerHTML = GOOGLE_G + '<span>Continue with Google</span>';
        btn.addEventListener('click', function () {
          bridge.googleSignIn({ clientId: window.GOOGLE_CLIENT_ID })
            .then(function (r) { onCredential({ credential: r.credential }); })
            .catch(function (err) { if (!err || err.code !== 'cancelled') onError(); });
        });
        host.appendChild(btn);
        slot.classList.add('is-ready');
      });
    },
  };

  var GOOGLE_G = '<svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">'
    + '<path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/>'
    + '<path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 7l7.4 5.7c4.3-4 6.9-9.9 6.9-17.2z"/>'
    + '<path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/>'
    + '<path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>';

  function addGoogleStyles() {
    if (document.getElementById('tlNativeGoogleCss')) return;
    var style = document.createElement('style');
    style.id = 'tlNativeGoogleCss';
    style.textContent = '.google-btn-native{display:inline-flex;align-items:center;justify-content:center;gap:10px;'
      + 'width:100%;max-width:400px;min-height:44px;padding:0 18px;border:1px solid #dadce0;border-radius:999px;'
      + 'background:#fff;color:#1f1f1f;font:500 15px/1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;cursor:pointer}'
      + '.google-btn-native:active{background:#f1f3f4}';
    document.head.appendChild(style);
  }

  window.dispatchEvent(new Event('tl-native-ready'));
}());
