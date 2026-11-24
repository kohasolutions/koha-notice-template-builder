// What the builder holds and every way it changes. Pure: no DOM, so the tests run it as it is.
// A value is kept as the person set it; compile() passes the design through safe(), so nothing set here can break a
// notice. Saving, undo and per-notice changes come in P4.
import type { Design, Group, Link, Social } from '../compiler/design.ts'
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
/** The library's own words: everything in perLibrary that is one line of text. */
export type LibraryText = Exclude<keyof Design['perLibrary'], 'links' | 'social'>

export interface State {
  design: Design
  readyId: string
  code: string
  situation: string
  format: Format
  view: View
  dark: boolean
}

export type Action =
  | { type: 'ready'; id: string }
  | { type: 'set'; group: Group; key: string; value: unknown }
  | { type: 'library'; key: LibraryText; value: string }
  | { type: 'links'; links: Link[] }
  | { type: 'social'; social: Social[] }
  | { type: 'example' }
  | { type: 'notice'; code: string }
  | { type: 'situation'; situation: string }
  | { type: 'format'; format: Format }
  | { type: 'view'; view: View }
  | { type: 'dark'; on: boolean }

export function notice(code: string): Notice {
  const n = NOTICES.find((x) => x.code === code) ?? NOTICES[0]
  if (!n) throw new Error('no notices')
  return n
}
/** The situations Koha was asked to print this notice in, as the sample has them. */
export const situations = (code: string): string[] => Object.keys(SAMPLES[code] ?? {})
export function sampleFor(s: State): Sample | undefined {
  return SAMPLES[s.code]?.[s.situation]?.[s.format === 'print' ? 'print' : 'email']
}

export function initial(): State {
  const first = READY[0]
  if (!first) throw new Error('no ready design')
  const code = 'CHECKOUT'
  return { design: fromReady(first), readyId: first.id, code, situation: situations(code)[0] ?? 'only', format: 'html', view: 'both', dark: false }
}

export function reduce(s: State, a: Action): State {
  const d = s.design
  switch (a.type) {
    case 'ready': {
      const r = READY.find((x) => x.id === a.id)
      // a new look; the library's own details and per-notice words stay
      return r ? { ...s, readyId: r.id, design: { ...fromReady(r), perLibrary: d.perLibrary, perNotice: d.perNotice } } : s
    }
    case 'set':
      if (!Object.hasOwn(SPEC[a.group], a.key)) return s
      return { ...s, design: { ...d, [a.group]: { ...d[a.group], [a.key]: a.value } } }
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
  }
}

/** A situation's code as words: "no_fine" → "No fine". */
export const situationName = (k: string): string => (k === 'only' ? 'Usual' : (k.charAt(0).toUpperCase() + k.slice(1)).replace(/_/g, ' '))
