import { defineConfig, devices } from '@playwright/test'
import baseConfig from './playwright.config'

/**
 * Captures the README / landing page screenshots against the fake WLED device:
 *
 *   bun run screenshots
 *
 * Writes PNGs to docs/screenshots/. Not part of `bun run test:e2e`.
 */
export default defineConfig({
  ...baseConfig,
  testDir: './screenshots',
  testIgnore: [],
  retries: 0,
  reporter: 'list',
  // Always build and serve the current code: a preview server left running from an
  // earlier build would capture an old UI.
  webServer: {
    command: 'bun run build && bun run preview',
    port: 4173,
    reuseExistingServer: false,
  },
  projects: [
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 15 Pro'],
        // Run in Chromium (the only browser installed in CI/cloud), with the iPhone viewport.
        browserName: 'chromium',
        // 2x keeps the PNGs small enough for the README while staying sharp.
        deviceScaleFactor: 2,
        launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined },
      },
    },
  ],
})
