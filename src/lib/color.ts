import type { RGB, SegmentColor } from '@/types/wled'

/** CSS `rgb(...)` for a color (an RGBW color's white channel isn't shown) */
export function cssRgb([r, g, b]: SegmentColor): string {
  return `rgb(${r}, ${g}, ${b})`
}

/** '#rrggbb' for a color's RGB channels */
export function rgbToHex([r, g, b]: SegmentColor): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

/** The RGB color for '#rrggbb' (or 'rrggbb'), or null if it isn't one */
export function hexToRgb(hex: string): RGB | null {
  const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!match) return null
  return [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)]
}

/** Whether two colors are equal (a missing white channel counts as 0) */
const sameColor = (a: SegmentColor, b: SegmentColor) =>
  a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && (a[3] ?? 0) === (b[3] ?? 0)

/** Whether `color` is one of `colors` */
export function includesColor(colors: readonly SegmentColor[], color: SegmentColor): boolean {
  return colors.some((c) => sameColor(c, color))
}

/** `rgb` with `previous`'s white channel kept (pickers set only RGB; RGBW strips keep their W) */
export function withWhiteOf(rgb: RGB, previous: SegmentColor | undefined): SegmentColor {
  return previous?.length === 4 ? [...rgb, previous[3]] : rgb
}
