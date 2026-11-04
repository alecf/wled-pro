import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { useFakeWled } from '@/test/fake-wled/adapters/vitest'
import { MINIMAL_LED_COUNT } from '@/test/fake-wled/fixtures/minimal'
import { renderWithController } from '@/test/renderWithController'
import { ControllerHeader } from './ControllerHeader'

describe('ControllerHeader peek', () => {
  const device = useFakeWled()
  afterEach(() => localStorage.clear())

  it('shows the live LEDs while peek is on, and remembers it', async () => {
    const { unmount } = await renderWithController(device, <ControllerHeader />)
    expect(screen.queryByRole('img', { name: 'Live LED colors' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Peek at live LEDs' }))
    await waitFor(() => expect(device.sim.isStreamingLive).toBe(true))
    const strip = screen.getByRole('img', { name: 'Live LED colors' })
    await waitFor(() => expect(strip).toHaveAttribute('data-leds', String(MINIMAL_LED_COUNT)))
    unmount()

    await renderWithController(device, <ControllerHeader />)
    const hide = screen.getByRole('button', { name: 'Hide live LEDs' })
    expect(hide).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(hide)
    await waitFor(() => expect(device.sim.isStreamingLive).toBe(false))
    expect(screen.queryByRole('img', { name: 'Live LED colors' })).not.toBeInTheDocument()
  })
})
