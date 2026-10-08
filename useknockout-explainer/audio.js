// Procedural score + sound design, rendered offline so it is deterministic.
// 120 BPM: every scene boundary (5, 11, 19, 26 s) lands on a beat. Cues come from TL.K.
;(() => {
  const { DURATION, S, K } = TL
  const SR = 48000
  const BEAT = 0.5

  window.renderScore = async () => {
    const ctx = new OfflineAudioContext(2, SR * DURATION, SR)

    // Seeded noise + a generated reverb impulse.
    let seed = 1234567
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1
    const noise = ctx.createBuffer(1, SR * 2, SR)
    noise.getChannelData(0).forEach((_, i, d) => (d[i] = rnd()))
    const ir = ctx.createBuffer(2, SR * 2.4, SR)
    for (let c = 0; c < 2; c++) ir.getChannelData(c).forEach((_, i, d) => (d[i] = rnd() * Math.pow(1 - i / d.length, 3.2)))

    const master = ctx.createGain(); master.gain.value = 0.9
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.2
    master.connect(comp).connect(ctx.destination)
    const verb = ctx.createConvolver(); verb.buffer = ir
    const verbOut = ctx.createGain(); verbOut.gain.value = 0.22
    verb.connect(verbOut).connect(master)

    const out = (node, gain = 1, pan = 0, send = 0.3) => {
      const g = ctx.createGain(); g.gain.value = gain
      const p = ctx.createStereoPanner(); p.pan.value = pan
      node.connect(g).connect(p).connect(master)
      if (send) { const s = ctx.createGain(); s.gain.value = send; p.connect(s).connect(verb) }
      return p
    }
    const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12)
    const env = (param, t, a, hold, r, peak) => {
      param.value = 0 // GainNode defaults to 1: silence until the envelope starts
      param.setValueAtTime(0, t)
      param.linearRampToValueAtTime(peak, t + a)
      param.setValueAtTime(peak, t + a + hold)
      param.exponentialRampToValueAtTime(0.0001, t + a + hold + r)
    }

    // ---- Pad: warm detuned saws through a low-pass, one chord per scene (D major).
    const chords = [
      [S.intro, S.remove, [50, 57, 61, 64, 66]],   // Dmaj9
      [S.remove, S.studio, [47, 54, 57, 61, 62]],  // Bm9
      [S.studio, S.psd, [43, 50, 54, 57, 62]],     // Gmaj9
      [S.psd, S.cta, [45, 52, 57, 59, 64]],        // A6/9
      [S.cta, S.end, [50, 57, 62, 66, 69]],        // Dmaj (resolve)
    ]
    for (const [t0, t1, notes] of chords) {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.6
      lp.frequency.setValueAtTime(700, t0); lp.frequency.linearRampToValueAtTime(t0 === S.cta ? 1600 : 1100, t1)
      const g = ctx.createGain()
      const a = t0 === 0 ? 1.6 : 0.5
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.055, t0 + a)
      g.gain.setValueAtTime(0.055, Math.max(t0 + a, t1 - 0.4)); g.gain.linearRampToValueAtTime(t1 === S.end ? 0.0001 : 0, t1 === S.end ? t1 : t1 + 0.6)
      lp.connect(g); out(g, 1, 0, 0.5)
      for (const n of notes) for (const d of [-7, 7]) {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(n); o.detune.value = d
        o.connect(lp); o.start(t0); o.stop(Math.min(DURATION, t1 + 0.8))
      }
    }

    // ---- Bass: soft sine roots on the beat from the first step on.
    const roots = { [S.remove]: 35, [S.studio]: 31, [S.psd]: 33, [S.cta]: 38 }
    for (let t = S.remove; t < DURATION - 0.5; t += BEAT * 2) {
      const root = roots[[S.cta, S.psd, S.studio, S.remove].find((s) => t >= s)]
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = hz(root + 12)
      const g = ctx.createGain(); env(g.gain, t, 0.02, 0.35, 0.5, 0.16)
      o.connect(g); out(g, 1, 0, 0); o.start(t); o.stop(t + 1)
    }

    // ---- Pulse: restrained kick + ticks through the studio and PSD scenes.
    for (let t = S.studio; t < S.cta; t += BEAT) {
      const beat = Math.round((t - S.studio) / BEAT)
      if (beat % 2 === 0) {
        const o = ctx.createOscillator(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18)
        const g = ctx.createGain(); env(g.gain, t, 0.004, 0.02, 0.22, 0.32)
        o.connect(g); out(g, 1, 0, 0); o.start(t); o.stop(t + 0.3)
      }
      for (const off of [0, BEAT / 2]) {
        const n = ctx.createBufferSource(); n.buffer = noise
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000
        const g = ctx.createGain(); env(g.gain, t + off, 0.002, 0.005, 0.05, off ? 0.05 : 0.03)
        n.connect(hp).connect(g); out(g, 1, off ? 0.25 : -0.25, 0.1); n.start(t + off, (beat * 0.37) % 1.5); n.stop(t + off + 0.08)
      }
    }

    // ---- Motif: a soft pluck on each reveal.
    const pluck = (t, midi, gain = 0.12, pan = 0) => {
      for (const [mult, amp, dec] of [[1, 1, 0.9], [2, 0.35, 0.5], [3, 0.12, 0.3]]) {
        const o = ctx.createOscillator(); o.type = mult === 1 ? 'triangle' : 'sine'; o.frequency.value = hz(midi) * mult
        const g = ctx.createGain(); env(g.gain, t, 0.004, 0, dec, gain * amp)
        o.connect(g); out(g, 1, pan, 0.45); o.start(t); o.stop(t + dec + 0.05)
      }
    }
    ;[[K.scanEnd, [66, 69, 74]], [K.exactSwap, [67, 71, 74]], [K.panelIn, [69, 73, 76]]].forEach(([t, ns]) =>
      ns.forEach((n, i) => pluck(t + i * BEAT / 2, n, 0.1, (i - 1) * 0.2)))
    ;[62, 66, 69, 74].forEach((n, i) => pluck(K.ctaIn + i * BEAT / 2, n, 0.12, (i - 1.5) * 0.15))

    // ---- Sound design.
    const sweep = (t0, t1, f0, f1, gain, pan0 = 0, pan1 = 0, q = 1.2) => {
      const n = ctx.createBufferSource(); n.buffer = noise; n.loop = true
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q
      bp.frequency.setValueAtTime(f0, t0); bp.frequency.exponentialRampToValueAtTime(f1, t1)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain, t0 + (t1 - t0) * 0.45); g.gain.linearRampToValueAtTime(0.0001, t1)
      const p = ctx.createStereoPanner(); p.pan.setValueAtTime(pan0, t0); p.pan.linearRampToValueAtTime(pan1, t1)
      n.connect(bp).connect(g).connect(p).connect(master)
      const s = ctx.createGain(); s.gain.value = 0.25; p.connect(s).connect(verb)
      n.start(t0, (t0 * 0.13) % 1.5); n.stop(t1 + 0.05)
    }
    const tick = (t, f, gain, dec = 0.05, pan = 0) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f
      const g = ctx.createGain(); env(g.gain, t, 0.002, 0, dec, gain)
      o.connect(g); out(g, 1, pan, 0.2); o.start(t); o.stop(t + dec + 0.02)
      const n = ctx.createBufferSource(); n.buffer = noise
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 4; bp.Q.value = 2
      const g2 = ctx.createGain(); env(g2.gain, t, 0.001, 0, 0.018, gain * 0.6)
      n.connect(bp).connect(g2); out(g2, 1, pan, 0); n.start(t, (f % 1.5)); n.stop(t + 0.04)
    }

    sweep(K.scanStart, K.scanEnd, 700, 4200, 0.07, -0.7, 0.7)                  // scan line wipes left to right
    sweep(K.toStudio, K.toStudioEnd, 260, 1100, 0.06, 0, 0, 0.8)                // cutout glides into the studio framing
    tick(K.shadowIn, 196, 0.16, 0.18)                                           // lands
    sweep(K.splitIn, K.splitSet, 1800, 900, 0.035, 0.6, 0)                      // split line slides in from the right
    sweep(K.toPsd, K.toPsdEnd, 900, 300, 0.045, 0, 0, 0.8)                      // back to the document
    tick(K.rowSelect, 1320, 0.07, 0.04, 0.3)                                    // layer row selected
    sweep(K.layerMove, K.layerMoveEnd, 500, 1400, 0.03, 0, 0.3)                 // layer moved
    sweep(K.layerBack, K.layerBackEnd, 1400, 500, 0.03, 0.3, 0)                 // and back
    tick(K.layerBackEnd, 880, 0.05, 0.05)
    // Closing chime: inharmonic bell partials.
    for (const [m, a, d] of [[1, 0.09, 2.6], [2.76, 0.04, 1.6], [5.4, 0.02, 0.9]]) {
      const o = ctx.createOscillator(); o.frequency.value = hz(86) * m
      const g = ctx.createGain(); env(g.gain, K.ctaIn + 0.05, 0.003, 0, d, a)
      o.connect(g); out(g, 1, 0, 0.6); o.start(K.ctaIn + 0.05); o.stop(K.ctaIn + d + 0.15)
    }

    const buf = await ctx.startRendering()
    const enc = (f32) => { const u8 = new Uint8Array(f32.buffer); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s) }
    return { sr: SR, channels: [enc(buf.getChannelData(0)), enc(buf.getChannelData(1))] }
  }
})()
