# Pipeline and render engineering

## Choose the route
Choose by fidelity, editability, continuity, turnaround and cost. The routes complement each other, and none is mandatory.

| Need | Route |
|---|---|
| Exact type, UI, logos, charts, diagrams | HTML/CSS/SVG + GSAP (default; `scripts/render.mjs`) |
| A hosted, shareable project or cloud render | HyperFrames (HeyGen) or Remotion, if installed or connected |
| Genuinely spatial shots (real depth, materials) | Three.js in the same composition (seeded, time-driven), or Blender |
| Cinematic footage, environments, organic motion | Generative video, **with approval**. Composite exact text and branding on top as controlled layers |
| Finishing, conversion, media checks | ffmpeg (`scripts/qa.mjs`) |

Generative passes never carry exact text, logos or product UI. Inspect generated footage for anatomy, physics, temporal consistency and stray lettering. Record the model, prompt and seed in `DECISIONS.md` as provenance.

Default to local or already-authorized no-cost tools. The no-cost default is not a quality ceiling. If it compromises the brief, propose a costed premium route.

## Render contract (HTML route)
- `window.__composition = { duration, fps, width, height }`. `width` and `height` are the CSS layout size.
- `window.__ready` is a Promise that resolves after `document.fonts.ready`, image decode and audio decode.
- `window.seek(t)` paints the frame at t. It calls `master.seek(t, false)` on a **single paused** GSAP timeline.
- All state derives from t. Particles and noise use a seeded PRNG keyed by frame index (`Math.floor(t * fps + 1e-6)`). Canvas and WebGL redraw fully on each seek.
- Pitfalls in GSAP seek mode:
  - A `fromTo` shows its from-state for all t before it starts. Use `set` plus `to` when an element must be invisible before then.
  - `onUpdate` side effects do not run on seeks before the tween starts, so set that state explicitly in `seek`.
  - Avoid `onComplete`-driven logic.
- Load GSAP and its plugins from local `node_modules` with a pinned version (all plugins are free: SplitText, Flip, MorphSVG, DrawSVG, MotionPath, CustomEase).

## Frame rate
Choose it on purpose. 60 fps for UI and fast motion. 24 or 25 fps for a cinematic feel (pair it with motion blur). 30 fps for broadcast and social where required. Never let the timing become variable. Convert frame rates deliberately and keep the audio duration matched.

## Quality levers in `render.mjs`
- `--blur N`: temporal motion blur. Each output frame averages N sub-frames across the shutter (`--shutter 180` by default). Averaging happens in linear light so trails do not darken. It is adaptive: if the first and last sub-frames match, the frame is still and is rendered only once. Use 8 for UI and 12-16 for fast camera moves.
- `--scale 2`: lays out at 1920x1080 CSS px and rasterizes at 3840x2160. Text and vectors stay sharp. Downscale with Lanczos for 1080p cuts.
- `--verify`: renders probe frames twice with different seek histories and fails if the pixels differ.
- `--from` / `--to`: render segments. Concatenate with `ffmpeg -f concat -safe 0 -i list.txt -c copy` when the encode settings match.
- Preview: `--scale 0.5` with no blur, about 10x faster. Full quality goes only on segments that passed G2.

Rendering cost scales with the number of moving frames times N. Run a quick preview and estimate before a full 4K render. Without a GPU, expect about 1 s per sub-frame at 1080p.

## Color and encoding
- swscale converts RGB to YUV with **BT.601 by default**, which shifts colors against the browser. Always convert with `scale=out_color_matrix=bt709:out_range=tv` and tag `-colorspace bt709 -color_primaries bt709 -color_trc bt709`. `render.mjs` does this.
- Prevent banding with grain or dither before the 8-bit output. Masters are 10-bit.
- Encode recipes:
  - **Master:** ProRes 4444 (`--codec prores`, `yuv444p10le`, or `yuva444p10le` with `--alpha`), or x265 10-bit (`--codec h265`, crf 14).
  - **Delivery:** x264 crf 16, preset slow, yuv420p, `+faststart`.
  - **Web hero:** an x264 or AV1 (libsvtav1) MP4 plus a WebM fallback, under about 4 MB for 6-10 s, a poster image, and `muted playsinline loop`.
- H.264 MP4 cannot carry alpha. For transparency use ProRes 4444, a PNG sequence, or VP9 WebM with alpha, and test real playback in the target.
- Use HDR only when both the pipeline and the destination support it end to end.
- Inspect gradients, premultiplied edges, scaling, temporal aliasing and texture shimmer **in motion**, not only in stills.

## Recompositions
Recompose 9:16 and 1:1 from the same timeline with a different layout token set; do not crop the 16:9. On 9:16, keep text out of the platform UI zones (top 14%, bottom 20%, right 12%).

## Web heroes (only when requested)
Provide the loop or scroll-mapped animation plus a static poster, responsive crops, a lazy-loading strategy, `prefers-reduced-motion` behavior and a playback fallback. Do not build a website just because the video could live on one.

## Reproducibility
Record the pinned versions of Chromium, Playwright, GSAP, fonts, ffmpeg and any model or service in the README. Re-renders in the same pinned environment should match. Do not promise pixel identity across platforms, GPUs, codecs or generative services.
