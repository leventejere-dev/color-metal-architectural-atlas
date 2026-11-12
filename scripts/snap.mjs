// Headless screenshots for visual QA (needs `npm run dev` running and Google Chrome installed).
//
//   node scripts/snap.mjs model <projectId> [out.png]          4-view model sheet (snap.html)
//   node scripts/snap.mjs atlas [hashOrProjectId] [out.png]    the atlas page (e.g. "#/project/casa-pogor")
//
// Options (env): SNAP_URL (default http://localhost:5174/), SNAP_SIZE (default 1600x1000), SNAP_WAIT (ms, atlas only)
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const CHROME = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p) => p && fs.existsSync(p))

const [mode = 'atlas', arg = '', outArg] = process.argv.slice(2)
const base = process.env.SNAP_URL ?? 'http://localhost:5174/'
const [w, h] = (process.env.SNAP_SIZE ?? '1600x1000').split('x').map(Number)
const out = outArg ?? path.join('work', 'snaps', `${mode}-${(arg || 'overview').replace(/[^a-z0-9-]+/gi, '_')}.png`)
fs.mkdirSync(path.dirname(out), { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  // a fixed profile folder (SNAP_PROFILE) avoids sporadic launch failures with fresh temporary profiles
  ...(process.env.SNAP_PROFILE ? { userDataDir: process.env.SNAP_PROFILE } : {}),
  args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11', '--enable-unsafe-swiftshader', '--window-size=' + w + ',' + h],
  defaultViewport: { width: w, height: h, deviceScaleFactor: 1 },
})
const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warn') errors.push(m.type() + ': ' + m.text())
})

try {
  if (mode === 'model') {
    const q = arg.includes(":") ? `id=${arg.split(":").pop()}&module=${encodeURIComponent(arg)}` : `id=${encodeURIComponent(arg)}`
    await page.goto(new URL(`snap.html?${q}`, base).toString(), { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => window.__snapReady === true, { timeout: 120000 })
    await new Promise((r) => setTimeout(r, 400))
  } else {
    const hash = arg ? (arg.startsWith('#') || arg.startsWith('?') ? arg : `#/project/${arg}`) : ''
    await page.goto(new URL(hash, base).toString(), { waitUntil: 'domcontentloaded' })
    await new Promise((r) => setTimeout(r, Number(process.env.SNAP_WAIT ?? (arg ? 9000 : 4500))))
    // optional scripted interaction, e.g. SNAP_EVAL="__store.getState().openGallery(0, true)" (dev build only)
    if (process.env.SNAP_EVAL) {
      await page.evaluate(process.env.SNAP_EVAL)
      await new Promise((r) => setTimeout(r, Number(process.env.SNAP_EVAL_WAIT ?? 2500)))
    }
  }
  await page.screenshot({ path: out })
  console.log('saved', out)
} catch (e) {
  console.error('snap failed:', e.message)
  process.exitCode = 1
} finally {
  if (errors.length) console.log('console:\n  ' + [...new Set(errors)].slice(0, 20).join('\n  '))
  await browser.close()
}
