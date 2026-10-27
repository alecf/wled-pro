import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ApiActivityProvider } from '@/contexts/ApiActivityContext'
import { useFakeWled } from '@/test/fake-wled/adapters/vitest'
import type { WledInfo } from '@/types/wled'
import { SegmentsScreen } from './SegmentsScreen'

const FILE = '/wled-pro-segments.json'
const info = { leds: { count: 30 } } as WledInfo

describe('SegmentsScreen', () => {
  const device = useFakeWled()

  it('never offers to replace a saved layout it could not read', async () => {
    const saved = JSON.stringify({
      version: 1,
      lastModified: 0,
      segments: [
        { id: 'a', start: 0, stop: 10, name: 'Kitchen' },
        { id: 'b', start: 10, stop: 30, name: 'Hall' },
      ],
      groups: [],
    })
    device.sim.files.set(FILE, saved)
    device.sim.latency({ match: FILE, ms: 50 })
    device.sim.fail(FILE, { networkError: true, times: 1 })
    const Wrapper = device.wrapper()
    render(
      <Wrapper>
        <ApiActivityProvider>
          <SegmentsScreen controllerId={device.baseUrl} info={info} />
        </ApiActivityProvider>
      </Wrapper>,
    )

    // While loading, and after the read fails, an empty list must not look like "no layout"
    expect(screen.getByText('Loading segments...')).toBeInTheDocument()
    expect(screen.queryByText('Create First Segment')).not.toBeInTheDocument()
    expect(await screen.findByText('Failed to load segments')).toBeInTheDocument()
    expect(screen.queryByText('Create First Segment')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Try Again' }))
    expect(await screen.findByText('Kitchen')).toBeInTheDocument()
    expect(screen.getByText('Hall')).toBeInTheDocument()
    expect(device.sim.requests.some((r) => r.path === '/edit')).toBe(false)
    expect(device.sim.files.get(FILE)).toBe(saved)
  })
})
