// Chat Support: the help chat behind the bubble on every page.
//
// Anyone can open it. A signed-in user is identified by their account (whose
// email is already verified); a guest must give an email address first, which
// is also where the owner's replies are sent when they have left the site.
//
// Conversations live in the store document (store.data.support). A browser
// holds { id, key } for its conversation; only a hash of the key is stored. A
// signed-in user can also reach their conversation by session token, so it
// follows them to a new device.
//
// The owner answers from the dashboard (/owner#support). info@talklive.app
// (CONTACT_TO) gets an email for every new conversation, and for later messages
// only while the owner is not on the dashboard, at most one per conversation
// every 15 minutes. Owner phone push is optional (dashboard > Support).
const crypto = require('crypto');
const express = require('express');

const MAX_CONVERSATIONS = 2000;
const MAX_MESSAGES = 400;
const MAX_TEXT = 2000;
const OWNER_EMAIL_GAP_MS = 15 * 60000;
// The owner counts as "online" while a dashboard tab has polled this recently.
const OWNER_ONLINE_MS = 2 * 60000;
// A reply is emailed to the user unless their chat window polled this recently.
const USER_ACTIVE_MS = 90 * 1000;
const OWNER_PUSH_ID = 'owner:support';

const DEFAULT_SETTINGS = {
  away: false,
  greeting: 'Hi! 👋 How can we help? Send us a message and we\'ll reply here.',
  awayMessage: 'We\'re away right now. Leave a message and we\'ll reply here and by email.',
  quickReplies: [
    'Thanks for reaching out! Looking into this now.',
    'Could you tell me a bit more about what happened?',
    'This should be fixed now. Can you try again and let me know?',
    'Glad I could help! Anything else?',
  ],
};

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>.]+(\.[^\s@<>.]+)+$/;
const hash = (v) => crypto.createHash('sha256').update(String(v)).digest('hex');
const cleanText = (v) => String(v || '').replace(/\r\n?/g, '\n').trim().slice(0, MAX_TEXT);
const cleanLine = (v, n) => String(v || '').replace(/[\r\n]+/g, ' ').trim().slice(0, n);
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function createSupport({ store, mail, push, contactTo, siteUrl, httpRateLimit, clientIp, geoOf }) {
  let ownerSeenAt = 0;

  function state() {
    const d = store.data;
    if (!d.support || typeof d.support !== 'object') d.support = {};
    const s = d.support;
    if (!Array.isArray(s.conversations)) s.conversations = [];
    s.settings = { ...DEFAULT_SETTINGS, ...(s.settings || {}) };
    return s;
  }
  const find = (id) => state().conversations.find((c) => c.id === id) || null;
  const lastMsg = (c) => c.messages[c.messages.length - 1] || null;
  const ownerOnline = () => Date.now() - ownerSeenAt < OWNER_ONLINE_MS;

  // Waiting for the owner: the newest message is from the user.
  const waiting = (c) => c.status === 'open' && lastMsg(c) && lastMsg(c).from === 'user';
  const ownerUnread = (c) => c.messages.filter((m) => m.from === 'user' && m.ts > (c.ownerReadAt || 0)).length;

  // One key per browser that has opened this chat (newest few kept).
  function addKey(c, key) {
    c.keyHashes = [...(c.keyHashes || []), hash(key)].slice(-8);
  }

  function addMessage(c, from, text) {
    const m = { id: crypto.randomBytes(6).toString('hex'), from, text, ts: Date.now() };
    c.messages.push(m);
    if (c.messages.length > MAX_MESSAGES) c.messages.splice(0, c.messages.length - MAX_MESSAGES);
    c.updatedAt = m.ts;
    return m;
  }

  function sessionUser(token) {
    if (!token || typeof token !== 'string') return null;
    const u = store.getAuthSessionUser(token);
    if (!u) return null;
    const acc = store.data.accounts[u];
    return acc ? { username: u, nickname: acc.nickname || u, email: acc.email || '' } : null;
  }

  // The browser's key, or the signed-in account that owns the conversation.
  function authorize(body) {
    const c = find(String(body.id || ''));
    if (!c) return null;
    if (body.key && (c.keyHashes || []).includes(hash(body.key))) return c;
    const u = sessionUser(body.sessionToken);
    if (u && c.account === u.username) return c;
    return null;
  }

  function publicView(c) {
    return {
      id: c.id,
      status: c.status,
      email: c.email,
      messages: c.messages.map(({ id, from, text, ts }) => ({ id, from, text, ts })),
    };
  }

  // --- Notifications -------------------------------------------------------
  function notifyOwner(c, m, isNew) {
    const who = c.name ? `${c.name} <${c.email}>` : c.email;
    const link = `${siteUrl}/owner#support`;
    push.send(OWNER_PUSH_ID, {
      topic: 'support:' + c.id,
      title: isNew ? `New support chat: ${c.name || c.email}` : `Support: ${c.name || c.email}`,
      body: m.text.slice(0, 120),
      url: '/owner#support',
      tag: 'support-' + c.id,
    }).catch(() => {});

    if (!mail.configured() || !contactTo) return;
    const now = Date.now();
    if (!isNew) {
      if (ownerOnline()) return;
      if (now - (c.lastOwnerEmailAt || 0) < OWNER_EMAIL_GAP_MS) return;
    }
    c.lastOwnerEmailAt = now;
    const recent = c.messages.slice(-6);
    const textBody = [
      isNew ? 'New Chat Support conversation.' : 'New message in a Chat Support conversation.',
      '',
      `From: ${who}${c.account ? ` (account: ${c.account})` : ' (guest)'}`,
      c.country ? `Location: ${[c.city, c.country].filter(Boolean).join(', ')}` : '',
      c.page ? `Page: ${c.page}` : '',
      '',
      ...recent.map((x) => `${x.from === 'user' ? (c.name || 'User') : 'You'}: ${x.text}`),
      '',
      `Reply in the dashboard: ${link}`,
    ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
    const html = `<p><b>${isNew ? 'New Chat Support conversation' : 'New message in Chat Support'}</b></p>`
      + `<p><b>From:</b> ${escapeHtml(who)} ${c.account ? `(account: ${escapeHtml(c.account)})` : '(guest)'}`
      + (c.country ? `<br><b>Location:</b> ${escapeHtml([c.city, c.country].filter(Boolean).join(', '))}` : '')
      + (c.page ? `<br><b>Page:</b> ${escapeHtml(c.page)}` : '') + '</p>'
      + recent.map((x) => `<p style="margin:6px 0;padding:8px 10px;border-radius:8px;background:${x.from === 'user' ? '#eef2ff' : '#f1f5f9'}"><b>${x.from === 'user' ? escapeHtml(c.name || 'User') : 'You'}:</b><br><span style="white-space:pre-wrap">${escapeHtml(x.text)}</span></p>`).join('')
      + `<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#4f7cff;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">Reply in dashboard</a></p>`
      + '<p style="color:#888;font-size:12px">Replying to this email goes straight to the user, but it will not show in their chat window.</p>';
    mail.sendMail({
      to: contactTo,
      subject: `[Chat Support] ${isNew ? 'New chat' : 'New message'} from ${c.name || c.email}`,
      text: textBody,
      html,
      fromName: 'TalkLive Chat Support',
      replyTo: c.email,
    }).catch(() => {});
  }

  function emailUserReply(c, m) {
    if (!mail.configured() || !c.email) return false;
    if (Date.now() - (c.userSeenAt || 0) < USER_ACTIVE_MS) return false;
    // A link that reopens this exact chat on any device. The key rides in the
    // URL fragment, which browsers never send to a server.
    const key = crypto.randomBytes(18).toString('hex');
    c.emailKeyHashes = [...(c.emailKeyHashes || []), hash(key)].slice(-5);
    const link = `${siteUrl}/contact#support=${c.id}.${key}`;
    const name = c.name ? ` ${c.name}` : '';
    mail.sendMail({
      to: c.email,
      subject: 'TalkLive Support replied to your message',
      text: `Hi${name},\n\nTalkLive Support replied:\n\n${m.text}\n\nContinue the chat: ${link}\n\nOr just reply to this email.\n\nTalkLive · ${contactTo}`,
      html: `<p>Hi${escapeHtml(name)},</p><p>TalkLive Support replied:</p>`
        + `<p style="padding:10px 12px;border-radius:10px;background:#eef2ff;white-space:pre-wrap">${escapeHtml(m.text)}</p>`
        + `<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#4f7cff;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">Continue the chat</a></p>`
        + `<p>Or just reply to this email.</p><p style="color:#888;font-size:12px">TalkLive · ${escapeHtml(contactTo)}</p>`,
      fromName: 'TalkLive Support',
      replyTo: contactTo,
    }).catch(() => {});
    return true;
  }

  // --- Public API (/support/api/*) ------------------------------------------
  const router = express.Router();
  router.use(express.json({ limit: '16kb' }));
  router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    // Same-origin only: the widget is ours, nobody else's page should post here.
    const site = String(req.headers['sec-fetch-site'] || 'same-origin');
    if (req.method === 'POST' && site !== 'same-origin' && site !== 'none') return res.status(403).json({ error: 'Cross-site request rejected.' });
    next();
  });

  router.post('/config', httpRateLimit('support-config', 60, 60000), (req, res) => {
    const s = state().settings;
    const u = sessionUser((req.body || {}).sessionToken);
    res.json({
      online: ownerOnline() && !s.away,
      greeting: s.greeting,
      awayMessage: s.awayMessage,
      // Signed-in users skip the email step; their account email is verified.
      account: u ? { nickname: u.nickname, email: u.email } : null,
    });
  });

  // A signed-in user's latest conversation, from any device.
  router.post('/mine', httpRateLimit('support-poll', 120, 60000), (req, res) => {
    const u = sessionUser((req.body || {}).sessionToken);
    if (!u) return res.json({ conversation: null });
    const c = state().conversations.find((x) => x.account === u.username);
    res.json({ conversation: c ? publicView(c) : null });
  });

  // The link in a reply email: trade its one-off key for this browser's own.
  router.post('/claim', httpRateLimit('support-start', 10, 10 * 60000), (req, res) => {
    const b = req.body || {};
    const c = find(String(b.id || ''));
    if (!c || !(c.emailKeyHashes || []).includes(hash(b.key || ''))) return res.status(404).json({ error: 'This chat link has expired.' });
    const key = crypto.randomBytes(18).toString('hex');
    addKey(c, key);
    store.save();
    res.json({ id: c.id, key, conversation: publicView(c) });
  });

  router.post('/start', httpRateLimit('support-start', 5, 10 * 60000), (req, res) => {
    const b = req.body || {};
    if (b.website) return res.json({ ok: true }); // honeypot
    const text = cleanText(b.text);
    if (text.length < 2) return res.status(400).json({ error: 'Please write a message.' });
    const u = sessionUser(b.sessionToken);
    const email = u && u.email ? u.email.toLowerCase() : String(b.email || '').trim().toLowerCase().slice(0, 254);
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
    const s = state();
    const key = crypto.randomBytes(18).toString('hex');

    // A signed-in user keeps one thread: a new "start" continues it.
    let c = u ? s.conversations.find((x) => x.account === u.username) : null;
    const isNew = !c;
    if (c) {
      addKey(c, key);
      c.status = 'open';
    } else {
      const ip = clientIp(req);
      const geo = geoOf ? geoOf(ip) : {};
      c = {
        id: crypto.randomBytes(9).toString('hex'),
        keyHashes: [hash(key)],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'open',
        email,
        name: u ? u.nickname : cleanLine(b.name, 60),
        account: u ? u.username : null,
        verified: !!u,
        clientId: cleanLine(b.clientId, 80) || null,
        country: geo.countryName || '',
        city: geo.city || '',
        page: cleanLine(b.page, 200),
        ua: cleanLine(req.headers['user-agent'], 160),
        messages: [],
        ownerReadAt: 0,
        userSeenAt: Date.now(),
      };
      s.conversations.unshift(c);
      if (s.conversations.length > MAX_CONVERSATIONS) s.conversations.pop();
    }
    const m = addMessage(c, 'user', text);
    c.userSeenAt = Date.now();
    // Keep the list newest-first.
    s.conversations = [c, ...s.conversations.filter((x) => x !== c)];
    store.save();
    store.recordFeature('support_chat');
    notifyOwner(c, m, isNew);
    res.json({ id: c.id, key, conversation: publicView(c) });
  });

  router.post('/thread', httpRateLimit('support-poll', 120, 60000), (req, res) => {
    const c = authorize(req.body || {});
    if (!c) return res.status(404).json({ error: 'Conversation not found.' });
    c.userSeenAt = Date.now();
    const s = state().settings;
    res.json({ conversation: publicView(c), online: ownerOnline() && !s.away });
  });

  router.post('/send', httpRateLimit('support-send', 20, 60000), (req, res) => {
    const b = req.body || {};
    const c = authorize(b);
    if (!c) return res.status(404).json({ error: 'Conversation not found.' });
    const text = cleanText(b.text);
    if (!text) return res.status(400).json({ error: 'Please write a message.' });
    // Flood guard: 30 user messages in a row with no answer is enough.
    let run = 0;
    for (let i = c.messages.length - 1; i >= 0 && c.messages[i].from === 'user'; i--) run++;
    if (run >= 30) return res.status(429).json({ error: 'Please wait for a reply before sending more.' });
    c.status = 'open';
    const m = addMessage(c, 'user', text);
    c.userSeenAt = Date.now();
    const s = state();
    s.conversations = [c, ...s.conversations.filter((x) => x !== c)];
    store.save();
    notifyOwner(c, m, false);
    res.json({ conversation: publicView(c) });
  });

  // --- Owner API (mounted inside the authenticated /owner/api router) --------
  function mountOwner(r, { reqIp }) {
    r.use('/api', (req, res, next) => { ownerSeenAt = Date.now(); next(); });

    const summary = (c) => {
      const lm = lastMsg(c);
      return {
        id: c.id, email: c.email, name: c.name, account: c.account, verified: !!c.verified,
        status: c.status, createdAt: c.createdAt, updatedAt: c.updatedAt,
        country: c.country, city: c.city, page: c.page,
        last: lm ? { from: lm.from, text: lm.text.slice(0, 140), ts: lm.ts } : null,
        unread: ownerUnread(c), waiting: !!waiting(c), count: c.messages.length,
      };
    };

    r.get('/api/support', (req, res) => {
      const s = state();
      res.json({
        conversations: s.conversations.slice(0, 500).map(summary),
        settings: s.settings,
        emailAlerts: !!(mail.configured() && contactTo),
        alertsTo: contactTo,
        push: { available: push.configured(), key: push.publicKey(), devices: store.pushSubscriptions(OWNER_PUSH_ID).length },
      });
    });

    r.get('/api/support/:id', (req, res) => {
      const c = find(req.params.id);
      if (!c) return res.status(404).json({ error: 'Conversation not found.' });
      if (req.query.read !== '0' && ownerUnread(c)) { c.ownerReadAt = Date.now(); store.save(); }
      res.json({
        conversation: {
          ...summary(c),
          ua: c.ua,
          userSeenAt: c.userSeenAt || 0,
          userActive: Date.now() - (c.userSeenAt || 0) < USER_ACTIVE_MS,
          messages: c.messages,
        },
      });
    });

    r.post('/api/support/:id/reply', (req, res) => {
      const c = find(req.params.id);
      if (!c) return res.status(404).json({ error: 'Conversation not found.' });
      const text = cleanText((req.body || {}).message);
      if (!text) return res.status(400).json({ error: 'Write the reply first.' });
      const m = addMessage(c, 'owner', text);
      c.ownerReadAt = Date.now();
      if ((req.body || {}).close) c.status = 'closed';
      const emailed = emailUserReply(c, m);
      store.save();
      store.audit('support-reply', reqIp(req), `Replied to support chat from ${c.email}${emailed ? ' (emailed)' : ''}`);
      res.json({ ok: true, emailed });
    });

    r.post('/api/support/:id/status', (req, res) => {
      const c = find(req.params.id);
      if (!c) return res.status(404).json({ error: 'Conversation not found.' });
      c.status = (req.body || {}).status === 'closed' ? 'closed' : 'open';
      if (c.status === 'closed') c.ownerReadAt = Date.now();
      store.save();
      res.json({ ok: true, status: c.status });
    });

    r.post('/api/support/:id/delete', (req, res) => {
      const s = state();
      const before = s.conversations.length;
      s.conversations = s.conversations.filter((c) => c.id !== req.params.id);
      if (s.conversations.length === before) return res.status(404).json({ error: 'Conversation not found.' });
      store.audit('support-delete', reqIp(req), 'Deleted a support conversation');
      store.persistNow();
      res.json({ ok: true });
    });

    r.post('/api/support-settings', (req, res) => {
      const b = req.body || {};
      const s = state();
      const next = { ...s.settings };
      if (typeof b.away === 'boolean') next.away = b.away;
      if (typeof b.greeting === 'string') next.greeting = cleanText(b.greeting).slice(0, 300) || DEFAULT_SETTINGS.greeting;
      if (typeof b.awayMessage === 'string') next.awayMessage = cleanText(b.awayMessage).slice(0, 300) || DEFAULT_SETTINGS.awayMessage;
      if (Array.isArray(b.quickReplies)) next.quickReplies = b.quickReplies.map((q) => cleanText(q).slice(0, 1000)).filter(Boolean).slice(0, 20);
      s.settings = next;
      store.save();
      res.json({ ok: true, settings: next });
    });

    r.post('/api/support-push', (req, res) => {
      const sub = (req.body || {}).subscription;
      if (!push.configured()) return res.status(503).json({ error: 'Push is not set up on the server (VAPID keys missing).' });
      if (!sub || typeof sub.endpoint !== 'string' || !/^https:\/\//.test(sub.endpoint)) return res.status(400).json({ error: 'Invalid subscription.' });
      store.savePushSubscription(OWNER_PUSH_ID, { endpoint: sub.endpoint, keys: sub.keys || {} }, req.headers['user-agent']);
      store.audit('support-push', reqIp(req), 'Turned on support push alerts for a device');
      res.json({ ok: true, devices: store.pushSubscriptions(OWNER_PUSH_ID).length });
    });

    r.post('/api/support-push/off', (req, res) => {
      for (const sub of store.pushSubscriptions(OWNER_PUSH_ID)) store.removePushSubscription(OWNER_PUSH_ID, sub.endpoint);
      res.json({ ok: true, devices: 0 });
    });
  }

  // For the Overview's "needs your attention" card and the nav badge.
  function counts() {
    const list = state().conversations;
    return { supportWaiting: list.filter(waiting).length, supportOpen: list.filter((c) => c.status === 'open').length };
  }

  return { router, mountOwner, counts };
}

module.exports = { createSupport };
