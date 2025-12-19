import type { WledState, WledStateUpdate, Segment } from '@/types/wled'

/**
 * Deep merge a WLED state update into an existing state.
 *
 * WLED-specific semantics:
 * - Nested objects (nl, udpn) are merged, not replaced
 * - Segments are matched by `id` field if present, otherwise by array index
 * - Segment properties are merged, not replaced
 * - Primitive values are replaced
 */
export function mergeWledState(
  base: WledState,
  update: WledStateUpdate
): WledState {
  const result = { ...base }

  for (const key of Object.keys(update) as (keyof WledStateUpdate)[]) {
    const updateValue = update[key]
    if (updateValue === undefined) continue

    if (key === 'seg') {
      result.seg = mergeSegments(base.seg, updateValue as Partial<Segment>[])
    } else if (key === 'nl' && typeof updateValue === 'object' && updateValue !== null) {
      result.nl = { ...base.nl, ...updateValue }
    } else if (key === 'udpn' && typeof updateValue === 'object' && updateValue !== null) {
      result.udpn = { ...base.udpn, ...updateValue }
    } else {
      // Primitive value - direct assignment
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result as any)[key] = updateValue
    }
  }

  return result
}

/**
 * Merge segment updates into existing segments array.
 *
 * WLED segment update rules:
 * - If segment has `id` field, find and update that specific segment
 * - If segment has no `id`, use array index to determine which segment to update
 * - Segment properties are merged (partial update), not replaced
 */
function mergeSegments(
  baseSegments: Segment[],
  updateSegments: Partial<Segment>[]
): Segment[] {
  // Create a copy of base segments
  const result = baseSegments.map((seg) => ({ ...seg }))

  for (let i = 0; i < updateSegments.length; i++) {
    const update = updateSegments[i]
    if (!update) continue

    // Find target segment: by id if specified, otherwise by index
    let targetIndex: number
    if (update.id !== undefined) {
      targetIndex = result.findIndex((seg) => seg.id === update.id)
      if (targetIndex === -1) {
        // Segment with this id doesn't exist - this could be a new segment
        // For now, we'll skip it since we're doing state merging, not creation
        continue
      }
    } else {
      targetIndex = i
    }

    if (targetIndex < result.length) {
      // Merge segment properties
      result[targetIndex] = mergeSegment(result[targetIndex], update)
    }
  }

  return result
}

/**
 * Merge a single segment update into an existing segment.
 * Handles nested color arrays specially.
 */
function mergeSegment(base: Segment, update: Partial<Segment>): Segment {
  const result = { ...base }

  for (const key of Object.keys(update) as (keyof Segment)[]) {
    const updateValue = update[key]
    if (updateValue === undefined) continue

    if (key === 'col') {
      // Colors array - merge by index, preserving unspecified colors
      result.col = mergeColors(base.col, updateValue as [number, number, number][])
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result as any)[key] = updateValue
    }
  }

  return result
}

/**
 * Merge color arrays. WLED supports up to 3 colors per segment.
 * Each color is an RGB tuple [r, g, b].
 */
function mergeColors(
  baseColors: [number, number, number][],
  updateColors: [number, number, number][]
): [number, number, number][] {
  const result = [...baseColors]

  for (let i = 0; i < updateColors.length; i++) {
    if (updateColors[i]) {
      result[i] = updateColors[i]
    }
  }

  return result
}

/**
 * Merge two WledStateUpdate objects together.
 * Used for coalescing multiple updates before sending to the server.
 *
 * WLED-specific semantics:
 * - Nested objects (nl, udpn) are merged
 * - Segments are merged by id (or index if no id)
 * - Primitive values from the second update override the first
 */
export function mergeWledStateUpdate(
  base: WledStateUpdate,
  update: WledStateUpdate
): WledStateUpdate {
  const result: WledStateUpdate = { ...base }

  for (const key of Object.keys(update) as (keyof WledStateUpdate)[]) {
    const updateValue = update[key]
    if (updateValue === undefined) continue

    if (key === 'seg') {
      result.seg = mergeSegmentUpdates(
        base.seg as Partial<Segment>[] | undefined,
        updateValue as Partial<Segment>[]
      )
    } else if (key === 'nl' && typeof updateValue === 'object' && updateValue !== null) {
      result.nl = { ...base.nl, ...updateValue }
    } else if (key === 'udpn' && typeof updateValue === 'object' && updateValue !== null) {
      result.udpn = { ...base.udpn, ...updateValue }
    } else {
      // Primitive value - direct assignment
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result as any)[key] = updateValue
    }
  }

  return result
}

/**
 * Merge two segment update arrays.
 * Segments are matched by id if present, otherwise accumulated.
 */
function mergeSegmentUpdates(
  baseSegments: Partial<Segment>[] | undefined,
  updateSegments: Partial<Segment>[]
): Partial<Segment>[] {
  if (!baseSegments || baseSegments.length === 0) {
    return updateSegments
  }

  // Build a map of segments by id for efficient lookup
  const segmentMap = new Map<number | 'index', Partial<Segment>[]>()

  // Index segments from base
  for (let i = 0; i < baseSegments.length; i++) {
    const seg = baseSegments[i]
    if (seg.id !== undefined) {
      const existing = segmentMap.get(seg.id) || []
      existing.push(seg)
      segmentMap.set(seg.id, existing)
    } else {
      // Track by index position
      const existing = segmentMap.get('index') || []
      existing[i] = seg
      segmentMap.set('index', existing)
    }
  }

  // Merge in update segments
  for (let i = 0; i < updateSegments.length; i++) {
    const update = updateSegments[i]
    if (!update) continue

    if (update.id !== undefined) {
      // Find existing segment with this id and merge
      const existing = segmentMap.get(update.id)
      if (existing && existing.length > 0) {
        existing[0] = mergePartialSegment(existing[0], update)
      } else {
        segmentMap.set(update.id, [update])
      }
    } else {
      // No id - merge by index position
      const indexSegs = segmentMap.get('index') || []
      if (indexSegs[i]) {
        indexSegs[i] = mergePartialSegment(indexSegs[i], update)
      } else {
        indexSegs[i] = update
      }
      segmentMap.set('index', indexSegs)
    }
  }

  // Reconstruct the array - segments with ids first, then index-based
  const result: Partial<Segment>[] = []

  // Add id-based segments
  for (const [key, segs] of segmentMap.entries()) {
    if (key !== 'index') {
      result.push(...segs)
    }
  }

  // Add index-based segments
  const indexSegs = segmentMap.get('index')
  if (indexSegs) {
    for (let i = 0; i < indexSegs.length; i++) {
      if (indexSegs[i] && !indexSegs[i].id) {
        // Only add if not already added via id
        result.push(indexSegs[i])
      }
    }
  }

  return result
}

/**
 * Merge two partial segment objects.
 */
function mergePartialSegment(
  base: Partial<Segment>,
  update: Partial<Segment>
): Partial<Segment> {
  const result: Partial<Segment> = { ...base }

  for (const key of Object.keys(update) as (keyof Segment)[]) {
    const updateValue = update[key]
    if (updateValue === undefined) continue

    if (key === 'col' && base.col) {
      // Merge color arrays
      result.col = mergeColors(
        base.col as [number, number, number][],
        updateValue as [number, number, number][]
      )
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result as any)[key] = updateValue
    }
  }

  return result
}
