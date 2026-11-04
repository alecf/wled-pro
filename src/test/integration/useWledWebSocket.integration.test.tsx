import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useWledWebSocket } from '@/hooks/useWledWebSocket'
import type { LiveFrame } from '@/lib/liveLeds'
import { useFakeWled } from '@/test/fake-wled/adapters/vitest'
import { MINIMAL_LED_COUNT } from '@/test/fake-wled/fixtures/minimal'

describe('useWledWebSocket against a fake device', () => {
  const device = useFakeWled()

  beforeEach(() => {
    // The hook logs every message; keep test output readable.
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  async function renderConnected() {
    const hook = renderHook(() => useWledWebSocket(device.baseUrl), {
      wrapper: device.wrapper(),
    })
    await waitFor(() => expect(hook.result.current.status).toBe('connected'))
    await waitFor(() => expect(hook.result.current.state).not.toBeNull())
    return hook
  }

  it('receives the initial state on connect', async () => {
    const { result } = await renderConnected()
    expect(result.current.state?.bri).toBe(128)
    expect(result.current.info?.name).toBe('Fake WLED')
    expect(device.sim.wsClientCount).toBe(1)
  })

  it('applies brightness optimistically, sends it over WS and settles on the broadcast', async () => {
    const { result } = await renderConnected()

    act(() => result.current.setBrightness(40))
    expect(result.current.state?.bri).toBe(40) // optimistic, before the device answers

    await device.sim.waitForState((s) => s.bri === 40)
    expect(device.sim.requests.at(-1)).toMatchObject({ via: 'ws', json: { bri: 40 } })
    await waitFor(() => expect(result.current.state?.bri).toBe(40))
  })

  it('coalesces rapid updates into a single WS message', async () => {
    const { result } = await renderConnected()

    act(() => {
      result.current.setBrightness(10)
      result.current.setBrightness(20)
      result.current.queueUpdate({ seg: [{ id: 1, fx: 3 }] })
      result.current.setBrightness(30)
    })

    await device.sim.waitForState((s) => s.bri === 30)
    expect(device.sim.stateUpdates()).toEqual([{ bri: 30, seg: [{ id: 1, fx: 3 }] }])
    expect(device.sim.state.seg[1].fx).toBe(3)
  })

  it('reflects changes pushed by the device (another client changed it)', async () => {
    const { result } = await renderConnected()

    act(() => device.sim.applyState({ on: false, seg: [{ id: 0, fx: 9 }] }))

    await waitFor(() => expect(result.current.state?.seg[0].fx).toBe(9))
    expect(result.current.state?.on).toBe(false)
  })

  it('toggle flips power on the device', async () => {
    const { result } = await renderConnected()
    act(() => result.current.toggle())
    await device.sim.waitForState((s) => s.on === false)
    await waitFor(() => expect(result.current.state?.on).toBe(false))
  })

  describe('live LEDs (peek)', () => {
    const red = { bri: 255, seg: [{ id: 0, col: [[255, 0, 0]], bri: 255, on: true }] }
    const liveRequests = () =>
      device.sim.requests.filter((r) => r.via === 'ws' && 'lv' in (r.json as object))

    it('streams frames over the WebSocket while subscribed', async () => {
      device.sim.applyState(red)
      const { result } = await renderConnected()
      const frames: LiveFrame[] = []
      let unsubscribe = () => {}
      act(() => {
        unsubscribe = result.current.subscribeLive((frame) => frames.push(frame))
      })
      await waitFor(() => expect(frames.length).toBeGreaterThan(0))
      expect(frames[0].width).toBe(MINIMAL_LED_COUNT)
      expect([...frames[0].rgb.slice(0, 3)]).toEqual([255, 0, 0])
      expect(liveRequests().map((r) => r.json)).toEqual([{ lv: true }])

      act(() => unsubscribe())
      await waitFor(() => expect(device.sim.isStreamingLive).toBe(false))
      expect(liveRequests().map((r) => r.json)).toEqual([{ lv: true }, { lv: false }])
    })

    it("doesn't send {lv:false} once frames stopped (another client took the stream)", async () => {
      device.sim.applyState(red)
      const { result } = await renderConnected()
      const frames: LiveFrame[] = []
      let unsubscribe = () => {}
      act(() => {
        unsubscribe = result.current.subscribeLive((frame) => frames.push(frame))
      })
      await waitFor(() => expect(frames.length).toBeGreaterThan(0))
      // {lv:false} from any client would stop the other client's stream
      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now + 5000)
      act(() => unsubscribe())
      await new Promise((r) => setTimeout(r, 50))
      expect(liveRequests().map((r) => r.json)).toEqual([{ lv: true }])
    })

    it('asks for the stream once for several subscribers', async () => {
      const { result } = await renderConnected()
      let a = () => {}
      act(() => {
        a = result.current.subscribeLive(() => {})
        result.current.subscribeLive(() => {})
      })
      await waitFor(() => expect(device.sim.isStreamingLive).toBe(true))
      act(() => a())
      await new Promise((r) => setTimeout(r, 50))
      expect(device.sim.isStreamingLive).toBe(true)
      expect(liveRequests()).toHaveLength(1)
    })

    it('asks again after reconnecting', async () => {
      const { result } = await renderConnected()
      act(() => {
        result.current.subscribeLive(() => {})
      })
      await waitFor(() => expect(device.sim.isStreamingLive).toBe(true))
      act(() => device.sim.dropWsClients())
      expect(device.sim.isStreamingLive).toBe(false)
      await waitFor(() => expect(device.sim.isStreamingLive).toBe(true), { timeout: 3000 })
    })

    it('polls /json/live when the WebSocket can not be used', async () => {
      vi.spyOn(window, 'location', 'get').mockReturnValue({
        ...window.location,
        protocol: 'https:',
      })
      device.sim.applyState(red)
      const { result } = renderHook(() => useWledWebSocket(device.baseUrl), {
        wrapper: device.wrapper(),
      })
      await waitFor(() => expect(result.current.state).not.toBeNull())
      expect(result.current.isPolling).toBe(true)
      const frames: LiveFrame[] = []
      act(() => {
        result.current.subscribeLive((frame) => frames.push(frame))
      })
      await waitFor(() => expect(frames.length).toBeGreaterThan(0))
      expect([...frames[0].rgb.slice(0, 3)]).toEqual([255, 0, 0])
      expect(device.sim.wsClientCount).toBe(0)
    })
  })
})
