import { describe, expect, it } from 'vitest'
import { WledApi } from '@/api/wled'
import { useFakeWled } from '@/test/fake-wled/adapters/vitest'

describe('palette data against a fake device', () => {
  const device = useFakeWled()
  const api = () => new WledApi(device.baseUrl)

  // BUG: /json/palx reports `m` as the last page index (WLED's own UI loops
  // `while page < m`), but getAllPaletteColors treats it as a page count, so the
  // final page of palettes is never fetched.
  it.fails('getAllPaletteColors returns palettes from every page', async () => {
    const all = await api().getAllPaletteColors()
    expect(Object.keys(all).sort()).toEqual(Object.keys(device.sim.palx).sort())
  })
})
