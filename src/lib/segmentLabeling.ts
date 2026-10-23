import type { GlobalSegment, SegmentLabel } from '@/types/segments'
import type { Segment } from '@/types/wled'

/**
 * Auto-labeling algorithm for matching WLED segments to global definitions
 *
 * Uses the segment's own name, else a global segment at exactly the same start/stop, and
 * returns a label object with display name and optional tooltip for truncation.
 */

/**
 * Find matching global segment definition by exact position match
 */
export function findMatchingGlobalSegment(
  segment: Segment,
  globalSegments: GlobalSegment[],
): GlobalSegment | undefined {
  return globalSegments.find(
    (global) => global.start === segment.start && global.stop === segment.stop,
  )
}

/**
 * Get label for a WLED segment based on global definitions
 * Always returns a SegmentLabel object (never raw string)
 */
export function getSegmentLabel(
  segment: Segment,
  globalSegments: GlobalSegment[],
  maxLength = 20,
): SegmentLabel {
  // The segment's own name (set in the segment editor) wins over the global layout's.
  // NOTE: UI displays 1-based segment numbers, but data model uses 0-based IDs
  const name =
    segment.n?.trim() ||
    findMatchingGlobalSegment(segment, globalSegments)?.name ||
    `Segment ${segment.id + 1}`

  if (name.length > maxLength) {
    return { display: `${name.substring(0, maxLength)}…`, tooltip: name }
  }
  return { display: name }
}
