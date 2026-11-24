// The formats without layout: plain-text email and SMS. Directives never stand on a line of their own, so what
// Template Toolkit leaves out takes no line break with it.
import type { Ready } from './compile.ts'
import { clean, url } from './escape.ts'
import type { Node } from './nodes.ts'
import { parse, repeat, text, when } from './nodes.ts'

const nl: Node = { kind: 'br' }
export const cond = (id: string | undefined, nodes: Node[]): Node[] => (id ? [when(id, nodes)] : nodes)

/** Facts in order with a separator only between two that are there. */
export function join(facts: ReadonlyArray<{ if?: string; nodes: Node[] }>, sep: Node[]): Node[] {
  const before: Array<string | undefined> = []
  return facts.flatMap((f) => {
    const s: Node[] = before.includes(undefined) ? sep : before.reduceRight<Node[]>((rest, id) => [when(id ?? '', sep, rest)], [])
    before.push(f.if)
    return cond(f.if, [...s, ...f.nodes])
  })
}

export function textLetter(r: Ready): Node[] {
  const { notice: n, design: d } = r
  // Koha's digest starts a line of its own after what comes before the items
  const digest = n.items?.loop ? n.loops[n.items.loop]?.digest : undefined
  const out: Node[] = [...r.greeting, nl, nl, ...r.intro, ...(digest ? [] : [nl])]
  const it = n.items
  if (it) {
    const show = (k: string) => d.items.fields.includes(k as 'title')
    const facts = [
      ...(it.due ? [{ ...(it.due.if ? { if: it.due.if } : {}), nodes: [...parse(it.due.label), text(' '), ...parse(it.due.date)] }] : []),
      ...(it.callnumber && show('callnumber') ? [{ if: it.callnumber[0], nodes: parse(it.callnumber[1]) }] : []),
      ...(it.barcode && show('barcode') ? [{ nodes: parse(it.barcode) }] : []),
      ...(it.fine && show('fine') ? [{ if: it.fine[0], nodes: parse(it.fine[1]) }] : []),
    ]
    const body: Node[] = [
      text('* '), ...parse(it.title), ...(it.author && show('author') ? [when(it.author[0], [text(', '), ...parse(it.author[1])])] : []),
      nl, text('  '), ...join(facts, [text(' · ')]), ...(it.more ?? []).flatMap((m) => [nl, text('  '), ...parse(m)]),
    ]
    out.push(...(it.loop ? [repeat(it.loop, digest ? [nl, ...body] : [nl, ...body, nl])] : [nl, ...body, nl]))
  }
  const block = (id: string | undefined, nodes: Node[]) => out.push(...cond(id, [nl, ...nodes, nl]))
  for (const a of n.alerts) block(a.if, parse(a.text))
  if (n.details) block(n.details.if, [text(`${n.details.heading}:`), ...n.details.lines.flatMap((l) => cond(l.if, [nl, text('  '), ...parse(l.text)]))])
  for (const x of r.notes) block(x.if, x.nodes)
  if (n.button) block(n.button.if, [...r.buttonLabel, text(': '), ...parse(n.button.href)])
  out.push(nl, ...r.closing, nl, ...r.name)
  const L = d.perLibrary
  const foot: Node[][] = d.footer.show.flatMap((k): Node[][] => {
    if (k === 'links') return L.links.flatMap((l) => (clean(l.label) && url(l.href) ? [[text(clean(l.label)), text(': '), text(url(l.href) ?? '')]] : []))
    if (k === 'social') return L.social.flatMap((l) => (clean(l.network) && url(l.href) ? [[text(clean(l.network)), text(': '), text(url(l.href) ?? '')]] : []))
    return clean(L[k]) ? [[text(clean(L[k]))]] : []
  })
  if (foot.length) out.push(nl, ...foot.flatMap((f) => [nl, ...f]))
  return out
}

export function sms(r: Ready): Node[] {
  const n = r.notice
  const s = n.smsItems
  return [
    ...r.name, text(': '), ...parse(n.sms),
    ...(s ? [repeat(s.loop, parse(s.line)), ...parse(s.after ?? '')] : []),
  ]
}
