#!/usr/bin/env node
// How the compiled notices look: checks (and pictures with --shots). Sample data only, no Koha needed.
//   contrast WCAG AA, in light and with lightness turned over (forced dark mode); nothing cut off at 320, 390 and 740;
//   no small text; pictures load and have words; no markup mail programs remove.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
import { NOTICES } from '../src/notices/data.ts'
import { compile } from '../src/compiler/compile.ts'
import { readyDesigns } from './designs.mjs'

const shots = process.argv.includes('--shots')
const samples = JSON.parse(readFileSync(new URL('../src/samples.json', import.meta.url))).samples
const out = new URL('../out/look/', import.meta.url).pathname
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
const LOGO = 'https://example.org/logo.png' // answered here, never fetched
const png = Buffer.from(process.env.LOGO_FILE ? readFileSync(process.env.LOGO_FILE) : Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'))
const br = await chromium.launch()
const ctx = await br.newContext()
await ctx.route('**/*', (r) => (r.request().url().startsWith('file:') ? r.continue() : r.request().url() === LOGO ? r.fulfill({ contentType: 'image/png', body: png }) : r.abort()))
const page = await ctx.newPage()
const look = (dark) => page.evaluate((dark) => {
  const parse = (c) => { const m = c.match(/[\d.]+/g).map(Number); return m.length < 4 || m[3] > 0 ? m.slice(0, 3) : null }
  const flip = ([r, g, b]) => { const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255, l = (mx + mn) / 2, dl = mx - mn, s = dl === 0 ? 0 : dl / (1 - Math.abs(2 * l - 1)); let h = 0; if (dl) { const [R, G, B] = [r / 255, g / 255, b / 255]; h = mx === R ? ((G - B) / dl) % 6 : mx === G ? (B - R) / dl + 2 : (R - G) / dl + 4 } const L = 1 - l * 0.9, C = (1 - Math.abs(2 * L - 1)) * s, X = C * (1 - Math.abs((((h % 2) + 2) % 2) - 1)), m = L - C / 2, k = ((Math.floor(h) % 6) + 6) % 6, v = [[C, X, 0], [X, C, 0], [0, C, X], [0, X, C], [X, 0, C], [C, 0, X]][k]; return v.map((z) => (z + m) * 255) }
  const lum = (c) => { const [r, g, b] = c.map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 }); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
  const bad = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  while (w.nextNode()) {
    const e = w.currentNode.parentElement, txt = w.currentNode.data.trim()
    if (!txt || e.closest('div[style*="display:none"]')) continue
    const cs = getComputedStyle(e); let bg = null
    for (let x = e; x && !bg; x = x.parentElement) bg = parse(getComputedStyle(x).backgroundColor)
    bg ??= [255, 255, 255]; let fg = parse(cs.color)
    if (dark) { bg = flip(bg); fg = flip(fg) }
    const [a, b] = [lum(fg), lum(bg)].sort((p, q) => q - p), ratio = (a + 0.05) / (b + 0.05)
    const size = parseFloat(cs.fontSize), large = size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700)
    if (ratio < (large ? 3 : 4.5)) bad.push(`${ratio.toFixed(2)} "${txt.slice(0, 30)}"`)
    if (size < 13) bad.push(`${size}px text "${txt.slice(0, 30)}"`)
  }
  for (const i of document.images) { if (!i.alt) bad.push('image without alt'); if (!i.naturalWidth) bad.push('image did not load ' + i.src) }
  return bad
}, dark)
const jobs = []
for (const d of readyDesigns())
  for (const n of NOTICES)
    for (const format of n.formats.filter((f) => f === 'html' || f === 'print'))
      for (const [c, s] of Object.entries(samples[n.code])) {
        if (format === 'print' && d.id !== 'classic' && d.id !== 'academic') continue
        jobs.push({ id: `${d.id}.${n.code}.${c}.${format}`, body: compile(n, d, format).sample(s[format === 'print' ? 'print' : 'email']) })
        if (n.code === 'CHECKOUT') jobs.push({ id: `${d.id}.CHECKOUT.logo.html`, body: compile(n, { ...d, perLibrary: { ...d.perLibrary, logo: LOGO } }).sample(s.email) })
      }
let failed = 0
for (const j of jobs) {
  const p = []
  if (/<svg|src="data:|<link|@import|<style|^----/im.test(j.body)) p.push('forbidden markup')
  const file = `${out}${j.id}.html`
  writeFileSync(file, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${j.id}</title></head><body style="margin:0;padding:0">${j.body}</body></html>\n`)
  for (const w of [320, 390, 740]) {
    await page.setViewportSize({ width: w, height: 800 })
    await page.goto(pathToFileURL(file).href)
    const over = await page.evaluate(() => { const W = document.documentElement.clientWidth; return document.documentElement.scrollWidth > W ? `to ${document.documentElement.scrollWidth}` : [...document.querySelectorAll('td,a,img,p,h1')].filter((e) => e.getBoundingClientRect().right > W + 0.5).length || '' })
    if (over) p.push(`overflow at ${w}: ${over}`)
    if (w === 740) { for (const b of await look(false)) p.push('light ' + b); for (const b of await look(true)) p.push('dark ' + b) }
    if (shots && w > 320) await page.screenshot({ path: `${out}${j.id}.${w}.png`, fullPage: true })
    if (shots && w === 740 && j.id.includes('ODUE.fine')) { await page.evaluate(() => { document.documentElement.style.filter = 'invert(0.92) hue-rotate(180deg)'; document.documentElement.style.background = '#fff' }); await page.screenshot({ path: `${out}${j.id}.dark.png`, fullPage: true }) }
  }
  if (p.length && ++failed <= 25) console.log(`FAIL ${j.id}\n   ${[...new Set(p)].slice(0, 6).join('\n   ')}`)
}
await br.close()
console.log(`${jobs.length - failed} of ${jobs.length} passed`)
process.exit(failed ? 1 : 0)
