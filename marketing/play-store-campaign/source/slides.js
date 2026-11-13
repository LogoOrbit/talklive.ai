// TalkLive Play Store campaign: one art direction, two lighting moods.
export const THEMES = {
  dark: {
    name: 'dark',
    base: '#05060F',
    ink: '#F5F6FF',
    muted: '#B3B5D6',
    accent: 'linear-gradient(96deg, #3E86FF 0%, #38BDF8 52%, #2FE0F0 100%)',
    gold: 'linear-gradient(96deg, #FFE6A8 0%, #F6C760 50%, #E9A53A 100%)',
    logoLive: '#38BDF8',
    frame: 'graphite',
    sheen: 0.012,
    lights: 'dark',
    vignette: 'radial-gradient(120% 85% at 50% 42%, rgba(0,0,0,0) 58%, rgba(1,2,8,.62) 100%)',
    grain: 0.075,
    shadow: 'drop-shadow(0 50px 70px rgba(0,0,6,.55)) drop-shadow(0 12px 18px rgba(0,0,6,.45))',
    blue: '#1563F5', cyan: '#29DEF1', sky: '#38BDF8', violet: '#6C5CE7', indigo: '#3A2C9C', teal: '#0E6E8C', gold: '#F4C25B',
  },
  light: {
    name: 'light',
    base: '#F3F4F9',
    ink: '#0B1024',
    muted: '#5A6079',
    accent: 'linear-gradient(96deg, #1460F2 0%, #1590EE 50%, #09AFD6 100%)',
    gold: 'linear-gradient(96deg, #C58A12 0%, #A86C06 55%, #8F5A04 100%)',
    logoLive: '#1A9BEA',
    frame: 'silver',
    sheen: 0.0,
    lights: 'light',
    vignette: 'radial-gradient(120% 85% at 50% 42%, rgba(0,0,0,0) 62%, rgba(36,44,88,.10) 100%)',
    grain: 0.05,
    shadow: 'drop-shadow(0 52px 80px rgba(28,38,92,.30)) drop-shadow(0 14px 22px rgba(28,38,92,.22))',
    blue: '#5E8BFF', cyan: '#5FE3F5', sky: '#7CCBFA', violet: '#9C8FF5', indigo: '#B7AEF7', teal: '#8FD3EC', gold: '#F2C66A',
  },
};

const D = (T) => T.name === 'dark';
const scr = (name, T) => `/screens/${name}-${T.name}.png`;
// Canvas y of a point at fraction f down the display of an upright phone.
const SCREEN_OF_PHONE = 0.9788;
const sy = (p, f) => p.cy + (f - 0.5) * p.h * SCREEN_OF_PHONE;

// Shared backdrops: midnight (teal-navy top left, indigo bottom right, as the brand art) / porcelain.
const night = (extra = '') => `${extra}radial-gradient(1300px 900px at 8% -6%, rgba(24,64,96,.9) 0%, rgba(24,64,96,0) 62%), radial-gradient(1200px 1100px at 104% 96%, rgba(52,41,113,.75) 0%, rgba(52,41,113,0) 62%), linear-gradient(180deg, #0A1022 0%, #070A18 55%, #05060F 100%)`;
const day = (extra = '') => `${extra}radial-gradient(1300px 900px at 6% -8%, rgba(204,238,255,.95) 0%, rgba(204,238,255,0) 62%), radial-gradient(1200px 1100px at 104% 96%, rgba(228,223,255,.95) 0%, rgba(228,223,255,0) 62%), linear-gradient(180deg, #F8F9FC 0%, #F2F4F9 60%, #EDF0F7 100%)`;
const bg = (T, extraDark = '', extraLight = '') => (D(T) ? night(extraDark) : day(extraLight));

