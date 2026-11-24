// What a person types may contain anything. These make it plain text in both outputs.
// The rules and why: COMPILER.md. The proof that Koha prints it back unchanged: scripts/prove.mjs.

/** One line, no control characters, no spaces at the ends. */
export const clean = (v: unknown): string => (typeof v === 'string' ? v : '').replace(/[\p{Cc}\u2028\u2029\s]+/gu, ' ').trim()

const ENTITY: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '[': '&#91;' }

/** Text in HTML, safe inside a Koha notice as well: "<<" (Koha's old fields) cannot survive as &lt;&lt;, "[%"
 * (Template Toolkit) starts with an encoded bracket, and "----" (Koha's digest separator) is encoded too. */
export const html = (v: string): string =>
  v.replace(/[&<>"'[]/g, (c) => ENTITY[c] ?? c).replace(/-{2,}/g, (run) => '&#45;'.repeat(run.length))

/** Text in a text email, an SMS or a subject, where nothing can be encoded: "<<" and "----" would be read by Koha after
 * Template Toolkit has run, so they become characters that only look like them. */
export const plain = (v: string): string =>
  v.replace(/<{2,}/g, (r) => '‹'.repeat(r.length)).replace(/-{4,}/g, (r) => '–'.repeat(r.length))

/** plain(), inside a Template Toolkit text: only "[%" opens a tag, so it is printed by one. */
export const plainTT = (v: string): string => plain(v).replace(/\[%/g, "[% '[%' %]")

/** Only a web or mail address may become a link or an image; anything else becomes nothing. */
export function url(v: unknown, schemes: readonly string[] = ['https:', 'mailto:']): string | null {
  const s = typeof v === 'string' ? v.trim() : ''
  if (/\s/.test(s)) return null
  try {
    return schemes.includes(new URL(s).protocol) ? s : null
  } catch {
    return null
  }
}

/** A colour the design may use; anything else becomes the fallback. */
export const colour = (v: unknown, fallback: string): string => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : fallback)

/** A whole number within limits. */
export const px = (v: unknown, min: number, max: number, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback
