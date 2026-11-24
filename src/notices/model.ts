// The shape of a notice. Our own code; the notices themselves (data.ts) are adapted from Koha's and stay GPL.
import type { Model, Node } from '../compiler/nodes.ts'

/** One item as data: every string is in the language of nodes.ts parse(). */
export interface ItemSpec {
  loop?: string // none = the notice is about one item
  title: string
  author?: [ifField: string, text: string]
  callnumber?: [ifField: string, text: string]
  barcode?: string
  due?: { if?: string; label: string; date: string; head: string } // head: the table's column heading, always fixed words
  fine?: [ifField: string, text: string]
  /** Always shown under the facts */
  more?: string[]
}
export interface Line {
  if?: string
  text: string
}
export type Format = 'html' | 'text' | 'sms' | 'print'
export interface Notice extends Model {
  code: string
  module: string
  name: string
  formats: readonly Format[]
  subject: string
  kicker: string
  /** Number-neutral unless Koha itself knows the count in the part that is printed once */
  title: string
  greeting: string
  intro: string
  items: ItemSpec | null
  alerts: Line[]
  details: { if?: string; heading: string; lines: Line[] } | null
  notes: Line[]
  button: { if?: string; label: string; href: string } | null
  /** Its note is about the button, so it comes after it */
  noteAfterButton?: true
  sms: string
  /** The SMS lines around a list are separate, because the list itself may be a digest */
  smsItems?: { loop: string; line: string; after?: string }
  slip?: { title: string; heads: Array<{ if: string; heading: string; loop: string; line: string }>; top: Line[]; end: string }
}
/** Nodes for whatever a notice says, or nothing. */
export type Part = Node[]
