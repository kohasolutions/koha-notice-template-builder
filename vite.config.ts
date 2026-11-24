import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { defineConfig } from 'vitest/config'

// One HTML file with everything inside: it must open from a disk with no network.
// The page carries its licence and the templates' source, because the file travels on its own.
const NOTICE = `<!--
  Live notice template builder for Koha, by Koha Solutions. GPL-3.0-or-later.
  Source: https://github.com/kohasolutions/koha-notice-template-builder
  The notices inside come from https://github.com/kohasolutions/koha-notice-templates (GPL-3.0-or-later),
  adapted from Koha's own notices: https://koha-community.org/
  It includes other people's open-source code; their licences are at the end of this file.
-->\n`

/** The package a bundled file belongs to, from its path in node_modules. */
function packageDir(id: string): string | null {
  const at = id.lastIndexOf('/node_modules/')
  if (at < 0) return null
  const rest = id.slice(at + '/node_modules/'.length).split('/')
  const name = rest[0]?.startsWith('@') ? rest.slice(0, 2).join('/') : rest[0]
  return name ? join(id.slice(0, at), 'node_modules', name) : null
}
/** Every bundled package's name, version, licence and licence text, as one HTML comment. */
function notices(ids: Iterable<string>): string {
  const dirs = [...new Set([...ids].map((i) => packageDir(i.replace(/^\0/, '').split('?')[0] ?? '')).filter((d): d is string => d !== null))].sort()
  const parts = dirs.map((d) => {
    const pkg = JSON.parse(readFileSync(join(d, 'package.json'), 'utf8')) as { name: string; version: string; license?: string }
    const file = existsSync(d) ? readdirSync(d).find((f) => /^(licen[cs]e|copying)(\.|$)/i.test(f)) : undefined
    if (!file) throw new Error(`${pkg.name} is bundled but has no licence file`)
    return `${pkg.name} ${pkg.version} (${pkg.license ?? 'see below'})\n\n${readFileSync(join(d, file), 'utf8').trim()}`
  })
  return `\n<!--\nThird-party licences\n\n${parts.join('\n\n----\n\n').replaceAll('-->', '-- >')}\n-->\n`
}

const version = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version
/** The script for a page (vite build --mode embed): the licences are a comment at its end, the source is named at its start. */
const embed = defineConfig({
  plugins: [react(), { name: 'licence', enforce: 'post', generateBundle(_o, bundle) {
    for (const f of Object.values(bundle)) if (f.type === 'chunk') f.code = `/*!\n${NOTICE.replace('<!--', '').replace('-->', '').trim()}\n*/\n${f.code}\n/*!${notices(f.moduleIds).replace('<!--', '').replace('-->', '').replaceAll('*/', '* /')}*/\n`
  } }],
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: { outDir: 'dist/embed', emptyOutDir: true, license: false, lib: { entry: 'src/embed.tsx', formats: ['iife'], name: 'KohaNoticeBuilderBundle', fileName: () => `koha-notice-builder-${version}.js` } },
})
const page = defineConfig({
  plugins: [react(), viteSingleFile(), { name: 'licence', enforce: 'post', generateBundle(_o, bundle) {
    const ids = Object.values(bundle).flatMap((f) => (f.type === 'chunk' ? f.moduleIds : []))
    for (const f of Object.values(bundle)) if (f.type === 'asset' && f.fileName.endsWith('.html')) f.source = String(f.source).replace('<head>', `<head>\n${NOTICE}`) + notices(ids)
  } }],
  build: { modulePreload: false, license: false },
  test: { include: ['tests/**/*.test.ts'] },
})

export default defineConfig(({ mode }) => (mode === 'embed' ? embed : page))
