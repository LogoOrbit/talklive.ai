// Voice check, browser side. During a voice call it listens to the person's
// own microphone (never the partner's), and with voice-features.js turns a few
// seconds of their speech into a summary of about 30 numbers: typical pitch,
// average spectral shape, average resonances. That summary is what is sent.
// No audio leaves the device, and speech cannot be rebuilt from it.
//
// The estimate itself is made on the server (server/voice-check.js) by a model
// trained on real speech, and it is only an estimate of how a voice sounds:
// children, hoarse voices, some trans and non-binary people and noisy rooms
// can all read "wrong". That is why it can only ever agree or disagree with
// the gender someone picked, never change it, and why there is a retry and a
// review by a person.
//
//   VoiceGender.start(stream, onSummary)  begin; onSummary(summary) is called
//                                         once enough speech has been heard
//   VoiceGender.more()                    the server asked for a longer listen
//   VoiceGender.stop()
(function () {
  'use strict';

  const TICK_MS = 50;           // one 43 ms block every 50 ms
  const FIRST = 80;             // voiced frames in the first summary (~4 s of voiced speech)
  const SECOND = 200;           // and in the longer one, if asked
  const MAX_RUN_MS = 3 * 60000; // give up quietly after 3 minutes of call
  const BLOCK = 2048;

  let audioCtx = null;
  let timer = null;
  let tracker = null;
  let target = 0;
  let onSummary = null;

  // Safari before 14.1 has no getFloatTimeDomainData; use the byte version,
  // rescaled to -1..1.
  function readTimeDomain(analyser, buf) {
    if (analyser.getFloatTimeDomainData) { analyser.getFloatTimeDomainData(buf); return; }
    const bytes = new Uint8Array(buf.length);
    analyser.getByteTimeDomainData(bytes);
    for (let i = 0; i < buf.length; i++) buf[i] = (bytes[i] - 128) / 128;
  }

  function stop() {
    clearInterval(timer);
    timer = null;
    tracker = null;
    target = 0;
    if (audioCtx) {
      audioCtx.close().catch(() => {});
      audioCtx = null;
    }
  }

  function start(stream, callback) {
    stop();
    const VF = window.VoiceFeatures;
    if (!VF || !stream || !stream.getAudioTracks().length) return false;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = BLOCK;
      source.connect(analyser);
      const rate = audioCtx.sampleRate;
      const buf = new Float32Array(BLOCK);
      const startedAt = Date.now();
      tracker = VF.createTracker();
      target = FIRST;
      onSummary = callback;
      timer = setInterval(() => {
        if (!tracker || Date.now() - startedAt > MAX_RUN_MS) { stop(); return; }
        readTimeDomain(analyser, buf);
        tracker.push(buf, rate);
        if (!target || tracker.voiced < target) return;
        const summary = tracker.summary();
        const last = target === SECOND;
        target = 0; // wait for more() before sending again
        try { onSummary(summary); } catch (_) { /* caller's problem */ }
        if (last) stop();
      }, TICK_MS);
      return true;
    } catch (_) {
      stop(); // Web Audio unavailable: nothing is sent
      return false;
    }
  }

  // The server asked for more: either it could not tell from the first
  // summary (send the longer one), or that summary could not be used yet -
  // `again` - because the microphone was muted as it arrived (send a fresh one
  // after a little more speech).
  function more(again) {
    if (!tracker) return;
    target = again ? Math.min(SECOND, tracker.voiced + 20) : SECOND;
  }

  window.VoiceGender = { start, stop, more, FIRST, SECOND };
})();
