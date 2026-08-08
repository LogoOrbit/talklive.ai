// ============================================================================
// TalkLive — shared client error reporting.
//
// Forwards uncaught JS errors to the server so the owner dashboard's Errors tab
// shows the bugs real users are actually hitting. Loaded by every page that has
// a Socket.IO connection (/ , /call and /chat), so no surface of the app is
// invisible to the dashboard.
//
// The Errors tab is only useful if everything in it is actionable, so this
// deliberately drops noise that is not our code and not fixable by us:
//   - wallet/crypto browser extensions injecting into the page (MetaMask etc.)
//   - Android WebView and iOS in-app browsers tearing down their JS bridge
//   - "Script error." from cross-origin scripts, which carries no information
//   - media play() rejections, which are the browser's autoplay policy working
//     as intended and are already handled where they happen
// ============================================================================
(function () {
  'use strict';

  var NOISE = [
    /metamask/i,
    /ethereum|web3|solana|phantom|coinbase.?wallet/i,
    /Java object is gone/i,
    /webkit\.messageHandlers/i,
    /^Script error\.?$/i,
    /ResizeObserver loop/i,
    /The (play method|request) is not allowed by the user agent/i,
    /The fetching process for the media resource was aborted/i,
    /play\(\) request was interrupted/i,
    /extension:\/\//i,
  ];

  // Message and stack are tested separately so anchored patterns (like the
  // bare "Script error.") still match when there is a stack alongside them.
  function isNoise(message, stack) {
    var msg = String(message || '').trim();
    var stk = String(stack || '').trim();
    for (var i = 0; i < NOISE.length; i++) {
      if (NOISE[i].test(msg) || (stk && NOISE[i].test(stk))) return true;
    }
    return false;
  }

  // Turn whatever was thrown into something readable. A rejection reason is
  // often a DOMException, a plain string or an object — reporting a bare
  // "Unhandled rejection" is what produced the blank, unfixable dashboard rows.
  function describeReason(reason) {
    if (!reason) return '';
    if (typeof reason === 'string') return reason;
    if (reason.message) return (reason.name || 'Error') + ': ' + reason.message;
    try {
      var json = JSON.stringify(reason);
      if (json && json !== '{}') return 'Unhandled rejection: ' + json;
    } catch (e) { /* circular or exotic value */ }
    return '';
  }

  // `getSocket` is a function so the page can install handlers before its
  // socket exists, and errors thrown during startup still get through.
  function install(getSocket) {
    function report(message, stack) {
      try {
        var msg = String(message || '').trim();
        // An empty message is unfixable: it says nothing but the page it came
        // from, and collapses every distinct bug into one useless row.
        if (!msg || isNoise(msg, stack)) return;
        var socket = getSocket();
        if (socket && socket.connected) {
          socket.emit('client-error', {
            message: msg.slice(0, 400),
            stack: String(stack || '').slice(0, 1500),
            url: location.pathname,
          });
        }
      } catch (e) { /* never let error reporting throw */ }
    }

    window.addEventListener('error', function (e) {
      // Failed <img>/<script>/<audio> loads also fire here but carry no
      // .message; those are network conditions, not bugs.
      if (!e.message) return;
      report(e.message, (e.error && e.error.stack) || ((e.filename || '') + ':' + (e.lineno || 0) + ':' + (e.colno || 0)));
    });
    window.addEventListener('unhandledrejection', function (e) {
      report(describeReason(e.reason), e.reason && e.reason.stack);
    });

    return report;
  }

  window.TalkLiveErrors = { install: install, isNoise: isNoise, describeReason: describeReason };
})();
