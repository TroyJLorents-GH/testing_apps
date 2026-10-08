// captions.srt from the same caption list the composition burns in.
import { writeFileSync } from 'node:fs'
import '../timeline.js'
const ts = (s) => {
  const ms = Math.round(s * 1000)
  const p = (n, w = 2) => String(n).padStart(w, '0')
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`
}
const srt = TL.CAPTIONS.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${c.text}\n`).join('\n')
writeFileSync('out/captions.srt', srt)
console.log(srt)
