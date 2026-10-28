import { cssRgb as rgb } from '@/lib/color'
import type { Effect } from '@/lib/effects'
import type { PaletteDefinition, PaletteWithColors, Segment, SegmentColor } from '@/types/wled'

function evenGradient(colors: SegmentColor[]): string {
  if (colors.length === 1) return rgb(colors[0])
  const stops = colors.map((c, i) => `${rgb(c)} ${(i / (colors.length - 1)) * 100}%`)
  return `linear-gradient(to right, ${stops.join(', ')})`
}

/**
 * CSS background for a palette. Gradient palettes are `[position, r, g, b]` stops; dynamic
 * palettes reference the segment's colors ("c1".."c3"), which need `segmentColors` to draw.
 * Returns null when there is nothing to draw (e.g. a random palette).
 */
export function paletteGradient(
  colors: PaletteDefinition,
  segmentColors: (SegmentColor | null)[] = [],
): string | null {
  if (!colors || colors.length === 0) return null

  if (Array.isArray(colors[0])) {
    const stops = (colors as [number, number, number, number][]).map(
      ([pos, r, g, b]) => `${rgb([r, g, b])} ${(pos / 255) * 100}%`,
    )
    return `linear-gradient(to right, ${stops.join(', ')})`
  }

  const resolved = (colors as string[])
    .map((ref) => /^c([1-3])$/.exec(ref))
    .map((match) => (match ? segmentColors[Number(match[1]) - 1] : null))
    .filter((c): c is SegmentColor => !!c)
  return resolved.length > 0 ? evenGradient(resolved) : null
}

/**
 * CSS background that approximates how a segment looks: its palette for palette effects,
 * otherwise (or with the "Default" palette, for effects that use colors) its effect's colors.
 */
export function segmentPreviewBackground(
  segment: Pick<Partial<Segment>, 'col' | 'pal'>,
  effect: Effect | null | undefined,
  palettes: PaletteWithColors[] = [],
): string | null {
  const segmentColors: (SegmentColor | null)[] = segment.col ?? []

  // Palette 0 ("Default") makes effects that use colors draw with the segment's colors
  const drawsPalette =
    effect?.usesPalette && segment.pal !== undefined && (segment.pal !== 0 || !effect.colors.length)
  if (drawsPalette) {
    const palette = palettes.find((p) => p.id === segment.pal)
    const gradient = palette && paletteGradient(palette.colors, segmentColors)
    if (gradient) return gradient
  }

  const slots = effect ? effect.colors.map((slot) => slot.index) : [0]
  const used = slots.map((i) => segmentColors[i]).filter((c): c is SegmentColor => !!c)
  return used.length > 0 ? evenGradient(used) : null
}

/** Up to `max` non-black colors from the segments' color slots, in order (a show's swatches) */
export function showSwatchColors(segments: Pick<Partial<Segment>, 'col'>[], max = 3): string[] {
  const colors: string[] = []
  for (const seg of segments) {
    for (const color of seg.col ?? []) {
      if (colors.length >= max) return colors
      if (!color || color.length < 3) continue
      if (color[0] === 0 && color[1] === 0 && color[2] === 0) continue
      colors.push(rgb(color))
    }
  }
  return colors
}
