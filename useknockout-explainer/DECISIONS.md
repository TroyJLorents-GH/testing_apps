# Decisions

One line each. The brief came with no attachments, and the clarifying questions were skipped, so these calls were made to keep moving.

## Assets and truth
- **Shoe photo.** No photo was attached. Used `public/assets/examples/eval-shoe-before.jpg` from useknockout/landing-page, the shoe useknockout.com already uses as its example (the real Design Studio capture names it `original-shoe.jpg`). **Rights flag:** it shows Nike and Air Jordan trademarks and a Craiyon generator watermark (bottom right). Kept unaltered, as the brief requires the original appearance. Swap in an owned, unbranded photo before publishing (see README, "Swap the product").
- **Cutout.** Used `eval-shoe-after.png`, the real UseKnockout /remove output paired with that photo. It is pixel-aligned with the original (mean RGB difference 0.51 inside the subject), so "same shoe, same position" is literally true.
- **Studio shot.** The network blocks useknockout.com and the API, so no live export was possible. `tools/make_assets.py` runs the /studio-shot compositing code copied from useknockout/api `main.py` (tight crop, centered on #FFFFFF, padding 48, shadow offset 8,12 / blur 14 / opacity 0.35, 1:1) on the real cutout. The despill pre-pass (`_clean_foreground`) is not replicated.
- **PSD.** No export was supplied, and the brief says to inspect one before depicting it. Ran the production encoder (`_encode_psd`) on the real cutout and re-opened the result with psd-tools 1.24: **one layer, "Cutout", transparent pixel layer, 1024 × 1024**. The film shows exactly that. The public docs claim a second "background" layer. The code does not write one, so the film follows the code (filed as a separate task).
- **Core idea copy.** The brief's "layers you can still edit" became "still editable" / "on its own layer", because the export has one layer.
- **Studio setting.** Shown as the real /studio-shot output (white backdrop and soft shadow), not an invented photographic set.
- **Editing shown.** Selecting the layer and moving or scaling it on a transparent canvas, both supported by a transparent pixel layer. No masks, adjustment layers or extra layers.

## Copy
- **Step names** are the Design Studio tool labels, verbatim from `lib/workspace/tools.ts`: Remove Background, Studio Shot, Photoshop File.
- **Subheads dropped after review.** They repeated the captions, and the PSD blurb ("layered PSD") sat next to "1 layer". The captions carry the line.
- **Final caption** is the brief's core idea, "One photo, ready for your store, still editable.", so the CTA isn't said three times. The URL stays on screen in the pill.
- **"Straight from the camera roll" removed:** the photo is clearly staged.
- **CTA URL.** The brief said `useknockout.com/playground`, but Design Studio lives at `/workspace` (TopNav: "Design Studio" -> /workspace), and the playground has no studio shot or PSD tools. Used **"Try the Design Studio at useknockout.com/workspace"**. Switch it back in `timeline.js` (STEPS.cta).
- **No pricing, speed or quota claims** anywhere.
- **Plain voice, no em dashes**, per the landing-page CLAUDE.md.

## Interface
- **Design Studio capture cut after review.** The only real captures (`public/assets/canvas/*.png`) show other compositions: a blue duotone shoe and a "NEW FEATURE" banner. At CTA size the UI text was unreadable, and a second product image muddied the ending. The patched capture (`screens/design-studio.png`, real key prefix replaced with "Workspace · Demo Shop") is kept for when a capture of this flow exists. Product imagery throughout is still the real output.
- **Layers panel.** A neutral panel, not Photoshop's UI, to avoid imitating Adobe's interface. It lists only what the file holds.

## Sound
- **No voiceover.** ElevenLabs is connected, but it spends credits and needs approval. The no-cost route is a procedural score plus sound design, rendered offline (deterministic). Captions carry the narrative line. A VO can be added later and the captions re-timed.
- **No ducking**, since there is no voice. Loudness is normalized in two passes, linear mode, to about -16 LUFS / under -1.5 dBTP.
- **120 BPM**, so every scene boundary (5, 11, 19, 26 s) lands on a beat.

## Picture
- **30 fps with 8-sub-frame motion blur** (180-degree shutter) instead of 60 fps. It halves render time on a CPU-only container and suits product motion.
- **1080p masters** (1920×1080 and 1080×1920), no 4K. The source photo is 1024 px and the studio shot 679 px, so 4K would only upscale.
- **Studio states shrink the frame** to 679/780 (16:9) and 679/760 (9:16), so the studio shot displays at exactly 1:1 pixels. No upscaling softness.
- **9:16 is recomposed, not cropped:** a stacked layout, with text inside the top 14% / bottom 20% / right 12% safe zones.

## Review round 1 (independent reviewer agent, frames from the v1 export)
- **Fixed:** the before/after edge lagged the handle mid-move. Root cause: the line entered from the right while the before image grew from the left, so the two only met once settled. The line now enters and exits on the left. Also replaced a `calc()` in the tweened clip-path. `tools/checks/wipe_alignment.mjs` measures edge against line at 0.15-0.2 s steps in both ratios: worst gap 0.02 px.
- **Fixed:** labels collided at scene changes. Incoming labels now start after the outgoing column is gone.
- **Fixed:** the PSD facts were the smallest text on screen. The panel and tags are about 35% larger; in 9:16 the panel floats inside the document above the shoe.
- **Fixed:** captions zoomed with the final camera push. They now sit outside the camera.
- **Fixed:** 9:16 content sat right at the safe-zone edge. Captions now end at 85% width / 77.6% height.
- **Not changed:** "the shadow reads like a sticker". That is the real /studio-shot output (offset 8,12, blur 14, 35%). Drawing a nicer shadow would misrepresent the product.
- **Not changed:** "the before/after is stock". The brief prescribes these beats; specificity comes from the real cutout, the real studio output and the real PSD structure.
