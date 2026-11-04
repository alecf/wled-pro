import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useFakeWled } from '@/test/fake-wled/adapters/vitest'
import { renderWithController } from '@/test/renderWithController'
import type { WledFullConfig } from '@/types/wled'
import { LedHardwareScreen } from './LedHardwareScreen'

describe('LedHardwareScreen', () => {
  const device = useFakeWled()
  const led = () => (device.sim.cfg as unknown as WledFullConfig).hw.led

  const renderScreen = async () => {
    await renderWithController(device, <LedHardwareScreen onBack={() => {}} />)
    await screen.findByText('Strip 1')
  }

  it('estimates power use against the budget', async () => {
    await renderScreen()
    // 150 LEDs x 55 mA against an 850 mA budget
    expect(screen.getByText('8250 mA (971% of budget)')).toBeInTheDocument()
    expect(screen.getByText(/Estimated power exceeds budget/)).toBeInTheDocument()
  })

  it("edits a strip's LED count and keeps its other settings", async () => {
    await renderScreen()
    await userEvent.click(screen.getByText('Strip 1'))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('LED Count'), { target: { value: '120' } })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save Strip' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(led().ins[0].len).toBe(120))
    expect(led().ins[0]).toMatchObject({ start: 0, pin: [2], type: 22, order: 0 })
    expect(led()).toMatchObject({ maxpwr: 850, ledma: 55, fps: 42 })
  })

  it('adds a second strip', async () => {
    await renderScreen()
    await userEvent.click(screen.getByRole('button', { name: /Add Strip/ }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Start Index'), { target: { value: '150' } })
    fireEvent.change(within(dialog).getByLabelText('LED Count'), { target: { value: '60' } })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save Strip' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(led().ins).toHaveLength(2))
    expect(led().ins[1]).toMatchObject({ start: 150, len: 60, pin: [16] })
    expect(device.sim.info.leds.count).toBe(210)
  })

  it('removes a strip only when saved', async () => {
    await renderScreen()
    const row = screen.getByText('Strip 1').closest('[role="button"]') as HTMLElement
    await userEvent.click(within(row).getByRole('button'))
    const confirm = await screen.findByRole('dialog')
    await userEvent.click(within(confirm).getByRole('button', { name: 'Delete' }))
    expect(led().ins).toHaveLength(1)

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(led().ins).toHaveLength(0))
  })

  it('saves edits before rebooting', async () => {
    await renderScreen()
    await userEvent.click(screen.getByText('Strip 1'))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('LED Count'), { target: { value: '90' } })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save Strip' }))
    await userEvent.click(screen.getByRole('button', { name: /Save & Reboot/ }))

    await device.sim.waitForRequest('/reset')
    expect(led().ins[0].len).toBe(90)
  })

  it('reboots the device without a factory reset', async () => {
    await renderScreen()
    await userEvent.click(screen.getByRole('button', { name: /Reboot Now/ }))
    const reboot = await device.sim.waitForRequest('/reset')
    expect(String(reboot.body ?? '')).not.toContain('FR=1')
  })
})
