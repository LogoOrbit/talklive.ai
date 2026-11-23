// Living avatars for Android: one AnimatedVectorDrawable per spirit animal and
// character, from the same motions the website plays (public/avatar-motion.js).
// Android runs these on its render thread, so a screen full of moving faces
// costs the app's main thread nothing.
//
//   node android-native/tools/gen-live-motion.js   (after gen-animals.js and gen-characters.js)
//
// Writes res/drawable/<face>_live.xml (and <character>_bare_live.xml for the
// Plus scene versions) and ui/animals/LiveAvatars.kt.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { toVector } = require('./gen-animals');

const root = path.join(__dirname, '..', '..');
const sandbox = { window: {} };
sandbox.globalThis = sandbox.window;
for (const f of ['animals.js', 'characters.js', 'avatar-motion.js']) vm.runInNewContext(fs.readFileSync(path.join(root, 'public', f), 'utf8'), sandbox);
const Animals = sandbox.window.TalkLiveAnimals;
const Characters = sandbox.window.TalkLiveCharacters;
const Motion = sandbox.window.TalkLiveMotion;
const resDir = path.join(__dirname, '..', 'app', 'src', 'main', 'res', 'drawable');
const ktFile = path.join(__dirname, '..', 'app', 'src', 'main', 'java', 'app', 'talklive', 'ui', 'animals', 'LiveAvatars.kt');

// One shape as vector XML lines (toVector writes a whole <vector>; keep its body).
function shapeXml(svg) {
  const xml = toVector(svg);
  return xml.slice(xml.indexOf('>', xml.indexOf('<vector')) + 1, xml.lastIndexOf('</vector>')).trim();
}
const indent = (s, n) => s.split('\n').map((l) => ' '.repeat(n) + l.trim()).join('\n');
const PROP = { rot: ['rotation'], tx: ['translateX'], ty: ['translateY'], sc: ['scaleX', 'scaleY'], sx: ['scaleX'], sy: ['scaleY'] };
const EASE = '@android:interpolator/accelerate_decelerate';
const LIN = '@android:interpolator/linear';

function animator(a, paths) {
  const [kind, v1, v2, secs, delay = 0] = a;
  const dur = Math.round(secs * 1000);
  const K = Motion.keys[kind];
  if (kind === 'spin') {
    // The phase is built into the angles: no start delay, so nothing waits stacked.
    const phase = ((-delay / secs) % 1 + 1) % 1 * 360;
    return [{ target: null, xml: `<objectAnimator android:propertyName="rotation" android:valueFrom="${(v1 + phase).toFixed(1)}" android:valueTo="${(v2 + phase).toFixed(1)}" android:valueType="floatType" android:duration="${dur}" android:repeatCount="infinite" android:repeatMode="restart" android:interpolator="${LIN}" />` }];
  }
  const start = delay > 0 ? ` android:startOffset="${Math.round(delay * 1000)}"` : '';
  const prop = K ? K.p : kind;
  const value = (f) => (K ? (prop === 'sy' || prop === 'sc' || prop === 'op'
    ? (/^(tw|fade|blink|blink2|slow)$/.test(kind) ? f : 1 + (f - 1) * v1) : f * v1) : f);
  const holders = (names, alphaBase) => names.map((n) => {
    if (!K) {
      const from = alphaBase != null ? v1 * alphaBase : v1;
      const to = alphaBase != null ? v2 * alphaBase : v2;
      return `<propertyValuesHolder android:propertyName="${n}" android:valueFrom="${+from.toFixed(4)}" android:valueTo="${+to.toFixed(4)}" android:valueType="floatType" />`;
    }
    const frames = K.k.map(([fr, f]) => {
      const v = value(f) * (alphaBase != null ? alphaBase : 1);
      return `<keyframe android:fraction="${fr}" android:value="${+v.toFixed(4)}" android:valueType="floatType" android:interpolator="${K.lin ? LIN : EASE}" />`;
    }).join('');
    return `<propertyValuesHolder android:propertyName="${n}" android:valueType="floatType">${frames}</propertyValuesHolder>`;
  }).join('');
  const repeat = K ? 'android:repeatCount="infinite" android:repeatMode="restart"' : 'android:repeatCount="infinite" android:repeatMode="reverse"';
  const interp = K ? '' : ` android:interpolator="${EASE}"`;
  if (prop === 'op') {
    // Groups have no alpha in a VectorDrawable: fade each path, from its own resting alpha.
    return paths.map((p) => ({
      target: p.name,
      xml: `<objectAnimator android:duration="${dur}"${start} ${repeat}${interp}>${p.alpha.map((x) => holders([x.prop], x.base)).join('')}</objectAnimator>`,
    }));
  }
  return [{ target: null, xml: `<objectAnimator android:duration="${dur}"${start} ${repeat}${interp}>${holders(PROP[prop])}</objectAnimator>` }];
}

