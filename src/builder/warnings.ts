// What the builder warns about while a library changes things. Warnings never stop anything: the notice is safe either
// way (safe() and the proof see to that); they say where a patron may have trouble reading it.
import { compile, SUBJECT_MAX, subjectTooLong } from '../compiler/compile.ts'
import type { Design } from '../compiler/design.ts'
import { safe } from '../compiler/design.ts'
import { BASE } from '../compiler/ready.ts'
import { OPTION } from './labels.ts'
import { effective, notice, SAMPLES } from './state.ts'

// ── contrast (WCAG 2.2, 1.4.3) ──
const channel = (c: number): number => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16)
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
}
/** The contrast ratio of two #rrggbb colours, 1 to 21. */
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

export interface Warning { id: string; text: string }

/** Pairs of text and the colour behind it, on the design as this notice gets it. */
export function contrastWarnings(input: Design, code: string): Warning[] {
  const d = safe(effective(input, code), BASE, code)
  const card = d.card.bg
  const under = (place: 'card' | 'page', bg: string) => bg || (place === 'page' ? d.page.bg : card)
  const heroBg = d.hero.style === 'plain' ? card : d.hero.bg || card
  const pairs: Array<[string, string, string, number]> = [
    ['Body text', d.type.text, card, 4.5],
    ['Quiet text', d.type.muted, card, 4.5],
    ['Links', d.type.link, card, 4.5],
    ['Heading', d.hero.style === 'solid' && d.hero.text ? d.hero.text : d.type.heading, heroBg, 3],
    ...(d.header.show ? [['Header text', d.header.text, under(d.header.place, d.header.bg), 4.5] as [string, string, string, number]] : []),
    ...(d.button.show ? [['Button text', d.button.text, d.button.style === 'solid' ? d.button.bg : card, 4.5] as [string, string, string, number]] : []),
    ['Footer text', d.footer.text, under(d.footer.place, d.footer.bg), 4.5],
    ['Footer links', d.footer.link, under(d.footer.place, d.footer.bg), 4.5],
    ['Information box', d.box.text, d.box.bg || card, 4.5],
    ['Warning box', d.alert.text, d.alert.bg || card, 4.5],
    ...(d.items.due === 'pill' || d.items.due === 'stamp' ? [[`Due date (${OPTION[d.items.due] ?? d.items.due})`, d.items.dueText, d.items.dueBg || card, 4.5] as [string, string, string, number]] : []),
    ...(d.items.style === 'table' && d.items.headBg ? [['Table heading', d.items.headText, d.items.headBg, 4.5] as [string, string, string, number]] : []),
  ]
  return pairs.flatMap(([what, fg, bg, need]) => {
    const r = contrast(fg, bg)
    return r < need ? [{ id: `contrast ${what}`, text: `${what} is hard to read: contrast ${r.toFixed(1)} to 1, at least ${need} to 1 is needed.` }] : []
  })
}

// ── SMS ──
// GSM 03.38: the basic set is one unit, the extension set two; anything else sends the whole message as UCS-2.
const GSM = new Set(Array.from('@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'))
const GSM_EXT = new Set(Array.from('^{}\\[~]|€\f'))
/** How many SMS parts a text is sent in, and how. */
export function smsParts(text: string): { parts: number; units: number; unicode: boolean } {
  const chars = Array.from(text)
  const unicode = chars.some((c) => !GSM.has(c) && !GSM_EXT.has(c))
  const units = unicode ? text.length : chars.reduce((n, c) => n + (GSM_EXT.has(c) ? 2 : 1), 0)
  const [one, many] = unicode ? [70, 67] : [160, 153]
  return { parts: units === 0 ? 0 : units <= one ? 1 : Math.ceil(units / many), units, unicode }
}
/** Past this, a patron gets the notice in pieces, and the library pays for each. */
export const SMS_PARTS = 2

/** The longest SMS this notice can be, over every situation Koha printed it in. */
export function smsWarnings(d: Design, code: string): Warning[] {
  const n = notice(code)
  if (!n.formats.includes('sms')) return []
  const c = compile(n, d, 'sms')
  let worst = { parts: 0, units: 0, unicode: false }
  for (const s of Object.values(SAMPLES[code] ?? {})) {
    if (!s.email) continue
    const p = smsParts(c.sample(s.email))
    if (p.parts > worst.parts) worst = p
  }
  return worst.parts > SMS_PARTS
    ? [{ id: 'sms', text: `The SMS can be ${worst.parts} parts long${worst.unicode ? ' (a character outside the SMS alphabet makes every part shorter)' : ''}: a patron gets it in pieces, and each part is charged.` }]
    : []
}

export function subjectWarnings(d: Design, code: string): Warning[] {
  const n = notice(code)
  if (!n.formats.includes('html') && !n.formats.includes('text')) return []
  return subjectTooLong(n, d) ? [{ id: 'subject', text: `Your subject is longer than the ${SUBJECT_MAX} characters Koha keeps, so the standard subject is used.` }] : []
}

export const warnings = (d: Design, code: string): Warning[] => [...contrastWarnings(d, code), ...smsWarnings(d, code), ...subjectWarnings(d, code)]
