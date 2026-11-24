// compile(notice, design): one tree per format, two outputs. No DOM, no network, no clock, no randomness: the same
// input always gives the same text, in a browser, in Node and on a website that imports it.
import type { Design, Words } from './design.ts'
import { safe } from './design.ts'
import { clean } from './escape.ts'
import { BASE } from './ready.ts'
import { htmlLetter, printLetter, slip } from './letter.ts'
import type { Node, Sample } from './nodes.ts'
import { field, parse, text } from './nodes.ts'
import type { Mode } from './print.ts'
import { toKoha, toSample } from './print.ts'
import { sms, textLetter } from './words.ts'
import type { Format, Notice } from '../notices/model.ts'

export interface Compiled {
  koha: string
  sample: (s: Sample) => string
}
/** Everything a layout needs: the notice's words with the library's own in their place. */
export interface Ready {
  notice: Notice
  design: Design
  name: Node[]
  initial: Node[]
  subject: Node[]
  preheader: Node[]
  kicker: Node[]
  title: Node[]
  greeting: Node[]
  intro: Node[]
  notes: Array<{ if?: string; nodes: Node[] }>
  buttonLabel: Node[]
  closing: Node[]
}

/** Typed words as nodes, or null when there are none. A chip that is not a value of this notice is left out. */
export function words(w: Words | undefined, notice: Notice): Node[] | null {
  const parts = typeof w === 'string' ? [w] : Array.isArray(w) ? (w as ReadonlyArray<string | { field: string }>) : []
  const nodes = parts.flatMap((p): Node[] => {
    if (typeof p === 'string') return p.trim() === '' ? (p && parts.length > 1 ? [text(' ')] : []) : [text(parts.length > 1 ? p.replace(/[\p{Cc}\u2028\u2029\s]+/gu, ' ') : clean(p))]
    return Object.hasOwn(notice.fields, p.field) && notice.fields[p.field]?.label ? [field(p.field)] : []
  })
  return nodes.some((x) => x.kind === 'field' || (x.kind === 'text' && x.value.trim() !== '')) ? nodes : null
}

/** The closing line of every notice, unless the library writes its own. */
export const CLOSING = 'Thank you,'

export function ready(notice: Notice, input: Design): Ready {
  const design = safe(input, BASE, notice.code)
  const mine = Object.hasOwn(design.perNotice, notice.code) ? design.perNotice[notice.code] : undefined
  const typed = clean(design.perLibrary.name)
  const name = typed ? [text(typed)] : [field('library')]
  const own = (w: Words | undefined, standard: string) => words(w, notice) ?? parse(standard)
  const notes = words(mine?.wording?.note, notice)
  return {
    notice, design, name,
    initial: typed ? [text(Array.from(typed)[0] ?? '')] : [field('initial')],
    subject: own(mine?.subject, notice.subject),
    preheader: own(mine?.preheader, notice.intro).filter((x) => x.kind !== 'strong'),
    kicker: own(mine?.kicker, notice.kicker),
    title: own(mine?.title, notice.title),
    greeting: own(mine?.wording?.greeting, notice.greeting),
    intro: own(mine?.wording?.intro, notice.intro),
    notes: notes ? [{ nodes: notes }] : notice.notes.map((l) => ({ ...(l.if ? { if: l.if } : {}), nodes: parse(l.text) })),
    buttonLabel: notice.button ? own(mine?.wording?.button, notice.button.label) : [],
    closing: own(mine?.wording?.closing, CLOSING),
  }
}

function output(nodes: Node[], notice: Notice, mode: Mode): Compiled {
  return { koha: toKoha(nodes, notice, mode), sample: (s) => toSample(nodes, notice, s, mode) }
}

export function compile(notice: Notice, design: Design, format: Format = 'html'): Compiled {
  if (!notice.formats.includes(format)) throw new Error(`${notice.code} has no ${format} version`)
  const r = ready(notice, design)
  switch (format) {
    case 'html':
      return output(htmlLetter(r), notice, 'html')
    case 'print':
      return output(notice.slip ? slip(r) : printLetter(r), notice, 'html')
    case 'text':
      return output(textLetter(r), notice, 'text')
    case 'sms':
      return output(sms(r), notice, 'text')
  }
}
/** Koha keeps the subject of a notice, as pasted, in 200 characters. */
export const SUBJECT_MAX = 200
const ownSubject = (notice: Notice, design: Design): Compiled => output(ready(notice, design).subject, notice, 'text')
/** Whether the subject as written (the library's, or the standard one) is more than Koha keeps. */
export const subjectTooLong = (notice: Notice, design: Design): boolean => Array.from(ownSubject(notice, design).koha).length > SUBJECT_MAX
/** Typed words that do not fit leave the notice its standard subject. */
export function compileSubject(notice: Notice, design: Design): Compiled {
  return subjectTooLong(notice, design) ? output(parse(notice.subject), notice, 'text') : ownSubject(notice, design)
}
