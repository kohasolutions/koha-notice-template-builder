// The first screen: choose a notice and a design, fill in the library, switch parts off, copy. The same state as the
// full editor, so nothing is lost between the two.
import type { Dispatch, KeyboardEvent } from 'react'
import { useDeferredValue, useMemo } from 'react'
import { compile } from '../compiler/compile.ts'
import { READY } from '../compiler/ready.ts'
import { NOTICES } from '../notices/data.ts'
import { menuOf } from './for-koha.ts'
import { BrandKit } from './panels.tsx'
import type { PartInfo } from './parts.ts'
import { isOn, partsOf, withDesign } from './parts.ts'
import { Preview } from './Preview.tsx'
import type { Action, State } from './state.ts'
import { hasOwn, notice, SAMPLES, situations } from './state.ts'
import { SteadyFrame } from './SteadyFrame.tsx'

type Props = { state: State; dispatch: Dispatch<Action> }
const WIDTH = 600
const SCALE = 0.36
const HEIGHT = 240

/** The notice on screen in every design, with the library's own details: small live pictures, never files. */
function Designs({ state, dispatch }: Props) {
  const n = notice(state.code)
  const design = useDeferredValue(state.design)
  const readyId = useDeferredValue(state.readyId)
  const format = n.formats.includes('html') ? 'html' : 'print'
  const sample = SAMPLES[n.code]?.[situations(n.code)[0] ?? 'only']?.[format === 'print' ? 'print' : 'email']
  const shown = useMemo(() => READY.map((r) => ({ r, html: sample ? compile(n, withDesign(design, readyId, r.id), format).sample(sample) : '' })), [n, design, readyId, format, sample])
  const arrows = (e: KeyboardEvent<HTMLDivElement>) => {
    const by = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    if (by === undefined) return
    e.preventDefault()
    const i = (READY.findIndex((r) => r.id === state.readyId) + by + READY.length) % READY.length
    const next = READY[i]
    if (!next) return
    dispatch({ type: 'template', id: next.id })
    e.currentTarget.querySelectorAll<HTMLElement>('[role=radio]')[i]?.focus()
  }
  return (
    <section className="kntb-step" aria-labelledby="kntb-step-design">
      <h2 id="kntb-step-design">2. Choose a design</h2>
      <div className="kntb-gallery" role="radiogroup" aria-labelledby="kntb-step-design" onKeyDown={arrows}>
        {shown.map(({ r, html }) => (
          <div key={r.id} className="kntb-thumb" data-on={state.readyId === r.id}>
            <span className="kntb-thumb-window" aria-hidden="true">
              <SteadyFrame title="" tabIndex={-1} html={html} width={WIDTH} height={Math.round(HEIGHT / SCALE)} style={{ transform: `scale(${SCALE})` }} />
            </span>
            {/* a frame may not be inside a button: the button lies over the whole card */}
            <button type="button" role="radio" aria-checked={state.readyId === r.id} tabIndex={state.readyId === r.id ? 0 : -1} className="kntb-thumb-pick" onClick={() => { dispatch({ type: 'template', id: r.id }) }}>
              <strong>{r.name}</strong>
              <span className="kntb-thumb-about">{r.about}</span>
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

const GROUPS = [...new Map(NOTICES.map((n) => [menuOf(n), NOTICES.filter((x) => menuOf(x) === menuOf(n))])).entries()]
function Notices({ state, dispatch }: Props) {
  return (
    <section className="kntb-step" aria-labelledby="kntb-step-notice">
      <h2 id="kntb-step-notice">1. Choose a notice</h2>
      <div className="kntb-notices">
        {GROUPS.map(([menu, list]) => (
          <div key={menu} className="kntb-notice-group" role="group" aria-label={menu}>
            <span className="kntb-notice-menu" aria-hidden="true">{menu}</span>
            <div className="kntb-row kntb-wrap">
              {list.map((n) => <button key={n.code} type="button" className="kntb-small" aria-pressed={state.code === n.code} onClick={() => { dispatch({ type: 'notice', code: n.code }) }}>{n.name}</button>)}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Parts({ state, dispatch }: Props) {
  const n = notice(state.code)
  const groups = [...new Map(partsOf(n).map((p): [string, PartInfo[]] => [p.group, partsOf(n).filter((x) => x.group === p.group)])).entries()]
  return (
    <details className="kntb-panel" open>
      <summary>4. What it shows</summary>
      <div className="kntb-panel-body">
        <p className="kntb-note">For every notice. Anything you leave empty above is left out by itself. An SMS is always short and has no parts to switch.</p>
        {hasOwn(state.design, n.code) ? <p className="kntb-note">{n.name} has changes of its own from the full editor; they come first. <button type="button" className="kntb-small" onClick={() => { dispatch({ type: 'resetNotice' }) }}>Remove them</button></p> : null}
        {groups.map(([g, list]) => (
          <fieldset key={g} className="kntb-group">
            <legend>{g}</legend>
            {list.map((p) => (
              <div key={p.id} className="kntb-field kntb-check">
                <label><input type="checkbox" checked={isOn(state.design, p.id)} onChange={(e) => { dispatch({ type: 'part', id: p.id, on: e.target.checked }) }} /> {p.label}</label>
              </div>
            ))}
          </fieldset>
        ))}
      </div>
    </details>
  )
}

export function ReadyTemplates({ state, dispatch, onEdit }: Props & { onEdit: () => void }) {
  return (
    <>
      <Notices state={state} dispatch={dispatch} />
      <Designs state={state} dispatch={dispatch} />
      <div className="kntb-main">
        <section id="kntb-settings" className="kntb-controls" aria-label="Your details">
          <div className="kntb-brand"><BrandKit state={state} dispatch={dispatch} title="3. Your library" /></div>
          <Parts state={state} dispatch={dispatch} />
          <p className="kntb-note">Colours, fonts, the words of a notice, pictures and the order of parts are in the full editor. Your choices come with you.</p>
          <button type="button" onClick={onEdit}>Change more</button>
        </section>
        <Preview state={state} dispatch={dispatch} pick={false} />
      </div>
    </>
  )
}
