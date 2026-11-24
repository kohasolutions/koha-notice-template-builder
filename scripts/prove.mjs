#!/usr/bin/env node
// The compiler's live proof, through a real Koha (tools/render.mjs of koha-notice-templates: rolled back).
//   TEMPLATES_DIR=../koha-notice-templates node scripts/prove.mjs [--random=20] [--only=HOLD,ODUE] [--capture]
// 1. asks Koha to print every field of every notice in every situation: the preview's sample data (src/samples.json);
// 2. compiles each notice and format with the ready designs and with random designs full of hard text, lets Koha run
//    the pasted text, and requires Koha's message and subject to equal the preview, character for character.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { NOTICES } from '../src/notices/data.ts'
import { compile, compileSubject } from '../src/compiler/compile.ts'
import { randomDesigns, readyDesigns, hardDesigns } from './designs.mjs'

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `=${d}`).split('=').slice(1).join('=')
const dir = resolve(process.env.TEMPLATES_DIR ?? '../koha-notice-templates')
const { runKoha, loadNotices, casesOf } = await import(pathToFileURL(`${dir}/tools/render.mjs`).href)
const only = arg('only', '').split(',').filter(Boolean)
const notices = NOTICES.filter((n) => !only.length || only.includes(n.code))
const meta = Object.fromEntries(loadNotices([]).map((m) => [m.code, m]))
const FILE = { html: ['email.html.tt', 'email', true], text: ['email.txt.tt', 'email', false], sms: ['sms.txt.tt', 'sms', false], print: ['print.html.tt', 'print', true] }
// every file of the notice set has its format here, and the other way round
for (const n of notices) {
  const files = meta[n.code].files.join(), mine = n.formats.map((f) => FILE[f][0]).sort().join()
  if (files !== mine) throw new Error(`${n.code}: the notices have ${files}, the compiler has ${mine}`)
}
const cases = (n) => casesOf(meta[n.code])
const job = (n, c, format, content, title = n.code) => ({ code: n.code, module: n.module, file: FILE[format][0], transport: FILE[format][1], is_html: FILE[format][2], title, content, scenario: c.scenario, print_as: c.print_as, case: c.case })
/** One run at a time uses a Koha: wait for the others, for up to half an hour. */
function waiting(part) {
  for (let n = 0; ; n++)
    try {
      return runKoha(part)
    } catch (e) {
      if (n >= 6 || !String(e.stderr ?? e).includes('another run has been using')) throw e
    }
}
function run(jobs) {
  const out = { results: [] }
  for (let i = 0; i < jobs.length; i += 400) {
    const part = jobs.slice(i, i + 400), res = waiting(part)
    if (res.leaked?.length) throw new Error(`the rollback did not hold: ${res.leaked.join(', ')}`)
    res.results.forEach((r, k) => { if (!r.ok) throw new Error(`${part[k].code} ${part[k].case} ${part[k].file}: ${r.error}\n${part[k].content}`) })
    if (res.results.length !== part.length) throw new Error('Koha stopped early')
    out.koha = res.koha
    out.results.push(...res.results)
    if (jobs.length > 400) console.error(`${out.results.length}/${jobs.length}`)
  }
  return out
}

