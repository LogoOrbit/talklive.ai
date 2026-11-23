// ============================================================================
// TalkLive Plus - premium avatars.
//
// The Plus collection: the redesigned spirit animals and characters plus the
// new ones, each a detailed vector portrait (gradients, rim light, shading,
// texture strokes) with its own seamless idle loop. Written once here and
// played by both apps:
//   - the website renders each face as inline SVG and moves its groups with
//     CSS transforms (cheap, paused off-screen, off under reduced motion);
//   - android-native/tools/gen-premium.js reads the same scenes and writes a
//     VectorDrawable (the still) and an AnimatedVectorDrawable (the loop) per
//     face, which Android plays on its render thread.
//
// A scene is a tree on a 128 x 128 canvas:
//   shape: { d, f, s, w, o, lc }   path data, fill ('#hex' or '@gradient'),
//                                   stroke, stroke width, opacity, line cap
//   group: { c: [...], a: [anims], o: [x, y] pivot, t: static transform,
//            clip: path data, fx: true (only exists while animated) }
// Animations: [kind, a, b, seconds, delay] as in avatar-motion.js:
//   rot / tx / ty / sc / sx / sy / op   ease back and forth between a and b
//   blink, blink2, slow, twitch, tilt, hop, chat, rise, fade, tw  keyframed
//   spin                                  steady turn from a to b degrees
// Every loop eases back and forth or starts and ends at rest: no seams.
// ============================================================================
(function (global) {
  'use strict';

  var SIZE = 128;
  var KEYS = {
    twitch: { p: 'rot', k: [[0, 0], [0.7, 0], [0.75, 1], [0.8, -0.3], [0.86, 0.55], [0.92, 0], [1, 0]] },
    tilt: { p: 'rot', k: [[0, 0], [0.28, 0], [0.4, 1], [0.62, 1], [0.74, 0], [1, 0]] },
    hop: { p: 'ty', k: [[0, 0], [0.55, 0], [0.63, -1], [0.71, 0], [0.76, -0.35], [0.82, 0], [1, 0]] },
    chat: { p: 'ty', k: [[0, 0], [0.08, 1], [0.16, 0], [0.24, 1], [0.32, 0], [0.4, 0.7], [0.48, 0], [1, 0]] },
    blink: { p: 'sy', k: [[0, 1], [0.92, 1], [0.95, 0.08], [0.98, 1], [1, 1]] },
    blink2: { p: 'sy', k: [[0, 1], [0.84, 1], [0.865, 0.08], [0.89, 1], [0.92, 0.08], [0.945, 1], [1, 1]] },
    slow: { p: 'sy', k: [[0, 1], [0.8, 1], [0.86, 0.1], [0.94, 0.1], [0.98, 1], [1, 1]] },
    rise: { p: 'ty', k: [[0, 0], [1, -1]], lin: true },
    fade: { p: 'op', k: [[0, 0], [0.15, 1], [0.7, 0.85], [1, 0]], lin: true },
    tw: { p: 'sc', k: [[0, 0.01], [0.15, 1], [0.3, 0.01], [1, 0.01]] },
    pulse: { p: 'op', k: [[0, 0.25], [0.5, 1], [1, 0.25]] },
  };

  // --- geometry helpers --------------------------------------------------------
  function n(v) { return +(+v).toFixed(2); }
  function ell(cx, cy, rx, ry) {
    return 'M' + n(cx - rx) + ',' + n(cy) + 'a' + n(rx) + ',' + n(ry) + ' 0 1,0 ' + n(2 * rx) + ',0a' + n(rx) + ',' + n(ry) + ' 0 1,0 ' + n(-2 * rx) + ',0z';
  }
  // A four-point sparkle.
  function starD(x, y, r) {
    var s = r * 0.28;
    return 'M' + n(x) + ',' + n(y - r) + 'Q' + n(x + s) + ',' + n(y - s) + ' ' + n(x + r) + ',' + n(y) + 'Q' + n(x + s) + ',' + n(y + s) + ' ' + n(x) + ',' + n(y + r)
      + 'Q' + n(x - s) + ',' + n(y + s) + ' ' + n(x - r) + ',' + n(y) + 'Q' + n(x - s) + ',' + n(y - s) + ' ' + n(x) + ',' + n(y - r) + 'z';
  }
  function heartD(x, y, s) {
    return 'M' + n(x) + ',' + n(y + s) + 'C' + n(x - s * 1.6) + ',' + n(y - s * 0.2) + ' ' + n(x - s * 0.6) + ',' + n(y - s * 1.3) + ' ' + n(x) + ',' + n(y - s * 0.4)
      + 'C' + n(x + s * 0.6) + ',' + n(y - s * 1.3) + ' ' + n(x + s * 1.6) + ',' + n(y - s * 0.2) + ' ' + n(x) + ',' + n(y + s) + 'z';
  }

  // --- the scene builder handed to each face -----------------------------------
  // --- 2D: colours, path bounds, and cel shading --------------------------------
  function rgb(h) {
    h = String(h).replace('#', '');
    if (h.length === 3) h = h.split('').map(function (x) { return x + x; }).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function hex(c) { return '#' + c.map(function (v) { return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'); }).join(''); }
  function mix(a, b, t) { var x = rgb(a), y = rgb(b); return hex([0, 1, 2].map(function (i) { return x[i] + (y[i] - x[i]) * t; })); }
  // Darker and a touch more saturated, like an ink line.
  function shade(c, t) { var x = rgb(c); return hex(x.map(function (v) { return v * (1 - t); })); }
  // Bounds of a path (control points included: close enough for sizing the shading).
  function bounds(d) {
    var re = /([MmLlHhVvCcSsQqTtAaZz])|(-?\d*\.?\d+(?:e-?\d+)?)/g, m, cmd = 'M', args = [], x = 0, y = 0, sx = 0, sy = 0;
    var b = [1e9, 1e9, -1e9, -1e9];
    function pt(px, py) { if (px < b[0]) b[0] = px; if (py < b[1]) b[1] = py; if (px > b[2]) b[2] = px; if (py > b[3]) b[3] = py; }
    var size = { M: 2, L: 2, T: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, A: 7, Z: 0 };
    function run() {
      var U = cmd.toUpperCase(), rel = cmd !== U, k = size[U];
      if (U === 'Z') { x = sx; y = sy; return; }
      while (args.length >= k && k > 0) {
        var a = args.splice(0, k);
        if (U === 'H') { x = rel ? x + a[0] : a[0]; pt(x, y); continue; }
        if (U === 'V') { y = rel ? y + a[0] : a[0]; pt(x, y); continue; }
        if (U === 'A') {
          var nx = rel ? x + a[5] : a[5], ny = rel ? y + a[6] : a[6];
          pt(Math.min(x, nx) - 0, Math.min(y, ny) - a[1]); pt(Math.max(x, nx), Math.max(y, ny) + a[1]);
          pt(x, y - a[1]); pt(x, y + a[1]);
          x = nx; y = ny; pt(x, y); continue;
        }
        for (var i = 0; i < k; i += 2) pt(rel ? x + a[i] : a[i], rel ? y + a[i + 1] : a[i + 1]);
        x = rel ? x + a[k - 2] : a[k - 2]; y = rel ? y + a[k - 1] : a[k - 1];
        if (U === 'M') { sx = x; sy = y; cmd = rel ? 'l' : 'L'; U = 'L'; k = 2; }
      }
    }
    while ((m = re.exec(d))) {
      if (m[1]) { run(); cmd = m[1]; args = []; if (cmd === 'Z' || cmd === 'z') run(); } else args.push(+m[2]);
    }
    run();
    return b[0] > b[2] ? null : { w: b[2] - b[0], h: b[3] - b[1] };
  }
  function stopsOf(g) { return g.s.map(function (s) { return { o: s[0], c: s[1], a: s[2] == null ? 1 : s[2] }; }); }
  function colorAt(st, t) {
    for (var i = 1; i < st.length; i++) if (t <= st[i].o) {
      var span = st[i].o - st[i - 1].o || 1;
      return mix(st[i - 1].c, st[i].c, Math.max(0, Math.min(1, (t - st[i - 1].o) / span)));
    }
    return st[st.length - 1].c;
  }
  // Turns the painted (gradient) look into crisp 2D: every gradient-filled form
  // becomes three flat tones - a light edge to the upper left, the base, and a
  // shadow crescent to the lower right - with an ink outline. Glows become flat
  // translucent shapes. Nothing is removed: every shape and detail stays.
  function to2d(node, defs) {
    if (!node.d) {
      node.c = node.c.map(function (c) { return to2d(c, defs); }).filter(Boolean);
      return node;
    }
    if (node.s && node.s.charAt(0) === '@') { var gs = defs[node.s.slice(1)]; node.s = gs ? colorAt(stopsOf(gs), 0.5) : '#000000'; }
    if (!node.f || node.f.charAt(0) !== '@') return node;
    var g = defs[node.f.slice(1)];
    if (!g) { node.f = '#000000'; return node; }
    var st = stopsOf(g);
    var soft = st.some(function (x) { return x.a < 1; });
    if (soft) {
      // A glow or haze: transparent at the centre (a vignette) goes; otherwise one flat, see-through tone.
      if (st[0].a === 0) return null;
      var maxA = Math.max.apply(null, st.map(function (x) { return x.a; }));
      node.f = st[0].c;
      node.o = (node.o == null ? 1 : node.o) * maxA * 0.5;
      return node;
    }
    var light = st[0].c, base = colorAt(st, 0.5), dark = st[st.length - 1].c;
    var bb = bounds(node.d);
    var size = bb ? Math.min(bb.w, bb.h) : 10;
    var o = node.o == null ? 1 : node.o;
    if (size < 3.5 || o < 1) { node.f = base; return node; }
    var off = Math.max(0.7, Math.min(5, size * 0.09));
    var pieces = [
      { d: node.d, f: dark, o: 1 },
      { c: [{ d: node.d, f: light, o: 1 }], t: { x: -off, y: -off } },
      { c: [{ d: node.d, f: base, o: 1 }], t: { x: -off * 0.45, y: -off * 0.45 } },
    ];
    var out = { c: [{ c: pieces, clip: node.d }] };
    if (size >= 7) out.c.push({ d: node.d, f: null, s: shade(dark, 0.35), w: Math.max(0.7, Math.min(1.8, size * 0.035)), o: 0.9, lc: 'round' });
    return out;
  }

  // Children may be nested lists (helpers return several pieces); flatten them.
  function flat(c) {
    var out = [];
    (function walk(x) { if (Array.isArray(x)) x.forEach(walk); else if (x) out.push(x); })(c);
    return out;
  }
  function Kit() {
    var defs = {};
    var k = {
      defs: defs,
      // Gradients live in the face's own namespace; '@name' fills reference them.
      lg: function (name, x1, y1, x2, y2, stops) { defs[name] = { t: 'l', x1: x1, y1: y1, x2: x2, y2: y2, s: stops }; return '@' + name; },
      rg: function (name, cx, cy, r, stops) { defs[name] = { t: 'r', cx: cx, cy: cy, r: r, s: stops }; return '@' + name; },
      P: function (d, f, o) { return { d: d, f: f, o: o == null ? 1 : o }; },
      C: function (cx, cy, r, f, o) { return { d: ell(cx, cy, r, r), f: f, o: o == null ? 1 : o }; },
      E: function (cx, cy, rx, ry, f, o) { return { d: ell(cx, cy, rx, ry), f: f, o: o == null ? 1 : o }; },
      // Stroked line (no fill).
      L: function (d, s, w, o, lc) { return { d: d, f: null, s: s, w: w, o: o == null ? 1 : o, lc: lc || 'round' }; },
      // Group: G(children, { a, o, t, clip, fx })
      G: function (c, opt) { var g = { c: flat(c) }; if (opt) for (var x in opt) g[x] = opt[x]; return g; },
      // The same children mirrored around the face's centre line (both ears from one).
      M: function (c, opt) { var g = { c: flat(c), t: { sx: -1, px: 64, py: 64 } }; if (opt) for (var x in opt) g[x] = opt[x]; return g; },
      ell: ell,
      star: function (x, y, r, f, o) { return { d: starD(x, y, r), f: f, o: o == null ? 1 : o }; },
      heart: function (x, y, s, f, o) { return { d: heartD(x, y, s), f: f, o: o == null ? 1 : o }; },
    };

    // A 2D eye: white, a flat iris with an inked ring and a lighter lower
    // crescent, pupil, two catchlights, lid line. Returns a group that blinks
    // (scaled about the eye's centre) when given anims.
    k.eye = function (name, cx, cy, rx, ry, iris, opt) {
      opt = opt || {};
      var ir = opt.ir || Math.min(rx, ry) * 0.78;
      var ix = cx + (opt.look || 0) * rx * 0.25;
      var ring = iris[2] || '#0b0f1a';
      var c = [];
      if (!opt.noWhite) c.push(k.E(cx, cy, rx, ry, opt.white || '#fbfdff'));
      c.push(k.C(ix, cy, ir, iris[1]));
      c.push(k.E(ix, cy + ir * 0.38, ir * 0.62, ir * 0.42, iris[0], 0.85));
      c.push(k.C(ix, cy, ir * (opt.slit ? 0.2 : 0.5), opt.pupil || '#0a0d16'));
      if (opt.slit) c.push(k.E(ix, cy, ir * 0.18, ir * 0.85, opt.pupil || '#0a0d16'));
      c.push(k.L(ell(ix, cy, ir * 0.94, ir * 0.94), ring, Math.max(0.6, ir * 0.16)));
      c.push(k.C(ix - ir * 0.38, cy - ir * 0.42, ir * 0.3, '#ffffff', 0.95));
      c.push(k.C(ix + ir * 0.4, cy + ir * 0.38, ir * 0.13, '#ffffff', 0.7));
      if (!opt.noWhite) c.push(k.L(ell(cx, cy, rx, ry), '#2a2230', 0.7, 0.45));
      if (opt.lid) c.push(k.L('M' + n(cx - rx * 1.05) + ',' + n(cy - ry * 0.55) + 'Q' + n(cx) + ',' + n(cy - ry * 1.35) + ' ' + n(cx + rx * 1.05) + ',' + n(cy - ry * 0.55), opt.lid, opt.lidW || 2.2));
      return k.G(c, { o: [cx, cy], a: opt.a || [] });
    };

    // The round tile every Plus face sits on: a flat 2D backdrop - base colour,
    // a pool of light in the upper left, and an inked rim.
    k.tile = function (c1, c2, extra) {
      return k.G([k.C(64, 64, 64, c2), k.C(48, 40, 62, mix(c1, c2, 0.35), 0.9), k.C(42, 32, 34, c1, 0.55)]
        .concat(extra || []).concat([k.L(ell(64, 64, 62.6, 62.6), shade(c2, 0.45), 2.8, 0.55)]));
    };
    // Sparkles that twinkle in turn (fx: gone in the still picture).
    k.sparkles = function (pts, colors, dur) {
      return pts.map(function (q, i) {
        return k.G([k.star(q[0], q[1], q[2] || 4, colors[i % colors.length])], { o: [q[0], q[1]], a: [['tw', 1, 0, (dur || 2.8) + i * 0.4, i * 0.9]], fx: true });
      });
    };
    // Particles that rise and fade (bubbles, embers, notes...).
    k.risers = function (pts, mk, dist, dur) {
      return pts.map(function (q, i) {
        var d = dur || 3.4;
        return k.G([mk(q[0], q[1], q[2] || 2, i)], { o: [q[0], q[1]], a: [['rise', dist || 22, 0, d + i * 0.45, i * (d / pts.length)], ['fade', 1, 0, d + i * 0.45, i * (d / pts.length)]], fx: true });
      });
    };
    return k;
  }

  // --- the collection ------------------------------------------------------------
  // meta: { kind: 'a' | 'c', name, trait, color }
  var FACES = {};
  var ORDER = [];
  function def(key, meta, build) {
    FACES[key] = { key: key, meta: meta, build: build, scene: null };
    ORDER.push(key);
  }
  function scene(key) {
    var f = FACES[key];
    if (!f) return null;
    if (!f.scene) {
      var k = Kit();
      var tree = f.build(k);
      // Everything stays inside the round tile, whatever box the face is shown in.
      var root = to2d(k.G([Array.isArray(tree) ? k.G(tree) : tree], { clip: ell(64, 64, 64, 64) }), k.defs);
      f.scene = { defs: {}, tree: root };
    }
    return f.scene;
  }

  // --- website renderer ----------------------------------------------------------
  var uid = 0;
  function esc(s) { return String(s).replace(/"/g, '&quot;'); }
  function paint(f, ns) {
    if (!f) return 'none';
    return f.charAt(0) === '@' ? 'url(#' + ns + f.slice(1) + ')' : f;
  }
  function staticTf(t) {
    if (!t) return '';
    var px = t.px || 0, py = t.py || 0;
    var sx = t.sx == null ? (t.s == null ? 1 : t.s) : t.sx;
    var sy = t.sy == null ? (t.s == null ? 1 : t.s) : t.sy;
    return ' transform="translate(' + n(px + (t.x || 0)) + ' ' + n(py + (t.y || 0)) + ') rotate(' + n(t.r || 0) + ') scale(' + n(sx) + ' ' + n(sy) + ') translate(' + n(-px) + ' ' + n(-py) + ')"';
  }
  function shapeSvg(sh, ns) {
    var out = '<path d="' + sh.d + '"';
    out += ' fill="' + esc(paint(sh.f, ns)) + '"';
    if (sh.s) out += ' stroke="' + esc(paint(sh.s, ns)) + '" stroke-width="' + sh.w + '" stroke-linecap="' + (sh.lc || 'round') + '" stroke-linejoin="round"';
    if (sh.o != null && sh.o !== 1) out += ' opacity="' + sh.o + '"';
    return out + '/>';
  }
  function defsSvg(defs, ns) {
    var out = '';
    Object.keys(defs).forEach(function (name) {
      var g = defs[name];
      var stops = g.s.map(function (st) {
        return '<stop offset="' + st[0] + '" stop-color="' + st[1] + '"' + (st[2] != null && st[2] !== 1 ? ' stop-opacity="' + st[2] + '"' : '') + '/>';
      }).join('');
      if (g.t === 'l') out += '<linearGradient id="' + ns + name + '" gradientUnits="userSpaceOnUse" x1="' + g.x1 + '" y1="' + g.y1 + '" x2="' + g.x2 + '" y2="' + g.y2 + '">' + stops + '</linearGradient>';
      else out += '<radialGradient id="' + ns + name + '" gradientUnits="userSpaceOnUse" cx="' + g.cx + '" cy="' + g.cy + '" r="' + g.r + '">' + stops + '</radialGradient>';
    });
    return out;
  }

  // CSS keyframes, one rule per distinct animation, shared by every face.
  var PROP = { rot: 'rotate', tx: 'translateX', ty: 'translateY', sc: 'scale', sx: 'scaleX', sy: 'scaleY' };
  function cssValue(p, v) {
    if (p === 'op') return 'opacity:' + v;
    var unit = p === 'rot' ? 'deg' : p === 'tx' || p === 'ty' ? 'px' : '';
    return 'transform:' + PROP[p] + '(' + (+v).toFixed(3) + unit + ')';
  }
  function keyValue(kind, K, f, amount) {
    if (K.p === 'sy' || K.p === 'sc' || K.p === 'op') {
      return (/^(tw|fade|blink|blink2|slow|pulse)$/.test(kind)) ? f : 1 + (f - 1) * amount;
    }
    return f * amount;
  }
  var sheet = null, cssDone = {};
  function rule(css) {
    if (typeof document === 'undefined') return;
    if (!sheet) {
      sheet = document.createElement('style');
      sheet.id = 'tlxCss';
      sheet.textContent = '.tlx g{transform-box:view-box}'
        + '.tlx.tlx-off g{animation-play-state:paused!important}'
        + '@media (prefers-reduced-motion:reduce){.tlx g{animation:none!important}.tlx .tlx-fx{display:none}}';
      document.head.appendChild(sheet);
    }
    sheet.textContent += css;
  }
  function animClass(a) {
    var kind = a[0];
    var key = 'tlx-' + a.join('_').replace(/[^a-z0-9_-]/gi, function (c) { return c === '.' ? 'p' : 'm'; });
    if (!cssDone[key]) {
      cssDone[key] = true;
      var dur = a[3], delay = a[4] || 0, css;
      if (KEYS[kind]) {
        var K = KEYS[kind];
        css = '@keyframes ' + key + '{' + K.k.map(function (f) {
          return (f[0] * 100).toFixed(1) + '%{' + cssValue(K.p, keyValue(kind, K, f[1], a[1])) + '}';
        }).join('') + '}.tlx .' + key + '{animation:' + key + ' ' + dur + 's ' + (K.lin ? 'linear' : 'ease-in-out') + ' ' + (-delay) + 's infinite}';
      } else if (kind === 'spin') {
        css = '@keyframes ' + key + '{from{transform:rotate(' + a[1] + 'deg)}to{transform:rotate(' + a[2] + 'deg)}}'
          + '.tlx .' + key + '{animation:' + key + ' ' + dur + 's linear ' + (-Math.abs(delay)) + 's infinite}';
      } else {
        css = '@keyframes ' + key + '{from{' + cssValue(kind, a[1]) + '}to{' + cssValue(kind, a[2]) + '}}'
          + '.tlx .' + key + '{animation:' + key + ' ' + dur + 's ease-in-out ' + (-delay) + 's infinite alternate}';
      }
      rule(css);
    }
    return key;
  }
  function nodeSvg(node, ns, live, clips) {
    if (node.d) return shapeSvg(node, ns);
    if (node.fx && !live) return '';
    var inner = node.c.map(function (c) { return nodeSvg(c, ns, live, clips); }).join('');
    if (node.clip) {
      var cid = ns + 'c' + clips.length;
      clips.push('<clipPath id="' + cid + '"><path d="' + node.clip + '"/></clipPath>');
      inner = '<g clip-path="url(#' + cid + ')">' + inner + '</g>';
    }
    if (live && node.a && node.a.length) {
      for (var i = node.a.length - 1; i >= 0; i--) {
        var o = node.o || [64, 64];
        inner = '<g class="' + animClass(node.a[i]) + '" style="transform-origin:' + o[0] + 'px ' + o[1] + 'px">' + inner + '</g>';
      }
    }
    if (node.t) inner = '<g' + staticTf(node.t) + '>' + inner + '</g>';
    if (node.fx) inner = '<g class="tlx-fx">' + inner + '</g>';
    return inner;
  }
  // Stills are one cached image per face (an SVG data URL): the browser decodes it
  // once and every copy on the page reuses it, so long lists and pickers scroll
  // smoothly. Only the live (animated) faces are inline SVG.
  var stillUrl = {};
  function still(key) {
    if (!stillUrl[key]) {
      var markup = svg(key, SIZE, { live: false, inline: true }).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
      stillUrl[key] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup);
    }
    return stillUrl[key];
  }
  /** The face as markup; live = an inline <svg> with its loop, otherwise the cached still image. */
  function svg(key, size, opt) {
    var sc = scene(key);
    if (!sc) return '';
    opt = opt || {};
    var live = !!opt.live;
    var s0 = size || 40;
    if (!live && !opt.inline) {
      return '<img class="tl-animal-icon tl-premium' + (opt.cls ? ' ' + opt.cls : '') + '" width="' + s0 + '" height="' + s0
        + '" src="' + still(key) + '" alt="" decoding="async" draggable="false" style="border-radius:50%;display:block">';
    }
    var ns = 'tlx' + (++uid) + '_';
    var clips = [];
    var body = nodeSvg(sc.tree, ns, live, clips);
    var s = size || 40;
    return '<svg class="tl-animal-icon tl-premium' + (live ? ' tlx' : '') + (opt.cls ? ' ' + opt.cls : '') + '" width="' + s + '" height="' + s
      + '" viewBox="0 0 ' + SIZE + ' ' + SIZE + '" aria-hidden="true" focusable="false"><defs>' + defsSvg(sc.defs, ns) + clips.join('') + '</defs>' + body + '</svg>';
  }

  // Faces off-screen stop moving; they carry on where they were when they come back.
  var io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { e.target.classList.toggle('tlx-off', !e.isIntersecting); });
  }) : null;
  function watch(root) {
    if (!io || !root || !root.querySelectorAll) return;
    Array.prototype.forEach.call(root.querySelectorAll('svg.tlx:not([data-tlx])'), function (el) { el.setAttribute('data-tlx', '1'); io.observe(el); });
  }
  if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined' && document.documentElement) {
    var pending = false;
    new MutationObserver(function () {
      if (pending) return;
      pending = true;
      (global.requestAnimationFrame || setTimeout)(function () { pending = false; watch(document.body); });
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  global.TalkLivePremium = {
    def: def,
    has: function (key) { return !!FACES[key]; },
    keys: function () { return ORDER.slice(); },
    meta: function (key) { return FACES[key] ? FACES[key].meta : null; },
    scene: scene,
    svg: svg,
    KEYS: KEYS,
    SIZE: SIZE,
  };
}(typeof window !== 'undefined' ? window : globalThis));
