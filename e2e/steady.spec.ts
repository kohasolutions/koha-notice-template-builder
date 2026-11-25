// Typing must change the previews in place: a frame that loads again flashes white on every key.
import { expect, FILE, test } from './page.ts'

test('typing the library name does not reload a preview', async ({ page }) => {
  await page.goto(FILE)
  await page.getByRole('button', { name: 'First overdue notice', exact: true }).click()
  const frames = page.locator('.kntb-frame iframe, .kntb-thumb iframe')
  await expect(frames.first()).toBeVisible()
  await page.waitForFunction(() => Array.from(document.querySelectorAll('iframe')).every((f) => f.contentDocument?.readyState === 'complete' && f.contentDocument.body.childElementCount > 0))
  // mark every shown document, and count loads from here on
  await frames.evaluateAll((all) => {
    for (const f of all as HTMLIFrameElement[]) {
      Object.assign(f.contentDocument?.body ?? {}, { kept: true })
      f.addEventListener('load', () => { f.dataset.reloaded = 'yes' })
    }
  })
  await page.getByLabel('Library name', { exact: true }).pressSequentially('Lahore Public Library', { delay: 20 })
  for (const f of await frames.all()) {
    await expect(f.contentFrame().locator('body')).toContainText('Lahore Public Library')
    expect(await f.getAttribute('data-reloaded')).toBeNull()
    expect(await f.evaluate((el) => Reflect.get((el as HTMLIFrameElement).contentDocument?.body ?? {}, 'kept') === true)).toBe(true)
  }
  // what is shown is what a fresh load of the same notice would show
  await page.getByRole('radio', { name: /School/ }).click()
  await page.getByLabel('Library name', { exact: true }).fill('')
  await expect(page.locator('.kntb-frame iframe').first().contentFrame().locator('body')).not.toContainText('Lahore Public Library')
})
