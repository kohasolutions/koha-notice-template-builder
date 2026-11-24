// The HTML layouts. Everything here works from settings; none of it knows which ready design it is drawing.
// Tables and inline styles only: no style sheet, no SVG, no data: image (Gmail removes the last two).
import type { Ready } from './compile.ts'
import { words } from './compile.ts'
import type { Added, Design, SectionId } from './design.ts'
import { FONTS } from './design.ts'
import { clean, html, url } from './escape.ts'
import type { Node } from './nodes.ts'
import { field, parse, raw, repeat, text, when } from './nodes.ts'
import { cond, join } from './words.ts'

/** Markup with nodes in it. A string put in is markup too: only settings from safe() and url() may be. */
function h(parts: TemplateStringsArray, ...put: Array<string | number | Node[]>): Node[] {
  return parts.flatMap((p, i): Node[] => {
    const v = put[i]
    return [...(p ? [raw(p)] : []), ...(v === undefined ? [] : Array.isArray(v) ? v : v === '' ? [] : [raw(String(v))])]
  })
}
type Style = Record<string, string | number | false>
const st = (o: Style) => Object.entries(o).filter(([, v]) => v !== '' && v !== false).map(([k, v]) => `${k}:${v as string}`).join(';')
const T = (inner: Node[], style = '', attr = '') =>
  h`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"${attr} style="border-collapse:separate;${style}">${inner}</table>`
const row = (inner: Node[], style = '', bg = '') => h`<tr><td${bg ? ` bgcolor="${bg}"` : ''} style="${bg ? `background-color:${bg};` : ''}${style}">${inner}</td></tr>`
const al = (a: 'left' | 'centre') => (a === 'centre' ? 'center' : 'left')
const line = (colour: string, width = 1, style = 'solid') => h`<div style="border-top:${width}px ${style} ${colour};font-size:1px;line-height:1px">&nbsp;</div>`

function kit(d: Design) {
  const t = d.type
  const F = FONTS[t.font]
  const HF = FONTS[t.headingFont]
  const p = (inner: Node[], extra = '') => h`<p style="margin:0 0 16px;font-family:${F};font-size:${t.size}px;line-height:1.55;color:${t.text};overflow-wrap:anywhere;${extra}">${inner}</p>`
  const small = (inner: Node[], colour = t.muted) => h`<span style="font-family:${F};font-size:14px;line-height:1.5;color:${colour}">${inner}</span>`
  const box = (x: Design['box'], inner: Node[]) =>
    T(row(inner, st({
      padding: x.bg || x.border ? '14px 18px' : x.bar ? '2px 0 2px 16px' : 0, 'border-radius': x.radius ? `${x.radius}px` : '', border: x.border ? `1px solid ${x.border}` : '', 'border-left': x.bar ? `4px solid ${x.bar}` : '',
      'font-family': F, 'font-size': `${t.size}px`, 'line-height': '1.5', color: x.text,
    }), x.bg), 'margin:0 0 18px')
  return { t, F, HF, p, small, box }
}

