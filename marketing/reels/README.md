# TalkLive Reels: 10 voiced motion-graphic ads

All 1080×1920 (9:16), 30 fps, 15–21 s, H.264 + AAC. They're ready for Reels, TikTok and Shorts.

| # | File | Technique | Hook (first 1.5 s) |
|---|---|---|---|
| 1 | `../TalkLive-Reel-01-rip-omegle.mp4` | News-jacking + nostalgia + pattern interrupt | A tombstone rises: "R.I.P. Omegle 2009–2023" |
| 2 | `../TalkLive-Reel-02-dont-use.mp4` | Reverse psychology + pharma-ad parody | Caution tape: "DO NOT USE THIS APP" |
| 3 | `../TalkLive-Reel-03-pov-2am.mp4` | Relatable POV + lock-screen notification | 2:07 AM lock screen, a TalkLive notification drops in |
| 4 | `../TalkLive-Reel-04-ten-seconds.mp4` | Challenge + live countdown | "Talk to a stranger in 10s?" |
| 5 | `../TalkLive-Reel-05-versus.mp4` | Enemy framing + side-by-side comparison | RGB-glitch text: "Why does every app want your face?" |
| 6 | `../TalkLive-Reel-06-spirit-animal.mp4` | Interactive "screenshot now" + comment bait | Spirit-animal slot machine, "● SCREENSHOT NOW" |
| 7 | `../TalkLive-Reel-07-stop-scrolling.mp4` | Emotional insight + stat counter | A feed scrolling past while a counter climbs to 400 |
| 8 | `../TalkLive-Reel-08-hello-world.mp4` | Rapid-fire montage, one cut per word | "Hola / Bonjour / Konnichiwa…" with flags |
| 9 | `../TalkLive-Reel-09-introverts.mp4` | Audience call-out + rule of three | "Introverts, this one's for you." |
| 10 | `../TalkLive-Reel-10-awkward-silence.mp4` | Problem → agitate → solve, told with sound | The waveform flatlines with a heart-monitor beep |

## What the research says, and where each point is used

**1. Win the first 1–2 seconds.** About 70% of viewers decide whether to swipe within ~2 s. Reels gives you roughly 1.0–1.5 s. Moving bold text in the first two seconds lifts 3-second retention by up to ~50% compared with a static opener. → Every reel has headline text and motion on frame 0. No logo intro, and no "Hi guys".

**2. Design for sound-off, reward sound-on.** More than half of viewers watch muted. → Word-by-word captions are synced to the voiceover from TTS word timestamps, and the spoken word lights up yellow ("Hormozi style"). The captions sit in y 1270–1490, clear of the Reels/TikTok header, side buttons and description overlay. With sound on, there's a voiceover, a ducked music bed and a synthesised SFX layer. Every cut has a whoosh, every slammed word a hit, plus pops, a notification chime, a shutter and a flatline beep.

**3. Pattern interrupt plus an open loop.** Break the viewer's prediction (a funeral, caution tape, a glitch), then leave a question open that gets answered later. → In reel 1, "Omegle died" opens on "…but talking to strangers never died". In reel 4 the countdown is the open loop.

**4. Change something every 1–3 seconds.** → Each beat is one spoken sentence, so there's a new scene every 1.5–4 s. Cuts carry a whip-zoom, a blur and a light flash. Punch words shake the camera, and slow zoom drift keeps static moments alive.

**5. Kinetic typography.** Text that moves with the audio is remembered better than static text. This is the Spotify Wrapped playbook. → Lines slam in from 190% scale with blur, timed to the exact word.

**6. Unhinged and anti-ads.** Duolingo's chaotic TikTok persona came with a 51% rise in DAU. Liquid Death built its brand on absurd anti-marketing. → Reel 2 (do NOT use this app, side effects may include…) and the RIP framing in reel 1.

**7. Viral loops.** Monkey grew through creators posting their random-chat moments. Engagement prompts ("screenshot", "comment yours") feed the algorithm comments and saves. → Reel 6 is built around that.

**8. Speak to one person.** POV and audience call-outs ("Introverts…", "It's 2 AM and you can't sleep") make the right viewer feel seen and filter out everyone else. → Reels 3 and 9.

**9. Show the product in its first seconds of use.** Every reel shows the matching radar, the connect moment with spirit-animal avatars, real features (text chat, games, skip, no sign-up), and ends on one CTA: `talklive.app`.

**10. One idea per ad, one CTA.** 15–21 s, single message, the same end card on all ten for brand recall.

## How to use them

- **Organic:** post 1 per day for 10 days. Pin reels 6 and 2 (they're the comment drivers). Reply to every "I got…" comment on reel 6.
- **Paid:** run all 10 as one ad set with dynamic creative. After ~3 days, kill anything with a hook rate (3 s views ÷ impressions) under 25%. Scale anything over 35%.
- **Captions to post with them:** first line = the hook again, then one line of value, then "talklive.app (link in bio)".
- **Before paid spend:** reel 4 shows a connection in ~5 s. Check real median match times in your analytics first. If they're slower, change `from`/copy in `reels.js` and re-render.

## Regenerating / editing

Everything is code. Edit the copy, timing or scenes in `reels.js` and re-render.

```bash
pip install edge-tts                                   # neural TTS (free)
SSL_CERT_FILE=/path/to/ca.crt node build.js [reel]     # voiceover + word timings -> vo/  (SSL_CERT_FILE only behind a TLS proxy)
npx http-server -p 6910 -s .                           # from repo root
node render.js preview <reel>                          # one frame per beat -> prev/
node render.js video [reel ...]                        # MP4s -> ../TalkLive-Reel-NN-<reel>.mp4
```

- `reels.js`: the 10 scripts. One beat = one VO line + one scene. `at: 'word'` fires an animation on that spoken word.
- `reel.html`: the scene library (slam, list, tomb, radar, countdown, chat, roulette, clocks, button, wave, versus, glitch, counter, scroll, hello, ttt, notif, caution, outro), plus captions, camera shake and cut transitions.
- `audio.js`: the synthesised SFX kit (no licensed samples) and the WAV helpers.
- Voices: Andrew, Ava, Brian, Emma (Microsoft neural voices via edge-tts). Swap the `voice` field per reel to A/B male vs female narration.

Sources: [jellymarketing.ca](https://jellymarketing.ca/blog/stop-the-scroll-in-3-seconds-secrets-to-high-performing-short-form-video-hooks/), [tlinky.com](https://tlinky.com/3-second-hook/), [nestscale.com](https://nestscale.com/blog/increase-tiktok-hook-rate.html), [adstellar.ai](https://www.adstellar.ai/blog/video-ad-hooks), [seo-day.de](https://www.seo-day.de/news/article/how-to-build-curiosity-into-high-performing-social-ads?lang=en), [lottiefiles.com](https://lottiefiles.com/blog/design-inspiration/the-key-advantages-of-kinetic-typography-in-design), [thedrum.com](https://www.thedrum.com/news/2025/02/25/duolingo-s-tiktok-mastermind-its-unhinged-social-strategy-and-killing-its-mascot), [socialsamosa.com](https://www.socialsamosa.com/experts-speak/fuss-about-unhinged-marketing-4488283), [eathealthy365.com: Monkey app history](https://eathealthy365.com/the-history-of-the-monkey-app/).
