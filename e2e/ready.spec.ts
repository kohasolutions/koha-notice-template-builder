// The first screen, used by a librarian in a hurry.
import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { strFromU8, unzipSync } from 'fflate'
import { code, expect, FILE, test } from './page.ts'

const big = (page: Page) => page.locator('.kntb-frame iframe').first().contentFrame().locator('body')

test('notice, design, details, switches, copy', async ({ page, context }, testInfo) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto(FILE)
  await page.getByRole('button', { name: 'First overdue notice', exact: true }).click()
  await page.getByLabel('Library name', { exact: true }).fill('Lahore Public Library')
  await page.getByRole('textbox', { name: 'Opening hours' }).fill('Mon to Fri 9–5')
  // every design shows the notice with the library's own details
  for (const f of await page.locator('.kntb-thumb iframe').all()) expect(await f.getAttribute('srcdoc')).toContain('Lahore Public Library')
  // and the pictures are really painted: a design that is seen has more than one colour in it
  const shot = await page.locator('.kntb-thumb-window').first().screenshot()
  const colours = await page.evaluate(async (b64) => {
    const img = new Image()
    img.src = `data:image/png;base64,${b64}`
    await img.decode()
    const c = new OffscreenCanvas(img.width, img.height).getContext('2d')
    if (!c) return 0
    c.drawImage(img, 0, 0)
    const d = c.getImageData(8, 8, img.width - 16, img.height - 16).data
    const seen = new Set<string>()
    for (let i = 0; i < d.length; i += 4) seen.add(`${d[i] ?? 0},${d[i + 1] ?? 0},${d[i + 2] ?? 0}`)
    return seen.size
  }, shot.toString('base64'))
  expect(colours).toBeGreaterThan(20)
  await page.getByRole('radio', { name: /School/ }).click()
  await big(page).getByText('E Street shuffle').waitFor()
  await big(page).getByText('KNT-ITEM-1').waitFor()
  await page.getByRole('checkbox', { name: 'Barcode' }).uncheck()
  await expect(big(page).getByText('KNT-ITEM-1')).toHaveCount(0)
  await page.getByRole('checkbox', { name: 'Opening hours' }).uncheck()
  await expect(big(page).getByText('Mon to Fri 9–5')).toHaveCount(0)
  // another design keeps the switches
  await page.getByRole('radio', { name: /Dark header/ }).click()
  await expect(page.getByRole('checkbox', { name: 'Barcode' })).not.toBeChecked()
  await expect(big(page).getByText('KNT-ITEM-1')).toHaveCount(0)
  await page.getByRole('button', { name: 'Copy body' }).click()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied).toContain('Lahore Public Library')
  expect(copied).toContain('[% ')
  expect(copied).not.toContain('barcode')
  expect(copied).not.toContain('Jane') // the sample person is never in what goes into Koha
  // undo, then the full editor with the same choices, and back
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByRole('radio', { name: /School/ })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('button', { name: 'Change more' }).click()
  await expect(page.getByLabel('Library name', { exact: true })).toHaveValue('Lahore Public Library')
  await expect(code(page)).not.toHaveValue(/barcode/)
  await page.getByRole('button', { name: 'Ready templates' }).click()
  await expect(page.getByRole('checkbox', { name: 'Barcode' })).not.toBeChecked()
  const [d] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download all notices' }).click()])
  await d.saveAs(testInfo.outputPath('n.zip'))
  const files = unzipSync(readFileSync(testInfo.outputPath('n.zip')))
  expect(strFromU8(files['koha-notices/ODUE/email.html.tt'] ?? new Uint8Array())).toBe(await code(page).inputValue())
})

test('a change for one notice in the full editor is named on the first screen', async ({ page }) => {
  await page.goto(FILE)
  await page.getByRole('button', { name: 'Full editor' }).click()
  await page.getByLabel('Only Checkout receipt').check()
  await page.getByText('Items list').click()
  await page.getByRole('checkbox', { name: 'Barcode' }).uncheck()
  await page.getByRole('button', { name: 'Ready templates' }).click()
  await expect(page.getByText(/has changes of its own from the full editor/)).toBeVisible()
  await page.getByRole('button', { name: 'Remove them' }).click()
  await big(page).getByText('KNT-ITEM-1').waitFor()
})

for (const [name, colorScheme, width] of [['light', 'light', 1280], ['dark', 'dark', 1280], ['phone', 'light', 390], ['small phone', 'light', 320]] as const)
  test(`axe finds nothing, ${name}; no sideways scroll`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    await page.setViewportSize({ width, height: 844 })
    await page.goto(FILE)
    const r = await new AxeBuilder({ page }).setLegacyMode().exclude('iframe').analyze()
    expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 160) ?? ''}`)).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  })

test('keyboard: the designs are one stop and the arrows go round', async ({ page }) => {
  await page.goto(FILE)
  const all = page.locator('.kntb-thumb-pick')
  await all.first().focus()
  await page.keyboard.press('ArrowLeft')
  await expect(all.last()).toBeFocused()
  await expect(all.last()).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('ArrowRight')
  await expect(all.first()).toHaveAttribute('aria-checked', 'true')
})
