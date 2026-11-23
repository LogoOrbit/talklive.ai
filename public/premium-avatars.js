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

    // A glossy eye: white, iris with depth, pupil, two catchlights, lid line.
    // Returns a group that blinks (scaled about the eye's centre) when given anims.
    k.eye = function (name, cx, cy, rx, ry, iris, opt) {
      opt = opt || {};
      var ir = opt.ir || Math.min(rx, ry) * 0.78;
      var ix = cx + (opt.look || 0) * rx * 0.25;
      var irisG = k.rg(name + 'i', ix - ir * 0.25, cy - ir * 0.35, ir * 1.25, [[0, iris[0]], [0.55, iris[1]], [1, iris[2] || '#0b0f1a']]);
      var c = [];
      if (!opt.noWhite) c.push(k.E(cx, cy, rx, ry, opt.white || '#fbfdff'));
      c.push(k.C(ix, cy, ir, irisG));
      c.push(k.C(ix, cy, ir * (opt.slit ? 0.2 : 0.5), opt.pupil || '#0a0d16'));
      if (opt.slit) c.push(k.E(ix, cy, ir * 0.18, ir * 0.85, opt.pupil || '#0a0d16'));
      c.push(k.C(ix - ir * 0.38, cy - ir * 0.42, ir * 0.3, '#ffffff', 0.95));
      c.push(k.C(ix + ir * 0.4, cy + ir * 0.38, ir * 0.13, '#ffffff', 0.7));
      if (opt.lid) c.push(k.L('M' + n(cx - rx * 1.05) + ',' + n(cy - ry * 0.55) + 'Q' + n(cx) + ',' + n(cy - ry * 1.35) + ' ' + n(cx + rx * 1.05) + ',' + n(cy - ry * 0.55), opt.lid, opt.lidW || 2.2));
      return k.G(c, { o: [cx, cy], a: opt.a || [] });
    };

    // The round tile every Plus face sits on: a lit backdrop with a soft vignette.
    k.tile = function (c1, c2, extra) {
      var bg = k.rg('tile', 46, 34, 96, [[0, c1], [1, c2]]);
      var vig = k.rg('vig', 64, 58, 72, [[0.62, '#000000', 0], [1, '#000000', 0.38]]);
      return k.G([k.C(64, 64, 64, bg)].concat(extra || []).concat([k.C(64, 64, 64, vig)]));
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
      f.scene = { defs: k.defs, tree: Array.isArray(tree) ? k.G(tree) : tree };
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
  /** The face as an <svg> string; live = with its loop. */
  function svg(key, size, opt) {
    var sc = scene(key);
    if (!sc) return '';
    opt = opt || {};
    var live = !!opt.live;
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
