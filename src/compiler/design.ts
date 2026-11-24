import { colour, px } from './escape.ts'

export const FONTS = {
  arial: 'Arial,Helvetica,sans-serif',
  georgia: 'Georgia,serif',
  verdana: 'Verdana,Geneva,sans-serif',
  system: 'system-ui,sans-serif',
} as const
export type Font = keyof typeof FONTS
export type SectionId = 'greeting' | 'intro' | 'details' | 'account' | 'closing'
export const SECTIONS: readonly SectionId[] = ['greeting', 'intro', 'details', 'account', 'closing']

export interface Link {
  label: string
  href: string
}
/** Everything a library may choose. Every value is typed by a person or loaded from a file, so none is trusted. */
export interface Design {
  libraryName: string // '' = the name Koha has
  logo: string
  headerLayout: 'bar' | 'band' | 'centred'
  headerColour: string
  headerText: string
  pageColour: string
  bodyColour: string
  textColour: string
  linkColour: string
  font: Font
  fontSize: number
  width: number
  radius: number
  order: SectionId[]
  wording: Partial<Record<'intro' | 'account' | 'closing', string>>
  footerText: string
  footerLinks: Link[]
  social: Link[]
}

export const DEFAULT: Design = {
  libraryName: '',
  logo: '',
  headerLayout: 'bar',
  headerColour: '#1f4e79',
  headerText: '#ffffff',
  pageColour: '#ffffff',
  bodyColour: '#ffffff',
  textColour: '#1a1a1a',
  linkColour: '#1f4e79',
  font: 'arial',
  fontSize: 16,
  width: 600,
  radius: 0,
  order: [...SECTIONS],
  wording: {},
  footerText: '',
  footerLinks: [],
  social: [],
}

/** The design with every value that could break a notice replaced by one that cannot. */
export function safe(d: Design): Design {
  const c = (k: 'headerColour' | 'headerText' | 'pageColour' | 'bodyColour' | 'textColour' | 'linkColour') => colour(d[k], DEFAULT[k])
  const order = SECTIONS.filter((s) => d.order.includes(s)).sort((a, b) => d.order.indexOf(a) - d.order.indexOf(b))
  return {
    ...d,
    headerColour: c('headerColour'),
    headerText: c('headerText'),
    pageColour: c('pageColour'),
    bodyColour: c('bodyColour'),
    textColour: c('textColour'),
    linkColour: c('linkColour'),
    headerLayout: (['bar', 'band', 'centred'] as const).includes(d.headerLayout) ? d.headerLayout : 'bar',
    font: Object.hasOwn(FONTS, d.font) ? d.font : 'arial',
    fontSize: px(d.fontSize, 12, 22),
    width: px(d.width, 320, 800),
    radius: px(d.radius, 0, 24),
    // the details are the point of the message: a notice without them is not one
    order: order.includes('details') ? order : [...order, 'details'],
  }
}
