// What a person types may contain anything. These make it plain text in both outputs.
// The rules and why: COMPILER.md. The proof that Koha prints it back unchanged: scripts/prove.mjs.

/** One line, no control characters, no spaces at the ends. */
export const clean = (v: string): string => v.replace(/[\p{Cc}\u2028\u2029\s]+/gu, ' ').trim()

const ENTITY: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '[': '&#91;' }

/** Typed text in HTML, safe inside a Koha notice as well: "<<" (Koha's old fields) cannot survive as &lt;&lt;, "[%"
 * (Template Toolkit) starts with an encoded bracket, and "----" (Koha's digest separator) is encoded too. */
export const html = (v: string): string =>
  clean(v)
    .replace(/[&<>"'[]/g, (c) => ENTITY[c] ?? c)
    .replace(/-{2,}/g, (run) => '&#45;'.repeat(run.length))

/** Only a web or mail address may become a link or an image; anything else becomes nothing. */
export function url(v: string, schemes: readonly string[] = ['https:', 'mailto:']): string | null {
  const s = v.trim()
  if (/\s/.test(s)) return null
  try {
    return schemes.includes(new URL(s).protocol) ? s : null
  } catch {
    return null
  }
}

/** A colour the design may use; anything else becomes the fallback. */
export const colour = (v: string, fallback: string): string => (/^#[0-9a-f]{6}$/i.test(v) ? v : fallback)

/** A whole number within limits. */
export const px = (v: number, min: number, max: number): number =>
  Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : min
