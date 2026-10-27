/**
 * Value helpers modelled on WLED's json.cpp / util.cpp (`getVal`, `parseNumber`).
 * Intentionally independent from the app's own merge helpers.
 */

export function clone<T>(value: T): T {
  return structuredClone(value)
}

/** `JSON.parse` that returns `undefined` instead of throwing. */
export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/**
 * Resolve a numeric property that may use WLED value modifiers.
 *
 * - number: clamped to [min, max]
 * - "~" / "~-": +1 / -1, wrapping around at the ends
 * - "~N" / "~-N": +N / -N, clamped
 * - "r": random value in [min, max]
 * - numeric strings are accepted; anything else leaves the value unchanged
 */
export function resolveNumber(
  input: unknown,
  current: number,
  min: number,
  max: number,
  random: () => number = Math.random,
): number {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return clamp(Math.round(input), min, max)
  }
  if (typeof input !== 'string') return current
  if (input === 'r') return min + Math.floor(random() * (max - min + 1))
  if (input === '~' || input === '~-') {
    const next = current + (input === '~' ? 1 : -1)
    if (next > max) return min
    if (next < min) return max
    return next
  }
  if (input.startsWith('~')) {
    const delta = Number(input.slice(1))
    if (!Number.isFinite(delta)) return current
    return clamp(current + delta, min, max)
  }
  const n = Number(input)
  return Number.isFinite(n) ? clamp(Math.round(n), min, max) : current
}

/** Boolean that also accepts WLED's "t" (toggle). */
export function resolveBool(input: unknown, current: boolean): boolean {
  if (input === 't') return !current
  if (typeof input === 'boolean') return input
  if (typeof input === 'number') return input !== 0
  return current
}

/** Parse a colour slot: [r,g,b], [r,g,b,w], or "RRGGBB"/"RRGGBBWW". Returns null if unusable. */
export function parseColor(input: unknown): number[] | null {
  if (Array.isArray(input)) {
    if (input.length === 0) return null
    if (!input.every((c) => typeof c === 'number')) return null
    return input.slice(0, 4).map((c) => clamp(Math.round(c), 0, 255))
  }
  if (typeof input === 'string' && /^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(input)) {
    const out: number[] = []
    for (let i = 0; i < input.length; i += 2) out.push(parseInt(input.slice(i, i + 2), 16))
    return out
  }
  return null
}

/**
 * Deep-merge `patch` into `target` in place, the way WLED's cfg deserialisation
 * behaves for the app: nested objects merge, arrays and scalars replace.
 */
export function deepMergeInto(target: Record<string, unknown>, patch: Record<string, unknown>) {
  for (const [key, value] of Object.entries(patch)) {
    const existing = target[key]
    if (isPlainObject(value) && isPlainObject(existing)) {
      deepMergeInto(existing, value)
    } else {
      target[key] = clone(value)
    }
  }
  return target
}
