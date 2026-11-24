// SPDX-License-Identifier: GPL-3.0-or-later
// The wording and the Koha values of each notice, adapted from koha-notice-templates (GPL, adapted from Koha's own).
// Data only: no layout, no code of the builder. The language of the strings: src/compiler/nodes.ts parse().
import type { Field, Fields, Loop } from '../compiler/nodes.ts'
import type { ItemSpec, Line, Notice } from './model.ts'

const T = '$Remove_MARC_punctuation | trim'
const common: Fields = {
  library: { tt: 'branch.branchname', label: 'Library name' },
  initial: { tt: 'branch.branchname.substr(0, 1)' },
  firstname: { tt: 'borrower.firstname', label: 'First name' },
  opac: { tt: "Koha.Preference('OPACBaseURL')", use: ['Koha'] },
  phone: { tt: 'branch.branchphone', label: 'Library phone' },
  email: { tt: 'branch.branchemail', label: 'Library email' },
  contact: { tt: 'branch.branchphone || branch.branchemail' },
}
const reader: Fields = {
  surname: { tt: 'borrower.surname', label: 'Surname' },
  today: { tt: 'today | $KohaDates' },
  ...Object.fromEntries(['address', 'address2', 'city', 'zipcode', 'country'].map((k) => [`r_${k}`, { tt: `borrower.${k}` }])),
}
const place: Fields = Object.fromEntries(['address1', 'address2', 'address3', 'city', 'zip'].map((k) => [k, { tt: `branch.branch${k}` }]))

function book(biblio: string, item: string, loop?: string): Fields {
  const f = (tt: string, label?: string): Field => ({ tt, ...(loop ? { loop } : {}), ...(label && !loop ? { label } : {}) })
  return {
    title: f(`${biblio}.title | ${T}`, 'Title'),
    title40: f(`${biblio}.title | ${T} | truncate(40)`),
    title60: f(`${biblio}.title | ${T} | truncate(60)`),
    author: f(`${biblio}.author | ${T}`, 'Author'),
    hasAuthor: f(`${biblio}.author`),
    barcode: f(`${item}.barcode`, 'Barcode'),
    callnumber: f(`${item}.itemcallnumber`, 'Call number'),
  }
}
const inLoop = (loop: string, fields: Record<string, string | Field>): Fields =>
  Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, typeof v === 'string' ? { tt: v, loop } : { ...v, loop }]))

const GREETING = '{?firstname}Dear {firstname},{:}Hello,{/}'
const author: [string, string] = ['hasAuthor', '{author}']
const callnumber: [string, string] = ['callnumber', 'Call number {callnumber}']
const baseItem = { title: '{title}', author, callnumber, barcode: 'Barcode {barcode}' }
const account = (label: string): Notice['button'] => ({ if: 'opac', label, href: '{opac}/cgi-bin/koha/opac-user.pl' })
const LOANS = account('See or renew my loans')
const questions: Line = { if: 'contact', text: 'Questions? Contact us.{?phone} Phone: {phone}.{/}{?email} Email: {email}.{/}' }
const collect = (heading: string): Notice['details'] => ({
  heading,
  lines: [
    { text: '{library}' },
    ...['address1', 'address2', 'address3'].map((k) => ({ if: k, text: `{${k}}` })),
    { if: 'city', text: '{city}{?zip} {zip}{/}' },
    { if: 'phone', text: 'Phone {phone}' },
  ],
})

const digest: Readonly<Record<string, Loop>> = { items: { digest: true } }
const each = (tt: string, pre?: string): Readonly<Record<string, Loop>> => ({ items: { each: tt, ...(pre ? { pre } : {}) } })
const ALL = ['html', 'text', 'sms', 'print'] as const
const NO_PRINT = ['html', 'text', 'sms'] as const
const empty = { alerts: [], details: null, notes: [], greeting: GREETING, loops: {} } satisfies Partial<Notice>

