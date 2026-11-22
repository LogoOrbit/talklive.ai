// ============================================================================
// TalkLive - talk-time badges (docs/SPEC-PROFILE-PROGRESS-POSTS.md section 3).
//
// Ten miniature medals, earned automatically at 1, 5, 10, 25, 50, 100, 250,
// 500, 1000 and 2500 hours of calls. Each has its own shape, motif and colour,
// a soft shine that sweeps across it and a slow glow. Drawn as one inline SVG
// sprite per page (a <use> per badge afterwards), exactly like animals.js and
// characters.js, so there are no images and no requests.
//
// The server sends `badges: { top, earned: [ids], hours }` on a person's own
// state and on every public profile; nothing here computes a badge.
//
//   TalkLiveBadges.svg(id, size, locked)   one medal as markup
//   TalkLiveBadges.top(badges)             the id to show next to a name, or null
//   TalkLiveBadges.chip(badges, size)      top medal as a name-side chip ('' if none)
//   TalkLiveBadges.shelf(badges, tr)       the full shelf: earned + locked with hours
// ============================================================================
(function (global) {
  'use strict';

  var SPRITE_ID = 'tlBadgeSprite';
  var STYLE_ID = 'tlBadgeCss';

  var LIST = [
    { id: 'b1', name: 'First Words', hours: 1 },
    { id: 'b2', name: 'Chatterbox', hours: 5 },
    { id: 'b3', name: 'Storyteller', hours: 10 },
    { id: 'b4', name: 'Night Owl', hours: 25 },
    { id: 'b5', name: 'Globetrotter', hours: 50 },
    { id: 'b6', name: 'Silver Tongue', hours: 100 },
    { id: 'b7', name: 'Golden Voice', hours: 250 },
    { id: 'b8', name: 'Legend', hours: 500 },
    { id: 'b9', name: 'Mythic', hours: 1000 },
    { id: 'b10', name: 'TalkLive Icon', hours: 2500 },
  ];
  var BY_ID = {};
  LIST.forEach(function (b) { BY_ID[b.id] = b; });

  // --- drawing helpers --------------------------------------------------------
  function grad(id, a, b, c) {
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + a + '"/>'
      + (c ? '<stop offset=".55" stop-color="' + b + '"/><stop offset="1" stop-color="' + c + '"/>' : '<stop offset="1" stop-color="' + b + '"/>')
      + '</linearGradient>';
  }
  function path(d, fill, extra) { return '<path d="' + d + '" fill="' + fill + '"' + (extra || '') + '/>'; }
  function stroke(d, color, w, extra) {
    return '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '/>';
  }
  function circ(cx, cy, r, fill, extra) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + fill + '"' + (extra || '') + '/>'; }
  function mirror(s) { return '<g transform="matrix(-1 0 0 1 64 0)">' + s + '</g>'; }
  function spark(x, y, r, fill) {
    return '<path d="M' + x + ' ' + (y - r) + 'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y + 'Q' + x + ' ' + y + ' ' + x + ' ' + (y + r)
      + 'Q' + x + ' ' + y + ' ' + (x - r) + ' ' + y + 'Q' + x + ' ' + y + ' ' + x + ' ' + (y - r) + 'z" fill="' + (fill || '#fff') + '"/>';
  }
  function star(cx, cy, ro, ri, pts) {
    var d = '';
    for (var i = 0; i < pts * 2; i++) {
      var a = Math.PI * i / pts - Math.PI / 2;
      var r = i % 2 ? ri : ro;
      d += (i ? 'L' : 'M') + (cx + r * Math.cos(a)).toFixed(1) + ' ' + (cy + r * Math.sin(a)).toFixed(1);
    }
    return d + 'z';
  }

  // Medal outlines, all centred on (32, 27). sh(attrs) draws one with attributes.
  var SHAPES = {
    circle: function (a) { return '<circle cx="32" cy="27" r="22" ' + a + '/>'; },
    hex: function (a) { return '<path d="M32 3l20 11.5v25L32 51 12 39.500v-25z" ' + a + '/>'; },
    shield: function (a) { return '<path d="M32 3l19 5.500v16.500c0 12-8 20-19 26C21 45 13 37 13 25V8.500z" ' + a + '/>'; },
    burst: function (a) { return '<path d="' + star(32, 27, 24.5, 20, 14) + '" ' + a + '/>'; },
    octa: function (a) { return '<path d="M23 4h18l12 12v23L41 51H23L11 39V16z" ' + a + '/>'; },
    ring: function (a) { return '<circle cx="32" cy="27" r="22.500" ' + a + '/>'; },
  };

  // One medal: ribbon tails, outline in the rim gradient, an inset face, the
  // motif, a gloss and the moving shine. `n` scopes every id to this badge.
  function medal(n, o) {
    var k = 'tlb' + n;
    var sh = SHAPES[o.shape];
    var defs = '<defs>' + grad(k + 'r', o.rim[0], o.rim[1], o.rim[2]) + grad(k + 'f', o.face[0], o.face[1], o.face[2])
      + '<radialGradient id="' + k + 'g" cx=".35" cy=".25" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>'
      + '<clipPath id="' + k + 'c">' + sh('') + '</clipPath>' + (o.defs || '') + '</defs>';
    var tails = o.ribbon === false ? '' : mirror(path('M21 41l-7 20 10-5 5 7 2-20z', o.ribbon[0]) + path('M21 41l-7 20 3-1.500 6-17z', o.ribbon[1], ' opacity=".5"'))
      + path('M21 41l-7 20 10-5 5 7 2-20z', o.ribbon[0]) + path('M21 41l-7 20 3-1.500 6-17z', o.ribbon[1], ' opacity=".5"');
    return defs + (o.behind || '') + tails
      + sh('fill="url(#' + k + 'r)"')
      + '<g transform="translate(32 27) scale(.82) translate(-32 -27)">' + sh('fill="url(#' + k + 'f)"') + '</g>'
      + sh('fill="none" stroke="rgba(255,255,255,.55)" stroke-width=".8"')
      + o.motif
      + '<g clip-path="url(#' + k + 'c)">' + sh('fill="url(#' + k + 'g)"')
      + '<rect class="tlb-shine" x="-22" y="-4" width="12" height="64" fill="#fff"/></g>'
      + (o.front || '');
  }

  var ART = {
    // 1h - a first speech bubble, bronze.
    b1: function () {
      return medal(1, { shape: 'circle', rim: ['#f3b97a', '#cd7f32', '#8a4b16'], face: ['#e0a05a', '#b8691f', '#8a4b16'], ribbon: ['#b91c1c', '#fecaca'],
        motif: path('M20 17.500c0-2.800 2.200-5 5-5h14c2.800 0 5 2.200 5 5v9c0 2.800-2.200 5-5 5h-7l-7 6v-6c-3 0-5-2.200-5-5z', '#fff7ed')
          + circ(26, 22, 1.900, '#b8691f') + circ(32, 22, 1.900, '#b8691f') + circ(38, 22, 1.900, '#b8691f')
          + spark(46, 13, 3, '#fde68a') });
    },
    // 5h - two chatting bubbles, teal.
    b2: function () {
      return medal(2, { shape: 'circle', rim: ['#99f6e4', '#14b8a6', '#0f766e'], face: ['#2dd4bf', '#0d9488', '#115e59'], ribbon: ['#0f766e', '#99f6e4'],
        motif: path('M17 15c0-2.200 1.800-4 4-4h12c2.200 0 4 1.800 4 4v7c0 2.200-1.800 4-4 4h-8l-5 4.500V26c-2 0-3-1.800-3-4z', '#ccfbf1', ' opacity=".8"')
          + path('M27 25c0-2.200 1.800-4 4-4h11c2.200 0 4 1.800 4 4v7c0 2.200-1.800 4-4 4h-1v4.500L35 36h-4c-2.200 0-4-1.800-4-4z', '#ffffff')
          + circ(33, 28.500, 1.500, '#0d9488') + circ(38, 28.500, 1.500, '#0d9488') + circ(43, 28.500, 1.500, '#0d9488') });
    },
    // 10h - an open book, orange.
    b3: function () {
      return medal(3, { shape: 'hex', rim: ['#fed7aa', '#f97316', '#b45309'], face: ['#fb923c', '#ea580c', '#9a3412'], ribbon: ['#9a3412', '#fed7aa'],
        motif: path('M32 21c-4-3-10-4-15-3v19c5-1 11 0 15 3z', '#fff7ed') + path('M32 21c4-3 10-4 15-3v19c-5-1-11 0-15 3z', '#ffedd5')
          + stroke('M32 21v19', '#c2410c', 1.200) + stroke('M21 23c3 0 5 .5 8 1.500M21 27.500c3 0 5 .5 8 1.500M21 32c3 0 5 .5 8 1.500', '#f97316', 1.200)
          + stroke('M43 23c-3 0-5 .5-8 1.500M43 27.500c-3 0-5 .5-8 1.500M43 32c-3 0-5 .5-8 1.500', '#fb923c', 1.200)
          + spark(32, 12.500, 3.200, '#fef08a') });
    },
    // 25h - a crescent moon over a night sky, navy.
    b4: function () {
      return medal(4, { shape: 'circle', rim: ['#93c5fd', '#2563eb', '#1e3a8a'], face: ['#1e3a8a', '#172554', '#0b1437'], ribbon: ['#1e3a8a', '#93c5fd'],
        motif: path('M37 12.500a14.500 14.500 0 1 0 0 29 11.500 11.500 0 1 1 0-29z', '#fef9c3')
          + path('M30 17c-3 2-5 6-5 10 0 3 1 5.500 3 7.500-4-2-6-6-6-10.500 0-4 3-7.500 8-7z', '#fde68a', ' opacity=".7"')
          + spark(42, 18, 2.800, '#e0f2fe') + spark(46.500, 29, 2, '#bae6fd') + spark(40, 36, 1.600, '#fff') });
    },
    // 50h - a globe with an orbit, green.
    b5: function () {
      return medal(5, { shape: 'circle', rim: ['#bbf7d0', '#22c55e', '#166534'], face: ['#4ade80', '#16a34a', '#14532d'], ribbon: ['#166534', '#bbf7d0'],
        defs: '<clipPath id="tlb5w"><circle cx="32" cy="27" r="11.500"/></clipPath>',
        motif: circ(32, 27, 11.500, '#38bdf8') + '<g clip-path="url(#tlb5w)">'
          + path('M23 20c3-2 7-2 9 1-2 3-1 5-4 6-3 0-5-3-5-7zM34 28c4-1 8 1 9 5-3 3-7 4-9 1z', '#86efac')
          + '</g>' + stroke('M32 15.500v23M20.500 27h23', '#e0f2fe', .8, ' opacity=".7"') + '<ellipse cx="32" cy="27" rx="5" ry="11.500" fill="none" stroke="#e0f2fe" stroke-width=".8" opacity=".7"/>'
          + '<ellipse cx="32" cy="27" rx="17" ry="5.500" fill="none" stroke="#f0fdf4" stroke-width="1.600" transform="rotate(-22 32 27)"/>'
          + circ(46, 20, 1.800, '#fef08a') });
    },
    // 100h - a silver microphone on a shield.
    b6: function () {
      return medal(6, { shape: 'shield', rim: ['#ffffff', '#cbd5e1', '#64748b'], face: ['#cbd5e1', '#94a3b8', '#475569'], ribbon: ['#334155', '#cbd5e1'],
        motif: '<rect x="27" y="12" width="10" height="17" rx="5" fill="#f8fafc"/>'
          + stroke('M27.500 17h9M27.500 21h9M27.500 25h9', '#94a3b8', 1) + stroke('M22.500 25c0 5.500 4 9.500 9.500 9.500s9.500-4 9.500-9.500', '#f1f5f9', 2.200)
          + stroke('M32 34.500V41M27 41h10', '#f1f5f9', 2.200) + spark(43, 14, 2.600, '#fff') });
    },
    // 250h - a golden microphone with sound and a laurel, gold.
    b7: function () {
      return medal(7, { shape: 'burst', rim: ['#fff7b0', '#fbbf24', '#b45309'], face: ['#fde047', '#f59e0b', '#b45309'], ribbon: ['#b91c1c', '#fecaca'],
        motif: '<rect x="28" y="14" width="8" height="14" rx="4" fill="#fffbeb"/>' + stroke('M28.500 18.500h7M28.500 22h7', '#d97706', 1)
          + stroke('M24.500 25c0 4.500 3 7.500 7.500 7.500s7.500-3 7.500-7.500', '#fffbeb', 2) + stroke('M32 32.500V37M28 37h8', '#fffbeb', 2)
          + stroke('M21 19c-2 2.500-2 6 0 8.500M17.500 16c-3.500 4-3.500 10.500 0 14.500', '#fff7cc', 1.600, ' opacity=".85"')
          + stroke('M43 19c2 2.500 2 6 0 8.500M46.500 16c3.500 4 3.500 10.500 0 14.500', '#fff7cc', 1.600, ' opacity=".85"') });
    },
    // 500h - a crown on a crimson shield.
    b8: function () {
      return medal(8, { shape: 'shield', rim: ['#fde68a', '#f59e0b', '#92400e'], face: ['#ef4444', '#b91c1c', '#7f1d1d'], ribbon: ['#7f1d1d', '#fca5a5'],
        motif: path('M19.500 19l5 9 7.500-12 7.500 12 5-9v17h-25z', '#fde047') + path('M19.500 19l5 9 7.500-12v20h-12.500z', '#fef9c3', ' opacity=".5"')
          + path('M19.500 36h25v3h-25z', '#d97706') + circ(24.500, 28, 1.600, '#ef4444') + circ(32, 25, 1.800, '#38bdf8') + circ(39.500, 28, 1.600, '#ef4444')
          + circ(19.500, 18.500, 1.700, '#fff7cc') + circ(32, 15, 1.700, '#fff7cc') + circ(44.500, 18.500, 1.700, '#fff7cc') });
    },
    // 1000h - an eight-point star in an orbit, ice cyan.
    b9: function () {
      return medal(9, { shape: 'octa', rim: ['#ecfeff', '#22d3ee', '#0e7490'], face: ['#0e7490', '#164e63', '#0c2a3d'], ribbon: ['#155e75', '#a5f3fc'],
        motif: path(star(32, 27, 15, 5.500, 8), '#ecfeff') + path(star(32, 27, 10, 4.500, 8), '#67e8f9') + circ(32, 27, 3.600, '#ffffff') + circ(32, 27, 1.800, '#0891b2')
          + '<ellipse cx="32" cy="27" rx="18.500" ry="6" fill="none" stroke="#a5f3fc" stroke-width="1" opacity=".8" transform="rotate(28 32 27)"/>'
          + spark(15.500, 15, 2.200, '#fff') + spark(49, 40, 2.200, '#fff') });
    },
    // 2500h - the TalkLive voice wave in a winged, ever-shifting holo medal.
    b10: function () {
      var wing = path('M12 27C6 24 3 17 3 10c5 2 8 4 11 7-2-5-2-9-1-13 5 3 8 8 9 15z', 'url(#tlb10w)')
        + path('M12 31C6 31 2 28 1 22c4 1 8 1 12 0z', 'url(#tlb10w)', ' opacity=".85"');
      return medal(10, { shape: 'ring', rim: ['#ffffff', '#67e8f9', '#2a6fe8'], face: ['#00d4ff', '#2a6fe8', '#12388f'], ribbon: ['#1d4ed8', '#bae6fd'],
        defs: '<linearGradient id="tlb10w" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fef08a"/><stop offset=".5" stop-color="#67e8f9"/><stop offset="1" stop-color="#2a6fe8"/></linearGradient>',
        behind: wing + mirror(wing),
        motif: '<rect x="19.500" y="23" width="3.600" height="8" rx="1.800" fill="#fff"/><rect x="25" y="18" width="3.600" height="18" rx="1.800" fill="#fff"/>'
          + '<rect x="30.200" y="13.500" width="3.600" height="27" rx="1.800" fill="#fff"/><rect x="35.400" y="18" width="3.600" height="18" rx="1.800" fill="#fff"/>'
          + '<rect x="40.900" y="23" width="3.600" height="8" rx="1.800" fill="#fff"/>',
        front: path('M23 8.500l3 4.500 6-7 6 7 3-4.500-1 8H24z', '#fde047') + circ(32, 4.800, 1.600, '#fff7cc') + spark(50, 40, 2.400, '#fff') });
    },
  };

  // --- CSS (once): shine sweep, slow glow, locked look; reduced motion stills it.
  function installCss() {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent =
      '.tl-badge{display:inline-block;flex:none;vertical-align:middle;overflow:visible;filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))}'
      + '.tl-badge.is-glow{animation:tlbGlow 3.6s ease-in-out infinite}'
      + '.tlb-shine{opacity:.55;transform:translateX(-30px) skewX(-20deg);animation:tlbShine 4.6s ease-in-out infinite}'
      + '@keyframes tlbShine{0%,55%{transform:translateX(-30px) skewX(-20deg)}100%{transform:translateX(110px) skewX(-20deg)}}'
      + '@keyframes tlbGlow{0%,100%{filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))}50%{filter:drop-shadow(0 0 5px rgba(255,214,102,.75))}}'
      + '.tl-badge.is-locked{filter:grayscale(1) brightness(.55);opacity:.7;animation:none}.tl-badge.is-locked .tlb-shine{display:none}'
      + '@media (prefers-reduced-motion:reduce){.tl-badge.is-glow,.tlb-shine{animation:none}.tlb-shine{display:none}}'
      // name-side chip and the shelf
      + '.tl-badge-chip{display:inline-flex;align-items:center;gap:5px;margin-inline-start:6px;padding:2px 8px 2px 4px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid var(--line,rgba(255,255,255,.12));font-size:.72em;font-weight:700;vertical-align:middle;white-space:nowrap}'
      + '.tl-badge-shelf{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:10px;margin:0;padding:0;list-style:none}'
      + '.tl-badge-cell{display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 6px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid var(--line,rgba(255,255,255,.1));text-align:center}'
      + '.tl-badge-cell strong{font-size:12px;line-height:1.2}.tl-badge-cell small{font-size:11px;color:var(--muted,#8a90a8)}'
      + '.tl-badge-cell.is-locked strong{color:var(--muted,#8a90a8)}'
      + '.tl-badge-total{margin:0 0 10px;font-size:13px;color:var(--muted,#8a90a8)}';
    document.head.appendChild(st);
  }

  var spriteInstalled = false;
  function installSprite() {
    if (spriteInstalled || typeof document === 'undefined') return;
    installCss();
    if (document.getElementById(SPRITE_ID)) { spriteInstalled = true; return; }
    var symbols = '';
    LIST.forEach(function (b) { symbols += '<symbol id="tlbg-' + b.id + '" viewBox="0 0 64 64">' + ART[b.id]() + '</symbol>'; });
    var host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    host.innerHTML = '<svg id="' + SPRITE_ID + '" xmlns="http://www.w3.org/2000/svg">' + symbols + '</svg>';
    (document.body || document.documentElement).appendChild(host);
    spriteInstalled = true;
  }

  function fill(text, vars) {
    return vars ? text.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }) : text;
  }
  function tr(key, fallback, vars) {
    if (typeof global.t !== 'function') return fill(fallback, vars);
    var s = global.t(key, vars);
    return s && s !== key ? s : fill(fallback, vars);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function name(id) { return BY_ID[id] ? tr('badge' + id.toUpperCase(), BY_ID[id].name) : ''; }

  function svg(id, size, locked) {
    if (!BY_ID[id]) return '';
    installSprite();
    var s = size || 28;
    return '<svg class="tl-badge' + (locked ? ' is-locked' : (size >= 40 ? ' is-glow' : '')) + '" width="' + s + '" height="' + s
      + '" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><use href="#tlbg-' + id + '"/></svg>';
  }

  // The badge to show beside a name: the server's `top`, else the highest earned.
  function top(badges) {
    if (!badges || typeof badges !== 'object') return null;
    if (badges.top && BY_ID[badges.top]) return badges.top;
    var earned = Array.isArray(badges.earned) ? badges.earned.filter(function (b) { return BY_ID[b]; }) : [];
    if (!earned.length) return null;
    earned.sort(function (a, b) { return BY_ID[a].hours - BY_ID[b].hours; });
    return earned[earned.length - 1];
  }

  function chip(badges, size, withName) {
    var id = top(badges);
    if (!id) return '';
    var label = name(id);
    return '<span class="tl-badge-chip" title="' + esc(label) + '">' + svg(id, size || 20)
      + (withName === false ? '' : '<span>' + esc(label) + '</span>') + '</span>';
  }

  function fmtHours(h) { return h >= 100 ? String(Math.round(h)) : String(Math.round(h * 10) / 10); }

  // Earned medals first, then the locked ones with the hours still needed.
  function shelf(badges) {
    installSprite();
    var earned = badges && Array.isArray(badges.earned) ? badges.earned : [];
    var hours = badges && Number(badges.hours) > 0 ? Number(badges.hours) : 0;
    var cells = LIST.map(function (b) {
      var has = earned.indexOf(b.id) !== -1;
      var small = has
        ? tr('badgeEarnedAt', '{n} h', { n: b.hours })
        : tr('badgeNeedMore', '{n} h to go', { n: fmtHours(Math.max(0.1, b.hours - hours)) });
      return '<li class="tl-badge-cell' + (has ? '' : ' is-locked') + '" data-badge="' + b.id + '">' + svg(b.id, 52, !has)
        + '<strong>' + esc(name(b.id)) + '</strong><small>' + esc(small) + '</small></li>';
    }).join('');
    return '<p class="tl-badge-total">' + esc(tr('badgeTotal', '{n} h talked', { n: fmtHours(hours) })) + '</p><ul class="tl-badge-shelf">' + cells + '</ul>';
  }

  global.TalkLiveBadges = { list: LIST, name: name, svg: svg, top: top, chip: chip, shelf: shelf, installSprite: installSprite };
}(window));
