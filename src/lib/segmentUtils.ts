import type { Segment } from '@/types/wled'

/**
 * Unified representation of LED ranges as either segments or gaps
 */
export type LedRangeItem =
  | { type: 'segment'; segment: Segment }
  | { type: 'gap'; start: number; stop: number }

/**
 * Convert segments to a unified list including gaps.
 * This represents the entire LED strip as a continuous sequence of segments and gaps.
 */
export function segmentsToRangeItems(
  segments: (Partial<Segment> & { id: number })[],
  maxLedCount: number,
): LedRangeItem[] {
  // Sort segments by start position
  const sorted = [...segments].sort((a, b) => (a.start ?? 0) - (b.start ?? 0))
  const items: LedRangeItem[] = []

  let currentPos = 0

  for (const segment of sorted) {
    const start = segment.start ?? 0
    const stop = segment.stop ?? maxLedCount

    // Add gap before segment if exists
    if (currentPos < start) {
      items.push({
        type: 'gap',
        start: currentPos,
        stop: start,
      })
    }

    // Add segment
    items.push({
      type: 'segment',
      segment: segment as Segment,
    })

    currentPos = Math.max(currentPos, stop)
  }

  // Add trailing gap if exists
  if (currentPos < maxLedCount) {
    items.push({
      type: 'gap',
      start: currentPos,
      stop: maxLedCount,
    })
  }

  return items
}

/**
 * Merge two segments together.
 * Works for adjacent, overlapping, or separated segments.
 * The resulting segment covers the full range using Math.min/max.
 *
 * @param keepId - ID of segment to keep (will expand to cover both ranges)
 * @param removeId - ID of segment to remove
 */
export function mergeSegments(segments: Segment[], keepId: number, removeId: number): Segment[] {
  const keepSegment = segments.find((s) => s.id === keepId)
  const removeSegment = segments.find((s) => s.id === removeId)

  if (!keepSegment || !removeSegment) {
    return segments
  }

  // Calculate merged range (handles all cases: adjacent, overlapping, gaps)
  const newStart = Math.min(keepSegment.start, removeSegment.start)
  const newStop = Math.max(keepSegment.stop, removeSegment.stop)

  // Remove the removeId segment and update the keepId segment
  return segments
    .filter((s) => s.id !== removeId)
    .map((seg) => (seg.id === keepId ? { ...seg, start: newStart, stop: newStop } : seg))
}

/**
 * Merge a gap up by extending the segment above it.
 * The segment that ends at gapStart will be extended to stop at gapStop.
 */
export function mergeGapUp(segments: Segment[], gapStart: number, gapStop: number): Segment[] {
  // Find segment that ends at gap start
  const segmentAbove = segments.find((s) => s.stop === gapStart)

  if (!segmentAbove) {
    return segments
  }

  return segments.map((seg) => (seg.id === segmentAbove.id ? { ...seg, stop: gapStop } : seg))
}

/**
 * Merge a gap down by extending the segment below it.
 * The segment that starts at gapStop will be extended to start at gapStart.
 */
export function mergeGapDown(segments: Segment[], gapStart: number, gapStop: number): Segment[] {
  // Find segment that starts at gap end
  const segmentBelow = segments.find((s) => s.start === gapStop)

  if (!segmentBelow) {
    return segments
  }

  return segments.map((seg) => (seg.id === segmentBelow.id ? { ...seg, start: gapStart } : seg))
}

