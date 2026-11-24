// The scaffold's page: just enough to prove the pieces work together. The real interface comes in the next batch.
// It imports nothing but React and the compiler, so kohasolutions.com can import this component as it is.
import { useState } from 'react'
import { compile } from './compiler/compile.ts'
import { DEFAULT } from './compiler/design.ts'
import { NOTICES } from './compiler/notices.ts'
import type { Sample } from './compiler/nodes.ts'
import samples from './samples.json'
import templates from './vendor/templates.json'

const SAMPLES: Record<string, Sample> = samples.samples

export function Builder() {
  const [name, setName] = useState('')
  const [logo, setLogo] = useState('')
  const [colour, setColour] = useState(DEFAULT.headerColour)
  const [code, setCode] = useState('CHECKOUT')
  const notice = NOTICES.find((n) => n.code === code)
  const sample = SAMPLES[code]
  const out = notice && sample ? compile(notice, { ...DEFAULT, libraryName: name, logo, headerColour: colour, linkColour: colour }) : null
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: 16, fontFamily: 'system-ui,sans-serif' }}>
      <h1>Live notice template builder for Koha</h1>
      <p><label>Library name <input value={name} onChange={(e) => { setName(e.target.value) }} /></label></p>
      <p><label>Logo address <input value={logo} onChange={(e) => { setLogo(e.target.value) }} /></label></p>
      <p><label>Colour <input type="color" value={colour} onChange={(e) => { setColour(e.target.value) }} /></label></p>
      <p><label>Notice <select value={code} onChange={(e) => { setCode(e.target.value) }}>
        {NOTICES.map((n) => <option key={n.code}>{n.code}</option>)}
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
