import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useFakeWled } from '@/test/fake-wled/adapters/vitest'
import { renderWithController } from '@/test/renderWithController'
import type { WledPreset } from '@/types/wled'
import { PlaylistScreen } from './PlaylistScreen'

/** Buttons of playlist row `index`: [move up, move down, remove] */
const rowButtons = (index: number) => {
  const row = screen.getByText(`${index + 1}.`).parentElement as HTMLElement
  return within(row).getAllByRole('button')
}

const savedPlaylist = (presets: Record<string, unknown>, id: string) =>
  (presets[id] as WledPreset | undefined)?.playlist

describe('PlaylistScreen', () => {
  const device = useFakeWled()

  const renderPlaylist = async () => {
    await renderWithController(
      device,
      <PlaylistScreen baseUrl={device.baseUrl} onBack={() => {}} />,
    )
    await screen.findByText('Play Playlist')
  }

  it('loads the saved playlist', async () => {
    await renderPlaylist()
    expect(screen.getByText('Playlist Items (2)')).toBeInTheDocument()
    expect(screen.getByText('1.').parentElement).toHaveTextContent('Warm White')
    expect(screen.getByText('2.').parentElement).toHaveTextContent('Party')
    // Durations are stored in tenths of a second and shown in seconds
    expect(screen.getAllByRole('spinbutton')[0]).toHaveValue(10)
  })

  it('saves reordered items and edited durations into the same preset slot', async () => {
    await renderPlaylist()
    await userEvent.click(rowButtons(0)[1]) // move Warm White down
    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '15' } }) // Party
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(savedPlaylist(device.sim.presets, '3')?.ps).toEqual([2, 1]))
    expect(savedPlaylist(device.sim.presets, '3')).toMatchObject({
      dur: [150, 100],
      transition: [7, 7],
      repeat: 0,
      end: 0,
    })
    expect((device.sim.presets['3'] as WledPreset).n).toBe('Cycle')
    // The light shows themselves are untouched
    expect((device.sim.presets['1'] as WledPreset).n).toBe('Warm White')
  })

  it('saves unsaved changes before playing', async () => {
    await renderPlaylist()
    await userEvent.click(rowButtons(1)[2]) // remove Party
    await userEvent.click(screen.getByRole('button', { name: /Play Playlist/ }))

    await waitFor(() => expect(savedPlaylist(device.sim.presets, '3')?.ps).toEqual([1]))
    await device.sim.waitForState((s) => s.pl === 3)
  })

  it('creates a playlist in a free preset slot', async () => {
    delete device.sim.presets['3']
    await renderPlaylist()
    expect(screen.getByText('Empty Playlist')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Add Preset/ }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByText('Party'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(savedPlaylist(device.sim.presets, '3')?.ps).toEqual([2]))
  })

  it('stops a running playlist', async () => {
    device.sim.applyState({ ps: 3 })
    await device.sim.waitForState((s) => s.pl === 3)
    await renderWithController(
      device,
      <PlaylistScreen baseUrl={device.baseUrl} onBack={() => {}} />,
    )
    await userEvent.click(await screen.findByRole('button', { name: /Stop Playlist/ }))

    await device.sim.waitForState((s) => s.pl === -1)
  })
})
