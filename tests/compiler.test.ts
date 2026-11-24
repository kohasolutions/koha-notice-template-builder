import { describe, expect, test } from 'vitest'
import { compile, compileSubject, words } from '../src/compiler/compile.ts'
import type { Design } from '../src/compiler/design.ts'
import { fromReady, safe, SPEC } from '../src/compiler/design.ts'
import { html, plain, plainTT, url } from '../src/compiler/escape.ts'
import type { Sample } from '../src/compiler/nodes.ts'
import { field, parse, raw, repeat, text, when } from '../src/compiler/nodes.ts'
import { toKoha, toSample } from '../src/compiler/print.ts'
import { BASE, READY } from '../src/compiler/ready.ts'
import { join } from '../src/compiler/words.ts'
import { NOTICES } from '../src/notices/data.ts'
import samples from '../src/samples.json'
// @ts-expect-error plain script shared with the live proof
import * as proof from '../scripts/designs.mjs'

const { HARD, randomDesigns, hardDesigns, readyDesigns } = proof as unknown as { HARD: string[]; randomDesigns: (n: number) => Design[]; hardDesigns: () => Design[]; readyDesigns: () => Design[] }
const SAMPLES = samples.samples as unknown as Record<string, Record<string, Partial<Record<'email' | 'print', Sample>>>>
const notice = (code: string) => {
  const n = NOTICES.find((x) => x.code === code)
  if (!n) throw new Error(code)
  return n
}
const model = {
  fields: { a: { tt: 'x.a' }, p: { tt: 'K.p', use: ['K'] }, i: { tt: 'x.i', loop: 'l', pre: 'n = 1' }, j: { tt: 'y.j', loop: 'm' } },
  loops: { l: { digest: true as const }, m: { each: 'y IN ys', pre: 'ys = []' } },
}

describe('typed text', () => {
  test.each(HARD)('%j cannot become Koha code and reads back as typed', (v) => {
    const out = html(v)
    for (const bad of ['[%', '<<', '----', '<', '"']) expect(out).not.toContain(bad)
    const back = out.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#91;/g, '[').replace(/&#45;/g, '-').replace(/&amp;/g, '&')
    expect(back).toBe(v)
    for (const bad of ['<<', '----']) expect(plain(v)).not.toContain(bad)
    // every opening tag left in the text is the one that prints "[%"
    expect(plainTT(v).split("[% '[%' %]").join('')).not.toContain('[%')
  })
  test('only web and mail addresses are links', () => {
    expect(url('https://e.org')).toBe('https://e.org')
    for (const v of ['javascript:alert(1)', 'data:text/html,x', 'x', 'https://e.org/a b', null, 3]) expect(url(v)).toBeNull()
    expect(url('mailto:a@e.org', ['https:'])).toBeNull()
  })
  test('a value can be put in, but only one this notice offers', () => {
    const n = notice('CHECKOUT')
    expect(words(['Dear ', { field: 'firstname' }, '!'], n)).toEqual([text('Dear '), field('firstname'), text('!')])
    expect(words([{ field: 'opac' }], n)).toBeNull()
    expect(words([{ field: 'title' }], n)).toBeNull() // one per item: it cannot stand outside the list
    expect(words([{ field: 'constructor' }], n)).toBeNull()
    expect(words('  ', n)).toBeNull()
  })
})

describe('the two outputs', () => {
  const nodes = [raw('<b>'), text('A & B'), raw('</b>'), when('p', [field('a')], [raw('none')]), repeat('l', [field('i')]), repeat('m', [field('j')])]
  test('Template Toolkit', () => {
    expect(toKoha(nodes, model, 'html')).toBe('[%- USE K -%][%- n = 1 -%][%- ys = [] -%]<b>A &amp; B</b>[% IF K.p %][% x.a %][% ELSE %]none[% END %]\n----\n[% x.i %]\n----\n[% FOREACH y IN ys %][% y.j %][% END %]')
  })
  test('sample', () => {
    expect(toSample(nodes, model, { fields: { a: '1', p: 'y' }, loops: { l: [{ i: 'x' }, { i: 'y' }], m: [{ j: '7' }] } }, 'html')).toBe('<b>A &amp; B</b>1\nx\ny\n7')
    expect(toSample(nodes, model, { fields: { a: '1', p: '0' }, loops: { l: [], m: [] } }, 'html')).toBe('<b>A &amp; B</b>none\n')
  })
  test('an unknown field or list is an error, not an empty space', () => {
    expect(() => toKoha([field('zz')], model, 'html')).toThrow('zz')
    expect(() => toKoha([repeat('zz', [])], model, 'html')).toThrow('zz')
    expect(() => toSample([field('a')], model, { fields: {}, loops: {} }, 'html')).toThrow('no sample')
  })
  test('the language of the notice data', () => {
    expect(parse('A {x}{?y}{b}B{/b}{:}C{/}\n')).toEqual([text('A '), field('x'), when('y', [{ kind: 'strong', on: true }, text('B'), { kind: 'strong', on: false }], [text('C')]), { kind: 'br' }])
    for (const bad of ['{?x}a', 'a{/}']) expect(() => parse(bad)).toThrow()
  })
  test('a separator stands only between two facts that are there', () => {
    const print = (p: string, q: string) => toSample(join([{ if: 'p', nodes: [text('P')] }, { if: 'a', nodes: [text('A')] }, { nodes: [text('Z')] }], [text('+')]), model, { fields: { p, a: q }, loops: {} }, 'text')
    expect([print('1', '1'), print('1', ''), print('', '1'), print('', '')]).toEqual(['P+A+Z', 'P+Z', 'A+Z', 'Z'])
  })
})