// ── items ──
function items(r: Ready): Node[] {
  const n = r.notice.items
  if (!n) return []
  const { t, F, small } = kit(r.design)
  const it = r.design.items
  const alert = r.design.alert
  const due = n.due
  const show = (k: string) => it.fields.includes(k as 'title')
  // beside a date column there is no room for both on one line: one fact per line there
  const narrow = it.style === 'table' || it.due === 'side' || it.due === 'stamp'
  const keep = (x: Node[]) => (narrow ? x : h`<span style="white-space:nowrap">${x}</span>`)
  const label = due ? parse(due.label) : []
  const date = due ? parse(due.date) : []
  // author, callnumber and barcode keep the order the library chose
  const facts = (withDue: boolean): Node[] => {
    const list: Array<{ if?: string; nodes: Node[] }> = []
    if (withDue && due) list.push({ ...(due.if ? { if: due.if } : {}), nodes: h`${label} <strong style="color:${t.text}">${date}</strong>` })
    for (const f of it.fields) {
      if (f === 'callnumber' && n.callnumber) list.push({ if: n.callnumber[0], nodes: keep(parse(n.callnumber[1])) })
      if (f === 'barcode' && n.barcode) list.push({ nodes: keep(parse(n.barcode)) })
    }
    const fine = n.fine && show('fine') ? [{ if: n.fine[0], nodes: h`<strong style="color:${alert.text}">${parse(n.fine[1])}</strong>` }] : []
    const more = (n.more ?? []).map((m) => ({ nodes: parse(m) }))
    const lines = [...(list.length ? [{ ...(list.every((x) => x.if) && list[0]?.if && list.length === 1 ? { if: list[0].if } : {}), nodes: join(list, narrow ? h`<br>` : h` &middot; `) }] : []), ...fine, ...more]
    return lines.length ? h`<div style="padding-top:4px">${small(join(lines, h`<br>`))}</div>` : []
  }
  const title = h`<strong style="font-family:${F};font-size:${t.size + 1}px;line-height:1.35;color:${t.text}">${parse(n.title)}</strong>${n.author && show('author') ? cond(n.author[0], h`<br>${small(parse(n.author[1]))}`) : []}`
  const hasDue = due && show('due')
  const body = (): Node[] => {
    if (!due || !hasDue) return h`${title}${facts(false)}`
    switch (it.due) {
      case 'pill':
        return h`${title}${facts(false)}${cond(due.if, h`<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;border-collapse:separate"><tr><td bgcolor="${it.dueBg}" style="background-color:${it.dueBg};border-radius:14px;padding:4px 12px;font-family:${F};font-size:14px;font-weight:bold;line-height:1.4;color:${it.dueText}">${label} ${date}</td></tr></table>`)}`
      case 'side':
        return T(h`<tr><td valign="top">${title}${facts(false)}</td>${cond(due.if, h`<td width="96" align="right" valign="top" style="width:96px;padding-left:12px;font-family:${F};font-size:14px;line-height:1.4;color:${t.muted}">${label}<br><strong style="font-size:16px;color:${t.text};white-space:nowrap">${date}</strong></td>`)}</tr>`)
      case 'stamp':
        return T(h`<tr>${cond(due.if, h`<td valign="top" width="104" style="width:104px;padding-right:14px"><table role="presentation" width="104" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="${it.dueBg}" style="background-color:${it.dueBg};border:1px dashed ${it.dueText};padding:8px 4px;font-family:${F};font-size:13px;line-height:1.4;color:${it.dueText}">${label}<br><strong style="font-size:15px;white-space:nowrap">${date}</strong></td></tr></table></td>`)}<td valign="top">${title}${facts(false)}</td></tr>`)
      case 'line':
        return h`${title}${cond(due.if, h`<div style="padding-top:8px;font-family:${F};font-size:15px;color:${t.text}">${label} ${date}</div>`)}${facts(false)}`
      case 'text':
      case 'strong':
        return h`${title}${facts(true)}`
    }
  }
  const each = (x: Node[]) => (n.loop ? [repeat(n.loop, x)] : x)
  if (it.style === 'table') {
    const px = it.headBg ? 12 : 0
    const th = (x: string, a = 'left', w = '') => h`<th align="${a}"${w ? ` width="${w}"` : ''} scope="col"${it.headBg ? ` bgcolor="${it.headBg}"` : ''} style="${it.headBg ? `background-color:${it.headBg};` : ''}text-align:${a};padding:10px ${px}px;font-family:${F};font-size:14px;color:${it.headText};border-bottom:2px solid ${it.headBg ? it.line : it.headText}">${[text(x)]}</th>`
    // when Koha gives no date the cell stays, empty: the columns must not move. A label that changes goes with the date.
    const changing = due && due.label !== due.head
    const cell = due ? cond(due.if, h`${changing ? h`<span style="font-size:13px;color:${t.muted}">${label}</span><br>` : []}<strong>${date}</strong>`) : []
    return h`<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse"><tr>${th('Item')}${due && hasDue ? th(due.head, 'right', '104') : []}</tr>${each(h`<tr><td valign="top" style="padding:14px ${px}px;border-bottom:1px solid ${it.line}">${title}${facts(false)}</td>${hasDue ? h`<td align="right" valign="top" width="104" style="width:104px;padding:14px ${px}px 14px 0;border-bottom:1px solid ${it.line};font-family:${F};font-size:15px;line-height:1.5;white-space:nowrap;color:${t.text}">${cell}</td>` : []}</tr>`)}</table>`
  }
  if (it.style === 'cards')
    return each(T(row(body(), st({ padding: '16px', 'border-radius': it.radius ? `${it.radius}px` : '', border: it.border ? `1px solid ${it.border}` : '', [`border-${it.barSide}`]: it.bar ? `4px solid ${it.bar}` : '' }), it.bg), 'margin:0 0 12px'))
  return T(each(row(body(), `padding:14px 0;border-bottom:1px solid ${it.line};`)), `border-top:1px solid ${it.line};`)
}