export const SLIDES = {
  // 1. Hero: the phone rises over a lit horizon. The world, one tap away.
  '01': (T) => ({
    bg: bg(T),
    fx: [
      { type: 'glow', cx: 600, cy: 1150, r: 1050, color: T.blue, alpha: D(T) ? 0.42 : 0.22, falloff: 2.0 },
      {
        type: 'planet', cx: 560, cy: 2230, r: 1010, atm: 300,
        atmColor: D(T) ? '#2FA8F5' : '#86D2FB', atmAlpha: 0.62,
        bodyTop: D(T) ? '#0C1838' : '#FFFFFF', bodyBottom: D(T) ? '#04060E' : '#E9EDF6', bodyDepth: 640,
        gridColor: D(T) ? '#6CC4FF' : '#7C93D2', gridAlpha: D(T) ? 0.26 : 0.22, gridFade: 560, gridWidth: 1.15, tilt: 34, spin: 18,
        rimColorA: D(T) ? '#9BE3FF' : '#5CB8F6', rimColorB: D(T) ? '#2FE0F0' : '#36C6EA', rimAlpha: D(T) ? 1 : 0.9, rimWidth: 2.4, rimSpan: 1.05,
      },
      { type: 'glow', cx: 600, cy: 1226, r: 520, ry: 150, color: D(T) ? '#7FE6FF' : '#9BE4FF', alpha: D(T) ? 0.55 : 0.6, falloff: 1.9 },
    ],
    logo: { x: 92, y: 112, h: 58, size: 44 },
    text: { x: 86, y: 224, w: 900, size: 118, h: 'Meet someone<br><em>new.</em>', sub: 'One tap connects you with people<br>around the world.' },
    phones: [{ screen: scr('home', T), cx: 600, cy: 1392, h: 1440, ry: -15, rx: 4, rz: 0.6 }],
    fov: 20,
  }),

  // 2. Voice: the call's pulse carried out into the room as rings of light.
  '02': (T) => {
    const p = { cx: 540, cy: 1318, h: 1400 };
    const ay = sy(p, 0.315);
    return {
      bg: bg(T),
      fx: [
        { type: 'glow', cx: 540, cy: ay, r: 980, color: T.violet, alpha: D(T) ? 0.5 : 0.3, falloff: 2.0 },
        { type: 'glow', cx: 540, cy: ay + 120, r: 560, color: T.cyan, alpha: D(T) ? 0.2 : 0.22, falloff: 2.0 },
        { type: 'rings', cx: 540, cy: ay, r0: 400, step: 54, grow: 0.025, n: 17, width: 1.5, colors: D(T) ? ['#8F84FF', '#4FD8F5'] : ['#8C80F0', '#5DBFE6'], alpha: D(T) ? 0.6 : 0.55, fade: 1.25 },
      ],
      text: { x: 90, y: 136, w: 900, align: 'center', size: 118, h: 'Hear a real<br><em>voice.</em>', sub: 'Live voice calls with people worldwide.<br>No camera, no pressure.' },
      phones: [{ screen: scr('call', T), ...p }],
    };
  },

  // 3. Text: the phone hangs from the top edge; the type sits low, like a caption.
  '03': (T) => ({
    bg: bg(T),
    fx: [
      { type: 'glow', cx: 760, cy: 520, r: 950, color: T.violet, alpha: D(T) ? 0.42 : 0.26, falloff: 2.0 },
      { type: 'beam', cx: 600, cy: 760, rot: 34, w: 560, len: 3200, color: D(T) ? '#7FC8FF' : '#A9D9FF', alpha: D(T) ? 0.1 : 0.32 },
      { type: 'glow', cx: 120, cy: 1700, r: 760, color: T.teal, alpha: D(T) ? 0.45 : 0.4, falloff: 2.0 },
    ],
    text: { x: 88, bottom: 150, w: 920, size: 112, h: 'Prefer <em>typing?</em>', sub: "Anonymous text chats for when<br>you can't talk out loud." },
    phones: [{ screen: scr('text_chat', T), cx: 560, cy: 712, h: 1480, rx: 5, ry: 12, rz: -7 }],
    fov: 22,
  }),

  // 4. Friends: two devices in depth. Keep someone, then they call you back.
  '04': (T) => ({
    bg: bg(T),
    fx: [
      { type: 'glow', cx: 300, cy: 1150, r: 760, color: T.teal, alpha: D(T) ? 0.55 : 0.45, falloff: 2.0 },
      { type: 'glow', cx: 780, cy: 1300, r: 820, color: T.violet, alpha: D(T) ? 0.42 : 0.28, falloff: 2.0 },
    ],
    text: { x: 88, y: 140, w: 920, size: 118, h: 'Keep the<br>good <em>ones.</em>', sub: 'Add the people you click with<br>and call them again anytime.' },
    phones: [
      { screen: scr('incoming', T), cx: 300, cy: 1300, h: 1190, rx: 2, ry: 20, rz: -3, z: -260 },
      { screen: scr('friends', T), cx: 765, cy: 1345, h: 1290, rx: 3, ry: -17, rz: 2 },
    ],
    fov: 22,
  }),

  // 5. Messages: a close-up. The conversation fills the frame.
  '05': (T) => ({
    bg: bg(T),
    fx: [
      { type: 'glow', cx: 860, cy: 760, r: 900, color: T.violet, alpha: D(T) ? 0.45 : 0.28, falloff: 2.0 },
      { type: 'glow', cx: 260, cy: 1500, r: 760, color: T.sky, alpha: D(T) ? 0.22 : 0.3, falloff: 2.0 },
    ],
    text: { x: 88, y: 140, w: 920, size: 118, h: 'Messages that<br>feel <em>alive.</em>', sub: 'Voice notes, reactions and GIFs.<br>Say it your way.' },
    phones: [{ screen: scr('voice_notes', T), cx: 610, cy: 1735, h: 2260, rx: 4, ry: -12, rz: 6 }],
    fov: 20,
  }),

  // 6. Games: the phone laid back like a board on a table, seen from above.
  '06': (T) => ({
    bg: bg(T),
    fx: [
      { type: 'glow', cx: 540, cy: 1300, r: 1000, color: T.violet, alpha: D(T) ? 0.5 : 0.3, falloff: 2.0 },
      { type: 'glow', cx: 640, cy: 1500, r: 600, color: T.cyan, alpha: D(T) ? 0.2 : 0.25, falloff: 2.0 },
    ],
    text: { x: 90, y: 140, w: 900, align: 'center', size: 118, h: 'Break the <em>ice.</em>', sub: 'Play Tic-Tac-Toe or Dots together,<br>right in the call.' },
    phones: [{ screen: scr('game', T), cx: 545, cy: 1260, h: 1560, rx: -30, ry: 9, rz: -11 }],
    fov: 30,
  }),

  // 7. Avatars: a receding wall of the app's own spirit animals.
  '07': (T) => ({
    bg: bg(T),
    fx: [
      { type: 'glow', cx: 540, cy: 900, r: 1000, color: T.violet, alpha: D(T) ? 0.42 : 0.24, falloff: 2.0 },
      { type: 'glow', cx: 540, cy: 860, r: 620, ry: 120, color: T.sky, alpha: D(T) ? 0.3 : 0.4, falloff: 1.8 },
    ],
    fxMid: [{ type: 'glow', cx: 545, cy: 1835, r: 470, ry: 70, color: D(T) ? '#000000' : '#4A5A92', alpha: D(T) ? 0.75 : 0.22, falloff: 1.7 }],
    wall: {
      cols: 13, rows: 15, tile: 150, gap: 20, x: (1080 - (13 * 150 + 12 * 20)) / 2, y: 1990 - (15 * 150 + 14 * 20),
      origin: '50% 100%', transform: 'rotateX(62deg)', perspective: 1100, pOrigin: '50% 45%',
      tileBg: (c) => (D(T) ? `linear-gradient(160deg, ${c}44, #141B33 72%)` : `linear-gradient(160deg, ${c}3A, #FFFFFF 72%)`),
      tileShadow: D(T) ? 'inset 0 0 0 1.5px rgba(255,255,255,.07)' : '0 8px 18px rgba(40,50,100,.10), inset 0 0 0 1.5px rgba(255,255,255,.9)',
      mask: 'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,.55) 58%, rgba(0,0,0,.95) 78%, #000 100%)',
      filter: 'blur(0.6px)', opacity: D(T) ? 0.85 : 0.9,
    },
    text: { x: 90, y: 140, w: 900, align: 'center', size: 124, h: 'Be <em>anyone.</em>', sub: 'Choose a spirit animal.<br>No photo needed.' },
    phones: [{ screen: scr('animals', T), cx: 540, cy: 1170, h: 1290, rx: 2, ry: -9, rz: 0 }],
    fov: 20,
  }),

  // 8. Plus: warm gold rim light, and the gold ring Plus members wear.
  '08': (T) => ({
    accent: T.gold,
    lights: D(T) ? 'gold' : 'light',
    bg: D(T)
      ? 'radial-gradient(1100px 900px at 90% 30%, rgba(120,84,20,.45) 0%, rgba(120,84,20,0) 60%), ' + night()
      : 'radial-gradient(1100px 900px at 90% 30%, rgba(255,226,160,.7) 0%, rgba(255,226,160,0) 60%), ' + day(),
    fx: [
      { type: 'glow', cx: 640, cy: 1200, r: 900, color: T.gold, alpha: D(T) ? 0.3 : 0.38, falloff: 2.1 },
      { type: 'rings', cx: 640, cy: 1240, r0: 620, step: 0, n: 1, width: 2.2, colors: D(T) ? ['#FFE6A8', '#C98A2A'] : ['#E9B44C', '#C98A2A'], alpha: D(T) ? 0.5 : 0.6 },
      { type: 'rings', cx: 640, cy: 1240, r0: 662, step: 0, n: 1, width: 1, colors: D(T) ? ['#FFE6A8', '#C98A2A'] : ['#E9B44C', '#C98A2A'], alpha: D(T) ? 0.22 : 0.3 },
      { type: 'glow', cx: 140, cy: 1700, r: 700, color: T.violet, alpha: D(T) ? 0.35 : 0.22, falloff: 2.0 },
    ],
    text: { x: 88, y: 140, w: 920, size: 118, h: 'Go further<br>with <em>Plus.</em>', sub: 'Choose who you meet, skip the queue<br>and unlock 56 avatars.' },
    phones: [{ screen: scr('plus', T), cx: 610, cy: 1470, h: 1500, rx: 4, ry: -17, rz: 1.5 }],
    fov: 20,
  }),
};
