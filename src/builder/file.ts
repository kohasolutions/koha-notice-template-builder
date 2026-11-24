// The design file (export, import) and the copy kept in this browser. Whatever comes back is untrusted: a file from
// anywhere, or a browser's storage edited by hand. read() keeps only what has the shape of a design and drops the rest;
// what a kept value may be is still decided by safe() when a notice is compiled.
import type { Added, Design, Group, Link, NoticeChoices, Social, Words } from '../compiler/design.ts'
import { fromReady, NO_LIBRARY, SECTIONS, SPEC } from '../compiler/design.ts'
import { READY } from '../compiler/ready.ts'
import { NOTICES } from '../notices/data.ts'
import { WORD_TARGETS } from './state.ts'

export const FILE_KIND = 'koha-notice-design'
export const FILE_VERSION = 1
/** The browser storage key. */
export const STORE = 'koha-notice-builder:design'
const MAX_LIST = 40
const MAX_TEXT = 2000

export interface Saved { kind: typeof FILE_KIND; version: number; readyId: string; design: Design }

const obj = (v: unknown): Record<string, unknown> | null => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null)
const str = (v: unknown): string => (typeof v === 'string' ? v.slice(0, MAX_TEXT) : '')
const own = (o: Record<string, unknown>, k: string): unknown => (Object.hasOwn(o, k) ? o[k] : undefined)

/** Typed words: text, or text and Koha values. Anything else is left out. */
export function readWords(v: unknown): Words | undefined {
  if (typeof v === 'string') return v.slice(0, MAX_TEXT)
  if (!Array.isArray(v)) return undefined
  const parts = v.slice(0, MAX_LIST).flatMap((p): Array<string | { field: string }> => {
    if (typeof p === 'string') return [p.slice(0, MAX_TEXT)]
    const o = obj(p)
    const field = o && own(o, 'field')
    return typeof field === 'string' ? [{ field }] : []
  })
  return parts.length ? parts : undefined
}

function readAdded(v: unknown): Added | null {
  const o = obj(v)
  if (!o) return null
  const words = (k: string) => readWords(own(o, k)) ?? ''
  switch (own(o, 'add')) {
    case 'text': return { add: 'text', words: words('words') }
    case 'notice': return { add: 'notice', words: words('words') }
    case 'divider': return { add: 'divider' }
    case 'spacer': { const px = own(o, 'px'); return { add: 'spacer', px: typeof px === 'number' && Number.isFinite(px) ? px : 16 } }
    case 'image': return { add: 'image', src: str(own(o, 'src')), alt: str(own(o, 'alt')) }
    case 'button': return { add: 'button', label: str(own(o, 'label')), href: str(own(o, 'href')) }
    case 'columns': return { add: 'columns', left: words('left'), right: words('right') }
    default: return null
  }
}
function readSections(v: unknown): Design['sections'] | undefined {
  if (!Array.isArray(v)) return undefined
  return v.slice(0, MAX_LIST).flatMap((s): Design['sections'] => {
    if (typeof s === 'string') return (SECTIONS as readonly string[]).includes(s) ? [s as (typeof SECTIONS)[number]] : []
    const a = readAdded(s)
    return a ? [a] : []
  })
}
/** The settings of one group that SPEC knows, as given. */
function readGroup(g: Group, v: unknown): Record<string, unknown> {
  const o = obj(v)
  if (!o) return {}
  return Object.fromEntries(Object.keys(SPEC[g]).filter((k) => Object.hasOwn(o, k)).map((k) => [k, own(o, k)]))
}
function readLinks(v: unknown): Link[] {
  return (Array.isArray(v) ? v : []).slice(0, MAX_LIST).flatMap((l) => { const o = obj(l); return o ? [{ label: str(own(o, 'label')), href: str(own(o, 'href')) }] : [] })
}
function readSocial(v: unknown): Social[] {
  return (Array.isArray(v) ? v : []).slice(0, MAX_LIST).flatMap((l) => {
    const o = obj(l)
    if (!o) return []
    const icon = str(own(o, 'icon'))
    return [{ network: str(own(o, 'network')), href: str(own(o, 'href')), ...(icon ? { icon } : {}) }]
  })
}
function readNotice(v: unknown): NoticeChoices | null {
  const o = obj(v)
  if (!o) return null
  const out: NoticeChoices & Record<string, unknown> = {}
  for (const t of ['subject', 'preheader', 'kicker', 'title'] as const) { const w = readWords(own(o, t)); if (w !== undefined) out[t] = w }
  const wo = obj(own(o, 'wording'))
  if (wo) {
    const wording = Object.fromEntries(WORD_TARGETS.filter((t) => ['greeting', 'intro', 'note', 'button', 'closing'].includes(t)).flatMap((t) => { const w = readWords(own(wo, t)); return w === undefined ? [] : [[t, w]] }))
    if (Object.keys(wording).length) out.wording = wording
  }
  const ov = obj(own(o, 'overrides'))
  if (ov) {
    const overrides: Record<string, unknown> = {}
    for (const g of Object.keys(SPEC) as Group[]) { const x = readGroup(g, own(ov, g)); if (Object.keys(x).length) overrides[g] = x }
    const sections = readSections(own(ov, 'sections'))
    if (sections) overrides.sections = sections
    if (Object.keys(overrides).length) out.overrides = overrides
  }
  return Object.keys(out).length ? out : null
}

