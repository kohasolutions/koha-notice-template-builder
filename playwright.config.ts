import { defineConfig, devices } from '@playwright/test'

// The built file, opened from the disk: run `npm run build` first.
export default defineConfig({
  testDir: 'e2e', outputDir: 'out/e2e', forbidOnly: !!process.env.CI, retries: 0, reporter: 'list',
  use: { ...devices['Desktop Chrome'], viewport: { width: 1400, height: 1000 } },
})
