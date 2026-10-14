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
- **Final caption / VO line** is the brief's core idea, "One photo. Store-ready, and still editable.", so the CTA isn't said three times. The URL stays on screen in the pill.
- **"Straight from the camera roll" removed:** the photo is clearly staged.
- **CTA URL.** The brief said `useknockout.com/playground`, but Design Studio lives at `/workspace` (TopNav: "Design Studio" -> /workspace), and the playground has no studio shot or PSD tools. Used **"Try the Design Studio at useknockout.com/workspace"**. Switch it back in `timeline.js` (STEPS.cta).
- **No pricing, speed or quota claims** anywhere.
- **Plain voice, no em dashes**, per the landing-page CLAUDE.md.

## Interface
- **Design Studio capture cut after review.** The only real captures (`public/assets/canvas/*.png`) show other compositions: a blue duotone shoe and a "NEW FEATURE" banner. At CTA size the UI text was unreadable, and a second product image muddied the ending. The patched capture (`screens/design-studio.png`, real key prefix replaced with "Workspace · Demo Shop") is kept for when a capture of this flow exists. Product imagery throughout is still the real output.
- **Layers panel.** A neutral panel, not Photoshop's UI, to avoid imitating Adobe's interface. It lists only what the file holds.

## Sound
- **Voice: Hope, upbeat and clear** (`tnSpp4vdxKPjI9w0GnoV`), chosen by Troy, ElevenLabs `eleven_v4`. Four takes (1,252 credits). Picked take 3 (`wx6hSjd6P901t8WmnHNl`): all four had smooth envelopes, and take 3 leaves the most room at the end (closing line 3.32 s, ends 29.62 s). Hope reads slower than Dior, so line 5 fills its window to within 0.18 s.
- **Earlier voice (kept as the alternate):** Dior: Crisp, Confident, Modern, Global (`4XLp6ou1JHGgf9xXbHCM`), take `1oAGswlA3SOQra32CiPz`, in `audio/vo_take_dior.mp3`. Copy it over `audio/vo_take.mp3` and run `tools/remux.sh` to switch back.
- **One continuous take**, with `[warmly]` at the top, `[confident]` on the last line, and `[long pause]` between lines. One read keeps the delivery consistent; the pauses give clean cut points.
- **Dior take choice (for the record):** take 1 of 4. Take 2's -1.5 dB peak was a hard onset on "One photo"; take 3 also had spiky onsets.
- **Script tightened for the ear.** Line 4 lost "still editable" and line 5 became "One photo. Store-ready, and still editable." so the close no longer repeats lines 3 and 4. Captions are the script word for word, so the picture was re-rendered.
- **Placement** (`tools/place_vo.mjs`): the take is split at its silences into exactly 5 lines (the build fails otherwise). Each line starts 0.1 s after its caption and must finish before the caption ends. Line 2 starts as the background wipe starts; line 4's "own layer" lands around the moment the layer is selected; line 5 lands on the CTA.
- **VO chain:** 80 Hz high-pass, light de-ess, 2.5:1 compression, -17 LUFS stem (`audio/vo.wav`).
- **Ducking:** the score bed sits about 9 LU under the voice, and the sidechain ducks it a further **6.5 dB** under Hope (8.0 dB under Dior; both measured, within the 6-9 dB target; the first setting gave 12.3 dB and buried the bed). 150 ms attack, 400 ms release.
- **Master:** a peak limiter before mastering keeps the two-pass loudnorm in linear mode. Final (Hope): -16.1 LUFS, -3.3 dBTP.
- **Captions** end about 1 s after each spoken line (they had held up to 4 s past the speech), and still hold at least 0.4 s + 0.3 s per word.
- **Picture untouched by the voice swap:** `tools/remux.sh` stream-copies the rendered segments and replaces only the audio.
- **Not verified:** an independent word-for-word check of the take. ElevenLabs' transcription returned the script itself (tags included) aligned to the audio, so it proves timing, not words. Local ASR models could not be downloaded (Hugging Face, Whisper and Vosk model hosts are blocked here). **Listen once before publishing**, especially to "PSD".
- **Rights:** commercial use of a library voice depends on the ElevenLabs plan. Confirm the account's plan covers ads.
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
