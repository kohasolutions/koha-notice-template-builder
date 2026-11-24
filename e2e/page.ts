import { pathToFileURL } from 'node:url'
import type { Page } from '@playwright/test'
import { test as base, expect } from '@playwright/test'

export const FILE = pathToFileURL(new URL('../dist/index.html', import.meta.url).pathname).href
export const body = (page: Page) => page.locator('iframe').first().contentFrame().locator('body')
export const code = (page: Page) => page.getByLabel('Message body')
export const fullEditor = (page: Page) => page.getByRole('button', { name: 'Full editor', exact: true }).click()
/** The page, on the full editor: it opens on the ready templates. */
export async function editor(page: Page) {
  await page.goto(FILE)
  await fullEditor(page)
}
/** A test fails on any error in the page. */
export const test = base.extend<{ noErrors: undefined }>({
  noErrors: [async ({ page }, use) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await use(undefined)
    expect(errors).toEqual([])
  }, { auto: true }],
})
export { expect }
