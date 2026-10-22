import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiActivityProvider } from '@/contexts/ApiActivityContext'
import { ControllerContext } from '@/contexts/ControllerContext'
import { getQueryKeys } from '@/hooks/useQueryKeys'
import type { useWledWebSocket } from '@/hooks/useWledWebSocket'
import { toSegment } from '@/lib/segmentUtils'
import type { WledInfo, WledState } from '@/types/wled'
import { LightShowEditorScreen } from './LightShowEditorScreen'

const BASE_URL = 'http://wled.test'

const deviceState = {
  on: true,
  bri: 128,
  transition: 7,
  ps: -1,
  pl: -1,
  nl: { on: false, dur: 60, mode: 1, tbri: 0, rem: -1 },
  udpn: { send: false, recv: true, sgrp: 1, rgrp: 1 },
  lor: 0,
  mainseg: 0,
  seg: [toSegment({ id: 0, start: 0, stop: 100, fx: 9 }, 0)],
} as WledState

const deviceInfo = { name: 'Test', ver: '0.15.0', leds: { count: 100 } } as WledInfo

/** POST bodies sent to /json/state */
let statePosts: Record<string, unknown>[]
/** Number of upcoming /json/state POSTs that fail with a 500 */
let failingStatePosts: number

beforeEach(() => {
  statePosts = []
  failingStatePosts = 0
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/json/state') && init?.method === 'POST') {
        statePosts.push(JSON.parse(String(init.body)))
        if (failingStatePosts > 0) {
          failingStatePosts--
          return new Response('', { status: 500 })
        }
        return new Response(JSON.stringify({ success: true }))
      }
      return new Response('', { status: 404 })
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderEditor(props: { mode: 'current' | 'preset'; presetId?: number }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const keys = getQueryKeys(BASE_URL)
  queryClient.setQueryData(keys.presets, {
    '0': {},
    '1': {
      n: 'Sunset',
      ql: 'S',
      bri: 40,
      seg: [
        { id: 0, start: 0, stop: 40 },
        { id: 1, start: 40, stop: 100 },
      ],
    },
  })
  queryClient.setQueryData(keys.effects, ['Solid'])
  queryClient.setQueryData(keys.effectData, [''])
  queryClient.setQueryData(keys.palettesWithColors, [])

  const queueUpdate = vi.fn()
  const connection = {
    status: 'connected',
    isConnected: true,
    isPolling: false,
    state: deviceState,
    info: deviceInfo,
    queueUpdate,
    flushUpdates: vi.fn(),
    toggle: vi.fn(),
    setBrightness: vi.fn(),
    setOn: vi.fn(),
  } satisfies ReturnType<typeof useWledWebSocket>
  const onClose = vi.fn()

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ApiActivityProvider>
        <ControllerContext.Provider
          value={{
            ...connection,
            controller: { url: BASE_URL, name: 'Test', addedAt: 0 },
            onOpenControllerPicker: () => {},
          }}
        >
          {children}
        </ControllerContext.Provider>
      </ApiActivityProvider>
    </QueryClientProvider>
  )

  render(
    <LightShowEditorScreen
      baseUrl={BASE_URL}
      controllerId={BASE_URL}
      onClose={onClose}
      {...props}
    />,
    { wrapper },
  )
  return { queueUpdate, onClose }
}

