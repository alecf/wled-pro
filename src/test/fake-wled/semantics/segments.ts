/**
 * Segment update semantics, modelled on WLED's `deserializeSegment()`.
 *
 * Notes on WLED behaviour reproduced here:
 * - `stop` is EXCLUSIVE; `len` is an alternative to `stop` (stop = start + len).
 * - Segment ids are slot indices. Deleting a segment (`stop <= start`, e.g. `stop: 0`)
 *   only deactivates its slot: the device stops reporting it, but the other segments keep
 *   their ids and the slot still counts. The last active segment is kept.
 * - An `id` at or beyond the slot count with `stop > 0` creates a segment, appended at the
 *   next slot (so its id is the slot count, not necessarily the `id` sent), up to `maxseg`.
 *   An `id` of an inactive slot with a valid range reactivates that slot.
 * - A request that deletes at least half of more than 3 slots purges the inactive slots
 *   (except slot 0), which renumbers the segments after them (WLED's purgeSegments()).
 * - An array element without `id` targets the segment at its array index.
 * - A single object without `id` targets every selected segment (or `mainseg` if none).
 */
import type { SimSegment, SimState } from '../types'
import { isPlainObject, parseColor, resolveBool, resolveNumber } from './values'

export interface SegmentContext {
  state: SimState
  /** Slot count, including inactive (deleted but not purged) slots */
  slots: { count: number }
  ledCount: number
  maxSeg: number
  fxCount: number
  palCount: number
  random: () => number
}

export function defaultSegment(id: number, start: number, stop: number): SimSegment {
  return {
    id,
    start,
    stop,
    len: stop - start,
    grp: 1,
    spc: 0,
    of: 0,
    on: true,
    frz: false,
    bri: 255,
    cct: 127,
    col: [
      [255, 160, 0],
      [0, 0, 0],
      [0, 0, 0],
    ],
    fx: 0,
    sx: 128,
    ix: 128,
    pal: 0,
    c1: 128,
    c2: 128,
    c3: 16,
    sel: false,
    rev: false,
    mi: false,
    o1: false,
    o2: false,
    o3: false,
    si: 0,
    m12: 0,
  }
}

const NUMERIC_0_255 = ['sx', 'ix', 'c1', 'c2', 'bri', 'spc'] as const
const BOOL_PROPS = ['sel', 'rev', 'mi', 'frz', 'o1', 'o2', 'o3', 'on'] as const

/** Apply the `seg` part of a state update (array or single object). */
export function applySegmentInput(ctx: SegmentContext, input: unknown): void {
  let deleted = 0
  if (Array.isArray(input)) {
    input.forEach((elem, index) => {
      if (!isPlainObject(elem)) return
      const id = typeof elem.id === 'number' ? elem.id : index
      if (applyToSegmentId(ctx, id, elem) && elem.stop === 0) deleted++
    })
    // Batch deleting more than half the segments purges the inactive slots
    if (ctx.slots.count > 3 && deleted >= Math.floor(ctx.slots.count / 2)) purgeSlots(ctx)
  } else if (isPlainObject(input)) {
    if (typeof input.id === 'number') {
      applyToSegmentId(ctx, input.id, input)
    } else {
      const selected = ctx.state.seg.filter((s) => s.sel).map((s) => s.id)
      const targets = selected.length > 0 ? selected : [ctx.state.mainseg]
      for (const id of targets) applyToSegmentId(ctx, id, input)
    }
  }
  ctx.state.seg.sort((a, b) => a.id - b.id)
  if (!ctx.state.seg.some((s) => s.id === ctx.state.mainseg)) ctx.state.mainseg = 0
}

/** Returns whether the element was applied (WLED's deserializeSegment() result). */
function applyToSegmentId(ctx: SegmentContext, id: number, elem: Record<string, unknown>): boolean {
  if (id < 0 || id >= ctx.maxSeg) return false
  let seg = ctx.state.seg.find((s) => s.id === id)

  if (!seg) {
    const stop = typeof elem.stop === 'number' ? elem.stop : -1
    const start = typeof elem.start === 'number' ? elem.start : 0
    if (id >= ctx.slots.count) {
      // Append a new slot; WLED ignores empty segments here
      if (stop <= 0 || ctx.slots.count >= ctx.maxSeg) return false
      id = ctx.slots.count
      ctx.slots.count++
    } else if (stop <= start) {
      // Deleting an inactive slot again: nothing to do
      return true
    }
    seg = defaultSegment(id, 0, Math.max(stop, 1))
    ctx.state.seg.push(seg)
  }

  // Range
  if ('start' in elem || 'stop' in elem || 'len' in elem) {
    const start = typeof elem.start === 'number' ? Math.max(0, Math.round(elem.start)) : seg.start
    let stop = seg.stop
    if (typeof elem.len === 'number') stop = start + Math.round(elem.len)
    else if (typeof elem.stop === 'number') stop = Math.round(elem.stop)
    stop = Math.min(stop, ctx.ledCount)
    if (stop <= start) {
      if (ctx.state.seg.length > 1) {
        // Deactivate: the slot (and the other segments' ids) stay
        ctx.state.seg = ctx.state.seg.filter((s) => s !== seg)
      }
      return true
    }
    seg.start = start
    seg.stop = stop
    seg.len = stop - start
  }

  if (typeof elem.n === 'string') seg.n = elem.n
  if ('fx' in elem) seg.fx = resolveNumber(elem.fx, seg.fx, 0, ctx.fxCount - 1, ctx.random)
  if ('pal' in elem) seg.pal = resolveNumber(elem.pal, seg.pal, 0, ctx.palCount - 1, ctx.random)
  for (const key of NUMERIC_0_255) {
    if (key in elem) seg[key] = resolveNumber(elem[key], seg[key], 0, 255, ctx.random)
  }
  if ('c3' in elem) seg.c3 = resolveNumber(elem.c3, seg.c3, 0, 31, ctx.random)
  if ('grp' in elem) seg.grp = resolveNumber(elem.grp, seg.grp, 1, 255)
  if ('of' in elem) seg.of = resolveNumber(elem.of, seg.of, -seg.len, seg.len)
  if ('cct' in elem) seg.cct = resolveNumber(elem.cct, seg.cct, 0, 10091)
  if ('si' in elem) seg.si = resolveNumber(elem.si, seg.si ?? 0, 0, 3)
  if ('m12' in elem) seg.m12 = resolveNumber(elem.m12, seg.m12 ?? 0, 0, 4)
  for (const key of BOOL_PROPS) {
    if (key in elem) seg[key] = resolveBool(elem[key], seg[key] ?? false)
  }

  // Colours: partial slot replacement; unusable entries (e.g. []) keep the slot.
  if (Array.isArray(elem.col)) {
    const col = seg.col.map((c) => [...c]) as number[][]
    elem.col.slice(0, 3).forEach((c, slot) => {
      const parsed = parseColor(c)
      if (parsed) col[slot] = parsed
    })
    while (col.length < 3) col.push([0, 0, 0])
    seg.col = col as SimSegment['col']
  }
  return true
}

/** WLED's purgeSegments(): drop inactive slots (slot 0 is kept), renumbering the rest. */
function purgeSlots(ctx: SegmentContext) {
  const active = new Set(ctx.state.seg.map((s) => s.id))
  let next = 0
  for (let slot = 0; slot < ctx.slots.count; slot++) {
    if (slot === 0 || active.has(slot)) {
      const seg = ctx.state.seg.find((s) => s.id === slot)
      if (seg) seg.id = next
      next++
    }
  }
  ctx.slots.count = next
}
