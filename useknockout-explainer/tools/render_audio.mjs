// Render the procedural score in headless Chromium (OfflineAudioContext), then loudness-normalize.
// node tools/render_audio.mjs  ->  audio/score_raw.wav, audio/mix.wav (-16 LUFS, <= -1.5 dBTP)
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs'
import { writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const b = await chromium.launch()
const p = await b.newPage()
await p.goto(pathToFileURL(resolve('audio.html')).href)
const { sr, channels } = await p.evaluate(() => window.renderScore())
await b.close()

const ch = channels.map((s) => new Float32Array(Buffer.from(s, 'base64').buffer.slice(0)))
const n = ch[0].length
const data = Buffer.alloc(n * 2 * 4)
for (let i = 0; i < n; i++) { data.writeFloatLE(ch[0][i], i * 8); data.writeFloatLE(ch[1][i], i * 8 + 4) }
const h = Buffer.alloc(44)
h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12)
h.writeUInt32LE(16, 16); h.writeUInt16LE(3, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(sr, 24)
h.writeUInt32LE(sr * 8, 28); h.writeUInt16LE(8, 32); h.writeUInt16LE(32, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40)
writeFileSync('audio/score_raw.wav', Buffer.concat([h, data]))

// Two-pass loudnorm: measure, then apply with the measured values (linear mode).
const target = 'I=-16:TP=-1.5:LRA=11'
const err = execFileSync('sh', ['-c', `ffmpeg -hide_banner -i audio/score_raw.wav -af loudnorm=${target}:print_format=json -f null - 2>&1`]).toString()
const j = JSON.parse(err.slice(err.lastIndexOf('{'), err.lastIndexOf('}') + 1))
const af = `loudnorm=${target}:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true`
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', 'audio/score_raw.wav', '-af', `${af},aresample=48000`, '-c:a', 'pcm_s24le', 'audio/mix.wav'])
console.log(`raw ${j.input_i} LUFS / ${j.input_tp} dBTP -> audio/mix.wav`)
