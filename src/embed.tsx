// The same builder for a web page: one script that a page loads, then KohaNoticeBuilder.mount(element).
import { createRoot } from 'react-dom/client'
import { Builder } from './Builder.tsx'

export interface MountOptions {
  /** The notice to open on, by its Koha code. A code that is not a notice is ignored. */
  notice?: string
}
const mount = (el: HTMLElement, options: MountOptions = {}): (() => void) => {
  const root = createRoot(el)
  root.render(<Builder embedded {...(options.notice ? { notice: options.notice } : {})} />)
  return () => { root.unmount() }
}
Object.assign(window, { KohaNoticeBuilder: { mount } })
