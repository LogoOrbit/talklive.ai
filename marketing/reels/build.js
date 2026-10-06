// Voices every beat of every reel and lays out the timeline reel.html draws from.
//
//   SSL_CERT_FILE=... node build.js [reel ...]     (needs `pip install edge-tts`, ffmpeg)
//
// Writes vo/<reel>/<n>.mp3 (+ .json word timings, cached by text) and
// vo/<reel>.json = { duration, beats: [{ s, e, vo, words: [[start, end, word]] }], env }
// where env is the voiceover loudness per 1/30 s frame (drives waveforms and caption bounce).
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const REELS = require('./reels.js');
const { decode, FPS, SR } = require('./audio.js');
process.chdir(__dirname);

const LEAD = 0.12;      // silence before the first word (frame 0 still shows the hook)
const GAP = 0.18;       // breath between beats
const OUTRO_MIN = 3.4;  // the end card needs time to be read

for (const id of process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(REELS)) {
  const R = REELS[id]; if (!R) throw new Error('unknown reel ' + id);
  fs.mkdirSync(`vo/${id}`, { recursive: true });
  let t = LEAD; const beats = []; const pcm = [];
  R.beats.forEach((b, i) => {
    const mp3 = `vo/${id}/${i}.mp3`, key = `${R.voice}|${R.rate}|${b.vo}`;
    if (!fs.existsSync(mp3 + '.key') || fs.readFileSync(mp3 + '.key', 'utf8') !== key) {
      execFileSync('python3', ['tts.py', R.voice, R.rate, b.vo, mp3], { stdio: 'inherit' });
      fs.writeFileSync(mp3 + '.key', key);
    }
    const words = JSON.parse(fs.readFileSync(mp3 + '.json', 'utf8'));
    const audio = decode(mp3);
    const spoken = words.length ? words[words.length - 1][1] : audio.length / SR;
    let len = spoken + GAP;
    if (b.scene.type === 'outro') len = Math.max(OUTRO_MIN, spoken + 1.6);
    beats.push({ s: +t.toFixed(3), e: +(t + len).toFixed(3), vo: b.vo, words: words.map(([a, c, w]) => [+(t + a).toFixed(3), +(t + c).toFixed(3), w]) });
    pcm.push([t, audio]);
    t += len;
  });
  const duration = +t.toFixed(3);
  // loudness envelope, normalised to the loudest frame
  const N = Math.ceil(duration * FPS), env = new Float32Array(N);
  for (const [at, a] of pcm) for (let k = 0; k < a.length; k++) { const f = Math.floor((at + k / SR) * FPS); if (f < N) env[f] += a[k] * a[k]; }
  const per = SR / FPS; let mx = 0;
  for (let f = 0; f < N; f++) { env[f] = Math.sqrt(env[f] / per); mx = Math.max(mx, env[f]); }
  fs.writeFileSync(`vo/${id}.json`, JSON.stringify({ duration, beats, env: Array.from(env, (v) => +(v / mx).toFixed(3)) }));
  console.log(id, duration + 's', beats.length, 'beats');
}
