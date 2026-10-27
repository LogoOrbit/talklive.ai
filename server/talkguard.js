// TalkGuard trainer and server-side scorer. See public/talkguard.js for the
// model itself. Trains in well under a second on the starter set plus every
// example the owner has labelled, so it simply retrains when a label changes.
//
// Labels come from:
//   - the dashboard's "Teach it" queue (messages the model or the keyword rules
//     flagged, which the owner marks harmful or fine)
//   - review-queue decisions: ban/warn confirms the flagged evidence, "not
//     genuine" marks it fine
// The owner's labels count three times as much as the starter set, so the
// model drifts toward how this site is actually moderated.

const core = require('../public/talkguard');
const seed = require('./talkguard-seed');

const { DIM, HEADS } = core;
const MAX_EXAMPLES = 3000;
const MAX_CANDIDATES = 300;
const OWNER_WEIGHT = 3;

function createTalkGuard({ store }) {
  let model = null; // { v, heads: { name: { b, w: Float32Array } } }
  let wire = null; // JSON served to browsers
  let stats = null;
  let retrainTimer = null;

  function state() {
    let s = store.data.talkguard;
    if (!s || typeof s !== 'object') s = store.data.talkguard = {};
    if (!Array.isArray(s.examples)) s.examples = [];
    if (!Array.isArray(s.candidates)) s.candidates = [];
    if (!s.version) s.version = 1;
    if (!s.counts || typeof s.counts !== 'object') s.counts = {};
    return s;
  }

  function seedRows() {
    const rows = [];
    const add = (list, label) => list.forEach((t) => rows.push({ t, y: { abuse: 0, sexual: 0, spam: 0, ...label }, w: 1, seed: true }));
    add(seed.ABUSE, { abuse: 1 });
    add(seed.SEXUAL, { sexual: 1 });
    add(seed.SPAM, { spam: 1 });
    add(seed.CLEAN, {});
    return rows;
  }

  // Plain SGD logistic regression, one head at a time, with L2.
  function fit(rows, epochs = 40) {
    const feats = rows.map((r) => Object.entries(core.features(r.t)).map(([k, v]) => [Number(k), v]));
    const heads = {};
    for (const h of HEADS) {
      const w = new Float32Array(DIM);
      let b = -2;
      const pos = rows.filter((r) => r.y[h]).reduce((a, r) => a + r.w, 0) || 1;
      const neg = rows.filter((r) => !r.y[h]).reduce((a, r) => a + r.w, 0) || 1;
      // Balance the classes so a head with few examples still learns them.
      const cw = { 1: Math.min(6, neg / pos), 0: 1 };
      const order = rows.map((_, i) => i);
      for (let e = 0; e < epochs; e++) {
        const lr = 0.5 / (1 + e * 0.08);
        for (let i = order.length - 1; i > 0; i--) { const j = (e * 7919 + i * 104729) % (i + 1); [order[i], order[j]] = [order[j], order[i]]; }
        for (const i of order) {
          const y = rows[i].y[h] ? 1 : 0;
          const f = feats[i];
          let z = b;
          for (const [k, v] of f) z += w[k] * v;
          const g = (core.sigmoid(z) - y) * rows[i].w * cw[y];
          for (const [k, v] of f) w[k] -= lr * (g * v + 0.0005 * w[k]);
          b -= lr * g * 0.5;
        }
      }
      heads[h] = { b, w };
    }
    return heads;
  }

  function encode(heads, v) {
    const out = { v, heads: {}, thresholds: { nudge: 0.8, strike: 0.9, flag: 0.6 } };
    for (const h of HEADS) {
      const { b, w } = heads[h];
      let max = 0;
      for (let i = 0; i < DIM; i++) max = Math.max(max, Math.abs(w[i]));
      const s = (max || 1) / 127;
      const buf = Buffer.alloc(DIM);
      for (let i = 0; i < DIM; i++) buf.writeInt8(Math.max(-127, Math.min(127, Math.round(w[i] / s))), i);
      out.heads[h] = { b: Math.round(b * 1000) / 1000, s, w: buf.toString('base64') };
    }
    return out;
  }

  // Accuracy on a held-out fifth of the starter set, so the dashboard can say
  // honestly how good the model is.
  function evaluate(rows) {
    const test = rows.filter((_, i) => i % 5 === 0);
    const train = rows.filter((_, i) => i % 5 !== 0);
    const heads = fit(train, 30);
    const m = { heads };
    const res = {};
    for (const h of HEADS) {
      let tp = 0; let fp = 0; let fn = 0; let tn = 0;
      for (const r of test) {
        const p = core.scoreWith(m, r.t)[h] >= 0.6;
        const y = !!r.y[h];
        if (p && y) tp++; else if (p) fp++; else if (y) fn++; else tn++;
      }
      res[h] = { precision: tp + fp ? Math.round(tp / (tp + fp) * 100) : null, recall: tp + fn ? Math.round(tp / (tp + fn) * 100) : null, falseAlarms: tn + fp ? Math.round(fp / (tn + fp) * 1000) / 10 : 0 };
    }
    return res;
  }

  function train() {
    const s = state();
    const t0 = Date.now();
    const rows = seedRows().concat(s.examples.map((e) => ({ t: e.t, y: e.y, w: OWNER_WEIGHT })));
    const heads = fit(rows);
    model = { v: s.version, heads, thresholds: {} };
    wire = encode(heads, s.version);
    // The served weights are int8; score with exactly what browsers get.
    model = core.decode(wire);
    stats = { trainedAt: Date.now(), ms: Date.now() - t0, seedExamples: rows.length - s.examples.length, ownerExamples: s.examples.length, version: s.version, quality: evaluate(seedRows()) };
    return stats;
  }

  function scheduleRetrain() {
    clearTimeout(retrainTimer);
    retrainTimer = setTimeout(() => {
      state().version += 1;
      try { train(); store.save(); } catch (e) { console.error('[talkguard] retrain failed:', e.message); }
    }, 5000);
    retrainTimer.unref?.();
  }

  const score = (text) => core.scoreWith(model, text);

  // Something worth a human label: kept for the "Teach it" queue.
  function noteCandidate({ text, scores, source, from, fromClientId }) {
    const s = state();
    const t = String(text || '').trim().slice(0, 300);
    if (t.length < 3 || s.candidates.some((c) => c.t === t) || s.examples.some((e) => e.t === t)) return;
    s.candidates.unshift({ id: Math.random().toString(36).slice(2, 10), t, ts: Date.now(), source, from: from || '', fromClientId: fromClientId || '', scores: round(scores) });
    if (s.candidates.length > MAX_CANDIDATES) s.candidates.length = MAX_CANDIDATES;
  }
  const round = (sc) => Object.fromEntries(HEADS.map((h) => [h, Math.round(((sc && sc[h]) || 0) * 100) / 100]));

  // Every message the server sees. Returns the scores. Flags (>= flag) are
  // queued for the owner to confirm or correct.
  function check(text, meta = {}) {
    if (!model || !text) return { abuse: 0, sexual: 0, spam: 0 };
    const sc = score(text);
    const s = state();
    const day = new Date().toISOString().slice(0, 10);
    const c = s.counts[day] || (s.counts[day] = { scanned: 0, flagged: 0 });
    c.scanned += 1;
    if (HEADS.some((h) => sc[h] >= wire.thresholds.flag)) {
      c.flagged += 1;
      noteCandidate({ text, scores: sc, ...meta });
    }
    for (const k of Object.keys(s.counts)) if (k < new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10)) delete s.counts[k];
    return sc;
  }

  // label: 'abuse' | 'sexual' | 'spam' | 'fine'
  function addExample(text, label, by) {
    const s = state();
    const t = String(text || '').trim().slice(0, 300);
    if (!t) return false;
    const y = { abuse: 0, sexual: 0, spam: 0 };
    if (label !== 'fine') { if (!HEADS.includes(label)) return false; y[label] = 1; }
    s.examples = s.examples.filter((e) => e.t !== t);
    s.examples.push({ t, y, ts: Date.now(), by: by || 'owner' });
    if (s.examples.length > MAX_EXAMPLES) s.examples.splice(0, s.examples.length - MAX_EXAMPLES);
    s.candidates = s.candidates.filter((c) => c.t !== t);
    scheduleRetrain();
    store.save();
    return true;
  }

  function label(candidateId, lbl) {
    const s = state();
    const c = s.candidates.find((x) => x.id === candidateId);
    if (!c) return false;
    if (lbl === 'skip') { s.candidates = s.candidates.filter((x) => x !== c); store.save(); return true; }
    return addExample(c.t, lbl, 'owner');
  }

  // From the review queue: confirmed (ban/warn) or rejected (clear) evidence.
  function learnFromDecision(texts, harmful) {
    for (const t of texts) {
      if (!t) continue;
      const sc = score(t);
      if (harmful) {
        const top = HEADS.reduce((a, h) => (sc[h] > sc[a] ? h : a), 'abuse');
        if (sc[top] >= 0.3) addExample(t, top, 'review');
      } else addExample(t, 'fine', 'review');
    }
  }

  function summary() {
    const s = state();
    const days = Object.entries(s.counts).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 7);
    return {
      ...stats,
      ownerExamples: s.examples.length,
      thresholds: wire && wire.thresholds,
      candidates: s.candidates.slice(0, 60),
      recentExamples: s.examples.slice(-20).reverse(),
      days,
    };
  }

  train();
  // The stored examples arrive with the store; pick them up once loaded.
  setTimeout(() => { if (state().examples.length) train(); }, 15000).unref?.();

  return {
    score, check, addExample, label, learnFromDecision, summary,
    modelJson: () => wire,
    version: () => (wire ? wire.v : 0),
    thresholds: () => (wire ? wire.thresholds : { nudge: 0.8, strike: 0.9, flag: 0.6 }),
    retrain: () => { state().version += 1; return train(); },
  };
}

module.exports = { createTalkGuard };
