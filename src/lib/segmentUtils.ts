import type { Segment } from "@/types/wled";

/**
 * Unified representation of LED ranges as either segments or gaps
 */
export type LedRangeItem =
  | { type: "segment"; segment: Segment }
  | { type: "gap"; start: number; stop: number };

/**
 * Convert segments to a unified list including gaps.
 * This represents the entire LED strip as a continuous sequence of segments and gaps.
 */
export function segmentsToRangeItems(
  segments: (Partial<Segment> & { id: number })[],
  maxLedCount: number
): LedRangeItem[] {
  // Sort segments by start position
  const sorted = [...segments].sort(
    (a, b) => (a.start ?? 0) - (b.start ?? 0)
  );
  const items: LedRangeItem[] = [];

  let currentPos = 0;

  for (const segment of sorted) {
    const start = segment.start ?? 0;
    const stop = segment.stop ?? maxLedCount;

    // Add gap before segment if exists
    if (currentPos < start) {
      items.push({
        type: "gap",
        start: currentPos,
        stop: start,
      });
    }

    // Add segment
    items.push({
      type: "segment",
      segment: segment as Segment,
    });

    currentPos = Math.max(currentPos, stop);
  }

  // Add trailing gap if exists
  if (currentPos < maxLedCount) {
    items.push({
      type: "gap",
      start: currentPos,
      stop: maxLedCount,
    });
  }

  return items;
}

/**
 * Merge two segments together.
 * Works for adjacent, overlapping, or separated segments.
 * The resulting segment covers the full range using Math.min/max.
 *
 * @param keepId - ID of segment to keep (will expand to cover both ranges)
 * @param removeId - ID of segment to remove
 */
export function mergeSegments(
  segments: Segment[],
  keepId: number,
  removeId: number
): Segment[] {
  const keepSegment = segments.find((s) => s.id === keepId);
  const removeSegment = segments.find((s) => s.id === removeId);

  if (!keepSegment || !removeSegment) {
    return segments;
  }

  // Calculate merged range (handles all cases: adjacent, overlapping, gaps)
  const newStart = Math.min(keepSegment.start, removeSegment.start);
  const newStop = Math.max(keepSegment.stop, removeSegment.stop);

  // Remove the removeId segment and update the keepId segment
  return segments
    .filter((s) => s.id !== removeId)
    .map((seg) =>
      seg.id === keepId ? { ...seg, start: newStart, stop: newStop } : seg
    );
}

/**
 * Merge a gap up by extending the segment above it.
 * The segment that ends at gapStart will be extended to stop at gapStop.
 */
export function mergeGapUp(
  segments: Segment[],
  gapStart: number,
  gapStop: number
): Segment[] {
  // Find segment that ends at gap start
  const segmentAbove = segments.find((s) => s.stop === gapStart);

  if (!segmentAbove) {
    return segments;
  }

  return segments.map((seg) =>
    seg.id === segmentAbove.id ? { ...seg, stop: gapStop } : seg
  );
}

/**
 * Merge a gap down by extending the segment below it.
 * The segment that starts at gapStop will be extended to start at gapStart.
 */
export function mergeGapDown(
  segments: Segment[],
  gapStart: number,
  gapStop: number
): Segment[] {
  // Find segment that starts at gap end
  const segmentBelow = segments.find((s) => s.start === gapStop);

  if (!segmentBelow) {
    return segments;
  }

  return segments.map((seg) =>
    seg.id === segmentBelow.id ? { ...seg, start: gapStart } : seg
  );
}

/**
 * Create a new segment from a gap using default values.
 * Finds the next available ID (0-9) and creates a new segment.
 */
export function convertGapToSegment(
  segments: Segment[],
  gapStart: number,
  gapStop: number
): Segment[] {
  // Find available segment ID (0-9, WLED supports max 10 segments)
  const usedIds = new Set(segments.map((s) => s.id));
  let newId = 0;
  for (let i = 0; i <= 9; i++) {
    if (!usedIds.has(i)) {
      newId = i;
      break;
    }
  }

  // Create new segment with default values
  const newSegment: Segment = {
    id: newId,
    start: gapStart,
    stop: gapStop,
    len: gapStop - gapStart,
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
  };

  // Add new segment and sort by start position
  return [...segments, newSegment].sort((a, b) => a.start - b.start);
}

/**
 * Find the next available segment ID (0-9).
 * Returns -1 if all IDs are in use.
 */
export function findNextAvailableSegmentId(segments: Segment[]): number {
  const usedIds = new Set(segments.map((s) => s.id));
  for (let i = 0; i <= 9; i++) {
    if (!usedIds.has(i)) {
      return i;
    }
  }
  return -1;
}
