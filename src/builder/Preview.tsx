// The live preview: the compiled notice with the sample Koha printed for it, on a phone and a desktop width.
// The same compile() output is what goes into Koha (scripts/prove.mjs proves the two equal).
import type { Dispatch } from 'react'
import { useMemo, useRef, useState } from 'react'
import { compile, compileSubject } from '../compiler/compile.ts'
import { NOTICES } from '../notices/data.ts'
import { CopyButton } from './copy.tsx'
import { forKoha, TO_CREATE } from './for-koha.ts'
import { FORMAT_NAME } from './labels.ts'
import type { Action, State, View } from './state.ts'
import { notice, sampleFor, situationName, situations } from './state.ts'
import { warnings } from './warnings.ts'

const WIDTH = { phone: 390, desktop: 740 } as const

/** A notice in a sandbox: no script runs, and its styles cannot reach the page. Its height follows its content. */
function Frame({ html, width, dark, label }: { html: string; width: number; dark: boolean; label: string }) {
  const ref = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(480)
  return (
    <figure className="kntb-frame" style={{ width }}>
      <figcaption>{label}</figcaption>
      <iframe
        ref={ref} title={`${label} preview`} sandbox="allow-same-origin" srcDoc={html} width={width} height={height}
        className={dark ? 'kntb-dark' : undefined}
        onLoad={() => { const h = ref.current?.contentDocument?.documentElement.scrollHeight; if (h) setHeight(Math.min(h + 4, 6000)) }}
      />
    </figure>
  )
}

function Text({ text, sms }: { text: string; sms: boolean }) {
  const chars = Array.from(text).length
  return (
    <figure className="kntb-frame kntb-text" style={{ width: WIDTH.phone }}>
      <figcaption>{sms ? `SMS, ${chars} characters` : 'Plain-text email'}</figcaption>
      <pre>{text}</pre>
    </figure>
  )
}

export function Preview({ state, dispatch }: { state: State; dispatch: Dispatch<Action> }) {
  const n = notice(state.code)
  const sample = sampleFor(state)
  const out = useMemo(() => {
    if (!sample) return null
    const c = compile(n, state.design, state.format)
    const subject = state.format === 'html' || state.format === 'text' ? compileSubject(n, state.design) : null
    return { koha: forKoha(n, state.design, state.format), shown: c.sample(sample), subject: subject?.sample(sample) ?? null }
  }, [n, state.design, state.format, sample])
  const warned = useMemo(() => warnings(state.design, state.code), [state.design, state.code])
  const views: Array<Exclude<View, 'both'>> = state.view === 'both' ? ['phone', 'desktop'] : [state.view]
  const html = state.format === 'html' || state.format === 'print'

  return (
    <section id="kntb-preview" className="kntb-preview" aria-label="Preview">
      <div className="kntb-toolbar">
        <label>Notice{' '}
          <select value={state.code} onChange={(e) => { dispatch({ type: 'notice', code: e.target.value }) }}>
            {NOTICES.map((x) => <option key={x.code} value={x.code}>{x.name} ({x.code})</option>)}
          </select>
        </label>
        {situations(state.code).length > 1 ? (
          <label>Situation{' '}
            <select value={state.situation} onChange={(e) => { dispatch({ type: 'situation', situation: e.target.value }) }}>
              {situations(state.code).map((k) => <option key={k} value={k}>{situationName(k)}</option>)}
            </select>
          </label>
        ) : null}
        <div className="kntb-seg" role="group" aria-label="Format">
          {n.formats.map((f) => <button key={f} type="button" aria-pressed={state.format === f} onClick={() => { dispatch({ type: 'format', format: f }) }}>{FORMAT_NAME[f]}</button>)}
        </div>
        {html ? (
          <div className="kntb-seg" role="group" aria-label="Width">
            {(['phone', 'desktop', 'both'] as const).map((v) => <button key={v} type="button" aria-pressed={state.view === v} onClick={() => { dispatch({ type: 'view', view: v }) }}>{v === 'both' ? 'Both' : v === 'phone' ? 'Phone' : 'Desktop'}</button>)}
          </div>
        ) : null}
        {state.format === 'html' ? (
          <label className="kntb-check"><input type="checkbox" checked={state.dark} onChange={(e) => { dispatch({ type: 'dark', on: e.target.checked }) }} /> Dark mode (as a mail app may force it)</label>
        ) : null}
      </div>

      {!out ? <p className="kntb-warn">Koha printed no sample for this situation.</p> : (
        <>
          {warned.length ? (
            <ul className="kntb-warnings" aria-label={`Warnings for ${n.name}`}>
              {warned.map((w) => <li key={w.id}>{w.text}</li>)}
            </ul>
          ) : null}
          {out.subject !== null ? <p className="kntb-subject"><span>Subject</span> {out.subject}</p> : null}
          <div className="kntb-frames">
            {html
              ? views.map((v) => <Frame key={v} html={out.shown} width={WIDTH[v]} dark={state.dark && state.format === 'html'} label={v === 'phone' ? 'Phone' : 'Desktop'} />)
              : <Text text={out.shown} sms={state.format === 'sms'} />}
          </div>
          <section className="kntb-koha" aria-label="The template for Koha">
            <h2>Put it into Koha</h2>
            <p>In Koha: <strong>Tools › Notices and slips</strong> › {out.koha.menu} › <code>{n.code}</code> › {out.koha.transport}, with "HTML message" {out.koha.htmlMessage ? 'ticked' : 'not ticked'}. Keep a copy of the text you have now.</p>
            {TO_CREATE.has(n.code) ? <p className="kntb-note"><code>{n.code}</code> does not come with Koha: make it there first, with "New notice", then choose it in <strong>Tools › Overdue notice/status triggers</strong>.</p> : null}
            <div className="kntb-row kntb-wrap">
              <CopyButton label="Copy subject" text={out.koha.subject} />
              <CopyButton label="Copy body" text={out.koha.body} />
            </div>
            {html || state.format === 'text' ? null : <p className="kntb-note">Koha asks for a subject here too, and drops the message without one.</p>}
            <label>Message subject<textarea readOnly rows={2} value={out.koha.subject} /></label>
            <label>Message body<textarea readOnly rows={10} value={out.koha.body} /></label>
          </section>
        </>
      )}
    </section>
  )
}
