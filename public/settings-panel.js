// Settings, the parts that are not needed on a first visit:
//
//  - settings.css, which styles the full Settings screen, THE Settings panel
//    and the controls the My profile sheet borrows. Injected the moment this
//    file runs; `ready` settles once it has arrived (or failed, or timed out)
//    so nothing opens unstyled.
//  - mount(): THE Settings panel. The landing page, a call and /chat all open
//    this same side panel from their gear. Every value is read from and
//    written to the same localStorage keys the full screen uses, so the two
//    can never disagree. What a change means beyond storage (re-registering,
//    telling the server) is up to the page, via the hooks passed to mount().
//  - enhancePage(): the full screen's search, section headers, keyboard
//    support and "Saved" confirmation. The controls themselves are plain
//    markup in index.html, wired up by app.js; this only adds to them.
(function () {
  'use strict';

  const CSS_HREF = '/settings.css?v=20260924redesign';
  const THEMES = ['dark', 'light', 'ocean', 'sunset'];
  const CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>';

  // English for the strings only Settings uses. They ship here rather than in
  // i18n.js, which every page loads up front; the other languages have them in
  // their own /i18n/<lang>.js. Markup that needs them carries data-i18n-set*
  // until now, so the page's first translation pass never prints a bare key.
  const EN = {
    setSearch: "Search settings",
    setNoResults: "Nothing matches “{q}”",
    setDescProfile: "Name, avatar, ID and account",
    setDescApp: "Language, theme and sounds",
    setDescPrivacy: "Calls, online status and blocking",
    setDescBilling: "Coins, Boosts and receipts",
    setDescAbout: "Feedback, policies and contact",
    soundHint: "Play a sound for matches and messages",
    vibrationHint: "Buzz when you connect or get a message",
    statusHint: "Friends can see when you're online",
    seenHint: "Show people when you've read their messages",
    setSaved: "Saved",
    setAppearance: "Appearance",
    setAlerts: "Alerts",
    setLegal: "Legal",
  };
  if (window.I18N_STRINGS) {
    const en = window.I18N_STRINGS.en || (window.I18N_STRINGS.en = {});
    Object.keys(EN).forEach((k) => { if (en[k] == null) en[k] = EN[k]; });
  }
  [['data-i18n-set', 'i18n'], ['data-i18n-set-ph', 'i18nPlaceholder'], ['data-i18n-set-aria', 'i18nAria']].forEach(([attr, to]) => {
    document.querySelectorAll('[' + attr + ']').forEach((el) => {
      const key = el.getAttribute(attr);
      el.removeAttribute(attr);
      el.dataset[to] = key;
      const text = typeof t === 'function' ? t(key) : EN[key];
      if (to === 'i18n') el.textContent = text;
      else if (to === 'i18nPlaceholder') el.placeholder = text;
      else el.setAttribute('aria-label', text);
    });
  });

  const ready = new Promise((resolve) => {
    const root = document.documentElement;
    const done = () => { root.classList.add('tl-set-css'); resolve(); };
    if (document.querySelector('link[data-tl-settings]')) { done(); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = CSS_HREF;
    link.dataset.tlSettings = '1';
    link.onload = done;
    link.onerror = done;
    setTimeout(done, 4000);
    document.head.appendChild(link);
  });

  function read(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, value); } catch (_) { /* storage blocked */ }
  }
  function tr(key, vars) {
    return typeof t === 'function' ? t(key, vars) : key;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function txt(key) {
    return `<span data-i18n="${key}">${esc(tr(key))}</span>`;
  }

  // --- "Saved" ---------------------------------------------------------------
  let savedEl = null;
  let savedTimer = null;
  function flashSaved() {
    if (!savedEl) {
      savedEl = document.createElement('div');
      savedEl.className = 'tl-set-saved';
      savedEl.setAttribute('role', 'status');
      savedEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(savedEl);
    }
    savedEl.textContent = tr('setSaved');
    savedEl.classList.remove('show');
    void savedEl.offsetWidth;
    savedEl.classList.add('show');
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => savedEl.classList.remove('show'), 1600);
  }

  // --- THE Settings panel -----------------------------------------------------
  function seg(id, labelKey, options) {
    return `<div class="tl-set-control tl-set-control-stack">
      <span class="tl-set-label" id="${id}Label" data-i18n="${labelKey}">${esc(tr(labelKey))}</span>
      <div class="tl-seg pill-group" id="${id}" role="group" aria-labelledby="${id}Label">
        ${options.map(([value, key]) => `<button type="button" class="tl-seg-opt pill" data-value="${value}">${txt(key)}</button>`).join('')}
      </div>
    </div>`;
  }
  function themes(id) {
    return `<div class="tl-set-control tl-set-control-stack">
      <span class="tl-set-label" id="${id}Label" data-i18n="theme">${esc(tr('theme'))}</span>
      <div class="tl-themes pill-group" id="${id}" role="group" aria-labelledby="${id}Label">
        ${THEMES.map((v) => `<button type="button" class="tl-theme-opt pill" data-value="${v}"><span class="tl-theme-art" aria-hidden="true"><i></i><i></i><i></i></span>${txt('theme' + v[0].toUpperCase() + v.slice(1))}</button>`).join('')}
      </div>
    </div>`;
  }
  function toggle(id, icon, key, hintKey) {
    return `<label class="tl-set-control tl-set-toggle" for="${id}">
      <span class="tl-set-ico i-${icon}" aria-hidden="true"></span>
      <span class="tl-set-text"><strong data-i18n="${key}">${esc(tr(key))}</strong><small data-i18n="${hintKey}">${esc(tr(hintKey))}</small></span>
      <span class="switch"><input type="checkbox" id="${id}" /><span class="switch-slider" aria-hidden="true"></span></span>
    </label>`;
  }
  function section(legendKey, body) {
    return `<section><h3 class="tl-set-legend" data-i18n="${legendKey}">${esc(tr(legendKey))}</h3><div class="tl-set-group">${body}</div></section>`;
  }

  // hooks: {
  //   profileFace(size) -> html, profileName() -> string, profileSub() -> string,
  //   openProfile(), openAll(), saveName(value), onGender(g), onTheme(theme),
  //   onSound(on), onVibration(on), onStatusVisible(on), onMessageSeen(on)
  // }
  function mount(container, hooks) {
    container.innerHTML = `
      <button type="button" class="tl-set-hero qs-profile">
        <span class="tl-set-hero-face qs-face" aria-hidden="true"></span>
        <span class="tl-set-hero-text"><strong class="qs-name"></strong><small class="qs-sub"></small></span>
        <span class="tl-set-hero-go" aria-hidden="true">${CHEVRON}</span>
      </button>
      ${section('catProfile', `
        <div class="tl-set-control tl-set-control-stack">
          <label class="tl-set-label" for="qsName" data-i18n="tempUsername">${esc(tr('tempUsername'))}</label>
          <div class="tl-set-field">
            <input type="text" id="qsName" maxlength="40" autocomplete="off" data-i18n-placeholder="tempUsernamePlaceholder" placeholder="${esc(tr('tempUsernamePlaceholder'))}" />
            <button type="button" id="qsNameSave" data-i18n="saveName" disabled>${esc(tr('saveName'))}</button>
          </div>
        </div>
        ${seg('qsGender', 'iAm', [['', 'preferNotSay'], ['male', 'male'], ['female', 'female']])}`)}
      ${section('setAppearance', `
        ${themes('qsTheme')}
        <div class="tl-set-control tl-set-control-stack">
          <label class="tl-set-label" for="qsLang" data-i18n="language">${esc(tr('language'))}</label>
          <div class="lang-wrap settings-lang-wrap">
            <svg class="lang-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><ellipse cx="12" cy="12" rx="4.2" ry="9.5"/><line x1="2.5" y1="12" x2="21.5" y2="12"/></svg>
            <select id="qsLang" class="lang-select"></select>
          </div>
        </div>`)}
      ${section('setAlerts', toggle('qsSound', 'sound', 'soundNotifications', 'soundHint') + toggle('qsVibration', 'buzz', 'vibration', 'vibrationHint'))}
      ${section('catPrivacy', toggle('qsStatus', 'dot', 'showOnlineStatus', 'statusHint') + toggle('qsSeen', 'seen', 'messageSeen', 'seenHint'))}
      <div class="qs-foot">
        <button type="button" class="btn btn-primary qs-all">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6"/><circle cx="9" cy="6" r="2"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="15" cy="12" r="2"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="11" cy="18" r="2"/></svg>
          <span data-i18n="allSettings">${esc(tr('allSettings'))}</span>
        </button>
        <p class="tl-field-note qs-all-note" data-i18n="allSettingsHint">${esc(tr('allSettingsHint'))}</p>
      </div>`;

    const $ = (sel) => container.querySelector(sel);
    const nameInput = $('#qsName');
    const nameSave = $('#qsNameSave');
    const langSel = $('#qsLang');

    function setSeg(group, value) {
      group.querySelectorAll('.pill').forEach((p) => {
        const on = p.dataset.value === value;
        p.classList.toggle('selected', on);
        p.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    if (typeof I18N_LANGS !== 'undefined') {
      Object.keys(I18N_LANGS).forEach((code) => {
        const opt = document.createElement('option');
        opt.value = code;
        opt.textContent = I18N_LANGS[code].name;
        langSel.appendChild(opt);
      });
    } else {
      langSel.closest('.tl-set-control').remove();
    }

    function render() {
      $('.qs-face').innerHTML = hooks.profileFace ? hooks.profileFace(44) : '';
      $('.qs-name').textContent = (hooks.profileName && hooks.profileName()) || tr('you');
      $('.qs-sub').textContent = (hooks.profileSub && hooks.profileSub()) || tr('myProfile');
      if (document.activeElement !== nameInput) nameInput.value = (hooks.profileName && hooks.profileName()) || '';
      nameSave.disabled = true;
      const g = read('talklive_gender');
      setSeg($('#qsGender'), g === 'male' || g === 'female' ? g : '');
      const theme = read('talklive_theme');
      setSeg($('#qsTheme'), THEMES.includes(theme) ? theme : 'dark');
      if (typeof I18N_STATE !== 'undefined') langSel.value = I18N_STATE.lang;
      $('#qsSound').checked = read('talklive_sound') !== 'off';
      $('#qsVibration').checked = read('talklive_vibration') !== 'off';
      $('#qsStatus').checked = read('talklive_status_visible') !== 'off';
      $('#qsSeen').checked = read('talklive_message_seen') !== 'off';
    }

    $('.qs-profile').addEventListener('click', () => hooks.openProfile && hooks.openProfile());
    $('.qs-all').addEventListener('click', () => hooks.openAll && hooks.openAll());

    nameInput.addEventListener('input', () => {
      const v = nameInput.value.trim();
      nameSave.disabled = !v || v === ((hooks.profileName && hooks.profileName()) || '');
    });
    function saveName() {
      if (nameSave.disabled) return;
      const rules = window.TalkLiveNickname;
      const nick = rules ? rules.check(nameInput.value) : { ok: true, value: nameInput.value.trim() };
      if (!nick.ok) {
        if (hooks.toast) hooks.toast(tr(nick.error));
        nameInput.focus();
        return;
      }
      nameInput.value = nick.value;
      nameSave.disabled = true;
      if (hooks.saveName) hooks.saveName(nick.value);
      render();
    }
    nameSave.addEventListener('click', saveName);
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); saveName(); }
    });

    $('#qsGender').addEventListener('click', (e) => {
      const pill = e.target.closest('.pill');
      if (!pill || pill.classList.contains('selected')) return;
      const g = pill.dataset.value;
      write('talklive_gender', g);
      write('talklive_gender_asked', 'yes');
      setSeg($('#qsGender'), g);
      if (hooks.onGender) hooks.onGender(g);
      flashSaved();
    });
    $('#qsTheme').addEventListener('click', (e) => {
      const pill = e.target.closest('.pill');
      if (!pill || pill.classList.contains('selected')) return;
      const theme = THEMES.includes(pill.dataset.value) ? pill.dataset.value : 'dark';
      write('talklive_theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
      setSeg($('#qsTheme'), theme);
      if (hooks.onTheme) hooks.onTheme(theme);
      flashSaved();
    });
    langSel.addEventListener('change', () => {
      if (typeof chooseLanguage === 'function') chooseLanguage(langSel.value);
      render();
      flashSaved();
    });
    [['#qsSound', 'talklive_sound', 'onSound'], ['#qsVibration', 'talklive_vibration', 'onVibration'],
      ['#qsStatus', 'talklive_status_visible', 'onStatusVisible'], ['#qsSeen', 'talklive_message_seen', 'onMessageSeen']]
      .forEach(([sel, key, hook]) => {
        const box = $(sel);
        box.addEventListener('change', () => {
          write(key, box.checked ? 'on' : 'off');
          if (hooks[hook]) hooks[hook](box.checked);
          flashSaved();
        });
      });

    window.addEventListener('i18n-changed', render);
    render();
    return { render };
  }

  // --- The full Settings screen -----------------------------------------------
  // Words people type that the labels do not contain (English only - every
  // label and description is searched in the current language as well).
  const EXTRA_WORDS = {
    themeGroup: 'dark mode light colour color appearance look',
    langSelect: 'translate translation',
    soundToggle: 'audio mute volume ring',
    vibrationToggle: 'haptic haptics',
    avatarGrid: 'picture photo face animal image',
    acceptCallsCheckbox: 'ring incoming',
    statusVisibilityToggle: 'invisible hidden presence last seen',
    messageSeenToggle: 'read receipts',
    blockedList: 'block unblock ban',
    changePasswordBtn: 'security',
    logoutBtn: 'sign out logout exit',
    sidePanelSignInBtn: 'login log in sign up register account password email',
  };
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  function enhancePage(page, api) {
    if (!page || page.dataset.enhanced) return;
    page.dataset.enhanced = '1';
    const nav = page.querySelector('.tl-set-nav');
    const content = page.querySelector('.tl-set-content');
    const search = page.querySelector('#settingsSearch');
    const isPhone = () => window.matchMedia('(max-width: 859px)').matches;

    // Each section gets a header of its own, built from its nav item, so the
    // two can never say different things.
    nav.querySelectorAll('[data-settings-tab]').forEach((item) => {
      const pane = page.querySelector(`[data-settings-pane="${item.dataset.settingsTab}"]`);
      if (!pane) return;
      const icon = item.querySelector('.tl-set-nav-icon');
      const label = item.querySelector('.tl-set-nav-label');
      const desc = item.querySelector('.tl-set-nav-text small');
      const head = document.createElement('header');
      head.className = 'tl-set-pane-head';
      head.innerHTML = `<span class="${icon.className.replace('tl-set-nav-icon', 'tl-set-pane-icon')}" aria-hidden="true">${icon.innerHTML}</span>
        <div><h3 data-i18n="${label.dataset.i18n}">${esc(tr(label.dataset.i18n))}</h3>${desc ? `<p data-i18n="${desc.dataset.i18n}">${esc(tr(desc.dataset.i18n))}</p>` : ''}</div>`;
      pane.prepend(head);
    });

    const hero = page.querySelector('.tl-set-hero');
    if (hero) hero.addEventListener('click', () => { clearSearch(); api.show('profile', true); scrollUp(); });

    function scrollUp() {
      if (isPhone()) window.scrollTo({ top: 0 });
    }

    // Arrow keys move through the sections, as a tab list should.
    nav.addEventListener('keydown', (e) => {
      const items = Array.from(nav.querySelectorAll('[data-settings-tab]'));
      const i = items.indexOf(document.activeElement);
      if (i < 0) return;
      let next = -1;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (i + 1) % items.length;
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (i - 1 + items.length) % items.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = items.length - 1;
      if (next < 0) return;
      e.preventDefault();
      items[next].focus();
      if (!isPhone()) items[next].click();
    });
    nav.addEventListener('click', (e) => {
      if (!e.target.closest('[data-settings-tab]')) return;
      clearSearch();
      scrollUp();
    });

    // --- Search -------------------------------------------------------------
    const empty = document.createElement('p');
    empty.className = 'tl-set-empty hidden';
    content.appendChild(empty);

    // What search shows or hides: every row of every card, and the sign-in card.
    function unitsOf(sec) {
      const out = [];
      sec.querySelectorAll('.tl-set-group, #sidePanelAuth').forEach((g) => {
        if (g.id === 'sidePanelAuth') out.push(g);
        else out.push(...g.children);
      });
      return out;
    }
    function textOf(el) {
      let s = el.textContent;
      el.querySelectorAll('[id]').forEach((n) => { if (EXTRA_WORDS[n.id]) s += ' ' + EXTRA_WORDS[n.id]; });
      if (EXTRA_WORDS[el.id]) s += ' ' + EXTRA_WORDS[el.id];
      el.querySelectorAll('input[placeholder]').forEach((n) => { s += ' ' + n.placeholder; });
      return norm(s);
    }
    function run() {
      const q = norm(search.value.trim());
      const words = q.split(/\s+/).filter(Boolean);
      page.querySelectorAll('.tl-miss').forEach((n) => n.classList.remove('tl-miss'));
      page.classList.toggle('is-searching', words.length > 0);
      if (!words.length) { empty.classList.add('hidden'); return; }
      const hit = (s) => words.every((w) => s.includes(w));
      let any = false;
      page.querySelectorAll('[data-settings-pane]').forEach((pane) => {
        const head = pane.querySelector('.tl-set-pane-head');
        const paneHit = hit(norm(head ? head.textContent : ''));
        let paneAny = false;
        pane.querySelectorAll(':scope > section').forEach((sec) => {
          const legend = sec.querySelector(':scope > .tl-set-legend');
          const secHit = paneHit || hit(norm(legend ? legend.textContent : ''));
          let secAny = false;
          unitsOf(sec).forEach((u) => {
            const off = u.closest('.hidden');
            if (off && off !== pane) return;
            const on = secHit || hit(textOf(u));
            u.classList.toggle('tl-miss', !on);
            if (on) secAny = true;
          });
          sec.classList.toggle('tl-miss', !secAny);
          if (secAny) paneAny = true;
        });
        pane.classList.toggle('tl-miss', !paneAny);
        if (paneAny) any = true;
      });
      empty.textContent = tr('setNoResults', { q: search.value.trim() });
      empty.classList.toggle('hidden', any);
    }
    function clearSearch() {
      if (!search || !search.value) return;
      search.value = '';
      run();
    }
    if (search) {
      search.addEventListener('input', run);
      search.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && search.value) { e.preventDefault(); e.stopPropagation(); clearSearch(); }
      });
    }
    document.addEventListener('keydown', (e) => {
      if (page.classList.contains('hidden')) return;
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName);
      if (e.key === '/' && !typing && search) { e.preventDefault(); search.focus(); }
    });

    // --- "Saved" --------------------------------------------------------------
    content.addEventListener('change', (e) => {
      const el = e.target;
      if (el.matches('input[type="checkbox"], select')) flashSaved();
    });
    content.addEventListener('click', (e) => {
      const pill = e.target.closest('#themeGroup .pill, #genderGroup .pill');
      if (pill && !pill.classList.contains('selected')) setTimeout(flashSaved, 0);
    }, true);

    return { clearSearch };
  }

  window.TalkLiveSettingsPanel = { mount, enhancePage, flashSaved, ready };
})();
