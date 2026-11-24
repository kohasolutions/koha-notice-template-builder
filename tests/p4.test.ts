import { describe, expect, test } from 'vitest'
import { compile, compileSubject } from '../src/compiler/compile.ts'
import type { Design } from '../src/compiler/design.ts'
import { READY } from '../src/compiler/ready.ts'
import { FILE_KIND, read, toFile } from '../src/builder/file.ts'
import { DEPTH, start, step } from '../src/builder/history.ts'
import type { State } from '../src/builder/state.ts'
import { effective, hasOwn, initial, notice, reduce, sampleFor, wordsOf } from '../src/builder/state.ts'
import { contrast, contrastWarnings, smsParts, smsWarnings, subjectWarnings } from '../src/builder/warnings.ts'
import { fromDoc, plainStandard, standardWords, toDoc, values } from '../src/builder/words-doc.ts'

const at = (code: string, more: Partial<State> = {}): State => ({ ...reduce(initial(), { type: 'notice', code }), ...more })

describe('a change for one notice', () => {
  test('changes that notice only, and the others keep the look', () => {
    const s = reduce(at('ODUE', { scope: 'notice' }), { type: 'set', group: 'button', key: 'bg', value: '#aa0000' })
    expect(s.design.button.bg).toBe(initial().design.button.bg)
    expect(effective(s.design, 'ODUE').button.bg).toBe('#aa0000')
    expect(effective(s.design, 'HOLD').button.bg).toBe(initial().design.button.bg)
    expect(compile(notice('ODUE'), s.design).koha).toContain('#aa0000')
    expect(compile(notice('HOLD'), s.design).koha).not.toContain('#aa0000')
  })
  test('sections for one notice', () => {
    const s = reduce(at('HOLD', { scope: 'notice' }), { type: 'sections', sections: ['items', 'details', 'alert', { add: 'divider' }] })
    expect(effective(s.design, 'HOLD').sections).toHaveLength(4)
    expect(s.design.sections).toEqual(initial().design.sections)
  })
  test('reset takes the notice back to the look of all', () => {
    let s = reduce(at('ODUE', { scope: 'notice' }), { type: 'set', group: 'card', key: 'radius', value: 3 })
    s = reduce(s, { type: 'words', target: 'intro', value: 'Hello' })
    expect(hasOwn(s.design, 'ODUE')).toBe(true)
    s = reduce(s, { type: 'resetNotice' })
    expect(hasOwn(s.design, 'ODUE')).toBe(false)
    expect(s.design.perNotice).toEqual({})
  })
  test('words: written, read back, printed, and gone when emptied', () => {
    let s = reduce(at('CHECKOUT'), { type: 'words', target: 'greeting', value: ['Hello ', { field: 'firstname' }, '!'] })
    s = reduce(s, { type: 'words', target: 'subject', value: 'Your loans' })
    expect(wordsOf(s.design, 'CHECKOUT', 'greeting')).toEqual(['Hello ', { field: 'firstname' }, '!'])
    const sample = sampleFor(s)
    if (!sample) throw new Error('no sample')
    expect(compile(notice('CHECKOUT'), s.design).sample(sample)).toContain('Hello Jane!')
    expect(compileSubject(notice('CHECKOUT'), s.design).sample(sample)).toBe('Your loans')
    s = reduce(s, { type: 'words', target: 'greeting', value: undefined })
    s = reduce(s, { type: 'words', target: 'subject', value: undefined })
    expect(s.design.perNotice).toEqual({})
  })
})

