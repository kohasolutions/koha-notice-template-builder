import { describe, expect, test } from 'vitest'
import { compile } from '../src/compiler/compile.ts'
import type { Group } from '../src/compiler/design.ts'
import { FONTS, SPEC } from '../src/compiler/design.ts'
import { EXAMPLE_LIBRARY } from '../src/compiler/example.ts'
import { READY } from '../src/compiler/ready.ts'
import { GROUP, OPTION, SETTING } from '../src/builder/labels.ts'
import { initial, notice, reduce, sampleFor, situations } from '../src/builder/state.ts'
import { NOTICES } from '../src/notices/data.ts'

describe('every setting is on the screen in words', () => {
  test('each group and each setting has a label', () => {
    for (const [g, rules] of Object.entries(SPEC)) {
      expect(GROUP[g as Group], g).toBeTruthy()
      for (const k of Object.keys(rules)) expect(SETTING[g as Group][k], `${g}.${k}`).toBeTruthy()
    }
  })
  test('no label for a setting that does not exist', () => {
    for (const [g, labels] of Object.entries(SETTING)) for (const k of Object.keys(labels)) expect(Object.hasOwn(SPEC[g as Group], k), `${g}.${k}`).toBe(true)
  })
  test('each choice has words', () => {
    for (const rules of Object.values(SPEC))
      for (const r of Object.values(rules)) if (r.is === 'one' || r.is === 'list') for (const o of r.of) expect(OPTION[o], o).toBeTruthy()
    for (const f of Object.keys(FONTS)) expect(OPTION[f], f).toBeTruthy()
  })
})

describe('the builder state', () => {
  test('starts on a notice Koha printed a sample for', () => {
    const s = initial()
    expect(sampleFor(s)).toBeDefined()
  })
  test('a ready design changes the look and keeps the library', () => {
    let s = reduce(initial(), { type: 'library', key: 'name', value: 'Lahore Public Library' })
    s = reduce(s, { type: 'links', links: [{ label: 'Catalogue', href: 'https://x.example/' }] })
    const other = READY[3]
    if (!other) throw new Error('needs four designs')
    s = reduce(s, { type: 'ready', id: other.id })
    expect(s.readyId).toBe(other.id)
    expect(s.design.page.bg).toBe(other.page.bg)
    expect(s.design.perLibrary.name).toBe('Lahore Public Library')
    expect(s.design.perLibrary.links).toHaveLength(1)
    expect(reduce(s, { type: 'ready', id: 'nope' })).toBe(s)
  })
  test('a setting changes only itself; a name that is not a setting changes nothing', () => {
    const s = initial()
    const t = reduce(s, { type: 'set', group: 'button', key: 'bg', value: '#123456' })
    expect(t.design.button.bg).toBe('#123456')
    expect(t.design.button.text).toBe(s.design.button.text)
    expect(t.design.header).toBe(s.design.header)
    expect(reduce(s, { type: 'set', group: 'button', key: '__proto__', value: 1 })).toBe(s)
  })
  test('the example fills only what is empty', () => {
    let s = reduce(initial(), { type: 'library', key: 'phone', value: '042 111' })
    s = reduce(s, { type: 'example' })
    expect(s.design.perLibrary.phone).toBe('042 111')
    expect(s.design.perLibrary.address).toBe(EXAMPLE_LIBRARY.address)
    expect(s.design.perLibrary.social).toEqual(EXAMPLE_LIBRARY.social)
    expect(s.design.perLibrary.name).toBe('')
  })
  test('another notice starts on its first situation, in a format it has', () => {
    let s = reduce(initial(), { type: 'format', format: 'print' })
    expect(s.format).toBe('html') // CHECKOUT has no print version
    s = reduce(s, { type: 'notice', code: 'ODUE' })
    s = reduce(s, { type: 'situation', situation: situations('ODUE')[2] ?? '' })
    s = reduce(s, { type: 'format', format: 'print' })
    expect(s.format).toBe('print')
    s = reduce(s, { type: 'notice', code: 'CHECKOUT' })
    expect([s.situation, s.format]).toEqual([situations('CHECKOUT')[0], 'html'])
  })
  test('every notice, situation and format the screen offers has a sample and compiles', () => {
    for (const n of NOTICES)
      for (const situation of situations(n.code))
        for (const format of n.formats) {
          const s = { ...initial(), code: n.code, situation, format }
          const sample = sampleFor(s)
          expect(sample, `${n.code} ${situation} ${format}`).toBeDefined()
          if (sample) expect(compile(notice(n.code), s.design, format).sample(sample).length).toBeGreaterThan(0)
        }
  })
})
