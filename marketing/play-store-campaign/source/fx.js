// Procedural light and line work, drawn in canvas px (1080 x 1920 logical).
const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

// A soft light: gaussian falloff with many stops (no banding), optional ellipse and rotation.
function glow(c, e) {
  c.save();
  c.translate(e.cx, e.cy);
  if (e.rot) c.rotate((e.rot * Math.PI) / 180);
  c.scale(1, (e.ry || e.r) / e.r);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, e.r);
  const k = e.falloff || 2.4;
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    g.addColorStop(t, rgba(e.color, e.alpha * Math.exp(-Math.pow(t * k, 2))));
  }
  c.globalCompositeOperation = e.blend || 'source-over';
  c.fillStyle = g;
  c.fillRect(-e.r, -e.r, 2 * e.r, 2 * e.r);
  c.restore();
}

// Concentric rings fading with distance: the call's pulse carried into the room.
function rings(c, e) {
  c.save();
  c.globalCompositeOperation = e.blend || 'source-over';
  for (let i = 0; i < e.n; i++) {
    const r = e.r0 + i * e.step * Math.pow(1 + (e.grow || 0), i);
    const t = i / Math.max(1, e.n - 1);
    const a = e.alpha * Math.pow(1 - t, e.fade || 1.6);
    c.beginPath(); c.arc(e.cx, e.cy, r, 0, Math.PI * 2);
    if (e.colors) {
      const g = c.createLinearGradient(e.cx - r, e.cy - r, e.cx + r, e.cy + r);
      g.addColorStop(0, rgba(e.colors[0], a)); g.addColorStop(1, rgba(e.colors[1], a));
      c.strokeStyle = g;
    } else c.strokeStyle = rgba(e.color, a);
    c.lineWidth = e.width || 1.2;
    c.stroke();
  }
  c.restore();
}

// A planet's lit horizon: dark body, fine graticule, a thin bright rim and atmosphere.
function planet(c, e) {
  const { cx, cy, r } = e;
  c.save();
  // Atmosphere outside the rim.
  const atm = c.createRadialGradient(cx, cy, r * 0.985, cx, cy, r + e.atm);
  for (let i = 0; i <= 16; i++) { const t = i / 16; atm.addColorStop(t, rgba(e.atmColor, e.atmAlpha * Math.pow(1 - t, 2.2))); }
  c.fillStyle = atm; c.beginPath(); c.arc(cx, cy, r + e.atm, 0, Math.PI * 2); c.fill();
  // Body.
  const body = c.createLinearGradient(0, cy - r, 0, cy - r + e.bodyDepth);
  body.addColorStop(0, e.bodyTop); body.addColorStop(1, e.bodyBottom);
  c.fillStyle = body; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
  // Graticule (orthographic, tilted toward the viewer), clipped to the disc.
  c.save(); c.beginPath(); c.arc(cx, cy, r - 1, 0, Math.PI * 2); c.clip();
  const tilt = (e.tilt || 24) * Math.PI / 180, spin = (e.spin || 0) * Math.PI / 180;
  const proj = (lat, lon) => {
    const x = Math.cos(lat) * Math.sin(lon + spin), y = Math.sin(lat), z = Math.cos(lat) * Math.cos(lon + spin);
    const y2 = y * Math.cos(tilt) - z * Math.sin(tilt), z2 = y * Math.sin(tilt) + z * Math.cos(tilt);
    return [cx + x * r, cy - y2 * r, z2];
  };
  c.lineWidth = e.gridWidth || 1;
  const line = (pts) => {
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0, z0] = pts[i - 1], [x1, y1, z1] = pts[i];
      if (z0 < 0 || z1 < 0) continue;
      const depth = 1 - ((y0 + y1) / 2 - (cy - r)) / e.gridFade;
      const a = e.gridAlpha * Math.max(0, Math.min(1, depth)) * Math.min(1, (z0 + z1) * 1.4);
      if (a <= 0.002) continue;
      c.strokeStyle = rgba(e.gridColor, a);
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    }
  };
  for (let lat = -80; lat <= 80; lat += 10) {
    const pts = []; for (let lon = -180; lon <= 180; lon += 2) pts.push(proj(lat * Math.PI / 180, lon * Math.PI / 180)); line(pts);
  }
  for (let lon = -180; lon < 180; lon += 12) {
    const pts = []; for (let lat = -90; lat <= 90; lat += 2) pts.push(proj(lat * Math.PI / 180, lon * Math.PI / 180)); line(pts);
  }
  c.restore();
  // Rim light: brightest at the top, falling off around the curve.
  const steps = 240, a0 = -Math.PI / 2 - e.rimSpan, a1 = -Math.PI / 2 + e.rimSpan;
  for (let pass = 0; pass < 2; pass++) {
    c.lineWidth = pass ? e.rimWidth : e.rimWidth * 7;
    for (let i = 0; i < steps; i++) {
      const t0 = a0 + (a1 - a0) * (i / steps), t1 = a0 + (a1 - a0) * ((i + 1) / steps);
      const m = (i + 0.5) / steps, w = Math.pow(Math.sin(m * Math.PI), 1.6);
      c.strokeStyle = rgba(m < 0.5 ? e.rimColorA : e.rimColorB, (pass ? e.rimAlpha : e.rimAlpha * 0.18) * w);
      c.beginPath(); c.arc(cx, cy, r, t0, t1 + 0.002); c.stroke();
    }
  }
  c.restore();
}

// A wide, soft diagonal shaft of light.
function beam(c, e) {
  c.save();
  c.translate(e.cx, e.cy); c.rotate((e.rot * Math.PI) / 180);
  const g = c.createLinearGradient(-e.w / 2, 0, e.w / 2, 0);
  for (let i = 0; i <= 16; i++) { const t = i / 16; g.addColorStop(t, rgba(e.color, e.alpha * Math.exp(-Math.pow((t - 0.5) * 4.2, 2)))); }
  const lg = c.createLinearGradient(0, -e.len / 2, 0, e.len / 2);
  c.fillStyle = g;
  c.globalCompositeOperation = e.blend || 'source-over';
  c.beginPath(); c.rect(-e.w / 2, -e.len / 2, e.w, e.len);
  c.globalAlpha = 1;
  c.fill();
  c.restore();
}

// An image (app artwork) with optional blur for depth of field.
async function image(c, e) {
  const img = new Image(); img.src = e.src; await img.decode();
  c.save();
  c.globalAlpha = e.alpha ?? 1;
  if (e.blur) c.filter = `blur(${e.blur}px)`;
  c.drawImage(img, e.x - e.w / 2, e.y - e.w / 2, e.w, e.w * (img.height / img.width));
  c.restore();
}

export async function drawFx(c, e) {
  if (e.type === 'glow') glow(c, e);
  else if (e.type === 'rings') rings(c, e);
  else if (e.type === 'planet') planet(c, e);
  else if (e.type === 'beam') beam(c, e);
  else if (e.type === 'image') await image(c, e);
}
