// Screenshot a composition at given times: node tools/stills.mjs index.html out/stills 0.5 3 7 ...
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
const [page_, dir, ...times] = process.argv.slice(2)
mkdirSync(dir, { recursive: true })
const b = await chromium.launch({ args: ['--force-color-profile=srgb'] })
const probe = await b.newPage()
const errors = []
probe.on('pageerror', (e) => errors.push(e.message))
probe.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await probe.goto(pathToFileURL(resolve(page_)).href)
await probe.waitForFunction(() => window.__composition && window.seek, null, { timeout: 10000 }).catch(() => {})
if (errors.length) { console.error(errors.join('\n')); process.exit(1) }
const c = await probe.evaluate(() => window.__composition)
const ctx = await b.newContext({ viewport: { width: c.width, height: c.height } })
const p = await ctx.newPage()
await p.goto(pathToFileURL(resolve(page_)).href)
await p.waitForFunction(() => window.seek)
await p.evaluate(() => window.__ready)
for (const t of times) {
  await p.evaluate((tt) => window.seek(tt), Number(t))
  await p.screenshot({ path: `${dir}/t${String(t).padStart(5, '0')}.png` })
}
await b.close()
console.log(`${times.length} stills -> ${dir}`)
