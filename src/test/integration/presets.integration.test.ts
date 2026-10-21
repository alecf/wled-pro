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
    await api().setEffect(0, 7)
    await api().savePreset(5, 'Evening', { quickLabel: 'EV' })

    const saved = (await api().getPresets())['5'] as WledPreset
    expect(saved).toMatchObject({ n: 'Evening', ql: 'EV' })
    expect(saved.seg?.[0]).toMatchObject({ id: 0, fx: 7 })
    expect(device.sim.state.ps).toBe(5)

    await api().setEffect(0, 2)
    expect(device.sim.state.ps).toBe(-1)

    await api().loadPreset(5)
    expect(device.sim.state.ps).toBe(5)
    expect(device.sim.state.seg[0].fx).toBe(7)

    await api().deletePreset(5)
    expect((await api().getPresets())['5']).toBeUndefined()
  })

  it('loading a playlist preset starts the playlist; stopPlaylist stops it', async () => {
    await api().loadPreset(3)
    expect(device.sim.state.pl).toBe(3)
    await api().stopPlaylist()
    expect(device.sim.state.pl).toBe(-1)
  })

  // BUG: savePlaylist posts `{playlist}` without `psave`, which WLED treats as
  // "start this playlist now" (docs/wled-api/presets.md, "Starting a Playlist"),
  // so nothing is persisted. startPlaylist then sends `{pl: 1}`, but `pl` is
  // read-only in WLED (only `pl: -1` stops), so it does not start anything.
  it.fails('savePlaylist persists the playlist and startPlaylist starts it', async () => {
    const playlist = { ps: [2, 1], dur: [50, 50] }
    await api().savePlaylist(playlist)
    expect(Object.values(device.sim.presets)).toContainEqual(expect.objectContaining({ playlist }))
    expect(device.sim.state.pl).toBe(-1)
    await api().startPlaylist(1)
    expect(device.sim.state.pl).toBeGreaterThan(0)
  })

  // BUG: WledApi.savePreset accepts includeBrightness / saveSegmentBounds but never
  // sends `ib` / `sb`. WLED only stores brightness and segment bounds when those
  // flags are set, so saved presets lose their segment layout and brightness.
  it.fails('savePreset honours saveSegmentBounds and includeBrightness', async () => {
    await api().savePreset(6, 'Layout', { saveSegmentBounds: true, includeBrightness: true })
    const saved = device.sim.presets['6'] as WledPreset
    expect(saved.bri).toBe(128)
    expect(saved.seg?.[2]).toMatchObject({ start: 100, stop: 150 })
  })

  // BUG: setState()/savePreset() are typed as returning WledState, but WLED answers
  // POST /json/state with {"success":true} unless the body has `v: true`.
  it.fails('setState resolves with the new device state', async () => {
    const result = await api().setBrightness(10)
    expect(result.bri).toBe(10)
  })
})
