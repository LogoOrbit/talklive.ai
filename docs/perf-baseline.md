# Performance baseline (fix list 1.4) and the 2.1 re-test

Measured 2026-09-23 with Lighthouse 12, mobile form factor, simulated Slow 4G
(150 ms RTT, 1.6 Mbps down, 4x CPU slowdown - Lighthouse's default mobile
throttling), cold cache, against the app running locally (`npm start`).

**Caveat:** production (`talklive.app`) was not reachable from the sandbox the
numbers were taken in, and third-party tags (Google Analytics, Adsterra) were
blocked there. Real-world pages also pay for those, so treat these as the
first-party floor, and re-run against production with the same settings:

```sh
npx lighthouse https://talklive.app/ --only-categories=performance --form-factor=mobile
```

## Before (main at ac36df1)

| Page | Score | Transferred | JS | FCP | LCP | TTI | TBT |
|---|---|---|---|---|---|---|---|
| `/` | 77 | 405 KB | 210 KB (16 files) | 1.84 s | 4.28 s | 4.47 s | 127 ms |
| `/random-text-chat` | 100 | 48 KB | 19 KB (3 files) | 0.76 s | 1.26 s | 1.26 s | 0 ms |
| `/free-voice-chat` | 100 | 48 KB | 19 KB (3 files) | 0.75 s | 1.28 s | 1.29 s | 0 ms |

Largest homepage transfers: `app.js` 90 KB, HTML 46 KB, `style.css` 39 KB,
unminified `socket.io.js` 37 KB, `ui.css` 31 KB, font 28 KB, `i18n.js` 17 KB,
`ads.js` 15 KB.

The landing pages are already light; the homepage is where the weight is. The
modal/legal-content suspicion was half right: the full Terms were duplicated in
the consent dialog (~30 KB of HTML), but Settings/Shop/Billing markup is small
and their logic lives inside `app.js`.

## After 2.1

| Page | Score | Transferred | JS | FCP | LCP | TTI | TBT |
|---|---|---|---|---|---|---|---|
| `/` | 80 | 379 KB | 189 KB (16 files) | 1.67 s | 3.85 s | 4.00 s | 160 ms* |
| `/random-text-chat` | 100 | 49 KB | 20 KB | 0.76 s | 1.21 s | 1.21 s | 0 ms |
| `/free-voice-chat` | 100 | 50 KB | 20 KB | 0.76 s | 1.28 s | 1.29 s | 0 ms |

\* TBT moves ±40 ms between identical runs here; it is noise at this size.

Changes: the consent dialog fetches `/terms` on open instead of shipping a copy;
`socket.io.min.js` instead of the unminified client.

## Next biggest win (not done)

`app.js` is 332 KB raw / 90 KB gzipped and unminified. Minifying it at build
time (e.g. esbuild in the Dockerfile) would likely save ~30 KB gzipped on every
first visit, but it changes how every deploy is built and how error-reporter
stack traces read, so it deserves its own change. The CI budget in
`scripts/bundle-budget.json` will catch regressions in the meantime.
