import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // e2e/support holds fixtures and the fake WLED server, not specs.
  testIgnore: ['**/support/**'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'html',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    // The PWA service worker would otherwise cache responses between tests.
    serviceWorkers: 'block',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Allow pointing at a preinstalled Chromium (e.g. sandboxed/cloud environments)
        launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined },
      },
    },
  ],

  // The fake WLED device is started per worker by e2e/support/fixtures.ts.
  webServer: {
    command: 'bun run build && bun run preview',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
})
