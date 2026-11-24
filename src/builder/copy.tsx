// Copying, with a word on the button when it worked and what to do when the browser refuses.
import { useEffect, useState } from 'react'

/** The clipboard; where a browser keeps it from a page (an old one, an http page), the older way. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const t = document.createElement('textarea')
    t.value = text
    t.setAttribute('aria-hidden', 'true')
    t.style.position = 'fixed'
    t.style.opacity = '0'
    const before = document.activeElement
    document.body.append(t)
    t.select()
    try {
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- the only way left when the clipboard is refused
      return document.execCommand('copy')
    } catch {
      return false
    } finally {
      t.remove()
      if (before instanceof HTMLElement) before.focus()
    }
  }
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  // what was copied is kept, so "Copied" goes away when the text changes
  const [done, setDone] = useState<{ text: string; ok: boolean } | null>(null)
  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => { setDone(null) }, 4000)
    return () => { clearTimeout(t) }
  }, [done])
  const now = done?.text === text ? done : null
  return (
    <span className="kntb-copy">
      <button type="button" className="kntb-primary" onClick={() => { void copyText(text).then((ok) => { setDone({ text, ok }) }) }}>{label}</button>
      <span role="status" className="kntb-status">{now ? (now.ok ? 'Copied' : 'Not copied: select the text of the code below and press Ctrl+C.') : ''}</span>
    </span>
  )
}
