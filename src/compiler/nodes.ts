// The one block model. A notice is compiled to these nodes once; each output only prints them. Because both outputs
// walk the same tree, the preview cannot show something the pasted template does not contain.

export type Node =
  | { kind: 'raw'; html: string } // markup written by the compiler, never by a person
  | { kind: 'text'; value: string } // words: escaped by the printer
  | { kind: 'br' }
  | { kind: 'strong'; on: boolean }
  | { kind: 'field'; id: string }
  | { kind: 'if'; id: string; then: Node[]; otherwise: Node[] }
  | { kind: 'repeat'; loop: string; body: Node[] }

export const raw = (html: string): Node => ({ kind: 'raw', html })
export const text = (value: string): Node => ({ kind: 'text', value })
export const field = (id: string): Node => ({ kind: 'field', id })
export const when = (id: string, then: Node[], otherwise: Node[] = []): Node => ({ kind: 'if', id, then, otherwise })
export const repeat = (loop: string, body: Node[]): Node => ({ kind: 'repeat', loop, body })

/** A value Koha can print: how Template Toolkit writes it, and the list it belongs to when there is one per item. */
export interface Field {
  tt: string
  loop?: string
  /** Template Toolkit plugins it needs */
  use?: readonly string[]
  /** A Template Toolkit line that must run first */
  pre?: string
  /** A person may put it in their own wording: its plain name */
  label?: string
}
export type Fields = Readonly<Record<string, Field>>

/** A list: Koha's own digest (two ---- lines, one message per visit) or a FOREACH. */
export interface Loop {
  digest?: true
  each?: string
  pre?: string
}

export interface Model {
  fields: Fields
  loops: Readonly<Record<string, Loop>>
}

export type Row = Readonly<Record<string, string>>
/** What Koha printed for each field, for the sample reader. Captured from Koha by scripts/prove.mjs, never typed. */
export interface Sample {
  fields: Row
  loops: Readonly<Record<string, readonly Row[]>>
}

/** The little language of the notice data. "{id}" a value · "{?id}a{:}b{/}" if · "{b}…{/b}" strong · a line break. */
export function parse(src: string): Node[] {
  const stack: Array<{ nodes: Node[]; cond?: { id: string; then: Node[] } }> = [{ nodes: [] }]
  const top = () => {
    const t = stack[stack.length - 1]
    if (!t) throw new Error(`"${src}" closes more than it opens`)
    return t
  }
  for (const t of src.split(/(\{[^}]*\}|\n)/)) {
    if (t === '') continue
    if (t === '\n') top().nodes.push({ kind: 'br' })
    else if (t === '{b}' || t === '{/b}') top().nodes.push({ kind: 'strong', on: t === '{b}' })
    else if (t.startsWith('{?')) stack.push({ nodes: [], cond: { id: t.slice(2, -1), then: [] } })
    else if (t === '{:}' || t === '{/}') {
      const f = top()
      if (!f.cond) throw new Error(`"${src}" closes what it did not open`)
      if (t === '{:}') {
        f.cond.then = f.nodes
        f.nodes = [{ kind: 'raw', html: '' }]
      } else {
        stack.pop()
        const hasElse = f.nodes[0]?.kind === 'raw'
        top().nodes.push(when(f.cond.id, hasElse ? f.cond.then : f.nodes, hasElse ? f.nodes.slice(1) : []))
      }
    } else if (t.startsWith('{')) top().nodes.push(field(t.slice(1, -1)))
    else top().nodes.push(text(t))
  }
  if (stack.length !== 1) throw new Error(`"${src}" opens what it does not close`)
  return top().nodes
}
