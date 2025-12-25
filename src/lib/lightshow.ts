import type { WledState, Segment } from '@/types/wled'
import type { GlobalSegment } from '@/types/segments'

/**
 * Check if the current WLED state has exactly one segment covering the entire LED strip
 * (or close to it - allowing for small unused ranges at the end)
 */
export function hasOneBigSegment(state: WledState, ledCount: number): boolean {
  // Must have exactly one segment
  if (state.seg.length !== 1) {
    return false
  }

  const segment = state.seg[0]

  // Segment must start at 0
  if (segment.start !== 0) {
    return false
  }

  // Segment must cover at least 90% of the LED strip (allows for some unused LEDs at the end)
  const coverage = (segment.stop - segment.start) / ledCount
  return coverage >= 0.9
}

/**
 * Create a default single segment covering the entire LED strip
 */
export function createDefaultSegment(ledCount: number): Partial<Segment> {
  return {
    start: 0,
    stop: ledCount,
    on: true,
    bri: 255,
    fx: 0, // Solid color
    sx: 128, // Default speed
    ix: 128, // Default intensity
    pal: 0, // Default palette
    col: [[255, 160, 0]], // Orange default color
  }
}

/**
 * Convert global segment definitions to WLED segments
 * Preserves the current state's effect/color settings for the first segment,
 * applies them to all resulting segments
 */
export function globalSegmentsToWledSegments(
  globalSegments: GlobalSegment[],
  currentState?: WledState
): Partial<Segment>[] {
  // Get the current segment's settings if available
  const currentSegment = currentState?.seg[0]

  // Default settings
  const defaultSettings: Partial<Segment> = {
    on: currentSegment?.on ?? true,
    bri: currentSegment?.bri ?? 255,
    fx: currentSegment?.fx ?? 0,
    sx: currentSegment?.sx ?? 128,
    ix: currentSegment?.ix ?? 128,
    pal: currentSegment?.pal ?? 0,
    col: currentSegment?.col ?? [[255, 160, 0]],
  }

  // Create WLED segments from global segments
  return globalSegments.map((globalSeg, index) => ({
    id: index,
    start: globalSeg.start,
    stop: globalSeg.stop,
    n: globalSeg.name,
    ...defaultSettings,
  }))
}
