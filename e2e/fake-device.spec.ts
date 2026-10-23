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
    // Tap the segment in the strip preview; the editor is titled with its name
    await page.getByRole('button', { name: 'Edit Right' }).click()
    await expect(page.getByRole('heading', { name: 'Right' })).toBeVisible()
    await expect(page.getByLabel('Name')).toHaveValue('Right')

    await page.getByRole('combobox').first().click()
    await page.getByRole('option', { name: 'Rainbow' }).click()

    await expect.poll(() => wled.state.seg[2].fx).toBe(wled.effects.indexOf('Rainbow'))
    expect(wled.state.seg[0].fx).toBe(0) // other segments untouched
  })

  test('playing a saved light show loads the preset', async ({ page, wled }) => {
    await page.getByRole('button', { name: 'Play Warm White', exact: true }).click()

    await expect.poll(() => wled.state.ps).toBe(1)
    expect(wled.state.bri).toBe(200)
    expect(wled.state.seg[0].col[0]).toEqual([255, 180, 100])
  })

  // The preset editor (/shows/:id) starts from the preset's stored segments, not the
  // device's current Left/Middle/Right layout. "Party" is one full-strip Rainbow
  // segment with no name of its own, so it doesn't take the device segment's name.
  test('editing a saved light show shows that preset’s segments', async ({ page }) => {
    await page.getByText('Party', { exact: true }).click()
    await expect(page.getByText('Live Preview')).toBeVisible()
    await expect(page.getByText('Middle', { exact: true })).toBeHidden({ timeout: 2000 })
    await expect(page.getByText('Right', { exact: true })).toBeHidden()
    await expect(page.getByText('0–149 (150 LEDs)')).toBeVisible({ timeout: 2000 })
  })
})
