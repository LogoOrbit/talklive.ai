// Temporary: the store is being moved and people's friends and messages may
// go missing for a while. A one-line note on the start screen and in the
// Friends panel (where someone looks when a friend has disappeared), until the
// person taps "Got it" - then it is gone from both.
//
// Self-contained on purpose. To remove it, delete the data-notice.js and
// data-notice.css tags from index.html and chat.html; nothing else refers to
// it.
(function () {
  var KEY = 'talklive_data_notice_v1';

  // English is the text; a translation is used if one is ever added under the
  // same keys. t() returns the key itself when it has nothing.
  function tx(key, fallback) {
    if (typeof t === 'function') {
      var s = t(key);
      if (s && s !== key) return s;
    }
    return fallback;
  }

  var TITLE = tx('dataNoticeTitle', 'Beta');
  var BODY = tx('dataNoticeBody', 'Friends and messages may occasionally reset.');
  var OK = tx('dataNoticeOk', 'Got it');

  function seen() {
    try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; }
  }

  function build(dismissible) {
    var box = document.createElement('div');
    box.className = 'tl-data-notice' + (dismissible ? ' is-dismissible' : '');
    box.setAttribute('role', 'note');
    box.innerHTML =
      '<span class="tl-data-notice-icon" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M12 3 2.5 20h19L12 3z"/><path d="M12 10v4.5"/><path d="M12 17.5h.01"/>' +
        '</svg>' +
      '</span>' +
      '<span class="tl-data-notice-text">' +
        '<strong></strong><span></span>' +
      '</span>';
    box.querySelector('strong').textContent = TITLE;
    box.querySelector('.tl-data-notice-text > span').textContent = BODY;
    if (dismissible) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tl-data-notice-ok';
      btn.textContent = OK;
      btn.addEventListener('click', function () {
        try { localStorage.setItem(KEY, '1'); } catch (e) { /* private mode: it just comes back */ }
        // Every start-screen copy on the page goes together.
        document.querySelectorAll('.tl-data-notice.is-dismissible').forEach(function (el) { el.remove(); });
      });
      box.appendChild(btn);
    }
    return box;
  }

  function init() {
    if (seen()) return;
    ['#friendsDropdown .tl-panel-body', '#friendsPanel .tl-panel-body'].forEach(function (sel) {
      var body = document.querySelector(sel);
      if (body) body.insertBefore(build(true), body.firstChild);
    });
    // Start screens: once per browser, right under the buttons people came for
    // so it is on the first screen without pushing them down.
    var startChat = document.getElementById('startChatBtn');   // home
    var anchor = startChat && startChat.parentElement;
    if (!anchor) anchor = document.querySelector('#viewStart .chat-start-actions'); // /chat
    if (anchor) anchor.insertAdjacentElement('afterend', build(true));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