let pathSeq = 0;
// Wrap `inner` (vector XML) in one group per animation; returns { xml, targets }.
function wrap(innerShapes, o, anims, prefix, hideUntilStart) {
  // Paths are named when a fade needs them.
  const needsAlpha = anims.some((a) => (Motion.keys[a[0]] ? Motion.keys[a[0]].p : a[0]) === 'op');
  const paths = [];
  let inner = innerShapes.map((x) => {
    if (!needsAlpha) return x;
    return x.replace(/<path /g, () => {
      const name = `${prefix}_s${pathSeq++}`;
      paths.push({ name });
      return `<path android:name="${name}" `;
    });
  }).join('\n');
  if (needsAlpha) {
    // Record which alpha each named path has (fill and/or stroke) and its resting value.
    for (const p of paths) {
      const m = inner.match(new RegExp(`<path android:name="${p.name}" ([\\s\\S]*?)/>`));
      const body = m ? m[1] : '';
      p.alpha = [];
      if (/android:fillColor/.test(body)) p.alpha.push({ prop: 'fillAlpha', base: +(body.match(/android:fillAlpha="([\d.]+)"/) || [0, 1])[1] });
      if (/android:strokeColor/.test(body)) p.alpha.push({ prop: 'strokeAlpha', base: +(body.match(/android:strokeAlpha="([\d.]+)"/) || [0, 1])[1] });
      if (hideUntilStart) {
        // Particles that fade in start invisible, so nothing sits still before its first cycle.
        inner = inner.replace(new RegExp(`(<path android:name="${p.name}" )`), '$1android:fillAlpha="0" android:strokeAlpha="0" ')
          .replace(new RegExp(`(<path android:name="${p.name}" android:fillAlpha="0" android:strokeAlpha="0" [\\s\\S]*?)android:fillAlpha="[\\d.]+"`), '$1')
          .replace(new RegExp(`(<path android:name="${p.name}" android:fillAlpha="0" android:strokeAlpha="0" [\\s\\S]*?)android:strokeAlpha="[\\d.]+"`), '$1');
      }
    }
  }
  const targets = [];
  let xml = inner;
  for (let i = anims.length - 1; i >= 0; i--) {
    const a = anims[i];
    const name = `${prefix}_${i}`;
    const kind = a[0];
    const prop = Motion.keys[kind] ? Motion.keys[kind].p : kind;
    for (const t of animator(a, paths)) targets.push({ name: t.target || name, xml: t.xml });
    if (prop === 'op') continue;
    // A twinkle starts shrunk to nothing, so it is invisible until its first beat.
    const startScale = kind === 'tw' ? ' android:scaleX="0.01" android:scaleY="0.01"' : '';
    xml = `<group android:name="${name}" android:pivotX="${o[0]}" android:pivotY="${o[1]}"${startScale}>\n${xml}\n</group>`;
  }
  return { xml, targets };
}

