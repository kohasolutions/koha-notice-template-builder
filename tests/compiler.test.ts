import { describe, expect, test } from 'vitest'
import { compile } from '../src/compiler/compile.ts'
import { DEFAULT, safe } from '../src/compiler/design.ts'
import { html, url } from '../src/compiler/escape.ts'
import { NOTICES } from '../src/compiler/notices.ts'
import { toKoha, toSample } from '../src/compiler/print.ts'
import { field, raw, repeat, text, when } from '../src/compiler/nodes.ts'
import samples from '../src/samples.json'
// @ts-expect-error plain script shared with the live proof
import * as proof from '../scripts/designs.mjs'
import type { Design } from '../src/compiler/design.ts'

const { HARD, designs } = proof as unknown as { HARD: string[]; designs: (n: number) => Design[] }

const fields = { a: { tt: 'x.a', label: 'A' }, p: { tt: "K.p", label: 'P', use: ['K'] }, i: { tt: 'x.i', label: 'I', perItem: true } }

describe('typed text', () => {
  test.each(HARD)('%j cannot become Koha code and reads back as typed', (v) => {
    const out = html(v)
    for (const bad of ['[%', '<<', '----', '<', '\n', '"']) expect(out).not.toContain(bad)
    const back = out.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#91;/g, '[').replace(/&#45;/g, '-').replace(/&amp;/g, '&')
    expect(back).toBe(v.replace(/\s+/g, ' ').trim())
  })
  test('only web and mail addresses are links', () => {
    expect(url('https://e.org')).toBe('https://e.org')
    for (const v of ['javascript:alert(1)', 'data:text/html,x', 'x', 'https://e.org/a b']) expect(url(v)).toBeNull()
    expect(url('mailto:a@e.org', ['https:'])).toBeNull()
  })
})

describe('the two outputs', () => {
  const nodes = [raw('<b>'), text('A & B'), raw('</b>'), when('p', [field('a')], [raw('none')]), repeat([field('i')])]
  test('Template Toolkit', () => {
    expect(toKoha(nodes, fields)).toBe('[%- USE K -%]<b>A &amp; B</b>[% IF K.p %][% x.a %][% ELSE %]none[% END %]\n----\n[% x.i %]\n----\n')
  })
  test('sample', () => {
    expect(toSample(nodes, fields, { fields: { a: '1', p: 'y' }, items: [{ i: 'x' }, { i: 'y' }] })).toBe('<b>A &amp; B</b>1\nx\ny\n')
    expect(toSample(nodes, fields, { fields: { a: '1', p: '0' }, items: [] })).toBe('<b>A &amp; B</b>none\n')
  })
  test('an unknown field is an error, not an empty space', () => {
    expect(() => toKoha([field('zz')], fields)).toThrow('zz')
    expect(() => toSample([field('a')], fields, { fields: {}, items: [] })).toThrow('no sample')
  })
})

describe('every notice with every proof design', () => {
  for (const n of NOTICES)
    test(n.code, () => {
      for (const d of designs(80)) {
        const c = compile(n, d)
        expect(c.koha.split('----').length).toBe(n.details.some((x) => x.kind === 'repeat') ? 3 : 1)
        const tags = c.koha.match(/\[%.*?%\]/g) ?? []
        expect(tags.join('')).not.toMatch(/STOP|branchname \$/)
        expect(c.koha).not.toContain('javascript:')
        expect(c.koha).not.toContain('red;')
        expect(c.sample(samples.samples[n.code as 'HOLD'])).not.toContain('[%')
      }
    })
})

test('a design out of range becomes one that is not', () => {
  const d = safe({ ...DEFAULT, fontSize: NaN, width: 9999, radius: -1, headerColour: 'red', order: ['closing'], font: 'constructor' as 'arial' })
  expect([d.fontSize, d.width, d.radius, d.headerColour, d.font]).toEqual([12, 800, 0, '#1f4e79', 'arial'])
  expect(d.order).toEqual(['closing', 'details'])
})
