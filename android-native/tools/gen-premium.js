// The TalkLive Plus collection for Android, from the same scenes the website
// draws (public/premium-avatars.js + public/premium-art.js):
//   res/drawable/premium_<id>.xml       the still portrait (VectorDrawable)
//   res/drawable/premium_<id>_live.xml  its idle loop (AnimatedVectorDrawable,
//                                       played by Android on the render thread)
//   ui/animals/PremiumFaces.kt          the list, and still -> loop map
//
//   node android-native/tools/gen-premium.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..', '..');
const sandbox = { window: {} };
sandbox.globalThis = sandbox.window;
for (const f of ['premium-avatars.js', 'premium-art.js']) vm.runInNewContext(fs.readFileSync(path.join(root, 'public', f), 'utf8'), sandbox);
const P = sandbox.window.TalkLivePremium;
const resDir = path.join(__dirname, '..', 'app', 'src', 'main', 'res', 'drawable');
const ktFile = path.join(__dirname, '..', 'app', 'src', 'main', 'java', 'app', 'talklive', 'ui', 'animals', 'PremiumFaces.kt');
const KEYS = P.KEYS;
const EASE = '@android:interpolator/accelerate_decelerate';
const LIN = '@android:interpolator/linear';
const PROP = { rot: ['rotation'], tx: ['translateX'], ty: ['translateY'], sc: ['scaleX', 'scaleY'], sx: ['scaleX'], sy: ['scaleY'] };
const num = (v) => +(+v).toFixed(4);

