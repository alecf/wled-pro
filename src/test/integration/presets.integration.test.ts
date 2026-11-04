import { describe, expect, it } from 'vitest'
import { WledApi } from '@/api/wled'
import { useFakeWled } from '@/test/fake-wled/adapters/vitest'
import type { WledPreset } from '@/types/wled'

describe('presets lifecycle against a fake device', () => {
  const device = useFakeWled()
  const api = () => new WledApi(device.baseUrl)

  it('lists the presets stored on the device', async () => {
    const presets = await api().getPresets()
    expect((presets['1'] as WledPreset).n).toBe('Warm White')
    expect(presets['3']).toHaveProperty('playlist')
  })

  it('save -> list -> change -> load restores the saved effect -> delete', async () => {
    await api().setState({ seg: [{ id: 0, fx: 7 }] })
    await api().savePreset(5, 'Evening', { quickLabel: 'EV' })

    const saved = (await api().getPresets())['5'] as WledPreset
    expect(saved).toMatchObject({ n: 'Evening', ql: 'EV' })
    expect(saved.seg?.[0]).toMatchObject({ id: 0, fx: 7 })
    expect(device.sim.state.ps).toBe(5)

    await api().setState({ seg: [{ id: 0, fx: 2 }] })
    expect(device.sim.state.ps).toBe(-1)

    await api().setState({ ps: 5 })
    expect(device.sim.state.ps).toBe(5)
    expect(device.sim.state.seg[0].fx).toBe(7)

    await api().deletePreset(5)
    expect((await api().getPresets())['5']).toBeUndefined()
  })

  it('loading a playlist preset starts the playlist; pl: -1 stops it', async () => {
    await api().setState({ ps: 3 })
    expect(device.sim.state.pl).toBe(3)
    await api().setState({ pl: -1 })
    expect(device.sim.state.pl).toBe(-1)
  })

  // WLED only persists a playlist sent with `psave`; without it the request starts
  // the playlist immediately (docs/wled-api/presets.md). Saved playlists are started
  // by loading their preset (`ps`), since `pl` only accepts -1 (stop).
  it('savePlaylist persists the playlist and loading its preset starts it', async () => {
    const playlist = { ps: [2, 1], dur: [50, 50] }
    await api().savePlaylist(7, 'Loop', playlist)
    expect(device.sim.presets['7']).toMatchObject({ n: 'Loop', playlist })
    expect(device.sim.state.pl).toBe(-1)
    await api().setState({ ps: 7 })
    expect(device.sim.state.pl).toBe(7)
  })

  // WLED only stores brightness and segment bounds when `ib` / `sb` are set.
  it('savePreset stores brightness and segment bounds', async () => {
    await api().savePreset(6, 'Layout')
    const saved = device.sim.presets['6'] as WledPreset
    expect(saved.bri).toBe(128)
    expect(saved.seg?.[2]).toMatchObject({ start: 100, stop: 150 })
  })

  it('setState applies the update on the device', async () => {
    await api().setState({ bri: 10 })
    expect(device.sim.state.bri).toBe(10)
  })
})
