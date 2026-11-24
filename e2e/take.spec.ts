// Taking the notices away: copying, the zip, the share link.
import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'
import { strFromU8, unzipSync } from 'fflate'
import { code, expect, FILE, test } from './page.ts'

const clipboard = (page: Page) => page.evaluate(() => navigator.clipboard.readText())
const copied = (page: Page, button: string) => page.locator('.kntb-copy').filter({ has: page.getByRole('button', { name: button }) }).getByText('Copied', { exact: true })
const name = (page: Page) => page.getByLabel('Library name', { exact: true })

test.beforeEach(async ({ context }) => { await context.grantPermissions(['clipboard-read', 'clipboard-write']) })

test('copies exactly what is shown, for every format', async ({ page }) => {
  await page.goto(FILE)
  await page.getByRole('combobox', { name: /^Notice/ }).selectOption('HOLD')
  for (const format of ['Email', 'Plain-text email', 'SMS', 'Print']) {
    await page.getByRole('button', { name: format, exact: true }).click()
    const shown = await code(page).inputValue()
    expect(shown.length).toBeGreaterThan(20)
    await page.getByRole('button', { name: 'Copy body' }).click()
    await expect(copied(page, 'Copy body')).toBeVisible()
    expect(await clipboard(page)).toBe(shown)
    const subject = await page.getByLabel('Message subject').inputValue()
    expect(subject).not.toBe('')
    await page.getByRole('button', { name: 'Copy subject' }).click()
    await expect.poll(() => clipboard(page)).toBe(subject)
  }
  // "Copied" is about what was copied, not about what is shown now
  await page.getByRole('button', { name: 'Copy body' }).click()
  await expect(copied(page, 'Copy body')).toBeVisible()
  await page.getByRole('button', { name: 'Email', exact: true }).click()
  await expect(copied(page, 'Copy body')).toHaveCount(0, { timeout: 1000 }) // before it would go by itself
})

test('a refused clipboard falls back, and says so when that fails too', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('no')) } })
    Object.defineProperty(document, 'execCommand', { value: () => false })
  })
  await page.goto(FILE)
  await page.getByRole('button', { name: 'Copy body' }).click()
  await expect(page.getByText(/Not copied: select the text/)).toBeVisible()
  await page.getByRole('button', { name: 'Copy share link' }).click()
  await expect(page.getByText(/could not be copied/)).toBeVisible()
})

test('the zip holds what the page shows', async ({ page }, testInfo) => {
  await page.goto(FILE)
  await name(page).fill('Bibliothèque été')
  const [d] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download all notices' }).click()])
  const path = testInfo.outputPath('n.zip')
  await d.saveAs(path)
  const files = unzipSync(readFileSync(path))
  const file = (p: string) => strFromU8(files[`koha-notices/${p}`] ?? new Uint8Array())
  expect(file('CHECKOUT/email.html.tt')).toBe(await code(page).inputValue())
  expect(file('CHECKOUT/email.html.tt')).toContain('Bibliothèque été')
  expect(file('START-HERE.txt')).toContain('Notices and slips')
})

test('a share link: offered, opened, undone, gone from the address', async ({ page, browser }) => {
  await page.goto(FILE)
  await name(page).fill('Sender Library')
  await page.getByRole('button', { name: 'Copy share link' }).click()
  await expect(page.getByText(/Link copied/)).toBeVisible()
  const link = await clipboard(page)
  expect(link).toMatch(/^https:\/\/kohasolutions\.com\/koha-tools\/notice-template-builder#design=1\.[\w-]+$/)
  const hash = link.slice(link.indexOf('#'))

  const other = await (await browser.newContext()).newPage()
  await other.goto(FILE)
  await name(other).fill('My Own Library')
  await other.goto('about:blank')
  await other.goto(FILE + hash)
  // not opened by itself, and no longer in the address
  await expect(other.getByRole('region', { name: 'Design from a link' })).toBeVisible()
  await expect(name(other)).toHaveValue('My Own Library')
  expect(other.url()).toBe(FILE)
  await other.getByRole('button', { name: 'Open it' }).click()
  await expect(name(other)).toHaveValue('Sender Library')
  await other.getByRole('button', { name: 'Undo' }).click()
  await expect(name(other)).toHaveValue('My Own Library')
  // pasted into the address of an open builder; kept mine
  await other.evaluate((h) => { window.location.hash = h }, hash)
  await other.getByRole('button', { name: 'Keep mine' }).click()
  await expect(name(other)).toHaveValue('My Own Library')
  expect(other.url()).toBe(FILE)
  // a cut link says so
  await other.evaluate((h) => { window.location.hash = h }, hash.slice(0, 60))
  await expect(other.getByText(/no design that can be read/)).toBeVisible()
  await other.context().close()
})
