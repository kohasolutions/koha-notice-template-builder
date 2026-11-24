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
  Includes React (MIT, (c) Meta Platforms, Inc. and affiliates): https://react.dev/
-->\n`

export default defineConfig({
  plugins: [react(), viteSingleFile(), { name: 'licence', enforce: 'post', generateBundle(_o, bundle) {
    for (const f of Object.values(bundle)) if (f.type === 'asset' && f.fileName.endsWith('.html')) f.source = String(f.source).replace('<head>', `<head>\n${NOTICE}`)
  } }],
  build: { modulePreload: false, license: false },
  test: { include: ['tests/**/*.test.ts'] },
})
