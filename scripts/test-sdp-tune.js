// The pure call-tuning helpers in public/app.js (between the <sdp-tune>
// markers): Opus SDP munging, the adaptive bitrate step and the ICE restart
// backoff. The block is evaluated on its own, exactly as the page runs it.
//
//   node scripts/test-sdp-tune.js
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
const a = src.indexOf('// <sdp-tune>');
const b = src.indexOf('// </sdp-tune>');
if (a === -1 || b === -1) { console.log('FAIL <sdp-tune> block not found in public/app.js'); process.exit(1); }
const T = new Function(src.slice(a, b) + '\nreturn { tuneOpusSdp, nextAudioBitrate, iceRestartDelay, ICE_RESTART_MAX, OPUS_MAX_AVG_BITRATE, AUDIO_LOW_BITRATE };')();

let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : JSON.stringify(extra));
};

// What Chrome offers for an audio-only call (trimmed).
const chrome = [
  'v=0', 'o=- 1 2 IN IP4 127.0.0.1', 's=-', 't=0 0', 'a=group:BUNDLE 0',
  'm=audio 9 UDP/TLS/RTP/SAVPF 111 63 9 0 8 13 110 126',
  'c=IN IP4 0.0.0.0', 'a=mid:0', 'a=sendrecv', 'a=rtcp-mux',
  'a=rtpmap:111 opus/48000/2', 'a=rtcp-fb:111 transport-cc', 'a=fmtp:111 minptime=10;useinbandfec=1',
  'a=rtpmap:63 red/48000/2', 'a=fmtp:63 111/111',
  'a=rtpmap:9 G722/8000', 'a=rtpmap:0 PCMU/8000', '',
].join('\r\n');
const fmtp = (sdp, pt) => (sdp.split(/\r?\n/).find((l) => l.startsWith(`a=fmtp:${pt} `)) || '');

const tuned = T.tuneOpusSdp(chrome);
const line = fmtp(tuned, 111);
ok('keeps existing Opus parameters', /minptime=10/.test(line), line);
ok('in-band FEC on', /useinbandfec=1/.test(line) && (line.match(/useinbandfec/g) || []).length === 1, line);
ok('DTX on', /usedtx=1/.test(line), line);
ok('average bitrate capped for one voice', /maxaveragebitrate=28000/.test(line), line);
ok('other codecs untouched', fmtp(tuned, 63) === 'a=fmtp:63 111/111' && tuned.includes('a=rtpmap:9 G722/8000'));
ok('CRLF line endings kept', !/[^\r]\n/.test(tuned));
ok('idempotent', T.tuneOpusSdp(tuned) === tuned);

// Firefox / libwebrtc builds without an Opus fmtp line, and LF endings.
const bare = 'v=0\nm=audio 9 UDP/TLS/RTP/SAVPF 109\na=rtpmap:109 opus/48000/2\na=sendrecv\n';
const bareOut = T.tuneOpusSdp(bare);
ok('adds an fmtp line when there is none', /a=rtpmap:109 opus\/48000\/2\na=fmtp:109 useinbandfec=1;usedtx=1;maxaveragebitrate=28000\n/.test(bareOut), bareOut);
ok('no Opus, no change', T.tuneOpusSdp('v=0\r\nm=audio 9 RTP/AVP 0\r\na=rtpmap:0 PCMU/8000\r\n') === 'v=0\r\nm=audio 9 RTP/AVP 0\r\na=rtpmap:0 PCMU/8000\r\n');
ok('non-strings pass through', T.tuneOpusSdp(undefined) === undefined && T.tuneOpusSdp('') === '');
ok('options respected', /usedtx=0/.test(fmtp(T.tuneOpusSdp(chrome, { dtx: false }), 111)));

// Adaptive bitrate step.
let st = { bitrate: T.OPUS_MAX_AVG_BITRATE, bad: 0, good: 0 };
const bad = { loss: 0.08, rttMs: 150 };
const good = { loss: 0.0, rttMs: 80 };
st = T.nextAudioBitrate(st, bad); st = T.nextAudioBitrate(st, bad);
ok('two bad samples are not enough', st.bitrate === T.OPUS_MAX_AVG_BITRATE && !st.changed);
st = T.nextAudioBitrate(st, bad);
ok('three bad samples (6s) step down', st.bitrate === T.AUDIO_LOW_BITRATE && st.changed);
st = T.nextAudioBitrate(st, bad);
ok('staying bad does not change again', st.bitrate === T.AUDIO_LOW_BITRATE && !st.changed);
for (let i = 0; i < 4; i++) st = T.nextAudioBitrate(st, good);
ok('four good samples are not enough to restore', st.bitrate === T.AUDIO_LOW_BITRATE);
st = T.nextAudioBitrate(st, good);
ok('five good samples (10s) restore', st.bitrate === T.OPUS_MAX_AVG_BITRATE && st.changed);
let rttOnly = { bitrate: T.OPUS_MAX_AVG_BITRATE };
for (let i = 0; i < 3; i++) rttOnly = T.nextAudioBitrate(rttOnly, { loss: null, rttMs: 600 });
ok('a long round trip alone also steps down', rttOnly.bitrate === T.AUDIO_LOW_BITRATE);
let unknown = { bitrate: T.AUDIO_LOW_BITRATE };
for (let i = 0; i < 10; i++) unknown = T.nextAudioBitrate(unknown, { loss: null, rttMs: null });
ok('no data is neither good nor bad', unknown.bitrate === T.AUDIO_LOW_BITRATE);
let wobble = { bitrate: T.OPUS_MAX_AVG_BITRATE };
for (let i = 0; i < 10; i++) wobble = T.nextAudioBitrate(wobble, i % 2 ? bad : good);
ok('an alternating link does not flap', wobble.bitrate === T.OPUS_MAX_AVG_BITRATE);

// ICE restart backoff.
ok('first restart at once, then backoff', T.iceRestartDelay(0) === 0 && T.iceRestartDelay(1) === 2000 && T.iceRestartDelay(2) === 4000 && T.iceRestartDelay(3) === 8000);
ok('backoff is capped', T.iceRestartDelay(10) === 8000);
ok('restarts are bounded', T.ICE_RESTART_MAX > 0 && T.ICE_RESTART_MAX <= 8);

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
