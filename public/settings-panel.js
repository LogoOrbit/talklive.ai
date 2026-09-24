// The one Settings panel. The landing page, a call and /chat all open this
// same side panel from their gear: who you are, the everyday preferences, and
// an "All settings" button for the full screen (account, avatar, blocked
// people, billing, help).
//
// Every value is read from and written to the same localStorage keys the full
// Settings screen uses, so the two can never disagree. What a change means
// beyond storage (re-registering, telling the server) is up to the page, via
// the hooks passed to mount().
(function () {
  'use strict';

  const THEMES = ['dark', 'light', 'ocean', 'sunset'];
  const GO = '<span class="tl-set-row-go" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg></span>';

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

  function seg(id, labelKey, options) {
    return `<div class="tl-set-control tl-set-control-stack">
      <span class="tl-set-label" id="${id}Label" data-i18n="${labelKey}">${esc(tr(labelKey))}</span>
      <div class="tl-seg pill-group" id="${id}" role="group" aria-labelledby="${id}Label">
        ${options.map(([value, key, dot]) => `<button type="button" class="tl-seg-opt pill" data-value="${value}"><span class="pill-dot ${dot}" aria-hidden="true"></span><span data-i18n="${key}">${esc(tr(key))}</span></button>`).join('')}
      </div>
    </div>`;
  }
  function toggle(id, key) {
    return `<label class="tl-set-control" for="${id}">
      <span data-i18n="${key}">${esc(tr(key))}</span>
      <span class="switch"><input type="checkbox" id="${id}" /><span class="switch-slider" aria-hidden="true"></span></span>
    </label>`;
  }

  // hooks: {
  //   profileFace(size) -> html, profileName() -> string, profileSub() -> string,
  //   openProfile(), openAll(), saveName(value), onGender(g), onTheme(theme),
  //   onSound(on), onVibration(on), onStatusVisible(on), onMessageSeen(on)
  // }
  function mount(container, hooks) {
    container.innerHTML = `
      <section>
        <div class="tl-set-group">
          <button type="button" class="tl-set-row qs-profile">
            <span class="tl-set-row-icon qs-face" aria-hidden="true"></span>
            <span class="tl-set-row-text"><strong class="qs-name"></strong><small class="qs-sub"></small></span>
            ${GO}
          </button>
          <div class="tl-set-control tl-set-control-stack">
            <label class="tl-set-label" for="qsName" data-i18n="tempUsername">${esc(tr('tempUsername'))}</label>
            <div class="tl-set-field">
              <input type="text" id="qsName" class="search-input text-input" maxlength="40" autocomplete="off" data-i18n-placeholder="tempUsernamePlaceholder" placeholder="${esc(tr('tempUsernamePlaceholder'))}" />
              <button type="button" id="qsNameSave" data-i18n="saveName" disabled>${esc(tr('saveName'))}</button>
            </div>
          </div>
          ${seg('qsGender', 'iAm', [['', 'preferNotSay', 'pill-dot-neutral'], ['male', 'male', 'pill-dot-male'], ['female', 'female', 'pill-dot-female']])}
        </div>
      </section>
      <section>
        <h3 class="tl-set-legend" data-i18n="appSettings">${esc(tr('appSettings'))}</h3>
        <div class="tl-set-group">
          <div class="tl-set-control tl-set-control-stack">
            <label class="tl-set-label" for="qsLang" data-i18n="language">${esc(tr('language'))}</label>
            <div class="lang-wrap settings-lang-wrap">
              <svg class="lang-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><ellipse cx="12" cy="12" rx="4.2" ry="9.5"/><line x1="2.5" y1="12" x2="21.5" y2="12"/></svg>
              <select id="qsLang" class="lang-select"></select>
            </div>
          </div>
          ${seg('qsTheme', 'theme', [['dark', 'themeDark', 'theme-dot-dark'], ['light', 'themeLight', 'theme-dot-light'], ['ocean', 'themeOcean', 'theme-dot-ocean'], ['sunset', 'themeSunset', 'theme-dot-sunset']])}
          ${toggle('qsSound', 'soundNotifications')}
          ${toggle('qsVibration', 'vibration')}
        </div>
      </section>
      <section>
        <h3 class="tl-set-legend" data-i18n="catPrivacy">${esc(tr('catPrivacy'))}</h3>
        <div class="tl-set-group">
          ${toggle('qsStatus', 'showOnlineStatus')}
          ${toggle('qsSeen', 'messageSeen')}
        </div>
      </section>
      <button type="button" class="btn btn-primary qs-all">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6"/><circle cx="9" cy="6" r="2"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="15" cy="12" r="2"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="11" cy="18" r="2"/></svg>
        <span data-i18n="allSettings">${esc(tr('allSettings'))}</span>
      </button>
      <p class="tl-field-note qs-all-note" data-i18n="allSettingsHint">${esc(tr('allSettingsHint'))}</p>`;

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
      $('.qs-face').innerHTML = hooks.profileFace ? hooks.profileFace(40) : '';
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
      if (!pill) return;
      const g = pill.dataset.value;
      write('talklive_gender', g);
      write('talklive_gender_asked', 'yes');
      setSeg($('#qsGender'), g);
      if (hooks.onGender) hooks.onGender(g);
    });
    $('#qsTheme').addEventListener('click', (e) => {
      const pill = e.target.closest('.pill');
      if (!pill) return;
      const theme = THEMES.includes(pill.dataset.value) ? pill.dataset.value : 'dark';
      write('talklive_theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
      setSeg($('#qsTheme'), theme);
      if (hooks.onTheme) hooks.onTheme(theme);
    });
    langSel.addEventListener('change', () => {
      if (typeof chooseLanguage === 'function') chooseLanguage(langSel.value);
      render();
    });
    [['#qsSound', 'talklive_sound', 'onSound'], ['#qsVibration', 'talklive_vibration', 'onVibration'],
      ['#qsStatus', 'talklive_status_visible', 'onStatusVisible'], ['#qsSeen', 'talklive_message_seen', 'onMessageSeen']]
      .forEach(([sel, key, hook]) => {
        const box = $(sel);
        box.addEventListener('change', () => {
          write(key, box.checked ? 'on' : 'off');
          if (hooks[hook]) hooks[hook](box.checked);
        });
      });

    window.addEventListener('i18n-changed', render);
    render();
    return { render };
  }

  window.TalkLiveSettingsPanel = { mount };
})();
