# The compiler

`compile(notice, design)` builds one tree of nodes (`src/compiler/nodes.ts`) and prints it twice: `koha` is the
Template Toolkit text to paste, `sample(data)` is the preview. No DOM, network, clock or randomness.

- **raw** markup is written by the compiler only. **text** is typed by a person and escaped when printed.
  **field**, **if** and **repeat** become Template Toolkit in one output and sample data in the other.
- **Typed text** is HTML-encoded (`& < > " ' [`) and runs of hyphens are encoded. So `[%` is not a tag, `<<x>>` is not
  one of Koha's old fields (Koha replaces those even after Template Toolkit has run), and `----` is not a digest
  separator. All of it shows to the reader exactly as typed. It is never put inside a Template Toolkit tag.
- **Addresses** must be `https:` or `mailto:` (a logo `https:`), **colours** `#rrggbb`, fonts and layouts from a list,
  sizes within limits (`safe()`): nothing typed reaches a style attribute.
- **Sample data** is what Koha printed, captured by the proof. Koha prints values without HTML encoding, so does the
  preview.

## The proof

`TEMPLATES_DIR=../koha-notice-templates node scripts/prove.mjs` captures the sample data, compiles every notice with
many designs full of hard text, lets Koha make the real event happen with each (rolled back), and requires Koha's
message to equal the preview character for character. It needs a Koha, so CI runs the unit tests instead.

## Importing it

`src/Builder.tsx` depends only on React 19 and the compiler, so a Next.js 16 page can import it as a client component.
React was chosen for that reason; the compiler itself has no dependencies.
