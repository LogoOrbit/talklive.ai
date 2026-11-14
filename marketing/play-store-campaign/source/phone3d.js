// Studio-lit 3D Android phone(s) with the real app screen as the display.
// Units: millimetres. Placement is given in canvas pixels so layouts stay 2D-friendly.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const SCREEN_ASPECT = 871 / 392; // 392 x 871 dp
const BEZEL = 1.55, BEZEL_V = 1.7;
const SCREEN_W = 70.6, SCREEN_H = SCREEN_W * SCREEN_ASPECT;
const W = SCREEN_W + 2 * BEZEL, H = SCREEN_H + 2 * BEZEL_V;
const SCREEN_R = 7.6, R = SCREEN_R + BEZEL + 0.35;
const T = 8.4, EDGE = 1.35; // thickness and edge rounding
export const PHONE = { W, H, T, SCREEN_W, SCREEN_H };

function rrect(w, h, r, ox = 0, oy = 0) {
  const s = new THREE.Shape(), x = ox - w / 2, y = oy - h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, 1.5 * Math.PI, false);
  return s;
}

function planarUV(geo, w, h) {
  const p = geo.attributes.position, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) / w + 0.5; uv[i * 2 + 1] = p.getY(i) / h + 0.5; }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

const FRAMES = {
  graphite: { color: 0x7a7f8a, rough: 0.3, glass: 0x050608 },
  obsidian: { color: 0x4a4e58, rough: 0.28, glass: 0x040506 },
  silver: { color: 0xdfe3ea, rough: 0.24, glass: 0x07080a },
  porcelain: { color: 0xe9e6df, rough: 0.3, glass: 0x07080a },
};