// ── button ──
function button(d: Design, label: Node[], href: Node[]): Node[] {
  const { F, p } = kit(d)
  const b = d.button
  if (b.style === 'link') return p(h`<a href="${href}" style="color:${b.text};font-weight:bold;text-decoration:underline">${label}</a> &rarr;`)
  const fill = b.style === 'solid' ? b.bg : d.card.bg
  const width = b.width === 'full' ? d.card.width - 2 * d.card.padSide : 260
  const arc = Math.round(Math.min(50, (b.radius / 48) * 100))
  return h`<div style="text-align:${al(b.align)};padding:4px 0 20px"><!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:48px;v-text-anchor:middle;width:${width}px;" arcsize="${arc}%" strokecolor="${b.bg}" strokeweight="2px" fillcolor="${fill}"><w:anchorlock/><center style="color:${b.text};font-family:${F};font-size:16px;font-weight:bold;">${label}</center></v:roundrect><![endif]--><!--[if !mso]><!--><a href="${href}" style="display:${b.width === 'full' ? 'block' : 'inline-block'};background-color:${fill};border:2px solid ${b.bg};border-radius:${b.radius}px;padding:10px 24px;font-family:${F};font-size:16px;font-weight:bold;line-height:24px;text-align:center;text-decoration:none;color:${b.text}">${label}</a><!--<![endif]--></div>`
}

/** Address in an attribute: compiler-made, so already checked; only encoded. */
const typedHref = (u: string): Node[] => [raw(html(u))]

// ── the body: the notice's sections and what the library added ──
function sections(r: Ready, print: boolean): Node[] {
  const { notice: n, design: d } = r
  const { t, p, box } = kit(d)
  const list = items(r)
  const part: Record<SectionId, () => Node[]> = {
    greeting: () => (r.greeting.length ? p(r.greeting) : []),
    intro: () => (r.intro.length ? p(r.intro) : []),
    items: () => (list.length ? h`${list}<div style="height:20px;line-height:20px;font-size:1px">&nbsp;</div>` : []),
    alert: () => n.alerts.flatMap((a) => cond(a.if, box(d.alert, parse(a.text)))),
    details: () => (n.details ? cond(n.details.if, box(d.box, h`<strong>${[text(n.details.heading)]}</strong>${n.details.lines.flatMap((l) => cond(l.if, h`<br>${parse(l.text)}`))}`)) : []),
    note: () => r.notes.flatMap((x) => cond(x.if, p(x.nodes, `color:${t.muted};`))),
    button: () => (n.button && d.button.show && !print ? cond(n.button.if, button(d, r.buttonLabel, parse(n.button.href))) : []),
    closing: () => p(h`${r.closing}<br>${r.name}`),
  }
  const added = (a: Added): Node[] => {
    switch (a.add) {
      case 'text':
        return p(words(a.words, n) ?? [])
      case 'notice':
        return box(d.box, words(a.words, n) ?? [])
      case 'divider':
        return h`<div style="padding:4px 0 16px">${line(d.items.line)}</div>`
      case 'spacer': {
        const px = Number.isFinite(a.px) ? Math.min(80, Math.max(4, Math.round(a.px))) : 16
        return h`<div style="height:${px}px;line-height:${px}px;font-size:1px">&nbsp;</div>`
      }
      case 'image': {
        const src = url(a.src, ['https:'])
        return src ? h`<p style="margin:0 0 16px"><img src="${html(src)}" alt="${[text(clean(a.alt))]}" style="display:block;max-width:100%;height:auto;border:0"></p>` : []
      }
      case 'button': {
        const href = url(a.href)
        return href && clean(a.label) && !print ? button(d, [text(clean(a.label))], typedHref(href)) : []
      }
      case 'columns': {
        const col = (w: Added & { add: 'columns' }, side: 'left' | 'right') => h`<div style="display:inline-block;width:100%;max-width:${Math.floor((d.card.width - 2 * d.card.padSide) / 2) - 2}px;vertical-align:top">${p(words(w[side], n) ?? [], 'padding-right:12px;')}</div>`
        return h`<div style="font-size:0">${col(a, 'left')}${col(a, 'right')}</div>`
      }
      default:
        return []
    }
  }
  const order = [...d.sections]
  const [note, btn] = [order.indexOf('note'), order.indexOf('button')]
  if (n.noteAfterButton && note >= 0 && note < btn) [order[note], order[btn]] = ['button', 'note']
  return order.flatMap((s) => (typeof s === 'string' ? part[s]() : added(s)))
}

