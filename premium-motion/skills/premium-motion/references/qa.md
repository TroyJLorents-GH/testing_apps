# Verification

## Gates
- **G1 (styleframes):** hierarchy, type, contrast, the signature look, and readability at 100% and at 390 px wide.
- **G2 (animatic):** rhythm, reading time, transitions, VO and beat sync at full speed, and the risk shot proven in motion.
- **G3 (final media):** everything below, run on the exported files.

## Automated (must pass)
```bash
node scripts/render.mjs index.html --out out/master.mp4 --blur 8 --verify
node scripts/qa.mjs out/master.mp4 --fps 60 --width 1920 --height 1080 --duration <s> [--lufs -16 --tp -1.5]
```
`qa.mjs` checks frame rate and that it is constant, resolution, duration, BT.709 tags, pixel format, integrated loudness, true peak, audio/video duration match, holds longer than 3 s (warning), black frames (warning) and flashes (WCAG 2.3.1 approximation). It writes `out/qa.json` and `out/contact.png`. Run it on every cut.

Also check with the source:
- On-screen text holds for at least its reading time (0.4 s + 0.3 s per word). Compute this from the timeline.
- No moment has more than one focal action. Read it off the shot list and timeline.
- Text contrast is at least 4.5:1. Sample text and background colors from frames.
- 9:16 and 1:1 text stays inside the safe areas. Overlay the safe-zone guides on stills.
- Sound cues are within 1 frame of their timeline action.

## Human-style review
Inspect the actual export:
- Read the contact sheet, then view a still at every beat, every transition, the first and last frame, and every technically hard sequence.
- Play at full speed and at 0.25x. Look for jitter, popping, temporal aliasing, shimmer, duplicated frames and blur artifacts.
- Watch muted for visual clarity, then listen audio-only for sonic coherence: pronunciation, music edits, clicks, balance and intelligibility.
- Check product accuracy, spelling, claims against `SOURCES.md`, crop safety and loop seams.

## Rubric (reviewer subagent, 1-5 each)
1. **Idea clarity:** the one takeaway is unmistakable
2. **Specificity:** it passes the logo-swap test and has a memorable signature sequence
3. **Timing and rhythm:** overlap, holds and beat sync
4. **Motion quality:** easing, anticipation, settle, motion blur
5. **Typography and layout:** hierarchy, readability, detail at 100%
6. **Depth and light:** layers, shadows, focus, consistency
7. **Sound:** sync, mix, loudness, intelligibility
8. **Restraint:** nothing that does not serve the idea

Anything below 4 gets a concrete fix, a re-render of the affected segment, and a re-check of that segment and its neighboring transitions. Each fix gets a before/after frame pair in `out/fixes/`. Stop after 3 rounds or when everything scores 4 or higher, and log anything left over.

## Reporting
State what was rendered, what was checked (paste the `qa.json` results and the loudness numbers), and what was not verified, with the reason. Never claim that source-only work was rendered, and never hide a blocker behind endless polish.
