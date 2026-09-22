// ============================================================================
// TalkLive - spirit animals.
//
// A tiny, dependency-free module shared by BOTH sub-apps (the voice app in
// app.js and the text-chat app in chat.js): one list of animals, one set of
// hand-drawn vector icons, one localStorage key.
//
// Why an inline SVG sprite instead of images from a free icon site:
//   - Zero network requests. An icon CDN would add a DNS lookup, a TLS
//     handshake and 12 round-trips to the one screen that must be instant on a
//     weak phone, and would break the installed/offline PWA completely.
//   - The whole sprite is injected ONCE per page (~6KB of markup); every icon
//     after that is a 40-byte <use> reference the browser renders from the same
//     parsed geometry, so a 12-icon picker costs almost nothing to build and
//     nothing at all to re-render.
//   - Vectors, not emoji: they look identical on every OS (emoji are a
//     different picture on Android, iOS and Windows) and they inherit the
//     page's sizing instead of the system font's.
// ============================================================================
(function (global) {
  'use strict';

  var STORAGE_KEY = 'talklive_animal';
  var SPRITE_ID = 'tlAnimalSprite';

  // --- Small SVG helpers, so the artwork below reads as shapes, not strings ---
  function c(cx, cy, r, fill, extra) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + fill + '"' + (extra || '') + '/>';
  }
  function e(cx, cy, rx, ry, fill, extra) {
    return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + fill + '"' + (extra || '') + '/>';
  }
  function p(d, fill, extra) {
    return '<path d="' + d + '" fill="' + fill + '"' + (extra || '') + '/>';
  }
  function line(d, stroke, w, extra) {
    return '<path d="' + d + '" fill="none" stroke="' + stroke + '" stroke-width="' + w
      + '" stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '/>';
  }
  // One eye + its highlight. The glint is what stops a pair of dots reading as
  // a dead stare at 28px.
  function eye(x, y, r) {
    return c(x, y, r, '#1f2637') + c(x + r * 0.36, y - r * 0.42, r * 0.34, '#ffffff', ' opacity=".92"');
  }
  var INK = '#1f2637';

  // --- The animals. Order is the order of the picker. -------------------------
  var LIST = [
    {
      id: 'lion', name: 'Lion', trait: 'Bold and big-hearted', color: '#f0a92c',
      art: function () {
        var mane = '';
        for (var i = 0; i < 12; i++) {
          var a = i * Math.PI / 6;
          mane += c((32 + 20.5 * Math.cos(a)).toFixed(1), (34 + 20.5 * Math.sin(a)).toFixed(1), 6.6, '#d97706');
        }
        return mane
          + c(16, 22, 5.6, '#e8a33c') + c(48, 22, 5.6, '#e8a33c')
          + c(32, 34, 20, '#d97706')
          + c(32, 35, 15.5, '#f7c775')
          + e(32, 43, 9.8, 6.6, '#fde9c8')
          + p('M28.4 39.2h7.2L32 44z', '#8a4b16')
          + line('M32 44v2.6M32 46.6q-3.2 2.6-5.8 0M32 46.6q3.2 2.6 5.8 0', '#8a4b16', 1.7)
          + eye(26, 32, 2.7) + eye(38, 32, 2.7);
      },
    },
    {
      id: 'tiger', name: 'Tiger', trait: 'Fearless and driven', color: '#fb923c',
      art: function () {
        return c(16, 20, 6.4, '#e07a26') + c(16, 20, 3.2, '#f9c9a4')
          + c(48, 20, 6.4, '#e07a26') + c(48, 20, 3.2, '#f9c9a4')
          + e(32, 36, 17, 16, '#fb923c')
          + line('M23 22l2.4 7M32 20v7.5M41 22l-2.4 7', '#3f2a1d', 2.6)
          + line('M15.5 35h6.5M15.5 40h5.5M48.5 35H42M48.5 40H43', '#3f2a1d', 2.4)
          + e(32, 44, 10, 6.6, '#fff3e6')
          + p('M28.4 40.4h7.2L32 45z', '#b04a2a')
          + line('M32 45v2.4M32 47.4q-3 2.4-5.4 0M32 47.4q3 2.4 5.4 0', '#b04a2a', 1.6)
          + eye(25, 34, 2.7) + eye(39, 34, 2.7);
      },
    },
    {
      id: 'wolf', name: 'Wolf', trait: 'Loyal and independent', color: '#94a3b8',
      art: function () {
        return p('M12 30L15.5 8.5 31 20.5z', '#94a3b8') + p('M16 25.5L18 14l8.5 7z', '#4b5563')
          + p('M52 30L48.5 8.5 33 20.5z', '#94a3b8') + p('M48 25.5L46 14l-8.5 7z', '#4b5563')
          + p('M32 17c11 0 19 8 19 17 0 7-5 12-10 15l-9 6-9-6c-5-3-10-8-10-15 0-9 8-17 19-17z', '#94a3b8')
          + p('M32 33c6 0 10.5 4 10.5 9 0 6-6.5 11-10.5 13.6C28 52.9 21.5 48 21.5 42c0-5 4.5-9 10.5-9z', '#e2e8f0')
          + e(32, 43.5, 3.4, 2.6, INK)
          + line('M32 46v2.4M32 48.4q-3 2.4-5.4 0M32 48.4q3 2.4 5.4 0', '#64748b', 1.6)
          + eye(24.5, 33, 2.7) + eye(39.5, 33, 2.7);
      },
    },
    {
      id: 'fox', name: 'Fox', trait: 'Clever and playful', color: '#f97316',
      art: function () {
        return p('M11.5 29L16.5 7.5 31 20z', '#f97316') + p('M16 24L18.5 13l8 6.5z', '#7c2d12')
          + p('M52.5 29L47.5 7.5 33 20z', '#f97316') + p('M48 24L45.5 13l-8 6.5z', '#7c2d12')
          + p('M32 16c11 0 19 8 19 17 0 7-5 12-10 15l-9 6-9-6c-5-3-10-8-10-15 0-9 8-17 19-17z', '#f97316')
          + p('M32 32c6.6 0 11 4 11 9.2 0 6-6.6 11.2-11 13.8-4.4-2.6-11-7.8-11-13.8 0-5.2 4.4-9.2 11-9.2z', '#fff7ed')
          + e(32, 43, 3.4, 2.6, INK)
          + line('M32 45.6v2.4M32 48q-3 2.4-5.4 0M32 48q3 2.4 5.4 0', '#c2410c', 1.6)
          + eye(24.5, 32.5, 2.7) + eye(39.5, 32.5, 2.7);
      },
    },
    {
      id: 'cat', name: 'Cat', trait: 'Calm, curious, does its own thing', color: '#a78bfa',
      art: function () {
        return p('M13 31L15 11l16 9.5z', '#a78bfa') + p('M17 26.5L18.5 16l9 5.5z', '#f3a6b8')
          + p('M51 31L49 11l-16 9.5z', '#a78bfa') + p('M47 26.5L45.5 16l-9 5.5z', '#f3a6b8')
          + e(32, 37, 17, 15.5, '#a78bfa')
          + line('M4 35l13 2.5M4 42l13-1.5M60 35l-13 2.5M60 42l-13-1.5', '#c4b5fd', 1.6)
          + p('M29.4 40.5h5.2L32 44z', '#f3a6b8')
          + line('M32 44v2.2M32 46.2q-3.4 2.8-5.6-.4M32 46.2q3.4 2.8 5.6-.4', '#7c5cd6', 1.7)
          + e(25, 34.5, 2.5, 3.2, INK) + c(26, 33.2, 0.9, '#ffffff', ' opacity=".92"')
          + e(39, 34.5, 2.5, 3.2, INK) + c(40, 33.2, 0.9, '#ffffff', ' opacity=".92"');
      },
    },
    {
      id: 'dog', name: 'Dog', trait: 'Friendly and always up for it', color: '#c98a4b',
      art: function () {
        return e(12.5, 35, 6.6, 11.5, '#a56a33', ' transform="rotate(-12 12.5 35)"')
          + e(51.5, 35, 6.6, 11.5, '#a56a33', ' transform="rotate(12 51.5 35)"')
          + e(32, 34, 16.5, 15.5, '#c98a4b')
          + e(32, 43, 10.5, 7.2, '#f3ddc0')
          + e(32, 40, 4.2, 3.2, INK)
          + line('M32 43.2v2.4M32 45.6q-3.4 2.8-6-.2M32 45.6q3.4 2.8 6-.2', '#8a5a2d', 1.7)
          + p('M29.6 48.4h4.8c0 3-1.1 4.6-2.4 4.6s-2.4-1.6-2.4-4.6z', '#f3a6b8')
          + eye(25.5, 31, 2.7) + eye(38.5, 31, 2.7);
      },
    },
    {
      id: 'bear', name: 'Bear', trait: 'Warm, steady, protective', color: '#9c6741',
      art: function () {
        return c(14, 18.5, 7, '#8a5a3b') + c(14, 18.5, 3.6, '#c08a63')
          + c(50, 18.5, 7, '#8a5a3b') + c(50, 18.5, 3.6, '#c08a63')
          + e(32, 36, 17.5, 16, '#9c6741')
          + e(32, 44, 10, 7.4, '#e7c9a8')
          + e(32, 41, 4.2, 3.2, '#3b2a1d')
          + line('M32 44.4v2.4M32 46.8q-3.2 2.6-5.6 0M32 46.8q3.2 2.6 5.6 0', '#7a5233', 1.7)
          + eye(25, 33, 2.7) + eye(39, 33, 2.7);
      },
    },
    {
      id: 'panda', name: 'Panda', trait: 'Chill and easy-going', color: '#64748b',
      art: function () {
        return c(14, 18.5, 7, '#232a36') + c(50, 18.5, 7, '#232a36')
          + e(32, 36, 18, 16.5, '#f8fafc')
          + e(23, 34, 6, 7.6, '#232a36', ' transform="rotate(-16 23 34)"')
          + e(41, 34, 6, 7.6, '#232a36', ' transform="rotate(16 41 34)"')
          + c(23.5, 34, 2.7, '#ffffff') + c(23.5, 34, 1.5, '#232a36')
          + c(40.5, 34, 2.7, '#ffffff') + c(40.5, 34, 1.5, '#232a36')
          + e(32, 42.5, 3.8, 2.9, '#232a36')
          + line('M32 45.4v2.2M32 47.6q-3.2 2.6-5.6 0M32 47.6q3.2 2.6 5.6 0', '#232a36', 1.7);
      },
    },
    {
      id: 'rabbit', name: 'Rabbit', trait: 'Gentle and quick-witted', color: '#ec7f9b',
      art: function () {
        return e(23, 15, 5.2, 13, '#eef1f8', ' transform="rotate(-9 23 15)"')
          + e(23, 16, 2.5, 9.4, '#f6b8c6', ' transform="rotate(-9 23 16)"')
          + e(41, 15, 5.2, 13, '#eef1f8', ' transform="rotate(9 41 15)"')
          + e(41, 16, 2.5, 9.4, '#f6b8c6', ' transform="rotate(9 41 16)"')
          + e(32, 40, 15.5, 13.5, '#eef1f8')
          + line('M8 38l11 1.5M8 44l11-2M56 38l-11 1.5M56 44l-11-2', '#cbd5e1', 1.5)
          + p('M29.6 41.4h4.8L32 44.6z', '#f6b8c6')
          + line('M32 44.6v2', '#c9a0ad', 1.6)
          + p('M29.9 47h4.2v3.4h-4.2z', '#ffffff')
          + line('M32 47v3.4', '#d7dce8', 1)
          + eye(25.5, 38, 2.6) + eye(38.5, 38, 2.6);
      },
    },
    {
      id: 'owl', name: 'Owl', trait: 'Thoughtful and a good listener', color: '#a16207',
      art: function () {
        return p('M15 20L19.5 8 28 17z', '#a16207') + p('M49 20L44.5 8 36 17z', '#a16207')
          + p('M32 12c11.6 0 19 9 19 20.5S43.6 53 32 53s-19-9-19-20.5S20.4 12 32 12z', '#a16207')
          + p('M32 33c5.6 0 9.6 4.6 9.6 11 0 5.4-4 9-9.6 9s-9.6-3.6-9.6-9c0-6.4 4-11 9.6-11z', '#d9a441')
          + c(24, 29, 9, '#f7ecd9') + c(40, 29, 9, '#f7ecd9')
          + c(24, 29, 4.6, INK) + c(25.6, 27.4, 1.6, '#ffffff', ' opacity=".92"')
          + c(40, 29, 4.6, INK) + c(41.6, 27.4, 1.6, '#ffffff', ' opacity=".92"')
          + p('M32 33.5l4.2 6.4h-8.4z', '#f59e0b')
          + p('M25.5 53.5h5.2v2.6h-5.2zM33.3 53.5h5.2v2.6h-5.2z', '#f59e0b');
      },
    },
    {
      id: 'penguin', name: 'Penguin', trait: 'Sweet, funny, a little awkward', color: '#38bdf8',
      art: function () {
        return e(32, 34, 17.5, 19.5, '#232a36')
          + e(32, 38, 11.8, 15, '#f8fafc')
          + p('M32 15c6.6 0 11 4.4 11 10.4 0 3.6-4.6 6-11 6s-11-2.4-11-6C21 19.4 25.4 15 32 15z', '#f8fafc')
          + eye(26.6, 26, 2.7) + eye(37.4, 26, 2.7)
          + p('M27 31.5h10L32 38z', '#f59e0b')
          + e(25, 53, 5.4, 2.6, '#f59e0b') + e(39, 53, 5.4, 2.6, '#f59e0b')
          + p('M14.5 30c-2 6-2 13 .6 18 2 1 3.4-.4 3.4-3z', '#232a36')
          + p('M49.5 30c2 6 2 13-.6 18-2 1-3.4-.4-3.4-3z', '#232a36');
      },
    },
    {
      id: 'dolphin', name: 'Dolphin', trait: 'Social and fun-loving', color: '#38bdf8',
      art: function () {
        return p('M10 26C20 13 40 13 50 23c3 3 6 5 9 6-3 2-6 3-9 3.6-6 8-22 12-34 6-3-1.6-5-7.6-6-12.6z', '#38bdf8')
          + p('M10.5 25C5.5 23 2 25 1 29.6c3 1.6 6 2 9 3-3 2.6-4 6.6-3.2 9.6 4-1.6 7.4-5 9.4-8.2z', '#38bdf8')
          + p('M29 15.5c1-6 5-10 10.4-11.2-.8 6-3.6 10.4-7 12.6z', '#0ea5e9')
          + p('M27.5 33c-2 5-1.4 10.4 1.4 13.8 3-3.6 4.4-8.6 3.6-13z', '#0ea5e9')
          + p('M17 37c10 5.4 24 2.4 30.6-5-7.4 3.6-19.4 5.6-30.6 5z', '#bae6fd')
          + c(48, 25.5, 2.2, INK) + c(48.8, 24.6, 0.8, '#ffffff', ' opacity=".92"')
          + line('M52 30.6c2 1.2 4 1.6 6.4 1.4', '#0284c7', 1.5);
      },
    },
    {
      id: 'elephant', name: 'Elephant', trait: 'Kind and never forgets a face', color: '#94a3b8',
      art: function () {
        return e(13, 30, 10, 12, '#8d9bb0') + e(51, 30, 10, 12, '#8d9bb0')
          + e(13, 30, 6, 7.6, '#a9b6c8') + e(51, 30, 6, 7.6, '#a9b6c8')
          + e(32, 32, 16, 15, '#9aa8bd')
          + p('M26 42h12v9c0 5-2.4 8-6 8s-6-3-6-8z', '#8d9bb0')
          + line('M27.5 48h9M27.5 52h9', '#76839a', 1.5)
          + p('M24 47c-2.6 3-6 3.6-8.6 1.6M40 47c2.6 3 6 3.6 8.6 1.6', '#f1f5f9', ' opacity=".9"')
          + eye(24, 30, 2.7) + eye(40, 30, 2.7);
      },
    },
    {
      id: 'koala', name: 'Koala', trait: 'Laid-back and sleeps on it', color: '#a3adbd',
      art: function () {
        return c(12, 24, 10.5, '#8f99aa') + c(12, 24, 6, '#c6ced9')
          + c(52, 24, 10.5, '#8f99aa') + c(52, 24, 6, '#c6ced9')
          + e(32, 35, 17, 16, '#a3adbd')
          + e(32, 41, 8, 6.4, '#4b5563')
          + line('M32 47.4q-3.4 2.8-6.2 0M32 47.4q3.4 2.8 6.2 0', '#5b6472', 1.7)
          + eye(25, 32, 2.9) + eye(39, 32, 2.9);
      },
    },
    {
      id: 'monkey', name: 'Monkey', trait: 'Playful and up for anything', color: '#b07b4f',
      art: function () {
        return c(11, 32, 8.6, '#b07b4f') + c(11, 32, 5, '#e2b183')
          + c(53, 32, 8.6, '#b07b4f') + c(53, 32, 5, '#e2b183')
          + c(32, 32, 17, '#b07b4f')
          + e(32, 38, 12.5, 11, '#e8c59c')
          + e(26, 41, 2.6, 2, '#8a5a33') + e(38, 41, 2.6, 2, '#8a5a33')
          + line('M32 45.5q-3.6 3-6.6 0M32 45.5q3.6 3 6.6 0', '#8a5a33', 1.7)
          + eye(26, 32, 3) + eye(38, 32, 3);
      },
    },
    {
      id: 'frog', name: 'Frog', trait: 'Cheerful and full of surprises', color: '#4ade80',
      art: function () {
        return c(19, 18, 9, '#4ade80') + c(45, 18, 9, '#4ade80')
          + c(19, 18, 5.4, '#ffffff') + c(45, 18, 5.4, '#ffffff')
          + c(19, 18.6, 2.9, INK) + c(45, 18.6, 2.9, INK)
          + e(32, 38, 19, 15, '#4ade80')
          + e(32, 42, 14, 9.5, '#86efac')
          + line('M22 40q10 8 20 0', '#15803d', 2.2)
          + c(24, 33, 1.7, '#22c55e') + c(40, 33, 1.7, '#22c55e');
      },
    },
    {
      id: 'deer', name: 'Deer', trait: 'Quiet, warm and easy to be around', color: '#c98a4b',
      art: function () {
        return line('M22 16 18 6M18 10l-5-2M22 16l-6-1M42 16 46 6M46 10l5-2M42 16l6-1', '#8a6234', 2.4)
          + c(16, 27, 5.4, '#b87a41') + c(48, 27, 5.4, '#b87a41')
          + e(32, 34, 14.5, 16, '#c98a4b')
          + e(32, 43, 8.6, 7.4, '#e8c091')
          + e(32, 41.5, 4, 3, '#6b4423')
          + c(23, 26, 2, '#e8c091') + c(41, 26, 2, '#e8c091')
          + eye(25, 33, 2.8) + eye(39, 33, 2.8);
      },
    },
    {
      id: 'turtle', name: 'Turtle', trait: 'Steady, patient, gets there', color: '#34d399',
      art: function () {
        // Shell first, head over it: drawn the other way round the head was
        // a bump on a green blob rather than a turtle looking at you.
        return e(12, 45, 7, 4.6, '#6ee7b7') + e(52, 45, 7, 4.6, '#6ee7b7')
          + e(22, 56, 5.6, 3.6, '#6ee7b7') + e(42, 56, 5.6, 3.6, '#6ee7b7')
          + e(32, 43, 21, 15, '#15803d')
          + e(32, 43, 16.5, 11, '#34d399')
          + line('M32 32v22M18 43h28M23 35l18 16M41 35 23 51', '#15803d', 1.6)
          + c(32, 20, 11, '#6ee7b7')
          + e(32, 26, 6, 3.4, '#34d399')
          + eye(27.6, 19, 2.9) + eye(36.4, 19, 2.9);
      },
    },
    {
      id: 'horse', name: 'Horse', trait: 'Free-spirited and generous', color: '#a97142',
      art: function () {
        // Head-on, and long: the giveaway is the muzzle, so the face is built
        // as a tapering wedge rather than the round head every other animal
        // here has - side-on it just read as a brown dog.
        return p('M20 14c-2-6 0-10 3-11 2 4 1.6 8-.4 11zM44 14c2-6 0-10-3-11-2 4-1.6 8 .4 11z', '#8a5a33')
          + p('M22 20h20l-2.4 22c-.6 5-3.2 8-7.6 8s-7-3-7.6-8z', '#a97142')
          + p('M22 20h20l-.6 5.5H22.6z', '#8a5a33')
          + p('M24 12c3-4 13-4 16 0 1.6 2 2 5 1.6 8H22.4c-.4-3 0-6 1.6-8z', '#8a5a33')
          + e(32, 43, 6.6, 6, '#d9a066')
          + e(29.6, 42, 1.9, 1.5, '#6b4423') + e(34.4, 42, 1.9, 1.5, '#6b4423')
          + eye(25.6, 28, 2.8) + eye(38.4, 28, 2.8);
      },
    },
    {
      id: 'eagle', name: 'Eagle', trait: 'Sharp-eyed and goes its own way', color: '#b45309',
      art: function () {
        // A white head, a dark body and a heavy hooked beak. Without the brow
        // and the hook this is an owl, which is already in the list.
        return p('M4 30c7-9 15-11 22-6-5 7-14 10-22 6zM60 30c-7-9-15-11-22-6 5 7 14 10 22 6z', '#78350f')
          + e(32, 40, 15, 13, '#92400e')
          + c(32, 28, 15, '#f8fafc')
          + p('M18.5 22c4-4 9-5.6 13.5-4.6 4.5-1 9.5.6 13.5 4.6z', '#e2e8f0')
          + eye(25.5, 27, 3.2) + eye(38.5, 27, 3.2)
          + p('M17.5 23.5c3.4-2.6 6.6-3 9.6-1.2l-.6 2.2c-3-1.4-6-1.2-9 .6zM46.5 23.5c-3.4-2.6-6.6-3-9.6-1.2l.6 2.2c3-1.4 6-1.2 9 .6z', '#cbd5e1')
          + p('M32 30c3.4 0 5.6 2.2 5.6 5.2 0 4.4-2.6 8.4-5.6 10.4-3-2-5.6-6-5.6-10.4 0-3 2.2-5.2 5.6-5.2z', '#f59e0b')
          + p('M32 41c1.8 1.6 2.6 3.6 2.2 5.6-1.6.4-3.2-1-3.4-3z', '#d97706');
      },
    },
  ];

  var BY_ID = {};
  for (var i = 0; i < LIST.length; i++) BY_ID[LIST[i].id] = LIST[i];

  // --- Sprite ---------------------------------------------------------------
  // Built lazily and exactly once: the string is assembled on the first call and
  // the <svg> it lives in is reused by every <use> on the page afterwards.
  var spriteInstalled = false;
  function installSprite() {
    if (spriteInstalled || typeof document === 'undefined') return;
    if (document.getElementById(SPRITE_ID)) { spriteInstalled = true; return; }
    var symbols = '';
    for (var i = 0; i < LIST.length; i++) {
      symbols += '<symbol id="tla-' + LIST[i].id + '" viewBox="0 0 64 64">' + LIST[i].art() + '</symbol>';
    }
    var host = document.createElement('div');
    // Not display:none - some engines refuse to resolve <use> into a hidden
    // subtree. Zero-sized and clipped does the same job safely.
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    host.innerHTML = '<svg id="' + SPRITE_ID + '" xmlns="http://www.w3.org/2000/svg">' + symbols + '</svg>';
    (document.body || document.documentElement).appendChild(host);
    spriteInstalled = true;
  }

  // Markup for one icon. Cheap enough to call in a loop - it is a <use>
  // reference, not a copy of the artwork.
  function icon(id, size, cls) {
    if (!BY_ID[id]) return '';
    var s = size || 40;
    return '<svg class="tl-animal-icon' + (cls ? ' ' + cls : '') + '" width="' + s + '" height="' + s
      + '" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><use href="#tla-' + id + '"/></svg>';
  }

  // Localised name / trait, falling back to the English text above when the
  // page has no i18n loaded or the language file predates these keys.
  function key(id) { return id.charAt(0).toUpperCase() + id.slice(1); }
  function name(id) {
    var a = BY_ID[id];
    if (!a) return '';
    var k = 'animal' + key(id);
    if (typeof global.t !== 'function') return a.name;
    var s = global.t(k);
    return s === k ? a.name : s;
  }
  function trait(id) {
    var a = BY_ID[id];
    if (!a) return '';
    var k = 'animal' + key(id) + 'Trait';
    if (typeof global.t !== 'function') return a.trait;
    var s = global.t(k);
    return s === k ? a.trait : s;
  }

  function stored() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      return v && BY_ID[v] ? v : null;
    } catch (err) { return null; }
  }
  function store(id) {
    try {
      if (id && BY_ID[id]) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch (err) { /* private mode - the choice just does not persist */ }
  }

  global.TalkLiveAnimals = {
    list: LIST,
    ids: LIST.map(function (a) { return a.id; }),
    has: function (id) { return !!BY_ID[id]; },
    get: function (id) { return BY_ID[id] || null; },
    color: function (id) { return BY_ID[id] ? BY_ID[id].color : 'var(--accent)'; },
    installSprite: installSprite,
    icon: icon,
    name: name,
    trait: trait,
    stored: stored,
    store: store,
    // One of the set, at random. The pickers all gate something the user is
    // trying to get past, so each of them offers a tap that answers the
    // question without reading twenty options first.
    random: function () { return LIST[Math.floor(Math.random() * LIST.length)].id; },
    STORAGE_KEY: STORAGE_KEY,
  };
}(window));
