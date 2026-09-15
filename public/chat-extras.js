// ============================================================================
// TalkLive - chat extras: replies, emoji, GIFs and reactions.
//
// One small ES5 file shared by every chat surface in the product (the stranger
// panel in the voice app, the friend chat in both apps, and the whole /chat
// page). Nothing here depends on a framework and nothing is imported: the file
// is ~10 kB and attaches on demand.
//
// The rules it is built to:
//   * Nothing is created until it is opened. The emoji grid, the GIF grid and
//     the long-press menu are each built once, on first use, and reused after.
//     A user who never taps them pays for four buttons and two listeners.
//   * One delegated listener per surface instead of one per message. A 200
//     message conversation adds no listeners at all.
//   * No layout thrash while scrolling: GIF tiles reserve their box up front
//     with aspect-ratio, images are lazy and async-decoded, and the reaction
//     row is appended inside the bubble it belongs to.
//   * Emoji are text, not images or a font - zero bytes over the wire, and they
//     render with whatever the phone already has.
//
// Usage:
//   var extras = TalkLiveChatExtras.attach({ form, input, messages, send, ... });
//   extras.decorate(bubbleEl, { id, mine, text, replyTo, gif });
// ============================================================================
(function () {
  'use strict';

  // Kept in sync with REACTIONS in server/index.js - the server rejects anything
  // outside this set, so adding one here alone would silently do nothing.
  var REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

  // Deliberately older Unicode blocks: these render on the stock font of a
  // 2016 Android phone. Newer additions show as tofu boxes on exactly the
  // devices this product is popular on.
  var EMOJI_GROUPS = [
    ['Smileys', '😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 😉 😌 😍 😘 😚 😋 😛 😜 🤪 😎 🤓 🤗 🤔 😐 😶 🙄 😏 😬 😒 😞 😔 😟 😕 🙁 ☹️ 😫 😩 😪 😓 😥 😢 😭 😱 😨 😰 😳 🥵 🥶 😡 😠 🤬 😈 👿 💀 💩 🤡 👹 👽 🤖 😻 😹 😿'],
    ['Gestures', '👋 🤚 🖐️ ✋ 👌 ✌️ 🤞 🤘 👈 👉 👆 👇 ☝️ 👍 👎 ✊ 👊 🤛 👏 🙌 🤲 🙏 ✍️ 💪 🤳 🤝'],
    ['Hearts', '❤️ 🧡 💛 💚 💙 💜 🖤 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 💯 💥 ✨ ⭐ 🌟 🔥 🎉 🎊 🎁'],
    ['Life', '🐶 🐱 🐭 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐷 🐸 🐵 🐔 🐧 🐦 🦆 🦉 🐝 🦋 🐟 🐬 🐳 🌺 🌻 🌹 🌲 🌴 🌍 🌙 ☀️ ⛅ 🌧️ ❄️'],
    ['Food & fun', '🍕 🍔 🍟 🌮 🍜 🍣 🍩 🍪 🎂 🍦 ☕ 🍺 🍷 🍹 🍎 🍌 🍉 ⚽ 🏀 🎮 🎲 🎵 🎸 🎤 🎧 📷 ✈️ 🚗 🚀 🏆 💰 💡 📱 💻 🕒 ✅ ❌ ❓ ❗'],
  ];

  var RECENT_KEY = 'talklive_recent_emoji';
  var RECENT_MAX = 16;

  function readRecent() {
    try {
      var raw = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      return Array.isArray(raw) ? raw.slice(0, RECENT_MAX) : [];
    } catch (e) { return []; }
  }
  function pushRecent(emoji) {
    try {
      var list = readRecent().filter(function (e) { return e !== emoji; });
      list.unshift(emoji);
      localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
    } catch (e) { /* private mode - recents are a nicety, not a feature */ }
  }

  // --- translation ----------------------------------------------------------
  // i18n.js defines a global t(); fall back to the English literal so this file
  // also works on a page that never loaded it.
  function tr(key, fallback) {
    if (typeof window.t === 'function') {
      var s = window.t(key);
      if (s && s !== key) return s;
    }
    return fallback;
  }

  // --- GIF backend ----------------------------------------------------------
  // One config probe per page, shared by every surface. Resolves to false when
  // TENOR_API_KEY is unset server-side, and the GIF button is then never built.
  var gifConfig = null;
  function gifsAvailable() {
    if (!gifConfig) {
      gifConfig = fetch('/api/gifs/config')
        .then(function (r) { return r.ok ? r.json() : { enabled: false }; })
        .then(function (j) { return !!(j && j.enabled); })
        .catch(function () { return false; });
    }
    return gifConfig;
  }

  // Query -> results, for the life of the page. Retyping a search or reopening
  // the picker costs nothing; the server caches the same lookups again behind
  // this, so a popular query rarely reaches Tenor at all.
  var gifCache = {};
  function gifSearch(q) {
    var key = q || '*';
    if (gifCache[key]) return Promise.resolve(gifCache[key]);
    var lang = (document.documentElement.lang || 'en').slice(0, 2);
    var url = '/api/gifs?lang=' + encodeURIComponent(lang) + (q ? '&q=' + encodeURIComponent(q) : '');
    return fetch(url)
      .then(function (r) { return r.ok ? r.json() : { results: [] }; })
      .then(function (j) {
        var list = (j && j.results) || [];
        gifCache[key] = list;
        return list;
      })
      .catch(function () { return []; });
  }

  // --- small DOM helpers ----------------------------------------------------
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function iconBtn(cls, label, glyph) {
    var b = el('button', cls, glyph);
    b.type = 'button';
    b.setAttribute('aria-label', label);
    b.title = label;
    return b;
  }
  function newId() {
    return 'm' + Math.random().toString(36).slice(2, 10);
  }

  // ==========================================================================
  // attach()
  // ==========================================================================
  //
  // opts:
  //   form      <form> composer
  //   input     text <input> inside it
  //   messages  scrolling message container
  //   send(payload)          required - { text, gif, replyTo, id }
  //   react(id, emoji, on)   optional - omit to disable reactions
  //   msgSelector  CSS selector matching one message bubble ('.msg')
  //   gifs         false to force the GIF button off for this surface
  //
  // Returns a controller the host uses when it renders a message.
  function attach(opts) {
    var form = opts.form;
    var input = opts.input;
    var messages = opts.messages;
    var msgSelector = opts.msgSelector || '.msg';
    var canReact = typeof opts.react === 'function';

    // id -> { el, text, mine }. Rebuilt whenever the host calls reset(), which
    // it does on every new conversation, so this never grows unbounded.
    var index = {};
    var replyTo = null;      // id currently being replied to

    // --- panel host: reply bar + emoji/GIF panel, above the composer ---------
    var host = el('div', 'cx-host');
    form.parentNode.insertBefore(host, form);

    var replyBar = null;     // built on first reply
    var panel = null;        // built on first picker open
    var panelMode = '';      // 'emoji' | 'gif' | ''
    var emojiPane = null;
    var gifPane = null;

    // --- composer buttons ----------------------------------------------------
    var emojiBtn = iconBtn('cx-btn cx-emoji-btn', tr('emojiPicker', 'Emoji'), '😊');
    form.insertBefore(emojiBtn, input);
    var gifBtn = null;
    if (opts.gifs !== false) {
      gifsAvailable().then(function (ok) {
        if (!ok) return;
        gifBtn = iconBtn('cx-btn cx-gif-btn', tr('gifPicker', 'GIF'), 'GIF');
        form.insertBefore(gifBtn, input);
        gifBtn.addEventListener('click', function () { togglePanel('gif'); });
      });
    }
    emojiBtn.addEventListener('click', function () { togglePanel('emoji'); });

    // --- panel ---------------------------------------------------------------
    function buildPanel() {
      panel = el('div', 'cx-panel');
      panel.hidden = true;
      host.appendChild(panel);
    }

    function togglePanel(mode) {
      if (!panel) buildPanel();
      if (panelMode === mode) { closePanel(); return; }
      panelMode = mode;
      panel.hidden = false;
      emojiBtn.classList.toggle('on', mode === 'emoji');
      if (gifBtn) gifBtn.classList.toggle('on', mode === 'gif');
      if (mode === 'emoji') {
        if (!emojiPane) emojiPane = buildEmojiPane();
        swap(emojiPane);
        renderRecent();
      } else {
        if (!gifPane) gifPane = buildGifPane();
        swap(gifPane.root);
        gifPane.open();
      }
      scrollToBottom();
    }

    function swap(node) {
      if (panel.firstChild === node) return;
      panel.innerHTML = '';
      panel.appendChild(node);
    }

    function closePanel() {
      panelMode = '';
      if (panel) { panel.hidden = true; panel.innerHTML = ''; }
      emojiBtn.classList.remove('on');
      if (gifBtn) gifBtn.classList.remove('on');
    }

    // --- emoji pane ----------------------------------------------------------
    var recentRow = null;
    function buildEmojiPane() {
      var pane = el('div', 'cx-emoji');
      recentRow = el('div', 'cx-emoji-grid cx-recent');
      var recentHead = el('div', 'cx-emoji-head', tr('emojiRecent', 'Recent'));
      pane.appendChild(recentHead);
      pane.appendChild(recentRow);
      for (var i = 0; i < EMOJI_GROUPS.length; i++) {
        pane.appendChild(el('div', 'cx-emoji-head', EMOJI_GROUPS[i][0]));
        var grid = el('div', 'cx-emoji-grid');
        var list = EMOJI_GROUPS[i][1].split(' ');
        for (var j = 0; j < list.length; j++) grid.appendChild(emojiCell(list[j]));
        pane.appendChild(grid);
      }
      // One listener for ~250 cells.
      pane.addEventListener('click', function (e) {
        var cell = e.target.closest('.cx-emoji-cell');
        if (!cell) return;
        insertAtCursor(cell.textContent);
        pushRecent(cell.textContent);
      });
      return pane;
    }

    function emojiCell(ch) {
      var b = el('button', 'cx-emoji-cell', ch);
      b.type = 'button';
      return b;
    }

    function renderRecent() {
      if (!recentRow) return;
      var list = readRecent();
      recentRow.innerHTML = '';
      recentRow.parentNode.firstChild.hidden = !list.length;
      recentRow.hidden = !list.length;
      for (var i = 0; i < list.length; i++) recentRow.appendChild(emojiCell(list[i]));
    }

    // Insert at the caret rather than appending, so an emoji dropped mid-
    // sentence lands where the user is actually typing.
    function insertAtCursor(text) {
      var start = input.selectionStart, end = input.selectionEnd;
      if (start == null) {
        input.value += text;
      } else {
        input.value = input.value.slice(0, start) + text + input.value.slice(end);
        var pos = start + text.length;
        input.setSelectionRange(pos, pos);
      }
      input.focus();
      // Keeps the typing indicator and any send-button enabling in sync.
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // --- GIF pane ------------------------------------------------------------
    function buildGifPane() {
      var root = el('div', 'cx-gif');
      var bar = el('div', 'cx-gif-bar');
      var search = el('input', 'cx-gif-search');
      search.type = 'search';
      search.placeholder = tr('gifSearch', 'Search GIFs');
      search.setAttribute('aria-label', tr('gifSearch', 'Search GIFs'));
      search.maxLength = 50;
      bar.appendChild(search);
      var grid = el('div', 'cx-gif-grid');
      var status = el('p', 'cx-gif-status');
      root.appendChild(bar);
      root.appendChild(status);
      root.appendChild(grid);
      // Tenor's attribution, on its own line: sharing the row with the search
      // box squeezed both on a narrow phone.
      root.appendChild(el('p', 'cx-gif-credit', 'Powered by Tenor'));

      var timer = null, token = 0;
      function run(q) {
        var mine = ++token;
        status.textContent = tr('gifLoading', 'Loading…');
        status.hidden = false;
        gifSearch(q).then(function (list) {
          if (mine !== token) return; // a newer keystroke already won
          render(list);
        });
      }
      function render(list) {
        grid.innerHTML = '';
        if (!list.length) {
          status.textContent = tr('gifNone', 'No GIFs found.');
          status.hidden = false;
          return;
        }
        status.hidden = true;
        var frag = document.createDocumentFragment();
        for (var i = 0; i < list.length; i++) frag.appendChild(gifTile(list[i]));
        grid.appendChild(frag);
      }
      search.addEventListener('input', function () {
        clearTimeout(timer);
        var q = search.value.trim();
        // Debounced: one request per pause, not one per keystroke.
        timer = setTimeout(function () { run(q); }, 350);
      });
      // Enter must not submit the chat composer.
      search.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); clearTimeout(timer); run(search.value.trim()); }
      });
      grid.addEventListener('click', function (e) {
        var tile = e.target.closest('.cx-gif-tile');
        if (!tile || !tile._gif) return;
        sendPayload({ text: '', gif: tile._gif });
        closePanel();
      });

      return {
        root: root,
        open: function () { if (!grid.firstChild) run(search.value.trim()); },
      };
    }

    function gifTile(g) {
      var tile = el('button', 'cx-gif-tile');
      tile.type = 'button';
      // Reserve the box before the image arrives: the grid never reflows as
      // tiles load in, which is what makes this scroll smoothly on a slow phone.
      tile.style.aspectRatio = (g.w && g.h) ? (g.w + ' / ' + g.h) : '1 / 1';
      var img = document.createElement('img');
      img.src = g.preview;
      img.alt = g.alt || 'GIF';
      img.loading = 'lazy';
      img.decoding = 'async';
      tile.appendChild(img);
      tile._gif = g;
      return tile;
    }

    // --- reply bar -----------------------------------------------------------
    function buildReplyBar() {
      replyBar = el('div', 'cx-reply-bar');
      replyBar.hidden = true;
      var body = el('div', 'cx-reply-body');
      body.appendChild(el('span', 'cx-reply-to'));
      body.appendChild(el('span', 'cx-reply-text'));
      replyBar.appendChild(body);
      var x = iconBtn('cx-reply-cancel', tr('cancel', 'Cancel'), '×');
      x.addEventListener('click', cancelReply);
      replyBar.appendChild(x);
      host.insertBefore(replyBar, host.firstChild);
    }

    function startReply(id) {
      var rec = index[id];
      if (!rec) return;
      if (!replyBar) buildReplyBar();
      replyTo = id;
      replyBar.querySelector('.cx-reply-to').textContent = rec.mine
        ? tr('replyToYou', 'Replying to you')
        : tr('replyToThem', 'Replying to them');
      replyBar.querySelector('.cx-reply-text').textContent = rec.text;
      replyBar.hidden = false;
      input.focus();
      scrollToBottom();
    }

    function cancelReply() {
      replyTo = null;
      if (replyBar) replyBar.hidden = true;
    }

    // --- long-press / right-click action menu --------------------------------
    var menu = null, menuTarget = null;
    function buildMenu() {
      menu = el('div', 'cx-menu');
      menu.hidden = true;
      if (canReact) {
        var row = el('div', 'cx-menu-reactions');
        for (var i = 0; i < REACTIONS.length; i++) {
          var b = el('button', 'cx-menu-react', REACTIONS[i]);
          b.type = 'button';
          b.dataset.emoji = REACTIONS[i];
          row.appendChild(b);
        }
        menu.appendChild(row);
      }
      var reply = el('button', 'cx-menu-item', tr('reply', 'Reply'));
      reply.type = 'button';
      reply.dataset.act = 'reply';
      menu.appendChild(reply);
      menu.addEventListener('click', function (e) {
        var btn = e.target.closest('button');
        if (!btn || !menuTarget) return;
        if (btn.dataset.act === 'reply') startReply(menuTarget);
        else if (btn.dataset.emoji) toggleReaction(menuTarget, btn.dataset.emoji);
        hideMenu();
      });
      document.body.appendChild(menu);
    }

    function showMenu(id, x, y) {
      if (!index[id]) return;
      if (!menu) buildMenu();
      menuTarget = id;
      // Mark which reactions I have already given, so the menu doubles as state.
      var rec = index[id];
      var btns = menu.querySelectorAll('.cx-menu-react');
      for (var i = 0; i < btns.length; i++) {
        btns[i].classList.toggle('on', !!(rec.mineReacts && rec.mineReacts[btns[i].dataset.emoji]));
      }
      menu.hidden = false;
      // Not every way of opening this carries coordinates - the keyboard's
      // context-menu key is the common one. Fall back to the bubble itself, so
      // the menu never ends up positioned off the screen.
      if (!isFinite(x) || !isFinite(y)) {
        var b = rec.el.getBoundingClientRect();
        x = b.left + b.width / 2;
        y = b.top + b.height / 2;
      }
      // Measure once it is laid out, then clamp inside the viewport.
      var r = menu.getBoundingClientRect();
      var left = Math.min(Math.max(8, x - r.width / 2), Math.max(8, window.innerWidth - r.width - 8));
      var top = y - r.height - 10;
      if (top < 8) top = Math.min(y + 14, Math.max(8, window.innerHeight - r.height - 8));
      menu.style.left = left + 'px';
      menu.style.top = top + 'px';
    }

    function hideMenu() {
      menuTarget = null;
      if (menu) menu.hidden = true;
    }

    // One set of delegated listeners for the whole conversation. Long-press on
    // touch, right-click on desktop - both land on the same menu.
    var pressTimer = null, pressX = 0, pressY = 0;
    function bubbleIdFrom(target) {
      var bubble = target.closest ? target.closest(msgSelector) : null;
      return bubble && bubble.dataset ? bubble.dataset.cxId : null;
    }

    messages.addEventListener('touchstart', function (e) {
      var id = bubbleIdFrom(e.target);
      if (!id) return;
      var touch = e.touches[0];
      pressX = touch.clientX; pressY = touch.clientY;
      clearTimeout(pressTimer);
      pressTimer = setTimeout(function () {
        pressTimer = null;
        if (navigator.vibrate) { try { navigator.vibrate(12); } catch (err) { /* ignore */ } }
        showMenu(id, pressX, pressY);
      }, 420);
    }, { passive: true });

    // Any movement means the user is scrolling, not pressing.
    function cancelPress(e) {
      if (!pressTimer) return;
      if (e && e.touches && e.touches[0]) {
        var dx = Math.abs(e.touches[0].clientX - pressX);
        var dy = Math.abs(e.touches[0].clientY - pressY);
        if (dx < 8 && dy < 8) return;
      }
      clearTimeout(pressTimer);
      pressTimer = null;
    }
    messages.addEventListener('touchmove', cancelPress, { passive: true });
    messages.addEventListener('touchend', function () { clearTimeout(pressTimer); pressTimer = null; }, { passive: true });
    messages.addEventListener('touchcancel', function () { clearTimeout(pressTimer); pressTimer = null; }, { passive: true });

    messages.addEventListener('contextmenu', function (e) {
      var id = bubbleIdFrom(e.target);
      if (!id) return;
      e.preventDefault();
      showMenu(id, e.clientX, e.clientY);
    });

    // Tapping a message's own reaction chip toggles it - the quickest path back
    // out of a reaction you did not mean to send.
    messages.addEventListener('click', function (e) {
      var chip = e.target.closest('.cx-reaction');
      if (chip) {
        var id = bubbleIdFrom(e.target);
        if (id) toggleReaction(id, chip.dataset.emoji);
        return;
      }
      var quote = e.target.closest('.cx-quote');
      if (quote && quote.dataset.cxTarget) jumpTo(quote.dataset.cxTarget);
    });

    document.addEventListener('click', function (e) {
      if (menu && !menu.hidden && !menu.contains(e.target)) hideMenu();
      if (panel && !panel.hidden && !host.contains(e.target) && !form.contains(e.target)) closePanel();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' && e.key !== 'Esc') return;
      if (menu && !menu.hidden) { hideMenu(); return; }
      if (panel && !panel.hidden) { closePanel(); return; }
      if (replyTo) cancelReply();
    });

    // --- reactions -----------------------------------------------------------
    function toggleReaction(id, emoji) {
      var rec = index[id];
      if (!rec || !canReact) return;
      if (!rec.mineReacts) rec.mineReacts = {};
      var on = !rec.mineReacts[emoji];
      if (on) rec.mineReacts[emoji] = true; else delete rec.mineReacts[emoji];
      paintReaction(rec, emoji, on, true);
      opts.react(id, emoji, on);
    }

    // Renders one reaction chip inside a bubble. counts are kept on the record
    // so a chip disappears only when both sides have removed it.
    function paintReaction(rec, emoji, on, mine) {
      if (!rec.counts) rec.counts = {};
      var c = rec.counts[emoji] || { mine: false, theirs: false };
      if (mine) c.mine = on; else c.theirs = on;
      rec.counts[emoji] = c;
      var total = (c.mine ? 1 : 0) + (c.theirs ? 1 : 0);

      var row = rec.el.querySelector('.cx-reactions');
      var chip = row && row.querySelector('[data-emoji="' + emoji + '"]');
      if (!total) {
        if (chip) chip.remove();
        if (row && !row.firstChild) row.remove();
        return;
      }
      if (!row) {
        row = el('div', 'cx-reactions');
        // The voice app's bubbles are inline-flex so text and delivery ticks sit
        // on one line; a reaction row has to push them into a column or the
        // chip lands beside the text instead of under it.
        rec.el.classList.add('cx-has-reactions');
        rec.el.appendChild(row);
      }
      if (!chip) {
        chip = el('button', 'cx-reaction');
        chip.type = 'button';
        chip.dataset.emoji = emoji;
        row.appendChild(chip);
      }
      chip.textContent = total > 1 ? emoji + ' ' + total : emoji;
      chip.classList.toggle('own', !!c.mine);
    }

    // --- jump to a quoted message --------------------------------------------
    function jumpTo(id) {
      var rec = index[id];
      if (!rec) return;
      rec.el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      rec.el.classList.add('cx-flash');
      setTimeout(function () { rec.el.classList.remove('cx-flash'); }, 900);
    }

    // --- sending -------------------------------------------------------------
    function sendPayload(extra) {
      var payload = {
        id: newId(),
        text: extra.text || '',
        gif: extra.gif || null,
        replyTo: replyTo,
      };
      var ok = opts.send(payload);
      // A host that returns false rejected the message (link filter, no
      // partner); keep the reply context so the user can correct and retry, and
      // report the refusal back so the composer is not cleared either.
      if (ok === false) return false;
      cancelReply();
      return payload;
    }

    function scrollToBottom() {
      messages.scrollTop = messages.scrollHeight;
    }

    // ------------------------------------------------------------------------
    // Controller
    // ------------------------------------------------------------------------
    return {
      REACTIONS: REACTIONS,

      // Turns a plain bubble into an addressable one: registers its id, renders
      // the quoted message it replies to, the GIF it carries and any reactions
      // already on it. Called by the host right after it appends the bubble.
      decorate: function (node, data) {
        data = data || {};
        var id = data.id || newId();
        node.dataset.cxId = id;
        var rec = {
          el: node,
          mine: !!data.mine,
          text: data.text || (data.gif ? 'GIF' : ''),
        };
        index[id] = rec;

        if (data.replyTo) {
          var src = index[data.replyTo];
          // Class rather than a :has() selector - :has() is absent on the older
          // Android WebViews a lot of this traffic arrives on.
          node.classList.add('cx-has-quote');
          var quote = el('div', 'cx-quote');
          quote.dataset.cxTarget = data.replyTo;
          quote.appendChild(el('span', 'cx-quote-who', src && src.mine
            ? tr('replyYou', 'You')
            : tr('replyThem', 'Them')));
          quote.appendChild(el('span', 'cx-quote-text', src ? src.text : tr('replyGone', 'Message')));
          node.insertBefore(quote, node.firstChild);
        }

        if (data.gif) {
          node.classList.add('cx-has-gif');
          var img = document.createElement('img');
          img.className = 'cx-gif-img';
          img.src = data.gif.url;
          img.alt = data.gif.alt || 'GIF';
          img.loading = 'lazy';
          img.decoding = 'async';
          if (data.gif.w && data.gif.h) img.style.aspectRatio = data.gif.w + ' / ' + data.gif.h;
          // Late-loading media would otherwise push the newest message off
          // screen just as it is read.
          img.addEventListener('load', scrollToBottom, { once: true });
          node.appendChild(img);
        }

        if (data.reactions) {
          for (var emoji in data.reactions) {
            if (!Object.prototype.hasOwnProperty.call(data.reactions, emoji)) continue;
            var who = data.reactions[emoji] || [];
            var mineHere = data.myClientId && who.indexOf(data.myClientId) !== -1;
            if (mineHere) {
              if (!rec.mineReacts) rec.mineReacts = {};
              rec.mineReacts[emoji] = true;
              paintReaction(rec, emoji, true, true);
            }
            if (who.length > (mineHere ? 1 : 0)) paintReaction(rec, emoji, true, false);
          }
        }
        return id;
      },

      // A reaction arrived from the other side.
      remoteReaction: function (id, emoji, on) {
        var rec = index[id];
        if (rec) paintReaction(rec, emoji, on, false);
      },

      // Builds the outgoing payload (id + current reply target) for a host that
      // sends from its own submit handler.
      compose: function (text) {
        return sendPayload({ text: text });
      },

      replyTarget: function () { return replyTo; },
      cancelReply: cancelReply,
      closePanel: closePanel,

      // New conversation: drop every id, reply state and open panel.
      reset: function () {
        index = {};
        cancelReply();
        closePanel();
        hideMenu();
      },
    };
  }

  window.TalkLiveChatExtras = { attach: attach, REACTIONS: REACTIONS };
})();