function buildEnv(renderer, lights) {
  const env = new THREE.Scene();
  // Room: a vertical gradient, as a studio cyclorama reads in reflections.
  const geo = new THREE.SphereGeometry(300, 48, 24);
  const top = new THREE.Color(lights.top ?? 0x20242e), bot = new THREE.Color(lights.bottom ?? 0x020203);
  const col = [];
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = Math.pow((pos.getY(i) / 300 + 1) / 2, lights.curve ?? 1.6);
    const c = bot.clone().lerp(top, t); col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  env.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  for (const L of lights.boxes) {
    const c = new THREE.Color(L.color).multiplyScalar(L.intensity);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(L.w, L.h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
    m.position.set(...L.pos); m.lookAt(0, 0, 0);
    if (L.roll) m.rotateZ(L.roll);
    env.add(m);
  }
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(env, 0.02, 0.1, 1000).texture;
  pm.dispose();
  return tex;
}

export const LIGHTS = {
  dark: {
    top: 0x262b38, bottom: 0x030406,
    boxes: [
      { color: 0xffffff, intensity: 3.2, w: 220, h: 70, pos: [-40, 170, 90] },   // overhead key
      { color: 0x29def1, intensity: 3.6, w: 40, h: 260, pos: [170, 0, 70] },    // cyan strip, right-front
      { color: 0x6c5ce7, intensity: 3.4, w: 40, h: 260, pos: [-170, 0, 70] },   // violet strip, left-front
      { color: 0x9fd8ff, intensity: 2.2, w: 30, h: 260, pos: [150, 0, -120] },  // back rims
      { color: 0x8f86ff, intensity: 2.0, w: 30, h: 260, pos: [-150, 0, -120] },
      { color: 0x1563f5, intensity: 1.4, w: 260, h: 50, pos: [0, -170, 80] },   // floor bounce
      { color: 0xffffff, intensity: 0.5, w: 200, h: 160, pos: [0, 40, 280] },   // front fill
    ],
  },
  light: {
    top: 0xf4f6fb, bottom: 0x9aa1b2, curve: 1.2,
    boxes: [
      { color: 0xffffff, intensity: 3.0, w: 240, h: 80, pos: [-40, 170, 90] },
      { color: 0xffffff, intensity: 2.4, w: 40, h: 260, pos: [170, 0, 70] },
      { color: 0xe4e9ff, intensity: 2.0, w: 40, h: 260, pos: [-170, 0, 70] },
      { color: 0xffffff, intensity: 1.2, w: 200, h: 160, pos: [0, 40, 280] },
      { color: 0x7d93d8, intensity: 0.6, w: 260, h: 50, pos: [0, -170, 80] },
    ],
  },
  gold: {
    top: 0x2a2520, bottom: 0x040305,
    boxes: [
      { color: 0xfff3dc, intensity: 3.2, w: 220, h: 70, pos: [-40, 170, 90] },
      { color: 0xffc35a, intensity: 3.8, w: 40, h: 260, pos: [170, 0, 70] },
      { color: 0x7a6cf0, intensity: 3.0, w: 40, h: 260, pos: [-170, 0, 70] },
      { color: 0xffd28a, intensity: 2.0, w: 30, h: 260, pos: [150, 0, -120] },
      { color: 0xffffff, intensity: 0.5, w: 200, h: 160, pos: [0, 40, 280] },
    ],
  },
};

async function buildPhone(renderer, opts) {
  const f = FRAMES[opts.frame || 'graphite'];
  const g = new THREE.Group();
  const metal = new THREE.MeshPhysicalMaterial({ color: f.color, metalness: 1, roughness: f.rough, clearcoat: 0.4, clearcoatRoughness: 0.2, envMapIntensity: opts.metalEnv ?? 1 });
  const glass = new THREE.MeshPhysicalMaterial({ color: f.glass, metalness: 0, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1 });

  // Body: flat front and back, rounded frame.
  const depth = T - 2 * EDGE;
  const body = new THREE.ExtrudeGeometry(rrect(W - 2 * EDGE, H - 2 * EDGE, R - EDGE), {
    depth, bevelEnabled: true, bevelThickness: EDGE, bevelSize: EDGE, bevelSegments: 10, curveSegments: 64,
  });
  body.translate(0, 0, -depth / 2);
  const cutout = !!opts.hole;
  // hole: render only the device (frame, bezel, camera); the display area stays transparent.
  const capMat = cutout ? new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }) : glass;
  g.add(new THREE.Mesh(body, [capMat, metal]));

  // Glass face inset into the frame (covers the bevel crown so the metal reads as a thin band).
  const faceShape = rrect(W - 0.5, H - 0.5, R - 0.25);
  if (cutout) {
    const inner = rrect(SCREEN_W, SCREEN_H, SCREEN_R);
    faceShape.holes.push(new THREE.Path(inner.getPoints(64).reverse()));
  }
  const faceGeo = new THREE.ShapeGeometry(faceShape, 64);
  const face = new THREE.Mesh(faceGeo, glass);
  face.position.z = T / 2 + 0.01;
  g.add(face);

  // Display.
  if (!cutout) {
  const tex = await new THREE.TextureLoader().loadAsync(opts.screen);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  // Exact UI colours. An optional faint glass sheen is added in linear light, before
  // output encoding (blending encoded sRGB would lift every pixel).
  const scrMat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  const sheen = opts.sheen ?? 0;
  if (sheen > 0) {
    scrMat.onBeforeCompile = (sh) => {
      sh.uniforms.uSheen = { value: sheen };
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uSheen;')
        .replace('#include <colorspace_fragment>', `{
          float d = vMapUv.x * 0.75 - vMapUv.y;
          float band = exp(-pow((d + 0.05) / 0.24, 2.0)) + 0.45 * exp(-pow((d + 0.42) / 0.07, 2.0));
          gl_FragColor.rgb += uSheen * band * (1.0 - gl_FragColor.rgb);
        }
        #include <colorspace_fragment>`);
    };
  }
  const scr = new THREE.Mesh(planarUV(new THREE.ShapeGeometry(rrect(SCREEN_W, SCREEN_H, SCREEN_R), 64), SCREEN_W, SCREEN_H), scrMat);
  scr.position.z = T / 2 + 0.03;
  g.add(scr);
  }

  // Punch-hole camera.
  const camY = SCREEN_H / 2 - (18 / 392) * SCREEN_W;
  const hole = new THREE.Mesh(new THREE.CircleGeometry(1.2, 48), new THREE.MeshBasicMaterial({ color: 0x010102, toneMapped: false }));
  hole.position.set(0, camY, T / 2 + 0.05); g.add(hole);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.86, 48), new THREE.MeshBasicMaterial({ color: 0x15171d, toneMapped: false }));
  ring.position.set(0, camY, T / 2 + 0.06); g.add(ring);
  const glint = new THREE.Mesh(new THREE.CircleGeometry(0.18, 24), new THREE.MeshBasicMaterial({ color: 0x3a4766, transparent: true, opacity: 0.8, toneMapped: false }));
  glint.position.set(-0.28, camY + 0.28, T / 2 + 0.07); g.add(glint);

  // Side keys (right): power, then volume.
  const key = (len, y) => {
    const k = new THREE.Mesh(new RoundedBoxGeometry(1.4, len, 2.4, 4, 0.55), metal);
    k.position.set(W / 2 + 0.25, y, 0); g.add(k);
  };
  key(11, H * 0.16);
  key(20, H * 0.31 - 15 - 2);

  // Antenna lines across the frame.
  const band = new THREE.MeshPhysicalMaterial({ color: opts.frame === 'silver' || opts.frame === 'porcelain' ? 0xb9bec9 : 0x16181d, roughness: 0.5, metalness: 0.2 });
  for (const [x, y, w, h] of [[W / 2 - 0.02, H * 0.42, 0.25, 1.1], [-W / 2 + 0.02, H * 0.42, 0.25, 1.1], [W * 0.3, -H / 2 + 0.02, 1.1, 0.25], [-W * 0.3, H / 2 - 0.02, 1.1, 0.25]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, T - 2.6), band);
    b.position.set(x, y, 0); g.add(b);
  }
  return g;
}

