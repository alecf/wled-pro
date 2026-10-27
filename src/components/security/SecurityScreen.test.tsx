import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { useFakeWled } from '@/test/fake-wled/adapters/vitest'
import { renderWithController } from '@/test/renderWithController'
import { rowControl } from '@/test/settingsHelpers'
import type { WledFullConfig } from '@/types/wled'
import { SecurityScreen } from './SecurityScreen'

describe('SecurityScreen', () => {
  const device = useFakeWled()
  const cfg = () => device.sim.cfg as unknown as WledFullConfig

  const renderSecurity = async (onBack = () => {}) => {
    await renderWithController(device, <SecurityScreen baseUrl={device.baseUrl} onBack={onBack} />)
    await screen.findByText('OTA Lock')
  }

  it('turns on the OTA lock with a password', async () => {
    await renderSecurity()
    await userEvent.click(rowControl('OTA Lock'))
    await userEvent.type(await screen.findByLabelText('OTA Password'), 'hunter22')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(cfg().ota.lock).toBe(true))
    expect(cfg().ota).toMatchObject({ pskl: 8, aota: true, 'lock-wifi': false })
  })

  it('clears the password when the lock is turned off', async () => {
    Object.assign(cfg().ota, { lock: true, pskl: 7 })
    await renderSecurity()
    await userEvent.click(rowControl('OTA Lock'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(cfg().ota.lock).toBe(false))
    expect(cfg().ota.pskl).toBe(0)
  })

  it('only accepts .bin firmware files, then uploads them', async () => {
    await renderSecurity()
    const input = screen.getByLabelText('Firmware file')
    const upload = screen.getByRole('button', { name: 'Upload' })

    await userEvent.upload(input, new File(['x'], 'notes.txt'), { applyAccept: false })
    expect(upload).toBeDisabled()

    await userEvent.upload(input, new File(['firmware'], 'wled.bin'))
    expect(screen.getByText(/wled\.bin/)).toBeInTheDocument()
    await userEvent.click(upload)
    await device.sim.waitForRequest('/update')
  })

  it('factory resets after confirming and leaves the screen', async () => {
    const onBack = vi.fn()
    await renderSecurity(onBack)
    await userEvent.click(screen.getByText('Factory Reset'))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Factory Reset' }))

    const reset = await device.sim.waitForRequest('/reset')
    expect(reset.body).toContain('FR=1')
    await waitFor(() => expect(onBack).toHaveBeenCalled())
  })
})
