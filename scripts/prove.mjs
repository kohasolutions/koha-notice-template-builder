#!/usr/bin/env node
// The compiler's live proof, through a real Koha (tools/render.mjs of koha-notice-templates: rolled back).
//   TEMPLATES_DIR=../koha-notice-templates node scripts/prove.mjs [--designs=60]
// 1. asks Koha to print every field of every notice: that is the preview's sample data (src/samples.json);
// 2. compiles each notice with many designs, lets Koha run the pasted text, and requires Koha's message to equal
//    the preview, character for character.
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { NOTICES } from '../src/compiler/notices.ts'
import { compile } from '../src/compiler/compile.ts'
import { designs } from './designs.mjs'

const dir = resolve(process.env.TEMPLATES_DIR ?? '../koha-notice-templates')
const { runKoha } = await import(pathToFileURL(`${dir}/tools/render.mjs`).href)
const count = Number((process.argv.find((a) => a.startsWith('--designs=')) ?? '=60').split('=')[1])

const job = (n, content) => ({ code: n.code, module: n.module, file: 'email.html.tt', transport: 'email', is_html: true, title: n.code, content, scenario: n.scenario, case: '' })
function run(jobs) {
  const res = runKoha(jobs)
  if (res.leaked?.length) throw new Error(`the rollback did not hold: ${res.leaked.join(', ')}`)
  res.results.forEach((r, i) => { if (!r.ok) throw new Error(`${jobs[i].code}: ${r.error}\n${jobs[i].content}`) })
  if (res.results.length !== jobs.length) throw new Error('Koha stopped early')
  return res
}

const S = '\u2060|\u2060' // never in a catalogue record
const probe = (n) => {
  const list = (per) => Object.entries(n.fields).filter(([, f]) => !!f.perItem === per).map(([id, f]) => `${S}${id}${S}[% ${f.tt} %]`).join('') + S
  const perItem = Object.values(n.fields).some((f) => f.perItem)
  const use = [...new Set(Object.values(n.fields).flatMap((f) => f.use ?? []))].map((p) => `[% USE ${p} %]`).join('')
  return use + list(false) + (perItem ? `\n----\n${list(true)}\n----\n` : '')
}
const read = (text) => {
  const parts = text.split(S)
  const out = {}
  for (let i = 1; i + 1 < parts.length; i += 2) out[parts[i]] = parts[i + 1]
  return out
}
const first = run(NOTICES.map((n) => job(n, probe(n))))
const samples = {}
NOTICES.forEach((n, i) => {
  const [head, ...items] = first.results[i].content.split('\n').filter((l) => l.includes(S))
  samples[n.code] = { fields: read(head), items: items.map(read) }
})
writeFileSync(new URL('../src/samples.json', import.meta.url), JSON.stringify({ koha: first.koha, samples }, null, 2) + '\n')

const jobs = [], want = []
for (const n of NOTICES)
  for (const [i, d] of designs(count).entries()) {
    const c = compile(n, d)
    jobs.push(job(n, c.koha))
    want.push({ id: `${n.code} design ${i}`, text: c.sample(samples[n.code]) })
  }
const got = run(jobs)
let failed = 0
got.results.forEach((r, i) => {
  if (r.content === want[i].text) return
  if (++failed <= 3) console.error(`DIFFERENT ${want[i].id}\n--- Koha\n${r.content}\n--- preview\n${want[i].text}`)
})
console.log(`Koha ${got.koha}: ${jobs.length - failed} of ${jobs.length} previews equal to Koha's message`)
process.exit(failed ? 1 : 0)
