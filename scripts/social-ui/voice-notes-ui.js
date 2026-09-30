// Friend voice messages in a real browser (fake microphone): the policy
// sheet, the request / accept flow on both sides, recording, sending and
// playing back.
//
//   node scripts/social-ui/voice-notes-ui.js [screenshot-dir]
const H = require('./harness');
const { ok, wait, ID } = H;

(async () => {
  const shots = process.argv[2] || null;
  const { srv, base, dir } = await H.start({ port: 6840 + Math.floor(Math.random() * 100) });
  const ben = H.bot(base, 'ben');
  const { b, page } = await H.browser(base, { path: '/' });
  const q = (fn, arg) => page.evaluate(fn, arg);
  const shot = async (name) => { if (shots) await page.screenshot({ path: `${shots}/${name}.png` }); };
  try {
    await wait(3000);
    await q((id) => openFriendChat(id), ID.ben);
    await wait(800);
    ok('mic button shows in a friend chat', await q(() => {
      const m = document.querySelector('#friendChatForm .vn-mic-btn');
      return !!m && !m.hidden && m.offsetParent !== null;
    }));

    // --- Sender: policy, then request ---------------------------------------
    await page.click('#friendChatForm .vn-mic-btn');
    await page.waitForSelector('.vn-dialog-overlay.open', { timeout: 3000 });
    await wait(300);
    ok('policy dialog shows before first use', await q(() => /stay safe/i.test(document.querySelector('.vn-dialog-title').textContent)));
    ok('continue waits on the agreement box', await q(() => document.querySelector('.vn-dialog-actions .btn-primary').disabled));
    await shot('1-policy-dialog');
    const requested = H.once(ben, 'voice-note-state');
    await page.click('.vn-dialog-agree input');
    await page.click('.vn-dialog-actions .btn-primary');
    const st = await requested;
    ok('the friend is asked', st.state === 'received' && st.clientId === ID.ann);
    await wait(300);
    ok('the chat says it is waiting', await q(() => /Waiting for/.test(document.querySelector('.vn-gate').textContent)));

    const accepted = H.once(ben, 'voice-note-state');
    ben.emit('voice-note-respond', { fromClientId: ID.ann, accept: true });
    await accepted;
    await wait(400);
    ok('accepted: the chat says voice messages are on', await q(() => /Voice messages are on/.test(document.querySelector('.vn-gate').textContent)));

    // --- Record and send ------------------------------------------------------
    await page.click('#friendChatForm .vn-mic-btn');
    await page.waitForSelector('#friendChatForm.vn-recording', { timeout: 4000 });
    ok('recording bar replaces the composer', await q(() => !document.querySelector('#friendChatInput').offsetParent));
    await wait(1600);
    await shot('2-recording');
    const delivered = H.once(ben, 'friend-message', 8000);
    await page.click('.vn-rec-send');
    const msg = await delivered;
    ok('the voice message reaches the friend', msg.voice && msg.voice.id && msg.voice.ms >= 1000, JSON.stringify(msg.voice));
    await wait(500);
    ok('it shows as a player, not pending', await q(() => {
      const el = [...document.querySelectorAll('#friendChatMessages .chat-msg.me')].pop();
      return !!el.querySelector('.vn-player') && !el.classList.contains('is-pending');
    }));

    // --- Receiver: review and accept -------------------------------------------
    const off = H.once(ben, 'voice-note-state');
    ben.emit('voice-note-disable', { clientId: ID.ann });
    await off;
    await page.evaluate(() => localStorage.removeItem('tl_voice_policy_v2'));
    ben.emit('voice-note-request', { toClientId: ID.ann });
    await page.waitForSelector('.vn-gate [data-vn-act="review"]', { timeout: 4000 });
    await shot('3-request-banner');
    await page.click('.vn-gate [data-vn-act="review"]');
    await page.waitForSelector('.vn-dialog-overlay.open', { timeout: 3000 });
    await wait(300);
    ok('accept dialog warns before agreeing', await q(() => /trust/.test(document.querySelector('.vn-dialog').textContent)
      && document.querySelector('.vn-dialog-actions .btn-primary').disabled));
    await shot('4-accept-dialog');
    const nowOn = H.once(ben, 'voice-note-state');
    await page.click('.vn-dialog-agree input');
    await page.click('.vn-dialog-actions .btn-primary');
    ok('accepting turns it on', (await nowOn).state === 'on');

    // --- Playback of a message from the friend --------------------------------
    const clip = await ben.timeout(5000).emitWithAck('voice-note-get', { id: msg.voice.id, chatWith: ID.ann });
    const back = await ben.timeout(8000).emitWithAck('friend-voice-note', {
      toClientId: ID.ann, id: 'mback1', mime: clip.mime, ms: msg.voice.ms, audio: clip.data,
    });
    ok('the friend can reply with a voice message', back && back.ok, JSON.stringify(back));
    await wait(700);
    await page.click('#friendChatMessages .chat-msg.them:last-of-type .vn-play');
    await wait(1200);
    ok('it plays', await q(() => {
      const p = [...document.querySelectorAll('#friendChatMessages .chat-msg.them .vn-player')].pop();
      return p && !p.classList.contains('failed') && (p.classList.contains('playing') || /0:0[1-9]/.test(p.textContent));
    }));
    await shot('5-chat');

    // Third-party scripts (ads, sign-in) are unreachable in a sandbox.
    const errors = page.errors.filter((e) => !/Failed to load resource/.test(e));
    ok('no page errors', errors.length === 0, errors.join('\n'));
  } catch (err) {
    console.error(err);
    ok('ran to the end', false, err.message);
  } finally {
    await b.close();
    ben.close();
    srv.kill('SIGKILL');
    require('fs').rmSync(dir, { recursive: true, force: true });
    console.log(H.failed() ? `\n${H.failed()} check(s) failed` : '\nAll checks passed');
    process.exit(H.failed() ? 1 : 0);
  }
})();
