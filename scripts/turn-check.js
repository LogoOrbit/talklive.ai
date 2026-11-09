/* global RTCPeerConnection */
// Checks the live relay (TURN) credentials from talklive.app: gathers relay
// candidates and makes a relay-only call between two peers in one browser.
const { chromium } = require('playwright');
(async () => {
  const ice = await (await fetch('https://talklive.app/ice-servers')).json();
  console.log('servers:', ice.iceServers.map((s) => [].concat(s.urls).join(' ') + (s.username ? ' (with credentials)' : '')).join('\n  '));
  const b = await chromium.launch();
  const p = await b.newPage();
  const r = await p.evaluate(async (ice) => {
    const cfg = { iceServers: ice.iceServers, iceTransportPolicy: 'relay' };
    const a = new RTCPeerConnection(cfg), c = new RTCPeerConnection(cfg);
    const cands = [], errs = [];
    a.onicecandidate = (e) => { if (e.candidate) { cands.push(e.candidate.type + ' ' + e.candidate.protocol + ' ' + (e.candidate.url || '')); c.addIceCandidate(e.candidate); } };
    c.onicecandidate = (e) => { if (e.candidate) a.addIceCandidate(e.candidate); };
    a.onicecandidateerror = (e) => errs.push(e.errorCode + ' ' + e.errorText + ' ' + e.url);
    const ch = a.createDataChannel('x');
    await a.setLocalDescription(await a.createOffer());
    await c.setRemoteDescription(a.localDescription);
    await c.setLocalDescription(await c.createAnswer());
    await a.setRemoteDescription(c.localDescription);
    const opened = await new Promise((res) => { ch.onopen = () => res(true); setTimeout(() => res(false), 15000); });
    return { opened, state: a.connectionState, cands: [...new Set(cands)], errs: [...new Set(errs)] };
  }, ice);
  console.log(JSON.stringify(r, null, 1));
  console.log(r.opened ? 'RELAY OK' : 'RELAY FAILED');
  await b.close();
  process.exit(r.opened ? 0 : 1);
})();
