import { describe, expect, it } from 'vitest'
import { WledApi, WledApiError } from '@/api/wled'
import { useFakeWled } from '@/test/fake-wled/adapters/vitest'

const FILE = '/wled-pro-segments.json'

describe('segment file storage against a fake device', () => {
  const device = useFakeWled()
  const api = () => new WledApi(device.baseUrl)

  it('reads null when the file does not exist', async () => {
    await expect(api().readJsonFile(FILE)).resolves.toBeNull()
  })

  it('writes through multipart /edit and reads back the same data', async () => {
    const data = {
      version: 1,
      segments: [{ id: 'a', start: 0, stop: 50, name: 'Kitchen' }],
      groups: [],
    }
    await api().writeJsonFile(FILE, data)

    const upload = await device.sim.waitForRequest('/edit')
    expect(upload.method).toBe('POST')
    expect(upload.body).toMatchObject({ files: [{ field: 'data', filename: FILE }] })
    expect(JSON.parse(device.sim.files.get(FILE) ?? 'null')).toEqual(data)

    await expect(api().readJsonFile(FILE)).resolves.toEqual(data)
  })

  it('surfaces a failed write and succeeds on retry', async () => {
    device.sim.fail('/edit', { status: 500, times: 1 })
    await expect(api().writeJsonFile(FILE, { a: 1 })).rejects.toBeInstanceOf(WledApiError)
    expect(device.sim.files.has(FILE)).toBe(false)

    await api().writeJsonFile(FILE, { a: 1 })
    await expect(api().readJsonFile(FILE)).resolves.toEqual({ a: 1 })
  })

  it('throws (rather than returning null) when the device is unreachable', async () => {
    device.sim.goOffline()
    await expect(api().readJsonFile(FILE)).rejects.toThrow()
  })

  it('resetAllPresets uploads an empty /presets.json', async () => {
    await api().resetAllPresets()
    expect(device.sim.presets).toEqual({})
    await expect(api().getPresets()).resolves.toEqual({})
  })
})
