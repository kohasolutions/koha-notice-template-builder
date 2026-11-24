#!/usr/bin/env node
// Copies the notices from a pinned koha-notice-templates bundle (its tools/tokens.mjs) into src/vendor/templates.json.
//   node scripts/import-templates.mjs <bundle.json>   import, and write the pin (templates.lock.json)
//   node scripts/import-templates.mjs --check         the vendored file is the pinned one (CI)
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
const at = (p) => new URL(`../${p}`, import.meta.url)
const sha = (s) => createHash('sha256').update(s).digest('hex')
const arg = process.argv[2]
if (arg === '--check') {
  const lock = JSON.parse(readFileSync(at('templates.lock.json'), 'utf8'))
  if (sha(readFileSync(at('src/vendor/templates.json'))) !== lock.vendored_sha256) {
    console.error('[templates] src/vendor/templates.json is not the pinned file: import it again, never edit it')
    process.exit(1)
  }
  console.log(`[templates] ${lock.commit.slice(0, 7)}${lock.provisional ? ' (provisional: before v1.0.0)' : ''}`)
} else {
  const raw = readFileSync(arg, 'utf8')
  const b = JSON.parse(raw)
  if (b.format !== 1) throw new Error(`bundle format ${b.format}, expected 1`)
  if (b.dirty) throw new Error('the bundle was made from uncommitted templates')
  const out = {
    licence: b.licence, source: b.source, commit: b.commit, koha: b.koha,
    notices: b.notices.map((n) => ({ code: n.code, module: n.module, menu: n.menu, name: n.name, subject: n.subject, files: n.files.map((f) => ({ file: f.file, template: f.template })) })),
  }
  const text = JSON.stringify(out, null, 1) + '\n'
  writeFileSync(at('src/vendor/templates.json'), text)
  writeFileSync(at('templates.lock.json'), JSON.stringify({ source: b.source, version: null, provisional: true, commit: b.commit, bundle_sha256: sha(raw), vendored_sha256: sha(text) }, null, 2) + '\n')
  console.log(`[templates] imported ${out.notices.length} notices at ${b.commit.slice(0, 7)}`)
}
