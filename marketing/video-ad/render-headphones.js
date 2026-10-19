// Renders headphones.html frame by frame at 1440x2560, 60fps.
//
//   node render-headphones.js preview 1 4.5 13      spot-check frames -> prev/
//   node render-headphones.js events                write the sound cue sheet -> audio/events.json
//   node render-headphones.js video [workers]       silent video -> out/headphones-silent.mp4
//
// Needs global Playwright, ffmpeg and a static server on the repo root (npx http-server -p 6910 -s .).
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
process.chdir(__dirname);
const STATIC = process.env.STATIC || 'http://127.0.0.1:6910';
const FPS = 60, SCALE = 4 / 3;
const mode = process.argv[2] || 'preview';
const args = process.argv.slice(3);

async function open(b) {
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: SCALE });
  p.on('console', (m) => console.log('page:', m.text()));
  p.on('pageerror', (e) => console.log('pageerror:', e.message));
  await p.goto(STATIC + '/marketing/video-ad/headphones.html');
  await p.evaluate(() => preload());
  return p;
}

async function segment(b, from, to, file) {
  const p = await open(b);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', String(FPS), file], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = from; f < to; f++) {
    await p.evaluate((t) => render(t), f / FPS);
    const buf = await p.screenshot({ type: 'jpeg', quality: 96 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if ((f - from) % 120 === 0) console.log(file, f, '/', to);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await p.close();
}

(async () => {
  const b = await chromium.launch();
  if (mode === 'preview') {
    fs.mkdirSync('prev', { recursive: true });
    const p = await open(b);
    for (const t of args.map(Number)) {
      await p.evaluate((t) => render(t), t);
      await p.screenshot({ path: `prev/hp-${t.toFixed(2)}.jpg`, type: 'jpeg', quality: 80, scale: 'css' });
    }
  } else if (mode === 'events') {
    const p = await open(b);
    fs.mkdirSync('audio', { recursive: true });
    fs.writeFileSync('audio/events.json', JSON.stringify(await p.evaluate(() => ({ duration: DURATION, events: EVENTS })), null, 1));
    console.log('wrote audio/events.json');
  } else {
    fs.mkdirSync('out', { recursive: true });
    const p = await open(b);
    const N = Math.round((await p.evaluate(() => DURATION)) * FPS);
    await p.close();
    const W = Number(args[0] || 4), per = Math.ceil(N / W), parts = [];
    await Promise.all([...Array(W)].map((_, i) => {
      const file = `out/seg${i}.mp4`; parts.push(file);
      return segment(b, i * per, Math.min(N, (i + 1) * per), file);
    }));
    fs.writeFileSync('out/list.txt', parts.map((f) => `file '${f.replace('out/', '')}'`).join('\n'));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'out/list.txt', '-c', 'copy', 'out/headphones-silent.mp4'], { stdio: 'inherit' });
    console.log('wrote out/headphones-silent.mp4');
  }
  await b.close();
})();
