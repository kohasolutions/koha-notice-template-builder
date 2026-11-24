// The order of a notice's parts, and what a library adds between them. Drag to move, or use the buttons (keyboard).
// Items, details and warnings are what the message is about: they can move, never go (safe() would put them back).
import { DragDropProvider } from '@dnd-kit/react'
import { isSortable, useSortable } from '@dnd-kit/react/sortable'
import type { Dispatch, ReactNode } from 'react'
import type { Added, Design, SectionId } from '../compiler/design.ts'
import { SECTIONS } from '../compiler/design.ts'
import type { Notice } from '../notices/model.ts'
import { Field } from './controls.tsx'
import type { Action, State } from './state.ts'
import { effective, notice } from './state.ts'
import { WordsEditor } from './WordsEditor.tsx'

type Section = Design['sections'][number]
export const SECTION_NAME: Record<SectionId, string> = {
  greeting: 'Greeting', intro: 'First paragraph', items: 'Items', alert: 'Warnings (fines, restrictions)', details: 'Details box',
  note: 'Note', button: 'Button', closing: 'Closing and library name',
}
export const ADDED_NAME: Record<Added['add'], string> = {
  text: 'Text', notice: 'Notice box', divider: 'Divider', spacer: 'Space', image: 'Image', button: 'Extra button', columns: 'Two columns',
}
const KEEP = new Set<SectionId>(['items', 'details', 'alert'])
const NEW: Record<Added['add'], Added> = {
  text: { add: 'text', words: '' }, notice: { add: 'notice', words: '' }, divider: { add: 'divider' }, spacer: { add: 'spacer', px: 16 },
  image: { add: 'image', src: '', alt: '' }, button: { add: 'button', label: '', href: '' }, columns: { add: 'columns', left: '', right: '' },
}
const nameOf = (s: Section) => (typeof s === 'string' ? SECTION_NAME[s] : ADDED_NAME[s.add])

/** Keys that stay the same while a block is typed in, so its editor keeps the cursor. */
function keys(list: Section[]): string[] {
  let n = 0
  return list.map((s) => (typeof s === 'string' ? s : `added-${n++}`))
}

function Row({ id, index, name, last, children, onMove, onRemove, onCopy, removeLabel }: {
  id: string; index: number; name: string; last: boolean; children?: ReactNode
  onMove: (by: number) => void; onRemove: (() => void) | null; onCopy: (() => void) | null; removeLabel: string
}) {
  const { ref, handleRef, isDragging } = useSortable({ id, index })
  return (
    <li ref={ref} className={`kntb-section${isDragging ? ' kntb-dragging' : ''}`}>
      <div className="kntb-row">
        <button type="button" ref={handleRef} className="kntb-grip" aria-label={`Drag ${name}`}>⠿</button>
        <strong className="kntb-grow">{name}</strong>
        <button type="button" className="kntb-small" aria-label={`Move ${name} up`} disabled={index === 0} onClick={() => { onMove(-1) }}>↑</button>
        <button type="button" className="kntb-small" aria-label={`Move ${name} down`} disabled={last} onClick={() => { onMove(1) }}>↓</button>
        {onCopy ? <button type="button" className="kntb-small" aria-label={`Duplicate ${name}`} onClick={onCopy}>Copy</button> : null}
        {onRemove ? <button type="button" className="kntb-small" aria-label={`${removeLabel} ${name}`} onClick={onRemove}>{removeLabel}</button> : null}
      </div>
      {children}
    </li>
  )
}

