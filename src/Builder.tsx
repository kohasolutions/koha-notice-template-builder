// The scaffold's page: just enough to prove the pieces work together. The real interface comes in the next batch.
// It imports nothing but React and the compiler, so kohasolutions.com can import this component as it is.
import { useState } from 'react'
import { compile } from './compiler/compile.ts'
import { fromReady } from './compiler/design.ts'
import { READY } from './compiler/ready.ts'
import { NOTICES } from './notices/data.ts'
import type { Sample } from './compiler/nodes.ts'
import samples from './samples.json'
import templates from './vendor/templates.json'

const SAMPLES = samples.samples as unknown as Record<string, Record<string, Partial<Record<'email' | 'print', Sample>>>>
const SHOWN = NOTICES.filter((n) => n.formats.includes('html'))

export function Builder() {
  const [name, setName] = useState('')
  const [logo, setLogo] = useState('')
  const [look, setLook] = useState(READY[0]?.id ?? '')
  const [code, setCode] = useState('CHECKOUT')
  const notice = SHOWN.find((n) => n.code === code)
  const sample = Object.values(SAMPLES[code] ?? {})[0]?.email
  const ready = READY.find((r) => r.id === look)
  const design = ready && fromReady(ready)
  const out = notice && sample && design ? compile(notice, { ...design, perLibrary: { ...design.perLibrary, name, logo } }) : null
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: 16, fontFamily: 'system-ui,sans-serif' }}>
      <h1>Live notice template builder for Koha</h1>
      <p><label>Library name <input value={name} onChange={(e) => { setName(e.target.value) }} /></label></p>
      <p><label>Logo address <input value={logo} onChange={(e) => { setLogo(e.target.value) }} /></label></p>
      <p><label>Design <select value={look} onChange={(e) => { setLook(e.target.value) }}>
        {READY.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select></label></p>
      <p><label>Notice <select value={code} onChange={(e) => { setCode(e.target.value) }}>
        {SHOWN.map((n) => <option key={n.code}>{n.code}</option>)}
      </select></label></p>
      {out && sample && <>
        <iframe title="Preview" sandbox="" srcDoc={out.sample(sample)} style={{ width: '100%', height: 420, border: '1px solid #ccc' }} />
        <p><label>Paste this into Koha<br /><textarea readOnly rows={8} style={{ width: '100%' }} value={out.koha} /></label></p>
      </>}
      <h2>Notices</h2>
      <ul>{templates.notices.map((n) => <li key={n.code}><code>{n.code}</code> {n.name}</li>)}</ul>
      <p>Tested on Koha {samples.koha}. Notices at <code>{templates.commit.slice(0, 7)}</code>, before version 1.0.0. GPL-3.0-or-later.</p>
    </main>
  )
}
