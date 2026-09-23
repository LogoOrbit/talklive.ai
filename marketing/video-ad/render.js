// Renders compose.html (the original 23s ad) or ads.html?ad=<name> frame by frame
// and encodes an MP4 with the page's music.
//
//   node render.js preview [ad] 1.5 4 9      spot-check frames -> prev/
//   node render.js video [ad]                full MP4 -> ../TalkLive-Ad-<ad>.mp4
//
// [ad] is omitted for the original ad, or one of: omegle, language, animals.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const { spawn } = require('child_process');
const fs = require('fs');
process.chdir(__dirname);
fs.mkdirSync('prev', { recursive: true });
const FF = process.env.FFMPEG || 'ffmpeg';
const STATIC = process.env.STATIC || 'http://127.0.0.1:6910';
const mode = process.argv[2] || 'preview';
const rest = process.argv.slice(3);
const ad = rest[0] && isNaN(Number(rest[0])) ? rest.shift() : null;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('console', (m) => console.log('page:', m.text()));
  await p.goto(STATIC + '/marketing/video-ad/' + (ad ? 'ads.html?ad=' + ad : 'compose.html'));
  await p.evaluate(() => preload());
  const at = async (t) => {
    await p.evaluate((t) => render(t), t);
    await p.evaluate(() => Promise.all([...document.images].map((i) => (i.complete ? 0 : i.decode().catch(() => 0)))));
  };
  if (mode === 'preview') {
    for (const t of rest.map(Number)) { await at(t); await p.screenshot({ path: `prev/${ad || 'main'}-${t}.jpg`, type: 'jpeg', quality: 80 }); }
  } else {
    const FPS = 30, dur = await p.evaluate(() => DURATION), N = Math.round(dur * FPS);
    const [track, offset] = (await p.evaluate(() => window.MUSIC)) || ['MusicForTalkLive.mp3', 0];
    const out = ad ? `../TalkLive-Ad-${ad}.mp4` : '../TalkLive-Motion-Ad.mp4';
    const ff = spawn(FF, ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      '-ss', String(offset), '-i', '../' + track,
      '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS),
      '-af', `loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:d=0.3,afade=t=out:st=${dur - 1.5}:d=1.5`,
      '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-t', String(dur), '-movflags', '+faststart', out], { stdio: ['pipe', 'ignore', 'inherit'] });
    for (let f = 0; f < N; f++) {
      await at(f / FPS);
      const buf = await p.screenshot({ type: 'jpeg', quality: 95 });
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      if (f % 90 === 0) console.log(ad || 'main', 'frame', f, '/', N);
    }
    ff.stdin.end(); await new Promise((r) => ff.on('close', r));
    console.log('wrote', out);
  }
  await b.close();
})();