describe('LightShowEditorScreen', () => {
  it('edits a preset from its stored segments, not the device state', () => {
    renderEditor({ mode: 'preset', presetId: 1 })

    expect(screen.getByLabelText('Name')).toHaveValue('Sunset')
    expect(screen.getByText('0–39 (40 LEDs)')).toBeInTheDocument()
    expect(screen.getByText('40–99 (60 LEDs)')).toBeInTheDocument()
  })

  it('saves a preset by applying its segments and saving in one request', async () => {
    const { onClose, queueUpdate } = renderEditor({ mode: 'preset', presetId: 1 })

    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(statePosts).toHaveLength(1)
    expect(statePosts[0]).toMatchObject({ psave: 1, n: 'Sunset', ib: true, sb: true })
    expect(statePosts[0].seg).toEqual([
      expect.objectContaining({ id: 0, start: 0, stop: 40 }),
      expect.objectContaining({ id: 1, start: 40, stop: 100 }),
    ])
    // Live preview is off for presets, so nothing was sent over the socket
    expect(queueUpdate).not.toHaveBeenCalled()
  })

  it("keeps the preset's power, brightness and quick label rather than the device's", async () => {
    const { onClose } = renderEditor({ mode: 'preset', presetId: 1 })

    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(statePosts[0]).toMatchObject({ on: true, bri: 40, ql: 'S' })
  })

  it('Save As saves the current state under the entered name', async () => {
    const { onClose } = renderEditor({ mode: 'current' })

    fireEvent.click(screen.getByRole('button', { name: /Save As/ }))
    fireEvent.change(await screen.findByPlaceholderText('New Light Show'), {
      target: { value: 'Movie Night' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(statePosts).toHaveLength(1)
    // Preset 1 is taken, so the next free slot is 2
    expect(statePosts[0]).toMatchObject({ psave: 2, n: 'Movie Night' })
  })

  it('deletes a segment it created in live preview even before the device reports it', async () => {
    // The split dialog's slider needs ResizeObserver, which jsdom lacks
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    // The fake context's state never changes, like a device that hasn't confirmed yet
    const { queueUpdate } = renderEditor({ mode: 'current' })

    fireEvent.click(screen.getByTitle('Split segment'))
    fireEvent.click(await screen.findByRole('button', { name: 'Split Segment' }))
    await waitFor(() =>
      expect(queueUpdate).toHaveBeenLastCalledWith({
        seg: [expect.objectContaining({ id: 0 }), expect.objectContaining({ id: 1 })],
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(queueUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        seg: [expect.objectContaining({ id: 0, start: 0, stop: 100 }), { id: 1, stop: 0 }],
      }),
    )
  })

  it('keeps deleting a segment it created, even after a delete or a save failed', async () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    // The fake context's state never changes: the device never reports segment 1
    const { queueUpdate, onClose } = renderEditor({ mode: 'current' })

    // Live preview creates segment 1, then merging it back deletes it (that update may be lost)
    fireEvent.click(screen.getByTitle('Split segment'))
    fireEvent.click(await screen.findByRole('button', { name: 'Split Segment' }))
    fireEvent.click((await screen.findAllByTitle('Merge segment'))[1])
    fireEvent.click(await screen.findByRole('button', { name: /^Merge up into/ }))
    await waitFor(() =>
      expect(queueUpdate).toHaveBeenLastCalledWith({
        seg: [expect.objectContaining({ id: 0, stop: 100 }), { id: 1, stop: 0 }],
      }),
    )

    // A failed save, then a retry: both still delete segment 1
    failingStatePosts = 1
    const saveAs = async () => {
      fireEvent.click(screen.getByRole('button', { name: /Save As/ }))
      fireEvent.change(await screen.findByPlaceholderText('New Light Show'), {
        target: { value: 'Retry' },
      })
      fireEvent.click(screen.getByRole('button', { name: /^Save$/ }))
    }
    await saveAs()
    await waitFor(() => expect(statePosts).toHaveLength(1))
    expect(onClose).not.toHaveBeenCalled()
    await saveAs()
    await waitFor(() => expect(onClose).toHaveBeenCalled())

    expect(statePosts).toHaveLength(2)
    for (const post of statePosts) expect(post.seg).toContainEqual({ id: 1, stop: 0 })
  })

  it('shows an error for a preset that does not exist', () => {
    renderEditor({ mode: 'preset', presetId: 42 })
    expect(screen.getByText('Light show not found')).toBeInTheDocument()
  })
})
