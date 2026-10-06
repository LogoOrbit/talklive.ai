// Renders reel.html?r=<reel> frame by frame and muxes voiceover + sound effects +
// music (ducked under the voice) into ../TalkLive-Reel-<n>-<reel>.mp4.
//
//   npx http-server -p 6910 -s .                     (static server, from repo root)
//   node render.js preview <reel> 0 2.5 7            spot-check frames -> prev/
//   node render.js video [reel ...]                  full MP4s (all reels if none given)
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const REELS = require('./reels.js');
const { SR, FPS, decode, writeWav, mixSfx } = require('./audio.js');
process.chdir(__dirname);
const FF = process.env.FFMPEG || 'ffmpeg';
const STATIC = process.env.STATIC || 'http://127.0.0.1:6910';
const [mode = 'preview', ...rest] = process.argv.slice(2);
const KEYS = Object.keys(REELS);

function voiceTrack(id, dur, sfx) {
  const TL = JSON.parse(fs.readFileSync(`vo/${id}.json`, 'utf8'));
  const out = new Float32Array(Math.ceil(dur * SR));
  TL.beats.forEach((b, i) => {
    const a = decode(`vo/${id}/${i}.mp3`); const words = JSON.parse(fs.readFileSync(`vo/${id}/${i}.mp3.json`, 'utf8'));
    // place the clip so its words land where the timeline says they do
    const off = Math.round((b.s + (b.words[0] ? b.words[0][0] - b.s - words[0][0] : 0)) * SR);
    for (let k = 0; k < a.length && off + k < out.length; k++) if (off + k >= 0) out[off + k] += a[k];
  });
  mixSfx(out, sfx, .55);
  return out;
}

async function page(browser, id) {
  const p = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('console', (m) => console.log(id, 'page:', m.text()));
  p.on('pageerror', (e) => console.log(id, 'ERROR:', e.message));
  await p.goto(`${STATIC}/marketing/reels/reel.html?r=${id}`);
  await p.evaluate(() => preload());
  return p;
}

(async () => {
  const b = await chromium.launch();
  if (mode === 'preview') {
    fs.mkdirSync('prev', { recursive: true });
    const id = rest.shift(); const p = await page(b, id);
    // no times given: one frame late in every beat
    const times = rest.length ? rest.map(Number) : JSON.parse(fs.readFileSync(`vo/${id}.json`, 'utf8')).beats.map((x) => +(x.e - .25).toFixed(2));
    for (const t of times) { await p.evaluate((t) => render(t), t); await p.screenshot({ path: `prev/${id}-${t}.jpg`, type: 'jpeg', quality: 80 }); }
  } else {
    const ids = rest.length ? rest : KEYS;
    await Promise.all(ids.map(async (id) => {
      const p = await page(b, id);
      const dur = await p.evaluate(() => DURATION), N = Math.round(dur * FPS);
      const [track, offset] = await p.evaluate(() => MUSIC); const sfx = await p.evaluate(() => SFX);
      const tmp = `prev/${id}-voice.wav`; fs.mkdirSync('prev', { recursive: true });
      writeWav(tmp, voiceTrack(id, dur, sfx));
      const out = `../TalkLive-Reel-${String(KEYS.indexOf(id) + 1).padStart(2, '0')}-${id}.mp4`;
      // music: -17 dB bed, side-chain ducked by the voice, faded in and out
      const ff = spawn(FF, ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
        '-i', tmp, '-ss', String(offset), '-i', '../' + track,
        '-filter_complex', `[1:a]asplit=2[v][key];[2:a]volume=0.14,afade=t=in:d=0.4,afade=t=out:st=${dur - 1.2}:d=1.2[m];[m][key]sidechaincompress=threshold=0.03:ratio=6:attack=15:release=350[duck];[v][duck]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]`,
        '-map', '0:v', '-map', '[a]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', String(FPS),
        '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-t', String(dur), '-movflags', '+faststart', out], { stdio: ['pipe', 'ignore', 'inherit'] });
      for (let f = 0; f < N; f++) {
        await p.evaluate((t) => render(t), f / FPS);
        const buf = await p.screenshot({ type: 'jpeg', quality: 92 });
        if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
        if (f % 150 === 0) console.log(id, 'frame', f, '/', N);
      }
      ff.stdin.end(); await new Promise((r) => ff.on('close', r)); fs.unlinkSync(tmp);
      console.log('wrote', out);
    }));
  }
  await b.close();
})();
