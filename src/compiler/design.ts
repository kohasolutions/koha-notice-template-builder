import { colour, px, url } from './escape.ts'

export const FONTS = {
  arial: 'Arial,Helvetica,sans-serif',
  verdana: 'Verdana,Geneva,sans-serif',
  trebuchet: "'Trebuchet MS',Tahoma,Arial,sans-serif",
  tahoma: 'Tahoma,Geneva,sans-serif',
  georgia: "Georgia,'Times New Roman',serif",
  times: "'Times New Roman',Times,serif",
} as const
export type Font = keyof typeof FONTS

/** Typed words; a Koha value is a chip, never code. */
export type Words = string | ReadonlyArray<string | { field: string }>
export const SECTIONS = ['greeting', 'intro', 'items', 'alert', 'details', 'note', 'button', 'closing'] as const
export type SectionId = (typeof SECTIONS)[number]
/** What a library may add between the sections. */
export type Added =
  | { add: 'text' | 'notice'; words: Words }
  | { add: 'divider' }
  | { add: 'spacer'; px: number }
  | { add: 'image'; src: string; alt: string }
  | { add: 'button'; label: string; href: string }
  | { add: 'columns'; left: Words; right: Words }
export const ITEM_FIELDS = ['title', 'author', 'callnumber', 'barcode', 'due', 'fine'] as const
export type ItemField = (typeof ITEM_FIELDS)[number]
export const FOOTER_PARTS = ['address', 'phone', 'email', 'hours', 'links', 'social', 'smallprint'] as const
export type FooterPart = (typeof FOOTER_PARTS)[number]
export interface Link { label: string; href: string }
export interface Social { network: string; href: string; icon?: string }

// Every setting and what it may be. safe() needs nothing else, so a new setting cannot miss its check.
type Rule =
  | { is: 'colour' } // always a colour
  | { is: 'colour?' } // a colour or ''
  | { is: 'px'; min: number; max: number }
  | { is: 'bool' }
  | { is: 'one'; of: readonly string[] }
  | { is: 'list'; of: readonly string[]; must?: string }
  | { is: 'colours' }
  | { is: 'https' }
  | { is: 'text' }
const c: Rule = { is: 'colour' }
const c0: Rule = { is: 'colour?' }
const b: Rule = { is: 'bool' }
const n = (min: number, max: number): Rule => ({ is: 'px', min, max })
const one = (...of: string[]): Rule => ({ is: 'one', of })
const fonts: Rule = { is: 'one', of: Object.keys(FONTS) }
export const SPEC = {
  page: { bg: c, padTop: n(0, 60), padSide: n(0, 40) },
  card: { bg: c, width: n(480, 680), radius: n(0, 24), border: c0, topBar: c0, topBarHeight: n(1, 12), padSide: n(0, 48) },
  type: { font: fonts, headingFont: fonts, size: n(14, 20), headingSize: n(18, 40), headingWeight: one('bold', 'normal'), headingAlign: one('left', 'centre'), text: c, muted: c, heading: c, link: c },
  header: {
    show: b, place: one('card', 'page'), layout: one('left', 'centre', 'split'), bg: c0, text: c, padY: n(0, 60), name: b, nameSize: n(13, 32), nameCase: one('none', 'spaced'),
    tagline: b, taglineColour: c0, logoHeight: n(24, 120), monogram: b, monogramBg: c, monogramText: c, monogramRadius: n(0, 28), rule: c0, ruleStyle: one('solid', 'double'), ruleWidth: n(1, 6),
    stripe: { is: 'colours' }, banner: { is: 'https' }, bannerAlt: { is: 'text' },
  },
  hero: { style: one('plain', 'tint', 'solid'), bg: c0, text: c0, kicker: b, kickerColour: c, padY: n(0, 60) },
  items: {
    style: one('list', 'cards', 'table'), fields: { is: 'list', of: ITEM_FIELDS, must: 'title' }, line: c, bg: c0, bar: c0, barSide: one('left', 'top'), radius: n(0, 24), border: c0,
    due: one('text', 'line', 'strong', 'pill', 'stamp', 'side'), dueBg: c0, dueText: c0, headBg: c0, headText: c0,
  },
  box: { bg: c0, border: c0, bar: c0, radius: n(0, 24), text: c },
  alert: { bg: c0, border: c0, bar: c0, radius: n(0, 24), text: c },
  button: { show: b, style: one('solid', 'outline', 'link'), bg: c, text: c, radius: n(0, 28), align: one('left', 'centre'), width: one('auto', 'full') },
  footer: { place: one('card', 'page'), bg: c0, text: c, link: c, align: one('left', 'centre'), layout: one('stacked', 'columns'), rule: c0, show: { is: 'list', of: FOOTER_PARTS } },
  social: { style: one('text', 'badge', 'image'), bg: c0, text: c0, radius: n(0, 22), size: n(24, 44) },
} as const satisfies Record<string, Record<string, Rule>>

