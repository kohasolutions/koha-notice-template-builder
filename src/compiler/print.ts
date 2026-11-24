import { html, plain, plainTT } from './escape.ts'
import type { Field, Loop, Model, Node, Row, Sample } from './nodes.ts'

/** html: an HTML letter. text: a text email, an SMS or a subject line. */
export type Mode = 'html' | 'text'

function need(m: Model, id: string): Field {
  const f = m.fields[id]
  if (!f) throw new Error(`unknown field "${id}"`)
  return f
}
function loopOf(m: Model, id: string): Loop {
  const l = m.loops[id]
  if (!l) throw new Error(`unknown list "${id}"`)
  return l
}

/** What must stand before the text: plugins and preparation, each once. */
function before(nodes: Node[], m: Model): string {
  const use = new Set<string>()
  const pre = new Set<string>()
  const take = (id: string) => {
    const f = need(m, id)
    f.use?.forEach((u) => use.add(u))
    if (f.pre) pre.add(f.pre)
  }
  const walk = (list: Node[]) => {
    for (const n of list) {
      if (n.kind === 'field') take(n.id)
      else if (n.kind === 'if') {
        take(n.id)
        walk(n.then)
        walk(n.otherwise)
      } else if (n.kind === 'repeat') {
        const p = loopOf(m, n.loop).pre
        if (p) pre.add(p)
        walk(n.body)
      }
    }
  }
  walk(nodes)
  return [...use].sort().map((u) => `[%- USE ${u} -%]`).join('') + [...pre].map((p) => `[%- ${p} -%]`).join('')
}

const BREAK = { html: '<br>', text: '\n' } as const

/** The Template Toolkit text to paste into Koha. */
export function toKoha(nodes: Node[], m: Model, mode: Mode): string {
  const walk = (list: Node[]): string =>
    list
      .map((n): string => {
        switch (n.kind) {
          case 'raw':
            return n.html
          case 'text':
            return mode === 'html' ? html(n.value) : plainTT(n.value)
          case 'br':
            return BREAK[mode]
          case 'strong':
            return mode === 'html' ? (n.on ? '<strong>' : '</strong>') : ''
          case 'field':
            return `[% ${need(m, n.id).tt} %]`
          case 'if':
            return `[% IF ${need(m, n.id).tt} %]${walk(n.then)}${n.otherwise.length ? `[% ELSE %]${walk(n.otherwise)}` : ''}[% END %]`
          case 'repeat': {
            const l = loopOf(m, n.loop)
            return l.digest ? `\n----\n${walk(n.body)}\n----\n` : `[% FOREACH ${l.each ?? ''} %]${walk(n.body)}[% END %]`
          }
        }
      })
      .join('')
  return before(nodes, m) + walk(nodes)
}

/** The notice as the sample reader gets it. Field values are printed as Koha printed them: Koha does not encode them. */
export function toSample(nodes: Node[], m: Model, sample: Sample, mode: Mode): string {
  const walk = (list: Node[], rows: Readonly<Record<string, Row>>): string => {
    const value = (id: string): string => {
      const f = need(m, id)
      const v = f.loop ? rows[f.loop]?.[id] : sample.fields[id]
      if (v === undefined) throw new Error(`no sample for "${id}"`)
      return v
    }
    return list
      .map((n): string => {
        switch (n.kind) {
          case 'raw':
            return n.html
          case 'text':
            return mode === 'html' ? html(n.value) : plain(n.value)
          case 'br':
            return BREAK[mode]
          case 'strong':
            return mode === 'html' ? (n.on ? '<strong>' : '</strong>') : ''
          case 'field':
            return value(n.id)
          case 'if': // Template Toolkit's idea of false
            return walk(['', '0'].includes(value(n.id)) ? n.otherwise : n.then, rows)
          case 'repeat': {
            const list = sample.loops[n.loop]
            if (!list) throw new Error(`no sample for the list "${n.loop}"`)
            const out = list.map((r) => walk(n.body, { ...rows, [n.loop]: r }))
            return loopOf(m, n.loop).digest ? '\n' + out.map((o) => o + '\n').join('') : out.join('')
          }
        }
      })
      .join('')
  }
  return walk(nodes, {})
}