describe('undo', () => {
  test('takes back one change, redo puts it back, and the notice on screen stays', () => {
    let h = start(initial())
    h = step(h, { type: 'set', group: 'button', key: 'bg', value: '#111111' })
    h = step(h, { type: 'notice', code: 'HOLD' })
    h = step(h, { type: 'undo' })
    expect(h.now.design.button.bg).toBe(initial().design.button.bg)
    expect(h.now.code).toBe('HOLD')
    h = step(h, { type: 'redo' })
    expect(h.now.design.button.bg).toBe('#111111')
  })
  test('typing into one field is one step; another field is another', () => {
    let h = start(initial())
    for (const v of ['L', 'La', 'Lah']) h = step(h, { type: 'library', key: 'name', value: v })
    h = step(h, { type: 'library', key: 'phone', value: '1' })
    expect(h.past).toHaveLength(2)
    h = step(step(h, { type: 'undo' }), { type: 'undo' })
    expect(h.now.design.perLibrary.name).toBe('')
  })
  test('a new change clears redo; a change to nothing is not a step', () => {
    let h = step(start(initial()), { type: 'set', group: 'button', key: 'bg', value: '#111111' })
    h = step(h, { type: 'undo' })
    h = step(h, { type: 'ready', id: READY[2]?.id ?? '' })
    expect(h.future).toHaveLength(0)
    expect(step(h, { type: 'set', group: 'button', key: 'nope', value: 1 })).toBe(h)
  })
  test('changes that are not typing are a step each', () => {
    let h = start(initial())
    h = step(h, { type: 'ready', id: READY[1]?.id ?? '' })
    h = step(h, { type: 'ready', id: READY[2]?.id ?? '' })
    expect(h.past).toHaveLength(2)
    expect(step(h, { type: 'undo' }).now.readyId).toBe(READY[1]?.id)
  })
  test('remembers at most DEPTH steps', () => {
    let h = start(initial())
    for (let i = 0; i < DEPTH + 20; i++) h = step(h, { type: 'ready', id: READY[i % READY.length]?.id ?? '' })
    expect(h.past.length).toBeLessThanOrEqual(DEPTH)
  })
})

describe('the design file', () => {
  const made = (): Design => {
    let s = reduce(at('ODUE', { scope: 'notice' }), { type: 'set', group: 'items', key: 'style', value: 'table' })
    s = reduce(s, { type: 'words', target: 'title', value: ['Overdue at ', { field: 'library' }] })
    s = reduce(s, { type: 'sections', sections: ['greeting', { add: 'spacer', px: 30 }, 'items', 'details', 'alert'] })
    s = reduce(s, { type: 'library', key: 'name', value: 'Lahore Public Library' })
    s = reduce(s, { type: 'social', social: [{ network: 'X', href: 'https://x.com/l', icon: 'https://e.org/i.png' }] })
    return s.design
  }
  test('what is exported comes back the same', () => {
    const d = made()
    const id = initial().readyId
    const back = read(JSON.parse(JSON.stringify(toFile(d, id))))
    expect(back?.readyId).toBe(id)
    expect(back?.design).toEqual(d)
  })
  test('a file with only some settings keeps the ready design\'s others', () => {
    const r = READY[1]
    if (!r) throw new Error('needs two designs')
    const back = read({ kind: FILE_KIND, version: 1, readyId: r.id, design: { button: { bg: '#123456' } } })
    expect(back?.design.button).toEqual({ ...r.button, bg: '#123456' })
    expect(back?.design.header).toEqual(r.header)
    expect(back?.design.sections).toEqual(r.sections)
  })
  test('not a design file, or a newer one: nothing', () => {
    for (const v of [null, 1, 'x', [], {}, { kind: 'other', version: 1, design: {} }, { kind: FILE_KIND, version: 99, design: {} }, { kind: FILE_KIND, version: 1 }]) expect(read(v)).toBeNull()
  })
  test('hostile content: only the shape of a design is kept', () => {
    const v: unknown = JSON.parse(`{"kind":"${FILE_KIND}","version":1,"readyId":"nope","design":{
      "__proto__":{"polluted":1},"button":{"bg":"red;} [% x %]","evil":"x","__proto__":{"y":1}},
      "sections":["items","nope",{"add":"script","src":"x"},{"add":"spacer","px":"9"},{"add":"text","words":[{"field":"firstname"},{"x":1},"hi"]}],
      "perLibrary":{"name":123,"links":[{"label":"a","href":"javascript:alert(1)"},"bad"],"social":"x","extra":"y"},
      "perNotice":{"NOPE":{"subject":"x"},"ODUE":{"subject":{"not":"words"},"wording":{"intro":"Hi","bad":"x"},"overrides":{"card":{"radius":"x","zz":1}}}}}}`)
    const r = read(v)
    if (!r) throw new Error('read nothing')
    const d = r.design as unknown as Record<string, unknown>
    expect(r.readyId).toBe(READY[0]?.id)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    expect(Object.keys(d.button as object)).not.toContain('evil')
    expect(r.design.sections).toEqual(['items', { add: 'spacer', px: 16 }, { add: 'text', words: [{ field: 'firstname' }, 'hi'] }])
    expect(r.design.perLibrary.name).toBe('')
    expect(r.design.perLibrary.social).toEqual([])
    expect(Object.keys(r.design.perNotice)).toEqual(['ODUE'])
    expect(r.design.perNotice.ODUE).toEqual({ wording: { intro: 'Hi' }, overrides: { card: { radius: 'x' } } })
    // and it still compiles to something safe: the bad colour and the javascript: link are left out
    const out = compile(notice('ODUE'), r.design).koha
    expect(out).not.toContain('javascript:')
    expect(out).not.toContain('[% x %]')
  })
})

