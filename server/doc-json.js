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

// Everything below writes JSON to a sink: an object with push(string). A plain
// array works (join it for the text); a Writer hands the text on in groups as
// it is produced, so the whole document never exists in memory at once. At
// ~35MB, the document as one string plus the buffer written to disk was over
// 100MB of memory on every save.
class Writer {
  constructor(write, size = 512 * 1024) {
    this.write = write;
    this.size = size;
    this.buf = [];
    this.n = 0;
    this.bytes = 0;
  }
  push(s) {
    this.buf.push(s);
    this.n += s.length;
    if (this.n >= this.size) this.flush();
  }
  flush() {
    if (!this.buf.length) return;
    const group = this.buf.join('');
    this.buf = [];
    this.n = 0;
    this.bytes += group.length;
    this.write(group);
  }
}

// Serialize a plain object of key -> list, reusing cached JSON where safe.
// Each cache entry holds the finished `"key":[...]` piece, so a reused list
// costs one push.
function cachedObject(obj, c, full, out) {
  const touched = c.map.touched;
  c.map.touched = new Set();
  const prev = c.prevTouched;
  c.prevTouched = touched;
  const next = new Map();
  out.push('{');
  let first = true;
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
    out.push(first ? piece : ',' + piece);
    first = false;
  }
  out.push('}');
  c.json = next;
}

// Writes `prefix` + JSON.stringify(v) to `out`, exactly, and returns true - or
// writes nothing and returns false for a value JSON leaves out (undefined, a
// function). Plain objects and arrays are walked `depth` levels down so a big
// section goes out a record at a time instead of as one multi-megabyte string.
function emit(out, prefix, v, depth) {
  if (depth > 0 && v && typeof v === 'object' && typeof v.toJSON !== 'function') {
    if (Array.isArray(v)) {
      out.push(prefix + '[');
      for (let i = 0; i < v.length; i++) {
        if (!emit(out, i ? ',' : '', v[i], depth - 1)) out.push(i ? ',null' : 'null');
      }
      out.push(']');
      return true;
    }
    const proto = Object.getPrototypeOf(v);
    if (proto === Object.prototype || proto === null) {
      out.push(prefix + '{');
      let first = true;
      for (const k of Object.keys(v)) {
        if (emit(out, (first ? '' : ',') + JSON.stringify(k) + ':', v[k], depth - 1)) first = false;
      }
      out.push('}');
      return true;
    }
  }
  const j = JSON.stringify(v);
  if (j === undefined) return false;
  out.push(prefix + j);
  return true;
}

// How deep a section is split: one piece per record (section -> record).
const SPLIT_DEPTH = 1;

// Writes JSON.stringify(doc) to `out`, with doc[outer][field] served from
// `caches[field]`.
function serializeTo(out, doc, outer, caches, full) {
  out.push('{');
  let first = true;
  for (const k of Object.keys(doc)) {
    const v = doc[k];
    const prefix = (first ? '' : ',') + JSON.stringify(k) + ':';
    if (k === outer && v && typeof v === 'object' && !Array.isArray(v) && caches) {
      out.push(prefix + '{');
      let firstField = true;
      for (const f of Object.keys(v)) {
        const fv = v[f];
        const c = caches[f];
        const fp = (firstField ? '' : ',') + JSON.stringify(f) + ':';
        if (c && fv && typeof fv === 'object' && !Array.isArray(fv)) {
          out.push(fp);
          cachedObject(fv, c, full, out);
          firstField = false;
        } else if (emit(out, fp, fv, SPLIT_DEPTH)) firstField = false;
      }
      out.push('}');
      first = false;
    } else if (emit(out, prefix, v, SPLIT_DEPTH)) first = false;
  }
  out.push('}');
  if (typeof out.flush === 'function') out.flush();
  return out;
}

// JSON.stringify(doc), with doc[outer][field] served from `caches[field]`.
function serialize(doc, outer, caches, full) {
  return serializeTo([], doc, outer, caches, full).join('');
}

module.exports = { TrackedMap, listCache, serialize, serializeTo, Writer };
