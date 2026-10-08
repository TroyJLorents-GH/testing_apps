# Decisions

One line each. The brief came with no attachments, and the clarifying questions were skipped, so these calls were made to keep moving.

## Assets and truth
- **Shoe photo.** No photo was attached. Used `public/assets/examples/eval-shoe-before.jpg` from useknockout/landing-page, the shoe useknockout.com already uses as its example (the real Design Studio capture names it `original-shoe.jpg`). **Rights flag:** it shows Nike and Air Jordan trademarks and a Craiyon generator watermark (bottom right). Kept unaltered, as the brief requires the original appearance. Swap in an owned, unbranded photo before publishing (see README, "Swap the product").
- **Cutout.** Used `eval-shoe-after.png`, the real UseKnockout /remove output paired with that photo. It is pixel-aligned with the original (mean RGB difference 0.51 inside the subject), so "same shoe, same position" is literally true.
- **Studio shot.** The network blocks useknockout.com and the API, so no live export was possible. `tools/make_assets.py` runs the /studio-shot compositing code copied from useknockout/api `main.py` (tight crop, centered on #FFFFFF, padding 48, shadow offset 8,12 / blur 14 / opacity 0.35, 1:1) on the real cutout. The despill pre-pass (`_clean_foreground`) is not replicated.
- **PSD.** No export was supplied, and the brief says to inspect one before depicting it. Ran the production encoder (`_encode_psd`) on the real cutout and re-opened the result with psd-tools 1.24: **one layer, "Cutout", transparent pixel layer, 1024 × 1024**. The film shows exactly that. The public docs claim a second "background" layer. The code does not write one, so the film follows the code (filed as a separate task).
- **Core idea copy.** The brief's "layers you can still edit" became "on its own layer, still editable", because the export has one layer.
- **Studio setting.** Shown as the real /studio-shot output (white backdrop and soft shadow), not an invented photographic set.
- **Editing shown.** Selecting the layer and moving or scaling it on a transparent canvas, both supported by a transparent pixel layer. No masks, adjustment layers or extra layers.

## Copy
- **Step names and descriptions** are the Design Studio tool labels and blurbs verbatim from `lib/workspace/tools.ts`: Remove Background, Studio Shot, Photoshop File.
- **CTA URL.** The brief said `useknockout.com/playground`, but Design Studio lives at `/workspace` (TopNav: "Design Studio" -> /workspace), and the playground has no studio shot or PSD tools. Used **"Try the Design Studio at useknockout.com/workspace"**. One string in `timeline.js` (STEPS.cta and CAPTIONS[4]) switches it back.
- **No pricing, speed or quota claims** anywhere. The real capture shows "Free" and a usage meter as captured UI. Nothing is added.
- **Plain voice, no em dashes**, per the landing-page CLAUDE.md.

## Interface
- **Design Studio capture.** The only real captures (`public/assets/canvas/*.png`) show other compositions, not this flow. Used `effects.png` once, in the 16:9 CTA, as "where you do this". The toolbar's real key prefix `kno_live_dLL…` was replaced with **"Workspace · Demo Shop"** (fictional).
- **9:16 CTA.** No capture in the Reel: there is no room for it inside the safe zones without crowding the product.
- **Layers panel.** A neutral panel, not Photoshop's UI, to avoid imitating Adobe's interface. It lists only what the file holds.

## Sound
- **No voiceover.** ElevenLabs is connected, but it spends credits and needs approval. The no-cost route is a procedural score plus sound design, rendered offline (deterministic). Captions carry the narrative line. A VO can be added later and the captions re-timed.
- **No ducking**, since there is no voice. Loudness is normalized in two passes, linear mode, to about -16 LUFS / under -1.5 dBTP.
- **120 BPM**, so every scene boundary (5, 11, 19, 26 s) lands on a beat.

## Picture
- **30 fps with 8-sub-frame motion blur** (180-degree shutter) instead of 60 fps. It halves render time on a CPU-only container and suits product motion.
- **1080p masters** (1920×1080 and 1080×1920), no 4K. The source photo is 1024 px and the studio shot 679 px, so 4K would only upscale.
- **Studio state upscales the shot 1.12-1.15×** to fill the frame. This is acceptable at viewing size and noted for QA.
- **9:16 is recomposed, not cropped:** a stacked layout, with text inside the top 14% / bottom 20% / right 12% safe zones.
