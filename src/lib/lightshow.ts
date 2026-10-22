import type { GlobalSegment } from '@/types/segments'
import type { Segment } from '@/types/wled'
import { toSegment } from './segmentUtils'

/**
 * Check if there is exactly one segment covering the LED strip
 * (allowing for a few unused LEDs at the end)
 */
export function hasOneBigSegment(segments: Segment[], ledCount: number): boolean {
  if (segments.length !== 1) return false
  const [segment] = segments
  return segment.start === 0 && (segment.stop - segment.start) / ledCount >= 0.9
}

/**
 * Create a default single segment covering the entire LED strip
 */
export function createDefaultSegment(ledCount: number): Segment {
  return toSegment(
    {
      start: 0,
      stop: ledCount,
      col: [[255, 160, 0]], // Orange default color
    },
    0,
  )
}

/**
 * Convert global segment definitions to WLED segments. Every resulting
 * segment copies the effect/color settings of `template` (usually the
 * light show's current single segment).
 */
export function globalSegmentsToWledSegments(
  globalSegments: GlobalSegment[],
  template?: Segment,
): Segment[] {
  const settings: Partial<Segment> = {
    on: template?.on ?? true,
    bri: template?.bri ?? 255,
    fx: template?.fx ?? 0,
    sx: template?.sx ?? 128,
    ix: template?.ix ?? 128,
    pal: template?.pal ?? 0,
    col: template?.col ?? [[255, 160, 0]],
  }

  return globalSegments.map((globalSeg, index) =>
    toSegment(
      { ...settings, id: index, start: globalSeg.start, stop: globalSeg.stop, n: globalSeg.name },
      index,
    ),
  )
}
