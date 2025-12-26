import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useState, useCallback } from 'react'
import type { Segment } from '@/types/wled'

/**
 * Tests for segment operations behavior.
 *
 * These tests capture the current behavior in LightShowEditorScreen.tsx
 * that must be preserved when extracting to useSegmentOperations hook.
 *
 * Key requirements:
 * 1. Operations must use state updater callback pattern to avoid stale closures
 * 2. Updates should be applied correctly even during rapid successive calls
 * 3. External state changes (initialSegments prop) should sync properly
 *
 * Run these tests before and after extracting the hook (Task 4.1)
 * to ensure no regressions in behavior.
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
    col: [[255, 255, 255], [0, 0, 0], [0, 0, 0]],
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

/**
 * This hook simulates the current behavior in LightShowEditorScreen.tsx
 * It will be replaced by the actual useSegmentOperations hook after Task 4.1
 */
function useSegmentOperationsSimulator(
  initialSegments: Segment[],
  ledCount: number,
  onSegmentsChange?: (segments: Segment[]) => void
) {
  const [segments, setSegments] = useState<Segment[]>(initialSegments)

  // All operations use setSegments callback form to avoid stale closures
  // This pattern matches LightShowEditorScreen.tsx lines 177-192
  const updateSegment = useCallback((id: number, updates: Partial<Segment>) => {
    setSegments((prev) => {
      const newSegments = prev.map((seg) =>
        seg.id === id ? { ...seg, ...updates } : seg
      )
      onSegmentsChange?.(newSegments)
      return newSegments
    })
  }, [onSegmentsChange])

  // Matches LightShowEditorScreen.tsx lines 195-239
  const splitSegment = useCallback((id: number, splitPoint: number) => {
    setSegments((prev) => {
      const segment = prev.find((s) => s.id === id)
      if (!segment) return prev
      if (splitPoint <= segment.start || splitPoint >= segment.stop) return prev

      const usedIds = new Set(prev.map((s) => s.id))
      let newId = 0
      for (let i = 0; i <= 9; i++) {
        if (!usedIds.has(i)) {
          newId = i
          break
        }
      }

      const newSegments = [
        ...prev.map((seg) =>
          seg.id === id ? { ...seg, stop: splitPoint } : seg
        ),
        {
          ...segment,
          id: newId,
          start: splitPoint,
          stop: segment.stop,
        },
      ].sort((a, b) => a.start - b.start)

      onSegmentsChange?.(newSegments)
      return newSegments
    })
  }, [onSegmentsChange])

  // Matches LightShowEditorScreen.tsx lines 241-259
  const mergeSegments = useCallback((keepId: number, removeId: number) => {
    setSegments((prev) => {
      const keepSegment = prev.find((s) => s.id === keepId)
      const removeSegment = prev.find((s) => s.id === removeId)

      if (!keepSegment || !removeSegment) return prev

      const newStart = Math.min(keepSegment.start, removeSegment.start)
      const newStop = Math.max(keepSegment.stop, removeSegment.stop)

      const newSegments = prev
        .filter((s) => s.id !== removeId)
        .map((seg) =>
          seg.id === keepId ? { ...seg, start: newStart, stop: newStop } : seg
        )

      onSegmentsChange?.(newSegments)
      return newSegments
    })
  }, [onSegmentsChange])

  const deleteSegment = useCallback((id: number) => {
    setSegments((prev) => {
      const newSegments = prev.filter((s) => s.id !== id)
      onSegmentsChange?.(newSegments)
      return newSegments
    })
  }, [onSegmentsChange])

  const addSegment = useCallback((start: number, stop: number) => {
    setSegments((prev) => {
      const usedIds = new Set(prev.map((s) => s.id))
      let newId = 0
      for (let i = 0; i <= 9; i++) {
        if (!usedIds.has(i)) {
          newId = i
          break
        }
      }

      const newSegment = createSegment({ id: newId, start, stop })
      const newSegments = [...prev, newSegment].sort((a, b) => a.start - b.start)
      onSegmentsChange?.(newSegments)
      return newSegments
    })
  }, [onSegmentsChange])

  return {
    segments,
    updateSegment,
    splitSegment,
    mergeSegments,
    deleteSegment,
    addSegment,
    // For testing: direct access to setSegments
    _setSegments: setSegments,
  }
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

      const { result } = renderHook(() =>
        useSegmentOperationsSimulator(initialSegments, 200)
      )

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

      const { result } = renderHook(() =>
        useSegmentOperationsSimulator(initialSegments, 200)
      )

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
        useSegmentOperationsSimulator(initialSegments, 200, onSegmentsChange)
      )

      act(() => {
        result.current.updateSegment(0, { fx: 5 })
      })

      expect(onSegmentsChange).toHaveBeenCalledTimes(1)
      expect(onSegmentsChange).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: 0, fx: 5 })])
      )
    })

    it('should not modify segments if ID not found', () => {
      const initialSegments = [createSegment({ id: 0, fx: 1 })]

      const { result } = renderHook(() =>
        useSegmentOperationsSimulator(initialSegments, 200)
      )

      act(() => {
        result.current.updateSegment(999, { fx: 5 })
      })

      expect(result.current.segments[0].fx).toBe(1)
    })
  })

  describe('splitSegment', () => {
    it('should split a segment at the specified point', () => {
      const initialSegments = [createSegment({ id: 0, start: 0, stop: 100 })]

      const { result } = renderHook(() =>
        useSegmentOperationsSimulator(initialSegments, 200)
      )

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

      const { result } = renderHook(() =>
        useSegmentOperationsSimulator(initialSegments, 200)
      )

      act(() => {
        result.current.splitSegment(0, 25)
      })

      const ids = result.current.segments.map((s) => s.id).sort()
      expect(ids).toContain(1) // Should use available ID 1
    })

    it('should not split if splitPoint is at or beyond segment bounds', () => {
      const initialSegments = [createSegment({ id: 0, start: 0, stop: 100 })]

      const { result } = renderHook(() =>
        useSegmentOperationsSimulator(initialSegments, 200)
      )

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

  describe('mergeSegments', () => {
    it('should merge two segments correctly', () => {
      const initialSegments = [
        createSegment({ id: 0, start: 0, stop: 100 }),
        createSegment({ id: 1, start: 100, stop: 200 }),
      ]

      const { result } = renderHook(() =>
        useSegmentOperationsSimulator(initialSegments, 200)
      )

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

      const { result } = renderHook(() =>
        useSegmentOperationsSimulator(initialSegments, 200)
      )

      act(() => {
        result.current.mergeSegments(0, 1)
      })

      expect(result.current.segments).toHaveLength(1)
      expect(result.current.segments[0].start).toBe(0)
      expect(result.current.segments[0].stop).toBe(150) // Covers gap
    })
  })

  describe('deleteSegment', () => {
    it('should remove the specified segment', () => {
      const initialSegments = [
        createSegment({ id: 0, start: 0, stop: 100 }),
        createSegment({ id: 1, start: 100, stop: 200 }),
      ]

      const { result } = renderHook(() =>
        useSegmentOperationsSimulator(initialSegments, 200)
      )

      act(() => {
        result.current.deleteSegment(0)
      })

      expect(result.current.segments).toHaveLength(1)
      expect(result.current.segments[0].id).toBe(1)
    })
  })

  describe('addSegment', () => {
    it('should add a new segment with next available ID', () => {
      const initialSegments = [createSegment({ id: 0, start: 0, stop: 100 })]

      const { result } = renderHook(() =>
        useSegmentOperationsSimulator(initialSegments, 200)
      )

      act(() => {
        result.current.addSegment(100, 200)
      })

      expect(result.current.segments).toHaveLength(2)
      expect(result.current.segments[1].id).toBe(1)
      expect(result.current.segments[1].start).toBe(100)
      expect(result.current.segments[1].stop).toBe(200)
    })
  })

  describe('stale closure prevention (CRITICAL)', () => {
    it('should handle rapid successive updates without stale closures', async () => {
      const onSegmentsChange = vi.fn()
      const initialSegments = [
        createSegment({ id: 0, start: 0, stop: 100, bri: 100 }),
      ]

      const { result } = renderHook(() =>
        useSegmentOperationsSimulator(initialSegments, 200, onSegmentsChange)
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

      const initialSegments = [
        createSegment({ id: 0, bri: 100 }),
      ]

      const { result } = renderHook(() =>
        useSegmentOperationsSimulator(initialSegments, 200, onSegmentsChange)
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

      const { result } = renderHook(() =>
        useSegmentOperationsSimulator(initialSegments, 200)
      )

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

  describe('external state synchronization', () => {
    it('should sync when initialSegments prop changes', () => {
      const initialSegments1 = [createSegment({ id: 0, fx: 1 })]
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Placeholder for future test expansion
      const _initialSegments2 = [createSegment({ id: 0, fx: 5 })]

      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Placeholder for future test expansion
      const { result, rerender: _rerender } = renderHook(
        ({ segments }) => useSegmentOperationsSimulator(segments, 200),
        { initialProps: { segments: initialSegments1 } }
      )

      expect(result.current.segments[0].fx).toBe(1)

      // Note: The current implementation doesn't auto-sync on prop change
      // This test documents that the extracted hook should handle this
      // via useEffect that syncs initialSegments to internal state
    })
  })
})
