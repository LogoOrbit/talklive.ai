// ============================================================================
// TalkLive - movie-character avatars.
//
// A second family of picture avatars next to the spirit animals (animals.js),
// built the same way: one inline SVG sprite injected once per page, every
// avatar after that a <use> reference. No images, no network requests.
//
// These are original genre archetypes (the wizard, the pirate, the space
// explorer...), not drawings of any studio's characters: a likeness of a real
// film character on a public site is someone else's trademark and copyright.
// Stored as `c:<id>` (server/index.js validates the id against CHARACTER_IDS).
// ============================================================================
(function (global) {
  'use strict';

  var SPRITE_ID = 'tlCharacterSprite';
  var INK = '#1f2637';

  function c(cx, cy, r, fill, extra) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + fill + '"' + (extra || '') + '/>';
  }
  function e(cx, cy, rx, ry, fill) {
    return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + fill + '"/>';
  }
  function p(d, fill, extra) {
    return '<path d="' + d + '" fill="' + fill + '"' + (extra || '') + '/>';
  }
  function line(d, stroke, w) {
    return '<path d="' + d + '" fill="none" stroke="' + stroke + '" stroke-width="' + w
      + '" stroke-linecap="round" stroke-linejoin="round"/>';
  }
  function eye(x, y, r) {
    return c(x, y, r, INK) + c(x + r * 0.36, y - r * 0.42, r * 0.34, '#ffffff', ' opacity=".92"');
  }
  // The round tile, the shoulders and a face: what every character starts from.
  function bg(color) { return c(32, 32, 32, color); }
  function body(color) { return p('M12 56c2-10 10-15 20-15s18 5 20 15a32 32 0 0 1-40 0z', color); }
  function face(skin) { return c(32, 30, 12, skin); }
  function eyes() { return eye(27.5, 30, 1.8) + eye(36.5, 30, 1.8); }
  function smile() { return line('M28.5 35.5c2 1.6 5 1.6 7 0', INK, 1.4); }

  // Order is the order of the picker.
  var LIST = [
    {
      id: 'wizard', name: 'Wizard',
      art: function () {
        return bg('#5b4bc4') + body('#3b2f99') + face('#f2c9a0') + eyes()
          + p('M20 32c0 12 5 20 12 22 7-2 12-10 12-22-3 3-7 4-12 4s-9-1-12-4z', '#f1f5f9')
          + p('M26 35c2-2 4-2 6 0 2-2 4-2 6 0-2 2-4 2-6 1-2 1-4 1-6-1z', '#e2e8f0')
          + line('M24.5 26h5M34.5 26h5', '#ffffff', 2)
          + p('M17 22L37 2c-1 6 2 11 10 20z', '#3730a3')
          + e(32, 22, 17, 3.5, '#312e81')
          + p('M34 9.5l1 2.2 2.4.2-1.8 1.6.6 2.3-2.2-1.2-2.1 1.2.5-2.3-1.8-1.6 2.4-.2z', '#facc15');
      },
    },
    {
      id: 'pirate', name: 'Pirate',
      art: function () {
        return bg('#0e7490') + body('#1e293b') + face('#e0ac69')
          + e(32, 38, 7, 3.6, 'rgba(120,53,15,.35)')
          + eye(36.5, 30, 1.8) + c(27.5, 30, 3.4, INK)
          + line('M19 25.5L45 22.5', INK, 1.2)
          + line('M29 36.5c2.4 1 5 .6 7-1', INK, 1.4)
          + c(20.5, 33, 1.4, '#facc15')
          + p('M12 22c6-2 12-10 20-10s14 8 20 10c-4 3-12 4-20 4s-16-1-20-4z', '#111827')
          + line('M14 22.5c6 2.6 12 3.6 18 3.6s12-1 18-3.6', '#facc15', 1.2)
          + c(32, 17.5, 2.6, '#f8fafc') + c(31, 17.2, .6, INK) + c(33, 17.2, .6, INK);
      },
    },
    {
      id: 'detective', name: 'Detective',
      art: function () {
        return bg('#92400e') + body('#d6b37a') + p('M22 45l10 9 10-9-4-2-6 5-6-5z', '#b08850')
          + face('#ffdbac') + eyes() + line('M29 36h6', INK, 1.4)
          + e(32, 21.5, 18, 3.4, '#3f2a1d')
          + p('M20 21.5c0-7 4-11 12-11s12 4 12 11z', '#4a3426')
          + p('M20.3 18h23.4v3H20.3z', '#1f1410')
          + c(48, 45.5, 5, 'rgba(186,230,253,.35)', ' stroke="#e5e7eb" stroke-width="2"')
          + line('M51.5 49L54.5 52', '#7c2d12', 2.4);
      },
    },
    {
      id: 'hero', name: 'Superhero',
      art: function () {
        return bg('#dc2626') + body('#1d4ed8') + p('M27 47h10l-5 7z', '#facc15')
          + face('#f2c9a0')
          + p('M20 27c0-8 5-13 12-13s12 5 12 13c-3-4-7-6-12-6s-9 2-12 6z', '#111827')
          + p('M19 28.5c4-2.5 9-2.5 13 0 4-2.5 9-2.5 13 0-.5 4-3 6-6.5 6-3 0-5-1.5-6.5-3-1.5 1.5-3.5 3-6.5 3-3.5 0-6-2-6.5-6z', '#111827')
          + e(26, 30.5, 2.4, 1.5, '#ffffff') + e(38, 30.5, 2.4, 1.5, '#ffffff')
          + smile();
      },
    },
    {
      id: 'cowboy', name: 'Cowboy',
      art: function () {
        return bg('#ea580c') + body('#1e3a8a') + p('M23 43l9 8 9-8z', '#b91c1c')
          + face('#e0ac69') + eyes()
          + p('M26 35.5c2-1.8 4-1.8 6 0 2-1.8 4-1.8 6 0-1 1.6-3 2-6 1-3 1-5 .6-6-1z', '#78350f')
          + e(32, 23, 22, 4, '#a16207')
          + p('M21 23c0-7 2-12 5-12 2 0 4 2 6 2s4-2 6-2c3 0 5 5 5 12z', '#b45309')
          + p('M21.2 19.5h21.6v3H21.2z', '#78350f');
      },
    },
    {
      id: 'robot', name: 'Robot',
      art: function () {
        return bg('#475569') + body('#64748b') + p('M28 39h8v5h-8z', '#94a3b8')
          + line('M32 16V9', '#94a3b8', 2) + c(32, 8, 2.4, '#ef4444')
          + c(17.5, 28, 2.6, '#94a3b8') + c(46.5, 28, 2.6, '#94a3b8')
          + p('M23 16h18a5 5 0 0 1 5 5v14a5 5 0 0 1-5 5H23a5 5 0 0 1-5-5V21a5 5 0 0 1 5-5z', '#cbd5e1')
          + p('M22 21h20a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H22a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2z', '#0f172a')
          + c(27, 25.5, 2.4, '#22d3ee') + c(37, 25.5, 2.4, '#22d3ee')
          + line('M26 35h12M28 33v4M32 33v4M36 33v4', '#64748b', 1.4);
      },
    },
    {
      id: 'vampire', name: 'Vampire',
      art: function () {
        return bg('#3b0764') + body('#111827')
          + p('M15 47c-2-8 0-14 3-17l8 12zM49 47c2-8 0-14-3-17l-8 12z', '#b91c1c')
          + face('#e5e7eb') + eyes()
          + p('M20 28c0-9 5-14 12-14s12 5 12 14c-2-4-5-6-8-6l-4 5-4-5c-3 0-6 2-8 6z', '#111827')
          + line('M24 26l5 1.5M40 26l-5 1.5', INK, 1.4)
          + line('M28.5 36h7', INK, 1.4)
          + p('M29.3 36.2l.9 2.2.9-2.2zM32.9 36.2l.9 2.2.9-2.2z', '#ffffff');
      },
    },
    {
      id: 'ninja', name: 'Ninja',
      art: function () {
        return bg('#334155') + body('#0b0f19') + c(32, 30, 14, '#0b0f19')
          + p('M20 26h24v7H20z', '#e0ac69') + eye(27, 29.5, 1.8) + eye(37, 29.5, 1.8)
          + line('M24.5 27l4 .8M39.5 27l-4 .8', INK, 1.2)
          + p('M18.5 21h27v3.5h-27z', '#dc2626')
          + p('M45 22l8-3-2 5 3 3-9-2.5z', '#dc2626');
      },
    },
    {
      id: 'astronaut', name: 'Astronaut',
      art: function () {
        return bg('#1e1b4b') + c(12, 16, 1, '#ffffff') + c(52, 12, 1.2, '#ffffff') + c(54, 34, .9, '#ffffff') + c(9, 36, .8, '#ffffff')
          + body('#e5e7eb') + p('M36 48h6v4h-6z', '#ef4444')
          + c(32, 30, 16, '#f8fafc') + c(32, 30, 16, 'none', ' stroke="#cbd5e1" stroke-width="1.5"')
          + e(32, 31, 11, 9.5, '#0f172a')
          + line('M25.5 27c1.6-2.6 4-4 7-4.3', '#93c5fd', 2)
          + c(39, 35, 1.2, '#93c5fd', ' opacity=".6"');
      },
    },
    {
      id: 'zombie', name: 'Zombie',
      art: function () {
        return bg('#14532d') + body('#57534e') + p('M24 48l3 4 2-4 3 5 2-5 3 4 3-4z', '#44403c')
          + face('#9ccc65')
          + p('M20 27c-1-7 4-13 12-13 7 0 12 5 12 12l-3-3-2 3-3-4-3 3-3-3-3 3-2-3-3 4z', '#3f2e1f')
          + c(27, 30, 2.6, '#fef9c3') + c(27, 30, 1.2, INK) + eye(37, 30, 1.6)
          + line('M35.5 35.5l6-3M37.5 33.2l.8 1.6M39.8 32l.8 1.6', INK, 1)
          + line('M27 37.5l3-1 2 1.2 3-1.2', INK, 1.4);
      },
    },
    {
      id: 'alien', name: 'Alien',
      art: function () {
        return bg('#134e4a') + body('#6d28d9')
          + line('M26 14l-3-6M38 14l3-6', '#86efac', 1.6) + c(22.5, 7, 2, '#a3e635') + c(41.5, 7, 2, '#a3e635')
          + p('M32 12c10 0 16 7 16 15 0 9-8 16-16 16s-16-7-16-16c0-8 6-15 16-15z', '#86efac')
          + p('M20.5 27c3-1.5 7-.5 8.5 3-2.5 2-6.5 1.5-8.5-3zM43.5 27c-3-1.5-7-.5-8.5 3 2.5 2 6.5 1.5 8.5-3z', INK)
          + c(24, 28.3, .8, '#ffffff') + c(40, 28.3, .8, '#ffffff')
          + line('M30 37h4', INK, 1.2);
      },
    },
    {
      id: 'knight', name: 'Knight',
      art: function () {
        return bg('#7f1d1d') + body('#94a3b8')
          + p('M32 13c2-6 8-9 14-7-4 1-8 4-10 8z', '#dc2626')
          + p('M18 30c0-10 6-17 14-17s14 7 14 17v10c0 2-2 4-4 4H22c-2 0-4-2-4-4z', '#cbd5e1')
          + line('M32 14v29', '#94a3b8', 1.4)
          + p('M21 26h22v3.4H21z', '#0f172a')
          + c(36, 35, .9, INK) + c(39, 35, .9, INK) + c(36, 38, .9, INK) + c(39, 38, .9, INK);
      },
    },
    {
      id: 'queen', name: 'Queen',
      art: function () {
        return bg('#be185d')
          + p('M32 14c-10 0-15 7-15 15v14c0 2 2 4 4 4h3V30h16v17h3c2 0 4-2 4-4V29c0-8-5-15-15-15z', '#78350f')
          + body('#7e22ce') + line('M25 46c4 3 10 3 14 0', '#facc15', 1.4)
          + face('#f2c9a0') + eyes()
          + line('M25.5 28.2l-1-.9M38.5 28.2l1-.9', INK, 1)
          + p('M29 35c2 1.8 4 1.8 6 0-1 2.4-5 2.4-6 0z', '#be123c')
          + p('M22 19l3-8 4 5 3-7 3 7 4-5 3 8z', '#facc15') + c(32, 13, 1.2, '#ef4444');
      },
    },
    {
      id: 'warrior', name: 'Warrior',
      art: function () {
        return bg('#b45309') + body('#78350f') + line('M21 50l21-8.5', '#451a03', 2)
          + c(45.5, 38, 2.4, '#1c1917') + c(46.5, 42.5, 2.2, '#1c1917') + c(47, 46.6, 2, '#1c1917')
          + face('#c68642') + eyes()
          + line('M24.5 26.5l4.5 1M39.5 26.5l-4.5 1', INK, 1.3)
          + line('M23.5 33h4M36.5 33h4', '#dc2626', 1.6)
          + line('M29.5 36h5', INK, 1.4)
          + p('M19 30c0-10 6-16 13-16s13 6 13 16c-1-5-4-8-7-9-4 2-8 2-12 0-3 1-6 4-7 9z', '#1c1917')
          + p('M20.5 21.5c7 2 16 2 23 0l.5 2.6c-8 2.2-16 2.2-24 0z', '#facc15');
      },
    },
    {
      id: 'chef', name: 'Chef',
      art: function () {
        return bg('#0891b2') + body('#f8fafc') + p('M26 44l6 5 6-5z', '#dc2626')
          + face('#f2c9a0') + eyes()
          + p('M26 35.5c2-1.8 4-1.8 6 0 2-1.8 4-1.8 6 0-1 1.6-3 2-6 1-3 1-5 .6-6-1z', '#4a3426')
          + c(24, 13, 6, '#ffffff') + c(40, 13, 6, '#ffffff') + c(32, 10, 7, '#ffffff')
          + p('M22 15h20v6.5H22z', '#f1f5f9');
      },
    },
    {
      id: 'doctor', name: 'Doctor',
      art: function () {
        return bg('#0d9488') + body('#f8fafc') + p('M26 43.5l6 7 6-7z', '#14b8a6')
          + line('M25 44c-1.6 5 .6 8.4 4.4 8.6M39 44c1.6 5-.6 8.4-4.4 8.6', '#475569', 1.4) + c(32, 52.6, 1.9, '#94a3b8')
          + face('#c68642') + eyes() + smile()
          + p('M32 17c-8 0-13 5-13 11 1-4 5-7 13-7s12 3 13 7c0-6-5-11-13-11z', '#1f1410')
          + c(32, 19.5, 3, '#e5e7eb', ' stroke="#94a3b8" stroke-width="1"');
      },
    },
    {
      id: 'scientist', name: 'Scientist',
      art: function () {
        return bg('#4f46e5') + body('#f8fafc') + p('M27 43l5 7 5-7z', '#60a5fa')
          + c(19, 24, 5, '#e5e7eb') + c(45, 24, 5, '#e5e7eb') + c(23, 16.5, 5, '#e5e7eb') + c(41, 16.5, 5, '#e5e7eb') + c(32, 14, 6, '#e5e7eb')
          + face('#ffdbac')
          + c(27, 30, 3.8, '#bae6fd', ' stroke="#334155" stroke-width="1.4"') + c(37, 30, 3.8, '#bae6fd', ' stroke="#334155" stroke-width="1.4"')
          + line('M30.8 30h2.4', '#334155', 1.4)
          + eye(27, 30, 1.5) + eye(37, 30, 1.5) + smile();
      },
    },
    {
      id: 'artist', name: 'Artist',
      art: function () {
        return bg('#db2777') + body('#1e293b') + p('M24 44c4 3 12 3 16 0l-1 4c-4 2-10 2-14 0z', '#ef4444')
          + face('#f2c9a0') + eyes() + smile()
          + p('M20 25c0-4 2-6 4-7v8zM44 25c0-4-2-6-4-7v8z', '#7c2d12')
          + e(30, 18.5, 13.5, 4.6, '#1e293b') + c(30, 13.6, 1.5, '#1e293b')
          + e(48, 47, 7.5, 5.4, '#fde68a') + c(45, 46.4, 1.4, '#ef4444') + c(48.4, 44.6, 1.4, '#3b82f6') + c(51.4, 47, 1.4, '#22c55e')
          + line('M42 52l-6 4', '#92400e', 1.6);
      },
    },
    {
      id: 'rockstar', name: 'Rock Star',
      art: function () {
        return bg('#7c3aed') + body('#111827') + line('M27 45l3 3-2 2 4 3', '#facc15', 1.4)
          + p('M18 28l-2-10 6 4 2-10 5 7 3-9 3 9 5-7 2 10 6-4-2 10z', '#ec4899')
          + face('#e0ac69')
          + p('M21 27h9v3.5a3 3 0 0 1-3 3h-3a3 3 0 0 1-3-3zM34 27h9v3.5a3 3 0 0 1-3 3h-3a3 3 0 0 1-3-3z', '#0f172a')
          + line('M30 28h4', '#0f172a', 1.2) + smile() + c(20.5, 34, 1.3, '#facc15');
      },
    },
    {
      id: 'firefighter', name: 'Firefighter',
      art: function () {
        return bg('#dc2626') + body('#a16207') + line('M15.5 50.5h33', '#fde047', 2.4)
          + face('#e0ac69') + eyes() + smile()
          + e(32, 21, 19, 3.8, '#991b1b')
          + p('M19 21c0-7 6-12 13-12s13 5 13 12z', '#ef4444')
          + p('M29 12h6v5l-3 2-3-2z', '#facc15');
      },
    },
    {
      id: 'gamer', name: 'Gamer',
      art: function () {
        return bg('#2563eb') + body('#16a34a') + p('M27 43h10l-5 5z', '#14532d')
          + face('#ffdbac') + eyes() + smile()
          + p('M32 17c-8 0-13 5-13 11 1-4 5-7 13-7s12 3 13 7c0-6-5-11-13-11z', '#78350f')
          + line('M17.5 30c0-9 6-15.5 14.5-15.5S46.5 21 46.5 30', '#111827', 3)
          + p('M14.5 26.5h5.5v10h-5.5zM44 26.5h5.5v10H44z', '#111827')
          + line('M16 28.5v6M48 28.5v6', '#22c55e', 1.2)
          + line('M19 36c2 4 5 5 8 5', '#111827', 1.4) + c(27.5, 41, 1.4, '#22c55e');
      },
    },
    {
      id: 'king', name: 'King',
      art: function () {
        return bg('#1d4ed8') + body('#b91c1c')
          + p('M17 48c4-3 9-4.5 15-4.5s11 1.5 15 4.5l-2 3.4c-4-2-8.4-3-13-3s-9 1-13 3z', '#f8fafc')
          + c(23, 48.4, .8, INK) + c(32, 46.6, .8, INK) + c(41, 48.4, .8, INK)
          + face('#f2c9a0') + eyes()
          + p('M20 30c0 9 5 14 12 14s12-5 12-14c-2 3-4 5-6 5H26c-2 0-4-2-6-5z', '#92400e')
          + line('M29 36.6h6', '#5b2c0e', 1.4)
          + p('M20.5 20.5l2-10 5 5 4.5-7 4.5 7 5-5 2 10z', '#facc15') + c(32, 15.5, 1.4, '#ef4444') + c(25, 17.5, 1, '#3b82f6') + c(39, 17.5, 1, '#3b82f6');
      },
    },
    {
      id: 'viking', name: 'Viking',
      art: function () {
        return bg('#0f766e') + body('#78716c')
          + face('#ffdbac') + eyes()
          + p('M19 31c0 10 6 17 13 17s13-7 13-17c-2 3-5 5-8 5H27c-3 0-6-2-8-5z', '#ea580c')
          + p('M26 35.5c2-1.8 4-1.8 6 0 2-1.8 4-1.8 6 0-1 1.6-3 2-6 1-3 1-5 .6-6-1z', '#c2410c')
          + line('M28 41v5M36 41v5', '#c2410c', 1.2)
          + p('M19.5 22c-5-1-8.5-6-7.5-12 3 4 6 6 10 6zM44.5 22c5-1 8.5-6 7.5-12-3 4-6 6-10 6z', '#f5f5f4')
          + p('M19 24c0-8 6-13 13-13s13 5 13 13z', '#94a3b8')
          + p('M19 21h26v4H19z', '#64748b') + line('M32 11v10', '#64748b', 2);
      },
    },
    {
      id: 'witch', name: 'Witch',
      art: function () {
        return bg('#4c1d95')
          + p('M32 16c-10 0-15 7-15 15v14c0 2 2 4 4 4h3V30h16v19h3c2 0 4-2 4-4V31c0-8-5-15-15-15z', '#1f2937')
          + body('#111827') + face('#86efac') + eyes()
          + p('M29 35c2 1.8 4 1.8 6 0-1 2.4-5 2.4-6 0z', '#7e22ce')
          + e(32, 21, 19, 3.5, '#111827')
          + p('M21.5 21L36 1c0 6 3 12 7 20z', '#1f2937')
          + p('M23.4 16.6h17.9l1.2 3.4H22.4z', '#a855f7') + p('M30 16.6h4v3.4h-4z', '#facc15');
      },
    },
    {
      id: 'elf', name: 'Elf',
      art: function () {
        return bg('#15803d')
          + p('M32 16c-10 0-15 7-15 15v14c0 2 2 4 4 4h3V30h16v19h3c2 0 4-2 4-4V31c0-8-5-15-15-15z', '#facc15')
          + body('#166534') + p('M21 30L10 21l12 3zM43 30l11-9-12 3z', '#ffdbac')
          + face('#ffdbac') + eyes() + smile()
          + p('M20.5 25c2-6 6-8.5 11.5-8.5S41.5 19 43.5 25c-3-3-7-4.5-11.5-4.5S23.5 22 20.5 25z', '#facc15')
          + line('M21 21.5c7 2.4 15 2.4 22 0', '#a3e635', 1.4) + p('M32 21l2.4 2-2.4 2-2.4-2z', '#4ade80');
      },
    },
    {
      id: 'clown', name: 'Clown',
      art: function () {
        return bg('#f59e0b') + body('#2563eb')
          + c(22, 45, 4, '#f8fafc') + c(28, 47.4, 4, '#f8fafc') + c(36, 47.4, 4, '#f8fafc') + c(42, 45, 4, '#f8fafc')
          + c(18.5, 25, 6, '#f97316') + c(45.5, 25, 6, '#f97316') + c(23, 18, 5, '#f97316') + c(41, 18, 5, '#f97316')
          + face('#f8fafc')
          + line('M25 26l2.5-2.5 2.5 2.5M34 26l2.5-2.5 2.5 2.5', '#3b82f6', 1.2)
          + eyes() + line('M25.5 36c4 4 9 4 13 0', '#dc2626', 2) + c(32, 33.5, 3, '#ef4444');
      },
    },
  ];

  var BY_ID = {};
  for (var i = 0; i < LIST.length; i++) BY_ID[LIST[i].id] = LIST[i];

  var spriteInstalled = false;
  function installSprite() {
    if (spriteInstalled || typeof document === 'undefined') return;
    if (document.getElementById(SPRITE_ID)) { spriteInstalled = true; return; }
    var symbols = '';
    for (var i = 0; i < LIST.length; i++) {
      symbols += '<symbol id="tlc-' + LIST[i].id + '" viewBox="0 0 64 64">' + LIST[i].art() + '</symbol>';
    }
    var host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    host.innerHTML = '<svg id="' + SPRITE_ID + '" xmlns="http://www.w3.org/2000/svg">' + symbols + '</svg>';
    (document.body || document.documentElement).appendChild(host);
    spriteInstalled = true;
  }

  function icon(id, size) {
    if (!BY_ID[id]) return '';
    var s = size || 40;
    return '<svg class="tl-animal-icon" width="' + s + '" height="' + s
      + '" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><use href="#tlc-' + id + '"/></svg>';
  }

  // Localised name when i18n has one (key `character<Id>`), else the English.
  function name(id) {
    var ch = BY_ID[id];
    if (!ch) return '';
    var k = 'character' + id.charAt(0).toUpperCase() + id.slice(1);
    var s = typeof global.t === 'function' ? global.t(k) : k;
    return s === k ? ch.name : s;
  }

  // The whole avatar, wrapped the way animal avatars are so every list that
  // sizes `.avatar-animal` sizes these too. '' for an unknown id.
  function html(id, size) {
    if (!BY_ID[id]) return '';
    installSprite();
    return '<span class="avatar-animal" style="width:' + size + 'px;height:' + size + 'px">' + icon(id, size) + '</span>';
  }

  global.TalkLiveCharacters = {
    list: LIST,
    ids: LIST.map(function (ch) { return ch.id; }),
    has: function (id) { return !!BY_ID[id]; },
    installSprite: installSprite,
    icon: icon,
    name: name,
    html: html,
  };
}(window));
