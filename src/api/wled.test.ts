import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WledApi, WledApiError } from './wled'

describe('WledApi', () => {
  let api: WledApi

  beforeEach(() => {
    api = new WledApi('http://192.168.1.100')
    vi.resetAllMocks()
  })

  describe('getStateInfo', () => {
    it('fetches state and info from /json/si', async () => {
      const mockResponse = {
        state: { on: true, bri: 128 },
        info: { ver: '0.14.0' },
      }

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      } as unknown as Response)

      const result = await api.getStateInfo()

      expect(fetch).toHaveBeenCalledWith(
        'http://192.168.1.100/json/si',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      expect(result).toEqual(mockResponse)
    })

    it('throws WledApiError on failure', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response)

      await expect(api.getStateInfo()).rejects.toThrow(WledApiError)
    })
  })

  describe('setState', () => {
    it('sends POST request with state update', async () => {
      const mockResponse = { on: true, bri: 200 }

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      } as unknown as Response)

      await api.setState({ bri: 200 })

      expect(fetch).toHaveBeenCalledWith(
        'http://192.168.1.100/json/state',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ bri: 200 }),
        }),
      )
    })
  })

  describe('setBrightness', () => {
    it('clamps brightness to valid range', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ bri: 255 })),
      } as unknown as Response)

      await api.setBrightness(300)

      expect(fetch).toHaveBeenCalledWith(
        'http://192.168.1.100/json/state',
        expect.objectContaining({
          body: JSON.stringify({ bri: 255 }),
        }),
      )

      await api.setBrightness(-50)

      expect(fetch).toHaveBeenLastCalledWith(
        'http://192.168.1.100/json/state',
        expect.objectContaining({
          body: JSON.stringify({ bri: 0 }),
        }),
      )
    })
  })

  describe('presets and playlists', () => {
    const mockOk = () =>
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('{"success":true}'),
      } as unknown as Response)
    const lastBody = () => JSON.parse(String(vi.mocked(fetch).mock.lastCall?.[1]?.body))

    it('saves a preset with its state, brightness and segment bounds', async () => {
      mockOk()
      await api.savePreset(3, 'Sunset', { state: { seg: [{ id: 0, start: 0, stop: 10 }] } })
      expect(lastBody()).toEqual({
        seg: [{ id: 0, start: 0, stop: 10 }],
        psave: 3,
        n: 'Sunset',
        ib: true,
        sb: true,
      })
    })

    it('saves a playlist into a preset slot', async () => {
      mockOk()
      const playlist = { ps: [1, 2], dur: [100, 100], transition: [7, 7], repeat: 0, end: 0 }
      await api.savePlaylist(5, 'Evening', playlist)
      expect(lastBody()).toEqual({ psave: 5, n: 'Evening', on: true, o: true, playlist })
    })

    it('starts a saved playlist by loading its preset', async () => {
      mockOk()
      await api.startPlaylist(5)
      expect(lastBody()).toEqual({ ps: 5 })
    })
  })

  describe('getAllPaletteColors', () => {
    it('fetches pages 0 through m, since m is the last page index', async () => {
      // Real WLED: m is maxPage and out-of-range pages clamp to it
      const pages = [
        { m: 2, p: { '0': ['c1'] } },
        { m: 2, p: { '8': ['c2'] } },
        { m: 2, p: { '16': ['c3'] } },
      ]
      vi.spyOn(global, 'fetch').mockImplementation((input) => {
        const page = Number(new URL(String(input)).searchParams.get('page') ?? 0)
        const body = pages[Math.min(page, pages.length - 1)]
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(JSON.stringify(body)),
        } as unknown as Response)
      })

      const colors = await api.getAllPaletteColors()

      expect(Object.keys(colors).sort()).toEqual(['0', '16', '8'])
      expect(fetch).toHaveBeenCalledTimes(3)
    })
  })
})
