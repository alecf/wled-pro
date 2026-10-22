import { describe, expect, it } from 'vitest'
import { WledApi } from '@/api/wled'
import { useFakeWled } from '@/test/fake-wled/adapters/vitest'

describe('palette data against a fake device', () => {
  const device = useFakeWled()
  const api = () => new WledApi(device.baseUrl)

  // /json/palx reports `m` as the last page index, not a page count.
  it('getAllPaletteColors returns palettes from every page', async () => {
    const all = await api().getAllPaletteColors()
    expect(Object.keys(all).sort()).toEqual(Object.keys(device.sim.palx).sort())
  })
})
