// The panels on the left: brand kit, ready designs, then the look, group by group.
import type { Dispatch, ReactNode } from 'react'
import type { Group, Link, Social } from '../compiler/design.ts'
import { url } from '../compiler/escape.ts'
import { READY } from '../compiler/ready.ts'
import { Field, GroupSettings } from './controls.tsx'
import { GROUP, NETWORKS } from './labels.ts'
import type { Action, LibraryText, State } from './state.ts'

type Props = { state: State; dispatch: Dispatch<Action> }

function Panel({ title, open, children }: { title: string; open?: boolean; children: ReactNode }) {
  return (
    <details className="kntb-panel" open={open}>
      <summary>{title}</summary>
      <div className="kntb-panel-body">{children}</div>
    </details>
  )
}

function Groups({ state, dispatch, groups }: Props & { groups: readonly Group[] }) {
  return (
    <>
      {groups.map((g) => (
        <fieldset key={g} className="kntb-group">
          {groups.length > 1 ? <legend>{GROUP[g]}</legend> : null}
          <GroupSettings group={g} values={state.design[g] as unknown as Readonly<Record<string, unknown>>} set={(key, value) => { dispatch({ type: 'set', group: g, key, value }) }} />
        </fieldset>
      ))}
    </>
  )
}

const TEXT: Array<[LibraryText, string, string?]> = [
  ['name', 'Library name', 'Leave empty to use the library name from Koha.'],
  ['tagline', 'Tagline'],
  ['logo', 'Logo address', 'An image on the internet, starting with https://. Without one, the first letter of the name is shown.'],
  ['logoAlt', 'Logo description', 'Read out by screen readers and shown when images are blocked. Empty: the library name.'],
  ['address', 'Address'],
  ['phone', 'Phone'],
  ['email', 'Email'],
  ['hours', 'Opening hours'],
  ['smallprint', 'Small print'],
]

function LogoWarning({ logo }: { logo: string }) {
  if (!logo.trim()) return null
  if (!url(logo, ['https:'])) return <p className="kntb-warn" role="status">This is not an https:// address, so it is left out of the notice.</p>
  return null
}

export function BrandKit({ state, dispatch }: Props) {
  const L = state.design.perLibrary
  const set = (key: LibraryText, value: string) => { dispatch({ type: 'library', key, value }) }
  return (
    <Panel title="Your library" open>
      <p className="kntb-note">Used in every notice. Nothing you type leaves this page.</p>
      {TEXT.map(([k, label, hint]) => (
        <Field key={k} label={label} {...(hint ? { hint } : {})}>{(id) => (
          k === 'address' || k === 'smallprint'
            ? <textarea id={id} rows={2} value={L[k]} onChange={(e) => { set(k, e.target.value) }} />
            : <input id={id} type={k === 'email' ? 'email' : k === 'logo' ? 'url' : 'text'} value={L[k]} onChange={(e) => { set(k, e.target.value) }} />
        )}</Field>
      ))}
      <LogoWarning logo={L.logo} />
      <Links links={L.links} onChange={(links) => { dispatch({ type: 'links', links }) }} />
      <Socials social={L.social} withIcon={state.design.social.style === 'image'} onChange={(social) => { dispatch({ type: 'social', social }) }} />
      <button type="button" className="kntb-small" onClick={() => { dispatch({ type: 'example' }) }}>Fill the empty fields with an example</button>
    </Panel>
  )
}

const badHref = (href: string, schemes?: string[]) => href.trim() !== '' && !url(href, schemes)

