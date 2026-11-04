import type { GlobalSegment } from '@/types/segments'
import type { RGB, Segment } from '@/types/wled'
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

/** The color of a new light show (orange) */
const DEFAULT_SHOW_COLOR: RGB = [255, 160, 0]

/**
 * Create a default single segment covering the entire LED strip
 */
export function createDefaultSegment(ledCount: number): Segment {
  return toSegment(
    {
      start: 0,
      stop: ledCount,
      col: [DEFAULT_SHOW_COLOR],
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
  // Without a template, toSegment's defaults with the new-show color
  const settings: Partial<Segment> = template
    ? {
        on: template.on,
        bri: template.bri,
        fx: template.fx,
        sx: template.sx,
        ix: template.ix,
        pal: template.pal,
        col: template.col,
      }
    : { col: [DEFAULT_SHOW_COLOR] }

  return globalSegments.map((globalSeg, index) =>
    toSegment(
      { ...settings, id: index, start: globalSeg.start, stop: globalSeg.stop, n: globalSeg.name },
      index,
    ),
  )
}
