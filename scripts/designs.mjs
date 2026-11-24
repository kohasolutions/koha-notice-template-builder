// The same designs every time (seeded), with hard text in every place a person can type.
import { DEFAULT, FONTS, SECTIONS } from '../src/compiler/design.ts'

export const HARD = [
  '', 'Lahore Public Library', `O'Brien & "Sons" <b>Library</b>`, 'C:\\new\\table $x ${branch.branchname} \\', '[% branch.branchname %] %] [%- STOP -%]',
  '<<branches.branchname>> << x >> <<today>>', 'a ---- b -- c -----', 'کتب خانہ 図書館 📚', '&amp; &#91;% x %&#93; $1 $&', '# [# %] ; | END', 'line\r\n----\r\nbreak', "it's '\\' _ '",
]
const URLS = ['', 'https://example.org/l.png?a=1&b=2', "https://example.org/a'b%5D$x/(1).png", 'https://example.org/[%x%]?q=<<y>>&z=----', 'javascript:alert(1)', 'mailto:a@example.org', 'http://example.org/', 'not an address']
const COLOURS = ['#1f4e79', '#AB12cd', '#000000', 'red;} [% x %]', '']

export function designs(n) {
  let s = 20261124
  const rnd = (k) => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return Math.floor((s / 4294967296) * k) }
  const pick = (l) => l[rnd(l.length)]
  const links = () => Array.from({ length: rnd(4) }, () => ({ label: pick(HARD), href: pick(URLS) }))
  const out = [DEFAULT]
  while (out.length < n)
    out.push({
      libraryName: pick(HARD), logo: pick(URLS), headerLayout: pick(['bar', 'band', 'centred', 'x']),
      headerColour: pick(COLOURS), headerText: pick(COLOURS), pageColour: pick(COLOURS), bodyColour: pick(COLOURS), textColour: pick(COLOURS), linkColour: pick(COLOURS),
      font: pick([...Object.keys(FONTS), 'constructor']), fontSize: pick([14, 16, 99, NaN]), width: pick([480, 600, 9999]), radius: pick([0, 12, -3]),
      order: [...SECTIONS].sort(() => rnd(3) - 1).slice(0, 1 + rnd(5)),
      wording: { intro: pick(HARD), account: pick(HARD), closing: pick(HARD) },
      footerText: pick(HARD), footerLinks: links(), social: links(),
    })
  return out
}
