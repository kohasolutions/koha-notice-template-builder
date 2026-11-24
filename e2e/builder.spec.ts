// Used the way a librarian would: words with a Koha value, undo, sections (added, dragged), a change for one notice
// only, a warning, and the design file out and back in.
import { body, code, expect, FILE, test } from './page.ts'

test('words, undo, sections, one notice, warnings, browser and file', async ({ page }, testInfo) => {
  page.on('dialog', (d) => void d.accept())
  await page.goto(FILE)
  const preview = body(page)

  // words, with a Koha value as a chip
  await page.getByText('Words of Checkout receipt').click()
  const greeting = page.getByRole('textbox', { name: 'Greeting' })
  await greeting.click()
  await page.keyboard.type('Hello ')
  await page.getByRole('combobox', { name: 'Insert a Koha value into Greeting' }).selectOption({ label: 'First name' })
  await preview.getByText('Hello Jane').waitFor()
  await expect(code(page)).toHaveValue(/Hello \[% borrower\.firstname %\]/)
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
  await expect.poll(order).toBe(false)
  const rows = page.locator('.kntb-section')
  await page.getByRole('button', { name: 'Drag Text' }).dragTo(rows.first(), { targetPosition: { x: 20, y: 5 } })
  await expect(rows.first().locator('strong')).toHaveText('Text')
  await expect.poll(order).toBe(true)

  // a change for this notice only
  await page.getByLabel('Only Checkout receipt').check()
  await page.getByText('Boxes and button').click()
  await page.getByRole('group', { name: 'Button' }).getByLabel('Colour, colour code', { exact: true }).fill('#654321')
  await expect(code(page)).toHaveValue(/#654321/)
  await page.getByRole('combobox', { name: /^Notice/ }).selectOption('CHECKIN')
  await expect(code(page)).not.toHaveValue(/#654321/)
  await page.getByRole('combobox', { name: /^Notice/ }).selectOption('CHECKOUT')

  // a warning
  await page.getByLabel('All notices').check()
  await page.getByText('Page and text').click()
  await page.getByRole('group', { name: 'Text and headings' }).getByLabel('Text colour, colour code', { exact: true }).fill('#eeeeee')
  await page.getByText(/Body text is hard to read/).waitFor()
  await page.getByRole('button', { name: 'Undo' }).click()
  await page.getByText(/Body text is hard to read/).waitFor({ state: 'detached' })

  // kept in the browser, saved to a file, started again, opened
  await page.getByLabel('Library name', { exact: true }).fill('Lahore Public Library')
  await page.reload()
  await expect(page.getByLabel('Library name', { exact: true })).toHaveValue('Lahore Public Library')
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save design file' }).click()])
  const saved = testInfo.outputPath('design.json')
  await download.saveAs(saved)
  await page.getByRole('button', { name: 'Start again' }).click()
  await expect(page.getByLabel('Library name', { exact: true })).toHaveValue('')
  await page.locator('input[type=file]').setInputFiles(saved)
  await page.getByText(/Opened design\.json/).waitFor()
  await expect(page.getByLabel('Library name', { exact: true })).toHaveValue('Lahore Public Library')
  await expect(code(page)).toHaveValue(/Hello \[% borrower\.firstname %\]/)
  // a file that is not a design
  await page.locator('input[type=file]').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"kind":"x"}') })
  await page.getByText('x.json is not a design file from this builder.').waitFor()
})
