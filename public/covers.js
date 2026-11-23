// ============================================================================
// TalkLive - profile covers (docs/SPEC-PROFILE-PROGRESS-POSTS.md section 4).
//
// The banner behind a profile: six solids and six gradients for everyone, and
// six animated scenes for Plus (aurora, galaxy, waves, neon grid, sakura,
// fireflies). All of it is CSS - no images to fetch, and every animation stops
// under prefers-reduced-motion. The server stores the id and always reports
// the EFFECTIVE cover, so a Plus scene never shows once Plus has ended.
//
//   TalkLiveCovers.apply(el, id)            paint `el` as that cover (null = default)
//   TalkLiveCovers.picker(selected, plus)   the swatch grid markup for My Profile
//   TalkLiveCovers.isPlus(id) / isValid(id)
// ============================================================================
(function (global) {
  'use strict';

  var STYLE_ID = 'tlCoverCss';

  var SOLIDS = [['ocean', 'Ocean'], ['sky', 'Sky'], ['mint', 'Mint'], ['sunset', 'Sunset'], ['rose', 'Rose'], ['slate', 'Slate']];
  var GRADS = [['dawn', 'Dawn'], ['lagoon', 'Lagoon'], ['berry', 'Berry'], ['forest', 'Forest'], ['peach', 'Peach'], ['night', 'Night']];
  var PLUS = [['aurora', 'Aurora'], ['galaxy', 'Galaxy'], ['waves', 'Waves'], ['neon', 'Neon grid'], ['sakura', 'Sakura'], ['fireflies', 'Fireflies'],
    // 8-bit scenes, drawn as pixel art on a 36-row grid (see PX below).
    ['pxcity', 'Neon City'], ['pxdrive', 'Retro Drive'], ['pxforest', 'Pixel Forest'], ['pxspace', 'Star Voyage'], ['pxsea', 'Pixel Sea']];

  var LIST = [];
  SOLIDS.forEach(function (c) { LIST.push({ id: 'solid:' + c[0], kind: 'solid', name: c[1] }); });
  GRADS.forEach(function (c) { LIST.push({ id: 'grad:' + c[0], kind: 'grad', name: c[1] }); });
  PLUS.forEach(function (c) { LIST.push({ id: 'plus:' + c[0], kind: 'plus', name: c[1] }); });
  var BY_ID = {};
  LIST.forEach(function (c) { BY_ID[c.id] = c; });

  function svgUri(svg) { return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")'; }

  // A sakura petal tile: a few petals at different angles.
  var PETAL = function (fill, tile, spec) {
    var out = '<svg xmlns="http://www.w3.org/2000/svg" width="' + tile + '" height="' + tile + '" viewBox="0 0 ' + tile + ' ' + tile + '">';
    spec.forEach(function (p) {
      out += '<g transform="translate(' + p[0] + ' ' + p[1] + ') rotate(' + p[2] + ') scale(' + p[3] + ')">'
        + '<path d="M0 -9C6 -9 9 -3 6 3C4 7 1 9 0 11C-1 9 -4 7 -6 3C-9 -3 -6 -9 0 -9Z" fill="' + fill + '"/>'
        + '<path d="M0 -9L0 -3" stroke="#fff" stroke-width="1" opacity=".6" stroke-linecap="round"/></g>';
    });
    return svgUri(out + '</svg>');
  };
  // A wave band tile (one repeating crest).
  var WAVE = function (fill, w, h, amp) {
    return svgUri('<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">'
      + '<path d="M0 ' + amp + ' C' + w * 0.25 + ' 0 ' + w * 0.25 + ' 0 ' + w * 0.5 + ' ' + amp + ' S' + w * 0.75 + ' ' + amp * 2 + ' ' + w + ' ' + amp + ' V' + h + ' H0Z" fill="' + fill + '"/></svg>');
  };
  var TREES = svgUri('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="90" viewBox="0 0 400 90" preserveAspectRatio="none"><path d="M0 90V52l14-22 10 16 12-30 14 34 10-14 14 26 12-38 14 40 10-18 16 30 12-34 14 36 12-20 14 28 10-26 16 34 12-40 14 38 10-16 16 24 12-30 14 34 10-22 16 28 12-24 14 20 10-12 16 22V90z" fill="#04120c"/></svg>');

  function css() {
    var s = '';
    s += '.tl-cv{position:relative;overflow:hidden;isolation:isolate;background:linear-gradient(135deg,var(--accent,#2a6fe8),var(--accent-2,#00d4ff))}'
      + '.tl-cv>canvas.tl-cv-px{position:absolute;inset:0;width:100%;height:100%;display:block;image-rendering:pixelated;image-rendering:crisp-edges;pointer-events:none;z-index:0}'
      + '.tl-cv[data-cv^="plus:px"]{background:#0b0620}'
      + '.tl-cv>i{position:absolute;pointer-events:none;display:block}';
    // free solids
    var solids = { ocean: '#1e6fd9', sky: '#38bdf8', mint: '#34d399', sunset: '#fb923c', rose: '#fb7185', slate: '#475569' };
    Object.keys(solids).forEach(function (k) { s += '.tl-cv[data-cv="solid:' + k + '"]{background:' + solids[k] + '}'; });
    // free gradients
    var grads = {
      dawn: 'linear-gradient(135deg,#fda4af,#fdba74 55%,#fde68a)',
      lagoon: 'linear-gradient(135deg,#00d4ff,#2a6fe8 70%,#1e40af)',
      berry: 'linear-gradient(135deg,#fb7185,#be185d 55%,#831843)',
      forest: 'linear-gradient(135deg,#86efac,#16a34a 55%,#14532d)',
      peach: 'linear-gradient(135deg,#fecaca,#fdba74 60%,#fb923c)',
      night: 'linear-gradient(160deg,#0b1437,#1e3a8a 60%,#0e7490)',
    };
    Object.keys(grads).forEach(function (k) { s += '.tl-cv[data-cv="grad:' + k + '"]{background:' + grads[k] + '}'; });

    // --- Aurora: curtains of green and cyan light over a starry sky.
    s += '.tl-cv[data-cv="plus:aurora"]{background:linear-gradient(180deg,#040b1f,#0a1a3a 70%,#0b2a4a)}'
      + '.tl-cv[data-cv="plus:aurora"] .a{inset:-30% -20% -10%;background:radial-gradient(55% 75% at 18% 100%,rgba(52,211,153,.85),transparent 62%),radial-gradient(50% 70% at 55% 105%,rgba(34,211,238,.8),transparent 62%),radial-gradient(45% 65% at 92% 95%,rgba(99,102,241,.7),transparent 62%);filter:blur(14px);animation:tlcvAurA 11s ease-in-out infinite alternate}'
      + '.tl-cv[data-cv="plus:aurora"] .b{inset:-10% -10% 0;background:repeating-linear-gradient(100deg,transparent 0 22px,rgba(167,243,208,.28) 30px,transparent 46px 70px);-webkit-mask-image:linear-gradient(0deg,#000 10%,transparent 85%);mask-image:linear-gradient(0deg,#000 10%,transparent 85%);filter:blur(3px);mix-blend-mode:screen;animation:tlcvAurB 14s ease-in-out infinite alternate}'
      + '.tl-cv[data-cv="plus:aurora"] .c{inset:0;background:radial-gradient(1px 1px at 12% 22%,#fff,transparent),radial-gradient(1px 1px at 34% 12%,#fff,transparent),radial-gradient(1.5px 1.5px at 58% 28%,#e0f2fe,transparent),radial-gradient(1px 1px at 78% 14%,#fff,transparent),radial-gradient(1px 1px at 90% 34%,#fff,transparent),radial-gradient(1px 1px at 46% 40%,#fff,transparent);animation:tlcvTwinkle 4s ease-in-out infinite}'
      + '@keyframes tlcvAurA{0%{transform:translateX(-6%) skewX(-4deg);filter:blur(14px) hue-rotate(0)}100%{transform:translateX(6%) skewX(5deg);filter:blur(16px) hue-rotate(40deg)}}'
      + '@keyframes tlcvAurB{0%{background-position:0 0;opacity:.55}100%{background-position:140px 0;opacity:1}}'
      + '@keyframes tlcvTwinkle{0%,100%{opacity:.45}50%{opacity:1}}';

    // --- Galaxy: a slow spiral nebula and two layers of twinkling stars.
    s += '.tl-cv[data-cv="plus:galaxy"]{background:radial-gradient(ellipse at 50% 55%,#20144f 0,#0b0624 52%,#03020c 100%)}'
      + '.tl-cv[data-cv="plus:galaxy"] .a{left:50%;top:50%;width:150%;aspect-ratio:1;margin:-75% 0 0 -75%;background:radial-gradient(circle,rgba(255,244,214,.9) 0,rgba(255,214,150,.35) 7%,transparent 24%),conic-gradient(from 0deg,rgba(0,212,255,.0),rgba(0,212,255,.75) 10%,rgba(99,102,241,.8) 24%,rgba(0,0,0,0) 38%,rgba(236,72,153,.7) 56%,rgba(42,111,232,.8) 72%,rgba(0,0,0,0) 90%);border-radius:50%;filter:blur(9px);-webkit-mask-image:radial-gradient(closest-side,#000 28%,transparent 100%);mask-image:radial-gradient(closest-side,#000 28%,transparent 100%);animation:tlcvSpin 50s linear infinite}'
      + '.tl-cv[data-cv="plus:galaxy"] .b{inset:0;background:radial-gradient(1.5px 1.5px at 8% 30%,#fff,transparent),radial-gradient(1px 1px at 18% 70%,#cfe8ff,transparent),radial-gradient(2px 2px at 27% 18%,#fff,transparent),radial-gradient(1px 1px at 39% 55%,#fff,transparent),radial-gradient(1.5px 1.5px at 51% 80%,#fde68a,transparent),radial-gradient(1px 1px at 62% 24%,#fff,transparent),radial-gradient(2px 2px at 73% 62%,#cfe8ff,transparent),radial-gradient(1px 1px at 85% 20%,#fff,transparent),radial-gradient(1.5px 1.5px at 93% 74%,#fff,transparent);animation:tlcvTwinkle 3.2s ease-in-out infinite}'
      + '.tl-cv[data-cv="plus:galaxy"] .c{inset:0;background:radial-gradient(1px 1px at 5% 12%,#fff,transparent),radial-gradient(2px 2px at 14% 46%,#fff,transparent),radial-gradient(1px 1px at 33% 88%,#fff,transparent),radial-gradient(1.5px 1.5px at 44% 8%,#fff,transparent),radial-gradient(1px 1px at 56% 48%,#bae6fd,transparent),radial-gradient(2px 2px at 69% 90%,#fff,transparent),radial-gradient(1px 1px at 80% 40%,#fff,transparent),radial-gradient(1.5px 1.5px at 97% 10%,#fde68a,transparent);animation:tlcvTwinkle 4.7s ease-in-out -1.8s infinite}'
      + '@keyframes tlcvSpin{to{transform:rotate(360deg)}}';

    // --- Waves: three rolling bands of water.
    s += '.tl-cv[data-cv="plus:waves"]{background:linear-gradient(180deg,#7dd3fc,#0ea5e9 45%,#1e3a8a)}'
      + '.tl-cv[data-cv="plus:waves"] .a,.tl-cv[data-cv="plus:waves"] .b,.tl-cv[data-cv="plus:waves"] .c{left:0;right:0;background-repeat:repeat-x}'
      + '.tl-cv[data-cv="plus:waves"] .a{bottom:0;height:62%;background-image:' + WAVE('rgba(255,255,255,.22)', 240, 100, 22) + ';background-size:240px 100%;animation:tlcvWave 9s linear infinite}'
      + '.tl-cv[data-cv="plus:waves"] .b{bottom:0;height:48%;background-image:' + WAVE('rgba(14,165,233,.55)', 180, 100, 18) + ';background-size:180px 100%;animation:tlcvWave 6.5s linear infinite reverse}'
      + '.tl-cv[data-cv="plus:waves"] .c{bottom:0;height:34%;background-image:' + WAVE('rgba(30,64,175,.8)', 140, 100, 14) + ';background-size:140px 100%;animation:tlcvWave 4.6s linear infinite}'
      + '@keyframes tlcvWave{to{background-position-x:240px}}';

    // --- Neon grid: a synthwave floor running toward a glowing sun.
    s += '.tl-cv[data-cv="plus:neon"]{background:linear-gradient(180deg,#0a0420 0,#1a0838 55%,#2b0a4d 100%)}'
      + '.tl-cv[data-cv="plus:neon"] .a{left:50%;top:18%;width:60%;aspect-ratio:1;margin-left:-30%;border-radius:50%;background:linear-gradient(180deg,#fde047,#fb7185 55%,#e11d8f);-webkit-mask-image:repeating-linear-gradient(180deg,#000 0 7px,transparent 7px 10px);mask-image:repeating-linear-gradient(180deg,#000 0 7px,transparent 7px 10px);filter:drop-shadow(0 0 14px rgba(244,63,142,.8));animation:tlcvSun 5s ease-in-out infinite alternate}'
      + '.tl-cv[data-cv="plus:neon"] .b{left:-50%;right:-50%;bottom:0;height:58%;background-image:linear-gradient(rgba(0,212,255,.95) 1.5px,transparent 1.5px),linear-gradient(90deg,rgba(0,212,255,.95) 1.5px,transparent 1.5px);background-size:34px 34px;transform:perspective(160px) rotateX(58deg);transform-origin:50% 100%;animation:tlcvGrid 1.6s linear infinite;-webkit-mask-image:linear-gradient(0deg,#000 20%,transparent 100%);mask-image:linear-gradient(0deg,#000 20%,transparent 100%);filter:drop-shadow(0 0 4px rgba(0,212,255,.8))}'
      + '.tl-cv[data-cv="plus:neon"] .c{left:0;right:0;bottom:41%;height:2px;background:#22d3ee;box-shadow:0 0 12px 3px rgba(34,211,238,.8)}'
      + '@keyframes tlcvGrid{to{background-position:0 34px}}@keyframes tlcvSun{to{transform:translateY(6px) scale(1.04)}}';

    // --- Sakura: petals drifting down through soft pink light.
    s += '.tl-cv[data-cv="plus:sakura"]{background:linear-gradient(165deg,#ffe4ec,#fbb6cf 52%,#f08cb4)}'
      + '.tl-cv[data-cv="plus:sakura"] .a{inset:0;background:radial-gradient(60% 80% at 80% 0,rgba(255,255,255,.7),transparent 65%)}'
      + '.tl-cv[data-cv="plus:sakura"] .b{inset:-10%;background-image:' + PETAL('#ff9fc2', 150, [[30, 40, 25, 1.1], [100, 95, -40, .8], [60, 135, 70, .9], [125, 20, 10, .7]]) + ';background-size:150px 150px;opacity:.95;animation:tlcvFall 13s linear infinite}'
      + '.tl-cv[data-cv="plus:sakura"] .c{inset:-10%;background-image:' + PETAL('#ffd1e1', 100, [[20, 25, -20, .9], [70, 60, 55, .7], [40, 88, 15, .6]]) + ';background-size:100px 100px;opacity:.75;animation:tlcvFall2 8.5s linear infinite;filter:blur(.5px)}'
      + '@keyframes tlcvFall{from{background-position:0 0}to{background-position:-60px 150px}}'
      + '@keyframes tlcvFall2{from{background-position:0 0}to{background-position:-40px 100px}}';

    // --- Fireflies: glowing dots drifting over a dark forest at dusk.
    var fly = function (x, y) { return 'radial-gradient(circle at ' + x + ' ' + y + ',#fefce8 0 1.6px,rgba(190,242,100,.75) 2.4px,rgba(190,242,100,.22) 6px,transparent 12px)'; };
    s += '.tl-cv[data-cv="plus:fireflies"]{background:linear-gradient(180deg,#071a2b,#0a2a24 62%,#0c3a22)}'
      + '.tl-cv[data-cv="plus:fireflies"] .a{inset:-10%;background-image:' + fly('18%', '30%') + ',' + fly('62%', '70%') + ',' + fly('85%', '25%') + ';background-size:180px 150px;animation:tlcvFly 9s ease-in-out infinite alternate,tlcvBlink 3.1s ease-in-out infinite}'
      + '.tl-cv[data-cv="plus:fireflies"] .b{inset:-10%;background-image:' + fly('40%', '55%') + ',' + fly('8%', '82%') + ';background-size:130px 110px;animation:tlcvFly2 12s ease-in-out infinite alternate,tlcvBlink 4.3s ease-in-out -1.5s infinite}'
      + '.tl-cv[data-cv="plus:fireflies"] .c{left:0;right:0;bottom:-1px;height:46%;background:' + TREES + ' bottom/cover no-repeat}'
      + '@keyframes tlcvFly{0%{background-position:0 0}100%{background-position:40px -30px}}@keyframes tlcvFly2{0%{background-position:0 0}100%{background-position:-36px 34px}}'
      + '@keyframes tlcvBlink{0%,100%{opacity:.35}45%{opacity:1}}';

    s += '@media (prefers-reduced-motion:reduce){.tl-cv>i{animation:none!important}}';

    // The picker: swatches in one scrollable box, a lock on scenes you cannot use yet.
    s += '.tl-cvp{display:grid;gap:10px}.tl-cvp-boxwrap{position:relative}'
      + '.tl-cvp{position:relative}'
      + '.tl-cvp-box{max-height:152px;overflow-y:auto;overscroll-behavior:contain;padding:2px 10px 2px 2px;scrollbar-width:thin;scrollbar-color:var(--accent-2,#00d4ff) rgba(128,128,160,.25)}'
      + '.tl-cvp-box::-webkit-scrollbar{width:7px;-webkit-appearance:none}'
      + '.tl-cvp-box::-webkit-scrollbar-track{background:rgba(128,128,160,.22);border-radius:99px}'
      + '.tl-cvp-box::-webkit-scrollbar-thumb{background:var(--accent-2,#00d4ff);border-radius:99px}'
      + '.tl-cvp:not(.is-end)::after{content:"";position:absolute;left:0;right:12px;top:98px;height:56px;pointer-events:none;background:linear-gradient(180deg,transparent,var(--cvp-fade,var(--bg-2,#141a2b)) 92%)}'
      + '.tl-cvp-row{display:grid;grid-template-columns:repeat(auto-fill,minmax(76px,1fr));gap:8px}'
      + '.tl-cvp-opt{position:relative;border:2px solid transparent;border-radius:12px;padding:0;height:52px;cursor:pointer;background:none;overflow:hidden;outline-offset:2px}'
      + '.tl-cvp-opt .tl-cv{position:absolute;inset:0;border-radius:10px}'
      + '.tl-cvp-opt.selected{border-color:var(--accent-2,#00d4ff);box-shadow:0 0 0 2px rgba(0,212,255,.25)}'
      + '.tl-cvp-opt .tl-cvp-name{position:absolute;left:6px;bottom:4px;z-index:2;font-size:10.5px;font-weight:700;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.75)}'
      + '.tl-cvp-opt .tl-cvp-lock{position:absolute;top:4px;right:5px;z-index:2;width:18px;height:18px;border-radius:50%;background:rgba(10,14,30,.72);display:grid;place-items:center}'
      + '.tl-cvp-opt .tl-cvp-lock svg{width:11px;height:11px;color:#ffd166}'
      + '.tl-cvp-opt.is-locked .tl-cv{filter:saturate(.8)}'
      + '.tl-cvp-plus{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12.5px;color:var(--muted,#8a90a8)}'
      + '.tl-cvp-up{border:0;border-radius:999px;padding:4px 10px;font:inherit;font-size:11.5px;font-weight:700;cursor:pointer;color:#241a00;background:linear-gradient(135deg,#ffe38a,#ffb020)}';
    return s;
  }


  // --- 8-bit covers -----------------------------------------------------------
  // Pixel art on a grid 36 cells tall, drawn into a canvas exactly that many
  // pixels tall and scaled up with image-rendering: pixelated. 8 frames a
  // second on a 480-frame loop; the Android app draws the same scenes
  // (android-native/.../ui/profile/PixelCovers.kt).
  var PX_ROWS = 36, PX_LOOP = 480;
  function isPx(id) { return typeof id === 'string' && id.indexOf('plus:px') === 0; }
  function hash(a, b) {
    var h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function mod(a, n) { return ((a % n) + n) % n; }
  function bands(px, colors, y0, rows, C) {
    var n = colors.length;
    for (var i = 0; i < n; i++) {
      var a = y0 + Math.floor(i * rows / n), b = y0 + Math.floor((i + 1) * rows / n);
      px(0, a, C, b - a, colors[i]);
    }
  }
  function stars(px, C, rows, tick, density, seed) {
    for (var y = 0; y < rows; y++) for (var x = 0; x < C; x++) {
      if (hash(x + seed, y * 7) < density && hash(x, y + Math.floor(tick / 4) * 3 + seed) > 0.25) px(x, y, 1, 1, hash(x, y) < 0.3 ? '#bfe3ff' : '#ffffff');
    }
  }
  function disc(px, cx, cy, r, maxY, color) {
    for (var y = cy - r; y <= Math.min(cy + r, maxY); y++) {
      var w = Math.floor(Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy))) + 0.3);
      px(cx - w, y, w * 2 + 1, 1, typeof color === 'function' ? color(y) : color);
    }
  }
  var PX = {
    pxcity: function (px, C, t) {
      bands(px, ['#1b0a3c', '#2a0f55', '#43136b', '#64197a', '#8c2381', '#b8317f'], 0, 24, C);
      stars(px, C, 12, t, 0.03, 1);
      var cx = Math.floor(C / 2), cy = 21, r = 9;
      for (var y = cy - r; y <= 31; y++) {
        if (y >= cy - 2 && mod(y + Math.floor(t / 3), 3) === 0) continue;
        var w = Math.floor(Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy))) + 0.3);
        var f = (y - (cy - r)) / (2 * r);
        px(cx - w, y, w * 2 + 1, 1, f < 0.34 ? '#ffe66d' : f < 0.67 ? '#ffa24c' : '#ff5f8f');
      }
      var off = Math.floor(t / 2), x, wc, b, i, h;
      for (x = 0; x < C; x++) {
        wc = mod(x + off, 240); b = Math.floor(wc / 5);
        h = 5 + Math.floor(hash(b, 11) * 10);
        px(x, 32 - h, 1, h, '#2b1457');
        if (wc % 5 === 2 && hash(b, 3) > 0.5) px(x, 32 - h - 2, 1, 2, '#2b1457');
      }
      for (x = 0; x < C; x++) {
        wc = mod(x + t, 480); b = Math.floor(wc / 7); i = wc % 7;
        if (i === 6) continue;
        h = 6 + Math.floor(hash(b, 23) * 13);
        var top = 33 - h;
        px(x, top, 1, h, '#140a2e');
        if (i % 2 === 1) for (var yy = top + 2; yy < 32; yy += 2) {
          if (hash(b * 13 + i, yy) > 0.45 && hash(b + i, yy * 3 + Math.floor(t / 24)) > 0.1) px(x, yy, 1, 1, hash(b, i) > 0.7 ? '#6ef0ff' : '#ffd36e');
        }
      }
      px(0, 33, C, 3, '#0b0620');
      px(0, 33, C, 1, '#ff3fa4');
    },
    pxdrive: function (px, C, t) {
      bands(px, ['#0d0221', '#1a0538', '#2e0854', '#4b0d6b', '#7a1279'], 0, 20, C);
      stars(px, C, 10, t, 0.03, 9);
      var cx = Math.floor(C / 2), cy = 15, r = 10;
      for (var y = cy - r; y <= 19; y++) {
        if (y >= cy && mod(y + Math.floor(t / 4), 3) === 0) continue;
        var w = Math.floor(Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy))) + 0.3);
        var f = (y - (cy - r)) / r;
        px(cx - w, y, w * 2 + 1, 1, f < 0.4 ? '#ffd319' : f < 0.75 ? '#ff901f' : '#ff2975');
      }
      var off = Math.floor(t / 4);
      for (var x = 0; x < C; x++) {
        var wc = mod(x + off, 120);
        var m = 2 + Math.round(3 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 5 * wc / 120)) + 2 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 3 * wc / 120 + 1)));
        px(x, 20 - m, 1, m, '#2b0f4c');
        px(x, 20 - m, 1, 1, '#c03bd6');
      }
      px(0, 20, C, 16, '#12002b');
      var ph = (t % 8) / 8;
      for (var k = 0; k < 12; k++) {
        var ly = 20 + Math.floor((k + ph) * (k + ph) * 0.3);
        if (ly < 36) px(0, ly, C, 1, '#ff2bd6');
      }
      for (var yy = 21; yy < 36; yy++) {
        var d = yy - 20;
        for (var j = -12; j <= 12; j++) px(cx + Math.round(j * (3 + d * 1.6)), yy, 1, 1, '#c11fb0');
      }
    },
    pxforest: function (px, C, t) {
      bands(px, ['#071327', '#0b1d3a', '#10284d', '#163560', '#1d4370', '#25507c', '#2e5d86'], 0, 30, C);
      stars(px, C, 14, t, 0.025, 17);
      var mx = Math.floor(C * 0.78);
      disc(px, mx, 7, 4, 99, '#f4f1c9');
      px(mx - 2, 6, 1, 1, '#d9d4a0'); px(mx + 1, 8, 2, 1, '#d9d4a0'); px(mx, 4, 1, 1, '#d9d4a0');
      var x, wc, b, i, th, hgt;
      var off = Math.floor(t / 4);
      for (x = 0; x < C; x++) {
        wc = mod(x + off, 120); b = Math.floor(wc / 6); i = wc % 6;
        th = 8 + Math.floor(hash(b, 5) * 7);
        hgt = th - Math.floor(Math.abs(i - 2.5) * 2.4);
        if (hgt > 0) px(x, 31 - hgt, 1, hgt, '#123049');
      }
      px(0, 31, C, 5, '#081923');
      off = Math.floor(t / 2);
      for (x = 0; x < C; x++) {
        wc = mod(x + off, 240); b = Math.floor(wc / 8); i = wc % 8;
        th = 12 + Math.floor(hash(b, 29) * 9);
        hgt = th - Math.floor(Math.abs(i - 3.5) * 3);
        if (i === 3 || i === 4) px(x, 33, 1, 3, '#2a1a10');
        if (hgt > 0) px(x, 34 - hgt, 1, hgt - 1, '#061620');
        if (hgt > 0 && Math.abs(i - 3.5) < 3 && (34 - hgt + i) % 4 === 0) px(x, 34 - hgt + 1, 1, 1, '#0d2a36');
      }
      for (var n = 0; n < 14; n++) {
        var fx = mod(Math.floor(hash(n, 1) * C + t * (hash(n, 2) - 0.5) * 0.5), C);
        var fy = 16 + Math.floor(hash(n, 3) * 16 + Math.sin(t * 0.13 + n) * 1.5);
        if (Math.sin(t * 0.21 + n * 1.7) > -0.2) {
          px(fx - 1, fy, 3, 1, 'rgba(217,255,107,.28)'); px(fx, fy - 1, 1, 3, 'rgba(217,255,107,.28)');
          px(fx, fy, 1, 1, '#eaff8f');
        }
      }
    },
    pxspace: function (px, C, t) {
      bands(px, ['#05010f', '#0a0420', '#120830', '#160a3a', '#120830', '#0a0420', '#05010f'], 0, 36, C);
      var speeds = [4, 2, 1], dens = [0.02, 0.012, 0.007], cols = ['#5a5f8a', '#a7b4ff', '#ffffff'];
      for (var k = 0; k < 3; k++) {
        var W = PX_LOOP / speeds[k], off = Math.floor(t / speeds[k]);
        for (var y = 0; y < 36; y++) for (var x = 0; x < C; x++) {
          var wc = mod(x + off, W);
          if (hash(wc + k * 1000, y * 31 + k) < dens[k]) px(x, y, k === 2 ? 2 : 1, 1, cols[k]);
        }
      }
      var pcx = Math.floor(C * 0.24), pcy = 18, pr = 8;
      for (var rx = -15; rx <= 15; rx++) { var ry = pcy + Math.round(rx * 0.28); if (rx < 0) px(pcx + rx, ry, 1, 2, '#f6d6a8'); }
      disc(px, pcx, pcy, pr, 99, function (yy) { var f = (yy - (pcy - pr)) / (2 * pr); return f < 0.3 ? '#f2a65a' : f < 0.55 ? '#e08a52' : f < 0.8 ? '#c9604a' : '#9e4a4a'; });
      px(pcx - 4, pcy - 5, 3, 1, '#f7c28a');
      for (rx = -15; rx <= 15; rx++) { ry = pcy + Math.round(rx * 0.28); if (rx >= 0 || Math.abs(rx) > pr) px(pcx + rx, ry, 1, 2, rx > pr ? '#f6d6a8' : '#e9c08c'); }
      var sx = Math.floor(C * 0.64), sy = 15 + Math.round(Math.sin(t * 0.2) * 1.5);
      var ship = ['.##....', '#####..', '#######', '#####..', '.##....'];
      for (var r = 0; r < ship.length; r++) for (var c = 0; c < 7; c++) if (ship[r][c] === '#') px(sx + c, sy + r, 1, 1, '#cfd8ff');
      px(sx + 4, sy + 2, 1, 1, '#6ef0ff');
      px(sx - 1, sy + 1, 1, 3, t % 2 ? '#ffb347' : '#ff5e3a');
      px(sx - 2 - (t % 3 === 0 ? 1 : 0), sy + 2, 1 + (t % 3 === 0 ? 1 : 0), 1, '#ffd36e');
    },
    pxsea: function (px, C, t) {
      bands(px, ['#2d6cdf', '#4a86e8', '#6fa3ef', '#9bc1f3', '#ffc9a6'], 0, 20, C);
      disc(px, Math.floor(C * 0.8), 12, 4, 99, '#ffe08a');
      var off = Math.floor(t / 4), x, wc, cid, i;
      for (x = 0; x < C; x++) {
        wc = mod(x + off, 120); cid = Math.floor(wc / 30); i = wc % 30;
        if (hash(cid, 7) < 0.25) continue;
        var y0 = 2 + Math.floor(hash(cid, 8) * 8), len = 10 + Math.floor(hash(cid, 9) * 12);
        if (i >= len) continue;
        if (i > 2 && i < len - 3) px(x, y0, 1, 1, '#ffffff');
        px(x, y0 + 1, 1, 1, '#ffffff');
        if (i > 0 && i < len - 1) px(x, y0 + 2, 1, 1, '#dbe8ff');
      }
      bands(px, ['#1b6fd1', '#1862bd', '#1556a8', '#124a93', '#0f3f80'], 20, 16, C);
      var sunx = Math.floor(C * 0.8);
      for (var gy = 21; gy < 32; gy += 2) if (hash(gy, Math.floor(t / 3)) > 0.3) px(sunx - 2 + Math.floor(hash(gy, t) * 5), gy, 2, 1, '#ffe9a8');
      var off2 = Math.floor(t / 2);
      for (var yy = 21; yy < 36; yy += 3) for (x = 0; x < C; x++) {
        wc = mod(x + (yy % 2 ? off2 : -off2) + yy * 7, 240);
        if (hash(wc, yy) < 0.07) px(x, yy, 2, 1, '#bfe3ff');
      }
      var bx = Math.floor(C * 0.34), by = 20 + (Math.floor(t / 6) % 2);
      for (var s = 0; s < 6; s++) px(bx + 5, by - 7 + s, s + 1, 1, '#ffffff');
      px(bx + 4, by - 8, 1, 8, '#3e2714');
      px(bx, by, 10, 1, '#7a4a24');
      px(bx + 1, by + 1, 8, 1, '#5b3a1e');
    },
  };
  var pxLive = [], pxTimer = null, pxTick = 0;
  function pxPaint(cv, id, tick) {
    var w = cv.clientWidth || 300, h = cv.clientHeight || 100;
    var C = Math.max(12, Math.round(PX_ROWS * w / h));
    if (cv.width !== C) { cv.width = C; cv.height = PX_ROWS; }
    var g = cv.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, C, PX_ROWS);
    var px = function (x, y, ww, hh, c) { g.fillStyle = c; g.fillRect(x, y, ww, hh); };
    (PX[id.slice(5)] || PX.pxcity)(px, C, tick);
  }
  function pxReduced() { try { return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  function pxRun() {
    if (pxTimer) return;
    pxTimer = setInterval(function () {
      pxTick = (pxTick + 1) % PX_LOOP;
      pxLive = pxLive.filter(function (c) { return c.isConnected; });
      if (!pxLive.length) { clearInterval(pxTimer); pxTimer = null; return; }
      if (document.hidden) return;
      pxLive.forEach(function (c) { if (c.dataset.still !== '1') pxPaint(c, c.dataset.px, pxTick); });
    }, 125);
  }
  // Fills every pixel cover canvas under `root` (new ones from apply/picker).
  function pxMount(root) {
    if (!root || !root.querySelectorAll) return;
    Array.prototype.slice.call(root.querySelectorAll('canvas.tl-cv-px:not([data-on])')).forEach(function (cv) {
      cv.setAttribute('data-on', '1');
      var still = cv.closest('.tl-cvp-opt') || pxReduced();
      if (still) cv.dataset.still = '1';
      var draw = function () { pxPaint(cv, cv.dataset.px, still ? 60 : pxTick); };
      if (global.requestAnimationFrame) global.requestAnimationFrame(draw); else draw();
      if (!still) { pxLive.push(cv); pxRun(); }
    });
  }
  if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) if (list[i].addedNodes.length) { pxMount(document.body); return; }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
  function layersFor(id) {
    if (isPx(id)) return '<canvas class="tl-cv-l tl-cv-px" data-px="' + id + '" aria-hidden="true"></canvas>';
    return '<i class="tl-cv-l a"></i><i class="tl-cv-l b"></i><i class="tl-cv-l c"></i>';
  }

  var cssDone = false;
  function ensureCss() {
    if (cssDone || typeof document === 'undefined') return;
    cssDone = true;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = css();
    document.head.appendChild(st);
  }

  function isValid(id) { return typeof id === 'string' && !!BY_ID[id]; }
  function isPlus(id) { return typeof id === 'string' && id.indexOf('plus:') === 0; }
  function nameOf(id) {
    var c = BY_ID[id];
    if (!c) return '';
    var key = 'cover' + id.split(':')[1].replace(/^./, function (m) { return m.toUpperCase(); });
    if (typeof global.t === 'function') { var s = global.t(key); if (s && s !== key) return s; }
    return c.name;
  }

  // Paint `el` as the cover `id`. A scene gets its three layers; anything else
  // (or null/unknown) gets none and the brand-blue default.
  function apply(el, id) {
    if (!el) return;
    ensureCss();
    var valid = isValid(id) ? id : '';
    el.classList.add('tl-cv');
    if ((el.dataset.cv || '') === valid && !!el.querySelector(':scope>.tl-cv-l') === isPlus(valid)) return;
    el.dataset.cv = valid;
    Array.prototype.slice.call(el.querySelectorAll(':scope>.tl-cv-l')).forEach(function (n) { n.remove(); });
    if (isPlus(valid)) {
      el.insertAdjacentHTML('afterbegin', layersFor(valid));
      pxMount(el);
    }
    if (!valid) delete el.dataset.cv;
  }

  var LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function label(key, fallback) {
    if (typeof global.t === 'function') { var s = global.t(key); if (s && s !== key) return s; }
    return fallback;
  }

  // Swatch markup; the caller wires clicks on [data-cover].
  function picker(selected, hasPlus) {
    ensureCss();
    function opt(c) {
      var locked = c.kind === 'plus' && !hasPlus;
      var layers = c.kind === 'plus' ? layersFor(c.id) : '';
      return '<button type="button" class="tl-cvp-opt' + (selected === c.id ? ' selected' : '') + (locked ? ' is-locked' : '') + '" data-cover="' + c.id + '"'
        + ' aria-pressed="' + (selected === c.id ? 'true' : 'false') + '" aria-label="' + esc(nameOf(c.id) + (locked ? ' (Plus)' : '')) + '">'
        + '<span class="tl-cv" data-cv="' + c.id + '">' + layers + '</span><span class="tl-cvp-name">' + esc(nameOf(c.id)) + '</span>'
        + (locked ? '<span class="tl-cvp-lock">' + LOCK + '</span>' : '') + '</button>';
    }
    // One scrollable grid: two rows show, a half row peeks under a fade and a
    // visible scrollbar says there is more. Plus scenes come last.
    return '<div class="tl-cvp">'
      + '<div class="tl-cvp-box" data-cvp-box><div class="tl-cvp-row">' + LIST.map(opt).join('') + '</div></div>'
      + (hasPlus ? '' : '<div class="tl-cvp-plus"><span>' + esc(label('coverAnimated', 'Animated, with Plus')) + '</span>'
        + '<button type="button" class="tl-cvp-up" data-cover-upsell="1">' + esc(label('coverGetPlus', 'Get Plus')) + '</button></div>')
      + '</div>';
  }

  // The bottom fade goes away once the box is scrolled to its end.
  function syncBox(box) {
    if (!box) return;
    var end = box.scrollTop + box.clientHeight >= box.scrollHeight - 3;
    box.parentNode.classList.toggle('is-end', end);
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('scroll', function (e) {
      if (e.target && e.target.hasAttribute && e.target.hasAttribute('data-cvp-box')) syncBox(e.target);
    }, true);
  }

  global.TalkLiveCovers = { list: LIST, isValid: isValid, isPlus: isPlus, name: nameOf, apply: apply, picker: picker, ensureCss: ensureCss, mountPixels: pxMount, PX: PX };
}(window));