// ── header ──
function header(r: Ready): Node[] {
  const { design: d } = r
  const { F, HF } = kit(d)
  const x = d.header
  const logo = url(d.perLibrary.logo, ['https:'])
  const centre = x.layout === 'centre'
  const alt: Node[] = clean(d.perLibrary.logoAlt) ? [text(clean(d.perLibrary.logoAlt))] : r.name
  const mark: Node[] = logo
    ? h`<img src="${html(logo)}" alt="${alt}" height="${x.logoHeight}" style="display:block;${centre ? 'margin:0 auto;' : ''}height:${x.logoHeight}px;width:auto;max-width:100%;border:0;font-family:${HF};font-size:${x.nameSize}px;color:${x.text}">`
    : x.monogram
      ? h`<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="${al(centre ? 'centre' : 'left')}" style="border-collapse:separate"><tr><td width="44" height="44" align="center" valign="middle" bgcolor="${x.monogramBg}" style="background-color:${x.monogramBg};border-radius:${x.monogramRadius}px;width:44px;min-width:44px;height:44px;font-family:${HF};font-size:22px;font-weight:bold;line-height:44px;color:${x.monogramText}">${r.initial}</td></tr></table>`
      : []
  const name = x.name && !logo ? h`<span style="font-family:${HF};font-size:${x.nameSize}px;line-height:1.3;font-weight:bold;color:${x.text};${x.nameCase === 'spaced' ? 'letter-spacing:2px;text-transform:uppercase;' : ''}overflow-wrap:anywhere">${r.name}</span>` : []
  const words0 = clean(d.perLibrary.tagline)
  const tag = x.tagline && words0 && !(logo && x.layout !== 'split') ? h`<span style="font-family:${F};font-size:14px;line-height:1.4;color:${x.taglineColour || x.text}">${[text(words0)]}</span>` : []
  if (centre) return T(row(h`${mark}${name.length ? h`<div style="padding-top:10px">${name}</div>` : []}${tag.length ? h`<div style="padding-top:4px">${tag}</div>` : []}`, 'text-align:center'), '', ' align="center"')
  const inName = x.layout === 'left' ? tag : []
  const left = h`<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="left"><tr>${mark.length ? h`<td valign="middle" style="padding:4px ${name.length ? 12 : 0}px 4px 0">${mark}</td>` : []}${name.length || inName.length ? h`<td valign="middle" style="padding:4px 0">${name}${name.length && inName.length ? '<br>' : ''}${inName}</td>` : []}</tr></table>`
  return T(h`<tr><td valign="middle">${left}</td>${tag.length && x.layout === 'split' ? h`<td align="right" valign="middle" width="30%" style="padding-left:12px">${tag}</td>` : []}</tr>`)
}

