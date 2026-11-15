// Voice features: turns a person's own microphone audio into a short list of
// numbers describing pitch and timbre, on their device. This file is the one
// piece of signal processing shared by everything that touches Voice check:
//   - the website (voice-gender.js feeds it the call's local mic),
//   - the server's tests, and
//   - the training scripts (scripts/voice/), which run real speech through
//     exactly this code so the model sees what a browser or phone produces.
// android-native/.../voice/VoiceFeatures.kt is a line-for-line port, held to
// the same numbers by shared fixtures (scripts/voice/make-fixtures.js).
//
// What leaves the device is the summary() below: about 30 statistics over a
// few seconds of voiced speech (median pitch, average spectral shape, average
// resonances). It is not audio and speech cannot be rebuilt from it. The
// server turns it into an estimate with a model (server/voice-model.js) and
// keeps only that estimate.
//
// Per analysed frame (40 ms of speech, at about 12 kHz):
//   pitch     F0 by YIN (de Cheveigné & Kawahara 2002); unvoiced frames are dropped
//   timbre    12 mel-frequency cepstral coefficients over 100-3800 Hz, the band
//             that survives phone microphones and Bluetooth headsets
//   formants  F1-F3 from the peaks of an LPC envelope, and their spacing, which
//             follows vocal-tract length
//   band      how much energy there is above 3.8 kHz, so the model can tell a
//             narrow-band headset from a full-band microphone
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.VoiceFeatures = api;
})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : null), function () {
  'use strict';

  const VERSION = 1;
  const TARGET_RATE = 12000;
  const FRAME_SEC = 0.04;
  const NFFT = 1024;
  const N_MEL = 22;
  const N_MFCC = 12;
  const MEL_LO = 100;
  const MEL_HI = 3800;
  const HI_BAND = 5200;
  const F0_MIN = 60;
  const F0_MAX = 400;
  const YIN_THRESHOLD = 0.15;
  const MIN_RMS = 0.008;
  const LPC_ORDER = 12;
  // Feature vector layout (FEATURE_COUNT numbers):
  //   0-2    log2(F0 / 100 Hz): median, 10th and 90th percentile
  //   3-14   mean of MFCC 1-12
  //   15-26  standard deviation of MFCC 1-12
  //   27-29  median F1, F2, F3 in kHz (null when too few frames had clear formants)
  //   30     median formant spacing in kHz (null likewise)
  //   31     share of voiced frames with clear formants
  //   32     mean log10 of energy above 3.8 kHz relative to the speech band
  const FEATURE_COUNT = 33;

  // --- Resampling ---------------------------------------------------------
  // Windowed-sinc low-pass, then keep every `factor`-th sample. Microphones
  // deliver 44.1 or 48 kHz; everything below works at about 12 kHz.
  const decimators = new Map();
  function decimatorFor(rate) {
    const key = Math.round(rate);
    let d = decimators.get(key);
    if (d) return d;
    const factor = Math.max(1, Math.round(rate / TARGET_RATE));
    const n = factor === 1 ? 1 : 8 * factor + 1;
    const taps = new Float64Array(n);
    if (factor === 1) taps[0] = 1;
    else {
      const fc = 0.45 / factor; // cycles per input sample
      const mid = (n - 1) / 2;
      let sum = 0;
      for (let i = 0; i < n; i++) {
        const x = i - mid;
        const sinc = x === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * x) / (Math.PI * x);
        taps[i] = sinc * (0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (n - 1)));
        sum += taps[i];
      }
      for (let i = 0; i < n; i++) taps[i] /= sum;
    }
    d = { factor, taps, rate: rate / factor };
    decimators.set(key, d);
    return d;
  }

  function decimate(buf, rate) {
    const d = decimatorFor(rate);
    const taps = d.taps;
    const n = taps.length;
    const len = Math.max(0, Math.floor((buf.length - n) / d.factor) + 1);
    const out = new Float64Array(len);
    for (let i = 0; i < len; i++) {
      let s = 0;
      const base = i * d.factor;
      for (let k = 0; k < n; k++) s += taps[k] * buf[base + k];
      out[i] = s;
    }
    return out;
  }

  // --- Pitch ---------------------------------------------------------------
  // YIN: cumulative mean normalised difference, first dip under the
  // threshold, parabolic interpolation. Returns Hz, or 0 for unvoiced.
  function yin(x, rate) {
    const minTau = Math.floor(rate / F0_MAX);
    const maxTau = Math.min(Math.floor(rate / F0_MIN), x.length >> 1);
    if (maxTau <= minTau) return 0;
    const W = x.length - maxTau;
    const d = new Float64Array(maxTau + 1);
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
    return rate / (best + Math.max(-1, Math.min(1, shift)));
  }

  // --- Spectrum ------------------------------------------------------------
  // In-place radix-2 FFT of NFFT points.
  const fftCos = new Float64Array(NFFT / 2);
  const fftSin = new Float64Array(NFFT / 2);
  for (let i = 0; i < NFFT / 2; i++) {
    fftCos[i] = Math.cos((2 * Math.PI * i) / NFFT);
    fftSin[i] = Math.sin((2 * Math.PI * i) / NFFT);
  }
  function fft(re, im) {
    const n = NFFT;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        let t = re[i]; re[i] = re[j]; re[j] = t;
        t = im[i]; im[i] = im[j]; im[j] = t;
      }
    }
    for (let size = 2; size <= n; size <<= 1) {
      const half = size >> 1;
      const step = n / size;
      for (let start = 0; start < n; start += size) {
        for (let k = 0; k < half; k++) {
          const wr = fftCos[k * step];
          const wi = -fftSin[k * step];
          const a = start + k;
          const b = a + half;
          const tr = re[b] * wr - im[b] * wi;
          const ti = re[b] * wi + im[b] * wr;
          re[b] = re[a] - tr; im[b] = im[a] - ti;
          re[a] += tr; im[a] += ti;
        }
      }
    }
  }

  const hzToMel = (hz) => 2595 * Math.log10(1 + hz / 700);
  const melToHz = (mel) => 700 * (10 ** (mel / 2595) - 1);

  // Triangular mel filters as [firstBin, weights] for one sample rate.
  const melBanks = new Map();
  function melBankFor(rate) {
    const key = Math.round(rate);
    let bank = melBanks.get(key);
    if (bank) return bank;
    const lo = hzToMel(MEL_LO);
    const hi = hzToMel(MEL_HI);
    const edges = [];
    for (let m = 0; m < N_MEL + 2; m++) edges.push(melToHz(lo + ((hi - lo) * m) / (N_MEL + 1)));
    const hzPerBin = rate / NFFT;
    const filters = [];
    for (let m = 0; m < N_MEL; m++) {
      const a = edges[m];
      const b = edges[m + 1];
      const c = edges[m + 2];
      const first = Math.max(1, Math.ceil(a / hzPerBin));
      const last = Math.min(NFFT / 2 - 1, Math.floor(c / hzPerBin));
      const w = [];
      for (let k = first; k <= last; k++) {
        const hz = k * hzPerBin;
        w.push(hz <= b ? (hz - a) / (b - a) : (c - hz) / (c - b));
      }
      filters.push({ first, w });
    }
    bank = {
      filters,
      bandLo: Math.ceil(MEL_LO / hzPerBin),
      bandHi: Math.floor(MEL_HI / hzPerBin),
      topHi: Math.min(NFFT / 2 - 1, Math.floor(HI_BAND / hzPerBin)),
    };
    melBanks.set(key, bank);
    return bank;
  }

  const dct = [];
  for (let c = 1; c <= N_MFCC; c++) {
    const row = new Float64Array(N_MEL);
    for (let m = 0; m < N_MEL; m++) row[m] = Math.cos((Math.PI * c * (m + 0.5)) / N_MEL);
    dct.push(row);
  }

  // MFCC 1-12 and the high-band energy ratio of one frame.
  function spectral(x, rate) {
    const re = new Float64Array(NFFT);
    const im = new Float64Array(NFFT);
    const n = Math.min(x.length, NFFT);
    for (let i = 0; i < n; i++) re[i] = x[i] * (0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (n - 1)));
    fft(re, im);
    const half = NFFT / 2;
    const power = new Float64Array(half);
    for (let k = 0; k < half; k++) power[k] = re[k] * re[k] + im[k] * im[k];
    const bank = melBankFor(rate);
    const logMel = new Float64Array(N_MEL);
    for (let m = 0; m < N_MEL; m++) {
      const f = bank.filters[m];
      let s = 0;
      for (let k = 0; k < f.w.length; k++) s += f.w[k] * power[f.first + k];
      logMel[m] = Math.log(s + 1e-10);
    }
    const mfcc = new Float64Array(N_MFCC);
    for (let c = 0; c < N_MFCC; c++) {
      let s = 0;
      for (let m = 0; m < N_MEL; m++) s += dct[c][m] * logMel[m];
      mfcc[c] = s;
    }
    let band = 0;
    let top = 0;
    for (let k = bank.bandLo; k <= bank.bandHi; k++) band += power[k];
    for (let k = bank.bandHi + 1; k <= bank.topHi; k++) top += power[k];
    return { mfcc, hiRatio: Math.log10((top + 1e-12) / (band + 1e-12)) };
  }

  // --- Formants --------------------------------------------------------------
  // LPC by autocorrelation + Levinson-Durbin, then the envelope 1/|A(e^jw)|
  // sampled on a grid; its first three peaks in speech range are F1-F3.
  function formants(x, rate) {
    const n = x.length;
    const w = new Float64Array(n);
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
    const prev = new Float64Array(LPC_ORDER + 1);
    a[0] = 1;
    let err = r[0];
    for (let i = 1; i <= LPC_ORDER; i++) {
      let acc = r[i];
      for (let j = 1; j < i; j++) acc += a[j] * r[i - j];
      const k = -acc / err;
      prev.set(a);
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
    const f1 = peaks[0];
    const f2 = peaks[1];
    const f3 = peaks[2];
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

  function rms(x) {
    let s = 0;
    for (let i = 0; i < x.length; i++) s += x[i] * x[i];
    return Math.sqrt(s / Math.max(1, x.length));
  }

  // One 40 ms frame at `rate` (already near 12 kHz). Null when it is not
  // voiced speech: too quiet, or no clear pitch.
  function analyseFrame(x, rate) {
    const n = Math.min(x.length, Math.round(FRAME_SEC * rate));
    const frame = n === x.length ? x : x.subarray(0, n);
    if (rms(frame) < MIN_RMS) return null;
    const f0 = yin(frame, rate);
    if (!(f0 >= F0_MIN && f0 <= F0_MAX)) return null;
    const sp = spectral(frame, rate);
    return { f0, mfcc: sp.mfcc, hiRatio: sp.hiRatio, formants: formants(frame, rate) };
  }

  function quantile(sorted, q) {
    if (!sorted.length) return NaN;
    const pos = (sorted.length - 1) * q;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }
  const round4 = (v) => Math.round(v * 10000) / 10000;

  // Summary of a run of voiced frames (as returned by analyseFrame).
  function summarise(frames) {
    const k = frames.length;
    if (!k) return null;
    const f = new Array(FEATURE_COUNT).fill(null);
    const logF0 = frames.map((fr) => Math.log2(fr.f0 / 100)).sort((a, b) => a - b);
    f[0] = quantile(logF0, 0.5);
    f[1] = quantile(logF0, 0.1);
    f[2] = quantile(logF0, 0.9);
    for (let c = 0; c < N_MFCC; c++) {
      let sum = 0;
      for (let i = 0; i < k; i++) sum += frames[i].mfcc[c];
      const mean = sum / k;
      let sq = 0;
      for (let i = 0; i < k; i++) { const d = frames[i].mfcc[c] - mean; sq += d * d; }
      f[3 + c] = mean;
      f[15 + c] = Math.sqrt(sq / k);
    }
    const withFormants = frames.filter((fr) => fr.formants);
    // Formant medians mean little over a handful of frames.
    if (withFormants.length >= Math.max(10, k * 0.15)) {
      for (let j = 0; j < 3; j++) {
        f[27 + j] = quantile(withFormants.map((fr) => fr.formants[j]).sort((a, b) => a - b), 0.5) / 1000;
      }
      f[30] = quantile(withFormants.map((fr) => spacingOf(fr.formants)).sort((a, b) => a - b), 0.5) / 1000;
    }
    f[31] = withFormants.length / k;
    let hi = 0;
    for (let i = 0; i < k; i++) hi += frames[i].hiRatio;
    f[32] = hi / k;
    return { v: VERSION, n: k, f: f.map((v) => (v === null ? null : round4(v))) };
  }

  // Collects voiced frames from raw microphone blocks.
  //   push(block, rate)  one block of about 43 ms at the microphone's rate
  //   summary()          the features so far, or null
  function createTracker() {
    let frames = [];
    let seen = 0;
    return {
      push(block, rate) {
        seen++;
        const d = decimatorFor(rate);
        const fr = analyseFrame(decimate(block, rate), d.rate);
        if (fr) frames.push(fr);
        return !!fr;
      },
      get voiced() { return frames.length; },
      get seen() { return seen; },
      summary() { return summarise(frames); },
      frames() { return frames; },
      reset() { frames = []; seen = 0; },
    };
  }

  return {
    VERSION, FEATURE_COUNT, TARGET_RATE, FRAME_SEC,
    createTracker, analyseFrame, summarise, decimate, decimatorFor,
    _yin: yin, _formants: formants, _spectral: spectral, _spacingOf: spacingOf, _rms: rms,
  };
});