describe('every notice', () => {
  for (const n of NOTICES)
    test(n.code, () => {
      for (const d of [...readyDesigns(), ...randomDesigns(40), ...hardDesigns()])
        for (const f of n.formats) {
          const c = compile(n, d, f)
          const digest = Object.values(n.loops).some((l) => l.digest)
          expect(c.koha.split('----').length).toBe(digest ? 3 : 1)
          expect((c.koha.match(/\[%.*?%\]/g) ?? []).join('')).not.toMatch(/STOP|branchname \$/)
          for (const bad of ['javascript:', 'red;', '<svg', '<style', 'src="data:', '<<']) expect(c.koha).not.toContain(bad)
          for (const [name, s] of Object.entries(SAMPLES[n.code] ?? {})) {
            const sample = f === 'print' ? s.print : s.email
            if (!sample) throw new Error(`${n.code} ${name} has no sample`)
            expect(c.sample(sample).length).toBeGreaterThan(20)
          }
          expect(Array.from(compileSubject(n, d).koha).length).toBeLessThanOrEqual(200)
        }
    })
  test('a title never counts where Koha sends one message per visit', () => {
    for (const n of NOTICES.filter((x) => Object.values(x.loops).some((l) => l.digest))) expect(n.title).not.toMatch(/\d|\{/)
  })
  test('an SMS stays within two parts in every situation', () => {
    for (const n of NOTICES.filter((x) => x.formats.includes('sms')))
      for (const s of Object.values(SAMPLES[n.code] ?? {})) if (s.email) expect(compile(n, BASE, 'sms').sample(s.email).length).toBeLessThanOrEqual(320)
  })
  test('a text email never has two empty lines together', () => {
    for (const n of NOTICES.filter((x) => x.formats.includes('text')))
      for (const s of Object.values(SAMPLES[n.code] ?? {})) if (s.email) expect(compile(n, BASE, 'text').sample(s.email)).not.toMatch(/\n[ ]*\n[ ]*\n/)
  })
})

test('a subject that does not fit leaves the standard one', () => {
  const n = notice('HOLD')
  expect(compileSubject(n, { ...BASE, perNotice: { HOLD: { subject: 'x'.repeat(201) } } }).koha).toBe('Ready to collect at [% branch.branchname %]')
  for (const x of NOTICES) expect(toKoha(parse(x.subject), x, 'text').length).toBeLessThanOrEqual(200)
})

describe('designs', () => {
  test('a ready design is data that safe() leaves as it is', () => {
    expect(READY.length).toBe(8)
    for (const r of READY) {
      const d = safe(fromReady(r), BASE, 'X')
      for (const g of Object.keys(SPEC) as Array<keyof typeof SPEC>) {
        const kept = Object.entries(d[g]).filter(([k]) => (r[g] as unknown as Record<string, unknown>)[k] !== '')
        for (const [k, v] of kept) if ((r[g] as unknown as Record<string, unknown>)[k] !== undefined) expect([r.id, g, k, v]).toEqual([r.id, g, k, (r[g] as unknown as Record<string, unknown>)[k]])
      }
    }
  })
  test('a value out of range becomes one that is not', () => {
    const bad = { ...BASE, card: { ...BASE.card, width: 9999, radius: -1, bg: 'red' }, type: { ...BASE.type, size: NaN, font: 'constructor' as 'arial' }, items: { ...BASE.items, fields: [] }, sections: ['closing', 'closing'] as Design['sections'] }
    const d = safe(bad, BASE, 'X')
    expect([d.card.width, d.card.radius, d.card.bg, d.type.size, d.type.font]).toEqual([680, 0, BASE.card.bg, BASE.type.size, BASE.type.font])
    expect(d.items.fields).toEqual(['title'])
    expect(d.sections).toEqual(['closing', 'items', 'details', 'alert'])
  })
  test('one notice can differ, and only that one', () => {
    const d: Design = { ...BASE, perNotice: { HOLD: { title: 'Come and get it', overrides: { card: { bg: '#abcdef' } } } } }
    expect(compile(notice('HOLD'), d).koha).toContain('Come and get it')
    expect(compile(notice('HOLD'), d).koha).toContain('#abcdef')
    expect(compile(notice('CHECKOUT'), d).koha).not.toContain('#abcdef')
  })
  test('no layout code knows a ready design by name', async () => {
    const fs = await import('node:fs')
    const code = fs.readdirSync('src/compiler').map((f) => fs.readFileSync(`src/compiler/${f}`, 'utf8')).join()
    for (const r of READY.filter((x) => x.id.includes('-'))) expect(code).not.toContain(r.id)
  })
  test('typed words are only ever printed escaped', () => {
    const d: Design = { ...BASE, perLibrary: { ...BASE.perLibrary, name: '<i>x</i>', smallprint: '"><script>' } }
    const out = compile(notice('HOLD'), d).koha
    expect(out).not.toContain('<i>')
    expect(out).not.toContain('<script>')
  })
})
