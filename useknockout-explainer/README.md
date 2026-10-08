# UseKnockout explainer

A 30-second explainer: one ordinary product photo becomes a clean cutout, then a studio shot, then a PSD with the shoe on its own layer. It ends on "Try the Design Studio". Built with the `premium-motion` skill in this repo.

## Deliverables (`out/`)
| File | What |
|---|---|
| `useknockout_16x9.mp4` | 1920×1080, 30 fps, H.264 + AAC, captions burned in (homepage) |
| `useknockout_9x16.mp4` | 1080×1920 recomposition for Reels, text inside the platform safe zones |
| `captions.srt` | the same captions, timed from `timeline.js` |
| `contact_16x9.png`, `contact_9x16.png` | 24-frame contact sheets |
| `qa_16x9.json`, `qa_9x16.json` | automated QA results |

## Reproduce
```bash
npm ci
PY=python3 ./tools/build.sh      # assets -> score -> captions -> renders -> mux -> QA
```
This needs Node 18+, ffmpeg with zscale and libx264, Playwright with Chromium, and Python with `pillow numpy psd-tools>=1.11`. The renderer and QA scripts come from `../premium-motion/skills/premium-motion/scripts/`. Tool versions used: Chromium 1194 (Playwright 1.56.1), GSAP 3.13.0, @fontsource/inter and jetbrains-mono 5.2.5, ffmpeg 6.1.1, psd-tools 1.24.0.

## How it is built
- **`timeline.js`** is the one source of truth: scene times, key actions, captions, on-screen copy, and layout tokens per ratio.
- **`main.js`** builds the scene and one paused GSAP timeline; `window.seek(t)` paints frame t. It is used by `index.html` (16:9) and `reel.html` (9:16).
- **`audio.js`** is the procedural score and sound design (OfflineAudioContext, seeded). `tools/render_audio.mjs` renders it and loudness-normalizes it to `audio/mix.wav`.
- **`tools/make_assets.py`** builds the studio shot and PSD from the real cutout using UseKnockout's production code, and checks alignment.
- **`tools/prep_brand.py`** trims the logo and patches fictional account details into the Design Studio capture.

## Swap the product
Replace `assets/original.jpg` and `assets/cutout.png` with your own photo and its real UseKnockout /remove output (same size, pixel-aligned), then run `tools/build.sh`. Everything downstream (studio framing, PSD, animation geometry) is recomputed. If you have real /studio-shot and /psd exports, drop them in as `assets/studio-shot.png` and `assets/shoe.psd`, and skip the replica step.

## What was verified, and what wasn't
See `DECISIONS.md` for every call made, and `SOURCES.md` for where each label and image comes from. QA numbers are in `out/qa_*.json`.

**Not verified:** a live /studio-shot or /psd export, because the container's network blocks useknockout.com and the API. Both outputs here come from the production code run locally. Check one real PSD export before publishing, because the public docs and the encoder disagree on the layer count.
