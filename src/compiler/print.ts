import { html } from './escape.ts'
import type { Field, Fields, Node, Sample } from './nodes.ts'

function need(fields: Fields, id: string): Field {
  const f = fields[id]
  if (!f) throw new Error(`unknown field "${id}"`)
  return f
}

const uses = (nodes: Node[], fields: Fields): string[] =>
  nodes.flatMap((n) =>
    n.kind === 'field'
      ? (need(fields, n.id).use ?? [])
      : n.kind === 'if'
        ? [...(need(fields, n.id).use ?? []), ...uses(n.then, fields), ...uses(n.otherwise, fields)]
        : n.kind === 'repeat'
          ? uses(n.body, fields)
          : [],
  )

/** The Template Toolkit text to paste into Koha. */
export function toKoha(nodes: Node[], fields: Fields): string {
  const plugins = [...new Set(uses(nodes, fields))].sort()
  const walk = (list: Node[]): string =>
    list
      .map((n): string => {
        switch (n.kind) {
          case 'raw':
            return n.html
          case 'text':
            return html(n.value)
          case 'field':
            return `[% ${need(fields, n.id).tt} %]`
          case 'if':
            return `[% IF ${need(fields, n.id).tt} %]${walk(n.then)}${n.otherwise.length ? `[% ELSE %]${walk(n.otherwise)}` : ''}[% END %]`
          case 'repeat':
            return `\n----\n${walk(n.body)}\n----\n`
        }
      })
      .join('')
  return plugins.map((p) => `[%- USE ${p} -%]`).join('') + walk(nodes)
}

/** The notice as the sample reader gets it. Field values are printed as Koha printed them: Koha does not encode them. */
export function toSample(nodes: Node[], fields: Fields, sample: Sample): string {
  const walk = (list: Node[], item: Readonly<Record<string, string>>): string => {
    const value = (id: string): string => {
      const v = need(fields, id).perItem ? item[id] : sample.fields[id]
      if (v === undefined) throw new Error(`no sample for "${id}"`)
      return v
    }
    return list
      .map((n): string => {
        switch (n.kind) {
          case 'raw':
            return n.html
          case 'text':
            return html(n.value)
          case 'field':
            return value(n.id)
          case 'if': // Template Toolkit's idea of false
            return walk(['', '0'].includes(value(n.id)) ? n.otherwise : n.then, item)
          case 'repeat':
            return '\n' + sample.items.map((i) => walk(n.body, i) + '\n').join('')
        }
      })
      .join('')
  }
  return walk(nodes, sample.items[0] ?? {})
}
