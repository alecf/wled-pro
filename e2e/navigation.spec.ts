import { expect, test } from './support/fixtures'

// One check per tab and per settings screen: it opens, shows the device's data, and Back works.
// Routing and the shared layout are what unit tests can't see.

test.describe('navigation against a fake WLED device', () => {
  test.beforeEach(async ({ page, device }) => {
    await page.goto('/')
    await expect(page.getByText(device.name).first()).toBeVisible()
    await expect(page.getByText('Live')).toBeVisible()
  })

  const tabs = [
    { tab: 'Shows', path: '/shows', shows: 'Warm White' },
    { tab: 'Effects', path: '/effects', shows: 'Rainbow' },
    { tab: 'Palettes', path: '/palettes', shows: 'Party' },
    { tab: 'Segments', path: '/segments', shows: 'No Segments Defined' },
    { tab: 'Info', path: '/info', shows: '0.15.0' },
  ]

  for (const { tab, path, shows } of tabs) {
    test(`the ${tab} tab opens and survives a reload`, async ({ page }) => {
      await page.getByRole('button', { name: tab, exact: true }).click()
      await expect(page).toHaveURL(new RegExp(`${path}$`))
      await expect(page.getByText(shows).first()).toBeVisible()

      await page.reload()
      await expect(page.getByText(shows).first()).toBeVisible()
    })
  }

  const settings = [
    { item: 'Sleep Timer', path: '/settings/timer', shows: 'Target Brightness' },
    { item: 'Schedules', path: '/settings/schedules', shows: 'Time-Based Schedules' },
    { item: 'Playlist', path: '/settings/playlist', shows: 'Playlist Items (2)' },
    { item: 'WiFi Setup', path: '/settings/wifi', shows: 'Network Name (SSID)' },
    { item: 'Sync', path: '/settings/sync', shows: 'Receive Colors' },
    { item: 'Time & Location', path: '/settings/time-location', shows: 'NTP Enabled' },
    { item: 'LED Hardware', path: '/settings/led-hardware', shows: 'Strip 1' },
    { item: 'Security', path: '/settings/security', shows: 'OTA Lock' },
  ]

  for (const { item, path, shows } of settings) {
    test(`${item} opens from More and goes back`, async ({ page }) => {
      await page.getByRole('button', { name: 'More', exact: true }).click()
      await page.getByText(item, { exact: true }).click()
      await expect(page).toHaveURL(new RegExp(`${path}$`))
      await expect(page.getByText(shows).first()).toBeVisible()

      await page.getByRole('button', { name: 'Back' }).click()
      await expect(page).toHaveURL(/\/shows$/)
    })
  }

  test('Back returns to the tab a settings screen was opened from', async ({ page }) => {
    await page.getByRole('button', { name: 'Effects', exact: true }).click()
    await expect(page).toHaveURL(/\/effects$/)
    await page.getByRole('button', { name: 'More', exact: true }).click()
    await page.getByText('Sync', { exact: true }).click()
    await expect(page).toHaveURL(/\/settings\/sync$/)

    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page).toHaveURL(/\/effects$/)
  })

  test('a settings change is saved to the device and still shown after a reload', async ({
    page,
    wled,
  }) => {
    await page.goto('/settings/sync')
    const row = page
      .getByText('Receive Colors')
      .locator('xpath=ancestor::*[.//button[@role="switch"]][1]')
    await row.getByRole('switch').click()
    await page.getByRole('button', { name: 'Save', exact: true }).click()

    await expect
      .poll(() => (wled.cfg as { if: { sync: { recv: { col: boolean } } } }).if.sync.recv.col)
      .toBe(false)
    await page.reload()
    await expect(row.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
  })
})
