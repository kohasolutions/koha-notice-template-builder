// Undo and redo. Only the design is remembered: undo never takes the person to another notice or format.
// Typing letter after letter into one field is one step, so undo takes back a word, not a letter.
import type { Action, State } from './state.ts'
import { reduce } from './state.ts'

type Kept = Pick<State, 'design' | 'readyId'>
export interface History {
  past: Kept[]
  now: State
  future: Kept[]
  /** What the last step changed: the next change of the same thing joins it */
  last: string | null
}
export type Step = Action | { type: 'undo' } | { type: 'redo' }

/** How many steps back undo goes. */
export const DEPTH = 100
const VIEW_ONLY = new Set<Action['type']>(['notice', 'situation', 'format', 'view', 'dark', 'scope'])

/** The thing a change is to, for joining steps; null: always a step of its own. */
function target(a: Action, s: State): string | null {
  switch (a.type) {
    case 'set': return `set ${s.scope === 'all' ? '*' : s.code} ${a.group}.${a.key}`
    case 'library': return `library ${a.key}`
    case 'links': return 'links'
    case 'social': return 'social'
    case 'words': return `words ${s.code} ${a.target}`
    case 'sections': return a.typing === undefined ? null : `sections ${s.scope === 'all' ? '*' : s.code} ${a.typing}`
    default: return null
  }
}

export const start = (s: State): History => ({ past: [], now: s, future: [], last: null })
const kept = (s: State): Kept => ({ design: s.design, readyId: s.readyId })

export function step(h: History, a: Step): History {
  if (a.type === 'undo') {
    const back = h.past.at(-1)
    return back ? { past: h.past.slice(0, -1), now: { ...h.now, ...back }, future: [kept(h.now), ...h.future], last: null } : h
  }
  if (a.type === 'redo') {
    const [next, ...rest] = h.future
    return next ? { past: [...h.past, kept(h.now)], now: { ...h.now, ...next }, future: rest, last: null } : h
  }
  const now = reduce(h.now, a)
  if (now === h.now) return h
  if (VIEW_ONLY.has(a.type)) return { ...h, now, last: a.type === 'scope' ? null : h.last }
  const t = target(a, h.now)
  if (t !== null && t === h.last) return { ...h, now, future: [] }
  return { past: [...h.past, kept(h.now)].slice(-DEPTH), now, future: [], last: t }
}