function color(c, alpha) {
  if (/^#[0-9a-f]{3}$/i.test(c)) c = '#' + c.slice(1).split('').map((x) => x + x).join('');
  if (!/^#[0-9a-f]{6}$/i.test(c)) throw new Error('unsupported colour ' + c);
  const a = alpha == null ? 1 : alpha;
  return '#' + Math.round(a * 255).toString(16).padStart(2, '0').toUpperCase() + c.slice(1).toUpperCase();
}
function gradientXml(g) {
  const items = g.s.map((st) => `<item android:offset="${st[0]}" android:color="${color(st[1], st[2])}" />`).join('');
  if (g.t === 'l') return `<gradient android:type="linear" android:startX="${g.x1}" android:startY="${g.y1}" android:endX="${g.x2}" android:endY="${g.y2}">${items}</gradient>`;
  return `<gradient android:type="radial" android:centerX="${g.cx}" android:centerY="${g.cy}" android:gradientRadius="${g.r}">${items}</gradient>`;
}

function animators(a, paths) {
  const [kind, v1, v2, secs, delay = 0] = a;
  const dur = Math.round(secs * 1000);
  const K = KEYS[kind];
  if (kind === 'spin') {
    // The phase is folded into the angles: no start delay, nothing waits.
    const phase = ((-delay / secs) % 1 + 1) % 1 * 360;
    return [{ group: true, xml: `<objectAnimator android:propertyName="rotation" android:valueFrom="${num(v1 + phase)}" android:valueTo="${num(v2 + phase)}" android:valueType="floatType" android:duration="${dur}" android:repeatCount="infinite" android:repeatMode="restart" android:interpolator="${LIN}" />` }];
  }
  const start = delay > 0 ? ` android:startOffset="${Math.round(delay * 1000)}"` : '';
  const prop = K ? K.p : kind;
  const value = (f) => (K ? (prop === 'sy' || prop === 'sc' || prop === 'op'
    ? (/^(tw|fade|blink|blink2|slow|pulse)$/.test(kind) ? f : 1 + (f - 1) * v1) : f * v1) : f);
  const holder = (name, base) => {
    const b = base == null ? 1 : base;
    if (!K) return `<propertyValuesHolder android:propertyName="${name}" android:valueFrom="${num(v1 * b)}" android:valueTo="${num(v2 * b)}" android:valueType="floatType" />`;
    const frames = K.k.map(([fr, f]) => `<keyframe android:fraction="${fr}" android:value="${num(value(f) * b)}" android:valueType="floatType" android:interpolator="${K.lin ? LIN : EASE}" />`).join('');
    return `<propertyValuesHolder android:propertyName="${name}" android:valueType="floatType">${frames}</propertyValuesHolder>`;
  };
  const repeat = K ? 'android:repeatCount="infinite" android:repeatMode="restart"' : 'android:repeatCount="infinite" android:repeatMode="reverse"';
  const interp = K ? '' : ` android:interpolator="${EASE}"`;
  if (prop === 'op') {
    // A VectorDrawable group has no alpha: each path fades from its own resting alpha.
    return paths.map((p) => ({ target: p.name, xml: `<objectAnimator android:duration="${dur}"${start} ${repeat}${interp}>${p.alpha.map((x) => holder(x.prop, x.base)).join('')}</objectAnimator>` }));
  }
  return [{ group: true, xml: `<objectAnimator android:duration="${dur}"${start} ${repeat}${interp}>${PROP[prop].map((n) => holder(n)).join('')}</objectAnimator>` }];
}

function build(key, live) {
  const sc = P.scene(key);
  let seq = 0;
  const targets = [];
  // Paths under each open 'op' animation, so the fade can address them.
  function pathXml(sh, ctx) {
    const props = [`android:pathData="${sh.d}"`];
    let inner = '';
    const alpha = sh.o == null ? 1 : sh.o;
    const name = ctx.fading.length ? `p${seq++}` : null;
    if (name) props.unshift(`android:name="${name}"`);
    const rec = name ? { name, alpha: [] } : null;
    if (sh.f) {
      if (sh.f[0] === '@') inner += `<aapt:attr name="android:fillColor">${gradientXml(sc.defs[sh.f.slice(1)])}</aapt:attr>`;
      else props.push(`android:fillColor="${color(sh.f)}"`);
      const base = ctx.hideFade ? 0 : alpha;
      if (alpha !== 1 || ctx.hideFade) props.push(`android:fillAlpha="${base}"`);
      if (rec) rec.alpha.push({ prop: 'fillAlpha', base: alpha });
    }
    if (sh.s) {
      if (sh.s[0] === '@') inner += `<aapt:attr name="android:strokeColor">${gradientXml(sc.defs[sh.s.slice(1)])}</aapt:attr>`;
      else props.push(`android:strokeColor="${color(sh.s)}"`);
      props.push(`android:strokeWidth="${sh.w}"`, `android:strokeLineCap="${sh.lc || 'round'}"`, 'android:strokeLineJoin="round"');
      if (alpha !== 1 || ctx.hideFade) props.push(`android:strokeAlpha="${ctx.hideFade ? 0 : alpha}"`);
      if (rec) rec.alpha.push({ prop: 'strokeAlpha', base: alpha });
    }
    if (rec) ctx.fading.forEach((list) => list.push(rec));
    return inner ? `<path ${props.join(' ')}>${inner}</path>` : `<path ${props.join(' ')} />`;
  }
  function nodeXml(node, ctx) {
    if (node.d) return pathXml(node, ctx);
    if (node.fx && !live) return '';
    const anims = live && node.a ? node.a : [];
    const opAnims = anims.filter((a) => (KEYS[a[0]] ? KEYS[a[0]].p : a[0]) === 'op');
    const fadeIn = opAnims.some((a) => a[0] === 'fade');
    const lists = opAnims.map(() => []);
    const cctx = { fading: ctx.fading.concat(lists), hideFade: ctx.hideFade || fadeIn };
    let inner = node.c.map((c) => nodeXml(c, cctx)).join('');
    if (node.clip) inner = `<group><clip-path android:pathData="${node.clip}" />${inner}</group>`;
    const o = node.o || [64, 64];
    opAnims.forEach((a, i) => {
      for (const t of animators(a, lists[i])) targets.push({ name: t.target, xml: t.xml });
    });
    for (let i = anims.length - 1; i >= 0; i--) {
      const a = anims[i];
      if ((KEYS[a[0]] ? KEYS[a[0]].p : a[0]) === 'op') continue;
      const name = `g${seq++}`;
      for (const t of animators(a, [])) targets.push({ name, xml: t.xml });
      // A twinkle starts shrunk to nothing, so it is invisible until its first beat.
      const startScale = a[0] === 'tw' ? ' android:scaleX="0.01" android:scaleY="0.01"' : '';
      inner = `<group android:name="${name}" android:pivotX="${o[0]}" android:pivotY="${o[1]}"${startScale}>${inner}</group>`;
    }
    if (node.t) {
      const t = node.t;
      const px = t.px || 0, py = t.py || 0;
      const sx = t.sx == null ? (t.s == null ? 1 : t.s) : t.sx;
      const sy = t.sy == null ? (t.s == null ? 1 : t.s) : t.sy;
      inner = `<group android:pivotX="${px}" android:pivotY="${py}" android:translateX="${t.x || 0}" android:translateY="${t.y || 0}" android:rotation="${t.r || 0}" android:scaleX="${sx}" android:scaleY="${sy}">${inner}</group>`;
    }
    return inner;
  }
  const body = nodeXml(sc.tree, { fading: [], hideFade: false });
  const vector = `<vector xmlns:android="http://schemas.android.com/apk/res/android" xmlns:aapt="http://schemas.android.com/aapt" android:width="64dp" android:height="64dp" android:viewportWidth="128" android:viewportHeight="128">${body}</vector>`;
  const head = '<?xml version="1.0" encoding="utf-8"?>\n<!-- Generated by tools/gen-premium.js from public/premium-art.js. Do not edit. -->\n';
  if (!live) return head + vector + '\n';
  const byName = new Map();
  for (const t of targets) { if (!byName.has(t.name)) byName.set(t.name, []); byName.get(t.name).push(t.xml); }
  const tx = [...byName].map(([n, xs]) => `<target android:name="${n}"><aapt:attr name="android:animation"><set android:ordering="together">${xs.join('')}</set></aapt:attr></target>`).join('\n');
  return head + `<animated-vector xmlns:android="http://schemas.android.com/apk/res/android" xmlns:aapt="http://schemas.android.com/aapt"><aapt:attr name="android:drawable">${vector.replace(/ xmlns:android="[^"]+" xmlns:aapt="[^"]+"/, '')}</aapt:attr>\n${tx}\n</animated-vector>\n`;
}

const res = (key) => 'premium_' + key.replace(':', '_');
for (const f of fs.readdirSync(resDir)) if (/^premium_.*\.xml$/.test(f)) fs.unlinkSync(path.join(resDir, f));
const rows = [], live = [];
for (const key of P.keys()) {
  const m = P.meta(key);
  fs.writeFileSync(path.join(resDir, res(key) + '.xml'), build(key, false));
  fs.writeFileSync(path.join(resDir, res(key) + '_live.xml'), build(key, true));
  const id = key.startsWith('a:') ? key.slice(2) : key;
  rows.push(`    Animal(${JSON.stringify(id)}, ${JSON.stringify(m.name)}, ${JSON.stringify(m.trait || '')}, Color(0xFF${m.color.slice(1).toUpperCase()}), R.drawable.${res(key)}, premium = true),`);
  live.push(`    R.drawable.${res(key)} to R.drawable.${res(key)}_live,`);
}
fs.writeFileSync(ktFile, `// Generated by tools/gen-premium.js from public/premium-art.js. Do not edit.
package app.talklive.ui.animals

import androidx.compose.ui.graphics.Color
import app.talklive.R

/**
 * The TalkLive Plus collection: every redesigned and new animal and character,
 * each a detailed portrait on its own lit tile with its own idle loop. Animals
 * have a bare id ("lion"), characters "c:<id>", as on the website.
 */
val PremiumFaces: List<Animal> = listOf(
${rows.join('\n')}
)

/** Each premium still -> its loop (an AnimatedVectorDrawable). */
val PremiumLive: Map<Int, Int> = mapOf(
${live.join('\n')}
)
`);
console.log(`wrote ${rows.length} premium faces`);
