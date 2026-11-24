# The compiler

`compile(notice, design, format)` builds one tree of nodes (`src/compiler/nodes.ts`) and prints it twice: `koha` is
the Template Toolkit text to paste, `sample(data)` is the preview. `compileSubject` does the same for the subject.
Formats: `html`, `text` (plain-text email), `sms`, `print`. No DOM, network, clock or randomness.

| Where | What | Whose |
|---|---|---|
| `src/notices/data.ts` | the 18 notices: wording, Koha values, lists. Data only | adapted from the GPL notices: GPL-3.0-or-later |
| `src/notices/model.ts` | the shape of a notice | ours |
| `src/designs.json` | the ready designs. Each is one value, with no code of its own | ours |
| `src/compiler/` | settings (`design.ts`), layouts (`letter.ts`, `words.ts`), printing, escaping | ours; contains no notice wording |

**One source of truth.** Until the templates repository generates its `.tt` files from here, `data.ts` and those files
are two copies. `prove.mjs` stops when a notice or a format exists in only one of them, but it does not compare words.
Planned: the templates repository generates its files from the default design, and its own tests run on the result.

- **raw** markup is written by the layouts only, from settings that passed `safe()` or `url()`. **text** is escaped when
  printed. **field**, **if** and **repeat** become Template Toolkit in one output and sample data in the other.
- **Every setting is in `SPEC`** (`design.ts`) with what it may be; `safe()` checks nothing that is not there, and a
  value that does not pass becomes the base design's. A setting for one notice is in `perNotice`.
- **Typed words in HTML** are encoded (`& < > " ' [`) and runs of hyphens too: `[%` is not a tag, `<<x>>` is not one of
  Koha's old fields, `----` is not a digest separator, and the reader sees what was typed.
- **Typed words in a text email, an SMS or a subject** cannot be encoded. `[%` is printed by a tag. `<<` becomes
  `‹‹` and four or more hyphens become en dashes, in the preview as well: Koha would read the originals.
- **A Koha value in typed words** is a chip (`{ field: 'firstname' }`). Only values the notice offers for that (they have
  a `label`, and are not one per item) are printed; others are left out.
- **Addresses** must be `https:` or `mailto:` (pictures `https:`).
- **Digests.** CHECKOUT, CHECKIN and HOLDDGST are one message per visit, which Koha cuts at two `----` lines. Titles do
  not count items there, a table's head stands outside the repeated part, and no item looks different because of its
  position (so no striped rows: the repeated part does not know its number).
- **Sample data** is what Koha printed in every situation the notices are tested in, captured by the proof.

## The proof

`TEMPLATES_DIR=../koha-notice-templates node scripts/prove.mjs` captures the sample data, compiles every notice in every
situation with the ready designs, random designs and designs full of hard text, lets Koha make the real event happen
with each (rolled back), and requires Koha's message and subject to equal the preview, character for character. Two
things are left out of the comparison: the minute on the slip and the one-time key in the password link. It needs a
Koha, so CI runs the unit tests instead. `node scripts/look.mjs --shots` checks contrast (light and forced dark),
overflow at 320, 390 and 740, small text, pictures and forbidden markup on the same output, and takes pictures.

## Importing it

`src/Builder.tsx` depends only on React 19 and the compiler, so a Next.js 16 page can import it as a client component.
React was chosen for that reason; the compiler itself has no dependencies.
