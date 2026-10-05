'use strict';
// Faster serialization of the store document.
//
// The store is one JSON document (server/store.js), written to the volume
// every couple of seconds. Friend chats and match history are ~11MB of its
// ~17MB, yet a save usually changes a handful of them - so re-serializing all
// ~12,000 lists each time froze the server for a few hundred ms every 2s.
//
// index.js keeps those lists in TrackedMaps, which remember every key that was
// read or written since the last save. A save re-serializes only those keys and
// reuses the previous JSON for the rest. The document's format is unchanged:
// the output is exactly what JSON.stringify would produce.
//
// Safety: a list is reused only if it is the very same array as last time and
// its key was not touched in this save window or the previous one (so a change
// made after an await, a moment after the get, is still caught). A periodic
// full save re-serializes everything and counts any reused list that would
// have been stale - that number must stay 0, and is shown on the dashboard.

class TrackedMap extends Map {
  constructor(entries) {
    super();
    this.touched = new Set();
    if (entries) for (const [k, v] of entries) this.set(k, v);
  }
  // A get hands out the live list, which the caller may then change in place,
  // so reads count as touches. Over-marking costs a little speed, never data.
  get(k) { if (super.has(k)) this.touched.add(k); return super.get(k); }
  set(k, v) { if (this.touched) this.touched.add(k); return super.set(k, v); }
  delete(k) { this.touched.add(k); return super.delete(k); }
  clear() { for (const k of super.keys()) this.touched.add(k); super.clear(); }
}

// One cache per tracked field (e.g. social.friendChats).
function listCache(map) {
  return { map, json: new Map(), prevTouched: new Set(), misses: 0 };
}

// Serialize a plain object of key -> list, reusing cached JSON where safe.
// Each cache entry holds the finished `"key":[...]` piece, so a reused list
// costs one array slot and the final join.
function cachedObject(obj, c, full) {
  const touched = c.map.touched;
  c.map.touched = new Set();
  const prev = c.prevTouched;
  c.prevTouched = touched;
  const next = new Map();
  const parts = [];
  for (const k of Object.keys(obj)) {
    const list = obj[k];
    const hit = c.json.get(k);
    const clean = hit !== undefined && hit.ref === list && !touched.has(k) && !prev.has(k);
    let piece;
    if (clean && !full) {
      piece = hit.piece;
    } else {
      const j = JSON.stringify(list);
      if (j === undefined) continue;
      piece = JSON.stringify(k) + ':' + j;
      if (clean && piece !== hit.piece) c.misses += 1;
    }
    next.set(k, { ref: list, piece });
    parts.push(piece);
  }
  c.json = next;
  return '{' + parts.join(',') + '}';
}

// JSON.stringify(doc), with doc[outer][field] served from `caches[field]`.
function serialize(doc, outer, caches, full) {
  const parts = [];
  for (const k of Object.keys(doc)) {
    const v = doc[k];
    let j;
    if (k === outer && v && typeof v === 'object' && !Array.isArray(v) && caches) {
      const inner = [];
      for (const f of Object.keys(v)) {
        const fv = v[f];
        const c = caches[f];
        const fj = c && fv && typeof fv === 'object' && !Array.isArray(fv) ? cachedObject(fv, c, full) : JSON.stringify(fv);
        if (fj !== undefined) inner.push(JSON.stringify(f) + ':' + fj);
      }
      j = '{' + inner.join(',') + '}';
    } else {
      j = JSON.stringify(v);
    }
    if (j !== undefined) parts.push(JSON.stringify(k) + ':' + j);
  }
  return '{' + parts.join(',') + '}';
}

module.exports = { TrackedMap, listCache, serialize };