// ── footer ──
function footer(r: Ready): Node[] {
  const { design: d } = r
  const { F } = kit(d)
  const f = d.footer
  const L = d.perLibrary
  const fs = (x: Node[]) => h`<span style="font-family:${F};font-size:14px;line-height:1.6;color:${f.text};overflow-wrap:anywhere">${x}</span>`
  const a = (label: Node[], href: Node[]) => h`<a href="${href}" style="font-family:${F};font-size:14px;line-height:1.6;color:${f.link};text-decoration:underline">${label}</a>`
  const dot = fs(h` &nbsp;&middot;&nbsp; `)
  const sep = (list: Node[][], s: Node[]) => list.flatMap((x, i) => (i ? [...s, ...x] : x))
  const good = (list: ReadonlyArray<{ label: string; href: string; icon?: string }>) =>
    list.flatMap((l) => {
      const href = url(l.href)
      const label = clean(l.label)
      return href && label ? [{ label, href, icon: url(l.icon, ['https:']) }] : []
    })
  const links = good(L.links).map((l) => a([text(l.label)], typedHref(l.href)))
  const nets = good(L.social.map((s) => ({ label: s.network, href: s.href, ...(s.icon ? { icon: s.icon } : {}) })))
  const netText = (s: Node[]) => sep(nets.map((l) => a([text(l.label)], typedHref(l.href))), s)
  const s = d.social
  const badge = (l: (typeof nets)[number], i: number) => {
    const inside = s.style === 'image' && l.icon
      ? h`<a href="${html(l.href)}"><img src="${html(l.icon)}" alt="${[text(l.label)]}" width="${s.size}" height="${s.size}" style="display:block;width:${s.size}px;height:${s.size}px;border:0"></a>`
      : h`<a href="${html(l.href)}" title="${[text(l.label)]}" aria-label="${[text(l.label)]}" style="display:block;font-family:Arial,sans-serif;font-size:14px;line-height:${s.size}px;font-weight:bold;text-decoration:none;color:${s.text}">${[text(short(l.label))]}</a>`
    const bg = s.style === 'image' && l.icon ? '' : s.bg
    return h`<td style="padding:${i ? '0 0 0 8px' : '0'}"><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate"><tr><td align="center" valign="middle" width="${s.size}" height="${s.size}"${bg ? ` bgcolor="${bg}"` : ''} style="${bg ? `background-color:${bg};` : ''}width:${s.size}px;height:${s.size}px;border-radius:${s.radius}px">${inside}</td></tr></table></td>`
  }
  const social = !nets.length ? [] : s.style === 'text' ? netText(dot) : h`<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="${al(f.align)}" style="border-collapse:separate"><tr>${nets.flatMap(badge)}</tr></table>`
  const mail = url(`mailto:${clean(L.email)}`)
  const say = (v: string, before = '') => (clean(v) ? fs([...(before ? [text(before)] : []), text(clean(v))]) : [])
  const one = {
    address: say(L.address), phone: say(L.phone, 'Phone '), email: clean(L.email) && mail ? a([text(clean(L.email))], typedHref(mail)) : [], hours: say(L.hours),
    links: sep(links, dot), social, smallprint: clean(L.smallprint) ? h`<span style="font-family:${F};font-size:13px;line-height:1.5;color:${f.text}">${[text(clean(L.smallprint))]}</span>` : [],
  }
  const on = f.show.filter((k) => one[k].length)
  if (!on.length) return []
  let inside: Node[]
  if (f.layout === 'columns') {
    const width = Math.floor((d.card.width - 2 * d.card.padSide) / 2) - 2
    const col = (head: string, list: Node[][]) => list.length ? h`<!--[if mso]><td width="50%" valign="top"><![endif]--><div style="display:inline-block;width:100%;max-width:${width}px;vertical-align:top;padding-bottom:16px"><div style="padding-right:12px"><strong style="font-family:${F};font-size:15px;line-height:2;color:${f.link}">${[text(head)]}</strong><br>${sep(list, h`<br>`)}</div></div><!--[if mso]></td><![endif]-->` : []
    const visit = on.filter((k) => ['address', 'phone', 'email', 'hours'].includes(k)).map((k) => one[k])
    const online = [...(on.includes('links') ? links : []), ...(on.includes('social') ? [s.style === 'text' ? netText(fs(h` &middot; `)) : social] : [])]
    inside = h`<div style="font-size:0"><!--[if mso]><table role="presentation" width="100%"><tr><![endif]-->${col('Visit us', visit)}${col('Online', online)}<!--[if mso]></tr></table><![endif]--></div>${on.includes('smallprint') ? h`<div style="padding-top:8px">${one.smallprint}</div>` : []}`
  } else {
    // phone and email share a line when the library put them together
    const lines: Array<{ k: string; nodes: Node[] }> = []
    for (const k of on) {
      const last = lines[lines.length - 1]
      if ((k === 'email' && last?.k === 'phone') || (k === 'phone' && last?.k === 'email')) last.nodes = [...last.nodes, ...dot, ...one[k]]
      else lines.push({ k, nodes: k === 'address' ? h`${f.align === 'centre' || f.bg ? h`<strong style="font-family:${F};font-size:15px;line-height:1.8;color:${f.bg ? f.link : f.text}">${r.name}</strong><br>` : []}${one.address}` : one[k] })
    }
    inside = T(lines.flatMap((l, i) => row(l.nodes, `padding-top:${!i ? 0 : l.k === 'links' ? 12 : l.k === 'social' || l.k === 'smallprint' ? 14 : 0}px;text-align:${al(f.align)}`)))
  }
  const P = d.card.padSide
  const R = d.card.radius
  return h`${f.rule ? row(line(f.rule), `padding:0 ${f.place === 'page' ? 0 : P}px`) : []}${row(inside, `padding:${f.bg || f.place === 'page' ? 26 : 16}px ${f.place === 'page' ? 16 : P}px 28px;${f.place === 'card' && R ? `border-radius:0 0 ${R}px ${R}px;` : ''}`, f.bg)}`
}
const SHORT: Record<string, string> = { facebook: 'f', instagram: 'ig', youtube: 'yt', x: 'X', twitter: 'X', linkedin: 'in', tiktok: 'tt', whatsapp: 'wa', telegram: 'tg', mastodon: 'm', bluesky: 'bs' }
const short = (name: string) => SHORT[name.toLowerCase()] ?? Array.from(name).slice(0, 2).join('')

