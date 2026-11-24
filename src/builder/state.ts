// What the builder holds and every way it changes. Pure: no DOM, so the tests run it as it is.
// A value is kept as the person set it; compile() passes the design through safe(), so nothing set here can break a
// notice. Undo is history.ts; saving and the design file are file.ts.
import type { Design, Group, Link, NoticeChoices, Social, Words } from '../compiler/design.ts'
import { fromReady, SPEC } from '../compiler/design.ts'
import { EXAMPLE_LIBRARY } from '../compiler/example.ts'
import type { Sample } from '../compiler/nodes.ts'
import { READY } from '../compiler/ready.ts'
import { NOTICES } from '../notices/data.ts'
import type { Format, Notice } from '../notices/model.ts'
import samples from '../samples.json'

export const SAMPLES = samples.samples as unknown as Readonly<Record<string, Readonly<Record<string, Partial<Record<'email' | 'print', Sample>>>>>>
export const KOHA = samples.koha

export type View = 'phone' | 'desktop' | 'both'
/** Whether a change of the look is for every notice or for the one on screen. */
export type Scope = 'all' | 'notice'
/** The library's own words: everything in perLibrary that is one line of text. */
export type LibraryText = Exclude<keyof Design['perLibrary'], 'links' | 'social'>
/** The words of a notice a library may write itself. */
export const WORD_TARGETS = ['subject', 'preheader', 'kicker', 'title', 'greeting', 'intro', 'note', 'button', 'closing'] as const
export type WordTarget = (typeof WORD_TARGETS)[number]
const IN_WORDING = new Set<WordTarget>(['greeting', 'intro', 'note', 'button', 'closing'])

export interface State {
  design: Design
  readyId: string
  code: string
  situation: string
  format: Format
  view: View
  dark: boolean
  scope: Scope
}

export type Action =
  | { type: 'ready'; id: string }
  | { type: 'set'; group: Group; key: string; value: unknown }
  | { type: 'library'; key: LibraryText; value: string }
  | { type: 'links'; links: Link[] }
  | { type: 'social'; social: Social[] }
  | { type: 'example' }
  | { type: 'words'; target: WordTarget; value: Words | undefined }
  /** typing: the part being typed in, so that one word after another is one step to undo */
  | { type: 'sections'; sections: Design['sections']; typing?: string }
  | { type: 'resetNotice' }
  | { type: 'load'; design: Design; readyId: string }
  | { type: 'notice'; code: string }
  | { type: 'situation'; situation: string }
  | { type: 'format'; format: Format }
  | { type: 'view'; view: View }
  | { type: 'dark'; on: boolean }
  | { type: 'scope'; scope: Scope }

export function notice(code: string): Notice {
  const n = NOTICES.find((x) => x.code === code) ?? NOTICES[0]
  if (!n) throw new Error('no notices')
  return n
}
/** The situations Koha was asked to print this notice in, as the sample has them. */
export const situations = (code: string): string[] => Object.keys(SAMPLES[code] ?? {})
export function sampleFor(s: Pick<State, 'code' | 'situation' | 'format'>): Sample | undefined {
  return SAMPLES[s.code]?.[s.situation]?.[s.format === 'print' ? 'print' : 'email']
}

export function initial(): State {
  const first = READY[0]
  if (!first) throw new Error('no ready design')
  const code = 'CHECKOUT'
  return { design: fromReady(first), readyId: first.id, code, situation: situations(code)[0] ?? 'only', format: 'html', view: 'both', dark: false, scope: 'all' }
}

const mineOf = (d: Design, code: string): NoticeChoices => (Object.hasOwn(d.perNotice, code) ? d.perNotice[code] : undefined) ?? {}
const withMine = (d: Design, code: string, mine: NoticeChoices): Design => {
  const others = Object.entries(d.perNotice).filter(([c]) => c !== code)
  return { ...d, perNotice: Object.fromEntries(Object.keys(mine).length ? [...others, [code, mine]] : others) }
}
/** Drops what is empty, so a notice with nothing of its own has no entry. */
function tidy(mine: NoticeChoices): NoticeChoices {
  const out: NoticeChoices & Record<string, unknown> = {}
  for (const [k, v] of Object.entries(mine)) {
    if (v === undefined) continue
    if (k === 'wording' || k === 'overrides') {
      const inner = Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== undefined && !(typeof x === 'object' && !Array.isArray(x) && x !== null && !Object.keys(x).length)))
      if (Object.keys(inner).length) out[k] = inner
    } else out[k] = v
  }
  return out
}