/**
 * cfg: { width, height, scale, fov, lights: 'dark'|'light'|'gold', exposure,
 *        phones: [{ screen, cx, cy, h, rx, ry, rz, z, frame, glare }] }
 */
export async function renderPhones(canvas, cfg) {
  const { width, height, scale = 2, fov = 18 } = cfg;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width * scale, height * scale, false);
  canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = cfg.exposure ?? 1.0;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const L = typeof cfg.lights === 'object' ? cfg.lights : LIGHTS[cfg.lights || 'dark'];
  scene.environment = buildEnv(renderer, L);

  const D = 1000;
  const cam = new THREE.PerspectiveCamera(fov, width / height, 10, 5000);
  cam.position.set(0, 0, D); cam.lookAt(0, 0, 0);
  const visH = 2 * D * Math.tan(THREE.MathUtils.degToRad(fov / 2));
  const k = visH / height; // world units per px at z = 0

  for (const p of cfg.phones) {
    const ph = await buildPhone(renderer, p);
    const s = (p.h * k) / H;
    ph.scale.setScalar(s);
    ph.rotation.order = p.order || 'YXZ';
    ph.rotation.set(THREE.MathUtils.degToRad(p.rx || 0), THREE.MathUtils.degToRad(p.ry || 0), THREE.MathUtils.degToRad(p.rz || 0));
    const z = (p.z || 0) * k;
    // Keep the requested on-canvas centre even when pushed back in depth.
    const f = (D - z) / D;
    ph.position.set((p.cx - width / 2) * k * f, (height / 2 - p.cy) * k * f, z);
    scene.add(ph);
  }
  renderer.render(scene, cam);
  return renderer;
}
