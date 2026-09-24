// Unit checks for server/matching.js - the batch matcher and the call-quality
// model behind it. No server needed.
//
//   node scripts/test-matching-algo.js
const {
  maxWeightMatching, createQualityModel, pairWeight, PAIR_BASE, EXACT_MAX_NODES, _approxComponent,
} = require('../server/matching');

let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : extra);
};

// Deterministic PRNG so a failure reproduces.
let seed = 12345;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

function isValid(n, edges, mate) {
  const has = new Set(edges.map(([i, j]) => `${Math.min(i, j)}|${Math.max(i, j)}`));
  for (let i = 0; i < n; i++) {
    const j = mate[i];
    if (j === -1) continue;
    if (j === i || mate[j] !== i) return false;
    if (!has.has(`${Math.min(i, j)}|${Math.max(i, j)}`)) return false;
  }
  return true;
}

function total(edges, mate) {
  let t = 0;
  for (const [i, j, w] of edges) if (mate[i] === j) t += w;
  return t;
}

function bruteForce(n, edges) {
  const w = new Map(edges.map(([i, j, x]) => [`${Math.min(i, j)}|${Math.max(i, j)}`, x]));
  let best = 0;
  const used = new Array(n).fill(false);
  (function go(i, acc) {
    while (i < n && used[i]) i++;
    if (i >= n) { best = Math.max(best, acc); return; }
    used[i] = true;
    go(i + 1, acc);
    for (let j = i + 1; j < n; j++) {
      const x = w.get(`${i}|${j}`);
      if (used[j] || !x) continue;
      used[j] = true;
      go(i + 1, acc + x);
      used[j] = false;
    }
    used[i] = false;
  }(0, 0));
  return best;
}

function randomGraph(n, density) {
  const edges = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (rand() < density) edges.push([i, j, PAIR_BASE + Math.round(rand() * 1000) / 100]);
    }
  }
  return edges;
}

// --- Solver -----------------------------------------------------------------

let exactOk = true;
for (let t = 0; t < 300 && exactOk; t++) {
  const n = 2 + Math.floor(rand() * 9);
  const edges = randomGraph(n, 0.2 + rand() * 0.7);
  const mate = maxWeightMatching(n, edges);
  const got = total(edges, mate);
  const want = bruteForce(n, edges);
  if (!isValid(n, edges, mate) || Math.abs(got - want) > 1e-9) {
    exactOk = false;
    ok('exact solver matches brute force', false, JSON.stringify({ n, edges, got, want }));
  }
}
if (exactOk) ok('exact solver matches brute force on 300 random graphs', true);

// Cardinality comes first: one heavy pair must not strand two people who could
// both be talking.
{
  const edges = [[0, 1, PAIR_BASE + 9], [0, 2, PAIR_BASE], [1, 3, PAIR_BASE]];
  const mate = maxWeightMatching(4, edges);
  ok('matches as many people as possible before chasing quality',
    mate[0] === 2 && mate[1] === 3, JSON.stringify(mate));
}

// Among equally sized matchings, quality decides.
{
  const edges = [
    [0, 1, pairWeight({ sharedInterests: 0 })],
    [0, 2, pairWeight({ sharedInterests: 3 })],
    [1, 2, pairWeight({ sharedInterests: 0 })],
  ];
  const mate = maxWeightMatching(3, edges);
  ok('shared interests pick the partner', mate[0] === 2, JSON.stringify(mate));
}

// Odd one out: whoever has waited longest gets the match.
{
  const w = (waitedSec) => pairWeight({ waitedSec });
  // 0 and 1 each waited 20s, 2 just arrived. Any two of them may pair.
  const edges = [[0, 1, w(40)], [0, 2, w(20)], [1, 2, w(20)]];
  const mate = maxWeightMatching(3, edges);
  ok('the longest waiters are paired first', mate[0] === 1, JSON.stringify(mate));
}

// A mutual heart outranks any other quality signal.
{
  const edges = [
    [0, 1, pairWeight({ sharedInterests: 3, callScore: 1, sameCountry: true, waitedSec: 60 })],
    [0, 2, pairWeight({ mutualHeart: true })],
  ];
  const mate = maxWeightMatching(3, edges);
  ok('a mutual heart reunites the pair', mate[0] === 2, JSON.stringify(mate));
}

