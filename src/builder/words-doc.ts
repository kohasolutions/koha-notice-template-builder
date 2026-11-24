// Typed words with Koha values in them (design.ts Words) and the editor's document, each way. Pure, so it is tested
// without a browser. A value is a chip: one piece the person can delete but not type into, so it cannot become code.
import { CLOSING } from '../compiler/compile.ts'
import type { Words } from '../compiler/design.ts'
import type { Node } from '../compiler/nodes.ts'
import { parse } from '../compiler/nodes.ts'
import type { Notice } from '../notices/model.ts'
import type { WordTarget } from './state.ts'

export interface DocNode { type: string; text?: string; attrs?: Record<string, unknown>; content?: DocNode[] }

/** The Koha values a person may put in this notice's words: the ones compile() prints (a label, not one per item). */
export function values(n: Notice): Array<{ field: string; label: string }> {
  return Object.entries(n.fields).flatMap(([field, f]) => (f.label && !f.loop ? [{ field, label: f.label }] : []))
}

export function toDoc(w: Words | undefined, n: Notice): DocNode {
  const parts = typeof w === 'string' ? [w] : (w ?? [])
  const label = Object.fromEntries(values(n).map((v) => [v.field, v.label]))
  const content = parts.flatMap((p): DocNode[] => {
    if (typeof p === 'string') return p ? [{ type: 'text', text: p }] : []
    const l = label[p.field]
    return l ? [{ type: 'value', attrs: { field: p.field, label: l } }] : []
  })
  return { type: 'doc', content: [{ type: 'paragraph', ...(content.length ? { content } : {}) }] }
}

/** The editor's document as Words; undefined when nothing was written, so the standard words are used. */
export function fromDoc(doc: DocNode): Words | undefined {
  const parts: Array<string | { field: string }> = []
  for (const para of doc.content ?? [])
    for (const x of para.content ?? []) {
      if (x.type === 'text' && x.text) {
        const last = parts.at(-1)
        if (typeof last === 'string') parts[parts.length - 1] = last + x.text
        else parts.push(x.text)
      } else if (x.type === 'value' && typeof x.attrs?.field === 'string') parts.push({ field: x.attrs.field })
    }
  if (!parts.some((p) => typeof p !== 'string' || p.trim() !== '')) return undefined
  const [only] = parts
  return parts.length === 1 && typeof only === 'string' ? only : parts
}

/** The standard words in plain text, values in brackets, for a placeholder: "Dear [First name],". */
export function plainStandard(src: string, n: Notice): string {
  const walk = (nodes: Node[]): string =>
    nodes.map((x) => {
      switch (x.kind) {
        case 'text': return x.value
        case 'field': return `[${n.fields[x.id]?.label ?? '…'}]`
        case 'if': return walk(x.then)
        case 'br': return ' '
        default: return ''
      }
    }).join('')
  return walk(parse(src)).replace(/\s+/g, ' ').trim()
}

/** The standard words as Words, when they have nothing Words cannot hold (a condition, bold); else null. */
export function standardWords(src: string, n: Notice): Words | null {
  const nodes = parse(src)
  const label = new Set(values(n).map((v) => v.field))
  const parts: Array<string | { field: string }> = []
  for (const x of nodes) {
    if (x.kind === 'text') parts.push(x.value)
    else if (x.kind === 'field' && label.has(x.id)) parts.push({ field: x.id })
    else return null
  }
  return fromDoc({ type: 'doc', content: [{ type: 'paragraph', content: parts.map((p) => (typeof p === 'string' ? { type: 'text', text: p } : { type: 'value', attrs: { field: p.field } })) }] }) ?? null
}

/** What a notice says where the library has written nothing. */
export function standardOf(n: Notice, target: WordTarget): string | null {
  switch (target) {
    case 'subject': return n.subject
    case 'preheader': return n.intro
    case 'kicker': return n.kicker
    case 'title': return n.title
    case 'greeting': return n.greeting
    case 'intro': return n.intro
    case 'note': return n.notes.length ? n.notes.map((l) => l.text).join(' ') : null
    case 'button': return n.button?.label ?? null
    case 'closing': return CLOSING
  }
}
