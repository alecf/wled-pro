import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { useFakeWled } from '@/test/fake-wled/adapters/vitest'
import { renderWithController } from '@/test/renderWithController'
import { PresetsScreen } from './PresetsScreen'

describe('PresetsScreen', () => {
  const device = useFakeWled()

  const renderPresets = async (props: Partial<Parameters<typeof PresetsScreen>[0]> = {}) => {
    await renderWithController(device, <PresetsScreen baseUrl={device.baseUrl} {...props} />)
    await screen.findByText('Warm White')
  }

  it('lists light shows but not playlists', async () => {
    await renderPresets()
    expect(await screen.findByText('Warm White')).toBeInTheDocument()
    expect(screen.getByText('Party')).toBeInTheDocument()
    expect(screen.queryByText('Cycle')).not.toBeInTheDocument()
  })

  it('plays a light show', async () => {
    await renderPresets()
    await userEvent.click(await screen.findByRole('button', { name: 'Play Party' }))

    await device.sim.waitForState((s) => s.ps === 2)
    expect(device.sim.state.seg[0].fx).toBe(9)
  })

  it('deletes a light show after confirming', async () => {
    await renderPresets()
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Party' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(device.sim.presets['2']).toBeUndefined())
    expect(device.sim.presets['1']).toBeDefined()
    await waitFor(() => expect(screen.queryByText('Party')).not.toBeInTheDocument())
  })

  it('toggles power from the master controls', async () => {
    await renderPresets()
    await userEvent.click(screen.getByTitle('Turn off'))
    await device.sim.waitForState((s) => !s.on)
  })

  it('starts the sleep timer from the master controls', async () => {
    await renderPresets()
    await userEvent.click(screen.getByTitle('Activate sleep timer'))
    await device.sim.waitForState((s) => s.nl.on)
    expect(device.sim.state.nl.dur).toBe(60)
  })

  it('creates a new light show as one full-strip segment and opens the editor', async () => {
    const onEditCurrentState = vi.fn()
    await renderPresets({ onEditCurrentState })
    await userEvent.click(screen.getByRole('button', { name: /Create New Light Show/ }))

    await device.sim.waitForState((s) => s.seg.length === 1)
    expect(device.sim.state.seg[0]).toMatchObject({ start: 0, stop: device.sim.info.leds.count })
    expect(onEditCurrentState).toHaveBeenCalled()
  })

  it('offers to reset a corrupted presets file', async () => {
    device.server.use(
      http.get(`${device.baseUrl}/presets.json`, () => new HttpResponse('{"1":{"n":"Bro')),
    )
    await renderWithController(device, <PresetsScreen baseUrl={device.baseUrl} />)
    expect(await screen.findByText('Failed to load presets')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Reset All Presets' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reset All' }))
    await waitFor(() => expect(device.sim.presets).toEqual({}))
  })
})
