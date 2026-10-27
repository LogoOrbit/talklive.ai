/* TalkGuard: TalkLive's own small text-safety model.
 *
 * A logistic-regression classifier over hashed word, word-pair and letter
 * features, with three heads: abuse (harassment, hate, threats), sexual and
 * spam (scams, money, promotions). It is trained on the server - from a
 * starter set, then from the owner's moderation decisions - and the weights
 * are served at /talkguard/model.json (tens of KB), so it runs free in the
 * browser and on the server alike. This one file is the featurizer and the
 * scorer for both, so the two can never disagree.
 */
(function (root) {
  'use strict';

  var DIM = 16384;
  var HEADS = ['abuse', 'sexual', 'spam'];
  var LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i', '8': 'b' };

  function normalize(text) {
    var s = String(text || '').toLowerCase().slice(0, 600);
    s = s.replace(/[0134578@$!]/g, function (c) { return LEET[c]; });
    s = s.replace(/[^a-z\s]/g, ' ');
    // "fuuuuck" -> "fuck", "sooo" -> "so"; doubled letters are kept.
    s = s.replace(/([a-z])\1{2,}/g, '$1');
    return s.replace(/\s+/g, ' ').trim();
  }

  // Words, with runs of single letters joined back up: "k y s" -> "kys".
  function tokens(text) {
    var raw = normalize(text).split(' ');
    var out = [];
    var run = '';
    for (var i = 0; i < raw.length; i++) {
      var w = raw[i];
      if (!w) continue;
      if (w.length === 1 && w !== 'a' && w !== 'i') { run += w; continue; }
      if (run) { out.push(run); run = ''; }
      out.push(w);
    }
    if (run) out.push(run);
    return out;
  }

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h % DIM;
  }

  // Sparse feature vector: { index: value }, L2-normalised so long and short
  // messages score on the same scale.
  function features(text) {
    var t = tokens(text);
    var f = {};
    var add = function (k) { var i = hash(k); f[i] = (f[i] || 0) + 1; };
    for (var i = 0; i < t.length; i++) {
      var w = t[i];
      add('w:' + w);
      if (i + 1 < t.length) add('b:' + w + '_' + t[i + 1]);
      if (w.length >= 3) {
        var p = '^' + w + '$';
        for (var j = 0; j + 3 <= p.length; j++) add('c:' + p.substr(j, 3));
      }
    }
    var n = 0;
    for (var k in f) n += f[k] * f[k];
    n = Math.sqrt(n) || 1;
    for (var k2 in f) f[k2] = f[k2] / n;
    return f;
  }

  var sigmoid = function (z) { return 1 / (1 + Math.exp(-z)); };

  // model: { v, heads: { abuse: { b, w: Float32Array|Array } , ... } }
  function scoreWith(model, text) {
    var out = { abuse: 0, sexual: 0, spam: 0 };
    if (!model || !text) return out;
    var f = features(text);
    for (var h = 0; h < HEADS.length; h++) {
      var head = model.heads[HEADS[h]];
      if (!head) continue;
      var z = head.b;
      for (var k in f) z += head.w[k] * f[k];
      out[HEADS[h]] = sigmoid(z);
    }
    return out;
  }

  // Wire format: int8 weights, base64, with one scale per head.
  function decode(json) {
    var heads = {};
    for (var h = 0; h < HEADS.length; h++) {
      var src = json.heads && json.heads[HEADS[h]];
      if (!src) continue;
      var bin = typeof atob === 'function' ? atob(src.w) : Buffer.from(src.w, 'base64').toString('binary');
      var w = new Float32Array(DIM);
      for (var i = 0; i < DIM && i < bin.length; i++) {
        var c = bin.charCodeAt(i);
        w[i] = (c > 127 ? c - 256 : c) * src.s;
      }
      heads[HEADS[h]] = { b: src.b, w: w };
    }
    return { v: json.v, heads: heads, thresholds: json.thresholds || {} };
  }

  var api = { DIM: DIM, HEADS: HEADS, normalize: normalize, tokens: tokens, features: features, scoreWith: scoreWith, decode: decode, sigmoid: sigmoid };

  // --- Browser: load the model once, lazily, and score synchronously after.
  if (typeof window !== 'undefined') {
    var model = null;
    var loading = null;
    api.load = function () {
      if (model || loading) return loading || Promise.resolve(model);
      loading = fetch('/talkguard/model.json', { credentials: 'omit' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { model = j ? decode(j) : null; return model; })
        .catch(function () { loading = null; return null; });
      return loading;
    };
    api.ready = function () { return !!model; };
    api.score = function (text) { return scoreWith(model, text); };
    // "Are you sure?" before a message that reads as abusive. The first press
    // is held back with a note; pressing send again with the same text sends it.
    var heldText = null;
    api.shouldHold = function (text) {
      if (!model || !text) return false;
      var t = (model.thresholds && model.thresholds.nudge) || 0.8;
      if (api.score(text).abuse < t) { heldText = null; return false; }
      if (heldText === text) { heldText = null; return false; }
      heldText = text;
      return true;
    };
    api.nudgeText = 'That might come across as hurtful. Keep it kind - press send again if you still want to send it.';
    root.TalkGuard = api;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
