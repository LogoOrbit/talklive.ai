// Copies the website's icebreaker deck (public/icebreakers.js) into the app as
// res/raw/icebreakers.json, so both ask the same questions.
//
//   node android-native/tools/gen-icebreakers.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..', '..');
let src = fs.readFileSync(path.join(root, 'public', 'icebreakers.js'), 'utf8');
const exportLine = 'window.TalkLiveIcebreakers = { draw: draw };';
if (!src.includes(exportLine)) throw new Error('icebreakers.js export changed; update this script');
src = src.replace(exportLine, 'window.TalkLiveIcebreakers = { draw: draw, pool: buildPool };');
const sandbox = { window: {}, Math };
vm.runInNewContext(src, sandbox);
const pool = sandbox.window.TalkLiveIcebreakers.pool()
  .map((q) => ({ e: q.emoji, t: q.text }))
  .sort((a, b) => a.t.localeCompare(b.t));
const out = path.join(__dirname, '..', 'app', 'src', 'main', 'res', 'raw', 'icebreakers.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(pool));
console.log(`wrote ${pool.length} icebreakers`);
