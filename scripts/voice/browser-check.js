#!/usr/bin/env node
'use strict';
/* global window, document, localStorage, socket, voiceView, callState, pc */
// Real end-to-end proof of Voice check, through the true browser path:
//   getUserMedia -> Web Audio AnalyserNode -> public/voice-features.js ->
//   socket 'voice-features' -> server/voice-check.js model -> status.
//
// It starts the server (throwaway DATA_DIR), opens two Chromium browsers and
// puts a speech recording on page A's microphone with Chromium's fake audio
// device. A sets "I am" to the given gender and turns Voice check on; A and B
// start a voice call ("Tap to Talk"); the script then watches the view the
// server sends A until the status is `confirmed` (or mismatch / the time runs
// out) and prints every change it saw.
//
// Usage:
//   node scripts/voice/browser-check.js <speech.wav> <male|female> [options]
//
//   <speech.wav>   48 kHz mono 16-bit PCM WAV with at least 30 s of one
//                  speaker. Make one from LibriSpeech with:
//                    ffmpeg -i a.flac -i b.flac -i c.flac \
//                      -filter_complex concat=n=3:v=0:a=1 -ac 1 -ar 48000 out.wav
//   <gender>       what A says in "I am". Give the speaker's own gender to
//                  expect `confirmed`, the other one for the cross case.
//   --calls N      how many separate calls to make (default 3, stops early on confirmed). The cross case
//                  needs 2: one disagreeing call is never a mismatch.
//   --expect X     confirmed | mismatch | notconfirmed. Sets the exit code
//                  (default: confirmed).
//   --timeout S    seconds to wait per call (default 90)
//   --headed       show the browsers
//   --verbose      also print how many voiced frames A's page has heard (every 5 s)
//
// Exit code 0 when the final status matches --expect, 1 otherwise.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

function loadPlaywright() {
  try { return require('playwright'); } catch (_) { /* not a local dependency */ }
  const globalRoot = require('child_process').execSync('npm root -g', { encoding: 'utf8' }).trim();
  return require(path.join(globalRoot, 'playwright'));
}

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 1) && true : false; };
const opt = (name, def) => { const i = args.indexOf(name); if (i < 0) return def; const v = args[i + 1]; args.splice(i, 2); return v; };
const HEADED = flag('--headed');
const VERBOSE = flag('--verbose');
const CALLS = Number(opt('--calls', '3'));
const EXPECT = opt('--expect', 'confirmed');
const TIMEOUT = Number(opt('--timeout', '90')) * 1000;
const [wavArg, gender] = args;
if (!wavArg || !['male', 'female'].includes(gender)) {
  console.error('usage: node scripts/voice/browser-check.js <speech.wav> <male|female> [--calls N] [--expect confirmed|mismatch|notconfirmed] [--timeout S] [--headed]');
  process.exit(2);
}
const WAV = path.resolve(wavArg);
if (!fs.existsSync(WAV)) { console.error('no such file: ' + WAV); process.exit(2); }

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
const stamp = () => ((Date.now() - t0) / 1000).toFixed(1).padStart(6) + 's';
const say = (...a) => console.log(stamp(), ...a);

