// The builder. It imports nothing but React, its editors and its own files, so kohasolutions.com can import this
// component as it is; its styles come with it (builder/styles.ts).
import { useEffect, useReducer, useRef, useState } from 'react'
import { canKeep, forget, loadStored, read, store, toFile } from './builder/file.ts'
import type { History } from './builder/history.ts'
import { start, step } from './builder/history.ts'
import { BrandKit, Designs, Look, Wording } from './builder/panels.tsx'
import { Preview } from './builder/Preview.tsx'
import { initial, KOHA, reduce } from './builder/state.ts'
import { CSS } from './builder/styles.ts'
import templates from './vendor/templates.json'

function first(): History {
  const s = initial()
  const saved = loadStored()
  return start(saved ? reduce(s, { type: 'load', ...saved }) : s)
}
/** Ctrl+Z belongs to a field while a person types in one. */
const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))

export function Builder() {
  const [h, dispatch] = useReducer(step, undefined, first)
  const state = h.now
  const [keeps] = useState(canKeep)
  const [message, setMessage] = useState('')
  const file = useRef<HTMLInputElement>(null)

  useEffect(() => { store(state.design, state.readyId) }, [state.design, state.readyId])
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || typing(e.target)) return
      const k = e.key.toLowerCase()
      if (k === 'z' || k === 'y') {
        e.preventDefault()
        dispatch({ type: k === 'y' || e.shiftKey ? 'redo' : 'undo' })
      }
    }
    window.addEventListener('keydown', key)
    return () => { window.removeEventListener('keydown', key) }
  }, [])

  const exportFile = () => {
    const blob = new Blob([JSON.stringify(toFile(state.design, state.readyId), null, 1)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'koha-notice-design.json'
    a.click()
    setTimeout(() => { URL.revokeObjectURL(a.href) }, 1000)
    setMessage('Design saved as koha-notice-design.json.')
  }
  const importFile = async (f: File) => {
    let got: ReturnType<typeof read>
    try { got = read(JSON.parse(await f.text())) } catch { got = null }
    if (!got) {
      setMessage(`${f.name} is not a design file from this builder.`)
      return
    }
    dispatch({ type: 'load', ...got })
    setMessage(`Opened ${f.name}. Undo takes you back.`)
  }

  return (
    <div className="kntb">
      <style>{CSS}</style>
      <header className="kntb-top">
        <h1>Live notice template builder for Koha</h1>
        <p>Make every Koha notice look like your library, see it as patrons will, and paste it into Koha.</p>
        <div className="kntb-bar" role="toolbar" aria-label="Design">
          <button type="button" disabled={!h.past.length} onClick={() => { dispatch({ type: 'undo' }) }} title="Ctrl+Z">Undo</button>
          <button type="button" disabled={!h.future.length} onClick={() => { dispatch({ type: 'redo' }) }} title="Ctrl+Shift+Z">Redo</button>
          <button type="button" onClick={exportFile}>Save design file</button>
          <button type="button" onClick={() => file.current?.click()}>Open design file</button>
          <input ref={file} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void importFile(f) }} />
          <button type="button" onClick={() => {
            if (!window.confirm('Start again? Your library details and changes are cleared from this browser. Save a design file first to keep them.')) return
            forget()
            dispatch({ type: 'load', design: initial().design, readyId: initial().readyId })
            setMessage('Started again. Undo brings your design back.')
          }}>Start again</button>
          <span className="kntb-status" role="status">{message || (keeps ? 'Kept in this browser.' : 'Not kept: this browser does not allow it. Save a design file instead.')}</span>
        </div>
      </header>
      <nav className="kntb-jump" aria-label="Go to">
        <a href="#kntb-settings">Settings</a>
        <a href="#kntb-preview">Preview</a>
      </nav>
      <div className="kntb-main">
        <aside id="kntb-settings" className="kntb-controls" aria-label="Settings">
          <div className="kntb-brand"><BrandKit state={state} dispatch={dispatch} /></div>
          <Designs state={state} dispatch={dispatch} />
          <Wording state={state} dispatch={dispatch} />
          <Look state={state} dispatch={dispatch} />
        </aside>
        <Preview state={state} dispatch={dispatch} />
      </div>
      <footer className="kntb-foot">
        Every notice is tested through Koha {KOHA}: what Koha prints is what you see here. Notices at{' '}
        <code>{templates.commit.slice(0, 7)}</code>, before version 1.0.0. GPL-3.0-or-later.
      </footer>
    </div>
  )
}
