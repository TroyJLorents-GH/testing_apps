# premium-motion

A Claude Code skill that runs a full motion studio: brief → concept → styleframes → animatic → build → craft pass → sound → verified render.

```
/plugin install premium-motion --marketplace troyjlorents-gh/testing_apps
```

- **Skill:** `skills/premium-motion/SKILL.md`, with 6 laws, overridable defaults, and a 10-step workflow with 3 quality gates. Detail lives in `references/` (craft, story, pipeline, sound, QA).
- **Renderer:** `scripts/render.mjs`. Seeks an HTML page frame by frame in headless Chromium. Adaptive temporal motion blur averaged in linear light, `--scale 2` supersampling, a determinism probe, segments, h264 / h265 10-bit / ProRes 4444 with alpha / PNG output, and BT.709-correct color conversion.
- **QA:** `scripts/qa.mjs`. Checks frame rate, resolution, duration, color tags, loudness and true peak, audio/video sync, freezes, black frames and flashes. Writes a contact sheet and `qa.json`, and exits non-zero on failure.
- **Starter:** `templates/composition/`, a GSAP master timeline behind `window.seek(t)`, with tokens, seeded grain, a cursor click and a counter.

```bash
cd skills/premium-motion/templates/composition && npm i
npm run render   # 1080p60, motion blur, determinism probe
npm run qa
```

Needs Node 18+, ffmpeg (with zscale and libx264), and Playwright with Chromium.

Based on the "Explainer Motion Studio" prompt by @0xCarnagee, which draws on public talks by Meaghan Choi. Not written or endorsed by her.
