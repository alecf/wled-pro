/**
 * Small helpers for building fixture overrides in tests.
 */
import type { WledPreset } from '@/types/wled'
import { defaultSegment } from '../semantics/segments'
import type { SimSegment } from '../types'

/** A segment covering [start, stop) — `stop` is exclusive, like WLED. */
export function makeSegment(
  id: number,
  start: number,
  stop: number,
  overrides: Partial<SimSegment> = {},
): SimSegment {
  return { ...defaultSegment(id, start, stop), ...overrides }
}

/** Split `ledCount` LEDs into `count` contiguous segments. */
export function withSegments(count: number, ledCount = 150): SimSegment[] {
  const size = Math.floor(ledCount / count)
  return Array.from({ length: count }, (_, i) =>
    makeSegment(i, i * size, i === count - 1 ? ledCount : (i + 1) * size),
  )
}

export function makePreset(name: string, preset: Partial<WledPreset> = {}): WledPreset {
  return { n: name, on: true, ...preset }
}
