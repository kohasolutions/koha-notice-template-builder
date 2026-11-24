// The one block model. A notice is compiled to these nodes once; each output only prints them. Because both outputs
// walk the same tree, the preview cannot show something the pasted template does not contain.

export type Node =
  | { kind: 'raw'; html: string } // markup written by the compiler, never by a person
  | { kind: 'text'; value: string } // typed by a person: escaped by the printer
  | { kind: 'field'; id: string }
  | { kind: 'if'; id: string; then: Node[]; otherwise: Node[] }
  | { kind: 'repeat'; body: Node[] } // once per item: Koha's two ---- lines

export const raw = (html: string): Node => ({ kind: 'raw', html })
export const text = (value: string): Node => ({ kind: 'text', value })
export const field = (id: string): Node => ({ kind: 'field', id })
export const when = (id: string, then: Node[], otherwise: Node[] = []): Node => ({ kind: 'if', id, then, otherwise })
export const repeat = (body: Node[]): Node => ({ kind: 'repeat', body })

/** A value Koha can print: how Template Toolkit writes it, and whether it belongs to one repeated item. */
export interface Field {
  tt: string
  label: string
  perItem?: boolean
  /** Printed right after another attribute, so it is a link and not text */
  use?: readonly string[]
}
export type Fields = Readonly<Record<string, Field>>

/** What Koha printed for each field, for the sample reader. Captured from Koha by scripts/prove.mjs, never typed. */
export interface Sample {
  fields: Readonly<Record<string, string>>
  items: ReadonlyArray<Readonly<Record<string, string>>>
}
