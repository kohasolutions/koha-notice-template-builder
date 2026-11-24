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

To do, in this order:
1. Merge render-cache-flush in koha-notice-templates, then pin the templates again (`scripts/import-templates.mjs`).
2. Then P3: the builder's screen. One source of truth for the wording: COMPILER.md.
Not done: Gmail and Outlook, striped rows (not possible in a digest), Koha addresses in the footer.