describe('warnings', () => {
  test('contrast is WCAG\'s', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2)
  })
  test('no ready design warns about its own colours', () => {
    for (const r of READY) {
      const s = reduce(initial(), { type: 'ready', id: r.id })
      expect(contrastWarnings(s.design, 'ODUE').map((w) => w.text), r.id).toEqual([])
    }
  })
  test('pale text on white is a warning, for that notice only when set for it', () => {
    const s = reduce(at('ODUE', { scope: 'notice' }), { type: 'set', group: 'type', key: 'text', value: '#dddddd' })
    expect(contrastWarnings(s.design, 'ODUE').map((w) => w.id)).toContain('contrast Body text')
    expect(contrastWarnings(s.design, 'HOLD')).toEqual([])
  })
  test('SMS parts: 160 and 153 in the SMS alphabet, 70 and 67 outside it, extension characters count twice', () => {
    expect(smsParts('a'.repeat(160))).toMatchObject({ parts: 1, unicode: false })
    expect(smsParts('a'.repeat(161)).parts).toBe(2)
    expect(smsParts('€'.repeat(80))).toMatchObject({ parts: 1, units: 160 })
    expect(smsParts('ک'.repeat(70))).toMatchObject({ parts: 1, unicode: true })
    expect(smsParts('ک'.repeat(71)).parts).toBe(2)
    expect(smsParts('').parts).toBe(0)
  })
  test('a long library name can push an SMS past two parts', () => {
    expect(smsWarnings(initial().design, 'ODUE')).toEqual([])
    const s = reduce(at('ODUE'), { type: 'library', key: 'name', value: 'کتب خانہ '.repeat(12) })
    expect(smsWarnings(s.design, 'ODUE').map((w) => w.id)).toEqual(['sms'])
  })
  test('a subject longer than Koha keeps', () => {
    const s = reduce(at('CHECKOUT'), { type: 'words', target: 'subject', value: 'x'.repeat(201) })
    expect(subjectWarnings(s.design, 'CHECKOUT').map((w) => w.id)).toEqual(['subject'])
    expect(subjectWarnings(reduce(s, { type: 'words', target: 'subject', value: 'x'.repeat(200) }).design, 'CHECKOUT')).toEqual([])
  })
})

describe('words in the editor', () => {
  const n = notice('CHECKOUT')
  test('values are the ones the notice offers to typed words', () => {
    const v = values(n).map((x) => x.field)
    expect(v).toContain('firstname')
    for (const f of v) expect(n.fields[f]?.loop).toBeUndefined()
  })
  test('to the document and back', () => {
    for (const w of ['Hello', ['Dear ', { field: 'firstname' }, ','], [{ field: 'library' }]] as const) expect(fromDoc(toDoc(w, n))).toEqual(w)
    expect(fromDoc(toDoc(undefined, n))).toBeUndefined()
    expect(fromDoc(toDoc('   ', n))).toBeUndefined()
    expect(fromDoc(toDoc(['a', { field: 'not-a-value' }, 'b'], n))).toBe('ab')
  })
  test('the standard words, plain and as words', () => {
    expect(plainStandard('Dear {firstname},', n)).toBe('Dear [First name],')
    expect(standardWords('Dear {firstname},', n)).toEqual(['Dear ', { field: 'firstname' }, ','])
    expect(standardWords('{?x}a{/}', n)).toBeNull()
  })
})
