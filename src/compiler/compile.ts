// compile(notice, design): one tree, two outputs. No DOM, no network, no clock, no randomness: the same input always
// gives the same text, in a browser, in Node and on a website that imports it.
import type { Design, Link, SectionId } from './design.ts'
import { FONTS, safe } from './design.ts'
import { clean, html, url } from './escape.ts'
import type { Node, Sample } from './nodes.ts'
import { field, raw, text, when } from './nodes.ts'
import type { Notice } from './notices.ts'
import { toKoha, toSample } from './print.ts'

export interface Compiled {
  koha: string
  sample: (s: Sample) => string
}

export function blocks(notice: Notice, input: Design): Node[] {
  const d = safe(input)
  const name = (): Node => (clean(d.libraryName) ? text(d.libraryName) : field('library'))
  const a = (href: string, label: Node, style = `color:${d.linkColour};`): Node[] => [
    raw(`<a href="${html(href)}" style="${style}">`), label, raw('</a>'),
  ]
  const links = (list: Link[]): Node[] => {
    const good = list.flatMap((l) => (clean(l.label) && url(l.href) ? [{ label: l.label, href: url(l.href) as string }] : []))
    if (!good.length) return []
    return [
      raw('<p style="margin:0 0 8px;">'),
      ...good.flatMap((l, i) => [...(i ? [raw(' · ')] : []), ...a(l.href, text(l.label))]),
      raw('</p>'),
    ]
  }
  const p = (children: Node[]): Node[] => [raw('<p style="margin:0 0 12px;">'), ...children, raw('</p>')]

  const logoUrl = url(d.logo, ['https:'])
  const centre = d.headerLayout === 'centred' ? 'text-align:center;' : ''
  const band = d.headerLayout === 'band'
  const header: Node[] = [
    raw(`<div style="padding:16px 20px;${centre}${band ? `background:${d.headerColour};color:${d.headerText};` : `border-top:4px solid ${d.headerColour};color:${d.headerColour};`}">`),
    ...(logoUrl
      ? [raw(`<img src="${html(logoUrl)}" alt="`), name(), raw(`" style="max-width:220px;max-height:60px;${centre ? 'margin:0 auto 8px;' : 'margin:0 0 8px;'}display:block;">`)]
      : []),
    raw('<p style="margin:0;font-size:20px;font-weight:bold;">'), name(), raw('</p></div>\n'),
  ]
  const section: Record<SectionId, () => Node[]> = {
    greeting: () => p([when('firstname', [raw('Dear '), field('firstname'), raw(',')], [raw('Hello,')])]),
    intro: () => p([text(clean(d.wording.intro ?? '') || notice.intro)]),
    details: () => notice.details,
    account: () => [
      when('opac', p([
        raw('<a href="'), field('opac'), raw(`/cgi-bin/koha/opac-user.pl" style="color:${d.linkColour};">`),
        text(clean(d.wording.account ?? '') || notice.account), raw('</a>'),
      ])),
    ],
    closing: () => p([text(clean(d.wording.closing ?? '') || 'Thank you,'), raw('<br>'), name()]),
  }
  const footer = [...(clean(d.footerText) ? p([text(d.footerText)]) : []), ...links(d.footerLinks), ...links(d.social)]
  return [
    raw(`<div style="background:${d.pageColour};padding:16px 0;">\n<div style="max-width:${d.width}px;margin:0 auto;background:${d.bodyColour};border-radius:${d.radius}px;overflow:hidden;font-family:${FONTS[d.font]};font-size:${d.fontSize}px;line-height:1.5;color:${d.textColour};">\n`),
    ...header,
    raw('<div style="padding:0 20px 16px;">\n'),
    ...d.order.flatMap((s) => [...section[s](), raw('\n')]),
    ...(footer.length ? [raw('<div style="font-size:13px;">'), ...footer, raw('</div>\n')] : []),
    raw('</div>\n</div>\n</div>'),
  ]
}

export function compile(notice: Notice, design: Design): Compiled {
  const nodes = blocks(notice, design)
  return { koha: toKoha(nodes, notice.fields), sample: (s) => toSample(nodes, notice.fields, s) }
}
