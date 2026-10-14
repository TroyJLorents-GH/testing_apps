#!/usr/bin/env bash
# Audio-only rebuild: re-place the VO, re-mix, and remux onto the already-rendered picture segments.
# Use when only audio/vo_take.mp3 (or the mix) changed. Needs out/seg_*.mp4 from a previous tools/build.sh.
set -euo pipefail
cd "$(dirname "$0")/.."
R=../premium-motion/skills/premium-motion/scripts
[ -f audio/score_raw.wav ] || node tools/render_audio.mjs
node tools/place_vo.mjs
for name in useknockout_16x9 useknockout_9x16; do
  ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i out/seg_${name}.txt -i audio/mix.wav \
    -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -movflags +faststart out/${name}.mp4
  ffmpeg -hide_banner -loglevel error -y -i out/${name}.mp4 -c:v libx264 -preset slower -crf 23 -pix_fmt yuv420p \
    -colorspace bt709 -color_primaries bt709 -color_trc bt709 -c:a aac -b:a 160k -movflags +faststart out/${name}_web.mp4
done
node $R/qa.mjs out/useknockout_16x9.mp4 --fps 30 --width 1920 --height 1080 --duration 30 --report out/qa_16x9.json --contact out/contact_16x9.png
node $R/qa.mjs out/useknockout_9x16.mp4 --fps 30 --width 1080 --height 1920 --duration 30 --report out/qa_9x16.json --contact out/contact_9x16.png
cp out/useknockout_16x9_web.mp4 out/useknockout_9x16_web.mp4 out/qa_16x9.json out/qa_9x16.json deliverables/
