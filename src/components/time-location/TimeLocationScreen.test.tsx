import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useFakeWled } from '@/test/fake-wled/adapters/vitest'
import { renderWithController } from '@/test/renderWithController'
import { rowControl } from '@/test/settingsHelpers'
import type { WledFullConfig } from '@/types/wled'
import { TimeLocationScreen } from './TimeLocationScreen'

describe('TimeLocationScreen', () => {
  const device = useFakeWled()
  const ntp = () => (device.sim.cfg as unknown as WledFullConfig).if.ntp

  afterEach(() => vi.unstubAllGlobals())

  const renderScreen = async () => {
    await renderWithController(device, <TimeLocationScreen onBack={() => {}} />)
    await screen.findByText('NTP Enabled')
  }

  it('enables NTP with a timezone, keeping the other NTP settings', async () => {
    await renderScreen()
    await userEvent.click(rowControl('NTP Enabled'))
    await userEvent.click(await screen.findByLabelText('Timezone'))
    await userEvent.click(await screen.findByRole('option', { name: 'US Pacific (PST/PDT)' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(ntp().en).toBe(true))
    expect(ntp()).toMatchObject({ tz: 8, host: '0.wled.pool.ntp.org', offset: 0, ampm: false })
  })

  it('saves a typed location', async () => {
    await renderScreen()
    fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '47.6' } })
    fireEvent.change(screen.getByLabelText('Longitude'), { target: { value: '-122.3' } })
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(ntp().lt).toBeCloseTo(47.6))
    expect(ntp().ln).toBeCloseTo(-122.3)
  })

  it('fills the location from the browser', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: {
        getCurrentPosition: (ok: PositionCallback) =>
          ok({ coords: { latitude: 51.5, longitude: -0.1 } } as GeolocationPosition),
      },
    })
    await renderScreen()
    await userEvent.click(screen.getByText('Get Current Location'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(ntp().lt).toBe(51.5))
    expect(ntp().ln).toBe(-0.1)
  })
})
