(function () {
  var css =
    '#tl-page-loader{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;' +
    'background:#0b0f1a;opacity:1;transition:opacity .35s ease;pointer-events:all}' +
    '#tl-page-loader.tl-hide{opacity:0;pointer-events:none}' +
    '#tl-page-loader .tl-spinner{width:44px;height:44px;border-radius:50%;border:3px solid rgba(23,201,100,.25);' +
    'border-top-color:#17c964;animation:tl-spin .8s linear infinite}' +
    '@keyframes tl-spin{to{transform:rotate(360deg)}}' +
    '@media (prefers-reduced-motion: reduce){#tl-page-loader .tl-spinner{animation:none;border-top-color:rgba(23,201,100,.7)}}';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var overlay = document.createElement('div');
  overlay.id = 'tl-page-loader';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = '<div class="tl-spinner"></div>';
  document.documentElement.appendChild(overlay);

  function hide() {
    overlay.classList.add('tl-hide');
  }

  window.addEventListener('load', function () {
    setTimeout(hide, 150);
  });
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(hide, 700);
  });

  document.addEventListener(
    'click',
    function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#' || /^(mailto:|tel:|javascript:)/i.test(href)) return;
      var url;
      try {
        url = new URL(href, window.location.href);
      } catch (err) {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.href.split('#')[0] === window.location.href.split('#')[0]) return;
      overlay.classList.remove('tl-hide');
    },
    true
  );

  window.addEventListener('pageshow', function (e) {
    if (e.persisted) hide();
  });
})();
