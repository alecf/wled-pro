/**
 * Captures the screenshots used by README.md and the GitHub Pages site (site/),
 * at an iPhone-sized viewport against the fake WLED device.
 *
 *   bun run screenshots
 *
 * Writes PNGs to docs/screenshots/. See playwright.screenshots.config.ts.
 */
import type { Page } from '@playwright/test'
import { expect, test } from '../e2e/support/fixtures'

const OUT = 'docs/screenshots'

async function shot(page: Page, name: string) {
  // Let sheet/slider animations settle before capturing.
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${OUT}/${name}.png` })
}

type Rgb = [number, number, number]

/** A segment's three color slots; unused slots are black. */
const col = (...colors: Rgb[]): Rgb[] => [...colors, [0, 0, 0] as Rgb, [0, 0, 0] as Rgb].slice(0, 3)

test.beforeEach(async ({ page, wled, device: _ }) => {
  // A friendlier device than the test fixture: a name, a few more light shows and
  // a saved global segment layout.
  wled.info.name = 'Living Room'
  wled.presets['4'] = {
    n: 'Sunset',
    ql: 'S',
    on: true,
    bri: 180,
    mainseg: 0,
    seg: [
      { id: 0, start: 0, stop: 75, fx: 2, col: col([255, 94, 58], [255, 42, 104]) },
      { id: 1, start: 75, stop: 150, fx: 2, col: col([255, 149, 0], [180, 40, 160]) },
    ],
  }
  wled.presets['5'] = {
    n: 'Holiday',
    on: true,
    bri: 220,
    mainseg: 0,
    seg: [
      { id: 0, start: 0, stop: 50, fx: 1, col: col([220, 20, 40]) },
      { id: 1, start: 50, stop: 100, fx: 0, col: col([255, 255, 255]) },
      { id: 2, start: 100, stop: 150, fx: 1, col: col([20, 160, 60]) },
    ],
  }
  wled.presets['6'] = {
    n: 'Movie Night',
    ql: 'M',
    on: true,
    bri: 40,
    mainseg: 0,
    seg: [{ id: 0, start: 0, stop: 150, fx: 0, col: col([60, 40, 200]) }],
  }
  wled.files.set(
    '/wled-pro-segments.json',
    JSON.stringify({
      version: 1,
      lastModified: Date.now(),
      groups: [{ id: 'g1', name: 'Living Room' }],
      segments: [
        { id: 's1', start: 0, stop: 50, name: 'Couch', groupId: 'g1' },
        { id: 's2', start: 50, stop: 100, name: 'TV Wall', groupId: 'g1' },
        { id: 's3', start: 100, stop: 150, name: 'Window' },
      ],
    }),
  )
  await page.goto('/')
  await expect(page.getByText('Live')).toBeVisible()
})

test('light shows and the show editor', async ({ page }) => {
  await expect(page.getByText('Movie Night')).toBeVisible()
  await shot(page, 'shows')
  await page.getByText('Current State', { exact: true }).click()
  await shot(page, 'show-editor')
  await page.getByRole('button', { name: 'Edit Middle' }).click()
  await shot(page, 'segment-editor')
})

for (const tab of ['Effects', 'Palettes', 'Segments', 'Info']) {
  test(`${tab} tab`, async ({ page }) => {
    await page.getByRole('button', { name: tab }).last().click()
    await shot(page, tab.toLowerCase())
  })
}

test('dark theme', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('wled-pro:theme', 'dark'))
  await page.reload()
  await expect(page.getByText('Movie Night')).toBeVisible()
  await shot(page, 'shows-dark')
})
