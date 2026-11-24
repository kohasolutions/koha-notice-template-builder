import type { Fields, Node } from './nodes.ts'
import { field, raw, repeat, text, when } from './nodes.ts'

export interface Notice {
  code: string
  module: string
  /** Which situation tools/koha-render.pl creates for the proof */
  scenario: string
  fields: Fields
  intro: string
  account: string
  details: Node[]
}

const common: Fields = {
  library: { tt: 'branch.branchname', label: 'Library name' },
  firstname: { tt: 'borrower.firstname', label: 'First name' },
  opac: { tt: "Koha.Preference('OPACBaseURL')", label: 'Catalogue address', use: ['Koha'] },
}
const cell = 'padding:10px 0;border-bottom:1px solid #dddddd;'

export const NOTICES: readonly Notice[] = [
  {
    code: 'CHECKOUT',
    module: 'circulation',
    scenario: 'checkout',
    intro: 'You borrowed these items. Please return or renew them by the date shown.',
    account: 'See your loans and renew them online',
    fields: {
      ...common,
      title: { tt: 'item.biblio.title | $Remove_MARC_punctuation | trim', label: 'Title', perItem: true },
      author: { tt: 'item.biblio.author | $Remove_MARC_punctuation | trim', label: 'Author', perItem: true },
      due: { tt: 'checkout.date_due | $KohaDates', label: 'Due date', perItem: true },
      barcode: { tt: 'item.barcode', label: 'Barcode', perItem: true },
      hasAuthor: { tt: 'item.biblio.author', label: 'Has an author', perItem: true },
    },
    details: [
      raw('<table role="presentation" width="100%" style="border-collapse:collapse;margin:0 0 16px;">'),
      repeat([
        raw(`<tr><td style="${cell}"><strong>`), field('title'), raw('</strong>'),
        when('hasAuthor', [raw('<br>'), field('author')]),
        raw('<br>'), text('Due '), raw('<strong> '), field('due'), raw('</strong> · '), field('barcode'), raw('</td></tr>'),
      ]),
      raw('</table>'),
    ],
  },
  {
    code: 'HOLD',
    module: 'reserves',
    scenario: 'hold',
    intro: 'The item you reserved is ready for you to collect.',
    account: 'See or cancel your holds online',
    fields: {
      ...common,
      title: { tt: 'biblio.title | $Remove_MARC_punctuation | trim', label: 'Title' },
      deadline: { tt: 'hold.expirationdate | $KohaDates', label: 'Collect by' },
      hasDeadline: { tt: 'hold.expirationdate', label: 'Has a deadline' },
      phone: { tt: 'branch.branchphone', label: 'Library phone' },
      address2: { tt: 'branch.branchaddress2', label: 'Address line 2' },
    },
    details: [
      raw('<p style="margin:0 0 12px;"><strong>'), field('title'), raw('</strong>'),
      when('hasDeadline', [raw('<br>Collect it by <strong>'), field('deadline'), raw('</strong>')]),
      when('address2', [raw('<br>'), field('address2')]),
      when('phone', [raw('<br>Phone '), field('phone')], [raw('<br>No phone')]),
      raw('</p>'),
    ],
  },
]
