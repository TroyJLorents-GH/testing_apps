// UseKnockout explainer: one product photo -> cutout -> studio shot -> PSD.
// Every frame is a pure function of t: window.seek(t) drives one paused GSAP timeline.
;(() => {
  const { FPS, DURATION, S, K, CAPTIONS, STEPS, LAYOUTS } = TL
  const G = LAYOUT // product geometry measured by tools/make_assets.py
  const L = LAYOUTS[window.RATIO || '16x9']
  const E = { enter: 'expo.out', exit: 'power2.in', move: 'power3.inOut', soft: 'power2.inOut' }

  Object.assign(document.documentElement.style, { width: `${L.w}px`, height: `${L.h}px` })
  Object.assign(document.body.style, { width: `${L.w}px`, height: `${L.h}px` })
  window.__composition = { duration: DURATION, fps: FPS, width: L.w, height: L.h }

  const el = (tag, cls, parent, props = {}) => {
    const n = document.createElement(tag)
    if (cls) n.className = cls
    Object.assign(n, props)
    parent.appendChild(n)
    return n
  }
  const px = (n) => `${n}px`

  // ---------------------------------------------------------------- scene graph
  const stage = el('div', '', document.body, { id: 'stage' })
  const size = L.frame.size
  const frame = el('div', 'frame', stage)
  Object.assign(frame.style, { left: px(L.frame.x), top: px(L.frame.y), width: px(size), height: px(size) })

  const sP = size / G.image[0] // photo / PSD document scale (1024 px source)
  const sS = size / G.studio.size[0] // studio shot scale (679 px output)
  const photoT = { x: 0, y: 0, scale: sP }
  const studioT = { x: (G.studio.paste[0] - G.subject[0]) * sS, y: (G.studio.paste[1] - G.subject[1]) * sS, scale: sS }
  // clip-path insets are in the image's own (unscaled) pixels: convert a frame x into a % of the image width.
  // In the studio states the whole frame scales so the 679 px studio shot shows at 1:1 pixels.
  const fStudio = Math.min(1, G.studio.size[0] / size)
  // No calc(): the browser simplifies it in computed style, so GSAP would pair mismatched numbers.
  const beforeClip = (frameX) => `inset(0% ${100 - ((frameX - studioT.x) / studioT.scale / G.image[0]) * 100}% 0% 0%)`

  el('div', 'checker', frame)
  const white = el('div', 'white', frame)
  const original = el('img', 'img', frame, { src: 'assets/original.jpg' })
  const shadow = el('img', 'studio-img', frame, { src: 'assets/studio-shadow.png' })
  const cutout = el('img', 'img', frame, { src: 'assets/cutout.png' })
  const studio = el('img', 'studio-img', frame, { src: 'assets/studio-shot.png' })
  const before = el('img', 'img', frame, { src: 'assets/original.jpg' })
  const scan = el('div', 'scan', frame)
  const split = el('div', 'split', frame)
  const sel = el('div', 'sel', frame)
  for (const [l, t] of [[0, 0], [1, 0], [0, 1], [1, 1]]) Object.assign(el('i', '', sel).style, { left: l ? 'auto' : '-6px', right: l ? '-6px' : 'auto', top: t ? 'auto' : '-6px', bottom: t ? '-6px' : 'auto' })

  const tag = (text, x, y, align = 'left') => {
    const n = el('div', 'tag', stage, { textContent: text })
    Object.assign(n.style, { top: px(L.frame.y + y), [align]: px(align === 'left' ? L.frame.x + x : L.w - L.frame.x - size + x) })
    return n
  }
  const fileTag = tag('original-shoe.jpg', 18, 18)
  const psdTag = tag(`shoe.psd · ${G.psd.size[0]} × ${G.psd.size[1]}`, 18, 18)
  const inTag = (text, side) => {
    const n = el('div', 'tag', frame, { textContent: text })
    Object.assign(n.style, { top: '18px', left: side === 'left' ? '18px' : 'auto', right: side === 'right' ? '18px' : 'auto' })
    return n
  }
  const beforeTag = inTag('Before', 'left')
  const afterTag = inTag('After', 'right')

  // Text columns, one per step. Titles reveal line by line behind a mask.
  const cols = {}
  for (const [key, step] of Object.entries(STEPS)) {
    const col = el('div', 'col', stage)
    Object.assign(col.style, { left: px(L.col.x), top: px(L.col.y), width: px(L.col.w), opacity: 0 })
    let label
    if (key === 'cta') {
      label = el('img', 'logo', col, { src: 'brand/logo-trim.png' })
      label.style.height = px(L.type.label * 2.6)
    } else {
      label = el('div', 'label', col, { textContent: step.label })
      label.style.fontSize = px(L.type.label)
    }
    const title = el('div', 'title', col)
    title.style.fontSize = px(L.type.title)
    const lines = step.title.split('\n').map((t) => el('span', '', el('span', 'line', title), { textContent: t }))
    const blurb = el('div', key === 'cta' ? 'url' : 'blurb', col, { textContent: step.blurb || '' })
    blurb.style.fontSize = px(key === 'cta' ? L.type.blurb * 0.95 : L.type.blurb)
    if (key === 'cta') blurb.style.marginTop = '26px'
    if (!step.blurb) blurb.style.display = 'none'
    cols[key] = { col, label, lines, blurb }
  }

  // PSD layers panel: exactly what the real export holds (see assets/layout.json -> psd.layers).
  const panel = el('div', 'panel', stage)
  Object.assign(panel.style, { left: px(L.panel.x), top: px(L.panel.y), width: px(L.panel.w) })
  const head = el('div', 'head', panel)
  el('span', '', head, { textContent: 'Layers' })
  el('span', '', head, { textContent: `${G.psd.layers.length} layer` })
  const row = el('div', 'row', panel)
  const hl = el('div', 'hl', row)
  el('img', '', el('div', 'thumb', row), { src: 'assets/cutout.png' })
  const name = el('div', '', row)
  el('div', '', name, { textContent: G.psd.layers[0].name })
  el('div', 'meta', name, { textContent: 'transparent pixel layer' })
  row.insertAdjacentHTML('beforeend', '<svg class="eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>')

  // Real Design Studio capture (fictional workspace patched in), 16:9 only.
  let capture = null
  if (L.capture) {
    capture = el('div', 'capture', stage)
    Object.assign(capture.style, { left: px(L.capture.x), top: px(L.capture.y), width: px(L.capture.w) })
    const bar = el('div', 'bar', capture)
    el('b', '', bar); el('b', '', bar); el('b', '', bar)
    el('span', 'cap-label', bar, { textContent: 'Design Studio' })
    el('img', '', capture, { src: 'screens/design-studio.png' })
  }

  const caps = CAPTIONS.map((c) => {
    const n = el('div', 'caption', document.body, { textContent: c.text }) // outside #stage: never zooms
    Object.assign(n.style, { left: px(L.caption.cx), bottom: px(L.caption.bottom), maxWidth: px(L.caption.maxW), fontSize: px(L.type.caption) })
    return n
  })

  // Seeded grain: a fixed noise tile, offset per frame.
  const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
  const tile = document.createElement('canvas'); tile.width = tile.height = 256
  const g = tile.getContext('2d'), img = g.createImageData(256, 256), r = rng(11)
  for (let i = 0; i < img.data.length; i += 4) { const v = 128 + (r() - 0.5) * 255; img.data.set([v, v, v, 255], i) }
  g.putImageData(img, 0, 0)
  const grain = el('div', 'grain', document.body)
  grain.style.backgroundImage = `url(${tile.toDataURL()})`

  // ------------------------------------------------------------- initial state
  gsap.set([original, before, cutout], photoT)
  gsap.set([shadow, studio], { x: 0, y: 0, scale: sS })
  gsap.set(cutout, { opacity: 0 })
  gsap.set(before, { ...studioT, clipPath: beforeClip(0) })
  gsap.set(original, { clipPath: 'inset(0% 0% 0% 0%)' })
  gsap.set(frame, { opacity: 0, y: 26, scale: 0.985 })

  // Layer-move demo: scale about the subject's centre, then nudge.
  const pc = [(G.subject[0] + G.subject[2]) / 2, (G.subject[1] + G.subject[3]) / 2]
  const moved = (k, dx, dy) => {
    const cx = photoT.x + sP * pc[0], cy = photoT.y + sP * pc[1]
    return { x: cx + dx - k * sP * pc[0], y: cy + dy - k * sP * pc[1], scale: k * sP }
  }
  const selBox = (t) => {
    const pad = 10
    return {
      x: t.x + t.scale * G.subject[0] - pad, y: t.y + t.scale * G.subject[1] - pad,
      width: t.scale * (G.subject[2] - G.subject[0]) + pad * 2, height: t.scale * (G.subject[3] - G.subject[1]) + pad * 2,
    }
  }
  gsap.set(sel, selBox(photoT))

  // ------------------------------------------------------------------ timeline
  const tl = gsap.timeline({ paused: true, defaults: { ease: E.enter, duration: 0.7 } })

  const colIn = (key, at) => {
    const c = cols[key]
    tl.set(c.col, { opacity: 1 }, at)
      .fromTo(c.label, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, immediateRender: false }, at)
      .fromTo(c.lines, { yPercent: 108 }, { yPercent: 0, stagger: 0.07, duration: 0.75, immediateRender: false }, at + 0.08)
      .fromTo(c.blurb, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6, immediateRender: false }, at + 0.3)
  }
  const colOut = (key, at) => tl.to(cols[key].col, { opacity: 0, y: -12, duration: 0.35, ease: E.exit }, at)
  // fromTo above needs its from-state before `at` too: start every column hidden.
  for (const c of Object.values(cols)) gsap.set([c.label, c.blurb], { opacity: 0 }), gsap.set(c.lines, { yPercent: 108 })

  // 0-5 s: the original photo.
  tl.to(frame, { opacity: 1, y: 0, scale: 1, duration: 1.0 }, K.photoIn)
    .fromTo(original, { scale: sP * 1.035, x: -size * 0.0175, y: -size * 0.0175 }, { ...photoT, duration: 4.4, ease: 'power2.out', immediateRender: false }, K.photoIn)
    .to(fileTag, { opacity: 1, duration: 0.5 }, 1.1)
  colIn('intro', 0.7)

  // 5-11 s: Remove Background. A scan line wipes the background away; the shoe never moves.
  colOut('intro', S.remove)
  tl.to(fileTag, { opacity: 0, duration: 0.3, ease: E.exit }, S.remove)
  colIn('remove', S.remove + 0.4)
  tl.set(cutout, { opacity: 1 }, K.scanStart)
    .set(scan, { opacity: 1, x: 0 }, K.scanStart)
    .to(scan, { x: size, duration: K.scanEnd - K.scanStart, ease: E.soft }, K.scanStart)
    .to(original, { clipPath: 'inset(0% 0% 0% 100%)', duration: K.scanEnd - K.scanStart, ease: E.soft }, K.scanStart)
    .to(scan, { opacity: 0, duration: 0.3 }, K.scanEnd)

  // 11-19 s: Studio Shot. The same cutout glides into the studio-shot framing; backdrop and shadow arrive.
  colOut('remove', S.studio)
  colIn('studio', S.studio + 0.4)
  tl.to(cutout, { ...studioT, duration: K.toStudioEnd - K.toStudio, ease: E.move }, K.toStudio)
    .to(frame, { scale: fStudio, duration: K.toStudioEnd - K.toStudio, ease: E.move }, K.toStudio)
    .to(white, { opacity: 1, duration: 1.0, ease: E.soft }, K.toStudio + 0.4)
    .to(shadow, { opacity: 1, duration: 0.6, ease: E.soft }, K.shadowIn)
    .to(studio, { opacity: 1, duration: 0.25, ease: 'none' }, K.exactSwap)
    // Before / after: the original, framed identically, behind a split line.
    .set(split, { opacity: 1, x: size }, K.splitIn)
    .to(split, { x: size / 2, duration: K.splitSet - K.splitIn }, K.splitIn)
    .to(before, { clipPath: beforeClip(size / 2), duration: K.splitSet - K.splitIn }, K.splitIn)
    .to([beforeTag, afterTag], { opacity: 1, duration: 0.4 }, K.splitSet - 0.2)
    .to([beforeTag, afterTag], { opacity: 0, duration: 0.25, ease: E.exit }, K.splitOut)
    .to(split, { x: size, duration: 0.6, ease: E.exit }, K.splitOut)
    .to(before, { clipPath: beforeClip(0), duration: 0.6, ease: E.exit }, K.splitOut)
    .set(split, { opacity: 0 }, K.splitOut + 0.6)

  // 19-26 s: Photoshop File. Back to the 1024 px document: one transparent "Cutout" layer.
  colOut('studio', S.psd)
  colIn('psd', S.psd + 0.4)
  tl.to([studio, shadow], { opacity: 0, duration: 0.3, ease: 'none' }, K.toPsd)
    .to(white, { opacity: 0, duration: 0.8, ease: E.soft }, K.toPsd + 0.2)
    .to(cutout, { ...photoT, duration: K.toPsdEnd - K.toPsd, ease: E.move }, K.toPsd)
    .to(frame, { scale: 1, duration: K.toPsdEnd - K.toPsd, ease: E.move }, K.toPsd)
    .to(psdTag, { opacity: 1, duration: 0.5 }, K.toPsdEnd - 0.2)
    .fromTo(panel, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7, immediateRender: false }, K.panelIn)
    .to(hl, { opacity: 1, duration: 0.25, ease: 'power1.out' }, K.rowSelect)
    .to(sel, { opacity: 1, duration: 0.3, ease: 'power1.out' }, K.rowSelect + 0.05)
    .to(cutout, { ...moved(0.88, size * 0.06, -size * 0.035), duration: K.layerMoveEnd - K.layerMove, ease: E.move }, K.layerMove)
    .to(sel, { ...selBox(moved(0.88, size * 0.06, -size * 0.035)), duration: K.layerMoveEnd - K.layerMove, ease: E.move }, K.layerMove)
    .to(cutout, { ...photoT, duration: K.layerBackEnd - K.layerBack, ease: E.move }, K.layerBack)
    .to(sel, { ...selBox(photoT), duration: K.layerBackEnd - K.layerBack, ease: E.move }, K.layerBack)
    .to(sel, { opacity: 0, duration: 0.3 }, K.layerBackEnd + 0.2)

  // 26-30 s: the finished store image and the call to action.
  colOut('psd', S.cta)
  tl.to([panel, psdTag], { opacity: 0, duration: 0.3, ease: E.exit }, S.cta)
    .to(cutout, { ...studioT, duration: 1.0, ease: E.move }, K.toFinal)
    .to(frame, { scale: fStudio, duration: 1.0, ease: E.move }, K.toFinal)
    .to(white, { opacity: 1, duration: 0.7, ease: E.soft }, K.toFinal + 0.2)
    .to(shadow, { opacity: 1, duration: 0.4, ease: E.soft }, K.toFinal + 0.7)
    .to(studio, { opacity: 1, duration: 0.25, ease: 'none' }, K.toFinal + 1.05)
  colIn('cta', K.ctaIn)
  if (capture) tl.fromTo(capture, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.8, immediateRender: false }, K.ctaIn + 0.45)
  tl.to(stage, { scale: 1.012, duration: DURATION - 27.6, ease: 'power1.inOut' }, 27.6)

  // Captions.
  CAPTIONS.forEach((c, i) => {
    tl.fromTo(caps[i], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', immediateRender: false }, c.start)
      .to(caps[i], { opacity: 0, duration: 0.2, ease: 'power1.in' }, c.end - 0.2)
  })

  tl.set({}, {}, DURATION)
  tl.progress(1).progress(0) // record every tween's start values in order

  const ready = [...document.images].map((i) => i.decode().catch(() => {}))
  window.__ready = Promise.all([document.fonts.ready, ...ready])
  window.seek = (t) => {
    tl.seek(Math.min(t, DURATION), false)
    const f = Math.floor(t * FPS + 1e-6), gr = rng(f + 1)
    grain.style.transform = `translate(${Math.floor(gr() * 64) - 32}px, ${Math.floor(gr() * 64) - 32}px)`
  }
  window.seek(0)
})()
