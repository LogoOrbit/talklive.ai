// Batch matchmaking: who should talk to whom, decided for everyone waiting at
// once rather than for whoever happened to arrive last.
//
// The old matcher was first-fit: a new arrival scanned the queue and took the
// best partner for itself. The first person in grabbed the best match even when
// that left two others with nothing, and the order people tapped "Start" decided
// pairings more than anything about them. Here the whole queue is a graph (an
// edge wherever two people may be paired, weighted by how good that call is
// likely to be) and each round picks the set of pairs that
//
//   1. matches as many people as possible - nobody who could be talking is left
//      waiting so that someone else gets a slightly better partner - and then
//   2. among those, has the highest total expected call quality.
//
// Both goals ride in one number: every edge carries PAIR_BASE, which is far
// larger than any quality score, so one extra pair always outweighs any amount
// of quality. That is maximum-weight maximum-cardinality matching.
//
// Solving it: the compatibility graph falls apart into small components on any
// realistic queue (pools, filters, blocks), and a component of up to
// EXACT_MAX_NODES is solved exactly by dynamic programming over subsets. A
// bigger component gets the maximum number of pairs exactly (greedy by weight,
// then Edmonds' blossom augmentation) and its quality by local improvement
// (partner exchanges and pair swaps), which lands on or next to the optimum.
//
// The quality side is learned from how calls actually end (QualityModel below):
// people who stay in calls, and people others stay in calls with, are worth
// pairing, and the score for a pair is the chance neither side bails early.

const PAIR_BASE = 1000;
const EXACT_MAX_NODES = 16;
const IMPROVE_PASSES = 4;

// --- Solver -----------------------------------------------------------------

// `n` nodes, `edges` as [i, j, weight] with weight > 0. Returns an array where
// mate[i] is i's partner index or -1.
function maxWeightMatching(n, edges) {
  const mate = new Array(n).fill(-1);
  if (n < 2 || !edges.length) return mate;

  const adj = Array.from({ length: n }, () => new Map());
  for (const [i, j, w] of edges) {
    if (i === j || !(w > 0)) continue;
    // Keep the heavier of any duplicate edge.
    if ((adj[i].get(j) || 0) < w) {
      adj[i].set(j, w);
      adj[j].set(i, w);
    }
  }

  const seen = new Array(n).fill(false);
  for (let s = 0; s < n; s++) {
    if (seen[s] || !adj[s].size) continue;
    const comp = [];
    const stack = [s];
    seen[s] = true;
    while (stack.length) {
      const v = stack.pop();
      comp.push(v);
      for (const u of adj[v].keys()) {
        if (!seen[u]) { seen[u] = true; stack.push(u); }
      }
    }
    const pairs = comp.length <= EXACT_MAX_NODES ? exactComponent(comp, adj) : approxComponent(comp, adj);
    for (const [a, b] of pairs) { mate[a] = b; mate[b] = a; }
  }
  return mate;
}

// best[mask] = best total weight using only the nodes in `mask`. The lowest
// node in the mask either stays single or pairs with one other node in it, so
// every mask is built from strictly smaller ones. 2^16 * 16 steps at worst.
function exactComponent(comp, adj) {
  const k = comp.length;
  const w = new Float64Array(k * k);
  for (let a = 0; a < k; a++) {
    for (let b = 0; b < k; b++) w[a * k + b] = adj[comp[a]].get(comp[b]) || 0;
  }
  const size = 1 << k;
  const best = new Float64Array(size);
  const pick = new Int8Array(size).fill(-1);
  for (let mask = 1; mask < size; mask++) {
    const i = 31 - Math.clz32(mask & -mask);
    const rest = mask & ~(1 << i);
    let v = best[rest];
    let p = -1;
    for (let r = rest; r; r &= r - 1) {
      const j = 31 - Math.clz32(r & -r);
      const e = w[i * k + j];
      if (e > 0) {
        const t = e + best[rest & ~(1 << j)];
        if (t > v) { v = t; p = j; }
      }
    }
    best[mask] = v;
    pick[mask] = p;
  }
  const pairs = [];
  let mask = size - 1;
  while (mask) {
    const i = 31 - Math.clz32(mask & -mask);
    const j = pick[mask];
    mask &= ~(1 << i);
    if (j >= 0) {
      mask &= ~(1 << j);
      pairs.push([comp[i], comp[j]]);
    }
  }
  return pairs;
}