function liveXml(id, art, dropTile) {
  const pl = Motion.plan(id, art);
  if (!pl) return null;
  pathSeq = 0;
  const list = pl.list.map(shapeXml);
  const owner = {};
  pl.groups.forEach((g, gi) => g.el.forEach((i) => { owner[i] = gi; }));
  const allSet = pl.all && pl.all.el ? new Set(pl.all.el) : null;
  const targets = [];
  let before = [], inside = [];
  const emitted = new Set();
  for (let i = 0; i < list.length; i++) {
    if (dropTile && i === 0) continue;
    let piece;
    if (owner[i] != null) {
      const gi = owner[i];
      if (emitted.has(gi)) continue;
      emitted.add(gi);
      const g = pl.groups[gi];
      const w = wrap(g.el.map((k) => list[k]), g.o, g.a, `g${gi}`);
      targets.push(...w.targets);
      piece = w.xml;
    } else piece = list[i];
    if (allSet && !allSet.has(i)) before.push(piece); else inside.push(piece);
  }
  let face = before.join('\n');
  if (pl.all) {
    const w = wrap(inside, pl.all.o, pl.all.a, 'all');
    targets.push(...w.targets);
    face += '\n' + w.xml;
  } else face += '\n' + inside.join('\n');
  pl.fx.forEach((f, fi) => {
    const fade = f.a.some((a) => a[0] === 'fade');
    const w = wrap([shapeXml(f.svg)], f.o, f.a, `fx${fi}`, fade);
    targets.push(...w.targets);
    face += '\n' + w.xml;
  });
  const vector = `<vector android:width="64dp" android:height="64dp" android:viewportWidth="64" android:viewportHeight="64">\n${indent(face, 12)}\n        </vector>`;
  // One <target> per name, all of that name's animators played together.
  const byName = new Map();
  for (const t of targets) { if (!byName.has(t.name)) byName.set(t.name, []); byName.get(t.name).push(t.xml); }
  const tx = [...byName].map(([n, xs]) => `    <target android:name="${n}">\n        <aapt:attr name="android:animation">\n            <set android:ordering="together">\n${xs.map((x) => '                ' + x).join('\n')}\n            </set>\n        </aapt:attr>\n    </target>`).join('\n');
  return `<?xml version="1.0" encoding="utf-8"?>
<!-- Generated by tools/gen-live-motion.js from public/avatar-motion.js. Do not edit. -->
<animated-vector xmlns:android="http://schemas.android.com/apk/res/android" xmlns:aapt="http://schemas.android.com/aapt">
    <aapt:attr name="android:drawable">
        ${vector}
    </aapt:attr>
${tx}
</animated-vector>
`;
}

// Old blinking-only files from gen-live-avatars.py go: every face now has its own motion.
for (const f of fs.readdirSync(resDir)) if (/_live\.xml$/.test(f)) fs.unlinkSync(path.join(resDir, f));
const rows = [];
for (const a of Animals.list) {
  const xml = liveXml(a.id, a.art(), false);
  if (!xml) continue;
  fs.writeFileSync(path.join(resDir, `animal_${a.id}_live.xml`), xml);
  rows.push(`    R.drawable.animal_${a.id} to R.drawable.animal_${a.id}_live,`);
}
for (const c of Characters.list) {
  const name = 'character_' + c.id.replace(/[^a-z0-9]/g, '_');
  const xml = liveXml(c.id, c.art(), false);
  if (!xml) continue;
  fs.writeFileSync(path.join(resDir, `${name}_live.xml`), xml);
  rows.push(`    R.drawable.${name} to R.drawable.${name}_live,`);
  if (fs.existsSync(path.join(resDir, `${name}_bare.xml`))) {
    fs.writeFileSync(path.join(resDir, `${name}_bare_live.xml`), liveXml(c.id, c.art(), true));
    rows.push(`    R.drawable.${name}_bare to R.drawable.${name}_bare_live,`);
  }
}
fs.writeFileSync(ktFile, `// Generated by tools/gen-live-motion.js. Do not edit.
package app.talklive.ui.animals

import app.talklive.R

/** Avatar drawable -> its living version (public/avatar-motion.js), for Plus members and the pickers. */
val LiveAvatars: Map<Int, Int> = mapOf(
${rows.join('\n')}
)
`);
console.log(`wrote ${rows.length} living avatars`);
