// The builder. It imports nothing but React, its editors and its own files, so kohasolutions.com can import this
// component as it is; its styles come with it (builder/styles.ts).
import { useEffect, useReducer, useRef, useState } from 'react'
import { canKeep, forget, loadStored, read, store, toFile } from './builder/file.ts'
import type { History } from './builder/history.ts'
import { start, step } from './builder/history.ts'
import { BrandKit, Designs, Look, Wording } from './builder/panels.tsx'
import { Preview } from './builder/Preview.tsx'
import { ReadyTemplates } from './builder/ReadyTemplates.tsx'
import { copyText } from './builder/copy.tsx'
import { fromHash, holdsDesign, shareLink } from './builder/share.ts'
import { initial, KOHA, reduce } from './builder/state.ts'
import { CSS } from './builder/styles.ts'
import { DESIGN_NAME, makeZip, ZIP_NAME } from './builder/zip.ts'
import templates from './vendor/index.json'

function first(): History {
  const s = initial()
  const saved = loadStored()
  return start(saved ? reduce(s, { type: 'load', ...saved }) : s)
}
/** A design in the page's address, offered before it is opened. 'bad': the link was cut or is not ours. */
type Offer = { design: History['now']['design']; readyId: string } | 'bad'
const offered = (): Offer | null => {
  const hash = typeof window === 'undefined' ? '' : window.location.hash
  return holdsDesign(hash) ? fromHash(hash) ?? 'bad' : null
}
function save(data: BlobPart, type: string, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([data], { type }))
  a.download = name
  a.click()
  setTimeout(() => { URL.revokeObjectURL(a.href) }, 1000)
}
/** Ctrl+Z belongs to a field while a person types in one. */
const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))

export function Builder() {
  const [h, dispatch] = useReducer(step, undefined, first)
  const state = h.now
  const [keeps] = useState(canKeep)
  const [message, setMessage] = useState('')
  const [offer, setOffer] = useState(offered)
  const [screen, setScreen] = useState<'ready' | 'edit'>('ready')
  const go = (to: 'ready' | 'edit') => {
    // the ready templates are the same for every notice
    dispatch({ type: 'scope', scope: 'all' })
    setScreen(to)
  }
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

  useEffect(() => {
    // the design leaves the address at once: a reload or a copied address must not bring it back
    const clear = () => { if (holdsDesign(window.location.hash)) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search) }
    const changed = () => {
      const o = offered()
      if (o) setOffer(o)
      clear()
    }
    clear()
    window.addEventListener('hashchange', changed)
    return () => { window.removeEventListener('hashchange', changed) }
  }, [])

  const exportFile = () => {
    save(JSON.stringify(toFile(state.design, state.readyId), null, 1), 'application/json', DESIGN_NAME)
    setMessage(`Design saved as ${DESIGN_NAME}.`)
  }
  const exportZip = () => {
    save(makeZip(state.design, state.readyId), 'application/zip', ZIP_NAME)
    setMessage(`All notices saved as ${ZIP_NAME}. START-HERE.txt inside says where each one goes.`)
  }
  const share = async () => {
    const link = shareLink(state.design, state.readyId, window.location)
    if (!link) setMessage('This design is too long for a link. Save a design file and send that.')
    else setMessage(await copyText(link) ? 'Link copied. It holds the design and your library details; whoever has it can open them.' : 'The link could not be copied. Save a design file and send that.')
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
        <div className="kntb-seg kntb-screens" role="group" aria-label="Screen">
          <button type="button" aria-pressed={screen === 'ready'} onClick={() => { go('ready') }}>Ready templates</button>
          <button type="button" aria-pressed={screen === 'edit'} onClick={() => { go('edit') }}>Full editor</button>
        </div>
        <div className="kntb-bar" role="toolbar" aria-label="Design">
          <button type="button" disabled={!h.past.length} onClick={() => { dispatch({ type: 'undo' }) }} title="Ctrl+Z">Undo</button>
          <button type="button" disabled={!h.future.length} onClick={() => { dispatch({ type: 'redo' }) }} title="Ctrl+Shift+Z">Redo</button>
          <button type="button" className="kntb-primary" onClick={exportZip}>Download all notices</button>
          <button type="button" onClick={exportFile}>Save design file</button>
          <button type="button" onClick={() => file.current?.click()}>Open design file</button>
          <button type="button" onClick={() => { void share() }}>Copy share link</button>
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
      {offer ? (
        <section className="kntb-offer" aria-label="Design from a link">
          {offer === 'bad' ? <p>The link you opened holds no design that can be read. It may have been cut: ask for it again, or for the design file.</p> : (
            <p>The link you opened holds a design. Opening it replaces the one here (Undo brings yours back) and loads any pictures it names. Check its words and links before you use it in Koha.</p>
          )}
          <div className="kntb-row kntb-wrap">
            {offer === 'bad' ? null : <button type="button" className="kntb-primary" onClick={() => { dispatch({ type: 'load', ...offer }); setOffer(null); setMessage('Opened the design from the link. Undo takes you back.') }}>Open it</button>}
            <button type="button" onClick={() => { setOffer(null) }}>{offer === 'bad' ? 'Close' : 'Keep mine'}</button>
          </div>
        </section>
      ) : null}
      <nav className="kntb-jump" aria-label="Go to">
        <a href="#kntb-settings">Settings</a>
        <a href="#kntb-preview">Preview</a>
      </nav>
      {screen === 'ready' ? <ReadyTemplates state={state} dispatch={dispatch} onEdit={() => { go('edit'); window.scrollTo({ top: 0 }) }} /> : <div className="kntb-main">
        <section id="kntb-settings" className="kntb-controls" aria-label="Settings">
          <div className="kntb-brand"><BrandKit state={state} dispatch={dispatch} /></div>
          <Designs state={state} dispatch={dispatch} />
          <Wording state={state} dispatch={dispatch} />
          <Look state={state} dispatch={dispatch} />
        </section>
        <Preview state={state} dispatch={dispatch} />
      </div>}
      <footer className="kntb-foot">
        Every notice is tested through Koha {KOHA}: what Koha prints is what you see here. Notices at{' '}
        <code>{templates.commit.slice(0, 7)}</code>, before version 1.0.0. GPL-3.0-or-later.
      </footer>
    </div>
  )
}
