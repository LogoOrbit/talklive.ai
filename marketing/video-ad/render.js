const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
process.chdir(__dirname); require('fs').mkdirSync('shots', { recursive: true });
const { spawn } = require('child_process');
const FF = process.env.FFMPEG || 'ffmpeg';
require('fs').mkdirSync('prev', { recursive: true });
const mode = process.argv[2] || 'preview';
(async () => {
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } }); p.on('console', m => console.log('page:', m.text()));
  await p.goto((process.env.STATIC || 'http://127.0.0.1:6910') + '/marketing/video-ad/compose.html'); await p.evaluate(() => preload());
  const at = async (t) => { await p.evaluate((t) => render(t), t); await p.evaluate(() => Promise.all([...document.images].map(i => i.complete ? 0 : i.decode().catch(()=>0)))); };
  if (mode === 'preview') {
    const ts = process.argv.slice(3).map(Number);
    for (const t of ts) { await at(t); await p.screenshot({ path: `prev/t${t}.jpg`, type: 'jpeg', quality: 80 }); }
  } else {
    const FPS = 30, N = Math.round((await p.evaluate(() => DURATION)) * FPS);
    const ff = spawn(FF, ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      '-ss', '0', '-i', '../MusicForTalkLive.mp3',
      '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS),
      '-af', `afade=t=in:d=0.4,afade=t=out:st=${N / FPS - 1.8}:d=1.8`, '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', '../TalkLive-Motion-Ad.mp4'], { stdio: ['pipe', 'ignore', 'inherit'] });
    for (let f = 0; f < N; f++) {
      await at(f / FPS);
      const buf = await p.screenshot({ type: 'jpeg', quality: 95 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 60 === 0) console.log('frame', f, '/', N);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await b.close();
})();
