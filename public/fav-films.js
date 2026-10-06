/*
 * "Top 3 films & shows" on profiles. Shared by the call app (/) and the chat
 * app (/chat), and loaded only when a profile is first opened, so it costs a
 * first visit nothing.
 *
 *   TalkLiveFilms.ready                     -> Promise<boolean> (feature on?)
 *   TalkLiveFilms.show(box, clientId, sock) -> someone's row, read-only
 *   TalkLiveFilms.editor(box, sock)         -> this user's own row, editable
 *
 * Posters come straight from TMDB's image CDN at a small fixed width (w154 in
 * a profile, w92 in search), lazy-loaded with fixed dimensions, so they cost
 * this server nothing and never shift the layout.
 */
(function () {
  'use strict';

  var IMG = 'https://image.tmdb.org/t/p/';
  var MAX = 3;
  var CACHE_MS = 5 * 60000;
  var cache = {}; // clientId -> { films, at }
  var waiting = {}; // clientId -> [callback]
  var bound = null;
  var myId = null; // the clientId the server answers an own-list request with

  var EN = {
    favFilmsTitle: 'Top 3 films & shows',
    favFilmsMine: 'My top 3 films & shows',
    favFilmsAdd: 'Add',
    favFilmsRemove: 'Remove',
    favFilmsSearch: 'Search films and shows',
    favFilmsNone: 'Nothing found',
    favFilmsMovie: 'Film',
    favFilmsTv: 'Show',
    favFilmsCredit: 'Film data from TMDB',
  };
  function tr(key) {
    var s = typeof window.t === 'function' ? window.t(key) : key;
    return s && s !== key ? s : EN[key];
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var ready = fetch('/api/films/config')
    .then(function (r) { return r.ok ? r.json() : { enabled: false }; })
    .then(function (j) { return !!(j && j.enabled); })
    .catch(function () { return false; });

  var CSS =
    '.tlf{margin:14px auto 4px;text-align:left;width:100%;max-width:300px}' +
    '.tlf-h{display:flex;align-items:center;justify-content:space-between;margin:0 0 8px;font-size:13px;font-weight:700;color:var(--muted,#8a90a8);letter-spacing:.02em}' +
    '.tlf-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;max-width:300px}' +
    '.tlf-slot{position:relative;display:block;width:100%;min-width:0;padding:0;margin:0;border:0;background:none;color:inherit;font:inherit;text-align:left}' +
    'button.tlf-slot{cursor:pointer}' +
    '.tlf-poster{display:block;width:100%;aspect-ratio:2/3;height:auto;border-radius:8px;object-fit:cover;background:var(--line,rgba(255,255,255,.09))}' +
    '.tlf-empty{display:flex;align-items:center;justify-content:center;width:100%;aspect-ratio:2/3;border-radius:8px;border:1.5px dashed var(--line,rgba(255,255,255,.2));color:var(--muted,#8a90a8);font-size:26px;line-height:1}' +
    'button.tlf-slot:hover .tlf-empty,button.tlf-slot:focus-visible .tlf-empty{border-color:var(--accent,#6c5ce7);color:var(--accent,#6c5ce7)}' +
    '.tlf-name{display:block;margin-top:5px;font-size:12px;font-weight:600;color:var(--text,#f2f4ff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.tlf-year{display:block;font-size:11px;color:var(--muted,#8a90a8)}' +
    '.tlf-x{position:absolute;top:4px;right:4px;width:22px;height:22px;border-radius:50%;border:0;background:rgba(0,0,0,.65);color:#fff;font-size:15px;line-height:22px;padding:0;cursor:pointer}' +
    '.tlf-pick{position:fixed;inset:0;z-index:10050;display:flex;align-items:flex-start;justify-content:center;padding:max(5vh,16px) 16px 16px;background:rgba(0,0,0,.55)}' +
    '.tlf-box{width:100%;max-width:420px;max-height:80vh;display:flex;flex-direction:column;border-radius:16px;background:var(--bg-2,#111729);color:var(--text,#f2f4ff);border:1px solid var(--line,rgba(255,255,255,.09));box-shadow:0 20px 50px rgba(0,0,0,.4);overflow:hidden}' +
    '.tlf-top{display:flex;gap:8px;padding:12px;border-bottom:1px solid var(--line,rgba(255,255,255,.09))}' +
    '.tlf-q{flex:1;min-width:0;padding:10px 12px;border-radius:10px;border:1px solid var(--line,rgba(255,255,255,.15));background:transparent;color:inherit;font:inherit;font-size:16px}' +
    '.tlf-close{border:0;background:none;color:var(--muted,#8a90a8);font-size:24px;padding:0 6px;cursor:pointer}' +
    '.tlf-list{overflow-y:auto;padding:6px}' +
    '.tlf-res{display:flex;align-items:center;gap:10px;width:100%;padding:6px;border:0;border-radius:10px;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer}' +
    '.tlf-res:hover,.tlf-res:focus-visible{background:var(--line,rgba(255,255,255,.09))}' +
    '.tlf-res img{width:40px;height:60px;flex:none;border-radius:5px;object-fit:cover;background:var(--line,rgba(255,255,255,.09))}' +
    '.tlf-res b{display:block;font-size:14px;font-weight:600}' +
    '.tlf-res small{color:var(--muted,#8a90a8);font-size:12px}' +
    '.tlf-msg{padding:16px;text-align:center;color:var(--muted,#8a90a8);font-size:13px}' +
    '.tlf-credit{padding:6px 12px 10px;font-size:10px;color:var(--muted,#8a90a8);text-align:right}';
  var styled = false;
  function style() {
    if (styled) return;
    styled = true;
    var s = document.createElement('style');
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function bind(sock) {
    if (bound === sock) return;
    bound = sock;
    sock.on('fav-films', function (msg) {
      if (!msg || !msg.clientId) return;
      var films = Array.isArray(msg.films) ? msg.films : [];
      cache[msg.clientId] = { films: films, at: Date.now() };
      var keys = [msg.clientId];
      if (msg.self) { myId = msg.clientId; keys.push('me'); }
      keys.forEach(function (k) {
        var cbs = waiting[k] || [];
        delete waiting[k];
        cbs.forEach(function (cb) { cb(films); });
      });
    });
  }

  // clientId null = this user's own list.
  function load(sock, clientId, cb) {
    var key = clientId || 'me';
    var hit = cache[clientId || myId];
    if (hit && Date.now() - hit.at < CACHE_MS) return cb(hit.films);
    if (waiting[key]) return waiting[key].push(cb);
    waiting[key] = [cb];
    // No answer (offline, not registered yet): let the next open ask again.
    setTimeout(function () { delete waiting[key]; }, 8000);
    sock.emit('get-fav-films', clientId ? { clientId: clientId } : {});
  }

  function tile(f, editable, i) {
    var img = '<img class="tlf-poster" src="' + IMG + 'w154' + esc(f.p) + '" alt="" width="154" height="231" loading="lazy" decoding="async">';
    var text = '<span class="tlf-name">' + esc(f.title) + '</span><span class="tlf-year">' + esc(f.year || (f.t === 'tv' ? tr('favFilmsTv') : '')) + '</span>';
    if (!editable) return '<div class="tlf-slot" title="' + esc(f.title) + '">' + img + text + '</div>';
    return '<div class="tlf-slot">' +
      '<button type="button" class="tlf-slot" data-i="' + i + '" title="' + esc(f.title) + '">' + img + text + '</button>' +
      '<button type="button" class="tlf-x" data-x="' + i + '" aria-label="' + esc(tr('favFilmsRemove') + ' ' + f.title) + '">&times;</button></div>';
  }

  // Someone's row. Hidden when the feature is off or they picked nothing.
  function show(box, clientId, sock) {
    if (!box) return;
    box.innerHTML = '';
    box.hidden = true;
    if (!clientId || !sock) return;
    box.dataset.for = clientId;
    ready.then(function (on) {
      if (!on) return;
      bind(sock);
      load(sock, clientId, function (films) {
        if (box.dataset.for !== clientId) return; // a different profile is open now
        if (!films.length) return;
        style();
        box.classList.add('tlf');
        box.innerHTML = '<p class="tlf-h">' + esc(tr('favFilmsTitle')) + '</p><div class="tlf-row">' +
          films.slice(0, MAX).map(function (f) { return tile(f, false); }).join('') + '</div>';
        box.hidden = false;
      });
    });
  }

  // This user's own row: three slots, tap one to search and fill it.
  function editor(box, sock) {
    if (!box || !sock) return;
    ready.then(function (on) {
      box.hidden = !on;
      if (!on) return;
      bind(sock);
      style();
      box.classList.add('tlf');
      load(sock, null, function (films) { paint(box, sock, films.slice()); });
    });
  }

  function paint(box, sock, films) {
    var slots = '';
    for (var i = 0; i < MAX; i++) {
      slots += films[i] ? tile(films[i], true, i)
        : '<button type="button" class="tlf-slot" data-i="' + i + '" aria-label="' + esc(tr('favFilmsAdd')) + '"><span class="tlf-empty">+</span></button>';
    }
    box.innerHTML = '<p class="tlf-h">' + esc(tr('favFilmsMine')) + '</p><div class="tlf-row">' + slots + '</div>';
    box.onclick = function (e) {
      var x = e.target.closest('[data-x]');
      if (x) {
        films.splice(Number(x.dataset.x), 1);
        save(box, sock, films);
        return;
      }
      var slot = e.target.closest('[data-i]');
      if (!slot) return;
      var at = Math.min(Number(slot.dataset.i), films.length);
      openPicker(function (f) {
        // Fills the tapped slot (or the first empty one), and moves rather
        // than duplicates a title that is already in the list.
        var next = films.slice();
        next[at] = f;
        save(box, sock, next.filter(function (g, j) { return j === at || g.t !== f.t || g.id !== f.id; }));
      });
    };
  }

  function save(box, sock, films) {
    paint(box, sock, films); // painted now; the server's answer replaces it
    if (myId) cache[myId] = { films: films, at: Date.now() };
    sock.emit('set-fav-films', { films: films.map(function (f) { return { t: f.t, id: f.id }; }) });
    sock.off('set-fav-films-result');
    sock.once('set-fav-films-result', function (r) {
      if (r && r.ok && Array.isArray(r.films)) {
        if (myId) cache[myId] = { films: r.films, at: Date.now() };
        paint(box, sock, r.films.slice());
      } else if (r && r.error) {
        if (typeof window.showToast === 'function') window.showToast(r.error, 'error');
        if (myId) delete cache[myId];
        load(sock, null, function (f) { paint(box, sock, f.slice()); });
      }
    });
  }

  // Search overlay. Debounced, and each query is cached here as well as on
  // the server, so typing and backspacing costs nothing extra.
  var results = {};
  function openPicker(onPick) {
    style();
    var wrap = document.createElement('div');
    wrap.className = 'tlf-pick';
    wrap.innerHTML = '<div class="tlf-box" role="dialog" aria-modal="true" aria-label="' + esc(tr('favFilmsSearch')) + '">' +
      '<div class="tlf-top"><input class="tlf-q" type="search" maxlength="60" autocomplete="off" enterkeyhint="search" placeholder="' + esc(tr('favFilmsSearch')) + '">' +
      '<button type="button" class="tlf-close" aria-label="Close">&times;</button></div>' +
      '<div class="tlf-list"></div><div class="tlf-credit">' + esc(tr('favFilmsCredit')) + '</div></div>';
    document.body.appendChild(wrap);
    var input = wrap.querySelector('.tlf-q');
    var list = wrap.querySelector('.tlf-list');
    var timer = null;
    var shown = [];
    var last = '';
    function close() {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKey, true);
      wrap.remove();
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
    }
    function render(items, q) {
      if (q !== last) return;
      shown = items;
      list.innerHTML = items.length ? items.map(function (f, i) {
        return '<button type="button" class="tlf-res" data-r="' + i + '"><img src="' + IMG + 'w92' + esc(f.p) + '" alt="" width="40" height="60" loading="lazy" decoding="async">' +
          '<span><b>' + esc(f.title) + '</b><small>' + esc([f.year, tr(f.t === 'tv' ? 'favFilmsTv' : 'favFilmsMovie')].filter(Boolean).join(' · ')) + '</small></span></button>';
      }).join('') : '<p class="tlf-msg">' + esc(tr('favFilmsNone')) + '</p>';
    }
    function search() {
      var q = input.value.trim().toLowerCase();
      last = q;
      if (q.length < 2) { list.innerHTML = ''; return; }
      if (results[q]) return render(results[q], q);
      fetch('/api/films/search?q=' + encodeURIComponent(q))
        .then(function (r) { return r.json(); })
        .then(function (j) { results[q] = (j && j.results) || []; render(results[q], q); })
        .catch(function () { render([], q); });
    }
    input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(search, 350); });
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap || e.target.closest('.tlf-close')) return close();
      var r = e.target.closest('[data-r]');
      if (r) { var f = shown[Number(r.dataset.r)]; close(); if (f) onPick(f); }
    });
    document.addEventListener('keydown', onKey, true);
    setTimeout(function () { input.focus(); }, 0);
  }

  window.TalkLiveFilms = { ready: ready, show: show, editor: editor };
})();