// ── overdues ──
const SUM = 'fines_total = 0; FOREACH overdue IN overdues; fines_total = fines_total + overdue.overdue_fines.total_outstanding; END'
const overdueFields: Fields = {
  ...common, ...reader,
  ...book('overdue.item.biblio', 'overdue.item', 'items'),
  ...inLoop('items', {
    due: 'overdue.date_due | $KohaDates',
    hasFine: 'overdue.overdue_fines.total_outstanding > 0',
    fine: { tt: 'overdue.overdue_fines.total_outstanding | $Price with_symbol => 1', use: ['Price'] },
    firstTwo: 'loop.count <= 2', third: 'loop.count == 3', rest: 'loop.size - 2',
  }),
  hasFines: { tt: 'fines_total > 0', pre: SUM },
  fines: { tt: 'fines_total | $Price with_symbol => 1', use: ['Price'], pre: SUM, label: 'Total of the fines' },
  restricted: { tt: 'borrower.is_debarred' },
}
const overdue = (n: { code: string; name: string; subject: string; kicker: string; title: string; intro: string; note: string; sms: string; end: string }): Notice => ({
  ...empty,
  code: n.code, name: n.name, module: 'circulation', formats: ALL,
  subject: n.subject, kicker: n.kicker, title: n.title, intro: n.intro,
  fields: overdueFields, loops: each('overdue IN overdues'),
  items: { ...baseItem, loop: 'items', due: { label: 'Was due', date: '{due}', head: 'Was due' }, fine: ['hasFine', 'Fine so far {fine}'] },
  alerts: [
    { if: 'hasFines', text: 'Fines charged so far on these items: {b}{fines}{/b}' },
    { if: 'restricted', text: 'Your library account is restricted at the moment, so you may not be able to borrow or renew.' },
  ],
  notes: [{ text: n.note }, questions],
  button: LOANS,
  sms: n.sms,
  smsItems: { loop: 'items', line: '{?firstTwo}\n- {title40}, was due {due}{:}{?third}\n- and {rest} more{/}{/}', after: `{?hasFines}\nFines so far: {fines}{/}\n${n.end}` },
})

// ── automatic renewals ──
const E = 'checkout.auto_renew_error'
const OK = `!${E} || ${E} == 'auto_renew_final' || ${E} == 'auto_unseen_final'`
const REASONS: Array<[string, string]> = [
  ['too_many', 'It has been renewed as many times as the library allows.'],
  ['on_reserve', 'Another reader has reserved it.'],
  ['restriction', 'Your account is restricted at the moment.'],
  ['overdue', 'You have overdue items.'],
  ['too_unseen', 'It must be brought to the library to be renewed again.'],
  ['auto_account_expired', 'Your library membership has expired.'],
  ['auto_too_late', 'It has reached the longest time it can be on loan.'],
  ['auto_too_much_owing', 'You owe more in charges than the library allows.'],
  ['item_denied_renewal', 'This item cannot be renewed.'],
]
const WHY = REASONS.reduceRight((rest, [id, words]) => `{?why_${id}}${words}{:}${rest}{/}`, 'Please ask the library for the reason.')
const LAST = 'This was the last automatic renewal: please return it by that date.'
const UNSEEN = 'It cannot be renewed automatically again: bring it to the library to renew it.'
const renewFields: Record<string, string> = {
  renewed: OK, final: `${E} == 'auto_renew_final'`, unseen: `${E} == 'auto_unseen_final'`,
  late: 'checkout.is_overdue', due: 'checkout.date_due | $KohaDates as_due_date => 1',
  ...Object.fromEntries(REASONS.map(([id]) => [`why_${id}`, `${E} == '${id}'`])),
}
const outside = (f: Record<string, string>): Fields => Object.fromEntries(Object.entries(f).map(([k, tt]) => [k, { tt }]))
const RENEWED_LIST = `renewal_shown = []; renewal_failed = []; FOREACH checkout IN checkouts; NEXT IF ${E} == 'auto_too_soon'; renewal_shown.push(checkout); UNLESS ${OK}; renewal_failed.push(checkout); END; END`
const RESULT = `{?success}Renewed: {success}.{/}{?both} {/}{?error}Not renewed: {error}.{/}`

