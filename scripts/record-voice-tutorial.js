// Records the square "voice messages" tutorial clip shown in the what's-new
// dialog, from the real app in a real browser (fake microphone). Dev tool,
// not run in production.
//
//   node scripts/record-voice-tutorial.js
//   -> public/media/voice-notes-tutorial.{mp4,webm} + -poster.jpg
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const H = require('./social-ui/harness');
const { wait, ID } = H;

function loadPlaywright() {
  try { return require('playwright'); } catch (_) { /* not local */ }
  const root = execFileSync('npm', ['root', '-g']).toString().trim();
  return require(path.join(root, 'playwright'));
}
const { chromium } = loadPlaywright();

const SIZE = 480;
const OUT = path.join(__dirname, '..', 'public', 'media');

(async () => {
  const { srv, base, dir } = await H.start({ port: 6950 + Math.floor(Math.random() * 40) });
  const ben = H.bot(base, 'ben');
  const vidDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-vid-'));
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
  });
  const ctx = await b.newContext({
    viewport: { width: SIZE, height: SIZE },
    permissions: ['microphone'],
    recordVideo: { dir: vidDir, size: { width: SIZE, height: SIZE } },
  });
  await ctx.addInitScript(([cid, tok]) => {
    localStorage.setItem('talklive_client_id', cid);
    localStorage.setItem('talklive_identity_token', tok);
    localStorage.setItem('talklive_lang', 'en');
    localStorage.setItem('tl_whatsnew_voice_v1', '1');
  }, [ID.ann, H.tokenFor(ID.ann)]);
  const page = await ctx.newPage();
  const t0 = Date.now();
  await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
  await wait(3500);

  // A finger: a soft ring drawn wherever the script taps.
  await page.addStyleTag({ content: `
    .tut-tap{position:fixed;z-index:99999;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;
      background:rgba(255,255,255,.35);border:2px solid #fff;pointer-events:none;animation:tutTap .6s ease-out forwards}
    @keyframes tutTap{0%{transform:scale(.4);opacity:0}30%{opacity:1}100%{transform:scale(1.25);opacity:0}}
    .chat-side-panel{top:0!important;bottom:0!important;height:100%!important;max-height:none!important;border-radius:0!important}` });
  const tap = async (sel) => {
    const box = await page.locator(sel).first().boundingBox();
    if (box) {
      await page.evaluate(([x, y]) => {
        const d = document.createElement('div');
        d.className = 'tut-tap';
        d.style.left = x + 'px';
        d.style.top = y + 'px';
        document.body.appendChild(d);
        setTimeout(() => d.remove(), 700);
      }, [box.x + box.width / 2, box.y + box.height / 2]);
      await wait(350);
    }
    await page.locator(sel).first().click();
  };

  await page.evaluate((id) => openFriendChat(id), ID.ben);
  const start = Date.now() - t0;
  await wait(1300);
  await tap('#friendChatForm .vn-mic-btn');
  await page.waitForSelector('.vn-dialog-overlay.open');
  await wait(2200);
  await page.evaluate(() => { const d = document.querySelector('.vn-dialog'); d.scrollTo({ top: d.scrollHeight, behavior: 'smooth' }); });
  await wait(900);
  await tap('.vn-dialog-agree input');
  await wait(500);
  const asked = H.once(ben, 'voice-note-state', 8000);
  await tap('.vn-dialog-actions .btn-primary');
  await asked.catch(async (e) => { await page.screenshot({ path: path.join(os.tmpdir(), 'tut-fail.png') }); throw e; });
  await wait(1400);
  ben.emit('voice-note-respond', { fromClientId: ID.ann, accept: true });
  await wait(1600);
  await tap('#friendChatForm .vn-mic-btn');
  await wait(3000);
  const got = H.once(ben, 'friend-message', 8000);
  await tap('.vn-rec-send');
  const msg = await got;
  await wait(1200);
  const clip = await ben.timeout(5000).emitWithAck('voice-note-get', { id: msg.voice.id, chatWith: ID.ann });
  ben.emit('friend-typing', { toClientId: ID.ann });
  await wait(900);
  await ben.timeout(8000).emitWithAck('friend-voice-note', { toClientId: ID.ann, id: 'tut1', mime: clip.mime, ms: msg.voice.ms, audio: clip.data });
  await wait(1000);
  await tap('#friendChatMessages .chat-msg.them:last-of-type .vn-play');
  await wait(2600);
  const end = Date.now() - t0;

  const video = page.video();
  await ctx.close();
  const raw = await video.path();
  await b.close();
  ben.close();
  srv.kill('SIGKILL');
  fs.rmSync(dir, { recursive: true, force: true });

  const ss = (start / 1000).toFixed(2);
  const dur = ((end - start) / 1000).toFixed(2);
  const common = ['-y', '-ss', ss, '-t', dur, '-i', raw, '-an', '-vf', 'fps=24,scale=480:480'];
  execFileSync('ffmpeg', [...common, '-c:v', 'libx264', '-profile:v', 'main', '-pix_fmt', 'yuv420p', '-crf', '30', '-preset', 'veryslow', '-movflags', '+faststart', path.join(OUT, 'voice-notes-tutorial.mp4')], { stdio: 'ignore' });
  execFileSync('ffmpeg', [...common, '-c:v', 'libvpx-vp9', '-crf', '40', '-b:v', '0', '-row-mt', '1', path.join(OUT, 'voice-notes-tutorial.webm')], { stdio: 'ignore' });
  execFileSync('ffmpeg', ['-y', '-ss', (start / 1000 + 12).toFixed(2), '-i', raw, '-frames:v', '1', '-q:v', '5', path.join(OUT, 'voice-notes-tutorial-poster.jpg')], { stdio: 'ignore' });
  fs.rmSync(vidDir, { recursive: true, force: true });
  for (const f of ['voice-notes-tutorial.mp4', 'voice-notes-tutorial.webm', 'voice-notes-tutorial-poster.jpg']) {
    console.log(f, Math.round(fs.statSync(path.join(OUT, f)).size / 1024) + ' KB');
  }
  console.log('clip length', dur + 's');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
