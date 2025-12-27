import { useState, useCallback, useEffect } from 'react'
import type { Segment } from '@/types/wled'
import {
  mergeSegments as mergeSegmentsUtil,
  mergeGapUp as mergeGapUpUtil,
  mergeGapDown as mergeGapDownUtil,
  convertGapToSegment as convertGapToSegmentUtil,
  findNextAvailableSegmentId,
} from '@/lib/segmentUtils'

export interface UseSegmentOperationsOptions {
  initialSegments: Segment[]
  ledCount: number
  onSegmentsChange?: (segments: Segment[]) => void
}

/**
 * Hook for managing segment operations with proper state management.
 *
 * Uses the callback form of setSegments to avoid stale closures,
 * which is critical for rapid successive updates (e.g., slider dragging).
 *
 * This hook provides segment manipulation logic that was previously
 * embedded in LightShowEditorScreen.tsx. It can be reused anywhere
 * segments need to be edited.
 */
export function useSegmentOperations(options: UseSegmentOperationsOptions) {
  const { initialSegments, onSegmentsChange } = options
  // Note: options.ledCount is available for future bounds checking
  const [segments, setSegments] = useState<Segment[]>(initialSegments)

  // Sync with external initialSegments changes
  useEffect(() => {
    setSegments(initialSegments)
  }, [initialSegments])

  /**
   * Update a single segment by ID.
   * Uses callback form to avoid stale closures during rapid updates.
   */
  const updateSegment = useCallback(
    (id: number, updates: Partial<Segment>) => {
      setSegments((prev) => {
        const newSegments = prev.map((seg) =>
          seg.id === id ? { ...seg, ...updates } : seg
        )
        onSegmentsChange?.(newSegments)
        return newSegments
      })
    },
    [onSegmentsChange]
  )

  /**
   * Split a segment at the specified point.
   * Creates a new segment from splitPoint to the original stop.
   */
  const splitSegment = useCallback(
    (id: number, splitPoint: number) => {
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
    },
    [onSegmentsChange]
  )

  /**
   * Merge two segments together.
   * The keepId segment expands to cover both ranges, removeId is deleted.
   */
  const mergeSegments = useCallback(
    (keepId: number, removeId: number) => {
      setSegments((prev) => {
        const newSegments = mergeSegmentsUtil(prev, keepId, removeId)
        if (newSegments !== prev) {
          onSegmentsChange?.(newSegments)
        }
        return newSegments
      })
    },
    [onSegmentsChange]
  )

  /**
   * Merge a gap up by extending the segment above it.
   */
  const mergeGapUp = useCallback(
    (gapStart: number, gapStop: number) => {
      setSegments((prev) => {
        const newSegments = mergeGapUpUtil(prev, gapStart, gapStop)
        if (newSegments !== prev) {
          onSegmentsChange?.(newSegments)
        }
        return newSegments
      })
    },
    [onSegmentsChange]
  )

  /**
   * Merge a gap down by extending the segment below it.
   */
  const mergeGapDown = useCallback(
    (gapStart: number, gapStop: number) => {
      setSegments((prev) => {
        const newSegments = mergeGapDownUtil(prev, gapStart, gapStop)
        if (newSegments !== prev) {
          onSegmentsChange?.(newSegments)
        }
        return newSegments
      })
    },
    [onSegmentsChange]
  )

  /**
   * Convert a gap to a new segment with default values.
   */
  const convertGapToSegment = useCallback(
    (gapStart: number, gapStop: number) => {
      setSegments((prev) => {
        const newSegments = convertGapToSegmentUtil(prev, gapStart, gapStop)
        onSegmentsChange?.(newSegments)
        return newSegments
      })
    },
    [onSegmentsChange]
  )

  /**
   * Delete a segment by ID.
   */
  const deleteSegment = useCallback(
    (id: number) => {
      setSegments((prev) => {
        const newSegments = prev.filter((s) => s.id !== id)
        onSegmentsChange?.(newSegments)
        return newSegments
      })
    },
    [onSegmentsChange]
  )

  /**
   * Add a new segment with default values.
   */
  const addSegment = useCallback(
    (start: number, stop: number) => {
      setSegments((prev) => {
        const newId = findNextAvailableSegmentId(prev)
        if (newId === -1) return prev // All 10 segment slots are full

        const newSegment: Segment = {
          id: newId,
          start,
          stop,
          len: stop - start,
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
        }

        const newSegments = [...prev, newSegment].sort((a, b) => a.start - b.start)
        onSegmentsChange?.(newSegments)
        return newSegments
      })
    },
    [onSegmentsChange]
  )

  /**
   * Replace all segments with a new array.
   * Useful for bulk operations like applying global segments.
   */
  const setAllSegments = useCallback(
    (newSegments: Segment[]) => {
      setSegments(newSegments)
      onSegmentsChange?.(newSegments)
    },
    [onSegmentsChange]
  )

  return {
    segments,
    updateSegment,
    splitSegment,
    mergeSegments,
    mergeGapUp,
    mergeGapDown,
    convertGapToSegment,
    deleteSegment,
    addSegment,
    setAllSegments,
  }
}
