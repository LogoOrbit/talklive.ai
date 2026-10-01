// TalkLive - voice messages in friend chats.
//
// Three pieces, all host-agnostic (app.js supplies the strings and the socket):
//   dialog(opts)          a policy / consent sheet; resolves true on agree
//   createRecorder(opts)  the mic button and the "recording…" composer bar
//   renderPlayer(opts)    the play / progress / duration bubble body
//
// Audio for a message is fetched once and kept as an object URL for the rest
// of the session, so re-rendering a thread (which happens on every message and
// receipt) never refetches or restarts anything.
(function () {
  'use strict';

  var MAX_MS = 60 * 1000;
  var MAX_BYTES = 700 * 1024;
  var MIMES = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/aac'];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function fmt(ms) {
    var s = Math.max(0, Math.round(ms / 1000));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  var ICON_MIC = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z"/></svg>';
  var ICON_PLAY = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z"/></svg>';
  var ICON_PAUSE = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
  var ICON_SEND = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z"/></svg>';
  var ICON_X = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7l-1.4-1.4L9.2 12 2.9 5.7l1.4-1.4 6.3 6.3 6.3-6.3z"/></svg>';

  // Speech-to-text alongside the recording, for moderation tags. Desktop only:
  // on phones the recognizer competes with the recorder for the microphone
  // (and beeps), so a phone's voice message simply has no transcript.
  function transcriber() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')) return null;
    var parts = [];
    var sr;
    try {
      sr = new SR();
      sr.continuous = true;
      sr.interimResults = false;
      sr.lang = document.documentElement.lang || navigator.language || 'en-US';
      sr.onresult = function (e) {
        for (var i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) parts.push(e.results[i][0].transcript);
        }
      };
      sr.onerror = function () { /* no transcript is fine */ };
      sr.start();
    } catch (_) { return null; }
    return {
      // Resolves with whatever was recognised, a moment after the recording
      // stops (the last phrase is finalised on stop).
      finish: function () {
        return new Promise(function (resolve) {
          var done = false;
          function out() { if (!done) { done = true; resolve(parts.join(' ').trim()); } }
          sr.onend = out;
          try { sr.stop(); } catch (_) { out(); }
          setTimeout(out, 1200);
        });
      },
      abort: function () { try { sr.abort(); } catch (_) { /* gone */ } },
    };
  }

  function supported() {
    return !!(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }
  function pickMime() {
    if (!window.MediaRecorder || typeof MediaRecorder.isTypeSupported !== 'function') return '';
    for (var i = 0; i < MIMES.length; i++) {
      if (MediaRecorder.isTypeSupported(MIMES[i])) return MIMES[i];
    }
    return '';
  }

  // --- dialog -----------------------------------------------------------------
  // opts: { title, intro, points: [{ icon, text }], agree, ok, cancel, link }
  // `agree` adds a checkbox the OK button waits on - consent has to be a
  // deliberate act, not a reflexive tap on the biggest button.
  var openDialog = null;
  function dialog(opts) {
    if (openDialog) openDialog(false);
    return new Promise(function (resolve) {
      var prevFocus = document.activeElement;
      var overlay = el('div', 'vn-dialog-overlay');
      var box = el('div', 'vn-dialog');
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      var icon = el('div', 'vn-dialog-icon');
      icon.innerHTML = ICON_MIC;
      var title = el('h2', 'vn-dialog-title', opts.title);
      title.id = 'vnDialogTitle';
      box.setAttribute('aria-labelledby', title.id);
      box.appendChild(icon);
      box.appendChild(title);
      if (opts.intro) box.appendChild(el('p', 'vn-dialog-intro', opts.intro));
      var list = el('ul', 'vn-dialog-points');
      (opts.points || []).forEach(function (p) {
        var li = el('li');
        li.appendChild(el('span', 'vn-dialog-bullet', p.icon || '•'));
        li.appendChild(el('span', '', p.text));
        list.appendChild(li);
      });
      box.appendChild(list);
      if (opts.link) {
        var a = el('a', 'vn-dialog-link', opts.link.text);
        a.href = opts.link.href;
        a.target = '_blank';
        a.rel = 'noopener';
        box.appendChild(a);
      }
      var check = null;
      if (opts.agree) {
        var label = el('label', 'vn-dialog-agree');
        check = el('input');
        check.type = 'checkbox';
        label.appendChild(check);
        label.appendChild(el('span', '', opts.agree));
        box.appendChild(label);
      }
      var actions = el('div', 'vn-dialog-actions');
      var cancel = el('button', 'btn btn-secondary', opts.cancel);
      cancel.type = 'button';
      var ok = el('button', 'btn btn-primary', opts.ok);
      ok.type = 'button';
      if (check) {
        ok.disabled = true;
        check.addEventListener('change', function () { ok.disabled = !check.checked; });
      }
      actions.appendChild(cancel);
      actions.appendChild(ok);
      box.appendChild(actions);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
      requestAnimationFrame(function () { overlay.classList.add('open'); });

      function done(result) {
        if (openDialog !== done) return;
        openDialog = null;
        document.removeEventListener('keydown', onKey, true);
        overlay.classList.remove('open');
        setTimeout(function () { overlay.remove(); }, 220);
        if (prevFocus && prevFocus.focus) { try { prevFocus.focus(); } catch (_) { /* gone */ } }
        resolve(result);
      }
      function onKey(e) {
        if (e.key === 'Escape') { e.stopPropagation(); done(false); }
      }
      openDialog = done;
      document.addEventListener('keydown', onKey, true);
      cancel.addEventListener('click', function () { done(false); });
      ok.addEventListener('click', function () { if (!ok.disabled) done(true); });
      overlay.addEventListener('click', function (e) { if (e.target === overlay) done(false); });
      (check || ok).focus({ preventScroll: true });
      box.scrollTop = 0;
    });
  }

  // --- recorder ---------------------------------------------------------------
  // opts: { form, before, labels: { record, cancel, send }, onMic(), onDone({ blob, mime, ms }), onError(key) }
  function createRecorder(opts) {
    var labels = opts.labels || {};
    var mic = el('button', 'cx-btn vn-mic-btn');
    mic.type = 'button';
    mic.innerHTML = ICON_MIC;
    mic.setAttribute('aria-label', labels.record || 'Record');
    mic.title = labels.record || 'Record';
    mic.hidden = true;
    opts.form.insertBefore(mic, opts.before || null);

    var bar = el('div', 'vn-rec');
    bar.hidden = true;
    var cancelBtn = el('button', 'vn-rec-cancel');
    cancelBtn.type = 'button';
    cancelBtn.innerHTML = ICON_X;
    cancelBtn.setAttribute('aria-label', labels.cancel || 'Cancel');
    var dot = el('span', 'vn-rec-dot');
    var time = el('span', 'vn-rec-time', '0:00');
    var meter = el('span', 'vn-rec-meter');
    var sendBtn = el('button', 'vn-rec-send');
    sendBtn.type = 'button';
    sendBtn.innerHTML = ICON_SEND;
    sendBtn.setAttribute('aria-label', labels.send || 'Send');
    bar.appendChild(cancelBtn);
    bar.appendChild(dot);
    bar.appendChild(time);
    bar.appendChild(meter);
    bar.appendChild(sendBtn);
    opts.form.appendChild(bar);

    var rec = null;      // { mr, stream, chunks, started, timer, keep }
    var starting = false;

    function setUi(on) {
      bar.hidden = !on;
      opts.form.classList.toggle('vn-recording', on);
    }
    function cleanup() {
      if (!rec) return;
      if (rec.stt && !rec.keep) rec.stt.abort();
      clearInterval(rec.timer);
      rec.stream.getTracks().forEach(function (tr) { tr.stop(); });
      rec = null;
      setUi(false);
    }
    function finish(keep) {
      if (!rec) return;
      rec.keep = keep;
      if (rec.mr.state !== 'inactive') rec.mr.stop();
      else cleanup();
    }

    function start() {
      if (rec || starting) return;
      if (!supported()) { if (opts.onError) opts.onError('unsupported'); return; }
      starting = true;
      navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).then(function (stream) {
        starting = false;
        var mime = pickMime();
        var mr;
        try {
          mr = mime ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 32000 }) : new MediaRecorder(stream);
        } catch (_) {
          mr = new MediaRecorder(stream);
        }
        rec = { mr: mr, stream: stream, chunks: [], started: Date.now(), timer: null, keep: false, stt: transcriber() };
        var mine = rec;
        mr.addEventListener('dataavailable', function (e) { if (e.data && e.data.size) mine.chunks.push(e.data); });
        mr.addEventListener('stop', function () {
          var ms = Date.now() - mine.started;
          var type = (mr.mimeType || mime || 'audio/webm').split(';')[0];
          var blob = new Blob(mine.chunks, { type: type });
          var keep = mine.keep;
          var stt = mine.stt;
          if (rec === mine) cleanup();
          if (!keep || ms < 500 || blob.size < 200) { if (stt) stt.abort(); return; }
          if (blob.size > MAX_BYTES) { if (stt) stt.abort(); if (opts.onError) opts.onError('too-long'); return; }
          var send = function (transcript) {
            opts.onDone({ blob: blob, mime: type, ms: Math.min(ms, MAX_MS), transcript: transcript || '' });
          };
          if (stt) stt.finish().then(send); else send('');
        });
        mr.start(250);
        time.textContent = '0:00';
        setUi(true);
        rec.timer = setInterval(function () {
          var ms = Date.now() - mine.started;
          time.textContent = fmt(ms);
          // The cap sends rather than discards: a minute of talking is not
          // something to throw away because the minute ran out.
          if (ms >= MAX_MS) finish(true);
        }, 250);
        sendBtn.focus();
      }).catch(function () {
        starting = false;
        if (opts.onError) opts.onError('denied');
      });
    }

    // Nobody found the mic, so it calls attention to itself when a chat opens:
    // a pop and a few pulses, and until the first tap it keeps pulsing.
    var USED_KEY = 'tl-vn-mic-used';
    function micUsed() { try { return !!localStorage.getItem(USED_KEY); } catch (_) { return false; } }
    var nudgeTimer = null;
    function stopNudge() {
      clearTimeout(nudgeTimer);
      mic.classList.remove('vn-nudge', 'vn-nudge-loop');
    }
    function nudge() {
      stopNudge();
      // after the chat panel has slid in, or the pop is missed
      nudgeTimer = setTimeout(function () {
        if (mic.hidden || rec) return;
        void mic.offsetWidth; // restart the animation
        mic.classList.add('vn-nudge');
        if (!micUsed()) mic.classList.add('vn-nudge-loop');
      }, 350);
    }

    mic.addEventListener('click', function () {
      stopNudge();
      try { localStorage.setItem(USED_KEY, '1'); } catch (_) { /* storage blocked */ }
      if (!rec && opts.onMic) opts.onMic();
    });
    cancelBtn.addEventListener('click', function () { finish(false); });
    sendBtn.addEventListener('click', function () { finish(true); });

    return {
      start: start,
      cancel: function () { finish(false); },
      recording: function () { return !!rec; },
      setVisible: function (on) {
        mic.hidden = !(on && supported());
        if (!on) { stopNudge(); finish(false); }
      },
      nudge: nudge,
    };
  }

  // --- player -----------------------------------------------------------------
  var urls = new Map();     // key -> object URL
  var loading = new Map();  // key -> Promise<url>
  var current = null;       // the one playing <audio>

  function remember(key, blob) {
    if (!key || !blob || urls.has(key)) return;
    urls.set(key, URL.createObjectURL(blob));
  }
  function alias(from, to) {
    if (urls.has(from) && !urls.has(to)) urls.set(to, urls.get(from));
  }
  function urlFor(key, load) {
    if (urls.has(key)) return Promise.resolve(urls.get(key));
    if (loading.has(key)) return loading.get(key);
    var p = load().then(function (blob) {
      loading.delete(key);
      remember(key, blob);
      return urls.get(key);
    }, function (err) {
      loading.delete(key);
      throw err;
    });
    loading.set(key, p);
    return p;
  }

  // opts: { key, ms, load: () => Promise<Blob>, labels: { play, pause, unavailable } }
  function renderPlayer(opts) {
    var labels = opts.labels || {};
    var root = el('div', 'vn-player');
    var btn = el('button', 'vn-play');
    btn.type = 'button';
    btn.innerHTML = ICON_PLAY;
    btn.setAttribute('aria-label', labels.play || 'Play');
    var track = el('div', 'vn-track');
    var fill = el('div', 'vn-fill');
    track.appendChild(fill);
    var time = el('span', 'vn-time', fmt(opts.ms));
    root.appendChild(btn);
    root.appendChild(track);
    root.appendChild(time);

    var audio = null;
    var total = opts.ms / 1000;
    function paint() {
      if (!audio) return;
      var pos = audio.currentTime || 0;
      fill.style.transform = 'scaleX(' + Math.min(1, total ? pos / total : 0) + ')';
      time.textContent = fmt((audio.paused && pos === 0 ? total : pos) * 1000);
    }
    function setPlaying(on) {
      btn.innerHTML = on ? ICON_PAUSE : ICON_PLAY;
      btn.setAttribute('aria-label', on ? (labels.pause || 'Pause') : (labels.play || 'Play'));
      root.classList.toggle('playing', on);
    }
    btn.addEventListener('click', function () {
      if (audio && !audio.paused) { audio.pause(); return; }
      root.classList.add('loading');
      urlFor(opts.key, opts.load).then(function (url) {
        root.classList.remove('loading');
        if (!audio) {
          audio = new Audio(url);
          audio.addEventListener('timeupdate', paint);
          audio.addEventListener('play', function () { setPlaying(true); });
          audio.addEventListener('pause', function () { setPlaying(false); paint(); });
          audio.addEventListener('ended', function () {
            setPlaying(false);
            audio.currentTime = 0;
            fill.style.transform = 'scaleX(0)';
            time.textContent = fmt(opts.ms);
          });
        }
        if (current && current !== audio) current.pause();
        current = audio;
        var p = audio.play();
        if (p && p.catch) p.catch(function () { setPlaying(false); });
      }, function () {
        root.classList.remove('loading');
        root.classList.add('failed');
        time.textContent = labels.unavailable || '—';
      });
    });
    return root;
  }

  window.TalkLiveVoiceNotes = {
    supported: supported,
    dialog: dialog,
    createRecorder: createRecorder,
    renderPlayer: renderPlayer,
    remember: remember,
    alias: alias,
    MAX_MS: MAX_MS,
  };
})();
