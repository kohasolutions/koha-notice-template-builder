#!/usr/bin/env node
// Uses the built file the way a librarian would: words with a Koha value, undo, sections (added, dragged), a change
// for one notice only, a warning, and the design file out and back in. Run after `npm run build`.
import { strict as assert } from 'node:assert'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const file = pathToFileURL(new URL('../dist/index.html', import.meta.url).pathname).href
const dir = mkdtempSync(join(tmpdir(), 'kntb-'))
const browser = await chromium.launch()
try {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('dialog', (d) => void d.accept())
  await page.goto(file)
  const preview = page.frameLocator('iframe').first().locator('body')
  await page.getByText('The template for Koha').click()
  const code = page.getByLabel('Message body')
  const settled = () => page.waitForTimeout(150)

  // words, with a Koha value as a chip
  await page.getByText('Words of Checkout receipt').click()
  const greeting = page.getByRole('textbox', { name: 'Greeting' })
  await greeting.click()
  await page.keyboard.type('Hello ')
  await page.getByRole('combobox', { name: 'Insert a Koha value into Greeting' }).selectOption({ label: 'First name' })
  await preview.getByText('Hello Jane').waitFor()
  assert.match(await code.inputValue(), /Hello \[% borrower\.firstname %\]/)
  // typing into one line is one step back
  await page.getByRole('button', { name: 'Undo' }).click()
  await preview.getByText('Dear Jane').waitFor()
  await page.getByRole('button', { name: 'Redo' }).click()
  await preview.getByText('Hello Jane').waitFor()

  // sections: add a text block, write in it, drag it to the top
  await page.getByText('Sections', { exact: true }).click()
  await page.getByRole('button', { name: 'Text', exact: true }).click()
  await page.getByRole('textbox', { name: 'Text block', exact: true }).click()
  await page.keyboard.type('Closed on Friday')
  await preview.getByText('Closed on Friday').waitFor()
  const order = async () => (await preview.innerText()).indexOf('Closed on Friday') < (await preview.innerText()).indexOf('Hello Jane')
  assert.equal(await order(), false)
  const rows = page.locator('.kntb-section')
  await page.getByRole('button', { name: 'Drag Text' }).dragTo(rows.first(), { targetPosition: { x: 20, y: 5 } })
  await settled()
  assert.equal(await rows.first().locator('strong').innerText(), 'Text', 'the drag did not move the block')
  assert.equal(await order(), true)

  // a change for this notice only
  await page.getByLabel('Only Checkout receipt').check()
  await page.getByText('Boxes and button').click()
  await page.getByRole('group', { name: 'Button' }).getByLabel('Colour code').first().fill('#654321')
  assert.match(await code.inputValue(), /#654321/)
  await page.getByRole('combobox', { name: /^Notice/ }).selectOption('CHECKIN')
  await settled()
  assert.doesNotMatch(await code.inputValue(), /#654321/)
  await page.getByRole('combobox', { name: /^Notice/ }).selectOption('CHECKOUT')

  // a warning
  await page.getByLabel('All notices').check()
  await page.getByText('Page and text').click()
  await page.getByRole('group', { name: 'Text and headings' }).getByLabel('Colour code').first().fill('#eeeeee')
  await page.getByText(/Body text is hard to read/).waitFor()
  await page.getByRole('button', { name: 'Undo' }).click()
  await page.getByText(/Body text is hard to read/).waitFor({ state: 'detached' })

  // kept in the browser, saved to a file, started again, opened
  await page.getByLabel('Library name', { exact: true }).fill('Lahore Public Library')
  await page.reload()
  assert.equal(await page.getByLabel('Library name', { exact: true }).inputValue(), 'Lahore Public Library', 'not kept in the browser')
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save design file' }).click()])
  const saved = join(dir, 'design.json')
  await download.saveAs(saved)
  await page.getByRole('button', { name: 'Start again' }).click()
  assert.equal(await page.getByLabel('Library name', { exact: true }).inputValue(), '')
  await page.locator('input[type=file]').setInputFiles(saved)
  await page.getByText(/Opened design\.json/).waitFor()
  assert.equal(await page.getByLabel('Library name', { exact: true }).inputValue(), 'Lahore Public Library')
  await page.getByText('The template for Koha').click()
  assert.match(await page.getByLabel('Message body').inputValue(), /Hello \[% borrower\.firstname %\]/)
  // a file that is not a design
  await page.locator('input[type=file]').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"kind":"x"}') })
  await page.getByText('x.json is not a design file from this builder.').waitFor()

  assert.deepEqual(errors, [])
  console.log('[builder] words, undo, sections, one notice, warnings, browser and file: all work')
} finally {
  await browser.close()
  rmSync(dir, { recursive: true, force: true })
}