function AddedFields({ a, n, set }: { a: Added; n: Notice; set: (a: Added, typing: string) => void }) {
  switch (a.add) {
    case 'text':
    case 'notice':
      return <WordsEditor label={a.add === 'text' ? 'Text block' : 'Notice box text'} value={a.words || undefined} notice={n} standard="Write something" onChange={(w) => { set({ ...a, words: w ?? '' }, 'words') }} />
    case 'columns':
      return (
        <>
          <WordsEditor label="Left column" value={a.left || undefined} notice={n} standard="Write something" onChange={(w) => { set({ ...a, left: w ?? '' }, 'left') }} />
          <WordsEditor label="Right column" value={a.right || undefined} notice={n} standard="Write something" onChange={(w) => { set({ ...a, right: w ?? '' }, 'right') }} />
        </>
      )
    case 'spacer':
      return <Field label="Height">{(id) => <div className="kntb-row"><input id={id} type="range" min={4} max={80} value={a.px} onChange={(e) => { set({ ...a, px: Number(e.target.value) }, 'px') }} /><span className="kntb-unit">{a.px} px</span></div>}</Field>
    case 'image':
      return (
        <>
          <Field label="Image address" hint="An image on the internet, starting with https://.">{(id) => <input id={id} type="url" placeholder="https://" value={a.src} onChange={(e) => { set({ ...a, src: e.target.value.trim() }, 'src') }} />}</Field>
          <Field label="What the image shows" hint="Read out by screen readers and shown when images are blocked.">{(id) => <input id={id} value={a.alt} onChange={(e) => { set({ ...a, alt: e.target.value }, 'alt') }} />}</Field>
        </>
      )
    case 'button':
      return (
        <>
          <Field label="Button words">{(id) => <input id={id} value={a.label} onChange={(e) => { set({ ...a, label: e.target.value }, 'label') }} />}</Field>
          <Field label="Button address" hint="https:// or mailto:. Not shown on printed notices.">{(id) => <input id={id} type="url" placeholder="https://" value={a.href} onChange={(e) => { set({ ...a, href: e.target.value.trim() }, 'href') }} />}</Field>
        </>
      )
    case 'divider':
      return null
  }
}

export function Sections({ state, dispatch }: { state: State; dispatch: Dispatch<Action> }) {
  const n = notice(state.code)
  const list = effective(state.design, state.code).sections
  const ids = keys(list)
  const put = (next: Section[], typing?: string) => { dispatch({ type: 'sections', sections: next, ...(typing === undefined ? {} : { typing }) }) }
  const move = (from: number, to: number) => {
    if (to < 0 || to >= list.length || from === to) return
    const next = [...list]
    const [x] = next.splice(from, 1)
    if (x !== undefined) next.splice(to, 0, x)
    put(next)
  }
  const hidden = SECTIONS.filter((s) => !list.includes(s))
  return (
    <>
      <p className="kntb-note">Drag a part, or use its arrows. {state.scope === 'notice' ? `Only for ${n.name}.` : 'For every notice.'}</p>
      <DragDropProvider onDragEnd={(e) => {
        if (e.canceled) return
        const { source } = e.operation
        if (isSortable(source)) move(source.initialIndex, source.index)
      }}>
        <ol className="kntb-sections">
          {list.map((s, i) => (
            <Row key={ids[i]} id={ids[i] ?? String(i)} index={i} name={nameOf(s)} last={i === list.length - 1}
              onMove={(by) => { move(i, i + by) }}
              onCopy={typeof s === 'string' ? null : () => { put([...list.slice(0, i + 1), s, ...list.slice(i + 1)]) }}
              onRemove={typeof s === 'string' && KEEP.has(s) ? null : () => { put(list.filter((_, k) => k !== i)) }}
              removeLabel={typeof s === 'string' ? 'Hide' : 'Remove'}>
              {typeof s === 'string' ? null : <div className="kntb-added"><AddedFields a={s} n={n} set={(a, typing) => { put(list.map((x, k) => (k === i ? a : x)), `${ids[i] ?? i}.${typing}`) }} /></div>}
            </Row>
          ))}
        </ol>
      </DragDropProvider>
      {hidden.length ? (
        <div className="kntb-field">
          <span className="kntb-label">Hidden</span>
          <div className="kntb-row kntb-wrap">{hidden.map((s) => <button key={s} type="button" className="kntb-small" onClick={() => { put([...list, s]) }}>Show {SECTION_NAME[s]}</button>)}</div>
        </div>
      ) : null}
      <div className="kntb-field">
        <span className="kntb-label">Add</span>
        <div className="kntb-row kntb-wrap">
          {(Object.keys(NEW) as Array<Added['add']>).map((k) => <button key={k} type="button" className="kntb-small" onClick={() => { put([...list, NEW[k]]) }}>{ADDED_NAME[k]}</button>)}
        </div>
      </div>
    </>
  )
}
