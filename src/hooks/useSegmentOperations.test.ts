import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Segment } from '@/types/wled'
import { useSegmentOperations } from './useSegmentOperations'

/**
 * Tests for segment operations behavior.
 *
 * Key requirement: updates are applied correctly even during rapid
 * successive calls (no stale closures).
 */

// Helper to create a test segment
function createSegment(overrides?: Partial<Segment>): Segment {
  return {
    id: 0,
    start: 0,
    stop: 100,
    len: 100,
    grp: 1,
    spc: 0,
    of: 0,
    on: true,
    frz: false,
    bri: 255,
    cct: 127,
    col: [
      [255, 255, 255],
      [0, 0, 0],
      [0, 0, 0],
    ],
    fx: 0,
    sx: 128,
    ix: 128,
    pal: 0,
    c1: 128,
    c2: 128,
    c3: 16,
    sel: false,
    rev: false,
    mi: false,
    ...overrides,
  }
}

// Wrapper to match the old test API
function useSegmentOperationsWrapper(
  initialSegments: Segment[],
  _ledCount: number,
  onSegmentsChange?: (segments: Segment[]) => void,
) {
  return useSegmentOperations({ initialSegments, onSegmentsChange })
}

describe('useSegmentOperations', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('updateSegment', () => {
    it('should update the correct segment by ID', () => {
      const initialSegments = [
        createSegment({ id: 0, start: 0, stop: 100 }),
        createSegment({ id: 1, start: 100, stop: 200 }),
      ]

      const { result } = renderHook(() => useSegmentOperationsWrapper(initialSegments, 200))

      act(() => {
        result.current.updateSegment(1, { fx: 5, bri: 200 })
      })

      expect(result.current.segments[1].fx).toBe(5)
      expect(result.current.segments[1].bri).toBe(200)
    })

    it('should preserve other segments unchanged', () => {
      const initialSegments = [
        createSegment({ id: 0, start: 0, stop: 100, fx: 1 }),
        createSegment({ id: 1, start: 100, stop: 200, fx: 2 }),
      ]

      const { result } = renderHook(() => useSegmentOperationsWrapper(initialSegments, 200))

      act(() => {
        result.current.updateSegment(1, { fx: 5 })
      })

      expect(result.current.segments[0].fx).toBe(1) // Unchanged
      expect(result.current.segments[1].fx).toBe(5) // Updated
    })

    it('should call onSegmentsChange callback', () => {
      const onSegmentsChange = vi.fn()
      const initialSegments = [createSegment({ id: 0 })]

      const { result } = renderHook(() =>
        useSegmentOperationsWrapper(initialSegments, 200, onSegmentsChange),
      )

      act(() => {
        result.current.updateSegment(0, { fx: 5 })
      })

      expect(onSegmentsChange).toHaveBeenCalledTimes(1)
      expect(onSegmentsChange).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: 0, fx: 5 })]),
      )
    })

    it('should not modify segments if ID not found', () => {
      const initialSegments = [createSegment({ id: 0, fx: 1 })]

      const { result } = renderHook(() => useSegmentOperationsWrapper(initialSegments, 200))

      act(() => {
        result.current.updateSegment(999, { fx: 5 })
      })

      expect(result.current.segments[0].fx).toBe(1)
    })
  })

  describe('splitSegment', () => {
    it('should split a segment at the specified point', () => {
      const initialSegments = [createSegment({ id: 0, start: 0, stop: 100 })]

      const { result } = renderHook(() => useSegmentOperationsWrapper(initialSegments, 200))

      act(() => {
        result.current.splitSegment(0, 50)
      })

      expect(result.current.segments).toHaveLength(2)
      expect(result.current.segments[0].start).toBe(0)
      expect(result.current.segments[0].stop).toBe(50)
      expect(result.current.segments[1].start).toBe(50)
      expect(result.current.segments[1].stop).toBe(100)
    })

    it('should assign next available ID to new segment', () => {
      const initialSegments = [
        createSegment({ id: 0, start: 0, stop: 50 }),
        createSegment({ id: 2, start: 50, stop: 100 }), // ID 1 is available
      ]

      const { result } = renderHook(() => useSegmentOperationsWrapper(initialSegments, 200))

      act(() => {
        result.current.splitSegment(0, 25)
      })

      const ids = result.current.segments.map((s) => s.id).sort()
      expect(ids).toContain(1) // Should use available ID 1
    })

    it('should not split if splitPoint is at or beyond segment bounds', () => {
      const initialSegments = [createSegment({ id: 0, start: 0, stop: 100 })]

      const { result } = renderHook(() => useSegmentOperationsWrapper(initialSegments, 200))

      act(() => {
        result.current.splitSegment(0, 100) // At boundary
      })

      expect(result.current.segments).toHaveLength(1)

      act(() => {
        result.current.splitSegment(0, 150) // Beyond boundary
      })

      expect(result.current.segments).toHaveLength(1)
    })
  })

  describe('splitSegment when all IDs are used', () => {
    it('leaves segments unchanged instead of reusing an ID', () => {
      const initialSegments = Array.from({ length: 10 }, (_, i) =>
        createSegment({ id: i, start: i * 10, stop: (i + 1) * 10 }),
      )
      const { result } = renderHook(() => useSegmentOperationsWrapper(initialSegments, 100))

      act(() => {
        result.current.splitSegment(0, 5)
      })

      expect(result.current.segments).toBe(initialSegments)
    })
  })

  describe('mergeSegments', () => {
    it('should merge two segments correctly', () => {
      const initialSegments = [
        createSegment({ id: 0, start: 0, stop: 100 }),
        createSegment({ id: 1, start: 100, stop: 200 }),
      ]

      const { result } = renderHook(() => useSegmentOperationsWrapper(initialSegments, 200))

      act(() => {
        result.current.mergeSegments(0, 1)
      })

      expect(result.current.segments).toHaveLength(1)
      expect(result.current.segments[0].id).toBe(0)
      expect(result.current.segments[0].start).toBe(0)
      expect(result.current.segments[0].stop).toBe(200)
    })

    it('should handle non-adjacent segments (with gap)', () => {
      const initialSegments = [
        createSegment({ id: 0, start: 0, stop: 50 }),
        createSegment({ id: 1, start: 100, stop: 150 }),
      ]

      const { result } = renderHook(() => useSegmentOperationsWrapper(initialSegments, 200))

      act(() => {
        result.current.mergeSegments(0, 1)
      })

      expect(result.current.segments).toHaveLength(1)
      expect(result.current.segments[0].start).toBe(0)
      expect(result.current.segments[0].stop).toBe(150) // Covers gap
    })
  })

  describe('stale closure prevention (CRITICAL)', () => {
    it('should handle rapid successive updates without stale closures', async () => {
      const onSegmentsChange = vi.fn()
      const initialSegments = [createSegment({ id: 0, start: 0, stop: 100, bri: 100 })]

      const { result } = renderHook(() =>
        useSegmentOperationsWrapper(initialSegments, 200, onSegmentsChange),
      )

      // Simulate rapid updates (like slider dragging)
      act(() => {
        result.current.updateSegment(0, { bri: 110 })
        result.current.updateSegment(0, { bri: 120 })
        result.current.updateSegment(0, { bri: 130 })
        result.current.updateSegment(0, { bri: 140 })
        result.current.updateSegment(0, { bri: 150 })
      })

      // All updates should have been applied (not lost to stale closures)
      expect(result.current.segments[0].bri).toBe(150)

      // Each update should have triggered the callback
      expect(onSegmentsChange).toHaveBeenCalledTimes(5)
    })

    it('should receive latest state in callbacks, not stale state', () => {
      const receivedStates: Segment[][] = []
      const onSegmentsChange = (segments: Segment[]) => {
        receivedStates.push(segments.map((s) => ({ ...s })))
      }

      const initialSegments = [createSegment({ id: 0, bri: 100 })]

      const { result } = renderHook(() =>
        useSegmentOperationsWrapper(initialSegments, 200, onSegmentsChange),
      )

      act(() => {
        result.current.updateSegment(0, { bri: 110 })
        result.current.updateSegment(0, { bri: 120 })
        result.current.updateSegment(0, { bri: 130 })
      })

      // Each callback should have received incrementally updated state
      expect(receivedStates[0][0].bri).toBe(110)
      expect(receivedStates[1][0].bri).toBe(120)
      expect(receivedStates[2][0].bri).toBe(130)
    })

    it('should handle interleaved operations without stale closures', () => {
      const initialSegments = [
        createSegment({ id: 0, start: 0, stop: 100, fx: 0 }),
        createSegment({ id: 1, start: 100, stop: 200, fx: 0 }),
      ]

      const { result } = renderHook(() => useSegmentOperationsWrapper(initialSegments, 200))

      act(() => {
        // Interleaved updates to different segments
        result.current.updateSegment(0, { fx: 1 })
        result.current.updateSegment(1, { fx: 2 })
        result.current.updateSegment(0, { bri: 200 })
        result.current.updateSegment(1, { bri: 150 })
      })

      // All updates should be reflected correctly
      expect(result.current.segments[0].fx).toBe(1)
      expect(result.current.segments[0].bri).toBe(200)
      expect(result.current.segments[1].fx).toBe(2)
      expect(result.current.segments[1].bri).toBe(150)
    })
  })
})
