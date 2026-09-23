const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
process.chdir(__dirname); require('fs').mkdirSync('shots', { recursive: true });
const W = (ms) => new Promise(r => setTimeout(r, ms));
const BASE = process.env.BASE || 'http://127.0.0.1:6900';
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required'] });
  const mk = async () => { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, permissions: ['microphone'] });
    await ctx.addInitScript(() => { try { localStorage.setItem('talklive_age_consent','yes'); localStorage.setItem('talklive_mic_explained','yes'); localStorage.setItem('talklive_devnotice_2026-09','1'); localStorage.setItem('talklive_data_notice_v1','1'); localStorage.setItem('talklive_gender_asked','yes'); } catch(e){} });
    await ctx.addInitScript(() => { const s=document.createElement('style'); s.textContent='#visitorCount,#liveCount{visibility:hidden!important} .ad-slot,ins.adsbygoogle{display:none!important}'; document.addEventListener('DOMContentLoaded',()=>document.head.appendChild(s)); });
    return ctx.newPage(); };
  const A = await mk(), B = await mk();
  const shot = async (p, n) => { await p.screenshot({ path: `shots/${n}.png` }); };
  const vis = (p) => p.evaluate(() => [...document.querySelectorAll('[id]')].filter(e => e.offsetParent && /Modal|modal|Overlay|view|Panel|Stage/.test(e.id)).map(e=>e.id));
  for (const p of [A,B]) { await p.goto(BASE+'/', { waitUntil: 'networkidle' }); await W(800); }
  await shot(A,'01-home');
  const btns = await A.$$('#animalGrid button'); await btns[3].click(); await W(700); await A.evaluate(()=>scrollTo(0,0)); await W(300); await shot(A,'02-animal');
  const bb = await B.$$('#animalGrid button'); await bb[4].click(); await W(300);
  await A.click('#startBtn'); await W(1500); console.log('A', await vis(A)); await shot(A,'03-search');
  await W(1500); await shot(A,'03b-search');
  await B.click('#startBtn'); await W(5000); console.log('A', await vis(A)); await shot(A,'04-call'); await shot(B,'04-callB');
  await W(3000); for (let k=0;k<36;k++){ await shot(A,'call-'+String(k).padStart(2,'0')); await W(40);} 
  // text chat
  for (const p of [A,B]) { await p.goto(BASE+'/chat', { waitUntil: 'networkidle' }); await W(800); }
  await shot(A,'05-chathome');
  await A.click('#startBtn'); await W(800); console.log('A chat', await vis(A)); await shot(A,'05b');
  await B.click('#startBtn'); await W(3000); console.log('A chat', await vis(A)); await shot(A,'06-chatlive'); await shot(A,'chat-0');
  let ci=1; const say = async (p, t) => { await p.fill('#msgInput', t); await p.press('#msgInput','Enter'); await W(1200); await shot(A,'chat-'+(ci++)); };
  await say(B,'hey! where are you from?'); await say(A,'Karachi. you?'); await say(B,'Lisbon! it is 3am here and I cant sleep'); await say(A,'haha same. what keeps you up?'); await say(B,'honestly? just wanted to talk to someone new');
  await shot(A,'07-chatmsgs'); await shot(B,'07-chatmsgsB');
  await b.close();
})();
