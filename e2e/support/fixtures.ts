/**
 * Playwright fixtures that put a fake WLED device behind the app.
 *
 * ```ts
 * import { expect, test } from './support/fixtures'
 * test('...', async ({ page, wled, device }) => {
 *   await page.goto('/')            // `device` already seeded localStorage
 *   await expect.poll(() => wled.state.bri).toBe(40)
 *   wled.applyState({ on: false })  // push an external change over WS
 * })
 * ```
 */
import { test as base, expect } from '@playwright/test'
import { FakeWled } from '../../src/test/fake-wled/FakeWled'
import { type FakeWledServer, startFakeWledServer } from './fake-wled-server'

interface WorkerFixtures {
  /** One fake device server per worker (port 0), so parallel workers stay isolated. */
  wledServer: { sim: FakeWled; server: FakeWledServer }
}

interface TestFixtures {
  /** The simulator behind the server, reset before each test. */
  wled: FakeWled
  /** Seeds localStorage so the app opens with the fake device as its controller. */
  device: { url: string; name: string }
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  wledServer: [
    // biome-ignore lint/correctness/noEmptyPattern: Playwright fixtures require object destructuring
    async ({}, use) => {
      const sim = new FakeWled({ rebootDowntimeMs: 1500 })
      const server = await startFakeWledServer({ sim })
      await use({ sim, server })
      await server.close()
    },
    { scope: 'worker' },
  ],

  wled: async ({ wledServer }, use) => {
    wledServer.sim.reset()
    await use(wledServer.sim)
  },

  device: async ({ page, wled, wledServer }, use) => {
    const controller = { name: wled.info.name, url: wledServer.server.url }
    await page.addInitScript((c) => {
      // Seed once per page so the app's own writes during the test aren't clobbered on reload.
      if (sessionStorage.getItem('fake-wled-seeded')) return
      sessionStorage.setItem('fake-wled-seeded', '1')
      localStorage.setItem(
        'wled-pro-controllers',
        JSON.stringify([{ name: c.name, url: c.url, addedAt: Date.now() }]),
      )
      localStorage.setItem('wled-pro:lastController', c.url)
    }, controller)
    await use(controller)
  },
})

export { expect }
