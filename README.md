# koha-notice-template-builder

**Live notice template builder for Koha.** Design a Koha notice in the browser, see it at once, copy the code into
*Tools → Notices and slips*. One HTML file; nothing is sent anywhere.

[![CI](https://github.com/kohasolutions/koha-notice-template-builder/actions/workflows/ci.yml/badge.svg)](https://github.com/kohasolutions/koha-notice-template-builder/actions/workflows/ci.yml)
[![Licence: GPL-3.0-or-later](https://img.shields.io/badge/licence-GPL--3.0--or--later-blue)](LICENSE)
[![Tested on Koha 26.05](https://img.shields.io/badge/tested%20on-Koha%2026.05-2e7d32)](https://github.com/kohasolutions/koha-notice-template-builder/releases)

## Use it

- **Online:** [kohasolutions.com/koha-tools/notice-template-builder](https://kohasolutions.com/koha-tools/notice-template-builder).
- **Offline:** download `koha-notice-template-builder-v<version>.html` from the
  [latest release](https://github.com/kohasolutions/koha-notice-template-builder/releases/latest) and open it in a
  browser. It is one file and needs no internet; the only thing it ever loads is a logo address you type yourself.

Then:

1. **Ready templates:** pick a notice (overdue, hold ready, checkout receipt… 18 in all) and one of 8 designs, shown with
   your library's own name, colour and logo. Switch off the parts you do not want and copy.
2. **Full editor**, one click behind it: colours, header, footer, social links, sections you drag into order, the
   wording of every notice with Koha's values as chips, per-notice changes, undo, and a design file you can save and
   open again. It warns about hard-to-read colours, long SMS messages and subjects Koha would cut.
3. In Koha, open *Tools → Notices and slips*, find the code, and paste the subject and body into the tab the builder
   names (Email, SMS or Print). Keep a copy of the old text first.

Everything stays in your browser: nothing you type is sent anywhere. A share link keeps the design after the `#`, which
browsers never send to a server.

## How it is tested

The notices come from [koha-notice-templates](https://github.com/kohasolutions/koha-notice-templates) at a released
version (`templates.lock.json`). `bash scripts/test-live.sh` runs everything below and writes `test-run.txt`; the log of
the run behind each release is attached to it.

- `scripts/prove.mjs` pastes what the builder makes into a real Koha (inside a transaction that is rolled back), for
  every notice, format and situation, with the 8 ready designs and with random designs full of hard text, and requires
  Koha's message and subject to equal the preview character for character.
- `scripts/look.mjs` checks every compiled notice for contrast (light and forced dark), nothing cut off at 320, 390 and
  740 pixels, images with text, and markup mail programs remove.
- `e2e/` (Playwright) uses the built file as a librarian would, with the network refused, by keyboard and through axe.

Checked on Koha 26.05.02 only. The emails were opened in Gmail and looked right; they have not yet been checked in
Outlook. If something looks wrong in your mail program, please
[open an issue](https://github.com/kohasolutions/koha-notice-template-builder/issues).

## For developers

| Part | What it is |
|---|---|
| `src/compiler/` | `compile(notice, design)`: the Template Toolkit text for Koha and the preview, from one tree ([COMPILER.md](COMPILER.md)) |
| `src/Builder.tsx` | the React component: ready templates first (`src/builder/ReadyTemplates.tsx`), the full editor behind them |
| `scripts/prove.mjs` | lets a real Koha run the compiled text and requires its message to equal the preview |
| `scripts/look.mjs` | contrast, overflow and markup checks on every compiled notice, and pictures |
| `e2e/` | Playwright: the built file used as a librarian would, with the network refused, by keyboard, and through axe |

`npm ci`, then `npm run build` writes `dist/index.html`. `npm test`, `npm run lint`, `npm run typecheck`,
and after a build `npm run test:e2e`.

## Related

- [koha-notice-templates](https://github.com/kohasolutions/koha-notice-templates): the same notices as files, with an
  install script.
- [Koha notices and slips](https://kohasolutions.com/knowledge-base/koha-notices-and-slips): how Koha's notice editor
  works and why a value prints blank.

## Licence

GPL-3.0-or-later. The notices it carries are adapted from Koha's own, which are GPL.

<!-- about:start -->
## About Koha Solutions

**Koha Solutions** helps libraries run Koha well: Koha hosting, migration and support for libraries worldwide.
Our mission: empowering libraries with smart digital solutions.

We work with college, university, school and public libraries, entirely online. What we do:

- **Koha Cloud** ([myopac.com](https://myopac.com)): Koha's library workflows as a fully managed service. We set it
  up, host it, back it up and upgrade it, so the library can look after its readers instead of a server.
- **Koha Certificate** ([kohasolutions.com/koha-certificate](https://kohasolutions.com/koha-certificate)): Koha
  training on a running library system, with assignments scored from the work trainees actually do.
- **Custom websites** for libraries and institutions, built by the same team
  ([kohasolutions.com/custom-website](https://kohasolutions.com/custom-website)).
- **Services** for libraries that run their own Koha: installation, migration from other systems, support,
  customisation, RFID and multilingual catalogues ([kohasolutions.com/koha-services](https://kohasolutions.com/koha-services)).

The tools in this organisation are free and open source, built from the problems we solve for libraries every day.
Practical answers to everyday Koha questions are in our [knowledge base](https://kohasolutions.com/knowledge-base).

**Talk to us:** [kohasolutions.com/contact](https://kohasolutions.com/contact) ·
[LinkedIn](https://www.linkedin.com/company/kohasolutions) · [YouTube](https://www.youtube.com/@kohasolutions) ·
[GitHub](https://github.com/kohasolutions)
<!-- about:end -->

---
Not affiliated with or endorsed by the Koha Community. Koha is free software: https://koha-community.org/
