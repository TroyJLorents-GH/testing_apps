#!/usr/bin/env node
// Deterministic HTML -> video renderer with adaptive temporal motion blur.
//
// Page contract:
//   window.__composition = { duration, fps?, width?, height? }   (seconds, CSS px)
//   window.__ready       = Promise resolved once fonts/images/audio are loaded (optional)
//   window.seek(t)       = paint the frame at time t (may return a Promise)
//
// Usage:
//   node render.mjs index.html --out out/master.mp4 [--codec h264|h265|prores|png]
//     [--fps 60] [--scale 2] [--blur 8] [--shutter 180] [--from 0] [--to <s>]
//     [--audio mix.wav] [--alpha] [--verify] [--crf 16]
import { spawn, execSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const args = parseArgs(process.argv.slice(2))
if (!args._[0] || !args.out) {
  console.error('usage: node render.mjs <composition.html> --out <file> [options]')
  process.exit(2)
}

const { chromium } = await loadPlaywright()
const browser = await chromium.launch({
  args: ['--force-color-profile=srgb', '--disable-lcd-text', '--font-render-hinting=none', '--hide-scrollbars'],
})
const url = pathToFileURL(resolve(args._[0])).href
const open = async (ctxOpts) => {
  const ctx = await browser.newContext(ctxOpts)
  const p = await ctx.newPage()
  await p.goto(url)
  await p.waitForFunction(() => typeof window.seek === 'function' && window.__composition)
  await p.evaluate(() => window.__ready)
  return p
}

// Probe the composition for its defaults, then open the real page at the final size and scale.
const probe = await open({})
const comp = await probe.evaluate(() => window.__composition)
await probe.context().close()

const fps = Number(args.fps ?? comp.fps ?? 60)
const width = Number(args.width ?? comp.width ?? 1920)
const height = Number(args.height ?? comp.height ?? 1080)
const scale = Number(args.scale ?? 1) // 2 = lay out at 1920x1080 CSS px, rasterize at 3840x2160
const blur = Math.max(1, Number(args.blur ?? 1))
const shutter = Number(args.shutter ?? 180) / 360 // fraction of a frame the shutter stays open
const from = Number(args.from ?? 0)
const to = Number(args.to ?? comp.duration)
const codec = args.codec ?? 'h264'
const alpha = Boolean(args.alpha)

const pg = await open({ viewport: { width, height }, deviceScaleFactor: scale })

const shot = async (t) => {
  await pg.evaluate((tt) => window.seek(tt), t)
  return pg.screenshot({ type: 'png', omitBackground: alpha, animations: 'disabled', caret: 'hide' })
}

if (args.verify) {
  // Determinism: the same t must paint identical pixels regardless of seek history.
  const probes = [from, (from + to) / 2, Math.max(from, to - 1 / fps)]
  for (const t of probes) {
    const a = await shot(t)
    await shot(Math.max(0, to - t))
    const b = await shot(t)
    if (!a.equals(b)) {
      console.error(`determinism FAIL at t=${t.toFixed(3)}s`)
      await browser.close()
      process.exit(1)
    }
  }
  console.log(`determinism OK (${probes.length} probes)`)
}

mkdirSync(dirname(resolve(args.out)), { recursive: true })
const ff = spawn('ffmpeg', ffmpegArgs(), { stdio: ['pipe', 'inherit', 'inherit'] })
const write = (buf) => (ff.stdin.write(buf) ? null : new Promise((r) => ff.stdin.once('drain', r)))

const total = Math.round((to - from) * fps)
const dt = (shutter / fps) / blur
let moving = 0
const started = Date.now()
for (let n = 0; n < total; n++) {
  const t0 = from + n / fps
  const first = await shot(t0)
  if (blur === 1) {
    await write(first)
  } else {
    // Adaptive: only spend sub-frames when the frame actually moves inside the shutter.
    const last = await shot(t0 + dt * (blur - 1))
    if (first.equals(last)) {
      for (let k = 0; k < blur; k++) await write(first)
    } else {
      moving++
      await write(first)
      for (let k = 1; k < blur - 1; k++) await write(await shot(t0 + dt * k))
      await write(last)
    }
  }
  if (n % fps === 0) {
    const pct = ((n / total) * 100).toFixed(0)
    process.stderr.write(`\rframe ${n}/${total} (${pct}%) moving=${moving} ${((Date.now() - started) / 1000).toFixed(0)}s`)
  }
}
ff.stdin.end()
await new Promise((r, j) => ff.on('close', (c) => (c === 0 ? r() : j(new Error(`ffmpeg exited ${c}`)))))
await browser.close()
console.error(`\nrendered ${total} frames (${moving} with motion blur) -> ${args.out}`)

function ffmpegArgs() {
  const inRate = fps * blur
  const a = ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(inRate), '-i', '-']
  if (args.audio) a.push('-i', args.audio)

  const vf = []
  if (blur > 1) {
    // Average sub-frames in linear light (gamma-space averaging darkens motion trails).
    vf.push(
      'zscale=tin=iec61966-2-1:t=linear:npl=100',
      alpha ? 'format=gbrapf32le' : 'format=gbrpf32le',
      `tmix=frames=${blur}`,
      `select='not(mod(n+1\\,${blur}))'`,
      'setpts=PTS-STARTPTS',
      'zscale=tin=linear:t=iec61966-2-1:npl=100',
    )
  }
  const tags = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709']

  if (codec === 'png') {
    vf.push(alpha ? 'format=rgba' : 'format=rgb24')
    return [...a, '-vf', vf.join(','), '-r', String(fps), args.out]
  }
  if (codec === 'prores') {
    vf.push(`scale=out_color_matrix=bt709:out_range=tv`, alpha ? 'format=yuva444p10le' : 'format=yuv444p10le')
    return [...a, '-vf', vf.join(','), '-r', String(fps), '-c:v', 'prores_ks', '-profile:v', '4', '-vendor', 'apl0',
      ...tags, ...audioArgs('pcm_s24le'), args.out]
  }
  if (codec === 'h265') {
    vf.push(`scale=out_color_matrix=bt709:out_range=tv`, 'format=yuv420p10le')
    return [...a, '-vf', vf.join(','), '-r', String(fps), '-c:v', 'libx265', '-preset', 'slow', '-crf', String(args.crf ?? 14),
      '-tag:v', 'hvc1', ...tags, ...audioArgs('aac'), '-movflags', '+faststart', args.out]
  }
  // h264 delivery. swscale defaults to BT.601 for RGB->YUV; force BT.709 so colors match the browser.
  vf.push(`scale=out_color_matrix=bt709:out_range=tv`, 'format=yuv420p')
  return [...a, '-vf', vf.join(','), '-r', String(fps), '-c:v', 'libx264', '-preset', 'slow', '-crf', String(args.crf ?? 16),
    ...tags, ...audioArgs('aac'), '-movflags', '+faststart', args.out]
}

function audioArgs(c) {
  if (!args.audio) return []
  return ['-map', '0:v', '-map', '1:a', '-c:a', c, ...(c === 'aac' ? ['-b:a', '320k'] : []), '-shortest']
}

async function loadPlaywright() {
  try {
    return await import('playwright')
  } catch {
    const root = execSync('npm root -g').toString().trim()
    const req = createRequire(resolve(root, 'noop.js'))
    const p = resolve(root, 'playwright')
    if (!existsSync(p)) throw new Error('playwright not found: npm i -D playwright')
    return req(p)
  }
}

function parseArgs(argv) {
  const out = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) { out._.push(a); continue }
    const key = a.slice(2)
    const next = argv[i + 1]
    if (next === undefined || next.startsWith('--')) out[key] = true
    else { out[key] = next; i++ }
  }
  return out
}
