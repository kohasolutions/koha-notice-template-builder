import { describe, expect, it } from 'vitest'
import { compile } from '../src/compiler/compile.ts'
import { fromReady, NO_LIBRARY } from '../src/compiler/design.ts'
import { EXAMPLE_LIBRARY } from '../src/compiler/example.ts'
import { READY } from '../src/compiler/ready.ts'
import { isOn, PARTS, partsOf, withDesign, withPart } from '../src/builder/parts.ts'
import { initial, notice, reduce, SAMPLES } from '../src/builder/state.ts'
import { NOTICES } from '../src/notices/data.ts'

const must = <T>(x: T | undefined): T => {
  if (x === undefined) throw new Error('missing')
  return x
}
const first = must(READY[0])
const base = { ...fromReady(first), perLibrary: { ...EXAMPLE_LIBRARY, name: 'Test Library' } }
const show = (code: string, d = base, format: 'html' | 'text' | 'print' = 'html', situation?: string) => {
  const s = must(SAMPLES[code])
  const sample = must(must(s[situation ?? must(Object.keys(s)[0])])[format === 'print' ? 'print' : 'email'])
  return compile(notice(code), d, format).sample(sample)
}

describe('switching a part', () => {
  it('off and on again gives the same design, for every part of every design', () => {
    for (const r of READY) for (const p of PARTS) {
      const d = fromReady(r)
      const was = isOn(d, p.id)
      const off = withPart(d, p.id, !was, r.id)
      expect(isOn(off, p.id), `${r.id} ${p.id}`).toBe(!was)
      expect(withPart(off, p.id, was, r.id), `${r.id} ${p.id}`).toEqual(d)
    }
  })
  it('puts a part back in its place when its neighbours are off too', () => {
    let d = withPart(withPart(withPart(base, 'footer.address', false, 'classic'), 'footer.phone', false, 'classic'), 'footer.email', false, 'classic')
    d = withPart(d, 'footer.email', true, 'classic')
    d = withPart(d, 'footer.address', true, 'classic')
    expect(d.footer.show).toEqual(['address', 'email', 'hours', 'links', 'social', 'smallprint'])
  })
  it('keeps what a library added between the parts', () => {
    const d = { ...base, sections: [...base.sections.slice(0, 6), { add: 'divider' as const }, ...base.sections.slice(6)] }
    expect(withPart(withPart(d, 'section.note', false, 'classic'), 'section.note', true, 'classic').sections).toContainEqual({ add: 'divider' })
  })
  // what each switch takes out of the overdue notice, in the email, the plain text and the print
  it.each([
    ['item.author', 'Heylin, Clinton', ['html', 'text', 'print']], ['item.callnumber', 'KNT 1', ['html', 'text', 'print']], ['item.barcode', 'KNT-ITEM-1', ['html', 'text', 'print']],
    ['item.fine', 'Fine so far', ['html', 'text', 'print']], ['section.greeting', 'Dear Jane', ['html', 'text', 'print']], ['section.note', 'returned them already', ['html', 'text', 'print']],
    ['section.button', 'See or renew my loans', ['html', 'text']], ['section.closing', 'Thank you,', ['html', 'text', 'print']], ['header.tagline', 'Read, learn, meet', ['html']],
    ['footer.address', '1 Main Street', ['html', 'text', 'print']], ['footer.phone', '+1 555 0100', ['html', 'text', 'print']], ['footer.hours', 'Sat 10:00', ['html', 'text', 'print']],
    ['footer.links', 'Opening hours', ['html', 'text']], ['footer.social', 'Facebook', ['html', 'text']], ['footer.smallprint', 'You receive this', ['html', 'text', 'print']],
  ] as const)('%s', (id, words, formats) => {
    for (const f of formats) {
      // the overdue notice also asks for questions by the branch's own phone; another number tells the two apart
      const d = { ...base, perLibrary: { ...base.perLibrary, phone: '+1 555 0100' } }
      const strip = (t: string) => (id === 'footer.phone' ? t.replace(/Phone: \+1 555 0100/g, '') : t)
      expect(strip(show('ODUE', d, f, 'fine')), f).toContain(words)
      expect(strip(show('ODUE', withPart(d, id, false, 'classic'), f, 'fine')), f).not.toContain(words)
    }
  })
  it('the slip has its small print by the switch too', () => {
    expect(show('ISSUESLIP', base, 'print')).toContain('You receive this')
    expect(show('ISSUESLIP', withPart(base, 'footer.smallprint', false, 'classic'), 'print')).not.toContain('You receive this')
  })
  it('a button hidden in the full editor shows as off, and the switch brings it back', () => {
    const hidden = { ...base, button: { ...base.button, show: false } }
    expect(isOn(hidden, 'section.button')).toBe(false)
    expect(show('ODUE', withPart(hidden, 'section.button', true, 'classic'))).toContain('See or renew my loans')
  })
  it('plain text with no greeting and no first paragraph opens with the title', () => {
    const d = { ...base, sections: base.sections.filter((x) => x !== 'greeting' && x !== 'intro') }
    expect(show('HOLDDGST', d, 'text')).toMatch(/^\S/)
    expect(show('ODUE', d, 'text')).toMatch(/^Please return what is overdue\n/)
  })
  it('a password reset always has its link: nothing switches its button off', () => {
    const none = PARTS.reduce((d, p) => withPart(d, p.id, false, 'classic'), base)
    const d = { ...none, button: { ...none.button, show: false }, perNotice: { PASSWORD_RESET: { overrides: { sections: [], button: { show: false } } } } }
    for (const f of ['html', 'text'] as const) expect(show('PASSWORD_RESET', d, f)).toMatch(/uniqueKey=/)
    expect(partsOf(notice('PASSWORD_RESET')).map((p) => p.id)).not.toContain('section.button')
  })
  it('a warning, the items and their due dates stay whatever is off', () => {
    const none = PARTS.reduce((d, p) => withPart(d, p.id, false, 'classic'), base)
    for (const f of ['html', 'text', 'print'] as const) {
      const t = show('ODUE', none, f, 'fine')
      expect(t).toContain('E Street shuffle')
      expect(t).toMatch(/Was due/)
      expect(t).toContain('Fines charged so far')
    }
  })
})

