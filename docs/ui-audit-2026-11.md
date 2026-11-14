# TalkLive UI/UX audit — 2026-11-14

Method: ran the app locally, captured home, filters, friends, history, shop, settings and the start flow at 1366×800 and 360×640 in dark and light. Checked horizontal overflow on `/`, `/chat`, `/landing`, `/pricing` (none at either size). Not yet covered: the live call screen, text chat with a partner, and the native Android app. These need two real clients or a device. Findings below are limited to what was observed or read in code.

## Findings

| # | Area | Finding | Severity |
|---|---|---|---|
| 1 | Light theme | `.policy-body` text used hardcoded near-white colours, so the Terms inside the "Before You Start" gate were invisible in light mode. **Fixed in this branch.** | High |
| 2 | First conversation | The consent gate puts a scrolling wall of legal text between "Tap to Talk" and the first call. The text is also fetched on demand, so it shows "Loading…" first. Recommend a short summary (18+, be kind, no harassment) with Terms as a link, and the full text behind "Read full Terms". | High |
| 3 | Light theme | 26 hardcoded `#fff` / `rgba(242,244,255,…)` colours remain in `style.css`. Same bug class as #1, so each needs a light-mode check. | Medium |
| 4 | Home | Strong hierarchy: Tap to Talk (green) and Tap to Chat (blue) are unmistakable on both viewports. The support banner, Today's Question and the avatar picker are all below at similar weight; on first visit the avatar picker competes with the primary action. | Low–Med |
| 5 | Filters | Clear layout. "Premium" badge and "How this works" are visible, but the selected state is not echoed outside the panel. Add a summary chip on Home ("Female · Spain") and in the searching state ("Waiting for a Female match from Spain…"). Display only; matchmaking logic stays with Opus. | Medium |
| 6 | Mobile nav | Bottom bar is clear (Home, Friends, History, Filters, More). Shop and Settings are under More, which is acceptable. | OK |
| 7 | Progressive disclosure | Already implemented behind flag `progressiveDisclosure` (`app.js:9728`, `ui.css:2927`) with `fv_on_*` / `fv_off_*` counters. Recommend A/B at 50% and decide on the `fv_*` data after about 1k first sessions. Do not remove features. | Recommendation |

## Proposed design system (consolidate what exists)

Tokens already live in `style.css :root` and `[data-theme]`: `--bg-1/2`, `--accent`, `--accent-2`, `--danger`, `--green`, `--text`, `--muted`, `--line`.

- Rule: no raw colours in components. Use tokens, plus `color-mix()` for tints.
- Radius scale 8 / 12 / 16 / pill. Spacing 4-pt grid. Type scale 12 / 14 / 16 / 20 / 28 / 40.
- Touch targets ≥ 44px. Focus ring `2px var(--accent-2)` everywhere.
- Motion: 150–200ms ease-out for state changes only; respect `prefers-reduced-motion`.

## Prioritised plan

1. Done: light-mode Terms text (#1).
2. Replace the consent legal wall with a short summary (#2). Touches the consent flow and i18n strings.
3. Sweep the remaining hardcoded colours (#3) with light-mode screenshots per component.
4. Filter summary chip and waiting-state copy (#5). Needs a read-only hook into Opus's filter state.
5. Review the call UI, text chat and Android on real clients.

## Risks and dependencies

- `style.css` is shared by all pages. Changes require `npm run stamp`, and CI checks stamps.
- The consent flow is legally sensitive; get sign-off before shortening it.
- #5 depends on filter and matchmaking state that Opus owns. Read-only use only.
- i18n: new strings need adding to all 16 `public/i18n/*` files.

## Status update — 2026-11-14 (later)

| # | Status |
|---|---|
| 2 | Not changed (needs approval): the consent wording and length. Keyboard fixes only: focus stays inside the dialog, the terms box is focusable so it can be scrolled with the keyboard. On a 320px phone the terms are ~80 screens of text. |
| 3 | Done. All hard-coded light colours in `style.css` checked in dark, light and ocean. Five dark-island components use theme tokens; white on green/red fills raised to 4.5:1 (`--ok-fill`, `--danger-fill`); every other white is `var(--on-color)`. Two decorative radial highlights remain on purpose. `test-ui-contrast` renders these components at 4.5:1. |
| 5 | Done on web (words, not symbols; spoken label) and Android (Home + searching). |
| 6 | Mobile Shop and Settings tested by behaviour (open, prices, pick, touch targets, toggle saves, theme, scroll, close). Fixed: Shop links were 15px tall and used default link colours; Shop showed US prices until local ones loaded. |
