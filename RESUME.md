# Resume here (2026-11-24)

Batch P2 (compiler: 18 notices, all formats, 8 designs as data) is written and PROVED: on Koha 26.05.02.002 all
2,155 of 2,155 equal (HTML 840/840, text 504/504, SMS 448/448, print 363/363), subjects included.

The 34 old differences were the sample, not the compiler:
- ISSUESLIP due date: loan rules set by an earlier notice stayed in Koha::Cache::Memory::Lite, which the rollback does
  not reach. koha-notice-templates tools/koha-render.pl now flushes it at the start of every notice (branch
  render-cache-flush there, not merged yet).
- AUTO_RENEWALS_DGST order: automatic_renewals.pl sorts by patron only (koha-src misc/cronjobs/automatic_renewals.pl
  :137-146) and C4::Letters keeps that order, so one patron's loans come in no fixed order. prove.mjs accepts any
  order of the rows for that notice only (UNORDERED); every other notice must match row for row.

Mutations through Koha (2026-11-24, scripts/mutate.sh): 9 mutations of escape.ts and
print.ts; 8 fail the Koha proof (m1 no "[" encoding, m2 no "--" encoding, m3/m4 plain keeps << and ----, m5 no "[%"
wrap, m6 "0" counted true — seen only by the AUTO_RENEWALS notices, m7/m8 digest line breaks). m9 (quote not encoded)
cannot be seen through Koha: the preview and Koha print the same unescaped quote; the unit test catches it. The old
unit-test survivor (no separator after a fact that is always there) now has its test.
Looks: 430/430 with the new button labels; pictures retaken (out/look).

Templates pinned at ba90afc (koha-notice-templates main, with the cache fix merged); 18 notices.

P3 (the builder's screen) is done: src/Builder.tsx + src/builder/. The look panels are made from SPEC (controls.tsx: one
control per kind of rule), so a new setting needs only its words in labels.ts; tests/builder.test.ts fails without
them. Brand kit (name, tagline, logo, contact, hours, small print, footer links, social links, example fill), the 8
ready designs (the library's details stay on a switch), header, page and text, items, boxes and button, footer and
social style; live preview of all 18 notices × every situation Koha printed × every format, phone/desktop/both,
forced-dark approximation, the subject, and the template for Koha with where to paste it. Narrow screens get a sticky
Settings / Preview switch. Offline check drives it (design click, a colour reaching the template, SMS, logo).

To do next:
1. P4: sections (drag, @dnd-kit/react), wording editor with Koha value chips (@tiptap/core), per-notice changes,
   undo/redo, saved in the browser, design file export/import, warnings (contrast, broken logo, SMS length).
2. P5: copy, zip, share link, accessibility pass, Playwright suite. P6: Gmail/Outlook, website page, v1.0.0.
Not done: Gmail and Outlook, striped rows (not possible in a digest), Koha addresses in the footer.
