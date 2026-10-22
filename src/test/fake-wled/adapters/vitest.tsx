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
 * jsdom has its own `FormData`/`Blob`/`File` classes, which Node's fetch (undici)
 * cannot encode. Vitest converts them for `fetch`/`Request`, but drops the
 * filename of each file part, and WLED's `/edit` uses that filename as the
 * target path. Wrap `fetch` (outside MSW's interceptor) so jsdom multipart
 * bodies are rebuilt as Node `FormData` with filenames kept.
 */
async function installMultipartFetchShim(): Promise<() => void> {
  const { File: NodeFile } = await import('node:buffer')
  // Node does not export FormData from a module; take it from a parsed Response.
  const probe = new Response('a=1', {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  const NodeFormData = (await probe.formData()).constructor as typeof FormData
  const JsdomFormData = globalThis.FormData
  const originalFetch = globalThis.fetch

  globalThis.fetch = async (input, init) => {
    const form = init?.body
    if (form instanceof JsdomFormData && JsdomFormData !== NodeFormData) {
      const body = new NodeFormData()
      for (const [key, value] of form.entries()) {
        if (typeof value === 'string') {
          body.append(key, value)
        } else {
          const bytes = await value.arrayBuffer()
          body.append(key, new NodeFile([bytes], value.name, { type: value.type }) as File)
        }
      }
      init = { ...init, body }
    }
    return originalFetch(input, init)
  }
  return () => {
    globalThis.fetch = originalFetch
  }
}

/**
 * Registers beforeAll/afterEach/afterAll hooks that start MSW with a FakeWled,
 * reset it between tests and shut it down afterwards. Unhandled requests error.
 */
export function useFakeWled(options: UseFakeWledOptions = {}) {
  const { baseUrl = FAKE_WLED_BASE_URL, ...simOptions } = options
  const sim = new FakeWled(simOptions)
  const server = setupServer(...createWledHandlers(sim, { baseUrl }))

  let restoreFetch: (() => void) | undefined
  beforeAll(async () => {
    server.listen({ onUnhandledFrame: 'error' })
    // After listen, so the shim wraps MSW's patched fetch.
    restoreFetch = await installMultipartFetchShim()
  })
  afterEach(() => {
    server.resetHandlers()
    sim.reset()
  })
  afterAll(() => {
    restoreFetch?.()
    server.close()
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
