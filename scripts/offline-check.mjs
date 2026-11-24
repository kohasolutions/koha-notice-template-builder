#!/usr/bin/env node
// Opens the built file from the disk with every network request refused, and uses it. Run after `npm run build`.
import { strict as assert } from 'node:assert'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const file = pathToFileURL(new URL('../dist/index.html', import.meta.url).pathname).href
const browser = await chromium.launch()
try {
  const page = await (await browser.newContext({ offline: true })).newPage()
  const asked = []
  const errors = []
  await page.route('**/*', (r) => (r.request().url() === file ? r.continue() : (asked.push(r.request().url()), r.abort())))
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(file)
  const code = page.getByLabel('Paste this into Koha')
  await page.getByLabel('Library name').fill('Tom & "Ann" [% x %]')
  assert.match(await code.inputValue(), /Tom &amp; &quot;Ann&quot; &#91;% x %\]/)
  const body = page.frameLocator('iframe').locator('body')
  await body.getByText('Tom & "Ann" [% x %]').first().waitFor()
  await body.getByText('E Street shuffle').first().waitFor()
  await page.getByRole('combobox', { name: /^Notice/ }).selectOption('HOLD')
  await body.getByText('is ready for you to collect').last().waitFor()
  assert.equal(await page.locator('iframe').getAttribute('sandbox'), '')
  assert.deepEqual(asked, [], 'the page asked the network for something')
  assert.deepEqual(errors, [])
  await page.getByLabel('Logo address').fill('https://example.org/logo.png') // the one exception: the library's own logo
  await body.locator('img').waitFor({ state: 'attached' })
  await page.waitForTimeout(300)
  assert.deepEqual([...new Set(asked)], ['https://example.org/logo.png'])
  console.log('[offline] works from the disk; nothing but a typed logo is requested')
} finally {
  await browser.close()
}
