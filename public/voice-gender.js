// Opt-in voice check: estimates, on this device only, whether the person's own
// voice reads as male or female, so "Voice-checked only" gender filters can
// prefer people whose voice agrees with the gender they picked in Settings.
//
// How it works: during a voice call it reads the local mic stream (never the
// partner's) through a Web Audio analyser, and for every voiced frame takes
//   1. the fundamental frequency F0 (YIN pitch tracker), and
//   2. the first three formants F1-F3 (LPC envelope peaks), turned into a
//      formant-spacing estimate of vocal-tract length.
// Adult male voices sit around F0 85-155 Hz with ~1000 Hz formant spacing;
// adult female voices around 165-255 Hz with ~1150 Hz spacing. The medians of
// both over several seconds of speech are combined into one probability, and
// a verdict is only reported when it is confident; otherwise nothing is sent.
//
// No audio, pitch track or formant values leave the device - only
// { label: 'male' | 'female', confidence }. It is a statistical guess about a
// voice, not about a person: children, hoarse voices, some trans and
// non-binary people and heavy background noise can all read "wrong", which is
// why it can only ever confirm the gender someone picked, never override it.
(function () {
  'use strict';

  const TARGET_RATE = 12000;     // analyse at ~12 kHz: enough for F0 and F1-F3
  const TICK_MS = 100;           // one frame every 100 ms
  const MIN_VOICED = 80;         // ~8 s of voiced speech before any verdict
  const MAX_RUN_MS = 3 * 60000;  // give up quietly after 3 minutes of call
  const REPORT_AT = 0.85;        // probability needed to report a verdict
  const F0_MIN = 60;
  const F0_MAX = 400;
  const YIN_THRESHOLD = 0.15;
  const MIN_RMS = 0.01;
  const LPC_ORDER = 12;

  let audioCtx = null;
  let timer = null;
  let startedAt = 0;
  let f0s = [];
  let spacings = [];
  let onResult = null;

  function median(list) {
    if (!list.length) return NaN;
    const s = list.slice().sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  // Box-filter decimation. Crude, but speech above 6 kHz carries little
  // energy, so the aliasing it lets through does not move F0 or F1-F3.
  function decimate(buf, factor) {
    const out = new Float32Array(Math.floor(buf.length / factor));
    for (let i = 0; i < out.length; i++) {
      let s = 0;
      for (let k = 0; k < factor; k++) s += buf[i * factor + k];
      out[i] = s / factor;
    }
    return out;
  }

  // YIN (de Cheveigné & Kawahara 2002): cumulative mean normalised difference,
  // first dip under the threshold, parabolic interpolation. Returns Hz or 0.
  function yin(x, rate) {
    const minTau = Math.floor(rate / F0_MAX);
    const maxTau = Math.min(Math.floor(rate / F0_MIN), x.length >> 1);
    const W = x.length - maxTau;
    const d = new Float32Array(maxTau + 1);
    for (let tau = 1; tau <= maxTau; tau++) {
      let s = 0;
      for (let i = 0; i < W; i++) {
        const diff = x[i] - x[i + tau];
        s += diff * diff;
      }
      d[tau] = s;
    }
    d[0] = 1;
    let running = 0;
    for (let tau = 1; tau <= maxTau; tau++) {
      running += d[tau];
      d[tau] = running ? (d[tau] * tau) / running : 1;
    }
    let best = -1;
    for (let tau = minTau; tau <= maxTau; tau++) {
      if (d[tau] < YIN_THRESHOLD) {
        while (tau + 1 <= maxTau && d[tau + 1] < d[tau]) tau++;
        best = tau;
        break;
      }
    }
    if (best < 0) return 0;
    const a = best > 1 ? d[best - 1] : d[best];
    const b = d[best];
    const c = best + 1 <= maxTau ? d[best + 1] : d[best];
    const denom = a - 2 * b + c;
    const shift = denom ? (a - c) / (2 * denom) : 0;
    const tau = best + Math.max(-1, Math.min(1, shift));
    return rate / tau;
  }

  // LPC by autocorrelation + Levinson-Durbin, then the envelope 1/|A(e^jw)|
  // sampled on a grid; its first three peaks in speech range are F1-F3.
  function formants(x, rate) {
    const n = x.length;
    const w = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const pre = i ? x[i] - 0.97 * x[i - 1] : x[i];
      w[i] = pre * (0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (n - 1)));
    }
    const r = new Float64Array(LPC_ORDER + 1);
    for (let lag = 0; lag <= LPC_ORDER; lag++) {
      let s = 0;
      for (let i = lag; i < n; i++) s += w[i] * w[i - lag];
      r[lag] = s;
    }
    if (!(r[0] > 0)) return null;
    r[0] *= 1.0001; // tiny white-noise floor keeps the recursion stable
    const a = new Float64Array(LPC_ORDER + 1);
    a[0] = 1;
    let err = r[0];
    for (let i = 1; i <= LPC_ORDER; i++) {
      let acc = r[i];
      for (let j = 1; j < i; j++) acc += a[j] * r[i - j];
      const k = -acc / err;
      const prev = a.slice();
      for (let j = 1; j < i; j++) a[j] = prev[j] + k * prev[i - j];
      a[i] = k;
      err *= 1 - k * k;
      if (err <= 0) return null;
    }
    const BINS = 256;
    const env = new Float64Array(BINS);
    for (let b = 0; b < BINS; b++) {
      const omega = (Math.PI * b) / BINS;
      let re = 0;
      let im = 0;
      for (let j = 0; j <= LPC_ORDER; j++) {
        re += a[j] * Math.cos(omega * j);
        im -= a[j] * Math.sin(omega * j);
      }
      env[b] = 1 / (re * re + im * im);
    }
    const hzPerBin = rate / 2 / BINS;
    const peaks = [];
    for (let b = 1; b < BINS - 1 && peaks.length < 3; b++) {
      const hz = b * hzPerBin;
      if (hz < 200 || hz > 4500) continue;
      if (env[b] > env[b - 1] && env[b] >= env[b + 1]) peaks.push(hz);
    }
    if (peaks.length < 3) return null;
    const [f1, f2, f3] = peaks;
    if (f1 > 1000 || f2 < 700 || f2 > 2800 || f3 < 1800 || f3 > 4000) return null;
    return peaks;
  }

  // Uniform-tube model: F_i = (2i - 1) * c / 4L, so F_i / (i - 0.5) = c / 2L
  // is the formant spacing, inversely proportional to vocal-tract length.
  function spacingOf(fs) {
    let s = 0;
    for (let i = 0; i < fs.length; i++) s += fs[i] / (i + 0.5);
    return s / fs.length;
  }

  // Logistic combination of the two cues. Pitch is the stronger one, formant
  // spacing breaks ties in the 150-180 Hz overlap (and resists falsetto).
  // Returns P(female voice).
  function classify(f0, spacing) {
    const pitchScore = (Math.log(f0) - Math.log(160)) / 0.12;
    const z = Number.isFinite(spacing)
      ? 0.75 * pitchScore + 0.25 * ((spacing - 1075) / 60)
      : pitchScore;
    return 1 / (1 + Math.exp(-z));
  }

  function analyse(frame, rate) {
    let sum = 0;
    for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i];
    if (Math.sqrt(sum / frame.length) < MIN_RMS) return; // silence or muted
    const f0 = yin(frame, rate);
    if (!f0 || f0 < F0_MIN || f0 > F0_MAX) return; // unvoiced
    f0s.push(f0);
    const fs = formants(frame, rate);
    if (fs) spacings.push(spacingOf(fs));
  }

  // Exposed for tests and offline tuning; pure functions only.
  function estimate(f0List, spacingList) {
    if (f0List.length < MIN_VOICED) return null;
    const f0 = median(f0List);
    const spacing = spacingList.length >= MIN_VOICED / 2 ? median(spacingList) : NaN;
    const pFemale = classify(f0, spacing);
    const confidence = Math.max(pFemale, 1 - pFemale);
    return {
      label: pFemale >= 0.5 ? 'female' : 'male',
      confidence: Math.round(confidence * 100) / 100,
      decided: confidence >= REPORT_AT,
    };
  }

  function stop() {
    clearInterval(timer);
    timer = null;
    if (audioCtx) {
      audioCtx.close().catch(() => {});
      audioCtx = null;
    }
  }

  function start(stream, callback) {
    stop();
    if (!stream || !stream.getAudioTracks().length) return;
    onResult = callback;
    f0s = [];
    spacings = [];
    startedAt = Date.now();
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      const factor = Math.max(1, Math.round(audioCtx.sampleRate / TARGET_RATE));
      const rate = audioCtx.sampleRate / factor;
      // ~43 ms at 48 kHz: two periods of a 60 Hz voice after decimation.
      analyser.fftSize = 2048;
      source.connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      timer = setInterval(() => {
        if (Date.now() - startedAt > MAX_RUN_MS) { stop(); return; }
        analyser.getFloatTimeDomainData(buf);
        analyse(decimate(buf, factor), rate);
        const result = estimate(f0s, spacings);
        if (result && result.decided) {
          stop();
          try { onResult({ label: result.label, confidence: result.confidence }); } catch (_) { /* caller's problem */ }
        }
      }, TICK_MS);
    } catch (_) {
      stop(); // Web Audio unavailable - no verdict, nothing sent
    }
  }

  const api = { start, stop, estimate, classify, _yin: yin, _formants: formants, _decimate: decimate };
  if (typeof window !== 'undefined') window.VoiceGender = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
