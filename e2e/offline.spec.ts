import { body, code, expect, FILE, test } from './page.ts'

test('works from the disk; nothing but a typed logo is requested', async ({ page, context }) => {
  await context.setOffline(true)
  const asked: string[] = []
  await page.route('**/*', (r) => {
    if (r.request().url() === FILE) return r.continue()
    asked.push(r.request().url())
    return r.abort()
  })
  await page.goto(FILE)
  await page.getByLabel('Library name', { exact: true }).fill('Tom & "Ann" [% x %]')
  await expect(code(page)).toHaveValue(/Tom &amp; &quot;Ann&quot; &#91;% x %\]/)
  await body(page).getByText('Tom & "Ann" [% x %]').first().waitFor()
  await body(page).getByText('E Street shuffle').first().waitFor()
  await page.getByRole('combobox', { name: /^Notice/ }).selectOption('HOLD')
  await body(page).getByText('is ready for you to collect').last().waitFor()
  // no script runs in a preview; same-origin only lets the page read its height
  for (const f of await page.locator('iframe').all()) await expect(f).toHaveAttribute('sandbox', 'allow-same-origin')
  await page.getByRole('radio', { name: /Bold header/ }).click()
  await expect(page.getByRole('radio', { name: /Bold header/ })).toHaveAttribute('aria-checked', 'true')
  // a setting typed in a panel reaches the template for Koha
  await page.getByText('Boxes and button').click()
  await page.getByRole('group', { name: 'Button' }).getByLabel('Colour, colour code', { exact: true }).fill('#123456')
  await expect(code(page)).toHaveValue(/#123456/)
  await page.getByRole('button', { name: 'SMS' }).click()
  await page.locator('.kntb-text pre').getByText(/ready/).waitFor()
  // taking it away needs no network either
  const [zip] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download all notices' }).click()])
  expect(zip.suggestedFilename()).toBe('koha-notices.zip')
  expect(asked).toEqual([])
  await page.getByRole('button', { name: 'Email', exact: true }).click()
  await page.getByLabel('Logo address').fill('https://example.org/logo.png') // the one exception: the library's own logo
  await body(page).locator('img').waitFor({ state: 'attached' })
  await expect.poll(() => [...new Set(asked)]).toEqual(['https://example.org/logo.png'])
})
