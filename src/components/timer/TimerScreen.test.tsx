import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useFakeWled } from '@/test/fake-wled/adapters/vitest'
import { renderWithController } from '@/test/renderWithController'
import { TimerScreen } from './TimerScreen'

describe('TimerScreen', () => {
  const device = useFakeWled()

  const renderTimer = () =>
    renderWithController(device, <TimerScreen baseUrl={device.baseUrl} onBack={() => {}} />)

  it('starts the sleep timer with the current settings', async () => {
    await renderTimer()
    await userEvent.click(screen.getByRole('button', { name: /Activate Now/ }))

    await device.sim.waitForState((s) => s.nl.on)
    expect(device.sim.state.nl).toMatchObject({ on: true, dur: 60, mode: 1, tbri: 0 })
  })

  it('sends a mode change without starting the timer', async () => {
    await renderTimer()
    await userEvent.click(screen.getByText('Sunrise'))

    await device.sim.waitForState((s) => s.nl.mode === 3)
    expect(device.sim.state.nl.on).toBe(false)
  })

  it('starts the timer with a duration changed just before', async () => {
    await renderTimer()
    // The first number field is the duration
    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '15' } })
    await userEvent.click(screen.getByRole('button', { name: /Activate Now/ }))

    await device.sim.waitForState((s) => s.nl.on)
    await waitFor(() => expect(device.sim.state.nl.dur).toBe(15))
  })

  it('cancels a running timer with the switch', async () => {
    device.sim.applyState({ nl: { on: true, dur: 30 } })
    await renderTimer()
    await userEvent.click(screen.getByRole('switch'))

    await device.sim.waitForState((s) => !s.nl.on)
  })
})
