# Changelog

## 1.0.0 (2026-11-25)

First release. Notices from koha-notice-templates v1.0.0; checked on Koha 26.05.02; emails checked in Gmail, not yet
in Outlook. The offline builder (one HTML file) is attached to the release.

- `scripts/test-live.sh` writes the run log attached to each release; `scripts/release.sh` refuses a release without a
  passing log for this exact build, with a provisional templates pin, or before the website page is live.
- The accessibility test with every panel open has the time its six full-page scans need (it failed now and then
  when other tests ran beside it).
- Previews change in place while you type: each key press no longer reloads them, so they do not flash white.
- Radio buttons are no longer stretched across their card.

- The compiler: 18 notices in HTML, text, SMS and print, 8 ready designs as data, every setting checked; proved through a
  real Koha (`scripts/prove.mjs`), looks checked (`scripts/look.mjs`); the single-file build and its offline test.
- The builder: brand kit, ready designs, every setting, sections, wording with Koha values, undo, design file, warnings.
- Copy buttons, all notices as a zip with instructions, a share link that holds the design, accessibility checks, and one
  Playwright suite. SMS and print now show their subject: Koha drops a message without one.
- Ready templates, the first screen: choose a notice and one of 8 designs shown with your own details, switch parts off, copy.
  The switches hold for email, plain text and print, and stay when the design changes. A password reset always keeps its link.
- `ISSUESLIP` is pasted under Email, not Print: Koha reads the slip it prints from there.
