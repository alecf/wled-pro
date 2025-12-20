import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WledApi, WledApiError } from './wled'

describe('WledApi', () => {
  let api: WledApi

  beforeEach(() => {
    api = new WledApi('http://192.168.1.100')
    vi.resetAllMocks()
  })

  describe('getFullState', () => {
    it('fetches full state from /json endpoint', async () => {
      const mockResponse = {
        state: { on: true, bri: 128 },
        info: { ver: '0.14.0' },
      }

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      } as unknown as Response)

      const result = await api.getFullState()

      expect(fetch).toHaveBeenCalledWith(
        'http://192.168.1.100/json',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      )
      expect(result).toEqual(mockResponse)
    })

    it('throws WledApiError on failure', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response)

      await expect(api.getFullState()).rejects.toThrow(WledApiError)
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
        })
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
        })
      )

      await api.setBrightness(-50)

      expect(fetch).toHaveBeenLastCalledWith(
        'http://192.168.1.100/json/state',
        expect.objectContaining({
          body: JSON.stringify({ bri: 0 }),
        })
      )
    })
  })
})