export function htmlLetter(r: Ready): Node[] {
  const { design: d } = r
  const { t, F, HF } = kit(d)
  const x = d.header
  const P = d.card.padSide
  const R = d.card.radius
  const W = d.card.width
  const stripe = x.stripe.length ? h`<tr><td style="padding:0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${x.stripe.map((c) => `<td height="6" bgcolor="${c}" width="${Math.floor(100 / x.stripe.length)}%" style="background-color:${c};height:6px;line-height:6px;font-size:1px">&nbsp;</td>`).join('')}</tr></table></td></tr>` : []
  const banner = x.banner ? row(h`<img src="${html(x.banner)}" alt="${[text(clean(x.bannerAlt))]}" width="${W}" style="display:block;width:100%;height:auto;border:0">`) : []
  const top = x.show
    ? h`${row(header(r), `padding:${x.padY}px ${x.place === 'page' ? 0 : P}px;${x.place === 'card' && !d.card.topBar && R ? `border-radius:${R}px ${R}px 0 0;` : ''}`, x.bg)}${stripe}${x.rule ? row(line(x.rule, x.ruleWidth, x.ruleStyle), `padding:0 ${P}px`) : []}${banner}`
    : []
  const hero = d.hero
  const kicker = hero.kicker && r.kicker.length ? h`<div style="padding-bottom:6px;font-family:${F};font-size:14px;line-height:1.4;font-weight:bold;letter-spacing:0.5px;color:${hero.kickerColour}">${r.kicker}</div>` : []
  const tight = hero.style === 'solid' && x.show && x.place === 'card' && x.bg === hero.bg
  const title = row(
    h`${kicker}<h1 style="margin:0;font-family:${HF};font-size:${t.headingSize}px;line-height:1.2;font-weight:${t.headingWeight};color:${hero.text || t.heading};overflow-wrap:anywhere">${r.title}</h1>`,
    `padding:${tight ? 0 : hero.padY}px ${P}px ${hero.style === 'plain' ? 12 : hero.padY}px;text-align:${al(t.headingAlign)}`,
    hero.style === 'plain' ? '' : hero.bg,
  )
  const main = row(sections(r, false), `padding:${hero.style === 'plain' ? 4 : 28}px ${P}px 12px`)
  const foot = footer(r)
  const bar = d.card.topBar ? h`<tr><td height="${d.card.topBarHeight}" bgcolor="${d.card.topBar}" style="background-color:${d.card.topBar};height:${d.card.topBarHeight}px;line-height:${d.card.topBarHeight}px;font-size:1px;${R ? `border-radius:${R}px ${R}px 0 0;` : ''}">&nbsp;</td></tr>` : []
  const card = T(
    h`${bar}${x.place === 'card' ? top : []}${title}${main}${d.footer.place === 'card' ? foot : []}`,
    st({ 'background-color': d.card.bg, 'border-radius': R ? `${R}px` : '', border: d.card.border ? `1px solid ${d.card.border}` : '' }), ` bgcolor="${d.card.bg}"`,
  )
  return h`<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${d.page.bg}">${r.preheader}${'&#847;&zwnj;&nbsp;'.repeat(30)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${d.page.bg}" style="background-color:${d.page.bg}"><tr><td align="center" style="padding:${d.page.padTop}px ${d.page.padSide}px 32px">
<!--[if mso]><table role="presentation" width="${W}" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:${W}px;margin:0 auto;text-align:left">
${x.place === 'page' && x.show ? row(T(top), 'padding-bottom:16px') : []}
${row(card)}
${d.footer.place === 'page' && foot.length ? row(T(foot)) : []}
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>`
}