describe('another design', () => {
  it('keeps the switches, the details and the words of a notice', () => {
    const mine = { ...withPart(withPart(base, 'item.barcode', false, 'classic'), 'footer.hours', false, 'classic'), perNotice: { HOLD: { title: 'Come and get it' } } }
    for (const r of READY) {
      const d = withDesign(mine, 'classic', r.id)
      expect([isOn(d, 'item.barcode'), isOn(d, 'footer.hours'), d.perLibrary, d.perNotice]).toEqual([false, false, mine.perLibrary, mine.perNotice])
      expect(d.page).toEqual(r.page)
      expect(d.sections).toEqual(r.sections)
    }
  })
  it('does not take one design’s own choice to another', () => {
    // Modern card starts without a tagline, Classic with one: nobody switched it
    expect(isOn(withDesign(fromReady(first), 'classic', 'modern-card'), 'header.tagline')).toBe(false)
    const modern = fromReady(must(READY.find((r) => r.id === 'modern-card')))
    expect(isOn(withDesign(modern, 'modern-card', 'classic'), 'header.tagline')).toBe(true)
  })
  it('there and back is the same design', () => {
    for (const r of READY) expect(withDesign(withDesign(base, 'classic', r.id), r.id, 'classic')).toEqual(base)
  })
})

it('an empty field leaves nothing behind it', () => {
  const d = { ...base, perLibrary: NO_LIBRARY }
  for (const n of NOTICES) for (const f of n.formats) {
    if (f === 'sms') continue
    const t = show(n.code, d, f)
    expect(t, `${n.code} ${f}`).not.toMatch(/Visit us|Online<|Test Library|Phone <|&middot;\s*(&nbsp;)?\s*<\/span><\/td>/)
  }
})
it('only parts a notice can show are offered, and every one of them changes it', () => {
  for (const n of NOTICES) {
    const formats = n.formats.filter((f) => f !== 'sms')
    for (const p of partsOf(n)) {
      const r = must(READY.find((x) => isOn(fromReady(x), p.id)))
      const d = { ...fromReady(r), perLibrary: { ...EXAMPLE_LIBRARY, name: 'Test Library' } }
      const changed = formats.some((f) => compile(n, d, f).koha !== compile(n, withPart(d, p.id, false, r.id), f).koha)
      expect(changed, `${n.code} ${p.id}`).toBe(true)
    }
  }
})
it('the reducer: a part, a design, and no step when nothing changes', () => {
  const s = initial()
  const off = reduce(s, { type: 'part', id: 'item.barcode', on: false })
  expect(isOn(off.design, 'item.barcode')).toBe(false)
  expect(reduce(off, { type: 'part', id: 'item.barcode', on: false })).toBe(off)
  const t = reduce(off, { type: 'template', id: 'school' })
  expect([t.readyId, isOn(t.design, 'item.barcode')]).toEqual(['school', false])
  expect(reduce(t, { type: 'template', id: 'none' })).toBe(t)
})
