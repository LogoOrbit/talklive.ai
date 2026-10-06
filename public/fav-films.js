/*
 * "Top 3 films & shows" on profiles. Shared by the call app (/) and the chat
 * app (/chat), and loaded only when a profile is first opened, so it costs a
 * first visit nothing.
 *
 *   TalkLiveFilms.ready                     -> Promise<boolean> (feature on?)
 *   TalkLiveFilms.show(box, clientId, sock) -> someone's row, read-only
 *   TalkLiveFilms.editor(box, sock)         -> this user's own row, editable
 *
 * Search runs here in the browser, so it costs the server nothing and needs no
 * API key: Wikidata (free, CC0) finds films that have an Apple ID, Apple's
 * iTunes Search API finds shows, and Apple supplies every poster and title.
 * Each visitor's searches count against their own IP's Apple limit (~20/min),
 * not the server's. Apple allows its artwork only to promote its store, so
 * every poster links to the title's Apple TV / iTunes page.
 *
 * Posters load straight from Apple's image CDN at a small fixed size, lazy,
 * with fixed dimensions, so they never touch this server or shift the layout.
 */
(function () {
  'use strict';

  var APPLE = 'https://itunes.apple.com/';
  var SPARQL = 'https://query.wikidata.org/sparql?format=json&query=';
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
    favFilmsCredit: 'Films via Wikidata · posters and shows via Apple',
    favFilmsBusy: 'Search is busy. Try again in a moment.',
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

  var ready = Promise.resolve(true);

  // Apple artwork URLs end in a size ("/100x100bb.jpg") the CDN will render at
  // any other size. Films are 2:3 posters; a show's art is square season art.
  function art(f, w) {
    var h = Math.round(w * 1.5);
    return String(f.art || '').replace(/\/\d+x\d+bb\.(jpg|png|webp)$/, '/' + (f.t === 'tv' ? h + 'x' + h : w + 'x' + h) + 'bb.$1');
  }

  var CSS =
    '.tlf{margin:14px auto 4px;text-align:left;width:100%;max-width:300px}' +
    '.tlf-h{display:flex;align-items:center;justify-content:space-between;margin:0 0 8px;font-size:13px;font-weight:700;color:var(--muted,#8a90a8);letter-spacing:.02em}' +
    '.tlf-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;max-width:300px}' +
    '.tlf-slot{position:relative;min-width:0}' +
    '.tlf-pickbtn{display:block;width:100%;padding:0;margin:0;border:0;background:none;color:inherit;font:inherit;text-align:left;text-decoration:none;cursor:pointer}' +
    '.tlf-poster{display:block;width:100%;aspect-ratio:2/3;height:auto;border-radius:8px;object-fit:cover;background:var(--line,rgba(255,255,255,.09))}' +
    '.tlf-empty{display:flex;align-items:center;justify-content:center;width:100%;aspect-ratio:2/3;border-radius:8px;border:1.5px dashed var(--line,rgba(255,255,255,.2));color:var(--muted,#8a90a8);font-size:26px;line-height:1}' +
    '.tlf-pickbtn:hover .tlf-empty,.tlf-pickbtn:focus-visible .tlf-empty{border-color:var(--accent,#6c5ce7);color:var(--accent,#6c5ce7)}' +
    '.tlf-name{display:block;margin-top:5px;font-size:12px;font-weight:600;color:var(--text,#f2f4ff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.tlf-year{display:block;font-size:11px;color:var(--muted,#8a90a8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.tlf-link{color:inherit;text-decoration:underline;text-underline-offset:2px}' +
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
    // The server ignores the request until this page's socket has registered,
    // which right after a page load (or a reconnect) can be a moment later -
    // so keep asking, more slowly each time, until an answer clears the wait.
    var tries = 0;
    (function ask() {
      if (!waiting[key]) return;
      if (++tries > 6) { delete waiting[key]; return; }
      sock.emit('get-fav-films', clientId ? { clientId: clientId } : {});
      setTimeout(ask, 1500 * tries);
    })();
  }

  // One poster. Someone else's links to its Apple page; your own opens the
  // picker to replace it. Either way the "Apple TV" link sits under it.
  function tile(f, editable, i) {
    var img = '<img class="tlf-poster" src="' + esc(art(f, 154)) + '" alt="" width="154" height="231" loading="lazy" decoding="async">';
    var name = '<span class="tlf-name">' + esc(f.title) + '</span>';
    var out = ' href="' + esc(f.url) + '" target="_blank" rel="noopener noreferrer"';
    var under = '<span class="tlf-year">' + (f.year ? esc(f.year) + ' · ' : '') +
      '<a class="tlf-link"' + out + '>Apple TV</a></span>';
    if (!editable) return '<div class="tlf-slot"><a class="tlf-pickbtn" title="' + esc(f.title) + '"' + out + '>' + img + name + '</a>' + under + '</div>';
    return '<div class="tlf-slot">' +
      '<button type="button" class="tlf-pickbtn" data-i="' + i + '" title="' + esc(f.title) + '">' + img + name + '</button>' + under +
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
      // Placeholder slots until the list arrives, so the section is never a
      // blank gap - but not tappable yet, or a pick could overwrite a list
      // that has not loaded.
      if (!box.querySelector('.tlf-row')) {
        box.innerHTML = '<p class="tlf-h">' + esc(tr('favFilmsMine')) + '</p><div class="tlf-row">' +
          '<div class="tlf-slot"><span class="tlf-empty" style="opacity:.4"></span></div>'.repeat(MAX) + '</div>';
      }
      load(sock, null, function (films) { paint(box, sock, films.slice()); });
    });
  }

  function paint(box, sock, films) {
    var slots = '';
    for (var i = 0; i < MAX; i++) {
      slots += films[i] ? tile(films[i], true, i)
        : '<button type="button" class="tlf-pickbtn" data-i="' + i + '" aria-label="' + esc(tr('favFilmsAdd')) + '"><span class="tlf-empty">+</span></button>';
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
    sock.emit('set-fav-films', { films: films.map(function (f) {
      return { t: f.t, id: f.id, title: f.title, year: f.year, art: f.art, url: f.url };
    }) });
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

  function getJSON(url) {
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 8000);
    return fetch(url, ctl ? { signal: ctl.signal } : {}).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    }, function (err) { clearTimeout(timer); throw err; });
  }

  function movieItem(r) {
    if (!r || r.kind !== 'feature-movie' || !r.artworkUrl100 || !r.trackViewUrl || r.trackExplicitness === 'explicit') return null;
    return { t: 'movie', id: r.trackId, title: r.trackName, year: String(r.releaseDate || '').slice(0, 4), art: r.artworkUrl100, url: r.trackViewUrl };
  }

  // Films: Apple's own film search barely works, so Wikidata finds the films
  // (only ones that list an Apple ID), then one Apple lookup fetches title,
  // year and poster for all of them. A film lists several Apple IDs, one per
  // country's store; the first one the US store knows is used.
  function searchFilms(q) {
    var term = q.replace(/[^\p{L}\p{N} '&:.-]/gu, ' ').replace(/\s+/g, ' ').trim();
    if (!term) return Promise.resolve([]);
    var query = 'SELECT ?item (GROUP_CONCAT(?id;separator=",") AS ?ids) WHERE { SERVICE wikibase:mwapi { ' +
      'bd:serviceParam wikibase:endpoint "www.wikidata.org"; wikibase:api "Search"; ' +
      'mwapi:srsearch "' + term + ' haswbstatement:P6398"; mwapi:srlimit "8". ' +
      '?item wikibase:apiOutputItem mwapi:title. ?ord wikibase:apiOrdinal true. } ' +
      '?item wdt:P6398 ?id. } GROUP BY ?item ?ord ORDER BY ?ord';
    return getJSON(SPARQL + encodeURIComponent(query)).then(function (j) {
      var groups = ((j && j.results && j.results.bindings) || []).map(function (b) {
        return String(b.ids.value).split(',').filter(function (id) { return /^\d{1,12}$/.test(id); }).slice(0, 12);
      });
      var ids = [].concat.apply([], groups).slice(0, 90);
      if (!ids.length) return [];
      return getJSON(APPLE + 'lookup?country=us&id=' + ids.join(',')).then(function (a) {
        var byId = {};
        ((a && a.results) || []).forEach(function (r) { var f = movieItem(r); if (f) byId[f.id] = f; });
        var out = [];
        groups.forEach(function (g) {
          for (var i = 0; i < g.length; i++) {
            var f = byId[Number(g[i])];
            if (f) { if (!out.some(function (o) { return o.id === f.id; })) out.push(f); break; }
          }
        });
        return out;
      });
    });
  }

  // Shows: Apple returns seasons; one entry per show, with the earliest
  // season's art, linking to the show's page. No year: the search returns
  // only some seasons, so "earliest" here is often not the show's first.
  function searchShows(q) {
    return getJSON(APPLE + 'search?country=us&media=tvShow&entity=tvSeason&limit=25&term=' + encodeURIComponent(q)).then(function (j) {
      var first = {};
      var order = [];
      ((j && j.results) || []).forEach(function (r) {
        if (!r.artistId || !r.artistName || !r.artworkUrl100 || r.collectionExplicitness === 'explicit') return;
        var cur = first[r.artistId];
        if (!cur) { first[r.artistId] = r; order.push(r.artistId); } else if (String(r.releaseDate) < String(cur.releaseDate)) first[r.artistId] = r;
      });
      return order.slice(0, 5).map(function (id) {
        var r = first[id];
        return { t: 'tv', id: r.artistId, title: r.artistName, year: '', art: r.artworkUrl100, url: r.artistViewUrl || r.collectionViewUrl };
      }).filter(function (f) { return f.url; });
    });
  }

  // Both searches at once. Titles that start with what was typed come first;
  // either source failing still shows the other's results.
  function searchAll(q) {
    var failed = 0;
    var safe = function (p) { return p.catch(function () { failed++; return []; }); };
    return Promise.all([safe(searchFilms(q)), safe(searchShows(q))]).then(function (r) {
      if (failed === 2) throw new Error('busy');
      var all = r[0].concat(r[1]);
      var starts = function (f) { return String(f.title).toLowerCase().indexOf(q) === 0 ? 0 : 1; };
      return all.map(function (f, i) { return { f: f, k: starts(f) * 100 + i }; })
        .sort(function (a, b) { return a.k - b.k; })
        .map(function (x) { return x.f; });
    });
  }

  // Search overlay. Debounced, and each query's results are kept for the
  // page's life, so typing and backspacing costs nothing extra.
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
        return '<button type="button" class="tlf-res" data-r="' + i + '"><img src="' + esc(art(f, 80)) + '" alt="" width="40" height="60" loading="lazy" decoding="async">' +
          '<span><b>' + esc(f.title) + '</b><small>' + esc([f.year, tr(f.t === 'tv' ? 'favFilmsTv' : 'favFilmsMovie')].filter(Boolean).join(' · ')) + '</small></span></button>';
      }).join('') : '<p class="tlf-msg">' + esc(tr('favFilmsNone')) + '</p>';
    }
    function search() {
      var q = input.value.trim().toLowerCase();
      last = q;
      if (q.length < 2) { list.innerHTML = ''; return; }
      if (results[q]) return render(results[q], q);
      list.innerHTML = '<p class="tlf-msg">…</p>';
      searchAll(q)
        .then(function (items) { results[q] = items; render(items, q); })
        .catch(function () {
          if (q === last) list.innerHTML = '<p class="tlf-msg">' + esc(tr('favFilmsBusy')) + '</p>';
        });
    }
    input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(search, 450); });
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