function Links({ links, onChange }: { links: Link[]; onChange: (l: Link[]) => void }) {
  const put = (i: number, l: Partial<Link>) => { onChange(links.map((x, k) => (k === i ? { ...x, ...l } : x))) }
  return (
    <fieldset className="kntb-field kntb-list">
      <legend>Footer links</legend>
      {links.map((l, i) => (
        <div key={i} className="kntb-item">
          <input aria-label={`Link ${i + 1} words`} placeholder="Words, e.g. My account" value={l.label} onChange={(e) => { put(i, { label: e.target.value }) }} />
          <input aria-label={`Link ${i + 1} address`} type="url" placeholder="https://" value={l.href} onChange={(e) => { put(i, { href: e.target.value }) }} />
          <button type="button" className="kntb-small" aria-label={`Remove link ${i + 1}`} onClick={() => { onChange(links.filter((_, k) => k !== i)) }}>×</button>
          {badHref(l.href) ? <p className="kntb-warn">Only https:// and mailto: addresses become links; this one is left out.</p> : null}
        </div>
      ))}
      <button type="button" className="kntb-small" onClick={() => { onChange([...links, { label: '', href: '' }]) }}>Add a link</button>
    </fieldset>
  )
}

function Socials({ social, withIcon, onChange }: { social: Social[]; withIcon: boolean; onChange: (s: Social[]) => void }) {
  const put = (i: number, s: Partial<Social>) => { onChange(social.map((x, k) => (k === i ? { ...x, ...s } : x))) }
  const known = (n: string) => (NETWORKS as readonly string[]).includes(n)
  return (
    <fieldset className="kntb-field kntb-list">
      <legend>Social links</legend>
      {social.map((s, i) => (
        <div key={i} className="kntb-item">
          <select aria-label={`Social link ${i + 1} network`} value={known(s.network) ? s.network : ''} onChange={(e) => { put(i, { network: e.target.value }) }}>
            {NETWORKS.map((n) => <option key={n} value={n}>{n}</option>)}
            <option value="">Another (type its name)</option>
          </select>
          {!known(s.network) ? <input aria-label={`Social link ${i + 1} name`} placeholder="Name" value={s.network} onChange={(e) => { put(i, { network: e.target.value }) }} /> : null}
          <input aria-label={`Social link ${i + 1} address`} type="url" placeholder="https://" value={s.href} onChange={(e) => { put(i, { href: e.target.value }) }} />
          {withIcon ? <input aria-label={`Social link ${i + 1} icon image`} type="url" placeholder="Icon image https://" value={s.icon ?? ''} onChange={(e) => { put(i, { icon: e.target.value }) }} /> : null}
          <button type="button" className="kntb-small" aria-label={`Remove social link ${i + 1}`} onClick={() => { onChange(social.filter((_, k) => k !== i)) }}>×</button>
          {badHref(s.href) ? <p className="kntb-warn">Only https:// addresses become links; this one is left out.</p> : null}
        </div>
      ))}
      <button type="button" className="kntb-small" onClick={() => { onChange([...social, { network: NETWORKS[social.length % NETWORKS.length] ?? 'Facebook', href: '' }]) }}>Add a social link</button>
    </fieldset>
  )
}

export function Designs({ state, dispatch }: Props) {
  return (
    <Panel title="Design" open>
      <p className="kntb-note">Start from one, then change anything below. Your library's details stay.</p>
      <div className="kntb-designs" role="radiogroup" aria-label="Ready designs">
        {READY.map((r) => (
          <button key={r.id} type="button" role="radio" aria-checked={state.readyId === r.id} className="kntb-design" onClick={() => { dispatch({ type: 'ready', id: r.id }) }}>
            <span className="kntb-swatch" aria-hidden="true">
              {[r.page.bg, r.header.bg || r.card.bg, r.button.bg, r.type.heading].map((c, i) => <span key={i} style={{ background: c }} />)}
            </span>
            <strong>{r.name}</strong>
            <span>{r.about}</span>
          </button>
        ))}
      </div>
    </Panel>
  )
}

export function Look({ state, dispatch }: Props) {
  return (
    <>
      <Panel title="Header"><Groups state={state} dispatch={dispatch} groups={['header']} /></Panel>
      <Panel title="Page and text"><Groups state={state} dispatch={dispatch} groups={['page', 'card', 'type', 'hero']} /></Panel>
      <Panel title="Items list"><Groups state={state} dispatch={dispatch} groups={['items']} /></Panel>
      <Panel title="Boxes and button"><Groups state={state} dispatch={dispatch} groups={['box', 'alert', 'button']} /></Panel>
      <Panel title="Footer and social links"><Groups state={state} dispatch={dispatch} groups={['footer', 'social']} /></Panel>
    </>
  )
}
