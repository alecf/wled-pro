/**
 * Vitest helpers: run a FakeWled behind MSW for the duration of a test file.
 *
 * ```ts
 * const device = useFakeWled()
 * it('...', async () => {
 *   const { result } = renderHook(() => useWledWebSocket(device.baseUrl), { wrapper: device.wrapper() })
 *   await device.sim.waitForState((s) => s.bri === 40)
 * })
 * ```
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { setupServer } from 'msw/node'
import type { ReactNode } from 'react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { FakeWled, type FakeWledOptions } from '../FakeWled'
import { createWledHandlers } from './msw'

export const FAKE_WLED_BASE_URL = 'http://fake-wled.local'

export interface UseFakeWledOptions extends FakeWledOptions {
  baseUrl?: string
}

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  })
}

/**
 * jsdom replaces `FormData`/`Blob`/`File` with its own classes, which Node's
 * fetch (undici) does not recognise: a jsdom FormData body is sent as the string
 * "[object FormData]". While the fake device is active, swap in Node's own
 * classes so multipart uploads (/edit, /update) are encoded properly.
 */
async function installNodeMultipartGlobals(): Promise<() => void> {
  const { Blob: NodeBlob, File: NodeFile } = await import('node:buffer')
  // Node does not export FormData from a module; take it from a parsed Response.
  const probe = new Response('a=1', {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  const NodeFormData = (await probe.formData()).constructor
  const g = globalThis as Record<string, unknown>
  const saved = { FormData: g.FormData, Blob: g.Blob, File: g.File }
  Object.assign(g, { FormData: NodeFormData, Blob: NodeBlob, File: NodeFile })
  return () => Object.assign(g, saved)
}

/**
 * Registers beforeAll/afterEach/afterAll hooks that start MSW with a FakeWled,
 * reset it between tests and shut it down afterwards. Unhandled requests error.
 */
export function useFakeWled(options: UseFakeWledOptions = {}) {
  const { baseUrl = FAKE_WLED_BASE_URL, ...simOptions } = options
  const sim = new FakeWled(simOptions)
  const server = setupServer(...createWledHandlers(sim, { baseUrl }))

  let restoreGlobals: (() => void) | undefined
  beforeAll(async () => {
    restoreGlobals = await installNodeMultipartGlobals()
    server.listen({ onUnhandledFrame: 'error' })
  })
  afterEach(() => {
    server.resetHandlers()
    sim.reset()
  })
  afterAll(() => {
    server.close()
    restoreGlobals?.()
  })

  return {
    sim,
    server,
    baseUrl,
    /** A fresh QueryClient + provider wrapper for renderHook/render. */
    wrapper(queryClient: QueryClient = createTestQueryClient()) {
      // biome-ignore lint/correctness/noComponentHookFactories: renderHook/render wrapper bound to one QueryClient; created once per test
      return function FakeWledWrapper({ children }: { children: ReactNode }) {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      }
    },
  }
}
