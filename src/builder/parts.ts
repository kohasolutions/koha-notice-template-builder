// The parts a person may switch off in the ready templates, and how each one is kept in a design. Pure: the proof
// (scripts/designs.mjs) switches the same parts through a real Koha.
import type { Design, FooterPart, ItemField, SectionId } from '../compiler/design.ts'
import { fromReady } from '../compiler/design.ts'
import { READY } from '../compiler/ready.ts'
import type { Notice } from '../notices/model.ts'

/** Never here: the title and the due date of an item, warnings and details. Without them it is not that notice. */
export type PartId = `item.${Exclude<ItemField, 'title' | 'due'>}` | `section.${Extract<SectionId, 'greeting' | 'note' | 'button' | 'closing'>}` | 'header.tagline' | 'header.monogram' | `footer.${FooterPart}`
export interface PartInfo { id: PartId; label: string; group: 'Items' | 'Message' | 'Header' | 'Footer' }
export const PARTS: readonly PartInfo[] = [
  { id: 'item.author', label: 'Author', group: 'Items' },
  { id: 'item.callnumber', label: 'Call number', group: 'Items' },
  { id: 'item.barcode', label: 'Barcode', group: 'Items' },
  { id: 'item.fine', label: 'Fine of each item', group: 'Items' },
  { id: 'section.greeting', label: 'Greeting', group: 'Message' },
  { id: 'section.note', label: 'Note (questions, or already returned)', group: 'Message' },
  { id: 'section.button', label: 'Button', group: 'Message' },
  { id: 'section.closing', label: 'Closing and library name', group: 'Message' },
  { id: 'header.tagline', label: 'Tagline', group: 'Header' },
  { id: 'header.monogram', label: 'Letter when there is no logo', group: 'Header' },
  { id: 'footer.address', label: 'Address', group: 'Footer' },
  { id: 'footer.phone', label: 'Phone', group: 'Footer' },
  { id: 'footer.email', label: 'Email', group: 'Footer' },
  { id: 'footer.hours', label: 'Opening hours', group: 'Footer' },
  { id: 'footer.links', label: 'Links', group: 'Footer' },
  { id: 'footer.social', label: 'Social links', group: 'Footer' },
  { id: 'footer.smallprint', label: 'Small print', group: 'Footer' },
]
const split = (id: PartId): [string, string] => {
  const i = id.indexOf('.')
  return [id.slice(0, i), id.slice(i + 1)]
}

export function isOn(d: Design, id: PartId): boolean {
  const [group, key] = split(id)
  switch (group) {
    case 'item': return d.items.fields.includes(key as ItemField)
    case 'section': return d.sections.includes(key as SectionId) && (key !== 'button' || d.button.show)
    case 'header': return d.header[key as 'tagline' | 'monogram']
    default: return d.footer.show.includes(key as FooterPart)
  }
}

/** Puts a thing back where the order has it: after the nearest one before it that is there. */
function putBack<T>(list: readonly T[], x: T, order: readonly T[]): T[] {
  if (list.includes(x)) return [...list]
  for (let i = order.indexOf(x) - 1; i >= 0; i--) {
    const at = list.indexOf(order[i] as T)
    if (at >= 0) return [...list.slice(0, at + 1), x, ...list.slice(at + 1)]
  }
  return [x, ...list]
}
const change = <T>(list: readonly T[], x: T, on: boolean, order: readonly T[]): T[] => (on ? putBack(list, x, order) : list.filter((y) => y !== x))

/** readyId: the design the order of things comes from. */
export function withPart(d: Design, id: PartId, on: boolean, readyId: string): Design {
  if (isOn(d, id) === on) return d
  const ready = READY.find((r) => r.id === readyId) ?? READY[0]
  if (!ready) return d
  const [group, key] = split(id)
  switch (group) {
    case 'item': return { ...d, items: { ...d.items, fields: change(d.items.fields, key as ItemField, on, ready.items.fields) } }
    case 'section': return {
      ...d, sections: change(d.sections, key as Design['sections'][number], on, ready.sections),
      ...(key === 'button' && on ? { button: { ...d.button, show: true } } : {}),
    }
    case 'header': return { ...d, header: { ...d.header, [key]: on } }
    default: return { ...d, footer: { ...d.footer, show: change(d.footer.show, key as FooterPart, on, ready.footer.show) } }
  }
}

/** Another ready design with the parts the person switched, the library's details and the words of each notice kept. */
export function withDesign(d: Design, fromId: string, toId: string): Design {
  const from = READY.find((r) => r.id === fromId)
  const to = READY.find((r) => r.id === toId)
  if (!to) return d
  const was = from ? fromReady(from) : null
  let out: Design = { ...fromReady(to), perLibrary: d.perLibrary, perNotice: d.perNotice }
  for (const p of PARTS) {
    const on = isOn(d, p.id)
    // only what the person changed: a design that starts without a part keeps it so
    if (was && isOn(was, p.id) !== on) out = withPart(out, p.id, on, toId)
  }
  return out
}

/** The parts that can show in this notice, so that no switch does nothing. */
export function partsOf(n: Notice): PartInfo[] {
  const it = n.items
  const has: Partial<Record<PartId, boolean>> = {
    'item.author': Boolean(it?.author), 'item.callnumber': Boolean(it?.callnumber), 'item.barcode': Boolean(it?.barcode), 'item.fine': Boolean(it?.fine),
    'section.note': n.notes.length > 0, 'section.button': n.button !== null && !n.mustButton,
  }
  if (n.slip) return PARTS.filter((p) => p.id === 'footer.smallprint')
  return PARTS.filter((p) => has[p.id] ?? true)
}