const S = '\u2060|\u2060' // never in a catalogue record
const probe = (n, format) => {
  const printing = format === 'print'
  const want = (id) => printing || n.slip || !/^(r_|surname$|today$|now$)/.test(id)
  const list = (loop) => Object.entries(n.fields).filter(([id, f]) => f.loop === loop && want(id)).map(([id, f]) => `${S}${id}${S}[% ${f.tt} %]`).join('')
  const use = [...new Set(Object.values(n.fields).flatMap((f) => f.use ?? []))].map((p) => `[%- USE ${p} -%]`).join('')
  const pre = [...new Set([...Object.values(n.fields), ...Object.values(n.loops)].map((f) => f.pre).filter(Boolean))].map((p) => `[%- ${p} -%]`).join('')
  let out = use + pre + list(undefined)
  for (const [id, l] of Object.entries(n.loops)) {
    const body = `${S}@${id}${S}${list(id)}`
    out += l.digest ? `\n----\n${body}\n----\n` : `[% FOREACH ${l.each} %]${body}[% END %]`
  }
  return out + `${S}@end${S}`
}
const read = (n, text) => {
  const parts = text.split(S), out = { fields: {}, loops: Object.fromEntries(Object.keys(n.loops).map((l) => [l, []])) }
  let row = out.fields
  for (let i = 1; i + 1 < parts.length; i += 2) {
    const id = parts[i], v = parts[i + 1]
    if (id === '@end') row = out.fields
    else if (id.startsWith('@')) out.loops[id.slice(1)].push((row = {}))
    else row[id] = Object.values(n.loops).some((l) => l.digest) ? v.replace(/\n+$/, '') : v
  }
  return out
}
const probes = notices.flatMap((n) => cases(n).flatMap((c) => [...(n.formats.includes('html') ? ['html'] : []), ...(n.formats.includes('print') ? ['print'] : [])].map((f) => ({ n, c, f }))))
const first = run(probes.map(({ n, c, f }) => job(n, c, f, probe(n, f))))
const file = new URL('../src/samples.json', import.meta.url)
const samples = only.length ? JSON.parse(readFileSync(file, 'utf8')).samples : {}
probes.forEach(({ n, c, f }, i) => (((samples[n.code] ??= {})[c.case || 'only'] ??= {})[f === 'print' ? 'print' : 'email'] = read(n, first.results[i].content)))
if (!process.env.NO_WRITE) writeFileSync(file, JSON.stringify({ koha: first.koha, samples }, null, 1) + '\n')
if (process.argv.includes('--capture')) process.exit(0)

const ready = readyDesigns(), random = randomDesigns(Number(arg('random', '20'))), hard = hardDesigns()
const jobs = [], want = []
for (const n of notices)
  for (const [k, c] of cases(n).entries())
    for (const format of n.formats) {
      // the look matters in the HTML letters; text and SMS only take the library's own words
      const list = [...(format === 'html' || format === 'print' ? ready : ready.slice(0, 1)), ...(k === 0 ? [...random, ...hard] : hard.slice(0, 1))]
      for (const [i, d] of list.entries()) {
        const s = samples[n.code][c.case || 'only'][format === 'print' ? 'print' : 'email']
        const out = compile(n, d, format), sub = compileSubject(n, d)
        jobs.push(job(n, c, format, out.koha, sub.koha))
        want.push({ id: `${n.code} ${c.case} ${format} design ${i} ${d.id ?? 'random'}`, kind: ready.includes(d) ? 'ready' : 'random/hard', format, text: out.sample(s), subject: format === 'html' || format === 'text' ? sub.sample(s) : null })
      }
    }
// the only things that differ from run to run: the minute on the slip and the one-time key in the reset link
const same = (t) => t.replace(/(\d{2}\/\d{2}\/\d{4} )\d{2}:\d{2}/g, '$1--:--').replace(/uniqueKey=[^"<\s]+/g, 'uniqueKey=--')
const got = run(jobs)
let failed = 0
const counts = {}
mkdirSync(new URL('../out/', import.meta.url), { recursive: true })
got.results.forEach((r, i) => {
  const w = want[i], t = (counts[`${w.format} ${w.kind}`] ??= [0, 0])
  t[1]++
  const body = same(r.content ?? '') === same(w.text)
  const title = w.subject === null || same(r.subject ?? '') === same(w.subject)
  if (body && title) return void t[0]++
  if (++failed <= 4) {
    const a = same(r.content ?? ''), b = same(w.text)
    let k = 0
    while (k < a.length && a[k] === b[k]) k++
    console.error(`DIFFERENT ${w.id}${title ? '' : `\n  subject Koha ${JSON.stringify(r.subject)}\n  subject here ${JSON.stringify(w.subject)}`}${body ? '' : `\n  Koha ${JSON.stringify(a.slice(Math.max(0, k - 60), k + 100))}\n  here ${JSON.stringify(b.slice(Math.max(0, k - 60), k + 100))}`}`)
  }
})
console.log(Object.entries(counts).map(([k, [a, b]]) => `${k}: ${a}/${b}`).join('\n'))
console.log(`Koha ${got.koha}: ${jobs.length - failed} of ${jobs.length} equal to the preview`)
process.exit(failed ? 1 : 0)