// Large component: greedy by weight, then Edmonds' blossom augmentation to reach
// the maximum number of pairs (greedy alone can strand people at the ends of a
// chain), then local moves that keep that number and raise the total.
function approxComponent(comp, adj) {
  const k = comp.length;
  const local = new Map(comp.map((v, i) => [v, i]));
  const nbrs = comp.map((v) => [...adj[v].keys()].map((u) => local.get(u)));
  const weight = (a, b) => adj[comp[a]].get(comp[b]) || 0;
  const mate = new Int32Array(k).fill(-1);

  const edges = [];
  for (let a = 0; a < k; a++) for (const b of nbrs[a]) if (a < b) edges.push([a, b, weight(a, b)]);
  edges.sort((x, y) => y[2] - x[2]);
  for (const [a, b] of edges) {
    if (mate[a] === -1 && mate[b] === -1) { mate[a] = b; mate[b] = a; }
  }

  augmentToMaximum(k, nbrs, mate);

  for (let pass = 0; pass < IMPROVE_PASSES; pass++) {
    let improved = false;

    // Someone single takes over a partner from someone whose pair is worth
    // less: same number of pairs, higher total (e.g. a long waiter gets in).
    for (let u = 0; u < k; u++) {
      if (mate[u] !== -1) continue;
      let bestV = -1;
      let bestGain = 0;
      for (const v of nbrs[u]) {
        const gain = weight(u, v) - weight(v, mate[v]);
        if (mate[v] !== -1 && gain > bestGain) { bestGain = gain; bestV = v; }
      }
      if (bestV >= 0) {
        mate[mate[bestV]] = -1;
        mate[bestV] = u;
        mate[u] = bestV;
        improved = true;
      }
    }

    // Two pairs trading partners, when that raises the total.
    for (let a = 0; a < k; a++) {
      for (let c = a + 1; c < k; c++) {
        const b = mate[a];
        const d = mate[c];
        if (b === -1 || d === -1 || b === c || b < a || d < c) continue;
        const now = weight(a, b) + weight(c, d);
        const s1 = weight(a, c) && weight(b, d) ? weight(a, c) + weight(b, d) : 0;
        const s2 = weight(a, d) && weight(b, c) ? weight(a, d) + weight(b, c) : 0;
        if (s1 > now && s1 >= s2) {
          mate[a] = c; mate[c] = a; mate[b] = d; mate[d] = b;
          improved = true;
        } else if (s2 > now) {
          mate[a] = d; mate[d] = a; mate[b] = c; mate[c] = b;
          improved = true;
        }
      }
    }
    if (!improved) break;
  }

  const out = [];
  for (let a = 0; a < k; a++) if (mate[a] > a) out.push([comp[a], comp[mate[a]]]);
  return out;
}

// Edmonds' blossom algorithm for maximum cardinality matching, grown from the
// matching already in `mate`: from each single node, search for an augmenting
// path (contracting odd cycles as it meets them) and flip it. O(V^3).
function augmentToMaximum(n, nbrs, mate) {
  const parent = new Int32Array(n);
  const base = new Int32Array(n);
  const used = new Uint8Array(n);
  const inBlossom = new Uint8Array(n);
  const onPath = new Uint8Array(n);

  function lca(a, b) {
    onPath.fill(0);
    for (;;) {
      a = base[a];
      onPath[a] = 1;
      if (mate[a] === -1) break;
      a = parent[mate[a]];
    }
    for (;;) {
      b = base[b];
      if (onPath[b]) return b;
      b = parent[mate[b]];
    }
  }

  function markPath(v, b, child) {
    while (base[v] !== b) {
      inBlossom[base[v]] = 1;
      inBlossom[base[mate[v]]] = 1;
      parent[v] = child;
      child = mate[v];
      v = parent[mate[v]];
    }
  }

  function findPath(root) {
    used.fill(0);
    parent.fill(-1);
    for (let i = 0; i < n; i++) base[i] = i;
    used[root] = 1;
    const queue = [root];
    for (let qh = 0; qh < queue.length; qh++) {
      const v = queue[qh];
      for (const to of nbrs[v]) {
        if (base[v] === base[to] || mate[v] === to) continue;
        if (to === root || (mate[to] !== -1 && parent[mate[to]] !== -1)) {
          const cur = lca(v, to);
          inBlossom.fill(0);
          markPath(v, cur, to);
          markPath(to, cur, v);
          for (let i = 0; i < n; i++) {
            if (inBlossom[base[i]]) {
              base[i] = cur;
              if (!used[i]) { used[i] = 1; queue.push(i); }
            }
          }
        } else if (parent[to] === -1) {
          parent[to] = v;
          if (mate[to] === -1) return to;
          used[mate[to]] = 1;
          queue.push(mate[to]);
        }
      }
    }
    return -1;
  }

  for (let v = 0; v < n; v++) {
    if (mate[v] !== -1) continue;
    let u = findPath(v);
    while (u !== -1) {
      const pv = parent[u];
      const next = mate[pv];
      mate[u] = pv;
      mate[pv] = u;
      u = next;
    }
  }
}

