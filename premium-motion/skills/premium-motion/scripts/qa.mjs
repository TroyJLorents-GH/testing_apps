#!/usr/bin/env node
// QA for an exported video. Fails (exit 1) on any hard defect; writes a JSON report + contact sheet.
//
// node qa.mjs out/master.mp4 [--fps 60] [--width 1920] [--height 1080] [--duration 60]
//   [--lufs -16] [--lufs-tol 1] [--tp -1.5] [--freeze 3] [--report out/qa.json] [--contact out/contact.png]
import { spawnSync } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'

const args = parseArgs(process.argv.slice(2))
const file = args._[0]
if (!file) { console.error('usage: node qa.mjs <video> [options]'); process.exit(2) }
const outDir = dirname(resolve(file))
const checks = []
const check = (name, pass, detail, hard = true) => checks.push({ name, pass, hard, detail })

// 1. Container + stream facts.
const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]).stdout)
const v = probe.streams.find((s) => s.codec_type === 'video')
const a = probe.streams.find((s) => s.codec_type === 'audio')
const [num, den] = v.r_frame_rate.split('/').map(Number)
const fps = num / den
const dur = Number(probe.format.duration)
check('video stream', Boolean(v), v ? `${v.codec_name} ${v.width}x${v.height} ${v.pix_fmt}` : 'missing')
if (args.fps) check('frame rate', Math.abs(fps - Number(args.fps)) < 0.01, `${fps.toFixed(3)} fps`)
if (v.avg_frame_rate !== v.r_frame_rate) check('constant frame rate', false, `avg ${v.avg_frame_rate} vs r ${v.r_frame_rate}`)
if (args.width) check('resolution', v.width === Number(args.width) && v.height === Number(args.height), `${v.width}x${v.height}`)
if (args.duration) check('duration', Math.abs(dur - Number(args.duration)) <= 1 / fps + 0.01, `${dur.toFixed(3)}s`)
const tagged = v.color_space === 'bt709' && v.color_primaries === 'bt709' && v.color_transfer === 'bt709'
check('bt709 color tags', tagged || v.codec_name === 'png', `${v.color_space}/${v.color_primaries}/${v.color_transfer}`)
if (v.codec_name === 'h264') check('h264 pix_fmt yuv420p (plays everywhere)', v.pix_fmt === 'yuv420p', v.pix_fmt)

// 2. Audio: loudness, true peak, duration match.
if (a) {
  const r = run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-map', '0:a:0', '-af', 'ebur128=peak=true', '-f', 'null', '-'])
  const summary = r.stderr.slice(r.stderr.lastIndexOf('Summary:'))
  const I = Number(/I:\s+(-?[\d.]+) LUFS/.exec(summary)?.[1])
  const TP = Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(summary)?.[1])
  const target = Number(args.lufs ?? -16), tol = Number(args['lufs-tol'] ?? 1)
  check('integrated loudness', Math.abs(I - target) <= tol, `${I} LUFS (target ${target} ±${tol})`)
  check('true peak', TP <= Number(args.tp ?? -1.5), `${TP} dBTP (max ${args.tp ?? -1.5})`)
  const ad = Number(a.duration ?? dur)
  check('audio/video duration match', Math.abs(ad - Number(v.duration ?? dur)) < 0.05, `audio ${ad.toFixed(3)}s / video ${Number(v.duration ?? dur).toFixed(3)}s`)
} else {
  check('audio stream', false, 'no audio (fine for a silent cut)', false)
}

// 3. Picture: unintended freezes, black frames, flashes.
const freezeMin = Number(args.freeze ?? 3)
const fr = run('ffmpeg', ['-hide_banner', '-i', file, '-vf', `freezedetect=n=0.0005:d=${freezeMin}`, '-map', '0:v:0', '-f', 'null', '-'])
const freezes = [...fr.stderr.matchAll(/freeze_start: ([\d.]+)[\s\S]*?freeze_duration: ([\d.]+)/g)].map((m) => `${(+m[1]).toFixed(2)}s for ${(+m[2]).toFixed(2)}s`)
check(`no holds longer than ${freezeMin}s`, freezes.length === 0, freezes.join(', ') || 'none', false)

const bl = run('ffmpeg', ['-hide_banner', '-i', file, '-vf', 'blackdetect=d=0.1:pic_th=0.98', '-map', '0:v:0', '-f', 'null', '-'])
const blacks = [...bl.stderr.matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)].map((m) => `${m[1]}-${m[2]}s`)
check('no unintended black frames', blacks.length === 0, blacks.join(', ') || 'none', false)

// Flash approximation (WCAG 2.3.1 general flash): count opposing luma swings >= 10% within any 1s window.
const ys = run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', file, '-vf', 'scale=320:-2,format=gray,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-', '-f', 'null', '-'])
  .stdout.split('\n').filter((l) => l.includes('YAVG')).map((l) => Number(l.split('=')[1]) / 255)
let worst = 0
const swings = []
for (let i = 1; i < ys.length; i++) {
  const d = ys[i] - ys[i - 1]
  if (Math.abs(d) >= 0.1 && Math.min(ys[i], ys[i - 1]) < 0.8) swings.push({ i, dir: Math.sign(d) })
}
for (let s = 0; s < swings.length; s++) {
  let pairs = 0, prev = swings[s].dir
  for (let k = s + 1; k < swings.length && swings[k].i - swings[s].i < fps; k++) if (swings[k].dir !== prev) { pairs++; prev = swings[k].dir }
  worst = Math.max(worst, Math.ceil(pairs / 2))
}
check('flashes <= 3 per second (approximation)', worst <= 3, `max ${worst} flash pairs in 1s`)

// 4. Contact sheet: 24 evenly spaced frames, for a human or reviewer agent to read at a glance.
const contact = args.contact ?? join(outDir, 'contact.png')
const step = Math.max(dur / 24, 1 / fps)
run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', file, '-vf', `fps=1/${step},scale=480:-2,tile=6x4:padding=8:margin=8:color=white`, '-frames:v', '1', contact])

const failed = checks.filter((c) => !c.pass && c.hard)
const report = { file, fps, duration: dur, checks, contact, pass: failed.length === 0 }
const reportPath = args.report ?? join(outDir, 'qa.json')
mkdirSync(dirname(resolve(reportPath)), { recursive: true })
writeFileSync(reportPath, JSON.stringify(report, null, 2))
for (const c of checks) console.log(`${c.pass ? 'PASS' : c.hard ? 'FAIL' : 'WARN'}  ${c.name}: ${c.detail}`)
console.log(`\n${report.pass ? 'QA PASSED' : `QA FAILED (${failed.length})`} -> ${reportPath}, ${contact}`)
process.exit(report.pass ? 0 : 1)

function run(cmd, argv) {
  const r = spawnSync(cmd, argv, { encoding: 'utf8', maxBuffer: 1 << 28 })
  if (r.error) throw r.error
  return r
}

function parseArgs(argv) {
  const out = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i]
    if (!x.startsWith('--')) { out._.push(x); continue }
    const next = argv[i + 1]
    if (next === undefined || next.startsWith('--')) out[x.slice(2)] = true
    else { out[x.slice(2)] = next; i++ }
  }
  return out
}
