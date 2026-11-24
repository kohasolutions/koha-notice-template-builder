import { HARD, URLS } from './designs.mjs'
/** One of every kind of block a library can add. */
export const ADDED_FOR_PROOF = (pick, rnd) => [
  { add: 'text', words: [pick(HARD), { field: 'library' }] }, { add: 'notice', words: pick(HARD) }, { add: 'divider' }, { add: 'spacer', px: pick([8, 999, NaN]) },
  { add: 'image', src: pick(URLS), alt: pick(HARD) }, { add: 'button', label: pick(HARD), href: pick(URLS) }, { add: 'columns', left: pick(HARD), right: pick(HARD) }, { add: pick(['x', 'divider']) },
].filter(() => rnd(3) > 0)
