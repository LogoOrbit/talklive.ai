/* Bot check. The server asks ('captcha-required') before a guest's first
   search; this shows Cloudflare's challenge in a small box and returns the
   token. The page's own search retry carries on once the server says OK. */
(function () {
  var box, widget, loading;
  function load(cb) {
    if (window.turnstile) return cb();
    if (loading) return loading.push(cb);
    loading = [cb];
    var s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = function () { var q = loading; loading = null; q.forEach(function (f) { f(); }); };
    s.onerror = function () { loading = null; };
    document.head.appendChild(s);
  }
  function hide() { if (box) { box.remove(); box = null; } widget = null; }
  function show() {
    var key = window.TURNSTILE_SITE_KEY, sock = window.tlSocket;
    if (!key || !sock || box) return;
    box = document.createElement('div');
    box.className = 'modal-overlay tl-captcha';
    box.innerHTML = '<div class="modal-box modal-box-narrow" role="dialog" aria-modal="true" aria-labelledby="tlCapT" style="padding:24px;text-align:center">' +
      '<div role="heading" aria-level="2" id="tlCapT" style="font-size:19px;font-weight:800;margin-bottom:6px">Quick check</div>' +
      '<p style="margin:0 0 16px;opacity:.75;font-size:14.5px">Confirm you are a person to start talking.</p>' +
      '<div class="tl-captcha-widget" style="display:flex;justify-content:center;min-height:65px"></div></div>';
    document.body.appendChild(box);
    load(function () {
      if (!box) return;
      widget = window.turnstile.render(box.querySelector('.tl-captcha-widget'), {
        sitekey: key,
        theme: document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark',
        callback: function (token) { sock.emit('captcha-token', token); }
      });
    });
  }
  var sock = window.tlSocket;
  sock.on('captcha-ok', hide);
  sock.on('captcha-failed', function () { if (widget && window.turnstile) window.turnstile.reset(widget); });
  window.tlCaptcha = show;
})();
