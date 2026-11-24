// Every notice in one zip, with how to put them into Koha. Made in the browser; nothing is sent anywhere.
import { strToU8, zipSync } from 'fflate'
import type { Design } from '../compiler/design.ts'
import { NOTICES } from '../notices/data.ts'
import templates from '../vendor/templates.json'
import { toFile } from './file.ts'
import { FILE, forKoha, menuOf, TO_CREATE } from './for-koha.ts'
import { FORMAT_NAME } from './labels.ts'
import { KOHA } from './state.ts'

export const ZIP_NAME = 'koha-notices.zip'
export const DESIGN_NAME = 'koha-notice-design.json'

export function instructions(): string {
  const lines = [
    'YOUR KOHA NOTICES',
    '',
    `Each notice was tested through Koha ${KOHA}. Another release may differ: try one notice first.`,
    '',
    'BEFORE YOU START',
    '  Keep what you have now: open each notice in Koha and save its text in a file, so you can go back.',
    '',
    'FOR EACH NOTICE',
    '  1. In the staff interface: Tools > Notices and slips. Choose the notice by its code (the list is below) and edit it.',
    '     A library with its own version of a notice has it under that library, not under "All libraries".',
    '  2. Open the part for the kind of message: Email, SMS or Print.',
    '  3. Message subject: paste the line in subject.txt. Koha needs it for SMS and Print too: without it, Koha',
    '     does not keep the message.',
    '  4. Message body: replace all of it with the whole file.',
    '       email.html.tt   Email, tick "HTML message"',
    '       email.txt.tt    Email as plain text, "HTML message" not ticked (use this OR email.html.tt, not both)',
    '       sms.txt.tt      SMS, "HTML message" not ticked',
    '       print.html.tt   Print, tick "HTML message"',
    '  5. Save, and send yourself one to see it.',
    '',
    '  Open the files in a plain text editor (Notepad, TextEdit, gedit), not a word processor. Lines that are only',
    '  ---- belong to the notice: keep them.',
    '',
    'THE NOTICES',
    ...NOTICES.map((n) => `  ${n.code.padEnd(20)}${`${menuOf(n)}: ${n.name}`.padEnd(58)}${n.formats.map((f) => FORMAT_NAME[f]).join(', ')}`),
    '',
    `  ${[...TO_CREATE].join(' and ')} do not come with Koha: make them with "New notice", in the same menu, with that code.`,
    '  Then choose them in Tools > Overdue notice/status triggers.',
    '  A patron who ticked "Digests only" gets the notice ending in DGST instead of its plain version.',
    '',
    'CHANGING THEM LATER',
    `  Open ${DESIGN_NAME} in the builder ("Open design file") and change what you like.`,
    '',
    `The notices are adapted from Koha's own, through koha-notice-templates (${templates.commit.slice(0, 7)}), GPL-3.0-or-later:`,
    templates.source,
    '',
  ]
  return lines.join('\r\n')
}

/** The files of the zip, by path. */
export function zipFiles(design: Design, readyId: string): Record<string, string> {
  const out: Record<string, string> = {
    'START-HERE.txt': instructions(),
    [DESIGN_NAME]: JSON.stringify(toFile(design, readyId), null, 1),
  }
  for (const n of NOTICES)
    for (const f of n.formats) {
      const k = forKoha(n, design, f)
      out[`${n.code}/${FILE[f]}`] = k.body
      out[`${n.code}/subject.txt`] = k.subject
    }
  return out
}
export function makeZip(design: Design, readyId: string): Uint8Array<ArrayBuffer> {
  const files = Object.entries(zipFiles(design, readyId)).map(([k, v]) => [`koha-notices/${k}`, strToU8(v)] as const)
  return zipSync(Object.fromEntries(files), { level: 6 })
}
