// One control per kind of rule in SPEC. A setting gets its control from its rule, never from its name, so a new
// setting in SPEC appears on the screen with nothing else to write but its label (labels.ts).
import type { ReactNode } from 'react'
import { useId } from 'react'
import type { Group, Rule } from '../compiler/design.ts'
import { SPEC } from '../compiler/design.ts'
import { colour } from '../compiler/escape.ts'
import { OPTION, SETTING } from './labels.ts'

export function Field({ label, children, hint }: { label: string; children: (id: string) => ReactNode; hint?: string }) {
  const id = useId()
  return (
    <div className="kntb-field">
      <label htmlFor={id}>{label}</label>
      {children(id)}
      {hint ? <p className="kntb-hint">{hint}</p> : null}
    </div>
  )
}

function Colour({ id, label, value, onChange, optional }: { id: string; label: string; value: string; onChange: (v: string) => void; optional: boolean }) {
  const on = value !== ''
  return (
    <div className="kntb-row">
      {optional ? <input type="checkbox" aria-label={`${label}: use a colour`} checked={on} onChange={(e) => { onChange(e.target.checked ? '#cccccc' : '') }} /> : null}
      <input id={id} type="color" value={colour(value, '#000000').toLowerCase()} disabled={!on && optional} onChange={(e) => { onChange(e.target.value) }} />
      <input className="kntb-hex" aria-label={`${label}, colour code`} value={value} placeholder={optional ? 'none' : '#000000'} spellCheck={false} disabled={!on && optional}
        onChange={(e) => { onChange(e.target.value.trim()) }} />
    </div>
  )
}

/** The control for one setting of one group. */
export function Setting({ group, k, value, onChange }: { group: Group; k: string; value: unknown; onChange: (v: unknown) => void }) {
  const rules: Readonly<Record<string, Rule>> = SPEC[group]
  const rule = rules[k]
  const label = SETTING[group][k] ?? k
  if (!rule) return null
  switch (rule.is) {
    case 'bool':
      return (
        <div className="kntb-field kntb-check">
          <label><input type="checkbox" checked={value === true} onChange={(e) => { onChange(e.target.checked) }} /> {label}</label>
        </div>
      )
    case 'colour':
    case 'colour?':
      return <Field label={label}>{(id) => <Colour id={id} label={label} value={typeof value === 'string' ? value : ''} optional={rule.is === 'colour?'} onChange={onChange} />}</Field>
    case 'px': {
      const n = typeof value === 'number' ? value : rule.min
      return (
        <Field label={label}>{(id) => (
          <div className="kntb-row">
            <input id={id} type="range" min={rule.min} max={rule.max} value={n} onChange={(e) => { onChange(Number(e.target.value)) }} />
            <input className="kntb-num" type="number" aria-label={`${label}, pixels`} min={rule.min} max={rule.max} value={n} onChange={(e) => { onChange(Number(e.target.value)) }} />
            <span className="kntb-unit">px</span>
          </div>
        )}</Field>
      )
    }
    case 'one':
      return (
        <Field label={label}>{(id) => (
          <select id={id} value={typeof value === 'string' ? value : ''} onChange={(e) => { onChange(e.target.value) }}>
            {rule.of.map((o) => <option key={o} value={o}>{OPTION[o] ?? o}</option>)}
          </select>
        )}</Field>
      )
    case 'list':
      return <Choices label={label} all={rule.of} must={'must' in rule ? rule.must : undefined} value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} />
    case 'colours':
      return <Colours label={label} value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} />
    case 'https':
      return (
        <Field label={label} hint="An image on the internet, starting with https://. Mail apps block other addresses.">{(id) => (
          <input id={id} type="url" inputMode="url" placeholder="https://" value={typeof value === 'string' ? value : ''} onChange={(e) => { onChange(e.target.value.trim()) }} />
        )}</Field>
      )
    case 'text':
      return <Field label={label}>{(id) => <input id={id} value={typeof value === 'string' ? value : ''} onChange={(e) => { onChange(e.target.value) }} />}</Field>
  }
}

/** Which of a fixed set are shown, and in what order: the order is the library's. */
function Choices({ label, all, must, value, onChange }: { label: string; all: readonly string[]; must: string | undefined; value: string[]; onChange: (v: string[]) => void }) {
  const order = [...value.filter((v) => all.includes(v)), ...all.filter((v) => !value.includes(v))]
  const move = (i: number, by: number) => {
    const on = [...value]
    const j = i + by
    const a = on[i], b = on[j]
    if (a === undefined || b === undefined) return
    on[i] = b
    on[j] = a
    onChange(on)
  }
  return (
    <fieldset className="kntb-field kntb-choices">
      <legend>{label}</legend>
      <ul>
        {order.map((v) => {
          const on = value.includes(v)
          const i = value.indexOf(v)
          const name = OPTION[v] ?? v
          return (
            <li key={v}>
              <label><input type="checkbox" checked={on} disabled={v === must} onChange={(e) => { onChange(e.target.checked ? [...value, v] : value.filter((x) => x !== v)) }} /> {name}</label>
              {on ? (
                <span className="kntb-move">
                  <button type="button" aria-label={`Move ${name} up`} disabled={i <= 0} onClick={() => { move(i, -1) }}>↑</button>
                  <button type="button" aria-label={`Move ${name} down`} disabled={i >= value.length - 1} onClick={() => { move(i, 1) }}>↓</button>
                </span>
              ) : null}
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}

const MAX_STRIPE = 8
function Colours({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <fieldset className="kntb-field">
      <legend>{label}</legend>
      <div className="kntb-row kntb-wrap">
        {value.map((c, i) => (
          <span key={i} className="kntb-row">
            <input type="color" aria-label={`Stripe colour ${i + 1}`} value={colour(c, '#000000').toLowerCase()} onChange={(e) => { onChange(value.map((x, k) => (k === i ? e.target.value : x))) }} />
            <button type="button" className="kntb-small" aria-label={`Remove stripe colour ${i + 1}`} onClick={() => { onChange(value.filter((_, k) => k !== i)) }}>×</button>
          </span>
        ))}
        {value.length < MAX_STRIPE ? <button type="button" className="kntb-small" onClick={() => { onChange([...value, '#cccccc']) }}>Add a colour</button> : null}
      </div>
    </fieldset>
  )
}

/** Every setting of a group, in SPEC's order. */
export function GroupSettings({ group, values, set, only }: { group: Group; values: Readonly<Record<string, unknown>>; set: (k: string, v: unknown) => void; only?: readonly string[] }) {
  const keys = Object.keys(SPEC[group]).filter((k) => !only || only.includes(k))
  return <>{keys.map((k) => <Setting key={k} group={group} k={k} value={values[k]} onChange={(v) => { set(k, v) }} />)}</>
}
