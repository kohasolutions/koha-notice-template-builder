# Changelog

## Unreleased

- The compiler: 18 notices in HTML, text, SMS and print, 8 ready designs as data, every setting checked; proved through a
  real Koha (`scripts/prove.mjs`), looks checked (`scripts/look.mjs`); the single-file build and its offline test.
- The builder: brand kit, ready designs, every setting, sections, wording with Koha values, undo, design file, warnings.
- Copy buttons, all notices as a zip with instructions, a share link that holds the design, accessibility checks, and one
  Playwright suite. SMS and print now show their subject: Koha drops a message without one.
- Ready templates, the first screen: choose a notice and one of 8 designs shown with your own details, switch parts off, copy.
  The switches hold for email, plain text and print, and stay when the design changes. A password reset always keeps its link.
