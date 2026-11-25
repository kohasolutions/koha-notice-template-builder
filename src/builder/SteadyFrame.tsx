import type { ComponentPropsWithoutRef } from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { morph } from './morph.ts'

type Props = Omit<ComponentPropsWithoutRef<'iframe'>, 'srcDoc' | 'onLoad' | 'sandbox' | 'title'> & {
  title: string
  html: string
  /** the shown document's height, after it loads and after every change */
  onHeight?: (height: number) => void
}

/** A notice in a sandbox (no script runs) that loads once; later changes are written into the loaded document. */
export function SteadyFrame({ html, onHeight, title, ...rest }: Props) {
  const ref = useRef<HTMLIFrameElement>(null)
  const [first] = useState(html)
  const [loads, setLoads] = useState(0)
  const shown = useRef(first)
  const report = useRef(onHeight)
  useEffect(() => { report.current = onHeight })
  const measure = () => {
    const h = ref.current?.contentDocument?.documentElement.scrollHeight
    if (h) report.current?.(h)
  }

  useLayoutEffect(() => {
    const doc = ref.current?.contentDocument
    if (!loads || !doc?.documentElement || shown.current === html) return
    shown.current = html
    morph(doc.documentElement, new DOMParser().parseFromString(html, 'text/html').documentElement)
    measure()
  }, [html, loads])

  return (
    <iframe
      {...rest} ref={ref} title={title} sandbox="allow-same-origin" srcDoc={first}
      onLoad={() => {
        // a frame moved in the page loads its first text again
        shown.current = first
        setLoads((n) => n + 1)
        // a picture that arrives later changes the height
        ref.current?.contentDocument?.addEventListener('load', measure, true)
        measure()
      }}
    />
  )
}
