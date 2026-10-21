import { expect, test } from './support/fixtures'

test.describe('app against a fake WLED device', () => {
  test.beforeEach(async ({ page, device }) => {
    await page.goto('/')
    await expect(page.getByText(device.name).first()).toBeVisible()
    await expect(page.getByText('Live')).toBeVisible() // WebSocket connected
  })

  test('brightness slider drives the device and follows external changes', async ({
    page,
    wled,
  }) => {
    await expect(page.getByText('50%')).toBeVisible()

    const slider = page.getByRole('slider').first()
    await slider.focus()
    await page.keyboard.press('End')

    await expect.poll(() => wled.state.bri).toBe(255)
    await expect(page.getByText('100%')).toBeVisible()

    // Another client changes the brightness: the WS broadcast updates the UI.
    wled.applyState({ bri: 51 })
    await expect(page.getByText('20%')).toBeVisible()
  })

  test('changing a segment effect in the editor updates the device', async ({ page, wled }) => {
    await page.getByText('Current State', { exact: true }).click()
    await page.getByText('Right', { exact: true }).click()
    await expect(page.getByText('Segment 3')).toBeVisible()

    await page.getByRole('combobox').first().click()
    await page.getByRole('option', { name: 'Rainbow' }).click()

    await expect.poll(() => wled.state.seg[2].fx).toBe(wled.effects.indexOf('Rainbow'))
    expect(wled.state.seg[0].fx).toBe(0) // other segments untouched
  })

  test('playing a saved light show loads the preset', async ({ page, wled }) => {
    // The play button is the only unlabeled button in the preset's row.
    const row = page
      .getByText('Warm White', { exact: true })
      .locator('xpath=ancestor::*[.//button[not(normalize-space())]][1]')
    await row.getByRole('button').filter({ hasNotText: /\S/ }).click()

    await expect.poll(() => wled.state.ps).toBe(1)
    expect(wled.state.bri).toBe(200)
    expect(wled.state.seg[0].col[0]).toEqual([255, 180, 100])
  })

  // BUG: the preset editor (/shows/:id) initialises from the device's *current*
  // segments instead of the preset's contents. "Party" is one full-strip Rainbow
  // segment, but the editor shows the current Left/Middle/Right layout.
  test('editing a saved light show shows that preset’s segments', async ({ page }) => {
    test.fail()
    await page.getByText('Party', { exact: true }).click()
    await expect(page.getByText('Live Preview')).toBeVisible()
    await expect(page.getByText('Left', { exact: true })).toBeHidden({ timeout: 2000 })
    await expect(page.getByText('0–149 (150 LEDs)')).toBeVisible({ timeout: 2000 })
  })
})