/** The design as the notice on screen sees it: the look with that notice's own changes over it (not yet safe()). */
export function effective(d: Design, code: string): Design {
  const o = mineOf(d, code).overrides
  if (!o) return d
  const out: Record<string, unknown> = { ...d }
  for (const g of Object.keys(SPEC) as Group[]) if (o[g]) out[g] = { ...d[g], ...o[g] }
  if (o.sections) out.sections = o.sections
  return out as unknown as Design
}
/** Whether the notice on screen has a change of its own. */
export const hasOwn = (d: Design, code: string): boolean => Object.keys(mineOf(d, code)).length > 0
/** What the library wrote for one of the notice's words, if anything. */
export function wordsOf(d: Design, code: string, target: WordTarget): Words | undefined {
  const mine = mineOf(d, code)
  return IN_WORDING.has(target) ? mine.wording?.[target as keyof NonNullable<NoticeChoices['wording']>] : mine[target as 'subject']
}

export function reduce(s: State, a: Action): State {
  const d = s.design
  switch (a.type) {
    case 'ready': {
      const r = READY.find((x) => x.id === a.id)
      // a new look; the library's own details and per-notice words stay
      return r ? { ...s, readyId: r.id, design: { ...fromReady(r), perLibrary: d.perLibrary, perNotice: d.perNotice } } : s
    }
    case 'set': {
      if (!Object.hasOwn(SPEC[a.group], a.key)) return s
      if (s.scope === 'all') return { ...s, design: { ...d, [a.group]: { ...d[a.group], [a.key]: a.value } } }
      const mine = mineOf(d, s.code)
      const overrides = { ...mine.overrides, [a.group]: { ...mine.overrides?.[a.group], [a.key]: a.value } }
      return { ...s, design: withMine(d, s.code, { ...mine, overrides }) }
    }
    case 'sections': {
      if (s.scope === 'all') return { ...s, design: { ...d, sections: a.sections } }
      const mine = mineOf(d, s.code)
      return { ...s, design: withMine(d, s.code, { ...mine, overrides: { ...mine.overrides, sections: a.sections } }) }
    }
    case 'words': {
      const mine = mineOf(d, s.code)
      const next: NoticeChoices = IN_WORDING.has(a.target)
        ? { ...mine, wording: { ...mine.wording, [a.target]: a.value } }
        : { ...mine, [a.target]: a.value }
      return { ...s, design: withMine(d, s.code, tidy(next)) }
    }
    case 'resetNotice':
      return hasOwn(d, s.code) ? { ...s, design: withMine(d, s.code, {}) } : s
    case 'load':
      return { ...s, design: a.design, readyId: READY.some((r) => r.id === a.readyId) ? a.readyId : s.readyId }
    case 'library':
      return { ...s, design: { ...d, perLibrary: { ...d.perLibrary, [a.key]: a.value } } }
    case 'links':
      return { ...s, design: { ...d, perLibrary: { ...d.perLibrary, links: a.links } } }
    case 'social':
      return { ...s, design: { ...d, perLibrary: { ...d.perLibrary, social: a.social } } }
    case 'example':
      // fills only what is empty: never types over the library's own words
      return {
        ...s,
        design: {
          ...d,
          perLibrary: Object.fromEntries(Object.entries(d.perLibrary).map(([k, v]) => {
            const mine = Array.isArray(v) ? v.length > 0 : v !== ''
            return [k, mine ? v : EXAMPLE_LIBRARY[k as keyof Design['perLibrary']]]
          })) as Design['perLibrary'],
        },
      }
    case 'notice': {
      const n = notice(a.code)
      return { ...s, code: n.code, situation: situations(n.code)[0] ?? 'only', format: n.formats.includes(s.format) ? s.format : (n.formats[0] ?? 'html') }
    }
    case 'situation':
      return situations(s.code).includes(a.situation) ? { ...s, situation: a.situation } : s
    case 'format':
      return notice(s.code).formats.includes(a.format) ? { ...s, format: a.format } : s
    case 'view':
      return { ...s, view: a.view }
    case 'dark':
      return { ...s, dark: a.on }
    case 'scope':
      return { ...s, scope: a.scope }
  }
}

/** A situation's code as words: "no_fine" → "No fine". */
export const situationName = (k: string): string => (k === 'only' ? 'Usual' : (k.charAt(0).toUpperCase() + k.slice(1)).replace(/_/g, ' '))
