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

  // Art covers (tools/covers): a painted scene or a pixel-art scene, each with
  // its own live layer on top (ART_FX). The first of each collection are free.
  var ART = [['cin:misty', 'cin', 'misty', 'Misty Ranges'], ['cin:pines', 'cin', 'pines', 'Cathedral Pines'], ['cin:tide', 'cin', 'tide', 'Moonlit Tide'], ['cin:peak', 'cin', 'peak', 'Lone Peak'], ['plus:cin-nebula', 'cin', 'nebula', 'Orion Drift'], ['plus:cin-ringed', 'cin', 'ringed', 'Ringed Horizon'], ['plus:cin-aurora', 'cin', 'aurora', 'Northern Veil'], ['plus:cin-dunes', 'cin', 'dunes', 'Desert Dusk'], ['plus:cin-silk', 'cin', 'silk', 'Silk Waves'], ['plus:cin-prism', 'cin', 'prism', 'Prism Light'], ['plus:cin-brutalist', 'cin', 'brutalist', 'Brutalist Dawn'], ['plus:cin-skyline', 'cin', 'skyline', 'Skyline 2099'], ['plus:cin-rain', 'cin', 'rain', 'Rain City'], ['plus:cin-alley', 'cin', 'alley', 'Neon Alley'], ['plus:cin-isles', 'cin', 'isles', 'Floating Isles'], ['plus:cin-golden', 'cin', 'golden', 'Golden Sea'], ['plus:cin-eclipse', 'cin', 'eclipse', 'Eclipse'], ['pix:voyage', 'pix', 'voyage', 'Isle Voyage'], ['pix:village', 'pix', 'village', 'Night Village'], ['pix:hills', 'pix', 'hills', 'Sunset Hills'], ['pix:cabin', 'pix', 'cabin', 'Snow Cabin'], ['plus:pix-metropolis', 'pix', 'metropolis', 'Neon Metropolis'], ['plus:pix-synth', 'pix', 'synth', 'Synth Horizon'], ['plus:pix-fireflies', 'pix', 'fireflies', 'Firefly Woods'], ['plus:pix-planetrise', 'pix', 'planetrise', 'Planet Rise'], ['plus:pix-rainstreet', 'pix', 'rainstreet', 'Rain Street'], ['plus:pix-arcade', 'pix', 'arcade', 'Arcade Night'], ['plus:pix-peaks', 'pix', 'peaks', 'Starry Peaks'], ['plus:pix-kingdom', 'pix', 'kingdom', 'Crystal Kingdom'], ['plus:pix-oasis', 'pix', 'oasis', 'Desert Oasis'], ['plus:pix-temple', 'pix', 'temple', 'Cherry Temple'], ['plus:pix-deepsea', 'pix', 'deepsea', 'Deep Sea'], ['plus:pix-volcano', 'pix', 'volcano', 'Volcano Isle']];
  var ART_FX = {"misty": "drift fog:0.6 motes", "pines": "drift motes fog:0.86", "tide": "drift twinkle:0.5 glints:0.62:0.98:0.06:0.4", "peak": "drift snow", "nebula": "drift twinkle:1 shoot", "ringed": "drift twinkle:1 shoot", "aurora": "drift twinkle:0.55 shoot", "dunes": "drift dust", "silk": "drift2", "prism": "drift sparkle", "brutalist": "drift dust", "skyline": "drift twinkle:0.45 traffic", "rain": "drift rain", "alley": "drift rain fog:0.6", "isles": "drift motes", "golden": "drift glints:0.57:1:0.5:0.95", "eclipse": "drift twinkle:1 shoot", "voyage": "glints:0.68:1:0:1", "village": "twinkle:0.5 shoot", "hills": "motes", "cabin": "snow", "metropolis": "twinkle:0.45 traffic", "synth": "twinkle:0.4 shoot", "fireflies": "fireflies twinkle:0.3", "planetrise": "twinkle:1 shoot", "rainstreet": "rain", "arcade": "sparkle", "peaks": "twinkle:0.6 shoot", "kingdom": "twinkle:0.55 sparkle", "oasis": "glints:0.78:0.85:0.66:0.88 dust", "temple": "petals", "deepsea": "bubbles", "volcano": "embers:0.727:0.32"};
  var ART_V = '1';
  var ART_BY = {};
  ART.forEach(function (a) {
    var c = { id: a[0], kind: 'art', art: a[1], file: a[2], name: a[3], fx: ART_FX[a[2]] || '' };
    LIST.push(c); BY_ID[c.id] = c; ART_BY[c.id] = c;
  });
  function artUrl(c, thumb) {
    return '/covers/' + c.art + '/' + (thumb && c.art === 'cin' ? 't/' : '') + c.file + (c.art === 'cin' ? '.webp' : '.png') + '?v=' + ART_V;
  }

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

    // Art covers: the picture, a slow camera drift over it, and a canvas of moving light on top.
    s += '.tl-cv>.tl-cv-art{inset:0;background-size:cover;background-position:center;will-change:transform}'
      + '.tl-cv>.tl-cv-art.px{image-rendering:pixelated;image-rendering:crisp-edges}'
      + '.tl-cv>.tl-cv-art.drift{animation:tlcvDrift 38s ease-in-out infinite alternate}'
      + '.tl-cv>.tl-cv-art.drift2{animation:tlcvDrift2 26s ease-in-out infinite alternate}'
      + '.tl-cv>canvas.tl-cv-fx{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;z-index:1}'
      + '.tl-cv>canvas.tl-cv-fx.px{image-rendering:pixelated;image-rendering:crisp-edges}'
      + '@keyframes tlcvDrift{0%{transform:scale(1.06) translate(-1.6%,.6%)}100%{transform:scale(1.13) translate(1.6%,-1.2%)}}'
      + '@keyframes tlcvDrift2{0%{transform:scale(1.1) translate(-3%,1%)}100%{transform:scale(1.18) translate(3%,-2%)}}';
    s += '@media (prefers-reduced-motion:reduce){.tl-cv>i{animation:none!important}}';

    // The picker: swatches in one scrollable box, a lock on scenes you cannot use yet.
    s += '.tl-cvp{display:grid;gap:10px}.tl-cvp-boxwrap{position:relative}'
      + '.tl-cvp{position:relative}'
      + '.tl-cvp-box{max-height:340px;overflow-y:auto;overscroll-behavior:contain;padding:2px 10px 2px 2px;scrollbar-width:thin;scrollbar-color:var(--accent-2,#00d4ff) rgba(128,128,160,.25)}'
      + '.tl-cvp-box::-webkit-scrollbar{width:7px;-webkit-appearance:none}'
      + '.tl-cvp-box::-webkit-scrollbar-track{background:rgba(128,128,160,.22);border-radius:99px}'
      + '.tl-cvp-box::-webkit-scrollbar-thumb{background:var(--accent-2,#00d4ff);border-radius:99px}'
      + '.tl-cvp-boxwrap:not(.is-end)::after{content:"";position:absolute;left:0;right:12px;bottom:0;height:56px;pointer-events:none;background:linear-gradient(180deg,transparent,var(--cvp-fade,var(--bg-2,#141a2b)) 92%)}'
      + '.tl-cvp-row{display:grid;grid-template-columns:repeat(auto-fill,minmax(76px,1fr));gap:8px}'
      + '.tl-cvp-row.art{grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:10px}'
      + '.tl-cvp-row.art .tl-cvp-opt{height:auto;aspect-ratio:16/9;border-radius:14px}'
      + '.tl-cvp-row.art .tl-cvp-opt .tl-cv{border-radius:12px}'
      + '.tl-cvp-h{margin:14px 2px 8px;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted,#8a90a8)}'
      + '.tl-cvp-h:first-child{margin-top:2px}'
      + '.tl-cvp-h small{font-weight:600;text-transform:none;letter-spacing:0;margin-left:6px;opacity:.8}'
      + '.tl-cvp-opt .tl-cvp-check{position:absolute;right:6px;bottom:6px;z-index:2;width:20px;height:20px;border-radius:50%;background:var(--accent,#2a6fe8);color:#fff;display:none;place-items:center;box-shadow:0 2px 6px rgba(0,0,0,.4)}'
      + '.tl-cvp-opt.selected .tl-cvp-check{display:grid}.tl-cvp-opt .tl-cvp-check svg{width:12px;height:12px}'
      + '.tl-cvp-opt{transition:transform .15s,border-color .15s}.tl-cvp-opt:active{transform:scale(.97)}'
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
      for (var i = 0; i < list.length; i++) if (list[i].addedNodes.length) { pxMount(document.body); fxMount(document.body); return; }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
  // --- live layer for art covers -------------------------------------------
  function hashStr(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var TAU = Math.PI * 2;
  // Particles for one effect, made once per canvas from a seed, so a cover moves the same way every time.
  function makeFx(token, id, pix) {
    var parts = token.split(':'), kind = parts[0], a = parts.slice(1).map(Number);
    var r = rng(hashStr(id + kind)), n = 0;
    var N = { twinkle: pix ? 36 : 80, rain: pix ? 70 : 200, snow: pix ? 60 : 130, fireflies: 22, petals: pix ? 26 : 40, bubbles: pix ? 22 : 30,
      embers: pix ? 22 : 34, glints: pix ? 30 : 70, motes: pix ? 16 : 34, dust: pix ? 18 : 40, sparkle: pix ? 10 : 16, traffic: pix ? 6 : 9, fog: 4, shoot: 1 }[kind];
    if (!N) return null;
    var list = [];
    for (n = 0; n < N; n++) list.push({ x: r(), y: r(), s: 0.5 + r(), p: r() * TAU, k: r() });
    return { kind: kind, a: a, list: list, r: r };
  }
  function drawFx(g, w, h, t, fx, pix) {
    var u = pix ? 1 : Math.max(1, w / 640);
    var dot = function (x, y, size, color) {
      if (pix) { g.fillStyle = color; g.fillRect(Math.round(x), Math.round(y), size, size); }
      else { g.fillStyle = color; g.beginPath(); g.arc(x, y, size * u, 0, TAU); g.fill(); }
    };
    var L = fx.list, i, q, a, x, y;
    switch (fx.kind) {
      case 'twinkle':
        for (i = 0; i < L.length; i++) {
          q = L[i]; a = Math.sin(t * (0.8 + q.s * 1.6) + q.p);
          if (a < 0.25) continue;
          x = q.x * w; y = q.y * h * (fx.a[0] || 1);
          dot(x, y, pix ? 1 : 0.7 + a * 0.6, 'rgba(255,255,255,' + (a * 0.9).toFixed(3) + ')');
          if (a > 0.93 && q.k < 0.35) { // a brief four-point sparkle
            var c = 'rgba(255,255,255,' + ((a - 0.9) * 6).toFixed(3) + ')';
            if (pix) { dot(x - 1, y, 1, c); dot(x + 1, y, 1, c); dot(x, y - 1, 1, c); dot(x, y + 1, 1, c); }
            else { g.strokeStyle = c; g.lineWidth = u * 0.6; g.beginPath(); g.moveTo(x - 4 * u, y); g.lineTo(x + 4 * u, y); g.moveTo(x, y - 4 * u); g.lineTo(x, y + 4 * u); g.stroke(); }
          }
        }
        break;
      case 'shoot': {
        var cyc = Math.floor(t / 7), ph = (t / 7) - cyc;
        if (ph > 0.14) break;
        var rr = rng(cyc * 7919 + 13);
        var sx = (0.3 + rr() * 0.65) * w, sy = rr() * h * 0.35, len = (pix ? 18 : 140 * u);
        var pr = ph / 0.14, hx = sx - pr * w * 0.35, hy = sy + pr * h * 0.22;
        for (i = 0; i < (pix ? 14 : 1); i++) {
          if (pix) { dot(hx + i, hy - i * 0.6, 1, 'rgba(255,255,255,' + (1 - i / 14).toFixed(2) + ')'); }
        }
        if (!pix) {
          var gr = g.createLinearGradient(hx, hy, hx + len, hy - len * 0.6);
          gr.addColorStop(0, 'rgba(255,255,255,' + (1 - pr) + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)');
          g.strokeStyle = gr; g.lineWidth = 1.4 * u; g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + len, hy - len * 0.6); g.stroke();
        }
        break;
      }
      case 'rain':
        g.strokeStyle = pix ? '#9fb2d1' : 'rgba(205,220,240,.32)'; g.lineWidth = pix ? 1 : 1.1 * u; g.beginPath();
        for (i = 0; i < L.length; i++) {
          q = L[i]; y = ((q.y + t * (0.9 + q.s * 0.7)) % 1.1 - 0.05) * h; x = (q.x * w + y * 0.2) % w;
          if (pix) { dot(x, y, 1, q.k < 0.5 ? '#9fb2d1' : '#5a6b8a'); dot(x + 0.5, y + 1, 1, '#5a6b8a'); }
          else { g.moveTo(x, y); g.lineTo(x + 4 * u, y + (14 + q.k * 16) * u); }
        }
        if (!pix) g.stroke();
        break;
      case 'snow':
        for (i = 0; i < L.length; i++) {
          q = L[i]; y = ((q.y + t * 0.05 * q.s) % 1) * h; x = (q.x + Math.sin(t * 0.7 + q.p) * 0.012) * w;
          dot(x, y, pix ? 1 : 0.8 + q.k * 1.6, 'rgba(255,255,255,' + (0.55 + q.k * 0.45).toFixed(2) + ')');
        }
        break;
      case 'fireflies':
        for (i = 0; i < L.length; i++) {
          q = L[i]; a = Math.max(0, Math.sin(t * (1 + q.s) + q.p));
          if (a < 0.1) continue;
          x = (q.x + Math.sin(t * 0.3 * q.s + q.p) * 0.04) * w; y = (0.4 + q.y * 0.55 + Math.cos(t * 0.25 + q.p) * 0.03) * h;
          dot(x, y, 1, 'rgba(245,243,154,' + a.toFixed(2) + ')');
          var hc = 'rgba(198,230,106,' + (a * 0.45).toFixed(2) + ')';
          if (pix) { dot(x - 1, y, 1, hc); dot(x + 1, y, 1, hc); dot(x, y - 1, 1, hc); dot(x, y + 1, 1, hc); }
        }
        break;
      case 'petals':
        for (i = 0; i < L.length; i++) {
          q = L[i]; x = ((q.x + t * 0.025 * q.s) % 1) * w; y = ((q.y + t * 0.045 * q.s) % 1) * h;
          var pc = ['#ff9bbb', '#ffc2d4', '#e8638f'][i % 3];
          if (pix) { dot(x, y, 1, pc); if (Math.sin(t * 3 + q.p) > 0) dot(x + 1, y, 1, pc); }
          else { g.save(); g.translate(x, y); g.rotate(t * q.s + q.p); g.fillStyle = pc; g.beginPath(); g.ellipse(0, 0, 4 * u, 2 * u, 0, 0, TAU); g.fill(); g.restore(); }
        }
        break;
      case 'bubbles':
        for (i = 0; i < L.length; i++) {
          q = L[i]; y = (1 - ((q.y + t * 0.05 * q.s) % 1)) * h; x = (q.x + Math.sin(t * 1.2 + q.p) * 0.01) * w;
          if (pix) { dot(x, y, q.k < 0.3 ? 2 : 1, '#bff3ff'); }
          else { g.strokeStyle = 'rgba(191,243,255,.6)'; g.lineWidth = u; g.beginPath(); g.arc(x, y, (1.5 + q.k * 3) * u, 0, TAU); g.stroke(); }
        }
        break;
      case 'embers':
        for (i = 0; i < L.length; i++) {
          q = L[i]; var life = (t * 0.18 * q.s + q.k) % 1;
          x = ((fx.a[0] || 0.5) + (q.x - 0.5) * 0.18 * life + Math.sin(t * 2 + q.p) * 0.006) * w;
          y = ((fx.a[1] || 0.4) - life * 0.4) * h;
          dot(x, y, pix ? 1 : 1.2, (q.k < 0.5 ? 'rgba(255,179,71,' : 'rgba(255,224,138,') + (1 - life).toFixed(2) + ')');
        }
        break;
      case 'glints': {
        var y0 = fx.a[0] || 0.6, y1 = fx.a[1] || 1, x0 = fx.a[2] || 0, x1 = fx.a.length > 3 ? fx.a[3] : 1;
        for (i = 0; i < L.length; i++) {
          q = L[i]; a = Math.pow(Math.max(0, Math.sin(t * (1.5 + q.s * 2) + q.p)), 4);
          if (a < 0.05) continue;
          x = (x0 + q.x * (x1 - x0)) * w; y = (y0 + q.y * (y1 - y0)) * h;
          g.fillStyle = 'rgba(255,244,214,' + (a * (pix ? 1 : 0.6)).toFixed(2) + ')';
          var gl = pix ? 2 + Math.round(q.k * 3) : (3 + q.k * 8) * u;
          g.fillRect(pix ? Math.round(x) : x, pix ? Math.round(y) : y, gl, pix ? 1 : 1.4 * u);
        }
        break;
      }
      case 'motes':
      case 'dust':
        for (i = 0; i < L.length; i++) {
          q = L[i]; var sp = fx.kind === 'dust' ? 0.03 : 0.008;
          x = ((q.x + t * sp * q.s) % 1) * w; y = (q.y + Math.sin(t * 0.4 + q.p) * 0.02) * h;
          a = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t + q.p));
          dot(x, y, pix ? 1 : 1 + q.k * 1.5, (fx.kind === 'dust' ? 'rgba(255,214,160,' : 'rgba(255,250,225,') + a.toFixed(2) + ')');
        }
        break;
      case 'sparkle':
        for (i = 0; i < L.length; i++) {
          q = L[i]; a = Math.pow(Math.max(0, Math.sin(t * (1.2 + q.s) + q.p)), 10);
          if (a < 0.1) continue;
          x = q.x * w; y = q.y * h;
          var sc = 'rgba(255,255,255,' + a.toFixed(2) + ')';
          if (pix) { dot(x, y, 1, sc); if (a > 0.5) { dot(x - 1, y, 1, sc); dot(x + 1, y, 1, sc); dot(x, y - 1, 1, sc); dot(x, y + 1, 1, sc); } }
          else { var z = (3 + q.k * 6) * u * a; g.strokeStyle = sc; g.lineWidth = u; g.beginPath(); g.moveTo(x - z, y); g.lineTo(x + z, y); g.moveTo(x, y - z); g.lineTo(x, y + z); g.stroke(); dot(x, y, 1.2, sc); }
        }
        break;
      case 'traffic':
        for (i = 0; i < L.length; i++) {
          q = L[i]; var dir = q.k < 0.5 ? 1 : -1;
          x = (((q.x + t * 0.04 * q.s * dir) % 1) + 1) % 1 * w; y = (0.18 + q.y * 0.3) * h;
          var tc = q.k < 0.5 ? '34,211,238' : '244,114,182';
          if (pix) { dot(x, y, 2, 'rgb(' + tc + ')'); dot(x - dir * 2, y, 1, 'rgba(' + tc + ',.5)'); }
          else {
            var tg = g.createLinearGradient(x, y, x - dir * 40 * u, y);
            tg.addColorStop(0, 'rgba(' + tc + ',.95)'); tg.addColorStop(1, 'rgba(' + tc + ',0)');
            g.strokeStyle = tg; g.lineWidth = 1.6 * u; g.beginPath(); g.moveTo(x, y); g.lineTo(x - dir * 40 * u, y); g.stroke();
          }
        }
        break;
      case 'fog':
        if (pix) break;
        for (i = 0; i < L.length; i++) {
          q = L[i]; x = (((q.x + t * 0.006 * q.s) % 1.4) - 0.2) * w; y = (fx.a[0] || 0.6) * h + (q.y - 0.5) * h * 0.12;
          var fr = (0.25 + q.k * 0.25) * w;
          var fg = g.createRadialGradient(x, y, 0, x, y, fr);
          fg.addColorStop(0, 'rgba(255,255,255,.10)'); fg.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = fg; g.save(); g.translate(x, y); g.scale(1, 0.25); g.translate(-x, -y); g.beginPath(); g.arc(x, y, fr, 0, TAU); g.fill(); g.restore();
        }
        break;
    }
  }
  var fxLive = [], fxRaf = 0, fxLast = 0, fxStart = Date.now();
  function fxFrame(now) {
    fxRaf = 0;
    fxLive = fxLive.filter(function (c) { return c.isConnected; });
    if (!fxLive.length) return;
    fxRaf = global.requestAnimationFrame(fxFrame);
    if (document.hidden || now - fxLast < 33) return;
    fxLast = now;
    var t = (Date.now() - fxStart) / 1000;
    fxLive.forEach(function (cv) {
      if (!cv.offsetParent && cv.getClientRects().length === 0) return; // off-screen / hidden
      var pix = cv._fxPix;
      if (pix && Math.floor(t * 8) === cv._fxStep) return; // pixel art steps 8 times a second
      cv._fxStep = Math.floor(t * 8);
      paintFx(cv, pix ? Math.floor(t * 8) / 8 : t);
    });
  }
  function paintFx(cv, t) {
    var pix = cv._fxPix, w, h;
    if (pix) { w = 256; h = 144; }
    else {
      var dpr = Math.min(2, global.devicePixelRatio || 1);
      w = Math.max(1, Math.round((cv.clientWidth || 320) * dpr)); h = Math.max(1, Math.round((cv.clientHeight || 180) * dpr));
    }
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    var g = cv.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, w, h);
    cv._fx.forEach(function (fx) { drawFx(g, w, h, t, fx, pix); });
  }
  function fxMount(root) {
    if (!root || !root.querySelectorAll) return;
    Array.prototype.slice.call(root.querySelectorAll('canvas.tl-cv-fx:not([data-on])')).forEach(function (cv) {
      cv.setAttribute('data-on', '1');
      var c = ART_BY[cv.dataset.art];
      if (!c) return;
      cv._fxPix = c.art === 'pix';
      cv._fx = c.fx.split(' ').map(function (tk) { return makeFx(tk, c.id, cv._fxPix); }).filter(Boolean);
      var still = cv.closest('.tl-cvp-opt') || pxReduced();
      paintFx(cv, 12.3);
      if (!still) { fxLive.push(cv); if (!fxRaf && global.requestAnimationFrame) fxRaf = global.requestAnimationFrame(fxFrame); }
    });
  }
  function artLayers(c, thumb) {
    var drift = c.art === 'cin' && !thumb ? (c.fx.indexOf('drift2') >= 0 ? ' drift2' : c.fx.indexOf('drift') >= 0 ? ' drift' : '') : '';
    return '<i class="tl-cv-l tl-cv-art' + (c.art === 'pix' ? ' px' : '') + drift + '" style="background-image:url(\'' + artUrl(c, thumb) + '\')"></i>'
      + (thumb ? '' : '<canvas class="tl-cv-l tl-cv-fx' + (c.art === 'pix' ? ' px' : '') + '" data-art="' + c.id + '" aria-hidden="true"></canvas>');
  }

  function layersFor(id) {
    if (ART_BY[id]) return artLayers(ART_BY[id], false);
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
  // Only solid colours and gradients are free; every animated cover is Plus.
  function isPlus(id) { return typeof id === 'string' && id !== '' && !/^(solid|grad):/.test(id); }
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
    var layered = isPlus(valid) || !!ART_BY[valid];
    if ((el.dataset.cv || '') === valid && !!el.querySelector(':scope>.tl-cv-l') === layered) return;
    el.dataset.cv = valid;
    Array.prototype.slice.call(el.querySelectorAll(':scope>.tl-cv-l')).forEach(function (n) { n.remove(); });
    if (layered) {
      el.insertAdjacentHTML('afterbegin', layersFor(valid));
      pxMount(el);
      fxMount(el);
    }
    if (!valid) delete el.dataset.cv;
  }

  var LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function label(key, fallback) {
    if (typeof global.t === 'function') { var s = global.t(key); if (s && s !== key) return s; }
    return fallback;
  }

  var GROUPS = [
    { key: 'coverGroupCinematic', name: 'Cinematic', note: 'Animated', art: true, test: function (c) { return c.kind === 'art' && c.art === 'cin'; } },
    { key: 'coverGroupPixel', name: 'Pixel art', note: 'Animated', art: true, test: function (c) { return c.kind === 'art' && c.art === 'pix'; } },
    { key: 'coverGroupScenes', name: 'Living scenes', note: 'Plus', test: function (c) { return c.kind === 'plus'; } },
    { key: 'coverGroupGradients', name: 'Gradients', test: function (c) { return c.kind === 'grad'; } },
    { key: 'coverGroupColours', name: 'Colours', test: function (c) { return c.kind === 'solid'; } },
  ];

  // Swatch markup; the caller wires clicks on [data-cover].
  function picker(selected, hasPlus) {
    ensureCss();
    var CHECK = '<span class="tl-cvp-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></span>';
    function opt(c) {
      var locked = isPlus(c.id) && !hasPlus;
      // Art tiles show a light thumbnail; the full picture and its motion are on the card above.
      var layers = c.kind === 'art' ? artLayers(c, true) : c.kind === 'plus' ? layersFor(c.id) : '';
      return '<button type="button" class="tl-cvp-opt' + (selected === c.id ? ' selected' : '') + (locked ? ' is-locked' : '') + '" data-cover="' + c.id + '"'
        + ' aria-pressed="' + (selected === c.id ? 'true' : 'false') + '" aria-label="' + esc(nameOf(c.id) + (locked ? ' (Plus)' : '')) + '">'
        + '<span class="tl-cv" data-cv="' + c.id + '">' + layers + '</span><span class="tl-cvp-name">' + esc(nameOf(c.id)) + '</span>'
        + (locked ? '<span class="tl-cvp-lock">' + LOCK + '</span>' : '') + CHECK + '</button>';
    }
    // One scrollable grid: two rows show, a half row peeks under a fade and a
    // visible scrollbar says there is more. Plus scenes come last.
    return '<div class="tl-cvp">'
      + '<div class="tl-cvp-boxwrap"><div class="tl-cvp-box" data-cvp-box>' + GROUPS.map(function (gr) {
        var items = LIST.filter(gr.test);
        return '<div class="tl-cvp-h">' + esc(label(gr.key, gr.name)) + (gr.note ? '<small>' + esc(label(gr.key + 'Note', gr.note)) + '</small>' : '') + '</div>'
          + '<div class="tl-cvp-row' + (gr.art ? ' art' : '') + '">' + items.map(opt).join('') + '</div>';
      }).join('') + '</div></div>'
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

  global.TalkLiveCovers = { list: LIST, isValid: isValid, isPlus: isPlus, name: nameOf, apply: apply, picker: picker, ensureCss: ensureCss, mountPixels: pxMount, mountFx: fxMount, PX: PX };
}(window));
