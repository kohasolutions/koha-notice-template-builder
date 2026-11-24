import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { editor, expect, test } from './page.ts'

// the notices in the frames have their own checks (scripts/look.mjs)
const problems = async (page: Page) => (await new AxeBuilder({ page }).setLegacyMode().exclude('iframe').analyze()).violations.map((v) => `${v.id} (${v.impact ?? ''}): ${v.nodes.slice(0, 3).map((n) => n.html.slice(0, 140)).join(' | ')}`)

for (const colorScheme of ['light', 'dark'] as const)
  test(`axe finds nothing, ${colorScheme}, every panel open`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    await editor(page)
    expect(await problems(page)).toEqual([])
    await page.evaluate(() => { for (const d of document.querySelectorAll('details')) d.open = true })
    await page.getByRole('button', { name: 'Add a link' }).click()
    await page.getByRole('button', { name: 'Add a social link' }).click()
    for (const b of ['Text', 'Notice box', 'Divider', 'Space', 'Image', 'Extra button', 'Two columns']) await page.getByRole('button', { name: b, exact: true }).click()
    await page.getByRole('group', { name: 'Text and headings' }).getByLabel('Text colour, colour code', { exact: true }).fill('#eeeeee')
    await page.getByText(/Body text is hard to read/).waitFor()
    expect(await problems(page)).toEqual([])
    for (const f of ['Plain-text email', 'SMS']) {
      await page.getByRole('button', { name: f, exact: true }).click()
      expect(await problems(page)).toEqual([])
    }
    await page.evaluate(() => { window.location.hash = '#design=x' })
    await page.getByText(/no design that can be read/).waitFor()
    expect(await problems(page)).toEqual([])
  })

test('phone: axe finds nothing and the page does not scroll sideways', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await editor(page)
  expect(await problems(page)).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
})

test('keyboard: designs are one stop, arrows go round, a notice can be copied', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await editor(page)
  const radios = page.getByRole('radio', { name: /./ }).and(page.locator('.kntb-design'))
  await radios.first().focus()
  await page.keyboard.press('ArrowRight')
  await expect(radios.nth(1)).toBeFocused()
  await expect(radios.nth(1)).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await expect(radios.last()).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(page.locator('.kntb-design:focus')).toHaveCount(0)
  await page.getByRole('button', { name: 'Copy body' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText('Copied', { exact: true })).toBeVisible()
})