// ── memberships ──
const member: Fields = {
  ...common, ...reader,
  card: { tt: 'borrower.cardnumber', label: 'Card number' },
  ends: { tt: 'borrower.dateexpiry | $KohaDates', label: 'Membership end date' }, hasEnds: { tt: 'borrower.dateexpiry' },
  user: { tt: 'borrower.userid', label: 'User name' }, hasUser: { tt: 'borrower.userid && borrower.userid != borrower.cardnumber' },
}
const oneDue: ItemSpec = { ...baseItem, due: { label: 'Due', date: '{due}', head: 'Due' } }
const manyDue: ItemSpec = { ...oneDue, loop: 'items' }
const oneLoan: Fields = { ...common, ...book('biblio', 'item'), due: { tt: 'checkout.date_due | $KohaDates', label: 'Due date' } }
const loans: Fields = {
  ...common, ...book('checkout', 'checkout', 'items'),
  ...inLoop('items', { due: 'checkout.date_due | $KohaDates', firstTwo: 'loop.count <= 2', third: 'loop.count == 3', rest: 'loop.size - 2' }),
  single: { tt: 'checkouts.size == 1' }, count: { tt: 'checkouts.size', label: 'How many items' }, firstDue: { tt: 'checkouts.0.date_due | $KohaDates' },
}
const dueDigest = (code: string, name: string, kicker: string, when: string, whenSms: string, one: string, many: string): Notice => ({
  ...empty, code, name, module: 'circulation', formats: NO_PRINT,
  subject: `{?single}1 library item is{:}{count} library items are{/} ${when}`,
  kicker, title: `{?single}1 item is{:}{count} items are{/} ${when}`,
  intro: `{?single}${one}{:}${many}{/}`,
  fields: loans, loops: each('checkout IN checkouts'), items: manyDue, button: LOANS,
  sms: `{?single}1 item is{:}{count} items are{/} ${whenSms} {firstDue}`,
  smsItems: { loop: 'items', line: '{?firstTwo}\n- {title40}{:}{?third}\n- and {rest} more{/}{/}', after: '\nPlease return or renew.' },
})

