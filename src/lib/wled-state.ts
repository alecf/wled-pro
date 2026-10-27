import type { Segment, WledState, WledStateUpdate } from '@/types/wled'
import { normalizeSegmentIds, toSegment } from './segmentUtils'

type SegmentPatch = Partial<Segment>

/**
 * Deep merge a WLED state update into an existing state, the way the device applies it.
 *
 * - Nested objects (nl, udpn) are merged, not replaced; primitives are replaced
 * - Segments are matched by `id`, or by array index when the update has no id, and their
 *   fields merged (colors by slot)
 * - An unknown `id` with a valid range (`start`, default 0, < `stop`) creates the segment
 *   with WLED-like defaults; a segment sent with `stop: 0` is deleted
 */
export function mergeWledState(base: WledState, update: WledStateUpdate): WledState {
  return mergeStateFields(base, update, (seg) =>
    mergeSegmentList(base.seg, seg, {
      indexFor: (_, i) => i,
      addUnknown: (patch) => {
        // WLED appends a segment for an unknown id when `stop` > 0; `start` defaults to 0
        const start = patch.start ?? 0
        if (patch.id === undefined || typeof patch.stop !== 'number' || patch.stop <= start) {
          return null
        }
        return toSegment({ ...patch, start }, patch.id)
      },
    })
      .filter((s) => s.stop !== 0)
      .sort((a, b) => a.id - b.id),
  )
}

/**
 * Merge two state updates into one, for coalescing updates before they are sent. Same
 * rules as `mergeWledState`, except that segment patches are kept as patches: an unknown id
 * is appended as is and `stop: 0` (a delete) is kept.
 */
export function mergeWledStateUpdate(
  base: WledStateUpdate,
  update: WledStateUpdate,
): WledStateUpdate {
  return mergeStateFields(base, update, (seg) =>
    mergeSegmentList(base.seg ?? [], seg, {
      // An update without an id only merges into an earlier one that had no id either
      indexFor: (patches, i) => (patches[i] && patches[i].id === undefined ? i : -1),
      addUnknown: (patch) => patch,
    }),
  )
}

/** Merge top-level fields of a state (or update); `mergeSeg` merges the `seg` list */
function mergeStateFields<T extends WledStateUpdate>(
  base: T,
  update: WledStateUpdate,
  mergeSeg: (seg: SegmentPatch[]) => T['seg'],
): T {
  const result = { ...base }
  for (const [key, value] of Object.entries(update) as [keyof WledStateUpdate, unknown][]) {
    if (value === undefined) continue
    if (key === 'seg') {
      result.seg = mergeSeg(value as SegmentPatch[])
    } else if ((key === 'nl' || key === 'udpn') && typeof value === 'object' && value !== null) {
      // biome-ignore lint/suspicious/noExplicitAny: generic key assignment on a partial-state merge
      ;(result as any)[key] = { ...base[key], ...value }
    } else {
      // biome-ignore lint/suspicious/noExplicitAny: generic key assignment on a partial-state merge
      ;(result as any)[key] = value
    }
  }
  return result
}

interface SegmentListRules<T extends SegmentPatch> {
  /** Index in `segments` that the i-th update, which has no id, applies to (-1: none) */
  indexFor: (segments: T[], i: number) => number
  /** What an update matching no segment adds to the list (null: nothing) */
  addUnknown: (patch: SegmentPatch) => T | null
}

function mergeSegmentList<T extends SegmentPatch>(
  base: T[],
  updates: SegmentPatch[],
  rules: SegmentListRules<T>,
): T[] {
  const result = [...base]
  updates.forEach((patch, i) => {
    if (!patch) return
    const index =
      patch.id === undefined
        ? rules.indexFor(result, i)
        : result.findIndex((seg) => seg.id === patch.id)
    if (index >= 0 && index < result.length) {
      result[index] = mergeSegmentFields(result[index], patch)
      return
    }
    const added = rules.addUnknown(patch)
    if (added) result.push(added)
  })
  return result
}

/** Merge a segment patch into a segment (or patch). Colors merge by slot. */
function mergeSegmentFields<T extends SegmentPatch>(base: T, patch: SegmentPatch): T {
  const result = { ...base }
  for (const [key, value] of Object.entries(patch) as [keyof Segment, unknown][]) {
    if (value === undefined) continue
    if (key === 'col' && base.col) {
      const col = [...base.col]
      ;(value as Segment['col']).forEach((color, slot) => {
        if (color) col[slot] = color
      })
      result.col = col
    } else {
      // biome-ignore lint/suspicious/noExplicitAny: generic key assignment on a partial-state merge
      ;(result as any)[key] = value
    }
  }
  return result
}

/** Segment fields the editor sends to WLED (read-only and runtime fields are left out). */
const DEVICE_SEGMENT_KEYS = [
  'id',
  'start',
  'stop',
  'n',
  'grp',
  'spc',
  'of',
  'on',
  'frz',
  'bri',
  'col',
  'fx',
  'sx',
  'ix',
  'pal',
  'c1',
  'c2',
  'c3',
  'o1',
  'o2',
  'o3',
  'rev',
  'mi',
] as const satisfies readonly (keyof Segment)[]

/**
 * Build the `seg` array that makes the device's segments match `segments`.
 *
 * Segment ids are renumbered to 0..n-1 (see `normalizeSegmentIds`) and sent in ascending
 * order, so each lands on that index on the device. Device segments with an id of n or more
 * (from `deviceSegmentIds`) are deleted (WLED deletes a segment sent with stop: 0).
 */
export function segmentsToDeviceUpdate(
  segments: Segment[],
  deviceSegmentIds: number[] = [],
): Partial<Segment>[] {
  const ordered = [...normalizeSegmentIds(segments)].sort((a, b) => a.id - b.id)
  const updates: Partial<Segment>[] = ordered.map((seg) => {
    const update: Partial<Segment> = {}
    for (const key of DEVICE_SEGMENT_KEYS) {
      if (seg[key] !== undefined) {
        // biome-ignore lint/suspicious/noExplicitAny: copying a known key between the same type
        ;(update as any)[key] = seg[key]
      }
    }
    // Always send the name: WLED keeps a stale name on an unnamed segment otherwise, and an
    // empty `n` clears it
    update.n = seg.n ?? ''
    return update
  })
  const extraIds = [...new Set(deviceSegmentIds)].filter((id) => id >= ordered.length)
  for (const id of extraIds.sort((a, b) => a - b)) updates.push({ id, stop: 0 })
  return updates
}
