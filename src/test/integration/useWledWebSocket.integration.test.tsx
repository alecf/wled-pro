import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useWledWebSocket } from '@/hooks/useWledWebSocket'
import { useFakeWled } from '@/test/fake-wled/adapters/vitest'

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
})
