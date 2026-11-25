#!/usr/bin/env node
// Copies the notices from a pinned koha-notice-templates bundle (its tools/tokens.mjs) into src/vendor/templates.json.
//   node scripts/import-templates.mjs <bundle.json>   import, and write the pin (templates.lock.json): provisional
//   node scripts/import-templates.mjs <bundle.json> --version 1.0.0
//                                                      a released pin: the tag v1.0.0 on GitHub must be the bundle's commit
//   node scripts/import-templates.mjs --check         the vendored file is the pinned one (CI)
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
const at = (p) => new URL(`../${p}`, import.meta.url)
const sha = (s) => createHash('sha256').update(s).digest('hex')
/** What the page itself needs: the templates' texts are not sent to every visitor. Made from the pinned file. */
const index = (t) => JSON.stringify({ source: t.source, commit: t.commit, notices: t.notices.map((n) => ({ code: n.code, menu: n.menu })) }, null, 1) + '\n'
const arg = process.argv[2]
if (arg === '--check') {
  const lock = JSON.parse(readFileSync(at('templates.lock.json'), 'utf8'))
  if (sha(readFileSync(at('src/vendor/templates.json'))) !== lock.vendored_sha256) {
    console.error('[templates] src/vendor/templates.json is not the pinned file: import it again, never edit it')
    process.exit(1)
  }
  if (readFileSync(at('src/vendor/index.json'), 'utf8') !== index(JSON.parse(readFileSync(at('src/vendor/templates.json'), 'utf8')))) {
    console.error('[templates] src/vendor/index.json does not come from templates.json: run with --index')
    process.exit(1)
  }
  console.log(`[templates] ${lock.version ? `v${lock.version} ` : ''}${lock.commit.slice(0, 7)}${lock.provisional ? ' (provisional: not a release)' : ''}`)
} else if (arg === '--index') {
  writeFileSync(at('src/vendor/index.json'), index(JSON.parse(readFileSync(at('src/vendor/templates.json'), 'utf8'))))
} else {
  const raw = readFileSync(arg, 'utf8')
  const b = JSON.parse(raw)
  const flag = process.argv.indexOf('--version')
  const version = flag > 0 ? process.argv[flag + 1] : null
  if (flag > 0 && !/^\d+\.\d+\.\d+$/.test(version ?? '')) throw new Error('--version needs a version such as 1.0.0')
  if (version) {
    // The peeled line (^{}) of an annotated tag is the commit it points at.
    const lines = execFileSync('git', ['ls-remote', `${b.source}.git`, `refs/tags/v${version}`, `refs/tags/v${version}^{}`], { encoding: 'utf8' }).trim().split('\n').filter(Boolean)
    const tagged = (lines.find((l) => l.endsWith('^{}')) ?? lines[0] ?? '').split('\t')[0]
    if (!tagged) throw new Error(`${b.source} has no tag v${version}`)
    if (tagged !== b.commit) throw new Error(`v${version} is ${tagged.slice(0, 7)}, the bundle was made at ${b.commit.slice(0, 7)}`)
  }
  if (b.format !== 1) throw new Error(`bundle format ${b.format}, expected 1`)
  if (b.dirty) throw new Error('the bundle was made from uncommitted templates')
  const out = {
    licence: b.licence, source: b.source, commit: b.commit, koha: b.koha,
    notices: b.notices.map((n) => ({ code: n.code, module: n.module, menu: n.menu, name: n.name, subject: n.subject, files: n.files.map((f) => ({ file: f.file, template: f.template })) })),
  }
  const text = JSON.stringify(out, null, 1) + '\n'
  writeFileSync(at('src/vendor/templates.json'), text)
  writeFileSync(at('src/vendor/index.json'), index(out))
  writeFileSync(at('templates.lock.json'), JSON.stringify({ source: b.source, version, provisional: !version, commit: b.commit, bundle_sha256: sha(raw), vendored_sha256: sha(text) }, null, 2) + '\n')
  console.log(`[templates] imported ${out.notices.length} notices at ${version ? `v${version} ` : ''}${b.commit.slice(0, 7)}`)
}
