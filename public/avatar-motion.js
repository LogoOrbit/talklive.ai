// ============================================================================
// TalkLive - living avatars. Every spirit animal and character has its own
// motion, written here once and played by both apps:
//   - the website wraps the artwork's shapes in groups and animates them with
//     CSS (cheap: transforms only, paused off-screen, off under reduced motion);
//   - android-native/tools/gen-animals.js reads the same table and writes an
//     AnimatedVectorDrawable per avatar, which Android runs off the UI thread.
//
// A motion addresses the artwork's own shapes by index (animals.js and
// characters.js draw each avatar as a flat list of shapes), so the drawing is
// untouched and the still picture is exactly the same face.
//
//   parts: [{ el: '0-1' | [3, 5], o: [x, y] pivot (in the 64x64 box), a: [anim, ...] }]
//   all:   the same, for the whole face (an animal's head, a character's head)
//   eyes:  blink spec [kind, seconds, delay]; eye shapes are found automatically
//          (a dark dot followed by its white glint), or listed in parts
//   fx:    extra pieces that only exist while animated (sparkles, bubbles, notes...)
//
// Animations: [kind, a, b, seconds, delay]
//   rot / tx / ty / sc / sy / op  ease back and forth between a and b
//   twitch, tilt, hop, chat, blink, blink2, slow, rise, tw   keyframed loops (a = amount)
//   spin                                                     steady turn
// Every loop either eases back and forth or starts and ends at rest, so none
// has a visible seam.
// ============================================================================
(function (global) {
  'use strict';

  var A = 'animal', C = 'character';
  // Keyframed loops: [fraction, value] with the value as a multiple of the amount.
  var KEYS = {
    twitch: { p: 'rot', k: [[0, 0], [0.7, 0], [0.75, 1], [0.8, -0.3], [0.86, 0.55], [0.92, 0], [1, 0]] },
    tilt: { p: 'rot', k: [[0, 0], [0.28, 0], [0.4, 1], [0.62, 1], [0.74, 0], [1, 0]] },
    hop: { p: 'ty', k: [[0, 0], [0.55, 0], [0.63, -1], [0.71, 0], [0.76, -0.35], [0.82, 0], [1, 0]] },
    chat: { p: 'ty', k: [[0, 0], [0.08, 1], [0.16, 0], [0.24, 1], [0.32, 0], [0.4, 0.7], [0.48, 0], [1, 0]] },
    blink: { p: 'sy', k: [[0, 1], [0.92, 1], [0.95, 0.1], [0.98, 1], [1, 1]] },
    blink2: { p: 'sy', k: [[0, 1], [0.84, 1], [0.865, 0.1], [0.89, 1], [0.92, 0.1], [0.945, 1], [1, 1]] },
    slow: { p: 'sy', k: [[0, 1], [0.8, 1], [0.86, 0.12], [0.94, 0.12], [0.98, 1], [1, 1]] },
    rise: { p: 'ty', k: [[0, 0], [1, -1]], lin: true },
    fade: { p: 'op', k: [[0, 0], [0.15, 1], [0.7, 0.85], [1, 0]], lin: true },
    tw: { p: 'sc', k: [[0, 0.01], [0.15, 1], [0.3, 0.01], [1, 0.01]] },
  };

  // --- extras that only exist while a face is alive --------------------------
  function star(x, y, r, color) {
    var s = r * 0.32;
    return '<path d="M' + x + ' ' + (y - r) + 'Q' + (x + s) + ' ' + (y - s) + ' ' + (x + r) + ' ' + y + 'Q' + (x + s) + ' ' + (y + s) + ' ' + x + ' ' + (y + r)
      + 'Q' + (x - s) + ' ' + (y + s) + ' ' + (x - r) + ' ' + y + 'Q' + (x - s) + ' ' + (y - s) + ' ' + x + ' ' + (y - r) + 'z" fill="' + color + '"/>';
  }
  function bubble(x, y, r) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#e0f2fe" opacity=".85"/>'; }
  function zed(x, y, s, color) {
    return '<path d="M' + x + ' ' + y + 'h' + s + 'l-' + s + ' ' + s + 'h' + s + '" fill="none" stroke="' + color + '" stroke-width="' + (s * 0.28).toFixed(2) + '" stroke-linecap="round" stroke-linejoin="round"/>';
  }
  function note(x, y, color) {
    return '<path d="M' + x + ' ' + y + 'v-5.6l4.4-1.2v5.4" fill="none" stroke="' + color + '" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>'
      + '<circle cx="' + (x - 1.1) + '" cy="' + y + '" r="1.3" fill="' + color + '"/>';
  }
  function heart(x, y, s, color) {
    return '<path d="M' + x + ' ' + (y + s) + 'C' + (x - s * 1.6) + ' ' + (y - s * 0.2) + ' ' + (x - s * 0.6) + ' ' + (y - s * 1.3) + ' ' + x + ' ' + (y - s * 0.4)
      + 'C' + (x + s * 0.6) + ' ' + (y - s * 1.3) + ' ' + (x + s * 1.6) + ' ' + (y - s * 0.2) + ' ' + x + ' ' + (y + s) + 'z" fill="' + color + '"/>';
  }
  function puff(x, y, r) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#e2e8f0" opacity=".7"/>'; }
  function dot(x, y, r, color) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + color + '"/>'; }

  // Each fx is a list of [svg, pivot, anims]: every piece is its own little part.
  var FX = {
    sparkle: function (pts, colors) {
      return pts.map(function (q, i) { return [star(q[0], q[1], q[2] || 2.4, colors[i % colors.length]), [q[0], q[1]], [['tw', 1, 0, 2.6 + i * 0.4, i * 0.85]]]; });
    },
    bubbles: function (pts) {
      return pts.map(function (q, i) { return [bubble(q[0], q[1], q[2] || 1.1), [q[0], q[1]], [['rise', 14, 0, 3.2 + i * 0.5, i * 1.1], ['fade', 1, 0, 3.2 + i * 0.5, i * 1.1]]]; });
    },
    zzz: function (pts, color) {
      return pts.map(function (q, i) { return [zed(q[0], q[1], q[2] || 3, color || '#e2e8f0'), [q[0], q[1]], [['rise', 9, 0, 4.2, i * 2.1], ['fade', 1, 0, 4.2, i * 2.1]]]; });
    },
    notes: function (pts, color) {
      return pts.map(function (q, i) { return [note(q[0], q[1], color || '#fde047'), [q[0], q[1]], [['rise', 10, 0, 3, i * 1.5], ['fade', 1, 0, 3, i * 1.5]]]; });
    },
    hearts: function (pts, color) {
      return pts.map(function (q, i) { return [heart(q[0], q[1], q[2] || 1.8, color || '#fb7185'), [q[0], q[1]], [['rise', 10, 0, 3.6, i * 1.8], ['fade', 1, 0, 3.6, i * 1.8]]]; });
    },
    smoke: function (pts) {
      return pts.map(function (q, i) { return [puff(q[0], q[1], q[2] || 1.4), [q[0], q[1]], [['rise', 8, 0, 2.6, i * 1.3], ['fade', 1, 0, 2.6, i * 1.3]]]; });
    },
    // Little lights circling the face: each dot rides an invisible wheel.
    orbit: function (r, cy, colors, secs) {
      return colors.map(function (col, i) {
        return [dot(32 + r, cy, 1.1, col), [32, cy], [['spin', 0, 360, secs || 6, -(secs || 6) * i / colors.length]]];
      });
    },
  };

  // --- the motions ---------------------------------------------------------------
  var M = {
    // ---- animals -------------------------------------------------------------
    lion: { all: { o: [32, 40], a: [['sc', 1, 1.025, 3.6]] }, eyes: ['blink', 5.2, 1.1],
      parts: [{ el: '0-11', o: [32, 34], a: [['rot', -2.5, 2.5, 7.5]] },
        { el: [12], o: [16, 25], a: [['twitch', -12, 0, 5.3, 0.4]] }, { el: [13], o: [48, 25], a: [['twitch', 12, 0, 6.1, 2.7]] }] },
    fox: { all: { o: [32, 54], a: [['tilt', 6, 0, 6.4, 1.2]] }, eyes: ['blink2', 4.2, 0.3],
      parts: [{ el: '0-1', o: [19, 26], a: [['twitch', -14, 0, 3.4, 0.2]] }, { el: '2-3', o: [45, 26], a: [['twitch', 14, 0, 3.9, 1.9]] },
        { el: [6], o: [32, 43], a: [['sc', 1, 1.12, 0.9]] }] },
    cat: { all: { o: [32, 52], a: [['tilt', -8, 0, 7.2, 2]] }, eyes: ['slow', 5.6, 0.8],
      parts: [{ el: '0-1', o: [18, 29], a: [['twitch', -10, 0, 4.6, 0.5]] }, { el: '2-3', o: [46, 29], a: [['twitch', 10, 0, 6.3, 3.1]] },
        { el: [5], o: [32, 39], a: [['sy', 1, 0.92, 1.3]] }] },
    dog: { all: { o: [32, 50], a: [['ty', 0, -0.9, 0.55]] }, eyes: ['blink', 4, 0.6],
      parts: [{ el: [0], o: [13, 25], a: [['rot', -7, 7, 1.6]] }, { el: [1], o: [51, 25], a: [['rot', 7, -7, 1.6, 0.25]] },
        { el: [6], o: [32, 48.4], a: [['sy', 1, 1.3, 0.55]] }] },
    panda: { all: { o: [32, 56], a: [['rot', -2.5, 2.5, 6.2]] }, eyes: null,
      parts: [{ el: [0], o: [14, 18.5], a: [['sc', 0.94, 1.05, 3.1]] }, { el: [1], o: [50, 18.5], a: [['sc', 1.05, 0.94, 3.1]] },
        { el: '5-6', o: [23.5, 34], a: [['slow', 1, 0, 6.4, 1]] }, { el: '7-8', o: [40.5, 34], a: [['slow', 1, 0, 6.4, 1]] }] },
    tiger: { all: { o: [32, 42], a: [['sc', 1, 1.03, 2.4]] }, eyes: ['blink', 4.4, 1.5],
      parts: [{ el: '0-1', o: [16, 25], a: [['twitch', -16, 0, 3.8, 0.6]] }, { el: '2-3', o: [48, 25], a: [['twitch', 16, 0, 5.2, 2.2]] },
        { el: [6], o: [32, 38], a: [['sc', 1, 1.04, 2.4]] }] },
    wolf: { all: { o: [32, 52], a: [['rot', -1.5, 1.5, 9], ['sc', 1, 1.02, 3.4]] }, eyes: ['blink', 5, 2],
      parts: [{ el: '0-1', o: [20, 26], a: [['rot', -4, 2, 4.6]] }, { el: '2-3', o: [44, 26], a: [['rot', 4, -2, 4.6, 0.9]] }] },
    bear: { all: { o: [32, 56], a: [['rot', -2.5, 2.5, 4.8]] }, eyes: ['blink', 5.4, 0.2],
      parts: [{ el: '0-1', o: [14, 18.5], a: [['sc', 1, 1.08, 2.4]] }, { el: '2-3', o: [50, 18.5], a: [['sc', 1.08, 1, 2.4]] }] },
    rabbit: { all: { o: [32, 52], a: [['sc', 1, 1.02, 1.8]] }, eyes: ['blink', 3.6, 0.9],
      parts: [{ el: '0-1', o: [23, 27], a: [['twitch', -9, 0, 2.8, 0.3]] }, { el: '2-3', o: [41, 27], a: [['twitch', 9, 0, 3.6, 1.2]] },
        { el: [5], o: [32, 41], a: [['sy', 1, 0.85, 0.5]] }, { el: [6], o: [32, 42.5], a: [['sc', 1, 1.18, 0.5]] }] },
    owl: { all: { o: [32, 44], a: [['tilt', 10, 0, 8.4, 1]] }, eyes: ['slow', 4.6, 0.4],
      parts: [{ el: [0], o: [22, 18], a: [['twitch', -10, 0, 5.4, 0.8]] }, { el: [1], o: [42, 18], a: [['twitch', 10, 0, 5.4, 0.9]] },
        { el: [3], o: [32, 44], a: [['sc', 1, 1.05, 2.2]] }] },
    penguin: { all: { o: [32, 56], a: [['rot', -5, 5, 1.6]] }, eyes: ['blink', 4, 1.4],
      parts: [{ el: [10], o: [17, 31], a: [['rot', 0, -16, 0.8]] }, { el: [11], o: [47, 31], a: [['rot', 0, 16, 0.8, 0.4]] }] },
    dolphin: { all: { o: [30, 30], a: [['ty', -1.6, 1.6, 2.2], ['rot', -4, 4, 4.4]] }, eyes: ['blink', 4.8, 0.7],
      parts: [{ el: [1], o: [10, 28], a: [['rot', -9, 9, 1.1]] }, { el: [2], o: [33, 16], a: [['rot', -4, 4, 2.2, 0.5]] }],
      fx: FX.bubbles([[54, 22, 1.2], [58, 18, 0.8], [52, 16, 1]]) },
    elephant: { all: { o: [32, 52], a: [['rot', -1.5, 1.5, 6]] }, eyes: ['slow', 5.6, 2.2],
      parts: [{ el: [0, 2], o: [21, 30], a: [['rot', -6, 4, 2.6]] }, { el: [1, 3], o: [43, 30], a: [['rot', 6, -4, 2.6, 0.3]] },
        { el: '5-7', o: [32, 42], a: [['rot', -7, 7, 3.2]] }] },
    koala: { all: { o: [32, 54], a: [['rot', -3, 3, 5]] }, eyes: ['slow', 3.4, 0.5],
      parts: [{ el: '0-1', o: [12, 24], a: [['sc', 0.96, 1.05, 3.4]] }, { el: '2-3', o: [52, 24], a: [['sc', 1.05, 0.96, 3.4]] }],
      fx: FX.zzz([[47, 16, 3], [51, 10, 2.4]], '#e2e8f0') },
    monkey: { all: { o: [32, 50], a: [['hop', 2.4, 0, 1.5]] }, eyes: ['blink2', 3, 0.4],
      parts: [{ el: '0-1', o: [17, 32], a: [['rot', -9, 9, 0.9]] }, { el: '2-3', o: [47, 32], a: [['rot', 9, -9, 0.9]] },
        { el: [8], o: [32, 46], a: [['sy', 1, 1.25, 0.45]] }] },
    frog: { all: { o: [32, 54], a: [['ty', 0, -0.8, 1.7]] }, eyes: null,
      parts: [{ el: [0, 2, 4], o: [19, 18], a: [['ty', -1, 0.6, 1.7], ['blink', 1, 0, 3.4, 0.6]] },
        { el: [1, 3, 5], o: [45, 18], a: [['ty', -1, 0.6, 1.7, 0.2], ['blink', 1, 0, 3.4, 0.6]] },
        { el: [7], o: [32, 42], a: [['sc', 1, 1.09, 0.9]] }] },
    deer: { all: { o: [32, 52], a: [['rot', -2, 2, 7]] }, eyes: ['slow', 5, 1.7],
      parts: [{ el: [1], o: [20, 28], a: [['twitch', -14, 0, 4.4, 0.4]] }, { el: [2], o: [44, 28], a: [['twitch', 14, 0, 5.8, 2.6]] }] },
    turtle: { all: { o: [32, 50], a: [['rot', -1, 1, 8]] }, eyes: ['slow', 6, 1],
      parts: [{ el: [0], o: [17, 45], a: [['rot', -12, 10, 2.4]] }, { el: [1], o: [47, 45], a: [['rot', 12, -10, 2.4, 1.2]] },
        { el: [2], o: [25, 54], a: [['rot', -8, 8, 2.4, 0.6]] }, { el: [3], o: [39, 54], a: [['rot', 8, -8, 2.4, 1.8]] },
        { el: '7-12', o: [32, 30], a: [['ty', 1.2, -1, 3.6]] }] },
    horse: { all: { o: [32, 48], a: [['rot', -3, 3, 3.6]] }, eyes: ['blink', 4.8, 2.3],
      parts: [{ el: [0], o: [32, 14], a: [['twitch', -8, 0, 4.2, 1]] }, { el: '5-6', o: [32, 42], a: [['sc', 1, 1.2, 1.4]] }] },
    eagle: { all: { o: [32, 44], a: [['tilt', -7, 0, 6, 0.5]] }, eyes: ['blink', 6, 3],
      parts: [{ el: [0], o: [32, 28], a: [['ty', -1.2, 1.2, 1.4]] }, { el: [8], o: [32, 23], a: [['ty', 0, -0.8, 3]] }] },
    unicorn: { all: { o: [32, 50], a: [['ty', -1.2, 1.2, 3.4]] }, eyes: ['blink', 4, 1.2],
      parts: [{ el: '1-3', o: [18, 30], a: [['rot', -5, 5, 3]] }, { el: '6-7', o: [32, 21], a: [['rot', -2, 2, 3.4, 0.5]] }],
      fx: FX.sparkle([[45, 10, 2.6], [52, 22, 1.8], [12, 14, 2.2], [40, 4, 1.6]], ['#fde68a', '#f9a8d4', '#c4b5fd']) },
    dragon: { all: { o: [32, 44], a: [['sc', 1, 1.035, 2.2]] }, eyes: ['blink', 4.4, 0.8],
      parts: [{ el: [7], o: [24.5, 32], a: [['op', 0.8, 1, 1.2]] }, { el: [10], o: [39.5, 32], a: [['op', 0.8, 1, 1.2, 0.3]] },
        { el: [0], o: [32, 20], a: [['rot', -2, 2, 4.4]] }],
      fx: FX.smoke([[28.4, 39, 1.3], [35.6, 39, 1.1]]) },
    shark: { all: { o: [32, 40], a: [['tx', -1.2, 1.2, 3], ['rot', -3, 3, 6]] }, eyes: ['blink', 7, 2],
      parts: [{ el: [0], o: [32, 13], a: [['rot', -7, 7, 1.4]] }, { el: '3-4', o: [32, 40], a: [['sy', 1, 1.14, 2.4]] }],
      fx: FX.bubbles([[50, 44, 1.1], [54, 36, 0.8], [12, 40, 0.9]]) },
    octopus: { all: { o: [32, 40], a: [['ty', -1.4, 1.4, 2.6]] }, eyes: ['blink', 3.6, 0.5],
      parts: [{ el: [0], o: [32, 44], a: [['sx', 0.96, 1.05, 1.6], ['sy', 1.04, 0.95, 1.6, 0.4]] }, { el: '2-4', o: [32, 15], a: [['op', 0.55, 1, 2]] }],
      fx: FX.bubbles([[52, 12, 1.2], [56, 6, 0.8]]) },
    parrot: { all: { o: [32, 50], a: [['tilt', -8, 0, 3.2, 0.4]] }, eyes: ['blink2', 3.2, 1],
      parts: [{ el: [0], o: [32, 17], a: [['rot', -11, 11, 1.4]] }, { el: [11], o: [32, 41], a: [['chat', 1.4, 0, 2.8]] }],
      fx: FX.notes([[50, 18], [54, 12]], '#fde047') },
    raccoon: { all: { o: [32, 52], a: [['tilt', 9, 0, 5, 1.6]] }, eyes: ['blink', 3.4, 0.2],
      parts: [{ el: '0-1', o: [17.5, 24], a: [['twitch', -10, 0, 4, 0.3]] }, { el: '2-3', o: [46.5, 24], a: [['twitch', 10, 0, 4.8, 2]] },
        { el: [8], o: [32, 40.6], a: [['sc', 1, 1.2, 0.5]] }] },
    sloth: { all: { o: [32, 56], a: [['rot', -4.5, 4.5, 7.5]] }, eyes: ['slow', 4, 0.6],
      fx: FX.zzz([[46, 14, 3.2], [51, 8, 2.4]], '#f5f5f4') },
    pig: { all: { o: [32, 54], a: [['rot', -2.5, 2.5, 3]] }, eyes: ['blink', 4, 1.1],
      parts: [{ el: [0], o: [32, 20], a: [['rot', -5, 5, 2]] }, { el: '2-3', o: [32, 39], a: [['op', 0.55, 1, 2.5]] },
        { el: '4-6', o: [32, 42], a: [['sc', 1, 1.09, 0.7]] }],
      fx: FX.hearts([[48, 18, 1.8], [53, 12, 1.4]], '#fb7185') },
    giraffe: { all: { o: [32, 60], a: [['rot', -3, 3, 6]] }, eyes: ['slow', 5, 0.9],
      parts: [{ el: '0-2', o: [32, 17], a: [['rot', -5, 5, 2.8]] }, { el: [3], o: [32, 25], a: [['twitch', 8, 0, 3.8, 1.4]] }] },
    hedgehog: { all: { o: [32, 52], a: [['hop', 1.4, 0, 2.6, 0.4]] }, eyes: ['blink', 3.4, 0.5],
      parts: [{ el: [0], o: [32, 40], a: [['sc', 1, 1.05, 1.6]] }, { el: '2-3', o: [32, 43.6], a: [['op', 0.5, 1, 2.2]] },
        { el: [4], o: [32, 44.6], a: [['sc', 1, 1.2, 0.5]] }] },

    // ---- characters (index 0 is the round tile, 1 the shoulders) ---------------
    wizard: { kind: C, all: { el: '2-12', o: [32, 44], a: [['rot', -2, 2, 5]] }, eyes: ['slow', 4.6, 0.4],
      parts: [{ el: [1], o: [32, 56], a: [['sy', 1, 1.02, 3]] }, { el: '7-8', o: [32, 34], a: [['rot', -3, 3, 3.4]] },
        { el: '10-12', o: [32, 22], a: [['rot', -4, 4, 4.2, 0.6]] }],
      fx: FX.orbit(19, 34, ['#fde047', '#c4b5fd', '#67e8f9'], 7) },
    pirate: { kind: C, all: { el: '2-14', o: [32, 44], a: [['rot', -3.5, 3.5, 3.2]] }, eyes: ['blink', 4.4, 1],
      parts: [{ el: [9], o: [20.5, 31.6], a: [['rot', -18, 18, 1.6]] }, { el: '10-14', o: [32, 22], a: [['rot', -2, 2, 3.2, 0.8]] }] },
    detective: { kind: C, all: { el: '3-11', o: [32, 44], a: [['tilt', -6, 0, 6, 1]] }, eyes: ['blink', 4, 0.8],
      parts: [{ el: '12-13', o: [50, 50], a: [['rot', -9, 9, 2.6]] }] },
    robot: { kind: C, all: { el: '2-11', o: [32, 44], a: [['ty', 0, -1, 1.8]] }, eyes: null,
      parts: [{ el: '3-4', o: [32, 16], a: [['rot', -12, 12, 1.2]] }, { el: [5], o: [17.5, 28], a: [['sc', 0.85, 1.1, 0.9]] }, { el: [6], o: [46.5, 28], a: [['sc', 1.1, 0.85, 0.9]] },
        { el: [9], o: [27, 25.5], a: [['blink', 1, 0, 3.8, 0.2]] }, { el: [10], o: [37, 25.5], a: [['blink', 1, 0, 3.8, 0.2]] },
        { el: [11], o: [32, 35], a: [['op', 0.5, 1, 0.7]] }],
      fx: FX.sparkle([[32, 6, 1.6]], ['#fca5a5']) },
    ninja: { kind: C, all: { el: '2-10', o: [32, 44], a: [['sc', 1, 1.02, 2]] }, eyes: ['blink', 5, 2.4],
      parts: [{ el: [10], o: [45, 22], a: [['rot', -14, 14, 0.9]] }, { el: [8], o: [32, 27], a: [['ty', 0, -0.6, 3]] }] },
    hero: { kind: C, all: { el: '3-8', o: [32, 44], a: [['ty', 0.6, -0.6, 2]] }, eyes: null,
      parts: [{ el: [2], o: [32, 50], a: [['sc', 1, 1.14, 1.8]] }, { el: [6], o: [26, 30.5], a: [['blink', 1, 0, 4.6, 1]] }, { el: [7], o: [38, 30.5], a: [['blink', 1, 0, 4.6, 1]] },
        { el: [4], o: [32, 20], a: [['rot', -3, 3, 2.4]] }],
      fx: FX.sparkle([[48, 14, 2], [14, 20, 1.6]], ['#fde047']) },
    cowboy: { kind: C, all: { el: '3-11', o: [32, 44], a: [['rot', -2.5, 2.5, 3.6]] }, eyes: ['blink', 4.6, 1.7],
      parts: [{ el: '9-11', o: [32, 22], a: [['rot', -4, 4, 2.8, 0.5]] }, { el: [2], o: [32, 43], a: [['rot', -6, 6, 1.8]] }, { el: [8], o: [32, 36], a: [['sy', 1, 0.86, 1.2]] }] },
    vampire: { kind: C, all: { el: '3-11', o: [32, 44], a: [['rot', -2, 2, 4.4]] }, eyes: ['slow', 5.2, 0.9],
      parts: [{ el: [2], o: [32, 44], a: [['sy', 1, 1.05, 3]] }, { el: [9], o: [32, 27], a: [['ty', 0.4, -0.8, 3.2]] }, { el: [11], o: [32, 37], a: [['op', 0.6, 1, 1.6]] }],
      fx: FX.sparkle([[12, 18, 1.8], [52, 14, 1.4]], ['#f0abfc', '#c4b5fd']) },
    astronaut: { kind: C, all: { el: '5-11', o: [32, 44], a: [['ty', -1.2, 1.2, 3.6], ['rot', -2, 2, 5]] }, eyes: null,
      parts: [{ el: [1], o: [12, 16], a: [['op', 0.2, 1, 1.6]] }, { el: [2], o: [52, 12], a: [['op', 1, 0.2, 2.1]] },
        { el: [3], o: [54, 34], a: [['op', 0.3, 1, 1.3, 0.4]] }, { el: [4], o: [9, 36], a: [['op', 1, 0.25, 1.8, 0.2]] },
        { el: [10], o: [29, 25], a: [['op', 0.45, 1, 2.4], ['tx', -0.6, 0.8, 2.4]] }, { el: [11], o: [39, 35], a: [['op', 0.3, 1, 1.2]] }] },
    zombie: { kind: C, all: { el: '3-10', o: [32, 44], a: [['twitch', 9, 0, 2.6, 0.3], ['rot', -2, 2, 3.4]] }, eyes: ['blink', 6, 2],
      parts: [{ el: [10], o: [32, 37.5], a: [['ty', 0, 0.8, 1.2]] }, { el: [2], o: [32, 50], a: [['rot', -3, 3, 2.2]] }] },
    alien: { kind: C, all: { el: '2-9', o: [32, 44], a: [['ty', -1.4, 1.4, 2.6]] }, eyes: null,
      parts: [{ el: '2-4', o: [32, 14], a: [['rot', -11, 11, 1.4]] }, { el: [6], o: [32, 29], a: [['slow', 1, 0, 4.4, 0.6]] }],
      fx: FX.sparkle([[22.5, 4, 1.4], [41.5, 4, 1.4]], ['#bef264']) },
    knight: { kind: C, all: { el: '3-9', o: [32, 44], a: [['sc', 1, 1.02, 2.6]] }, eyes: null,
      parts: [{ el: [2], o: [33, 13], a: [['rot', -9, 9, 1.8]] }, { el: '6-9', o: [37.5, 36.5], a: [['op', 0.6, 1, 2.2]] }] },
    queen: { kind: C, all: { el: '4-12', o: [32, 44], a: [['rot', -2, 2, 4.4]] }, eyes: ['slow', 5, 1.3],
      parts: [{ el: [1], o: [32, 30], a: [['sy', 1, 1.025, 3.2]] }, { el: [3], o: [32, 47], a: [['op', 0.65, 1, 1.8]] }],
      fx: FX.sparkle([[32, 9, 2.2], [24, 12, 1.4], [40, 12, 1.4]], ['#fef08a', '#ffffff']) },
    warrior: { kind: C, all: { el: '6-15', o: [32, 44], a: [['sc', 1, 1.025, 2.2]] }, eyes: ['blink', 4.8, 0.5],
      parts: [{ el: '2-5', o: [21, 50], a: [['rot', -4, 4, 1.8]] }, { el: [12], o: [32, 33], a: [['op', 0.6, 1, 1.6]] }] },
    chef: { kind: C, all: { el: '3-12', o: [32, 44], a: [['rot', -2, 2, 3.4]] }, eyes: ['blink2', 3.8, 1.2],
      parts: [{ el: '9-12', o: [32, 21], a: [['sy', 1, 1.05, 2.4], ['rot', -3, 3, 3.4, 0.6]] }, { el: [8], o: [32, 36], a: [['rot', -5, 5, 1.2]] }],
      fx: FX.smoke([[45, 8, 1.4], [49, 12, 1.1], [43, 14, 1]]) },
    doctor: { kind: C, all: { el: '5-12', o: [32, 44], a: [['tilt', 5, 0, 5.4, 0.8]] }, eyes: ['blink', 4.2, 0.3],
      parts: [{ el: '3-4', o: [25, 44], a: [['rot', -6, 6, 2]] }, { el: [12], o: [32, 19.5], a: [['op', 0.6, 1, 1.4]] }] },
    scientist: { kind: C, all: { el: '8-16', o: [32, 44], a: [['tilt', -6, 0, 4.4, 1]] }, eyes: ['blink2', 3.4, 0.6],
      parts: [{ el: '3-7', o: [32, 22], a: [['sc', 1, 1.06, 1.4]] }, { el: '9-10', o: [32, 30], a: [['op', 0.75, 1, 1.1]] }],
      fx: FX.sparkle([[12, 12, 1.8], [52, 10, 2]], ['#67e8f9', '#fde047']) },
    artist: { kind: C, all: { el: '3-11', o: [32, 44], a: [['rot', -2.5, 2.5, 3.8]] }, eyes: ['blink', 4, 1.6],
      parts: [{ el: '10-11', o: [30, 20], a: [['rot', -7, 7, 2.6]] }, { el: '12-16', o: [46, 50], a: [['rot', -6, 6, 2.2]] }],
      fx: FX.sparkle([[12, 14, 1.8], [50, 8, 1.6], [56, 26, 1.4]], ['#f472b6', '#60a5fa', '#4ade80']) },
    rockstar: { kind: C, all: { el: '3-8', o: [32, 44], a: [['rot', -5, 5, 0.65]] }, eyes: null,
      parts: [{ el: [2], o: [30, 49], a: [['op', 0.4, 1, 0.35]] }],
      fx: FX.notes([[50, 16], [12, 20], [54, 8]], '#facc15') },
    firefighter: { kind: C, all: { el: '3-11', o: [32, 44], a: [['rot', -2, 2, 3.2]] }, eyes: ['blink', 4.4, 0.9],
      parts: [{ el: '9-11', o: [32, 21], a: [['rot', -3, 3, 2.4, 0.4]] }, { el: [2], o: [32, 50.5], a: [['op', 0.55, 1, 0.9]] }],
      fx: FX.sparkle([[32, 14, 1.4]], ['#fef9c3']) },
    gamer: { kind: C, all: { el: '3-14', o: [32, 44], a: [['ty', 0, -1, 0.8]] }, eyes: ['blink', 3.2, 0.3],
      parts: [{ el: [12], o: [32, 31.5], a: [['op', 0.3, 1, 0.8]] }, { el: '13-14', o: [20, 38], a: [['rot', -5, 5, 1.6]] }] },
    king: { kind: C, all: { el: '6-16', o: [32, 44], a: [['rot', -1.8, 1.8, 5]] }, eyes: ['slow', 5.4, 2],
      parts: [{ el: '11-12', o: [32, 36], a: [['rot', -2.5, 2.5, 3.4]] }, { el: '13-16', o: [32, 16], a: [['rot', -3, 3, 3]] }],
      fx: FX.sparkle([[32, 9, 2.2], [24, 12, 1.4], [40, 12, 1.4]], ['#fef08a', '#bfdbfe']) },
    viking: { kind: C, all: { el: '2-13', o: [32, 44], a: [['sc', 1, 1.025, 2.6]] }, eyes: ['blink', 5, 1.3],
      parts: [{ el: '7-9', o: [32, 34], a: [['rot', -3.5, 3.5, 2.8]] }, { el: [10], o: [17, 22], a: [['rot', -3, 3, 3.6]] }] },
    witch: { kind: C, all: { el: '3-12', o: [32, 44], a: [['rot', -2.5, 2.5, 3.8]] }, eyes: ['blink2', 4.2, 0.7],
      parts: [{ el: [1], o: [32, 30], a: [['sy', 1, 1.03, 3]] }, { el: '9-12', o: [32, 21], a: [['rot', -5, 5, 2.6, 0.4]] }],
      fx: FX.orbit(20, 32, ['#c084fc', '#86efac'], 6) },
    elf: { kind: C, all: { el: '3-12', o: [32, 44], a: [['tilt', 6, 0, 5.2, 0.7]] }, eyes: ['blink', 3.8, 1.5],
      parts: [{ el: [1], o: [32, 30], a: [['sy', 1, 1.03, 2.8]] }, { el: [12], o: [32, 23], a: [['op', 0.5, 1, 1.4]] }],
      fx: FX.sparkle([[10, 16, 1.6], [54, 18, 1.8], [48, 6, 1.4]], ['#bbf7d0', '#fef08a']) },
    clown: { kind: C, all: { el: '6-17', o: [32, 44], a: [['hop', 1.8, 0, 1.6]] }, eyes: ['blink2', 3, 0.4],
      parts: [{ el: [6, 8], o: [21, 22], a: [['sc', 1, 1.1, 0.8]] }, { el: [7, 9], o: [43, 22], a: [['sc', 1.1, 1, 0.8]] },
        { el: [17], o: [32, 33.5], a: [['sc', 1, 1.18, 1.2]] }, { el: '2-5', o: [32, 46], a: [['rot', -3, 3, 1.6]] }] },
  };

  // --- compile -----------------------------------------------------------------
  function range(el) {
    if (Array.isArray(el)) return el;
    var m = String(el).split('-');
    var out = [];
    for (var i = +m[0]; i <= +(m[1] == null ? m[0] : m[1]); i++) out.push(i);
    return out;
  }
  // The artwork as its list of shapes (each helper in animals.js / characters.js writes one).
  function shapes(svg) {
    return String(svg).match(/<(circle|ellipse|path)\s[^>]*?\/>/g) || [];
  }
  function attr(s, k) { var m = s.match(new RegExp(' ' + k + '="([^"]*)"')); return m ? m[1] : null; }
  // A dark pupil followed by its white glint: the eye() helper's two shapes.
  function findEyes(list, taken) {
    var eyes = [];
    for (var i = 0; i + 1 < list.length; i++) {
      if (taken[i] || taken[i + 1]) continue;
      var a = list[i], b = list[i + 1];
      if (/fill="#1f2637"/i.test(a) && /^<(circle|ellipse)/.test(a) && /fill="#ffffff"/i.test(b) && /^<circle/.test(b)) {
        eyes.push({ el: [i, i + 1], o: [+attr(a, 'cx'), +attr(a, 'cy')] });
        i++;
      }
    }
    return eyes;
  }

  /**
   * The motion of one avatar as a tree both apps can play:
   *   { all: { el, o, a } | null, groups: [{ el:[indices], o, a:[anims] }], fx: [{ svg, o, a }] }
   * Shapes in no group are drawn as they are, in their original order.
   */
  function plan(id, svg) {
    var m = M[id];
    if (!m) return null;
    var list = shapes(svg);
    var taken = {};
    var groups = (m.parts || []).map(function (p) {
      var el = range(p.el).filter(function (i) { return i < list.length; });
      el.forEach(function (i) { taken[i] = true; });
      return { el: el, o: p.o, a: p.a };
    });
    if (m.eyes) {
      findEyes(list, taken).forEach(function (e) {
        e.el.forEach(function (i) { taken[i] = true; });
        groups.push({ el: e.el, o: e.o, a: [[m.eyes[0], 1, 0, m.eyes[1], m.eyes[2] || 0]] });
      });
    }
    var all = m.all ? { el: m.all.el ? range(m.all.el) : null, o: m.all.o, a: m.all.a } : null;
    var fx = (m.fx || []).map(function (f) { return { svg: f[0], o: f[1], a: f[2] }; });
    return { list: list, all: all, groups: groups, fx: fx };
  }

  // --- website: CSS keyframes and the animated markup ---------------------------
  var PROP = { rot: 'rotate', tx: 'translateX', ty: 'translateY', sc: 'scale', sx: 'scaleX', sy: 'scaleY' };
  function cssValue(p, v) {
    if (p === 'op') return 'opacity:' + v;
    var unit = p === 'rot' ? 'deg' : p === 'tx' || p === 'ty' ? 'px' : '';
    return 'transform:' + PROP[p] + '(' + (+v).toFixed(3) + unit + ')';
  }
  var cssDone = {};
  var sheet = null;
  function rule(css) {
    if (typeof document === 'undefined') return;
    if (!sheet) {
      var st = document.createElement('style');
      st.id = 'tlMotionCss';
      st.textContent = '.tlm g{transform-box:view-box}'
        + '.tlm.tlm-off g{animation-play-state:paused!important}'
        + '@media (prefers-reduced-motion:reduce){.tlm g{animation:none!important}.tlm .tlm-fx{display:none}}';
      document.head.appendChild(st);
      sheet = st;
    }
    sheet.textContent += css;
  }
  // One keyframes rule per distinct animation, shared by every face that uses it.
  function animClass(a) {
    var kind = a[0];
    var key = 'tlm-' + a.join('_').replace(/[^a-z0-9_-]/gi, function (c) { return c === '.' ? 'p' : 'm'; });
    if (!cssDone[key]) {
      cssDone[key] = true;
      var dur = a[3], delay = a[4] || 0, css;
      if (KEYS[kind]) {
        var K = KEYS[kind];
        css = '@keyframes ' + key + '{' + K.k.map(function (f) {
          var v = K.p === 'sy' || K.p === 'sc' || K.p === 'op' ? (kind === 'tw' || kind === 'fade' || /blink|slow/.test(kind) ? f[1] : 1 + (f[1] - 1) * a[1]) : f[1] * a[1];
          return (f[0] * 100).toFixed(1) + '%{' + cssValue(K.p, v) + '}';
        }).join('') + '}'
          + '.tlm .' + key + '{animation:' + key + ' ' + dur + 's ' + (K.lin ? 'linear' : 'ease-in-out') + ' ' + (-delay) + 's infinite}';
      } else if (kind === 'spin') {
        css = '@keyframes ' + key + '{from{transform:rotate(' + a[1] + 'deg)}to{transform:rotate(' + a[2] + 'deg)}}'
          + '.tlm .' + key + '{animation:' + key + ' ' + dur + 's linear ' + (-Math.abs(delay)) + 's infinite}';
      } else {
        css = '@keyframes ' + key + '{from{' + cssValue(kind, a[1]) + '}to{' + cssValue(kind, a[2]) + '}}'
          + '.tlm .' + key + '{animation:' + key + ' ' + dur + 's ease-in-out ' + (-delay) + 's infinite alternate}';
      }
      rule(css);
    }
    return key;
  }
  function wrap(inner, o, anims) {
    var out = inner;
    for (var i = anims.length - 1; i >= 0; i--) {
      out = '<g class="' + animClass(anims[i]) + '" style="transform-origin:' + o[0] + 'px ' + o[1] + 'px">' + out + '</g>';
    }
    return out;
  }

  /** The face's shapes, regrouped and wrapped in their animations, for an inline <svg>. */
  function animatedSvg(id, svg) {
    var pl = plan(id, svg);
    if (!pl) return null;
    var list = pl.list, owner = {}, first = {};
    pl.groups.forEach(function (g, gi) { g.el.forEach(function (i) { owner[i] = gi; }); first[gi] = Math.min.apply(null, g.el); });
    var allSet = pl.all && pl.all.el ? {} : null;
    if (allSet) pl.all.el.forEach(function (i) { allSet[i] = true; });
    var before = '', inside = '', emitted = {};
    for (var i = 0; i < list.length; i++) {
      var piece;
      if (owner[i] != null) {
        var gi = owner[i];
        if (emitted[gi]) continue;
        emitted[gi] = true;
        piece = wrap(pl.groups[gi].el.map(function (k) { return list[k]; }).join(''), pl.groups[gi].o, pl.groups[gi].a);
      } else piece = list[i];
      if (allSet && !allSet[i]) before += piece; else inside += piece;
    }
    var face = pl.all ? before + wrap(inside, pl.all.o, pl.all.a) : before + inside;
    var fx = pl.fx.map(function (f) { return wrap(f.svg, f.o, f.a); }).join('');
    return face + (fx ? '<g class="tlm-fx">' + fx + '</g>' : '');
  }

  // Faces off-screen stop moving; they pick up where they were when they come back.
  var io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { e.target.classList.toggle('tlm-off', !e.isIntersecting); });
  }) : null;
  function watch(root) {
    if (!io || !root || !root.querySelectorAll) return;
    Array.prototype.forEach.call(root.querySelectorAll('svg.tlm:not([data-tlm])'), function (s) { s.setAttribute('data-tlm', '1'); io.observe(s); });
  }
  if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
    new MutationObserver(function () { watch(document.body); }).observe(document.documentElement, { childList: true, subtree: true });
  }

  global.TalkLiveMotion = { motions: M, keys: KEYS, plan: plan, animatedSvg: animatedSvg, has: function (id) { return !!M[id]; }, watch: watch };
}(typeof window !== 'undefined' ? window : globalThis));
