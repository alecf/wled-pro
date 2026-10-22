import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useSegmentOperations } from '@/hooks/useSegmentOperations'
import { segmentsToDeviceUpdate } from '@/lib/wled-state'
import { FakeWled } from '@/test/fake-wled/FakeWled'
import { withSegments } from '@/test/fake-wled/fixtures/builders'
import type { JsonObject } from '@/test/fake-wled/types'
import type { Segment } from '@/types/wled'

/**
 * The light show editor's segment operations, with every change sent to a fake device the
 * way live preview does. WLED segment ids are slot indices (see the fake's
 * semantics/segments.ts), so the editor's ids must keep matching the device's.
 */
function renderLivePreview(sim: FakeWled) {
  const send = (segments: Segment[]) => {
    const deviceIds = sim.state.seg.map((s) => s.id)
    sim.applyState({ seg: segmentsToDeviceUpdate(segments, deviceIds) } as unknown as JsonObject)
  }
  return renderHook(() =>
    useSegmentOperations({
      initialSegments: structuredClone(sim.state.seg) as Segment[],
      onSegmentsChange: send,
    }),
  )
}

const ranges = (segs: { id: number; start: number; stop: number }[]) =>
  segs.map(({ id, start, stop }) => [id, start, stop])

describe('editor segment ids against a fake device', () => {
  it('stays in sync after a batch delete renumbers the device (WLED purge)', () => {
    const sim = new FakeWled({ overrides: { state: { seg: withSegments(4, 120) } } })
    const { result } = renderLivePreview(sim)

    // Merging away two of four segments in one update makes WLED purge its inactive slots
    act(() =>
      result.current.setAllSegments([result.current.segments[0], result.current.segments[3]]),
    )
    expect(ranges(sim.state.seg)).toEqual(ranges(result.current.segments))

    // Further edits (e.g. dragging a slider in live preview) must not add segments
    for (let fx = 1; fx <= 9; fx++) {
      act(() => result.current.updateSegment(result.current.segments[1].id, { fx }))
    }
    expect(ranges(sim.state.seg)).toEqual(ranges(result.current.segments))
    expect(sim.state.seg[1].fx).toBe(9)
  })

  it('creates a split segment where the device puts it, after an earlier delete', () => {
    const sim = new FakeWled({ overrides: { state: { seg: withSegments(3, 90) } } })
    const { result } = renderLivePreview(sim)

    // Remove the middle segment: WLED keeps its (now inactive) slot
    act(() => result.current.mergeSegments(0, 1))
    // Split the last segment: the new one must land on the id the editor gave it
    const last = result.current.segments[result.current.segments.length - 1]
    act(() => result.current.splitSegment(last.id, 75))
    act(() => result.current.updateSegment(result.current.segments[2].id, { fx: 4 }))

    expect(ranges(sim.state.seg)).toEqual(
      ranges([...result.current.segments].sort((a, b) => a.id - b.id)),
    )
    const byId = (id: number) => sim.state.seg.find((s) => s.id === id)
    for (const seg of result.current.segments) expect(byId(seg.id)?.fx).toBe(seg.fx)
  })
})
