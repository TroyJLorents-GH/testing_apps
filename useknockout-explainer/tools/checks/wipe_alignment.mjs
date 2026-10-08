// Run from the project root: node tools/checks/wipe_alignment.mjs. Fails the eye test if a wipe edge drifts from its line.
// Numeric check: wipe edges vs their lines, mid-move, for both ratios.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
const b = await chromium.launch()
let worst = 0
for (const page of ['index.html', 'reel.html']) {
  const p = await b.newPage()
  await p.goto(pathToFileURL(resolve(page)).href)
  await p.waitForFunction(() => window.seek); await p.evaluate(() => window.__ready)
  const times = []
  for (let t = 5.8; t <= 7.6; t += 0.2) times.push(['scan', t])
  for (let t = 14.8; t <= 18.7; t += 0.15) times.push(['split', t])
  for (const [kind, t] of times) {
    const r = await p.evaluate(({ kind, t }) => {
      window.seek(t)
      const f = document.querySelector('.frame')
      const imgs = [...f.querySelectorAll('img')]
      const el = kind === 'scan' ? imgs[0] : imgs[imgs.length - 1]
      const line = f.querySelector(kind === 'scan' ? '.scan' : '.split')
      const lineX = new DOMMatrix(getComputedStyle(line).transform).m41
      const m = new DOMMatrix(getComputedStyle(el).transform)
      const ins = el.style.clipPath.match(/[-\d.]+/g).map(Number) // top right bottom left (%)
      const edgeLocal = kind === 'scan' ? ins[3] / 100 * 1024 : (1 - ins[1] / 100) * 1024
      return { lineX, edgeX: m.m41 + m.a * edgeLocal, op: getComputedStyle(line).opacity, clip: el.style.clipPath }
    }, { kind, t })
    if (Number(r.op) > 0) { const g = Math.abs(r.lineX - r.edgeX); if (!(g >= 0)) console.log(page, kind, t.toFixed(2), JSON.stringify(r)); else worst = Math.max(worst, g) }
  }
  await p.close()
}
await b.close()
console.log(`worst line/edge gap while visible: ${worst.toFixed(2)} px`)