/** A design from anything. The look starts from the ready design the file names (or the first). */
export function read(v: unknown): { design: Design; readyId: string } | null {
  const o = obj(v)
  if (!o || own(o, 'kind') !== FILE_KIND) return null
  const version = own(o, 'version')
  if (typeof version !== 'number' || version > FILE_VERSION) return null
  const id = own(o, 'readyId')
  const ready = READY.find((r) => r.id === id) ?? READY[0]
  const d = obj(own(o, 'design'))
  if (!ready || !d) return null
  const base = fromReady(ready)
  const design: Record<string, unknown> = { ...base }
  for (const g of Object.keys(SPEC) as Group[]) design[g] = { ...base[g], ...readGroup(g, own(d, g)) }
  design.sections = readSections(own(d, 'sections')) ?? base.sections
  const lib = obj(own(d, 'perLibrary')) ?? {}
  design.perLibrary = {
    ...Object.fromEntries(Object.keys(NO_LIBRARY).filter((k) => k !== 'links' && k !== 'social').map((k) => [k, str(own(lib, k))])),
    links: readLinks(own(lib, 'links')), social: readSocial(own(lib, 'social')),
  }
  const pn = obj(own(d, 'perNotice')) ?? {}
  design.perNotice = Object.fromEntries(NOTICES.flatMap((n) => { const c = readNotice(own(pn, n.code)); return c ? [[n.code, c]] : [] }))
  return { design: design as unknown as Design, readyId: ready.id }
}

export const toFile = (design: Design, readyId: string): Saved => ({ kind: FILE_KIND, version: FILE_VERSION, readyId, design })

/** Browser storage can be missing, full or refused (a private window); the builder works without it. */
export function loadStored(): { design: Design; readyId: string } | null {
  try {
    const raw = globalThis.localStorage.getItem(STORE)
    return raw ? read(JSON.parse(raw)) : null
  } catch {
    return null
  }
}
/** Whether this browser keeps anything (not in some private windows, or when site data is blocked). */
export function canKeep(): boolean {
  try {
    globalThis.localStorage.setItem(`${STORE}:probe`, '1')
    globalThis.localStorage.removeItem(`${STORE}:probe`)
    return true
  } catch {
    return false
  }
}
export function store(design: Design, readyId: string): boolean {
  try {
    globalThis.localStorage.setItem(STORE, JSON.stringify(toFile(design, readyId)))
    return true
  } catch {
    return false
  }
}
export function forget(): void {
  try {
    globalThis.localStorage.removeItem(STORE)
  } catch {
    // nothing kept, nothing to forget
  }
}