// Large components use the approximate path; it must stay valid and, on a path
// graph where plain greedy strands people, still find the perfect matching.
{
  const n = 20;
  const edges = [];
  // Middle edges heavier, so greedy grabs 1-2, 3-4, ... and leaves 0 and 19.
  for (let i = 0; i < n - 1; i++) edges.push([i, i + 1, PAIR_BASE + (i % 2 ? 5 : 1)]);
  const mate = maxWeightMatching(n, edges);
  const pairs = mate.filter((m) => m !== -1).length / 2;
  ok('large component: valid matching', isValid(n, edges, mate));
  ok('large component: augmenting paths recover the perfect matching', pairs === 10, `pairs=${pairs}`);
}
{
  const n = 60;
  const edges = randomGraph(n, 0.3);
  const mate = maxWeightMatching(n, edges);
  const pairs = mate.filter((m) => m !== -1).length / 2;
  ok('large random component: valid and near-perfect', isValid(n, edges, mate) && pairs >= 29, `pairs=${pairs}`);
}
{
  const n = 200;
  const edges = randomGraph(n, 0.5);
  const t0 = Date.now();
  const mate = maxWeightMatching(n, edges);
  const ms = Date.now() - t0;
  ok('200 waiting people match in well under a second', isValid(n, edges, mate) && ms < 1000, `${ms}ms`);
}
{
  const n = EXACT_MAX_NODES;
  const edges = randomGraph(n, 1);
  const t0 = Date.now();
  maxWeightMatching(n, edges);
  const ms = Date.now() - t0;
  ok(`largest exact component (${n}) solves fast`, ms < 500, `${ms}ms`);
}
// The large-component path must always reach the maximum number of pairs, and
// its quality should sit next to the optimum. Checked against the exact solver
// on graphs small enough for it, sparse ones included (odd cycles = blossoms).
{
  let cardOk = true;
  let ratioSum = 0;
  let ratioCount = 0;
  for (let t = 0; t < 300; t++) {
    const n = 4 + Math.floor(rand() * 11);
    const edges = randomGraph(n, 0.15 + rand() * 0.6);
    const adj = Array.from({ length: n }, () => new Map());
    for (const [i, j, w] of edges) { adj[i].set(j, w); adj[j].set(i, w); }
    const mate = new Array(n).fill(-1);
    for (const [a, b] of _approxComponent([...Array(n).keys()], adj)) { mate[a] = b; mate[b] = a; }
    const exact = maxWeightMatching(n, edges);
    const pairsOf = (m) => m.filter((x) => x !== -1).length / 2;
    if (!isValid(n, edges, mate) || pairsOf(mate) !== pairsOf(exact)) {
      cardOk = false;
      ok('approximate path reaches maximum cardinality', false, JSON.stringify({ n, edges }));
      break;
    }
    const qa = total(edges, mate) - PAIR_BASE * pairsOf(mate);
    const qe = total(edges, exact) - PAIR_BASE * pairsOf(exact);
    if (qe > 0) { ratioSum += qa / qe; ratioCount++; }
  }
  if (cardOk) ok('approximate path reaches maximum cardinality on 300 random graphs', true);
  const avg = ratioSum / ratioCount;
  ok('approximate path keeps >= 95% of optimal quality on average', avg >= 0.95, avg.toFixed(3));
}

ok('empty and single-node queues are fine',
  maxWeightMatching(0, []).length === 0 && maxWeightMatching(1, [])[0] === -1);

// --- Quality model ----------------------------------------------------------

{
  const q = createQualityModel();
  const fresh = q.pairScore('new1', 'new2');
  ok('strangers score at the prior', fresh > 0.6 && fresh < 0.8, fresh);

  // "skipper" bails on everyone inside 3s; "keeper" talks for minutes.
  for (let i = 0; i < 15; i++) {
    q.recordCall({ a: 'skipper', b: 'p' + i, seconds: 3, endedBy: 'skipper' });
    q.recordCall({ a: 'keeper', b: 'k' + i, seconds: 240, endedBy: 'keeper' });
  }
  const s = q.userScore('skipper');
  const k = q.userScore('keeper');
  ok('a serial skipper stops being "likely to stay"', s.stay < 0.3, s.stay);
  ok('being skipped does not count as skipping', q.userScore('p0').stay >= 0.7, q.userScore('p0').stay);
  ok('a long talker scores high', k.stay > 0.8 && k.appeal > 0.8, JSON.stringify(k));
  ok('pairs with a serial skipper score lower',
    q.pairScore('skipper', 'x') < q.pairScore('keeper', 'x'));

  // Being skipped quickly by many people lowers appeal.
  for (let i = 0; i < 15; i++) q.recordCall({ a: 'q' + i, b: 'dud', seconds: 2, endedBy: 'q' + i });
  ok('someone everyone bails on loses appeal', q.userScore('dud').appeal < 0.3, q.userScore('dud').appeal);

  // Network failures and short drops say nothing about anyone.
  q.recordCall({ a: 'net1', b: 'net2', seconds: 1, endedBy: 'net1', failed: true });
  q.recordCall({ a: 'net1', b: 'net2', seconds: 4, endedBy: null });
  ok('failed or dropped short calls are not recorded', q.userScore('net1').calls === 0);

  // Recent behaviour wins: a reformed skipper recovers.
  for (let i = 0; i < 40; i++) q.recordCall({ a: 'skipper', b: 'r' + i, seconds: 120, endedBy: 'skipper' });
  ok('old evidence decays', q.userScore('skipper').stay > 0.8, q.userScore('skipper').stay);
}
{
  const q = createQualityModel({ maxTracked: 10 });
  for (let i = 0; i < 50; i++) q.recordCall({ a: 'u' + i, b: 'v' + i, seconds: 60, endedBy: 'u' + i });
  ok('memory is bounded', q.size() <= 10, q.size());
}

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