// --- Call-quality model -----------------------------------------------------

// Per person, from the calls they have been in (recent ones count more):
//   stay   - how often they do NOT bail on a partner inside QUICK_SKIP_SEC
//   appeal - how often partners do NOT bail on them inside QUICK_SKIP_SEC
// Both start at the site-wide prior and move with evidence (a Beta-smoothed
// rate), so one bad call never brands anyone. A new pair's chance of a real
// conversation is taken as the geometric mean of the four rates that decide
// it: A staying, B staying, A being stayed with, B being stayed with.
//
// In memory only and bounded: it is a matching hint, not a record about
// anyone, and it rebuilds itself from traffic within minutes of a restart.
const QUICK_SKIP_SEC = 10;
const PRIOR_QUICK_SKIP = 0.3; // share of calls that end in a quick skip, before evidence
const PRIOR_STRENGTH = 4; // how many calls' worth of evidence the prior is worth
const DECAY = 0.95; // each new call shrinks older evidence, ~20 calls of memory
const MAX_TRACKED = 50000;

function createQualityModel(opts = {}) {
  const quickSkipSec = opts.quickSkipSec || QUICK_SKIP_SEC;
  const maxTracked = opts.maxTracked || MAX_TRACKED;
  const stats = new Map(); // clientId -> { n, bailed, bailedOn }

  function touch(id) {
    let s = stats.get(id);
    if (s) {
      stats.delete(id); // re-insert so Map order stays least-recently-used first
    } else {
      s = { n: 0, bailed: 0, bailedOn: 0 };
    }
    stats.set(id, s);
    if (stats.size > maxTracked) stats.delete(stats.keys().next().value);
    s.n *= DECAY;
    s.bailed *= DECAY;
    s.bailedOn *= DECAY;
    s.n += 1;
    return s;
  }

  // `endedBy` is the clientId who ended it, or null when neither chose to
  // (a dropped connection). Calls that never connected say nothing about the
  // people in them and are not recorded.
  function recordCall({ a, b, seconds, endedBy, failed }) {
    if (!a || !b || a === b || failed) return;
    const quick = seconds < quickSkipSec;
    // A short call that dropped is a network story, not a verdict on anyone.
    if (quick && !endedBy) return;
    const sa = touch(a);
    const sb = touch(b);
    if (!quick) return;
    const [quitter, quitted] = endedBy === a ? [sa, sb] : [sb, sa];
    quitter.bailed += 1;
    quitted.bailedOn += 1;
  }

  function rate(bad, n) {
    return 1 - (bad + PRIOR_QUICK_SKIP * PRIOR_STRENGTH) / (n + PRIOR_STRENGTH);
  }

  function userScore(id) {
    const s = stats.get(id);
    const n = s ? s.n : 0;
    return {
      stay: rate(s ? s.bailed : 0, n),
      appeal: rate(s ? s.bailedOn : 0, n),
      calls: n,
    };
  }

  // 0..1: estimated chance the pair gets past the quick-skip window.
  function pairScore(a, b) {
    const x = userScore(a);
    const y = userScore(b);
    return Math.pow(x.stay * x.appeal * y.stay * y.appeal, 0.25);
  }

  return { recordCall, userScore, pairScore, size: () => stats.size };
}

// --- Pair weight ------------------------------------------------------------

// Quality terms, on one scale (a quality score stays well under PAIR_BASE):
const W_CALL = 4; // x predicted chance of a real conversation
const W_INTEREST = 1.5; // per shared interest, up to MAX_INTERESTS of them
const MAX_INTERESTS = 3;
const W_SAME_COUNTRY = 0.5; // a cheap proxy for a shared language
const W_WAIT_PER_SEC = 0.1; // per second the two have waited between them...
const MAX_WAIT_BONUS = 3; // ...capped, so waiting helps without swamping fit
const W_MUTUAL_HEART = 100; // they hearted each other: reunite them first

function pairWeight({ callScore, sharedInterests, sameCountry, waitedSec, mutualHeart }) {
  let q = W_CALL * (callScore || 0)
    + W_INTEREST * Math.min(sharedInterests || 0, MAX_INTERESTS)
    + (sameCountry ? W_SAME_COUNTRY : 0)
    + Math.min(W_WAIT_PER_SEC * Math.max(0, waitedSec || 0), MAX_WAIT_BONUS);
  if (mutualHeart) q += W_MUTUAL_HEART;
  return PAIR_BASE + q;
}

module.exports = {
  maxWeightMatching,
  createQualityModel,
  pairWeight,
  PAIR_BASE,
  EXACT_MAX_NODES,
  QUICK_SKIP_SEC,
  // For tests: the large-component path, callable on any component size.
  _approxComponent: approxComponent,
};