/** Defaults for segment fields WLED doesn't require us to send. */
const DEFAULT_SEGMENT: Omit<Segment, 'id' | 'start' | 'stop' | 'len'> = {
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
  fx: 0, // Solid
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

/**
 * Renumber segment ids to 0..n-1, keeping their relative order (and the array order).
 *
 * WLED segment ids are slot indices: an id at or beyond the slot count is appended at the
 * next slot (whatever id was sent), and a batch delete purges inactive slots, shifting
 * later ids down. Contiguous ids sent in ascending order always land on the same index on
 * the device. Returns `segments` itself when the ids are already contiguous.
 */
export function normalizeSegmentIds(segments: Segment[]): Segment[] {
  const byId = [...segments].sort((a, b) => a.id - b.id)
  const newIds = new Map(byId.map((seg, index) => [seg, index]))
  if (segments.every((seg) => seg.id === newIds.get(seg))) return segments
  return segments.map((seg) => ({ ...seg, id: newIds.get(seg) ?? seg.id }))
}

/**
 * Build a complete Segment from a partial one (e.g. from a preset or a
 * global segment layout), filling in defaults for missing fields.
 */
export function toSegment(partial: Partial<Segment>, fallbackId: number, ledCount = 0): Segment {
  const start = partial.start ?? 0
  const stop = partial.stop ?? ledCount
  return {
    ...DEFAULT_SEGMENT,
    ...partial,
    id: partial.id ?? fallbackId,
    start,
    stop,
    len: stop - start,
  }
}

/**
 * Create a new segment from a gap using default values.
 * Returns the segments unchanged when all segment IDs are in use.
 */
export function convertGapToSegment(
  segments: Segment[],
  gapStart: number,
  gapStop: number,
): Segment[] {
  const newId = findNextAvailableSegmentId(segments)
  if (newId === -1) return segments

  const newSegment = toSegment({ start: gapStart, stop: gapStop }, newId)
  return [...segments, newSegment].sort((a, b) => a.start - b.start)
}

/**
 * Split a segment at `splitPoint`: the original keeps [start, splitPoint) and a
 * copy with the next free ID gets [splitPoint, stop). Returns the segments
 * unchanged when the point is out of range or all segment IDs are in use.
 */
export function splitSegment(segments: Segment[], id: number, splitPoint: number): Segment[] {
  const segment = segments.find((s) => s.id === id)
  if (!segment || splitPoint <= segment.start || splitPoint >= segment.stop) return segments
  const newId = findNextAvailableSegmentId(segments)
  if (newId === -1) return segments

  return [
    ...segments.map((seg) =>
      seg.id === id ? { ...seg, stop: splitPoint, len: splitPoint - seg.start } : seg,
    ),
    // The new half doesn't inherit the name: it would label two segments the same
    { ...segment, id: newId, start: splitPoint, len: segment.stop - splitPoint, n: undefined },
  ].sort((a, b) => a.start - b.start)
}

/**
 * Find the next available segment ID (0-9).
 * Returns -1 if all IDs are in use.
 */
export function findNextAvailableSegmentId(segments: Segment[]): number {
  const usedIds = new Set(segments.map((s) => s.id))
  for (let i = 0; i <= 9; i++) {
    if (!usedIds.has(i)) {
      return i
    }
  }
  return -1
}

/**
 * Repair segments by fixing common issues:
 * - Overlapping adjacent segments (truncate the first segment)
 * - Segments that extend past the LED count (truncate to max)
 * - Zero-length or invalid segments (remove them)
 *
 * WLED segment `stop` is exclusive: a segment covers LEDs start..stop-1.
 * Adjacent segments share an endpoint (e.g. [0, 100) and [100, 200)).
 *
 * Gaps between segments are preserved (they are allowed).
 */
export function repairSegments(segments: Segment[], ledCount: number): Segment[] {
  const repaired = [...segments].sort((a, b) => a.start - b.start)

  for (let i = 0; i < repaired.length - 1; i++) {
    const current = repaired[i]
    const next = repaired[i + 1]
    if (current.stop > next.start) {
      repaired[i] = { ...current, stop: next.start }
    }
  }

  return repaired
    .map((seg) => (seg.stop > ledCount ? { ...seg, stop: ledCount } : seg))
    .filter((seg) => seg.start >= 0 && seg.start < seg.stop)
}
