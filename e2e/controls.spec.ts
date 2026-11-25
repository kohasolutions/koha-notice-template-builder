// A style for text boxes once stretched the radio buttons across their card, pushing their words to the far side.
import { editor, expect, test } from './page.ts'

for (const width of [1400, 390]) {
  test(`radio buttons and checkboxes are small and sit beside their words, ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await editor(page)
    await page.locator('details').evaluateAll((all) => { for (const d of all) d.setAttribute('open', '') })
    const found = await page.locator('input[type=radio], input[type=checkbox]').evaluateAll((all) => all
      .filter((i) => i.getClientRects().length > 0)
      .map((i) => {
        const box = i.getBoundingClientRect()
        const label = i.closest('label')
        const words = label ? Array.from(label.childNodes).find((n) => n !== i && n.textContent?.trim()) : undefined
        let gap = 0
        if (words) { const r = document.createRange(); r.selectNodeContents(words); gap = r.getBoundingClientRect().left - box.right }
        return { type: i.getAttribute('type'), width: box.width, height: box.height, gap }
      }))
    expect(found.some((f) => f.type === 'radio')).toBe(true)
    expect(found.filter((f) => f.width > 24 || f.height > 24 || f.gap > 24)).toEqual([])
  })
}
