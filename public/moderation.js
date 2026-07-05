// Real-time call moderation: transcribes the local mic with the free Web
// Speech API, runs a keyword filter + basic lexicon sentiment analysis on the
// transcript, and detects sustained shouting via Web Audio RMS. Any trigger
// is reported to the server as a 'moderation-alert', which logs it to the
// owner dashboard and emails the owner (existing free SMTP setup).
//
// Web Speech API is Chrome/Edge/Safari only; on unsupported browsers only the
// shouting detector runs. Everything degrades silently — moderation must
// never break the call itself.
(function () {
  'use strict';

  // --- Keyword filter -------------------------------------------------------
  // Normalized (lowercase, leetspeak-collapsed) substrings/words. Extend freely.
  const OFFENSIVE_WORDS = [
    'fuck', 'fucking', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'dick',
    'slut', 'whore', 'nigger', 'nigga', 'faggot', 'retard', 'motherfucker',
    'kill yourself', 'kys', 'rape', 'molest',
  ];

  // Negative-sentiment lexicon with weights. A rolling window of recent
  // speech is scored; crossing SENTIMENT_THRESHOLD flags verbal abuse even
  // when no single word is on the offensive list.
  const NEGATIVE_LEXICON = {
    hate: 2, stupid: 2, idiot: 2, ugly: 1, dumb: 2, loser: 2, pathetic: 2,
    worthless: 3, disgusting: 2, trash: 1, garbage: 1, shut: 1, die: 3,
    threat: 3, hurt: 2, punch: 2, beat: 2, scared: 1, angry: 1, scream: 1,
    creep: 2, pervert: 3, harass: 3, abuse: 3, racist: 3, sexist: 3,
  };
  const SENTIMENT_THRESHOLD = 5;   // cumulative weight within the window
  const SENTIMENT_WINDOW_MS = 30000;

  // --- Shouting detection ---------------------------------------------------
  const SHOUT_RMS = 0.28;          // RMS amplitude considered "shouting"
  const SHOUT_SUSTAIN_MS = 1500;   // must stay loud this long to trigger
  const ALERT_COOLDOWN_MS = 60000; // per-type client-side throttle

  let recognition = null;
  let running = false;
  let socketRef = null;
  let audioCtx = null;
  let analyserTimer = null;
  let loudSince = 0;
  let sentimentEvents = []; // { ts, score }
  const lastAlertAt = {};   // type -> ts

  function normalize(text) {
    return text
      .toLowerCase()
      .replace(/[@]/g, 'a').replace(/[$5]/g, 's').replace(/[1!]/g, 'i')
      .replace(/[3]/g, 'e').replace(/[0]/g, 'o')
      .replace(/[^a-z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function sendAlert(type, detail, transcript) {
    const now = Date.now();
    if (now - (lastAlertAt[type] || 0) < ALERT_COOLDOWN_MS) return;
    lastAlertAt[type] = now;
    if (socketRef) {
      socketRef.emit('moderation-alert', {
        type, // 'keyword' | 'sentiment' | 'shouting'
        detail: String(detail).slice(0, 200),
        transcript: String(transcript || '').slice(0, 500),
      });
    }
  }

  function analyzeTranscript(text) {
    const norm = normalize(text);
    if (!norm) return;

    // 1) Keyword filter — exact word/phrase match on the normalized text.
    const padded = ` ${norm} `;
    for (const word of OFFENSIVE_WORDS) {
      if (padded.includes(` ${word} `) || padded.includes(` ${word}s `)) {
        sendAlert('keyword', word, text);
        break;
      }
    }

    // 2) Sentiment — score words against the negative lexicon and keep a
    // rolling 30s window so persistent hostility triggers even if each
    // individual sentence looks mild.
    let score = 0;
    for (const w of norm.split(' ')) score += NEGATIVE_LEXICON[w] || 0;
    if (score > 0) {
      const now = Date.now();
      sentimentEvents.push({ ts: now, score });
      sentimentEvents = sentimentEvents.filter((e) => now - e.ts < SENTIMENT_WINDOW_MS);
      const total = sentimentEvents.reduce((s, e) => s + e.score, 0);
      if (total >= SENTIMENT_THRESHOLD) {
        sendAlert('sentiment', `negative score ${total} in 30s`, text);
        sentimentEvents = [];
      }
    }
  }

  function startRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return; // unsupported browser — shouting detection still runs
    recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = document.documentElement.lang || 'en-US';
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) analyzeTranscript(event.results[i][0].transcript);
      }
    };
    // The API stops itself after silence/errors; keep restarting while a call
    // is live. 'not-allowed' means the user denied it — don't fight that.
    recognition.onend = () => {
      if (running && recognition) {
        try { recognition.start(); } catch (_) { /* already started */ }
      }
    };
    recognition.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        running = false;
      }
    };
    try { recognition.start(); } catch (_) { /* ignore */ }
  }

  function startLoudnessMonitor(stream) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      analyserTimer = setInterval(() => {
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);
        const now = Date.now();
        if (rms >= SHOUT_RMS) {
          if (!loudSince) loudSince = now;
          else if (now - loudSince >= SHOUT_SUSTAIN_MS) {
            sendAlert('shouting', `sustained RMS ${rms.toFixed(2)}`, '');
            loudSince = 0;
          }
        } else {
          loudSince = 0;
        }
      }, 200);
    } catch (_) { /* Web Audio unavailable — skip */ }
  }

  window.Moderation = {
    start(stream, socket) {
      if (running) return;
      running = true;
      socketRef = socket;
      sentimentEvents = [];
      loudSince = 0;
      startRecognition();
      if (stream) startLoudnessMonitor(stream);
    },
    stop() {
      running = false;
      if (recognition) {
        recognition.onend = null;
        try { recognition.stop(); } catch (_) { /* ignore */ }
        recognition = null;
      }
      clearInterval(analyserTimer);
      analyserTimer = null;
      if (audioCtx) {
        audioCtx.close().catch(() => {});
        audioCtx = null;
      }
    },
  };
})();