// ── paper ── ink only where it means something: no page colour, no dark bands
const onPaper = (d: Design): Design => ({
  ...d, card: { ...d.card, bg: '#ffffff' },
  type: { ...d.type, text: '#111111', muted: '#333333', heading: '#111111' },
  header: { ...d.header, bg: '', text: '#111111', taglineColour: '#333333', stripe: [], banner: '', monogram: false },
  items: { ...d.items, style: 'list', bg: '', due: 'text', line: '#999999' },
  box: { ...d.box, bg: '', border: '#999999', bar: '', text: '#111111' },
  alert: { ...d.alert, bg: '', border: '#111111', bar: '', text: '#111111' },
})

export function printLetter(input: Ready): Node[] {
  const r: Ready = { ...input, design: onPaper(input.design) }
  const { design: d } = r
  const { p, t, HF } = kit(d)
  const L = d.perLibrary
  const foot = (['address', 'phone', 'email', 'hours', 'smallprint'] as const).filter((k) => d.footer.show.includes(k)).map((k) => clean(L[k])).filter(Boolean)
  const address = p([...parse('{firstname} {surname}{?r_address}\n{r_address}{/}{?r_address2}\n{r_address2}{/}{?r_city}\n{r_city}{?r_zipcode} {r_zipcode}{/}{/}{?r_country}\n{r_country}{/}')])
  return h`<div style="max-width:640px;margin:0 auto;font-size:${t.size}px">
${d.header.show ? header(r) : []}${line('#111111', 2)}
<div style="padding:24px 0">${address}${p([field('today')])}<h1 style="margin:0 0 16px;font-family:${HF};font-size:22px;line-height:1.3;color:#111111">${r.title}</h1>
${sections(r, true)}</div>
${foot.length ? h`${line('#999999')}${p(foot.flatMap((f, i) => (i ? [raw(' &middot; '), text(f)] : [text(f)])), 'font-size:13px;padding-top:8px;')}` : []}
</div>`
}

/** 80 mm receipt paper. */
export function slip(r: Ready): Node[] {
  const s = r.notice.slip
  if (!s) return []
  const { design: d } = r
  const F = FONTS[d.type.font]
  const logo = url(d.perLibrary.logo, ['https:'])
  const p = (x: Node[], extra = '') => h`<p style="margin:0 0 8px;overflow-wrap:anywhere;${extra}">${x}</p>`
  const small = d.footer.show.includes('smallprint') ? clean(d.perLibrary.smallprint) : ''
  return h`<div style="width:72mm;max-width:100%;font-family:${F};font-size:13px;line-height:1.35;color:#000000">
${logo ? h`<img src="${html(logo)}" alt="${r.name}" style="display:block;max-width:100%;max-height:50px;margin:0 auto 8px">` : []}${p(r.name, 'font-size:16px;font-weight:bold;text-align:center;')}
${s.top.flatMap((l) => cond(l.if, p(parse(l.text))))}
${s.heads.flatMap((x) => [when(x.if, h`${p(parse(x.heading), 'font-weight:bold;border-bottom:1px solid #000000;')}${[repeat(x.loop, p(parse(x.line)))]}`)])}
${p(parse(s.end), 'text-align:center;')}${small ? p([text(small)], 'text-align:center;') : []}
</div>`
}
