// The builder. It imports nothing but React and its own files, so kohasolutions.com can import this component as it
// is; its styles come with it (builder/styles.ts).
import { useReducer } from 'react'
import { BrandKit, Designs, Look } from './builder/panels.tsx'
import { Preview } from './builder/Preview.tsx'
import { initial, KOHA, reduce } from './builder/state.ts'
import { CSS } from './builder/styles.ts'
import templates from './vendor/templates.json'

export function Builder() {
  const [state, dispatch] = useReducer(reduce, undefined, initial)
  return (
    <div className="kntb">
      <style>{CSS}</style>
      <header className="kntb-top">
        <h1>Live notice template builder for Koha</h1>
        <p>Make every Koha notice look like your library, see it as patrons will, and paste it into Koha.</p>
      </header>
      <nav className="kntb-jump" aria-label="Go to">
        <a href="#kntb-settings">Settings</a>
        <a href="#kntb-preview">Preview</a>
      </nav>
      <div className="kntb-main">
        <aside id="kntb-settings" className="kntb-controls" aria-label="Settings">
          <div className="kntb-brand"><BrandKit state={state} dispatch={dispatch} /></div>
          <Designs state={state} dispatch={dispatch} />
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
