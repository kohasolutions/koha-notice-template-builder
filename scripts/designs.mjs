// The same designs every time (seeded), with hard text in every place a person can type.
import { ADDED_FOR_PROOF } from './added.mjs'
import { SPEC, SECTIONS, fromReady } from '../src/compiler/design.ts'
import { READY } from '../src/compiler/ready.ts'
import { PARTS, withPart } from '../src/builder/parts.ts'
import { EXAMPLE_LIBRARY } from '../src/compiler/example.ts'

export const HARD = [
  '', 'Lahore Public Library', `O'Brien & "Sons" <b>Library</b>`, 'C:\\new\\table $x ${branch.branchname} \\', '[% branch.branchname %] %] [%- STOP -%]',
  '<<branches.branchname>> << x >> <<today>>', 'a ---- b -- c -----', 'کتب خانہ 図書館 📚', '&amp; &#91;% x %&#93; $1 $&', '# [# %] ; | END', 'line\r\n----\r\nbreak', "it's '\\' _ '", '{title} {?x}{/}', '----',
]
export const URLS = ['', 'https://example.org/l.png?a=1&b=2', "https://example.org/a'b%5D$x/(1).png", 'https://example.org/[%x%]?q=<<y>>&z=----', 'javascript:alert(1)', 'mailto:a@example.org', 'http://example.org/', 'not an address']
const COLOURS = ['#1f4e79', '#AB12cd', '#000000', 'red;} [% x %]', '']
export const SAMPLE_LIBRARY = EXAMPLE_LIBRARY
export const readyDesigns = () => READY.map((r) => ({ ...fromReady(r), id: r.id, perLibrary: SAMPLE_LIBRARY }))

/** The ready templates' switches: every part off, each part off on its own (a design in turn), and an empty library. */
export const switchedDesigns = () => [
  ...READY.map((r) => ({ ...PARTS.reduce((d, p) => withPart(d, p.id, false, r.id), fromReady(r)), id: `${r.id} all off`, perLibrary: SAMPLE_LIBRARY })),
  ...PARTS.map((p, i) => { const r = READY[i % READY.length]; return { ...withPart(fromReady(r), p.id, false, r.id), id: `${r.id} ${p.id} off`, perLibrary: SAMPLE_LIBRARY } }),
  ...READY.map((r) => ({ ...fromReady(r), id: `${r.id} no details` })),
]
function roll(seed) {
  let s = seed
  const rnd = (k) => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return Math.floor((s / 4294967296) * k) }
  const pick = (l) => l[rnd(l.length)]
  return { rnd, pick }
}
export function randomDesigns(n) {
  const { rnd, pick } = roll(20261124)
  const val = (r) => {
    if (rnd(25) === 0) return pick([null, NaN, 'x', [], {}, 'constructor'])
    switch (r.is) {
      case 'colour': case 'colour?': return pick(COLOURS)
      case 'px': return pick([r.min, r.max, r.min - 9, r.max + 99, r.min + rnd(r.max - r.min)])
      case 'bool': return rnd(2) === 0
      case 'one': return pick(r.of)
      case 'list': return [...r.of].sort(() => rnd(3) - 1).slice(0, rnd(r.of.length + 1))
      case 'colours': return Array.from({ length: rnd(4) }, () => pick(COLOURS))
      case 'https': return pick(URLS)
      case 'text': return pick(HARD)
    }
  }
  const words = () => (rnd(2) ? pick(HARD) : [pick(HARD), { field: pick(['library', 'firstname', 'count', 'nothing', 'title']) }, pick(HARD)])
  const links = () => Array.from({ length: rnd(4) }, () => ({ label: pick(HARD), href: pick(URLS) }))
  const look = () => Object.fromEntries(Object.entries(SPEC).map(([g, rules]) => [g, Object.fromEntries(Object.entries(rules).map(([k, r]) => [k, val(r)]))]))
  const sections = () => [...SECTIONS, ...ADDED_FOR_PROOF(pick, rnd)].sort(() => rnd(3) - 1).slice(0, 2 + rnd(12))
  const choice = () => ({
    subject: words(), preheader: words(), kicker: words(), title: words(), wording: { greeting: words(), intro: words(), note: words(), button: words(), closing: words() },
    overrides: { header: { layout: pick(['centre', 'split']) }, sections: sections() },
  })
  return Array.from({ length: n }, () => ({
    ...look(), sections: sections(),
    perLibrary: { name: pick(HARD), tagline: pick(HARD), logo: pick(URLS), logoAlt: pick(HARD), address: pick(HARD), phone: pick(HARD), email: pick(['a@example.org', ...HARD]), hours: pick(HARD), links: links(), social: links().map((l) => ({ network: l.label, href: l.href, icon: pick(URLS) })), smallprint: pick(HARD) },
    perNotice: Object.fromEntries(['CHECKOUT', 'HOLD', 'ODUE', 'AUTO_RENEWALS', 'AUTO_RENEWALS_DGST', 'WELCOME', 'PASSWORD_RESET', 'HOLDDGST', 'DUEDGST'].map((c) => [c, choice()])),
  }))
}
/** Every hard text in every place at once: one design for each text. */
export function hardDesigns() {
  return HARD.filter(Boolean).map((v, i) => {
    const r = READY[i % READY.length]
    const w = { subject: v, preheader: v, kicker: v, title: v, wording: { greeting: v, intro: v, note: v, button: v, closing: v } }
    return { ...fromReady(r), perLibrary: { ...SAMPLE_LIBRARY, name: v, tagline: v, logoAlt: v, logo: i % 2 ? URLS[1 + (i % 3)] : '', address: v, phone: v, hours: v, smallprint: v, links: [{ label: v, href: URLS[1 + (i % 3)] }], social: [{ network: v, href: URLS[3], icon: URLS[2] }] }, perNotice: new Proxy({}, { getOwnPropertyDescriptor: () => ({ value: w, configurable: true, enumerable: true }), get: () => w }) }
  })
}
