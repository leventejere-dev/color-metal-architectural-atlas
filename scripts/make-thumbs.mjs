// Render a small front-3/4 thumbnail of every 3D model that has no published photograph,
// for the project list and card (public/thumbs/<id>.webp after scripts/thumbs-post.py).
// Usage: node scripts/make-thumbs.mjs [--all]   (dev server on :5174, Chrome installed)
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const CHROME = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(
  (p) => p && fs.existsSync(p),
)
const base = process.env.SNAP_URL ?? 'http://localhost:5174/'
const all = process.argv.includes('--all')
const data = JSON.parse(fs.readFileSync('src/data/projects.json', 'utf8'))
const projects = (data.projects ?? data).filter((p) => p.model?.module && (all || !p.photos?.length))
const outDir = path.join('work', 'thumbs-raw')
fs.mkdirSync(outDir, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  ...(process.env.SNAP_PROFILE ? { userDataDir: process.env.SNAP_PROFILE } : {}),
  args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11', '--window-size=1600,1000'],
  defaultViewport: { width: 1600, height: 1000, deviceScaleFactor: 1 },
})
const page = await browser.newPage()
let n = 0
for (const p of projects) {
  const out = path.join(outDir, `${p.id}.png`)
  if (fs.existsSync(out) && !process.argv.includes('--force')) continue
  const m = p.model.module
  const q = m.includes(':') ? `id=${p.id}&module=${encodeURIComponent(m)}` : `id=${encodeURIComponent(p.id)}`
  try {
    await page.goto(new URL(`snap.html?${q}`, base).toString(), { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => window.__snapReady === true, { timeout: 120000 })
    await new Promise((r) => setTimeout(r, 300))
    await page.screenshot({ path: out, clip: { x: 0, y: 24, width: 800, height: 476 } })
    n++
    console.log('thumb', p.id)
  } catch (e) {
    console.error('failed', p.id, e.message)
  }
}
await browser.close()
console.log('rendered', n, 'of', projects.length)
