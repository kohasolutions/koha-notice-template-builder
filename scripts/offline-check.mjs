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
  await page.getByText('The template for Koha').click()
  const code = page.getByLabel('Message body')
  await page.getByLabel('Library name', { exact: true }).fill('Tom & "Ann" [% x %]')
  assert.match(await code.inputValue(), /Tom &amp; &quot;Ann&quot; &#91;% x %\]/)
  const body = page.frameLocator('iframe').first().locator('body')
  await body.getByText('Tom & "Ann" [% x %]').first().waitFor()
  await body.getByText('E Street shuffle').first().waitFor()
  await page.getByRole('combobox', { name: /^Notice/ }).selectOption('HOLD')
  await body.getByText('is ready for you to collect').last().waitFor()
  // no script runs in a preview; same-origin only lets the page read its height
  for (const f of await page.locator('iframe').all()) assert.equal(await f.getAttribute('sandbox'), 'allow-same-origin')
  await page.getByRole('radio', { name: /Bold header/ }).click()
  assert.equal(await page.getByRole('radio', { name: /Bold header/ }).getAttribute('aria-checked'), 'true')
  await body.getByText('is ready for you to collect').last().waitFor()
  // a setting typed in a panel reaches the template for Koha
  await page.getByText('Boxes and button').click()
  const button = page.getByRole('group', { name: 'Button' })
  await button.getByLabel('Colour code').first().fill('#123456')
  assert.match(await code.inputValue(), /#123456/)
  await page.getByRole('button', { name: 'SMS' }).click()
  await page.locator('.kntb-text pre').getByText(/ready/).waitFor()
  assert.deepEqual(asked, [], 'the page asked the network for something')
  assert.deepEqual(errors, [])
  await page.getByRole('button', { name: 'Email', exact: true }).click()
  await page.getByLabel('Logo address').fill('https://example.org/logo.png') // the one exception: the library's own logo
  await body.locator('img').waitFor({ state: 'attached' })
  await page.waitForTimeout(300)
  assert.deepEqual([...new Set(asked)], ['https://example.org/logo.png'])
  console.log('[offline] works from the disk; nothing but a typed logo is requested')
} finally {
  await browser.close()
}
