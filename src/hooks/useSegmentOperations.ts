import { useCallback, useEffect, useRef, useState } from 'react'
import {
  convertGapToSegment as convertGapToSegmentUtil,
  mergeGapDown as mergeGapDownUtil,
  mergeGapUp as mergeGapUpUtil,
  mergeSegments as mergeSegmentsUtil,
  normalizeSegmentIds,
  splitSegment as splitSegmentUtil,
} from '@/lib/segmentUtils'
import type { Segment } from '@/types/wled'

export interface UseSegmentOperationsOptions {
  /** Starting segments. Only read on mount; remount (e.g. with `key`) to reset. */
  initialSegments: Segment[]
  /** Called with the new segments after every change */
  onSegmentsChange?: (segments: Segment[]) => void
}

/**
 * Local segment list with edit operations.
 *
 * Segment ids are kept contiguous (0..n-1, see `normalizeSegmentIds`) so they match the
 * device's segment indices; an operation that removes a segment renumbers the ones after it.
 *
 * Each operation reads the latest segments from a ref, so rapid successive
 * calls (e.g. slider drags) never act on stale state, and `onSegmentsChange`
 * runs outside of React's state updaters.
 */
export function useSegmentOperations({
  initialSegments,
  onSegmentsChange,
}: UseSegmentOperationsOptions) {
  const [segments, setSegments] = useState(() => normalizeSegmentIds(initialSegments))
  const segmentsRef = useRef(segments)
  const onChangeRef = useRef(onSegmentsChange)
  useEffect(() => {
    onChangeRef.current = onSegmentsChange
  }, [onSegmentsChange])

  const apply = useCallback((change: (prev: Segment[]) => Segment[]) => {
    const next = normalizeSegmentIds(change(segmentsRef.current))
    if (next === segmentsRef.current) return
    segmentsRef.current = next
    setSegments(next)
    onChangeRef.current?.(next)
  }, [])

  return {
    segments,
    /** Update a single segment by ID */
    updateSegment: useCallback(
      (id: number, updates: Partial<Segment>) =>
        apply((prev) => prev.map((seg) => (seg.id === id ? { ...seg, ...updates } : seg))),
      [apply],
    ),
    /** Split a segment; the new segment covers [splitPoint, stop) */
    splitSegment: useCallback(
      (id: number, splitPoint: number) => apply((prev) => splitSegmentUtil(prev, id, splitPoint)),
      [apply],
    ),
    /** The keepId segment expands to cover both ranges; removeId is removed */
    mergeSegments: useCallback(
      (keepId: number, removeId: number) =>
        apply((prev) => mergeSegmentsUtil(prev, keepId, removeId)),
      [apply],
    ),
    /** Extend the segment ending at gapStart to cover the gap */
    mergeGapUp: useCallback(
      (gapStart: number, gapStop: number) =>
        apply((prev) => mergeGapUpUtil(prev, gapStart, gapStop)),
      [apply],
    ),
    /** Extend the segment starting at gapStop to cover the gap */
    mergeGapDown: useCallback(
      (gapStart: number, gapStop: number) =>
        apply((prev) => mergeGapDownUtil(prev, gapStart, gapStop)),
      [apply],
    ),
    /** Fill a gap with a new default segment */
    convertGapToSegment: useCallback(
      (gapStart: number, gapStop: number) =>
        apply((prev) => convertGapToSegmentUtil(prev, gapStart, gapStop)),
      [apply],
    ),
    /** Replace all segments */
    setAllSegments: useCallback((next: Segment[]) => apply(() => next), [apply]),
  }
}
