/*
 * Fast saves (server/doc-json.js): routine saves re-serialize only the friend
 * chats and match histories that changed. Losing a change here would mean a
 * message or a match silently missing after the next deploy, so:
 *
 *  1. Thousands of random edits in every shape index.js makes them (push via
 *     get, splice, edit a message in place, replace, delete, clear), with a
 *     fast serialize after each burst: the output must equal JSON.stringify
 *     byte for byte, every time.
 *  2. An edit the tracking cannot see (a stale reference kept for more than
 *     two saves) is still corrected by the next full save, and counted.
 *  3. The real store in a child process: background saves land on disk, a
 *     newer synchronous save is never overwritten by an older background one,
 *     and a restart reads back exactly what was saved.
 *
 *   node scripts/test-fast-save.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { TrackedMap, listCache, serialize } = require('../server/doc-json');

let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond ? '' : (extra === undefined ? '' : String(extra).slice(0, 300)));
};

// Deterministic PRNG so a failure reproduces.
let seed = 12345;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pick = (n) => Math.floor(rnd() * n);

// --- 1. Random edits: fast output always equals JSON.stringify ---------------
{
  const chats = new TrackedMap();
  const history = new TrackedMap();
  const caches = { friendChats: listCache(chats), chatHistory: listCache(history) };
  for (let i = 0; i < 300; i++) chats.set('k' + i, [{ from: 'a', text: 'hi ' + i, ts: i }]);
  for (let i = 0; i < 300; i++) history.set('c' + i, [{ clientId: 'x' + i, ts: i }]);
  const build = () => {
    const fc = {}; for (const [k, l] of chats) if (l.length) fc[k] = l;
    const ch = {}; for (const [k, l] of history) if (l.length) ch[k] = l;
    return { accounts: { a: { n: 1 } }, social: { friends: { a: { b: 1 } }, friendChats: fc, chatHistory: ch, lastSeen: { a: 5 } }, skip: undefined, n: 3 };
  };
  let mismatches = 0;
  let first = '';
  for (let round = 0; round < 400; round++) {
    for (let e = 0; e < 1 + pick(8); e++) {
      const m = rnd() < 0.5 ? chats : history;
      const key = (m === chats ? 'k' : 'c') + pick(320);
      const op = pick(7);
      if (op === 0) { let l = m.get(key); if (!l) { l = []; m.set(key, l); } l.push({ from: 'b', text: 'msg ' + round, ts: round }); }
      else if (op === 1) { const l = m.get(key); if (l && l.length) l.splice(0, 1); }
      else if (op === 2) { const l = m.get(key); const msg = l && l.find(() => true); if (msg) { msg.text = 'edited ' + round; msg.reactions = { '❤️': ['b'] }; } }
      else if (op === 3) m.set(key, [{ from: 'z', text: 'replaced', ts: round }]);
      else if (op === 4) m.delete(key);
      else if (op === 5) { const l = m.get(key); if (l) m.set(key, l.filter((x) => x.ts % 2 === 0)); }
      else if (rnd() < 0.02) m.clear();
    }
    const doc = build();
    const full = round % 37 === 0;
    const fast = serialize(doc, 'social', caches, full);
    const truth = JSON.stringify(doc);
    if (fast !== truth) { mismatches++; if (!first) first = `round ${round}: ${fast.length} vs ${truth.length}`; }
  }
  ok('400 rounds of random edits: fast save equals JSON.stringify every time', mismatches === 0, first);
  ok('and no stale list was ever reused', caches.friendChats.misses + caches.chatHistory.misses === 0);
}

// --- 2. An untracked edit is caught by the next full save --------------------
{
  const chats = new TrackedMap([['p', [{ text: 'a' }]]]);
  const history = new TrackedMap();
  const caches = { friendChats: listCache(chats), chatHistory: listCache(history) };
  const doc = () => ({ social: { friendChats: Object.fromEntries(chats.entries()), chatHistory: {} } });
  const stale = chats.get('p');
  serialize(doc(), 'social', caches, false);
  serialize(doc(), 'social', caches, false);
  serialize(doc(), 'social', caches, false);
  stale.push({ text: 'b' }); // no get/set: invisible to tracking
  const fast = serialize(doc(), 'social', caches, false);
  const fullOut = serialize(doc(), 'social', caches, true);
  ok('a change made through a long-held reference is missed by a fast save', !fast.includes('"b"'));
  ok('the next full save writes it', fullOut === JSON.stringify(doc()));
  ok('and counts it, so it shows up on the dashboard', caches.friendChats.misses === 1);
}

// --- 3. The real store, in a child process ------------------------------------
{
  const STORE = path.join(__dirname, '..', 'server', 'store.js');
  const DOC_JSON = path.join(__dirname, '..', 'server', 'doc-json.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-fastsave-'));
  const run = (body) => execFileSync(process.execPath, ['-e', `
    const store = require(${JSON.stringify(STORE)});
    const { TrackedMap } = require(${JSON.stringify(DOC_JSON)});
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      await store.ready;
      const chats = new TrackedMap(Object.entries((store.data.social || {}).friendChats || {}));
      const history = new TrackedMap(Object.entries((store.data.social || {}).chatHistory || {}));
      const provider = () => ({
        friends: {}, blocks: {}, notifications: {},
        friendChats: Object.fromEntries([...chats].filter(([, l]) => l.length)),
        chatHistory: Object.fromEntries([...history].filter(([, l]) => l.length)),
      });
      store.setSocialProvider(provider, { friendChats: chats, chatHistory: history });
      ${body}
      process.exit(0);
    })().catch((e) => { console.error('THREW', e.stack); process.exit(3); });
  `], { env: { ...process.env, DATA_DIR: dir, DATABASE_URL: '' }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const disk = () => JSON.parse(fs.readFileSync(path.join(dir, 'owner-data.json'), 'utf8'));

  run(`
    for (let i = 0; i < 2000; i++) chats.set('pair' + i, [{ from: 'a', text: 'hello ' + i, ts: i }]);
    store.markSocialDirty();
    store.persistNow();
    // Routine (background) saves after small changes.
    for (let r = 0; r < 3; r++) {
      chats.get('pair' + r).push({ from: 'b', text: 'reply ' + r, ts: 9000 + r });
      history.set('me', [{ clientId: 'x', ts: r }]);
      store.markSocialDirty();
      await sleep(2600);
    }
  `);
  let d = disk();
  ok('background saves reach the disk', d.social.friendChats.pair2 && d.social.friendChats.pair2.length === 2, JSON.stringify(d.social.friendChats.pair2));
  ok('unchanged chats are kept', Object.keys(d.social.friendChats).length === 2000 && d.social.friendChats.pair1999[0].text === 'hello 1999');
  ok('no temporary files are left behind', fs.readdirSync(dir).filter((f) => f.includes('.tmp')).length === 0, fs.readdirSync(dir));

  // A background write still in flight must never land over a newer save.
  run(`
    chats.get('pair0').push({ from: 'a', text: 'old', ts: 1 });
    store.markSocialDirty();
    await sleep(2100);          // the debounced (background) save has started
    chats.get('pair0').push({ from: 'a', text: 'newest', ts: 2 });
    store.markSocialDirty();
    store.persistNow();         // synchronous, newer
    await sleep(1500);          // let the background write finish
  `);
  d = disk();
  const last = d.social.friendChats.pair0[d.social.friendChats.pair0.length - 1];
  ok('a newer synchronous save is never replaced by an older background one', last.text === 'newest', JSON.stringify(last));

  // A restart reads back the same thing.
  const out = run(`console.log(JSON.stringify(store.data.social.friendChats.pair0.map((m) => m.text)));`);
  ok('a restart loads exactly what was saved', out.trim() === JSON.stringify(d.social.friendChats.pair0.map((m) => m.text)), out);
  fs.rmSync(dir, { recursive: true, force: true });
}

console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
