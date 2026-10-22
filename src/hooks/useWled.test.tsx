import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useLedHardwareConfig, useNtpConfig, useWledTimers } from './useWled'

const config = {
  hw: { led: { total: 30 } },
  timers: { ins: [] },
  if: { ntp: { en: true, host: 'pool.ntp.org' } },
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('config section hooks', () => {
  it('share a single /json/cfg request', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(config)))
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = new QueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(
      () => ({
        led: useLedHardwareConfig('http://wled.test'),
        timers: useWledTimers('http://wled.test'),
        ntp: useNtpConfig('http://wled.test'),
      }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.ntp.data).toBeDefined())
    expect(result.current.led.data).toEqual(config.hw.led)
    expect(result.current.timers.data).toEqual(config.timers)
    expect(result.current.ntp.data).toEqual(config.if.ntp)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
