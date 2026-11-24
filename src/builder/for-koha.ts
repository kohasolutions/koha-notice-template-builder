// What goes into Koha for one notice and one kind of message, and where. The copy buttons, the zip and its
// instructions all read it, so they cannot say different things.
import { compile, compileSubject } from '../compiler/compile.ts'
import type { Design } from '../compiler/design.ts'
import type { Format, Notice } from '../notices/model.ts'
import templates from '../vendor/index.json'

const MENU: Readonly<Record<string, string>> = Object.fromEntries(templates.notices.map((n) => [n.code, n.menu]))
/** The heading in Koha's notice form a message is pasted under. */
export const TRANSPORT: Readonly<Record<Format, string>> = { html: 'Email', text: 'Email', sms: 'SMS', print: 'Print' }
/** The same file names as koha-notice-templates. */
export const FILE: Readonly<Record<Format, string>> = { html: 'email.html.tt', text: 'email.txt.tt', sms: 'sms.txt.tt', print: 'print.html.tt' }
/** Not among the notices a new Koha comes with (installer/data/mysql/en/mandatory/sample_notices.yml, 26.05). */
export const TO_CREATE: ReadonlySet<string> = new Set(['ODUE2', 'ODUE3'])

/** Printed at the desk, but Koha reads them from Email (C4/Members.pm IssueSlip asks for no transport, and C4/Letters.pm then takes email). */
export const PRINTED_FROM_EMAIL: ReadonlySet<string> = new Set(['ISSUESLIP'])

export interface ForKoha {
  code: string
  menu: string
  transport: string
  /** "HTML message" in Koha's form */
  htmlMessage: boolean
  /** For every kind of message, SMS and print too: Koha's form asks for it, and letter.pl deletes a message that has none */
  subject: string
  body: string
}

export const menuOf = (n: Notice): string => MENU[n.code] ?? n.module
export function forKoha(n: Notice, design: Design, format: Format): ForKoha {
  return {
    code: n.code, menu: menuOf(n), transport: PRINTED_FROM_EMAIL.has(n.code) ? TRANSPORT.html : TRANSPORT[format], htmlMessage: format === 'html' || format === 'print',
    subject: compileSubject(n, design).koha, body: compile(n, design, format).koha,
  }
}
