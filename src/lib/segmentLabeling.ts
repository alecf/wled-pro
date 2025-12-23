import type { GlobalSegment, SegmentLabel } from '@/types/segments'
import type { Segment } from '@/types/wled'

/**
 * Auto-labeling algorithm for matching WLED segments to global definitions
 *
 * Matches by exact start/stop positions and returns a label object
 * with display name and optional tooltip for truncation.
 */

/**
 * Find matching global segment definition by exact position match
 */
export function findMatchingGlobalSegment(
  segment: Segment,
  globalSegments: GlobalSegment[]
): GlobalSegment | undefined {
  return globalSegments.find(
    (global) => global.start === segment.start && global.stop === segment.stop
  )
}

/**
 * Get label for a WLED segment based on global definitions
 * Always returns a SegmentLabel object (never raw string)
 */
export function getSegmentLabel(
  segment: Segment,
  globalSegments: GlobalSegment[],
  maxLength = 20
): SegmentLabel {
  const match = findMatchingGlobalSegment(segment, globalSegments)

  if (match) {
    const name = match.name
    if (name.length > maxLength) {
      return {
        display: name.substring(0, maxLength) + '…',
        tooltip: name,
      }
    }
    return { display: name }
  }

  // No match - use default label
  // NOTE: UI displays 1-based segment numbers, but data model uses 0-based IDs
  const defaultLabel = segment.n || `Segment ${segment.id + 1}`
  if (defaultLabel.length > maxLength) {
    return {
      display: defaultLabel.substring(0, maxLength) + '…',
      tooltip: defaultLabel,
    }
  }
  return { display: defaultLabel }
}

/**
 * Batch label multiple segments efficiently
 * Useful for labeling all segments in a preset
 */
export function labelSegments(
  segments: Segment[],
  globalSegments: GlobalSegment[],
  maxLength = 20
): Map<number, SegmentLabel> {
  const labels = new Map<number, SegmentLabel>()

  for (const segment of segments) {
    labels.set(segment.id, getSegmentLabel(segment, globalSegments, maxLength))
  }

  return labels
}

/**
 * Check if any active segments match global definitions
 * Useful for showing "Apply Labels" button
 */
export function hasMatchingDefinitions(
  segments: Segment[],
  globalSegments: GlobalSegment[]
): boolean {
  return segments.some((segment) =>
    globalSegments.some(
      (global) => global.start === segment.start && global.stop === segment.stop
    )
  )
}

/**
 * Get statistics about segment matches for debugging/UI
 */
export function getMatchStatistics(
  segments: Segment[],
  globalSegments: GlobalSegment[]
): {
  total: number
  matched: number
  unmatched: number
  matchRate: number
} {
  const total = segments.length
  const matched = segments.filter((seg) =>
    findMatchingGlobalSegment(seg, globalSegments)
  ).length
  const unmatched = total - matched

  return {
    total,
    matched,
    unmatched,
    matchRate: total > 0 ? (matched / total) * 100 : 0,
  }
}
