#!/usr/bin/env bash
# Reproduce everything: assets -> audio -> captions -> both renders -> mux -> QA.
# Needs: python3 with pillow numpy psd-tools, node 18+, ffmpeg (zscale, libx264), Playwright + Chromium.
set -euo pipefail
cd "$(dirname "$0")/.."
PY=${PY:-python3}
R=../premium-motion/skills/premium-motion/scripts
BLUR=${BLUR:-8}

$PY -I tools/make_assets.py
$PY -I tools/prep_brand.py
node -e "const j=require('fs').readFileSync('assets/layout.json','utf8');require('fs').writeFileSync('assets/layout.js','// Generated from layout.json by tools/build.sh\nglobalThis.LAYOUT = '+j.trim()+'\n')"
[ -d node_modules ] || npm ci --silent
node tools/render_audio.mjs
mkdir -p out && node tools/make_srt.mjs > /dev/null

render() { # page name: two segments in parallel, then concat
  local page=$1 name=$2
  node $R/render.mjs $page --out out/seg_${name}_a.mp4 --from 0 --to 15 --blur $BLUR --verify &
  node $R/render.mjs $page --out out/seg_${name}_b.mp4 --from 15 --to 30 --blur $BLUR &
  wait
  printf "file 'seg_%s_a.mp4'\nfile 'seg_%s_b.mp4'\n" $name $name > out/seg_${name}.txt
  ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i out/seg_${name}.txt -i audio/mix.wav \
    -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -movflags +faststart out/${name}.mp4
}
render index.html useknockout_16x9 &
render reel.html useknockout_9x16 &
wait

node $R/qa.mjs out/useknockout_16x9.mp4 --fps 30 --width 1920 --height 1080 --duration 30 --report out/qa_16x9.json --contact out/contact_16x9.png
node $R/qa.mjs out/useknockout_9x16.mp4 --fps 30 --width 1080 --height 1920 --duration 30 --report out/qa_9x16.json --contact out/contact_9x16.png

# Web encodes for the homepage and Reel upload (about 5 MB each), plus a committed copy of the deliverables.
for f in useknockout_16x9 useknockout_9x16; do
  ffmpeg -hide_banner -loglevel error -y -i out/$f.mp4 -c:v libx264 -preset slower -crf 23 -pix_fmt yuv420p \
    -colorspace bt709 -color_primaries bt709 -color_trc bt709 -c:a aac -b:a 160k -movflags +faststart out/${f}_web.mp4
done
mkdir -p deliverables
cp out/useknockout_16x9_web.mp4 out/useknockout_9x16_web.mp4 out/captions.srt out/qa_16x9.json out/qa_9x16.json deliverables/
ffmpeg -hide_banner -loglevel error -y -i out/contact_16x9.png -vf scale=1600:-1 deliverables/contact_16x9.png
ffmpeg -hide_banner -loglevel error -y -i out/contact_9x16.png -vf scale=1600:-1 deliverables/contact_9x16.png
