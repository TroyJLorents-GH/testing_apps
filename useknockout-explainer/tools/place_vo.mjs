// Voiceover: split the ElevenLabs take into its lines, place each under its caption, duck the score, master.
// node tools/place_vo.mjs  ->  audio/vo.wav (stem), audio/mix.wav (final, about -16 LUFS, <= -1.5 dBTP)
// Inputs: audio/vo_take.mp3 (one continuous take, lines separated by long pauses), audio/score_raw.wav.
import { execFileSync } from 'node:child_process'
import '../timeline.js'

const { CAPTIONS, VO_LEAD, DURATION } = TL
const ff = (args) => execFileSync('ffmpeg', ['-hide_banner', '-nostats', ...args], { stdio: ['ignore', 'pipe', 'pipe'] })
const ffErr = (args) => { try { ff(args) } catch (e) { return e.stderr.toString() } return '' }
const probe = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString())

// 1. Find the spoken lines: speech between silences of at least 0.55 s (the [long pause] breaks).
const take = 'audio/vo_take.mp3'
const dur = probe(take)
const log = execFileSync('sh', ['-c', `ffmpeg -hide_banner -nostats -i ${take} -af silencedetect=noise=-42dB:d=0.55 -f null - 2>&1`]).toString()
const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1])
const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1])
const lines = []
let t = 0
starts.forEach((s, i) => { if (s - t > 0.15) lines.push([t, s]); t = ends[i] ?? dur })
if (dur - t > 0.15) lines.push([t, dur])
if (lines.length !== CAPTIONS.length) throw new Error(`take has ${lines.length} spoken lines, captions expect ${CAPTIONS.length}`)

// 2. Place line i at caption.start + VO_LEAD, keeping a little breath before and decay after.
const PRE = 0.06, POST = 0.18
const parts = []
lines.forEach(([a, b], i) => {
  const c = CAPTIONS[i]
  const at = c.start + VO_LEAD
  const spoken = b - a
  if (at + spoken > c.end) throw new Error(`line ${i + 1} (${spoken.toFixed(2)} s) overruns its caption (${c.start}-${c.end})`)
  const from = Math.max(0, a - PRE), to = Math.min(dur, b + POST)
  const delay = Math.round((at - (a - from)) * 1000)
  parts.push(`[0:a]atrim=${from}:${to},asetpts=PTS-STARTPTS,afade=t=in:d=0.03,afade=t=out:st=${(to - from - 0.08).toFixed(3)}:d=0.08,adelay=${delay}|${delay}[l${i}]`)
  console.log(`line ${i + 1}: ${spoken.toFixed(2)} s at ${at.toFixed(2)}-${(at + spoken).toFixed(2)} (caption ${c.start}-${c.end})`)
})
const mixIn = CAPTIONS.map((_, i) => `[l${i}]`).join('')
// VO chain: mono take -> 48 kHz stereo, high-pass, light de-ess and compression, -17 LUFS stem.
ff(['-y', '-i', take, '-filter_complex',
  `${parts.join(';')};${mixIn}amix=inputs=${CAPTIONS.length}:normalize=0,aresample=48000,` +
  `highpass=f=80,deesser=i=0.3,acompressor=threshold=-20dB:ratio=2.5:attack=8:release=120:makeup=1,` +
  `apad=whole_dur=${DURATION},atrim=0:${DURATION},pan=stereo|c0=c0|c1=c0,loudnorm=I=-17:TP=-2:LRA=7[vo]`,
  '-map', '[vo]', '-c:a', 'pcm_s24le', 'audio/vo.wav'])

// 3. Duck the score about 8 dB under the voice (sidechain: 150 ms attack, 400 ms release; measured, see DECISIONS.md).
const out = 'audio/mix_pre.wav'
ff(['-y', '-i', 'audio/score_raw.wav', '-i', 'audio/vo.wav', '-filter_complex',
  '[0:a]aresample=48000,loudnorm=I=-26:TP=-6:LRA=11[bed];[1:a]asplit=2[vo][sc];' +
  '[bed][sc]sidechaincompress=threshold=0.03:ratio=3:attack=150:release=400:makeup=1[duck];' +
  // A gentle peak limiter leaves headroom so the master gain below stays linear.
  '[duck][vo]amix=inputs=2:normalize=0,alimiter=limit=0.5:attack=3:release=60:level=disabled[m]', '-map', '[m]', '-c:a', 'pcm_s24le', out])

// 4. Master: two-pass loudnorm in linear mode to -16 LUFS / -1.5 dBTP.
const target = 'I=-16:TP=-1.5:LRA=11'
const m = ffErr(['-i', out, '-af', `loudnorm=${target}:print_format=json`, '-f', 'null', '-'])
  || execFileSync('sh', ['-c', `ffmpeg -hide_banner -nostats -i ${out} -af loudnorm=${target}:print_format=json -f null - 2>&1`]).toString()
const j = JSON.parse(m.slice(m.lastIndexOf('{'), m.lastIndexOf('}') + 1))
ff(['-y', '-loglevel', 'error', '-i', out, '-af',
  `loudnorm=${target}:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true,aresample=48000`,
  '-c:a', 'pcm_s24le', 'audio/mix.wav'])
console.log(`pre-master ${j.input_i} LUFS / ${j.input_tp} dBTP -> audio/mix.wav (VO stem: audio/vo.wav)`)