(async () => {
  const { chromium } = loadPlaywright();
  const port = 6300 + Math.floor(Math.random() * 500);
  const base = `http://127.0.0.1:${port}`;
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-vbrowser-'));
  const srv = spawn(process.execPath, [path.join(__dirname, '..', '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, NODE_ENV: 'development', DATABASE_URL: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let serverLog = '';
  srv.stdout.on('data', (d) => { serverLog += d; });
  srv.stderr.on('data', (d) => { serverLog += d; });

  const common = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required', '--disable-features=WebRtcHideLocalIpsWithMdns', '--allow-loopback-in-peer-connection'];
  // A's microphone is the speech file; B's is Chromium's default beep (B never gets a voice check).
  const browserA = await chromium.launch({ headless: !HEADED, args: [...common, `--use-file-for-fake-audio-capture=${WAV}`] });
  // Same browser for B: two separate Chromium processes cannot reach each other in some sandboxes.
  const browserB = browserA;
  let status = 'unknown';
  const cleanup = async () => {
    await browserA.close().catch(() => {});
    srv.kill('SIGKILL');
    fs.rmSync(dataDir, { recursive: true, force: true });
  };

  try {
    for (let i = 0; i < 80; i++) { try { await fetch(base + '/healthz'); break; } catch (_) { await wait(250); } }

    const open = async (browser, label, opts = {}) => {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['microphone'] });
      await ctx.addInitScript(() => {
        try { localStorage.setItem('talklive_age_consent', 'yes'); localStorage.setItem('tl_ff', '-progressiveDisclosure'); } catch (_) { /* blocked */ }
      });
      const page = await ctx.newPage();
      page.on('pageerror', (e) => say(`[${label}] page error:`, e.message));
      await page.goto(base + '/', { waitUntil: 'load' });
      await wait(1500);
      return { ctx, page, ...opts };
    };

    const A = await open(browserA, 'A');
    // Show each summary the page really sends (number of voiced frames behind it).
    A.page.on('console', (m) => { if (m.text().startsWith('VF-SEND')) say('A sent a voice summary,', m.text().slice(8)); });
    await A.page.evaluate(() => {
      // Watch the tracker the page creates (for --verbose).
      const patch = setInterval(() => {
        if (!window.VoiceFeatures || window.VoiceFeatures.__patched) return;
        const create = window.VoiceFeatures.createTracker;
        window.VoiceFeatures.createTracker = () => { const t = create(); window.__tracker = t; return t; };
        window.VoiceFeatures.__patched = true;
        clearInterval(patch);
      }, 50);
      const emit = socket.emit.bind(socket);
      socket.emit = (...a) => { if (a[0] === 'voice-features' && a[1]) console.log('VF-SEND n=' + a[1].n + ' median pitch ' + Math.round(100 * 2 ** a[1].f[0]) + ' Hz'); return emit(...a); };
    });
    // "I am", then Voice check on: both through the page's own controls.
    await A.page.evaluate((g) => {
      document.querySelector(`#genderGroup [data-value="${g}"]`).click();
      document.getElementById('voiceCheckToggle').click();
    }, gender);
    await wait(1500);
    const view = () => A.page.evaluate(() => (typeof voiceView === 'undefined' ? null : voiceView));
    const first = await view();
    say(`A said "I am ${gender}" and turned Voice check on; server view:`, JSON.stringify(first && { on: first.on, state: first.state, calls: first.calls }));
    if (!first || !first.on) throw new Error('the server did not record Voice check as on');

    let lastKey = '';
    let final = null;
    for (let call = 1; call <= CALLS; call++) {
      const B = await open(browserB, 'B' + call);
      if (call === 1) await A.page.click('#startBtn');
      else {
        // Back from the last call: A starts searching again.
        await A.page.evaluate(() => { if (typeof callState !== 'undefined' && callState !== 'searching' && callState !== 'connecting' && callState !== 'connected') document.getElementById('callMainBtn').click(); });
      }
      await wait(300);
      await B.page.click('#startBtn');
      say(`call ${call}: both started "Tap to Talk"`);
      const callStart = Date.now();
      if (VERBOSE) setTimeout(async () => say('   B:', JSON.stringify(await B.page.evaluate(() => ({ call: callState, ice: typeof pc !== 'undefined' && pc ? pc.iceConnectionState + '/' + pc.signalingState : null })).catch(() => null))), 9000);
      let reached = false;
      const baseCalls = (await view() || {}).calls || 0;
      while (Date.now() - callStart < TIMEOUT) {
        await wait(500);
        const v = await view();
        if (VERBOSE && Math.round((Date.now() - callStart) / 500) % 10 === 0) {
          say('   heard:', JSON.stringify(await A.page.evaluate(() => ({ call: typeof callState === 'undefined' ? null : callState, ice: typeof pc !== 'undefined' && pc ? pc.iceConnectionState + '/' + pc.signalingState : null, voiced: window.__tracker ? window.__tracker.voiced : null, blocks: window.__tracker ? window.__tracker.seen : null }))));
        }
        if (!v) continue;
        const key = `${v.state} calls=${v.calls} more=${!!v.more}`;
        if (key !== lastKey) { lastKey = key; say(`call ${call}: A's view -> ${key}`); }
        final = v;
        const state = v.state;
        // A call is done once the server has scored it and is not asking for more.
        if (v.calls > baseCalls && (!v.more || Date.now() - callStart > 30000)) { reached = true; if (call === CALLS || state === 'confirmed') break; }
        if (state === 'confirmed' || state === 'mismatch') { reached = true; break; }
      }
      if (!reached) say(`call ${call}: no scored summary within ${TIMEOUT / 1000}s`);
      if (final && (final.state === 'confirmed' || final.state === 'mismatch')) break;
      if (call < CALLS) {
        // End this call: A hangs up (two presses: "are you sure?", then yes).
        await A.page.evaluate(() => { const b = document.getElementById('callMainBtn'); b.click(); setTimeout(() => b.click(), 300); });
        await wait(1200);
        await B.ctx.close();
        await wait(800);
      }
    }
    status = final ? final.state : 'no view';
    say(`RESULT: declared ${gender}, final status "${status}", calls scored ${final && final.calls}`);
  } catch (e) {
    say('ERROR:', e.message);
    status = 'error';
  }
  const ok = EXPECT === 'notconfirmed' ? status !== 'confirmed' && status !== 'error' : status === EXPECT;
  say(ok ? `as expected (${EXPECT})` : `NOT as expected: wanted ${EXPECT}, got ${status}`);
  if (!ok && /error|exception/i.test(serverLog)) say('server log mentions an error:\n' + serverLog.split('\n').filter((l) => /error|exception/i.test(l)).slice(0, 5).join('\n'));
  await cleanup();
  process.exit(ok ? 0 : 1);
})();
