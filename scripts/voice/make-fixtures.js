#!/usr/bin/env node
'use strict';
// Picks a few real feature summaries for the tests (scripts/test-voice-*.js
// and the Android unit tests): the voices the current model is surest about,
// and a couple it cannot call. Taken only from recordings the model never trained on.
//
//   node scripts/voice/make-fixtures.js feats-*.jsonl > scripts/voice/fixtures.json
const fs = require('fs');
const vc = require('../../server/voice-check.js');

const TEST = /^(libri:test|fleurs:(ps_af|mr_in|it_it|ms_my|yo_ng|th_th|am_et|sd_in):test)/;
const rows = [];
for (const file of process.argv.slice(2)) {
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line) continue;
    const r = JSON.parse(line);
    if (!TEST.test(r.set) || r.n < vc.MIN_FRAMES || r.aug !== 'clean') continue;
    const summary = { v: vc.MODEL.featureVersion, n: r.n, f: r.f };
    if (!vc.validSummary(summary)) continue;
    const p = 1 / (1 + Math.exp(-vc.score(summary.f)));
    rows.push({ summary, p, lab: r.lab, set: r.set });
  }
}
// The voices the model is surest about (so the tests survive a retrain), and
// two it cannot call either way.
const surest = (lab, n) => rows.filter((r) => r.lab === lab).sort((a, b) => (lab === 'F' ? b.p - a.p : a.p - b.p)).slice(0, n).map((r) => r.summary);
const out = {
  about: 'Real voice summaries for tests, from held-out recordings (see scripts/voice/make-fixtures.js). Regenerate after retraining.',
  female: surest('F', 4),
  male: surest('M', 4),
  unclear: rows.filter((r) => Math.abs(r.p - 0.5) < 0.1).slice(0, 2).map((r) => r.summary),
};
process.stdout.write(JSON.stringify(out) + '\n');
