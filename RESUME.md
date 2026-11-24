# Resume here (2026-11-24)

Batch P2 (compiler: 18 notices, all formats, 8 designs as data) is written. Last full proof on Koha 26.05.02.002:
2,121 of 2,155 equal (HTML 840/840, SMS 448/448, text 503/504, print 330/363). Looks: 430/430 with the old button labels.

To do, in this order:
1. The 34 differences look like the sample, not the compiler, but this is not proved: the ISSUESLIP due date (11/29 or
   12/08) seems to depend on what ran before it in the same Koha process; AUTO_RENEWALS_DGST lists loans in an order that
   is not fixed. Capture the sample next to each batch, or make the sample data in koha-render.pl fixed. Then re-run
   `TEMPLATES_DIR=../koha-notice-templates node scripts/prove.mjs --random=12` (about 12 minutes; one Koha run at a time).
2. Mutation checks through Koha (only unit tests were mutated), and `node scripts/look.mjs --shots` again.
3. Pin the templates again (`scripts/import-templates.mjs`) once koha-notice-templates main is merged.
4. Then P3: the builder's screen. One source of truth for the wording: COMPILER.md.
Not done: Gmail and Outlook, striped rows (not possible in a digest), Koha addresses in the footer.
