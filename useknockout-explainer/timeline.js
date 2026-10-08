// Single source of truth for timing: motion (main.js), sound cues (audio.js) and captions (tools/make_srt.mjs).
// A plain script that sets globalThis.TL: Chromium blocks ES modules over file://, and Node can still import it.
(() => {
const FPS = 30
const DURATION = 30

// Scene boundaries follow the brief's story sequence.
const S = { intro: 0, remove: 5, studio: 11, psd: 19, cta: 26, end: 30 }

// Key actions, in seconds. Sound cues land on these.
const K = {
  photoIn: 0.3,
  scanStart: 5.8, scanEnd: 7.6,
  toStudio: 11.6, toStudioEnd: 13.2, shadowIn: 13.2, exactSwap: 13.8,
  splitIn: 14.8, splitSet: 15.9, splitOut: 18.1,
  toPsd: 19.4, toPsdEnd: 20.6, panelIn: 20.8, rowSelect: 21.8, layerMove: 22.6, layerMoveEnd: 23.6, layerBack: 24.0, layerBackEnd: 25.0,
  toFinal: 26.0, ctaIn: 26.7,
}

// Burned-in captions and captions.srt. Each holds >= 0.4 s + 0.3 s per word.
const CAPTIONS = [
  { start: 0.6, end: 4.8, text: 'A great product deserves a better photo.' },
  { start: 5.4, end: 10.8, text: 'Remove the background. Same shoe, same angle.' },
  { start: 11.4, end: 18.8, text: 'Then place it on a clean studio backdrop, ready for your store.' },
  { start: 19.4, end: 25.8, text: 'Export a PSD with the shoe on its own layer, still editable.' },
  { start: 26.2, end: 29.8, text: 'One photo, ready for your store, still editable.' },
]

// On-screen step copy: tool labels as they appear in Design Studio (lib/workspace/tools.ts). No subheads: captions carry the line.
const STEPS = {
  intro: { label: 'Your product photo', title: 'Great shoe.\nBusy photo.' },
  remove: { label: '01 · Remove Background', title: 'Remove\nBackground' },
  studio: { label: '02 · Studio Shot', title: 'Studio Shot' },
  psd: { label: '03 · Photoshop File', title: 'Photoshop File' },
  cta: { label: 'useknockout', title: 'Try the\nDesign Studio', blurb: 'useknockout.com/workspace' },
}

// Layout tokens per ratio (CSS px). 9:16 keeps text inside the platform safe zone (top 14%, bottom 20%, right 12%).
const LAYOUTS = {
  '16x9': {
    w: 1920, h: 1080,
    frame: { x: 180, y: 130, size: 780 },
    col: { x: 1080, y: 286, w: 680 },
    type: { label: 22, title: 76, blurb: 30, caption: 34 },
    caption: { cx: 960, bottom: 52, maxW: 1400 },
    capture: null, // cut: the only real captures show unrelated compositions, unreadable at CTA size
    panel: { x: 1080, y: 440, w: 560 },
  },
  '9x16': {
    w: 1080, h: 1920,
    frame: { x: 160, y: 580, size: 760 },
    col: { x: 96, y: 290, w: 840 },
    type: { label: 26, title: 66, blurb: 30, caption: 34 },
    caption: { cx: 520, bottom: 430, maxW: 800 },
    capture: null,
    panel: { x: 470, y: 598, w: 436 },
  },
}

globalThis.TL = { FPS, DURATION, S, K, CAPTIONS, STEPS, LAYOUTS }
})()