export interface Design {
  page: { bg: string; padTop: number; padSide: number }
  card: { bg: string; width: number; radius: number; border: string; topBar: string; topBarHeight: number; padSide: number }
  type: { font: Font; headingFont: Font; size: number; headingSize: number; headingWeight: 'bold' | 'normal'; headingAlign: 'left' | 'centre'; text: string; muted: string; heading: string; link: string }
  header: {
    show: boolean; place: 'card' | 'page'; layout: 'left' | 'centre' | 'split'; bg: string; text: string; padY: number; name: boolean; nameSize: number; nameCase: 'none' | 'spaced'
    tagline: boolean; taglineColour: string; logoHeight: number; monogram: boolean; monogramBg: string; monogramText: string; monogramRadius: number; rule: string; ruleStyle: 'solid' | 'double'; ruleWidth: number
    stripe: string[]; banner: string; bannerAlt: string
  }
  hero: { style: 'plain' | 'tint' | 'solid'; bg: string; text: string; kicker: boolean; kickerColour: string; padY: number }
  items: {
    style: 'list' | 'cards' | 'table'; fields: ItemField[]; line: string; bg: string; bar: string; barSide: 'left' | 'top'; radius: number; border: string
    due: 'text' | 'line' | 'strong' | 'pill' | 'stamp' | 'side'; dueBg: string; dueText: string; headBg: string; headText: string
  }
  box: { bg: string; border: string; bar: string; radius: number; text: string }
  alert: { bg: string; border: string; bar: string; radius: number; text: string }
  button: { show: boolean; style: 'solid' | 'outline' | 'link'; bg: string; text: string; radius: number; align: 'left' | 'centre'; width: 'auto' | 'full' }
  footer: { place: 'card' | 'page'; bg: string; text: string; link: string; align: 'left' | 'centre'; layout: 'stacked' | 'columns'; rule: string; show: FooterPart[] }
  social: { style: 'text' | 'badge' | 'image'; bg: string; text: string; radius: number; size: number }
  sections: Array<SectionId | Added>
  perLibrary: { name: string; tagline: string; logo: string; logoAlt: string; address: string; phone: string; email: string; hours: string; links: Link[]; social: Social[]; smallprint: string }
  /** By notice code. overrides: any of the settings above, for that notice only. */
  perNotice: Readonly<Record<string, NoticeChoices>>
}
export type Group = keyof typeof SPEC
export type Look = Pick<Design, Group>
export interface NoticeChoices {
  subject?: Words
  preheader?: Words
  kicker?: Words
  title?: Words
  wording?: Partial<Record<'greeting' | 'intro' | 'note' | 'button' | 'closing', Words>>
  overrides?: { [G in Group]?: Partial<Design[G]> } & { sections?: Design['sections'] }
}
export interface Ready extends Look { id: string; name: string; about: string; sections: SectionId[] }

export const NO_LIBRARY: Design['perLibrary'] = { name: '', tagline: '', logo: '', logoAlt: '', address: '', phone: '', email: '', hours: '', links: [], social: [], smallprint: '' }
/** A ready design as a full design. */
export const fromReady = (r: Ready): Design => ({ ...r, perLibrary: NO_LIBRARY, perNotice: {} })

function value(rule: Rule, v: unknown, fallback: unknown): unknown {
  switch (rule.is) {
    case 'colour':
      return colour(v, fallback as string)
    case 'colour?':
      return v === '' ? '' : colour(v, fallback as string)
    case 'px':
      return px(v, rule.min, rule.max, fallback as number)
    case 'bool':
      return typeof v === 'boolean' ? v : fallback
    case 'one':
      return typeof v === 'string' && rule.of.includes(v) ? v : fallback
    case 'list': {
      const list = Array.isArray(v) ? [...new Set(v)].filter((x): x is string => rule.of.includes(x as string)) : (fallback as string[])
      return rule.must && !list.includes(rule.must) ? [rule.must, ...list] : list
    }
    case 'colours':
      return (Array.isArray(v) ? v : []).filter((x) => colour(x, '') !== '').slice(0, 8)
    case 'https':
      return url(v, ['https:']) ?? ''
    case 'text':
      return typeof v === 'string' ? v : ''
  }
}

/** The settings for one notice with every value that could break it replaced by one that cannot (the base design's). */
export function safe(d: Design, base: Design, code: string): Design {
  const mine = Object.hasOwn(d.perNotice, code) ? d.perNotice[code] : undefined
  const look: Record<string, Record<string, unknown>> = {}
  for (const [group, rules] of Object.entries(SPEC)) {
    const g = group as Group
    const given: Record<string, unknown> = { ...d[g], ...mine?.overrides?.[g] }
    look[group] = Object.fromEntries(Object.entries(rules).map(([k, r]) => [k, value(r, given[k], (base[g] as unknown as Record<string, unknown>)[k])]))
  }
  // a colour the style cannot do without
  const items = look.items as unknown as Design['items']
  items.dueText ||= d.type.text
  items.dueBg = colour(items.dueBg, items.due === 'pill' || items.due === 'stamp' ? base.card.bg : '')
  items.dueText = colour(items.dueText, base.type.text)
  items.headText = colour(items.headText, base.type.text)
  const social = look.social as unknown as Design['social']
  social.bg = colour(social.bg, base.footer.link)
  social.text = colour(social.text, base.card.bg)
  const asked = mine?.overrides?.sections ?? d.sections
  const seen = new Set<unknown>()
  const sections = (Array.isArray(asked) ? asked : []).filter((s) => {
    if (typeof s !== 'string') return true
    if (!SECTIONS.includes(s) || seen.has(s)) return false
    seen.add(s)
    return true
  })
  // what the message is about: without it, it is not that notice
  for (const s of ['items', 'details', 'alert'] as const) if (!seen.has(s)) sections.push(s)
  return { ...(look as unknown as Look), sections, perLibrary: { ...NO_LIBRARY, ...d.perLibrary }, perNotice: d.perNotice }
}
