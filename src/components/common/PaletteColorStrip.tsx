import type { PaletteDefinition } from '@/types/wled'

interface PaletteColorStripProps {
  colors: PaletteDefinition
  className?: string
  height?: number
}

/**
 * Displays a horizontal color strip for a palette.
 * Colors are shown as a continuous gradient.
 */
export function PaletteColorStrip({
  colors,
  className = '',
  height = 12
}: PaletteColorStripProps) {
  if (!colors || colors.length === 0) {
    return (
      <div
        className={`rounded-full bg-muted w-full ${className}`}
        style={{ height: `${height}px` }}
      />
    )
  }

  // Check if this is a gradient palette (array of [pos, r, g, b])
  // or a dynamic palette (array of strings like "c1", "c2", "r")
  const isGradientPalette = Array.isArray(colors[0])

  if (!isGradientPalette) {
    // Dynamic palette - show a generic gradient as placeholder
    return (
      <div
        className={`rounded-full bg-gradient-to-r from-gray-400 via-gray-500 to-gray-600 w-full ${className}`}
        style={{ height: `${height}px` }}
      />
    )
  }

  // Gradient palette: extract RGB values from [position, r, g, b] tuples
  const gradientStops = (colors as [number, number, number, number][]).map(
    ([pos, r, g, b]) => {
      const percentage = (pos / 255) * 100
      return `rgb(${r}, ${g}, ${b}) ${percentage}%`
    }
  )

  const gradient =
    gradientStops.length > 0
      ? `linear-gradient(to right, ${gradientStops.join(', ')})`
      : 'transparent'

  return (
    <div
      className={`rounded-full w-full ${className}`}
      style={{
        height: `${height}px`,
        background: gradient,
      }}
    />
  )
}