export const NOTICES: readonly Notice[] = [
  {
    ...empty, code: 'CHECKOUT', name: 'Checkout receipt', module: 'circulation', formats: NO_PRINT,
    subject: 'Items you borrowed from {library}', kicker: 'Checkout receipt', title: 'What you borrowed',
    intro: 'You borrowed these items. Please return or renew them by the date shown.',
    fields: { ...common, ...book('item.biblio', 'item', 'items'), ...inLoop('items', { due: 'checkout.date_due | $KohaDates' }) },
    loops: digest, items: manyDue, button: LOANS,
    sms: 'you borrowed', smsItems: { loop: 'items', line: '- {title40}, due {due}' },
  },
  {
    ...empty, code: 'CHECKIN', name: 'Check-in receipt', module: 'circulation', formats: NO_PRINT,
    subject: 'Items you returned to {library}', kicker: 'Check-in receipt', title: 'What you returned',
    intro: 'We received these items back. Thank you for returning them.',
    fields: { ...common, ...book('item.biblio', 'item', 'items'), ...inLoop('items', { due: 'old_checkout.returndate | $KohaDates' }) },
    loops: digest, items: { ...baseItem, loop: 'items', due: { label: 'Returned', date: '{due}', head: 'Returned' } }, button: LOANS,
    sms: 'returned, thank you', smsItems: { loop: 'items', line: '- {title40}' },
  },
  {
    ...empty, code: 'PREDUE', name: 'Due soon reminder', module: 'circulation', formats: NO_PRINT,
    subject: 'Due soon: {title}', kicker: 'Reminder', title: 'This item is due soon',
    intro: 'This item is due back soon. Please return or renew it by the date shown.',
    fields: oneLoan, items: oneDue, button: LOANS,
    sms: '"{title60}" is due {due}. Please return or renew it.',
  },
  {
    ...empty, code: 'DUE', name: 'Due today reminder', module: 'circulation', formats: NO_PRINT,
    subject: 'Due today: {title}', kicker: 'Reminder', title: 'This item is due today',
    intro: 'This item is due back today. Please return or renew it by the end of the day so that it does not become overdue.',
    fields: oneLoan, items: oneDue, button: LOANS,
    sms: '"{title60}" is due today, {due}. Please return or renew it.',
  },
  dueDigest('PREDUEDGST', 'Due soon reminder (digest)', 'Reminder', 'due soon', 'due on',
    'This item is due soon. Please return or renew it by the date shown.', 'These {count} items are due soon. Please return or renew them by the date shown.'),
  dueDigest('DUEDGST', 'Due today reminder (digest)', 'Reminder', 'due back today', 'due today,',
    'This item is due back today. Please return or renew it by the end of the day so that it does not become overdue.',
    'These {count} items are due back today. Please return or renew them by the end of the day so that they do not become overdue.'),
  overdue({
    code: 'ODUE', name: 'First overdue notice', subject: 'Overdue library items', kicker: 'First overdue notice', title: 'Please return what is overdue',
    intro: 'Our records show that the items below are past their due date. Please return them or renew them if you can.',
    note: 'If you have returned them already, thank you, and please ignore this notice.', sms: 'overdue items', end: 'Please return or renew them now.',
  }),
  overdue({
    code: 'ODUE2', name: 'Second overdue notice', subject: 'Second notice: overdue library items', kicker: 'Second notice', title: 'Still overdue',
    intro: 'We wrote to you before about the items below and they have still not come back. Please return or renew them now, so that other readers can borrow them.',
    note: 'Please act on this notice as soon as you receive it.', sms: 'second notice, items still overdue', end: 'Please return or renew them now.',
  }),
  overdue({
    code: 'ODUE3', name: 'Final overdue notice', subject: 'Final notice: overdue library items', kicker: 'Final notice', title: 'Long overdue',
    intro: 'This is the final notice about the items below. They are long overdue and our earlier reminders have not been answered. Return them to the library without delay.',
    note: 'If you cannot return an item, contact the library straight away. The library may have to treat it as lost and ask you to pay for it.',
    sms: 'FINAL NOTICE, items long overdue', end: 'Please return them now.',
  }),
  {
    ...empty, code: 'HOLD', name: 'Hold ready', module: 'reserves', formats: ALL,
    subject: 'Ready to collect at {library}', kicker: 'Hold ready', title: 'Your item is ready to collect',
    intro: 'The item you reserved is ready for you to collect.',
    fields: { ...common, ...reader, ...place, ...book('biblio', 'item'), due: { tt: 'hold.expirationdate | $KohaDates', label: 'Collect by' }, hasDue: { tt: 'hold.expirationdate' } },
    items: { title: '{title}', author, callnumber, due: { if: 'hasDue', label: 'Collect by', date: '{due}', head: 'Collect by' } },
    details: collect('Collect it from'),
    notes: [{ text: 'If you no longer need it, please cancel it or tell us, so that the next reader can have it.' }],
    button: account('See or cancel my holds'),
    sms: 'your reserved item is ready to collect: {title40}.{?hasDue} Please collect it by {due}.{/}',
  },
  {
    ...empty, code: 'HOLDDGST', name: 'Holds ready (digest)', module: 'reserves', formats: NO_PRINT,
    subject: 'Reserved for you and ready to collect', kicker: 'Hold ready', title: 'Ready to collect', intro: 'Reserved for you and ready to collect:',
    fields: {
      ...common, ...book('hold.biblio', 'hold.item', 'items'),
      ...inLoop('items', { due: 'hold.expirationdate | $KohaDates', hasDue: 'hold.expirationdate', at: 'hold.branch.branchname', at1: 'hold.branch.branchaddress1', atCity: 'hold.branch.branchcity' }),
    },
    loops: digest,
    items: { loop: 'items', title: '{title}', author, callnumber, due: { if: 'hasDue', label: 'Collect by', date: '{due}', head: 'Collect by' }, more: ['At {at}{?at1}, {at1}{/}{?atCity}, {atCity}{/}'] },
    notes: [{ text: 'Please cancel what you no longer need so that the next reader can have it.' }],
    button: account('See or cancel my holds'),
    sms: 'ready to collect', smsItems: { loop: 'items', line: '- {title40}{?hasDue}, by {due}{/}' },
  },
  {
    ...empty, code: 'HOLD_REMINDER', name: 'Hold reminder', module: 'reserves', formats: ALL,
    subject: 'Still waiting for you at {library}', kicker: 'Hold reminder', title: 'Still waiting for you',
    intro: '{?single}An item you reserved is{:}{count} items you reserved are{/} still waiting for you at {library}.',
    fields: {
      ...common, ...reader, ...place, ...book('hold.biblio', 'hold.item', 'items'),
      ...inLoop('items', { due: 'hold.expirationdate | $KohaDates', hasDue: 'hold.expirationdate', since: 'hold.waitingdate | $KohaDates', firstTwo: 'loop.index < 2' }),
      single: { tt: 'holds.count == 1' }, count: { tt: 'holds.count', label: 'How many items' }, overTwo: { tt: 'holds.count > 2' }, rest: { tt: 'holds.count - 2' },
    },
    loops: each('hold IN holds'),
    items: { loop: 'items', title: '{title}', author, due: { if: 'hasDue', label: 'Collect by', date: '{due}', head: 'Collect by' }, more: ['Waiting since {since}'] },
    details: collect('Collect from'),
    notes: [{ text: 'If you no longer need an item, please cancel it or tell us, so that the next reader can have it.' }],
    button: account('See or cancel my holds'),
    sms: 'still waiting for you', smsItems: { loop: 'items', line: '{?firstTwo}\n- {title40}{?hasDue}, collect by {due}{/}{/}', after: '{?overTwo}\nand {rest} more{/}' },
  },
  {
    ...empty, code: 'AUTO_RENEWALS', name: 'Automatic renewal result', module: 'circulation', formats: NO_PRINT,
    subject: '{?refused}Not renewed{:}Renewed{/}: {title}', kicker: 'Automatic renewal', title: '{?renewed}We renewed this item{:}We could not renew this item{/}',
    intro: '{?renewed}We renewed this item for you. Please return it by the new date.{:}We could not renew this item for you. {?late}Please return it as soon as you can.{:}Please return it by the date shown.{/}{/}',
    fields: { ...common, ...book('biblio', 'item'), ...outside(renewFields), notRenewed: { tt: `!(${OK})` },
      // the same, short: the subject must fit (compile.ts SUBJECT_MAX)
      refused: { tt: `${E} && !${E}.match('final$')` }, lastOne: { tt: `${E} == 'auto_renew_final' || ${E} == 'auto_unseen_final'` } },
    items: { ...baseItem, due: { label: '{?renewed}Now due{:}{?late}Was due{:}Return by{/}{/}', date: '{due}', head: 'Date' } },
    alerts: [{ if: 'notRenewed', text: `{b}Why:{/b} ${WHY}` }, { if: 'lastOne', text: `{?final}${LAST}{:}${UNSEEN}{/}` }],
    button: account('See my loans'),
    sms: `{?renewed}we renewed {title40}. It is now due on {due}.{?final} ${LAST}{/}{?unseen} ${UNSEEN}{/}{:}we could not renew {title40}. ${WHY} {?late}It was due on {due}. Please return it as soon as you can.{:}Please return it by {due}.{/}{/}`,
  },
  {
    ...empty, code: 'AUTO_RENEWALS_DGST', name: 'Automatic renewal results (digest)', module: 'circulation', formats: NO_PRINT,
    subject: 'Automatic renewals: {?success}{success} renewed{/}{?both}, {/}{?error}{error} not renewed{/}',
    kicker: 'Automatic renewal', title: 'Your automatic renewals', intro: `We checked your loans for automatic renewal. ${RESULT}`,
    fields: {
      ...common, ...book('checkout.item.biblio', 'checkout.item', 'items'), ...inLoop('items', renewFields),
      success: { tt: 'success', label: 'How many were renewed' }, error: { tt: 'error', label: 'How many were not renewed' }, both: { tt: 'success && error' },
      hasMore: { tt: 'error > 2' }, more: { tt: 'error - 2' },
      ...inLoop('failed', { f_title: `checkout.item.biblio.title | ${T} | truncate(40)`, f_due: renewFields.due ?? '', f_firstTwo: 'loop.count <= 2' }),
    },
    loops: { items: { each: 'checkout IN renewal_shown', pre: RENEWED_LIST }, failed: { each: 'checkout IN renewal_failed', pre: RENEWED_LIST } },
    items: {
      ...baseItem, loop: 'items', due: { label: '{?renewed}Now due{:}{?late}Was due{:}Return by{/}{/}', date: '{due}', head: 'Date' },
      more: [`{?renewed}Renewed.{?final} ${LAST}{/}{?unseen} ${UNSEEN}{/}{:}Not renewed. ${WHY} {?late}Please return it as soon as you can.{/}{/}`],
    },
    button: account('See my loans'),
    sms: `automatic renewals. ${RESULT}`,
    smsItems: { loop: 'failed', line: '{?f_firstTwo}\n- {f_title} not renewed, due {f_due}{/}', after: '{?hasMore}\n- and {more} more not renewed{/}\nSee your account for details.' },
  },
  {
    ...empty, code: 'WELCOME', name: 'Welcome', module: 'members', formats: ['html', 'text', 'print'],
    subject: 'Welcome to {library}', kicker: 'New member', title: 'Welcome to {library}', intro: 'Your library membership is ready to use.',
    fields: member, items: null,
    details: { heading: 'Your membership', lines: [{ text: 'Card number {card}' }, { if: 'hasUser', text: 'User name {user}' }, { if: 'hasEnds', text: 'Member until {ends}' }] },
    notes: [questions], button: { if: 'opac', label: 'Search the catalogue', href: '{opac}' }, sms: '',
  },
  {
    ...empty, code: 'MEMBERSHIP_EXPIRY', name: 'Membership ends soon', module: 'members', formats: ALL,
    subject: 'Your membership of {library} ends soon', kicker: 'Membership', title: 'Your membership ends soon',
    intro: 'Your library membership ends on {b}{ends}{/b}. To keep borrowing after that date, please renew it.',
    fields: member, items: null, details: { heading: 'Your membership', lines: [{ text: 'Card number {card}' }, { text: 'Ends on {ends}' }] }, notes: [questions], button: null,
    sms: 'your membership ends on {ends}. Please renew it to keep borrowing.',
  },
  {
    ...empty, code: 'PASSWORD_RESET', name: 'Password reset', module: 'members', formats: ['html', 'text'],
    subject: 'Set a new password for your library account', kicker: 'Your account', title: 'Set a new password', greeting: 'Hello,',
    intro: 'We received a request to set a new password for the library account {b}{user}{/b}.',
    // Koha gives this letter no library: the name is the LibraryName preference, or the name typed in the design
    fields: {
      library: { tt: "Koha.Preference('LibraryName') || 'Your library'", use: ['Koha'], label: 'Library name' },
      initial: { tt: 'knt_library.substr(0, 1)', use: ['Koha'], pre: "knt_library = Koha.Preference('LibraryName') || 'Your library'" },
      user: { tt: 'user', label: 'User name' }, link: { tt: 'passwordreseturl' },
    },
    items: null,
    notes: [{ text: 'If the button does not work, copy this address into your browser:\n{link}' }, { text: 'The link works for 2 days. If you did not ask for this, ignore this message: your password stays as it is.' }],
    button: { label: 'Set a new password', href: '{link}' }, noteAfterButton: true, sms: '',
  },
  {
    ...empty, code: 'ISSUESLIP', name: 'Checkout slip', module: 'circulation', formats: ['print'],
    subject: 'Checkout slip', kicker: '', title: '', greeting: '', intro: '',
    fields: {
      ...common, surname: { tt: 'borrower.surname' }, card: { tt: 'borrower.cardnumber' }, now: { tt: 'today | $KohaDates with_hours => 1' },
      hasLoans: { tt: 'checkouts.count' }, loans: { tt: 'checkouts.count' }, hasLate: { tt: 'overdues.count' }, late: { tt: 'overdues.count' },
      ...inLoop('out', { title: `checkout.item.biblio.title | ${T}`, barcode: 'checkout.item.barcode', due: 'checkout.date_due | $KohaDates' }),
      ...inLoop('over', { o_title: `overdue.item.biblio.title | ${T}`, o_barcode: 'overdue.item.barcode', o_due: 'overdue.date_due | $KohaDates' }),
    },
    loops: { out: { each: 'checkout IN checkouts' }, over: { each: 'overdue IN overdues' } },
    items: null, button: null, sms: '',
    slip: {
      title: 'Checkout slip',
      top: [{ if: 'phone', text: '{phone}' }, { text: '{firstname} {surname}\nCard {card}\n{now}' }],
      heads: [
        { if: 'hasLoans', heading: 'Checked out ({loans})', loop: 'out', line: '{title}\n{barcode} · due {b}{due}{/b}' },
        { if: 'hasLate', heading: 'Overdue ({late})', loop: 'over', line: '{o_title}\n{o_barcode} · was due {b}{o_due}{/b}' },
      ],
      end: 'Thank you for visiting.',
    },
  },
]
